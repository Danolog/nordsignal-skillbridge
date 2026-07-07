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

## STAN NA DZIŚ — 2026-07-07

### Gdzie żyje repo
- **Lokalnie (2 maszyny):** macOS `~/Claude_Cowork/SkillBridge` · WSL
  `~/projekty/nordsignal-skillbridge`. Nie trzymać aktywnego repo pod iCloud.
- **Zdalnie:** `github.com/Danolog/nordsignal-skillbridge`, gałąź `main`.
- **Baseline:** `main` zielony — build, `tsc` 0, Biome 0, unit 891/891,
  integration 52/52.

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

Migracje: lokalne/test/**prod na 0022**.

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
4. ~~AG.1 — weryfikator luk~~ ✅ zmergowane (#135). **FLAGA ZAPALONA (2026-07-07,
   decyzja Darka):** `FLAG_GAP_VERIFIER=1` na Preview i Production + redeploy
   prod (alias skill-bridge-ai-seven.vercel.app), smoke czysty (200-tki, logi
   bez błędów). Uwaga operacyjna: zmienne env tego projektu są typu *sensitive* —
   `vercel env pull` pokazuje `""` dla WSZYSTKICH takich (także działającej
   FLAG_CAREER_MODEL_FROM_DB); wartości nie da się odczytać z zewnątrz, dowód
   działania flagi = zachowanie runtime. Flaga dotyczy tylko gałęzi legacy LLM
   (bez żywego wołacza w UI) — realny dowód pojawi się wpisami
   `verify-gaps.judge` w `ai_usage_ledger` przy pierwszym użyciu legacy.
5. **AG.2** (potok analizy) / **AG.3** (cron rynku → STAGING, [CZERWONA LINIA])
   oraz reszta Fazy 1 wg ścieżki krytycznej (§7 roadmapy).

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
