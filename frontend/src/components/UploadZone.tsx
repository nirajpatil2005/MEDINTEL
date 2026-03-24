"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileText, Sparkles } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Hero Text */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent))] border border-[hsl(var(--primary)/0.2)] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            <span className="text-xs font-semibold text-[hsl(var(--primary))]">
              AI-Powered Analysis
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-3 font-heading text-[hsl(var(--foreground))]">
            Medical Document Intelligence
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] text-base max-w-lg mx-auto leading-relaxed">
            Upload a medical stock report PDF. Our AI engine extracts structured data,
            preserves original column names, and generates executive insights — instantly.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`
            upload-zone cursor-pointer rounded-2xl border-2 border-dashed p-12
            flex flex-col items-center justify-center gap-5 transition-all duration-300
            ${
              isDragging
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))] scale-[1.01]"
                : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] bg-white"
            }
          `}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? "bg-[hsl(var(--primary)/0.12)]"
                : "bg-[hsl(var(--secondary))]"
            }`}
          >
            {isDragging ? (
              <FileText className="w-7 h-7 text-[hsl(var(--primary))]" />
            ) : (
              <Upload className="w-7 h-7 text-[hsl(var(--muted-foreground))]" />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {isDragging ? "Drop your PDF here" : "Drag & drop your medical stock PDF"}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              or click to browse • PDF files only
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: "📊", title: "Data Extraction", desc: "Preserves exact column names" },
            { icon: "🧠", title: "AI Insights", desc: "Executive-level analysis" },
            { icon: "⚡", title: "Instant Export", desc: "CSV & Excel downloads" },
          ].map((feat) => (
            <div
              key={feat.title}
              className="glass-panel rounded-xl p-4 text-center card-lift"
            >
              <div className="text-xl mb-2">{feat.icon}</div>
              <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {feat.title}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
