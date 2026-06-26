// @vitest-environment node
/**
 * GET /api/onboarding/market-catalog — kontrakt endpointu katalogu rynku (Partia 4).
 *
 * Realny: routing + bramka isRealCareerGoal (czysta) + mapowanie odpowiedzi.
 * Mock na granicy: auth (sesja), next/headers, loadMarketCatalog (DB), logError.
 *
 * Sedno:
 *   - cel realny (jedna z 23 ścieżek) → items z loadMarketCatalog, isRealCareerGoal=true;
 *   - cel spoza listy (wolny tekst Pomocnika) → items PUSTE, isRealCareerGoal=false,
 *     DB w ogóle NIE pytana (oszczędność + uczciwy sygnał „wybierz realną ścieżkę");
 *   - brak sesji → 401; brak parametru → 400; awaria DB → 500.
 *
 * „Malejąco wg popytu" jest własnością loadMarketCatalog (sort) — pokryte w
 * src/lib/onboarding/__tests__/market-gaps.test.ts; tu pilnujemy passthrough kolejności.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockLoadMarketCatalog = vi.fn();
vi.mock("@/lib/onboarding/market-gaps", () => ({
	loadMarketCatalog: (...a: unknown[]) => mockLoadMarketCatalog(...a),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { GET } from "../route";

function makeReq(careerGoal?: string) {
	const url = new URL("http://localhost/api/onboarding/market-catalog");
	if (careerGoal !== undefined) url.searchParams.set("careerGoal", careerGoal);
	return new Request(url, { method: "GET" });
}

const CATALOG = [
	{ competencyName: "SQL", demandPercentage: 90, category: "Dane" },
	{ competencyName: "Python", demandPercentage: 70, category: "Język" },
	{ competencyName: "Docker", demandPercentage: 20, category: "DevOps" },
];

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockLoadMarketCatalog.mockResolvedValue(CATALOG);
});

describe("GET /api/onboarding/market-catalog", () => {
	it("brak sesji → 401", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await GET(makeReq("Data Analyst"));
		expect(res.status).toBe(401);
		expect(mockLoadMarketCatalog).not.toHaveBeenCalled();
	});

	it("brak parametru careerGoal → 400", async () => {
		const res = await GET(makeReq());
		expect(res.status).toBe(400);
	});

	it("pusty/whitespace careerGoal → 400", async () => {
		const res = await GET(makeReq("   "));
		expect(res.status).toBe(400);
		expect(mockLoadMarketCatalog).not.toHaveBeenCalled();
	});

	it("cel realny → 200, isRealCareerGoal=true, items z katalogu (kolejność zachowana)", async () => {
		const res = await GET(makeReq("Data Analyst"));
		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			careerGoal: string;
			isRealCareerGoal: boolean;
			items: { competencyName: string; demandPercentage: number; category: string }[];
		};
		expect(json.isRealCareerGoal).toBe(true);
		expect(json.careerGoal).toBe("Data Analyst");
		expect(mockLoadMarketCatalog).toHaveBeenCalledWith("Data Analyst");
		// Passthrough kolejności (sort robi loadMarketCatalog) + tylko 3 pola kontraktu.
		expect(json.items).toEqual(CATALOG);
	});

	it("cel spoza 23 ścieżek → 200, isRealCareerGoal=false, items PUSTE, DB nie pytana", async () => {
		const res = await GET(makeReq("Zostać astronautą NASA"));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { isRealCareerGoal: boolean; items: unknown[] };
		expect(json.isRealCareerGoal).toBe(false);
		expect(json.items).toEqual([]);
		expect(mockLoadMarketCatalog).not.toHaveBeenCalled();
	});

	it("awaria DB (loadMarketCatalog rzuca) → 500", async () => {
		mockLoadMarketCatalog.mockRejectedValueOnce(new Error("db down"));
		const res = await GET(makeReq("Data Analyst"));
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
	});
});
