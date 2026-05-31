import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_RESTARTS } from "@/lib/ai/career-helper";
import { resolveStudent } from "@/lib/career-helper/session";
import { careerHelperSessions } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 30;

const ParamsSchema = z.object({ id: z.string().uuid() });

/**
 * POST /api/career-helper/session/[id]/restart — nowa sesja z zachowanymi answers.
 * Cap aplikacyjny: max 2 restarty (golden-adr §4.1). Stara sesja → status restarted.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	const studentAuth = await resolveStudent();
	if (!studentAuth.ok) {
		return NextResponse.json(
			{ error: studentAuth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: studentAuth.status },
		);
	}

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${studentAuth.userId}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

	const { userId, studentId, tenantId } = studentAuth;

	try {
		const out = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			const [old] = await tx
				.select({
					id: careerHelperSessions.id,
					answers: careerHelperSessions.answers,
					restartCount: careerHelperSessions.restartCount,
				})
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.id, params.data.id),
						eq(careerHelperSessions.studentId, studentId),
					),
				);
			if (!old) return { notFound: true as const };
			if (old.restartCount >= MAX_RESTARTS) return { capped: true as const };

			await tx
				.update(careerHelperSessions)
				.set({ status: "restarted", updatedAt: new Date() })
				.where(
					and(eq(careerHelperSessions.id, old.id), eq(careerHelperSessions.studentId, studentId)),
				);

			const [created] = await tx
				.insert(careerHelperSessions)
				.values({
					studentId,
					tenantId,
					status: "in_progress",
					turn: 0,
					answers: old.answers,
					restartCount: old.restartCount + 1,
				})
				.returning({ id: careerHelperSessions.id });
			return { sessionId: created?.id };
		});

		if ("notFound" in out)
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		if ("capped" in out) {
			return NextResponse.json(
				{ error: "Osiągnięto limit restartów dla tej rozmowy." },
				{ status: 409 },
			);
		}
		if (!out.sessionId) {
			return NextResponse.json({ error: "Nie udało się zrestartować." }, { status: 500 });
		}
		return NextResponse.json({
			sessionId: out.sessionId,
			redirectTo: `/onboarding/step-3?sessionId=${out.sessionId}`,
		});
	} catch (err) {
		logError("career-helper.restart", err, { studentId });
		return NextResponse.json(
			{ error: "Nie udało się zacząć od nowa. Spróbuj ponownie." },
			{ status: 500 },
		);
	}
}
