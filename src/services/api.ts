import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/types/registration";

interface SubmitProps {
  data: RegistrationData;
  contractPdf: Blob;
}

/**
 * Converte Base64 para Blob (necessário se os arquivos vierem como string base64)
 */
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const response = await fetch(base64);
  const blob = await response.blob();
  return blob;
};

/**
 * Converte formato DD/MM/YYYY para YYYY-MM-DD (ISO para Banco de Dados)
 */
const formatDateToISO = (dateStr: string | undefined): string | null => {
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
const cleanAddressPart = (part: string | undefined | null) => {
  if (!part || part === 'undefined' || part === 'null' || part.trim() === '') return undefined;
  return part;
};

/**
 * Envia o cadastro para o Supabase:
 * 1. Upload dos documentos para o Storage (bucket 'documentos')
 * 2. Insert dos dados na tabela 'inscricoes'
 */
export const submitCadastro = async ({
  data,
  contractPdf,
}: SubmitProps): Promise<void> => {
  const { titular, documentos, dependentes } = data;

  // Validação básica
  if (!documentos.fotoRg || !documentos.fotoComprovanteResidencia) {
    throw new Error("Documentos obrigatórios estão faltando.");
  }

  // Remove caracteres não numéricos do CPF para usar como nome de pasta/arquivo
  const cleanCpf = titular.cpf.replace(/\D/g, "");

  try {
    // 1. Upload do Contrato PDF
    const contractPath = `${cleanCpf}/contrato.pdf`;
    const { error: uploadError1 } = await supabase.storage
      .from('documentos')
      .upload(contractPath, contractPdf, { upsert: true });
    
    if (uploadError1) throw uploadError1;

    // 2. Upload do RG (frente/verso ou único)
    const rgBlob = typeof documentos.fotoRg === 'string' ? await base64ToBlob(documentos.fotoRg) : documentos.fotoRg;
    const rgPath = `${cleanCpf}/rg.jpg`;
    const { error: uploadError2 } = await supabase.storage
      .from('documentos')
      .upload(rgPath, rgBlob, { upsert: true });

    if (uploadError2) throw uploadError2;

    // 3. Upload do Comprovante de Residência
    const resBlob = typeof documentos.fotoComprovanteResidencia === 'string' ? await base64ToBlob(documentos.fotoComprovanteResidencia) : documentos.fotoComprovanteResidencia;
    const resPath = `${cleanCpf}/residencia.jpg`;
    const { error: uploadError3 } = await supabase.storage
      .from('documentos')
      .upload(resPath, resBlob, { upsert: true });

    if (uploadError3) throw uploadError3;

    // 3.5. Upload Documentos dos Dependentes
    const dependentesProcessados = await Promise.all(dependentes.map(async (dep, index) => {
      let fotoUrl = null;
      if (dep.fotoDocumento) {
        const depBlob = typeof dep.fotoDocumento === 'string' ? await base64ToBlob(dep.fotoDocumento) : dep.fotoDocumento;
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
    let valorTotal = 0;
    const numPessoas = 1 + dependentesProcessados.length;

    if (numPessoas === 1) {
      // Plano Individual: R$ 30,00
      valorTotal = 30.0;
    } else {
      // Plano Familiar: R$ 25,00 por pessoa
      valorTotal = numPessoas * 25.0;
    }
    const valorFormatado = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

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
        telefone: titular.telefone || null,
        email: titular.email || null,
        endereco: [
          [cleanAddressPart(titular.logradouro), cleanAddressPart(titular.numero)].filter(Boolean).join(', '),
          cleanAddressPart(titular.bairro),
          [cleanAddressPart(titular.cidade), cleanAddressPart(titular.uf)].filter(Boolean).join('/'),
        ]
          .filter(Boolean)
          .join(' - '),
        foto_url: rgPath,
        anexo_documento_url: contractPath,
        cargo: titular.profissao,
        valor: valorFormatado,
        // Salva os dependentes como JSON string para manter os dados estruturados com os links das fotos
        observacoes:
          dependentesProcessados.length > 0 ? JSON.stringify(dependentesProcessados) : '',
        status: 'pendente'
      });

    if (insertError) throw insertError;

  } catch (error: any) {
    console.error("Erro no cadastro:", error.message || error);
    throw new Error(error.message || "Erro ao processar cadastro.");
  }
};
