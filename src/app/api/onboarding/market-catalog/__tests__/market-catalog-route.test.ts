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

const mockBuildCatalogGroups = vi.fn();
const mockGetPathProfileNote = vi.fn();
vi.mock("@/lib/onboarding/competency-groups", () => ({
	buildCatalogGroups: (...a: unknown[]) => mockBuildCatalogGroups(...a),
	getPathProfileNote: (...a: unknown[]) => mockGetPathProfileNote(...a),
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

// Widok grupowy (B2) — passthrough z buildCatalogGroups (zmockowane; realne złączenie
// pokryte w src/lib/onboarding/__tests__/competency-groups.test.ts).
const GROUPS = [
	{
		name: "Konkret bazowy",
		unionShare: 87.3,
		description: null,
		items: [
			{ competencyName: "SQL", demandPercentage: 90, kind: "tool" },
			{ competencyName: "Python", demandPercentage: 70, kind: "tool" },
		],
	},
];

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockLoadMarketCatalog.mockResolvedValue(CATALOG);
	mockBuildCatalogGroups.mockReturnValue(GROUPS);
	mockGetPathProfileNote.mockReturnValue("Profil szeroki — przykładowa nota.");
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

	it("cel realny → 200, isRealCareerGoal=true, items (z kind) + groups (kolejność zachowana)", async () => {
		const res = await GET(makeReq("Data Analyst"));
		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			careerGoal: string;
			isRealCareerGoal: boolean;
			profileNote: string | null;
			items: {
				competencyName: string;
				demandPercentage: number;
				category: string;
				kind: string | null;
			}[];
			groups: unknown[];
		};
		expect(json.isRealCareerGoal).toBe(true);
		expect(json.careerGoal).toBe("Data Analyst");
		// ETAP H: adnotacja-zastrzeżenie profilu w kontrakcie (passthrough z getPathProfileNote).
		expect(mockGetPathProfileNote).toHaveBeenCalledWith("Data Analyst");
		expect(json.profileNote).toBe("Profil szeroki — przykładowa nota.");
		expect(mockLoadMarketCatalog).toHaveBeenCalledWith("Data Analyst");
		// Passthrough kolejności (sort robi loadMarketCatalog) + kind (tu null — mock bez kind).
		expect(json.items).toEqual(CATALOG.map((i) => ({ ...i, kind: null })));
		// groups (B2) zbudowane z płaskich items; passthrough z buildCatalogGroups.
		expect(mockBuildCatalogGroups).toHaveBeenCalledWith("Data Analyst", CATALOG);
		expect(json.groups).toEqual(GROUPS);
	});

	it("cel spoza 23 ścieżek → 200, isRealCareerGoal=false, items+groups PUSTE, DB nie pytana", async () => {
		const res = await GET(makeReq("Zostać astronautą NASA"));
		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			isRealCareerGoal: boolean;
			profileNote: string | null;
			items: unknown[];
			groups: unknown[];
		};
		expect(json.isRealCareerGoal).toBe(false);
		expect(json.items).toEqual([]);
		expect(json.groups).toEqual([]);
		// Cel nierealny → nota nie pytana (jak DB) i null w odpowiedzi.
		expect(json.profileNote).toBeNull();
		expect(mockLoadMarketCatalog).not.toHaveBeenCalled();
		expect(mockBuildCatalogGroups).not.toHaveBeenCalled();
		expect(mockGetPathProfileNote).not.toHaveBeenCalled();
	});

	it("awaria DB (loadMarketCatalog rzuca) → 500", async () => {
		mockLoadMarketCatalog.mockRejectedValueOnce(new Error("db down"));
		const res = await GET(makeReq("Data Analyst"));
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
	});
});
