import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarDadosCarteirinha } from "@/services/api";
import { ShieldCheck, QrCode, Loader2, AlertCircle, ArrowLeft, Users } from "lucide-react";
import logoDmi from "@/assets/logo-dmi.png";

interface CarteirinhaData {
  nome_completo: string;
  cpf: string;
  status: string;
  created_at: string;
  observacoes: string;
  protocolo?: string;
}

export default function Carteirinha() {
  const { cpf } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CarteirinhaData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!cpf) return;
      try {
        const result = await buscarDadosCarteirinha(cpf);
        setData(result);
      } catch (err) {
        setError("Carteirinha não encontrada. Verifique o link.");
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

  if (error || !data) {
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

  // Calcula validade (1 ano após a criação)
  const dataCriacao = new Date(data.created_at);
  const validade = new Date(dataCriacao.setFullYear(dataCriacao.getFullYear() + 1));
  const dataFormatada = validade.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });

  let dependentes = [];
  try {
    if (data.observacoes && data.observacoes.startsWith("[")) {
      dependentes = JSON.parse(data.observacoes);
    }
  } catch (e) {
    // Silently ignore
  }

  const isAtivo = data.status === "aprovado";

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
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm
            ${isAtivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <ShieldCheck className="w-4 h-4" />
            {isAtivo ? 'PLANO ATIVO' : 'PLANO INATIVO'}
          </span>
        </div>

        {/* Cartão Físico (UI) */}
        <div className="relative w-full aspect-[1.58/1] rounded-2xl shadow-xl overflow-hidden text-white transition-all hover:scale-[1.02] duration-300"
             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          
          {/* Overlay Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          
          <div className="relative h-full p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <img src={logoDmi} alt="DMI" className="h-10 brightness-0 invert" />
              <QrCode className="w-8 h-8 opacity-80" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Titular do Plano</p>
                  <p className="text-lg font-bold tracking-wide truncate">{data.nome_completo.toUpperCase()}</p>
                </div>
                {data.protocolo && data.status === 'aprovado' && data.protocolo !== data.cpf.replace(/\D/g, "") && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[#0EA5FF] font-bold uppercase tracking-widest mb-1">Nº Contrato</p>
                    <p className="text-lg font-mono tracking-wider font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm">{data.protocolo}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">CPF</p>
                  <p className="font-mono text-sm tracking-wider opacity-90">{data.cpf}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Validade</p>
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