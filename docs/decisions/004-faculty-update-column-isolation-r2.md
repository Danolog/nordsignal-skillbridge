# Decision Document: Column-level Isolation R2 (faculty UPDATE na `project_submissions`)

**Status:** Accepted
**Date:** 2026-05-28
**Author:** Ethan (with Claude Code)
**Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — 2026-05-28 (sign-off Darka udzielony z wyprzedzeniem dla całej rundy długów post-Beta v0.1). Mechanizm (column-level `REVOKE`/`GRANT` na `app_faculty` dla `project_submissions` UPDATE) zaakceptowany jako rekomendowane rozwiązanie R2; migracja Y uruchamiana wraz z dodaniem kolumn `verified_by` + `verified_at` (osobny ADR produktowy K2/Z5 + asercja `k3-validate` + test cross-privilege wg „Validation plan").
**Related:** `docs/security/rls-matrix.md` §3 (wiersz 6 — `project_submissions`), §8 #2 (dług utwardzenia — strona zapisu) · ADR-002 (`docs/decisions/002-column-level-isolation-r1.md`, lustro po stronie odczytu) · ADR-003 (WHERE primary + RLS defense-in-depth) · migracja `drizzle/0008_faculty_tenant_and_rls.sql`

---

## Context

`project_submissions` to tabela, w której **student i faculty współzapisują** ten sam wiersz w różnych fazach życia submisji:

- **Student** tworzy + edytuje do `status='submitted'` (`repo_url`, `notebook_url`, `additional_urls`, `submitted_at`, `score`, `ai_review_json`).
- **Faculty** moderuje werdyktem — wystawia `status='verified'/'rejected'` oraz (po dodaniu kolumn K2/Z5) `verified_by` + `verified_at`. To **jedyna** ścieżka, którą faculty ma na tej tabeli (`rls-matrix.md` §3 wiersz 6, „K2 fix").

Dziś (`feat/k3-rls-multitenancy`, 2026-05-28) izolacja **wierszowa** działa zgodnie z modelem:

- `app_faculty` ma `GRANT UPDATE ON project_submissions` (`drizzle/0008_faculty_tenant_and_rls.sql:35`) — **tabelowo, bez listy kolumn**.
- Polityka `faculty_moderates_tenant ON project_submissions FOR UPDATE TO app_faculty USING (tenant_id = ...) WITH CHECK (tenant_id = ...)` (`0008:103-104`) ogranicza UPDATE do **wierszy** własnego tenanta.
- Endpoint moderacyjny **nie istnieje jeszcze** w kodzie (`src/app/api/faculty/` ma tylko `dashboard/`, `login/`, `logout/`). To, że faculty zmienia wyłącznie `status` (i wkrótce `verified_by`/`verified_at`) — egzekwuje **przyszły handler** (`withTenantContext` + jawna lista kolumn w `.set({...})`), nie baza.

Dług nazwany w `rls-matrix.md §8 #2`:
> *Polityka `faculty_moderates_tenant ... FOR UPDATE TO app_faculty` ogranicza UPDATE do wierszy własnego tenanta, ale nie ogranicza kolumn — to, że faculty zmienia wyłącznie `status`/`verified_by` (a nie np. treści submisji studenta), egzekwuje kod ..., nie `WITH CHECK` na poziomie SQL. Dług nazwany w ADR-003; po Becie rozważyć column-level GRANT lub trigger walidujący zmieniane kolumny.*

ADR-002 (R1) zamknął tym samym wzorcem analogiczny dług po stronie **odczytu** (faculty SELECT nie ujawnia `competencies.self_assessment`). R2 jest lustrem **po stronie zapisu** dla `project_submissions`.

---

## Problem

**RLS w Postgres nie umie izolować kolumn — także po stronie UPDATE.** Polityka `WITH CHECK (<predicate>)` jest predykatem **wierszowym po zmianie** — sprawdza, czy zmodyfikowany wiersz nadal spełnia warunek (np. `tenant_id` się nie zmienił poza dozwolony zakres). Nie istnieje konstrukcja `POLICY ... FOR UPDATE COLUMNS (status, verified_by) ...`.

Konsekwencja dla R2: `faculty_moderates_tenant` przepuszcza UPDATE na wierszu własnego tenanta, **niezależnie od tego, które kolumny zmienia**. Faculty pod `SET LOCAL ROLE app_faculty` może wykonać:

```sql
UPDATE project_submissions
   SET repo_url = 'https://evil.example/owned-by-faculty',
       score = 100,
       ai_review_json = '{"verdict": "fake"}'
 WHERE id = '<dowolny wiersz tenanta>';
```

i RLS to przepuści (wiersz nadal jest w tym samym tenancie). Sama RLS — niezależnie od tego, jak pomysłowo skonstruowana — **nie zatrzyma** żadnego zapytania UPDATE, jeśli wiersz docelowy spełnia `USING`/`WITH CHECK`.

Ograniczenie zakresu kolumn w UPDATE w Postgres dają wyłącznie trzy mechanizmy:

1. **System przywilejów na kolumnach UPDATE** — `GRANT UPDATE (col1, col2) ON tbl TO role` / `REVOKE`. Egzekwowane przez planer; próba UPDATE poza listą → `ERROR: permission denied for column ...`.
2. **Trigger `BEFORE UPDATE`** porównujący `OLD`/`NEW` i odrzucający zmiany niedozwolonych kolumn (`IF NEW.repo_url IS DISTINCT FROM OLD.repo_url THEN RAISE ...`).
3. **Widok z `INSTEAD OF UPDATE` trigger** lub `WITH CHECK OPTION` na widoku eksponującym tylko whitelistę kolumn.

---

## Decision

**Column-level `GRANT UPDATE`/`REVOKE` na `project_submissions` dla roli `app_faculty`.** Po dodaniu kolumn `verified_by` + `verified_at` migracją Y (osobny ADR produktowy K2/Z5) wykonujemy:

```sql
-- ILUSTRACJA — nie migracja w tym ADR. Migracja Y powstanie po landingu K2/Z5.
REVOKE UPDATE ON project_submissions FROM app_faculty;
GRANT UPDATE (status, verified_by, verified_at)
  ON project_submissions TO app_faculty;
-- SELECT na project_submissions zostaje bez zmian (faculty czyta cały rekord
-- w kolejce moderacji — `faculty_sees_tenant` przepuszcza wszystkie kolumny).
```

Efekt netto pod `SET LOCAL ROLE app_faculty`:
- `UPDATE project_submissions SET status='verified', verified_by=<id>, verified_at=now() WHERE id=<...>` → OK (na wierszu własnego tenanta, jak dotąd).
- `UPDATE project_submissions SET repo_url='...' WHERE id=<...>` → `ERROR: permission denied for column repo_url`.
- `UPDATE project_submissions SET status='verified', score=100 WHERE id=<...>` → ten sam błąd na pierwszej niedozwolonej kolumnie (tu: `score`).
- `UPDATE project_submissions SET status='verified' WHERE tenant_id != <swój>` → 0 wierszy (RLS), bez błędu kolumnowego.

To rekomendacja **niezależna od ADR-003 / RLS** — działają warstwowo: RLS dalej filtruje wiersze tenant-owe (`faculty_moderates_tenant`), column-GRANT odcina zmianę poza whitelistą werdyktu.

---

## Why this variant

| # | Kryterium | Column-level GRANT | Trigger walidujący `OLD`/`NEW` | Widok + INSTEAD OF |
|---|---|---|---|---|
| 1 | Egzekwowane w bazie | ✅ | ✅ | ✅ |
| 2 | Powierzchnia zmian | minimalna (1 para REVOKE/GRANT) | średnia (funkcja PL/pgSQL + trigger + utrzymanie listy kolumn) | duża (widok + trigger + przepisanie ścieżki faculty z `from(project_submissions)` na widok) |
| 3 | Deny-by-default dla **przyszłych** kolumn | ✅ (każda nowa kolumna domyślnie poza UPDATE GRANT) | ❌ (trigger trzeba zaktualizować, inaczej nowa kolumna przejdzie) | ⚠️ (widok trzeba zaktualizować; inaczej kolumna w ogóle niewidoczna) |
| 4 | Komunikat błędu | jasny `permission denied for column X` | własny `RAISE EXCEPTION` (kontrolowany, ale wymaga utrzymania) | błąd `INSTEAD OF` z widoku — mniej naturalny |
| 5 | Spójność z ADR-002 (R1) | ✅ wprost (ten sam mechanizm po stronie SELECT) | częściowo (inny mechanizm dla bliźniaczej klasy długu) | nie |
| 6 | Koszt utrzymania | brak (lista kolumn = część migracji, jeden punkt zmiany) | wysoki (PL/pgSQL + testy + nazwy kolumn w stringu) | wysoki (synchronizacja widoku przy zmianach schemy) |

Column-GRANT wygrywa dla **wąskiego białego whitelist** kolumn werdyktu przy żywej tabeli i jest **jednorodny z ADR-002** (R1 po stronie odczytu) — utrzymanie spójnego modelu „izolacja kolumnowa = przywileje kolumnowe na rolę faculty" zmniejsza koszt poznawczy review i CI.

---

## Consequences / gotchas

1. **`UPDATE ... SET *` przestaje działać dla faculty na `project_submissions`** — co jest dokładnie celem. Drizzle nie ma idiomu `.set('*')`; każdy UPDATE jawnie wymienia kolumny → kompatybilne. Reguła operacyjna: **handler faculty UPDATE na `project_submissions` używa wyłącznie jawnego `.set({ status, verifiedBy, verifiedAt })`**, nigdy generyk-builderów po `OLD`/`NEW`. Do dodania jako check w lint K4 lub przegląd code review przy migracji Y.
2. **GRANT kolumnowy nie zastępuje RLS — pracują warstwowo.** Wiersze nadal filtruje `faculty_moderates_tenant` (tenant izolacja UPDATE), GRANT odcina kolumnę. Usunięcie któregokolwiek z dwóch otwiera lukę: bez GRANT — faculty może nadpisać dane studenta we własnym tenancie; bez RLS — faculty może zmienić werdykt na cudzym tenancie.
3. **Spójność z owner-bypass (rls-matrix §1, §8 #1).** Runtime łączy się jako `neondb_owner` i przełącza rolę przez `withTenantContext`/`SET LOCAL ROLE app_faculty` (`src/lib/db/tenant-context.ts:50`). Owner omija RLS i przywileje, ale **column-GRANT egzekwuje się po `SET LOCAL ROLE`** — rola nie-owner podlega regułom GRANT. Izolacja R2 działa zatem dokładnie na tych ścieżkach, które przechodzą przez `SET LOCAL ROLE app_faculty` (dziś: tylko dashboard; po landingu handlera moderacji — także ścieżka verdyktu). To ten sam warunek brzegowy co reszta egzekucji RLS faculty — nie wprowadza nowej klasy zależności. **Po §8 #1 (FORCE RLS + rola login nie-owner) warunek brzegowy znika**: każde połączenie runtime będzie podlegało GRANT/REVOKE.
4. **INSERT zostaje poza zakresem R2.** Faculty dziś **nie ma** `INSERT` na `project_submissions` (`0008` daje tylko `SELECT` + `UPDATE`). Submission powstaje wyłącznie ze ścieżki studenta. Jeśli kiedyś faculty miałby tworzyć rekord (np. „dodaj submisję ręcznie w imieniu studenta"), to osobna decyzja domeny produktowej + dodatkowy GRANT.
5. **DELETE poza zakresem.** Faculty **nie ma** `DELETE`. Submisje nie są usuwane (audytowalność) — `0008` celowo nie daje DELETE. Gdy pojawi się polityka retencji wymagająca DELETE, to osobny tor (kontrola: rola serwisowa + audit).
6. **`updated_at` jest poza listą GRANT.** Drizzle przy `.update({...})` automatycznie nie modyfikuje `updated_at` (timestamp z `defaultNow()` nie ma triggera auto-update). Jeśli handler chce stempel — albo dodaje GRANT na `updated_at`, albo wprowadza trigger `BEFORE UPDATE` ustawiający `updated_at = now()` przed sprawdzeniem GRANT (trigger działa z prawami właściciela funkcji, nie wywołującego — dziś nieistotne, do uwagi).

---

## Alternatives considered

- **Trigger `BEFORE UPDATE`** porównujący `OLD`/`NEW` na każdej chronionej kolumnie i rzucający `RAISE EXCEPTION 'faculty may only modify status/verified_by/verified_at'`. Egzekwowane w bazie, ale: każda nowa kolumna wymaga update triggera (brak deny-by-default), PL/pgSQL z listą kolumn jako string = ryzyko literówki, większy koszt review. **Odrzucone** — column-GRANT daje to samo taniej i z deny-by-default.
- **Widok `project_submissions_faculty_moderation`** z whitelistą kolumn UPDATE + `INSTEAD OF UPDATE` triggerem mapującym na bazową tabelę. Najbardziej eksplicytna kontrakt-side („faculty pisze tylko przez ten widok"), ale: przepisanie wszystkich przyszłych zapytań faculty UPDATE z `from(project_submissions)` na widok, dodatkowy obiekt do utrzymania, mniej spójne z ADR-002. **Odrzucone** — korzyść dyskusyjna przy column-GRANT pełniącym tę samą rolę.
- **Maskowanie aplikacyjne** (handler faculty wymusza `.set({ status, verifiedBy, verifiedAt })` i koniec). To dokładnie **status quo długu**, który ten ADR domyka. R2 wymaga egzekucji w bazie — inaczej jest tylko konwencją.
- **Brak akcji** — pozostawienie egzekucji w warstwie aplikacji jako „świadomy kompromis Bety". Zostało odrzucone już przez fakt nazwania długu w §8 #2 i sign-offu Ryana z warunkiem domknięcia post-Beta. R2 to formalizacja, nie zmiana priorytetu.

---

## Validation plan (przyszła implementacja — NIE w tym ADR)

Gdy R2 dostanie greenlight i powstanie migracja Y (wraz z handlerem moderacji K2/Z5):

1. **Migracja `00YY_faculty_column_grant_submission_verdict.sql`** zawierająca:
   - `ALTER TABLE project_submissions ADD COLUMN verified_by ... NULL REFERENCES "user"(id);` + `ADD COLUMN verified_at timestamptz NULL;` (typy + nullability do decyzji w osobnym ADR domeny produktowej K2/Z5).
   - `REVOKE UPDATE ON project_submissions FROM app_faculty;`
   - `GRANT UPDATE (status, verified_by, verified_at) ON project_submissions TO app_faculty;`
   - Rollback w komentarzu (analogicznie do `0008`/migracji R1).
2. **`tools/k3-validate.ts`** — asercja przez `information_schema.column_privileges`:
   ```sql
   -- A. zezwolone (oczekiwane: 3 wiersze — status, verified_by, verified_at):
   SELECT column_name
     FROM information_schema.column_privileges
    WHERE grantee = 'app_faculty'
      AND table_name = 'project_submissions'
      AND privilege_type = 'UPDATE';
   -- B. zabronione (oczekiwane: 0 wierszy):
   SELECT column_name
     FROM information_schema.column_privileges
    WHERE grantee = 'app_faculty'
      AND table_name = 'project_submissions'
      AND privilege_type = 'UPDATE'
      AND column_name IN ('repo_url','notebook_url','additional_urls',
                          'submitted_at','score','ai_review_json',
                          'student_id','project_id','tenant_id','id','created_at');
   ```
   Asercja wpięta do CI gate (jak istniejące testy izolacji 7/7 z §7 DoD).
3. **Test cross-privilege (Vitest/integration):** pod `SET LOCAL ROLE app_faculty` i ustawionym `app.current_tenant_id`, wykonać:
   - `UPDATE project_submissions SET status='verified', verified_by=..., verified_at=now() WHERE id=<submisja własnego tenanta>` → OK.
   - `UPDATE project_submissions SET repo_url='x' WHERE id=<jw.>` → oczekiwany `error.code = '42501'` (`insufficient_privilege`).
   - `UPDATE project_submissions SET status='verified' WHERE id=<submisja CUDZEGO tenanta>` → 0 wierszy (RLS), bez błędu kolumnowego.
   Analogicznie do testu „faculty A nie moderuje submisji B".
4. **Update `rls-matrix.md`:** §3 wiersz 6 (przypis R2 + uściślenie „faculty UPDATE = whitelist kolumn") + §8 #2 (oznaczenie strony zapisu jako domknięta doc-side, link do ADR-004) + bump nagłówka wersji — **wykonane łącznie z tym ADR** (patrz „Files touched").
5. **Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — bo R2 dotyka kontroli zapisu faculty i klasyfikacji danych po stronie write. RODO-istotność niska (faculty już ma dostęp odczytowy do tenanta), ale audytowo warto odnotować jako lustro R1.

---

## Out of Scope

- Dodanie kolumn `verified_by` + `verified_at` (typy, FK, default, UI panelu moderacji) — osobny ADR produktowy K2/Z5.
- Sam handler `/api/faculty/submissions/[id]/verdict` (lub równoważny) — kod aplikacji, nie ADR.
- Lustrzane ograniczenie kolumnowe dla SELECT faculty na `competencies` (`self_assessment`) — to **ADR-002 (R1)**, zaakceptowany 2026-05-28.
- Rozszerzenie modelu na konta nazwane `faculty_users` (`§8 #3`) — niezwiązane.
- `FORCE RLS` + rola login nie-owner (`§8 #1`) — niezależny tor, choć ten ADR jego nie wymaga (egzekucja column-GRANT działa już w modelu `ENABLE` + `SET LOCAL ROLE`, a po §8 #1 stanie się egzekwowana także na ścieżkach studenta z definicji modelu).
- Trigger `BEFORE UPDATE OF updated_at` lub auto-stempel `updated_at` — to wybór domeny produktowej (handler decyduje, czy stemplować).

---

## Files touched przez wdrożenie tej decyzji

- **Nowy:** `docs/decisions/004-faculty-update-column-isolation-r2.md` (ten plik).
- **Zmieniony:** `docs/security/rls-matrix.md` — §3 wiersz `project_submissions` (przypis o R2), §8 #2 (dopisana oznaczenie strony zapisu jako domknięta doc-side + link do ADR-004), nagłówek wersji + changelog.

Brak zmian w `schema.ts`, `drizzle/`, `tools/k3-validate.ts`, kodzie API — to praca migracji Y.

---

## Self-critique

Rola: principal engineer wystawiający lustro do ADR-002. Pięć rzeczy, które poprawiłem przed oddaniem:

1. **„Skopiuj ADR-002 i zamień kolumnę" jako pokusa.** → Lustro w mechanizmie i strukturze, ale problem inny: ADR-002 dotyczy SELECT (column-GRANT na czytanie), ADR-004 dotyczy UPDATE (column-GRANT na zapis). Komunikaty błędów, wpływ na `SELECT *` vs `UPDATE ...`, gotchas — wszystko przepisane dla pisaczy, nie czytaczy.
2. **Pomijanie INSERT/DELETE jako „oczywiste".** → Wyodrębnione (gotcha #4 + #5) z jawnym uzasadnieniem, dlaczego są poza zakresem dziś i co je włącza do zakresu w przyszłości.
3. **Brak myślenia o `updated_at`.** → Gotcha #6 nazywa pułapkę: lista kolumn UPDATE pomija `updated_at`, więc handler nie może bezmyślnie stempować przez `.set({ updatedAt: new Date() })` bez decyzji o GRANT lub triggerze. Mała rzecz, łatwa do przegapienia, łatwa do wykrycia w teście.
4. **Test cross-privilege jako copy-paste z ADR-002.** → Trzy scenariusze (poprawny UPDATE, błąd kolumnowy, RLS bez błędu kolumnowego) zamiast jednego. Trzeci scenariusz pokazuje, że column-GRANT i RLS pracują warstwowo, a nie redundantnie — to obrona przed regresją „jeden warstwę usunięto".
5. **„Handler nie istnieje, więc to teoria."** → Wyraźnie nazwane: dziś R2 to luka feasibility (nie regres), migracja Y idzie wraz z landingiem handlera + kolumn `verified_by`/`verified_at`. Ten ADR jest **kontraktem**, który handler i migracja Y muszą respektować — nie da się dodać moderacji bez column-GRANT, bo ADR-004 wprost wpisuje to w „Validation plan" i `k3-validate`.
