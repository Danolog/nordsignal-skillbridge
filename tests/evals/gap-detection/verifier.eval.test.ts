// ============================================================================
// AG.1 · WERYFIKATOR LUK — EWALUACJA DETERMINISTYCZNA (bez LLM, zawsze biegnie).
//
// Dowód z roadmapy (Blok AG, AG.1): „luka bez pokrycia w rynku odrzucona;
// golden set AG.0 pokazuje poprawę precision". Symulujemy model halucynujący:
// do ręcznie zweryfikowanych luk golden setu dosypujemy luki-zmyłki spoza
// katalogu, po czym mierzymy precision PRZED i PO przebiegu weryfikatora.
//
// Ta suita mierzy MECHANIKĘ potoku (bez LLM):
//  • każda prawdziwa luka gruntuje się deterministycznie w katalogu (0 wywołań
//    sędziego — pozycje katalogu nie generują kosztu),
//  • każda zmyłka eskaluje do sędziego; tu sędzia-skrypt odrzuca (ideał),
//  • po odfiltrowaniu odrzuconych precision wraca do 1.0 przy recall bez zmian.
// JAKOŚĆ realnego sędziego LLM mierzy osobna suita verifier-judge.eval.test.ts
// (klucz API) — tak jak deterministic/why-judge w AG.0.
// ============================================================================

import { afterAll, describe, expect, it } from "vitest";
import { type GapJudge, verifyGapsAgainstMarket } from "@/lib/ai/verify-gaps";
import { catalogFor } from "../lib/market-catalog-fixture";
import { macroAverage, type SetMetrics, setMetrics } from "../lib/metrics";
import { formatDelta, loadBaseline, writeReport } from "../lib/report";
import { GOLDEN_CASES } from "./golden-set";

// Zmyłki spoza KAŻDEGO katalogu (sprawdzone vs artefakt 2026-02): absurd,
// kompetencja miękka i realna technologia nieobecna w żadnej z 5 ścieżek
// golden setu — trzy klasy halucynacji, które weryfikator ma obcinać.
const HALLUCINATED_GAPS = ["Kowalstwo artystyczne", "Zarządzanie zespołem", "COBOL"];

/** Sędzia-skrypt (ideał): odrzuca wszystko, co do niego doszło; liczy wywołania. */
function strictJudge(): { judge: GapJudge; calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		judge: async (name) => {
			calls.push(name);
			return { grounded: false, reason: "poza katalogiem (skrypt)" };
		},
	};
}

const FULL_LIST_CASES = GOLDEN_CASES.filter((c) => c.expected.gapNames);

const collected: { id: string; before: SetMetrics; after: SetMetrics; judgeCalls: string[] }[] = [];

describe("AG.1 · weryfikator luk — poprawa precision na golden secie (bez LLM)", () => {
	for (const c of FULL_LIST_CASES) {
		describe(`${c.id} · ${c.careerGoal} — ${c.title}`, () => {
			const golden = c.expected.gapNames ?? [];
			const catalog = catalogFor(c.careerGoal).map((i) => ({
				competencyName: i.competencyName,
				demandPercentage: i.demandPercentage,
			}));
			// Symulowane wyjście modelu: prawdziwe luki + halucynacje.
			const modelOutput = [...golden, ...HALLUCINATED_GAPS];

			it("zmyłki realnie obniżają precision wejścia (test ma co mierzyć)", () => {
				const before = setMetrics(golden, modelOutput);
				expect(before.precision).toBeLessThan(1);
				expect(before.recall).toBe(1);
			});

			it("prawdziwe luki gruntują się w katalogu bez sędziego; zmyłki odrzucone; precision wraca do 1.0", async () => {
				const { judge, calls } = strictJudge();
				const verdicts = await verifyGapsAgainstMarket({
					gapNames: modelOutput,
					marketCompetencies: catalog,
					careerGoal: c.careerGoal,
					judge,
				});

				// Każda golden-luka: verified metodą catalog (0 kosztu LLM).
				const byName = new Map(verdicts.map((v) => [v.competencyName, v]));
				for (const name of golden) {
					expect(byName.get(name), `brak werdyktu dla "${name}"`).toMatchObject({
						status: "verified",
						method: "catalog",
					});
				}
				// Sędzia dostał WYŁĄCZNIE zmyłki — dokładnie je i tylko je.
				expect(calls.sort()).toEqual([...HALLUCINATED_GAPS].sort());

				const kept = verdicts.filter((v) => v.status !== "rejected").map((v) => v.competencyName);
				const before = setMetrics(golden, modelOutput);
				const after = setMetrics(golden, kept);
				collected.push({ id: c.id, before, after, judgeCalls: calls });

				expect(after.falsePositives, "zmyłki, które przeszły weryfikator").toEqual([]);
				expect(after.precision).toBe(1);
				// Weryfikator nie może zgubić prawdziwej luki (recall bez zmian).
				expect(after.recall).toBe(1);
			});
		});
	}

	afterAll(() => {
		const macroBefore = macroAverage(collected.map((m) => m.before));
		const macroAfter = macroAverage(collected.map((m) => m.after));
		const baseline = loadBaseline<{ verifier?: { macroAfterPrecision: number } }>();
		const baselinePrecision = baseline?.verifier?.macroAfterPrecision;
		console.log(
			formatDelta("verifier macro precision (po filtrze)", macroAfter.precision, baselinePrecision),
		);
		console.log(
			`[eval] verifier: precision przed ${macroBefore.precision.toFixed(3)} → po ${macroAfter.precision.toFixed(3)} (delta +${(macroAfter.precision - macroBefore.precision).toFixed(3)}), recall ${macroAfter.recall.toFixed(3)}`,
		);
		writeReport("verifier-latest", {
			eval: "gap-detection/verifier",
			hallucinatedGaps: HALLUCINATED_GAPS,
			cases: collected.map(({ id, before, after, judgeCalls }) => ({
				id,
				precisionBefore: before.precision,
				precisionAfter: after.precision,
				recallAfter: after.recall,
				judgeCalls,
			})),
			macro: {
				precisionBefore: macroBefore.precision,
				precisionAfter: macroAfter.precision,
				recallAfter: macroAfter.recall,
			},
			baselineMacroAfterPrecision: baselinePrecision ?? null,
		});
	});
});
