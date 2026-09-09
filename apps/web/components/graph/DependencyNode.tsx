"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { DependencyNode as IDependencyNode } from "@breakguard/core-types";
import { AlertTriangle, ShieldCheck, Flame, Skull, Zap, FileCode } from "lucide-react";

interface NodeProps {
  data: {
    node: IDependencyNode;
    isSelected: boolean;
  };
}

export const DependencyCustomNode = memo(({ data }: NodeProps) => {
  const { node, isSelected } = data;
  const risk = node.risk;
  const level = risk?.level || "SAFE";
  const score = risk?.score ?? 0;
  const callCount = node.astUsage?.totalCallSites || 0;
  const fileCount = node.astUsage?.totalFilesCount || 0;

  // Dynamic styling based on risk level and status
  let borderColor = "border-slate-700";
  let glowClass = "";
  let badgeBg = "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";
  let RiskIcon = ShieldCheck;

  if (node.isDeprecated) {
    borderColor = "border-purple-500/60";
    glowClass = "shadow-[0_0_15px_rgba(168,85,247,0.3)]";
    badgeBg = "bg-purple-950/80 text-purple-300 border-purple-500/40";
    RiskIcon = Skull;
  } else if (level === "CRITICAL") {
    borderColor = "border-red-500/80";
    glowClass = "glow-critical";
    badgeBg = "bg-red-950/90 text-red-300 border-red-500/50";
    RiskIcon = Flame;
  } else if (level === "BREAKING_WARNING") {
    borderColor = "border-rose-500/70";
    glowClass = "glow-breaking";
    badgeBg = "bg-rose-950/80 text-rose-300 border-rose-500/40";
    RiskIcon = AlertTriangle;
  } else if (level === "MODERATE") {
    borderColor = "border-amber-500/60";
    glowClass = "glow-moderate";
    badgeBg = "bg-amber-950/80 text-amber-300 border-amber-500/40";
    RiskIcon = Zap;
  } else {
    borderColor = "border-emerald-500/50";
    glowClass = "glow-safe";
    badgeBg = "bg-emerald-950/80 text-emerald-300 border-emerald-500/30";
    RiskIcon = ShieldCheck;
  }

  if (isSelected) {
    borderColor = "border-blue-400 ring-2 ring-blue-500/50";
  }

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-xl bg-slate-900/90 p-3.5 backdrop-blur-md border transition-all duration-200 cursor-pointer ${borderColor} ${glowClass} hover:border-blue-400 hover:scale-[1.02]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 text-sm truncate" title={node.name}>
              {node.name}
            </span>
            {node.isTransitive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                sub
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs font-mono text-slate-400">
            <span>v{node.version}</span>
            {node.latestVersion && node.latestVersion !== node.version && (
              <>
                <span className="text-slate-600">➔</span>
                <span className="text-blue-400 font-medium">v{node.latestVersion}</span>
              </>
            )}
          </div>
        </div>

        {/* Risk Badge */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
          <RiskIcon className="w-3 h-3" />
          <span>{score}</span>
        </div>
      </div>

      {/* Meta tags & AST call indicators */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
        {node.isDeprecated ? (
          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 font-medium flex items-center gap-1 border border-purple-800/40">
            <Skull className="w-2.5 h-2.5" /> Deprecated
          </span>
        ) : null}

        {node.vulnerabilities && node.vulnerabilities.length > 0 ? (
          <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 font-medium flex items-center gap-1 border border-red-800/40">
            <Flame className="w-2.5 h-2.5" /> {node.vulnerabilities.length} CVE
          </span>
        ) : null}

        {callCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-blue-300 font-mono flex items-center gap-1">
            <FileCode className="w-2.5 h-2.5" /> {callCount} calls ({fileCount}f)
          </span>
        ) : node.astUsage?.isUnusedDependency ? (
          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
            Unused
          </span>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2.5 !h-2.5" />
    </div>
  );
});

DependencyCustomNode.displayName = "DependencyCustomNode";
