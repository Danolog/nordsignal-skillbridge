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
			jobMarketData: {
				findMany: vi.fn(),
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
		delete: vi.fn(() => ({
			where: vi.fn(),
		})),
	},
}));

import { generateObject } from "ai";
import { db } from "@/lib/db";
import { generateGaps } from "../generate-gaps";

const mockGenerateObject = vi.mocked(generateObject);
const mockFindMany = vi.mocked(db.query.jobMarketData.findMany);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);
const mockDelete = vi.mocked(db.delete);

const validResponse = {
	gaps: [
		{ name: "Docker", priority: "critical" as const, marketPercentage: 70, estimatedHours: 20 },
		{
			name: "Kubernetes",
			priority: "important" as const,
			marketPercentage: 50,
			estimatedHours: 30,
		},
	],
	competencyUpdates: [{ name: "Python", status: "acquired" as const, marketPercentage: 80 }],
};

describe("generateGaps", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindMany.mockResolvedValue([]);
		mockGenerateObject.mockResolvedValue({
			object: validResponse,
		} as Awaited<ReturnType<typeof generateObject>>);
		mockInsert.mockReturnValue({ values: vi.fn() } as never);
		mockUpdate.mockReturnValue({
			set: vi.fn(() => ({ where: vi.fn() })),
		} as never);
		mockDelete.mockReturnValue({ where: vi.fn() } as never);
	});

	it("deletes existing gaps before inserting new ones (idempotent re-run)", async () => {
		const callOrder: string[] = [];
		mockDelete.mockImplementation(((..._args: unknown[]) => {
			callOrder.push("delete");
			return { where: vi.fn() } as never;
		}) as typeof db.delete);
		mockInsert.mockImplementation(((..._args: unknown[]) => {
			callOrder.push("insert");
			return { values: vi.fn() } as never;
		}) as typeof db.insert);

		await generateGaps("student-1", ["Python"], "Data Analyst");

		expect(callOrder.indexOf("delete")).toBeLessThan(callOrder.indexOf("insert"));
		expect(mockDelete).toHaveBeenCalled();
	});

	it("still deletes when AI returns zero gaps (avoids stale leftovers)", async () => {
		mockGenerateObject.mockResolvedValue({
			object: { ...validResponse, gaps: [] },
		} as Awaited<ReturnType<typeof generateObject>>);

		await generateGaps("student-1", ["Python"], "Data Analyst");

		expect(mockDelete).toHaveBeenCalled();
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("inserts gap rows tagged with the studentId", async () => {
		const valuesSpy = vi.fn();
		mockInsert.mockReturnValue({ values: valuesSpy } as never);

		await generateGaps("student-42", ["Python"], "Data Analyst");

		expect(valuesSpy).toHaveBeenCalledOnce();
		const inserted = valuesSpy.mock.calls[0][0] as Array<{ studentId: string }>;
		expect(inserted).toHaveLength(2);
		expect(inserted.every((row) => row.studentId === "student-42")).toBe(true);
	});

	it("does not write marketCoveragePercent — passport coverage is owned by passport route", async () => {
		const setSpy = vi.fn(() => ({ where: vi.fn() }));
		mockUpdate.mockReturnValue({ set: setSpy } as never);

		await generateGaps("student-1", ["Python"], "Data Analyst");

		const passportUpdate = setSpy.mock.calls.find((call) => {
			const arg = (call as unknown[])[0] as Record<string, unknown>;
			return "marketCoveragePercent" in arg;
		});
		expect(passportUpdate).toBeUndefined();
	});

	it("passes schema and prompt with competencies and career goal", async () => {
		await generateGaps("student-1", ["Python", "SQL"], "Data Engineer");

		const call = mockGenerateObject.mock.calls[0][0] as { schema?: unknown; prompt: string };
		expect(call.schema).toBeDefined();
		expect(call.prompt).toContain("Python");
		expect(call.prompt).toContain("SQL");
		expect(call.prompt).toContain("Data Engineer");
	});

	it("propagates AI SDK errors", async () => {
		mockGenerateObject.mockRejectedValue(new Error("rate limit"));
		await expect(generateGaps("student-1", ["Python"], "Data Analyst")).rejects.toThrow(
			"rate limit",
		);
	});
});
