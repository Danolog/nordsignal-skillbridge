# SESSION HANDOFF — SkillBridge AI

> Plik przekazania między sesjami. Sekcja **„STAN NA DZIŚ"** jest zastępowana co
> sesję (snapshot, nie log — historia w git). Nowa sesja czyta ten plik jako
> pierwszy i od razu wie, od czego zacząć.
>
> **Reguła twarda (wyciągnięta z awarii 2026-07):** handoff i commity lokalne
> trzeba **wypchnąć** (`git push`) na koniec sesji. Commit lokalny NIE przeżywa
> awarii sprzętu — poprzedni handoff i praca Fazy 1 przepadły, bo zostały na dysku
> maszyny, która padła.

---

## STAN NA DZIŚ — 2026-07-08

### Gdzie żyje repo
- **Lokalnie (2 maszyny):** macOS `~/Claude_Cowork/SkillBridge` · WSL
  `~/projekty/nordsignal-skillbridge`. Nie trzymać aktywnego repo pod iCloud.
- **Zdalnie:** `github.com/Danolog/nordsignal-skillbridge`, gałąź `main`.
- **Baseline:** `main` zielony — build, `tsc` 0, Biome 0, unit 957/957,
  integration 74/74 (stan po gałęzi AG.6).

### Faza 0 — ZAMKNIĘTA i wypchnięta
Zadania 0.0–0.16 zmergowane (ostatni: PR #125 „paczka LOW 0.15", 2026-07-04).
Dwie zaległości — **akcje Darka, nie kod:**
1. **0.7-sekret** — rotacja `GITHUB_TOKEN` na fine-grained public-read (prod).
2. **0.13 CSP** — ⚠ PR #121 (CSP enforce + drop `unsafe-eval`) został **zmergowany**
   mimo notki „nie merge'ować" — jest żywy na `main`/prod. Runtime CSP niewykrywalny
   lokalnie → **potwierdzić na Preview/prod, że nic nie psuje, albo rollback.**

### Faza 1 — W TOKU
Zrobione wcześniej (na `main`): **1.1 feature flags ✅ (#129)**, naprawa bramki
integration ✅ (#130), plan v2 + Blok AG ✅ (#128).

Zrobione tę sesję (WSL, 2026-07-07):
- **AG.0 — harness ewaluacyjny gap detection ⏳ PR #132 (czeka na review/merge)**.
  Korekta modelu (Darek): luki liczą się WYŁĄCZNIE z katalogu rynku minus
  zaznaczenia; sylabus = adnotacja bez wpływu → golden set BEZ sylabusów.
  Zakres: golden set 12 przypadków / 5 ścieżek (ręcznie zweryfikowane, w tym
  granice progu 0.33), suita deterministyczna (P/R=1.0, zawsze, bez LLM/DB),
  suita LLM-as-judge opisów `generate-why` (tylko `pnpm test:evals` + klucz),
  raporty z deltą vs `baseline.json`. Dowód red-green wykonany (próg 0.33→0.35
  wywala dokładnie sentinele graniczne).
  **Baseline LLM ✅ zmierzony i utrwalony** (klucz uzupełniony, 2 runy):
  avgOverall 4.0/5 na claude-sonnet-4-6, wszystkie kryteria 4/4 próbek; próg
  dociśnięty do 3.75 (`thresholds.ts`), baseline commitowany (`baseline.json`).
- **Poprawka uciętych opisów `generate-why` ✅** (znalezisko harnessu AG.0:
  ucięcia w 4/4 próbek + surowy markdown w UI, które renderuje czysty tekst).
  Fix: `maxOutputTokens` 400→700 + zakaz markdownu w prompcie. Delta evala
  zaraportowana zgodnie z DoD: avgOverall 4.0 → **5.0** (+1.0), baseline
  i próg (3.75→4.5) zaktualizowane.

- **1.0 — migracja modelu kariery JSON→DB ⏳ PR otwarty [CZERWONA LINIA]**.
  Zakres: migracja **0022** (`career_model_versions` — wersjonowany artefakt,
  content = dokładne bajty, sha256, jeden aktywny wiersz; GRANT SELECT + wpis
  K-PUB w rls-matrix v0.15 do sign-offu Ryana), flaga `careerModelFromDb`
  (off = zero zmian), loader z weryfikacją checksum i fallbackiem na statyczny
  JSON, ingest `pnpm db:ingest-career-model` (guard assertTestDb, idempotentny),
  preload w 4 wejściach serwerowych. **Test akceptacyjny zielony na lokalnej
  bazie: content z DB bajtowo identyczny z plikiem.** Integration 56/56.
  **Prod WYKONANE (Darek, 2026-07-07):** backup gałęzią Neona
  `prod-backup-pre-0022-20260707-154154` → migracja 0022 (dziennik zweryfikowany
  przed: 22 wpisy, prefiks zgodny) → ingest (snapshot 2026-02, sha256
  93f8c2c09023…). Weryfikacja na prodzie: 1 wiersz aktywny, content BAJTOWO
  identyczny z plikiem, GRANT-y OK. Zmergowane jako PR #134.
  **Weryfikacja Preview ✅ (2026-07-07):** gałąź weryfikacyjna z flagą ON —
  pełny onboarding w przeglądarce (rejestracja → DS → kompetencje → wnioski →
  analiza luk): grupy/opisy/kind z modelu, pokrycie 5% (1/21), luki 0 kryt /
  4 ważne / 16 nice — spójne z golden setem AG.0; zero błędów
  `career-model-loader` w logach runtime (fallback by je logował); dodatkowo
  dowód bezpośredni: loader z flagą ON na prod DB ładuje model (pokolenie 1).
  Konto testowe `test-weryfikacja-10@skillbridge-verify.pl` zostało w prod DB
  (do ew. skasowania). **FLAGA NA PRODZIE ON ✅ (Darek, 2026-07-07):**
  env production + redeploy (alias skill-bridge-ai-seven.vercel.app); smoke
  na prodzie: login + analiza luk z kontekstem grup, logi czyste (0 wpisów
  career-model-loader, same 200-tki). **Prod czyta model kariery z DB.**
  Rollback w każdej chwili: flaga off + redeploy.

- **AG.1 — weryfikator ugruntowania luk ✅ zmergowane (PR #135, 2026-07-07)**.
  Zakres: `src/lib/ai/verify-gaps.ts`
  (2 etapy: ugruntowanie deterministyczne w katalogu 0 LLM → agent-sędzia Haiku,
  fan-out `Promise.all`, tylko jednoznaczne YES weryfikuje; błąd sędziego = luka
  zostaje unverified — awaria nie obcina recall; koszt w `ai_usage_ledger`
  scope `verify-gaps.judge`), wpięcie w `generateGaps` za flagą **`gapVerifier`**
  (off = zero zmian; dotyczy tylko gałęzi legacy LLM — ścieżka deterministyczna
  z konstrukcji nie halucynuje; pusty rynek → przebieg pominięty). Dowód DoD:
  eval deterministyczny golden+3 zmyłki: precision **0.854→1.0**, recall 1.0;
  sędzia LLM 2 runy po 10/10 z pułapkami (Ruby on Rails/Power BI u DS, Kotlin
  u FE), zero fałszywych akceptacji; baseline utrwalony (`verifier`,
  `verifierJudge`), próg 0.9 + asercja falseAccepts=[]. Unit 915/915, build/tsc/
  Biome 0. **Flaga na żadnym środowisku jeszcze nie zapalona** (deploy ≠ release).

- **AG.3 — miesięczne odświeżanie rynku → STAGING ✅ zmergowane (PR #136,
  2026-07-07)**. Architektura
  UPLOAD-DRIVEN (decyzja Darka: automatyczne źródło nie istnieje — dane to ręczny
  eksport CSV JustJoinIT): `POST /api/market-refresh/ingest` (flaga
  `proactiveMarketRefresh` + sekret `MARKET_REFRESH_TOKEN`, limit body 8 MB
  per-trasa w middleware) przyjmuje oba CSV (.gz, gunzip po magic bytes, BOM
  zdejmowany) → TEN SAM silnik ETL (shim `src/lib/market-refresh/etl-core` →
  `tools/etl-justjoinit.ts`, zero przenoszenia kodu — prowenicja nienaruszona) →
  wipe+insert `job_market_data_staging` + wiersz `market_refresh_runs` (md5 obu
  CSV, liczniki, diff jsonb, bajty OBU artefaktów — wsad dla AG.4) w JEDNEJ tx.
  ZERO zapisu do `job_market_data` (integracja dowodzi bajt-w-bajt). Silnik diffu
  `src/lib/market-refresh/diff.ts` (nowe/zniknięte/zmienione ścieżki i kompetencje,
  delta p.p., sort po |delcie|). ⚠ Timeout ROZSTRZYGNIĘTY pomiarem: pełna skala
  zrzutu (9 922/49 610) = **~0,4 s** (`tests/unit/etl-scale.test.ts`) — chunking
  0.10 zbędny. Migracja **0023** (staging + runs; bez grantów dla ról — kuchnia
  operacyjna). Runbook: `docs/runbooks/market-refresh-runbook.md`. Bramki: tsc 0,
  Biome 0, unit 935/935, integration 59/59, build OK.
  **Kolejność wdrożenia:** merge BEZPIECZNY przed migracją prod (trasa za flagą
  off, schema-only w TS); migracja 0023 na prod + env (token, flaga) = akcje
  Darka PRZED pierwszym użyciem (runbook, sekcja „Wymagania wstępne").

Migracje: lokalne/test na **0023**; **prod na 0022** (0023 czeka na Darka przy
pierwszym użyciu AG.3 — patrz runbook).

### Plan v2 — ZAKTUALIZOWANY tę sesję
`.agents/plans/11-roadmap-fazy-0-3.md` — dopisany **Blok AG** (warstwa agentowa):
proaktywne odświeżanie rynku, deterministyczny recompute luk, powiadomienia „nowa
luka", doradca z pamięcią, harness ewaluacyjny gap detection. Zadania **AG.0–AG.7**.
Decyzje zablokowane (blindspot pass + interview, skill finding-unknowns):
- **Harmonogram:** Vercel Cron (NIE Claude Code Routines). Orkiestracja: Messages
  API + `Promise.all` (NIE Dynamic Workflows — to narzędzia dev, nie runtime prod).
- **Ingest rynku:** cron → STAGING + diff → **akceptacja Darka jednym tapnięciem** →
  transakcyjny swap (szanuje [CZERWONĄ LINIĘ]; auto-pobranie/recompute, ręczny swap).
- **Koszt:** recompute deterministyczny (~0 zł); LLM tylko na opis nowej luki (cache).
- **Managed Agents API:** odłożone (beta, nowa zależność) — Postgres jako pamięć.
- **Pamięć = Postgres**, reużycie: potok `src/lib/ai/pipeline/`, agent-sędzia z
  Pomocnika (`career-helper.ts`), ETL `tools/etl-justjoinit.ts`, `ai_usage_ledger`.

### NASTĘPNE (kolejność Fazy 1)
1. ~~AG.0 — harness ewaluacyjny~~ ✅ zmergowane (#132) + baseline LLM utrwalony.
2. ~~1.1 feature flags~~ ✅ zrobione (#129).
3. ~~1.0 — migracja kariery JSON→DB~~ ✅ LIVE na prodzie (#134, flaga ON).
4. ~~AG.1 — weryfikator luk~~ ✅ **DOMKNIĘTE** (zmergowane #135; flaga zapalona
   decyzją Darka 2026-07-07: `FLAG_GAP_VERIFIER=1` Preview+Production + redeploy
   prod, smoke czysty). **Dowód runtime wykonany E2E na żywych modelach**
   (lokalna baza testowa 5433, zero zapisów na prod): flaga OFF → 1 wpis
   generate-gaps, 0 wywołań sędziego (zachowanie sprzed AG.1); flaga ON →
   weryfikator biegnie: 18/18 luk Sonneta ugruntowanych deterministycznie
   w katalogu (0 kosztu LLM — optymalnie), a żywy sędzia Haiku odrzucił
   halucynację „Kowalstwo artystyczne" z poprawnym uzasadnieniem i wpisem
   w `ai_usage_ledger` (verify-gaps.judge, $0.0014, success=t); pozycja
   katalogowa „MS Excel" zweryfikowana za darmo (method=catalog).
   Uwaga operacyjna: zmienne env projektu są typu *sensitive* — `vercel env
   pull` pokazuje `""` dla wszystkich (także działającej
   FLAG_CAREER_MODEL_FROM_DB); to artefakt pulla, nie stan flagi.
5. **[ZMIANA — decyzje Darka 2026-07-07]** AG.2 przekwalifikowane: usunięcie
   gałęzi legacy LLM luk (POST /api/onboarding kontrakt stringów +
   `generate-gaps.ts`; `verify-gaps.ts` zostaje jako klocek reużywalny).
   AG.3: cron **RAZ W MIESIĄCU** (nie co tydzień). Szczegóły w roadmapie
   (adnotacje [ZMIANA] przy AG.2/AG.3).
6. ~~AG.3~~ ✅ zmergowane (#136). Do PIERWSZEGO użycia potrzebne akcje Darka
   (bez pośpiechu — trasa martwa przy zgaszonej fladze): migracja 0023 na prod +
   `MARKET_REFRESH_TOKEN` + `FLAG_PROACTIVE_MARKET_REFRESH` (runbook
   market-refresh). Do review PR-a przypięty sign-off Ryana rls-matrix v0.16.
7. ~~AG.2 / AG.4 / AG.7~~ ✅ **WSZYSTKIE ZMERGOWANE (decyzja Darka „merge
   wszystkie trzy", 2026-07-07):** #137 (AG.2 kasacja legacy), #138 (AG.4
   bramka akceptacji + swap), #139 (AG.7 pamięć doradcy — agent równoległy,
   worktree posprzątany). Po drodze: świeże KRYTYCZNE advisory better-auth
   <1.6.11 (replay refresh-tokenów OAuth w pluginach oidc/mcp, których NIE
   używamy) zablokowało deps-scan → **#140 bump better-auth 1.5.4→1.6.23**
   (+ overrides sso/core 1.6.23) zmergowany między nimi; konflikt rls-matrix
   #138↔#139 scalony do **v0.18** z oboma changelogami (v0.17 AG.4 + v0.18
   AG.7 — oba do sign-offu Ryana). Osierocony env `FLAG_GAP_VERIFIER` usunięty
   z Vercela (Preview+Production). **Weryfikacja SCALONEGO main:** tsc 0,
   Biome 0, unit 938/938, integration 65/65 + k3-validate zielony, build OK;
   smoke prod 200-tki. Migracje: lokalna-test na **0024**; prod na **0022**
   (0023 czeka przy pierwszym użyciu AG.3/AG.4; **0024 przed zapaleniem
   `FLAG_ADVISOR_MEMORY`**).
8. ~~AG.5~~ ✅ **zmergowane (#142, decyzja Darka „merge", 2026-07-08)**.
   Migracja **0025** (`market_new_gap_events` — zdarzenia „rynek
   zaczął wymagać X" dla AG.6, RLS wzorem 0024 z grantem TYLKO SELECT dla
   studenta; + `market_refresh_runs.recompute` jsonb). Moduł
   `src/lib/market-refresh/recompute.ts`: deriveGaps per student (zbiory,
   0 LLM), **carry-over cache'u `why_important`** dla luk, które przetrwały,
   **memo opisów między studentami** (1 unikalna nowa luka = 1 wywołanie LLM
   niezależnie od liczby studentów; wstrzykiwalny describe), zdarzenia +
   odświeżenie mapy (deterministyczne) + pokrycie paszportu; błąd per student
   nie wywraca przebiegu. Wyzwalacz: decision route po commicie swapu
   (best-effort, `recomputeFailed` + retry) + ręczny
   `POST /api/market-refresh/recompute` (idempotentny właz naprawczy).
   DoD dowiedzione integracyjnie (describe-stub): nowa kompetencja w katalogu →
   dokładnie 1 opis + 1 zdarzenie + priorytet względny OK; cache starej luki
   PRZENIESIONY; drugi przebieg = 0 LLM, 0 zdarzeń; węzeł nowej luki na mapie.
   Przy okazji domknięty dryf z raportu AG.7: `career_helper_*`/
   `student_career_paths` w TENANT_TABLES + rls-matrix **v0.19** (sign-off
   Ryana przy review). Bramki: tsc 0, Biome 0, unit 941/941, integration
   68/68 + k3 zielony, build OK. **Przed pierwszym realnym przebiegiem na
   prod: migracja 0025** (razem z 0023/0024 w jednej sesji migracyjnej Darka).
9. **AG.6 — powiadomienie „nowa luka" ⏳ PR otwarty (ostatnie zadanie Bloku
   AG)**. Decyzje Darka 2026-07-08: kanał **in-app** (bez e-maila — zero nowych
   usług zewnętrznych), RODO **opt-in checkbox** (bez zgody recompute działa,
   powiadomienia się nie pokazują; zgoda odwoływalna). Zakres: migracja **0026**
   (kolumny zgody na `students`, bez zmian RLS), flaga
   `FLAG_MARKET_GAP_NOTIFICATIONS` (osobna od potoku rynku — release UI
   niezależny), `src/lib/market-notifications.ts` (odczyt zdarzeń jako
   app_student przez withTenantContext), trasy POST
   `/api/market-notifications/{consent,read}` (sesja Better Auth; zapisy
   owner-side zgodnie z zapowiedzią w 0025), komponent `MarketGapNotifications`
   na dashboardzie (karta zgody → lista „Rynek zaczął wymagać: X" → mark-read;
   bez lustrzanego stanu — POST + router.refresh). DoD dowiedzione integracyjnie
   na realnej bazie: zmiana rynku → zdarzenie i powiadomienie WYŁĄCZNIE u
   dotkniętego studenta; bramkowanie zgodą; mark-read → `notified_at`, drugi
   odczyt pusty; wycofanie zgody chowa; flaga off = feature nie istnieje
   (ogniwo swap→recompute dowiedzione suitami AG.4/AG.5 + unit wiring).
   Bramki: tsc 0, Biome 0, unit 957/957, integration 74/74 + k3 zielony,
   BUILD_OK. **Przed zapaleniem flagi na prod: migracja 0026** (razem z
   0023/0024/0025 w jednej sesji migracyjnej Darka).
10. Po merge AG.6: **bramka wyjścia Bloku AG** (przegląd: jakość zmierzona AG.0,
   weryfikator AG.1, rynek cykliczny AG.3/AG.4, recompute AG.5, powiadomienia
   AG.6, pamięć doradcy AG.7, koszt per student w `ai_usage_ledger` vs P&L).

### Otwarte zaległości (akcje Darka, nie kod)
- **0.7-sekret** — rotacja `GITHUB_TOKEN` (prod).
- **0.13 CSP** — potwierdzić #121 na Preview/prod albo rollback.
- **Baza testowa integration** — stawiana ad-hoc (Docker Postgres 5433 +
  `db:migrate:test`); brak stałego `.env.test`/compose. Rozważyć utrwalenie, żeby
  `pnpm test:integration` dało się odpalić lokalnie bez ręcznego setupu.

### Ostrzeżenia / kontekst dla nowej sesji
- **Tryb Wykonawca/Audytor PORZUCONY NA ZAWSZE** (decyzja Darka 2026-07-07) —
  jeden agent implementuje i weryfikuje, niezależnie od modelu. Autonomia
  merge/deploy bez zmian; self-merge PR-ów bywa blokowany przez klasyfikator
  (wtedy merge klika Darek).
- „Partie 0–5" w starszych handoffach to tor **10 poprawek**, NIE partie treści B3
  ani fazy 0–3 z roadmapy — nie mylić numeracji.
- Ingest na prod = [CZERWONA LINIA]: sign-off + backup + transakcyjny SQL
  (wzorzec `job_market_data_bak`/`students_bak`, ADR-009/010).
- Limit czasu funkcji Vercela może nie unieść długiego ETL w AG.3 — sprawdzić
  wcześnie (podział na chunki, wzorzec 0.10).

---

## Konwencja pliku
- Aktualizuj **tylko** sekcję „STAN NA DZIŚ" (zastąp snapshotem), datę w nagłówku.
- Commituj selektywnie (sam ten plik) i **push** na koniec sesji.
- Historia poprzednich stanów: `git log -- docs/SESSION_HANDOFF.md`.
