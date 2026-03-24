"use client";

import { useMemo, useState } from "react";
import { Table, ChevronUp, ChevronDown, Search } from "lucide-react";

interface DataTableProps {
  data: Record<string, string>[];
}

export function DataTable({ data }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const filteredAndSorted = useMemo(() => {
    let result = [...data];

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = String(a[sortKey] || "");
        const bVal = String(b[sortKey] || "");

        // Try numeric comparison
        const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ""));
        const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ""));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }

        // Fallback to string comparison
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [data, sortKey, sortDir, searchTerm]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-[hsl(var(--border))]">
        <Table className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          No tabular data extracted from this document.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[hsl(var(--border))] shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[hsl(var(--primary))]" />
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Extracted Report
          </h3>
          <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
            ({filteredAndSorted.length} of {data.length} rows)
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary)/0.5)] w-44 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider cursor-pointer hover:text-[hsl(var(--foreground))] transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    {sortKey === col && (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-[hsl(var(--border)/0.5)] table-row-hover transition-colors ${
                  rowIdx % 2 === 1 ? "bg-[hsl(var(--background)/0.5)]" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2.5 text-[hsl(var(--foreground))] whitespace-nowrap"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
