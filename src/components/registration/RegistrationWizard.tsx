import { useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import Step1Titular from "./Step1Titular";
import Step2Documentos from "./Step2Documentos";
import Step3Dependentes from "./Step3Dependentes";
import Step4Resumo from "./Step4Resumo";
import Step5Sucesso from "./Step5Sucesso";
import {
  RegistrationData,
  initialTitular,
  initialDocumentos,
} from "@/types/registration";
import logoDmi from "@/assets/logo-dmi.png";

const RegistrationWizard = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    titular: initialTitular,
    documentos: initialDocumentos,
    dependentes: [],
  });

  const handleConfirm = () => {
    console.log("=== PAYLOAD PRÉ-CADASTRO ===");
    console.log(JSON.stringify(data, null, 2));
    setStep(5);
  };

  const handleReset = () => {
    setData({
      titular: initialTitular,
      documentos: initialDocumentos,
      dependentes: [],
    });
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
        {step < 5 && <ProgressBar currentStep={step} totalSteps={4} />}

        <div className={step < 5 ? "wizard-card" : ""}>
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
              onConfirm={handleConfirm}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && <Step5Sucesso onReset={handleReset} />}
        </div>
      </main>
    </div>
  );
};

export default RegistrationWizard;
