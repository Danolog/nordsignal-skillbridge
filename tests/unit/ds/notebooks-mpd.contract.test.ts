/**
 * Krok 4 partia 5 (ADR-015) — kontrakt notebooków Colab M-PD.
 *
 * Nowości względem F1–F3:
 *  1. Pierwsze notebooki z pandas — harness wykonuje komórki realnym
 *     python3, więc pandas musi być zainstalowany lokalnie i w CI
 *     (job `test` w .github/workflows/pr.yml ma krok instalacji).
 *  2. Pieczątka PD.4 liczy WŁASNĄ maską na `df` i weryfikuje „jedno
 *     województwo w maz" przez indeksy (`df.loc[maz.index, ...]` — nota
 *     inżynierska Sophii; indeksy przeżywają sito).
 *  3. Pieczątka PD.8 przelicza grupowanie niezależnie na `dane_analiza`
 *     i pilnuje kontraktu danych wejściowych (12 wierszy / 2 braki);
 *     wszystkie trzy decyzje o brakach legalne (len 7–12).
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { evaluateChecks, parseChecks, type StampPayload } from "@/lib/curriculum/lab-checks";
import { atomCode, parseToken, signToken } from "@/lib/curriculum/lab-token";
import {
	buildNotebook,
	listNotebookSources,
	sharedStampBlock,
} from "../../../tools/build-notebooks";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "tools", "content", "notebooks");
const OUT_DIR = join(ROOT, "notebooks");
const HARNESS = join(ROOT, "tests", "unit", "ds", "notebook-stamp-harness.py");

const STUDENT_ID = "student-parytet-mpd-fixture";
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

type PackedMpd = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedMpd(): PackedMpd {
	return JSON.parse(
		readFileSync(join(ROOT, "tools", "content", "curriculum-atoms", "m-pandas.json"), "utf8"),
	) as PackedMpd;
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describe("notebooki M-PD — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "mpd");
	const items = packedMpd().items;
	const atoms = items.filter((i) => i.slug !== "pd-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieje 8 źródeł M-PD — po jednym na każdy atom PD.1–PD.8 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(8);
		expect(atoms).toHaveLength(8);
		expect(labSlugs).toEqual(["pd-4", "pd-8"]);
		const files = readdirSync(join(OUT_DIR, "mpd")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu M-PD wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "mpd")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/mpd`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "pd-przeglad");
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

describe("symulacja sesji studenta M-PD: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedMpd()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "mpd")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "mpd", file);
	};

	// Wzorcowe uzupełnienia luk PD.4 (hint 3 dokumentu Sophii).
	const PD4_LUKA_HEAD: [string, string] = ["df.head(_luka_)", "df.head(8)"];
	const PD4_LUKA_ROK: [string, string] = [
		"rok2020 = df[_luka_]",
		'rok2020 = df[df["rok"] == 2020]',
	];
	const PD4_LUKA_MAZ: [string, string] = [
		'maz = df[df["wojewodztwo"] == _luka_][[_luka_, _luka_]]',
		'maz = df[df["wojewodztwo"] == "mazowieckie"][["rok", "wartosc"]]',
	];

	// Wzorcowe rozwiązania PD.8 (drabinka: szkielet + hint 3).
	const PD8_ANALIZA_DROP = [
		"df.head(12)",
		"print(len(df))",
		"print(df.isna().sum())",
		"dane_analiza = df.dropna()",
		"print(len(dane_analiza))",
		'srednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
		"print(srednie_woj)",
	].join("\n");
	const PD8_ANALIZA_ZAWEZENIE = [
		'dane_analiza = df[df["rok"] >= 2020].dropna()',
		'srednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
	].join("\n");

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		expectPayload: StampPayload;
	}[] = [
		{
			name: "pd-4: luki wypełnione (mazowieckie) → token zalicza wszystkie checki",
			slug: "pd-4",
			replacements: [PD4_LUKA_HEAD, PD4_LUKA_ROK, PD4_LUKA_MAZ],
			expectPayload: {
				rok2020_wiersze: 3,
				rok2020_tylko_2020: true,
				maz_kolumny: 2,
				maz_jedno_wojewodztwo: true,
				maz_wiersze: 3,
			},
		},
		{
			name: "pd-4: wariant pomorskie (2 wiersze — dolna granica C5) też przechodzi",
			slug: "pd-4",
			replacements: [
				PD4_LUKA_HEAD,
				PD4_LUKA_ROK,
				[PD4_LUKA_MAZ[0], 'maz = df[df["wojewodztwo"] == "pomorskie"][["rok", "wartosc"]]'],
			],
			expectPayload: {
				rok2020_wiersze: 3,
				rok2020_tylko_2020: true,
				maz_kolumny: 2,
				maz_jedno_wojewodztwo: true,
				maz_wiersze: 2,
			},
		},
		{
			name: "pd-8: decyzja dropna (10 wierszy) → token zalicza kontrakt danych",
			slug: "pd-8",
			replacements: [["# Twoja analiza — pisz tutaj:", PD8_ANALIZA_DROP]],
			expectPayload: {
				wiersze_wejscie: 12,
				braki_wejscie: 2,
				wiersze_analiza: 10,
				srednie_zgodne: true,
			},
		},
		{
			name: "pd-8: zawężenie do 3 ostatnich lat + dropna (7 wierszy — dolna granica C3)",
			slug: "pd-8",
			replacements: [["# Twoja analiza — pisz tutaj:", PD8_ANALIZA_ZAWEZENIE]],
			expectPayload: {
				wiersze_wejscie: 12,
				braki_wejscie: 2,
				wiersze_analiza: 7,
				srednie_zgodne: true,
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

			// …i serwerowe checki z m-pandas.json przechodzą.
			const checks = checksBySlug.get(scenario.slug);
			expect(checks, `checki ${scenario.slug} w m-pandas.json`).toBeDefined();
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
			// Komórki kodu pd-4: 0=dane, 1=head, 2=kroki 2–3, 3=pieczątka.
			name: "pd-4: maz bez wyboru kolumn (3 kolumny) — pieczątka odmawia z celną diagnozą",
			slug: "pd-4",
			replacements: [
				PD4_LUKA_HEAD,
				PD4_LUKA_ROK,
				[PD4_LUKA_MAZ[0], 'maz = df[df["wojewodztwo"] == "mazowieckie"]'],
			],
			message: /DOKŁADNIE 2 kolumny/,
		},
		{
			name: "pd-4: literówka województwa → 0 wierszy — diagnoza kieruje do unique()",
			slug: "pd-4",
			replacements: [
				PD4_LUKA_HEAD,
				PD4_LUKA_ROK,
				[PD4_LUKA_MAZ[0], 'maz = df[df["wojewodztwo"] == "Mazowieckie"][["rok", "wartosc"]]'],
			],
			message: /0 wierszy[\s\S]*unique\(\)/,
		},
		{
			name: "pd-4: rok2020 to maska (seria), nie tabela — pieczątka odmawia",
			slug: "pd-4",
			replacements: [PD4_LUKA_HEAD, [PD4_LUKA_ROK[0], 'rok2020 = df["rok"] == 2020'], PD4_LUKA_MAZ],
			message: /dopiero maska/,
		},
		{
			name: "pd-4: zły rok w masce (2019) — własna maska pieczątki to łapie",
			slug: "pd-4",
			replacements: [
				PD4_LUKA_HEAD,
				[PD4_LUKA_ROK[0], 'rok2020 = df[df["rok"] == 2019]'],
				PD4_LUKA_MAZ,
			],
			message: /nie zgadza się z własną maską/,
		},
		{
			name: "pd-4: kroki nie wykonane — pieczątka odmawia",
			slug: "pd-4",
			skipCells: [1, 2],
			message: /Nie widzę w tej sesji: rok2020, maz/,
		},
		{
			// Komórki kodu pd-8: 0=dane, 1=analiza, 2=pieczątka.
			name: "pd-8: analiza nadpisała df (df = df.dropna()) — kontrakt danych wejściowych odmawia",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'df = df.dropna()\ndane_analiza = df\nsrednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /wygląda na zmienioną/,
		},
		{
			// Regresja WAŻN-1 (QG M-PD): fillna(0) na wskaźniku ciągłym nie jest
			// decyzją z kroku 2 — wiersze dane_analiza muszą POCHODZIĆ z df.
			name: "pd-8: dane_analiza = df.fillna(0) — pieczątka odmawia (fałszowanie wskaźnika)",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'dane_analiza = df.fillna(0)\nsrednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /nie pochodzą z tabeli wejściowej[\s\S]*fillna/,
		},
		{
			// Regresja WAŻN-2 (QG M-PD): kontrakt wejścia to też WARTOŚCI, nie
			// tylko kształt 12/2 — podmiana wartości przed pieczątką odmawia.
			name: "pd-8: wartość w df podmieniona przed pieczątką — kontrakt wejścia odmawia",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'df.loc[0, "wartosc"] = 999.0\ndane_analiza = df.dropna()\nsrednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /wygląda na zmienioną/,
		},
		{
			name: "pd-8: tabela po decyzji nazwana inaczej niż dane_analiza — pieczątka odmawia",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'czysta = df.dropna()\nsrednie_woj = czysta.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /Nie widzę tabeli `dane_analiza`/,
		},
		{
			name: "pd-8: srednie_woj liczone na df zamiast na zawężonej dane_analiza — odmowa",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'dane_analiza = df[df["rok"] >= 2020].dropna()\nsrednie_woj = df.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /nie zgadzają się z niezależnym przeliczeniem/,
		},
		{
			name: "pd-8: zawężenie za wąskie (1 rok = 3 wiersze) — odmowa z widełkami",
			slug: "pd-8",
			replacements: [
				[
					"# Twoja analiza — pisz tutaj:",
					'dane_analiza = df[df["rok"] == 2022]\nsrednie_woj = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()',
				],
			],
			message: /mniej niż 7 wierszy/,
		},
		{
			name: "pd-8: analiza w ogóle nie napisana — pieczątka odmawia",
			slug: "pd-8",
			skipCells: [1],
			message: /Nie widzę tabeli `dane_analiza`/,
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

	it("token pd-4 wklejony w pd-8 jest odrzucany (bad_signature)", () => {
		const payload: StampPayload = { rok2020_wiersze: 3, maz_wiersze: 3 };
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("pd-4")), payload);
		const parsed = parseToken(STUDENT_ID, itemIdFor("pd-8"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
