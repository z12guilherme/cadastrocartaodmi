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
  const response = await fetch(contractPdfUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar o modelo do contrato: ${response.status} ${response.statusText}`);
  }
  const existingPdfBytes = await response.arrayBuffer();

  // Verifica se o arquivo começa com o cabeçalho de PDF "%PDF-"
  const header = new Uint8Array(existingPdfBytes.slice(0, 5));
  const headerStr = String.fromCharCode(...header);
  if (headerStr !== '%PDF-') {
    console.error("Conteúdo inválido recebido (primeiros 50 bytes):", String.fromCharCode(...new Uint8Array(existingPdfBytes.slice(0, 50))));
    throw new Error(
      `O arquivo carregado não é um PDF válido (Header: ${headerStr}). \n` +
      `Isso geralmente acontece quando o arquivo não é encontrado no servidor (Erro 404) e o site retorna uma página HTML em vez do PDF. \n` +
      `Verifique se o nome do arquivo no servidor é exatamente 'contrato.pdf' (tudo minúsculo).`
    );
  }

  // Carrega o documento PDF
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
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