import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";
import { treeCommand } from "./commands/tree.js";
import { auditCommand } from "./commands/audit.js";

const program = new Command();

program
  .name("breakguard")
  .description("Static AST Codebase Analyzer & Breaking Change Predictor for Node.js Dependencies")
  .version("1.0.0");

program
  .command("scan [path]", { isDefault: true })
  .description("Scan a directory, calculate breaking risk scores, and list risky packages with file/line call sites")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    await scanCommand(targetPath, options);
  });

program
  .command("tree [path]")
  .description("Render an ASCII visual tree of dependencies directly in the terminal")
  .action(async (targetPath = ".") => {
    await treeCommand(targetPath);
  });

program
  .command("audit [path]")
  .description("Run a complete audit suitable for CI/CD pipelines")
  .option("--json", "Output raw JSON report")
  .action(async (targetPath = ".", options) => {
    await auditCommand(targetPath, options);
  });

program.parse(process.argv);
