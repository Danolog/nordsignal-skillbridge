import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectLearningResources, projects } from "@/lib/db/schema";

// B3 — kontrakt API detalu projektu dla Jacka (frontend).
// Odpowiedź zawiera:
//   theoryMd: string | null — treść teorii w markdown; null = brak teorii (stan S4 empty_theory).
//   learningResources: Array<{ title: string; url: string; type: string }> — materiały do nauki,
//     posortowane rosnąco po `position`. type IN ('video','docs','course').
// Tabela project_learning_resources jest K-PUB (jak project_competencies) — brak RLS,
// zapytanie może iść przez db (owner) bez withTenantContext.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Odczyt projektu wraz z kompetencjami (istniejący kontrakt).
	const project = await db.query.projects.findFirst({
		where: eq(projects.id, id),
		with: { competencies: true },
	});
	if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

	// B3 — odczyt materiałów edukacyjnych posortowanych po position.
	// Jawny .select — tylko pola potrzebne frontowi (tytuł, URL, typ).
	const learningResources = await db
		.select({
			title: projectLearningResources.title,
			url: projectLearningResources.url,
			type: projectLearningResources.type,
		})
		.from(projectLearningResources)
		.where(eq(projectLearningResources.projectId, id))
		.orderBy(asc(projectLearningResources.position));

	return NextResponse.json({
		project: {
			...project,
			// B3: theoryMd jest null gdy projekt nie ma teorii (kolumna nullable bez defaultu).
			// Front: theoryMd === null → render stanu S4 empty_theory (spec §2.4).
			theoryMd: project.theoryMd ?? null,
		},
		learningResources,
	});
}
