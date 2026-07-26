// ============================================================================
// 1E.7 (SLICE L2) — testy reguły placementu (`src/lib/curriculum/placement.ts`).
//
// Kontrakt źródłowy: docs/product/decyzje-1e7-placement-v0.1.md (v0.3, Sophia),
// DECYZJA 2 (próg) + DECYZJA 5 (reguła prefiksowa) + §6 (przypadki brzegowe).
// Sekcja „Sprawdzenie reguły na przypadkach" (6 wierszy tabeli) jest tu
// przepisana 1:1 jako golden test — każdy wiersz to osobny `it`.
//
// ✅ ROZSTRZYGNIĘTE (Sophia v0.3 §7, potwierdzone przez Olivera 2026-07-26):
// rekomendowany start = `deepestUnlockedSlug` (NAJGŁĘBSZY ODBLOKOWANY).
// Zlecenie L2 mówiło „pierwszy nieodblokowany" i było BŁĘDNE: przy
// ds-python=4, ds-pandas=4 wskazuje m-eda, czyli materiał, na którym student
// wypadł słabo. Obie wielkości zostają, z rozdzielonymi rolami —
// `deepestUnlockedSlug` = gdzie zaczynasz, `firstNotUnlockedSlug` = najbliższy
// cel na drabinie. ŻADNEJ nie wolno nazwać „punktem startu" (v0.3 §7).
//
// Poza golden testem: wyczerpujące porównanie implementacji (jeden przebieg
// w przód) z NIEZALEŻNĄ, deklaratywną implementacją reguł 1–6 na wszystkich
// 5^6 = 15 625 kształtach wyniku diagnozy dla drabiny DS. To jest właściwy
// dowód równoważności — pojedyncze przypadki go nie dają.
// ============================================================================

import { describe, expect, it } from "vitest";
import type { CompetencyLevel } from "@/lib/assessment/types";
import {
	computePlacement,
	DEFAULT_PLACEMENT_THRESHOLD,
	isQualifyingLevel,
	type PlacementDiagnosis,
	type PlacementLadderModule,
} from "../placement";

// ── Drabina DS 1:1 z manifestem (tools/content/curriculum-ds-drabina.json) ───
const LADDER: PlacementLadderModule[] = [
	{ slug: "l0-start", position: 1, diagnosticConceptSlug: null },
	{
		slug: "f1-python-1",
		position: 2,
		diagnosticConceptSlug: "ds-python",
		competencyName: "Python",
	},
	{ slug: "f2-python-2", position: 3, diagnosticConceptSlug: null },
	{ slug: "f3-dane-python", position: 4, diagnosticConceptSlug: null },
	{ slug: "m-pandas", position: 5, diagnosticConceptSlug: "ds-pandas", competencyName: "Pandas" },
	{ slug: "m-eda", position: 6, diagnosticConceptSlug: "ds-eda", competencyName: "EDA" },
	{ slug: "m-sql", position: 7, diagnosticConceptSlug: "ds-sql", competencyName: "SQL" },
	{
		slug: "m-ml",
		position: 8,
		diagnosticConceptSlug: "ds-uczenie-maszynowe",
		competencyName: "Uczenie maszynowe",
	},
	{ slug: "m-llm", position: 9, diagnosticConceptSlug: "ds-llm", competencyName: "LLM" },
];

const TAGS = [
	"ds-python",
	"ds-pandas",
	"ds-eda",
	"ds-sql",
	"ds-uczenie-maszynowe",
	"ds-llm",
] as const;

/** Buduje `result_json` z mapy slug → poziom (pominięty slug = brak pomiaru). */
function diagnosis(
	levels: Partial<Record<string, CompetencyLevel>>,
	uncovered: string[] = [],
): PlacementDiagnosis {
	const concepts: PlacementDiagnosis["concepts"] = {};
	for (const [slug, level] of Object.entries(levels)) {
		if (level == null) continue;
		concepts[slug] = { asked: 2, correct: level >= 3 ? level - 2 : 0, level };
	}
	return { concepts, uncovered };
}

// ── Referencyjna implementacja reguł 1–6 (deklaratywna, niezależna od kodu
// produkcyjnego): k = max kwalifikujących, potem pętla cofania przed pierwszą
// dziurę + docięcie do ostatniego modułu potwierdzonego własnym pomiarem. ─────
function referenceUnlocked(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
): string[] {
	const ordered = [...modules].sort((a, b) => a.position - b.position);
	const rootPosition = ordered[0].position;
	const qualifies = (m: PlacementLadderModule): boolean => {
		if (m.diagnosticConceptSlug === null || diag === null) return false;
		const level = diag.concepts[m.diagnosticConceptSlug]?.level;
		return level != null && level >= threshold;
	};
	const qualifyingPositions = ordered.filter(qualifies).map((m) => m.position);
	let k = qualifyingPositions.length > 0 ? Math.max(...qualifyingPositions) : 0;
	for (;;) {
		const hole = ordered.find(
			(m) =>
				m.position > rootPosition &&
				m.position <= k &&
				m.diagnosticConceptSlug !== null &&
				!qualifies(m),
		);
		if (hole) {
			k = hole.position - 1;
			continue;
		}
		const deepestOwn = qualifyingPositions.filter((p) => p <= k);
		const trimmed = deepestOwn.length > 0 ? Math.max(...deepestOwn) : 0;
		if (trimmed < k) {
			k = trimmed;
			continue;
		}
		break;
	}
	return ordered.filter((m) => m.position > rootPosition && m.position <= k).map((m) => m.slug);
}

// ── Referencja pozostałych pól MIERNIKA (C2 przeglądu Leo) ────────────────────
// Od v0.3 `blockingHoleSlug` i `supportMode` NIE są ozdobą werdyktu, tylko
// polami miernika trafności progu (DECYZJA 2): pierwsze jest JEDYNYM źródłem
// danych o studencie NIEDOSZACOWANYM (przechodzi moduł, którego nie
// potrzebował, i nic nie zgłasza), drugie mówi, czy mitygacja „pełne wsparcie
// przy poziomie granicznym" cokolwiek zmienia. Skoro L3 utrwala je w bazie
// i nie da się ich odtworzyć wstecz, muszą wejść do WYCZERPUJĄCEGO porównania,
// a nie zostać na kilku golden-przypadkach.

/** Dziura ucinająca prefiks: pierwszy OTAGOWANY moduł poza korzeniem, który się nie kwalifikuje. */
function referenceHole(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
): string | null {
	const ordered = [...modules].sort((a, b) => a.position - b.position);
	const hole = ordered
		.slice(1)
		.find(
			(m) =>
				m.diagnosticConceptSlug !== null &&
				!isQualifyingLevel(diag?.concepts[m.diagnosticConceptSlug]?.level ?? null, threshold),
		);
	return hole?.slug ?? null;
}

/**
 * Tryb wsparcia per moduł WPROST z tabeli Sophii (v0.3, DECYZJA 2), liczony
 * z wejścia — nie z werdyktu implementacji:
 *   • moduł nieodblokowany → null,
 *   • odblokowany na WŁASNYM pomiarze: poziom == próg → 'full', wyżej → 'fading',
 *   • odblokowany bez własnego pomiaru (wciągnięty prefiksem) → 'full'.
 */
function referenceSupport(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
): Record<string, string | null> {
	const unlocked = new Set(referenceUnlocked(modules, diag, threshold));
	const out: Record<string, string | null> = {};
	for (const m of modules) {
		if (!unlocked.has(m.slug)) {
			out[m.slug] = null;
			continue;
		}
		const level =
			m.diagnosticConceptSlug === null
				? null
				: (diag?.concepts[m.diagnosticConceptSlug]?.level ?? null);
		out[m.slug] = level === null ? "full" : level === threshold ? "full" : "fading";
	}
	return out;
}

describe("computePlacement — 6 przypadków z tabeli Sophii (DECYZJA 5)", () => {
	it("wszystko poziom 1–2 → nic odblokowane, student zaczyna od l0-start", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({
				"ds-python": 2,
				"ds-pandas": 1,
				"ds-eda": 2,
				"ds-sql": 1,
				"ds-uczenie-maszynowe": 1,
				"ds-llm": 2,
			}),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.prefixEndPosition).toBe(0);
		expect(out.deepestUnlockedSlug).toBeNull();
		expect(out.rootSlug).toBe("l0-start");
		expect(out.blockingHoleSlug).toBe("f1-python-1");
	});

	it("ds-python=4, reszta niska → k=2, tylko f1-python-1 (DECYZJA 4)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4, "ds-pandas": 1, "ds-eda": 1 }),
		});
		expect(out.unlockedSlugs).toEqual(["f1-python-1"]);
		expect(out.prefixEndPosition).toBe(2);
		expect(out.deepestUnlockedSlug).toBe("f1-python-1");
		// f2/f3 mają NULL i leżą ZA prefiksem — same go nie przedłużają (reguła 5).
		expect(out.modules.find((m) => m.slug === "f2-python-2")?.reason).toBe(
			"untagged_beyond_prefix",
		);
	});

	it("ds-python=4 + ds-pandas=4 → k=5, F2/F3 przeciągnięte kompetencją pochodną", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4, "ds-pandas": 4, "ds-eda": 1 }),
		});
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
		expect(out.prefixEndPosition).toBe(5);
		const f2 = out.modules.find((m) => m.slug === "f2-python-2");
		expect(f2?.reason).toBe("carried_untagged");
		expect(f2?.qualifies).toBe(false);
		// v0.3 DECYZJA 2, trzecia gałąź: moduł wciągnięty prefiksem BEZ własnego
		// pomiaru dostaje PEŁNE WSPARCIE (dowód pośredni — wnioskowanie, nie pomiar).
		// `null` nie jest już stanem osiągalnym dla modułu odblokowanego. Rozróżnienie
		// niesie `reason`, nie `supportMode` — oba przypadki wymagają przeciwnych napraw.
		expect(f2?.supportMode).toBe("full");
	});

	it("PRZYPADEK OCHRONNY: ds-pandas=4, ds-python=1 → nic (dziura na pozycji 2)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-pandas": 4, "ds-python": 1 }),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.blockingHoleSlug).toBe("f1-python-1");
		expect(out.modules.find((m) => m.slug === "m-pandas")?.reason).toBe("beyond_prefix");
		expect(out.modules.find((m) => m.slug === "m-pandas")?.qualifies).toBe(true);
	});

	it("ds-python=4, ds-pandas=4, ds-eda=1, ds-sql=4 → k=5 (EDA to dziura na 6)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({
				"ds-python": 4,
				"ds-pandas": 4,
				"ds-eda": 1,
				"ds-sql": 4,
			}),
		});
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
		expect(out.prefixEndPosition).toBe(5);
		expect(out.blockingHoleSlug).toBe("m-eda");
		expect(out.firstNotUnlockedSlug).toBe("m-eda");
		expect(out.modules.find((m) => m.slug === "m-sql")?.reason).toBe("beyond_prefix");
	});

	it("wszystkie 6 tagów ≥3 → cała drabina poza l0-start", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis(Object.fromEntries(TAGS.map((t) => [t, 3 as CompetencyLevel]))),
		});
		expect(out.unlockedSlugs).toEqual([
			"f1-python-1",
			"f2-python-2",
			"f3-dane-python",
			"m-pandas",
			"m-eda",
			"m-sql",
			"m-ml",
			"m-llm",
		]);
		expect(out.prefixEndPosition).toBe(9);
		expect(out.deepestUnlockedSlug).toBe("m-llm");
		expect(out.firstNotUnlockedSlug).toBeNull();
		expect(out.blockingHoleSlug).toBeNull();
		// Korzeń NIGDY nie wchodzi do odblokowanych, nawet przy komplecie (reguła 6).
		expect(out.unlockedSlugs).not.toContain("l0-start");
		expect(out.modules[0].reason).toBe("root");
		expect(out.modules[0].unlocked).toBe(false);
	});
});

describe("computePlacement — przypadki brzegowe", () => {
	it("diagnoza z pustym `concepts` → zero odblokowań, powód no_measurement", () => {
		const out = computePlacement({ modules: LADDER, diagnosis: diagnosis({}) });
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.reason).toBe("no_measurement");
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.level).toBeNull();
	});

	it("brak sesji diagnozy (null) → zero odblokowań, start od l0-start (§6d)", () => {
		const out = computePlacement({ modules: LADDER, diagnosis: null });
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.prefixEndPosition).toBe(0);
		// Przy pustym prefiksie „pierwszy za prefiksem" to POZYCJA 1, czyli korzeń —
		// i to jest zgodne z §6d („start od l0-start"). Zarazem pokazuje, dlaczego
		// `firstNotUnlockedSlug` NIE jest bezpiecznym synonimem „punktu startu”:
		// korzeń nigdy nie jest odblokowywany, więc naiwne „pierwszy nieodblokowany”
		// degeneruje do l0-start zawsze, gdy placement niczego nie otworzył.
		expect(out.firstNotUnlockedSlug).toBe("l0-start");
		expect(out.modules.every((m) => !m.unlocked)).toBe(true);
	});

	it("kompetencja w `uncovered` → nie kwalifikuje i ma własny powód (§6a)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4, "ds-pandas": 4 }, ["EDA"]),
		});
		const eda = out.modules.find((m) => m.slug === "m-eda");
		expect(eda?.unlocked).toBe(false);
		expect(eda?.reason).toBe("uncovered");
		// Dziura z `uncovered` zatrzymuje prefiks tak samo jak niski wynik.
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
		expect(out.blockingHoleSlug).toBe("m-eda");
	});

	it("`uncovered` bez podanej nazwy kompetencji → ostrożniejszy powód no_measurement", () => {
		const bezNazw = LADDER.map((m) => ({ ...m, competencyName: undefined }));
		const out = computePlacement({
			modules: bezNazw,
			diagnosis: diagnosis({ "ds-python": 4 }, ["EDA"]),
		});
		expect(out.modules.find((m) => m.slug === "m-eda")?.reason).toBe("no_measurement");
	});

	it("wszystkie tagi NULL → nic odblokowane (NULL nigdy nie wyznacza k)", () => {
		const bezTagow = LADDER.map((m) => ({ ...m, diagnosticConceptSlug: null }));
		const out = computePlacement({
			modules: bezTagow,
			diagnosis: diagnosis(Object.fromEntries(TAGS.map((t) => [t, 4 as CompetencyLevel]))),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.prefixEndPosition).toBe(0);
		expect(out.blockingHoleSlug).toBeNull();
	});

	it("poziom DOKŁADNIE na progu kwalifikuje i daje pełne wsparcie (DECYZJA 2)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 3 }),
		});
		const f1 = out.modules.find((m) => m.slug === "f1-python-1");
		expect(f1?.unlocked).toBe(true);
		expect(f1?.reason).toBe("qualified");
		expect(f1?.supportMode).toBe("full");
		expect(out.threshold).toBe(DEFAULT_PLACEMENT_THRESHOLD);
	});

	it("poziom powyżej progu → tryb wygaszania wsparcia (fading)", () => {
		const out = computePlacement({ modules: LADDER, diagnosis: diagnosis({ "ds-python": 4 }) });
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.supportMode).toBe("fading");
	});

	it("tag wskazujący koncept NIEOBECNY w wyniku diagnozy → brak pomiaru, nie poziom 0", () => {
		const zLewymTagiem = LADDER.map((m) =>
			m.slug === "m-pandas" ? { ...m, diagnosticConceptSlug: "ds-nie-ma-takiego" } : m,
		);
		const out = computePlacement({
			modules: zLewymTagiem,
			diagnosis: diagnosis({ "ds-python": 4, "ds-pandas": 4, "ds-eda": 4 }),
		});
		const pandas = out.modules.find((m) => m.slug === "m-pandas");
		expect(pandas?.level).toBeNull();
		expect(pandas?.qualifies).toBe(false);
		expect(pandas?.reason).toBe("no_measurement");
		// Zły tag zachowuje się jak dziura — prefiks staje przed nim, a nie „przez pomyłkę” dalej.
		expect(out.unlockedSlugs).toEqual(["f1-python-1"]);
		expect(out.blockingHoleSlug).toBe("m-pandas");
	});

	it("pusta drabina → pusty wynik, bez wyjątku", () => {
		const out = computePlacement({ modules: [], diagnosis: diagnosis({ "ds-python": 4 }) });
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.rootSlug).toBeNull();
		expect(out.modules).toEqual([]);
	});
});

describe("computePlacement — próg jako parametr (DECYZJA 2, miernik z progiem alarmowym)", () => {
	it("podniesienie progu do 4 odbiera kwalifikację poziomowi 3", () => {
		const diag = diagnosis({ "ds-python": 3, "ds-pandas": 4 });
		expect(computePlacement({ modules: LADDER, diagnosis: diag }).unlockedSlugs).toEqual([
			"f1-python-1",
			"f2-python-2",
			"f3-dane-python",
			"m-pandas",
		]);
		const surowy = computePlacement({ modules: LADDER, diagnosis: diag, threshold: 4 });
		expect(surowy.unlockedSlugs).toEqual([]);
		expect(surowy.threshold).toBe(4);
		expect(surowy.blockingHoleSlug).toBe("f1-python-1");
	});

	it("przy progu 4 moduł na poziomie 4 jest graniczny → pełne wsparcie", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4 }),
			threshold: 4,
		});
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.supportMode).toBe("full");
	});

	it("obniżenie progu do 2 odblokowuje więcej — próg naprawdę steruje regułą", () => {
		const diag = diagnosis({ "ds-python": 2, "ds-pandas": 2, "ds-eda": 1 });
		expect(computePlacement({ modules: LADDER, diagnosis: diag }).unlockedSlugs).toEqual([]);
		expect(
			computePlacement({ modules: LADDER, diagnosis: diag, threshold: 2 }).unlockedSlugs,
		).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
	});

	it("próg spoza skali 1–4 → wyjątek (fail-closed na konfiguracji)", () => {
		expect(() =>
			computePlacement({
				modules: LADDER,
				diagnosis: diagnosis({}),
				threshold: 5 as CompetencyLevel,
			}),
		).toThrow(/Próg musi być/);
	});

	it("isQualifyingLevel — brak poziomu nigdy nie kwalifikuje", () => {
		expect(isQualifyingLevel(null)).toBe(false);
		expect(isQualifyingLevel(undefined)).toBe(false);
		expect(isQualifyingLevel(2)).toBe(false);
		expect(isQualifyingLevel(3)).toBe(true);
		expect(isQualifyingLevel(3, 4)).toBe(false);
		expect(isQualifyingLevel(4, 4)).toBe(true);
	});
});

describe("computePlacement — niezmienniki i czystość", () => {
	it("nie mutuje wejścia i toleruje nieposortowaną drabinę", () => {
		const shuffled = [...LADDER].reverse();
		const snapshot = JSON.stringify(shuffled);
		const out = computePlacement({
			modules: shuffled,
			diagnosis: diagnosis({ "ds-python": 3, "ds-pandas": 3 }),
		});
		expect(JSON.stringify(shuffled)).toBe(snapshot);
		expect(out.modules.map((m) => m.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
	});

	it("dwa wywołania z tym samym wejściem dają identyczny wynik (determinizm)", () => {
		const diag = diagnosis({ "ds-python": 3, "ds-pandas": 4, "ds-eda": 3, "ds-sql": 2 });
		expect(computePlacement({ modules: LADDER, diagnosis: diag })).toEqual(
			computePlacement({ modules: LADDER, diagnosis: diag }),
		);
	});

	it("powtórzona pozycja w drabinie → wyjątek zamiast niejednoznacznego prefiksu", () => {
		const zepsuta = [...LADDER, { slug: "duplikat", position: 5, diagnosticConceptSlug: null }];
		expect(() => computePlacement({ modules: zepsuta, diagnosis: null })).toThrow(
			/powtórzone pozycje/,
		);
	});
});

describe("computePlacement — równoważność z deklaratywnym brzmieniem reguł 1–6", () => {
	// 5 stanów per tag (brak pomiaru / 1 / 2 / 3 / 4) × 6 tagów = 15 625 kombinacji.
	const STANY: Array<CompetencyLevel | undefined> = [undefined, 1, 2, 3, 4];

	for (const threshold of [3, 4] as CompetencyLevel[]) {
		it(`wyczerpująco: 15 625 wyników diagnozy, próg ${threshold}`, () => {
			let sprawdzone = 0;
			const rozbieznosci: string[] = [];
			for (let kod = 0; kod < 5 ** TAGS.length; kod++) {
				const levels: Partial<Record<string, CompetencyLevel>> = {};
				let reszta = kod;
				for (const tag of TAGS) {
					const stan = STANY[reszta % 5];
					reszta = Math.floor(reszta / 5);
					if (stan !== undefined) levels[tag] = stan;
				}
				const diag = diagnosis(levels);
				// C2 (przegląd Leo): porównujemy TRZY pola miernika naraz, nie samą
				// listę odblokowań — `blockingHoleSlug` i `supportMode` od v0.3 są
				// polami, które L3 utrwala i których nie da się odtworzyć wstecz.
				const oczekiwane = {
					unlocked: referenceUnlocked(LADDER, diag, threshold),
					hole: referenceHole(LADDER, diag, threshold),
					support: referenceSupport(LADDER, diag, threshold),
				};
				const out = computePlacement({ modules: LADDER, diagnosis: diag, threshold });
				const otrzymane = {
					unlocked: out.unlockedSlugs,
					hole: out.blockingHoleSlug,
					support: Object.fromEntries(out.modules.map((m) => [m.slug, m.supportMode])),
				};
				sprawdzone++;
				if (JSON.stringify(oczekiwane) !== JSON.stringify(otrzymane)) {
					rozbieznosci.push(
						`${JSON.stringify(levels)}: ref=${JSON.stringify(oczekiwane)} impl=${JSON.stringify(otrzymane)}`,
					);
				}
			}
			expect(rozbieznosci).toEqual([]);
			expect(sprawdzone).toBe(15625);
		});
	}

	it("niezmiennik: żaden otagowany moduł WEWNĄTRZ prefiksu nie jest niekwalifikujący się", () => {
		for (let kod = 0; kod < 5 ** TAGS.length; kod += 7) {
			const levels: Partial<Record<string, CompetencyLevel>> = {};
			let reszta = kod;
			for (const tag of TAGS) {
				const stan = STANY[reszta % 5];
				reszta = Math.floor(reszta / 5);
				if (stan !== undefined) levels[tag] = stan;
			}
			const out = computePlacement({ modules: LADDER, diagnosis: diagnosis(levels) });
			for (const m of out.modules) {
				if (m.unlocked && m.conceptSlug !== null) {
					expect(m.qualifies).toBe(true);
				}
				// Korzeń nigdy nie jest odblokowany, przy żadnym wyniku (reguła 6).
				if (m.position === 1) expect(m.unlocked).toBe(false);
			}
		}
	});
});
