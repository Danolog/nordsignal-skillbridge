/**
 * Krok 4 partia 2 (ADR-015) — kontrakt notebooków Colab F1.
 *
 * Różnice względem L0 (i po co ten test jest osobny):
 *  1. F1 wprowadza notebooki TOWARZYSZĄCE ćwiczeń (WE + brudnopisy) — BEZ
 *     pieczątki (zaliczenie pytaniami). Test przybija podział: laby z JSON-a
 *     modułu mają DOKŁADNIE jedną pieczątkę ze wspólnym blokiem, ćwiczenia
 *     mają ZERO.
 *  2. Check F1.7 czyta źródło komórki programu z historii sesji (`In`)
 *     i wysyła je jako `_zrodlo` — parytet stringów wielolinijkowych
 *     (newline'y, cudzysłowy, polskie znaki) musi przejść serwerowe
 *     parseToken + evaluateChecks z checkami z f1-python-1.json.
 *  3. `notebookUrl` mają WSZYSTKIE atomy F1.1–F1.7 (także `exercise`);
 *     pozycja przeglądu — nie.
 *
 * python3: wymagany twardo — jak w notebooks-l0.contract.test.ts.
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
const STAMP_PATH = join(SRC_DIR, "pieczatka.py");

const STUDENT_ID = "student-parytet-f1-fixture";
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

type PackedF1 = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedF1(): PackedF1 {
	return czytajTrescJson<PackedF1>("tools/content/curriculum-atoms/f1-python-1.json", {
		items: [],
	} as PackedF1);
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describeTresc("notebooki F1 — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "f1");
	const items = packedF1().items;
	const atoms = items.filter((i) => i.slug !== "f1-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieje 7 źródeł F1 — po jednym na każdy atom F1.1–F1.7 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(7);
		expect(atoms).toHaveLength(7);
		expect(labSlugs).toEqual(["f1-4", "f1-7"]);
		const files = readdirSync(join(OUT_DIR, "f1")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu F1 wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "f1")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/f1`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "f1-przeglad");
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

describeTresc("parytet pieczątki F1: stringi wielolinijkowe (klasa ładunku `_zrodlo`)", () => {
	const PARITY_PAYLOADS: { name: string; payload: StampPayload }[] = [
		{
			name: "źródło komórki z newline'ami i wcięciami",
			payload: { _zrodlo: 'if x <= y:\n    print("ok")\nelse:\n    print("nie")\n' },
		},
		{
			name: "cudzysłowy, apostrofy i backslash w źródle",
			payload: { _zrodlo: "print('a \"b\" c\\\\d')" },
		},
		{
			name: "polskie znaki + em-dash w źródle",
			payload: { _zrodlo: 'print(f"Za drogo — brakuje {koszt} zł")' },
		},
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
				floatKeys: [],
			});
			expect(result.error).toBeNull();
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
			expect(token).toBe(signToken(code, testCase.payload));
			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
		});
	}
});

describeTresc("symulacja sesji studenta F1: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedF1()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "f1")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "f1", file);
	};

	// Pełne rozwiązanie F1.7 z dokumentu Sophii (drabinka, hint 3).
	const PROGRAM_F1_7 = [
		"budzet_tygodnia = 60",
		"cena_przejazdu = 3.20",
		"przejazdy_dziennie = 4",
		"",
		"koszt_tygodnia = cena_przejazdu * przejazdy_dziennie * 5",
		"",
		"if koszt_tygodnia <= budzet_tygodnia:",
		'    print(f"Mieści się! Zostaje {budzet_tygodnia - koszt_tygodnia} zł")',
		"else:",
		'    print(f"Za drogo — brakuje {koszt_tygodnia - budzet_tygodnia} zł")',
		'print(f"Koszt tygodnia: {koszt_tygodnia} zł")',
	].join("\n");

	// Wariant bez decyzji — do scenariusza odmowy (check `_zrodlo`).
	const PROGRAM_F1_7_BEZ_DECYZJI = [
		"budzet_tygodnia = 60",
		"cena_przejazdu = 3.20",
		"przejazdy_dziennie = 4",
		"koszt_tygodnia = cena_przejazdu * przejazdy_dziennie * 5",
		'print(f"Koszt tygodnia: {koszt_tygodnia} zł")',
	].join("\n");

	const HAPPY: {
		slug: string;
		replacements: [string, string][];
		insertCells?: [number, string][];
		expectPayload: StampPayload;
	}[] = [
		{
			slug: "f1-4",
			replacements: [
				["razem = _luka_", "razem = cena * sztuki"],
				["srednio_dziennie = _luka_", "srednio_dziennie = razem / 30"],
				['print(f"Razem: {_luka_} zł")', 'print(f"Razem: {razem} zł")'],
			],
			// Arytmetyka JAK w Pythonie (ten sam IEEE 754) — parytet tokenu.
			expectPayload: {
				cena: 5.5,
				sztuki: 3,
				razem: 5.5 * 3,
				srednio_dziennie: (5.5 * 3) / 30,
			},
		},
		{
			slug: "f1-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_F1_7]],
			expectPayload: {
				budzet_tygodnia: 60,
				cena_przejazdu: 3.2,
				przejazdy_dziennie: 4,
				koszt_tygodnia: 3.2 * 4 * 5,
				_zrodlo: PROGRAM_F1_7,
			},
		},
	];

	// Regresja WAŻN-2 (QG notebooków F1): komórka diagnostyczna wspominająca
	// `koszt_tygodnia` uruchomiona PO programie nie przesłania programu —
	// `_zrodlo` to nadal komórka z decyzją if/else i token przechodzi checki.
	HAPPY.push({
		slug: "f1-7",
		replacements: [["# Twój program — pisz tutaj:", PROGRAM_F1_7]],
		insertCells: [[1, 'print(f"kontrola: {koszt_tygodnia}")']],
		expectPayload: {
			budzet_tygodnia: 60,
			cena_przejazdu: 3.2,
			przejazdy_dziennie: 4,
			koszt_tygodnia: 3.2 * 4 * 5,
			_zrodlo: PROGRAM_F1_7,
		},
	});

	for (const [i, scenario] of HAPPY.entries()) {
		it(`${scenario.slug} (wariant ${i}): wykonany notebook daje token, który zalicza checki`, () => {
			const itemId = itemIdFor(scenario.slug);
			const code = atomCode(STUDENT_ID, itemId);
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath(scenario.slug),
				atomCode: code,
				replacements: scenario.replacements,
				insertCells: scenario.insertCells ?? [],
			});
			expect(result.error).toBeNull();
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
			// Python i TS produkują IDENTYCZNY token…
			expect(token).toBe(signToken(code, scenario.expectPayload));

			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) return;

			// …i serwerowe checki z f1-python-1.json (to, co idzie na prod) przechodzą.
			const checks = checksBySlug.get(scenario.slug);
			expect(checks, `checki ${scenario.slug} w f1-python-1.json`).toBeDefined();
			expect(checks?.length).toBeGreaterThan(0);
			const verdict = evaluateChecks(checks ?? [], parsed.payload);
			expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
		});
	}

	it("f1-7: token z notebooka przechodzi WSZYSTKIE checki, w tym fragile `_zrodlo`", () => {
		// Jawna asercja na check C2 (contains_all if/else) — to nowy mechanizm F1.
		const checks = checksBySlug.get("f1-7") ?? [];
		const fragile = checks.find((c) => c.kind === "predicate");
		expect(fragile).toBeDefined();
	});

	const REFUSALS: {
		name: string;
		slug: string;
		replacements?: [string, string][];
		skipCells?: number[];
		message: RegExp;
	}[] = [
		{
			// Komórki kodu f1-4: 0=dane, 1=obliczenia (luki), 2=paragon, 3=pieczątka.
			name: "f1-4: obliczenia nie wykonane — pieczątka odmawia",
			slug: "f1-4",
			skipCells: [1, 2],
			message: /Nie widzę w tej sesji/,
		},
		{
			name: "f1-4: wynik z ręki zamiast wyrażenia (stare/złe wartości) — pieczątka odmawia",
			slug: "f1-4",
			replacements: [
				["razem = _luka_", "razem = 999"],
				["srednio_dziennie = _luka_", "srednio_dziennie = razem / 30"],
				['print(f"Razem: {_luka_} zł")', 'print(f"Razem: {razem} zł")'],
			],
			message: /nie zgadzają się|Uruchom komórki od góry/,
		},
		{
			// Komórki kodu f1-7: 0=program, 1=pieczątka.
			name: "f1-7: program bez if/else — pieczątka odmawia (punkt 3 specyfikacji)",
			slug: "f1-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_F1_7_BEZ_DECYZJI]],
			message: /if\/else/,
		},
		{
			name: "f1-7: program w ogóle nie napisany — pieczątka odmawia",
			slug: "f1-7",
			skipCells: [0],
			message: /Napisz program/,
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

	it("token f1-4 wklejony w f1-7 jest odrzucany (bad_signature)", () => {
		const payload: StampPayload = { cena: 5.5, sztuki: 3, razem: 16.5, srednio_dziennie: 0.55 };
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("f1-4")), payload);
		const parsed = parseToken(STUDENT_ID, itemIdFor("f1-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
