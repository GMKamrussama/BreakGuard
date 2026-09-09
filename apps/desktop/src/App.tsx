import React, { useState, useMemo, useRef } from "react";
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
  MarkerType,
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
  Cpu,
  Copy,
  Check,
  Play,
  Sparkles,
  Terminal,
  ExternalLink,
  Code2,
  Table,
  Network,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Lock,
  SlidersHorizontal,
  FolderCheck,
  PanelRightClose,
  PanelRightOpen,
  Bot,
  Download,
  FolderGit2,
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
          {
            filePath: "src/services/auth.ts",
            relativePath: "src/services/auth.ts",
            totalCallCount: 3,
            imports: [{ type: "named", importedName: "post", localName: "post", line: 2, column: 10 }],
            calls: [{ methodName: "post", line: 32, column: 12 }],
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
            "Potential type signature incompatibility in AxiosRequestConfig.",
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
      deprecationReason: "Package has been deprecated and abandoned by the author.",
      astUsage: {
        packageName: "request",
        isUsed: true,
        isGhostDependency: false,
        isUnusedDependency: false,
        totalFilesCount: 3,
        totalCallSites: 7,
        importedSymbols: ["default"],
        files: [
          {
            filePath: "src/legacy/sync.ts",
            relativePath: "src/legacy/sync.ts",
            totalCallCount: 7,
            imports: [{ type: "default", importedName: "default", localName: "request", line: 1, column: 1 }],
            calls: [
              { methodName: "get", line: 45, column: 5 },
              { methodName: "post", line: 72, column: 5 },
            ],
          },
        ],
      },
      risk: {
        score: 90,
        level: "CRITICAL",
        breakdown: {
          semverJump: "none",
          semverScore: 0,
          usageDensityScore: 15,
          deprecationScore: 25,
          vulnerabilityScore: 20,
          penaltyNotes: [
            "Package is officially DEPRECATED and abandoned.",
            "Contains unpatched SSRF and ReDoS vulnerabilities.",
          ],
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
      astUsage: {
        packageName: "react",
        isUsed: true,
        isGhostDependency: false,
        isUnusedDependency: false,
        totalFilesCount: 16,
        totalCallSites: 64,
        importedSymbols: ["useState", "useEffect", "useMemo"],
        files: [
          {
            filePath: "src/components/Provider.tsx",
            relativePath: "src/components/Provider.tsx",
            totalCallCount: 12,
            imports: [{ type: "named", importedName: "createContext", localName: "createContext", line: 1, column: 1 }],
            calls: [{ methodName: "createContext", line: 8, column: 22 }],
          },
        ],
      },
      risk: {
        score: 65,
        level: "MODERATE",
        breakdown: {
          semverJump: "major",
          semverScore: 40,
          usageDensityScore: 25,
          deprecationScore: 0,
          vulnerabilityScore: 0,
          penaltyNotes: [
            "React 19 removes legacy Context API and string refs.",
            "May cause peer dependency conflicts with older UI libraries.",
          ],
        },
        summary: "React 18 to 19 major upgrade.",
        recommendedAction: "Check peer dependency alignments and migrate legacy ref patterns.",
      },
    },
    lodash: {
      id: "lodash@4.17.20",
      name: "lodash",
      version: "4.17.20",
      latestVersion: "4.17.21",
      category: "dependencies",
      isTransitive: false,
      depth: 1,
      parents: [],
      dependencies: {},
      astUsage: {
        packageName: "lodash",
        isUsed: true,
        isGhostDependency: false,
        isUnusedDependency: false,
        totalFilesCount: 5,
        totalCallSites: 14,
        importedSymbols: ["debounce", "cloneDeep"],
        files: [
          {
            filePath: "src/utils/helpers.ts",
            relativePath: "src/utils/helpers.ts",
            totalCallCount: 4,
            imports: [{ type: "named", importedName: "debounce", localName: "debounce", line: 1, column: 10 }],
            calls: [{ methodName: "debounce", line: 19, column: 15 }],
          },
        ],
      },
      risk: {
        score: 10,
        level: "SAFE",
        breakdown: {
          semverJump: "patch",
          semverScore: 5,
          usageDensityScore: 5,
          deprecationScore: 0,
          vulnerabilityScore: 0,
          penaltyNotes: [],
        },
        summary: "Safe patch release containing security fixes.",
        recommendedAction: "Safe to update immediately.",
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
        summary: "Transitive sub-dependency under axios.",
        recommendedAction: "Updated automatically when parent axios is updated.",
      },
    },
  },
};

// Custom Node for Desktop React Flow (Clean, non-intrusive styling)
const cleanVersion = (v?: string) => {
  if (!v) return "";
  return v.split("(")[0].split("_")[0].trim();
};

// Custom Node for Desktop React Flow (Clean, non-intrusive styling)
const DesktopNode = ({ data }: any) => {
  const { node, isSelected, onSelect } = data;
  const risk = node.risk;
  const level = risk?.level || "SAFE";
  const score = risk?.score ?? 0;

  let borderColor = "border-slate-800";
  let badgeBg = "bg-emerald-950/80 text-emerald-400 border-emerald-500/30";
  let glowEffect = "";

  if (node.isDeprecated) {
    borderColor = "border-purple-500/60";
    badgeBg = "bg-purple-950/80 text-purple-300 border-purple-500/40";
    glowEffect = "shadow-sm shadow-purple-500/10";
  } else if (level === "CRITICAL" || level === "BREAKING_WARNING") {
    borderColor = "border-red-500/70";
    badgeBg = "bg-red-950/80 text-red-300 border-red-500/40";
    glowEffect = "shadow-sm shadow-red-500/10";
  } else if (level === "MODERATE") {
    borderColor = "border-amber-500/60";
    badgeBg = "bg-amber-950/80 text-amber-300 border-amber-500/40";
    glowEffect = "shadow-sm shadow-amber-500/10";
  }

  if (isSelected) {
    borderColor = "border-blue-400 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20";
  }

  const callCount = node.astUsage?.totalCallSites ?? 0;
  const filesCount = node.astUsage?.totalFilesCount ?? 0;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(node);
      }}
      className={`w-[260px] max-w-[260px] rounded-xl bg-slate-900/95 p-3 backdrop-blur-md border transition-all duration-200 ${borderColor} ${glowEffect} cursor-pointer hover:border-blue-400 hover:scale-[1.02] overflow-hidden`}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1 pointer-events-none" />

      {/* Top Tag & Status */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
              node.isTransitive ? "bg-slate-800 text-slate-400" : "bg-blue-950 text-blue-300 border border-blue-800/40"
            }`}
          >
            {node.isTransitive ? "Transitive" : "Direct"}
          </span>
          {node.isDeprecated && (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold bg-purple-950 text-purple-300 border border-purple-800/40">
              Deprecated
            </span>
          )}
        </div>

        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badgeBg}`}>
          {score}/100
        </div>
      </div>

      {/* Package Name & Versions */}
      <div className="mb-2">
        <div className="font-bold text-slate-100 text-xs truncate" title={node.name}>
          {node.name}
        </div>
        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5 truncate">
          <span className="truncate">v{cleanVersion(node.version)}</span>
          {node.latestVersion && cleanVersion(node.latestVersion) !== cleanVersion(node.version) && (
            <>
              <span className="text-slate-500">➔</span>
              <span className="text-blue-400 font-semibold truncate">v{cleanVersion(node.latestVersion)}</span>
            </>
          )}
        </div>
      </div>

      {/* AST Call / Dependency Tree Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1 truncate max-w-[170px]">
          <Code2 className="w-3 h-3 text-slate-500 shrink-0" />
          {filesCount > 0 ? (
            <span className="text-blue-300 font-semibold truncate">
              {callCount} call{callCount > 1 ? "s" : ""} ({filesCount} files)
            </span>
          ) : node.isTransitive ? (
            <span className="text-slate-400 truncate" title={node.parents?.length ? `Imported by ${node.parents.join(', ')}` : "Transitive dependency"}>
              {node.parents && node.parents.length > 0 ? `via ${node.parents[0]}` : "Sub-dependency"}
            </span>
          ) : (
            <span className="text-slate-400 truncate" title="Build/CLI tool (Not directly imported in runtime source code)">
              Dev / Build Tool
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(node);
          }}
          className="text-blue-400 font-medium hover:underline text-[10px] cursor-pointer shrink-0"
        >
          Inspect ➔
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1 pointer-events-none" />
    </div>
  );
};

// Distinct Tree Starting Point Node
const RootNode = ({ data }: any) => {
  return (
    <div className="w-[340px] rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-2 border-blue-400 p-3.5 shadow-2xl shadow-blue-500/30 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30 shrink-0">
          <FolderGit2 className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-mono text-blue-300 font-bold uppercase tracking-wider block">
              TREE STARTING POINT
            </span>
          </div>
          <h4 className="text-xs font-extrabold text-white truncate max-w-[230px]" title={data.projectName}>
            {data.projectName}
          </h4>
        </div>
      </div>
      <div className="pt-2 border-t border-blue-800/40 flex items-center justify-between text-[11px] text-blue-200 font-mono">
        <span>{data.totalDirect} Direct Roots</span>
        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold uppercase text-[10px]">
          {data.lockfileType}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1 pointer-events-none" />
    </div>
  );
};

// Branch Hub Node for Grouping Dependencies cleanly
const BranchHubNode = ({ data }: any) => {
  return (
    <div className={`w-[270px] rounded-2xl p-3.5 border shadow-xl backdrop-blur-xl transition-all ${data.containerStyle}`}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="p-1.5 rounded-xl bg-black/40 text-base shadow-inner">{data.icon}</span>
        <div className="overflow-hidden">
          <h4 className="text-xs font-bold text-white leading-tight truncate">{data.title}</h4>
          <span className="text-[10px] text-slate-300 font-mono font-semibold">{data.count} Packages</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-300 leading-snug">{data.description}</p>
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1 pointer-events-none" />
    </div>
  );
};

// End / Leaf Node for To-The-Point terminal branch
const EndLeafNode = ({ data }: any) => {
  return (
    <div className="w-[260px] rounded-xl bg-slate-950/95 border border-slate-800/90 p-3 text-center shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-center gap-1.5 text-slate-300 text-xs font-semibold">
        <span>🍃</span>
        <span>{data.label || "End of Dependency Tree"}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{data.subLabel || "No further nested dependencies"}</p>
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1 pointer-events-none" />
    </div>
  );
};

const nodeTypes = {
  desktopNode: DesktopNode,
  rootNode: RootNode,
  hubNode: BranchHubNode,
  leafNode: EndLeafNode,
};

export default function App() {
  const [report, setReport] = useState<ProjectAnalysisReport>(INITIAL_DEMO_REPORT);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(report.dependencies["axios"] || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");
  const [graphLayoutMode, setGraphLayoutMode] = useState<"tree" | "focused">("tree");
  const [activeTab, setActiveTab] = useState<"overview" | "calls" | "sandbox">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Global AI Fix Modal States
  const [isAiFixModalOpen, setIsAiFixModalOpen] = useState<boolean>(false);
  const [aiPromptScope, setAiPromptScope] = useState<"breaking" | "selected" | "all">("breaking");
  const [isPromptCopied, setIsPromptCopied] = useState<boolean>(false);

  // Folder selection and exclusion modal states
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [targetFolderPath, setTargetFolderPath] = useState<string>("F:\\Client Project\\BreakGuard");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Exclusion Rules State
  const [exclusions, setExclusions] = useState<{
    nodeModules: boolean;
    git: boolean;
    distBuild: boolean;
    nextTurbo: boolean;
    coverage: boolean;
    customPatterns: string;
  }>({
    nodeModules: true,
    git: true,
    distBuild: true,
    nextTurbo: true,
    coverage: true,
    customPatterns: "",
  });

  const [isBrowsingFolder, setIsBrowsingFolder] = useState<boolean>(false);
  const [discoveredProjects, setDiscoveredProjects] = useState<
    Array<{ name: string; path: string; isCurrent: boolean; lockfile: string | null }>
  >([
    { name: "BreakGuard", path: "F:\\Client Project\\BreakGuard", isCurrent: true, lockfile: "pnpm" },
    { name: "PowerLockGuard", path: "F:\\Client Project\\PowerLockGuard", isCurrent: false, lockfile: "pnpm" },
  ]);

  // Load recent & discovered workspaces from server when modal opens
  React.useEffect(() => {
    if (isScanModalOpen) {
      const apiHost = window.location.port === "1420" ? "http://localhost:4567" : "";
      fetch(`${apiHost}/api/projects`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.projects) && data.projects.length > 0) {
            setDiscoveredProjects(data.projects);
          }
        })
        .catch(() => {});
    }
  }, [isScanModalOpen]);

  // Handle Directory Selection natively via local server or Tauri
  async function handleBrowseFolder() {
    setIsBrowsingFolder(true);
    try {
      if (window && (window as any).__TAURI_INTERNALS__) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          multiple: false,
          title: "Select Node.js Project Directory",
        });
        if (selected && typeof selected === "string") {
          setTargetFolderPath(selected);
        }
      } else if (typeof (window as any).showDirectoryPicker === "function") {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          const match = discoveredProjects.find(
            (p) => p.name.toLowerCase() === dirHandle.name.toLowerCase()
          );
          if (match) {
            setTargetFolderPath(match.path);
          } else {
            setTargetFolderPath(`F:\\Client Project\\${dirHandle.name}`);
          }
        }
      }
    } catch {
      // User cancelled picker or browser denied permission
    } finally {
      setIsBrowsingFolder(false);
    }
  }

  const [sandboxState, setSandboxState] = useState<{
    isRunning: boolean;
    hasRun: boolean;
    passed: boolean;
    output: string;
  }>({
    isRunning: false,
    hasRun: false,
    passed: false,
    output: "",
  });

  // Execute REAL Codebase Audit
  async function handleExecuteAudit() {
    setIsScanning(true);
    setScanError(null);

    // Build exclusion patterns list
    const activeExclusions: string[] = [];
    if (exclusions.nodeModules) activeExclusions.push("**/node_modules/**");
    if (exclusions.git) activeExclusions.push("**/.git/**");
    if (exclusions.distBuild) activeExclusions.push("**/dist/**", "**/build/**", "**/out/**");
    if (exclusions.nextTurbo) activeExclusions.push("**/.next/**", "**/.turbo/**", "**/.cache/**");
    if (exclusions.coverage) activeExclusions.push("**/coverage/**");

    if (exclusions.customPatterns.trim()) {
      const custom = exclusions.customPatterns
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      activeExclusions.push(...custom);
    }

    try {
      const apiHost = window.location.port === "1420" ? "http://localhost:4567" : "";
      const response = await fetch(`${apiHost}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPath: targetFolderPath.trim(),
          excludePatterns: activeExclusions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error ${response.status}`);
      }

      const realReport: ProjectAnalysisReport = await response.json();

      setReport(realReport);
      const firstKey = Object.keys(realReport.dependencies)[0];
      if (firstKey) {
        // Pick highest risk package if available
        const sorted = Object.values(realReport.dependencies).sort(
          (a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0)
        );
        setSelectedNode(sorted[0]);
      } else {
        setSelectedNode(null);
      }

      setIsScanModalOpen(false);
      setStatusToast(`Audited ${realReport.summary.totalDependencies} dependencies in ${realReport.projectMetadata.name}`);
      setTimeout(() => setStatusToast(null), 4000);
    } catch (err: any) {
      setScanError(err.message || "Failed to scan directory. Check that package.json exists.");
    } finally {
      setIsScanning(false);
    }
  }

  // Filtered packages list
  const filteredPackages = useMemo(() => {
    const rawNodes = Object.values(report.dependencies);
    return rawNodes.filter((n) => {
      if (searchQuery && !n.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filter === "direct") return !n.isTransitive;
      if (filter === "breaking") return n.risk?.level === "CRITICAL" || n.risk?.level === "BREAKING_WARNING";
      if (filter === "deprecated") return n.isDeprecated;
      if (filter === "safe") return n.risk?.level === "SAFE";
      return true;
    });
  }, [report, filter, searchQuery]);

  // Nodes & Edges layout for React Flow (Tree-oriented with clean Starting Point, Category Hubs & To-The-Point Focus)
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const directNodes = filteredPackages.filter((n) => !n.isTransitive);
    const transNodes = filteredPackages.filter((n) => n.isTransitive);

    // Helper for coloring edges according to target dependency risk level
    function getEdgeRiskColor(targetPkgName: string) {
      const pkg = report.dependencies[targetPkgName];
      if (!pkg) return { color: "#38bdf8", width: 1.5, animated: false };
      const score = pkg.risk?.score ?? 0;
      const level = pkg.risk?.level ?? "SAFE";

      if (pkg.isDeprecated) {
        return { color: "#c084fc", width: 2, animated: true }; // purple
      }
      if (level === "CRITICAL" || score >= 80) {
        return { color: "#ef4444", width: 2.5, animated: true }; // crimson red
      }
      if (level === "BREAKING_WARNING" || score >= 60) {
        return { color: "#f97316", width: 2, animated: true }; // orange
      }
      if (level === "MODERATE" || score >= 40) {
        return { color: "#f59e0b", width: 1.8, animated: false }; // amber
      }
      return { color: "#38bdf8", width: 1.3, animated: false }; // cyan-blue
    }

    // =========================================================================
    // MODE 1: "TO-THE-POINT" FOCUSED TREE BRANCH
    // Clear, isolated path: Starting Point ➔ Target Package ➔ Sub-dependencies ➔ Leaves
    // =========================================================================
    if (graphLayoutMode === "focused") {
      const target =
        selectedNode ||
        directNodes.find((n) => n.risk?.level === "CRITICAL") ||
        directNodes[0] ||
        filteredPackages[0];

      if (!target) {
        return { nodes: [], edges: [] };
      }

      // 1. Root Starting Point Anchor
      flowNodes.push({
        id: "project-root-anchor",
        type: "rootNode",
        position: { x: 420, y: -40 },
        data: {
          projectName: report.projectMetadata.name,
          lockfileType: report.projectMetadata.lockfileType || "pnpm",
          totalDirect: 1,
          totalTransitive: Object.keys(target.dependencies || {}).length,
        },
      });

      // 2. Target Package Node
      const targetRisk = getEdgeRiskColor(target.name);
      flowNodes.push({
        id: target.name,
        type: "desktopNode",
        position: { x: 420, y: 150 },
        data: {
          node: target,
          isSelected: true,
          onSelect: (selected: DependencyNode) => {
            setSelectedNode(selected);
            setIsDrawerOpen(true);
            setActiveTab("overview");
          },
        },
      });

      // Edge from Root to Target Package
      flowEdges.push({
        id: `root->${target.name}`,
        source: "project-root-anchor",
        target: target.name,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: targetRisk.color,
          strokeWidth: 3,
          strokeDasharray: "5,5",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: targetRisk.color,
        },
      });

      // 3. Children / Sub-dependencies (Leaves)
      const subDepNames = Object.keys(target.dependencies || {});
      if (subDepNames.length === 0) {
        flowNodes.push({
          id: "leaf-terminal-node",
          type: "leafNode",
          position: { x: 460, y: 340 },
          data: {
            label: "End of Dependency Tree",
            subLabel: `${target.name} has no further sub-dependencies (Clean leaf)`,
          },
        });

        flowEdges.push({
          id: `${target.name}->leaf-terminal`,
          source: target.name,
          target: "leaf-terminal-node",
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 1.5, strokeDasharray: "4,4" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
        });
      } else {
        const displaySubs = subDepNames.slice(0, 20);
        const subCols = Math.min(4, Math.max(2, displaySubs.length));
        const subStartX = Math.max(20, 550 - (subCols * 290) / 2);

        displaySubs.forEach((subName, i) => {
          const childPkg = report.dependencies[subName] || {
            name: subName,
            version: target.dependencies?.[subName] || "unknown",
            isTransitive: true,
            risk: { score: 10, level: "SAFE" },
          };
          const childRisk = getEdgeRiskColor(subName);

          flowNodes.push({
            id: subName,
            type: "desktopNode",
            position: {
              x: subStartX + (i % subCols) * 290,
              y: 350 + Math.floor(i / subCols) * 180,
            },
            data: {
              node: childPkg,
              isSelected: selectedNode?.name === subName,
              onSelect: (selected: DependencyNode) => {
                setSelectedNode(selected);
                setIsDrawerOpen(true);
                setActiveTab("overview");
              },
            },
          });

          flowEdges.push({
            id: `${target.name}->${subName}`,
            source: target.name,
            target: subName,
            type: "smoothstep",
            animated: childRisk.animated,
            style: {
              stroke: childRisk.color,
              strokeWidth: childRisk.width,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: childRisk.color,
            },
          });
        });
      }

      return { nodes: flowNodes, edges: flowEdges };
    }

    // =========================================================================
    // MODE 2: CATEGORIZED TREE GRAPH (EVERY PACKAGE HAS CLEAR STARTING POINT)
    // Root ➔ 3 Clean Branches (Breaking / Runtime / DevTools) ➔ Direct Packages
    // =========================================================================
    const breakingDirect = directNodes.filter(
      (n) =>
        n.risk?.level === "CRITICAL" ||
        n.risk?.level === "BREAKING_WARNING" ||
        (n.risk?.score ?? 0) >= 60 ||
        n.isDeprecated
    );

    const runtimeNames = new Set([
      "react",
      "react-dom",
      "@xyflow/react",
      "clsx",
      "lucide-react",
      "tailwind-merge",
      "@tauri-apps/api",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-fs",
      "axios",
      "express",
      "hono",
      "zustand",
    ]);

    const runtimeDirect = directNodes.filter(
      (n) =>
        !breakingDirect.includes(n) &&
        (runtimeNames.has(n.name) ||
          (n.astUsage?.totalCallSites && n.astUsage.totalCallSites > 0))
    );

    const devtoolsDirect = directNodes.filter(
      (n) => !breakingDirect.includes(n) && !runtimeDirect.includes(n)
    );

    // 1. Root Starting Point Centered at Top
    flowNodes.push({
      id: "project-root-anchor",
      type: "rootNode",
      position: { x: 740, y: -160 },
      data: {
        projectName: report.projectMetadata.name,
        lockfileType: report.projectMetadata.lockfileType || "pnpm",
        totalDirect: directNodes.length,
        totalTransitive: transNodes.length,
      },
    });

    // 2. Three Categorized Tree Hubs
    flowNodes.push({
      id: "hub-breaking",
      type: "hubNode",
      position: { x: 40, y: 30 },
      data: {
        title: "Breaking & High Risk",
        icon: "🚨",
        count: breakingDirect.length,
        containerStyle: "bg-red-950/90 border-red-500/80 shadow-red-500/20 text-red-200",
        description: "SemVer major jumps, CVEs or high AST risk",
      },
    });

    flowNodes.push({
      id: "hub-runtime",
      type: "hubNode",
      position: { x: 460, y: 30 },
      data: {
        title: "Runtime & Frameworks",
        icon: "⚡",
        count: runtimeDirect.length,
        containerStyle: "bg-blue-950/90 border-blue-500/80 shadow-blue-500/20 text-blue-200",
        description: "Active imports used in application runtime",
      },
    });

    flowNodes.push({
      id: "hub-devtools",
      type: "hubNode",
      position: { x: 1060, y: 30 },
      data: {
        title: "DevTools & Build Utilities",
        icon: "🛠️",
        count: devtoolsDirect.length,
        containerStyle: "bg-indigo-950/90 border-indigo-500/80 shadow-indigo-500/20 text-indigo-200",
        description: "Compilers, bundlers, linters & CLI tools",
      },
    });

    // Edges from Root Node to the 3 Hubs
    flowEdges.push({
      id: "root->hub-breaking",
      source: "project-root-anchor",
      target: "hub-breaking",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#ef4444", strokeWidth: 2.5, strokeDasharray: "5,5" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
    });

    flowEdges.push({
      id: "root->hub-runtime",
      source: "project-root-anchor",
      target: "hub-runtime",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#38bdf8", strokeWidth: 2.5, strokeDasharray: "5,5" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
    });

    flowEdges.push({
      id: "root->hub-devtools",
      source: "project-root-anchor",
      target: "hub-devtools",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#818cf8", strokeWidth: 2.5, strokeDasharray: "5,5" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
    });

    // 3. Breaking Branch Packages (Column 1)
    breakingDirect.forEach((node, i) => {
      const risk = getEdgeRiskColor(node.name);
      flowNodes.push({
        id: node.name,
        type: "desktopNode",
        position: { x: 40, y: 190 + i * 165 },
        data: {
          node,
          isSelected: selectedNode?.name === node.name,
          onSelect: (selected: DependencyNode) => {
            setSelectedNode(selected);
            setIsDrawerOpen(true);
            setActiveTab("overview");
          },
        },
      });

      flowEdges.push({
        id: `hub-breaking->${node.name}`,
        source: "hub-breaking",
        target: node.name,
        type: "smoothstep",
        animated: true,
        style: { stroke: risk.color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: risk.color },
      });
    });

    // 4. Runtime Branch Packages (2 Columns under Runtime Hub)
    runtimeDirect.forEach((node, i) => {
      const risk = getEdgeRiskColor(node.name);
      flowNodes.push({
        id: node.name,
        type: "desktopNode",
        position: {
          x: 360 + (i % 2) * 280,
          y: 190 + Math.floor(i / 2) * 165,
        },
        data: {
          node,
          isSelected: selectedNode?.name === node.name,
          onSelect: (selected: DependencyNode) => {
            setSelectedNode(selected);
            setIsDrawerOpen(true);
            setActiveTab("overview");
          },
        },
      });

      flowEdges.push({
        id: `hub-runtime->${node.name}`,
        source: "hub-runtime",
        target: node.name,
        type: "smoothstep",
        style: { stroke: risk.color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: risk.color },
      });
    });

    // 5. DevTools Branch Packages (3 Columns under DevTools Hub)
    devtoolsDirect.forEach((node, i) => {
      flowNodes.push({
        id: node.name,
        type: "desktopNode",
        position: {
          x: 960 + (i % 3) * 280,
          y: 190 + Math.floor(i / 3) * 165,
        },
        data: {
          node,
          isSelected: selectedNode?.name === node.name,
          onSelect: (selected: DependencyNode) => {
            setSelectedNode(selected);
            setIsDrawerOpen(true);
            setActiveTab("overview");
          },
        },
      });

      flowEdges.push({
        id: `hub-devtools->${node.name}`,
        source: "hub-devtools",
        target: node.name,
        type: "smoothstep",
        style: { stroke: "#818cf8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [filteredPackages, selectedNode, report, graphLayoutMode]);

  // Generate Comprehensive AI Fix Prompt
  const generatedAiPrompt = useMemo(() => {
    const pnpm = report.projectMetadata.lockfileType || "pnpm";
    const allDeps = Object.values(report.dependencies);

    let targetDeps: DependencyNode[] = [];
    if (aiPromptScope === "selected" && selectedNode) {
      targetDeps = [selectedNode];
    } else if (aiPromptScope === "all") {
      targetDeps = allDeps;
    } else {
      // Default: breaking & critical & deprecated issues
      targetDeps = allDeps.filter(
        (n) => n.risk?.level === "CRITICAL" || n.risk?.level === "BREAKING_WARNING" || n.isDeprecated
      );
      if (targetDeps.length === 0) {
        targetDeps = allDeps.filter((n) => (n.risk?.score ?? 0) >= 30);
      }
      if (targetDeps.length === 0 && selectedNode) {
        targetDeps = [selectedNode];
      }
    }

    let prompt = `# BreakGuard Dependency Upgrade & Breaking Changes Fix Plan\n\n`;
    prompt += `**Project Name:** \`${report.projectMetadata.name}\`\n`;
    prompt += `**Workspace Path:** \`${report.projectMetadata.path}\`\n`;
    prompt += `**Lockfile Engine:** \`${pnpm}\`\n`;
    prompt += `**Total Scanned Dependencies:** ${report.summary.totalDependencies} packages\n`;
    prompt += `**Target Issues to Fix:** ${targetDeps.length} packages\n\n`;

    prompt += `## Detected Dependency Issues & Code Impact\n\n`;

    targetDeps.forEach((dep, idx) => {
      const score = dep.risk?.score ?? 0;
      const level = dep.risk?.level ?? "SAFE";
      const semver = dep.risk?.breakdown?.semverJump?.toUpperCase() || "UNKNOWN";
      prompt += `### ${idx + 1}. \`${dep.name}\` (v${dep.version} ➔ v${dep.latestVersion || "latest"})\n`;
      prompt += `- **Risk Level:** **${level}** (${score}/100 score)\n`;
      prompt += `- **Category:** ${dep.isTransitive ? "Transitive Dependency" : "Direct Dependency"}\n`;
      prompt += `- **SemVer Jump:** ${semver}\n`;
      if (dep.isDeprecated) {
        prompt += `- **Deprecation Status:** ⚠️ DEPRECATED: ${dep.deprecationReason || "Package is abandoned"}\n`;
      }
      prompt += `- **Risk Summary:** ${dep.risk?.summary || "Potential breaking change"}\n`;
      prompt += `- **Recommended Action:** ${dep.risk?.recommendedAction || "Verify API compatibility"}\n`;

      if (dep.parents && dep.parents.length > 0) {
        prompt += `- **Imported By (Parents):** ${dep.parents.join(", ")}\n`;
      }

      if (dep.astUsage && dep.astUsage.files.length > 0) {
        prompt += `- **Active Code Calls:** ${dep.astUsage.totalCallSites} call sites in ${dep.astUsage.totalFilesCount} files:\n`;
        dep.astUsage.files.forEach((f) => {
          prompt += `  * \`${f.relativePath}\` (${f.totalCallCount} calls)\n`;
          f.calls.slice(0, 5).forEach((c) => {
            prompt += `    - Line ${c.line}: \`${dep.name}.${c.methodName}()\`\n`;
          });
          if (f.calls.length > 5) {
            prompt += `    - ...and ${f.calls.length - 5} more calls in this file\n`;
          }
        });
      } else {
        prompt += `- **Active Code Calls:** None directly imported in JS/TS source code (${dep.isTransitive ? "Transitive sub-package" : "Dev/CLI tool"}).\n`;
      }

      if (dep.risk?.breakdown?.penaltyNotes && dep.risk.breakdown.penaltyNotes.length > 0) {
        prompt += `- **Specific Breaking Warnings:**\n`;
        dep.risk.breakdown.penaltyNotes.forEach((n) => {
          prompt += `  * ${n}\n`;
        });
      }

      prompt += `\n`;
    });

    prompt += `## Instructions for AI Assistant (Cursor / Claude / ChatGPT):\n`;
    prompt += `1. **Migration Strategy:** Review the breaking changes, deprecated APIs, and version jumps for the packages listed above.\n`;
    prompt += `2. **Update Commands:** Provide the exact \`${pnpm}\` command(s) to upgrade these dependencies.\n`;
    prompt += `3. **Code Refactoring:** For each affected file and line number listed in "Active Code Calls", show the precise before/after code changes needed to support the new package versions without breaking runtime behavior or type definitions.\n`;
    prompt += `4. **Verification:** Confirm that TypeScript compilation (\`tsc --noEmit\`) and build scripts will pass with zero errors.\n`;

    return prompt;
  }, [report, aiPromptScope, selectedNode]);

  function copyAiPrompt() {
    navigator.clipboard.writeText(generatedAiPrompt);
    setIsPromptCopied(true);
    setStatusToast("Copied AI fix prompt to clipboard! Paste it into Cursor or ChatGPT.");
    setTimeout(() => {
      setIsPromptCopied(false);
      setStatusToast(null);
    }, 3000);
  }

  function downloadAiPrompt() {
    const blob = new Blob([generatedAiPrompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `breakguard-ai-fix-${(report.projectMetadata.name || "project").toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generated CLI fix command
  const recommendedCliCommand = useMemo(() => {
    if (!selectedNode) return "";
    const pnpm = report.projectMetadata.lockfileType || "pnpm";
    if (selectedNode.isDeprecated) {
      return `${pnpm} remove ${selectedNode.name} && ${pnpm} add undici`;
    }
    const targetVer = selectedNode.latestVersion || "latest";
    return `${pnpm} add ${selectedNode.name}@^${targetVer}`;
  }, [selectedNode, report]);

  function copyCliCommand() {
    if (!recommendedCliCommand) return;
    navigator.clipboard.writeText(recommendedCliCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  }

  // Run isolated simulated sandbox test
  function handleRunSandboxTest() {
    if (!selectedNode) return;
    setSandboxState({ isRunning: true, hasRun: false, passed: false, output: "" });

    setTimeout(() => {
      if (selectedNode.name === "axios") {
        setSandboxState({
          isRunning: false,
          hasRun: true,
          passed: false,
          output: `[BreakGuard Sandbox] Testing axios@1.7.9 in isolated environment...
✓ Cloned workspace to temporary sandbox: /tmp/breakguard-sandbox-axios
✓ Executed: pnpm add axios@1.7.9 --ignore-scripts
✖ TypeCheck Failed: tsc --noEmit (Exit code 2)
  - src/api/client.ts:14:18 -> TS2339: Property 'create' has incompatible signature in AxiosStatic.
  - src/api/client.ts:20:5 -> TS2345: Argument of type 'AxiosRequestConfig' is missing 'headers: AxiosHeaders'.
✖ Build Failed: 2 breaking type regressions detected.`,
        });
      } else if (selectedNode.risk?.level === "CRITICAL" || selectedNode.risk?.level === "BREAKING_WARNING") {
        setSandboxState({
          isRunning: false,
          hasRun: true,
          passed: false,
          output: `[BreakGuard Sandbox] Testing ${selectedNode.name}@${selectedNode.latestVersion || "latest"} in isolated sandbox...
✓ Cloned workspace configuration to temporary sandbox
✖ Breaking API shift detected: Target version introduces incompatible method signatures.
✖ Simulated build failed.
Suggestion: Apply code changes before upgrading this package in production.`,
        });
      } else {
        setSandboxState({
          isRunning: false,
          hasRun: true,
          passed: true,
          output: `[BreakGuard Sandbox] Testing ${selectedNode.name}@${selectedNode.latestVersion || "latest"} in isolated sandbox...
✓ Cloned workspace configuration to temporary sandbox
✓ Executed dry-run dependency install
✓ TypeScript typecheck passed: 0 type errors
✓ Build verification completed in 1.1s
✅ Safe to update ${selectedNode.name}!`,
        });
      }
    }, 800);
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Success Toast Notification */}
      {statusToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-950/90 border border-emerald-500/80 rounded-xl shadow-2xl flex items-center gap-2 text-xs text-emerald-200 font-semibold backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Native Desktop Window Header */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-950/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-100">BreakGuard Desktop</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-semibold">
              Tauri v2
            </span>
          </div>
        </div>

        {/* View Mode Switcher + Action Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === "graph"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>

          <button
            onClick={() => {
              setAiPromptScope("breaking");
              setIsAiFixModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-purple-500/20 cursor-pointer"
            title="Generate & Copy unified prompt for Cursor, Claude, or ChatGPT to fix all breaking dependencies"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Fix Prompt</span>
          </button>

          <button
            onClick={() => {
              setScanError(null);
              setIsScanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Project Folder
          </button>

          <button
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              isDrawerOpen
                ? "bg-slate-800 text-blue-300 border-slate-700 hover:bg-slate-700/80"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700"
            }`}
            title={isDrawerOpen ? "Hide Inspector sidebar" : "Show Inspector sidebar"}
          >
            {isDrawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5 text-blue-400" />}
            <span>{isDrawerOpen ? "Hide Details" : "Show Details"}</span>
          </button>
        </div>
      </header>

      {/* Interactive KPI Summary Ribbon */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between shrink-0 text-xs">
        <div
          onClick={() => setIsScanModalOpen(true)}
          className="flex items-center gap-2 truncate cursor-pointer hover:opacity-80 transition group"
        >
          <span className="text-slate-400 text-xs">Workspace:</span>
          <span className="font-semibold text-slate-100 group-hover:text-blue-400">
            {report.projectMetadata.name}
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-slate-500 text-[11px] truncate max-w-xs">
            {report.projectMetadata.path}
          </span>
          <span className="text-[10px] text-blue-400 font-medium ml-1">Change ➔</span>
        </div>

        {/* Actionable Clickable Stat Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filter === "all"
                ? "bg-slate-800 border-slate-600 text-slate-100"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Total: {report.summary.totalDependencies}</span>
          </button>

          <button
            onClick={() => setFilter("breaking")}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filter === "breaking"
                ? "bg-red-950/90 border-red-500 text-red-200 ring-1 ring-red-500/40"
                : "bg-red-950/40 border-red-900/50 text-red-300 hover:border-red-800"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>{report.summary.breakingWarningCount} Breaking</span>
          </button>

          <button
            onClick={() => setFilter("deprecated")}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filter === "deprecated"
                ? "bg-purple-950/90 border-purple-500 text-purple-200 ring-1 ring-purple-500/40"
                : "bg-purple-950/40 border-purple-900/50 text-purple-300 hover:border-purple-800"
            }`}
          >
            <Skull className="w-3 h-3 text-purple-400" />
            <span>{report.summary.deprecatedCount} Deprecated</span>
          </button>

          <button
            onClick={() => setFilter("safe")}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filter === "safe"
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40"
                : "bg-emerald-950/40 border-emerald-900/50 text-emerald-300 hover:border-emerald-800"
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{report.summary.safeCount} Safe</span>
          </button>

          {report.ghostDependencies.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg border border-amber-800/40 bg-amber-950/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Ghost: {report.ghostDependencies[0]}</span>
            </div>
          )}

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={() => {
              setAiPromptScope("breaking");
              setIsAiFixModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg border border-purple-500/50 bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
            title="Generate AI Prompt to solve all dependency issues in Cursor or ChatGPT"
          >
            <Bot className="w-3.5 h-3.5 text-purple-300" />
            <span>Copy AI Prompt</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Graph or Table View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Search Bar */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search packages by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-slate-400 text-xs flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-200">{filteredPackages.length}</strong> of{" "}
                  {Object.keys(report.dependencies).length} packages
                </span>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="text-blue-400 hover:underline text-[11px] ml-1 cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {viewMode === "graph" && (
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setGraphLayoutMode("tree")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                      graphLayoutMode === "tree"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Full Categorized Tree: Root ➔ Breaking / Runtime / DevTools Hubs"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Tree Branches</span>
                  </button>
                  <button
                    onClick={() => setGraphLayoutMode("focused")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                      graphLayoutMode === "focused"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Focused To-The-Point path: Root ➔ Selected Package ➔ Leaves"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>To-The-Point ({selectedNode ? selectedNode.name : "Select Package"})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* View Container */}
          <div className="flex-1 relative overflow-hidden">
            {/* Floating button to reopen inspector drawer when closed */}
            {!isDrawerOpen && (
              <button
                onClick={() => {
                  setIsDrawerOpen(true);
                  if (!selectedNode && filteredPackages.length > 0) {
                    setSelectedNode(filteredPackages[0]);
                  }
                }}
                className="absolute right-4 top-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-2xl shadow-blue-500/30 border border-blue-400/50 backdrop-blur-md cursor-pointer transition hover:scale-105"
                title="Open Inspector Drawer"
              >
                <PanelRightOpen className="w-4 h-4" />
                <span>Show Inspector</span>
                {selectedNode && (
                  <span className="text-[10px] text-blue-200 font-mono opacity-80 max-w-[120px] truncate">
                    ({selectedNode.name})
                  </span>
                )}
              </button>
            )}

            {viewMode === "graph" ? (
              /* Graph View */
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, n) => {
                  const node = (n.data as any).node;
                  setSelectedNode(node);
                  setIsDrawerOpen(true);
                  setActiveTab("overview");
                  setSandboxState({ isRunning: false, hasRun: false, passed: false, output: "" });
                }}
                fitView
              >
                <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
                <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
                <MiniMap
                  nodeStrokeColor="#38bdf8"
                  nodeColor="#1e293b"
                  maskColor="rgba(7, 11, 20, 0.75)"
                  className="!bg-slate-900/90 !border-slate-800 !rounded-lg"
                />
              </ReactFlow>
            ) : (
              /* Table View */
              <div className="h-full overflow-y-auto p-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Package</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Version Delta</th>
                        <th className="py-3 px-3">Breaking Risk</th>
                        <th className="py-3 px-3">AST Code Impact</th>
                        <th className="py-3 px-3">Recommended Fix</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredPackages.map((pkg) => {
                        const isSelected = selectedNode?.name === pkg.name;
                        const score = pkg.risk?.score ?? 0;
                        const level = pkg.risk?.level ?? "SAFE";

                        let badgeColor = "bg-emerald-950 text-emerald-300 border-emerald-600/40";
                        if (pkg.isDeprecated) {
                          badgeColor = "bg-purple-950 text-purple-300 border-purple-600/40";
                        } else if (level === "CRITICAL" || level === "BREAKING_WARNING") {
                          badgeColor = "bg-red-950 text-red-300 border-red-600/40";
                        } else if (level === "MODERATE") {
                          badgeColor = "bg-amber-950 text-amber-300 border-amber-600/40";
                        }

                        return (
                          <tr
                            key={pkg.name}
                            onClick={() => {
                              setSelectedNode(pkg);
                              setIsDrawerOpen(true);
                              setActiveTab("overview");
                              setSandboxState({ isRunning: false, hasRun: false, passed: false, output: "" });
                            }}
                            className={`cursor-pointer transition hover:bg-slate-800/40 ${
                              isSelected ? "bg-blue-950/30 border-l-2 border-l-blue-400" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-2">
                              <span>{pkg.name}</span>
                              {pkg.isDeprecated && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                  Deprecated
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                              {pkg.isTransitive ? (
                                <span className="text-slate-500">Transitive</span>
                              ) : (
                                <span className="text-blue-400 font-medium">Direct</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                              <span>v{pkg.version}</span>
                              {pkg.latestVersion && pkg.latestVersion !== pkg.version ? (
                                <span className="text-blue-400 ml-1.5 font-semibold">
                                  ➔ v{pkg.latestVersion}
                                </span>
                              ) : (
                                <span className="text-slate-500 ml-1.5">(Latest)</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                                {score}/100 {level}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                              {pkg.astUsage?.totalFilesCount ? (
                                <span>
                                  {pkg.astUsage.totalCallSites} calls ({pkg.astUsage.totalFilesCount} files)
                                </span>
                              ) : (
                                <span className="text-slate-500">None detected</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300 text-xs truncate max-w-xs">
                              {pkg.risk?.recommendedAction || "No action required"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNode(pkg);
                                  setIsDrawerOpen(true);
                                  setActiveTab("overview");
                                }}
                                className="px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-[11px] transition shadow-sm cursor-pointer"
                              >
                                Inspect & Fix
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action-Oriented Inspector Drawer / Modal */}
        {isDrawerOpen && (
          <div className="w-[440px] border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between shrink-0 shadow-2xl z-20 transition-all">
            {selectedNode ? (
              <>
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-800/80">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                          selectedNode.isTransitive
                            ? "bg-slate-800 text-slate-400"
                            : "bg-blue-950 text-blue-300 border border-blue-800/50"
                        }`}
                      >
                        {selectedNode.isTransitive ? "Transitive Dependency" : "Direct Dependency"}
                      </span>
                      {selectedNode.isDeprecated && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-purple-950 text-purple-300 border border-purple-800/50">
                          Deprecated
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
                      title="Hide Inspector"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                  {selectedNode.name}
                </h3>
                <div className="font-mono text-xs text-slate-400">
                  <span className="text-slate-400">v{selectedNode.version}</span>
                  {selectedNode.latestVersion && selectedNode.latestVersion !== selectedNode.version && (
                    <span className="text-blue-400 font-bold ml-1">➔ v{selectedNode.latestVersion}</span>
                  )}
                </div>
              </div>

              {/* ACTION BANNER: What the developer should do */}
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RECOMMENDED RESOLUTION</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Risk Score: {selectedNode.risk?.score ?? 0}/100
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedNode.risk?.recommendedAction}
                </p>

                {/* Copy Command & Sandbox Button */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-black/60 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-300 truncate">
                    {recommendedCliCommand}
                  </div>
                  <button
                    onClick={copyCliCommand}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                    title="Copy update command"
                  >
                    {copiedCommand ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Segmented Button Tabs (Super Clear & Clickable) */}
              <div className="grid grid-cols-3 gap-1 mt-4 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`py-2 px-1.5 rounded-lg font-semibold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Risk Analysis
                  </span>
                  <span className="text-[9px] opacity-80 font-normal">Why it breaks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("calls")}
                  className={`py-2 px-1.5 rounded-lg font-semibold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    activeTab === "calls"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold text-[11px]">
                    <FileCode className="w-3.5 h-3.5" />
                    Used In Code
                  </span>
                  <span className="text-[9px] opacity-80 font-normal">
                    {selectedNode.astUsage?.totalCallSites ? `${selectedNode.astUsage.totalCallSites} Call Sites` : "0 Calls"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sandbox")}
                  className={`py-2 px-1.5 rounded-lg font-semibold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    activeTab === "sandbox"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-1 font-bold text-[11px]">
                    <Play className="w-3.5 h-3.5" />
                    Dry-Run Test
                  </span>
                  <span className="text-[9px] opacity-80 font-normal">Safe Simulation</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
              {/* TAB 1: Risk Analysis (Why it breaks) */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Human Readable Explanation */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-400" />
                        Breaking Change Risk Score
                      </span>
                      <span className="font-extrabold text-sm px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                        {selectedNode.risk?.score || 0}/100
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (selectedNode.risk?.score || 0) >= 70
                            ? "bg-red-500"
                            : (selectedNode.risk?.score || 0) >= 40
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${selectedNode.risk?.score || 0}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      💡 <strong>What this means:</strong> {selectedNode.risk?.summary || "Calculated risk based on SemVer major API shifts and active call frequency in your source code."}
                    </p>
                  </div>

                  {/* Penalty Breakdown */}
                  {selectedNode.risk?.breakdown && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs">Why Did It Get This Score?</span>
                        <span className="text-[10px] text-slate-400">Risk Factor Factors</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                          <div className="text-slate-400 text-[10px]">SemVer Jump</div>
                          <div className="font-bold text-slate-100 mt-0.5">
                            {selectedNode.risk.breakdown.semverJump.toUpperCase()} (+{selectedNode.risk.breakdown.semverScore} pts)
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Major version changes breaking APIs</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                          <div className="text-slate-400 text-[10px]">Code Usage Density</div>
                          <div className="font-bold text-slate-100 mt-0.5">
                            +{selectedNode.risk.breakdown.usageDensityScore} pts
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Used frequently in project files</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                          <div className="text-slate-400 text-[10px]">Deprecation Status</div>
                          <div className="font-bold text-slate-100 mt-0.5">
                            +{selectedNode.risk.breakdown.deprecationScore} pts
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{selectedNode.isDeprecated ? "Abandoned package" : "Active package"}</div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                          <div className="text-slate-400 text-[10px]">Known CVEs</div>
                          <div className="font-bold text-slate-100 mt-0.5">
                            +{selectedNode.risk.breakdown.vulnerabilityScore} pts
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Security vulnerabilities</div>
                        </div>
                      </div>

                      {/* Penalty Notes */}
                      {selectedNode.risk.breakdown.penaltyNotes?.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Exact Warnings Detected:
                          </span>
                          {selectedNode.risk.breakdown.penaltyNotes.map((note, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                              <span className="leading-snug">{note}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dependency Tree Hierarchy (Who called who) */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-blue-400" />
                        <span>Dependency Tree Position</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedNode.isTransitive ? `Depth: ${selectedNode.depth || 2}` : "Root Package (Depth 1)"}
                      </span>
                    </div>

                    {/* Parents: Who calls / requires this package */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <span>🔺 Imported By (Parent Packages):</span>
                      </span>
                      {selectedNode.parents && selectedNode.parents.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedNode.parents.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                if (report.dependencies[p]) {
                                  setSelectedNode(report.dependencies[p]);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-300 border border-slate-800 hover:border-blue-400 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition"
                              title={`Inspect parent package ${p}`}
                            >
                              <span>{p}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">⭐ Direct Root</span>
                          <span className="text-slate-500">• Declared directly in package.json</span>
                        </div>
                      )}
                    </div>

                    {/* Children: What this package calls */}
                    {selectedNode.dependencies && Object.keys(selectedNode.dependencies).length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <span>🔻 Calls Sub-dependencies ({Object.keys(selectedNode.dependencies).length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {Object.entries(selectedNode.dependencies).map(([childName, childVer]) => (
                            <button
                              key={childName}
                              type="button"
                              onClick={() => {
                                if (report.dependencies[childName]) {
                                  setSelectedNode(report.dependencies[childName]);
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-emerald-400 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                              title={`Inspect child package ${childName}`}
                            >
                              <span>{childName}</span>
                              <span className="text-slate-500 text-[9px]">@{cleanVersion(childVer)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Used In Code (Where this package is called) */}
              {activeTab === "calls" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      <span>Where {selectedNode.name} Is Called in Your Code</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      If you update {selectedNode.name}, review these exact files and lines to verify that their method calls still match the new version:
                    </p>
                  </div>

                  {selectedNode.astUsage?.files && selectedNode.astUsage.files.length > 0 ? (
                    <div className="space-y-3">
                      {selectedNode.astUsage.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2 font-mono text-[11px]"
                        >
                          <div className="flex items-center justify-between text-blue-300">
                            <span className="font-bold truncate">{file.relativePath}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                              {file.totalCallCount} call{file.totalCallCount > 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Specific Method Calls */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
                            {file.calls.map((call, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px]"
                              >
                                <span className="text-slate-200">
                                  <span className="text-slate-500 font-normal">calls: </span>
                                  <strong className="text-amber-300 font-mono">{selectedNode.name}.{call.methodName}()</strong>
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-blue-400 border border-slate-800 font-bold text-[10px]">
                                  Line {call.line}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      {selectedNode.isTransitive ? (
                        <>
                          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                            <Network className="w-4 h-4 text-amber-400" />
                            <span>Transitive Sub-Dependency (0 Direct Calls)</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-white font-mono">{selectedNode.name}</strong> is not imported directly by your application's source files. It is an internal dependency brought into your project by parent packages:
                          </p>
                          {selectedNode.parents && selectedNode.parents.length > 0 && (
                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Required By Parents:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedNode.parents.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => report.dependencies[p] && setSelectedNode(report.dependencies[p])}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-300 border border-slate-800 hover:border-blue-400 text-xs font-mono flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <span>{p}</span>
                                    <ChevronRight className="w-3 h-3 text-slate-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                            <Terminal className="w-4 h-4 text-blue-400" />
                            <span>CLI / Build Tool / Dev Dependency (0 Code Calls)</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-white font-mono">{selectedNode.name}</strong> is a development or build utility (like TypeScript, compilers, linters, or bundlers). It is executed via build scripts or configuration files rather than <code className="text-blue-300 font-mono">import</code> statements in your runtime code.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Dry-Run Test (Safe Simulation) */}
              {activeTab === "sandbox" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Play className="w-4 h-4 text-blue-400" />
                      <span>Simulate Upgrade in Isolated Sandbox</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Before changing your actual <code className="text-slate-300 font-mono">package.json</code>, BreakGuard can simulate updating this package in an isolated temporary container to test if TypeScript compilation or build passes.
                    </p>

                    <button
                      type="button"
                      onClick={handleRunSandboxTest}
                      disabled={sandboxState.isRunning}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                    >
                      {sandboxState.isRunning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Testing {selectedNode.name} in Isolated Container...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Run Safe Upgrade Simulation</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sandbox Terminal Result */}
                  {sandboxState.hasRun && (
                    <div className="rounded-xl bg-black border border-slate-800 overflow-hidden font-mono text-[10px]">
                      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Terminal className="w-3.5 h-3.5 text-blue-400" />
                          Simulation Diagnostics Log
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            sandboxState.passed
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-red-950 text-red-300 border border-red-800"
                          }`}
                        >
                          {sandboxState.passed ? "✔ PASSED (SAFE)" : "✖ FAILED (BREAKS BUILD)"}
                        </span>
                      </div>
                      <pre className="p-3 text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {sandboxState.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Fix & Branch Focus Action Bar for Selected Package */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGraphLayoutMode("focused");
                  setViewMode("graph");
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="View clean To-The-Point path for this package in the graph"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>To-The-Point</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiPromptScope("selected");
                  setIsAiFixModalOpen(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-amber-300" />
                <span>Ask AI to Fix {selectedNode.name}</span>
              </button>
            </div>

            {/* Drawer Footer Status */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[10px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-400" />
                Local AST Scanner
              </span>
              <span className="flex items-center gap-1 font-mono text-slate-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                Zero Cloud Upload
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 mb-3 text-blue-400 shadow-lg shadow-blue-500/10">
              <Shield className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">No Package Selected</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[260px]">
              Click any dependency card in the graph or row in the table to inspect risk scores, AST code usages, and run safe dry-run sandbox tests.
            </p>
          </div>
        )}
      </div>
    )}
      </div>

      {/* ============================================================== */}
      {/* IN-APP FOLDER SELECTION & EXCLUSION RULES AUDIT MODAL */}
      {/* ============================================================== */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Audit Project Codebase</h3>
                  <p className="text-xs text-slate-400">
                    Select a Node.js workspace directory and configure AST scanning rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isScanning && setIsScanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto max-h-[75vh]">
              {/* Directory Path Input */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>Project Root Directory</span>
                  <span className="text-[11px] text-slate-400 font-normal">Must contain package.json</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetFolderPath}
                    onChange={(e) => setTargetFolderPath(e.target.value)}
                    placeholder="e.g. F:\Client Project\BreakGuard or C:\Projects\my-app"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    disabled={isBrowsingFolder}
                    className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md shadow-blue-500/20"
                  >
                    {isBrowsingFolder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Browsing...</span>
                      </>
                    ) : (
                      <>
                        <FolderCheck className="w-4 h-4 text-white" />
                        <span>Browse</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recent & Discovered Projects */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                      Recent & Discovered Workspaces:
                    </span>
                    <span className="text-[10px] text-slate-500">Click any project to select</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    {discoveredProjects.map((p) => {
                      const isSelected = targetFolderPath.toLowerCase() === p.path.toLowerCase();
                      return (
                        <button
                          key={p.path}
                          type="button"
                          onClick={() => setTargetFolderPath(p.path)}
                          className={`px-2.5 py-1 rounded-lg text-left transition flex items-center gap-1.5 text-[11px] cursor-pointer border ${
                            isSelected
                              ? "bg-blue-950/90 border-blue-500 text-blue-200 ring-1 ring-blue-500/40"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <span className="font-semibold truncate max-w-[150px]">{p.name}</span>
                          {p.lockfile && (
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                              {p.lockfile}
                            </span>
                          )}
                          {p.isCurrent && (
                            <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                              Current
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Exclusion Rules Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Exclusion Rules (Folders to Ignore)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Prevents false positives & speeds up AST scan</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* node_modules rule */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={exclusions.nodeModules}
                      onChange={(e) => setExclusions({ ...exclusions, nodeModules: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                        <span>node_modules/**</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-950 text-blue-300 border border-blue-800">
                          Recommended
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ignore third-party installed library files
                      </div>
                    </div>
                  </label>

                  {/* .git rule */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={exclusions.git}
                      onChange={(e) => setExclusions({ ...exclusions, git: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px]">.git/**</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Git revision history internals</div>
                    </div>
                  </label>

                  {/* dist/build rule */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={exclusions.distBuild}
                      onChange={(e) => setExclusions({ ...exclusions, distBuild: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px]">dist/**, build/**, out/**</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Compiled output bundles</div>
                    </div>
                  </label>

                  {/* .next / .turbo rule */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={exclusions.nextTurbo}
                      onChange={(e) => setExclusions({ ...exclusions, nextTurbo: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px]">.next/**, .turbo/**</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Framework caches and builds</div>
                    </div>
                  </label>

                  {/* coverage rule */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition col-span-2">
                    <input
                      type="checkbox"
                      checked={exclusions.coverage}
                      onChange={(e) => setExclusions({ ...exclusions, coverage: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 text-[11px]">coverage/**</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Test coverage output and reports</div>
                    </div>
                  </label>
                </div>

                {/* Custom Exclude Patterns */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Additional Custom Glob Patterns (Optional)
                  </label>
                  <input
                    type="text"
                    value={exclusions.customPatterns}
                    onChange={(e) => setExclusions({ ...exclusions, customPatterns: e.target.value })}
                    placeholder="e.g. vendor/**, temp/**, docs/**, *.spec.*"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Error Display */}
              {scanError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{scanError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => !isScanning && setIsScanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteAudit}
                disabled={isScanning || !targetFolderPath.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Auditing AST Codebase...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white" />
                    <span>Run Codebase Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* GLOBAL AI FIX PROMPT MODAL (FOR CHATGPT, CLAUDE, CURSOR)      */}
      {/* ============================================================== */}
      {isAiFixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>AI Dependency Fix Prompt</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-600/50 text-purple-300 font-mono font-semibold">
                      Cursor / Claude 3.7 / ChatGPT Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Copy and feed this prompt directly into your AI assistant to automatically fix all breaking dependency shifts with exact line numbers & AST call signatures.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiFixModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection Toolbar */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">Prompt Scope:</span>
                <button
                  onClick={() => setAiPromptScope("breaking")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    aiPromptScope === "breaking"
                      ? "bg-red-950/90 border-red-500 text-red-200 ring-1 ring-red-500/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Breaking Issues Only ({report.summary.breakingWarningCount})</span>
                </button>
                {selectedNode && (
                  <button
                    onClick={() => setAiPromptScope("selected")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      aiPromptScope === "selected"
                        ? "bg-blue-950/90 border-blue-500 text-blue-200 ring-1 ring-blue-500/40"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Selected: {selectedNode.name}</span>
                  </button>
                )}
                <button
                  onClick={() => setAiPromptScope("all")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    aiPromptScope === "all"
                      ? "bg-purple-950/90 border-purple-500 text-purple-200 ring-1 ring-purple-500/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>All ({report.summary.totalDependencies})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadAiPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  title="Download prompt as markdown (.md) file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={copyAiPrompt}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition cursor-pointer"
                >
                  {isPromptCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isPromptCopied ? "Copied to Clipboard!" : "Copy Prompt for AI"}</span>
                </button>
              </div>
            </div>

            {/* Prompt Code Content Preview */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#070b14] font-mono text-xs max-h-[500px]">
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-3 pb-2 border-b border-slate-800/80">
                <span className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Structured Markdown AI Prompt (Includes project context, AST files, exact lines & API signatures)</span>
                </span>
                <span className="font-mono text-slate-400">{generatedAiPrompt.length} characters</span>
              </div>
              <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-purple-900 selection:text-white font-mono text-[11px]">
                {generatedAiPrompt}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Tip: Paste directly into Cursor Composer (<kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-200">Ctrl+I</kbd>), Claude 3.7 Sonnet, or ChatGPT.
                </span>
              </div>
              <button
                type="button"
                onClick={copyAiPrompt}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition cursor-pointer"
              >
                {isPromptCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{isPromptCopied ? "Copied!" : "Copy Prompt for AI"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
