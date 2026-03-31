import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Shield, Zap } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Umbau-Manager V2
            </h1>
            <p className="text-xl text-muted-foreground">
              Professionelles Projektmanagement für Ihren Hausumbau
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Zentrale Projektverwaltung
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verwalten Sie alle Phasen, Aufgaben und Dokumente an einem Ort
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Effiziente Workflows</h3>
                <p className="text-sm text-muted-foreground">
                  Kanban-Board, Timeline und intelligente Filterung für maximale
                  Produktivität
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sichere Datenhaltung</h3>
                <p className="text-sm text-muted-foreground">
                  Ihre Daten werden sicher auf der Internet Computer Blockchain
                  gespeichert
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
            <CardDescription>
              Melden Sie sich mit Internet Identity an, um fortzufahren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Anmeldung läuft...
                </>
              ) : (
                "Mit Internet Identity anmelden"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Durch die Anmeldung stimmen Sie unseren Nutzungsbedingungen zu
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
