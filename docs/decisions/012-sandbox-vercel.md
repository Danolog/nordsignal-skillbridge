# ADR-012 — B6/1.7: piaskownica dla kodu studenta = Vercel Sandbox

**Status:** zaakceptowany · **Data:** 2026-07-08 · **Decyzja:** Darek (sign-off w sesji, zadanie 1.7 roadmapy) [CZERWONA LINIA — uruchamianie niezaufanego kodu]
**Powiązania:** `docs/design/skillbridge-weryfikacja-zgloszen-redesign-v0.1.md` §II.2 (izolacja — „kluczowa decyzja architektoniczno-kosztowa Darka"), `step2-hard-checks.ts` (`runOk` = null w Fazie 1), roadmapa §3 Blok B6 (1.7→1.8→1.9)

## Kontekst

Faza 2 weryfikacji zgłoszeń wymaga URUCHOMIENIA kodu studenta (`runOk` w kroku
2 pipeline'u — dziś zawsze `null`, oceniamy bez wykonania). Cudzy kod to kod
niezaufany: potrzebna jednorazowa piaskownica z limitami zasobów, odcięciem od
sieci i zerem sekretów w środku. Wymagania: bezpieczeństwo izolacji, koszt przy
skali Bety (uruchomienia rzadkie — tylko submit z uruchamialnym deliverable),
prostota integracji z trasą Next.js (przepływ submitu, `maxDuration` 300 s),
minimalizacja nowych vendorów (czerwona linia „bez nowych usług zewnętrznych
bez sign-offu").

## Rozważone opcje

| Opcja | Izolacja | Vendor | Koszt (Beta) | Integracja | Werdykt |
|---|---|---|---|---|---|
| **Vercel Sandbox** | jednorazowe microVM, `networkPolicy: deny-all`, limity vCPU/RAM/czasu | **istniejący** (hosting aplikacji) | pay-per-use (Active CPU) — grosze/mies. | SDK `@vercel/sandbox` wprost z route'a | **WYBRANA** |
| E2B | dedykowane sandboxy code-interpreter | NOWY (klucz, DPA/RODO, billing) | $ za sesje | SDK | zapasowa, gdyby zależności DS przerosły Vercel Sandbox |
| GitHub Actions runner | VM per job | istniejący | darmowe minuty | workflow_dispatch + artefakty — niezgrabne; kolejka+boot 30–60 s; kruchość billingu (incydent 2026-07-08 zablokował WSZYSTKIE joby) | odrzucona |
| Własny Docker (VPS) | kontener — izolacja na NAS barki (patching, ucieczki) | infra własna | stały | pełna własna orkiestracja | odrzucona (zero-ops etos) |

## Decyzja

**Vercel Sandbox** — jednorazowe mikroVM u istniejącego dostawcy:

1. Runtime'y: `python3.13` (code/notebooki DS) i `node24`; `sql` przez harness
   w Pythonie (sqlite/duckdb w piaskownicy); `document`/`detection_rule` nie
   są uruchamiane (bez zmian).
2. **Twarde niezmienniki bezpieczeństwa** (kontrakt dla 1.8):
   - `networkPolicy: 'deny-all'` — kod studenta bez wyjścia w świat,
   - zero env/sekretów aplikacji w piaskownicy (żadnych kluczy AI/DB),
   - limity: vCPU/RAM minimalne + timeout pojedynczego biegu ≪ `maxDuration`
     trasy; przekroczenie = `runOk: false` z flagą, nigdy wiszący submit,
   - piaskownica jednorazowa — bez snapshotów/persystencji między studentami.
3. **Ukryte test-suites** (1.8): definicje testów per projekt żyją WYŁĄCZNIE
   server-side i są wstrzykiwane do piaskownicy przy biegu — student nigdy ich
   nie widzi (ani w repo projektu, ani w odpowiedzi API).
4. **Koszt pod budżetem 0.0**: licznik biegów per student/dzień (wzorzec
   rate-limit) + fail-closed przy braku budżetu; koszt Active CPU śledzony
   obok `ai_usage_ledger` (osobny scope, bo to nie tokeny LLM).
5. Za flagą (deploy ≠ release); `runOk` wpina się w krok 2/5 w zadaniu 1.9
   z zachowaniem fail-closed (awaria piaskownicy → flaga do człowieka, nie
   automatyczny verdict).

## Konsekwencje

- Zero nowych vendorów — sign-off dotyczył zgody na URUCHAMIANIE cudzego kodu
  i wyboru mechanizmu, nie nowej umowy powierzenia.
- 1.8 zaczyna się od spike'u wykonalności: czas zimnego startu + instalacja
  zależności DS (pandas/numpy) w budżecie czasu submitu; jeśli nie wejdzie —
  wracamy z opcją E2B jako ADR-012b (jawna ścieżka odwrotu).
- Wymaga tokenu Vercel API / OIDC dla SDK w env produkcyjnym (do listy env
  przy aktywacji flagi; NIE trafia do piaskownicy).
