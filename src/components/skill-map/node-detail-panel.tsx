"use client";

import { BookOpen, CheckCircle, Rocket, Tag, X } from "lucide-react";
import Link from "next/link";
import { KindChip, SharePill } from "./group-context";
import type { SkillNodeData } from "./skill-node";

const STATUS_LABELS: Record<string, string> = {
	acquired: "Masz",
	in_progress: "W trakcie",
	missing: "Brakuje",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
	acquired: "bg-ed-amber/10 text-ed-amber-text",
	in_progress: "bg-ed-warn/15 text-ed-amber-text",
	missing: "bg-ed-danger/10 text-ed-danger",
};

const STATUS_DOT_STYLES: Record<string, string> = {
	acquired: "bg-ed-amber",
	in_progress: "bg-ed-warn",
	missing: "bg-ed-danger",
};

// „Spokojny ekspert": pasek postępu jednolitym kolorem, bez gradientu i bez glow.
const STATUS_BAR_STYLES: Record<string, string> = {
	acquired: "bg-ed-amber",
	in_progress: "bg-ed-warn",
	missing: "bg-ed-danger",
};

interface NodeDetailPanelProps {
	node: { data: SkillNodeData } | null;
	onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
	if (!node) return null;

	const {
		label,
		status,
		marketPercentage,
		category,
		groupName,
		groupDescription,
		groupUnionShare,
		kind,
	} = node.data;

	return (
		<div className="absolute top-0 right-0 bottom-0 w-[360px] bg-ed-card border-l border-ed-border shadow-md z-30 flex flex-col animate-in slide-in-from-right duration-300 max-md:w-full">
			{/* Top accent bar */}
			<div
				className={`h-[3px] ${status === "acquired" ? "bg-ed-amber" : status === "in_progress" ? "bg-ed-warn" : "bg-ed-danger"}`}
			/>

			{/* Header */}
			<div className="px-6 py-5 flex items-start justify-between border-b border-ed-border">
				<div>
					<h3 className="font-heading font-semibold text-lg text-ed-ink mb-2">{label}</h3>
					<span
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE_STYLES[status]}`}
					>
						<span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[status]}`} />
						{STATUS_LABELS[status]}
					</span>
				</div>
				<button
					onClick={onClose}
					type="button"
					className="w-8 h-8 rounded-lg flex items-center justify-center text-ed-muted hover:text-ed-ink hover:bg-ed-surface transition-colors"
				>
					<X size={20} />
				</button>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
				{/* Group / cel nauki — kontekst grupy nad zapotrzebowaniem (spec 4.3).
				    Gdy węzeł niesie grupę → pokazujemy ją (nazwa + SharePill + proza + KindChip),
				    zastępując dawne „Kategoria: status". Fallback do kategorii dla starszych map. */}
				{groupName ? (
					<div>
						<div className="text-[11px] font-semibold text-ed-muted uppercase tracking-wider mb-2">
							Grupa · cel nauki
						</div>
						<div className="flex flex-wrap items-center gap-2 mb-2">
							<span className="text-[15px] font-medium text-ed-ink">{groupName}</span>
							<SharePill unionShare={groupUnionShare} />
							<KindChip kind={kind} />
						</div>
						{groupDescription && (
							<p className="text-[13px] leading-relaxed text-ed-muted">{groupDescription}</p>
						)}
					</div>
				) : (
					category && (
						<div>
							<div className="text-[11px] font-semibold text-ed-muted uppercase tracking-wider mb-2">
								Kategoria
							</div>
							<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ed-surface border border-ed-border rounded-full text-[13px] text-ed-muted font-medium">
								<Tag size={14} />
								{category}
							</span>
						</div>
					)
				)}

				{/* Market demand */}
				{marketPercentage != null && (
					<div>
						<div className="text-[11px] font-semibold text-ed-muted uppercase tracking-wider mb-2">
							Zapotrzebowanie rynkowe
						</div>
						<div className="font-mono font-semibold text-3xl text-ed-amber-text">
							{marketPercentage}%
						</div>
						<div className="text-[13px] text-ed-muted mt-0.5">
							ofert pracy wymaga tej kompetencji
						</div>
						<div className="h-2 bg-ed-surface rounded-full overflow-hidden mt-3">
							<div
								className={`h-full rounded-full ${STATUS_BAR_STYLES[status]} transition-all duration-700`}
								style={{ width: `${marketPercentage}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Footer CTA — „Spokojny ekspert": jednolite tła, bez glow ani skoku layoutu. */}
			<div className="px-6 py-4 border-t border-ed-border">
				{status === "missing" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-ed-ink text-ed-cream font-semibold text-sm hover:opacity-90 transition-opacity"
					>
						<Rocket size={18} />
						Zamknij tę lukę
					</Link>
				)}
				{status === "in_progress" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-ed-badge-bg border border-ed-amber text-ed-amber-text font-semibold text-sm hover:bg-ed-surface transition-colors"
					>
						<BookOpen size={18} />
						Kontynuuj naukę
					</Link>
				)}
				{status === "acquired" && (
					<div className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-ed-badge-bg border border-ed-amber text-ed-amber-text font-semibold text-sm">
						<CheckCircle size={18} />
						Kompetencja opanowana
					</div>
				)}
			</div>
		</div>
	);
}
