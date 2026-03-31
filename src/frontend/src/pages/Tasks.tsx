import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Plus, Search, Trash2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Task } from "../backend";
import { BaseDialog } from "../components/BaseDialog";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { DynamicSelect } from "../components/DynamicSelect";
import {
  useChangeTaskStatus,
  useCreateTask,
  useDeleteTask,
  useGetAllContacts,
  useGetAllProjects,
  useGetPhasesByProject,
  useGetTasksByProject,
  useUpdateTask,
} from "../hooks/useQueries";
import {
  addBereich,
  addGewerke,
  getBereiche,
  getGewerke,
} from "../lib/customCategories";
import { useFocusOnMount } from "../lib/focusManager";
import { getAndClearSelectedTaskId } from "../utils/urlParams";

type TaskStatus = "Aufgaben" | "Diese Woche" | "Benötigt Feedback" | "Erledigt";

// Extended task type for editing with temporary date/time fields
type EditingTask = Task & {
  faelligkeitDate: string;
  faelligkeitTime: string;
};

export default function Tasks({
  currentProjectId,
}: { currentProjectId?: string | null }) {
  const { data: allTasks = [], isLoading: _isLoading } = useGetTasksByProject(
    currentProjectId ?? null,
  );
  const { data: projects = [] } = useGetAllProjects();
  const { data: phases = [] } = useGetPhasesByProject(currentProjectId ?? null);
  const { data: contacts = [] } = useGetAllContacts();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const changeTaskStatus = useChangeTaskStatus();

  const [gewerkeOptions, setGewerkeOptions] = useState<string[]>(getGewerke());
  const [bereicheOptions, setBereicheOptions] = useState<string[]>(
    getBereiche(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGewerke, setFilterGewerke] = useState<string>("all");
  const [filterBereich, setFilterBereich] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  // Focus management
  const createTitleInputRef = useFocusOnMount<HTMLInputElement>(isCreateOpen);
  const editTitleInputRef = useFocusOnMount<HTMLInputElement>(!!editingTask);

  // Check for selected task from Dashboard on mount
  useEffect(() => {
    const taskId = getAndClearSelectedTaskId();
    if (taskId) {
      setSelectedTaskId(taskId);
      // Scroll to task after a short delay to ensure rendering
      setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        task.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.beschreibung.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGewerke =
        filterGewerke === "all" || task.gewerke === filterGewerke;
      const matchesBereich =
        filterBereich === "all" || task.bereich === filterBereich;
      const matchesProject =
        filterProject === "all" || task.projectId === filterProject;
      return (
        matchesSearch && matchesGewerke && matchesBereich && matchesProject
      );
    });
  }, [allTasks, searchQuery, filterGewerke, filterBereich, filterProject]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      Aufgaben: [],
      "Diese Woche": [],
      "Benötigt Feedback": [],
      Erledigt: [],
    };
    for (const task of filteredTasks) {
      if (task.status in groups) {
        groups[task.status as TaskStatus].push(task);
      }
    }
    return groups;
  }, [filteredTasks]);

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
      toast.error("Please fill in all required fields");
      return;
    }

    const taskId = `task_${Date.now()}`;

    let fälligkeitTimestamp: bigint;
    if (newTask.faelligkeitTime) {
      const dateTimeStr = `${newTask.faelligkeitDate}T${newTask.faelligkeitTime}`;
      fälligkeitTimestamp = BigInt(new Date(dateTimeStr).getTime() * 1000000);
    } else {
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
      projectId: currentProjectId ?? null, // Always use top-level project ID
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
    setIsCreateOpen(false);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const dateStr = editingTask.faelligkeitDate || "";
    const timeStr = editingTask.faelligkeitTime || "";

    let fälligkeitTimestamp: bigint;
    if (timeStr) {
      const dateTimeStr = `${dateStr}T${timeStr}`;
      fälligkeitTimestamp = BigInt(new Date(dateTimeStr).getTime() * 1000000);
    } else {
      fälligkeitTimestamp = BigInt(new Date(dateStr).getTime() * 1000000);
    }

    await updateTask.mutateAsync({
      id: editingTask.id,
      titel: editingTask.titel,
      beschreibung: editingTask.beschreibung,
      gewerke: editingTask.gewerke,
      status: editingTask.status,
      dringlichkeit: editingTask.dringlichkeit,
      bereich: editingTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: editingTask.kategorie,
      verantwortlicherKontakt: editingTask.verantwortlicherKontakt || null,
      projectId: currentProjectId ?? null, // Always use top-level project ID
    });

    setEditingTask(null);
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    await deleteTask.mutateAsync(deletingTask.id);
    setDeletingTask(null);
  };

  const _handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await changeTaskStatus.mutateAsync({ taskId, newStatus });
  };

  const handleAddGewerke = (newGew: string) => {
    addGewerke(newGew);
    setGewerkeOptions(getGewerke());
  };

  const handleAddBereich = (newBer: string) => {
    addBereich(newBer);
    setBereicheOptions(getBereiche());
  };

  const formatDateTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const dateStr = date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr}, ${timeStr}`;
  };

  const extractDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toISOString().split("T")[0];
  };

  const extractTime = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toTimeString().slice(0, 5);
  };

  const getDringlichkeitColor = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return "bg-red-500";
    if (level === 2) return "bg-orange-500";
    return "bg-green-500";
  };

  const _getDringlichkeitLabel = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return "Hoch";
    if (level === 2) return "Mittel";
    return "Niedrig";
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return "Nicht zugewiesen";
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? contact.name : "Unbekannt";
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "Keine Phase";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "Unbekannt";
  };

  const statusColumns: { status: TaskStatus; title: string; color: string }[] =
    [
      {
        status: "Aufgaben",
        title: "Aufgaben",
        color: "border-gray-300 dark:border-gray-700",
      },
      {
        status: "Diese Woche",
        title: "Diese Woche",
        color: "border-blue-300 dark:border-blue-700",
      },
      {
        status: "Benötigt Feedback",
        title: "Benötigt Feedback",
        color: "border-orange-300 dark:border-orange-700",
      },
      {
        status: "Erledigt",
        title: "Erledigt",
        color: "border-green-300 dark:border-green-700",
      },
    ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Ihre Aufgaben im Kanban-Board
          </p>
        </div>
        <BaseDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          title="Neue Aufgabe erstellen"
          description="Erstellen Sie eine neue Aufgabe für Ihr Projekt"
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aufgabe erstellen
            </Button>
          }
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel *</Label>
              <Input
                ref={createTitleInputRef}
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
                    setNewTask({ ...newTask, faelligkeitDate: e.target.value })
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
                    setNewTask({ ...newTask, faelligkeitTime: e.target.value })
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
                  {phases.map((project) => (
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
                onClick={() => setIsCreateOpen(false)}
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Suche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Aufgaben durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterGewerke">Gewerke</Label>
              <Select value={filterGewerke} onValueChange={setFilterGewerke}>
                <SelectTrigger id="filterGewerke">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Gewerke</SelectItem>
                  {gewerkeOptions.map((gew) => (
                    <SelectItem key={gew} value={gew}>
                      {gew}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterBereich">Bereich</Label>
              <Select value={filterBereich} onValueChange={setFilterBereich}>
                <SelectTrigger id="filterBereich">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bereiche</SelectItem>
                  {bereicheOptions.map((ber) => (
                    <SelectItem key={ber} value={ber}>
                      {ber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterProject">Phase</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger id="filterProject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Phasen</SelectItem>
                  {phases.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusColumns.map(({ status, title, color }) => (
          <Card key={status} className={`border-t-4 ${color}`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                {title}
                <Badge variant="secondary">
                  {tasksByStatus[status].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksByStatus[status].map((task) => (
                <Card
                  key={task.id}
                  id={`task-${task.id}`}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTaskId === task.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setEditingTask({
                      ...task,
                      faelligkeitDate: extractDate(task.faelligkeit),
                      faelligkeitTime: extractTime(task.faelligkeit),
                    });
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{task.titel}</h3>
                      <div
                        className={`w-2 h-2 rounded-full ${getDringlichkeitColor(task.dringlichkeit)} shrink-0 mt-1`}
                      />
                    </div>
                    {task.beschreibung && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.beschreibung}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.gewerke}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.bereich}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateTime(task.faelligkeit)}</span>
                      </div>
                      {task.projectId && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Phase:</span>
                          <span>{getProjectName(task.projectId)}</span>
                        </div>
                      )}
                      {task.verantwortlicherKontakt && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {getContactName(task.verantwortlicherKontakt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tasksByStatus[status].length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine Aufgaben
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <BaseDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          title="Aufgabe bearbeiten"
          description="Bearbeiten Sie die Details dieser Aufgabe"
        >
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-titel">Titel *</Label>
              <Input
                ref={editTitleInputRef}
                id="edit-titel"
                value={editingTask.titel}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, titel: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-beschreibung">Beschreibung</Label>
              <Textarea
                id="edit-beschreibung"
                value={editingTask.beschreibung}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    beschreibung: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={editingTask.status}
                onValueChange={(value) =>
                  setEditingTask({ ...editingTask, status: value })
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aufgaben">Aufgaben</SelectItem>
                  <SelectItem value="Diese Woche">Diese Woche</SelectItem>
                  <SelectItem value="Benötigt Feedback">
                    Benötigt Feedback
                  </SelectItem>
                  <SelectItem value="Erledigt">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DynamicSelect
              id="edit-gewerke"
              label="Gewerke"
              value={editingTask.gewerke}
              onValueChange={(value) =>
                setEditingTask({ ...editingTask, gewerke: value })
              }
              options={gewerkeOptions}
              onAddOption={handleAddGewerke}
              placeholder="Gewerke wählen..."
              required
            />
            <div className="space-y-2">
              <Label htmlFor="edit-dringlichkeit">Dringlichkeit *</Label>
              <Select
                value={String(editingTask.dringlichkeit)}
                onValueChange={(value) =>
                  setEditingTask({
                    ...editingTask,
                    dringlichkeit: BigInt(value),
                  })
                }
              >
                <SelectTrigger id="edit-dringlichkeit">
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
              id="edit-bereich"
              label="Bereich"
              value={editingTask.bereich}
              onValueChange={(value) =>
                setEditingTask({ ...editingTask, bereich: value })
              }
              options={bereicheOptions}
              onAddOption={handleAddBereich}
              placeholder="Bereich wählen..."
              required
            />
            <div className="space-y-2">
              <Label htmlFor="edit-kategorie">Kategorie</Label>
              <Input
                id="edit-kategorie"
                value={editingTask.kategorie}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, kategorie: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-faelligkeitDate">Fälligkeitsdatum *</Label>
                <Input
                  id="edit-faelligkeitDate"
                  type="date"
                  value={editingTask.faelligkeitDate}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      faelligkeitDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-faelligkeitTime">Uhrzeit</Label>
                <Input
                  id="edit-faelligkeitTime"
                  type="time"
                  value={editingTask.faelligkeitTime}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      faelligkeitTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-verantwortlicherKontakt">
                Verantwortlicher Kontakt
              </Label>
              <Select
                value={editingTask.verantwortlicherKontakt || "none"}
                onValueChange={(value) =>
                  setEditingTask({
                    ...editingTask,
                    verantwortlicherKontakt:
                      value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger id="edit-verantwortlicherKontakt">
                  <SelectValue />
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
              <Label htmlFor="edit-projectId">Phase zuordnen</Label>
              <Select
                value={editingTask.projectId || "none"}
                onValueChange={(value) =>
                  setEditingTask({
                    ...editingTask,
                    projectId: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger id="edit-projectId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Phase</SelectItem>
                  {phases.map((project) => (
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
                variant="destructive"
                onClick={() => {
                  setDeletingTask(editingTask);
                  setEditingTask(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTask(null)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "Speichere..." : "Speichern"}
              </Button>
            </div>
          </form>
        </BaseDialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Aufgabe löschen"
        description="Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={deletingTask?.titel}
        isPending={deleteTask.isPending}
      />
    </div>
  );
}
