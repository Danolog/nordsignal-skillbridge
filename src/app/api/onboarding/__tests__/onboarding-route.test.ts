import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/onboarding — kontrakt walidacji po PRZEBUDOWIE Partii 4.
 *
 * CO SIĘ ZMIENIŁO (flip bramy #3): próg „min 5 kompetencji" ZNIESIONY (D5). Kontrakt
 * `competencies` to teraz UNIA:
 *   • NOWY (onboarding): tablica obiektów { name, level∈{2,3,4}, marketPercentage, inSyllabus? }.
 *     0 zaznaczeń dozwolone (pusta tablica → ścieżka nowa, 0% pokrycia = uczciwy start).
 *     Luki liczone DETERMINISTYCZNIE (persistMarketGaps), NIE modelem.
 *   • LEGACY (profil-editor): tablica nazw (string[]) — stara ścieżka (generateGaps).
 *     Nietknięta, by nie zepsuć edytora profilu poza zakresem Partii 4.
 *
 * Co testujemy realnie (route handler + OnboardingSchema), DB/AI zamockowane na granicy:
 *   - 0 kompetencji → 200 (próg zniesiony — sedno flipu);
 *   - nowy kontrakt (obiekty z poziomem) → ścieżka persistMarketGaps (NIE generateGaps);
 *   - legacy string[] zachowany → ścieżka generateGaps (NIE persistMarketGaps);
 *   - poziom spoza {2,3,4} / % popytu poza zakresem → 400 PRZED bazą;
 *   - 401 bez sesji.
 *
 * Mock NA GRANICY: auth, rate-limit, tenant-mapping, tenant-context (DB), persistMarketGaps,
 * AI (generateGaps/generateSkillMap). Realny: parsowanie body + OnboardingSchema + routing ścieżki.
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

// withTenantContext: pomija realny DB — zwraca stały studentId. Callback NIE jest
// wołany (resolve wprost), więc insert competencies/levelToStatus się nie wykonują —
// ten test pilnuje kontraktu walidacji + ROUTINGU ścieżki, nie persystencji wierszy.
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

// Ścieżka LEGACY (profil-editor) — luki przez model.
const mockGenerateGaps = vi.fn(async () => undefined);
const mockGenerateSkillMap = vi.fn(async () => undefined);
vi.mock("@/lib/ai/generate-gaps", () => ({ generateGaps: () => mockGenerateGaps() }));
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
	mockWithTenant.mockResolvedValue("student-1");
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
		// Pusta tablica = NOWY kontrakt (0 zaznaczeń): ścieżka deterministyczna, nie model.
		expect(mockPersistMarketGaps).toHaveBeenCalledOnce();
		expect(mockGenerateGaps).not.toHaveBeenCalled();
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
	});

	it("nowy kontrakt (obiekty z poziomem) → ścieżka persistMarketGaps, NIE generateGaps", async () => {
		const competencies = [comp("SQL", 3, 90), comp("Python", 2, 70), comp("Pandas", 4, 40)];
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);
		// persistMarketGaps dostaje NAZWY zaznaczonych (wejście liczenia luk deterministycznych).
		expect(mockPersistMarketGaps).toHaveBeenCalledOnce();
		const args = mockPersistMarketGaps.mock.calls[0] as unknown[];
		expect(args[3]).toEqual(["SQL", "Python", "Pandas"]); // (studentId, tenantId, careerGoal, names)
		expect(mockGenerateGaps).not.toHaveBeenCalled();
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
	});

	it("LEGACY string[] zachowany (profil-editor) → ścieżka generateGaps, NIE persistMarketGaps", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: ["Python", "SQL", "Git"] }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean };
		expect(json.success).toBe(true);
		// Stringi → kontrakt legacy → model (zachowanie sprzed Partii 4 nietknięte).
		expect(mockGenerateGaps).toHaveBeenCalledOnce();
		expect(mockPersistMarketGaps).not.toHaveBeenCalled();
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
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
