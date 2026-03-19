import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, FileText, Image as ImageIcon, User, Loader2, Check, AlertTriangle, Search, Users, Clock, CheckCircle, LogOut, Eye, ChevronLeft, ChevronRight, Copy, TrendingUp, CreditCard, ExternalLink, Download } from 'lucide-react';
import { generateContractPdf } from '@/components/registration/pdf';
import { RegistrationData } from '@/types/registration';
import { toast } from 'sonner';

interface Inscricao {
  id: string;
  created_at: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  valor?: string;
  status: string;
  foto_url: string; // Caminho do RG
  anexo_documento_url: string; // Caminho do Contrato
  assinatura_url?: string; // Caminho da Assinatura
  comprovante_pagamento_url?: string;
  observacoes: string;
  naturalidade?: string;
  estado_civil?: string;
  cargo?: string;
  metodo_pagamento?: string;
  dia_vencimento?: string;
  protocolo?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | undefined>('');
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados'>('pendentes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    // 1. Verifica a sessão logo ao montar o componente
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login', { replace: true });
        return;
      }
      
      setUserEmail(session.user.email);
      fetchInscricoes(); // Só busca os dados se estiver logado
    };

    checkAuthAndLoad();

    // 2. Desloga e expulsa o usuário automaticamente se a sessão expirar
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/admin/login', { replace: true });
      }
    });

    const channel = supabase
      .channel('inscricoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inscricoes' },
        (payload) => {
          setInscricoes((prev) => [payload.new as Inscricao, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inscricoes' },
        (payload) => {
          setInscricoes((prev) => prev.map((i) => (i.id === payload.new.id ? (payload.new as Inscricao) : i)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'inscricoes' },
        (payload) => {
          setInscricoes((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // 3. Logout Automático por inatividade (15 minutos)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const performLogout = async () => {
      await supabase.auth.signOut();
      navigate('/admin/login', { replace: true });
      toast.info('Sessão encerrada por inatividade para sua segurança.', { duration: 6000 });
    };
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(performLogout, 15 * 60 * 1000); // 15 minutos
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicia na montagem
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  // Busca URLs assinadas quando um usuário é selecionado
  useEffect(() => {
    if (selectedInscricao) {
      const loadImages = async () => {
        const pathsToSign: { key: string; path: string }[] = [];
        
        if (selectedInscricao.foto_url) pathsToSign.push({ key: 'rg', path: selectedInscricao.foto_url });
        if (selectedInscricao.anexo_documento_url) pathsToSign.push({ key: 'contrato', path: selectedInscricao.anexo_documento_url });

        // Tenta buscar a residência baseado no padrão de caminho (cpf/residencia.jpg)
        const cleanCpf = selectedInscricao.cpf.replace(/\D/g, "");
        pathsToSign.push({ key: 'residencia', path: `${cleanCpf}/residencia.jpg` });

        // Assinatura
        if (selectedInscricao.assinatura_url) pathsToSign.push({ key: 'assinatura', path: selectedInscricao.assinatura_url });

        // Comprovante Pagamento
        if (selectedInscricao.comprovante_pagamento_url) pathsToSign.push({ key: 'comprovantePagamento', path: selectedInscricao.comprovante_pagamento_url });

        // Tenta buscar imagens dos dependentes se houver JSON nas observações
        if (selectedInscricao.observacoes && selectedInscricao.observacoes.startsWith('[')) {
          try {
            const deps = JSON.parse(selectedInscricao.observacoes);
            deps.forEach((dep: any, index: number) => {
              if (dep.fotoDocumento) pathsToSign.push({ key: `dep_${index}`, path: dep.fotoDocumento });
            });
          } catch (e) {
            console.error('Erro ao processar imagens de dependentes:', e);
          }
        }

        const paths = pathsToSign.map(p => p.path);
        if (paths.length === 0) return;

        // 🚀 OTIMIZAÇÃO: Batch Request - Pede todos os links de uma só vez (1 requisição ao invés de várias)
        const { data, error } = await supabase.storage.from('documentos').createSignedUrls(paths, 3600);

        if (data && !error) {
          const urls: { [key: string]: string } = {};
          data.forEach((item, index) => {
            if (item.signedUrl) urls[pathsToSign[index].key] = item.signedUrl;
          });
          setImageUrls(urls);
        }
      };
      loadImages();
    }
  }, [selectedInscricao]);

  const fetchInscricoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inscricoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar inscrições:', error);
    } else {
      setInscricoes(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  // Função auxiliar para converter Blob para Base64 (necessário para o gerador de PDF)
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleUpdateStatus = async (id: string, status: 'aprovado' | 'pendente') => {
    setIsSubmitting(true);

    let updateData: any = { status };

    // SE FOR APROVAR: Gerar Contrato
    if (status === 'aprovado' && selectedInscricao) {
        try {
            if (!selectedInscricao.assinatura_url) {
                throw new Error("Assinatura do cliente não encontrada.");
            }

            // 1. Baixar a imagem da assinatura
            const { data: sigBlob, error: sigError } = await supabase.storage
                .from('documentos')
                .download(selectedInscricao.assinatura_url);
            
            if (sigError || !sigBlob) throw new Error("Erro ao baixar assinatura para gerar contrato.");
            
            const sigBase64 = await blobToBase64(sigBlob);

            // 2. Montar objeto RegistrationData para o gerador de PDF
            // Precisamos reconstruir a estrutura que o PDF espera
            const regData: RegistrationData = {
                titular: {
                    nomeCompleto: selectedInscricao.nome_completo,
                    cpf: selectedInscricao.cpf,
                    rg: selectedInscricao.rg,
                    dataNascimento: selectedInscricao.data_nascimento, // formato YYYY-MM-DD funciona no PDF? O pdf.ts usa JSON.stringify, mas vamos checar.
                    // O pdf.ts usa apenas nome e CPF visíveis, o resto é hash.
                    // Mas para garantir integridade, passamos o que temos.
                    naturalidade: selectedInscricao.naturalidade || '',
                    estadoCivil: selectedInscricao.estado_civil || '',
                    profissao: selectedInscricao.cargo || '',
                    telefone: selectedInscricao.telefone,
                    email: selectedInscricao.email,
                    // Endereço no banco é string única, no PDF não é usado explicitamente nos campos de texto desenhados (apenas Hash), 
                    // mas vamos passar campos vazios obrigatórios para satisfazer o TS
                    cep: '', logradouro: selectedInscricao.endereco, numero: '', bairro: '', cidade: '', uf: ''
                },
                documentos: { fotoRg: '', fotoComprovanteResidencia: '' }, // Não usado no PDF
                dependentes: [] // Não usado no PDF atual (só titular assina)
            };

            // 3. Gerar PDF
            const pdfBytes = await generateContractPdf(regData, sigBase64);
            const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            // 4. Upload do Contrato Gerado
            const cleanCpf = selectedInscricao.cpf.replace(/\D/g, "");
            const contractPath = `${cleanCpf}/contrato_final.pdf`;
            
            await supabase.storage.from('documentos').upload(contractPath, pdfBlob, { upsert: true });

            updateData.anexo_documento_url = contractPath;

        } catch (error: any) {
            console.error("Erro ao gerar contrato:", error);
            alert(`Erro ao gerar contrato: ${error.message}`);
            setIsSubmitting(false);
            return;
        }
    }

    const { error } = await supabase
      .from('inscricoes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Falha ao atualizar o status do cadastro.');
    } else {
      setSelectedInscricao(null);
      // Atualiza o estado local instantaneamente sem precisar de F5
      setInscricoes((prev) => 
        prev.map((inscricao) => 
          inscricao.id === id ? { ...inscricao, ...updateData } : inscricao
        )
      );
      toast.success(`Cadastro atualizado com sucesso!`);
    }
    setIsSubmitting(false);
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja reprovar e excluir este cadastro? Esta ação não pode ser desfeita.')) {
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('inscricoes').delete().eq('id', id);

    if (error) {
      console.error('Erro ao reprovar cadastro:', error);
      alert('Falha ao reprovar o cadastro.');
    } else {
      setSelectedInscricao(null);
      // Remove do estado local instantaneamente sem precisar de F5
      setInscricoes((prev) => prev.filter((inscricao) => inscricao.id !== id));
      toast.success('Cadastro excluído com sucesso!');
    }
    setIsSubmitting(false);
  };

  const pendentesCount = useMemo(() => inscricoes.filter(i => i.status === 'pendente').length, [inscricoes]);
  const aprovadosCount = useMemo(() => inscricoes.filter(i => i.status === 'aprovado').length, [inscricoes]);

  // Calcula a Receita Mensal Recorrente (Soma dos valores dos aprovados)
  const mrr = useMemo(() => {
    return inscricoes
      .filter(i => i.status === 'aprovado' && i.valor)
      .reduce((acc, curr) => {
        // Pega "R$ 30,00" e converte para número (30.00)
        const numericString = curr.valor!.replace(/[^\d,.-]/g, '').replace(',', '.');
        const value = parseFloat(numericString);
        return acc + (isNaN(value) ? 0 : value);
      }, 0);
  }, [inscricoes]);

  // Calcula os dados para o gráfico de barras (Aprovações dos últimos 7 dias)
  const chartData = useMemo(() => {
    const days: { date: string; label: string; count: number; heightPercentage: number }[] = [];
    const now = new Date();
    
    // Gera os últimos 7 dias vazios
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        count: 0,
        heightPercentage: 0
      });
    }

    // Preenche com a quantidade de aprovações reais
    inscricoes.filter(i => i.status === 'aprovado').forEach(i => {
      const dateStr = new Date(i.created_at).toISOString().split('T')[0];
      const day = days.find(d => d.date === dateStr);
      if (day) day.count++;
    });

    const maxCount = Math.max(...days.map(d => d.count), 1); // Evita divisão por zero
    return days.map(d => ({ ...d, heightPercentage: (d.count / maxCount) * 100 }));
  }, [inscricoes]);

  const filteredInscricoes = useMemo(() => {
    return inscricoes.filter(i => {
      const matchesTab = i.status === (activeTab === 'pendentes' ? 'pendente' : 'aprovado');
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = i.nome_completo.toLowerCase().includes(searchLower) || 
                            (i.cpf && i.cpf.includes(searchLower));
      return matchesTab && matchesSearch;
    });
  }, [inscricoes, activeTab, searchTerm]);


  // Função para exportar os dados exibidos na tabela para CSV
  const handleExportCSV = () => {
    if (filteredInscricoes.length === 0) {
      toast.error('Não há dados para exportar com os filtros atuais.');
      return;
    }

    // Cabeçalhos das colunas
    const headers = ['Data Cadastro', 'Protocolo', 'Nome Completo', 'CPF', 'Telefone', 'E-mail', 'Status', 'Valor'];
    
    // Formata os dados
    const csvRows = filteredInscricoes.map(i => [
      new Date(i.created_at).toLocaleDateString('pt-BR'),
      `"${i.protocolo || ''}"`,
      `"${i.nome_completo}"`,
      `"${i.cpf}"`,
      `"${i.telefone || ''}"`,
      `"${i.email || ''}"`,
      i.status.toUpperCase(),
      `"${i.valor || ''}"`
    ].join(';')); // Ponto e vírgula é melhor para Excel em português

    // Adiciona o BOM (\uFEFF) para forçar o Excel a ler os acentos (UTF-8) corretamente
    const csvContent = '\uFEFF' + [headers.join(';'), ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_dmi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório exportado com sucesso!');
  };

  // Volta para a página 1 sempre que o usuário pesquisar ou trocar de aba
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Recorta o array para mostrar apenas os itens da página atual
  const paginatedInscricoes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInscricoes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInscricoes, currentPage]);

  // Calcula o total de páginas
  const totalPages = Math.ceil(filteredInscricoes.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="bg-[#0EA5FF]/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-[#0EA5FF]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin DMI</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-red-50 text-red-600 px-3 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total de Cadastros</p>
              <h3 className="text-2xl font-bold text-gray-900">{inscricoes.length}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Aguardando Aprovação</p>
              <h3 className="text-2xl font-bold text-gray-900">{pendentesCount}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Aprovados</p>
              <h3 className="text-2xl font-bold text-gray-900">{aprovadosCount}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Receita Mensal (MRR)</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr)}
              </h3>
            </div>
          </div>
        </div>

        {/* Gráfico de Desempenho */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0EA5FF]" /> Aprovações (Últimos 7 Dias)
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6">
            {chartData.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center w-full group h-full justify-end">
                <div className="relative w-full flex justify-center flex-1 items-end">
                  <div 
                    className="w-full max-w-[3rem] bg-[#0EA5FF]/20 group-hover:bg-[#0EA5FF]/40 rounded-t-md transition-all duration-500 relative"
                    style={{ height: `${day.heightPercentage}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                  >
                    {day.count > 0 && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-600 animate-fade-in">
                        {day.count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-3 font-medium capitalize">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controles: Abas e Busca */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'pendentes'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Fila de Pendentes
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'pendentes' ? 'bg-amber-200/50 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{pendentesCount}</span>
            </button>
            <button
              onClick={() => setActiveTab('aprovados')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'aprovados'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contratos Aprovados
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'aprovados' ? 'bg-green-200/50 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{aprovadosCount}</span>
            </button>
          </nav>
          
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5FF] focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Tabela de Inscrições */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Carregando inscrições...
            </div>
          ) : filteredInscricoes.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 p-4 rounded-full mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum resultado</h3>
              <p className="text-gray-500 text-sm">Não encontramos nenhuma inscrição com esses filtros.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px] min-h-[400px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/95 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInscricoes.map((inscricao) => (
                    <tr key={inscricao.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inscricao.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {inscricao.nome_completo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {inscricao.cpf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full border
                          ${inscricao.status === 'aprovado' ? 'bg-green-50 text-green-700 border-green-200' : 
                            inscricao.status === 'rejeitado' ? 'bg-red-50 text-red-700 border-red-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {inscricao.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => setSelectedInscricao(inscricao)}
                          className="inline-flex items-center gap-1.5 text-[#0EA5FF] hover:text-blue-800 font-semibold text-sm transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50/50">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Próxima</button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> a <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredInscricoes.length)}</span> de <span className="font-bold">{filteredInscricoes.length}</span> cadastros
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                          <span className="sr-only">Anterior</span><ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                          <span className="sr-only">Próxima</span><ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes */}
      {selectedInscricao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/40">
          <div 
            className="absolute inset-0 transition-opacity" 
            onClick={() => setSelectedInscricao(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ficha Cadastral</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {selectedInscricao.id}</p>
              </div>
              <button 
                onClick={() => setSelectedInscricao(null)}
                className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Dados Pessoais */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-bold text-[#0EA5FF] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Dados Pessoais
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block">Protocolo</label>
                          <span className="text-sm font-bold text-blue-600 select-all">{selectedInscricao.protocolo || '-'}</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Nome Completo</label>
                          <span className="text-sm font-bold text-gray-900">{selectedInscricao.nome_completo}</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">CPF</label>
                          <span className="text-sm font-medium text-gray-900">{selectedInscricao.cpf}</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">RG</label>
                          <span className="text-sm font-medium text-gray-900">{selectedInscricao.rg || '-'}</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Data de Nascimento</label>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedInscricao.data_nascimento
                              ? selectedInscricao.data_nascimento.split('-').reverse().join('/')
                              : '-'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <label className="text-xs text-gray-500 block">Endereço</label>
                        <span className="text-sm font-medium text-gray-900 break-words">{selectedInscricao.endereco || '-'}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                        <div className="sm:col-span-1">
                          <label className="text-xs text-gray-500 block">Telefone</label>
                          <span className="text-sm font-medium text-gray-900">{selectedInscricao.telefone || '-'}</span>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="text-xs text-gray-500 block">E-mail</label>
                          <span className="text-sm font-medium text-gray-900 break-all">{selectedInscricao.email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Resumo do Plano
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block">Valor do Plano</label>
                          <span className="text-lg font-bold text-green-600">{selectedInscricao.valor || '-'}</span>
                        </div>
                      </div>

                      {/* Dados Financeiros */}
                      <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block">Forma de Pagamento (Adesão)</label>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {selectedInscricao.metodo_pagamento || 'PIX'}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Dia Vencimento (Boleto)</label>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedInscricao.dia_vencimento ? `Dia ${selectedInscricao.dia_vencimento}` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card da Carteirinha Digital */}
                  {selectedInscricao.status === 'aprovado' && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 bg-indigo-50/30">
                      <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Carteirinha Digital
                      </h4>
                      <div className="space-y-3">
                        <p className="text-xs text-gray-600 font-medium">Link de acesso dinâmico do cliente:</p>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
                          <input type="text" readOnly value={`${window.location.origin}/carteirinha/${selectedInscricao.cpf.replace(/\D/g, "")}`} className="text-xs text-gray-500 bg-transparent flex-1 outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/carteirinha/${selectedInscricao.cpf.replace(/\D/g, "")}`); toast.success('Link da carteirinha copiado!'); }} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors">
                            <Copy className="w-4 h-4" /> Copiar Link
                          </button>
                          <a href={`${window.location.origin}/carteirinha/${selectedInscricao.cpf.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white border border-indigo-200 text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors">
                            <ExternalLink className="w-4 h-4" /> Visualizar
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedInscricao.observacoes && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Dependentes / Observações
                      </h4>
                      <div className="text-sm text-gray-700 space-y-3">
                        {selectedInscricao.observacoes.startsWith('[') ? (
                          <div className="space-y-3">
                            {(() => {
                              try {
                                const deps = JSON.parse(selectedInscricao.observacoes);
                                return deps.map((d: any, i: number) => (
                                  <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-gray-900">{d.nomeCompleto}</p>
                                      <p className="text-xs text-gray-500">{d.parentesco} • CPF: {d.cpf}</p>
                                    </div>
                                    {imageUrls[`dep_${i}`] ? (
                                      <a 
                                        href={imageUrls[`dep_${i}`]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#0EA5FF] hover:text-blue-800 text-xs flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-md border border-blue-100 shadow-sm transition-all hover:shadow"
                                      >
                                        <ImageIcon className="w-3 h-3" /> Ver Documento
                                      </a>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Sem documento</span>
                                    )}
                                  </div>
                                ));
                              } catch {
                                return selectedInscricao.observacoes;
                              }
                            })()}
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700">
                            {selectedInscricao.observacoes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Documentos */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Documentos Anexados
                    </h4>
                    <div className="grid gap-4">
                    {/* Contrato */}
                    <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Contrato Assinado</p>
                          {selectedInscricao.status === 'pendente' ? (
                             <p className="text-xs text-amber-600 font-medium">Será gerado ao aprovar</p>
                          ) : (
                             <p className="text-xs text-gray-500">PDF Disponível</p>
                          )}
                        </div>
                      </div>
                      {imageUrls.contrato ? (
                        <a 
                          href={imageUrls.contrato} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          Abrir PDF
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-gray-400 px-3 py-1 bg-gray-200 rounded-full">Indisponível</span>
                      )}
                    </div>

                    {/* RG */}
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <ImageIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Foto do RG</p>
                      </div>
                      <div className="bg-gray-100/50 rounded-lg overflow-hidden h-48 flex items-center justify-center border border-gray-100">
                        {imageUrls.rg ? (
                          <a href={imageUrls.rg} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrls.rg} alt="RG" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Carregando imagem...</span>
                        )}
                      </div>
                    </div>

                    {/* Comprovante */}
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <ImageIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Comprovante de Residência</p>
                      </div>
                      <div className="bg-gray-100/50 rounded-lg overflow-hidden h-48 flex items-center justify-center border border-gray-100">
                        {imageUrls.residencia ? (
                          <a href={imageUrls.residencia} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrls.residencia} alt="Residência" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Carregando imagem...</span>
                        )}
                      </div>
                    </div>

                    {/* Comprovante de Pagamento */}
                    <div className="border border-[#0EA5FF]/20 rounded-xl p-4 bg-[#0EA5FF]/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Comprovante de Pagamento</p>
                      </div>
                      <div className="bg-white rounded-lg overflow-hidden h-48 flex items-center justify-center border border-gray-100">
                        {imageUrls.comprovantePagamento ? (
                          <a href={imageUrls.comprovantePagamento} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrls.comprovantePagamento} alt="Comprovante" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Não anexado</span>
                        )}
                      </div>
                    </div>


                    {/* Assinatura (Preview) */}
                    <div className="border border-gray-100 rounded-xl p-4">
                       <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Assinatura Coletada</p>
                       <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[6rem] gap-2">
                         {imageUrls.assinatura ? (
                            <img src={imageUrls.assinatura} alt="Assinatura" className="max-h-full max-w-full object-contain h-24" />
                         ) : (
                            <>
                              <span className="text-xs text-gray-500 font-medium">Aguardando assinatura</span>
                              <button
                                onClick={() => {
                                  const link = `${window.location.origin}/assinatura/${encodeURIComponent(selectedInscricao.cpf)}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success('Link de assinatura copiado!');
                                }}
                                className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#0EA5FF] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors border border-blue-100"
                              >
                                <Copy className="w-3 h-3" />
                                Copiar Link
                              </button>
                            </>
                         )}
                       </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <button 
                onClick={() => setSelectedInscricao(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => handleReject(selectedInscricao.id)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-2"/> Reprovar</>}
              </button>
              {selectedInscricao.status === 'pendente' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInscricao.id, 'aprovado')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#64E627] hover:bg-[#52C51D] rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px] transition-colors text-gray-900"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2"/> Confirmar Pgto</>}
                </button>
              )}
              {selectedInscricao.status === 'aprovado' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInscricao.id, 'pendente')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px] transition-colors"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AlertTriangle className="w-4 h-4 mr-2"/> Mover p/ Pendente</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}