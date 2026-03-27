import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";



import { consultarStatusPorProtocolo } from "@/services/api";
import MaskedInput from "@/components/registration/MaskedInput";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Download, 
  Loader2,
  AlertCircle,
  CreditCard
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
  const navigate = useNavigate();

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolo.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Remove a formatação do CPF para buscar no banco
      const cleanProtocolo = protocolo.replace(/\D/g, "");
      
      // 1. Busca status real no SIGPAF (Fonte da Verdade)
      const { data: sigpafData } = await supabase.functions.invoke("check-status", {
        body: { cpf: cleanProtocolo }
      });

      // 2. Busca no banco local
      let localData: any = null;
      try {
        localData = await consultarStatusPorProtocolo(cleanProtocolo);
      } catch (err) {
        // Se não encontrar local, silencia o erro e segue para avaliar o SIGPAF
      }

      // 3. Validação de consistência (Se foi excluído no SIGPAF, cancela visualmente)
      if (sigpafData && sigpafData.existe === false && localData && localData.status === 'aprovado') {
        throw new Error("Este contrato foi cancelado ou excluído do sistema principal.");
      }

      // 4. Se o SIGPAF diz que o status é diferente de ATIVO (ex: CANCELADO, BLOQUEADO)
      if (sigpafData && sigpafData.existe && sigpafData.status && sigpafData.status.toUpperCase() !== 'ATIVO') {
         setResult({
           nome_completo: sigpafData.nome || localData?.nome_completo || "Cliente",
           status: 'rejeitado', // Força exibir a UI de erro/rejeitado
           valor: localData?.valor || "-",
         });
         setError(`Atenção: O status do seu plano no sistema é ${sigpafData.status.toUpperCase()}.`);
         return;
      }

      // Se não encontrou em nenhum lugar
      if (!localData && (!sigpafData || !sigpafData.existe)) {
        throw new Error("Protocolo ou CPF não encontrado.");
      }
      
      // Se chegou aqui, ou tá tudo certo no SIGPAF ou é pendente no local
      if (localData) {
        setResult(localData as ConsultaResult);
      } else if (sigpafData && sigpafData.existe) {
        setResult({
          nome_completo: sigpafData.nome || "Cliente",
          status: "aprovado",
          valor: "-",
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Protocolo não encontrado. Verifique os números e tente novamente.");
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
              Digite o seu CPF para consultar o status do seu plano e baixar o contrato.
            </p>
          </div>

          {/* Card de Busca */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleConsultar} className="space-y-4">
              <div>
                <label htmlFor="protocolo" className="block text-sm font-medium text-gray-700 mb-1">
                  CPF do Titular
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <MaskedInput
                    id="protocolo"
                    mask="000.000.000-00"
                    value={protocolo}
                    onAccept={(v) => setProtocolo(v)}
                    placeholder="000.000.000-00"
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
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col gap-3 animate-fade-in">
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-red-200/50">
                <Link to="/cadastro" className="text-sm text-[#0EA5FF] hover:underline font-medium">
                  Ainda não tem cadastro? Faça o seu agora
                </Link>
                <a href="https://wa.me/5581997488090?text=Olá,%20estou%20com%20problemas%20para%20consultar%20meu%20cadastro%20do%20Cartão%20DMI." target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline font-medium">
                  Problemas com seu CPF? Fale com o suporte no WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Resultado da Busca */}
          {result && (
            <div className="animate-fade-in zoom-in-95 duration-300">
              {result.status === 'aprovado' ? (
                <div className="space-y-6">
                  {/* Card de Sucesso */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-sm">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-800 mb-2">
                      Parabéns!
                    </h3>
                    <p className="text-green-700 font-medium">
                      Seu cadastro foi finalizado com sucesso.
                    </p>
                  </div>

                  {/* Card de Resumo e Ações */}
                  <div className="bg-white border shadow-sm rounded-2xl p-6 space-y-6">
                    
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-xl border">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Titular</p>
                        <p className="font-semibold text-gray-900 text-base">{result.nome_completo}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-xl border flex justify-between items-center">
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Valor do Plano</p>
                          <p className="font-semibold text-gray-900 text-base">{result.valor}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                      {/* Botão 1: Acessar Carteirinha (Ação Principal) */}
                      <button 
                        onClick={() => navigate(`/carteirinha/${protocolo.replace(/\D/g, '')}`)}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 transition-colors gap-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        Acessar Carteirinha Digital
                      </button>

                      {/* Botão 2: Baixar Contrato (Ação Secundária) */}
                      {result.downloadUrl && (
                        <a
                          href={result.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          Baixar Contrato Assinado
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className={`p-6 text-center border-b ${
                    result.status === 'rejeitado' ? 'bg-red-50 border-red-100' :
                    'bg-amber-50 border-amber-100'
                  }`}>
                    <div className="flex justify-center mb-3">
                      {result.status === 'rejeitado' && <XCircle className="w-12 h-12 text-red-500" />}
                      {result.status === 'pendente' && <Clock className="w-12 h-12 text-amber-500" />}
                    </div>
                    
                    <h3 className={`text-xl font-bold uppercase tracking-wide ${
                      result.status === 'rejeitado' ? 'text-red-700' :
                      'text-amber-700'
                    }`}>
                      {result.status}
                    </h3>
                    
                    <p className="text-sm mt-2 text-gray-600 font-medium">
                      {result.status === 'rejeitado' && 'Houve um problema com o seu cadastro.'}
                      {result.status === 'pendente' && 'Seus dados estão em análise. Aguarde a confirmação do pagamento.'}
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Titular</p>
                      <p className="text-base font-bold text-gray-900">{result.nome_completo}</p>
                    </div>
                    
                    {result.valor && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Valor do Plano</p>
                        <p className="text-base font-bold text-amber-600">{result.valor}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
