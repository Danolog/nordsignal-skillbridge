import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GapList } from "@/components/gap-analysis/gap-list";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gaps, students } from "@/lib/db/schema";

export default async function GapAnalysisPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	const studentGaps = await db.query.gaps.findMany({
		where: eq(gaps.studentId, student.id),
	});

	// Sort: critical first, then by marketPercentage DESC
	const priorityOrder = { critical: 1, important: 2, nice_to_have: 3 } as const;
	const sortedGaps = studentGaps.sort((a, b) => {
		const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
		if (pDiff !== 0) return pDiff;
		return b.marketPercentage - a.marketPercentage;
	});

	const stats = {
		critical: studentGaps.filter((g) => g.priority === "critical").length,
		important: studentGaps.filter((g) => g.priority === "important").length,
		niceToHave: studentGaps.filter((g) => g.priority === "nice_to_have").length,
	};

	return (
		<>
			<div className="ga-page-header">
				<h1 className="ga-page-title">Analiza luk</h1>
				<p className="ga-page-desc">
					Luki kompetencyjne między Twoim sylabusem a wymaganiami rynku pracy
				</p>
			</div>
			<GapList gaps={sortedGaps} stats={stats} />
		</>
	);
}
