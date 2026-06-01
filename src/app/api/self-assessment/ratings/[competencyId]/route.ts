/**
 * PATCH /api/self-assessment/ratings/[competencyId] — autosave pojedynczej oceny (B4).
 *
 * Zapisuje poziom samooceny (1–4) dla jednej kompetencji. Aktualizuje też `status`
 * kompetencji zgodnie z ratyfikowanym mapowaniem poziom→status (Darek 2026-06-01):
 *   1 → 'missing', 2 → 'in_progress', 3 → 'acquired', 4 → 'acquired'
 *
 * Endpoint wołany przez frontend w trybie autosave z debounce 400 ms (spec §3.5).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §3.5
 * Kontrakt schematu: docs/briefings/2026-05-31-ethan-schema-b3b4b5.md §B4.1
 * Mapowanie statusu: decyzja Darka 2026-06-01 (zamknięte, nie podważaj)
 */
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, students } from "@/lib/db/schema";

// Typ wartości kolumny status kompetencji (z Drizzle pgEnum)
type CompetencyStatus = "acquired" | "in_progress" | "missing";

import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

// Walidacja wejścia (Zod): level musi być 1–4 (int) — domena 2 standardu, Leo karta roli
const PatchSchema = z.object({
	level: z.number().int().min(1).max(4),
});

// Mapowanie poziom samooceny → status kompetencji w bazie.
// Decyzja Darka 2026-06-01 (ratyfikowane, zamknięte — PRD §4.3 KA2).
// Koniec hardcoded 'acquired' — status odzwierciedla deklarację studenta.
function levelToStatus(level: number): CompetencyStatus {
	if (level === 1) return "missing";
	if (level === 2) return "in_progress";
	// level 3 i 4: student 'zna' lub 'dobrze zna' → acquired
	return "acquired";
}

type RouteContext = { params: Promise<{ competencyId: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
	const { competencyId } = await ctx.params;

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = session.user.id;

	// Parsowanie i walidacja body
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = PatchSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { level } = parsed.data;

	// Pre-fetch metadanych studenta (poza tenant-ctx, owner-side)
	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const newStatus = levelToStatus(level);

	try {
		await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			async (tx) => {
				// WHERE studentId + competencyId — warstwa 1 izolacji (ADR-003 §4.2)
				// RLS (warstwa 2) pilnuje: student widzi wyłącznie swoje wiersze
				const result = await tx
					.update(competencies)
					.set({
						selfAssessment: level,
						verifiedByMethod: "self",
						status: newStatus,
					})
					.where(and(eq(competencies.id, competencyId), eq(competencies.studentId, studentMeta.id)))
					.returning({ id: competencies.id });

				if (result.length === 0) {
					// Kompetencja nie istnieje lub należy do innego studenta (RLS + WHERE)
					throw new Error("COMPETENCY_NOT_FOUND");
				}
			},
		);
	} catch (err) {
		if (err instanceof Error && err.message === "COMPETENCY_NOT_FOUND") {
			return NextResponse.json({ error: "Competency not found" }, { status: 404 });
		}
		logError("self-assessment.patch", err, { userId, competencyId });
		return NextResponse.json({ error: "Save failed" }, { status: 500 });
	}

	return NextResponse.json({
		competencyId,
		level,
		verifiedByMethod: "self",
		savedAt: new Date().toISOString(),
	});
}
