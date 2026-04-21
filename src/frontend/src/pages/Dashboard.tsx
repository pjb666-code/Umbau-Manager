import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Euro,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserType } from "../backend";
import type { CostItem } from "../backend";
import { BaseDialog } from "../components/BaseDialog";
import { CalendarView } from "../components/CalendarView";
import { CostItemsSection } from "../components/CostItemsSection";
import { DynamicSelect } from "../components/DynamicSelect";
import {
  ProjectTimelineInput,
  type TimelineMode,
} from "../components/ProjectTimelineInput";
import { UpcomingTasksWidget } from "../components/UpcomingTasksWidget";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChangeTaskStatus,
  useCreateProject,
  useCreateTask,
  useGetAllContacts,
  useGetAllProjects,
  useGetCallerUserProfile,
  useGetKostenUebersicht,
  useGetPhasesByProject,
  useGetTasksByProject,
} from "../hooks/useQueries";
import {
  addBereich,
  addGewerke,
  addKategorie,
  getBereiche,
  getGewerke,
  getKategorien,
} from "../lib/customCategories";
import {
  isThisWeek,
  monthToTimestamps,
  validateMonthRange,
} from "../lib/dateUtils";
import { useFocusOnMount } from "../lib/focusManager";
import { setSelectedTaskId } from "../utils/urlParams";

interface DashboardProps {
  currentProjectId?: string | null;
}

export default function Dashboard({ currentProjectId }: DashboardProps) {
  const { data: projects, isLoading: _projectsLoading } = useGetPhasesByProject(
    currentProjectId ?? null,
  );
  const { data: allTasks = [] } = useGetTasksByProject(
    currentProjectId ?? null,
  );
  const { data: contacts = [] } = useGetAllContacts();
  const { data: kostenUebersicht } = useGetKostenUebersicht();
  const { data: userProfile } = useGetCallerUserProfile();
  const { identity } = useInternetIdentity();

  const [kategorienOptions, setKategorienOptions] = useState<string[]>(
    getKategorien(),
  );
  const [gewerkeOptions, setGewerkeOptions] = useState<string[]>(getGewerke());
  const [bereicheOptions, setBereicheOptions] = useState<string[]>(
    getBereiche(),
  );
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("exact");
  const [newProject, setNewProject] = useState({
    name: "",
    kunde: "",
    color: "#3b82f6",
    exactStartDate: "",
    exactEndDate: "",
    monthStartDate: "",
    monthEndDate: "",
    kategorie: "Allgemein",
    verantwortlicherKontakt: "none",
  });
  const [newTask, setNewTask] = useState({
    titel: "",
    beschreibung: "",
    gewerke: "none",
    dringlichkeit: "1",
    bereich: "none",
    kategorie: "",
    faelligkeitDate: "",
    faelligkeitTime: "",
    verantwortlicherKontakt: "none",
    projectId: "none",
  });

  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const _changeTaskStatus = useChangeTaskStatus();

  // Focus management
  const projectNameInputRef =
    useFocusOnMount<HTMLInputElement>(isCreateProjectOpen);
  const taskTitleInputRef = useFocusOnMount<HTMLInputElement>(isCreateTaskOpen);

  // Get user principal for cost items
  const userPrincipal = identity?.getPrincipal() || null;

  // Check if user is private (hide kunde field)
  const isPrivateUser = userProfile?.userType === UserType.privat;

  // Filter tasks by status
  const aufgabenTasks = useMemo(
    () => allTasks.filter((t) => t.status === "Aufgaben"),
    [allTasks],
  );
  const dieseWocheTasks = useMemo(
    () => allTasks.filter((t) => t.status === "Diese Woche"),
    [allTasks],
  );
  const feedbackTasks = useMemo(
    () => allTasks.filter((t) => t.status === "Benötigt Feedback"),
    [allTasks],
  );
  const erledigtTasks = useMemo(
    () => allTasks.filter((t) => t.status === "Erledigt"),
    [allTasks],
  );

  // Dynamic "Diese Woche" tasks based on due date
  const _thisWeekDueTasks = useMemo(() => {
    return allTasks.filter(
      (task) => task.status !== "Erledigt" && isThisWeek(task.faelligkeit),
    );
  }, [allTasks]);

  const totalTasks =
    aufgabenTasks.length + dieseWocheTasks.length + feedbackTasks.length;
  const completedTasks = erledigtTasks.length;

  const stats = [
    {
      title: "Aktive Phasen",
      value: projects?.length || 0,
      icon: Building2,
      description: "Laufende Bauphasen",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      borderColor: "border-t-4 border-blue-500",
      page: "roadmap" as const,
    },
    {
      title: "Offene Aufgaben",
      value: totalTasks,
      icon: Clock,
      description: "Zu erledigende Tasks",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950",
      borderColor: "border-t-4 border-amber-500",
      page: "tasks" as const,
      filter: "open",
    },
    {
      title: "Erledigt",
      value: completedTasks,
      icon: CheckCircle2,
      description: "Abgeschlossene Aufgaben",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950",
      borderColor: "border-t-4 border-green-500",
      page: "tasks" as const,
      filter: "completed",
    },
    {
      title: "Benötigt Feedback",
      value: feedbackTasks.length,
      icon: AlertCircle,
      description: "Warten auf Rückmeldung",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      borderColor: "border-t-4 border-purple-500",
      page: "tasks" as const,
      filter: "feedback",
    },
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields - only name is required, kategorie defaults to "Allgemein"
    if (!newProject.name.trim()) {
      toast.error("Bitte geben Sie einen Phasennamen ein");
      return;
    }

    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error("Kunde ist erforderlich");
      return;
    }

    if (!userPrincipal) {
      toast.error("Benutzer nicht authentifiziert");
      return;
    }

    // Require a project context to create a phase
    if (!currentProjectId) {
      toast.error("Bitte wählen Sie zuerst ein Projekt aus");
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
          toast.error("Enddatum kann nicht vor dem Startdatum liegen");
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
          toast.error("Endmonat kann nicht vor dem Startmonat liegen");
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
      kategorie: newProject.kategorie || "Allgemein",
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
      kategorie: "Allgemein",
      verantwortlicherKontakt: "none",
    });
    setCostItems([]);
    setTimelineMode("exact");
    setIsCreateProjectOpen(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTask.titel.trim() ||
      !newTask.gewerke ||
      newTask.gewerke === "none" ||
      !newTask.bereich ||
      newTask.bereich === "none" ||
      !newTask.faelligkeitDate
    ) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    const taskId = `task_${Date.now()}`;

    // Combine date and time
    let fälligkeitTimestamp: bigint;
    if (newTask.faelligkeitTime) {
      const dateTimeStr = `${newTask.faelligkeitDate}T${newTask.faelligkeitTime}`;
      fälligkeitTimestamp = BigInt(new Date(dateTimeStr).getTime() * 1000000);
    } else {
      // Default to start of day if no time specified
      fälligkeitTimestamp = BigInt(
        new Date(newTask.faelligkeitDate).getTime() * 1000000,
      );
    }

    await createTask.mutateAsync({
      id: taskId,
      titel: newTask.titel,
      beschreibung: newTask.beschreibung,
      gewerke: newTask.gewerke,
      status: "Aufgaben",
      dringlichkeit: BigInt(newTask.dringlichkeit),
      bereich: newTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: newTask.kategorie || "Allgemein",
      verantwortlicherKontakt:
        newTask.verantwortlicherKontakt === "none"
          ? null
          : newTask.verantwortlicherKontakt,
      projectId:
        newTask.projectId === "none"
          ? (currentProjectId ?? null)
          : newTask.projectId,
    });

    setNewTask({
      titel: "",
      beschreibung: "",
      gewerke: "none",
      dringlichkeit: "1",
      bereich: "none",
      kategorie: "",
      faelligkeitDate: "",
      faelligkeitTime: "",
      verantwortlicherKontakt: "none",
      projectId: "none",
    });
    setIsCreateTaskOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleAddKategorie = (newKat: string) => {
    addKategorie(newKat);
    setKategorienOptions(getKategorien());
  };

  const handleAddGewerke = (newGew: string) => {
    addGewerke(newGew);
    setGewerkeOptions(getGewerke());
  };

  const handleAddBereich = (newBer: string) => {
    addBereich(newBer);
    setBereicheOptions(getBereiche());
  };

  const handleStatCardClick = (
    page: "roadmap" | "tasks" | "kostenuebersicht",
    filter?: string,
  ) => {
    // This will be handled by App.tsx navigation
    const event = new CustomEvent("navigate", { detail: { page, filter } });
    window.dispatchEvent(event);
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    const event = new CustomEvent("navigate", { detail: { page: "tasks" } });
    window.dispatchEvent(event);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht über Ihre Bauprojekte und Aufgaben
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
            title="Neue Phase erstellen"
            description="Erstellen Sie eine neue Bauphase mit Kostenpunkten"
            trigger={
              <Button disabled={!currentProjectId}>
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
                <Label htmlFor="color">Phasenfarbe</Label>
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
                    Wählen Sie eine Farbe für diese Phase
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
                        {contact.name} {contact.firma && `(${contact.firma})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Items Section */}
              <CostItemsSection
                costItems={costItems}
                onChange={setCostItems}
                projectId={currentProjectId ?? ""}
                userPrincipal={userPrincipal}
              />

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateProjectOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? "Erstelle..." : "Phase erstellen"}
                </Button>
              </div>
            </form>
          </BaseDialog>

          <BaseDialog
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            title="Neue Aufgabe erstellen"
            description="Erstellen Sie eine neue Aufgabe für Ihr Projekt"
            trigger={
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Aufgabe erstellen
              </Button>
            }
          >
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titel">Titel *</Label>
                <Input
                  ref={taskTitleInputRef}
                  id="titel"
                  value={newTask.titel}
                  onChange={(e) =>
                    setNewTask({ ...newTask, titel: e.target.value })
                  }
                  placeholder="z.B. Dachziegel bestellen"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beschreibung">Beschreibung</Label>
                <Textarea
                  id="beschreibung"
                  value={newTask.beschreibung}
                  onChange={(e) =>
                    setNewTask({ ...newTask, beschreibung: e.target.value })
                  }
                  placeholder="Zusätzliche Details zur Aufgabe..."
                  rows={3}
                />
              </div>
              <DynamicSelect
                id="gewerke"
                label="Gewerke"
                value={newTask.gewerke}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, gewerke: value })
                }
                options={gewerkeOptions}
                onAddOption={handleAddGewerke}
                placeholder="Gewerke wählen..."
                required
              />
              <div className="space-y-2">
                <Label htmlFor="dringlichkeit">Dringlichkeit *</Label>
                <Select
                  value={newTask.dringlichkeit}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, dringlichkeit: value })
                  }
                >
                  <SelectTrigger id="dringlichkeit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Niedrig</SelectItem>
                    <SelectItem value="2">Mittel</SelectItem>
                    <SelectItem value="3">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DynamicSelect
                id="bereich"
                label="Bereich"
                value={newTask.bereich}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, bereich: value })
                }
                options={bereicheOptions}
                onAddOption={handleAddBereich}
                placeholder="Bereich wählen..."
                required
              />
              <div className="space-y-2">
                <Label htmlFor="kategorie">Kategorie</Label>
                <Input
                  id="kategorie"
                  value={newTask.kategorie}
                  onChange={(e) =>
                    setNewTask({ ...newTask, kategorie: e.target.value })
                  }
                  placeholder="z.B. Planung, Ausführung..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="faelligkeitDate">Fälligkeitsdatum *</Label>
                  <Input
                    id="faelligkeitDate"
                    type="date"
                    value={newTask.faelligkeitDate}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        faelligkeitDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faelligkeitTime">Uhrzeit</Label>
                  <Input
                    id="faelligkeitTime"
                    type="time"
                    value={newTask.faelligkeitTime}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        faelligkeitTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verantwortlicherKontakt">
                  Verantwortlicher Kontakt
                </Label>
                <Select
                  value={newTask.verantwortlicherKontakt}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, verantwortlicherKontakt: value })
                  }
                >
                  <SelectTrigger id="verantwortlicherKontakt">
                    <SelectValue placeholder="Kontakt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Kontakt</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.firma && `(${contact.firma})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Phase zuordnen</Label>
                <Select
                  value={newTask.projectId}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, projectId: value })
                  }
                >
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Phase wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Phase</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateTaskOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? "Erstelle..." : "Aufgabe erstellen"}
                </Button>
              </div>
            </form>
          </BaseDialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 ${stat.borderColor}`}
            onClick={() => handleStatCardClick(stat.page, stat.filter)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Overview Card */}
      {kostenUebersicht && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Kostenübersicht
            </CardTitle>
            <CardDescription>Gesamtübersicht aller Kosten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamtkosten</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(kostenUebersicht.gesamt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bezahlt</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(kostenUebersicht.bezahlt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(kostenUebersicht.offen)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks Widget */}
        <UpcomingTasksWidget
          tasks={allTasks}
          projects={projects}
          onTaskClick={handleTaskClick}
        />

        {/* Calendar View */}
        <CalendarView projects={projects || []} tasks={allTasks} />
      </div>
    </div>
  );
}
