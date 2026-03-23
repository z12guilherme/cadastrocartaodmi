import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Step5Props {
  onConfirm: (signature: string) => void;
  onBack: () => void;
  onPreview: (signature: string) => void;
  isSubmitting: boolean;
}

const Step5Assinatura = ({ onConfirm, onBack, onPreview, isSubmitting }: Step5Props) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handlePreview = () => {
    if (sigPadRef.current?.isEmpty()) {
      toast.error("Por favor, assine no campo abaixo antes de pré-visualizar o contrato.");
      return;
    }
    const signature = sigPadRef.current?.toDataURL("image/png") as string;
    onPreview(signature);
  };

  const handleConfirm = () => {
    if (sigPadRef.current?.isEmpty()) {
      toast.error("Por favor, forneça sua assinatura.");
      return;
    }
    const signature = sigPadRef.current?.toDataURL("image/png") as string;
    onConfirm(signature);
  };

  const handleSkip = () => {
    onConfirm(""); // Passa string vazia para salvar o cadastro sem a assinatura
  };

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Assinatura Digital</h2>
      <p className="text-sm text-muted-foreground">
        Desenhe sua assinatura no campo abaixo para confirmar o contrato.
      </p>

      <div className="w-full aspect-video bg-secondary rounded-lg border-2 border-dashed">
        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          canvasProps={{ className: "w-full h-full" }}
        />
      </div>
      
      <div className="flex justify-end mt-1">
        <button type="button" onClick={handleClear} disabled={isSubmitting} className="text-sm text-red-500 hover:text-red-700 font-medium">
          Limpar Assinatura
        </button>
      </div>

      <div className="pt-6 space-y-6">
        {/* Botões de Ação Alternativa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleSkip} disabled={isSubmitting} className="w-full text-[#0EA5FF] border-[#0EA5FF] hover:bg-[#0EA5FF]/10 bg-transparent" size="lg">
            Gerar Link para Cliente
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={isSubmitting} className="w-full" size="lg">
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar Contrato
          </Button>
        </div>

        {/* Botões de Navegação Principal */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} size="lg" disabled={isSubmitting} className="w-full sm:w-32">
            Voltar
          </Button>
          <Button onClick={handleConfirm} size="lg" disabled={isSubmitting} className="w-full sm:w-48 bg-[#64E627] hover:bg-[#52c51d] text-black font-bold shadow-sm">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step5Assinatura;