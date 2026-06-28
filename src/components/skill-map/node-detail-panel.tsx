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
	acquired: "bg-emerald-500/10 text-emerald-600",
	in_progress: "bg-amber-400/10 text-amber-500",
	missing: "bg-red-500/10 text-red-500",
};

const STATUS_DOT_STYLES: Record<string, string> = {
	acquired: "bg-emerald-500",
	in_progress: "bg-amber-400",
	missing: "bg-red-500",
};

// „Spokojny ekspert": pasek postępu jednolitym kolorem, bez gradientu i bez glow.
const STATUS_BAR_STYLES: Record<string, string> = {
	acquired: "bg-emerald-500",
	in_progress: "bg-amber-500",
	missing: "bg-red-500",
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
		<div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white border-l border-slate-200 shadow-md z-30 flex flex-col animate-in slide-in-from-right duration-300 max-md:w-full">
			{/* Top accent bar */}
			<div
				className={`h-[3px] ${status === "acquired" ? "bg-emerald-500" : status === "in_progress" ? "bg-amber-400" : "bg-red-500"}`}
			/>

			{/* Header */}
			<div className="px-6 py-5 flex items-start justify-between border-b border-slate-200">
				<div>
					<h3 className="font-semibold text-lg text-slate-900 mb-2">{label}</h3>
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
					className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
						<div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
							Grupa · cel nauki
						</div>
						<div className="flex flex-wrap items-center gap-2 mb-2">
							<span className="text-[15px] font-medium text-slate-800">{groupName}</span>
							<SharePill unionShare={groupUnionShare} />
							<KindChip kind={kind} />
						</div>
						{groupDescription && (
							<p className="text-[13px] leading-relaxed text-slate-500">{groupDescription}</p>
						)}
					</div>
				) : (
					category && (
						<div>
							<div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
								Kategoria
							</div>
							<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[13px] text-slate-600 font-medium">
								<Tag size={14} />
								{category}
							</span>
						</div>
					)
				)}

				{/* Market demand */}
				{marketPercentage != null && (
					<div>
						<div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
							Zapotrzebowanie rynkowe
						</div>
						<div className="font-mono font-semibold text-3xl text-indigo-700">
							{marketPercentage}%
						</div>
						<div className="text-[13px] text-slate-500 mt-0.5">
							ofert pracy wymaga tej kompetencji
						</div>
						<div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
							<div
								className={`h-full rounded-full ${STATUS_BAR_STYLES[status]} transition-all duration-700`}
								style={{ width: `${marketPercentage}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Footer CTA — „Spokojny ekspert": jednolite tła, bez glow ani skoku layoutu. */}
			<div className="px-6 py-4 border-t border-slate-200">
				{status === "missing" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
					>
						<Rocket size={18} />
						Zamknij tę lukę
					</Link>
				)}
				{status === "in_progress" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors"
					>
						<BookOpen size={18} />
						Kontynuuj naukę
					</Link>
				)}
				{status === "acquired" && (
					<div className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm">
						<CheckCircle size={18} />
						Kompetencja opanowana
					</div>
				)}
			</div>
		</div>
	);
}
