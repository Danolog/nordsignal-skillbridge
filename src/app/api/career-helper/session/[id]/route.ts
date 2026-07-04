import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStudent } from "@/lib/career-helper/session";
import { careerHelperSessions, careerHelperTurns } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

export const maxDuration = 30;

const ParamsSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/career-helper/session/[id] — stan sesji (rehydracja chatu).
 * Zwraca messages + turn + status (maszyna stanów chatu, spec §4.5).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	const studentAuth = await resolveStudent();
	if (!studentAuth.ok) {
		return NextResponse.json(
			{ error: studentAuth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: studentAuth.status },
		);
	}

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) {
		return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
	}

	try {
		const { userId, studentId, tenantId } = studentAuth;
		const result = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// RLS + jawny WHERE student_id (warstwa 1) — student widzi tylko swoje.
			const [sessionRow] = await tx
				.select({
					id: careerHelperSessions.id,
					status: careerHelperSessions.status,
					turn: careerHelperSessions.turn,
				})
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.id, params.data.id),
						eq(careerHelperSessions.studentId, studentId),
					),
				);
			if (!sessionRow) return null;

			const turns = await tx
				.select({
					role: careerHelperTurns.role,
					content: careerHelperTurns.content,
				})
				.from(careerHelperTurns)
				.where(
					and(
						eq(careerHelperTurns.sessionId, sessionRow.id),
						eq(careerHelperTurns.studentId, studentId),
					),
				)
				// 0.15/C4: para user+ai jednej tury wstawiana jednym INSERT-em → identyczny
				// createdAt (defaultNow) — bez tiebreakera kolejność w parze była
				// niedeterministyczna (odpowiedź AI mogła stanąć przed pytaniem studenta).
				// Jawny CASE (nie kolejność enuma — krucha przy reorderze definicji).
				.orderBy(
					asc(careerHelperTurns.turnIndex),
					asc(sql`CASE ${careerHelperTurns.role} WHEN 'user' THEN 0 ELSE 1 END`),
					asc(careerHelperTurns.createdAt),
				);

			return { sessionRow, turns };
		});

		if (!result) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}
		return NextResponse.json({
			messages: result.turns,
			turn: result.sessionRow.turn,
			status: result.sessionRow.status,
		});
	} catch (err) {
		logError("career-helper.session.get", err, { studentId: studentAuth.studentId });
		return NextResponse.json({ error: "Nie udało się wczytać sesji." }, { status: 500 });
	}
}
