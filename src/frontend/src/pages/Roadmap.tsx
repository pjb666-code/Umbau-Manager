import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Edit,
  List,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserType } from "../backend";
import type { CostItem, Project } from "../backend";
import { BaseDialog } from "../components/BaseDialog";
import { CalendarView } from "../components/CalendarView";
import { CostItemsSection } from "../components/CostItemsSection";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { DynamicSelect } from "../components/DynamicSelect";
import {
  ProjectTimelineInput,
  type TimelineMode,
} from "../components/ProjectTimelineInput";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateProject,
  useDeleteProject,
  useGetAllContacts,
  useGetAllCostItems,
  useGetAllProjects,
  useGetAllTasks,
  useGetCallerUserProfile,
  useGetPhasesByProject,
  useUpdateProject,
} from "../hooks/useQueries";
import { addKategorie, getKategorien } from "../lib/customCategories";
import {
  formatDateRangeSmart,
  isFullMonthRange,
  monthToTimestamps,
  timestampToMonth,
  validateMonthRange,
} from "../lib/dateUtils";
import { useFocusOnMount } from "../lib/focusManager";

interface RoadmapProps {
  currentProjectId?: string | null;
}

export default function Roadmap({ currentProjectId }: RoadmapProps) {
  const { data: projects, isLoading } = useGetPhasesByProject(
    currentProjectId ?? null,
  );
  const { data: contacts = [] } = useGetAllContacts();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: tasks = [] } = useGetAllTasks();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [kategorienOptions, setKategorienOptions] = useState<string[]>(
    getKategorien(),
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [editCostItems, setEditCostItems] = useState<CostItem[]>([]);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("exact");
  const [editTimelineMode, setEditTimelineMode] =
    useState<TimelineMode>("exact");
  const [newProject, setNewProject] = useState({
    name: "",
    kunde: "",
    color: "#3b82f6",
    exactStartDate: "",
    exactEndDate: "",
    monthStartDate: "",
    monthEndDate: "",
    kategorie: "none",
    verantwortlicherKontakt: "none",
  });

  // Focus management - persistent refs that don't remount
  const projectNameInputRef =
    useFocusOnMount<HTMLInputElement>(isCreateProjectOpen);
  const editNameInputRef = useFocusOnMount<HTMLInputElement>(isEditOpen);

  // Get user principal for cost items
  const userPrincipal = identity?.getPrincipal() || null;

  // Check if user is private (hide kunde field)
  const isPrivateUser = userProfile?.userType === UserType.privat;

  const filteredProjects = selectedCategory
    ? projects?.filter((p) => p.kategorie === selectedCategory)
    : projects;

  const _formatDate = (timestamp?: bigint) => {
    if (!timestamp) return null;
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateForInput = (timestamp?: bigint) => {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp) / 1000000);
    return date.toISOString().split("T")[0];
  };

  const getContactName = (contactId?: string): string | null => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c.id === contactId);
    return contact?.name ?? null;
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // FIX: Guard - phases must belong to a project. If no project is selected, abort.
    if (!currentProjectId) {
      toast.error(
        "Kein Projekt ausgewählt. Bitte wählen Sie zuerst ein Projekt aus.",
      );
      return;
    }

    // Validate required fields
    if (
      !newProject.name.trim() ||
      !newProject.kategorie ||
      newProject.kategorie === "none"
    ) {
      toast.error("Project name and category are required");
      return;
    }

    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error("Customer is required");
      return;
    }

    if (!userPrincipal) {
      toast.error("User not authenticated");
      return;
    }

    let startTimestamp: bigint | null = null;
    let endTimestamp: bigint | null = null;

    // Handle timeline based on mode
    if (timelineMode === "exact") {
      // Validate date range only if both dates are provided
      if (newProject.exactStartDate && newProject.exactEndDate) {
        const start = new Date(newProject.exactStartDate);
        const end = new Date(newProject.exactEndDate);
        if (end < start) {
          toast.error("End date cannot be before start date");
          return;
        }
        startTimestamp = BigInt(start.getTime() * 1000000);
        endTimestamp = BigInt(end.getTime() * 1000000);
      } else if (newProject.exactStartDate) {
        startTimestamp = BigInt(
          new Date(newProject.exactStartDate).getTime() * 1000000,
        );
      } else if (newProject.exactEndDate) {
        endTimestamp = BigInt(
          new Date(newProject.exactEndDate).getTime() * 1000000,
        );
      }
    } else {
      // Month range mode
      if (newProject.monthStartDate && newProject.monthEndDate) {
        if (
          !validateMonthRange(
            newProject.monthStartDate,
            newProject.monthEndDate,
          )
        ) {
          toast.error("End month cannot be before start month");
          return;
        }
        const startRange = monthToTimestamps(newProject.monthStartDate);
        const endRange = monthToTimestamps(newProject.monthEndDate);
        startTimestamp = startRange.start;
        endTimestamp = endRange.end;
      } else if (newProject.monthStartDate) {
        const startRange = monthToTimestamps(newProject.monthStartDate);
        startTimestamp = startRange.start;
      } else if (newProject.monthEndDate) {
        const endRange = monthToTimestamps(newProject.monthEndDate);
        endTimestamp = endRange.end;
      }
    }

    const projectId = `project_${Date.now()}`;

    // Ensure all cost items have the correct owner before submission
    const validatedCostItems = costItems.map((item) => ({
      ...item,
      owner: userPrincipal,
      projektId: projectId,
    }));

    await createProject.mutateAsync({
      id: projectId,
      name: newProject.name,
      kunde: isPrivateUser ? null : newProject.kunde,
      color: newProject.color,
      start: startTimestamp,
      end: endTimestamp,
      kategorie: newProject.kategorie,
      verantwortlicherKontakt:
        newProject.verantwortlicherKontakt === "none"
          ? null
          : newProject.verantwortlicherKontakt,
      costItems: validatedCostItems,
      parentProjectId: currentProjectId,
    });

    setNewProject({
      name: "",
      kunde: "",
      color: "#3b82f6",
      exactStartDate: "",
      exactEndDate: "",
      monthStartDate: "",
      monthEndDate: "",
      kategorie: "none",
      verantwortlicherKontakt: "none",
    });
    setCostItems([]);
    setTimelineMode("exact");
    setIsCreateProjectOpen(false);
  };

  const handleEditClick = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);

    // Detect if this is a month-range project
    const isMonthRange =
      project.startDate &&
      project.endDate &&
      isFullMonthRange(project.startDate, project.endDate);

    setNewProject({
      name: project.name,
      kunde: project.kunde,
      color: project.color || "#3b82f6",
      exactStartDate: formatDateForInput(project.startDate),
      exactEndDate: formatDateForInput(project.endDate),
      monthStartDate: project.startDate
        ? timestampToMonth(project.startDate)
        : "",
      monthEndDate: project.endDate ? timestampToMonth(project.endDate) : "",
      kategorie: project.kategorie,
      verantwortlicherKontakt: project.verantwortlicherKontakt || "none",
    });

    setEditTimelineMode(isMonthRange ? "month" : "exact");

    // Load existing cost items for this project using the actor from component level
    try {
      if (actor) {
        const existingCostItems = await actor.getKostenpunkteByProjekt(
          project.id,
        );
        setEditCostItems(existingCostItems);
      } else {
        setEditCostItems([]);
      }
    } catch (error) {
      console.error("Error loading cost items:", error);
      setEditCostItems([]);
    }

    setIsEditOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !projectToEdit ||
      !newProject.name.trim() ||
      !newProject.kategorie ||
      newProject.kategorie === "none"
    ) {
      toast.error("Project name and category are required");
      return;
    }

    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error("Customer is required");
      return;
    }

    if (!userPrincipal) {
      toast.error("User not authenticated");
      return;
    }

    let startTimestamp: bigint | null = null;
    let endTimestamp: bigint | null = null;

    // Handle timeline based on mode
    if (editTimelineMode === "exact") {
      // Validate date range only if both dates are provided
      if (newProject.exactStartDate && newProject.exactEndDate) {
        const start = new Date(newProject.exactStartDate);
        const end = new Date(newProject.exactEndDate);
        if (end < start) {
          toast.error("End date cannot be before start date");
          return;
        }
        startTimestamp = BigInt(start.getTime() * 1000000);
        endTimestamp = BigInt(end.getTime() * 1000000);
      } else if (newProject.exactStartDate) {
        startTimestamp = BigInt(
          new Date(newProject.exactStartDate).getTime() * 1000000,
        );
      } else if (newProject.exactEndDate) {
        endTimestamp = BigInt(
          new Date(newProject.exactEndDate).getTime() * 1000000,
        );
      }
    } else {
      // Month range mode
      if (newProject.monthStartDate && newProject.monthEndDate) {
        if (
          !validateMonthRange(
            newProject.monthStartDate,
            newProject.monthEndDate,
          )
        ) {
          toast.error("End month cannot be before start month");
          return;
        }
        const startRange = monthToTimestamps(newProject.monthStartDate);
        const endRange = monthToTimestamps(newProject.monthEndDate);
        startTimestamp = startRange.start;
        endTimestamp = endRange.end;
      } else if (newProject.monthStartDate) {
        const startRange = monthToTimestamps(newProject.monthStartDate);
        startTimestamp = startRange.start;
      } else if (newProject.monthEndDate) {
        const endRange = monthToTimestamps(newProject.monthEndDate);
        endTimestamp = endRange.end;
      }
    }

    // Ensure all cost items have the correct owner before submission
    const validatedCostItems = editCostItems.map((item) => ({
      ...item,
      owner: userPrincipal,
      projektId: projectToEdit.id,
    }));

    await updateProject.mutateAsync({
      id: projectToEdit.id,
      name: newProject.name,
      kunde: isPrivateUser ? null : newProject.kunde,
      color: newProject.color,
      start: startTimestamp,
      end: endTimestamp,
      kategorie: newProject.kategorie,
      verantwortlicherKontakt:
        newProject.verantwortlicherKontakt === "none"
          ? null
          : newProject.verantwortlicherKontakt,
      costItems: validatedCostItems,
    });

    setNewProject({
      name: "",
      kunde: "",
      color: "#3b82f6",
      exactStartDate: "",
      exactEndDate: "",
      monthStartDate: "",
      monthEndDate: "",
      kategorie: "none",
      verantwortlicherKontakt: "none",
    });
    setEditCostItems([]);
    setProjectToEdit(null);
    setEditTimelineMode("exact");
    setIsEditOpen(false);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleAddKategorie = (newKat: string) => {
    addKategorie(newKat);
    setKategorienOptions(getKategorien());
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#6366f1",
      "#84cc16",
    ];
    return colors[index % colors.length];
  };

  const getCategoryProjects = (category: string) => {
    return projects?.filter((p) => p.kategorie === category) || [];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht der Phasen dieses Projekts
          </p>
        </div>
        <div className="flex gap-2">
          <BaseDialog
            open={isCreateProjectOpen}
            onOpenChange={(open) => {
              setIsCreateProjectOpen(open);
              if (!open) {
                setCostItems([]);
                setTimelineMode("exact");
              }
            }}
            title="Phase hinzufügen"
            description="Erstellen Sie eine neue Phase für dieses Projekt"
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Phase hinzufügen
              </Button>
            }
          >
            <form
              onSubmit={handleCreateProject}
              className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Phasenname *</Label>
                <Input
                  ref={projectNameInputRef}
                  id="name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="z.B. Dachsanierung Hauptgebäude"
                  required
                />
              </div>
              {!isPrivateUser && (
                <div className="space-y-2">
                  <Label htmlFor="kunde">Kunde *</Label>
                  <Input
                    id="kunde"
                    value={newProject.kunde}
                    onChange={(e) =>
                      setNewProject({ ...newProject, kunde: e.target.value })
                    }
                    placeholder="Kundenname"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="color">Projektfarbe</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="color"
                    type="color"
                    value={newProject.color}
                    onChange={(e) =>
                      setNewProject({ ...newProject, color: e.target.value })
                    }
                    className="h-10 w-20 rounded border border-input cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    Wählen Sie eine Farbe für dieses Projekt
                  </span>
                </div>
              </div>

              <ProjectTimelineInput
                mode={timelineMode}
                onModeChange={setTimelineMode}
                exactStartDate={newProject.exactStartDate}
                exactEndDate={newProject.exactEndDate}
                monthStartDate={newProject.monthStartDate}
                monthEndDate={newProject.monthEndDate}
                onExactStartChange={(value) =>
                  setNewProject({ ...newProject, exactStartDate: value })
                }
                onExactEndChange={(value) =>
                  setNewProject({ ...newProject, exactEndDate: value })
                }
                onMonthStartChange={(value) =>
                  setNewProject({ ...newProject, monthStartDate: value })
                }
                onMonthEndChange={(value) =>
                  setNewProject({ ...newProject, monthEndDate: value })
                }
              />

              <DynamicSelect
                id="kategorie"
                label="Kategorie"
                value={newProject.kategorie}
                onValueChange={(value) =>
                  setNewProject({ ...newProject, kategorie: value })
                }
                options={kategorienOptions}
                onAddOption={handleAddKategorie}
                placeholder="Kategorie wählen..."
                required
              />
              <div className="space-y-2">
                <Label htmlFor="verantwortlicherKontakt">
                  Verantwortlicher Kontakt
                </Label>
                <Select
                  value={newProject.verantwortlicherKontakt}
                  onValueChange={(value) =>
                    setNewProject({
                      ...newProject,
                      verantwortlicherKontakt: value,
                    })
                  }
                >
                  <SelectTrigger id="verantwortlicherKontakt">
                    <SelectValue placeholder="Kontakt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Kontakt</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <CostItemsSection
                costItems={costItems}
                onChange={setCostItems}
                projectId="temp_project_id"
                userPrincipal={userPrincipal}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateProjectOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Erstelle..." : "Phase hinzufügen"}
                </Button>
              </div>
            </form>
          </BaseDialog>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "list" | "calendar")}
          >
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Kalender
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView projects={projects || []} tasks={tasks} />
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Alle
            </Button>
            {kategorienOptions.map((cat, idx) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  backgroundColor:
                    selectedCategory === cat
                      ? getCategoryColor(idx)
                      : undefined,
                  borderColor: getCategoryColor(idx),
                  color:
                    selectedCategory === cat ? "white" : getCategoryColor(idx),
                }}
              >
                {cat} ({getCategoryProjects(cat).length})
              </Button>
            ))}
          </div>

          {/* Projects List */}
          <div className="space-y-4">
            {filteredProjects && filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                return (
                  <Card key={project.id} className="overflow-hidden">
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleProjectExpansion(project.id)}
                    >
                      <CardHeader
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleProjectExpansion(project.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <div
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{
                                backgroundColor: project.color || "#3b82f6",
                              }}
                            />
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {project.name}
                              </CardTitle>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{project.kunde}</span>
                                <Badge variant="outline">
                                  {project.kategorie}
                                </Badge>
                                {(project.startDate || project.endDate) && (
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {formatDateRangeSmart(
                                      project.startDate,
                                      project.endDate,
                                    )}
                                  </span>
                                )}
                                {project.verantwortlicherKontakt && (
                                  <span>
                                    Kontakt:{" "}
                                    {getContactName(
                                      project.verantwortlicherKontakt,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleEditClick(project, e)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteClick(project, e)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Weitere Details zum Projekt können hier angezeigt
                              werden.
                            </p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {selectedCategory
                      ? `Keine Projekte in der Kategorie "${selectedCategory}" gefunden.`
                      : "Noch keine Phasen vorhanden. Fügen Sie die erste Phase hinzu!"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Edit Project Dialog */}
      <BaseDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setProjectToEdit(null);
            setEditCostItems([]);
            setEditTimelineMode("exact");
          }
        }}
        title="Phase bearbeiten"
        description="Bearbeiten Sie die Phasendetails und Kostenpunkte"
      >
        <form
          onSubmit={handleUpdateProject}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-name">Phasenname *</Label>
            <Input
              ref={editNameInputRef}
              id="edit-name"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              placeholder="z.B. Dachsanierung Hauptgebäude"
              required
            />
          </div>
          {!isPrivateUser && (
            <div className="space-y-2">
              <Label htmlFor="edit-kunde">Kunde *</Label>
              <Input
                id="edit-kunde"
                value={newProject.kunde}
                onChange={(e) =>
                  setNewProject({ ...newProject, kunde: e.target.value })
                }
                placeholder="Kundenname"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-color">Projektfarbe</Label>
            <div className="flex items-center gap-3">
              <input
                id="edit-color"
                type="color"
                value={newProject.color}
                onChange={(e) =>
                  setNewProject({ ...newProject, color: e.target.value })
                }
                className="h-10 w-20 rounded border border-input cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                Wählen Sie eine Farbe für dieses Projekt
              </span>
            </div>
          </div>

          <ProjectTimelineInput
            mode={editTimelineMode}
            onModeChange={setEditTimelineMode}
            exactStartDate={newProject.exactStartDate}
            exactEndDate={newProject.exactEndDate}
            monthStartDate={newProject.monthStartDate}
            monthEndDate={newProject.monthEndDate}
            onExactStartChange={(value) =>
              setNewProject({ ...newProject, exactStartDate: value })
            }
            onExactEndChange={(value) =>
              setNewProject({ ...newProject, exactEndDate: value })
            }
            onMonthStartChange={(value) =>
              setNewProject({ ...newProject, monthStartDate: value })
            }
            onMonthEndChange={(value) =>
              setNewProject({ ...newProject, monthEndDate: value })
            }
          />

          <DynamicSelect
            id="edit-kategorie"
            label="Kategorie"
            value={newProject.kategorie}
            onValueChange={(value) =>
              setNewProject({ ...newProject, kategorie: value })
            }
            options={kategorienOptions}
            onAddOption={handleAddKategorie}
            placeholder="Kategorie wählen..."
            required
          />
          <div className="space-y-2">
            <Label htmlFor="edit-verantwortlicherKontakt">
              Verantwortlicher Kontakt
            </Label>
            <Select
              value={newProject.verantwortlicherKontakt}
              onValueChange={(value) =>
                setNewProject({ ...newProject, verantwortlicherKontakt: value })
              }
            >
              <SelectTrigger id="edit-verantwortlicherKontakt">
                <SelectValue placeholder="Kontakt wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Kontakt</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CostItemsSection
            costItems={editCostItems}
            onChange={setEditCostItems}
            projectId={projectToEdit?.id || "temp_project_id"}
            userPrincipal={userPrincipal}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending
                ? "Speichere..."
                : "Änderungen speichern"}
            </Button>
          </div>
        </form>
      </BaseDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Phase löschen"
        description="Sind Sie sicher, dass Sie diese Phase löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={projectToDelete?.name}
        isPending={deleteProject.isPending}
      />
    </div>
  );
}
