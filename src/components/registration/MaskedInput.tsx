import { IMaskInput } from "react-imask";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface MaskedInputProps {
  mask: string;
  value: string;
  onAccept: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onAccept, placeholder, className, id }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        value={value}
        unmask={false}
        onAccept={(val: string) => onAccept(val)}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        id={id}
        inputRef={ref as any}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";
export default MaskedInput;
