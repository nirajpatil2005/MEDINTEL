"use client";

import { Building2, FileText, BarChart3, Calendar, Cpu, Wifi, WifiOff } from "lucide-react";

interface DashboardHeaderProps {
  distributorName: string;
  filename: string;
  totalProducts: number;
  extractionMode?: string;
  onReset: () => void;
}

export function DashboardHeader({
  distributorName,
  filename,
  totalProducts,
  extractionMode,
  onReset,
}: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white border-b border-[hsl(var(--border))] px-6 py-4 shadow-sm">
      {/* Top row: logo + back button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(168,80%,32%)] to-[hsl(200,70%,40%)] flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading gradient-text">MedIntel Dashboard</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Pharmaceutical Stock & Sales Intelligence
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] transition-all duration-200 border border-[hsl(var(--border))]"
        >
          ← Upload New Document
        </button>
      </div>

      {/* Distributor info bar */}
      <div className="flex flex-wrap items-center gap-6 py-3 px-5 rounded-xl bg-[hsl(var(--accent))] border border-[hsl(var(--primary)/0.12)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.12)] flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Distributor
            </p>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {distributorName}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[hsl(var(--border))]" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Source File
            </p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] max-w-[200px] truncate">
              {filename}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[hsl(var(--border))]" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Products Found
            </p>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {totalProducts}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[hsl(var(--border))]" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Analyzed
            </p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {today}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[hsl(var(--border))]" />

        {/* Extraction mode badge */}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            extractionMode === "offline"
              ? "bg-orange-50"
              : "bg-emerald-50"
          }`}>
            {extractionMode === "offline" ? (
              <WifiOff className="w-4 h-4 text-orange-500" />
            ) : (
              <Cpu className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Mode
            </p>
            <p className={`text-sm font-semibold ${
              extractionMode === "offline"
                ? "text-orange-600"
                : "text-emerald-600"
            }`}>
              {extractionMode === "offline" ? "Offline" : "AI Powered"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
