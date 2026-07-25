// @vitest-environment node
// ============================================================================
// 1E.4 (R5) — kontrakt BRAMKI hooka enrollment w POST /api/exam/[id]/complete.
//
// Dowodzimy TYLKO logiki bramkowania w miejscu wywołania (nie mechaniki zasiewu
// — tę na żywej bazie robi Quinn): hook odpala się WYŁĄCZNIE gdy egzamin zdany
// (passed) ∧ flaga spacedRepetition ON ∧ moduleId niepusty; przy fladze OFF /
// oblanym / braku modułu — NIGDY. Best-effort: błąd hooka NIE wywala trasy.
//
// Mock na granicy: transakcja egzaminu (zwracamy gotowy `outcome`, callback nie
// biegnie — testujemy bramkę PO transakcji, nie silnik gradingu), hook, flagi,
// auth. Inwariant flag-OFF „bajt-w-bajt" na realnej ścieżce = bramka Quinn.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// db.transaction zwraca zadany `outcome` — callback NIE jest wołany, więc silnik
// (gradeExam, tx.select) nie bierze udziału; izolujemy wyłącznie bramkę po transakcji.
const { dbMock } = vi.hoisted(() => ({ dbMock: { transaction: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

const mockGetStudentByUserId = vi.fn();
vi.mock("@/lib/assessment/exam-service", () => ({
	getStudentByUserId: (...a: unknown[]) => mockGetStudentByUserId(...a),
	isExamSessionExpired: () => false,
	buildCorrectivesPackage: vi.fn(),
}));

const mockEnroll = vi.fn();
vi.mock("@/lib/review/enroll-hook", () => ({
	enrollModuleConceptsOnMasteryPass: (...a: unknown[]) => mockEnroll(...a),
}));

const mockIsFeatureEnabled = vi.fn();
vi.mock("@/lib/flags", () => ({
	isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../[id]/complete/route";

const SESSION = { user: { id: "user-1" } };
const STUDENT = { id: "student-1" };
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";

function req(): Request {
	return new Request("http://test.local/api/exam/x/complete", { method: "POST" });
}
function ctx() {
	return { params: Promise.resolve({ id: SESSION_ID }) };
}

/** Ustaw flagi: masteryGate zawsze ON (trasa istnieje), spacedRepetition sterowalna. */
function setFlags(spacedRepetition: boolean) {
	mockIsFeatureEnabled.mockImplementation((name: string) =>
		name === "masteryGate" ? true : name === "spacedRepetition" ? spacedRepetition : false,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue(SESSION);
	mockGetStudentByUserId.mockResolvedValue(STUDENT);
	mockEnroll.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/exam/[id]/complete — bramka hooka enrollment (R5)", () => {
	it("ZDANY + flaga ON + moduleId → hook wołany raz z (studentId, moduleId), 200", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({
			kind: "completed",
			result: { passed: true },
			moduleId: MODULE_ID,
		});
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockEnroll).toHaveBeenCalledTimes(1);
		expect(mockEnroll).toHaveBeenCalledWith(STUDENT.id, MODULE_ID);
	});

	it("ZDANY + flaga OFF → hook NIGDY nie wołany (inwariant flag-OFF)", async () => {
		setFlags(false);
		dbMock.transaction.mockResolvedValue({
			kind: "completed",
			result: { passed: true },
			moduleId: MODULE_ID,
		});
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockEnroll).not.toHaveBeenCalled();
	});

	it("OBLANY + flaga ON → hook NIGDY nie wołany (bramka passed)", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({
			kind: "completed",
			result: { passed: false },
			moduleId: MODULE_ID,
		});
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockEnroll).not.toHaveBeenCalled();
	});

	it("ZDANY + flaga ON + moduleId NULL → hook NIGDY nie wołany (guard modułu)", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({
			kind: "completed",
			result: { passed: true },
			moduleId: null,
		});
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockEnroll).not.toHaveBeenCalled();
	});

	it("BEST-EFFORT: błąd hooka NIE wywala trasy — 200, błąd zalogowany", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({
			kind: "completed",
			result: { passed: true },
			moduleId: MODULE_ID,
		});
		mockEnroll.mockRejectedValue(new Error("boom enrollment"));
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ completed: true, result: { passed: true } });
		expect(mockLogError).toHaveBeenCalledWith(
			"review.enroll",
			expect.any(Error),
			expect.objectContaining({ studentId: STUDENT.id, moduleId: MODULE_ID }),
		);
	});

	it("nieukończony (incomplete) + flaga ON → hook nie wołany, 422", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({ kind: "incomplete" });
		const res = await POST(req(), ctx());
		expect(res.status).toBe(422);
		expect(mockEnroll).not.toHaveBeenCalled();
	});
});
