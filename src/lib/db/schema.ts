import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	real,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// Better Auth tables
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Multi-tenancy (K3) — each tenant is a university campus. Seeded in 0005.
// tenant_id is denormalised onto student-data tables (0006) so RLS policies
// stay JOIN-free; see docs/security/rls-matrix.md + docs/data/tenant-mapping-beta.md.
export const tenants = pgTable(
	"tenants",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_tenants_slug").on(table.slug)],
);

// SkillBridge AI domain tables

export const competencyStatusEnum = pgEnum("competency_status", [
	"acquired",
	"in_progress",
	"missing",
]);

export const gapPriorityEnum = pgEnum("gap_priority", ["critical", "important", "nice_to_have"]);

// Project Marketplace enums

export const projectLevelEnum = pgEnum("project_level", ["L1", "L2", "L3", "L4", "L5"]);

export const projectSourceTypeEnum = pgEnum("project_source_type", [
	"open_data",
	"oss",
	"partner",
	"ngo",
	"faculty",
]);

export const projectCompetencyRoleEnum = pgEnum("project_competency_role", [
	"required",
	"acquired",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
	"in_progress",
	"submitted",
	"verified",
	"rejected",
]);

export const students = pgTable(
	"students",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		// K3 multi-tenancy: nullable + backfill in 0006, SET NOT NULL in 0007.
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		university: text("university").notNull(),
		fieldOfStudy: text("field_of_study").notNull(),
		semester: integer("semester").notNull(),
		careerGoal: text("career_goal").notNull(),
		syllabusText: text("syllabus_text"),
		onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
		// Resume onboarding (migracja 0017): high-water-mark „dokąd doszedł kreator".
		// 0–5 = kroki wizarda (0 Cel kariery → 5 Wnioski). Tylko ROŚNIE (GREATEST),
		// nigdy nie cofa się o krok. Niezależny od onboardingCompleted: step mówi
		// „gdzie wznowić", completed mówi „czy w ogóle zakończony" (zapalany wyłącznie
		// przez POST /api/onboarding/complete). DEFAULT 0 = non-breaking backfill.
		onboardingStep: smallint("onboarding_step").notNull().default(0),
		// B0: znacznik domknięcia Pomocnika Wyboru Kariery (NULL = nieukończony).
		// Gate dla Phase 2 (reset Pomocnika z dashboardu) — zerowy koszt teraz.
		careerHelperCompletedAt: timestamp("career_helper_completed_at", { withTimezone: true }),
		// AG.6 (RODO, decyzja Darka 2026-07-08): zgoda opt-in na POWIADOMIENIA
		// o monitoringu rynku. Sam recompute luk (AG.5) to rdzeń usługi i działa
		// niezależnie — zgoda bramkuje wyłącznie pokazywanie powiadomień.
		// decidedAt NULL = nigdy nie pytany (dashboard pokazuje kartę zgody);
		// wypełniony = decyzja zapadła (consent mówi jaka). Zgoda odwoływalna
		// (ponowny POST consent) — wspólny moduł zgód przyjdzie z 1.17.
		marketMonitoringConsent: boolean("market_monitoring_consent").notNull().default(false),
		marketMonitoringDecidedAt: timestamp("market_monitoring_decided_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_students_user_id").on(table.userId),
		index("idx_students_tenant_id").on(table.tenantId),
		// CHECK na onboardingStep: baza odrzuca wartości spoza 0–5 (jak self_assessment).
		check("students_onboarding_step_range", sql`${table.onboardingStep} BETWEEN 0 AND 5`),
	],
);

export const competencies = pgTable(
	"competencies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		name: text("name").notNull(),
		status: competencyStatusEnum("status").notNull().default("acquired"),
		marketPercentage: integer("market_percentage"),
		// B4 — Samoocena kompetencji (migracja 0015).
		// selfAssessment: NULL = nieocenione; 1–4 = poziom deklarowany przez studenta.
		// Mapowanie poziom→status przy zapisie (decyzja Darka 2026-06-01):
		//   1 → 'missing', 2 → 'in_progress', 3 → 'acquired', 4 → 'acquired', NULL → 'missing'
		// app_faculty NIE widzi tej kolumny (izolacja R1, migracja 0015 część 2).
		selfAssessment: smallint("self_assessment"),
		// verifiedByMethod: 'self' (samoocena z onboardingu) | 'diagnostic'
		// (A5/1.10, migracja 0029 — wynik testu adaptacyjnego, silnik w 1.11,
		// wpięcie w onboarding w 1.12). DEFAULT 'self' — backfill bezpieczny.
		// app_faculty NIE widzi tej kolumny (deny-by-default, jak selfAssessment).
		verifiedByMethod: text("verified_by_method").notNull().default("self"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_competencies_student_id").on(table.studentId),
		index("idx_competencies_tenant_id").on(table.tenantId),
		// CHECK na selfAssessment: baza odrzuca wartości spoza 1–4 (Drizzle generuje jako constraint)
		check(
			"competencies_self_assessment_range",
			sql`${table.selfAssessment} IS NULL OR ${table.selfAssessment} BETWEEN 1 AND 4`,
		),
		// CHECK na verifiedByMethod: A5/1.10 otwiera 'diagnostic' (test adaptacyjny);
		// lista miękka (CHECK, nie enum PG — odwracalność jak reviewer_type).
		check(
			"competencies_verified_by_method_values",
			sql`${table.verifiedByMethod} IN ('self','diagnostic')`,
		),
	],
);

export const gaps = pgTable(
	"gaps",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		competencyName: text("competency_name").notNull(),
		priority: gapPriorityEnum("priority").notNull().default("important"),
		marketPercentage: integer("market_percentage").notNull().default(0),
		estimatedHours: integer("estimated_hours").notNull().default(5),
		whyImportant: text("why_important"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_gaps_student_id").on(table.studentId),
		index("idx_gaps_tenant_id").on(table.tenantId),
	],
);

export const skillMaps = pgTable(
	"skill_maps",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.unique()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		nodes: jsonb("nodes").notNull().default([]),
		edges: jsonb("edges").notNull().default([]),
		generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_skill_maps_tenant_id").on(table.tenantId)],
);

export const passports = pgTable(
	"passports",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.unique()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		marketCoveragePercent: integer("market_coverage_percent").notNull().default(0),
		// B1/RODO: publiczne udostępnianie tylko za świadomą zgodą studenta.
		// public_enabled domyślnie false (paszport niepubliczny); share_token =
		// niezgadywalny identyfikator publiczny (zamiast enumerowanego PK).
		publicEnabled: boolean("public_enabled").notNull().default(false),
		shareToken: text("share_token").unique(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_passports_tenant_id").on(table.tenantId),
		index("idx_passports_share_token").on(table.shareToken),
	],
);

export const jobMarketData = pgTable(
	"job_market_data",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		careerGoal: text("career_goal").notNull(),
		competencyName: text("competency_name").notNull(),
		demandPercentage: integer("demand_percentage").notNull(),
		category: text("category").notNull(),
		salaryRange: text("salary_range"),
	},
	(table) => [index("idx_job_market_career_goal").on(table.careerGoal)],
);

// 1.0 — Model kariery w DB (career-model.json → wersjonowany artefakt).
//
// Tabela GLOBALNA (jak job_market_data): bez tenant_id, read-only dla ról
// aplikacyjnych (GRANT SELECT w migracji 0022 — wzorzec 0008). `content` to
// DOKŁADNE bajty artefaktu ETL (test akceptacyjny 1.0: model z DB bajtowo
// identyczny z JSON w repo) — świadomie text, nie jsonb (jsonb normalizuje
// klucze/duplikaty i gubi formatowanie, więc łamie bajtową identyczność).
// Wersjonowanie: nowy ingest = nowy wiersz + przełączenie is_active w jednej
// transakcji; częściowy unikalny indeks pilnuje JEDNEGO aktywnego wiersza.
// Normalizacja do encji (curriculum 1E.1, kuracja D17) = osobne zadania,
// które FK-ują do wersji artefaktu, nie do blobów wewnątrz.
export const careerModelVersions = pgTable(
	"career_model_versions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		/** Snapshot źródła z _meta (np. "2026-02") — identyfikacja wersji dla ludzi. */
		snapshot: text("snapshot").notNull(),
		/** Źródło z _meta (np. "JustJoinIT"). */
		source: text("source").notNull(),
		/** SHA-256 (hex) bajtów `content` — idempotencja ingestu i szybkie porównanie. */
		checksum: text("checksum").notNull().unique(),
		/** Dokładne bajty career-model.json (źródło prawdy po migracji z repo). */
		content: text("content").notNull(),
		isActive: boolean("is_active").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		// Dokładnie jeden aktywny wiersz (indeks częściowy tylko po is_active = true).
		uniqueIndex("uq_career_model_versions_active")
			.on(table.isActive)
			.where(sql`${table.isActive} = true`),
	],
);

// AG.3 — Potok miesięcznego odświeżania rynku (upload CSV → ETL → STAGING + diff).
//
// [CZERWONA LINIA — dane prod]: ingest pisze WYŁĄCZNIE tutaj; `job_market_data`
// zostaje nietknięta do czasu akceptacji Darka i transakcyjnego swapu (AG.4).
// Obie tabele BEZ grantów dla ról aplikacyjnych (odwrotnie niż K-PUB
// career_model_versions): staging i przebiegi to wewnętrzna kuchnia operacyjna,
// student/faculty nie mają czego tu czytać. Dostęp wyłącznie owner (route ingest).

/** Lustro `job_market_data` (łącznie z martwą salary_range) — swap w AG.4 to
 *  wtedy proste INSERT…SELECT bez mapowania kolumn. Wipe+insert per przebieg. */
export const jobMarketDataStaging = pgTable(
	"job_market_data_staging",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		careerGoal: text("career_goal").notNull(),
		competencyName: text("competency_name").notNull(),
		demandPercentage: integer("demand_percentage").notNull(),
		category: text("category").notNull(),
		salaryRange: text("salary_range"),
	},
	(table) => [index("idx_job_market_staging_career_goal").on(table.careerGoal)],
);

/**
 * Przebieg odświeżenia rynku: prowenicja wejścia (md5 obu CSV — jak w
 * docs/data/job-market-provenance.md §0.2), liczniki silnika, raport diffu
 * vs prod i DOKŁADNE bajty obu artefaktów (płaski 72K + model 212K) — AG.4
 * zrobi z nich swap i ingest career-model bez ponownego uploadu. Status:
 * staged → accepted/rejected (decyzja Darka w AG.4).
 */
export const marketRefreshRuns = pgTable(
	"market_refresh_runs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		/** md5 rozpakowanego JustJoinIT_Oferty.csv (prowenicja, anty-dryf). */
		ofertyMd5: text("oferty_md5").notNull(),
		/** md5 rozpakowanego JustJoinIT_Technologie.csv. */
		technologieMd5: text("technologie_md5").notNull(),
		/** Liczniki z _meta artefaktu (surowe/unikalne/przypisane oferty). */
		rawOffers: integer("raw_offers").notNull(),
		uniqueOffers: integer("unique_offers").notNull(),
		assignedOffers: integer("assigned_offers").notNull(),
		/** Liczba wierszy zapisanych do stagingu w tym przebiegu. */
		stagedRows: integer("staged_rows").notNull(),
		/** Raport diffu staging vs prod (kształt: src/lib/market-refresh/diff.ts). */
		diff: jsonb("diff").notNull(),
		/** Dokładne bajty artefaktów tego przebiegu (prowenicja + wsad dla AG.4). */
		contentFlat: text("content_flat").notNull(),
		contentModel: text("content_model").notNull(),
		status: text("status").notNull().default("staged"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		acceptedAt: timestamp("accepted_at"),
		/** AG.5: podsumowanie recompute po akceptacji (studenci/nowe luki/LLM/błędy). */
		recompute: jsonb("recompute"),
	},
	(table) => [
		check(
			"chk_market_refresh_runs_status",
			sql`${table.status} IN ('staged', 'accepted', 'rejected')`,
		),
	],
);

/**
 * AG.5 — zdarzenie „NOWA luka po odświeżeniu rynku": po zaakceptowanym swapie
 * recompute wykrył, że rynek zaczął wymagać kompetencji, której student nie ma,
 * a wcześniej luki nie było. Wsad dla AG.6 (powiadomienie „rynek zaczął wymagać
 * X" — notified_at wypełni AG.6). Tabela TENANT-owa (dane studenta): RLS pełnym
 * wzorcem 0024 (GRANT SELECT tylko app_student, student_sees_own, FORCE,
 * owner_passthrough; app_faculty bez grantu). Zapis wyłącznie server-side
 * (owner) w recompute.
 */
export const marketNewGapEvents = pgTable(
	"market_new_gap_events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		/** Przebieg, którego akceptacja wywołała recompute (null = recompute ręczny). */
		runId: uuid("run_id").references(() => marketRefreshRuns.id, { onDelete: "set null" }),
		competencyName: text("competency_name").notNull(),
		priority: text("priority").notNull(),
		marketPercentage: integer("market_percentage").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		/** AG.6: kiedy studenta powiadomiono (null = jeszcze nie). */
		notifiedAt: timestamp("notified_at"),
	},
	(table) => [
		index("idx_market_new_gap_events_student_id").on(table.studentId),
		index("idx_market_new_gap_events_tenant_id").on(table.tenantId),
	],
);

// Project Marketplace tables

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		level: projectLevelEnum("level").notNull(),
		estimatedHours: integer("estimated_hours").notNull(),
		sourceType: projectSourceTypeEnum("source_type").notNull(),
		sourceUrl: text("source_url"),
		partnerId: text("partner_id"),
		exclusivity: boolean("exclusivity").notNull().default(false),
		briefTemplate: text("brief_template"),
		// B3 — Wiedza teoretyczna (migracja 0016).
		// NULL = brak teorii → front mapuje na stan S4 `empty_theory` (spec §2.4).
		// Brak defaultu: projekt bez teorii ma NULL, nie pusty placeholder.
		theoryMd: text("theory_md"),
		rubricJson: jsonb("rubric_json").notNull().default([]),
		status: text("status").notNull().default("active"),
		// Redesign weryfikacji (migracja 0019). Typ pracy decyduje o twardych
		// sprawdzeniach kroku 2 (kod → analiza statyczna; dokument → struktura
		// README; reguła/SQL → walidacja składni). CHECK (lista miękka), NIE enum
		// Postgres — przyszły nowy typ to odwracalny ALTER CHECK, nie nieodwracalne
		// ALTER TYPE. DEFAULT 'mixed' = backfill bezpieczny dla istniejących projektów.
		deliverableType: text("deliverable_type").notNull().default("mixed"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_projects_slug").on(table.slug),
		check(
			"projects_deliverable_type_values",
			sql`${table.deliverableType} IN ('code','document','detection_rule','sql','mixed')`,
		),
	],
);

// ============================================================================
// B3 — Źródła wiedzy w projekcie. Migracja 0016.
//
// Decyzja schematu (Ethan, 2026-05-31, §B3.2): NOWA tabela project_learning_resources
// (nie rozszerzenie konfiguracyjnej project_sources — to inna domena).
// Istniejąca project_sources = konfiguracja skąd marketplace pobiera projekty
// (type: open_data/oss/partner/ngo/faculty, bez project_id ani title).
//
// Typ źródła: text + CHECK (lista miękka — 'article'/'tool' w Beta+1 = ALTER CHECK,
// nie ALTER TYPE Postgres jak przy enum). Klasa K-PUB: dziecko katalogu projects,
// te same prawa co project_competencies. Bez RLS tenant-owej — projekty to globalny
// katalog, nie dane studenta. Wyjątek RLS w rls-matrix §4 + k3-validate (analogicznie
// jak project_competencies). GRANT SELECT do app_student i app_faculty.
// ============================================================================

export const projectLearningResources = pgTable(
	"project_learning_resources",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		url: text("url").notNull(),
		// CHECK IN ('video','docs','course') — lista miękka; nie enum Postgres (nieodwracalne ADD VALUE).
		type: text("type").notNull(),
		// Kolejność wyświetlania; 0 = brak preferencji.
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_project_learning_resources_project_id").on(table.projectId),
		check(
			"project_learning_resources_type_values",
			sql`${table.type} IN ('video','docs','course')`,
		),
	],
);

// ============================================================================
// #7 — Odporność linków źródła danych. Migracja 0018.
//
// Problem: dziś projekt ma JEDEN link do materiału źródłowego (projects.source_url).
// Gdy padnie, student nie ma alternatywy. Model 1 link → 2–3 linki: padnie jeden,
// student kończy z drugiego.
//
// Decyzja schematu (wzorzec project_learning_resources, §B3.2 Ethan): NOWA tabela
// project_source_links — klasa K-PUB (dziecko katalogu projects, globalny katalog,
// NIE dane studenta). Bez RLS tenant-owej; te same prawa co project_competencies
// /project_learning_resources. Wyjątek RLS w rls-matrix §4 + k3-validate (analogicznie).
// GRANT SELECT do app_student i app_faculty (dopisany ręcznie w migracji — drizzle-kit
// nie generuje GRANT). Zapis tylko seed/system (brak endpointu zapisu klienta).
//
// projects.source_url ZOSTAJE (nie usuwamy kolumny — odwracalność): backfill przenosi
// istniejący link do pierwszego wiersza (position 0), a widok degraduje do source_url,
// gdy projekt nie ma jeszcze wierszy w tej tabeli.
//
// isDead: znacznik „link martwy" — widok pokazuje go przekreślonego i kieruje studenta
// na kolejny działający (fallback wizualny). Nie weryfikujemy URL automatycznie.
// ============================================================================

export const projectSourceLinks = pgTable(
	"project_source_links",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		// Etykieta dla człowieka (np. „Źródło główne", „Kopia zapasowa", „Kaggle").
		// NULL = widok pokaże host z URL jak dotąd.
		label: text("label"),
		// Kolejność wyświetlania; 0 = pierwszy (przeniesiony stary source_url).
		position: integer("position").notNull().default(0),
		// Znacznik martwego linku — widok degraduje wizualnie i kieruje na następny.
		isDead: boolean("is_dead").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_project_source_links_project_id").on(table.projectId)],
);

export const projectCompetencies = pgTable(
	"project_competencies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		competencyName: text("competency_name").notNull(),
		role: projectCompetencyRoleEnum("role").notNull().default("required"),
	},
	(table) => [index("idx_project_competencies_project_id").on(table.projectId)],
);

export const projectSubmissions = pgTable(
	"project_submissions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		repoUrl: text("repo_url"),
		notebookUrl: text("notebook_url"),
		additionalUrls: jsonb("additional_urls").notNull().default([]),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		aiReviewJson: jsonb("ai_review_json"),
		score: integer("score"),
		status: submissionStatusEnum("status").notNull().default("in_progress"),
		// Redesign weryfikacji (migracja 0019). Flaga „czeka na człowieka" —
		// ORTOGONALNA do statusu (nie rozszerzamy submissionStatusEnum: ALTER TYPE
		// ADD VALUE jest NIEODWRACALNE; boolean jest cofalny przez DROP COLUMN —
		// decyzja potwierdzona z Leo). Zapala priorytet kolejki oceny premium
		// (Faza 3 UI). DEFAULT false = backfill bezpieczny.
		needsHumanReview: boolean("needs_human_review").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_project_submissions_student").on(table.studentId),
		index("idx_project_submissions_project").on(table.projectId),
		index("idx_project_submissions_tenant_id").on(table.tenantId),
		// 0.2b: jedno zgłoszenie na studenta per projekt. Wymaga 0.2a (remediacja
		// istniejących duplikatów) zastosowanego PRZED tą migracją na każdej bazie —
		// inaczej CREATE UNIQUE INDEX padnie na istniejących duplikatach.
		uniqueIndex("uq_project_submissions_student_project").on(table.studentId, table.projectId),
	],
);

// ============================================================================
// B6/1.8 (ADR-012) — UKRYTE TEST-SUITES piaskownicy. Migracja 0028.
//
// Decyzja schematu: OSOBNA tabela, NIE kolumna na projects — trasy katalogu
// (/api/projects, /api/projects/[id]) zwracają PEŁNE wiersze zalogowanym
// studentom (zaakceptowane dla rubricJson w 0.15/B1), a ukryte testy to
// sekret dokładnie PRZED studentem (zna testy = może pod nie pisać).
// Wzorzec project_reflections: osobna tabela + zero grantów app_* =
// deny-by-default; czyta ją WYŁĄCZNIE server-side runner (owner).
// Bez tenant_id (katalog per projekt, nie dane studenta) → w k3-validate
// klasyfikacja K_PUB wariant DENY (jak job_market_data_staging).
// ============================================================================

export const projectHiddenTests = pgTable(
	"project_hidden_tests",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		/** Pakiety pip instalowane przed biegiem (sieć zawężona do PyPI tylko wtedy). */
		deps: jsonb("deps").notNull().default([]),
		/** Pliki testowe wpisywane do piaskownicy: [{path, content}]. */
		files: jsonb("files").notNull().default([]),
		/** Komenda biegu, np. ["python3","run_hidden_tests.py"]. */
		command: jsonb("command").notNull(),
		/** Budżet czasu pojedynczego biegu (≪ maxDuration trasy submitu). */
		timeoutMs: integer("timeout_ms").notNull().default(60_000),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [uniqueIndex("uq_project_hidden_tests_project").on(table.projectId)],
);

export const projectSources = pgTable("project_sources", {
	id: uuid("id").defaultRandom().primaryKey(),
	type: projectSourceTypeEnum("type").notNull(),
	url: text("url").notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

// ============================================================================
// B5 — Refleksja po projekcie. Migracja 0015.
//
// Decyzja schematu (Ethan, 2026-05-31, §B5.1): NOWA tabela project_reflections
// (nie kolumny na project_submissions). Powód: project_submissions jest
// współdzielona z panelem wykładowcy (app_faculty ma SELECT/UPDATE). Refleksje
// są PRYWATNE — tylko student, nigdy faculty, nigdy paszport (PRD US-B5.1 KA5,
// spec §4.6). Osobna tabela bez żadnego grantu app_faculty daje to czysto
// (deny-by-default) zamiast trzeciej izolacji kolumnowej.
//
// Trzy pytania (R2, zablokowane przez Darka) = trzy nazwane kolumny text NULL
// (NULL = pominięte przez studenta), nie jsonb — czytelne, typowalne.
// UNIQUE na submission_id: jedna refleksja na zgłoszenie (ponowny zapis = UPDATE).
//
// FORCE RLS + owner_passthrough spójnie z 0012/ADR-005 (jak 6 tabel studenta i
// 3 tabele B0). Grant tylko app_student. Sekcja RLS NIE jest generowana przez
// drizzle-kit — dopisana ręcznie w drizzle/0015_*.sql wzorem 0013.
// ============================================================================

export const projectReflections = pgTable(
	"project_reflections",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => projectSubmissions.id, { onDelete: "cascade" }),
		// „Co cię w tym projekcie zaskoczyło?” (NULL = pominięte)
		answerSurprised: text("answer_surprised"),
		// „Co cię w nim wkurzyło albo zniechęciło?”
		answerFrustrated: text("answer_frustrated"),
		// „Czego dowiedziałeś się o sobie?”
		answerLearned: text("answer_learned"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_project_reflections_student_id").on(table.studentId),
		index("idx_project_reflections_tenant_id").on(table.tenantId),
		// UNIQUE: jedna refleksja na zgłoszenie (ponowny zapis = UPDATE istniejącej)
		uniqueIndex("uq_project_reflections_submission").on(table.submissionId),
	],
);

// ============================================================================
// Redesign weryfikacji — decyzja człowieka o zgłoszeniu (Etap 2). Migracja 0019.
//
// Decyzja schematu (Ethan/Leo, §6.3): NOWA tabela submission_reviews (wzorzec
// project_reflections — zapis robi INNA rola niż student: wykładowca / operator
// jakości). app_faculty dostaje SELECT + INSERT (moderacja w swoim tenancie),
// polityka RLS tenant-owa jak faculty_sees_tenant z 0008. RLS NIE jest
// generowana przez drizzle-kit — dopisana ręcznie w drizzle/0019_*.sql.
//
// reviewerType: text + CHECK (lista miękka 'faculty'/'quality_operator'/
// 'auto_no_human' — obsługuje tryb bez człowieka §6.6 bez przyszłej migracji;
// NIE enum Postgres — odwracalność). UNIQUE(submission_id): jedna decyzja na
// zgłoszenie (ponowna = UPDATE). Faza 1: tabela GOTOWA, UI oceniającego dopiero
// w Fazie 3 — tu tylko struktura + flaga needs_human_review na zgłoszeniu.
// ============================================================================

export const submissionReviews = pgTable(
	"submission_reviews",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => projectSubmissions.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		// 'approved' | 'rejected' — decyzja człowieka (CHECK, nie enum).
		decision: text("decision").notNull(),
		// 'faculty' | 'quality_operator' | 'auto_no_human' (tryb bez człowieka §6.6).
		reviewerType: text("reviewer_type").notNull(),
		reviewerId: text("reviewer_id"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_submission_reviews_submission_id").on(table.submissionId),
		index("idx_submission_reviews_tenant_id").on(table.tenantId),
		uniqueIndex("uq_submission_reviews_submission").on(table.submissionId),
		check("submission_reviews_decision_values", sql`${table.decision} IN ('approved','rejected')`),
		check(
			"submission_reviews_reviewer_type_values",
			sql`${table.reviewerType} IN ('faculty','quality_operator','auto_no_human')`,
		),
	],
);

// ============================================================================
// B0 — Pomocnik Wyboru Kariery (Career Helper). Migracja 0013.
//
// Trzy nowe tabele danych studenta (tenant-owe): sesje, tury rozmowy, ścieżki.
// Wszystkie z tenant_id denormalizowanym (RLS JOIN-free, jak reszta — ADR-003),
// FORCE RLS + owner_passthrough (spójnie z 0012/ADR-005), grant tylko app_student.
// app_faculty CELOWO bez żadnego grantu — to prywatne dane studenta, nie panel
// wykładowcy (wzorzec jak project_reflections w decyzji schematu B3/B4/B5).
//
// Sekcja RLS NIE jest generowana przez drizzle-kit — dopisana ręcznie w
// drizzle/0013_*.sql wzorem 0012.
// ============================================================================

export const careerHelperSessionStatusEnum = pgEnum("career_helper_session_status", [
	"in_progress",
	"completed",
	"interrupted",
	"restarted",
]);

export const careerHelperTurnRoleEnum = pgEnum("career_helper_turn_role", ["ai", "user"]);

export const careerHelperSessions = pgTable(
	"career_helper_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		status: careerHelperSessionStatusEnum("status").notNull().default("in_progress"),
		// Numer tury liczony przez serwer (limit 9 w kodzie, nie w prompcie).
		turn: smallint("turn").notNull().default(0),
		// Ankieta q1..q4 — zachowywana przy restart (spec B0 §3.5 / §4.5).
		answers: jsonb("answers").notNull(),
		// Licznik restartów — cap aplikacyjny "max 2 restarty" (golden ADR-001 §4.1).
		restartCount: smallint("restart_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_career_helper_sessions_student_id").on(table.studentId),
		index("idx_career_helper_sessions_tenant_id").on(table.tenantId),
		check("career_helper_sessions_turn_range", sql`${table.turn} BETWEEN 0 AND 9`),
	],
);

export const careerHelperTurns = pgTable(
	"career_helper_turns",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => careerHelperSessions.id, { onDelete: "cascade" }),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		role: careerHelperTurnRoleEnum("role").notNull(),
		content: text("content").notNull(),
		turnIndex: smallint("turn_index").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_career_helper_turns_session_id").on(table.sessionId),
		index("idx_career_helper_turns_student_id").on(table.studentId),
		index("idx_career_helper_turns_tenant_id").on(table.tenantId),
	],
);

export const studentCareerPaths = pgTable(
	"student_career_paths",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		// Denormalizacja tenant_id (rozstrzygnięcie spec §8.3 przez Ethana) — szybkie RLS.
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		sessionId: uuid("session_id").references(() => careerHelperSessions.id, {
			onDelete: "set null",
		}),
		label: text("label").notNull(),
		why: text("why"),
		// Zapis wewnętrzny / Phase 2 — endpoint NIE serializuje tego pola do frontu (HITL).
		probability: real("probability"),
		source: text("source").notNull().default("helper"),
		isPrimary: boolean("is_primary").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_student_career_paths_student_id").on(table.studentId),
		index("idx_student_career_paths_tenant_id").on(table.tenantId),
		uniqueIndex("uq_student_career_paths_primary")
			.on(table.studentId)
			.where(sql`${table.isPrimary} = true`),
		check("student_career_paths_source", sql`${table.source} IN ('helper')`),
	],
);

// AG.7 — Trwała pamięć doradcy między sesjami (za flagą `advisorMemory`).
//
// Fakty DESTYLOWANE z rozmów Pomocnika (dziś: treść zaakceptowanego przez
// sędziego podsumowania /summary), zapisywane po zamknięciu sesji. Reszta
// kontekstu doradcy (profil, luki, zweryfikowane projekty, wskazane obszary)
// jest czytana z ISTNIEJĄCYCH tabel — ta tabela trzyma tylko to, czego nigdzie
// indziej nie ma. Postgres = źródło prawdy (decyzja: NIE Managed Agents memory
// store). Dane studenta → tabela TENANT-owa: RLS student_sees_own + FORCE +
// owner_passthrough w migracji 0024 (wzorzec 0013); app_faculty bez grantu
// (prywatna rozmowa studenta, jak career_helper_turns).
export const advisorMemory = pgTable(
	"advisor_memory",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		// Sesja źródłowa faktu — informacyjnie; kasacja sesji nie kasuje pamięci.
		sessionId: uuid("session_id").references(() => careerHelperSessions.id, {
			onDelete: "set null",
		}),
		/** Rodzaj faktu — dziś tylko podsumowanie sesji; nowe rodzaje = migracja CHECK. */
		kind: text("kind").notNull(),
		content: text("content").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_advisor_memory_student_id").on(table.studentId),
		index("idx_advisor_memory_tenant_id").on(table.tenantId),
		check("advisor_memory_kind", sql`${table.kind} IN ('summary')`),
	],
);

// Faculty sessions — DB-backed, replaces static cookie value.
// Cookie carries random 256-bit token; DB stores its SHA-256 hash for lookup.
export const facultySessions = pgTable(
	"faculty_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		tokenHash: text("token_hash").notNull().unique(),
		// K3: which campus this faculty session belongs to (set at login by
		// per-campus password). Nullable: pre-K3 sessions resolve to no tenant
		// (must re-login). RLS faculty policy reads tenant via app context.
		// B8/1.3: dla role='quality_operator' tenant_id celowo NULL (operator
		// jest cross-tenant z definicji — ADR-011).
		tenantId: uuid("tenant_id").references(() => tenants.id),
		// B8/1.3 (migracja 0027, ADR-011): jedna tabela sesji dla obu ról
		// recenzenckich. 'faculty' = wykładowca kampusu (tenant wymagany przez
		// checkFacultyAuth); 'quality_operator' = operator jakości (osobny
		// cookie + OPERATOR_PASSWORD). CHECK zamiast enuma — odwracalność.
		role: text("role").notNull().default("faculty"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_faculty_sessions_expires_at").on(table.expiresAt),
		check("faculty_sessions_role_values", sql`${table.role} IN ('faculty','quality_operator')`),
	],
);

// Audit log — privileged actions and security-relevant events.
export const auditLog = pgTable(
	"audit_log",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// B8/1.3: + 'operator' (operator jakości, ADR-011). Enum na poziomie TS
		// (kolumna to text bez CHECK) — rozszerzenie bez migracji.
		actorType: text("actor_type", {
			enum: ["student", "faculty", "operator", "system", "anonymous"],
		}).notNull(),
		actorId: text("actor_id"),
		action: text("action").notNull(),
		targetType: text("target_type"),
		targetId: text("target_id"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_audit_log_created_at").on(table.createdAt),
		index("idx_audit_log_action").on(table.action),
	],
);

// ============================================================================
// Zadanie 0.0 — obserwowalność kosztu i błędów AI (migracja 0020).
//
// Rejestr KAŻDEGO wywołania LLM z warstwy `src/lib/ai/*` (wrapper withAiUsage
// w src/lib/ai/usage.ts): tokeny wej./wyj., koszt USD wg cennika modelu,
// sukces/nazwa błędu, latencja, atrybucja (scope = moduł/endpoint; studentId/
// tenantId gdy funkcja je zna). To telemetria OPERACYJNA, nie dane produktowe:
//  - zapis przez owner `db` (best-effort, jak audit_log) — nie przez tenant tx,
//  - ZERO grantów dla app_student/app_faculty (ADR-002/004: koszty per student
//    nie mogą wyciec do wykładowcy ani studenta) — tylko owner_passthrough,
//  - studentId nullable + ON DELETE SET NULL: usunięcie studenta nie kasuje
//    historii kosztów (agregaty per scope/dzień zostają, wiersz się anonimizuje).
// costUsd nullable — NULL gdy cennik modelu nieznany (np. override env w CI).
// ============================================================================

export const aiUsageLedger = pgTable(
	"ai_usage_ledger",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// Moduł/endpoint wywołania, np. "generate-brief", "career-helper.turn".
		scope: text("scope").notNull(),
		// Warstwa modelu z src/lib/ai/model.ts — 'standard' | 'fast' | 'premium'.
		tier: text("tier").notNull(),
		modelId: text("model_id").notNull(),
		inputTokens: integer("input_tokens").notNull().default(0),
		outputTokens: integer("output_tokens").notNull().default(0),
		// USD, 6 miejsc po przecinku; NULL = brak cennika dla modelu.
		costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
		success: boolean("success").notNull(),
		// PII-safe: wyłącznie err.name (konwencja logError) — nigdy message/prompt.
		errorName: text("error_name"),
		latencyMs: integer("latency_ms"),
		// Atrybucja best-effort — wypełniana tam, gdzie funkcja AI zna te ID.
		userId: text("user_id"),
		studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
		tenantId: uuid("tenant_id").references(() => tenants.id),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_ai_usage_ledger_created_at").on(table.createdAt),
		index("idx_ai_usage_ledger_scope").on(table.scope),
		index("idx_ai_usage_ledger_student_id").on(table.studentId),
		index("idx_ai_usage_ledger_tenant_id").on(table.tenantId),
		check("ai_usage_ledger_tier_values", sql`${table.tier} IN ('standard','fast','premium')`),
	],
);

// Relations

export const studentsRelations = relations(students, ({ one, many }) => ({
	user: one(user, { fields: [students.userId], references: [user.id] }),
	competencies: many(competencies),
	gaps: many(gaps),
	skillMap: one(skillMaps, { fields: [students.id], references: [skillMaps.studentId] }),
	passport: one(passports, { fields: [students.id], references: [passports.studentId] }),
	projectSubmissions: many(projectSubmissions),
}));

export const competenciesRelations = relations(competencies, ({ one }) => ({
	student: one(students, { fields: [competencies.studentId], references: [students.id] }),
}));

export const gapsRelations = relations(gaps, ({ one }) => ({
	student: one(students, { fields: [gaps.studentId], references: [students.id] }),
}));

export const passportsRelations = relations(passports, ({ one }) => ({
	student: one(students, { fields: [passports.studentId], references: [students.id] }),
}));

// Project Marketplace relations

export const projectsRelations = relations(projects, ({ many }) => ({
	competencies: many(projectCompetencies),
	submissions: many(projectSubmissions),
	learningResources: many(projectLearningResources),
	sourceLinks: many(projectSourceLinks),
}));

export const projectCompetenciesRelations = relations(projectCompetencies, ({ one }) => ({
	project: one(projects, {
		fields: [projectCompetencies.projectId],
		references: [projects.id],
	}),
}));

// B3 — Learning resources relations
export const projectLearningResourcesRelations = relations(projectLearningResources, ({ one }) => ({
	project: one(projects, {
		fields: [projectLearningResources.projectId],
		references: [projects.id],
	}),
}));

// #7 — Source links relations (odporność linków źródła danych)
export const projectSourceLinksRelations = relations(projectSourceLinks, ({ one }) => ({
	project: one(projects, {
		fields: [projectSourceLinks.projectId],
		references: [projects.id],
	}),
}));

export const projectSubmissionsRelations = relations(projectSubmissions, ({ one }) => ({
	student: one(students, {
		fields: [projectSubmissions.studentId],
		references: [students.id],
	}),
	project: one(projects, {
		fields: [projectSubmissions.projectId],
		references: [projects.id],
	}),
}));

// B0 — Career Helper relations

export const careerHelperSessionsRelations = relations(careerHelperSessions, ({ one, many }) => ({
	student: one(students, {
		fields: [careerHelperSessions.studentId],
		references: [students.id],
	}),
	turns: many(careerHelperTurns),
	paths: many(studentCareerPaths),
}));

export const careerHelperTurnsRelations = relations(careerHelperTurns, ({ one }) => ({
	session: one(careerHelperSessions, {
		fields: [careerHelperTurns.sessionId],
		references: [careerHelperSessions.id],
	}),
	student: one(students, {
		fields: [careerHelperTurns.studentId],
		references: [students.id],
	}),
}));

export const studentCareerPathsRelations = relations(studentCareerPaths, ({ one }) => ({
	student: one(students, {
		fields: [studentCareerPaths.studentId],
		references: [students.id],
	}),
	session: one(careerHelperSessions, {
		fields: [studentCareerPaths.sessionId],
		references: [careerHelperSessions.id],
	}),
}));

// B5 — Project Reflections relations
export const projectReflectionsRelations = relations(projectReflections, ({ one }) => ({
	student: one(students, {
		fields: [projectReflections.studentId],
		references: [students.id],
	}),
	submission: one(projectSubmissions, {
		fields: [projectReflections.submissionId],
		references: [projectSubmissions.id],
	}),
	project: one(projects, {
		fields: [projectReflections.projectId],
		references: [projects.id],
	}),
}));
