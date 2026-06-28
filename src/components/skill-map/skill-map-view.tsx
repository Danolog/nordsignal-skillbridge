"use client";

import {
	Background,
	BackgroundVariant,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import { NodeDetailPanel } from "./node-detail-panel";
import { SkillMapList } from "./skill-map-list";
import { SkillNode, type SkillNodeData, type SkillNodeType } from "./skill-node";

const nodeTypes = { skillNode: SkillNode };

// Editorial „Spokojny ekspert": Masz=bursztyn, W trakcie=żółty ostrzegawczy, Brakuje=czerwień luki.
const STATUS_MINIMAP_COLORS: Record<string, string> = {
	acquired: "#D0891E",
	in_progress: "#F4D04F",
	missing: "#D0422B",
};

interface SkillMapViewProps {
	initialNodes: Node[];
	initialEdges: Edge[];
}

export function SkillMapView({ initialNodes, initialEdges }: SkillMapViewProps) {
	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, , onEdgesChange] = useEdgesState(initialEdges);
	const [selectedNode, setSelectedNode] = useState<SkillNodeType | null>(null);
	// Widok: kanwa grafu („map") vs lista grupująca („list", C4 — „cel cały czas widoczny").
	const [view, setView] = useState<"map" | "list">("map");

	const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
		setSelectedNode(node as SkillNodeType);
	}, []);

	const onPaneClick = useCallback(() => {
		setSelectedNode(null);
	}, []);

	const nodeColor = useCallback((node: Node) => {
		const data = node.data as SkillNodeData;
		return STATUS_MINIMAP_COLORS[data.status] || "#D6CEC2";
	}, []);

	const stats = useMemo(() => {
		let acquired = 0;
		let inProgress = 0;
		let missing = 0;
		for (const node of nodes) {
			const data = node.data as SkillNodeData;
			if (data.status === "acquired") acquired++;
			else if (data.status === "in_progress") inProgress++;
			else if (data.status === "missing") missing++;
		}
		return { acquired, inProgress, missing };
	}, [nodes]);

	return (
		<div className="flex flex-col h-[calc(100vh-theme(spacing.0))] max-md:h-[calc(100vh-56px)]">
			{/* Header bar */}
			<div className="flex items-center justify-between px-6 py-4 bg-ed-card border-b border-ed-border shrink-0">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-ed-badge-bg border border-ed-border flex items-center justify-center text-ed-amber-text">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							className="w-5 h-5"
						>
							<title>Mapa kompetencji</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
							/>
						</svg>
					</div>
					<div>
						<h1 className="font-heading font-semibold text-xl text-ed-ink">Mapa kompetencji</h1>
						<p className="text-[13px] text-ed-muted">Twoje kompetencje na tle rynku</p>
					</div>
					{/* Przełącznik widoku Mapa / Lista (C4) */}
					<div className="ml-2 inline-flex rounded-lg border border-ed-border p-0.5 text-[13px] font-medium">
						<button
							type="button"
							onClick={() => setView("map")}
							className={`rounded-md px-3 py-1 transition-colors ${view === "map" ? "bg-ed-surface text-ed-ink" : "text-ed-muted hover:text-ed-ink"}`}
						>
							Mapa
						</button>
						<button
							type="button"
							onClick={() => setView("list")}
							className={`rounded-md px-3 py-1 transition-colors ${view === "list" ? "bg-ed-surface text-ed-ink" : "text-ed-muted hover:text-ed-ink"}`}
						>
							Lista
						</button>
					</div>
				</div>
				<div className="flex items-center gap-4 max-md:hidden">
					<div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ed-amber/10 border border-ed-amber/20 text-ed-amber-text font-mono text-[13px] font-semibold">
						<span className="w-2 h-2 rounded-full bg-ed-amber" />
						{stats.acquired} Masz
					</div>
					<div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ed-warn/15 border border-ed-warn/40 text-ed-amber-text font-mono text-[13px] font-semibold">
						<span className="w-2 h-2 rounded-full bg-ed-warn" />
						{stats.inProgress} W trakcie
					</div>
					<div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ed-danger/10 border border-ed-danger/20 text-ed-danger font-mono text-[13px] font-semibold">
						<span className="w-2 h-2 rounded-full bg-ed-danger" />
						{stats.missing} Brakuje
					</div>
				</div>
			</div>

			{/* Widok listowy — akordeon grup (C4, „cel cały czas widoczny" bez kliknięcia) */}
			{view === "list" ? (
				<div className="flex-1 overflow-y-auto bg-ed-surface">
					<SkillMapList nodes={nodes as unknown as { data: SkillNodeData }[]} />
				</div>
			) : (
				<div className="relative flex-1">
					<ReactFlow
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodeClick={onNodeClick}
						onPaneClick={onPaneClick}
						fitView
						defaultEdgeOptions={{
							// „Spokojny ekspert": krawędzie statyczne, cienkie, neutralne — bez ruchu.
							style: { stroke: "rgba(110, 104, 96, 0.25)", strokeWidth: 1.5 },
							animated: false,
						}}
						proOptions={{ hideAttribution: true }}
					>
						<Controls
							showInteractive={false}
							className="!bg-ed-card !border !border-ed-border !rounded-lg !shadow-sm"
						/>
						<MiniMap
							nodeColor={nodeColor}
							maskColor="rgba(110, 104, 96, 0.06)"
							className="!bg-ed-card !border !border-ed-border !rounded-lg !shadow-sm"
						/>
						<Background
							variant={BackgroundVariant.Dots}
							gap={24}
							size={1}
							color="rgba(110, 104, 96, 0.10)"
						/>
					</ReactFlow>

					{/* Legend — bez poświaty (glow), płaskie kropki statusu */}
					<div className="absolute bottom-5 left-5 bg-ed-card border border-ed-border rounded-lg px-4 py-3 flex gap-4 shadow-sm z-10">
						<span className="flex items-center gap-1.5 text-xs font-medium text-ed-muted">
							<span className="w-2.5 h-2.5 rounded-full bg-ed-amber" />
							Masz
						</span>
						<span className="flex items-center gap-1.5 text-xs font-medium text-ed-muted">
							<span className="w-2.5 h-2.5 rounded-full bg-ed-warn" />W trakcie
						</span>
						<span className="flex items-center gap-1.5 text-xs font-medium text-ed-muted">
							<span className="w-2.5 h-2.5 rounded-full bg-ed-danger" />
							Brakuje
						</span>
					</div>

					{/* Detail Panel */}
					{selectedNode && (
						<NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
					)}
				</div>
			)}
		</div>
	);
}
