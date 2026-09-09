"use client";

import React, { useState } from "react";
import { SAMPLE_ENTERPRISE_REPORT } from "@/lib/sample-data";
import { SummaryMatrix } from "@/components/matrix/SummaryMatrix";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { NodeInspector } from "@/components/drawer/NodeInspector";
import { SandboxModal } from "@/components/sandbox/SandboxModal";
import { UploadModal } from "@/components/upload/UploadModal";
import type { DependencyNode, ProjectAnalysisReport } from "@breakguard/core-types";
import {
  Shield,
  Upload,
  Download,
  Search,
  Filter,
  Layers,
  Sparkles,
  Play,
  TerminalSquare
} from "lucide-react";

export default function DashboardPage() {
  const [report, setReport] = useState<ProjectAnalysisReport>(SAMPLE_ENTERPRISE_REPORT);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(
    report.dependencies["axios"] || null
  );
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [sandboxTargetNode, setSandboxTargetNode] = useState<DependencyNode | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  function handleSelectNode(node: DependencyNode) {
    setSelectedNode(node);
  }

  function handleRunSandbox(node: DependencyNode) {
    setSandboxTargetNode(node);
    setIsSandboxOpen(true);
  }

  function handleExportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `breakguard-${report.projectMetadata.name}-report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleExportMarkdown() {
    let md = `# BreakGuard Audit Report: ${report.projectMetadata.name} (v${report.projectMetadata.version})\n\n`;
    md += `* **Analysis Timestamp:** ${report.timestamp}\n`;
    md += `* **Lockfile Format:** ${report.projectMetadata.lockfileType}\n`;
    md += `* **Composite Risk Score:** ${report.summary.averageRiskScore}/100\n`;
    md += `* **Total Dependencies:** ${report.summary.totalDependencies} (${report.summary.directCount} direct, ${report.summary.transitiveCount} transitive)\n\n`;
    md += `## Dependency Breakdown\n\n`;
    md += `| Package | Current | Latest | Risk Score | Level | Call Sites |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const node of Object.values(report.dependencies)) {
      md += `| ${node.name} | ${node.version} | ${node.latestVersion || "-"} | ${node.risk?.score ?? 0}/100 | ${node.risk?.level || "SAFE"} | ${node.astUsage?.totalCallSites || 0} |\n`;
    }

    if (report.ghostDependencies.length > 0) {
      md += `\n### ⚠️ Ghost Dependencies\n\n`;
      md += report.ghostDependencies.map((g) => `- \`${g}\` (imported in code but not in package.json)`).join("\n");
    }

    if (report.unusedDependencies.length > 0) {
      md += `\n### 💡 Unused Dependencies\n\n`;
      md += report.unusedDependencies.map((u) => `- \`${u}\` (declared in package.json with 0 code usages)`).join("\n");
    }

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `breakguard-${report.projectMetadata.name}-report.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">BreakGuard</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AST & SemVer Predictor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Static Codebase Analyzer & Breaking Change Predictor for Node.js
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Scan Repository / Upload
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 text-xs">
              <button
                onClick={handleExportJson}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 transition"
              >
                Export JSON Report
              </button>
              <button
                onClick={handleExportMarkdown}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 transition"
              >
                Export Markdown Summary
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto space-y-6">
        {/* Project Metadata Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">
                  {report.projectMetadata.name}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  v{report.projectMetadata.version}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono uppercase">
                  {report.projectMetadata.lockfileType} lockfile
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {report.projectMetadata.path || "Scanned Workspace Repository"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedNode) handleRunSandbox(selectedNode);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 transition cursor-pointer"
            >
              <TerminalSquare className="w-3.5 h-3.5 text-blue-400" />
              Isolated Sandbox Runner
            </button>
          </div>
        </div>

        {/* 1. Summary Matrix Cards */}
        <SummaryMatrix report={report} onFilterChange={setFilter} activeFilter={filter} />

        {/* 2. Interactive Dependency Graph & Controls */}
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search package name (e.g. axios, react)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-slate-800 pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
              {[
                { id: "all", label: "All Packages" },
                { id: "direct", label: "Direct Only" },
                { id: "breaking", label: "Breaking / Critical" },
                { id: "deprecated", label: "Deprecated" },
                { id: "safe", label: "Safe Upgrades" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    filter === btn.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graph View */}
          <div className="relative">
            <DependencyGraph
              report={report}
              selectedNodeId={selectedNode?.name || null}
              onSelectNode={handleSelectNode}
              filter={filter}
              searchQuery={searchQuery}
            />

            {/* Side Drawer Inspector */}
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onRunSandbox={handleRunSandbox}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <SandboxModal
        node={sandboxTargetNode}
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onLoadReport={(rep) => {
          setReport(rep);
          setSelectedNode(Object.values(rep.dependencies)[0] || null);
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/60 p-4 text-center text-xs text-slate-500">
        BreakGuard 🛡️ — Static AST Codebase Analyzer & Breaking Change Predictor for Node.js Dependencies.
      </footer>
    </div>
  );
}
