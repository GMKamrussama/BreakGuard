import type { DependencyNode, DependencyTree, DependencyCategory } from "@breakguard/core-types";
import YAML from "yaml";

export function parsePnpmLockfile(
  pnpmLockContent: string,
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

  const parsed = YAML.parse(pnpmLockContent) as Record<string, any>;
  const nodes: Record<string, DependencyNode> = {};
  const lockfileVersion = parsed?.lockfileVersion ?? 5;

  // Direct dependencies defined in pnpm lockfile across all workspace importers
  const importerEntries = parsed?.importers
    ? Object.entries(parsed.importers)
    : [["root", parsed]];

  for (const [importerPath, importerData] of importerEntries) {
    if (!importerData || typeof importerData !== "object") continue;
    const iData = importerData as Record<string, any>;
    const iDeps = (iData.dependencies as Record<string, any>) || {};
    const iDevDeps = (iData.devDependencies as Record<string, any>) || {};

    for (const [name, val] of Object.entries(iDeps)) {
      const versionStr = typeof val === "string" ? val : val?.version || "";
      if (versionStr.startsWith("link:") || versionStr.startsWith("workspace:")) continue;
      const version = typeof val === "string" ? val.replace(/^\/?.*@/, "") : val?.version || "unknown";
      if (!nodes[name]) {
        nodes[name] = {
          id: `${name}@${version}`,
          name,
          version,
          requestedRange: directDeps[name] || "*",
          category: "dependencies",
          isTransitive: false,
          depth: 1,
          parents: [],
          dependencies: {},
        };
      }
    }

    for (const [name, val] of Object.entries(iDevDeps)) {
      const versionStr = typeof val === "string" ? val : val?.version || "";
      if (versionStr.startsWith("link:") || versionStr.startsWith("workspace:")) continue;
      const version = typeof val === "string" ? val.replace(/^\/?.*@/, "") : val?.version || "unknown";
      if (!nodes[name]) {
        nodes[name] = {
          id: `${name}@${version}`,
          name,
          version,
          requestedRange: directDevDeps[name] || "*",
          category: "devDependencies",
          isTransitive: false,
          depth: 1,
          parents: [],
          dependencies: {},
        };
      }
    }
  }

  // Parse packages and v9 snapshots section for complete dependency links
  const packagesMap = (parsed?.packages as Record<string, any>) || {};
  const snapshotsMap = (parsed?.snapshots as Record<string, any>) || {};
  const allPkgKeys = new Set([...Object.keys(packagesMap), ...Object.keys(snapshotsMap)]);

  for (const pkgKey of allPkgKeys) {
    const pkgData = packagesMap[pkgKey] || {};
    const snapshotData = snapshotsMap[pkgKey] || {};

    let cleanKey = pkgKey.replace(/^\//, "");
    let pkgName = "";
    let version = "";

    if (cleanKey.includes("@")) {
      const atIndex = cleanKey.lastIndexOf("@");
      pkgName = cleanKey.substring(0, atIndex);
      version = cleanKey.substring(atIndex + 1);
    } else {
      const slashIndex = cleanKey.lastIndexOf("/");
      pkgName = cleanKey.substring(0, slashIndex);
      version = cleanKey.substring(slashIndex + 1);
    }

    if (!pkgName) continue;
    // Strip peer dependencies suffix in pnpm like `react@18.2.0(react-dom@18.2.0)`
    if (version.includes("(")) {
      version = version.split("(")[0];
    }

    const isDirect = directNames.has(pkgName) || (nodes[pkgName] && !nodes[pkgName].isTransitive);
    let category: DependencyCategory = isDirect
      ? (directDevDeps[pkgName] || (nodes[pkgName]?.category === "devDependencies") ? "devDependencies" : "dependencies")
      : "transitive";

    const subDeps: Record<string, string> = {};
    const rawDeps = {
      ...(pkgData.dependencies || {}),
      ...(pkgData.optionalDependencies || {}),
      ...(snapshotData.dependencies || {}),
      ...(snapshotData.optionalDependencies || {}),
    };

    for (const [depKey, depVer] of Object.entries(rawDeps)) {
      const cleanDepName = depKey.trim();
      let cleanDepVer = typeof depVer === "string" ? depVer : String(depVer || "unknown");
      if (cleanDepVer.includes("(")) {
        cleanDepVer = cleanDepVer.split("(")[0];
      }
      subDeps[cleanDepName] = cleanDepVer;
    }

    if (!nodes[pkgName]) {
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
      };
    } else {
      nodes[pkgName].dependencies = {
        ...nodes[pkgName].dependencies,
        ...subDeps,
      };
      if (isDirect) {
        nodes[pkgName].isTransitive = false;
        nodes[pkgName].depth = 1;
      }
    }
  }

  // Populate parents and depth
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
    lockfileType: "pnpm",
    lockfileVersion: String(lockfileVersion),
    rootPackageName: (pkgJson.name as string) || "root",
    rootPackageVersion: (pkgJson.version as string) || "1.0.0",
    directDependenciesCount: directList.length,
    transitiveDependenciesCount: transitiveList.length,
    nodes,
    directDependencyNames: directList,
  };
}
