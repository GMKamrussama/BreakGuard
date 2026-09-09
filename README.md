# BreakGuard 🛡️

> Static AST Codebase Analyzer & Breaking Change Predictor for Node.js Dependencies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![SWC](https://img.shields.io/badge/Parser-SWC-orange.svg)](https://swc.rs/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-ef4444.svg)](https://turbo.build/)

BreakGuard solves the biggest blind spot in JavaScript maintenance: **Upgrading dependencies blindly without knowing if your actual codebase breaks.**

Unlike standard vulnerability auditors, BreakGuard uses high-speed Abstract Syntax Tree (AST) parsing to map imported identifiers against SemVer updates and deprecation lifecycle data.

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
[Interactive React Flow UI & CLI Runner]
```

---

### Project Structure (Monorepo)

```text
breakguard/
├── apps/
│   └── web/                     # Next.js 15+ Dashboard & React Flow Interactive UI
│       ├── app/                 # App Router (Dashboard, Analyze API route)
│       ├── components/graph/    # React Flow custom node & interactive graph
│       ├── components/drawer/   # Package inspector & AST call site drawer
│       ├── components/sandbox/  # Ephemeral sandbox runner modal
│       └── components/upload/   # Repo selector & code scanner modal
├── packages/
│   ├── ast-scanner/             # SWC AST visitor & code usage scanner
│   ├── lockfile-parser/         # Deep parser for npm, yarn, and pnpm lockfiles
│   ├── risk-engine/             # Pure functional composite breaking risk calculator
│   ├── core-types/              # Shared TypeScript interfaces & Zod schemas
│   └── cli/                     # CLI audit executable (breakguard audit .)
├── docker/                      # Ephemeral sandbox runner container definitions
└── turbo.json                   # Turborepo task pipeline
```

---

### Quick Start (Local Setup)

```bash
# Clone the repository
git clone https://github.com/your-username/breakguard.git

# Navigate to directory
cd breakguard

# Install dependencies across all monorepo workspaces
pnpm install

# Run all test suites
pnpm test

# Launch the interactive web dashboard
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the BreakGuard dashboard.

---

### CLI Usage

You can also run BreakGuard directly in any project folder:

```bash
# Audit current directory
pnpm --filter breakguard build
node packages/cli/dist/index.js audit .

# Output JSON report for CI/CD pipelines
node packages/cli/dist/index.js audit . --json
```

---

### GitHub Topics for SEO

`dependency-analyzer`, `ast-parser`, `swc`, `breaking-changes`, `package-json`, `semver-checker`, `nextjs`, `react-flow`, `developer-tools`, `typescript`
