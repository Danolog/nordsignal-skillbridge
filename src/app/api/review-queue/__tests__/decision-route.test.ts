// @vitest-environment node
/**
 * B8/1.4 — kontrakt POST /api/review-queue/[id]/decision.
 *
 * Realne: routing + walidacja + bramka flagi + mapowanie konfliktów + wiring
 * audytu. Mock na granicy: reviewer-auth, db, audit. Mechanikę transakcji na
 * realnej bazie (status podąża za decyzją, UNIQUE, izolacja tenantów) dowodzi
 * suita integracyjna review-queue.integration.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
	dbMock: { transaction: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

const mockCheckReviewerAuth = vi.fn();
vi.mock("@/lib/reviewer-auth", () => ({
	checkReviewerAuth: () => mockCheckReviewerAuth(),
}));

const mockRecordAudit = vi.fn();
vi.mock("@/lib/audit", () => ({ recordAudit: (...a: unknown[]) => mockRecordAudit(...a) }));

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../[id]/decision/route";

// Poprawny UUIDv4 (zod waliduje bity wersji/wariantu).
const SUB_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OPERATOR = { kind: "quality_operator", sessionId: "sess-op" };

function makeReq(body: unknown): Request {
	return new Request(`http://test.local/api/review-queue/${SUB_ID}/decision`, {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
	mockCheckReviewerAuth.mockResolvedValue(OPERATOR);
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("POST /api/review-queue/[id]/decision", () => {
	it("flaga off → 404; brak sesji recenzenta → 401", async () => {
		vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "");
		expect((await POST(makeReq({ decision: "approved" }), ctx(SUB_ID))).status).toBe(404);

		vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
		mockCheckReviewerAuth.mockResolvedValue(null);
		expect((await POST(makeReq({ decision: "approved" }), ctx(SUB_ID))).status).toBe(401);
		expect(dbMock.transaction).not.toHaveBeenCalled();
	});

	it("nie-UUID / decyzja spoza enuma / zepsuty JSON / notatka za długa → 400", async () => {
		expect((await POST(makeReq({ decision: "approved" }), ctx("nie-uuid"))).status).toBe(400);
		expect((await POST(makeReq({ decision: "maybe" }), ctx(SUB_ID))).status).toBe(400);
		expect((await POST(makeReq("nie-json{"), ctx(SUB_ID))).status).toBe(400);
		expect(
			(await POST(makeReq({ decision: "approved", note: "x".repeat(2001) }), ctx(SUB_ID))).status,
		).toBe(400);
		expect(dbMock.transaction).not.toHaveBeenCalled();
	});

	it("decided → 200 z previous/newStatus", async () => {
		dbMock.transaction.mockResolvedValue({
			outcome: "decided",
			previousStatus: "submitted",
			newStatus: "verified",
			tenantId: "t-1",
		});
		const res = await POST(makeReq({ decision: "approved" }), ctx(SUB_ID));
		expect(res.status).toBe(200);
		expect((await res.json()) as Record<string, unknown>).toMatchObject({
			decision: "approved",
			previousStatus: "submitted",
			newStatus: "verified",
		});
	});

	// ── ASERCJE AUDYTU PRZENIESIONE, NIE USUNIĘTE (D-U7, E1b, 2026-08-12) ──────
	//
	// Do 2026-08-12 ten plik sprawdzał treść wiersza audytu (`actorType`,
	// `action`, `actorId`, `targetId`) na atrapie `recordAudit`. Po D-U7 zapis
	// śladu leży WEWNĄTRZ transakcji, a `db.transaction` jest tu zaślepiony
	// wartością — czyli funkcja zwrotna transakcji NIGDY SIĘ NIE WYKONUJE i przy
	// tej granicy atrapowania audyt jest NIEOBSERWOWALNY.
	//
	// Odtworzenie go tutaj wymagałoby zbudowania atrapy całej transakcji (select
	// FOR UPDATE, insert recenzji, update statusu, uzgodnienie kompetencji,
	// unieważnienie obrony). Taki test sprawdzałby moją atrapę, nie trasę.
	//
	// Gdzie te asercje żyją teraz — NA PRAWDZIWEJ BAZIE, mocniej niż tutaj:
	//   • treść śladu i „DOKŁADNIE JEDEN wiersz" → S-U-4,
	//   • „brak dowodu ⇒ brak kredencjału" (sedno D-U7) → S-U-5,
	//     oba w `src/app/api/review-queue/__tests__/rodo-e1b-slad-decyzji-czlowieka.integration.test.ts`.
	//
	// ⚠ USUNIĘTA TU ZOSTAŁA TAKŻE asercja „not_found → ZERO audytu" i to jest
	// świadome: po D-U7 przechodziłaby ONA ZAWSZE, na każdej ścieżce, bo atrapa
	// transakcji nie wykonuje funkcji zwrotnej. Zostawiona wyglądałaby na
	// strażnika, a byłaby atrapą (CLAUDE.md v1.17). Regułę „decyzja o cudzym
	// kampusie nie zostawia śladu" pokrywa suita integracyjna
	// `review-queue.integration.test.ts` na realnej bazie.
	it("not_found z tx → 404 (nie potwierdzamy istnienia zgloszenia)", async () => {
		dbMock.transaction.mockResolvedValue({ outcome: "not_found" });
		const res = await POST(makeReq({ decision: "approved" }), ctx(SUB_ID));
		expect(res.status).toBe(404);
	});

	it("awaria transakcji (błąd niekonfliktowy) → 500 bez wycieku + logError", async () => {
		dbMock.transaction.mockRejectedValue(new Error("connection reset"));
		const res = await POST(makeReq({ decision: "approved" }), ctx(SUB_ID));
		expect(res.status).toBe(500);
		expect(((await res.json()) as { error: string }).error).toBe("Operacja nie powiodła się");
		expect(mockLogError).toHaveBeenCalled();
		expect(mockRecordAudit).not.toHaveBeenCalled();
	});
});
