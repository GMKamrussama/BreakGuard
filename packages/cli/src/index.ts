import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { glob } from "tinyglobby";
import { parseLockfileString, enrichDependencyTree } from "@breakguard/lockfile-parser";
import { scanSourceCode, aggregateScanResults } from "@breakguard/ast-scanner";
import { calculateBreakingRiskScore } from "@breakguard/risk-engine";
import type { LockfileType, ProjectAnalysisReport } from "@breakguard/core-types";

export async function runAudit(targetDir = process.cwd(), options: { json?: boolean; strict?: boolean } = {}) {
  const resolvedDir = path.resolve(targetDir);
  const pkgJsonPath = path.join(resolvedDir, "package.json");

  if (!fs.existsSync(pkgJsonPath)) {
    console.error(pc.red(`Error: No package.json found at ${resolvedDir}`));
    process.exit(1);
  }

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

  if (!lockfilePath) {
    console.warn(pc.yellow("Warning: No lockfile found (package-lock.json, yarn.lock, or pnpm-lock.yaml). Proceeding with package.json dependencies only."));
  }

  const lockContent = lockfilePath ? fs.readFileSync(lockfilePath, "utf-8") : JSON.stringify({ name: pkgJson.name, version: pkgJson.version, dependencies: {} });
  const tree = parseLockfileString({
    packageJson: pkgJsonRaw,
    lockfileContent: lockContent,
    lockfileType,
  });

  if (!options.json) {
    console.log(pc.cyan(`\n🛡️  BreakGuard Audit: ${pc.bold(pkgJson.name || "project")} (v${pkgJson.version || "1.0.0"})`));
    console.log(pc.dim(`   Lockfile: ${lockfileType} | Direct: ${tree.directDependenciesCount} | Transitive: ${tree.transitiveDependenciesCount}\n`));
  }

  // Scan codebase with AST scanner
  const codeFiles = await glob(["**/*.{js,jsx,ts,tsx,mjs,cjs}"], {
    cwd: resolvedDir,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**", "**/.git/**"],
    absolute: true,
  });

  const fileResults: Array<ReturnType<typeof scanSourceCode>> = [];
  let totalScannedLines = 0;

  for (const filePath of codeFiles) {
    try {
      const code = fs.readFileSync(filePath, "utf-8");
      totalScannedLines += code.split("\n").length;
      const res = scanSourceCode({
        filePath,
        relativePath: path.relative(resolvedDir, filePath),
        code,
      });
      fileResults.push(res);
    } catch {
      // skip unreadable files
    }
  }

  const directDepNames = tree.directDependencyNames;
  const astScan = aggregateScanResults(fileResults, directDepNames, totalScannedLines);

  // Enrich with registry and vulnerabilities
  await enrichDependencyTree(tree);

  // Calculate breaking risk scores
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

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  // Console output
  console.log(pc.bold("Dependency Breakdown:"));
  console.log("─".repeat(80));
  console.log(`${"Package".padEnd(25)} ${"Current".padEnd(10)} ${"Latest".padEnd(10)} ${"Calls".padEnd(8)} ${"Risk".padEnd(12)} Status`);
  console.log("─".repeat(80));

  for (const name of tree.directDependencyNames) {
    const node = tree.nodes[name];
    if (!node) continue;

    const risk = node.risk!;
    let riskColor = pc.green;
    if (risk.level === "MODERATE") riskColor = pc.yellow;
    if (risk.level === "BREAKING_WARNING" || risk.level === "CRITICAL") riskColor = pc.red;

    const calls = node.astUsage ? String(node.astUsage.totalCallSites) : "0";
    const statusNote = node.isDeprecated
      ? pc.magenta("DEPRECATED")
      : node.vulnerabilities && node.vulnerabilities.length > 0
        ? pc.red(`${node.vulnerabilities.length} VULNS`)
        : pc.dim("OK");

    console.log(
      `${node.name.padEnd(25)} ${node.version.padEnd(10)} ${(node.latestVersion || "-").padEnd(10)} ${calls.padEnd(8)} ${riskColor(String(risk.score) + "/100 " + risk.level).padEnd(20)} ${statusNote}`
    );
  }

  console.log("─".repeat(80));

  if (astScan.ghostDependencies.length > 0) {
    console.log(pc.yellow(`\n⚠️  Ghost Dependencies (imported in code but not in package.json):`));
    console.log(`   ${astScan.ghostDependencies.join(", ")}`);
  }

  if (astScan.unusedDependencies.length > 0) {
    console.log(pc.dim(`\n💡 Unused Dependencies (declared in package.json with 0 code imports):`));
    console.log(pc.dim(`   ${astScan.unusedDependencies.join(", ")}`));
  }

  console.log(pc.bold(`\nComposite Project Risk: ${averageRiskScore}/100`));
  console.log(`Safe: ${pc.green(safeCount)} | Moderate: ${pc.yellow(moderateCount)} | Breaking Warning: ${pc.red(breakingWarningCount)} | Deprecated: ${pc.magenta(deprecatedCount)}\n`);

  return report;
}

// CLI entry point
const args = process.argv.slice(2);
const isJson = args.includes("--json");
const isStrict = args.includes("--strict");
const targetPath = args.find((a) => !a.startsWith("-")) || process.cwd();

runAudit(targetPath, { json: isJson, strict: isStrict }).catch((err) => {
  console.error(pc.red("Audit failed:"), err);
  process.exit(1);
});
