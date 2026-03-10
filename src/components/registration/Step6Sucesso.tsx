import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step6Props {
  onReset: () => void;
  contractBlob: Blob | null;
}

const Step6Sucesso = ({ onReset, contractBlob }: Step6Props) => {
  const handleDownload = () => {
    if (!contractBlob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(contractBlob);
    link.download = `contrato-dmi.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center py-12 space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#64E627]/15 flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-[#64E627]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Pré-cadastro realizado!
        </h2>
        <p className="text-muted-foreground max-w-md">
          Seu pré-cadastro foi recebido com sucesso. Nossa equipe entrará em
          contato em breve para confirmar seus dados e ativar seu Cartão de
          Benefícios.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {contractBlob && (
          <Button onClick={handleDownload} size="lg">
            <Download className="w-4 h-4 mr-2" />
            Baixar Contrato
          </Button>
        )}
        <Button variant="outline" onClick={onReset} size="lg">
          Fazer novo cadastro
        </Button>
      </div>
    </div>
  );
};

export default Step6Sucesso;
