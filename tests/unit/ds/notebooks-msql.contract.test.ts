/**
 * Krok 4 partia 6 (ADR-015) — kontrakt notebooków Colab M-SQL.
 *
 * Nowości względem M-PD:
 *  1. Pierwsze notebooki z DuckDB — harness wykonuje komórki realnym
 *     python3, więc `duckdb` (obok `pandas`) musi być zainstalowany
 *     lokalnie i w CI (job `test` w .github/workflows/pr.yml instaluje
 *     wersje colabowe: pandas ~2.2, duckdb ~1.3.2).
 *  2. Obie pieczątki liczą referencję WŁASNĄ kopią SQL-a (`ref1`–`ref3`)
 *     i porównują ją z tabelami `z1`–`z3` studenta — czyli sprawdzają
 *     WYNIK, nie tekst zapytania (każde poprawne sformułowanie przechodzi:
 *     stąd warianty happy z `LIMIT` większym od tabeli, `COUNT(kolumna)`,
 *     `LEFT JOIN` i `RANK()`).
 *  3. SQL.7 nie ma luk — student pisze zapytania sam, więc „rozwiązanie
 *     wzorcowe" wstrzykujemy w miejsce komentarzy-zaślepek.
 *  4. Pieczątka SQL.7 szuka kolumny z miejscem w rankingu PO SEMANTYCE
 *     (rozkład miejsc [1,1,1,2,3]), bo jej nazwa nie jest przybita
 *     w treści zadania — test pilnuje, że brak takiej kolumny to odmowa.
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

const STUDENT_ID = "student-parytet-msql-fixture";
const itemIdFor = (slug: string) => `item-${slug}-fixture`;

/**
 * Każdy scenariusz odpala OSOBNY proces python3, który importuje duckdb
 * i pandas. Na świeżej maszynie CI (biblioteki dopiero co zainstalowane
 * pipem, zero cache'u .pyc) pierwszy taki import potrafi zająć kilka
 * sekund — domyślne 5 s Vitesta wywracało wtedy pierwszy test, mimo że
 * kolejne biegły po ~0,3 s. Limit hojny celowo: ma łapać zawieszkę,
 * nie zimny start.
 */
const HARNESS_TIMEOUT_MS = 30_000;

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

type PackedMsql = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedMsql(): PackedMsql {
	return JSON.parse(
		readFileSync(join(ROOT, "tools", "content", "curriculum-atoms", "m-sql.json"), "utf8"),
	) as PackedMsql;
}

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describe("notebooki M-SQL — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "msql");
	const items = packedMsql().items;
	const atoms = items.filter((i) => i.slug !== "sql-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieje 7 źródeł M-SQL — po jednym na atom SQL.1–SQL.7 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(7);
		expect(atoms).toHaveLength(7);
		// Laby to WYŁĄCZNIE sql-4 i sql-7 — pozostałe atomy są ćwiczeniami
		// (bez pieczątki), więc nie wolno im wygenerować tokenu.
		expect(labSlugs).toEqual(["sql-4", "sql-7"]);
		const files = readdirSync(join(OUT_DIR, "msql")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu M-SQL wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		// Pułapka z partii M-PD: manifest packera może wskazywać plik, którego
		// nie ma w repo — student dostałby wtedy 404 zamiast notebooka.
		const files = new Set(readdirSync(join(OUT_DIR, "msql")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/msql`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "sql-przeglad");
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
		// Blok wspólny (podpis + wypisanie tokenu) musi wejść bajt w bajt —
		// każda lokalna wariacja rozjeżdża parytet Python↔TS.
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

describe("symulacja sesji studenta M-SQL: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedMsql()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "msql")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "msql", file);
	};

	// Wzorcowe uzupełnienia pięciu luk SQL.4 (hint 3 dokumentu Sophii).
	// Lewa strona to DOKŁADNY fragment ze źródła percent — razem z komentarzem
	// „-- luka N" i jego wyrównaniem, bo pieczątka nie toleruje przybliżeń.
	const SQL4_LUKA1: [string, string] = [
		"SELECT * FROM przejazdy LIMIT ______",
		"SELECT * FROM przejazdy LIMIT 5",
	];
	const SQL4_LUKA2: [string, string] = [
		"WHERE ______                                              -- luka 2",
		"WHERE minuty > 10",
	];
	const SQL4_LUKA3: [string, string] = [
		"ORDER BY ______ DESC                                      -- luka 3",
		"ORDER BY minuty DESC",
	];
	const SQL4_LUKA4: [string, string] = [
		"______   AS liczba,                                   -- luka 4",
		"COUNT(*)   AS liczba,",
	];
	const SQL4_LUKA5: [string, string] = [
		"______   AS suma_kwot                                 -- luka 5",
		"SUM(kwota)   AS suma_kwot",
	];
	const SQL4_KOMPLET: [string, string][] = [
		SQL4_LUKA1,
		SQL4_LUKA2,
		SQL4_LUKA3,
		SQL4_LUKA4,
		SQL4_LUKA5,
	];
	const SQL4_PAYLOAD: StampPayload = {
		z1_wiersze: 5,
		z2_wiersze: 4,
		z2_pierwszy_id: 2,
		z3_grupy: 3,
		z3_top_godzina: 8,
		z3_top_suma: 84.5,
	};

	// SQL.7 nie ma luk — student pisze zapytania sam, więc podmieniamy
	// komentarze-zaślepki z pustych komórek „Twój raport".
	const SQL7_Z1_PUSTE = "    -- napisz tutaj złączenie przejazdów ze strefami";
	const SQL7_Z2_PUSTE = "    -- napisz tutaj agregat per strefa";
	const SQL7_Z3_PUSTE = "    -- napisz tutaj ranking oknem";
	const SQL7_Z1_OK = [
		"    SELECT p.id, s.nazwa, p.minuty, p.kwota",
		"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
	].join("\n");
	const SQL7_Z2_OK = [
		"    SELECT s.nazwa, COUNT(*) AS liczba, SUM(p.kwota) AS suma_kwot",
		"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
		"    GROUP BY s.nazwa ORDER BY suma_kwot DESC",
	].join("\n");
	const SQL7_Z3_OK = [
		"    SELECT p.id, s.nazwa, p.kwota,",
		"           ROW_NUMBER() OVER (PARTITION BY s.nazwa ORDER BY p.kwota DESC) AS miejsce",
		"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
	].join("\n");
	const SQL7_PAYLOAD: StampPayload = {
		z1_wiersze: 5,
		z2_top_nazwa: "Manhattan",
		z2_top_liczba: 3,
		z2_top_suma: 65.5,
		z3_miejsca_1: 3,
	};

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		expectPayload: StampPayload;
	}[] = [
		{
			name: "sql-4: pięć luk wypełnionych wzorcowo → token zalicza wszystkie checki",
			slug: "sql-4",
			replacements: SQL4_KOMPLET,
			expectPayload: SQL4_PAYLOAD,
		},
		{
			// Pieczątka porównuje WYNIK, nie tekst zapytania: LIMIT większy od
			// tabeli pokazuje całość, a COUNT(kolumna) na danych bez braków
			// równa się COUNT(*) — oba warianty mają przechodzić.
			name: "sql-4: równoważny wariant (LIMIT 10, COUNT(kwota)) też daje ten sam token",
			slug: "sql-4",
			replacements: [
				[SQL4_LUKA1[0], "SELECT * FROM przejazdy LIMIT 10"],
				SQL4_LUKA2,
				SQL4_LUKA3,
				[SQL4_LUKA4[0], "COUNT(kwota)   AS liczba,"],
				SQL4_LUKA5,
			],
			expectPayload: SQL4_PAYLOAD,
		},
		{
			name: "sql-7: trzy zapytania raportu napisane wzorcowo → token zalicza checki",
			slug: "sql-7",
			replacements: [
				[SQL7_Z1_PUSTE, SQL7_Z1_OK],
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[SQL7_Z3_PUSTE, SQL7_Z3_OK],
			],
			expectPayload: SQL7_PAYLOAD,
		},
		{
			// LEFT JOIN to legalna decyzja analityczna (SQL.5), a RANK() —
			// kuzyn ROW_NUMBER(); na danych bez remisów i bez sierot wynik
			// jest identyczny, więc pieczątka NIE ma prawa tego odrzucić.
			name: "sql-7: wariant LEFT JOIN + RANK() (równoważny na tych danych) też przechodzi",
			slug: "sql-7",
			replacements: [
				[
					SQL7_Z1_PUSTE,
					[
						"    SELECT p.id, s.nazwa, p.minuty, p.kwota",
						"    FROM przejazdy AS p LEFT JOIN strefy AS s ON p.strefa_id = s.strefa_id",
					].join("\n"),
				],
				[
					SQL7_Z2_PUSTE,
					[
						"    SELECT s.nazwa, COUNT(*) AS liczba, SUM(p.kwota) AS suma_kwot",
						"    FROM przejazdy AS p LEFT JOIN strefy AS s ON p.strefa_id = s.strefa_id",
						"    GROUP BY s.nazwa ORDER BY suma_kwot DESC",
					].join("\n"),
				],
				[
					SQL7_Z3_PUSTE,
					[
						"    SELECT p.id, s.nazwa, p.kwota,",
						"           RANK() OVER (PARTITION BY s.nazwa ORDER BY p.kwota DESC) AS miejsce",
						"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
					].join("\n"),
				],
			],
			expectPayload: SQL7_PAYLOAD,
		},
	];

	for (const scenario of HAPPY) {
		it(
			scenario.name,
			() => {
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

				// …i serwerowe checki z m-sql.json przechodzą.
				const checks = checksBySlug.get(scenario.slug);
				expect(checks, `checki ${scenario.slug} w m-sql.json`).toBeDefined();
				expect(checks?.length).toBeGreaterThan(0);
				const verdict = evaluateChecks(checks ?? [], parsed.payload);
				expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	const REFUSALS: {
		name: string;
		slug: string;
		replacements?: [string, string][];
		skipCells?: number[];
		message: RegExp;
	}[] = [
		{
			// Komórki kodu sql-4: 0=dane, 1=Z1, 2=Z2, 3=Z3, 4=pieczątka.
			name: "sql-4: luka 1 z za małym LIMIT-em (3) — pieczątka odmawia z celną diagnozą",
			slug: "sql-4",
			replacements: [
				[SQL4_LUKA1[0], "SELECT * FROM przejazdy LIMIT 3"],
				SQL4_LUKA2,
				SQL4_LUKA3,
				SQL4_LUKA4,
				SQL4_LUKA5,
			],
			message: /luka 1 to LIMIT/,
		},
		{
			name: "sql-4: za szeroki warunek w luce 2 (minuty > 5) — 5 wierszy zamiast 4",
			slug: "sql-4",
			replacements: [
				SQL4_LUKA1,
				[SQL4_LUKA2[0], "WHERE minuty > 5"],
				SQL4_LUKA3,
				SQL4_LUKA4,
				SQL4_LUKA5,
			],
			message: /sprawdź warunek w luce 2/,
		},
		{
			name: "sql-4: SUM zamiast COUNT w luce 4 — pieczątka wskazuje agregat liczący WIERSZE",
			slug: "sql-4",
			replacements: [
				SQL4_LUKA1,
				SQL4_LUKA2,
				SQL4_LUKA3,
				[SQL4_LUKA4[0], "SUM(kwota)   AS liczba,"],
				SQL4_LUKA5,
			],
			message: /luka 4 ma liczyć WIERSZE w grupie/,
		},
		{
			// COUNT w luce 5 daje REMIS sum (godziny 8 i 17 po 2 przejazdy),
			// a przy remisie kolejność ORDER BY jest niegwarantowana (SQL.2-P2!)
			// i zależy od wersji silnika (CI: duckdb 1.3.2, dev: 1.5.x). Odmowa
			// pada więc albo na czołowej godzinie, albo na wartości sumy —
			// obie diagnozy są poprawne, więc test przyjmuje każdą z nich.
			name: "sql-4: COUNT zamiast SUM w luce 5 — pieczątka odmawia (remis sum, dwie legalne diagnozy)",
			slug: "sql-4",
			replacements: [
				SQL4_LUKA1,
				SQL4_LUKA2,
				SQL4_LUKA3,
				SQL4_LUKA4,
				[SQL4_LUKA5[0], "COUNT(*)   AS suma_kwot"],
			],
			message: /luka 5 ma sumować kolumnę kwota|na czele `z3` stoi godzina/,
		},
		{
			// Ten sam błąd klasy „nie ten agregat", ale BEZ remisu — sprawdza
			// deterministycznie komunikat o luce 5.
			name: "sql-4: AVG zamiast SUM w luce 5 — odmowa wprost o sumowaniu kolumny kwota",
			slug: "sql-4",
			replacements: [
				SQL4_LUKA1,
				SQL4_LUKA2,
				SQL4_LUKA3,
				SQL4_LUKA4,
				[SQL4_LUKA5[0], "AVG(kwota)   AS suma_kwot"],
			],
			message: /luka 5 ma sumować kolumnę kwota/,
		},
		{
			// Klasyk SQL.1: samo `duckdb.sql(...)` zwraca relację, nie tabelę.
			name: "sql-4: brak `.df()` przy Z2 — pieczątka odmawia i przypomina o metodzie",
			slug: "sql-4",
			replacements: [...SQL4_KOMPLET, ['""").df()\nz2', '""")\nz2']],
			message: /`z2` nie jest tabelą[\s\S]*\.df\(\)/,
		},
		{
			name: "sql-4: komórki Z2/Z3 nie wykonane — pieczątka odmawia z listą braków",
			slug: "sql-4",
			replacements: [SQL4_LUKA1],
			skipCells: [2, 3],
			message: /Nie widzę w tej sesji: z2, z3/,
		},
		{
			// Komórki kodu sql-7: 0=dane, 1=Z1, 2=Z2, 3=Z3, 4=pieczątka.
			// Sedno SQL.5: kartezjan „działa i zwraca liczby, tylko niewłaściwe".
			name: "sql-7: kartezjan w Z1 (brak ON) — 15 wierszy, pieczątka nazywa błąd po imieniu",
			slug: "sql-7",
			replacements: [
				[
					SQL7_Z1_PUSTE,
					[
						"    SELECT p.id, s.nazwa, p.minuty, p.kwota",
						"    FROM przejazdy AS p, strefy AS s",
					].join("\n"),
				],
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[SQL7_Z3_PUSTE, SQL7_Z3_OK],
			],
			message: /to kartezjan/,
		},
		{
			name: "sql-7: Z1 bez kolumny `nazwa` — złączenie bez tego, po co się je robi",
			slug: "sql-7",
			replacements: [
				[
					SQL7_Z1_PUSTE,
					[
						"    SELECT p.id, p.minuty, p.kwota",
						"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
					].join("\n"),
				],
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[SQL7_Z3_PUSTE, SQL7_Z3_OK],
			],
			message: /`z1` nie ma kolumny `nazwa`/,
		},
		{
			// Nazwy kolumn wynikowych są częścią specyfikacji (jak nazwy z1–z3).
			name: "sql-7: złe aliasy w Z2 (`AS ile`/`AS razem`) — pieczątka odmawia po nazwach kolumn",
			slug: "sql-7",
			replacements: [
				[SQL7_Z1_PUSTE, SQL7_Z1_OK],
				[
					SQL7_Z2_PUSTE,
					[
						"    SELECT s.nazwa, COUNT(*) AS ile, SUM(p.kwota) AS razem",
						"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
						"    GROUP BY s.nazwa ORDER BY razem DESC",
					].join("\n"),
				],
				[SQL7_Z3_PUSTE, SQL7_Z3_OK],
			],
			message: /`z2` nie ma kolumny `liczba`/,
		},
		{
			// Sedno SQL.6: okno NIE zjada wierszy — GROUP BY zwija 5 do 3.
			name: "sql-7: GROUP BY zamiast okna w Z3 — 3 wiersze zamiast 5, odmowa",
			slug: "sql-7",
			replacements: [
				[SQL7_Z1_PUSTE, SQL7_Z1_OK],
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[
					SQL7_Z3_PUSTE,
					[
						"    SELECT s.nazwa, COUNT(*) AS miejsce",
						"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
						"    GROUP BY s.nazwa",
					].join("\n"),
				],
			],
			message: /funkcja okna NIE zjada wierszy/,
		},
		{
			// Kolumna z miejscem szukana po SEMANTYCE — samo złączenie bez
			// ROW_NUMBER() ma 5 wierszy, ale żadnego rankingu.
			name: "sql-7: Z3 bez kolumny z miejscem — pieczątka nie znajduje rankingu i odmawia",
			slug: "sql-7",
			replacements: [
				[SQL7_Z1_PUSTE, SQL7_Z1_OK],
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[
					SQL7_Z3_PUSTE,
					[
						"    SELECT p.id, s.nazwa, p.kwota",
						"    FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id",
					].join("\n"),
				],
			],
			message: /kolumny z MIEJSCEM w rankingu strefy/,
		},
		{
			name: "sql-7: Z1 w ogóle nie napisane — pieczątka odmawia z listą braków",
			slug: "sql-7",
			replacements: [
				[SQL7_Z2_PUSTE, SQL7_Z2_OK],
				[SQL7_Z3_PUSTE, SQL7_Z3_OK],
			],
			skipCells: [1],
			message: /Nie widzę w tej sesji: z1/,
		},
	];

	for (const scenario of REFUSALS) {
		it(
			scenario.name,
			() => {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath(scenario.slug),
					atomCode: atomCode(STUDENT_ID, itemIdFor(scenario.slug)),
					replacements: scenario.replacements ?? [],
					skipCells: scenario.skipCells ?? [],
				});
				// Odmowa ma być KOMUNIKATEM pieczątki, nie wyjątkiem sesji…
				expect(result.error).toBeNull();
				// …i pod żadnym pozorem nie może wypaść z niej token.
				expect(tokenFrom(result.stdout)).toBeNull();
				expect(result.stdout).toMatch(scenario.message);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	it("token sql-4 wklejony w sql-7 jest odrzucany (bad_signature)", () => {
		const payload: StampPayload = { z1_wiersze: 5, z2_wiersze: 4 };
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("sql-4")), payload);
		const parsed = parseToken(STUDENT_ID, itemIdFor("sql-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
