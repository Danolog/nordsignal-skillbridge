import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSummary } from "@/lib/ai/career-helper";
import { resolveStudent } from "@/lib/career-helper/session";
import {
	careerHelperSessions,
	careerHelperTurns,
	studentCareerPaths,
	students,
} from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

const ParamsSchema = z.object({ id: z.string().uuid() });

/**
 * POST /api/career-helper/session/[id]/summary — podsumowanie (BLOKUJĄCO, Opus + sędzia).
 *
 * Blokujący CELOWO = egzekucja HITL: sędzia ocenia CAŁOŚĆ przed zwrotem.
 * judged=false (sędzia odmówił 2×) → judgedFor=warstwa4_failed = fallback do
 * wykładowcy (stan kontraktu, nie błąd). Odpowiedź NIE zawiera probability/%.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	const studentAuth = await resolveStudent();
	if (!studentAuth.ok) {
		return NextResponse.json(
			{ error: studentAuth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: studentAuth.status },
		);
	}

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${studentAuth.userId}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

	const { userId, studentId, tenantId } = studentAuth;

	// (1) Odczyt sesji + historii w withTenantContext, PRZED wywołaniem modelu.
	let data: { answers: unknown; history: { role: "ai" | "user"; content: string }[] } | null;
	try {
		data = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			const [sessionRow] = await tx
				.select({ id: careerHelperSessions.id, answers: careerHelperSessions.answers })
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.id, params.data.id),
						eq(careerHelperSessions.studentId, studentId),
					),
				);
			if (!sessionRow) return null;
			const history = await tx
				.select({ role: careerHelperTurns.role, content: careerHelperTurns.content })
				.from(careerHelperTurns)
				.where(
					and(
						eq(careerHelperTurns.sessionId, sessionRow.id),
						eq(careerHelperTurns.studentId, studentId),
					),
				)
				.orderBy(asc(careerHelperTurns.turnIndex), asc(careerHelperTurns.createdAt));
			return {
				answers: sessionRow.answers,
				history: history as { role: "ai" | "user"; content: string }[],
			};
		});
	} catch (err) {
		logError("career-helper.summary.read", err, { studentId });
		return NextResponse.json({ error: "Nie udało się wczytać sesji." }, { status: 500 });
	}

	if (!data) return NextResponse.json({ error: "Session not found" }, { status: 404 });

	// (2) Model + sędzia POZA transakcją (nie trzymamy połączenia na czas LLM).
	let summary: Awaited<ReturnType<typeof generateSummary>>;
	try {
		summary = await generateSummary({ answers: data.answers, history: data.history });
	} catch (err) {
		logError("career-helper.summary.generate", err, { studentId });
		return NextResponse.json(
			{ error: "Nie udało się wygenerować podsumowania. Spróbuj ponownie." },
			{ status: 500 },
		);
	}

	// (3) Zapis wyniku w OSOBNYM withTenantContext. Ścieżki zapisujemy zawsze
	//     (probability=null — wewnętrznie); completed_at tylko gdy judged.
	try {
		await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			if (summary.careerPaths.length > 0) {
				// Nowe podsumowanie nadpisuje primary: zdejmij flagę z poprzednich.
				await tx
					.update(studentCareerPaths)
					.set({ isPrimary: false })
					.where(eq(studentCareerPaths.studentId, studentId));
				await tx.insert(studentCareerPaths).values(
					summary.careerPaths.map((p, i) => ({
						studentId,
						tenantId,
						sessionId: params.data.id,
						label: p.label,
						why: p.why,
						source: "helper",
						isPrimary: i === 0,
					})),
				);
			}
			if (summary.judged) {
				await tx
					.update(careerHelperSessions)
					.set({ status: "completed", updatedAt: new Date() })
					.where(
						and(
							eq(careerHelperSessions.id, params.data.id),
							eq(careerHelperSessions.studentId, studentId),
						),
					);
				await tx
					.update(students)
					.set({ careerHelperCompletedAt: new Date(), updatedAt: new Date() })
					.where(eq(students.id, studentId));
			}
		});
	} catch (err) {
		logError("career-helper.summary.persist", err, { studentId });
		// Nie wywracamy odpowiedzi — podsumowanie powstało; zwracamy je studentowi.
	}

	return NextResponse.json(summary);
}
