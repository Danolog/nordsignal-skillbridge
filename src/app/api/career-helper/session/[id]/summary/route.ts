import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSummary } from "@/lib/ai/career-helper";
import { loadAdvisorContext } from "@/lib/career-helper/advisor-memory";
import { resolveStudent } from "@/lib/career-helper/session";
import {
	advisorMemory,
	careerHelperSessions,
	careerHelperTurns,
	studentCareerPaths,
	students,
} from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isFeatureEnabled } from "@/lib/flags";
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
	let data: {
		answers: unknown;
		history: { role: "ai" | "user"; content: string }[];
		memoryContext: string | null;
	} | null;
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
				// 0.15/C4: tiebreaker roli w parze tej samej tury (identyczny createdAt z
				// jednego INSERT-u) — transkrypt dla sędziego musi mieć pytanie przed odpowiedzią.
				.orderBy(
					asc(careerHelperTurns.turnIndex),
					asc(sql`CASE ${careerHelperTurns.role} WHEN 'user' THEN 0 ELSE 1 END`),
					asc(careerHelperTurns.createdAt),
				);
			// AG.7 (flaga advisorMemory): kontekst z bazy w tym samym tx; best-effort.
			let memoryContext: string | null = null;
			if (isFeatureEnabled("advisorMemory")) {
				try {
					memoryContext = await loadAdvisorContext(tx, studentId);
				} catch (err) {
					logError("career-helper.summary.memory", err, { studentId });
				}
			}
			return {
				answers: sessionRow.answers,
				history: history as { role: "ai" | "user"; content: string }[],
				memoryContext,
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
		summary = await generateSummary({
			answers: data.answers,
			history: data.history,
			// AG.7: null → undefined = prompt bajt-w-bajt jak przed zmianą.
			memoryContext: data.memoryContext ?? undefined,
		});
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

				// AG.7 (flaga advisorMemory): utrwal FAKT z rozmowy — treść podsumowania,
				// które przeszło sędziego (HITL-gated; odrzucone/warstwa4_failed NIE
				// wchodzi do pamięci). To jedyne dane, których nie ma nigdzie indziej —
				// reszta kontekstu doradcy czyta się z istniejących tabel.
				if (isFeatureEnabled("advisorMemory") && summary.summaryText) {
					const pathsNote =
						summary.careerPaths.length > 0
							? ` Wskazane obszary: ${summary.careerPaths.map((p) => p.label).join(", ")}.`
							: "";
					await tx.insert(advisorMemory).values({
						studentId,
						tenantId,
						sessionId: params.data.id,
						kind: "summary",
						content: `${summary.summaryText}${pathsNote}`.slice(0, 2000),
					});
				}
			}
		});
	} catch (err) {
		logError("career-helper.summary.persist", err, { studentId });
		// Nie wywracamy odpowiedzi — podsumowanie powstało; zwracamy je studentowi.
	}

	return NextResponse.json(summary);
}
