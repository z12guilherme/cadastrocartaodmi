import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ["Dados", "Documentos", "Dependentes", "Resumo", "Assinatura"];

const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted
                    ? "bg-[#64E627] text-black"
                    : isCurrent
                    ? "bg-[#0EA5FF] text-white shadow-md"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium ${
                  isCurrent ? "text-[#0EA5FF]" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
        <div
          className="bg-[#0EA5FF] h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
