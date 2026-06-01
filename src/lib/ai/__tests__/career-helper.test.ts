import { NoObjectGeneratedError } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
	detectCrisis,
	generateSummary,
	MAX_RESTARTS,
	MAX_TURNS,
	runTurn,
	violatesVerdictGuardrail,
} from "../career-helper";

// Mock LLM zwracający stały JSON (generateObject). Zero wywołań do realnego API.
type DoGenerateFn = Extract<
	NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>["doGenerate"],
	(...args: never[]) => unknown
>;
type GenerateResult = Awaited<ReturnType<DoGenerateFn>>;

function generateResult(payload: unknown): GenerateResult {
	return {
		content: [{ type: "text", text: JSON.stringify(payload) }],
		finishReason: { unified: "stop", raw: "stop" },
		usage: {
			inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 1, text: 1, reasoning: 0 },
		},
		warnings: [],
	};
}

function objectModel(payload: unknown) {
	const result = generateResult(payload);
	return new MockLanguageModelV3({ doGenerate: async () => result });
}

/** Realny błąd produkcyjny z logów prod (tag career-helper.summary.generate). */
function noObjectError() {
	return new NoObjectGeneratedError({
		message: "No object generated: response did not match schema.",
		cause: new Error("schema mismatch"),
		text: "{}",
		response: { id: "r", timestamp: new Date(), modelId: "m" },
		usage: {
			inputTokens: 1,
			outputTokens: 1,
			totalTokens: 2,
			inputTokenDetails: {
				noCacheTokens: 1,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
			},
			outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
		},
		finishReason: "stop",
	});
}

/**
 * Model, który na pierwszych `failTimes` wywołaniach rzuca NoObjectGeneratedError,
 * a potem zwraca `payload`. Odwzorowuje kapryśność prod: ten sam prompt raz pada
 * na walidacji schematu, raz przechodzi. Liczymy wywołania, żeby potwierdzić, że
 * retry naprawdę ponawia (nie „udał się za pierwszym razem").
 */
function flakyModel(failTimes: number, payload: unknown) {
	let calls = 0;
	const model = new MockLanguageModelV3({
		doGenerate: async () => {
			calls++;
			if (calls <= failTimes) throw noObjectError();
			return generateResult(payload);
		},
	});
	return { model, getCalls: () => calls };
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

describe("generateSummary — utwardzenie na AI_NoObjectGeneratedError (bug prod B0)", () => {
	it("retry łapie kapryśny NoObjectGeneratedError: 1× porażka, potem 200 (judged=true)", async () => {
		// Generator pada raz na walidacji schematu, potem zwraca poprawny obiekt.
		const gen = flakyModel(1, SAFE_SUMMARY);
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: gen.model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});

		expect(result.judged).toBe(true); // retry uratował — student dostaje wynik
		expect(gen.getCalls()).toBe(2); // 1 porażka + 1 sukces = realne ponowienie
		if (result.judged) {
			expect(result.careerPaths.length).toBeGreaterThan(0);
		}
	});

	it("trwała porażka po wyczerpaniu prób → łagodny stan (puste ścieżki), NIE surowy wyjątek", async () => {
		// Model rzuca NoObjectGeneratedError przy KAŻDYM wywołaniu (failTimes wysoki).
		const gen = flakyModel(99, SAFE_SUMMARY);
		// generateSummary nie może rzucić — musi zwrócić SummaryResult.
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: gen.model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});

		// Łagodny fallback: front mapuje puste careerPaths na ekran summary_error
		// („nie udało się, spróbuj ponownie") — NIE surowy 500.
		expect(result.judged).toBe(false);
		expect(result.careerPaths).toHaveLength(0);
		expect(result.summaryText).toBeNull();
		// 2 próby generateObjectWithRetry × 1 iteracja (catch przerywa pętlę sędziego).
		expect(gen.getCalls()).toBe(2);
	});

	it("NIE ponawia błędów innych niż NoObjectGenerated (404/429/timeout) — fail-fast", async () => {
		// Generyczny błąd (np. 404 zły model, 429 rate limit) NIE jest kapryśny —
		// ponawianie go pali budżet. Powinien polecieć od razu, bez retry (1 wywołanie),
		// a generateSummary i tak zamyka go w łagodnym stanie (nie surowy 500).
		let calls = 0;
		const model = new MockLanguageModelV3({
			doGenerate: async () => {
				calls++;
				throw new Error("API rate limit exceeded");
			},
		});
		const result = await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});

		expect(calls).toBe(1); // brak retry na nie-NoObjectGenerated
		expect(result.judged).toBe(false);
		expect(result.careerPaths).toHaveLength(0); // łagodny stan, nie wyjątek
	});

	it("schemat przycina nadmiar zamiast odrzucać: za długie why / 4. ścieżka nie wywracają outputu", async () => {
		// Output Opusa „prawie poprawny": why dłuższe niż limit + 4 ścieżki zamiast 3.
		const overlong = {
			summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi.",
			careerPaths: [
				{ label: "Analityka danych", why: "x".repeat(900) }, // > 800 znaków
				{ label: "Inżynieria danych", why: "ok" },
				{ label: "Data science", why: "ok" },
				{ label: "Czwarta nadmiarowa", why: "ok" }, // > 3 ścieżki
			],
		};
		const result = await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: objectModel(overlong),
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});

		expect(result.judged).toBe(true); // przeszło, bo przycięliśmy, nie odrzucili
		if (result.judged) {
			expect(result.careerPaths).toHaveLength(3); // 4. ścieżka odcięta
			expect(result.careerPaths[0].why.length).toBeLessThanOrEqual(800); // why przycięte
		}
	});
});

describe("runTurn — tryb otwierający (B0, Pomocnik odzywa się pierwszy)", () => {
	function streamModel(text: string) {
		return new MockLanguageModelV3({
			doStream: async () => ({
				stream: convertArrayToReadableStream([
					{ type: "text-start", id: "0" },
					{ type: "text-delta", id: "0", delta: text },
					{ type: "text-end", id: "0" },
					{
						type: "finish",
						finishReason: { unified: "stop", raw: "stop" },
						usage: {
							inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
							outputTokens: { total: 1, text: 1, reasoning: 0 },
						},
					},
				]),
			}),
		});
	}

	it("brak userMessage (puste + history=[]) → strumień działa bez wiadomości usera", async () => {
		const result = runTurn({
			answers: { interests: "kod" },
			history: [],
			userMessage: undefined,
			model: streamModel("Cześć! Co najbardziej lubisz robić na studiach?"),
		});
		const text = await result.text;
		expect(text).toBe("Cześć! Co najbardziej lubisz robić na studiach?");
	});
});

describe("limity w KODZIE (nie w prompcie)", () => {
	it("MAX_TURNS = 9, MAX_RESTARTS = 2", () => {
		expect(MAX_TURNS).toBe(9);
		expect(MAX_RESTARTS).toBe(2);
	});
});
