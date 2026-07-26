/**
 * 1E.1c + 1E.2 — Ingest curriculum: struktura drabiny (curriculum-ds-drabina.json)
 * + treść atomów i bank pytań foundations (tools/content/curriculum-atoms/*.json).
 *
 * IDEMPOTENTNY (drugi bieg = identyczny stan logiczny):
 *  - moduły: upsert po slug (wraz z tagiem placementu 1E.7 — patrz niżej),
 *  - pozycje: upsert po (module_id, slug) — ustalenie wiążące z przeglądu
 *    Ethana po 1E.1: slug to TOŻSAMOŚĆ pozycji, position TYLKO sortuje.
 *    NIGDY nie kasuje pozycji (mogą mieć postęp studentów; usunięcie =
 *    świadoma migracja, nie ingest),
 *  - bank pytań: koncepty foundations upsert po slug; itemy po hashu treści
 *    oceniającej (NIEMUTOWALNOŚĆ jak ingest-question-bank: poprawka
 *    merytoryczna = retire + NOWY item; w miejscu wolno edytować tylko
 *    explanation_md i option_feedback_json),
 *  - config_json.questionItemIds pozycji wyliczany z banku przy KAŻDYM biegu
 *    (refy treści → id itemów) — walidacja „istnieje i active" z konstrukcji
 *    + defensywny strażnik na końcu transakcji,
 *  - path_modules + prereqs: DELETE per ścieżka/moduły + reinsert (czyste
 *    definicje bez FK od danych studenta; prereqi = ŁAŃCUCH z kolejności).
 * Wszystko w JEDNEJ transakcji.
 *
 * STRAŻNIK TREŚCI POD POSTĘPEM (ustalenie wiążące #1): zmiana kind albo
 * zestawu questionItemIds pozycji, która MA już postęp studentów
 * (curriculum_item_progress / curriculum_item_answers), wymaga jawnego
 * CONFIRM_CONTENT_MIGRATION=1 — wstawienie atomu w środek modułu nie
 * podmieni treści pod postępem przez przypadek.
 *
 * RECOMPUTE module_progress (ustalenie wiążące #2, decyzja Darka 2026-07-11):
 * moduł ze statusem completed (verified_by_method IS NULL), który dostał
 * nowe pozycje, wraca na in_progress (downgrade jawnie raportowany).
 * Zaliczenia egzaminem/placementem (1E.3/1E.7) pozostają nietknięte.
 *
 * Guard assertTestDb (wzorzec ingest-career-model): host lokalny przechodzi;
 * zdalny (prod/Neon) wymaga CONFIRM_PROD_DB=1 — na prodzie odpala Darek
 * [CZERWONA LINIA ADR-010], po backupie gałęzią Neona:
 *   CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum
 *
 * TAG PLACEMENTU (1E.7 L1): pole `diagnosticConcept` modułu w manifeście drabiny
 * (slug konceptu rynkowego albo jawny null) trafia do
 * curriculum_modules.diagnostic_concept_id. Rozwiązanie sluga → id ma KONTRAKT
 * TWARDY: slug spoza banku albo koncept bez `trunk='market' AND diagnostic=true`
 * przerywa ingest wyjątkiem, nigdy nie daje cichego NULL
 * (`resolveDiagnosticConceptId`). NULL w bazie znaczy „nie zmierzyliśmy", nie
 * „student nie umie" — reguła prefiksowa L2 na tym stoi.
 *
 * Kolejność na prod (lekcja „migracja przed deploy"): najpierw migracja
 * (0035/0036, od 1E.7 także 0044), potem bank rynkowy
 * (`db:ingest-question-bank tools/content/question-bank-ds-partia-1.json` —
 * PREREKWIZYT tagów placementu), potem ten ingest, dopiero potem flaga.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";
import { parseExamSlotRefs } from "../src/lib/assessment/exam";
import { assertTestDb } from "./assert-test-db";
import {
	type AtomItemInput,
	type AtomModuleContent,
	type AtomQuestionInput,
	validateContentSet,
} from "./content-curriculum-atoms";
import { itemContentHash } from "./ingest-question-bank";
import { MODULY_BRAMKOWANE, sprawdzBramkeSrodowiska } from "./srodowisko-colab";

/** Kanoniczny JSON (klucze sortowane rekurencyjnie) — porównania niezależne
 * od kolejności kluczy JSONB Postgresa (jsonb sortuje klucze po swojemu). */
function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value === "object" && value !== null) {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value);
}

config({ path: ".env.local" });
config({ path: ".env" });

const LADDER_PATH = join(process.cwd(), "tools", "content", "curriculum-ds-drabina.json");
const ATOMS_DIR = join(process.cwd(), "tools", "content", "curriculum-atoms");

export type LadderItem = {
	slug: string;
	position: number;
	kind: string;
	title: string;
	projectSlug?: string;
	contentMd?: string;
	configJson?: Record<string, unknown>;
};
export type LadderModule = {
	slug: string;
	title: string;
	description?: string;
	/**
	 * 1E.7 L1 — tag placementu: slug konceptu DIAGNOSTYCZNEGO (pień rynkowy,
	 * `trunk='market' AND diagnostic=true`) albo jawny `null` = „nie zmierzyliśmy".
	 * Brak klucza ingest traktuje jak `null`; obecności klucza na KAŻDYM module
	 * pilnuje kontrakt-test (`tests/unit/ds/curriculum-placement-tagi.contract.test.ts`)
	 * — podział ról za wymogiem Sophii: „brak wpisu = błąd konfiguracji do
	 * wyłapania kontrakt-testem, jawny NULL = decyzja". Pole jest opcjonalne
	 * w TYPIE, bo `Ladder` budują też syntetyczne fixture'y testów integracyjnych.
	 */
	diagnosticConcept?: string | null;
	items: LadderItem[];
};
export type Ladder = { path: string; modules: LadderModule[] };

/** Pozycja w formie wspólnej dla drabiny i treści — jedno miejsce upsertu. */
type ResolvedItem = {
	slug: string;
	position: number;
	kind: string;
	title: string;
	contentMd: string | null;
	projectId: string | null;
	configJson: Record<string, unknown> | null;
	conceptSlugs: string[];
	resources: NonNullable<AtomItemInput["resources"]>;
};

function readContentFiles(): AtomModuleContent[] {
	if (!existsSync(ATOMS_DIR)) return [];
	const files = readdirSync(ATOMS_DIR)
		.filter((f) => f.endsWith(".json"))
		.sort();
	return files.map((f) => JSON.parse(readFileSync(join(ATOMS_DIR, f), "utf8")));
}

/**
 * Bank pytań foundations: upsert konceptów + synchronizacja itemów po hashu
 * treści (niemutowalność). Zwraca mapę ref → question_item_id.
 */
/**
 * Id itemów zarejestrowanych w JAKIEJKOLWIEK pozycji egzaminu
 * (curriculum_module_items kind='exam' → config_json.examSlots). 1E.3 finding W1
 * (bramka Leo): warianty egzaminu to OSOBNE źródło (tools/ingest-exam-bank →
 * question_items pod TYM SAMYM concept_id co atomy), więc trafiają do dbByHash
 * konceptu, a ich treść NIE jest w plikach atomów — retire poniżej zretire'owałby
 * pytania egzaminu. Zbieramy je raz i wykluczamy z retire.
 */
async function loadExamRegisteredItemIds(client: PoolClient): Promise<Set<string>> {
	const res = await client.query<{ config_json: Record<string, unknown> | null }>(
		"SELECT config_json FROM curriculum_module_items WHERE kind = 'exam'",
	);
	const ids = new Set<string>();
	for (const row of res.rows) {
		const slots = parseExamSlotRefs(row.config_json);
		if (!slots) continue;
		for (const s of slots) for (const v of s.variants) ids.add(v.itemId);
	}
	return ids;
}

async function syncQuestionBank(
	client: PoolClient,
	contents: AtomModuleContent[],
): Promise<{ idByRef: Map<string, string>; stats: string }> {
	// Itemy egzaminu (osobne źródło) — zebrane raz, wykluczone z retire (W1).
	const examItemIds = await loadExamRegisteredItemIds(client);
	const conceptNames = new Map<string, string>();
	const questionsByConcept = new Map<string, AtomQuestionInput[]>();
	for (const c of contents) {
		for (const item of c.items) {
			for (const concept of item.concepts ?? []) conceptNames.set(concept.slug, concept.name);
			for (const q of item.questions ?? []) {
				const list = questionsByConcept.get(q.conceptSlug) ?? [];
				list.push(q);
				questionsByConcept.set(q.conceptSlug, list);
			}
		}
	}

	const idByRef = new Map<string, string>();
	let conceptsUpserted = 0;
	let inserted = 0;
	let kept = 0;
	let retired = 0;
	let feedbackUpdated = 0;

	for (const [slug, name] of conceptNames) {
		const existing = await client.query<{ id: string; trunk: string }>(
			"SELECT id, trunk FROM question_concepts WHERE slug = $1",
			[slug],
		);
		let conceptId: string;
		if (existing.rows.length > 0) {
			if (existing.rows[0].trunk !== "foundations") {
				throw new Error(
					`Koncept '${slug}' istnieje w banku z trunk='${existing.rows[0].trunk}' — ` +
						`kolizja z konceptem rynkowym, ingest przerwany (kontrakt)`,
				);
			}
			conceptId = existing.rows[0].id;
			await client.query(
				"UPDATE question_concepts SET name = $2, status = 'active', updated_at = now() WHERE id = $1",
				[conceptId, name],
			);
		} else {
			const created = await client.query<{ id: string }>(
				`INSERT INTO question_concepts (slug, name, trunk, diagnostic)
				 VALUES ($1, $2, 'foundations', false) RETURNING id`,
				[slug, name],
			);
			conceptId = created.rows[0].id;
		}
		conceptsUpserted++;

		// Synchronizacja itemów po hashu treści oceniającej (jak ingest-question-bank).
		const dbItems = await client.query<{
			id: string;
			difficulty: number;
			type: string;
			stem: string;
			options_json: unknown;
			answer_json: Record<string, unknown>;
			explanation_md: string | null;
			option_feedback_json: unknown;
		}>("SELECT * FROM question_items WHERE concept_id = $1 AND status = 'active'", [conceptId]);
		const dbByHash = new Map(
			dbItems.rows.map((row) => [
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

		const fileHashes = new Set<string>();
		for (const q of questionsByConcept.get(slug) ?? []) {
			const hash = itemContentHash({
				difficulty: q.difficulty,
				type: q.type,
				stem: q.stem,
				options: q.options ?? null,
				answer: q.answer,
			});
			fileHashes.add(hash);
			const match = dbByHash.get(hash);
			if (match) {
				idByRef.set(q.ref, match.id);
				kept++;
				const newFeedback = q.optionFeedback ? canonicalJson(q.optionFeedback) : null;
				const oldFeedback = match.option_feedback_json
					? canonicalJson(match.option_feedback_json)
					: null;
				if (match.explanation_md !== q.explanationMd || oldFeedback !== newFeedback) {
					await client.query(
						`UPDATE question_items SET explanation_md = $2, option_feedback_json = $3,
						 updated_at = now() WHERE id = $1`,
						[match.id, q.explanationMd, newFeedback],
					);
					feedbackUpdated++;
				}
			} else {
				const created = await client.query<{ id: string }>(
					`INSERT INTO question_items
					   (concept_id, difficulty, type, stem, options_json, answer_json,
					    explanation_md, option_feedback_json)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
					[
						conceptId,
						q.difficulty,
						q.type,
						q.stem,
						q.options ? JSON.stringify(q.options) : null,
						JSON.stringify(q.answer),
						q.explanationMd,
						q.optionFeedback ? JSON.stringify(q.optionFeedback) : null,
					],
				);
				idByRef.set(q.ref, created.rows[0].id);
				inserted++;
			}
		}

		// Aktywne itemy konceptu nieobecne w treści → retire (poprawka = retire+nowy).
		// 1E.3 W1 (bramka Leo): itemy egzaminu dzielą concept_id z atomami, więc
		// wpadają do dbByHash, a ich treści NIE ma w plikach atomów — retire je pominął
		// (examItemIds), inaczej ingest treści zretire'owałby pytania egzaminu (i odwrotnie).
		for (const [hash, row] of dbByHash) {
			if (!fileHashes.has(hash) && !examItemIds.has(row.id)) {
				await client.query(
					"UPDATE question_items SET status = 'retired', updated_at = now() WHERE id = $1",
					[row.id],
				);
				retired++;
			}
		}
	}

	return {
		idByRef,
		stats:
			`koncepty=${conceptsUpserted}, pytania: +${inserted} nowe, ${kept} bez zmian ` +
			`(w tym ${feedbackUpdated} aktualizacji feedbacku), ${retired} retired`,
	};
}

/**
 * 1E.7 L1 — rozwiązanie tagu placementu modułu: slug → id konceptu diagnostycznego.
 *
 * KONTRAKT TWARDY (ten sam wzorzec co strażnik kolizji pni wyżej i strażnik
 * capstone'ów niżej): literówka w slugu albo koncept spoza zbioru diagnozy
 * PRZERYWA ingest wyjątkiem. Nigdy ciche `NULL` — ciche NULL po cichu wyłączyłoby
 * placement dla modułu, a `NULL` w tej kolumnie znaczy „nie zmierzyliśmy" (decyzja
 * produktowa), więc literówka podszyłaby się pod świadomą decyzję i wyszłaby
 * dopiero na pilotażu, na żywym studencie.
 *
 * Warunek `trunk='market' AND diagnostic=true` jest ten sam, którym diagnoza
 * dobiera pytania — tag spoza tego zbioru nigdy nie dostałby poziomu w
 * `result_json`, więc byłby tagiem-atrapą blokującym moduł na zawsze.
 *
 * KOLEJNOŚĆ NA PROD: bank rynkowy (`db:ingest-question-bank`) MUSI wejść przed
 * tym ingestem — inaczej strażnik słusznie przerwie na pierwszym tagu.
 */
async function resolveDiagnosticConceptId(
	client: PoolClient,
	moduleSlug: string,
	conceptSlug: string | null | undefined,
): Promise<string | null> {
	if (conceptSlug === null || conceptSlug === undefined) return null;
	const { rows } = await client.query<{ id: string; trunk: string; diagnostic: boolean }>(
		"SELECT id, trunk, diagnostic FROM question_concepts WHERE slug = $1",
		[conceptSlug],
	);
	if (rows.length === 0) {
		throw new Error(
			`Moduł '${moduleSlug}': tag diagnostyczny '${conceptSlug}' nie istnieje w banku ` +
				`konceptów — ingest przerwany (kontrakt 1E.7). Sprawdź literówkę w manifeście ` +
				`drabiny albo zaciągnij bank rynkowy PRZED tym ingestem: ` +
				`pnpm db:ingest-question-bank tools/content/question-bank-ds-partia-1.json`,
		);
	}
	const { id, trunk, diagnostic } = rows[0];
	if (trunk !== "market" || diagnostic !== true) {
		throw new Error(
			`Moduł '${moduleSlug}': tag diagnostyczny '${conceptSlug}' ma trunk='${trunk}', ` +
				`diagnostic=${diagnostic} — wymagane trunk='market' ORAZ diagnostic=true ` +
				`(diagnoza pyta wyłącznie o taki zbiór; tag spoza niego nigdy nie dostanie ` +
				`poziomu i zablokowałby moduł na stałe). Ingest przerwany (kontrakt 1E.7).`,
		);
	}
	return id;
}

/** Strażnik treści pod postępem: wykrywa zmiany kind/questionItemIds. */
async function assertNoContentMigrationUnderProgress(
	client: PoolClient,
	moduleId: string,
	moduleSlug: string,
	incoming: ResolvedItem[],
): Promise<void> {
	if (process.env.CONFIRM_CONTENT_MIGRATION === "1") return;
	const existing = await client.query<{
		slug: string;
		kind: string;
		config_json: Record<string, unknown> | null;
		has_progress: boolean;
	}>(
		`SELECT i.slug, i.kind, i.config_json,
		        (EXISTS (SELECT 1 FROM curriculum_item_progress p WHERE p.item_id = i.id)
		         OR EXISTS (SELECT 1 FROM curriculum_item_answers a WHERE a.item_id = i.id))
		        AS has_progress
		 FROM curriculum_module_items i WHERE i.module_id = $1`,
		[moduleId],
	);
	const bySlug = new Map(existing.rows.map((r) => [r.slug, r]));
	const violations: string[] = [];
	for (const item of incoming) {
		const row = bySlug.get(item.slug);
		if (!row || !row.has_progress) continue;
		const oldIds = JSON.stringify((row.config_json?.questionItemIds as string[]) ?? []);
		const newIds = JSON.stringify((item.configJson?.questionItemIds as string[]) ?? []);
		if (row.kind !== item.kind) {
			violations.push(`${moduleSlug}/${item.slug}: kind ${row.kind} → ${item.kind}`);
		} else if (oldIds !== newIds) {
			violations.push(`${moduleSlug}/${item.slug}: zmiana zestawu questionItemIds`);
		}
	}
	if (violations.length > 0) {
		throw new Error(
			`Pozycje z postępem studentów zmieniają kind/questionItemIds:\n` +
				violations.map((v) => `  - ${v}`).join("\n") +
				`\nTo świadoma migracja treści — potwierdź: CONFIRM_CONTENT_MIGRATION=1 (ustalenie wiążące 1E.2).`,
		);
	}
}

export type IngestStats = {
	modules: number;
	items: number;
	prereqs: number;
	bank: string;
	contentFiles: number;
	downgraded: number;
};

/**
 * Rdzeń ingestu (eksport pod testy integracyjne — wzorzec content-cyber-projects):
 * walidacja treści + JEDNA transakcja struktura/bank/pozycje/recompute.
 * Rzuca Error zamiast process.exit — CLI (main) tłumaczy na kod wyjścia.
 */
export async function runCurriculumIngest(
	databaseUrl: string,
	ladder: Ladder,
	contents: AtomModuleContent[],
): Promise<IngestStats> {
	// STRAŻNIK BAZY STOI TU, nie tylko w main() (dług C1 z przeglądu Leo, 1E.7 L2):
	// to ta funkcja otwiera Pool i pisze, a woła ją także test integracyjny —
	// guard wyłącznie w CLI zostawiał realną ścieżkę zapisu bez ochrony.
	// main() woła go powtórnie (fail-fast przed czytaniem plików) — guard jest
	// idempotentny i bez efektów ubocznych, więc podwójne wywołanie nic nie kosztuje.
	assertTestDb(databaseUrl, "DATABASE_URL");

	// Walidacja treści PRZED dotknięciem bazy (plik niekontraktowy nie wejdzie).
	const problems = validateContentSet(contents);
	const ladderSlugs = new Set(ladder.modules.map((m) => m.slug));
	for (const c of contents) {
		if (!ladderSlugs.has(c.moduleSlug)) {
			problems.push(`plik treści wskazuje moduł spoza drabiny: "${c.moduleSlug}"`);
		}
	}
	if (problems.length > 0) {
		throw new Error(
			`Treść atomów nie przechodzi walidacji (${problems.length}):\n` +
				problems.map((p) => `  - ${p}`).join("\n"),
		);
	}
	const contentByModule = new Map(contents.map((c) => [c.moduleSlug, c]));

	const pool = new Pool({ connectionString: databaseUrl });
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		// 1) Bank pytań foundations (koncepty + itemy) → mapa ref → id.
		const { idByRef, stats: bankStats } = await syncQuestionBank(client, contents);

		const moduleIdBySlug = new Map<string, string>();
		let itemsUpserted = 0;
		let downgraded = 0;

		for (const module_ of ladder.modules) {
			// 1E.7 L1 — tag placementu rozwiązany PRZED upsertem: zły slug wywala
			// ingest w całości (transakcja), zamiast wpisać moduł bez mostu.
			const diagnosticConceptId = await resolveDiagnosticConceptId(
				client,
				module_.slug,
				module_.diagnosticConcept,
			);
			const { rows } = await client.query<{ id: string }>(
				`INSERT INTO curriculum_modules (slug, title, description, diagnostic_concept_id)
				 VALUES ($1, $2, $3, $4)
				 ON CONFLICT (slug) DO UPDATE
				   SET title = EXCLUDED.title, description = EXCLUDED.description,
				       diagnostic_concept_id = EXCLUDED.diagnostic_concept_id, updated_at = now()
				 RETURNING id`,
				[module_.slug, module_.title, module_.description ?? null, diagnosticConceptId],
			);
			const moduleId = rows[0].id;
			moduleIdBySlug.set(module_.slug, moduleId);

			// 2) Pozycje = capstone'y z drabiny + atomy z treści (wspólny upsert po slugu).
			const resolved: ResolvedItem[] = [];
			for (const item of module_.items) {
				let projectId: string | null = null;
				if (item.kind === "project") {
					if (!item.projectSlug) {
						throw new Error(`Pozycja project bez projectSlug: ${module_.slug}/${item.slug}`);
					}
					const project = await client.query<{ id: string }>(
						"SELECT id FROM projects WHERE slug = $1",
						[item.projectSlug],
					);
					if (project.rows.length === 0) {
						throw new Error(
							`Capstone '${item.projectSlug}' nie istnieje w projects — ingest przerwany (kontrakt)`,
						);
					}
					projectId = project.rows[0].id;
				}
				resolved.push({
					slug: item.slug,
					position: item.position,
					kind: item.kind,
					title: item.title,
					contentMd: item.contentMd ?? null,
					projectId,
					configJson: item.configJson ?? null,
					conceptSlugs: [],
					resources: [],
				});
			}
			for (const item of contentByModule.get(module_.slug)?.items ?? []) {
				const questionItemIds = (item.questions ?? []).map((q) => {
					const id = idByRef.get(q.ref);
					if (!id) throw new Error(`Brak id w banku dla pytania ${q.ref} (niemożliwe po syncu)`);
					return id;
				});
				for (const ref of item.questionRefs ?? []) {
					const id = idByRef.get(ref);
					if (!id) {
						throw new Error(
							`${module_.slug}/${item.slug}: questionRef '${ref}' nie rozwiązuje się w banku`,
						);
					}
					questionItemIds.push(id);
				}
				const configJson: Record<string, unknown> = { ...(item.config ?? {}) };
				if (questionItemIds.length > 0) configJson.questionItemIds = questionItemIds;
				if (item.hints) configJson.hints = item.hints;
				resolved.push({
					slug: item.slug,
					position: item.position,
					kind: item.kind,
					title: item.title,
					contentMd: item.contentMd,
					projectId: null,
					configJson: Object.keys(configJson).length > 0 ? configJson : null,
					conceptSlugs: (item.concepts ?? []).map((c) => c.slug),
					resources: item.resources ?? [],
				});
			}
			const slugsInModule = new Set(resolved.map((r) => r.slug));
			if (slugsInModule.size !== resolved.length) {
				throw new Error(`Moduł ${module_.slug}: kolizja slugów pozycji drabina↔treść`);
			}

			// 3) Strażnik: treść pod postępem nie zmienia się bez jawnego potwierdzenia.
			await assertNoContentMigrationUnderProgress(client, moduleId, module_.slug, resolved);

			// 4) Reorder bez kolizji z UNIQUE(module_id, position): pozycje
			//    upsertowanych slugów najpierw w przestrzeń ujemną, potem docelowe.
			await client.query(
				`UPDATE curriculum_module_items SET position = -position - 1000000
				 WHERE module_id = $1 AND slug = ANY($2)`,
				[moduleId, [...slugsInModule]],
			);

			for (const item of resolved) {
				const { rows: upserted } = await client.query<{ id: string }>(
					`INSERT INTO curriculum_module_items
					   (module_id, slug, position, kind, title, content_md, project_id, config_json)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
					 ON CONFLICT (module_id, slug) DO UPDATE
					   SET position = EXCLUDED.position, kind = EXCLUDED.kind,
					       title = EXCLUDED.title, content_md = EXCLUDED.content_md,
					       project_id = EXCLUDED.project_id, config_json = EXCLUDED.config_json,
					       updated_at = now()
					 RETURNING id`,
					[
						moduleId,
						item.slug,
						item.position,
						item.kind,
						item.title,
						item.contentMd,
						item.projectId,
						item.configJson ? JSON.stringify(item.configJson) : null,
					],
				);
				const itemId = upserted[0].id;
				itemsUpserted++;

				// 5) Mapowanie na koncepty banku + zasoby (definicje: delete+reinsert).
				await client.query("DELETE FROM curriculum_item_concepts WHERE item_id = $1", [itemId]);
				for (const conceptSlug of item.conceptSlugs) {
					await client.query(
						`INSERT INTO curriculum_item_concepts (item_id, concept_id)
						 SELECT $1, id FROM question_concepts WHERE slug = $2`,
						[itemId, conceptSlug],
					);
				}
				await client.query("DELETE FROM curriculum_item_resources WHERE item_id = $1", [itemId]);
				for (const [ri, r] of item.resources.entries()) {
					await client.query(
						`INSERT INTO curriculum_item_resources
						   (item_id, title, url, type, license, language, registration_required,
						    verified_at, position)
						 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
						[
							itemId,
							r.title,
							r.url,
							r.type,
							r.license ?? null,
							r.language ?? null,
							r.registrationRequired ?? false,
							r.verifiedAt ?? null,
							ri,
						],
					);
				}
			}

			// 6) Recompute module_progress (decyzja Darka 2026-07-11): completed bez
			//    pełnego pokrycia pozycji → in_progress; egzamin/placement nietknięte.
			const recompute = await client.query(
				`UPDATE curriculum_module_progress mp
				 SET status = 'in_progress', completed_at = NULL, updated_at = now()
				 WHERE mp.module_id = $1 AND mp.status = 'completed'
				   AND mp.verified_by_method IS NULL
				   AND EXISTS (
				     SELECT 1 FROM curriculum_module_items i
				     WHERE i.module_id = mp.module_id
				       AND NOT EXISTS (
				         SELECT 1 FROM curriculum_item_progress p
				         WHERE p.item_id = i.id AND p.student_id = mp.student_id
				           AND p.status IN ('completed','skipped_by_placement')
				       )
				   )`,
				[moduleId],
			);
			downgraded += recompute.rowCount ?? 0;
		}

		// Ścieżka: delete+reinsert (czyste definicje; unikaty (path,position) bez
		// konfliktów przy zmianie kolejności).
		await client.query("DELETE FROM curriculum_path_modules WHERE path_key = $1", [ladder.path]);
		for (const [index, module_] of ladder.modules.entries()) {
			await client.query(
				"INSERT INTO curriculum_path_modules (path_key, module_id, position) VALUES ($1, $2, $3)",
				[ladder.path, moduleIdBySlug.get(module_.slug), index + 1],
			);
		}

		// Prereqi: łańcuch liniowy z kolejności (pilot — ADR-014 D3).
		const moduleIds = ladder.modules.map((m) => moduleIdBySlug.get(m.slug));
		await client.query("DELETE FROM curriculum_module_prereqs WHERE module_id = ANY($1)", [
			moduleIds,
		]);
		for (let i = 1; i < moduleIds.length; i++) {
			await client.query(
				"INSERT INTO curriculum_module_prereqs (module_id, requires_module_id) VALUES ($1, $2)",
				[moduleIds[i], moduleIds[i - 1]],
			);
		}

		// Defensywny strażnik (ustalenie wiążące #3): każdy questionItemId w
		// config_json pozycji ingestowanych modułów istnieje w banku i jest active.
		const broken = await client.query<{ slug: string; qid: string }>(
			`SELECT i.slug, qid.value AS qid
			 FROM curriculum_module_items i
			 CROSS JOIN LATERAL jsonb_array_elements_text(i.config_json->'questionItemIds') qid
			 LEFT JOIN question_items q ON q.id = qid.value::uuid
			 WHERE i.module_id = ANY($1)
			   AND (q.id IS NULL OR q.status <> 'active')`,
			[moduleIds],
		);
		if (broken.rows.length > 0) {
			throw new Error(
				`Pozycje wskazują pytania spoza banku albo retired:\n` +
					broken.rows.map((r) => `  - ${r.slug}: ${r.qid}`).join("\n"),
			);
		}

		await client.query("COMMIT");
		return {
			modules: ladder.modules.length,
			items: itemsUpserted,
			prereqs: moduleIds.length - 1,
			bank: bankStats,
			contentFiles: contents.length,
			downgraded,
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
	assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
	const ladder = JSON.parse(readFileSync(LADDER_PATH, "utf8")) as Ladder;
	const wszystkie = readContentFiles();
	// ── ADR-016 D4 — bramka publikacji, druga (i skuteczniejsza) połowa ──────
	// ADR zakłada, że odmowa PAKOWANIA blokuje ingest. Blokuje tylko wtedy, gdy
	// ktoś przed ingestem repakuje — a spakowane JSON-y leżą w repo i ingest
	// weźmie je nawet bez repacku. Dlatego ta sama bramka stoi TU, przy jedynym
	// kroku, który naprawdę dotyka produkcji (świadome wzmocnienie, Eva 2026-07-22).
	const bramka = sprawdzBramkeSrodowiska();
	const wstrzymane = wszystkie.filter((c) => MODULY_BRAMKOWANE.test(c.moduleSlug));
	const contents = bramka.ok
		? wszystkie
		: wszystkie.filter((c) => !MODULY_BRAMKOWANE.test(c.moduleSlug));
	if (!bramka.ok) {
		console.error(`\n❌ BRAMKA ŚRODOWISKA ZAMKNIĘTA [${bramka.powod}] — ADR-016 D4`);
		console.error(`   ${bramka.komunikat}`);
		console.error(
			`   WSTRZYMANE moduły (${wstrzymane.length}): ` +
				`${wstrzymane.map((c) => c.moduleSlug).join(", ")}\n` +
				"   Pozostałe moduły ingest przetwarza normalnie (dług treści musi dać się " +
				"naprawić mimo starej sondy). Kod wyjścia 1 — automat się zatrzymuje.\n",
		);
	}
	const stats = await runCurriculumIngest(process.env.DATABASE_URL as string, ladder, contents);
	console.log(
		`✅ Ingest curriculum OK: ścieżka '${ladder.path}', moduły=${stats.modules}, ` +
			`pozycje=${stats.items}, prereqi=${stats.prereqs} (łańcuch liniowy)\n` +
			`   bank: ${stats.bank}\n` +
			`   treść: pliki=${stats.contentFiles}, recompute module_progress: ` +
			`${stats.downgraded} downgrade(ów) completed→in_progress`,
	);
	if (!bramka.ok) {
		console.error(
			`\n⚠ Ingest ZAKOŃCZONY CZĘŚCIOWO: moduły M-* pominięte (bramka ADR-016 D4: ` +
				`${bramka.powod}). Treść tych modułów na produkcji pozostaje w poprzedniej wersji.`,
		);
		process.exit(1);
	}
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("ingest-curriculum");
if (isDirectRun) {
	main().catch((error) => {
		console.error("❌ Ingest curriculum FAILED:", error);
		process.exit(1);
	});
}
