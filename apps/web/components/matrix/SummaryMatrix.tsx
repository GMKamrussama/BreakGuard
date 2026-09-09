"use client";

import React from "react";
import type { ProjectAnalysisReport } from "@breakguard/core-types";
import {
  ShieldAlert,
  ShieldCheck,
  Package,
  Layers,
  Skull,
  Ghost,
  FileCode2,
  Trash2,
  AlertTriangle
} from "lucide-react";

interface SummaryMatrixProps {
  report: ProjectAnalysisReport;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export function SummaryMatrix({ report, onFilterChange, activeFilter }: SummaryMatrixProps) {
  const { summary, projectMetadata } = report;
  const avg = summary.averageRiskScore;

  let riskColor = "text-emerald-400";
  let riskBg = "border-emerald-500/30 bg-emerald-950/20";
  let riskText = "Safe Upgrades";

  if (avg >= 70) {
    riskColor = "text-red-400";
    riskBg = "border-red-500/30 bg-red-950/20";
    riskText = "Critical Breaking Risk";
  } else if (avg >= 45) {
    riskColor = "text-amber-400";
    riskBg = "border-amber-500/30 bg-amber-950/20";
    riskText = "Moderate Migration Risk";
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Composite Project Risk Score */}
      <div className={`p-4 rounded-2xl border ${riskBg} glass-panel flex flex-col justify-between`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Composite Project Risk
          </span>
          <ShieldAlert className={`w-4 h-4 ${riskColor}`} />
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className={`text-4xl font-extrabold ${riskColor}`}>{avg}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
        <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${avg >= 70 ? "bg-red-500" : avg >= 45 ? "bg-amber-500" : "bg-emerald-500"}`} />
          {riskText}
        </div>
      </div>

      {/* 2. Direct & Transitive Count */}
      <div
        onClick={() => onFilterChange(activeFilter === "direct" ? "all" : "direct")}
        className={`p-4 rounded-2xl border glass-panel flex flex-col justify-between cursor-pointer transition hover:border-blue-500/50 ${
          activeFilter === "direct" ? "border-blue-500 bg-blue-950/20" : "border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Dependency Tree
          </span>
          <Package className="w-4 h-4 text-blue-400" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-slate-100">{summary.totalDependencies}</span>
          <span className="text-xs text-slate-400 ml-1.5">packages</span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="text-blue-400 font-mono font-medium">{summary.directCount} direct</span>
          <span>•</span>
          <span className="text-slate-400 font-mono">{summary.transitiveCount} transitive</span>
        </div>
      </div>

      {/* 3. Breaking Warnings & Critical */}
      <div
        onClick={() => onFilterChange(activeFilter === "breaking" ? "all" : "breaking")}
        className={`p-4 rounded-2xl border glass-panel flex flex-col justify-between cursor-pointer transition hover:border-red-500/50 ${
          activeFilter === "breaking" ? "border-red-500 bg-red-950/20" : "border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Breaking Warnings
          </span>
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-red-400">{summary.breakingWarningCount}</span>
          <span className="text-xs text-slate-400 ml-1.5">packages</span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="text-amber-400 font-mono">{summary.moderateCount} moderate</span>
          <span>•</span>
          <span className="text-emerald-400 font-mono">{summary.safeCount} safe</span>
        </div>
      </div>

      {/* 4. Deprecations & Vulnerabilities */}
      <div
        onClick={() => onFilterChange(activeFilter === "deprecated" ? "all" : "deprecated")}
        className={`p-4 rounded-2xl border glass-panel flex flex-col justify-between cursor-pointer transition hover:border-purple-500/50 ${
          activeFilter === "deprecated" ? "border-purple-500 bg-purple-950/20" : "border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Deprecated & Insecure
          </span>
          <Skull className="w-4 h-4 text-purple-400" />
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-purple-400">{summary.deprecatedCount}</span>
          <span className="text-xs text-slate-400">deprecated</span>
        </div>
        <div className="text-xs text-red-400 font-mono flex items-center gap-1.5">
          <span>{summary.vulnerableCount} with CVE advisories</span>
        </div>
      </div>

      {/* 5. AST Ghost & Unused Detection */}
      <div className="p-4 rounded-2xl border border-slate-800 glass-panel flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            AST Codebase Insights
          </span>
          <FileCode2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="my-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5" title="Imported in code but missing from package.json">
            <Ghost className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-bold text-amber-400">{summary.ghostDependenciesCount}</span>
            <span className="text-[11px] text-slate-400">Ghost</span>
          </div>
          <div className="flex items-center gap-1.5" title="Declared in package.json with 0 code imports">
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span className="text-xl font-bold text-slate-400">{summary.unusedDependenciesCount}</span>
            <span className="text-[11px] text-slate-400">Unused</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono truncate">
          {summary.scannedFiles} files scanned with SWC AST
        </div>
      </div>
    </div>
  );
}
