// @vitest-environment node
//
// 0.15/B3+B4+B6 — hardening tras gaps:
//  • POST /api/gaps/[id]/why: walidacja UUID (400 zamiast 22P02→500) + try/catch
//    wokół AI (timeout/429 Anthropic → 502 z logError, nie gołe 500) — była to
//    jedyna trasa AI bez otoczki błędu.
//  • GET /api/gaps: try/catch + logError (lekcja #4 — nigdy puste 500 bez śladu).

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const mockStudentsFindFirst = vi.fn();
vi.mock("@/lib/db", () => ({
	db: { query: { students: { findFirst: (...a: unknown[]) => mockStudentsFindFirst(...a) } } },
}));

const mockWithTenantContext = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (...a: unknown[]) => mockWithTenantContext(...a),
}));

const mockGenerateWhy = vi.fn();
vi.mock("@/lib/ai/generate-why", () => ({
	generateWhyImportant: (...a: unknown[]) => mockGenerateWhy(...a),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST as whyPost } from "../[id]/why/route";
import { GET as gapsGet } from "../route";

const GAP_ID = "22222222-2222-4222-8222-222222222222";
const whyReq = () => new Request(`http://localhost/api/gaps/${GAP_ID}/why`, { method: "POST" });

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockStudentsFindFirst.mockResolvedValue({
		id: "student-1",
		tenantId: "tenant-1",
		careerGoal: "Data Analyst",
	});
});

describe("POST /api/gaps/[id]/why (0.15/B3+B4)", () => {
	it("zły format id → 400 przed jakimkolwiek zapytaniem (B3)", async () => {
		const res = await whyPost(whyReq(), { params: Promise.resolve({ id: "nie-uuid" }) });
		expect(res.status).toBe(400);
		expect(mockStudentsFindFirst).not.toHaveBeenCalled();
	});

	it("awaria AI (timeout/429) → 502 + logError, nie gołe 500 (B4)", async () => {
		// gap bez cache (whyImportant null) → trasa idzie do generateWhyImportant.
		mockWithTenantContext.mockResolvedValueOnce({
			id: GAP_ID,
			studentId: "student-1",
			competencyName: "SQL",
			marketPercentage: 80,
			whyImportant: null,
		});
		mockGenerateWhy.mockRejectedValue(new Error("TimeoutError"));

		const res = await whyPost(whyReq(), { params: Promise.resolve({ id: GAP_ID }) });
		expect(res.status).toBe(502);
		expect(mockLogError).toHaveBeenCalled();
		expect(mockLogError.mock.calls[0][0]).toBe("gaps.why");
	});

	it("cache hit (whyImportant zapisane) → 200 bez wołania AI", async () => {
		mockWithTenantContext.mockResolvedValueOnce({
			id: GAP_ID,
			studentId: "student-1",
			competencyName: "SQL",
			marketPercentage: 80,
			whyImportant: "Bo rynek tego chce.",
		});
		const res = await whyPost(whyReq(), { params: Promise.resolve({ id: GAP_ID }) });
		expect(res.status).toBe(200);
		expect(mockGenerateWhy).not.toHaveBeenCalled();
	});
});

describe("GET /api/gaps (0.15/B6)", () => {
	it("awaria DB → 500 z logError (nie goły wyjątek)", async () => {
		mockWithTenantContext.mockRejectedValue(new Error("deadlock"));
		const res = await gapsGet();
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
		expect(mockLogError.mock.calls[0][0]).toBe("gaps.get");
	});

	it("happy path → 200 z listą", async () => {
		mockWithTenantContext.mockResolvedValue([{ id: GAP_ID }]);
		const res = await gapsGet();
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.gaps).toHaveLength(1);
	});
});
