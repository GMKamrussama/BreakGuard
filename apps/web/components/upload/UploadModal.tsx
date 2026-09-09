"use client";

import React, { useState } from "react";
import { X, UploadCloud, FolderGit2, Code, FileJson, Sparkles, Loader2 } from "lucide-react";
import type { ProjectAnalysisReport } from "@breakguard/core-types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadReport: (report: ProjectAnalysisReport) => void;
}

export function UploadModal({ isOpen, onClose, onLoadReport }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [isLoading, setIsLoading] = useState(false);
  const [pkgJsonInput, setPkgJsonInput] = useState(`{
  "name": "my-custom-app",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^0.27.2",
    "lodash": "^4.17.21",
    "request": "^2.88.2"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}`);
  const [codeSnippetInput, setCodeSnippetInput] = useState(`import axios from 'axios';
import request from 'request';
import { debounce } from 'lodash';

export async function fetchUserData() {
  const response = await axios.get('/api/users');
  return response.data;
}`);

  if (!isOpen) return null;

  async function handleRunCustomAudit() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageJson: pkgJsonInput,
          lockfileType: "npm",
          files: [
            {
              path: "src/index.ts",
              content: codeSnippetInput,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("Analysis failed");
      const report = await res.json();
      onLoadReport(report);
      onClose();
    } catch (err) {
      alert("Failed to run analysis on custom input: " + String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Project Codebase Scanner</h2>
              <p className="text-xs text-slate-400">Analyze your package tree & AST call graphs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium px-4 pt-2">
          <button
            onClick={() => setActiveTab("preset")}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "preset"
                ? "border-blue-500 text-blue-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pre-configured Scenarios
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "custom"
                ? "border-blue-500 text-blue-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Custom package.json & Code
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          {activeTab === "preset" ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Select a real-world repository architecture to inspect breaking risks, deprecated packages, and AST call graphs:
              </p>

              <div
                onClick={() => {
                  import("../../lib/sample-data").then((mod) => {
                    onLoadReport(mod.SAMPLE_ENTERPRISE_REPORT);
                    onClose();
                  });
                }}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-blue-500/70 hover:bg-slate-800 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-blue-400" />
                    CloudScale SaaS Dashboard (Next.js 14 + React 18)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800/40">
                    High Breaking Risk (68/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Contains Axios v0.x➔1.x breaking API changes, TanStack Query v4➔v5 positional parameter removals, deprecated 'request' package, and ghost 'clsx' import.
                </p>
              </div>

              <div
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await fetch("/api/analyze", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        packageJson: JSON.stringify({
                          name: "express-auth-microservice",
                          version: "1.2.0",
                          dependencies: {
                            express: "^4.18.2",
                            jsonwebtoken: "^8.5.1",
                            zod: "^3.22.4",
                            pino: "^8.16.0",
                          },
                        }),
                        files: [
                          {
                            path: "src/server.ts",
                            content: `import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const app = express();
const userSchema = z.object({ id: z.string() });
app.get('/auth', (req, res) => {
  const token = jwt.sign({ user: 'demo' }, 'secret');
  res.json({ token });
});`,
                          },
                        ],
                      }),
                    });
                    const report = await res.json();
                    onLoadReport(report);
                    onClose();
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-emerald-500/70 hover:bg-slate-800 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-emerald-400" />
                    Express Auth Microservice (Node.js REST API)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                    Safe Migration (22/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clean microservice with pinned JSONWebToken and Zod types. Minor non-breaking updates available.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-blue-400" /> package.json
                </label>
                <textarea
                  rows={6}
                  value={pkgJsonInput}
                  onChange={(e) => setPkgJsonInput(e.target.value)}
                  className="w-full rounded-xl bg-black/60 border border-slate-700 p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-blue-400" /> Sample Source Code File (src/index.ts)
                </label>
                <textarea
                  rows={6}
                  value={codeSnippetInput}
                  onChange={(e) => setCodeSnippetInput(e.target.value)}
                  className="w-full rounded-xl bg-black/60 border border-slate-700 p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleRunCustomAudit}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-xs text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Running AST Parsing & SemVer Scorer...
                  </>
                ) : (
                  "Run Static AST Audit"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
