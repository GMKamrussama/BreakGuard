import React, { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Shield,
  FolderOpen,
  AlertTriangle,
  FileCode,
  Flame,
  Skull,
  Search,
  Filter,
  Layers,
  X,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Cpu
} from "lucide-react";
import type { DependencyNode, ProjectAnalysisReport } from "@breakguard/core";

// Sample initial desktop data for preview
const INITIAL_DEMO_REPORT: ProjectAnalysisReport = {
  timestamp: new Date().toISOString(),
  projectMetadata: {
    name: "cloudscale-desktop-workspace",
    version: "1.0.0",
    path: "C:\\Projects\\cloudscale-service",
    lockfileType: "pnpm",
  },
  summary: {
    totalDependencies: 18,
    directCount: 6,
    transitiveCount: 12,
    scannedFiles: 24,
    averageRiskScore: 72,
    safeCount: 2,
    moderateCount: 1,
    breakingWarningCount: 3,
    deprecatedCount: 1,
    vulnerableCount: 1,
    ghostDependenciesCount: 1,
    unusedDependenciesCount: 0,
  },
  ghostDependencies: ["clsx"],
  unusedDependencies: [],
  dependencies: {
    axios: {
      id: "axios@0.27.2",
      name: "axios",
      version: "0.27.2",
      latestVersion: "1.7.9",
      requestedRange: "^0.27.2",
      category: "dependencies",
      isTransitive: false,
      depth: 1,
      parents: [],
      dependencies: { "follow-redirects": "1.15.4" },
      astUsage: {
        packageName: "axios",
        isUsed: true,
        isGhostDependency: false,
        isUnusedDependency: false,
        totalFilesCount: 8,
        totalCallSites: 24,
        importedSymbols: ["default", "get", "post"],
        files: [
          {
            filePath: "src/api/client.ts",
            relativePath: "src/api/client.ts",
            totalCallCount: 6,
            imports: [{ type: "default", importedName: "default", localName: "axios", line: 1, column: 1 }],
            calls: [
              { methodName: "create", line: 14, column: 18 },
              { methodName: "interceptors.request.use", line: 20, column: 5 },
            ],
          },
        ],
      },
      risk: {
        score: 88,
        level: "CRITICAL",
        breakdown: {
          semverJump: "major",
          semverScore: 42,
          usageDensityScore: 35,
          deprecationScore: 0,
          vulnerabilityScore: 20,
          penaltyNotes: [
            "Major SemVer jump (0.27.2 ➔ 1.7.9) introduces breaking changes in AxiosHeaders.",
            "High call density: Package used in 8 files with 24 calls.",
          ],
        },
        summary: "Critical breaking risk: Axios v0.x -> v1.x overhaul.",
        recommendedAction: "Migrate AxiosHeaders syntax and verify interceptor return types.",
      },
    },
    request: {
      id: "request@2.88.2",
      name: "request",
      version: "2.88.2",
      latestVersion: "2.88.2",
      category: "dependencies",
      isTransitive: false,
      depth: 1,
      parents: [],
      dependencies: {},
      isDeprecated: true,
      deprecationReason: "Package has been deprecated.",
      risk: {
        score: 90,
        level: "CRITICAL",
        breakdown: {
          semverJump: "none",
          semverScore: 0,
          usageDensityScore: 15,
          deprecationScore: 25,
          vulnerabilityScore: 20,
          penaltyNotes: ["Package is DEPRECATED and abandoned."],
        },
        summary: "Abandoned and insecure package.",
        recommendedAction: "Replace request with native fetch or undici.",
      },
    },
    react: {
      id: "react@18.2.0",
      name: "react",
      version: "18.2.0",
      latestVersion: "19.0.0",
      category: "dependencies",
      isTransitive: false,
      depth: 1,
      parents: [],
      dependencies: {},
      risk: {
        score: 65,
        level: "MODERATE",
        breakdown: {
          semverJump: "major",
          semverScore: 40,
          usageDensityScore: 25,
          deprecationScore: 0,
          vulnerabilityScore: 0,
          penaltyNotes: ["React 19 removes legacy Context API."],
        },
        summary: "React 18 to 19 migration.",
        recommendedAction: "Check peer dependency alignments.",
      },
    },
    "follow-redirects": {
      id: "follow-redirects@1.15.4",
      name: "follow-redirects",
      version: "1.15.4",
      latestVersion: "1.15.6",
      category: "transitive",
      isTransitive: true,
      depth: 2,
      parents: ["axios"],
      dependencies: {},
      risk: {
        score: 15,
        level: "SAFE",
        breakdown: {
          semverJump: "patch",
          semverScore: 5,
          usageDensityScore: 0,
          deprecationScore: 0,
          vulnerabilityScore: 0,
          penaltyNotes: [],
        },
        summary: "Transitive sub-dependency.",
        recommendedAction: "Updated automatically with parent.",
      },
    },
  },
};

// Custom Node for Desktop React Flow
const DesktopNode = ({ data }: any) => {
  const { node, isSelected } = data;
  const risk = node.risk;
  const level = risk?.level || "SAFE";
  const score = risk?.score ?? 0;

  let borderColor = "border-slate-700";
  let badgeBg = "bg-emerald-950 text-emerald-300 border-emerald-500/40";

  if (node.isDeprecated) {
    borderColor = "border-purple-500/80";
    badgeBg = "bg-purple-950 text-purple-300 border-purple-500/40";
  } else if (level === "CRITICAL" || level === "BREAKING_WARNING") {
    borderColor = "border-red-500/80";
    badgeBg = "bg-red-950 text-red-300 border-red-500/50";
  } else if (level === "MODERATE") {
    borderColor = "border-amber-500/70";
    badgeBg = "bg-amber-950 text-amber-300 border-amber-500/40";
  }

  if (isSelected) {
    borderColor = "border-blue-400 ring-2 ring-blue-500/50";
  }

  return (
    <div
      className={`min-w-[220px] rounded-xl bg-slate-900/95 p-3 backdrop-blur-md border transition-all ${borderColor} cursor-pointer hover:border-blue-400`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="truncate">
          <div className="font-semibold text-slate-100 text-xs truncate">{node.name}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            v{node.version}
            {node.latestVersion && node.latestVersion !== node.version && (
              <span className="text-blue-400 ml-1">➔ v{node.latestVersion}</span>
            )}
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
          {score}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
};

const nodeTypes = {
  desktopNode: DesktopNode,
};

export default function App() {
  const [report, setReport] = useState<ProjectAnalysisReport>(INITIAL_DEMO_REPORT);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(report.dependencies["axios"] || null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Handle Directory Selection via Tauri or Web input
  async function handleSelectDirectory() {
    try {
      // If running inside Tauri v2
      if (window && (window as any).__TAURI_INTERNALS__) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          multiple: false,
          title: "Select Node.js Project Directory for BreakGuard Audit",
        });
        if (selected && typeof selected === "string") {
          runAuditOnPath(selected);
        }
      } else {
        // Fallback for browser preview
        const mockPath = prompt("Enter project directory path to analyze:", report.projectMetadata.path || "C:\\Projects\\my-app");
        if (mockPath) {
          runAuditOnPath(mockPath);
        }
      }
    } catch {
      // fallback
    }
  }

  function runAuditOnPath(dirPath: string) {
    setIsAnalyzing(true);
    setTimeout(() => {
      setReport((prev) => ({
        ...prev,
        projectMetadata: {
          ...prev.projectMetadata,
          name: dirPath.split(/[\\/]/).pop() || "scanned-project",
          path: dirPath,
        },
      }));
      setIsAnalyzing(false);
    }, 800);
  }

  // Nodes & Edges layout
  const { nodes, edges } = useMemo(() => {
    const rawNodes = Object.values(report.dependencies);
    const filtered = rawNodes.filter((n) => {
      if (searchQuery && !n.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filter === "direct") return !n.isTransitive;
      if (filter === "breaking") return n.risk?.level === "CRITICAL" || n.risk?.level === "BREAKING_WARNING";
      if (filter === "deprecated") return n.isDeprecated;
      return true;
    });

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const directNodes = filtered.filter((n) => !n.isTransitive);
    const transNodes = filtered.filter((n) => n.isTransitive);

    directNodes.forEach((node, i) => {
      flowNodes.push({
        id: node.name,
        type: "desktopNode",
        position: { x: (i % 3) * 260 + 30, y: Math.floor(i / 3) * 120 + 30 },
        data: { node, isSelected: selectedNode?.name === node.name },
      });

      for (const sub of Object.keys(node.dependencies)) {
        flowEdges.push({
          id: `${node.name}->${sub}`,
          source: node.name,
          target: sub,
          style: { stroke: "#475569", strokeWidth: 1.5 },
        });
      }
    });

    transNodes.forEach((node, i) => {
      flowNodes.push({
        id: node.name,
        type: "desktopNode",
        position: { x: (i % 3) * 260 + 30, y: 300 + Math.floor(i / 3) * 120 },
        data: { node, isSelected: selectedNode?.name === node.name },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [report, selectedNode, filter, searchQuery]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Native Desktop Window Header */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-950/80 px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">BreakGuard Desktop</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono">
                Tauri v2
              </span>
            </div>
          </div>
        </div>

        {/* Directory Picker Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectDirectory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {isAnalyzing ? "Scanning Codebase..." : "Open Project Folder"}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph & Summary Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar Summary */}
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">{report.projectMetadata.name}</span>
              <span className="font-mono text-slate-500 text-[11px] truncate max-w-sm">
                {report.projectMetadata.path}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-red-400 font-semibold">{report.summary.breakingWarningCount} Breaking</span>
              <span>•</span>
              <span className="text-purple-400 font-semibold">{report.summary.deprecatedCount} Deprecated</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{report.summary.safeCount} Safe</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "direct", label: "Direct Only" },
                { id: "breaking", label: "Breaking" },
                { id: "deprecated", label: "Deprecated" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    filter === btn.id ? "bg-blue-600 text-white" : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* React Flow View */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelectedNode((n.data as any).node)}
              fitView
            >
              <Background color="#1e293b" gap={18} size={1} variant={BackgroundVariant.Dots} />
              <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
              <MiniMap
                nodeStrokeColor="#38bdf8"
                nodeColor="#1e293b"
                maskColor="rgba(7, 11, 20, 0.7)"
                className="!bg-slate-900/90 !border-slate-800 !rounded-lg"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Side Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/90 p-4 overflow-y-auto flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedNode.name}</h3>
                  <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                    v{selectedNode.version} ➔ v{selectedNode.latestVersion || selectedNode.version}
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Risk Meter */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 mb-4 space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Breaking Risk</span>
                  <span className="font-bold text-slate-100">{selectedNode.risk?.score || 0}/100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (selectedNode.risk?.score || 0) >= 70 ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${selectedNode.risk?.score || 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">{selectedNode.risk?.summary}</p>
              </div>

              {/* AST Call Sites */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-blue-400" />
                  AST Call Sites in Code
                </div>
                {selectedNode.astUsage?.files && selectedNode.astUsage.files.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedNode.astUsage.files.map((f, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px]">
                        <div className="text-blue-300 truncate">{f.relativePath}</div>
                        <div className="text-slate-500 mt-0.5">
                          {f.calls.map((c) => `${c.methodName}():L${c.line}`).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">No direct call sites detected.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Local AST Engine</span>
              <span className="font-mono">Zero Cloud Upload</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
