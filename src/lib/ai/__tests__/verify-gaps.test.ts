import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn(() => "mocked-model"),
}));

import { generateObject } from "ai";
import { buildLlmGapJudge, type GapJudge, verifyGapsAgainstMarket } from "../verify-gaps";

const mockGenerateObject = vi.mocked(generateObject);

const CATALOG = [
	{ competencyName: "Python", demandPercentage: 55 },
	{ competencyName: "SQL", demandPercentage: 28 },
	{ competencyName: "Spark", demandPercentage: 12 },
];

/** Sędzia-skrypt: grounded wg zadanej mapy, rejestruje wywołania. */
function scriptedJudge(groundedByName: Record<string, boolean>): {
	judge: GapJudge;
	calls: string[];
} {
	const calls: string[] = [];
	const judge: GapJudge = async (name) => {
		calls.push(name);
		return { grounded: groundedByName[name] ?? false, reason: "skrypt" };
	};
	return { judge, calls };
}

describe("verifyGapsAgainstMarket", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("dokładne trafienie w katalog (po trim+lower) = verified/catalog, zero wywołań sędziego", async () => {
		const { judge, calls } = scriptedJudge({});
		const verdicts = await verifyGapsAgainstMarket({
			gapNames: ["python", "  SQL  ", "Spark"],
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
			judge,
		});

		expect(verdicts).toHaveLength(3);
		for (const v of verdicts) {
			expect(v.status).toBe("verified");
			expect(v.method).toBe("catalog");
		}
		expect(calls).toEqual([]);
	});

	it("kandydatki spoza katalogu idą do sędziego: YES → verified/judge, NO → rejected", async () => {
		const { judge, calls } = scriptedJudge({
			"Apache Spark": true,
			"Fotografia produktowa": false,
		});
		const verdicts = await verifyGapsAgainstMarket({
			gapNames: ["Python", "Apache Spark", "Fotografia produktowa"],
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
			judge,
		});

		// Kolejność wejścia zachowana.
		expect(verdicts.map((v) => v.competencyName)).toEqual([
			"Python",
			"Apache Spark",
			"Fotografia produktowa",
		]);
		expect(verdicts[0]).toMatchObject({ status: "verified", method: "catalog" });
		expect(verdicts[1]).toMatchObject({ status: "verified", method: "judge", reason: "skrypt" });
		expect(verdicts[2]).toMatchObject({ status: "rejected", method: "judge" });
		// Sędzia dostał WYŁĄCZNIE kandydatki nieugruntowane deterministycznie.
		expect(calls.sort()).toEqual(["Apache Spark", "Fotografia produktowa"]);
	});

	it("błąd sędziego = unverified/judge-error (luka zostaje, awaria infrastruktury nie obcina recall)", async () => {
		const judge: GapJudge = async () => {
			throw new Error("timeout");
		};
		const verdicts = await verifyGapsAgainstMarket({
			gapNames: ["Kowalstwo artystyczne"],
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
			judge,
		});

		expect(verdicts[0]).toMatchObject({ status: "unverified", method: "judge-error" });
	});

	it("pusty katalog = wszystkie unverified/no-catalog, sędzia nietknięty", async () => {
		const { judge, calls } = scriptedJudge({});
		const verdicts = await verifyGapsAgainstMarket({
			gapNames: ["Python", "Cokolwiek"],
			marketCompetencies: [],
			careerGoal: "Data Scientist",
			judge,
		});

		expect(verdicts.every((v) => v.status === "unverified" && v.method === "no-catalog")).toBe(
			true,
		);
		expect(calls).toEqual([]);
	});

	it("pusta lista luk = pusty wynik bez pracy", async () => {
		const verdicts = await verifyGapsAgainstMarket({
			gapNames: [],
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
		});
		expect(verdicts).toEqual([]);
	});
});

describe("buildLlmGapJudge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("prompt niesie katalog z popytem i nazwę luki w <user_input>; YES → grounded", async () => {
		mockGenerateObject.mockResolvedValue({
			object: { verdict: "YES", reason: "to wariant pozycji Spark" },
		} as Awaited<ReturnType<typeof generateObject>>);

		const judge = buildLlmGapJudge({
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
		});
		const result = await judge("Apache Spark");

		expect(result).toEqual({ grounded: true, reason: "to wariant pozycji Spark" });
		const call = mockGenerateObject.mock.calls[0][0] as {
			prompt: string;
			system?: string;
			abortSignal?: unknown;
		};
		expect(call.prompt).toContain("Python (55% ofert)");
		expect(call.prompt).toContain("Data Scientist");
		expect(call.prompt).toContain('<user_input untrusted="true">');
		expect(call.prompt).toContain("Apache Spark");
		expect(call.abortSignal).toBeInstanceOf(AbortSignal);
	});

	it("werdykt tolerancyjny: tylko jednoznaczne YES weryfikuje — 'yes.' / puste / 'maybe' = brak pokrycia", async () => {
		const judge = buildLlmGapJudge({
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
		});

		for (const verdict of ["yes.", "", "maybe", "NO"]) {
			mockGenerateObject.mockResolvedValue({
				object: { verdict, reason: "" },
			} as Awaited<ReturnType<typeof generateObject>>);
			const result = await judge("Cokolwiek");
			expect(result.grounded, `verdict "${verdict}" nie może weryfikować`).toBe(false);
		}
		// A małe "yes" bez kropki (po trim+upper = YES) — weryfikuje.
		mockGenerateObject.mockResolvedValue({
			object: { verdict: " yes ", reason: "" },
		} as Awaited<ReturnType<typeof generateObject>>);
		expect((await judge("Cokolwiek")).grounded).toBe(true);
	});

	it("pusty reason normalizowany do null", async () => {
		mockGenerateObject.mockResolvedValue({
			object: { verdict: "NO", reason: "  " },
		} as Awaited<ReturnType<typeof generateObject>>);
		const judge = buildLlmGapJudge({
			marketCompetencies: CATALOG,
			careerGoal: "Data Scientist",
		});
		expect((await judge("X")).reason).toBeNull();
	});
});
