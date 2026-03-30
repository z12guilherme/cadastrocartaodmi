import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MaskedInput from "@/components/registration/MaskedInput";
import { ArrowLeft, CreditCard, Search, AlertCircle } from "lucide-react";
import logoDmi from "@/assets/logo-dmi.png";
import { validarCPF } from "@/utils/validators";

export default function ConsultaCarteirinha() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAcessar = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanCpf = cpf.replace(/\D/g, "");
    
    if (!validarCPF(cleanCpf)) {
      setError("CPF inválido. Verifique os números informados.");
      return;
    }

    // Salva o CPF na sessão e redireciona sem expor na URL
    sessionStorage.setItem("dmi_carteirinha_cpf", cleanCpf);
    navigate(`/carteirinha`);
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
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Título */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#0EA5FF]/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-[#0EA5FF]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Acessar Carteirinha
            </h1>
            <p className="text-sm text-gray-500">
              Digite seu CPF para acessar a sua carteirinha digital de benefícios.
            </p>
          </div>

          {/* Card de Busca */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <form onSubmit={handleAcessar} className="space-y-4">
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                  CPF do Titular
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <MaskedInput
                    id="cpf"
                    mask="000.000.000-00"
                    value={cpf}
                    onAccept={(v) => {
                      setCpf(v);
                      if (error) setError(""); // Limpa o erro ao voltar a digitar
                    }}
                    placeholder="000.000.000-00"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0EA5FF] focus:border-transparent transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cpf.replace(/\D/g, "").length !== 11}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0EA5FF] hover:bg-[#0EA5FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5FF] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Acessar Carteirinha
              </button>
            </form>

            {/* Mensagem de Erro */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}