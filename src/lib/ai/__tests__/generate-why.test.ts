import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
	generateText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn(() => "mocked-model"),
}));

import { generateText } from "ai";
import { generateWhyImportant } from "../generate-why";

const mockGenerateText = vi.mocked(generateText);

describe("generateWhyImportant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns trimmed text from AI response", async () => {
		const expectedText = "Python jest fundamentem analizy danych.";
		mockGenerateText.mockResolvedValue({
			text: `  ${expectedText}  `,
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		const result = await generateWhyImportant("Python", "Data Analyst", 78);

		expect(result).toBe(expectedText);
	});

	it("includes competency name in the prompt", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Opis",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		await generateWhyImportant("SQL", "Data Analyst", 85);

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.prompt).toContain("SQL");
	});

	it("includes career goal in the prompt", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Opis",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		await generateWhyImportant("Python", "Full-stack Developer", 78);

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.prompt).toContain("Full-stack Developer");
	});

	it("includes market percentage in the prompt", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Opis",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		await generateWhyImportant("Docker", "DevOps Engineer", 45);

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.prompt).toContain("45%");
	});

	it("uses maxOutputTokens of 700 (400 obcinał opisy — znalezisko AG.0)", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Opis",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		await generateWhyImportant("Python", "Data Analyst", 78);

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.maxOutputTokens).toBe(700);
	});

	it("prompt zakazuje markdownu (UI renderuje czysty tekst, nie markdown)", async () => {
		mockGenerateText.mockResolvedValue({
			text: "Opis",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		await generateWhyImportant("Python", "Data Analyst", 78);

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.prompt).toContain("CZYSTY TEKST");
		expect(call.prompt).toContain("ZERO składni markdown");
	});

	it("propagates AI SDK errors", async () => {
		mockGenerateText.mockRejectedValue(new Error("API error"));

		await expect(generateWhyImportant("Python", "Data Analyst", 78)).rejects.toThrow("API error");
	});
});
