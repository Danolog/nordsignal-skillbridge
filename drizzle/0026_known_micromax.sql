ALTER TABLE "students" ADD COLUMN "market_monitoring_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "market_monitoring_decided_at" timestamp with time zone;
-- AG.6: kolumny zgody RODO na powiadomienia o monitoringu rynku (opt-in,
-- decyzja Darka 2026-07-08). Bez zmian RLS — students objęte pełnym wzorcem
-- od 0012 (polityki działają na wierszach, nowe kolumny dziedziczą).
-- ROLLBACK:
-- ALTER TABLE students DROP COLUMN market_monitoring_consent;
-- ALTER TABLE students DROP COLUMN market_monitoring_decided_at;
