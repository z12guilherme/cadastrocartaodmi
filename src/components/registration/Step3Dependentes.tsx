import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import MaskedInput from "./MaskedInput";
import FileUpload from "./FileUpload";
import { Dependente, MAX_DEPENDENTES } from "@/types/registration";

interface Step3Props {
  dependentes: Dependente[];
  onChange: (dependentes: Dependente[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const parentescos = ["Cônjuge", "Filho(a)", "Pai/Mãe", "Irmão(ã)", "Outro"];

const Step3Dependentes = ({ dependentes, onChange, onNext, onBack }: Step3Props) => {
  const addDependente = () => {
    onChange([
      ...dependentes,
      {
        id: crypto.randomUUID(),
        nomeCompleto: "",
        parentesco: "",
        cpf: "",
        dataNascimento: "",
        fotoDocumento: null,
      },
    ]);
  };

  const updateDep = (id: string, field: keyof Dependente, value: string | null) => {
    onChange(
      dependentes.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const removeDep = (id: string) => {
    onChange(dependentes.filter((d) => d.id !== id));
  };

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Dependentes</h2>
      <p className="text-sm text-muted-foreground">
        Adicione até {MAX_DEPENDENTES} dependentes (opcional).
      </p>

      {dependentes.map((dep, index) => (
        <div
          key={dep.id}
          className="wizard-card relative space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              Dependente {index + 1}
            </h3>
            <button
              type="button"
              onClick={() => removeDep(dep.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome Completo</Label>
              <Input
                value={dep.nomeCompleto}
                onChange={(e) => updateDep(dep.id, "nomeCompleto", e.target.value)}
                placeholder="Nome do dependente"
              />
            </div>

            <div>
              <Label>Data de Nascimento</Label>
              <MaskedInput
                mask="00/00/0000"
                value={(dep as any).dataNascimento || ""}
                onAccept={(v) => updateDep(dep.id, "dataNascimento" as any, v)}
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <Label>Parentesco</Label>
              <Select
                value={dep.parentesco}
                onValueChange={(v) => updateDep(dep.id, "parentesco", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {parentescos.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CPF</Label>
              <MaskedInput
                mask="000.000.000-00"
                value={dep.cpf}
                onAccept={(v) => updateDep(dep.id, "cpf", v)}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <FileUpload
            label="Foto do Documento"
            value={dep.fotoDocumento}
            onChange={(v) => updateDep(dep.id, "fotoDocumento", v)}
          />
        </div>
      ))}

      {dependentes.length < MAX_DEPENDENTES && (
        <Button
          variant="outline"
          onClick={addDependente}
          className="w-full border-dashed border-2 text-[#0EA5FF] hover:bg-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Dependente
        </Button>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} size="lg">
          Voltar
        </Button>
        <Button onClick={onNext} size="lg">
          Próximo
        </Button>
      </div>
    </div>
  );
};

export default Step3Dependentes;
