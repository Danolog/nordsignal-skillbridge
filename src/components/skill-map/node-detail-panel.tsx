"use client";

import { BookOpen, CheckCircle, Rocket, Tag, X } from "lucide-react";
import Link from "next/link";
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

const STATUS_BAR_STYLES: Record<string, string> = {
	acquired: "bg-emerald-500",
	in_progress: "bg-gradient-to-r from-indigo-500 to-cyan-400",
	missing: "bg-gradient-to-r from-indigo-500 to-cyan-400",
};

interface NodeDetailPanelProps {
	node: { data: SkillNodeData } | null;
	onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
	if (!node) return null;

	const { label, status, marketPercentage, category } = node.data;

	return (
		<div className="absolute top-0 right-0 bottom-0 w-[360px] bg-white border-l border-indigo-500/10 shadow-[-8px_0_32px_rgba(0,0,0,0.08)] z-30 flex flex-col animate-in slide-in-from-right duration-300 max-md:w-full">
			{/* Top accent bar */}
			<div
				className={`h-[3px] ${status === "acquired" ? "bg-emerald-500" : status === "in_progress" ? "bg-amber-400" : "bg-red-500"}`}
			/>

			{/* Header */}
			<div className="px-6 py-5 flex items-start justify-between border-b border-indigo-500/8">
				<div>
					<h3 className="font-[Nunito] font-extrabold text-lg text-slate-900 mb-2">{label}</h3>
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
				{/* Market demand */}
				{marketPercentage != null && (
					<div>
						<div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
							Zapotrzebowanie rynkowe
						</div>
						<div className="font-mono font-bold text-3xl bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent">
							{marketPercentage}%
						</div>
						<div className="text-[13px] text-slate-500 mt-0.5">
							ofert pracy wymaga tej kompetencji
						</div>
						<div className="h-2 bg-indigo-500/10 rounded-full overflow-hidden mt-3">
							<div
								className={`h-full rounded-full ${STATUS_BAR_STYLES[status]} shadow-[0_0_10px_rgba(99,102,241,0.25)] transition-all duration-700`}
								style={{ width: `${marketPercentage}%` }}
							/>
						</div>
					</div>
				)}

				{/* Category */}
				{category && (
					<div>
						<div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
							Kategoria
						</div>
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/6 border border-indigo-500/10 rounded-full text-[13px] text-indigo-500 font-medium">
							<Tag size={14} />
							{category}
						</span>
					</div>
				)}
			</div>

			{/* Footer CTA */}
			<div className="px-6 py-4 border-t border-indigo-500/8">
				{status === "missing" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-[Nunito] font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all"
					>
						<Rocket size={18} />
						Zamknij tę lukę
					</Link>
				)}
				{status === "in_progress" && (
					<Link
						href="/projects"
						className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-amber-400/12 border border-amber-400/20 text-amber-500 font-[Nunito] font-bold text-sm hover:bg-amber-400/20 transition-all"
					>
						<BookOpen size={18} />
						Kontynuuj naukę
					</Link>
				)}
				{status === "acquired" && (
					<div className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-emerald-600 font-[Nunito] font-bold text-sm">
						<CheckCircle size={18} />
						Kompetencja opanowana
					</div>
				)}
			</div>
		</div>
	);
}
