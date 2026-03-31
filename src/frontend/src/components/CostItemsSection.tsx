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
import type { Principal } from "@icp-sdk/core/principal";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CostItem } from "../backend";

interface CostItemsSectionProps {
  costItems: CostItem[];
  onChange: (items: CostItem[]) => void;
  projectId: string;
  userPrincipal: Principal | null;
}

const COST_CATEGORIES = [
  "Energie",
  "Ausstattung",
  "Material",
  "Arbeit",
  "Planung",
  "Sonstiges",
];
const COST_STATUS = ["geplant", "bezahlt", "offen"];

export function CostItemsSection({
  costItems,
  onChange,
  projectId,
  userPrincipal,
}: CostItemsSectionProps) {
  const [newItem, setNewItem] = useState({
    beschreibung: "",
    betrag: "",
    kategorie: "Material",
    status: "geplant",
  });

  const handleAddItem = () => {
    if (!newItem.beschreibung.trim() || !newItem.betrag || !userPrincipal)
      return;

    const costItem: CostItem = {
      id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      beschreibung: newItem.beschreibung.trim(),
      betrag: Number.parseFloat(newItem.betrag),
      kategorie: newItem.kategorie,
      status: newItem.status,
      datum: BigInt(Date.now() * 1000000),
      projektId: projectId,
      owner: userPrincipal,
    };

    onChange([...costItems, costItem]);
    setNewItem({
      beschreibung: "",
      betrag: "",
      kategorie: "Material",
      status: "geplant",
    });
  };

  const handleRemoveItem = (id: string) => {
    onChange(costItems.filter((item) => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const totalCost = costItems.reduce((sum, item) => sum + item.betrag, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Kostenpunkte</Label>
        {costItems.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            Gesamt: {formatCurrency(totalCost)}
          </span>
        )}
      </div>

      {/* Existing Cost Items */}
      {costItems.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
          {costItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2 bg-background rounded border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.beschreibung}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {item.kategorie}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold">
                  {formatCurrency(item.betrag)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveItem(item.id)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Cost Item */}
      <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
        <p className="text-sm font-medium">Neuen Kostenpunkt hinzufügen</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cost-beschreibung" className="text-xs">
              Beschreibung
            </Label>
            <Input
              id="cost-beschreibung"
              value={newItem.beschreibung}
              onChange={(e) =>
                setNewItem({ ...newItem, beschreibung: e.target.value })
              }
              placeholder="z.B. Solaranlage Installation"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-betrag" className="text-xs">
              Betrag (€)
            </Label>
            <Input
              id="cost-betrag"
              type="number"
              step="0.01"
              min="0"
              value={newItem.betrag}
              onChange={(e) =>
                setNewItem({ ...newItem, betrag: e.target.value })
              }
              placeholder="0.00"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-kategorie" className="text-xs">
              Kategorie
            </Label>
            <Select
              value={newItem.kategorie}
              onValueChange={(value) =>
                setNewItem({ ...newItem, kategorie: value })
              }
            >
              <SelectTrigger id="cost-kategorie" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-status" className="text-xs">
              Status
            </Label>
            <Select
              value={newItem.status}
              onValueChange={(value) =>
                setNewItem({ ...newItem, status: value })
              }
            >
              <SelectTrigger id="cost-status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddItem}
              disabled={
                !newItem.beschreibung.trim() ||
                !newItem.betrag ||
                !userPrincipal
              }
              className="w-full h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Kostenpunkt hinzufügen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
