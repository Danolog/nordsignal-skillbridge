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
	historyRows: [] as { role: "ai" | "user"; content: string; turnIndex?: number }[],
	withTenantCalls: [] as { role: string }[],
	// Wiersze wstawione w fazie zapisu (onFinish) — kontrakt tury otwierającej:
	// TYLKO AI (otwarcie) vs para user+ai (normalna tura).
	insertedRows: [] as { role: string; content: string }[][],
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
			insert: () => ({
				values: async (rows: { role: string; content: string }[]) => {
					txState.insertedRows.push(rows);
					return undefined;
				},
			}),
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
	txState.insertedRows = [];
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
	// Domyślny mock runTurn woła onFinish (await), żeby ćwiczyć realną logikę
	// zapisu handlera (faza persist) — w tym kontrakt tury otwierającej.
	mockRunTurn.mockImplementation((args: { onFinish?: (a: { text: string }) => unknown }) => ({
		toUIMessageStreamResponse: () => new Response("stream", { status: 200 }),
		__finish: args.onFinish?.({ text: "Pytanie Pomocnika?" }),
	}));
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

	it("409 gdy ostatnia odpowiedź studenta JUŻ zapisana (turnIndex > MAX_TURNS = domknięte)", async () => {
		// Rozmowa domknięta: na 9. pytanie AI student już odpowiedział (user@10).
		// Kolejna tura = 409 (idempotencja dla stałego/powtarzającego klienta).
		txState.session = { id: VALID_ID, status: "in_progress", turn: 9, answers: {} };
		txState.historyRows = [
			{ role: "ai", content: "9. pytanie", turnIndex: 9 },
			{ role: "user", content: "ostatnia odpowiedź", turnIndex: 10 },
		];
		const res = await POST(makeReq({ userMessage: "test" }), { params });
		expect(res.status).toBe(409);
		expect(mockRunTurn).not.toHaveBeenCalled();
	});

	it("400 gdy pusty userMessage W TRAKCIE rozmowy (history niepuste = to nie otwarcie)", async () => {
		txState.session = { id: VALID_ID, status: "in_progress", turn: 1, answers: {} };
		txState.historyRows = [{ role: "ai", content: "Pierwsze pytanie?" }];
		const res = await POST(makeReq({ userMessage: "" }), { params });
		expect(res.status).toBe(400);
		expect(mockRunTurn).not.toHaveBeenCalled();
	});
});

// --- B0: tura otwierająca (kontrakt Ethana §2) — test INTEGRACYJNY ---------
// Ćwiczy PRAWDZIWY TurnSchema (Zod) + PRAWDZIWĄ logikę handlera (reguła
// otwarcia + zapis tur). Mockujemy DOPIERO granicę LLM (runTurn), nie transport
// frontu. To luka, przez którą bug B0 wyszedł na produkcję: poprzednie testy
// nie ćwiczyły realnego kontraktu wejścia dla pustej wiadomości.
describe("/turn — B0 tura otwierająca (history=[] + puste = Pomocnik pierwszy)", () => {
	it("otwarcie: history=[] + userMessage puste → NIE 400, runTurn w trybie otwierającym", async () => {
		// history pusta + turn=0 (domyślnie w beforeEach).
		const res = await POST(makeReq({ userMessage: "" }), { params });
		expect(res.status).toBe(200);
		expect(mockRunTurn).toHaveBeenCalledOnce();
		// runTurn dostał undefined (tryb otwierający), nie pusty string.
		expect(mockRunTurn.mock.calls[0][0].userMessage).toBeUndefined();
	});

	it("otwarcie działa też gdy userMessage w ogóle pominięte (brak pola)", async () => {
		const res = await POST(makeReq({}), { params });
		expect(res.status).toBe(200);
		expect(mockRunTurn.mock.calls[0][0].userMessage).toBeUndefined();
	});

	it("otwarcie ZAPISUJE tylko turę AI — żadnej pustej tury usera", async () => {
		await POST(makeReq({ userMessage: "" }), { params });
		// onFinish (await) wykonany w mocku runTurn → insert już zarejestrowany.
		await mockRunTurn.mock.results[0].value.__finish;
		expect(txState.insertedRows).toHaveLength(1);
		const rows = txState.insertedRows[0];
		expect(rows).toHaveLength(1);
		expect(rows[0].role).toBe("ai");
		expect(rows.some((r) => r.role === "user")).toBe(false);
	});

	it("normalna tura: userMessage niepuste → para user+ai", async () => {
		txState.session = { id: VALID_ID, status: "in_progress", turn: 1, answers: {} };
		txState.historyRows = [{ role: "ai", content: "Pierwsze pytanie?" }];
		const res = await POST(makeReq({ userMessage: "Lubię analizować dane" }), { params });
		expect(res.status).toBe(200);
		expect(mockRunTurn.mock.calls[0][0].userMessage).toBe("Lubię analizować dane");
		await mockRunTurn.mock.results[0].value.__finish;
		expect(txState.insertedRows).toHaveLength(1);
		const rows = txState.insertedRows[0];
		expect(rows).toHaveLength(2);
		expect(rows[0].role).toBe("user");
		expect(rows[0].content).toBe("Lubię analizować dane");
		expect(rows[1].role).toBe("ai");
	});
});

// --- B0 Sprawa B: OSTATNIA odpowiedź studenta na 9. pytanie AI ----------------
// Kontrakt Darka: ostatnia interakcja to ODPOWIEDŹ studenta, nie pytanie bez pola
// do wpisania. Gdy turn === MAX_TURNS (9. pytanie AI już na ekranie), kolejny
// /turn to OSTATNIA odpowiedź: zapis user-only, BEZ modelu (żadnego 10. pytania),
// BEZ podbicia `turn` (kolumna ma check 0..9), odpowiedź 200 {final:true}.
describe("/turn — ostatnia odpowiedź studenta (turn === MAX_TURNS)", () => {
	it("turn=9 + odpowiedź niepusta → 200 {final:true}, BEZ modelu, zapis user-only", async () => {
		txState.session = { id: VALID_ID, status: "in_progress", turn: 9, answers: {} };
		txState.historyRows = [{ role: "ai", content: "9. pytanie AI?", turnIndex: 9 }];
		const res = await POST(makeReq({ userMessage: "Moja ostatnia odpowiedź" }), { params });
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json).toEqual({ final: true, turn: 9 });
		// Żadnego 10. pytania — model NIE wołany.
		expect(mockRunTurn).not.toHaveBeenCalled();
		// Nagłówek tury zostaje na MAX_TURNS (front czyta to z odpowiedzi).
		expect(res.headers.get("x-career-helper-turn")).toBe("9");
		// Zapis: dokładnie jeden wiersz usera, turnIndex powyżej MAX_TURNS.
		expect(txState.insertedRows).toHaveLength(1);
		const rows = txState.insertedRows[0] as {
			role: string;
			content: string;
			turnIndex: number;
		}[];
		expect(rows).toHaveLength(1);
		expect(rows[0].role).toBe("user");
		expect(rows[0].content).toBe("Moja ostatnia odpowiedź");
		expect(rows[0].turnIndex).toBe(10); // MAX_TURNS + 1
	});

	it("turn=9 + odpowiedź pusta → 400 (nie domykamy rozmowy pustą odpowiedzią)", async () => {
		txState.session = { id: VALID_ID, status: "in_progress", turn: 9, answers: {} };
		txState.historyRows = [{ role: "ai", content: "9. pytanie AI?", turnIndex: 9 }];
		const res = await POST(makeReq({ userMessage: "" }), { params });
		expect(res.status).toBe(400);
		expect(mockRunTurn).not.toHaveBeenCalled();
		expect(txState.insertedRows).toHaveLength(0);
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
