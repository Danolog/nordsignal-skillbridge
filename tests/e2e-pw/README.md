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

## Uruchomienie — tylko @safe (bez bazy testowej)

```bash
pnpm exec playwright install chromium           # raz
DATABASE_URL="" pnpm dev                          # osobny terminal (pusty URL = pewność, że nie tknie prod)
pnpm exec playwright test --grep @safe
```

## Uruchomienie — pełny @dbwrite — WYMAGA bazy testowej

NIE odpalać przeciw produkcji. Bezpiecznik `helpers/guards.ts` wywali testy, gdy
`PLAYWRIGHT_BASE_URL` wskazuje host prod.

### 1. Postaw bazę testową (jedna z dróg)

- **Lokalny Postgres** (rekomendowane offline): utwórz pustą bazę, np.
  `createdb skillbridge_e2e`.
- **Dedykowana gałąź Neon** (test): utwórz w konsoli Neon gałąź testową; jej
  connection string podaj jako `E2E_DATABASE_URL` i ustaw `E2E_ALLOW_REMOTE=1`.

### 2. Zmienne (BAZA TESTOWA — nie prod!)

```bash
export E2E_DATABASE_URL="postgresql://user:pass@localhost:5432/skillbridge_e2e"
export DATABASE_URL="$E2E_DATABASE_URL"          # dla serwera dev + migracji
export E2E_TEST_EMAIL="e2e-main@example.com";     export E2E_TEST_PASSWORD="Test1234!e2e"
export E2E_TEST_EMAIL_B4="e2e-b4@example.com";    export E2E_TEST_PASSWORD_B4="Test1234!e2e"
export BETTER_AUTH_SECRET="<32-bajtowy-sekret>";  export BETTER_AUTH_URL="http://localhost:3000"
export ANTHROPIC_API_KEY="..."                    # tylko dla @llm (B0/B4); bez = te się pominą
export E2E_ALLOW_DB_WRITES=1
export PLAYWRIGHT_BASE_URL="http://localhost:3000"
```

### 3. Migracje + seed + serwer + testy

```bash
pnpm exec drizzle-kit migrate     # 0001–0014 na E2E_DATABASE_URL (DATABASE_URL = ta sama)
pnpm seed:e2e                      # konta + dane testowe (idempotentny)
pnpm dev                           # serwer na bazie testowej, osobny terminal
pnpm exec playwright test --grep @dbwrite
```

Windows: `tools/run-e2e-dbwrite.ps1` robi migrate+seed+testy (serwer dev w osobnym
oknie — patrz nagłówek skryptu).

## Co seeduje `tools/seed-e2e.ts`

Izolowany tenant `e2e-test`:
- student **main**: ≥5 kompetencji, paszport, projekt + 1 zgłoszenie (detal);
- student **b4**: profil + ≥5 kompetencji nieocenionych (do oceny w teście);
- projekt globalny `e2e-detal-projektu` (żeby detal miał się z czego otworzyć).

Idempotentny: kasuje własne rekordy po stałych ID i wstawia od nowa.
Guard: wymaga `E2E_DATABASE_URL`, odmawia hostów prod (chyba że `E2E_ALLOW_REMOTE=1`),
nie drukuje connection stringa.

## Koszt LLM

B0 (czat ~9 tur + podsumowanie) i B4 (krok „Sylabus") wołają Claude. Pakiet trzyma
minimum: 1 pełny przejazd czatu B0 + 1 test fokusu + 3× samo podsumowanie B0
(bug #57 bywał kapryśny) + 1 przejazd B4. Bez `ANTHROPIC_API_KEY` ścieżki LLM
pomijają się (`test.skip`), reszta @dbwrite (B1/dashboard/marketplace) działa.
