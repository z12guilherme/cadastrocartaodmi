import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const SIGPAF_TOKEN = "a816aeb6-c724-44a7-882c-bc1d1ebf5f43";

export default function Carteirinha() {
  const navigate = useNavigate();
  const cpf = sessionStorage.getItem("dmi_carteirinha_cpf");
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CarteirinhaData | null>(null);
  const [sigpafStatus, setSigpafStatus] = useState<SigpafStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!cpf) {
        navigate("/consulta");
        return;
      }

      const cpfLimpo = cpf.replace(/\D/g, "");

      try {
        // 1. A FONTE DA VERDADE: Buscar direto na API do SIGPAF (Bypass Edge Function)
        const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        
        const response = await fetch(`https://api.sigpaf.com.br/public/Pessoa?cpf=${encodeURIComponent(cpfFormatado)}&_t=${Date.now()}`, {
          method: 'GET',
          headers: { 
            'authorization': SIGPAF_TOKEN,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`Falha na comunicação com o sistema principal (HTTP ${response.status})`);
        }

        const sigpafRaw = await response.json();

        // 2. VALIDAÇÃO RÍGIDA: Se o SIGPAF disser que não existe, a sessão é inválida.
        if (sigpafRaw.erro || sigpafRaw.existe === false || !sigpafRaw.dados || Object.keys(sigpafRaw.dados).length === 0) {
          localStorage.removeItem(`carteirinha_${cpfLimpo}`); // Limpa o cache inválido
          setData(null); // Limpa os dados da tela
          throw new Error(sigpafRaw.msg || "Cadastro não encontrado no sistema principal.");
        }

        const situacao = sigpafRaw.dados.pessoaSituacao;
        const isAtivo = situacao ? situacao.psi_codigo === 1 : false;

        if (!isAtivo) {
          localStorage.removeItem(`carteirinha_${cpfLimpo}`); // Limpa o cache inválido
          setData(null); // Limpa os dados da tela
          const statusMsg = situacao?.psi_descricao ? `'${situacao.psi_descricao.toUpperCase()}'` : "INATIVO";
          throw new Error(`Acesso Bloqueado: O status do seu plano é ${statusMsg}.`);
        }

        const sigpafData: SigpafStatus = {
          existe: true,
          status: "ATIVO",
          corHex: situacao?.psi_corhex || "#008040",
          contrato: sigpafRaw.dados.pes_contrato || sigpafRaw.dados.pes_codigo,
          nome: sigpafRaw.dados.pes_nome,
          dataCadastro: sigpafRaw.dados.pes_dtcadastro
        };

        // 3. SUCESSO: Se chegou aqui, o cliente está ATIVO. Atualiza os dados.
        setSigpafStatus(sigpafData);

        // 4. Busca dados complementares (dependentes) do nosso banco.
        const localData = await buscarDadosCarteirinha(cpf).catch(() => null);
        if (localData) {
          setData(localData);
          localStorage.setItem(`carteirinha_${cpfLimpo}`, JSON.stringify(localData));
        } else {
          // Cliente legado do SIGPAF (ou cliente que foi excluído do painel local).
          // Como a fonte da verdade é o SIGPAF, montamos os dados limpos com o que vier de lá!
          const fallbackData: CarteirinhaData = {
            nome_completo: sigpafData.nome || "BENEFICIÁRIO",
            cpf: cpfLimpo,
            status: "aprovado",
            created_at: sigpafData.dataCadastro || new Date().toISOString(),
            protocolo: sigpafData.contrato?.toString()
          };
          setData(fallbackData);
          localStorage.setItem(`carteirinha_${cpfLimpo}`, JSON.stringify(fallbackData));
        }
      } catch (err) {
        // OFFLINE-FIRST: Se a validação online falhar (ex: sem internet),
        // tentamos carregar a última versão válida do cache.
        const isNetworkError = err instanceof TypeError;
        const cachedData = localStorage.getItem(`carteirinha_${cpfLimpo}`);

        if (isNetworkError && cachedData) {
          try {
            setData(JSON.parse(cachedData));
            // Opcional: Adicionar um aviso de que os dados são offline.
          } catch (e) {
            setError("Não foi possível carregar os dados. Verifique sua conexão.");
          }
        } else {
          // Se o erro não for de rede, ou se não houver cache, mostramos o erro real.
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cpf, navigate]);

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

  // Prioriza a data do nosso banco, mas usa a do SIGPAF se for um cliente legado
  const dataDeOrigem = data?.created_at || sigpafStatus?.dataCadastro;

  if (dataDeOrigem) {
    const dataCriacao = new Date(dataDeOrigem);
    const validade = new Date(dataCriacao.setFullYear(dataCriacao.getFullYear() + 1));
    dataFormatada = validade.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });
  }

  // Prioriza o campo `dependentes` (JSONB), com fallback para o campo legado `observacoes` (TEXT).
  let dependentes: NonNullable<CarteirinhaData['dependentes']> = [];
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
  // PRIORIDADE: O número do contrato no nosso banco (data.protocolo) é mais confiável
  // do que o do SIGPAF, que pode ser um código de pessoa genérico.
  // Mantemos a consulta ao SIGPAF como fonte da verdade para o STATUS, mas usamos nosso
  // número de contrato para exibição.
  const contratoFinal = data?.protocolo || sigpafStatus?.contrato || cpf;
  
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
              {dependentes.map((dep, idx: number) => (
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