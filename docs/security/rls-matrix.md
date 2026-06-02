# Macierz RLS — SkillBridge Beta v0.1

**Wersja:** v0.11 · 2026-06-02
**Owner:** Ethan (CTO)
**Status:** **Wdrożone i podpisane** — sign-off Ryana (CRCO, domena 8 / G6) wystawiony 2026-05-27. **R1/R2 doc-closed** (ADR-002 + ADR-004); migracje X/Y czekają na landing kolumn. **§8 #4 ZAMKNIĘTE** (TRUNCATE protection). **§8 #5 ZAMKNIĘTE** (rotacja share_token na disable). **§8 #1 LIVE na prod bez wyjątków** — Phase 1 (rola `app_runtime` + `dbRuntime` + `withTenantContext` rewire, `0011`) + Phase 2 w całości: 6 refaktorów tras studenta (#19b…#19g, PR-y #35-#40), FORCE RLS + `owner_passthrough` (#19h, `0012`, ADR-005), `k3-validate` 10/10 na prod, **#19a (ops: `app_runtime` LOGIN + `DATABASE_URL_RUNTIME` w Vercel) ZAMKNIĘTE** i **#19i (k3-validate w CI) ZAMKNIĘTE**. Issue #19 ZAMKNIĘTY. Runtime łączy się jako `app_runtime` (NOBYPASSRLS) — `POST /api/passport/share` = 200 na prod (weryfikacja 2026-05-31).
**Wejście:** `schema.ts` (`main`, **16 tabel** po dropie micro-courses w `0004`) · ADR-001 sekcja 4.2 (multi-tenancy + RLS) · ADR-003 (strategia: WHERE primary + RLS defense-in-depth, 4 warstwy) · `docs/audyty/2026-05-20-skillbridge-ai-production-readiness.md` (K3) · ADR-008 (drop micro-courses — WYKONANY) · **ADR-002** (`docs/decisions/002-column-level-isolation-r1.md`, R1 read-side) · **ADR-004** (`docs/decisions/004-faculty-update-column-isolation-r2.md`, R2 write-side) · **ADR-005** (`docs/decisions/005-force-rls-seed-handling.md`, FORCE + owner_passthrough seed-handling, `Accepted` 2026-05-28).

**Changelog v0.10 → v0.11 (2026-06-02) — B5 `project_reflections` dodane do macierzy (Ryan sign-off GO):** (1) Nowa tabela `project_reflections` (migracja `0015`) — K-PII+, ENABLE+FORCE RLS, polityka `student_sees_own` (student_id → students.user_id, current_setting), `owner_passthrough` (dynamiczne EXECUTE format, wzorzec 0012/0013). (2) `app_faculty`: **brak grantu tabelowego i brak polityki faculty_sees_tenant** — deny-by-default egzekwowany na poziomie PostgreSQL, nie tylko polityki RLS. Refleksje prywatne studenta — nie trafiają do faculty ani do paszportu (decyzja schematu Ethan 2026-05-31, §B5.1). (3) `student_id ON DELETE CASCADE` → prawo do bycia zapomnianym (art. 17 RODO) realizowane automatycznie. (4) Do zamknięcia po PR z `0015`: `project_reflections` dodane do `TENANT_TABLES` w `k3-validate.ts` + test 12a (deny-faculty: `role_table_grants` dla app_faculty = 0 wierszy). Sign-off: Ryan (CRCO) 2026-06-02.

**Changelog v0.9 → v0.10 (2026-05-31) — §8 #1 Phase 2 ops LIVE na prod, issue #19 ZAMKNIĘTY:** (1) **#19a ZAMKNIĘTE (ops):** `ALTER ROLE app_runtime LOGIN PASSWORD` na prod Neon + `DATABASE_URL_RUNTIME` w Vercel Production+Preview + redeploy. Runtime łączy się teraz jako `app_runtime` (NOBYPASSRLS) — RLS warstwa 2 egzekwowana na produkcji, nie tylko w teście. (2) **#19i ZAMKNIĘTE (CI):** `tools/k3-validate.ts` wpięte w job `integration` (po `db:migrate` + `db:seed`), 10/10 na każdym PR/push do main. (3) **Incident ENOTFOUND (naprawiony 2026-05-31):** po wstępnym ustawieniu env `POST /api/passport/share` dawał 500 ENOTFOUND — dwie przyczyny: (a) `DATABASE_URL_RUNTIME` miał `\n` w środku hosta (paste z zawiniętego markdown), (b) `main` nie budował się od PR #45 bo `next build` (strict) typecheckuje też `tools/*.ts`, a `tools/activate-app-runtime.ts` miał błąd typu — każdy prod redeploy = ERROR. Naprawione: **PR #47** (pin `ownerUrl: string` po guardzie) + rotacja hasła `app_runtime` przez `tools/activate-app-runtime.ts` (czysty URL z `new URL()`, bez `\n`) + redeploy. Weryfikacja: `POST /api/passport/share` = 200 w prod runtime logs. (4) §8 #1 oznaczony **LIVE na prod bez wyjątków**; status header + sekcja 8 zaktualizowane.

**Changelog v0.8 → v0.9 (2026-05-28) — §8 #1 Phase 2 prawie zamknięte (FORCE RLS + 6 refaktorów tras):** (1) **6 PR-ów refactor tras studenta** (#35-#40, sub-issues #19b…#19g): `onboarding`, `skill-map`, `gaps`+`gaps/[id]/why`, `projects/[id]/brief`, `projects/[id]/submit`, `passport`+`passport/share` na `withTenantContext({role: "student"})`. Trasa publiczna `/api/passport/[id]` CELOWY WYJĄTEK (anonimowa, gated share_token + public_enabled). (2) **ADR-005** (`Accepted` 2026-05-28, sign-off Ethan + Ryan): wybór opcji (b) `owner_passthrough` zamiast (a) SET LOCAL ROLE per insert w seed.ts. Argumentacja: najlepszy balans pragmatyzmu (zero refactor seed, owner = trusted-only ops path) i bezpieczeństwa (runtime app_runtime nadal pełnoprawnie subject to FORCE → defense-in-depth dla bugów w warstwie aplikacji). (3) **Migracja `0012_force_rls.sql`**: `ALTER TABLE … FORCE ROW LEVEL SECURITY` na 6 tabelach studenta + pętla DO $$ … END $$ tworząca `owner_passthrough` policy `TO neondb_owner USING (true) WITH CHECK (true)`. Better Auth tables i `audit_log`/`faculty_sessions` poza FORCE (OOS w ADR-005 sekcja gotcha #2). (4) **`k3-validate` test #10** (10a/10b/10c): `relforcerowsecurity=true` na 6 tabelach (`pg_class`), `owner_passthrough` policy istnieje (`pg_policies`), `SET LOCAL ROLE app_student` bez `app.current_user_id` = deny-default 0 wierszy (dowód działania FORCE od strony app_runtime). (5) §1 + §5 zaktualizowane (FORCE + owner_passthrough w modelu izolacji). (6) §8 #1 Phase 2: #19b…#19h ZAMKNIĘTE; pozostają #19a (ops) + #19i (CI).

**Changelog v0.7 → v0.8 (2026-05-28) — §8 #1 Phase 1 zamknięte (rola app_runtime + dbRuntime):** (1) **Migracja `0011_app_runtime_role.sql`**: `CREATE ROLE app_runtime NOLOGIN NOBYPASSRLS` + `GRANT app_student/app_faculty TO app_runtime` + `GRANT USAGE ON SCHEMA public`. NOLOGIN świadomie — LOGIN+hasło ops aktywuje out-of-band (chroni przed leakiem hasła w git). (2) **`src/lib/db/index.ts`**: nowy export `dbRuntime` z `DATABASE_URL_RUNTIME` (fallback do `DATABASE_URL` z warningiem konsolowym — żeby było widać w dev/preview, że jeszcze siedzi na owner). (3) **`src/lib/db/tenant-context.ts`**: `withTenantContext` przepięte z `db` (owner) na `dbRuntime`. Semantyka identyczna dopóki fallback aktywny; po Phase 2 (ops ustawia ENV) — runtime przechodzi na `app_runtime` automatycznie, bez zmiany w kodzie. (4) **`tools/k3-validate.ts`**: test #9 — rola istnieje, NOBYPASSRLS, członek obu grup (9a + 9b + 9c). (5) **§1** + **§5** zaktualizowane: `withTenantContext` używa `dbRuntime`, owner-bypass nie chroni już ścieżek przez `withTenantContext` (rola po SET LOCAL ROLE = app_*, RLS egzekwuje); ścieżki studenta używające `db` bezpośrednio nadal podlegają długowi — patrz sub-issues #19b…#19g. (6) **§8 #1** rozbity na Phase 1 (ZAMKNIĘTE) + Phase 2 (sub-issues 19a..19i, każdy własny PR + ADR jeśli wymaga).

**Changelog v0.6 → v0.7 (2026-05-28) — §8 #5 zamknięte (rotacja share_token):** (1) `DELETE /api/passport/share` zeruje `share_token` razem z `publicEnabled=false` — wyciekły link przestaje być trwały. (2) `POST /api/passport/share` przy re-enable widzi `shareToken IS NULL` i wpada w istniejącą gałąź `randomBytes(32)` → generuje **nowy** token. (3) Audyt: `passport.share.disable` dostaje `metadata.tokenRotated: true` + `previousTokenHashPrefix` (16 hex znaków sha256 starego tokenu — wystarczy do correlation w incident response, za krótki by odtworzyć token brute-forcem; raw token nigdy nie ląduje w `audit_log`). (4) UI: dialog zgody wymienia rotację jako konsekwencję wyłączenia („wyłączenie unieważnia link na stałe — ponowne udostępnienie wygeneruje nowy adres"); toast „Udostępnianie wyłączone — link unieważniony na stałe"; lokalny stan `shareToken` czyszczony przy `disableSharing` (żeby UI nie pokazał starego linku po re-enable). (5) Test rotacji w `passport-view.test.tsx` (disable → re-enable → nowy token; stary nie kopiowany). (6) `§6.1` + `§8 #5` zaktualizowane.

**Changelog v0.5 → v0.6 (2026-05-28) — §8 #4 zamknięte (migracja 0010):** (1) **`audit_log` TRUNCATE protection wdrożone** — `drizzle/0010_audit_log_truncate_protection.sql`: statement-level `BEFORE TRUNCATE … FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only()` + `REVOKE TRUNCATE ON audit_log FROM app_student, app_faculty` (defense-in-depth, role nigdy tego nie miały). Owner (`neondb_owner`) traci ścieżkę „jedno polecenie czyści cały ślad". (2) `tools/k3-validate.ts`: dodany test #8 — `TRUNCATE audit_log` pod ownerem musi być odrzucony (transakcja + ROLLBACK, jak testy 7). DoD: zielony 8/8 wymagany przed migracją prod (analogicznie do warunku v0.3). (3) §6.3 zaktualizowane (TRUNCATE odnotowane jako pokryte triggerem). (4) §8 #4 oznaczony jako **ZAMKNIĘTY**.

**Changelog v0.4 → v0.5 (2026-05-28) — R2 nazwane (Ethan, lustro R1 po stronie zapisu):** (1) Dług `§8 #2` strony zapisu zamknięty doc-side ADR-004 — column-level `GRANT UPDATE (status, verified_by, verified_at)` na `app_faculty` (REVOKE pełnego UPDATE). Mechanizm + gotchas w ADR-004. R2 to luka feasibility (kolumny `verified_by`/`verified_at` + handler moderacji nie istnieją), nie regres. (2) `§3` wiersz `project_submissions`: dopisany przypis o R2. (3) Wejście rozszerzone o ADR-004. (4) `§8 #2` rozbity na (a) write-side R2 (doc-closed, migracja Y czeka) + (b) read-side R1 (doc-closed, migracja X czeka) — oba symetryczne, jeden wzorzec.

**Changelog v0.3 → v0.4 (2026-05-28) — R1 nazwane (Ethan, feasibility schematu):** (1) Dług `§8 #2` rozszerzony o **stronę odczytu** — RLS nie izoluje kolumn (predykat wierszowy, nie kolumnowy), więc planowana `competencies.self_assessment` wymaga column-level `GRANT`/`REVOKE` na `app_faculty`; mechanizm + gotchas w ADR-002. R1 to luka feasibility (kolumna nie istnieje), nie regres wdrożonego stanu. (2) `§3` wiersz `competencies`: dopisany przypis o R1. (3) Wejście rozszerzone o ADR-002.

**Changelog v0.2 → v0.3 (2026-05-27) — reconcyliacja zapis↔wdrożenie:** (1) **Numeracja migracji zgodna z `drizzle/`**: `0005` tenants → `0006` tenant_id+backfill → `0007` `SET NOT NULL` → `0008` faculty per tenant + role + RLS → `0009` passport share token. (Plan v0.2 mówił `0006b`/`0007` — w kodzie to `0007`/`0008`.) (2) **`ENABLE`, NIE `FORCE` RLS** — wdrożenie używa `ENABLE ROW LEVEL SECURITY` + ról grupowych `app_student`/`app_faculty` (`NOLOGIN`) i `SET LOCAL ROLE` w runtime; aplikacja łączy się jako `neondb_owner` (właściciel → bypass RLS, ale ścieżki danych studenta jawnie przełączają rolę). `FORCE` + dedykowana nie-właścicielska rola login = **dług utwardzenia po Becie** (sekcja 8). (3) Role: `app_student`/`app_faculty` (nie `authenticated_student`/`authenticated_faculty`/`service_role` z planu). (4) **B1 ZAMKNIĘTE i podpisane** (sekcja 6.1) — token+opt-in (`0009`), zgoda **poinformowana i wersjonowana** (`PASSPORT_SHARE_CONSENT_VERSION`, A1 `bd39efc`), `noindex` + metadane bez PII (A2 `6f5dd2e`). (5) DoD: pozycje domknięte zaznaczone (sekcja 7).

**Changelog v0.1 → v0.2 (2026-05-26):** (1) **Renumeracja** — drop micro-courses wszedł na prod jako `0004`, więc K3: `0005` tenants → `0006` tenant_id+backfill → `0006b` NOT NULL → `0007` RLS+role (było 0004/0005/0006/0009). (2) `micro_courses` **usunięta** ze schemy — wypada z macierzy, 16 tabel. (3) Partnerzy Bety **potwierdzeni**: WSB Merito Szczecin + Warszawa. (4) Sterownik = `node-postgres` (nie Neon serverless) → `SET LOCAL` w transakcji bez quirków. (5) ~~Egzekucja RLS wymaga `FORCE ROW LEVEL SECURITY`~~ → skorygowane w v0.3: wdrożono `ENABLE` + `SET LOCAL ROLE`. (6) Faculty per kampus = **hasło per tenant** + `faculty_sessions.tenant_id` (decyzja Darka 2026-05-26; `faculty_users` po Becie).

**Żargon (tłumaczenie):** *RLS* (Row Level Security) = izolacja na poziomie wiersza w bazie — polityka SQL decyduje, które wiersze widzi dane połączenie. *tenant* = uczelnia (najemca). *tenant_id* = kolumna wiążąca wiersz z uczelnią. *deny-by-default* = brak reguły = brak dostępu. *append-only* = tylko dopisywanie, bez edycji/kasowania.

---

## 1. Model tenanta (co doda K3)

Dziś izolacji między uczelniami **nie ma** (K3): zero `tenant_id`, zero polityk RLS, faculty na jednym współdzielonym haśle. K3 (Tydz. 2) dodaje:

- **`tenants`** (`0005`): `id uuid PK, slug text UNIQUE, name text`. Seed = 2 design partnerów Bety (`wsb-merito-szczecin`, `wsb-merito-warszawa`) + `__unmapped`.
- **`tenant_id`** (`0006` nullable+backfill → `0007` `SET NOT NULL`): denormalizowany na każdej tabeli z danymi studenta — żeby polityka RLS była prosta i indeksowalna (bez JOIN w polityce). Backfill ze `students.university` (free-form) przez mapę `docs/data/tenant-mapping-beta.md` (osobny artefakt). `NOT NULL` po zielonej walidacji (0 NULL na 16 realnych studentach).
- **Faculty per tenant** (`0008`): wariant minimalny (decyzja Darka 2026-05-26) — `faculty_sessions.tenant_id` + login po **haśle per kampus** (`FACULTY_PASSWORD_<TENANT>`), zamiast jednego `FACULTY_PASSWORD`. Nazwane konta `faculty_users` per osoba — po Becie.
- **RLS + role** (`0008`): role grupowe `app_student`/`app_faculty` (`NOLOGIN`) + GRANTy + **`ENABLE` ROW LEVEL SECURITY (nie `FORCE`)** + polityki per tabela wg tej macierzy. Aplikacja łączy się jako właściciel (`neondb_owner`, bypass RLS), a ścieżki, które mają egzekwować RLS, robią `SET LOCAL ROLE app_student`/`app_faculty` w transakcji (`withTenantContext`). **Świadomy kompromis Bety:** brak `FORCE` i brak dedykowanej roli login (utwardzenie po Becie — sekcja 8). `service_role` z planu nie powstał — niepotrzebny przy modelu owner-bypass.
- **Rola `app_runtime`** (`0011`, §8 #1 Phase 1, 2026-05-28): rola NOLOGIN/NOBYPASSRLS jako członek `app_student`/`app_faculty`. `dbRuntime` w `src/lib/db/index.ts` z `DATABASE_URL_RUNTIME` (fallback do `DATABASE_URL` z warningiem dev/preview). `withTenantContext` używa `dbRuntime` — gdy ops aktywuje LOGIN+hasło + ustawi ENV (sub-issue #19a), runtime przechodzi na `app_runtime` automatycznie. Wszystkie ścieżki przez `withTenantContext` egzekwują wtedy RLS niezależnie od `SET LOCAL ROLE` (zapomniana `SET ROLE` daje deny-default, bo polityki wymagają `app.current_user_id`/`current_tenant_id`). Bezpośrednie użycie `db` (owner) w ścieżkach studenta nadal omija RLS — patrz §8 #1 sub-issues 19b…19g (refactor tras na `withTenantContext`).

> **⚠️ Uwaga implementacyjna (code-review 2026-05-27):** w obecnym kodzie `withTenantContext` (`SET LOCAL ROLE`) jest wywoływany **wyłącznie** w `api/faculty/dashboard`. Trasy danych studenta (onboarding, skill-map, gaps, passport, projects) łączą się jako owner → **RLS ich NIE egzekwuje**; izolację studenta trzyma jedynie warstwa 1 (jawny `WHERE user_id/student_id`). RLS (warstwa 2) jest realną siatką **tylko** dla agregatów faculty. Zanim trasa studenta będzie mogła polegać na RLS jako siatce, musi przejść przez `withTenantContext`. `k3-validate` testuje role `app_*` w izolacji, nie ścieżkę ownera — zielony wynik **nie** dowodzi egzekucji RLS na trasach studenta. Objęcie tras studenta `withTenantContext` (albo `FORCE RLS` + rola login) = dług utwardzenia (sekcja 8).

**Dwie osie dostępu** (ADR-001 4.2):
- **Student** widzi swoje: `auth.user_id() = students.user_id` (przez `current_setting()`, ADR-003).
- **Faculty** widzi swój tenant: `current_faculty_tenant_id() = <tabela>.tenant_id`.

---

## 2. Klasyfikacja danych (rama K-PUB/K-INT/K-PII z `policies/data-classification.md`)

- **K-PII** — dane osobowe (imię, e-mail, uczelnia+kierunek+cel studenta łącznie identyfikujące).
- **K-INT** — wewnętrzne nie-PII (kompetencje, luki, submisje, oceny AI).
- **K-PUB** — publiczne/referencyjne (katalog projektów, dane rynku pracy).
- **K-SES** — sekrety sesji/audyt (tokeny, hash, log) — nigdy do klienta.

---

## 3. Macierz RLS per tabela

| # | Tabela | Klasa | Oś własności | `tenant_id` w `0006`? | RLS | SELECT (kto) | INSERT/UPDATE/DELETE (kto) |
|---|---|---|---|---|---|---|---|
| 1 | `students` | K-PII | student (`user_id`) + tenant | **TAK** (backfill) | ✅ | student: swój; faculty: swój tenant | student: swój (onboarding); faculty: brak zapisu danych studenta |
| 2 | `competencies` | K-INT | student (przez `student_id`) + tenant | **TAK** | ✅ | student: swoje; faculty: tenant (agregat) <sup>R1</sup> | student: swoje; system |
| 3 | `gaps` | K-INT | student + tenant | **TAK** | ✅ | student: swoje; faculty: tenant (agregat) | system (generowane AI); student: brak |
| 4 | `skill_maps` | K-INT | student + tenant | **TAK** | ✅ | student: swój | system (generowane AI) |
| 5 | `passports` | K-INT + **publiczny odczyt** | student + tenant | **TAK** | ✅ + wyjątek | student: swój; **public: po `passports.id`, tylko whitelist kolumn** (sekcja 6.1) | student: swój; system |
| 6 | `project_submissions` | K-INT | student + tenant; **moderacja faculty** | **TAK** | ✅ | student: swoje; faculty: tenant (kolejka moderacji) | student: swoje (do `submitted`); **faculty: `status=verified/rejected` + `verified_by` + `verified_at` — jedyna ścieżka werdyktu** (K2 fix) <sup>R2</sup> |
| 7 | ~~`micro_courses`~~ | — | — | — | n/d | n/d | **USUNIĘTA w `0004` (ADR-008, na prod 2026-05-26).** Poza schemą i zakresem RLS. |
| 8 | `job_market_data` | K-PUB | brak (referencyjna) | NIE | wyjątek (sekcja 5) | wszyscy uwierzytelnieni | tylko system/seed |
| 9 | `projects` | K-PUB | globalna (katalog); `partner_id`+`exclusivity` | NIE | wyjątek | wszyscy uwierzytelnieni (z filtrem exclusivity — sekcja 6.2) | tylko system/seed |
| 10 | `project_competencies` | K-PUB | dziecko `projects` | NIE | wyjątek | wszyscy uwierzytelnieni | tylko system/seed |
| 11 | `project_sources` | K-PUB | konfiguracja | NIE | wyjątek | server-only | tylko system |
| 12 | `faculty_sessions` | K-SES | faculty (przez `faculty_user` → tenant) | przez link | ✅ deny-all client | **nigdy klient** (server-only lookup po `token_hash`) | tylko server |
| 13 | `audit_log` | K-SES | brak | NIE | ✅ deny-all client | **nigdy klient** | **append-only**; tylko server INSERT; UPDATE/DELETE zakazane (sekcja 6.3) |
| 14 | `user` (Better Auth) | K-PII | self | NIE (tenant przez `students`) | wyjątek warunkowy (6.4) | server (Better Auth) | server (Better Auth) |
| 15 | `session` (Better Auth) | K-SES | self | NIE | wyjątek warunkowy (6.4) | server | server |
| 16 | `account` (Better Auth) | K-SES (tokeny OAuth, hasło) | self | NIE | wyjątek warunkowy (6.4) | server | server |
| 17 | `verification` (Better Auth) | K-SES | brak (identifier) | NIE | wyjątek warunkowy (6.4) | server | server |
| 18 | `project_reflections` | K-PII+ | student (przez `student_id` → `students.user_id`) + tenant | **TAK** (`0015`) | ✅ FORCE | student: własne (CRUD); **app_faculty: brak grantu, brak polityki — fizyczny deny-by-default (R1 prywatności, PRD US-B5.1)** | student: własne; **faculty: BRAK** |

**`tenant_id` dodawany w `0006` → 6 tabel:** `students`, `competencies`, `gaps`, `skill_maps`, `passports`, `project_submissions`. (ADR-001 mówił o 7 — siódma to `micro_courses`, usunięta w `0004`, więc realnie 6.)

> <sup>R1</sup> **Faculty SELECT na `competencies` z wyłączeniem `self_assessment`** (gdy kolumna powstanie). RLS izoluje wiersze, nie kolumny — tajność samooceny przed faculty wymaga column-level `GRANT`/`REVOKE` na `app_faculty`. Mechanizm + gotchas: ADR-002 (`docs/decisions/002-column-level-isolation-r1.md`, `Accepted` 2026-05-28). Status dzisiaj: kolumna nie istnieje; dopóki nie powstanie, R1 to luka feasibility, nie regres — migracja X uruchamia się wraz z dodaniem kolumny.

> <sup>R2</sup> **Faculty UPDATE na `project_submissions` ograniczony kolumnowo do `status` + `verified_by` + `verified_at`** (gdy kolumny `verified_by`/`verified_at` + handler moderacji powstaną; dziś `0008` daje tabelowy `GRANT UPDATE` bez listy kolumn). RLS izoluje wiersze (`faculty_moderates_tenant`), ale `WITH CHECK` nie ogranicza kolumn — bez column-level `REVOKE` + `GRANT UPDATE (status, verified_by, verified_at)` faculty technicznie mógłby nadpisać dane studenta we własnym tenancie (`repo_url`, `notebook_url`, `score`, `ai_review_json`, …). Mechanizm + gotchas: ADR-004 (`docs/decisions/004-faculty-update-column-isolation-r2.md`, `Accepted` 2026-05-28). Status dzisiaj: kolumny + handler nie istnieją; dopóki nie powstaną, R2 to luka feasibility, nie regres — migracja Y uruchamia się wraz z landingiem K2/Z5.

---

## 4. Lista wyjątków RLS (wymóg DoD domeny 8)

Skrypt CI sprawdza: każda tabela w `public.` ma `relrowsecurity = true` **lub** jest tu z uzasadnieniem. Tabele bez RLS user-data:

| Tabela | Dlaczego bez RLS tenant-owej | Kontrola zamiast RLS |
|---|---|---|
| `job_market_data` | Dane referencyjne, identyczne dla wszystkich, brak właściciela | Zapis tylko przez seed/system (brak endpointu zapisu klienta) |
| `projects` | Katalog globalny; izolacja exclusivity ≠ tenant-isolation | Filtr `exclusivity`/`partner_id` w warstwie zapytań (6.2); zapis tylko seed |
| `project_competencies` | Dziecko `projects`, te same prawa | Jak `projects` |
| `project_sources` | Konfiguracja źródeł, nie dane użytkownika | Server-only, brak ścieżki klienta |

`faculty_sessions`, `audit_log`, Better Auth (`user`/`session`/`account`/`verification`) — **mają RLS** (deny-all dla klienta), ale nie tenant-ową — patrz 6.3/6.4.

---

## 5. Egzekucja — 4 warstwy (ADR-003)

Macierz definiuje *co* ma być prawdą; ADR-003 definiuje *jak* to egzekwujemy. Każda tabela z `tenant_id` przechodzi przez 4 warstwy:

1. **`withTenantContext` (primary)** — `TenantScopedDb` wymusza `where(eq(*.tenantId, ctx.tenantId))` na SELECT/UPDATE/DELETE. Type-safe, czytelne w warstwie aplikacji. Od `0011` używa `dbRuntime` — po ops-step (sub-issue #19a) baza połączenia to `app_runtime` (NOBYPASSRLS), więc RLS egzekwuje się nawet bez `SET LOCAL ROLE`.
2. **Polityka RLS SQL (defense-in-depth)** — `current_setting()` per request; jeśli ktoś zapomni WHERE lub użyje surowego SQL → 0 wierszy.
3. **Lint w CI (K4)** — statyczna analiza: query Drizzle na tabeli z `tenant_id` bez `where(eq(*.tenantId,...))` → build czerwony.
4. **Test cross-tenant w CI (K4)** — symulacja ataku: student tenanta A próbuje danych B → 0 wierszy + wpis `audit_log` „attempted cross-tenant access".

---

## 6. Przypadki specjalne

### 6.1 Paszport publiczny (`passports`, `/passport/[token]`) — B1 ROZWIĄZANE (opcja b, decyzja Darka 2026-05-27)
Finding (publiczny paszport ujawniał imię+uczelnię+profil **bez zgody, po zgadywalnym UUID** — niezależny przegląd podbił do blokera B1) **zamknięty mechanizmem token + opt-in** (migracja `0009`):
- `passports.public_enabled boolean default false` — **domyślnie niepubliczny** (żaden istniejący paszport nie jest publicznie dostępny).
- `passports.share_token text unique` — niezgadywalny token (256-bit), klucz dostępu publicznego zamiast PK; nadawany przy świadomym włączeniu.
- Publiczny odczyt (`/passport/[id]/page.tsx` + `/api/passport/[id]`) wyłącznie po `share_token` **i** `public_enabled = true`. Enumeracja po UUID niemożliwa.
- Opt-in/opt-out: `POST/DELETE /api/passport/share` (uwierzytelnione, własny paszport) + przycisk w `passport-view` („Udostępnij publicznie" / „Wyłącz udostępnianie"), audyt `passport.share.enable/disable`. **Wyłączenie ROTUJE token** (§8 #5, 2026-05-28): `DELETE` zeruje `share_token` razem z `public_enabled=false`, więc wyciekły link przestaje działać trwale; re-enable wygeneruje **nowy** token. Audyt rotacji w `passport.share.disable.metadata.tokenRotated` + `previousTokenHashPrefix` (skrót, nie raw token).
**Sign-off Ryana (domena 8) — WYSTAWIONY 2026-05-27, GO.** Domknięcia ponad samym tokenem:
- **A1 — zgoda poinformowana i wersjonowana** (`bd39efc`): ekran zgody wymienia wprost ujawniane pola i ostrzega „każdy z linkiem widzi dane — bez logowania"; udostępnienie dopiero po akceptacji. Klient wysyła `consentVersion`, serwer odrzuca rozjazd (409) i zapisuje wersję + ip/userAgent w `audit_log.metadata` (`PASSPORT_SHARE_CONSENT_VERSION`, `src/lib/consent.ts`). Bump wersji = przy każdej zmianie treści zgody.
- **A2 — niewykrywalność** (`6f5dd2e`): strona publiczna `robots: noindex/nofollow`, tytuł/metadane bez imienia (PII).
- **Minimalizacja pól**: widok publiczny zwraca whitelistę (imię, uczelnia, kierunek, semestr, cel, kompetencje, zweryfikowane projekty) — nie cały rekord.

### 6.2 Exclusivity projektów (`projects`)
`exclusivity=true` + `partner_id` = projekt widoczny tylko dla studentów danego partnera. To **nie** RLS tenant-owy (projekt to katalog, nie dane studenta), lecz filtr w warstwie zapytań: katalog dla studenta tenanta T pokazuje `exclusivity=false OR partner_id = T`. Test w CI.

### 6.3 `audit_log` — append-only
INSERT tylko server. **UPDATE/DELETE zakazane triggerem `audit_log_no_update_delete`** (`BEFORE UPDATE OR DELETE … FOR EACH ROW`, `0008`). **TRUNCATE zakazane triggerem `audit_log_no_truncate`** (`BEFORE TRUNCATE … FOR EACH STATEMENT`, `0010` — `§8 #4` zamknięte 2026-05-28; chroni przed owner-bypassem, bo row-level triggery nie odpalają się na TRUNCATE). Oba triggery używają tej samej funkcji `audit_log_append_only()` rzucającej `RAISE EXCEPTION` z `TG_OP`. App-role `app_student`/`app_faculty` nie mają TRUNCATE (jawne `REVOKE` w `0010` na wypadek przyszłego "GRANT ALL"). Retencja 12 m-cy (CLAUDE.md sekcja 10) → plan retencji `docs/data/retention.md`. Klient nigdy nie czyta.

### 6.4 Tabele Better Auth — wyjątek warunkowy
`user`/`session`/`account`/`verification` są obsługiwane **wyłącznie server-side przez adapter Better Auth** (brak ścieżki bezpośredniego zapytania klienta). W `0008` mają `ENABLE RLS` **bez polityki app-rolowej** → właściciel (Better Auth = `neondb_owner`) omija RLS i logowanie działa nietknięte, a role `app_student`/`app_faculty` bez GRANTu/polityki = deny-client. **Ryzyko potwierdzone empirycznie:** sign-up/login = 200 na preview Vercel po `0008` (smoke Darka 2026-05-27) — kolizji brak, tabele zostają z `ENABLE` (nie wracają na listę wyjątków).

---

## 7. Wejście do sign-offu Ryana (G6) + DoD

Domena 8 wymaga sign-offu Ryana przed go-live. Ta macierz dostarcza element „macierz RLS per tabela". Pozostałe elementy (osobne): lista endpointów publicznych (skan middleware matcher — Leo Z7), plan retencji (`docs/data/retention.md`), audyt zależności (Dependabot, K4).

**DoD tej macierzy (stan 2026-05-27, zwalidowany na dev/preview Neon przez `tools/k3-validate.ts`):**
- ☑ Skrypt CI: każda tabela w `public.` ma `relrowsecurity=true` lub jest na liście wyjątków (sekcja 4) — `k3-validate` potwierdza RLS enabled.
- ☑ Test integracyjny per tabela tenant-owa: student/faculty tenanta A nie czyta danych B → 0 wierszy (testy izolacji 7/7).
- ☑ Test: faculty A nie moderuje submisji B (polityka `faculty_moderates_tenant` per tenant).
- ☑ Test append-only `audit_log`: UPDATE/DELETE → odrzucone politykę.
- ☑ Test logowania/rejestracji zielony po włączeniu RLS na tabelach Better Auth (6.4) — smoke preview.
- ☑ Sign-off Ryana w `docs/security/beta-v01-signoff.md` (GO, 2026-05-27).

> ⚠️ Walidacja wykonana na gałęzi dev/preview Neon. **Re-run `tools/k3-validate.ts` na `main` po migracji prod** (runbook §8) jest warunkiem zamknięcia DoD na produkcji.

---

## 8. Dług utwardzenia (po Becie — nazwany, niezablokujący)

1. **`FORCE RLS` + nie-właścicielska rola login.**
	- **Phase 1 — ZAMKNIĘTE 2026-05-28 (migracja `0011_app_runtime_role.sql`):** rola `app_runtime` NOLOGIN, NOBYPASSRLS, członek `app_student`/`app_faculty`. `dbRuntime` w `src/lib/db/index.ts` z `DATABASE_URL_RUNTIME` env (fallback do `DATABASE_URL` z warningiem). `withTenantContext` przełączone na `dbRuntime`. `k3-validate` test #9 weryfikuje rolę.
	- **Phase 2 sub-issues — status 2026-05-28:**
	  - **19a — ZAMKNIĘTE 2026-05-31 (ops):** `ALTER ROLE app_runtime LOGIN PASSWORD '<gen>'` na prod Neon + `DATABASE_URL_RUNTIME` w Vercel Production+Preview + redeploy. Runtime łączy się jako `app_runtime` (NOBYPASSRLS) — RLS egzekwowane na prod. Incident przy aktywacji: `\n` w hoście env (paste z zawiniętego markdown) + `main` nie budował się bo `next build` (strict) typecheckuje też `tools/*.ts`, a `tools/activate-app-runtime.ts` miał błąd typu (PR #45 → naprawione **PR #47**, pin `ownerUrl: string`). Hasło `app_runtime` rotowane 2026-05-31 (1Password). Weryfikacja: `POST /api/passport/share` = 200 na prod. **Lekcja:** `next build` typecheckuje też skrypty w `tools/` — błąd typu w CLI ops blokuje cały prod build.
	  - **19b…19g — ZAMKNIĘTE (PR-y #35-#40):** refactor 6 tras studenta na `withTenantContext({userId, tenantId, role: "student"})`. Wzorzec: `src/app/api/faculty/dashboard/route.ts`. Trasa publiczna `/api/passport/[id]` celowo poza zakresem (anonimowa, gated share_token).
	  - **19h — ZAMKNIĘTE (migracja `0012_force_rls.sql` + ADR-005):** FORCE ROW LEVEL SECURITY na 6 tabelach studenta + `owner_passthrough` policy `TO neondb_owner` (USING true WITH CHECK true). Wybór opcji (b) w ADR-005 — owner ma explicit, audytowalny passthrough zamiast implicit non-FORCE; runtime (`app_runtime`) pełnoprawnie subject to FORCE. `k3-validate` test #10 (10a relforcerowsecurity + 10b policy istnieje + 10c deny-default app_student bez current_user_id).
	  - **19i — ZAMKNIĘTE (PR #42):** `tools/k3-validate.ts` wpięte do GitHub Actions (job `integration` po `pnpm db:migrate` + `db:seed` + skrypt z testami 10/10). Każdy PR/push do main waliduje 10/10.
2. **Izolacja kolumnowa faculty = warstwa aplikacji, nie baza — po obu stronach (UPDATE i SELECT). Doc-closed po obu stronach 2026-05-28; migracje X/Y czekają na landing odpowiednich kolumn.**
	- **UPDATE — R2 (Ethan, lustro R1 po stronie zapisu 2026-05-28):** polityka `faculty_moderates_tenant ON project_submissions FOR UPDATE TO app_faculty` ogranicza UPDATE do **wierszy** własnego tenanta, ale `WITH CHECK` to predykat wierszowy — **nie ogranicza kolumn**. Dziś `0008:35` daje `GRANT UPDATE ON project_submissions TO app_faculty` tabelowo, więc faculty technicznie mógłby pisać po `repo_url`/`notebook_url`/`score`/`ai_review_json`. Rekomendacja: **column-level `REVOKE UPDATE` + `GRANT UPDATE (status, verified_by, verified_at)`** na `app_faculty` (deny-by-default dla przyszłych kolumn, jasny komunikat `permission denied for column X`). Pełna analiza, gotchas i plan walidacji w **ADR-004** (`docs/decisions/004-faculty-update-column-isolation-r2.md`, `Accepted` 2026-05-28, sign-off Ethan + Ryan). Migracja Y uruchamiana wraz z landingiem K2/Z5 (kolumny `verified_by`/`verified_at` + handler `/api/faculty/submissions/[id]/verdict`); dopóki handler nie istnieje, R2 to luka feasibility, nie regres.
	- **SELECT — R1 (Ethan, feasibility 2026-05-28):** RLS to **predykat wierszowy**, nie kolumnowy. `faculty_sees_tenant ON competencies FOR SELECT TO app_faculty` przepuszcza całe wiersze własnego tenanta z **wszystkimi** kolumnami, na które rola ma tabelowy `SELECT` (dziś: cała `competencies` — `drizzle/0008_faculty_tenant_and_rls.sql:33`). Planowana `competencies.self_assessment` (prywatna samoocena studenta) byłaby dla faculty natychmiast czytelna. Rekomendacja: **column-level `REVOKE` + `GRANT SELECT` z listą bez `self_assessment`** dla `app_faculty` (egzekwowane też w `WHERE`/agregatach, deny-by-default dla przyszłych kolumn). Pełna analiza, gotchas i przyszły plan walidacji w **ADR-002** (`docs/decisions/002-column-level-isolation-r1.md`, `Accepted` 2026-05-28, sign-off Ethan + Ryan). Migracja X uruchamiana wraz z dodaniem kolumny — dopóki kolumna nie istnieje, R1 to luka feasibility.
3. **`faculty_users` per osoba** zamiast hasła per kampus (`FACULTY_PASSWORD_<TENANT>`) — konta nazwane + audyt per człowiek.
4. ~~**`audit_log` append-only nie chroni przed `TRUNCATE`**~~ — **ZAMKNIĘTE 2026-05-28 (migracja `0010_audit_log_truncate_protection.sql`)**. Dodany statement-level trigger `audit_log_no_truncate` (`BEFORE TRUNCATE … FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only()`) + `REVOKE TRUNCATE ON audit_log FROM app_student, app_faculty` (defense-in-depth — role nigdy tego nie miały, jawne REVOKE chroni przed regresją "GRANT ALL"). Owner (`neondb_owner`) traci ścieżkę „jedno polecenie czyści cały ślad" — trigger BEFORE TRUNCATE odpala się też dla ownera (zwykły trigger, nie SECURITY DEFINER). Walidacja: `tools/k3-validate.ts` test #8. Status po §8 #1 (FORCE RLS + rola login nie-owner): runtime nawet bez tego triggera nie miałby TRUNCATE, ale trigger zostaje jako warstwa-łań (defense-in-depth: gdyby kiedyś role login dostała przywilej tabeli).
5. ~~**`share_token` paszportu: „wyłączenie" to pauza, nie odwołanie**~~ — **ZAMKNIĘTE 2026-05-28**. Decyzja Sophia/Ryan: rotacja przy wyłączeniu (zamiast osobnego endpointu rotacji). `DELETE /api/passport/share` zeruje `share_token` razem z `public_enabled=false` → wyciekły link przestaje być trwały. `POST /api/passport/share` przy re-enable widzi `shareToken IS NULL` i wpada w gałąź `randomBytes(32)` → generuje **nowy** token. Audyt: `passport.share.disable` z `metadata.tokenRotated: true` + `previousTokenHashPrefix` (16 hex sha256 — wystarczy do correlation w incident response, za krótki by brute-forcem odtworzyć token; raw token nigdy do `audit_log`). UI: dialog zgody wymienia rotację jako konsekwencję wyłączenia; lokalny stan `shareToken` czyszczony przy `disableSharing`. Test rotacji w `passport-view.test.tsx`.

---

## Self-critique

Rola: principal engineer po incydencie wycieku danych między tenantami. Pięć słabości i co poprawiłem przed oddaniem:

1. **„7 tabel z tenant_id" przepisane bezrefleksyjnie z ADR-001.** → Policzyłem realnie ze schemy: 7 zawierało `micro_courses`, którą `0009` usuwa (ADR-008) — więc **6**. Niespójność nazwana, nie powielona.
2. **Better Auth jako martwy punkt.** Łatwo było napisać „RLS na wszystkim" — ale RLS na `user`/`session` może zerwać własne zapytania Better Auth. → Sekcja 6.4 + DoD z testem logowania po `0006`; wyjątek warunkowy zamiast ślepego „enable".
3. **Publiczny paszport mógł zniknąć w „SELECT public".** → Wyodrębniony jako finding RODO (6.1): ujawnia imię+uczelnię bez zgody; rekomendacja `public_enabled` + zgoda, do decyzji z Ryanem. Bezpieczeństwo prowadzi do działania, nie opisu.
4. **Macierz mogła być listą bez egzekucji.** → Sekcja 5 wiąże każdą tabelę tenant-ową z 4 warstwami ADR-003 (helper + RLS + lint + test), a nie deklaracją „włączymy RLS".
5. **`audit_log` jako zwykła tabela K-INT.** → Sklasyfikowany K-SES, append-only z jawnym zakazem UPDATE/DELETE (6.3) — log, którego nie da się po cichu zmienić, to warunek audytowalności (wartość 1 CLAUDE.md).

Porównanie z golden-adr: każda pozycja macierzy wyprowadzona ze schemy + klasy danych, każdy przypadek specjalny domknięty kontrolą lub testem, a najtwardsze ryzyko (publiczny paszport, Better Auth) eskalowane do sign-offu Ryana, nie schowane. Gotowe jako wejście do K3 i G6.
