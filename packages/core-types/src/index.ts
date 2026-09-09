import { z } from "zod";

/**
 * Supported Lockfile formats
 */
export type LockfileType = "npm" | "yarn" | "pnpm";

/**
 * Dependency types in package.json
 */
export type DependencyCategory = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies" | "transitive";

/**
 * Direct & Transitive Dependency representation
 */
export interface DependencyNode {
  id: string; // unique key, e.g. "lodash@4.17.21"
  name: string; // package name e.g. "lodash"
  version: string; // currently resolved version
  requestedRange?: string; // semver range requested in package.json (e.g. "^4.17.20")
  category: DependencyCategory;
  isTransitive: boolean;
  depth: number; // 1 = direct, 2+ = transitive
  parents: string[]; // package names that depend on this
  dependencies: Record<string, string>; // direct sub-dependencies mapping name -> version spec
  integrity?: string;
  resolvedUrl?: string;
  latestVersion?: string;
  isDeprecated?: boolean;
  deprecationReason?: string;
  vulnerabilities?: VulnerabilityInfo[];
  astUsage?: PackageUsageSummary;
  risk?: BreakingRiskScore;
}

export interface DependencyTree {
  lockfileType: LockfileType;
  lockfileVersion?: number | string;
  rootPackageName: string;
  rootPackageVersion: string;
  directDependenciesCount: number;
  transitiveDependenciesCount: number;
  nodes: Record<string, DependencyNode>; // keyed by package name or name@version
  directDependencyNames: string[];
}

/**
 * Vulnerability information (from OSV.dev / CVE / GitHub Advisories)
 */
export interface VulnerabilityInfo {
  id: string; // e.g. GHSA-xxxx-yyyy or CVE-2023-xxxxx
  summary: string;
  details?: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  affectedRange: string;
  fixedIn?: string;
  references: string[];
}

/**
 * AST Codebase Usage & Call Site Mapping
 */
export interface ImportSpecifierInfo {
  type: "default" | "named" | "namespace" | "side-effect";
  importedName: string; // e.g. "useState", "debounce", or "default"
  localName: string; // e.g. "myDebounce" or "useState"
  line: number;
  column: number;
}

export interface MethodCallSite {
  methodName: string; // e.g. "debounce" or "map"
  line: number;
  column: number;
  codeSnippet?: string;
  argumentsCount?: number;
}

export interface FileUsageRecord {
  filePath: string;
  relativePath: string;
  imports: ImportSpecifierInfo[];
  calls: MethodCallSite[];
  totalCallCount: number;
}

export interface PackageUsageSummary {
  packageName: string;
  isUsed: boolean;
  isGhostDependency: boolean; // Imported in code but not in direct package.json dependencies
  isUnusedDependency: boolean; // In package.json dependencies but never imported
  totalFilesCount: number;
  totalCallSites: number;
  files: FileUsageRecord[];
  importedSymbols: string[];
}

export interface ASTScanResult {
  scannedFilesCount: number;
  scannedLinesCount: number;
  packageUsages: Record<string, PackageUsageSummary>; // Keyed by package name
  ghostDependencies: string[]; // Packages imported but not in package.json
  unusedDependencies: string[]; // In package.json but not imported in any file
  syntaxErrors: { filePath: string; error: string }[];
}

/**
 * Breaking Change Risk Scoring (0 to 100)
 */
export type RiskLevel = "SAFE" | "MODERATE" | "BREAKING_WARNING" | "CRITICAL";

export type SemverJump = "major" | "minor" | "patch" | "prerelease" | "none";

export interface RiskScoreBreakdown {
  semverJump: SemverJump;
  semverScore: number; // 0 to 45
  usageDensityScore: number; // 0 to 35 based on file count & call sites
  deprecationScore: number; // 0 or 25
  vulnerabilityScore: number; // 0 to 30
  penaltyNotes: string[];
}

export interface BreakingRiskScore {
  score: number; // 0 to 100
  level: RiskLevel;
  breakdown: RiskScoreBreakdown;
  summary: string;
  recommendedAction: string;
  changelogNotice?: string;
}

/**
 * Sandbox Verification Results
 */
export interface SandboxCheckResult {
  packageName: string;
  targetVersion: string;
  status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED";
  exitCode: number;
  durationMs: number;
  typeCheckPassed: boolean;
  buildPassed: boolean;
  errorOutput?: string;
  stackTrace?: string;
}

/**
 * Full BreakGuard Project Analysis Report
 */
export interface ProjectAnalysisReport {
  timestamp: string;
  projectMetadata: {
    name: string;
    version: string;
    path?: string;
    lockfileType: LockfileType;
  };
  summary: {
    totalDependencies: number;
    directCount: number;
    transitiveCount: number;
    scannedFiles: number;
    averageRiskScore: number;
    safeCount: number;
    moderateCount: number;
    breakingWarningCount: number;
    deprecatedCount: number;
    vulnerableCount: number;
    ghostDependenciesCount: number;
    unusedDependenciesCount: number;
  };
  dependencies: Record<string, DependencyNode>;
  ghostDependencies: string[];
  unusedDependencies: string[];
  sandboxResults?: Record<string, SandboxCheckResult>;
}

// Zod Schemas for Runtime Validation
export const LockfileTypeSchema = z.enum(["npm", "yarn", "pnpm"]);
export const RiskLevelSchema = z.enum(["SAFE", "MODERATE", "BREAKING_WARNING", "CRITICAL"]);
export const SemverJumpSchema = z.enum(["major", "minor", "patch", "prerelease", "none"]);

export const VulnerabilityInfoSchema = z.object({
  id: z.string(),
  summary: z.string(),
  details: z.string().optional(),
  severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  affectedRange: z.string(),
  fixedIn: z.string().optional(),
  references: z.array(z.string()),
});

/**
 * GitHub Developer Program & Remote Repository QA Types
 */
export interface GitHubRepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssuesCount: number;
  defaultBranch: string;
  license?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  htmlUrl: string;
}

export interface GitHubCommitSummary {
  recentCommitsCount: number;
  lastCommitDate: string;
  activeAuthorsCount: number;
  velocityScore: number;
}

export interface GitHubPRSummary {
  openPRsCount: number;
  closedPRsCount: number;
  mergeRatePercent: number;
}

export interface GitHubLanguageBreakdown {
  [language: string]: {
    bytes: number;
    percentage: number;
  };
}

export interface GitHubQAHealthScore {
  totalScore: number; // 0 to 100
  grade: "A+" | "A" | "B" | "C" | "D";
  maintenanceScore: number; // 0 to 25
  issueResolutionScore: number; // 0 to 25
  documentationScore: number; // 0 to 20
  dependencyRiskScore: number; // 0 to 30
  badgeMarkdown: string;
  highlights: string[];
  warnings: string[];
}

export interface GitHubDependencyItem {
  name: string;
  versionSpec: string;
  category: DependencyCategory;
  latestVersion?: string;
  isOutdated?: boolean;
  vulnerabilitiesCount?: number;
}

export interface GitHubRepoReport {
  timestamp: string;
  repo: GitHubRepoMetadata;
  languages: GitHubLanguageBreakdown;
  commits: GitHubCommitSummary;
  pullRequests: GitHubPRSummary;
  qaScore: GitHubQAHealthScore;
  dependencies: {
    totalDirectDependencies: number;
    dependenciesList: GitHubDependencyItem[];
  };
}
