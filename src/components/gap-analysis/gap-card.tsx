"use client";

import {
	ArrowLeftRight,
	ArrowRight,
	BarChart3,
	Box,
	Brain,
	ChevronDown,
	Clock,
	Code,
	Cpu,
	Database,
	GitBranch,
	Globe,
	HelpCircle,
	Loader2,
	Shield,
	Sparkles,
	Terminal,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { KindChip } from "@/components/skill-map/group-context";
import type { LeafKind } from "@/lib/db/data/anchor-config";

type GapPriority = "critical" | "important" | "nice_to_have";

interface GapCardProps {
	id: string;
	competencyName: string;
	priority: GapPriority;
	marketPercentage: number;
	estimatedHours: number;
	whyImportant: string | null;
	// Etykieta typu kompetencji (narzędzie/koncepcja) — Partia 5, C5. Reużywa KindChip z C4.
	// Tylko tool/concept dają chip; reszta (cert/meta/soft/null) → brak (KindChip zwraca null).
	kind?: LeafKind | null;
}

const priorityConfig = {
	critical: { label: "Krytyczna", badgeClass: "ga-badge-critical", ringClass: "ga-ring-critical" },
	important: { label: "Ważna", badgeClass: "ga-badge-important", ringClass: "ga-ring-important" },
	nice_to_have: {
		label: "Warto znać",
		badgeClass: "ga-badge-nice",
		ringClass: "ga-ring-nice",
	},
} as const;

const competencyIcons: Record<string, typeof Code> = {
	python: Code,
	sql: Database,
	tableau: BarChart3,
	"power bi": BarChart3,
	"machine learning": Sparkles,
	etl: ArrowLeftRight,
	docker: Box,
	git: GitBranch,
	"deep learning": Brain,
	cybersecurity: Shield,
	api: Globe,
	linux: Terminal,
	cloud: Cpu,
};

function getCompetencyIcon(name: string) {
	const lower = name.toLowerCase();
	for (const [keyword, Icon] of Object.entries(competencyIcons)) {
		if (lower.includes(keyword)) return Icon;
	}
	return Code;
}

// SVG ring: circumference for r=24 = 2*PI*24 ≈ 150.8
const RING_CIRCUMFERENCE = 150.8;

export function GapCard({
	id,
	competencyName,
	priority,
	marketPercentage,
	estimatedHours,
	whyImportant: initialWhyImportant,
	kind,
}: GapCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [whyText, setWhyText] = useState<string | null>(initialWhyImportant);
	const [loading, setLoading] = useState(false);
	const whySectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = whySectionRef.current;
		if (!el) return;
		if (expanded) {
			el.style.maxHeight = `${el.scrollHeight}px`;
		} else {
			el.style.maxHeight = "0px";
		}
	}, [expanded]);

	const config = priorityConfig[priority];
	const Icon = getCompetencyIcon(competencyName);
	const ringOffset = RING_CIRCUMFERENCE * (1 - marketPercentage / 100);

	const handleToggleWhy = useCallback(async () => {
		if (!expanded && !whyText) {
			setExpanded(true);
			setLoading(true);
			try {
				const res = await fetch(`/api/gaps/${id}/why`, { method: "POST" });
				if (!res.ok) throw new Error("Błąd generowania");
				const data = await res.json();
				setWhyText(data.whyImportant);
			} catch {
				toast.error("Nie udało się wygenerować wyjaśnienia");
				setExpanded(false);
			} finally {
				setLoading(false);
			}
		} else {
			setExpanded(!expanded);
		}
	}, [expanded, whyText, id]);

	return (
		<div className={`ga-card ga-card-${priority}`}>
			{/* Header: icon + ring */}
			<div className="ga-card-header">
				<div className={`ga-card-icon-wrap ${config.badgeClass}`}>
					<Icon size={28} strokeWidth={1.5} />
				</div>
				<div className="ga-card-ring-wrap">
					<svg viewBox="0 0 56 56" className="ga-card-ring-svg" aria-hidden="true">
						<circle cx="28" cy="28" r="24" className="ga-ring-bg" />
						<circle
							cx="28"
							cy="28"
							r="24"
							className={`ga-ring-fill ${config.ringClass}`}
							strokeDasharray={RING_CIRCUMFERENCE}
							strokeDashoffset={ringOffset}
						/>
					</svg>
					<span className={`ga-card-ring-value ${config.ringClass}`}>{marketPercentage}%</span>
				</div>
			</div>

			{/* Body */}
			<div className="ga-card-body">
				<div className="ga-card-name-row">
					<span className="ga-card-name-wrap">
						<h3 className="ga-card-name">{competencyName}</h3>
						<KindChip kind={kind} />
					</span>
					<span className={`ga-badge ${config.badgeClass}`}>
						<span className="ga-badge-dot" />
						{config.label}
					</span>
				</div>
				<div className="ga-card-meta">
					<span className="ga-card-meta-item">
						<Clock size={14} />
						{estimatedHours}h nauki
					</span>
					<span className="ga-card-meta-item">
						<TrendingUp size={14} />
						{marketPercentage}% ofert pracy
					</span>
				</div>
				<div className="ga-demand-bar-wrap">
					<div className="ga-demand-label">Popyt rynkowy</div>
					<div className="ga-demand-bar">
						<div
							className={`ga-demand-fill ga-demand-fill-${priority}`}
							style={{ width: `${marketPercentage}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="ga-card-footer">
				<button
					type="button"
					className={`ga-why-btn ${expanded ? "expanded" : ""}`}
					onClick={handleToggleWhy}
				>
					<HelpCircle size={14} />
					Dlaczego to ważne?
					<ChevronDown size={12} className="ga-why-chevron" />
				</button>
				<Link href={`/projects?gapId=${id}`} className="ga-close-btn">
					Znajdź projekty
					<ArrowRight size={14} />
				</Link>
			</div>

			{/* Expandable why section */}
			<div ref={whySectionRef} className="ga-why-section">
				<div className="ga-why-content">
					<div className="ga-why-divider" />
					{loading ? (
						<div className="ga-why-loading">
							<Loader2 size={20} className="ga-why-spinner" />
							Generuję wyjaśnienie...
						</div>
					) : (
						whyText && (
							<div className="ga-why-inner">
								{whyText
									.split("\n")
									.map((paragraph) =>
										paragraph.trim() ? <p key={paragraph.slice(0, 40)}>{paragraph}</p> : null,
									)}
							</div>
						)
					)}
				</div>
			</div>
		</div>
	);
}
