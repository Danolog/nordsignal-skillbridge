// @vitest-environment node
/**
 * B8/1.3 — kontrakt POST /api/operator/login (ADR-011).
 *
 * Realne: routing + walidacja + bramka flagi + logika hasła (constant-time).
 * Mock na granicy: db, rate-limit, audit. Sesję w realnej bazie i rozdział ról
 * dowodzi suita integracyjna review-queue.integration.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
	dbMock: { insert: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

const mockApplyRateLimit = vi.fn(async () => ({ success: true, reset: 0 }));
vi.mock("@/lib/rate-limit", () => ({
	applyRateLimit: () => mockApplyRateLimit(),
	getClientIp: () => "127.0.0.1",
	rateLimiters: { facultyLogin: {} },
	rateLimitResponse: () => new Response(null, { status: 429 }),
}));

const mockRecordAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
	auditContextFromRequest: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
	recordAudit: (...a: unknown[]) => mockRecordAudit(...a),
}));

import { POST } from "../login/route";

// Fixture testowe, nie sekret (fałszywy alarm generic-api-key). gitleaks:allow
const PASSWORD = "operator-sekret-testowy-123"; // gitleaks:allow

function makeReq(body: unknown): Request {
	return new Request("http://test.local/api/operator/login", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

function mockInsertReturning() {
	const returning = vi.fn(async () => [{ id: "sess-1" }]);
	// Parametr jawnie typowany — bez niego mock.calls to krotka `[]` (lekcja z AG.6).
	const values = vi.fn((_row: Record<string, unknown>) => ({ returning }));
	dbMock.insert.mockReturnValue({ values } as never);
	return { values, returning };
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
	vi.stubEnv("OPERATOR_PASSWORD", PASSWORD);
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("POST /api/operator/login", () => {
	it("flaga off → 404 (rodzina B8 nie istnieje)", async () => {
		vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "");
		expect((await POST(makeReq({ password: PASSWORD }))).status).toBe(404);
	});

	it("brak OPERATOR_PASSWORD w env → 500 (fail-closed, nigdy fail-open)", async () => {
		vi.stubEnv("OPERATOR_PASSWORD", "");
		expect((await POST(makeReq({ password: "cokolwiek" }))).status).toBe(500);
		expect(dbMock.insert).not.toHaveBeenCalled();
	});

	it("złe hasło → 401 + audyt operator.login.fail, zero sesji", async () => {
		const res = await POST(makeReq({ password: "zle-haslo" }));
		expect(res.status).toBe(401);
		expect(mockRecordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "operator.login.fail" }),
		);
		expect(dbMock.insert).not.toHaveBeenCalled();
	});

	it("dobre hasło → 200, sesja role='quality_operator' z tenant NULL, cookie operator_session", async () => {
		const { values } = mockInsertReturning();
		const res = await POST(makeReq({ password: PASSWORD }));
		expect(res.status).toBe(200);

		const inserted = values.mock.calls[0][0] as Record<string, unknown>;
		expect(inserted.role).toBe("quality_operator");
		expect(inserted.tenantId).toBeNull();
		expect(inserted.tokenHash).toEqual(expect.any(String));

		const setCookie = res.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("operator_session=");
		expect(setCookie.toLowerCase()).toContain("httponly");
		expect(mockRecordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "operator.login.success", actorType: "operator" }),
		);
	});

	it("walidacja: zepsuty JSON / brak password → 400; rate-limit → 429", async () => {
		expect((await POST(makeReq("nie-json{"))).status).toBe(400);
		expect((await POST(makeReq({}))).status).toBe(400);

		mockApplyRateLimit.mockResolvedValueOnce({ success: false, reset: 0 });
		expect((await POST(makeReq({ password: PASSWORD }))).status).toBe(429);
	});

	it("zły origin → 403 (ochrona CSRF logowania)", async () => {
		vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
		const req = new Request("http://test.local/api/operator/login", {
			method: "POST",
			body: JSON.stringify({ password: PASSWORD }),
			headers: { "Content-Type": "application/json", origin: "https://evil.example.com" },
		});
		expect((await POST(req)).status).toBe(403);
	});
});
