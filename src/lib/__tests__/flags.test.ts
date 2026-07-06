import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FLAGS, type FlagName, isFeatureEnabled } from "../flags";

/**
 * Dowód dla 1.1 — feature flags jako typowany rejestr + env.
 *
 * Rdzeń kontraktu: „flaga off = zero zmian" — każda flaga domyślnie WYŁĄCZONA,
 * zapala ją tylko jawna, truthy zmienna środowiskowa. Izolujemy env (zapis/
 * przywrócenie), żeby test nie zależał od środowiska uruchomienia.
 */
describe("feature flags (1.1)", () => {
	const saved: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const flag of Object.values(FLAGS)) {
			saved[flag.envVar] = process.env[flag.envVar];
			delete process.env[flag.envVar];
		}
	});

	afterEach(() => {
		for (const flag of Object.values(FLAGS)) {
			const prev = saved[flag.envVar];
			if (prev === undefined) {
				delete process.env[flag.envVar];
			} else {
				process.env[flag.envVar] = prev;
			}
		}
	});

	it("domyślnie KAŻDA flaga jest wyłączona (flaga off = zero zmian)", () => {
		for (const name of Object.keys(FLAGS) as FlagName[]) {
			expect(isFeatureEnabled(name)).toBe(false);
		}
	});

	it("każdy wpis rejestru ma defaultValue=false (nic nie wchodzi domyślnie włączone)", () => {
		for (const flag of Object.values(FLAGS)) {
			expect(flag.defaultValue).toBe(false);
		}
	});

	it("zapala flagę na truthy env: 1 / true / on (bez wielkości liter, z przycięciem)", () => {
		const { envVar } = FLAGS.proactiveMarketRefresh;
		for (const truthy of ["1", "true", "on", "TRUE", "On", " true "]) {
			process.env[envVar] = truthy;
			expect(isFeatureEnabled("proactiveMarketRefresh")).toBe(true);
		}
	});

	it("trzyma flagę wyłączoną na falsy/pustym/śmieciowym env", () => {
		const { envVar } = FLAGS.proactiveMarketRefresh;
		for (const falsy of ["0", "false", "off", "", "yes", "literówka"]) {
			process.env[envVar] = falsy;
			expect(isFeatureEnabled("proactiveMarketRefresh")).toBe(false);
		}
	});

	it("każda flaga jest sterowana NIEZALEŻNIE własną zmienną", () => {
		process.env[FLAGS.advisorMemory.envVar] = "1";
		expect(isFeatureEnabled("advisorMemory")).toBe(true);
		expect(isFeatureEnabled("proactiveMarketRefresh")).toBe(false);
		expect(isFeatureEnabled("humanReviewQueue")).toBe(false);
	});
});
