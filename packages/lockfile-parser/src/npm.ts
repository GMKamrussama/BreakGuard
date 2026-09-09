import type { DependencyNode, DependencyTree, DependencyCategory } from "@breakguard/core-types";

interface NpmV1Dep {
  version: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  requires?: Record<string, string>;
  dependencies?: Record<string, NpmV1Dep>;
}

interface NpmPackageLockV1 {
  name: string;
  version: string;
  lockfileVersion?: number;
  dependencies?: Record<string, NpmV1Dep>;
}

interface NpmV2Package {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface NpmPackageLockV2V3 {
  name: string;
  version: string;
  lockfileVersion: number;
  packages?: Record<string, NpmV2Package>;
  dependencies?: Record<string, NpmV1Dep>; // for backwards compat in v2
}

export function parseNpmLockfile(
  packageLockContent: string,
  packageJsonContent?: string
): DependencyTree {
  const lockData = JSON.parse(packageLockContent) as NpmPackageLockV2V3;
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
  const lockfileVersion = lockData.lockfileVersion ?? 1;

  if (lockfileVersion >= 2 && lockData.packages) {
    // V2 / V3 parsing
    const rootPackage = lockData.packages[""] || {};
    const rootDirect = {
      ...(rootPackage.dependencies || {}),
      ...(rootPackage.devDependencies || {}),
      ...(rootPackage.peerDependencies || {}),
      ...(rootPackage.optionalDependencies || {}),
      ...Object.fromEntries(Array.from(directNames).map((n) => [n, directDeps[n] || directDevDeps[n] || "*"])),
    };

    for (const [pkgPath, info] of Object.entries(lockData.packages)) {
      if (!pkgPath || pkgPath === "") continue;

      // Extract package name from node_modules path
      // e.g. "node_modules/lodash" or "node_modules/foo/node_modules/bar" or "node_modules/@scope/pkg"
      const parts = pkgPath.split("node_modules/");
      const pkgName = parts[parts.length - 1];
      if (!pkgName || !info.version) continue;

      const isDirect = directNames.size > 0
        ? directNames.has(pkgName)
        : Boolean(
            rootPackage.dependencies?.[pkgName] ||
            rootPackage.devDependencies?.[pkgName] ||
            rootPackage.peerDependencies?.[pkgName] ||
            rootPackage.optionalDependencies?.[pkgName]
          );
      let category: DependencyCategory = "transitive";

      if (directDeps[pkgName] || (isDirect && !info.dev)) {
        category = "dependencies";
      } else if (directDevDeps[pkgName] || (isDirect && info.dev)) {
        category = "devDependencies";
      } else if (directPeerDeps[pkgName]) {
        category = "peerDependencies";
      } else if (directOptionalDeps[pkgName]) {
        category = "optionalDependencies";
      }

      const id = `${pkgName}@${info.version}`;
      const subDeps: Record<string, string> = {
        ...(info.dependencies || {}),
        ...(info.optionalDependencies || {}),
      };

      if (!nodes[pkgName] || isDirect) {
        nodes[pkgName] = {
          id,
          name: pkgName,
          version: info.version,
          requestedRange: directDeps[pkgName] || directDevDeps[pkgName] || rootDirect[pkgName] || "*",
          category,
          isTransitive: !isDirect,
          depth: isDirect ? 1 : 2,
          parents: [],
          dependencies: subDeps,
          integrity: info.integrity,
          resolvedUrl: info.resolved,
        };
      }
    }
  } else if (lockData.dependencies) {
    // V1 fallback parsing
    function processV1(deps: Record<string, NpmV1Dep>, depth = 1, parentName = "") {
      for (const [name, info] of Object.entries(deps)) {
        const isDirect = directNames.has(name) || depth === 1;
        const category: DependencyCategory = isDirect
          ? (directDevDeps[name] || info.dev ? "devDependencies" : "dependencies")
          : "transitive";

        if (!nodes[name]) {
          nodes[name] = {
            id: `${name}@${info.version}`,
            name,
            version: info.version,
            requestedRange: directDeps[name] || directDevDeps[name] || "*",
            category,
            isTransitive: !isDirect,
            depth,
            parents: parentName ? [parentName] : [],
            dependencies: info.requires || {},
            integrity: info.integrity,
            resolvedUrl: info.resolved,
          };
        } else if (parentName && !nodes[name].parents.includes(parentName)) {
          nodes[name].parents.push(parentName);
        }

        if (info.dependencies) {
          processV1(info.dependencies, depth + 1, name);
        }
      }
    }
    processV1(lockData.dependencies, 1);
  }

  // Populate parents and depth accurately
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
    lockfileType: "npm",
    lockfileVersion,
    rootPackageName: (pkgJson.name as string) || lockData.name || "root",
    rootPackageVersion: (pkgJson.version as string) || lockData.version || "1.0.0",
    directDependenciesCount: directList.length,
    transitiveDependenciesCount: transitiveList.length,
    nodes,
    directDependencyNames: directList,
  };
}
