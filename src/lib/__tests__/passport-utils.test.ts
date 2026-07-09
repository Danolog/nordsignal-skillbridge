import { describe, expect, it } from "vitest";
import { calculateCoverage } from "../passport-utils";

describe("calculateCoverage", () => {
	it("returns 0 for empty array and no gaps", () => {
		expect(calculateCoverage([], 0)).toBe(0);
	});

	it("returns 100 when all acquired and no gaps", () => {
		const comps = [
			{ status: "acquired" as const },
			{ status: "acquired" as const },
			{ status: "acquired" as const },
		];
		expect(calculateCoverage(comps, 0)).toBe(100);
	});

	it("returns 0 when all missing and no gaps", () => {
		const comps = [{ status: "missing" as const }, { status: "missing" as const }];
		expect(calculateCoverage(comps, 0)).toBe(0);
	});

	it("counts in_progress as 0.5", () => {
		const comps = [{ status: "in_progress" as const }, { status: "in_progress" as const }];
		// (0 + 2*0.5) / 2 * 100 = 50
		expect(calculateCoverage(comps, 0)).toBe(50);
	});

	it("calculates mixed statuses correctly", () => {
		// [1.12/§4a] Wiersz 'missing' (zmierzony poziom 1) jest reprezentowany
		// przez LUKĘ — mianownik = posiadane + luki, wiersz missing nie podwaja.
		const comps = [
			{ status: "acquired" as const },
			{ status: "in_progress" as const },
			{ status: "missing" as const },
		];
		// (1 + 1*0.5) / (2 posiadane + 1 luka-lustro) * 100 = 50
		expect(calculateCoverage(comps, 1)).toBe(50);
	});

	it("rounds to nearest integer", () => {
		const comps = [
			{ status: "acquired" as const },
			{ status: "missing" as const },
			{ status: "missing" as const },
		];
		// (1 + 0) / (1 posiadana + 2 luki-lustra) * 100 = 33.33... → 33
		expect(calculateCoverage(comps, 2)).toBe(33);
	});

	it("[1.12/§4a] wiersz missing nie podwaja pozycji katalogu w mianowniku", () => {
		// Katalog 3 pozycje: 2 posiadane + 1 oblana w diagnozie (wiersz missing
		// ORAZ luka). Mianownik musi być 3 (katalog), nie 4 (podwójne liczenie).
		const comps = [
			{ status: "acquired" as const },
			{ status: "acquired" as const },
			{ status: "missing" as const },
		];
		expect(calculateCoverage(comps, 1)).toBe(67); // 2/3, nie 2/4
	});

	it("handles single acquired competency", () => {
		expect(calculateCoverage([{ status: "acquired" as const }], 0)).toBe(100);
	});

	it("handles single missing competency", () => {
		expect(calculateCoverage([{ status: "missing" as const }], 0)).toBe(0);
	});

	it("handles single in_progress competency", () => {
		expect(calculateCoverage([{ status: "in_progress" as const }], 0)).toBe(50);
	});

	it("includes gaps in denominator for market coverage", () => {
		const comps = [{ status: "acquired" as const }, { status: "acquired" as const }];
		// 2 acquired, 2 gaps → total = 4 → 2/4 = 50%
		expect(calculateCoverage(comps, 2)).toBe(50);
	});

	it("calculates realistic scenario: 11 comps + 18 gaps", () => {
		const comps = Array.from({ length: 11 }, () => ({ status: "acquired" as const }));
		// 11 acquired / (11 + 18) = 11/29 ≈ 38%
		expect(calculateCoverage(comps, 18)).toBe(38);
	});

	it("handles gaps with mixed competency statuses", () => {
		const comps = [
			{ status: "acquired" as const },
			{ status: "acquired" as const },
			{ status: "in_progress" as const },
			{ status: "missing" as const },
		];
		// covered = 2 + 0.5 = 2.5, total = 3 posiadane + 6 luk (w tym lustro
		// wiersza missing) = 9 → 27.7… → 28%
		expect(calculateCoverage(comps, 6)).toBe(28);
	});

	it("defaults gapCount to 0 for backward compatibility", () => {
		const comps = [{ status: "acquired" as const }, { status: "acquired" as const }];
		expect(calculateCoverage(comps)).toBe(100);
	});
});

// ── B8/1.6 — plakietka „Oceniał człowiek" (ADR-011): mapowanie recenzji ──

import { buildHumanReviewMap, mapSubmissionsToReceipts } from "../passport-utils";

const SUB = {
	id: "sub-1",
	project: { title: "Dashboard", level: "L2" },
	score: 82,
	submittedAt: new Date("2026-07-01T10:00:00Z"),
	createdAt: new Date("2026-06-30T10:00:00Z"),
	repoUrl: "https://example.test/repo",
	notebookUrl: null,
	aiReviewJson: { review: { feedback: "Solidnie." } },
};

describe("buildHumanReviewMap (B8/1.6)", () => {
	it("approved od faculty/quality_operator trafia do mapy", () => {
		const map = buildHumanReviewMap([
			{ submissionId: "a", decision: "approved", reviewerType: "faculty" },
			{ submissionId: "b", decision: "approved", reviewerType: "quality_operator" },
		]);
		expect(map.get("a")).toBe("faculty");
		expect(map.get("b")).toBe("quality_operator");
	});

	it("rejected i auto_no_human NIGDY nie dają plakietki (etykieta nie kłamie)", () => {
		const map = buildHumanReviewMap([
			{ submissionId: "a", decision: "rejected", reviewerType: "faculty" },
			{ submissionId: "b", decision: "approved", reviewerType: "auto_no_human" },
		]);
		expect(map.size).toBe(0);
	});
});

describe("mapSubmissionsToReceipts + humanReviewerType (B8/1.6)", () => {
	it("wpis w mapie → humanReviewerType na receipcie", () => {
		const [receipt] = mapSubmissionsToReceipts(
			[SUB],
			new Map([["sub-1", "quality_operator" as const]]),
		);
		expect(receipt.humanReviewerType).toBe("quality_operator");
	});

	it("brak mapy / brak wpisu → null (wyłącznie ocena automatyczna)", () => {
		expect(mapSubmissionsToReceipts([SUB])[0].humanReviewerType).toBeNull();
		expect(mapSubmissionsToReceipts([SUB], new Map())[0].humanReviewerType).toBeNull();
	});
});
