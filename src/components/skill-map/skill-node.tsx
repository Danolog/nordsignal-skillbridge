"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { LeafKind } from "@/lib/db/data/anchor-config";

// „Spokojny ekspert" (spec 0.1 + 4.4): płaskie tła z palety map-* fundamentu,
// subtelny border — BEZ neonowej poświaty (glow). Cień warstwy daje shadow-sm
// na kontenerze, nie kolorowy box-shadow.
const STATUS_COLORS = {
	acquired: "bg-emerald-50 border-emerald-200",
	in_progress: "bg-amber-50 border-amber-200",
	missing: "bg-red-50 border-red-200",
} as const;

// Hover: zmiana bordera o jeden krok, bez skoku layoutu ani mocniejszej poświaty.
const STATUS_COLORS_HOVER = {
	acquired: "hover:border-emerald-300",
	in_progress: "hover:border-amber-300",
	missing: "hover:border-red-300",
} as const;

const STATUS_LABELS: Record<string, string> = {
	acquired: "Masz",
	in_progress: "W trakcie",
	missing: "Brakuje",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
	acquired: "text-emerald-600",
	in_progress: "text-amber-500",
	missing: "text-red-500",
};

export type SkillNodeData = {
	label: string;
	status: "acquired" | "in_progress" | "missing";
	marketPercentage?: number;
	category?: string;
	// Kontekst grupy (Partia 5, C4) — additive, dokładany serwerowo przy buildGraph.
	groupName?: string;
	groupDescription?: string;
	groupUnionShare?: number;
	kind?: LeafKind;
};

export type SkillNodeType = Node<SkillNodeData, "skillNode">;

export function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
	const status = data.status || "acquired";

	return (
		<div
			className={`px-4 py-3 rounded-lg border min-w-[140px] max-w-[180px] text-center cursor-pointer shadow-sm transition-colors ${STATUS_COLORS[status]} ${STATUS_COLORS_HOVER[status]} ${selected ? "ring-2 ring-offset-2 ring-indigo-400" : ""}`}
		>
			<Handle type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" />
			<div className="font-semibold text-[13px] text-slate-900 leading-tight mb-1">
				{data.label}
			</div>
			<div
				className={`text-[11px] font-semibold uppercase tracking-wide ${STATUS_TEXT_COLORS[status]}`}
			>
				{STATUS_LABELS[status]}
			</div>
			{data.marketPercentage != null && (
				<div className="font-mono text-[11px] text-slate-400 mt-0.5">
					{data.marketPercentage}% ofert
				</div>
			)}
			<Handle type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" />
		</div>
	);
}
