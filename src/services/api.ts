import axios from "axios";
import { RegistrationData, Titular, Dependente } from "@/types/registration"; // Assumindo que seus tipos estão aqui

// --- Configuração de Ambiente ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Inicializa clientes
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // O Content-Type para multipart/form-data é definido automaticamente pelo Axios
    // ao usar um objeto FormData.
  },
});

// --- Interfaces do Payload (Fase 2) ---

// Interface para os documentos processados (URLs)
interface DocumentosPayload {
  // Este payload não é mais necessário, pois os arquivos são enviados diretamente.
}

// Interface final enviada para a API REST (SIGPAF)
export interface CadastroPayload {
  titular: Titular;
  dependentes: Dependente[];
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

// --- Função Principal (Orquestrador) ---

interface SubmitProps {
  data: RegistrationData;
  contractPdf: Blob;
}

/**
 * Orquestra o cadastro:
 * 1. Montagem do payload JSON com os dados do titular e dependentes.
 * 2. Montagem do FormData com o JSON e todos os arquivos (contrato e documentos).
 * 3. POST para API REST como multipart/form-data
 */
export const submitCadastro = async ({
  data,
  contractPdf,
}: SubmitProps): Promise<void> => {
  const { titular, documentos, dependentes } = data;
  // Validação básica antes de começar
  if (!documentos.fotoRg || !documentos.fotoComprovanteResidencia) {
    throw new Error("Documentos obrigatórios estão faltando.");
  }

  try {
    // FASE 1: Montar Payload JSON (sem as URLs dos documentos)
    const payload: CadastroPayload = {
      titular: {
        ...titular,
        // Remove formatação de CPF/Tel se a API esperar apenas números
        cpf: titular.cpf.replace(/\D/g, ""),
        cep: titular.cep.replace(/\D/g, ""),
      },
      dependentes: dependentes,
      metadata: {
        origem: "wizard-web",
        dataCadastro: new Date().toISOString(),
      },
    };

    // FASE 2: Montar FormData para envio
    const formData = new FormData();

    // Anexa o payload JSON como uma string. O backend deverá fazer o parse.
    formData.append("data", JSON.stringify(payload));

    // Anexa o arquivo PDF do contrato
    formData.append("contract", contractPdf, `contrato-${payload.titular.cpf}.pdf`);

    // Anexa os arquivos de imagem diretamente ao FormData.
    // O backend precisa estar preparado para receber estes campos.
    // Os nomes dos campos ('rgFile', 'cpfFile', etc.) devem ser combinados com o backend.
    const rgFile = typeof documentos.fotoRg === 'string' ? await base64ToBlob(documentos.fotoRg) : documentos.fotoRg;
    formData.append("rgFile", rgFile, `rg_${titular.cpf}.jpg`);

    if (documentos.fotoCpf) {
      const cpfFile = typeof documentos.fotoCpf === 'string' ? await base64ToBlob(documentos.fotoCpf) : documentos.fotoCpf;
      formData.append("cpfFile", cpfFile, `cpf_${titular.cpf}.jpg`);
    }

    const residenciaFile = typeof documentos.fotoComprovanteResidencia === 'string'
      ? await base64ToBlob(documentos.fotoComprovanteResidencia)
      : documentos.fotoComprovanteResidencia;
    formData.append("residenciaFile", residenciaFile, `residencia_${titular.cpf}.jpg`);

    // FASE 3: Envio para API REST Principal (SIGPAF) como multipart/form-data
    await api.post("/cadastros", formData, {
      headers: {
        // Axios define o Content-Type para multipart/form-data automaticamente com o boundary correto
        "Content-Type": "multipart/form-data",
      },
    });

  } catch (error: any) {
    // Tratamento de erro unificado
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || "Erro ao comunicar com o servidor.";
      throw new Error(`Erro na API: ${message}`);
    }
    throw new Error(error.message || "Ocorreu um erro inesperado durante o cadastro.");
  }
};
