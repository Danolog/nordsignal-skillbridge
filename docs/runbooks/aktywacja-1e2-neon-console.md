# Runbook: aktywacja 1E.2 na prodzie (migracja 0036 + treść fundamentów)

**Operator:** Darek (zapisy na prod = [CZERWONA LINIA], ADR-009/010).
**Wzorzec:** `aktywacja-1e1-neon-console.md` (0035) — konsola Neona + wpis
metadanych dziennika, ingest z terminala Darka.
**Stan wyjściowy:** prod = 0035 (dziennik: 36 wpisów), 1E.1 LIVE
(`FLAG_CURRICULUM_PATH=1`), capstone'y DS w `projects` (ingest 1E.1).

**Kolejność jest częścią procedury** (lekcja „migracja przed deploy"): trasa
answer po PR #164 czyta kolumnę `option_feedback_json` przy zapalonej fladze —
migracja MUSI wyprzedzić merge.

## Krok 1 — backup gałęzią Neona

Konsola Neon → Branches → New branch z production, nazwa:
`prod-backup-pre-0036-<RRRRMMDD-HHMM>`.

## Krok 2 — kontrola dziennika PRZED

```sql
SELECT count(*) FROM drizzle.__drizzle_migrations;   -- oczekiwane: 36
```

## Krok 3 — DDL 0036 (SQL Editor, po kolei)

```sql
ALTER TABLE "curriculum_module_items" ADD COLUMN "slug" text;

UPDATE "curriculum_module_items" SET "slug" = CASE
	WHEN "kind" = 'project' THEN 'capstone'
	ELSE 'item-' || "position"::text
END WHERE "slug" IS NULL;

ALTER TABLE "curriculum_module_items" ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "question_items" ADD COLUMN "option_feedback_json" jsonb;

CREATE UNIQUE INDEX "uq_curriculum_module_items_module_slug"
  ON "curriculum_module_items" USING btree ("module_id","slug");
```

## Krok 4 — wpis metadanych dziennika (spójność z `_journal.json`)

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
  ('ad283a1b0a7d9ce81e7f1e7feff1bb4efb2f8d6c70e013f42782e01dcc483ddd', 1783778817693);
```

## Krok 5 — weryfikacja migracji

```sql
SELECT count(*) FROM drizzle.__drizzle_migrations;                    -- 37
SELECT slug, count(*) FROM curriculum_module_items GROUP BY slug;     -- capstone: 4
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'question_items' AND column_name = 'option_feedback_json';  -- 1 wiersz
```

## Krok 6 — merge PR-ów (kolejność: #164, potem #165)

Auto-deploy Vercela po #164; smoke: `/api/curriculum` → 401 (trasa żywa),
logi bez błędów. Potem merge #165 (sama treść/narzędzia — deploy bez zmian
zachowania; treść wchodzi dopiero ingestem).

## Krok 7 — ingest treści (terminal Darka, repo na main po merge'ach)

```bash
git pull && pnpm install
DATABASE_URL='<PROD DIRECT — wariant bez poolera, z Connect w konsoli Neona>' \
  CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum
```

Oczekiwany wydruk: `moduły=9, pozycje=32, prereqi=8`; bank
`koncepty=19, pytania: +57 nowe`; `0 downgrade(ów)` (prod nie ma postępu
studentów na fundamentach). Ingest jest idempotentny i transakcyjny — błąd
w środku = rollback całości.

## Krok 8 — weryfikacja końcowa

```sql
SELECT m.slug, count(i.id) FROM curriculum_modules m
  LEFT JOIN curriculum_module_items i ON i.module_id = m.id
 GROUP BY m.slug ORDER BY m.slug;
-- l0-start: 4 · f1-python-1: 8 · f2-python-2: 8 · f3-dane-python: 8
-- m-pandas: 0 · m-eda/m-sql/m-ml/m-llm: po 1 (capstone)

SELECT count(*) FROM question_concepts WHERE trunk = 'foundations' AND status = 'active';  -- 19
SELECT count(*) FROM question_items q JOIN question_concepts c ON c.id = q.concept_id
 WHERE c.trunk = 'foundations' AND q.status = 'active';                                    -- 57
```

Smoke przeglądarkowy/HTTP: login konta testowego → `GET /api/curriculum`
(drabina 9 modułów, L0 available z itemCount 4).

## Uwagi

- **Onboarding realnych studentów jeszcze NIE** — laby L0 są niekompletowalne
  do 1E.6 (checki automatyczne, notebooki Colab w budowie — TODO Sophii).
  Treść na prodzie = gotowość danych, nie start ścieżki.
- Rollback treści: flaga OFF (`FLAG_CURRICULUM_PATH`) chowa całą powierzchnię;
  rollback migracji = gałąź backup.
- Przyszłe dogrywki treści: `pnpm content:pack-curriculum` → ingest; zmiana
  pytań pozycji z postępem studentów zażąda `CONFIRM_CONTENT_MIGRATION=1`
  (strażnik z ustaleń Ethana) i zrobi jawny downgrade module_progress
  (decyzja Darka 2026-07-11).
