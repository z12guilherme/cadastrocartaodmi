import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

// Configuração de CORS para permitir que o frontend chame a função
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
    const { cpf } = await req.json();

    if (!cpf) {
      return new Response(JSON.stringify({ error: 'CPF é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Pega a chave da API dos segredos do Supabase (nunca exposta no código)
    const APICPF_KEY = Deno.env.get('APICPF_KEY');
    if (!APICPF_KEY) {
      throw new Error('Chave da API (APICPF_KEY) não configurada nos segredos do Supabase.');
    }

    // 2. Faz a requisição para a API externa (apicpf.com) de forma segura
    const response = await fetch(`https://apicpf.com/api/consulta?cpf=${cpf}`, {
        method: 'GET',
        headers: { 'X-API-KEY': APICPF_KEY }
    });

    const data = await response.json();

    // 3. Trata a resposta da API externa (CPF inválido, não encontrado, etc.)
    if (data.code !== 200 || !data.data) {
         return new Response(JSON.stringify({ success: false, message: data.message || "Dados não encontrados" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: data.code || 404,
        });
    }

    // 4. Retorna os dados com sucesso para o frontend
    return new Response(JSON.stringify({ success: true, ...data.data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    });

  } catch (error: any) {
    console.error('Erro na função get-cpf-data:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})