import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "mocked-model") }));

import { generateText } from "ai";
import { runSemanticReview } from "../step3-semantic";
import type { HardTestResults, NormalizedRubricItem } from "../types";

type TextReturn = ReturnType<typeof generateText> extends Promise<infer T> ? T : never;
const mockGenerateText = vi.mocked(generateText);

const rubric: NormalizedRubricItem[] = [{ id: "c0", description: "Analiza", maxPoints: 100 }];
const hard: HardTestResults = {
	deliverableType: "code",
	readmeStructureOk: true,
	syntaxOk: true,
	inputFilePresent: true,
	runOk: null,
	messages: [],
};

const validOutput = {
	evaluations: [
		{
			criterionId: "c0",
			status: "met",
			score: 90,
			evidenceFound: true,
			evidence: "def analyze():",
			filePath: "main.py",
			justification: "Funkcja analizy obecna.",
		},
	],
	cheatSignals: {
		styleInconsistency: { flag: false, evidence: "" },
		deadCode: { flag: false, evidence: "" },
		readmeMismatch: { flag: false, evidence: "" },
		notes: "brak sygnałów",
	},
	integrityFlags: "brak",
	studentFeedback: "Dobra robota — analiza działa. Dodaj testy.",
	evaluatorSummary: "Kod czytelny, architektura prosta, sprawdź obsługę błędów.",
};

const args = {
	deliverableType: "code" as const,
	artifact: "=== main.py (L1–L2) ===\ndef analyze():\n  pass",
	readme: "# Cel\nanaliza",
	rubric,
	hardResults: hard,
	inputMeta: { truncated: false, omittedFiles: [] },
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no network")));
});

describe("step3 — ocena semantyczna (mock modelu)", () => {
	it("parsuje poprawną odpowiedź modelu na SemanticData", async () => {
		mockGenerateText.mockResolvedValue({ text: JSON.stringify(validOutput) } as TextReturn);
		const r = await runSemanticReview(args);
		expect(r.ok).toBe(true);
		expect(r.data.evaluations).toHaveLength(1);
		expect(r.data.evaluations[0].status).toBe("met");
		expect(r.data.studentFeedback).toContain("Dobra robota");
		expect(r.data.evaluatorSummary).toContain("czytelny");
	});

	it("toleruje markdown fence i trailing comma (extract-json)", async () => {
		const dirty = `\`\`\`json\n${JSON.stringify(validOutput).replace("}}", "},}")}\n\`\`\``;
		mockGenerateText.mockResolvedValue({ text: dirty } as TextReturn);
		const r = await runSemanticReview(args);
		expect(r.ok).toBe(true);
	});

	it("fail-closed: niepoprawny JSON → flaga semantic_parse_failed, pusty wynik", async () => {
		mockGenerateText.mockResolvedValue({ text: "to nie jest JSON" } as TextReturn);
		const r = await runSemanticReview(args);
		expect(r.ok).toBe(false);
		expect(r.flags.some((f) => f.code === "semantic_parse_failed")).toBe(true);
		expect(r.data.evaluations).toHaveLength(0);
	});

	it("fail-closed: wyjątek modelu → flaga semantic_parse_failed", async () => {
		mockGenerateText.mockRejectedValue(new Error("timeout"));
		const r = await runSemanticReview(args);
		expect(r.ok).toBe(false);
		expect(r.flags.some((f) => f.code === "semantic_parse_failed")).toBe(true);
	});

	it("kryterium met bez dowodu → flaga missing_evidence", async () => {
		const noEvidence = {
			...validOutput,
			evaluations: [{ ...validOutput.evaluations[0], evidenceFound: false, evidence: "" }],
		};
		mockGenerateText.mockResolvedValue({ text: JSON.stringify(noEvidence) } as TextReturn);
		const r = await runSemanticReview(args);
		expect(r.ok).toBe(true);
		expect(r.flags.some((f) => f.code === "missing_evidence")).toBe(true);
	});

	it("przekazuje treść studenta w bloku untrusted (ochrona przed wstrzyknięciem)", async () => {
		mockGenerateText.mockResolvedValue({ text: JSON.stringify(validOutput) } as TextReturn);
		await runSemanticReview(args);
		const call = mockGenerateText.mock.calls[0][0] as { prompt: string };
		expect(call.prompt).toContain('<user_input untrusted="true">');
		expect(call.prompt).toContain("<STUDENT_ARTIFACT>");
	});
});
