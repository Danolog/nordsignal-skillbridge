// ============================================================================
// 1E.3 (ADR-014 D3) — testy silnika egzaminu modułowego (mastery gate).
// Rdzeń P3 na banku SYNTETYCZNYM (plan 1E.3: „kod testujemy na banku
// syntetycznym, C1 nie blokuje BUDOWY").
//
// Pokrycie DoD: ocena (zdał ≤1/15, oblał przy 2), wybór wariantu (A→B, cap 2),
// konsumpcja examConfigJson, serwer NIE wypuszcza `correct`.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
	buildExamPlan,
	buildExamQuestionPayload,
	clampAttempt,
	EXAM_MAX_ATTEMPTS,
	type ExamBank,
	type ExamSessionAnswer,
	type ExamVariant,
	expectedExamPosition,
	gradeExam,
	pickExamVariant,
	resolveVariant,
} from "../exam";

/** Bank syntetyczny: 15 slotów × 2 warianty (A/B), koncepty po 3 na koncept. */
const CONCEPTS = ["c-typy", "c-wyr", "c-fstr", "c-bool", "c-if"] as const;
function syntheticBank(): ExamBank {
	const slots = Array.from({ length: 15 }, (_, i) => {
		const n = i + 1;
		const slotRef = `e${n}`;
		const conceptSlug = CONCEPTS[Math.floor(i / 3)];
		return {
			slotRef,
			conceptSlug,
			variants: [
				{
					ref: `syn-${slotRef}-a`,
					variant: "A",
					itemId: `item-${slotRef}-a`,
					stem: `Pytanie ${slotRef} wariant A?`,
					options: ["opcja0", "opcja1", "opcja2", "opcja3"],
					correct: 1,
					feedbackMd: `feedback ${slotRef}`,
				},
				{
					ref: `syn-${slotRef}-b`,
					variant: "B",
					itemId: `item-${slotRef}-b`,
					stem: `Pytanie ${slotRef} wariant B?`,
					options: ["opcja0", "opcja1", "opcja2", "opcja3"],
					correct: 2,
					feedbackMd: `feedback ${slotRef}`,
				},
			],
		};
	});
	return { moduleSlug: "syn-mod", slots };
}

const CONFIG = { questionCount: 15, maxErrors: 1 };

/** Buduje odpowiedzi z listy pozycji błędnych (reszta poprawna). */
function answersWithErrors(planLen: number, wrongPositions: number[]): ExamSessionAnswer[] {
	const wrong = new Set(wrongPositions);
	return Array.from({ length: planLen }, (_, position) => ({
		position,
		isCorrect: !wrong.has(position),
	}));
}

describe("buildExamPlan — plan liniowy i konsumpcja examConfigJson", () => {
	it("15 pozycji, kolejne pozycje 0..14, koncepty zachowane", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "sesja-1");
		expect(plan.items).toHaveLength(15);
		expect(plan.items.map((i) => i.position)).toEqual(Array.from({ length: 15 }, (_, i) => i));
		expect(plan.kind).toBe("module_exam");
	});

	it("zamraża questionCount i maxErrors z konfiguracji (M10: licznik, nie procent)", () => {
		const plan = buildExamPlan(syntheticBank(), { questionCount: 15, maxErrors: 1 }, "s");
		expect(plan.questionCount).toBe(15);
		expect(plan.maxErrors).toBe(1);
	});

	it("determinizm: ten sam seed → ten sam plan (warianty i kolejność)", () => {
		const a = buildExamPlan(syntheticBank(), CONFIG, "stały-seed");
		const b = buildExamPlan(syntheticBank(), CONFIG, "stały-seed");
		expect(a.items).toEqual(b.items);
	});
});

describe("pickExamVariant — wybór wariantu (A→B) i cap 2", () => {
	const vs = [
		{ ref: "x-a", variant: "A" },
		{ ref: "x-b", variant: "B" },
	];

	it("dla seeda 's0': 1. podejście = A, retry = B", () => {
		expect(pickExamVariant(vs, "s0", "e1", 1)?.variant).toBe("A");
		expect(pickExamVariant(vs, "s0", "e1", 2)?.variant).toBe("B");
	});

	it("podejście 1 i 2 zawsze WYCZERPUJĄ oba warianty (izomorficzne A/B)", () => {
		for (const seed of ["s0", "s1", "abc", "exam", "sess-9"]) {
			const first = pickExamVariant(vs, seed, "e1", 1)?.variant;
			const second = pickExamVariant(vs, seed, "e1", 2)?.variant;
			expect(first).not.toBe(second);
			expect([first, second].sort()).toEqual(["A", "B"]);
		}
	});

	it("cap 2: podejście 3 przycięte do 2 (żaden 3. wariant)", () => {
		expect(clampAttempt(3)).toBe(EXAM_MAX_ATTEMPTS);
		expect(clampAttempt(99)).toBe(2);
		expect(clampAttempt(0)).toBe(1);
		const v3 = pickExamVariant(vs, "s0", "e1", 3)?.variant;
		const v2 = pickExamVariant(vs, "s0", "e1", 2)?.variant;
		expect(v3).toBe(v2);
	});

	it("plan retry (attempt 2) wybiera INNE warianty niż plan podejścia 1", () => {
		const p1 = buildExamPlan(syntheticBank(), CONFIG, "seed", 1);
		const p2 = buildExamPlan(syntheticBank(), CONFIG, "seed", 2);
		expect(p2.attempt).toBe(2);
		for (let i = 0; i < p1.items.length; i++) {
			expect(p1.items[i].variantRef).not.toBe(p2.items[i].variantRef);
		}
	});
});

describe("gradeExam — próg = licznik błędów (≤1/15 zdał, 2 oblał)", () => {
	const plan = buildExamPlan(syntheticBank(), CONFIG, "grade-seed");

	it("0 błędów → zdał", () => {
		const out = gradeExam(plan, answersWithErrors(15, []));
		expect(out?.passed).toBe(true);
		expect(out?.errorCount).toBe(0);
		expect(out?.correctCount).toBe(15);
	});

	it("dokładnie 1 błąd → zdał (≤ maxErrors=1, ≈93%)", () => {
		const out = gradeExam(plan, answersWithErrors(15, [4]));
		expect(out?.passed).toBe(true);
		expect(out?.errorCount).toBe(1);
	});

	it("2 błędy → oblał", () => {
		const out = gradeExam(plan, answersWithErrors(15, [4, 9]));
		expect(out?.passed).toBe(false);
		expect(out?.errorCount).toBe(2);
	});

	it("failedConcepts = distinct koncepty błędnych slotów (wsad correctives P4)", () => {
		// pozycje 0,1 → c-typy; pozycja 6 → c-fstr (e7). Distinct, stabilna kolejność.
		const out = gradeExam(plan, answersWithErrors(15, [0, 1, 6]));
		expect(out?.failedConcepts).toEqual(["c-typy", "c-fstr"]);
	});

	it("niekompletny egzamin → null (complete odrzuci jako 422)", () => {
		const partial: ExamSessionAnswer[] = [{ position: 0, isCorrect: true }];
		expect(gradeExam(plan, partial)).toBeNull();
	});
});

describe("gradeExam — sygnał correctives (tylko flaga, mechanizm P4)", () => {
	it("oblany na OSTATNIM podejściu (attempt 2) → correctives=true", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "s", 2);
		const out = gradeExam(plan, answersWithErrors(15, [1, 2, 3]));
		expect(out?.passed).toBe(false);
		expect(out?.correctives).toBe(true);
	});

	it("oblany na 1. podejściu (są jeszcze podejścia) → correctives=false", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "s", 1);
		const out = gradeExam(plan, answersWithErrors(15, [1, 2, 3]));
		expect(out?.passed).toBe(false);
		expect(out?.correctives).toBe(false);
	});

	it("zdany → correctives=false niezależnie od podejścia", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "s", 2);
		const out = gradeExam(plan, answersWithErrors(15, []));
		expect(out?.correctives).toBe(false);
	});
});

describe("expectedExamPosition — kolejność liniowa", () => {
	const plan = buildExamPlan(syntheticBank(), CONFIG, "lin");
	it("brak odpowiedzi → pozycja 0", () => {
		expect(expectedExamPosition(plan, [])?.position).toBe(0);
	});
	it("3 odpowiedzi → pozycja 3", () => {
		const ans = answersWithErrors(3, []);
		expect(expectedExamPosition(plan, ans)?.position).toBe(3);
	});
	it("komplet → null (gotowe do complete)", () => {
		expect(expectedExamPosition(plan, answersWithErrors(15, []))).toBeNull();
	});
});

describe("buildExamQuestionPayload — serwer NIE wypuszcza correct ani feedbacku", () => {
	const bank = syntheticBank();
	const plan = buildExamPlan(bank, CONFIG, "payload-seed");

	it("payload ma stem+opcje, NIE MA correct/feedbackMd/itemId", () => {
		const item = plan.items[0];
		const variant = resolveVariant(bank, item.variantRef);
		expect(variant).not.toBeNull();
		const payload = buildExamQuestionPayload(
			variant as NonNullable<typeof variant>,
			item.slotRef,
			item.position,
			plan.items.length,
		);
		expect(payload.stem).toContain("Pytanie");
		expect(payload.options).toHaveLength(4);
		expect(Object.keys(payload)).not.toContain("correct");
		expect(Object.keys(payload)).not.toContain("feedbackMd");
		expect(Object.keys(payload)).not.toContain("itemId");
		// Kontrola twarda po serializacji (to, co realnie leci do klienta).
		const wire = JSON.parse(JSON.stringify(payload));
		expect(wire.correct).toBeUndefined();
		expect(wire.feedbackMd).toBeUndefined();
	});

	it("zamrożony plan (plan_json, student MA SELECT) niesie TYLKO refy — zero klucza", () => {
		const wire = JSON.parse(JSON.stringify(plan));
		for (const item of wire.items) {
			expect(Object.keys(item).sort()).toEqual(
				["conceptSlug", "position", "slotRef", "variantRef"].sort(),
			);
			expect(item.correct).toBeUndefined();
			expect(item.stem).toBeUndefined();
			expect(item.options).toBeUndefined();
		}
	});
});

// ============================================================================
// P1 ADWERSARYJNIE — klucz NIGDY nie opuszcza serwera (mutacja payloadu/planu).
// Reguła QA: guard = ta sama funkcja w asercji i w mutacji. Zmuszamy payload do
// wycieku (podajemy zatruty wariant / surowy wiersz question_items) i WYMAGAMY,
// żeby wynik po serializacji nadal był wyłącznie allowlistą {slotRef, stem,
// options, position, total}. Wpadka, którą to łapie: refaktor
// buildExamQuestionPayload na `{ ...variant, position, total }` (spread) — klucz
// `correct` i `feedbackMd` przeciekłyby do klienta, a student brute-force'owałby
// bramkę mastery. Istniejący test sprawdzał tylko 2–3 pola; tu wymuszamy PEŁNĄ,
// dokładną allowlistę + odrzucenie pól udających surowy wiersz banku.
// ============================================================================
describe("P1 adwersaryjnie — payload pytania to DOKŁADNA allowlista (bez klucza)", () => {
	/** Zatruty wariant: pełny klucz + pola udające surowy wiersz `question_items`. */
	function poisonedVariant(): ExamVariant {
		return {
			ref: "poison-e1-a",
			variant: "A",
			itemId: "item-poison",
			stem: "Które zdanie jest prawdziwe?",
			options: ["o0", "o1", "o2", "o3"],
			correct: 3,
			feedbackMd: "TAJNY feedback po ocenie",
			// Pola spoza ExamVariant udające surowy wiersz question_items (answer_json,
			// snake/camel warianty, indeks poprawnej pod inną nazwą). TS je odrzuca na
			// literale, więc wstrzykujemy przez cast — dokładnie tak, jak wyglądałby
			// przypadkowy zwrot surowego wiersza z DB.
			...({
				answer_json: { correct: 3 },
				answerJson: { correct: 3 },
				explanationMd: "pełne wyjaśnienie",
				optionFeedbackJson: [{ feedbackMd: "x" }],
				correctIndex: 3,
			} as Record<string, unknown>),
		} as unknown as ExamVariant;
	}

	it("wire payloadu = EXACT {options, position, slotRef, stem, total} — żaden zatruty klucz nie leci", () => {
		const payload = buildExamQuestionPayload(poisonedVariant(), "e1", 0, 15);
		const wire = JSON.parse(JSON.stringify(payload));
		// Dokładna allowlista po serializacji (to, co realnie leci drutem do klienta).
		expect(Object.keys(wire).sort()).toEqual(["options", "position", "slotRef", "stem", "total"]);
		// Jawnie: każde nośne pole klucza/feedbacku/DB NIEobecne.
		for (const leaked of [
			"correct",
			"correctIndex",
			"feedbackMd",
			"itemId",
			"answer_json",
			"answerJson",
			"explanationMd",
			"optionFeedbackJson",
			"variant",
			"ref",
		]) {
			expect(wire[leaked]).toBeUndefined();
		}
		// Klucz `correct=3` nie może wyciec ANI jako pole, ANI w treści serializatu.
		expect(JSON.stringify(wire)).not.toContain("correct");
		expect(JSON.stringify(wire)).not.toContain("feedback");
	});

	it("zamrożony plan po serializacji NIE zawiera treści pytania ani liczby poprawnej (skan całości)", () => {
		// Bank z jawnie rozpoznawalnymi markerami treści i sentinelem klucza.
		const markerBank: ExamBank = {
			moduleSlug: "mrk-mod",
			slots: Array.from({ length: 15 }, (_, i) => {
				const slotRef = `e${i + 1}`;
				return {
					slotRef,
					conceptSlug: "c-mrk",
					variants: [
						{
							ref: `mrk-${slotRef}-a`,
							variant: "A",
							itemId: `it-${slotRef}-a`,
							stem: `SEKRET_STEM_${slotRef}`,
							options: ["SEKRET_OPT_0", "SEKRET_OPT_1", "SEKRET_OPT_2", "SEKRET_OPT_3"],
							correct: 3,
							feedbackMd: "SEKRET_FEEDBACK",
						},
						{
							ref: `mrk-${slotRef}-b`,
							variant: "B",
							itemId: `it-${slotRef}-b`,
							stem: `SEKRET_STEM_${slotRef}_B`,
							options: ["SEKRET_OPT_0", "SEKRET_OPT_1", "SEKRET_OPT_2", "SEKRET_OPT_3"],
							correct: 2,
							feedbackMd: "SEKRET_FEEDBACK",
						},
					],
				};
			}),
		};
		const plan = buildExamPlan(markerBank, CONFIG, "marker-seed");
		const wire = JSON.stringify(JSON.parse(JSON.stringify(plan)));
		// Ani treść pytania, ani opcji, ani feedbacku, ani pola `correct` w planie.
		expect(wire).not.toContain("SEKRET_STEM");
		expect(wire).not.toContain("SEKRET_OPT");
		expect(wire).not.toContain("SEKRET_FEEDBACK");
		expect(wire).not.toContain('"correct"');
	});
});

// ============================================================================
// P3 ADWERSARYJNIE — oceny nie da się oszukać ani „zdać domyślnie".
// ============================================================================
describe("P3 adwersaryjnie — próg to LICZNIK z planu, egzamin nie zdaje się domyślnie", () => {
	it("maxErrors czytany z PLANU (nie hardkod 1): 2 błędy zdają przy maxErrors=2, oblewają przy 1", () => {
		const planTolerant = buildExamPlan(syntheticBank(), { questionCount: 15, maxErrors: 2 }, "s");
		const planStrict = buildExamPlan(syntheticBank(), { questionCount: 15, maxErrors: 1 }, "s");
		const twoErrors = answersWithErrors(15, [3, 8]);
		expect(gradeExam(planTolerant, twoErrors)?.passed).toBe(true);
		expect(gradeExam(planStrict, twoErrors)?.passed).toBe(false);
	});

	it("komplet co do LICZBY, ale z DZIURĄ w pokryciu pozycji → null (nie „zdał na 14/15”)", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "hole");
		// 15 odpowiedzi (length OK), ale pozycja 0 zdublowana, brak pozycji 14.
		const holed: ExamSessionAnswer[] = [
			{ position: 0, isCorrect: true },
			...Array.from({ length: 14 }, (_, i) => ({ position: i, isCorrect: true })),
		];
		expect(holed).toHaveLength(15);
		expect(gradeExam(plan, holed)).toBeNull();
	});

	it("nadmiar odpowiedzi (duplikaty pozycji) nie maskuje braku pokrycia → null", () => {
		const plan = buildExamPlan(syntheticBank(), CONFIG, "dup");
		const dup: ExamSessionAnswer[] = Array.from({ length: 20 }, (_, i) => ({
			position: Math.min(i, 10), // pozycje 11..14 nigdy nie pokryte
			isCorrect: true,
		}));
		expect(gradeExam(plan, dup)).toBeNull();
	});
});

// ============================================================================
// P3 ADWERSARYJNIE — anty-wyrocznia (sól = seed sesji). Dwaj studenci nie
// dostają tej samej kolejności wariantów w sposób przewidywalny. Wpadka, którą
// to łapi: usunięcie soli z pickExamVariant (start = 0 zawsze) — powtarzalny
// egzamin stałby się wyrocznią odpowiedzi (A zawsze na 1. podejściu).
// ============================================================================
describe("P3 anty-wyrocznia — sól seeda realnie miesza wybór wariantu", () => {
	const vs = [
		{ ref: "x-a", variant: "A" },
		{ ref: "x-b", variant: "B" },
	];

	it("na tym samym slocie 1. wariant NIE jest stały między sesjami (oba A i B padają)", () => {
		const seeds = Array.from({ length: 24 }, (_, i) => `sesja-${i}`);
		const firstPicks = new Set(seeds.map((s) => pickExamVariant(vs, s, "e1", 1)?.variant));
		expect(firstPicks).toEqual(new Set(["A", "B"]));
	});

	it("plan zależy od seeda: wiele sesji daje >1 różny układ wariantów (nie stały)", () => {
		// Odporne na kolizję pojedynczej pary seedów: sygnatura planu (sklejone
		// variantRef) po zestawie sesji ma >1 wartość → seed realnie miesza plan.
		const signatures = new Set(
			Array.from({ length: 24 }, (_, i) =>
				buildExamPlan(syntheticBank(), CONFIG, `sesja-${i}`)
					.items.map((it) => it.variantRef)
					.join("|"),
			),
		);
		expect(signatures.size).toBeGreaterThan(1);
	});

	it("cap 2 end-to-end: buildExamPlan(attempt=3) daje plan attempt=2 (żaden 3. wariant)", () => {
		const p3 = buildExamPlan(syntheticBank(), CONFIG, "seed", 3);
		const p2 = buildExamPlan(syntheticBank(), CONFIG, "seed", 2);
		expect(p3.attempt).toBe(EXAM_MAX_ATTEMPTS);
		expect(p3.items.map((i) => i.variantRef)).toEqual(p2.items.map((i) => i.variantRef));
	});
});
