import { streamText } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * STRAŻNIK: błąd w trakcie strumienia trasy `/turn` ZOSTAWIA ŚLAD W DZIENNIKU.
 *
 * REGUŁA, KTÓREJ TEN PLIK PILNUJE (spisana zanim powstało dopasowanie)
 * -------------------------------------------------------------------
 * „Gdy wywołanie modelu pada w trakcie strumienia Pomocnika kariery, po stronie
 *  serwera zostaje linia, która nazywa przyczynę — i nie zostaje ani znak treści
 *  rozmowy studenta."
 *
 * Reguła ma TRZY człony i każdy ma tu własny, osobno nazwany test:
 *   1. w dzienniku serwera jest wpis nazywający przyczynę;
 *   2. wpis nie niesie ani znaku treści rozmowy;
 *   3. surowy komunikat dostawcy nie wychodzi do przeglądarki.
 * Bez członu 2 naprawa widoczności byłaby wyciekiem danych osobowych. Człon 3
 * dołożony PO POMIARZE, nie z ostrożności — patrz komentarz przy teście.
 *
 * SKĄD SIĘ WZIĄŁ — pomiar, nie przeczucie
 * ---------------------------------------
 * Śledztwo Quinna (2026-09-02, `docs/audyty/2026-09-02-e2e-llm-sledztwo-quinn.md`):
 * z 16 padłych podejść **12 nie zostawiło ani jednej linii diagnostycznej**,
 * bo odpowiedź szła strumieniem bez uchwytu `onError`, a domyślna obsługa AI SDK
 * (`() => "An error occurred."`) połyka błąd. Przyczynę czternastu nocy czerwieni
 * dało się nazwać wyłącznie dzięki drugiej trasie, która akurat mówi prawdę.
 *
 * CZY CI POTRAFI WYTWORZYĆ STAN, W KTÓRYM STRUMIEŃ PADA — TAK
 * ----------------------------------------------------------
 * Bez wywołania modelu, bez bazy i bez kosztu: `MockLanguageModelV3` z pakietu
 * `ai/test` oddaje strumień, którego pierwszą częścią jest błąd. Przez trasę
 * przechodzi więc PRAWDZIWY `streamText` i PRAWDZIWY `toUIMessageStreamResponse`
 * — podmieniona jest wyłącznie warstwa dostawcy modelu. Odpowiednik drogi
 * z zadania D1: stan, którego CI normalnie nie ma, test sobie wytwarza.
 *
 * DLACZEGO `logError` NIE JEST TU PODMIENIONY (inaczej niż w turn-route.test.ts)
 * -----------------------------------------------------------------------------
 * Ochrona danych osobowych mieszka w `src/lib/log.ts`, nie w trasie. Gdyby ten
 * plik podmienił `logError`, drugi człon reguły sprawdzałby atrapę zamiast
 * realnego złożenia „trasa + logger". Podsłuchujemy więc `console.error`, czyli
 * faktyczne ujście.
 */

// --- Granice podmienione: tożsamość, limity, baza. Model NIE jest atrapą
// --- wyższego poziomu — idzie przez prawdziwy streamText. -------------------

const mockResolveStudent = vi.fn();
vi.mock("@/lib/career-helper/session", () => ({
	resolveStudent: () => mockResolveStudent(),
}));

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { aiHeavy: null, aiLight: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
}));

const txState = {
	session: null as null | { id: string; status: string; turn: number; answers: unknown },
	historyRows: [] as { role: "ai" | "user"; content: string; turnIndex?: number }[],
};
vi.mock("@/lib/db/tenant-context", () => ({
	withTenantContext: vi.fn(
		async (_ctx: { role: string }, fn: (tx: unknown) => Promise<unknown>) => {
			const sessionRows = txState.session ? [txState.session] : [];
			const where = () =>
				Object.assign(Promise.resolve(sessionRows), {
					orderBy: async () => txState.historyRows,
				});
			const tx = {
				select: () => ({ from: () => ({ where }) }),
				insert: () => ({ values: async () => undefined }),
				update: () => ({ set: () => ({ where: async () => undefined }) }),
			};
			return fn(tx);
		},
	),
}));

const mockRunTurn = vi.fn();
vi.mock("@/lib/ai/career-helper", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, runTurn: (args: unknown) => mockRunTurn(args) };
});

import { POST } from "../session/[id]/turn/route";

/**
 * Typ pojedynczej części strumienia dostawcy, WYPROWADZONY z konstruktora atrapy.
 *
 * Nie importujemy go z `@ai-sdk/provider` — to zależność przechodnia, a przy
 * ścisłym układzie katalogów pnpm nie jest widoczna z tego pakietu. Wyprowadzenie
 * z typu, który i tak mamy pod ręką, nie może się rozjechać z wersją SDK.
 */
type KonfiguracjaAtrapy = NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>;
type WynikStrumienia = Extract<NonNullable<KonfiguracjaAtrapy["doStream"]>, { stream: unknown }>;
type CzescStrumienia = WynikStrumienia["stream"] extends ReadableStream<infer P> ? P : never;

const VALID_ID = "11111111-1111-4111-8111-111111111111";
const params = Promise.resolve({ id: VALID_ID });

/**
 * Treść, która NIE MA prawa pojawić się w dzienniku. Jedno słowo, żeby dało się
 * go szukać w całym serializowanym wywołaniu, a nie tylko w wybranym polu.
 */
const TRESC_STUDENTA = "SEKRETNA-TRESC-ROZMOWY-STUDENTA";

/** Błąd dostawcy o kształcie `AI_APICallError`: niesie kod stanu ORAZ treść zapytania. */
function bladDostawcy(): Error & { statusCode: number; requestBodyValues: unknown } {
	const err = new Error("Your credit balance is too low to access the Anthropic API.") as Error & {
		statusCode: number;
		requestBodyValues: unknown;
	};
	err.name = "AI_APICallError";
	err.statusCode = 402;
	// Tak wygląda prawdziwy obiekt błędu SDK — prompt w środku. To jest powód,
	// dla którego `logError` nie loguje surowego obiektu.
	err.requestBodyValues = { prompt: `Nowa wiadomość studenta:\n${TRESC_STUDENTA}` };
	return err;
}

/** Prawdziwy `streamText`, którego dostawca oddaje strumień zaczynający się błędem. */
function strumienKtoryPada(err: Error) {
	return streamText({
		model: new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream<CzescStrumienia>({
					chunks: [{ type: "error", error: err }],
				}),
			}),
		}),
		prompt: "nieistotny — dostawca i tak oddaje błąd",
	});
}

/** Strumień trzeba WYPIĆ DO KOŃCA — bez tego uchwyt błędu nie ma kiedy zadziałać. */
async function wypijOdpowiedz(res: Response): Promise<string> {
	return await res.text();
}

let spyKonsoli: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	txState.session = { id: VALID_ID, status: "in_progress", turn: 0, answers: { q1: "a" } };
	txState.historyRows = [];
	mockResolveStudent.mockResolvedValue({
		ok: true,
		userId: "user-1",
		studentId: "student-1",
		tenantId: "tenant-1",
	});
	mockRunTurn.mockImplementation(() => strumienKtoryPada(bladDostawcy()));
	spyKonsoli = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** Wpisy dziennika należące do tej trasy — po znaczniku zakresu, nie po treści. */
function wpisyStrumienia() {
	return (spyKonsoli.mock.calls as unknown[][]).filter(
		(c) => c[0] === "[career-helper.turn.stream]",
	);
}

describe("/turn — błąd strumienia zostawia ślad po stronie serwera", () => {
	it("CZŁON 1 — pad wywołania modelu w trakcie strumienia produkuje wpis w dzienniku, który NAZYWA przyczynę", async () => {
		const res = await POST(
			new Request(`http://localhost/api/career-helper/session/${VALID_ID}/turn`, {
				method: "POST",
				body: JSON.stringify({ userMessage: TRESC_STUDENTA }),
			}),
			{ params },
		);
		await wypijOdpowiedz(res);

		// KONTROLA LICZNOŚCI: sprawdzenie, do którego nic nie dotarło, melduje
		// sukces. Najpierw dowód, że wpis w ogóle jest — dopiero potem jego treść.
		const wpisy = wpisyStrumienia();
		expect(wpisy).toHaveLength(1);

		const ladunek = wpisy[0][1] as Record<string, unknown>;
		// Klasa błędu i zdanie rozstrzygające — bez nich dziennik mówi „coś padło".
		expect(ladunek.name).toBe("AI_APICallError");
		expect(String(ladunek.message)).toMatch(/credit balance/i);
		// Kod stanu odróżnia budżet (402) od przeciążenia (529) i limitu (429).
		expect(ladunek.statusCode).toBe(402);
		// Identyfikatory korelacji — bez nich nie wiadomo, KTÓRA rozmowa padła.
		expect(ladunek.studentId).toBe("student-1");
		expect(ladunek.sessionId).toBe(VALID_ID);
	});

	it("CZŁON 2 — wpis NIE niesie ani znaku treści rozmowy, mimo że obiekt błędu ją zawiera", async () => {
		const err = bladDostawcy();
		// Kontrola dwustronna: najpierw dowód, że treść NAPRAWDĘ siedzi w błędzie
		// — inaczej test niżej przechodziłby, nie mając czego szukać.
		expect(JSON.stringify(err.requestBodyValues)).toContain(TRESC_STUDENTA);
		mockRunTurn.mockImplementation(() => strumienKtoryPada(err));

		const res = await POST(
			new Request(`http://localhost/api/career-helper/session/${VALID_ID}/turn`, {
				method: "POST",
				body: JSON.stringify({ userMessage: TRESC_STUDENTA }),
			}),
			{ params },
		);
		await wypijOdpowiedz(res);

		const wpisy = wpisyStrumienia();
		expect(wpisy).toHaveLength(1);
		expect(JSON.stringify(wpisy[0])).not.toContain(TRESC_STUDENTA);
	});

	it("CZŁON 3 — surowy komunikat dostawcy NIE wychodzi do przeglądarki (odpowiedź nadal 200, nie 500)", async () => {
		const res = await POST(
			new Request(`http://localhost/api/career-helper/session/${VALID_ID}/turn`, {
				method: "POST",
				body: JSON.stringify({ userMessage: "cześć" }),
			}),
			{ params },
		);
		const tresc = await wypijOdpowiedz(res);

		expect(res.status).toBe(200);
		expect(res.headers.get("x-career-helper-turn")).toBe("1");
		// Bez uchwytu SDK wysyła do przeglądarki SUROWY komunikat dostawcy —
		// zmierzone przebiegiem z mutacją M1:
		//   data: {"type":"error","errorText":"Your credit balance is too low…"}
		// Uchwyt podmienia to na stałą. Student nie widzi różnicy (ekran czatu
		// renderuje własną treść z COPY.chat.streamError na podstawie stanu
		// „error"), a wnętrzności dostawcy zostają po stronie serwera.
		expect(tresc).toContain("An error occurred.");
		expect(tresc).not.toContain("credit balance");
		// I tu również: żadnej treści rozmowy w tym, co wraca jako komunikat błędu.
		expect(tresc).not.toContain(TRESC_STUDENTA);
	});

	it("przebieg BEZ błędu nie produkuje wpisu — kontrola, że strażnik nie krzyczy na zdrowym strumieniu", async () => {
		// Kontrola dwustronna (v1.17): strażnik ma się czerwienić na błędzie
		// ORAZ milczeć na poprawnym przebiegu. Bez tej drugiej strony „wpis
		// jest" mogłoby znaczyć „wpis jest zawsze".
		// Konfiguracja wyciągnięta do zmiennej z JAWNYM typem — inaczej TypeScript
		// wywodzi z tablicy części strumienia unię literałów zamiast
		// LanguageModelV3StreamPart i odmawia przypisania.
		const konfiguracjaZdrowa: KonfiguracjaAtrapy = {
			doStream: async () => ({
				stream: simulateReadableStream<CzescStrumienia>({
					chunks: [
						{ type: "stream-start", warnings: [] },
						{ type: "text-start", id: "1" },
						{ type: "text-delta", id: "1", delta: "Pytanie?" },
						{ type: "text-end", id: "1" },
						{
							type: "finish",
							// W SDK v3 powód zakończenia jest obiektem, nie napisem.
							finishReason: { unified: "stop" as const, raw: undefined },
							usage: {
								inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
								outputTokens: { total: 1, text: 1, reasoning: undefined },
							},
						},
					],
				}),
			}),
		};
		mockRunTurn.mockImplementation(() =>
			streamText({ model: new MockLanguageModelV3(konfiguracjaZdrowa), prompt: "zdrowy przebieg" }),
		);

		const res = await POST(
			new Request(`http://localhost/api/career-helper/session/${VALID_ID}/turn`, {
				method: "POST",
				body: JSON.stringify({ userMessage: "cześć" }),
			}),
			{ params },
		);
		const tresc = await wypijOdpowiedz(res);

		// KONTROLA LICZNOŚCI dla kontroli negatywnej: „zero wpisów" jest warte
		// tyle, ile dowód, że strumień w ogóle doszedł do skutku. Bez tego ten
		// test przechodziłby także wtedy, gdyby trasa odbiła żądanie na 400.
		expect(res.status).toBe(200);
		expect(tresc).toContain("Pytanie?");
		expect(wpisyStrumienia()).toHaveLength(0);
	});
});
