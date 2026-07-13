import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectReflections, projectSubmissions, projects, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	const { id } = await params;
	// B3 — teoria (project.theoryMd) + źródła (learningResources, posortowane po position).
	// project_learning_resources to klasa K-PUB (globalny katalog, bez RLS) — czytamy przez db.
	const project = await db.query.projects.findFirst({
		where: eq(projects.id, id),
		with: {
			competencies: true,
			learningResources: {
				// Blok E (E4): metadane compliance (QG-5 §4) muszą docierać do studenta —
				// plakietki „wymaga konta" / licencja / data weryfikacji w SourceLinkRow.
				columns: {
					title: true,
					url: true,
					type: true,
					license: true,
					registrationRequired: true,
					verifiedAt: true,
				},
				orderBy: (r, { asc }) => [asc(r.position)],
			},
			// #7 — linki źródła danych (2–3), posortowane po position. K-PUB (bez RLS) — czytamy przez db.
			sourceLinks: {
				columns: { url: true, label: true, isDead: true },
				orderBy: (r, { asc }) => [asc(r.position)],
			},
		},
	});
	if (!project) notFound();

	const submission = await db.query.projectSubmissions.findFirst({
		where: and(eq(projectSubmissions.studentId, student.id), eq(projectSubmissions.projectId, id)),
	});

	// B5 — wczytaj istniejącą refleksję dla tego zgłoszenia (null = nieistniejąca).
	// Prywatność: wczytywana tylko gdy jest submission (brak submission = brak refleksji).
	const reflection = submission
		? await db.query.projectReflections.findFirst({
				where: eq(projectReflections.submissionId, submission.id),
				columns: {
					answerSurprised: true,
					answerFrustrated: true,
					answerLearned: true,
				},
			})
		: null;

	return (
		<div className="proj-page">
			<ProjectDetail
				project={project}
				submission={submission ?? null}
				existingReflection={reflection ?? null}
				theoryMd={project.theoryMd ?? null}
				learningResources={project.learningResources}
				sourceLinks={project.sourceLinks}
				// C11/1.14 — flaga czytana server-side (rejestr flag nie trafia do klienta).
				tutorEnabled={isFeatureEnabled("socraticTutor")}
				// B7/1.16b — jak wyżej: obrona ustna za flagą vivaDefense.
				vivaEnabled={isFeatureEnabled("vivaDefense")}
			/>
		</div>
	);
}
