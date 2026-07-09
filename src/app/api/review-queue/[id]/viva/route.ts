import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { projectSubmissions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { checkReviewerAuth } from "@/lib/reviewer-auth";
import { loadAnswers, loadLatestSession } from "@/lib/viva/session-store";
import type { VivaQuestion, VivaVerdict } from "@/lib/viva/types";

/**
 * B7/1.16a (ADR-013 D4) — surowe odpowiedzi obrony dla recenzenta kolejki B8.
 *
 * viva_answers to klasa DENY (zero grantów app_*) — jedyna droga odczytu poza
 * serwerem to TA trasa: owner-side, operator cross-tenant / wykładowca z jawnym
 * WHERE tenant (cudzy tenant → 404, nie potwierdzamy istnienia — wzorzec 1.4),
 * KAŻDY odczyt zostawia wpis audytu (kto czytał czyją obronę). Decyzja Darka
 * (sign-off ADR-013 pkt 4): operator + wykładowca własnego tenanta.
 *
 * Dwie flagi: humanReviewQueue (rodzina B8) ORAZ vivaDefense (rodzina B7) —
 * trasa istnieje tylko, gdy obie żyją.
 */

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("humanReviewQueue") || !isFeatureEnabled("vivaDefense")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const reviewer = await checkReviewerAuth();
	if (!reviewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) {
		return NextResponse.json({ error: "Nieprawidłowe id zgłoszenia" }, { status: 400 });
	}
	const submissionId = params.data.id;

	try {
		const [submission] = await db
			.select({ id: projectSubmissions.id, tenantId: projectSubmissions.tenantId })
			.from(projectSubmissions)
			.where(eq(projectSubmissions.id, submissionId));
		if (!submission || (reviewer.kind === "faculty" && submission.tenantId !== reviewer.tenantId)) {
			return NextResponse.json({ error: "Zgłoszenie nie istnieje" }, { status: 404 });
		}

		const session = await loadLatestSession(submissionId);
		if (!session) {
			return NextResponse.json({ error: "Brak sesji obrony" }, { status: 404 });
		}
		const answers = await loadAnswers(session.id);

		// Audyt KAŻDEGO odczytu — surowe odpowiedzi to prywatna treść studenta.
		await recordAudit({
			actorType: reviewer.kind === "quality_operator" ? "operator" : "faculty",
			actorId: reviewer.sessionId,
			action: "submission.viva.answers_read",
			targetType: "submission",
			targetId: submissionId,
			metadata: { sessionId: session.id, reviewerType: reviewer.kind },
		});

		const questions = session.questionsJson as VivaQuestion[];
		return NextResponse.json({
			session: {
				id: session.id,
				status: session.status,
				startedAt: session.startedAt,
				completedAt: session.completedAt,
				result: session.resultJson,
			},
			exchange: questions.map((q) => {
				const a = answers.find((row) => row.position === q.position);
				return {
					position: q.position,
					question: q.question,
					filePath: q.filePath ?? null,
					excerpt: q.excerpt ?? null,
					answer: a?.content ?? null,
					verdict: (a?.verdictJson as VivaVerdict | null) ?? null,
				};
			}),
		});
	} catch (err) {
		logError("review-queue.viva.get", err, { submissionId, reviewer: reviewer.kind });
		return NextResponse.json({ error: "Nie udało się pobrać obrony." }, { status: 500 });
	}
}
