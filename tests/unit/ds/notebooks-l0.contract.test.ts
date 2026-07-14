/**
 * Krok 4 (ADR-015) — kontrakt notebooków Colab L0 + parytet pieczątki Python↔TS.
 *
 * Trzy rzeczy, które ten test przybija na stałe:
 *  1. WARSTWY: każdy zbudowany notebook ma DOKŁADNIE jedną komórkę-pieczątkę,
 *     a jej blok tokenu jest bajt w bajt równy tools/content/notebooks/pieczatka.py
 *     (ADR-015 §7 — zmiana funkcji tokenu = podmiana jednego pliku, nie 66).
 *  2. DRIFT: notebooks/*.ipynb w repo == świeży rebuild ze źródeł percent
 *     (nikt nie edytował .ipynb ręcznie z pominięciem źródła).
 *  3. PARYTET: token policzony REALNYM python3 (symulacja sesji studenta —
 *     komórki notebooka wykonane, input() zamockowany) przechodzi serwerowe
 *     parseToken + evaluateChecks z checkami z l0-start.json — czyli z tym,
 *     co faktycznie leży na prodzie. Scenariusze negatywne: pieczątka
 *     ODMAWIA tokenu, zanim student zdąży wysłać coś, co serwer i tak odrzuci.
 *
 * python3: wymagany twardo (macOS i ubuntu-latest mają go z pudełka) —
 * skip ukryłby zepsuty parytet, a to jedyna rzecz, której ten test pilnuje.
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
const STAMP_PATH = join(SRC_DIR, "pieczatka.py");

const STUDENT_ID = "student-parytet-fixture";
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

type PackedL0 = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown } }[];
};

function packedL0(): PackedL0 {
	return JSON.parse(
		readFileSync(join(ROOT, "tools", "content", "curriculum-atoms", "l0-start.json"), "utf8"),
	) as PackedL0;
}

function labChecksBySlug(): Map<string, ReturnType<typeof parseChecks>> {
	return new Map(
		packedL0()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describe("notebooki L0 — warstwy i drift buildera", () => {
	const sources = listNotebookSources().filter((s) => s.module === "l0");

	it("istnieją 4 źródła L0 i po jednym notebooku na każdy lab z l0-start.json", () => {
		expect(sources).toHaveLength(4);
		const files = readdirSync(join(OUT_DIR, "l0")).filter((f) => f.endsWith(".ipynb"));
		const labSlugs = [...labChecksBySlug().keys()];
		expect(labSlugs).toHaveLength(4);
		for (const slug of labSlugs) {
			const matching = files.filter((f) => f.startsWith(`${slug}-`));
			expect(matching, `notebook dla ${slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl każdego laba L0 wskazuje na Colaba i na ISTNIEJĄCY plik notebooka", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "l0")).filter((f) => f.endsWith(".ipynb")));
		for (const item of packedL0().items.filter((i) => i.kind === "lab")) {
			const url = item.config?.notebookUrl;
			expect(typeof url, `${item.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${item.slug}: plik ${file} istnieje w notebooks/l0`).toBe(true);
			expect(
				file.startsWith(`${item.slug}-`),
				`${item.slug}: nazwa pliku zaczyna się od sluga`,
			).toBe(true);
		}
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("każdy notebook ma DOKŁADNIE jedną pieczątkę, a jej blok tokenu jest wspólny", () => {
		const shared = sharedStampBlock();
		expect(shared).toContain("def _pieczatka_token");
		// Sekret NIGDY nie schodzi do notebooka — pieczątka podpisuje kodem atomu.
		expect(shared).not.toContain("LAB_TOKEN_SECRET");

		for (const src of sources) {
			const nb = JSON.parse(
				readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8"),
			) as { cells: { cell_type: string; source: string[] }[] };
			const stampCells = nb.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			expect(stampCells, src.slug).toHaveLength(1);
			const source = stampCells[0].source.join("");
			expect(source.endsWith(shared), `${src.slug}: blok wspólny bajt w bajt na końcu`).toBe(true);
			expect(source).toContain("def _zbierz_wyniki");
		}
	});
});

describe("parytet pieczątki: token z python3 przechodzi serwerową weryfikację", () => {
	const PARITY_PAYLOADS: { name: string; payload: StampPayload; floatKeys?: string[] }[] = [
		{ name: "proste typy", payload: { a: 7, b: "tekst", c: true, d: null } },
		{ name: "polskie znaki bez escapowania", payload: { imie: "Michał Żółć — ćma" } },
		{ name: "suma binarna floatów (0.1+0.2)", payload: { suma: 0.1 + 0.2 } },
		{ name: "float całkowity zrzuca .0", payload: { x: 2 }, floatKeys: ["x"] },
		{ name: "mikroskopijny float zaokrągla się do 0", payload: { eps: 1e-7 } },
		{ name: "ujemny ułamek do 6 miejsc", payload: { u: -0.123456789 } },
		{ name: "lista mieszana", payload: { ceny: [1, 2.5, "x", false, null] } },
		{ name: "pusty ładunek", payload: {} },
	];

	for (const testCase of PARITY_PAYLOADS) {
		it(`ładunek: ${testCase.name}`, () => {
			const itemId = itemIdFor("parity");
			const code = atomCode(STUDENT_ID, itemId);
			const result = runHarness({
				mode: "payload",
				stampPath: STAMP_PATH,
				atomCode: code,
				payload: testCase.payload,
				floatKeys: testCase.floatKeys ?? [],
			});
			expect(result.error).toBeNull();
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
			// Najmocniejsza asercja: Python i TS produkują IDENTYCZNY token…
			expect(token).toBe(signToken(code, testCase.payload));
			// …i serwer go przyjmuje.
			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
		});
	}

	it("token podpisany kodem innej pozycji jest odrzucany (bad_signature)", () => {
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("l0-1")), { _wykonano: true });
		const parsed = parseToken(STUDENT_ID, itemIdFor("l0-2"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});

describe("symulacja sesji studenta: komórki notebooka → token → checki z prodowego JSON-a", () => {
	const checksBySlug = labChecksBySlug();
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "l0")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "l0", file);
	};

	const OWN_SCRIPT = [
		"strony = 20",
		"wieczory = 14",
		"wynik = strony * wieczory",
		'print("Przeczytam stron:")',
		"print(wynik)",
	].join("\n");

	const HAPPY: {
		slug: string;
		replacements?: [string, string][];
		expectPayload: StampPayload;
	}[] = [
		{ slug: "l0-1", expectPayload: { _wykonano: true } },
		{
			slug: "l0-2",
			replacements: [['imie = "Alex"', 'imie = "Michał"']],
			expectPayload: { imie: "Michał" },
		},
		{ slug: "l0-3", expectPayload: { _wykonano: true } },
		{
			slug: "l0-4",
			replacements: [
				["przejazdy = ___", "przejazdy = 3"],
				["print(bilet * ___)", "print(bilet * przejazdy)"],
				["# Twój skrypt — pisz tutaj:", OWN_SCRIPT],
			],
			// strony, wieczory, wynik — 3 własne zmienne liczbowe.
			expectPayload: { _wlasne_zmienne: 3 },
		},
	];

	for (const scenario of HAPPY) {
		it(`${scenario.slug}: wykonany notebook daje token, który zalicza checki`, () => {
			const itemId = itemIdFor(scenario.slug);
			const code = atomCode(STUDENT_ID, itemId);
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath(scenario.slug),
				atomCode: code,
				replacements: scenario.replacements ?? [],
			});
			expect(result.error).toBeNull();
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();

			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) return;
			expect(parsed.payload).toEqual(scenario.expectPayload);

			const checks = checksBySlug.get(scenario.slug);
			expect(checks, `checki ${scenario.slug} w l0-start.json`).toBeDefined();
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
		atomCode?: string;
		message: RegExp;
	}[] = [
		{
			name: "l0-2: imie nadal domyślne — pieczątka odmawia",
			slug: "l0-2",
			message: /domyślne/,
		},
		{
			name: "l0-3: komórki nie wykonane w sesji — pieczątka odmawia",
			slug: "l0-3",
			skipCells: [0, 1],
			message: /Uruchom wszystkie/,
		},
		{
			name: "l0-4: brak własnych zmiennych — pieczątka odmawia",
			slug: "l0-4",
			replacements: [
				["przejazdy = ___", "przejazdy = 3"],
				["print(bilet * ___)", "print(bilet * przejazdy)"],
			],
			message: /za mało własnych/,
		},
		{
			name: "l0-1: pusty kod atomu — pieczątka prosi o kod zamiast liczyć",
			slug: "l0-1",
			atomCode: "",
			message: /Nie wpisano kodu/,
		},
	];

	for (const scenario of REFUSALS) {
		it(scenario.name, () => {
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath(scenario.slug),
				atomCode: scenario.atomCode ?? atomCode(STUDENT_ID, itemIdFor(scenario.slug)),
				replacements: scenario.replacements ?? [],
				skipCells: scenario.skipCells ?? [],
			});
			expect(result.error).toBeNull();
			expect(tokenFrom(result.stdout)).toBeNull();
			expect(result.stdout).toMatch(scenario.message);
		});
	}
});
