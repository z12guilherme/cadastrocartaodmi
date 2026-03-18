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