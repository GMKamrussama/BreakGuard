import semver from "semver";
import type { SemverJump } from "@breakguard/core-types";

export interface VersionDiff {
  jump: SemverJump;
  currentClean: string;
  targetClean: string;
  majorDiff: number;
  minorDiff: number;
  patchDiff: number;
}

/**
 * Calculates the exact SemVer difference between current and target versions
 */
export function calculateSemverDiff(currentVersion: string, targetVersion: string): VersionDiff {
  const currentClean = semver.clean(currentVersion) || semver.coerce(currentVersion)?.version || "1.0.0";
  const targetClean = semver.clean(targetVersion) || semver.coerce(targetVersion)?.version || currentClean;

  const currentParsed = semver.parse(currentClean);
  const targetParsed = semver.parse(targetClean);

  if (!currentParsed || !targetParsed) {
    return {
      jump: "none",
      currentClean,
      targetClean,
      majorDiff: 0,
      minorDiff: 0,
      patchDiff: 0,
    };
  }

  // Handle 0.x semver where minor updates are effectively breaking
  const isZeroMajor = currentParsed.major === 0;
  const majorDiff = targetParsed.major - currentParsed.major;
  const minorDiff = targetParsed.minor - currentParsed.minor;
  const patchDiff = targetParsed.patch - currentParsed.patch;

  let jump: SemverJump = "none";

  if (majorDiff > 0 || (isZeroMajor && minorDiff > 0)) {
    jump = "major";
  } else if (minorDiff > 0 || (isZeroMajor && patchDiff > 0)) {
    jump = "minor";
  } else if (patchDiff > 0) {
    jump = "patch";
  } else if (semver.prerelease(targetClean)) {
    jump = "prerelease";
  }

  return {
    jump,
    currentClean,
    targetClean,
    majorDiff: Math.max(0, majorDiff),
    minorDiff: Math.max(0, minorDiff),
    patchDiff: Math.max(0, patchDiff),
  };
}
