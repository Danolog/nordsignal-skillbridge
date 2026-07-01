import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfilEditor } from "@/components/profil/profil-editor";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, students } from "@/lib/db/schema";

export default async function ProfilPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student?.onboardingCompleted) redirect("/onboarding");

	const studentCompetencies = await db.query.competencies.findMany({
		where: eq(competencies.studentId, student.id),
		orderBy: (c, { asc }) => [asc(c.createdAt)],
	});

	return (
		<ProfilEditor
			initial={{
				university: student.university,
				fieldOfStudy: student.fieldOfStudy,
				semester: student.semester,
				careerGoal: student.careerGoal,
				syllabusText: student.syllabusText ?? "",
				competencies: studentCompetencies.map((c) => ({
					name: c.name,
					selfAssessment: c.selfAssessment,
				})),
			}}
		/>
	);
}
