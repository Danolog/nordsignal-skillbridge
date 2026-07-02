import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const assertRateLimitConfigured = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
	assertRateLimitConfigured: (...args: unknown[]) => assertRateLimitConfigured(...args),
}));

describe("instrumentation register()", () => {
	beforeEach(() => {
		vi.resetModules();
		assertRateLimitConfigured.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("wywołuje assertRateLimitConfigured() w nodejs runtime", async () => {
		vi.stubEnv("NEXT_RUNTIME", "nodejs");

		const { register } = await import("../instrumentation");
		await register();

		expect(assertRateLimitConfigured).toHaveBeenCalledTimes(1);
	});

	it("pomija boot-check poza nodejs runtime (np. edge)", async () => {
		vi.stubEnv("NEXT_RUNTIME", "edge");

		const { register } = await import("../instrumentation");
		await register();

		expect(assertRateLimitConfigured).not.toHaveBeenCalled();
	});

	it("propaguje rzut z assertRateLimitConfigured (zatrzymuje boot)", async () => {
		vi.stubEnv("NEXT_RUNTIME", "nodejs");
		assertRateLimitConfigured.mockImplementation(() => {
			throw new Error("Rate limiting nieskonfigurowane w produkcji");
		});

		const { register } = await import("../instrumentation");
		await expect(register()).rejects.toThrow("Rate limiting nieskonfigurowane w produkcji");
	});
});
