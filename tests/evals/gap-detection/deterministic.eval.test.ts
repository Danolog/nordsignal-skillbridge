// ============================================================================
// AG.0 · EWALUACJA DETERMINISTYCZNA GAP DETECTION (bez LLM, zawsze biegnie).
//
// Mierzy produkcyjne liczenie luk (deriveGaps + reguła priorytetów względnych
// + computeMarketCoverage) na golden secie. To nie jest zwykły unit test logiki
// (te są w market-catalog/market-gaps) — to strażnik JAKOŚCI na ręcznie
// zweryfikowanym wzorcu: precision/recall wykrytych luk vs golden musi być
// 1.0, priorytety graniczne (r ≈ 0.33) muszą się nie ruszyć, pokrycie musi
// zgadzać się co do punktu procentowego.
// ============================================================================

import { afterAll, describe, expect, it } from "vitest";
import {
	computeMarketCoverage,
	deriveGaps,
	estimatedHoursForGap,
} from "@/lib/onboarding/market-catalog";
import { catalogFor } from "../lib/market-catalog-fixture";
import { macroAverage, normalizeName, type SetMetrics, setMetrics } from "../lib/metrics";
import { writeReport } from "../lib/report";
import { GOLDEN_CASES } from "./golden-set";

/** Metryki pełnolistowych przypadków — zebrane do raportu w afterAll. */
const collectedMetrics: { id: string; metrics: SetMetrics }[] = [];

describe("AG.0 · deterministyczne liczenie luk (golden set, bez LLM)", () => {
	for (const c of GOLDEN_CASES) {
		describe(`${c.id} · ${c.careerGoal} — ${c.title}`, () => {
			const catalog = catalogFor(c.careerGoal);
			const gaps = deriveGaps(
				catalog,
				c.selections.map((s) => s.name),
			);

			it(`wykrywa dokładnie ${c.expected.gapCount} luk`, () => {
				expect(gaps).toHaveLength(c.expected.gapCount);
			});

			it("żadna luka nie pokrywa się z zaznaczeniem (po normalizacji)", () => {
				const selected = new Set(c.selections.map((s) => normalizeName(s.name)));
				const overlap = gaps.filter((g) => selected.has(normalizeName(g.competencyName)));
				expect(overlap).toEqual([]);
			});

			it("każda luka pochodzi z katalogu i niesie jego % popytu", () => {
				const demandByName = new Map(
					catalog.map((i) => [normalizeName(i.competencyName), i.demandPercentage]),
				);
				for (const gap of gaps) {
					expect(demandByName.get(normalizeName(gap.competencyName))).toBe(gap.marketPercentage);
				}
			});

			it("estimatedHours wynika z priorytetu (8/5/3)", () => {
				for (const gap of gaps) {
					expect(gap.estimatedHours).toBe(estimatedHoursForGap(gap.priority));
				}
			});

			it(`pokrycie rynku = ${c.expected.coveragePercent}%`, () => {
				const levels = c.selections.filter((s) => s.inCatalog !== false).map((s) => s.level);
				expect(computeMarketCoverage(catalog.length, levels)).toBe(c.expected.coveragePercent);
			});

			for (const [name, priority] of Object.entries(c.expected.priorities ?? {})) {
				it(`sentinel priorytetu: ${name} → ${priority}`, () => {
					const gap = gaps.find((g) => normalizeName(g.competencyName) === normalizeName(name));
					expect(gap, `sentinel "${name}" nie jest luką w tym przypadku`).toBeDefined();
					expect(gap?.priority).toBe(priority);
				});
			}

			if (c.expected.gapNames) {
				it("pełna lista luk: precision = recall = 1.0 vs golden", () => {
					const metrics = setMetrics(
						c.expected.gapNames ?? [],
						gaps.map((g) => g.competencyName),
					);
					collectedMetrics.push({ id: c.id, metrics });
					expect(metrics.falsePositives, "luki nadmiarowe względem golden").toEqual([]);
					expect(metrics.falseNegatives, "luki przeoczone względem golden").toEqual([]);
					expect(metrics.precision).toBe(1);
					expect(metrics.recall).toBe(1);
				});
			}
		});
	}

	afterAll(() => {
		const macro = macroAverage(collectedMetrics.map((m) => m.metrics));
		writeReport("deterministic-latest", {
			eval: "gap-detection/deterministic",
			goldenCases: GOLDEN_CASES.length,
			fullListCases: collectedMetrics.map(({ id, metrics }) => ({
				id,
				precision: metrics.precision,
				recall: metrics.recall,
			})),
			macro,
		});
	});
});
