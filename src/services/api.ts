import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { Titular, TitularDocumentos } from "@/types/registration"; // Assumindo que seus tipos estão aqui

// --- Configuração de Ambiente ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BUCKET_NAME = "documentos-cadastro"; // Nome do seu bucket no Supabase

// Validação preventiva para não quebrar a aplicação sem .env
if (!SUPABASE_URL) {
  console.warn("ATENÇÃO: VITE_SUPABASE_URL não definida. O upload de arquivos falhará.");
}

// Inicializa clientes
// Usa valores vazios/fictícios se não houver env para evitar crash na inicialização
const supabase = createClient(SUPABASE_URL || "https://setup-pending.supabase.co", SUPABASE_ANON_KEY || "setup-pending");
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interfaces do Payload (Fase 2) ---

// Interface para os documentos processados (URLs)
interface DocumentosPayload {
  urlRg: string;
  urlCpf: string;
  urlComprovanteResidencia: string;
}

// Interface final enviada para a API REST (SIGPAF)
export interface CadastroPayload {
  titular: Titular;
  // dependentes: Dependente[]; // Descomente se tiver a interface de dependentes
  documentos: DocumentosPayload;
  metadata: {
    origem: string;
    dataCadastro: string;
  };
}

// --- Funções Utilitárias ---

/**
 * Converte uma string Base64 (data:image/...) para Blob para upload
 * Necessário pois seu FileUpload atual retorna Base64
 */
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const response = await fetch(base64);
  const blob = await response.blob();
  return blob;
};

/**
 * Fase 1: Upload de Arquivo para o Supabase Storage
 */
export const uploadImageToSupabase = async (
  fileOrBase64: string | File,
  fileName: string
): Promise<string> => {
  try {
    let fileToUpload: File | Blob;

    // Tratamento para converter Base64 se necessário
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      fileToUpload = await base64ToBlob(fileOrBase64);
    } else if (fileOrBase64 instanceof File) {
      fileToUpload = fileOrBase64;
    } else {
      throw new Error("Formato de arquivo inválido.");
    }

    // Gera um caminho único: cpf_timestamp_nomearquivo
    // Nota: Idealmente passar o CPF aqui para organizar pastas, ex: `${cpf}/${fileName}`
    const filePath = `${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erro Supabase:", error);
      throw new Error(`Falha no upload de ${fileName}`);
    }

    // Recupera URL Pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Erro no upload:", error);
    throw error;
  }
};

// --- Função Principal (Orquestrador) ---

interface SubmitProps {
  titular: Titular;
  documentos: TitularDocumentos;
  // dependentes: Dependente[];
}

/**
 * Orquestra o cadastro:
 * 1. Upload das imagens para Supabase
 * 2. Montagem do JSON
 * 3. POST para API REST
 */
export const submitCadastro = async ({
  titular,
  documentos,
}: SubmitProps): Promise<void> => {
  // Validação básica antes de começar
  if (!documentos.fotoRg || !documentos.fotoComprovanteResidencia) {
    throw new Error("Documentos obrigatórios estão faltando.");
  }

  try {
    // FASE 1: Uploads em paralelo para performance
    // Usamos Promise.all para subir tudo de uma vez
    const [urlRg, urlCpf, urlResidencia] = await Promise.all([
      uploadImageToSupabase(documentos.fotoRg, `rg_${titular.cpf}.jpg`),
      documentos.fotoCpf ? uploadImageToSupabase(documentos.fotoCpf, `cpf_${titular.cpf}.jpg`) : Promise.resolve(""),
      uploadImageToSupabase(
        documentos.fotoComprovanteResidencia,
        `residencia_${titular.cpf}.jpg`
      ),
    ]);

    // FASE 2: Montar Payload JSON
    const payload: CadastroPayload = {
      titular: {
        ...titular,
        // Remove formatação de CPF/Tel se a API esperar apenas números
        cpf: titular.cpf.replace(/\D/g, ""),
        cep: titular.cep.replace(/\D/g, ""),
      },
      // dependentes: dependentes,
      documentos: {
        urlRg,
        urlCpf,
        urlComprovanteResidencia: urlResidencia,
      },
      metadata: {
        origem: "wizard-web",
        dataCadastro: new Date().toISOString(),
      },
    };

    // Envio para API REST Principal (SIGPAF)
    await api.post("/cadastros", payload);

  } catch (error: any) {
    // Tratamento de erro unificado
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || "Erro ao comunicar com o servidor.";
      throw new Error(`Erro na API: ${message}`);
    }
    throw new Error(error.message || "Ocorreu um erro inesperado durante o cadastro.");
  }
};
