// @vitest-environment node
//
// 1E.3 (ADR-014 D3) W2 — KONTRAKT TRAS /api/exam/* NA ŻYWEJ BAZIE (Quinn/QA).
// Bramka flag-enable W2: unit dowodzi silnika (plan/grade), ale NIE dowodzi, że
// realny endpoint egzekwuje izolację per-student, partial-unique aktywnej sesji
// (0041), kolejność liniową i idempotencję complete na PRAWDZIWYM Postgresie.
// Ten test domyka lukę „zielony unit ≠ działający endpoint" — to, co dotąd było
// tylko z przeglądu kodu (RLS/izolacja/partial-unique), tu biegnie na :5433.
//
// Sterowalność banku (wzorzec assessment-flow): WSZYSTKIE warianty każdego slotu
// mają ten sam klucz (correct=0). Dzięki temu `selected:0` = poprawna, `selected:1`
// = błędna DETERMINISTYCZNIE, niezależnie od tego, który wariant A/B wylosował
// plan (klucz nigdy nie opuszcza serwera — sterujemy przez wspólny klucz, nie
// przez podglądanie planu).
//
// Bank SYNTETYCZNY (prefiks `qw2-`) — zero zależności od realnego banku Sophii.
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (schemat ≥ 0041).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// Sesja Better Auth mockowana — integracja dowodzi warstwy DB/tras, nie logowania.
// mockGetSession zwraca aktualnie „zalogowanego" użytkownika (przełączany w teście
// izolacji A↔B).
const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: () => mockGetSession() } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const USER_A = "u-w2-exam-a";
const USER_B = "u-w2-exam-b";
const PREFIX = "qw2-"; // slug-owy namespace testu (sprzątany LIKE-iem)
const Q_COUNT = 15;
const MAX_ERRORS = 1;

function startReq(moduleId: string): Request {
	return new Request("http://test.local/api/exam/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ moduleId }),
	});
}

function answerReq(slotRef: string, selected: number): Request {
	return new Request("http://test.local/api/exam/x/answer", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ slotRef, answer: { selected } }),
	});
}

function completeReq(): Request {
	return new Request("http://test.local/api/exam/x/complete", { method: "POST" });
}

function ctxFor(id: string) {
	return { params: Promise.resolve({ id }) };
}

/** Guard granicy bezpieczeństwa: żadna odpowiedź trasy nie niesie klucza/werdyktu w trakcie. */
function assertNoKeyLeak(payload: unknown) {
	const raw = JSON.stringify(payload);
	expect(raw).not.toContain("answerJson");
	expect(raw).not.toContain('"correct"');
	expect(raw).not.toContain("isCorrect");
	expect(raw).not.toContain("feedbackMd");
}

dBack("W2 · kontrakt tras /api/exam/* na żywej bazie (izolacja, partial-unique, kolejność)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let startPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let answerPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let completePOST: any;

	let tenantId = "";
	let studentAId = "";
	let moduleAId = "";
	let moduleBId = "";

	async function cleanup() {
		await db.execute(
			sql`DELETE FROM assessment_answers WHERE student_id IN (SELECT id FROM students WHERE user_id IN (${USER_A}, ${USER_B}))`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id IN (${USER_A}, ${USER_B}))`,
		);
		await db.execute(sql`DELETE FROM students WHERE user_id IN (${USER_A}, ${USER_B})`);
		await db.execute(sql`DELETE FROM "user" WHERE id IN (${USER_A}, ${USER_B})`);
		// Moduły kaskadują curriculum_module_items; koncepty kaskadują question_items
		// (answers usunięte wyżej, więc FK question_item_id już nie trzyma).
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	/** Reset stanu sesji/odpowiedzi studentów testowych — czysty start ciężkich przepływów. */
	async function resetSessions() {
		await db.execute(
			sql`DELETE FROM assessment_answers WHERE student_id IN (SELECT id FROM students WHERE user_id IN (${USER_A}, ${USER_B}))`,
		);
		await db.execute(
			sql`DELETE FROM assessment_sessions WHERE student_id IN (SELECT id FROM students WHERE user_id IN (${USER_A}, ${USER_B}))`,
		);
	}

	/**
	 * Syntetyczny moduł egzaminacyjny: curriculum_modules + examConfigJson +
	 * 15 slotów (E1..E15) × 2 warianty A/B + koncept per slot + pozycja exam
	 * z config_json.examSlots (UUID pytań). WSZYSTKIE warianty: correct=0.
	 */
	async function seedExamModule(suffix: string): Promise<string> {
		const moduleSlug = `${PREFIX}${suffix}`;
		const [module] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: moduleSlug,
				title: `Egzamin ${suffix}`,
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });

		const examSlots: {
			slotRef: string;
			conceptSlug: string;
			variants: { ref: string; variant: string; itemId: string }[];
		}[] = [];

		for (let i = 1; i <= Q_COUNT; i++) {
			const conceptSlug = `${PREFIX}${suffix}-c${i}`;
			const [concept] = await db
				.insert(schema.questionConcepts)
				.values({ slug: conceptSlug, name: `Koncept ${suffix} ${i}`, trunk: "foundations" })
				.returning({ id: schema.questionConcepts.id });

			const variants: { ref: string; variant: string; itemId: string }[] = [];
			for (const label of ["A", "B"]) {
				const [item] = await db
					.insert(schema.questionItems)
					.values({
						conceptId: concept.id,
						difficulty: 1,
						type: "single_choice",
						stem: `[${suffix}/e${i}/${label}] Pytanie ${i} — wskaż poprawną.`,
						optionsJson: ["Odpowiedź 0", "Odpowiedź 1", "Odpowiedź 2"],
						answerJson: { correct: 0 },
					})
					.returning({ id: schema.questionItems.id });
				variants.push({
					ref: `${suffix}-e${i}-${label.toLowerCase()}`,
					variant: label,
					itemId: item.id,
				});
			}
			examSlots.push({ slotRef: `e${i}`, conceptSlug, variants });
		}

		await db.insert(schema.curriculumModuleItems).values({
			moduleId: module.id,
			slug: `${PREFIX}${suffix}-exam`,
			position: 1,
			kind: "exam",
			title: "Egzamin modułu",
			configJson: { examSlots },
		});
		return module.id;
	}

	/**
	 * Przejście całego egzaminu przez trasę answer, sterowane pozycjami błędnymi.
	 * Każde `answer`: 200 + brak wycieku klucza/werdyktu. Zwraca ostatnie ciało
	 * (done=true, question=null). Kolejność bierze z serwera (question.slotRef).
	 */
	async function runExam(
		sessionId: string,
		firstQuestion: { slotRef: string; position: number },
		wrongPositions: Set<number>,
	) {
		let q: { slotRef: string; position: number } | null = firstQuestion;
		let last: { accepted: boolean; done: boolean; question: unknown } | null = null;
		while (q) {
			const selected = wrongPositions.has(q.position) ? 1 : 0; // 0 = poprawna
			const res: Response = await answerPOST(answerReq(q.slotRef, selected), ctxFor(sessionId));
			expect(res.status).toBe(200);
			const body: {
				accepted: boolean;
				done: boolean;
				question: { slotRef: string; position: number } | null;
			} = await res.json();
			assertNoKeyLeak(body);
			last = body;
			q = body.question;
		}
		return last;
	}

	beforeAll(async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "1");
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST: startPOST } = await import("../start/route"));
		({ POST: answerPOST } = await import("../[id]/answer/route"));
		({ POST: completePOST } = await import("../[id]/complete/route"));
		await cleanup();

		const [tenant] = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(1);
		tenantId = tenant.id;

		for (const [uid, name] of [
			[USER_A, "W2 Exam A"],
			[USER_B, "W2 Exam B"],
		]) {
			await db.execute(
				sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
				    VALUES (${uid}, ${name}, ${`${uid}@test.local`}, true, now(), now())`,
			);
		}
		const [sa] = await db
			.insert(schema.students)
			.values({
				userId: USER_A,
				tenantId,
				university: "Testowa",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "W2 Exam",
				syllabusText: "",
				onboardingStep: 3,
			})
			.returning({ id: schema.students.id });
		studentAId = sa.id;
		// Student B: rekord potrzebny, by getStudentByUserId(B) zwróciło studenta
		// (izolacja rozstrzyga się na meta.studentId !== student.id, nie na braku studenta).
		await db.insert(schema.students).values({
			userId: USER_B,
			tenantId,
			university: "Testowa",
			fieldOfStudy: "Informatyka",
			semester: 4,
			careerGoal: "W2 Exam",
			syllabusText: "",
			onboardingStep: 3,
		});

		moduleAId = await seedExamModule("mod-a");
		// Moduł B: pełny bank NIEpotrzebny do testu partial-unique (insert wprost),
		// ale musi istnieć jako wiersz modułu (FK module_id).
		const [mb] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: `${PREFIX}mod-b`,
				title: "Egzamin mod-b",
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });
		moduleBId = mb.id;

		mockGetSession.mockResolvedValue({ user: { id: USER_A } });
	}, 60_000);

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (db) await cleanup();
	});

	beforeEach(() => {
		// Domyślnie „zalogowany" student A; testy izolacji przełączają jawnie.
		mockGetSession.mockResolvedValue({ user: { id: USER_A } });
	});

	// ── PUNKT 6: werdykt e2e (zdał ≤1 błąd) ──────────────────────────────────
	it("[6] pełny przepływ zdany: start → 15× answer (1 błąd) → complete passed=true, sesja completed, result_json", async () => {
		await resetSessions();
		const startRes = await startPOST(startReq(moduleAId));
		expect(startRes.status).toBe(201);
		const started = await startRes.json();
		assertNoKeyLeak(started);
		expect(started.resumed).toBe(false);
		expect(started.attempt).toBe(1);
		expect(started.total).toBe(Q_COUNT);
		expect(started.question.slotRef).toBe("e1");
		expect(started.question.position).toBe(0);
		expect(started.question.options).toHaveLength(3);

		const sessionId = started.sessionId as string;
		// Dokładnie 1 błąd (pozycja 4) → errorCount=1 ≤ maxErrors=1 → zdany (granica ≤1).
		const last = await runExam(sessionId, started.question, new Set([4]));
		expect(last?.done).toBe(true);
		expect(last?.question).toBeNull();

		const completeRes = await completePOST(completeReq(), ctxFor(sessionId));
		expect(completeRes.status).toBe(200);
		const completed = await completeRes.json();
		expect(completed.completed).toBe(true);
		expect(completed.result.passed).toBe(true);
		expect(completed.result.errorCount).toBe(1);
		expect(completed.result.correctivesPackage).toBeUndefined();

		const [row] = await db
			.execute(
				sql`SELECT status, kind, result_json ->> 'passed' AS passed
				    FROM assessment_sessions WHERE id = ${sessionId}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(row).toEqual({ status: "completed", kind: "module_exam", passed: "true" });

		// Idempotencja: drugi complete → 409 (werdykt zapisany raz).
		const second = await completePOST(completeReq(), ctxFor(sessionId));
		expect(second.status).toBe(409);
	});

	// ── PUNKT 6: oblany 2× → correctivesPackage w odpowiedzi ──────────────────
	it("[6] oblany po cap 2: podejście 1 fail → podejście 2 fail → correctivesPackage w result", async () => {
		await resetSessions();
		// Podejście 1: 2 błędy (pozycje 3,9) → errorCount=2 > 1 → oblany, correctives=false.
		const s1 = await (await startPOST(startReq(moduleAId))).json();
		expect(s1.attempt).toBe(1);
		await runExam(s1.sessionId, s1.question, new Set([3, 9]));
		const c1 = await (await completePOST(completeReq(), ctxFor(s1.sessionId))).json();
		expect(c1.result.passed).toBe(false);
		expect(c1.result.correctives).toBe(false);
		expect(c1.result.correctivesPackage).toBeUndefined();

		// Podejście 2: start ponownie → attempt=2 (1 prior failed completed). Oblany
		// → correctives=true → paczka remediacji w result_json.
		const startRes2 = await startPOST(startReq(moduleAId));
		expect(startRes2.status).toBe(201);
		const s2 = await startRes2.json();
		expect(s2.attempt).toBe(2);
		expect(s2.sessionId).not.toBe(s1.sessionId);
		await runExam(s2.sessionId, s2.question, new Set([3, 9]));
		const c2Res = await completePOST(completeReq(), ctxFor(s2.sessionId));
		expect(c2Res.status).toBe(200);
		const c2 = await c2Res.json();
		expect(c2.result.passed).toBe(false);
		expect(c2.result.correctives).toBe(true);
		expect(c2.result.correctivesPackage).toBeDefined();
		expect(c2.result.correctivesPackage.concepts.length).toBeGreaterThan(0);
		// Paczka niesie nazwy konceptów (koncept↔atom owner-side), zero klucza.
		expect(JSON.stringify(c2.result.correctivesPackage)).not.toContain('"correct"');
	});

	// ── P5 e2e: pełny cykl 423 → correctives (częściowe/pełne) → reset (Quinn/QA) ─
	// Domyka lukę „zielony unit ≠ działający endpoint" dla ścieżki 423 (Ethan ją
	// nazwał). Rdzeń: /start w S-C zwraca 423 correctives_required + paczkę na REALNYM
	// endpointcie; correctives ODBYTE liczy backend z curriculum_item_answers (re-
	// ukończenie PO 2. oblaniu); reset przywraca podejście od 1 (świeży cykl).
	// Mutacja P1: correctives ODBYTE CZĘŚCIOWO (1 z 2 wymaganych atomów) → NADAL 423
	// (blokada trzyma, nie odblokowuje przy niepełnym odbyciu).
	//
	// Dedykowany moduł qw2-cyc: każdy koncept ma atom correctives (exercise) linkowany
	// przez curriculum_item_concepts + pytanie retrieval — dopiero to pozwala correctives
	// REALNIE odbyć (mod-a wyżej celowo ich nie ma → package z pustymi atomami).
	it("[P5] e2e 423: 2×fail → /start 423 correctives_required → 1/2 atomów NADAL 423 → 2/2 → /start 201 nowy cykl", async () => {
		await resetSessions();
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentAId}`);

		const CYC = `${PREFIX}cyc`;
		// Idempotencja przy powtórnym przebiegu: zdejmij ewentualne pozostałości.
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug = ${CYC}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${CYC}-%`}`);

		const [module] = await db
			.insert(schema.curriculumModules)
			.values({
				slug: CYC,
				title: "Egzamin cykl P5",
				examConfigJson: { questionCount: Q_COUNT, maxErrors: MAX_ERRORS },
			})
			.returning({ id: schema.curriculumModules.id });
		const cycModuleId = module.id as string;

		const examSlots: {
			slotRef: string;
			conceptSlug: string;
			variants: { ref: string; variant: string; itemId: string }[];
		}[] = [];
		const atomIdByConcept = new Map<string, string>();
		const retrievalQByConcept = new Map<string, string>();

		for (let i = 1; i <= Q_COUNT; i++) {
			const conceptSlug = `${CYC}-c${i}`;
			const [concept] = await db
				.insert(schema.questionConcepts)
				.values({ slug: conceptSlug, name: `Koncept cyc ${i}`, trunk: "foundations" })
				.returning({ id: schema.questionConcepts.id });

			const variants: { ref: string; variant: string; itemId: string }[] = [];
			for (const label of ["A", "B"]) {
				const [item] = await db
					.insert(schema.questionItems)
					.values({
						conceptId: concept.id,
						difficulty: 1,
						type: "single_choice",
						stem: `[cyc/e${i}/${label}] Pytanie ${i}`,
						optionsJson: ["Odpowiedź 0", "Odpowiedź 1", "Odpowiedź 2"],
						answerJson: { correct: 0 },
					})
					.returning({ id: schema.questionItems.id });
				variants.push({ ref: `cyc-e${i}-${label.toLowerCase()}`, variant: label, itemId: item.id });
			}
			examSlots.push({ slotRef: `e${i}`, conceptSlug, variants });

			// Atom correctives (exercise) uczący konceptu + pytanie retrieval do re-ukończenia.
			const [atom] = await db
				.insert(schema.curriculumModuleItems)
				.values({
					moduleId: cycModuleId,
					slug: `${CYC}-atom-${i}`,
					position: 100 + i,
					kind: "exercise",
					title: `Atom cyc ${i}`,
				})
				.returning({ id: schema.curriculumModuleItems.id });
			await db
				.insert(schema.curriculumItemConcepts)
				.values({ itemId: atom.id, conceptId: concept.id });
			const [rq] = await db
				.insert(schema.questionItems)
				.values({
					conceptId: concept.id,
					difficulty: 1,
					type: "single_choice",
					stem: `retrieval atomu ${i}`,
					optionsJson: ["a", "b"],
					answerJson: { correct: 0 },
				})
				.returning({ id: schema.questionItems.id });
			atomIdByConcept.set(conceptSlug, atom.id);
			retrievalQByConcept.set(conceptSlug, rq.id);
		}

		await db.insert(schema.curriculumModuleItems).values({
			moduleId: cycModuleId,
			slug: `${CYC}-exam`,
			position: 1,
			kind: "exam",
			title: "Egzamin modułu",
			configJson: { examSlots },
		});

		// Pozycje błędne {3,9} → sloty e4,e10 (orderedSlots sortuje e1..e15 numerycznie)
		// → 2 RÓŻNE koncepty → 2 wymagane atomy correctives.
		const wrong = new Set([3, 9]);

		// Podejście 1 (wariant A) → oblane, correctives=false.
		const s1 = await (await startPOST(startReq(cycModuleId))).json();
		expect(s1.attempt).toBe(1);
		await runExam(s1.sessionId, s1.question, wrong);
		const c1 = await (await completePOST(completeReq(), ctxFor(s1.sessionId))).json();
		expect(c1.result.passed).toBe(false);
		expect(c1.result.correctives).toBe(false);

		// Podejście 2 (wariant B) → oblane cap-2, correctives=true.
		const startRes2 = await startPOST(startReq(cycModuleId));
		expect(startRes2.status).toBe(201);
		const s2 = await startRes2.json();
		expect(s2.attempt).toBe(2);
		await runExam(s2.sessionId, s2.question, wrong);
		const c2 = await (await completePOST(completeReq(), ctxFor(s2.sessionId))).json();
		expect(c2.result.correctives).toBe(true);
		const failedConcepts = c2.result.failedConcepts as string[];
		expect(failedConcepts.length).toBe(2); // 2 różne koncepty (pozycje 3,9)

		// S-C: /start ODRZUCA 3. podejście stanem 423 correctives_required + paczka
		// (REALNY endpoint — nie unit; to jest domknięcie luki 423).
		const lockedRes = await startPOST(startReq(cycModuleId));
		expect(lockedRes.status).toBe(423);
		const locked = await lockedRes.json();
		expect(locked.state).toBe("correctives_required");
		expect(locked.correctivesPackage).toBeDefined();
		assertNoKeyLeak(locked);
		// ZERO nowej sesji w S-C (blokada twarda, nie wariant B w nieskończoność).
		const activeInSC = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM assessment_sessions
				    WHERE student_id = ${studentAId} AND module_id = ${cycModuleId} AND status = 'in_progress'`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(activeInSC).toBe(0);

		// completed_at 2. oblania = granica correctives; re-ukończenie MUSI być PO niej.
		const [{ completed_at: fail2At }] = await db
			.execute(sql`SELECT completed_at FROM assessment_sessions WHERE id = ${s2.sessionId}`)
			.then((r: { rows: { completed_at: string }[] }) => r.rows);
		const doneAt = new Date(new Date(fail2At).getTime() + 60_000);

		// MUTACJA P1 — correctives odbyte CZĘŚCIOWO (1 z 2 atomów): NADAL S-C (423).
		const [cA, cB] = failedConcepts;
		await db.insert(schema.curriculumItemAnswers).values({
			studentId: studentAId,
			tenantId,
			itemId: atomIdByConcept.get(cA),
			questionItemId: retrievalQByConcept.get(cA),
			isCorrect: true,
			hintDepth: 0,
			hintDepthSource: "server",
			answeredAt: doneAt,
		});
		const stillLocked = await startPOST(startReq(cycModuleId));
		expect(stillLocked.status).toBe(423); // 1/2 → correctives NIEODBYTE, blokada trzyma

		// Drugi (ostatni) wymagany atom → correctives ODBYTE w komplecie.
		await db.insert(schema.curriculumItemAnswers).values({
			studentId: studentAId,
			tenantId,
			itemId: atomIdByConcept.get(cB),
			questionItemId: retrievalQByConcept.get(cB),
			isCorrect: true,
			hintDepth: 0,
			hintDepthSource: "server",
			answeredAt: doneAt,
		});

		// S-D → /start 201: świeży cykl, podejście od 1 (cap zresetowany).
		const freshRes = await startPOST(startReq(cycModuleId));
		expect(freshRes.status).toBe(201);
		const fresh = await freshRes.json();
		expect(fresh.resumed).toBe(false);
		expect(fresh.attempt).toBe(1); // reset cyklu — nie clampAttempt(3)=2
		expect(fresh.question.position).toBe(0);

		// Sprzątanie własnych danych (moduł qw2-cyc zdejmie afterAll cleanup LIKE qw2-%).
		await db.execute(sql`DELETE FROM curriculum_item_answers WHERE student_id = ${studentAId}`);
	});

	// ── PUNKT 1: izolacja per-student ────────────────────────────────────────
	it("[1] izolacja: student B na sesji egzaminu studenta A → 404 (answer i complete), nie 403", async () => {
		await resetSessions();
		const started = await (await startPOST(startReq(moduleAId))).json();
		const sessionId = started.sessionId as string;
		expect(started.question.slotRef).toBe("e1");

		// Przełącz „zalogowanego" na studenta B.
		mockGetSession.mockResolvedValue({ user: { id: USER_B } });

		const bAnswer = await answerPOST(answerReq("e1", 0), ctxFor(sessionId));
		expect(bAnswer.status).toBe(404); // meta.studentId !== student.id
		const bComplete = await completePOST(completeReq(), ctxFor(sessionId));
		expect(bComplete.status).toBe(404);

		// Sesja A nietknięta — wciąż aktywna, bez ani jednej odpowiedzi.
		const [row] = await db
			.execute(
				sql`SELECT status,
				    (SELECT count(*)::int FROM assessment_answers WHERE session_id = ${sessionId}) AS answers
				    FROM assessment_sessions WHERE id = ${sessionId}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(row).toEqual({ status: "in_progress", answers: 0 });
	});

	// ── PUNKT 3: kolejność liniowa + unikalność pozycji ──────────────────────
	it("[3] kolejność: answer poza kolejnością (n+2) → 409; duplikat pozycji przez trasę → 409", async () => {
		await resetSessions();
		const started = await (await startPOST(startReq(moduleAId))).json();
		const sessionId = started.sessionId as string;
		expect(started.question.slotRef).toBe("e1"); // oczekiwana pozycja 0

		// Slot pozycji n+2 (e3) gdy oczekiwana e1 → 409 bez zapisu.
		const outOfOrder = await answerPOST(answerReq("e3", 0), ctxFor(sessionId));
		expect(outOfOrder.status).toBe(409);
		const stillZero = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM assessment_answers WHERE session_id = ${sessionId}`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(stillZero).toBe(0);

		// Poprawna e1 → przyjęta; powtórna e1 (ta sama pozycja) → 409 (funnel kolejności).
		const first = await answerPOST(answerReq("e1", 0), ctxFor(sessionId));
		expect(first.status).toBe(200);
		const dupe = await answerPOST(answerReq("e1", 0), ctxFor(sessionId));
		expect(dupe.status).toBe(409);
	});

	it("[3] uq_assessment_answers_session_position: bezpośredni duplikat (session_id, position) odrzucony przez bazę", async () => {
		await resetSessions();
		const started = await (await startPOST(startReq(moduleAId))).json();
		const sessionId = started.sessionId as string;
		// Jedna realna odpowiedź (pozycja 0) przez trasę.
		await answerPOST(answerReq("e1", 0), ctxFor(sessionId));
		// Wstawienie DRUGIEGO wiersza na tej samej pozycji wprost → unique violation
		// (ostatnia linia obrony przed wyścigiem, którego trasa broni FOR UPDATE).
		// Item INNY niż użyty na pozycji 0 — tak, by pęknąć mógł WYŁĄCZNIE
		// uq_assessment_answers_session_position, a nie uq_..._session_item.
		const [freshItem] = await db
			.execute(
				sql`SELECT id FROM question_items
				    WHERE id NOT IN (SELECT question_item_id FROM assessment_answers WHERE session_id = ${sessionId})
				    LIMIT 1`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		await expect(
			db.execute(
				sql`INSERT INTO assessment_answers (session_id, student_id, tenant_id, question_item_id, answer_json, is_correct, position)
				    VALUES (${sessionId}, ${studentAId}, ${tenantId}, ${freshItem.id}, '{"selected":0}'::jsonb, true, 0)`,
			),
		).rejects.toThrow();
	});

	// ── PUNKT 2: partial unique aktywnej sesji (0041, z module_id) ────────────
	it("[2] uq_assessment_sessions_active: druga aktywna sesja TEGO SAMEGO modułu odrzucona; moduł A + B równolegle OK", async () => {
		await resetSessions();
		// Aktywna sesja egzaminu modułu A.
		await db.execute(
			sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, module_id, input_hash, plan_json, status)
			    VALUES (${studentAId}, ${tenantId}, 'module_exam', ${moduleAId}, 'pu-a1', '{}'::jsonb, 'in_progress')`,
		);
		// Druga aktywna TEGO SAMEGO modułu → odrzucona (klucz student,kind,COALESCE(module_id)).
		await expect(
			db.execute(
				sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, module_id, input_hash, plan_json, status)
				    VALUES (${studentAId}, ${tenantId}, 'module_exam', ${moduleAId}, 'pu-a2', '{}'::jsonb, 'in_progress')`,
			),
		).rejects.toThrow();
		// Egzamin modułu B równolegle → OK (inny kubełek module_id).
		await db.execute(
			sql`INSERT INTO assessment_sessions (student_id, tenant_id, kind, module_id, input_hash, plan_json, status)
			    VALUES (${studentAId}, ${tenantId}, 'module_exam', ${moduleBId}, 'pu-b1', '{}'::jsonb, 'in_progress')`,
		);
		const active = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM assessment_sessions
				    WHERE student_id = ${studentAId} AND status = 'in_progress'`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(active).toBe(2); // A i B, nie dwa A
	});

	it("[2] wyścig startów tego samego modułu: równoległe starty → dokładnie 1 aktywna, żaden 500", async () => {
		await resetSessions();
		const [r1, r2] = await Promise.all([
			startPOST(startReq(moduleAId)),
			startPOST(startReq(moduleAId)),
		]);
		// Konstytutywny niezmiennik: partial-unique nie dopuszcza dwóch aktywnych
		// (jedna wygrywa insertem, druga dostaje 23505→409 albo wznawia).
		expect(r1.status).not.toBe(500);
		expect(r2.status).not.toBe(500);
		const active = await db
			.execute(
				sql`SELECT count(*)::int AS c FROM assessment_sessions
				    WHERE student_id = ${studentAId} AND module_id = ${moduleAId} AND status = 'in_progress'`,
			)
			.then((r: { rows: { c: number }[] }) => r.rows[0].c);
		expect(active).toBe(1);
	});

	// ── PUNKT 4: wznowienie / abandon ────────────────────────────────────────
	it("[4] wznowienie: ta sama aktywna sesja przy zgodnym inputHash → resume na ZAMROŻONYM planie z zachowanym postępem", async () => {
		await resetSessions();
		const first = await (await startPOST(startReq(moduleAId))).json();
		const sessionId = first.sessionId as string;
		// Odpowiedz na pierwsze 2 pytania (e1, e2).
		let q = first.question;
		for (let k = 0; k < 2; k++) {
			const res = await answerPOST(answerReq(q.slotRef, 0), ctxFor(sessionId));
			q = (await res.json()).question;
		}
		// Ponowny start tego modułu → wznowienie tej samej sesji, kolejne pytanie = e3 (poz. 2).
		const resumeRes = await startPOST(startReq(moduleAId));
		expect(resumeRes.status).toBe(200);
		const resumed = await resumeRes.json();
		expect(resumed.resumed).toBe(true);
		expect(resumed.sessionId).toBe(sessionId);
		expect(resumed.question.slotRef).toBe("e3");
		expect(resumed.question.position).toBe(2);
	});

	it("[4] TTL 7 dni: aktywna sesja starsza niż TTL → abandoned + nowa sesja", async () => {
		await resetSessions();
		const first = await (await startPOST(startReq(moduleAId))).json();
		const oldId = first.sessionId as string;
		// Cofnij started_at o 8 dni (poza TTL 7 dni) → wznowienie ma porzucić i wystawić nową.
		await db.execute(
			sql`UPDATE assessment_sessions SET started_at = now() - interval '8 days' WHERE id = ${oldId}`,
		);
		const res = await startPOST(startReq(moduleAId));
		expect(res.status).toBe(201);
		const fresh = await res.json();
		expect(fresh.resumed).toBe(false);
		expect(fresh.sessionId).not.toBe(oldId);
		const [old] = await db
			.execute(sql`SELECT status FROM assessment_sessions WHERE id = ${oldId}`)
			.then((r: { rows: { status: string }[] }) => r.rows);
		expect(old.status).toBe("abandoned");
	});

	it("[4] mismatch odcisku: aktywna sesja z niespójnym inputHash → abandoned + nowa (gałąź abandon)", async () => {
		await resetSessions();
		const first = await (await startPOST(startReq(moduleAId))).json();
		const oldId = first.sessionId as string;
		// Odcisk = sha256([module, attempt]); psujemy input_hash → mismatch z planem
		// → gałąź abandon (w egzaminie realny mismatch to zmiana podejścia; TTL to
		// organiczny trigger, tu dowodzimy samej gałęzi odrzucenia).
		await db.execute(
			sql`UPDATE assessment_sessions SET input_hash = 'zepsuty-odcisk' WHERE id = ${oldId}`,
		);
		const res = await startPOST(startReq(moduleAId));
		expect(res.status).toBe(201);
		const fresh = await res.json();
		expect(fresh.sessionId).not.toBe(oldId);
		const [old] = await db
			.execute(sql`SELECT status FROM assessment_sessions WHERE id = ${oldId}`)
			.then((r: { rows: { status: string }[] }) => r.rows);
		expect(old.status).toBe("abandoned");
	});

	// ── PUNKT 5: flaga OFF → 404 na wszystkich 3 trasach (przed auth/DB) ──────
	it("[5] flaga masteryGate OFF → 404 na start, answer i complete (trasa nie istnieje)", async () => {
		vi.stubEnv("FLAG_MASTERY_GATE", "0");
		try {
			const s = await startPOST(startReq(moduleAId));
			expect(s.status).toBe(404);
			const a = await answerPOST(
				answerReq("e1", 0),
				ctxFor("00000000-0000-0000-0000-000000000000"),
			);
			expect(a.status).toBe(404);
			const c = await completePOST(completeReq(), ctxFor("00000000-0000-0000-0000-000000000000"));
			expect(c.status).toBe(404);
		} finally {
			vi.stubEnv("FLAG_MASTERY_GATE", "1");
		}
	});
});
