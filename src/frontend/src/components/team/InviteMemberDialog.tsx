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
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../../backend";
import { useCreateInviteToken } from "../../hooks/useQueries";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const createInviteToken = useCreateInviteToken();
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = generatedToken
    ? `${window.location.origin}/apply?invite=${generatedToken}`
    : "";

  const handleGenerateInvite = async () => {
    try {
      const token = await createInviteToken.mutateAsync(selectedRole);
      setGeneratedToken(token);
    } catch (error) {
      console.error("Generate invite error:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Einladungslink kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Fehler beim Kopieren");
    }
  };

  const handleClose = () => {
    setGeneratedToken(null);
    setSelectedRole(UserRole.user);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mitglied einladen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen Einladungslink, um ein neues Mitglied
            hinzuzufügen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Rolle *</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.admin}>Admin</SelectItem>
                    <SelectItem value={UserRole.user}>
                      Member - Can Edit
                    </SelectItem>
                    <SelectItem value={UserRole.guest}>
                      Viewer - Read Only
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedRole === UserRole.admin &&
                    "Volle Berechtigung zum Verwalten von Projekten und Team"}
                  {selectedRole === UserRole.user &&
                    "Kann Projekte und Aufgaben bearbeiten"}
                  {selectedRole === UserRole.guest &&
                    "Nur Lesezugriff auf Projekte"}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleGenerateInvite}
                  disabled={createInviteToken.isPending}
                >
                  {createInviteToken.isPending
                    ? "Erstelle..."
                    : "Einladungslink erzeugen"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Einladungslink</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Teilen Sie diesen Link mit der Person, die Sie einladen
                  möchten. Der Link kann nur einmal verwendet werden.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>Fertig</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
