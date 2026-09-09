import { NextResponse } from "next/server";
import { parseLockfileString, enrichDependencyTree } from "@breakguard/lockfile-parser";
import { scanSourceCode, aggregateScanResults } from "@breakguard/ast-scanner";
import { calculateBreakingRiskScore } from "@breakguard/risk-engine";
import type { LockfileType, ProjectAnalysisReport } from "@breakguard/core-types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      packageJson,
      lockfileContent = "",
      lockfileType = "npm",
      files = [],
    } = body as {
      packageJson?: string;
      lockfileContent?: string;
      lockfileType?: LockfileType;
      files?: Array<{ path: string; content: string }>;
    };

    if (!packageJson) {
      return NextResponse.json({ error: "Missing packageJson in request payload" }, { status: 400 });
    }

    const pkgData = JSON.parse(packageJson);
    const tree = parseLockfileString({
      packageJson,
      lockfileContent: lockfileContent || JSON.stringify({ name: pkgData.name, version: pkgData.version, dependencies: {} }),
      lockfileType,
    });

    // Run AST scan on provided files
    const fileScanResults = [];
    let totalScannedLines = 0;

    for (const f of files) {
      if (typeof f.content === "string") {
        totalScannedLines += f.content.split("\n").length;
        const res = scanSourceCode({
          filePath: f.path,
          relativePath: f.path,
          code: f.content,
        });
        fileScanResults.push(res);
      }
    }

    const astScan = aggregateScanResults(fileScanResults, tree.directDependencyNames, totalScannedLines);

    // Enrich tree with live registry & vulnerabilities
    await enrichDependencyTree(tree);

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

    const report: ProjectAnalysisReport = {
      timestamp: new Date().toISOString(),
      projectMetadata: {
        name: pkgData.name || "uploaded-project",
        version: pkgData.version || "1.0.0",
        lockfileType,
      },
      summary: {
        totalDependencies: tree.directDependenciesCount + tree.transitiveDependenciesCount,
        directCount: tree.directDependenciesCount,
        transitiveCount: tree.transitiveDependenciesCount,
        scannedFiles: files.length,
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

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze project" },
      { status: 500 }
    );
  }
}
