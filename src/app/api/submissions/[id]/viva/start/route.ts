import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { submissionReviews, vivaSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { resolveStudentAuth, serializeVivaState } from "@/lib/viva/http";
import { isVivaSessionExpired } from "@/lib/viva/service";
import {
	countAnswers,
	loadLatestSession,
	loadOwnSubmission,
	resolveExpiredSession,
	type VivaSessionRow,
} from "@/lib/viva/session-store";

/**
 * B7/1.16a (ADR-013 D2/D4) — start/wznowienie obrony. Bez LLM (pytania już
 * zamrożone w potoku — krok 6-prep). Reguły:
 *  - po zapadłej decyzji człowieka viva NIE startuje (409 decision_exists),
 *  - pending → in_progress (startedAt = teraz; od tego liczy się TTL),
 *  - in_progress w oknie → WZNOWIENIE (idempotentne — zwraca bieżący stan),
 *  - in_progress po TTL: 0 odp. → auto-restart na TYCH SAMYCH zamrożonych
 *    pytaniach (nowa sesja, stara `expired`); ≥1 odp. → inconclusive → 409,
 *  - `expired` (terminal, 0 odp.) → restart jak wyżej,
 *  - stany końcowe (passed/failed/inconclusive/superseded) → 409 ze stanem.
 *
 * A1+A2 (ADR A-1 (a+)): ślad obrony NIE niesie `actorId` ani kontekstu żądania
 * — reguła i jej uzasadnienie żyją w `src/lib/audit.ts` (`REGULA_AKTORA`), tu
 * są tylko egzekwowane przez typ.
 */

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${auth_.userId}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) {
		return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
	}
	const submissionId = params.data.id;

	try {
		const submission = await loadOwnSubmission(submissionId, auth_.studentId);
		if (!submission) {
			return NextResponse.json({ error: "Submission not found" }, { status: 404 });
		}

		// ADR-013 D1: po decyzji człowieka obrona jest bezprzedmiotowa.
		const [decision] = await db
			.select({ id: submissionReviews.id })
			.from(submissionReviews)
			.where(eq(submissionReviews.submissionId, submissionId));
		if (decision) {
			return NextResponse.json(
				{ error: "Decyzja człowieka już zapadła — obrona bezprzedmiotowa." },
				{ status: 409 },
			);
		}

		let session = await loadLatestSession(submissionId);
		if (!session) {
			return NextResponse.json(
				{ error: "Brak sesji obrony dla tego zgłoszenia." },
				{ status: 409 },
			);
		}

		// Leniwe wygaśnięcie in_progress po TTL.
		if (session.status === "in_progress" && isVivaSessionExpired(session.startedAt)) {
			const resolved = await resolveExpiredSession(session);
			if (resolved === "inconclusive") {
				return NextResponse.json(
					{ error: "Sesja wygasła w trakcie — rozstrzygnie człowiek.", state: "inconclusive" },
					{ status: 409 },
				);
			}
			session = await loadLatestSession(submissionId);
		}
		if (!session) return NextResponse.json({ error: "Brak sesji obrony." }, { status: 409 });

		// Wznowienie w oknie — idempotentny start.
		if (session.status === "in_progress") {
			return NextResponse.json(await serializeVivaState(session));
		}

		if (session.status === "pending") {
			const [updated] = await db
				.update(vivaSessions)
				.set({ status: "in_progress", startedAt: new Date() })
				.where(eq(vivaSessions.id, session.id))
				.returning();
			await recordAudit({
				actorType: "student",
				action: "submission.viva.started",
				targetType: "submission",
				targetId: submissionId,
				metadata: { sessionId: session.id },
			});
			return NextResponse.json(await serializeVivaState(updated as VivaSessionRow));
		}

		if (session.status === "expired") {
			// Restart na TYCH SAMYCH zamrożonych pytaniach (D2.4): pytania już
			// widziane — nowa generacja niczego by nie chroniła, a kosztowałaby.
			const answers = await countAnswers(session.id);
			if (answers === 0) {
				const [fresh] = await db
					.insert(vivaSessions)
					.values({
						submissionId,
						studentId: session.studentId,
						tenantId: session.tenantId,
						status: "in_progress",
						questionsJson: session.questionsJson,
						startedAt: new Date(),
					})
					.returning();
				await recordAudit({
					actorType: "student",
					action: "submission.viva.restarted",
					targetType: "submission",
					targetId: submissionId,
					metadata: { previousSessionId: session.id, sessionId: fresh.id },
				});
				return NextResponse.json(await serializeVivaState(fresh as VivaSessionRow));
			}
		}

		// Stany końcowe — nic do wystartowania.
		return NextResponse.json(
			{ error: `Obrona w stanie '${session.status}' — start niemożliwy.`, state: session.status },
			{ status: 409 },
		);
	} catch (err) {
		logError("viva.start", err, { submissionId });
		return NextResponse.json({ error: "Nie udało się rozpocząć obrony." }, { status: 500 });
	}
}
