import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn(() => "mocked-model"),
}));

// 0.3 (HIGH): wszystkie mutacje idą teraz przez `tx` w db.transaction. Mock trzyma
// spies mutacji na `txMock`, a db.transaction odpala callback z tym tx. Odczyt
// kompetencji/paszportu do pokrycia (poprawka #1) też jest wewnątrz transakcji —
// stąd competencies.findMany / passports.findFirst siedzą na tx, nie na db.
const { txMock } = vi.hoisted(() => ({
	txMock: {
		query: {
			competencies: { findMany: vi.fn() },
			passports: { findFirst: vi.fn() },
		},
		insert: vi.fn(() => ({ values: vi.fn() })),
		update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
		delete: vi.fn(() => ({ where: vi.fn() })),
	},
}));

vi.mock("@/lib/db", () => ({
	db: {
		query: {
			jobMarketData: {
				findMany: vi.fn(),
			},
		},
		transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
	},
}));

import { generateObject } from "ai";
import { db } from "@/lib/db";
import { generateGaps } from "../generate-gaps";

const mockGenerateObject = vi.mocked(generateObject);
const mockFindMany = vi.mocked(db.query.jobMarketData.findMany);
const mockTransaction = vi.mocked(db.transaction);
const mockCompetenciesFindMany = txMock.query.competencies.findMany;
const mockPassportsFindFirst = txMock.query.passports.findFirst;
const mockInsert = txMock.insert;
const mockUpdate = txMock.update;
const mockDelete = txMock.delete;

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
		// Domyślnie: jedna kompetencja acquired, paszport już istnieje (UPDATE).
		mockCompetenciesFindMany.mockResolvedValue([{ status: "acquired" }] as never);
		mockPassportsFindFirst.mockResolvedValue({ id: "passport-1" } as never);
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

		await generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst");

		expect(callOrder.indexOf("delete")).toBeLessThan(callOrder.indexOf("insert"));
		expect(mockDelete).toHaveBeenCalled();
	});

	it("still deletes when AI returns zero gaps (avoids stale leftovers)", async () => {
		mockGenerateObject.mockResolvedValue({
			object: { ...validResponse, gaps: [] },
		} as Awaited<ReturnType<typeof generateObject>>);

		await generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst");

		expect(mockDelete).toHaveBeenCalled();
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("inserts gap rows tagged with the studentId", async () => {
		const valuesSpy = vi.fn();
		mockInsert.mockReturnValue({ values: valuesSpy } as never);

		await generateGaps("student-42", "tenant-1", ["Python"], "Data Analyst");

		expect(valuesSpy).toHaveBeenCalledOnce();
		const inserted = valuesSpy.mock.calls[0][0] as Array<{ studentId: string }>;
		expect(inserted).toHaveLength(2);
		expect(inserted.every((row) => row.studentId === "student-42")).toBe(true);
	});

	it("refreshes saved passport coverage (UPDATE) — value no longer frozen (poprawka #1)", async () => {
		// 2 acquired + 2 luki ⇒ covered=2, total=4 ⇒ 50%.
		mockCompetenciesFindMany.mockResolvedValue([
			{ status: "acquired" },
			{ status: "acquired" },
		] as never);
		mockPassportsFindFirst.mockResolvedValue({ id: "passport-1" } as never);

		const setSpy = vi.fn(() => ({ where: vi.fn() }));
		mockUpdate.mockReturnValue({ set: setSpy } as never);

		await generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst");

		const passportUpdate = (setSpy.mock.calls as unknown[][]).find((call) => {
			const arg = call[0] as Record<string, unknown>;
			return "marketCoveragePercent" in arg;
		});
		expect(passportUpdate).toBeDefined();
		expect((passportUpdate?.[0] as Record<string, unknown>).marketCoveragePercent).toBe(50);
	});

	it("inserts passport with coverage when none exists yet (regeneracja przed wizytą na /passport)", async () => {
		mockCompetenciesFindMany.mockResolvedValue([{ status: "acquired" }] as never);
		mockPassportsFindFirst.mockResolvedValue(undefined as never);

		const valuesSpy = vi.fn();
		// gaps insert + passport insert obie idą przez mockInsert — łapiemy wywołanie
		// z marketCoveragePercent (passport), nie tablicę luk.
		mockInsert.mockReturnValue({ values: valuesSpy } as never);

		await generateGaps("student-7", "tenant-1", ["Python"], "Data Analyst");

		const passportInsert = (valuesSpy.mock.calls as unknown[][]).find((call) => {
			const arg = call[0] as Record<string, unknown> | unknown[] | undefined;
			return arg != null && !Array.isArray(arg) && "marketCoveragePercent" in arg;
		});
		expect(passportInsert).toBeDefined();
		const arg = passportInsert?.[0] as Record<string, unknown>;
		expect(arg.studentId).toBe("student-7");
		// 1 acquired + 2 luki ⇒ covered=1, total=3 ⇒ 33%.
		expect(arg.marketCoveragePercent).toBe(33);
	});

	it("passes schema and prompt with competencies and career goal", async () => {
		await generateGaps("student-1", "tenant-1", ["Python", "SQL"], "Data Engineer");

		const call = mockGenerateObject.mock.calls[0][0] as { schema?: unknown; prompt: string };
		expect(call.schema).toBeDefined();
		expect(call.prompt).toContain("Python");
		expect(call.prompt).toContain("SQL");
		expect(call.prompt).toContain("Data Engineer");
	});

	it("propagates AI SDK errors", async () => {
		mockGenerateObject.mockRejectedValue(new Error("rate limit"));
		await expect(generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst")).rejects.toThrow(
			"rate limit",
		);
	});

	it("wraps all writes in a single transaction — atomic, no partial state (0.3)", async () => {
		await generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst");

		// Cała sekwencja mutacji (delete+insert luk, update statusów, upsert paszportu)
		// przechodzi przez tx z db.transaction, nie bezpośrednio przez db — przerwanie
		// w środku rolluje wszystko, zamiast zostawić pulpit z 0 luk lub stare pokrycie.
		expect(mockTransaction).toHaveBeenCalledOnce();
		expect(mockDelete).toHaveBeenCalled();
		expect(mockInsert).toHaveBeenCalled();
		expect(mockUpdate).toHaveBeenCalled();
	});

	it("does no writes when the transaction fails (rolls back — propagates error)", async () => {
		mockTransaction.mockRejectedValueOnce(new Error("deadlock detected"));

		await expect(generateGaps("student-1", "tenant-1", ["Python"], "Data Analyst")).rejects.toThrow(
			"deadlock detected",
		);
	});
});
