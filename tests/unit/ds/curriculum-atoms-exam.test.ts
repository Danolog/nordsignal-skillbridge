/**
 * 1E.3 (ADR-014 D3) — dowód rozszerzenia walidatora treści o pozycję `exam`.
 *
 * `exam` to WSKAŹNIK konceptów modułu (mastery gate), nie atom z 3 pytaniami MC.
 * Walidator:
 *  - akceptuje `kind:"exam"` (dołożony do ITEM_KINDS obok theory/exercise/lab),
 *  - NIE wymusza „dokładnie 3 pytań" ani drabinki hintów na pozycji exam,
 *  - wymaga ≥1 zadeklarowanego konceptu (kręgosłup correctives),
 *  - ODRZUCA pytania inline i questionRefs na pozycji exam (bank kalibrowany
 *    osobno — C1).
 *
 * Zakres: WYŁĄCZNIE walidator (czysta logika, bez DB, bez treści). Żaden realny
 * plik treści nie używa `exam` — ten test pilnuje gałęzi gotowej na przyszłe
 * pozycje, nie zmiany danych.
 */

import { describe, expect, it } from "vitest";
import type {
	AtomItemInput,
	AtomModuleContent,
	AtomQuestionInput,
} from "../../../tools/content-curriculum-atoms";
import { validateModuleContent } from "../../../tools/content-curriculum-atoms";

const examItem = (overrides: Partial<AtomItemInput> = {}): AtomItemInput => ({
	slug: "m-test-egzamin",
	position: 1,
	kind: "exam",
	title: "Egzamin modułu testowego",
	contentMd: "Egzamin mastery — 15–20 pytań z konceptów modułu.",
	concepts: [{ slug: "koncept-a", name: "Koncept A" }],
	...overrides,
});

const moduleWith = (item: AtomItemInput): AtomModuleContent => ({
	moduleSlug: "m-test",
	items: [item],
});

// Minimalne pytanie inline — używane tylko po to, by sprawdzić, że exam je ODRZUCA.
const inlineQuestion: AtomQuestionInput = {
	ref: "m-test-q1",
	conceptSlug: "koncept-a",
	difficulty: 1,
	type: "single_choice",
	stem: "Pytanie kontrolne do testu gałęzi exam.",
	options: ["a", "b", "c"],
	answer: { correct: 0 },
	explanationMd: "Wyjaśnienie.",
};

describe("1E.3 · walidator treści — pozycja exam", () => {
	it("akceptuje kind='exam' (dołożony do ITEM_KINDS) z zadeklarowanym konceptem", () => {
		expect(validateModuleContent(moduleWith(examItem()))).toEqual([]);
	});

	it("NIE wymusza pytań ani drabinki hintów na pozycji exam (inaczej niż exercise/theory)", () => {
		const problems = validateModuleContent(moduleWith(examItem()));
		expect(problems.some((p) => p.includes("wymaga pytań"))).toBe(false);
		expect(problems.some((p) => p.includes("drabinka hintów"))).toBe(false);
		expect(problems.some((p) => p.includes("DOKŁADNIE 3"))).toBe(false);
	});

	it("ODRZUCA exam bez zadeklarowanego konceptu (kręgosłup correctives)", () => {
		const problems = validateModuleContent(moduleWith(examItem({ concepts: [] })));
		expect(problems.some((p) => p.includes("musi deklarować ≥1 koncept"))).toBe(true);
	});

	it("ODRZUCA pytania inline na pozycji exam (bank kalibrowany osobno — C1)", () => {
		const problems = validateModuleContent(moduleWith(examItem({ questions: [inlineQuestion] })));
		expect(problems.some((p) => p.includes("nie zawiera pytań inline"))).toBe(true);
	});

	it("ODRZUCA questionRefs na pozycji exam (pytania z banku, nie reuse pozycji)", () => {
		const problems = validateModuleContent(moduleWith(examItem({ questionRefs: ["f1-1-p1"] })));
		expect(problems.some((p) => p.includes("nie używa questionRefs"))).toBe(true);
	});

	it("nieznany kind nadal odrzucany — komunikat wymienia exam w dozwolonych", () => {
		const problems = validateModuleContent(moduleWith(examItem({ kind: "quiz" })));
		expect(problems.some((p) => p.includes("theory|exercise|lab|exam"))).toBe(true);
	});
});
