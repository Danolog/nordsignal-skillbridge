import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testy trasy /select-path (F2) — bramka katalogowa + zapis celu. Mock NA GRANICY
 * bazy (withTenantContext), zero realnego API/DB. Sprawdzamy KONTRAKT trasy:
 *  - cel spoza 23 ścieżek → 400 career_goal_not_in_catalog, baza NIETKNIĘTA,
 *  - cel kanoniczny → 200, zapis ścieżki + nadpisanie students.career_goal.
 */

const mockResolveStudent = vi.fn();
vi.mock("@/lib/career-helper/session", () => ({
	resolveStudent: () => mockResolveStudent(),
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null, aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const txState = { sessionExists: true };
const mockWithTenantContext = vi.fn();
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: (_ctx: { role: string }, fn: (tx: unknown) => Promise<unknown>) =>
		mockWithTenantContext(fn),
}));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../session/[id]/select-path/route";

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const params = Promise.resolve({ id: VALID_ID });
function makeReq(body: unknown) {
	return new Request(`http://localhost/api/career-helper/session/${VALID_ID}/select-path`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	txState.sessionExists = true;
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
	mockWithTenantContext.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
		const sessionRows = txState.sessionExists ? [{ id: VALID_ID }] : [];
		const tx = {
			select: () => ({ from: () => ({ where: async () => sessionRows }) }),
			update: () => ({ set: () => ({ where: async () => undefined }) }),
			insert: () => ({ values: () => ({ returning: async () => [{ id: "scp-1" }] }) }),
		};
		return fn(tx);
	});
});

describe("/select-path — bramka katalogowa (F2)", () => {
	it("cel spoza 23 ścieżek → 400 career_goal_not_in_catalog, baza NIETKNIĘTA", async () => {
		const res = await POST(makeReq({ careerLabel: "Astronauta", source: "helper" }), { params });
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.code).toBe("career_goal_not_in_catalog");
		expect(mockWithTenantContext).not.toHaveBeenCalled();
	});

	it("near-miss (label nie dosłowny) też odrzucony — zapisujemy tylko etykietę kanoniczną", async () => {
		// select-path egzekwuje DOSŁOWNĄ przynależność (isRealCareerGoal); ugruntowanie
		// near-miss dzieje się wcześniej w /summary, więc tu „data analyst" = 400.
		const res = await POST(makeReq({ careerLabel: "data analyst", source: "helper" }), { params });
		expect(res.status).toBe(400);
		expect(mockWithTenantContext).not.toHaveBeenCalled();
	});

	it("cel kanoniczny → 200, zapis ścieżki primary", async () => {
		const res = await POST(makeReq({ careerLabel: "Data Analyst", source: "helper" }), { params });
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.studentCareerPathId).toBe("scp-1");
		expect(json.isPrimary).toBe(true);
		expect(mockWithTenantContext).toHaveBeenCalledOnce();
	});

	it("cel kanoniczny z białymi znakami → trim → 200", async () => {
		const res = await POST(makeReq({ careerLabel: "  Data Engineer  ", source: "helper" }), {
			params,
		});
		expect(res.status).toBe(200);
	});

	it("404 gdy sesja nie należy do studenta", async () => {
		txState.sessionExists = false;
		const res = await POST(makeReq({ careerLabel: "Data Analyst", source: "helper" }), { params });
		expect(res.status).toBe(404);
	});
});
