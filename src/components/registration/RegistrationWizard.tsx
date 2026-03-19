import { useState, useEffect } from "react";
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
import { generateContractPdf } from "./pdf"; 
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

  // 1. Recupera o rascunho salvo ao abrir a tela
  useEffect(() => {
    const rascunho = localStorage.getItem("dmi_cadastro_rascunho");
    if (rascunho) {
      if (window.confirm("Notamos que você tem um cadastro em andamento. Deseja continuar de onde parou?")) {
        try {
          setData(JSON.parse(rascunho)); 
        } catch (e) {
          console.error("Erro ao ler rascunho");
        }
      } else {
        localStorage.removeItem("dmi_cadastro_rascunho");
      }
    }
  }, []);

  // 2. Salva automaticamente no LocalStorage a cada alteração
  useEffect(() => {
    if (data.titular.nomeCompleto || data.titular.cpf) {
      localStorage.setItem("dmi_cadastro_rascunho", JSON.stringify(data));
    }
  }, [data]);

  const handlePreviewContract = async (signatureBase64: string) => {
    try {
      toast.info("Gerando pré-visualização...", { id: "preview" });
      // Passamos a assinatura e os dados do form atual para gerar um PDF na hora
      const pdfBytes = await generateContractPdf(data, signatureBase64);
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank"); // Abre em nova aba
      toast.success("Pré-visualização aberta em nova aba!", { id: "preview" });
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000); // Limpa a memória
    } catch (error) {
      console.error("Erro ao gerar preview", error);
      toast.error("Erro ao gerar pré-visualização. Verifique os dados informados.", { id: "preview" });
    }
  };

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
              onPreview={handlePreviewContract}
              isSubmitting={isSubmitting}
            />
          )}
          {step === 7 && <Step6Sucesso onReset={handleReset} protocolo={protocolo} cpf={data.titular.cpf} />}
        </div>
      </main>
    </div>
  );
};

export default RegistrationWizard;
