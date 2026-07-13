// ============================================================================
// MODEL KATALOGU RYNKU + SKALA BIEGŁOŚCI (Partia 4 — czysta logika, testowalna)
//
// Onboarding przechodzi z sylabusa na REALNY RYNEK jako źródło kompetencji
// (decyzje Sophii D4/D5, ratyfikacja faza 1 v0.1). Ten moduł:
//   1. typuje katalog rynku (z `job_market_data` per `career_goal`),
//   2. koduje skalę biegłości = 4 stany / 3 poziomy posiadania (ratyfikacja),
//   3. liczy „% pokrycia kompetencji wymaganych przez rynek" (9c B1–B4),
//   4. wyprowadza priorytet luki z popytu (deterministycznie, bez modelu).
//
// Reguła twarda (CLAUDE.md §7, HITL): nic tu nie zgaduje za studenta. Student
// zaznacza tylko to, co ma; reszta = luka. Liczby deterministyczne (Built-to-Sell).
// ============================================================================

import type { LeafKind } from "@/lib/db/data/anchor-config";

/** Jedna pozycja katalogu rynku dla wybranej ścieżki (wiersz `job_market_data`). */
export interface MarketCatalogItem {
	competencyName: string;
	/** % ofert ścieżki, w których kompetencja wystąpiła (popyt). Oś sortowania/priorytetu. */
	demandPercentage: number;
	category: string;
	/** Flaga adnotacji „w programie studiów" (D4) — nakładana przez sylabus, NIE generator. */
	inSyllabus?: boolean;
	/**
	 * Rodzaj kompetencji z career-model.json (B1): tool=narzędzie · concept=koncepcja
	 * (np. SIEM/IAM/NIST) · cert · meta · soft. Dokładany złączeniem z hierarchią
	 * (competency-groups); nieobecny gdy brak dopasowania. Typ-only — zero kosztu w bundlu.
	 */
	kind?: LeafKind;
}

/** Pozycja w widoku grupowym (B2) — podzbiór MarketCatalogItem + jawny kind. */
export interface GroupCatalogItem {
	competencyName: string;
	demandPercentage: number;
	kind: LeafKind | null;
}

/**
 * Grupa kompetencji z kontekstem (B2) — odpowiada obszarowi (area) z career-model.json.
 * `unionShare` = % ofert ścieżki z ≥1 technologią grupy (unia); `description` = proza
 * „po co się uczysz" (kuracja Sophii). Widok grupowy NIE zastępuje płaskiego `items[]`
 * (pokrycie liczy się na płaskiej liście) — to dodatkowa warstwa opisowa prezentacji.
 */
export interface GroupCatalog {
	name: string;
	unionShare: number | null;
	description: string | null;
	items: GroupCatalogItem[];
}

// ── Skala biegłości: 4 stany / 3 poziomy posiadania ─────────────────────────
//
// Ratyfikacja (fundament): Brak ○○○ „nie znam" (= luka) · Podstawowy ●○○ „uczę się"
// · Średni ●●○ „znam" · Zaawansowany ●●● „dobrze znam". Student zaznacza JEDEN z 3
// poziomów posiadania; niezaznaczone = Brak = luka (D5).
//
// Mapowanie na bazę („Indeks 0–3 vs 1–4 = detal Maxa" — ta decyzja):
//   Brak          → kompetencja NIE jest zapisywana (staje się luką deterministycznie).
//                    Wartość self_assessment „1" (nie znam) świadomie NIE jest emitowana
//                    przez onboarding — zapisana kompetencja zawsze znaczy „mam ją".
//   Podstawowy    → self_assessment 2  → levelToStatus → 'in_progress'
//   Średni        → self_assessment 3  → levelToStatus → 'acquired'
//   Zaawansowany  → self_assessment 4  → levelToStatus → 'acquired'
//
// To NIE rusza ratyfikowanej, zamkniętej mapy `levelToStatus` (Darek 2026-06-01).
// Mapowanie poziom→KOLUMNA Kanbana (9a, Partia 5/Jack) liczy się z self_assessment
// (Brak→„Do zrobienia", 2/3→„W trakcie", 4→„Opanowane"), nie z tego modułu.

/** Poziom posiadania wybrany przez studenta = wartość `self_assessment` w bazie (2/3/4). */
export type PossessionLevel = 2 | 3 | 4;

/** Stan biegłości w UI: Brak (niezaznaczone) albo jeden z 3 poziomów posiadania. */
export type ProficiencyState = "brak" | PossessionLevel;

export interface ProficiencyOption {
	level: PossessionLevel;
	/** Etykieta słowna PRD 1:1 (spójna z RatingScale B4 — „uczę się/znam/dobrze znam"). */
	label: string;
	/** Słowo skali biegłości z ratyfikacji (filozofia El.3). */
	tier: "Podstawowy" | "Średni" | "Zaawansowany";
	/** Liczba wypełnionych kropek (●) — 1..3 z 3. */
	dots: 1 | 2 | 3;
}

/** 3 poziomy posiadania (Brak = brak wyboru, nie jest opcją na liście). */
export const POSSESSION_OPTIONS: readonly ProficiencyOption[] = [
	{ level: 2, label: "uczę się", tier: "Podstawowy", dots: 1 },
	{ level: 3, label: "znam", tier: "Średni", dots: 2 },
	{ level: 4, label: "dobrze znam", tier: "Zaawansowany", dots: 3 },
] as const;

/** Czy wartość to poprawny poziom posiadania (2/3/4) — walidacja wejścia. */
export function isPossessionLevel(v: unknown): v is PossessionLevel {
	return v === 2 || v === 3 || v === 4;
}

// ── Etykiety samooceny per RODZAJ kompetencji (C3, Partia 5) ─────────────────
//
// Decyzja produktowa (Decyzje wiążące #3, spec C1 §3): narzędzie się OBSŁUGUJE
// (umiesz kliknąć/napisać), koncepcję się ROZUMIE i STOSUJE (wiesz kiedy i po co).
// SIEM/IAM/NIST jako „obsługuję" brzmi fałszywie; Splunk jako „rozumiem" gubi, że
// chodzi o ręce na narzędziu (anchor-config: concept = koncepcja/standard).
//
// Skala 1–4 (1 = nie znam/Brak · 2 · 3 · 4); per rodzaj inny czasownik. Realnie
// rozróżniamy `tool` i `concept`; każdy inny rodzaj (cert/meta/soft/null/brak
// dopasowania) → zestaw `default`. JEDNO źródło prawdy — reużywane przez onboarding
// (LevelButton, 3 widoczne szczeble) i panel B4 (RatingScale, 4 szczeble).

/** Klucz zestawu etykiet: realnie rozróżniamy tylko narzędzie i koncepcję. */
export type KindLabelKey = "tool" | "concept" | "default";

/** Czasowniki samooceny per szczebel (1–4) dla danego zestawu. */
export type KindLabelSet = Record<1 | 2 | 3 | 4, string>;
/** Opisy (tooltip) szczebli posiadania 2–4 — szczebel 1 ma wspólny opis (poniżej). */
export type KindDescriptionSet = Record<2 | 3 | 4, string>;

export const LABELS_BY_KIND: Record<KindLabelKey, KindLabelSet> = {
	tool: { 1: "nie znam", 2: "uczę się", 3: "obsługuję", 4: "swobodnie" },
	concept: { 1: "nie znam", 2: "poznaję", 3: "rozumiem", 4: "stosuję" },
	default: { 1: "nie znam", 2: "uczę się", 3: "znam", 4: "dobrze znam" },
} as const;

export const DESCRIPTIONS_BY_KIND: Record<KindLabelKey, KindDescriptionSet> = {
	tool: {
		2: "Zaczynam, klikam z instrukcją.",
		3: "Robię typowe zadania w narzędziu sam.",
		4: "Radzę sobie też w trudnych przypadkach.",
	},
	concept: {
		2: "Słyszałem, łapię zarys.",
		3: "Rozumiem zasadę i kiedy jej użyć.",
		4: "Stosuję świadomie w realnych sytuacjach.",
	},
	default: {
		2: "Zaczynam, potrzebuję wsparcia.",
		3: "Robię typowe zadania samodzielnie.",
		4: "Radzę sobie też w trudniejszych sytuacjach.",
	},
} as const;

/** Wspólny opis szczebla 1 ("nie znam") — taki sam dla każdego rodzaju. */
export const DESCRIPTION_LEVEL_1 = "Nie miałem jeszcze styczności / nie potrafię.";

/** Wybór zestawu: tool/concept dostają własny, reszta (cert/meta/soft/null) → default. */
export function kindLabelKey(kind: LeafKind | null | undefined): KindLabelKey {
	return kind === "tool" || kind === "concept" ? kind : "default";
}

/** Opcja samooceny w onboardingu (3 widoczne szczeble posiadania 2/3/4). */
export interface PossessionLabel {
	level: PossessionLevel;
	/** Czasownik widoczny na przycisku (zależny od rodzaju). */
	label: string;
	/** Opis-tooltip szczebla (zależny od rodzaju). */
	title: string;
}

/**
 * C3: 3 szczeble posiadania (2/3/4) z czasownikiem i opisem dopasowanym do rodzaju.
 * „Brak" (szczebel 1) jest osobnym, stałym przyciskiem — NIE z tej listy (semantyka
 * „nie zaznaczono" ≠ szczebel skali „nie znam"). Onboarding LevelButton bierze etykietę
 * stąd zamiast stałego POSSESSION_OPTIONS[].tier.
 */
export function possessionLabelsForKind(kind: LeafKind | null | undefined): PossessionLabel[] {
	const key = kindLabelKey(kind);
	const labels = LABELS_BY_KIND[key];
	const desc = DESCRIPTIONS_BY_KIND[key];
	return [2, 3, 4].map((lvl) => {
		const l = lvl as 2 | 3 | 4;
		return { level: l, label: labels[l], title: desc[l] };
	});
}

/** Opcja samooceny w panelu B4 (4 szczeble 1–4, „nie znam" jest osobnym szczeblem). */
export interface RatingOption {
	value: 1 | 2 | 3 | 4;
	label: string;
	description: string;
}

/**
 * C3: 4 szczeble skali (1–4) z czasownikiem i opisem per rodzaj — dla RatingScale (B4).
 * `default` = dawne etykiety PRD („nie znam/uczę się/znam/dobrze znam"); `tool`/`concept`
 * = wariant per typ. Szczebel 1 ma wspólny opis dla wszystkich rodzajów.
 */
export function ratingOptionsForKind(kind: LeafKind | null | undefined): RatingOption[] {
	const key = kindLabelKey(kind);
	const labels = LABELS_BY_KIND[key];
	const desc = DESCRIPTIONS_BY_KIND[key];
	return [1, 2, 3, 4].map((v) => {
		const val = v as 1 | 2 | 3 | 4;
		return {
			value: val,
			label: labels[val],
			description: val === 1 ? DESCRIPTION_LEVEL_1 : desc[val],
		};
	});
}

// ── Pokrycie zatrudnialności (employability) — 9c B1–B4 ─────────────────────
//
// „% pokrycia kompetencji wymaganych przez rynek" — NIGDY obietnica/szansa pracy.
// Wzór ZGODNY z `calculateCoverage` (passport-utils), żeby liczba w nagłówku
// onboardingu == pokrycie na paszporcie/pulpicie po zapisie (koniec rozjazdu liczb):
//   posiadane ważone: Średni/Zaawansowany (status 'acquired') = 1.0; Podstawowy
//   ('in_progress') = 0.5; mianownik = cały katalog rynku (posiadane + luki).

/** Waga pozycji w pokryciu wg poziomu posiadania (mirror calculateCoverage). */
export function coverageWeight(level: PossessionLevel): number {
	// 2 (Podstawowy) → in_progress → 0.5; 3/4 → acquired → 1.0
	return level === 2 ? 0.5 : 1;
}

/**
 * % pokrycia kompetencji wymaganych przez rynek (9c B1) — liczone na żywo w UI
 * i deterministycznie po zapisie. `catalogSize` = liczba kompetencji rynku ścieżki.
 */
export function computeMarketCoverage(
	catalogSize: number,
	selectedLevels: PossessionLevel[],
): number {
	if (catalogSize <= 0) return 0;
	const covered = selectedLevels.reduce((sum, lvl) => sum + coverageWeight(lvl), 0);
	return Math.round((covered / catalogSize) * 100);
}

// ── Pokrycie WAŻONE POPYTEM (Blok C planu napraw, decyzja D3) ─────────────────
//
// Zbiorcze „Pokrycie" liczone średnią ważoną popytem zamiast liczenia sztuk:
// Python (55% ofert) przestaje ważyć tyle samo co NumPy (2%). JEDEN wzór, DWA
// wejścia — parytet front↔paszport staje się parytetem WZORU (obie strony wołają
// tę funkcję), nie równością wartości:
//   • paszport („pokrycie potwierdzone"): wejście = nazwy z verified_competencies,
//     waga 1.0 (projekt daje binarne „zdobyte");
//   • front/pulpit („pokrycie deklarowane"): wejście = deklaracje z wagą
//     coverageWeight (0.5/1.0).
// Kompetencja spoza katalogu roli nie podnosi pokrycia i nie wchodzi do
// mianownika (mianownik = CAŁY katalog roli). Duplikaty nazw liczone raz
// (wygrywa najwyższa waga — dwie submisje mogą potwierdzić tę samą nazwę).

/** Normalizacja nazwy do złączenia — trim + lower (jedno źródło; używa też competency-groups). */
export function normCompetencyName(s: string): string {
	return s.trim().toLowerCase();
}

/** Pozycja posiadana na wejściu pokrycia ważonego (deklaracja albo kredencjał). */
export interface DemandCoveragePossessed {
	name: string;
	/** Waga pokrycia: 1.0 (acquired / kredencjał) albo 0.5 (in_progress). Domyślnie 1. */
	weight?: number;
}

/**
 * % pokrycia ważonego popytem (D3): Σ popytu pozycji posiadanych (× waga) ÷
 * Σ popytu całego katalogu roli, zaokrąglone do liczby całkowitej 0–100.
 */
export function computeDemandCoverage(
	catalog: Pick<MarketCatalogItem, "competencyName" | "demandPercentage">[],
	possessed: DemandCoveragePossessed[],
): number {
	const totalDemand = catalog.reduce((sum, item) => sum + item.demandPercentage, 0);
	if (totalDemand <= 0) return 0;

	const demandByName = new Map<string, number>();
	for (const item of catalog) {
		const key = normCompetencyName(item.competencyName);
		// Duplikat w katalogu (nie powinien wystąpić) — pierwsze wystąpienie wygrywa,
		// ale mianownik już policzył oba; trzymamy max, żeby nie zaniżać licznika.
		demandByName.set(key, Math.max(demandByName.get(key) ?? 0, item.demandPercentage));
	}

	// Duplikaty nazw po stronie posiadanych: liczone raz, wygrywa najwyższa waga.
	const weightByName = new Map<string, number>();
	for (const p of possessed) {
		const key = normCompetencyName(p.name);
		if (!demandByName.has(key)) continue; // spoza katalogu roli — nie podnosi pokrycia
		const weight = Math.min(Math.max(p.weight ?? 1, 0), 1);
		weightByName.set(key, Math.max(weightByName.get(key) ?? 0, weight));
	}

	let covered = 0;
	for (const [key, weight] of weightByName) {
		covered += (demandByName.get(key) ?? 0) * weight;
	}
	return Math.round((covered / totalDemand) * 100);
}

// ── Priorytet luki — REGUŁA WZGLĘDNA w ścieżce (Sophia/Darek 2026-06-27) ──────
//
// Zastępuje progi BEZWZGLĘDNE 60/40, które w rozdrobnionych rolach (cyber: max popytu ~12%)
// robiły CAŁY rdzeń „miło-mieć" — absurd (SIEM dla specjalisty bezpieczeństwa jako „miło-mieć").
//
// Reguła: r = popyt ÷ najwyższy popyt w tej ścieżce.
//   r ≥ 0,66 → krytyczna · 0,33 ≤ r < 0,66 → ważna · r < 0,33 → miło-mieć.
//   Auto-normalizacja: działa dla ról skoncentrowanych (Java) i rozdrobnionych (cyber).
// (Reguła „podłoga krotności" PORZUCONA wraz z metodą krotności — decyzja Darka 2026-06-27:
//  ranking po SUROWYM UDZIALE, bez lift; priorytet też tylko z udziału względnego.)
export type GapPriority = "critical" | "important" | "nice_to_have";

export const PRIORITY_R_CRITICAL = 0.66; // r = popyt / max_popyt_ścieżki
export const PRIORITY_R_IMPORTANT = 0.33;

export function demandToPriority(
	demandPercentage: number,
	maxDemandPercentage: number,
): GapPriority {
	// Pozycja względna w ścieżce (auto-normalizacja ról skoncentrowanych i rozdrobnionych).
	const r = maxDemandPercentage > 0 ? demandPercentage / maxDemandPercentage : 0;
	return r >= PRIORITY_R_CRITICAL
		? "critical"
		: r >= PRIORITY_R_IMPORTANT
			? "important"
			: "nice_to_have";
}

/** Ranga priorytetu do sortowania katalogu (wyższa = ważniejsza, rdzeń roli na górze). */
export function priorityRank(p: GapPriority): number {
	return p === "critical" ? 3 : p === "important" ? 2 : 1;
}

/**
 * Szacunek godzin nauki luki — lekka heurystyka deterministyczna (kolumna
 * `gaps.estimated_hours` NOT NULL). Wcześniej zmyślał to model; tu stała per
 * priorytet (sygnał orientacyjny, nie load-bearing). Wyższy popyt = więcej wagi.
 */
export function estimatedHoursForGap(priority: GapPriority): number {
	if (priority === "critical") return 8;
	if (priority === "important") return 5;
	return 3;
}

/** Wiersz luki (bez kluczy studenta/tenanta — dokłada je zapis w market-gaps). */
export interface DerivedGap {
	competencyName: string;
	priority: GapPriority;
	marketPercentage: number;
	estimatedHours: number;
}

/**
 * Czysta funkcja: luki = pozycje katalogu rynku, których student NIE zaznaczył.
 * Porównanie po znormalizowanej nazwie (trim + lower) — odporne na drobne różnice
 * wielkości liter. Mieszka tu (czysty moduł, bez importu `db`), żeby liczyć luki
 * ZARÓWNO po stronie serwera (zapis, market-gaps) JAK i klienta (ekran Wniosków,
 * krok 4) — jedno źródło prawdy, zero rozjazdu liczb (Built-to-Sell).
 */
export function deriveGaps(catalog: MarketCatalogItem[], selectedNames: string[]): DerivedGap[] {
	const have = new Set(selectedNames.map((n) => n.trim().toLowerCase()));
	// Priorytet WZGLĘDNY — potrzebuje najwyższego popytu W ŚCIEŻCE (cały katalog, nie tylko luki).
	const maxDemand = catalog.reduce((m, i) => Math.max(m, i.demandPercentage), 0);
	return catalog
		.filter((item) => !have.has(item.competencyName.trim().toLowerCase()))
		.map((item) => {
			const priority = demandToPriority(item.demandPercentage, maxDemand);
			return {
				competencyName: item.competencyName,
				priority,
				marketPercentage: item.demandPercentage,
				estimatedHours: estimatedHoursForGap(priority),
			};
		});
}

// ── Adnotacja sylabusem (D4, element 6) ─────────────────────────────────────
//
// Sylabus przestaje GENEROWAĆ listę kompetencji — staje się ADNOTACJĄ: nakłada na
// katalog rynku flagę „w programie studiów". Dopasowanie deterministyczne (bez
// nowego modelu): kompetencja rynku jest „w programie", gdy któraś z nazw wyciągniętych
// z sylabusa (istniejące /api/syllabus/parse) ją zawiera albo jej równa. Best-effort —
// false-negative jest nieszkodliwy (student i tak może zaznaczyć). Semantyczne
// dopasowanie (model) = możliwe ulepszenie później.
export function annotateWithSyllabus(
	catalog: MarketCatalogItem[],
	syllabusNames: string[],
): MarketCatalogItem[] {
	if (syllabusNames.length === 0) {
		return catalog.map((c) => ({ ...c, inSyllabus: false }));
	}
	const syl = syllabusNames.map((n) => n.trim().toLowerCase()).filter(Boolean);
	return catalog.map((item) => {
		const n = item.competencyName.trim().toLowerCase();
		// Flaga gdy nazwa z sylabusa == nazwa rynku, albo nazwa z sylabusa ZAWIERA nazwę
		// rynku (np. „SQL podstawy" → katalog „SQL"). Kierunek jednostronny — nie
		// rozszerzamy „SQL" na „PostgreSQL" (unikamy nad-dopasowania).
		const inSyllabus = syl.some((s) => s === n || s.includes(n));
		return { ...item, inSyllabus };
	});
}

// ── Kontrakt wyboru kompetencji (front → POST /api/onboarding) ──────────────
//
// Scalony krok wysyła TYLKO zaznaczone kompetencje (Brak = nieobecne = luka).
// Każda niesie poziom (2/3/4), realny % popytu (z katalogu) i flagę „w programie".
export interface SelectedCompetency {
	name: string;
	/**
	 * Poziom samooceny (2/3/4). A5/1.12: NIEOBECNY dla wpisu zmierzonego diagnozą —
	 * serwer bierze poziom (1–4) z result_json sesji podanej w diagnosticSessionId
	 * (kontrakt POST /api/onboarding; bez sesji brak poziomu = 400).
	 */
	level?: PossessionLevel;
	marketPercentage: number;
	inSyllabus: boolean;
}
