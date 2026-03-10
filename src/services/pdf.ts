import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { RegistrationData } from "@/types/registration";

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
  // Carrega o template do contrato da pasta /public
  const contractUrl = "/contrato.pdf";
  const existingPdfBytes = await fetch(contractUrl).then((res) =>
    res.arrayBuffer()
  );

  // Carrega o documento PDF
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Embeda a imagem da assinatura
  const signatureImage = await pdfDoc.embedPng(signatureImageBase64);
  const signatureDims = signatureImage.scale(0.25); // Reduz o tamanho da assinatura em 75%

  // Adiciona os dados do titular ao PDF
  // NOTA: Ajuste as coordenadas (x, y) conforme necessário para o seu template.
  // A origem (0, 0) é o canto inferior esquerdo da página.
  firstPage.drawText(`Nome: ${data.titular.nomeCompleto}`, {
    x: 70,
    y: 250, // Ajuste a posição vertical
    font: helveticaFont,
    size: 10,
    color: rgb(0, 0, 0),
  });

  // Desenha a assinatura na página
  firstPage.drawImage(signatureImage, {
    x: 70, // Ajuste a posição horizontal
    y: 150, // Ajuste a posição vertical
    width: signatureDims.width,
    height: signatureDims.height,
  });

  // Salva o PDF e retorna os bytes
  return await pdfDoc.save();
};