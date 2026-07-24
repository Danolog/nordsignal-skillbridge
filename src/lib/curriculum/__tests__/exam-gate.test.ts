/**
 * 1E.3 · P5 — derywacja pod-stanu bramki egzaminu (Mila 3.2 + Sophia D6.1):
 *  - brak egzaminu → none,
 *  - verified (exam/test_out) wygrywa nad wszystkim (E4),
 *  - S-C (correctivesRequired, z paczką) PRZED E3 (po 2. oblaniu pozycje też zrobione),
 *  - E3 (wszystkie pozycje) przed E1 (test-out),
 *  - reset cyklu (correctivesRequired=false) zdejmuje S-C → gate.
 *
 * P4.5 (Sophia D4): wejście S-C to teraz `correctivesRequired` + `correctivesPackage`
 * z evaluateExamCycle (jedno źródło cyklu), a nie derywacja z ostatniej sesji.
 */

import { describe, expect, it } from "vitest";
import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import { deriveExamGate, type ExamGateInput } from "../exam-gate";

const pkg: CorrectivesPackage = {
	message: "Zabrakło Ci 1 pytania do zaliczenia — 2 koncepty do odświeżenia, ~15 min",
	concepts: [{ concept: "fstring", conceptName: "f-string", atoms: [] }],
};

const base = (over: Partial<ExamGateInput> = {}): ExamGateInput => ({
	hasExam: true,
	moduleStatus: "in_progress",
	completedItems: 0,
	itemCount: 5,
	verifiedByMethod: null,
	correctivesRequired: false,
	correctivesPackage: null,
	...over,
});

describe("deriveExamGate", () => {
	it("none, gdy moduł nie ma egzaminu", () => {
		expect(deriveExamGate(base({ hasExam: false })).kind).toBe("none");
	});

	it("verified (E4), gdy verifiedByMethod=exam", () => {
		expect(deriveExamGate(base({ verifiedByMethod: "exam" })).kind).toBe("verified");
	});

	it("verified (E4) także dla test_out", () => {
		expect(deriveExamGate(base({ verifiedByMethod: "test_out" })).kind).toBe("verified");
	});

	it("gate (E3), gdy wszystkie pozycje zrobione i egzamin nie zdany", () => {
		expect(deriveExamGate(base({ completedItems: 5, itemCount: 5 })).kind).toBe("gate");
	});

	it("test_out (E1), gdy available i 0 pozycji zrobionych", () => {
		expect(
			deriveExamGate(base({ moduleStatus: "available", completedItems: 0, itemCount: 5 })).kind,
		).toBe("test_out");
	});

	it("none dla stanu środkowego E2 (część pozycji zrobiona)", () => {
		expect(deriveExamGate(base({ completedItems: 2, itemCount: 5 })).kind).toBe("none");
	});

	it("correctives_in_progress (S-C), gdy correctivesRequired z paczką", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				correctivesRequired: true,
				correctivesPackage: pkg,
			}),
		);
		expect(view.kind).toBe("correctives_in_progress");
		if (view.kind === "correctives_in_progress") expect(view.pkg).toBe(pkg);
	});

	it("S-C wygrywa nad E3 (po 2. oblaniu pozycje też są zrobione)", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				correctivesRequired: true,
				correctivesPackage: pkg,
			}),
		);
		expect(view.kind).not.toBe("gate");
	});

	it("reset cyklu (correctivesRequired=false) zdejmuje S-C → gate (świeży cykl)", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				correctivesRequired: false,
				correctivesPackage: null,
			}),
		);
		expect(view.kind).toBe("gate");
	});

	it("correctivesRequired=true bez paczki NIE wchodzi w S-C (defensywnie → gate)", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				correctivesRequired: true,
				correctivesPackage: null,
			}),
		);
		expect(view.kind).toBe("gate");
	});
});
