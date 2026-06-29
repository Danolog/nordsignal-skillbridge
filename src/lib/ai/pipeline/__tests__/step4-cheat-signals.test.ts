import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../github", () => ({
	fetchCommits: vi.fn(),
}));

import { fetchCommits } from "../github";
import {
	computeAggregatedRisk,
	deriveCommitFacts,
	HIGH_RISK_THRESHOLD,
	runCheatSignals,
} from "../step4-cheat-signals";
import type { AiCheatSignals } from "../types";

const mockFetchCommits = vi.mocked(fetchCommits);

const noAiSignals: AiCheatSignals = {
	styleInconsistency: { flag: false, evidence: "" },
	deadCode: { flag: false, evidence: "" },
	readmeMismatch: { flag: false, evidence: "" },
	notes: "",
};

beforeEach(() => vi.clearAllMocks());

describe("step4 — fakty z commitów (czysta funkcja)", () => {
	it("pojedynczy commit → singleCommit, brak rozpiętości", () => {
		const f = deriveCommitFacts(["2026-06-01T12:00:00Z"], ["alice"]);
		expect(f.commitCount).toBe(1);
		expect(f.singleCommit).toBe(true);
		expect(f.timespanMinutes).toBeNull();
	});

	it("krótka rozpiętość wielu commitów → shortTimespan", () => {
		const f = deriveCommitFacts(
			["2026-06-01T12:00:00Z", "2026-06-01T12:03:00Z"],
			["alice", "alice"],
		);
		expect(f.commitCount).toBe(2);
		expect(f.timespanMinutes).toBe(3);
		expect(f.shortTimespan).toBe(true);
		expect(f.authorCount).toBe(1);
	});

	it("naturalna historia (dni) → brak shortTimespan", () => {
		const f = deriveCommitFacts(["2026-06-01T12:00:00Z", "2026-06-05T18:00:00Z"], ["a", "b"]);
		expect(f.shortTimespan).toBe(false);
		expect(f.authorCount).toBe(2);
	});
});

describe("step4 — agregacja ryzyka (deterministyczna, w KODZIE)", () => {
	it("czyste sygnały → ryzyko 0", () => {
		expect(
			computeAggregatedRisk({
				singleCommit: false,
				bulkInitialCommit: false,
				shortTimespan: false,
				styleInconsistency: false,
				readmeMismatch: false,
				deadCode: false,
			}),
		).toBe(0);
	});

	it("single commit + krótka rozpiętość + niespójny styl → wysokie ryzyko", () => {
		const risk = computeAggregatedRisk({
			singleCommit: true,
			bulkInitialCommit: true,
			shortTimespan: true,
			styleInconsistency: true,
			readmeMismatch: false,
			deadCode: false,
		});
		expect(risk).toBeGreaterThanOrEqual(HIGH_RISK_THRESHOLD);
		expect(risk).toBeLessThanOrEqual(1);
	});
});

describe("step4 — runCheatSignals (mock GitHub API)", () => {
	it("składa fakty z commitów i zapala flagę przy wysokim ryzyku", async () => {
		mockFetchCommits.mockResolvedValue([
			{ sha: "1", commit: { author: { date: "2026-06-01T12:00:00Z", email: "a@x" } } },
		]);
		const aiHigh: AiCheatSignals = {
			...noAiSignals,
			styleInconsistency: { flag: true, evidence: "różne konwencje" },
		};
		const r = await runCheatSignals({ owner: "u", repo: "r" }, aiHigh);
		expect(r.data.commitCount).toBe(1);
		expect(r.data.singleCommit).toBe(true);
		expect(r.data.aggregatedRisk).toBeGreaterThanOrEqual(HIGH_RISK_THRESHOLD);
		expect(r.flags.some((f) => f.code === "high_cheat_risk")).toBe(true);
	});

	it("brak repo (coords null) → część automatyczna null, ryzyko tylko z AI", async () => {
		const r = await runCheatSignals(null, noAiSignals);
		expect(mockFetchCommits).not.toHaveBeenCalled();
		expect(r.data.commitCount).toBeNull();
		expect(r.data.aggregatedRisk).toBe(0);
	});

	it("GitHub API niedostępne (null) → łagodna degradacja, bez wyjątku", async () => {
		mockFetchCommits.mockResolvedValue(null);
		const r = await runCheatSignals({ owner: "u", repo: "r" }, noAiSignals);
		expect(r.ok).toBe(true);
		expect(r.data.commitCount).toBeNull();
	});
});
