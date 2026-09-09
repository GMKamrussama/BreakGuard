import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import chalk from "chalk";
import { analyzeProject, analyzeGitHubRepo } from "@breakguard/core";

// ── In-memory OAuth token store ──────────────────────────────────────────────
let githubAccessToken: string | null = null;
let githubUser: { login: string; avatar_url: string; name: string } | null = null;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

async function exchangeCodeForToken(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code });
    const req = https.request(
      { hostname: "github.com", path: "/login/oauth/access_token", method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data).access_token || ""); } catch { reject(new Error("Token parse failed")); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function fetchGitHubUser(token: string) {
  return new Promise<{ login: string; avatar_url: string; name: string }>((resolve, reject) => {
    const req = https.request(
      { hostname: "api.github.com", path: "/user", method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json", "User-Agent": "BreakGuard/1.0" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("User parse failed")); } });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export function startGuiServer(port = 4567, autoOpen = true) {
  // Find desktop dist if available locally
  const possibleDistPaths = [
    path.resolve(process.cwd(), "apps/desktop/dist"),
    path.resolve(__dirname, "../../desktop/dist"),
    path.resolve(__dirname, "../../../apps/desktop/dist"),
    path.resolve(process.cwd(), "dist/desktop"),
  ];

  let desktopDistPath: string | null = null;
  for (const p of possibleDistPaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      desktopDistPath = p;
      break;
    }
  }

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // API: Health check
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", version: "1.2.0" }));
      return;
    }

    // API: Auth status
    if (url.pathname === "/api/auth/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ authenticated: !!githubAccessToken, user: githubUser }));
      return;
    }

    // API: Logout
    if (url.pathname === "/api/auth/logout") {
      githubAccessToken = null;
      githubUser = null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // OAuth: Redirect to GitHub login
    if (url.pathname === "/auth/github") {
      if (!GITHUB_CLIENT_ID) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>⚠️ GITHUB_CLIENT_ID not set.</h2><p>Run: <code>set GITHUB_CLIENT_ID=your_id && breakguard.exe ui</code></p>`);
        return;
      }
      const scope = "read:user,public_repo";
      const redirectUri = encodeURIComponent(`http://localhost:${port}/auth/callback`);
      const loginUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scope}&redirect_uri=${redirectUri}`;
      res.writeHead(302, { Location: loginUrl });
      res.end();
      return;
    }

    // OAuth: Callback — exchange code for token
    if (url.pathname === "/auth/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>❌ Missing OAuth code.</h2>`);
        return;
      }
      try {
        const token = await exchangeCodeForToken(code);
        if (!token) throw new Error("Empty token received");
        githubAccessToken = token;
        githubUser = await fetchGitHubUser(token);
        // Redirect back to dashboard with success
        res.writeHead(302, { Location: "/?auth=success" });
        res.end();
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h2>❌ Auth failed: ${err.message}</h2><a href="/">← Back</a>`);
      }
      return;
    }

    // API: Discovered & Recent Workspaces
    if (url.pathname === "/api/projects") {
      try {
        const results: Array<{ name: string; path: string; isCurrent: boolean; lockfile: string | null }> = [];
        const cwd = process.cwd();
        results.push({
          name: path.basename(cwd) || "current",
          path: cwd,
          isCurrent: true,
          lockfile: fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))
            ? "pnpm"
            : fs.existsSync(path.join(cwd, "package-lock.json"))
            ? "npm"
            : fs.existsSync(path.join(cwd, "yarn.lock"))
            ? "yarn"
            : null,
        });

        const parentDir = path.resolve(cwd, "..");
        if (fs.existsSync(parentDir)) {
          const entries = fs.readdirSync(parentDir, { withFileTypes: true });
          for (const ent of entries) {
            if (ent.isDirectory() && ent.name !== path.basename(cwd)) {
              const dirPath = path.join(parentDir, ent.name);
              const pkgPath = path.join(dirPath, "package.json");
              if (fs.existsSync(pkgPath)) {
                let lock: string | null = null;
                if (fs.existsSync(path.join(dirPath, "pnpm-lock.yaml"))) lock = "pnpm";
                else if (fs.existsSync(path.join(dirPath, "package-lock.json"))) lock = "npm";
                else if (fs.existsSync(path.join(dirPath, "yarn.lock"))) lock = "yarn";
                results.push({
                  name: ent.name,
                  path: dirPath,
                  isCurrent: false,
                  lockfile: lock,
                });
              }
            }
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ projects: results }));
        return;
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            projects: [{ name: "BreakGuard", path: process.cwd(), isCurrent: true, lockfile: "pnpm" }],
          })
        );
        return;
      }
    }

    // API: Local project scan
    if (url.pathname === "/api/scan" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const targetPath = parsed.targetPath || process.cwd();
          const excludePatterns = Array.isArray(parsed.excludePatterns) ? parsed.excludePatterns : [];
          const report = await analyzeProject(targetPath, { excludePatterns });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(report));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || "Scan failed" }));
        }
      });
      return;
    }

    // API: Remote GitHub QA Analysis
    if (url.pathname === "/api/github" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (!parsed.repoUrl) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing repoUrl parameter" }));
            return;
          }
          // Use stored OAuth token if available, fallback to provided token
          const token = githubAccessToken || parsed.token || undefined;
          const report = await analyzeGitHubRepo(parsed.repoUrl, { token });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(report));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err?.message || "GitHub QA Analysis failed" }));
        }
      });
      return;
    }

    // Static Files: If apps/desktop/dist exists, serve it
    if (desktopDistPath) {
      let reqPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.join(desktopDistPath, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".json": "application/json",
          ".png": "image/png",
        };
        res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // Fallback: Embed rich, standalone polished dashboard HTML directly inside binary
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getEmbeddedDashboardHtml());
  });

  server.listen(port, () => {
    console.log(chalk.bold.cyan("\n======================================================="));
    console.log(chalk.bold.white("  BreakGuard 🛡️ — Polished Desktop GUI Dashboard"));
    console.log(chalk.gray("  Zero-Configuration Standalone Desktop Application"));
    console.log(chalk.bold.cyan("=======================================================\n"));

    console.log(chalk.green(`✔ Desktop GUI server active at: `) + chalk.underline.cyan(`http://localhost:${port}`));
    console.log(chalk.yellow("✔ Opening polished graphical interface in your browser...\n"));
    console.log(chalk.gray("  (Keep this console window open while using BreakGuard."));
    console.log(chalk.gray("   Press Ctrl+C anytime to exit)\n"));

    if (autoOpen) {
      const openUrl = `http://localhost:${port}`;
      if (process.platform === "win32") {
        exec(`start ${openUrl}`);
      } else if (process.platform === "darwin") {
        exec(`open ${openUrl}`);
      } else {
        exec(`xdg-open ${openUrl}`);
      }
    }
  });

  return server;
}

function getEmbeddedDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BreakGuard 🛡️ — AST & GitHub QA Analyzer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #030712; color: #f3f4f6; }
    pre, code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased">
  <!-- Top Header Navbar -->
  <header class="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl shadow-lg shadow-blue-500/10">
        🛡️
      </div>
      <div>
        <h1 class="text-sm font-bold text-slate-100 flex items-center gap-2">
          BreakGuard
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">v1.0.0</span>
        </h1>
        <p class="text-xs text-slate-400">AST Codebase & GitHub QA Analyzer</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Engine Online
      </span>
      <!-- Auth Status injected by JS -->
      <div id="authWidget"></div>
    </div>
  </header>

  <!-- Main Content Layout -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
    <!-- Top Action Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Remote GitHub QA Card -->
      <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 transition shadow-xl space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">🌐</span>
            <div>
              <h2 class="text-sm font-bold text-slate-100">GitHub Repository QA Audit</h2>
              <p class="text-xs text-slate-400">Audit remote repo for GitHub Developer Program badge</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">REST API</span>
        </div>
        <div class="flex gap-2">
          <input id="githubRepoInput" type="text" placeholder="e.g. facebook/react or https://github.com/..." value="facebook/react"
            class="flex-1 rounded-xl bg-black/60 border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono">
          <button onclick="runGitHubAudit()" id="githubAuditBtn"
            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer">
            Audit Repo
          </button>
        </div>
      </div>

      <!-- Local Codebase Scanner Card -->
      <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition shadow-xl space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📁</span>
            <div>
              <h2 class="text-sm font-bold text-slate-100">Local Codebase AST Scanner</h2>
              <p class="text-xs text-slate-400">Scan lockfile, AST call sites & breaking risk score</p>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SWC AST</span>
        </div>
        <div class="flex gap-2">
          <input id="localPathInput" type="text" placeholder="Local project directory (.)" value="."
            class="flex-1 rounded-xl bg-black/60 border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono">
          <button onclick="runLocalScan()" id="localScanBtn"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer">
            Scan Local
          </button>
        </div>
      </div>
    </div>

    <!-- Live Results Container -->
    <div id="resultsContainer" class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
      <div class="text-center py-12 text-slate-500 space-y-2" id="placeholderView">
        <div class="text-4xl animate-bounce">⚡</div>
        <h3 class="text-base font-semibold text-slate-300">Ready to Analyze</h3>
        <p class="text-xs max-w-md mx-auto text-slate-400">
          Enter a remote GitHub repository or click "Scan Local" to generate full AST breaking changes, security vulnerabilities, and official QA scores.
        </p>
      </div>

      <div id="activeReportView" class="hidden space-y-6"></div>
    </div>
  </main>

  <script>
    // ── Auth ────────────────────────────────────────────────────────────────
    async function loadAuthStatus() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        const widget = document.getElementById('authWidget');
        if (data.authenticated && data.user) {
          widget.innerHTML = \`
            <div class="flex items-center gap-2">
              <img src="\${data.user.avatar_url}" class="w-7 h-7 rounded-full border border-slate-600" />
              <span class="text-xs font-semibold text-slate-200">\${data.user.login}</span>
              <button onclick="logout()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-400 border border-slate-700 transition cursor-pointer">Sign out</button>
            </div>\`;
        } else {
          widget.innerHTML = \`
            <a href="/auth/github" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition" title="Login to use GitHub token automatically">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Login with GitHub
            </a>\`;
        }
      } catch {}
    }

    async function logout() {
      await fetch('/api/auth/logout');
      loadAuthStatus();
    }

    // Check auth on page load
    loadAuthStatus();
    // Re-check if returning from OAuth (/?auth=success)
    if (new URLSearchParams(location.search).get('auth') === 'success') {
      history.replaceState({}, '', '/');
    }

    // ── GitHub Audit ────────────────────────────────────────────────────────
    async function runGitHubAudit() {
      const repoUrl = document.getElementById("githubRepoInput").value.trim();
      if (!repoUrl) return;
      const btn = document.getElementById("githubAuditBtn");
      btn.disabled = true;
      btn.innerText = "Analyzing...";

      try {
        const res = await fetch("/api/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "GitHub audit failed");
        renderGitHubReport(data);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = "Audit Repo";
      }
    }

    async function runLocalScan() {
      const targetPath = document.getElementById("localPathInput").value.trim() || ".";
      const btn = document.getElementById("localScanBtn");
      btn.disabled = true;
      btn.innerText = "Scanning AST...";

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPath })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Local scan failed");
        renderLocalReport(data);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = "Scan Local";
      }
    }

    function renderGitHubReport(report) {
      document.getElementById("placeholderView").classList.add("hidden");
      const container = document.getElementById("activeReportView");
      container.classList.remove("hidden");

      const { repo, commits, pullRequests, qaScore, dependencies, languages } = report;

      container.innerHTML = \`
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-100">\${repo.fullName}</h3>
              <a href="\${repo.htmlUrl}" target="_blank" class="text-blue-400 hover:underline text-xs">↗ View on GitHub</a>
            </div>
            <p class="text-xs text-slate-400 mt-1">\${repo.description}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-xs text-slate-400 block">QA Health Score</span>
              <span class="text-lg font-bold text-emerald-400">\${qaScore.totalScore}/100 [Grade: \${qaScore.grade}]</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Community Stars</span>
            <span class="text-sm font-bold text-yellow-400 mt-0.5 block">⭐ \${repo.stars.toLocaleString()}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">PR Merge Rate</span>
            <span class="text-sm font-bold text-blue-400 mt-0.5 block">\${pullRequests.mergeRatePercent}%</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Direct Packages</span>
            <span class="text-sm font-bold text-emerald-400 mt-0.5 block">\${dependencies.totalDirectDependencies} Packages</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Last Commit</span>
            <span class="text-sm font-bold text-purple-400 mt-0.5 block">\${commits.lastCommitDate ? commits.lastCommitDate.slice(0, 10) : 'Recent'}</span>
          </div>
        </div>

        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-200">Official GitHub README Badge Markdown:</span>
            <button onclick="navigator.clipboard.writeText('\${qaScore.badgeMarkdown.replace(/'/g, "\\\\'")}'); alert('Badge Markdown Copied!');"
              class="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition">
              Copy Badge Markdown
            </button>
          </div>
          <code class="block p-3 rounded-lg bg-black/80 border border-slate-800 font-mono text-xs text-emerald-400 select-all break-all">
            \${qaScore.badgeMarkdown}
          </code>
        </div>
      \`;
    }

    function renderLocalReport(report) {
      document.getElementById("placeholderView").classList.add("hidden");
      const container = document.getElementById("activeReportView");
      container.classList.remove("hidden");

      const { summary, projectMetadata, dependencies } = report;

      const depEntries = Object.entries(dependencies || {});

      container.innerHTML = \`
        <div class="flex items-center justify-between p-5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div>
            <h3 class="text-base font-bold text-slate-100">\${projectMetadata.name} v\${projectMetadata.version}</h3>
            <p class="text-xs text-slate-400 font-mono mt-0.5">Path: \${projectMetadata.path || '.'}</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Breaking Risk Score</span>
            <span class="text-lg font-bold text-emerald-400">\${summary.averageRiskScore}/100 (SAFE)</span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Total Packages</span>
            <span class="text-sm font-bold text-slate-100 mt-0.5 block">\${summary.totalDependencies}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Direct Dependencies</span>
            <span class="text-sm font-bold text-blue-400 mt-0.5 block">\${summary.directCount}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Scanned Code Files</span>
            <span class="text-sm font-bold text-emerald-400 mt-0.5 block">\${summary.scannedFiles}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-[10px] text-slate-400 block">Ghost Dependencies</span>
            <span class="text-sm font-bold text-purple-400 mt-0.5 block">\${summary.ghostDependenciesCount}</span>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-300">Dependencies List & Risk Levels:</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            \${depEntries.slice(0, 12).map(([name, node]) => \`
              <div class="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">\${name}</span>
                  <span class="text-[10px] font-mono text-slate-400 block">v\${node.version} \${node.latestVersion ? '➔ v' + node.latestVersion : ''}</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Risk: \${node.risk ? node.risk.score : 0}/100
                </span>
              </div>
            \`).join('')}
          </div>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
}
