"use client";

import { useState } from "react";
import { StatsCards } from "./StatsCards";
import { InsightsCard } from "./InsightsCard";
import { DataTable } from "./DataTable";
import { ExportButtons } from "./ExportButtons";
import { FileText, Table as TableIcon, BarChart3 } from "lucide-react";

interface Metadata {
  filename: string;
  page_count: number;
  char_count: number;
  row_count: number;
  column_count: number;
}

interface SplitDashboardProps {
  insights: string[];
  extractedReport: Record<string, string>[];
  pdfUrl: string;
  distributorName: string;
  metadata: Metadata;
}

type ActiveTab = "overview" | "data" | "document";

export function SplitDashboard({
  insights,
  extractedReport,
  pdfUrl,
  distributorName,
  metadata,
}: SplitDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview & Insights", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "data", label: "Extracted Data", icon: <TableIcon className="w-4 h-4" /> },
    { id: "document", label: "Source Document", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Tab Navigation */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
        {/* ── Overview Tab ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <StatsCards data={extractedReport} metadata={metadata} />
            <InsightsCard insights={insights} />
          </>
        )}

        {/* ── Data Tab ──────────────────────────────────────────── */}
        {activeTab === "data" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold font-heading text-slate-900">
                  Extracted Report Data
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {metadata.row_count} rows × {metadata.column_count} columns extracted from {metadata.page_count} page{metadata.page_count > 1 ? "s" : ""}
                </p>
              </div>
              <ExportButtons data={extractedReport} />
            </div>
            <DataTable data={extractedReport} />
          </>
        )}

        {/* ── Document Tab ─────────────────────────────────────── */}
        {activeTab === "document" && (
          <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Document Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {metadata.filename}
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
