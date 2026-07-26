// @vitest-environment node
//
// 1E.4 (SLICE R4) — testy JEDNOSTKOWE tras /api/review/{queue,answer}. Warstwa
// DB/serwis zamockowana (zależności izolowane) — dowodzą LOGIKI TRASY: bramka
// flagi (404 OFF), auth (401), cap limitu (K2), strip klucza, walidacja body,
// serwerowe liczenie poprawności i hintDepth=0, mapowanie błędów (K3, 409/404).
//
// GŁĘBOKI test na żywej bazie (izolacja cross-tenant / RLS / strip end-to-end)
// = bramka Quinn (*.integration.test.ts, projekt `integration`). Tu zero Postgresa.

import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Sterowane atrapy (hoisted, żeby vi.mock je widział) ---
const h = vi.hoisted(() => {
	class ConceptNotScheduledError extends Error {}
	return {
		flagOn: { value: true },
		mockGetSession: vi.fn<(...a: unknown[]) => unknown>(),
		mockGetStudent: vi.fn<(...a: unknown[]) => unknown>(),
		mockGetDueQueue: vi.fn<(...a: unknown[]) => unknown>(),
		mockRecordReview: vi.fn<(...a: unknown[]) => unknown>(),
		mockLoadReviewQuestions: vi.fn<(...a: unknown[]) => unknown>(),
		mockLoadGradableQuestion: vi.fn<(...a: unknown[]) => unknown>(),
		mockApplyRateLimit: vi.fn<(...a: unknown[]) => unknown>(async () => ({
			success: true,
			reset: 0,
			remaining: 100,
		})),
		ConceptNotScheduledError,
	};
});

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ auth: { api: { getSession: () => h.mockGetSession() } } }));
vi.mock("@/lib/flags", () => ({ isFeatureEnabled: () => h.flagOn.value }));
vi.mock("@/lib/assessment/exam-service", () => ({ getStudentByUserId: () => h.mockGetStudent() }));
vi.mock("@/lib/review/review-service", () => ({
	getDueQueue: (...a: unknown[]) => h.mockGetDueQueue(...a),
	recordReview: (...a: unknown[]) => h.mockRecordReview(...a),
	ConceptNotScheduledError: h.ConceptNotScheduledError,
}));
vi.mock("@/lib/review/review-questions", () => ({
	loadReviewQuestions: (...a: unknown[]) => h.mockLoadReviewQuestions(...a),
	loadGradableQuestion: (...a: unknown[]) => h.mockLoadGradableQuestion(...a),
}));
vi.mock("@/lib/rate-limit", () => ({
	applyRateLimit: (...a: unknown[]) => h.mockApplyRateLimit(...a),
	rateLimiters: { reviewQueue: {}, reviewAnswer: {}, reviewDaily: {} },
	// Wierny mock: przekazuje `scope` (2. arg) do body, jak prawdziwy rateLimitResponse
	// (CF-2). Wywołanie bez scope → brak pola (parytet wstecznej zgodności).
	rateLimitResponse: (_reset: number, scope?: string) =>
		new Response(
			JSON.stringify(
				scope ? { error: "Too many requests", scope } : { error: "Too many requests" },
			),
			{
				status: 429,
				headers: { "content-type": "application/json", "retry-after": "1" },
			},
		),
}));

import { POST } from "../answer/route";
import { GET } from "../queue/route";

const SESSION = { user: { id: "user-1" } };
const STUDENT = { id: "student-1", tenantId: "tenant-1" };
// UUID v4 poprawne wg RFC (wersja `4`, wariant `8..b`) — z.string().uuid() (Zod 4)
// waliduje ściśle, więc atrapy muszą być prawidłowe, inaczej body leci 400.
const CONCEPT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONCEPT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const QITEM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function queueReq(query = ""): Request {
	return new Request(`http://test.local/api/review/queue${query}`);
}
function answerReq(body: unknown): Request {
	return new Request("http://test.local/api/review/answer", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	h.flagOn.value = true;
	h.mockGetSession.mockResolvedValue(SESSION);
	h.mockGetStudent.mockResolvedValue(STUDENT);
	h.mockApplyRateLimit.mockResolvedValue({ success: true, reset: 0, remaining: 100 });
	h.mockGetDueQueue.mockResolvedValue([]);
	h.mockLoadReviewQuestions.mockResolvedValue(new Map());
});

describe("GET /api/review/queue", () => {
	it("flaga OFF → 404 (trasa nie istnieje)", async () => {
		h.flagOn.value = false;
		const res = await GET(queueReq());
		expect(res.status).toBe(404);
		expect(h.mockGetSession).not.toHaveBeenCalled();
	});

	it("brak sesji → 401", async () => {
		h.mockGetSession.mockResolvedValue(null);
		const res = await GET(queueReq());
		expect(res.status).toBe(401);
	});

	it("brak studenta → 404", async () => {
		h.mockGetStudent.mockResolvedValue(null);
		const res = await GET(queueReq());
		expect(res.status).toBe(404);
	});

	it("limit przekracza cap → getDueQueue wołane z twardym capem (K2)", async () => {
		await GET(queueReq("?limit=100"));
		expect(h.mockGetDueQueue).toHaveBeenCalledWith(STUDENT.id, expect.any(Date), 20);
	});

	it("brak limitu → domyślny cap; mniejszy limit respektowany", async () => {
		await GET(queueReq());
		expect(h.mockGetDueQueue).toHaveBeenLastCalledWith(STUDENT.id, expect.any(Date), 20);
		vi.clearAllMocks();
		h.mockGetDueQueue.mockResolvedValue([]);
		await GET(queueReq("?limit=5"));
		expect(h.mockGetDueQueue).toHaveBeenLastCalledWith(STUDENT.id, expect.any(Date), 5);
	});

	it("limit śmieciowy/ujemny → cap (bezpieczny domyślny)", async () => {
		await GET(queueReq("?limit=-3"));
		expect(h.mockGetDueQueue).toHaveBeenLastCalledWith(STUDENT.id, expect.any(Date), 20);
		vi.clearAllMocks();
		h.mockGetDueQueue.mockResolvedValue([]);
		await GET(queueReq("?limit=abc"));
		expect(h.mockGetDueQueue).toHaveBeenLastCalledWith(STUDENT.id, expect.any(Date), 20);
	});

	it("K1: studentId z sesji, NIGDY z query (?studentId ignorowane)", async () => {
		await GET(queueReq("?studentId=HACKER&limit=5"));
		expect(h.mockGetDueQueue).toHaveBeenCalledWith(STUDENT.id, expect.any(Date), 5);
	});

	it("kształt odpowiedzi + strip klucza (payload bez answerJson/correct)", async () => {
		h.mockGetDueQueue.mockResolvedValue([
			{ conceptId: CONCEPT_A, state: "review", due: new Date(), reps: 2, lapses: 0 },
		]);
		h.mockLoadReviewQuestions.mockResolvedValue(
			new Map([
				[
					CONCEPT_A,
					{ questionItemId: QITEM, type: "single_choice", stem: "2+2?", options: ["3", "4"] },
				],
			]),
		);
		const res = await GET(queueReq());
		expect(res.status).toBe(200);
		const raw = await res.text();
		expect(raw).not.toContain("answerJson");
		expect(raw).not.toContain('"correct"');
		const json = JSON.parse(raw);
		expect(json.cap).toBe(20);
		expect(json.queue).toHaveLength(1);
		expect(json.queue[0].conceptId).toBe(CONCEPT_A);
		expect(json.queue[0].question.questionItemId).toBe(QITEM);
	});

	it("koncept bez pytania w banku → pominięty (kontrakt pojemności)", async () => {
		h.mockGetDueQueue.mockResolvedValue([
			{ conceptId: CONCEPT_A, state: "review", due: new Date(), reps: 1, lapses: 0 },
			{ conceptId: CONCEPT_B, state: "new", due: new Date(), reps: 0, lapses: 0 },
		]);
		// tylko A ma pytanie
		h.mockLoadReviewQuestions.mockResolvedValue(
			new Map([
				[
					CONCEPT_A,
					{ questionItemId: QITEM, type: "single_choice", stem: "?", options: ["a", "b"] },
				],
			]),
		);
		const res = await GET(queueReq());
		const json = await res.json();
		expect(json.queue).toHaveLength(1);
		expect(json.queue[0].conceptId).toBe(CONCEPT_A);
	});

	it("limiter wyczerpany → 429 z Retry-After", async () => {
		h.mockApplyRateLimit.mockResolvedValue({
			success: false,
			reset: Date.now() + 1000,
			remaining: 0,
		});
		const res = await GET(queueReq());
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBeTruthy();
		expect(h.mockGetDueQueue).not.toHaveBeenCalled();
	});
});

describe("POST /api/review/answer", () => {
	const goodBody = { conceptId: CONCEPT_A, questionItemId: QITEM, answerIndex: 1, confidence: 2 };

	beforeEach(() => {
		h.mockLoadGradableQuestion.mockResolvedValue({
			questionItemId: QITEM,
			conceptId: CONCEPT_A,
			type: "single_choice",
			answerKey: { correct: 1 },
			explanationMd: "Bo 4 = 2+2.",
		});
		h.mockRecordReview.mockResolvedValue({ isCorrect: true, nextDue: new Date("2026-08-01") });
	});

	it("flaga OFF → 404", async () => {
		h.flagOn.value = false;
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(404);
	});

	it("brak sesji → 401", async () => {
		h.mockGetSession.mockResolvedValue(null);
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(401);
	});

	it("body: brak pola → 400", async () => {
		const res = await POST(answerReq({ conceptId: CONCEPT_A, answerIndex: 1 }));
		expect(res.status).toBe(400);
	});

	it("body: pole nadmiarowe (np. hintDepth od klienta) → 400 (strict)", async () => {
		const res = await POST(answerReq({ ...goodBody, hintDepth: 3 }));
		expect(res.status).toBe(400);
	});

	it("body: confidence spoza 1..3 → 400", async () => {
		const res = await POST(answerReq({ ...goodBody, confidence: 5 }));
		expect(res.status).toBe(400);
	});

	it("body: answerIndex ujemny → 400", async () => {
		const res = await POST(answerReq({ ...goodBody, answerIndex: -1 }));
		expect(res.status).toBe(400);
	});

	it("brak studenta → 404", async () => {
		h.mockGetStudent.mockResolvedValue(null);
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(404);
	});

	it("K3: pytanie spoza konceptu / nieistniejące → 404, bez recordReview", async () => {
		h.mockLoadGradableQuestion.mockResolvedValue(null);
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(404);
		expect(h.mockRecordReview).not.toHaveBeenCalled();
	});

	it("pytanie innego typu niż single_choice → 409", async () => {
		h.mockLoadGradableQuestion.mockResolvedValue({
			questionItemId: QITEM,
			conceptId: CONCEPT_A,
			type: "numeric",
			answerKey: { value: 4, tolerance: 0 },
			explanationMd: null,
		});
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(409);
		expect(h.mockRecordReview).not.toHaveBeenCalled();
	});

	it("poprawność LICZONA serwerowo (grade.ts), hintDepth=0, confidence z body", async () => {
		// answerKey.correct=1, answerIndex=1 → poprawnie
		const res = await POST(answerReq({ ...goodBody, answerIndex: 1, confidence: 3 }));
		expect(res.status).toBe(200);
		expect(h.mockRecordReview).toHaveBeenCalledWith(
			STUDENT.id,
			CONCEPT_A,
			{ questionItemId: QITEM, isCorrect: true, confidence: 3, hintDepth: 0 },
			expect.any(Date),
		);
		const json = await res.json();
		expect(json.isCorrect).toBe(true);
		expect(json.nextDue).toBeTruthy();
		expect(json.feedback.message).toContain("większym odstępie");
	});

	it("zła odpowiedź: server liczy isCorrect=false, neutralny copy", async () => {
		h.mockRecordReview.mockResolvedValue({ isCorrect: false, nextDue: new Date("2026-07-26") });
		const res = await POST(answerReq({ ...goodBody, answerIndex: 0 })); // key.correct=1
		const json = await res.json();
		expect(h.mockRecordReview).toHaveBeenCalledWith(
			STUDENT.id,
			CONCEPT_A,
			expect.objectContaining({ isCorrect: false, hintDepth: 0 }),
			expect.any(Date),
		);
		// Copy kontraktowy z planu §2 (neutralny, nie karzący): „za wcześnie", nie „oblałeś".
		expect(json.feedback.message).toContain("za wcześnie");
		expect(json.feedback.message).not.toContain("oblałeś");
	});

	it("confidence pominięte → null przekazane do recordReview", async () => {
		const { confidence, ...noConf } = goodBody;
		void confidence;
		await POST(answerReq(noConf));
		expect(h.mockRecordReview).toHaveBeenCalledWith(
			STUDENT.id,
			CONCEPT_A,
			expect.objectContaining({ confidence: null }),
			expect.any(Date),
		);
	});

	it("K1: studentId z sesji, NIGDY z body (studentId w body ignorowany)", async () => {
		await POST(answerReq({ ...goodBody, studentId: "HACKER" }));
		// strict odrzuciłby nadmiarowe pole → 400; to dowodzi, że body NIE steruje studentem
		const res = await POST(answerReq({ ...goodBody, studentId: "HACKER" }));
		expect(res.status).toBe(400);
	});

	it("ConceptNotScheduledError → 409 (nie 500)", async () => {
		h.mockRecordReview.mockRejectedValue(new h.ConceptNotScheduledError("nie w kolejce"));
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(409);
	});

	it("FK-violation (23503) → 404 (K3, nie 500)", async () => {
		h.mockRecordReview.mockRejectedValue({ code: "23503", message: "violates foreign key" });
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(404);
	});

	it("nieoczekiwany błąd → 500 (neutralny komunikat)", async () => {
		h.mockRecordReview.mockRejectedValue(new Error("boom"));
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(500);
		const json = await res.json();
		expect(json.error).not.toContain("boom");
	});

	it("limiter dobowy wyczerpany → 429 ze scope=daily", async () => {
		h.mockApplyRateLimit
			.mockResolvedValueOnce({ success: true, reset: 0, remaining: 10 })
			.mockResolvedValueOnce({ success: false, reset: Date.now() + 1000, remaining: 0 });
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(429);
		const json = await res.json();
		expect(json.scope).toBe("daily");
		expect(h.mockRecordReview).not.toHaveBeenCalled();
	});

	it("limiter burst wyczerpany → 429 ze scope=burst (przed limiterem dobowym)", async () => {
		h.mockApplyRateLimit.mockResolvedValueOnce({
			success: false,
			reset: Date.now() + 1000,
			remaining: 0,
		});
		const res = await POST(answerReq(goodBody));
		expect(res.status).toBe(429);
		const json = await res.json();
		expect(json.scope).toBe("burst");
		// burst pęka PRZED sprawdzeniem limitera dobowego → tylko jedno wywołanie.
		expect(h.mockApplyRateLimit).toHaveBeenCalledTimes(1);
		expect(h.mockRecordReview).not.toHaveBeenCalled();
	});
});
