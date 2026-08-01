/**
 * Krok 4 partia 4 (ADR-015) — kontrakt notebooków Colab F3.
 *
 * Nowości względem F2:
 *  1. Pieczątka F3.7 (MINI-PROJEKT) woła TRZY funkcje studenta na próbnej
 *     tabeli (sonda wielofunkcyjna, kamień K2) i sprawdza spójność sum na
 *     danych STUDENTA (K3: kategorie wyprowadzone z danych, nie z raportu).
 *  2. F3.4: pieczątka przelicza sito własną pętlą i wysyła `ref_*` —
 *     serwer porównuje relacjami (checki z f3-dane-python.json).
 *  3. Payload F3.7 spłaszczony: `wydatki` = lista KWOT (nie rekordów) —
 *     kontrakt ładunku nie przenosi słowników.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { evaluateChecks, parseChecks, type StampPayload } from "@/lib/curriculum/lab-checks";
import { atomCode, parseToken, signToken } from "@/lib/curriculum/lab-token";
import {
	buildNotebook,
	listNotebookSources,
	sharedStampBlock,
} from "../../../tools/build-notebooks";
// Atomy niosą klucze odpowiedzi → prywatne repo treści (tools/tresc-prywatna.ts).
// Notebooki i ich źródła ZOSTAJĄ publiczne — student je pobiera.
import { czytajTrescJson, describeTresc } from "../../support/tresc-prywatna";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "tools", "content", "notebooks");
const OUT_DIR = join(ROOT, "notebooks");
const HARNESS = join(ROOT, "tests", "unit", "ds", "notebook-stamp-harness.py");

const STUDENT_ID = "student-parytet-f3-fixture";
const itemIdFor = (slug: string) => `item-${slug}-fixture`;

type HarnessResult = { stdout: string; error: string | null };

function runHarness(req: Record<string, unknown>): HarnessResult {
	const out = execFileSync("python3", [HARNESS], {
		input: JSON.stringify(req),
		encoding: "utf8",
	});
	return JSON.parse(out) as HarnessResult;
}

/** Token pieczątki to jedyna linia w formacie base64url.podpis12hex. */
function tokenFrom(stdout: string): string | null {
	const m = stdout.match(/^[A-Za-z0-9_-]+\.[0-9a-f]{12}$/m);
	return m ? m[0] : null;
}

type PackedF3 = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedF3(): PackedF3 {
	return czytajTrescJson<PackedF3>("tools/content/curriculum-atoms/f3-dane-python.json", {
		items: [],
	} as PackedF3);
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describeTresc("notebooki F3 — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "f3");
	const items = packedF3().items;
	const atoms = items.filter((i) => i.slug !== "f3-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieje 7 źródeł F3 — po jednym na każdy atom F3.1–F3.7 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(7);
		expect(atoms).toHaveLength(7);
		expect(labSlugs).toEqual(["f3-4", "f3-7"]);
		const files = readdirSync(join(OUT_DIR, "f3")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu F3 wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "f3")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/f3`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "f3-przeglad");
		expect(przeglad?.config?.notebookUrl).toBeUndefined();
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("laby mają DOKŁADNIE jedną pieczątkę ze wspólnym blokiem; ćwiczenia — ZERO", () => {
		const shared = sharedStampBlock();
		for (const src of sources) {
			const nb = JSON.parse(
				readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8"),
			) as { cells: { cell_type: string; source: string[] }[] };
			const stampCells = nb.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			const isLab = labSlugs.some((slug) => src.slug.startsWith(`${slug}-`));
			if (isLab) {
				expect(stampCells, `${src.slug}: lab ma pieczątkę`).toHaveLength(1);
				const source = stampCells[0].source.join("");
				expect(source.endsWith(shared), `${src.slug}: blok wspólny bajt w bajt`).toBe(true);
				expect(source).toContain("def _zbierz_wyniki");
			} else {
				expect(stampCells, `${src.slug}: ćwiczenie BEZ pieczątki`).toHaveLength(0);
			}
		}
	});
});

describeTresc("symulacja sesji studenta F3: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedF3()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "f3")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "f3", file);
	};

	// Dane fixture mini-projektu (8 rekordów, 3 kategorie) + wzorcowe funkcje
	// z drabinki (hint 3 dokumentu Sophii).
	const KWOTY = [4.4, 24.5, 12.0, 30.0, 5.5, 4.4, 49.99, 8.99];
	const KATEGORIE = [
		"transport",
		"jedzenie",
		"jedzenie",
		"rozrywka",
		"jedzenie",
		"transport",
		"rozrywka",
		"jedzenie",
	];
	const PROGRAM_F3_7 = [
		"wydatki = [",
		'    {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40},',
		'    {"nazwa": "obiad", "kategoria": "jedzenie", "kwota": 24.50},',
		'    {"nazwa": "kawa", "kategoria": "jedzenie", "kwota": 12.00},',
		'    {"nazwa": "kino", "kategoria": "rozrywka", "kwota": 30.00},',
		'    {"nazwa": "chleb", "kategoria": "jedzenie", "kwota": 5.50},',
		'    {"nazwa": "autobus", "kategoria": "transport", "kwota": 4.40},',
		'    {"nazwa": "gra", "kategoria": "rozrywka", "kwota": 49.99},',
		'    {"nazwa": "ser", "kategoria": "jedzenie", "kwota": 8.99},',
		"]",
		"",
		"def suma_wszystkich(wydatki):",
		"    suma = 0",
		"    for wydatek in wydatki:",
		'        suma = suma + wydatek["kwota"]',
		"    return suma",
		"",
		"def suma_kategorii(wydatki, kategoria):",
		"    suma = 0",
		"    for wydatek in wydatki:",
		'        if wydatek["kategoria"] == kategoria:',
		'            suma = suma + wydatek["kwota"]',
		"    return suma",
		"",
		"def najdrozszy(wydatki):",
		"    lider = wydatki[0]",
		"    for wydatek in wydatki:",
		'        if wydatek["kwota"] > lider["kwota"]:',
		"            lider = wydatek",
		"    return lider",
		"",
		'print(f"Suma tygodnia: {round(suma_wszystkich(wydatki), 2)} zł")',
		"top = najdrozszy(wydatki)",
		"print(f\"Najdroższy: {top['nazwa']} — {round(top['kwota'], 2)} zł\")",
		'print(f"Pozycji: {len(wydatki)}")',
	].join("\n");

	// Arytmetyka JAK w pieczątce (ta sama kolejność dodawań — parytet tokenu).
	const total = KWOTY.reduce((a, b) => a + b, 0);
	const kategorieUnikalne = [...new Set(KATEGORIE)];
	let lacznie = 0;
	for (const kat of kategorieUnikalne) {
		let suma = 0;
		for (let i = 0; i < KWOTY.length; i++) if (KATEGORIE[i] === kat) suma += KWOTY[i];
		lacznie += suma;
	}
	// Sonda: probka pieczątki — suma 20, alfa 14.5, top 10.
	const SONDA = 10.0 + 5.5 + 4.5 + (10.0 + 4.5) + 10.0;

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		expectPayload: StampPayload;
	}[] = [
		{
			name: "f3-4: luki wypełnione → token zalicza relacje ref_*",
			slug: "f3-4",
			replacements: [
				["duze.append(_luka_)", "duze.append(wydatek)"],
				["suma_duzych = _luka_", "suma_duzych = suma_duzych + wydatek"],
				["male_licznik = _luka_", "male_licznik = male_licznik + 1"],
			],
			expectPayload: {
				duze: [120, 200],
				suma_duzych: 320,
				male_licznik: 4,
				ref_suma_duzych: 320,
				ref_male_licznik: 4,
			},
		},
		{
			name: "f3-7: pełne rozwiązanie → token zalicza K1/K2/K3",
			slug: "f3-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_F3_7]],
			expectPayload: {
				wydatki: KWOTY,
				sonda_suma: SONDA,
				ref_sonda_suma: SONDA,
				suma_wszystkich: total,
				suma_kategorii_lacznie: lacznie,
			},
		},
	];

	for (const scenario of HAPPY) {
		it(scenario.name, () => {
			const itemId = itemIdFor(scenario.slug);
			const code = atomCode(STUDENT_ID, itemId);
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath(scenario.slug),
				atomCode: code,
				replacements: scenario.replacements,
			});
			expect(result.error).toBeNull();
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
			// Python i TS produkują IDENTYCZNY token…
			expect(token).toBe(signToken(code, scenario.expectPayload));

			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) return;

			// …i serwerowe checki z f3-dane-python.json przechodzą.
			const checks = checksBySlug.get(scenario.slug);
			expect(checks, `checki ${scenario.slug} w f3-dane-python.json`).toBeDefined();
			expect(checks?.length).toBeGreaterThan(0);
			const verdict = evaluateChecks(checks ?? [], parsed.payload);
			expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
		});
	}

	const REFUSALS: {
		name: string;
		slug: string;
		replacements?: [string, string][];
		skipCells?: number[];
		message: RegExp;
	}[] = [
		{
			// Komórki kodu f3-4: 0=sito (luki), 1=pieczątka.
			name: "f3-4: zliczanie pomylone z sumowaniem — pieczątka odmawia z celną diagnozą",
			slug: "f3-4",
			replacements: [
				["duze.append(_luka_)", "duze.append(wydatek)"],
				["suma_duzych = _luka_", "suma_duzych = suma_duzych + wydatek"],
				["male_licznik = _luka_", "male_licznik = male_licznik + wydatek"],
			],
			message: /zliczanie ≠ sumowanie/,
		},
		{
			name: "f3-4: nic nie wykonane — pieczątka odmawia",
			slug: "f3-4",
			skipCells: [0],
			message: /Nie widzę w tej sesji/,
		},
		{
			// Komórki kodu f3-7: 0=program, 1=pieczątka.
			name: "f3-7 K1: tylko 7 rekordów — pieczątka odmawia",
			slug: "f3-7",
			replacements: [
				["# Twój program — pisz tutaj:", PROGRAM_F3_7],
				['    {"nazwa": "ser", "kategoria": "jedzenie", "kwota": 8.99},\n', ""],
			],
			message: /K1: .*8 rekordów/,
		},
		{
			name: "f3-7 K2: najdrozszy zwraca kwotę zamiast rekordu — pieczątka odmawia",
			slug: "f3-7",
			replacements: [
				["# Twój program — pisz tutaj:", PROGRAM_F3_7],
				["    return lider", '    return lider["kwota"]'],
				// Raport studenta używał rekordu — przy tym błędzie sam by się
				// wywalił; symulujemy studenta, który printuje samą kwotę.
				[
					"top = najdrozszy(wydatki)\nprint(f\"Najdroższy: {top['nazwa']} — {round(top['kwota'], 2)} zł\")",
					"top_kwota = najdrozszy(wydatki)",
				],
			],
			message: /K2: najdrozszy ma zwrócić REKORD/,
		},
		{
			name: "f3-7 K2: funkcja liczy globalną listę — sonda to wykrywa",
			slug: "f3-7",
			replacements: [
				["# Twój program — pisz tutaj:", PROGRAM_F3_7],
				[
					"def suma_wszystkich(wydatki):\n    suma = 0\n    for wydatek in wydatki:",
					"def suma_wszystkich(lista):\n    suma = 0\n    for wydatek in wydatki:",
				],
			],
			message: /K2: suma_wszystkich[\s\S]*globalnej/,
		},
		{
			// Regresja WAŻN (QG F3): dobra nazwa + zła kwota w zbudowanym od nowa
			// słowniku NIE dostaje tokenu — lokalna diagnoza zamiast serwerowego
			// odrzucenia bez wskazówki.
			name: "f3-7 K2: najdrozszy z dobrą nazwą, ale złą kwotą — pieczątka odmawia lokalnie",
			slug: "f3-7",
			replacements: [
				["# Twój program — pisz tutaj:", PROGRAM_F3_7],
				["    return lider", '    return {"nazwa": lider["nazwa"], "kwota": 999.0}'],
			],
			message: /K2: rekord z najdrozszy ma złą albo brakującą kwotę/,
		},
		{
			name: "f3-7: program w ogóle nie napisany — pieczątka odmawia",
			slug: "f3-7",
			skipCells: [0],
			message: /Nie widzę w tej sesji/,
		},
	];

	for (const scenario of REFUSALS) {
		it(scenario.name, () => {
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath(scenario.slug),
				atomCode: atomCode(STUDENT_ID, itemIdFor(scenario.slug)),
				replacements: scenario.replacements ?? [],
				skipCells: scenario.skipCells ?? [],
			});
			expect(result.error).toBeNull();
			expect(tokenFrom(result.stdout)).toBeNull();
			expect(result.stdout).toMatch(scenario.message);
		});
	}

	it("token f3-4 wklejony w f3-7 jest odrzucany (bad_signature)", () => {
		const payload: StampPayload = { duze: [120, 200], suma_duzych: 320 };
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("f3-4")), payload);
		const parsed = parseToken(STUDENT_ID, itemIdFor("f3-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
