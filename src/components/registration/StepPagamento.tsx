import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import FileUpload from "./FileUpload";
import { ADESAO } from "@/types/registration";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepPagamentoProps {
  values: {
    comprovantePagamento: string | null;
    metodoPagamento: string;
    diaVencimento: string;
  };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepPagamento = ({ values, onChange, onNext, onBack }: StepPagamentoProps) => {
  const stoneLink = "https://payment-link-v3.stone.com.br/pl_p7eoj0VKgrAXy1JHLu06BnDz3PGJWvmE";
  const valorAdesao = ADESAO.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const diasVencimento = ["5", "10", "15", "20", "25", "30"];

  const handleNext = () => {
    if (!values.metodoPagamento) {
      toast.error("Selecione uma forma de pagamento.");
      return;
    }
    if (!values.diaVencimento) {
      toast.error("Selecione o dia de vencimento das mensalidades.");
      return;
    }
    if (values.metodoPagamento === 'online' && !values.comprovantePagamento) {
      toast.error("Por favor, anexe o comprovante de pagamento.");
      return;
    }
    onNext();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Pagamento e Mensalidade</h2>
        <p className="text-sm text-muted-foreground">
          Escolha como deseja pagar a taxa de adesão e a data das futuras mensalidades.
        </p>
      </div>

      {/* Seleção de Vencimento e Método */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Forma de Pagamento da Adesão</Label>
          <Select 
            value={values.metodoPagamento} 
            onValueChange={(v) => onChange('metodoPagamento', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Pagamento Online (Pix, Cartão, Boleto)</SelectItem>
              <SelectItem value="dinheiro">Dinheiro (Presencial)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dia de Vencimento (Mensalidade)</Label>
          <Select 
            value={values.diaVencimento} 
            onValueChange={(v) => onChange('diaVencimento', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha o dia..." />
            </SelectTrigger>
            <SelectContent>
              {diasVencimento.map((dia) => (
                <SelectItem key={dia} value={dia}>Dia {dia}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3"/> As mensalidades poderão ser pagas via boleto.
          </p>
        </div>
      </div>

      {/* Conteúdo Condicional Baseado no Método de Pagamento */}
      {values.metodoPagamento === 'online' && (
        <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-green-600"/>
                <div>
                    <p className="text-sm text-green-700 font-medium">Pagamento via Stone</p>
                    <p className="text-sm text-green-800">
                        Clique no botão para pagar a taxa de adesão ({valorAdesao}).
                        <br/>
                        <span className="text-xs">Aceitamos Pix, Cartão de Crédito e Boleto.</span>
                    </p>
                </div>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm" size="lg" asChild>
                <a href={stoneLink} target="_blank" rel="noopener noreferrer">
                    Pagar Agora
                </a>
            </Button>
          </div>

          <div className="space-y-3">
            <FileUpload
              label="Comprovante de Pagamento (Print) *"
              value={values.comprovantePagamento}
              onChange={(v) => onChange('comprovantePagamento', v)}
            />
            <p className="text-xs text-muted-foreground">
               Após realizar o pagamento, tire um print da tela de confirmação e anexe aqui.
            </p>
          </div>
        </div>
      )}

      {values.metodoPagamento === 'dinheiro' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-4 items-start animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-900">Pagamento Presencial Necessário</h4>
            <p className="text-sm text-amber-800">
              Para concluir a efetivação do plano, é necessário comparecer pessoalmente à clínica para realizar o pagamento da taxa de adesão. 
              <br/>
              Por favor, <strong>compareça à clínica</strong> para realizar o pagamento da taxa de adesão ({valorAdesao}) e finalizar seu cadastro.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} size="lg">
          Voltar
        </Button>
        <Button onClick={handleNext} size="lg">
          Próximo
        </Button>
      </div>
    </div>
  );
};

export default StepPagamento;