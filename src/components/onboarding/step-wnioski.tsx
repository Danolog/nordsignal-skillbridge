"use client";

/**
 * StepWnioski — krok 4 onboardingu „Wnioski" (ETAP D). Domyka onboarding
 * z DANYCH POLICZALNYCH: cel + pokrycie rynku + grupy z opisami + plan nauki (luki).
 *
 * HITL (CLAUDE.md §7, ADR-004): luki = PLAN NAUKI, nie werdykt/rekomendacja. Pokrycie =
 * opis stanu wiedzy względem ofert, NIGDY obietnica pracy ani ranking ścieżek. Bez widełek.
 *
 * Liczby z PAMIĘCI wizarda tymi samymi czystymi funkcjami (`computeMarketCoverage`,
 * `deriveGaps`) co backend przy zapisie → liczba tu == pulpit/analiza luk (zero rozjazdu,
 * Built-to-Sell). Komponent jest bezstanowy względem celu, więc po „zmień kierunku" (G)
 * pokazuje nowy cel automatycznie.
 */

import { ArrowRight, BookOpen } from "lucide-react";
import { useMemo } from "react";
import { SharePill } from "@/components/skill-map/group-context";
import { Button } from "@/components/ui/button";
import {
	computeMarketCoverage,
	deriveGaps,
	type GapPriority,
	type GroupCatalog,
	type MarketCatalogItem,
	type PossessionLevel,
} from "@/lib/onboarding/market-catalog";

/** Ile pierwszych luk pokazujemy wprost (reszta → „i jeszcze N w analizie luk"). */
const TOP_GAPS = 5;

const PRIORITY_LABEL: Record<GapPriority, string> = {
	critical: "Krytyczne",
	important: "Ważne",
	nice_to_have: "Warto znać",
};

interface StepWnioskiProps {
	careerGoal: string;
	/** Katalog rynku (posortowany, zaadnotowany sylabusem) — ŹRÓDŁO pokrycia i luk. */
	catalog: MarketCatalogItem[];
	/** Widok grupowy (warstwa opisowa); [] → bez sekcji grup. */
	groups: GroupCatalog[];
	/** Wybór studenta: nazwa → poziom (brak klucza = Brak = luka). */
	selections: Record<string, PossessionLevel>;
	/** Adnotacja-zastrzeżenie profilu ścieżki (null = brak). */
	profileNote: string | null;
	/** Czy użyto sylabusa (pokazuje punkt „Start z toku studiów"). */
	syllabusUsed: boolean;
	/** Domknięcie onboardingu + nawigacja; target domyślny = /dashboard. */
	onComplete: (target?: string) => void;
	completing: boolean;
}

export function StepWnioski({
	careerGoal,
	catalog,
	groups,
	selections,
	profileNote,
	syllabusUsed,
	onComplete,
	completing,
}: StepWnioskiProps) {
	const view = useMemo(() => {
		const selectedLevels = Object.values(selections);
		const selectedNames = Object.keys(selections);
		const coverage = computeMarketCoverage(catalog.length, selectedLevels);
		const gaps = deriveGaps(catalog, selectedNames);
		const sumHours = gaps.reduce((s, g) => s + g.estimatedHours, 0);
		const stats: Record<GapPriority, number> = { critical: 0, important: 0, nice_to_have: 0 };
		for (const g of gaps) stats[g.priority] += 1;
		// „Start z toku studiów" = pokrycie liczone TYLKO z pozycji oznaczonych w sylabusie.
		const startLevels = catalog
			.filter((i) => i.inSyllabus && selections[i.competencyName] !== undefined)
			.map((i) => selections[i.competencyName]);
		const startCoverage = computeMarketCoverage(catalog.length, startLevels);
		return { coverage, gaps, sumHours, stats, startCoverage };
	}, [catalog, selections]);

	// Defensywnie: na krok 4 normalnie nie wchodzi się z pustym katalogiem (gate kroku 3),
	// ale gdyby — łagodny stan zamiast dzielenia bez sensu.
	if (catalog.length === 0) {
		return (
			<div className="flex flex-col items-center gap-6 py-4 text-center">
				<div className="max-w-sm">
					<h2 className="font-heading text-2xl font-extrabold mb-2">Brak katalogu dla tej roli</h2>
					<p className="text-sm text-muted-foreground">
						Wróć do kroku „Cel kariery" i wybierz jedną z realnych ścieżek z rynku.
					</p>
				</div>
				<Button onClick={() => onComplete()} disabled={completing} className="ob-btn-primary gap-2">
					Przejdź do pulpitu
					<ArrowRight className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	const { coverage, gaps, sumHours, stats, startCoverage } = view;
	const noGaps = gaps.length === 0;
	const topGaps = gaps.slice(0, TOP_GAPS);
	const restGaps = gaps.length - topGaps.length;
	const showStart = syllabusUsed && startCoverage > 0 && startCoverage < coverage;

	return (
		<div className="space-y-6">
			{/* 1. Nagłówek + kotwica celu/pokrycia */}
			<header className="space-y-2">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Wnioski
				</p>
				<h2 className="font-heading text-2xl font-extrabold text-foreground">
					Masz plan. Zobacz, od czego zacząć.
				</h2>
				<p className="text-sm text-foreground">
					Cel: <span className="font-medium">{careerGoal}</span> — pokrywasz{" "}
					<span className="font-semibold text-ed-amber-text">{coverage}%</span> kompetencji, których
					szuka rynek dla tej roli.
				</p>
				<p className="text-xs text-muted-foreground">
					To pokrycie umiejętności z ofert pracy, nie gwarancja zatrudnienia. Cel zmienisz w każdej
					chwili — na pulpicie jest „Zmień kierunek".
				</p>
			</header>

			{/* 2. Oś pokrycia (Teraz; opcjonalnie Start z toku studiów) */}
			<section
				className="rounded-lg border border-border bg-card p-4"
				aria-label={`Pokrycie kompetencji rynku: ${coverage} procent`}
			>
				<div className="relative h-2.5 rounded-full bg-ed-surface">
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-ed-amber transition-all"
						style={{ width: `${coverage}%` }}
					/>
					{showStart && (
						<div
							className="absolute inset-y-[-3px] w-0.5 bg-ed-ink/50"
							style={{ left: `${startCoverage}%` }}
							aria-hidden="true"
						/>
					)}
				</div>
				<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
					{showStart ? (
						<span>Start z toku studiów: {startCoverage}%</span>
					) : (
						<span>Twój start</span>
					)}
					<span className="font-medium text-ed-amber-text">Teraz: {coverage}%</span>
				</div>
			</section>

			{/* 5. profileNote — uczciwe zastrzeżenie, jak czytać te liczby */}
			{profileNote && (
				<p className="rounded-md border border-ed-amber bg-ed-badge-bg px-3 py-2 text-xs text-ed-amber-text">
					{profileNote}
				</p>
			)}

			{/* 3. Grupy e-CF z opisami + ile masz / ile brakuje */}
			{groups.length > 0 && (
				<section className="space-y-4">
					<h3 className="font-heading text-lg font-semibold text-foreground">
						Obszary kompetencji dla tej roli
					</h3>
					<div className="space-y-3">
						{groups.map((group) => {
							const total = group.items.length;
							const have = group.items.filter(
								(i) => selections[i.competencyName] !== undefined,
							).length;
							return (
								<div key={group.name} className="rounded-lg border border-border bg-card p-3">
									<GroupHeader
										name={group.name}
										unionShare={group.unionShare}
										description={group.description}
										have={have}
										total={total}
									/>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* 4. Plan nauki (luki) — sedno */}
			<section className="space-y-3">
				<div>
					<h3 className="font-heading text-lg font-semibold text-foreground">Twój plan nauki</h3>
					<p className="text-sm text-muted-foreground">
						Czego jeszcze nie zaznaczyłeś — to dobiera się projektami, w swoim tempie.
					</p>
				</div>

				{noGaps ? (
					<div className="rounded-lg border border-ed-amber bg-ed-badge-bg p-4 text-sm text-ed-amber-text">
						Zaznaczyłeś wszystko z katalogu rynku dla tej roli. Czas pokazać to projektami — wybierz
						pierwszy.
					</div>
				) : (
					<>
						<div className="grid grid-cols-3 gap-2">
							<PriorityTile label={PRIORITY_LABEL.critical} count={stats.critical} accent />
							<PriorityTile label={PRIORITY_LABEL.important} count={stats.important} />
							<PriorityTile label={PRIORITY_LABEL.nice_to_have} count={stats.nice_to_have} />
						</div>
						<p className="text-sm text-muted-foreground">
							Szacunkowo <span className="font-semibold text-foreground">{sumHours} h</span> nauki
							na start.
						</p>
						<ul className="space-y-2">
							{topGaps.map((g) => (
								<li
									key={g.competencyName}
									className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
								>
									<span className="text-sm font-medium text-foreground">
										{g.competencyName}
										<span className="ml-2 font-mono text-xs text-muted-foreground">
											{g.marketPercentage}% ofert
										</span>
									</span>
									<span className="font-mono text-xs text-muted-foreground">
										{g.estimatedHours}h
									</span>
								</li>
							))}
						</ul>
						{restGaps > 0 && (
							<p className="text-xs text-muted-foreground">
								…i jeszcze {restGaps} {restGaps === 1 ? "pozycja" : "pozycji"} w analizie luk.
							</p>
						)}
					</>
				)}
			</section>

			{/* 6. Stopka HITL + CTA */}
			<footer className="space-y-4 border-t border-border pt-5">
				<p className="text-xs text-muted-foreground">
					To Twoja własna deklaracja, nie ocena z zewnątrz. Poziomy może później potwierdzić
					wykładowca.
				</p>
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button
						onClick={() => onComplete()}
						disabled={completing}
						className="ob-btn-primary gap-2"
					>
						{completing ? (
							<>
								<BookOpen className="h-4 w-4 animate-spin" />
								Kończę…
							</>
						) : (
							<>
								Przejdź do pulpitu
								<ArrowRight className="h-4 w-4" />
							</>
						)}
					</Button>
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<button
							type="button"
							onClick={() => onComplete("/gap-analysis")}
							disabled={completing}
							className="font-medium text-ed-amber-text hover:underline disabled:opacity-50"
						>
							Zobacz analizę luk
						</button>
						<button
							type="button"
							onClick={() => onComplete("/projects")}
							disabled={completing}
							className="font-medium text-ed-amber-text hover:underline disabled:opacity-50"
						>
							Wybierz pierwszy projekt
						</button>
					</div>
				</div>
			</footer>
		</div>
	);
}

/** Kafel priorytetu planu nauki (count + etykieta). Akcent (bursztyn) dla krytycznych. */
function PriorityTile({
	label,
	count,
	accent,
}: {
	label: string;
	count: number;
	accent?: boolean;
}) {
	return (
		<div
			className={[
				"rounded-lg border bg-card px-3 py-3 text-center",
				accent ? "border-ed-amber" : "border-border",
			].join(" ")}
		>
			<div
				className={[
					"font-heading text-2xl font-extrabold",
					accent ? "text-ed-amber-text" : "text-foreground",
				].join(" ")}
			>
				{count}
			</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}

/**
 * Nagłówek grupy w Wnioskach: nazwa + udział grupy (SharePill) + licznik „Masz X z Y" +
 * opis (proza). Lokalny (nie współdzielony ze step 3) — Wnioski pokazują licznik posiadania,
 * krok 3 ma toggle/clamp; rozdzielone, by uniknąć regresji kroku 3.
 */
function GroupHeader({
	name,
	unionShare,
	description,
	have,
	total,
}: {
	name: string;
	unionShare: number | null;
	description: string | null;
	have: number;
	total: number;
}) {
	return (
		<div className="space-y-1">
			<div className="flex items-baseline justify-between gap-3">
				<h4 className="font-heading text-base font-semibold text-foreground">{name}</h4>
				<SharePill unionShare={unionShare} />
			</div>
			<p className="text-xs font-medium text-ed-amber-text">
				Masz {have} z {total}
			</p>
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
	);
}
