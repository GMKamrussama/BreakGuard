import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { analyzeProject, analyzeGitHubRepo } from "@breakguard/core";
import {
  completeDeviceFlow,
  clearStoredAuth,
  GitHubAuthError,
  readStoredAuth,
  requestDeviceCode,
  openExternalUrl,
  type DeviceCodeResponse,
} from "./auth.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

interface ActiveDeviceFlow {
  device: DeviceCodeResponse;
  controller: AbortController;
  startedAt: number;
}

let activeDeviceFlow: ActiveDeviceFlow | null = null;
let lastDeviceFlowError: string | null = null;

function currentAuth() {
  return readStoredAuth();
}

async function beginDeviceFlow(): Promise<DeviceCodeResponse> {
  const existingSession = currentAuth();
  if (existingSession) {
    throw new GitHubAuthError("Already signed in to GitHub.");
  }
  if (activeDeviceFlow) return activeDeviceFlow.device;

  const device = await requestDeviceCode();
  const controller = new AbortController();
  lastDeviceFlowError = null;
  activeDeviceFlow = { device, controller, startedAt: Date.now() };

  completeDeviceFlow(device, { signal: controller.signal })
    .catch((error: any) => {
      if (!controller.signal.aborted) {
        lastDeviceFlowError = error?.message || "GitHub login failed.";
      }
    })
    .finally(() => {
      if (activeDeviceFlow?.device.device_code === device.device_code) {
        activeDeviceFlow = null;
      }
    });

  return device;
}

function cancelDeviceFlow(): void {
  activeDeviceFlow?.controller.abort();
  activeDeviceFlow = null;
  lastDeviceFlowError = null;
}

function requireAuthentication(res: http.ServerResponse): boolean {
  if (currentAuth()) return true;
  res.writeHead(401, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ error: "GitHub login required. Use the Login with GitHub button first." }));
  return false;
}

export function startGuiServer(port = 4567, autoOpen = true) {
  // Find desktop dist if available locally
  const possibleDistPaths = [
    path.resolve(process.cwd(), "apps/desktop/dist"),
    path.resolve(currentDirectory, "../../desktop/dist"),
    path.resolve(currentDirectory, "../../../apps/desktop/dist"),
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
    // This server is deliberately local-only: it serves the browser UI and
    // keeps the OAuth token out of the frontend. Allow only our local UI
    // origins when the Tauri dev shell sends a cross-origin request.
    const origin = req.headers.origin;
    if (
      origin === "http://localhost:1420" ||
      origin === "http://127.0.0.1:1420" ||
      origin === "http://localhost:5173" ||
      origin === "http://127.0.0.1:5173" ||
      origin === "http://tauri.localhost" ||
      origin === "tauri://localhost"
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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
      res.end(JSON.stringify({ status: "ok", version: "1.2.0", auth: "github-device-flow" }));
      return;
    }

    // API: Auth status. The access token never leaves this local server.
    if (url.pathname === "/api/auth/status" && req.method === "GET") {
      const session = currentAuth();
      const flow = activeDeviceFlow
        ? {
            active: true,
            expiresAt: activeDeviceFlow.startedAt + activeDeviceFlow.device.expires_in * 1000,
          }
        : null;
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ authenticated: !!session, user: session?.user || null, deviceFlow: flow, error: lastDeviceFlowError }));
      return;
    }

    // API: Logout
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      cancelDeviceFlow();
      clearStoredAuth();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Device Flow: request a code and begin server-side polling.
    if (url.pathname === "/api/auth/device" && req.method === "POST") {
      try {
        const device = await beginDeviceFlow();
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(
          JSON.stringify({
            user_code: device.user_code,
            verification_uri: device.verification_uri,
            verification_uri_complete: device.verification_uri_complete,
            expires_in: device.expires_in,
            interval: device.interval || 5,
          })
        );
      } catch (err: any) {
        const status = err instanceof GitHubAuthError && err.message === "Already signed in to GitHub." ? 409 : 502;
        res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ error: err?.message || "Device flow failed" }));
      }
      return;
    }

    if (url.pathname === "/api/auth/device" && req.method === "DELETE") {
      cancelDeviceFlow();
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // API: Discovered & Recent Workspaces
    if (url.pathname === "/api/projects") {
      if (!requireAuthentication(res)) return;
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
      if (!requireAuthentication(res)) return;
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
      if (!requireAuthentication(res)) return;
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
          // Use the persisted OAuth token if available. A caller-supplied token
          // remains supported for CI/manual use, but is never stored by us.
          const token = currentAuth()?.accessToken || parsed.token || undefined;
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

    // Bind only to loopback. This server handles a GitHub bearer token.
    server.listen(port, "127.0.0.1", () => {
    console.log(chalk.bold.cyan("\n======================================================="));
    console.log(chalk.bold.white("  BreakGuard 🛡️ — Polished Desktop GUI Dashboard"));
    console.log(chalk.gray("  Zero-Configuration Standalone Desktop Application"));
    console.log(chalk.bold.cyan("=======================================================\n"));

    console.log(chalk.green(`✔ Desktop GUI server active at: `) + chalk.underline.cyan(`http://127.0.0.1:${port}`));
    console.log(chalk.yellow("✔ Opening polished graphical interface in your browser...\n"));
    console.log(chalk.gray("  (Keep this console window open while using BreakGuard."));
    console.log(chalk.gray("   Press Ctrl+C anytime to exit)\n"));

    if (autoOpen) {
      const openUrl = `http://127.0.0.1:${port}`;
      openExternalUrl(openUrl);
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #030712; color: #f3f4f6; }
    pre, code { font-family: 'JetBrains Mono', monospace; }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    .glass-card {
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-blue-500/30 selection:text-blue-200">
  <!-- Top Header Navbar -->
  <header class="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl shadow-lg shadow-blue-500/10">
        🛡️
      </div>
      <div>
        <h1 class="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-tight">
          BreakGuard
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">v1.2.0</span>
        </h1>
        <p class="text-xs text-slate-400">AST Codebase & GitHub QA Analyzer</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Engine Online
      </span>
      <!-- Auth Status Header Widget -->
      <div id="authWidget" class="flex items-center gap-2"></div>
    </div>
  </header>

  <!-- Initial Sign In Gate Modal -->
  <div id="authGate" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
    <div class="w-full max-w-lg rounded-2xl bg-slate-900/95 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] p-7 space-y-5">
      <div class="flex items-center gap-3 text-blue-300 font-bold text-base">
        <div class="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
          🔒
        </div>
        <div>
          <div class="text-slate-100 font-bold">Sign in with GitHub to continue</div>
          <div class="text-xs text-slate-400 font-normal">Activate authenticated API access & profile badge</div>
        </div>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
        BreakGuard uses secure GitHub <strong>Device Flow</strong>. We will show you a one-time authorization code, open GitHub in your browser, and wait until you approve BreakGuard. No password or personal secret is ever entered into BreakGuard.
      </p>
      <div class="flex items-center justify-end gap-3 pt-2">
        <button onclick="startDeviceLogin()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer">
          <span>Login with GitHub</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Breathtaking Central Device Code Modal -->
  <div id="deviceCodeModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
    <div class="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-blue-500/40 shadow-[0_0_60px_rgba(59,130,246,0.2)] p-6 space-y-5 relative">
      <button onclick="cancelDeviceLogin()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer text-sm" title="Cancel login">
        ✕
      </button>
      
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg shadow-inner">
          🔑
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-100">Authorize GitHub Device</h3>
          <p class="text-xs text-slate-400 mt-0.5">Enter code on GitHub to link BreakGuard</p>
        </div>
      </div>

      <!-- High-visibility glowing Code Display Box -->
      <div class="rounded-xl bg-slate-950 border border-slate-800 p-4 text-center space-y-2 relative group hover:border-emerald-500/40 transition">
        <div class="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold">
          One-Time Device Code
        </div>
        <div id="deviceCodeDisplay" onclick="copyActiveDeviceCode(this)" title="Click to copy code"
          class="text-3xl sm:text-4xl font-extrabold font-mono tracking-[0.25em] text-emerald-300 select-all cursor-pointer py-1 transition group-hover:scale-105">
          ----
        </div>
        <div class="text-[11px] text-slate-500">
          Click the code or use the copy button below
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-2.5">
        <button id="copyCodeBtn" onclick="copyActiveDeviceCode(this)"
          class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer shadow-sm">
          <span>📋</span>
          <span id="copyBtnText">Copy Code</span>
        </button>

        <a id="openGitHubBtn" href="https://github.com/login/device" target="_blank" rel="noopener noreferrer"
          class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-blue-500/25 cursor-pointer">
          <span>Open GitHub</span>
          <span>↗</span>
        </a>
      </div>

      <!-- Live Waiting Spinner -->
      <div class="flex items-center justify-center gap-2.5 pt-1 text-xs text-slate-400">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
        <span>Waiting for you to authorize on GitHub...</span>
      </div>
    </div>
  </div>

  <!-- Main Content Layout -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
    <!-- Top Action Cards (The 2 primary interactive modules) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- 1. Remote GitHub QA Card -->
      <div class="glass-card p-6 rounded-2xl hover:border-blue-500/50 transition-all duration-300 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl">
              🌐
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-100 tracking-tight">GitHub Repository QA Audit</h2>
              <p class="text-xs text-slate-400">Audit remote repo & generate Developer Program badge</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            REST API
          </span>
        </div>

        <div class="space-y-2">
          <div class="flex gap-2">
            <input id="githubRepoInput" type="text" placeholder="e.g. facebook/react or owner/repo" value="facebook/react"
              class="flex-1 rounded-xl bg-black/60 border border-slate-700/80 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition">
            <button onclick="runGitHubAudit()" id="githubAuditBtn"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer shrink-0">
              Audit Repo
            </button>
          </div>
          
          <!-- Preset quick-pick suggestions -->
          <div class="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Quick:</span>
            <button type="button" onclick="setRepoInput('facebook/react')" class="hover:text-blue-400 transition font-mono underline decoration-slate-700">facebook/react</button>
            <span>•</span>
            <button type="button" onclick="setRepoInput('expressjs/express')" class="hover:text-blue-400 transition font-mono underline decoration-slate-700">express</button>
            <span>•</span>
            <button type="button" onclick="setRepoInput('vitejs/vite')" class="hover:text-blue-400 transition font-mono underline decoration-slate-700">vite</button>
          </div>
        </div>
      </div>

      <!-- 2. Local Codebase Scanner Card -->
      <div class="glass-card p-6 rounded-2xl hover:border-emerald-500/50 transition-all duration-300 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/10 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">
              📁
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-100 tracking-tight">Local Codebase AST Scanner</h2>
              <p class="text-xs text-slate-400">Scan lockfile, AST call sites & breaking risk score</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SWC AST
          </span>
        </div>

        <div class="space-y-2">
          <div class="flex gap-2">
            <input id="localPathInput" type="text" placeholder="Directory path (default: .)" value="."
              class="flex-1 rounded-xl bg-black/60 border border-slate-700/80 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition">
            <button onclick="runLocalScan()" id="localScanBtn"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0">
              Scan Local
            </button>
          </div>

          <!-- Preset quick-pick suggestions -->
          <div class="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Target:</span>
            <button type="button" onclick="setLocalPath('.')" class="hover:text-emerald-400 transition font-mono underline decoration-slate-700">. (Current Workspace)</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Results Container -->
    <div id="resultsContainer" class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-2xl space-y-6">
      <div class="text-center py-12 text-slate-500 space-y-3" id="placeholderView">
        <div class="text-4xl animate-bounce">⚡</div>
        <h3 class="text-base font-semibold text-slate-300">Ready to Analyze</h3>
        <p class="text-xs max-w-md mx-auto text-slate-400 leading-relaxed">
          Enter a remote GitHub repository or click "Scan Local" to generate AST breaking changes, security vulnerabilities, and official QA score reports.
        </p>
      </div>

      <div id="activeReportView" class="hidden space-y-6"></div>
    </div>
  </main>

  <script>
    // ── Global Auth State ───────────────────────────────────────────────────
    let currentActiveCode = '';
    let devicePollTimer = null;

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
      });
    }

    function setRepoInput(val) {
      document.getElementById('githubRepoInput').value = val;
    }

    function setLocalPath(val) {
      document.getElementById('localPathInput').value = val;
    }

    // ── Guaranteed Multi-Fallback Clipboard Copy ────────────────────────────
    function copyTextToClipboard(text, triggerBtn) {
      if (!text) return;
      let success = false;

      const triggerEl = triggerBtn || document.getElementById('copyCodeBtn');

      function showFeedback() {
        if (!triggerEl) return;
        const originalHtml = triggerEl.innerHTML;
        triggerEl.innerHTML = '<span class="text-emerald-300 font-bold">✓ Copied!</span>';
        triggerEl.classList.add('border-emerald-500', 'bg-emerald-950/40');
        setTimeout(() => {
          triggerEl.innerHTML = originalHtml;
          triggerEl.classList.remove('border-emerald-500', 'bg-emerald-950/40');
        }, 2200);
      }

      // 1. Try Modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          showFeedback();
        }).catch(() => {
          execCopyFallback(text, showFeedback);
        });
        return;
      }

      // 2. Try Fallback execCommand
      execCopyFallback(text, showFeedback);
    }

    function execCopyFallback(text, onSuccess) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          if (onSuccess) onSuccess();
        } else {
          prompt('Copy code manually:', text);
        }
      } catch (e) {
        prompt('Copy code manually:', text);
      }
    }

    function copyActiveDeviceCode(el) {
      copyTextToClipboard(currentActiveCode, el);
    }

    // ── Auth Status & Flow Management ───────────────────────────────────────
    async function loadAuthStatus() {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        const data = await res.json();
        const widget = document.getElementById('authWidget');
        const gate = document.getElementById('authGate');
        const modal = document.getElementById('deviceCodeModal');

        if (data.authenticated && data.user) {
          if (gate) gate.classList.add('hidden');
          if (modal) modal.classList.add('hidden');
          clearInterval(devicePollTimer);
          currentActiveCode = '';

          if (widget) {
            widget.innerHTML = '<div class="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">' +
              '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' +
              '<span class="text-xs font-semibold text-slate-200">' + escapeHtml(data.user.login) + '</span>' +
              '<button onclick="logout()" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-400 border border-slate-700 transition cursor-pointer">Sign out</button>' +
              '</div>';
          }
        } else {
          if (currentActiveCode) {
            // Keep deviceCodeModal visible if code is active
            if (widget) {
              widget.innerHTML = '<button onclick="reopenDeviceModal()" class="px-3 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 transition flex items-center gap-1.5 cursor-pointer">' +
                '<span>🔑 Code: ' + escapeHtml(currentActiveCode) + '</span>' +
                '</button>';
            }
          } else {
            if (widget) {
              widget.innerHTML = '<button onclick="startDeviceLogin()" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white transition shadow-sm cursor-pointer" title="Login with GitHub">' +
                'Login with GitHub</button>';
            }
          }
        }
      } catch {}
    }

    async function startDeviceLogin() {
      const gate = document.getElementById('authGate');
      if (gate) gate.classList.add('hidden');

      const widget = document.getElementById('authWidget');
      if (widget) widget.innerHTML = '<span class="text-xs text-slate-400 animate-pulse">Requesting GitHub code...</span>';

      try {
        const res = await fetch('/api/auth/device', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'GitHub login could not start');

        currentActiveCode = String(data.user_code || '');
        const verificationUri = String(data.verification_uri || 'https://github.com/login/device');
        const safeUri = verificationUri.indexOf('https://github.com/') === 0 ? verificationUri : 'https://github.com/login/device';

        // Update Modal elements
        const codeDisplay = document.getElementById('deviceCodeDisplay');
        if (codeDisplay) codeDisplay.innerText = currentActiveCode;

        const openBtn = document.getElementById('openGitHubBtn');
        if (openBtn) openBtn.href = safeUri;

        // Show centered Device Code Modal
        const modal = document.getElementById('deviceCodeModal');
        if (modal) modal.classList.remove('hidden');

        // Automatically open GitHub in new tab
        try {
          window.open(safeUri, '_blank', 'noopener,noreferrer');
        } catch (_) {}

        loadAuthStatus();

        // Start background polling
        clearInterval(devicePollTimer);
        devicePollTimer = setInterval(async function () {
          try {
            const statusRes = await fetch('/api/auth/status', { cache: 'no-store' });
            const status = await statusRes.json();
            if (status.authenticated) {
              clearInterval(devicePollTimer);
              currentActiveCode = '';
              loadAuthStatus();
            } else if (status.error) {
              clearInterval(devicePollTimer);
              currentActiveCode = '';
              loadAuthStatus();
            }
          } catch (_) {}
        }, 3000);

      } catch (err) {
        currentActiveCode = '';
        if (widget) widget.innerHTML = '<span class="text-xs text-red-400">❌ ' + escapeHtml(err && err.message ? err.message : 'Login failed') + '</span>';
        setTimeout(loadAuthStatus, 3000);
      }
    }

    function reopenDeviceModal() {
      const modal = document.getElementById('deviceCodeModal');
      if (modal) modal.classList.remove('hidden');
    }

    async function cancelDeviceLogin() {
      clearInterval(devicePollTimer);
      currentActiveCode = '';
      const modal = document.getElementById('deviceCodeModal');
      if (modal) modal.classList.add('hidden');
      await fetch('/api/auth/device', { method: 'DELETE' }).catch(function () {});
      loadAuthStatus();
    }

    async function logout() {
      clearInterval(devicePollTimer);
      currentActiveCode = '';
      await fetch('/api/auth/logout', { method: 'POST' });
      loadAuthStatus();
    }

    loadAuthStatus();

    // ── GitHub Audit Report ─────────────────────────────────────────────────
    async function runGitHubAudit() {
      const repoUrl = document.getElementById("githubRepoInput").value.trim();
      if (!repoUrl) return;
      const btn = document.getElementById("githubAuditBtn");
      btn.disabled = true;
      btn.innerHTML = '<span class="animate-pulse">Analyzing...</span>';

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
      btn.innerHTML = '<span class="animate-pulse">Scanning AST...</span>';

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
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-100">\${escapeHtml(repo.fullName)}</h3>
              <a href="\${escapeHtml(repo.htmlUrl)}" target="_blank" class="text-blue-400 hover:underline text-xs flex items-center gap-1">
                <span>View on GitHub</span> <span>↗</span>
              </a>
            </div>
            <p class="text-xs text-slate-400 mt-1">\${escapeHtml(repo.description || 'No description provided')}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-xs text-slate-400 block">QA Health Score</span>
              <span class="text-xl font-extrabold text-emerald-400">\${qaScore.totalScore}/100 [Grade: \${qaScore.grade}]</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Community Stars</span>
            <span class="text-sm font-bold text-yellow-400 mt-1 block">⭐ \${repo.stars.toLocaleString()}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">PR Merge Rate</span>
            <span class="text-sm font-bold text-blue-400 mt-1 block">\${pullRequests.mergeRatePercent}%</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Direct Packages</span>
            <span class="text-sm font-bold text-emerald-400 mt-1 block">\${dependencies.totalDirectDependencies} Packages</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Last Commit</span>
            <span class="text-sm font-bold text-purple-400 mt-1 block">\${commits.lastCommitDate ? commits.lastCommitDate.slice(0, 10) : 'Recent'}</span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-200">Official GitHub README Badge Markdown:</span>
            <button onclick="copyTextToClipboard(this.getAttribute('data-badge'), this)" data-badge="\${escapeHtml(qaScore.badgeMarkdown)}"
              class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition flex items-center gap-1 cursor-pointer">
              <span>📋</span> <span>Copy Badge Markdown</span>
            </button>
          </div>
          <code class="block p-3.5 rounded-xl bg-black/90 border border-slate-800 font-mono text-xs text-emerald-400 select-all break-all shadow-inner">
            \${escapeHtml(qaScore.badgeMarkdown)}
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
        <div class="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
          <div>
            <h3 class="text-base font-bold text-slate-100">\${escapeHtml(projectMetadata.name)} v\${escapeHtml(projectMetadata.version)}</h3>
            <p class="text-xs text-slate-400 font-mono mt-0.5">Path: \${escapeHtml(projectMetadata.path || '.')}</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Breaking Risk Score</span>
            <span class="text-xl font-extrabold text-emerald-400">\${summary.averageRiskScore}/100 (SAFE)</span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Total Packages</span>
            <span class="text-sm font-bold text-slate-100 mt-1 block">\${summary.totalDependencies}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Direct Dependencies</span>
            <span class="text-sm font-bold text-blue-400 mt-1 block">\${summary.directCount}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Scanned Code Files</span>
            <span class="text-sm font-bold text-emerald-400 mt-1 block">\${summary.scannedFiles}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[10px] text-slate-400 block font-medium">Ghost Dependencies</span>
            <span class="text-sm font-bold text-purple-400 mt-1 block">\${summary.ghostDependenciesCount}</span>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <h4 class="text-xs font-bold text-slate-300">Dependencies & Migration Risk:</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            \${depEntries.slice(0, 14).map(([name, node]) => \`
              <div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-200">\${escapeHtml(name)}</span>
                  <span class="text-[10px] font-mono text-slate-400 block mt-0.5">v\${escapeHtml(node.version)} \${node.latestVersion ? '➔ v' + escapeHtml(node.latestVersion) : ''}</span>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
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
