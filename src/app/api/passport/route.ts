import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, gaps, passports, students } from "@/lib/db/schema";
import { calculateCoverage } from "@/lib/passport-utils";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const [studentCompetencies, studentGaps] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
	]);

	let passport = await db.query.passports.findFirst({
		where: eq(passports.studentId, student.id),
	});

	const coverage = calculateCoverage(studentCompetencies, studentGaps.length);

	// Create or update passport
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

	return NextResponse.json({
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
		generatedAt: passport.updatedAt.toISOString(),
	});
}
