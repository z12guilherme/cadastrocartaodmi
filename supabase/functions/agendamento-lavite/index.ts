import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getBaseUrl(unidade?: string) {
    if (unidade === 'hsf') return "https://hsf.lavitesaude.com/api/v1";
    if (unidade === 'rededmi') return "https://rededmi.lavitesaude.com/api/v1";
    return Deno.env.get('LAVITE_BASE_URL') || "https://rededmi.lavitesaude.com/api/v1";
}

// Função auxiliar para pegar os headers de sessão usando o Token Fixo da API
function getLaviteAuthHeaders(unidade?: string) {
    // Pega o token da HSF (que você acabou de descobrir!) ou da Rede DMI
    // Usamos o token que você capturou do HTML como fallback direto no código para teste imediato!
    const tokenHsf = Deno.env.get('LAVITE_API_TOKEN_HSF') || 'lavite_hsf_7b8ef256811e11296d11d5f65d7f2865';

    // Se não tiver o token da rede dmi configurado ainda, tenta usar o da HSF 
    const tokenRededmi = Deno.env.get('LAVITE_API_TOKEN_REDEDMI') || 'lavite_rededmi_93454633b360e65c9614d2ec609daddc';

    const token = unidade === 'hsf' ? tokenHsf : tokenRededmi;

    if (!token) {
        throw new Error('Token de Integração da Lavite não configurado.');
    }

    // Se o token fornecido for na verdade um Cookie de Sessão capturado pelo usuário
    if (token.startsWith('_session_id=')) {
        return {
            'Content-Type': 'application/json',
            'Cookie': token
        };
    }

    // APIs Rails (da empresa LA) costumam aceitar o token nessas variações
    return {
        'Content-Type': 'application/json',
        'Authorization': `Token token="${token}"`, // Padrão clássico de segurança do Ruby on Rails
        'token': token, // ESTE FOI O CARA QUE EU TINHA APAGADO SEM QUERER!
        'access-token': token,
        'X-Access-Token': token,
        'X-CSRF-Token': unidade === 'rededmi' ? 'Ri6O62y0e2mtLojdek0shGd2tOqkSrHt76ZpMaiJcrk=' : ''
    };
}

serve(async (req) => {
    // Tratamento de CORS para requisições do Navegador (Frontend)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, payload } = await req.json();

        if (!action) {
            return new Response(JSON.stringify({ error: 'Parâmetro "action" é obrigatório.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const baseUrl = getBaseUrl(payload?.unidade);

        // 1. Autenticação Fixa na API Lavite (Sem precisar de login)
        let authHeaders = getLaviteAuthHeaders(payload?.unidade);

        // ----------------------------------------------------------------------
        // ROTA 1: Listar Agendas e Horários Disponíveis
        // ----------------------------------------------------------------------
        if (action === 'listar_agendas') {
            // Você pode passar filtros no payload (ex: especialidade, data)
            const queryString = new URLSearchParams(payload || {}).toString();

            let response = await fetch(`${baseUrl}/agendas?${queryString}`, {
                method: 'GET',
                headers: authHeaders
            });

            let textoResposta = await response.text();

            // Se a sessão expirou e devolveu HTML da tela de login em vez de JSON
            if (textoResposta.includes('<!DOCTYPE html>') || textoResposta.includes('<html')) {
                return new Response(JSON.stringify({ error: 'Sessão expirada. O Cookie _session_id é inválido.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                });
            }

            let data = textoResposta ? JSON.parse(textoResposta) : {};

            // Auto-Correção de Formato de Token: Se a Lavite rejeitar o formato "Token token=", tentamos o formato "Bearer"
            if (data && data.error && (data.error.includes('Token') || data.error.includes('inválido'))) {
                console.log("Token rejeitado no formato padrão. Tentando formato alternativo (Bearer)...");
                const tokenHsf = Deno.env.get('LAVITE_API_TOKEN_HSF') || 'lavite_hsf_7b8ef256811e11296d11d5f65d7f2865';
                const tokenRededmi = Deno.env.get('LAVITE_API_TOKEN_REDEDMI') || 'lavite_rededmi_93454633b360e65c9614d2ec609daddc';
                const rawToken = payload?.unidade === 'hsf' ? tokenHsf : tokenRededmi;

                if (!rawToken.startsWith('_session_id=')) {
                    authHeaders['Authorization'] = `Bearer ${rawToken}`;
                }

                response = await fetch(`${baseUrl}/agendas?${queryString}`, { method: 'GET', headers: authHeaders });
                const novaResposta = await response.text();
                data = novaResposta.startsWith('<') ? { error: 'Sessão expirada' } : JSON.parse(novaResposta);
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // ----------------------------------------------------------------------
        // ROTA 2: Criar Agendamento (Reserva a consulta + Avisa SURI)
        // ----------------------------------------------------------------------
        if (action === 'criar_agendamento') {
            const { paciente, agendamento } = payload;

            if (!paciente || !paciente.cpf) {
                throw new Error('É necessário enviar os dados do "paciente" (com CPF) no payload.');
            }

            const cpfLimpo = paciente.cpf.replace(/\D/g, "");
            // Aplica a máscara padrão de CPF exigida pelo banco de dados da Lavite
            const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

            let pacienteProntuario: string | null = null;
            let pacienteEncontrado = null;
            let criacaoData = null;
            let pacienteCheckData = null;

            // Tenta localizar o paciente na resposta com flexibilidade
            const extrairPaciente = (data: any) => {
                if (!data) return null;
                if (Array.isArray(data) && data.length > 0) return data[0];
                if (data.data && Array.isArray(data.data) && data.data.length > 0) return data.data[0];
                if (data.id) return data;
                if (data.pacientes && Array.isArray(data.pacientes) && data.pacientes.length > 0) return data.pacientes[0];
                return null;
            };

            // 1. Busca Exaustiva: Tenta várias rotas e formatos para forçar a API da Lavite a nos devolver o paciente
            const queriesBusca = [
                `busca_paciente_documento=${encodeURIComponent(cpfFormatado)}`,
                `busca_paciente_documento=${cpfLimpo}`,
                `numero_documento=${encodeURIComponent(cpfFormatado)}`,
                `numero_documento=${cpfLimpo}`,
                `cpf=${encodeURIComponent(cpfFormatado)}`,
                `cpf=${cpfLimpo}`,
                `documento=${cpfLimpo}`,
                `busca=${cpfLimpo}`
            ];

            for (const query of queriesBusca) {
                console.log(`Buscando paciente na Lavite: ${query}`);
                try {
                    const res = await fetch(`${baseUrl}/pacientes?${query}`, { method: 'GET', headers: authHeaders });
                    if (res.ok) {
                        const data = await res.json();
                        const p = extrairPaciente(data);
                        if (p && (p.prontuario || p.id)) {
                            pacienteEncontrado = p;
                            pacienteCheckData = data;
                            console.log(`Paciente escondido encontrado via query: ${query}`);
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`Erro silencioso ao buscar na query ${query}`);
                }
            }

            // 1.5 Fallback Extremo: Busca por Nome + Cruzamento de CPF (para CPFs salvos com erro de digitação na clínica)
            if (!pacienteEncontrado && paciente.nome) {
                console.log(`Nenhuma query de documento funcionou. Buscando paciente por nome...`);
                try {
                    const normalizeStr = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : '';
                    const nomeApp = normalizeStr(paciente.nome);
                    const partesNome = nomeApp.split(' ');

                    // Tenta variações de nome para driblar erros de digitação e acentuação no sistema legado
                    const tentativasNome = [paciente.nome, nomeApp];
                    if (partesNome.length > 2) {
                        tentativasNome.push(`${partesNome[0]} ${partesNome[partesNome.length - 1]}`); // 2. Primeiro e último
                        tentativasNome.push(`${partesNome[0]} ${partesNome[1]}`); // 3. Primeiro e segundo
                    }
                    tentativasNome.push(partesNome[0]); // 4. Apenas o primeiro nome (Pode retornar muitos, mas acha!)

                    const tentativasUnicas = [...new Set(tentativasNome)];

                    for (const queryNome of tentativasUnicas) {
                        if (pacienteEncontrado) break;
                        console.log(`Tentando buscar por nome: ${queryNome}`);

                        // Navega em até 4 páginas de resultados para aquele nome
                        for (let pagina = 1; pagina <= 4; pagina++) {
                            const resNome = await fetch(`${baseUrl}/pacientes?nome=${encodeURIComponent(queryNome)}&pagina=${pagina}`, { method: 'GET', headers: authHeaders });
                            if (resNome.ok) {
                                const dataNome = await resNome.json();
                                const lista = dataNome.pacientes || dataNome.data || (Array.isArray(dataNome) ? dataNome : []);
                                if (Array.isArray(lista) && lista.length > 0) {
                                    const match = lista.find((p: any) => {
                                        const docLimpo = p.numero_documento ? p.numero_documento.replace(/\D/g, '') : '';
                                        const nomeLavite = normalizeStr(p.nome);
                                        // Match perfeito de CPF ou Match perfeito de Nome (caso o CPF deles esteja em branco/errado)
                                        return docLimpo === cpfLimpo || (nomeLavite === nomeApp && nomeApp.length > 5);
                                    });

                                    if (match && (match.prontuario || match.id)) {
                                        console.log(`Paciente encontrado por nome (${queryNome}, Pág ${pagina}) e CPF cruzado com sucesso!`);
                                        pacienteEncontrado = match;
                                        pacienteCheckData = match;
                                        break;
                                    }
                                } else {
                                    break; // Sai do loop de páginas se vier vazia
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log(`Erro silencioso ao buscar por nome.`);
                }
            }

            if (pacienteEncontrado && (pacienteEncontrado.prontuario || pacienteEncontrado.id)) {
                pacienteProntuario = pacienteEncontrado.prontuario || pacienteEncontrado.id;
                console.log(`Paciente encontrado. Prontuário Lavite: ${pacienteProntuario}`);
            } else {
                // 2. Se não existir, criar (POST /pacientes)
                console.log('Paciente não encontrado. Criando novo...');

                // Formatar data de nascimento para YYYY-MM-DD
                let dataNascFormatada = "1900-01-01";
                if (paciente.data_nascimento && paciente.data_nascimento.includes('/')) {
                    const parts = paciente.data_nascimento.split('/');
                    if (parts.length === 3) dataNascFormatada = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else if (paciente.data_nascimento) {
                    dataNascFormatada = paciente.data_nascimento;
                }

                const novoPacientePayload = {
                    nome: paciente.nome,
                    sexo: (paciente.sexo === 'F' || paciente.sexo === 'Feminino') ? 'feminino' : 'masculino',
                    municipio_id: 1, // 1 = Recife/PE (Padrão)
                    nome_mae: "Não informado",
                    tipo_documento_id: 4, // 4 = CPF
                    numero_documento: cpfFormatado, // A API exige a máscara (000.000.000-00), ao contrário da documentação!
                    data_nascimento: dataNascFormatada,
                    nacionalidade_id: 1, // 1 = Brasileiro
                    telefone_celular: String(paciente.telefone || "")
                };

                const novoPacienteResponse = await fetch(`${baseUrl}/pacientes`, {
                    method: 'POST',
                    headers: authHeaders,
                    // Envia o payload exato conforme documentação da Lavite
                    body: JSON.stringify(novoPacientePayload)
                });

                if (!novoPacienteResponse.ok) {
                    const erro = await novoPacienteResponse.text();
                    let msgErro = `Erro ao criar paciente na Lavite: ${erro}`;
                    try {
                        const parsedErro = JSON.parse(erro);
                        if (parsedErro.errors && JSON.stringify(parsedErro.errors).includes("uso")) {
                            msgErro = `O CPF ${paciente.cpf} já está cadastrado na clínica, mas não pôde ser localizado automaticamente. Por favor, contate a recepção para agendar.`;
                        }
                    } catch (e) { }
                    throw new Error(msgErro);
                }

                // O .text() nos previne de um erro de JSON Parse se a resposta da Lavite for totalmente vazia
                const textoResposta = await novoPacienteResponse.text();
                const novoPacienteData = textoResposta ? JSON.parse(textoResposta) : {};
                criacaoData = novoPacienteData;

                const pCriado = extrairPaciente(novoPacienteData);
                pacienteProntuario = pCriado?.prontuario || pCriado?.id || novoPacienteData.prontuario || (novoPacienteData.paciente && novoPacienteData.paciente.prontuario) || novoPacienteData.id || (novoPacienteData.data && novoPacienteData.data.prontuario);

                // Se a API da Lavite retornar sucesso na criação (200/201), mas devolver um JSON vazio (ex: {}), 
                // nós faremos uma nova busca pelo CPF para "pescar" o Prontuário do paciente recém-criado!
                if (!pacienteProntuario) {
                    console.log("Criação retornou vazio. Aguardando banco de dados legado sincronizar...");

                    // Loop de Retentativas: Aguarda 2 segundos e tenta buscar, até 3 vezes (Total 6s de tolerância)
                    for (let tentativa = 1; tentativa <= 3; tentativa++) {
                        await new Promise(r => setTimeout(r, 2000));
                        console.log(`Tentativa ${tentativa} de buscar o paciente recém-criado...`);

                        for (const query of queriesBusca) {
                            try {
                                const resBuscaNova = await fetch(`${baseUrl}/pacientes?${query}`, { method: 'GET', headers: authHeaders });
                                if (resBuscaNova.ok) {
                                    const dataBuscaNova = await resBuscaNova.json();
                                    const pNovo = extrairPaciente(dataBuscaNova);
                                    if (pNovo && (pNovo.prontuario || pNovo.id)) {
                                        pacienteProntuario = pNovo.prontuario || pNovo.id;
                                        console.log(`Prontuário resgatado com sucesso via ${query}: ${pacienteProntuario}`);
                                        break;
                                    }
                                }
                            } catch (e) { }
                        }

                        if (pacienteProntuario) break;

                        if (!pacienteProntuario && paciente.nome) {
                            const normalizeStr = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : '';
                            const nomeApp = normalizeStr(paciente.nome);
                            const tentativas = [...new Set([paciente.nome, nomeApp, nomeApp.split(' ')[0]])];
                            for (const t of tentativas) {
                                if (pacienteProntuario) break;
                                try {
                                    const resNome = await fetch(`${baseUrl}/pacientes?nome=${encodeURIComponent(t)}`, { method: 'GET', headers: authHeaders });
                                    if (resNome.ok) {
                                        const dataNome = await resNome.json();
                                        const lista = dataNome.pacientes || dataNome.data || (Array.isArray(dataNome) ? dataNome : []);
                                        if (Array.isArray(lista)) {
                                            const match = lista.find((p: any) => {
                                                const docLimpo = p.numero_documento ? p.numero_documento.replace(/\D/g, '') : '';
                                                const nomeLavite = normalizeStr(p.nome);
                                                return docLimpo === cpfLimpo || (nomeLavite === nomeApp && nomeApp.length > 5);
                                            });
                                            if (match && (match.prontuario || match.id)) {
                                                pacienteProntuario = match.prontuario || match.id;
                                            }
                                        }
                                    }
                                } catch (e) { }
                            }
                        }

                        if (pacienteProntuario) break;
                    }
                }
            } // Fecha o else da verificação de paciente

            if (!pacienteProntuario) {
                console.error(`Falha crítica: Prontuário não retornado. Criação: ${criacaoData ? JSON.stringify(criacaoData) : 'N/A'}`);
                throw new Error("Seu cadastro foi criado na clínica, mas não pudemos sincronizar sua ficha automaticamente. Por favor, tente agendar novamente em alguns minutos ou contate a recepção.");
            }

            // Converter data da agenda de YYYY-MM-DD para DD/MM/YYYY (Exigência Lavite: "11/05/2022")
            let dataAgenda = agendamento.data;
            if (dataAgenda && dataAgenda.includes('-')) {
                const parts = dataAgenda.split('-');
                if (parts.length === 3) dataAgenda = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            // Injeta o Prontuário do paciente no objeto que será enviado para agendar
            const agendamentoFinalPayload = {
                agenda_id: String(agendamento.agenda_id || "1"),
                codigo_paciente: String(pacienteProntuario),
                data: dataAgenda,
                horario_id: agendamento.horario_id ? String(agendamento.horario_id) : undefined,
                hora: agendamento.hora,
                observacao: "Agendado via Aplicativo DMI"
            };

            // 3. Efetivar o Agendamento
            const agendamentoResponse = await fetch(`${baseUrl}/agendamentos`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(agendamentoFinalPayload)
            });

            if (!agendamentoResponse.ok) {
                const erro = await agendamentoResponse.text();
                throw new Error(`Erro ao agendar na Lavite: ${erro}`);
            }

            const agendamentoData = await agendamentoResponse.json();

            // 4. Chamar a API da SURI para enviar WhatsApp de confirmação
            try {
                const suriToken = Deno.env.get('SURI_TOKEN');
                const suriApiUrl = Deno.env.get('SURI_API_URL') || 'https://cbm-wap-babysuri-cb89694138-dmi.azurewebsites.net/';
                // Usamos o Channel ID padrão da clínica que configuramos antes
                const channelId = Deno.env.get('SURI_CHANNEL_ID') || 'wp830252690173622';

                // TODO: Coloque aqui o ID do Template de "Confirmação de Consulta" criado no painel da Meta/SURI
                const templateId = 'ID_DO_TEMPLATE_AGENDAMENTO';

                if (suriToken && paciente.telefone) {
                    let telLimpo = paciente.telefone.replace(/\D/g, '');
                    if (telLimpo.length === 10 || telLimpo.length === 11) telLimpo = `55${telLimpo}`;

                    const baseUrlSuri = suriApiUrl.endsWith('/') ? suriApiUrl.slice(0, -1) : suriApiUrl;

                    const suriResponse = await fetch(`${baseUrlSuri}/api/messages/send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${suriToken}`
                        },
                        body: JSON.stringify({
                            user: {
                                name: paciente.nome,
                                phone: telLimpo,
                                channelId: channelId,
                                channelType: 1
                            },
                            message: {
                                templateId: templateId,
                                // Parâmetros dinâmicos do Template: Ex: 1-Nome, 2-Especialidade, 3-Data, 4-Hora
                                BodyParameters: [paciente.nome, agendamento.especialidade, agendamento.data, agendamento.hora],
                                ButtonsParameters: []
                            }
                        })
                    });

                    if (!suriResponse.ok) console.error('Erro na resposta da SURI:', await suriResponse.text());
                }
            } catch (e) {
                console.error('Falha ao tentar disparar WhatsApp da SURI:', e);
                // Apenas logamos o erro para não impedir que o agendamento (success: true) chegue no paciente caso o zap falhe
            }

            return new Response(JSON.stringify({ success: true, data: agendamentoData }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        } // Fecha a rota criar_agendamento

        // Ação não reconhecida
        return new Response(JSON.stringify({ error: 'Ação desconhecida.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });

    } catch (error: any) {
        console.error(`Erro na action:`, error);
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
})