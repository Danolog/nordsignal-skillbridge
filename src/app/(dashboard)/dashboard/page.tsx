import { count, eq } from "drizzle-orm";
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

	// Poprawka #1: liczymy pokrycie ŚWIEŻO przez calculateCoverage (ten sam wzór co
	// /passport, api/passport, passport/[id]), zamiast czytać zamrożone
	// passports.marketCoveragePercent. Dlatego pobieramy kompetencje ze statusami
	// (nie sam count) — coverage potrzebuje statusów. gapCount służy i jako licznik
	// luk, i jako składnik mianownika pokrycia (spójnie z resztą widoków).
	const [studentCompetencies, gapCount, courseCount] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
			columns: { status: true },
		}),
		db.select({ count: count() }).from(gaps).where(eq(gaps.studentId, student.id)),
		db
			.select({ count: count() })
			.from(projectSubmissions)
			.where(eq(projectSubmissions.studentId, student.id)),
	]);

	const gapTotal = gapCount[0]?.count ?? 0;
	const marketCoverage = calculateCoverage(studentCompetencies, gapTotal);

	return (
		<DashboardHub
			user={session.user}
			student={student}
			competencyCount={studentCompetencies.length}
			gapCount={gapTotal}
			courseCount={courseCount[0]?.count ?? 0}
			marketCoverage={marketCoverage}
		/>
	);
}
