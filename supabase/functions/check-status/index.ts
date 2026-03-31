import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// --- Interfaces para Tipagem (Melhora a clareza e segurança) ---

/**
 * Representa a estrutura esperada da resposta da API do SIGPAF.
 */
interface SigpafResponse {
  erro?: boolean;
  existe?: boolean;
  msg?: string;
  dados?: {
    pessoaSituacao?: {
      psi_codigo: number;
      psi_descricao: string;
      psi_corhex: string;
    };
    pes_contrato: string | number;
    pes_codigo: string | number;
    pes_nome: string;
    pes_dtcadastro: string;
  };
}

/**
 * Representa a estrutura de dados que esta função retorna para o frontend.
 */
interface StatusData {
  existe: boolean;
  status?: string;
  corHex?: string;
  contrato?: string | number;
  nome?: string;
  dataCadastro?: string;
  msg?: string; // Usado para mensagens de erro ou "não encontrado"
  error?: string; // Usado para erros internos
}


// --- Configurações e Funções Auxiliares ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, considere restringir para o seu domínio: 'https://seusite.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cria uma resposta JSON padronizada.
 * @param body O corpo da resposta.
 * @param status O código de status HTTP.
 * @returns Um objeto Response.
 */
function createJsonResponse(body: StatusData, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Garante que nem o browser nem proxies (como o da Supabase) façam cache da resposta.
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    },
    status,
  });
}


// --- Lógica Principal da Função ---

serve(async (req) => {
  // Responde ao "preflight" request do navegador (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cpf } = await req.json();

    if (!cpf) {
      return createJsonResponse({ existe: false, error: 'CPF é obrigatório' }, 400);
    }

    // Garante que pegamos apenas os números, não importa o que o frontend enviou
    const cpfNumerico = String(cpf).replace(/\D/g, "");
    
    if (cpfNumerico.length !== 11) {
      return createJsonResponse({ existe: false, error: 'CPF inválido (tamanho incorreto)' }, 400);
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
        cache: 'no-store', // BLINDAGEM MÁXIMA: Força o Deno a não usar nenhum cache para esta requisição.
        headers: { 
            'authorization': SIGPAF_API_KEY,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        }
    });

    const responseText = await response.text();
    let data: SigpafResponse;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        console.error(`SIGPAF não retornou um JSON válido. Resposta: ${responseText.substring(0, 200)}`);
        throw new Error(`A API externa (SIGPAF) retornou um formato inesperado.`);
    }

    // 2. Trata o caso do cliente não existir ou erro no SIGPAF
    // BLINDAGEM EXTRA: Checa explicitamente data.existe e também se "dados" vier vazio.
    if (data.erro || data.existe === false || !data.dados || Object.keys(data.dados).length === 0) {
         return createJsonResponse({ existe: false, msg: data.msg || "Cliente não encontrado" }, 200);
    }

    // 3. Filtro de LGPD: Retorna apenas dados de status (nada de endereço, telefone, nome da mãe, etc)
    // BLINDAGEM: A fonte da verdade para "ativo" é o código `psi_codigo === 1`.
    // A descrição em texto (`psi_descricao`) é usada para todos os outros casos (Cancelado, Bloqueado, etc).
    const situacao = data.dados.pessoaSituacao;
    const isAtivo = situacao ? situacao.psi_codigo === 1 : false;

    const statusData: StatusData = {
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

    return createJsonResponse(statusData, 200);

  } catch (error: any) {
    console.error('Erro na função check-status:', error.message);
    return createJsonResponse({ existe: false, error: error.message }, 500);
  }
})