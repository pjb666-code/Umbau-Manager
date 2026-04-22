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
import { useEffect, useMemo, useState } from "react";
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

interface Sondertilgung {
  id: number;
  typ: "einmalig" | "jaehrlich";
  monat?: number;
  betrag: number;
}

interface Loan {
  id: number;
  name: string;
  betrag: number;
  laufzeit: number;
  zins: number;
  st: Sondertilgung[];
}

interface LoanResult {
  monthly: number;
  totalZins: number;
  effMonths: number;
  months: Array<{ restschuld: number; rate: number }>;
}

const LOAN_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ef4444"];

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

// --- KreditChart ---
function KreditChart({
  loans,
  loanResults,
  formatCurrency,
}: {
  loans: Loan[];
  loanResults: Record<number, LoanResult>;
  formatCurrency: (n: number) => string;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  const W = 600;
  const H = 260;
  const PAD = { top: 16, right: 16, bottom: 36, left: 72 };

  const maxMonths = Math.max(
    ...loans.map((l) => loanResults[l.id]?.effMonths ?? l.laufzeit),
    12,
  );
  const maxRest = Math.max(...loans.map((l) => l.betrag), 1);

  const toX = (m: number) =>
    PAD.left + (m / maxMonths) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + (1 - v / maxRest) * (H - PAD.top - PAD.bottom);

  // Y axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: f * maxRest,
    y: toY(f * maxRest),
  }));
  // X axis labels
  const xStep = maxMonths <= 60 ? 12 : maxMonths <= 240 ? 24 : 60;
  const xTicks: number[] = [];
  for (let m = 0; m <= maxMonths; m += xStep) xTicks.push(m);

  const hoverMonth =
    hoverX !== null
      ? Math.round((hoverX / (W - PAD.left - PAD.right)) * maxMonths)
      : null;

  return (
    <div className="relative select-none" style={{ minHeight: "260px" }}>
      <svg
        role="img"
        aria-label="Restschuldverlauf aller Kredite"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minHeight: "250px" }}
        onMouseMove={(e) => {
          const rect = (
            e.currentTarget as SVGSVGElement
          ).getBoundingClientRect();
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          const chartX = svgX - PAD.left;
          setHoverX(Math.max(0, Math.min(chartX, W - PAD.left - PAD.right)));
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={`yl-${t.val}`}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((t) => (
          <text
            key={`yt-${t.val}`}
            x={PAD.left - 6}
            y={t.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {t.val >= 1000000
              ? `${(t.val / 1000000).toFixed(1)}M`
              : t.val >= 1000
                ? `${Math.round(t.val / 1000)}k`
                : t.val}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((m) => (
          <text
            key={`xt-${m}`}
            x={toX(m)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {m === 0 ? "0" : `${m}Mo`}
          </text>
        ))}

        {/* Lines */}
        {loans.map((loan, idx) => {
          const res = loanResults[loan.id];
          if (!res) return null;
          const color = LOAN_COLORS[idx % LOAN_COLORS.length];
          const points = [
            `${toX(0)},${toY(loan.betrag)}`,
            ...res.months.map((mo, i) => `${toX(i + 1)},${toY(mo.restschuld)}`),
          ].join(" ");
          return (
            <polyline
              key={loan.id}
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          );
        })}

        {/* Hover vertical line */}
        {hoverX !== null && hoverMonth !== null && (
          <line
            x1={toX(hoverMonth)}
            x2={toX(hoverMonth)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}

        {/* Hover dots */}
        {hoverX !== null &&
          hoverMonth !== null &&
          loans.map((loan, idx) => {
            const res = loanResults[loan.id];
            if (!res) return null;
            const mo = res.months[hoverMonth - 1];
            if (!mo) return null;
            const color = LOAN_COLORS[idx % LOAN_COLORS.length];
            return (
              <circle
                key={loan.id}
                cx={toX(hoverMonth)}
                cy={toY(mo.restschuld)}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
              />
            );
          })}
      </svg>

      {/* Tooltip */}
      {hoverX !== null && hoverMonth !== null && hoverMonth > 0 && (
        <div
          className="absolute top-2 pointer-events-none z-10 bg-card border rounded-lg shadow-lg p-3 text-xs min-w-[180px]"
          style={{
            left: `${Math.min((hoverX / (W - PAD.left - PAD.right)) * 100, 60)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-foreground mb-1.5">
            Monat {hoverMonth}
          </div>
          {loans.map((loan, idx) => {
            const res = loanResults[loan.id];
            const mo = res?.months[hoverMonth - 1];
            const color = LOAN_COLORS[idx % LOAN_COLORS.length];
            return (
              <div
                key={loan.id}
                className="flex items-center justify-between gap-3 py-0.5"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground">{loan.name}</span>
                </span>
                {mo ? (
                  <span className="font-mono font-medium">
                    {formatCurrency(mo.restschuld)}
                  </span>
                ) : (
                  <span className="text-green-500 font-bold">✓</span>
                )}
              </div>
            );
          })}
          <div className="border-t mt-1.5 pt-1.5 flex justify-between">
            <span className="text-muted-foreground">Gesamtrate</span>
            <span className="font-mono font-semibold">
              {formatCurrency(
                loans.reduce((s, l) => {
                  const mo = loanResults[l.id]?.months[hoverMonth - 1];
                  return s + (mo?.rate ?? 0);
                }, 0),
              )}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {loans.map((loan, idx) => (
          <span
            key={loan.id}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ backgroundColor: LOAN_COLORS[idx % LOAN_COLORS.length] }}
            />
            {loan.name}
          </span>
        ))}
      </div>
    </div>
  );
}

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

  // Kreditrechner state — persisted per project in localStorage
  const defaultLoans: Loan[] = [
    {
      id: 1,
      name: "Bankkredit",
      betrag: 200000,
      laufzeit: 240,
      zins: 3.5,
      st: [],
    },
  ];

  const [loans, setLoans] = useState<Loan[]>(() => {
    if (!currentProjectId) return defaultLoans;
    try {
      const stored = localStorage.getItem(
        `kreditrechner_loans_${currentProjectId}`,
      );
      if (stored) return JSON.parse(stored) as Loan[];
    } catch {}
    return defaultLoans;
  });

  const [selLoan, setSelLoan] = useState<number>(() => {
    if (!currentProjectId) return 1;
    try {
      const stored = localStorage.getItem(
        `kreditrechner_selloan_${currentProjectId}`,
      );
      if (stored) return JSON.parse(stored) as number;
    } catch {}
    return 1;
  });

  const [stExpanded, setStExpanded] = useState(false);

  // Persist loans + selLoan to localStorage whenever they change
  useEffect(() => {
    if (!currentProjectId) return;
    try {
      localStorage.setItem(
        `kreditrechner_loans_${currentProjectId}`,
        JSON.stringify(loans),
      );
      localStorage.setItem(
        `kreditrechner_selloan_${currentProjectId}`,
        JSON.stringify(selLoan),
      );
    } catch {}
  }, [loans, selLoan, currentProjectId]);

  // Load stored data when projectId changes
  useEffect(() => {
    if (!currentProjectId) return;
    try {
      const storedLoans = localStorage.getItem(
        `kreditrechner_loans_${currentProjectId}`,
      );
      const storedSel = localStorage.getItem(
        `kreditrechner_selloan_${currentProjectId}`,
      );
      const nextLoans = storedLoans
        ? (JSON.parse(storedLoans) as Loan[])
        : defaultLoans;
      const nextSel = storedSel
        ? (JSON.parse(storedSel) as number)
        : (nextLoans[0]?.id ?? 1);
      setLoans(nextLoans);
      setSelLoan(nextSel);
    } catch {
      setLoans(defaultLoans);
      setSelLoan(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const loanResults = useMemo<Record<number, LoanResult>>(() => {
    const results: Record<number, LoanResult> = {};
    for (const loan of loans) {
      const monthlyRate = loan.zins / 100 / 12;
      let annuity: number;
      if (loan.zins === 0) {
        annuity = loan.betrag / loan.laufzeit;
      } else {
        annuity =
          (loan.betrag * monthlyRate) /
          (1 - (1 + monthlyRate) ** -loan.laufzeit);
      }
      const months: Array<{ restschuld: number; rate: number }> = [];
      let restschuld = loan.betrag;
      let totalZins = 0;
      for (let m = 1; m <= loan.laufzeit * 2 && restschuld > 0.01; m++) {
        const interest = restschuld * monthlyRate;
        let principal = annuity - interest;
        let sonder = 0;
        for (const st of loan.st) {
          if (st.typ === "einmalig" && st.monat === m) sonder += st.betrag;
          if (st.typ === "jaehrlich" && m % 12 === 0) sonder += st.betrag;
        }
        const actualPrincipal = Math.min(principal + sonder, restschuld);
        const actualRate = interest + actualPrincipal;
        restschuld = Math.max(0, restschuld - actualPrincipal);
        totalZins += interest;
        months.push({ restschuld, rate: actualRate });
        if (restschuld <= 0.01) break;
      }
      results[loan.id] = {
        monthly: annuity,
        totalZins,
        effMonths: months.length,
        months,
      };
    }
    return results;
  }, [loans]);

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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">
                  Gesamtbetrag
                </div>
                <div className="text-2xl font-bold text-primary mt-1">
                  {formatCurrency(loans.reduce((s, l) => s + l.betrag, 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">
                  Gesamtrate / Monat
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(
                    loans.reduce(
                      (s, l) => s + (loanResults[l.id]?.monthly ?? 0),
                      0,
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">
                  Gesamtzinslast
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(
                    loans.reduce(
                      (s, l) => s + (loanResults[l.id]?.totalZins ?? 0),
                      0,
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Loan List + Editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Loan List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Kredite</span>
                    <button
                      type="button"
                      data-ocid="kredit.add_button"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      onClick={() => {
                        const newId =
                          Math.max(0, ...loans.map((l) => l.id)) + 1;
                        const newLoan: Loan = {
                          id: newId,
                          name: `Kredit ${newId}`,
                          betrag: 100000,
                          laufzeit: 120,
                          zins: 3.5,
                          st: [],
                        };
                        setLoans([...loans, newLoan]);
                        setSelLoan(newId);
                      }}
                    >
                      <Plus className="h-3 w-3" /> Neu
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {loans.map((loan, idx) => {
                    const color = LOAN_COLORS[idx % LOAN_COLORS.length];
                    const res = loanResults[loan.id];
                    return (
                      <button
                        type="button"
                        key={loan.id}
                        data-ocid={`kredit.item.${idx + 1}`}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${selLoan === loan.id ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"}`}
                        onClick={() => setSelLoan(loan.id)}
                        aria-pressed={selLoan === loan.id}
                      >
                        <div
                          className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {loan.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(loan.betrag)} ·{" "}
                            {res ? `${formatCurrency(res.monthly)}/Mo` : "—"}
                          </div>
                        </div>
                        {loans.length > 1 && (
                          <button
                            type="button"
                            data-ocid={`kredit.delete_button.${idx + 1}`}
                            aria-label="Kredit löschen"
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const remaining = loans.filter(
                                (l) => l.id !== loan.id,
                              );
                              setLoans(remaining);
                              if (selLoan === loan.id)
                                setSelLoan(remaining[0].id);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Editor for selected loan */}
              {(() => {
                const loan = loans.find((l) => l.id === selLoan);
                if (!loan) return null;
                const updateLoan = (patch: Partial<Loan>) => {
                  setLoans(
                    loans.map((l) =>
                      l.id === selLoan ? { ...l, ...patch } : l,
                    ),
                  );
                };
                return (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Kredit bearbeiten
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="kredit-name"
                          className="text-sm font-medium"
                        >
                          Name
                        </Label>
                        <Input
                          id="kredit-name"
                          data-ocid="kredit.name_input"
                          value={loan.name}
                          onChange={(e) => updateLoan({ name: e.target.value })}
                        />
                      </div>

                      {/* Betrag Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Kreditsumme
                          </Label>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(loan.betrag)}
                          </span>
                        </div>
                        <input
                          type="range"
                          data-ocid="kredit.betrag_input"
                          min={10000}
                          max={1000000}
                          step={1000}
                          value={loan.betrag}
                          onChange={(e) =>
                            updateLoan({ betrag: Number(e.target.value) })
                          }
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10.000 €</span>
                          <span>1.000.000 €</span>
                        </div>
                      </div>

                      {/* Laufzeit Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Laufzeit
                          </Label>
                          <span className="text-sm font-semibold text-primary">
                            {loan.laufzeit} Monate /{" "}
                            {Math.round(loan.laufzeit / 12)} Jahre
                          </span>
                        </div>
                        <input
                          type="range"
                          data-ocid="kredit.laufzeit_input"
                          min={12}
                          max={480}
                          step={6}
                          value={loan.laufzeit}
                          onChange={(e) =>
                            updateLoan({ laufzeit: Number(e.target.value) })
                          }
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>12 Mo</span>
                          <span>480 Mo</span>
                        </div>
                      </div>

                      {/* Zins Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Zinssatz p.a.
                          </Label>
                          <span className="text-sm font-semibold text-primary">
                            {loan.zins.toFixed(1)} %
                          </span>
                        </div>
                        <input
                          type="range"
                          data-ocid="kredit.zins_input"
                          min={0}
                          max={10}
                          step={0.1}
                          value={loan.zins}
                          onChange={(e) =>
                            updateLoan({ zins: Number(e.target.value) })
                          }
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0 %</span>
                          <span>10 %</span>
                        </div>
                      </div>

                      {/* Sondertilgungen */}
                      <div className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          data-ocid="kredit.sondertilgung_toggle"
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                          onClick={() => setStExpanded(!stExpanded)}
                        >
                          <span>Sondertilgungen ({loan.st.length})</span>
                          <span className="text-muted-foreground text-xs">
                            {stExpanded ? "▲" : "▼"}
                          </span>
                        </button>
                        {stExpanded && (
                          <div className="border-t p-3 space-y-3 bg-muted/20">
                            {loan.st.map((st, si) => (
                              <div
                                key={st.id}
                                data-ocid={`kredit.sondertilgung.${si + 1}`}
                                className="space-y-2 p-3 bg-card rounded-lg border"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex rounded-md overflow-hidden border text-xs">
                                    <button
                                      type="button"
                                      className={`px-2.5 py-1 transition-colors ${st.typ === "einmalig" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
                                      onClick={() => {
                                        const updated = [...loan.st];
                                        updated[si] = {
                                          ...updated[si],
                                          typ: "einmalig",
                                        };
                                        updateLoan({ st: updated });
                                      }}
                                    >
                                      Einmalig
                                    </button>
                                    <button
                                      type="button"
                                      className={`px-2.5 py-1 transition-colors ${st.typ === "jaehrlich" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
                                      onClick={() => {
                                        const updated = [...loan.st];
                                        updated[si] = {
                                          ...updated[si],
                                          typ: "jaehrlich",
                                          monat: undefined,
                                        };
                                        updateLoan({ st: updated });
                                      }}
                                    >
                                      Jährlich
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="ml-auto h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() =>
                                      updateLoan({
                                        st: loan.st.filter((_, i) => i !== si),
                                      })
                                    }
                                    aria-label="Sondertilgung löschen"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1 space-y-1">
                                    <Label className="text-xs">
                                      Betrag (€)
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={st.betrag}
                                      className="h-8 text-sm"
                                      onChange={(e) => {
                                        const updated = [...loan.st];
                                        updated[si] = {
                                          ...updated[si],
                                          betrag: Number(e.target.value),
                                        };
                                        updateLoan({ st: updated });
                                      }}
                                    />
                                  </div>
                                  {st.typ === "einmalig" && (
                                    <div className="w-24 space-y-1">
                                      <Label className="text-xs">
                                        Monat Nr.
                                      </Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={st.monat ?? ""}
                                        className="h-8 text-sm"
                                        onChange={(e) => {
                                          const updated = [...loan.st];
                                          updated[si] = {
                                            ...updated[si],
                                            monat: Number(e.target.value),
                                          };
                                          updateLoan({ st: updated });
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              data-ocid="kredit.sondertilgung_add_button"
                              className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md border border-dashed hover:bg-muted/50 transition-colors text-muted-foreground"
                              onClick={() =>
                                updateLoan({
                                  st: [
                                    ...loan.st,
                                    {
                                      id: Date.now(),
                                      typ: "einmalig",
                                      monat: 12,
                                      betrag: 5000,
                                    },
                                  ],
                                })
                              }
                            >
                              <Plus className="h-3 w-3" /> Sondertilgung
                              hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* Right: Chart + Table */}
            <div className="lg:col-span-3 space-y-4">
              {/* SVG Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Restschuldverlauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <KreditChart
                    loans={loans}
                    loanResults={loanResults}
                    formatCurrency={formatCurrency}
                  />
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Übersicht</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead className="text-right">Laufzeit</TableHead>
                          <TableHead className="text-right">Zins</TableHead>
                          <TableHead className="text-right">Rate/Mo</TableHead>
                          <TableHead className="text-right">Zinslast</TableHead>
                          <TableHead className="text-right">Gesamt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan, idx) => {
                          const res = loanResults[loan.id];
                          const color = LOAN_COLORS[idx % LOAN_COLORS.length];
                          return (
                            <TableRow
                              key={loan.id}
                              data-ocid={`kredit.table_row.${idx + 1}`}
                            >
                              <TableCell>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  {loan.name}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatCurrency(loan.betrag)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {res?.effMonths ?? "—"} Mo
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {loan.zins.toFixed(1)} %
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {res ? formatCurrency(res.monthly) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-orange-600">
                                {res ? formatCurrency(res.totalZins) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">
                                {res
                                  ? formatCurrency(loan.betrag + res.totalZins)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Summenzeile */}
                        <TableRow
                          className="font-bold bg-muted/30"
                          data-ocid="kredit.table_sum_row"
                        >
                          <TableCell>Gesamt</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(
                              loans.reduce((s, l) => s + l.betrag, 0),
                            )}
                          </TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(
                              loans.reduce(
                                (s, l) => s + (loanResults[l.id]?.monthly ?? 0),
                                0,
                              ),
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {formatCurrency(
                              loans.reduce(
                                (s, l) =>
                                  s + (loanResults[l.id]?.totalZins ?? 0),
                                0,
                              ),
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(
                              loans.reduce(
                                (s, l) =>
                                  s +
                                  l.betrag +
                                  (loanResults[l.id]?.totalZins ?? 0),
                                0,
                              ),
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
