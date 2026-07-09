import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
	formatTutorContext,
	MAX_SNIPPET_LINES,
	MAX_TUTOR_TURNS,
	runTutorTurn,
	TUTOR_FALLBACK_REPLY,
	TUTOR_REPO_MAX_CHARS,
	type TutorProjectContext,
	violatesSolutionGuardrail,
} from "../project-tutor";

// --- Mock LLM (zero wywołań realnego API) ------------------------------------

type DoGenerateFn = Extract<
	NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>["doGenerate"],
	(...args: never[]) => unknown
>;
type GenerateResult = Awaited<ReturnType<DoGenerateFn>>;

function generateResult(text: string): GenerateResult {
	return {
		content: [{ type: "text", text }],
		finishReason: { unified: "stop", raw: "stop" },
		usage: {
			inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 1, text: 1, reasoning: 0 },
		},
		warnings: [],
	};
}

/** Model tekstowy zwracający kolejno podane odpowiedzi; liczy wywołania i prompty. */
function scriptedTextModel(replies: string[]) {
	let calls = 0;
	const prompts: string[] = [];
	const model = new MockLanguageModelV3({
		doGenerate: async (options) => {
			// Ostatnia wiadomość user w prompt — do asercji zawartości kontekstu.
			const last = options.prompt.at(-1);
			prompts.push(JSON.stringify(last));
			const reply = replies[Math.min(calls, replies.length - 1)];
			calls++;
			return generateResult(reply);
		},
	});
	return { model, getCalls: () => calls, prompts };
}

/** Sędzia zwracający kolejno podane werdykty (JSON dla generateObject). */
function scriptedJudge(verdicts: string[]) {
	let calls = 0;
	const model = new MockLanguageModelV3({
		doGenerate: async () => {
			const verdict = verdicts[Math.min(calls, verdicts.length - 1)];
			calls++;
			return generateResult(JSON.stringify({ verdict, reason: "test" }));
		},
	});
	return { model, getCalls: () => calls };
}

function failingJudge() {
	return new MockLanguageModelV3({
		doGenerate: async () => {
			throw new Error("judge down");
		},
	});
}

const CONTEXT: TutorProjectContext = {
	title: "Analiza sprzedaży sklepu",
	description: "Zbadaj dane sprzedażowe i przygotuj raport z wnioskami.",
	level: "L2",
	rubric: [{ criterion: "Jakość analizy", weight: 40, description: "Wnioski poparte danymi" }],
	brief: {
		objective: "Policz sezonowość sprzedaży",
		suggestedSteps: ["Wczytaj dane", "Oczyść braki"],
		successDefinition: "Raport z 3 wnioskami",
	},
	reviewSummary: "status submitted, wynik 55/100",
	repoExcerpt: "=== analiza.py (L1–L3) ===\nimport pandas as pd",
};

const ATTRIBUTION = { studentId: "s-1", tenantId: "t-1" };

const SAFE_REPLY =
	"Dobre pytanie! Zanim policzysz sezonowość — jak myślisz, po czym poznasz, że dane mają braki? Zajrzyj do kroku „Oczyść braki” w briefie.";

// --- violatesSolutionGuardrail -------------------------------------------------

describe("violatesSolutionGuardrail (anty-zrzut rozwiązania)", () => {
	it("odrzuca długi blok kodu w płotkach (zrzut rozwiązania)", () => {
		const code = Array.from({ length: MAX_SNIPPET_LINES + 3 }, (_, i) => `line_${i} = ${i}`).join(
			"\n",
		);
		expect(violatesSolutionGuardrail(`Proszę:\n\`\`\`python\n${code}\n\`\`\``)).toBe(true);
	});

	it("odrzuca też NIEdomknięty płotek z długim kodem (ucięta odpowiedź)", () => {
		const code = Array.from({ length: MAX_SNIPPET_LINES + 3 }, (_, i) => `x${i} = ${i}`).join("\n");
		expect(violatesSolutionGuardrail(`Start:\n\`\`\`python\n${code}`)).toBe(true);
	});

	it("przepuszcza krótki fragment ilustrujący składnię", () => {
		expect(
			violatesSolutionGuardrail(
				"Wzorzec pętli wygląda tak:\n```python\nfor x in xs:\n    ...\n```",
			),
		).toBe(false);
	});

	it("puste linie w bloku nie liczą się do limitu", () => {
		const sparse = Array.from({ length: MAX_SNIPPET_LINES }, (_, i) => `a${i} = ${i}`).join(
			"\n\n\n",
		);
		expect(violatesSolutionGuardrail(`\`\`\`\n${sparse}\n\`\`\``)).toBe(false);
	});

	it("przepuszcza czysty tekst bez kodu", () => {
		expect(violatesSolutionGuardrail("Jak myślisz, od czego zależy sezonowość?")).toBe(false);
	});
});

// --- formatTutorContext ---------------------------------------------------------

describe("formatTutorContext", () => {
	it("zawiera projekt, rubrykę, brief, recenzję i repo w tagu untrusted", () => {
		const block = formatTutorContext(CONTEXT);
		expect(block).toContain("Analiza sprzedaży sklepu");
		expect(block).toContain("poziom L2");
		expect(block).toContain("Jakość analizy (waga 40)");
		expect(block).toContain("Policz sezonowość sprzedaży");
		expect(block).toContain("status submitted, wynik 55/100");
		expect(block).toContain('<student_repo untrusted="true">');
		expect(block).toContain("import pandas as pd");
	});

	it("bez briefu/recenzji/repo — sekcje znikają, kontekst zostaje minimalny", () => {
		const block = formatTutorContext({
			...CONTEXT,
			brief: null,
			reviewSummary: null,
			repoExcerpt: null,
		});
		expect(block).not.toContain("Brief studenta");
		expect(block).not.toContain("Stan zgłoszenia");
		expect(block).not.toContain("student_repo");
		expect(block).toContain("Analiza sprzedaży sklepu");
	});

	it("teoria modułu (punkt styku 1E) wchodzi do bloku, gdy podana", () => {
		const block = formatTutorContext({ ...CONTEXT, moduleTheory: "Sezonowość to wzorzec..." });
		expect(block).toContain("Teoria modułu");
		expect(block).toContain("Sezonowość to wzorzec...");
	});
});

// --- runTutorTurn ----------------------------------------------------------------

describe("runTutorTurn (generacja → guardrail → sędzia, blokująco)", () => {
	it("szczęśliwa ścieżka: sędzia YES → odpowiedź modelu, guarded=false", async () => {
		const gen = scriptedTextModel([SAFE_REPLY]);
		const judge = scriptedJudge(["YES"]);
		const result = await runTutorTurn({
			context: CONTEXT,
			history: [],
			userMessage: "Od czego zacząć analizę?",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: judge.model,
		});
		expect(result).toEqual({ reply: SAFE_REPLY, guarded: false });
		expect(gen.getCalls()).toBe(1);
		expect(judge.getCalls()).toBe(1);
	});

	it("prompt zawiera kontekst projektu, historię i wiadomość studenta", async () => {
		const gen = scriptedTextModel([SAFE_REPLY]);
		const judge = scriptedJudge(["YES"]);
		await runTutorTurn({
			context: CONTEXT,
			history: [
				{ role: "user", content: "Nie umiem wczytać CSV" },
				{ role: "ai", content: "A jakiej biblioteki próbowałeś?" },
			],
			userMessage: "Pandas, ale sypie błędem",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: judge.model,
		});
		const prompt = gen.prompts[0];
		expect(prompt).toContain("Analiza sprzedaży sklepu");
		expect(prompt).toContain("Student: Nie umiem wczytać CSV");
		expect(prompt).toContain("Tutor: A jakiej biblioteki próbowałeś?");
		expect(prompt).toContain("Pandas, ale sypie błędem");
	});

	it("guardrail deterministyczny: zrzut kodu → regeneracja BEZ pytania sędziego o odrzuconą", async () => {
		const dump = `Masz:\n\`\`\`python\n${Array.from({ length: 20 }, (_, i) => `krok_${i}()`).join("\n")}\n\`\`\``;
		const gen = scriptedTextModel([dump, SAFE_REPLY]);
		const judge = scriptedJudge(["YES"]);
		const result = await runTutorTurn({
			context: CONTEXT,
			history: [],
			userMessage: "Daj mi cały kod",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: judge.model,
		});
		expect(result).toEqual({ reply: SAFE_REPLY, guarded: false });
		expect(gen.getCalls()).toBe(2);
		// Sędzia oceniał TYLKO drugą (czystą) odpowiedź — odrzucona nie doszła do niego.
		expect(judge.getCalls()).toBe(1);
		// Druga próba dostaje dociśnięte przypomnienie reguły.
		expect(gen.prompts[1]).toContain("PRZYPOMNIENIE");
	});

	it("sędzia NO → regeneracja; drugie NO → fallback (guarded=true)", async () => {
		const gen = scriptedTextModel(["Wynik to 42.", "Wynik to na pewno 42."]);
		const judge = scriptedJudge(["NO", "NO"]);
		const result = await runTutorTurn({
			context: CONTEXT,
			history: [],
			userMessage: "Podaj wynik",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: judge.model,
		});
		expect(result).toEqual({ reply: TUTOR_FALLBACK_REPLY, guarded: true });
		expect(gen.getCalls()).toBe(2);
		expect(judge.getCalls()).toBe(2);
	});

	it("niejednoznaczny werdykt sędziego (nie-YES) = odmowa, nie akceptacja", async () => {
		const gen = scriptedTextModel([SAFE_REPLY, SAFE_REPLY]);
		const judge = scriptedJudge(["maybe", ""]);
		const result = await runTutorTurn({
			context: CONTEXT,
			history: [],
			userMessage: "Pytanie",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: judge.model,
		});
		expect(result.guarded).toBe(true);
		expect(result.reply).toBe(TUTOR_FALLBACK_REPLY);
	});

	it("awaria sędziego → fail-closed: fallback natychmiast (niezweryfikowana odpowiedź nie wychodzi)", async () => {
		const gen = scriptedTextModel([SAFE_REPLY]);
		const result = await runTutorTurn({
			context: CONTEXT,
			history: [],
			userMessage: "Pytanie",
			attribution: ATTRIBUTION,
			model: gen.model,
			judgeModel: failingJudge(),
		});
		expect(result).toEqual({ reply: TUTOR_FALLBACK_REPLY, guarded: true });
		expect(gen.getCalls()).toBe(1);
	});

	it("błąd GENERACJI leci w górę (trasa mapuje na 502, jak brief)", async () => {
		const broken = new MockLanguageModelV3({
			doGenerate: async () => {
				throw new Error("model down");
			},
		});
		await expect(
			runTutorTurn({
				context: CONTEXT,
				history: [],
				userMessage: "Pytanie",
				attribution: ATTRIBUTION,
				model: broken,
				judgeModel: scriptedJudge(["YES"]).model,
			}),
		).rejects.toThrow("model down");
	});
});

// --- Stałe kontraktu -------------------------------------------------------------

describe("stałe kontraktu (limity w kodzie, nie w prompcie)", () => {
	it("limity są dodatnie i rozsądne", () => {
		expect(MAX_TUTOR_TURNS).toBeGreaterThan(0);
		expect(TUTOR_REPO_MAX_CHARS).toBeGreaterThan(1000);
	});
});
