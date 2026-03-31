import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MaskedInput from "./MaskedInput";
import { Titular } from "@/types/registration";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Step1Props {
  data: Titular;
  onChange: (data: Titular) => void;
  onNext: () => void;
}

// Algoritmo matemático para validar se o CPF é real
const validarCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

const Step1Titular = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isFetchingData, setIsFetchingData] = useState(false);

  const update = (field: keyof Titular, value: string) => {
    onChange({ ...data, [field]: value });
    if (value.trim()) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const buscarCep = async (cepFormatado: string) => {
    const cepClean = cepFormatado.replace(/\D/g, "");
    if (cepClean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const json = await res.json();
      if (!json.erro) {
        onChange({
          ...data,
          cep: cepFormatado,
          cidade: json.localidade || data.cidade,
          bairro: json.bairro || data.bairro,
          rua: json.logradouro || data.rua,
        });
        setErrors((prev) => ({ ...prev, cidade: false, bairro: false, rua: false }));
      }
    } catch {
      // silently fail
    }
  };

  // Função para buscar os dados do CPF na API e preencher o formulário
  const fetchCpfData = async () => {
    const cpfClean = data.cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11 || !validarCPF(cpfClean)) {
      return;
    }

    setIsFetchingData(true);
    setErrors((prev) => ({ ...prev, cpf: false }));

    try {
      // 1. VERIFICAR SE O CPF JÁ ESTÁ EM UM CADASTRO PENDENTE OU ATIVO NO NOSSO SISTEMA
      // Um cadastro 'rejeitado' deve permitir que o usuário tente novamente.
      const { count, error: countError } = await supabase
        .from('inscricoes')
        .select('*', { count: 'exact', head: true })
        .eq('cpf', cpfClean)
        .in('status', ['pendente', 'aprovado']);

      if (countError) {
        // Não bloqueia o usuário se a verificação falhar, apenas loga o erro.
        console.error("Erro ao checar CPF existente:", countError);
      } else if (count && count > 0) {
        toast.error("Este CPF já possui um cadastro ativo ou em análise.", {
          description: "Acesse a tela de 'Consultar Status' para mais detalhes."
        });
        setErrors((prev) => ({ ...prev, cpf: true }));
        setIsFetchingData(false);
        return;
      }

      // 2. SE NÃO, VERIFICAR SE O CLIENTE JÁ EXISTE NO SISTEMA LEGADO (SIGPAF)
      const { data: sigpafStatus, error: sigpafError } = await supabase.functions.invoke("check-status", {
        body: { cpf: cpfClean }
      });

      if (sigpafError) {
        // Se a verificação do SIGPAF falhar, não bloqueamos, mas avisamos no console e seguimos para a próxima API.
        console.warn("Falha ao verificar existência no SIGPAF, prosseguindo para a API de dados.", sigpafError);
      } else if (sigpafStatus && sigpafStatus.existe && sigpafStatus.status?.toUpperCase() === 'ATIVO') {
        // SE EXISTE NO SIGPAF E ESTÁ ATIVO, BLOQUEIA O CADASTRO.
        // Se existe mas está INATIVO/CANCELADO, permite o novo cadastro.
        toast.error("Este CPF já pertence a um cliente DMI ativo.", {
          description: "Para reativar seu plano ou acessar sua carteirinha, use a tela de consulta.",
        });
        setErrors((prev) => ({ ...prev, cpf: true }));
        setIsFetchingData(false);
        return; // Interrompe o fluxo
      }

      // 3. SE NÃO EXISTE EM LUGAR NENHUM, BUSCA DADOS PARA AUTOCOMPLETE
      const { data: apiData, error: apiError } = await supabase.functions.invoke("get-cpf-data", {
        body: { cpf: cpfClean },
      });

      if (apiError) throw apiError;

      if (apiData.success) {
        // Formata a data de YYYY-MM-DD para DD/MM/YYYY
        const [year, month, day] = apiData.data_nascimento.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        // Mapeia o gênero
        const sexo = apiData.genero === 'M' ? 'Masculino' : apiData.genero === 'F' ? 'Feminino' : '';

        // Atualiza o estado do formulário com os dados recebidos
        onChange({
          ...data,
          nomeCompleto: apiData.nome,
          dataNascimento: formattedDate,
          sexo: sexo,
        });
        toast.success("Dados do titular preenchidos automaticamente!");
      } else {
        // Se a API não encontrar o CPF, permite o preenchimento manual
        toast.info("CPF não encontrado na base de dados.", {
          description: "Por favor, preencha os dados manualmente.",
        });
      }
    } catch (err: any) {
      // Se houver erro na chamada da função, permite o preenchimento manual
      toast.warning("Não foi possível buscar os dados automaticamente.", {
        description: err.message || "Continue preenchendo manualmente.",
      });
    } finally {
      setIsFetchingData(false);
    }
  };

  // Efeito para buscar dados do CPF automaticamente após digitação
  useEffect(() => {
    const timeoutId = setTimeout(() => { fetchCpfData(); }, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [data.cpf]);

  const validate = async () => {
    const required: (keyof Titular)[] = [
      "nomeCompleto",
      "dataNascimento",
      "cpf",
      "telefoneCelular",
      "cep",
      "cidade",
      "bairro",
      "rua",
      "numero",
      "rg" as any,
      "sexo" as any,
    ];
    const newErrors: Record<string, boolean> = {};
    required.forEach((f) => {
      if (!data[f].trim()) newErrors[f] = true;
    });

    // Impede o avanço de tela se o CPF for matematicamente falso
    if (data.cpf && !validarCPF(data.cpf)) {
      newErrors.cpf = true;
      toast.error("Por favor, informe um CPF válido para continuar.");
      setErrors(newErrors);
      return false;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios.");
      return false;
    }

    setErrors({});
    return true;
  };

  const field = (
    key: keyof Titular,
    label: string,
    placeholder: string,
    colSpan?: string
  ) => (
    <div className={colSpan || ""}>
      <Label htmlFor={key}>{label} *</Label>
      <Input
        id={key}
        value={data[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        className={errors[key] ? "border-destructive" : ""}
      />
    </div>
  );

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Dados do Titular</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="cpf">CPF *</Label>
          <div className="relative flex items-center">
            <MaskedInput
              id="cpf"
              mask="000.000.000-00"
              value={data.cpf}
              onAccept={(v) => update("cpf", v)}
              placeholder="000.000.000-00"
              className={`${errors.cpf ? "border-destructive" : ""} ${isFetchingData ? "pr-10" : ""}`}
            />
            {isFetchingData && (
              <div className="absolute right-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Digite seu CPF para buscar seus dados automaticamente.
          </p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="nomeCompleto">Nome Completo *</Label>
          <Input
            id="nomeCompleto"
            value={data.nomeCompleto}
            onChange={(e) => update("nomeCompleto", e.target.value)}
            placeholder="João da Silva"
            className={errors.nomeCompleto ? "border-destructive" : ""}
          />
        </div>

        <div>
          <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
          <MaskedInput
            id="dataNascimento"
            mask="00/00/0000"
            value={data.dataNascimento}
            onAccept={(v) => update("dataNascimento", v)}
            placeholder="DD/MM/AAAA"
            className={errors.dataNascimento ? "border-destructive" : ""}
          />
        </div>

        <div>
          <Label htmlFor="sexo">Sexo *</Label>
          <Select 
            value={(data as any).sexo || ""} 
            onValueChange={(v) => update("sexo" as any, v)}
          >
            <SelectTrigger className={errors.sexo ? "border-destructive" : ""}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rg">RG *</Label>
          <Input
            id="rg"
            value={(data as any).rg || ""}
            onChange={(e) => update("rg" as any, e.target.value)}
            placeholder="0000000"
            className={errors.rg ? "border-destructive" : ""}
          />
        </div>

        <div>
          <Label htmlFor="telefoneCelular">Telefone Celular *</Label>
          <MaskedInput
            id="telefoneCelular"
            mask="(00) 00000-0000"
            value={data.telefoneCelular}
            onAccept={(v) => update("telefoneCelular", v)}
            placeholder="(00) 00000-0000"
            className={errors.telefoneCelular ? "border-destructive" : ""}
          />
        </div>
        
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={(data as any).email || ""}
            onChange={(e) => update("email" as any, e.target.value)}
            placeholder="cliente@email.com"
          />
        </div>

        <div>
          <Label htmlFor="cep">CEP *</Label>
          <MaskedInput
            id="cep"
            mask="00000-000"
            value={data.cep}
            onAccept={(v) => {
              update("cep", v);
              if (v.replace(/\D/g, "").length === 8) buscarCep(v);
            }}
            placeholder="00000-000"
            className={errors.cep ? "border-destructive" : ""}
          />
        </div>

        {field("cidade", "Cidade", "São Paulo")}
        {field("bairro", "Bairro", "Centro")}
        {field("rua", "Rua", "Rua das Flores")}
        {field("numero", "Número", "123")}

        <div className="md:col-span-2">
          <Label htmlFor="pontoReferencia">Ponto de Referência</Label>
          <Input
            id="pontoReferencia"
            value={data.pontoReferencia}
            onChange={(e) => update("pontoReferencia", e.target.value)}
            placeholder="Próximo ao mercado..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={async () => { if (await validate()) onNext() }} size="lg">
          Próximo
        </Button>
      </div>
    </div>
  );
};

export default Step1Titular;
