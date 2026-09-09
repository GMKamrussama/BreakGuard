import type { VulnerabilityInfo } from "@breakguard/core-types";

// In-memory cache for vulnerabilities
const vulnerabilityCache = new Map<string, VulnerabilityInfo[]>();

/**
 * Query OSV.dev for vulnerabilities for a given npm package and version
 */
export async function fetchVulnerabilitiesForPackage(
  packageName: string,
  version: string
): Promise<VulnerabilityInfo[]> {
  const cacheKey = `${packageName}@${version}`;
  if (vulnerabilityCache.has(cacheKey)) {
    return vulnerabilityCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: {
          name: packageName,
          ecosystem: "npm",
        },
        version,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      vulnerabilityCache.set(cacheKey, []);
      return [];
    }

    const data = (await res.json()) as { vulns?: any[] };
    if (!data.vulns || !Array.isArray(data.vulns)) {
      vulnerabilityCache.set(cacheKey, []);
      return [];
    }

    const results: VulnerabilityInfo[] = data.vulns.map((v) => {
      let severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "MODERATE";
      if (v.database_specific?.severity) {
        const s = String(v.database_specific.severity).toUpperCase();
        if (s.includes("CRIT")) severity = "CRITICAL";
        else if (s.includes("HIGH")) severity = "HIGH";
        else if (s.includes("MOD") || s.includes("MED")) severity = "MODERATE";
        else if (s.includes("LOW")) severity = "LOW";
      }

      // affected range and fixed in
      let affectedRange = "<= " + version;
      let fixedIn: string | undefined;

      if (v.affected && Array.isArray(v.affected)) {
        for (const aff of v.affected) {
          if (aff.ranges) {
            for (const r of aff.ranges) {
              if (r.events) {
                for (const ev of r.events) {
                  if (ev.fixed) fixedIn = ev.fixed;
                }
              }
            }
          }
        }
      }

      return {
        id: v.id || "VULN-" + Math.random().toString(36).substring(7),
        summary: v.summary || v.details?.substring(0, 100) || "Security vulnerability reported",
        details: v.details,
        severity,
        affectedRange,
        fixedIn,
        references: Array.isArray(v.references) ? v.references.map((r: any) => r.url || String(r)) : [],
      };
    });

    vulnerabilityCache.set(cacheKey, results);
    return results;
  } catch {
    // Graceful offline fallback
    return [];
  }
}

/**
 * Batch query OSV.dev for multiple packages
 */
export async function batchFetchVulnerabilities(
  packages: Array<{ name: string; version: string }>
): Promise<Record<string, VulnerabilityInfo[]>> {
  const result: Record<string, VulnerabilityInfo[]> = {};
  const toFetch: Array<{ name: string; version: string }> = [];

  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version}`;
    if (vulnerabilityCache.has(key)) {
      result[pkg.name] = vulnerabilityCache.get(key)!;
    } else {
      toFetch.push(pkg);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: toFetch.map((p) => ({
          package: { name: p.name, ecosystem: "npm" },
          version: p.version,
        })),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as { results?: any[] };
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((item, index) => {
          const pkg = toFetch[index];
          if (!pkg) return;
          const vulns: VulnerabilityInfo[] = (item.vulns || []).map((v: any) => ({
            id: v.id,
            summary: v.summary || "Security vulnerability",
            details: v.details,
            severity: "HIGH",
            affectedRange: "<= " + pkg.version,
            references: Array.isArray(v.references) ? v.references.map((r: any) => r.url || String(r)) : [],
          }));
          const key = `${pkg.name}@${pkg.version}`;
          vulnerabilityCache.set(key, vulns);
          result[pkg.name] = vulns;
        });
        return result;
      }
    }
  } catch {
    // Fallback: individually or return empty
  }

  // Fallback to empty if offline
  for (const pkg of toFetch) {
    result[pkg.name] = [];
  }

  return result;
}
