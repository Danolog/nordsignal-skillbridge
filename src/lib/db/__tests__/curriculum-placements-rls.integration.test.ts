// @vitest-environment node
//
// 1E.7 (SLICE L3) — DoD NA REALNEJ BAZIE: kontrakt bezpieczeństwa i niezmienności
// trwałego nośnika odblokowania (`curriculum_placements`, migracja 0045).
// Domyka warunki W-1 i W-3 bramki projektowej Ryana (CRCO) — rls-matrix v0.32
// wiersz #28, RoPA wpis #5.
//
//  • W-1 NIEZMIENNOŚĆ: UPDATE → wyjątek wyzwalacza; druga diagnoza (ON CONFLICT
//    DO NOTHING) → wiersz BEZ ZMIAN; skasowanie studenta → wiersze znikają
//    KASKADĄ i samo kasowanie SIĘ UDAJE (art. 17 RODO). Ten ostatni przypadek
//    jest sednem: wariant wyzwalacza `BEFORE UPDATE OR DELETE` (odruchowo
//    skopiowany z audit_log_append_only) wywaliłby `DELETE FROM students`
//    i uczyniłby konto niekasowalnym. Test jest strażnikiem tej różnicy.
//  • W-3 DENY-FACULTY: `app_faculty` ma ZERO grantów — wykładowca nie czyta
//    placementu żadnego studenta, także zbiorczo (warunek nośny A22-3 oceny
//    art. 22 RODO). Deklarowane wprost, bo wzorcowy dług repo (nota (b) v0.26
//    macierzy) każe takie deklaracje wiązać strażnikiem regresyjnym.
//  • K-INT: student widzi WYŁĄCZNIE swoje wiersze (RLS filtruje mimo braku
//    WHERE); app_student nie zapisze (grant TYLKO SELECT — zapisy owner-side).
//  • FORCE RLS na tabeli (owner podlega politykom — bez cichego bypassu).
//  • CHECK na KSZTAŁCIE werdyktu: nie da się zapisać 'qualified' bez pomiaru
//    ani 'carried_untagged' z pomiarem — dwa powody, które miernik progu
//    (DECYZJA 2 Sophii) ma rozróżniać, nie zleją się po cichu.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0045).

import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER_A = "u-1e7-wlasciciel";
const USER_B = "u-1e7-obcy";
const PREFIX = "l3p-";

// Drizzle opakowuje błąd Postgresa („Failed query: …"), a realna przyczyna
// ląduje w łańcuchu error.cause — chodzimy po całym łańcuchu, nie po message.
function chainMatches(err: unknown, re: RegExp): boolean {
	for (let e = err; e; e = (e as { cause?: unknown }).cause) {
		if (re.test(String((e as Error).message ?? e))) return true;
	}
	return false;
}
const isPermissionDenied = (err: unknown) => chainMatches(err, /permission denied/i);
const violatesCheck = (name: string) => (err: unknown) =>
	chainMatches(err, new RegExp(`check constraint|${name}`, "i"));
const isUniqueViolation = (err: unknown) =>
	chainMatches(err, /duplicate key|unique constraint|uq_curriculum_placements_student_module/i);
const isAppendOnlyViolation = (err: unknown) => chainMatches(err, /append-only/i);

dBack("1E.7 L3 · curriculum_placements: RLS + niezmienność (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: tenant-context ładowany dynamicznie.
	let withTenantContext: any;

	let tenantId = "";
	let moduleId = "";
	let otherModuleId = "";
	let sessionIdA = "";
	let sessionIdB = "";
	const studentIds: Record<string, string> = {};

	/** Owner-side INSERT (tak jak robi to hook L3 po domknięciu diagnozy). */
	function insertPlacementOwner(
		studentId: string,
		sessionId: string,
		over: Record<string, unknown> = {},
	) {
		const v = {
			module_id: moduleId,
			concept_slug: `${PREFIX}ds-python`,
			level: 3,
			threshold: 3,
			reason: "qualified",
			support_mode: "full",
			blocking_hole_slug: null,
			...over,
		};
		return db.execute(
			sql`INSERT INTO curriculum_placements
			      (student_id, tenant_id, module_id, assessment_session_id, concept_slug,
			       level, threshold, reason, support_mode, blocking_hole_slug)
			    VALUES (${studentId}, ${tenantId}, ${v.module_id}, ${sessionId}, ${v.concept_slug},
			            ${v.level}, ${v.threshold}, ${v.reason}, ${v.support_mode}, ${v.blocking_hole_slug})`,
		);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		({ withTenantContext } = await import("@/lib/db/tenant-context"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-1e7', 'Tenant 1E.7')
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		for (const slug of [`${PREFIX}modul-1`, `${PREFIX}modul-2`]) {
			const [mod] = await db
				.execute(
					sql`INSERT INTO curriculum_modules (slug, title) VALUES (${slug}, ${slug})
					    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			if (slug.endsWith("modul-1")) moduleId = mod.id;
			else otherModuleId = mod.id;
		}
	});

	// Studenci są kasowani w teście kaskady — odtwarzamy komplet przed KAŻDYM
	// testem, żeby kolejność plików/testów nie decydowała o wyniku.
	beforeEach(async () => {
		for (const userId of [USER_A, USER_B]) {
			await db.execute(
				sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
				    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, true, now(), now())
				    ON CONFLICT (id) DO NOTHING`,
			);
			const [student] = await db
				.execute(
					sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
					    VALUES (${userId}, ${tenantId}, 'Test U', 'Informatyka', 3, 'Data Scientist')
					    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			studentIds[userId] = student.id;
		}

		await db.execute(sql`DELETE FROM curriculum_placements WHERE tenant_id = ${tenantId}`);
		await db.execute(sql`DELETE FROM assessment_sessions WHERE tenant_id = ${tenantId}`);

		const sessions: Record<string, string> = {};
		for (const userId of [USER_A, USER_B]) {
			const [s] = await db
				.execute(
					sql`INSERT INTO assessment_sessions
					      (student_id, tenant_id, kind, input_hash, status, plan_json, result_json, completed_at)
					    VALUES (${studentIds[userId]}, ${tenantId}, 'diagnostic', ${`h-${userId}`}, 'completed',
					            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
					            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
					    RETURNING id`,
				)
				.then((r: { rows: { id: string }[] }) => r.rows);
			sessions[userId] = s.id;
		}
		sessionIdA = sessions[USER_A];
		sessionIdB = sessions[USER_B];

		await insertPlacementOwner(studentIds[USER_A], sessionIdA);
		await insertPlacementOwner(studentIds[USER_B], sessionIdB);
	});

	// ─── 1. W-1: niezmienność względem UPDATE ─────────────────────────────────
	it("W-1: UPDATE wiersza → wyjątek wyzwalacza (append-only względem UPDATE)", async () => {
		await expect(
			db.execute(
				sql`UPDATE curriculum_placements SET level = 4 WHERE student_id = ${studentIds[USER_A]}`,
			),
		).rejects.toSatisfy(isAppendOnlyViolation);
	});

	it("W-1: UPDATE nie przechodzi nawet gdy nic nie zmienia (wyzwalacz przed zapisem)", async () => {
		await expect(
			db.execute(
				sql`UPDATE curriculum_placements SET reason = reason WHERE student_id = ${studentIds[USER_A]}`,
			),
		).rejects.toSatisfy(isAppendOnlyViolation);
	});

	it("W-1: druga diagnoza (ON CONFLICT DO NOTHING) → wiersz BEZ ZMIAN, zero nowych", async () => {
		const przed = await db
			.execute(
				sql`SELECT id, level, threshold, reason, support_mode, assessment_session_id, unlocked_at
				    FROM curriculum_placements WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);

		// Druga diagnoza tego samego studenta: INNA sesja, INNY poziom, INNY powód.
		const [drugaSesja] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, input_hash, status, plan_json, result_json, completed_at)
				    VALUES (${studentIds[USER_A]}, ${tenantId}, 'diagnostic', 'h-druga', 'completed',
				            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
				            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);

		const wstawione = await db
			.execute(
				sql`INSERT INTO curriculum_placements
				      (student_id, tenant_id, module_id, assessment_session_id, concept_slug,
				       level, threshold, reason, support_mode)
				    VALUES (${studentIds[USER_A]}, ${tenantId}, ${moduleId}, ${drugaSesja.id},
				            ${`${PREFIX}ds-python`}, 4, 4, 'qualified', 'fading')
				    ON CONFLICT (student_id, module_id) DO NOTHING
				    RETURNING id`,
			)
			.then((r: { rows: unknown[] }) => r.rows);

		// Zero wstawionych i wiersz identyczny co do BITU — powód pierwszego
		// otwarcia nie został przepisany (inaczej miernik progu Sophii mierzyłby
		// skutek własnej aktualizacji, nie trafność progu).
		expect(wstawione.length).toBe(0);
		const po = await db
			.execute(
				sql`SELECT id, level, threshold, reason, support_mode, assessment_session_id, unlocked_at
				    FROM curriculum_placements WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(po).toEqual(przed);
	});

	it("W-1: UNIQUE(student_id, module_id) — drugi INSERT bez ON CONFLICT łamie klucz", async () => {
		await expect(insertPlacementOwner(studentIds[USER_A], sessionIdA)).rejects.toSatisfy(
			isUniqueViolation,
		);
	});

	it("W-1: ten sam moduł u INNEGO studenta przechodzi (unikalność jest per student)", async () => {
		await db.execute(
			sql`DELETE FROM curriculum_placements WHERE student_id = ${studentIds[USER_B]}`,
		);
		await expect(insertPlacementOwner(studentIds[USER_B], sessionIdB)).resolves.toBeDefined();
	});

	// ─── 2. W-1 (sedno): kaskada art. 17 RODO DZIAŁA ──────────────────────────
	it("W-1/art.17: DELETE studenta UDAJE SIĘ, a jego wiersze znikają kaskadą", async () => {
		const przed = await db
			.execute(
				sql`SELECT count(*)::int AS n FROM curriculum_placements
				    WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: { n: number }[] }) => r.rows[0].n);
		expect(przed).toBeGreaterThan(0);

		// To jest test wyzwalacza, nie kaskady jako takiej: gdyby wyzwalacz był
		// `BEFORE UPDATE OR DELETE` (wzorzec audit_log), TA komenda rzuciłaby
		// wyjątek i konta studenta NIE DAŁOBY SIĘ usunąć — złamanie art. 17.
		await expect(
			db.execute(sql`DELETE FROM students WHERE id = ${studentIds[USER_A]}`),
		).resolves.toBeDefined();

		const po = await db
			.execute(
				sql`SELECT count(*)::int AS n FROM curriculum_placements
				    WHERE student_id = ${studentIds[USER_A]}`,
			)
			.then((r: { rows: { n: number }[] }) => r.rows[0].n);
		expect(po).toBe(0);
	});

	it("W-1/art.17: bezpośredni DELETE wiersza też przechodzi (zakaz obejmuje TYLKO UPDATE)", async () => {
		await expect(
			db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentIds[USER_B]}`),
		).resolves.toBeDefined();
	});

	// ─── 3. W-3: app_faculty bez jednego grantu ───────────────────────────────
	it("W-3 DENY: app_faculty NIE czyta curriculum_placements (zero grantów)", async () => {
		await expect(
			withTenantContext(
				{ userId: "", tenantId, role: "faculty" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) => tx.execute(sql`SELECT id FROM curriculum_placements`),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("W-3 DENY: app_faculty nie policzy nawet AGREGATU (warunek nośny A22-3)", async () => {
		await expect(
			withTenantContext(
				{ userId: "", tenantId, role: "faculty" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) => tx.execute(sql`SELECT count(*) FROM curriculum_placements`),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("W-3: katalog uprawnień — app_faculty ma DOKŁADNIE zero grantów na tabeli", async () => {
		const granty = await db
			.execute(
				sql`SELECT privilege_type FROM information_schema.role_table_grants
				    WHERE table_name = 'curriculum_placements' AND grantee = 'app_faculty'`,
			)
			.then((r: { rows: unknown[] }) => r.rows);
		expect(granty).toEqual([]);
	});

	// ─── 4. Izolacja studenta (K-INT) ─────────────────────────────────────────
	it("RLS: student widzi WYŁĄCZNIE swój wiersz — placement obcego = 0 rows", async () => {
		const widziane = await withTenantContext(
			{ userId: USER_A, tenantId, role: "student" },
			// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
			async (tx: any) =>
				tx
					.execute(sql`SELECT student_id FROM curriculum_placements`)
					.then((r: { rows: { student_id: string }[] }) => r.rows),
		);
		expect(widziane.length).toBe(1);
		expect(widziane[0].student_id).toBe(studentIds[USER_A]);
	});

	it("DENY zapisu: app_student NIE zrobi INSERT (grant TYLKO SELECT — zapis owner-side)", async () => {
		await expect(
			withTenantContext(
				{ userId: USER_A, tenantId, role: "student" },
				// biome-ignore lint/suspicious/noExplicitAny: surowe wiersze SQL.
				async (tx: any) =>
					tx.execute(
						sql`INSERT INTO curriculum_placements
						      (student_id, tenant_id, module_id, assessment_session_id, threshold, reason, support_mode)
						    VALUES (${studentIds[USER_A]}, ${tenantId}, ${otherModuleId}, ${sessionIdA},
						            3, 'carried_untagged', 'full')`,
					),
			),
		).rejects.toSatisfy(isPermissionDenied);
	});

	it("FORCE RLS włączony (owner podlega politykom — bez cichego bypassu)", async () => {
		const [row] = await db
			.execute(
				sql`SELECT relrowsecurity, relforcerowsecurity FROM pg_class
				    WHERE relname = 'curriculum_placements'`,
			)
			.then((r: { rows: { relrowsecurity: boolean; relforcerowsecurity: boolean }[] }) => r.rows);
		expect(row.relrowsecurity).toBe(true);
		expect(row.relforcerowsecurity).toBe(true);
	});

	// ─── 5. CHECK na kształcie werdyktu ───────────────────────────────────────
	it("CHECK: 'qualified' bez poziomu → odrzucone (powód bez przesłanki)", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				level: null,
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_verdict_shape"));
	});

	it("CHECK: 'qualified' z poziomem PONIŻEJ progu → odrzucone", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				level: 2,
				threshold: 3,
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_verdict_shape"));
	});

	it("CHECK: 'carried_untagged' Z pomiarem → odrzucone (dwa powody się nie zleją)", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				reason: "carried_untagged",
				concept_slug: `${PREFIX}ds-python`,
				level: 3,
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_verdict_shape"));
	});

	// RDZEŃ ZAWĘŻENIA (nota L3-N3 Leo). Wariant CHECK-a wycofany przez Ryana
	// przepuszczał 'carried_untagged' z DOWOLNYM trybem wsparcia; nasze zawężenie
	// przybija tryb do 'full'. Uzasadnienie merytoryczne: moduł wciągnięty
	// prefiksem NIE ma własnego pomiaru — dowód jest wyłącznie pośredni, więc
	// wygaszanie wsparcia ('fading') stałoby na wnioskowaniu, nie na wyniku.
	// Leo sprawdził WYKONANIEM, że baza tę parę odrzuca, ale nie trzymał tego
	// ŻADEN test — a różnica wobec literalnego brzmienia bramki wymaga strażnika
	// regresyjnego, nie ustnej zgody. Mutacja dowodowa: podmień w CHECK
	// `support_mode = 'full'` na `support_mode IS NOT NULL` → ten test CZERWONY,
	// pozostałe 19 bez zmian.
	it("CHECK: 'carried_untagged' z wygaszanym wsparciem ('fading') → odrzucone", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				reason: "carried_untagged",
				concept_slug: null,
				level: null,
				support_mode: "fading",
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_verdict_shape"));
	});

	it("CHECK: 'carried_untagged' bez tagu i pomiaru, wsparcie 'full' → przechodzi", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				reason: "carried_untagged",
				concept_slug: null,
				level: null,
				support_mode: "full",
			}),
		).resolves.toBeDefined();
	});

	it("CHECK: powód spoza listy → odrzucone (nośnik przyjmuje tylko powody ODBLOKOWANIA)", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				reason: "below_threshold",
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_reason_values"));
	});

	it("CHECK: próg spoza skali 1–4 → odrzucone", async () => {
		await expect(
			insertPlacementOwner(studentIds[USER_A], sessionIdA, {
				module_id: otherModuleId,
				level: 5,
				threshold: 5,
			}),
		).rejects.toSatisfy(violatesCheck("curriculum_placements_threshold_range"));
	});
});
