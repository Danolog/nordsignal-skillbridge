/**
 * Krok 4 — cheat-risk oparty na FAKTACH (koniec zgadywania z dat, §5).
 *
 * Sygnały automatyczne (GitHub API, bez AI): liczba/rozpiętość/autorzy commitów
 * → flagi `singleCommit`, `bulkInitialCommit`, `shortTimespan`.
 * Sygnały AI (z kroku 3): niespójność stylu, martwy kod, niezgodność README.
 * `aggregatedRisk` (0.0–1.0) liczy KOD jawnym, audytowalnym wzorem z flag —
 * NIE zgaduje go model (wprost §III wymagań).
 */

import type { CommitListEntry } from "@/lib/ai/pipeline/github";
import type {
	AiCheatSignals,
	CheatSignals,
	PipelineFlag,
	StepResult,
} from "@/lib/ai/pipeline/types";

/** Próg „cała historia w krótkim oknie" (minuty) — objaw „wklejone na raz". */
const SHORT_TIMESPAN_MINUTES = 10;
/** Próg zagregowanego ryzyka, powyżej którego zapalamy flagę do człowieka. */
export const HIGH_RISK_THRESHOLD = 0.6;

/** Wagi składników ryzyka (sumują się ≤ 1.0 po nasyceniu). */
const RISK_WEIGHTS = {
	bulkOrSingle: 0.35,
	shortTimespan: 0.25,
	styleInconsistency: 0.25,
	readmeMismatch: 0.15,
	deadCode: 0.1,
} as const;

export type CommitFacts = {
	commitCount: number;
	authorCount: number;
	timespanMinutes: number | null;
	singleCommit: boolean;
	shortTimespan: boolean;
};

/** Czysta funkcja: liczy fakty z listy commitów (do testów bez sieci). */
export function deriveCommitFacts(
	dates: Array<string | undefined>,
	authors: Array<string | undefined>,
): CommitFacts {
	const commitCount = dates.length;
	const validDates = dates
		.filter((d): d is string => Boolean(d))
		.map((d) => new Date(d).getTime())
		.filter((t) => !Number.isNaN(t))
		.sort((a, b) => a - b);

	let timespanMinutes: number | null = null;
	if (validDates.length >= 2) {
		timespanMinutes = Math.round((validDates[validDates.length - 1] - validDates[0]) / 60000);
	}

	const authorSet = new Set(authors.filter((a): a is string => Boolean(a)));

	return {
		commitCount,
		authorCount: authorSet.size,
		timespanMinutes,
		singleCommit: commitCount === 1,
		shortTimespan:
			timespanMinutes !== null && commitCount > 1 && timespanMinutes < SHORT_TIMESPAN_MINUTES,
	};
}

/** Czysta funkcja: deterministyczny wzór agregacji ryzyka 0.0–1.0. */
export function computeAggregatedRisk(signals: {
	singleCommit: boolean | null;
	bulkInitialCommit: boolean | null;
	shortTimespan: boolean | null;
	styleInconsistency: boolean;
	readmeMismatch: boolean;
	deadCode: boolean;
}): number {
	let risk = 0;
	if (signals.singleCommit || signals.bulkInitialCommit) risk += RISK_WEIGHTS.bulkOrSingle;
	if (signals.shortTimespan) risk += RISK_WEIGHTS.shortTimespan;
	if (signals.styleInconsistency) risk += RISK_WEIGHTS.styleInconsistency;
	if (signals.readmeMismatch) risk += RISK_WEIGHTS.readmeMismatch;
	if (signals.deadCode) risk += RISK_WEIGHTS.deadCode;
	return Math.min(1, Math.round(risk * 100) / 100);
}

/**
 * Krok 4 — składa pełny obiekt sygnałów z listy commitów pobranej w index.ts
 * (Blok E/E1: jedno pobranie wspólne z krokiem 3 — koniec podwójnego fetchu).
 * `commits` null (brak repo / API padło) → część automatyczna pomijana (null),
 * ryzyko liczone tylko z sygnałów AI. Łagodna degradacja, bez wyjątków.
 */
export async function runCheatSignals(
	commits: CommitListEntry[] | null,
	aiSignals: AiCheatSignals,
): Promise<StepResult<CheatSignals>> {
	const flags: PipelineFlag[] = [];

	let commitCount: number | null = null;
	let authorCount: number | null = null;
	let timespanMinutes: number | null = null;
	let singleCommit: boolean | null = null;
	let bulkInitialCommit: boolean | null = null;
	let shortTimespan: boolean | null = null;

	if (commits && commits.length > 0) {
		const facts = deriveCommitFacts(
			commits.map((c) => c.commit?.author?.date),
			commits.map((c) => c.author?.login ?? c.commit?.author?.email),
		);
		commitCount = facts.commitCount;
		authorCount = facts.authorCount;
		timespanMinutes = facts.timespanMinutes;
		singleCommit = facts.singleCommit;
		shortTimespan = facts.shortTimespan;
		// „bulk initial" w Fazie 1 aproksymujemy jako pojedynczy commit
		// (statystyki diff per-commit to osobne zapytania — dokładamy później).
		bulkInitialCommit = facts.singleCommit;
	}

	const aggregatedRisk = computeAggregatedRisk({
		singleCommit,
		bulkInitialCommit,
		shortTimespan,
		styleInconsistency: aiSignals.styleInconsistency.flag,
		readmeMismatch: aiSignals.readmeMismatch.flag,
		deadCode: aiSignals.deadCode.flag,
	});

	if (aggregatedRisk >= HIGH_RISK_THRESHOLD) {
		flags.push({
			code: "high_cheat_risk",
			message: `Wysokie ryzyko ściągania (${aggregatedRisk.toFixed(2)}).`,
		});
	}

	return {
		ok: true,
		data: {
			commitCount,
			authorCount,
			timespanMinutes,
			singleCommit,
			bulkInitialCommit,
			shortTimespan,
			styleInconsistency: aiSignals.styleInconsistency.flag,
			deadCodeRatio: aiSignals.deadCode.flag,
			readmeMismatch: aiSignals.readmeMismatch.flag,
			notes: aiSignals.notes,
			aggregatedRisk,
		},
		flags,
	};
}
