import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateProjectBrief } from "@/lib/ai/generate-brief";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
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

	// AI POZA tx — nie trzymamy połączenia przez LLM.
	const brief = await generateProjectBrief(projectId, studentMeta.id);

	// Persistence przez RLS + jawne WHERE (warstwa 1 ADR-003).
	await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		async (tx) => {
			if (existing) {
				await tx
					.update(projectSubmissions)
					.set({
						aiReviewJson: { ...(existing.aiReviewJson as object), brief },
						updatedAt: new Date(),
					})
					.where(eq(projectSubmissions.id, existing.id));
			} else {
				await tx.insert(projectSubmissions).values({
					studentId: studentMeta.id,
					tenantId: studentMeta.tenantId,
					projectId,
					aiReviewJson: { brief },
				});
			}
		},
	);

	return NextResponse.json({ brief });
}
