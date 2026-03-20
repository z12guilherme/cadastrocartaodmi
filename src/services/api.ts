import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/types/registration";

interface SubmitProps {
  data: RegistrationData;
  signatureBase64: string;
}

/**
 * Converte Base64 para Blob (necessário se os arquivos vierem como string base64)
 */
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Comprime e redimensiona uma imagem para economizar espaço no Storage.
 * Converte para JPEG com qualidade 0.7 e largura máxima de 1200px.
 */
const compressImage = async (input: Blob | string, quality = 0.7, maxWidth = 1200): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = typeof input === 'string' ? input : URL.createObjectURL(input);
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (typeof input !== 'string') URL.revokeObjectURL(img.src);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Falha no contexto do canvas'));

      // Fundo branco para imagens com transparência (ex: PNG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Erro na compressão da imagem'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => reject(err);
  });
};

/**
 * Converte formato DD/MM/YYYY para YYYY-MM-DD (ISO para Banco de Dados)
 */
export const formatDateToISO = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null;
  // Se já estiver no formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return null;
};

/**
 * Limpa partes do endereço para evitar "undefined" como string
 */
export const cleanAddressPart = (part: string | undefined | null) => {
  if (!part || part === 'undefined' || part === 'null' || part.trim() === '') return undefined;
  return part;
};

/**
 * Calcula o valor do plano baseado na quantidade de dependentes
 * Titular apenas: R$ 30. Familiar: R$ 25 por pessoa.
 */
export const calcularValorPlano = (numDependentes: number): number => {
  const numPessoas = 1 + numDependentes;
  return numPessoas === 1 ? 30.0 : numPessoas * 25.0;
};

export const formatarMoeda = (valor: number): string => {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
};

/**
 * Envia o cadastro para o Supabase:
 * 1. Upload dos documentos para o Storage (bucket 'documentos')
 * 2. Insert dos dados na tabela 'inscricoes'
 */
export const submitCadastro = async ({
  data,
  signatureBase64,
}: SubmitProps): Promise<string> => {
  const { titular, documentos, dependentes, comprovantePagamento, metodoPagamento, diaVencimento } = data as any;

  // Validação básica
  if (!documentos.fotoRg || !documentos.fotoComprovanteResidencia) {
    throw new Error("Documentos obrigatórios estão faltando.");
  }

  // Remove caracteres não numéricos do CPF para usar como nome de pasta/arquivo
  const cleanCpf = titular.cpf.replace(/\D/g, "");

  // Usa o CPF limpo do cliente como Protocolo de Consulta
  const protocolo = cleanCpf;

  try {
    // SEGURANÇA: Verificação final de duplicidade antes de iniciar os uploads
    const { data: cpfExiste, error: rpcError } = await supabase.rpc('checar_cpf_existente', { p_cpf: titular.cpf });
    if (rpcError) throw rpcError;
    if (cpfExiste) {
      throw new Error("Este CPF já possui um cadastro ativo ou em análise. Verifique a tela de Consulta.");
    }

    // Array para guardar todas as tarefas e executar ao mesmo tempo
    const uploadTasks: Promise<any>[] = [];

    // 1. Upload da Assinatura (PNG)
    let signaturePath = null;
    if (signatureBase64 && signatureBase64.trim() !== "") {
      signaturePath = `${cleanCpf}/assinatura.png`;
      uploadTasks.push(
        base64ToBlob(signatureBase64).then(blob => 
          supabase.storage.from('documentos').upload(signaturePath, blob, { upsert: true })
        )
      );
    }

    // 2. Upload do RG
    const rgPath = `${cleanCpf}/rg.jpg`;
    uploadTasks.push(
      compressImage(documentos.fotoRg).then(blob => 
        supabase.storage.from('documentos').upload(rgPath, blob, { upsert: true })
      )
    );

    // 3. Upload do Comprovante de Residência
    const resPath = `${cleanCpf}/residencia.jpg`;
    uploadTasks.push(
      compressImage(documentos.fotoComprovanteResidencia).then(blob => 
        supabase.storage.from('documentos').upload(resPath, blob, { upsert: true })
      )
    );

    // 3.8 Upload Comprovante Pagamento
    let comprovantePath = null;
    if (comprovantePagamento) {
        comprovantePath = `${cleanCpf}/comprovante_pagamento.jpg`;
        uploadTasks.push(
          compressImage(comprovantePagamento).then(blob => 
            supabase.storage.from('documentos').upload(comprovantePath, blob, { upsert: true })
          )
        );
    }

    // 🚀 OTIMIZAÇÃO: Executa todos os uploads ao mesmo tempo! (Muito mais rápido)
    const results = await Promise.all(uploadTasks);
    results.forEach(res => { if (res.error) throw res.error; });

    // 3.5. Upload Documentos dos Dependentes (Já estava otimizado usando Promise.all)
    const dependentesProcessados = await Promise.all(dependentes.map(async (dep, index) => {
      let fotoUrl = null;
      if (dep.fotoDocumento) {
        const depBlob = await compressImage(dep.fotoDocumento);
        const safeCpf = dep.cpf.replace(/\D/g, "") || "nocpf";
        const depPath = `${cleanCpf}/dependente_${index}_${safeCpf}.jpg`;
        
        const { error: depError } = await supabase.storage
          .from('documentos')
          .upload(depPath, depBlob, { upsert: true });
        
        if (depError) throw depError;
        fotoUrl = depPath;
      }

      return {
        ...dep,
        fotoDocumento: fotoUrl // Salva o caminho do arquivo em vez do base64
      };
    }));

    // --- Regra de Negócio para o Valor da Mensalidade ---
    const valorTotal = calcularValorPlano(dependentesProcessados.length);
    const valorFormatado = formatarMoeda(valorTotal);

    // 4. Inserir dados na tabela
    const { error: insertError } = await supabase
      .from('inscricoes')
      .insert({
        nome_completo: titular.nomeCompleto,
        cpf: titular.cpf,
        rg: titular.rg,
        data_nascimento: formatDateToISO(titular.dataNascimento),
        naturalidade: titular.naturalidade,
        estado_civil: titular.estadoCivil,
        sexo: titular.sexo,
        telefone: titular.telefoneCelular || null,
        email: titular.email || null,
        endereco: [
          [cleanAddressPart(titular.rua || titular.logradouro), cleanAddressPart(titular.numero)].filter(Boolean).join(', '),
          cleanAddressPart(titular.bairro),
          [cleanAddressPart(titular.cidade), cleanAddressPart(titular.uf)].filter(Boolean).join('/'),
        ]
          .filter(Boolean)
          .join(' - '),
        numero: titular.numero,
        complemento: titular.pontoReferencia,
        bairro: titular.bairro,
        cidade: titular.cidade,
        cep: titular.cep,
        foto_url: rgPath,
        assinatura_url: signaturePath, // Salva o caminho da assinatura
        cargo: titular.profissao,
        valor: valorFormatado,
        // Salva os dependentes como JSON string para manter os dados estruturados com os links das fotos
        observacoes:
          dependentesProcessados.length > 0 ? JSON.stringify(dependentesProcessados) : '',
        status: 'pendente',
        protocolo: protocolo,
        comprovante_pagamento_url: comprovantePath,
        metodo_pagamento: metodoPagamento,
        dia_vencimento: diaVencimento
      });

    if (insertError) throw insertError;
    
    // Limpa o rascunho do navegador após o sucesso do cadastro
    localStorage.removeItem("dmi_cadastro_rascunho");

    return protocolo;

  } catch (error: any) {
    console.error("Erro no cadastro:", error.message || error);
    throw new Error(error.message || "Erro ao processar cadastro.");
  }
};

export const consultarStatusPorProtocolo = async (termoBusca: string) => {
  // Recria a máscara do CPF para conseguir achar os cadastros antigos no banco
  let cpfFormatado = termoBusca;
  if (termoBusca.length === 11 && !termoBusca.includes('.')) {
    cpfFormatado = termoBusca.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  const { data, error } = await supabase
    .from('inscricoes')
    .select('nome_completo, status, anexo_documento_url, valor')
    .or(`protocolo.eq.${termoBusca},cpf.eq.${cpfFormatado},cpf.eq.${termoBusca}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;

  // Se aprovado, gerar link de download
  let downloadUrl = null;
  if (data.status === 'aprovado' && data.anexo_documento_url) {
    const { data: urlData } = await supabase.storage.from('documentos').createSignedUrl(data.anexo_documento_url, 3600);
    if (urlData) downloadUrl = urlData.signedUrl;
  }

  return { ...data, downloadUrl };
};

export const buscarDadosCarteirinha = async (cpfBusca: string) => {
  let cpfFormatado = cpfBusca;
  if (cpfBusca.length === 11 && !cpfBusca.includes('.')) {
    cpfFormatado = cpfBusca.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  const { data, error } = await supabase
    .from('inscricoes')
    .select('nome_completo, cpf, status, observacoes, created_at, protocolo')
    .or(`cpf.eq.${cpfFormatado},cpf.eq.${cpfBusca}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;

  return data;
};
