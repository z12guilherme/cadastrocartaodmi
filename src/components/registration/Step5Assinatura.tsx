import { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Step5Props {
  onConfirm: (signature: string) => void;
  onBack: () => void;
  onPreview: (signature: string) => void;
  isSubmitting: boolean;
  data?: any; // Adicionado para receber os dados do resumo do cadastro
}

const Step5Assinatura = ({ onConfirm, onBack, onPreview, isSubmitting, data }: Step5Props) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  // Resolve o problema da proporção do canvas ao assinar pelo celular
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigPadRef.current) {
        const canvas = sigPadRef.current.getCanvas();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        sigPadRef.current.clear();
      }
    };
    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 50); // Garante que a div renderizou na tela

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

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
        Confira seus dados e assine abaixo
      </p>

      {/* Resumo do Contrato */}
      {data && (
        <div className="bg-secondary/50 border border-border p-4 rounded-xl space-y-3">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Titular</span>
            <p className="font-bold text-foreground">{data.titular?.nomeCompleto || data.nomeCompleto}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">CPF</span>
              <p className="font-medium text-foreground">{data.titular?.cpf || data.cpf}</p>
            </div>
            {/* Mostra o valor do plano dinamicamente */}
            {(data.plano?.valor || data.valor) && (
              <div className="sm:text-right">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor do Plano</span>
                <p className="font-bold text-green-600">{data.plano?.valor || data.valor}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Sua Assinatura</label>
        <div className="w-full aspect-video bg-secondary rounded-lg border-2 border-dashed">
          <SignatureCanvas
            ref={sigPadRef}
            penColor="black"
            canvasProps={{ className: "w-full h-full" }}
          />
        </div>
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
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirmar Assinatura
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step5Assinatura;