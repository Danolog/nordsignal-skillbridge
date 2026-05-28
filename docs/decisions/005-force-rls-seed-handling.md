# Decision Document: FORCE RLS + seed-handling (§8 #1 Phase 2)

**Status:** Accepted
**Date:** 2026-05-28
**Author:** Ethan (with Claude Code)
**Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — 2026-05-28 (sign-off Darka udzielony z wyprzedzeniem dla całej rundy długów post-Beta v0.1). Mechanizm (FORCE RLS + `owner_passthrough` policy dla `neondb_owner`) zaakceptowany.
**Related:** `docs/security/rls-matrix.md` §1 (model tenanta), §5 (warstwa 2 RLS), §8 #1 (dług utwardzenia — Phase 1 i Phase 2) · ADR-003 (WHERE primary + RLS defense-in-depth) · migracje `drizzle/0008_faculty_tenant_and_rls.sql` (`ENABLE` RLS) + `drizzle/0011_app_runtime_role.sql` (rola `app_runtime`)
**Implementation:** sub-issue #19h, migracja `0012_force_rls.sql`, k3-validate test #10

---

## Context

§8 #1 Phase 1 (migracja `0011`) dał fundament: rola `app_runtime` NOLOGIN/NOBYPASSRLS jako członek `app_student`/`app_faculty`, `dbRuntime` z `DATABASE_URL_RUNTIME` env, `withTenantContext` przepięte na `dbRuntime`. Po ops-step (#25) + refaktorach tras studenta (#19b…#19g, PR-y #35…#40), runtime łączy się jako `app_runtime` i podlega RLS, bo nie ma BYPASSRLS.

**Co wciąż otwarte przed FORCE:** ścieżki przez owner (`neondb_owner`) — migracje, seed, Better Auth adapter, audit_log INSERT, audyt-fallbacki — **omijają RLS jako non-FORCE**. To nie problem dla runtime (refactor zamknął większość ścieżek studenta, reszta jest server-only-trusted), ale rzeczywista **defense-in-depth dla owner-side bugów** wymaga `FORCE ROW LEVEL SECURITY`.

Pod `FORCE`, owner również podlega politykom RLS. Na Neon free tier `neondb_owner` **nie ma `BYPASSRLS`** (komentarz w `0008`: „Neon free tier nie daje neondb_owner BYPASSRLS, a FORCE blokuje systemowy seed/migracje (owner)"). Konsekwencja: po FORCE wszystkie INSERT-y owner-side na 6 tabelach studenta zaczynają trafiać w polityki `student_sees_own`/`faculty_sees_tenant`, które wymagają ustawienia `app.current_user_id`/`current_tenant_id` przez `current_setting()`. Bez tego — 0 wierszy / WITH CHECK fail.

**Trzy klasy owner-ścieżek pod FORCE:**

1. **Migracje** — DDL (`ALTER TABLE`, `CREATE INDEX`) **nie podlega RLS**. Brak problemu.
2. **Better Auth adapter** — pisze do `user`/`session`/`account`/`verification`. Te tabele mają `ENABLE` RLS BEZ polityk app-rolowych (sekcja 6.4 macierzy). **Nie są w zakresie FORCE** (FORCE tylko na 6 tabelach student-data).
3. **Seed (`src/lib/db/seed.ts`)** — DELETE + INSERT na `students`/`competencies`/`gaps`/`passports`. Pod FORCE: rozwala się.

To dług seed-handling, który ten ADR zamyka.

---

## Problem

`ALTER TABLE … FORCE ROW LEVEL SECURITY` jest semantycznie: „nawet owner jest subject to row security". Polityka `student_sees_own ON students FOR ALL TO app_student USING (user_id = current_setting('app.current_user_id', true))` przy próbie INSERT przez owner pod FORCE:

- Rola owner ≠ `app_student`/`app_faculty` → polityki `TO app_student`/`TO app_faculty` nie match.
- Brak polityki match → **deny-default** (RLS odrzuca operację).
- Skutek: `db.insert(students).values({...})` w seed → 0 wierszy zapisanych albo `permission denied`.

Bez rozwiązania:
- `pnpm db:seed` przestaje działać po FORCE.
- `pnpm db:migrate` działa (DDL bypass), ale jakikolwiek krok migracji który robi `INSERT` (np. backfill data) — przestaje działać.
- CI `integration` job (`pnpm db:migrate` na ephemeral) — działa, bo migracje to DDL.
- CI po wpięciu `db:seed` (sub-issue #19i): krzyknie.

---

## Alternatives considered (cztery opcje)

| # | Opcja | Implementacja | Robustness | Threat model | Operational risk |
|---|---|---|---|---|---|
| (a) | **SET LOCAL ROLE per insert w seed.ts** | High (refactor seed: BEGIN/SET ROLE/INSERT × N studentów + ich danych) | Robust | Best (owner pełnoprawnie subject to FORCE) | Low |
| (b) | **`owner_passthrough` policy `TO neondb_owner USING (true) WITH CHECK (true)`** | Low (jedna sekcja w migracji 0012) | Robust | Owner ma full pass, ale runtime (`app_runtime`) podlega FORCE | Low |
| (c) | **Seed wrap: `ALTER TABLE … NO FORCE; … INSERTy; ALTER TABLE … FORCE`** | Medium | **Fragile** — crash mid-seed zostawia tabele NO FORCE | OK w runtime seed | Medium (race condition, crash recovery) |
| (d) | **Seed łączy się jako `app_runtime` + `SET LOCAL ROLE app_student` per insert** | Medium (refactor seed + nowy connection) | Robust | Best | High (wymaga ops-step #25 + osobnej obsługi LOGIN dla seed) |

### Why NOT (a) SET LOCAL ROLE per insert w seed

Najczystsze koncepcyjnie — owner traktowany identycznie jak runtime, FORCE faktycznie chroni wszystko. Ale:

1. **Refactor seed.ts to 768 linii** — DELETE + INSERT-y dla 15 studentów × 4 tabele = co najmniej 60+ transakcji z `BEGIN/set_config/SET ROLE/INSERT/COMMIT`. Każda wymaga znajomości `user_id` przed INSERT (do `set_config`).
2. **Tabele K-PUB i Better Auth** (`jobMarketData`, `projects`, `projectCompetencies`, `user`, `account`) nadal jako owner — mieszanka stylów w jednym pliku, koszt poznawczy review.
3. **Zysk bezpieczeństwa marginalny**: seed jest dev/test path, uruchamiany przez trusted ops. Owner-mistakes w seedzie ujawnia test (`tools/k3-validate.ts`), nie FORCE.
4. **Bias-do-utrzymania**: każda przyszła zmiana modelu danych studenta wymaga aktualizacji seed-z-rolami.

### Why NOT (c) NO FORCE wrap w seed

Najprostsza koncepcyjnie, ale **fragile**:

1. Crash mid-seed (np. konflikt unique, błąd AI fetch) zostawia tabele w stanie NO FORCE. Wymaga manualnego cleanup albo skomplikowanego try/finally.
2. Race condition: seed wyłącza FORCE → request użytkownika trafia w okno → request omija FORCE. (Mało prawdopodobne w dev, ale operationally fragile.)
3. ALTER TABLE wymaga lock — pod obciążeniem opóźnia seed.
4. Operacyjnie: pełne wrap-aroundy są pułapką, którą lepiej unikać.

### Why NOT (d) Seed jako app_runtime + SET ROLE

Robustness OK, ale:

1. **Wymaga ops-step #25 zrobione PRZED FORCE** — sekwencja: PR 0011 → ops aktywuje LOGIN + DATABASE_URL_RUNTIME → ops dodaje DATABASE_URL_SEED z app_runtime → PR 0012 FORCE → seed używa nowego env. Trzy zależności w łańcuchu = trzy miejsca, gdzie może się zatrzymać.
2. **Sub-issue #19a (ops) staje się blokerem #19h** — niezgodne z wymaganą sekwencją issue #19 (rozbita w v0.8).
3. Lepiej zostawić (d) jako *future opt-in* gdy seed-as-runtime-role dojdzie do sub-issue #19j (przyszłe).

### Why (b) `owner_passthrough` wygrywa

**Najlepszy balans dla naszej operacyjnej rzeczywistości:**

1. **Implementacja:** jedna migracja (`0012`) z `ALTER TABLE … FORCE` + 6 policy `owner_passthrough` (jedna na tabelę).
2. **Threat model:**
   - Runtime (`app_runtime`, NOBYPASSRLS) — pełnoprawnie subject to FORCE + polityki student/faculty. Defense-in-depth osiągnięte.
   - Owner — ma bypass przez własną policy. Owner jest server-only-trusted (Neon admin password = ops controls). Jeśli owner cred jest skompromitowany, atakujący ma już prawa do DROP TABLE — RLS to nie obrona.
   - Atak na ścieżkę runtime (compromised handler bez `withTenantContext`) — FORCE blokuje. Cel FORCE osiągnięty.
3. **Seed działa bez zmian** — kontrakt z trusted ops.
4. **Spójne z istniejącym pattern**: `0008` ma owner-bypass implicite (przez bypass non-FORCE); `0012` ma explicit, audytowalną policy. Lepsza dokumentacja intencji.
5. **Operationally simple**: brak nowych env, brak refactoru seed, brak fragile state.
6. **Reversible**: rollback `DROP POLICY owner_passthrough` → owner traci passthrough; rollback `ALTER TABLE NO FORCE` → bez FORCE wraca stan z 0011.

**Trade-off** (explicit): `owner_passthrough` dosłownie znaczy „owner ma full RLS bypass na tabelach studenta". To akceptowalne, bo:
- Owner-side ścieżki to dziś: migracje (DDL bypass i tak), seed (kontrakt dev/test), Better Auth (inne tabele, brak FORCE), audit_log (deny-all RLS i tak), `db` w wyjątkach (`/api/passport/[id]` public, tu owner czyta gated share_token).
- Audytowalność: policy `owner_passthrough` jest **widoczna** w `pg_policies` → audyt może sprawdzić, czy istnieje (i czy `USING/WITH CHECK = true`). Lepiej niż implicit non-FORCE.

---

## Decision

**Wdrażamy FORCE RLS + `owner_passthrough` policy w migracji `0012_force_rls.sql`.**

### Schemat migracji 0012

```sql
-- 1. FORCE na 6 tabelach studenta
ALTER TABLE students             FORCE ROW LEVEL SECURITY;
ALTER TABLE competencies         FORCE ROW LEVEL SECURITY;
ALTER TABLE gaps                 FORCE ROW LEVEL SECURITY;
ALTER TABLE skill_maps           FORCE ROW LEVEL SECURITY;
ALTER TABLE passports            FORCE ROW LEVEL SECURITY;
ALTER TABLE project_submissions  FORCE ROW LEVEL SECURITY;

-- 2. owner_passthrough policy na każdej z 6 tabel
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['students','competencies','gaps','skill_maps','passports','project_submissions'])
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS owner_passthrough ON %I',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY owner_passthrough ON %I FOR ALL TO neondb_owner USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END $$;
```

### Wpływ na 6 tabel po migracji

| Rola | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `neondb_owner` | ✅ (passthrough) | ✅ (passthrough) | ✅ (passthrough) | ✅ (passthrough) |
| `app_runtime` (po SET LOCAL ROLE app_student) | filtrowany przez `student_sees_own` | filtrowany przez `WITH CHECK` (user_id match) | filtrowany przez `student_sees_own` | filtrowany przez `student_sees_own` |
| `app_runtime` (po SET LOCAL ROLE app_faculty) | filtrowany przez `faculty_sees_tenant` | brak (GRANT INSERT odebrany) | filtrowany przez `faculty_moderates_tenant` (tylko `project_submissions`) | brak |
| `app_runtime` (bez SET LOCAL ROLE) | deny (brak polityki match dla `app_runtime` bezpośrednio) | deny | deny | deny |

**Kluczowa obserwacja:** zapomniany `SET LOCAL ROLE` w `withTenantContext` → 0 wierszy / deny. To jest cała wartość FORCE — defense-in-depth dla bugów w warstwie aplikacji.

---

## Consequences / gotchas

1. **`owner_passthrough` jest widoczna w `pg_policies`** — audyt może sprawdzić istnienie + treść. Ryan może też dodać alert „nieoczekiwana zmiana w `owner_passthrough` na `students`" do monitoringu (post-Beta).

2. **FORCE NIE jest stosowany na Better Auth tabelach** (`user`/`session`/`account`/`verification`) ani na `audit_log`/`faculty_sessions`. Powody:
   - Better Auth: nie ma polityk app-rolowych, FORCE byłby pułapką (Better Auth adapter łączy się jako owner, owner_passthrough byłby konieczny — ale to powiela istniejący wyjątek warunkowy z §6.4).
   - `audit_log`: ENABLE bez polityki = deny-all dla klienta, INSERT tylko server (owner). FORCE z owner_passthrough = tym samym, ale niepotrzebnie.
   - `faculty_sessions`: jak `audit_log`.

3. **DDL pod FORCE** (migracje po 0012) — bez zmian. ALTER/CREATE/DROP nie podlega RLS. Drizzle-kit migrate dalej działa jako owner.

4. **`pnpm db:seed` działa bez zmian** — kontrakt z `owner_passthrough`. Jeśli ktoś kiedyś zmieni model na `seed jako app_runtime` (sub-issue #19j, future), wystarczy zmienić connection w seed.ts; `owner_passthrough` może zostać (defense-in-depth dla migration data fixes).

5. **Test `k3-validate` #10 (nowy):**
   - `relforcerowsecurity = true` na 6 tabelach studenta (`pg_class`).
   - Policy `owner_passthrough` istnieje na każdej z 6 tabel (`pg_policies`).
   - Test cross-role: `SET LOCAL ROLE app_student` BEZ ustawienia `app.current_user_id` → `SELECT * FROM students` zwraca 0 wierszy (deny-default). To dowód, że FORCE działa od strony app_runtime.

6. **CI integration** (sub-issue #19i) — po wpięciu seed do CI po 0012, seed musi dalej działać (test `owner_passthrough` na ephemeral). Spójne.

7. **Rollback**: jeśli FORCE psuje coś niespodziewanego w prod runtime:
   ```sql
   ALTER TABLE students             NO FORCE ROW LEVEL SECURITY;
   ALTER TABLE competencies         NO FORCE ROW LEVEL SECURITY;
   -- ... (6 tabel)
   DROP POLICY owner_passthrough ON students;
   -- ... (6 polityk)
   ```
   Bez utraty danych, bez utraty polityk student/faculty. Bezpieczna ścieżka cofnięcia.

---

## Validation plan (przyszła implementacja — częściowo w tym PR)

1. **Migracja `0012_force_rls.sql`** zawierająca FORCE + `owner_passthrough` policies — **w tym PR** (#32 / sub-issue #19h).
2. **`tools/k3-validate.ts` test #10** — `relforcerowsecurity` + `owner_passthrough` existence + cross-role deny-default — **w tym PR**.
3. **CI integration** (`k3-validate` w `pr.yml`) — **osobny PR**, sub-issue #19i. Wymaga seed-step w `integration` job (dziś tylko migrate, k3-validate testy 5/6 wymagają wierszy).
4. **Smoke prod**: po merge i `pnpm db:migrate` na prod, `pnpm tsx tools/k3-validate.ts` musi dać 10/10 zielone.
5. **Test regresji**: pełna ścieżka studenta (onboarding → skill-map → submit → passport) na preview po FORCE — jeśli któreś z #19b…#19g jest niedomknięte, wybuchnie.
6. **Sign-off:** Ethan (CTO) + Ryan (CRCO, domena 8) — bo FORCE zmienia model bezpieczeństwa na poziomie bazy.

---

## Out of Scope

- Rewizja `seed.ts` na `SET LOCAL ROLE` per insert (opcja (a)) — odrzucone w tym ADR; może wrócić jako sub-issue #19j (future).
- `seed.ts` łączy się jako `app_runtime` (opcja (d)) — odrzucone w tym ADR; może wrócić jako sub-issue #19j razem z (a).
- FORCE na Better Auth tabelach — explicit OOS (sekcja 6.4 macierzy, nie ma polityk app-rolowych).
- FORCE na `audit_log`/`faculty_sessions` — explicit OOS (już deny-all dla klienta).
- Wpięcie `k3-validate` do CI — sub-issue #19i, osobny PR.

---

## Files touched przez wdrożenie tej decyzji

- **Nowy:** `docs/decisions/005-force-rls-seed-handling.md` (ten plik).
- **Nowy:** `drizzle/0012_force_rls.sql` (migracja FORCE + 6 polityk `owner_passthrough`).
- **Nowy:** `drizzle/meta/0012_snapshot.json` (kopia 0011, bez zmian w schemie TypeScript).
- **Zmieniony:** `drizzle/meta/_journal.json` (wpis 0012).
- **Zmieniony:** `tools/k3-validate.ts` (test #10 — FORCE + owner_passthrough + deny-default).
- **Zmieniony:** `docs/security/rls-matrix.md` (§1 + §5 + §8 #1 Phase 2 sub-issue #19h zaznaczony jako zamknięty, bump v0.8 → v0.9).

---

## Self-critique

Rola: principal engineer wybierający między 4 opcjami z wyraźnymi trade-offs. Pięć rzeczy, które poprawiłem:

1. **„(a) jest czystsze, zrobimy refactor" jako pokusa.** → Odrzucone z konkretnym uzasadnieniem (768 linii seed, zysk bezpieczeństwa marginalny dla dev/test path). Zysk vs koszt explicit.
2. **„owner_passthrough = oszustwo"** — pokusa wstydu, że nie robimy FORCE „prawdziwie". → Przepisane jako **explicit, audytowalna** policy zamiast implicit non-FORCE. Lepiej widoczna w `pg_policies` niż w komentarzu migracji.
3. **Brak rollback path.** → Sekcja Consequences gotcha #7 — pełny ALTER TABLE NO FORCE + DROP POLICY. Bezpieczna ścieżka cofnięcia, bez utraty danych.
4. **Test cross-role bez sample data.** → Test #10 explicitly testuje `SET LOCAL ROLE app_student` BEZ `app.current_user_id` → musi zwrócić 0 wierszy. To dowód, że FORCE działa od strony app_runtime. Bez niego test sprawdzałby tylko `relforcerowsecurity` flag (niepełne).
5. **„Better Auth pod FORCE pewnie też zadziała".** → Nie. Explicit OOS z uzasadnieniem (sekcja 6.4 + brak polityk app-rolowych). Nie wybuchniemy na sub-issue #19h, bo Better Auth login musi działać.
