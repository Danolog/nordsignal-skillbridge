// @vitest-environment node
// ============================================================================
// DŁUG B1 — KLUCZ ŚCIEŻKI W NOŚNIKU ODBLOKOWANIA, na realnej bazie (:5433).
//
// Wada, którą ten plik pinuje: wiersz `curriculum_placements` nie niósł ścieżki,
// a klucz jednoznaczności brzmiał (student, moduł). Student zmieniający kierunek
// zostawał z odblokowaniami PORZUCONEJ drabiny, nieodróżnialnymi od bieżących —
// i nienaprawialnymi, bo wiersze są niezmienne z mocy wyzwalacza.
//
// Dwie asercje nośne, obie o SCHEMACIE, nie o zachowaniu produktu:
//   1. dwa odblokowania TEGO SAMEGO modułu na DWÓCH RÓŻNYCH ścieżkach WSPÓŁISTNIEJĄ
//      (to dwa różne fakty: inny pomiar, inna drabina, inny próg);
//   2. wiersz BEZ ścieżki NIE POWSTAJE — ani z NULL-em, ani z pustym łańcuchem.
//
// Świadomie NIE testujemy, czy odblokowanie z porzuconej ścieżki ma dalej
// obowiązywać — to rozstrzygnięcie produktowe Sophii. Schemat ma UMIEĆ WYRAZIĆ
// oba warianty i tego dowodzi test „obie ścieżki dają się odpytać osobno".
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (migracja 0046).
// ============================================================================

import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const USER = "u-b1-klucz-sciezki";
const PREFIX = "b1-";
const SCIEZKA_A = "b1-sciezka-alfa"; // gitleaks:allow — slug ścieżki curriculum
const SCIEZKA_B = "b1-sciezka-beta"; // gitleaks:allow

dBack("DŁUG B1 · klucz ścieżki w curriculum_placements (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let tenantId = "";
	let studentId = "";
	let sessionId = "";
	let moduleId = "";

	/**
	 * Kod SQLSTATE z błędu — Drizzle owija komunikat Postgresa w „Failed query…",
	 * a prawdziwa przyczyna siedzi w `cause`. Asercja na KODZIE, nie na tekście:
	 * kod jest stabilny i niezależny od języka komunikatów serwera.
	 */
	async function kodBleduPrzy(operacja: () => Promise<unknown>): Promise<string | undefined> {
		try {
			await operacja();
		} catch (e) {
			let cur: unknown = e;
			for (let i = 0; i < 5 && cur; i++) {
				const kod = (cur as { code?: string }).code;
				if (typeof kod === "string" && /^\d{5}$/.test(kod)) return kod;
				cur = (cur as { cause?: unknown }).cause;
			}
			return "(brak kodu)";
		}
		return undefined; // brak wyjątku = wstawka PRZESZŁA
	}

	/** Wiersz odblokowania w kształcie, jaki produkuje L3 — z jawną ścieżką. */
	async function wstaw(pathKey: string | null, opcje: { pusty?: boolean } = {}) {
		const wartosc = opcje.pusty ? "   " : pathKey;
		return db.execute(
			sql`INSERT INTO curriculum_placements
			      (student_id, tenant_id, module_id, assessment_session_id, path_key,
			       concept_slug, level, threshold, reason, support_mode)
			    VALUES (${studentId}, ${tenantId}, ${moduleId}, ${sessionId}, ${wartosc},
			            ${`${PREFIX}koncept`}, 4, 3, 'qualified', 'fading')`,
		);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));

		const [tenant] = await db
			.execute(
				sql`INSERT INTO tenants (slug, name) VALUES ('t-b1', 'Tenant B1')
				    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		tenantId = tenant.id;

		await db.execute(
			sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			    VALUES (${USER}, ${USER}, ${`${USER}@test.local`}, true, now(), now())
			    ON CONFLICT (id) DO NOTHING`,
		);
		const [student] = await db
			.execute(
				sql`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
				    VALUES (${USER}, ${tenantId}, 'Test U', 'Informatyka', 3, 'Data Scientist')
				    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		studentId = student.id;

		const [s] = await db
			.execute(
				sql`INSERT INTO assessment_sessions
				      (student_id, tenant_id, kind, input_hash, status, plan_json, result_json, completed_at)
				    VALUES (${studentId}, ${tenantId}, 'diagnostic', ${`h-b1-${Date.now()}`}, 'completed',
				            '{"schemaVersion":1,"kind":"diagnostic","competencies":[],"uncovered":[]}'::jsonb,
				            '{"competencies":{},"concepts":{},"uncovered":[]}'::jsonb, now())
				    RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		sessionId = s.id;

		// JEDEN moduł — sedno testu to ten sam moduł na dwóch ścieżkach.
		const [m] = await db
			.execute(
				sql`INSERT INTO curriculum_modules (slug, title) VALUES (${`${PREFIX}modul`}, 'Moduł B1')
				    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
			)
			.then((r: { rows: { id: string }[] }) => r.rows);
		moduleId = m.id;
	});

	beforeEach(async () => {
		await db.execute(sql`DELETE FROM curriculum_placements WHERE student_id = ${studentId}`);
	});

	it("KRYTERIUM: ten sam moduł otwarty na DWÓCH RÓŻNYCH ścieżkach — dwa wiersze współistnieją", async () => {
		await wstaw(SCIEZKA_A);
		await wstaw(SCIEZKA_B);

		const { rows } = await db.execute(
			sql`SELECT path_key FROM curriculum_placements
			     WHERE student_id = ${studentId} AND module_id = ${moduleId}
			     ORDER BY path_key`,
		);
		expect(rows.map((r: { path_key: string }) => r.path_key)).toEqual([SCIEZKA_A, SCIEZKA_B]);
	});

	it("IDEMPOTENCJA ZOSTAJE: powtórka na TEJ SAMEJ ścieżce nie tworzy drugiego wiersza", async () => {
		await wstaw(SCIEZKA_A);
		// Dokładnie to robi hook przy drugiej diagnozie: ON CONFLICT DO NOTHING.
		await db.execute(
			sql`INSERT INTO curriculum_placements
			      (student_id, tenant_id, module_id, assessment_session_id, path_key,
			       concept_slug, level, threshold, reason, support_mode)
			    VALUES (${studentId}, ${tenantId}, ${moduleId}, ${sessionId}, ${SCIEZKA_A},
			            ${`${PREFIX}koncept`}, 4, 3, 'qualified', 'fading')
			    ON CONFLICT (student_id, module_id, path_key) DO NOTHING`,
		);
		const { rows } = await db.execute(
			sql`SELECT count(*)::int AS c FROM curriculum_placements
			     WHERE student_id = ${studentId} AND module_id = ${moduleId}`,
		);
		expect(rows[0].c).toBe(1);
	});

	it("WIERSZ BEZ ŚCIEŻKI NIE POWSTAJE: NULL odrzucony przez NOT NULL", async () => {
		// 23502 = not_null_violation
		expect(await kodBleduPrzy(() => wstaw(null))).toBe("23502");
	});

	it("WIERSZ BEZ ŚCIEŻKI NIE POWSTAJE: pusty łańcuch odrzucony przez CHECK", async () => {
		// `NOT NULL` nie zabrania pustego napisu — to ta sama klasa wady co pusty
		// tytuł modułu w L6, tylko że tutaj kasowałaby sens całej kolumny.
		// 23514 = check_violation
		expect(await kodBleduPrzy(() => wstaw(null, { pusty: true }))).toBe("23514");
	});

	it("SCHEMAT UMIE WYRAZIĆ OBA WARIANTY: odblokowania da się odpytać per ścieżka", async () => {
		await wstaw(SCIEZKA_A);
		await wstaw(SCIEZKA_B);
		// Wariant „porzucona ścieżka przestaje obowiązywać" — filtr po ścieżce.
		const tylkoA = await db.execute(
			sql`SELECT count(*)::int AS c FROM curriculum_placements
			     WHERE student_id = ${studentId} AND path_key = ${SCIEZKA_A}`,
		);
		// Wariant „historia zostaje" — bez filtru.
		const wszystkie = await db.execute(
			sql`SELECT count(*)::int AS c FROM curriculum_placements WHERE student_id = ${studentId}`,
		);
		expect(tylkoA.rows[0].c).toBe(1);
		expect(wszystkie.rows[0].c).toBe(2);
	});

	it("NIEZMIENNOŚĆ WIERSZA NIETKNIĘTA: UPDATE ścieżki odrzucony przez wyzwalacz", async () => {
		await wstaw(SCIEZKA_A);
		const kod = await kodBleduPrzy(() =>
			db.execute(
				sql`UPDATE curriculum_placements SET path_key = ${SCIEZKA_B}
				     WHERE student_id = ${studentId}`,
			),
		);
		expect(kod).toBeDefined(); // wyzwalacz podniósł wyjątek — wiersz nietykalny
	});
});
