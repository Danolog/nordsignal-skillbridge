import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateWhyImportant } from "@/lib/ai/generate-why";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gaps, students } from "@/lib/db/schema";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const { id: gapId } = await params;

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	const gap = await db.query.gaps.findFirst({
		where: eq(gaps.id, gapId),
	});
	if (!gap || gap.studentId !== student.id) {
		return NextResponse.json({ error: "Gap not found" }, { status: 404 });
	}

	// Return cached value if already generated
	if (gap.whyImportant) {
		return NextResponse.json({ whyImportant: gap.whyImportant });
	}

	// Generate and save
	const whyImportant = await generateWhyImportant(
		gap.competencyName,
		student.careerGoal,
		gap.marketPercentage,
	);

	// Defense-in-depth: zawęź zapis do gapa NALEŻĄCEGO do tego studenta
	// (ścieżka idzie owner-db, RLS jej nie chroni — WHERE jest jedyną warstwą).
	await db
		.update(gaps)
		.set({ whyImportant })
		.where(and(eq(gaps.id, gapId), eq(gaps.studentId, student.id)));

	return NextResponse.json({ whyImportant });
}
