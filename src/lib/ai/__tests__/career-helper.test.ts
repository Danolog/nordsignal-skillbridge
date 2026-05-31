import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
	detectCrisis,
	generateSummary,
	MAX_RESTARTS,
	MAX_TURNS,
	violatesVerdictGuardrail,
} from "../career-helper";

// Mock LLM zwracający stały JSON (generateObject). Zero wywołań do realnego API.
type DoGenerateFn = Extract<
	NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>["doGenerate"],
	(...args: never[]) => unknown
>;
type GenerateResult = Awaited<ReturnType<DoGenerateFn>>;

function objectModel(payload: unknown) {
	const result: GenerateResult = {
		content: [{ type: "text", text: JSON.stringify(payload) }],
		finishReason: { unified: "stop", raw: "stop" },
		usage: {
			inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 1, text: 1, reasoning: 0 },
		},
		warnings: [],
	};
	return new MockLanguageModelV3({ doGenerate: async () => result });
}

const SAFE_SUMMARY = {
	summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi i porządkowanie chaosu.",
	careerPaths: [
		{ label: "Analityka danych", why: "Lubisz porządkować informacje i szukać wzorców." },
		{ label: "Inżynieria danych", why: "Wspominałeś o budowaniu rzeczy, które działają." },
	],
};

describe("detectCrisis (filtr kryzysowy, PRZED modelem)", () => {
	it("wykrywa wyrażenia kryzysowe", () => {
		expect(detectCrisis("czasem nie chcę już żyć")).toBe(true);
		expect(detectCrisis("mam myśli samobójcze")).toBe(true);
		expect(detectCrisis("i want to die")).toBe(true);
	});
	it("nie podnosi fałszywego alarmu na normalnej rozmowie", () => {
		expect(detectCrisis("interesuje mnie analiza danych")).toBe(false);
		expect(detectCrisis("chcę zostać programistą")).toBe(false);
	});
});

describe("violatesVerdictGuardrail (anty-werdykt, HITL warstwa 3)", () => {
	it("odrzuca język rekomendujący / werdykt", () => {
		expect(violatesVerdictGuardrail("Twoje powołanie to medycyna.")).toBe(true);
		expect(violatesVerdictGuardrail("Rekomendujemy ścieżkę data science.")).toBe(true);
		expect(violatesVerdictGuardrail("Powinieneś zostać analitykiem.")).toBe(true);
	});
	it("przepuszcza bezpieczny opis powiązania", () => {
		expect(violatesVerdictGuardrail("Z tego, co powiedziałeś, bliżej Ci do pracy z danymi.")).toBe(
			false,
		);
	});
});

describe("generateSummary — egzekucja HITL na /summary", () => {
	it("zwraca judged=true i NIE serializuje probability gdy sędzia akceptuje", async () => {
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: objectModel(SAFE_SUMMARY),
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});

		expect(result.judged).toBe(true);
		if (result.judged) {
			expect(result.judgedFor).toBe("R2");
			expect(result.careerPaths).toHaveLength(2);
			// Twardy guardrail kontraktu: żadne pole probability/% nie wychodzi.
			for (const p of result.careerPaths) {
				expect(Object.keys(p).sort()).toEqual(["label", "why"]);
				expect(p).not.toHaveProperty("probability");
			}
		}
	});

	it("fallback judge_failed gdy sędzia odmawia 2× (stan kontraktu, nie błąd)", async () => {
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: objectModel(SAFE_SUMMARY),
			judgeModel: objectModel({ verdict: "NO", reason: "ranking" }),
		});

		expect(result.judged).toBe(false);
		if (!result.judged) {
			expect(result.judgedFor).toBe("warstwa4_failed");
			expect(result.summaryText).toBeNull(); // same obszary, bez streszczenia
			expect(result.careerPaths.length).toBeGreaterThan(0);
		}
	});

	it("guardrail deterministyczny blokuje werdykt zanim sędzia LLM go przepuści", async () => {
		const verdictSummary = {
			summaryText: "Twoje powołanie to medycyna — zostań lekarzem.",
			careerPaths: [{ label: "Medycyna", why: "Rekomendujemy tę ścieżkę." }],
		};
		const result = await generateSummary({
			answers: {},
			history: [],
			summaryModel: objectModel(verdictSummary),
			// Sędzia LLM mówiłby YES — ale deterministyczny guardrail i tak odrzuca.
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(result.judged).toBe(false);
	});
});

describe("limity w KODZIE (nie w prompcie)", () => {
	it("MAX_TURNS = 9, MAX_RESTARTS = 2", () => {
		expect(MAX_TURNS).toBe(9);
		expect(MAX_RESTARTS).toBe(2);
	});
});
