// ============================================================================
// 1E.7 (SLICE L4) — NIEZMIENNIK JEDNEGO PISARZA do `curriculum_placements`.
//
// Po co, konkretnie: L5 dokłada rozróżnienie exam/test_out, a naturalną pokusą
// przy „test out" jest dopisanie wiersza odblokowania z trasy egzaminu. Gdyby
// tak się stało, wszystko, co L4 wymusza W REGULE, przestałoby obowiązywać dla
// tej drugiej drogi:
//   • W-6 (moduł zaliczony NIE dostaje wiersza) — bo filtr żyje w regule,
//   • pełny werdykt (level/threshold/reason/support_mode zgodne z DECYZJĄ 2),
//   • idempotencja ON CONFLICT DO NOTHING i niezmienność wiersza (§7 pkt 2),
//   • zdarzenie miernika P-1 przy każdym policzeniu.
// Rozjazd byłby BEZOBJAWOWY: wiersze wyglądałyby poprawnie, a miernik progu
// liczyłby na nich nieprawdę — na tabeli, której z założenia nie wolno poprawić.
//
// Dlatego zapis do tej tabeli ma DOKŁADNIE JEDNEGO pisarza w kodzie
// produkcyjnym. Nowa droga zapisu = świadoma zmiana tej listy, po przeglądzie —
// nie efekt uboczny cudzego slice'a.
//
// Bliźniacze zabezpieczenie od strony DANYCH (a nie kodu): asercja 14
// w `tools/k3-validate.ts` — łapie wiersze sprzeczne z regułą niezależnie od
// tego, kto je zapisał (także backfill albo ręczny INSERT).
// ============================================================================

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const KATALOG_GLOWNY = process.cwd();
const SKANOWANE = ["src", "tools"];

/** Jedyny plik produkcyjny, któremu wolno zapisywać do `curriculum_placements`. */
const DOZWOLONY_PISARZ = "src/lib/curriculum/placement-service.ts";

/** Wzorce zapisu — Drizzle (`insert(curriculumPlacements)`) i surowy SQL. */
const WZORCE_ZAPISU: Array<{ nazwa: string; regex: RegExp }> = [
	{ nazwa: "drizzle insert", regex: /\.insert\(\s*curriculumPlacements\s*\)/ },
	{ nazwa: "drizzle update", regex: /\.update\(\s*curriculumPlacements\s*\)/ },
	{ nazwa: "surowy INSERT", regex: /insert\s+into\s+curriculum_placements/i },
	{ nazwa: "surowy UPDATE", regex: /update\s+curriculum_placements/i },
];

function plikiZrodlowe(katalog: string): string[] {
	const wynik: string[] = [];
	for (const wpis of readdirSync(katalog)) {
		const sciezka = join(katalog, wpis);
		if (statSync(sciezka).isDirectory()) {
			if (wpis === "node_modules" || wpis === ".next") continue;
			wynik.push(...plikiZrodlowe(sciezka));
			continue;
		}
		if (!/\.(ts|tsx)$/.test(wpis)) continue;
		// Testy i migracje są poza zakresem: test MA prawo wstawić wiersz-rekwizyt
		// (robi to `ladder-placement.integration.test.ts`), a migracja to schemat.
		if (/\.(test|spec)\.tsx?$/.test(wpis) || sciezka.includes("__tests__")) continue;
		wynik.push(sciezka);
	}
	return wynik;
}

describe("1E.7 — jeden pisarz do curriculum_placements", () => {
	it("żaden plik produkcyjny poza serwisem placementu nie zapisuje do tabeli", () => {
		const winowajcy: string[] = [];
		for (const katalog of SKANOWANE) {
			for (const plik of plikiZrodlowe(join(KATALOG_GLOWNY, katalog))) {
				const wzgledna = relative(KATALOG_GLOWNY, plik).split("\\").join("/");
				if (wzgledna === DOZWOLONY_PISARZ) continue;
				const tresc = readFileSync(plik, "utf8");
				for (const { nazwa, regex } of WZORCE_ZAPISU) {
					if (regex.test(tresc)) winowajcy.push(`${wzgledna} (${nazwa})`);
				}
			}
		}
		expect(
			winowajcy,
			"Nowa droga zapisu do curriculum_placements. Jeśli to świadoma decyzja " +
				"(L5 test_out?), przenieś zapis do placement-service albo dopisz plik do " +
				"listy PO przeglądzie — razem z dowodem, że W-6, pełny werdykt, " +
				"idempotencja i zdarzenie P-1 obowiązują też na tej drodze.",
		).toEqual([]);
	});

	it("kontrola: dozwolony pisarz FAKTYCZNIE zapisuje (lista nie zwietrzała)", () => {
		// Bez tego test przechodziłby na zielono także wtedy, gdyby zapis zniknął
		// albo przeniósł się gdzie indziej — pilnowałby wtedy pustego zbioru.
		const tresc = readFileSync(join(KATALOG_GLOWNY, DOZWOLONY_PISARZ), "utf8");
		expect(WZORCE_ZAPISU.some(({ regex }) => regex.test(tresc))).toBe(true);
	});
});
