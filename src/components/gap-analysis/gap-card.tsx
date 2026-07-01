"use client";

import { ArrowRight, ChevronDown, HelpCircle, Loader2 } from "lucide-react";
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
	critical: { label: "Krytyczna" },
	important: { label: "Ważna" },
	nice_to_have: { label: "Warto znać" },
} as const;

export function GapCard({
	id,
	competencyName,
	priority,
	marketPercentage,
	whyImportant: initialWhyImportant,
	kind,
}: GapCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [whyText, setWhyText] = useState<string | null>(initialWhyImportant);
	const [loading, setLoading] = useState(false);
	const whySectionRef = useRef<HTMLDivElement>(null);

	// Pole whyImportant niepuste → akapit „Dlaczego to luka" pokazujemy wprost.
	// Puste → zostaje działający przycisk AI (fetch /api/gaps/{id}/why) — nie usuwamy funkcji.
	const hasInitialWhy = Boolean(initialWhyImportant?.trim());

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
			{/* Nagłówek: nazwa + kind-chip + tekstowy pill priorytetu */}
			<div className="ga-card-top">
				<span className="ga-card-name-wrap">
					<h3 className="ga-card-name">{competencyName}</h3>
					<KindChip kind={kind} />
				</span>
				<span className={`ga-prio ga-prio-${priority}`}>{config.label}</span>
			</div>

			{/* Mały pasek % popytu */}
			<div className="ga-demand-line">
				<div className="ga-demand-bar">
					<div
						className={`ga-demand-fill ga-demand-fill-${priority}`}
						style={{ width: `${marketPercentage}%` }}
					/>
				</div>
				<span className="ga-demand-text">{marketPercentage}% ofert pracy</span>
			</div>

			{/* „Dlaczego to luka" — statycznie jeśli pole niepuste, inaczej przycisk AI */}
			{hasInitialWhy ? (
				<div className="ga-why-body">
					<p className="ga-why-label">Dlaczego to luka</p>
					{whyText?.split("\n").map((paragraph) =>
						paragraph.trim() ? (
							<p key={paragraph.slice(0, 40)} className="ga-why-text">
								{paragraph}
							</p>
						) : null,
					)}
				</div>
			) : (
				<>
					<button
						type="button"
						className={`ga-why-btn ${expanded ? "expanded" : ""}`}
						onClick={handleToggleWhy}
					>
						<HelpCircle size={14} />
						Dlaczego to ważne?
						<ChevronDown size={12} className="ga-why-chevron" />
					</button>
					<div ref={whySectionRef} className="ga-why-section">
						<div className="ga-why-content">
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
				</>
			)}

			{/* Stopka: bursztynowy link do projektów (nawigacja zachowana) */}
			<div className="ga-card-foot">
				<Link href={`/projects?gapId=${id}`} className="ga-find-link">
					Znajdź projekty
					<ArrowRight size={14} />
				</Link>
			</div>
		</div>
	);
}
