import { CheckCircle2, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Step6Props {
  onReset: () => void;
  protocolo: string | null;
  id: string | null;
  // contractBlob retirado pois não é mais gerado aqui
}

const Step6Sucesso = ({ onReset, protocolo, id }: Step6Props) => {
  const linkAssinatura = id ? `${window.location.origin}/assinatura/${id}` : "";

  const copiarLink = () => {
    navigator.clipboard.writeText(linkAssinatura);
    toast.success("Link copiado para a área de transferência!");
  };

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

        {id && (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg w-full max-w-sm mx-auto space-y-3">
            <p className="text-sm font-medium text-gray-700">Link para o cliente assinar:</p>
            <div className="flex items-center gap-2 bg-white border rounded-md p-2">
              <input type="text" readOnly value={linkAssinatura} className="text-xs text-gray-500 bg-transparent flex-1 outline-none" />
            </div>
            <div className="flex gap-2">
              <Button onClick={copiarLink} variant="default" size="sm" className="w-full gap-2 bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 text-white">
                <Copy className="w-4 h-4" /> Copiar Link
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <a href={linkAssinatura} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Abrir
                </a>
              </Button>
            </div>
          </div>
        )}

        <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm border border-green-200 mt-4 flex items-start gap-3 text-left">
          <MessageCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Fique de olho no seu WhatsApp!</p>
            <p className="text-green-700 mt-1">
              Assim que o pagamento for confirmado, você receberá sua <strong>Carteirinha Digital</strong> e as instruções de acesso automaticamente por lá.
            </p>
          </div>
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
