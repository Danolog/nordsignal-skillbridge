// @vitest-environment node
//
// 1E.3 (ADR-014 D3) — test integracyjny ingestu banku EGZAMINACYJNEGO
// (runExamBankIngest) na BAZIE TESTOWEJ (:5433). Track A: DOWÓD, że wsad się
// zapisuje i examSlots są CZYSTE (tylko refy). STOP przed prod — zero Neon.
//
// CO TESTUJEMY:
//   1. question_items (DENY): 30-krotny wzór (tu 6×2=12) — wiersze z KLUCZEM
//      (answer_json.correct), difficulty w [1,3], type single_choice.
//   2. examSlots: pozycja kind='exam' niesie WYŁĄCZNIE refy — skan JSON: zero
//      correct/stem/options/answer_json; itemId wskazuje realny active item.
//   3. exam_config_json modułu = {questionCount:15, maxErrors:1}.
//   4. Idempotencja: drugi bieg = 0 inserted / 0 retired, te same itemId.
//   5. NIEKOLIZJA Z ATOMAMI: atom pod TYM SAMYM konceptem NIE jest retired
//      (retire scope = rejestr poprzednich examSlots, nie „itemy konceptu").
//   6. Niemutowalność: zmiana treści wariantu → stary exam-item retired + nowy;
//      atom nadal active; examSlots wskazuje nowy item.
//   7. Guard: koncept rynkowy (trunk='market') → ingest przerwany (kontrakt).

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runExamBankIngest } from "../ingest-exam-bank";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const MODULE = "t-exam-mod";
const C_TYPY = "t-exam-typy";
const C_WYR = "t-exam-wyr";
const CONCEPTS = [C_TYPY, C_WYR] as const;
const EXAM_CONFIG = { questionCount: 15, maxErrors: 1 };

/** §6 syntetyczny: 2 koncepty × 3 sloty = 6 slotów × 2 warianty. */
function markdown(mutateE1 = false): string {
	const e1aStem = mutateE1 ? "Stem e1 A ZMIENIONY?" : "Stem e1 A?";
	return [
		"# Test egzaminu (syntetyczny)",
		"## 6. Bank pytań egzaminacyjnych",
		"",
		"**E1.** Pytanie e1.",
		`- **A. ${e1aStem}** — o0 / **o1** / o2 / o3`,
		"- **B. Stem e1 B?** — **o0** / o1 / o2 / o3",
		`- → \`${C_TYPY}\` → F.1`,
		'- **Feedback studenta (D3):** „Reguła e1."',
		"",
		"**E2.** Pytanie e2.",
		"- **A. Stem e2 A?** — o0 / o1 / **o2** / o3",
		"- **B. Stem e2 B?** — o0 / **o1** / o2 / o3",
		`- → \`${C_TYPY}\` → F.1`,
		'- **Feedback studenta (D3):** „Reguła e2."',
		"",
		"**E3.** Pytanie e3.",
		"- **A. Stem e3 A?** — **o0** / o1 / o2 / o3",
		"- **B. Stem e3 B?** — o0 / o1 / **o2** / o3",
		`- → \`${C_TYPY}\` → F.1`,
		'- **Feedback studenta (D3):** „Reguła e3."',
		"",
		"**E4.** Pytanie e4.",
		"- **A. Stem e4 A?** — o0 / **o1** / o2 / o3",
		"- **B. Stem e4 B?** — **o0** / o1 / o2 / o3",
		`- → \`${C_WYR}\` → F.2`,
		'- **Feedback studenta (D3):** „Reguła e4."',
		"",
		"**E5.** Pytanie e5.",
		"- **A. Stem e5 A?** — o0 / o1 / **o2** / o3",
		"- **B. Stem e5 B?** — o0 / **o1** / o2 / o3",
		`- → \`${C_WYR}\` → F.2`,
		'- **Feedback studenta (D3):** „Reguła e5."',
		"",
		"**E6.** Pytanie e6.",
		"- **A. Stem e6 A?** — **o0** / o1 / o2 / o3",
		"- **B. Stem e6 B?** — o0 / o1 / **o2** / o3",
		`- → \`${C_WYR}\` → F.2`,
		'- **Feedback studenta (D3):** „Reguła e6."',
		"",
		"## 7. Koniec",
		"",
	].join("\n");
}

function ingest(md = markdown()) {
	return runExamBankIngest(DATABASE_URL, md, {
		moduleSlug: MODULE,
		concepts: CONCEPTS,
		slotCount: 6,
		examConfig: EXAM_CONFIG,
	});
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function cleanup(): Promise<void> {
	// question_items kaskadują z question_concepts (onDelete cascade).
	await pool.query(
		"DELETE FROM curriculum_module_items WHERE module_id IN (SELECT id FROM curriculum_modules WHERE slug = $1)",
		[MODULE],
	);
	await pool.query("DELETE FROM curriculum_modules WHERE slug = $1", [MODULE]);
	await pool.query("DELETE FROM question_concepts WHERE slug = ANY($1)", [[...CONCEPTS]]);
}

async function examItemConfig(): Promise<{
	examSlots: {
		slotRef: string;
		conceptSlug: string;
		variants: { ref: string; variant: string; itemId: string }[];
	}[];
}> {
	const r = await pool.query<{ config_json: { examSlots: unknown } }>(
		"SELECT config_json FROM curriculum_module_items WHERE module_id = (SELECT id FROM curriculum_modules WHERE slug=$1) AND kind='exam'",
		[MODULE],
	);
	// biome-ignore lint/suspicious/noExplicitAny: kształt config_json weryfikowany asercjami niżej.
	return r.rows[0].config_json as any;
}

d("runExamBankIngest — wsad egzaminu na bazie testowej (examSlots czyste)", () => {
	let atomId: string;

	beforeAll(async () => {
		await cleanup();
		// Moduł (tworzy go normalnie ingest-curriculum; tu seed minimalny).
		await pool.query("INSERT INTO curriculum_modules (slug, title) VALUES ($1, $2)", [
			MODULE,
			"Moduł testowy egzaminu",
		]);
		// Koncept foundations + ATOM pod nim — dowód, że exam-ingest go NIE retire'uje.
		const c = await pool.query<{ id: string }>(
			"INSERT INTO question_concepts (slug, name, trunk, diagnostic) VALUES ($1,$2,'foundations',false) RETURNING id",
			[C_TYPY, "Typy (test)"],
		);
		const a = await pool.query<{ id: string }>(
			`INSERT INTO question_items (concept_id, difficulty, type, stem, options_json, answer_json)
			 VALUES ($1, 2, 'single_choice', 'ATOM stem (nie egzamin)', $2, $3) RETURNING id`,
			[c.rows[0].id, JSON.stringify(["a", "b", "c", "d"]), JSON.stringify({ correct: 0 })],
		);
		atomId = a.rows[0].id;
	});

	afterAll(async () => {
		await cleanup();
		await pool.end();
	});

	it("1. bieg: 12 question_items, examSlots=6, exam_config_json={15,1}", async () => {
		const stats = await ingest();
		expect(stats.itemsInserted).toBe(12);
		expect(stats.itemsRetired).toBe(0);
		expect(stats.slots).toBe(6);
		expect(stats.variants).toBe(12);

		// question_items: aktywne, z kluczem, difficulty 1..3, single_choice.
		const items = await pool.query<{
			difficulty: number;
			type: string;
			answer_json: { correct: number };
			status: string;
		}>(
			`SELECT qi.difficulty, qi.type, qi.answer_json, qi.status
			 FROM question_items qi JOIN question_concepts qc ON qc.id = qi.concept_id
			 WHERE qc.slug = ANY($1) AND qi.stem LIKE 'Stem e%'`,
			[[...CONCEPTS]],
		);
		expect(items.rows).toHaveLength(12);
		for (const row of items.rows) {
			expect(row.status).toBe("active");
			expect(row.type).toBe("single_choice");
			expect(row.difficulty).toBeGreaterThanOrEqual(1);
			expect(row.difficulty).toBeLessThanOrEqual(3);
			expect(typeof row.answer_json.correct).toBe("number");
		}

		// exam_config_json.
		const mod = await pool.query<{ exam_config_json: unknown }>(
			"SELECT exam_config_json FROM curriculum_modules WHERE slug=$1",
			[MODULE],
		);
		expect(mod.rows[0].exam_config_json).toEqual({ questionCount: 15, maxErrors: 1 });
	});

	it("examSlots: TYLKO refy — skan JSON zero correct/stem/options/answer", async () => {
		const cfg = await examItemConfig();
		expect(cfg.examSlots).toHaveLength(6);
		const serialized = JSON.stringify(cfg);
		for (const forbidden of ['"correct"', '"stem"', '"options"', '"answer_json"', '"answerJson"']) {
			expect(serialized.includes(forbidden), `examSlots nie może nieść ${forbidden}`).toBe(false);
		}
		// każdy wariant ma dokładnie {ref, variant, itemId} i itemId to realny active item.
		const ids: string[] = [];
		for (const slot of cfg.examSlots) {
			expect(Object.keys(slot).sort()).toEqual(["conceptSlug", "slotRef", "variants"]);
			for (const v of slot.variants) {
				expect(Object.keys(v).sort()).toEqual(["itemId", "ref", "variant"]);
				ids.push(v.itemId);
			}
		}
		expect(ids).toHaveLength(12);
		const active = await pool.query<{ n: string }>(
			"SELECT count(*)::text AS n FROM question_items WHERE id = ANY($1) AND status='active'",
			[ids],
		);
		expect(active.rows[0].n).toBe("12");
	});

	it("ATOM pod tym samym konceptem NIE jest retired (retire scope = examSlots, nie koncept)", async () => {
		const a = await pool.query<{ status: string }>(
			"SELECT status FROM question_items WHERE id=$1",
			[atomId],
		);
		expect(a.rows[0].status).toBe("active");
	});

	it("2. bieg (ten sam plik): idempotentny — 0 inserted, 0 retired, te same itemId", async () => {
		const before = (await examItemConfig()).examSlots.flatMap((s) =>
			s.variants.map((v) => v.itemId),
		);
		const stats = await ingest();
		expect(stats.itemsInserted).toBe(0);
		expect(stats.itemsRetired).toBe(0);
		expect(stats.itemsKept).toBe(12);
		const after = (await examItemConfig()).examSlots.flatMap((s) =>
			s.variants.map((v) => v.itemId),
		);
		expect(after).toEqual(before);
	});

	it("niemutowalność: zmiana treści E1-A → stary exam-item retired + nowy; atom active; examSlots świeży", async () => {
		const beforeIds = new Set(
			(await examItemConfig()).examSlots.flatMap((s) => s.variants.map((v) => v.itemId)),
		);
		const stats = await ingest(markdown(true));
		expect(stats.itemsInserted).toBe(1);
		expect(stats.itemsRetired).toBe(1);
		// examSlots wskazuje NOWY item (nie ma już starego retired dla E1-A).
		const afterCfg = await examItemConfig();
		const e1a = afterCfg.examSlots
			.find((s) => s.slotRef === "e1")
			?.variants.find((v) => v.variant === "A");
		expect(e1a?.itemId).toBeDefined();
		expect(beforeIds.has(e1a?.itemId ?? "")).toBe(false);
		// Atom nadal nietknięty.
		const a = await pool.query<{ status: string }>(
			"SELECT status FROM question_items WHERE id=$1",
			[atomId],
		);
		expect(a.rows[0].status).toBe("active");
	});

	it("guard: koncept rynkowy (trunk='market') → ingest przerwany, kontrakt", async () => {
		// Podmiana konceptu na rynkowy = kolizja; tool musi odmówić (nie mieszać torów).
		await pool.query(
			"UPDATE question_concepts SET trunk='market', competency_name='X', diagnostic=true WHERE slug=$1",
			[C_TYPY],
		);
		await expect(ingest()).rejects.toThrow(/kolizja z konceptem rynkowym|trunk/);
		// Przywróć foundations, żeby afterAll/cleanup nie zostawił śmieci logicznych.
		await pool.query(
			"UPDATE question_concepts SET trunk='foundations', competency_name=NULL, diagnostic=false WHERE slug=$1",
			[C_TYPY],
		);
	});
});
