import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useCreateProject } from "../hooks/useQueries";

const PROJECT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (projectId: string) => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const createProject = useCreateProject();
  const { isFetching: actorLoading } = useActor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte geben Sie einen Projektnamen ein");
      return;
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await createProject.mutateAsync({
        id: projectId,
        name: trimmed,
        kunde: null,
        color,
        start: null,
        end: null,
        kategorie: "",
        verantwortlicherKontakt: null,
        costItems: [],
        parentProjectId: null,
      });
      setName("");
      setColor(PROJECT_COLORS[0]);
      onOpenChange(false);
      onSuccess(projectId);
    } catch (error: unknown) {
      console.error("Create project error:", error);
      const err = error as { message?: string };
      setError(
        err?.message ||
          "Fehler beim Erstellen des Projekts. Bitte versuchen Sie es erneut.",
      );
    }
  };

  const handleClose = () => {
    setName("");
    setColor(PROJECT_COLORS[0]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-ocid="create-project.dialog">
        <DialogHeader>
          <DialogTitle>Neues Projekt erstellen</DialogTitle>
          <DialogDescription>
            {actorLoading
              ? "Verbindung wird hergestellt..."
              : "Geben Sie einen Namen für Ihr neues Bauprojekt ein."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Projektname *</Label>
              <Input
                id="projectName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Renovierung Haus1"
                disabled={createProject.isPending || actorLoading}
                autoFocus
                data-ocid="create-project.input"
              />
            </div>

            <div className="space-y-2">
              <Label>Projektfarbe</Label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#000" : "transparent",
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProject.isPending}
              data-ocid="create-project.cancel_button"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending || !name.trim() || actorLoading}
              data-ocid="create-project.submit_button"
            >
              {actorLoading
                ? "Laden..."
                : createProject.isPending
                  ? "Erstellt..."
                  : "Projekt erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
