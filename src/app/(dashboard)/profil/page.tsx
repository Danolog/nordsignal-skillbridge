import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlacementSection } from "@/components/placement/placement-section";
import { ProfilEditor } from "@/components/profil/profil-editor";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, placementEvents, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

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

	// 1.17 — historia placement (tylko przy zapalonej fladze; zapytanie za
	// bramką, żeby wyłączony feature nie kosztował nawet SELECT-a).
	const placementEnabled = isFeatureEnabled("placementTracking");
	const placement = placementEnabled
		? await db.query.placementEvents.findMany({
				where: eq(placementEvents.studentId, student.id),
				orderBy: (e, { desc }) => [desc(e.occurredAt)],
			})
		: [];

	return (
		<div className="space-y-6">
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
			{/* 1.17 — zgoda + baseline + zdarzenia placement (flaga server-side). */}
			{placementEnabled && (
				<PlacementSection
					consent={student.placementConsent}
					decided={student.placementDecidedAt !== null}
					hasBaseline={placement.some((e) => e.kind === "baseline")}
					events={placement.map((e) => ({
						id: e.id,
						kind: e.kind,
						employmentStatus: e.employmentStatus,
						careerAligned: e.careerAligned,
						occurredAt: e.occurredAt.toISOString(),
						note: e.note,
					}))}
				/>
			)}
		</div>
	);
}
