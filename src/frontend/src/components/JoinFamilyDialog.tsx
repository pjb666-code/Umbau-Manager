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
import { useJoinFamily } from "../hooks/useQueries";

interface JoinFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function JoinFamilyDialog({
  open,
  onOpenChange,
  onSuccess,
}: JoinFamilyDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const joinFamily = useJoinFamily();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError("Bitte geben Sie einen Einladungscode ein");
      return;
    }

    try {
      await joinFamily.mutateAsync(inviteCode.trim());
      setInviteCode("");
      onOpenChange(false);

      // Navigate to dashboard after successful join
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Join project error:", err);
      if (err.message?.includes("Invalid or expired")) {
        setError("Ungültiger oder abgelaufener Einladungscode");
      } else if (err.message?.includes("already used")) {
        setError("Dieser Einladungscode wurde bereits verwendet");
      } else {
        setError("Fehler beim Beitreten. Bitte versuchen Sie es erneut.");
      }
    }
  };

  const handleClose = () => {
    setInviteCode("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt beitreten</DialogTitle>
          <DialogDescription>
            Geben Sie den Einladungscode ein, den Sie von Ihrem Projekt erhalten
            haben
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Einladungscode *</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="z.B. token_1234567890"
                disabled={joinFamily.isPending}
              />
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
              disabled={joinFamily.isPending}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={joinFamily.isPending || !inviteCode.trim()}
            >
              {joinFamily.isPending ? "Trete bei..." : "Beitreten"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
