import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks (zero realnego LLM, zero realnej bazy) ---------------------------

const mockResolveStudent = vi.fn();
vi.mock("@/lib/career-helper/session", () => ({
	resolveStudent: () => mockResolveStudent(),
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null, aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

// withTenantContext: wykonuje callback z fałszywym tx, podstawiając wyniki zapytań.
const txState = {
	session: null as null | {
		id: string;
		status: string;
		turn: number;
		answers: unknown;
	},
	historyRows: [] as { role: "ai" | "user"; content: string }[],
	withTenantCalls: [] as { role: string }[],
};
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(async (ctx: { role: string }, fn: (tx: unknown) => Promise<unknown>) => {
		txState.withTenantCalls.push({ role: ctx.role });
		// Fałszywy tx — łańcuch query-builderów. `where()` zwraca realny Promise
		// (rzędy sesji) z doczepionym `orderBy` (historia), bez ręcznego `then`.
		const sessionRows = txState.session ? [txState.session] : [];
		const where = () =>
			Object.assign(Promise.resolve(sessionRows), {
				orderBy: async () => txState.historyRows,
			});
		const tx = {
			select: () => ({ from: () => ({ where }) }),
			insert: () => ({ values: async () => undefined }),
			update: () => ({ set: () => ({ where: async () => undefined }) }),
		};
		return fn(tx);
	}),
}));

// runTurn: nie woła modelu — zwraca obiekt z toUIMessageStreamResponse + onFinish capture.
const mockRunTurn = vi.fn();
vi.mock("@/lib/ai/career-helper", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		runTurn: (args: unknown) => mockRunTurn(args),
	};
});

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { detectCrisis } from "@/lib/ai/career-helper";
import { POST } from "../session/[id]/turn/route";

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function makeReq(body: unknown) {
	return new Request(`http://localhost/api/career-helper/session/${VALID_ID}/turn`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}
const params = Promise.resolve({ id: VALID_ID });

beforeEach(() => {
	vi.clearAllMocks();
	txState.session = {
		id: VALID_ID,
		status: "in_progress",
		turn: 0,
		answers: { q1: "a" },
	};
	txState.historyRows = [];
	txState.withTenantCalls = [];
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
	mockRunTurn.mockReturnValue({
		toUIMessageStreamResponse: () => new Response("stream", { status: 200 }),
	});
});

describe("/turn — auth + izolacja tenanta", () => {
	it("401 gdy brak studenta", async () => {
		mockResolveStudent.mockResolvedValue({ ok: false, status: 401 });
		const res = await POST(makeReq({ userMessage: "cześć" }), { params });
		expect(res.status).toBe(401);
	});

	it("praca na bazie idzie przez withTenantContext({role:student}) PRZED strumieniem", async () => {
		const res = await POST(makeReq({ userMessage: "lubię dane" }), { params });
		expect(res.status).toBe(200);
		// Odczyt sesji+historii zamknięty w withTenantContext z rolą student.
		expect(txState.withTenantCalls.length).toBeGreaterThanOrEqual(1);
		expect(txState.withTenantCalls.every((c) => c.role === "student")).toBe(true);
		// runTurn dostał historię i wiadomość — ale NIE tx (brak DB w strumieniu).
		expect(mockRunTurn).toHaveBeenCalledOnce();
		const arg = mockRunTurn.mock.calls[0][0];
		expect(arg).toHaveProperty("onFinish");
		expect(arg).not.toHaveProperty("tx");
	});
});

describe("/turn — filtr kryzysowy PRZED modelem", () => {
	it("trafienie kryzysu NIE woła modelu i zwraca crisis", async () => {
		const res = await POST(makeReq({ userMessage: "nie chcę już żyć" }), { params });
		const json = await res.json();
		expect(json).toEqual({ crisis: true });
		expect(mockRunTurn).not.toHaveBeenCalled();
		// detectCrisis to ten sam filtr (sanity).
		expect(detectCrisis("nie chcę już żyć")).toBe(true);
	});
});

describe("/turn — stany sesji", () => {
	it("404 gdy sesja nie istnieje", async () => {
		txState.session = null;
		const res = await POST(makeReq({ userMessage: "test" }), { params });
		expect(res.status).toBe(404);
	});

	it("409 gdy osiągnięty limit tur (turn >= 9)", async () => {
		txState.session = { id: VALID_ID, status: "in_progress", turn: 9, answers: {} };
		const res = await POST(makeReq({ userMessage: "test" }), { params });
		expect(res.status).toBe(409);
	});

	it("400 gdy pusty userMessage", async () => {
		const res = await POST(makeReq({ userMessage: "" }), { params });
		expect(res.status).toBe(400);
		expect(mockRunTurn).not.toHaveBeenCalled();
	});
});

describe("/turn — brak PII w logach", () => {
	it("logError przy błędzie nie dostaje treści rozmowy ani userMessage", async () => {
		// Wymuś błąd w prep: withTenantContext rzuca.
		const { withTenantContext } = await import("@/lib/db/tenant-context");
		vi.mocked(withTenantContext).mockRejectedValueOnce(new Error("db down"));
		const res = await POST(makeReq({ userMessage: "moja prywatna historia" }), { params });
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
		// Kontekst logu = tylko studentId, bez treści/PII.
		const ctx = mockLogError.mock.calls[0][2] ?? {};
		expect(ctx).toEqual({ studentId: "student-1" });
		const serialized = JSON.stringify(mockLogError.mock.calls);
		expect(serialized).not.toContain("moja prywatna historia");
	});
});
