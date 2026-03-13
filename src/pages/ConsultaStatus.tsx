import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";
import { consultarStatusPorProtocolo } from "@/services/api";
import { toast } from "sonner";
import logoDmi from "@/assets/logo-dmi.png";

export default function ConsultaStatus() {
  const [protocolo, setProtocolo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolo.trim()) return;

    setLoading(true);
    setResultado(null);
    try {
      const data = await consultarStatusPorProtocolo(protocolo.trim());
      setResultado(data);
    } catch (error) {
      toast.error("Protocolo não encontrado ou inválido.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
       <header className="bg-card border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoDmi} alt="Cartão DMI" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-foreground text-lg leading-tight">
                Cartão DMI
              </h1>
              <p className="text-xs text-muted-foreground">Consulta de Status</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-lg mx-auto px-4 py-12 flex flex-col items-center">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Acompanhar Solicitação</h2>
            <p className="text-muted-foreground">Digite o número do protocolo recebido no cadastro.</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="Ex: 202310251234" 
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              className="text-lg font-mono tracking-wide"
            />
            <Button type="submit" disabled={loading} size="lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          {resultado && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{resultado.nome_completo}</h3>
                  <p className="text-sm text-muted-foreground">Protocolo: {protocolo}</p>
                </div>
                {resultado.status === 'aprovado' && <CheckCircle className="text-green-500 w-8 h-8" />}
                {resultado.status === 'pendente' && <Clock className="text-yellow-500 w-8 h-8" />}
                {resultado.status === 'rejeitado' && <XCircle className="text-red-500 w-8 h-8" />}
              </div>

              <div className="space-y-4">
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  resultado.status === 'aprovado' ? 'bg-green-50 text-green-800' :
                  resultado.status === 'pendente' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-red-50 text-red-800'
                }`}>
                  <div className="font-medium">
                    Status: <span className="uppercase">{resultado.status}</span>
                  </div>
                </div>

                {resultado.status === 'pendente' && (
                  <p className="text-sm text-muted-foreground">
                    Seu cadastro está em análise. Aguarde a confirmação do pagamento para a liberação do contrato.
                  </p>
                )}

                {resultado.status === 'aprovado' && resultado.downloadUrl && (
                  <div className="pt-2">
                    <Button className="w-full" asChild>
                      <a href={resultado.downloadUrl} target="_blank" rel="noreferrer">
                        <FileText className="w-4 h-4 mr-2" />
                        Baixar Contrato Assinado
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-8 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4"/> Voltar para o início
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
