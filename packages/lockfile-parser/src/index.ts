import type { DependencyTree, LockfileType } from "@breakguard/core-types";
import { parseNpmLockfile } from "./npm.js";
import { parseYarnLockfile } from "./yarn.js";
import { parsePnpmLockfile } from "./pnpm.js";
import { fetchVulnerabilitiesForPackage, batchFetchVulnerabilities } from "./osv.js";
import { fetchPackageRegistryMeta } from "./registry.js";

export * from "./npm.js";
export * from "./yarn.js";
export * from "./pnpm.js";
export * from "./osv.js";
export * from "./registry.js";

export interface ParseOptions {
  packageJson?: string;
  lockfileContent: string;
  lockfileType?: LockfileType;
  fetchRegistryData?: boolean;
}

/**
 * Detects lockfile type from filename or content, then parses it into a unified DependencyTree
 */
export function parseLockfileString(options: ParseOptions): DependencyTree {
  let type: LockfileType = options.lockfileType || "npm";

  if (!options.lockfileType) {
    if (options.lockfileContent.includes("lockfileVersion:") || options.lockfileContent.includes("importers:")) {
      type = "pnpm";
    } else if (options.lockfileContent.includes("# yarn lockfile") || options.lockfileContent.includes("__metadata:")) {
      type = "yarn";
    } else {
      type = "npm";
    }
  }

  switch (type) {
    case "pnpm":
      return parsePnpmLockfile(options.lockfileContent, options.packageJson);
    case "yarn":
      return parseYarnLockfile(options.lockfileContent, options.packageJson);
    case "npm":
    default:
      return parseNpmLockfile(options.lockfileContent, options.packageJson);
  }
}

/**
 * Enhances a DependencyTree with live npm registry and OSV vulnerability data
 */
export async function enrichDependencyTree(tree: DependencyTree): Promise<DependencyTree> {
  const directNodes = tree.directDependencyNames
    .map((name) => tree.nodes[name])
    .filter(Boolean);

  // Batch query vulnerabilities
  const vulnResults = await batchFetchVulnerabilities(
    directNodes.map((n) => ({ name: n.name, version: n.version }))
  );

  // Query registry metadata for direct dependencies in parallel
  await Promise.all(
    directNodes.map(async (node) => {
      try {
        const meta = await fetchPackageRegistryMeta(node.name);
        node.latestVersion = meta.latestVersion;
        node.isDeprecated = meta.isDeprecated;
        node.deprecationReason = meta.deprecationReason;
        node.vulnerabilities = vulnResults[node.name] || [];
      } catch {
        // keep existing data
      }
    })
  );

  return tree;
}
