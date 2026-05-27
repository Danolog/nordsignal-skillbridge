import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PassportPublic } from "@/components/passport/passport-public";
import type { PassportData } from "@/components/passport/passport-view";
import { db } from "@/lib/db";
import { competencies, gaps, passports, projectSubmissions, students, user } from "@/lib/db/schema";
import { calculateCoverage } from "@/lib/passport-utils";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});

	if (!passport) {
		return { title: "Paszport nie znaleziony" };
	}

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});
	const studentUser = student
		? await db.query.user.findFirst({ where: eq(user.id, student.userId) })
		: null;

	return {
		title: `Paszport Kompetencji — ${studentUser?.name ?? "Student"} | SkillBridge`,
		description: `Paszport kompetencji: ${student?.careerGoal ?? ""}. Pokrycie rynkowe: ${passport.marketCoveragePercent}%`,
	};
}

export default async function PublicPassportPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// B1: dostęp tylko po share_token + public_enabled (zgoda studenta).
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});
	if (!passport) notFound();

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});
	if (!student) notFound();

	const studentUser = await db.query.user.findFirst({
		where: eq(user.id, student.userId),
	});

	const [studentCompetencies, studentGaps, verifiedSubmissions] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
		db.query.projectSubmissions.findMany({
			where: and(
				eq(projectSubmissions.studentId, student.id),
				eq(projectSubmissions.status, "verified"),
			),
			with: { project: true },
		}),
	]);

	const projectReceipts = verifiedSubmissions.map((s) => ({
		projectTitle: s.project.title,
		projectLevel: s.project.level,
		score: s.score ?? 0,
		verifiedAt: (s.submittedAt ?? s.createdAt).toISOString(),
		repoUrl: s.repoUrl,
		notebookUrl: s.notebookUrl,
		feedback: (s.aiReviewJson as Record<string, unknown>)?.review
			? ((s.aiReviewJson as Record<string, Record<string, unknown>>).review.feedback as string)
			: null,
	}));

	const data: PassportData = {
		id: passport.id,
		student: {
			name: studentUser?.name ?? "Student",
			university: student.university,
			fieldOfStudy: student.fieldOfStudy,
			semester: student.semester,
			careerGoal: student.careerGoal,
		},
		marketCoveragePercent: calculateCoverage(studentCompetencies, studentGaps.length),
		competencies: studentCompetencies.map((c) => ({
			name: c.name,
			status: c.status,
			marketPercentage: c.marketPercentage,
		})),
		gapCount: studentGaps.length,
		generatedAt: passport.updatedAt.toISOString(),
		projectReceipts,
	};

	return <PassportPublic data={data} />;
}
