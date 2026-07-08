/**
 * Krok 5 — routing + suma DETERMINISTYCZNIE W KODZIE (§6, §I.2).
 *
 * Suma = Σ(wynik kryterium) / Σ(max_points ocenialnych kryteriów) × 100.
 * Kryteria `not_assessable` (ucięte/pominięte przez NASZ limit) są wyłączone z
 * mianownika — student nie jest karany za nasze ograniczenia (RULE 3 wyjątek).
 *
 * `needs_human_review` to ORTOGONALNA flaga nad statusem (kolumna boolean, nie
 * enum) — zapala priorytet kolejki premium (Faza 3). Werdykt maszyny obowiązuje
 * sam dla oceny formującej (ADR-008): status ustawiamy zawsze, niezależnie od
 * flagi. Fail-closed: brak ocenialnych kryteriów / parse-fail / puste repo →
 * NIGDY `verified`.
 */

import { getThresholds, type Thresholds } from "@/lib/ai/pipeline/thresholds";
import type {
	CheatSignals,
	CriterionEvaluation,
	NormalizedRubricItem,
	PipelineFlag,
	Recommendation,
} from "@/lib/ai/pipeline/types";

export type RoutingResult = {
	score: number;
	status: "verified" | "submitted" | "rejected";
	needsHumanReview: boolean;
	recommendation: Recommendation;
	flags: PipelineFlag[];
};

/** Liczy finalny wynik 0–100 z ocen cząstkowych × wagi rubryki. */
export function computeWeightedScore(
	evaluations: CriterionEvaluation[],
	rubric: NormalizedRubricItem[],
): { score: number; assessableCount: number } {
	const byId = new Map(evaluations.map((e) => [e.criterionId, e]));
	let numerator = 0;
	let denominator = 0;
	let assessableCount = 0;

	for (const item of rubric) {
		const evaln = byId.get(item.id);
		if (!evaln || evaln.status === "not_assessable") continue;
		const clamped = Math.max(0, Math.min(item.maxPoints, evaln.score));
		numerator += clamped;
		denominator += item.maxPoints;
		assessableCount += 1;
	}

	if (denominator === 0) return { score: 0, assessableCount: 0 };
	return { score: Math.round((numerator / denominator) * 100), assessableCount };
}

function buildRationale(
	verdict: Recommendation["verdict"],
	score: number,
	risk: number,
	hardFailed: boolean,
): string {
	if (verdict === "approve") {
		return `Maszyna proponuje ZATWIERDŹ: wynik ${score}/100, ryzyko ściągania niskie (${risk.toFixed(2)}), kryteria potwierdzone cytatami z pracy.`;
	}
	if (verdict === "reject") {
		return `Maszyna proponuje ODRZUĆ: wynik ${score}/100 poniżej progu, brak dowodów na spełnienie kluczowych kryteriów${hardFailed ? ", twarde sprawdzenia nie przeszły" : ""}.`;
	}
	return `Maszyna proponuje DECYZJĘ CZŁOWIEKA: wynik ${score}/100 na pograniczu albo sygnały wymagają osądu (ryzyko ${risk.toFixed(2)}${hardFailed ? ", twarde sprawdzenia nie przeszły" : ""}).`;
}

/** Główne rozstrzygnięcie kroku 5. */
export function route(args: {
	evaluations: CriterionEvaluation[];
	rubric: NormalizedRubricItem[];
	cheatSignals: CheatSignals;
	upstreamFlags: PipelineFlag[];
	thresholds?: Thresholds;
	/**
	 * B6/1.9 (ADR-012): wynik biegu ukrytych testów. false = testy nie
	 * przeszły (blokada 'verified'); null przy fladze run_unavailable =
	 * fail-closed do człowieka; undefined/null bez flag = zachowanie Fazy 1.
	 */
	runOk?: boolean | null;
}): RoutingResult {
	const t = args.thresholds ?? getThresholds();
	const { score, assessableCount } = computeWeightedScore(args.evaluations, args.rubric);
	const risk = args.cheatSignals.aggregatedRisk;

	const flagCodes = new Set(args.upstreamFlags.map((f) => f.code));
	const hardFailed = flagCodes.has("hard_check_failed");
	const failClosed =
		flagCodes.has("semantic_parse_failed") ||
		flagCodes.has("empty_or_unreadable") ||
		assessableCount === 0;

	// Status (werdykt maszyny — obowiązuje sam dla oceny formującej, ADR-008).
	// B6/1.9: oblane ukryte testy (runOk=false) blokują 'verified' — praca,
	// która nie działa, nie dostaje kredencjału niezależnie od oceny treści.
	let status: RoutingResult["status"] = "submitted";
	if (
		!failClosed &&
		args.runOk !== false &&
		score >= t.verifyMinScore &&
		risk < t.verifyMaxRisk &&
		assessableCount >= 3
	) {
		status = "verified";
	} else if (!failClosed && score < t.rejectMaxScore && assessableCount > 0) {
		status = "rejected";
	}

	// Flaga „czeka na człowieka" (priorytet kolejki premium, Faza 3) — ortogonalna.
	const flags: PipelineFlag[] = [];
	const borderline = score >= t.borderlineLow && score <= t.borderlineHigh;
	if (borderline) {
		flags.push({ code: "borderline_score", message: `Wynik na pograniczu (${score}).` });
	}
	const needsHumanReview =
		borderline ||
		risk >= t.riskThreshold ||
		hardFailed ||
		failClosed ||
		flagCodes.has("missing_evidence") ||
		// B6/1.9: oblany bieg = człowiek rozstrzyga; bieg niedostępny
		// (budżet/infra) = fail-closed do człowieka.
		flagCodes.has("run_failed") ||
		flagCodes.has("run_unavailable");

	// Rekomendacja dla człowieka-nie-eksperta (Etap 2, §6.1).
	let verdict: Recommendation["verdict"] = "borderline";
	if (status === "verified") verdict = "approve";
	else if (status === "rejected") verdict = "reject";

	const evidenceRefs = args.evaluations
		.filter((e) => e.evidenceFound && e.evidence.trim().length > 0)
		.slice(0, 10)
		.map(
			(e) => `${e.criterionId}: ${e.filePath || "(bez ścieżki)"} — „${e.evidence.slice(0, 120)}"`,
		);

	const recommendation: Recommendation = {
		verdict,
		rationale: buildRationale(verdict, score, risk, hardFailed),
		evidenceRefs,
	};

	return { score, status, needsHumanReview, recommendation, flags };
}
