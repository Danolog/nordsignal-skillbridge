/**
 * A5/1.11 — ingest banku pytań (spec v0.2 §5): JSON kuracji → question_concepts
 * + question_items. Idempotentny; egzekwuje NIEMUTOWALNOŚĆ itemów (§2.1 [REV]):
 * poprawka merytoryczna w pliku = stary item przechodzi w 'retired' + wstawiany
 * NOWY (historia is_correct w assessment_answers zostaje audytowalna).
 * Jedyna dozwolona edycja w miejscu: explanationMd (feedback — nie wpływa na ocenę).
 *
 * Tożsamość itemu = hash treści oceniającej (difficulty, type, stem, options,
 * answer). Drugi bieg na tym samym pliku = zero zmian (kept).
 *
 * Użycie (baza testowa/lokalna; prod = [CZERWONA LINIA] — procedura Darka
 * jak ADR-009/010):
 *   pnpm db:ingest-question-bank tools/content/question-bank-ds-partia-1.json
 *
 * Guard: assertTestDb (allowlista localhost; CONFIRM_PROD_DB=1 = świadoma
 * ścieżka operatora). Walidacja struktury PRZED zapisem: content-question-bank.ts
 * (te same reguły co kontrakt-test — plik niekontraktowy nie dotknie bazy).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { assertTestDb } from "./assert-test-db";
import { type QuestionConceptInput, validateConceptStructure } from "./content-question-bank";

/** Kanoniczny hash treści oceniającej itemu (stabilna kolejność pól). */
export function itemContentHash(item: {
	difficulty: number;
	type: string;
	stem: string;
	options: string[] | null;
	answer: Record<string, unknown>;
}): string {
	const canonicalAnswer = Object.fromEntries(
		Object.entries(item.answer).sort(([a], [b]) => a.localeCompare(b)),
	);
	const canonical = JSON.stringify([
		item.difficulty,
		item.type,
		item.stem,
		item.options,
		canonicalAnswer,
	]);
	return createHash("sha256").update(canonical, "utf8").digest("hex");
}

async function main(): Promise<void> {
	const jsonPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
	if (!jsonPath) {
		console.error(
			"[ingest-question-bank] STOP: podaj ścieżkę do pliku JSON.\n" +
				"  pnpm db:ingest-question-bank tools/content/question-bank-ds-partia-1.json",
		);
		process.exit(1);
	}
	if (!existsSync(jsonPath)) {
		console.error(`[ingest-question-bank] STOP: plik nie istnieje: ${jsonPath}`);
		process.exit(1);
	}

	if (existsSync(".env.test")) {
		config({ path: ".env.test" });
	} else {
		console.warn(
			"[ingest-question-bank] Brak .env.test — używam DATABASE_URL z procesu (jeśli ustawiona).",
		);
	}
	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	const concepts = JSON.parse(readFileSync(jsonPath, "utf8")) as QuestionConceptInput[];
	const problems = concepts.flatMap((c) => validateConceptStructure(c, 2));
	if (problems.length > 0) {
		console.error(
			`[ingest-question-bank] STOP: plik nie przechodzi walidacji (${problems.length}):\n` +
				problems.map((p) => `  - ${p}`).join("\n"),
		);
		process.exit(1);
	}

	// Import DB dopiero PO guardzie (nie dotykamy connection poola przed walidacją).
	const { db } = await import("../src/lib/db");
	const { questionConcepts, questionItems } = await import("../src/lib/db/schema");

	let conceptsUpserted = 0;
	let inserted = 0;
	let kept = 0;
	let retired = 0;
	let explanationsUpdated = 0;

	for (const concept of concepts) {
		await db.transaction(async (tx) => {
			const [existing] = await tx
				.select({ id: questionConcepts.id })
				.from(questionConcepts)
				.where(eq(questionConcepts.slug, concept.slug));

			let conceptId: string;
			if (existing) {
				conceptId = existing.id;
				await tx
					.update(questionConcepts)
					.set({
						name: concept.name,
						trunk: concept.trunk,
						competencyName: concept.competencyName ?? null,
						diagnostic: concept.diagnostic,
						status: "active",
						updatedAt: new Date(),
					})
					.where(eq(questionConcepts.id, conceptId));
			} else {
				const [created] = await tx
					.insert(questionConcepts)
					.values({
						slug: concept.slug,
						name: concept.name,
						trunk: concept.trunk,
						competencyName: concept.competencyName ?? null,
						diagnostic: concept.diagnostic,
					})
					.returning({ id: questionConcepts.id });
				conceptId = created.id;
			}
			conceptsUpserted++;

			// Synchronizacja itemów po hashu treści (niemutowalność).
			const dbItems = await tx
				.select()
				.from(questionItems)
				.where(and(eq(questionItems.conceptId, conceptId), eq(questionItems.status, "active")));
			const dbByHash = new Map(
				dbItems.map((row) => [
					itemContentHash({
						difficulty: row.difficulty,
						type: row.type,
						stem: row.stem,
						options: Array.isArray(row.optionsJson) ? (row.optionsJson as string[]) : null,
						answer: row.answerJson as Record<string, unknown>,
					}),
					row,
				]),
			);

			const fileHashes = new Set<string>();
			for (const item of concept.items) {
				const hash = itemContentHash({
					difficulty: item.difficulty,
					type: item.type,
					stem: item.stem,
					options: item.options ?? null,
					answer: item.answer,
				});
				fileHashes.add(hash);
				const match = dbByHash.get(hash);
				if (match) {
					kept++;
					const newExplanation = item.explanationMd ?? null;
					if (match.explanationMd !== newExplanation) {
						await tx
							.update(questionItems)
							.set({ explanationMd: newExplanation, updatedAt: new Date() })
							.where(eq(questionItems.id, match.id));
						explanationsUpdated++;
					}
				} else {
					await tx.insert(questionItems).values({
						conceptId,
						difficulty: item.difficulty,
						type: item.type,
						stem: item.stem,
						optionsJson: item.options ?? null,
						answerJson: item.answer,
						explanationMd: item.explanationMd ?? null,
					});
					inserted++;
				}
			}

			// Aktywne itemy nieobecne w pliku → retire (poprawka = retire + nowy).
			for (const [hash, row] of dbByHash) {
				if (!fileHashes.has(hash)) {
					await tx
						.update(questionItems)
						.set({ status: "retired", updatedAt: new Date() })
						.where(eq(questionItems.id, row.id));
					retired++;
				}
			}
		});
	}

	console.log(
		`[ingest-question-bank] OK: koncepty ${conceptsUpserted}, itemy: +${inserted} nowe, ` +
			`${kept} bez zmian (w tym ${explanationsUpdated} aktualizacji explanationMd), ${retired} retired.`,
	);
	process.exit(0);
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("ingest-question-bank");
if (isDirectRun) {
	main().catch((e) => {
		console.error("[ingest-question-bank] BŁĄD:", e instanceof Error ? e.message : String(e));
		process.exit(1);
	});
}
