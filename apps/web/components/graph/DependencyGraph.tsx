"use client";

import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DependencyCustomNode } from "./DependencyNode";
import type { DependencyNode as IDependencyNode, ProjectAnalysisReport } from "@breakguard/core-types";

const nodeTypes = {
  dependencyNode: DependencyCustomNode,
};

interface DependencyGraphProps {
  report: ProjectAnalysisReport;
  selectedNodeId: string | null;
  onSelectNode: (node: IDependencyNode) => void;
  filter: string;
  searchQuery: string;
}

export function DependencyGraph({
  report,
  selectedNodeId,
  onSelectNode,
  filter,
  searchQuery,
}: DependencyGraphProps) {
  // Convert report.dependencies into React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes = Object.values(report.dependencies);

    // Apply filtering
    const filtered = rawNodes.filter((n) => {
      // Search filter
      if (searchQuery && !n.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filter === "direct") return !n.isTransitive;
      if (filter === "deprecated") return n.isDeprecated;
      if (filter === "breaking") {
        return n.risk?.level === "BREAKING_WARNING" || n.risk?.level === "CRITICAL";
      }
      if (filter === "safe") return n.risk?.level === "SAFE";

      return true;
    });

    const directNodes = filtered.filter((n) => !n.isTransitive);
    const transitiveNodes = filtered.filter((n) => n.isTransitive);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Layout direct nodes in structured grid
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 150;
    const DIRECT_COLUMNS = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(directNodes.length))));

    directNodes.forEach((node, index) => {
      const col = index % DIRECT_COLUMNS;
      const row = Math.floor(index / DIRECT_COLUMNS);

      nodes.push({
        id: node.name,
        type: "dependencyNode",
        position: {
          x: col * HORIZONTAL_SPACING + 40,
          y: row * VERTICAL_SPACING + 40,
        },
        data: {
          node,
          isSelected: selectedNodeId === node.name,
        },
      });

      // Add edges to its direct dependencies
      for (const subDepName of Object.keys(node.dependencies)) {
        edges.push({
          id: `${node.name}->${subDepName}`,
          source: node.name,
          target: subDepName,
          animated: node.risk?.level === "CRITICAL" || node.risk?.level === "BREAKING_WARNING",
          style: {
            stroke: node.risk?.level === "CRITICAL" ? "#ef4444" : "#475569",
            strokeWidth: 1.5,
          },
        });
      }
    });

    // Layout transitive nodes below direct nodes
    const startY = Math.ceil(directNodes.length / DIRECT_COLUMNS) * VERTICAL_SPACING + 80;
    const TRANS_COLUMNS = 3;

    transitiveNodes.forEach((node, index) => {
      const col = index % TRANS_COLUMNS;
      const row = Math.floor(index / TRANS_COLUMNS);

      nodes.push({
        id: node.name,
        type: "dependencyNode",
        position: {
          x: col * HORIZONTAL_SPACING + 40,
          y: startY + row * VERTICAL_SPACING,
        },
        data: {
          node,
          isSelected: selectedNodeId === node.name,
        },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [report, selectedNodeId, filter, searchQuery]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const depNode = (node.data as any)?.node as IDependencyNode;
      if (depNode) {
        onSelectNode(depNode);
      }
    },
    [onSelectNode]
  );

  return (
    <div className="w-full h-[640px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070b14] relative">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        attributionPosition="bottom-left"
      >
        <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 fill-slate-300" />
        <MiniMap
          nodeStrokeColor="#38bdf8"
          nodeColor="#1e293b"
          maskColor="rgba(7, 11, 20, 0.7)"
          className="!bg-slate-900/90 !border-slate-800 !rounded-xl overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
