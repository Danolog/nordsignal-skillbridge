-- Naprawa dziennika migracji drizzle na prodzie (2026-07-02).
--
-- KONTEKST: migracja 0019 (submission_reviews + needs_human_review +
-- deliverable_type + RLS) została zastosowana na prodzie ręcznym SQL-em
-- (wzorzec ADR-009/010), ale BEZ wpisu do drizzle.__drizzle_migrations.
-- Przez to `pnpm db:migrate` próbuje wykonać 0019 ponownie i pada na
-- "relation submission_reviews already exists" (42P07), blokując 0020.
--
-- Zweryfikowano przed napisaniem tego pliku (read-only diagnostyka):
--  - dziennik prod: 0000–0018 (ostatni created_at=1782471235007 = 0018),
--  - hashe 0017/0018 w dzienniku == sha256 plików lokalnych (co do bajta),
--  - obiekty 0019 istnieją W KOMPLECIE (tabela, 2 kolumny, 3 polityki, FORCE RLS),
--  - ai_usage_ledger (0020) nie istnieje.
--
-- DZIAŁANIE: dopisuje wyłącznie wiersz metadanych 0019. hash = sha256 pliku
-- drizzle/0019_parched_black_bird.sql; created_at = folderMillis z
-- drizzle/meta/_journal.json (migrator drizzle porównuje TYLKO created_at).
--
-- ROLLBACK: DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1782757485042;

BEGIN;

DO $$
BEGIN
	-- Idempotencja: wpis już jest → przerwij zamiast dublować.
	IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1782757485042) THEN
		RAISE EXCEPTION 'Wpis 0019 (created_at=1782757485042) już istnieje — nic do naprawy.';
	END IF;
	-- Bezpiecznik: dopisujemy wpis TYLKO jeśli obiekty 0019 naprawdę istnieją.
	IF to_regclass('public.submission_reviews') IS NULL THEN
		RAISE EXCEPTION 'submission_reviews NIE istnieje — 0019 nie była zastosowana; ten fix nie ma prawa wjechać.';
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'project_submissions' AND column_name = 'needs_human_review'
	) THEN
		RAISE EXCEPTION 'Brak kolumny needs_human_review — 0019 zastosowana częściowo; wymagana ręczna analiza.';
	END IF;
END $$;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('80eda0814b29eb0fe51dd30f1bcba3b842aa2bbaa33bfc0b3aadbf2e98149e49', 1782757485042);

COMMIT;
