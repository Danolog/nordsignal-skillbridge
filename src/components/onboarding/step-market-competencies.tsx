"use client";

/**
 * StepMarketCompetencies — scalony krok: wybór kompetencji RYNKU + poziom 1–4 na
 * JEDNYM ekranie (Partia 4, elementy 2/4/5; decyzje Sophii D4/D5).
 *
 * Źródło: katalog rynku (`/api/onboarding/market-catalog`) per cel kariery, sortowany
 * malejąco wg popytu. Student zaznacza TYLKO to, co ma (jeden z 3 poziomów posiadania);
 * niezaznaczone = Brak = luka. Próg „min 5" ZNIESIONY (0 dozwolone, D5).
 *
 * Partia 5 (C2): render GRUPOWY — pozycje pogrupowane wg obszarów rynku (nagłówek grupy
 * z udziałem % grupy + proza „po co się uczysz"), gdy endpoint zwróci `groups[]`. Brak
 * grup → fallback do płaskiej listy (zgodność wstecz). Pokrycie liczy się DALEJ z płaskiej
 * listy (`catalog`) — grupy to warstwa prezentacji, niezmiennik: suma items grup == płaska.
 *
 * Partia 5 (C3): czasownik samooceny zależny od RODZAJU kompetencji (narzędzie się
 * OBSŁUGUJE, koncepcję się ROZUMIE/STOSUJE) — etykiety z `possessionLabelsForKind`.
 *
 * Nagłówek zatrudnialności (9c B1–B4): „% pokrycia kompetencji wymaganych przez rynek".
 * NIGDY obietnica/szansa pracy. Sylabus = adnotacja „w programie studiów" (D4), nie generator.
 */

import { AlertCircle, BookCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LeafKind } from "@/lib/db/data/anchor-config";
import type { GroupCatalog } from "@/lib/onboarding/market-catalog";
import {
	computeMarketCoverage,
	type MarketCatalogItem,
	type PossessionLevel,
	possessionLabelsForKind,
} from "@/lib/onboarding/market-catalog";

interface StepMarketCompetenciesProps {
	careerGoal: string;
	/** Katalog rynku (posortowany + zaadnotowany sylabusem). ŹRÓDŁO POKRYCIA. */
	catalog: MarketCatalogItem[];
	/**
	 * Widok grupowy (B2) — warstwa prezentacji. Niepuste → render grupowy; puste → fallback
	 * do płaskiej listy (`catalog`). Suma items grup == `catalog` (niezmiennik pokrycia).
	 */
	groups?: GroupCatalog[];
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
	groups = [],
	selections,
	onChange,
	loading,
	error,
	onRetry,
	isRealCareerGoal,
}: StepMarketCompetenciesProps) {
	// Pokrycie (9c B1) — liczone na żywo z wyboru. Mianownik = cały katalog rynku (płaski).
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

	// Flaga „w programie studiów" żyje na płaskim katalogu (adnotacja D4); grupy z endpointu
	// jej nie niosą. Łączymy wiersz grupy z płaskim katalogiem po nazwie (2.5) — bez backendu.
	const inSyllabusByName = new Map(catalog.map((c) => [c.competencyName, Boolean(c.inSyllabus)]));

	// G1: grupy obecne → render grupowy. G2: grupy puste → płaska lista (fallback wstecz).
	const useGrouped = groups.length > 0;

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

			{useGrouped ? (
				// Render grupowy: większy oddech MIĘDZY grupami (space-6) niż w grupie (space-2).
				<div className="space-y-6">
					{groups.map((group) => (
						<section key={group.name} className="space-y-3">
							<GroupHeader
								name={group.name}
								unionShare={group.unionShare}
								description={group.description}
							/>
							<ul className="space-y-2">
								{group.items.map((item) => (
									<CompetencyRow
										key={item.competencyName}
										name={item.competencyName}
										demandPercentage={item.demandPercentage}
										kind={item.kind}
										inSyllabus={inSyllabusByName.get(item.competencyName) ?? false}
										level={selections[item.competencyName] ?? null}
										onChange={(level) => onChange(item.competencyName, level)}
									/>
								))}
							</ul>
						</section>
					))}
				</div>
			) : (
				// Fallback (G2): płaska lista wg popytu — zgodność wstecz przed kuracją grup.
				<ul className="space-y-2">
					{catalog.map((item) => (
						<CompetencyRow
							key={`${item.competencyName}-${item.category}`}
							name={item.competencyName}
							demandPercentage={item.demandPercentage}
							kind={item.kind}
							inSyllabus={Boolean(item.inSyllabus)}
							level={selections[item.competencyName] ?? null}
							onChange={(level) => onChange(item.competencyName, level)}
						/>
					))}
				</ul>
			)}

			<p className="text-xs text-muted-foreground" aria-live="polite">
				Zaznaczono {selectedCount} z {catalog.length} kompetencji rynku.
			</p>
		</div>
	);
}

/**
 * Nagłówek grupy (C2): nazwa + udział % grupy (SharePill) + proza „po co" (clamp 2 + toggle).
 * Stany ze specu: grupa „Pozostałe" / unionShare i opis null (G3/G4/G5) → bez pigułki/prozy,
 * neutralna etykieta. Czysto prezentacyjny.
 */
function GroupHeader({
	name,
	unionShare,
	description,
}: {
	name: string;
	unionShare: number | null;
	description: string | null;
}) {
	const [expanded, setExpanded] = useState(false);

	// G5/„Pozostałe" (i każda grupa bez udziału i bez opisu): kubełek bez udawanego
	// kontekstu — sama neutralna etykieta, bez pigułki i prozy.
	if (unionShare === null && description === null) {
		return <p className="text-sm font-medium text-muted-foreground">{name}</p>;
	}

	return (
		<div className="space-y-1">
			<div className="flex items-baseline justify-between gap-3">
				<h3 className="font-heading text-lg font-semibold text-foreground">{name}</h3>
				{/* G3: brak udziału → nie renderuj „null% ofert". */}
				{unionShare !== null && <SharePill share={unionShare} />}
			</div>
			{/* G4: brak opisu → bez prozy i bez toggle „Po co to?". */}
			{description && (
				<div>
					<p
						className={["text-sm text-muted-foreground", expanded ? "" : "line-clamp-2"]
							.filter(Boolean)
							.join(" ")}
					>
						{description}
					</p>
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="mt-0.5 text-xs font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded"
					>
						{expanded ? "Zwiń" : "Po co to?"}
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Udział grupy (C2, §2.6): „38% ofert grupy" — UNIA grupy (% ofert ścieżki z ≥1 technologią
 * grupy), inna miara niż „% ofert" pojedynczej kompetencji. Słowo „grupy" + osobny kształt
 * (chip vs goły mono-tekst) rozdzielają dwie różne liczby procentowe, by się nie zlały.
 */
function SharePill({ share }: { share: number }) {
	return (
		<span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
			{share}% ofert grupy
		</span>
	);
}

/**
 * Etykieta rodzaju kompetencji (C2/C3): „narzędzie" / „koncepcja" — kotwica, która mówi
 * studentowi, jakim językiem ocenia (zanim spojrzy na przyciski). Tylko dla tool/concept;
 * inne rodzaje → brak (cert/meta/soft/null nie mają osobnego czasownika). Nigdy surowy `kind`.
 */
function KindChip({ kind }: { kind: LeafKind | null | undefined }) {
	const label = kind === "tool" ? "narzędzie" : kind === "concept" ? "koncepcja" : null;
	if (!label) return null;
	return (
		<span className="ml-2 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground align-middle">
			{label}
		</span>
	);
}

/**
 * Wiersz kompetencji (C2): nazwa + popyt (% ofert) + KindChip + selektor poziomu.
 * Selektor wizualnie identyczny niezależnie od rodzaju — różni go TYLKO czasownik (C3),
 * żeby student uczył się jednego interfejsu. Używany w renderze grupowym i w fallbacku.
 */
function CompetencyRow({
	name,
	demandPercentage,
	kind,
	inSyllabus,
	level,
	onChange,
}: {
	name: string;
	demandPercentage: number;
	kind: LeafKind | null | undefined;
	inSyllabus: boolean;
	level: PossessionLevel | null;
	onChange: (level: PossessionLevel | null) => void;
}) {
	const possession = possessionLabelsForKind(kind);
	return (
		<li className="rounded-lg border border-border bg-card p-3">
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="text-sm font-medium text-foreground">
					{name}
					<span className="ml-2 font-mono text-xs text-muted-foreground">
						{demandPercentage}% ofert
					</span>
					<KindChip kind={kind} />
				</span>
				{inSyllabus && (
					<span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
						<BookCheck className="h-3.5 w-3.5" aria-hidden="true" />w programie studiów
					</span>
				)}
			</div>
			{/* Selektor 4 stanów: Brak (odznacz) + 3 poziomy posiadania (czasownik per rodzaj). */}
			<fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
				<legend className="sr-only">Poziom: {name}</legend>
				<LevelButton
					selected={level === null}
					label="Brak"
					title="Nie znam — to luka do nauki"
					onClick={() => onChange(null)}
				/>
				{possession.map((opt) => (
					<LevelButton
						key={opt.level}
						selected={level === opt.level}
						label={opt.label}
						title={opt.title}
						onClick={() => onChange(opt.level)}
					/>
				))}
			</fieldset>
		</li>
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
