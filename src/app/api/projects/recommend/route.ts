import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { matchProjects } from "@/lib/ai/match-projects";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

const RecommendQuerySchema = z.object({
	gapId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const parsed = RecommendQuerySchema.safeParse({
		gapId: req.nextUrl.searchParams.get("gapId"),
	});
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid query", issues: parsed.error.flatten() },
			{
				status: 400,
			},
		);
	}
	const { gapId } = parsed.data;

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	// 0.15/B5: matchProjects rzuca "Gap not found"/"Student not found" (guard IDOR z 0.4)
	// — leciało jako gołe 500 bez logError. Mapujemy na 404 (spójnie z gaps/[id]/why),
	// resztę (timeout LLM, DB) logujemy i zwracamy 502.
	try {
		const recommendations = await matchProjects(student.id, gapId, 5);
		return NextResponse.json({ recommendations });
	} catch (err) {
		if (
			err instanceof Error &&
			(err.message === "Gap not found" || err.message === "Student not found")
		) {
			return NextResponse.json({ error: err.message }, { status: 404 });
		}
		logError("projects.recommend", err, { studentId: student.id, gapId });
		return NextResponse.json(
			{ error: "Nie udało się dopasować projektów. Spróbuj ponownie." },
			{ status: 502 },
		);
	}
}
