// @vitest-environment node
//
// 0.15/B5+B6+B7+B8 — hardening tras passport/recommend:
//  • recommend: "Gap/Student not found" z matchProjects → 404 (było gołe 500), reszta → 502+logError.
//  • passport GET: try/catch + logError (GET robi też INSERT/UPDATE paszportu).
//  • passport/share POST: body przez Zod (było rzutowanie `as`) — zachowanie 409 bez zmian.
//  • passport/[id] (publiczny): Cache-Control no-store na odpowiedzi z PII.

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

// Wspólny mock db.query — poszczególne describes ustawiają swoje findFirst/findMany.
const dbState = {
	students: vi.fn(),
	passports: vi.fn(),
	user: vi.fn(),
	competencies: vi.fn(),
	gaps: vi.fn(),
};
vi.mock("@/lib/db", () => ({
	db: {
		query: {
			students: { findFirst: (...a: unknown[]) => dbState.students(...a) },
			passports: { findFirst: (...a: unknown[]) => dbState.passports(...a) },
			user: { findFirst: (...a: unknown[]) => dbState.user(...a) },
			competencies: { findMany: (...a: unknown[]) => dbState.competencies(...a) },
			gaps: { findMany: (...a: unknown[]) => dbState.gaps(...a) },
		},
	},
}));

const mockWithTenantContext = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (...a: unknown[]) => mockWithTenantContext(...a),
}));

const mockMatchProjects = vi.fn();
vi.mock("@/lib/ai/match-projects", () => ({
	matchProjects: (...a: unknown[]) => mockMatchProjects(...a),
}));

vi.mock("@/lib/audit", () => ({
	recordAudit: vi.fn(async () => undefined),
	auditContextFromRequest: () => ({ ipAddress: null, userAgent: null }),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { NextRequest } from "next/server";
import { GET as recommendGet } from "../../projects/recommend/route";
import { GET as publicPassportGet } from "../[id]/route";
import { GET as passportGet } from "../route";
import { POST as sharePost } from "../share/route";

const GAP_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1", name: "Jan" } });
	dbState.students.mockResolvedValue({
		id: "student-1",
		tenantId: "tenant-1",
		university: "WSB",
		fieldOfStudy: "IT",
		semester: 4,
		careerGoal: "Data Analyst",
		userId: "user-1",
	});
});

describe("GET /api/projects/recommend (0.15/B5)", () => {
	const req = () => new NextRequest(`http://localhost/api/projects/recommend?gapId=${GAP_ID}`);

	it("Gap not found z matchProjects → 404 (było gołe 500)", async () => {
		mockMatchProjects.mockRejectedValue(new Error("Gap not found"));
		const res = await recommendGet(req());
		expect(res.status).toBe(404);
	});

	it("inny błąd (timeout LLM) → 502 + logError", async () => {
		mockMatchProjects.mockRejectedValue(new Error("TimeoutError"));
		const res = await recommendGet(req());
		expect(res.status).toBe(502);
		expect(mockLogError).toHaveBeenCalled();
	});

	it("happy path → 200 z rekomendacjami", async () => {
		mockMatchProjects.mockResolvedValue([{ projectId: "p1", matchScore: 90, reasoning: "ok" }]);
		const res = await recommendGet(req());
		expect(res.status).toBe(200);
	});
});

describe("GET /api/passport (0.15/B6)", () => {
	it("awaria tx (GET robi INSERT/UPDATE paszportu) → 500 + logError", async () => {
		mockWithTenantContext.mockRejectedValue(new Error("boom"));
		const res = await passportGet();
		expect(res.status).toBe(500);
		expect(mockLogError.mock.calls[0][0]).toBe("passport.get");
	});
});

describe("POST /api/passport/share (0.15/B7 — body przez Zod)", () => {
	const share = (body: unknown) =>
		sharePost(
			new Request("http://localhost/api/passport/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}),
		);

	it("consentVersion złego typu (liczba) → 409 consent_version_mismatch, bez crasha", async () => {
		const res = await share({ consentVersion: 123 });
		expect(res.status).toBe(409);
		const json = await res.json();
		expect(json.error).toBe("consent_version_mismatch");
	});

	it("brak body → 409 (jak dotąd)", async () => {
		const res = await sharePost(
			new Request("http://localhost/api/passport/share", { method: "POST" }),
		);
		expect(res.status).toBe(409);
	});
});

describe("GET /api/passport/[id] — publiczny (0.15/B8)", () => {
	it("odpowiedź z PII niesie Cache-Control: private, no-store", async () => {
		dbState.passports.mockResolvedValue({
			id: "pass-1",
			studentId: "student-1",
			marketCoveragePercent: 50,
			updatedAt: new Date(),
		});
		dbState.user.mockResolvedValue({ name: "Jan" });
		dbState.competencies.mockResolvedValue([]);
		dbState.gaps.mockResolvedValue([]);

		const res = await publicPassportGet(new Request("http://localhost/api/passport/token"), {
			params: Promise.resolve({ id: "token" }),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe("private, no-store");
	});
});
