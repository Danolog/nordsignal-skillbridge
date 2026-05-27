import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
	generateText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn(() => "mocked-model"),
}));

vi.mock("@/lib/db", () => ({
	db: {
		query: {
			projects: { findFirst: vi.fn() },
			students: { findFirst: vi.fn() },
			competencies: { findMany: vi.fn() },
		},
	},
}));

vi.mock("../learning-steps", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		generateLearningSteps: vi.fn(),
	};
});

import { generateText } from "ai";
import { db } from "@/lib/db";
import { generateProjectBrief } from "../generate-brief";
import { generateLearningSteps } from "../learning-steps";

type TextReturn = ReturnType<typeof generateText> extends Promise<infer T> ? T : never;

const mockGenerateText = vi.mocked(generateText);
const mockProjects = vi.mocked(db.query.projects.findFirst);
const mockStudents = vi.mocked(db.query.students.findFirst);
const mockComps = vi.mocked(db.query.competencies.findMany);
const mockLearningSteps = vi.mocked(generateLearningSteps);

const project = {
	id: "proj-1",
	slug: "test",
	title: "Test Project",
	description: "Opis",
	level: "L1" as const,
	estimatedHours: 3,
	sourceType: "open_data" as const,
	sourceUrl: "https://example.com",
	partnerId: null,
	exclusivity: false,
	briefTemplate: null,
	rubricJson: [{ criterion: "Kryterium 1", weight: 50, description: "Opis" }],
	status: "active",
	createdAt: new Date(),
	updatedAt: new Date(),
	competencies: [
		{ id: "pc1", projectId: "proj-1", competencyName: "Python", role: "required" },
		{ id: "pc2", projectId: "proj-1", competencyName: "Pandas", role: "required" },
	],
};

const student = {
	id: "student-1",
	userId: "user-1",
	tenantId: "tenant-1",
	careerGoal: "Data Analyst",
	semester: 4,
	university: "WSB",
	fieldOfStudy: "IT",
	onboardingCompleted: true,
	syllabusText: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const briefResponse = JSON.stringify({
	objective: "Cel projektu",
	inputData: "Dane wejściowe",
	suggestedSteps: ["Krok 1", "Krok 2"],
	successDefinition: "Definicja sukcesu",
});

beforeEach(() => {
	vi.clearAllMocks();
	mockProjects.mockResolvedValue(project);
	mockStudents.mockResolvedValue(student);
	mockLearningSteps.mockResolvedValue([{ title: "Krok nauki", content: "Treść" }]);
});

describe("generateProjectBrief", () => {
	it("returns complete brief with learning steps for missing competencies", async () => {
		mockComps.mockResolvedValue([
			{
				id: "c1",
				studentId: "student-1",
				tenantId: "tenant-1",
				name: "Python",
				status: "acquired",
				marketPercentage: 78,
				createdAt: new Date(),
			},
		]);

		mockGenerateText.mockResolvedValue({ text: briefResponse } as TextReturn);

		const brief = await generateProjectBrief("proj-1", "student-1");

		expect(brief.objective).toBe("Cel projektu");
		expect(brief.suggestedSteps).toHaveLength(2);
		expect(brief.learningSteps).toHaveLength(1);
		expect(brief.acceptanceCriteria).toHaveLength(1);
		expect(mockLearningSteps).toHaveBeenCalledWith("Pandas", "Data Analyst", 4, ["python"], 3);
	});

	it("skips learning steps when student has all required competencies", async () => {
		mockComps.mockResolvedValue([
			{
				id: "c1",
				studentId: "student-1",
				tenantId: "tenant-1",
				name: "Python",
				status: "acquired",
				marketPercentage: 78,
				createdAt: new Date(),
			},
			{
				id: "c2",
				studentId: "student-1",
				tenantId: "tenant-1",
				name: "Pandas",
				status: "acquired",
				marketPercentage: 55,
				createdAt: new Date(),
			},
		]);

		mockGenerateText.mockResolvedValue({ text: briefResponse } as TextReturn);

		const brief = await generateProjectBrief("proj-1", "student-1");

		expect(brief.learningSteps).toHaveLength(0);
		expect(mockLearningSteps).not.toHaveBeenCalled();
	});

	it("throws when project not found", async () => {
		mockProjects.mockResolvedValue(undefined);

		await expect(generateProjectBrief("unknown", "student-1")).rejects.toThrow("Project not found");
	});

	it("handles AI parse errors with regex fallback", async () => {
		mockComps.mockResolvedValue([]);
		mockGenerateText.mockResolvedValue({
			text: `Some text before ${briefResponse} some text after`,
		} as TextReturn);

		const brief = await generateProjectBrief("proj-1", "student-1");
		expect(brief.objective).toBe("Cel projektu");
	});
});
