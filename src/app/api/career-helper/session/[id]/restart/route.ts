import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_RESTARTS, MAX_SESSIONS_PER_DAY } from "@/lib/ai/career-helper";
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
					status: careerHelperSessions.status,
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
			// A1 (obejście 0.11): restart tylko z sesji AKTYWNEJ. Bez tego wielokrotny
			// POST /restart na pierwotnym id (status już "restarted", restartCount=0)
			// tworzył za każdym razem świeżą sesję — nieograniczenie, z pominięciem
			// MAX_RESTARTS (licznik rośnie tylko w NOWYM wierszu) i capu dziennego.
			if (old.status !== "in_progress") return { stale: true as const };
			if (old.restartCount >= MAX_RESTARTS) return { capped: true as const };

			// A1: parytet z survey (0.11) — restart też tworzy sesję, więc podlega temu
			// samemu oknu 24h. Survey liczy wszystkie sesje (także z restartów), ale sam
			// restart tego nie sprawdzał — tędy dało się przekroczyć wolumen dzienny.
			const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const [recent] = await tx
				.select({ c: count() })
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.studentId, studentId),
						gte(careerHelperSessions.createdAt, cutoff),
					),
				);
			if ((recent?.c ?? 0) >= MAX_SESSIONS_PER_DAY) return { capped24h: true as const };

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
		if ("stale" in out) {
			return NextResponse.json(
				{ error: "Ta rozmowa została już zastąpiona nowszą sesją." },
				{ status: 409 },
			);
		}
		if ("capped" in out) {
			return NextResponse.json(
				{ error: "Osiągnięto limit restartów dla tej rozmowy." },
				{ status: 409 },
			);
		}
		if ("capped24h" in out) {
			// 0.15/C3: Retry-After jak w survey (klient z retry-logiką nie ponawia agresywnie).
			return NextResponse.json(
				{
					error: `Limit sesji Pomocnika (${MAX_SESSIONS_PER_DAY}/dobę) osiągnięty. Spróbuj ponownie później.`,
				},
				{ status: 429, headers: { "retry-after": "3600" } },
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
