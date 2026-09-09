import type {
  BreakingRiskScore,
  RiskLevel,
  RiskScoreBreakdown,
  VulnerabilityInfo,
  PackageUsageSummary,
} from "@breakguard/core-types";
import { calculateSemverDiff } from "./semver.js";

export interface ScoreCalculationInput {
  packageName: string;
  currentVersion: string;
  targetVersion?: string;
  isDeprecated?: boolean;
  deprecationReason?: string;
  vulnerabilities?: VulnerabilityInfo[];
  astUsage?: PackageUsageSummary;
}

/**
 * Pure function to compute Composite Breaking Risk Score (0 to 100)
 */
export function calculateBreakingRiskScore(input: ScoreCalculationInput): BreakingRiskScore {
  const {
    packageName,
    currentVersion,
    targetVersion = currentVersion,
    isDeprecated = false,
    deprecationReason,
    vulnerabilities = [],
    astUsage,
  } = input;

  const versionDiff = calculateSemverDiff(currentVersion, targetVersion);
  const penaltyNotes: string[] = [];

  // 1. SemVer Jump Base Score (0 to 45 pts)
  let semverScore = 0;
  if (versionDiff.jump === "major") {
    semverScore = 40 + Math.min(5, versionDiff.majorDiff * 2);
    penaltyNotes.push(`Major SemVer jump (${versionDiff.currentClean} ➔ ${versionDiff.targetClean}) contains potential breaking API changes.`);
  } else if (versionDiff.jump === "minor") {
    semverScore = 15;
    penaltyNotes.push(`Minor version jump (${versionDiff.currentClean} ➔ ${versionDiff.targetClean}) includes new features or deprecations.`);
  } else if (versionDiff.jump === "patch") {
    semverScore = 5;
  }

  // 2. AST Codebase Usage & Call Density Score (0 to 35 pts)
  let usageDensityScore = 0;
  const fileCount = astUsage?.totalFilesCount || 0;
  const callCount = astUsage?.totalCallSites || 0;

  if (fileCount > 0 || callCount > 0) {
    if (versionDiff.jump === "major") {
      // High usage during a major bump means high breakage risk
      if (fileCount >= 10 || callCount >= 25) {
        usageDensityScore = 35;
        penaltyNotes.push(`High call density: Package used in ${fileCount} files across ${callCount} invocations.`);
      } else if (fileCount >= 4 || callCount >= 6) {
        usageDensityScore = 25;
        penaltyNotes.push(`Moderate call density: Package used in ${fileCount} files across ${callCount} invocations.`);
      } else {
        usageDensityScore = 15;
        penaltyNotes.push(`Low call density: Package used in ${fileCount} files across ${callCount} invocations.`);
      }
    } else if (versionDiff.jump === "minor") {
      if (callCount >= 15) {
        usageDensityScore = 15;
      } else {
        usageDensityScore = 8;
      }
    } else {
      // Patch bump
      usageDensityScore = Math.min(5, Math.ceil(callCount / 5));
    }
  } else if (astUsage?.isUnusedDependency) {
    penaltyNotes.push("Ghost/Unused dependency: Never imported in codebase, safe to prune or bump.");
    usageDensityScore = 0;
    semverScore = Math.min(semverScore, 10);
  }

  // 3. Deprecation Penalty (0 or 25 pts)
  let deprecationScore = 0;
  if (isDeprecated) {
    deprecationScore = 25;
    penaltyNotes.push(`Package is deprecated by maintainer: "${deprecationReason || "Deprecated"}"`);
  }

  // 4. Vulnerability Score (0 to 30 pts)
  let vulnerabilityScore = 0;
  if (vulnerabilities.length > 0) {
    let hasCritical = false;
    let hasHigh = false;

    for (const v of vulnerabilities) {
      if (v.severity === "CRITICAL") hasCritical = true;
      if (v.severity === "HIGH") hasHigh = true;
    }

    if (hasCritical) {
      vulnerabilityScore = 30;
      penaltyNotes.push(`Found ${vulnerabilities.length} known vulnerabilities (CRITICAL severity).`);
    } else if (hasHigh) {
      vulnerabilityScore = 20;
      penaltyNotes.push(`Found ${vulnerabilities.length} known vulnerabilities (HIGH severity).`);
    } else {
      vulnerabilityScore = 10;
      penaltyNotes.push(`Found ${vulnerabilities.length} security advisories.`);
    }
  }

  // Total Composite Score clamped to 0 - 100
  const rawTotal = semverScore + usageDensityScore + deprecationScore + vulnerabilityScore;
  const score = Math.max(0, Math.min(100, rawTotal));

  // Determine Risk Level
  let level: RiskLevel = "SAFE";
  if (score >= 75) {
    level = "CRITICAL";
  } else if (score >= 60) {
    level = "BREAKING_WARNING";
  } else if (score >= 30) {
    level = "MODERATE";
  } else {
    level = "SAFE";
  }

  // Summary and Recommendations
  let summary = "";
  let recommendedAction = "";

  if (level === "CRITICAL" || level === "BREAKING_WARNING") {
    summary = `High breaking change risk detected for ${packageName}. Upgrade is expected to require refactoring.`;
    recommendedAction = `Review AST call sites (${callCount} calls in ${fileCount} files), read official changelog/migration guide, and run in isolated sandbox before merging.`;
  } else if (level === "MODERATE") {
    summary = `Moderate migration risk. Upgrading ${packageName} should be verified with test suite.`;
    recommendedAction = `Inspect inspected method calls in ${fileCount} files and run automated unit tests.`;
  } else {
    summary = `Safe upgrade. Low probability of breaking existing behavior in ${packageName}.`;
    recommendedAction = `Safe to upgrade with standard continuous integration tests.`;
  }

  const breakdown: RiskScoreBreakdown = {
    semverJump: versionDiff.jump,
    semverScore,
    usageDensityScore,
    deprecationScore,
    vulnerabilityScore,
    penaltyNotes,
  };

  return {
    score,
    level,
    breakdown,
    summary,
    recommendedAction,
    changelogNotice: versionDiff.jump === "major"
      ? `Check GitHub releases / CHANGELOG for ${packageName} migration guide from v${versionDiff.currentClean} to v${versionDiff.targetClean}.`
      : undefined,
  };
}
