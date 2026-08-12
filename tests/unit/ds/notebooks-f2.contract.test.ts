/**
 * Krok 4 partia 3 (ADR-015) — kontrakt notebooków Colab F2.
 *
 * Nowości względem F1 (i po co ten test jest osobny):
 *  1. Pieczątka F2.7 WYWOŁUJE funkcję studenta na próbnej liście
 *     ([2,5,10] → 17, serwerowy check value `sonda_suma_wydatkow`) — łapie
 *     funkcję liczącą globalną listę zamiast parametru (i iloczyn/len·2/max·2:
 *     próbka asymetryczna, bo na [1,2,3] suma=iloczyn=len·2=max·2=6).
 *  2. Program F2.7 używa input() — harness dostał kolejkę `inputs`
 *     (odpowiedzi programu studenta), a pieczątka NIE wywołuje input
 *     ponownie (nota Sophii: token bez interakcji z pieczątką).
 *  3. F2.4: token dowodzi kroku „dopisz piątą cenę" (len_gte 5 — szkielet
 *     startuje z czterema).
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

const STUDENT_ID = "student-parytet-f2-fixture";
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

type PackedF2 = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedF2(): PackedF2 {
	return czytajTrescJson<PackedF2>("tools/content/curriculum-atoms/f2-python-2.json", {
		items: [],
	} as PackedF2);
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describeTresc("notebooki F2 — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "f2");
	const items = packedF2().items;
	const atoms = items.filter((i) => i.slug !== "f2-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieje 7 źródeł F2 — po jednym na każdy atom F2.1–F2.7 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(7);
		expect(atoms).toHaveLength(7);
		expect(labSlugs).toEqual(["f2-4", "f2-7"]);
		const files = readdirSync(join(OUT_DIR, "f2")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu F2 wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "f2")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/f2`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "f2-przeglad");
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

describeTresc("symulacja sesji studenta F2: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedF2()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "f2")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "f2", file);
	};

	// Pełne rozwiązanie F2.7 z dokumentu Sophii (drabinka, hint 3).
	const PROGRAM_F2_7 = [
		"wydatki = [45.50, 120.00, 33.20, 18.99, 67.30]",
		"",
		"def suma_wydatkow(lista):",
		"    suma = 0",
		"    for kwota in lista:          # pętla po PARAMETRZE, nie po globalnej liście",
		"        suma = suma + kwota",
		"    return suma                  # return PO pętli, bez wcięcia pętli",
		"",
		'budzet = float(input("Twój budżet na tydzień: "))',
		"razem = suma_wydatkow(wydatki)",
		"",
		"if razem <= budzet:",
		'    print(f"W budżecie. Zostaje {round(budzet - razem, 2)} zł")',
		"else:",
		'    print(f"Przekroczony! Brakuje {round(razem - budzet, 2)} zł")',
		'print(f"Wydatki: {round(razem, 2)} zł w {len(wydatki)} pozycjach")',
	].join("\n");

	// Klasyczny błąd: funkcja liczy globalną listę zamiast parametru.
	const PROGRAM_GLOBALNA_LISTA = PROGRAM_F2_7.replace(
		"    for kwota in lista:          # pętla po PARAMETRZE, nie po globalnej liście",
		"    for kwota in wydatki:",
	);

	// Mutacje adwersaryjne sondy (f2-7): każdy z tych błędnych operatorów
	// zwracał 6 na STAREJ próbce [1,2,3] i przechodził przez pieczątkę
	// (poczwórna kolizja: suma=iloczyn=len·2=max·2=6). Nowa próbka [2,5,10]→17
	// rozrywa całą klasę — dowód, że asymetryczna próbka domyka klasę, nie
	// tylko zmienia liczbę:
	//   operator  [1,2,3]  [2,5,10]     werdykt na [2,5,10]
	//   suma           6        17      TOKEN (poprawna)
	//   iloczyn        6       100      ODMOWA (≠17)
	//   len·2          6         6      ODMOWA (≠17)
	//   max·2          6        20      ODMOWA (≠17)
	// Ciało funkcji podmieniane w miejscu — reszta programu (input, if/else)
	// nietknięta, więc odmowa pochodzi wprost z sondy, nie z braku specyfikacji.
	const FUNKCJA_SUMA_POPRAWNA = [
		"def suma_wydatkow(lista):",
		"    suma = 0",
		"    for kwota in lista:          # pętla po PARAMETRZE, nie po globalnej liście",
		"        suma = suma + kwota",
		"    return suma                  # return PO pętli, bez wcięcia pętli",
	].join("\n");

	// Iloczyn zamiast sumy: 1·2·5·10 = 100 ≠ 17 (na [1,2,3] dawał 6 → przechodził).
	const PROGRAM_ILOCZYN = PROGRAM_F2_7.replace(
		FUNKCJA_SUMA_POPRAWNA,
		[
			"def suma_wydatkow(lista):",
			"    wynik = 1",
			"    for kwota in lista:",
			"        wynik = wynik * kwota",
			"    return wynik",
		].join("\n"),
	);

	// len(lista)·2 = 3·2 = 6 ≠ 17 (na [1,2,3] TEŻ dawał 6 → kolizja z sumą, przechodził).
	const PROGRAM_LEN_RAZY_2 = PROGRAM_F2_7.replace(
		FUNKCJA_SUMA_POPRAWNA,
		["def suma_wydatkow(lista):", "    return len(lista) * 2"].join("\n"),
	);

	// max(lista)·2 = 10·2 = 20 ≠ 17 (na [1,2,3] dawał 6 → przechodził).
	const PROGRAM_MAX_RAZY_2 = PROGRAM_F2_7.replace(
		FUNKCJA_SUMA_POPRAWNA,
		["def suma_wydatkow(lista):", "    return max(lista) * 2"].join("\n"),
	);

	// Wariant bez input() i bez decyzji — do odmowy kompletu specyfikacji.
	const PROGRAM_BEZ_INPUT_IF = [
		"wydatki = [45.50, 120.00, 33.20, 18.99, 67.30]",
		"def suma_wydatkow(lista):",
		"    suma = 0",
		"    for kwota in lista:",
		"        suma = suma + kwota",
		"    return suma",
		"razem = suma_wydatkow(wydatki)",
		'print(f"Wydatki: {razem} zł")',
	].join("\n");

	const CENY_5 = "ceny = [5.50, 12.00, 3.75, 8.25, 9.99]      # ceny zakupów w zł";

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		inputs?: string[];
		insertCells?: [number, string][];
		expectPayload: StampPayload;
		expectStdout?: RegExp;
	}[] = [
		{
			name: "f2-4: luki + piąta cena → token zalicza checki",
			slug: "f2-4",
			replacements: [
				["ceny = [5.50, 12.00, 3.75, 8.25]      # ceny zakupów w zł", CENY_5],
				["for _luka_ in _luka_:", "for cena in ceny:"],
				['print(f"Pozycja: {_luka_} zł")', 'print(f"Pozycja: {cena} zł")'],
				['print(f"Pozycji na paragonie: {_luka_}")', 'print(f"Pozycji na paragonie: {len(ceny)}")'],
			],
			expectPayload: { ceny: [5.5, 12, 3.75, 8.25, 9.99] },
			expectStdout: /Pozycji na paragonie: 5/,
		},
		{
			name: "f2-7: pełne rozwiązanie (budżet 300) → token zalicza checki, w tym sondę funkcji",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_F2_7]],
			inputs: ["300"],
			expectPayload: {
				wydatki: [45.5, 120, 33.2, 18.99, 67.3],
				sonda_suma_wydatkow: 17,
				_zrodlo: PROGRAM_F2_7,
			},
			expectStdout: /W budżecie\. Zostaje 15\.01 zł/,
		},
		{
			// Regresja lekcji F1.7 (WAŻN-2): komórka diagnostyczna po programie
			// nie przesłania programu przy wyborze `_zrodlo`.
			name: "f2-7: kontrolny print po programie nie psuje pieczątki",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_F2_7]],
			inputs: ["300"],
			insertCells: [[1, "print(suma_wydatkow([10, 20]))"]],
			expectPayload: {
				wydatki: [45.5, 120, 33.2, 18.99, 67.3],
				sonda_suma_wydatkow: 17,
				_zrodlo: PROGRAM_F2_7,
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
				inputs: scenario.inputs ?? [],
				insertCells: scenario.insertCells ?? [],
			});
			expect(result.error).toBeNull();
			if (scenario.expectStdout) expect(result.stdout).toMatch(scenario.expectStdout);
			const token = tokenFrom(result.stdout);
			expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
			// Python i TS produkują IDENTYCZNY token…
			expect(token).toBe(signToken(code, scenario.expectPayload));

			const parsed = parseToken(STUDENT_ID, itemId, token as string);
			expect(parsed.ok).toBe(true);
			if (!parsed.ok) return;

			// …i serwerowe checki z f2-python-2.json (to, co idzie na prod) przechodzą.
			const checks = checksBySlug.get(scenario.slug);
			expect(checks, `checki ${scenario.slug} w f2-python-2.json`).toBeDefined();
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
		inputs?: string[];
		message: RegExp;
	}[] = [
		{
			// Komórki kodu f2-4: 0=dane+paragon (luki), 1=pieczątka.
			name: "f2-4: luki wypełnione, ale BEZ piątej ceny — pieczątka odmawia (sedno labu)",
			slug: "f2-4",
			replacements: [
				["for _luka_ in _luka_:", "for cena in ceny:"],
				['print(f"Pozycja: {_luka_} zł")', 'print(f"Pozycja: {cena} zł")'],
				['print(f"Pozycji na paragonie: {_luka_}")', 'print(f"Pozycji na paragonie: {len(ceny)}")'],
			],
			message: /piątą cenę/,
		},
		{
			name: "f2-4: nic nie wykonane — pieczątka odmawia",
			slug: "f2-4",
			skipCells: [0],
			message: /Nie widzę listy `ceny`/,
		},
		{
			// Komórki kodu f2-7: 0=program, 1=pieczątka.
			name: "f2-7: funkcja liczy globalną listę zamiast parametru — sonda [2,5,10] to wykrywa",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_GLOBALNA_LISTA]],
			inputs: ["300"],
			message: /powinna zwrócić 17[\s\S]*globalnej/,
		},
		{
			// Mutacja: iloczyn zamiast sumy. [1,2,3]→6 (przechodził), [2,5,10]→100.
			name: "f2-7: funkcja liczy ILOCZYN zamiast sumy — sonda [2,5,10] odmawia (100 ≠ 17)",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_ILOCZYN]],
			inputs: ["300"],
			message: /powinna zwrócić 17, a zwróciła 100\b/,
		},
		{
			// Mutacja: len·2. [1,2,3]→6 (kolizja z sumą, przechodził), [2,5,10]→6.
			name: "f2-7: funkcja zwraca len·2 zamiast sumy — sonda [2,5,10] odmawia (6 ≠ 17)",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_LEN_RAZY_2]],
			inputs: ["300"],
			message: /powinna zwrócić 17, a zwróciła 6\b/,
		},
		{
			// Mutacja: max·2. [1,2,3]→6 (przechodził), [2,5,10]→20.
			name: "f2-7: funkcja zwraca max·2 zamiast sumy — sonda [2,5,10] odmawia (20 ≠ 17)",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_MAX_RAZY_2]],
			inputs: ["300"],
			message: /powinna zwrócić 17, a zwróciła 20\b/,
		},
		{
			name: "f2-7: program bez input() i if/else — pieczątka odmawia punktami specyfikacji",
			slug: "f2-7",
			replacements: [["# Twój program — pisz tutaj:", PROGRAM_BEZ_INPUT_IF]],
			message: /input\(\) \(punkt 3\)|decyzja if\/else/,
		},
		{
			name: "f2-7: program w ogóle nie napisany — pieczątka odmawia",
			slug: "f2-7",
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
				inputs: scenario.inputs ?? [],
			});
			expect(result.error).toBeNull();
			expect(tokenFrom(result.stdout)).toBeNull();
			expect(result.stdout).toMatch(scenario.message);
		});
	}

	it("token f2-4 wklejony w f2-7 jest odrzucany (bad_signature)", () => {
		const payload: StampPayload = { ceny: [5.5, 12, 3.75, 8.25, 9.99] };
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("f2-4")), payload);
		const parsed = parseToken(STUDENT_ID, itemIdFor("f2-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
