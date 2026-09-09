import ora from "ora";
import chalk from "chalk";
import { analyzeProject } from "@breakguard/core";
import { renderDependencyTree } from "../renderers/tree.js";

export async function treeCommand(targetPath = ".", options: { json?: boolean } = {}) {
  const spinner = ora({
    text: chalk.blue("Resolving dependency tree hierarchy..."),
    color: "cyan",
  }).start();

  try {
    const report = await analyzeProject(targetPath, {
      onProgress: (step) => {
        spinner.text = chalk.blue(step);
      },
    });

    spinner.succeed(chalk.green("Dependency tree resolved!"));
    renderDependencyTree(report);
  } catch (err: any) {
    spinner.fail(chalk.red("Tree resolution failed!"));
    console.error(chalk.red(`\nError: ${err.message || String(err)}`));
    process.exit(1);
  }
}
