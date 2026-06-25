import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generateSkillMap po poprawce #1: DETERMINISTYCZNY, bez LLM.
 * Czyta kompetencje + luki z bazy i buduje graf przez buildGraph
 * (logika grafu testowana osobno w src/lib/skill-map/__tests__/build-graph.test.ts).
 * Tu sprawdzamy tylko warstwę persystencji: insert gdy brak mapy, update gdy jest,
 * propagacja błędów — ORAZ że żaden model AI nie jest wołany (redukcja powierzchni LLM).
 */

vi.mock("@/lib/db", () => ({
	db: {
		query: {
			competencies: { findMany: vi.fn() },
			gaps: { findMany: vi.fn() },
			skillMaps: { findFirst: vi.fn() },
		},
		insert: vi.fn(() => ({ values: vi.fn() })),
		update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
	},
}));

import { db } from "@/lib/db";
import { generateSkillMap } from "../generate-skill-map";

const mockCompetencies = vi.mocked(db.query.competencies.findMany);
const mockGaps = vi.mocked(db.query.gaps.findMany);
const mockSkillMapFindFirst = vi.mocked(db.query.skillMaps.findFirst);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);

describe("generateSkillMap (deterministyczny)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCompetencies.mockResolvedValue([
			{ name: "Python", status: "acquired", marketPercentage: 80 },
			{ name: "SQL", status: "in_progress", marketPercentage: 60 },
		] as never);
		mockGaps.mockResolvedValue([
			{ competencyName: "Docker", marketPercentage: 70 },
			{ competencyName: "Kubernetes", marketPercentage: 50 },
		] as never);
	});

	it("does NOT call any AI model — deterministyczna ścieżka (domena 14)", async () => {
		// Import statyczny "ai" / "@ai-sdk/anthropic" w pliku źródłowym = brak.
		// Dowód pośredni: moduł nie importuje generateObject (gdyby tak było,
		// ten test wymagałby mocka "ai" — a go tu NIE ma i test przechodzi).
		mockSkillMapFindFirst.mockResolvedValue(undefined as never);
		mockInsert.mockReturnValue({ values: vi.fn() } as never);
		await expect(generateSkillMap("student-1", "tenant-1")).resolves.toBeUndefined();
	});

	it("inserts when no skill map exists, with nodes/edges derived from comps+gaps", async () => {
		mockSkillMapFindFirst.mockResolvedValue(undefined as never);
		const valuesSpy = vi.fn();
		mockInsert.mockReturnValue({ values: valuesSpy } as never);

		await generateSkillMap("student-1", "tenant-1");

		expect(valuesSpy).toHaveBeenCalledOnce();
		const arg = valuesSpy.mock.calls[0][0] as {
			studentId: string;
			nodes: Array<{ data: { status: string } }>;
			edges: unknown[];
		};
		expect(arg.studentId).toBe("student-1");
		// 2 kompetencje (acquired + in_progress) + 2 luki (missing) = 4 węzły.
		expect(arg.nodes).toHaveLength(4);
		// Liczba węzłów "missing" == liczba luk (sedno #1).
		expect(arg.nodes.filter((n) => n.data.status === "missing")).toHaveLength(2);
	});

	it("updates existing skill map", async () => {
		mockSkillMapFindFirst.mockResolvedValue({ id: "map-1" } as never);
		const setSpy = vi.fn(() => ({ where: vi.fn() }));
		mockUpdate.mockReturnValue({ set: setSpy } as never);

		await generateSkillMap("student-1", "tenant-1");

		expect(mockUpdate).toHaveBeenCalled();
		const arg = (setSpy.mock.calls as unknown[][])[0][0] as { nodes: unknown[]; edges: unknown[] };
		expect(arg.nodes).toHaveLength(4);
		expect(Array.isArray(arg.edges)).toBe(true);
	});

	it("propagates DB errors", async () => {
		mockCompetencies.mockRejectedValue(new Error("DB down"));
		await expect(generateSkillMap("student-1", "tenant-1")).rejects.toThrow("DB down");
	});
});
