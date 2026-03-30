import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

const sendErrorToTelegram = async (errorMessage: string, clienteInfo: string) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("Telegram credentials for error reporting are not set.");
        return;
    }

    const text = `🚨 *ERRO CRÍTICO no Webhook DMI!*\n\n*Inscrição:* ${clienteInfo}\n*Motivo:* ${errorMessage}`;

    try {
        // Fire-and-forget, não bloqueia a resposta de erro da função
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error("Failed to send critical error notification to Telegram:", e);
    }
};

async function createSha256Hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  let record: any = null; // Declarado aqui para ser acessível no bloco catch

  try {
    // 1. Validar se a requisição é um POST
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const payload = await req.json();
    console.log('Webhook payload:', payload);
    record = payload.record; // Atribui à variável de escopo mais amplo

    // Apenas rodar quando o status mudar para "aprovado"
    const oldRecord = payload.old_record

    if (record.status !== 'aprovado' || (oldRecord && oldRecord.status === 'aprovado')) {
      return new Response(JSON.stringify({ message: "Status não é aprovação. Ignorando." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_DB_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SURI_TOKEN = Deno.env.get('SURI_TOKEN')
    const SURI_API_URL = Deno.env.get('SURI_API_URL') || 'https://cbm-wap-babysuri-cb89694138-dmi.azurewebsites.net/'
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase credenciais não configuradas na Edge Function.')
    }

    // Cria o cliente Supabase ignorando RLS (modo admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const clienteNome = record.nome_completo;
    const cpf = record.cpf;
    const filesToBackup = [];
    const filesToDelete = [];

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

    // Prepara o comprovante de residência para backup e exclusão
    const cleanCpfForSearch = cpf ? cpf.replace(/\D/g, "") : "";
    if (record.comprovante_residencia_url) {
        filesToBackup.push({ url: record.comprovante_residencia_url, type: 'photo', filename: `Residencia_${cpf}` });
        filesToDelete.push(record.comprovante_residencia_url);
    } else if (cleanCpfForSearch) {
        // Caso a coluna não exista no banco, busca o arquivo direto na pasta do cliente no Storage
        const { data: folderFiles } = await supabase.storage.from('documentos').list(cleanCpfForSearch);
        if (folderFiles) {
            const file = folderFiles.find(f => f.name.toLowerCase().startsWith('residencia'));
            if (file) {
                const path = `${cleanCpfForSearch}/${file.name}`;
                filesToBackup.push({ url: path, type: 'photo', filename: `Residencia_${cpf}` });
                filesToDelete.push(path);
            }
        }
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
    const sendSuriNotification = async (telefone: string, nome: string, cpfLimpo: string) => {
        if (!SURI_TOKEN || !telefone) return;
        
        // Limpar telefone (apenas números) e adicionar 55 se for padrão BR e não tiver
        let telLimpo = telefone.replace(/\D/g, '');
        if (telLimpo.length === 10 || telLimpo.length === 11) telLimpo = `55${telLimpo}`;

        const baseUrl = SURI_API_URL.endsWith('/') ? SURI_API_URL.slice(0, -1) : SURI_API_URL;
        
        const dispararTemplate = async (templateId: string, parametros: string[]) => {
            try {
                const response = await fetch(`${baseUrl}/api/messages/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SURI_TOKEN}`
                    },
                    body: JSON.stringify({
                        user: {
                            name: nome,
                            phone: telLimpo,
                            email: null,
                            gender: 0,
                            channelId: "wp830252690173622", 
                            channelType: 1,
                            defaultDepartmentId: null
                        },
                        message: {
                            templateId: templateId, 
                            BodyParameters: parametros, 
                            ButtonsParameters: [] 
                        }
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Erro Suri (${templateId}):`, errorText);
                } else {
                    console.log(`WhatsApp Suri (${templateId}) enviado para ${telLimpo}`);
                }
            } catch (error) {
                console.error(`Erro conectar Suri (${templateId}):`, error);
            }
        };

        // 1. Dispara o Template: Cadastro Aprovado
        await dispararTemplate("1220216410265812", [nome]);

        // Pausa de 2 segundos para evitar bloqueio de Spam/Rate Limit da Suri
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Dispara o Template: Carteirinha Digital (Envia nome e CPF para montar o link)
        await dispararTemplate("964730382572152", [nome, cpfLimpo]);
    };

    // Função auxiliar para sincronizar com o SIGPAF (Cadastro + Captura de Contrato)
    const syncWithSigpaf = async (record: any) => {
        const SIGPAF_API_KEY = Deno.env.get('SIGPAF_API_KEY');
        
        if (!SIGPAF_API_KEY) {
            throw new Error('Chave de API do SIGPAF não configurada no Supabase Secrets.');
        }

        // Função para mapear o nome da cidade para o ID do SIGPAF
        const getCidadeId = (cidadeName?: string) => {
            if (!cidadeName) return 1; // Padrão: BELO JARDIM
            
            // Tira os acentos e deixa tudo em maiúsculo (ex: "São Bento do Una" vira "SAO BENTO DO UNA")
            const cleanName = cidadeName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
            
            const map: Record<string, number> = {
                "ALAGOINHA": 15,
                "ARCOVERDE": 12,
                "BELO JARDIM": 1,
                "BREJO DA MADRE DE DEUS": 6,
                "CABANAS": 10,
                "CACHOEIRINHA": 9,
                "CAETES": 24,
                "CAMARAGIBE": 11,
                "CAPOEIRAS": 20,
                "CARUARU": 8,
                "GARANHUNS": 18,
                "IBIMIRIM": 23,
                "JABOATAO": 14,
                "JATAUBA": 26,
                "JUCATI": 27,
                "JUPI": 16,
                "LAJEDO": 7,
                "LOT SANTO AFONSO": 22,
                "PANELAS": 13,
                "PAPAGAIO": 30,
                "PESQUEIRA": 5,
                "POCAO": 21,
                "RECIFE": 19,
                "SANHARO": 3,
                "SAO BENTO DO UNA": 2,
                "SAO CAETANO": 17,
                "TACAIMBO": 4
            };

            return map[cleanName] || 1;
        };

        // Função para buscar e mapear o ID do Parentesco dinamicamente na API do SIGPAF
        const getDynamicParentescoId = async (parentescoName?: string) => {
            if (!parentescoName) return 37; // Padrão: DEPENDENTE

            const cleanName = parentescoName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

            try {
                const res = await fetch('https://api.sigpaf.com.br/public/Parentescos', {
                    headers: { 'authorization': SIGPAF_API_KEY }
                });

                if (res.ok) {
                    const parentescos = await res.json();
                    const found = parentescos.find((p: any) => 
                        (p.prt_descricao || p.descricao || "").normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() === cleanName
                    );
                    if (found) return found.prt_codigo || found.codigo || 37;
                }
            } catch (e) {
                console.error('Erro ao buscar parentescos dinamicamente:', e);
            }

            // Fallback manual se a API falhar ou não encontrar correspondência exata
            const map: Record<string, number> = {
                "AMIGA": 25, "AMIGO": 26, "AVO": 18, "BISNETA": 34, "BISNETO": 33,
                "CUNHADA": 14, "CUNHADO": 13, "DEPENDENTE": 37, "ENTEADA": 30, "ENTEADO": 29,
                "ESPOSA": 1, "CONJUGE": 1, "ESPOSO": 2, "FILHA": 6, "FILHO": 5, "GENRO": 23,
                "IRMA": 8, "IRMAO": 7, "MADRINHA": 35, "MAE": 3, "NAO INFORMADO": 32,
                "NETA": 21, "NETO": 22, "NOIVA": 27, "NOIVO": 28, "NORA": 24, "OUTROS": 31,
                "PADRASTO": 38, "PAI": 4, "PRIMA": 16, "PRIMO": 15, "SOBRINHA": 20,
                "SOBRINHO": 19, "SOGRA": 12, "SOGRO": 11, "TIA": 10, "TIO": 9, "TITULAR": 36
            };
            return map[cleanName] || 37;
        };

        // Função para buscar e mapear o ID do Estado Civil dinamicamente
        const getDynamicEstadoCivilId = async (estadoCivil?: string, sexo?: string) => {
            const isFeminino = sexo ? sexo.toUpperCase().startsWith('F') : false;
            if (!estadoCivil) return isFeminino ? 2 : 1; // SOLTEIRA ou SOLTEIRO

            const cleanStatus = estadoCivil.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\(A\)/, '');

            let expectedName = cleanStatus;
            if (cleanStatus.startsWith("CASAD")) expectedName = isFeminino ? "CASADA" : "CASADO";
            else if (cleanStatus.startsWith("DIVORCIAD")) expectedName = isFeminino ? "DIVORCIADA" : "DIVORCIADO";
            else if (cleanStatus.startsWith("SEPARAD")) expectedName = isFeminino ? "SEPARADA" : "SEPARADO";
            else if (cleanStatus.startsWith("VIUV")) expectedName = isFeminino ? "VIUVA" : "VIUVO";
            else if (cleanStatus.startsWith("SOLTEIR")) expectedName = isFeminino ? "SOLTEIRA" : "SOLTEIRO";
            else if (cleanStatus.startsWith("CONVIVENTE")) expectedName = "CONVIVENTE";

            try {
                const res = await fetch('https://api.sigpaf.com.br/public/EstadoCivis', {
                    headers: { 'authorization': SIGPAF_API_KEY }
                });

                if (res.ok) {
                    const estados = await res.json();
                    const found = estados.find((e: any) => 
                        (e.etc_descricao || "").toUpperCase() === expectedName
                    );
                    if (found) return found.etc_codigo;
                }
            } catch (e) {
                console.error('Erro ao buscar estados civis dinamicamente:', e);
            }

            // Fallback manual exato da API
            if (expectedName === "CASADA") return 4;
            if (expectedName === "CASADO") return 3;
            if (expectedName === "CONVIVENTE") return 11;
            if (expectedName === "DIVORCIADA") return 10;
            if (expectedName === "DIVORCIADO") return 9;
            if (expectedName === "SEPARADA") return 6;
            if (expectedName === "SEPARADO") return 5;
            if (expectedName === "VIUVA") return 8;
            if (expectedName === "VIUVO") return 7;
            return isFeminino ? 2 : 1; // SOLTEIRA / SOLTEIRO
        };


        // Função para buscar e mapear o ID do Bairro dinamicamente na hora do cadastro
        const getBairroId = async (bairroName?: string) => {
            if (!bairroName) return 13; // Padrão: EDSON MORORÓ MOURA
            
            try {
                const cleanName = bairroName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                const res = await fetch('https://api.sigpaf.com.br/public/Bairros', {
                    headers: { 'authorization': SIGPAF_API_KEY }
                });

                if (!res.ok) {
                    console.warn(`[Aviso] Falha ao buscar bairros: HTTP ${res.status}. Usando Bairro Padrão.`);
                    return 13;
                }
                const bairros = await res.json();
                
                // Procura o bairro na lista ignorando acentos e diferenças de maiúsculas/minúsculas
                const found = bairros.find((b: any) => 
                    b.bai_descricao && b.bai_descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() === cleanName
                );
                
                return found ? found.bai_codigo : 13;
            } catch (e) {
                console.error('Erro ao buscar bairros dinamicamente:', e);
                return 13;
            }
        };

        const cidadeId = getCidadeId(record.cidade);
        const bairroId = await getBairroId(record.bairro);
        
        let beneficiarios: any[] = [];
        if (record.observacoes && record.observacoes.startsWith('[')) {
            try {
                const deps = JSON.parse(record.observacoes);
                // Usando Promise.all para permitir a busca assíncrona do ID do parentesco
                beneficiarios = await Promise.all(deps.map(async (dep: any) => ({
                    dep_nome: dep.nomeCompleto || dep.nome || "Nome não informado",
                    dep_cpf: dep.cpf || "",
                    dep_dtnascimento: dep.dataNascimento ? dep.dataNascimento : null,
                    dep_rg: dep.rg || "",
                    dep_celular: dep.telefone || record.telefone || "", // Usa o do titular se vazio
                    dep_endereco: record.endereco || "Não informado", // Usa o do titular
                    dep_numero: record.numero || "S/N",
                    dep_cep: record.cep || "55.150-000",
                    prt_codigo: await getDynamicParentescoId(dep.parentesco), 
                    etc_codigo: await getDynamicEstadoCivilId(dep.estadoCivil, dep.sexo), 
                    bai_codigo: bairroId, 
                    cid_codigo: cidadeId,  // Usa a cidade do Titular
                    rlg_codigo: 2
                })));
            } catch (e) {
                console.error('Erro ao mapear dependentes para SIGPAF:', e);
            }
        }

        // Determina o código do plano com base na quantidade total de pessoas (Titular + Dependentes)
        const totalPessoas = 1 + beneficiarios.length;
        let planCodigoId = 12; // Padrão: DMI 1 PESSOA
        if (totalPessoas === 2) planCodigoId = 56;      // DMI 2 PESSOAS
        else if (totalPessoas === 3) planCodigoId = 15; // DMI 3 PESSOAS
        else if (totalPessoas === 4) planCodigoId = 14; // DMI 4 PESSOAS
        else if (totalPessoas === 5) planCodigoId = 1;  // DMI 5 PESSOAS
        else if (totalPessoas >= 6) planCodigoId = 184; // DMI 6 PESSOAS

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
            cid_codigo: cidadeId, // Dinâmico com base no cadastro
            bai_codigo: bairroId, // Dinâmico com base no cadastro
            pla_codigo: planCodigoId, // Dinâmico com base nos dependentes
            col_codcobrador: 74, // 74 = JOAM VINICIUS
            col_codvendedor: record.col_codvendedor || 190, // Busca da tabela ou usa 190 por padrão
            rlg_codigo: 2,
            sxo_codigo: record.sexo === 'Feminino' ? 2 : 1, // Assumindo 2 p/ Fem e 1 p/ Masc
            etc_codigo: await getDynamicEstadoCivilId(record.estado_civil, record.sexo),
            beneficiarios: beneficiarios
        };

        let contratoGerado = record.protocolo;

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

            // 2. Se já existir, busca o contrato antigo. Se for novo, salva o novo.
            if (postResult.erro && postResult.msg && postResult.msg.includes('Já existe')) {
                console.log('Cliente já existe no SIGPAF. Buscando o contrato atual...');
                
                const getResponse = await fetch(`https://api.sigpaf.com.br/public/Pessoa?cpf=${record.cpf}`, {
                    method: 'GET',
                    headers: { 'authorization': SIGPAF_API_KEY }
                });
                const getResult = await getResponse.json();
                
                if (!getResult.erro && getResult.dados) {
                    contratoGerado = getResult.dados.pes_contrato?.toString() || getResult.dados.pes_codigo?.toString();
                    console.log(`Contrato recuperado com sucesso: ${contratoGerado}`);
                    
                    // Atualiza a coluna protocolo
                    await supabase.from('inscricoes').update({ protocolo: contratoGerado }).eq('id', record.id);
                }
                
            } else if (postResult.contract_number || postResult.id) {
                console.log(`Sucesso no SIGPAF! ID: ${postResult.id} | Contrato: ${postResult.contract_number}`);
                contratoGerado = postResult.contract_number.toString();
                
                // Atualiza a coluna protocolo na tabela inscricoes com o contrato oficial gerado
                await supabase.from('inscricoes').update({ protocolo: contratoGerado }).eq('id', record.id);
            }

        } catch (error) {
            console.error('Erro na integração com SIGPAF:', error);
        }
        
        return contratoGerado;
    };

    // ==========================================
    // NOVA ORDEM DE EXECUÇÃO (O FLUXO PERFEITO)
    // ==========================================

    // 1. PRIMEIRO: Sincronizar com o SIGPAF e Capturar o Número Oficial
    const numeroContratoOFICIAL = await syncWithSigpaf(record);
    const protocoloFinal = numeroContratoOFICIAL || record.protocolo || cpf;

    // 2. SEGUNDO: Gerar o PDF Oficial do Contrato (Já com o número do SIGPAF)
    let contractPathToBackup = record.anexo_documento_url;

    // Força a geração do PDF sempre que for aprovado, sobrescrevendo qualquer PDF antigo
    if (record.assinatura_url) {
        console.log("Gerando PDF do contrato...");
        try {
            const { data: templateData, error: tplError } = await supabase.storage.from('documentos').download('template/contrato.pdf');
            if (tplError || !templateData) throw new Error('Template do contrato não encontrado no Storage. Faça upload na pasta "template/contrato.pdf".');
            
            const existingPdfBytes = await templateData.arrayBuffer();
            
            const { data: sigData, error: sigError } = await supabase.storage.from('documentos').download(record.assinatura_url);
            if (sigError || !sigData) throw new Error('Imagem da assinatura não encontrada.');
            
            const signatureImageBytes = await sigData.arrayBuffer();
            
            const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];

            // Proteção extra: Tenta ler como PNG, se a assinatura for JPG ele não trava a função
            let signatureImage;
            try {
                signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            } catch (err) {
                signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
            }
            
            const signatureDims = signatureImage.scale(150 / signatureImage.width);

            const dataToHash = JSON.stringify({ nome: clienteNome, cpf: cpf });
            const dataHash = await createSha256Hash(dataToHash);
            
            const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
            const signingDate = formatter.format(new Date());

            const startY = 250;
            const lineHeight = 15;
            const xPos = 70;

            lastPage.drawText(`Nome: ${clienteNome}`, { x: xPos, y: startY, font: helveticaFont, size: 10, color: rgb(0, 0, 0) });
            lastPage.drawText(`CPF: ${cpf}`, { x: xPos, y: startY - lineHeight, font: helveticaFont, size: 10, color: rgb(0, 0, 0) });
            
            // Insere o número oficial que acabou de voltar do SIGPAF!
            lastPage.drawText(`Nº do Contrato (SIGPAF): ${protocoloFinal}`, { x: xPos, y: startY - lineHeight * 2, font: helveticaFont, size: 10, color: rgb(0, 0, 0) });
            lastPage.drawText(`Data da Assinatura: ${signingDate}`, { x: xPos, y: startY - lineHeight * 3, font: helveticaFont, size: 10, color: rgb(0, 0, 0) });

            lastPage.drawImage(signatureImage, { x: xPos, y: 150, width: signatureDims.width, height: signatureDims.height });
            lastPage.drawText(`Hash de Verificação: ${dataHash}`, { x: xPos, y: 135, font: helveticaFont, size: 6, color: rgb(0.5, 0.5, 0.5) });

            const pdfBytes = await pdfDoc.save();
            
            const cleanCpf = cpf.replace(/\D/g, "");
            contractPathToBackup = `${cleanCpf}/contrato_final.pdf`;
            
            await supabase.storage.from('documentos').upload(contractPathToBackup, pdfBytes, { upsert: true, contentType: 'application/pdf' });
            await supabase.from('inscricoes').update({ anexo_documento_url: contractPathToBackup }).eq('id', record.id);
            
        } catch (err) {
            console.error("Erro na geração de PDF:", err);
        }
    }

    if (contractPathToBackup) {
        filesToBackup.push({ url: contractPathToBackup, type: 'document', filename: `Contrato_${cpf.replace(/\D/g, "")}.pdf` });
        filesToDelete.push(contractPathToBackup);
    }

    // 3. TERCEIRO: Avisar no Telegram com o número do Contrato do SIGPAF!
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `✅ *Novo Cadastro Aprovado!*\n\n*Contrato SIGPAF:* \`${protocoloFinal}\`\n*Cliente:* ${clienteNome}\n*CPF:* ${cpf}\n*Telefone:* ${record.telefone || '-'}\n*Valor:* ${record.valor || '-'}\n\nEnviando arquivos...`,
            parse_mode: 'Markdown'
        })
    });

    // 4. QUARTO: Enviar os 2 templates do WhatsApp via Suri
    const cpfLimpo = cpf.replace(/\D/g, "");
    const suriPromise = sendSuriNotification(record.telefone, clienteNome, cpfLimpo);

    // 5. QUINTO: Fazer o Upload de cada arquivo pro Telegram
    const telegramPromise = (async () => {
        let successCheck = true;
        for (const file of filesToBackup) {
            const success = await sendToTelegram(file);
            if (!success) successCheck = false;
        }
        return successCheck;
    })();

    // Aguarda o disparo da Suri e do Telegram terminarem concorrentemente
    const [_, allSuccess] = await Promise.all([suriPromise, telegramPromise]);

    // 6. SEXTO: Mágica da Limpeza Total (Deletar TODOS os arquivos do Supabase se o backup deu certo)
    if (allSuccess && filesToDelete.length > 0) {
        console.log('Arquivos enviados pro Telegram com sucesso. Fazendo autolimpeza de:', filesToDelete);
        await supabase.storage.from('documentos').remove(filesToDelete);
        
        // Esvazia os campos no banco para não dar erro de "imagem quebrada" no Dashboard
        await supabase.from('inscricoes').update({
            foto_url: null,
            comprovante_pagamento_url: null,
            comprovante_residencia_url: null,
            assinatura_url: null,
            anexo_documento_url: null
        }).eq('id', record.id);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    console.error('Erro Fatal na Edge Function:', error);

    let clienteInfo = "Informação do cliente não disponível";
    if (record && record.nome_completo) {
        clienteInfo = `${record.nome_completo} (CPF: ${record.cpf || 'N/A'})`;
    }

    // Envia a notificação de erro para o Telegram sem esperar pela resposta
    await sendErrorToTelegram(error.message, clienteInfo);

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})