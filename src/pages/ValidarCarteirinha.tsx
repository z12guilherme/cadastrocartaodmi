import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarDadosCarteirinha } from "@/services/api";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ValidarCarteirinha() {
  const { cpf } = useParams();
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [userData, setUserData] = useState<{ nome: string; contrato: string } | null>(null);

  useEffect(() => {
    const validate = async () => {
      if (!cpf) {
        setIsValid(false);
        setMessage("Credencial inválida. CPF não fornecido.");
        setLoading(false);
        return;
      }

      const cpfLimpo = cpf.replace(/\D/g, "");

      try {
        // 1. Validação na Edge Function segura do SigPAF
        const { data: sigpafRaw, error: functionError } = await supabase.functions.invoke('check-status', {
          body: { cpf: cpfLimpo },
        });

        if (functionError) throw functionError;

        if (sigpafRaw.error || sigpafRaw.existe === false) {
          setIsValid(false);
          setMessage("Cadastro não encontrado no sistema.");
          return;
        }

        const isAtivo = sigpafRaw.status === "ATIVO";

        if (!isAtivo) {
          setIsValid(false);
          setMessage(`Acesso Bloqueado. Status do plano no sistema: ${sigpafRaw.status || 'Desativado'}`);
          return;
        }

        // 2. Validação local (API/Backend Local)
        const localData = await buscarDadosCarteirinha(cpfLimpo).catch(() => null);

        if (!localData || localData.status !== 'aprovado') {
          setIsValid(false);
          setMessage("Problema com o cadastro local. Contate a administração.");
          return;
        }

        setUserData({
          nome: sigpafRaw.nome || localData.nome_completo || "Não informado",
          contrato: localData.protocolo || sigpafRaw.contrato || cpfLimpo,
        });
        setIsValid(true);
        setMessage("Carteirinha ativa e apta para uso.");

      } catch (err: any) {
        setIsValid(false);
        setMessage(err.message || "Erro de conexão ao validar cliente. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [cpf]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#0EA5FF] mb-4" />
        <p className="text-slate-500 font-medium">Validando credencial da carteirinha...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
        
        {/* Cabeçalho de Status */}
        <div className={`p-10 text-center transition-colors duration-500 ${isValid ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              {isValid ? (
                <ShieldCheck className="w-16 h-16 text-white" />
              ) : (
                <ShieldAlert className="w-16 h-16 text-white" />
              )}
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mb-3 tracking-tight">
            {isValid ? "Cliente DMI Válido" : "Cliente DMI Desativado"}
          </h2>
          <p className="text-white/90 text-[15px] leading-relaxed font-medium">
            {isValid ? "Acesso liberado. A situação deste plano está completamente regular." : message}
          </p>
        </div>

        {/* Dados do Cliente Puxados da API */}
        {isValid && userData && (
          <div className="p-8 space-y-5 bg-white">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1.5">Titular Verificado</p>
              <p className="text-slate-800 font-bold text-lg leading-tight">{userData.nome.toUpperCase()}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1.5">Identificação</p>
              <p className="text-slate-800 font-mono font-bold text-lg tracking-wider">{userData.contrato}</p>
            </div>
          </div>
        )}

        <div className="p-8 pt-4 bg-white">
          <Link to="/" className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all hover:scale-[1.02] shadow-sm">
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Sistema
          </Link>
        </div>
      </div>
    </div>
  );
}
