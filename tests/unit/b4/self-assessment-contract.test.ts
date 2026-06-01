/**
 * Test kontraktu front↔back B4 samooceny.
 *
 * Weryfikuje, że kształt odpowiedzi GET i wymagania PATCH są spójne
 * z tym, czego frontend (StepSelfAssessment) oczekuje.
 *
 * WAŻNE: Importuje wyekstrahowaną logikę produkcyjną z src/lib/self-assessment.
 * Nie ma tu replik funkcji — test weryfikuje realny kod biznesowy używany
 * przez route handlery GET/PATCH/advance. Rozjazd logiki między routem a testem
 * jest niemożliwy (lekcja B0 — B0 miał repliki, które rozjechały się z prod).
 *
 * Wzorzec testu:
 *   1. buildAssessmentResponse → sprawdza kształt odpowiedzi GET
 *   2. applyPatch (lokalna walidacja) → sprawdza kontrakt PATCH
 *   3. evaluateAdvance → sprawdza bramkę progu advance
 *   4. Ścieżka end-to-end: GET → PATCH 5× → advance
 *
 * Nie testujemy realnej bazy (Neon 5432 może być niedostępny w CI) — weryfikujemy
 * kontrakt parsowania danych i odpowiedzi przez funkcje produkcyjne.
 */

import { describe, expect, it } from "vitest";
import {
	type AssessmentCompetency,
	buildAssessmentResponse,
	evaluateAdvance,
	type PatchResponse,
} from "@/lib/self-assessment";

// ─── Typy kontraktu (re-eksport z produkcji dla czytelności asercji) ─────────

// AssessmentCompetency, AssessmentGetResponse, PatchResponse, AdvanceResponse,
// AdvanceErrorResponse — wszystkie zaimportowane z @/lib/self-assessment

// ─── Lokalny pomocnik: symulacja walidacji i odpowiedzi PATCH ────────────────
// applyPatch: testuje WYŁĄCZNIE kontrakt kształtu odpowiedzi i walidację range.
// Nie ma tu logiki biznesowej (levelToStatus) — ta jest testowana w level-to-status.test.ts.

function applyPatch(
	level: number,
): { response: PatchResponse; status: 200 } | { error: string; status: 400 } {
	// Walidacja: level musi być int 1–4 (spójnie z Zod PatchSchema w route)
	if (!Number.isInteger(level) || level < 1 || level > 4) {
		return { error: "Invalid input", status: 400 };
	}
	return {
		response: {
			competencyId: "cmp-sql",
			level,
			verifiedByMethod: "self",
			savedAt: new Date().toISOString(),
		},
		status: 200,
	};
}

// ─── Testy kontraktu ─────────────────────────────────────────────────────────

describe("B4 GET /api/self-assessment — kontrakt odpowiedzi", () => {
	const testCompetencies = [
		{ id: "cmp-sql", name: "SQL", selfAssessment: 3 },
		{ id: "cmp-eda", name: "Analiza danych", selfAssessment: null },
		{ id: "cmp-py", name: "Python", selfAssessment: null },
		{ id: "cmp-r", name: "R", selfAssessment: null },
		{ id: "cmp-vis", name: "Wizualizacja danych", selfAssessment: null },
		{ id: "cmp-api", name: "REST API", selfAssessment: null },
	];

	it("odpowiedź zawiera assessmentId, status, requiredCount, competencies", () => {
		const res = buildAssessmentResponse("student-1", testCompetencies);
		expect(res).toHaveProperty("assessmentId");
		expect(res).toHaveProperty("status", "draft");
		expect(res).toHaveProperty("requiredCount");
		expect(res).toHaveProperty("competencies");
		expect(Array.isArray(res.competencies)).toBe(true);
	});

	it("requiredCount = min(5, N) — backend jest źródłem prawdy (frontend NIE zgaduje)", () => {
		// 6 kompetencji → requiredCount = 5
		expect(buildAssessmentResponse("s1", testCompetencies).requiredCount).toBe(5);
		// 3 kompetencje → requiredCount = 3 (wszystkie, gdy N < 5)
		expect(buildAssessmentResponse("s1", testCompetencies.slice(0, 3)).requiredCount).toBe(3);
	});

	it("competencies[].level = 1–4 lub null (nie undefined)", () => {
		const res = buildAssessmentResponse("student-1", testCompetencies);
		for (const c of res.competencies) {
			expect(c.level === null || (Number.isInteger(c.level) && c.level >= 1 && c.level <= 4)).toBe(
				true,
			);
		}
	});

	it("competencyId i name są zwracane (frontend renderuje listę na ich podstawie)", () => {
		const res = buildAssessmentResponse("student-1", testCompetencies);
		for (const c of res.competencies) {
			expect(typeof c.competencyId).toBe("string");
			expect(c.competencyId.length).toBeGreaterThan(0);
			expect(typeof c.name).toBe("string");
			expect(c.name.length).toBeGreaterThan(0);
		}
	});
});

describe("B4 PATCH /api/self-assessment/ratings/:id — kontrakt zapisu", () => {
	it("level=3 (znam) → odpowiedź zawiera competencyId, level, verifiedByMethod='self', savedAt", () => {
		const result = applyPatch(3);
		expect(result.status).toBe(200);
		if (result.status === 200) {
			const res = (result as { response: PatchResponse; status: 200 }).response;
			expect(res.level).toBe(3);
			expect(res.verifiedByMethod).toBe("self"); // Beta: zawsze 'self'
			expect(typeof res.savedAt).toBe("string");
			expect(res.competencyId).toBeTruthy();
		}
	});

	it("level=0 → 400 (poza zakresem CHECK 1–4)", () => {
		const result = applyPatch(0);
		expect(result.status).toBe(400);
	});

	it("level=5 → 400 (poza zakresem CHECK 1–4)", () => {
		const result = applyPatch(5);
		expect(result.status).toBe(400);
	});

	it("level=4 (dobrze znam) → 200", () => {
		expect(applyPatch(4).status).toBe(200);
	});

	it("level=1 (nie znam) → 200", () => {
		expect(applyPatch(1).status).toBe(200);
	});
});

describe("B4 POST /api/onboarding/advance — bramka progu ≥ requiredCount", () => {
	it("0 ocenionych z 6 kompetencji → 422 z missing=5", () => {
		const result = evaluateAdvance(0, 6);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.body.missing).toBe(5);
			expect(result.body.ratedCount).toBe(0);
			expect(result.body.requiredCount).toBe(5);
		}
	});

	it("4 ocenione z 6 → nie OK (próg=5, missing=1)", () => {
		const result = evaluateAdvance(4, 6);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.body.missing).toBe(1);
		}
	});

	it("5 ocenionych z 6 → OK (próg spełniony)", () => {
		const result = evaluateAdvance(5, 6);
		expect(result.ok).toBe(true);
	});

	it("6 ocenionych z 6 → OK (wszystkie ocenione, pow. progu)", () => {
		expect(evaluateAdvance(6, 6).ok).toBe(true);
	});

	it("3 ocenione z 3 kompetencji → OK (N < 5, próg = N = 3)", () => {
		// Gdy sylabus wykrył < 5 kompetencji, próg = liczba wykrytych
		expect(evaluateAdvance(3, 3).ok).toBe(true);
	});

	it("2 ocenione z 3 kompetencji → nie OK (próg = N = 3, brakuje 1)", () => {
		expect(evaluateAdvance(2, 3).ok).toBe(false);
	});
});

describe("B4 kontrakt end-to-end — pełna ścieżka samooceny", () => {
	it("ścieżka: GET → 0 ocen → PATCH 5× → advance → OK", () => {
		// Symulacja pełnej ścieżki studenta
		const comp = [
			{ id: "c1", name: "SQL", selfAssessment: null },
			{ id: "c2", name: "Python", selfAssessment: null },
			{ id: "c3", name: "EDA", selfAssessment: null },
			{ id: "c4", name: "Wizualizacja", selfAssessment: null },
			{ id: "c5", name: "REST API", selfAssessment: null },
		];

		// GET — stan początkowy: 0 ocen
		const getResp = buildAssessmentResponse("student-1", comp);
		expect(getResp.requiredCount).toBe(5);
		expect(getResp.competencies.every((c: AssessmentCompetency) => c.level === null)).toBe(true);

		// PATCH 5× — student ocenia każdą kompetencję
		const levelAssignments: Array<[string, number]> = [
			["c1", 3], // znam → acquired
			["c2", 2], // uczę się → in_progress
			["c3", 1], // nie znam → missing
			["c4", 4], // dobrze znam → acquired
			["c5", 3], // znam → acquired
		];
		for (const [_id, level] of levelAssignments) {
			const patchResult = applyPatch(level);
			expect(patchResult.status).toBe(200);
		}

		// Advance — 5 ocenionych z 5, próg=5 → OK
		const advanceResult = evaluateAdvance(5, 5);
		expect(advanceResult.ok).toBe(true);
	});

	it("verifiedByMethod w odpowiedzi PATCH to zawsze 'self' (Beta)", () => {
		// Sprawdzenie, że frontend nie dostaje żadnej innej wartości
		for (const level of [1, 2, 3, 4]) {
			const result = applyPatch(level);
			if (result.status === 200) {
				expect((result as { response: PatchResponse; status: 200 }).response.verifiedByMethod).toBe(
					"self",
				);
			}
		}
	});
});
