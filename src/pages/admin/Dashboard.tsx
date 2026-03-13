import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X, FileText, Image as ImageIcon, User, Loader2, Check, AlertTriangle } from 'lucide-react';
import { generateContractPdf } from '@/components/registration/pdf';
import { RegistrationData } from '@/types/registration';

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email);
      }
    });

    fetchInscricoes();

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
    };
  }, []);

  // Busca URLs assinadas quando um usuário é selecionado
  useEffect(() => {
    if (selectedInscricao) {
      const loadImages = async () => {
        const urls: { [key: string]: string } = {};
        
        if (selectedInscricao.foto_url) {
          const { data } = await supabase.storage.from('documentos').createSignedUrl(selectedInscricao.foto_url, 3600);
          if (data) urls.rg = data.signedUrl;
        }
        
        if (selectedInscricao.anexo_documento_url) {
          const { data } = await supabase.storage.from('documentos').createSignedUrl(selectedInscricao.anexo_documento_url, 3600);
          if (data) urls.contrato = data.signedUrl;
        }

        // Tenta buscar a residência baseado no padrão de caminho (cpf/residencia.jpg)
        const cleanCpf = selectedInscricao.cpf.replace(/\D/g, "");
        const { data: resData } = await supabase.storage.from('documentos').createSignedUrl(`${cleanCpf}/residencia.jpg`, 3600);
        if (resData) urls.residencia = resData.signedUrl;

        // Assinatura
        if (selectedInscricao.assinatura_url) {
            const { data: sigData } = await supabase.storage.from('documentos').createSignedUrl(selectedInscricao.assinatura_url, 3600);
            if (sigData) urls.assinatura = sigData.signedUrl;
        }

        // Comprovante Pagamento
        if (selectedInscricao.comprovante_pagamento_url) {
            const { data: cpData } = await supabase.storage.from('documentos').createSignedUrl(selectedInscricao.comprovante_pagamento_url, 3600);
            if (cpData) urls.comprovantePagamento = cpData.signedUrl;
        }

        // Tenta buscar imagens dos dependentes se houver JSON nas observações
        if (selectedInscricao.observacoes && selectedInscricao.observacoes.startsWith('[')) {
          try {
            const deps = JSON.parse(selectedInscricao.observacoes);
            for (let i = 0; i < deps.length; i++) {
              if (deps[i].fotoDocumento) {
                const { data: depData } = await supabase.storage.from('documentos').createSignedUrl(deps[i].fotoDocumento, 3600);
                if (depData) urls[`dep_${i}`] = depData.signedUrl;
              }
            }
          } catch (e) {
            console.error('Erro ao processar imagens de dependentes:', e);
          }
        }

        setImageUrls(urls);
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
    }
    setIsSubmitting(false);
  };

  const pendentesCount = useMemo(() => inscricoes.filter(i => i.status === 'pendente').length, [inscricoes]);
  const aprovadosCount = useMemo(() => inscricoes.filter(i => i.status === 'aprovado').length, [inscricoes]);

  const filteredInscricoes = useMemo(() => {
    return inscricoes.filter(i => i.status === (activeTab === 'pendentes' ? 'pendente' : 'aprovado'));
  }, [inscricoes, activeTab]);


  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">Admin DMI</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-50 text-red-600 px-3 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Stats */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Solicitações de Cadastro</h2>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
              <span className="text-xs text-gray-500 uppercase font-semibold">Total Geral</span>
              <span className="text-xl font-bold text-blue-600">{inscricoes.length}</span>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'pendentes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pendentes <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${activeTab === 'pendentes' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{pendentesCount}</span>
            </button>
            <button
              onClick={() => setActiveTab('aprovados')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'aprovados'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Aprovados <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${activeTab === 'aprovados' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{aprovadosCount}</span>
            </button>
          </nav>
        </div>

        {/* Tabela de Inscrições */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Carregando inscrições...
            </div>
          ) : inscricoes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Nenhuma inscrição encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInscricoes.map((inscricao) => (
                    <tr key={inscricao.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inscricao.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {inscricao.nome_completo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inscricao.cpf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${inscricao.status === 'aprovado' ? 'bg-green-100 text-green-800' : 
                            inscricao.status === 'rejeitado' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {inscricao.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => setSelectedInscricao(inscricao)}
                          className="text-blue-600 hover:text-blue-900 font-semibold hover:underline"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes */}
      {selectedInscricao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedInscricao(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Ficha do Cadastrado</h3>
              <button 
                onClick={() => setSelectedInscricao(null)}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dados Pessoais */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados Pessoais</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block">Protocolo</label>
                          <span className="text-sm font-bold text-blue-600 select-all">{selectedInscricao.protocolo || '-'}</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Nome Completo</label>
                          <span className="text-sm font-medium text-gray-900">{selectedInscricao.nome_completo}</span>
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
                        <span className="text-sm font-medium text-gray-900">{selectedInscricao.endereco || '-'}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <label className="text-xs text-gray-500 block">Telefone</label>
                          <span className="text-sm font-medium text-gray-900">{selectedInscricao.telefone || '-'}</span>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="text-xs text-gray-500 block">E-mail</label>
                          <span className="text-sm font-medium text-gray-900 break-all">{selectedInscricao.email || '-'}</span>
                        </div>
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

                  {selectedInscricao.observacoes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Observações / Dependentes</h4>
                      <div className="text-sm text-gray-700">
                        {selectedInscricao.observacoes.startsWith('[') ? (
                          <div className="space-y-3">
                            {(() => {
                              try {
                                const deps = JSON.parse(selectedInscricao.observacoes);
                                return deps.map((d: any, i: number) => (
                                  <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-gray-900">{d.nomeCompleto}</p>
                                      <p className="text-xs text-gray-500">{d.parentesco} • CPF: {d.cpf}</p>
                                    </div>
                                    {imageUrls[`dep_${i}`] ? (
                                      <a 
                                        href={imageUrls[`dep_${i}`]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 font-medium bg-white px-2 py-1 rounded border border-blue-100"
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
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800">
                            {selectedInscricao.observacoes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Documentos */}
                <div className="space-y-6">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Documentos Anexados</h4>
                  
                  <div className="grid gap-4">
                    {/* Contrato */}
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
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
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Abrir PDF
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>

                    {/* RG */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <ImageIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Foto do RG</p>
                      </div>
                      <div className="bg-gray-100 rounded-lg overflow-hidden h-48 flex items-center justify-center">
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
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <ImageIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Comprovante de Residência</p>
                      </div>
                      <div className="bg-gray-100 rounded-lg overflow-hidden h-48 flex items-center justify-center">
                        {imageUrls.residencia ? (
                          <a href={imageUrls.residencia} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrls.residencia} alt="Residência" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Carregando imagem...</span>
                        )}
                      </div>
                    </div>

                    {/* Comprovante PIX */}
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Comprovante PIX</p>
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
                    <div className="border border-gray-200 rounded-lg p-4">
                       <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assinatura Coletada</p>
                       <div className="bg-white border border-gray-100 rounded p-2 h-20 flex items-center justify-center">
                         {imageUrls.assinatura ? (
                            <img src={imageUrls.assinatura} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                         ) : (
                            <span className="text-xs text-gray-400">Sem assinatura</span>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedInscricao(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                onClick={() => handleReject(selectedInscricao.id)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-28"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-2"/> Reprovar</>}
              </button>
              {selectedInscricao.status === 'pendente' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInscricao.id, 'aprovado')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-36"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2"/> Confirmar Pgto</>}
                </button>
              )}
              {selectedInscricao.status === 'aprovado' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInscricao.id, 'pendente')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-44"
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