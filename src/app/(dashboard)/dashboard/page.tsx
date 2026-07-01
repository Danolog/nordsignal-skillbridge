import { and, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, gaps, projectSubmissions, students } from "@/lib/db/schema";
import { calculateCoverage } from "@/lib/passport-utils";

export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	// Pokrycie liczone ŚWIEŻO (ten sam wzór co /passport). Kompetencje pobieramy z
	// polami potrzebnymi na kanban (nazwa, status, popyt, samoocena) — nie sam count.
	const [studentCompetencies, gapRows, criticalGapCount, inProgressCount, topGaps] =
		await Promise.all([
			db.query.competencies.findMany({
				where: eq(competencies.studentId, student.id),
				columns: {
					id: true,
					name: true,
					status: true,
					marketPercentage: true,
					selfAssessment: true,
				},
			}),
			db.select({ count: count() }).from(gaps).where(eq(gaps.studentId, student.id)),
			db
				.select({ count: count() })
				.from(gaps)
				.where(and(eq(gaps.studentId, student.id), eq(gaps.priority, "critical"))),
			db
				.select({ count: count() })
				.from(projectSubmissions)
				.where(
					and(
						eq(projectSubmissions.studentId, student.id),
						eq(projectSubmissions.status, "in_progress"),
					),
				),
			db.query.gaps.findMany({
				where: eq(gaps.studentId, student.id),
				orderBy: [desc(gaps.marketPercentage)],
				columns: {
					competencyName: true,
					priority: true,
					marketPercentage: true,
					whyImportant: true,
				},
			}),
		]);

	const gapTotal = gapRows[0]?.count ?? 0;
	const marketCoverage = calculateCoverage(
		studentCompetencies.map((c) => ({ status: c.status })),
		gapTotal,
	);
	// „Następny krok" = najważniejsza luka: krytyczne najpierw, w obrębie priorytetu
	// najwyższy popyt rynku (topGaps już posortowane po popycie).
	const topGap = topGaps.find((g) => g.priority === "critical") ?? topGaps[0] ?? null;

	return (
		<DashboardHub
			user={session.user}
			student={student}
			competencies={studentCompetencies}
			gaps={topGaps.map((g) => ({
				competencyName: g.competencyName,
				priority: g.priority,
				marketPercentage: g.marketPercentage,
			}))}
			gapCount={gapTotal}
			criticalGapCount={criticalGapCount[0]?.count ?? 0}
			inProgressCount={inProgressCount[0]?.count ?? 0}
			marketCoverage={marketCoverage}
			topGap={topGap}
		/>
	);
}
