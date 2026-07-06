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

## STAN NA DZIŚ — 2026-07-06

### Gdzie żyje repo
- **Lokalnie:** `~/Claude_Cowork/SkillBridge` (przeniesione z iCloud
  `~/Documents/kodowanie/SkillBridge_AI`, które eksmitowało pliki i wieszało git).
  Nie trzymać aktywnego repo pod iCloud (`~/Documents`, `~/Desktop`).
- **Zdalnie:** `github.com/Danolog/SkillBridge_AI`, gałąź `main`.
- **Baseline:** `main` zielony — build, `tsc` 0, Biome 0 (337 plików), unit 881/881,
  **integration 52/52** (bramka naprawiona, patrz niżej).

### Faza 0 — ZAMKNIĘTA i wypchnięta
Zadania 0.0–0.16 zmergowane (ostatni: PR #125 „paczka LOW 0.15", 2026-07-04).
Dwie zaległości — **akcje Darka, nie kod:**
1. **0.7-sekret** — rotacja `GITHUB_TOKEN` na fine-grained public-read (prod).
2. **0.13 CSP** — ⚠ PR #121 (CSP enforce + drop `unsafe-eval`) został **zmergowany**
   mimo notki „nie merge'ować" — jest żywy na `main`/prod. Runtime CSP niewykrywalny
   lokalnie → **potwierdzić na Preview/prod, że nic nie psuje, albo rollback.**

### Faza 1 — W TOKU (restart udany)
Poprzednia sesja Fazy 1 padła (awaria sprzętu) i nic z niej nie trafiło do repo —
restart od zera. Zrobione tę sesję (wszystko na `main`):
- **1.1 — feature flags ✅ (PR #129)** — typowany rejestr `src/lib/flags.ts` +
  `isFeatureEnabled`, env-driven, domyślnie off. 3 flagi seed (AG, B8).
- **Naprawa bramki `integration` ✅ (PR #130)** — regresja z 0.15/B3: `z.string().uuid()`
  na param `[id]` odrzucał placeholderowe UUID-y fixture'ów (`5555…`, `dddd…`, `1111/2222`
  — nie-RFC). Fix: fixture'y na RFC-poprawne (v4/wariant 8); guard route'a nietknięty.
- **Plan v2 + Blok AG ✅ (PR #128)** — patrz niżej.

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

### NASTĘPNE (kolejność restartu Fazy 1)
1. **AG.0 — harness ewaluacyjny gap detection** (P0, bez zależności, NASTĘPNE;
   bramkuje jakość wszystkiego wyżej). Start od rozpoznania: jak dziś liczą się luki
   (`generate-gaps.ts`, `market-gaps.ts`), golden set 10–20 przypadków, próg „wiarygodny".
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
