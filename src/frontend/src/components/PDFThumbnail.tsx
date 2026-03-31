import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PDFThumbnailProps {
  pdfUrl: string;
  className?: string;
  fallbackIcon?: boolean;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Persistent cache for thumbnail DataURLs using localStorage
const CACHE_PREFIX = "pdf_thumbnail_";
const CACHE_VERSION = "v1_";

// Generate a simple hash for the URL to use as cache key
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCachedThumbnail(url: string): string | null {
  try {
    const key = CACHE_PREFIX + CACHE_VERSION + hashUrl(url);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setCachedThumbnail(url: string, dataUrl: string): void {
  try {
    const key = CACHE_PREFIX + CACHE_VERSION + hashUrl(url);
    localStorage.setItem(key, dataUrl);
  } catch (_e) {
    console.warn("LocalStorage quota exceeded, clearing PDF thumbnail cache");
    try {
      // Clear old thumbnails to free up space
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(storageKey);
        }
      }
      // Remove oldest entries (keep last 20)
      for (const k of keysToRemove.slice(0, -20)) {
        localStorage.removeItem(k);
      }

      // Try again
      const key = CACHE_PREFIX + CACHE_VERSION + hashUrl(url);
      localStorage.setItem(key, dataUrl);
    } catch {
      // Still failed, ignore
    }
  }
}

export function PDFThumbnail({
  pdfUrl,
  className = "",
  fallbackIcon = true,
}: PDFThumbnailProps) {
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!pdfUrl) {
      setError(true);
      setIsLoading(false);
      return;
    }

    // Check persistent cache first
    const cached = getCachedThumbnail(pdfUrl);
    if (cached) {
      setThumbnailDataUrl(cached);
      setIsLoading(false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 100;

    async function generateThumbnail() {
      try {
        // Wait for PDF.js to be available (initialized globally in App.tsx)
        if (!window.pdfjsLib) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              if (isMountedRef.current) {
                generateThumbnail();
              }
            }, 100);
          } else {
            console.error("PDF.js worker not available after max retries");
            if (isMountedRef.current) {
              setError(true);
              setIsLoading(false);
            }
          }
          return;
        }

        if (!isMountedRef.current) {
          return;
        }

        // Fetch PDF explicitly as ArrayBuffer with proper Accept header
        const response = await fetch(pdfUrl, {
          headers: {
            Accept: "application/pdf",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        // Verify content type
        const contentType = response.headers.get("content-type");
        if (
          contentType &&
          !contentType.includes("application/pdf") &&
          !contentType.includes("octet-stream")
        ) {
          console.warn(`Unexpected content type for PDF: ${contentType}`);
        }

        // Get ArrayBuffer for proper binary handling
        const arrayBuffer = await response.arrayBuffer();

        if (!isMountedRef.current) {
          return;
        }

        // Pass ArrayBuffer to getDocument for consistent rendering
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (!isMountedRef.current) {
          return;
        }

        // Get the first page
        const page = await pdf.getPage(1);

        if (!isMountedRef.current) {
          return;
        }

        // Render at 0.5× scale for thumbnail
        const viewport = page.getViewport({ scale: 0.5 });

        const canvas = canvasRef.current;
        if (!canvas || !isMountedRef.current) {
          return;
        }

        // Ensure canvas has valid rendering context
        const context = canvas.getContext("2d");
        if (!context) {
          if (isMountedRef.current) {
            setError(true);
            setIsLoading(false);
          }
          return;
        }

        // Set proper canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Render the first page to the canvas
        await page.render(renderContext).promise;

        if (!isMountedRef.current) {
          return;
        }

        // Convert canvas to DataURL for persistent caching
        const dataUrl = canvas.toDataURL("image/png");

        // Store in localStorage for persistent cross-session cache
        setCachedThumbnail(pdfUrl, dataUrl);

        setThumbnailDataUrl(dataUrl);
        setIsLoading(false);
      } catch (err) {
        console.error("Error generating PDF thumbnail:", err);
        if (isMountedRef.current) {
          setError(true);
          setIsLoading(false);
        }
      }
    }

    generateThumbnail();

    return () => {
      isMountedRef.current = false;
    };
  }, [pdfUrl]);

  // Always render canvas (hidden) so ref is available during loading
  return (
    <>
      {/* Hidden canvas for rendering - always mounted */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      />

      {/* Show fallback icon on error */}
      {error && fallbackIcon && (
        <div
          className={`flex items-center justify-center bg-muted ${className}`}
        >
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Show loading state */}
      {isLoading && !error && (
        <div
          className={`flex items-center justify-center bg-muted animate-pulse ${className}`}
        >
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Show the thumbnail image if available */}
      {thumbnailDataUrl && !error && (
        <img
          src={thumbnailDataUrl}
          alt="PDF Preview"
          className={`object-contain ${className}`}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      )}
    </>
  );
}
