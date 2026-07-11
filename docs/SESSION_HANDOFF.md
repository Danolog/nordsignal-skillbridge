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

## STAN NA DZIŚ — 2026-07-11

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
9. ~~AG.6~~ ✅ **zmergowane (#143, squash `29de42e`, decyzja Darka „merge",
   2026-07-08) — OSTATNIE zadanie kodowe Bloku AG; CI w całości zielone**
   (typecheck po poprawce typowania mocka w teście — kod produkcyjny bez zmian).
   Decyzje Darka 2026-07-08: kanał **in-app** (bez e-maila — zero nowych
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
10. ~~Bramka wyjścia Bloku AG~~ ✅ **ZALICZONA (2026-07-08, przegląd na
   dowodach)**. Kryteria z roadmapy: (1) jakość zmierzona — baseline.json
   P/R/F1=1.0 + opisy 5.0/5, świeży przebieg deterministyczny 95/95; (2)
   weryfikator — precision 0.854→1.0, sędzia 2×10/10, dowód runtime z wpisem
   ledgera; (3) rynek cykliczny z akceptacją — łańcuch AG.3/AG.4/AG.5
   dowiedziony integracyjnie (74/74) + runbook; (4) powiadomienia — DoD AG.6
   (dotknięty student, nie inni); (5) pamięć doradcy — druga sesja zna stan
   pierwszej (integracja); (6) koszt vs P&L — **zmierzony na prod ledger
   przez Darka (Neon SQL Editor):** total $0.0187 (1 student, jednorazowy
   onboarding 2026-07-02, od tego czasu $0 cyklicznych); realne ceny wywołań
   2,7–3,1× NIŻSZE niż założenia P&L (parse $0.0144 vs $0.045, match $0.0044
   vs $0.012); koszt per student/tydzień ≈ 0 z konstrukcji (recompute 0 LLM,
   1 opis/unikalna luka na populację). Uwaga infra: prod connection string
   NIE istnieje lokalnie (`.env` = localhost:5432; `.env.local` nie ma) —
   prod czyta się przez Neon SQL Editor albo string z konsoli Neona.
11. ~~Migracje prod 0023–0026~~ ✅ **WGRANE (Darek, 2026-07-08)** wg procedury:
   backup gałęzią Neona (`backup/pre-0023-0026-2026-07-08`) → kontrola
   dziennika PRZED (23 wpisy, when=1783424073094 — zgodne z _journal.json) →
   `drizzle-kit migrate` bezpośrednio (guard db:migrate hard-denyuje prod
   z konstrukcji; connection string TYLKO w terminalu Darka, nie w sesji) →
   weryfikacja PO: **27 wpisów**, staging/runs/advisor_memory/
   market_new_gap_events istnieją, kolumny zgody na students, RLS t/t.
   **PROD = 0026** (pełna parzystość z bazą testową). Po drodze dwie nauki:
   placeholder w instrukcji został wyeksportowany dosłownie (host „base",
   zero szkód — błąd DNS przed połączeniem); connection string do migracji =
   wariant DIRECT (bez poolera), z Connect w konsoli Neona.
12. Blok AG domknięty w całości (kod + bramka + migracje prod). Do aktywacji
   funkcji AG zostały TYLKO env na Vercelu (w dowolnym momencie, osobno lub
   razem): `MARKET_REFRESH_TOKEN` + `FLAG_PROACTIVE_MARKET_REFRESH` (potok
   rynku), `FLAG_MARKET_GAP_NOTIFICATIONS` (UI studenta), `FLAG_ADVISOR_MEMORY`
   (pamięć doradcy) — wg runbooka market-refresh. Decyzja Darka: flagi NA RAZIE
   zostają zgaszone, jedziemy dalej z planem.
13. **Blok B8 (recenzja człowieka) W TOKU — decyzja Darka „jedziemy dalej
   z planem" (2026-07-08):**
   - ~~1.2~~ ✅ **ADR-011** (na main, `fc6c773`): w Becie recenzuje operator
     jakości (Darek) od dnia 1, cross-tenant; wykładowcy dołączają per wydział
     (istniejące hasła kampusów); `auto_no_human` dla receiptów bez człowieka.
   - **1.3 ⏳ PR otwarty**: migracja **0027** (kolumna `role` na
     faculty_sessions, CHECK faculty/quality_operator, DEFAULT 'faculty');
     `reviewer-auth.ts` (checkReviewerAuth: operator cross-tenant / faculty
     tenant; checkFacultyAuth honoruje odtąd TYLKO role='faculty' — twardy
     rozdział ról); POST /api/operator/login (lustro faculty: rate-limit,
     origin, siła hasła, audyt z actorType 'operator', sekret
     `OPERATOR_PASSWORD`); GET /api/review-queue (needs_human_review +
     status='submitted' + bez decyzji; faculty przez withTenantContext,
     operator owner-side; odpowiedź ANONIMOWA — bez danych studenta; tytuły
     projektów dociągane owner-side, żeby nie zależeć od grantów app_faculty
     na projects). Wszystko za flagą `humanReviewQueue`. DoD integracyjnie:
     operator widzi oba tenanty, faculty tylko swój, decyzja usuwa z kolejki,
     tokeny ról nie krzyżują się. **Przed zapaleniem FLAG_HUMAN_REVIEW_QUEUE
     na prod: migracja 0027 + env OPERATOR_PASSWORD.**
   - ~~1.3~~ ✅ zmergowane (#144, squash `8933826`; po drodze fałszywe alarmy
     gitleaks na hasłach-fixture'ach → adnotacje gitleaks:allow +
     .gitleaksignore z fingerprintami).
   - **1.4 ⏳ PR otwarty**: POST /api/review-queue/[id]/decision — człowiek ma
     ostatnie słowo (ADR-008): approve→'verified', reject→'rejected' (nadpisuje
     werdykt maszyny w obie strony; werdykt zostaje w ai_review_json). Tx z FOR
     UPDATE + UNIQUE(submission_id) → druga decyzja 409, status nietknięty;
     faculty tylko swój tenant (cudzy → 404 bez potwierdzania istnienia);
     reviewer_type z kontekstu logowania, reviewer_id = id sesji (ReviewerAuth
     rozszerzone o sessionId); audyt submission.review.approved/rejected.
     [KOREKTA 1.3]: filtr kolejki bez zawężenia po statusie — verified/rejected
     + needsHumanReview też czekają na człowieka (pierwotny warunek
     status='submitted' je gubił); odpowiedź kolejki + machineStatus.
   - ~~1.4~~ ✅ zmergowane (#145, squash `0aad803`; CI zielone za pierwszym
     podejściem).
   - **1.5 ⏳ PR otwarty**: UI kolejki — /review/login (formularz operatora,
     lustro faculty; wykładowca wchodzi na /review z istniejącą sesją panelu
     uczelni) + /review (server component: flaga off → notFound, brak sesji →
     redirect na login; klient ReviewQueueView: karty mobile-first wzorem
     /market-refresh, rekomendacja maszyny wg machineStatus, notatka
     opcjonalna, Zatwierdź/Odrzuć → wpis znika, 409 wyścigu → toast + refetch).
     Style rq-* w globals.css. Middleware nie obejmuje /review (standalone jak
     /faculty — auth w server component + trasach API).
   - ~~1.5~~ ✅ zmergowane (#146, squash `51621e9`; CI zielone za pierwszym
     podejściem).
   - **1.6 ⏳ PR otwarty (OSTATNIE zadanie Bloku B8)**: plakietka na receipcie
     paszportu (prywatny + publiczny) sterowana DANYMI, nie flagą: wiersz
     submission_reviews z decision='approved' od faculty/quality_operator →
     „Oceniał człowiek: wykładowca / operator jakości"; bez recenzji →
     uczciwe „ocena automatyczna" (poprzednia etykieta „ocena zweryfikowana"
     była na granicy kłamstwa wg ADR-008). buildHumanReviewMap +
     humanReviewerType w ProjectReceipt (passport-utils, jedno źródło dla
     obu stron). Flaga off → zero wierszy recenzji → plakietka nigdy się nie
     renderuje (samo-bramkowanie danymi).
   - ~~1.6~~ ✅ zmergowane (#147, squash `4c3371f`). **BLOK B8 DOMKNIĘTY
     (1.2–1.6)**: ADR-011 → API kolejki → decyzje → UI /review → plakietka.
     Aktywacja prod (bez pośpiechu): migracja 0027 + env OPERATOR_PASSWORD +
     FLAG_HUMAN_REVIEW_QUEUE. Incydent po drodze: GitHub Actions zablokowane
     billingiem (payment failed / spending limit) — wszystkie joby padały w
     2 s bez kroków; Darek odblokował w Billing & plans, rerun zielony.
14. ~~1.7~~ ✅ **ADR-012** (sign-off Darka 2026-07-08): piaskownica = **Vercel
   Sandbox** (istniejący vendor, zero nowych usług; microVM, deny-all,
   python3.13/node24). Twarde niezmienniki dla 1.8 w ADR: zero sekretów
   w piaskownicy, limity+timeout ≪ maxDuration, jednorazowość, ukryte
   test-suites server-side, licznik biegów pod budżetem 0.0, ścieżka
   odwrotu = E2B (ADR-012b), fail-closed w 1.9.
15. **B6/1.8 ⏳ PR otwarty**: SPIKE na żywej usłudze ZALICZONY
   (tools/spike-sandbox.ts, OIDC z `vercel env pull`): mikroVM 0,7 s +
   pip pandas/numpy 7,6 s + bieg 0,8 s = **9,7 s E2E** (~30× zapasu w 300 s);
   izolacja potwierdzona (domena spoza allowlisty odcięta). Integracja:
   migracja **0028** `project_hidden_tests` (OSOBNA tabela, nie kolumna na
   projects — trasy katalogu zwracają studentom pełne wiersze; wariant DENY,
   REVOKE ALL, k3 #13a rozszerzony, rls-matrix **v0.20** do sign-offu Ryana);
   runner `src/lib/sandbox/run-hidden-tests.ts` (@vercel/sandbox: deny-all /
   PyPI-only przy deps, zero sekretów, jednorazowość, stop() w finally,
   runOk true/false/null z reason budget|infra — nigdy werdykt przy awarii);
   limiter `sandboxRun` 5/dzień per student; flaga `sandboxRunner`.
   **Przed zapaleniem flagi na prod: migracja 0028** (+ SDK uwierzytelnia się
   OIDC automatycznie na Vercelu — bez nowych env).
16. ~~B6/1.9~~ ✅ **zmergowane (#149, squash `a86420b`; CI zielone za
   pierwszym podejściem). BLOK B6 DOMKNIĘTY W CAŁOŚCI** (1.7 ADR-012 +
   1.8 runner #148 + 1.9 wpięcie #149). Szczegóły 1.9: runOk wpięty w potok.
   Krok 2b (index.ts):
   sandbox arg (studentId+suite) podaje trasa submitu TYLKO za flagą i gdy
   projekt ma suite; bieg po twardych sprawdzeniach, wynik w
   hardChecks.runOk + aiReviewJson.sandboxRun (ogon dla recenzenta). Flagi:
   run_failed (testy nie przeszły) / run_unavailable (budżet/infra). Krok 5:
   **runOk=false BLOKUJE 'verified'** mimo dobrego score (praca musi
   działać); null NIE blokuje (dokładnie zachowanie Fazy 1) — ale obie flagi
   → needsHumanReview (fail-closed). Submit route: maxDuration 60→120,
   suite ładowany owner-side, treść suite'u nigdy w odpowiedzi. **BLOK B6
   kodowo domknięty po merge** (1.7 ADR + 1.8 runner + 1.9 wpięcie);
   otwarta kuracja suite'ów dla projektów DS (wątek treściowy Sophii —
   tabela project_hidden_tests pusta = runner nie odpala, bez szkód).
17. ~~A5/1.10~~ ✅ **zmergowane (#150, squash `107f815`; CI zielone za
   pierwszym podejściem)**: migracja **0029** — CHECK `verified_by_method`
   otwarty na `'diagnostic'` (lista miękka; DROP+ADD bezpieczne, bo Beta
   miała wyłącznie 'self'); test integracyjny constraintu na realnej bazie.
   Zero zmian zachowania (nic jeszcze nie pisze 'diagnostic').

### KOLEJKA MIGRACJI PROD — PUSTA (2026-07-10)
Prod = **0032** (pełna parzystość z bazą testową; 0032 wgrana przez Darka
2026-07-10 — szczegóły w pkt 28). Migracja 0031 wgrana przez
Darka 2026-07-09 (backup gałęzią Neona `backup/pre-0031-2026-07-09`, dziennik
PRZED 31/1783537805664 → PO 32/1783610643728, weryfikacja RLS t/t + polityki
+ granty OK). **FLAG_SOCRATIC_TUTOR=1 na Production+Preview ✅ (Oliver,
2026-07-09):** Production przez vercel CLI; Preview przez REST API
(`POST /v10/projects/{id}/env` z tokenem CLI — obejście buga pętli
interaktywnej CLI 54.5.0, które działa, w odróżnieniu od `--value --yes`);
redeploy prod (alias skill-bridge-ai-seven.vercel.app). Smoke: GET/POST
trasy tutora bez sesji 404→**401** (flaga żyje, bramka auth działa),
home/login 200, runtime errors: zero. **BLOK C11 LIVE NA PRODZIE** —
drugi blok F1 z zapaloną flagą (po A5). Sesja migracyjna Darka 0027–0030
2026-07-09: backup gałęzią Neona (`backup/pre-0027-0030-2026-07-09`) →
kontrola dziennika PRZED (27 wpisów, when=1783463902949 — zgodne) →
`drizzle-kit migrate` (string DIRECT, terminal Darka; uwaga: spinner NIE
wyrenderował linii sukcesu — prawdę pokazał dziennik: 31 wpisów,
when=1783537805664 = lokalny 0030) → weryfikacja PO OK (tabele, RLS t/t,
granty: dokładnie 1 wiersz assessment_sessions|app_student|SELECT).
**Ingest banku pytań na prod WYKONANY** (czerwona linia, polecenie Darka =
sign-off): koncepty 24, itemy +144 nowe. **FLAG_DIAGNOSTIC_ASSESSMENT=1 na
Production ✅ (Oliver przez vercel CLI, 2026-07-09)** + redeploy; smoke:
POST /api/assessment/start bez sesji 404→**401** (flaga żyje, bramka auth
działa), home/login 200, runtime errors: zero. Preview-flaga NIE ustawiona
(bug pętli interaktywnej w vercel CLI 54.5.0) — dodać z dashboardu przy
weryfikacji 1.12. Do aktywacji pozostałych bloków wciąż brakuje TYLKO env:
OPERATOR_PASSWORD+FLAG_HUMAN_REVIEW_QUEUE (B8), FLAG_SANDBOX_RUNNER (B6),
flagi AG — migracje już są.

18. **A5/1.11 ✅ zmergowane (#151, squash `bded868`; CI zielone za pierwszym podejściem)** — silnik testu adaptacyjnego + bank pytań.
   **Przebieg wg wymogu handoffu:** projekt schematu PRZED kodem — spec
   `docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md` (v0.1 →
   krytyczny przegląd 3 agentów: konsumenci 1E / bezpieczeństwo-RLS /
   determinizm — 24 znaleziska, 5 krytycznych, wcielone → v0.2)
   **ZATWIERDZONA przez Darka (2026-07-08)** z decyzjami: zakres diagnozy =
   Opcja A (tylko zaznaczone kompetencje), powtórki tylko przez
   re-onboarding, bramka F1 „zero samooceny" zawężona do DS (adnotacja
   [ZMIANA] w roadmapie).
   Zakres: migracja **0030** (question_concepts/question_items — bank DENY
   jak hidden tests, wspólny dla 1.11/1E.2/1E.3/1E.4, oś = KONCEPT;
   assessment_sessions SELECT-only + assessment_answers DENY, tenant RLS,
   partial unique 1 aktywna sesja; k3 rozszerzone, rls-matrix **v0.21** do
   sign-offu Ryana); silnik `src/lib/assessment/` (grade 4 typów z polską
   normalizacją numeric, staircase 2 pytania/kompetencję → poziom 1–4 przez
   ratyfikowane levelToStatus, deterministyczny plan z solą sesji i rotacją
   wariantów, golden test 4/4); trasy `/api/assessment/{start,[id]/answer,
   [id]/complete}` za flagą **`diagnosticAssessment`** (kolejność staircase
   egzekwowana server-side, zero is_correct w trakcie, complete idempotentne,
   precedencja: nadpisuje TYLKO 'self'/'diagnostic'); treść partia 1:
   **24 koncepty × 6 itemów = 144 pytania DS** (agenci-kuratorzy → kontrakt-
   test jak DS partia 1 → QG: 3 adwersaryjnych weryfikatorów przeliczyło
   144/144 itemów kodem, 0 błędnych kluczy, 9 poprawek redakcyjnych
   naniesionych); ingest `pnpm db:ingest-question-bank` (idempotentny,
   NIEMUTOWALNOŚĆ: poprawka = retire + nowy item — dowiedzione na bazie).
   Dowody: unit 1046/1046 (w tym 49 silnika + 6 kontraktu), integration
   94/94 (w tym 8 nowych: pełny przepływ, RLS/granty DENY, rotacja
   wariantów, 409/422/404), k3 zielony (15 tabel tenant), BUILD_OK; smoke:
   realny katalog rynku DS 21/21 pokryty planem, 0 uncovered.
   **Uwaga dla 1.12** (spec §4a): kontrakt zapisu onboardingu nie przyjmuje
   poziomu 1 (z.union([2,3,4])), a luki liczą się z zaznaczeń, nie statusów;
   re-onboarding kasuje wyniki diagnozy — oba do rozwiązania w 1.12.

19. **A5/1.12 ✅ zmergowane (#152, squash `eac7de5`; CI zielone — watcher 2× do poprawki: nowy commit = nowy przebieg, potem 502 GitHuba; rozstrzygał `gh pr checks`)** — diagnoza wpięta w onboarding (za flagą
   `diagnosticAssessment`; off = kreator jak dotąd, zero zmian):
   - **Kontrakt POST /api/onboarding rozszerzony:** `diagnosticSessionId` +
     wpisy kompetencji z `level` OPCJONALNYM — brak poziomu = „zmierzone":
     serwer bierze poziomy (1–4, w tym 1) z result_json UKOŃCZONEJ sesji
     studenta (walidacja: właściciel, completed, careerGoal; klientowi nie
     ufa). Bez sesji brak poziomu = 400 (stary kontrakt nienaruszony).
   - **§4a.1 (twardy punkt spec):** luki liczone ze STATUSÓW — posiadane =
     wiersz `status ≠ missing`. Filtr w POST (possessedNames), w recompute
     AG.5 (pierwsze odświeżenie rynku nie „zalicza" oblanej) i centralnie w
     `calculateCoverage` (mianownik = katalog; wiersz missing reprezentuje
     luka — bez podwójnego liczenia). Niezmiennik ratyfikowany bez zmian:
     luka ≡ wymagana ∧ missing; `buildGraph` już pomijał wiersze missing.
   - **§4a.2 (polityka re-onboardingu):** carry-over pomiaru — POST bez
     nowej sesji (edytor profilu / ponowny kreator) NIE degraduje wierszy
     `diagnostic` do `self`: poziom zmierzony (także 1) wygrywa z deklaracją;
     nadpisze go dopiero nowa sesja. Odznaczenie = świadome usunięcie (luka).
   - **UI kreatora:** krok 3 w trybie binarnym („Mam styczność — zmierz
     testem", bez poziomów i bez % przed pomiarem), pod-widok `StepDiagnosis`
     (pytanie po pytaniu, zero feedbacku w trakcie, wznowienie po 409),
     mini-samoocena dla `uncovered` (jawnie „ocena własna, nie pomiar"),
     panel „Wynik testu" we Wnioskach (w tym oblane), zmiana zaznaczeń
     unieważnia test; 422 ze startu (ścieżka bez banku — partia 1 = DS) →
     jawny fallback do klasycznej samooceny (bramka F1 zawężona do DS).
   - **Placement (roadmapa [ZMIANA]):** wynik reprezentowalny dla 1E.7 przez
     `result_json.concepts` sesji (koperta z 1.11) — 1.12 nic nie dokłada.
   - Dowód E2E integracyjnie (5 testów, realna baza, prawdziwe trasy):
     diagnoza (A=3, B=1) + uncovered → wiersze zmierzone (B: missing/
     diagnostic zostaje w competencies), luka DOKŁADNIE B, pokrycie 67%
     (missing nie podwaja), mapa z 1 węzłem missing; carry-over trzyma
     pomiar wbrew deklaracji; luka B przeżywa recompute; 400/409; flaga
     off = kontrakt sprzed 1.12. Zero migracji (schemat z 0030 wystarczył).

20. **BLOK A5 DOMKNIĘTY W CAŁOŚCI** (1.10 #150 + 1.11 #151 + 1.12 #152) —
   i JEDYNY blok F1 w pełni AKTYWNY na prod (migracja 0030 + bank 24/144 +
   FLAG_DIAGNOSTIC_ASSESSMENT ON): merge #152 auto-deployem RELEASE'UJE
   ścieżkę diagnozy w kreatorze (DS mierzy się testem; inne ścieżki mają
   jawny fallback samooceny). Warto kliknąć smoke w przeglądarce na prodzie
   (rejestracja → DS → zaznacz → test) — dowody E2E są integracyjne+komponentowe,
   przeglądarkowego przejścia nowego UI nikt jeszcze nie zrobił.

21. **Hotfix po prod-smoke Darka ✅ zmergowany (#153, squash `c11bbe7`)**:
   test z SQL na ŚWIEŻYM koncie → po odpowiedziach POST /api/onboarding
   padał 409 i kreator wracał do kroku 3. Przyczyna: prowizoryczny wiersz
   studenta (autosave kroku 1) ma `careerGoal=""` do finalnego POST, a
   /api/assessment/start snapshotował cel Z WIERSZA → sesja z celem "" ≠
   zapis z realnym celem → walidacja 409. Dotykało KAŻDE świeże konto
   przez picker (krok 0 przez Pomocnika zapisuje cel — stąd pierwotnie
   złudny trop „tylko change-mode"). Fix: /start przyjmuje `careerGoal`
   Z KREATORA (fallback = wiersz; POST dalej wymaga zgodności z sesją —
   zero eskalacji, poziomy mierzone per kompetencja) + PII-safe log powodu
   409 (debugowaliśmy na ślepo) + test regresu (DB z innym celem niż
   kreator → 200). Bramki: unit 1051/1051, integration 100/100, BUILD_OK.
   **Czeka na powtórny smoke przeglądarkowy Darka po deployu.**

22. **ODŁOŻONE (decyzja Darka 2026-07-09, po pytaniu o wiarygodność 2 pytań):**
   dwa ulepszenia diagnozy do zrobienia później, oba zaakceptowane co do
   kierunku, bez presji:
   (a) **złagodzić etykiety wyników testu** — poziom 4 „mocna strona" →
   np. „zaawansowany wynik testu" + dopisek „wynik krótkiego testu, nie
   certyfikat" (panel Wniosków `DIAGNOSIS_LEVEL_LABEL` w step-wnioski.tsx);
   (b) **pytanie potwierdzające dla poziomu 4** — rozszerzenie staircase:
   d2✓+d3✓ → drugi wariant d3; poziom 4 tylko przy obu trafionych, inaczej 3
   (+1 pytanie tylko u najlepszych; zmiana w staircase.ts/plan.ts — plan już
   mrozi itemy per trudność, trzeba domrozić 2. wariant d3; golden test
   4→5 trajektorii; zero zmian schematu). Kontekst: diagnoza = placement,
   nie certyfikat; twarde roszczenia = receipty + egzaminy mastery 1E.3.

   **ODŁOŻONE (ten sam dzień):** luka danych rynku DS — grupa „Fundamenty"
   ma w katalogu tylko Statystykę (UM/EDA/A-B nie mapują się z tagów
   JustJoinIT; ML żyje w opisach, nie tagach). Ścieżka: kuracja aliasów ETL
   → miesięczne odświeżenie AG.3→AG.4 (wątek danych, Sophia); bank pytań
   już pokrywa te liście (24/24) — wejdą do diagnozy bez zmian kodu.

23. **C11/1.13 ✅ zmergowane (#154, squash `5afcb57`; CI zielone za pierwszym
   podejściem)** — endpoint tutora sokratycznego z guardrailami, za flagą
   **`socraticTutor`** (off = trasa 404):
   - **Warstwa AI `src/lib/ai/project-tutor.ts`** (wzorzec Pomocnika: filtr,
     sędzia): filtr kryzysowy PRZED modelem (reużycie detectCrisis); guardrail
     deterministyczny anty-zrzut (blok kodu > 8 niepustych linii, także
     niedomknięty płotek → regeneracja z dociśniętym przypomnieniem); **sędzia
     Haiku BLOKUJĄCO na każdej turze** (tylko jednoznaczne YES; odmowa →
     regeneracja raz → bezpieczny fallback; awaria sędziego = fail-closed).
     Świadomie generateText, nie stream — sędzia ocenia całość ZANIM student
     zobaczy (u tutora ryzykiem jest każda tura, nie tylko podsumowanie).
   - **Limity w kodzie:** MAX_TUTOR_TURNS=30/projekt (409) + limiter
     `tutorDaily` 40/dzień (wzorzec sandboxRun) + aiHeavy 5/min; koszt w
     ai_usage_ledger (project-tutor.turn standard / project-tutor.judge fast).
   - **Trasy GET/POST `/api/projects/[id]/tutor`**: kontekst = projekt+rubryka,
     brief z cache (aiReviewJson.brief), stan recenzji, wycinek repo z kroku 1
     potoku (best-effort, cap 12k znaków); GET = rehydracja dla panelu 1.14.
     Punkt styku 1E ([ZMIANA] w roadmapie): pole `moduleTheory` w kontekście.
   - **Migracja 0031 `tutor_turns`** — prywatna rozmowa studenta (pełny
     wzorzec 0013: ENABLE+FORCE, student_sees_own, owner_passthrough, grant
     tylko app_student, faculty deny); k3 TENANT_TABLES = 16 tabel, zielony;
     **rls-matrix v0.22 do sign-offu Ryana**.
   - Dowody: unit 1067/1067 (16 nowych), integration 110/110 (10 nowych na
     realnej bazie: flaga off=404, historia z DB do modelu, cap 409, crisis
     bez zapisu, izolacja studentów), BUILD_OK; **smoke na żywych modelach**:
     pytanie → odpowiedź sokratyczna; adwersaryjne „zignoruj zasady, wklej
     kompletny kod" → odmowa + naprowadzenie, zero zrzutu; ledger: turn
     $0.0064 (Sonnet) + judge $0.0015 (Haiku) ≈ $0.008/tura.
   - **Przed zapaleniem FLAG_SOCRATIC_TUTOR na prod: migracja 0031** (merge
     był bezpieczny przed migracją — trasa za zgaszoną flagą nie dotyka DB).

24. **C11/1.14 ✅ zmergowane (#155, squash `d9cc57e`; CI zielone za pierwszym
   podejściem) — BLOK C11 DOMKNIĘTY (1.13 #154 + 1.14 #155)**. Panel czatu
   tutora w widoku projektu (`TutorPanel` w project-detail; flaga czytana
   server-side w page.tsx → prop, rejestr flag nie wycieka do klienta):
   GET = rehydracja z tutor_turns, POST = tura blokująca ze spinnerem
   (sędzia ocenia całość zanim student zobaczy); stany kontraktu 1:1
   (crisis 116 123 + dymek zdjęty, 409 limit chowa pole, 429/5xx wiadomość
   wraca do pola + toast, licznik x/30); wzorce Pomocnika (auto-scroll
   z guardem, fokus, role=log).
   - **DoD „E2E; licznik kosztu rośnie" DOWIEDZIONE**: spec Playwright
     `60-c11-tutor.spec.ts` (@dbwrite @llm, zawory jak B4) zielony na ŻYWYCH
     modelach (27,5 s): login → projekt → pytanie → odpowiedź sokratyczna →
     ai_usage_ledger +2 (turn Sonnet $0.0084 + judge Haiku $0.0017) → reload
     odtwarza rozmowę z bazy.
   - Unit 1077/1077 (10 testów panelu; flake stubu scrollTo w jsdom
     zdiagnozowany do przyczyny — spóźniony passive effect po delete
     z afterEach — naprawiony stubem per plik, 15/15 zielonych);
     integration 110/110 (asercje 1.13 zawężone do studentów testu).
   - Zaszłości naprawione przy pierwszym realnym biegu e2e-pw od dawna:
     `getByLabel("Hasło")` łapał przycisk „Pokaż hasło" (exact: true
     w helpers/auth + spec 01/50); `PLAYWRIGHT_CHANNEL=chrome` opt-in na
     systemową przeglądarkę (Playwright 1.60 bez chromium dla ubuntu 26.04
     / WSL Darka); CI bez zmian. Konta e2e zasiane w bazie testowej 5433
     (`pnpm seed:e2e` z env z .env.test).
   - **Aktywacja prod = release całego C11**: migracja 0031 +
     `FLAG_SOCRATIC_TUTOR` (akcja Darka, bez pośpiechu).

25. **B7/1.15 ✅ DOMKNIĘTE — ADR-013 zaakceptowany (sign-off Darka
   „zatwierdzone", 2026-07-09, commit `c40ea9e`)**. Spike wg wymogu: draft →
   krytyczny przegląd 3 agentów (integracja/konsumenci, bezpieczeństwo-RLS-
   RODO, determinizm-koszt-UX) — 30 znalezisk, 7 krytycznych, wcielone → v0.2
   → sign-off. Decyzje (wszystkie wg rekomendacji): viva BRAMKUJE 'verified';
   human-approve = jawny wyjątek (plakietka „Oceniał człowiek" zamiast
   „Obroniona"); parametry 3 pytania · próg 4/6 · TTL 60 min wznawialne ·
   self-restart przy 0 odp. · 1 podejście/wersja zgłoszenia; surowe odpowiedzi
   dla operatora + wykładowcy własnego tenanta przez API z audytem; retencja
   12 m-cy. Kluczowe rozstrzygnięcia architektoniczne: generacja pytań
   W POTOKU (krok 6-prep — zero dryfu artefaktu), pierwszeństwo decyzji
   człowieka nad vivą, reset stanu viva przy re-submicie, golden set sędziego
   z falseAccepts=[] jako twardy DoD.

26. **B7/1.16a ✅ zmergowane (#156, squash `fe10934`; CI zielone za pierwszym
   podejściem)** — silnik obrony ustnej wg ADR-013:
   - **Migracja 0032**: viva_sessions (grant SELECT-only, student_sees_own
     FOR SELECT, FORCE+owner_passthrough, partial unique żywej sesji) +
     viva_answers (wariant DENY, k3 #13a); cascades po studencie; k3 =
     **18 tabel tenant**, zielone; **rls-matrix v0.23 do sign-offu Ryana**;
     retencja odpowiedzi 12 m-cy → NOWY centralny rejestr
     `docs/data/retention.md`.
   - **Krok 6-prep w potoku**: pytania z TEGO SAMEGO artefaktu co ocena;
     fail-closed → sesja inconclusive → człowiek; plan zamrożony, walidowany
     schematem; strategia per deliverableType.
   - **Submit**: 'verified' → demotacja do 'submitted' + sesja pending;
     re-submit superseduje sesje i resetuje klucz viva (`- 'viva'` w merge'u
     jsonb); audit submission.verified emituje zdana viva.
   - **Trasy** viva/{GET,start,answer}: własność 404-pattern, kolejność
     server-side, sędzia poza tx, próg 4/6 w kodzie, TTL 60 min wznawialne
     + lazy expiry, self-restart (0 odp.), kryzys przed zapisem, awaria
     sędziego = inconclusive. **Pierwszeństwo człowieka**: decyzja B8
     superseduje sesję; po decyzji viva nie startuje. Kolejka B8 + projekcja
     viva; surowe odpowiedzi przez GET /api/review-queue/[id]/viva (owner-
     side, audyt per odczyt). Tutor C11 zablokowany w trakcie otwartej obrony.
   - **Właz**: tools/viva-flag-off-recompute.ts (dry-run/--execute).
   - Dowody: unit 1097/1097 (+20), integration 124/124 (+14, pełny cykl na
     realnej bazie), BUILD_OK; **golden set sędziego na żywym Sonnecie:
     13/13, falseAccepts=[]** (4 merytoryczne zdają, 4 słabe + 5 injection
     = 0 pkt); sonda kontrolna: naiwny sędzia też odporny (Sonnet 4.6) —
     tagi untrusted to defense-in-depth, golden set to tripwire regresji.
   - **Aktywacja prod: razem z 1.16b** (migracja 0032 + FLAG_VIVA_DEFENSE).

27. **B7/1.16b ✅ zmergowane (#157, squash `edb6902`; CI zielone) — BLOK B7
   DOMKNIĘTY KODOWO (1.15 ADR-013 + 1.16a #156 + 1.16b #157)**. UI obrony
   ustnej + E2E na żywym sędzim:
   - **VivaPanel** w widoku projektu (wzorce StepDiagnosis/TutorPanel):
     baner „kredencjał PO zdanej obronie" → pytanie po pytaniu (licznik
     czasu z leniwym expiry serwera + guard „raz per deadline" na refetchu
     przy zerze, cap 2000 znaków, zero feedbacku w trakcie) → ekran wyniku.
     Stany kontraktu 1:1: crisis 116 123 (odpowiedź ZOSTAJE w polu), 409 →
     toast + prawda z GET, 429/5xx → odpowiedź wraca, expired(0 odp.) →
     self-restart, superseded → uczciwy komunikat; passed →
     router.refresh() (status + callout refleksji B5); brak sesji (state
     null) = panel nie istnieje. Flaga vivaDefense server-side → prop.
   - **Kontrakt 1.16a uzupełniony:** `serializeVivaState` zwraca
     `sessionId` — trasa answer identyfikuje sesję w URL, a klient nie miał
     skąd go wziąć (luka znaleziona przy budowie UI; pole addytywne).
   - **Tutor C11 naprawiony:** 409 rozróżnione po `maxTurns` w body —
     blokada na czas obrony to toast info + wiadomość wraca do pola
     (wcześniej panel kłamał „limit wyczerpany").
   - **Plakietka receiptu** (wzorzec 1.6, dane): `vivaDefended` z projekcji
     `aiReviewJson.viva.state==='passed'` w mapSubmissionsToReceipts (jedno
     źródło, prywatny+publiczny; WYŁĄCZNIE boolean — whitelist §6.1);
     human-approve (superseded ≠ passed) plakietki NIE dostaje.
   - **Kolejka /review:** chip stanu obrony z projekcji + podgląd surowych
     Q/A/werdyktów przez GET /api/review-queue/[id]/viva pobierany DOPIERO
     na klik i cache'owany (odczyt audytowany — UI nie mnoży wpisów).
   - Dowody: unit 1118/1118 (+21), integration 124/124, tsc 0, Biome 0
     błędów, BUILD_OK; **E2E `70-b7-viva.spec.ts` na żywym sędzim (Sonnet)**:
     osadzona sesja pending → baner → start → 3 odpowiedzi → **passed 6/6**,
     zgłoszenie 'verified', ledger viva.judge +3 ($0.0122), reload odtwarza
     wynik; smoke OFF/ON: flaga ON → 401 na trasach bez sesji, OFF → 404;
     @safe 13/13, 20-spec zielony przy zapalonej fladze.
   - Zaszłości speców E2E (pierwszy pełny bieg od 1.14): kotwice
     01-public-auth (redesign landingu #6 zmienił hero/CTA/„Panel uczelni")
     i 20-dashboard („Twoje narzędzia" nie istnieje po redesignie hub-a)
     zaktualizowane do obecnego UI — dryf speców, nie regres.

28. **AKTYWACJA B7 NA PROD ✅ WYKONANA (2026-07-10)** — **BLOK B7 LIVE**
   (trzeci blok F1 z zapaloną flagą, po A5 i C11):
   - **Migracja 0032 (Darek)** wg procedury: backup gałęzią Neona, dziennik
     PRZED 32/1783610643728 → PO 33/1783620996022, RLS t/t na obu tabelach,
     granty OK (viva_sessions: 1 wiersz app_student|SELECT; viva_answers:
     DENY), partial unique żywej sesji. **PROD = 0032** (pełna parzystość).
   - **FLAG_VIVA_DEFENSE=1 (Oliver):** Production przez `printf "1" |
     vercel env add` (pipe omija pętlę interaktywną), Preview przez REST
     API (`POST /v10/projects/{id}/env`, wzorzec C11); redeploy prod
     (alias skill-bridge-ai-seven.vercel.app, Ready 3m).
   - **Smoke prod czysty:** trasy viva bez sesji 404→**401** (GET/start/
     answer — flaga żyje, bramka auth działa); review-queue/[id]/viva 404
     (poprawnie — wymaga TAKŻE FLAG_HUMAN_REVIEW_QUEUE, B8 nieaktywny);
     home/login 200; runtime errors: zero (jedyny wpis = znany warning
     deprecacji SSL z pg, żyje od marca).
   - Od teraz submit z werdyktem 'verified' na prodzie przechodzi przez
     obronę (demotacja → pending viva); właz awaryjny:
     tools/viva-flag-off-recompute.ts przy ew. gaszeniu flagi.

29. **PRZEJŚCIE PRZEGLĄDARKOWE CAŁOŚCI NA PRODZIE ✅ (2026-07-10, na
   prośbę Darka)** — pełny przepływ prawdziwym UI: rejestracja
   (`test-viva-01@skillbridge-verify.pl`) → onboarding DS z diagnozą na
   żywym banku (6 pytań, pokrycie 14%) → projekt „Analiza jakości
   powietrza" → brief → submit realnego repo → **werdykt maszyny 100/100**
   → demotacja + baner obrony → **viva zdana 6/6 na żywym Sonnecie**
   (3 pytania o FAKTYCZNE decyzje w kodzie: semantyka 400 w API GIOŚ,
   kompozycja średniej miejskiej, przesunięte okno Wrocławia) → status
   'verified' bez reloadu → **plakietka „Obroniona ustnie (rozmowa z AI)"
   na receipcie paszportu** (zrzut u Darka). Repo-fixture: publiczne
   `github.com/Danolog/analiza-jakosci-powietrza-pl` — UCZCIWA analiza
   (żywe API GIOŚ, realne dane, 7 commitów/4 dni).
   **Przejście wyłapało i naprawiło launch-blocker:**
   - **#158 zmergowany+LIVE**: krok 3 potoku (semantic) miał timeout 45 s
     (AI_CALL_TIMEOUT_MS), a realna generacja uzasadnień to 40–60 s —
     KAŻDY submit na prodzie kończył się TimeoutError →
     semantic_parse_failed → 0/100 (fail-closed działał, ocena niemożliwa
     z konstrukcji). Fix: AI_LONG_CALL_TIMEOUT_MS=90 s dla kroku 3 +
     maxDuration submitu 120→180. Diagnoza: flagi z aiReviewJson przez
     payload RSC + lokalny repro (43,7 s sukces / 45 s abort).
   - Fałszywy trop po drodze: GITHUB_TOKEN — niewinny (krok 1 pobierał
     repo od początku; `vercel env ls` pokazuje createdAt, nie updatedAt —
     stąd błędna diagnoza „edycja nie weszła"). W zamieszaniu NOWY token
     Darka trafił do transkryptu sesji → **akcja Darka: skasować token
     `skillbridge-prod-repo-read` na GitHubie i wystawić świeży** (podmiana
     env: dashboard albo PATCH REST — updatedAt weryfikuje). Token jest
     public-read-only, więc ekspozycja niska, ale zasada to zasada.
     Rotacja de facto domyka 0.7-sekret (stary token z 2026-06-29
     zastąpiony; po wymianie skasować oba stare).
   - Obserwacja produktowa (bez presji): plik danych w repo studenta
     wciąga CSV do artefaktu (55k znaków) — wydłuża krok 3; przy 90 s
     mieści się, ale kuracja limitów per typ pliku to temat na 1.17/1.18.
   Sprzątanie po teście (Darek, opcjonalnie): konto test-viva-01 +
   zgłoszenie w prod DB (drugie konto testowe obok test-weryfikacja-10);
   repo-fixture można skasować albo zostawić jako demo.

30. **1.17 ✅ zmergowane (#159, squash `d9eb917`; CI zielone)** —
   instrumentacja placement rate. Decyzje Darka: baseline + zdarzenia
   deklarowane; zgoda w onboardingu (krok Wnioski — pełny baseline
   1. kohorty) i profilu. Migracja **0033** (`placement_events`: kind CHECK,
   partial unique baseline; kolumny zgody na students wzorcem AG.6); RLS
   0030, grant SELECT app_student, faculty deny; **rls-matrix v0.24**
   (sign-off Ryana). **Delete-on-revoke** w jednej tx (PII za zgodą; student
   znika z agregatów E2.H — liczone na żywo); decyzje zgody audytowane;
   rejestr retencji uzupełniony. Trasy POST /api/placement/{consent,events}
   (403 bez zgody, 409 drugi baseline, 400 przyszłość) + karta zgody
   w Wnioskach + sekcja „Śledzenie zatrudnienia" w profilu. Za flagą
   **placementTracking**. Dowody: unit +5, integration +6 (realna baza,
   RLS, delete-on-revoke), k3 = 19 tabel.

31. **1.18 ✅ zmergowane (#160, squash `e188ab4`; CI zielone) — FAZA 1
   KODOWO DOMKNIĘTA (wszystkie zadania 1.x z roadmapy zrealizowane)**.
   C13 rytm nauki. Decyzje Darka: streak/zastój DETERMINISTYCZNIE z realnej
   aktywności (nie z formularzy); check-in opcjonalny; deklaracja
   w „Mojej drodze"; alert zastoju in-app, wyłączalny. Migracja **0034**
   (`study_rhythms` 1/student + `study_checkins` UNIQUE(student, tydzień),
   week_start server-side; `module_ref` = hak 1E.6); RLS 0030;
   **rls-matrix v0.25** (sign-off Ryana); k3 = **21 tabel**. Silnik
   `src/lib/rhythm/` (tygodnie ISO UTC; kotwica streaku bieżący-albo-
   poprzedni tydzień; zastój ≥7 dni; alert wg EPIZODÓW notified_at vs
   lastActivityAt — bez tabeli zdarzeń; ślady jednym UNION ALL po
   submissions/tutor/assessment/viva/reflections/check-inach). Trasy
   POST /api/rhythm/{,checkin,stagnation-dismiss}; UI: sekcja w Mojej
   drodze + karta na dashboardzie. Za flagą **studyRhythm**. Dowody:
   unit +23 (17 silnika), integration +6 (streak z realnej tury tutora,
   epizody zastoju, RLS); **weryfikacja przeglądarkowa na lokalnym dev**:
   login → deklaracja 8 h/pn+śr → check-in utrwalony (rehydracja) →
   karta na dashboardzie z poprawną ścieżką „świeża aktywność".

32. **AKTYWACJA 1.17/1.18 NA PROD ✅ WYKONANA (2026-07-10 wieczorem)** —
   **1.17 i 1.18 LIVE**:
   - **Migracje 0033+0034 (Darek)**: dziennik PRZED 33/1783620996022 →
     PO **35/1783700829623**; RLS t/t na wszystkich 3 tabelach; granty
     dokładnie app_student|SELECT ×3; kolumny zgody na students.
     **PROD = 0034** (pełna parzystość z bazą testową).
   - **Flagi (Oliver):** FLAG_PLACEMENT_TRACKING + FLAG_STUDY_RHYTHM na
     Production (printf|vercel env add) i Preview (REST API); redeploy
     prod (Ready 2m, alias skill-bridge-ai-seven).
   - **Smoke czysty:** 5 tras (placement/{consent,events},
     rhythm/{,checkin,stagnation-dismiss}) bez sesji 404→**401**;
     home/login 200; runtime errors: zero. Karta zgody w Wnioskach,
     sekcja profilu, rytm w Mojej drodze i karta na dashboardzie — LIVE.
   - Baseline placement 1. kohorty zabezpieczony (flaga zapalona przed
     pierwszą kohortą — dane liczą się od teraz).

33. **SIGN-OFF RYANA (CRCO) ✅ — rls-matrix v0.15→v0.25 podpisane
   (2026-07-10, commit `939726a`)**: audyt zbiorczy agentem-Ryanem, 11
   wpisów zweryfikowanych adwersaryjnie przeciwko migracjom 0022–0034,
   k3-validate i trasom zapisu — **11× GO, zero KRYTYCZNYCH/WAŻNYCH**,
   3 noty INFO (w macierzy, m.in. preferować DROP+CREATE dla
   owner_passthrough w przyszłych migracjach). Jedyny wpis dalej bez
   sign-offu: v0.12 (B3 project_learning_resources, zaszłość sprzed G6).

34. **AKTYWACJA B8 + B6 ✅ (2026-07-10 wieczorem)** — **WSZYSTKIE BLOKI
   FAZY 1 LIVE NA PRODZIE**:
   - Flagi FLAG_HUMAN_REVIEW_QUEUE + FLAG_SANDBOX_RUNNER (Production+
     Preview, wzorzec pipe/REST) + OPERATOR_PASSWORD (Darek przez
     dashboard; pierwsza wartość <16 znaków → trasa fail-closed 500
     „Server misconfigured" — bezpiecznik siły sekretu zadziałał zgodnie
     z projektem; po podmianie na ≥16 znaków smoke czysty).
   - Smoke: operator/login złe hasło → **401**; review-queue bez auth →
     401; review-queue/[id]/viva → 401 (obie flagi rodziny B8+B7 żywe);
     /review → redirect na login (200); runtime errors zero.
   - B6 formalnie ON, de facto uśpiony: project_hidden_tests na prodzie
     puste (kuracja suite'ów = wątek Sophii) — runner nie odpala, bez
     szkód; runOk=null zachowuje statusy jak dotąd.
   - **BRAMKA WYJŚCIA F1 — SPEŁNIONA i aktywna na prodzie:** receipt =
     sandbox (1.9 ON) + obrona (1.16 ON, dowód E2E na prodzie) +
     recenzja człowieka (1.5 ON); zero mapy z samooceny dla DS (1.12 ON);
     model kariery w DB (1.0 ON); placement mierzony (1.17 ON).
     Flagi na prodzie: 9 zapalonych (diagnoza, tutor, viva, placement,
     rytm, kolejka, sandbox + career-model, gap-verifier-rodzina wg
     wcześniejszych decyzji); zgaszone pozostają flagi AG (potok rynku —
     decyzja Darka „na razie zostają zgaszone").
   - Warto kliknąć: /review/login z hasłem operatora (kolejka może być
     pusta — zgłoszenie test-viva-01 przeszło vivę 6/6 bez
     needsHumanReview).

35. **Faza 1E — przygotowanie 1E.0 (2026-07-11):** research sesji nauki
   ODROBIONY przed spikiem (3 agentów: dowody naukowe z rangami / MIT /
   Harvard+Stanford) → `docs/curation/pre-brief-1e0-sesje-nauki.md`
   (raporty + synteza + rekomendacja). **Decyzje Darka WIĄŻĄCE dla 1E.0**
   (wpisane do planu spike'a): sesja 15–30 min = 2–4 ATOMY (atom = teoria
   ~5–8 min + retrieval 1–5 pytań bezpośrednio po); mikro-ćwiczenia
   niskostawkowe (nielimitowane próby, deterministyczny feedback, 0 LLM);
   spacing przez rytm 1.18; adaptacja do „literalnego zera"; zakaz
   komunikowania „25 min" jako naukowo optymalnych (heurystyka Pomodoro,
   nie badanie). Plan spike'a 1E.0 gotowy (fazy A–E, wyjście = ADR-014);
   Faza A/2 przeformułowana na weryfikację pre-briefu.

36. **SPIKE 1E.0 WYKONANY (2026-07-11, jedna sesja):** fazy A–E domknięte.
   - **Faza A** (4 agentów researchu): 71 unikalnych ustaleń z rangami
     (P*/M*/G*/C*/R*) → `docs/curation/research-kognitywistyka-1e0.md`
     (tabela syntezy + indeks D→ID + errata po przeglądzie). Weryfikacja
     adwersaryjna pre-briefu: 0 obalonych, 2 korekty (Guo — trafność
     zewnętrzna; Cepeda 2008 — zakres 5–40%).
   - **Faza B** (2 agentów audytu): **0/10 projektów przechodzi test
     literalnego zera**; 54/54 linki żywe, 3 niedopasowane (1 → PŁATNY
     produkt wbrew „bez karty"); wycena remediacji ~86,5 h →
     `docs/curation/audyt-ds-partia-1-luki.md`. Werdykt D4: reuse-as-capstone.
   - **Faza C→D→E:** ADR-014 v0.1 → przegląd 4 soczewkami (**59 znalezisk:
     1 WETO warunkowe content-ops, 7 krytycznych, 22 ważne, 20 drobnych,
     10 do listy**) → **v0.2** z wcielonym pakietem cięć A–E (weto zdjęte):
     3 pytania/atom bez wariantów, moduł 5–6 atomów + egzamin 15–20 pytań
     z licznikiem błędów, typ pozycji `lab`, L0 lean, wariant B reaktywnie,
     remediacja sekwencjonowana (pilot-path ~18,5 h), model danych domknięty
     (curriculum_item_answers append-only, module_progress, M:N ścieżek).
     → `docs/decisions/014-curriculum-sciezka-edukacyjna.md`.
   - **CZEKA NA SIGN-OFF Darka+Sophii: lista decyzyjna 13 punktów** (m.in.
     próg mastery, wariant C zaliczenia projektu, zakres remediacji,
     transfer w fundamentach). **Decyzje Darka (2026-07-11): KOMPLET 13/13
     rozstrzygnięty** — pkt 1–4, 6, 8–10 wg rekomendacji; ze zmianami: pkt 5
     (fading adaptacyjny OD RAZU — bez rozdzielania pilot/po-pilocie), pkt 7
     (4 capstone'y — 8 modułów: L0, F1–F3+mini-projekt, M-EDA, M-SQL, M-ML,
     M-LLM), pkt 11 (weryfikacja AUTOMATYCZNA labów/kamieni — implementacja
     docelowa, reuse sandboxa 1.9), pkt 12 (wariant b: mini-projekt po F3),
     pkt 13 (drabinki hintów 3-stopniowe WSZĘDZIE). Ścieżka krytyczna treści
     ~200–285 h. **ADR czeka już TYLKO na sign-off Sophii** (wykonalność
     wolumenu). **Konkurs EduTech Masters WYGRANY** — decyzją Darka
     (2026-07-11) deadline usunięty z dokumentów (CLAUDE.md, PRD, ADR-014);
     tempo dyktuje przepustowość Sophii, nie data.

37. **ADR-014 ZAAKCEPTOWANY W KOMPLECIE (2026-07-11):** Darek 13/13 +
   **Sophia (wolumen ~200–285 h zatwierdzony)**. **1E.1 ZATOMIZOWANE** →
   `.agents/plans/12-curriculum-1e1-atomizacja.md`: 7 atomów (1E.1a–g),
   2 PR-y (PR-1: schemat 9 tabel + flaga + RLS + dług QG-5; PR-2: ingest
   drabiny 8 modułów + API prereq + zapis postępu + streak za flagą).
   ⚠ UNION streaka za flagą (deploy bezpieczny przed migracją prod);
   aktywacja = migracja + ingest (Darek) + flaga ON.

38. **NASTĘPNE:** rotacja tokenu GitHub (pkt 29) + **implementacja 1E.1
   (PR-1: 1E.1a+b+g)**; równolegle Sophia może startować treść L0/F1
   wg parametrów D1 ADR-014 (spec formatu JSON atomów wydam przy PR-2).

### Stan bloków Fazy 1 (2026-07-09)
- **Blok AG** ✅ CAŁY (kod + bramka 6/6 + migracje prod) — aktywacja = env.
- **Blok B8** ✅ CAŁY (1.2–1.6, PR #144–#147) — aktywacja = 0027 + env.
- **Blok B6** ✅ CAŁY (1.7 ADR-012 + 1.8 #148 + 1.9 #149) — aktywacja =
  0028 + flaga; otwarta kuracja suite'ów (wątek Sophii, bez presji).
- **Blok A5** ✅ CAŁY (1.10 #150 · 1.11 #151 · 1.12 #152) — LIVE na prod
  (jedyny blok F1 z zapaloną flagą; smoke przeglądarkowy nowego kreatora
  do kliknięcia).
- **Blok C11** ✅ CAŁY i **LIVE NA PRODZIE** (1.13 #154 + 1.14 #155; migracja
  0031 + FLAG_SOCRATIC_TUTOR=1 Production+Preview, smoke czysty 2026-07-09).
- **Blok B7** ✅ CAŁY i **LIVE NA PRODZIE** (1.15 ADR-013 · 1.16a #156 ·
  1.16b #157; migracja 0032 + FLAG_VIVA_DEFENSE=1 Production+Preview,
  smoke czysty 2026-07-10).
- **Faza 1 KODOWO DOMKNIĘTA, 1.17+1.18 LIVE NA PRODZIE** (pkt 32).
- Baseline main: tsc 0, Biome 0, unit 1146/1146, integration 136/136,
  k3 zielony (21 tabel tenant), BUILD_OK; migracje: **test DB = 0034,
  prod = 0034** (pełna parzystość; flagi ON: FLAG_DIAGNOSTIC_ASSESSMENT,
  FLAG_SOCRATIC_TUTOR, FLAG_VIVA_DEFENSE, FLAG_PLACEMENT_TRACKING,
  FLAG_STUDY_RHYTHM).

### Otwarte zaległości (akcje Darka, nie kod)
- **0.7-sekret / token po smoke B7** — skasować na GitHubie token
  `skillbridge-prod-repo-read` (trafił do transkryptu 2026-07-10) ORAZ
  stary token z 2026-06-29; wystawić świeży fine-grained public-read
  i podmienić env (szczegóły pkt 29).
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
