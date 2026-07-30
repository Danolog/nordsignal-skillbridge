// ============================================================================
// 1E.7 (SLICE L2 + L4) — testy reguły placementu (`src/lib/curriculum/placement.ts`).
//
// Kontrakt źródłowy: docs/product/decyzje-1e7-placement-v0.1.md (v0.4, Sophia),
// DECYZJA 2 (próg) + DECYZJA 5 (reguła prefiksowa) + §6 (przypadki brzegowe)
// + §6c (W-6 pominięcie modułu zaliczonego, W-7 zaliczony spełnia ciągłość).
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
// ── DOWÓD RÓWNOWAŻNOŚCI I JEGO NOWY WYMIAR (L4) ────────────────────────────
// L2 dowodził równoważności implementacji (jeden przebieg w przód) z NIEZALEŻNĄ
// implementacją deklaratywną reguł 1–6 na wszystkich 5^6 = 15 625 kształtach
// wyniku diagnozy × 2 progi. W-7 dokłada do reguły TRZECI WYMIAR — zbiór
// modułów zaliczonych — więc dotychczasowy dowód przestałby pokrywać regułę.
// Pełny iloczyn na drabinie DS to 5^6 × 2^9 × 2 ≈ 16 mln porównań (nie mieści
// się w teście jednostkowym), więc dowód jest rozbity na TRZY przebiegi, których
// SUMA pokrywa każdy wymiar wyczerpująco:
//
//   S1 — drabina DS, WSZYSTKIE 15 625 kształtów diagnozy × 2 progi, zero
//        zaliczeń. Regresja dowodu L2 co do joty: W-7 niczego nie zmienił tam,
//        gdzie student nie ma nic zaliczonego.
//   S2 — drabina zastępcza o KOMPLETNEJ strukturze (korzeń, tag, NULL wewnątrz,
//        dwa tagi z rzędu, tag na końcu): PEŁNY ILOCZYN 5^4 kształtów × 2^6
//        podzbiorów zaliczeń × 2 progi = 80 000 porównań. Wyczerpujący dowód
//        w NOWYM wymiarze — każda kombinacja zaliczeń przeciw każdemu wynikowi.
//   S3 — drabina DS, WSZYSTKIE 2^9 = 512 podzbiorów zaliczeń × 25 kształtów
//        diagnozy dobranych pod przypadki graniczne × 2 progi. Nowy wymiar
//        wyczerpująco NA REALNEJ drabinie (S2 dowodzi reguły, S3 — drabiny).
//
// Referencja deklaratywna jest zaktualizowana o W-6/W-7 (`referenceUnlocked`) —
// bez tego porównywalibyśmy implementację z regułą, której już nie realizuje.
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

/**
 * Student bez ani jednego zaliczonego modułu. Nazwana stała zamiast `[]` w każdym
 * wywołaniu: pole jest WYMAGANE (bez wartości domyślnej), a przy przeglądzie ma
 * być widać, że golden testy L2 opisują stan „nic nie zaliczone" — nie że ktoś
 * zapomniał go podać.
 */
const BEZ_ZALICZEN: readonly string[] = [];

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

// ── Referencyjna implementacja reguł 1–6 + §6c (deklaratywna, niezależna od
// kodu produkcyjnego): k = max SPEŁNIAJĄCYCH (kwalifikacja z diagnozy ALBO
// zaliczenie — W-7), potem pętla cofania przed pierwszą dziurę + docięcie do
// ostatniego modułu potwierdzonego pomiarem. Na koniec W-6: z odblokowanych
// wypadają moduły zaliczone. ─────────────────────────────────────────────────
function referenceUnlocked(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
	completed: readonly string[] = BEZ_ZALICZEN,
): string[] {
	const ordered = [...modules].sort((a, b) => a.position - b.position);
	const rootPosition = ordered[0].position;
	const zaliczony = (m: PlacementLadderModule): boolean => completed.includes(m.slug);
	// „Spełnia" (ciągłość prefiksu) = kwalifikuje się z diagnozy LUB jest zaliczony.
	const satisfies = (m: PlacementLadderModule): boolean => {
		if (zaliczony(m)) return true;
		if (m.diagnosticConceptSlug === null || diag === null) return false;
		const level = diag.concepts[m.diagnosticConceptSlug]?.level;
		return level != null && level >= threshold;
	};
	// Moduł, który może WYZNACZYĆ k: potwierdzony własnym pomiarem (tag + próg)
	// albo zaliczony (pomiar mocniejszy). Moduł z NULL bez zaliczenia — nigdy.
	const wyznaczaK = (m: PlacementLadderModule): boolean =>
		zaliczony(m) || (m.diagnosticConceptSlug !== null && satisfies(m));
	const kandydaci = ordered.filter(wyznaczaK).map((m) => m.position);
	let k = kandydaci.length > 0 ? Math.max(...kandydaci) : 0;
	for (;;) {
		const hole = ordered.find(
			(m) =>
				m.position > rootPosition &&
				m.position <= k &&
				(m.diagnosticConceptSlug !== null || zaliczony(m)) &&
				!satisfies(m),
		);
		if (hole) {
			k = hole.position - 1;
			continue;
		}
		const deepestOwn = kandydaci.filter((p) => p <= k);
		const trimmed = deepestOwn.length > 0 ? Math.max(...deepestOwn) : 0;
		if (trimmed < k) {
			k = trimmed;
			continue;
		}
		break;
	}
	return ordered
		.filter((m) => m.position > rootPosition && m.position <= k && !zaliczony(m))
		.map((m) => m.slug);
}

// ── Referencja pozostałych pól MIERNIKA (C2 przeglądu Leo) ────────────────────
// Od v0.3 `blockingHoleSlug` i `supportMode` NIE są ozdobą werdyktu, tylko
// polami miernika trafności progu (DECYZJA 2): pierwsze jest JEDYNYM źródłem
// danych o studencie NIEDOSZACOWANYM (przechodzi moduł, którego nie
// potrzebował, i nic nie zgłasza), drugie mówi, czy mitygacja „pełne wsparcie
// przy poziomie granicznym" cokolwiek zmienia. Skoro L3 utrwala je w bazie
// i nie da się ich odtworzyć wstecz, muszą wejść do WYCZERPUJĄCEGO porównania,
// a nie zostać na kilku golden-przypadkach.

/**
 * Dziura ucinająca prefiks: pierwszy moduł poza korzeniem, który podlega ocenie
 * (otagowany albo zaliczony) i NIE spełnia warunku. Moduł zaliczony nigdy nie
 * jest dziurą (W-7) — to sedno poprawki.
 */
function referenceHole(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
	completed: readonly string[] = BEZ_ZALICZEN,
): string | null {
	const ordered = [...modules].sort((a, b) => a.position - b.position);
	const hole = ordered
		.slice(1)
		.find(
			(m) =>
				!completed.includes(m.slug) &&
				m.diagnosticConceptSlug !== null &&
				!isQualifyingLevel(diag?.concepts[m.diagnosticConceptSlug]?.level ?? null, threshold),
		);
	return hole?.slug ?? null;
}

/**
 * Tryb wsparcia per moduł WPROST z tabeli Sophii (v0.3, DECYZJA 2), liczony
 * z wejścia — nie z werdyktu implementacji:
 *   • moduł nieodblokowany (w tym ZALICZONY — W-6) → null,
 *   • odblokowany na WŁASNYM pomiarze: poziom == próg → 'full', wyżej → 'fading',
 *   • odblokowany bez własnego pomiaru (wciągnięty prefiksem) → 'full'.
 */
function referenceSupport(
	modules: readonly PlacementLadderModule[],
	diag: PlacementDiagnosis | null,
	threshold: CompetencyLevel,
	completed: readonly string[] = BEZ_ZALICZEN,
): Record<string, string | null> {
	const unlocked = new Set(referenceUnlocked(modules, diag, threshold, completed));
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
		const out = computePlacement({
			modules: LADDER,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({}),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.reason).toBe("no_measurement");
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.level).toBeNull();
	});

	it("brak sesji diagnozy (null) → zero odblokowań, start od l0-start (§6d)", () => {
		const out = computePlacement({
			modules: LADDER,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: null,
		});
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
			completedModuleSlugs: BEZ_ZALICZEN,
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
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({ "ds-python": 4 }, ["EDA"]),
		});
		expect(out.modules.find((m) => m.slug === "m-eda")?.reason).toBe("no_measurement");
	});

	it("wszystkie tagi NULL → nic odblokowane (NULL nigdy nie wyznacza k)", () => {
		const bezTagow = LADDER.map((m) => ({ ...m, diagnosticConceptSlug: null }));
		const out = computePlacement({
			modules: bezTagow,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis(Object.fromEntries(TAGS.map((t) => [t, 4 as CompetencyLevel]))),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.prefixEndPosition).toBe(0);
		expect(out.blockingHoleSlug).toBeNull();
	});

	it("poziom DOKŁADNIE na progu kwalifikuje i daje pełne wsparcie (DECYZJA 2)", () => {
		const out = computePlacement({
			modules: LADDER,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({ "ds-python": 3 }),
		});
		const f1 = out.modules.find((m) => m.slug === "f1-python-1");
		expect(f1?.unlocked).toBe(true);
		expect(f1?.reason).toBe("qualified");
		expect(f1?.supportMode).toBe("full");
		expect(out.threshold).toBe(DEFAULT_PLACEMENT_THRESHOLD);
	});

	it("poziom powyżej progu → tryb wygaszania wsparcia (fading)", () => {
		const out = computePlacement({
			modules: LADDER,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({ "ds-python": 4 }),
		});
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.supportMode).toBe("fading");
	});

	it("tag wskazujący koncept NIEOBECNY w wyniku diagnozy → brak pomiaru, nie poziom 0", () => {
		const zLewymTagiem = LADDER.map((m) =>
			m.slug === "m-pandas" ? { ...m, diagnosticConceptSlug: "ds-nie-ma-takiego" } : m,
		);
		const out = computePlacement({
			modules: zLewymTagiem,
			completedModuleSlugs: BEZ_ZALICZEN,
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
		const out = computePlacement({
			modules: [],
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({ "ds-python": 4 }),
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.alreadyCompletedSlugs).toEqual([]);
		expect(out.rootSlug).toBeNull();
		expect(out.modules).toEqual([]);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// §6c — MODUŁ ZALICZONY (W-6: pomijamy · W-7: spełnia ciągłość prefiksu)
// ═════════════════════════════════════════════════════════════════════════════
describe("computePlacement — §6c: moduł zaliczony (W-6 + W-7)", () => {
	it("W-7 SEDNO: zaliczony m-eda + słaby ds-eda → prefiks NIE ucina się na m-eda", () => {
		// Dokładny scenariusz z v0.4: student ZDAŁ m-eda egzaminem (≈90%), a przy
		// re-onboardingu wypadł na ds-eda słabo (2 pytania). Bez W-7 słaby instrument
		// unieważnia mocny i prefiks staje na 5, ucinając m-sql mimo wysokiego wyniku.
		const diag = diagnosis({
			"ds-python": 4,
			"ds-pandas": 4,
			"ds-eda": 1,
			"ds-sql": 4,
		});
		const bezW7 = computePlacement({
			modules: LADDER,
			diagnosis: diag,
			completedModuleSlugs: BEZ_ZALICZEN,
		});
		expect(bezW7.prefixEndPosition).toBe(5);
		expect(bezW7.unlockedSlugs).not.toContain("m-sql");

		const zW7 = computePlacement({
			modules: LADDER,
			diagnosis: diag,
			completedModuleSlugs: ["m-eda"],
		});
		expect(zW7.prefixEndPosition).toBe(7);
		// Dziura PRZESUNĘŁA SIĘ z m-eda (poz. 6) na m-ml (poz. 8) — prefiks stanął
		// dopiero na pierwszym module, którego student naprawdę nie potwierdził
		// niczym. Zaliczenie nie skasowało ochrony prefiksowej, tylko przesunęło ją
		// o dokładnie ten jeden moduł, który student ma zdany egzaminem.
		expect(zW7.blockingHoleSlug).toBe("m-ml");
		// m-sql wchodzi; m-eda NIE dostaje odblokowania (W-6), choć leży w prefiksie.
		expect(zW7.unlockedSlugs).toEqual([
			"f1-python-1",
			"f2-python-2",
			"f3-dane-python",
			"m-pandas",
			"m-sql",
		]);
		expect(zW7.alreadyCompletedSlugs).toEqual(["m-eda"]);
		expect(zW7.modules.find((m) => m.slug === "m-eda")?.reason).toBe("already_completed");
		expect(zW7.modules.find((m) => m.slug === "m-eda")?.unlocked).toBe(false);
	});

	it("W-6: zaliczony moduł, który normalnie by się odblokował, NIE dostaje wiersza ani wsparcia", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4, "ds-pandas": 4 }),
			completedModuleSlugs: ["f1-python-1"],
		});
		// f1 kwalifikuje się na własnym pomiarze (poziom 4), ale jest zaliczony:
		// zero wiersza, zero komunikatu, zero trybu wsparcia.
		const f1 = out.modules.find((m) => m.slug === "f1-python-1");
		expect(f1?.qualifies).toBe(true);
		expect(f1?.completed).toBe(true);
		expect(f1?.unlocked).toBe(false);
		expect(f1?.reason).toBe("already_completed");
		expect(f1?.supportMode).toBeNull();
		expect(out.unlockedSlugs).not.toContain("f1-python-1");
		// Reszta prefiksu bez zmian — zaliczenie niczego nie zabiera.
		expect(out.unlockedSlugs).toEqual(["f2-python-2", "f3-dane-python", "m-pandas"]);
	});

	it("zaliczony moduł ZA dziurą też ma powód 'already_completed' (§6c: student nie widzi nic)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 1 }),
			completedModuleSlugs: ["m-ml"],
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.modules.find((m) => m.slug === "m-ml")?.reason).toBe("already_completed");
		// Poza prefiksem → NIE liczy się jako „pominięty przez placement".
		expect(out.alreadyCompletedSlugs).toEqual([]);
	});

	it("zaliczenie NIE obchodzi dziury niżej: zaliczony m-eda + słaby ds-python → nadal nic", () => {
		// Ochrona prefiksowa zostaje nienaruszona. Zaliczenie mówi „ten moduł umiesz",
		// nie „wszystko pod nim też" — dziura na pozycji 2 dalej cofa prefiks do zera.
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 1, "ds-pandas": 1, "ds-sql": 4 }),
			completedModuleSlugs: ["m-eda"],
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.blockingHoleSlug).toBe("f1-python-1");
	});

	it("zaliczony moduł WYZNACZA k (dowód mocniejszy niż diagnoza) i wciąga moduły NULL", () => {
		// Student zdał m-pandas przez „test out" (≈90%), diagnoza dała tylko Pythona.
		// F2/F3 (tag NULL) jadą z prefiksem na dowodzie POŚREDNIM — dokładnie ta sama
		// logika co w DECYZJI 4 („kto robi merge, ten umie pętle"), tyle że oparta
		// na instrumencie mocniejszym niż dwa pytania.
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 3 }),
			completedModuleSlugs: ["m-pandas"],
		});
		expect(out.prefixEndPosition).toBe(5);
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python"]);
		expect(out.alreadyCompletedSlugs).toEqual(["m-pandas"]);
	});

	it("zaliczenie modułu spoza drabiny jest ignorowane (bez wyjątku)", () => {
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis({ "ds-python": 4 }),
			completedModuleSlugs: ["modul-z-innej-sciezki"],
		});
		expect(out.unlockedSlugs).toEqual(["f1-python-1"]);
		expect(out.alreadyCompletedSlugs).toEqual([]);
	});

	it("cała drabina zaliczona → zero odblokowań, ale alreadyCompleted NIEZEROWE", () => {
		// Miernik MUSI odróżnić ten stan od „placement nic nie otworzył, bo student
		// nic nie umie": obie sesje mają zero odblokowań i przeciwne znaczenie.
		const wszystkie = LADDER.filter((m) => m.position > 1).map((m) => m.slug);
		const out = computePlacement({
			modules: LADDER,
			diagnosis: diagnosis(Object.fromEntries(TAGS.map((t) => [t, 4 as CompetencyLevel]))),
			completedModuleSlugs: wszystkie,
		});
		expect(out.unlockedSlugs).toEqual([]);
		expect(out.alreadyCompletedSlugs).toEqual(wszystkie);
		expect(out.prefixEndPosition).toBe(9);
	});
});

describe("computePlacement — próg jako parametr (DECYZJA 2, miernik z progiem alarmowym)", () => {
	it("podniesienie progu do 4 odbiera kwalifikację poziomowi 3", () => {
		const diag = diagnosis({ "ds-python": 3, "ds-pandas": 4 });
		expect(
			computePlacement({ modules: LADDER, diagnosis: diag, completedModuleSlugs: BEZ_ZALICZEN })
				.unlockedSlugs,
		).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
		const surowy = computePlacement({
			modules: LADDER,
			diagnosis: diag,
			completedModuleSlugs: BEZ_ZALICZEN,
			threshold: 4,
		});
		expect(surowy.unlockedSlugs).toEqual([]);
		expect(surowy.threshold).toBe(4);
		expect(surowy.blockingHoleSlug).toBe("f1-python-1");
	});

	it("przy progu 4 moduł na poziomie 4 jest graniczny → pełne wsparcie", () => {
		const out = computePlacement({
			modules: LADDER,
			completedModuleSlugs: BEZ_ZALICZEN,
			diagnosis: diagnosis({ "ds-python": 4 }),
			threshold: 4,
		});
		expect(out.modules.find((m) => m.slug === "f1-python-1")?.supportMode).toBe("full");
	});

	it("obniżenie progu do 2 odblokowuje więcej — próg naprawdę steruje regułą", () => {
		const diag = diagnosis({ "ds-python": 2, "ds-pandas": 2, "ds-eda": 1 });
		expect(
			computePlacement({ modules: LADDER, diagnosis: diag, completedModuleSlugs: BEZ_ZALICZEN })
				.unlockedSlugs,
		).toEqual([]);
		expect(
			computePlacement({
				modules: LADDER,
				diagnosis: diag,
				completedModuleSlugs: BEZ_ZALICZEN,
				threshold: 2,
			}).unlockedSlugs,
		).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
	});

	it("próg spoza skali 1–4 → wyjątek (fail-closed na konfiguracji)", () => {
		expect(() =>
			computePlacement({
				modules: LADDER,
				diagnosis: diagnosis({}),
				completedModuleSlugs: BEZ_ZALICZEN,
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
		const zaliczenia = ["m-eda"];
		const zaliczeniaSnapshot = JSON.stringify(zaliczenia);
		const out = computePlacement({
			modules: shuffled,
			completedModuleSlugs: zaliczenia,
			diagnosis: diagnosis({ "ds-python": 3, "ds-pandas": 3 }),
		});
		expect(JSON.stringify(shuffled)).toBe(snapshot);
		expect(JSON.stringify(zaliczenia)).toBe(zaliczeniaSnapshot);
		expect(out.modules.map((m) => m.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(out.unlockedSlugs).toEqual(["f1-python-1", "f2-python-2", "f3-dane-python", "m-pandas"]);
	});

	it("dwa wywołania z tym samym wejściem dają identyczny wynik (determinizm)", () => {
		const diag = diagnosis({ "ds-python": 3, "ds-pandas": 4, "ds-eda": 3, "ds-sql": 2 });
		const args = { modules: LADDER, diagnosis: diag, completedModuleSlugs: ["m-eda"] };
		expect(computePlacement(args)).toEqual(computePlacement(args));
	});

	it("powtórzona pozycja w drabinie → wyjątek zamiast niejednoznacznego prefiksu", () => {
		const zepsuta = [...LADDER, { slug: "duplikat", position: 5, diagnosticConceptSlug: null }];
		expect(() =>
			computePlacement({ modules: zepsuta, diagnosis: null, completedModuleSlugs: BEZ_ZALICZEN }),
		).toThrow(/powtórzone pozycje/);
	});
});

describe("computePlacement — równoważność z deklaratywnym brzmieniem reguł 1–6 + §6c", () => {
	// 5 stanów per tag (brak pomiaru / 1 / 2 / 3 / 4).
	const STANY: Array<CompetencyLevel | undefined> = [undefined, 1, 2, 3, 4];

	/** Kształt diagnozy nr `kod` w systemie piątkowym po liście tagów. */
	function ksztaltDiagnozy(kod: number, tagi: readonly string[]): PlacementDiagnosis {
		const levels: Partial<Record<string, CompetencyLevel>> = {};
		let reszta = kod;
		for (const tag of tagi) {
			const stan = STANY[reszta % 5];
			reszta = Math.floor(reszta / 5);
			if (stan !== undefined) levels[tag] = stan;
		}
		return diagnosis(levels);
	}

	/** Podzbiór zaliczeń nr `maska` (bitowo po modułach drabiny). */
	function podzbiorZaliczen(maska: number, moduly: readonly PlacementLadderModule[]): string[] {
		return moduly.filter((_, i) => (maska >> i) & 1).map((m) => m.slug);
	}

	/** Jedno porównanie implementacji z referencją — trzy pola miernika naraz. */
	function porownaj(
		moduly: readonly PlacementLadderModule[],
		diag: PlacementDiagnosis,
		threshold: CompetencyLevel,
		completed: readonly string[],
	): string | null {
		const oczekiwane = {
			unlocked: referenceUnlocked(moduly, diag, threshold, completed),
			hole: referenceHole(moduly, diag, threshold, completed),
			support: referenceSupport(moduly, diag, threshold, completed),
		};
		const out = computePlacement({
			modules: moduly,
			diagnosis: diag,
			threshold,
			completedModuleSlugs: completed,
		});
		const otrzymane = {
			unlocked: out.unlockedSlugs,
			hole: out.blockingHoleSlug,
			support: Object.fromEntries(out.modules.map((m) => [m.slug, m.supportMode])),
		};
		return JSON.stringify(oczekiwane) === JSON.stringify(otrzymane)
			? null
			: `zaliczone=${JSON.stringify(completed)} diagnoza=${JSON.stringify(
					diag.concepts,
				)}: ref=${JSON.stringify(oczekiwane)} impl=${JSON.stringify(otrzymane)}`;
	}

	// ── S1: regresja dowodu L2 — cała przestrzeń diagnoz, zero zaliczeń ─────────
	for (const threshold of [3, 4] as CompetencyLevel[]) {
		it(`S1 wyczerpująco: 15 625 wyników diagnozy, próg ${threshold}, bez zaliczeń`, () => {
			let sprawdzone = 0;
			const rozbieznosci: string[] = [];
			for (let kod = 0; kod < 5 ** TAGS.length; kod++) {
				const r = porownaj(LADDER, ksztaltDiagnozy(kod, TAGS), threshold, BEZ_ZALICZEN);
				sprawdzone++;
				if (r) rozbieznosci.push(r);
			}
			expect(rozbieznosci).toEqual([]);
			expect(sprawdzone).toBe(15625);
		});
	}

	// ── S2: PEŁNY iloczyn (diagnoza × zaliczenia) na drabinie o kompletnej
	// strukturze. Sześć modułów, cztery tagi: korzeń bez tagu, tag, NULL wewnątrz,
	// trzy tagi z rzędu — każdy układ, na którym reguła może się wyłożyć. ────────
	const MALA_DRABINA: PlacementLadderModule[] = [
		{ slug: "s2-korzen", position: 1, diagnosticConceptSlug: null },
		{ slug: "s2-a", position: 2, diagnosticConceptSlug: "t-a", competencyName: "A" },
		{ slug: "s2-null", position: 3, diagnosticConceptSlug: null },
		{ slug: "s2-b", position: 4, diagnosticConceptSlug: "t-b", competencyName: "B" },
		{ slug: "s2-c", position: 5, diagnosticConceptSlug: "t-c", competencyName: "C" },
		{ slug: "s2-d", position: 6, diagnosticConceptSlug: "t-d", competencyName: "D" },
	];
	const MALE_TAGI = ["t-a", "t-b", "t-c", "t-d"] as const;

	for (const threshold of [3, 4] as CompetencyLevel[]) {
		it(`S2 wyczerpująco: 625 diagnoz × 64 podzbiory zaliczeń, próg ${threshold}`, () => {
			let sprawdzone = 0;
			const rozbieznosci: string[] = [];
			for (let maska = 0; maska < 2 ** MALA_DRABINA.length; maska++) {
				const completed = podzbiorZaliczen(maska, MALA_DRABINA);
				for (let kod = 0; kod < 5 ** MALE_TAGI.length; kod++) {
					const r = porownaj(MALA_DRABINA, ksztaltDiagnozy(kod, MALE_TAGI), threshold, completed);
					sprawdzone++;
					if (r) rozbieznosci.push(r);
				}
			}
			expect(rozbieznosci.slice(0, 5)).toEqual([]);
			expect(sprawdzone).toBe(40000);
		});
	}

	// ── S3: nowy wymiar WYCZERPUJĄCO na REALNEJ drabinie DS — wszystkie 512
	// podzbiorów zaliczeń przeciw kształtom diagnozy dobranym pod przypadki
	// graniczne (pełny iloczyn 5^6 × 2^9 nie mieści się w teście jednostkowym). ──
	const KSZTALTY_GRANICZNE: number[] = [
		0, // brak pomiarów w ogóle
		1,
		2,
		3,
		4, // sam ds-python: 1/2/3/4
		5 ** 5, // sam ds-llm (najgłębszy tag)
		...Array.from({ length: 44 }, (_, i) => (i * 823) % 5 ** TAGS.length),
	];

	for (const threshold of [3, 4] as CompetencyLevel[]) {
		it(`S3 wyczerpująco w NOWYM wymiarze: 512 podzbiorów zaliczeń × ${KSZTALTY_GRANICZNE.length} diagnoz, próg ${threshold}`, () => {
			let sprawdzone = 0;
			const rozbieznosci: string[] = [];
			for (let maska = 0; maska < 2 ** LADDER.length; maska++) {
				const completed = podzbiorZaliczen(maska, LADDER);
				for (const kod of KSZTALTY_GRANICZNE) {
					const r = porownaj(LADDER, ksztaltDiagnozy(kod, TAGS), threshold, completed);
					sprawdzone++;
					if (r) rozbieznosci.push(r);
				}
			}
			expect(rozbieznosci.slice(0, 5)).toEqual([]);
			expect(sprawdzone).toBe(512 * KSZTALTY_GRANICZNE.length);
		});
	}

	it("niezmienniki na przekroju obu wymiarów (prefiks, korzeń, W-6)", () => {
		for (let maska = 0; maska < 2 ** LADDER.length; maska += 3) {
			const completed = podzbiorZaliczen(maska, LADDER);
			for (let kod = 0; kod < 5 ** TAGS.length; kod += 337) {
				const out = computePlacement({
					modules: LADDER,
					diagnosis: ksztaltDiagnozy(kod, TAGS),
					completedModuleSlugs: completed,
				});
				for (const m of out.modules) {
					// Otagowany moduł WEWNĄTRZ prefiksu musi kwalifikować się własnym pomiarem…
					if (m.unlocked && m.conceptSlug !== null) expect(m.qualifies).toBe(true);
					// …korzeń nigdy nie jest odblokowany (reguła 6)…
					if (m.position === 1) expect(m.unlocked).toBe(false);
					// …a moduł ZALICZONY nigdy nie dostaje odblokowania (W-6, §6c).
					if (m.completed) {
						expect(m.unlocked).toBe(false);
						if (m.position > 1) expect(m.reason).toBe("already_completed");
					}
					// Moduł odblokowany ma zawsze powód, który nośnik L3 umie zapisać.
					if (m.unlocked) expect(["qualified", "carried_untagged"]).toContain(m.reason);
				}
				// Zbiory rozłączne: to, co placement otwiera, nigdy nie jest zaliczone.
				for (const slug of out.unlockedSlugs) expect(completed).not.toContain(slug);
			}
		}
	});
});
