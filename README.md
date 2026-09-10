<div align="center">

<img src="marketing/logo.png" alt="BreakGuard Logo" width="128" height="128" />

# BreakGuard 🛡️
### Static AST Codebase Analyzer & Breaking Change Predictor for Node.js Dependencies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![SWC](https://img.shields.io/badge/Parser-SWC-orange.svg)](https://swc.rs/)
[![Bun](https://img.shields.io/badge/Standalone_Binary-Bun_x64-fbf0df.svg)](https://bun.sh/)
[![Tauri](https://img.shields.io/badge/Desktop-Tauri_v2-24c8db.svg)](https://tauri.app/)
[![esbuild](https://img.shields.io/badge/esbuild-0.28.2_Patched-green.svg)](https://esbuild.github.io/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444.svg)](https://turbo.build/)

<br />

<p align="center">
  <b>Stop updating dependencies blindly.</b> BreakGuard parses your actual codebase's Abstract Syntax Tree (AST) to predict breaking changes, map deprecated function calls down to line numbers, and calculate composite migration risk (0–100) <i>before</i> you run <code>npm install</code>.
</p>

<p align="center">
  <a href="#-why-breakguard">Why BreakGuard?</a> •
  <a href="#-three-distribution-targets">3 Targets</a> •
  <a href="#-installation--quick-start">Installation</a> •
  <a href="#-interactive-dashboard--gui">Dashboard UI</a> •
  <a href="#-cli-commands">CLI Reference</a> •
  <a href="#-github-oauth--developer-badge">GitHub Badge</a> •
  <a href="#-architecture">Architecture</a>
</p>

<br />

<img src="marketing/banner_screenshot.png" alt="BreakGuard Dashboard Showcase" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />

</div>

---

## 💡 Why BreakGuard?

### The Problem
Every JavaScript and TypeScript team faces the exact same anxiety:
> *"A new major version of our dependency is out. If we upgrade, will our code silently break in production?"*

Standard tools like `npm audit` or Dependabot only tell you if a package has a known CVE vulnerability. **They have zero knowledge of how your actual code calls those libraries.** You are forced to upgrade blindly, read hundreds of changelog lines, and pray that unit tests catch deprecations.

### The Solution: BreakGuard
BreakGuard bridges this critical blind spot. It combines **high-speed SWC Abstract Syntax Tree (AST) parsing** with package lockfiles and SemVer lifecycle data to:
1. Scan every `.js`, `.jsx`, `.ts`, and `.tsx` file in your repository.
2. Locate the **exact files, line numbers, and call density** where updated or deprecated methods are invoked.
3. Compute an objective **Composite Breaking Risk Score (0–100)** to warn you whether a migration is Safe, Moderate, or Critical.
4. Auto-generate **1-Click AI Fix Prompts** tailored for Cursor, Claude 3.7 Sonnet, and ChatGPT with your exact code locations attached.

---

## ⚡ Feature Comparison

| Feature | `npm audit` | Dependabot / Snyk | **BreakGuard 🛡️** |
| :--- | :---: | :---: | :---: |
| **Known CVE Advisories (OSV.dev)** | ✅ | ✅ | ✅ |
| **AST Code Call-Site Mapping** | ❌ *(No)* | ❌ *(No)* | ✅ **(Exact files & line numbers)** |
| **SemVer Breaking Delta Prediction** | ❌ *(No)* | ❌ *(No)* | ✅ **(0–100 Risk Score)** |
| **Deprecated Function Call Tracking** | ❌ *(No)* | ❌ *(No)* | ✅ **(Detects deprecated API calls)** |
| **Ghost & Dead Dependency Audit** | ❌ *(No)* | ❌ *(No)* | ✅ **(Exposes undeclared & unused imports)** |
| **Interactive Node Graph UI** | ❌ *(No)* | ❌ *(No)* | ✅ **(React Flow dependency tree)** |
| **Zero-Dependency Standalone Binary** | ❌ *(No)* | ❌ *(No)* | ✅ **(Single-file `.exe` with zero Node.js)** |
| **1-Click AI Migration Prompt Exporter** | ❌ *(No)* | ❌ *(No)* | ✅ **(Cursor / Claude / GPT ready)** |
| **Official GitHub Profile Badge Analyzer**| ❌ *(No)* | ❌ *(No)* | ✅ **(Developer Program Member badge)**|

---

## 🚀 Three Distribution Targets

BreakGuard is engineered with a modular monorepo architecture offering 3 unified distribution runtimes powered by the exact same shared core engine (`@breakguard/core`):

```text
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│          Target 1: CLI          │   Target 2: Standalone .EXE     │    Target 3: Modern Web & GUI   │
├─────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│  • Developer terminal workflow  │  • Zero dependencies on host    │  • Interactive React Flow graph │
│  • High-speed colored table     │  • No Node.js or Bun required   │  • Side-drawer call inspector   │
│  • ASCII visual dependency tree │  • Double-click & run on Win    │  • One-click AI prompt exporter │
│  • CI/CD JSON output & exits    │  • Instant 5ms startup time     │  • Dark glassmorphic design     │
└─────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

## 📦 Installation & Quick Start

### Option 1: Standalone Windows Binary (`breakguard.exe`) — *Recommended for Non-Node Users*
No Node.js, Bun, or Python installation is required!

1. Download **`breakguard.exe`** from the [Latest GitHub Releases](https://github.com/GMKamrussama/BreakGuard/releases).
2. Open PowerShell or Command Prompt in your project directory:
   ```powershell
   # Run quick scan
   .\breakguard.exe scan .

   # Launch the full graphical browser dashboard
   .\breakguard.exe ui
   ```
   *(Or simply double-click `breakguard.exe` in Windows Explorer to launch the visual dashboard automatically!)*

---

### Option 2: Terminal CLI via Node.js

Run directly in any Node.js project:

```bash
# Scan current repository and view AST call sites
node packages/cli/bin/breakguard.js scan .

# Render visual terminal ASCII dependency tree
node packages/cli/bin/breakguard.js tree .

# Run CI/CD automated audit with JSON report
node packages/cli/bin/breakguard.js audit . --json

# Launch the visual dashboard in your default browser
node packages/cli/bin/breakguard.js ui
```

---

### Option 3: Full Development Monorepo (Next.js + Tauri Desktop)

Clone and run the complete monorepo locally:

```bash
# 1. Clone repository
git clone https://github.com/GMKamrussama/BreakGuard.git
cd BreakGuard

# 2. Install dependencies (pnpm v10)
pnpm install

# 3. Start development server (Next.js 16 Web Dashboard on http://localhost:3000)
pnpm dev

# 4. Build desktop app (Tauri v2 + Vite 8)
pnpm desktop:build

# 5. Compile standalone .exe using Bun
pnpm build:exe
```

---

## 🖥️ Interactive Dashboard & GUI

BreakGuard features a visual dark-mode dashboard with:

1. **Interactive Dependency Graph (`@xyflow/react`):**
   - Color-coded node risk indicators (Green: Safe, Yellow: Moderate, Red: Critical Breaking).
   - Filter by risk level, direct dependencies, and deprecations in real time.
2. **Side Drawer AST Call Inspector:**
   - Click any package node to inspect every single file and line number importing that package.
   - Shows call density metrics and deprecated identifiers.
3. **1-Click AI Fix Prompt Generator:**
   - Click "Copy AI Fix Prompt" to generate a rich, context-packed prompt ready to paste directly into **Cursor Composer**, **Claude 3.7**, or **ChatGPT**.
4. **GitHub Repository QA Auditor:**
   - Audit any public GitHub repo (`owner/repo`) via GitHub REST API.
   - Generates official QA Health Scores, Star metrics, PR merge rates, and dynamic README shield markdown.

---

## ⌨️ CLI Command Reference

| Command | Description | Example |
| :--- | :--- | :--- |
| `breakguard scan [path]` | Scans AST & lockfile, prints summary risk table and line numbers | `breakguard scan .` |
| `breakguard tree [path]` | Renders interactive ASCII tree with colored risk branches | `breakguard tree .` |
| `breakguard audit [path]` | CI/CD pipe-friendly audit, exits with non-zero code on high risk | `breakguard audit . --json` |
| `breakguard repo <owner/repo>`| Audits remote GitHub repository QA score via GitHub API | `breakguard repo facebook/react` |
| `breakguard auth login` | Authenticates with GitHub via Device Flow (no password needed) | `breakguard auth login` |
| `breakguard auth status` | Displays current authenticated GitHub username | `breakguard auth status` |
| `breakguard auth logout` | Safely removes local stored credentials | `breakguard auth logout` |
| `breakguard ui` | Starts local GUI engine at `http://127.0.0.1:4567` & opens browser | `breakguard ui` |

---

## 🔑 GitHub OAuth & "Developer Program Member" Badge

BreakGuard integrates official GitHub REST API capabilities with **OAuth App Device Flow**:

```text
[BreakGuard UI / CLI] ──> [GitHub Device Code API] ──> Displays "ABCD-1234"
                                                                │
[User Opens github.com/login/device] ◄──────────────────────────┘
             │
             ▼ (Approves BreakGuard)
[Secure Bearer Token Issued] ──> Stored locally in ~/.breakguard/github-auth.json
```

### How to get the official GitHub "Developer Program Member" Profile Badge:
Because BreakGuard actively consumes the GitHub REST API and supports OAuth Device Flow, you can use it to register for the official badge:
1. **Create an OAuth App:** Go to **GitHub Settings** ➔ **Developer Settings** ➔ **OAuth Apps** ➔ **New OAuth App**.
   - Name: `BreakGuard Analyzer`
   - Homepage: `https://github.com/GMKamrussama/BreakGuard`
   - *Important:* Check **"Enable Device Flow"** and click Save.
2. **Join Developer Program:** Navigate to [https://github.com/settings/developer-program](https://github.com/settings/developer-program).
3. Click **"Register for the Developer Program"**, select your registered `BreakGuard Analyzer` app, and submit.
4. GitHub verifies active API integration and displays the official **"Developer Program Member"** badge on your profile!

---

## 🏗️ Architecture & Data Flow

```text
               Target Codebase / Repository
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
  Lockfile Deep Parser                   SWC AST Visitor
(npm, yarn, pnpm v1-v9)             (Parses .js, .jsx, .ts, .tsx)
         │                                     │
         ▼                                     ▼
 Transitive Dep Tree                   Call Sites & Line Numbers
         │                                     │
         └──────────────────┬──────────────────┘
                            ▼
           Composite Risk Engine (0-100 Score)
        (SemVer Delta + Call Density + OSV Advisories)
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
    Target 1: CLI      Target 2: Binary    Target 3: GUI
   (Table & Tree)     (dist/breakguard.exe)  (Next.js / Tauri)
```

---

## 🔒 Security & Vulnerability Fixes

- **Patched `esbuild` Path Traversal Vulnerability (CVE / Dependabot #1):**
  - Fully upgraded and locked to `esbuild@0.28.2` (`>=0.28.1`) via `pnpm.overrides`.
  - Zero high/critical vulnerability warnings across all 9 monorepo workspaces.
- **Credential Safety:**
  - BreakGuard never asks for or stores user passwords.
  - Device flow tokens are stored with restricted permissions (`0o600`) in `~/.breakguard/github-auth.json` and are never exposed to browser frontend scripts.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/GMKamrussama">GM Kamrussama</a> and the BreakGuard community.</sub>
</div>
