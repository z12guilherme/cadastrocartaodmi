import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarDadosCarteirinha } from "@/services/api";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import logoDmi from "@/assets/logo-dmi.png";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";

interface CarteirinhaData {
  nome_completo: string;
  cpf: string;
  status: string;
  created_at: string;
  observacoes?: string; // Campo legado para dependentes
  dependentes?: {      // Novo campo estruturado (JSONB)
    nomeCompleto: string;
    parentesco: string;
    cpf: string;
  }[];
  protocolo?: string;
}

interface SigpafStatus {
  existe: boolean;
  status?: string;
  corHex?: string;
  contrato?: string | number;
  nome?: string;
  msg?: string;
  dataCadastro?: string;
}

export default function Carteirinha() {
  const { cpf } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CarteirinhaData | null>(null);
  const [sigpafStatus, setSigpafStatus] = useState<SigpafStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!cpf) return;
      
      const cpfLimpo = cpf.replace(/\D/g, "");
      let localData = null;

      // 1. Tenta carregar do cache primeiro (Offline-First)
      const cachedData = localStorage.getItem(`carteirinha_${cpfLimpo}`);
      if (cachedData) {
        try {
          localData = JSON.parse(cachedData);
          setData(localData);
        } catch (e) {}
      }

      try {
        // 2. Busca o status em tempo real no SIGPAF via Edge Function SEMPRE
        const { data: sigpafData, error: sigpafError } = await supabase.functions.invoke("check-status", {
          body: { cpf: cpfLimpo }
        });

        if (!sigpafError && sigpafData) {
          setSigpafStatus(sigpafData);
        } else if (sigpafError) {
          console.error("Erro na Edge Function check-status:", sigpafError);
        } else if (sigpafData && sigpafData.error) {
          console.error("Erro retornado pelo SIGPAF:", sigpafData.error);
        }

        // 3. Tenta buscar no banco local para pegar dependentes e outros detalhes (se houver)
        try {
          const result = await buscarDadosCarteirinha(cpf);
          localData = result;
          setData(result);
          localStorage.setItem(`carteirinha_${cpfLimpo}`, JSON.stringify(result));
        } catch (localErr) {
          console.log("Cliente não localizado no banco novo. Usando os dados legado do SIGPAF.");
        }

        // 4. Validação: Se não tem no Supabase E não existe no SIGPAF = Erro!
        if (!localData && (!sigpafData || !sigpafData.existe)) {
           if (sigpafError) {
             setError(`Erro Supabase: ${sigpafError.message || "Falha na Edge Function"}`);
           } else if (sigpafData && sigpafData.error) {
             setError(`Erro Interno: ${sigpafData.error}`);
           } else {
             setError(sigpafData?.msg || "Carteirinha não encontrada. Verifique o CPF informado no sistema.");
           }
        }

      } catch (err) {
        console.error("Erro ao buscar carteirinha:", err);
        if (!localData) setError("Erro de conexão ao buscar dados. Verifique sua internet.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cpf]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (error || (!data && !sigpafStatus?.existe)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="text-[#0EA5FF] font-semibold hover:underline">
          Voltar ao Início
        </Link>
      </div>
    );
  }

  // Calcula validade ou exibe "Membro Desde" para legados do SIGPAF
  let dataFormatada = "Conforme Contrato";
  let labelData = "Validade";

  if (data?.created_at) {
    const dataCriacao = new Date(data.created_at);
    const validade = new Date(dataCriacao.setFullYear(dataCriacao.getFullYear() + 1));
    dataFormatada = validade.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });
  } else if (sigpafStatus?.dataCadastro) {
    const dtCad = new Date(sigpafStatus.dataCadastro);
    dataFormatada = dtCad.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });
    labelData = "Membro Desde";
  }

  // Prioriza o campo `dependentes` (JSONB), com fallback para o campo legado `observacoes` (TEXT).
  let dependentes: any[] = [];
  if (data?.dependentes && Array.isArray(data.dependentes) && data.dependentes.length > 0) {
    dependentes = data.dependentes;
  } else {
    try {
      if (data?.observacoes && data.observacoes.startsWith("[")) {
        dependentes = JSON.parse(data.observacoes);
      }
    } catch (e) {
      console.warn("Não foi possível parsear os dependentes do campo legado 'observacoes'.");
      // Silently ignore
    }
  }

  const isLocalAtivo = data?.status === "aprovado";
  const isSigpafAtivo = sigpafStatus?.status === "ATIVO";
  const contratoFinal = sigpafStatus?.contrato || data?.protocolo || cpf;
  
  const nomeExibicao = sigpafStatus?.nome || data?.nome_completo || "BENEFICIÁRIO";
  const cpfFormatado = cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const cpfExibicao = data?.cpf || cpfFormatado;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-800">Carteirinha Digital</h1>
          <div className="w-9" />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-6">
          {sigpafStatus ? (
            <span 
              className="px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border transition-colors"
              style={{ 
                backgroundColor: `${sigpafStatus.corHex || '#808080'}15`, 
                color: sigpafStatus.corHex || '#808080',
                borderColor: `${sigpafStatus.corHex || '#808080'}40`
              }}
            >
              {isSigpafAtivo ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {sigpafStatus.status}
            </span>
          ) : (
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm
              ${isLocalAtivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <ShieldCheck className="w-4 h-4" />
              {isLocalAtivo ? 'PLANO ATIVO (LOCAL)' : 'PLANO INATIVO'}
            </span>
          )}
        </div>

        {/* Cartão Físico (UI) */}
        <div className="relative w-full aspect-[1.58/1] rounded-2xl shadow-xl overflow-hidden text-white transition-all hover:scale-[1.02] duration-300"
             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          
          {/* Overlay Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          
          <div className="relative h-full p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <img src={logoDmi} alt="DMI" className="h-10 brightness-0 invert" />
              
              {/* QR Code com Blur condicional se inativo */}
              <div className="relative bg-white p-2 rounded-xl shadow-sm">
                <div className={`transition-all duration-300 ${sigpafStatus && !isSigpafAtivo ? 'opacity-30 blur-[2px]' : ''}`}>
                  <QRCode 
                    value={String(contratoFinal)} 
                    size={72}
                    level="H" 
                  />
                </div>
                {sigpafStatus && !isSigpafAtivo && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest transform -rotate-12 shadow-md">
                      BLOQUEADO
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Titular do Plano</p>
                  <p className="text-lg font-bold tracking-wide truncate">{nomeExibicao.toUpperCase()}</p>
                </div>
                {contratoFinal && contratoFinal !== cpfExibicao?.replace(/\D/g, "") && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[#0EA5FF] font-bold uppercase tracking-widest mb-1">Nº Contrato</p>
                    <p className="text-lg font-mono tracking-wider font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm">{contratoFinal}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">CPF</p>
                  <p className="font-mono text-sm tracking-wider opacity-90">{cpfExibicao}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{labelData}</p>
                  <p className="font-mono text-sm tracking-wider opacity-90">{dataFormatada}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aba de Dependentes */}
        {dependentes.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0EA5FF]" /> 
              Dependentes Inclusos ({dependentes.length})
            </h3>
            <div className="space-y-3">
              {dependentes.map((dep: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-bold text-sm text-slate-700">{dep.nomeCompleto}</p>
                    <p className="text-xs text-slate-500 capitalize">{dep.parentesco}</p>
                  </div>
                  <p className="text-xs font-mono text-slate-400">{dep.cpf}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Apresente esta tela na recepção junto com um documento oficial com foto.
        </p>
      </div>
    </div>
  );
}