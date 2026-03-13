import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { RegistrationData } from "@/types/registration";
import contractPdfUrl from "@/assets/contrato.pdf"; // Importa o PDF da pasta de assets

/**
 * Cria um hash SHA-256 de uma string.
 * @param data A string para gerar o hash.
 * @returns Uma representação hexadecimal do hash.
 */
async function createSha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Converte cada byte para uma string hexadecimal de 2 dígitos
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Regenera um PDF válido a partir de um arquivo de texto (OCR) caso o original esteja corrompido.
 */
async function regeneratePdfFromOCR(textBytes: Uint8Array): Promise<PDFDocument> {
  const textDecoder = new TextDecoder('utf-8');
  const text = textDecoder.decode(textBytes);
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const margin = 50;

  // Divide por marcadores de página do OCR se existirem, ou trata como texto único
  const pageMarkers = text.split(/==Start of OCR for page \d+==/);
  const contentParts = pageMarkers.length > 1 ? pageMarkers : [text];

  for (const part of contentParts) {
    // Limpa marcadores e espaços extras
    const cleanText = part.replace(/==End of OCR for page \d+==/g, '').trim();
    if (!cleanText) continue;

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    // Desenha o texto com quebra de linha automática
    page.drawText(cleanText, {
      x: margin,
      y: height - margin - 20,
      size: fontSize,
      font: font,
      maxWidth: width - (margin * 2),
      lineHeight: fontSize * 1.2,
    });
  }
  return pdfDoc;
}

/**
 * Gera um PDF de contrato preenchido com os dados do titular e sua assinatura.
 *
 * @param data Os dados completos do cadastro.
 * @param signatureImageBase64 A imagem da assinatura em formato Base64 (PNG).
 * @returns Um Uint8Array representando os bytes do PDF gerado.
 */
export const generateContractPdf = async (
  data: RegistrationData,
  signatureImageBase64: string
): Promise<Uint8Array> => {
  // Carrega o template do contrato da pasta de assets
  console.log("Iniciando geração do contrato...", contractPdfUrl);
  const response = await fetch(contractPdfUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar o modelo do contrato: ${response.status} ${response.statusText}`);
  }
  const existingPdfBytes = await response.arrayBuffer();

  let pdfDoc: PDFDocument;

  try {
    // Tenta carregar como PDF binário. Se falhar (ex: arquivo de texto/OCR), cai no catch.
    pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
  } catch (error) {
    console.warn("O arquivo não é um PDF binário padrão. Tentando converter a partir do texto (OCR)...", error);
    pdfDoc = await regeneratePdfFromOCR(existingPdfBytes);
  }

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  // Pega a última página do PDF
  const lastPage = pages[pages.length - 1];
  // Embeda a imagem da assinatura
  // FIX: Converte a string Base64 para ArrayBuffer para garantir compatibilidade
  const signatureImageBytes = await fetch(signatureImageBase64).then((res) => res.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
  
  // FIX: Define uma largura alvo (150 pontos) e ajusta a altura proporcionalmente
  // Isso evita que a assinatura fique muito pequena ou invisível
  const signatureDims = signatureImage.scale(150 / signatureImage.width);

  // Gera o hash dos dados do titular para verificação
  const dataToHash = JSON.stringify(data.titular);
  const dataHash = await createSha256Hash(dataToHash);
  const signingDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Adiciona os dados do titular ao PDF
  // NOTA: Ajuste as coordenadas (x, y) conforme necessário para o seu template.
  // A origem (0, 0) é o canto inferior esquerdo da página.
  const startY = 250; // Posição vertical inicial
  const lineHeight = 15;
  const xPos = 70;

  lastPage.drawText(`Nome: ${data.titular.nomeCompleto}`, {
    x: xPos,
    y: startY,
    font: helveticaFont,
    size: 10,
    color: rgb(0, 0, 0),
  });
  lastPage.drawText(`CPF: ${data.titular.cpf}`, {
    x: xPos,
    y: startY - lineHeight,
    font: helveticaFont,
    size: 10,
    color: rgb(0, 0, 0),
  });
  lastPage.drawText(`Data da Assinatura: ${signingDate}`, {
    x: xPos,
    y: startY - lineHeight * 2,
    font: helveticaFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  // Desenha a assinatura na página
  lastPage.drawImage(signatureImage, {
    x: xPos, // Ajuste a posição horizontal
    y: 150, // Ajuste a posição vertical
    width: signatureDims.width,
    height: signatureDims.height,
  });

  // Adiciona o hash de verificação abaixo da assinatura
  lastPage.drawText(`Hash de Verificação: ${dataHash}`, {
    x: xPos,
    y: 135, // Posição abaixo da assinatura
    font: helveticaFont,
    size: 6,
    color: rgb(0.5, 0.5, 0.5), // Cinza
  });

  // Salva o PDF e retorna os bytes
  return await pdfDoc.save();
};

/**
 * Helper para iniciar o download do PDF gerado no navegador.
 * @param pdfBytes Os bytes do PDF (retorno de generateContractPdf).
 * @param fileName O nome do arquivo a ser salvo (ex: "contrato.pdf").
 */
export const savePdfFile = (pdfBytes: Uint8Array, fileName: string) => {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};