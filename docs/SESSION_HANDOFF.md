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
  **Znalezisko harnessu:** sędzia w każdej próbce odnotował UCIĘTY koniec opisu
  — `generate-why` ma `maxOutputTokens: 400`, za mało na polskie opisy z tabelą
  widełek. Kandydat na drobną poprawkę (podbicie limitu / zakaz tabel) — per
  reguła DoD zmiana MUSI raportować deltę `pnpm test:evals`.

Migracje wciąż na 0021 (1.0 jeszcze nie ruszone), model kariery nadal w JSON.

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
1. ~~AG.0 — harness ewaluacyjny~~ ⏳ kod gotowy (PR #132) — do merge'a + baseline
   LLM po uzupełnieniu klucza (akcja Darka, patrz wyżej).
2. ~~1.1 feature flags~~ ✅ zrobione (#129).
3. **1.0 — migracja kariery JSON→DB** (P0, [CZERWONA LINIA] — sign-off Darka +
   backup gałęzią Neona + transakcyjny SQL; model z DB bajtowo identyczny z JSON).
4. **AG.1+** oraz reszta Fazy 1 wg ścieżki krytycznej (§7 roadmapy).

### Otwarte zaległości (akcje Darka, nie kod)
- **0.7-sekret** — rotacja `GITHUB_TOKEN` (prod).
- **0.13 CSP** — potwierdzić #121 na Preview/prod albo rollback.
- **Baza testowa integration** — stawiana ad-hoc (Docker Postgres 5433 +
  `db:migrate:test`); brak stałego `.env.test`/compose. Rozważyć utrwalenie, żeby
  `pnpm test:integration` dało się odpalić lokalnie bez ręcznego setupu.

### Ostrzeżenia / kontekst dla nowej sesji
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
