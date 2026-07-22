/**
 * ADR-016 — kontrakt środowiska wykonawczego treści Data Science.
 *
 * PROBLEM (ADR-016 §1): treść cytuje WYTWORY środowiska — dosłowne komunikaty
 * błędów, surowe liczby, domyślne nazwy kolumn. Są funkcją wersji silnika,
 * a Colab podbija wersje bez uprzedzenia. Gdy podbije, treść przestaje opisywać
 * rzeczywistość i NIC tego nie wykrywa. Ten plik jest tym „czymś".
 *
 * TRZY POZIOMY (ADR-016 D2):
 *   1  — parytet: zainstalowane == piny z `srodowisko-colab.json`, workflow
 *        czyta piny stamtąd (koniec wersji wpisanych na sztywno, D1);
 *   2  — asercja cytatów: dla każdego wiersza tablicy wykonujemy fragment kodu,
 *        który komunikat PRODUKUJE, i sprawdzamy, że cytat z treści dalej jest
 *        jego prefiksem. To jest sedno — asercja na numerze wersji po
 *        `pip install` jest prawie tautologią (ADR-016 §5);
 *   2a — domknięcie inwentarza: skan artefaktów studenta wymaga, żeby KAŻDY
 *        znaleziony kształt `NazwaBłędu: tekst` miał wiersz w tablicy.
 *        Bez tego poziom 2 sprawdzałby własną kopię, nie produkt.
 *
 * ZASTĘPUJE bramkę pomostową z `notebooks-meda.contract.test.ts` (porównywała
 * krok pip z deklaracją, dopóki wersje żyły w dwóch miejscach).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildNotebook } from "../../../tools/build-notebooks";
import { buildSondaSource, KONTRAKT_BDL } from "../../../tools/build-sonda-srodowiska";
import {
	CYTATY_SILNIKOW,
	cytatSpelniony,
	PREAMBULY,
} from "../../../tools/content/notebooks/cytaty-silnikow";
import { inwentarzCytatow } from "../../../tools/content/notebooks/inwentarz-cytatow";
import {
	czytajSrodowisko,
	pinPasuje,
	pinySpec,
	sprawdzBramkeSrodowiska,
	wiekSondyDni,
	zakresPasuje,
} from "../../../tools/srodowisko-colab";

const ROOT = process.cwd();
const HARNESS = join(ROOT, "tests", "unit", "ds", "silniki-harness.py");
const WORKFLOW = join(ROOT, ".github", "workflows", "pr.yml");

/** Import pandas + duckdb w świeżym procesie potrafi zająć kilka sekund. */
const HARNESS_TIMEOUT_MS = 90_000;

/**
 * Czy biegniemy w CI. Poziom 1 jest TWARDY tylko tam — na maszynie dev stoi
 * duckdb 1.5.x (świadoma decyzja partii 6: pinujemy do COLABA, nie do dev),
 * więc twardy parytet lokalnie czerwieniłby każdy przebieg u każdego. Czerwone,
 * którego nikt nie naprawia, uczy ignorować czerwone — ta sama zasada, którą
 * ADR-016 D4 stosuje do PR-ów. Lokalnie rozjazd idzie na `console.warn`
 * z gotową komendą naprawy, a poziom 2 (cytaty) biegnie BEZ ULGI: jeśli nowszy
 * silnik zmienił brzmienie komunikatu, deweloper dowie się o tym pierwszy.
 */
const W_CI = process.env.CI === "true" || process.env.CI === "1";

type WynikHarnessu = {
	wersje: Record<string, string>;
	wyniki: { id: string; blad: string | null; stdout: string }[];
};

let harness: WynikHarnessu;

beforeAll(() => {
	const wiersze = CYTATY_SILNIKOW.filter((w) => w.kod !== null).map((w) => ({
		id: w.id,
		silnik: w.silnik,
		kod: w.kod as string,
	}));
	const out = execFileSync("python3", [HARNESS], {
		input: JSON.stringify({ preambuly: PREAMBULY, wiersze }),
		encoding: "utf8",
		maxBuffer: 20_000_000,
	});
	harness = JSON.parse(out) as WynikHarnessu;
}, HARNESS_TIMEOUT_MS);

describe("ADR-016 poziom 1 — deklaracja środowiska jest jedynym źródłem wersji", () => {
	it("deklaracja jest spójna: piny parsowalne, zakres Pythona sensowny, data sondy poprawna", () => {
		const srodowisko = czytajSrodowisko();
		expect(Object.keys(srodowisko.pakiety).length).toBeGreaterThan(0);
		for (const [nazwa, pakiet] of Object.entries(srodowisko.pakiety)) {
			if (typeof pakiet.pin === "string") {
				// Rzuca przy nieznanym operatorze — pin „jakiś" nie przejdzie po cichu.
				expect(pinPasuje(pakiet.pin, "999.999.999"), `${nazwa}: pin parsowalny`).toBeTypeOf(
					"boolean",
				);
			}
			if (typeof pakiet.zakres === "string") {
				expect(zakresPasuje(pakiet.zakres, "3.12.0"), `${nazwa}: zakres parsowalny`).toBeTypeOf(
					"boolean",
				);
			}
			for (const klucz of ["zweryfikowano"] as const) {
				const wartosc = pakiet[klucz];
				if (wartosc !== null && wartosc !== undefined) {
					expect(wartosc, `${nazwa}.${klucz}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				}
			}
		}
		// null = nigdy nie mierzone (dziś); data = format ISO i wiek policzalny.
		if (srodowisko.ostatnia_sonda !== null) {
			expect(srodowisko.ostatnia_sonda).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(wiekSondyDni(srodowisko)).toBeGreaterThanOrEqual(0);
		}
		expect(typeof srodowisko.rozjazd).toBe("boolean");
	});

	it("workflow NIE ma wersji wpisanych na sztywno — instaluje piny odczytane z deklaracji", () => {
		// ADR-016 D1 kryterium „zrobione" nr 1: jedna liczba wersji, nie trzy kopie.
		const workflow = readFileSync(WORKFLOW, "utf8");
		const naSztywno = [...workflow.matchAll(/^[^#\n]*\b([a-z][\w-]+)\s*(~=|==)\s*\d[\w.]*/gm)].map(
			(m) => m[0].trim(),
		);
		expect(naSztywno, "wersje wpisane na sztywno w .github/workflows/pr.yml").toEqual([]);
		// …a krok pip bierze je z jedynego źródła prawdy.
		expect(workflow).toContain("tools/srodowisko-colab.ts --piny");
		expect(workflow).toMatch(/python3 -m pip install \$\{?PIP_PINY/);
	});

	it("odczyt pinów daje niepustą, deterministyczną listę specyfikacji dla pipa", () => {
		const piny = pinySpec();
		expect(piny.length).toBeGreaterThanOrEqual(3);
		for (const spec of piny) expect(spec).toMatch(/^[a-z][\w-]*(~=|==)\d/);
		expect([...piny].sort()).toEqual(piny); // stabilna kolejność = stabilny cache CI
	});

	it("zainstalowane wersje zgadzają się z pinami deklaracji (TWARDE w CI, ostrzeżenie lokalnie)", () => {
		const srodowisko = czytajSrodowisko();
		const rozjazdy: string[] = [];
		for (const [nazwa, pakiet] of Object.entries(srodowisko.pakiety)) {
			const zainstalowana = harness.wersje[nazwa];
			if (!zainstalowana) continue; // pakiet spoza harnessu — nie zgadujemy
			if (zainstalowana.startsWith("BRAK")) {
				rozjazdy.push(`${nazwa}: nie zainstalowany (${zainstalowana})`);
				continue;
			}
			if (typeof pakiet.pin === "string" && !pinPasuje(pakiet.pin, zainstalowana)) {
				rozjazdy.push(`${nazwa}: pin ${pakiet.pin}, zainstalowane ${zainstalowana}`);
			}
			if (typeof pakiet.zakres === "string" && !zakresPasuje(pakiet.zakres, zainstalowana)) {
				rozjazdy.push(`${nazwa}: zakres ${pakiet.zakres}, zainstalowane ${zainstalowana}`);
			}
		}
		if (rozjazdy.length > 0 && !W_CI) {
			// process.stderr, NIE console.warn: reporter vitesta połyka console
			// w zielonym przebiegu, a ostrzeżenie, którego nikt nie zobaczy,
			// jest brakiem ostrzeżenia (ADR-016 §5 o „logu, którego nikt nie czyta").
			process.stderr.write(
				`\n⚠ ADR-016 poziom 1: środowisko lokalne rozjeżdża się z deklaracją:\n` +
					`${rozjazdy.map((r) => `   • ${r}`).join("\n")}\n` +
					`   Cytaty (poziom 2) i tak są sprawdzane — na TWOICH wersjach.\n` +
					`   Zrównanie z Colabem: python3 -m pip install ${pinySpec()
						.map((s) => `"${s}"`)
						.join(" ")}\n`,
			);
		}
		if (W_CI) expect(rozjazdy, "rozjazd zainstalowanych wersji z pinami").toEqual([]);
	});
});

describe("ADR-016 poziom 2 — cytaty komunikatów silnika wykonane, nie zadeklarowane", () => {
	const doWykonania = CYTATY_SILNIKOW.filter((w) => w.kod !== null);

	it("tablica pokrywa obie rodziny silników i obie klasy cytatów (K1 komunikat, K2 wynik)", () => {
		expect(doWykonania.filter((w) => w.silnik === "duckdb").length).toBeGreaterThanOrEqual(5);
		expect(
			doWykonania.filter((w) => w.silnik !== "duckdb" && w.rodzaj === "komunikat").length,
		).toBeGreaterThanOrEqual(11);
		expect(doWykonania.filter((w) => w.rodzaj === "wynik").length).toBeGreaterThanOrEqual(3);
		// Identyfikatory unikalne — inaczej wynik harnessu trafiałby w zły wiersz.
		expect(new Set(CYTATY_SILNIKOW.map((w) => w.id)).size).toBe(CYTATY_SILNIKOW.length);
	});

	for (const wiersz of doWykonania) {
		it(`${wiersz.id} · ${wiersz.cytat}`, () => {
			const wynik = harness.wyniki.find((w) => w.id === wiersz.id);
			expect(wynik, `${wiersz.id}: brak wyniku z harnessu`).toBeDefined();
			if (!wynik) return;
			const faktyczny =
				wiersz.rodzaj === "komunikat"
					? (wynik.blad ?? "<fragment NIE rzucił błędu>")
					: wynik.stdout.trim();
			const ok = cytatSpelniony(faktyczny, wiersz.cytat, wiersz.dopasowanie ?? "prefiks");
			expect(
				ok,
				`${wiersz.id} (${wiersz.gdzie})\n` +
					`   treść obiecuje: ${wiersz.cytat}\n` +
					`   silnik oddał:   ${faktyczny}\n` +
					`   Wersje: ${JSON.stringify(harness.wersje)}\n` +
					`   → albo silnik zmienił brzmienie (zadanie treściowe dla Sophii),\n` +
					`     albo fragment w tablicy przestał produkować ten komunikat.`,
			).toBe(true);
		});
	}

	it("wiersze odroczone mają powód z zamkniętej listy i niepusty odnośnik", () => {
		// Jedyna furtka poziomu 2 — celowo wąska: bez odnośnika nie przejdzie,
		// a każde nowe odroczenie widać w diffie tablicy.
		const odroczone = CYTATY_SILNIKOW.filter((w) => w.kod === null);
		for (const w of odroczone) {
			expect(w.odroczono, `${w.id}: brak kodu wymaga jawnego odroczenia`).toBeDefined();
			expect(w.odroczono?.powod).toBe("silnik-poza-pinem");
			expect((w.odroczono?.odnosnik ?? "").length, `${w.id}: uzasadnienie`).toBeGreaterThan(40);
		}
		// Sufit odroczeń: bezpiecznik przed cichym rozpełzaniem się furtki.
		expect(odroczone.length, "liczba cytatów bez wykonywalnej asercji").toBeLessThanOrEqual(1);
	});
});

describe("ADR-016 poziom 2a — inwentarz cytatów domknięty (tablica ≡ treść)", () => {
	const inwentarz = inwentarzCytatow(ROOT);
	const cytatyTablicy = new Set(CYTATY_SILNIKOW.map((w) => w.cytat));

	it("skaner w ogóle coś widzi (regres skanera byłby cichym rozbrojeniem bramki)", () => {
		expect(inwentarz.length).toBeGreaterThanOrEqual(25);
	});

	it("KAŻDY kształt `NazwaBłędu: tekst` z treści studenta ma wiersz w tablicy asercji", () => {
		const bezAsercji = inwentarz.filter((z) => !cytatyTablicy.has(z.ksztalt));
		expect(
			bezAsercji.map((z) => `${z.ksztalt}   [${z.zrodla.join(", ")}]`),
			"cytaty w treści BEZ wiersza w tools/content/notebooks/cytaty-silnikow.ts\n" +
				"(ADR-016 D5.2: każdy nowy cytat verbatim = nowy wiersz w tablicy)",
		).toEqual([]);
	});

	it("KAŻDY wiersz tablicy typu `prefiks` ma pokrycie w treści (zero martwych asercji)", () => {
		// Odwrotna strona domknięcia: tablica nie ma prawa pilnować cytatów,
		// których w produkcie już nie ma — inaczej zamarza na starej treści.
		const ksztalty = new Set(inwentarz.map((z) => z.ksztalt));
		// Dotyczy WYŁĄCZNIE cytatów-komunikatów dopasowywanych prefiksem: wiersze
		// K2 (surowy wynik: `21.833…`, `count_star()`) nie mają kształtu
		// `NazwaBłędu: tekst`, więc skaner ich nie widzi z definicji.
		const martwe = CYTATY_SILNIKOW.filter(
			(w) =>
				w.rodzaj === "komunikat" &&
				(w.dopasowanie ?? "prefiks") === "prefiks" &&
				!ksztalty.has(w.cytat),
		).map((w) => `${w.id}: ${w.cytat}`);
		expect(martwe, "wiersze tablicy bez odpowiednika w treści").toEqual([]);
	});
});

describe("ADR-016 D3 — sonda Colab mierzy DOKŁADNIE to, co asertuje CI", () => {
	const SONDA_SRC = join(ROOT, "tools", "content", "notebooks", "sonda", "sonda-srodowiska.py");
	const SONDA_NB = join(ROOT, "notebooks", "sonda", "sonda-srodowiska.ipynb");

	it("źródło sondy w repo == świeży wynik generatora (zero ręcznych edycji)", () => {
		// Ręcznie dopisany cytat w sondzie rozjechałby ją z tablicą — i sonda
		// mierzyłaby wczorajszą treść. Generator jest jedyną drogą.
		expect(
			readFileSync(SONDA_SRC, "utf8"),
			"sonda rozjechała się z tablicą/deklaracją — napraw jedną komendą:\n" +
				"   pnpm content:build-sonda && pnpm content:build-notebooks",
		).toBe(buildSondaSource());
	});

	it("zbudowany notebook sondy == rebuild ze źródła", () => {
		expect(
			readFileSync(SONDA_NB, "utf8"),
			"notebook sondy nieprzebudowany — `pnpm content:build-notebooks`",
		).toBe(buildNotebook(SONDA_SRC, "sonda-srodowiska"));
	});

	it("sonda niesie KAŻDY wykonywalny wiersz tablicy + kontrakt API GUS/BDL", () => {
		const zrodlo = readFileSync(SONDA_SRC, "utf8");
		for (const wiersz of CYTATY_SILNIKOW.filter((w) => w.kod !== null)) {
			expect(zrodlo, `sonda bez wiersza ${wiersz.id}`).toContain(`"${wiersz.id}"`);
		}
		// Rekomendacja Quinna: jeśli GUS zmieni API, testy zostaną zielone
		// (jadą na atrapie), a notebook studenta padnie. Sonda jest jedynym
		// miejscem, które tę klasę awarii zobaczy.
		expect(zrodlo).toContain(KONTRAKT_BDL.url);
		expect(zrodlo).toContain("KONTRAKT API GUS/BDL");
		expect(zrodlo).toContain("--- WYNIK MASZYNOWY (JSON) ---");
	});

	it("sonda NIE instaluje niczego pipem — ma zmierzyć Colaba, nie nasze życzenia", () => {
		// Liczy się KOD, nie proza (instrukcja w markdownie wprost mówi „bez pip").
		const nb = JSON.parse(readFileSync(SONDA_NB, "utf8")) as {
			cells: { cell_type: string; source: string[] }[];
		};
		const kod = nb.cells
			.filter((c) => c.cell_type === "code")
			.map((c) => c.source.join(""))
			.join("\n");
		expect(kod).not.toMatch(/[!%]pip|subprocess|pip install/);
	});
});

describe("ADR-016 D4 — bramka publikacji (stan deklaracji)", () => {
	it("bramka zwraca jednoznaczny werdykt z powodem z zamkniętej listy", () => {
		const wynik = sprawdzBramkeSrodowiska();
		if (!wynik.ok) {
			expect(["rozjazd", "brak-sondy", "sonda-przeterminowana"]).toContain(wynik.powod);
			expect(wynik.komunikat.length).toBeGreaterThan(40);
			process.stderr.write(
				`\n⚠ ADR-016 D4: bramka publikacji ZAMKNIĘTA [${wynik.powod}] — ${wynik.komunikat}\n`,
			);
		}
	});

	it("bramka jest ZAMKNIĘTA przy rozjeździe i przy przeterminowanej sondzie", () => {
		const bazowe = czytajSrodowisko();
		const teraz = new Date("2026-07-22T12:00:00Z");
		const zRozjazdem = { ...bazowe, rozjazd: true, ostatnia_sonda: "2026-07-22" };
		expect(sprawdzBramkeSrodowiska(zRozjazdem, teraz).ok).toBe(false);

		const swieza = { ...bazowe, rozjazd: false, ostatnia_sonda: "2026-06-01" };
		expect(sprawdzBramkeSrodowiska(swieza, teraz).ok).toBe(true);

		const stara = { ...bazowe, rozjazd: false, ostatnia_sonda: "2026-01-01" };
		const wynikStarej = sprawdzBramkeSrodowiska(stara, teraz);
		expect(wynikStarej.ok).toBe(false);
		if (!wynikStarej.ok) expect(wynikStarej.powod).toBe("sonda-przeterminowana");

		const bezSondy = { ...bazowe, rozjazd: false, ostatnia_sonda: null };
		const wynikBezSondy = sprawdzBramkeSrodowiska(bezSondy, teraz);
		expect(wynikBezSondy.ok).toBe(false);
		if (!wynikBezSondy.ok) expect(wynikBezSondy.powod).toBe("brak-sondy");
	});
});
