import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RegistrationData,
  ADESAO,
  calcularMensalidade,
  tipoPlano,
} from "@/types/registration";
import { User, Users, CreditCard, CalendarDays } from "lucide-react";

interface Step4Props {
  data: RegistrationData;
  onConfirm: () => void;
  onBack: () => void;
}

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Step4Resumo = ({ data, onConfirm, onBack }: Step4Props) => {
  const numDep = data.dependentes.length;
  const plano = tipoPlano(numDep);
  const mensalidade = calcularMensalidade(numDep);
  const totalVidas = 1 + numDep;

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Resumo do Cadastro</h2>

      <div className="wizard-card space-y-4">
        <div className="flex items-center gap-3">
          {numDep === 0 ? (
            <User className="w-5 h-5 text-[#0EA5FF]" />
          ) : (
            <Users className="w-5 h-5 text-[#0EA5FF]" />
          )}
          <div>
            <p className="font-semibold text-foreground">Plano {plano}</p>
            <p className="text-sm text-muted-foreground">
              {totalVidas} {totalVidas === 1 ? "vida" : "vidas"} (Titular
              {numDep > 0 && ` + ${numDep} dependente${numDep > 1 ? "s" : ""}`})
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Titular</p>
            <p className="font-medium text-foreground">{data.titular.nomeCompleto}</p>
            <p className="text-sm text-muted-foreground">CPF: {data.titular.cpf}</p>
          </div>
        </div>

        {data.dependentes.map((dep, i) => (
          <div key={dep.id} className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                Dependente {i + 1} — {dep.parentesco}
              </p>
              <p className="font-medium text-foreground">{dep.nomeCompleto}</p>
            </div>
          </div>
        ))}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0EA5FF]" />
              <span className="text-sm text-foreground">Taxa de Adesão (hoje)</span>
            </div>
            <span className="font-bold text-lg text-foreground">{currency(ADESAO)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#0EA5FF]" />
              <span className="text-sm text-foreground">Mensalidade (a partir do próximo mês)</span>
            </div>
            <span className="font-bold text-lg text-[#0EA5FF]">{currency(mensalidade)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} size="lg">
          Voltar
        </Button>
        <Button onClick={onConfirm} size="lg" className="bg-[#64E627] hover:bg-[#64E627]/90 text-black">
          Concluir Cadastro
        </Button>
      </div>
    </div>
  );
};

export default Step4Resumo;
