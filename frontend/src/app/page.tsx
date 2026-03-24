"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "@/components/UploadZone";
import { AbstractLoader } from "@/components/AbstractLoader";
import { SplitDashboard } from "@/components/SplitDashboard";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Activity } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

interface Metadata {
  filename: string;
  page_count: number;
  char_count: number;
  row_count: number;
  column_count: number;
  extraction_mode?: string;
}

interface ProcessedResult {
  insights: string[];
  extracted_report: Record<string, string>[];
  pdf_url: string;
  metadata?: Metadata;
}

type AppState = "upload" | "loading" | "results" | "error";

/**
 * Try to derive a distributor name from the PDF filename.
 * E.g. "ACME_Pharma_Stock_Statement_March_2025.pdf" → "ACME Pharma"
 * Falls back to "Distributor" if nothing useful can be extracted.
 */
function guessDistributor(filename: string): string {
  // Remove extension
  let name = filename.replace(/\.pdf$/i, "");
  // Replace underscores/hyphens with spaces
  name = name.replace(/[_\-]+/g, " ");
  // Remove common suffixes
  name = name.replace(/\b(stock|statement|report|sales|march|april|may|june|july|aug|sept|oct|nov|dec|jan|feb|2[0-9]{3})\b/gi, "").trim();
  // Collapse whitespace
  name = name.replace(/\s{2,}/g, " ").trim();
  if (name.length < 2) return filename.replace(/\.pdf$/i, "");
  return name;
}

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadedFilename, setUploadedFilename] = useState<string>("");

  const handleUpload = useCallback(async (file: File) => {
    setState("loading");
    setErrorMessage("");
    setUploadedFilename(file.name);

    const formData = new FormData();
    formData.append("file", file);

    // Create a local Object URL so the PDF viewer can display it immediately
    const localPdfUrl = URL.createObjectURL(file);

    try {
      const res = await fetch(`${API_BASE}/api/process-document`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }

      setResult(data);
      setPdfUrl(localPdfUrl);
      setState("results");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Unable to process this document's layout. Please ensure it is a valid medical stock report."
      );
      setState("error");
      URL.revokeObjectURL(localPdfUrl);
    }
  }, []);

  const handleReset = useCallback(() => {
    setState("upload");
    setResult(null);
    setPdfUrl("");
    setErrorMessage("");
    setUploadedFilename("");
  }, []);

  const distributorName = guessDistributor(uploadedFilename || "Document");

  const defaultMetadata: Metadata = {
    filename: uploadedFilename || "document.pdf",
    page_count: 0,
    char_count: 0,
    row_count: result?.extracted_report?.length ?? 0,
    column_count:
      result?.extracted_report?.[0]
        ? Object.keys(result.extracted_report[0]).length
        : 0,
  };

  const metadata = result?.metadata ?? defaultMetadata;

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Upload / Loading / Error states – simple header ── */}
      {state !== "results" && (
        <header className="glass-panel border-b border-[hsl(var(--border)/0.3)] px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(280,80%,65%)] flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">MedIntel</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Intelligent Medical Document Processing
            </p>
          </div>
        </header>
      )}

      {/* ── Results state – rich dashboard header ── */}
      {state === "results" && result && (
        <DashboardHeader
          distributorName={distributorName}
          filename={metadata.filename}
          totalProducts={metadata.row_count}
          extractionMode={metadata.extraction_mode}
          onReset={handleReset}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {state === "upload" && <UploadZone onUpload={handleUpload} />}
        {state === "loading" && <AbstractLoader />}
        {state === "results" && result && (
          <SplitDashboard
            insights={result.insights}
            extractedReport={result.extracted_report}
            pdfUrl={pdfUrl}
            distributorName={distributorName}
            metadata={metadata}
          />
        )}
        {state === "error" && (
          <ErrorDisplay message={errorMessage} onRetry={handleReset} />
        )}
      </div>
    </main>
  );
}
