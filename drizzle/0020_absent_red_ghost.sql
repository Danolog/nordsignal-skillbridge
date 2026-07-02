CREATE TABLE "ai_usage_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"tier" text NOT NULL,
	"model_id" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6),
	"success" boolean NOT NULL,
	"error_name" text,
	"latency_ms" integer,
	"user_id" text,
	"student_id" uuid,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_ledger_tier_values" CHECK ("ai_usage_ledger"."tier" IN ('standard','fast','premium'))
);
--> statement-breakpoint
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_usage_ledger_created_at" ON "ai_usage_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_ledger_scope" ON "ai_usage_ledger" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_ledger_student_id" ON "ai_usage_ledger" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_ledger_tenant_id" ON "ai_usage_ledger" USING btree ("tenant_id");--> statement-breakpoint

-- ============================================================================
-- Zadanie 0.0 — RLS dla ai_usage_ledger. Sekcja DOPISANA RĘCZNIE (drizzle-kit
-- nie generuje RLS/GRANT). Wzorzec: 0012/0015/0019 (FORCE + owner_passthrough).
--
-- Decyzja dostępowa (ADR-002/004 — nic per-student nie wycieka do wykładowcy):
-- to telemetria OPERACYJNA (koszt/tokeny/błędy per wywołanie LLM), pisana
-- wyłącznie przez owner `db` w src/lib/ai/usage.ts (best-effort, jak audit_log).
--  - app_student: ZERO grantów — student nie widzi kosztów (swoich ani cudzych).
--  - app_faculty: ZERO grantów — koszty per student to dane operacyjne, nie
--    panel wykładowcy; agregaty (tools/report-ai-usage.ts) czyta owner/ops.
-- ENABLE + FORCE RLS mimo braku grantów = obrona w głąb: przyszły omyłkowy
-- GRANT bez polityki nadal zwróci 0 wierszy (deny-default).
-- ============================================================================

ALTER TABLE ai_usage_ledger ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE ai_usage_ledger FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- owner_passthrough (jak 0012/0015/ADR-005) — zapisy wrappera i raport ops.
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON ai_usage_ledger');
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON ai_usage_ledger FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK (migracja w pełni addytywna — bez enumów, bez zmiany danych):
-- DO $$ BEGIN EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON ai_usage_ledger'); END $$;
-- DROP TABLE ai_usage_ledger;
-- (kod aplikacji: wrapper withAiUsage jest przezroczysty — revert PR wystarczy)