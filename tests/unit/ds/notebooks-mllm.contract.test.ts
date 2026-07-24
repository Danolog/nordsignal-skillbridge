/**
 * Partia 8 (ADR-015 + ADR-022) — kontrakt notebooków Colab M-LLM (ostatni moduł).
 *
 * Nowość względem M-ML: laby M-LLM uczą różnicy PARSOWANIE ≠ ZGODNOŚĆ ZE SCHEMATEM.
 * Kontrakt (ADR-022) nie jest gołym ułamkiem (`halucynacje_wskaznik`=0.5 to najgęstsza
 * kolizja: 1/2=2/4=3/6), lecz STRUKTURĄ Z ZAKOTWICZONYMI SKŁADNIKAMI:
 *   D3 `zgodnosc`=0.75 (6/8 schema-valid, NIE 0.875 powodzeń parsowania) + rozdział
 *      `sparsowane`/`zgodne` w LLM.4;
 *   D1 `pola_braki_liczba`=4 + `halucynacje_liczba`=2 (mianownik i licznik osobno);
 *   D2 `trafnosc_<pole>` per pole jako `value` skalar z tolerancją float (NIE lista).
 *
 * ⚠ WARUNEK BUDOWY (ADR-022 §D3): recompute pieczątki MUSI użyć DOKŁADNIE tego samego
 * filtra schema-valid co uczona proza — `rekord is not None and all(pole in rekord for
 * pole in POLA)`. Naiwny `is not None` na przypadku C8 (sparsowany bez `widelki_min`)
 * rzuca `KeyError` — regresja niżej to udowadnia wykonaniem (parytet 0.75 po obu stronach).
 *
 * Cztery błędne drogi finału (§1.3 ADR) dają INNY ładunek niż dobra droga, a pieczątka
 * odmawia PRZED emisją tokenu z celną, honest-message diagnozą (nazywa błąd studenta,
 * nigdy „notebook zepsuty"). Harness wykonuje komórki realnym python3 (tylko stdlib json).
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

const STUDENT_ID = "student-parytet-mllm-fixture";
const itemIdFor = (slug: string) => `item-${slug}-fixture`;
const HARNESS_TIMEOUT_MS = 20_000;
const B = "```"; // płotek markdown — literał trudny w template literalu

type HarnessResult = { stdout: string; error: string | null };

function runHarness(req: Record<string, unknown>): HarnessResult {
	const out = execFileSync("python3", [HARNESS], { input: JSON.stringify(req), encoding: "utf8" });
	return JSON.parse(out) as HarnessResult;
}
function tokenFrom(stdout: string): string | null {
	const m = stdout.match(/^[A-Za-z0-9_-]+\.[0-9a-f]{12}$/m);
	return m ? m[0] : null;
}

type PackedMllm = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};
function packedMllm(): PackedMllm {
	return JSON.parse(
		readFileSync(join(ROOT, "tools", "content", "curriculum-atoms", "m-llm.json"), "utf8"),
	) as PackedMllm;
}
function notebookPath(slug: string): string {
	const file = readdirSync(join(OUT_DIR, "mllm")).find((f) => f.startsWith(`${slug}-`));
	if (!file) throw new Error(`brak notebooka dla ${slug}`);
	return join(OUT_DIR, "mllm", file);
}

type NbItem = { slug: string; kind: string; config?: { notebookUrl?: unknown } };

/**
 * Kontrakt `notebookUrl` dla POJEDYNCZEGO atomu M-LLM. Zwraca listę naruszeń
 * ([] = OK). Jedyny guard używany zarówno przez asercję na realnych danych,
 * jak i przez testy adwersaryjne — negatyw ma sprawdzać TĘ logikę, nie kopię.
 *
 * Reguła (wzór F1, ADR-015): item z notebookiem (5 towarzyszy + 2 laby) MUSI
 * mieć URL na Colaba wskazujący ISTNIEJĄCY plik, którego nazwa zaczyna się od
 * sluga atomu. Jedyny item BEZ URL-a to `llm-przeglad` (przegląd bez notebooka).
 */
function notebookUrlViolations(item: NbItem, files: Set<string>): string[] {
	const url = item.config?.notebookUrl;
	const isPrzeglad = item.slug === "llm-przeglad";
	if (url === undefined) {
		return isPrzeglad ? [] : [`${item.slug}: brak notebookUrl (item z notebookiem musi mieć URL)`];
	}
	const problems: string[] = [];
	if (isPrzeglad) problems.push("llm-przeglad: przegląd nie powinien mieć notebookUrl");
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
		problems.push(`${item.slug}: plik ${file} NIE istnieje w notebooks/mllm (literówka sluga?)`);
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

// ── LLM.4 — trzy luki (hint 3 Sophii) ────────────────────────────────────────
const L4_LUKI: [string, string][] = [
	["json.loads(______)", "json.loads(czysty)"],
	["except ______:", "except json.JSONDecodeError:"],
	["zgodne = ______", "zgodne = zgodne + 1"],
];
const L4_PAYLOAD: StampPayload = {
	rekordy: [true, true, false, true, true, true],
	sparsowane: 5,
	zgodne: 4,
};

// ── LLM.7 — lab samodzielny: wzorcowe rozwiązanie w miejsce pustej komórki ────
const L7_PUSTE = "# Twoja ewaluacja — caly przeplyw (napisz od parsowania po wskaznik):\n# ...";
const L7_RS = [
	"rekordy = []",
	"for _tekst, _prawda in przypadki:",
	`    czysty = _tekst.strip().removeprefix("${B}json").removesuffix("${B}").strip()`,
	"    try:",
	"        rekord = json.loads(czysty)",
	"    except json.JSONDecodeError:",
	"        rekord = None",
	"    rekordy.append(rekord)",
	"",
	"zgodne = 0",
	"for rekord in rekordy:",
	"    if rekord is not None and all(pole in rekord for pole in POLA):",
	"        zgodne = zgodne + 1",
	"zgodnosc = zgodne / len(przypadki)",
	"",
	"trafienia = {pole: 0 for pole in POLA}",
	"liczba_zgodnych = 0",
	"pola_braki = 0",
	"halucynacje = 0",
	"for rekord, (_tekst, prawda) in zip(rekordy, przypadki):",
	"    if not (rekord is not None and all(pole in rekord for pole in POLA)):",
	"        continue",
	"    liczba_zgodnych = liczba_zgodnych + 1",
	"    for pole in POLA:",
	"        if rekord[pole] == prawda[pole]:",
	"            trafienia[pole] = trafienia[pole] + 1",
	"        if prawda[pole] is None:",
	"            pola_braki = pola_braki + 1",
	"            if rekord[pole] is not None:",
	"                halucynacje = halucynacje + 1",
	"trafnosc = {pole: trafienia[pole] / liczba_zgodnych for pole in POLA}",
	"halucynacje_wskaznik = halucynacje / pola_braki",
].join("\n");

const L7_PAYLOAD: StampPayload = {
	przypadki_liczba: 8,
	zgodnosc: 0.75,
	trafnosc_wartosci: [5 / 6, 4 / 6, 0.5],
	trafnosc_stanowisko: 5 / 6,
	trafnosc_miasto: 4 / 6,
	trafnosc_widelki_min: 0.5,
	pola_braki_liczba: 4,
	halucynacje_liczba: 2,
	halucynacje_wskaznik: 0.5,
};

// Wariant „trafność na WSZYSTKICH parsowalnych" (bez filtra schema, `.get` zamiast
// indeksu — inaczej KeyError na C8): trafność licząca 7 rekordów zamiast 6.
const L7_TRAF_ZGODNI = [
	"trafienia = {pole: 0 for pole in POLA}",
	"liczba_zgodnych = 0",
	"pola_braki = 0",
	"halucynacje = 0",
	"for rekord, (_tekst, prawda) in zip(rekordy, przypadki):",
	"    if not (rekord is not None and all(pole in rekord for pole in POLA)):",
	"        continue",
	"    liczba_zgodnych = liczba_zgodnych + 1",
	"    for pole in POLA:",
	"        if rekord[pole] == prawda[pole]:",
	"            trafienia[pole] = trafienia[pole] + 1",
	"        if prawda[pole] is None:",
	"            pola_braki = pola_braki + 1",
	"            if rekord[pole] is not None:",
	"                halucynacje = halucynacje + 1",
	"trafnosc = {pole: trafienia[pole] / liczba_zgodnych for pole in POLA}",
].join("\n");
const L7_TRAF_WSZ = [
	"trafienia = {pole: 0 for pole in POLA}",
	"liczba = 0",
	"pola_braki = 0",
	"halucynacje = 0",
	"for rekord, (_tekst, prawda) in zip(rekordy, przypadki):",
	"    if rekord is None:",
	"        continue",
	"    liczba = liczba + 1",
	"    for pole in POLA:",
	"        if rekord.get(pole) == prawda[pole]:",
	"            trafienia[pole] = trafienia[pole] + 1",
	"for rekord, (_tekst, prawda) in zip(rekordy, przypadki):",
	"    if not (rekord is not None and all(pole in rekord for pole in POLA)):",
	"        continue",
	"    for pole in POLA:",
	"        if prawda[pole] is None:",
	"            pola_braki = pola_braki + 1",
	"            if rekord[pole] is not None:",
	"                halucynacje = halucynacje + 1",
	"trafnosc = {pole: trafienia[pole] / liczba for pole in POLA}",
].join("\n");

beforeAll(() => {
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "partia8", "nie", "sekret"].join("-");
});

describe("notebooki M-LLM — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "mllm");
	const items = packedMllm().items;
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);
	// Atomy z notebookiem = wszystko poza przeglądem (wzór F1: `atoms`). UWAGA:
	// to NIE jest `kind` — llm-przeglad też jest `exercise`, ale bez notebooka.
	const atoms = items.filter((i) => i.slug !== "llm-przeglad");

	it("istnieje 7 źródeł M-LLM — 2 laby (llm-4,llm-7) + 5 towarzyszy (llm-1/2/3/5/6); przegląd bez notebooka", () => {
		expect(labSlugs).toEqual(["llm-4", "llm-7"]);
		expect(atoms).toHaveLength(7);
		expect(sources).toHaveLength(7);
		expect(sources.map((s) => s.slug).sort()).toEqual([
			"llm-1-maszyna-przewidujaca-tekst",
			"llm-2-prompt-jako-specyfikacja",
			"llm-3-parsuj-waliduj-porazka",
			"llm-4-lab-parser-na-porazki",
			"llm-5-ewaluacja-trafnosc-halucynacje",
			"llm-6-klucz-limity-rodo",
			"llm-7-lab-tabela-ewaluacji",
		]);
		// Każdy atom z notebookiem ma DOKŁADNIE jeden zbudowany plik od sluga.
		const files = readdirSync(join(OUT_DIR, "mllm")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu z notebookiem (5 towarzyszy + 2 laby = 7) wskazuje Colaba i ISTNIEJĄCY plik od sluga; bez URL tylko llm-przeglad", () => {
		const files = new Set(readdirSync(join(OUT_DIR, "mllm")).filter((f) => f.endsWith(".ipynb")));
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
		expect(zUrl).toEqual(["llm-1", "llm-2", "llm-3", "llm-4", "llm-5", "llm-6", "llm-7"]);
		// Kierunek 3: llm-przeglad to JEDYNY item bez notebookUrl.
		const bezUrl = items.filter((i) => i.config?.notebookUrl === undefined).map((i) => i.slug);
		expect(bezUrl).toEqual(["llm-przeglad"]);
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("laby M-LLM (llm-4,llm-7) mają DOKŁADNIE jedną pieczątkę ze wspólnym blokiem; towarzysze (llm-1/2/3/5/6) — ZERO", () => {
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
describe("M-LLM bramka notebooków — klasy wpadek, które NIE mogą przejść", () => {
	const files = new Set(readdirSync(join(OUT_DIR, "mllm")).filter((f) => f.endsWith(".ipynb")));
	// Bazowy, POPRAWNY towarzysz — punkt odniesienia; sam w sobie nie ma naruszeń.
	const bazowy: NbItem = {
		slug: "llm-5",
		kind: "exercise",
		config: {
			notebookUrl:
				"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mllm/llm-5-ewaluacja-trafnosc-halucynacje.ipynb",
		},
	};

	it("sanity: poprawny towarzysz (llm-5) nie ma naruszeń — guard nie jest ślepy na zielone", () => {
		expect(notebookUrlViolations(bazowy, files)).toEqual([]);
	});

	it("towarzysz → NIEistniejący plik (literówka sluga: trafnosc vs trafność) — ODRZUCONY", () => {
		// Dokładnie wpadka, którą Ethan łapie ręcznie w packerze; test ma ją łapać automatycznie.
		const zLiterowka: NbItem = {
			...bazowy,
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mllm/llm-5-ewaluacja-trafnos-halucynacje.ipynb",
			},
		};
		const v = notebookUrlViolations(zLiterowka, files);
		expect(
			v.some((m) => m.includes("NIE istnieje")),
			v.join(" | "),
		).toBe(true);
	});

	it("notebookUrl z nazwą pliku niezaczynającą się od sluga atomu (wskazuje plik innego atomu) — ODRZUCONY", () => {
		// Plik ISTNIEJE (files.has == true), ale należy do llm-4 — startsWith(llm-5-) pada.
		const obcyPlik: NbItem = {
			...bazowy,
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mllm/llm-4-lab-parser-na-porazki.ipynb",
			},
		};
		const v = notebookUrlViolations(obcyPlik, files);
		expect(
			v.some((m) => m.includes("nie zaczyna się od sluga")),
			v.join(" | "),
		).toBe(true);
	});

	it("towarzysz BEZ notebookUrl (regres builda — packer nie dopiął URL) — ODRZUCONY", () => {
		const bezUrl: NbItem = { slug: "llm-5", kind: "exercise", config: {} };
		const v = notebookUrlViolations(bezUrl, files);
		expect(
			v.some((m) => m.includes("brak notebookUrl")),
			v.join(" | "),
		).toBe(true);
	});

	it("llm-przeglad z przypadkowym notebookUrl (przegląd nie ma notebooka) — ODRZUCONY", () => {
		const przegladZUrl: NbItem = {
			slug: "llm-przeglad",
			kind: "exercise",
			config: {
				notebookUrl:
					"https://colab.research.google.com/github/Danolog/skillbridge-notebooks/blob/main/mllm/llm-przeglad-cokolwiek.ipynb",
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

describe("symulacja sesji studenta M-LLM: komórki → token → checki strukturalne z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedMllm()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);

	const HAPPY: {
		name: string;
		slug: string;
		replacements: [string, string][];
		payload: StampPayload;
	}[] = [
		{
			name: "llm-4: trzy luki wzorcowo → token; rozdział parse(5)/schema(4) na 6 odpowiedziach",
			slug: "llm-4",
			replacements: L4_LUKI,
			payload: L4_PAYLOAD,
		},
		{
			name: "llm-7: pełna tabela ewaluacji → token; zgodnosc 0.75, kotwice 4/2, trafność per pole",
			slug: "llm-7",
			replacements: [[L7_PUSTE, L7_RS]],
			payload: L7_PAYLOAD,
		},
	];

	for (const s of HAPPY) {
		it(
			s.name,
			() => {
				const code = atomCode(STUDENT_ID, itemIdFor(s.slug));
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath(s.slug),
					atomCode: code,
					replacements: s.replacements,
				});
				expect(result.error).toBeNull();
				const token = tokenFrom(result.stdout);
				expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
				// Python i TS produkują IDENTYCZNY token (parytet kanoniczny, round 6).
				expect(token).toBe(signToken(code, s.payload));

				const parsed = parseToken(STUDENT_ID, itemIdFor(s.slug), token as string);
				expect(parsed.ok).toBe(true);
				if (!parsed.ok) return;
				const checks = checksBySlug.get(s.slug);
				expect(checks?.length ?? 0, `checki ${s.slug}`).toBeGreaterThan(0);
				const verdict = evaluateChecks(checks ?? [], parsed.payload);
				expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	// ── Cztery błędne drogi finału (ADR-022 §2.5) + LLM.4 — odmowa PRZED tokenem ──
	const REFUSALS: {
		name: string;
		slug: string;
		replacements: [string, string][];
		message: RegExp;
	}[] = [
		{
			name: "llm-7: `zgodnosc` = powodzenia parsowania (0.875) — ODMOWA D3 (parse ≠ schema)",
			slug: "llm-7",
			replacements: [
				[
					L7_PUSTE,
					L7_RS.replace(
						"    if rekord is not None and all(pole in rekord for pole in POLA):\n        zgodne = zgodne + 1",
						"    if rekord is not None:\n        zgodne = zgodne + 1",
					),
				],
			],
			message: /zgodnosc` wyszla 0\.875[\s\S]*SPARSOWANE \(7/,
		},
		{
			name: "llm-7: trafność zdegenerowana [1,1,1] — ODMOWA D2 (per pole)",
			slug: "llm-7",
			replacements: [
				[
					L7_PUSTE,
					L7_RS.replace(
						"trafnosc = {pole: trafienia[pole] / liczba_zgodnych for pole in POLA}",
						"trafnosc = {pole: 1.0 for pole in POLA}",
					),
				],
			],
			message: /trafnosc` nie zgadza sie ze wzorcem[\s\S]*6 zgodnych ze schematem/,
		},
		{
			name: "llm-7: trafność na WSZYSTKICH parsowalnych (7, bez filtra schema) — ODMOWA D2",
			slug: "llm-7",
			replacements: [[L7_PUSTE, L7_RS.replace(L7_TRAF_ZGODNI, L7_TRAF_WSZ)]],
			message: /trafnosc` nie zgadza sie ze wzorcem[\s\S]*Odfiltruj przed liczeniem/,
		},
		{
			name: "llm-7: błąd wcięcia w pętli halucynacji (1/2 = 0.5 kolizja) — ODMOWA D1 (składniki)",
			slug: "llm-7",
			replacements: [
				[
					L7_PUSTE,
					L7_RS.replace(
						"        if prawda[pole] is None:",
						'        if pole == "miasto" and prawda[pole] is None:',
					),
				],
			],
			message: /wskaznik` = 0\.5 zgadza sie[\s\S]*pola-braki=2 i halucynacje=1[\s\S]*WCIECIE/,
		},
		{
			name: "llm-4: niezdjęty płotek (parsujesz tekst zamiast czysty) — ODMOWA (sparsowane 4)",
			slug: "llm-4",
			replacements: [["json.loads(______)", "json.loads(tekst)"], L4_LUKI[1], L4_LUKI[2]],
			message: /sparsowane` = 4[\s\S]*NIEZDJETY PLOTEK/,
		},
		{
			name: "llm-4: rekord bez kompletu pól policzony jako zgodny — ODMOWA (zgodne 5)",
			slug: "llm-4",
			replacements: [
				...L4_LUKI,
				[
					"if rekord is not None and all(pole in rekord for pole in POLA):\n        zgodne = zgodne + 1",
					"if rekord is not None:\n        zgodne = zgodne + 1",
				],
			],
			message: /zgodne` = 5[\s\S]*bez kompletu pol jako zgodny/,
		},
	];

	for (const s of REFUSALS) {
		it(
			s.name,
			() => {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath(s.slug),
					atomCode: atomCode(STUDENT_ID, itemIdFor(s.slug)),
					replacements: s.replacements,
				});
				// Odmowa = KOMUNIKAT pieczątki, nie wyjątek sesji…
				expect(result.error, `harness error:\n${result.error}`).toBeNull();
				// …i pod żadnym pozorem nie wypada token.
				expect(tokenFrom(result.stdout)).toBeNull();
				expect(result.stdout).toMatch(s.message);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	// ── Regresja na filtr schema-valid (ADR-022 §D3 — WARUNEK BUDOWY) ──
	// Naiwny `is not None` (bez `all(pole in rekord …)`) na przypadku C8 (sparsowany bez
	// `widelki_min`) rzuca KeyError w PĘTLI STUDENTA — to jest „mina", przed którą chroni
	// zaostrzony filtr. Dowód wykonaniem, że filtr jest load-bearing (parytet 0.75↔0.75:
	// pieczątka recompute i uczona proza używają identycznego filtra; naiwny wariant pada).
	it(
		"llm-7: naiwny filtr `is not None` (bez all) → KeyError na C8, ZERO tokenu (mina schema-valid)",
		() => {
			const naiwny = L7_RS.replace(
				"    if not (rekord is not None and all(pole in rekord for pole in POLA)):\n        continue\n    liczba_zgodnych",
				"    if rekord is None:\n        continue\n    liczba_zgodnych",
			);
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath("llm-7"),
				atomCode: atomCode(STUDENT_ID, itemIdFor("llm-7")),
				replacements: [[L7_PUSTE, naiwny]],
			});
			expect(result.error, "naiwny filtr ma paść KeyError").toMatch(/KeyError/);
			expect(result.error).toMatch(/widelki_min/);
			expect(tokenFrom(result.stdout)).toBeNull();
		},
		HARNESS_TIMEOUT_MS,
	);

	it("token llm-4 wklejony w llm-7 jest odrzucany (bad_signature)", () => {
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("llm-4")), L4_PAYLOAD);
		const parsed = parseToken(STUDENT_ID, itemIdFor("llm-7"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
