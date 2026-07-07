// ============================================================================
// AG.1 · JAKOŚĆ SĘDZIEGO UGRUNTOWANIA (buildLlmGapJudge) — z realnym LLM.
//
// Deterministyczna suita (verifier.eval) dowodzi mechaniki potoku; ta mierzy
// sam OSĄD: czy sędzia (warstwa fast) odróżnia wariant nazwy z katalogu
// („React.js" vs „React" → YES) od halucynacji — w tym pułapek: realnych
// technologii NIEOBECNYCH w katalogu danej ścieżki (Ruby on Rails u Data
// Scientist) → NO.
//
// Koszt: 10 wywołań warstwy fast (Haiku) — wyłącznie `pnpm test:evals`
// z ANTHROPIC_API_KEY (wzorzec strażnika jak why-judge.eval.test.ts).
// ============================================================================

import { beforeAll, describe, expect, it } from "vitest";
import { getModelId } from "@/lib/ai/model";
import { buildLlmGapJudge } from "@/lib/ai/verify-gaps";
import { catalogFor } from "../lib/market-catalog-fixture";
import { formatDelta, loadBaseline, writeReport } from "../lib/report";
import { VERIFIER_JUDGE_MIN_ACCURACY } from "./thresholds";

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

interface JudgeSample {
	careerGoal: string;
	gapName: string;
	/** Czy poprawny werdykt to „ma pokrycie w katalogu" (ręcznie zweryfikowane vs artefakt 2026-02). */
	expectedGrounded: boolean;
	note: string;
}

const SAMPLES: JudgeSample[] = [
	// ── Warianty pozycji katalogu — sędzia MUSI uznać pokrycie ────────────────
	{
		careerGoal: "Data Scientist",
		gapName: "Python 3",
		expectedGrounded: true,
		note: "wariant pozycji Python",
	},
	{
		careerGoal: "Data Scientist",
		gapName: "Amazon Web Services",
		expectedGrounded: true,
		note: "rozwinięcie pozycji AWS",
	},
	{
		careerGoal: "Data Scientist",
		gapName: "Apache Spark",
		expectedGrounded: true,
		note: "wariant pozycji Spark",
	},
	{
		careerGoal: "Frontend Developer",
		gapName: "React.js",
		expectedGrounded: true,
		note: "wariant pozycji React",
	},
	{
		careerGoal: "Frontend Developer",
		gapName: "Sass",
		expectedGrounded: true,
		note: "wariant pozycji Sass / SCSS",
	},
	// ── Halucynacje — sędzia MUSI odrzucić ────────────────────────────────────
	{
		careerGoal: "Data Scientist",
		gapName: "Ruby on Rails",
		expectedGrounded: false,
		note: "pułapka: realna technologia, ale NIE w katalogu DS",
	},
	{
		careerGoal: "Data Scientist",
		gapName: "Power BI",
		expectedGrounded: false,
		note: "pułapka: narzędzie Data Analyst, nie DS",
	},
	{
		careerGoal: "Data Scientist",
		gapName: "Fotografia produktowa",
		expectedGrounded: false,
		note: "absurd spoza domeny",
	},
	{
		careerGoal: "Frontend Developer",
		gapName: "Kotlin",
		expectedGrounded: false,
		note: "pułapka: technologia Android, nie FE",
	},
	{
		careerGoal: "Frontend Developer",
		gapName: "Prawo jazdy kat. B",
		expectedGrounded: false,
		note: "absurd spoza domeny",
	},
];

interface JudgedSample extends JudgeSample {
	grounded: boolean;
	reason: string | null;
	correct: boolean;
}

describe.skipIf(!hasKey)("AG.1 · sędzia ugruntowania luk (LLM, warstwa fast)", () => {
	let judged: JudgedSample[] = [];
	let accuracy = 0;

	beforeAll(async () => {
		// Jeden sędzia per ścieżka (katalog w prompcie jest stały per careerGoal).
		const judges = new Map(
			[...new Set(SAMPLES.map((s) => s.careerGoal))].map((careerGoal) => [
				careerGoal,
				buildLlmGapJudge({
					marketCompetencies: catalogFor(careerGoal).map((i) => ({
						competencyName: i.competencyName,
						demandPercentage: i.demandPercentage,
					})),
					careerGoal,
				}),
			]),
		);

		judged = await Promise.all(
			SAMPLES.map(async (sample): Promise<JudgedSample> => {
				const judge = judges.get(sample.careerGoal);
				if (!judge) throw new Error(`brak sędziego dla ${sample.careerGoal}`);
				const { grounded, reason } = await judge(sample.gapName);
				return { ...sample, grounded, reason, correct: grounded === sample.expectedGrounded };
			}),
		);
		accuracy = judged.filter((j) => j.correct).length / judged.length;

		const baseline = loadBaseline<{ verifierJudge?: { accuracy: number } }>();
		const baselineAcc = baseline?.verifierJudge?.accuracy;
		console.log(formatDelta("verifier-judge accuracy", accuracy, baselineAcc));

		writeReport("verifier-judge-latest", {
			eval: "gap-detection/verifier-judge",
			model: getModelId("fast"),
			accuracy,
			baselineAccuracy: baselineAcc ?? null,
			deltaVsBaseline: baselineAcc === undefined ? null : accuracy - baselineAcc,
			samples: judged,
		});
	}, 240_000);

	it("żadna halucynacja nie została uznana za ugruntowaną (gwarancja precyzji AG.1)", () => {
		const falseAccepts = judged.filter((j) => !j.expectedGrounded && j.grounded);
		expect(falseAccepts.map((j) => `${j.careerGoal}: ${j.gapName}`)).toEqual([]);
	});

	it(`trafność sędziego ≥ ${VERIFIER_JUDGE_MIN_ACCURACY}`, () => {
		expect(accuracy).toBeGreaterThanOrEqual(VERIFIER_JUDGE_MIN_ACCURACY);
	});
});

// Jawny ślad, DLACZEGO suita LLM się nie wykonała (cichy skip = fałszywa zieleń).
describe.runIf(!hasKey)("AG.1 · sędzia ugruntowania luk — POMINIĘTA", () => {
	it("brak ANTHROPIC_API_KEY — uzupełnij klucz w .env i uruchom pnpm test:evals", () => {
		expect(hasKey).toBe(false);
	});
});
