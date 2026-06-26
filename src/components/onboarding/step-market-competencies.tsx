"use client";

/**
 * StepMarketCompetencies — scalony krok: wybór kompetencji RYNKU + poziom 1–4 na
 * JEDNYM ekranie (Partia 4, elementy 2/4/5; decyzje Sophii D4/D5).
 *
 * Źródło: katalog rynku (`/api/onboarding/market-catalog`) per cel kariery, sortowany
 * malejąco wg popytu. Student zaznacza TYLKO to, co ma (jeden z 3 poziomów posiadania);
 * niezaznaczone = Brak = luka. Próg „min 5" ZNIESIONY (0 dozwolone, D5).
 *
 * Nagłówek zatrudnialności (9c B1–B4): „% pokrycia kompetencji wymaganych przez rynek".
 * NIGDY obietnica/szansa pracy. Sylabus = adnotacja „w programie studiów" (D4), nie generator.
 *
 * UI minimalne/funkcjonalne — Jack restyluje wg makiet Mili (Partia 5). Tu warstwa
 * logiki/danych: kontrakt, skala biegłości, pokrycie. NIE robimy pełnej przebudowy wizualnej.
 */

import { AlertCircle, BookCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	computeMarketCoverage,
	type MarketCatalogItem,
	POSSESSION_OPTIONS,
	type PossessionLevel,
} from "@/lib/onboarding/market-catalog";

interface StepMarketCompetenciesProps {
	careerGoal: string;
	/** Katalog rynku (posortowany + zaadnotowany sylabusem). */
	catalog: MarketCatalogItem[];
	/** Wybór studenta: nazwa kompetencji → poziom posiadania (brak klucza = Brak). */
	selections: Record<string, PossessionLevel>;
	/** Zmiana poziomu; `null` = odznaczenie (powrót do Brak). */
	onChange: (name: string, level: PossessionLevel | null) => void;
	loading: boolean;
	error: boolean;
	onRetry: () => void;
	/** false → cel spoza 23 realnych ścieżek (katalog pusty) → poproś o wybór realnej. */
	isRealCareerGoal: boolean;
}

export function StepMarketCompetencies({
	careerGoal,
	catalog,
	selections,
	onChange,
	loading,
	error,
	onRetry,
	isRealCareerGoal,
}: StepMarketCompetenciesProps) {
	// Pokrycie (9c B1) — liczone na żywo z wyboru. Mianownik = cały katalog rynku.
	const selectedLevels = Object.values(selections);
	const coverage = computeMarketCoverage(catalog.length, selectedLevels);
	const selectedCount = selectedLevels.length;

	if (loading) {
		return (
			<div className="space-y-3" aria-busy="true">
				<div className="h-20 rounded-lg bg-muted animate-pulse" />
				{Array.from({ length: 6 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: szkielet ładowania, kolejność stała
					<div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-border bg-card p-6 text-center space-y-4">
				<AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">
					Nie udało się wczytać kompetencji rynku dla celu „{careerGoal}".
				</p>
				<Button variant="outline" onClick={onRetry}>
					Spróbuj ponownie
				</Button>
			</div>
		);
	}

	// Cel spoza 23 realnych ścieżek (np. wolny tekst z Pomocnika) — katalog pusty.
	// Uczciwie: poproś o wybór realnej ścieżki zamiast pokazać 0 kompetencji bez kontekstu.
	if (!isRealCareerGoal || catalog.length === 0) {
		return (
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
				<AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
				<p className="text-sm text-amber-800">
					Dla celu „{careerGoal}" nie mamy jeszcze katalogu kompetencji z rynku. Wróć do kroku „Cel
					kariery" i wybierz jedną z realnych ścieżek z listy.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* Nagłówek zatrudnialności (9c B1–B4) — % POKRYCIA, nigdy obietnica pracy. */}
			<section
				className="rounded-lg border border-border bg-card p-4"
				aria-label={`Pokrycie kompetencji wymaganych przez rynek: ${coverage} procent`}
			>
				<div className="flex items-baseline gap-2">
					<span className="font-heading text-3xl font-extrabold text-foreground">{coverage}%</span>
					<span className="text-sm font-medium text-muted-foreground">
						pokrycia kompetencji wymaganych przez rynek dla roli {careerGoal}
					</span>
				</div>
				{/* B2: jawne „to pokrycie umiejętności z ofert, nie gwarancja zatrudnienia". */}
				<p className="mt-1 text-xs text-muted-foreground">
					To pokrycie umiejętności z ofert pracy, nie gwarancja zatrudnienia.
				</p>
				<p className="mt-3 text-sm text-foreground">
					Uczysz się tego, czego realnie chcą pracodawcy. Oznaczone „w programie studiów" dostajesz
					z toku — resztę dobierasz projektami.
				</p>
			</section>

			{/* Pusty stan = zachęta, nie błąd (D5). „Czysta karta", nie „0/5". */}
			{selectedCount === 0 && (
				<p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
					Zaznacz to, co już potrafisz — choćby jedną rzecz. Reszta to Twój plan nauki.
				</p>
			)}

			{/* Lista kompetencji rynku, malejąco wg popytu. Każda: nazwa + % + adnotacja + poziom. */}
			<ul className="space-y-2">
				{catalog.map((item) => {
					const level = selections[item.competencyName] ?? null;
					return (
						<li
							key={`${item.competencyName}-${item.category}`}
							className="rounded-lg border border-border bg-card p-3"
						>
							<div className="mb-2 flex items-center justify-between gap-2">
								<span className="text-sm font-medium text-foreground">
									{item.competencyName}
									<span className="ml-2 font-mono text-xs text-muted-foreground">
										{item.demandPercentage}% ofert
									</span>
								</span>
								{item.inSyllabus && (
									<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
										<BookCheck className="h-3.5 w-3.5" aria-hidden="true" />w programie studiów
									</span>
								)}
							</div>
							{/* Selektor 4 stanów: Brak (odznacz) + 3 poziomy posiadania. */}
							<fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
								<legend className="sr-only">Poziom: {item.competencyName}</legend>
								<LevelButton
									selected={level === null}
									label="Brak"
									title="Nie znam — to luka do nauki"
									onClick={() => onChange(item.competencyName, null)}
								/>
								{POSSESSION_OPTIONS.map((opt) => (
									<LevelButton
										key={opt.level}
										selected={level === opt.level}
										label={opt.tier}
										title={opt.label}
										onClick={() => onChange(item.competencyName, opt.level)}
									/>
								))}
							</fieldset>
						</li>
					);
				})}
			</ul>

			<p className="text-xs text-muted-foreground" aria-live="polite">
				Zaznaczono {selectedCount} z {catalog.length} kompetencji rynku.
			</p>
		</div>
	);
}

function LevelButton({
	selected,
	label,
	title,
	onClick,
}: {
	selected: boolean;
	label: string;
	title: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			title={title}
			onClick={onClick}
			className={[
				"rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
				selected
					? "border-indigo-500 bg-indigo-500 text-white"
					: "border-border bg-background text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50",
			].join(" ")}
		>
			{label}
		</button>
	);
}
