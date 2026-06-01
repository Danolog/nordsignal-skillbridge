/**
 * POST /api/onboarding/advance — domknięcie kroku onboardingu B4 (przejście krok 4 → 5).
 *
 * Waliduje, że student ocenił ≥ requiredCount kompetencji (min(5, N)),
 * a następnie potwierdza przejście. Nie przesyła ponownie ocen — są już
 * zapisane przez PATCH autosave. Ten endpoint tylko domyka krok.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §3.5 (advance)
 * PRD: docs/product/skillbridge-prd-panel-studenta-v0.1.md §4.3 US-B4.2 KA1
 * Logika: src/lib/self-assessment/index.ts
 */
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { evaluateAdvance } from "@/lib/self-assessment";

const AdvanceSchema = z.object({
	fromStep: z.literal(4),
	toStep: z.literal(5),
});

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = session.user.id;

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = AdvanceSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	try {
		// Sprawdzamy próg przez RLS (mechanizm izolacji danych — student widzi tylko swoje kompetencje)
		const { total, ratedCount } = await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			async (tx) => {
				const allRows = await tx
					.select({ id: competencies.id, selfAssessment: competencies.selfAssessment })
					.from(competencies)
					.where(eq(competencies.studentId, studentMeta.id));

				return {
					total: allRows.length,
					ratedCount: allRows.filter((c) => c.selfAssessment !== null).length,
				};
			},
		);

		// evaluateAdvance: bramka progu min(5, N) — logika w src/lib/self-assessment
		const check = evaluateAdvance(ratedCount, total);
		if (!check.ok) {
			return NextResponse.json(check.body, { status: 422 });
		}
	} catch (err) {
		logError("onboarding.advance", err, { userId, fromStep: 4 });
		return NextResponse.json({ error: "Advance failed" }, { status: 500 });
	}

	return NextResponse.json({
		success: true,
		fromStep: 4,
		toStep: 5,
		nextUrl: "/onboarding/step-5",
	});
}
