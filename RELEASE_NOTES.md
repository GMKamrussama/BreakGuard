# BreakGuard Release Notes & Publishing Package 🛡️

Use the following polished release templates when publishing releases on GitHub: [https://github.com/GMKamrussama/BreakGuard/releases](https://github.com/GMKamrussama/BreakGuard/releases).

---

## 🚀 Version 1.2.0 — Production Release (Recommended Latest)

### Tag: `v1.2.0`
### Release Title: `BreakGuard v1.2.0 🛡️ — Visual AST Graph, GitHub Device Flow & Patched Security Engine`

```markdown
# BreakGuard v1.2.0 — Production Release 🛡️

BreakGuard v1.2.0 delivers an ultra-fast, static AST dependency analyzer, visual dependency tree graph, and secure GitHub Device Flow authentication with zero-dependency standalone Windows executables.

---

### 🌟 What's New in v1.2.0:

#### 1. 🔑 GitHub OAuth App Device Flow Authentication
- Sign in securely via GitHub Device Flow with zero password entry.
- Automatic rate-limit boost from 60 to 5,000 req/hr on GitHub API.
- Fully synchronized session storage across CLI, Desktop Tauri GUI, and Web Dashboard.
- Qualifies your developer account for the official **GitHub Developer Program Member** profile badge!

#### 2. 🛡️ Security Vulnerability Patched (CVE / Dependabot #1)
- Upgraded `esbuild` to **`0.28.2`** (`>=0.28.1`) via `pnpm.overrides`, closing the Windows development server path traversal vulnerability.
- Zero high or critical security alerts across the entire monorepo.

#### 3. 🎨 Breathtaking Glassmorphism Dashboard & Modal Redesign
- Central glowing modal with large monospace one-time device code.
- Guaranteed multi-fallback clipboard copying (`navigator.clipboard` + hidden textarea fallback) with instant `✓ Copied!` visual confirmation.
- Modernized GitHub QA Audit & Local AST Scanner action cards with preset buttons (`facebook/react`, `express`, `vite`, `.`).
- Interactive `@xyflow/react` node graph with real-time risk filters and side-drawer call inspector.

#### 4. 🤖 1-Click AI Fix Prompt Exporter
- Export rich, structured prompt contexts with exact file paths and line numbers directly into **Cursor Composer**, **Claude 3.7**, or **ChatGPT**.

---

### 📦 Standalone Binary Downloads:
| Operating System | Binary Package | Dependencies |
| :--- | :--- | :--- |
| **Windows x64** | [`breakguard.exe`](https://github.com/GMKamrussama/BreakGuard/releases/download/v1.2.0/breakguard.exe) | **Zero (No Node.js or Bun required)** |

```powershell
# Quick scan with standalone binary
.\breakguard.exe scan .

# Launch graphical dashboard in browser
.\breakguard.exe ui
```

---

### 📦 Monorepo Packages:
- `@breakguard/core@1.0.0`
- `@breakguard/ast-scanner@1.0.0`
- `@breakguard/lockfile-parser@1.0.0`
- `@breakguard/risk-engine@1.0.0`
- `@breakguard/cli@1.0.0`
- `@breakguard/web@1.0.0`
- `@breakguard/desktop@1.0.0`
```

---

## 🚀 Version 1.1.0 — UI & Graph Improvements

### Tag: `v1.1.0`
### Release Title: `BreakGuard v1.1.0 — React Flow Interactive Graph & AST Inspector`

```markdown
# BreakGuard v1.1.0 — Visual Graph & Call Inspector 🚀

### Key Highlights:
- Added interactive node graph layout powered by `@xyflow/react`.
- Side-drawer AST call inspector tracking exact files and lines of code utilizing deprecated methods.
- Dynamic filtering by High Risk, Moderate, Safe, Direct, and Transitive dependencies.
- ASCII terminal visual dependency tree (`breakguard tree .`).
```

---

## 🚀 Version 1.0.0 — Initial Release

### Tag: `v1.0.0`
### Release Title: `BreakGuard v1.0.0 — Static AST Codebase Analyzer & Breaking Change Predictor`

```markdown
# BreakGuard v1.0.0 — The Initial Release 🛡️

### Key Highlights:
- SWC AST parser analyzing JavaScript & TypeScript codebase call density.
- Deep lockfile parser supporting npm (`package-lock.json`), yarn (`yarn.lock`), and pnpm (`pnpm-lock.yaml`).
- Composite Breaking Change Risk Scoring engine (0-100).
- Ghost & dead dependency detection.
- Single-file standalone Windows binary compilation via Bun.
```
