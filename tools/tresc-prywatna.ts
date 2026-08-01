/**
 * Manifest TREŚCI PRYWATNEJ — jedyne źródło prawdy o tym, które pliki niosą
 * klucze odpowiedzi i dlatego NIE leżą w tym (publicznym od 2026-08-01) repo.
 *
 * Repo kodu `Danolog/nordsignal-skillbridge` jest publiczne do końca wdrożenia
 * planu; klucze odpowiedzi zostały przeniesione do prywatnego
 * `Danolog/nordsignal-skillbridge-content` (decyzja Darka 2026-08-01, zlecenie
 * Olivera). Ścieżki po obu stronach są IDENTYCZNE — zaciąg to kopia drzewa w to
 * samo miejsce, więc żaden `readFileSync` w narzędziach i testach nie wymagał
 * przepisania ścieżki.
 *
 * Konsumenci tego pliku:
 *  - `tools/sprawdz-tresc.ts`      — preflight CI („brak treści = twardy błąd"),
 *  - `tests/support/tresc-prywatna.ts` — bramka testów kontraktowych,
 *  - runbook `docs/runbooks/tresc-prywatna.md`.
 *
 * DODAJESZ NOWY PLIK Z KLUCZEM ODPOWIEDZI? Dopisz go TU i przenieś do repo
 * treści — inaczej klucz wyląduje w publicznym repo przy najbliższym commicie.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/** Prywatne repo z kluczami odpowiedzi. NIGDY nie przełączać na publiczne. */
export const REPO_TRESCI = "Danolog/nordsignal-skillbridge-content";

/**
 * Ścieżki (względem korzenia repo) przeniesione do repo treści.
 * Każda pozycja niesie poprawne odpowiedzi albo klucz oceny.
 */
export const MANIFEST_TRESCI: readonly string[] = [
	// Diagnoza onboardingowa → placement 1E.7. 24 koncepty, 144 pytania,
	// 144 klucze (114 pól `correct` + 30 `numeric.value`).
	"tools/content/question-bank-ds-partia-1.json",
	// Atomy drabiny DS — 66 pozycji, 129 pytań, każde z kluczem.
	"tools/content/curriculum-atoms/l0-start.json",
	"tools/content/curriculum-atoms/f1-python-1.json",
	"tools/content/curriculum-atoms/f2-python-2.json",
	"tools/content/curriculum-atoms/f3-dane-python.json",
	"tools/content/curriculum-atoms/m-pandas.json",
	"tools/content/curriculum-atoms/m-eda.json",
	"tools/content/curriculum-atoms/m-sql.json",
	"tools/content/curriculum-atoms/m-ml.json",
	"tools/content/curriculum-atoms/m-llm.json",
	// Źródła autorskie Sophii — packer (`pnpm content:pack-curriculum`) generuje
	// z nich JSON-y wyżej. Poprawna opcja = pogrubienie, więc niosą ten sam klucz.
	"docs/curation/sophia-1e2-l0-atomy.md",
	"docs/curation/sophia-1e2-f1-atomy.md",
	"docs/curation/sophia-1e2-f2-atomy.md",
	"docs/curation/sophia-1e2-f3-atomy.md",
	"docs/curation/sophia-1e2-mpd-atomy.md",
	"docs/curation/sophia-1e2-meda-atomy.md",
	"docs/curation/sophia-1e2-msql-atomy.md",
	"docs/curation/sophia-1e2-mml-atomy.md",
	"docs/curation/sophia-1e2-mllm-atomy.md",
	// Bank egzaminacyjny F1 — 15 slotów × 2 warianty izomorficzne. Mastery gate
	// 1E.3 (próg 90%, maks. 1 błąd) stoi dokładnie na tym pliku.
	"docs/curation/sophia-1e3-egzamin-f1-v0.1.md",
] as const;

/** Ścieżki z manifestu, których NIE MA na dysku. Pusta lista = treść kompletna. */
export function brakiTresci(root: string = process.cwd()): string[] {
	return MANIFEST_TRESCI.filter((rel) => !existsSync(join(root, rel)));
}

/** Czy komplet treści prywatnej leży na miejscu. */
export function trescKompletna(root: string = process.cwd()): boolean {
	return brakiTresci(root).length === 0;
}

/**
 * Tryb opcjonalny — JAWNA deklaracja „wiem, że treści nie ma i to jest OK".
 * Ustawiany WYŁĄCZNIE przez CI dla PR-a z FORKA (fork nie dostaje sekretów) oraz
 * świadomie lokalnie. Nasz własny CI go NIE ustawia — tam brak treści ma być
 * twardym błędem, nie pominięciem.
 */
export const TRYB_OPCJONALNY = process.env.SKILLBRIDGE_TRESC_OPCJONALNA === "1";
