import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { countAnswers, type VivaSessionRow } from "@/lib/viva/session-store";
import { VIVA_QUESTION_COUNT, VIVA_TTL_MINUTES, type VivaQuestion } from "@/lib/viva/types";

/**
 * B7/1.16a — wspólne helpery HTTP tras vivy (poza route.ts: Next waliduje
 * eksporty modułów tras, pomocnicze funkcje żyją w lib).
 */

export type VivaStateResponse = {
	state: string | null;
	position: number;
	totalQuestions: number;
	/** Bieżące pytanie (tylko pending/in_progress). BEZ excerptu — student ma pracę. */
	question: { position: number; question: string; filePath?: string } | null;
	expiresAt: string | null;
	result: { totalPoints: number; maxPoints: number; passThreshold: number } | null;
	/** true = expired z 0 odpowiedzi — student może sam wystartować ponownie. */
	restartable: boolean;
};

export async function resolveStudentAuth(): Promise<
	| { ok: true; userId: string; studentId: string; tenantId: string }
	| { ok: false; status: 401 | 404 }
> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return { ok: false, status: 401 };
	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, tenantId: true },
	});
	if (!student) return { ok: false, status: 404 };
	return { ok: true, userId: session.user.id, studentId: student.id, tenantId: student.tenantId };
}

/** Serializacja stanu obrony dla studenta (GET/start/answer). */
export async function serializeVivaState(
	session: VivaSessionRow | null,
): Promise<VivaStateResponse> {
	if (!session) {
		return {
			state: null,
			position: 0,
			totalQuestions: VIVA_QUESTION_COUNT,
			question: null,
			expiresAt: null,
			result: null,
			restartable: false,
		};
	}
	const questions = session.questionsJson as VivaQuestion[];
	const position = await countAnswers(session.id);
	const active = session.status === "pending" || session.status === "in_progress";
	const q = active && position < questions.length ? questions[position] : null;
	const result = session.resultJson as {
		totalPoints: number;
		maxPoints: number;
		passThreshold: number;
	} | null;
	return {
		state: session.status,
		position,
		totalQuestions: VIVA_QUESTION_COUNT,
		question: q ? { position: q.position, question: q.question, filePath: q.filePath } : null,
		expiresAt: session.startedAt
			? new Date(session.startedAt.getTime() + VIVA_TTL_MINUTES * 60_000).toISOString()
			: null,
		result: result
			? {
					totalPoints: result.totalPoints,
					maxPoints: result.maxPoints,
					passThreshold: result.passThreshold,
				}
			: null,
		restartable: session.status === "expired",
	};
}
