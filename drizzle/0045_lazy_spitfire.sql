-- ============================================================================
-- 1E.7 (SLICE L3) — TRWAŁY NOŚNIK ODBLOKOWANIA: curriculum_placements.
-- Wiersz per student × moduł, WYŁĄCZNIE dla modułów faktycznie otwartych
-- diagnozą, z pełnym werdyktem reguły L2 (concept_slug, level, threshold,
-- reason, support_mode, blocking_hole_slug, id sesji, unlocked_at).
--
-- Bramka PROJEKTOWA Ryana (CRCO) PRZED implementacją: rls-matrix v0.32 wiersz
-- #28, RoPA wpis #5, docs/data/retention.md. Wymóg produktowy Sophii v0.3
-- (DECYZJA 2 + §7 pkt 2): pełny werdykt, zapis w chwili odblokowania, nigdy
-- przeliczany wstecz i nienadpisywany przy ponownej diagnozie.
--
-- ⚠ NIE MYLIĆ z `placement_events` (0033) — tamto to placement ZAWODOWY
-- (staż/praca, K-PII, zgoda RODO, delete-on-revoke). Wspólne słowo, dwie różne
-- rzeczy: inna klasa danych, inna podstawa prawna, inna retencja.
--
-- 1) DOSTĘP (wariant klasy review_states / assessment_sessions, NIE DENY-both):
--    GRANT SELECT dla app_student + FORCE RLS + student_sees_own +
--    owner_passthrough. Uzasadnienie Ryana: żadne pole nie jest sekretem przed
--    studentem (level pochodzi z result_json TEJ SAMEJ sesji, na którą ma już
--    grant; reason/support_mode/blocking_hole_slug to wprost treść mikrocopy
--    pisanego DO studenta), więc DENY chroniłby wyłącznie przed nim samym.
--    ⚠ UCZCIWIE: ten grant NIE MA DZIŚ KONSUMENTA — wszystkie odczyty drabiny
--    idą połączeniem właściciela. RLS jest tu REZERWĄ na przyszłe trasy przez
--    withTenantContext, nie działającą kontrolą odczytu.
-- 2) app_faculty: REVOKE ALL — wykładowca nie widzi placementu żadnego
--    studenta, także zbiorczo. To warunek nośny A22-3 oceny art. 22 RODO
--    (skutek nie opuszcza ścieżki nauki), nie kosmetyka uprawnień.
-- 3) NIEZMIENNOŚĆ: UNIQUE(student_id, module_id) + zapis ON CONFLICT DO
--    NOTHING + wyzwalacz odrzucający UPDATE.
--    ⚠⚠ Wyzwalacz jest `BEFORE UPDATE`, **NIGDY** `BEFORE UPDATE OR DELETE`.
--    Odruchowe skopiowanie wzorca audit_log_append_only (0008/0010) ZŁAMAŁOBY
--    ART. 17 RODO: wyzwalacz odpala się także przy kasowaniu KASKADOWYM, więc
--    `DELETE FROM students` kończyłby się wyjątkiem i konta NIE DAŁOBY SIĘ
--    usunąć. Sprawdzone wykonaniem (znalezisko P-2 bramki Ryana). Różnica
--    wobec audit_log: tamta tabela nie ma rodzica kasującego kaskadą.
--    Wiersz jest NOŚNIKIEM UPRAWNIENIA (moduł otwarty ⟺ istnieje wiersz), nie
--    śladem — stąd retencja „czas trwania konta" i kasowanie wyłącznie kaskadą.
--
-- Migracja CZYSTO ADDYTYWNA (CREATE TABLE + GRANT + RLS + TRIGGER) — zero
-- DROP, zero DELETE, zero zmiany istniejących danych. Flaga
-- FLAG_PLACEMENT_DIAGNOSTIC domyślnie OFF → 0 wierszy do świadomego zapłonu.
-- ============================================================================
CREATE TABLE "curriculum_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"concept_slug" text,
	"level" smallint,
	"threshold" smallint NOT NULL,
	"reason" text NOT NULL,
	"support_mode" text NOT NULL,
	"blocking_hole_slug" text,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_placements_reason_values" CHECK ("curriculum_placements"."reason" IN ('qualified','carried_untagged')),
	CONSTRAINT "curriculum_placements_support_mode_values" CHECK ("curriculum_placements"."support_mode" IN ('full','fading')),
	CONSTRAINT "curriculum_placements_threshold_range" CHECK ("curriculum_placements"."threshold" BETWEEN 1 AND 4),
	CONSTRAINT "curriculum_placements_level_range" CHECK ("curriculum_placements"."level" IS NULL OR "curriculum_placements"."level" BETWEEN 1 AND 4),
	CONSTRAINT "curriculum_placements_verdict_shape" CHECK (("curriculum_placements"."reason" = 'qualified'
					AND "curriculum_placements"."concept_slug" IS NOT NULL
					AND "curriculum_placements"."level" IS NOT NULL
					AND "curriculum_placements"."level" >= "curriculum_placements"."threshold")
				OR ("curriculum_placements"."reason" = 'carried_untagged'
					AND "curriculum_placements"."concept_slug" IS NULL
					AND "curriculum_placements"."level" IS NULL
					AND "curriculum_placements"."support_mode" = 'full'))
);
--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD CONSTRAINT "curriculum_placements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD CONSTRAINT "curriculum_placements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD CONSTRAINT "curriculum_placements_module_id_curriculum_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."curriculum_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD CONSTRAINT "curriculum_placements_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_placements_student_module" ON "curriculum_placements" USING btree ("student_id","module_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_placements_tenant_id" ON "curriculum_placements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_placements_module_id" ON "curriculum_placements" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "idx_curriculum_placements_session_id" ON "curriculum_placements" USING btree ("assessment_session_id");--> statement-breakpoint

-- ============================================================================
-- Sekcja RĘCZNA (NIE generowana przez drizzle-kit) — uprawnienia, RLS,
-- niezmienność. Kolejność jak w 0042 (grant → ENABLE → FORCE → polityki).
-- ============================================================================

-- 1. Uprawnienia ról: student SELECT-only, wykładowca bez żadnych praw.
GRANT SELECT ON curriculum_placements TO app_student;--> statement-breakpoint
REVOKE ALL ON curriculum_placements FROM app_faculty;--> statement-breakpoint

-- 2. RLS: ENABLE + FORCE + student widzi WYŁĄCZNIE swoje + przepustka owner.
ALTER TABLE curriculum_placements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE curriculum_placements FORCE  ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS student_sees_own ON curriculum_placements;--> statement-breakpoint
CREATE POLICY student_sees_own ON curriculum_placements FOR SELECT TO app_student
	USING (student_id IN (SELECT id FROM students WHERE user_id = current_setting('app.current_user_id', true)));--> statement-breakpoint
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE 'DROP POLICY IF EXISTS owner_passthrough ON curriculum_placements';
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON curriculum_placements FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;--> statement-breakpoint

-- 3. Niezmienność wiersza — WYŁĄCZNIE względem UPDATE (patrz nagłówek, P-2).
--    Osobna funkcja zamiast reużycia audit_log_append_only(): tamta mówi
--    o audit_logu i o TRUNCATE, a przede wszystkim jej wzorzec wpięcia
--    (BEFORE UPDATE OR DELETE) jest tu ZABRONIONY. Własna funkcja + własny
--    komunikat = mniejsza szansa, że ktoś dopnie ją kiedyś do DELETE.
CREATE OR REPLACE FUNCTION curriculum_placements_append_only() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'curriculum_placements jest append-only wzgledem UPDATE (TG_OP=%): druga diagnoza DOKLADA wiersze (ON CONFLICT DO NOTHING), nigdy nie przepisuje powodu pierwszego otwarcia. Kasowanie: WYLACZNIE kaskada art. 17 RODO.', TG_OP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS curriculum_placements_no_update ON curriculum_placements;--> statement-breakpoint
CREATE TRIGGER curriculum_placements_no_update
	BEFORE UPDATE ON curriculum_placements
	FOR EACH ROW EXECUTE FUNCTION curriculum_placements_append_only();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS curriculum_placements_no_update ON curriculum_placements;
-- DROP FUNCTION IF EXISTS curriculum_placements_append_only();
-- DROP POLICY IF EXISTS owner_passthrough ON curriculum_placements;
-- DROP POLICY IF EXISTS student_sees_own ON curriculum_placements;
-- DROP TABLE curriculum_placements;
-- ⚠ Wycofanie KASUJE NOŚNIK UPRAWNIENIA, nie ślad: każdy student traci moduły
-- otwarte diagnozą (drabina wraca do stanu „przechodź po kolei"), a miernik
-- progu (DECYZJA 2 Sophii) traci dane, których NIE DA SIĘ odtworzyć wstecz —
-- result_json tych sesji będzie później czytany inną mapą tagów. Przy fladze
-- FLAG_PLACEMENT_DIAGNOSTIC=OFF tabela jest pusta i rollback jest bezkosztowy;
-- po zapłonie flagi wycofanie wymaga świadomej decyzji, nie odruchu.