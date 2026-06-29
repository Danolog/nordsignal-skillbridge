import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "mocked-model") }));
vi.mock("../github", async () => {
	const actual = await vi.importActual<typeof import("../github")>("../github");
	return {
		...actual, // zachowaj repoCoordsFromUrl (czysta funkcja)
		fetchRepoMeta: vi.fn(),
		fetchRepoTree: vi.fn(),
		fetchBlobText: vi.fn(),
		fetchCommits: vi.fn(),
	};
});

import { generateText } from "ai";
import { fetchBlobText, fetchCommits, fetchRepoMeta, fetchRepoTree } from "../github";
import { normalizeRubric, runReviewPipeline } from "../index";

type TextReturn = ReturnType<typeof generateText> extends Promise<infer T> ? T : never;
const mockGenerateText = vi.mocked(generateText);
const mockMeta = vi.mocked(fetchRepoMeta);
const mockTree = vi.mocked(fetchRepoTree);
const mockBlob = vi.mocked(fetchBlobText);
const mockCommits = vi.mocked(fetchCommits);

const rubricJson = [
	{ criterion: "Analiza", weight: 50, description: "Poprawna analiza" },
	{ criterion: "Wizualizacja", weight: 30, description: "Czytelne wykresy" },
	{ criterion: "Wnioski", weight: 20, description: "Min. 5 wniosków" },
];

function modelOutput(scores: Array<{ id: string; score: number }>) {
	return JSON.stringify({
		evaluations: scores.map((s) => ({
			criterionId: s.id,
			status: "met",
			score: s.score,
			evidenceFound: true,
			evidence: "kod",
			filePath: "main.py",
			justification: "ok",
		})),
		cheatSignals: {
			styleInconsistency: { flag: false, evidence: "" },
			deadCode: { flag: false, evidence: "" },
			readmeMismatch: { flag: false, evidence: "" },
			notes: "",
		},
		integrityFlags: "brak",
		studentFeedback: "Świetna analiza, dorzuć opis wniosków.",
		evaluatorSummary: "Solidna praca, sprawdź wydajność.",
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("no network")));
});

describe("normalizeRubric", () => {
	it("mapuje { criterion, weight } na { id=c{n}, maxPoints=weight } + mapę nazw", () => {
		const { rubric, nameById } = normalizeRubric(rubricJson);
		expect(rubric).toEqual([
			{ id: "c0", description: "Analiza: Poprawna analiza", maxPoints: 50 },
			{ id: "c1", description: "Wizualizacja: Czytelne wykresy", maxPoints: 30 },
			{ id: "c2", description: "Wnioski: Min. 5 wniosków", maxPoints: 20 },
		]);
		expect(nameById.get("c0")).toBe("Analiza");
	});

	it("rubryka nie-tablica → pusta lista (bezpieczne)", () => {
		expect(normalizeRubric(null).rubric).toEqual([]);
	});
});

describe("runReviewPipeline — pełny potok (mock GitHub + model)", () => {
	beforeEach(() => {
		mockMeta.mockResolvedValue({ default_branch: "main" });
		mockTree.mockResolvedValue({
			tree: [
				{ path: "README.md", type: "blob", size: 50, sha: "s1" },
				{ path: "main.py", type: "blob", size: 30, sha: "s2" },
			],
		});
		mockBlob.mockImplementation(async (_c, sha) => (sha === "s1" ? "# Cel\nx" : "print(1)"));
		mockCommits.mockResolvedValue([
			{ sha: "1", commit: { author: { date: "2026-06-01T10:00:00Z", email: "a@x" } } },
			{ sha: "2", commit: { author: { date: "2026-06-03T10:00:00Z", email: "a@x" } } },
		]);
	});

	it("happy path: składa aiReviewJson z review (wstecznie zgodny) + rodzeństwem", async () => {
		mockGenerateText.mockResolvedValue({
			text: modelOutput([
				{ id: "c0", score: 45 },
				{ id: "c1", score: 27 },
				{ id: "c2", score: 18 },
			]),
		} as TextReturn);

		const r = await runReviewPipeline({
			repoUrl: "https://github.com/u/r",
			notebookUrl: null,
			rubricJson,
			deliverableType: "code",
		});

		// review wstecznie zgodny (kształt L1–L3)
		expect(r.aiReviewJson.review.criteriaScores).toHaveLength(3);
		expect(r.aiReviewJson.review.criteriaScores[0].criterion).toBe("Analiza");
		// nowe pola dowodowe per kryterium (opcjonalne)
		expect(r.aiReviewJson.review.criteriaScores[0].evidencePath).toBe("main.py");
		// rodzeństwo review (Etap 1 + Etap 2 + sygnały)
		expect(r.aiReviewJson.studentFeedback).toContain("Świetna analiza");
		expect(r.aiReviewJson.recommendation?.verdict).toBeDefined();
		expect(r.aiReviewJson.cheatSignals?.commitCount).toBe(2);
		expect(r.aiReviewJson.contentMeta?.filesFetched).toContain("main.py");
		// suma deterministyczna: (45+27+18)/100 = 90
		expect(r.score).toBe(90);
		expect(r.status).toBe("verified");
	});

	it("SSRF: niedozwolony host repo → ZERO zapytań GitHub, status nie-verified", async () => {
		mockGenerateText.mockResolvedValue({
			text: modelOutput([{ id: "c0", score: 0 }]),
		} as TextReturn);

		const r = await runReviewPipeline({
			repoUrl: "https://attacker.com/?x=github.com",
			notebookUrl: null,
			rubricJson,
			deliverableType: "code",
		});

		expect(mockMeta).not.toHaveBeenCalled();
		expect(mockTree).not.toHaveBeenCalled();
		expect(mockBlob).not.toHaveBeenCalled();
		expect(r.status).not.toBe("verified");
		expect(r.flags.some((f) => f.code === "empty_or_unreadable")).toBe(true);
	});

	it("fail-closed: błąd parsowania modelu → needs_human_review, nie verified", async () => {
		mockGenerateText.mockResolvedValue({ text: "nie-JSON" } as TextReturn);
		const r = await runReviewPipeline({
			repoUrl: "https://github.com/u/r",
			notebookUrl: null,
			rubricJson,
			deliverableType: "code",
		});
		expect(r.status).not.toBe("verified");
		expect(r.needsHumanReview).toBe(true);
	});
});
