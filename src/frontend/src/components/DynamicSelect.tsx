import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DynamicSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  onAddOption: (newOption: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DynamicSelect({
  id,
  value,
  onValueChange,
  options,
  onAddOption,
  placeholder = "Wählen...",
  label,
  required = false,
  disabled = false,
}: DynamicSelectProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");

  const handleAddOption = () => {
    const trimmed = newOptionValue.trim();
    if (!trimmed) {
      toast.error("Bitte geben Sie einen Wert ein");
      return;
    }
    if (options.includes(trimmed)) {
      toast.error("Dieser Wert existiert bereits");
      return;
    }
    onAddOption(trimmed);
    onValueChange(trimmed);
    setNewOptionValue("");
    setIsAddDialogOpen(false);
    toast.success("Erfolgreich hinzugefügt");
  };

  return (
    <>
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id}>
            {label} {required && "*"}
          </Label>
        )}
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" disabled>
              {placeholder}
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <button
              type="button"
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 border-t mt-1 pt-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-medium">Neu hinzufügen...</span>
            </button>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Neuen Wert hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Wert zur Liste hinzu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newOption">Neuer Wert</Label>
              <Input
                id="newOption"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                placeholder="z.B. Neuer Bereich"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="button" onClick={handleAddOption}>
                Hinzufügen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
