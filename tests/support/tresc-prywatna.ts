/**
 * Bramka testów zależnych od TREŚCI PRYWATNEJ (klucze odpowiedzi — manifest w
 * `tools/tresc-prywatna.ts`).
 *
 * Kontrakt, trzy stany, zero czwartego:
 *
 *  1. TREŚĆ JEST → testy lecą normalnie. Nic się nie zmienia.
 *  2. TREŚCI NIE MA i NIKT tego nie zadeklarował → `czytajTrescJson` RZUCA przy
 *     ładowaniu modułu. Plik testowy pada na czerwono z nazwą brakującej ścieżki.
 *     To jest stan NASZEGO CI, gdy zaciąg z prywatnego repo się nie udał.
 *  3. TREŚCI NIE MA i jest JAWNA deklaracja `SKILLBRIDGE_TRESC_OPCJONALNA=1`
 *     (PR z forka — fork nie dostaje sekretów) → `describeTresc` = `describe.skip`,
 *     a `czytajTrescJson` oddaje zastępnik, żeby ciało `describe` dało się w ogóle
 *     zebrać. Vitest raportuje POMINIĘTE, nie zdane.
 *
 * DLACZEGO TAK, A NIE „skip-if-absent": mamy w tym repo udokumentowaną pułapkę —
 * `pnpm test:integration` bez DATABASE_URL pomijał 46 z 51 plików i kończył się
 * kodem 0 z tymi samymi totalami w nawiasach, więc nikt nie widział różnicy
 * między „zielone" a „nic nie pobiegło". Tutaj pominięcie jest niemożliwe bez
 * jawnej deklaracji w środowisku, a `tests/unit/tresc-prywatna-bramka.test.ts`
 * dodatkowo krzyczy `::warning::` do logu GitHuba i pilnuje, żeby stan 3 nie
 * przeszedł niezauważony.
 *
 * Użycie w pliku testowym:
 *   import { czytajTrescJson, describeTresc } from "<...>/support/tresc-prywatna";
 *   const bank = czytajTrescJson<Koncept[]>("tools/content/question-bank-...json", []);
 *   describeTresc("kontrakt banku", () => { ... });
 *
 * Zastępnik MUSI być typu zgodnego z realnymi danymi i „pustego" (np. `[]`) —
 * ciało `describe` w trybie pominiętym i tak się WYKONUJE (vitest zbiera suity
 * przed pominięciem), więc wyrażenia w ciele muszą przeżyć puste dane.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe } from "vitest";
import {
	brakiTresci,
	MANIFEST_TRESCI,
	REPO_TRESCI,
	TRYB_OPCJONALNY,
} from "../../tools/tresc-prywatna";

export { brakiTresci, MANIFEST_TRESCI, REPO_TRESCI, TRYB_OPCJONALNY };

/** Czy komplet treści prywatnej leży na dysku (policzone raz na proces). */
export const TRESC_OBECNA = brakiTresci().length === 0;

function komunikatBraku(rel: string): string {
	return [
		`BRAK TREŚCI PRYWATNEJ: ${rel}`,
		`Ten plik niesie klucze odpowiedzi i mieszka w prywatnym repo ${REPO_TRESCI}.`,
		"",
		"W CI: krok „Zaciąg treści prywatnej” nie dowiózł plików — sprawdź sekret",
		"CONTENT_REPO_KEY (deploy key read-only) i konkluzję tego kroku.",
		"Lokalnie: `pnpm tresc:sync` (wymaga dostępu do repo treści).",
		"",
		"Jeśli świadomie uruchamiasz suitę BEZ treści (np. fork bez sekretu),",
		"zadeklaruj to jawnie: SKILLBRIDGE_TRESC_OPCJONALNA=1 — wtedy te testy",
		"zostaną POMINIĘTE, a nie po cichu zaliczone.",
	].join("\n");
}

/**
 * Czyta plik treści prywatnej jako tekst.
 * Brak pliku → rzuca (stan 2) albo oddaje zastępnik w trybie opcjonalnym (stan 3).
 */
export function czytajTrescTekst(rel: string, zastepnik = ""): string {
	try {
		return readFileSync(join(process.cwd(), rel), "utf8");
	} catch {
		if (TRYB_OPCJONALNY) return zastepnik;
		throw new Error(komunikatBraku(rel));
	}
}

/**
 * Czyta plik treści prywatnej jako JSON.
 * Brak pliku → rzuca (stan 2) albo oddaje `zastepnik` w trybie opcjonalnym (stan 3).
 */
export function czytajTrescJson<T>(rel: string, zastepnik: T): T {
	try {
		return JSON.parse(readFileSync(join(process.cwd(), rel), "utf8")) as T;
	} catch (err) {
		if (TRYB_OPCJONALNY) return zastepnik;
		// Błąd parsowania to NIE brak pliku — nie chowamy go za komunikatem o zaciągu.
		if (err instanceof SyntaxError) throw err;
		throw new Error(komunikatBraku(rel));
	}
}

/**
 * Wariant dla zależności POŚREDNICH — gdy plików treści nie czyta test, tylko
 * narzędzie, które test woła (np. `inwentarzCytatow` skanuje katalog atomów
 * przez `readdirSync`). Bez tego brak treści dawałby surowy ENOENT z wnętrza
 * narzędzia zamiast komunikatu, który mówi, co naprawić.
 */
export function gdyTresc<T>(fn: () => T, zastepnik: T, rel = "(zależność pośrednia)"): T {
	if (TRESC_OBECNA) return fn();
	if (TRYB_OPCJONALNY) return zastepnik;
	throw new Error(komunikatBraku(rel));
}

/**
 * `describe` dla suit czytających treść prywatną.
 * Tryb opcjonalny (fork bez sekretu) → `describe.skip` z dopiskiem w nazwie, żeby
 * pominięcie było widać w raporcie, a nie tylko w liczniku.
 */
export const describeTresc: typeof describe = (
	TRESC_OBECNA || !TRYB_OPCJONALNY ? describe : describe.skip
) as typeof describe;
