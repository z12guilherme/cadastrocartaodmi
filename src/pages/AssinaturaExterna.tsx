// src/pages/AssinaturaExterna.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, CheckCircle, FileSignature } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Ajuste para o caminho do seu client Supabase

interface ClienteData {
  id: string;
  nome_completo: string;
  cpf: string;
  valor: string;
  assinatura_url: string | null;
}

export default function AssinaturaExterna() {
  const { cpf } = useParams(); // Pega o CPF da URL
  const navigate = useNavigate();
  const signatureRef = useRef<SignatureCanvas>(null);
  
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Busca os dados do cliente ao carregar a página
  useEffect(() => {
    async function fetchDados() {
      if (!cpf) return;
      
      try {
        const { data, error } = await supabase
          .from("inscricoes")
          .select("id, nome_completo, cpf, valor, assinatura_url")
          .eq("cpf", cpf)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data) throw new Error("Cadastro não encontrado.");
        if (data.assinatura_url) throw new Error("Este contrato já foi assinado!");

        setCliente(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, [cpf]);

  const limparAssinatura = () => {
    signatureRef.current?.clear();
  };

  const salvarAssinatura = async () => {
    if (signatureRef.current?.isEmpty()) {
      alert("Por favor, assine antes de enviar.");
      return;
    }

    setSaving(true);
    try {
      // 1. Pega a imagem base64 do canvas
      const signatureDataUrl = signatureRef.current?.toDataURL("image/png");
      
      // 2. Converte Base64 para Blob/File para upload no Supabase
      const res = await fetch(signatureDataUrl!);
      const blob = await res.blob();
      const fileName = `${cliente?.cpf}/assinatura_${Date.now()}.png`;

      // 3. Faz o upload pro Storage (Bucket: documentos)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      // 4. Atualiza a tabela com o caminho da assinatura
      const { error: updateError } = await supabase
        .from("inscricoes")
        .update({ assinatura_url: uploadData.path })
        .eq("id", cliente?.id);

      if (updateError) throw updateError;

      setSucesso(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar assinatura. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (sucesso) return (
    <div className="p-12 text-center space-y-4">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold">Assinatura enviada!</h2>
      <p>Obrigado, {cliente?.nome_completo}. Seu contrato foi assinado com sucesso.</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border">
      <div className="text-center mb-6">
        <FileSignature className="w-12 h-12 text-blue-500 mx-auto mb-2" />
        <h1 className="text-xl font-bold">Assinatura Digital</h1>
        <p className="text-sm text-gray-500">Confira seus dados e assine abaixo</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm space-y-2 border">
        <p><strong>Titular:</strong> {cliente?.nome_completo}</p>
        <p><strong>CPF:</strong> {cliente?.cpf}</p>
        <p><strong>Valor do Plano:</strong> {cliente?.valor}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sua Assinatura</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{ className: "w-full h-48", width: 500, height: 200 }}
            penColor="black"
          />
        </div>
        <div className="flex justify-end mt-2">
          <button type="button" onClick={limparAssinatura} className="text-sm text-red-500 hover:text-red-700">
            Limpar
          </button>
        </div>
      </div>

      <button
        onClick={salvarAssinatura}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-5 h-5 animate-spin" />}
        {saving ? "Salvando..." : "Confirmar Assinatura"}
      </button>
    </div>
  );
}
