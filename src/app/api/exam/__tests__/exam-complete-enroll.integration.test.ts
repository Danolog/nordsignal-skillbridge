// @vitest-environment node
//
// 1E.4 (SLICE R5) — BRAMKA QA (Quinn) hooka enrollment powtórek wpiętego w ŻYWĄ
// trasę POST /api/exam/[id]/complete, na REALNEJ bazie (:5433, NIE prod NEON).
// To najczulszy slice 1E.4: dokłada kod do trasy, która na prodzie jest LIVE
// (FLAG_MASTERY_GATE=1). Testujemy trasę end-to-end z REALNYM Postgresem, REALNYM
// hookiem (opakowanym w szpiega), REALNYMI flagami (przez env) — mockujemy tylko
// warstwę logowania (auth: better-auth, next/headers) i log (asercja best-effort).
// Silnik gradingu, transakcja egzaminu, RLS/granty, zasiew review_states — WSZYSTKO
// na żywej bazie. Atrapa DB świeciłaby na zielono tam, gdzie realnie pęka
// owner-side / ON CONFLICT / inwariant flag-OFF.
//
// KONTRAKT #1 (KRYTYCZNY) — INWARIANT FLAGA-OFF: zdany egzamin przy
//   spacedRepetition OFF → odpowiedź trasy IDENTYCZNA jak w 1E.3, ZERO wierszy
//   review_states/review_logs, hook NIE wołany (szpieg = 0). Ścieżki 1E.3
//   (oblanie, double-complete → 409) nietknięte przy OFF. Dowiedzione mutacją
//   (patrz raport Quinn: usunięcie `&& isFeatureEnabled` z bramki → OFF czerwony).
// KONTRAKT #2 — enrollment przy fladze ON: koncepty active∧trunk='market'∧≥1
//   aktywne pytanie zasiane; foundations / retired / bez-pytania WYKLUCZONE;
//   oblany → zero zasiewu; idempotencja (ON CONFLICT DO NOTHING) + dedup wejścia;
//   tenant_id ze students; moduł bez konceptów market → no-op.
// KONTRAKT #3 — best-effort + owner-side: błąd hooka → trasa nadal 200 passed;
//   INSERT review_states jako app_student ODRZUCONY (dowód owner-side).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0042). Bez
// lokalnej bazy — skip (strażnik isLocalTestDb).

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// ── Sesja Better Auth mockowana (integracja dowodzi DB/silnika/hooka, nie logowania).
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// ── Hook enrollment: SZPIEG OPAKOWUJĄCY REALNĄ implementację. Domyślnie deleguje
//    do prawdziwego kodu (realny zasiew na żywej bazie); `enrollOverride` pozwala
//    wstrzyknąć błąd DB (test best-effort #3) bez dotykania reszty.
const enrollSpy = vi.fn();
let enrollOverride: ((studentId: string, moduleId: string) => Promise<void>) | null = null;
vi.mock("@/lib/review/enroll-hook", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/review/enroll-hook")>();
	return {
		...actual,
		enrollModuleConceptsOnMasteryPass: async (studentId: string, moduleId: string) => {
			enrollSpy(studentId, moduleId);
			if (enrollOverride) return enrollOverride(studentId, moduleId);
			return actual.enrollModuleConceptsOnMasteryPass(studentId, moduleId);
		},
	};
});

// ── Log: szpieg, żeby zweryfikować best-effort (błąd hooka zalogowany, nie propaguje).
const logErrorSpy = vi.fn();
vi.mock("@/lib/log", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/log")>();
	return { ...actual, logError: (...a: unknown[]) => logErrorSpy(...a) };
});

const USER = "u-1e4-r5-enroll";
const PREFIX = "r5e-";

function req(): Request {
	return new Request("http://test.local/api/exam/x/complete", { method: "POST" });
}
function ctx(id: string) {
	return { params: Promise.resolve({ id }) };
}

dBack("1E.4 R5 · enrollment hook w POST /api/exam/[id]/complete (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie po env/mockach.
	let POST: any;

	let tenantId = "";
	let studentId = "";
	let moduleWithConcepts = ""; // moduł z pełnym zestawem konceptów (INCLUDED/EXCLUDED)
	let moduleEmpty = ""; // moduł BEZ konceptów market (no-op)
	// DWA różne realne question_item (FK dla answers) — uq(session_id, question_item_id)
	// zabrania tego samego pytania dwa razy w jednej sesji.
	const answerQids: string[] = [];

	const concept: Record<string, string> = {}; // klucz → concept_id

	async function cleanupAll() {
		await db.execute(sql`DELETE FROM review_logs WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM assessment_answers WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id IN
			(SELECT id FROM students WHERE user_id = ${USER})`);
		await db.execute(sql`DELETE FROM students WHERE user_id = ${USER}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${USER}`);
		await db.execute(sql`DELETE FROM curriculum_item_concepts WHERE concept_id IN
			(SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM curriculum_module_items WHERE module_id IN
			(SELECT id FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM question_items WHERE concept_id IN
			(SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	async function mkConcept(
		key: string,
		trunk: "market" | "foundations",
		status: "active" | "retired",
	): Promise<string> {
		const [c] = await db
			.insert(schema.questionConcepts)
			.values({
				slug: `${PREFIX}${key}`,
				name: `Koncept ${key}`,
				trunk,
				competencyName: trunk === "market" ? `Kompetencja ${key}` : null,
				status,
			})
			.returning({ id: schema.questionConcepts.id });
		return c.id;
	}

	async function mkQuestion(conceptId: string, status: "active" | "retired"): Promise<string> {
		const [q] = await db
			.insert(schema.questionItems)
			.values({
				conceptId,
				difficulty: 1,
				type: "single_choice",
				stem: `Pytanie (${status})`,
				optionsJson: ["a", "b"],
				answerJson: { correct: 0 },
				status,
			})
			.returning({ id: schema.questionItems.id });
		return q.id;
	}

	async function mkModule(slug: string): Promise<string> {
		const [m] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: `${PREFIX}${slug}`,
				title: `Moduł ${slug}`,
				examConfigJson: { questionCount: 2, maxErrors: 1 },
			})
			.returning({ id: schema.curriculumModules.id });
		return m.id;
	}

	let itemPos = 0;
	async function mapConceptToModule(moduleId: string, conceptId: string): Promise<void> {
		const [item] = await db
			.insert(schema.curriculumModuleItems)
			.values({
				moduleId,
				slug: `${PREFIX}item-${itemPos}`,
				position: itemPos++,
				kind: "exercise",
				title: `Pozycja ${itemPos}`,
			})
			.returning({ id: schema.curriculumModuleItems.id });
		await db.insert(schema.curriculumItemConcepts).values({ itemId: item.id, conceptId });
	}

	/** Wstaw ŚWIEŻĄ sesję in_progress module_exam + odpowiedzi; zwróć sessionId. */
	async function freshSession(
		moduleId: string,
		moduleSlug: string,
		outcome: "pass" | "fail",
	): Promise<string> {
		// Kasujemy poprzednie sesje/odpowiedzi (partial unique: 1 aktywna per moduł).
		await db.execute(sql`DELETE FROM assessment_answers WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE student_id = ${studentId}`);
		const planJson = {
			schemaVersion: 1,
			kind: "module_exam",
			moduleSlug,
			attempt: 1, // attempt=1 → correctives=false nawet przy oblaniu (bez buildCorrectivesPackage)
			questionCount: 2,
			maxErrors: 1,
			items: [
				{ slotRef: "s0", conceptSlug: `${PREFIX}plan-a`, variantRef: "v0", position: 0 },
				{ slotRef: "s1", conceptSlug: `${PREFIX}plan-b`, variantRef: "v1", position: 1 },
			],
		};
		const [sess] = await db
			.insert(schema.assessmentSessions)
			.values({
				studentId,
				tenantId,
				kind: "module_exam",
				moduleId,
				inputHash: `${PREFIX}${moduleSlug}-${Date.now()}`,
				status: "in_progress",
				planJson,
				startedAt: new Date(), // nie wygasła
			})
			.returning({ id: schema.assessmentSessions.id });
		const correct = outcome === "pass"; // pass: 2/2 poprawne; fail: 2 błędy > maxErrors 1
		for (const position of [0, 1]) {
			await db.insert(schema.assessmentAnswers).values({
				sessionId: sess.id,
				studentId,
				tenantId,
				questionItemId: answerQids[position], // różne pytania per pozycja (uq session_item)
				answerJson: {},
				isCorrect: correct,
				position,
			});
		}
		return sess.id;
	}

	async function stateRows(): Promise<
		Array<{ concept_id: string; tenant_id: string; state: string; reps: number; lapses: number; due: string }>
	> {
		const r = await db.execute(
			sql`SELECT concept_id, tenant_id, state, reps, lapses, due
			    FROM review_states WHERE student_id = ${studentId}::uuid`,
		);
		return r.rows;
	}
	async function stateConceptIds(): Promise<Set<string>> {
		return new Set((await stateRows()).map((r) => r.concept_id));
	}
	async function reviewStatesCount(): Promise<number> {
		const r = await db.execute(
			sql`SELECT count(*)::int AS c FROM review_states WHERE student_id = ${studentId}::uuid`,
		);
		return r.rows[0].c;
	}
	async function reviewLogsCount(): Promise<number> {
		const r = await db.execute(
			sql`SELECT count(*)::int AS c FROM review_logs WHERE student_id = ${studentId}::uuid`,
		);
		return r.rows[0].c;
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "1"); // trasa istnieje (inaczej 404 — 1E.3)
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST } = await import("../[id]/complete/route"));
		await cleanupAll();

		const [t] = await db
			.insert(schema.tenants)
			.values({ slug: `${PREFIX}tenant`, name: `${PREFIX}tenant` })
			.returning({ id: schema.tenants.id });
		tenantId = t.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, 'R5 Enroll', ${`${USER}@test.local`}, true, now(), now())`,
		);
		const [student] = await db
			.insert(schema.students)
			.values({
				userId: USER,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "R5 Enroll",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentId = student.id;

		// ── Koncepty: 2× INCLUDED, + każdy powód WYKLUCZENIA, + dedup, + pre-enroll.
		concept.marketA = await mkConcept("market-a", "market", "active"); // INCLUDED
		concept.marketB = await mkConcept("market-b", "market", "active"); // INCLUDED
		concept.foundations = await mkConcept("foundations", "foundations", "active"); // EXCL: trunk
		concept.retired = await mkConcept("retired", "market", "retired"); // EXCL: status
		concept.noQ = await mkConcept("no-active-q", "market", "active"); // EXCL: brak akt. pytania
		concept.dup = await mkConcept("dup", "market", "active"); // dedup: 2 pozycje → 1 wiersz
		concept.pre = await mkConcept("pre", "market", "active"); // idempotencja: pre-enrolled

		// Aktywne pytania dla wszystkich WŁĄCZANYCH; noQ dostaje TYLKO retired pytanie.
		// marketA dostaje DWA aktywne pytania — służą też jako FK dla dwóch pozycji answers.
		answerQids.push(await mkQuestion(concept.marketA, "active"));
		answerQids.push(await mkQuestion(concept.marketA, "active"));
		await mkQuestion(concept.marketB, "active");
		await mkQuestion(concept.foundations, "active"); // ma pytanie, ale trunk wyklucza
		await mkQuestion(concept.retired, "active"); // ma pytanie, ale status wyklucza
		await mkQuestion(concept.noQ, "retired"); // TYLKO retired → filtr pojemności wyklucza
		await mkQuestion(concept.dup, "active");
		await mkQuestion(concept.pre, "active");

		moduleWithConcepts = await mkModule("mod-full");
		for (const cid of [
			concept.marketA,
			concept.marketB,
			concept.foundations,
			concept.retired,
			concept.noQ,
			concept.pre,
		]) {
			await mapConceptToModule(moduleWithConcepts, cid);
		}
		// dup mapowany DWA razy (dwie różne pozycje) — dowód dedup wejścia w hooku.
		await mapConceptToModule(moduleWithConcepts, concept.dup);
		await mapConceptToModule(moduleWithConcepts, concept.dup);

		// Moduł bez żadnego konceptu market (tylko foundations) → no-op.
		moduleEmpty = await mkModule("mod-empty");
		const cFoundOnly = await mkConcept("empty-found", "foundations", "active");
		concept.emptyFound = cFoundOnly;
		await mkQuestion(cFoundOnly, "active");
		await mapConceptToModule(moduleEmpty, cFoundOnly);

		mockGetSession.mockResolvedValue({ user: { id: USER } });
	}, 60_000);

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanupAll();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue({ user: { id: USER } });
		enrollOverride = null;
		// Czysty stan powtórek przed każdym testem (poza sytuacjami, gdzie test sam sieje).
		await db.execute(sql`DELETE FROM review_logs WHERE student_id = ${studentId}`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id = ${studentId}`);
	});
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.stubEnv("FLAG_MASTERY_GATE", "1"); // przywróć — mastery gate zawsze ON w suite
	});

	// ══════════════════════════════════════════════════════════════════════════
	// KONTRAKT #1 — INWARIANT FLAGA-OFF (najważniejszy test całego 1E.4)
	// ══════════════════════════════════════════════════════════════════════════
	describe("KONTRAKT #1 · inwariant flaga-OFF (trasa LIVE na prodzie — bajt w bajt)", () => {
		it("ZDANY przy spacedRepetition OFF → odpowiedź 1E.3 identyczna, ZERO review_states/logs, hook NIE wołany", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "0");
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass");

			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);
			const body = await res.json();

			// Odpowiedź jak w 1E.3: {completed:true, result:{...passed:true}} — bez pól R5.
			expect(body.completed).toBe(true);
			expect(body.result.passed).toBe(true);
			expect(body.result.kind).toBe("module_exam");
			expect(body.result.errorCount).toBe(0);
			expect(body.result.correctives).toBe(false);
			expect(Object.keys(body)).toEqual(["completed", "result"]); // ani jednego pola więcej

			// Sesja domknięta w bazie.
			const [s] = (
				await db.execute(
					sql`SELECT status FROM assessment_sessions WHERE id = ${sessionId}`,
				)
			).rows;
			expect(s.status).toBe("completed");

			// SEDNO: zero śladu powtórek + hook nietknięty (żadnego dodatkowego zapytania).
			expect(await reviewStatesCount()).toBe(0);
			expect(await reviewLogsCount()).toBe(0);
			expect(enrollSpy).not.toHaveBeenCalled();
		});

		it("1E.3 nietknięte przy OFF: oblany (passed=false) → 200, correctives=false, ZERO zasiewu", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "0");
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "fail");

			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.result.passed).toBe(false);
			expect(body.result.errorCount).toBe(2);
			expect(await reviewStatesCount()).toBe(0);
			expect(enrollSpy).not.toHaveBeenCalled();
		});

		it("1E.3 nietknięte przy OFF: double-complete → 409 (werdykt zapisany raz)", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "0");
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass");
			expect((await POST(req(), ctx(sessionId))).status).toBe(200);
			const second = await POST(req(), ctx(sessionId));
			expect(second.status).toBe(409);
			expect(await reviewStatesCount()).toBe(0);
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// KONTRAKT #2 — enrollment przy fladze ON
	// ══════════════════════════════════════════════════════════════════════════
	describe("KONTRAKT #2 · zasiew konceptów przy spacedRepetition ON", () => {
		it("ZDANY + ON → zasiane WYŁĄCZNIE active∧market∧≥1 aktywne pytanie; foundations/retired/bez-pytania WYKLUCZONE", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass");

			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);
			expect(enrollSpy).toHaveBeenCalledTimes(1);
			expect(enrollSpy).toHaveBeenCalledWith(studentId, moduleWithConcepts);

			const ids = await stateConceptIds();
			// INCLUDED: marketA, marketB, dup (raz mimo 2 pozycji), pre.
			expect(ids.has(concept.marketA)).toBe(true);
			expect(ids.has(concept.marketB)).toBe(true);
			expect(ids.has(concept.dup)).toBe(true);
			expect(ids.has(concept.pre)).toBe(true);
			// EXCLUDED: foundations (trunk), retired (status), noQ (brak aktywnego pytania).
			expect(ids.has(concept.foundations)).toBe(false);
			expect(ids.has(concept.retired)).toBe(false);
			expect(ids.has(concept.noQ)).toBe(false);
			// Dokładnie 4 koncepty (dedup dup do 1 wiersza).
			expect(await reviewStatesCount()).toBe(4);

			// Kształt zasiewu: state='new', reps/lapses=0, due≈now, tenant ze students.
			const rows = await stateRows();
			for (const row of rows) {
				expect(row.state).toBe("new");
				expect(row.reps).toBe(0);
				expect(row.lapses).toBe(0);
				expect(row.tenant_id).toBe(tenantId); // ze students, nie z payloadu
				const dueSkew = Math.abs(new Date(row.due).getTime() - Date.now());
				expect(dueSkew).toBeLessThan(5 * 60_000); // due ≈ now (świeży zasiew)
			}
			// Enrollment NIE pisze śladu ocen (to robi recordReview R3).
			expect(await reviewLogsCount()).toBe(0);
		});

		it("OBLANY + ON → ZERO zasiewu (hook tylko na passed)", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "fail");
			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);
			expect((await res.json()).result.passed).toBe(false);
			expect(enrollSpy).not.toHaveBeenCalled(); // bramka passed zwiera przed hookiem
			expect(await reviewStatesCount()).toBe(0);
		});

		it("idempotencja: koncept pre-enrolled (inny S/D/due) NIE nadpisany; dedup wejścia → 1 wiersz", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			// Pre-enroll 'pre' z WYPRACOWANYM stanem (state='review', reps=5, odległe due).
			const farDue = new Date(Date.now() + 999 * 24 * 60 * 60_000);
			await db.execute(sql`
				INSERT INTO review_states
					(student_id, tenant_id, concept_id, stability, difficulty, due, last_review, state, reps, lapses)
				VALUES (${studentId}::uuid, ${tenantId}::uuid, ${concept.pre}::uuid,
					42.0, 6.5, ${farDue.toISOString()}, ${new Date().toISOString()}, 'review', 5, 2)`);

			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass");
			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);

			// 'pre' NIE zresetowany do 'new'/reps 0 — ON CONFLICT DO NOTHING.
			const [pre] = (
				await db.execute(sql`SELECT state, reps, lapses, stability, difficulty, due
				    FROM review_states WHERE student_id = ${studentId}::uuid AND concept_id = ${concept.pre}::uuid`)
			).rows;
			expect(pre.state).toBe("review");
			expect(pre.reps).toBe(5);
			expect(pre.lapses).toBe(2);
			expect(Number(pre.stability)).toBeCloseTo(42.0, 5);
			expect(new Date(pre.due).getTime()).toBe(farDue.getTime());

			// dup nadal DOKŁADNIE jeden wiersz (2 pozycje modułu → dedup).
			const [dupCnt] = (
				await db.execute(sql`SELECT count(*)::int AS c FROM review_states
				    WHERE student_id = ${studentId}::uuid AND concept_id = ${concept.dup}::uuid`)
			).rows;
			expect(dupCnt.c).toBe(1);
			// Łącznie wciąż 4 koncepty (pre policzone jako istniejące, nie zdublowane).
			expect(await reviewStatesCount()).toBe(4);
		});

		it("re-fire zdanego egzaminu (idempotencja end-to-end): drugi pass tego samego modułu nie dubluje wierszy", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			// 1. zdanie → zasiew 4.
			await POST(req(), ctx(await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass")));
			expect(await reviewStatesCount()).toBe(4);
			// 2. zdanie (nowa sesja, ten sam moduł) → NADAL 4 (ON CONFLICT DO NOTHING).
			await POST(req(), ctx(await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass")));
			expect(await reviewStatesCount()).toBe(4);
		});

		it("moduł bez konceptów market → no-op bez błędu (hook wołany, zero wierszy, 200)", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			const sessionId = await freshSession(moduleEmpty, `${PREFIX}mod-empty`, "pass");
			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200);
			expect(enrollSpy).toHaveBeenCalledTimes(1); // hook odpalony...
			expect(await reviewStatesCount()).toBe(0); // ...ale nic do zasiania → no-op
		});
	});

	// ══════════════════════════════════════════════════════════════════════════
	// KONTRAKT #3 — best-effort + owner-side
	// ══════════════════════════════════════════════════════════════════════════
	describe("KONTRAKT #3 · best-effort + owner-side", () => {
		it("błąd DB w hooku → trasa NADAL 200 passed, sesja completed (brak rollbacku egzaminu), błąd zalogowany", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			enrollOverride = async () => {
				throw new Error("symulowany błąd DB w zasiewie");
			};
			const sessionId = await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass");

			const res = await POST(req(), ctx(sessionId));
			expect(res.status).toBe(200); // egzamin zdany mimo wywalonego zasiewu (§7)
			const body = await res.json();
			expect(body.result.passed).toBe(true);

			// Egzamin NIE wycofany — sesja completed (zasiew jest POZA transakcją egzaminu).
			const [s] = (
				await db.execute(sql`SELECT status FROM assessment_sessions WHERE id = ${sessionId}`)
			).rows;
			expect(s.status).toBe("completed");

			// Best-effort: błąd zalogowany pod scope 'review.enroll' z kontekstem.
			expect(logErrorSpy).toHaveBeenCalledWith(
				"review.enroll",
				expect.any(Error),
				expect.objectContaining({ studentId, moduleId: moduleWithConcepts }),
			);
		});

		it("owner-side: INSERT do review_states jako rola runtime app_student ODRZUCONY (dowód, że zasiew idzie owner-side)", async () => {
			// Realny zasiew (owner `db`) już udowodniony w #2. Tu dowodzimy dopełnienia:
			// rola runtime studenta ma na review_states TYLKO SELECT (0042) → INSERT spod
			// niej pada. Skoro wiersze jednak powstają (test #2), zasiew MUSI być owner-side.
			await expect(
				db.transaction(async (tx: unknown) => {
					// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
					const t = tx as any;
					await t.execute(sql`SELECT set_config('app.current_user_id', ${USER}, true)`);
					await t.execute(sql`SET LOCAL ROLE app_student`);
					await t.execute(sql`
						INSERT INTO review_states
							(student_id, tenant_id, concept_id, stability, difficulty, due, state, reps, lapses)
						VALUES (${studentId}::uuid, ${tenantId}::uuid, ${concept.marketA}::uuid,
							1.0, 5.0, now(), 'new', 0, 0)`);
				}),
			).rejects.toThrow();
		});

		it("app_student MA SELECT na review_states i widzi WYŁĄCZNIE własne wiersze (RLS student_sees_own)", async () => {
			vi.stubEnv("FLAG_SPACED_REPETITION", "1");
			// Zasiej realnie (owner-side) przez zdany egzamin.
			await POST(req(), ctx(await freshSession(moduleWithConcepts, `${PREFIX}mod-full`, "pass")));
			expect(await reviewStatesCount()).toBe(4);

			const seen = await db.transaction(async (tx: unknown) => {
				// biome-ignore lint/suspicious/noExplicitAny: tx dynamiczne w teście.
				const t = tx as any;
				await t.execute(sql`SELECT set_config('app.current_user_id', ${USER}, true)`);
				await t.execute(sql`SET LOCAL ROLE app_student`);
				return t.execute(sql`SELECT DISTINCT student_id FROM review_states`);
			});
			// Widzi swoje wiersze (grant SELECT działa) i tylko swoje (RLS).
			expect(seen.rows.length).toBe(1);
			expect(seen.rows[0].student_id).toBe(studentId);
		});
	});
});
