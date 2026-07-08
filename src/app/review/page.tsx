import { notFound, redirect } from "next/navigation";
import { ReviewQueueView } from "@/components/review/review-queue-view";
import { isFeatureEnabled } from "@/lib/flags";
import { checkReviewerAuth } from "@/lib/reviewer-auth";

// B8/1.5 — kolejka recenzji człowieka (ADR-011). Server component: bramka
// flagi (off → strona nie istnieje) + sesja recenzenta (operator ALBO
// wykładowca — checkReviewerAuth honoruje obie); dane i akcje po stronie
// klienta przez /api/review-queue (te same guardy, defense-in-depth).
export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
	if (!isFeatureEnabled("humanReviewQueue")) notFound();

	const reviewer = await checkReviewerAuth();
	if (!reviewer) redirect("/review/login");

	return (
		<main className="rq-page">
			<ReviewQueueView reviewerKind={reviewer.kind} />
		</main>
	);
}
