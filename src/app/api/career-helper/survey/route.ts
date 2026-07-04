import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_SESSIONS_PER_DAY } from "@/lib/ai/career-helper";
import { resolveOrProvisionStudent } from "@/lib/career-helper/session";
import { careerHelperSessions } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 30;

// Ankieta wstępna (spec B0 §3.3). q1/q2 single-choice, q3 multi (1–3), q4 textarea.
const SurveySchema = z.object({
	answers: z.object({
		q1: z.string().min(1).max(200),
		q2: z.string().min(1).max(200),
		q3: z.array(z.string().min(1).max(200)).min(1).max(3),
		q4: z.string().min(10).max(280),
	}),
});

/**
 * POST /api/career-helper/survey — start, tworzy sesję (blokująco).
 * Cap aplikacyjny: max 1 aktywna sesja (in_progress) per student (golden-adr §4.1).
 */
export async function POST(req: Request) {
	// Krok 0 onboardingu (strumień E / #5): nowy student NIE ma jeszcze rekordu
	// `students` (powstaje w finalnym POST /api/onboarding). Sesja Pomocnika jest
	// NOT NULL po student_id → tu prowizorycznie zakładamy wiersz (tenant __unmapped),
	// nadpisywany przez UPSERT onboardingu. Bez tego nowy user dostaje 404 i utyka.
	const studentAuth = await resolveOrProvisionStudent();
	if (!studentAuth.ok) {
		return NextResponse.json(
			{ error: studentAuth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: studentAuth.status },
		);
	}

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${studentAuth.userId}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = SurveySchema.safeParse(raw);
	if (!parsed.success) {
		// 0.15/C3: 400 jak w pozostałych trasach (turn/select-path/onboarding) — było 422.
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	try {
		const { userId, studentId, tenantId } = studentAuth;
		const result = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// 0.11 (abuse): cap sesji na okno 24h. Sprawdzamy PRZED zamknięciem aktywnej —
			// przekroczenie limitu nie niszczy trwającej sesji studenta (zwracamy 429).
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
			if ((recent?.c ?? 0) >= MAX_SESSIONS_PER_DAY) {
				return { capped: true as const };
			}

			// Cap: 1 aktywna sesja. Istniejąca in_progress → zamknij jako restarted.
			const [active] = await tx
				.select({ c: count() })
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.studentId, studentId),
						eq(careerHelperSessions.status, "in_progress"),
					),
				);
			if ((active?.c ?? 0) > 0) {
				await tx
					.update(careerHelperSessions)
					.set({ status: "restarted", updatedAt: new Date() })
					.where(
						and(
							eq(careerHelperSessions.studentId, studentId),
							eq(careerHelperSessions.status, "in_progress"),
						),
					);
			}
			const [created] = await tx
				.insert(careerHelperSessions)
				.values({
					studentId,
					tenantId,
					status: "in_progress",
					turn: 0,
					answers: parsed.data.answers,
				})
				.returning({ id: careerHelperSessions.id });
			return { capped: false as const, sessionId: created?.id };
		});

		if (result.capped) {
			// 0.15/C3: Retry-After (follow-up audytu 0.11) — bez niego klient z retry-logiką
			// ponawia agresywnie. Konserwatywnie 1h (dokładny czas wyjścia najstarszej sesji
			// z okna wymagałby dodatkowego odczytu; wystarcza wskazówka rzędu wielkości).
			return NextResponse.json(
				{
					error: `Limit sesji Pomocnika (${MAX_SESSIONS_PER_DAY}/dobę) osiągnięty. Spróbuj ponownie później.`,
				},
				{ status: 429, headers: { "retry-after": "3600" } },
			);
		}
		if (!result.sessionId) {
			return NextResponse.json({ error: "Nie udało się utworzyć sesji." }, { status: 500 });
		}
		return NextResponse.json({
			sessionId: result.sessionId,
			redirectTo: `/onboarding/step-3/chat?sessionId=${result.sessionId}`,
		});
	} catch (err) {
		logError("career-helper.survey", err, { studentId: studentAuth.studentId });
		return NextResponse.json(
			{ error: "Nie udało się zapisać ankiety. Spróbuj ponownie." },
			{ status: 500 },
		);
	}
}
