import type {
  GitHubRepoReport,
  GitHubRepoMetadata,
  GitHubCommitSummary,
  GitHubPRSummary,
  GitHubLanguageBreakdown,
  GitHubQAHealthScore,
  GitHubDependencyItem,
} from "@breakguard/core-types";

export interface GitHubAnalyzeOptions {
  token?: string;
  onProgress?: (msg: string) => void;
}

/**
 * Parses GitHub repo slug (owner/repo) from a variety of inputs:
 * - https://github.com/facebook/react
 * - github.com/facebook/react
 * - git@github.com:facebook/react.git
 * - facebook/react
 */
export function parseGitHubSlug(input: string): { owner: string; repo: string } {
  let cleaned = input.trim();
  // Remove git+ or git@
  cleaned = cleaned.replace(/^git\+https?:\/\//, "https://");
  cleaned = cleaned.replace(/^git@github\.com:/, "");
  // Remove full url prefix
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?github\.com\//, "");
  // Remove .git suffix
  cleaned = cleaned.replace(/\.git$/, "");
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      `Invalid GitHub repository format: "${input}". Expected "owner/repo" or "https://github.com/owner/repo".`
    );
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

/**
 * Core GitHub API client & QA Analyzer
 * Fulfills official GitHub Developer Program integration requirements
 */
export async function analyzeGitHubRepo(
  repoInput: string,
  options: GitHubAnalyzeOptions = {}
): Promise<GitHubRepoReport> {
  const { owner, repo } = parseGitHubSlug(repoInput);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "BreakGuard-QA-Analyzer/1.0",
  };

  const token = options.token || (typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : undefined);
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const fetchJson = async <T>(endpoint: string): Promise<T | null> => {
    try {
      const res = await fetch(`https://api.github.com${endpoint}`, { headers });
      if (!res.ok) {
        if (res.status === 404) return null;
        if (res.status === 403) {
          const rateLimitReset = res.headers.get("x-ratelimit-reset");
          const remaining = res.headers.get("x-ratelimit-remaining");
          if (remaining === "0") {
            throw new Error(
              `GitHub API rate limit exceeded. Provide a personal access token via GITHUB_TOKEN or --token.`
            );
          }
        }
        throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      if (err.message.includes("rate limit")) throw err;
      return null;
    }
  };

  options.onProgress?.(`Fetching repository metadata for ${owner}/${repo}...`);
  const rawRepo: any = await fetchJson(`/repos/${owner}/${repo}`);
  if (!rawRepo) {
    throw new Error(`Repository "${owner}/${repo}" not found or inaccessible on GitHub.`);
  }

  const metadata: GitHubRepoMetadata = {
    owner: rawRepo.owner?.login || owner,
    repo: rawRepo.name || repo,
    fullName: rawRepo.full_name || `${owner}/${repo}`,
    description: rawRepo.description || "No description provided.",
    stars: rawRepo.stargazers_count || 0,
    forks: rawRepo.forks_count || 0,
    openIssuesCount: rawRepo.open_issues_count || 0,
    defaultBranch: rawRepo.default_branch || "main",
    license: rawRepo.license?.spdx_id || rawRepo.license?.name || undefined,
    isArchived: Boolean(rawRepo.archived),
    createdAt: rawRepo.created_at,
    updatedAt: rawRepo.updated_at,
    pushedAt: rawRepo.pushed_at,
    topics: rawRepo.topics || [],
    htmlUrl: rawRepo.html_url || `https://github.com/${owner}/${repo}`,
  };

  options.onProgress?.("Fetching language statistics...");
  const rawLanguages: Record<string, number> | null = await fetchJson(`/repos/${owner}/${repo}/languages`);
  const languages: GitHubLanguageBreakdown = {};
  if (rawLanguages) {
    const totalBytes = Object.values(rawLanguages).reduce((a, b) => a + b, 0) || 1;
    for (const [lang, bytes] of Object.entries(rawLanguages)) {
      languages[lang] = {
        bytes,
        percentage: Math.round((bytes / totalBytes) * 1000) / 10,
      };
    }
  }

  options.onProgress?.("Fetching recent commit velocity...");
  const rawCommits: any[] | null = await fetchJson(`/repos/${owner}/${repo}/commits?per_page=30`);
  let recentCommitsCount = 0;
  let lastCommitDate = metadata.pushedAt;
  const authorsSet = new Set<string>();

  if (Array.isArray(rawCommits) && rawCommits.length > 0) {
    recentCommitsCount = rawCommits.length;
    lastCommitDate = rawCommits[0]?.commit?.committer?.date || lastCommitDate;
    for (const c of rawCommits) {
      const author = c.author?.login || c.commit?.author?.name;
      if (author) authorsSet.add(author);
    }
  }

  // Velocity score based on days since last commit
  const daysSinceLastCommit = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24))
  );
  let velocityScore = 100;
  if (daysSinceLastCommit > 180) velocityScore = 20;
  else if (daysSinceLastCommit > 90) velocityScore = 45;
  else if (daysSinceLastCommit > 30) velocityScore = 70;
  else if (daysSinceLastCommit > 7) velocityScore = 85;

  const commits: GitHubCommitSummary = {
    recentCommitsCount,
    lastCommitDate,
    activeAuthorsCount: authorsSet.size,
    velocityScore,
  };

  options.onProgress?.("Fetching pull request activity...");
  const rawPulls: any[] | null = await fetchJson(`/repos/${owner}/${repo}/pulls?state=all&per_page=30`);
  let openPRs = 0;
  let closedPRs = 0;
  let mergedPRs = 0;

  if (Array.isArray(rawPulls)) {
    for (const pr of rawPulls) {
      if (pr.state === "open") openPRs++;
      else {
        closedPRs++;
        if (pr.merged_at) mergedPRs++;
      }
    }
  }
  const totalPRs = openPRs + closedPRs;
  const mergeRate = totalPRs > 0 ? Math.round((mergedPRs / (closedPRs || 1)) * 100) : 100;

  const pullRequests: GitHubPRSummary = {
    openPRsCount: openPRs,
    closedPRsCount: closedPRs,
    mergeRatePercent: Math.min(100, mergeRate),
  };

  options.onProgress?.("Fetching package.json dependency manifest...");
  const rawPkgFile: any = await fetchJson(`/repos/${owner}/${repo}/contents/package.json`);
  const dependenciesList: GitHubDependencyItem[] = [];

  if (rawPkgFile && rawPkgFile.content) {
    try {
      const decodedJson = Buffer.from(rawPkgFile.content, "base64").toString("utf-8");
      const pkg = JSON.parse(decodedJson);

      if (pkg.dependencies && typeof pkg.dependencies === "object") {
        for (const [name, versionSpec] of Object.entries(pkg.dependencies)) {
          dependenciesList.push({
            name,
            versionSpec: String(versionSpec),
            category: "dependencies",
          });
        }
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === "object") {
        for (const [name, versionSpec] of Object.entries(pkg.devDependencies)) {
          dependenciesList.push({
            name,
            versionSpec: String(versionSpec),
            category: "devDependencies",
          });
        }
      }
    } catch {
      // invalid package.json in remote repo
    }
  }

  options.onProgress?.("Calculating GitHub Repository QA Health Score...");
  // 1. Maintenance Score (0-25)
  let maintenanceScore = 25;
  if (metadata.isArchived) maintenanceScore = 0;
  else if (daysSinceLastCommit > 180) maintenanceScore = 8;
  else if (daysSinceLastCommit > 90) maintenanceScore = 14;
  else if (daysSinceLastCommit > 30) maintenanceScore = 20;

  // 2. Issue Resolution Score (0-25)
  let issueResolutionScore = 25;
  if (metadata.openIssuesCount > 500) issueResolutionScore = 12;
  else if (metadata.openIssuesCount > 100) issueResolutionScore = 18;
  else if (metadata.openIssuesCount > 20) issueResolutionScore = 22;

  // 3. Documentation & Metadata Score (0-20)
  let docScore = 0;
  if (metadata.description && metadata.description !== "No description provided.") docScore += 5;
  if (metadata.license) docScore += 8;
  if (metadata.topics && metadata.topics.length > 0) docScore += 4;
  if (rawRepo.has_wiki || rawRepo.has_pages) docScore += 3;

  // 4. Dependency Freshness & Vulnerability Risk Score (0-30)
  let depScore = 30;
  if (dependenciesList.length > 50) depScore = 25;
  if (dependenciesList.length === 0) depScore = 22; // no manifest or non-JS project

  const totalScore = Math.min(100, Math.max(0, maintenanceScore + issueResolutionScore + docScore + depScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "A+";
  let color = "brightgreen";
  if (totalScore < 60) {
    grade = "D";
    color = "red";
  } else if (totalScore < 75) {
    grade = "C";
    color = "yellow";
  } else if (totalScore < 85) {
    grade = "B";
    color = "blue";
  } else if (totalScore < 95) {
    grade = "A";
    color = "green";
  }

  const badgeMarkdown = `[![BreakGuard QA Score](https://img.shields.io/badge/BreakGuard%20QA-${grade}%20(${totalScore}%2F100)-${color}?style=for-the-badge&logo=github)](${metadata.htmlUrl})`;

  const highlights: string[] = [];
  const warnings: string[] = [];

  if (metadata.stars > 100) highlights.push(`High community recognition with ${metadata.stars.toLocaleString()} stars.`);
  if (metadata.license) highlights.push(`Licensed under official ${metadata.license} license.`);
  if (commits.activeAuthorsCount > 3) highlights.push(`Healthy collaboration with ${commits.activeAuthorsCount} active recent contributors.`);
  if (daysSinceLastCommit <= 14) highlights.push(`Actively maintained: last commit was ${daysSinceLastCommit} days ago.`);

  if (metadata.isArchived) warnings.push("Repository is archived by the maintainers.");
  if (daysSinceLastCommit > 120) warnings.push(`Stale commit activity: No commits in the last ${daysSinceLastCommit} days.`);
  if (metadata.openIssuesCount > 200) warnings.push(`High backlog of ${metadata.openIssuesCount} open issues.`);
  if (!metadata.license) warnings.push("Missing open-source license file.");

  const qaScore: GitHubQAHealthScore = {
    totalScore,
    grade,
    maintenanceScore,
    issueResolutionScore,
    documentationScore: docScore,
    dependencyRiskScore: depScore,
    badgeMarkdown,
    highlights,
    warnings,
  };

  return {
    timestamp: new Date().toISOString(),
    repo: metadata,
    languages,
    commits,
    pullRequests,
    qaScore,
    dependencies: {
      totalDirectDependencies: dependenciesList.length,
      dependenciesList,
    },
  };
}
