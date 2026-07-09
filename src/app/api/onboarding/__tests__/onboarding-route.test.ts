import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/onboarding — kontrakt walidacji po Partii 4 i kasacji legacy (AG.2).
 *
 * Kontrakt `competencies` to JEDNA forma (AG.2, 2026-07-07): tablica obiektów
 * { name, level∈{2,3,4}, marketPercentage, inSyllabus? }. 0 zaznaczeń dozwolone
 * (pusta tablica → 0% pokrycia = uczciwy start, D5). Luki liczone
 * DETERMINISTYCZNIE (persistMarketGaps), NIE modelem. Gałąź LEGACY (string[]
 * → generateGaps) USUNIĘTA — stary kontrakt pada na walidacji (400).
 *
 * Co testujemy realnie (route handler + OnboardingSchema), DB zamockowane na granicy:
 *   - 0 kompetencji → 200 (próg zniesiony);
 *   - obiekty z poziomem → persistMarketGaps z nazwami zaznaczonych;
 *   - LEGACY string[] → 400 PRZED bazą (dowód kasacji AG.2);
 *   - poziom spoza {2,3,4} / % popytu poza zakresem → 400 PRZED bazą;
 *   - 401 bez sesji.
 *
 * Mock NA GRANICY: auth, rate-limit, tenant-mapping, tenant-context (DB),
 * persistMarketGaps, generateSkillMap. Realny: parsowanie body + OnboardingSchema.
 */

// --- Mocks na granicy (zero realnej bazy, zero realnego LLM) -----------------

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));

vi.mock("@/lib/db/tenant-mapping", () => ({
	resolveTenantId: vi.fn(async () => "tenant-test"),
}));

// withTenantContext: pomija realny DB — zwraca kontrakt transakcji 1.12
// {studentId, possessedNames}. Callback NIE jest wołany (resolve wprost), więc
// insert competencies/levelToStatus się nie wykonują — ten test pilnuje kontraktu
// walidacji + ROUTINGU (possessedNames z tx → persistMarketGaps), nie persystencji;
// semantykę filtra statusów (§4a) dowodzi onboarding-diagnosis.integration.test.ts.
const mockWithTenant = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
		mockWithTenant(ctx, fn),
}));

// Ścieżka DETERMINISTYCZNA (nowy kontrakt) — zapis luk + pokrycia. Mock na granicy DB.
const mockPersistMarketGaps = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock("@/lib/onboarding/market-gaps", () => ({
	persistMarketGaps: (...a: unknown[]) => mockPersistMarketGaps(...a),
}));

const mockGenerateSkillMap = vi.fn(async () => undefined);
vi.mock("@/lib/ai/generate-skill-map", () => ({ generateSkillMap: () => mockGenerateSkillMap() }));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../route";

const VALID_PROFILE = {
	university: "Politechnika Testowa",
	fieldOfStudy: "Informatyka",
	semester: 4,
	careerGoal: "Data Analyst",
	syllabusText: "",
};

/** Obiekt kompetencji nowego kontraktu (poziom posiadania 2/3/4 + % popytu). */
function comp(name: string, level: 2 | 3 | 4, marketPercentage = 50) {
	return { name, level, marketPercentage, inSyllabus: false };
}

function makeReq(body: unknown) {
	return new Request("http://localhost/api/onboarding", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockWithTenant.mockResolvedValue({
		studentId: "student-1",
		possessedNames: ["SQL", "Python", "Pandas"],
	});
});

describe("POST /api/onboarding — kontrakt Partii 4 (próg min-5 zniesiony)", () => {
	it("401 gdy brak sesji (sanity — kontrakt nie maskuje auth)", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: [comp("SQL", 3)] }));
		expect(res.status).toBe(401);
	});

	it("0 kompetencji (pusta tablica) → 200 success (próg zniesiony, D5 — sedno flipu)", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: [] }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; studentId: string };
		expect(json.success).toBe(true);
		expect(json.studentId).toBe("student-1");
		// Pusta tablica = 0 zaznaczeń: ścieżka deterministyczna liczy luki z całego katalogu.
		expect(mockPersistMarketGaps).toHaveBeenCalledOnce();
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
	});

	it("obiekty z poziomem → persistMarketGaps z nazwami zaznaczonych", async () => {
		const competencies = [comp("SQL", 3, 90), comp("Python", 2, 70), comp("Pandas", 4, 40)];
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);
		// persistMarketGaps dostaje POSIADANE z kontraktu transakcji (1.12: status ≠
		// missing — tu z mocka withTenantContext; semantyka filtra w teście integracyjnym).
		expect(mockPersistMarketGaps).toHaveBeenCalledOnce();
		const args = mockPersistMarketGaps.mock.calls[0] as unknown[];
		expect(args[3]).toEqual(["SQL", "Python", "Pandas"]); // (studentId, tenantId, careerGoal, possessedNames)
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
	});

	it("AG.2: LEGACY string[] → 400 PRZED bazą (gałąź modelu skasowana, DoD kasacji)", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: ["Python", "SQL", "Git"] }));
		expect(res.status).toBe(400);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe("Invalid input");
		// Walidacja odrzuca PRZED withTenantContext i PRZED liczeniem luk.
		expect(mockWithTenant).not.toHaveBeenCalled();
		expect(mockPersistMarketGaps).not.toHaveBeenCalled();
	});

	it("poziom spoza {2,3,4} (np. 1 = Brak, albo 5) → 400 PRZED bazą", async () => {
		const res1 = await POST(
			makeReq({
				...VALID_PROFILE,
				competencies: [{ name: "SQL", level: 1, marketPercentage: 50 }],
			}),
		);
		expect(res1.status).toBe(400);
		const res5 = await POST(
			makeReq({
				...VALID_PROFILE,
				competencies: [{ name: "SQL", level: 5, marketPercentage: 50 }],
			}),
		);
		expect(res5.status).toBe(400);
		// Walidacja odrzuca PRZED withTenantContext — żaden zapis nie ruszył.
		expect(mockWithTenant).not.toHaveBeenCalled();
	});

	it("% popytu poza zakresem 0–100 → 400 (kontrakt marketPercentage)", async () => {
		const res = await POST(
			makeReq({
				...VALID_PROFILE,
				competencies: [{ name: "SQL", level: 3, marketPercentage: 150 }],
			}),
		);
		expect(res.status).toBe(400);
		expect(mockWithTenant).not.toHaveBeenCalled();
	});

	it("F2 — własny cel spoza 23 (edytor profilu) NADAL przechodzi (brak bramki katalogowej tu)", async () => {
		// Endpoint współdzielony z profil-editor.tsx, który celowo dopuszcza custom goal.
		// F2 świadomie NIE bramkuje tu na katalog 23 — wyciek z Pomocnika zamknięty u źródła.
		const res = await POST(
			makeReq({ ...VALID_PROFILE, careerGoal: "Mój własny cel", competencies: [comp("SQL", 3)] }),
		);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);
	});

	it("F2 — careerGoal z białymi znakami jest trymowany (higiena)", async () => {
		const res = await POST(
			makeReq({ ...VALID_PROFILE, careerGoal: "  Data Analyst  ", competencies: [comp("SQL", 3)] }),
		);
		expect(res.status).toBe(200);
		// persistMarketGaps dostaje przycięty cel (3. arg = careerGoal).
		const args = mockPersistMarketGaps.mock.calls[0] as unknown[];
		expect(args[2]).toBe("Data Analyst");
	});

	it("brak wymaganego pola profilu (university) → 400 Invalid input", async () => {
		const { university: _drop, ...noUni } = VALID_PROFILE;
		const res = await POST(makeReq({ ...noUni, competencies: [comp("SQL", 3)] }));
		expect(res.status).toBe(400);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe("Invalid input");
	});

	it("awaria generacji (persistMarketGaps rzuca) → 200 z aiGenerationFailed (profil zapisany)", async () => {
		mockPersistMarketGaps.mockRejectedValueOnce(new Error("db down"));
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: [comp("SQL", 3)] }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; aiGenerationFailed?: boolean };
		expect(json.success).toBe(true);
		expect(json.aiGenerationFailed).toBe(true);
	});
});
