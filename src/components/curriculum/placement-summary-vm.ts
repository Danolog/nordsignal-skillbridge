/**
 * 1E.7 L6 · POWIERZCHNIA A — model widoku sekcji placementu + adapter kontraktu.
 *
 * Kontrakt propsów jest Mili (§5.1 `docs/design/1e7-l6-ekran-wyniku-diagnozy-v0.1.md`);
 * kontrakt danych jest Ethana (`PlacementScreenContract`, §12.8 dokumentu Sophii).
 * To są DWA RÓŻNE kształty i ten plik jest jedynym miejscem, w którym się spotykają.
 *
 * ── CO TEN ADAPTER ROBI, A CZEGO NIE ───────────────────────────────────────────
 * ROBI: przepisuje pola (tytuły z modułów, „najgłębszy odblokowany" = ostatni na
 * liście, `zeroUnlocked` = pusta lista odblokowanych) i WALIDUJE kształt, który
 * przyszedł siecią.
 *
 * NIE ROBI: nie liczy reguły placementu ani rekomendacji (§12.8 pkt 1). Rekomendacja,
 * jej powód i „czy to korzeń" przychodzą policzone z serwera. Druga implementacja
 * reguły w UI rozjechałaby się z pierwszą — to nie jest ostrożność teoretyczna, tylko
 * mechanizm, który w tym samym module wyprodukował już rozjazd `getLadder` ⟂
 * `isModuleUnlocked` (`ladder.ts:46-49`).
 *
 * ⚠ TYP NIE JEST DOWODEM NA GRANICY SIECI. `PlacementScreenContract` opisuje, co
 * serwer OBIECAŁ wysłać; `JSON.parse` nie sprawdza niczego. Dlatego fail-closed
 * (§12.4 reguła 2) stoi TUTAJ jako sprawdzenie w czasie wykonania, a nie wyłącznie
 * w `switch` komponentu: powód dziury spoza trójki `below_threshold` / `uncovered` /
 * `no_measurement` kasuje CAŁĄ dziurę (`hole: null`), więc blok 2b się nie renderuje.
 * Nigdy „najbliższy pasujący" tekst — to jest ścieżka, którą „wypadła słabo"
 * trafiłoby na `no_measurement`, czyli produkt przyłapany na zmyślaniu.
 */

import type { PlacementScreenContract } from "@/lib/curriculum/placement-screen";
import { jestTytulemDoPokazania } from "@/lib/curriculum/placement-title";

/** Powody dopuszczone do bloku 2b — trójka z §12.4, sprawdzana też w czasie wykonania. */
const POWODY_DZIURY = ["below_threshold", "uncovered", "no_measurement"] as const;

export type PlacementHoleReason = (typeof POWODY_DZIURY)[number];

export interface PlacementHoleViewModel {
	competencyName: string;
	moduleTitle: string;
	reason: PlacementHoleReason;
	/** true = diagnoza nie otworzyła NICZEGO → warianty zerowe tekstów z §8. */
	zeroUnlocked: boolean;
}

/**
 * Blok 3 — dokładnie jeden z trzech kształtów, nigdy `null` (Mila §5.1). Gdy serwer
 * nie dostarczy żadnego z nich, sekcja nie powstaje W CAŁOŚCI (patrz adapter):
 * „całość albo nic", ta sama reguła co dla dziury w §12.8 pkt 3.
 */
export type PlacementRecommendation =
	| { kind: "module"; title: string; isRoot: boolean }
	| { kind: "all_completed" }
	| { kind: "coming_soon" };

export interface PlacementSummaryViewModel {
	/** Blok 1 — dorobek studenta. [] = akapit pominięty. Kolejność drabiny. */
	completedModuleTitles: string[];
	/** Blok 2 — co otworzyła DIAGNOZA (nigdy „stan ścieżki", §12.7 pkt 1). */
	unlockedModuleTitles: string[];
	/** Najgłębszy odblokowany = ostatni na liście (kolejność drabiny). null = lista pusta. */
	deepestUnlockedTitle: string | null;
	/** Blok 2b — komplet albo `null`. */
	hole: PlacementHoleViewModel | null;
	recommendation: PlacementRecommendation;
}

function jestPowodemDziury(reason: unknown): reason is PlacementHoleReason {
	return POWODY_DZIURY.includes(reason as PlacementHoleReason);
}

/**
 * Predykat tytułu — WSPÓLNY z warstwą serwera (`placement-title.ts`, naprawa K1).
 * Wcześniej ta sama reguła żyła tu i w `placement-screen.ts` w dwóch wersjach:
 * serwer przepuszczał pusty łańcuch, klient go odsiewał. Alias zostaje, żeby nie
 * przepisywać całego pliku; źródło reguły jest jedno.
 */
const niepusty = jestTytulemDoPokazania;

/**
 * Kontrakt serwera → model widoku. `null` = sekcja NIE ISTNIEJE (§12.6 warianty 1–4
 * plus każdy kształt, którego nie da się wyrenderować bez zgadywania).
 */
export function toPlacementSummaryViewModel(
	contract: PlacementScreenContract | null | undefined,
): PlacementSummaryViewModel | null {
	if (!contract) return null;

	// Moduł bez tytułu wypada z listy — na ekran nigdy nie jedzie slug (§12.7 pkt 4).
	const completedModuleTitles = (contract.completedModules ?? [])
		.map((m) => m?.title)
		.filter(niepusty);
	const unlockedModuleTitles = (contract.unlockedByDiagnosis ?? [])
		.map((m) => m?.title)
		.filter(niepusty);

	const rekomendacja = recommendationFrom(contract);
	// Fail-closed na całym obiekcie (Mila §10 pkt 5): niekompletny wynik to brak
	// sekcji, nie sekcja z dziurą po interpolacji. §12.6 wariant 4 rozstrzyga to
	// tak samo po stronie serwera — tu jest druga linia obrony, bo typ nie przeżywa HTTP.
	if (!rekomendacja) return null;

	return {
		completedModuleTitles,
		unlockedModuleTitles,
		deepestUnlockedTitle: unlockedModuleTitles.at(-1) ?? null,
		// `zeroUnlocked` z FAKTU podanego przez serwer, NIE z długości listy po filtrze
		// prezentacyjnym (naprawa K1). Moduł bez tytułu znikał z listy i przełączał
		// teksty na warianty zerowe — student z dwoma otwartymi modułami czytał, że
		// diagnoza nie otworzyła nic, „dlatego zaczynamy od początku ścieżki".
		hole: holeFrom(contract, liczbaOtwartych(contract) === 0),
		recommendation: rekomendacja,
	};
}

function recommendationFrom(contract: PlacementScreenContract): PlacementRecommendation | null {
	const rec = contract.recommendation;
	if (rec && niepusty(rec.title)) {
		return { kind: "module", title: rec.title, isRoot: contract.recommendationIsRoot === true };
	}
	// Wariant 10 — dwa RÓŻNE zdania, więc dwa różne kształty (§12.6 wiersz 10).
	if (contract.noRecommendationReason === "all_completed") return { kind: "all_completed" };
	if (contract.noRecommendationReason === "only_coming_soon") return { kind: "coming_soon" };
	return null;
}

/**
 * Ile modułów otworzyła diagnoza — odpowiedź o RZECZYWISTOŚCI, nie o tym, co da się
 * wyświetlić. Źródłem jest `unlockedCount` z kontraktu; gdy pole nie przyszło albo
 * przyszło w złym kształcie (typ nie jest dowodem na granicy sieci), cofamy się do
 * długości SUROWEJ listy z kontraktu — nadal twierdzenia serwera, nigdy listy po
 * naszym filtrze prezentacyjnym.
 */
function liczbaOtwartych(contract: PlacementScreenContract): number {
	const fakt = (contract as { unlockedCount?: unknown }).unlockedCount;
	if (typeof fakt === "number" && Number.isFinite(fakt) && fakt >= 0) return fakt;
	return contract.unlockedByDiagnosis?.length ?? 0;
}

function holeFrom(
	contract: PlacementScreenContract,
	zeroUnlocked: boolean,
): PlacementHoleViewModel | null {
	const hole = contract.hole;
	if (!hole) return null;
	// Komplet albo nic (§12.8 pkt 3): brak któregokolwiek pola = brak bloku 2b.
	if (!niepusty(hole.moduleTitle) || !niepusty(hole.competencyName)) return null;
	if (!jestPowodemDziury(hole.reason)) return null;
	return {
		competencyName: hole.competencyName,
		moduleTitle: hole.moduleTitle,
		reason: hole.reason,
		zeroUnlocked,
	};
}
