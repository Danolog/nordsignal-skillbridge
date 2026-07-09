import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectSubmissions, vivaAnswers, vivaSessions } from "@/lib/db/schema";
import { vivaProjection } from "@/lib/viva/service";
import type { VivaResult, VivaSessionStatus } from "@/lib/viva/types";

/**
 * B7/1.16a (ADR-013) — operacje DB sesji obrony. Wszystko OWNER-SIDE (klasa
 * tabel: viva_sessions grant SELECT-only, viva_answers DENY — zapisy wyłącznie
 * serwer), z jawnym WHERE studentId tam, gdzie wołający jest studentem
 * (własność = warstwa 1; 404-pattern w trasach).
 *
 * Projekcja aiReviewJson.viva zapisywana w TEJ SAMEJ tx co zmiana statusu
 * sesji (ADR-013 D3 — jedno źródło prawdy, rozjazd niemożliwy z konstrukcji).
 */

export type VivaSessionRow = typeof vivaSessions.$inferSelect;

/** Zgłoszenie studenta (własność egzekwowana w WHERE) — null = 404 w trasie. */
export async function loadOwnSubmission(submissionId: string, studentId: string) {
	const [row] = await db
		.select({
			id: projectSubmissions.id,
			tenantId: projectSubmissions.tenantId,
			projectId: projectSubmissions.projectId,
			status: projectSubmissions.status,
		})
		.from(projectSubmissions)
		.where(
			and(eq(projectSubmissions.id, submissionId), eq(projectSubmissions.studentId, studentId)),
		);
	return row ?? null;
}

/** Najświeższa sesja obrony zgłoszenia (dowolny stan) — null gdy brak. */
export async function loadLatestSession(submissionId: string): Promise<VivaSessionRow | null> {
	const [row] = await db
		.select()
		.from(vivaSessions)
		.where(eq(vivaSessions.submissionId, submissionId))
		.orderBy(desc(vivaSessions.createdAt))
		.limit(1);
	return row ?? null;
}

export async function countAnswers(sessionId: string): Promise<number> {
	const [row] = await db
		.select({ c: sql<number>`count(*)::int` })
		.from(vivaAnswers)
		.where(eq(vivaAnswers.sessionId, sessionId));
	return row?.c ?? 0;
}

export async function loadAnswers(sessionId: string) {
	return db
		.select()
		.from(vivaAnswers)
		.where(eq(vivaAnswers.sessionId, sessionId))
		.orderBy(asc(vivaAnswers.position));
}

/** Fragment SQL projekcji do aiReviewJson.viva. */
function projectionSql(state: VivaSessionStatus, opts?: { score?: number; completedAt?: Date }) {
	return sql`jsonb_set(coalesce(${projectSubmissions.aiReviewJson}, '{}'::jsonb), '{viva}', ${JSON.stringify(vivaProjection(state, opts))}::jsonb)`;
}

/**
 * Leniwe wygaśnięcie (wzorzec isSessionExpired z 1.11) — wołane z tras
 * czytających stan, gdy sesja in_progress przekroczyła TTL:
 *  - 0 odpowiedzi → `expired` (terminal, RESTARTOWALNY przez studenta na tych
 *    samych zamrożonych pytaniach — ADR-013 D2.4),
 *  - ≥1 odpowiedź → `inconclusive` + needsHumanReview (człowiek rozstrzyga).
 * Zwraca nowy stan sesji.
 */
export async function resolveExpiredSession(
	session: VivaSessionRow,
): Promise<"expired" | "inconclusive"> {
	const answers = await countAnswers(session.id);
	const now = new Date();
	if (answers === 0) {
		await db.transaction(async (tx) => {
			await tx
				.update(vivaSessions)
				.set({ status: "expired", completedAt: now })
				.where(eq(vivaSessions.id, session.id));
			await tx
				.update(projectSubmissions)
				.set({ aiReviewJson: projectionSql("expired"), updatedAt: now })
				.where(eq(projectSubmissions.id, session.submissionId));
		});
		return "expired";
	}
	await db.transaction(async (tx) => {
		await tx
			.update(vivaSessions)
			.set({ status: "inconclusive", completedAt: now })
			.where(eq(vivaSessions.id, session.id));
		await tx
			.update(projectSubmissions)
			.set({
				aiReviewJson: projectionSql("inconclusive"),
				needsHumanReview: true,
				updatedAt: now,
			})
			.where(eq(projectSubmissions.id, session.submissionId));
	});
	return "inconclusive";
}

/**
 * Zamknięcie sesji werdyktem (po ostatniej odpowiedzi; werdykty policzone
 * PRZED tx — LLM nigdy w transakcji): passed → zgłoszenie 'verified';
 * failed → needsHumanReview (kolejka B8). Ostatnia odpowiedź wstawiana
 * w tej samej tx (komplet albo nic).
 */
export async function closeSessionWithOutcome(args: {
	session: VivaSessionRow;
	lastAnswer: { position: number; content: string; verdictJson: unknown };
	outcome: "passed" | "failed";
	result: VivaResult;
}): Promise<void> {
	const now = new Date();
	await db.transaction(async (tx) => {
		await tx.insert(vivaAnswers).values({
			sessionId: args.session.id,
			studentId: args.session.studentId,
			tenantId: args.session.tenantId,
			position: args.lastAnswer.position,
			content: args.lastAnswer.content,
			verdictJson: args.lastAnswer.verdictJson,
		});
		await tx
			.update(vivaSessions)
			.set({ status: args.outcome, resultJson: args.result, completedAt: now })
			.where(eq(vivaSessions.id, args.session.id));
		await tx
			.update(projectSubmissions)
			.set({
				aiReviewJson: projectionSql(args.outcome, {
					score: args.result.totalPoints,
					completedAt: now,
				}),
				...(args.outcome === "passed"
					? { status: "verified" as const }
					: { needsHumanReview: true }),
				updatedAt: now,
			})
			.where(eq(projectSubmissions.id, args.session.submissionId));
	});
}

/**
 * Awaria/niejednoznaczność sędziego przy odpowiedzi → fail-closed: odpowiedź
 * zapisana BEZ werdyktu, sesja `inconclusive`, człowiek rozstrzyga.
 */
export async function closeSessionInconclusive(args: {
	session: VivaSessionRow;
	lastAnswer?: { position: number; content: string };
}): Promise<void> {
	const now = new Date();
	await db.transaction(async (tx) => {
		if (args.lastAnswer) {
			await tx.insert(vivaAnswers).values({
				sessionId: args.session.id,
				studentId: args.session.studentId,
				tenantId: args.session.tenantId,
				position: args.lastAnswer.position,
				content: args.lastAnswer.content,
				verdictJson: null,
			});
		}
		await tx
			.update(vivaSessions)
			.set({ status: "inconclusive", completedAt: now })
			.where(eq(vivaSessions.id, args.session.id));
		await tx
			.update(projectSubmissions)
			.set({ aiReviewJson: projectionSql("inconclusive"), needsHumanReview: true, updatedAt: now })
			.where(eq(projectSubmissions.id, args.session.submissionId));
	});
}
