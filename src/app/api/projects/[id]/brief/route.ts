import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateProjectBrief } from "@/lib/ai/generate-brief";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, students } from "@/lib/db/schema";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const { id: projectId } = await params;

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	const existing = await db.query.projectSubmissions.findFirst({
		where: and(
			eq(projectSubmissions.studentId, student.id),
			eq(projectSubmissions.projectId, projectId),
		),
	});

	if (existing?.aiReviewJson && (existing.aiReviewJson as Record<string, unknown>).brief) {
		return NextResponse.json({
			brief: (existing.aiReviewJson as Record<string, unknown>).brief,
		});
	}

	const brief = await generateProjectBrief(projectId, student.id);

	if (existing) {
		await db
			.update(projectSubmissions)
			.set({
				aiReviewJson: { ...(existing.aiReviewJson as object), brief },
				updatedAt: new Date(),
			})
			.where(eq(projectSubmissions.id, existing.id));
	} else {
		await db.insert(projectSubmissions).values({
			studentId: student.id,
			tenantId: student.tenantId,
			projectId,
			aiReviewJson: { brief },
		});
	}

	return NextResponse.json({ brief });
}
