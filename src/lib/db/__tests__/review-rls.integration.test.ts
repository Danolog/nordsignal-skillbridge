// @vitest-environment node
//
// 1E.4 (SLICE R1 — FUNDAMENT FSRS) — DoD NA REALNEJ BAZIE: kontrakt bezpieczeństwa
// tabel powtórek rozłożonych w czasie (migracja 0042). R1 to CZYSTY fundament:
// dwie tabele + RLS + CHECK-i + UNIQUE. API/logika = R2–R5. Ten test zamyka
// KONTRAKT, na którym staną wszystkie kolejne slice'y — pęknięcie tu jest blockerem.
//
//  • K-INT: student widzi WYŁĄCZNIE swoje wiersze review_states (RLS filtruje mimo
//    braku WHERE); wiersz obcego studenta = 0 rows, nie „nie w API".
//  • K-INT: app_student NIE zapisze review_states (grant TYLKO SELECT — INSERT/UPDATE
//    owner-side przez /api/review/* w R4).
//  • DENY: review_logs (append-only ślad ocen) — app_student ORAZ app_faculty NIE
//    czytają (zero grantów app_*). Klient nie czyta śladu audytowego.
//  • FORCE RLS aktywny na obu tabelach (owner podlega politykom — bez cichego bypassu).
//  • Bariery integralności: CHECK-i (enum stanu, difficulty 1–10, stability>0,
//    reps/lapses>=0; rating 1–4, elapsed/scheduled>=0) egzekwowane przez bazę.
//  • UNIQUE (student_id, concept_id) na review_states — fundament idempotentnego
//    upsertu w R3.
//
// Wzorzec RLS/DENY jak curriculum-rls.integration.test.ts (migracja 0035) —
// review_states = SELECT-own (jak curriculum_item_answers), review_logs = DENY.
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0042).

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER_A = "u-1e4-wlasciciel";
const USER_B = "u-1e4-obcy";

// Drizzle opakowuje błąd Postgresa („Failed query: …"), a realna przyczyna
// (`permission denied`, `violates check constraint`, `duplicate key`) ląduje
// w łańcuchu error.cause — chodzimy po całym łańcuchu, nie po samym message.
function chainMatches(err: unknown, re: RegExp): boolean {
	for (let e = err; e; e = (e as { cause?: unknown }).cause) {
		if (re.test(String((e as Error).message ?? e))) return true;
	}
	return false;
}
const isPermissionDenied = (err: unknown) => chainMatches(err, /permission denied/i);
// Mocniejsze niż gołe toThrow(): pilnujemy, że odrzuciła KONKRETNA bariera
// integralności (nazwa constraintu / duplicate key), nie przypadkowy błąd składni.
const violatesCheck = (name: string) => (err: unknown) =>
	chainMatches(err, new RegExp(`check constraint|${name}`, "i"));
const isUniqueViolation = (err: unknown) =>
	chainMatches(err, /duplicate key|unique constraint|uq_review_states_student_concept/i);

dBack("1E.4 R1 · FSRS: kontrakt bezpieczeństwa review_states + review_logs (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: tenant-context ładowany dynamicznie.
	let withTenantContext: any;

	let tenantId = "";
	let conceptId = "";
	const studentIds: Record<string, string> = {};

	// Owner-side INSERT review_states (jak zrobią trasy /api/review/* w R4).
	function insertStateOwner(sid: string, cid: string, over: Record<string, unknown> = {}) {
		const v = { stability: 2.5, difficulty: 5, state: "new", reps: 0, lapses: 0, ...over };
		return db.execute(
			sql`INSERT INTO review_states
			      (student_id, tenant_id, concept_id, stability, difficulty, due, state, reps, lapses)
			    VALUES (${sid}, ${tenantId}, ${cid}, ${v.stability}, ${v.difficulty}, now(),
			            ${v.state}, ${v.reps}, ${v.lapses})`,
		);
	}
	// Owner-side INSERT review_logs (append-only, R4).
	function insertLogOwner(sid: string, over: Record<string, unknown> = {}) {
		const v = {
			rating: 3,
			state_before: "new",
			stability_after: 3.1,
			difficulty_after: 5,
			elapsed_days: 0,
			scheduled_days: 1,
			...over,
		};
		return db.execute(
			sql`INSERT INTO review_logs
			      (student_id, tenant_id, concept_id, rating, state_before,
			       stability_after, difficulty_after, elapsed_days, scheduled_days)
			    VALUES (${sid}, ${tenantId}, ${conceptId}, ${v.rating}, ${v.state_before},
			            ${v.stability_after}, ${v.difficulty_after}, ${v.elapsed_days}, ${v.scheduled_days})`,
		);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ withTenantContext } = await import("@/lib/db/tenant-context"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e4', 'Tenant 1E.4')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		for (const userId of [USER_A, USER_B]) {
			await db.execute(
				sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
			);
			const [student] = await db
				.execute(
					sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${userId}, ${tenantId}, 'Test U', 'Informatyka', 3, 'data-science')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			studentIds[userId] = student.id;
		}

		const [concept] = await db
			.execute(
				sql`INSERT INTO question_concepts (slug, name, trunk)
			    VALUES ('t-1e4-koncept', 'Koncept testowy 1E.4', 'foundations')
			    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		conceptId = concept.id;

		// Dane OBU studentów owner-side (jak trasy R4). Czysty start dla idempotencji.
		await db.execute(sql`DELETE FROM review_logs WHERE tenant_id = ${tenantId}`);
		await db.execute(sql`DELETE FROM review_states WHERE tenant_id = ${tenantId}`);
		for (const userId of [USER_A, USER_B]) {
			await insertStateOwner(studentIds[userId], conceptId);
			await insertLogOwner(studentIds[userId]);
		}
	});

	// ─── 1. Izolacja studenta na review_states (K-INT) ────────────────────────
	it("RLS: student widzi WYŁĄCZNIE swój review_states — wiersz obcego = 0 rows", async () => {
		const seenByA = await withTenantContext(
			{ userId: USER_A, tenantId, role: "student" },
			// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
			async (tx: any) =>
				tx
					.execute(sql`SELECT student_id FROM review_states`)
					.then((r: { rows: { student_id: string }[] }) => r.rows),
		);
		// Widzi swój i TYLKO swój — B jest niewidoczny na poziomie bazy, nie API.
		expect(seenByA.length).toBe(1);
		expect(new Set(seenByA.map((r: { student_id: string }) => r.student_id))).toEqual(
			new Set([studentIds[USER_A]]),
		);
		expect(seenByA.some((r: { student_id: string }) => r.student_id === studentIds[USER_B])).toBe(
			false,
		);
	});

	it("RLS: obcy student (B) też widzi tylko swój wiersz — symetria izolacji", async () => {
		const seenByB = await withTenantContext(
			{ userId: USER_B, tenantId, role: "student" },
			// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
			async (tx: any) =>
				tx
					.execute(sql`SELECT student_id FROM review_states`)
					.then((r: { rows: { student_id: string }[] }) => r.rows),
		);
		expect(new Set(seenByB.map((r: { student_id: string }) => r.student_id))).toEqual(
			new Set([studentIds[USER_B]]),
		);
	});

	// ─── 2. review_states — brak zapisu przez app_student ─────────────────────
	it("DENY zapisu: app_student NIE zrobi INSERT review_states (grant TYLKO SELECT)", async () => {
		await expect(
			withTenantContext(
				{ userId: USER_A, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) =>
					tx.execute(
						sql`INSERT INTO review_states
						      (student_id, tenant_id, concept_id, stability, difficulty, due, state)
						    VALUES (${studentIds[USER_A]}, ${tenantId}, ${conceptId}, 2.5, 5, now(), 'new')`,
					),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("DENY zapisu: app_student NIE zrobi UPDATE review_states (grant TYLKO SELECT)", async () => {
		await expect(
			withTenantContext(
				{ userId: USER_A, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) =>
					tx.execute(
						sql`UPDATE review_states SET reps = reps + 1 WHERE student_id = ${studentIds[USER_A]}`,
					),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	// ─── 3. review_logs — pełny DENY (student + faculty) ──────────────────────
	it("DENY odczytu: app_student NIE czyta review_logs (zero grantów — ślad audytowy)", async () => {
		await expect(
			withTenantContext(
				{ userId: USER_A, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) => tx.execute(sql`SELECT id FROM review_logs`),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("DENY odczytu: app_faculty NIE czyta review_logs (zero grantów app_*)", async () => {
		await expect(
			withTenantContext(
				{ userId: "", tenantId, role: "faculty" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) => tx.execute(sql`SELECT id FROM review_logs`),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	// ─── 4. FORCE RLS aktywny na obu tabelach ─────────────────────────────────
	it("FORCE RLS włączony na review_states i review_logs (owner podlega politykom)", async () => {
		const rows = await db
			.execute(
				sql`SELECT relname, relrowsecurity, relforcerowsecurity
				    FROM pg_class
				    WHERE relname IN ('review_states', 'review_logs')
				    ORDER BY relname`,
			)
			.then(
				(r: {
					rows: { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[];
				}) => r.rows,
			);
		expect(rows.length).toBe(2);
		for (const row of rows) {
			expect(row.relrowsecurity).toBe(true);
			expect(row.relforcerowsecurity).toBe(true);
		}
	});

	// ─── 5. CHECK-i egzekwowane przez bazę ────────────────────────────────────
	it("CHECK: review_states odrzuca difficulty=11 (poza 1–10)", async () => {
		await expect(
			insertStateOwner(studentIds[USER_A], conceptId, { difficulty: 11 }),
		).rejects.toSatisfy(violatesCheck("review_states_difficulty_range"));
	});

	it("CHECK: review_states odrzuca stability=0 (musi > 0)", async () => {
		await expect(
			insertStateOwner(studentIds[USER_A], conceptId, { stability: 0 }),
		).rejects.toSatisfy(violatesCheck("review_states_stability_positive"));
	});

	it("CHECK: review_states odrzuca reps=-1 (musi >= 0)", async () => {
		await expect(insertStateOwner(studentIds[USER_A], conceptId, { reps: -1 })).rejects.toSatisfy(
			violatesCheck("review_states_reps_nonneg"),
		);
	});

	it("CHECK: review_states odrzuca state spoza enuma", async () => {
		await expect(
			insertStateOwner(studentIds[USER_A], conceptId, { state: "archived" }),
		).rejects.toSatisfy(violatesCheck("review_states_state_values"));
	});

	it("CHECK: review_logs odrzuca rating=5 (poza 1–4)", async () => {
		await expect(insertLogOwner(studentIds[USER_A], { rating: 5 })).rejects.toSatisfy(
			violatesCheck("review_logs_rating_range"),
		);
	});

	it("CHECK: review_logs odrzuca elapsed_days=-1 (musi >= 0)", async () => {
		await expect(insertLogOwner(studentIds[USER_A], { elapsed_days: -1 })).rejects.toSatisfy(
			violatesCheck("review_logs_elapsed_nonneg"),
		);
	});

	// ─── 6. UNIQUE (student_id, concept_id) na review_states ───────────────────
	it("UNIQUE: drugi INSERT review_states na tę samą parę (student, concept) łamie uq", async () => {
		// Pierwszy wiersz A na tej parze wstawiony w beforeAll — drugi musi paść.
		await expect(insertStateOwner(studentIds[USER_A], conceptId)).rejects.toSatisfy(
			isUniqueViolation,
		);
	});
});
