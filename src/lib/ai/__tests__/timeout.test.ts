import { describe, expect, it } from "vitest";
import { AI_CALL_TIMEOUT_MS, aiTimeoutSignal } from "../timeout";

// Realne timery + małe ms: AbortSignal.timeout w Node używa wewnętrznego timera,
// którego fake-timery vitest nie zawsze przechwytują — testujemy krótkim realnym oknem.
describe("aiTimeoutSignal", () => {
	it("zwraca AbortSignal, początkowo nie aborted", () => {
		const s = aiTimeoutSignal(1000);
		expect(s).toBeInstanceOf(AbortSignal);
		expect(s.aborted).toBe(false);
	});

	it("aborts po upływie ms (reason = TimeoutError)", async () => {
		const s = aiTimeoutSignal(5);
		expect(s.aborted).toBe(false);
		await new Promise((r) => setTimeout(r, 25));
		expect(s.aborted).toBe(true);
		expect((s.reason as Error)?.name).toBe("TimeoutError");
	});

	it("domyślny timeout = AI_CALL_TIMEOUT_MS (45s) i nie odpala się od razu", () => {
		expect(AI_CALL_TIMEOUT_MS).toBe(45_000);
		expect(aiTimeoutSignal().aborted).toBe(false);
	});

	it("każde wywołanie zwraca świeży, niezależny sygnał (nie współdzielony deadline)", () => {
		expect(aiTimeoutSignal(1000)).not.toBe(aiTimeoutSignal(1000));
	});
});
