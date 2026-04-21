import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectSession } from "../hooks/useProjectSession";
import { useGetTopLevelProjects } from "../hooks/useQueries";

interface ProjectDropdownProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateNew: () => void;
}

export default function ProjectDropdown({
  currentProjectId,
  onProjectSelect,
  onCreateNew,
}: ProjectDropdownProps) {
  const { data: projects = [], isLoading, isError } = useGetTopLevelProjects();
  const { setLastUsedProjectId } = useProjectSession();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleValueChange = (value: string) => {
    if (value === "__create_new__") {
      onCreateNew();
    } else {
      setLastUsedProjectId(value);
      onProjectSelect(value);
    }
  };

  if (isError) {
    toast.error("Fehler beim Laden der Projekte");
  }

  return (
    <Select
      value={currentProjectId || undefined}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[220px] bg-muted/60 dark:bg-muted/40 border border-border shadow-sm font-medium rounded-lg px-3 py-2 hover:bg-muted transition-colors">
        <SelectValue placeholder={isLoading ? "Lädt..." : "Projekt wählen"}>
          {currentProject ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0 ring-1 ring-border/50"
                style={{ backgroundColor: currentProject.color || "#3b82f6" }}
              />
              <span className="truncate font-medium">
                {currentProject.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Kein Projekt</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {projects.length === 0 && !isLoading ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Keine Projekte vorhanden
          </div>
        ) : (
          projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color || "#3b82f6" }}
                />
                <span className="truncate">{project.name}</span>
              </div>
            </SelectItem>
          ))
        )}
        <Separator className="my-1" />
        <SelectItem value="__create_new__">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Plus className="h-4 w-4" />
            <span>Neues Projekt erstellen</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
