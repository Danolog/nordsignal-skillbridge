# Macierz RLS — SkillBridge Beta v0.1

**Wersja:** v0.2 · 2026-05-26
**Owner:** Ethan (CTO)
**Status:** Projekt do sign-offu Ryana (CRCO) — domena 8 standardu, warunek go-live (G6). Wejście do migracji K3 (`0006_tenant_id` + `0007_rls`, ADR-001 sekcja 4.2).
**Wejście:** `schema.ts` (`main`, **16 tabel** po dropie micro-courses w `0004`) · ADR-001 sekcja 4.2 (multi-tenancy + RLS) · ADR-003 (strategia: WHERE primary + RLS defense-in-depth, 4 warstwy) · `docs/audyty/2026-05-20-skillbridge-ai-production-readiness.md` (K3) · ADR-008 (drop micro-courses — WYKONANY).

**Changelog v0.1 → v0.2 (2026-05-26):** (1) **Renumeracja** — drop micro-courses wszedł na prod jako `0004`, więc K3: `0005` tenants → `0006` tenant_id+backfill → `0006b` NOT NULL → `0007` RLS+role (było 0004/0005/0006/0009). (2) `micro_courses` **usunięta** ze schemy — wypada z macierzy, 16 tabel. (3) Partnerzy Bety **potwierdzeni**: WSB Merito Szczecin + Warszawa. (4) Sterownik = `node-postgres` (nie Neon serverless) → `SET LOCAL` w transakcji bez quirków. (5) Egzekucja RLS wymaga `FORCE ROW LEVEL SECURITY` + nie-właścicielskiej roli przez `SET LOCAL ROLE` (aplikacja łączy się jako `neondb_owner`, który omija własne RLS). (6) Faculty per kampus = **hasło per tenant** + `faculty_sessions.tenant_id` (decyzja Darka 2026-05-26; `faculty_users` po Becie).

**Żargon (tłumaczenie):** *RLS* (Row Level Security) = izolacja na poziomie wiersza w bazie — polityka SQL decyduje, które wiersze widzi dane połączenie. *tenant* = uczelnia (najemca). *tenant_id* = kolumna wiążąca wiersz z uczelnią. *deny-by-default* = brak reguły = brak dostępu. *append-only* = tylko dopisywanie, bez edycji/kasowania.

---

## 1. Model tenanta (co doda K3)

Dziś izolacji między uczelniami **nie ma** (K3): zero `tenant_id`, zero polityk RLS, faculty na jednym współdzielonym haśle. K3 (Tydz. 2) dodaje:

- **`tenants`** (`0005`): `id uuid PK, slug text UNIQUE, name text`. Seed = 2 design partnerów Bety (`wsb-merito-szczecin`, `wsb-merito-warszawa`) + `__unmapped`.
- **`tenant_id`** (`0006` nullable+backfill → `0006b` `SET NOT NULL`): denormalizowany na każdej tabeli z danymi studenta — żeby polityka RLS była prosta i indeksowalna (bez JOIN w polityce). Backfill ze `students.university` (free-form) przez mapę `docs/data/tenant-mapping-beta.md` (osobny artefakt). `NOT NULL` po zielonej walidacji.
- **Faculty per tenant** (`0007`): wariant minimalny (decyzja Darka 2026-05-26) — `faculty_sessions.tenant_id` + login po **haśle per kampus** (`FACULTY_PASSWORD_<TENANT>`), zamiast jednego `FACULTY_PASSWORD`. Nazwane konta `faculty_users` per osoba — po Becie.
- **RLS + role** (`0007`): role `authenticated_student`/`authenticated_faculty`/`service_role` + `ENABLE` **+ `FORCE`** ROW LEVEL SECURITY + polityki per tabela wg tej macierzy. `FORCE` bo aplikacja łączy się jako właściciel tabel.

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
| 2 | `competencies` | K-INT | student (przez `student_id`) + tenant | **TAK** | ✅ | student: swoje; faculty: tenant (agregat) | student: swoje; system |
| 3 | `gaps` | K-INT | student + tenant | **TAK** | ✅ | student: swoje; faculty: tenant (agregat) | system (generowane AI); student: brak |
| 4 | `skill_maps` | K-INT | student + tenant | **TAK** | ✅ | student: swój | system (generowane AI) |
| 5 | `passports` | K-INT + **publiczny odczyt** | student + tenant | **TAK** | ✅ + wyjątek | student: swój; **public: po `passports.id`, tylko whitelist kolumn** (sekcja 6.1) | student: swój; system |
| 6 | `project_submissions` | K-INT | student + tenant; **moderacja faculty** | **TAK** | ✅ | student: swoje; faculty: tenant (kolejka moderacji) | student: swoje (do `submitted`); **faculty: `status=verified/rejected` + `verified_by` — jedyna ścieżka werdyktu** (K2 fix) |
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

**`tenant_id` dodawany w `0006` → 6 tabel:** `students`, `competencies`, `gaps`, `skill_maps`, `passports`, `project_submissions`. (ADR-001 mówił o 7 — siódma to `micro_courses`, usunięta w `0004`, więc realnie 6.)

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

1. **`withTenantContext` (primary)** — `TenantScopedDb` wymusza `where(eq(*.tenantId, ctx.tenantId))` na SELECT/UPDATE/DELETE. Type-safe, czytelne w warstwie aplikacji.
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
- Opt-in/opt-out: `POST/DELETE /api/passport/share` (uwierzytelnione, własny paszport) + przycisk w `passport-view` („Udostępnij publicznie" / „Wyłącz udostępnianie"), audyt `passport.share.enable/disable`.
**Do sign-offu Ryana (domena 8):** potwierdzić adekwatność RODO (zgoda przez kliknięcie wystarcza? minimalizacja zwracanych pól?). UX opt-inu (modal zgody, treść) — do dopracowania z Sophią/Milą.

### 6.2 Exclusivity projektów (`projects`)
`exclusivity=true` + `partner_id` = projekt widoczny tylko dla studentów danego partnera. To **nie** RLS tenant-owy (projekt to katalog, nie dane studenta), lecz filtr w warstwie zapytań: katalog dla studenta tenanta T pokazuje `exclusivity=false OR partner_id = T`. Test w CI.

### 6.3 `audit_log` — append-only
INSERT tylko server. **UPDATE/DELETE zakazane politykami** (`FOR UPDATE/DELETE USING (false)`). Retencja 12 m-cy (CLAUDE.md sekcja 10) → plan retencji `docs/data/retention.md`. Klient nigdy nie czyta.

### 6.4 Tabele Better Auth — wyjątek warunkowy
`user`/`session`/`account`/`verification` są obsługiwane **wyłącznie server-side przez adapter Better Auth** (brak ścieżki bezpośredniego zapytania klienta). RLS włączamy jako deny-all dla roli anon/klienta, z dostępem roli aplikacyjnej (która i tak wykonuje zapytania Better Auth). **Ryzyko do potwierdzenia z Ryanem:** włączenie RLS na tych tabelach nie może zerwać wewnętrznych zapytań Better Auth — wymaga testu logowania/rejestracji po `0007`. Jeśli kolidacja — tabele Better Auth zostają na liście wyjątków (server-only, brak ścieżki klienta) zamiast RLS.

---

## 7. Wejście do sign-offu Ryana (G6) + DoD

Domena 8 wymaga sign-offu Ryana przed go-live. Ta macierz dostarcza element „macierz RLS per tabela". Pozostałe elementy (osobne): lista endpointów publicznych (skan middleware matcher — Leo Z7), plan retencji (`docs/data/retention.md`), audyt zależności (Dependabot, K4).

**DoD tej macierzy (maszynowo sprawdzalny po K3):**
- ☐ Skrypt CI: każda tabela w `public.` ma `relrowsecurity=true` lub jest na liście wyjątków (sekcja 4).
- ☐ Test integracyjny per tabela tenant-owa: student/faculty tenanta A nie czyta danych B → 0 wierszy.
- ☐ Test: faculty A nie moderuje submisji B → 403.
- ☐ Test append-only `audit_log`: UPDATE/DELETE → odrzucone politykę.
- ☐ Test logowania/rejestracji zielony po włączeniu RLS na tabelach Better Auth (6.4).
- ☐ Sign-off Ryana w `docs/security/beta-v01-signoff.md`.

---

## Self-critique

Rola: principal engineer po incydencie wycieku danych między tenantami. Pięć słabości i co poprawiłem przed oddaniem:

1. **„7 tabel z tenant_id" przepisane bezrefleksyjnie z ADR-001.** → Policzyłem realnie ze schemy: 7 zawierało `micro_courses`, którą `0009` usuwa (ADR-008) — więc **6**. Niespójność nazwana, nie powielona.
2. **Better Auth jako martwy punkt.** Łatwo było napisać „RLS na wszystkim" — ale RLS na `user`/`session` może zerwać własne zapytania Better Auth. → Sekcja 6.4 + DoD z testem logowania po `0006`; wyjątek warunkowy zamiast ślepego „enable".
3. **Publiczny paszport mógł zniknąć w „SELECT public".** → Wyodrębniony jako finding RODO (6.1): ujawnia imię+uczelnię bez zgody; rekomendacja `public_enabled` + zgoda, do decyzji z Ryanem. Bezpieczeństwo prowadzi do działania, nie opisu.
4. **Macierz mogła być listą bez egzekucji.** → Sekcja 5 wiąże każdą tabelę tenant-ową z 4 warstwami ADR-003 (helper + RLS + lint + test), a nie deklaracją „włączymy RLS".
5. **`audit_log` jako zwykła tabela K-INT.** → Sklasyfikowany K-SES, append-only z jawnym zakazem UPDATE/DELETE (6.3) — log, którego nie da się po cichu zmienić, to warunek audytowalności (wartość 1 CLAUDE.md).

Porównanie z golden-adr: każda pozycja macierzy wyprowadzona ze schemy + klasy danych, każdy przypadek specjalny domknięty kontrolą lub testem, a najtwardsze ryzyko (publiczny paszport, Better Auth) eskalowane do sign-offu Ryana, nie schowane. Gotowe jako wejście do K3 i G6.
