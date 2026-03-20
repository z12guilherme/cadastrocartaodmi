import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

serve(async (req) => {
  try {
    // 1. Validar se a requisição é um POST
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const payload = await req.json()
    console.log('Webhook payload:', payload)

    // Apenas rodar quando o status mudar para "aprovado"
    const record = payload.record
    const oldRecord = payload.old_record

    if (record.status !== 'aprovado' || (oldRecord && oldRecord.status === 'aprovado')) {
      return new Response(JSON.stringify({ message: "Status não é aprovação. Ignorando." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_DB_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SURI_API_TOKEN = Deno.env.get('SURI_API_TOKEN')
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase credenciais não configuradas na Edge Function.')
    }

    // Cria o cliente Supabase ignorando RLS (modo admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const clienteNome = record.nome_completo;
    const cpf = record.cpf;
    const filesToBackup = [];
    const filesToDelete = [];

    // Prepara o PDF do contrato para backup
    if (record.anexo_documento_url) {
        filesToBackup.push({ url: record.anexo_documento_url, type: 'document', filename: `Contrato_${cpf}.pdf` });
    }
    // Prepara a foto (RG) para backup e exclusão
    if (record.foto_url) {
        filesToBackup.push({ url: record.foto_url, type: 'photo', filename: `RG_${cpf}` });
        filesToDelete.push(record.foto_url);
    }
    // Prepara o comprovante para backup e exclusão
    if (record.comprovante_pagamento_url) {
        filesToBackup.push({ url: record.comprovante_pagamento_url, type: 'photo', filename: `Comprovante_${cpf}` });
        filesToDelete.push(record.comprovante_pagamento_url);
    }

        // Prepara as fotos dos dependentes para backup e exclusão
        if (record.observacoes && record.observacoes.startsWith('[')) {
            try {
                const deps = JSON.parse(record.observacoes);
                for (let i = 0; i < deps.length; i++) {
                    if (deps[i].fotoDocumento) {
                        filesToBackup.push({ url: deps[i].fotoDocumento, type: 'photo', filename: `Dependente_${i}_${cpf}` });
                        filesToDelete.push(deps[i].fotoDocumento);
                    }
                }
            } catch (e) {
                console.error('Erro ao ler dependentes no webhook:', e);
            }
        }

        // Prepara a assinatura para exclusão (não enviamos pro Telegram pois já está cravada no PDF)
        if (record.assinatura_url) {
            filesToDelete.push(record.assinatura_url);
        }

    // Função auxiliar para baixar do storage do Supabase e mandar pro Telegram
    const sendToTelegram = async (fileInfo: any) => {
        const { data, error } = await supabase.storage.from('documentos').download(fileInfo.url);
        
        if (error || !data) {
            console.error(`Erro ao baixar ${fileInfo.url} do storage:`, error);
            return false;
        }

        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID!);
        
        if (fileInfo.type === 'document') {
            formData.append('document', data, fileInfo.filename);
            formData.append('caption', `Contrato Final: ${clienteNome}`);
        } else {
            formData.append('photo', data, fileInfo.filename);
        }

        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/send${fileInfo.type === 'document' ? 'Document' : 'Photo'}`;
        
        const response = await fetch(telegramApiUrl, { method: 'POST', body: formData });
        const tgResult = await response.json();
        
        if (!tgResult.ok) {
            console.error('Erro ao enviar pro Telegram:', tgResult);
            return false;
        }
        return true;
    }

    // Função auxiliar para enviar notificação no WhatsApp via Suri
    const sendSuriNotification = async (telefone: string, nome: string, protocolo: string) => {
        if (!SURI_API_TOKEN || !telefone) return;
        
        // Limpar telefone (apenas números) e adicionar 55 se for padrão BR e não tiver
        let telLimpo = telefone.replace(/\D/g, '');
        if (telLimpo.length === 10 || telLimpo.length === 11) telLimpo = `55${telLimpo}`;

        try {
            // ATENÇÃO: Ajuste a URL e o payload conforme a documentação da Suri que você utiliza
            const response = await fetch('https://api.suri.chat/v2/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SURI_API_TOKEN}`
                },
                body: JSON.stringify({
                    to: telLimpo,
                    type: "template",
                    template: {
                        name: "aprovacao_carteirinha_dmi", // Substitua pelo nome exato do template aprovado na Suri
                        language: { code: "pt_BR" },
                        components: [
                            {
                                type: "body",
                                parameters: [
                                    { type: "text", text: nome }, // {{1}} no template (ex: Nome)
                                    { type: "text", text: protocolo } // {{2}} no template (ex: Link/CPF)
                                ]
                            }
                        ]
                    }
                })
            });
            
            if (!response.ok) {
                console.error('Erro na API da Suri:', await response.text());
            } else {
                console.log(`WhatsApp enviado via Suri para ${telLimpo}`);
            }
        } catch (error) {
            console.error('Erro ao conectar com a Suri:', error);
        }
    };

    // Função auxiliar para sincronizar com o SIGPAF (Cadastro + Captura de Contrato)
    const syncWithSigpaf = async (record: any) => {
        const SIGPAF_API_KEY = Deno.env.get('SIGPAF_API_KEY') || 'a816aeb6-c724-44a7-882c-bc1d1ebf5f43';
        
        let beneficiarios = [];
        if (record.observacoes && record.observacoes.startsWith('[')) {
            try {
                const deps = JSON.parse(record.observacoes);
                beneficiarios = deps.map((dep: any) => ({
                    dep_nome: dep.nome || "Nome não informado",
                    dep_cpf: dep.cpf || "",
                    dep_dtnascimento: dep.dataNascimento || "",
                    prt_codigo: 1, 
                    etc_codigo: 1, 
                    bai_codigo: 13, // 13 = EDSON MORORÓ MOURA
                    cid_codigo: 1,  // 1 = BELO JARDIM
                    rlg_codigo: 1
                }));
            } catch (e) {
                console.error('Erro ao mapear dependentes para SIGPAF:', e);
            }
        }

        // 1. Montar payload com os exatos parâmetros solicitados
        const payload = {
            pes_nome: record.nome_completo,
            pes_razao: record.nome_completo,
            pes_cpfcnpj: record.cpf || "",
            pes_rgie: record.rg || "", // Adicionado RG
            pes_dtnascimento: record.data_nascimento || record.dataNascimento || "", // Data Nascimento
            pes_email: record.email || "",
            pes_fone: record.telefone || "",
            pes_celular: record.telefone || "", // Repetindo telefone p/ evitar erros
            pes_whatsapp: record.telefone || "",
            pes_endereco: record.endereco || "Não informado",
            pes_numero: record.numero || "S/N",
            pes_cep: record.cep || "55.150-000",
            pes_referencia: record.complemento || record.referencia || "",
            cid_codigo: 1, // 1 = BELO JARDIM
            bai_codigo: 13, // 13 = EDSON MORORÓ MOURA
            pla_codigo: 178, // 178 = DMI 6 PESSOAS
            col_codcobrador: 74, // 74 = JOAM VINICIUS
            col_codvendedor: 77, // 77 = Vendedor fixo
            rlg_codigo: 1,
            sxo_codigo: record.sexo === 'Feminino' ? 2 : 1, // Assumindo 2 p/ Fem e 1 p/ Masc
            etc_codigo: 1, // 1 = SOLTEIRO
            beneficiarios: beneficiarios
        };

        try {
            console.log('Enviando Cadastro para SIGPAF:', payload);
            const response = await fetch('https://api.sigpaf.com.br/public/Pessoa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': SIGPAF_API_KEY
                },
                body: JSON.stringify(payload)
            });
            
            const postResult = await response.json();
            console.log('Resposta Cadastro SIGPAF:', postResult);

            // 2. O POST do SIGPAF já retorna o número do contrato! Vamos salvar no Supabase:
            if (postResult.contract_number || postResult.id) {
                console.log(`Sucesso no SIGPAF! ID: ${postResult.id} | Contrato: ${postResult.contract_number}`);
                
                // Atualiza a coluna protocolo na tabela inscricoes com o contrato oficial gerado
                await supabase.from('inscricoes').update({ protocolo: postResult.contract_number.toString() }).eq('id', record.id);
            }

        } catch (error) {
            console.error('Erro na integração com SIGPAF:', error);
        }
    };

    // 2. Enviar mensagem de texto inicial pro grupo
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
                text: `✅ *Novo Cadastro Aprovado!*\n\n*Protocolo:* \`${record.protocolo || '-'}\`\n*Cliente:* ${clienteNome}\n*CPF:* ${cpf}\n*Telefone:* ${record.telefone || '-'}\n*Valor:* ${record.valor || '-'}\n\nEnviando arquivos...`,
            parse_mode: 'Markdown'
        })
    });

    // 2.5. Enviar notificação de aprovação e carteirinha via Suri (WhatsApp)
    await sendSuriNotification(record.telefone, clienteNome, cpf);

    // 2.8. Sincronizar com o SIGPAF
    await syncWithSigpaf(record);

    // 3. Fazer o Upload de cada arquivo pro Telegram sequencialmente
    let allSuccess = true;
    for (const file of filesToBackup) {
        const success = await sendToTelegram(file);
        if (!success) allSuccess = false;
    }

    // 4. Mágica da Limpeza (Deletar as fotos pesadas do Supabase se o backup deu certo)
    if (allSuccess && filesToDelete.length > 0) {
        console.log('Arquivos enviados pro Telegram com sucesso. Fazendo autolimpeza de:', filesToDelete);
        await supabase.storage.from('documentos').remove(filesToDelete);
        
        // Esvazia os campos no banco para não dar erro de "imagem quebrada" no Dashboard
        await supabase.from('inscricoes').update({
            foto_url: null,
                comprovante_pagamento_url: null,
                assinatura_url: null
        }).eq('id', record.id);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    console.error('Erro Fatal na Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})