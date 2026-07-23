/**
 * Partia 8 (ADR-015 + ADR-020) — kontrakt notebooków Colab M-ML.
 *
 * Nowość względem M-SQL: kontrakt checków M-ML nie jest gołym skalarem metryki
 * (accuracy na 6-elementowym teście przyjmuje ~7 wartości → kolizja jest regułą,
 * ADR-020 §1), lecz STRUKTURĄ Z TOŻSAMOŚCIĄ PRÓBKI:
 *   D1 `y_pred_test`     — pary [id, predykcja]; koduje charakterystyczną pomyłkę
 *                          uczciwego modelu (id=18);
 *   D2 `test_ids`        — pochodzenie podziału (zły random_state / ocena na treningu);
 *   D3 `max_corr_cecha_cel` — anty-przeciek (ml-7; na ml-4 cichy, ADR-020 §D3);
 *   D4 `predykcja_stala` — degeneracja do jednej klasy (strzelec / „wszystko pozytywne").
 *
 * Cztery klasyczne błędne drogi (przeciek, zły podział, klasa większościowa,
 * „wszystko pozytywne") dają INNY ładunek niż dobra droga — a pieczątka odmawia
 * PRZED emisją tokenu z celną diagnozą Sophii (ADR-020 §2.5, zmierzone wykonaniem
 * na zbiorze Aneksu, scikit-learn 1.6.1 i 1.9.0 — identyczne).
 *
 * Wymaga scikit-learn w środowisku (pin w tools/content/notebooks/srodowisko-colab.json;
 * krok pip w CI czyta go stamtąd). Harness wykonuje komórki realnym python3.
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

const STUDENT_ID = "student-parytet-mml-fixture";
const itemIdFor = (slug: string) => `item-${slug}-fixture`;

/** Import sklearn w świeżym procesie python3 potrafi zająć kilka sekund (jak duckdb w M-SQL). */
const HARNESS_TIMEOUT_MS = 30_000;

type HarnessResult = { stdout: string; error: string | null };

function runHarness(req: Record<string, unknown>): HarnessResult {
	const out = execFileSync("python3", [HARNESS], {
		input: JSON.stringify(req),
		encoding: "utf8",
	});
	return JSON.parse(out) as HarnessResult;
}

function tokenFrom(stdout: string): string | null {
	const m = stdout.match(/^[A-Za-z0-9_-]+\.[0-9a-f]{12}$/m);
	return m ? m[0] : null;
}

type PackedMml = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedMml(): PackedMml {
	return JSON.parse(
		readFileSync(join(ROOT, "tools", "content", "curriculum-atoms", "m-ml.json"), "utf8"),
	) as PackedMml;
}

// ── Wzorcowe uzupełnienia ────────────────────────────────────────────────────

// ML.4 — sześć luk (hint 3 dokumentu Sophii). Lewa strona = DOKŁADNY fragment
// ze źródła percent (z komentarzem i wyrównaniem — pieczątka nie toleruje przybliżeń).
const ML4_L1: [string, string] = ["X = df[[______]]", 'X = df[["minuty", "kwota", "godzina"]]'];
const ML4_L2: [string, string] = ["y = df[______]", 'y = df["napiwek"]'];
const ML4_L3: [string, string] = ["random_state=______)", "random_state=42)"];
const ML4_L45: [string, string] = [".fit(______, ______)", ".fit(X_tr, y_tr)"];
const ML4_L6: [string, string] = ["model.predict(______))", "model.predict(X_te))"];
const ML4_KOMPLET: [string, string][] = [ML4_L1, ML4_L2, ML4_L3, ML4_L45, ML4_L6];
const ML4_PAYLOAD: StampPayload = {
	acc_base: 0.6666666666666666,
	acc_model: 0.8333333333333334,
	test_ids: [0, 8, 9, 11, 16, 18],
	y_pred_test: [
		[0, 1],
		[8, 1],
		[9, 1],
		[11, 0],
		[16, 1],
		[18, 1],
	],
	predykcja_stala: false,
};

// ML.7 — bez luk; podmieniamy zaślepkę komentarza w komórce „Twój model".
const ML7_PUSTE = "# Twój przepływ — cały raport modelu (napisz od podziału po metryki):\n# ...";
const ml7Solution = (
	modelLine: string,
	xLine = 'X = df[["minuty", "kwota", "godzina"]]',
	splitRs = "42",
) =>
	[
		xLine,
		'y = df["napiwek"]',
		`X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=${splitRs})`,
		'baseline = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)',
		"acc_base = accuracy_score(y_te, baseline.predict(X_te))",
		modelLine,
		"acc_model = accuracy_score(y_te, model.predict(X_te))",
		"macierz = confusion_matrix(y_te, model.predict(X_te))",
		"prec = precision_score(y_te, model.predict(X_te))",
		"rec = recall_score(y_te, model.predict(X_te))",
	].join("\n");
const ML7_DRZEWO = "model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)";
const ML7_PAYLOAD: StampPayload = {
	acc_base: 0.6666666666666666,
	acc_model: 0.8333333333333334,
	prec: 0.8,
	rec: 1,
	macierz: [1, 1, 0, 4],
	test_ids: [0, 8, 9, 11, 16, 18],
	y_pred_test: [
		[0, 1],
		[8, 1],
		[9, 1],
		[11, 0],
		[16, 1],
		[18, 1],
	],
	predykcja_stala: false,
	max_corr_cecha_cel: 0.7049356271704668,
};

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "partia8", "nie", "sekret"].join("-");
});

describe("notebooki M-ML — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "mml");
	const items = packedMml().items;
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieją źródła labów M-ML: ml-4 i ml-7 (pieczątka tylko w labach)", () => {
		expect(labSlugs).toEqual(["ml-4", "ml-7"]);
		const slugi = sources.map((s) => s.slug).sort();
		expect(slugi).toEqual(["ml-4-lab-napiwki-pelna-sciezka", "ml-7-lab-raport-modelu"]);
	});

	it("notebookUrl labów M-ML wskazuje Colaba i ISTNIEJĄCY plik; ćwiczenia i przegląd bez URL-a", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "mml")).filter((f) => f.endsWith(".ipynb")));
		for (const item of items) {
			const url = item.config?.notebookUrl;
			if (item.kind === "lab") {
				expect(typeof url, `${item.slug}: config.notebookUrl`).toBe("string");
				const parsed = new URL(url as string);
				expect(parsed.host).toBe("colab.research.google.com");
				const file = parsed.pathname.split("/").at(-1) ?? "";
				expect(files.has(file), `${item.slug}: plik ${file} istnieje w notebooks/mml`).toBe(true);
				expect(file.startsWith(`${item.slug}-`), `${item.slug}: nazwa pliku od sluga`).toBe(true);
			} else {
				expect(url, `${item.slug}: ćwiczenie/przegląd bez notebookUrl`).toBeUndefined();
			}
		}
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("laby M-ML mają DOKŁADNIE jedną pieczątkę ze wspólnym blokiem; blok NIETKNIĘTY", () => {
		const shared = sharedStampBlock();
		for (const src of sources) {
			const nb = JSON.parse(
				readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8"),
			) as { cells: { cell_type: string; source: string[] }[] };
			const stampCells = nb.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			expect(stampCells, `${src.slug}: lab ma pieczątkę`).toHaveLength(1);
			const source = stampCells[0].source.join("");
			expect(source.endsWith(shared), `${src.slug}: blok wspólny bajt w bajt`).toBe(true);
			expect(source).toContain("def _zbierz_wyniki");
		}
	});
});

describe("symulacja sesji studenta M-ML: komórki → token → checki strukturalne z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedMml()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "mml")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "mml", file);
	};

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		expectPayload: StampPayload;
	}[] = [
		{
			name: "ml-4: sześć luk wypełnionych wzorcowo → token zalicza D1/D2/D4 + acc",
			slug: "ml-4",
			replacements: ML4_KOMPLET,
			expectPayload: ML4_PAYLOAD,
		},
		{
			name: "ml-7: pełny raport (drzewo) → token zalicza pełny kontrakt D1–D4 + macierz/metryki",
			slug: "ml-7",
			replacements: [[ML7_PUSTE, ml7Solution(ML7_DRZEWO)]],
			expectPayload: ML7_PAYLOAD,
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
				// Python i TS produkują IDENTYCZNY token (parytet kanoniczny, w tym listy zagnieżdżone)…
				expect(token).toBe(signToken(code, scenario.expectPayload));

				const parsed = parseToken(STUDENT_ID, itemId, token as string);
				expect(parsed.ok).toBe(true);
				if (!parsed.ok) return;

				// …i serwerowe checki strukturalne z m-ml.json przechodzą.
				const checks = checksBySlug.get(scenario.slug);
				expect(checks?.length ?? 0, `checki ${scenario.slug} w m-ml.json`).toBeGreaterThan(0);
				const verdict = evaluateChecks(checks ?? [], parsed.payload);
				expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	// ── Cztery błędne drogi (ADR-020 §2.5) — pieczątka odmawia PRZED tokenem ──
	const REFUSALS: {
		name: string;
		slug: string;
		replacements: [string, string][];
		message: RegExp;
	}[] = [
		{
			// D2: inny random_state → inny zestaw testowy. Naiwny skalar PRZEPUSZCZA
			// (acc=0.833 na [2,17,18,19,20,23]), provenance to łapie.
			name: "ml-7: zły podział (random_state=5) — ODMOWA D2 (inny zestaw testowy)",
			slug: "ml-7",
			replacements: [[ML7_PUSTE, ml7Solution(ML7_DRZEWO, undefined, "5")]],
			message: /Twoj zestaw testowy to przejazdy \[2, 17, 18, 19, 20, 23\][\s\S]*random_state=42/,
		},
		{
			// D1+D2: ocena na treningu (X_te,y_te przemianowane na trening) → 18 kluczy, acc=1.0.
			name: "ml-7: ocena na treningu (18 zamiast 6) — ODMOWA D1+D2 (grzech nr 1 z ML.6)",
			slug: "ml-7",
			replacements: [
				[
					ML7_PUSTE,
					ml7Solution(ML7_DRZEWO).replace(
						"macierz = confusion_matrix(y_te, model.predict(X_te))",
						"X_te, y_te = X_tr, y_tr\nmacierz = confusion_matrix(y_te, model.predict(X_te))",
					),
				],
			],
			message: /Oceniasz model na 18 przejazdach zamiast na 6 testowych[\s\S]*ocena na treningu/,
		},
		{
			// D1+D4: strzelec „zawsze najczęstsza klasa" → predykcja stała, wektor różni
			// się od wzorca na id=11 (tani przejazd, który uczciwy model daje jako 0).
			name: "ml-7: klasa większościowa (DummyClassifier) — ODMOWA D1+D4 (id=11)",
			slug: "ml-7",
			replacements: [
				[
					ML7_PUSTE,
					ml7Solution('model = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)'),
				],
			],
			message: /strzelec «zawsze najczestsza klasa»[\s\S]*tani przejazd id=11/,
		},
		{
			// D1+D3: przeciek — cecha będąca funkcją celu (napiwek w X). Accuracy 1.0
			// „wygląda jak sukces"; korelacja z celem = 1.0, wektor trafia id=18.
			name: "ml-7: przeciek etykiety (cecha = cel) — ODMOWA D1+D3 (id=18, korelacja ≈ 1.0)",
			slug: "ml-7",
			replacements: [
				[ML7_PUSTE, ml7Solution(ML7_DRZEWO, 'X = df[["minuty", "kwota", "godzina", "napiwek"]]')],
			],
			message: /przeciek etykiety \(ML.6 grzech 3\)[\s\S]*graniczny przejazd id=18/,
		},
		{
			// ml-4 (D3 cichy): zła luka 3 → inny podział. Dowodzi, że prowenance działa
			// też na labie z lukami, a diagnoza przecieku NIE wypływa na ml-4.
			name: "ml-4: zmienione ziarno w luce 3 (random_state=5) — ODMOWA D2",
			slug: "ml-4",
			replacements: [ML4_L1, ML4_L2, ["random_state=______)", "random_state=5)"], ML4_L45, ML4_L6],
			message: /Zmieniles\(-as\) ziarno w[\s\S]*random_state=42/,
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
					replacements: scenario.replacements,
				});
				// Odmowa ma być KOMUNIKATEM pieczątki, nie wyjątkiem sesji…
				expect(result.error, `harness error:\n${result.error}`).toBeNull();
				// …i pod żadnym pozorem nie może wypaść z niej token.
				expect(tokenFrom(result.stdout)).toBeNull();
				expect(result.stdout).toMatch(scenario.message);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	// ── Regresja parytetu wektora (ADR-020 §D1, warunek KONTRAKT-TESTU) ──
	// Sześć legalnych pipeline'ów musi dać IDENTYCZNY wektor (i cały ładunek) —
	// inaczej poprawny student z innym modelem dostałby fałszywą odmowę. To parytet
	// analogiczny do parytetu DuckDB w M-SQL (ta sama liczba na różnych silnikach).
	it(
		"ml-7: sześć legalnych modeli → IDENTYCZNY token (model-agnostyczność D1, wszystkie mylą id=18)",
		() => {
			const modele = [
				"model = DecisionTreeClassifier(max_depth=1, random_state=42).fit(X_tr, y_tr)",
				"model = DecisionTreeClassifier(max_depth=2, random_state=42).fit(X_tr, y_tr)",
				"model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)",
				"model = KNeighborsClassifier(n_neighbors=3).fit(X_tr, y_tr)",
				"model = KNeighborsClassifier(n_neighbors=5).fit(X_tr, y_tr)",
				"model = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)",
			];
			const code = atomCode(STUDENT_ID, itemIdFor("ml-7"));
			const oczekiwany = signToken(code, ML7_PAYLOAD);
			for (const modelLine of modele) {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath("ml-7"),
					atomCode: code,
					replacements: [[ML7_PUSTE, ml7Solution(modelLine)]],
				});
				expect(result.error, modelLine).toBeNull();
				const token = tokenFrom(result.stdout);
				expect(token, `token dla: ${modelLine}\n${result.stdout}`).toBe(oczekiwany);
			}
		},
		HARNESS_TIMEOUT_MS * 2,
	);

	it("token ml-4 wklejony w ml-7 jest odrzucany (bad_signature)", () => {
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("ml-4")), ML4_PAYLOAD);
		const parsed = parseToken(STUDENT_ID, itemIdFor("ml-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
