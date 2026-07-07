// ============================================================================
// AG.0 · TRAFNOŚĆ OPISÓW LUK (generate-why) — LLM-as-judge.
//
// Jedyne miejsce, gdzie model językowy wpływa na treść luki, to opis „dlaczego
// ta umiejętność jest ważna” (generate-why; samo wykrycie luki jest
// deterministyczne). Sędzia (wzorzec agenta-sędziego z Pomocnika,
// career-helper.ts) ocenia każdy opis na rubryce: na temat / role i zadania /
// widełki płacowe / polszczyzna / zgodność z danymi rynkowymi / ocena 1–5.
//
// Koszt: 4 × generate-why + 4 × sędzia (tier standard) — dlatego suite biegnie
// wyłącznie w `pnpm test:evals` i wymaga ANTHROPIC_API_KEY (bez klucza jawnie
// się pomija — wzorzec strażnika jak isLocalTestDb w integration).
// ============================================================================

import { generateObject } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { generateWhyImportant } from "@/lib/ai/generate-why";
import { getModel, getModelId } from "@/lib/ai/model";
import { aiTimeoutSignal } from "@/lib/ai/timeout";
import { formatDelta, loadBaseline, writeReport } from "../lib/report";
import { WHY_JUDGE_SAMPLES } from "./golden-set";
import { WHY_MIN_AVG_OVERALL } from "./thresholds";

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const WhyVerdictSchema = z.object({
	relevant: z.boolean().describe("Opis dotyczy dokładnie tej umiejętności i tego celu kariery"),
	rolesAndTasks: z.boolean().describe("Wymienia konkretne role zawodowe i zadania z pracy"),
	salaryIncluded: z.boolean().describe("Podaje orientacyjne widełki płacowe w PLN"),
	polish: z.boolean().describe("Napisany po polsku, bezpośrednio do studenta"),
	grounded: z
		.boolean()
		.describe("Nie przeczy podanemu % popytu ani nie zmyśla danych sprzecznych z wejściem"),
	// Bez .min()/.max() — strukturalne wyjście API Anthropic odrzuca minimum/maximum
	// w schemacie liczbowym; zakres pilnowany promptem + clampem po stronie kodu.
	overall: z.number().describe("Ocena ogólna 1–5 (5 = do pokazania bez poprawek)"),
	justification: z.string().describe("Jedno-dwa zdania uzasadnienia oceny"),
});

type WhyVerdict = z.infer<typeof WhyVerdictSchema>;

interface JudgedSample {
	competencyName: string;
	careerGoal: string;
	marketPercentage: number;
	description: string;
	verdict: WhyVerdict;
}

async function judgeWhy(
	sample: (typeof WHY_JUDGE_SAMPLES)[number],
	description: string,
): Promise<WhyVerdict> {
	const { object } = await generateObject({
		model: getModel("standard"),
		abortSignal: aiTimeoutSignal(),
		schema: WhyVerdictSchema,
		maxOutputTokens: 500,
		prompt: `Jesteś sędzią jakości (LLM-as-judge) w harnessie ewaluacyjnym SkillBridge (AG.0).
Oceniasz opis „dlaczego ta umiejętność jest ważna”, wygenerowany dla studenta.

Wejście generatora:
- Umiejętność: "${sample.competencyName}"
- Cel kariery: "${sample.careerGoal}"
- Popyt rynkowy: ${sample.marketPercentage}% ofert pracy

Oceniany opis:
<description>
${description}
</description>

Oceń opis surowo według rubryki ze schematu. "grounded" = fałsz, jeśli opis
podaje procent popytu sprzeczny z wejściem albo zmyśla twarde dane rynkowe.`,
	});
	// Clamp zakresu 1–5 (schemat nie może go egzekwować — ograniczenie API wyżej).
	return { ...object, overall: Math.min(5, Math.max(1, object.overall)) };
}

describe.skipIf(!hasKey)("AG.0 · trafność opisów luk (generate-why, LLM-as-judge)", () => {
	let judged: JudgedSample[] = [];
	let avgOverall = 0;

	beforeAll(async () => {
		judged = await Promise.all(
			WHY_JUDGE_SAMPLES.map(async (sample): Promise<JudgedSample> => {
				const description = await generateWhyImportant(
					sample.competencyName,
					sample.careerGoal,
					sample.marketPercentage,
				);
				const verdict = await judgeWhy(sample, description);
				return { ...sample, description, verdict };
			}),
		);
		avgOverall = judged.reduce((sum, j) => sum + j.verdict.overall, 0) / judged.length;

		const baseline = loadBaseline<{ whyJudge?: { avgOverall: number } }>();
		const baselineAvg = baseline?.whyJudge?.avgOverall;
		console.log(formatDelta("why-judge avgOverall", avgOverall, baselineAvg));

		writeReport("why-judge-latest", {
			eval: "gap-detection/why-judge",
			model: getModelId("standard"),
			avgOverall,
			// Delta także w raporcie (konsola vitest bywa wycinana z output CI).
			baselineAvgOverall: baselineAvg ?? null,
			deltaVsBaseline: baselineAvg === undefined ? null : avgOverall - baselineAvg,
			samples: judged.map(({ description, ...rest }) => ({
				...rest,
				descriptionPreview: `${description.slice(0, 160)}…`,
			})),
		});
	}, 240_000);

	it("każdy opis jest na temat (relevant)", () => {
		expect(judged.filter((j) => !j.verdict.relevant).map((j) => j.competencyName)).toEqual([]);
	});

	it("każdy opis jest po polsku", () => {
		expect(judged.filter((j) => !j.verdict.polish).map((j) => j.competencyName)).toEqual([]);
	});

	it("żaden opis nie zmyśla danych rynkowych (grounded)", () => {
		expect(judged.filter((j) => !j.verdict.grounded).map((j) => j.competencyName)).toEqual([]);
	});

	it(`średnia ocena sędziego ≥ ${WHY_MIN_AVG_OVERALL}`, () => {
		expect(avgOverall).toBeGreaterThanOrEqual(WHY_MIN_AVG_OVERALL);
	});
});

// Jawny ślad w output, DLACZEGO część LLM się nie wykonała — cichy skip
// wyglądałby jak „eval zielony”, a nic nie zostało zmierzone.
describe.runIf(!hasKey)("AG.0 · trafność opisów luk — POMINIĘTA", () => {
	it("brak ANTHROPIC_API_KEY — uzupełnij klucz w .env i uruchom pnpm test:evals", () => {
		expect(hasKey).toBe(false);
	});
});
