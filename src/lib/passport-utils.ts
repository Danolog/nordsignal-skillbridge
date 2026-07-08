// 0.15/D4: typ receiptu przeniesiony z usuniętego project-receipts.tsx (żył tam
// tylko interfejs — komponenty renderujące zastąpił passport-document).
/** B8/1.6 (ADR-011): typ recenzenta-CZŁOWIEKA na receipcie. */
export type HumanReviewerType = "faculty" | "quality_operator";

export interface ProjectReceipt {
	projectTitle: string;
	projectLevel: string;
	score: number;
	verifiedAt: string;
	repoUrl?: string | null;
	notebookUrl?: string | null;
	feedback?: string | null;
	/**
	 * B8/1.6: kto z ludzi potwierdził receipt (null = wyłącznie ocena
	 * automatyczna — etykieta w UI nigdy nie kłamie, ADR-008).
	 */
	humanReviewerType?: HumanReviewerType | null;
}

/** Kształt zgłoszenia z relacją project — dokładnie to, co czytają strony paszportu. */
type VerifiedSubmissionRow = {
	id: string;
	project: { title: string; level: string };
	score: number | null;
	submittedAt: Date | null;
	createdAt: Date;
	repoUrl: string | null;
	notebookUrl: string | null;
	aiReviewJson: unknown;
};

/**
 * 0.15/D5: mapowanie zweryfikowanych zgłoszeń na receipty paszportu — JEDNO źródło
 * (wcześniej identyczny 11-linijkowy blok w passport/page.tsx i passport/[id]/page.tsx;
 * zmiana kształtu aiReviewJson.review.feedback wymagała edycji w dwóch miejscach).
 */
export function mapSubmissionsToReceipts(
	subs: VerifiedSubmissionRow[],
	// B8/1.6: submissionId → typ recenzenta-człowieka (wpisy TYLKO dla realnych
	// decyzji człowieka — auto_no_human filtrują wywołujący). Brak mapy /
	// brak wpisu = receipt wyłącznie z oceną automatyczną.
	humanReviewBySubmission?: Map<string, HumanReviewerType>,
): ProjectReceipt[] {
	return subs.map((s) => {
		const review = (s.aiReviewJson as Record<string, unknown> | null)?.review as
			| Record<string, unknown>
			| undefined;
		return {
			projectTitle: s.project.title,
			projectLevel: s.project.level,
			score: s.score ?? 0,
			verifiedAt: (s.submittedAt ?? s.createdAt).toISOString(),
			repoUrl: s.repoUrl,
			notebookUrl: s.notebookUrl,
			feedback: typeof review?.feedback === "string" ? review.feedback : null,
			humanReviewerType: humanReviewBySubmission?.get(s.id) ?? null,
		};
	});
}

/**
 * B8/1.6: buduje mapę submissionId → typ recenzenta-człowieka z wierszy
 * submission_reviews. Liczy się wyłącznie APPROVED od człowieka
 * ('faculty'/'quality_operator'): reject zdejmuje status 'verified', więc
 * zgłoszenie i tak nie jest receiptem; 'auto_no_human' to tryb bez człowieka
 * — plakietka by kłamała (ADR-008).
 */
export function buildHumanReviewMap(
	reviews: { submissionId: string; decision: string; reviewerType: string }[],
): Map<string, HumanReviewerType> {
	const map = new Map<string, HumanReviewerType>();
	for (const r of reviews) {
		if (r.decision !== "approved") continue;
		if (r.reviewerType !== "faculty" && r.reviewerType !== "quality_operator") continue;
		map.set(r.submissionId, r.reviewerType);
	}
	return map;
}

export function calculateCoverage(
	comps: { status: "acquired" | "in_progress" | "missing" }[],
	gapCount: number = 0,
): number {
	const acquired = comps.filter((c) => c.status === "acquired").length;
	const inProgress = comps.filter((c) => c.status === "in_progress").length;
	const covered = acquired + inProgress * 0.5;
	const total = comps.length + gapCount;
	if (total === 0) return 0;
	return Math.round((covered / total) * 100);
}
