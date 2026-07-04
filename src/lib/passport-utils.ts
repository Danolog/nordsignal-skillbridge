// 0.15/D4: typ receiptu przeniesiony z usuniętego project-receipts.tsx (żył tam
// tylko interfejs — komponenty renderujące zastąpił passport-document).
export interface ProjectReceipt {
	projectTitle: string;
	projectLevel: string;
	score: number;
	verifiedAt: string;
	repoUrl?: string | null;
	notebookUrl?: string | null;
	feedback?: string | null;
}

/** Kształt zgłoszenia z relacją project — dokładnie to, co czytają strony paszportu. */
type VerifiedSubmissionRow = {
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
export function mapSubmissionsToReceipts(subs: VerifiedSubmissionRow[]): ProjectReceipt[] {
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
		};
	});
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
