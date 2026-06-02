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
  `E2E_ALLOW_DB_WRITES=1`. Wymagają **bazy testowej** i **konta testowego**.

## Uruchomienie — tylko @safe (bezpieczne, bez bazy testowej)

```bash
# 1. zainstaluj przeglądarkę playwright (raz)
pnpm exec playwright install chromium

# 2. podnieś serwer wskazujący NIE-prod bazę (albo dowolną — @safe nie pisze).
#    Najbezpieczniej: pusty/atrapowy DATABASE_URL, żeby na pewno nie dotknąć prod.
#    (trasy Bety i tak tylko przekierują na /login — to testujemy)
DATABASE_URL="" pnpm dev   # w osobnym terminalu

# 3. odpal tylko grupę @safe
pnpm exec playwright test --grep @safe
```

## Uruchomienie — pełny pakiet (@dbwrite) — WYMAGA bazy testowej

NIE odpalać przeciw produkcji. Potrzebne:

1. **Baza testowa** (lokalny Postgres w Dockerze albo osobny projekt Neon
   preview) z migracjami + seedem: `pnpm db:push && pnpm db:seed`.
2. **Konto testowe** e-mail/hasło z ukończonym onboardingiem (rekord `students`).
3. Zmienne:

```bash
export DATABASE_URL="postgresql://... (BAZA TESTOWA, nie prod!)"
export ANTHROPIC_API_KEY="..."   # B0 woła model — realny koszt
export E2E_TEST_EMAIL="student-test@example.com"
export E2E_TEST_PASSWORD="..."
export E2E_ALLOW_DB_WRITES=1
export PLAYWRIGHT_BASE_URL="http://localhost:3000"

pnpm dev   # serwer na bazie testowej, osobny terminal
pnpm exec playwright test          # cały pakiet
```

Bezpiecznik: przy `E2E_ALLOW_DB_WRITES=1` i `PLAYWRIGHT_BASE_URL` wskazującym
host produkcji testy **celowo się wywalą** (helpers/guards.ts).

## Koszt LLM

B0 (czat ~9 tur + podsumowanie) woła Claude. Pakiet trzyma minimum: 1 pełny
przejazd czatu + 1 test fokusu + 3× samo podsumowanie (bug #57 bywał kapryśny).
