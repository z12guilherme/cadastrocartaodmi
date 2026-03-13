import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Step6Props {
  onReset: () => void;
  protocolo: string | null;
  // contractBlob retirado pois não é mais gerado aqui
}

const Step6Sucesso = ({ onReset, protocolo }: Step6Props) => {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center py-12 space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#64E627]/15 flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-[#64E627]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Solicitação Enviada!
        </h2>
        <p className="text-muted-foreground max-w-md">
          Seus dados e assinatura foram recebidos. <br/>
          <span className="font-semibold text-foreground">Aguarde a confirmação do pagamento</span> para a liberação do seu contrato e carteirinha.
        </p>
        
        {protocolo && (
          <div className="my-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Seu número de protocolo:</p>
            <p className="text-3xl font-mono font-bold text-blue-800 tracking-wider select-all">{protocolo}</p>
            <p className="text-xs text-blue-500 mt-2">Guarde este número para consultar seu status</p>
          </div>
        )}

        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-200 mt-4 flex items-center gap-3 text-left">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p>Você receberá um contato da nossa equipe para finalizar a adesão.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        <Button variant="ghost" asChild>
            <Link to="/consulta">Consultar Status</Link>
        </Button>
        <Button variant="outline" onClick={onReset} size="lg">
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

export default Step6Sucesso;
