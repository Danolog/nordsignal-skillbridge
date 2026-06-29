CREATE TABLE "submission_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reviewer_type" text NOT NULL,
	"reviewer_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_reviews_decision_values" CHECK ("submission_reviews"."decision" IN ('approved','rejected')),
	CONSTRAINT "submission_reviews_reviewer_type_values" CHECK ("submission_reviews"."reviewer_type" IN ('faculty','quality_operator','auto_no_human'))
);
--> statement-breakpoint
ALTER TABLE "project_submissions" ADD COLUMN "needs_human_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deliverable_type" text DEFAULT 'mixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "submission_reviews" ADD CONSTRAINT "submission_reviews_submission_id_project_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."project_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_reviews" ADD CONSTRAINT "submission_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_submission_reviews_submission_id" ON "submission_reviews" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "idx_submission_reviews_tenant_id" ON "submission_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_submission_reviews_submission" ON "submission_reviews" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_deliverable_type_values" CHECK ("projects"."deliverable_type" IN ('code','document','detection_rule','sql','mixed'));--> statement-breakpoint

-- ============================================================================
-- Redesign weryfikacji — RLS dla submission_reviews. Sekcja DOPISANA RĘCZNIE
-- (drizzle-kit nie generuje RLS/GRANT). Wzorzec: 0008 (faculty_sees_tenant +
-- faculty_moderates_tenant na project_submissions) + 0012/0015 (FORCE +
-- owner_passthrough). ADR-003 (tenant_id denormalizowany, RLS JOIN-free) ·
-- ADR-005 (FORCE + owner_passthrough).
--
-- Decyzja schematu (§6.3): submission_reviews to decyzja CZŁOWIEKA o zgłoszeniu
-- (Etap 2, warstwa premium). Zapis robi wykładowca / operator jakości — rola
-- techniczna app_faculty (człowiek za nią NIE musi być specjalistą domenowym,
-- §6.4; reviewer_type rozróżnia faculty/quality_operator/auto_no_human). Grant
-- SELECT + INSERT dla app_faculty; polityka tenant-owa jak na project_submissions.
-- app_student CELOWO bez grantu w Fazie 1 — student widzi werdykt przez status
-- zgłoszenia, nie przez tę tabelę (widoczność decyzji premium dla studenta =
-- decyzja produktowa Fazy 3). owner_passthrough dla seed/migracji.
--
-- WSTECZNA ZGODNOŚĆ: cała migracja addytywna (CREATE TABLE + ADD COLUMN), zero
-- DROP/ALTER TYPE/zmiany danych — bezpieczna pod delegację v1.12.
-- ============================================================================

-- 1. Granty tabelowe — tylko app_faculty (RLS filtruje wiersze po tenancie).
GRANT SELECT, INSERT ON submission_reviews TO app_faculty;--> statement-breakpoint

-- 2. ENABLE + FORCE RLS (spójnie z resztą tabel z danymi tenantów).
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE submission_reviews FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- 3. faculty_sees_tenant (SELECT) — wykładowca czyta zgłoszenia swojego tenanta.
DROP POLICY IF EXISTS faculty_sees_tenant ON submission_reviews;--> statement-breakpoint
CREATE POLICY faculty_sees_tenant ON submission_reviews FOR SELECT TO app_faculty
	USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- 4. faculty_moderates_tenant (INSERT) — zapis decyzji tylko w swoim tenancie.
DROP POLICY IF EXISTS faculty_moderates_tenant ON submission_reviews;--> statement-breakpoint
CREATE POLICY faculty_moderates_tenant ON submission_reviews FOR INSERT TO app_faculty
	WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- 5. owner_passthrough (jak 0012/0015/ADR-005) — owner ma audytowalny passthrough.
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON submission_reviews');
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON submission_reviews FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK (wszystko cofalne — bez enumów, bez zmiany danych):
-- DO $$ BEGIN EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON submission_reviews'); END $$;
-- DROP POLICY IF EXISTS faculty_moderates_tenant ON submission_reviews;
-- DROP POLICY IF EXISTS faculty_sees_tenant ON submission_reviews;
-- DROP TABLE submission_reviews;
-- ALTER TABLE project_submissions DROP COLUMN needs_human_review;
-- ALTER TABLE projects DROP COLUMN deliverable_type;  -- (CHECK znika z kolumną)