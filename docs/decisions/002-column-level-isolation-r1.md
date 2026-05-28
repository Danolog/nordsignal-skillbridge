# Decision Document: Column-level Isolation R1 (samoocena vs zapytanie wykładowcy)

**Status:** Accepted
**Date:** 2026-05-28
**Author:** Ethan (with Claude Code)
**Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — 2026-05-28. Mechanizm (column-level `REVOKE`/`GRANT` na `app_faculty`) zaakceptowany jako rekomendowane rozwiązanie R1; migracja X uruchamiana wraz z dodaniem kolumny `competencies.self_assessment` (osobny ADR produktowy + asercja `k3-validate` + test cross-privilege wg „Validation plan").
**Related:** `docs/security/rls-matrix.md` §3 (wiersz 2 — `competencies`), §8 #2 (dług utwardzenia — strona zapisu i odczytu) · ADR-003 (WHERE primary + RLS defense-in-depth) · migracja `drizzle/0008_faculty_tenant_and_rls.sql`

---

## Context

Planowane jest dodanie do `competencies` kolumny **`self_assessment`** — prywatnej, studenckiej samooceny kompetencji (skala uznaniowa, np. 1–5). Klasa danych: **K-INT z dodatkowym ograniczeniem widoczności** — student widzi swoje, ale **wykładowca nie powinien widzieć** żadnej wartości (ani per-student, ani w agregacie/inferencji). Powód: samoocena jest narzędziem refleksyjnym; ujawnienie wykładowcy zmienia ją w element oceny formalnej i niszczy szczerość zapisu.

Ethan oznaczył to jako wymóg **R1** w przeglądzie feasibility schematu i trafnie zauważył: *„izolacja na poziomie wiersza tego nie robi"*. Dziś (`feat/k3-rls-multitenancy`, 2026-05-28):

- `competencies` nie ma jeszcze kolumny `self_assessment` (`src/lib/db/schema.ts:140` — pola: `status`, `market_percentage`, metadane).
- `app_faculty` ma **tabelowy** `GRANT SELECT ON competencies` (`drizzle/0008_faculty_tenant_and_rls.sql:33`).
- Polityka `faculty_sees_tenant ON competencies FOR SELECT TO app_faculty` filtruje wyłącznie **wiersze** po `tenant_id`.
- Każda nowa kolumna dołożona do `competencies` byłaby dla `app_faculty` natychmiast czytelna — bez dodatkowej akcji R1 jest luką.

Po stronie zapisu analogiczny dług został już nazwany w `rls-matrix.md §8 #2` (faculty UPDATE nieograniczony kolumnowo, sugestia: column-level GRANT lub trigger). R1 jest brakującym lustrem po stronie odczytu.

---

## Problem

**RLS w Postgres nie umie izolować kolumn.** Polityki RLS (`CREATE POLICY ... USING (<predicate>) WITH CHECK (<predicate>)`) są **predykatami wierszowymi** — boolean decydujący *czy* dany wiersz jest widzialny dla danej roli. Nie istnieje konstrukcja `POLICY ... HIDE COLUMNS (...)`. Po przejściu predykatu wiersz wraca w całości (ze wszystkimi kolumnami, na które rola ma `SELECT`).

Konsekwencja dla R1: `faculty_sees_tenant ON competencies` przepuszcza całe wiersze własnego tenanta. Sama RLS — niezależnie od tego jak pomysłowo skonstruowana — **nie zatrzyma** zapytania `SELECT self_assessment FROM competencies` wykonanego pod `app_faculty`.

Tajność kolumny w Postgres dają wyłącznie trzy mechanizmy:

1. **System przywilejów na kolumnach** — `GRANT SELECT (col1, col2) ON tbl TO role` / `REVOKE`. Egzekwowane przez planer i wykonywany na każdym referencji do kolumny (również w `WHERE`, agregatach).
2. **Rozdzielenie do osobnej tabeli** bez `GRANT` dla danej roli — rola fizycznie nie ma dostępu do obiektu.
3. **Widok z whitelistą kolumn** (`security_barrier`), do którego rola ma `SELECT`, przy `REVOKE` na tabeli bazowej.

---

## Decision

**Column-level `GRANT`/`REVOKE` na `competencies` dla roli `app_faculty`.** Po dodaniu kolumny `self_assessment` migracją X (do zaplanowania osobno) wykonujemy:

```sql
-- ILUSTRACJA — nie migracja w tym ADR. Migracja X powstanie po greenlightcie R1.
REVOKE SELECT ON competencies FROM app_faculty;
GRANT SELECT (id, student_id, tenant_id, name, status, market_percentage, created_at)
  ON competencies TO app_faculty;
-- self_assessment celowo NIE jest w liście — app_faculty nie ma na nią SELECT.
```

Efekt netto pod `SET LOCAL ROLE app_faculty`:
- `SELECT self_assessment FROM competencies` → `ERROR: permission denied for column self_assessment`.
- `SELECT * FROM competencies` → ten sam błąd (rozwinięcie `*` próbuje wszystkich kolumn).
- `SELECT count(*) FROM competencies WHERE self_assessment > 3` → ten sam błąd (referencja w `WHERE` także sprawdza przywilej kolumnowy).
- `SELECT id, name, status FROM competencies WHERE tenant_id = <swój>` → OK, jak dotąd (RLS przepuszcza, kolumny dozwolone).

To rekomendacja **niezależna od ADR-003 / RLS** — działają warstwowo: RLS dalej filtruje wiersze, column-GRANT odcina kolumnę.

---

## Why this variant

| # | Kryterium | Column-level GRANT | Osobna tabela | Widok faculty |
|---|---|---|---|---|
| 1 | Egzekwowane w bazie | ✅ | ✅ | ✅ (gdy `REVOKE` na bazowej) |
| 2 | Powierzchnia zmian | minimalna (1 para REVOKE/GRANT) | duża (nowa tabela, FK, JOIN w widokach studenta, migracja danych przy ewentualnym wstecznym wypełnieniu) | średnia (1 obiekt + REVOKE) |
| 3 | Deny-by-default dla **przyszłych** kolumn | ✅ (po przejściu na listę kolumnową) | ✅ (kolumny w innej tabeli nigdy nie są widoczne) | ⚠️ (widok trzeba aktualizować ręcznie) |
| 4 | `SELECT *` faculty | ❌ łamie (gotcha #1) | ✅ działa (kolumny nie istnieją w tabeli) | ⚠️ działa tylko jeśli faculty czyta widok, nie bazę |
| 5 | Wspiera inferencję przez `WHERE`/agregat | nie (przywilej kolumnowy obejmuje referencje) | nie | nie |
| 6 | Spójność z §8 #2 (sugestia ADR) | ✅ wprost | częściowo | częściowo |

Column-GRANT wygrywa dla **pojedynczej** wrażliwej kolumny przy żywej tabeli. Osobna tabela zostaje opcją odwrotną, gdyby R1 rozszerzyło się na 3+ kolumny lub wymagało własnego cyklu retencji.

---

## Consequences / gotchas

1. **`SELECT *` przestaje działać dla faculty na `competencies`.** Ścieżki faculty muszą enumerować kolumny. Stan obecny:
   - `src/app/api/faculty/dashboard/route.ts` używa jawnego `.select({...})` → kompatybilne, nie wymaga zmiany.
   - `db.query.competencies.findMany()` (styl relacyjny Drizzle) wybiera wszystkie kolumny → pod `app_faculty` rzuci błąd. Reguła: **faculty na `competencies` używa wyłącznie jawnego `.select`**, nigdy `db.query.*`. Do dodania jako check w lint K4 (warstwa 3) lub przegląd code review przy migracji X.
2. **GRANT kolumnowy nie zastępuje RLS — pracują warstwowo.** Wiersze nadal filtruje `faculty_sees_tenant` (tenant izolacja), GRANT odcina kolumnę. Usunięcie któregokolwiek z dwóch psuje izolację.
3. **Spójność z owner-bypass (rls-matrix §1, §8 #1).** Runtime łączy się jako `neondb_owner` i przełącza rolę przez `withTenantContext`/`SET LOCAL ROLE app_faculty` (`src/lib/db/tenant-context.ts:50`). Owner omija RLS i przywileje, ale **column-GRANT egzekwuje się po `SET LOCAL ROLE`** — rola nie-owner podlega regulom GRANT. Izolacja R1 działa zatem dokładnie na tych ścieżkach, które przechodzą przez `SET LOCAL ROLE app_faculty` (dziś: faculty dashboard). To ten sam warunek brzegowy co reszta egzekucji RLS faculty — nie wprowadza nowej klasy zależności.
4. **Inferencja przez stronę studenta nie jest celem ADR.** Jeśli student bezpiecznie zapisuje `self_assessment` przez własne ścieżki (RLS `student_sees_own` + jawny WHERE), wartość nie wycieka do faculty. ADR **nie chroni** przed wykładowcą, który łamie inne warstwy (np. ma dostęp do logów, audyt) — to inne kontrole (`audit_log` deny-client, retencja).
5. **Backfill historyczny.** Jeśli `self_assessment` pojawi się z wartością default lub backfillem, fakt istnienia kolumny i jej rozkład **nie** wyciekają (`information_schema.columns` jest publiczny w PG, ale dla `app_faculty` nazwa kolumny nie zdradza wartości). Nazwa kolumny pozostaje widoczna w katalogu systemowym — to akceptowalny kompromis (alternatywą jest osobna tabela).

---

## Alternatives considered

- **Osobna tabela `competency_self_assessments (competency_id PK FK, value, …)`** bez `GRANT` dla `app_faculty`. Najszczelniejsza (nazwa obiektu poza zasięgiem faculty), ale: dodatkowa tabela, JOIN po stronie studenta przy każdym widoku samooceny, większa migracja, ryzyko driftu z `competencies`. **Odrzucone** dla pojedynczej kolumny; do rozważenia, gdy R1 rozrośnie się o kolejne prywatne pola lub własną politykę retencji.
- **Widok `competencies_faculty` z whitelistą kolumn**, `REVOKE` na tabeli bazowej. Daje ten sam efekt funkcjonalnie, ale dokłada obiekt do utrzymania (synchronizacja widoku przy zmianach schemy) i komplikuje istniejące zapytania faculty (musiałyby przepisać `from(competencies)` na widok). Korzyść dyskusyjna przy column-GRANT pełniącym tę samą rolę.
- **Maskowanie aplikacyjne** (filtrowanie pola w warstwie handlera). Odrzucone wprost — to ta sama klasa kontroli, którą `§8 #2` nazywa już *długiem*. R1 wymaga egzekucji w bazie.

---

## Validation plan (przyszła implementacja — NIE w tym ADR)

Gdy R1 dostanie greenlight i powstanie migracja X:

1. **Migracja `00XX_faculty_column_grant_self_assessment.sql`** zawierająca:
   - `ALTER TABLE competencies ADD COLUMN self_assessment ...` (typ + default do decyzji w osobnym ADR domeny produktowej).
   - `REVOKE SELECT ON competencies FROM app_faculty;`
   - `GRANT SELECT (<lista bez self_assessment>) ON competencies TO app_faculty;`
   - Rollback w komentarzu (analogicznie do `0008`).
2. **`tools/k3-validate.ts`** — asercja przez `information_schema.column_privileges`:
   ```
   SELECT 1 FROM information_schema.column_privileges
   WHERE grantee = 'app_faculty' AND table_name = 'competencies'
     AND column_name = 'self_assessment';
   -- oczekiwane: 0 wierszy
   ```
   Asercja wpięta do CI gate (jak istniejące testy izolacji 7/7 z §7 DoD).
3. **Test cross-privilege (Vitest/integration):** pod `SET LOCAL ROLE app_faculty` i ustawionym `app.current_tenant_id`, wykonać `SELECT self_assessment FROM competencies` → oczekiwany `error.code = '42501'` (`insufficient_privilege`). Analogicznie do testu „faculty A nie moderuje submisji B".
4. **Update `rls-matrix.md`:** §3 wiersz 2 + §8 #2 + bump nagłówka wersji — **wykonane łącznie z tym ADR** (patrz „Files touched").
5. **Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — bo R1 dotyka klasyfikacji danych i kontroli dostępu faculty. RODO-istotność niska (samoocena nie jest danymi osobowymi sensu stricto), ale audytowo warto odnotować.

---

## Out of Scope

- Dodanie samej kolumny `self_assessment` (typ, default, UI, ścieżki zapisu studenta) — osobny ADR produktowy.
- Lustrzane ograniczenie kolumnowe dla `UPDATE` faculty na `project_submissions` — to dług `§8 #2`, ten ADR go nazywa, ale nie zamyka.
- Rozszerzenie modelu na konta nazwane `faculty_users` (`§8 #3`) — niezwiązane.
- `FORCE RLS` + rola login nie-owner (`§8 #1`) — niezależny tor, choć ten ADR jego nie wymaga (egzekucja column-GRANT działa już w modelu `ENABLE` + `SET LOCAL ROLE`).

---

## Files touched przez wdrożenie tej decyzji

- **Nowy:** `docs/decisions/002-column-level-isolation-r1.md` (ten plik).
- **Zmieniony:** `docs/security/rls-matrix.md` — §3 wiersz `competencies` (przypis o R1), §8 #2 (dopisana strona odczytu + link do ADR-002), nagłówek wersji + changelog.

Brak zmian w `schema.ts`, `drizzle/`, `tools/k3-validate.ts`, kodzie API — to praca migracji X.
