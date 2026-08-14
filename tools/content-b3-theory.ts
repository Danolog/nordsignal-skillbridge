/**
 * content-b3-theory — wprowadza treść TEORII B3 do bazy (keyed-by-slug, idempotentnie).
 *
 * Krok A pętli partii 1 (Leo, Tech Lead). Narzędzie:
 *   - czyta plik JSON (ścieżka jako argument CLI) — kanoniczny kontrakt opisany
 *     w tools/content/README-b3-theory.md, wzorzec: tools/content/b3-theory.sample.json,
 *   - dla każdego projektu (po `slug`):
 *       · UPDATE projects.theory_md  WHERE slug = …   (kolumna z migracji 0016),
 *       · replace-per-projekt materiałów: DELETE wszystkich project_learning_resources
 *         tego projektu + INSERT podanych na nowo (tabela z migracji 0016),
 *     całość w JEDNEJ transakcji per projekt → idempotentnie i atomowo,
 *   - waliduje: slug istnieje w katalogu (seed-projects.ts) inaczej skip+warn,
 *     url to http/https, type ∈ {video,docs,course}.
 *
 * BEZPIECZEŃSTWO (PR #60):
 *   Idzie przez ten sam guard co reszta tooli bazy — tools/assert-test-db.ts.
 *   Host zdalny bez CONFIRM_PROD_DB=1 → ABORT. Fragment "skill-bridge-ai"
 *   (baza produkcyjna) → ABORT bezwarunkowo. Wprowadzanie treści na produkcję
 *   to czerwona linia Darka — nie robi tego to narzędzie.
 *
 * Connection string z procesu (DATABASE_URL). Załaduj .env.test wcześniej —
 * narzędzie samo go ładuje, jeśli istnieje (NIE nadpisuje już ustawionych env).
 * NIE czyta .env.local (prod).
 *
 * Użycie (PowerShell):
 *   pnpm db:migrate:test                                          # schemat na bazę testową
 *   pnpm exec tsx tools/content-b3-theory.ts tools/content/b3-theory.sample.json
 *
 * Connection string NIE jest drukowany (bezpieczeństwo — patrz seed-e2e.ts).
 */

import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { DEMO_PROJECTS } from "../src/lib/db/seed-projects";
import { assertTestDb } from "./assert-test-db";

// ── Typy kontraktu wejścia (patrz README-b3-theory.md) ──────────────────────
const RESOURCE_TYPES = ["video", "docs", "course"] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

type LearningResourceInput = {
	title: string;
	url: string;
	type: ResourceType;
	position?: number;
};

type ProjectTheoryInput = {
	slug: string;
	theory_md: string | null;
	learning_resources?: LearningResourceInput[];
};

// Zbiór dozwolonych slugów = katalog projektów (jedno źródło prawdy).
const KNOWN_SLUGS = new Set(DEMO_PROJECTS.map((p) => p.slug));

/** Walidacja URL: tylko http/https. Zwraca null = OK, string = komunikat błędu. */
function validateUrl(url: string): string | null {
	if (typeof url !== "string" || url.trim() === "") return "url jest pusty";
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return `url ma niedozwolony schemat "${parsed.protocol}" (dozwolone: http/https)`;
		}
	} catch {
		return `url nie jest poprawnym adresem: "${url}"`;
	}
	return null;
}

/** Walidacja jednego materiału. Zwraca null = OK, string = pierwszy błąd. */
function validateResource(r: LearningResourceInput, idx: number): string | null {
	const prefix = `learning_resources[${idx}]`;
	if (typeof r.title !== "string" || r.title.trim() === "") {
		return `${prefix}.title jest pusty lub nie jest tekstem`;
	}
	const urlErr = validateUrl(r.url);
	if (urlErr) return `${prefix}.${urlErr}`;
	if (!RESOURCE_TYPES.includes(r.type)) {
		return `${prefix}.type = "${r.type}" — dozwolone: ${RESOURCE_TYPES.join(", ")}`;
	}
	if (r.position !== undefined && (!Number.isInteger(r.position) || (r.position as number) < 0)) {
		return `${prefix}.position musi być liczbą całkowitą ≥ 0`;
	}
	return null;
}

/** Walidacja jednego wpisu projektu (przed dotknięciem bazy). */
function validateProject(p: ProjectTheoryInput, idx: number): string | null {
	if (typeof p?.slug !== "string" || p.slug.trim() === "") {
		return `pozycja [${idx}]: slug jest pusty lub nie jest tekstem`;
	}
	// theory_md: musi być obecne (string lub null). Brak pola = błąd (świadoma decyzja w README).
	if (!("theory_md" in p) || (p.theory_md !== null && typeof p.theory_md !== "string")) {
		return `slug "${p.slug}": theory_md musi być stringiem lub null (pole wymagane)`;
	}
	if (p.learning_resources !== undefined) {
		if (!Array.isArray(p.learning_resources)) {
			return `slug "${p.slug}": learning_resources musi być tablicą`;
		}
		for (let i = 0; i < p.learning_resources.length; i++) {
			const err = validateResource(p.learning_resources[i], i);
			if (err) return `slug "${p.slug}": ${err}`;
		}
	}
	return null;
}

async function main(): Promise<void> {
	// ── Ścieżka pliku JSON z argumentu CLI ────────────────────────────────────
	const jsonPath = process.argv[2];
	if (!jsonPath) {
		console.error(
			"[content-b3-theory] STOP: podaj ścieżkę do pliku JSON jako argument.\n" +
				"  pnpm exec tsx tools/content-b3-theory.ts tools/content/b3-theory.sample.json",
		);
		process.exit(1);
	}
	if (!existsSync(jsonPath)) {
		console.error(`[content-b3-theory] STOP: plik nie istnieje: ${jsonPath}`);
		process.exit(1);
	}

	// ── Załaduj .env.test (jeśli jest) — NIE nadpisuje już-ustawionych env. ───
	if (existsSync(".env.test")) {
		config({ path: ".env.test" });
	} else {
		console.warn(
			"[content-b3-theory] Brak .env.test — używam DATABASE_URL z procesu (jeśli ustawiona).",
		);
	}

	// ── Guard #60: allowlista localhost; zdalny→ABORT; skill-bridge-ai→ABORT. ─
	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL", { allowProduction: true });
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	// ── Parsowanie JSON ───────────────────────────────────────────────────────
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
	} catch (e) {
		console.error(
			`[content-b3-theory] STOP: nie udało się sparsować JSON (${jsonPath}): ` +
				(e instanceof Error ? e.message : String(e)),
		);
		process.exit(1);
	}
	if (!Array.isArray(parsed)) {
		console.error("[content-b3-theory] STOP: plik wejściowy musi być TABLICĄ obiektów projektów.");
		process.exit(1);
	}
	const input = parsed as ProjectTheoryInput[];

	// ── Walidacja całego pliku PRZED dotknięciem bazy (fail-fast). ────────────
	const validationErrors: string[] = [];
	for (let i = 0; i < input.length; i++) {
		const err = validateProject(input[i], i);
		if (err) validationErrors.push(err);
	}
	if (validationErrors.length > 0) {
		console.error("[content-b3-theory] STOP: błędy walidacji wejścia:");
		for (const e of validationErrors) console.error(`  - ${e}`);
		process.exit(1);
	}

	const db = drizzle(process.env.DATABASE_URL as string, { schema });
	const { projects, projectLearningResources } = schema;

	let applied = 0;
	let skipped = 0;
	let resourcesTotal = 0;

	for (const p of input) {
		// Walidacja istnienia sluga w katalogu (seed-projects.ts) → skip+warn.
		if (!KNOWN_SLUGS.has(p.slug)) {
			console.warn(
				`[content-b3-theory] SKIP: slug "${p.slug}" nie istnieje w katalogu projektów (seed-projects.ts).`,
			);
			skipped++;
			continue;
		}

		// Transakcja per projekt: UPDATE theory_md + replace-per-projekt zasobów.
		// Albo całość, albo nic — błąd jednego projektu nie psuje pozostałych.
		try {
			await db.transaction(async (tx) => {
				// 1. Znajdź projekt po slug (potrzebny realny project_id do FK).
				const proj = await tx.query.projects.findFirst({
					where: eq(projects.slug, p.slug),
					columns: { id: true },
				});
				// Slug jest w katalogu, ale nie ma go w tej bazie (nie zaseedowana) → skip.
				if (!proj) {
					throw new SkipRow(
						`slug "${p.slug}" jest w katalogu, ale brak go w bazie — uruchom seed (pnpm db:seed) na bazie testowej.`,
					);
				}

				// 2. UPDATE theory_md (keyed-by-slug; id użyte tylko do FK zasobów).
				await tx
					.update(projects)
					.set({ theoryMd: p.theory_md, updatedAt: new Date() })
					.where(eq(projects.id, proj.id));

				// 3. Replace-per-projekt: usuń istniejące materiały, wstaw nowe.
				await tx
					.delete(projectLearningResources)
					.where(eq(projectLearningResources.projectId, proj.id));

				const resources = p.learning_resources ?? [];
				if (resources.length > 0) {
					await tx.insert(projectLearningResources).values(
						resources.map((r) => ({
							projectId: proj.id,
							title: r.title,
							url: r.url,
							type: r.type,
							position: r.position ?? 0,
						})),
					);
					resourcesTotal += resources.length;
				}
			});
			applied++;
			console.log(
				`[content-b3-theory] OK: ${p.slug} (theory_md ${
					p.theory_md === null ? "→ NULL" : `${p.theory_md.length} znaków`
				}, materiały: ${(p.learning_resources ?? []).length})`,
			);
		} catch (e) {
			if (e instanceof SkipRow) {
				console.warn(`[content-b3-theory] SKIP: ${e.message}`);
				skipped++;
				continue;
			}
			// Transakcja wycofana (rollback) — projekt nie został zmieniony.
			console.error(
				`[content-b3-theory] BŁĄD projektu "${p.slug}" (rollback, projekt niezmieniony): ` +
					(e instanceof Error ? e.message : String(e)),
			);
			process.exitCode = 1;
		}
	}

	console.log(
		`[content-b3-theory] Gotowe. Zastosowano: ${applied}, pominięto: ${skipped}, ` +
			`materiałów wstawionych: ${resourcesTotal}. (connection string NIE drukowany)`,
	);
	process.exit(process.exitCode ?? 0);
}

/** Sygnał wewnętrzny: wycofaj transakcję, ale potraktuj jako SKIP nie błąd. */
class SkipRow extends Error {}

main().catch((err) => {
	console.error("[content-b3-theory] FAILED:", err instanceof Error ? err.message : String(err));
	process.exit(1);
});
