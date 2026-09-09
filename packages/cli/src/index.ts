import readline from "node:readline";
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

program
  .command("scan [path]")
  .description("Scan a local directory, calculate breaking risk scores, and list risky packages with AST call sites")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    await scanCommand(targetPath, options);
    await maybePauseOnExit();
  });

program
  .command("repo <repository>")
  .description("Analyze a remote GitHub repository QA health, commits, PRs, and dependencies via GitHub API")
  .option("--token <token>", "GitHub Personal Access Token for higher rate limits")
  .option("--json", "Output raw JSON report")
  .action(async (repository, options) => {
    await repoCommand(repository, options);
    await maybePauseOnExit();
  });

program
  .command("tree [path]")
  .description("Render an ASCII visual tree of dependencies directly in the terminal")
  .action(async (targetPath = ".") => {
    await treeCommand(targetPath);
    await maybePauseOnExit();
  });

program
  .command("audit [path]")
  .description("Run a complete audit suitable for CI/CD pipelines")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    await auditCommand(targetPath, options);
    await maybePauseOnExit();
  });

// Track if interactive launcher was activated
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

async function maybePauseOnExit() {
  if (isInteractiveSession) {
    console.log(chalk.gray("\n───────────────────────────────────────────────────────"));
    await askQuestion(chalk.cyan("Press Enter to return to main menu or exit..."));
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
    console.log(`  ${chalk.cyan("[5]")} 🚪 Exit`);
    console.log("");

    const choice = await askQuestion(chalk.yellow("Enter choice [1-5]: "));

    if (choice === "1") {
      console.log("");
      const repoUrl = await askQuestion(
        chalk.white("Enter GitHub Repo (e.g. facebook/react or https://github.com/owner/repo): ")
      );
      if (repoUrl) {
        console.log("");
        await repoCommand(repoUrl);
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
      }
    } else if (choice === "4") {
      console.log("");
      await treeCommand(".");
    } else if (choice === "5" || choice.toLowerCase() === "q" || choice.toLowerCase() === "exit") {
      console.log(chalk.green("\nThank you for using BreakGuard! Goodbye.\n"));
      process.exit(0);
    } else {
      console.log(chalk.red("\nInvalid choice. Please choose 1 to 5."));
    }

    console.log(chalk.gray("\n───────────────────────────────────────────────────────"));
    await askQuestion(chalk.cyan("Press Enter to continue..."));
  }
}

// If executed with no arguments (e.g. double clicked in Windows Explorer, or just `breakguard`),
// launch the interactive menu so the window NEVER closes unexpectedly!
if (process.argv.length <= 2) {
  runInteractiveMenu().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}
