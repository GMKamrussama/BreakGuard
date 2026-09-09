import chalk from "chalk";
import type { ProjectAnalysisReport, DependencyNode } from "@breakguard/core";

export function renderSummaryTable(report: ProjectAnalysisReport): void {
  const { summary, projectMetadata } = report;
  const avg = summary.averageRiskScore;

  let scoreBadge = chalk.bgGreen.black.bold(` ${avg}/100 SAFE `);
  if (avg >= 70) {
    scoreBadge = chalk.bgRed.white.bold(` ${avg}/100 CRITICAL `);
  } else if (avg >= 40) {
    scoreBadge = chalk.bgYellow.black.bold(` ${avg}/100 MODERATE `);
  }

  console.log("\n" + chalk.bold.cyan("🛡️  BreakGuard Analysis Summary"));
  console.log(chalk.gray("━".repeat(70)));
  console.log(
    `${chalk.bold("Project:")}     ${chalk.white(projectMetadata.name)} ${chalk.gray("v" + projectMetadata.version)}`
  );
  console.log(
    `${chalk.bold("Lockfile:")}    ${chalk.blue(projectMetadata.lockfileType.toUpperCase())}`
  );
  console.log(
    `${chalk.bold("Risk Score:")}  ${scoreBadge}`
  );
  console.log(
    `${chalk.bold("Packages:")}    ${chalk.white(summary.totalDependencies)} total (${chalk.cyan(summary.directCount + " direct")}, ${chalk.gray(summary.transitiveCount + " transitive")})`
  );
  console.log(
    `${chalk.bold("Health:")}      ${chalk.green(summary.safeCount + " safe")}, ${chalk.yellow(summary.moderateCount + " moderate")}, ${chalk.red(summary.breakingWarningCount + " breaking/critical")}`
  );

  if (summary.deprecatedCount > 0) {
    console.log(
      `${chalk.bold("Deprecated:")}  ${chalk.magenta.bold(summary.deprecatedCount + " packages flagged")}`
    );
  }

  if (summary.vulnerableCount > 0) {
    console.log(
      `${chalk.bold("Advisories:")}  ${chalk.red.bold(summary.vulnerableCount + " packages with OSV.dev CVE advisories")}`
    );
  }

  console.log(chalk.gray("━".repeat(70)));
}

export function renderRiskyPackages(report: ProjectAnalysisReport): void {
  const nodes = Object.values(report.dependencies);
  const riskyNodes = nodes.filter(
    (n) => n.risk?.level === "CRITICAL" || n.risk?.level === "BREAKING_WARNING" || n.isDeprecated
  );

  if (riskyNodes.length === 0) {
    console.log(chalk.green("\n✅ No high-risk or breaking dependencies detected. Codebase is healthy!"));
    return;
  }

  console.log(chalk.bold.red("\n⚠️  High-Risk & Breaking Dependencies:"));
  console.log(chalk.gray("━".repeat(70)));

  for (const node of riskyNodes) {
    const risk = node.risk!;
    const levelColor =
      risk.level === "CRITICAL" || node.isDeprecated
        ? chalk.red.bold
        : chalk.yellow.bold;

    console.log(
      `\n${levelColor("● " + node.name)} ${chalk.gray("v" + node.version)} ${chalk.gray("➔")} ${chalk.cyan("v" + (node.latestVersion || node.version))}  ${levelColor("[" + risk.score + "/100 " + risk.level + "]")}`
    );

    if (node.isDeprecated) {
      console.log(`  ${chalk.magenta("↳ Deprecated:")} ${node.deprecationReason || "Package discontinued by maintainer"}`);
    }

    if (risk.summary) {
      console.log(`  ${chalk.white("↳ Summary:")} ${risk.summary}`);
    }

    if (risk.recommendedAction) {
      console.log(`  ${chalk.blue("↳ Action:")} ${risk.recommendedAction}`);
    }

    // List affected local files and line numbers
    if (node.astUsage && node.astUsage.files.length > 0) {
      console.log(`  ${chalk.yellow("↳ Affected Files & Line Numbers:")}`);
      for (const file of node.astUsage.files) {
        const callsStr = file.calls.map((c) => `${c.methodName}():L${c.line}`).join(", ");
        console.log(`    ${chalk.gray("•")} ${chalk.underline(file.relativePath)} ${callsStr ? chalk.gray("(" + callsStr + ")") : ""}`);
      }
    }
  }

  console.log(chalk.gray("\n" + "━".repeat(70)));
}

export function renderGhostAndUnused(report: ProjectAnalysisReport): void {
  if (report.ghostDependencies.length > 0) {
    console.log(
      chalk.yellow(`\n👻 Ghost Dependencies (imported in code but missing from package.json):`)
    );
    console.log(chalk.gray("   " + report.ghostDependencies.map((g) => chalk.yellow(g)).join(", ")));
  }

  if (report.unusedDependencies.length > 0) {
    console.log(
      chalk.gray(`\n💡 Unused Dependencies (declared in package.json with 0 code usages):`)
    );
    console.log(chalk.gray("   " + report.unusedDependencies.join(", ")));
  }
}
