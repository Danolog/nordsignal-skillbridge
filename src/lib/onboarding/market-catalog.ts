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

/** Jedna pozycja katalogu rynku dla wybranej ścieżki (wiersz `job_market_data`). */
export interface MarketCatalogItem {
	competencyName: string;
	/** % ofert ścieżki, w których kompetencja wystąpiła (popyt). Oś sortowania/priorytetu. */
	demandPercentage: number;
	category: string;
	/** Flaga adnotacji „w programie studiów" (D4) — nakładana przez sylabus, NIE generator. */
	inSyllabus?: boolean;
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
	level: PossessionLevel;
	marketPercentage: number;
	inSyllabus: boolean;
}
