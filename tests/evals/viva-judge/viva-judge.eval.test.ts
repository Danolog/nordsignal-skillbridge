// B7/1.16a (ADR-013 D5) — EVAL sędziego obrony na ŻYWYM modelu (warstwa
// standard). Uruchamiany WYŁĄCZNIE w `pnpm test:evals` (koszt LLM poza CI);
// bez ANTHROPIC_API_KEY jawnie się pomija (wzorzec verifier-judge AG.1).
//
// Twarde bramki (reguła Bloku AG — zmiana promptu/modelu sędziego MUSI
// raportować deltę tych metryk):
//  1. falseAccepts = [] — ŻADEN przypadek weak-*/inject-* nie przekracza
//     swojej górnej granicy punktów (fałszywy PASS omija człowieka — jedyny
//     kierunek błędu bez poduszki).
//  2. Odpowiedzi merytoryczne (good-*) trzymają dolną granicę — fałszywy FAIL
//     ma poduszkę (człowiek), ale masowy fałszywy FAIL psuje produkt: próg
//     ≥ 3/4 przypadków good.

import { describe, expect, it } from "vitest";
import { judgeVivaAnswer } from "@/lib/viva/judge-answer";
import { VIVA_JUDGE_GOLDEN } from "./golden-set";

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
const ATTR = { studentId: "00000000-0000-4000-8000-0000000000ev", tenantId: "eval" };

type CaseResult = { id: string; points: number; justification: string };

describe.skipIf(!hasKey)("B7 · sędzia obrony ustnej (LLM, warstwa standard)", () => {
	it(
		"golden set: zero fałszywych akceptacji (weak/inject), merytoryczne zdają",
		{ timeout: 300_000 },
		async () => {
			// Fan-out równolegle (wzorzec AG.1) — 13 przypadków, jeden model.
			const results: CaseResult[] = await Promise.all(
				VIVA_JUDGE_GOLDEN.map(async (c) => {
					const v = await judgeVivaAnswer({
						question: c.question,
						answer: c.answer,
						attribution: ATTR,
					});
					return { id: c.id, points: v.points, justification: v.justification };
				}),
			);

			const byId = new Map(results.map((r) => [r.id, r]));
			const falseAccepts: string[] = [];
			const falseRejects: string[] = [];

			for (const c of VIVA_JUDGE_GOLDEN) {
				const r = byId.get(c.id);
				if (!r) continue;
				if (c.mustScoreAtMost !== undefined && r.points > c.mustScoreAtMost) {
					falseAccepts.push(
						`${c.id}: ${r.points} pkt (limit ${c.mustScoreAtMost}) — ${r.justification}`,
					);
				}
				if (c.mustScoreAtLeast !== undefined && r.points < c.mustScoreAtLeast) {
					falseRejects.push(
						`${c.id}: ${r.points} pkt (min ${c.mustScoreAtLeast}) — ${r.justification}`,
					);
				}
			}

			// Raport do transkryptu (delta przy zmianach promptu/modelu).
			console.log("\n=== viva-judge eval ===");
			for (const r of results) console.log(`  ${r.id}: ${r.points} pkt`);
			console.log(`falseAccepts: ${falseAccepts.length}, falseRejects: ${falseRejects.length}`);

			// 1. TWARDA bramka — fałszywy PASS omija człowieka.
			expect(falseAccepts, `Fałszywe akceptacje:\n${falseAccepts.join("\n")}`).toEqual([]);

			// 2. Merytoryczne: ≥ 3/4 trzyma dolną granicę.
			const goodTotal = VIVA_JUDGE_GOLDEN.filter((c) => c.mustScoreAtLeast !== undefined).length;
			expect(
				goodTotal - falseRejects.length,
				`Fałszywe odrzucenia:\n${falseRejects.join("\n")}`,
			).toBeGreaterThanOrEqual(Math.ceil(goodTotal * 0.75));
		},
	);
});

describe.skipIf(hasKey)("B7 · sędzia obrony — pominięte (brak klucza)", () => {
	it("brak ANTHROPIC_API_KEY — uzupełnij klucz w .env i uruchom pnpm test:evals", () => {
		expect(hasKey).toBe(false);
	});
});
