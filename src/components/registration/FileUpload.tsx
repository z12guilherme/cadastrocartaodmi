import { Upload, Check, X } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  label: string;
  value: string | null;
  onChange: (base64: string | null) => void;
}

const FileUpload = ({ label, value, onChange }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
          <Check className="w-5 h-5 text-[#64E627] flex-shrink-0" />
          <span className="text-sm text-secondary-foreground truncate flex-1">
            Arquivo enviado
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-[#0EA5FF] hover:bg-secondary/50 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Arraste ou toque para enviar
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
