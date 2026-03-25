import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

// Configuração de CORS necessária para o Frontend (React) conseguir chamar a função diretamente
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Responde ao "preflight" request do navegador (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // O frontend sempre enviará os parâmetros via POST usando o supabase.functions.invoke()
    const { cpf } = await req.json();

    if (!cpf) {
      return new Response(JSON.stringify({ error: 'CPF é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SIGPAF_API_KEY = Deno.env.get('SIGPAF_API_KEY');
    if (!SIGPAF_API_KEY) {
      throw new Error('Chave de API do SIGPAF não configurada.');
    }

    // 1. Faz a requisição para a API do SIGPAF com o CPF informado
    const response = await fetch(`https://api.sigpaf.com.br/public/Pessoa?cpf=${cpf}`, {
        method: 'GET',
        headers: { 'authorization': SIGPAF_API_KEY }
    });

    const data = await response.json();

    // 2. Trata o caso do cliente não existir ou erro no SIGPAF
    if (data.erro || !data.dados) {
         return new Response(JSON.stringify({ existe: false, msg: data.msg || "Cliente não encontrado" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Filtro de LGPD: Retorna apenas dados de status (nada de endereço, telefone, nome da mãe, etc)
    const statusData = {
        existe: true,
        status: data.dados.pessoaSituacao?.psi_descricao || "DESCONHECIDO",
        corHex: data.dados.pessoaSituacao?.psi_corhex || "#808080",
        contrato: data.dados.pes_contrato || data.dados.pes_codigo,
        nome: data.dados.pes_nome,
        dataCadastro: data.dados.pes_datacadastro // Adicionando o campo de data de cadastro
    };

    return new Response(JSON.stringify(statusData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('Erro na função check-status:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})