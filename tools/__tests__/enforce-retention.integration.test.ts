// @vitest-environment node
//
// R-1 / Leo #1 — test integracyjny egzekucji retencji (tools/enforce-retention.ts)
// NA REALNEJ bazie testowej. Artefakt BRAMKUJĄCY pierwszy --execute na PII:
// rekonstrukcja jsonb (hints-at) i kotwica zegara po W-viva (viva-content) nie
// mogą wejść na prod bez dowodu przewodowego do prawdziwych tabel/kolumn.
//
// Napędza DOKŁADNIE ten SQL, który idzie na prod: importuje RULES + countRule
// z narzędzia i woła applySql/countSql (nie kopie SQL) — inaczej test i produkcja
// mogłyby się rozjechać.
//
// Wymaga DATABASE_URL na lokalnym Postgresie (:5433 po pnpm db:migrate:test).
// Bez lokalnej bazy → describe.skip (nie failuje) — druga linia obrony obok
// guarda assertTestDb w samym narzędziu.

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { countRule, RULES } from "../enforce-retention";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const ruleById = (id: string) => {
	const r = RULES.find((x) => x.id === id);
	if (!r) throw new Error(`Brak reguły ${id} w RULES`);
	return r;
};

/** Znacznik `at` w formacie ADR-018 (UTC, pełne sekundy). */
function hintStamp(d: Date): string {
	return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
const OLD_AT = "2020-01-01T00:00:00Z"; // > 12 mies. przed dziś
const NEW_AT = hintStamp(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // ~1 mies. temu

const TEST_USER = "u-enforce-retention-integ";
const TENANT_SLUG = "t-enforce-retention-integ";

dBack("R-1 · enforce-retention na realnej bazie", () => {
	let pool: Pool;
	let tenantId = "";
	let studentId = "";

	async function cleanup() {
		const students = await pool.query("SELECT id FROM students WHERE user_id = $1", [TEST_USER]);
		for (const s of students.rows) {
			const sid = s.id as string;
			await pool.query(
				"DELETE FROM viva_answers WHERE session_id IN (SELECT id FROM viva_sessions WHERE student_id = $1)",
				[sid],
			);
			await pool.query("DELETE FROM viva_sessions WHERE student_id = $1", [sid]);
			await pool.query(
				"DELETE FROM submission_reviews WHERE submission_id IN (SELECT id FROM project_submissions WHERE student_id = $1)",
				[sid],
			);
			await pool.query("DELETE FROM project_submissions WHERE student_id = $1", [sid]);
			await pool.query("DELETE FROM curriculum_item_progress WHERE student_id = $1", [sid]);
		}
		await pool.query("DELETE FROM students WHERE user_id = $1", [TEST_USER]);
		await pool.query('DELETE FROM "user" WHERE id = $1', [TEST_USER]);
		await pool.query("DELETE FROM projects WHERE slug LIKE $1", [`${TENANT_SLUG}-proj-%`]);
		await pool.query("DELETE FROM curriculum_module_items WHERE slug LIKE $1", [
			`${TENANT_SLUG}-item-%`,
		]);
		await pool.query("DELETE FROM curriculum_modules WHERE slug = $1", [`${TENANT_SLUG}-mod`]);
		await pool.query("DELETE FROM tenants WHERE slug = $1", [TENANT_SLUG]);
	}

	/** Tworzy zgłoszenie + sesję vivy + jedną odpowiedź; zwraca id odpowiedzi. */
	async function seedVivaCase(opts: {
		slug: string;
		status: string; // viva_sessions.status
		completedInterval: string | null; // np. "13 months" → completed_at = now()-13mo
		needsHumanReview: boolean;
		review: { decisionInterval: string } | null; // submission_reviews.created_at = now()-X
	}): Promise<string> {
		const proj = await pool.query(
			`INSERT INTO projects (slug, title, description, level, estimated_hours, source_type, status)
			 VALUES ($1, 'P', 'D', 'L1', 5, 'open_data', 'active') RETURNING id`,
			[`${TENANT_SLUG}-proj-${opts.slug}`],
		);
		const projectId = proj.rows[0].id as string;
		const sub = await pool.query(
			`INSERT INTO project_submissions (student_id, tenant_id, project_id, status, needs_human_review, submitted_at)
			 VALUES ($1, $2, $3, 'submitted', $4, now()) RETURNING id`,
			[studentId, tenantId, projectId, opts.needsHumanReview],
		);
		const submissionId = sub.rows[0].id as string;
		const completedExpr = opts.completedInterval
			? `now() - interval '${opts.completedInterval}'`
			: "NULL";
		const sess = await pool.query(
			`INSERT INTO viva_sessions (submission_id, student_id, tenant_id, status, questions_json, result_json, completed_at)
			 VALUES ($1, $2, $3, $4, '[]'::jsonb, '{"totalPoints":5}'::jsonb, ${completedExpr}) RETURNING id`,
			[submissionId, studentId, tenantId, opts.status],
		);
		const sessionId = sess.rows[0].id as string;
		const ans = await pool.query(
			`INSERT INTO viva_answers (session_id, student_id, tenant_id, position, content)
			 VALUES ($1, $2, $3, 0, 'surowa odpowiedź studenta') RETURNING id`,
			[sessionId, studentId, tenantId],
		);
		if (opts.review) {
			await pool.query(
				`INSERT INTO submission_reviews (submission_id, tenant_id, decision, reviewer_type, created_at)
				 VALUES ($1, $2, 'approved', 'faculty', now() - interval '${opts.review.decisionInterval}')`,
				[submissionId, tenantId],
			);
		}
		return ans.rows[0].id as string;
	}

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		pool = new Pool({ connectionString: DATABASE_URL });
		await cleanup();
		const t = await pool.query(
			"INSERT INTO tenants (slug, name) VALUES ($1, 'Enforce Retention Integ') RETURNING id",
			[TENANT_SLUG],
		);
		tenantId = t.rows[0].id;
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, 'ER', 'er-integ@test.local', true, now(), now())`,
			[TEST_USER],
		);
		const s = await pool.query(
			`INSERT INTO students (user_id, tenant_id, university, field_of_study, semester, career_goal)
			 VALUES ($1, $2, 'U', 'Informatyka', 3, 'Data') RETURNING id`,
			[TEST_USER, tenantId],
		);
		studentId = s.rows[0].id;
	});

	afterAll(async () => {
		if (!isLocalTestDb) return;
		await cleanup();
		await pool.end();
	});

	// ─────────────────────────── hints-at ────────────────────────────────────
	describe("hints-at — rekonstrukcja jsonb (zostawia d, przycina at)", () => {
		const keyA = randomUUID(); // d=3, at=[old,old,new] → at=[new]
		const keyB = randomUUID(); // d=2, at=[old,old]     → at=[]
		const keyC = randomUUID(); // d=1, at=[new]         → bez zmian
		let progressId = "";
		let untouchedId = "";

		beforeAll(async () => {
			if (!isLocalTestDb) return;
			const item = await pool.query(
				`INSERT INTO curriculum_modules (slug, title) VALUES ($1, 'Mod') RETURNING id`,
				[`${TENANT_SLUG}-mod`],
			);
			const moduleId = item.rows[0].id as string;
			const mi = await pool.query(
				`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				 VALUES ($1, $2, 1, 'exercise', 'Poz', '{}'::jsonb) RETURNING id`,
				[moduleId, `${TENANT_SLUG}-item-1`],
			);
			const itemId = mi.rows[0].id as string;
			const mi2 = await pool.query(
				`INSERT INTO curriculum_module_items (module_id, slug, position, kind, title, config_json)
				 VALUES ($1, $2, 2, 'exercise', 'Poz2', '{}'::jsonb) RETURNING id`,
				[moduleId, `${TENANT_SLUG}-item-2`],
			);
			const itemId2 = mi2.rows[0].id as string;

			const mapWithOld = {
				[keyA]: { d: 3, at: [OLD_AT, OLD_AT, NEW_AT] },
				[keyB]: { d: 2, at: [OLD_AT, OLD_AT] },
				[keyC]: { d: 1, at: [NEW_AT] },
			};
			const p1 = await pool.query(
				`INSERT INTO curriculum_item_progress (student_id, tenant_id, item_id, status, hints_revealed_json)
				 VALUES ($1, $2, $3, 'in_progress', $4::jsonb) RETURNING id`,
				[studentId, tenantId, itemId, JSON.stringify(mapWithOld)],
			);
			progressId = p1.rows[0].id;

			// Wiersz BEZ starych znaczników — WHERE EXISTS ma go NIE ruszać.
			const onlyNew = { [randomUUID()]: { d: 2, at: [NEW_AT, NEW_AT] } };
			const p2 = await pool.query(
				`INSERT INTO curriculum_item_progress (student_id, tenant_id, item_id, status, hints_revealed_json)
				 VALUES ($1, $2, $3, 'in_progress', $4::jsonb) RETURNING id`,
				[studentId, tenantId, itemId2, JSON.stringify(onlyNew)],
			);
			untouchedId = p2.rows[0].id;
		});

		it("countSql liczy tylko wiersze z czymś do przycięcia (1, nie 2)", async () => {
			expect(await countRule(pool, ruleById("hints-at"))).toBe(1);
		});

		it("applySql: d nietknięte, stare at usunięte, młode zostają, pusta lista legalna", async () => {
			await pool.query(ruleById("hints-at").applySql);
			const { rows } = await pool.query(
				"SELECT hints_revealed_json AS h FROM curriculum_item_progress WHERE id = $1",
				[progressId],
			);
			const h = rows[0].h as Record<string, { d: number; at: string[] }>;

			// d IDENTYCZNE przed/po dla każdego klucza.
			expect(h[keyA].d).toBe(3);
			expect(h[keyB].d).toBe(2);
			expect(h[keyC].d).toBe(1);

			// at: stare wycięte, młode zostają.
			expect(h[keyA].at).toEqual([NEW_AT]); // dwa OLD wycięte, NEW został
			expect(h[keyB].at).toEqual([]); // wszystko wycięte → pusta lista, klucz+d zostają
			expect(h[keyC].at).toEqual([NEW_AT]); // nic do wycięcia

			// Niezmiennik at.length <= d trzyma dla każdego klucza.
			for (const k of [keyA, keyB, keyC]) {
				expect(h[k].at.length).toBeLessThanOrEqual(h[k].d);
			}
		});

		it("wiersz bez starych znaczników pozostał nietknięty", async () => {
			const { rows } = await pool.query(
				"SELECT hints_revealed_json AS h FROM curriculum_item_progress WHERE id = $1",
				[untouchedId],
			);
			const entry = Object.values(rows[0].h as Record<string, { at: string[] }>)[0];
			expect(entry.at).toEqual([NEW_AT, NEW_AT]);
		});

		it("idempotencja: drugi przebieg countSql = 0", async () => {
			await pool.query(ruleById("hints-at").applySql);
			expect(await countRule(pool, ruleById("hints-at"))).toBe(0);
		});
	});

	// ─────────────────────────── viva-content (W-viva) ───────────────────────
	describe("viva-content — kotwica zegara = prawomocne rozstrzygnięcie", () => {
		let passedOld = ""; // passed, completed 13mo → KASOWANE
		let passedNew = ""; // passed, completed 1mo  → ZOSTAJE
		let escalatedRecentDecision = ""; // failed, AI-close 13mo, decyzja 1mo → ZOSTAJE
		let escalatedOldDecision = ""; // failed, AI-close 13mo, decyzja 13mo → KASOWANE
		let escalatedNoDecision = ""; // inconclusive, needsHumanReview, brak decyzji → ZOSTAJE (HITL)

		beforeAll(async () => {
			if (!isLocalTestDb) return;
			passedOld = await seedVivaCase({
				slug: "passed-old",
				status: "passed",
				completedInterval: "13 months",
				needsHumanReview: false,
				review: null,
			});
			passedNew = await seedVivaCase({
				slug: "passed-new",
				status: "passed",
				completedInterval: "1 month",
				needsHumanReview: false,
				review: null,
			});
			escalatedRecentDecision = await seedVivaCase({
				slug: "esc-recent",
				status: "failed",
				completedInterval: "13 months",
				needsHumanReview: true,
				review: { decisionInterval: "1 month" },
			});
			escalatedOldDecision = await seedVivaCase({
				slug: "esc-old",
				status: "failed",
				completedInterval: "13 months",
				needsHumanReview: true,
				review: { decisionInterval: "13 months" },
			});
			escalatedNoDecision = await seedVivaCase({
				slug: "esc-none",
				status: "inconclusive",
				completedInterval: "13 months",
				needsHumanReview: true,
				review: null,
			});
		});

		async function answerExists(id: string): Promise<boolean> {
			const { rows } = await pool.query("SELECT 1 FROM viva_answers WHERE id = $1", [id]);
			return rows.length > 0;
		}

		it("countSql = 2 (passed-old + escalated-old-decision), reszta wykluczona", async () => {
			expect(await countRule(pool, ruleById("viva-content"))).toBe(2);
		});

		it("applySql kasuje właściwe wiersze i zostawia result_json sesji", async () => {
			await pool.query(ruleById("viva-content").applySql);

			// KASOWANE: prawomocne rozstrzygnięcie > 12 mies.
			expect(await answerExists(passedOld)).toBe(false);
			expect(await answerExists(escalatedOldDecision)).toBe(false);

			// ZOSTAJE: świeże / pod recenzją człowieka.
			expect(await answerExists(passedNew)).toBe(true);
			expect(await answerExists(escalatedRecentDecision)).toBe(true); // decyzja 1mo, NIE completed 13mo
			expect(await answerExists(escalatedNoDecision)).toBe(true); // HITL: brak decyzji → nie kasuj

			// result_json sesji nietknięty (kasowanie dotyczy tylko viva_answers).
			const { rows } = await pool.query(
				"SELECT count(*)::int AS n FROM viva_sessions WHERE student_id = $1 AND result_json IS NOT NULL",
				[studentId],
			);
			expect(rows[0].n).toBe(5);
		});

		it("idempotencja: drugi przebieg countSql = 0", async () => {
			await pool.query(ruleById("viva-content").applySql);
			expect(await countRule(pool, ruleById("viva-content"))).toBe(0);
		});
	});
});
