import { generateObject, NoObjectGeneratedError } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import {
	CareerSummarySchema,
	detectCrisis,
	generateSummary,
	groundCareerPaths,
	MAX_RESTARTS,
	MAX_TURNS,
	MIN_GENERATE_BUDGET_MS,
	MIN_JUDGE_BUDGET_MS,
	normalizeSummary,
	runTurn,
	SUMMARY_TOTAL_BUDGET_MS,
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

// Etykiety MUSZĄ być kanoniczne (z 23 ścieżek) — od F2 generateSummary odsiewa
// labele spoza katalogu. „Analityka danych" itp. zostałyby usunięte → 0 ścieżek.
const SAFE_SUMMARY = {
	summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi i porządkowanie chaosu.",
	careerPaths: [
		{ label: "Data Analyst", why: "Lubisz porządkować informacje i szukać wzorców." },
		{ label: "Data Engineer", why: "Wspominałeś o budowaniu rzeczy, które działają." },
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
			summaryText: "Twoje powołanie to dane — zostań Analitykiem.",
			// Kanoniczna etykieta, żeby grounding NIE odsiał ścieżki — test ma sprawdzać
			// guardrail werdyktu (summaryText), nie pusty wynik po odsianiu.
			careerPaths: [{ label: "Data Analyst", why: "Rekomendujemy tę ścieżkę." }],
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

describe("groundCareerPaths — ugruntowanie etykiet w 23 ścieżkach (F2)", () => {
	it("mapuje near-miss na kanoniczną, odsiewa spoza katalogu, deduplikuje", () => {
		const out = groundCareerPaths([
			{ label: "data analyst ", why: "near-miss casing/spacja" },
			{ label: "Analityka danych", why: "spoza katalogu → odsiać" },
			{ label: "Data Analyst", why: "duplikat po normalizacji → jeden wpis" },
			{ label: "Data Engineer", why: "kanoniczna" },
		]);
		expect(out.map((p) => p.label)).toEqual(["Data Analyst", "Data Engineer"]);
	});

	it("odsiewa role docelowe (D1: Pomocnik proponuje tylko 21 wejściowych)", () => {
		const out = groundCareerPaths([
			{ label: "Solution Architect", why: "rola docelowa — nie punkt startu" },
			{ label: "Engineering Manager", why: "rola docelowa — nie punkt startu" },
			{ label: "Data Analyst", why: "wejściowa — zostaje" },
		]);
		expect(out.map((p) => p.label)).toEqual(["Data Analyst"]);
	});
});

describe("generateSummary — ugruntowanie w katalogu (F2)", () => {
	it("etykiety LLM spoza 23 → odsiane → fallback warstwa4_failed (nie pokazujemy zmyślonych)", async () => {
		const bogus = {
			summaryText: "Z tego, co powiedziałeś, ciekawi Cię lotnictwo.",
			careerPaths: [
				{ label: "Pilot wycieczkowy", why: "lubisz podróże" },
				{ label: "Astronauta", why: "lubisz wysokości" },
			],
		};
		const result = await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię latać" }],
			summaryModel: objectModel(bogus),
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		// Wszystkie odsiane → 0 ścieżek 2× → łagodny fallback, nie zmyślony cel.
		expect(result.judged).toBe(false);
		expect(result.careerPaths).toHaveLength(0);
	});

	it("near-miss z LLM (data analyst ze spacją) → zmapowany do kanonicznej, judged=true", async () => {
		const nearMiss = {
			summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi.",
			careerPaths: [{ label: "data analyst ", why: "lubisz porządkować dane" }],
		};
		const result = await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: objectModel(nearMiss),
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(result.judged).toBe(true);
		if (result.judged) {
			expect(result.careerPaths).toHaveLength(1);
			expect(result.careerPaths[0].label).toBe("Data Analyst"); // kanoniczna
		}
	});

	it("prompt generacji niesie listę dozwolonych etykiet katalogu", async () => {
		let capturedPrompt = "";
		const model = new MockLanguageModelV3({
			doGenerate: async (options) => {
				const msg = options.prompt.at(-1);
				capturedPrompt = JSON.stringify(msg);
				return generateResult(SAFE_SUMMARY);
			},
		});
		await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(capturedPrompt).toContain("Data Analyst");
		expect(capturedPrompt).toContain("DOKŁADNĄ kopią");
	});
});

/**
 * A4 — łączny (end-to-end) limit czasu na /summary.
 *
 * Testujemy WŁAŚCIWOŚĆ, nie implementację: „przy modelu, który nie odpowiada,
 * student dostaje odpowiedź w skończonym, znanym czasie". Bez limitu najgorszy
 * przypadek to 2 iteracje × (2 próby generatora + 2 próby sędziego) × 45 s ≈ 360 s
 * wywołań modelu — na produkcji ucinała je dopiero platforma (504), a klient
 * ponawiał 3×, dając ~185 s kręciołka na Kroku 0 onboardingu.
 */
describe("generateSummary — łączny limit czasu operacji (A4)", () => {
	/** Model, który NIE odpowiada i NIE honoruje abortSignal (najgorszy dostawca). */
	function hangingModel() {
		let calls = 0;
		const signals: (AbortSignal | undefined)[] = [];
		const model = new MockLanguageModelV3({
			doGenerate: (options) => {
				calls++;
				signals.push(options.abortSignal);
				return new Promise(() => {
					/* nigdy nie odpowiada */
				});
			},
		});
		return { model, getCalls: () => calls, getSignals: () => signals };
	}

	it("model nie odpowiada → operacja kończy się W GRANICY budżetu, nie po pełnych próbach", async () => {
		vi.useFakeTimers();
		try {
			const gen = hangingModel();
			let settled = false;
			const promise = generateSummary({
				answers: { q1: "a" },
				history: [{ role: "user", content: "lubię dane" }],
				summaryModel: gen.model,
				judgeModel: gen.model,
			}).then((r) => {
				settled = true;
				return r;
			});

			// Przewijamy zegar DOKŁADNIE o budżet operacji. Gdyby limitu nie było,
			// promise wisiałby dalej (do ~360 s wywołań modelu albo w nieskończoność).
			await vi.advanceTimersByTimeAsync(SUMMARY_TOTAL_BUDGET_MS);

			expect(settled).toBe(true);
			const result = await promise;
			// Uczciwy degrade — ten sam stan kontraktu co przy wyczerpanym retry.
			expect(result.judged).toBe(false);
			expect(result.judgedFor).toBe("warstwa4_failed");
			expect(result.careerPaths).toHaveLength(0);
			expect(result.summaryText).toBeNull();
			// Nie przemieliliśmy pełnej puli prób (bez limitu byłoby ich do 8).
			expect(gen.getCalls()).toBe(1);
			// Deadline jedzie do modelu jako AbortSignal — zerwanie połączenia,
			// nie samo „przestajemy czekać".
			expect(gen.getSignals()[0]).toBeInstanceOf(AbortSignal);
		} finally {
			vi.useRealTimers();
		}
	});

	it("budżet już wyczerpany → nie zaczyna wywołania modelu w ogóle (zero spalonych tokenów)", async () => {
		const gen = hangingModel();
		const started = Date.now();
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: gen.model,
			judgeModel: gen.model,
			// Budżet mniejszy niż najszybszy realny przebieg → wywołanie nie ma szans.
			budgetMs: 1,
		});
		expect(Date.now() - started).toBeLessThan(1000);
		expect(gen.getCalls()).toBe(0);
		expect(result.judged).toBe(false);
		expect(result.judgedFor).toBe("warstwa4_failed");
	});

	/**
	 * W4 — rezerwacja slotu sędziego. Budżet operacji musi pomieścić generację
	 * RAZEM z jej oceną. Bez rezerwacji generacja startowała, gdy starczało czasu
	 * tylko na nią samą — po czym świeże podsumowanie (4096 tokenów wyjścia na
	 * Opusie) szło do kosza, bo sędzia nie miał już czasu. Właściwość: NIE GENERUJEMY
	 * TEGO, CZEGO NIE DA SIĘ OCENIĆ — generator nie startuje, zamiast startować i paść.
	 */
	function countingObjectModel(payload: unknown) {
		let calls = 0;
		const result = generateResult(payload);
		const model = new MockLanguageModelV3({
			doGenerate: async () => {
				calls++;
				return result;
			},
		});
		return { model, getCalls: () => calls };
	}

	it("W4: budżet < próg generacji + slot sędziego → generator NIE startuje (zero wywołań)", async () => {
		const gen = countingObjectModel(SAFE_SUMMARY);
		const judge = countingObjectModel({ verdict: "YES", reason: "ok" });
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: gen.model,
			judgeModel: judge.model,
			// O 1 ms za mało, by generację dało się OCENIĆ — choć na samą generację by starczyło.
			budgetMs: MIN_GENERATE_BUDGET_MS + MIN_JUDGE_BUDGET_MS - 1,
		});
		// Sedno: nie „wywołał się i padł", tylko w ogóle nie ruszył.
		expect(gen.getCalls()).toBe(0);
		expect(judge.getCalls()).toBe(0);
		expect(result.judged).toBe(false);
		expect(result.judgedFor).toBe("warstwa4_failed");
		expect(result.careerPaths).toHaveLength(0);
	});

	it("W4: budżet ≥ próg generacji + slot sędziego → generacja startuje i jest oceniona", async () => {
		const gen = countingObjectModel(SAFE_SUMMARY);
		const judge = countingObjectModel({ verdict: "YES", reason: "ok" });
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: gen.model,
			judgeModel: judge.model,
			budgetMs: MIN_GENERATE_BUDGET_MS + MIN_JUDGE_BUDGET_MS + 1_000,
		});
		// Próg nie jest zbyt ciasny — tuż nad granicą pracujemy normalnie.
		expect(gen.getCalls()).toBe(1);
		expect(judge.getCalls()).toBe(1);
		expect(result.judged).toBe(true);
	});

	it("powodzenie w budżecie: zachowanie bez zmian (judged=true, ścieżki, bez probability)", async () => {
		const result = await generateSummary({
			answers: { q1: "a" },
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: objectModel(SAFE_SUMMARY),
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(result.judged).toBe(true);
		if (result.judged) {
			expect(result.careerPaths).toHaveLength(2);
			expect(result.summaryText).toBe(SAFE_SUMMARY.summaryText);
		}
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
			// Etykiety kanoniczne (F2 grounding) — pierwsze 3 przeżywają po przycięciu do 3.
			careerPaths: [
				{ label: "Data Analyst", why: "x".repeat(900) }, // > 800 znaków
				{ label: "Data Engineer", why: "ok" },
				{ label: "Data Scientist", why: "ok" },
				{ label: "Frontend Developer", why: "ok" }, // > 3 ścieżki
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

describe("CareerSummarySchema — schemat tolerancyjny na realny output Opusa (fix schema-mismatch)", () => {
	// Te warianty WCZEŚNIEJ rzucały AI_NoObjectGeneratedError na prod (sonda
	// realnym generateObject potwierdziła: too_small / invalid_type wywracały CAŁY
	// obiekt). Teraz schemat MUSI je przyjąć (walidacja przechodzi) i znormalizować.
	// Używamy REALNEGO generateObject + REALNEGO CareerSummarySchema (nie repliki),
	// żeby udowodnić, że walidacja AI SDK naprawdę nie odrzuca.
	async function validateRaw(raw: unknown) {
		const result = generateResult(raw);
		const model = new MockLanguageModelV3({ doGenerate: async () => result });
		return generateObject({ model, schema: CareerSummarySchema, prompt: "x" });
	}

	it("obszar BEZ pola why (Opus pomija why) — wcześniej invalid_type, teraz przechodzi", async () => {
		const { object } = await validateRaw({
			summaryText: "Z tego, co powiedziałeś, ciekawi Cię praca z danymi.",
			careerPaths: [{ label: "Analityka danych" }], // brak why
		});
		expect(object.careerPaths).toHaveLength(1);
		expect(object.careerPaths[0].label).toBe("Analityka danych");
		expect(object.careerPaths[0].why).toBe(""); // brak why → pusty, nie crash
	});

	it("pusty summaryText (Opus zwraca pusty) — wcześniej too_small, teraz przechodzi", async () => {
		const { object } = await validateRaw({
			summaryText: "",
			careerPaths: [{ label: "Analityka danych", why: "Lubisz porządkować dane." }],
		});
		expect(object.summaryText).toBe("");
		expect(object.careerPaths).toHaveLength(1);
	});

	it("pusta tablica careerPaths — wcześniej too_small(array), teraz przechodzi (0 ścieżek)", async () => {
		const { object } = await validateRaw({ summaryText: "ok", careerPaths: [] });
		expect(object.careerPaths).toHaveLength(0); // legalny stan → fallback wyżej, nie 500
	});

	it("całkowity brak klucza careerPaths — wcześniej invalid_type, teraz default []", async () => {
		const { object } = await validateRaw({ summaryText: "ok" });
		expect(object.careerPaths).toHaveLength(0);
	});

	it("nadmiarowe pole probability — Zod 4 zdejmuje (strip), output bez niego", async () => {
		const { object } = await validateRaw({
			summaryText: "ok",
			careerPaths: [{ label: "Analityka", why: "bo dane", probability: 0.7 }],
		});
		expect(object.careerPaths[0]).not.toHaveProperty("probability");
		expect(Object.keys(object.careerPaths[0]).sort()).toEqual(["label", "why"]);
	});
});

describe("normalizeSummary — kontrakt produktowy PO walidacji (1–3 ścieżki, przycięcie)", () => {
	it("odsiewa ścieżki bez labela i przycina do 3", () => {
		const out = normalizeSummary({
			summaryText: "x".repeat(2500), // > 2000
			careerPaths: [
				{ label: "  Analityka  ", why: "y".repeat(900) }, // > 800, label do trim
				{ label: "", why: "puste — odsiać" }, // brak labela → out
				{ label: "Inżynieria", why: "ok" },
				{ label: "Data science", why: "ok" },
				{ label: "Czwarta", why: "ok" }, // > 3 → odciąć
			],
		});
		expect(out.summaryText.length).toBeLessThanOrEqual(2000);
		expect(out.careerPaths).toHaveLength(3); // 4. odcięta, pusty-label odsiany
		expect(out.careerPaths[0].label).toBe("Analityka"); // trim
		expect(out.careerPaths[0].why.length).toBeLessThanOrEqual(800); // przycięte
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

// ── AG.7 — memoryContext w promptach /turn i /summary (flaga advisorMemory) ──

describe("AG.7 · memoryContext w promptach doradcy", () => {
	function capturingStreamModel(onPrompt: (serialized: string) => void) {
		return new MockLanguageModelV3({
			doStream: async (options) => {
				onPrompt(JSON.stringify(options.prompt));
				return {
					stream: convertArrayToReadableStream([
						{ type: "text-start", id: "0" },
						{ type: "text-delta", id: "0", delta: "Cześć!" },
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
				};
			},
		});
	}

	const MEMORY = 'Profil: cel kariery „Data Analyst".\nNajwiększe luki kompetencyjne: SQL (ważna).';

	it("runTurn Z memoryContext → prompt niesie blok <student_context> z treścią", async () => {
		let captured = "";
		const result = runTurn({
			answers: { q1: "dane" },
			history: [],
			userMessage: undefined,
			memoryContext: MEMORY,
			model: capturingStreamModel((p) => {
				captured = p;
			}),
		});
		await result.text;
		expect(captured).toContain("student_context");
		expect(captured).toContain("Data Analyst");
		expect(captured).toContain("SQL (ważna)");
	});

	it("runTurn BEZ memoryContext (flaga off) → prompt bajt-w-bajt bez bloku pamięci", async () => {
		let withUndefined = "";
		let legacyShape = "";
		const argsBase = {
			answers: { q1: "dane" },
			history: [{ role: "user" as const, content: "lubię excela" }],
			userMessage: "co dalej?",
		};
		await runTurn({
			...argsBase,
			memoryContext: undefined,
			model: capturingStreamModel((p) => {
				withUndefined = p;
			}),
		}).text;
		// Kształt sprzed AG.7: wywołanie bez pola memoryContext w ogóle.
		await runTurn({
			...argsBase,
			model: capturingStreamModel((p) => {
				legacyShape = p;
			}),
		}).text;
		expect(withUndefined).toBe(legacyShape);
		expect(withUndefined).not.toContain("student_context");
	});

	it("runTurn z pustym/białym memoryContext → bez bloku (nie wstrzykujemy pustych nagłówków)", async () => {
		let captured = "";
		await runTurn({
			answers: {},
			history: [],
			memoryContext: "   ",
			model: capturingStreamModel((p) => {
				captured = p;
			}),
		}).text;
		expect(captured).not.toContain("student_context");
	});

	it("generateSummary Z memoryContext → prompt generatora niesie blok pamięci", async () => {
		let capturedPrompt = "";
		const model = new MockLanguageModelV3({
			doGenerate: async (options) => {
				capturedPrompt = JSON.stringify(options.prompt.at(-1));
				return generateResult(SAFE_SUMMARY);
			},
		});
		await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			memoryContext: MEMORY,
			summaryModel: model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(capturedPrompt).toContain("student_context");
		expect(capturedPrompt).toContain("Data Analyst");
	});

	it("generateSummary BEZ memoryContext → prompt bez bloku pamięci (zero zmian)", async () => {
		let capturedPrompt = "";
		const model = new MockLanguageModelV3({
			doGenerate: async (options) => {
				capturedPrompt = JSON.stringify(options.prompt.at(-1));
				return generateResult(SAFE_SUMMARY);
			},
		});
		await generateSummary({
			answers: {},
			history: [{ role: "user", content: "lubię dane" }],
			summaryModel: model,
			judgeModel: objectModel({ verdict: "YES", reason: "ok" }),
		});
		expect(capturedPrompt).not.toContain("student_context");
	});
});
