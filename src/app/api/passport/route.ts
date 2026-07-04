import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, gaps, passports, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { calculateCoverage } from "@/lib/passport-utils";

/**
 * §8 #1 Phase 2 / issue #19g (refactor sub-issue): odczyt i upsert paszportu
 * studenta przez withTenantContext({role: "student"}). Pre-fetch studentMeta
 * owner-side (wymaga tenantId do tx).
 */
export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
	});
	if (!studentMeta) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	// 0.15/B6: GET robi też INSERT/UPDATE paszportu — awaria dawała gołe 500 bez logError.
	try {
		const result = await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			async (tx) => {
				const [studentCompetencies, studentGaps] = await Promise.all([
					tx.query.competencies.findMany({
						where: eq(competencies.studentId, studentMeta.id),
					}),
					tx.query.gaps.findMany({ where: eq(gaps.studentId, studentMeta.id) }),
				]);

				let passport = await tx.query.passports.findFirst({
					where: eq(passports.studentId, studentMeta.id),
				});

				const coverage = calculateCoverage(studentCompetencies, studentGaps.length);

				// Create or update passport
				if (!passport) {
					const [created] = await tx
						.insert(passports)
						.values({
							studentId: studentMeta.id,
							tenantId: studentMeta.tenantId,
							marketCoveragePercent: coverage,
						})
						.returning();
					passport = created;
				} else if (passport.marketCoveragePercent !== coverage) {
					const [updated] = await tx
						.update(passports)
						.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
						.where(eq(passports.id, passport.id))
						.returning();
					passport = updated;
				}

				return { passport, studentCompetencies, coverage };
			},
		);

		return NextResponse.json({
			id: result.passport.id,
			student: {
				name: session.user.name,
				university: studentMeta.university,
				fieldOfStudy: studentMeta.fieldOfStudy,
				semester: studentMeta.semester,
				careerGoal: studentMeta.careerGoal,
			},
			marketCoveragePercent: result.coverage,
			competencies: result.studentCompetencies.map((c) => ({
				name: c.name,
				status: c.status,
				marketPercentage: c.marketPercentage,
			})),
			generatedAt: result.passport.updatedAt.toISOString(),
		});
	} catch (err) {
		logError("passport.get", err, { userId });
		return NextResponse.json({ error: "Nie udało się pobrać paszportu." }, { status: 500 });
	}
}
