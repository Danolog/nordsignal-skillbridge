import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateProjectBrief } from "@/lib/ai/generate-brief";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * §8 #1 Phase 2 / issue #19e (refactor sub-issue): odczyt/zapis projectSubmissions
 * przez withTenantContext({role: "student"}). generateProjectBrief (AI call +
 * jego własne DB calls) POZA tx — refactor warstwy lib/ai osobno.
 *
 * Pre-fetch studentMeta owner-side. Cache check + upsert submission wewnątrz tx.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const { id: projectId } = await params;
	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	// Cache check przez RLS — student_sees_own ON project_submissions.
	const existing = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		(tx) =>
			tx.query.projectSubmissions.findFirst({
				where: and(
					eq(projectSubmissions.studentId, studentMeta.id),
					eq(projectSubmissions.projectId, projectId),
				),
			}),
	);

	if (existing?.aiReviewJson && (existing.aiReviewJson as Record<string, unknown>).brief) {
		return NextResponse.json({
			brief: (existing.aiReviewJson as Record<string, unknown>).brief,
		});
	}

	// §8 #1 (obserwowalność błędu #4): generateProjectBrief może rzucić (np.
	// "AI zwróciło nieprawidłowy JSON", generate-brief.ts:111). Bez try/catch błąd
	// leciał niezłapany → puste 500, zero logu. Łapiemy, logujemy z kontekstem przez
	// PII-bezpieczny logError (lib/log.ts — loguje tylko message+name, nie raw error
	// z promptem) i zwracamy OPISOWY 5xx. Surowy błąd modelu/stack NIE wychodzi do
	// klienta. Odporniejszy parser (generate-brief.ts) to osobny strumień (#4 cz. 2).
	try {
		// AI POZA tx — nie trzymamy połączenia przez LLM.
		const brief = await generateProjectBrief(projectId, studentMeta.id);

		// Upsert atomowy przez UNIQUE(student_id, project_id) (0.2b, drizzle/0021) —
		// zamyka wyścig między cache-check `existing` powyżej a zapisem (dwa równoległe
		// briefy, albo brief wyścigujący się z submit/route.ts, mogły oba trafić na
		// "nie istnieje" i wstawić osobny wiersz / nadpisać się nawzajem find-then-write).
		// coalesce(...,'{}') — audyt Fable 5: aiReviewJson jest nullable (np. seed-e2e
		// wstawia zgłoszenia bez niego), NULL || cokolwiek w Postgresie daje NULL.
		await withTenantContext({ userId, tenantId: studentMeta.tenantId, role: "student" }, (tx) =>
			tx
				.insert(projectSubmissions)
				.values({
					studentId: studentMeta.id,
					tenantId: studentMeta.tenantId,
					projectId,
					aiReviewJson: { brief },
				})
				.onConflictDoUpdate({
					target: [projectSubmissions.studentId, projectSubmissions.projectId],
					set: {
						aiReviewJson: sql`coalesce(${projectSubmissions.aiReviewJson}, '{}'::jsonb) || ${JSON.stringify({ brief })}::jsonb`,
						updatedAt: new Date(),
					},
				}),
		);

		return NextResponse.json({ brief });
	} catch (err) {
		logError("brief.generate", err, { projectId, studentId: studentMeta.id });
		return NextResponse.json(
			{ error: "Nie udało się wygenerować briefu projektu. Spróbuj ponownie za chwilę." },
			{ status: 502 },
		);
	}
}
