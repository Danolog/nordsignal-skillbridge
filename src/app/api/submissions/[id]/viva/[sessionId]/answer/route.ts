import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectCrisis } from "@/lib/ai/career-helper";
import { auditContextFromRequest, recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { vivaAnswers, vivaSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { resolveStudentAuth } from "@/lib/viva/http";
import { judgeVivaAnswer } from "@/lib/viva/judge-answer";
import { isVivaSessionExpired, resolveVivaOutcome } from "@/lib/viva/service";
import {
	closeSessionInconclusive,
	closeSessionWithOutcome,
	loadAnswers,
	resolveExpiredSession,
} from "@/lib/viva/session-store";
import {
	VIVA_ANSWER_MAX_LEN,
	VIVA_QUESTION_COUNT,
	type VivaQuestion,
	type VivaVerdict,
} from "@/lib/viva/types";

// Sędzia (Sonnet) na każdej odpowiedzi; ostatnia domyka sesję.
export const maxDuration = 60;

/**
 * B7/1.16a (ADR-013 D2) — odpowiedź na pytanie obrony. Kolejność egzekwowana
 * server-side (position = liczba zapisanych odpowiedzi), zero feedbacku
 * w trakcie (werdykty wychodzą dopiero w resultJson po zamknięciu). Sędzia
 * LLM ZAWSZE poza tx; jego awaria/niejednoznaczność = sesja inconclusive →
 * człowiek (fail-closed: nie oblewa i nie zdaje).
 */

const ParamsSchema = z.object({ id: z.string().uuid(), sessionId: z.string().uuid() });
const BodySchema = z.object({ answer: z.string().max(VIVA_ANSWER_MAX_LEN) });

export async function POST(
	req: Request,
	ctx: { params: Promise<{ id: string; sessionId: string }> },
) {
	if (!isFeatureEnabled("vivaDefense")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const auth_ = await resolveStudentAuth();
	if (!auth_.ok) {
		return NextResponse.json(
			{ error: auth_.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth_.status },
		);
	}
	// Burst (aiLight/min) + wolumen dzienny odpowiedzi (vivaDaily) — budżet 0.0.
	const rlBurst = await applyRateLimit(rateLimiters.aiLight, `user:${auth_.userId}`);
	if (!rlBurst.success) return rateLimitResponse(rlBurst.reset);
	const rlDaily = await applyRateLimit(rateLimiters.vivaDaily, `user:${auth_.userId}`);
	if (!rlDaily.success) return rateLimitResponse(rlDaily.reset);

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = BodySchema.safeParse(raw);
	if (!parsed.success || parsed.data.answer.trim().length === 0) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}
	const answer = parsed.data.answer.trim();

	// Filtr kryzysowy PRZED zapisem (ADR-013 D2.2): odpowiedź NIEZAPISANA
	// i niepunktowana, sesja bez zmian — student może wrócić.
	if (detectCrisis(answer)) {
		return NextResponse.json({ crisis: true }, { status: 200 });
	}

	try {
		// Własność w zapytaniu: sesja MUSI należeć do studenta i zgłoszenia z URL.
		const [session] = await db
			.select()
			.from(vivaSessions)
			.where(
				and(
					eq(vivaSessions.id, params.data.sessionId),
					eq(vivaSessions.submissionId, params.data.id),
					eq(vivaSessions.studentId, auth_.studentId),
				),
			);
		if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

		if (session.status !== "in_progress") {
			return NextResponse.json(
				{ error: `Sesja w stanie '${session.status}' — odpowiedź niemożliwa.` },
				{ status: 409 },
			);
		}

		// Leniwe wygaśnięcie (D2.4).
		if (isVivaSessionExpired(session.startedAt)) {
			const resolved = await resolveExpiredSession(session);
			await recordAudit({
				actorType: "system",
				actorId: auth_.studentId,
				action: `submission.viva.${resolved}`,
				targetType: "submission",
				targetId: session.submissionId,
				...auditContextFromRequest(req),
				metadata: { sessionId: session.id },
			});
			return NextResponse.json(
				{
					error:
						resolved === "expired"
							? "Czas sesji minął — możesz rozpocząć obronę ponownie."
							: "Czas sesji minął w trakcie odpowiadania — rozstrzygnie człowiek.",
					state: resolved,
					restartable: resolved === "expired",
				},
				{ status: 409 },
			);
		}

		const previousAnswers = await loadAnswers(session.id);
		const position = previousAnswers.length;
		if (position >= VIVA_QUESTION_COUNT) {
			return NextResponse.json({ error: "Wszystkie odpowiedzi już zapisane." }, { status: 409 });
		}
		const questions = session.questionsJson as VivaQuestion[];
		const question = questions[position];

		// Sędzia POZA tx. Awaria/niejednoznaczność → inconclusive (fail-closed).
		let verdict: VivaVerdict;
		try {
			verdict = await judgeVivaAnswer({
				question,
				answer,
				attribution: { studentId: auth_.studentId, tenantId: auth_.tenantId },
			});
		} catch (err) {
			logError("viva.judge.failed", err, { sessionId: session.id, position });
			await closeSessionInconclusive({ session, lastAnswer: { position, content: answer } });
			await recordAudit({
				actorType: "system",
				actorId: auth_.studentId,
				action: "submission.viva.inconclusive",
				targetType: "submission",
				targetId: session.submissionId,
				...auditContextFromRequest(req),
				metadata: { sessionId: session.id, reason: "judge_failed", position },
			});
			return NextResponse.json({ state: "inconclusive", position });
		}

		const isLast = position === VIVA_QUESTION_COUNT - 1;
		if (!isLast) {
			await db.insert(vivaAnswers).values({
				sessionId: session.id,
				studentId: session.studentId,
				tenantId: session.tenantId,
				position,
				content: answer,
				verdictJson: verdict,
			});
			const next = questions[position + 1];
			return NextResponse.json({
				state: "in_progress",
				position: position + 1,
				question: { position: next.position, question: next.question, filePath: next.filePath },
			});
		}

		// Ostatnia odpowiedź: komplet werdyktów → rozstrzygnięcie W KODZIE (≥4/6)
		// → zamknięcie sesji + los zgłoszenia w JEDNEJ tx (LLM już za nami).
		const verdicts: VivaVerdict[] = [
			...previousAnswers.map((a) => a.verdictJson as VivaVerdict),
			verdict,
		];
		const { status: outcome, result } = resolveVivaOutcome(verdicts);
		await closeSessionWithOutcome({
			session,
			lastAnswer: { position, content: answer, verdictJson: verdict },
			outcome,
			result,
		});

		await recordAudit({
			actorType: "system",
			actorId: auth_.studentId,
			action: `submission.viva.${outcome}`,
			targetType: "submission",
			targetId: session.submissionId,
			...auditContextFromRequest(req),
			metadata: { sessionId: session.id, totalPoints: result.totalPoints },
		});
		if (outcome === "passed") {
			// Kontrakt audytu sprzed B7: kredencjał = wpis submission.verified
			// (przy fladze ON gałąź w submit route nigdy nie strzela — emituje viva).
			await recordAudit({
				actorType: "system",
				actorId: auth_.studentId,
				action: "submission.verified",
				targetType: "submission",
				targetId: session.submissionId,
				...auditContextFromRequest(req),
				metadata: { via: "viva", totalPoints: result.totalPoints },
			});
		}

		return NextResponse.json({
			state: outcome,
			position: VIVA_QUESTION_COUNT,
			result: {
				totalPoints: result.totalPoints,
				maxPoints: result.maxPoints,
				passThreshold: result.passThreshold,
			},
		});
	} catch (err) {
		logError("viva.answer", err, { sessionId: params.data.sessionId });
		return NextResponse.json({ error: "Nie udało się zapisać odpowiedzi." }, { status: 500 });
	}
}
