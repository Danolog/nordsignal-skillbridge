import { describe, expect, it } from "vitest";
import { type JournalEntry, porownajDziennik } from "../../../tools/prod-journal-check";

// 2026-08-12 — `prod-journal-check` był strażnikiem-atrapą: czytał dziennik migracji
// WYŁĄCZNIE z drzewa roboczego i nazywał wynik „spójnością". Odpalony na żywym prodzie
// z drzewa 13 commitów za `origin/main` zwrócił „✅ Brak migracji do zastosowania …
// WYNIK: spójny", podczas gdy `0047_sad_la_nuit` (2026-08-06) czekała niezastosowana.
// Narzędzie pilnujące spójności produkcji skłamało, bo mierzyło dysk zamiast referencji.
//
// Te testy pilnują reguły: NIEŚWIEŻE DRZEWO MA CZERWIENIĆ, NIE ZIELENIĆ.

const wpis = (idx: number, when: number, tag: string): JournalEntry => ({ idx, when, tag });

// Odwzorowanie realnej sytuacji z 2026-08-12 (skrócone do trzech wpisów).
const M45 = wpis(45, 1_785_000_000_000, "0045_lazy_spitfire");
const M46 = wpis(46, 1_785_500_000_000, "0046_demonic_maria_hill");
const M47 = wpis(47, 1_786_012_752_593, "0047_sad_la_nuit");

const REF_SWIEZY = [M45, M46, M47];
const DYSK_NIESWIEZY = [M45, M46]; // drzewo sprzed 0047 — dokładnie przypadek z 2026-08-12
const PROD_BEZ_47 = [M45.when, M46.when];

describe("porownajDziennik — świeżość drzewa roboczego", () => {
	it("NIEŚWIEŻE DRZEWO CZERWIENI: brak 0047 na dysku = niespójny, mimo że baza zgadza się z dyskiem", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: DYSK_NIESWIEZY,
			applied: PROD_BEZ_47,
		});

		// To jest zdanie, którego stara wersja NIE potrafiła powiedzieć.
		expect(w.failed).toBe(true);
		expect(w.rozjazdDrzewa).not.toBeNull();
		expect(w.rozjazdDrzewa?.brakNaDysku).toEqual(["0047_sad_la_nuit"]);

		// I druga połowa prawdy: migracja jest do zastosowania, a nie „brak migracji".
		expect(w.pending.map((e) => e.tag)).toEqual(["0047_sad_la_nuit"]);
	});

	it("wykrywa też drzewo z NADMIAREM — migracja lokalna, której nie ma w referencji", () => {
		const lokalna = wpis(48, 1_786_900_000_000, "0048_lokalny_eksperyment");
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: [...REF_SWIEZY, lokalna],
			applied: [M45.when, M46.when, M47.when],
		});
		expect(w.failed).toBe(true);
		expect(w.rozjazdDrzewa?.nadmiarNaDysku).toEqual(["0048_lokalny_eksperyment"]);
	});

	// KONTROLA DWUSTRONNA — strażnik ma nie czerwienić na poprawnym stanie.
	it("KONTROLA: świeże drzewo + baza równa referencji = zielony", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M46.when, M47.when],
		});
		expect(w.failed).toBe(false);
		expect(w.rozjazdDrzewa).toBeNull();
		expect(w.pending).toEqual([]);
	});

	it("KONTROLA: świeże drzewo + jedna migracja niezastosowana = PENDING, ale nie błąd", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: PROD_BEZ_47,
		});
		expect(w.failed).toBe(false);
		expect(w.pending.map((e) => e.tag)).toEqual(["0047_sad_la_nuit"]);
	});
});

describe("porownajDziennik — drift i luki (zachowanie sprzed zmiany)", () => {
	it("DRIFT: wpis na produkcji bez odpowiednika w referencji", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M46.when, 1_999_000_000_000],
		});
		expect(w.failed).toBe(true);
		expect(w.drift).toEqual([1_999_000_000_000]);
	});

	it("LUKA: migracja przeskoczona (starsza niż ostatnia zastosowana, brak w bazie)", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M47.when],
		});
		expect(w.failed).toBe(true);
		expect(w.gaps.map((e) => e.tag)).toEqual(["0046_demonic_maria_hill"]);
	});
});
