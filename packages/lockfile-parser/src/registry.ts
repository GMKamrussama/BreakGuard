// Cache registry lookups
const registryCache = new Map<string, RegistryMeta>();

export interface RegistryMeta {
  latestVersion: string;
  isDeprecated: boolean;
  deprecationReason?: string;
  publishedAt?: string;
  homepage?: string;
}

export async function fetchPackageRegistryMeta(packageName: string): Promise<RegistryMeta> {
  if (registryCache.has(packageName)) {
    return registryCache.get(packageName)!;
  }

  // Handle scoped packages e.g. @swc/core -> @swc%2Fcore
  const encodedName = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://registry.npmjs.org/${encodedName}`, {
      headers: {
        Accept: "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const fallback: RegistryMeta = {
        latestVersion: "latest",
        isDeprecated: false,
      };
      registryCache.set(packageName, fallback);
      return fallback;
    }

    const data = (await res.json()) as any;
    const distTags = data["dist-tags"] || {};
    const latestVersion = distTags.latest || "1.0.0";

    const latestVersionMeta = data.versions?.[latestVersion] || {};
    const isDeprecated = Boolean(latestVersionMeta.deprecated || data.deprecated);
    const deprecationReason = typeof latestVersionMeta.deprecated === "string"
      ? latestVersionMeta.deprecated
      : typeof data.deprecated === "string"
        ? data.deprecated
        : undefined;

    const meta: RegistryMeta = {
      latestVersion,
      isDeprecated,
      deprecationReason,
      homepage: data.homepage,
      publishedAt: data.time?.[latestVersion],
    };

    registryCache.set(packageName, meta);
    return meta;
  } catch {
    const fallback: RegistryMeta = {
      latestVersion: "latest",
      isDeprecated: false,
    };
    registryCache.set(packageName, fallback);
    return fallback;
  }
}
