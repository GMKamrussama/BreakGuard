import { parseSync } from "@swc/core";
import type {
  ASTScanResult,
  PackageUsageSummary,
  FileUsageRecord,
  ImportSpecifierInfo,
  MethodCallSite,
} from "@breakguard/core-types";
import { extractPackageName, LineLocator } from "./visitor.js";

export interface ScanFileOptions {
  filePath: string;
  relativePath?: string;
  code: string;
}

/**
 * Parses a single code file using SWC and extracts imports and method usages
 */
export function scanSourceCode(options: ScanFileOptions): Map<string, FileUsageRecord> {
  const { filePath, relativePath = filePath, code } = options;
  const isTs = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  const isJsx = filePath.endsWith(".jsx") || filePath.endsWith(".tsx");

  const lineLocator = new LineLocator(code);
  const packageUsageMap = new Map<string, FileUsageRecord>();

  // Map local identifier name to { pkgName, importedName }
  const localBindings = new Map<
    string,
    { pkgName: string; importedName: string; type: ImportSpecifierInfo["type"] }
  >();

  function getOrCreateRecord(pkgName: string): FileUsageRecord {
    let rec = packageUsageMap.get(pkgName);
    if (!rec) {
      rec = {
        filePath,
        relativePath,
        imports: [],
        calls: [],
        totalCallCount: 0,
      };
      packageUsageMap.set(pkgName, rec);
    }
    return rec;
  }

  let ast: any = null;

  try {
    ast = parseSync(code, {
      syntax: isTs ? "typescript" : "ecmascript",
      tsx: isJsx,
      jsx: isJsx,
      target: "es2022",
      comments: false,
    });
  } catch {
    // Graceful fallback to regex parsing if SWC parser fails on malformed/experimental code
    return fallbackRegexScan(options);
  }

  if (!ast || !ast.body) return packageUsageMap;

  // 1. Traverse and collect all imports
  for (const node of ast.body) {
    if (node.type === "ImportDeclaration" && node.source?.value) {
      const sourceVal = node.source.value;
      const pkgName = extractPackageName(sourceVal);
      if (!pkgName) continue;

      const record = getOrCreateRecord(pkgName);

      if (!node.specifiers || node.specifiers.length === 0) {
        // Side-effect import: import 'foo'
        const pos = lineLocator.getLineAndColumn(node.span.start);
        record.imports.push({
          type: "side-effect",
          importedName: "*",
          localName: "*",
          line: pos.line,
          column: pos.column,
        });
      } else {
        for (const spec of node.specifiers) {
          const pos = lineLocator.getLineAndColumn(spec.span?.start || node.span.start);

          if (spec.type === "ImportDefaultSpecifier") {
            const localName = spec.local.value;
            localBindings.set(localName, { pkgName, importedName: "default", type: "default" });
            record.imports.push({
              type: "default",
              importedName: "default",
              localName,
              line: pos.line,
              column: pos.column,
            });
          } else if (spec.type === "ImportNamespaceSpecifier") {
            const localName = spec.local.value;
            localBindings.set(localName, { pkgName, importedName: "*", type: "namespace" });
            record.imports.push({
              type: "namespace",
              importedName: "*",
              localName,
              line: pos.line,
              column: pos.column,
            });
          } else if (spec.type === "ImportSpecifier") {
            const importedName = spec.imported ? spec.imported.value : spec.local.value;
            const localName = spec.local.value;
            localBindings.set(localName, { pkgName, importedName, type: "named" });
            record.imports.push({
              type: "named",
              importedName,
              localName,
              line: pos.line,
              column: pos.column,
            });
          }
        }
      }
    }
  }

  // 2. Traverse AST to detect call expressions and member invocations
  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    // Direct call e.g. debounce(...) or myFunc(...)
    if (node.type === "CallExpression") {
      const callee = node.callee;
      const argsCount = Array.isArray(node.arguments) ? node.arguments.length : 0;

      if (callee?.type === "Identifier" && localBindings.has(callee.value)) {
        const binding = localBindings.get(callee.value)!;
        const pos = lineLocator.getLineAndColumn(node.span?.start || 0);
        const record = getOrCreateRecord(binding.pkgName);

        record.calls.push({
          methodName: binding.importedName,
          line: pos.line,
          column: pos.column,
          argumentsCount: argsCount,
        });
        record.totalCallCount++;
      } else if (
        callee?.type === "MemberExpression" &&
        callee.object?.type === "Identifier" &&
        localBindings.has(callee.object.value)
      ) {
        // e.g. axios.get(...) or _ .map(...)
        const binding = localBindings.get(callee.object.value)!;
        const propertyName = callee.property?.value || callee.property?.name || "unknown";
        const pos = lineLocator.getLineAndColumn(node.span?.start || 0);
        const record = getOrCreateRecord(binding.pkgName);

        record.calls.push({
          methodName: `${binding.importedName !== "default" && binding.importedName !== "*" ? binding.importedName + "." : ""}${propertyName}`,
          line: pos.line,
          column: pos.column,
          argumentsCount: argsCount,
        });
        record.totalCallCount++;
      } else if (callee?.type === "Identifier" && callee.value === "require") {
        // CommonJS require('package')
        const firstArg = node.arguments?.[0]?.expression;
        if (firstArg?.type === "StringLiteral") {
          const pkgName = extractPackageName(firstArg.value);
          if (pkgName) {
            const pos = lineLocator.getLineAndColumn(node.span?.start || 0);
            const record = getOrCreateRecord(pkgName);
            record.imports.push({
              type: "default",
              importedName: "require",
              localName: "require",
              line: pos.line,
              column: pos.column,
            });
          }
        }
      }
    }

    // JSX Elements e.g. <Button />
    if (node.type === "JSXOpeningElement" && node.name?.type === "JSXIdentifier") {
      const name = node.name.value;
      if (localBindings.has(name)) {
        const binding = localBindings.get(name)!;
        const pos = lineLocator.getLineAndColumn(node.span?.start || 0);
        const record = getOrCreateRecord(binding.pkgName);
        record.calls.push({
          methodName: `<${binding.importedName} />`,
          line: pos.line,
          column: pos.column,
        });
        record.totalCallCount++;
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "span") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item);
      } else if (typeof child === "object") {
        walk(child);
      }
    }
  }

  walk(ast);
  return packageUsageMap;
}

/**
 * Fallback regex scanner when AST parser encounters experimental or syntax errors
 */
function fallbackRegexScan(options: ScanFileOptions): Map<string, FileUsageRecord> {
  const { filePath, relativePath = filePath, code } = options;
  const packageUsageMap = new Map<string, FileUsageRecord>();
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("from") && !line.includes("require")) continue;

    const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    const reqMatch = line.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
    const source = fromMatch?.[1] || reqMatch?.[1];

    if (source) {
      const pkgName = extractPackageName(source);
      if (pkgName) {
        let rec = packageUsageMap.get(pkgName);
        if (!rec) {
          rec = {
            filePath,
            relativePath,
            imports: [],
            calls: [],
            totalCallCount: 0,
          };
          packageUsageMap.set(pkgName, rec);
        }
        rec.imports.push({
          type: "named",
          importedName: "*",
          localName: "*",
          line: i + 1,
          column: 1,
        });
      }
    }
  }

  return packageUsageMap;
}

/**
 * Aggregate codebase scan results across all scanned files and correlate with package.json dependencies
 */
export function aggregateScanResults(
  fileScanResults: Array<Map<string, FileUsageRecord>>,
  knownDependencies: string[],
  totalScannedLines: number
): ASTScanResult {
  const packageUsages: Record<string, PackageUsageSummary> = {};
  const directDepsSet = new Set(knownDependencies);

  for (const fileMap of fileScanResults) {
    for (const [pkgName, fileRecord] of fileMap.entries()) {
      if (!packageUsages[pkgName]) {
        packageUsages[pkgName] = {
          packageName: pkgName,
          isUsed: true,
          isGhostDependency: !directDepsSet.has(pkgName),
          isUnusedDependency: false,
          totalFilesCount: 0,
          totalCallSites: 0,
          files: [],
          importedSymbols: [],
        };
      }

      const summary = packageUsages[pkgName];
      summary.totalFilesCount++;
      summary.totalCallSites += fileRecord.totalCallCount;
      summary.files.push(fileRecord);

      for (const imp of fileRecord.imports) {
        if (!summary.importedSymbols.includes(imp.importedName)) {
          summary.importedSymbols.push(imp.importedName);
        }
      }
    }
  }

  // Detect unused direct dependencies
  const unusedDependencies: string[] = [];
  for (const dep of knownDependencies) {
    if (!packageUsages[dep]) {
      unusedDependencies.push(dep);
      packageUsages[dep] = {
        packageName: dep,
        isUsed: false,
        isGhostDependency: false,
        isUnusedDependency: true,
        totalFilesCount: 0,
        totalCallSites: 0,
        files: [],
        importedSymbols: [],
      };
    }
  }

  const ghostDependencies = Object.keys(packageUsages).filter(
    (name) => packageUsages[name].isGhostDependency
  );

  return {
    scannedFilesCount: fileScanResults.length,
    scannedLinesCount: totalScannedLines,
    packageUsages,
    ghostDependencies,
    unusedDependencies,
    syntaxErrors: [],
  };
}
