import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectCrisis, MAX_TURNS, runTurn, USER_MESSAGE_MAX_LEN } from "@/lib/ai/career-helper";
import { resolveStudent } from "@/lib/career-helper/session";
import { careerHelperSessions, careerHelperTurns } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

const ParamsSchema = z.object({ id: z.string().uuid() });
// userMessage opcjonalne: puste/brak = KANDYDAT na turę otwierającą (B0 —
// Pomocnik odzywa się pierwszy). Czy faktycznie wolno, rozstrzyga handler po
// wczytaniu historii (puste dozwolone TYLKO przy history.length === 0).
const TurnSchema = z.object({ userMessage: z.string().max(USER_MESSAGE_MAX_LEN).optional() });

/**
 * POST /api/career-helper/session/[id]/turn — tura rozmowy (STREAMING, Sonnet).
 *
 * Twarde ograniczenie izolacji (kontrakt Ethana §2.3): CAŁA praca na bazie
 * (walidacja sesji + odczyt historii) zamyka się w withTenantContext PRZED
 * strumieniem. Zapis tury idzie w onFinish — w OSOBNYM withTenantContext.
 * Żadna transakcja tenanta nie wisi otwarta przez czas I/O do Anthropic.
 *
 * Filtr kryzysowy regułowy biegnie PRZED modelem — trafienie = model NIE
 * wołany, zwracamy sygnał crisis (front: S5 paused_crisis, statyczny komunikat).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = TurnSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const userMessage = parsed.data.userMessage ?? "";
	const isEmptyMessage = userMessage.trim().length === 0;
	const { userId, studentId, tenantId } = studentAuth;

	// Filtr kryzysowy PRZED modelem i PRZED jakimkolwiek I/O do LLM. Na pustym
	// wejściu (kandydat na turę otwierającą) nie ma czego skanować — pomijamy.
	if (!isEmptyMessage && detectCrisis(userMessage)) {
		return NextResponse.json({ crisis: true }, { status: 200 });
	}

	// Indeks tury dla OSTATNIEJ odpowiedzi studenta (na 9. — ostatnie — pytanie AI).
	// Ta odpowiedź NIE generuje 10. pytania i NIE podbija licznika `turn` (kolumna
	// ma check 0..9 w bazie). Zapisujemy ją osobnym turnIndex POWYŻEJ MAX_TURNS,
	// żeby jednoznacznie wykryć „rozmowa domknięta odpowiedzią" przy rehydracji i
	// odeprzeć podwójną wysyłkę (stary klient) — patrz gałąź `finalAnswer` niżej.
	const FINAL_ANSWER_TURN_INDEX = MAX_TURNS + 1;

	// (1) Praca na bazie ZAMKNIĘTA w withTenantContext — PRZED strumieniem.
	type PrepReady = {
		answers: unknown;
		history: { role: "ai" | "user"; content: string }[];
		nextTurn: number;
	};
	// `finalAnswer` = student odpowiada na 9. (ostatnie) pytanie AI. Zapis user-only,
	// bez modelu, bez podbicia `turn`. Niezmiennik kontraktu Darka: ostatnia
	// interakcja to ODPOWIEDŹ studenta, nie pytanie bez pola do wpisania.
	type Prep =
		| PrepReady
		| { closed: true }
		| { limit: true }
		| { finalAnswer: true; nextTurn: number }
		| null;
	let prep: Prep;
	try {
		prep = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			const [sessionRow] = await tx
				.select({
					id: careerHelperSessions.id,
					status: careerHelperSessions.status,
					turn: careerHelperSessions.turn,
					answers: careerHelperSessions.answers,
				})
				.from(careerHelperSessions)
				.where(
					and(
						eq(careerHelperSessions.id, params.data.id),
						eq(careerHelperSessions.studentId, studentId),
					),
				);
			if (!sessionRow) return null;
			if (sessionRow.status !== "in_progress" && sessionRow.status !== "restarted") {
				return { closed: true as const };
			}

			const history = await tx
				.select({
					role: careerHelperTurns.role,
					content: careerHelperTurns.content,
					turnIndex: careerHelperTurns.turnIndex,
				})
				.from(careerHelperTurns)
				.where(
					and(
						eq(careerHelperTurns.sessionId, sessionRow.id),
						eq(careerHelperTurns.studentId, studentId),
					),
				)
				.orderBy(asc(careerHelperTurns.turnIndex), asc(careerHelperTurns.createdAt));

			// Odpowiedź na ostatnie pytanie już zapisana (turnIndex > MAX_TURNS) —
			// rozmowa domknięta. Każda kolejna tura = 409 (idempotencja dla stałego
			// lub powtarzającego klienta; front i tak chowa input po domknięciu).
			const alreadyFinalized = history.some((h) => h.turnIndex > MAX_TURNS);
			if (alreadyFinalized) {
				return { limit: true as const };
			}

			const cleanHistory = history.map((h) => ({ role: h.role, content: h.content })) as {
				role: "ai" | "user";
				content: string;
			}[];

			// Licznik `turn` osiągnął MAX_TURNS → na ekranie jest 9. (ostatnie) pytanie
			// AI. Ta tura to OSTATNIA odpowiedź studenta: zapis user-only, bez modelu.
			if (sessionRow.turn >= MAX_TURNS) {
				return { finalAnswer: true as const, nextTurn: FINAL_ANSWER_TURN_INDEX };
			}

			return {
				answers: sessionRow.answers,
				history: cleanHistory,
				nextTurn: sessionRow.turn + 1,
			};
		});
	} catch (err) {
		logError("career-helper.turn.prep", err, { studentId });
		return NextResponse.json({ error: "Nie udało się rozpocząć tury." }, { status: 500 });
	}

	if (prep === null) return NextResponse.json({ error: "Session not found" }, { status: 404 });
	if ("closed" in prep) return NextResponse.json({ error: "Session closed" }, { status: 409 });
	if ("limit" in prep) {
		return NextResponse.json({ error: "Turn limit reached", turn: MAX_TURNS }, { status: 409 });
	}

	// Ostatnia odpowiedź studenta na 9. pytanie AI: zapis user-only (bez modelu,
	// bez podbicia `turn`), potem front pokazuje „Pokaż podsumowanie". Pusta
	// wiadomość tu = 400 (nie da się domknąć rozmowy pustą odpowiedzią).
	if ("finalAnswer" in prep) {
		if (isEmptyMessage) {
			return NextResponse.json({ error: "Invalid input" }, { status: 400 });
		}
		try {
			await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
				await tx.insert(careerHelperTurns).values([
					{
						sessionId: params.data.id,
						studentId,
						tenantId,
						role: "user" as const,
						content: userMessage,
						turnIndex: prep.nextTurn,
					},
				]);
				await tx
					.update(careerHelperSessions)
					.set({ updatedAt: new Date() })
					.where(
						and(
							eq(careerHelperSessions.id, params.data.id),
							eq(careerHelperSessions.studentId, studentId),
						),
					);
			});
		} catch (err) {
			logError("career-helper.turn.final", err, { studentId });
			return NextResponse.json({ error: "Nie udało się zapisać odpowiedzi." }, { status: 500 });
		}
		// `turn` zostaje MAX_TURNS (kolumna ma check 0..9); front czyta to z nagłówka.
		return NextResponse.json(
			{ final: true, turn: MAX_TURNS },
			{ status: 200, headers: { "x-career-helper-turn": String(MAX_TURNS) } },
		);
	}

	const { answers, history, nextTurn } = prep;

	// Reguła tury otwierającej (decyzja kontraktu Ethana §2):
	//  - history pusta + wiadomość pusta  → tura OTWIERAJĄCA: zapisujemy TYLKO
	//    turę AI (Pomocnik odzywa się pierwszy, brak pustej tury usera).
	//  - history NIEpusta + wiadomość pusta → 400: realna odpowiedź w trakcie
	//    rozmowy musi być niepusta (to nie jest otwarcie).
	//  - wiadomość niepusta → para user+ai (jak dotąd).
	const isOpeningTurn = isEmptyMessage && history.length === 0;
	if (isEmptyMessage && !isOpeningTurn) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}

	// (2) Strumień LLM POZA transakcją. (3) Zapis tury w onFinish — OSOBNY
	//     withTenantContext (transakcja tenanta nie wisi przez czas streamingu).
	const result = runTurn({
		answers,
		history,
		// Puste = tryb otwierający w runTurn (prompt z samej ankiety).
		userMessage: isOpeningTurn ? undefined : userMessage,
		onFinish: async ({ text }) => {
			try {
				await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
					// Tura otwierająca: NIE wstawiamy pustej tury usera — tylko AI.
					const rows = isOpeningTurn
						? [
								{
									sessionId: params.data.id,
									studentId,
									tenantId,
									role: "ai" as const,
									content: text,
									turnIndex: nextTurn,
								},
							]
						: [
								{
									sessionId: params.data.id,
									studentId,
									tenantId,
									role: "user" as const,
									content: userMessage,
									turnIndex: nextTurn,
								},
								{
									sessionId: params.data.id,
									studentId,
									tenantId,
									role: "ai" as const,
									content: text,
									turnIndex: nextTurn,
								},
							];
					await tx.insert(careerHelperTurns).values(rows);
					await tx
						.update(careerHelperSessions)
						.set({ turn: nextTurn, updatedAt: new Date() })
						.where(
							and(
								eq(careerHelperSessions.id, params.data.id),
								eq(careerHelperSessions.studentId, studentId),
							),
						);
				});
			} catch (err) {
				// Zapis padł po streamie — nie kasujemy odpowiedzi; logujemy bez PII.
				logError("career-helper.turn.persist", err, { studentId });
			}
		},
	});

	// Numer tury i limit oddajemy w nagłówkach (front czyta done.turn z kontraktu).
	return result.toUIMessageStreamResponse({
		headers: {
			"x-career-helper-turn": String(nextTurn),
			"x-career-helper-total-turns": String(MAX_TURNS),
		},
	});
}
