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
			students: { findFirst: vi.fn() },
			gaps: { findFirst: vi.fn() },
			competencies: { findMany: vi.fn() },
			projects: { findMany: vi.fn() },
		},
	},
}));

import { generateText } from "ai";
import { db } from "@/lib/db";
import { matchProjects } from "../match-projects";

const mockGenerateText = vi.mocked(generateText);
const mockStudents = vi.mocked(db.query.students.findFirst);
const mockGaps = vi.mocked(db.query.gaps.findFirst);
const mockCompetencies = vi.mocked(db.query.competencies.findMany);
const mockProjects = vi.mocked(db.query.projects.findMany);

const student = {
	id: "student-1",
	userId: "user-1",
	tenantId: "tenant-1",
	careerGoal: "Data Analyst",
	semester: 4,
	university: "WSB",
	fieldOfStudy: "IT",
	onboardingCompleted: true,
	onboardingStep: 5,
	syllabusText: null,
	careerHelperCompletedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const gap = {
	id: "gap-1",
	studentId: "student-1",
	tenantId: "tenant-1",
	competencyName: "Pandas",
	priority: "critical" as const,
	marketPercentage: 55,
	estimatedHours: 6,
	whyImportant: null,
	createdAt: new Date(),
};

beforeEach(() => {
	vi.clearAllMocks();
	mockStudents.mockResolvedValue(student);
	mockGaps.mockResolvedValue(gap);
	mockCompetencies.mockResolvedValue([
		{
			id: "c1",
			studentId: "student-1",
			tenantId: "tenant-1",
			name: "Python",
			status: "acquired",
			marketPercentage: 78,
			selfAssessment: null,
			verifiedByMethod: "self",
			createdAt: new Date(),
		},
		{
			id: "c2",
			studentId: "student-1",
			tenantId: "tenant-1",
			name: "SQL",
			status: "acquired",
			marketPercentage: 89,
			selfAssessment: null,
			verifiedByMethod: "self",
			createdAt: new Date(),
		},
	]);
});

describe("matchProjects", () => {
	it("returns matched projects sorted by score", async () => {
		mockProjects.mockResolvedValue([
			{
				id: "proj-1",
				slug: "analiza-gus",
				title: "Analiza GUS",
				description: "Opis",
				level: "L1",
				estimatedHours: 3,
				sourceType: "open_data",
				sourceUrl: "https://bdl.stat.gov.pl",
				partnerId: null,
				exclusivity: false,
				briefTemplate: null,
				rubricJson: [],
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
				competencies: [
					{ id: "pc1", projectId: "proj-1", competencyName: "Python", role: "required" },
					{ id: "pc2", projectId: "proj-1", competencyName: "Pandas", role: "required" },
				],
			},
		] as unknown as Awaited<ReturnType<typeof mockProjects>>);

		mockGenerateText.mockResolvedValue({
			text: JSON.stringify([
				{ projectId: "proj-1", matchScore: 85, reasoning: "Idealny projekt do nauki Pandas" },
			]),
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		const results = await matchProjects("student-1", "gap-1", 5);

		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-1");
		expect(results[0].matchScore).toBe(85);
		expect(results[0].reasoning).toBe("Idealny projekt do nauki Pandas");
		// 0.9: timeout LLM wpięty (abortSignal) w wywołaniu generateText.
		const call = mockGenerateText.mock.calls[0][0] as { abortSignal?: unknown };
		expect(call.abortSignal).toBeInstanceOf(AbortSignal);
	});

	it("returns empty array when no projects exist", async () => {
		mockProjects.mockResolvedValue([]);

		const results = await matchProjects("student-1", "gap-1");
		expect(results).toHaveLength(0);
	});

	it("throws when student not found", async () => {
		mockStudents.mockResolvedValue(undefined);

		await expect(matchProjects("unknown", "gap-1")).rejects.toThrow("Student not found");
	});

	it("throws Gap not found when gap belongs to another student (IDOR guard, 0.4)", async () => {
		// Zalogowany student-1 podaje gapId luki należącej do student-2 — bez kontroli
		// własności funkcja przeciekłaby cudzą lukę. Ten sam generyczny komunikat co dla
		// nieistniejącej luki (brak oracle istnienia).
		mockGaps.mockResolvedValue({ ...gap, studentId: "student-2" });

		await expect(matchProjects("student-1", "gap-1")).rejects.toThrow("Gap not found");
	});

	it("throws Gap not found when gap belongs to another tenant (0.4)", async () => {
		mockGaps.mockResolvedValue({ ...gap, tenantId: "tenant-999" });

		await expect(matchProjects("student-1", "gap-1")).rejects.toThrow("Gap not found");
	});

	it("throws Gap not found when gap does not exist", async () => {
		mockGaps.mockResolvedValue(undefined);

		await expect(matchProjects("student-1", "missing-gap")).rejects.toThrow("Gap not found");
	});

	it("falls back (nie 500) gdy JSON niepoprawny także po greedy matchu (0.15/C2)", async () => {
		mockProjects.mockResolvedValue([
			{
				id: "proj-2",
				slug: "demo",
				title: "Demo",
				description: "Opis",
				level: "L1",
				estimatedHours: 3,
				sourceType: "open_data",
				sourceUrl: "https://example.com",
				partnerId: null,
				exclusivity: false,
				briefTemplate: null,
				rubricJson: [],
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
				competencies: [
					{ id: "pc3", projectId: "proj-2", competencyName: "Pandas", role: "required" },
				],
			},
		] as unknown as Awaited<ReturnType<typeof mockProjects>>);

		// Tekst zawiera nawiasy [] (greedy match COŚ znajdzie), ale to nie jest poprawny
		// JSON — stary kod rzucał na DRUGIM parse (poza try) i omijał fallback → 500.
		mockGenerateText.mockResolvedValue({
			text: 'oto wynik: [{"projectId": "proj-2", "matchScore": 90,},]',
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		const results = await matchProjects("student-1", "gap-1");
		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-2");
		expect(results[0].reasoning).toBe("Dopasowanie na podstawie kompetencji");
	});

	it("filtruje zhalucynowane projectId (spoza kandydatów) i clampuje score (0.15/C2)", async () => {
		mockProjects.mockResolvedValue([
			{
				id: "proj-2",
				slug: "demo",
				title: "Demo",
				description: "Opis",
				level: "L1",
				estimatedHours: 3,
				sourceType: "open_data",
				sourceUrl: "https://example.com",
				partnerId: null,
				exclusivity: false,
				briefTemplate: null,
				rubricJson: [],
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
				competencies: [
					{ id: "pc3", projectId: "proj-2", competencyName: "Pandas", role: "required" },
				],
			},
		] as unknown as Awaited<ReturnType<typeof mockProjects>>);

		mockGenerateText.mockResolvedValue({
			text: JSON.stringify([
				{ projectId: "halucynacja-uuid", matchScore: 95, reasoning: "nie istnieje" },
				{ projectId: "proj-2", matchScore: 150, reasoning: "ok" },
			]),
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		const results = await matchProjects("student-1", "gap-1");
		// Zhalucynowany id odfiltrowany; score sklampowany do 100.
		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-2");
		expect(results[0].matchScore).toBe(100);
	});

	it("falls back to keyword scoring when LLM returns garbage", async () => {
		mockProjects.mockResolvedValue([
			{
				id: "proj-2",
				slug: "demo",
				title: "Demo",
				description: "Opis",
				level: "L1",
				estimatedHours: 3,
				sourceType: "open_data",
				sourceUrl: "https://example.com",
				partnerId: null,
				exclusivity: false,
				briefTemplate: null,
				rubricJson: [],
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
				competencies: [
					{ id: "pc3", projectId: "proj-2", competencyName: "Pandas", role: "required" },
				],
			},
		] as unknown as Awaited<ReturnType<typeof mockProjects>>);

		mockGenerateText.mockResolvedValue({
			text: "This is not valid JSON at all!!!",
		} as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

		const results = await matchProjects("student-1", "gap-1");
		expect(results).toHaveLength(1);
		expect(results[0].projectId).toBe("proj-2");
		expect(results[0].reasoning).toBe("Dopasowanie na podstawie kompetencji");
	});
});
