import { Button } from "@/components/ui/button";
import FileUpload from "./FileUpload";
import { TitularDocumentos } from "@/types/registration";
import { toast } from "sonner";

interface Step2Props {
  data: TitularDocumentos;
  onChange: (data: TitularDocumentos) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Documentos = ({ data, onChange, onNext, onBack }: Step2Props) => {
  const update = (field: keyof TitularDocumentos, value: string | null) => {
    onChange({ ...data, [field]: value });
  };

  const validate = () => {
    if (!data.fotoRg || !data.fotoComprovanteResidencia) {
      toast.error("Envie todos os documentos obrigatórios.");
      return false;
    }
    return true;
  };

  return (
    <div className="animate-fade-in space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Documentos do Titular</h2>
      <p className="text-sm text-muted-foreground">
        Tire fotos ou envie imagens dos seus documentos.
      </p>

      <div className="space-y-4">
        <FileUpload
          label="Documento com foto (RG ou CNH) *"
          value={data.fotoRg}
          onChange={(v) => update("fotoRg", v)}
        />
        <FileUpload
          label="Foto do CPF (Opcional)"
          value={data.fotoCpf}
          onChange={(v) => update("fotoCpf", v)}
        />
        <FileUpload
          label="Comprovante de Residência *"
          value={data.fotoComprovanteResidencia}
          onChange={(v) => update("fotoComprovanteResidencia", v)}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} size="lg">
          Voltar
        </Button>
        <Button onClick={() => validate() && onNext()} size="lg">
          Próximo
        </Button>
      </div>
    </div>
  );
};

export default Step2Documentos;
