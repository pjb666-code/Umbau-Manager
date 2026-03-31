import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useProjectSession } from "../hooks/useProjectSession";
import { useJoinFamily } from "../hooks/useQueries";
import { clearUrlParameter, getUrlParameter } from "../utils/urlParams";

interface ApplyInviteProps {
  onSuccess: (projectId?: string) => void;
}

export default function ApplyInvite({ onSuccess }: ApplyInviteProps) {
  const { identity, isInitializing } = useInternetIdentity();
  const joinFamily = useJoinFamily();
  const { setLastUsedProjectId: _setLastUsedProjectId } = useProjectSession();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processInvite = async () => {
      if (isInitializing) return;

      if (!identity) {
        setStatus("error");
        setErrorMessage(
          "Sie müssen angemeldet sein, um eine Einladung anzunehmen.",
        );
        return;
      }

      const inviteToken = getUrlParameter("invite");
      if (!inviteToken) {
        setStatus("error");
        setErrorMessage("Kein Einladungscode gefunden.");
        return;
      }

      try {
        await joinFamily.mutateAsync(inviteToken);
        clearUrlParameter("invite");
        setStatus("success");

        // Note: The backend doesn't return a project ID from validateInviteCode
        // So we pass undefined and let the parent component handle navigation
        setTimeout(() => onSuccess(undefined), 2000);
      } catch (error: any) {
        console.error("Invite claim error:", error);
        setStatus("error");
        setErrorMessage(
          error.message ||
            "Fehler beim Beitreten zum Projekt. Der Code könnte ungültig oder bereits verwendet sein.",
        );
      }
    };

    processInvite();
  }, [identity, isInitializing, joinFamily, onSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Einladung verarbeiten</CardTitle>
          <CardDescription className="text-center">
            {status === "processing" &&
              "Bitte warten Sie, während wir Ihre Einladung verarbeiten..."}
            {status === "success" && "Erfolgreich dem Projekt beigetreten!"}
            {status === "error" && "Es ist ein Fehler aufgetreten"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "processing" && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                Verarbeite Einladung...
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Sie wurden erfolgreich zum Projekt hinzugefügt. Sie werden
                weitergeleitet...
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-sm text-destructive text-center">
                {errorMessage}
              </p>
              <Button onClick={() => onSuccess(undefined)} className="mt-4">
                Zurück zur Startseite
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
