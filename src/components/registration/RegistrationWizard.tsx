import { useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import Step1Titular from "./Step1Titular";
import Step2Documentos from "./Step2Documentos";
import Step3Dependentes from "./Step3Dependentes";
import Step4Resumo from "./Step4Resumo";
import Step5Assinatura from "./Step5Assinatura";
import Step6Sucesso from "./Step6Sucesso"; // Renomeadoo
import StepPagamento from "./StepPagamento"; // Novo componente
import {
  RegistrationData,
  initialTitular,
  initialDocumentos,
} from "@/types/registration";
import logoDmi from "@/assets/logo-dmi.png";
import { submitCadastro } from "@/services/api";
// import { generateContractPdf, savePdfFile } from "./pdf"; // Não gera mais no client
import { toast } from "sonner";

const RegistrationWizard = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    titular: initialTitular,
    documentos: initialDocumentos,
    dependentes: [],
    // @ts-ignore - Adicionando campo dinamicamente se não estiver no tipo
    comprovantePagamento: null, 
    metodoPagamento: "",
    diaVencimento: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [finalContract, setFinalContract] = useState<Blob | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const handleSignAndSubmit = async (signatureImageBase64: string) => {
    setIsSubmitting(true);
    try {
      // 1. Envia os dados e a assinatura para a API
      toast.info("Enviando solicitação de cadastro...");
      
      // Agora passamos a assinatura pura, o contrato será gerado pelo Admin após pagamento
      const novoProtocolo = await submitCadastro({ data, signatureBase64: signatureImageBase64 });
      setProtocolo(novoProtocolo);

      toast.success("Solicitação enviada com sucesso!");

      // 4. Avança para a tela de sucesso (agora passo 7)
      setStep(7);
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
      // @ts-ignore
      comprovantePagamento: null,
      metodoPagamento: "",
      diaVencimento: "",
    });
    // setFinalContract(null);
    setProtocolo(null);
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
        {step < 7 && <ProgressBar currentStep={step} totalSteps={6} />}

        <div className={step < 7 ? "wizard-card" : ""}>
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
            <StepPagamento
              // @ts-ignore
              values={{
                comprovantePagamento: (data as any).comprovantePagamento,
                metodoPagamento: (data as any).metodoPagamento,
                diaVencimento: (data as any).diaVencimento,
              }}
              onChange={(field, value) => setData({ ...data, [field]: value })}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}
          {step === 6 && (
            <Step5Assinatura
              onConfirm={handleSignAndSubmit}
              onBack={() => setStep(5)}
              isSubmitting={isSubmitting}
            />
          )}
          {step === 7 && <Step6Sucesso onReset={handleReset} protocolo={protocolo} />}
        </div>
      </main>
    </div>
  );
};

export default RegistrationWizard;
