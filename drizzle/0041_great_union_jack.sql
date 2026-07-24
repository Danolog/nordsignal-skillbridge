ALTER TABLE "assessment_sessions" DROP CONSTRAINT "assessment_sessions_kind_values";--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD COLUMN "module_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessment_sessions_module_id" ON "assessment_sessions" USING btree ("module_id");--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_kind_values" CHECK ("assessment_sessions"."kind" IN ('diagnostic','module_exam'));--> statement-breakpoint

-- ============================================================================
-- 1E.3 (ADR-014 D9) — sekcja RĘCZNA (drizzle-kit nie generuje partial unique
-- z WHERE, ani indeksów wyrażeniowych). Przebudowa "jedna aktywna sesja".
--
-- Pierwotny (0030): UNIQUE (student_id, kind) WHERE status='in_progress'
--   → dla samego 'diagnostic' = jedna aktywna diagnoza per student.
-- Nowy: dokłada module_id, by test-out modułu A nie kolidował z egzaminem
--   modułu B ani z diagnozą (ADR D9). COALESCE(module_id, nil-uuid) bo
--   Postgres traktuje NULL jako różne w UNIQUE (NULLS DISTINCT) — bez COALESCE
--   dwie aktywne diagnozy (module_id NULL) omijałyby unikalność. Nil-uuid
--   scala wszystkie wiersze diagnostic (module_id NULL) w jeden klucz →
--   zachowana pierwotna gwarancja "jedna aktywna diagnoza per student".
--
-- Semantyka po zmianie: jedna aktywna sesja per (student_id, kind, module_id),
-- gdzie module_id NULL≡diagnostic liczony jako jeden. Operacja DROP+CREATE
-- INDEKSU — nie dotyka tabeli ani danych (addytywna, nieniszcząca).
-- ============================================================================
DROP INDEX IF EXISTS uq_assessment_sessions_active;--> statement-breakpoint
CREATE UNIQUE INDEX uq_assessment_sessions_active
	ON assessment_sessions (student_id, kind, COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::uuid))
	WHERE status = 'in_progress';--> statement-breakpoint

-- ============================================================================
-- 1E.3 (nota Leo W-1) — CHECK integralności egzaminu modułowego. Wpisany
-- RĘCZNIE (spójnie z sekcją indeksu wyżej, wzór 0030): drizzle-kit generuje
-- go do snapshotu, ale addytywny CHECK trzymamy w tej migracji, by nie
-- powstała osobna 0042 na jeden constraint.
--
-- Domyka trzecią dziurę poszerzonego CHECK kind: 'module_exam' z NULL-owym
-- module_id psuje niezmiennik uq_assessment_sessions_active — wszystkie
-- NULL-egzaminy scalają się w kubełek nil-uuid COALESCE. Przy fladze OFF =
-- 0 wierszy module_exam → CHECK zakłada się trywialnie (walidacja natychmiast).
-- ============================================================================
ALTER TABLE assessment_sessions ADD CONSTRAINT assessment_sessions_module_exam_requires_module
	CHECK (kind <> 'module_exam' OR module_id IS NOT NULL);

-- ROLLBACK:
-- ALTER TABLE assessment_sessions DROP CONSTRAINT assessment_sessions_module_exam_requires_module;
-- DROP INDEX IF EXISTS uq_assessment_sessions_active;
-- CREATE UNIQUE INDEX uq_assessment_sessions_active
--   ON assessment_sessions (student_id, kind) WHERE status = 'in_progress';
-- ALTER TABLE assessment_sessions DROP CONSTRAINT assessment_sessions_kind_values;
-- ALTER TABLE assessment_sessions ADD CONSTRAINT assessment_sessions_kind_values
--   CHECK (kind IN ('diagnostic'));
-- DROP INDEX IF EXISTS idx_assessment_sessions_module_id;
-- ALTER TABLE assessment_sessions DROP CONSTRAINT assessment_sessions_module_id_curriculum_modules_id_fk;
-- ALTER TABLE assessment_sessions DROP COLUMN module_id;