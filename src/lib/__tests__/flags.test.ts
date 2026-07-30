import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateFlagIn, FLAGS, type FlagName, isFeatureEnabled, requirementsOf } from "../flags";

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

	it("1E.3: masteryGate istnieje, domyślnie OFF i mapuje się na FLAG_MASTERY_GATE", () => {
		expect(FLAGS.masteryGate.envVar).toBe("FLAG_MASTERY_GATE");
		expect(FLAGS.masteryGate.defaultValue).toBe(false);
		expect(isFeatureEnabled("masteryGate")).toBe(false);
	});

	it("każda flaga jest sterowana NIEZALEŻNIE własną zmienną", () => {
		process.env[FLAGS.advisorMemory.envVar] = "1";
		expect(isFeatureEnabled("advisorMemory")).toBe(true);
		expect(isFeatureEnabled("proactiveMarketRefresh")).toBe(false);
		expect(isFeatureEnabled("humanReviewQueue")).toBe(false);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1E.7 L4 — TWARDA BRAMKA SPRZĘŻENIA FLAG (`requires`, decyzja Ethana).
	//
	// Stawka nie jest kosmetyczna: `placementDiagnostic` OTWIERA studentowi moduły
	// w głąb drabiny, a jedyną tanią drogą naprawy błędu w dół jest „test out"
	// z `masteryGate`. Zapalenie placementu przy zgaszonym egzaminie wywraca
	// warunek nośny A22-2 oceny art. 22 RODO (Ryan), a nie tylko psuje UX.
	// Bramka MUSI stać w `isFeatureEnabled`, bo zmienną na Vercelu przestawia się
	// bez deployu — sprawdzenie w skrypcie wdrożeniowym nie chroni przed niczym.
	// ─────────────────────────────────────────────────────────────────────────
	describe("sprzężenie flag (`requires`) — fail-closed", () => {
		it("placementDiagnostic wymaga masteryGate (deklaracja w rejestrze)", () => {
			expect(requirementsOf("placementDiagnostic")).toEqual(["masteryGate"]);
		});

		it("env ON + przesłanka OFF → flaga WYŁĄCZONA (fail-closed, nie 'ostrzeżenie')", () => {
			process.env[FLAGS.placementDiagnostic.envVar] = "1";
			// FLAG_MASTERY_GATE skasowany w beforeEach — przesłanka niespełniona.
			expect(isFeatureEnabled("placementDiagnostic")).toBe(false);
		});

		it("env ON + przesłanka ON → flaga włączona", () => {
			process.env[FLAGS.placementDiagnostic.envVar] = "1";
			process.env[FLAGS.masteryGate.envVar] = "1";
			expect(isFeatureEnabled("placementDiagnostic")).toBe(true);
		});

		it("zgaszenie przesłanki GASI flagę zależną bez dotykania jej env", () => {
			process.env[FLAGS.placementDiagnostic.envVar] = "1";
			process.env[FLAGS.masteryGate.envVar] = "1";
			expect(isFeatureEnabled("placementDiagnostic")).toBe(true);
			// Dokładnie scenariusz z Vercela: ktoś gasi egzamin, placementu nie rusza.
			process.env[FLAGS.masteryGate.envVar] = "0";
			expect(isFeatureEnabled("placementDiagnostic")).toBe(false);
			// Sama przesłanka nadal steruje sobą normalnie.
			expect(isFeatureEnabled("masteryGate")).toBe(false);
		});

		it("bramka nie zapala niczego sama: przesłanka ON + flaga OFF → nadal OFF", () => {
			process.env[FLAGS.masteryGate.envVar] = "1";
			expect(isFeatureEnabled("placementDiagnostic")).toBe(false);
		});

		it("każdy wpis `requires` nazywa ISTNIEJĄCĄ flagę (literówka = przesłanka nie do spełnienia)", () => {
			const nazwy = new Set(Object.keys(FLAGS));
			for (const name of Object.keys(FLAGS) as FlagName[]) {
				for (const req of requirementsOf(name)) {
					expect(nazwy.has(req), `flaga '${name}' wymaga nieistniejącej '${req}'`).toBe(true);
				}
			}
		});

		it("graf `requires` jest ACYKLICZNY (bez tego pierwszy cykl = przepełnienie stosu)", () => {
			// DFS z trzema kolorami. Cykl w rejestrze byłby awarią na GORĄCEJ ścieżce
			// (flaga czytana per żądanie), więc pilnujemy go statycznie, a nie dopiero
			// strażnikiem runtime (ten jest drugą linią obrony, test niżej).
			const stan = new Map<FlagName, "w toku" | "gotowe">();
			const cykle: string[] = [];
			const odwiedz = (name: FlagName, sciezka: FlagName[]): void => {
				if (stan.get(name) === "gotowe") return;
				if (stan.get(name) === "w toku") {
					cykle.push([...sciezka, name].join(" → "));
					return;
				}
				stan.set(name, "w toku");
				for (const req of requirementsOf(name)) odwiedz(req, [...sciezka, name]);
				stan.set(name, "gotowe");
			};
			for (const name of Object.keys(FLAGS) as FlagName[]) odwiedz(name, []);
			expect(cykle).toEqual([]);
		});

		it("cykl w grafie: flaga GAŚNIE zamiast przepełnić stos (strażnik runtime, REALNA funkcja)", () => {
			// Realny rejestr jest acykliczny (test wyżej), więc cykl trzeba wstrzyknąć.
			// Wołamy PRODUKCYJNĄ `evaluateFlagIn` z atrapą rejestru — testujemy kod,
			// który biegnie na produkcji, a nie jego kopię przepisaną w teście.
			const zCyklem = {
				a: { envVar: "FLAG_TEST_A", description: "a", defaultValue: false, requires: ["b"] },
				b: { envVar: "FLAG_TEST_B", description: "b", defaultValue: false, requires: ["a"] },
			} as const;
			process.env.FLAG_TEST_A = "1";
			process.env.FLAG_TEST_B = "1";
			try {
				// Bez strażnika `trail` ta linia kończy się RangeError (stack overflow).
				expect(evaluateFlagIn(zCyklem, "a")).toBe(false);
				expect(evaluateFlagIn(zCyklem, "b")).toBe(false);
			} finally {
				delete process.env.FLAG_TEST_A;
				delete process.env.FLAG_TEST_B;
			}
		});

		it("nieznana nazwa w `requires` → fail-closed (flaga zgaszona, nie 'przesłanka spełniona')", () => {
			const zLiterowka = {
				a: {
					envVar: "FLAG_TEST_A",
					description: "a",
					defaultValue: false,
					requires: ["masterygate"],
				},
			} as const;
			process.env.FLAG_TEST_A = "1";
			try {
				expect(evaluateFlagIn(zLiterowka, "a")).toBe(false);
			} finally {
				delete process.env.FLAG_TEST_A;
			}
		});

		it("sprzężenie jest PRZECHODNIE (A→B→C): zgaszone C gasi A", () => {
			const lancuch = {
				a: { envVar: "FLAG_TEST_A", description: "a", defaultValue: false, requires: ["b"] },
				b: { envVar: "FLAG_TEST_B", description: "b", defaultValue: false, requires: ["c"] },
				c: { envVar: "FLAG_TEST_C", description: "c", defaultValue: false },
			} as const;
			process.env.FLAG_TEST_A = "1";
			process.env.FLAG_TEST_B = "1";
			try {
				expect(evaluateFlagIn(lancuch, "a")).toBe(false);
				process.env.FLAG_TEST_C = "1";
				expect(evaluateFlagIn(lancuch, "a")).toBe(true);
			} finally {
				delete process.env.FLAG_TEST_A;
				delete process.env.FLAG_TEST_B;
				delete process.env.FLAG_TEST_C;
			}
		});

		it("niespełniona przesłanka jest GŁOŚNA — trafia do logu błędów", async () => {
			// Bez logu awaria jest niema: ktoś zapala flagę, nic się nie dzieje i nikt
			// nie wie dlaczego. `vi.resetModules` daje świeży moduł (ostrzeżenia są
			// deduplikowane per proces, żeby nie zalać gorącej ścieżki).
			vi.resetModules();
			const logError = vi.fn();
			vi.doMock("@/lib/log", () => ({ logError, extractValidationIssues: () => [] }));
			const swiezy = await import("../flags");
			process.env[FLAGS.placementDiagnostic.envVar] = "1";
			delete process.env[FLAGS.masteryGate.envVar];

			expect(swiezy.isFeatureEnabled("placementDiagnostic")).toBe(false);
			expect(logError).toHaveBeenCalledTimes(1);
			expect(logError.mock.calls[0][0]).toBe("flags.requires");
			expect(String(logError.mock.calls[0][1])).toContain("masteryGate");
			// Deduplikacja: drugi odczyt tej samej kombinacji nie zalewa logu…
			swiezy.isFeatureEnabled("placementDiagnostic");
			expect(logError).toHaveBeenCalledTimes(1);
			// …ale flaga NADAL jest wyłączona (dedup dotyczy logu, nie decyzji).
			expect(swiezy.isFeatureEnabled("placementDiagnostic")).toBe(false);

			vi.doUnmock("@/lib/log");
			vi.resetModules();
		});
	});
});
