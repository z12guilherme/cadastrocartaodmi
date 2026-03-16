import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req: Request) => {
  try {
    // 1. Apenas aceitar requisições POST
    if (req.method !== 'POST') {
      return new Response('Método não permitido', { status: 405 });
    }

    // 2. Coletar payload e assinatura para futura validação
    const signature = req.headers.get('webhook-signature') || req.headers.get('x-pagarme-signature');
    const payload = await req.text();
    const secret = Deno.env.get('STONE_WEBHOOK_SECRET');

    // TODO: Quando tiver a chave, habilitar a validação do HMAC-SHA256 aqui para segurança.
    // Se a assinatura não bater, deve retornar erro 401 Unauthorized.

    const event = JSON.parse(payload);

    // 3. Verificar o tipo de evento (focamos em pedido/cobrança paga)
    if (event.type !== 'order.paid' && event.type !== 'charge.paid') {
      return new Response(JSON.stringify({ message: 'Evento ignorado. Não é um pagamento aprovado.' }), { status: 200 });
    }

    // 4. Extrair o identificador do cliente.
    // A Stone/Pagar.me permite passar um "code" próprio na criação do pedido, ou pegar o CPF do "customer".
    const customerCpf = event.data?.customer?.document;
    const inscricaoCode = event.data?.code; // Caso o backend que gerou o link tenha passado o ID do banco aqui

    if (!customerCpf && !inscricaoCode) {
      throw new Error('Nenhuma referência válida (CPF ou Code) encontrada no webhook.');
    }

    // 5. Inicializar Supabase com a Service Role Key (Ignora as regras do RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 6. Atualizar a inscrição para "aprovado"
    let query = supabase.from('inscricoes').update({ status: 'aprovado' });
    
    if (inscricaoCode) {
      query = query.eq('id', inscricaoCode);
    } else {
      // Usando o CPF, removemos qualquer formatação que a Stone possa enviar
      query = query.eq('cpf', customerCpf.replace(/\D/g, ''));
    }

    const { data, error } = await query.select();
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, updated: data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});