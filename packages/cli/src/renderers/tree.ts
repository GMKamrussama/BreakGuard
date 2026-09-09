import chalk from "chalk";
import type { ProjectAnalysisReport, DependencyNode } from "@breakguard/core";

export function renderDependencyTree(report: ProjectAnalysisReport): void {
  const directNames = Object.keys(report.dependencies).filter(
    (name) => !report.dependencies[name].isTransitive
  );

  console.log("\n" + chalk.bold.cyan(`🌳 Dependency Tree: ${report.projectMetadata.name}`));
  console.log(chalk.gray("━".repeat(70)));

  directNames.forEach((name, index) => {
    const isLast = index === directNames.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    const childIndent = isLast ? "    " : "│   ";
    const node = report.dependencies[name];

    printNode(node, prefix, childIndent, report.dependencies, new Set([name]));
  });

  console.log(chalk.gray("━".repeat(70)));
}

function printNode(
  node: DependencyNode,
  prefix: string,
  indent: string,
  nodes: Record<string, DependencyNode>,
  visited: Set<string>
): void {
  const risk = node.risk;
  const level = risk?.level || "SAFE";
  const score = risk?.score ?? 0;

  let color = chalk.green;
  let statusBadge = chalk.green(`[SAFE ${score}]`);

  if (node.isDeprecated) {
    color = chalk.magenta.bold;
    statusBadge = chalk.bgMagenta.black.bold(" DEPRECATED ");
  } else if (level === "CRITICAL") {
    color = chalk.red.bold;
    statusBadge = chalk.bgRed.white.bold(` CRITICAL ${score} `);
  } else if (level === "BREAKING_WARNING") {
    color = chalk.red;
    statusBadge = chalk.red.bold(`[BREAKING ${score}]`);
  } else if (level === "MODERATE") {
    color = chalk.yellow;
    statusBadge = chalk.yellow(`[MODERATE ${score}]`);
  }

  const verStr = node.latestVersion && node.latestVersion !== node.version
    ? `${node.version} ➔ ${chalk.cyan(node.latestVersion)}`
    : node.version;

  const usageInfo = node.astUsage && node.astUsage.totalCallSites > 0
    ? chalk.gray(`(${node.astUsage.totalFilesCount} files, ${node.astUsage.totalCallSites} calls)`)
    : "";

  console.log(`${chalk.gray(prefix)}${color(node.name)}@${verStr} ${statusBadge} ${usageInfo}`);

  // Print direct children / sub-dependencies
  const subDepNames = Object.keys(node.dependencies);
  subDepNames.forEach((subName, sIdx) => {
    if (visited.has(subName)) return; // prevent circular recursion
    visited.add(subName);

    const subNode = nodes[subName];
    if (!subNode) return;

    const isSubLast = sIdx === subDepNames.length - 1;
    const subPrefix = indent + (isSubLast ? "└── " : "├── ");
    const nextIndent = indent + (isSubLast ? "    " : "│   ");

    printNode(subNode, subPrefix, nextIndent, nodes, visited);
  });
}
