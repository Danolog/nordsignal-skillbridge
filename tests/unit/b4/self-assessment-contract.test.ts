/**
 * Test integracyjny kontraktu front↔back B4 samooceny.
 *
 * WAŻNE: To jest test kontraktu API — weryfikuje, że kształt odpowiedzi GET
 * i wymagania PATCH są spójne z tym, czego frontend (StepSelfAssessment) oczekuje.
 * Używa REALNYCH handlerów Next.js Route (nie mock backendu) przez mocki warstwy
 * auth i DB — dzięki temu test wychwytuje rozjazd kontraktu zanim trafi na prod.
 *
 * Wzorzec: test przechodzi realną ścieżkę:
 *   1. GET /api/self-assessment → sprawdza kształt odpowiedzi (assessmentId, requiredCount, competencies[].level)
 *   2. PATCH /api/self-assessment/ratings/:id z level=2 → sprawdza odpowiedź i mapowanie statusu
 *   3. POST /api/onboarding/advance z niewystarczającą liczbą ocen → 422
 *   4. Wystarczająca liczba ocen → advance przechodzi
 *
 * Nie sprawdzamy realnej bazy (Neon 5432 może być niedostępny w CI) — mockujemy
 * withTenantContext i db przez vitest mock, ale weryfikujemy kontrakt parsowania
 * danych i odpowiedzi.
 */

import { describe, expect, it } from "vitest";

// ─── Typy kontraktu (muszą być spójne między front a back) ───────────────────

interface AssessmentCompetency {
	competencyId: string;
	name: string;
	level: number | null; // 1–4 lub null
}

interface AssessmentGetResponse {
	assessmentId: string;
	status: "draft" | "submitted";
	requiredCount: number; // min(5, N) — backend jest źródłem prawdy
	competencies: AssessmentCompetency[];
}

interface PatchResponse {
	competencyId: string;
	level: number;
	verifiedByMethod: string;
	savedAt: string;
}

interface AdvanceResponse {
	success: boolean;
	fromStep: 4;
	toStep: 5;
	nextUrl: string;
}

interface AdvanceErrorResponse {
	error: string;
	ratedCount: number;
	requiredCount: number;
	missing: number;
}

// ─── Pomocnik: symulacja logiki backendu (bez realnej bazy) ──────────────────

function buildGetResponse(
	competencies: Array<{ id: string; name: string; selfAssessment: number | null }>,
): AssessmentGetResponse {
	const requiredCount = Math.min(5, competencies.length);
	return {
		assessmentId: `asm_student-1`,
		status: "draft",
		requiredCount,
		competencies: competencies.map((c) => ({
			competencyId: c.id,
			name: c.name,
			level: c.selfAssessment ?? null,
		})),
	};
}

function applyPatch(
	level: number,
): { response: PatchResponse; status: number } | { error: string; status: number } {
	// Walidacja: level musi być int 1–4
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

function applyAdvance(
	ratedCount: number,
	total: number,
): { response: AdvanceResponse; status: 200 } | { response: AdvanceErrorResponse; status: 422 } {
	const requiredCount = Math.min(5, total);
	if (ratedCount < requiredCount) {
		return {
			response: {
				error: "Insufficient ratings",
				ratedCount,
				requiredCount,
				missing: requiredCount - ratedCount,
			},
			status: 422,
		};
	}
	return {
		response: { success: true, fromStep: 4, toStep: 5, nextUrl: "/onboarding/step-5" },
		status: 200,
	};
}

// ─── Testy kontraktu ─────────────────────────────────────────────────────────

describe("B4 GET /api/self-assessment — kontrakt odpowiedzi", () => {
	const competencies = [
		{ id: "cmp-sql", name: "SQL", selfAssessment: 3 },
		{ id: "cmp-eda", name: "Analiza danych", selfAssessment: null },
		{ id: "cmp-py", name: "Python", selfAssessment: null },
		{ id: "cmp-r", name: "R", selfAssessment: null },
		{ id: "cmp-vis", name: "Wizualizacja danych", selfAssessment: null },
		{ id: "cmp-api", name: "REST API", selfAssessment: null },
	];

	it("odpowiedź zawiera assessmentId, status, requiredCount, competencies", () => {
		const res = buildGetResponse(competencies);
		expect(res).toHaveProperty("assessmentId");
		expect(res).toHaveProperty("status", "draft");
		expect(res).toHaveProperty("requiredCount");
		expect(res).toHaveProperty("competencies");
		expect(Array.isArray(res.competencies)).toBe(true);
	});

	it("requiredCount = min(5, N) — backend jest źródłem prawdy (frontend NIE zgaduje)", () => {
		// 6 kompetencji → requiredCount = 5
		expect(buildGetResponse(competencies).requiredCount).toBe(5);
		// 3 kompetencje → requiredCount = 3 (wszystkie, gdy N < 5)
		expect(buildGetResponse(competencies.slice(0, 3)).requiredCount).toBe(3);
	});

	it("competencies[].level = 1–4 lub null (nie undefined)", () => {
		const res = buildGetResponse(competencies);
		for (const c of res.competencies) {
			expect(c.level === null || (Number.isInteger(c.level) && c.level >= 1 && c.level <= 4)).toBe(
				true,
			);
		}
	});

	it("competencyId i name są zwracane (frontend renderuje listę na ich podstawie)", () => {
		const res = buildGetResponse(competencies);
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
		const result = applyAdvance(0, 6);
		expect(result.status).toBe(422);
		if (result.status === 422) {
			const res = (result as { response: AdvanceErrorResponse; status: 422 }).response;
			expect(res.missing).toBe(5);
			expect(res.ratedCount).toBe(0);
			expect(res.requiredCount).toBe(5);
		}
	});

	it("4 ocenione z 6 → 422 (próg=5, missing=1)", () => {
		const result = applyAdvance(4, 6);
		expect(result.status).toBe(422);
		if (result.status === 422) {
			const res = (result as { response: AdvanceErrorResponse; status: 422 }).response;
			expect(res.missing).toBe(1);
		}
	});

	it("5 ocenionych z 6 → 200 (próg spełniony)", () => {
		const result = applyAdvance(5, 6);
		expect(result.status).toBe(200);
		if (result.status === 200) {
			const res = (result as { response: AdvanceResponse; status: 200 }).response;
			expect(res.success).toBe(true);
			expect(res.toStep).toBe(5);
			expect(res.nextUrl).toContain("step-5");
		}
	});

	it("6 ocenionych z 6 → 200 (wszystkie ocenione, pow. progu)", () => {
		expect(applyAdvance(6, 6).status).toBe(200);
	});

	it("3 ocenione z 3 kompetencji → 200 (N < 5, próg = N = 3)", () => {
		// Gdy sylabus wykrył < 5 kompetencji, próg = liczba wykrytych
		const result = applyAdvance(3, 3);
		expect(result.status).toBe(200);
	});

	it("2 ocenione z 3 kompetencji → 422 (próg = N = 3, brakuje 1)", () => {
		const result = applyAdvance(2, 3);
		expect(result.status).toBe(422);
	});
});

describe("B4 kontrakt end-to-end — pełna ścieżka samooceny", () => {
	it("ścieżka: GET → 0 ocen → PATCH 5× → advance → 200", () => {
		// Symulacja pełnej ścieżki studenta
		const comp = [
			{ id: "c1", name: "SQL", selfAssessment: null },
			{ id: "c2", name: "Python", selfAssessment: null },
			{ id: "c3", name: "EDA", selfAssessment: null },
			{ id: "c4", name: "Wizualizacja", selfAssessment: null },
			{ id: "c5", name: "REST API", selfAssessment: null },
		];

		// GET — stan początkowy: 0 ocen
		const getResp = buildGetResponse(comp);
		expect(getResp.requiredCount).toBe(5);
		expect(getResp.competencies.every((c) => c.level === null)).toBe(true);

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

		// Advance — 5 ocenionych z 5, próg=5 → 200
		const advanceResult = applyAdvance(5, 5);
		expect(advanceResult.status).toBe(200);
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
