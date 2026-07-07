// @vitest-environment node
/**
 * AG.6 — kontrakt tras POST /api/market-notifications/{consent,read}.
 *
 * Realne: routing + walidacja + bramka flagi. Mock na granicy: auth (sesja),
 * next/headers, db, logError. Mechanikę na realnej bazie (zdarzenie u
 * dotkniętego studenta, nie u innych; mark-read; bramkowanie zgodą) dowodzi
 * suita integracyjna market-notifications.integration.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		update: vi.fn(),
		query: { students: { findFirst: vi.fn() } },
	},
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST as consentPOST } from "../consent/route";
import { POST as readPOST } from "../read/route";

const SESSION = { user: { id: "user-1" } };

function consentReq(body: unknown): Request {
	return new Request("http://test.local/api/market-notifications/consent", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

/** Chain update().set().where().returning() → zadane wiersze. */
function mockUpdateReturning(rows: unknown[]) {
	const returning = vi.fn(async () => rows);
	const where = vi.fn(() => ({ returning }));
	// Parametr jawnie typowany — bez niego mock.calls to krotka `[]` i odczyt
	// patcha w asercjach nie przechodzi typecheku.
	const set = vi.fn((_patch: Record<string, unknown>) => ({ where }));
	dbMock.update.mockReturnValue({ set } as never);
	return { set, where, returning };
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "1");
	mockGetSession.mockResolvedValue(SESSION);
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("POST /api/market-notifications/consent", () => {
	it("flaga off → 404 zanim cokolwiek się wydarzy (nawet auth)", async () => {
		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "");
		const res = await consentPOST(consentReq({ consent: true }));
		expect(res.status).toBe(404);
		expect(mockGetSession).not.toHaveBeenCalled();
	});

	it("brak sesji → 401", async () => {
		mockGetSession.mockResolvedValue(null);
		expect((await consentPOST(consentReq({ consent: true }))).status).toBe(401);
	});

	it("body bez consent / nie-boolean / zepsuty JSON → 400", async () => {
		expect((await consentPOST(consentReq({}))).status).toBe(400);
		expect((await consentPOST(consentReq({ consent: "tak" }))).status).toBe(400);
		expect((await consentPOST(consentReq("nie-json{"))).status).toBe(400);
		expect(dbMock.update).not.toHaveBeenCalled();
	});

	it("zgoda TAK: update students (consent + decided_at), odpowiedź z consent=true", async () => {
		const { set } = mockUpdateReturning([{ id: "s-1" }]);
		const res = await consentPOST(consentReq({ consent: true }));
		expect(res.status).toBe(200);
		expect((await res.json()) as { consent: boolean }).toMatchObject({ consent: true });
		const patch = set.mock.calls[0][0];
		expect(patch.marketMonitoringConsent).toBe(true);
		expect(patch.marketMonitoringDecidedAt).toBeInstanceOf(Date);
	});

	it("wycofanie zgody (RODO): consent=false przechodzi tym samym endpointem", async () => {
		const { set } = mockUpdateReturning([{ id: "s-1" }]);
		const res = await consentPOST(consentReq({ consent: false }));
		expect(res.status).toBe(200);
		expect(set.mock.calls[0][0].marketMonitoringConsent).toBe(false);
	});

	it("sesja bez rekordu studenta (0 wierszy z UPDATE) → 404", async () => {
		mockUpdateReturning([]);
		expect((await consentPOST(consentReq({ consent: true }))).status).toBe(404);
	});
});

describe("POST /api/market-notifications/read", () => {
	it("flaga off → 404; brak sesji → 401", async () => {
		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "");
		expect((await readPOST()).status).toBe(404);

		vi.stubEnv("FLAG_MARKET_GAP_NOTIFICATIONS", "1");
		mockGetSession.mockResolvedValue(null);
		expect((await readPOST()).status).toBe(401);
	});

	it("oznacza nieprzeczytane i zwraca licznik; idempotencja = marked 0 przy braku", async () => {
		dbMock.query.students.findFirst.mockResolvedValue({ id: "s-1" });
		mockUpdateReturning([{ id: "e-1" }, { id: "e-2" }]);
		const res = await readPOST();
		expect(res.status).toBe(200);
		expect((await res.json()) as { marked: number }).toMatchObject({ marked: 2 });

		mockUpdateReturning([]);
		expect(((await (await readPOST()).json()) as { marked: number }).marked).toBe(0);
	});

	it("sesja bez rekordu studenta → 404, zero update'ów", async () => {
		dbMock.query.students.findFirst.mockResolvedValue(undefined);
		expect((await readPOST()).status).toBe(404);
		expect(dbMock.update).not.toHaveBeenCalled();
	});

	it("awaria DB → 500 bez wycieku szczegółów + logError", async () => {
		dbMock.query.students.findFirst.mockRejectedValue(new Error("boom"));
		const res = await readPOST();
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
	});
});
