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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Calculator,
  Euro,
  FileText,
  Filter,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { CostItem, DocumentId, Project } from "../backend";
import { UserType } from "../backend";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UnifiedPDFViewer } from "../components/UnifiedPDFViewer";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddKostenpunkt,
  useDeleteKostenpunkt,
  useGetAllDocuments,
  useGetAllKostenpunkte,
  useGetAllMedia,
  useGetAllProjects,
  useGetCostItemsByProjectQuery,
  useGetTopLevelProjects,
  useUpdateKostenpunkt,
} from "../hooks/useQueries";

interface EditingState {
  id: string;
  field: "betrag" | "kategorie" | "status" | "handwerker" | "dokumentId";
  value: string;
}

const COST_CATEGORIES = [
  "Energie",
  "Ausstattung",
  "Material",
  "Arbeit",
  "Planung",
  "Sonstiges",
];
const COST_STATUS = ["geplant", "bezahlt", "offen"];

type SortField = "betrag" | "datum" | "beschreibung";
type SortOrder = "asc" | "desc";

export default function Kostenuebersicht({
  currentProjectId,
}: { currentProjectId?: string | null }) {
  const { data: costItems = [], isLoading: costItemsLoading } =
    useGetCostItemsByProjectQuery(currentProjectId ?? null);
  const { data: topLevelProjects = [] } = useGetTopLevelProjects();
  const { data: projects = [], isLoading: projectsLoading } =
    useGetAllProjects();
  const { data: documents = [], isLoading: documentsLoading } =
    useGetAllDocuments();
  const { data: media = [], isLoading: mediaLoading } = useGetAllMedia();
  const { identity } = useInternetIdentity();
  const updateKostenpunkt = useUpdateKostenpunkt();
  const addKostenpunkt = useAddKostenpunkt();
  const deleteKostenpunkt = useDeleteKostenpunkt();

  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [addingToProject, setAddingToProject] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("datum");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>("");
  const [selectedDocumentTitle, setSelectedDocumentTitle] =
    useState<string>("");

  const [newCostItem, setNewCostItem] = useState({
    beschreibung: "",
    betrag: "",
    kategorie: "Material",
    status: "geplant",
    handwerker: "",
    dokumentId: "none",
  });

  // Kreditrechner state
  const [kredit, setKredit] = useState({
    kreditsumme: "",
    zinssatz: "",
    laufzeit: "",
  });

  const kreditErgebnis = useMemo(() => {
    const summe = Number.parseFloat(kredit.kreditsumme);
    const zins = Number.parseFloat(kredit.zinssatz);
    const jahre = Number.parseFloat(kredit.laufzeit);
    if (
      !summe ||
      !jahre ||
      summe <= 0 ||
      jahre <= 0 ||
      Number.isNaN(summe) ||
      Number.isNaN(zins) ||
      Number.isNaN(jahre)
    )
      return null;
    const n = jahre * 12;
    let monatlicheRate: number;
    if (!zins || zins === 0) {
      monatlicheRate = summe / n;
    } else {
      const r = zins / 100 / 12;
      monatlicheRate = (summe * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
    }
    const gesamtbetrag = monatlicheRate * n;
    const gesamtzinsen = gesamtbetrag - summe;
    return { monatlicheRate, gesamtzinsen, gesamtbetrag };
  }, [kredit]);

  const isLoading =
    costItemsLoading || projectsLoading || documentsLoading || mediaLoading;
  const userPrincipal = identity?.getPrincipal() || null;

  // Create a map of project IDs to project names
  const projectMap = new Map<string, Project>();
  for (const project of projects) {
    projectMap.set(project.id, project);
  }

  // Create a map of document IDs to document names and URLs
  const documentMap = new Map<
    string,
    { name: string; url: string; type: string }
  >();
  for (const doc of documents) {
    documentMap.set(doc.id, {
      name: doc.name,
      url: doc.blob.getDirectURL(),
      type: doc.typ,
    });
  }
  for (const m of media) {
    documentMap.set(m.id, {
      name: m.name,
      url: m.blob.getDirectURL(),
      type: m.typ,
    });
  }

  // Filter cost items by status
  const filteredCostItems = costItems.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  // Sort cost items
  const sortedCostItems = [...filteredCostItems].sort((a, b) => {
    let comparison = 0;

    if (sortField === "betrag") {
      comparison = a.betrag - b.betrag;
    } else if (sortField === "datum") {
      comparison = Number(a.datum - b.datum);
    } else if (sortField === "beschreibung") {
      comparison = a.beschreibung.localeCompare(b.beschreibung);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Group cost items by project
  const groupedCostItems = sortedCostItems.reduce(
    (acc, item) => {
      const projectId = item.projektId;
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(item);
      return acc;
    },
    {} as Record<string, CostItem[]>,
  );

  // Calculate project summaries
  const projectSummaries = Object.entries(groupedCostItems).map(
    ([projectId, items]) => {
      const gesamt = items.reduce((sum, item) => sum + item.betrag, 0);
      const bezahlt = items.reduce(
        (sum, item) => (item.status === "bezahlt" ? sum + item.betrag : sum),
        0,
      );
      const offen = gesamt - bezahlt;
      return { projectId, gesamt, bezahlt, offen };
    },
  );

  // Calculate total sum
  const totalSum = sortedCostItems.reduce((sum, item) => sum + item.betrag, 0);
  const totalBezahlt = sortedCostItems.reduce(
    (sum, item) => (item.status === "bezahlt" ? sum + item.betrag : sum),
    0,
  );
  const totalOffen = totalSum - totalBezahlt;

  const handleStartEdit = (
    id: string,
    field: "betrag" | "kategorie" | "status" | "handwerker" | "dokumentId",
    currentValue: string | number | undefined,
  ) => {
    setEditingState({
      id,
      field,
      value: currentValue !== undefined ? String(currentValue) : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingState(null);
  };

  const handleSaveEdit = async (item: CostItem) => {
    if (!editingState) return;

    try {
      let updatedItem = { ...item };

      if (editingState.field === "betrag") {
        const newBetrag = Number.parseFloat(editingState.value);
        if (Number.isNaN(newBetrag) || newBetrag < 0) {
          toast.error("Bitte geben Sie einen gültigen Betrag ein");
          return;
        }
        updatedItem.betrag = newBetrag;
      } else if (editingState.field === "kategorie") {
        updatedItem.kategorie = editingState.value.trim();
        if (!updatedItem.kategorie) {
          toast.error("Kategorie darf nicht leer sein");
          return;
        }
      } else if (editingState.field === "status") {
        updatedItem.status = editingState.value;
      } else if (editingState.field === "handwerker") {
        updatedItem.handwerker = editingState.value.trim() || undefined;
      } else if (editingState.field === "dokumentId") {
        updatedItem.dokumentId =
          editingState.value === "none"
            ? undefined
            : (editingState.value as DocumentId);
      }

      await updateKostenpunkt.mutateAsync({
        projectId: item.projektId,
        costId: item.id,
        costItem: updatedItem,
      });

      setEditingState(null);
    } catch (error) {
      console.error("Error updating cost item:", error);
    }
  };

  const handleValueChange = (value: string) => {
    if (editingState) {
      setEditingState({ ...editingState, value });
    }
  };

  const handleAddCostItem = async (projectId: string) => {
    if (
      !newCostItem.beschreibung.trim() ||
      !newCostItem.betrag ||
      !userPrincipal
    ) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    const costItem: CostItem = {
      id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      beschreibung: newCostItem.beschreibung.trim(),
      betrag: Number.parseFloat(newCostItem.betrag),
      kategorie: newCostItem.kategorie,
      status: newCostItem.status,
      datum: BigInt(Date.now() * 1000000),
      projektId: projectId,
      handwerker: newCostItem.handwerker.trim() || undefined,
      dokumentId:
        newCostItem.dokumentId === "none"
          ? undefined
          : (newCostItem.dokumentId as DocumentId),
      owner: userPrincipal,
    };

    try {
      await addKostenpunkt.mutateAsync({
        projectId: projectId,
        costItem: costItem,
      });

      setNewCostItem({
        beschreibung: "",
        betrag: "",
        kategorie: "Material",
        status: "geplant",
        handwerker: "",
        dokumentId: "none",
      });
      setAddingToProject(null);
    } catch (error) {
      console.error("Error adding cost item:", error);
    }
  };

  const handleDeleteCostItem = async (
    projectId: string,
    costItemId: string,
  ) => {
    if (!confirm("Möchten Sie diesen Kostenpunkt wirklich löschen?")) return;

    try {
      await deleteKostenpunkt.mutateAsync({
        projectId: projectId,
        costItemId: costItemId,
      });
    } catch (error) {
      console.error("Error deleting cost item:", error);
    }
  };

  const handleDocumentClick = (dokumentId: string) => {
    const doc = documentMap.get(dokumentId);
    if (!doc) {
      toast.error("Dokument nicht gefunden");
      return;
    }

    setSelectedDocumentUrl(doc.url);
    setSelectedDocumentTitle(doc.name);
    setPdfViewerOpen(true);
  };

  const _toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const renderEditableCell = (
    item: CostItem,
    field: "betrag" | "kategorie" | "status" | "handwerker" | "dokumentId",
    displayValue: string | number | undefined,
  ) => {
    const isEditing =
      editingState?.id === item.id && editingState?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {field === "status" ? (
            <Select
              value={editingState.value}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field === "kategorie" ? (
            <Select
              value={editingState.value}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field === "dokumentId" ? (
            <Select
              value={editingState.value}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="h-8 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Dokument</SelectItem>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
                {media.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={field === "betrag" ? "number" : "text"}
              value={editingState.value}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-8 w-32"
              step={field === "betrag" ? "0.01" : undefined}
              min={field === "betrag" ? "0" : undefined}
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => handleSaveEdit(item)}
            disabled={updateKostenpunkt.isPending}
          >
            {updateKostenpunkt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCancelEdit}
            disabled={updateKostenpunkt.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (field === "dokumentId" && displayValue) {
      const doc = documentMap.get(displayValue as string);
      return (
        <button
          type="button"
          onClick={() => handleDocumentClick(displayValue as string)}
          className="text-left hover:bg-accent/50 px-2 py-1 rounded transition-colors w-full flex items-center gap-2 text-primary hover:underline"
        >
          <FileText className="h-3 w-3" />
          {doc?.name || "Unbekanntes Dokument"}
        </button>
      );
    }

    const formattedValue =
      field === "betrag"
        ? formatCurrency(Number(displayValue))
        : displayValue || "-";

    return (
      <button
        type="button"
        onClick={() => handleStartEdit(item.id, field, displayValue)}
        className="text-left hover:bg-accent/50 px-2 py-1 rounded transition-colors w-full"
      >
        {formattedValue}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Lade Kostendaten...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Kostenübersicht
              {currentProjectId &&
              topLevelProjects.find((p) => p.id === currentProjectId)
                ? ` — ${topLevelProjects.find((p) => p.id === currentProjectId)!.name}`
                : ""}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentProjectId
                ? "Projektbezogene Kostenübersicht"
                : "Verwalten Sie alle Kosten Ihrer Projekte"}
            </p>
          </div>
          {currentProjectId && (
            <button
              type="button"
              onClick={() => setAddingToProject(currentProjectId)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              + Kostenpunkt hinzufügen
            </button>
          )}
        </div>

        {/* Filters and Sorting */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Status:
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="bezahlt">Bezahlt</SelectItem>
                    <SelectItem value="offen">Offen</SelectItem>
                    <SelectItem value="geplant">Geplant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sort-field" className="text-sm font-medium">
                  Sortieren nach:
                </Label>
                <Select
                  value={sortField}
                  onValueChange={(value) => setSortField(value as SortField)}
                >
                  <SelectTrigger id="sort-field" className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="datum">Datum</SelectItem>
                    <SelectItem value="betrag">Betrag</SelectItem>
                    <SelectItem value="beschreibung">Beschreibung</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alle Kostenpunkte</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Standalone add form - shown even when no items exist yet */}
            {addingToProject === currentProjectId &&
              currentProjectId &&
              sortedCostItems.length === 0 && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-beschreibung-empty">
                          Beschreibung *
                        </Label>
                        <Input
                          id="new-beschreibung-empty"
                          value={newCostItem.beschreibung}
                          onChange={(e) =>
                            setNewCostItem({
                              ...newCostItem,
                              beschreibung: e.target.value,
                            })
                          }
                          placeholder="z.B. Materialkosten"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-betrag-empty">Betrag (€) *</Label>
                        <Input
                          id="new-betrag-empty"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newCostItem.betrag}
                          onChange={(e) =>
                            setNewCostItem({
                              ...newCostItem,
                              betrag: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-kategorie-empty">Kategorie *</Label>
                        <Select
                          value={newCostItem.kategorie}
                          onValueChange={(value) =>
                            setNewCostItem({ ...newCostItem, kategorie: value })
                          }
                        >
                          <SelectTrigger id="new-kategorie-empty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COST_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-status-empty">Status *</Label>
                        <Select
                          value={newCostItem.status}
                          onValueChange={(value) =>
                            setNewCostItem({ ...newCostItem, status: value })
                          }
                        >
                          <SelectTrigger id="new-status-empty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COST_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-handwerker-empty">Handwerker</Label>
                        <Input
                          id="new-handwerker-empty"
                          value={newCostItem.handwerker}
                          onChange={(e) =>
                            setNewCostItem({
                              ...newCostItem,
                              handwerker: e.target.value,
                            })
                          }
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-dokument-empty">Dokument</Label>
                        <Select
                          value={newCostItem.dokumentId}
                          onValueChange={(value) =>
                            setNewCostItem({
                              ...newCostItem,
                              dokumentId: value,
                            })
                          }
                        >
                          <SelectTrigger id="new-dokument-empty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kein Dokument</SelectItem>
                            {documents.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.name}
                              </SelectItem>
                            ))}
                            {media.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleAddCostItem(currentProjectId)}
                        disabled={addKostenpunkt.isPending}
                      >
                        {addKostenpunkt.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Wird hinzugefügt...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Hinzufügen
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAddingToProject(null)}
                        disabled={addKostenpunkt.isPending}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            {sortedCostItems.length === 0 ? (
              <div className="text-center py-16">
                <Euro className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">
                  Keine Kostenpunkte vorhanden
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {statusFilter !== "all"
                    ? "Keine Kostenpunkte mit diesem Status gefunden"
                    : currentProjectId
                      ? "Klicken Sie auf '+ Kostenpunkt hinzufügen' um den ersten Kostenpunkt zu erstellen"
                      : "Wählen Sie ein Projekt aus um Kostenpunkte zu sehen"}
                </p>
                {currentProjectId &&
                  statusFilter === "all" &&
                  !addingToProject && (
                    <button
                      type="button"
                      onClick={() => setAddingToProject(currentProjectId)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      + Kostenpunkt hinzufügen
                    </button>
                  )}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedCostItems).map(
                  ([projectId, items], groupIndex) => {
                    const project = projectMap.get(projectId);
                    const projectName = project?.name || "Unbekanntes Projekt";
                    const isEvenGroup = groupIndex % 2 === 0;
                    const summary = projectSummaries.find(
                      (s) => s.projectId === projectId,
                    );

                    return (
                      <div key={projectId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-primary">
                            {projectName}
                          </h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAddingToProject(
                                addingToProject === projectId
                                  ? null
                                  : projectId,
                              )
                            }
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Kostenpunkt hinzufügen
                          </Button>
                        </div>

                        {/* Add New Cost Item Form */}
                        {addingToProject === projectId && (
                          <Card className="mb-4">
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-beschreibung">
                                    Beschreibung *
                                  </Label>
                                  <Input
                                    id="new-beschreibung"
                                    value={newCostItem.beschreibung}
                                    onChange={(e) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        beschreibung: e.target.value,
                                      })
                                    }
                                    placeholder="z.B. Materialkosten"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-betrag">
                                    Betrag (€) *
                                  </Label>
                                  <Input
                                    id="new-betrag"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newCostItem.betrag}
                                    onChange={(e) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        betrag: e.target.value,
                                      })
                                    }
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-kategorie">
                                    Kategorie *
                                  </Label>
                                  <Select
                                    value={newCostItem.kategorie}
                                    onValueChange={(value) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        kategorie: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger id="new-kategorie">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {COST_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                          {cat}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-status">Status *</Label>
                                  <Select
                                    value={newCostItem.status}
                                    onValueChange={(value) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        status: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger id="new-status">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {COST_STATUS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          {status.charAt(0).toUpperCase() +
                                            status.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-handwerker">
                                    Handwerker
                                  </Label>
                                  <Input
                                    id="new-handwerker"
                                    value={newCostItem.handwerker}
                                    onChange={(e) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        handwerker: e.target.value,
                                      })
                                    }
                                    placeholder="Optional"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="new-dokument">Dokument</Label>
                                  <Select
                                    value={newCostItem.dokumentId}
                                    onValueChange={(value) =>
                                      setNewCostItem({
                                        ...newCostItem,
                                        dokumentId: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger id="new-dokument">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Kein Dokument
                                      </SelectItem>
                                      {documents.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id}>
                                          {doc.name}
                                        </SelectItem>
                                      ))}
                                      {media.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => handleAddCostItem(projectId)}
                                  disabled={addKostenpunkt.isPending}
                                >
                                  {addKostenpunkt.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Wird hinzugefügt...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Hinzufügen
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setAddingToProject(null)}
                                  disabled={addKostenpunkt.isPending}
                                >
                                  Abbrechen
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Project Summary */}
                        {summary && (
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-sm text-muted-foreground">
                                  Gesamt
                                </div>
                                <div className="text-2xl font-bold">
                                  {formatCurrency(summary.gesamt)}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-sm text-muted-foreground">
                                  Bezahlt
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                  {formatCurrency(summary.bezahlt)}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-sm text-muted-foreground">
                                  Offen
                                </div>
                                <div className="text-2xl font-bold text-orange-600">
                                  {formatCurrency(summary.offen)}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Cost Items Table */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow
                                className={isEvenGroup ? "bg-muted/50" : ""}
                              >
                                <TableHead className="w-[200px]">
                                  Beschreibung
                                </TableHead>
                                <TableHead className="w-[120px]">
                                  Betrag
                                </TableHead>
                                <TableHead className="w-[120px]">
                                  Kategorie
                                </TableHead>
                                <TableHead className="w-[100px]">
                                  Status
                                </TableHead>
                                <TableHead className="w-[120px]">
                                  Datum
                                </TableHead>
                                <TableHead className="w-[150px]">
                                  Handwerker
                                </TableHead>
                                <TableHead className="w-[200px]">
                                  Dokument
                                </TableHead>
                                <TableHead className="w-[80px]">
                                  Aktionen
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item) => (
                                <TableRow
                                  key={item.id}
                                  className={
                                    isEvenGroup ? "hover:bg-muted/30" : ""
                                  }
                                >
                                  <TableCell className="font-medium">
                                    {item.beschreibung}
                                  </TableCell>
                                  <TableCell>
                                    {renderEditableCell(
                                      item,
                                      "betrag",
                                      item.betrag,
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderEditableCell(
                                      item,
                                      "kategorie",
                                      item.kategorie,
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {renderEditableCell(
                                        item,
                                        "status",
                                        item.status,
                                      )}
                                      <Badge
                                        variant={
                                          item.status === "bezahlt"
                                            ? "default"
                                            : item.status === "offen"
                                              ? "destructive"
                                              : "secondary"
                                        }
                                        className="ml-2"
                                      >
                                        {item.status.charAt(0).toUpperCase() +
                                          item.status.slice(1)}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {new Date(
                                      Number(item.datum / BigInt(1000000)),
                                    ).toLocaleDateString("de-DE")}
                                  </TableCell>
                                  <TableCell>
                                    {renderEditableCell(
                                      item,
                                      "handwerker",
                                      item.handwerker,
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderEditableCell(
                                      item,
                                      "dokumentId",
                                      item.dokumentId,
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteCostItem(projectId, item.id)
                                      }
                                      disabled={deleteKostenpunkt.isPending}
                                    >
                                      {deleteKostenpunkt.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Summary */}
        {sortedCostItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gesamtübersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Gesamt</div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(totalSum)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bezahlt</div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(totalBezahlt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Offen</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {formatCurrency(totalOffen)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Viewer */}
        <UnifiedPDFViewer
          open={pdfViewerOpen}
          onOpenChange={setPdfViewerOpen}
          pdfUrl={selectedDocumentUrl}
          title={selectedDocumentTitle}
        />

        {/* Kreditrechner */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium px-2">
              <Calculator className="h-4 w-4" />
              Kreditrechner
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calculator className="h-5 w-5 text-primary" />
                Kreditrechner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="kredit-summe"
                      className="text-sm font-medium"
                    >
                      Kreditsumme
                    </Label>
                    <div className="relative">
                      <Input
                        id="kredit-summe"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="z.B. 200000"
                        value={kredit.kreditsumme}
                        onChange={(e) =>
                          setKredit({ ...kredit, kreditsumme: e.target.value })
                        }
                        className="pr-8"
                        data-ocid="kredit-summe"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        €
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="kredit-zinssatz"
                      className="text-sm font-medium"
                    >
                      Zinssatz p.a.
                    </Label>
                    <div className="relative">
                      <Input
                        id="kredit-zinssatz"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="z.B. 3.5"
                        value={kredit.zinssatz}
                        onChange={(e) =>
                          setKredit({ ...kredit, zinssatz: e.target.value })
                        }
                        className="pr-8"
                        data-ocid="kredit-zinssatz"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="kredit-laufzeit"
                      className="text-sm font-medium"
                    >
                      Laufzeit
                    </Label>
                    <div className="relative">
                      <Input
                        id="kredit-laufzeit"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="z.B. 20"
                        value={kredit.laufzeit}
                        onChange={(e) =>
                          setKredit({ ...kredit, laufzeit: e.target.value })
                        }
                        className="pr-14"
                        data-ocid="kredit-laufzeit"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        Jahre
                      </span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="flex flex-col justify-center">
                  {kreditErgebnis ? (
                    <div className="space-y-3" data-ocid="kredit-ergebnis">
                      <div className="rounded-xl border bg-primary/5 p-5 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Monatliche Rate
                          </div>
                          <div className="text-3xl font-bold text-primary mt-1">
                            {formatCurrency(kreditErgebnis.monatlicheRate)}
                          </div>
                        </div>
                        <Euro className="h-8 w-8 text-primary/30" />
                      </div>
                      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Gesamtzinsen
                          </div>
                          <div className="text-xl font-semibold text-orange-600 mt-0.5">
                            {formatCurrency(kreditErgebnis.gesamtzinsen)}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Gesamtbetrag
                          </div>
                          <div className="text-xl font-semibold mt-0.5">
                            {formatCurrency(kreditErgebnis.gesamtbetrag)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-3">
                      <Calculator className="h-10 w-10 text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Ergebnis erscheint hier
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Geben Sie Kreditsumme, Zinssatz und Laufzeit ein
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}
