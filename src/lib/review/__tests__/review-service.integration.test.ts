// @vitest-environment node
//
// 1E.4 (SLICE R3) — BRAMKA QA warstwy serwisowej powtórek FSRS na ŻYWEJ bazie
// (:5433, NIE prod NEON, NIE atrapy). To warstwa ZAPISU: transakcyjność, blokada
// wiersza (FOR UPDATE), idempotencja (ON CONFLICT DO NOTHING) i izolacja najemcy
// przez JAWNY filtr student_id da się udowodnić TYLKO na realnym Postgresie —
// atrapa DB świeci na zielono, a realnie pęka rollback/lock/constraint. Testy
// stoją PRZED R4 (API na tym serwisie); pęknięcie tu = BLOCKER przed merge.
//
// Kontrakty (z zadania Ethana/Leo):
//   1. recordReview — UPDATE review_states + INSERT review_logs ATOMOWE (oba albo
//      żaden). Wymuszamy FK-violation w INSERT logu spreparowanym question_item_id
//      i asertujemy, że review_states TEŻ się wycofało (ślad audytowy nie rozjedzie
//      się ze stanem). Udowodnione mutacją (patrz raport Quinn).
//   2. enrollConcept — idempotentny: podwójny/potrójny zasiew tej samej pary
//      (student, concept) = DOKŁADNIE jeden wiersz; stan z 1. zasiewu NIE nadpisany
//      (DO NOTHING, nie DO UPDATE — zmiana stanu między zasiewami przeżywa).
//      Udowodnione mutacją.
//   3. getDueQueue — izolacja cross-tenant: student A NIGDY nie widzi wierszy B
//      (filtr student_id, nie samo due) — nawet w innym tenancie.
//   4. recordReview — FOR UPDATE: dwie równoległe oceny tej samej pary SERIALIZUJĄ
//      się, brak lost-update (reps/lapses spójne, dwa wiersze review_logs).
//   5. recordReview na niezasianym koncepcie → ConceptNotScheduledError (nie 500).
//   6. getDueQueue — semantyka: tylko due<=now, porządek due ASC → conceptId ASC,
//      limit respektowany.
//
// Wzorzec fixture/guard jak reconcile-verified.integration.test.ts + review-rls
// (R1). Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0042).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "q-1e4-r3";
// UUID poprawny składniowo, którego GWARANTOWANIE nie ma w question_items — wymusza
// FK-violation (23503) na INSERT review_logs (test atomowości).
const FAKE_QUESTION_ITEM_ID = "00000000-0000-0000-0000-0000000000ff";

// Drizzle owija błąd Postgresa; realna przyczyna (foreign key / duplicate key)
// siedzi w łańcuchu .cause — chodzimy po całym łańcuchu (jak pg-error.ts / R1).
function chainMatches(err: unknown, re: RegExp): boolean {
	for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
		if (re.test(String((e as Error).message ?? e))) return true;
	}
	return false;
}
const isForeignKeyViolation = (err: unknown) =>
	chainMatches(err, /foreign key|violates foreign key|23503/i);

interface StateRow {
	stability: number;
	difficulty: number;
	due: string;
	last_review: string | null;
	state: string;
	reps: number;
	lapses: number;
	updated_at: string;
}

dBack("1E.4 R3 · review-service — warstwa zapisu powtórek FSRS (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let svc: typeof import("../review-service");

	let tenant1 = "";
	let tenant2 = "";
	let qiValid = ""; // realny question_item (poprawny FK w happy-path recordReview)
	const student: Record<string, string> = {}; // klucz → student_id
	const concept: Record<string, string> = {}; // klucz → concept_id

	async function cleanup() {
		// review_states/review_logs znikną CASCADE przy studentach; kasujemy jawnie
		// dla czystego startu, potem studentów, koncepty (CASCADE zabiera items), tenanty.
		await db.execute(sql`DELETE FROM review_logs WHERE student_id IN
			(SELECT id FROM students WHERE user_id LIKE ${`${MARKER}%`})`);
		await db.execute(sql`DELETE FROM review_states WHERE student_id IN
			(SELECT id FROM students WHERE user_id LIKE ${`${MARKER}%`})`);
		await db.execute(sql`DELETE FROM students WHERE user_id LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM "user" WHERE id LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${MARKER}%`}`);
		await db.execute(sql`DELETE FROM tenants WHERE slug LIKE ${`${MARKER}%`}`);
	}

	async function mkTenant(slug: string): Promise<string> {
		const r = await db.execute(
			sql`INSERT INTO tenants (slug, name) VALUES (${slug}, ${slug}) RETURNING id`,
		);
		return (r.rows[0] as { id: string }).id;
	}

	async function mkStudent(key: string, tenantId: string): Promise<string> {
		const userId = `${MARKER}-${key}`;
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
		return (r.rows[0] as { id: string }).id;
	}

	async function stateRow(sid: string, cid: string): Promise<StateRow | undefined> {
		const r = await db.execute(
			sql`SELECT stability, difficulty, due, last_review, state, reps, lapses, updated_at
			    FROM review_states WHERE student_id = ${sid}::uuid AND concept_id = ${cid}::uuid`,
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

	async function stateCount(sid: string, cid: string): Promise<number> {
		const r = await db.execute(
			sql`SELECT count(*)::int AS c FROM review_states
			    WHERE student_id = ${sid}::uuid AND concept_id = ${cid}::uuid`,
		);
		return (r.rows[0] as { c: number }).c;
	}

	async function setDue(sid: string, cid: string, due: Date): Promise<void> {
		await db.execute(
			sql`UPDATE review_states SET due = ${due.toISOString()}
			    WHERE student_id = ${sid}::uuid AND concept_id = ${cid}::uuid`,
		);
	}

	const goodInput = (questionItemId: string) => ({
		questionItemId,
		isCorrect: true,
		confidence: 2,
		hintDepth: 0,
	});

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		svc = await import("../review-service");
		await cleanup();

		tenant1 = await mkTenant(`${MARKER}-t1`);
		tenant2 = await mkTenant(`${MARKER}-t2`);

		// Studenci: sQueue/sTx w tenant1, sA w tenant1, sB w tenant2 (cross-tenant).
		student.sQueue = await mkStudent("s-queue", tenant1);
		student.sTx = await mkStudent("s-tx", tenant1);
		student.sA = await mkStudent("s-a", tenant1);
		student.sB = await mkStudent("s-b", tenant2);

		// Realny question_item pod dowolnym konceptem — poprawny FK dla review_logs
		// w happy-path/concurrency (izoluje FK-fail testu atomowości od reszty).
		concept.qiHost = await mkConcept("qi-host");
		const qi = await db.execute(
			sql`INSERT INTO question_items (concept_id, difficulty, type, stem, answer_json)
			    VALUES (${concept.qiHost}::uuid, 1, 'single_choice', 'stem', '{"correct":0}'::jsonb)
			    RETURNING id`,
		);
		qiValid = (qi.rows[0] as { id: string }).id;

		// Koncepty per grupa testów (dedykowane, żeby uq(student,concept) nie kolidował).
		for (const key of [
			"queue-early",
			"queue-late",
			"queue-tie-a",
			"queue-tie-b",
			"queue-future",
			"iso-onlyA",
			"iso-onlyB",
			"iso-shared",
			"atom",
			"idem",
			"idem-state",
			"happy",
			"conc",
			"unsched",
		]) {
			concept[key] = await mkConcept(key);
		}
	});

	afterAll(async () => {
		if (db) await cleanup();
	});

	// ─── Kontrakt 6: getDueQueue — semantyka due<=now, porządek, limit ─────────
	describe("getDueQueue — semantyka kolejki (due<=now, due ASC → conceptId ASC, limit)", () => {
		const NOW = new Date("2026-05-01T12:00:00.000Z");

		beforeAll(async () => {
			// Zasiew + ręczne przestawienie due (enrollConcept ustawia due=now zasiewu).
			for (const key of [
				"queue-early",
				"queue-late",
				"queue-tie-a",
				"queue-tie-b",
				"queue-future",
			]) {
				await svc.enrollConcept(student.sQueue, concept[key], NOW);
			}
			await setDue(student.sQueue, concept["queue-early"], new Date(NOW.getTime() - 20 * 60_000));
			await setDue(student.sQueue, concept["queue-late"], new Date(NOW.getTime() - 5 * 60_000));
			// Dwie karty z IDENTYCZNYM due — tie-break MUSI iść po conceptId ASC.
			const tie = new Date(NOW.getTime() - 10 * 60_000);
			await setDue(student.sQueue, concept["queue-tie-a"], tie);
			await setDue(student.sQueue, concept["queue-tie-b"], tie);
			// Przyszłe due — MUSI zniknąć z kolejki „na dziś".
			await setDue(student.sQueue, concept["queue-future"], new Date(NOW.getTime() + 30 * 60_000));
		});

		it("zwraca tylko due<=now (przyszłe due wykluczone) w porządku due ASC, conceptId ASC", async () => {
			const q = await svc.getDueQueue(student.sQueue, NOW, 10);
			const ids = q.map((e) => e.conceptId);
			// Oczekiwany porządek: early(-20) < tie(-10)×2 < late(-5); tie po conceptId ASC.
			const [tieMin, tieMax] = [concept["queue-tie-a"], concept["queue-tie-b"]].sort();
			expect(ids).toEqual([concept["queue-early"], tieMin, tieMax, concept["queue-late"]]);
			// Przyszła karta nieobecna.
			expect(ids).not.toContain(concept["queue-future"]);
		});

		it("respektuje limit (bierze najpilniejsze wg tego samego porządku)", async () => {
			const q = await svc.getDueQueue(student.sQueue, NOW, 2);
			const [tieMin] = [concept["queue-tie-a"], concept["queue-tie-b"]].sort();
			expect(q.map((e) => e.conceptId)).toEqual([concept["queue-early"], tieMin]);
		});
	});

	// ─── Kontrakt 3: getDueQueue — izolacja cross-tenant (filtr student_id) ────
	describe("getDueQueue — izolacja cross-tenant (student A nigdy nie widzi wierszy B)", () => {
		const NOW = new Date("2026-05-02T12:00:00.000Z");

		beforeAll(async () => {
			// A (tenant1) na onlyA + shared; B (tenant2) na onlyB + shared — wszystkie due<=now.
			await svc.enrollConcept(student.sA, concept["iso-onlyA"], NOW);
			await svc.enrollConcept(student.sA, concept["iso-shared"], NOW);
			await svc.enrollConcept(student.sB, concept["iso-onlyB"], NOW);
			await svc.enrollConcept(student.sB, concept["iso-shared"], NOW);
		});

		it("getDueQueue(A) zwraca WYŁĄCZNIE koncepty A — wiersz B (nawet due<=now) nie przecieka", async () => {
			const qA = new Set((await svc.getDueQueue(student.sA, NOW, 50)).map((e) => e.conceptId));
			expect(qA.has(concept["iso-onlyA"])).toBe(true);
			expect(qA.has(concept["iso-shared"])).toBe(true);
			// Sedno: koncept, na który zapisany jest TYLKO B (a jest due<=now), NIE wpada
			// do kolejki A — dowód, że filtr to student_id, nie samo due.
			expect(qA.has(concept["iso-onlyB"])).toBe(false);
		});

		it("symetria: getDueQueue(B) zwraca WYŁĄCZNIE koncepty B — onlyA nieobecny", async () => {
			const qB = new Set((await svc.getDueQueue(student.sB, NOW, 50)).map((e) => e.conceptId));
			expect(qB.has(concept["iso-onlyB"])).toBe(true);
			expect(qB.has(concept["iso-shared"])).toBe(true);
			expect(qB.has(concept["iso-onlyA"])).toBe(false);
		});
	});

	// ─── Kontrakt 1: recordReview — ATOMOWOŚĆ (UPDATE stanu + INSERT logu) ─────
	describe("recordReview — atomowość transakcji (oba zapisy albo żaden)", () => {
		const NOW = new Date("2026-05-03T12:00:00.000Z");

		it("FK-fail w INSERT review_logs WYCOFUJE też UPDATE review_states (rollback całości)", async () => {
			await svc.enrollConcept(student.sTx, concept.atom, NOW);
			const before = await stateRow(student.sTx, concept.atom);
			expect(before?.state).toBe("new");
			expect(before?.reps).toBe(0);

			// question_item_id nie istnieje → INSERT review_logs pada na FK PO tym, jak
			// UPDATE review_states już poszedł w tej samej transakcji. Atomowo → rollback.
			await expect(
				svc.recordReview(student.sTx, concept.atom, goodInput(FAKE_QUESTION_ITEM_ID), NOW),
			).rejects.toSatisfy(isForeignKeyViolation);

			const after = await stateRow(student.sTx, concept.atom);
			// Stan NIETKNIĘTY — dokładnie jak przed próbą (reps, state, due, updated_at).
			expect(after?.state).toBe("new");
			expect(after?.reps).toBe(0);
			expect(after?.due).toBe(before?.due);
			expect(after?.updated_at).toBe(before?.updated_at);
			// Zero logów — ślad audytowy nie rozjechał się ze stanem.
			expect(await logCount(student.sTx, concept.atom)).toBe(0);
		});
	});

	// ─── Kontrakt 2: enrollConcept — IDEMPOTENCJA (ON CONFLICT DO NOTHING) ─────
	describe("enrollConcept — idempotencja zasiewu (DO NOTHING, nie DO UPDATE)", () => {
		const NOW = new Date("2026-05-04T12:00:00.000Z");

		it("podwójny i potrójny zasiew tej samej pary → DOKŁADNIE jeden wiersz", async () => {
			const r1 = await svc.enrollConcept(student.sTx, concept.idem, NOW);
			const r2 = await svc.enrollConcept(student.sTx, concept.idem, NOW);
			const r3 = await svc.enrollConcept(student.sTx, concept.idem, NOW);
			expect(r1.enrolled).toBe(true); // pierwszy tworzy wiersz
			expect(r2.enrolled).toBe(false); // konflikt — no-op
			expect(r3.enrolled).toBe(false); // konflikt — no-op
			expect(await stateCount(student.sTx, concept.idem)).toBe(1);
		});

		it("powtórny zasiew NIE nadpisuje wypracowanego stanu (DO NOTHING zachowuje S/D/due/reps)", async () => {
			await svc.enrollConcept(student.sTx, concept["idem-state"], NOW);
			// Zmiana stanu między zasiewami: realna ocena przesuwa 'new' → 'review', reps 0→1.
			await svc.recordReview(student.sTx, concept["idem-state"], goodInput(qiValid), NOW);
			const mid = await stateRow(student.sTx, concept["idem-state"]);
			expect(mid?.state).toBe("review");
			expect(mid?.reps).toBe(1);

			// Powtórny zasiew — MUSI być no-op, NIE reset do initCard('new', reps 0).
			const again = await svc.enrollConcept(student.sTx, concept["idem-state"], NOW);
			expect(again.enrolled).toBe(false);
			const after = await stateRow(student.sTx, concept["idem-state"]);
			expect(after?.state).toBe("review"); // NIE 'new'
			expect(after?.reps).toBe(1); // NIE 0
			expect(after?.stability).toBe(mid?.stability); // S nietknięte
			expect(after?.due).toBe(mid?.due); // due nietknięte
		});
	});

	// ─── Kontrakt 5: recordReview na niezasianym koncepcie → błąd domenowy ────
	describe("recordReview — koncept poza harmonogramem", () => {
		const NOW = new Date("2026-05-05T12:00:00.000Z");

		it("rzuca ConceptNotScheduledError (nie 500/ciche 0) i NIE tworzy wiersza w locie", async () => {
			await expect(
				svc.recordReview(student.sTx, concept.unsched, goodInput(qiValid), NOW),
			).rejects.toBeInstanceOf(svc.ConceptNotScheduledError);
			// Brak stanu i brak logu — recordReview nie zasiewa w locie.
			expect(await stateCount(student.sTx, concept.unsched)).toBe(0);
			expect(await logCount(student.sTx, concept.unsched)).toBe(0);
		});
	});

	// ─── Kontrakt 4: recordReview — FOR UPDATE (współbieżność, brak lost-update) ─
	describe("recordReview — współbieżność (FOR UPDATE serializuje, brak lost-update)", () => {
		const NOW = new Date("2026-05-06T12:00:00.000Z");

		it("happy-path pojedynczej oceny: stan przesunięty, jeden log", async () => {
			await svc.enrollConcept(student.sTx, concept.happy, NOW);
			const res = await svc.recordReview(student.sTx, concept.happy, goodInput(qiValid), NOW);
			expect(res.isCorrect).toBe(true);
			expect(res.nextDue.getTime()).toBeGreaterThan(NOW.getTime()); // termin w przyszłość
			const st = await stateRow(student.sTx, concept.happy);
			expect(st?.state).toBe("review");
			expect(st?.reps).toBe(1);
			expect(await logCount(student.sTx, concept.happy)).toBe(1);
		});

		it("dwie RÓWNOLEGŁE oceny tej samej pary serializują się: reps=2, dwa logi, brak nadpisania", async () => {
			await svc.enrollConcept(student.sTx, concept.conc, NOW);
			// Realna równoległość — dwie transakcje na tym samym wierszu naraz.
			const [a, b] = await Promise.allSettled([
				svc.recordReview(student.sTx, concept.conc, goodInput(qiValid), NOW),
				svc.recordReview(student.sTx, concept.conc, goodInput(qiValid), NOW),
			]);
			expect(a.status).toBe("fulfilled");
			expect(b.status).toBe("fulfilled");

			const st = await stateRow(student.sTx, concept.conc);
			// Gdyby brakło FOR UPDATE: obie czytają reps=0/'new' → obie zapisują reps=1
			// (lost update). Serializacja daje reps=2 — druga nałożyła się na stan pierwszej.
			expect(st?.reps).toBe(2);
			expect(await logCount(student.sTx, concept.conc)).toBe(2);

			// Dowód „druga widziała stan po pierwszej": jeden log ma state_before='new'
			// (pierwsza ocena), drugi 'review' (druga ocena na już-przesuniętej karcie).
			const logs = await db.execute(
				sql`SELECT state_before FROM review_logs
				    WHERE student_id = ${student.sTx}::uuid AND concept_id = ${concept.conc}::uuid`,
			);
			const before = new Set((logs.rows as { state_before: string }[]).map((r) => r.state_before));
			expect(before).toEqual(new Set(["new", "review"]));
		});
	});
});
