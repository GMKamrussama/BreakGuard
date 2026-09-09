import { scanCommand } from "./scan.js";

export async function auditCommand(targetPath = ".", options: { json?: boolean } = {}) {
  return scanCommand(targetPath, options);
}
