import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GapList } from "@/components/gap-analysis/gap-list";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gaps, students } from "@/lib/db/schema";
import { getCompetencyContext } from "@/lib/onboarding/competency-groups";

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

	// Partia 5 (C5): dokładamy kontekst grupy do każdej luki przy renderze (serwerowo),
	// złączeniem po careerGoal + nazwie z career-model.json — BEZ migracji bazy (tabela `gaps`
	// nie niesie grupy/kind). Warstwa czysto prezentacyjna: nie zmienia liczby ani kolejności
	// luk (niezmiennik pokrycia/luk zachowany — to wciąż te same `sortedGaps`).
	const enrichedGaps = sortedGaps.map((gap) => {
		const ctx = getCompetencyContext(student.careerGoal, gap.competencyName);
		return {
			id: gap.id,
			competencyName: gap.competencyName,
			priority: gap.priority,
			marketPercentage: gap.marketPercentage,
			estimatedHours: gap.estimatedHours,
			whyImportant: gap.whyImportant,
			groupName: ctx?.groupName ?? null,
			groupDescription: ctx?.groupDescription ?? null,
			groupUnionShare: ctx?.unionShare ?? null,
			kind: ctx?.kind ?? null,
		};
	});

	return (
		<>
			<div className="ga-page-header">
				<h1 className="ga-page-title">Analiza luk</h1>
				<p className="ga-page-desc">
					Luki kompetencyjne między Twoim sylabusem a wymaganiami rynku pracy
				</p>
			</div>
			<GapList gaps={enrichedGaps} stats={stats} />
		</>
	);
}
