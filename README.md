# BreakGuard 🛡️

> Static AST Codebase Analyzer & Breaking Change Predictor for Node.js Dependencies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![SWC](https://img.shields.io/badge/Parser-SWC-orange.svg)](https://swc.rs/)
[![Tauri](https://img.shields.io/badge/Desktop-Tauri_v2-24c8db.svg)](https://tauri.app/)
[![Bun](https://img.shields.io/badge/Standalone_Binary-Bun_x64-fbf0df.svg)](https://bun.sh/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444.svg)](https://turbo.build/)

BreakGuard solves the biggest blind spot in JavaScript maintenance: **Upgrading dependencies blindly without knowing if your actual codebase breaks.**

Unlike standard vulnerability auditors, BreakGuard uses high-speed Abstract Syntax Tree (AST) parsing to map imported identifiers against SemVer updates and deprecation lifecycle data.

---

### Three Unified Distribution Targets

BreakGuard is engineered with a modular, scoped architecture offering 3 distinct runtime targets powered by the same shared core engine (`@breakguard/core`):

1. **Global Terminal CLI (`packages/cli`):** Fast, zero-fluff CLI with loading spinners (`ora`), colored badges (`chalk`), and command routing (`commander`):
   - `breakguard scan [path]`: Summary Table, Deprecations, and Risky packages with local file paths & line numbers.
   - `breakguard tree [path]`: ASCII terminal visual tree with risk-colored nodes.
   - `breakguard audit [path] --json`: Structured JSON output for CI/CD pipelines.
2. **Zero-Dependency Standalone Binary (`breakguard.exe`):** Compiled via Bun native compiler into a standalone single-file Windows binary without requiring Node.js on host systems.
3. **Interactive Visual Dashboard & Desktop GUI (`apps/web` & `apps/desktop`):** Next.js 15 web app and lightweight Tauri v2 desktop GUI with `@xyflow/react` dependency graphs, side drawer inspectors, and ephemeral sandbox verification.

---

### Key Capabilities

* **AST-Powered Call Mapping:** Finds the exact files and lines of code utilizing deprecated or updated methods with call density metrics.
* **Transitive Dependency Graph:** Visual interactive node graph powered by React Flow (`@xyflow/react`) with real-time filtering (high risk, deprecations, direct/transitive).
* **Breaking Risk Scoring:** Quantifies composite migration risk (Safe, Moderate, Breaking Warning, Critical: 0-100) combining SemVer delta, call density, deprecations, and OSV security advisories prior to running `npm install`.
* **Lockfile Fingerprinting:** Complete deep parser support for `package-lock.json` (v1/v2/v3), `yarn.lock` (v1 classic and Berry v2+), and `pnpm-lock.yaml` (v5/v6/v9).
* **Ghost & Unused Dependency Detection:** Immediately exposes packages imported in code but omitted from `package.json` (ghosts) as well as dead dependencies declared with 0 usages.
* **Ephemeral Sandbox Runner:** Background container simulation running typecheck (`tsc --noEmit`) and production builds with stack-trace error reporting.

---

### Architecture & Data Flow

```text
[Target Repo / Files]
│
├──> [Lockfile Deep Parser] ────> Transitive Dependency Tree (npm / yarn / pnpm)
│
└──> [SWC AST Scanner] ─────────> Code Usage, Line Numbers & Call Site Density Map
│
▼
[npm Registry & OSV.dev] ───────> [Composite Risk Scorer Engine (0-100)]
│
▼
┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│         Target 1: CLI         │    Target 2: Standalone .exe  │   Target 3: Desktop & Web UI  │
│  npx breakguard scan / tree   │      dist/breakguard.exe      │    Next.js 15 & Tauri v2 GUI  │
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

### Project Structure (Monorepo)

```text
breakguard/
├── apps/
│   ├── web/                     # Next.js 15+ App Router Web Dashboard
│   └── desktop/                 # Desktop GUI using Tauri v2 & React Flow
├── packages/
│   ├── core/                    # Unified engine uniting AST, lockfiles, & risk scoring
│   ├── ast-scanner/             # SWC AST visitor & code usage scanner
│   ├── lockfile-parser/         # Deep parser for npm, yarn, and pnpm lockfiles
│   ├── risk-engine/             # Pure functional composite breaking risk calculator
│   ├── core-types/              # Shared TypeScript interfaces & Zod schemas
│   └── cli/                     # CLI tool (Commander.js + Chalk + Ora)
├── scripts/
│   └── build-exe.ts             # Bun compile script generating standalone breakguard.exe
├── dist/                        # Standalone binary artifacts (breakguard.exe)
├── docker/                      # Ephemeral sandbox runner container definitions
└── turbo.json                   # Turborepo task pipeline
```

---

### Quick Start & Commands

#### 1. Running the CLI
```bash
# Scan current directory
node packages/cli/bin/breakguard.js scan .

# Render visual terminal ASCII dependency tree
node packages/cli/bin/breakguard.js tree .

# Run CI/CD audit with JSON output
node packages/cli/bin/breakguard.js audit . --json
```

#### 2. Compiling the Standalone .exe Binary
```bash
# Compile breakguard.exe using Bun
pnpm build:exe

# Run the compiled binary directly in Windows CMD/PowerShell (Zero Node.js required):
./dist/breakguard.exe scan .
./dist/breakguard.exe tree .
```

#### 3. Web Dashboard & Desktop GUI
```bash
# Launch Next.js 15 Web Dashboard (http://localhost:3000)
pnpm dev

# Build the desktop GUI bundle
pnpm desktop:build
```


