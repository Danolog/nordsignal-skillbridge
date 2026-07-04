// @vitest-environment node
//
// A1 (paczka LOW 0.15, podniesione) — guardy restartu sesji Pomocnika.
// Obejście 0.11: wielokrotny POST /restart na PIERWOTNYM id sesji (status już
// "restarted", restartCount=0) tworzył za każdym razem świeżą sesję in_progress —
// nieograniczenie, z pominięciem MAX_RESTARTS i capu dziennego. Fix: restart tylko
// z sesji in_progress (409) + okno 24h jak w survey (429).
// Mock NA GRANICY: auth, rate-limit, withTenantContext (tx z kolejką selectów).

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveStudent = vi.fn();
vi.mock("@/lib/career-helper/session", () => ({
	resolveStudent: () => mockResolveStudent(),
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

// Kolejka wyników dla kolejnych tx.select().from().where():
// 1. fetch starej sesji, 2. count okna 24h.
const selectQueue: Array<Array<Record<string, unknown>>> = [];
const txUpdate = vi.fn(() => ({ set: () => ({ where: async () => undefined }) }));
const txInsert = vi.fn(() => ({
	values: () => ({ returning: async () => [{ id: "restarted-session-id" }] }),
}));
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(async (_ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => {
		const tx = {
			select: () => ({ from: () => ({ where: async () => selectQueue.shift() ?? [] }) }),
			update: txUpdate,
			insert: txInsert,
		};
		return fn(tx);
	}),
}));

vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { MAX_RESTARTS, MAX_SESSIONS_PER_DAY } from "@/lib/ai/career-helper";
import { POST } from "../[id]/restart/route";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: SESSION_ID }) };
const makeReq = () =>
	new Request(`http://localhost/api/career-helper/session/${SESSION_ID}/restart`, {
		method: "POST",
	});

const activeSession = (restartCount = 0) => ({
	id: SESSION_ID,
	status: "in_progress",
	answers: { q1: "a" },
	restartCount,
});

beforeEach(() => {
	vi.clearAllMocks();
	selectQueue.length = 0;
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
});

describe("POST /restart — guardy (A1)", () => {
	it("aktywna sesja pod capami → 200, nowa sesja z restartCount+1", async () => {
		selectQueue.push([activeSession(0)]); // fetch old
		selectQueue.push([{ c: 2 }]); // okno 24h
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.sessionId).toBe("restarted-session-id");
		expect(txUpdate).toHaveBeenCalled();
		expect(txInsert).toHaveBeenCalled();
	});

	it("sesja już zastąpiona (status=restarted) → 409, ZERO nowych sesji (zamyka obejście 0.11)", async () => {
		selectQueue.push([{ ...activeSession(0), status: "restarted" }]);
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(409);
		expect(txUpdate).not.toHaveBeenCalled();
		expect(txInsert).not.toHaveBeenCalled();
	});

	it("sesja completed → 409 (restart tylko z in_progress)", async () => {
		selectQueue.push([{ ...activeSession(0), status: "completed" }]);
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(409);
		expect(txInsert).not.toHaveBeenCalled();
	});

	it("restartCount >= MAX_RESTARTS → 409 (dotychczasowy cap zachowany)", async () => {
		selectQueue.push([activeSession(MAX_RESTARTS)]);
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(409);
		expect(txInsert).not.toHaveBeenCalled();
	});

	it("okno 24h na limicie → 429, nie zamyka starej ani nie tworzy nowej", async () => {
		selectQueue.push([activeSession(0)]);
		selectQueue.push([{ c: MAX_SESSIONS_PER_DAY }]);
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(429);
		expect(txUpdate).not.toHaveBeenCalled();
		expect(txInsert).not.toHaveBeenCalled();
	});

	it("sesja nie istnieje → 404", async () => {
		selectQueue.push([]);
		const res = await POST(makeReq(), ctx);
		expect(res.status).toBe(404);
	});
});
