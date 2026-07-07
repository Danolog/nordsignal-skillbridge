import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unit: strażnice + walidacja + ścieżka reject (bez SQL swapu — ten dowodzi
// test integracyjny E2E na realnej bazie, zgodnie z DoD AG.4).
const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		update: vi.fn(),
		transaction: vi.fn(),
	},
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

// AG.5: recompute mockowany na granicy modułu (wiring testowany niżej).
vi.mock("@/lib/market-refresh/recompute", () => ({
	runMarketRecompute: vi.fn(async () => ({
		students: 3,
		studentsWithNewGaps: 1,
		newGapsTotal: 2,
		uniqueDescriptionsGenerated: 1,
		llmCalls: 1,
		errors: 0,
	})),
}));

import { runMarketRecompute } from "@/lib/market-refresh/recompute";
import { POST } from "../[id]/decision/route";

const mockRecompute = vi.mocked(runMarketRecompute);

const TOKEN = "sekret-testowy-ag4";
// Poprawny UUIDv4 (zod waliduje bity wersji/wariantu, nie sam format 8-4-4-4-12).
const RUN_ID = "11111111-2222-4333-8444-555555555555";

function makeRequest(body: unknown, token?: string): Request {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (token !== undefined) headers["x-market-refresh-token"] = token;
	return new Request(`http://test.local/api/market-refresh/runs/${RUN_ID}/decision`, {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers,
	});
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Chain update().set().where().returning() → zadane wiersze. */
function mockUpdateReturning(rows: unknown[]) {
	const returning = vi.fn(async () => rows);
	const where = vi.fn(() => ({ returning }));
	const set = vi.fn(() => ({ where }));
	dbMock.update.mockReturnValue({ set } as never);
	return { set, where, returning };
}

describe("POST /api/market-refresh/runs/[id]/decision", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		vi.stubEnv("MARKET_REFRESH_TOKEN", TOKEN);
	});
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("flaga off → 404; zły token → 401 (wspólny guard rodziny)", async () => {
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "");
		expect((await POST(makeRequest({ decision: "reject" }, TOKEN), ctx(RUN_ID))).status).toBe(404);

		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		expect((await POST(makeRequest({ decision: "reject" }, "zly"), ctx(RUN_ID))).status).toBe(401);
	});

	it("nie-UUID w ścieżce → 400 (zanim cokolwiek dotknie bazy)", async () => {
		const res = await POST(makeRequest({ decision: "reject" }, TOKEN), ctx("nie-uuid"));
		expect(res.status).toBe(400);
		expect(dbMock.update).not.toHaveBeenCalled();
		expect(dbMock.transaction).not.toHaveBeenCalled();
	});

	it("body bez decision / decyzja spoza enuma / zepsuty JSON → 400", async () => {
		expect((await POST(makeRequest({}, TOKEN), ctx(RUN_ID))).status).toBe(400);
		expect((await POST(makeRequest({ decision: "maybe" }, TOKEN), ctx(RUN_ID))).status).toBe(400);
		expect((await POST(makeRequest("nie-json{", TOKEN), ctx(RUN_ID))).status).toBe(400);
	});

	it("reject: UPDATE ze strażnicą status='staged'; prodChanged=false; ZERO transakcji swapu", async () => {
		mockUpdateReturning([{ id: RUN_ID }]);
		const res = await POST(makeRequest({ decision: "reject" }, TOKEN), ctx(RUN_ID));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { decision: string; prodChanged: boolean };
		expect(body.decision).toBe("rejected");
		expect(body.prodChanged).toBe(false);
		expect(dbMock.transaction).not.toHaveBeenCalled();
	});

	it("reject przebiegu z już zapadłą decyzją (0 wierszy z UPDATE) → 409", async () => {
		mockUpdateReturning([]);
		const res = await POST(makeRequest({ decision: "reject" }, TOKEN), ctx(RUN_ID));
		expect(res.status).toBe(409);
	});

	it("accept OK → AG.5: recompute wywołany z runId PO swapie; podsumowanie w odpowiedzi", async () => {
		dbMock.transaction.mockResolvedValue({ rows: 240 });
		const res = await POST(makeRequest({ decision: "accept" }, TOKEN), ctx(RUN_ID));
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			recompute: { llmCalls: number };
			recomputeFailed?: boolean;
		};
		expect(mockRecompute).toHaveBeenCalledExactlyOnceWith({ runId: RUN_ID });
		expect(body.recompute.llmCalls).toBe(1);
		expect(body.recomputeFailed).toBeUndefined();
	});

	it("accept OK, ale recompute pada → swap ZOSTAJE (200), recomputeFailed + wskazówka retry", async () => {
		dbMock.transaction.mockResolvedValue({ rows: 240 });
		mockRecompute.mockRejectedValueOnce(new Error("db hiccup"));
		const res = await POST(makeRequest({ decision: "accept" }, TOKEN), ctx(RUN_ID));
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			prodChanged: boolean;
			recomputeFailed?: boolean;
			retry?: string;
		};
		expect(body.prodChanged).toBe(true);
		expect(body.recomputeFailed).toBe(true);
		expect(body.retry).toContain("/api/market-refresh/recompute");
	});

	it("reject NIE wywołuje recompute (prod bez zmian = nie ma czego przeliczać)", async () => {
		mockUpdateReturning([{ id: RUN_ID }]);
		await POST(makeRequest({ decision: "reject" }, TOKEN), ctx(RUN_ID));
		expect(mockRecompute).not.toHaveBeenCalled();
	});

	it("accept: awaria transakcji (błąd nie-konfliktowy) → 500 bez wycieku szczegółów", async () => {
		// Mapowanie strażnic na 409 dowodzi test integracyjny (realne strażnice
		// w realnej tx — SwapConflictError to klasa prywatna route'a).
		dbMock.transaction.mockRejectedValue(new Error("connection reset"));
		const res = await POST(makeRequest({ decision: "accept" }, TOKEN), ctx(RUN_ID));
		expect(res.status).toBe(500);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("Operacja nie powiodła się");
	});
});
