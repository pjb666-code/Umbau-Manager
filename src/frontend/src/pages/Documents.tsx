import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  FileText,
  FolderClosed,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { DynamicSelect } from "../components/DynamicSelect";
import { PDFThumbnail } from "../components/PDFThumbnail";
import { UnifiedPDFViewer } from "../components/UnifiedPDFViewer";
import {
  useDeleteDocument,
  useGetDocumentsByProject,
  useUploadDocument,
} from "../hooks/useQueries";
import type { Dokument } from "../hooks/useQueries";
import {
  addDocumentBereich,
  getDocumentBereiche,
} from "../lib/customCategories";

const STATUS_OPTIONS = ["Entwurf", "In Prüfung", "Genehmigt", "Archiviert"];

interface FileUploadItem {
  file: File;
  id: string;
  status: "waiting" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
}

export default function Documents({
  currentProjectId,
}: { currentProjectId?: string | null }) {
  const {
    data: documents = [],
    isLoading,
    isFetching: isRefetching,
  } = useGetDocumentsByProject(currentProjectId ?? null);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const [bereiche, setBereiche] = useState<string[]>(getDocumentBereiche());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["Architekt"]),
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPdfUrl, setViewerPdfUrl] = useState("");
  const [viewerTitle, setViewerTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Dokument | null>(
    null,
  );
  const [newDocument, setNewDocument] = useState({
    name: "",
    bereich: "none",
    status: "Entwurf",
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name}: Nur PDF-Dateien sind erlaubt`);
        return false;
      }
      return true;
    });

    const newItems: FileUploadItem[] = validFiles.map((file) => ({
      file,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "waiting",
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      uploadQueue.length === 0 ||
      !newDocument.bereich ||
      newDocument.bereich === "none"
    ) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    setIsUploading(true);

    for (const item of uploadQueue) {
      if (item.status === "completed") continue;

      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i,
        ),
      );

      try {
        const documentName =
          newDocument.name.trim() || item.file.name.replace(".pdf", "");

        // Convert File to Uint8Array
        const arrayBuffer = await item.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create ExternalBlob with progress tracking
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
          (percentage) => {
            setUploadQueue((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, progress: percentage } : i,
              ),
            );
          },
        );

        await uploadDocument.mutateAsync({
          id: item.id,
          name: documentName,
          bereich: newDocument.bereich,
          typ: "PDF",
          status: newDocument.status,
          blob: blob,
          projectId: currentProjectId,
        });

        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "completed", progress: 100 } : i,
          ),
        );
      } catch (error: any) {
        console.error("Upload error:", error);
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "failed", error: error.message }
              : i,
          ),
        );
      }
    }

    setIsUploading(false);

    const allCompleted = uploadQueue.every(
      (item) => item.status === "completed",
    );
    if (allCompleted) {
      setNewDocument({ name: "", bereich: "none", status: "Entwurf" });
      setUploadQueue([]);
      setIsUploadOpen(false);
      toast.success("Alle Dokumente erfolgreich hochgeladen");
    }
  };

  const getDocumentsByBereich = (bereichId: string): Dokument[] => {
    return documents.filter((doc) => doc.bereich === bereichId);
  };

  const handleViewDocument = async (doc: Dokument) => {
    try {
      const arrayBuffer = await doc.blob.getBytes();
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setViewerPdfUrl(url);
      setViewerTitle(doc.name);
      setViewerOpen(true);
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Fehler beim Öffnen des Dokuments");
    }
  };

  const handleDeleteClick = (doc: Dokument, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument.mutateAsync(documentToDelete.id);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleAddBereich = (newBereich: string) => {
    addDocumentBereich(newBereich);
    setBereiche(getDocumentBereiche());
  };

  const completedCount = uploadQueue.filter(
    (i) => i.status === "completed",
  ).length;
  const failedCount = uploadQueue.filter((i) => i.status === "failed").length;
  const overallProgress =
    uploadQueue.length > 0
      ? Math.round((completedCount / uploadQueue.length) * 100)
      : 0;

  // Show refresh indicator when refetching after upload
  const showRefreshIndicator = isRefetching && !isLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dokumente</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie alle Projektdokumente und PDFs
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dokument hochladen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dokumente hochladen</DialogTitle>
              <DialogDescription>
                Laden Sie ein oder mehrere PDF-Dokumente hoch
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">PDF-Dateien *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              {uploadQueue.length > 0 && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Upload-Warteschlange ({uploadQueue.length})
                    </Label>
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadQueue([])}
                        className="h-6 text-xs"
                      >
                        Alle entfernen
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadQueue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-background rounded border"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                item.status === "completed"
                                  ? "default"
                                  : item.status === "failed"
                                    ? "destructive"
                                    : item.status === "uploading"
                                      ? "secondary"
                                      : "outline"
                              }
                              className="text-xs"
                            >
                              {item.status === "waiting" && "Wartend"}
                              {item.status === "uploading" &&
                                `${item.progress}%`}
                              {item.status === "completed" && "Fertig"}
                              {item.status === "failed" && "Fehler"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          {item.status === "uploading" && (
                            <Progress
                              value={item.progress}
                              className="h-1 mt-1"
                            />
                          )}
                          {item.status === "failed" && item.error && (
                            <p className="text-xs text-destructive mt-1">
                              {item.error}
                            </p>
                          )}
                        </div>
                        {!isUploading && item.status !== "completed" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromQueue(item.id)}
                            className="h-6 w-6 p-0 shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isUploading && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Gesamtfortschritt
                        </span>
                        <span className="font-medium">
                          {completedCount}/{uploadQueue.length} (
                          {overallProgress}%)
                        </span>
                      </div>
                      <Progress value={overallProgress} />
                      {failedCount > 0 && (
                        <p className="text-xs text-destructive">
                          {failedCount} Fehler
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Dokumentname (optional)</Label>
                <Input
                  id="name"
                  value={newDocument.name}
                  onChange={(e) =>
                    setNewDocument({ ...newDocument, name: e.target.value })
                  }
                  placeholder="Leer lassen für Dateinamen"
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Bei mehreren Dateien wird der Dateiname verwendet
                </p>
              </div>
              <DynamicSelect
                id="bereich"
                label="Bereich"
                value={newDocument.bereich}
                onValueChange={(value) =>
                  setNewDocument({ ...newDocument, bereich: value })
                }
                options={bereiche}
                onAddOption={handleAddBereich}
                placeholder="Bereich wählen..."
                required
                disabled={isUploading}
              />
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newDocument.status}
                  onValueChange={(value) =>
                    setNewDocument({ ...newDocument, status: value })
                  }
                  disabled={isUploading}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || uploadQueue.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadQueue.length > 1
                        ? `${uploadQueue.length} Dateien hochladen`
                        : "Hochladen"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* CRITICAL FIX: Show refresh indicator when refetching after upload */}
      {showRefreshIndicator && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Aktualisiere Dokumentenliste...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {bereiche.map((bereich) => {
            const isExpanded = expandedFolders.has(bereich);
            const bereichDocs = getDocumentsByBereich(bereich);

            return (
              <Card key={bereich}>
                <CardHeader
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleFolder(bereich)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <FolderClosed className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg">{bereich}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {bereichDocs.length}
                    </Badge>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    {bereichDocs.length > 0 ? (
                      <div className="space-y-2">
                        {bereichDocs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group w-full text-left"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <div className="w-16 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                              <PDFThumbnail
                                pdfUrl={doc.blob.getDirectURL()}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {doc.typ}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {doc.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDocument(doc);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleDeleteClick(doc, e)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Keine Dokumente in diesem Bereich
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <UnifiedPDFViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        pdfUrl={viewerPdfUrl}
        title={viewerTitle}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Dokument löschen"
        description="Sind Sie sicher, dass Sie dieses Dokument löschen möchten?"
        itemName={documentToDelete?.name}
        isPending={deleteDocument.isPending}
      />
    </div>
  );
}
