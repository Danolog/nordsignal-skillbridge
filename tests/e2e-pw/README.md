# Pakiet smoke E2E CareerEDGE (Playwright)

Pokrywa funkcje Bety SkillBridge: logowanie (Google + e-mail/hasło), bramka auth,
B0 Pomocnik kariery (czat + podsumowanie), B1 paszport, B4 samoocena, dashboard,
marketplace projektów.

## Dwie grupy testów (tagi)

- `@safe` — publiczne, **read-only**, bez zapisu do bazy, bez kosztu LLM. Wolno
  odpalać nawet gdy `.env.local` celuje w prod (renderują tylko publiczne strony +
  sprawdzają redirect bramki auth).
- `@dbwrite` — przepływy **zapisujące dane studenta** lub **wołające model** (B0,
  B1, B4, dashboard, projekty). Pomijają się, dopóki nie ustawisz
  `E2E_ALLOW_DB_WRITES=1`. Wymagają **bazy testowej** i **kont testowych**.
- `@llm` (podzbiór `@dbwrite`) — wymaga `ANTHROPIC_API_KEY`. Bez klucza testy te
  **pomijają się same** (B0 podsumowanie/czat, B4 — krok 4 osiągalny tylko przez
  krok „Sylabus", który woła model).

## Dwa konta testowe (wymagania tras są sprzeczne)

- **main** (`E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`) — `onboardingCompleted=TRUE`.
  Pod B1, dashboard, marketplace, B0 (te trasy redirectują na `/onboarding`, gdy
  onboarding nie domknięty).
- **b4** (`E2E_TEST_EMAIL_B4` / `E2E_TEST_PASSWORD_B4`) — `onboardingCompleted=FALSE`.
  Pod B4 (`/onboarding` redirectuje na `/dashboard`, gdy onboarding domknięty).

Oba tworzy seed `tools/seed-e2e.ts` przez better-auth (realny hash hasła).

---

## WAŻNE: PowerShell vs bash — zmienne środowiskowe

**W PowerShellu ustawiasz env przez `$env:VAR`, NIE przez `VAR=... pnpm ...`.**

```powershell
# POPRAWNIE (PowerShell):
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/skillbridge_e2e"
pnpm db:migrate:test

# BŁĘDNIE (bash-prefix — w PowerShellu NIE ustawia zmiennej):
# DATABASE_URL=postgres://... pnpm db:migrate:test   ← nie rób tego!
# Efekt: drizzle-kit nie dostaje zmiennej → spada na .env.local (=prod DSN)
```

**Reguły dla agentów (i każdego kto odpala skrypty ręcznie):**

1. Zawsze `$env:DATABASE_URL = "..."` przed `pnpm ...` — nigdy bash-prefix.
2. Używaj wyłącznie skryptów z sufiksem `:test` / `seed:e2e` / `run-e2e-dbwrite.ps1`
   — są guardowane przez `tools/assert-test-db.ts` (allowlista hostów testowych).
3. Nigdy nie czytaj prod `.env.local` ręcznie i nie przekazuj jego wartości do
   skryptów testowych.
4. Nigdy nie odpalam `pnpm db:migrate` (gołego) jako agent — tylko `pnpm db:migrate:test`.
   Gołe `db:migrate` to czerwona linia (wyłączna ścieżka prod, odpalana tylko przez Darka).

---

## Uruchomienie — tylko @safe (bez bazy testowej)

```powershell
pnpm exec playwright install chromium           # raz
$env:DATABASE_URL = ""; pnpm dev                 # osobny terminal (pusty URL = pewność, że nie tknie prod)
pnpm exec playwright test --grep @safe
```

## Uruchomienie — pełny @dbwrite — WYMAGA bazy testowej

NIE odpalać przeciw produkcji. Bezpiecznik `helpers/guards.ts` wywali testy, gdy
`PLAYWRIGHT_BASE_URL` wskazuje host prod. Guard `tools/assert-test-db.ts` (allowlista
hostów testowych) przerywa migrate/seed/e2e, zanim dotkną bazy, gdy `DATABASE_URL`
wskazuje na nie-lokalny host.

### 1. Postaw bazę testową (jedna z dróg)

- **Lokalny Postgres / Docker** (rekomendowane offline): utwórz pustą bazę, np.
  `docker run -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16-alpine`.
- **Dedykowana gałąź Neon** (test): utwórz w konsoli Neon gałąź testową; jej
  connection string podaj jako `E2E_DATABASE_URL` i ustaw `E2E_ALLOW_REMOTE=1`.

### 2. Zmienne (BAZA TESTOWA — nie prod!)

Skopiuj `.env.test.example` do `.env.test` i uzupełnij wartości.

Albo ustaw ręcznie w terminalu PowerShell (nie commituj):

```powershell
$env:E2E_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/skillbridge_e2e"
$env:DATABASE_URL     = $env:E2E_DATABASE_URL   # dla serwera dev + migracji
$env:E2E_TEST_EMAIL       = "e2e-main@example.com"
$env:E2E_TEST_PASSWORD    = "Test1234!e2e"
$env:E2E_TEST_EMAIL_B4    = "e2e-b4@example.com"
$env:E2E_TEST_PASSWORD_B4 = "Test1234!e2e"
$env:BETTER_AUTH_SECRET   = "<32-bajtowy-sekret>"
$env:BETTER_AUTH_URL      = "http://localhost:3000"
$env:ANTHROPIC_API_KEY    = "..."    # tylko dla @llm (B0/B4); bez = te się pominą
$env:E2E_ALLOW_DB_WRITES  = "1"
$env:PLAYWRIGHT_BASE_URL  = "http://localhost:3000"
```

### 3. Migracje + seed + serwer + testy

```powershell
# Migracja testowa (guard allowlisty — przerywa, gdy DATABASE_URL wskazuje na prod):
pnpm db:migrate:test

# Seed kont + danych testowych (idempotentny):
pnpm seed:e2e

# Serwer dev na bazie testowej (osobny terminal):
pnpm dev

# Pakiet @dbwrite:
pnpm exec playwright test --grep @dbwrite
```

Windows (wszystko w jednym): `tools/run-e2e-dbwrite.ps1` robi migrate+seed+testy
(serwer dev w osobnym oknie — patrz nagłówek skryptu).

## Co seeduje `tools/seed-e2e.ts`

Izolowany tenant `e2e-test`:
- student **main**: ≥5 kompetencji, paszport, projekt + 1 zgłoszenie (detal);
- student **b4**: profil + ≥5 kompetencji nieocenionych (do oceny w teście);
- projekt globalny `e2e-detal-projektu` (żeby detal miał się z czego otworzyć).

Idempotentny: kasuje własne rekordy po stałych ID i wstawia od nowa.
Guard: wymaga `E2E_DATABASE_URL`, sprawdza allowlistę hostów testowych przez
`tools/assert-test-db.ts` (odmawia hostów innych niż localhost/127.0.0.1/::1,
chyba że `E2E_ALLOW_REMOTE=1`), nie drukuje connection stringa.

## Koszt LLM

B0 (czat ~9 tur + podsumowanie) i B4 (krok „Sylabus") wołają Claude. Pakiet trzyma
minimum: 1 pełny przejazd czatu B0 + 1 test fokusu + 3× samo podsumowanie B0
(bug #57 bywał kapryśny) + 1 przejazd B4. Bez `ANTHROPIC_API_KEY` ścieżki LLM
pomijają się (`test.skip`), reszta @dbwrite (B1/dashboard/marketplace) działa.
