import type { DependencyNode, DependencyTree, DependencyCategory } from "@breakguard/core-types";
import YAML from "yaml";

export function parseYarnLockfile(
  yarnLockContent: string,
  packageJsonContent?: string
): DependencyTree {
  let pkgJson: Record<string, unknown> = {};
  if (packageJsonContent) {
    try {
      pkgJson = JSON.parse(packageJsonContent);
    } catch {
      // ignore
    }
  }

  const directDeps = (pkgJson.dependencies as Record<string, string>) || {};
  const directDevDeps = (pkgJson.devDependencies as Record<string, string>) || {};
  const directPeerDeps = (pkgJson.peerDependencies as Record<string, string>) || {};
  const directOptionalDeps = (pkgJson.optionalDependencies as Record<string, string>) || {};

  const directNames = new Set([
    ...Object.keys(directDeps),
    ...Object.keys(directDevDeps),
    ...Object.keys(directPeerDeps),
    ...Object.keys(directOptionalDeps),
  ]);

  const nodes: Record<string, DependencyNode> = {};

  // Check if Berry / Modern YAML (v2+)
  const isBerry = yarnLockContent.includes("__metadata:") || yarnLockContent.includes("resolution:");

  if (isBerry) {
    try {
      const parsed = YAML.parse(yarnLockContent) as Record<string, any>;
      for (const [descriptor, data] of Object.entries(parsed)) {
        if (descriptor === "__metadata" || !data || typeof data !== "object") continue;

        // Descriptor format: "react@npm:^18.2.0" or "@types/node@npm:^20.0.0"
        let pkgName = descriptor.replace(/^(")|(")$/g, "");
        const atIndex = pkgName.lastIndexOf("@npm:");
        if (atIndex !== -1) {
          pkgName = pkgName.substring(0, atIndex);
        } else {
          const atPos = pkgName.indexOf("@", 1);
          if (atPos !== -1) pkgName = pkgName.substring(0, atPos);
        }

        const isDirect = directNames.has(pkgName);
        let category: DependencyCategory = "transitive";
        if (directDeps[pkgName] || (isDirect && !directDevDeps[pkgName])) {
          category = "dependencies";
        } else if (directDevDeps[pkgName]) {
          category = "devDependencies";
        }

        const version = (data.version as string) || "unknown";
        const subDeps = (data.dependencies as Record<string, string>) || {};

        if (!nodes[pkgName] || isDirect) {
          nodes[pkgName] = {
            id: `${pkgName}@${version}`,
            name: pkgName,
            version,
            requestedRange: directDeps[pkgName] || directDevDeps[pkgName] || "*",
            category,
            isTransitive: !isDirect,
            depth: isDirect ? 1 : 2,
            parents: [],
            dependencies: subDeps,
            integrity: data.checksum,
          };
        }
      }
    } catch {
      // fallback to classic line-based parser
    }
  }

  // Classic Yarn v1 parser (handles "pkg@^1.0.0, pkg@^1.2.0:")
  if (Object.keys(nodes).length === 0) {
    const lines = yarnLockContent.split("\n");
    let currentHeader: string[] = [];
    let currentData: {
      version?: string;
      resolved?: string;
      integrity?: string;
      dependencies?: Record<string, string>;
    } | null = null;
    let inDependencies = false;

    function flushCurrent() {
      if (!currentData || !currentData.version || currentHeader.length === 0) return;

      for (const header of currentHeader) {
        // extract name from header e.g. "lodash@^4.17.21" or "@babel/core@^7.0.0"
        let clean = header.trim().replace(/:$/, "").replace(/^"|"$/g, "");
        const atPos = clean.lastIndexOf("@");
        const name = atPos > 0 ? clean.substring(0, atPos) : clean;
        if (!name) continue;

        const isDirect = directNames.has(name);
        let category: DependencyCategory = "transitive";
        if (directDeps[name] || (isDirect && !directDevDeps[name])) {
          category = "dependencies";
        } else if (directDevDeps[name]) {
          category = "devDependencies";
        }

        if (!nodes[name] || isDirect) {
          nodes[name] = {
            id: `${name}@${currentData.version}`,
            name,
            version: currentData.version,
            requestedRange: directDeps[name] || directDevDeps[name] || "*",
            category,
            isTransitive: !isDirect,
            depth: isDirect ? 1 : 2,
            parents: [],
            dependencies: currentData.dependencies || {},
            integrity: currentData.integrity,
            resolvedUrl: currentData.resolved,
          };
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith("#")) continue;

      if (!line.startsWith(" ") && !line.startsWith("\t")) {
        flushCurrent();
        currentHeader = line.split(",").map((s) => s.trim());
        currentData = { dependencies: {} };
        inDependencies = false;
        continue;
      }

      const trimmed = line.trim();
      if (!currentData) continue;

      if (trimmed.startsWith("version ")) {
        currentData.version = trimmed.replace(/^version\s+"?([^"]+)"?$/, "$1");
      } else if (trimmed.startsWith("resolved ")) {
        currentData.resolved = trimmed.replace(/^resolved\s+"?([^"]+)"?$/, "$1");
      } else if (trimmed.startsWith("integrity ")) {
        currentData.integrity = trimmed.replace(/^integrity\s+"?([^"]+)"?$/, "$1");
      } else if (trimmed.startsWith("dependencies:")) {
        inDependencies = true;
      } else if (inDependencies) {
        if (line.startsWith("    ") || line.startsWith("\t\t")) {
          const match = trimmed.match(/^"?([^"\s:]+)"?\s+"?([^"]+)"?$/);
          if (match && currentData.dependencies) {
            currentData.dependencies[match[1]] = match[2];
          }
        } else {
          inDependencies = false;
        }
      }
    }
    flushCurrent();
  }

  // Calculate parents & depths
  for (const [pkgName, node] of Object.entries(nodes)) {
    for (const subDepName of Object.keys(node.dependencies)) {
      if (nodes[subDepName] && !nodes[subDepName].parents.includes(pkgName)) {
        nodes[subDepName].parents.push(pkgName);
        if (nodes[subDepName].isTransitive) {
          nodes[subDepName].depth = Math.max(nodes[subDepName].depth, node.depth + 1);
        }
      }
    }
  }

  const directList = Object.keys(nodes).filter((name) => !nodes[name].isTransitive);
  const transitiveList = Object.keys(nodes).filter((name) => nodes[name].isTransitive);

  return {
    lockfileType: "yarn",
    lockfileVersion: isBerry ? "berry" : 1,
    rootPackageName: (pkgJson.name as string) || "root",
    rootPackageVersion: (pkgJson.version as string) || "1.0.0",
    directDependenciesCount: directList.length,
    transitiveDependenciesCount: transitiveList.length,
    nodes,
    directDependencyNames: directList,
  };
}
