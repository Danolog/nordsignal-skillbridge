import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type PassportData, PassportView } from "@/components/passport/passport-view";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, gaps, passports, projectSubmissions, students } from "@/lib/db/schema";
import { calculateCoverage, mapSubmissionsToReceipts } from "@/lib/passport-utils";

export default async function PassportPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	const [studentCompetencies, studentGaps] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
	]);

	const coverage = calculateCoverage(studentCompetencies, studentGaps.length);

	// Create or update passport
	let passport = await db.query.passports.findFirst({
		where: eq(passports.studentId, student.id),
	});

	if (!passport) {
		const [created] = await db
			.insert(passports)
			.values({
				studentId: student.id,
				tenantId: student.tenantId,
				marketCoveragePercent: coverage,
			})
			.returning();
		passport = created;
	} else if (passport.marketCoveragePercent !== coverage) {
		const [updated] = await db
			.update(passports)
			.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
			.where(eq(passports.id, passport.id))
			.returning();
		passport = updated;
	}

	const verifiedSubmissions = await db.query.projectSubmissions.findMany({
		where: and(
			eq(projectSubmissions.studentId, student.id),
			eq(projectSubmissions.status, "verified"),
		),
		with: { project: true },
	});

	// 0.15/D5: mapowanie z jednego źródła (passport-utils) — identyczny blok żył
	// też w publicznym paszporcie.
	const projectReceipts = mapSubmissionsToReceipts(verifiedSubmissions);

	const passportData: PassportData = {
		id: passport.id,
		student: {
			name: session.user.name,
			university: student.university,
			fieldOfStudy: student.fieldOfStudy,
			semester: student.semester,
			careerGoal: student.careerGoal,
		},
		marketCoveragePercent: coverage,
		competencies: studentCompetencies.map((c) => ({
			name: c.name,
			status: c.status,
			marketPercentage: c.marketPercentage,
		})),
		gapCount: studentGaps.length,
		generatedAt: passport.updatedAt.toISOString(),
		projectReceipts,
		shareToken: passport.shareToken,
		publicEnabled: passport.publicEnabled,
	};

	return <PassportView data={passportData} />;
}
