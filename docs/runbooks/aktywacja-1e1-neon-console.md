# Runbook: aktywacja 1E.1 przez konsolę Neona (SQL Editor)

**Data:** 2026-07-11 · **Wykonuje:** Darek [CZERWONA LINIA — zapisy na prod] ·
**Przygotował:** Oliver. Wariant konsolowy (bez terminala/psql). Każdy krok =
osobne uruchomienie w Neon SQL Editor, PO KOLEI. Rozjazd na którymkolwiek
kroku = STOP i wołaj Olivera.

> **Status: zapis konkretnego, datowanego wykonania (2026-07-11), nie procedura
> bieżąca.** Liczby kontrolne w Krokach 1, 3 i 5 opisują stan z tamtego dnia
> i od tego czasu urosły (dziennik migracji, liczba modułów). Bieżący stan
> drabiny wynika z manifestu `tools/content/curriculum-ds-drabina.json`, nie
> z tego pliku. Ten sam status ma runbook 1E.2 (nota na jego końcu).
>
> **Zasięg wariantu konsolowego: wyłącznie kroki schemy (0, 1, 2, 3, 5).**
> Krok 4 — treść — wchodzi narzędziem ingestu z terminala i celowo wychodzi poza
> konsolę: treść ma jeden nośnik (manifest), a konsola wymusza jej przepisanie.
> Wykonawcą nie jest już Darek przy konsoli, tylko Ethan (CTO) narzędziem
> (CLAUDE.md v1.12, delegacja zmian w bazie produkcyjnej), więc ograniczenie
> „bez terminala", które kształtowało ten plik w lipcu, przestało obowiązywać.

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

## Krok 4 — ingest struktury drabiny (z manifestu, nie z tego pliku)

Struktura drabiny — moduły, ich tytuły i opisy, kolejność w ścieżce,
prerekwizyty i pozycje projektów końcowych — ma **dokładnie jeden nośnik**:
manifest `tools/content/curriculum-ds-drabina.json`. Ten runbook go **woła**,
nie **przepisuje** (CLAUDE.md v1.17, sekcja 8).

```bash
git pull && pnpm install
DATABASE_URL='<PROD DIRECT — wariant bez poolera, z Connect w konsoli Neona>' \
  CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum
```

Narzędzie jest idempotentne i transakcyjne (drugi bieg = ten sam stan, błąd
w środku = wycofanie całości) i samo sprawdza, czy projekty końcowe istnieją
w `projects` — bez nich przerywa. Ten sam wariant, w tym samym kształcie,
wykonuje Krok 7 runbooka 1E.2.

> **Dlaczego nie ma tu gotowego SQL-a do wklejenia (zmiana 2026-08-12, Sophia).**
> Do dziś ten krok niósł blok `INSERT … ON CONFLICT (slug) DO UPDATE SET
> description = …` z **kopią** tytułów i opisów modułów — czyli z treścią, którą
> czyta student. Kopia została zamrożona 2026-07-11 (commit `ce4fe18`) i od tego
> dnia rozjeżdżała się z manifestem: w chwili usunięcia **8 z 8 opisów i 4 z 8
> tytułów** różniły się od manifestu, brakowało całego modułu `m-pandas`
> (manifest: 9 modułów), a sam ładunek zawierał **19 trafień** kodu wewnętrznego
> („ADR-014", „LEAN", „pkt 10", „Capstone: …"), którego strażnik języka
> `tests/unit/ds/jezyk-produktu.contract.test.ts` nie dopuszcza w manifescie.
> Wklejenie tego bloku po dzisiejszej kuracji treści cofnęłoby ją po cichu — a
> dodatkowo `DELETE FROM curriculum_path_modules WHERE path_key = 'data-science'`
> wyrzuciłoby `m-pandas` ze ścieżki. Ładunku świadomie **nie odtwarzamy**: kto
> potrzebuje stanu z 2026-07-11, czyta manifest z commita `a009cde`.
> Klasy pilnuje strażnik `tests/unit/ds/dokumentacja-bez-tresci.contract.test.ts`.

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

**Oczekiwane 2026-07-11: 8 / 8 / 7 / 4 / 6 / 36.** Zgadza się → migracja i ingest
domknięte. Liczby modułów/pozycji/prereqów są **z tamtego dnia** — dziś wynikają
z manifestu (po podziale M-EDA na `m-pandas` + `m-eda` jest ich 9). Nie traktuj
ich jako bieżącego oczekiwania.

## Krok 6 — flaga (OSOBNA decyzja, kiedy zechcesz)

`FLAG_CURRICULUM_PATH=1` na Vercel (Production + Preview; env „sensitive" —
gdy CLI się pętli, wariant REST API z memory `vercel-env-preview-rest-api`)
+ redeploy. Do tego czasu prod nie zmienia zachowania.
