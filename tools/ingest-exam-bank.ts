/**
 * 1E.3 (ADR-014 D3) — Ingest banku EGZAMINACYJNEGO modułu (mastery gate).
 * Wzorzec: ingest-question-bank (niemutowalność po hashu) + ingest-curriculum
 * (pg Pool, jedna transakcja, guard assertTestDb). Osobny tor od atomów, bo bank
 * egzaminu ma JEDNO źródło — markdown Sophii (§6), NIE pliki treści atomów.
 *
 * CO ROBI (wsad ingestu z v1.0 doc Sophii):
 *  1) question_items (DENY): 30 wierszy = 15 slotów × 2 warianty; `answer_json`
 *     z kluczem `correct`. Tabela BEZ grantów app_* (schema §DENY) — student
 *     nigdy nie czyta klucza; serwuje owner-side (loadExamBank).
 *  2) pozycja egzaminu `curriculum_module_items` kind='exam' dla modułu F1:
 *     `config_json.examSlots` = TYLKO refy (slotRef/conceptSlug/{ref,variant,
 *     itemId}) — ZERO `correct`/`stem`/`options`/`answer_json` (guard: exam.ts
 *     parseExamSlotRefs, round-trip niżej + test W1).
 *  3) `curriculum_modules.exam_config_json` F1 = {questionCount:15, maxErrors:1}.
 *
 * DE-DUP (reguła twarda 1 — jedno źródło): pytania F1 czytamy WYŁĄCZNIE z NOWEGO
 * pliku v1.0 (`docs/curation/sophia-1e3-egzamin-f1-v0.1.md` §6). Kondensat E1–E15
 * w `sophia-1e2-f1-atomy.md` NIE jest źródłem — packer go nie otwiera.
 *
 * IDEMPOTENCJA BEZ KOLIZJI Z ATOMAMI: tożsamość itemu = hash treści oceniającej
 * (itemContentHash). Rejestr „moich" itemów egzaminu = itemId z POPRZEDNIEGO
 * `config_json.examSlots` pozycji egzaminu — retire dotyczy TYLKO ich, NIGDY
 * atomów tego samego konceptu. Drugi bieg tego samego pliku = 0 zmian.
 *
 * GUARD W3 (assertExamConceptsNotDiagnostic): koncepty egzaminu muszą być
 * foundations/diagnostic=false — inaczej loadDiagnosticBank zaciągnąłby pytania
 * egzaminu do diagnozy onboardingowej.
 *
 * Użycie (baza testowa/lokalna). PROD = [CZERWONA LINIA] — osobny krok po Leo
 * review, backup gałęzią Neona, transakcyjnie (CLAUDE.md §5, delegacja Ethana):
 *   pnpm db:ingest-exam-bank
 *   pnpm db:ingest-exam-bank docs/curation/sophia-1e3-egzamin-f1-v0.1.md f1-python-1
 *
 * Guard assertTestDb: host lokalny przechodzi; zdalny (prod/Neon) wymaga
 * CONFIRM_PROD_DB=1 — świadoma ścieżka operatora, nie odpalana w Track A.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import { parseExamSlotRefs } from "../src/lib/assessment/exam";
import { examConfigSchema } from "../src/lib/curriculum/exam-config";
import { assertTestDb } from "./assert-test-db";
import {
	assertExamConceptsNotDiagnostic,
	buildExamItemRows,
	buildExamSlots,
	type ConceptSafetyMeta,
	packExamBankFromMarkdown,
	validateExamBank,
} from "./content-curriculum-exam";
import { itemContentHash } from "./ingest-question-bank";

config({ path: ".env.local" });
config({ path: ".env" });

/** Moduł pilotowy + jego 5 konceptów (Sophia §4) — allowlista walidatora banku. */
const F1_MODULE_SLUG = "f1-python-1";
const F1_CONCEPTS = [
	"typ-wartosci",
	"wyrazenie-obliczenie",
	"f-string-budowanie-tekstu",
	"porownanie-bool",
	"decyzja-if-else",
] as const;
const F1_SLOT_COUNT = 15;

/** examConfigJson pilota (Sophia §2) — walidowany schematem przed zapisem. */
const F1_EXAM_CONFIG = { questionCount: 15, maxErrors: 1 };

/** Slug pozycji egzaminu w module (tożsamość pozycji; position tylko sortuje). */
const EXAM_ITEM_SLUG = "egzamin-modulu";
const EXAM_ITEM_TITLE = "Egzamin modułu (mastery gate)";

const DEFAULT_DOC = join(process.cwd(), "docs/curation/sophia-1e3-egzamin-f1-v0.1.md");

export type ExamIngestStats = {
	moduleSlug: string;
	concepts: number;
	itemsInserted: number;
	itemsKept: number;
	itemsRetired: number;
	slots: number;
	variants: number;
};

/**
 * Rdzeń ingestu (eksport pod test integracyjny — wzorzec runCurriculumIngest):
 * walidacja banku + JEDNA transakcja concepts/items/examSlots/examConfig.
 * Rzuca Error zamiast process.exit — CLI (main) tłumaczy na kod wyjścia.
 */
export async function runExamBankIngest(
	databaseUrl: string,
	markdown: string,
	opts: {
		moduleSlug: string;
		concepts: readonly string[];
		slotCount: number;
		examConfig: { questionCount: number; maxErrors: number };
	},
): Promise<ExamIngestStats> {
	// Walidacja examConfig PRZED bazą — zła konfiguracja nie może wejść jako egzamin.
	const examConfig = examConfigSchema.parse(opts.examConfig);
	const bank = packExamBankFromMarkdown(markdown, opts.moduleSlug);

	// Walidacja banku PRZED dotknięciem bazy (plik niekontraktowy nie wejdzie).
	const problems = validateExamBank(bank, {
		slotCount: opts.slotCount,
		concepts: opts.concepts,
	});
	if (problems.length > 0) {
		throw new Error(
			`Bank egzaminu nie przechodzi kontraktu (${problems.length}):\n` +
				problems.map((p) => `  - ${p}`).join("\n"),
		);
	}

	const itemRows = buildExamItemRows(bank);

	const pool = new Pool({ connectionString: databaseUrl });
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		// 1) Moduł musi istnieć (tworzy go ingest-curriculum; ten tor tylko konfiguruje egzamin).
		const moduleRes = await client.query<{ id: string }>(
			"SELECT id FROM curriculum_modules WHERE slug = $1",
			[opts.moduleSlug],
		);
		if (moduleRes.rows.length === 0) {
			throw new Error(
				`Moduł '${opts.moduleSlug}' nie istnieje — uruchom najpierw ingest curriculum (drabina).`,
			);
		}
		const moduleId = moduleRes.rows[0].id;

		// 2) Upsert konceptów egzaminu jako foundations/diagnostic=false + meta pod W3.
		const distinctConcepts = [...new Set(bank.slots.map((s) => s.conceptSlug))];
		const metaBySlug = new Map<string, ConceptSafetyMeta>();
		const conceptIdBySlug = new Map<string, string>();
		for (const slug of distinctConcepts) {
			const existing = await client.query<{
				id: string;
				trunk: string;
				diagnostic: boolean;
				status: string;
			}>("SELECT id, trunk, diagnostic, status FROM question_concepts WHERE slug = $1", [slug]);
			if (existing.rows.length > 0) {
				const row = existing.rows[0];
				if (row.trunk !== "foundations") {
					throw new Error(
						`Koncept egzaminu '${slug}' istnieje z trunk='${row.trunk}' (oczekiwane 'foundations') — ` +
							`kolizja z konceptem rynkowym, ingest przerwany (kontrakt).`,
					);
				}
				conceptIdBySlug.set(slug, row.id);
				metaBySlug.set(slug, {
					trunk: row.trunk,
					diagnostic: row.diagnostic,
					status: row.status,
				});
			} else {
				const created = await client.query<{ id: string }>(
					`INSERT INTO question_concepts (slug, name, trunk, diagnostic)
					 VALUES ($1, $2, 'foundations', false) RETURNING id`,
					[slug, slug],
				);
				conceptIdBySlug.set(slug, created.rows[0].id);
				metaBySlug.set(slug, { trunk: "foundations", diagnostic: false, status: "active" });
			}
		}

		// 3) GUARD W3 — koncepty egzaminu nie mogą być diagnostic=true+market+active.
		assertExamConceptsNotDiagnostic(bank, metaBySlug);

		// 4) Rejestr POPRZEDNICH itemów egzaminu = itemId z istniejącego examSlots
		//    (NIE „wszystkie itemy konceptu" — inaczej retire skasowałby atomy).
		const examItemRes = await client.query<{
			id: string;
			config_json: unknown;
		}>(
			"SELECT id, config_json FROM curriculum_module_items WHERE module_id = $1 AND kind = 'exam'",
			[moduleId],
		);
		const priorExamItemIds = new Set<string>();
		if (examItemRes.rows.length > 0) {
			const priorSlots = parseExamSlotRefs(examItemRes.rows[0].config_json);
			for (const s of priorSlots ?? []) {
				for (const v of s.variants) priorExamItemIds.add(v.itemId);
			}
		}

		// 5) Synchronizacja itemów po hashu treści (niemutowalność) — retire tylko
		//    w obrębie rejestru priorExamItemIds.
		const priorRows =
			priorExamItemIds.size > 0
				? (
						await client.query<{
							id: string;
							difficulty: number;
							type: string;
							stem: string;
							options_json: unknown;
							answer_json: Record<string, unknown>;
							status: string;
						}>(
							"SELECT id, difficulty, type, stem, options_json, answer_json, status " +
								"FROM question_items WHERE id = ANY($1) AND status = 'active'",
							[[...priorExamItemIds]],
						)
					).rows
				: [];
		const dbByHash = new Map(
			priorRows.map((row) => [
				itemContentHash({
					difficulty: row.difficulty,
					type: row.type,
					stem: row.stem,
					options: Array.isArray(row.options_json) ? (row.options_json as string[]) : null,
					answer: row.answer_json,
				}),
				row,
			]),
		);

		const idByRef = new Map<string, string>();
		let inserted = 0;
		let kept = 0;
		const fileHashes = new Set<string>();
		for (const item of itemRows) {
			const hash = itemContentHash({
				difficulty: item.difficulty,
				type: item.type,
				stem: item.stem,
				options: item.options,
				answer: item.answer,
			});
			fileHashes.add(hash);
			const match = dbByHash.get(hash);
			if (match) {
				idByRef.set(item.ref, match.id);
				kept++;
				// Feedback (explanation_md) edytowalny w miejscu (poza hashem tożsamości).
				await client.query(
					"UPDATE question_items SET explanation_md = $2, updated_at = now() WHERE id = $1",
					[match.id, item.feedbackMd],
				);
			} else {
				const conceptId = conceptIdBySlug.get(item.conceptSlug);
				if (!conceptId)
					throw new Error(`Brak concept_id dla '${item.conceptSlug}' (niemożliwe po upsercie)`);
				const created = await client.query<{ id: string }>(
					`INSERT INTO question_items
					   (concept_id, difficulty, type, stem, options_json, answer_json, explanation_md)
					 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
					[
						conceptId,
						item.difficulty,
						item.type,
						item.stem,
						JSON.stringify(item.options),
						JSON.stringify(item.answer),
						item.feedbackMd,
					],
				);
				idByRef.set(item.ref, created.rows[0].id);
				inserted++;
			}
		}

		// Poprzednie itemy egzaminu nieobecne w nowym pliku → retire (poprawka = retire+nowy).
		let retired = 0;
		for (const [hash, row] of dbByHash) {
			if (!fileHashes.has(hash)) {
				await client.query(
					"UPDATE question_items SET status = 'retired', updated_at = now() WHERE id = $1",
					[row.id],
				);
				retired++;
			}
		}

		// 6) Zbuduj examSlots (TYLKO refy) i round-trip guard write-side (belt-and-suspenders
		//    do testu W1): kształt musi przejść parseExamSlotRefs bez utraty refów.
		const examSlots = buildExamSlots(bank, (ref) => {
			const id = idByRef.get(ref);
			if (!id) throw new Error(`Brak itemId dla wariantu '${ref}' (niemożliwe po synchronizacji)`);
			return id;
		});
		const configJson = { examSlots };
		const parsedBack = parseExamSlotRefs(configJson);
		if (!parsedBack || parsedBack.length !== bank.slots.length) {
			throw new Error("Round-trip examSlots niezgodny — parseExamSlotRefs nie odtworzył refów.");
		}
		const serialized = JSON.stringify(configJson);
		// Zakazane KLUCZE w cudzysłowie JSON (parytet z bramką W1 FORBIDDEN_KEYS,
		// tests/unit/exam/exam-ingest-writeside.test.ts): gołe podciągi "correct"/
		// "options" trafiałyby fałszywie na wartości pól (np. conceptSlug zawierający
		// „correct"/„options"). Klucz zawsze serializuje się jako "klucz":.
		for (const forbidden of [
			'"correct"',
			'"stem"',
			'"options"',
			'"answer"',
			'"answer_json"',
			'"answerJson"',
			'"feedbackMd"',
		]) {
			if (serialized.includes(forbidden)) {
				throw new Error(
					`WYCIEK: examSlots niesie zakazane pole '${forbidden}' — klucz/treść nie może wejść do config_json.`,
				);
			}
		}

		// 7) Upsert pozycji egzaminu (kind='exam'). position stabilna: nowa = MAX+1,
		//    przy konflikcie NIE ruszamy position (idempotencja bez churnu).
		const posRes = await client.query<{ next: number }>(
			`SELECT COALESCE(MAX(position), 0) + 1 AS next
			 FROM curriculum_module_items WHERE module_id = $1 AND slug <> $2`,
			[moduleId, EXAM_ITEM_SLUG],
		);
		const nextPosition = posRes.rows[0].next;
		await client.query(
			`INSERT INTO curriculum_module_items
			   (module_id, slug, position, kind, title, content_md, project_id, config_json)
			 VALUES ($1, $2, $3, 'exam', $4, NULL, NULL, $5)
			 ON CONFLICT (module_id, slug) DO UPDATE
			   SET kind = 'exam', title = EXCLUDED.title, config_json = EXCLUDED.config_json,
			       updated_at = now()`,
			[moduleId, EXAM_ITEM_SLUG, nextPosition, EXAM_ITEM_TITLE, JSON.stringify(configJson)],
		);

		// 8) exam_config_json modułu (walidowane schematem wyżej — zła konfig nie wejdzie).
		await client.query(
			"UPDATE curriculum_modules SET exam_config_json = $2, updated_at = now() WHERE id = $1",
			[moduleId, JSON.stringify(examConfig)],
		);

		await client.query("COMMIT");
		return {
			moduleSlug: opts.moduleSlug,
			concepts: distinctConcepts.length,
			itemsInserted: inserted,
			itemsKept: kept,
			itemsRetired: retired,
			slots: bank.slots.length,
			variants: itemRows.length,
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
	const docPath = args[0] ?? DEFAULT_DOC;
	const moduleSlug = args[1] ?? F1_MODULE_SLUG;
	if (!existsSync(docPath)) {
		console.error(`[ingest-exam-bank] STOP: plik nie istnieje: ${docPath}`);
		process.exit(1);
	}
	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL", { allowProduction: true });
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}
	const markdown = readFileSync(docPath, "utf8");
	const stats = await runExamBankIngest(process.env.DATABASE_URL as string, markdown, {
		moduleSlug,
		concepts: F1_CONCEPTS,
		slotCount: F1_SLOT_COUNT,
		examConfig: F1_EXAM_CONFIG,
	});
	console.log(
		`✅ Ingest egzaminu OK: moduł '${stats.moduleSlug}', koncepty=${stats.concepts}, ` +
			`question_items: +${stats.itemsInserted} nowe, ${stats.itemsKept} bez zmian, ` +
			`${stats.itemsRetired} retired; examSlots=${stats.slots} slotów × 2 = ${stats.variants} refów; ` +
			`exam_config_json={questionCount:${F1_EXAM_CONFIG.questionCount}, maxErrors:${F1_EXAM_CONFIG.maxErrors}}.`,
	);
	process.exit(0);
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("ingest-exam-bank");
if (isDirectRun) {
	main().catch((e) => {
		console.error("❌ Ingest egzaminu FAILED:", e instanceof Error ? e.message : String(e));
		process.exit(1);
	});
}
