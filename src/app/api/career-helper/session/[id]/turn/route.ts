import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectCrisis, MAX_TURNS, runTurn, USER_MESSAGE_MAX_LEN } from "@/lib/ai/career-helper";
import { loadAdvisorContext } from "@/lib/career-helper/advisor-memory";
import { resolveStudent } from "@/lib/career-helper/session";
import { careerHelperSessions, careerHelperTurns } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isFeatureEnabled } from "@/lib/flags";
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
/**
 * Kod stanu HTTP z błędu dostawcy modelu — albo `undefined`, gdy go nie ma.
 *
 * Czytamy WYŁĄCZNIE `statusCode` i wyłącznie gdy jest liczbą. Reszta obiektu
 * błędu SDK (`responseBody`, `requestBodyValues`, `url`) niesie treść zapytania
 * studenta i nie wolno jej dotykać — patrz nagłówek `src/lib/log.ts`.
 */
function kodStanuOdpowiedzi(error: unknown): number | undefined {
	const kod = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
	return typeof kod === "number" ? kod : undefined;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	const studentAuth = await resolveStudent();
	if (!studentAuth.ok) {
		return NextResponse.json(
			{ error: studentAuth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: studentAuth.status },
		);
	}

	// aiLight, NIE aiHeavy (rekalibracja 2026-07-21, znalezisko pierwszego realnego
	// przebiegu nocnego e2e-llm): tura = JEDNO wywołanie modelu „standard", a koszt
	// sesji i tak tnie twardy cap 9 tur + limiter restartów. aiHeavy (5/min) ścinał
	// żywego użytkownika: krótkie odpowiedzi („tak", „wolę dane") idą szybciej niż
	// 12 s/turę — tura 6 w tej samej minucie dostawała 429, rozmowa wisła na 5/9.
	// aiHeavy zostaje tam, gdzie jest ciężko: /summary (2× premium: podsumowanie+sędzia).
	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${studentAuth.userId}`);
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
		/** AG.7: kontekst z bazy (flaga advisorMemory); null = flaga off/pusto/błąd. */
		memoryContext: string | null;
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

			// AG.7 (flaga advisorMemory): kontekst budowany W TYM SAMYM tx (RLS
			// przycina odczyt do własnych wierszy). Best-effort: błąd budowy NIE
			// blokuje tury — doradca po prostu leci bez pamięci (jak przy fladze off).
			let memoryContext: string | null = null;
			if (isFeatureEnabled("advisorMemory")) {
				try {
					memoryContext = await loadAdvisorContext(tx, studentId);
				} catch (err) {
					logError("career-helper.turn.memory", err, { studentId });
				}
			}

			return {
				answers: sessionRow.answers,
				history: cleanHistory,
				nextTurn: sessionRow.turn + 1,
				memoryContext,
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

	const { answers, history, nextTurn, memoryContext } = prep;

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
		// AG.7: null → undefined = prompt bajt-w-bajt jak przed zmianą.
		memoryContext: memoryContext ?? undefined,
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
		/**
		 * BŁĄD W TRAKCIE STRUMIENIA ZOSTAWIA ŚLAD PO STRONIE SERWERA.
		 *
		 * Domyślna obsługa AI SDK to `() => "An error occurred."` — błąd jedzie
		 * do przeglądarki i NIE trafia nigdzie po stronie serwera. Skutek
		 * zmierzony w nocnym śledztwie (Quinn, 2026-09-02): z 16 padłych podejść
		 * Pomocnika kariery **12 nie zostawiło ani jednej linii diagnostycznej**.
		 * Przyczynę czternastu nocy czerwieni dało się nazwać wyłącznie dlatego,
		 * że w tym samym przebiegu biegła druga trasa (`/api/syllabus/parse`),
		 * która woła `logError` i przyznaje się w dzienniku. Gdyby awaria
		 * dotknęła tylko tej trasy, nie byłoby ŻADNEGO śladu.
		 *
		 * CZY TO NIE JEST DRUGI NOŚNIK — nośnik sprawdzony PRZED dołożeniem tego.
		 * `runTurn` przekazuje do `streamText` własny `onError`
		 * (`streamUsageTracker` w `src/lib/ai/usage.ts:194`). Ten istniejący hak
		 * NIE pokrywa tej potrzeby i nie duplikuje się z tym tutaj:
		 *   - pisze do INNEGO ujścia — wiersz telemetrii przez `recordAiUsage`,
		 *     nie linia w dzienniku serwera;
		 *   - niesie WYŁĄCZNIE nazwę klasy błędu (`error.name`), więc zdanie
		 *     rozstrzygające o przyczynie („Your credit balance is too low")
		 *     nie pojawia się w nim w ogóle;
		 *   - w `NODE_ENV=test` z ujściem bazodanowym jest jawnym no-op
		 *     (`usage.ts:107`), a przy padzie zapisu loguje własną porażkę,
		 *     nie porażkę modelu.
		 * Ten uchwyt dokłada brakującą warstwę: JEDNO zdanie w dzienniku, które
		 * nazywa przyczynę.
		 *
		 * OCHRONA DANYCH OSOBOWYCH — logujemy PRZEZ `logError`, nigdy obok.
		 * `src/lib/log.ts` celowo wyrzuca surowy obiekt błędu, bo obiekty błędów
		 * SDK niosą oryginalny prompt (ankieta, cel kariery, treść rozmowy).
		 * Stąd tutaj: żadnego `error.responseBody`, `error.url` ani
		 * `error.requestBodyValues` — wyłącznie identyfikatory, które i tak już
		 * stoją w pozostałych czterech wywołaniach `logError` w tym pliku, plus
		 * kod stanu HTTP (liczba, nie treść). Rozpoznanie przyczyny bierze się
		 * z `name` + `message`, które dokłada `logError`.
		 */
		onError: (error) => {
			logError("career-helper.turn.stream", error, {
				studentId,
				sessionId: params.data.id,
				turn: nextTurn,
				// Kod stanu odpowiedzi dostawcy — jedyna rzecz, którą wyciągamy
				// z obiektu błędu, i wyłącznie gdy jest liczbą. To metadana
				// (402/429/529 rozstrzygają „budżet kontra przeciążenie"), nie
				// treść. Ta sama polaryzacja co `extractValidationIssues`
				// w `src/lib/log.ts`: metadane tak, dane studenta nigdy.
				statusCode: kodStanuOdpowiedzi(error),
			});
			// TRZECI CZŁON, ZMIERZONY — nie „to samo, co było".
			// Sprawdziłem, co SDK robi BEZ tego uchwytu, zamiast założyć:
			// przebieg z wyłączonym `onError` oddaje do przeglądarki
			//   data: {"type":"error","errorText":"Your credit balance is too
			//          low to access the Anthropic API."}
			// czyli SUROWY komunikat dostawcy. Zwrócenie stałej go zatrzymuje.
			// Dla studenta nie zmienia się nic: ekran czatu renderuje własną
			// treść (`COPY.chat.streamError`) na podstawie stanu „error",
			// a `errorText` nie jest nigdzie wyświetlany (chat-screen.tsx §S4).
			// Czyli: mniej wychodzi na zewnątrz, tyle samo widzi student.
			return "An error occurred.";
		},
	});
}
