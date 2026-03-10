import { useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import Step1Titular from "./Step1Titular";
import Step2Documentos from "./Step2Documentos";
import Step3Dependentes from "./Step3Dependentes";
import Step4Resumo from "./Step4Resumo";
import Step5Assinatura from "./Step5Assinatura";
import Step6Sucesso from "./Step6Sucesso"; // Renomeado
import {
  RegistrationData,
  initialTitular,
  initialDocumentos,
} from "@/types/registration";
import logoDmi from "@/assets/logo-dmi.png";
import { submitCadastro } from "@/services/api";
import { generateContractPdf } from "./pdf";
import { toast } from "sonner";

const RegistrationWizard = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    titular: initialTitular,
    documentos: initialDocumentos,
    dependentes: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalContract, setFinalContract] = useState<Blob | null>(null);

  const handleSignAndSubmit = async (signatureImageBase64: string) => {
    setIsSubmitting(true);
    try {
      // 1. Gera o PDF com a assinatura e o hash
      toast.info("Gerando contrato, por favor aguarde...");
      const pdfBytes = await generateContractPdf(data, signatureImageBase64);
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      setFinalContract(pdfBlob);

      // 2. Envia os dados e o contrato para a API
      toast.info("Enviando seu cadastro...");
      try {
        await submitCadastro({ data, contractPdf: pdfBlob });
        toast.success("Cadastro enviado com sucesso!");
      } catch (apiError) {
        console.warn("Erro ao enviar para API (Ignorado para testes):", apiError);
        toast.warning("Modo Teste: Falha no envio ignorada para visualização do PDF.");
      }

      // 3. Inicia o download para o cliente
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pdfBlob);
      link.download = `contrato-dmi-${data.titular.cpf}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info("O download do seu contrato foi iniciado.");

      // 4. Avança para a tela de sucesso
      setStep(6);
    } catch (error: any) {
      console.error("Falha ao finalizar cadastro:", error);
      toast.error("Erro ao finalizar cadastro", {
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setData({
      titular: initialTitular,
      documentos: initialDocumentos,
      dependentes: [],
    });
    setFinalContract(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoDmi} alt="Cartão DMI" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">
                Cartão DMI
              </h1>
              <p className="text-xs text-muted-foreground">Pré-cadastro</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 pb-12">
        {step < 6 && <ProgressBar currentStep={step} totalSteps={5} />}

        <div className={step < 6 ? "wizard-card" : ""}>
          {step === 1 && (
            <Step1Titular
              data={data.titular}
              onChange={(titular) => setData({ ...data, titular })}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Documentos
              data={data.documentos}
              onChange={(documentos) => setData({ ...data, documentos })}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3Dependentes
              dependentes={data.dependentes}
              onChange={(dependentes) => setData({ ...data, dependentes })}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Resumo
              data={data}
              onConfirm={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5Assinatura
              onConfirm={handleSignAndSubmit}
              onBack={() => setStep(4)}
              isSubmitting={isSubmitting}
            />
          )}
          {step === 6 && <Step6Sucesso onReset={handleReset} contractBlob={finalContract} />}
        </div>
      </main>
    </div>
  );
};

export default RegistrationWizard;
