// @vitest-environment node
//
// 0.11 — cap sesji Pomocnika per student w oknie 24h (abuse budżetu LLM).
// Mock NA GRANICY: auth (resolveOrProvisionStudent), rate-limit, withTenantContext
// (kontrolowany tx zwracający wyniki count() z kolejki). Bez realnej bazy.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveStudent = vi.fn();
vi.mock("@/lib/career-helper/session", () => ({
	resolveOrProvisionStudent: () => mockResolveStudent(),
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

// Kolejka wyników count() dla kolejnych select().from().where() w tx.
const countQueue: Array<Array<{ c: number }>> = [];
const txUpdate = vi.fn(() => ({ set: () => ({ where: async () => undefined }) }));
const txInsert = vi.fn(() => ({
	values: () => ({ returning: async () => [{ id: "new-session-id" }] }),
}));
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(async (_ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => {
		const tx = {
			select: () => ({ from: () => ({ where: async () => countQueue.shift() ?? [] }) }),
			update: txUpdate,
			insert: txInsert,
		};
		return fn(tx);
	}),
}));

vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { MAX_SESSIONS_PER_DAY } from "@/lib/ai/career-helper";
import { POST } from "../route";

function makeReq() {
	return new Request("http://localhost/api/career-helper/survey", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			answers: {
				q1: "Praca z danymi",
				q2: "Analityka",
				q3: ["Python", "SQL"],
				q4: "Lubię porządkować i wyciągać wnioski z liczb.",
			},
		}),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	countQueue.length = 0;
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
});

describe("POST /survey — cap sesji 24h (0.11)", () => {
	it("pod limitem → tworzy sesję (200, sessionId)", async () => {
		countQueue.push([{ c: 3 }]); // okno 24h
		countQueue.push([{ c: 0 }]); // aktywne
		const res = await POST(makeReq());
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.sessionId).toBe("new-session-id");
		expect(txInsert).toHaveBeenCalled();
	});

	it("na limicie → 429, NIE zamyka aktywnej ani nie tworzy nowej", async () => {
		countQueue.push([{ c: MAX_SESSIONS_PER_DAY }]); // okno 24h = limit
		const res = await POST(makeReq());
		expect(res.status).toBe(429);
		// Cap sprawdzony PRZED zamknięciem/utworzeniem — brak update/insert.
		expect(txUpdate).not.toHaveBeenCalled();
		expect(txInsert).not.toHaveBeenCalled();
	});

	it("powyżej limitu → 429", async () => {
		countQueue.push([{ c: MAX_SESSIONS_PER_DAY + 5 }]);
		const res = await POST(makeReq());
		expect(res.status).toBe(429);
	});

	it("429 niesie Retry-After (0.15/C3 — klient z retry-logiką nie ponawia agresywnie)", async () => {
		countQueue.push([{ c: MAX_SESSIONS_PER_DAY }]);
		const res = await POST(makeReq());
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("3600");
	});

	it("niepoprawne body → 400 (0.15/C3 — ujednolicone z resztą tras, było 422)", async () => {
		const res = await POST(
			new Request("http://localhost/api/career-helper/survey", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers: { q1: "" } }),
			}),
		);
		expect(res.status).toBe(400);
	});
});
