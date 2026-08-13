/**
 * N1 — KONTRAKT: zdanie o kolejności modułów ma w kodzie produkcyjnym DOKŁADNIE
 * JEDEN NOŚNIK (`src/components/curriculum/labels.ts`). Pozostałe powierzchnie
 * mają je WOŁAĆ, nie POWTARZAĆ (CLAUDE.md v1.17).
 *
 * DLACZEGO TEN TEST ISTNIEJE. Zdanie „bez skrótów" usunięto ze `/curriculum`
 * jako dług D7 i uznano dług za spłacony. Druga kopia — nagłówek kafelka pulpitu
 * — przeżyła spłatę nietknięta, bo była literałem w JSX, poza zasięgiem
 * strażnika D7 (`src/components/curriculum/__tests__/curriculum-intro-d7.test.ts`
 * pilnuje wyłącznie stałych w `labels.ts`). Kafelek pulpitu to PIERWSZE drzwi na
 * drabinę, więc kopia stała dokładnie tam, gdzie student trafia najpierw.
 * Rozpoznanie: Sophia (PO), WADA 1 — `scratchpad/lejek-diagnozy-sophia.md` §4.3.
 *
 * CZEGO PILNUJE. Nie brzmienia (to mikrocopy Sophii, wolno je redagować), tylko
 * LICZBY MIEJSC, w których obietnica o kolejności jest zapisana. Trzecia kopia w
 * dowolnym pliku produkcyjnym czerwieni ten test niezależnie od tego, czy akurat
 * jest prawdziwa — bo rozjazd kopii, nie ich treść, jest tu awarią.
 *
 * ZAKRES. Skanujemy kod produkcyjny w `src/` (bez testów). Komentarze są
 * usuwane przed skanem: opis reguły nie jest jej drugim nośnikiem, a zakaz
 * pisania o niej w komentarzu zamieniłby strażnika w karę za dokumentowanie
 * (ten sam błąd, który naprawiał `#296`).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

/** Jedyny dozwolony nośnik obietnicy o kolejności modułów. */
const NOSNIK = "src/components/curriculum/labels.ts";

/**
 * Fragmenty obietnicy o kolejności — każdy sam w sobie jest tą samą regułą
 * powiedzianą studentowi. „bez skrótów" to brzmienie wariantu bez placementu,
 * „po zaliczeniu poprzedniego" — jego rdzeń, który przeżył także w podpisie
 * sekcji na pulpicie (druga kopia obok nagłówka, ta sama wada).
 */
const OBIETNICE = ["bez skrótów", "po zaliczeniu poprzedniego"];

/** Usuwa komentarze blokowe, JSX-owe i liniowe (przybliżenie wystarczające dla tego skanu). */
function bezKomentarzy(tresc: string): string {
	return tresc.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

function plikiProdukcyjne(): { sciezka: string; tresc: string }[] {
	return readdirSync(SRC, { recursive: true, encoding: "utf8" })
		.filter((p) => /\.tsx?$/.test(p))
		.filter((p) => !/__tests__|__mocks__|\.test\.|\.spec\.|[/\\]test[/\\]/.test(p))
		.map((p) => join(SRC, p))
		.map((sciezka) => ({
			sciezka: relative(process.cwd(), sciezka).replace(/\\/g, "/"),
			tresc: bezKomentarzy(readFileSync(sciezka, "utf8")),
		}));
}

describe("N1 — obietnica o kolejności modułów ma jeden nośnik", () => {
	for (const obietnica of OBIETNICE) {
		it(`„${obietnica}" występuje wyłącznie w ${NOSNIK}`, () => {
			const winowajcy = plikiProdukcyjne()
				.filter(({ tresc }) => tresc.includes(obietnica))
				.map(({ sciezka }) => sciezka)
				.filter((sciezka) => sciezka !== NOSNIK);

			expect(winowajcy, `Druga kopia obietnicy „${obietnica}" — zawołaj stałą z ${NOSNIK}`).toEqual(
				[],
			);
		});
	}

	it("nośnik faktycznie niesie oba warianty (kontrola negatywna skanu)", async () => {
		const { CURRICULUM_INTRO, CURRICULUM_INTRO_WITH_PLACEMENT } = await import(
			"@/components/curriculum/labels"
		);
		// Gdyby skan wyżej przechodził dlatego, że fraza zniknęła z całego repo,
		// ten test padnie — strażnik ma pilnować JEDNEGO nośnika, nie ZERA.
		expect(CURRICULUM_INTRO).toContain("bez skrótów");
		expect(CURRICULUM_INTRO_WITH_PLACEMENT).not.toContain("bez skrótów");
	});
});
