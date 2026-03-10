import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Step5Props {
  onConfirm: (signature: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const Step5Assinatura = ({ onConfirm, onBack, isSubmitting }: Step5Props) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handleConfirm = () => {
    if (sigPadRef.current?.isEmpty()) {
      toast.error("Por favor, forneça sua assinatura.");
      return;
    }
    const signature = sigPadRef.current?.toDataURL("image/png") as string;
    onConfirm(signature);
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

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} size="lg" disabled={isSubmitting}>
          Voltar
        </Button>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleClear} disabled={isSubmitting}>
            Limpar
          </Button>
          <Button onClick={handleConfirm} size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Assinar e Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step5Assinatura;