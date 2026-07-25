// @vitest-environment node
//
// 1E.4 (SLICE R4) — KONTRAKT TRAS /api/review/* NA ŻYWEJ BAZIE (Quinn/QA, bramka W2).
// To POWIERZCHNIA ATAKU: IDOR, wyciek klucza, izolacja najemcy. Trasy R4 czytają i
// piszą OWNER-SIDE (question_items to tabela DENY, review_states/logs bez grantu
// zapisu app_student) — owner BYPASSUJE RLS, więc JEDYNĄ ścianą izolacji jest
// studentId rozwiązany z SESJI (K1). Atrapa DB (unit `review-routes.test.ts`)
// świeci na zielono nawet gdy realnie pęka izolacja/klucz — tu wszystko biegnie na
// realnych route handlerach + realnym Postgresie :5433 (NIE prod NEON, NIE mocki
// DB/serwisu). Pęknięcie tu = BLOCKER przed merge na main.
//
// Mockowane WYŁĄCZNIE: Better Auth session (dowodzimy warstwy tras/DB, nie
// logowania) + next/headers. Flaga, review-service (R3), review-questions (R4),
// grade.ts, rate-limit — REALNE.
//
// Kontrakty (zadanie Ethana/Leo):
//   1. Flaga OFF → 404 na obu trasach, PRZED sesją/DB (deploy≠release, merge za
//      flagą OFF bezpieczny).
//   2. Izolacja A↔B / IDOR (najważniejsze):
//      2a. A ocenia koncept należący do B / spoza harmonogramu A → 409, ZERO mutacji
//          stanu/logów B (ściana K1 = recordReview WHERE student_id z sesji).
//      2b. A ocenia SWÓJ koncept, ale questionItemId spoza tego konceptu (podstawienie
//          pytania) → 404, ZERO zapisu (ściana K3 = loadGradableQuestion pytanie↔koncept).
//      2c. ?studentId=B w /queue przy zalogowanym A → kolejka A, nie B (query ignorowane).
//   3. Wstrzyknięcie do body: studentId/hintDepth/isCorrect w /answer → 400 (.strict()).
//   4. Strip klucza end-to-end: surowy JSON /queue i /answer NIGDY nie niesie
//      answer_json/"correct"/option_feedback_json/klucza (skan surowego tekstu).
//   5. Happy path: poprawność liczona SERWEREM, review_states A zaktualizowane,
//      review_logs A +1, zwrot {isCorrect, nextDue}, feedback neutralny.
//   6. Cap K2: limit>20 przycięte do 20 (na żywej bazie). [Rate-limit 429 — patrz
//      nota przy teście: nieosiągalny w integracji bez Upstash, pokryty unitem.]
//
// Dowody mutacyjne (że test BIJE, nie tylko świeci zielono) — patrz raport Quinn:
//   • 2b: rozluźnienie eq(conceptId) w loadGradableQuestion → test IDOR-2 czerwony.
//   • 4:  emisja answerJson w buildReviewQuestionPayload (+select) → test strip czerwony.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0042).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "q-1e4-r4";

// Sesja Better Auth mockowana — mockGetSession zwraca aktualnie „zalogowanego"
// użytkownika (przełączany jawnie w testach izolacji A↔B).
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

function queueReq(query = ""): Request {
	return new Request(`http://test.local/api/review/queue${query}`);
}
function answerReq(body: unknown): Request {
	return new Request("http://test.local/api/review/answer", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

/** Guard granicy bezpieczeństwa: surowy JSON nie niesie klucza banku ani jego wartości. */
function assertNoKeyLeak(raw: string) {
	expect(raw).not.toContain("answer_json");
	expect(raw).not.toContain("answerJson");
	expect(raw).not.toContain("answerKey");
	expect(raw).not.toContain('"correct"');
	expect(raw).not.toContain("option_feedback_json");
	expect(raw).not.toContain("optionFeedbackJson");
}

dBack("1E.4 R4 · kontrakt tras /api/review/* na żywej bazie (IDOR, strip klucza, izolacja)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let svc: typeof import("@/lib/review/review-service");
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let queueGET: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;

	let tenant1 = "";
	let tenant2 = "";
	// user_id per student (getStudentByUserId rozwiązuje studenta z sesji po user_id).
	const USER = {
		iso: `${MARKER}-u-iso`, // aktor A (tenant1) — izolacja/query
		victim: `${MARKER}-u-victim`, // ofiara B (tenant2)
		happy: `${MARKER}-u-happy`, // happy/wrong path (tenant1)
		strip: `${MARKER}-u-strip`, // strip klucza (tenant1)
		cap: `${MARKER}-u-cap`, // cap K2 (tenant1)
	};
	const student: Record<string, string> = {}; // klucz → student_id
	const concept: Record<string, string> = {}; // klucz → concept_id
	const question: Record<string, string> = {}; // klucz → question_item_id
	const capConcepts: string[] = [];

	async function cleanup() {
		await db.execute(sql`DELETE FROM review_logs WHERE student_id IN
			(SELECT id FROM students WHERE user_id LIKE ${`${MARKER}%`})`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id IN
			(SELECT id FROM students WHERE user_id LIKE ${`${MARKER}%`})`);
		await db.execute(sql`DELETE FROM students WHERE user_id LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM "user" WHERE id LIKE ${`${MARKER}%`}`);
		// question_concepts kaskaduje question_items; review_states/logs już usunięte.
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug LIKE ${`${MARKER}%`}`);
	}

	async function mkTenant(slug: string): Promise<string> {
		const r = await db.execute(
			sql`INSERT INTO tenants (slug, name) VALUES (${slug}, ${slug}) RETURNING id`,
		);
		return (r.rows[0] as { id: string }).id;
	}

	async function mkStudent(userId: string, tenantId: string): Promise<string> {
		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, true, now(), now())`,
		);
		const r = await db.execute(
			sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			    VALUES (${userId}, ${tenantId}::uuid, 'Test U', 'Informatyka', 3, 'data-science')
			    RETURNING id`,
		);
		return (r.rows[0] as { id: string }).id;
	}

	async function mkConcept(key: string): Promise<string> {
		const r = await db.execute(
			sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES (${`${MARKER}-${key}`}, ${`${MARKER}-${key}`}, 'foundations') RETURNING id`,
		);
		const id = (r.rows[0] as { id: string }).id;
		concept[key] = id;
		return id;
	}

	/** single_choice z kluczem correct + option_feedback_json (materiał do testu strip). */
	async function mkQuestion(conceptId: string, correct: number): Promise<string> {
		const r = await db.execute(
			sql`INSERT INTO question_items
			    (concept_id, difficulty, type, stem, options_json, answer_json, explanation_md, option_feedback_json)
			    VALUES (${conceptId}::uuid, 1, 'single_choice', 'Ile to 2+2?',
			            ${JSON.stringify(["3", "4"])}::jsonb, ${JSON.stringify({ correct })}::jsonb,
			            'Bo 2+2=4.', ${JSON.stringify([{ feedbackMd: "źle" }, { feedbackMd: "dobrze" }])}::jsonb)
			    RETURNING id`,
		);
		return (r.rows[0] as { id: string }).id;
	}

	async function enrollDue(studentId: string, conceptId: string): Promise<void> {
		const now = new Date();
		await svc.enrollConcept(studentId, conceptId, now);
		// due w przeszłość → gwarantowanie „na dziś" niezależnie od zegara route'a.
		await db.execute(
			sql`UPDATE review_states SET due = now() - interval '5 minutes'
			    WHERE student_id = ${studentId}::uuid AND concept_id = ${conceptId}::uuid`,
		);
	}

	interface StateRow {
		state: string;
		reps: number;
		due: string;
		updated_at: string;
	}
	async function stateRow(sid: string, cid: string): Promise<StateRow | undefined> {
		const r = await db.execute(
			sql`SELECT state, reps, due, updated_at FROM review_states
			    WHERE student_id = ${sid}::uuid AND concept_id = ${cid}::uuid`,
		);
		return r.rows[0] as StateRow | undefined;
	}
	async function logCount(sid: string, cid: string): Promise<number> {
		const r = await db.execute(
			sql`SELECT count(*)::int AS c FROM review_logs
			    WHERE student_id = ${sid}::uuid AND concept_id = ${cid}::uuid`,
		);
		return (r.rows[0] as { c: number }).c;
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_SPACED_REPETITION", "1");
		({ db } = await import("@/lib/db"));
		svc = await import("@/lib/review/review-service");
		({ GET: queueGET } = await import("../queue/route"));
		({ POST: answerPOST } = await import("../answer/route"));
		await cleanup();

		tenant1 = await mkTenant(`${MARKER}-t1`);
		tenant2 = await mkTenant(`${MARKER}-t2`);

		student.iso = await mkStudent(USER.iso, tenant1);
		student.victim = await mkStudent(USER.victim, tenant2);
		student.happy = await mkStudent(USER.happy, tenant1);
		student.strip = await mkStudent(USER.strip, tenant1);
		student.cap = await mkStudent(USER.cap, tenant1);

		// Koncepty + pytania:
		//  CB (t2) — koncept OFIARY B; A go zaatakuje (IDOR-1).
		await mkConcept("cb");
		question.cb = await mkQuestion(concept.cb, 1);
		await enrollDue(student.victim, concept.cb);

		//  CA (t1) — SWÓJ koncept aktora A (IDOR-2: A poda QB do CA) + query-izolacja.
		await mkConcept("ca");
		question.ca = await mkQuestion(concept.ca, 1);
		await enrollDue(student.iso, concept.ca);

		//  CH (t1) — happy/wrong path studenta happy.
		await mkConcept("ch");
		question.ch = await mkQuestion(concept.ch, 1); // klucz = indeks 1
		await enrollDue(student.happy, concept.ch);

		//  CS (t1) — strip: pełny materiał klucza w banku, single-elementowa kolejka.
		await mkConcept("cs");
		question.cs = await mkQuestion(concept.cs, 1);
		await enrollDue(student.strip, concept.cs);

		//  25 konceptów due dla sCap → dowód twardego capu 20 na żywej bazie.
		for (let i = 0; i < 25; i++) {
			const cid = await mkConcept(`cap-${String(i).padStart(2, "0")}`);
			await mkQuestion(cid, 0);
			await enrollDue(student.cap, cid);
			capConcepts.push(cid);
		}

		mockGetSession.mockResolvedValue({ user: { id: USER.iso } });
	}, 60_000);

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	beforeEach(() => {
		vi.stubEnv("FLAG_SPACED_REPETITION", "1");
		mockGetSession.mockResolvedValue({ user: { id: USER.iso } });
	});

	// ── KONTRAKT 1: flaga OFF → 404 PRZED sesją/DB ───────────────────────────
	describe("[1] flaga OFF → 404 (deploy≠release, merge za flagą OFF bezpieczny)", () => {
		it("GET /queue i POST /answer z flagą OFF → 404 i ZERO dotknięcia sesji/DB", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "0");
			mockGetSession.mockClear();

			const q = await queueGET(queueReq());
			expect(q.status).toBe(404);
			const a = await answerPOST(
				answerReq({ conceptId: concept.ca, questionItemId: question.ca, answerIndex: 1 }),
			);
			expect(a.status).toBe(404);

			// Trasa zwraca 404 PRZED auth → getSession nie wołane → zero zapytań do DB.
			expect(mockGetSession).not.toHaveBeenCalled();
		});

		it("wartości OFF (0/false/off/brak) wszystkie → 404 (parser flag fail-closed)", async () => {
			for (const val of ["0", "false", "off", ""]) {
				vi.stubEnv("FLAG_SPACED_REPETITION", val);
				expect((await queueGET(queueReq())).status).toBe(404);
			}
		});
	});

	// ── KONTRAKT 2: izolacja A↔B / IDOR (najważniejszy) ──────────────────────
	describe("[2] izolacja A↔B / IDOR", () => {
		it("[2a] A ocenia koncept OFIARY B (spoza harmonogramu A) → 409, ZERO mutacji stanu/logów B", async () => {
			const before = await stateRow(student.victim, concept.cb);
			expect(before?.state).toBe("new");
			expect(before?.reps).toBe(0);
			const logsBefore = await logCount(student.victim, concept.cb);

			// Zalogowany A, ale conceptId + questionItemId należą do B.
			mockGetSession.mockResolvedValue({ user: { id: USER.iso } });
			const res = await answerPOST(
				answerReq({ conceptId: concept.cb, questionItemId: question.cb, answerIndex: 1 }),
			);
			// recordReview(A, CB) nie znajduje stanu A na CB → ConceptNotScheduledError → 409.
			expect(res.status).toBe(409);
			assertNoKeyLeak(await res.text());

			// Wiersz B NIETKNIĘTY — bajt w bajt (state/reps/due/updated_at) + zero logów B.
			const after = await stateRow(student.victim, concept.cb);
			expect(after).toEqual(before);
			expect(await logCount(student.victim, concept.cb)).toBe(logsBefore);
		});

		it("[2b] A ocenia SWÓJ koncept CA, ale questionItemId należy do CB (podstawienie pytania) → 404, ZERO zapisu", async () => {
			const before = await stateRow(student.iso, concept.ca);
			const logsBefore = await logCount(student.iso, concept.ca);

			mockGetSession.mockResolvedValue({ user: { id: USER.iso } });
			// conceptId = CA (A jest zapisany), ale questionItemId = QB (pytanie konceptu CB).
			const res = await answerPOST(
				answerReq({ conceptId: concept.ca, questionItemId: question.cb, answerIndex: 1 }),
			);
			// loadGradableQuestion(QB, CA) → null (pytanie nie należy do CA) → 404 (K3), bez recordReview.
			expect(res.status).toBe(404);

			// Stan A na CA i logi A — bez zmian (grading/zapis nie ruszył).
			expect(await stateRow(student.iso, concept.ca)).toEqual(before);
			expect(await logCount(student.iso, concept.ca)).toBe(logsBefore);
		});

		it("[2c] ?studentId=B w /queue przy zalogowanym A → kolejka A (CA), nie B (CB) — query ignorowane", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.iso } });
			const res = await queueGET(queueReq(`?studentId=${student.victim}`));
			expect(res.status).toBe(200);
			const raw = await res.text();
			assertNoKeyLeak(raw);
			const ids = new Set(JSON.parse(raw).queue.map((e: { conceptId: string }) => e.conceptId));
			expect(ids.has(concept.ca)).toBe(true); // koncept A
			expect(ids.has(concept.cb)).toBe(false); // koncept B — NIE przecieka przez query
		});
	});

	// ── KONTRAKT 3: wstrzyknięcie do body → 400 (.strict()) ──────────────────
	describe("[3] wstrzyknięcie pól do body /answer → 400 (Zod .strict())", () => {
		const good = { conceptId: "", questionItemId: "", answerIndex: 1 };
		beforeEach(() => {
			good.conceptId = concept.ca;
			good.questionItemId = question.ca;
		});

		it("studentId w body → 400 (body NIE steruje tożsamością — K1 z sesji)", async () => {
			const res = await answerPOST(answerReq({ ...good, studentId: student.victim }));
			expect(res.status).toBe(400);
		});
		it("hintDepth w body → 400 (hintDepth wyprowadzany serwerowo, #217)", async () => {
			const res = await answerPOST(answerReq({ ...good, hintDepth: 3 }));
			expect(res.status).toBe(400);
		});
		it("isCorrect w body → 400 (poprawność liczy serwer, nie klient)", async () => {
			const res = await answerPOST(answerReq({ ...good, isCorrect: true }));
			expect(res.status).toBe(400);
		});
	});

	// ── KONTRAKT 4: strip klucza end-to-end (skan surowego JSON) ──────────────
	describe("[4] strip klucza — surowy JSON nigdy nie niesie klucza banku", () => {
		it('GET /queue: surowa odpowiedź bez answer_json/"correct"/option_feedback_json', async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.strip } });
			const res = await queueGET(queueReq());
			expect(res.status).toBe(200);
			const raw = await res.text();
			assertNoKeyLeak(raw);
			const json = JSON.parse(raw);
			// Kolejka realnie zbudowana (nie pusta) — dowód, że strip działa na NIEPUSTYM payloadzie.
			expect(json.queue.length).toBeGreaterThanOrEqual(1);
			expect(json.queue.some((e: { conceptId: string }) => e.conceptId === concept.cs)).toBe(true);
		});

		it("POST /answer: surowa odpowiedź (werdykt + wyjaśnienie) bez klucza banku", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.strip } });
			const res = await answerPOST(
				answerReq({ conceptId: concept.cs, questionItemId: question.cs, answerIndex: 1 }),
			);
			expect(res.status).toBe(200);
			const raw = await res.text();
			// answer route legalnie zwraca isCorrect (werdykt formujący §7) i explanation —
			// ale NIGDY answer_json/"correct"/option_feedback_json (klucz banku).
			assertNoKeyLeak(raw);
			const json = JSON.parse(raw);
			expect(json.isCorrect).toBe(true);
			expect(json.feedback.explanation).toContain("2+2");
		});
	});

	// ── KONTRAKT 5: happy path (poprawność serwerem, zapis, feedback neutralny) ─
	describe("[5] happy path — ocena serwerowa + zapis review_states/logs", () => {
		it("A odpowiada poprawnie na SWÓJ koncept → 200, isCorrect=true, stan +1 rep, log +1, feedback neutralny", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.happy } });
			const before = await stateRow(student.happy, concept.ch);
			expect(before?.state).toBe("new");
			expect(before?.reps).toBe(0);

			// Klucz CH = indeks 1; wysyłam answerIndex 1 → serwer liczy poprawnie.
			const res = await answerPOST(
				answerReq({
					conceptId: concept.ch,
					questionItemId: question.ch,
					answerIndex: 1,
					confidence: 2,
				}),
			);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.isCorrect).toBe(true);
			expect(new Date(json.nextDue).getTime()).toBeGreaterThan(Date.now());
			expect(json.feedback.message).toContain("większym odstępie");
			expect(json.feedback.message).not.toContain("oblałeś");

			// Realny zapis transakcyjny R3: stan przesunięty, dokładnie jeden log.
			const after = await stateRow(student.happy, concept.ch);
			expect(after?.state).toBe("review");
			expect(after?.reps).toBe(1);
			expect(await logCount(student.happy, concept.ch)).toBe(1);
		});

		it("zła odpowiedź: serwer liczy isCorrect=false (nie ufa klientowi), copy neutralny", async () => {
			// Świeży koncept, by nie mieszać ze stanem z testu wyżej.
			const cid = await mkConcept("ch-wrong");
			await mkQuestion(cid, 1); // klucz = 1
			await enrollDue(student.happy, cid);
			const qid = (
				await db.execute(sql`SELECT id FROM question_items WHERE concept_id = ${cid}::uuid LIMIT 1`)
			).rows[0].id as string;

			mockGetSession.mockResolvedValue({ user: { id: USER.happy } });
			// Wysyłam answerIndex 0 (klucz=1) → serwer MUSI policzyć false.
			const res = await answerPOST(
				answerReq({ conceptId: cid, questionItemId: qid, answerIndex: 0 }),
			);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.isCorrect).toBe(false);
			expect(json.feedback.message).toContain("wcześniej");
			expect(json.feedback.message).not.toContain("oblałeś");
			expect(await logCount(student.happy, cid)).toBe(1);
		});
	});

	// ── KONTRAKT 6: cap K2 (limit>20 → 20) na żywej bazie ────────────────────
	describe("[6] cap K2 — twardy sufit rozmiaru kolejki (DoS)", () => {
		it("?limit=100 przy 25 konceptach due → dokładnie 20 (cap serwera), cap=20 w payloadzie", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.cap } });
			const res = await queueGET(queueReq("?limit=100"));
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.cap).toBe(20);
			expect(json.queue).toHaveLength(20); // 25 due, przycięte do 20
		});

		it("?limit=5 respektowany (mniejszy niż cap)", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.cap } });
			const json = await (await queueGET(queueReq("?limit=5"))).json();
			expect(json.queue).toHaveLength(5);
		});

		it("brak limitu → domyślnie cap (20), nie nieograniczone", async () => {
			mockGetSession.mockResolvedValue({ user: { id: USER.cap } });
			const json = await (await queueGET(queueReq())).json();
			expect(json.queue).toHaveLength(20);
		});

		// NOTA (rate-limit 429): dwuwymiarowy limiter (reviewAnswer burst + reviewDaily)
		// jest REALNY w kodzie tras, ale w środowisku testowym NIE ma configu Upstash →
		// applyRateLimit zwraca no-op success:true (rate-limit.ts, gałąź !limiter poza
		// produkcją). Nie da się więc wywołać realnego 429 na :5433 bez zewnętrznego
		// Redisa, a ŚWIADOMIE NIE mockujemy limitera na zielono (to byłby test, który
		// mockuje to, co realnie pęka). Ścieżka 429 jest pokryta unitem
		// `review-routes.test.ts` (limiter podmieniony atrapą success:false). Gdy CI
		// dostanie Upstash w projekcie integration, ten przypadek dokłada się tu.
	});
});
