import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, FolderOpen, LogOut, Users } from "lucide-react";
import { useState } from "react";
import CreateProjectDialog from "../components/CreateProjectDialog";
import JoinFamilyDialog from "../components/JoinFamilyDialog";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface WelcomeScreenProps {
  onNavigate: (page: string) => void;
  onProjectCreated?: (projectId: string) => void;
}

export default function WelcomeScreen({
  onNavigate,
  onProjectCreated,
}: WelcomeScreenProps) {
  const { clear, loginStatus } = useInternetIdentity();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleLogout = async () => {
    await clear();
  };

  const handleJoinSuccess = () => {
    setIsJoinDialogOpen(false);
    onNavigate("dashboard");
  };

  const handleProjectCreated = (projectId: string) => {
    if (onProjectCreated) {
      onProjectCreated(projectId);
    } else {
      onNavigate("dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Building2 className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Willkommen im Umbau Manager
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verwalten Sie Ihre Bauprojekte effizient und behalten Sie den
            Überblick über alle Aufgaben, Dokumente und Kosten.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Create New Project */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setIsCreateDialogOpen(true)}
            data-ocid="welcome.create_project.card"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Neues Projekt erstellen</CardTitle>
              <CardDescription>
                Starten Sie ein neues Bauprojekt und definieren Sie Phasen,
                Aufgaben und Budgets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="default"
                data-ocid="welcome.create_project.button"
              >
                Projekt erstellen
              </Button>
            </CardContent>
          </Card>

          {/* Return to Existing Project */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate("project-selection")}
            data-ocid="welcome.return_project.card"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Zu bestehendem Projekt zurückkehren</CardTitle>
              <CardDescription>
                Öffnen Sie ein bereits vorhandenes Projekt und arbeiten Sie
                weiter daran.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                data-ocid="welcome.return_project.button"
              >
                Projekt öffnen
              </Button>
            </CardContent>
          </Card>

          {/* Join Existing Project */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setIsJoinDialogOpen(true)}
            data-ocid="welcome.join_project.card"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Bestehendem Projekt beitreten</CardTitle>
              <CardDescription>
                Treten Sie einem bestehenden Projekt bei, indem Sie einen
                Einladungscode eingeben.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                data-ocid="welcome.join_project.button"
              >
                Projekt beitreten
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logout Button */}
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={loginStatus === "logging-in"}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="welcome.logout.button"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />

      {/* Join Project Dialog */}
      <JoinFamilyDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
