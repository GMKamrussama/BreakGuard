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
  .description("Launch the polished BreakGuard Graphical Dashboard in your default browser")
  .action(async () => {
    openWebDashboard();
  });

function openWebDashboard() {
  console.log(chalk.cyan("\n🌐 Opening BreakGuard Polished Web UI Dashboard at http://localhost:3000..."));
  if (process.platform === "win32") {
    exec("start http://localhost:3000");
  } else if (process.platform === "darwin") {
    exec("open http://localhost:3000");
  } else {
    exec("xdg-open http://localhost:3000");
  }
}

async function runInteractiveMenu() {
  isInteractiveSession = true;
  while (true) {
    console.clear();
    console.log(chalk.bold.cyan("\n======================================================="));
    console.log(chalk.bold.white("  BreakGuard 🛡️ — AST & GitHub QA Analyzer"));
    console.log(chalk.gray("  Official Integration for GitHub Developer Program"));
    console.log(chalk.bold.cyan("=======================================================\n"));

    console.log(chalk.white.bold("Select an action:"));
    console.log(`  ${chalk.cyan("[1]")} 🌐 Analyze a Remote GitHub Repository (QA Health & Badge)`);
    console.log(`  ${chalk.cyan("[2]")} 📁 Scan Current Local Directory (.)`);
    console.log(`  ${chalk.cyan("[3]")} 📂 Scan Another Local Path`);
    console.log(`  ${chalk.cyan("[4]")} 🌲 Render Dependency Hierarchy Tree`);
    console.log(`  ${chalk.cyan("[5]")} 🚀 Launch Polished Graphical UI (Browser Dashboard)`);
    console.log(`  ${chalk.cyan("[6]")} 🚪 Exit`);
    console.log("");

    const choice = await askQuestion(chalk.yellow("Enter choice [1-6]: "));

    try {
      if (choice === "1") {
        console.log("");
        const repoUrl = await askQuestion(
          chalk.white("Enter GitHub Repo (e.g. facebook/react or https://github.com/owner/repo): ")
        );
        if (repoUrl) {
          console.log("");
          await repoCommand(repoUrl);
        } else {
          console.log(chalk.yellow("\nNo repository provided."));
        }
      } else if (choice === "2") {
        console.log("");
        await scanCommand(".");
      } else if (choice === "3") {
        console.log("");
        const folderPath = await askQuestion(chalk.white("Enter folder path: "));
        if (folderPath) {
          console.log("");
          await scanCommand(folderPath);
        } else {
          console.log(chalk.yellow("\nNo path provided."));
        }
      } else if (choice === "4") {
        console.log("");
        await treeCommand(".");
      } else if (choice === "5") {
        openWebDashboard();
      } else if (choice === "6" || choice.toLowerCase() === "q" || choice.toLowerCase() === "exit") {
        console.log(chalk.green("\nThank you for using BreakGuard! Goodbye.\n"));
        process.exit(0);
      } else {
        console.log(chalk.red("\nInvalid choice. Please choose 1 to 6."));
      }
    } catch (err: any) {
      console.error(chalk.red(`\nAn error occurred: ${err?.message || String(err)}`));
    }

    await pausePrompt();
  }
}

// If executed with no arguments (e.g. double clicked in Windows Explorer, or just `breakguard`),
// launch the interactive menu so the window NEVER closes unexpectedly!
if (process.argv.length <= 2) {
  runInteractiveMenu().catch(async (err) => {
    console.error(chalk.red(`\nFatal error: ${err?.message || String(err)}`));
    await pausePrompt();
  });
} else {
  program.parse(process.argv);
}
