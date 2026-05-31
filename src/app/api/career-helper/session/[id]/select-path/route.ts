import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStudent } from "@/lib/career-helper/session";
import { careerHelperSessions, studentCareerPaths, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 30;

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({
	careerLabel: z.string().min(1).max(120),
	source: z.literal("helper").default("helper"),
});

/**
 * POST /api/career-helper/session/[id]/select-path — zapis wybranej ścieżki +
 * NADPISANIE students.career_goal (rozstrzygnięcie Sophii: jeden aktualny cel).
 * Wszystko w JEDNEJ transakcji withTenantContext.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = BodySchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { careerLabel } = parsed.data;
	const { userId, studentId, tenantId } = studentAuth;

	try {
		const out = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// Sesja musi należeć do studenta (RLS + jawny WHERE).
			const [sessionRow] = await tx
				.select({ id: careerHelperSessions.id })
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.id, params.data.id),
						eq(careerHelperSessions.studentId, studentId),
					),
				);
			if (!sessionRow) return { notFound: true as const };

			// Zdejmij primary z poprzednich, dodaj wybraną jako primary.
			await tx
				.update(studentCareerPaths)
				.set({ isPrimary: false })
				.where(eq(studentCareerPaths.studentId, studentId));

			const [created] = await tx
				.insert(studentCareerPaths)
				.values({
					studentId,
					tenantId,
					sessionId: sessionRow.id,
					label: careerLabel,
					source: "helper",
					isPrimary: true,
				})
				.returning({ id: studentCareerPaths.id });

			// Nadpisanie celu kariery (career_goal jest NOT NULL — zawsze ustawiony).
			await tx
				.update(students)
				.set({ careerGoal: careerLabel, updatedAt: new Date() })
				.where(eq(students.id, studentId));

			return { studentCareerPathId: created?.id };
		});

		if ("notFound" in out)
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		if (!out.studentCareerPathId) {
			return NextResponse.json({ error: "Nie udało się zapisać ścieżki." }, { status: 500 });
		}
		return NextResponse.json({ studentCareerPathId: out.studentCareerPathId, isPrimary: true });
	} catch (err) {
		logError("career-helper.select-path", err, { studentId });
		return NextResponse.json(
			{ error: "Nie udało się zapisać wybranej ścieżki. Spróbuj ponownie." },
			{ status: 500 },
		);
	}
}
