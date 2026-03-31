import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Minimize,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PDFThumbnail } from "./PDFThumbnail";

interface UnifiedPDFViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  title?: string;
  disableDownload?: boolean;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Global PDF cache to prevent redundant loads
const pdfCache = new Map<string, ArrayBuffer>();
// Page render cache storing DataURLs for instant reuse
const pageRenderCache = new Map<string, string>();

const PDFCanvas = memo(
  ({
    pdfDoc,
    pageNumber,
    scale,
  }: { pdfDoc: any; pageNumber: number; scale: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isRendering, setIsRendering] = useState(false);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
      if (!pdfDoc || !canvasRef.current || isRendering) return;

      const cacheKey = `${pdfDoc.fingerprints?.[0] || "pdf"}_page${pageNumber}_scale${scale.toFixed(2)}`;

      // Check if we have a cached render
      const cachedDataUrl = pageRenderCache.get(cacheKey);
      if (cachedDataUrl && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
          }
        };
        img.src = cachedDataUrl;
        return;
      }

      setIsRendering(true);

      pdfDoc
        .getPage(pageNumber)
        .then((page: any) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            setIsRendering(false);
            return;
          }

          const viewport = page.getViewport({ scale });
          const context = canvas.getContext("2d");
          if (!context) {
            setIsRendering(false);
            return;
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          // Cancel any ongoing render task
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }

          renderTaskRef.current = page.render(renderContext);

          renderTaskRef.current.promise
            .then(() => {
              // Cache the rendered page as DataURL
              try {
                const dataUrl = canvas.toDataURL("image/png");
                pageRenderCache.set(cacheKey, dataUrl);
              } catch (err) {
                console.warn("Failed to cache page render:", err);
              }
              setIsRendering(false);
              renderTaskRef.current = null;
            })
            .catch((err: any) => {
              if (err.name !== "RenderingCancelledException") {
                console.error("Render error:", err);
              }
              setIsRendering(false);
              renderTaskRef.current = null;
            });
        })
        .catch((err: any) => {
          console.error("Page error:", err);
          setIsRendering(false);
        });

      return () => {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
      };
    }, [pdfDoc, pageNumber, scale, isRendering]);

    return (
      <canvas
        ref={canvasRef}
        className="shadow-lg bg-white"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    );
  },
);

PDFCanvas.displayName = "PDFCanvas";

export const UnifiedPDFViewer = memo(
  ({
    open,
    onOpenChange,
    pdfUrl,
    title = "PDF Dokument",
    disableDownload = false,
  }: UnifiedPDFViewerProps) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [showThumbnail, setShowThumbnail] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce refs for zoom and scroll
    const zoomDebounceRef = useRef<number | null>(null);
    const scrollDebounceRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    // Load PDF.js library
    useEffect(() => {
      if (!window.pdfjsLib) {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
        };
        document.body.appendChild(script);
      }
    }, []);

    // Fullscreen change listener
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
      };
    }, []);

    // Load PDF when dialog opens with caching
    useEffect(() => {
      if (open && pdfUrl && window.pdfjsLib) {
        setIsLoading(true);
        setError(null);
        setPageNumber(1);
        setScale(1.0);
        setShowThumbnail(true);

        // Check cache first
        const cachedData = pdfCache.get(pdfUrl);
        if (cachedData) {
          window.pdfjsLib
            .getDocument({ data: cachedData })
            .promise.then((pdf: any) => {
              setPdfDoc(pdf);
              setNumPages(pdf.numPages);
              setPdfData(cachedData);
              setIsLoading(false);
              setTimeout(() => setShowThumbnail(false), 500);
            })
            .catch((err: any) => {
              console.error("PDF load error:", err);
              setError("PDF konnte nicht geladen werden");
              setIsLoading(false);
              toast.error("PDF konnte nicht geladen werden");
            });
          return;
        }

        // Fetch and cache
        fetch(pdfUrl)
          .then((response) => {
            if (!response.ok) throw new Error("Fehler beim Laden des PDFs");
            return response.arrayBuffer();
          })
          .then((arrayBuffer) => {
            pdfCache.set(pdfUrl, arrayBuffer);
            setPdfData(arrayBuffer);
            return window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          })
          .then((pdf: any) => {
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setIsLoading(false);
            setTimeout(() => setShowThumbnail(false), 500);
          })
          .catch((err) => {
            console.error("PDF load error:", err);
            setError("PDF konnte nicht geladen werden");
            setIsLoading(false);
            toast.error("PDF konnte nicht geladen werden");
          });
      }
    }, [open, pdfUrl]);

    // Debounced zoom with requestAnimationFrame
    const debouncedZoom = useCallback((newScale: number) => {
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }

      zoomDebounceRef.current = window.setTimeout(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          setScale(newScale);
          rafRef.current = null;
        });
      }, 150);
    }, []);

    const goToPrevPage = () => {
      setPageNumber((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
      setPageNumber((prev) => Math.min(numPages, prev + 1));
    };

    const zoomIn = () => {
      if (!isFullscreen) return; // Only allow zoom in fullscreen mode
      const newScale = Math.min(3.0, scale + 0.2);
      debouncedZoom(newScale);
    };

    const zoomOut = () => {
      if (!isFullscreen) return; // Only allow zoom in fullscreen mode
      const newScale = Math.max(0.5, scale - 0.2);
      debouncedZoom(newScale);
    };

    const resetZoom = () => {
      if (!isFullscreen) return; // Only allow zoom in fullscreen mode
      debouncedZoom(1.0);
    };

    const toggleFullscreen = async () => {
      if (!containerRef.current) return;

      try {
        if (!isFullscreen) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          }
        }
      } catch (err) {
        console.error("Fullscreen error:", err);
        toast.error("Vollbildmodus nicht verfügbar");
      }
    };

    const handleDownload = () => {
      if (!pdfData) return;

      try {
        const blob = new Blob([pdfData], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Download gestartet");
      } catch (err) {
        console.error("Download error:", err);
        toast.error("Download fehlgeschlagen");
      }
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (zoomDebounceRef.current) {
          clearTimeout(zoomDebounceRef.current);
        }
        if (scrollDebounceRef.current) {
          clearTimeout(scrollDebounceRef.current);
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    // Handle keyboard shortcuts
    // biome-ignore lint/correctness/useExhaustiveDependencies: keyboard handler functions recreated on render are intentionally excluded
    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") goToPrevPage();
        if (e.key === "ArrowRight") goToNextPage();
        if (isFullscreen) {
          if (e.key === "+" || e.key === "=") zoomIn();
          if (e.key === "-") zoomOut();
          if (e.key === "0") resetZoom();
        }
        if (e.key === "f" || e.key === "F") toggleFullscreen();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, isFullscreen]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={containerRef}
          className="max-w-6xl h-[90vh] flex flex-col p-0"
        >
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-4">{title}</DialogTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Controls */}
          {!isLoading && !error && numPages > 0 && (
            <div className="px-6 py-3 border-b flex items-center justify-between gap-4 shrink-0 bg-muted/30">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm whitespace-nowrap">
                  Seite {pageNumber} von {numPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {isFullscreen && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={zoomOut}
                      disabled={scale <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm whitespace-nowrap min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={zoomIn}
                      disabled={scale >= 3.0}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetZoom}>
                      100%
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFullscreen}
                  title="Vollbild (F)"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
                {!disableDownload && (
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* PDF Content */}
          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
            {isLoading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  {showThumbnail && pdfUrl ? (
                    <PDFThumbnail
                      pdfUrl={pdfUrl}
                      className="mx-auto max-w-[200px]"
                    />
                  ) : (
                    <Skeleton className="w-[600px] h-[800px] mx-auto" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    PDF wird geladen...
                  </p>
                </div>
              </div>
            )}
            {error ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : pdfDoc ? (
              <ScrollArea className="h-full">
                <div className="flex justify-center p-6">
                  <PDFCanvas
                    pdfDoc={pdfDoc}
                    pageNumber={pageNumber}
                    scale={scale}
                  />
                </div>
              </ScrollArea>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

UnifiedPDFViewer.displayName = "UnifiedPDFViewer";
