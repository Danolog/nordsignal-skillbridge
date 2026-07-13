/**
 * content-cyber-projects — wprowadza PROJEKTY cyber do bazy (keyed-by-slug, idempotentnie).
 *
 * Zadanie E2 (Leo, Tech Lead) — narzędzie ingestu projektów cyberbezpieczeństwa do tabel
 * `projects` + `project_competencies` (+ opcjonalnie `project_learning_resources`
 * i `project_source_links`). Wzorzec 1:1 z `tools/content-b3-theory.ts`, z JEDNĄ różnicą:
 * B3 tylko AKTUALIZOWAŁ istniejące projekty (`UPDATE … WHERE slug`), a cyber trzeba też
 * WSTAWIĆ (`INSERT … ON CONFLICT(slug) DO UPDATE` = upsert). Reszta wzorca identyczna.
 *
 * Co robi (per projekt, w JEDNEJ transakcji — idempotentnie i atomowo):
 *   1. UPSERT katalogu: INSERT INTO projects (...) ON CONFLICT (slug) DO UPDATE SET … —
 *      wstawia nowy projekt albo aktualizuje istniejący po `slug` (kolumna unikalna).
 *   2. Replace-per-projekt kompetencji: DELETE FROM project_competencies WHERE project_id = …
 *      (Z KLAUZULĄ WHERE!) + INSERT nowych. Nigdy DELETE bez WHERE.
 *   3. (opcjonalnie) Replace-per-projekt materiałów (project_learning_resources)
 *      i linków źródła (project_source_links), jeśli podane w JSON — jak B3.
 *
 * Walidacja CAŁEGO pliku PRZED dotknięciem bazy (fail-fast):
 *   - kontrakt JSON projektu (slug, level ∈ {L1,L2,L3}, sourceType ∈ {open_data,oss},
 *     estimatedHours > 0, rubricJson suma weight = 100, url-e http/https, type materiału
 *     ∈ {video,docs,course}),
 *   - WALIDATOR NAZW KOMPETENCJI (kluczowa bramka jakości, ryzyko #1 z E1): każda
 *     `competencyName` MUSI być dokładnie liściem ścieżki cyber z `career-model.ts`
 *     (jedno źródło prawdy — `getCyberLeafNames()`). Nazwa spoza zbioru = literówka =
 *     cicha utrata pokrycia matchera. DOMYŚLNIE = ERROR (blokuje ingest, fail-fast);
 *     z flagą `--warn-unknown-competencies` degraduje do WARN (zgodnie z E1 §4.2).
 *
 * BEZPIECZEŃSTWO (ten sam guard co B3 i reszta tooli bazy — tools/assert-test-db.ts):
 *   Host zdalny bez CONFIRM_PROD_DB=1 → ABORT. Fragment "skill-bridge-ai" (baza prod) →
 *   ABORT bezwarunkowo. Domyślnie tylko baza testowa. Connection string NIE jest drukowany.
 *   NIGDY DELETE bez WHERE, NIGDY niszczący db:seed na prod (dotyka wyłącznie slugów z pliku).
 *   Wprowadzanie treści na produkcję wykonuje Ethan (CTO) pod bramkami v1.12 — nie to narzędzie.
 *
 * Connection string z procesu (DATABASE_URL). Załaduj .env.test wcześniej — narzędzie samo
 * go ładuje, jeśli istnieje (NIE nadpisuje już ustawionych env). NIE czyta .env.local (prod).
 *
 * Narzędzie jest OGÓLNE względem ścieżki kariery: domyślnie waliduje nazwy kompetencji
 * wobec liści ścieżki cyber (kompatybilność wsteczna), a `--path "Data Scientist"`
 * przełącza walidację na liście dowolnej ścieżki z career-model.ts (jedno źródło prawdy).
 *
 * Użycie (PowerShell):
 *   pnpm db:migrate:test                                                   # schemat na bazę testową
 *   pnpm exec tsx tools/content-cyber-projects.ts tools/content/cyber-projects.sample.json
 *   pnpm exec tsx tools/content-cyber-projects.ts <plik.json> --warn-unknown-competencies
 *   pnpm exec tsx tools/content-cyber-projects.ts tools/content/ds-projects-partia-1.json --path "Data Scientist"
 */

import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { PATHS } from "../src/lib/db/data/career-model";
import * as schema from "../src/lib/db/schema";
import { assertTestDb } from "./assert-test-db";

// ── Typy kontraktu wejścia (patrz README-cyber-projects.md) ──────────────────
const PROJECT_LEVELS = ["L1", "L2", "L3"] as const;
type ProjectLevel = (typeof PROJECT_LEVELS)[number];

const SOURCE_TYPES = ["open_data", "oss"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

const COMPETENCY_ROLES = ["required", "acquired"] as const;
type CompetencyRole = (typeof COMPETENCY_ROLES)[number];

const RESOURCE_TYPES = ["video", "docs", "course"] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

type CompetencyInput = { name: string; role: CompetencyRole };
type RubricItemInput = { criterion: string; weight: number; description: string };
// Pola license/language/registrationRequired/verifiedAt: dług QG-5 §3/§4/§7 partii 1
// (ADR-014 D4, migracja 0035) — opcjonalne, wypełnia partia naprawcza 1E.R.
type LearningResourceInput = {
	title: string;
	url: string;
	type: ResourceType;
	position?: number;
	license?: string;
	language?: string;
	registrationRequired?: boolean;
	verifiedAt?: string;
};
type SourceLinkInput = { url: string; label?: string; position?: number };

export type CyberProjectInput = {
	slug: string;
	title: string;
	description: string;
	level: ProjectLevel;
	estimatedHours: number;
	sourceType: SourceType;
	sourceUrl: string;
	rubricJson: RubricItemInput[];
	competencies: CompetencyInput[];
	theory_md?: string | null;
	learning_resources?: LearningResourceInput[];
	source_links?: SourceLinkInput[];
};

// ── Walidator nazw kompetencji — KLUCZOWA BRAMKA JAKOŚCI ─────────────────────
// Jedno źródło prawdy: liście ścieżki kariery z career-model.ts (PATHS). Każda
// competencyName w projekcie musi być DOKŁADNIE jednym z liści WYBRANEJ ścieżki
// (E1 §1.2 B), inaczej matcher (dopasowywarka) cicho traci pokrycie luki (ryzyko #1 z E1).
// Narzędzie jest ogólne: domyślnie cyber (kompatybilność wsteczna), a przez CLI
// `--path "Data Scientist"` waliduje wobec liści dowolnej ścieżki (E1 §7.2 spec DS).
const DEFAULT_PATH_LABEL = "Cybersecurity Specialist";

/** Zbiór dokładnych nazw liści (kompetencji) DOWOLNEJ ścieżki kariery z modelu. */
export function getPathLeafNames(pathLabel: string): Set<string> {
	const path = PATHS.find((p) => p.label === pathLabel);
	if (!path) {
		throw new Error(
			`[content-cyber-projects] Krytyczne: brak ścieżki "${pathLabel}" w career-model.ts ` +
				"— walidator nazw kompetencji nie ma na czym pracować. " +
				`Dozwolone etykiety: ${PATHS.map((p) => `"${p.label}"`).join(", ")}.`,
		);
	}
	const names = new Set<string>();
	for (const area of path.areas) {
		for (const leaf of area.leaves ?? []) {
			names.add(leaf.name);
		}
	}
	return names;
}

/** Zbiór liści ścieżki cyber (kompatybilność wsteczna — domyślna ścieżka). */
export function getCyberLeafNames(): Set<string> {
	return getPathLeafNames(DEFAULT_PATH_LABEL);
}

/** Czy nazwa kompetencji jest dokładnym liściem ścieżki (domyślnie cyber). */
export function isKnownCyberCompetency(name: string, known?: Set<string>): boolean {
	return (known ?? getCyberLeafNames()).has(name);
}

// ── Walidacja pól (przed dotknięciem bazy) ──────────────────────────────────
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

function validateResource(r: LearningResourceInput, idx: number): string | null {
	const prefix = `learning_resources[${idx}]`;
	if (typeof r?.title !== "string" || r.title.trim() === "") {
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
	if (r.license !== undefined && (typeof r.license !== "string" || r.license.trim() === "")) {
		return `${prefix}.license musi być niepustym tekstem`;
	}
	if (r.language !== undefined && (typeof r.language !== "string" || r.language.trim() === "")) {
		return `${prefix}.language musi być niepustym tekstem`;
	}
	if (r.registrationRequired !== undefined && typeof r.registrationRequired !== "boolean") {
		return `${prefix}.registrationRequired musi być true/false`;
	}
	if (r.verifiedAt !== undefined) {
		if (typeof r.verifiedAt !== "string" || Number.isNaN(Date.parse(r.verifiedAt))) {
			return `${prefix}.verifiedAt musi być datą ISO (np. "2026-07-11")`;
		}
	}
	return null;
}

function validateSourceLink(s: SourceLinkInput, idx: number): string | null {
	const prefix = `source_links[${idx}]`;
	const urlErr = validateUrl(s?.url);
	if (urlErr) return `${prefix}.${urlErr}`;
	if (s.label !== undefined && typeof s.label !== "string") {
		return `${prefix}.label musi być tekstem`;
	}
	if (s.position !== undefined && (!Number.isInteger(s.position) || (s.position as number) < 0)) {
		return `${prefix}.position musi być liczbą całkowitą ≥ 0`;
	}
	return null;
}

/**
 * Walidacja STRUKTURY jednego projektu (bez nazw kompetencji — te osobno, bo mają
 * własny tryb ERROR/WARN). Zwraca null = OK, string = pierwszy błąd.
 */
export function validateProjectStructure(p: CyberProjectInput, idx: number): string | null {
	if (typeof p?.slug !== "string" || p.slug.trim() === "") {
		return `pozycja [${idx}]: slug jest pusty lub nie jest tekstem`;
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) {
		return `slug "${p.slug}": musi być kebab-case (małe litery, cyfry, myślniki)`;
	}
	if (typeof p.title !== "string" || p.title.trim() === "") {
		return `slug "${p.slug}": title jest pusty lub nie jest tekstem`;
	}
	if (typeof p.description !== "string" || p.description.trim() === "") {
		return `slug "${p.slug}": description jest pusty lub nie jest tekstem`;
	}
	if (!PROJECT_LEVELS.includes(p.level)) {
		return `slug "${p.slug}": level = "${p.level}" — dozwolone: ${PROJECT_LEVELS.join(", ")}`;
	}
	if (!Number.isInteger(p.estimatedHours) || p.estimatedHours <= 0) {
		return `slug "${p.slug}": estimatedHours musi być liczbą całkowitą > 0`;
	}
	if (!SOURCE_TYPES.includes(p.sourceType)) {
		return `slug "${p.slug}": sourceType = "${p.sourceType}" — dozwolone: ${SOURCE_TYPES.join(", ")}`;
	}
	const sourceUrlErr = validateUrl(p.sourceUrl);
	if (sourceUrlErr) return `slug "${p.slug}": sourceUrl — ${sourceUrlErr}`;

	// rubricJson: tablica 1+ kryteriów, suma weight = 100.
	if (!Array.isArray(p.rubricJson) || p.rubricJson.length === 0) {
		return `slug "${p.slug}": rubricJson musi być niepustą tablicą kryteriów`;
	}
	let weightSum = 0;
	for (let i = 0; i < p.rubricJson.length; i++) {
		const c = p.rubricJson[i];
		if (typeof c?.criterion !== "string" || c.criterion.trim() === "") {
			return `slug "${p.slug}": rubricJson[${i}].criterion jest pusty`;
		}
		if (typeof c.weight !== "number" || !Number.isFinite(c.weight)) {
			return `slug "${p.slug}": rubricJson[${i}].weight musi być liczbą`;
		}
		weightSum += c.weight;
	}
	if (weightSum !== 100) {
		return `slug "${p.slug}": suma wag rubricJson = ${weightSum}, musi być 100`;
	}

	// competencies: tablica 1+, każda {name, role}, co najmniej jeden required.
	if (!Array.isArray(p.competencies) || p.competencies.length === 0) {
		return `slug "${p.slug}": competencies musi być niepustą tablicą`;
	}
	let hasRequired = false;
	for (let i = 0; i < p.competencies.length; i++) {
		const c = p.competencies[i];
		if (typeof c?.name !== "string" || c.name.trim() === "") {
			return `slug "${p.slug}": competencies[${i}].name jest pusty`;
		}
		if (!COMPETENCY_ROLES.includes(c.role)) {
			return `slug "${p.slug}": competencies[${i}].role = "${c.role}" — dozwolone: ${COMPETENCY_ROLES.join(", ")}`;
		}
		if (c.role === "required") hasRequired = true;
	}
	if (!hasRequired) {
		return `slug "${p.slug}": co najmniej jedna kompetencja musi mieć role="required"`;
	}

	// theory_md: opcjonalne, ale jeśli podane — string lub null.
	if ("theory_md" in p && p.theory_md !== null && typeof p.theory_md !== "string") {
		return `slug "${p.slug}": theory_md musi być stringiem lub null`;
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
	if (p.source_links !== undefined) {
		if (!Array.isArray(p.source_links)) {
			return `slug "${p.slug}": source_links musi być tablicą`;
		}
		for (let i = 0; i < p.source_links.length; i++) {
			const err = validateSourceLink(p.source_links[i], i);
			if (err) return `slug "${p.slug}": ${err}`;
		}
	}
	return null;
}

/**
 * Walidator NAZW kompetencji (kluczowa bramka). Zwraca listę komunikatów o nazwach
 * spoza zbioru liści cyber. Pusta lista = wszystkie nazwy poprawne.
 */
export function findUnknownCompetencies(
	p: CyberProjectInput,
	known: Set<string> = getCyberLeafNames(),
	pathLabel = "wybranej ścieżki",
): string[] {
	const out: string[] = [];
	for (const c of p.competencies ?? []) {
		if (typeof c?.name === "string" && !known.has(c.name)) {
			out.push(
				`slug "${p.slug}": competencyName "${c.name}" NIE jest liściem ${pathLabel} ` +
					"(literówka? → cicha utrata pokrycia matchera). Przepisz dokładnie jak w career-model.ts.",
			);
		}
	}
	return out;
}

// ── Ingest (transakcja per projekt) — reużywalny przez test integracyjny ─────
export type IngestReport = {
	inserted: number;
	updated: number;
	failed: number;
	competenciesTotal: number;
	resourcesTotal: number;
	sourceLinksTotal: number;
	errors: string[];
};

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Wprowadza listę projektów do bazy (idempotentnie, transakcja per projekt).
 * Zakłada, że wejście przeszło już walidację. Zwraca raport.
 */
export async function ingestCyberProjects(
	db: DrizzleDb,
	input: CyberProjectInput[],
): Promise<IngestReport> {
	const { projects, projectCompetencies, projectLearningResources, projectSourceLinks } = schema;
	const report: IngestReport = {
		inserted: 0,
		updated: 0,
		failed: 0,
		competenciesTotal: 0,
		resourcesTotal: 0,
		sourceLinksTotal: 0,
		errors: [],
	};

	for (const p of input) {
		try {
			await db.transaction(async (tx) => {
				// 1. Czy projekt już istnieje (rozróżnienie inserted vs updated w raporcie)?
				const existing = await tx.query.projects.findFirst({
					where: eq(projects.slug, p.slug),
					columns: { id: true },
				});
				const isUpdate = !!existing;

				// 2. UPSERT katalogu keyed-by-slug → zwraca realny project_id (insert albo update).
				const [row] = await tx
					.insert(projects)
					.values({
						slug: p.slug,
						title: p.title,
						description: p.description,
						level: p.level,
						estimatedHours: p.estimatedHours,
						sourceType: p.sourceType,
						sourceUrl: p.sourceUrl,
						theoryMd: p.theory_md ?? null,
						rubricJson: p.rubricJson,
						// status NIE w SET — przy UPDATE zachowujemy istniejący (np. 'active').
					})
					.onConflictDoUpdate({
						target: projects.slug,
						set: {
							title: p.title,
							description: p.description,
							level: p.level,
							estimatedHours: p.estimatedHours,
							sourceType: p.sourceType,
							sourceUrl: p.sourceUrl,
							theoryMd: p.theory_md ?? null,
							rubricJson: p.rubricJson,
							updatedAt: new Date(),
						},
					})
					.returning({ id: projects.id });
				const projectId = row.id;

				// 3. Replace-per-projekt kompetencji — DELETE z WHERE (nigdy bez!) + INSERT.
				await tx.delete(projectCompetencies).where(eq(projectCompetencies.projectId, projectId));
				if (p.competencies.length > 0) {
					await tx.insert(projectCompetencies).values(
						p.competencies.map((c) => ({
							projectId,
							competencyName: c.name,
							role: c.role,
						})),
					);
					report.competenciesTotal += p.competencies.length;
				}

				// 4. (opcjonalnie) Replace-per-projekt materiałów — tylko gdy klucz podany.
				if (p.learning_resources !== undefined) {
					await tx
						.delete(projectLearningResources)
						.where(eq(projectLearningResources.projectId, projectId));
					if (p.learning_resources.length > 0) {
						await tx.insert(projectLearningResources).values(
							p.learning_resources.map((r) => ({
								projectId,
								title: r.title,
								url: r.url,
								type: r.type,
								position: r.position ?? 0,
								license: r.license ?? null,
								language: r.language ?? null,
								registrationRequired: r.registrationRequired ?? false,
								verifiedAt: r.verifiedAt ? new Date(r.verifiedAt) : null,
							})),
						);
						report.resourcesTotal += p.learning_resources.length;
					}
				}

				// 5. (opcjonalnie) Replace-per-projekt linków źródła — tylko gdy klucz podany.
				if (p.source_links !== undefined) {
					await tx.delete(projectSourceLinks).where(eq(projectSourceLinks.projectId, projectId));
					if (p.source_links.length > 0) {
						await tx.insert(projectSourceLinks).values(
							p.source_links.map((s) => ({
								projectId,
								url: s.url,
								label: s.label ?? null,
								position: s.position ?? 0,
							})),
						);
						report.sourceLinksTotal += p.source_links.length;
					}
				}

				if (isUpdate) report.updated++;
				else report.inserted++;
			});
		} catch (e) {
			report.failed++;
			report.errors.push(
				`slug "${p.slug}": rollback — ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}
	return report;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const warnUnknown = args.includes("--warn-unknown-competencies");

	// Ścieżka kariery, wobec której walidujemy nazwy liści. Domyślnie cyber
	// (kompatybilność wsteczna). Obsługa: `--path "Data Scientist"` i `--path=...`.
	let pathLabel = DEFAULT_PATH_LABEL;
	const positional: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--path") {
			pathLabel = args[i + 1] ?? "";
			i++; // pochłoń wartość (nie jest pozycyjnym argumentem/plikiem)
		} else if (a.startsWith("--path=")) {
			pathLabel = a.slice("--path=".length);
		} else if (!a.startsWith("--")) {
			positional.push(a);
		}
	}
	if (pathLabel.trim() === "") {
		console.error(
			'[content-cyber-projects] STOP: --path wymaga wartości, np. --path "Data Scientist".',
		);
		process.exit(1);
	}
	const jsonPath = positional[0];

	if (!jsonPath) {
		console.error(
			"[content-cyber-projects] STOP: podaj ścieżkę do pliku JSON jako argument.\n" +
				"  pnpm exec tsx tools/content-cyber-projects.ts tools/content/cyber-projects.sample.json\n" +
				'  ścieżka kariery (walidacja liści): --path "Data Scientist" (domyślnie "Cybersecurity Specialist")\n' +
				"  (flaga opcjonalna: --warn-unknown-competencies — nazwa spoza liści ścieżki = WARN zamiast ERROR)",
		);
		process.exit(1);
	}
	if (!existsSync(jsonPath)) {
		console.error(`[content-cyber-projects] STOP: plik nie istnieje: ${jsonPath}`);
		process.exit(1);
	}

	// Załaduj .env.test (jeśli jest) — NIE nadpisuje już-ustawionych env. NIE czyta .env.local.
	if (existsSync(".env.test")) {
		config({ path: ".env.test" });
	} else {
		console.warn(
			"[content-cyber-projects] Brak .env.test — używam DATABASE_URL z procesu (jeśli ustawiona).",
		);
	}

	// Guard bazy: localhost → PASS; zdalny bez flagi → ABORT; skill-bridge-ai → ABORT.
	try {
		assertTestDb(process.env.DATABASE_URL, "DATABASE_URL");
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}

	// Parsowanie JSON.
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
	} catch (e) {
		console.error(
			`[content-cyber-projects] STOP: nie udało się sparsować JSON (${jsonPath}): ` +
				(e instanceof Error ? e.message : String(e)),
		);
		process.exit(1);
	}
	if (!Array.isArray(parsed)) {
		console.error(
			"[content-cyber-projects] STOP: plik wejściowy musi być TABLICĄ obiektów projektów.",
		);
		process.exit(1);
	}
	const input = parsed as CyberProjectInput[];

	// ── Walidacja całego pliku PRZED bazą (fail-fast) ─────────────────────────
	// Zbiór dozwolonych liści z career-model.ts dla WYBRANEJ ścieżki (jedno źródło prawdy).
	let known: Set<string>;
	try {
		known = getPathLeafNames(pathLabel);
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}
	const pathTag = `ścieżki "${pathLabel}"`;
	const structuralErrors: string[] = [];
	const unknownCompetencyMsgs: string[] = [];
	for (let i = 0; i < input.length; i++) {
		const err = validateProjectStructure(input[i], i);
		if (err) structuralErrors.push(err);
		unknownCompetencyMsgs.push(...findUnknownCompetencies(input[i], known, pathTag));
	}

	if (structuralErrors.length > 0) {
		console.error("[content-cyber-projects] STOP: błędy walidacji struktury wejścia:");
		for (const e of structuralErrors) console.error(`  - ${e}`);
		process.exit(1);
	}

	if (unknownCompetencyMsgs.length > 0) {
		const tag = warnUnknown ? "WARN" : "STOP";
		console.error(`[content-cyber-projects] ${tag}: nazwy kompetencji spoza liści ${pathTag}:`);
		for (const m of unknownCompetencyMsgs) console.error(`  - ${m}`);
		if (!warnUnknown) {
			console.error(
				"  → Napraw nazwy (dokładnie jak liście w career-model.ts) albo świadomie uruchom z " +
					"--warn-unknown-competencies. To bramka jakości: literówka = cicha utrata pokrycia matchera.",
			);
			process.exit(1);
		}
	}

	// ── Ingest ─────────────────────────────────────────────────────────────────
	const db = drizzle(process.env.DATABASE_URL as string, { schema });
	const report = await ingestCyberProjects(db, input);

	for (const e of report.errors) console.error(`[content-cyber-projects] BŁĄD ${e}`);
	console.log(
		`[content-cyber-projects] Gotowe. Wstawiono: ${report.inserted}, zaktualizowano: ${report.updated}, ` +
			`błędów: ${report.failed}. Kompetencji: ${report.competenciesTotal}, materiałów: ${report.resourcesTotal}, ` +
			`linków: ${report.sourceLinksTotal}. (connection string NIE drukowany)`,
	);
	process.exit(report.failed > 0 ? 1 : 0);
}

// Uruchom CLI tylko gdy plik wykonywany bezpośrednio (nie przy imporcie w teście).
const invokedDirectly =
	typeof process.argv[1] === "string" && process.argv[1].includes("content-cyber-projects");
if (invokedDirectly) {
	main().catch((err) => {
		console.error(
			"[content-cyber-projects] FAILED:",
			err instanceof Error ? err.message : String(err),
		);
		process.exit(1);
	});
}
