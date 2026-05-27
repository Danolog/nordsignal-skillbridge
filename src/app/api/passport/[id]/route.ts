import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { competencies, gaps, passports, students, user } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// B1: dostęp publiczny tylko po niezgadywalnym share_token i tylko gdy student
	// włączył udostępnianie (public_enabled). Surowy PK nie jest już kluczem.
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});

	if (!passport) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});
	if (!student) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const studentUser = await db.query.user.findFirst({
		where: eq(user.id, student.userId),
	});

	const [studentCompetencies, studentGaps] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
	]);

	return NextResponse.json({
		id: passport.id,
		student: {
			name: studentUser?.name ?? "Student",
			university: student.university,
			fieldOfStudy: student.fieldOfStudy,
			semester: student.semester,
			careerGoal: student.careerGoal,
		},
		marketCoveragePercent: passport.marketCoveragePercent,
		competencies: studentCompetencies.map((c) => ({
			name: c.name,
			status: c.status,
			marketPercentage: c.marketPercentage,
		})),
		gapCount: studentGaps.length,
		generatedAt: passport.updatedAt.toISOString(),
	});
}
