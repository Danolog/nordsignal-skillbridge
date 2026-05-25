import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn(() => "mocked-model"),
}));

vi.mock("@/lib/db", () => ({
	db: {
		query: {
			skillMaps: {
				findFirst: vi.fn(),
			},
		},
		insert: vi.fn(() => ({
			values: vi.fn(),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(),
			})),
		})),
	},
}));

import { generateObject } from "ai";
import { db } from "@/lib/db";
import { generateSkillMap } from "../generate-skill-map";

const mockGenerateObject = vi.mocked(generateObject);
const mockFindFirst = vi.mocked(db.query.skillMaps.findFirst);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);

const validResponse = {
	nodes: [
		{
			id: "skill-1",
			data: {
				label: "Python",
				status: "acquired" as const,
				category: "programming",
				marketPercentage: 55,
			},
			position: { x: 0, y: 0 },
			type: "skillNode",
		},
		{
			id: "skill-2",
			data: {
				label: "Docker",
				status: "missing" as const,
				category: "devops",
				marketPercentage: 58,
			},
			position: { x: 220, y: 0 },
			type: "skillNode",
		},
	],
	edges: [{ id: "e1-2", source: "skill-1", target: "skill-2" }],
};

describe("generateSkillMap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("generates skill map and inserts when none exists", async () => {
		mockGenerateObject.mockResolvedValue({
			object: validResponse,
		} as Awaited<ReturnType<typeof generateObject>>);

		mockFindFirst.mockResolvedValue(undefined);

		const mockValues = vi.fn();
		mockInsert.mockReturnValue({ values: mockValues } as never);

		await generateSkillMap("student-1", ["Python", "SQL"], "Full-stack Developer");

		expect(mockGenerateObject).toHaveBeenCalledOnce();
		expect(mockInsert).toHaveBeenCalled();
		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				studentId: "student-1",
				nodes: validResponse.nodes,
				edges: validResponse.edges,
			}),
		);
	});

	it("updates existing skill map", async () => {
		mockGenerateObject.mockResolvedValue({
			object: validResponse,
		} as Awaited<ReturnType<typeof generateObject>>);

		mockFindFirst.mockResolvedValue({
			id: "map-1",
			studentId: "student-1",
			nodes: [],
			edges: [],
			generatedAt: new Date(),
			updatedAt: new Date(),
		});

		const mockWhere = vi.fn();
		const mockSet = vi.fn(() => ({ where: mockWhere }));
		mockUpdate.mockReturnValue({ set: mockSet } as never);

		await generateSkillMap("student-1", ["Python"], "Data Analyst");

		expect(mockUpdate).toHaveBeenCalled();
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				nodes: validResponse.nodes,
				edges: validResponse.edges,
			}),
		);
	});

	it("passes schema and prompt with competencies and career goal", async () => {
		mockGenerateObject.mockResolvedValue({
			object: validResponse,
		} as Awaited<ReturnType<typeof generateObject>>);

		mockFindFirst.mockResolvedValue(undefined);
		mockInsert.mockReturnValue({ values: vi.fn() } as never);

		await generateSkillMap("student-1", ["React", "TypeScript"], "Frontend Developer");

		const call = mockGenerateObject.mock.calls[0][0] as { schema?: unknown; prompt: string };
		expect(call.schema).toBeDefined();
		expect(call.prompt).toContain("React");
		expect(call.prompt).toContain("TypeScript");
		expect(call.prompt).toContain("Frontend Developer");
	});

	it("propagates AI SDK errors", async () => {
		mockGenerateObject.mockRejectedValue(new Error("API rate limit exceeded"));

		await expect(generateSkillMap("student-1", ["Python"], "Data Analyst")).rejects.toThrow(
			"API rate limit exceeded",
		);
	});
});
