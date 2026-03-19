import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import MaskedInput from "./MaskedInput";
import { Titular } from "@/types/registration";
import { useState } from "react";
import { toast } from "sonner";

interface Step1Props {
  data: Titular;
  onChange: (data: Titular) => void;
  onNext: () => void;
}

const Step1Titular = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const update = (field: keyof Titular, value: string) => {
    onChange({ ...data, [field]: value });
    if (value.trim()) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const buscarCep = async () => {
    const cepClean = data.cep.replace(/\D/g, "");
    if (cepClean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const json = await res.json();
      if (!json.erro) {
        onChange({
          ...data,
          cidade: json.localidade || data.cidade,
          bairro: json.bairro || data.bairro,
          rua: json.logradouro || data.rua,
        });
      }
    } catch {
      // silently fail
    }
  };

  const validate = () => {
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
    ];
    const newErrors: Record<string, boolean> = {};
    required.forEach((f) => {
      if (!data[f].trim()) newErrors[f] = true;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return false;
    }
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
          <Label htmlFor="cpf">CPF *</Label>
          <MaskedInput
            id="cpf"
            mask="000.000.000-00"
            value={data.cpf}
            onAccept={(v) => update("cpf", v)}
            placeholder="000.000.000-00"
            className={errors.cpf ? "border-destructive" : ""}
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
            }}
            placeholder="00000-000"
            className={errors.cep ? "border-destructive" : ""}
          />
          <button
            type="button"
            onClick={buscarCep}
            className="text-xs text-[#0EA5FF] hover:underline mt-1"
          >
            Buscar CEP
          </button>
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
        <Button onClick={() => validate() && onNext()} size="lg">
          Próximo
        </Button>
      </div>
    </div>
  );
};

export default Step1Titular;
