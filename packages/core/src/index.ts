import fs from "node:fs";
import path from "node:path";
import { glob } from "tinyglobby";
import { parseLockfileString, enrichDependencyTree } from "@breakguard/lockfile-parser";
import { scanSourceCode, aggregateScanResults } from "@breakguard/ast-scanner";
import { calculateBreakingRiskScore, calculateSemverDiff } from "@breakguard/risk-engine";
import type {
  LockfileType,
  ProjectAnalysisReport,
  DependencyNode,
  BreakingRiskScore,
  ASTScanResult,
} from "@breakguard/core-types";

// Re-export all underlying modules
export * from "@breakguard/core-types";
export * from "@breakguard/lockfile-parser";
export * from "@breakguard/ast-scanner";
export * from "@breakguard/risk-engine";
export * from "./github";

export interface AnalyzeOptions {
  onProgress?: (step: string) => void;
  enrichRegistry?: boolean;
}

/**
 * Cross-platform static analyzer that inspects a project directory
 */
export async function analyzeProject(
  targetDir: string,
  options: AnalyzeOptions = {}
): Promise<ProjectAnalysisReport> {
  const resolvedDir = path.resolve(targetDir);
  const pkgJsonPath = path.join(resolvedDir, "package.json");

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`No package.json found at "${resolvedDir}". Please specify a valid Node.js project directory.`);
  }

  options.onProgress?.("Reading package.json and lockfile...");
  const pkgJsonRaw = fs.readFileSync(pkgJsonPath, "utf-8");
  const pkgJson = JSON.parse(pkgJsonRaw);

  // Detect lockfile
  let lockfilePath: string | null = null;
  let lockfileType: LockfileType = "npm";

  if (fs.existsSync(path.join(resolvedDir, "pnpm-lock.yaml"))) {
    lockfilePath = path.join(resolvedDir, "pnpm-lock.yaml");
    lockfileType = "pnpm";
  } else if (fs.existsSync(path.join(resolvedDir, "yarn.lock"))) {
    lockfilePath = path.join(resolvedDir, "yarn.lock");
    lockfileType = "yarn";
  } else if (fs.existsSync(path.join(resolvedDir, "package-lock.json"))) {
    lockfilePath = path.join(resolvedDir, "package-lock.json");
    lockfileType = "npm";
  }

  const lockContent = lockfilePath
    ? fs.readFileSync(lockfilePath, "utf-8")
    : JSON.stringify({ name: pkgJson.name, version: pkgJson.version, dependencies: {} });

  const tree = parseLockfileString({
    packageJson: pkgJsonRaw,
    lockfileContent: lockContent,
    lockfileType,
  });

  options.onProgress?.("Scanning codebase with SWC AST parser...");
  const codeFiles = await glob(["**/*.{js,jsx,ts,tsx,mjs,cjs}"], {
    cwd: resolvedDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**", "**/.git/**", "**/out/**"],
    absolute: true,
  });

  const fileResults: Array<ReturnType<typeof scanSourceCode>> = [];
  let totalScannedLines = 0;

  for (const filePath of codeFiles) {
    try {
      const code = fs.readFileSync(filePath, "utf-8");
      totalScannedLines += code.split("\n").length;
      const normalizedPath = path.normalize(filePath);
      const relativePath = path.relative(resolvedDir, normalizedPath).replace(/\\/g, "/");

      const res = scanSourceCode({
        filePath: normalizedPath,
        relativePath,
        code,
      });
      fileResults.push(res);
    } catch {
      // skip unreadable files
    }
  }

  const directDepNames = tree.directDependencyNames;
  const astScan = aggregateScanResults(fileResults, directDepNames, totalScannedLines);

  if (options.enrichRegistry !== false) {
    options.onProgress?.("Querying npm registry & OSV.dev vulnerabilities...");
    try {
      await enrichDependencyTree(tree);
    } catch {
      // Offline fallback
    }
  }

  options.onProgress?.("Calculating breaking change risk scores...");
  let totalScore = 0;
  let safeCount = 0;
  let moderateCount = 0;
  let breakingWarningCount = 0;
  let deprecatedCount = 0;
  let vulnerableCount = 0;

  for (const name of tree.directDependencyNames) {
    const node = tree.nodes[name];
    if (!node) continue;

    node.astUsage = astScan.packageUsages[name];
    const risk = calculateBreakingRiskScore({
      packageName: node.name,
      currentVersion: node.version,
      targetVersion: node.latestVersion || node.version,
      isDeprecated: node.isDeprecated,
      deprecationReason: node.deprecationReason,
      vulnerabilities: node.vulnerabilities,
      astUsage: node.astUsage,
    });

    node.risk = risk;
    totalScore += risk.score;

    if (risk.level === "SAFE") safeCount++;
    else if (risk.level === "MODERATE") moderateCount++;
    else breakingWarningCount++;

    if (node.isDeprecated) deprecatedCount++;
    if (node.vulnerabilities && node.vulnerabilities.length > 0) vulnerableCount++;
  }

  const directCount = tree.directDependenciesCount || 1;
  const averageRiskScore = Math.round(totalScore / directCount);

  return {
    timestamp: new Date().toISOString(),
    projectMetadata: {
      name: pkgJson.name || "project",
      version: pkgJson.version || "1.0.0",
      path: resolvedDir,
      lockfileType,
    },
    summary: {
      totalDependencies: tree.directDependenciesCount + tree.transitiveDependenciesCount,
      directCount: tree.directDependenciesCount,
      transitiveCount: tree.transitiveDependenciesCount,
      scannedFiles: codeFiles.length,
      averageRiskScore,
      safeCount,
      moderateCount,
      breakingWarningCount,
      deprecatedCount,
      vulnerableCount,
      ghostDependenciesCount: astScan.ghostDependencies.length,
      unusedDependenciesCount: astScan.unusedDependencies.length,
    },
    dependencies: tree.nodes,
    ghostDependencies: astScan.ghostDependencies,
    unusedDependencies: astScan.unusedDependencies,
  };
}
