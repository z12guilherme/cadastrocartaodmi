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

    // Garante que pegamos apenas os números, não importa o que o frontend enviou
    const cpfNumerico = String(cpf).replace(/\D/g, "");
    
    if (cpfNumerico.length !== 11) {
      return new Response(JSON.stringify({ error: 'CPF inválido (tamanho incorreto)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Remonta o CPF no padrão que o banco do SIGPAF exige (XXX.XXX.XXX-XX)
    const cpfFormatado = cpfNumerico.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    const SIGPAF_API_KEY = Deno.env.get('SIGPAF_API_KEY');
    if (!SIGPAF_API_KEY) {
      throw new Error('Chave de API do SIGPAF não configurada.');
    }

    // 1. Faz a requisição para a API do SIGPAF com o CPF FORMATADO
    // BLINDAGEM CONTRA CACHE: Adicionamos um timestamp na URL e headers rígidos
    // para forçar o servidor deles a buscar o dado em tempo real, ignorando "fantasmas".
    const url = `https://api.sigpaf.com.br/public/Pessoa?cpf=${encodeURIComponent(cpfFormatado)}&_t=${Date.now()}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 
            'authorization': SIGPAF_API_KEY,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        }
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`SIGPAF não retornou um JSON válido. Resposta: ${responseText.substring(0, 100)}`);
    }

    // 2. Trata o caso do cliente não existir ou erro no SIGPAF
    // BLINDAGEM EXTRA: Checa explicitamente data.existe e também se "dados" vier vazio.
    if (data.erro || data.existe === false || !data.dados || Object.keys(data.dados).length === 0) {
         return new Response(JSON.stringify({ existe: false, msg: data.msg || "Cliente não encontrado" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Filtro de LGPD: Retorna apenas dados de status (nada de endereço, telefone, nome da mãe, etc)
    // BLINDAGEM: A fonte da verdade para "ativo" é o código `psi_codigo === 1`.
    // A descrição em texto (`psi_descricao`) é usada para todos os outros casos (Cancelado, Bloqueado, etc).
    const situacao = data.dados.pessoaSituacao;
    const isAtivo = situacao ? situacao.psi_codigo === 1 : false;

    const statusData = {
        existe: true,
        // Se o código for 1, FORÇAMOS o status para "ATIVO". 
        // Se não, usamos a descrição que vier, ou um padrão seguro "INATIVO".
        // Isso previne que um status "CANCELADO" com código 1 passe, ou que um código != 1 seja "ATIVO".
        status: isAtivo ? "ATIVO" : (situacao?.psi_descricao || "INATIVO"),
        corHex: situacao?.psi_corhex || "#808080",
        contrato: data.dados.pes_contrato || data.dados.pes_codigo,
        nome: data.dados.pes_nome,
        dataCadastro: data.dados.pes_dtcadastro
    };

    return new Response(JSON.stringify(statusData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('Erro na função check-status:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})