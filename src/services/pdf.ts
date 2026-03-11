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
  const existingPdfBytes = await fetch(contractPdfUrl).then((res) =>
    res.arrayBuffer()
  );

  // Carrega o documento PDF
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1]; // Pega a última página do PDF
  const { width: pageWidth } = lastPage.getSize();

  // Embeda a imagem da assinatura
  // FIX: Converte a string Base64 para ArrayBuffer para garantir compatibilidade
  const signatureImageBytes = await fetch(signatureImageBase64).then((res) =>
    res.arrayBuffer()
  );
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  // FIX: Define uma largura alvo (150 pontos) e ajusta a altura proporcionalmente
  // Isso evita que a assinatura fique muito pequena ou invisível
  const signatureDims = signatureImage.scale(150 / signatureImage.width);

  // --- Bloco da Assinatura do Cliente (Canto Inferior Esquerdo) ---
  const blockWidth = 180; // Largura estimada do bloco de assinatura
  const marginLeft = 70;
  const xPos = marginLeft;
  const yPosLine = 150; // Posição Y da linha da assinatura

  // Desenha a assinatura do cliente
  lastPage.drawImage(signatureImage, {
    x: xPos,
    y: yPosLine + 5, // Um pouco acima da linha
    width: signatureDims.width,
    height: signatureDims.height,
  });

  // Desenha a linha para a assinatura
  lastPage.drawLine({
    start: { x: xPos, y: yPosLine },
    end: { x: xPos + blockWidth, y: yPosLine },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  // Adiciona o nome do titular abaixo da linha
  lastPage.drawText(data.titular.nomeCompleto, {
    x: xPos,
    y: yPosLine - 15,
    font: helveticaFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  // Adiciona o CPF abaixo do nome
  lastPage.drawText(`CPF: ${data.titular.cpf}`, {
    x: xPos,
    y: yPosLine - 30,
    font: helveticaFont,
    size: 8,
    color: rgb(0, 0, 0),
  });

  // --- Validação da Assinatura ---
  // Gera o hash dos dados do titular e da assinatura para verificação
  const dataToHash = JSON.stringify({
    nome: data.titular.nomeCompleto,
    cpf: data.titular.cpf,
    assinatura: signatureImageBase64, // Inclui a própria assinatura no hash
  });
  const dataHash = await createSha256Hash(dataToHash);
  const signingDateTime = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  // Adiciona a data e hora da assinatura
  lastPage.drawText(`Assinado em: ${signingDateTime}`, {
    x: xPos,
    y: yPosLine - 45,
    font: helveticaFont,
    size: 7,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Adiciona o hash de verificação
  lastPage.drawText(`Hash de Validação: ${dataHash}`, {
    x: xPos,
    y: yPosLine - 55,
    font: helveticaFont,
    size: 6,
    color: rgb(0.5, 0.5, 0.5), // Cinza
  });

  // Salva o PDF e retorna os bytes
  return await pdfDoc.save();
};