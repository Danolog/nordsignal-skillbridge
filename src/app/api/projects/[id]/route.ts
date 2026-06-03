import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectLearningResources, projects } from "@/lib/db/schema";

// B3 — kontrakt API detalu projektu dla Jacka (frontend).
// Odpowiedź zawiera:
//   theoryMd: string | null — treść teorii w markdown; null = brak teorii (stan S4 empty_theory).
//   learningResources: Array<{ title: string; url: string; type: string }> — materiały do nauki,
//     posortowane rosnąco po `position`. type IN ('video','docs','course').
// Tabela project_learning_resources jest K-PUB (jak project_competencies) — brak RLS,
// zapytanie może iść przez db (owner) bez withTenantContext.
//
// Obs2 (przegląd Ryana, CRCO): trasa jest pod dashboardem, ale middleware NIE
// uwierzytelnia tras /api/* (egzekucja sesji per-handler — patrz src/middleware.ts).
// Dane są K-PUB (katalog, nie wrażliwe), ale rls-matrix §3 mówi „SELECT: wszyscy
// UWIERZYTELNIENI" dla K-PUB — więc trasa wymaga zalogowania, spójnie z innymi
// trasami dashboardu (wzorzec: /api/projects/[id]/brief, /submit). Trasa publiczna
// (anonimowa) jest tu intencją tylko dla /api/passport/[id] (gated share_token).

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

	// B3: `...project` już niesie `theoryMd` (kolumna nullable bez defaultu →
	// drizzle zwraca null, gdy projekt nie ma teorii). Front: theoryMd === null →
	// render stanu S4 empty_theory (spec §2.4). Osobne `theoryMd: ... ?? null` było
	// redundantne (U2, przegląd Ethana) — usunięte, kontrakt bez zmian.
	return NextResponse.json({
		project,
		learningResources,
	});
}
