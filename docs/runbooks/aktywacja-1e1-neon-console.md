# Runbook: aktywacja 1E.1 przez konsolę Neona (SQL Editor)

**Data:** 2026-07-11 · **Wykonuje:** Darek [CZERWONA LINIA — zapisy na prod] ·
**Przygotował:** Oliver. Wariant konsolowy (bez terminala/psql). Każdy krok =
osobne uruchomienie w Neon SQL Editor, PO KOLEI. Rozjazd na którymkolwiek
kroku = STOP i wołaj Olivera.

## Krok 0 — backup (Neon UI, nie SQL)

Konsola Neon → **Branches → Create branch** z gałęzi głównej, nazwa:
`prod-backup-pre-0035-<RRRRMMDD-GGMM>`.

## Krok 1 — weryfikacja dziennika (sam odczyt)

```sql
SELECT count(*) AS wpisy,
       (SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1) AS ostatni_created_at
FROM drizzle.__drizzle_migrations;
```

**Oczekiwane: `wpisy = 35`** (prod = 0034). Inna liczba → STOP.

## Krok 2 — migracja 0035 (DDL)

Skopiuj CAŁĄ zawartość pliku **`drizzle/0035_black_senator_kelly.sql`**
(z GitHuba, gałąź `main`) i uruchom, opakowując w transakcję:

```sql
BEGIN;
-- <<< tu wklej całą zawartość 0035_black_senator_kelly.sql >>>
COMMIT;
```

Linie `--> statement-breakpoint` to komentarze SQL (`--`) — wklejasz plik 1:1,
niczego nie usuwasz. Wynik: 9 tabel `curriculum_*` + RLS/GRANT-y + 4 kolumny
na `project_learning_resources`.

## Krok 3 — wpis metadanych do dziennika drizzle (OBOWIĄZKOWY)

Ręczny SQL nie zapisuje dziennika — bez tego wpisu następny `pnpm db:migrate`
próbowałby nałożyć 0035 drugi raz (lekcja „rozjazd dziennika"):

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('b09d56d49846e3d72de4063e0b3098bbf31973aaa132d8e9ff5677603f7c5bb8', 1783768097863);
```

(hash = sha256 pliku 0035; created_at = `when` z `drizzle/meta/_journal.json`.)
Kontrola: zapytanie z Kroku 1 ma teraz zwrócić **36**.

## Krok 4 — ingest struktury drabiny (odpowiednik `pnpm db:ingest-curriculum`)

Idempotentny (drugi bieg = ten sam stan); guard w DO-bloku wycofa transakcję,
jeśli brakuje któregoś capstone'a w `projects`.

```sql
BEGIN;

-- Guard: 4 capstone'y muszą istnieć w projects
DO $$
DECLARE brakuje int;
BEGIN
  SELECT 4 - count(*) INTO brakuje FROM projects WHERE slug IN
    ('ds-eda-polska-w-liczbach-bdl','ds-sql-analiza-przejazdow',
     'ds-pierwszy-model-predykcyjny','ds-llm-strukturalna-ekstrakcja');
  IF brakuje <> 0 THEN
    RAISE EXCEPTION 'Brakuje % capstone(ow) w projects — ingest przerwany', brakuje;
  END IF;
END $$;

-- Moduły (upsert po slug)
INSERT INTO curriculum_modules (slug, title, description) VALUES
  ('l0-start', 'Start: środowisko pracy', 'Colab i notebook od zera — pierwsza uruchomiona komórka w ≤15 min od wejścia (ADR-014 D10). Wariant LEAN: 4 atomy-checklisty, zaliczenie przez wykonanie (pkt 10), bez egzaminu. Bez Gita i terminala (just-in-time — pkt 9).'),
  ('f1-python-1', 'Python I: zmienne, typy, warunki', 'Fundamenty od literalnego zera (persona ADR-014): atom = teoria 300–600 słów + worked example + 3 pytania.'),
  ('f2-python-2', 'Python II: pętle, funkcje, struktury danych', 'Ciąg dalszy fundamentów; fading wsparcia wzdłuż modułu (D5).'),
  ('f3-dane-python', 'Dane w Pythonie: pandas i pliki', 'Wejście w dane; zwieńczenie: MINI-PROJEKT transferowy (pkt 12b — pozycja dojdzie z treścią 1E.2).'),
  ('m-eda', 'EDA: eksploracja danych', 'Koncepty EDA + Git/terminal just-in-time; capstone: EDA na danych GUS BDL.'),
  ('m-sql', 'SQL: analiza danych w bazie', 'Od tabeli i SELECT po agregacje; capstone: analiza przejazdów w DuckDB.'),
  ('m-ml', 'Pierwszy model predykcyjny', 'Baseline, walidacja, leakage, metryki; capstone: pierwszy model w scikit-learn.'),
  ('m-llm', 'LLM: ekstrakcja strukturalna', 'Czym są LLM, strukturalne wyjście, ewaluacja z ground truth; capstone: ekstrakcja do JSON.')
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now();

-- Ścieżka data-science (delete+reinsert — czyste definicje)
DELETE FROM curriculum_path_modules WHERE path_key = 'data-science';
INSERT INTO curriculum_path_modules (path_key, module_id, position)
SELECT 'data-science', id, pos FROM (VALUES
  ('l0-start',1),('f1-python-1',2),('f2-python-2',3),('f3-dane-python',4),
  ('m-eda',5),('m-sql',6),('m-ml',7),('m-llm',8)
) AS l(slug,pos) JOIN curriculum_modules m ON m.slug = l.slug;

-- Prereqi: łańcuch liniowy z kolejności
DELETE FROM curriculum_module_prereqs WHERE module_id IN
  (SELECT id FROM curriculum_modules WHERE slug IN
   ('l0-start','f1-python-1','f2-python-2','f3-dane-python','m-eda','m-sql','m-ml','m-llm'));
INSERT INTO curriculum_module_prereqs (module_id, requires_module_id)
SELECT m.id, r.id FROM (VALUES
  ('f1-python-1','l0-start'),('f2-python-2','f1-python-1'),
  ('f3-dane-python','f2-python-2'),('m-eda','f3-dane-python'),
  ('m-sql','m-eda'),('m-ml','m-sql'),('m-llm','m-ml')
) AS chain(slug, req_slug)
JOIN curriculum_modules m ON m.slug = chain.slug
JOIN curriculum_modules r ON r.slug = chain.req_slug;

-- Pozycje capstone (upsert po (module_id, position))
INSERT INTO curriculum_module_items (module_id, position, kind, title, project_id)
SELECT m.id, 100, 'project', c.title, p.id FROM (VALUES
  ('m-eda','Capstone: Polska w liczbach — EDA na danych GUS BDL','ds-eda-polska-w-liczbach-bdl'),
  ('m-sql','Capstone: analiza przejazdów NYC w SQL','ds-sql-analiza-przejazdow'),
  ('m-ml','Capstone: pierwszy model predykcyjny','ds-pierwszy-model-predykcyjny'),
  ('m-llm','Capstone: strukturalna ekstrakcja z LLM','ds-llm-strukturalna-ekstrakcja')
) AS c(module_slug, title, project_slug)
JOIN curriculum_modules m ON m.slug = c.module_slug
JOIN projects p ON p.slug = c.project_slug
ON CONFLICT (module_id, position) DO UPDATE
  SET kind = EXCLUDED.kind, title = EXCLUDED.title,
      project_id = EXCLUDED.project_id, updated_at = now();

COMMIT;
```

## Krok 5 — weryfikacja końcowa (odczyt)

```sql
SELECT
  (SELECT count(*) FROM curriculum_modules)        AS moduly,        -- 8
  (SELECT count(*) FROM curriculum_path_modules
    WHERE path_key = 'data-science')               AS w_sciezce,     -- 8
  (SELECT count(*) FROM curriculum_module_prereqs) AS prereqi,       -- 7
  (SELECT count(*) FROM curriculum_module_items)   AS pozycje,       -- 4
  (SELECT count(*) FROM pg_policies
    WHERE tablename LIKE 'curriculum_%')           AS polityki_rls,  -- 6 (3 tabele × 2)
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS dziennik;   -- 36
```

**Oczekiwane: 8 / 8 / 7 / 4 / 6 / 36.** Zgadza się → migracja i ingest domknięte.

## Krok 6 — flaga (OSOBNA decyzja, kiedy zechcesz)

`FLAG_CURRICULUM_PATH=1` na Vercel (Production + Preview; env „sensitive" —
gdy CLI się pętli, wariant REST API z memory `vercel-env-preview-rest-api`)
+ redeploy. Do tego czasu prod nie zmienia zachowania.
