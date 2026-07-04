// @vitest-environment node
//
// 0.15/B3 — guardy UUID parametrów ścieżki: projects/[id], brief, submit,
// self-assessment/ratings/[competencyId]. Zły format dawał 22P02 z Postgresa
// (w brief/submit pierwsze query było POZA try/catch) → gołe 500 zamiast 400.
// Ścieżka 400 zwraca PRZED dotknięciem DB — mocki są stubami, asercja: nietknięte.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null, aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const dbTouched = vi.fn();
vi.mock("@/lib/db", () => ({
	db: {
		query: new Proxy(
			{},
			{
				get: () =>
					new Proxy(
						{},
						{
							get:
								() =>
								(...a: unknown[]) =>
									dbTouched(...a),
						},
					),
			},
		),
	},
}));
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(async () => dbTouched()),
}));
vi.mock("@/lib/ai/generate-brief", () => ({ generateProjectBrief: vi.fn() }));
vi.mock("@/lib/ai/pipeline", () => ({ runReviewPipeline: vi.fn() }));
vi.mock("@/lib/audit", () => ({
	recordAudit: vi.fn(),
	auditContextFromRequest: () => ({ ipAddress: null, userAgent: null }),
}));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { PATCH as ratingsPatch } from "../../self-assessment/ratings/[competencyId]/route";
import { POST as briefPost } from "../[id]/brief/route";
import { GET as detailGet } from "../[id]/route";
import { POST as submitPost } from "../[id]/submit/route";

const badParams = { params: Promise.resolve({ id: "nie-uuid" }) };

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
});

describe("guardy UUID parametrów (0.15/B3) — 400 przed DB", () => {
	it("GET /api/projects/[id] — zły id → 400, DB nietknięta", async () => {
		const res = await detailGet(new Request("http://localhost/api/projects/nie-uuid"), badParams);
		expect(res.status).toBe(400);
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("POST /api/projects/[id]/brief — zły id → 400, DB nietknięta", async () => {
		const res = await briefPost(
			new Request("http://localhost/api/projects/nie-uuid/brief", { method: "POST" }),
			badParams,
		);
		expect(res.status).toBe(400);
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("POST /api/projects/[id]/submit — zły id → 400, DB nietknięta", async () => {
		const res = await submitPost(
			new Request("http://localhost/api/projects/nie-uuid/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repoUrl: "https://github.com/u/r" }),
			}),
			badParams,
		);
		expect(res.status).toBe(400);
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("PATCH /api/self-assessment/ratings/[competencyId] — zły id → 400, DB nietknięta", async () => {
		const res = await ratingsPatch(
			new Request("http://localhost/api/self-assessment/ratings/nie-uuid", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ level: 3 }),
			}),
			{ params: Promise.resolve({ competencyId: "nie-uuid" }) },
		);
		expect(res.status).toBe(400);
		expect(dbTouched).not.toHaveBeenCalled();
	});
});
