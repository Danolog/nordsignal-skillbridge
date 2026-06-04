import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Brama #3 (serwer) — walidacja progu min. 5 kompetencji na realnym route handlerze
 * POST /api/onboarding.
 *
 * Co testujemy realnie:
 * - Zod `competencies.min(5)` = obrona w głąb (sekcja 4 route.ts). Ścieżka <5 → 400
 *   NIE dotyka bazy: Zod odrzuca PRZED withTenantContext, więc to czysty test
 *   kontraktu walidacji bez kontenera Postgres (skill QA §3 — realny poziom, nie atrapa
 *   walidacji która jest sednem #3).
 * - Komunikat progu wyciągany na wierzch jako `error` ("Wymagane minimum 5 kompetencji"),
 *   nie tylko surowy flatten() — to kontrakt z frontem (handleSubmit czyta data.error).
 * - Ścieżka ≥5 przechodzi walidację Zod (NIE 400) — pokryta na poziomie walidacji
 *   (DB/AI zamockowane na granicy), bo sednem #3 jest próg, nie persystencja.
 *
 * Mock NA GRANICY: auth (sesja), rate-limit, tenant-mapping, tenant-context (DB),
 * AI (generateGaps/generateSkillMap). Realny pozostaje: parsowanie body + OnboardingSchema
 * + gałąź 400 z komunikatem progu.
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

// next/headers — route woła headers(); zwracamy pustą instancję.
vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));

vi.mock("@/lib/db/tenant-mapping", () => ({
	resolveTenantId: vi.fn(async () => "tenant-test"),
}));

// withTenantContext: pomija realny DB — zwraca stały studentId. Ćwiczy się tylko
// gdy walidacja przeszła (ścieżka ≥5), co potwierdza że Zod NIE odrzucił.
const mockWithTenant = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
		mockWithTenant(ctx, fn),
}));

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

function makeReq(body: unknown) {
	return new Request("http://localhost/api/onboarding", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function names(n: number): string[] {
	return Array.from({ length: n }, (_, i) => `Kompetencja ${i + 1}`);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	// Domyślnie withTenantContext zwraca studentId (gdy walidacja przejdzie).
	mockWithTenant.mockResolvedValue("student-1");
});

describe("POST /api/onboarding — brama #3: próg min. 5 kompetencji (walidacja serwera)", () => {
	it("401 gdy brak sesji (sanity — bramka nie maskuje auth)", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: names(5) }));
		expect(res.status).toBe(401);
	});

	it("<5 (4 kompetencje) → 400 z komunikatem 'Wymagane minimum 5 kompetencji'", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: names(4) }));
		expect(res.status).toBe(400);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe("Wymagane minimum 5 kompetencji");
		// Zod odrzucił PRZED bazą — żaden zapis nie ruszył.
		expect(mockWithTenant).not.toHaveBeenCalled();
	});

	it("granica: 4 → 400, 5 → przechodzi walidację (NIE 400)", async () => {
		// 4 = poniżej progu → 400
		const res4 = await POST(makeReq({ ...VALID_PROFILE, competencies: names(4) }));
		expect(res4.status).toBe(400);

		// 5 = na progu → walidacja Zod NIE odrzuca (kod idzie do persystencji).
		const res5 = await POST(makeReq({ ...VALID_PROFILE, competencies: names(5) }));
		expect(res5.status).not.toBe(400);
		// Dowód że przeszliśmy walidację: handler dotarł do withTenantContext.
		expect(mockWithTenant).toHaveBeenCalledOnce();
	});

	it("0 kompetencji → 400 z komunikatem progu (nie surowy 500/crash)", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: [] }));
		expect(res.status).toBe(400);
		const json = (await res.json()) as { error: string };
		expect(json.error).toBe("Wymagane minimum 5 kompetencji");
	});

	it("≥5 (5 kompetencji) → 200 success (happy path na poziomie walidacji + zamockowana persystencja)", async () => {
		const res = await POST(makeReq({ ...VALID_PROFILE, competencies: names(5) }));
		expect(res.status).toBe(200);
		const json = (await res.json()) as { success: boolean; studentId: string };
		expect(json.success).toBe(true);
		expect(json.studentId).toBe("student-1");
		// AI wystartowało dopiero po przejściu walidacji (potwierdza ≥5 = OK).
		expect(mockGenerateGaps).toHaveBeenCalledOnce();
		expect(mockGenerateSkillMap).toHaveBeenCalledOnce();
	});
});
