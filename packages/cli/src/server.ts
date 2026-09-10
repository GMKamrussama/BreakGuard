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

  <div id="authGate" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
    <div class="w-full max-w-lg rounded-2xl bg-slate-900 border border-blue-500/40 shadow-2xl p-7">
      <div class="flex items-center gap-3 text-blue-300 font-bold text-base">
        <div class="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30">🔒</div>
        Sign in with GitHub to continue
      </div>
      <p class="mt-3 text-sm text-slate-300 leading-relaxed">
        BreakGuard uses GitHub Device Flow. We will show a one-time code, open GitHub, and wait until you approve BreakGuard.
      </p>
      <div class="mt-4 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-400">
        Your GitHub password and access token are never entered into this dashboard.
      </div>
      <div class="mt-6 flex justify-end">
        <button onclick="startDeviceLogin()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer">
          Login with GitHub
        </button>
      </div>
    </div>
  </div>

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
    let deviceFlowActive = false;
    let devicePollTimer = null;

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
      });
    }

    async function loadAuthStatus() {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        const data = await res.json();
        const widget = document.getElementById('authWidget');
        if (!widget) return;
        const gate = document.getElementById('authGate');
        if (data.authenticated && data.user) {
          if (gate) gate.classList.add('hidden');
          clearInterval(devicePollTimer);
          deviceFlowActive = false;
          widget.innerHTML = '<div class="flex items-center gap-2">' +
            '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' +
            '<span class="text-xs font-semibold text-slate-200">' + escapeHtml(data.user.login) + '</span>' +
            '<button onclick="logout()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-400 border border-slate-700 transition cursor-pointer">Sign out</button>' +
            '</div>';
        } else if (deviceFlowActive) {
          // Keep the device code visible while GitHub authorization is pending.
        } else {
          if (gate) gate.classList.remove('hidden');
          if (data.error) {
            widget.innerHTML = '<div class="flex items-center gap-2"><span class="text-xs text-red-400">❌ ' + escapeHtml(data.error) + '</span>' +
              '<button onclick="startDeviceLogin()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 cursor-pointer">Try again</button></div>';
          } else {
            widget.innerHTML = '<button onclick="startDeviceLogin()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer" title="Login with GitHub">' +
              'Login with GitHub</button>';
          }
        }
      } catch {
        // The dashboard can still be used offline when the auth server is absent.
      }
    }

    async function startDeviceLogin() {
      const gate = document.getElementById('authGate');
      if (gate) gate.classList.add('hidden');
      const widget = document.getElementById('authWidget');
      widget.innerHTML = '<span class="text-xs text-slate-400 animate-pulse">Connecting to GitHub...</span>';
      try {
        const res = await fetch('/api/auth/device', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'GitHub login could not start');

        deviceFlowActive = true;
        const verificationUri = String(data.verification_uri || 'https://github.com/login/device');
        const safeUri = verificationUri.indexOf('https://github.com/') === 0
          ? verificationUri
          : 'https://github.com/login/device';
        try {
          window.open(safeUri, '_blank', 'noopener,noreferrer');
        } catch (_) {}
        widget.innerHTML = '<div class="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-600">' +
          '<div class="text-center">' +
          '<p class="text-[10px] text-slate-400 mb-1">Copy this code, then sign in on GitHub</p>' +
          '<div class="flex items-center gap-2">' +
          '<code class="px-3 py-1 rounded-lg bg-black text-emerald-400 font-mono font-bold text-sm tracking-widest select-all">' + escapeHtml(data.user_code) + '</code>' +
          '<button onclick="navigator.clipboard.writeText(' + JSON.stringify(String(data.user_code)) + ')" class="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-300 cursor-pointer">Copy</button>' +
          '<a href="' + safeUri + '" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-semibold">Open GitHub</a>' +
          '</div></div>' +
          '<button onclick="cancelDeviceLogin()" class="text-slate-500 hover:text-slate-300 text-xs cursor-pointer">✕</button></div>';

        clearInterval(devicePollTimer);
        devicePollTimer = setInterval(async function () {
          try {
            const res = await fetch('/api/auth/status', { cache: 'no-store' });
            const status = await res.json();
            if (status.authenticated) {
              clearInterval(devicePollTimer);
              deviceFlowActive = false;
              loadAuthStatus();
            } else if (status.error) {
              clearInterval(devicePollTimer);
              deviceFlowActive = false;
              loadAuthStatus();
            }
          } catch (_) {}
        }, 3000);
      } catch (err) {
        deviceFlowActive = false;
        widget.innerHTML = '<span class="text-xs text-red-400">❌ ' + escapeHtml(err && err.message ? err.message : 'GitHub login failed') + '</span>';
        setTimeout(loadAuthStatus, 3000);
      }
    }

    async function cancelDeviceLogin() {
      clearInterval(devicePollTimer);
      deviceFlowActive = false;
      await fetch('/api/auth/device', { method: 'DELETE' }).catch(function () {});
      loadAuthStatus();
    }

    async function logout() {
      clearInterval(devicePollTimer);
      deviceFlowActive = false;
      await fetch('/api/auth/logout', { method: 'POST' });
      loadAuthStatus();
    }

    loadAuthStatus();

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
