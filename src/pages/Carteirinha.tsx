import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buscarDadosCarteirinha } from "@/services/api";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import logoDmi from "@/assets/logodmi-nova.jpg";
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
    dataNascimento?: string;
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

const LogoCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoDmi;
    img.onload = () => {
      // Define a altura base (40px é o equivalente ao h-10 do Tailwind)
      const height = 40;
      const ratio = img.width / img.height;
      const width = height * ratio;

      // Suporte para telas de alta resolução (Retina/High DPI)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, width, height);

      // Manipulação dos pixels para transformar o fundo claro em transparente e o logo em branco
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calcula a luminância original do pixel
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // Multiplicador (* 5) garante que partes coloridas (como azul)
          // fiquem 100% opacas, deixando transparente apenas o que for de fato o fundo branco
          let alpha = (255 - luminance) * 5;
          if (alpha > 255) alpha = 255;
          if (alpha < 0) alpha = 0;

          // Mantém as cores originais, aplica apenas transparência no fundo claro
          data[i + 3] = alpha; // Aplica o Alpha turbinado
        }

        ctx.putImageData(imageData, 0, 0);
      } catch (err) {
        console.error("Erro ao manipular pixels do canvas:", err);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="block" title="DMI" />;
};

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
        // 1. A FONTE DA VERDADE: Chamar nossa Edge Function segura.
        const { data: sigpafRaw, error: functionError } = await supabase.functions.invoke('check-status', {
          body: { cpf: cpfLimpo },
        });

        if (functionError) {
          throw functionError;
        }

        // 2. VALIDAÇÃO RÍGIDA: Se a função disser que não existe, a sessão é inválida.
        if (sigpafRaw.error || sigpafRaw.existe === false) {
          localStorage.removeItem(`carteirinha_${cpfLimpo}`); // Limpa o cache inválido
          setData(null); // Limpa os dados da tela
          throw new Error(sigpafRaw.msg || sigpafRaw.error || "Cadastro não encontrado no sistema principal.");
        }

        const isAtivo = sigpafRaw.status === "ATIVO";

        if (!isAtivo) {
          localStorage.removeItem(`carteirinha_${cpfLimpo}`); // Limpa o cache inválido
          setData(null); // Limpa os dados da tela
          const statusMsg = sigpafRaw.status ? `'${sigpafRaw.status.toUpperCase()}'` : "INATIVO";
          throw new Error(`Acesso Bloqueado: O status do seu plano é ${statusMsg}.`);
        }

        // A interface da Edge Function (StatusData) é compatível com a SigpafStatus
        const sigpafData: SigpafStatus = {
          ...sigpafRaw,
          corHex: sigpafRaw.corHex || "#008040", // Garante um fallback
        };

        // 3. SUCESSO: Se chegou aqui, o cliente está ATIVO. Atualiza os dados.
        setSigpafStatus(sigpafData);

        // 4. Busca dados complementares (dependentes) do nosso banco.
        const localData = await buscarDadosCarteirinha(cpfLimpo).catch(() => null);

        // PERMITE USUÁRIOS ANTIGOS DO SIGPAF:
        // Se não existir localmente (localData nulo), usamos os dados retornados do SIGPAF.
        // Bloqueia APENAS se existir no banco local e estiver com status diferente de 'aprovado'.
        if (localData && localData.status !== 'aprovado') {
          localStorage.removeItem(`carteirinha_${cpfLimpo}`);
          setData(null);
          throw new Error("Seu cadastro foi inativado ou está pendente em nosso sistema.");
        }

        setData(localData);
        localStorage.setItem(`carteirinha_${cpfLimpo}`, JSON.stringify(localData));
      } catch (err) {
        // SEGURANÇA PRIMEIRO: Em caso de QUALQUER erro na validação online, o acesso é bloqueado.
        // Não usamos mais o cache como fallback para evitar exibir dados desatualizados e inválidos.
        setError((err as Error).message);
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
        <div className="relative w-full aspect-[1.58/1] rounded-2xl shadow-md border border-slate-200 overflow-hidden text-slate-800 transition-all hover:scale-[1.02] duration-300"
          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>

          {/* Overlay Pattern */}
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-300 to-transparent" />

          <div className="relative h-full p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <LogoCanvas />

              {/* QR Code com Blur condicional se inativo */}
              <div className="relative bg-white p-2 rounded-xl shadow-sm">
                <div className={`transition-all duration-300 ${sigpafStatus && !isSigpafAtivo ? 'opacity-30 blur-[2px]' : ''}`}>
                  <QRCode
                    value={`${window.location.origin}/validar/${cpfExibicao?.replace(/\D/g, "")}`}
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
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Titular do Plano</p>
                  <p className="text-lg font-bold tracking-wide truncate text-slate-800">{nomeExibicao.toUpperCase()}</p>
                </div>
                {contratoFinal && contratoFinal !== cpfExibicao?.replace(/\D/g, "") && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-[#0EA5FF] font-bold uppercase tracking-widest mb-1">Nº Contrato</p>
                    <p className="text-lg font-mono tracking-wider font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">{contratoFinal}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">CPF</p>
                  <p className="font-mono text-sm tracking-wider font-medium text-slate-700">{cpfExibicao}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{labelData}</p>
                  <p className="font-mono text-sm tracking-wider font-medium text-slate-700">{dataFormatada}</p>
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