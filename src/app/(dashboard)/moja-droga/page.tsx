import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RhythmSection } from "@/components/rhythm/rhythm-section";
import { MyRoadView } from "@/components/skillbridge/b5/MyRoadView";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { getRhythmState } from "@/lib/rhythm/state";

export const metadata = {
	title: "Moja droga — SkillBridge",
};

export default async function MojaDrogaPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	// 1.18 — rytm nauki nad refleksjami (flaga off → sekcja nie istnieje).
	const rhythmEnabled = isFeatureEnabled("studyRhythm");
	let rhythm = null;
	let projectOptions: { id: string; title: string }[] = [];
	if (rhythmEnabled) {
		rhythm = await getRhythmState(student.id);
		// Projekty studenta do powiązania rytmu (tytuły z relacji, bez statusów
		// końcowych odrzuconych — wiązać można to, nad czym się pracuje).
		const subs = await db.query.projectSubmissions.findMany({
			where: eq(projectSubmissions.studentId, student.id),
			with: { project: { columns: { id: true, title: true } } },
			columns: { id: true, status: true },
		});
		projectOptions = subs
			.filter((s) => s.status !== "rejected")
			.map((s) => ({ id: s.project.id, title: s.project.title }));
	}

	return (
		<>
			{/* Własny kontener (lustro MyRoadView) — bez zagnieżdżania paddingów. */}
			{rhythmEnabled && rhythm && (
				<div className="max-w-[720px] mx-auto px-4 pt-8 -mb-4">
					<RhythmSection state={rhythm} projects={projectOptions} />
				</div>
			)}
			<MyRoadView />
		</>
	);
}
