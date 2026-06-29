import { describe, expect, it } from "vitest";
import { computeWeightedScore, route } from "../step5-routing";
import type { CheatSignals, CriterionEvaluation, NormalizedRubricItem } from "../types";

const rubric: NormalizedRubricItem[] = [
	{ id: "c0", description: "A", maxPoints: 50 },
	{ id: "c1", description: "B", maxPoints: 30 },
	{ id: "c2", description: "C", maxPoints: 20 },
];

function evaln(
	id: string,
	score: number,
	status: CriterionEvaluation["status"] = "met",
): CriterionEvaluation {
	return {
		criterionId: id,
		status,
		score,
		evidenceFound: true,
		evidence: "x",
		filePath: "f.py",
		justification: "ok",
	};
}

const lowRisk: CheatSignals = {
	commitCount: 5,
	authorCount: 1,
	timespanMinutes: 600,
	singleCommit: false,
	bulkInitialCommit: false,
	shortTimespan: false,
	styleInconsistency: false,
	deadCodeRatio: false,
	readmeMismatch: false,
	notes: "",
	aggregatedRisk: 0.1,
};

describe("step5 — suma ważona (deterministyczna)", () => {
	it("sumuje wynik×waga do 0–100", () => {
		const { score, assessableCount } = computeWeightedScore(
			[evaln("c0", 50), evaln("c1", 15), evaln("c2", 10)],
			rubric,
		);
		// (50+15+10)/(50+30+20) = 75/100
		expect(score).toBe(75);
		expect(assessableCount).toBe(3);
	});

	it("not_assessable wyłączone z mianownika (nie karze za nasz limit)", () => {
		const { score, assessableCount } = computeWeightedScore(
			[evaln("c0", 50), evaln("c1", 30), evaln("c2", 0, "not_assessable")],
			rubric,
		);
		// (50+30)/(50+30) = 100, c2 pominięte
		expect(score).toBe(100);
		expect(assessableCount).toBe(2);
	});

	it("brak ocenialnych kryteriów → 0 i assessableCount 0", () => {
		const { score, assessableCount } = computeWeightedScore(
			[evaln("c0", 0, "not_assessable")],
			[rubric[0]],
		);
		expect(score).toBe(0);
		expect(assessableCount).toBe(0);
	});
});

describe("step5 — routing i status", () => {
	it("wysoki wynik + niskie ryzyko + ≥3 kryteria → verified / approve", () => {
		const r = route({
			evaluations: [evaln("c0", 45), evaln("c1", 27), evaln("c2", 18)],
			rubric,
			cheatSignals: lowRisk,
			upstreamFlags: [],
		});
		expect(r.status).toBe("verified");
		expect(r.recommendation.verdict).toBe("approve");
		expect(r.needsHumanReview).toBe(false);
	});

	it("wynik na pograniczu → needs_human_review + flaga borderline", () => {
		const r = route({
			evaluations: [evaln("c0", 25), evaln("c1", 15), evaln("c2", 10)],
			rubric,
			cheatSignals: lowRisk,
			upstreamFlags: [],
		});
		// 50/100 = pogranicze (45–55)
		expect(r.score).toBe(50);
		expect(r.needsHumanReview).toBe(true);
		expect(r.flags.some((f) => f.code === "borderline_score")).toBe(true);
	});

	it("bardzo niski wynik → rejected / reject", () => {
		const r = route({
			evaluations: [
				evaln("c0", 5, "not_met"),
				evaln("c1", 0, "not_met"),
				evaln("c2", 2, "not_met"),
			],
			rubric,
			cheatSignals: lowRisk,
			upstreamFlags: [],
		});
		expect(r.status).toBe("rejected");
		expect(r.recommendation.verdict).toBe("reject");
	});

	it("fail-closed: parse-fail → NIGDY verified", () => {
		const r = route({
			evaluations: [evaln("c0", 50), evaln("c1", 30), evaln("c2", 20)],
			rubric,
			cheatSignals: lowRisk,
			upstreamFlags: [{ code: "semantic_parse_failed", message: "x" }],
		});
		expect(r.status).not.toBe("verified");
		expect(r.needsHumanReview).toBe(true);
	});

	it("wysokie ryzyko ściągania blokuje verified i kieruje do człowieka", () => {
		const r = route({
			evaluations: [evaln("c0", 50), evaln("c1", 30), evaln("c2", 20)],
			rubric,
			cheatSignals: { ...lowRisk, aggregatedRisk: 0.8 },
			upstreamFlags: [],
		});
		expect(r.status).not.toBe("verified");
		expect(r.needsHumanReview).toBe(true);
	});

	it("rekomendacja niesie dowody (evidenceRefs) dla nie-eksperta", () => {
		const r = route({
			evaluations: [evaln("c0", 45), evaln("c1", 27), evaln("c2", 18)],
			rubric,
			cheatSignals: lowRisk,
			upstreamFlags: [],
		});
		expect(r.recommendation.evidenceRefs.length).toBeGreaterThan(0);
		expect(r.recommendation.evidenceRefs[0]).toContain("f.py");
	});
});
