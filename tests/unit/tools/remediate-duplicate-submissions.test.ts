// Testy jednostkowe (bez bazy) dla logiki wyboru rekordu kanonicznego i
// wykrywania konfliktów w narzędziu remediacji duplikatów (0.2a/0.2b).
//
// KONTEKST: po 0.2b (UNIQUE(student_id, project_id), drizzle/0021) nie da się
// już wstawić do project_submissions dwóch rekordów tej samej pary przez
// zwykły INSERT — scenariusze priorytetu/tiebreaku, które wcześniej testował
// tools/__tests__/remediate-duplicate-submissions.integration.test.ts na
// żywej bazie, są tu odtwarzane jako czyste dane w pamięci. rankCandidates i
// findConflicts nie dotykają bazy, więc nie potrzebują zmigrowanej bazy testowej.

import { describe, expect, it } from "vitest";
import {
	findConflicts,
	type RemediationPlanItem,
	rankCandidates,
} from "../../../tools/remediate-duplicate-submissions";

function candidate(overrides: {
	id: string;
	hasReview?: boolean;
	hasReflection?: boolean;
	updatedAt?: string;
	createdAt?: string;
}) {
	return {
		id: overrides.id,
		hasReview: overrides.hasReview ?? false,
		hasReflection: overrides.hasReflection ?? false,
		updatedAt: new Date(overrides.updatedAt ?? "2026-01-01T00:00:00Z"),
		createdAt: new Date(overrides.createdAt ?? "2026-01-01T00:00:00Z"),
	};
}

describe("rankCandidates", () => {
	it("bez recenzji/refleksji: wygrywa najpóźniejszy updated_at", () => {
		const older = candidate({ id: "a", updatedAt: "2026-01-01T00:00:00Z" });
		const newer = candidate({ id: "b", updatedAt: "2026-01-03T00:00:00Z" });

		const ranked = rankCandidates([older, newer]);
		expect(ranked[0].id).toBe("b");
		expect(ranked[1].id).toBe("a");
	});

	it("rekord z recenzją wygrywa nawet gdy jest starszy", () => {
		const reviewed = candidate({ id: "a", hasReview: true, updatedAt: "2026-01-01T00:00:00Z" });
		const newerNoReview = candidate({ id: "b", updatedAt: "2026-01-05T00:00:00Z" });

		const ranked = rankCandidates([newerNoReview, reviewed]);
		expect(ranked[0].id).toBe("a");
	});

	it("recenzja ma priorytet nad refleksją", () => {
		const withReflection = candidate({ id: "a", hasReflection: true });
		const withReview = candidate({ id: "b", hasReview: true });

		const ranked = rankCandidates([withReflection, withReview]);
		expect(ranked[0].id).toBe("b");
	});

	it("rekord z refleksją wygrywa, gdy żaden inny nie ma recenzji", () => {
		const withReflection = candidate({
			id: "a",
			hasReflection: true,
			updatedAt: "2026-01-01T00:00:00Z",
		});
		const newerNoReflection = candidate({ id: "b", updatedAt: "2026-01-05T00:00:00Z" });

		const ranked = rankCandidates([newerNoReflection, withReflection]);
		expect(ranked[0].id).toBe("a");
	});

	it("remis updated_at: rozstrzyga najpóźniejszy created_at", () => {
		const a = candidate({
			id: "a",
			updatedAt: "2026-01-01T00:00:00Z",
			createdAt: "2026-01-01T00:00:00Z",
		});
		const b = candidate({
			id: "b",
			updatedAt: "2026-01-01T00:00:00Z",
			createdAt: "2026-01-02T00:00:00Z",
		});

		const ranked = rankCandidates([a, b]);
		expect(ranked[0].id).toBe("b");
	});

	it("remis updated_at i created_at: rozstrzyga najniższe id (deterministyczne)", () => {
		const z = candidate({ id: "zzz" });
		const a = candidate({ id: "aaa" });

		const ranked1 = rankCandidates([z, a]);
		const ranked2 = rankCandidates([a, z]);
		expect(ranked1[0].id).toBe("aaa");
		expect(ranked2[0].id).toBe("aaa");
	});

	it("nie mutuje wejściowej tablicy", () => {
		const a = candidate({ id: "a", updatedAt: "2026-01-01T00:00:00Z" });
		const b = candidate({ id: "b", updatedAt: "2026-01-03T00:00:00Z" });
		const input = [a, b];

		rankCandidates(input);
		expect(input[0].id).toBe("a");
		expect(input[1].id).toBe("b");
	});
});

function planItem(overrides: Partial<RemediationPlanItem>): RemediationPlanItem {
	return {
		studentId: "student-1",
		projectId: "project-1",
		keepId: "keep",
		deleteIds: [],
		reviewSubmissionIds: [],
		reflectionSubmissionIds: [],
		...overrides,
	};
}

describe("findConflicts", () => {
	it("brak konfliktu, gdy każdy typ dziecka ma co najwyżej jednego właściciela", () => {
		const plan = [
			planItem({ reviewSubmissionIds: ["keep"], reflectionSubmissionIds: [] }),
			planItem({
				studentId: "student-2",
				reviewSubmissionIds: [],
				reflectionSubmissionIds: ["keep"],
			}),
		];
		expect(findConflicts(plan)).toEqual([]);
	});

	it("konflikt: dwa rekordy w grupie mają recenzję", () => {
		const plan = [planItem({ reviewSubmissionIds: ["a", "b"] })];
		const conflicts = findConflicts(plan);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].childType).toBe("review");
		expect(conflicts[0].submissionIds).toEqual(["a", "b"]);
	});

	it("konflikt: dwa rekordy w grupie mają refleksję", () => {
		const plan = [planItem({ reflectionSubmissionIds: ["a", "b"] })];
		const conflicts = findConflicts(plan);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].childType).toBe("reflection");
	});

	it("jedna grupa może zgłosić dwa niezależne konflikty (recenzja i refleksja)", () => {
		const plan = [
			planItem({ reviewSubmissionIds: ["a", "b"], reflectionSubmissionIds: ["c", "d"] }),
		];
		const conflicts = findConflicts(plan);
		expect(conflicts).toHaveLength(2);
		expect(conflicts.map((c) => c.childType).sort()).toEqual(["reflection", "review"]);
	});

	it("pusty plan → brak konfliktów", () => {
		expect(findConflicts([])).toEqual([]);
	});
});
