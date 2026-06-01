/**
 * GET /api/self-assessment — wczytanie ekranu samooceny B4.
 *
 * Zwraca listę kompetencji studenta z ich bieżącą samooceną (level 1–4 lub null)
 * oraz requiredCount = min(5, N) — próg bramujący krok 4 onboardingu.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §3.5
 * Kontrakt schematu: docs/briefings/2026-05-31-ethan-schema-b3b4b5.md §B4.1
 * Logika: src/lib/self-assessment/index.ts
 */
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { buildAssessmentResponse } from "@/lib/self-assessment";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = session.user.id;

	// Pre-fetch metadanych studenta poza withTenantContext (własny wiersz przez owner)
	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	let rows: Array<{
		id: string;
		name: string;
		selfAssessment: number | null;
	}>;

	try {
		rows = await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			(tx) =>
				tx
					.select({
						id: competencies.id,
						name: competencies.name,
						selfAssessment: competencies.selfAssessment,
					})
					.from(competencies)
					.where(eq(competencies.studentId, studentMeta.id)),
		);
	} catch (err) {
		logError("self-assessment.get", err, { userId });
		return NextResponse.json({ error: "Failed to load competencies" }, { status: 500 });
	}

	// buildAssessmentResponse: requiredCount = min(5, N) + kształt odpowiedzi
	// Logika w produkcji (src/lib/self-assessment) — nie w route'cie ani w testach.
	return NextResponse.json(buildAssessmentResponse(studentMeta.id, rows));
}
