import { describe, expect, it, vi } from "vitest";
import {
	type JournalEntry,
	porownajDziennik,
	sprawdzSwiezosc,
	uruchom,
	ustalPrzeszkodeReferencji,
} from "../../../tools/prod-journal-check";

// Strażnicy narzędzia bramkującego ceremonię produkcyjną. Historia dwóch wad:
//
// WADA 1 (2026-08-12): narzędzie czytało dziennik z DYSKU i nazywało to spójnością.
//   Z drzewa 13 commitów w tyle zwróciło „WYNIK: spójny" przy 0047 czekającej.
// WADA 2 (Leo, przegląd naprawy wady 1): naprawa przeniosła granicę zaufania
//   z dysku na REFERENCJĘ i zostawiła dwie drogi powrotu tej samej fałszywej zieleni —
//   `PROD_JOURNAL_SKIP_FETCH=1` oraz `PROD_JOURNAL_REF=HEAD`.
//
// Reguła pilnowana poniżej: ZIELONY WERDYKT WYMAGA POTWIERDZENIA WOBEC ZDALNEGO.
// Brak potwierdzenia => NIEROZSTRZYGNIĘTY. Nigdy „spójny".

const wpis = (idx: number, when: number, tag: string): JournalEntry => ({ idx, when, tag });

const M45 = wpis(45, 1_785_000_000_000, "0045_lazy_spitfire");
const M46 = wpis(46, 1_785_500_000_000, "0046_demonic_maria_hill");
const M47 = wpis(47, 1_786_012_752_593, "0047_sad_la_nuit");

const REF_SWIEZY = [M45, M46, M47];
const DYSK_NIESWIEZY = [M45, M46]; // przypadek z 2026-08-12
const PROD_BEZ_47 = [M45.when, M46.when];

const bezPrzeszkody = { przeszkoda: null };

describe("W-1/W-4a: świeżość drzewa roboczego", () => {
	it("NIEŚWIEŻE DRZEWO CZERWIENI: brak 0047 na dysku = NIESPÓJNY", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: DYSK_NIESWIEZY,
			applied: PROD_BEZ_47,
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
		expect(w.rozjazdDrzewa?.brakNaDysku).toEqual(["0047_sad_la_nuit"]);
		expect(w.pending.map((e) => e.tag)).toEqual(["0047_sad_la_nuit"]);
	});

	it("wykrywa drzewo z NADMIAREM", () => {
		const lokalna = wpis(48, 1_786_900_000_000, "0048_lokalny_eksperyment");
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: [...REF_SWIEZY, lokalna],
			applied: [M45.when, M46.when, M47.when],
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
		expect(w.rozjazdDrzewa?.nadmiarNaDysku).toEqual(["0048_lokalny_eksperyment"]);
	});

	// W-4a (Leo): sam `when` nie wystarcza — podmiana NAZWY przy tym samym znaczniku.
	it("W-4a: PODMIANA NAZWY przy tym samym znaczniku czasu CZERWIENI", () => {
		const podmieniona = wpis(47, M47.when, "0047_moja_wersja");
		expect(sprawdzSwiezosc([M47], [podmieniona])).not.toBeNull();

		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: [M45, M46, podmieniona],
			applied: PROD_BEZ_47,
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
	});

	it("KONTROLA: świeże drzewo + baza równa referencji = SPÓJNY", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M46.when, M47.when],
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("SPOJNY");
		expect(w.rozjazdDrzewa).toBeNull();
	});

	it("KONTROLA: świeże drzewo + migracja niezastosowana = SPÓJNY z PENDING", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: PROD_BEZ_47,
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("SPOJNY");
		expect(w.pending.map((e) => e.tag)).toEqual(["0047_sad_la_nuit"]);
	});
});

describe("W-4b: porównywane są PLIKI, nie tylko dziennik", () => {
	// Leo: lokalnie zmieniony 0047_sad_la_nuit.sql przy NIETKNIĘTYM dzienniku
	// przechodził obie bramki, a na produkcję pojechałaby treść z dysku.
	it("rozjazd treści `drizzle/` CZERWIENI, choć dziennik jest identyczny", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY, // dziennik bez zarzutu
			applied: [M45.when, M46.when, M47.when],
			rozjazdPlikow: true, // ale treść plików inna
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
		expect(w.rozjazdPlikow).toBe(true);
	});
});

describe("W-2: zielony werdykt wymaga potwierdzenia wobec ZDALNEGO", () => {
	const bazowe = { refJestZdalna: true, refZgodnaZeZdalnym: true, ref: "origin/main" };

	it("PROD_JOURNAL_SKIP_FETCH=1 => przeszkoda (przypadek A Leo)", () => {
		expect(ustalPrzeszkodeReferencji({ ...bazowe, pominietoFetch: true })).not.toBeNull();
	});

	it("referencja lokalna (HEAD) => przeszkoda (przypadek C Leo)", () => {
		expect(
			ustalPrzeszkodeReferencji({
				...bazowe,
				pominietoFetch: false,
				refJestZdalna: false,
				ref: "HEAD",
			}),
		).not.toBeNull();
	});

	it("brak łączności (null) => przeszkoda, a nie cicha zieleń", () => {
		expect(
			ustalPrzeszkodeReferencji({ ...bazowe, pominietoFetch: false, refZgodnaZeZdalnym: null }),
		).not.toBeNull();
	});

	it("referencja rozjechana ze zdalnym => przeszkoda", () => {
		expect(
			ustalPrzeszkodeReferencji({ ...bazowe, pominietoFetch: false, refZgodnaZeZdalnym: false }),
		).not.toBeNull();
	});

	it("KONTROLA: fetch wykonany + referencja zdalna i zgodna => brak przeszkody", () => {
		expect(ustalPrzeszkodeReferencji({ ...bazowe, pominietoFetch: false })).toBeNull();
	});

	it("PRZESZKODA NIGDY NIE DAJE „SPÓJNY” — nawet gdy wszystko inne się zgadza", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M46.when, M47.when],
			przeszkoda: "referencji nie odświeżono",
		});
		expect(w.werdykt).toBe("NIEROZSTRZYGNIETY");
		expect(w.werdykt).not.toBe("SPOJNY");
	});

	it("twarde znalezisko bije nierozstrzygnięcie (NIESPÓJNY > NIEROZSTRZYGNIĘTY)", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: DYSK_NIESWIEZY,
			applied: PROD_BEZ_47,
			przeszkoda: "referencji nie odświeżono",
		});
		expect(w.werdykt).toBe("NIESPOJNY");
	});
});

describe("W-3: przy STOP-ie baza produkcyjna NIE jest dotykana", () => {
	// Deklaracja „bramka świeżości przed połączeniem do bazy" nie miała strażnika —
	// Leo wyciął całe 20 linii tej bramki i suita była 6/6 zielona.
	const zaleznosci = (over: Partial<Parameters<typeof uruchom>[0]>) => ({
		journalRef: REF_SWIEZY,
		journalDisk: REF_SWIEZY,
		przeszkoda: null,
		rozjazdPlikow: false,
		pobierzZastosowane: vi.fn(async () => [M45.when, M46.when, M47.when]),
		log: () => {},
		err: () => {},
		...over,
	});

	it("nieświeże drzewo => `pobierzZastosowane` NIE jest wołane", async () => {
		const d = zaleznosci({ journalDisk: DYSK_NIESWIEZY });
		const w = await uruchom(d);
		expect(d.pobierzZastosowane).not.toHaveBeenCalled();
		expect(w.werdykt).toBe("NIESPOJNY");
	});

	it("rozjazd plików `drizzle/` => `pobierzZastosowane` NIE jest wołane", async () => {
		const d = zaleznosci({ rozjazdPlikow: true });
		await uruchom(d);
		expect(d.pobierzZastosowane).not.toHaveBeenCalled();
	});

	it("KONTROLA: drzewo świeże => baza JEST odpytywana (bramka nie blokuje wszystkiego)", async () => {
		const d = zaleznosci({});
		const w = await uruchom(d);
		expect(d.pobierzZastosowane).toHaveBeenCalledTimes(1);
		expect(w.werdykt).toBe("SPOJNY");
	});
});

describe("drift i luki", () => {
	it("DRIFT: wpis na produkcji bez odpowiednika w referencji", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M46.when, 1_999_000_000_000],
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
		expect(w.drift).toEqual([1_999_000_000_000]);
	});

	it("LUKA: migracja przeskoczona", () => {
		const w = porownajDziennik({
			journalRef: REF_SWIEZY,
			journalDisk: REF_SWIEZY,
			applied: [M45.when, M47.when],
			...bezPrzeszkody,
		});
		expect(w.werdykt).toBe("NIESPOJNY");
		expect(w.gaps.map((e) => e.tag)).toEqual(["0046_demonic_maria_hill"]);
	});
});
