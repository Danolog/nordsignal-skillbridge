/**
 * 1E.3 · P5 — routing atomów correctives (Mila 7.4 / 9.2 / 7.3):
 *  - atom z moduleSlug → link do trasy-resolvera (slug→UUID),
 *  - atom osierocony (moduleSlug=null) → null (render bez linku, zero 404),
 *  - humanizacja slug-a konceptu (nigdy goły slug do studenta).
 */

import { describe, expect, it } from "vitest";
import type { CorrectivesAtom } from "@/lib/assessment/correctives";
import { humanizeConceptSlug, resolveAtomHref } from "../atom-href";

const atom = (over: Partial<CorrectivesAtom> = {}): CorrectivesAtom => ({
	slug: "f-string-teoria",
	title: "f-string i interpolacja",
	kind: "theory",
	moduleSlug: "l1-python",
	...over,
});

describe("resolveAtomHref", () => {
	it("buduje adres trasy-resolvera dla atomu z moduleSlug", () => {
		expect(resolveAtomHref(atom())).toBe("/curriculum/atom/l1-python/f-string-teoria");
	});

	it("zwraca null dla atomu osieroconego (moduleSlug=null) — render bez linku", () => {
		expect(resolveAtomHref(atom({ moduleSlug: null }))).toBeNull();
	});

	it("enkoduje segmenty adresu (obrona przed znakami specjalnymi)", () => {
		const href = resolveAtomHref(atom({ moduleSlug: "a b", slug: "c/d" }));
		expect(href).toBe("/curriculum/atom/a%20b/c%2Fd");
	});
});

describe("humanizeConceptSlug", () => {
	it("zamienia myślniki/podkreślenia na spacje i kapitalizuje", () => {
		expect(humanizeConceptSlug("fstring-formatting")).toBe("Fstring formatting");
		expect(humanizeConceptSlug("if_else_branch")).toBe("If else branch");
	});

	it("nie wywala się na pustym stringu", () => {
		expect(humanizeConceptSlug("")).toBe("");
	});
});

// Blok „atomKindLabel" usunięty razem z funkcją (przegląd #291). Nazwy rodzajów
// pozycji mają jeden nośnik — `itemKindLabel` — i jedno miejsce asercji:
// `tests/unit/ds/jezyk-produktu.contract.test.ts` (A2, wszystkie rodzaje naraz).
// Render wiersza correctives z tą nazwą pilnuje `exam/__tests__/correctives-panel.test.tsx`.
