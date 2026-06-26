import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
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
		// verifiedByMethod: w Becie zawsze 'self'; non-breaking pod silnik testów (Phase 3+, OUT).
		// DEFAULT 'self' — backfill bezpieczny dla istniejących wierszy (non-breaking ALTER).
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
		// CHECK na verifiedByMethod: Beta zamknięta na 'self' (silnik testów = OUT)
		check("competencies_verified_by_method_values", sql`${table.verifiedByMethod} IN ('self')`),
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
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_projects_slug").on(table.slug)],
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
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_project_submissions_student").on(table.studentId),
		index("idx_project_submissions_project").on(table.projectId),
		index("idx_project_submissions_tenant_id").on(table.tenantId),
	],
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
		tenantId: uuid("tenant_id").references(() => tenants.id),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_faculty_sessions_expires_at").on(table.expiresAt)],
);

// Audit log — privileged actions and security-relevant events.
export const auditLog = pgTable(
	"audit_log",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		actorType: text("actor_type", {
			enum: ["student", "faculty", "system", "anonymous"],
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
