import ora from "ora";
import chalk from "chalk";
import { analyzeProject } from "@breakguard/core";
import { renderSummaryTable, renderRiskyPackages, renderGhostAndUnused } from "../renderers/table.js";

export async function scanCommand(targetPath = ".", options: { json?: boolean } = {}) {
  const spinner = options.json
    ? null
    : ora({
        text: chalk.blue("Initializing BreakGuard AST & Lockfile scanner..."),
        color: "cyan",
      }).start();

  try {
    const report = await analyzeProject(targetPath, {
      onProgress: (step) => {
        if (spinner) spinner.text = chalk.blue(step);
      },
    });

    if (spinner) {
      spinner.succeed(chalk.green("Static codebase analysis complete!"));
    }

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    renderSummaryTable(report);
    renderRiskyPackages(report);
    renderGhostAndUnused(report);

    return report;
  } catch (err: any) {
    if (spinner) spinner.fail(chalk.red("Analysis failed!"));
    console.error(chalk.red(`\nError: ${err.message || String(err)}\n`));
  }
}
