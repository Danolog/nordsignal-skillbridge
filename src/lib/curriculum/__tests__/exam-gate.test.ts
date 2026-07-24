/**
 * 1E.3 · P5 — derywacja pod-stanu bramki egzaminu (Mila 3.2 + Sophia D6.1):
 *  - brak egzaminu → none,
 *  - verified (exam/test_out) wygrywa nad wszystkim (E4),
 *  - S-C (correctives, nieodbyte) PRZED E3 (po 2. oblaniu pozycje też zrobione),
 *  - E3 (wszystkie pozycje) przed E1 (test-out),
 *  - correctivesResolved=true zdejmuje S-C (świeży cykl → gate).
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
	lastExam: null,
	correctivesResolved: null,
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

	it("correctives_in_progress (S-C), gdy oblany cap-2 z paczką i nieodbyte", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				lastExam: { passed: false, correctives: true, pkg },
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
				lastExam: { passed: false, correctives: true, pkg },
			}),
		);
		expect(view.kind).not.toBe("gate");
	});

	it("correctivesResolved=true zdejmuje S-C → gate (świeży cykl)", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				lastExam: { passed: false, correctives: true, pkg },
				correctivesResolved: true,
			}),
		);
		expect(view.kind).toBe("gate");
	});

	it("oblany PRZED cap-2 (correctives=false) nie wchodzi w S-C", () => {
		const view = deriveExamGate(
			base({
				completedItems: 5,
				itemCount: 5,
				lastExam: { passed: false, correctives: false, pkg: null },
			}),
		);
		expect(view.kind).toBe("gate");
	});
});
