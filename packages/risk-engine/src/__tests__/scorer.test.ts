import { describe, it, expect } from "vitest";
import { calculateBreakingRiskScore } from "../scorer.js";
import { calculateSemverDiff } from "../semver.js";

describe("Risk Scorer Engine", () => {
  it("should calculate semver diff accurately", () => {
    const diffMajor = calculateSemverDiff("1.2.3", "2.0.0");
    expect(diffMajor.jump).toBe("major");

    const diffMinor = calculateSemverDiff("1.2.3", "1.5.0");
    expect(diffMinor.jump).toBe("minor");

    const diffPatch = calculateSemverDiff("1.2.3", "1.2.4");
    expect(diffPatch.jump).toBe("patch");

    // 0.x.y breaking
    const diffZeroMajor = calculateSemverDiff("0.3.1", "0.4.0");
    expect(diffZeroMajor.jump).toBe("major");
  });

  it("should calculate composite risk score with high AST call density during major upgrade", () => {
    const risk = calculateBreakingRiskScore({
      packageName: "axios",
      currentVersion: "0.27.2",
      targetVersion: "1.6.0",
      astUsage: {
        packageName: "axios",
        isUsed: true,
        isGhostDependency: false,
        isUnusedDependency: false,
        totalFilesCount: 12,
        totalCallSites: 30,
        files: [],
        importedSymbols: ["get", "post"],
      },
    });

    expect(risk.score).toBeGreaterThanOrEqual(70);
    expect(risk.level).toBe("CRITICAL");
    expect(risk.breakdown.semverScore).toBeGreaterThanOrEqual(40);
    expect(risk.breakdown.usageDensityScore).toBe(35);
  });

  it("should give lower risk to unused dependencies even during major bump", () => {
    const risk = calculateBreakingRiskScore({
      packageName: "unused-lib",
      currentVersion: "1.0.0",
      targetVersion: "2.0.0",
      astUsage: {
        packageName: "unused-lib",
        isUsed: false,
        isGhostDependency: false,
        isUnusedDependency: true,
        totalFilesCount: 0,
        totalCallSites: 0,
        files: [],
        importedSymbols: [],
      },
    });

    expect(risk.score).toBeLessThan(30);
    expect(risk.level).toBe("SAFE");
  });

  it("should penalize deprecated packages", () => {
    const risk = calculateBreakingRiskScore({
      packageName: "request",
      currentVersion: "2.88.2",
      targetVersion: "2.88.2",
      isDeprecated: true,
      deprecationReason: "Package no longer supported. Please consider using an alternative.",
    });

    expect(risk.breakdown.deprecationScore).toBe(25);
    expect(risk.breakdown.penaltyNotes.some((n) => n.includes("deprecated"))).toBe(true);
  });
});
