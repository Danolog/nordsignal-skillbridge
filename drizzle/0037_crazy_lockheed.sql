CREATE TABLE "verified_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"competency_name" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verified_competencies" ADD CONSTRAINT "verified_competencies_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_competencies" ADD CONSTRAINT "verified_competencies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_competencies" ADD CONSTRAINT "verified_competencies_submission_id_project_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."project_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_verified_competencies_student_id" ON "verified_competencies" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_verified_competencies_tenant_id" ON "verified_competencies" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_verified_competencies_submission_name" ON "verified_competencies" USING btree ("submission_id","competency_name");
--> statement-breakpoint
-- ============================================================================
-- Blok C planu napraw: RLS dla verified_competencies — pełny wzorzec 0034:
-- grant TYLKO SELECT app_student (zapisy wyłącznie owner-side przez
-- reconcileVerifiedCompetencies), app_faculty bez grantu (REVOKE ALL);
-- ENABLE+FORCE + student_sees_own + owner_passthrough.
-- ============================================================================
GRANT SELECT ON verified_competencies TO app_student;--> statement-breakpoint
REVOKE ALL ON verified_competencies FROM app_faculty;--> statement-breakpoint
ALTER TABLE verified_competencies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE verified_competencies FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY student_sees_own ON verified_competencies FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
-- DROP+CREATE zamiast IF NOT EXISTS — nota INFO (b) audytu Ryana v0.25
-- (tożsamość roli w polityce ma być deterministyczna po każdej migracji).
DO $$
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON verified_competencies';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON verified_competencies FOR ALL TO %I USING (true) WITH CHECK (true)',
		current_user
	);
END $$;
--> statement-breakpoint
-- ============================================================================
-- Backfill (C5): kredencjały z istniejących submisji status='verified' ×
-- katalog required. Świadomie NIE przenosimy wierszy competencies
-- (self/diagnostic) — samoocena nie jest kredencjałem (decyzja D1 Darka).
-- Na prodzie w chwili pisania: 1 submisja. Idempotentne (ON CONFLICT).
-- ============================================================================
INSERT INTO verified_competencies (student_id, tenant_id, submission_id, competency_name, verified_at)
SELECT ps.student_id, ps.tenant_id, ps.id, pc.competency_name, COALESCE(ps.updated_at, now())
FROM project_submissions ps
JOIN project_competencies pc ON pc.project_id = ps.project_id AND pc.role = 'required'
WHERE ps.status = 'verified'
ON CONFLICT (submission_id, competency_name) DO NOTHING;