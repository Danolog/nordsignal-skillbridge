# Runner E2E @dbwrite (Windows/PowerShell) — migracje + seed + pełny pakiet
# przeciw BAZIE TESTOWEJ. NIGDY prod.
#
# Wymagane zmienne środowiskowe (ustaw w SWOIM terminalu — nie commituj):
#   $env:E2E_DATABASE_URL = "postgresql://user:pass@localhost:5432/skillbridge_e2e"
#   $env:E2E_TEST_EMAIL=...; $env:E2E_TEST_PASSWORD=...
#   $env:E2E_TEST_EMAIL_B4=...; $env:E2E_TEST_PASSWORD_B4=...
#   $env:BETTER_AUTH_SECRET=...; $env:BETTER_AUTH_URL="http://localhost:3000"
#   (B0/B4 dodatkowo) $env:ANTHROPIC_API_KEY=...
#
# Co robi:
#   1. migruje schemat (0001–0014) na E2E_DATABASE_URL (drizzle-kit migrate)
#   2. seeduje konta + dane testowe (tools/seed-e2e.ts)
#   3. podnosi `next dev` na bazie testowej (osobny proces) — albo użyj własnego
#   4. odpala pakiet @dbwrite (Playwright)
#
# Krok 3 (serwer) zostawiamy świadomie ręczny — bo `next dev` bierze .env.local
# (=prod). Uruchom dev z DATABASE_URL=E2E_DATABASE_URL w osobnym oknie, POTEM ten skrypt z -SkipServer.

param([switch]$SkipServer)

$ErrorActionPreference = "Stop"

if (-not $env:E2E_DATABASE_URL) { Write-Error "Brak E2E_DATABASE_URL"; exit 1 }

# Migracje celują w bazę testową: nadpisujemy DATABASE_URL na czas migrate/seed.
# dotenv w drizzle.config NIE nadpisuje już-ustawionego env, więc to bezpieczne.
$env:DATABASE_URL = $env:E2E_DATABASE_URL
$env:E2E_ALLOW_DB_WRITES = "1"

Write-Host "==> Migracje (0001-0014) na bazie testowej..."
pnpm exec drizzle-kit migrate

Write-Host "==> Seed E2E (konta + dane testowe)..."
pnpm exec tsx tools/seed-e2e.ts

Write-Host "==> Pakiet @dbwrite (Playwright)..."
# Serwer musi działać na bazie testowej (DATABASE_URL=E2E_DATABASE_URL) — patrz nagłówek.
pnpm exec playwright test --grep @dbwrite
