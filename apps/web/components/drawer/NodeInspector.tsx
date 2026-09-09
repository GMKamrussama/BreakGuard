"use client";

import React from "react";
import type { DependencyNode } from "@breakguard/core-types";
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileCode,
  Terminal,
  ExternalLink,
  ChevronRight,
  Flame,
  Skull,
  Play
} from "lucide-react";

interface NodeInspectorProps {
  node: DependencyNode | null;
  onClose: () => void;
  onRunSandbox: (node: DependencyNode) => void;
}

export function NodeInspector({ node, onClose, onRunSandbox }: NodeInspectorProps) {
  if (!node) return null;

  const risk = node.risk;
  const level = risk?.level || "SAFE";
  const score = risk?.score ?? 0;
  const breakdown = risk?.breakdown;
  const ast = node.astUsage;

  let badgeBg = "bg-emerald-950/80 text-emerald-300 border-emerald-500/40";
  if (node.isDeprecated) {
    badgeBg = "bg-purple-950/80 text-purple-300 border-purple-500/40";
  } else if (level === "CRITICAL") {
    badgeBg = "bg-red-950/90 text-red-300 border-red-500/50";
  } else if (level === "BREAKING_WARNING") {
    badgeBg = "bg-rose-950/80 text-rose-300 border-rose-500/40";
  } else if (level === "MODERATE") {
    badgeBg = "bg-amber-950/80 text-amber-300 border-amber-500/40";
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md z-40 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transition-all transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">{node.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg}`}>
              Risk: {score}/100
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 font-mono text-xs text-slate-400">
            <span>v{node.version}</span>
            {node.latestVersion && node.latestVersion !== node.version && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <span className="text-blue-400 font-semibold">v{node.latestVersion}</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 text-[10px] uppercase">
                  {breakdown?.semverJump || "update"}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Sandbox Run Action Button */}
        <button
          onClick={() => onRunSandbox(node)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          Test Upgrade in Ephemeral Sandbox
        </button>

        {/* Deprecation Banner */}
        {node.isDeprecated && (
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs flex gap-3">
            <Skull className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-purple-300 mb-0.5">Package is Deprecated</div>
              <div>{node.deprecationReason || "Maintainer has marked this package as deprecated."}</div>
            </div>
          </div>
        )}

        {/* Vulnerability Warnings */}
        {node.vulnerabilities && node.vulnerabilities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" /> Security Advisories (OSV.dev)
            </h3>
            {node.vulnerabilities.map((v) => (
              <div key={v.id} className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-red-400 mb-1">
                  <span>{v.id}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-[10px] text-red-200">
                    {v.severity}
                  </span>
                </div>
                <p className="text-slate-300 mb-2 leading-relaxed">{v.summary}</p>
                {v.fixedIn && (
                  <div className="text-emerald-400 font-mono text-[11px]">
                    Fixed in: <span className="font-semibold">{v.fixedIn}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Risk Breakdown Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" /> Risk Score Breakdown
          </h3>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Composite Breaking Score</span>
                <span className="font-bold text-slate-100">{score}/100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    score >= 70 ? "bg-red-500" : score >= 35 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SemVer Delta</span>
                <span className="font-semibold text-slate-200">+{breakdown?.semverScore || 0} pts</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Call Density</span>
                <span className="font-semibold text-slate-200">+{breakdown?.usageDensityScore || 0} pts</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Deprecation</span>
                <span className="font-semibold text-slate-200">+{breakdown?.deprecationScore || 0} pts</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Vulnerability</span>
                <span className="font-semibold text-slate-200">+{breakdown?.vulnerabilityScore || 0} pts</span>
              </div>
            </div>

            {breakdown?.penaltyNotes && breakdown.penaltyNotes.length > 0 && (
              <ul className="space-y-1.5 pt-1 text-xs text-slate-400 list-disc list-inside">
                {breakdown.penaltyNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recommended Migration Action */}
        {risk?.recommendedAction && (
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs space-y-1.5">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Recommended Action
            </div>
            <p className="text-slate-300 leading-relaxed">{risk.recommendedAction}</p>
          </div>
        )}

        {/* AST Codebase Call Sites */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-blue-400" /> AST Call Sites in Project
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {ast?.totalCallSites || 0} calls ({ast?.totalFilesCount || 0} files)
            </span>
          </div>

          {ast && ast.files.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {ast.files.map((file, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
                  <div className="font-mono text-blue-300 font-medium mb-1.5 truncate" title={file.relativePath}>
                    {file.relativePath}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {file.calls.map((call, cIdx) => (
                      <div key={cIdx} className="flex items-center justify-between text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                        <span className="text-amber-400">{call.methodName}()</span>
                        <span className="text-slate-500">L:{call.line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-slate-400 text-xs text-center">
              {ast?.isUnusedDependency
                ? "No code imports found across any files. (Ghost / Unused Dependency)"
                : "No direct calls detected in the scanned files."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
