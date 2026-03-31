import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Calendar, Plus } from "lucide-react";
import { useGetTopLevelProjects } from "../hooks/useQueries";

interface ProjectSelectionProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  onProjectSelect?: (projectId: string) => void;
}

export default function ProjectSelection({
  onNavigate,
  onBack,
  onProjectSelect,
}: ProjectSelectionProps) {
  const { data: projects, isLoading } = useGetTopLevelProjects();

  const handleProjectClick = (projectId: string) => {
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else if (onNavigate) {
      onNavigate("dashboard");
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate("welcome");
    }
  };

  const handleCreateNew = () => {
    if (onNavigate) {
      onNavigate("welcome");
    }
  };

  const formatDate = (timestamp: bigint | undefined) => {
    if (!timestamp) return null;
    const date = new Date(Number(timestamp / BigInt(1000000)));
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
            data-ocid="project-selection.back.button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Ihre Projekte</h1>
          <p className="text-muted-foreground mt-2">
            Wählen Sie ein Projekt aus, um fortzufahren
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-ocid="project-selection.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="cursor-pointer hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && projects && projects.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-ocid="project-selection.list"
          >
            {projects.map((project, index) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] duration-200"
                onClick={() => handleProjectClick(project.id)}
                data-ocid={`project-selection.item.${index + 1}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {project.name}
                      </CardTitle>
                      {project.kunde && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {project.kunde}
                        </p>
                      )}
                    </div>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: project.color }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.kategorie && (
                    <Badge variant="secondary" className="text-xs">
                      {project.kategorie}
                    </Badge>
                  )}

                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(project.startDate) || "—"} bis{" "}
                        {formatDate(project.endDate) || "—"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Building2 className="w-4 h-4" />
                    <span>Projekt öffnen</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Project Card */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] duration-200 border-dashed"
              onClick={handleCreateNew}
              data-ocid="project-selection.create_new.card"
            >
              <CardHeader>
                <div className="flex items-center justify-center h-full py-6">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Neues Projekt erstellen
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Starten Sie ein neues Bauprojekt
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && projects && projects.length === 0 && (
          <Card className="p-12" data-ocid="project-selection.empty_state">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Keine Projekte gefunden
                </h3>
                <p className="text-muted-foreground">
                  Sie haben noch keine Projekte erstellt. Erstellen Sie Ihr
                  erstes Projekt, um zu beginnen.
                </p>
              </div>
              <Button
                onClick={handleBack}
                data-ocid="project-selection.back_empty.button"
              >
                Zurück zur Startseite
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
