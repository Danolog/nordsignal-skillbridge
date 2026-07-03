import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSuggestionsCache } from "@/lib/ai/faculty-suggestions-cache";

/**
 * Route /api/faculty/dashboard — kontrakt 0.5 (rate-limit per tenant + cache sugestii LLM).
 *
 * Mock NA GRANICY: faculty-auth, rate-limit, withTenantContext (zwraca gotowy `data` —
 * callback niewołany, więc bez symulacji tx), generateFacultySuggestions (granica LLM).
 * Cache jest REALNY (nie mockowany) — czyszczony między testami, by ćwiczyć wiring.
 */

const mockCheckFacultyAuth = vi.fn();
vi.mock("@/lib/faculty-auth", () => ({ checkFacultyAuth: () => mockCheckFacultyAuth() }));

vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn(async () => undefined) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockApplyRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null },
	applyRateLimit: (...a: unknown[]) => mockApplyRateLimit(...a),
	rateLimitResponse: () =>
		new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
}));

const dashData = {
	tooFewStudents: false as const,
	studentCount: 12,
	heatmapData: [],
	topMissingWithGoals: [
		{ name: "SQL", missingCount: 8, requiredByPercent: 80, careerGoals: ["Data Analyst"] },
	],
};
const mockWithTenantContext = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (...a: unknown[]) => mockWithTenantContext(...a),
}));

const mockGenerateFacultySuggestions = vi.fn();
vi.mock("@/lib/ai/generate-faculty-suggestions", () => ({
	generateFacultySuggestions: (...a: unknown[]) => mockGenerateFacultySuggestions(...a),
}));

import { GET } from "../route";

beforeEach(() => {
	vi.clearAllMocks();
	clearSuggestionsCache();
	mockCheckFacultyAuth.mockResolvedValue({ tenantId: "tenant-1" });
	mockApplyRateLimit.mockResolvedValue({ success: true, reset: 0, remaining: 99 });
	mockWithTenantContext.mockResolvedValue(dashData);
	mockGenerateFacultySuggestions.mockResolvedValue(["Sugestia A", "Sugestia B"]);
});

describe("GET /api/faculty/dashboard — rate-limit + cache (0.5)", () => {
	it("401 gdy brak auth faculty — rate-limit nie ruszany", async () => {
		mockCheckFacultyAuth.mockResolvedValue(null);
		const res = await GET();
		expect(res.status).toBe(401);
		expect(mockApplyRateLimit).not.toHaveBeenCalled();
	});

	it("429 gdy rate-limit przekroczony — agregacja ani model nie ruszają", async () => {
		mockApplyRateLimit.mockResolvedValue({ success: false, reset: 1000, remaining: 0 });
		const res = await GET();
		expect(res.status).toBe(429);
		expect(mockWithTenantContext).not.toHaveBeenCalled();
		expect(mockGenerateFacultySuggestions).not.toHaveBeenCalled();
	});

	it("rate-limit kluczowany po tenancie (jeden budżet na kampus)", async () => {
		await GET();
		expect(mockApplyRateLimit).toHaveBeenCalledWith(null, "faculty:tenant-1");
	});

	it("cache: dwa ładowania z tym samym agregatem → model wołany RAZ", async () => {
		const res1 = await GET();
		const json1 = await res1.json();
		expect(res1.status).toBe(200);
		expect(json1.aiSuggestions).toEqual(["Sugestia A", "Sugestia B"]);

		const res2 = await GET();
		const json2 = await res2.json();
		expect(json2.aiSuggestions).toEqual(["Sugestia A", "Sugestia B"]);

		expect(mockGenerateFacultySuggestions).toHaveBeenCalledOnce();
	});

	it("fallback po błędzie modelu NIE jest cache'owany — kolejne ładowanie ponawia", async () => {
		mockGenerateFacultySuggestions.mockRejectedValueOnce(new Error("model down"));
		const res1 = await GET();
		const json1 = await res1.json();
		expect(json1.aiSuggestions[0]).toContain("Nie udało się");

		const res2 = await GET();
		const json2 = await res2.json();
		expect(json2.aiSuggestions).toEqual(["Sugestia A", "Sugestia B"]);
		expect(mockGenerateFacultySuggestions).toHaveBeenCalledTimes(2);
	});

	it("tooFewStudents → 200 wcześnie, bez generacji AI", async () => {
		mockWithTenantContext.mockResolvedValue({ tooFewStudents: true, studentCount: 2 });
		const res = await GET();
		const json = await res.json();
		expect(res.status).toBe(200);
		expect(json.tooFewStudents).toBe(true);
		expect(mockGenerateFacultySuggestions).not.toHaveBeenCalled();
	});
});
