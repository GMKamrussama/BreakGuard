import readline from "node:readline";
import { exec } from "node:child_process";
import chalk from "chalk";
import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { treeCommand } from "./commands/tree.js";
import { auditCommand } from "./commands/audit.js";
import { repoCommand } from "./commands/repo.js";

const program = new Command();

program
  .name("breakguard")
  .description("BreakGuard 🛡️ — AST Codebase & GitHub Repository QA Analyzer")
  .version("1.0.0");

let isInteractiveSession = false;

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function pausePrompt() {
  console.log(chalk.gray("\n───────────────────────────────────────────────────────"));
  await askQuestion(chalk.cyan("Press Enter to return to main menu..."));
}

program
  .command("scan [path]")
  .description("Scan a local directory, calculate breaking risk scores, and list risky packages with AST call sites")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    try {
      await scanCommand(targetPath, options);
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err?.message || String(err)}\n`));
    }
    if (!options.json && process.stdout.isTTY) {
      await askQuestion(chalk.gray("\nTask completed. Press Enter to exit..."));
    }
  });

program
  .command("repo <repository>")
  .description("Analyze a remote GitHub repository QA health, commits, PRs, and dependencies via GitHub API")
  .option("--token <token>", "GitHub Personal Access Token for higher rate limits")
  .option("--json", "Output raw JSON report")
  .action(async (repository, options) => {
    try {
      await repoCommand(repository, options);
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err?.message || String(err)}\n`));
    }
    if (!options.json && process.stdout.isTTY) {
      await askQuestion(chalk.gray("\nTask completed. Press Enter to exit..."));
    }
  });

program
  .command("tree [path]")
  .description("Render an ASCII visual tree of dependencies directly in the terminal")
  .action(async (targetPath = ".") => {
    try {
      await treeCommand(targetPath);
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err?.message || String(err)}\n`));
    }
    if (process.stdout.isTTY) {
      await askQuestion(chalk.gray("\nTask completed. Press Enter to exit..."));
    }
  });

program
  .command("audit [path]")
  .description("Run a complete audit suitable for CI/CD pipelines")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    try {
      await auditCommand(targetPath, options);
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err?.message || String(err)}\n`));
    }
    if (!options.json && process.stdout.isTTY) {
      await askQuestion(chalk.gray("\nTask completed. Press Enter to exit..."));
    }
  });

program
  .command("ui")
  .description("Launch the polished BreakGuard Graphical Dashboard in your browser")
  .option("-p, --port <port>", "Port to run GUI server on", "4567")
  .action((options) => {
    startGuiServer(parseInt(options.port, 10), true);
  });

import { startGuiServer } from "./server.js";

// If executed with no arguments (e.g. double clicked in Windows Explorer, or just `breakguard.exe`),
// immediately launch the polished Graphical UI Dashboard without asking the user to manually select options!
if (process.argv.length <= 2) {
  startGuiServer(4567, true);
} else {
  program.parse(process.argv);
}
