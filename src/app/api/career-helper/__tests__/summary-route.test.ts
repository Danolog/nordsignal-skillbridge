import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testy trasy /summary (B0 Sprawa A) — mock NA GRANICY LLM (generateSummary),
 * zero realnego API, zero realnej bazy.
 *
 * OGRANICZENIE TESTU (świadome): mock zastępuje generateSummary, więc NIE
 * ćwiczy realnego identyfikatora modelu (SUMMARY_MODEL_ID / JUDGE_MODEL_ID).
 * Błąd „model not found" (np. wycofany claude-opus-4-7 → 404 → 500 na proda)
 * jest niewykrywalny mockiem — jedynym łapaczem jest realny smoke trasy /summary
 * z ważnym kluczem Anthropic. Tu sprawdzamy KONTRAKT trasy: poprawne mapowanie
 * wyniku generateSummary na 200 JSON oraz mapowanie wyjątku LLM na 500 z tagiem
 * career-helper.summary.generate (sygnatura błędu z proda).
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

const txState = {
	session: null as null | { id: string; answers: unknown },
	historyRows: [] as { role: "ai" | "user"; content: string }[],
};
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(
		async (_ctx: { role: string }, fn: (tx: unknown) => Promise<unknown>) => {
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
		},
	),
}));

const mockGenerateSummary = vi.fn();
vi.mock("@/lib/ai/career-helper", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, generateSummary: (args: unknown) => mockGenerateSummary(args) };
});

const mockLogError = vi.fn();
vi.mock("@/lib/log", () => ({ logError: (...a: unknown[]) => mockLogError(...a) }));

import { POST } from "../session/[id]/summary/route";

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const params = Promise.resolve({ id: VALID_ID });
function makeReq() {
	return new Request(`http://localhost/api/career-helper/session/${VALID_ID}/summary`, {
		method: "POST",
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	txState.session = { id: VALID_ID, answers: { q1: "a" } };
	txState.historyRows = [{ role: "user", content: "lubię dane" }];
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
});

describe("/summary — mapowanie wyniku generateSummary (granica LLM zamockowana)", () => {
	it("judged=true → 200 z podsumowaniem (BEZ probability), karmiony historią sesji", async () => {
		mockGenerateSummary.mockResolvedValue({
			judged: true,
			judgedFor: "R2",
			summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi.",
			careerPaths: [{ label: "Analityka danych", why: "Lubisz porządkować informacje." }],
		});
		const res = await POST(makeReq(), { params });
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.judged).toBe(true);
		expect(json.judgedFor).toBe("R2");
		for (const p of json.careerPaths) {
			expect(Object.keys(p).sort()).toEqual(["label", "why"]);
		}
		// generateSummary dostał odczytane answers + history (a nie tx).
		expect(mockGenerateSummary).toHaveBeenCalledOnce();
		const arg = mockGenerateSummary.mock.calls[0][0];
		expect(arg.answers).toEqual({ q1: "a" });
		expect(arg.history).toEqual([{ role: "user", content: "lubię dane" }]);
	});

	it("judged=false (sędzia odmówił 2×) → 200 (stan kontraktu, NIE błąd)", async () => {
		mockGenerateSummary.mockResolvedValue({
			judged: false,
			judgedFor: "warstwa4_failed",
			summaryText: null,
			careerPaths: [{ label: "Analityka danych", why: "opis" }],
		});
		const res = await POST(makeReq(), { params });
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.judged).toBe(false);
		expect(json.summaryText).toBeNull();
	});

	it("404 gdy sesja nie istnieje (model NIE wołany)", async () => {
		txState.session = null;
		const res = await POST(makeReq(), { params });
		expect(res.status).toBe(404);
		expect(mockGenerateSummary).not.toHaveBeenCalled();
	});

	it("wyjątek z warstwy LLM → 500 z tagiem career-helper.summary.generate (sygnatura proda)", async () => {
		// Symuluje m.in. „model not found" (404 Anthropic). UWAGA: realnego ZŁEGO
		// MODEL ID mock NIE sprawdza — to ograniczenie nazwane w nagłówku pliku.
		mockGenerateSummary.mockRejectedValue(new Error("model not found"));
		const res = await POST(makeReq(), { params });
		expect(res.status).toBe(500);
		expect(mockLogError).toHaveBeenCalled();
		expect(mockLogError.mock.calls[0][0]).toBe("career-helper.summary.generate");
		// Kontekst logu = tylko studentId (bez PII).
		expect(mockLogError.mock.calls[0][2]).toEqual({ studentId: "student-1" });
	});
});
