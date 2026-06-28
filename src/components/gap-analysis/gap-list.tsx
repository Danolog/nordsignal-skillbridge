"use client";

import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { SharePill } from "@/components/skill-map/group-context";
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
	// fallback do dzisiejszej płaskiej siatki (spec G2). Liczenie luk/pokrycia bez zmian (page.tsx).
	const hasGroups = gaps.some((g) => g.groupName);

	return (
		<>
			{/* Summary stats — bez zmian (nadrzędny kontekst całej analizy luk) */}
			<div className="ga-stats">
				<div className="ga-stat-card ga-stat-critical">
					<div className="ga-stat-label">Krytyczne</div>
					<div className="ga-stat-value ga-stat-value-critical">{stats.critical}</div>
					<div className="ga-stat-badge-row">
						<span className="ga-badge ga-badge-critical">
							<span className="ga-badge-dot" />
							Krytyczna
						</span>
					</div>
				</div>
				<div className="ga-stat-card ga-stat-important">
					<div className="ga-stat-label">Ważne</div>
					<div className="ga-stat-value ga-stat-value-important">{stats.important}</div>
					<div className="ga-stat-badge-row">
						<span className="ga-badge ga-badge-important">
							<span className="ga-badge-dot" />
							Ważna
						</span>
					</div>
				</div>
				<div className="ga-stat-card ga-stat-nice">
					<div className="ga-stat-label">Warto znać</div>
					<div className="ga-stat-value ga-stat-value-nice">{stats.niceToHave}</div>
					<div className="ga-stat-badge-row">
						<span className="ga-badge ga-badge-nice">
							<span className="ga-badge-dot" />
							Warto znać
						</span>
					</div>
				</div>
			</div>

			{hasGroups ? <GroupedGaps gaps={gaps} /> : <FlatGaps gaps={gaps} />}
		</>
	);
}

/** Płaska siatka kart (fallback G2 — gdy żadna luka nie ma grupy). Zachowanie sprzed C5. */
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
 * Luki pogrupowane w akordeon z nagłówkiem grupy (nazwa + unionShare + proza „po co").
 * Realizuje decyzję Darka #5 „cel nauki cały czas widoczny" BEZ kliknięcia — opis grupy
 * jest stale na ekranie. Wzorzec akordeonu i mikro-komponenty (SharePill) reużyte z C4.
 * Grupa z luką krytyczną otwarta domyślnie; reszta zwinięta — oddech, nie ściana (spec 5.2).
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
				const hasCritical = group.gaps.some((g) => g.priority === "critical");
				return (
					<details key={name} className="ga-group" open={hasCritical}>
						<summary className="ga-group-summary">
							<span className="ga-group-name">{name}</span>
							{/* „Pozostałe" (G5): neutralny kubełek bez SharePill ani prozy — nie udajemy kontekstu. */}
							{!isLeftover && <SharePill unionShare={group.unionShare} />}
						</summary>
						{!isLeftover && group.description && (
							<p className="ga-group-desc">{group.description}</p>
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
					</details>
				);
			})}
		</div>
	);
}
