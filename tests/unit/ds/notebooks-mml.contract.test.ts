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
	return czytajTrescJson<PackedMml>("tools/content/curriculum-atoms/m-ml.json", {
		items: [],
	} as PackedMml);
}

type NbItem = { slug: string; kind: string; config?: { notebookUrl?: unknown } };

/**
 * Kontrakt `notebookUrl` dla POJEDYNCZEGO atomu M-ML. Zwraca listę naruszeń
 * ([] = OK). Jedyny guard używany zarówno przez asercję na realnych danych,
 * jak i przez testy adwersaryjne — negatyw ma sprawdzać TĘ logikę, nie kopię.
 *
 * Reguła (wzór F1, ADR-015): item z notebookiem (5 towarzyszy + 2 laby) MUSI
 * mieć URL na Colaba wskazujący ISTNIEJĄCY plik, którego nazwa zaczyna się od
 * sluga atomu. Jedyny item BEZ URL-a to `ml-przeglad` (przegląd bez notebooka).
 */
function notebookUrlViolations(item: NbItem, files: Set<string>): string[] {
	const url = item.config?.notebookUrl;
	const isPrzeglad = item.slug === "ml-przeglad";
	if (url === undefined) {
		return isPrzeglad ? [] : [`${item.slug}: brak notebookUrl (item z notebookiem musi mieć URL)`];
	}
	const problems: string[] = [];
	if (isPrzeglad) problems.push("ml-przeglad: przegląd nie powinien mieć notebookUrl");
	let file: string;
	try {
		const parsed = new URL(url as string);
		if (parsed.host !== "colab.research.google.com") {
			problems.push(`${item.slug}: host ${parsed.host} != colab.research.google.com`);
		}
		file = parsed.pathname.split("/").at(-1) ?? "";
	} catch {
		return [`${item.slug}: notebookUrl nie jest poprawnym URL-em`];
	}
	if (!files.has(file)) {
		problems.push(`${item.slug}: plik ${file} NIE istnieje w notebooks/mml (literówka sluga?)`);
	}
	if (!file.startsWith(`${item.slug}-`)) {
		problems.push(`${item.slug}: nazwa pliku ${file} nie zaczyna się od sluga atomu`);
	}
	return problems;
}

type NbCells = { cells: { cell_type: string; source: string[] }[] };

/** Liczy komórki-pieczątki (emitery tokenu) — jedyny detektor dla asercji realnej i adwersaryjnej. */
function countStampCells(nb: NbCells): number {
	return nb.cells.filter(
		(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
	).length;
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

// ── N1 (#219): krawędzie rozpoznania „legalnie drzewo" — Pipeline i podklasa ──
// Gałąź A pieczątki ml-7 (błędny wektor na D1) rozstrzyga rodzinę modelu: model
// SPOZA rodziny drzew → „inna rodzina" (token null); drzewo / jego PODKLASA /
// Pipeline z drzewem w środku → „zepsuty pipeline" (błąd konfiguracji, nie rodziny).
// Stary check `type(model).__name__ == "DecisionTreeClassifier"` mylił oba edge:
// Pipeline (nazwa „Pipeline") i podklasę (własna nazwa) brał za „inną rodzinę".
const ML7_PODKLASA_OK =
	"class MojeDrzewo(DecisionTreeClassifier):\n    pass\n" +
	"model = MojeDrzewo(random_state=42).fit(X_tr, y_tr)";
const ML7_PIPE_DRZEWO_OK =
	"from sklearn.pipeline import Pipeline\n" +
	"model = Pipeline([('clf', DecisionTreeClassifier(random_state=42))]).fit(X_tr, y_tr)";
// Non-tree: naiwny Bayes trafia graniczny id=18 poprawnie (0) — inny wektor niż
// wzorzec (1), więc dochodzi do rozgałęzienia D1 i wpada w Gałąź A.
const ML7_GAUSSIAN =
	"from sklearn.naive_bayes import GaussianNB\nmodel = GaussianNB().fit(X_tr, y_tr)";
const ML7_PIPE_GAUSSIAN =
	"from sklearn.pipeline import Pipeline\nfrom sklearn.naive_bayes import GaussianNB\n" +
	"model = Pipeline([('clf', GaussianNB())]).fit(X_tr, y_tr)";
// Podklasa drzewa, która celowo psuje jeden wynik → wektor błędny, ale to WCIĄŻ
// drzewo (isinstance): oczekujemy „zepsuty pipeline", NIE „inna rodzina".
const ML7_PODKLASA_BLAD =
	"class DrzewoOdwrocone(DecisionTreeClassifier):\n" +
	"    def predict(self, X):\n" +
	"        p = list(super().predict(X)); p[0] = 1 - p[0]; return p\n" +
	"model = DrzewoOdwrocone(random_state=42).fit(X_tr, y_tr)";
const ML7_PIPE_PODKLASA_BLAD =
	"from sklearn.pipeline import Pipeline\n" +
	"class DrzewoOdwrocone(DecisionTreeClassifier):\n" +
	"    def predict(self, X):\n" +
	"        p = list(super().predict(X)); p[0] = 1 - p[0]; return p\n" +
	"model = Pipeline([('clf', DrzewoOdwrocone(random_state=42))]).fit(X_tr, y_tr)";
// ZAGNIEŻDŻONY Pipeline[Pipeline[drzewo z błędnym wektorem]] — fix deklaruje
// obsługę zagnieżdżenia pętlą `while getattr(steps)`. Pojedyncze `if` rozpakowałoby
// tylko warstwę zewnętrzną → zostałby wewnętrzny Pipeline → isinstance False →
// „inna rodzina". Ten test blokuje regresję `while`→`if` (Quinn, wzmocnienie D3).
const ML7_PIPE_PIPE_PODKLASA_BLAD =
	"from sklearn.pipeline import Pipeline\n" +
	"class DrzewoOdwrocone(DecisionTreeClassifier):\n" +
	"    def predict(self, X):\n" +
	"        p = list(super().predict(X)); p[0] = 1 - p[0]; return p\n" +
	"model = Pipeline([('wew', Pipeline([('clf', DrzewoOdwrocone(random_state=42))]))]).fit(X_tr, y_tr)";

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "partia8", "nie", "sekret"].join("-");
});

describeTresc("notebooki M-ML — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "mml");
	const items = packedMml().items;
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);
	// Atomy z notebookiem = wszystko poza przeglądem (wzór F1: `atoms`). UWAGA:
	// to NIE jest `kind` — ml-przeglad też jest `exercise`, ale bez notebooka.
	const atoms = items.filter((i) => i.slug !== "ml-przeglad");

	it("istnieje 7 źródeł M-ML — 2 laby (ml-4,ml-7) + 5 towarzyszy (ml-1/2/3/5/6); przegląd bez notebooka", () => {
		expect(labSlugs).toEqual(["ml-4", "ml-7"]);
		expect(atoms).toHaveLength(7);
		expect(sources).toHaveLength(7);
		const slugi = sources.map((s) => s.slug).sort();
		expect(slugi).toEqual([
			"ml-1-model-dopasowany-z-danych",
			"ml-2-uczciwy-sprawdzian-train-test",
			"ml-3-baseline-punkt-odniesienia",
			"ml-4-lab-napiwki-pelna-sciezka", // gitleaks:allow — slug rekwizytu testu, nie sekret (generic-api-key FP)
			"ml-5-macierz-pomylek-metryki",
			"ml-6-leakage-trzy-grzechy",
			"ml-7-lab-raport-modelu",
		]);
		// Każdy atom z notebookiem ma DOKŁADNIE jeden zbudowany plik od sluga.
		const files = readdirSync(join(OUT_DIR, "mml")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu z notebookiem (5 towarzyszy + 2 laby = 7) wskazuje Colaba i ISTNIEJĄCY plik od sluga; bez URL tylko ml-przeglad", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "mml")).filter((f) => f.endsWith(".ipynb")));
		// Kierunek 1: żaden item (łącznie z przeglądem) nie łamie kontraktu notebookUrl.
		// Guard łapie towarzysza z URL-em na nieistniejący plik i nazwę spoza sluga.
		for (const item of items) {
			expect(notebookUrlViolations(item, files), `${item.slug}: naruszenia kontraktu URL`).toEqual(
				[],
			);
		}
		// Kierunek 2: zbiór atomów z URL == dokładnie 7 oczekiwanych (nie mniej, nie więcej).
		const zUrl = items
			.filter((i) => i.config?.notebookUrl !== undefined)
			.map((i) => i.slug)
			.sort();
		expect(zUrl).toEqual(["ml-1", "ml-2", "ml-3", "ml-4", "ml-5", "ml-6", "ml-7"]);
		// Kierunek 3: ml-przeglad to JEDYNY item bez notebookUrl.
		const bezUrl = items.filter((i) => i.config?.notebookUrl === undefined).map((i) => i.slug);
		expect(bezUrl).toEqual(["ml-przeglad"]);
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("laby M-ML (ml-4,ml-7) mają DOKŁADNIE jedną pieczątkę ze wspólnym blokiem; towarzysze (ml-1/2/3/5/6) — ZERO", () => {
		const shared = sharedStampBlock();
		for (const src of sources) {
			const nb = JSON.parse(
				readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8"),
			) as NbCells;
			const stampCells = nb.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			const isLab = labSlugs.some((slug) => src.slug.startsWith(`${slug}-`));
			if (isLab) {
				expect(stampCells, `${src.slug}: lab ma DOKŁADNIE jedną pieczątkę`).toHaveLength(1);
				const source = stampCells[0].source.join("");
				expect(source.endsWith(shared), `${src.slug}: blok wspólny bajt w bajt`).toBe(true);
				expect(source).toContain("def _zbierz_wyniki");
			} else {
				// Inwariant 0-pieczątek: towarzysz emitujący token przez pomyłkę wypuściłby
				// niezasłużony kredencjał (ćwiczenie ma zaliczać pytaniami, nie tokenem).
				expect(
					countStampCells(nb),
					`${src.slug}: towarzysz BEZ pieczątki (inwariant 0-stamp)`,
				).toBe(0);
			}
		}
	});
});

// ── ADWERSARYJNIE: „co JESZCZE przejdzie przez tę bramkę?" ────────────────────
// Guard z realnych danych świeci na zielono, gdy nikt nie popełnił wpadki. Te testy
// wstrzykują wpadki w KOPIE realnych obiektów i wymagają, by guard je ODRZUCIŁ —
// bronią samego guardu przed cichym osłabieniem (fail-closed, nie fail-open).
describeTresc("M-ML bramka notebooków — klasy wpadek, które NIE mogą przejść", () => {
	const files = new Set(readdirSync(join(OUT_DIR, "mml")).filter((f) => f.endsWith(".ipynb")));
	// Bazowy, POPRAWNY towarzysz — punkt odniesienia; sam w sobie nie ma naruszeń.
	const bazowy: NbItem = {
		slug: "ml-5",
		kind: "exercise",
		config: {
			notebookUrl:
				"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mml/ml-5-macierz-pomylek-metryki.ipynb",
		},
	};

	it("sanity: poprawny towarzysz (ml-5) nie ma naruszeń — guard nie jest ślepy na zielone", () => {
		expect(notebookUrlViolations(bazowy, files)).toEqual([]);
	});

	it("towarzysz → NIEistniejący plik (literówka sluga: pomylki vs pomylek) — ODRZUCONY", () => {
		// Dokładnie wpadka, którą Ethan złapał ręcznie; test ma ją łapać automatycznie.
		const zLiterowka: NbItem = {
			...bazowy,
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mml/ml-5-macierz-pomylki-metryki.ipynb",
			},
		};
		const v = notebookUrlViolations(zLiterowka, files);
		expect(
			v.some((m) => m.includes("NIE istnieje")),
			v.join(" | "),
		).toBe(true);
	});

	it("notebookUrl z nazwą pliku niezaczynającą się od sluga atomu (wskazuje plik innego atomu) — ODRZUCONY", () => {
		// Plik ISTNIEJE (files.has == true), ale należy do ml-4 — startsWith(ml-5-) pada.
		const obcyPlik: NbItem = {
			...bazowy,
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mml/ml-4-lab-napiwki-pelna-sciezka.ipynb",
			},
		};
		const v = notebookUrlViolations(obcyPlik, files);
		expect(
			v.some((m) => m.includes("nie zaczyna się od sluga")),
			v.join(" | "),
		).toBe(true);
	});

	it("towarzysz BEZ notebookUrl (regres builda — packer nie dopiął URL) — ODRZUCONY", () => {
		const bezUrl: NbItem = { slug: "ml-5", kind: "exercise", config: {} };
		const v = notebookUrlViolations(bezUrl, files);
		expect(
			v.some((m) => m.includes("brak notebookUrl")),
			v.join(" | "),
		).toBe(true);
	});

	it("ml-przeglad z przypadkowym notebookUrl (przegląd nie ma notebooka) — ODRZUCONY", () => {
		const przegladZUrl: NbItem = {
			slug: "ml-przeglad",
			kind: "exercise",
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mml/ml-przeglad-cokolwiek.ipynb",
			},
		};
		const v = notebookUrlViolations(przegladZUrl, files);
		expect(
			v.some((m) => m.includes("nie powinien mieć notebookUrl")),
			v.join(" | "),
		).toBe(true);
	});

	it("pieczątka wstrzyknięta do towarzysza — detektor ją WIDZI (inwariant 0-stamp nie jest pusty)", () => {
		// Dowód, że asercja „towarzysze = 0 pieczątek" nie przechodzi próżno:
		// syntetyczny towarzysz z komórką-pieczątką daje licznik > 0.
		const skazony: NbCells = {
			cells: [
				{ cell_type: "code", source: ["# zwykłe obliczenie ćwiczenia\n", "x = 1 + 1\n"] },
				{
					cell_type: "code",
					source: ["_pieczatka_token = _wystaw_token()\n", "print(_pieczatka_token)\n"],
				},
			],
		};
		expect(countStampCells(skazony)).toBe(1);
		// …a poprawny towarzysz (bez pieczątki) daje 0.
		expect(countStampCells({ cells: [{ cell_type: "code", source: ["x = 1\n"] }] })).toBe(0);
	});
});

describeTresc(
	"symulacja sesji studenta M-ML: komórki → token → checki strukturalne z prodowego JSON-a",
	() => {
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
			{
				// N1 #219: PODKLASA DecisionTreeClassifier to wciąż legalnie drzewo →
				// ten sam wektor → token wzorcowy (isinstance łapie, type().__name__ nie).
				name: "ml-7: podklasa DecisionTreeClassifier (rs=42) → token wzorcowy (podklasa = legalne drzewo, N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PODKLASA_OK)]],
				expectPayload: ML7_PAYLOAD,
			},
			{
				// N1 #219: Pipeline z drzewem kanonicznym → po rozpakowaniu final estimator
				// jest drzewem → ten sam wektor → token wzorcowy.
				name: "ml-7: Pipeline z drzewem kanonicznym w środku → token wzorcowy (final estimator rozpakowany, N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PIPE_DRZEWO_OK)]],
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
				replacements: [
					ML4_L1,
					ML4_L2,
					["random_state=______)", "random_state=5)"],
					ML4_L45,
					ML4_L6,
				],
				message: /Zmieniles\(-as\) ziarno w[\s\S]*random_state=42/,
			},
			// ── Gałąź A + krawędzie N1 #219: rozgałęzienie „inna rodzina" vs „zepsuty pipeline" ──
			{
				// N2 rdzeń: model spoza rodziny drzew → Gałąź A (odmowa, token null).
				name: "ml-7: non-DecisionTree (GaussianNB) — Gałąź A ODMOWA «inna rodzina», token null (N2 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_GAUSSIAN)]],
				message: /Twoj model to inna rodzina niz wzorzec/,
			},
			{
				// N1: Pipeline opakowujący NIE-drzewo → po rozpakowaniu final estimator to
				// GaussianNB → Gałąź A, nie „zepsuty pipeline".
				name: "ml-7: Pipeline z NIE-drzewem (GaussianNB) — Gałąź A ODMOWA «inna rodzina», token null (N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PIPE_GAUSSIAN)]],
				message: /Twoj model to inna rodzina niz wzorzec/,
			},
			{
				// N1 (regresja fixu): podklasa drzewa z błędnym wektorem to WCIĄŻ drzewo →
				// „zepsuty pipeline", NIE „inna rodzina" (stary type().__name__ mylił nazwą podklasy).
				name: "ml-7: podklasa drzewa z błędnym wektorem — ODMOWA «zepsuty pipeline» (nie «inna rodzina»), token null (N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PODKLASA_BLAD)]],
				message: /Wektor Twojego drzewa odbiega od wzorca/,
			},
			{
				// N1 (regresja fixu): Pipeline z drzewem dającym błędny wektor → po rozpakowaniu
				// drzewo → „zepsuty pipeline", NIE „inna rodzina" (stary type=="Pipeline" mylił).
				name: "ml-7: Pipeline z drzewem (błędny wektor) — ODMOWA «zepsuty pipeline» (nie «inna rodzina»), token null (N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PIPE_PODKLASA_BLAD)]],
				message: /Wektor Twojego drzewa odbiega od wzorca/,
			},
			{
				// N1 (regresja fixu, wzmocnienie Quinn): ZAGNIEŻDŻONY Pipeline[Pipeline[drzewo]]
				// z błędnym wektorem → pętla `while` rozpakowuje obie warstwy → drzewo →
				// „zepsuty pipeline". Blokuje podmianę `while`→`if` (rozpakowanie tylko 1 poziomu
				// dałoby „inna rodzina"). Deklaracja „zagniezdzony Pipeline" w fixie = kontrakt.
				name: "ml-7: ZAGNIEŻDŻONY Pipeline[Pipeline[drzewo]] (błędny wektor) — ODMOWA «zepsuty pipeline» (while nie if), token null (N1 #219)",
				slug: "ml-7",
				replacements: [[ML7_PUSTE, ml7Solution(ML7_PIPE_PIPE_PODKLASA_BLAD)]],
				message: /Wektor Twojego drzewa odbiega od wzorca/,
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
		// Drzewo(z ziarnem)/kNN(k≥3)/regresja logistyczna mylą DOKŁADNIE id=18 i dają IDENTYCZNY
		// wektor — to jest rodzina kanoniczna, NIE pełna model-agnostyczność. Pełnej agnostyczności
		// na tym zbiorze NIE MA: id=18 jest graniczna, więc kNN=1 / drzewo-bez-ziarna / GaussianNB
		// przewidują ją inaczej i dostają UCZCIWĄ odmowę D1 (kieruje na model kanoniczny — G4 2026-07-24).
		// Parytet analogiczny do DuckDB w M-SQL, ale zawężony do rodziny kanonicznej. kNN/LogReg nie są
		// już w nagłówku ml-7 (kanonizacja drzewa) — modele parytetu dostają import inline; token BEZ ZMIAN.
		it(
			"ml-7: rodzina kanoniczna (drzewo-ziarno/kNN k≥3/LogReg) → IDENTYCZNY token (parytet D1 na id=18)",
			() => {
				const modele = [
					"model = DecisionTreeClassifier(max_depth=1, random_state=42).fit(X_tr, y_tr)",
					"model = DecisionTreeClassifier(max_depth=2, random_state=42).fit(X_tr, y_tr)",
					"model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)",
					"from sklearn.neighbors import KNeighborsClassifier\nmodel = KNeighborsClassifier(n_neighbors=3).fit(X_tr, y_tr)",
					"from sklearn.neighbors import KNeighborsClassifier\nmodel = KNeighborsClassifier(n_neighbors=5).fit(X_tr, y_tr)",
					"from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)",
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
	},
);
