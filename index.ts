import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LAVITE_BASE_URL = "https://hsf.lavitesaude.com/api/v1";

// Função auxiliar para autenticar na API da Lavite e pegar o token de sessão
async function getLaviteSession() {
  const login = Deno.env.get('LAVITE_LOGIN');
  const password = Deno.env.get('LAVITE_PASSWORD');

  if (!login || !password) {
    throw new Error('Credenciais da Lavite não configuradas no Supabase (LAVITE_LOGIN / LAVITE_PASSWORD)');
  }

  const response = await fetch(`${LAVITE_BASE_URL}/usuarios/sessao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });

  if (!response.ok) {
    throw new Error('Falha ao autenticar na API Lavite Saúde');
  }

  const data = await response.json();
  return data.token; // Supondo que a API retorne um { token: '...' }
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

    // 1. Autenticação na API Lavite (Pega o token para as próximas requisições)
    const laviteToken = await getLaviteSession();
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${laviteToken}`
    };

    // ----------------------------------------------------------------------
    // ROTA 1: Listar Agendas e Horários Disponíveis
    // ----------------------------------------------------------------------
    if (action === 'listar_agendas') {
      // Você pode passar filtros no payload (ex: especialidade, data)
      const queryString = new URLSearchParams(payload || {}).toString();

      const response = await fetch(`${LAVITE_BASE_URL}/agendas?${queryString}`, {
        method: 'GET',
        headers: authHeaders
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ----------------------------------------------------------------------
    // ROTA 2: Criar Agendamento (Reserva a consulta + Avisa SURI)
    // ----------------------------------------------------------------------
    if (action === 'criar_agendamento') {
      // TODO: 1. Verificar se o paciente existe (GET /pacientes?cpf=...)
      // TODO: 2. Se não existir, criar (POST /pacientes)

      // 3. Efetivar o Agendamento
      const agendamentoResponse = await fetch(`${LAVITE_BASE_URL}/agendamentos`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      if (!agendamentoResponse.ok) {
        const erro = await agendamentoResponse.text();
        throw new Error(`Erro ao agendar na Lavite: ${erro}`);
      }

      const agendamentoData = await agendamentoResponse.json();

      // TODO: 4. Chamar a API da SURI para enviar WhatsApp de confirmação

      return new Response(JSON.stringify({ success: true, data: agendamentoData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Ação não reconhecida
    return new Response(JSON.stringify({ error: 'Ação desconhecida.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error: any) {
    console.error(`Erro na action:`, error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})