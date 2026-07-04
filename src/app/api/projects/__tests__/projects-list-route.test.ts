// @vitest-environment node
//
// 0.15/B1+B2 — GET /api/projects: auth (katalog był JEDYNĄ trasą dashboardową bez
// sesji — anonim dostawał rubricJson/briefTemplate) + walidacja filtrów query
// (ślepe casty dawały gołe 500 z Postgresa dla ?level=foo / ?maxHours=abc).

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockFindMany = vi.fn();
vi.mock("@/lib/db", () => ({
	db: { query: { projects: { findMany: (...a: unknown[]) => mockFindMany(...a) } } },
}));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { GET } from "../route";

const req = (qs = "") => new NextRequest(`http://localhost/api/projects${qs}`);

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockFindMany.mockResolvedValue([]);
});

describe("GET /api/projects — auth + walidacja query (0.15)", () => {
	it("bez sesji → 401, DB nietknięta (B1)", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET(req());
		expect(res.status).toBe(401);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("?level=foo → 400 zamiast 500 z Postgresa (B2)", async () => {
		const res = await GET(req("?level=foo"));
		expect(res.status).toBe(400);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("?maxHours=abc → 400 (B2)", async () => {
		const res = await GET(req("?maxHours=abc"));
		expect(res.status).toBe(400);
	});

	it("poprawne filtry → 200 z listą", async () => {
		mockFindMany.mockResolvedValue([{ id: "p1" }]);
		const res = await GET(req("?level=L1&maxHours=10"));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.projects).toHaveLength(1);
	});

	it("awaria DB → 500 z komunikatem (nie goły wyjątek)", async () => {
		mockFindMany.mockRejectedValue(new Error("boom"));
		const res = await GET(req());
		expect(res.status).toBe(500);
	});
});
