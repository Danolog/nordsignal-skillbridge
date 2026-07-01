"use client";

import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { LeafKind } from "@/lib/db/data/anchor-config";
import { GapCard } from "./gap-card";

type GapPriority = "critical" | "important" | "nice_to_have";

interface Gap {
	id: string;
	competencyName: string;
	priority: GapPriority;
	marketPercentage: number;
	estimatedHours: number;
	whyImportant: string | null;
	// Kontekst grupy (Partia 5, C5) — additive, dokładany SERWEROWO przez getCompetencyContext
	// w gap-analysis/page.tsx. Nieobecny dla ścieżek spoza career-model.json → fallback płaski.
	groupName?: string | null;
	groupDescription?: string | null;
	groupUnionShare?: number | null;
	kind?: LeafKind | null;
}

interface GapListProps {
	gaps: Gap[];
	stats: { critical: number; important: number; niceToHave: number };
}

const LEFTOVER = "Pozostałe";

interface GapGroup {
	name: string;
	description: string | null;
	unionShare: number | null;
	gaps: Gap[];
}

export function GapList({ gaps, stats }: GapListProps) {
	if (gaps.length === 0) {
		return (
			<div className="ga-empty">
				<div className="ga-empty-icon">
					<CheckCircle size={36} strokeWidth={1.5} />
				</div>
				<h2 className="ga-empty-title">Gratulacje!</h2>
				<p className="ga-empty-desc">
					Twój profil pokrywa wymagania rynku pracy. Nie znaleźliśmy żadnych luk kompetencyjnych.
				</p>
				<Link href="/dashboard" className="ga-empty-link">
					Wróć do Dashboard
					<ArrowRight size={16} />
				</Link>
			</div>
		);
	}

	// Grupy to warstwa OPISOWA. Brak grup (starsza ścieżka / cel spoza career-model.json) ≠ błąd —
	// fallback do płaskiej siatki (spec G2). Liczenie luk/pokrycia bez zmian (page.tsx).
	const hasGroups = gaps.some((g) => g.groupName);

	return (
		<>
			{/* Podsumowanie: jeden poziomy pasek z kropkami koloru zamiast trzech kart statystyk */}
			<div
				className="ga-summary"
				role="img"
				aria-label={`Podsumowanie priorytetów: ${stats.critical} krytycznych, ${stats.important} ważnych, ${stats.niceToHave} warto znać`}
			>
				<span className="ga-summary-item">
					<span className="ga-sdot ga-sdot-crit" /> Krytyczne {stats.critical}
				</span>
				<span className="ga-summary-item">
					<span className="ga-sdot ga-sdot-warn" /> Ważne {stats.important}
				</span>
				<span className="ga-summary-item">
					<span className="ga-sdot ga-sdot-ok" /> Warto {stats.niceToHave}
				</span>
			</div>

			{hasGroups ? <GroupedGaps gaps={gaps} /> : <FlatGaps gaps={gaps} />}
		</>
	);
}

/** Płaska siatka kart (fallback G2 — gdy żadna luka nie ma grupy). */
function FlatGaps({ gaps }: { gaps: Gap[] }) {
	return (
		<div className="ga-grid">
			{gaps.map((gap) => (
				<GapCard
					key={gap.id}
					id={gap.id}
					competencyName={gap.competencyName}
					priority={gap.priority}
					marketPercentage={gap.marketPercentage}
					estimatedHours={gap.estimatedHours}
					whyImportant={gap.whyImportant}
					kind={gap.kind}
				/>
			))}
		</div>
	);
}

/**
 * Luki pogrupowane w obszary rynku. Nad każdą grupą STALE widoczny blok komentarza
 * (nazwa serif + bursztynowa pigułka „% ofert ścieżki" + proza „po co się uczysz") —
 * realizuje decyzję Darka #5 „cel nauki cały czas widoczny" BEZ kliknięcia (bez akordeonu).
 */
function GroupedGaps({ gaps }: { gaps: Gap[] }) {
	// Kolejność grup = pierwsze wystąpienie. Luki przychodzą posortowane (krytyczne wg popytu),
	// więc grupa z najmocniejszą luką jest pierwsza — deterministyczne, bez przeliczania.
	const order: string[] = [];
	const buckets = new Map<string, GapGroup>();
	for (const gap of gaps) {
		const name = gap.groupName ?? LEFTOVER;
		let bucket = buckets.get(name);
		if (!bucket) {
			bucket = {
				name,
				description: gap.groupDescription ?? null,
				unionShare: gap.groupUnionShare ?? null,
				gaps: [],
			};
			buckets.set(name, bucket);
			order.push(name);
		}
		bucket.gaps.push(gap);
	}

	return (
		<div className="ga-groups">
			{order.map((name) => {
				const group = buckets.get(name);
				if (!group) return null;
				const isLeftover = name === LEFTOVER;
				return (
					<section key={name} className="ga-group">
						{isLeftover ? (
							// „Pozostałe" (G5): neutralny kubełek bez pigułki ani prozy — nie udajemy kontekstu.
							<h2 className="ga-grp-leftover-name">{name}</h2>
						) : (
							<div className="ga-grp-comment">
								<div className="ga-grp-comment-top">
									<h2 className="ga-grp-comment-name">{name}</h2>
									{group.unionShare != null && (
										<span className="ga-grp-share">{group.unionShare}% ofert ścieżki</span>
									)}
								</div>
								{group.description && <p className="ga-grp-comment-desc">{group.description}</p>}
							</div>
						)}
						<div className="ga-grid">
							{group.gaps.map((gap) => (
								<GapCard
									key={gap.id}
									id={gap.id}
									competencyName={gap.competencyName}
									priority={gap.priority}
									marketPercentage={gap.marketPercentage}
									estimatedHours={gap.estimatedHours}
									whyImportant={gap.whyImportant}
									kind={gap.kind}
								/>
							))}
						</div>
					</section>
				);
			})}
		</div>
	);
}
