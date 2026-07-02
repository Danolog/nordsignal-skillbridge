/**
 * remediate-duplicate-submissions — czyszczenie zduplikowanych project_submissions
 * (student_id, project_id) PRZED nałożeniem unikatu w zadaniu 0.2b.
 *
 * KONTEKST: src/app/api/projects/[id]/submit/route.ts robi dziś
 * find-then-write ("findFirst" → UPDATE gdy istnieje, INSERT gdy nie) BEZ
 * unikatu na poziomie bazy — dwa równoległe zgłoszenia tego samego studenta
 * dla tego samego projektu mogą oba przejść "nie istnieje" i oba wstawić
 * osobny wiersz (wyścig TOCTOU). 0.2b dokłada UNIQUE(student_id, project_id)
 * + onConflictDoUpdate, żeby to zamknąć na stałe — ale UNIQUE nie nałoży się,
 * jeśli duplikaty już istnieją. To narzędzie usuwa je najpierw.
 *
 * STRATEGIA WYBORU REKORDU KANONICZNEGO per grupa (student_id, project_id),
 * malejący priorytet:
 *   1. Rekord z powiązaną submission_reviews (decyzja człowieka).
 *   2. Rekord z powiązaną project_reflections (refleksja studenta).
 *   3. Najpóźniejszy updated_at (najbardziej aktualny stan).
 *   4. Remis: najpóźniejszy created_at, potem najniższe id (deterministyczny
 *      tiebreak — powtarzalny wynik przy ponownym uruchomieniu).
 *
 * OCHRONA DZIECI (audyt Fable 5, ODRZUCONE — naprawione): wybór jednego
 * "kanonicznego" rekordu NIE oznacza, że dzieci pozostałych rekordów wolno
 * bezpowrotnie skasować kaskadą. Przed DELETE każdy submission_reviews /
 * project_reflections należący do rekordu kasowanego jest PRZEPINANY
 * (UPDATE submission_id) na rekord kanoniczny, jeśli ten go jeszcze nie ma.
 * Jeśli w JEDNEJ grupie więcej niż jeden rekord ma dziecko tego samego typu
 * (np. dwie osobne refleksje) — nie da się tego scalić automatycznie bez
 * utraty danych, więc CAŁA operacja ABORTuje z listą konfliktów do ręcznej
 * analizy (findConflicts / applyRemediation rzuca przed jakimkolwiek zapisem).
 *
 * BEZPIECZEŃSTWO: ten sam guard co reszta narzędzi bazy (tools/assert-test-db.ts).
 * Host zdalny bez CONFIRM_PROD_DB=1 → ABORT. Fragment "skill-bridge-ai" (prod) →
 * ABORT bezwarunkowo nawet z flagą. Domyślnie DRY-RUN (tylko raport, tagi
 * [review]/[reflection] przy każdym id) — wymaga jawnej flagi --execute.
 * Wykonanie przelicza plan NA ŚWIEŻO wewnątrz jednej transakcji (nie używa
 * planu z dry-run) — zamyka lukę wyścigu między raportem a zapisem. Weryfikacja
 * końcowa (0 pozostałych duplikatów) przed COMMIT.
 *
 * TESTY: rankCandidates/findConflicts mają czyste testy jednostkowe
 * (tools/__tests__/remediate-duplicate-submissions.test.ts) — po 0.2b
 * (UNIQUE(student_id, project_id), drizzle/0021) nie da się już wstawić do
 * project_submissions dwóch rekordów tej samej pary przez zwykły INSERT, więc
 * scenariusze priorytetu/konfliktu nie są odtwarzalne integracyjnie na w pełni
 * zmigrowanej bazie. Integration test (bez duplikatów) zostaje jako dowód
 * przewodowy do prawdziwych tabel/kolumn.
 *
 * [CZERWONA LINIA gdy prod] — na bazie produkcyjnej to modyfikacja realnych
 * danych zgłoszeń. Uruchamia Darek osobiście (CONFIRM_PROD_DB=1), po backupie
 * gałęzią Neona, tak jak dotychczasowe operacje na prod DB.
 *
 * Użycie:
 *   pnpm exec tsx tools/remediate-duplicate-submissions.ts                    (dry-run, lokalna baza)
 *   pnpm exec tsx tools/remediate-duplicate-submissions.ts --execute          (wykonanie, lokalna baza)
 *   CONFIRM_PROD_DB=1 pnpm exec tsx tools/remediate-duplicate-submissions.ts --execute   (prod, ręcznie przez Darka)
 */

import { existsSync } from "node:fs";
import { config } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { assertTestDb } from "./assert-test-db";

type Db = NodePgDatabase<typeof schema>;

export type RemediationPlanItem = {
	studentId: string;
	projectId: string;
	keepId: string;
	deleteIds: string[];
	/** Id-y w CAŁEJ grupie (keeper + kasowane), które mają powiązany submission_reviews. */
	reviewSubmissionIds: string[];
	/** Id-y w CAŁEJ grupie (keeper + kasowane), które mają powiązany project_reflections. */
	reflectionSubmissionIds: string[];
};

export type RemediationConflict = {
	studentId: string;
	projectId: string;
	childType: "review" | "reflection";
	submissionIds: string[];
};

export type CandidateForRanking = {
	id: string;
	hasReview: boolean;
	hasReflection: boolean;
	updatedAt: Date;
	createdAt: Date;
};

/**
 * Sortuje kandydatów wg priorytetu wyboru rekordu kanonicznego (patrz docstring
 * pliku): submission_reviews > project_reflections > najpóźniejszy updated_at >
 * najpóźniejszy created_at > najniższe id. Pierwszy element wyniku = keeper.
 *
 * Czysta funkcja (bez bazy) — testowana bezpośrednio jednostkowo, ponieważ po
 * 0.2b (UNIQUE(student_id, project_id), drizzle/0021) nie da się już wstawić
 * do project_submissions dwóch rekordów z tą samą parą przez zwykły INSERT —
 * scenariusze priorytetu nie są więc odtwarzalne integracyjnie na żywej bazie.
 */
export function rankCandidates<T extends CandidateForRanking>(candidates: T[]): T[] {
	return [...candidates].sort((a, b) => {
		if (a.hasReview !== b.hasReview) return a.hasReview ? -1 : 1;
		if (a.hasReflection !== b.hasReflection) return a.hasReflection ? -1 : 1;
		const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
		if (updatedDiff !== 0) return updatedDiff;
		const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
		if (createdDiff !== 0) return createdDiff;
		if (a.id < b.id) return -1;
		if (a.id > b.id) return 1;
		return 0;
	});
}

/** Grupy (student_id, project_id) z więcej niż jednym zgłoszeniem. */
export async function findDuplicateGroups(
	db: Db,
): Promise<{ studentId: string; projectId: string }[]> {
	const rows = await db
		.select({
			studentId: schema.projectSubmissions.studentId,
			projectId: schema.projectSubmissions.projectId,
		})
		.from(schema.projectSubmissions)
		.groupBy(schema.projectSubmissions.studentId, schema.projectSubmissions.projectId)
		.having(sql`count(*) > 1`);
	return rows;
}

/** Liczba grup (student_id, project_id), które nadal mają >1 zgłoszenie. */
export async function countDuplicateGroups(db: Db): Promise<number> {
	const groups = await findDuplicateGroups(db);
	return groups.length;
}

/** Buduje plan remediacji: co zachować, co skasować, gdzie są dzieci — bez zapisu do bazy. */
export async function planRemediation(db: Db): Promise<RemediationPlanItem[]> {
	const groups = await findDuplicateGroups(db);
	const plan: RemediationPlanItem[] = [];

	for (const group of groups) {
		const candidates = await db
			.select({
				id: schema.projectSubmissions.id,
				hasReview: sql<boolean>`${schema.submissionReviews.id} IS NOT NULL`,
				hasReflection: sql<boolean>`${schema.projectReflections.id} IS NOT NULL`,
				updatedAt: schema.projectSubmissions.updatedAt,
				createdAt: schema.projectSubmissions.createdAt,
			})
			.from(schema.projectSubmissions)
			.leftJoin(
				schema.submissionReviews,
				eq(schema.submissionReviews.submissionId, schema.projectSubmissions.id),
			)
			.leftJoin(
				schema.projectReflections,
				eq(schema.projectReflections.submissionId, schema.projectSubmissions.id),
			)
			.where(
				and(
					eq(schema.projectSubmissions.studentId, group.studentId),
					eq(schema.projectSubmissions.projectId, group.projectId),
				),
			);

		const ranked = rankCandidates(candidates);
		const [canonical, ...rest] = ranked;
		if (!canonical) continue; // grupa zniknęła między zapytaniami — nic do zrobienia
		plan.push({
			studentId: group.studentId,
			projectId: group.projectId,
			keepId: canonical.id,
			deleteIds: rest.map((r) => r.id),
			reviewSubmissionIds: candidates.filter((c) => c.hasReview).map((c) => c.id),
			reflectionSubmissionIds: candidates.filter((c) => c.hasReflection).map((c) => c.id),
		});
	}

	return plan;
}

/**
 * Grupy, w których więcej niż jeden rekord ma dziecko tego samego typu — nie
 * da się automatycznie scalić bez utraty danych (np. dwie osobne refleksje).
 * Niepusty wynik = applyRemediation MUSI odmówić zapisu.
 */
export function findConflicts(plan: RemediationPlanItem[]): RemediationConflict[] {
	const conflicts: RemediationConflict[] = [];
	for (const item of plan) {
		if (item.reviewSubmissionIds.length > 1) {
			conflicts.push({
				studentId: item.studentId,
				projectId: item.projectId,
				childType: "review",
				submissionIds: item.reviewSubmissionIds,
			});
		}
		if (item.reflectionSubmissionIds.length > 1) {
			conflicts.push({
				studentId: item.studentId,
				projectId: item.projectId,
				childType: "reflection",
				submissionIds: item.reflectionSubmissionIds,
			});
		}
	}
	return conflicts;
}

function formatConflicts(conflicts: RemediationConflict[]): string {
	return conflicts
		.map(
			(c) =>
				`(student=${c.studentId}, project=${c.projectId}, ${c.childType}: ${c.submissionIds.join(", ")})`,
		)
		.join("; ");
}

/**
 * Kasuje rekordy nie-kanoniczne z planu. PRZED kasowaniem przepina dzieci
 * (submission_reviews / project_reflections) należące do kasowanych rekordów
 * na rekord kanoniczny, żeby kaskada onDelete nie zabrała ich bezpowrotnie.
 * Rzuca (bez żadnego zapisu), jeśli plan zawiera konflikt (findConflicts) —
 * wywołujący MUSI zawinąć to w transakcję, żeby rzut w połowie pętli cofnął
 * już wykonane przepięcia/usunięcia.
 */
export async function applyRemediation(db: Db, plan: RemediationPlanItem[]): Promise<number> {
	const conflicts = findConflicts(plan);
	if (conflicts.length > 0) {
		throw new Error(
			`Konflikt remediacji — więcej niż jeden rekord w grupie ma dziecko tego samego typu, ` +
				`nie da się automatycznie scalić: ${formatConflicts(conflicts)}. Wymagana ręczna analiza.`,
		);
	}

	let deleted = 0;
	for (const item of plan) {
		const reviewOwner = item.reviewSubmissionIds[0];
		if (reviewOwner && reviewOwner !== item.keepId) {
			await db
				.update(schema.submissionReviews)
				.set({ submissionId: item.keepId })
				.where(eq(schema.submissionReviews.submissionId, reviewOwner));
		}
		const reflectionOwner = item.reflectionSubmissionIds[0];
		if (reflectionOwner && reflectionOwner !== item.keepId) {
			await db
				.update(schema.projectReflections)
				.set({ submissionId: item.keepId })
				.where(eq(schema.projectReflections.submissionId, reflectionOwner));
		}

		if (item.deleteIds.length === 0) continue;
		const result = await db
			.delete(schema.projectSubmissions)
			.where(inArray(schema.projectSubmissions.id, item.deleteIds))
			.returning({ id: schema.projectSubmissions.id });
		deleted += result.length;
	}
	return deleted;
}

function tagFor(item: RemediationPlanItem, id: string): string {
	const tags: string[] = [];
	if (item.reviewSubmissionIds.includes(id)) tags.push("review");
	if (item.reflectionSubmissionIds.includes(id)) tags.push("reflection");
	return tags.length > 0 ? `[${tags.join(",")}]` : "[-]";
}

async function main() {
	const execute = process.argv.includes("--execute");

	// Załaduj .env (lokalna baza dev) — NIE nadpisuje już-ustawionych env
	// (dzięki temu $env:DATABASE_URL ustawiony ręcznie przez Darka na prod działa).
	if (existsSync(".env")) {
		config({ path: ".env" });
	} else {
		console.warn(
			"[remediate-duplicate-submissions] Brak .env — używam DATABASE_URL z procesu (jeśli ustawiona).",
		);
	}

	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	const db = drizzle(process.env.DATABASE_URL as string, { schema });

	const plan = await planRemediation(db);
	if (plan.length === 0) {
		console.log(
			"[remediate-duplicate-submissions] Brak duplikatów (student_id, project_id) — nic do zrobienia.",
		);
		process.exit(0);
	}

	let totalToDelete = 0;
	for (const item of plan) {
		totalToDelete += item.deleteIds.length;
		console.log(
			`  grupa (student=${item.studentId}, project=${item.projectId}): ` +
				`zachowuję ${item.keepId}${tagFor(item, item.keepId)}, ` +
				`${execute ? "usuwam" : "usunąłbym"}: ` +
				item.deleteIds.map((id) => `${id}${tagFor(item, id)}`).join(", "),
		);
	}
	console.log(
		`[remediate-duplicate-submissions] ${plan.length} grup(y) z duplikatami, ${totalToDelete} rekordów do usunięcia.`,
	);

	const conflicts = findConflicts(plan);
	if (conflicts.length > 0) {
		console.error(
			`[remediate-duplicate-submissions] KONFLIKT — nie da się automatycznie scalić: ${formatConflicts(conflicts)}`,
		);
		console.error(
			"[remediate-duplicate-submissions] STOP — napraw ręcznie (np. usuń/scal duplikat dziecka) przed ponownym uruchomieniem.",
		);
		process.exit(1);
	}

	if (!execute) {
		console.log(
			"[remediate-duplicate-submissions] DRY-RUN — nic nie zmieniono. Uruchom z --execute, aby wykonać.",
		);
		process.exit(0);
	}

	try {
		const deleted = await db.transaction(async (tx) => {
			// Plan przeliczony NA ŚWIEŻO wewnątrz transakcji (nie plan z dry-run powyżej) —
			// zamyka wyścig między raportem a zapisem (audyt Fable 5, punkt 2).
			const freshPlan = await planRemediation(tx);
			const n = await applyRemediation(tx, freshPlan);
			const remaining = await countDuplicateGroups(tx);
			if (remaining > 0) {
				throw new Error(
					`Po usunięciu nadal istnieje ${remaining} grup(y) z duplikatami — ROLLBACK.`,
				);
			}
			return n;
		});
		console.log(
			`[remediate-duplicate-submissions] Usunięto ${deleted} zduplikowanych rekordów. COMMIT.`,
		);
	} catch (e) {
		console.error(
			"[remediate-duplicate-submissions] FAILED (ROLLBACK):",
			e instanceof Error ? e.message : String(e),
		);
		process.exit(1);
	}
}

// Uruchom CLI tylko gdy plik wykonywany bezpośrednio (nie przy imporcie w teście).
const invokedDirectly =
	typeof process.argv[1] === "string" &&
	process.argv[1].includes("remediate-duplicate-submissions");
if (invokedDirectly) {
	main().catch((err) => {
		console.error(
			"[remediate-duplicate-submissions] FAILED:",
			err instanceof Error ? err.message : String(err),
		);
		process.exit(1);
	});
}
