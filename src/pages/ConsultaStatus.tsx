import { useState } from "react";
import { Link } from "react-router-dom";
import { consultarStatusPorProtocolo } from "@/services/api";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Download, 
  Loader2,
  AlertCircle
} from "lucide-react";
import logoDmi from "@/assets/logo-dmi.png";

interface ConsultaResult {
  nome_completo: string;
  status: string;
  valor: string;
  downloadUrl?: string | null;
}

export default function ConsultaStatus() {
  const [protocolo, setProtocolo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState("");

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolo.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Formata para garantir que não tem espaços soltos
      const cleanProtocolo = protocolo.trim();
      const data = await consultarStatusPorProtocolo(cleanProtocolo);
      
      if (!data) {
        throw new Error("Protocolo não encontrado.");
      }
      
      setResult(data as ConsultaResult);
    } catch (err: any) {
      console.error(err);
      setError("Protocolo não encontrado. Verifique os números e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      {/* Header Simples */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <img src={logoDmi} alt="Cartão DMI" className="h-8 object-contain" />
          <div className="w-6" /> {/* Espaçador para centralizar a logo */}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Acompanhe seu Cadastro
            </h1>
            <p className="text-sm text-gray-500">
              Digite o número do protocolo gerado no final do seu cadastro para ver o status.
            </p>
          </div>

          {/* Card de Busca */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleConsultar} className="space-y-4">
              <div>
                <label htmlFor="protocolo" className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Protocolo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="protocolo"
                    value={protocolo}
                    onChange={(e) => setProtocolo(e.target.value)}
                    placeholder="Ex: 202310251234"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0EA5FF] focus:border-transparent transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !protocolo.trim()}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-black bg-[#64E627] hover:bg-[#52C51D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#64E627] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Consultar Status"
                )}
              </button>
            </form>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Resultado da Busca */}
          {result && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in zoom-in-95 duration-300">
              {/* Header do Resultado baseado no status */}
              <div className={`p-6 text-center border-b ${
                result.status === 'aprovado' ? 'bg-green-50 border-green-100' :
                result.status === 'rejeitado' ? 'bg-red-50 border-red-100' :
                'bg-amber-50 border-amber-100'
              }`}>
                <div className="flex justify-center mb-3">
                  {result.status === 'aprovado' && <CheckCircle2 className="w-12 h-12 text-green-500" />}
                  {result.status === 'rejeitado' && <XCircle className="w-12 h-12 text-red-500" />}
                  {result.status === 'pendente' && <Clock className="w-12 h-12 text-amber-500" />}
                </div>
                
                <h3 className={`text-xl font-bold uppercase tracking-wide ${
                  result.status === 'aprovado' ? 'text-green-700' :
                  result.status === 'rejeitado' ? 'text-red-700' :
                  'text-amber-700'
                }`}>
                  {result.status}
                </h3>
                
                <p className="text-sm mt-2 text-gray-600 font-medium">
                  {result.status === 'aprovado' && 'Parabéns! Seu cadastro foi finalizado com sucesso.'}
                  {result.status === 'rejeitado' && 'Houve um problema com o seu cadastro.'}
                  {result.status === 'pendente' && 'Seus dados estão em análise. Aguarde a confirmação do pagamento.'}
                </p>
              </div>

              {/* Detalhes */}
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Titular</p>
                  <p className="text-base font-bold text-gray-900">{result.nome_completo}</p>
                </div>
                
                {result.valor && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Valor do Plano</p>
                    <p className="text-base font-bold text-green-600">{result.valor}</p>
                  </div>
                )}

                {/* Botão de Download (Apenas se Aprovado e tiver Link) */}
                {result.status === 'aprovado' && result.downloadUrl && (
                  <div className="pt-4 mt-2 border-t border-gray-100">
                    <a
                      href={result.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Contrato PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
