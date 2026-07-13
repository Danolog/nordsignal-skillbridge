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
		// 1.17 (RODO, decyzje Darka 2026-07-10): zgoda opt-in na ŚLEDZENIE
		// PLACEMENT (baseline + zdarzenia zawodowe). Wzorzec AG.6: decidedAt
		// NULL = nigdy nie pytany; zgoda odwoływalna tym samym endpointem.
		// Odwołanie KASUJE zebrane zdarzenia (placement to PII — prywatność
		// ponad ciągłość metryki; agregaty E2.H liczone są na żywo).
		placementConsent: boolean("placement_consent").notNull().default(false),
		placementDecidedAt: timestamp("placement_decided_at", { withTimezone: true }),
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

// ============================================================================
// 1.17 — Instrumentacja placement rate (decyzje Darka 2026-07-10: baseline +
// zdarzenia deklarowane; zgoda w onboardingu i profilu). Dane nieodtwarzalne
// wstecz — zbieranie startuje z 1. kohortą. Konsument: E2.H (Employability
// Report, agregaty anonimowe) + bramka E3 (placement ≥70%).
//
// RLS: pełny wzorzec 0030 (ENABLE+FORCE, student_sees_own FOR SELECT,
// owner_passthrough), grant TYLKO SELECT dla app_student — zapisy wyłącznie
// owner-side przez trasy /api/placement/*. app_faculty bez grantu (agregaty
// E2.H policzy serwer owner-side, anonimowo). Kasowanie: cascade po studencie
// (art. 17) ORAZ przy odwołaniu zgody (delete-on-revoke — patrz kolumny zgody).
// ============================================================================

export const placementEvents = pgTable(
	"placement_events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		/**
		 * baseline — status na start (dokładnie 1 na studenta, egzekwowane
		 * partial unique); internship/job/job_change/job_lost — deklarowane
		 * zmiany. CHECK to lista miękka (nowy rodzaj = ALTER CHECK).
		 */
		kind: text("kind").notNull(),
		/** Tylko baseline: studying | working_in_field | working_outside | seeking. */
		employmentStatus: text("employment_status"),
		/** Zdarzenia pracy: czy rola zgodna ze ścieżką kariery (deklaracja). */
		careerAligned: boolean("career_aligned"),
		/** Kiedy zdarzenie zaszło wg studenta (data, nie chwila zapisu). */
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		/** Krótka notatka studenta (opcjonalna; cap w trasie). */
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_placement_events_student_id").on(table.studentId),
		index("idx_placement_events_tenant_id").on(table.tenantId),
		check(
			"placement_events_kind_values",
			sql`${table.kind} IN ('baseline','internship','job','job_change','job_lost')`,
		),
		check(
			"placement_events_employment_status_values",
			sql`${table.employmentStatus} IS NULL OR ${table.employmentStatus} IN ('studying','working_in_field','working_outside','seeking')`,
		),
		// Baseline dokładnie raz — kolejne "baseline" to update statusu przez
		// zdarzenie, nie drugi punkt startu (metryka przed/po ma jeden start).
		uniqueIndex("uq_placement_events_baseline")
			.on(table.studentId)
			.where(sql`${table.kind} = 'baseline'`),
	],
);

// ============================================================================
// 1.18 (C13) — rytm nauki i accountability (decyzje Darka 2026-07-10):
// deklaracja godzin/tydzień + dni w „Mojej drodze"; streak i zastój liczone
// DETERMINISTYCZNIE z realnych śladów (submity, tutor, diagnoza, viva,
// refleksje, check-iny) — zero nowych obowiązków; ręczny check-in tygodniowy
// OPCJONALNY; powiadomienie o zastoju in-app, wyłączalne, wykrywane leniwie
// (bez cronów). moduleRef = hak pod moduły curriculum 1E.6 ([ZMIANA] roadmapy).
//
// RLS obu tabel: pełny wzorzec 0030 (ENABLE+FORCE, student_sees_own FOR
// SELECT, owner_passthrough); grant TYLKO SELECT app_student — zapisy
// owner-side przez trasy /api/rhythm/*; app_faculty bez grantu.
// ============================================================================

export const studyRhythms = pgTable(
	"study_rhythms",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// Jedna deklaracja per student (upsert) — unique zamiast indeksu zwykłego.
		studentId: uuid("student_id")
			.notNull()
			.unique()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		hoursPerWeek: smallint("hours_per_week").notNull(),
		/** Dni nauki: podzbiór ['mon'..'sun'] (walidacja w trasie; jsonb dla 1E.6). */
		days: jsonb("days").notNull().default([]),
		/** Aktywny projekt, z którym student wiąże rytm (opcjonalny). */
		activeProjectId: uuid("active_project_id").references(() => projects.id, {
			onDelete: "set null",
		}),
		/** Hak 1E.6: identyfikator modułu curriculum (bez FK — moduły przyjdą później). */
		moduleRef: text("module_ref"),
		/** Wyłączenie powiadomień o zastoju (funkcja produktu, nie zgoda RODO). */
		stagnationOptOut: boolean("stagnation_opt_out").notNull().default(false),
		/**
		 * Kiedy pokazano alert zastoju (epizod). Widoczność alertu: zastój ∧
		 * (NULL ∨ notifiedAt < lastActivityAt) — nowa aktywność otwiera nowy
		 * epizod, dismiss zamyka bieżący. Bez osobnej tabeli zdarzeń.
		 */
		stagnationNotifiedAt: timestamp("stagnation_notified_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_study_rhythms_tenant_id").on(table.tenantId),
		check("study_rhythms_hours_range", sql`${table.hoursPerWeek} BETWEEN 1 AND 80`),
	],
);

export const studyCheckins = pgTable(
	"study_checkins",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		/** Poniedziałek tygodnia ISO (UTC), liczony server-side — klientowi nie ufamy. */
		weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
		/** Realnie przepracowane godziny (deklaracja; NULL = tylko notatka). */
		hoursActual: smallint("hours_actual"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_study_checkins_student_id").on(table.studentId),
		index("idx_study_checkins_tenant_id").on(table.tenantId),
		check(
			"study_checkins_hours_range",
			sql`${table.hoursActual} IS NULL OR ${table.hoursActual} BETWEEN 0 AND 120`,
		),
		// Jeden check-in per tydzień — ponowny zapis to update (upsert w trasie).
		uniqueIndex("uq_study_checkins_week").on(table.studentId, table.weekStart),
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
		// 1E.1g (ADR-014 D4, migracja 0035) — dług QG-5 §3/§4/§7 partii 1:
		// wszystkie nullable/z defaultem (addytywne); wypełnia remediacja 1E.R/1E.5.
		license: text("license"),
		language: text("language"),
		registrationRequired: boolean("registration_required").notNull().default(false),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
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
// Blok C planu napraw (2026-07-13) — MOSTEK projekt→paszport. Migracja 0037.
//
// Kredencjał „kompetencja zweryfikowana projektem": SNAPSHOT nazw z
// project_competencies(role='required') w chwili, gdy submisja osiąga status
// 'verified' (decyzja D2 Darka: automat score ≥ 70 / zdana viva / akceptacja
// człowieka — wszystkie trzy ścieżki). Snapshot, NIE derywacja na żywo —
// katalog project_competencies jest edytowalny, a kredencjał widziany przez
// rekruterów musi być stabilny (ADR-008 „etykieta nie kłamie").
//
// OSOBNA tabela, nie rozszerzenie CHECK-a competencies.verified_by_method:
// onboarding robi wipe+insert na competencies (api/onboarding), więc
// re-onboarding skasowałby kredencjał; poza tym po decyzji D1 competencies
// pełni rolę narzędzia analizy luk (deklaracje), a kredencjał jest niezmienny.
//
// UWAGA nazwy ról: mostek bierze role='required' (czego projekt UCZY);
// 'acquired' to PREREKWIZYT i nigdy nie idzie do paszportu.
// Zapisy WYŁĄCZNIE owner-side (reconcileVerifiedCompetencies); app_student ma
// tylko SELECT, app_faculty bez grantu — RLS w migracji 0037 (wzorzec 0034).
// ============================================================================

export const verifiedCompetencies = pgTable(
	"verified_competencies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => projectSubmissions.id, { onDelete: "cascade" }),
		/** Snapshot nazwy liścia z project_competencies.role='required'. */
		competencyName: text("competency_name").notNull(),
		verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_verified_competencies_student_id").on(table.studentId),
		index("idx_verified_competencies_tenant_id").on(table.tenantId),
		// Reconcile robi upsert po tej parze; dwie submisje mogą dać tę samą
		// nazwę (deduplikacja po nazwie dopiero przy odczycie).
		uniqueIndex("uq_verified_competencies_submission_name").on(
			table.submissionId,
			table.competencyName,
		),
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

// ============================================================================
// A5/1.11 — Bank pytań (wspólny 1.11/1E.2/1E.3/1E.4) + sesje diagnozy.
// Spec: docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md
// (ZATWIERDZONE Darek 2026-07-08). Migracja 0030.
//
// Bank (question_concepts/question_items): globalny katalog treści, wariant
// DENY jak project_hidden_tests — bank czytelny dla roli studenta =
// memoryzacja przed egzaminem mastery 1E.3; pytania serwuje WYŁĄCZNIE API
// per sesja (stem + opcje, nigdy answer_json), grading server-side owner.
// Oś banku = KONCEPT (liść modelu kariery bywa za gruby; fundamenty 1E.2
// nie mają liścia) — curriculum 1E.1 będzie wskazywać koncepty, bank nie
// zna modułów (zero migracji scalającej).
// Niemutowalność itemów: poprawka merytoryczna = retire + NOWY item
// (audytowalność historycznych is_correct przy mastery gate); w miejscu
// wolno edytować tylko explanation_md.
// ============================================================================

export const questionConcepts = pgTable(
	"question_concepts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// Stabilny identyfikator treści (jak projects.slug) — klucz ingestu.
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		// 'market' = koncept zmapowany na liść modelu kariery; 'foundations' =
		// trzon fundamentów CS/matmy (1E.2) bez liścia. CHECK niżej wymusza parę.
		trunk: text("trunk").notNull(),
		// Dokładny liść modelu kariery (kontrakt-test literówek jak DS partia 1).
		competencyName: text("competency_name"),
		// Koncept używany przez diagnozę 1.11 (partia 1: dokładnie 1 per liść DS);
		// koncepty drobnoziarniste 1E.2/1E.3 wchodzą z false.
		diagnostic: boolean("diagnostic").notNull().default(false),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		check("question_concepts_trunk_values", sql`${table.trunk} IN ('market','foundations')`),
		check(
			"question_concepts_market_has_competency",
			sql`${table.trunk} <> 'market' OR ${table.competencyName} IS NOT NULL`,
		),
		check("question_concepts_status_values", sql`${table.status} IN ('active','retired')`),
	],
);

export const questionItems = pgTable(
	"question_items",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		conceptId: uuid("concept_id")
			.notNull()
			.references(() => questionConcepts.id, { onDelete: "cascade" }),
		// 1–3 (podstawowa/średnia/zaawansowana); staircase §2.4 spec — wynik
		// na skali poziomów 1–4 (levelFromTrajectory), NIE 1:1 z trudnością.
		difficulty: smallint("difficulty").notNull(),
		type: text("type").notNull(),
		stem: text("stem").notNull(),
		// Tylko typy choice: lista opcji [{text}] — indeksowana od 0.
		optionsJson: jsonb("options_json"),
		// Klucz odpowiedzi per typ (spec §2.3) — NIGDY w odpowiedzi API.
		answerJson: jsonb("answer_json").notNull(),
		// Feedback po odpowiedzi — konsument: 1E.4 (diagnoza go NIE zwraca §2.2).
		explanationMd: text("explanation_md"),
		// 1E.2: feedback diagnostyczny per opcja (treść atomów Sophii) — tablica
		// [{feedbackMd, diagnosis?}] wyrównana indeksami z options_json. Jak
		// explanation_md: edytowalne w miejscu, POZA hashem tożsamości itemu;
		// nigdy nie wraca w treści pytania (tylko feedback wybranej opcji po ocenie).
		optionFeedbackJson: jsonb("option_feedback_json"),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_question_items_concept_difficulty").on(table.conceptId, table.difficulty),
		check("question_items_difficulty_range", sql`${table.difficulty} BETWEEN 1 AND 3`),
		check(
			"question_items_type_values",
			sql`${table.type} IN ('single_choice','multi_choice','numeric','short_text')`,
		),
		check("question_items_status_values", sql`${table.status} IN ('active','retired')`),
	],
);

// ============================================================================
// A5/1.11 — Sesje diagnozy (dane studenta, tenant RLS).
//
// assessment_sessions: grant TYLKO SELECT dla app_student (wzorzec 0025 —
// market_new_gap_events); wszystkie zapisy owner-side przez trasy API.
// plan_json zawiera WYŁĄCZNIE question_item_id + kolejność/gałęzie staircase
// (nigdy treść itemu — student ma SELECT na swój wiersz). result_json =
// koperta {schemaVersion, kind, concepts: {slug → {correct, asked, level}},
// competencies: {name → poziom 1–4}} — koncepty to źródło prawdy (placement
// 1E.7), kompetencje to rollup dla 1.12.
//
// assessment_answers: wariant DENY (zero grantów app_*) — student nie
// potrzebuje surowych odpowiedzi (dostaje result_json); historia służy
// silnikowi i kalibracji banku (owner-side). student_id obok session_id:
// polityki RLS/przyszłe zapytania bez joinu.
//
// kind: CHECK lista miękka — 'module_exam' w 1E.3 = ALTER CHECK (koszt
// zaakceptowany w spec §3, konwencja repo jak deliverable_type).
// career_goal NULL-owalne od dnia 1 (egzamin fundamentów nie ma ścieżki).
// Jedna aktywna sesja per (student, kind): partial unique index (0030,
// sekcja ręczna — drizzle-kit nie generuje partial unique z WHERE).
// ============================================================================

export const assessmentSessions = pgTable(
	"assessment_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		kind: text("kind").notNull(),
		careerGoal: text("career_goal"),
		// Odcisk wejścia (careerGoal + posortowana lista kompetencji) — mismatch
		// przy wznowieniu (student zmienił zaznaczenia w kreatorze) → abandoned.
		inputHash: text("input_hash").notNull(),
		status: text("status").notNull().default("in_progress"),
		planJson: jsonb("plan_json").notNull(),
		resultJson: jsonb("result_json"),
		startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => [
		index("idx_assessment_sessions_student_id").on(table.studentId),
		index("idx_assessment_sessions_tenant_id").on(table.tenantId),
		check("assessment_sessions_kind_values", sql`${table.kind} IN ('diagnostic')`),
		check(
			"assessment_sessions_status_values",
			sql`${table.status} IN ('in_progress','completed','abandoned')`,
		),
	],
);

export const assessmentAnswers = pgTable(
	"assessment_answers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => assessmentSessions.id, { onDelete: "cascade" }),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		questionItemId: uuid("question_item_id")
			.notNull()
			.references(() => questionItems.id),
		answerJson: jsonb("answer_json").notNull(),
		// Ocenione deterministycznie przy zapisie (grade.ts) — 0 LLM.
		isCorrect: boolean("is_correct").notNull(),
		position: smallint("position").notNull(),
		answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_assessment_answers_session_id").on(table.sessionId),
		index("idx_assessment_answers_tenant_id").on(table.tenantId),
		uniqueIndex("uq_assessment_answers_session_item").on(table.sessionId, table.questionItemId),
		uniqueIndex("uq_assessment_answers_session_position").on(table.sessionId, table.position),
	],
);

// ============================================================================
// C11/1.13 — TUTOR SOKRATYCZNY (migracja 0031). Rozmowa studenta z tutorem
// w kontekście projektu (brief+rubryka+recenzja+repo). Klucz konwersacji =
// (student_id, project_id) — bez osobnej tabeli sesji: tutor to JEDNA ciągła
// rozmowa nad projektem, limit tur w KODZIE (MAX_TUTOR_TURNS, wzorzec
// Pomocnika golden-adr §3.1), nie ma restartów ani statusów do modelowania.
//
// Klasa danych: PRYWATNA rozmowa studenta (jak career_helper_turns /
// project_reflections) — grant TYLKO app_student, app_faculty fizycznie bez
// wstępu (deny-by-default). Pełny wzorzec RLS z 0013: ENABLE+FORCE +
// student_sees_own + owner_passthrough. Sekcja RLS dopisana ręcznie w
// drizzle/0031_*.sql (drizzle-kit nie generuje RLS).
// ============================================================================

export const tutorTurnRoleEnum = pgEnum("tutor_turn_role", ["ai", "user"]);

export const tutorTurns = pgTable(
	"tutor_turns",
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
		role: tutorTurnRoleEnum("role").notNull(),
		content: text("content").notNull(),
		// Kolejność liczona przez serwer (para user+ai dzieli indeks, jak
		// career_helper_turns) — limit tur egzekwowany w kodzie trasy.
		turnIndex: smallint("turn_index").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		// Główne zapytanie trasy: historia jednej rozmowy (student+projekt).
		index("idx_tutor_turns_student_project").on(table.studentId, table.projectId),
		index("idx_tutor_turns_tenant_id").on(table.tenantId),
	],
);

// ============================================================================
// B7/1.16a — OBRONA USTNA (viva), ADR-013. Migracja 0032.
//
// Viva bramkuje status 'verified' (za flagą vivaDefense): pytania generowane
// W POTOKU (krok 6-prep, ten sam artefakt co ocena — zero dryfu), sesja
// pending tworzona przy submicie, student odpowiada asynchronicznie.
//
// Klasy danych (ADR-013 D3):
//  - viva_sessions: student widzi WŁASNĄ sesję (pytania są dla niego), ale
//    zapisy WYŁĄCZNIE owner-side → grant TYLKO SELECT (wzorzec 0030
//    assessment_sessions). questionsJson zamrożony przed pierwszym pokazaniem.
//  - viva_answers: wariant DENY (zero grantów app_*, strażnik k3 #13a) —
//    surowe odpowiedzi czyta serwer i recenzent przez dedykowaną trasę
//    z audytem; student dostaje wynik z resultJson sesji.
// Jedno źródło prawdy stanu = viva_sessions.status; aiReviewJson.viva to
// projekcja zapisywana w tej samej tx. Sekcja RLS ręcznie w drizzle/0032_*.sql.
// ============================================================================

export const vivaSessions = pgTable(
	"viva_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => projectSubmissions.id, { onDelete: "cascade" }),
		// Jawny cascade po studencie (art. 17 RODO) — nie polegamy na kolejności
		// kaskad przez submission (wzorzec 0030).
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		// pending → in_progress → passed|failed|inconclusive|expired|superseded.
		// CHECK (lista miękka) zamiast enuma — przyszły stan to ALTER CHECK.
		status: text("status").notNull().default("pending"),
		// Zamrożony plan: [{ position, question, filePath? }] — walidowany schematem
		// przed zapisem (second-order injection: pytania są wyświetlane studentowi).
		questionsJson: jsonb("questions_json").notNull(),
		// Po zamknięciu: punkty, werdykty sędziego per pytanie, próg. Surowego
		// tekstu odpowiedzi tu NIE ma (retencja odpowiedzi ≠ retencja wyniku).
		resultJson: jsonb("result_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		// Odsłonięcie pierwszego pytania — od tego liczy się TTL 60 min.
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => [
		index("idx_viva_sessions_submission_id").on(table.submissionId),
		index("idx_viva_sessions_student_id").on(table.studentId),
		index("idx_viva_sessions_tenant_id").on(table.tenantId),
		check(
			"viva_sessions_status_values",
			sql`${table.status} IN ('pending','in_progress','passed','failed','inconclusive','expired','superseded')`,
		),
		// Jedna ŻYWA sesja per zgłoszenie (pending/in_progress); stany końcowe
		// nie blokują ponownej vivy otwartej przez człowieka (ADR-013 D2.4).
		uniqueIndex("uq_viva_sessions_active")
			.on(table.submissionId)
			.where(sql`${table.status} IN ('pending','in_progress')`),
	],
);

export const vivaAnswers = pgTable(
	"viva_answers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => vivaSessions.id, { onDelete: "cascade" }),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		position: smallint("position").notNull(),
		// Surowa odpowiedź studenta — retencja 12 m-cy po rozstrzygnięciu
		// (ADR-013 D3; kasowanie zostawia resultJson sesji).
		content: text("content").notNull(),
		// Werdykt sędziego: { points 0-2, justification } — zapis po ocenie.
		verdictJson: jsonb("verdict_json"),
		answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_viva_answers_session_id").on(table.sessionId),
		index("idx_viva_answers_tenant_id").on(table.tenantId),
		uniqueIndex("uq_viva_answers_session_position").on(table.sessionId, table.position),
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

export const projectSubmissionsRelations = relations(projectSubmissions, ({ one, many }) => ({
	student: one(students, {
		fields: [projectSubmissions.studentId],
		references: [students.id],
	}),
	project: one(projects, {
		fields: [projectSubmissions.projectId],
		references: [projects.id],
	}),
	verifiedCompetencies: many(verifiedCompetencies),
}));

export const verifiedCompetenciesRelations = relations(verifiedCompetencies, ({ one }) => ({
	student: one(students, {
		fields: [verifiedCompetencies.studentId],
		references: [students.id],
	}),
	submission: one(projectSubmissions, {
		fields: [verifiedCompetencies.submissionId],
		references: [projectSubmissions.id],
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

// C11/1.13 — Tutor sokratyczny relations
export const tutorTurnsRelations = relations(tutorTurns, ({ one }) => ({
	student: one(students, { fields: [tutorTurns.studentId], references: [students.id] }),
	project: one(projects, { fields: [tutorTurns.projectId], references: [projects.id] }),
}));

// ============================================================================
// 1E.1 (ADR-014 D2, migracja 0035) — CURRICULUM: drabina modułów ścieżki
// edukacyjnej. Definicje treści (K-PUB — globalny katalog jak projects:
// brak tenant_id, brak RLS, GRANT SELECT dla app_student+app_faculty, zapis
// wyłącznie ingest/system per ADR-010): curriculum_modules,
// curriculum_path_modules (M:N moduł↔ścieżka — fundamenty współdzielone
// między ścieżkami, decyzja ADR-014 D2), curriculum_module_prereqs (model
// dopuszcza DAG, pilot wysyła łańcuch), curriculum_module_items,
// curriculum_item_concepts (jeden kręgosłup konceptów — mapowanie na bank
// A5), curriculum_item_resources (licencja/język/rejestracja/verified_at
// od dnia 1 — dług QG-5 spłacony w nowej encji).
//
// Dane studenta (K-INT, tenant, pełny wzorzec RLS 0030 — sekcja ręczna
// w 0035): curriculum_item_progress (stan pozycji), curriculum_item_answers
// (APPEND-ONLY — nośnik instrumentacji D11, cech FSRS 1E.4 i śladu streaka
// 1.18; ocena deterministyczna przy zapisie, 0 LLM), curriculum_module_progress
// (blokada prereq D3 + verified_by_method dla placementu/test-outu).
//
// Stan powtórek FSRS = OSOBNA tabela w 1E.4 (ADR-014 D2 świadomie jej nie
// projektuje); kind='review' to rezerwacja typu POZYCJI treści.
// Całość za flagą FLAG_CURRICULUM_PATH — OFF = zero zmian zachowania.
// ============================================================================

export const curriculumModules = pgTable(
	"curriculum_modules",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description"),
		// Parametry egzaminu per moduł (D3: liczba pytań, licznik błędów) —
		// konsument w 1E.3; NULL do tego czasu.
		examConfigJson: jsonb("exam_config_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	() => [],
);

export const curriculumPathModules = pgTable(
	"curriculum_path_modules",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// Klucz ścieżki kariery (pilot: 'data-science') — lista otwarta,
		// spójna z modelem kariery; celowo bez CHECK.
		pathKey: text("path_key").notNull(),
		moduleId: uuid("module_id")
			.notNull()
			.references(() => curriculumModules.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
	},
	(table) => [
		index("idx_curriculum_path_modules_module_id").on(table.moduleId),
		uniqueIndex("uq_curriculum_path_modules_path_module").on(table.pathKey, table.moduleId),
		uniqueIndex("uq_curriculum_path_modules_path_position").on(table.pathKey, table.position),
	],
);

export const curriculumModulePrereqs = pgTable(
	"curriculum_module_prereqs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		moduleId: uuid("module_id")
			.notNull()
			.references(() => curriculumModules.id, { onDelete: "cascade" }),
		requiresModuleId: uuid("requires_module_id")
			.notNull()
			.references(() => curriculumModules.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("idx_curriculum_module_prereqs_module_id").on(table.moduleId),
		uniqueIndex("uq_curriculum_module_prereqs_pair").on(table.moduleId, table.requiresModuleId),
		check("curriculum_module_prereqs_no_self", sql`${table.moduleId} <> ${table.requiresModuleId}`),
	],
);

export const curriculumModuleItems = pgTable(
	"curriculum_module_items",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		moduleId: uuid("module_id")
			.notNull()
			.references(() => curriculumModules.id, { onDelete: "cascade" }),
		// Tożsamość pozycji = stabilny slug w module (klucz upsertu ingestu —
		// ustalenie wiążące 1E.2 z przeglądu Ethana); position = TYLKO sortowanie.
		slug: text("slug").notNull(),
		position: integer("position").notNull(),
		// kind: CHECK lista miękka (konwencja repo jak assessment_sessions.kind)
		// — 'review' ZAREZERWOWANE pod FSRS 1E.4, bez konsumenta do tego czasu.
		kind: text("kind").notNull(),
		title: text("title").notNull(),
		// Teoria atomu (markdown, 300–600 słów wg ADR-014 D1); NULL dla pozycji
		// project (briefing żyje w projects.theoryMd — reuse-as-capstone D4).
		contentMd: text("content_md"),
		projectId: uuid("project_id").references(() => projects.id),
		// Parametry pozycji (D1/D3): liczba pytań, kamienie milowe projektu
		// (checks — implementacja automatów w 1E.6), konfiguracja labu.
		configJson: jsonb("config_json"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_curriculum_module_items_module_id").on(table.moduleId),
		uniqueIndex("uq_curriculum_module_items_module_slug").on(table.moduleId, table.slug),
		uniqueIndex("uq_curriculum_module_items_module_position").on(table.moduleId, table.position),
		check(
			"curriculum_module_items_kind_values",
			sql`${table.kind} IN ('theory','exercise','lab','project','exam','review')`,
		),
		check(
			"curriculum_module_items_project_ref",
			sql`${table.kind} <> 'project' OR ${table.projectId} IS NOT NULL`,
		),
	],
);

export const curriculumItemConcepts = pgTable(
	"curriculum_item_concepts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => curriculumModuleItems.id, { onDelete: "cascade" }),
		conceptId: uuid("concept_id")
			.notNull()
			.references(() => questionConcepts.id),
	},
	(table) => [
		index("idx_curriculum_item_concepts_item_id").on(table.itemId),
		index("idx_curriculum_item_concepts_concept_id").on(table.conceptId),
		uniqueIndex("uq_curriculum_item_concepts_pair").on(table.itemId, table.conceptId),
	],
);

export const curriculumItemResources = pgTable(
	"curriculum_item_resources",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => curriculumModuleItems.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		url: text("url").notNull(),
		type: text("type").notNull(),
		// QG-5 §3/§4/§7 od dnia 1 (ADR-014 D2/D4): licencja ustalona przy
		// kuracji, język (bariera EN — audyt 1E.0), jawna rejestracja,
		// data ostatniej weryfikacji linku (linia utrzymaniowa).
		license: text("license"),
		language: text("language"),
		registrationRequired: boolean("registration_required").notNull().default(false),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_curriculum_item_resources_item_id").on(table.itemId),
		check(
			"curriculum_item_resources_type_values",
			sql`${table.type} IN ('video','docs','course','book')`,
		),
	],
);

export const curriculumItemProgress = pgTable(
	"curriculum_item_progress",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		itemId: uuid("item_id")
			.notNull()
			.references(() => curriculumModuleItems.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("locked"),
		attempts: integer("attempts").notNull().default(0),
		lastAnswerAt: timestamp("last_answer_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_curriculum_item_progress_student_id").on(table.studentId),
		index("idx_curriculum_item_progress_tenant_id").on(table.tenantId),
		index("idx_curriculum_item_progress_item_id").on(table.itemId),
		uniqueIndex("uq_curriculum_item_progress_student_item").on(table.studentId, table.itemId),
		check(
			"curriculum_item_progress_status_values",
			sql`${table.status} IN ('locked','available','in_progress','completed','skipped_by_placement')`,
		),
	],
);

export const curriculumItemAnswers = pgTable(
	"curriculum_item_answers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		itemId: uuid("item_id")
			.notNull()
			.references(() => curriculumModuleItems.id, { onDelete: "cascade" }),
		questionItemId: uuid("question_item_id")
			.notNull()
			.references(() => questionItems.id),
		// Ocenione deterministycznie przy zapisie (wzorzec grade.ts A5) — 0 LLM.
		isCorrect: boolean("is_correct").notNull(),
		// Głębokość drabinki hintów w momencie odpowiedzi (0 = bez hintu,
		// 3 = pełne rozwiązanie) — sygnał D11 i adaptacyjnego fadingu D5.
		hintDepth: smallint("hint_depth").notNull().default(0),
		answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_curriculum_item_answers_student_answered").on(table.studentId, table.answeredAt),
		index("idx_curriculum_item_answers_tenant_id").on(table.tenantId),
		index("idx_curriculum_item_answers_item_id").on(table.itemId),
		check("curriculum_item_answers_hint_depth_range", sql`${table.hintDepth} BETWEEN 0 AND 3`),
	],
);

export const curriculumModuleProgress = pgTable(
	"curriculum_module_progress",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id),
		moduleId: uuid("module_id")
			.notNull()
			.references(() => curriculumModules.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("locked"),
		// NULL = zaliczony pełnym przejściem; wypełniane przez egzamin (1E.3),
		// placement (1E.7 — 'diagnostic') i test-out (D8).
		verifiedByMethod: text("verified_by_method"),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_curriculum_module_progress_student_id").on(table.studentId),
		index("idx_curriculum_module_progress_tenant_id").on(table.tenantId),
		uniqueIndex("uq_curriculum_module_progress_student_module").on(table.studentId, table.moduleId),
		check(
			"curriculum_module_progress_status_values",
			sql`${table.status} IN ('locked','available','in_progress','completed')`,
		),
		check(
			"curriculum_module_progress_method_values",
			sql`${table.verifiedByMethod} IS NULL OR ${table.verifiedByMethod} IN ('exam','diagnostic','test_out')`,
		),
	],
);

// 1E.1 — Curriculum relations
export const curriculumModulesRelations = relations(curriculumModules, ({ many }) => ({
	items: many(curriculumModuleItems),
	pathModules: many(curriculumPathModules),
}));

export const curriculumPathModulesRelations = relations(curriculumPathModules, ({ one }) => ({
	module: one(curriculumModules, {
		fields: [curriculumPathModules.moduleId],
		references: [curriculumModules.id],
	}),
}));

export const curriculumModuleItemsRelations = relations(curriculumModuleItems, ({ one, many }) => ({
	module: one(curriculumModules, {
		fields: [curriculumModuleItems.moduleId],
		references: [curriculumModules.id],
	}),
	project: one(projects, {
		fields: [curriculumModuleItems.projectId],
		references: [projects.id],
	}),
	concepts: many(curriculumItemConcepts),
	resources: many(curriculumItemResources),
}));

export const curriculumItemConceptsRelations = relations(curriculumItemConcepts, ({ one }) => ({
	item: one(curriculumModuleItems, {
		fields: [curriculumItemConcepts.itemId],
		references: [curriculumModuleItems.id],
	}),
	concept: one(questionConcepts, {
		fields: [curriculumItemConcepts.conceptId],
		references: [questionConcepts.id],
	}),
}));

export const curriculumItemResourcesRelations = relations(curriculumItemResources, ({ one }) => ({
	item: one(curriculumModuleItems, {
		fields: [curriculumItemResources.itemId],
		references: [curriculumModuleItems.id],
	}),
}));
