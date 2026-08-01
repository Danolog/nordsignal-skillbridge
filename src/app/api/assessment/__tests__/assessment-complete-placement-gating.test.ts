// @vitest-environment node
// ============================================================================
// 1E.7 (L3) — kontrakt BRAMKI hooka placementu w POST /api/assessment/[id]/complete.
//
// Dowodzimy TYLKO logiki bramkowania w miejscu wywołania (mechanikę zapisu na
// żywej bazie robi placement-service.integration.test.ts): hook odpala się
// WYŁĄCZNIE gdy sesja jest rodzaju 'diagnostic' ∧ flaga placementDiagnostic ON.
// Przy fladze OFF — NIGDY, a odpowiedź trasy jest identyczna co do bajtu
// z odpowiedzią sprzed L3 (inwariant flag-OFF). Best-effort: błąd hooka NIE
// wywala trasy — student dostaje swój wynik diagnozy.
//
// Mock na granicy: transakcja diagnozy (zwracamy gotowy `outcome`, callback nie
// biegnie — testujemy bramkę PO transakcji, nie silnik liczenia wyniku), hook,
// flagi, auth.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { dbMock } = vi.hoisted(() => ({ dbMock: { transaction: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: dbMock }));

const mockGetStudentByUserId = vi.fn();
vi.mock("@/lib/assessment/service", () => ({
	getStudentByUserId: (...a: unknown[]) => mockGetStudentByUserId(...a),
	isSessionExpired: () => false,
}));

const mockRecordPlacement = vi.fn();
vi.mock("@/lib/curriculum/placement-service", () => ({
	recordPlacementOnDiagnosisComplete: (...a: unknown[]) => mockRecordPlacement(...a),
}));

const mockIsFeatureEnabled = vi.fn();
vi.mock("@/lib/flags", () => ({
	isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../[id]/complete/route";

const SESSION = { user: { id: "user-1" } };
// ⚠ `careerGoal: ""` — STAN REALNY w chwili domknięcia diagnozy (Krok 0 kreatora
// zakłada wiersz z placeholderem, właściwy cel zapisuje `POST /api/onboarding`
// DOPIERO PO diagnozie). Poprzednia wersja tego rekwizytu sadzała tu gotowe
// "Data Scientist" i przez to przepuściła bloker D0: hook czytał cel z wiersza
// studenta, czyli z pola, które w tym momencie przepływu jest puste. Ten plik
// testuje WYŁĄCZNIE bramkę wywołania (hook jest atrapą); źródło celu dowodzi
// `placement-hook-career-goal.integration.test.ts` na realnej bazie.
const STUDENT = { id: "student-1", tenantId: "tenant-1", careerGoal: "" };
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const RESULT = {
	competencies: { Python: 4 },
	concepts: { "ds-python": { level: 4 } },
	uncovered: [],
};

function req(): Request {
	return new Request("http://test.local/api/assessment/x/complete", { method: "POST" });
}
function ctx() {
	return { params: Promise.resolve({ id: SESSION_ID }) };
}

/** diagnosticAssessment zawsze ON (trasa istnieje); placementDiagnostic sterowalna. */
function setFlags(placementDiagnostic: boolean) {
	mockIsFeatureEnabled.mockImplementation((name: string) =>
		name === "diagnosticAssessment"
			? true
			: name === "placementDiagnostic"
				? placementDiagnostic
				: false,
	);
}

function completedOutcome(sessionKind = "diagnostic") {
	return { kind: "completed", sessionKind, result: RESULT, updatedCompetencies: 1 };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue(SESSION);
	mockGetStudentByUserId.mockResolvedValue(STUDENT);
	mockRecordPlacement.mockResolvedValue({ unlockedSlugs: [], written: 0 });
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/assessment/[id]/complete — bramka hooka placementu (1E.7 L3)", () => {
	it("diagnoza domknięta + flaga ON → hook wołany RAZ z (student, sessionId, result), 200", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue(completedOutcome());
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockRecordPlacement).toHaveBeenCalledTimes(1);
		expect(mockRecordPlacement).toHaveBeenCalledWith(STUDENT, SESSION_ID, RESULT);
	});

	it("flaga OFF → hook NIGDY nie wołany (inwariant flag-OFF)", async () => {
		setFlags(false);
		dbMock.transaction.mockResolvedValue(completedOutcome());
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		expect(mockRecordPlacement).not.toHaveBeenCalled();
	});

	it("flaga OFF → odpowiedź trasy IDENTYCZNA jak przed L3 (bajt-w-bajt)", async () => {
		setFlags(false);
		dbMock.transaction.mockResolvedValue(completedOutcome());
		const res = await POST(req(), ctx());
		await expect(res.text()).resolves.toBe(
			JSON.stringify({ completed: true, result: RESULT, updatedCompetencies: 1 }),
		);
	});

	it("flaga ON → odpowiedź trasy BEZ ZMIAN (placement nie dokłada niczego klientowi)", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue(completedOutcome());
		mockRecordPlacement.mockResolvedValue({ unlockedSlugs: ["f1"], written: 1 });
		const res = await POST(req(), ctx());
		await expect(res.text()).resolves.toBe(
			JSON.stringify({ completed: true, result: RESULT, updatedCompetencies: 1 }),
		);
	});

	it("sesja 'module_exam' + flaga ON → hook NIGDY nie wołany (bramka rodzaju sesji)", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue(completedOutcome("module_exam"));
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		// Placement liczy się z wyniku DIAGNOZY; policzenie go z wyniku egzaminu
		// modułowego dałoby odblokowania na podstawie zupełnie innego pomiaru.
		expect(mockRecordPlacement).not.toHaveBeenCalled();
	});

	it("BEST-EFFORT: błąd hooka NIE wywala trasy — 200, wynik diagnozy dostarczony, błąd zalogowany", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue(completedOutcome());
		mockRecordPlacement.mockRejectedValue(new Error("boom placement"));
		const res = await POST(req(), ctx());
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({
			completed: true,
			result: RESULT,
			updatedCompetencies: 1,
		});
		expect(mockLogError).toHaveBeenCalledWith(
			"curriculum.placement",
			expect.any(Error),
			expect.objectContaining({ studentId: STUDENT.id, sessionId: SESSION_ID }),
		);
	});

	it("nieukończona diagnoza (incomplete) + flaga ON → hook nie wołany, 422", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({ kind: "incomplete" });
		const res = await POST(req(), ctx());
		expect(res.status).toBe(422);
		expect(mockRecordPlacement).not.toHaveBeenCalled();
	});

	it("sesja nie istnieje (not_found) + flaga ON → hook nie wołany, 404", async () => {
		setFlags(true);
		dbMock.transaction.mockResolvedValue({ kind: "not_found" });
		const res = await POST(req(), ctx());
		expect(res.status).toBe(404);
		expect(mockRecordPlacement).not.toHaveBeenCalled();
	});
});
