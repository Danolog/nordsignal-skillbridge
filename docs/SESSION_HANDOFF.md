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
- **Baseline:** `main` zielony — `tsc` 0 błędów, Biome 0 uwag (335 plików).

### Faza 0 — ZAMKNIĘTA i wypchnięta
Zadania 0.0–0.16 zmergowane (ostatni: PR #125 „paczka LOW 0.15", 2026-07-04).
Dwie zaległości — **akcje Darka, nie kod:**
1. **0.7-sekret** — rotacja `GITHUB_TOKEN` na fine-grained public-read (prod).
2. **0.13 CSP** — ⚠ PR #121 (CSP enforce + drop `unsafe-eval`) został **zmergowany**
   mimo notki „nie merge'ować" — jest żywy na `main`/prod. Runtime CSP niewykrywalny
   lokalnie → **potwierdzić na Preview/prod, że nic nie psuje, albo rollback.**

### Faza 1 — RESTART OD ZERA
Poprzednia sesja Fazy 1 padła (awaria sprzętu) i **nic z niej nie trafiło do repo**:
brak commitów 1.x, brak migracji 0022+ (kończą się na 0021), brak feature flags,
model kariery nadal w JSON. Handoff/commity tamtej sesji były lokalne i przepadły.
Zaczynamy Fazę 1 od nowa.

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
1. **AG.0 — harness ewaluacyjny gap detection** (P0, bez zależności, rusza od razu;
   bramkuje jakość wszystkiego wyżej).
2. **1.1 — feature flags** (P0, cała warstwa AG i funkcje F1 siedzą za flagą).
3. **1.0 — migracja kariery JSON→DB** (P0, [CZERWONA LINIA] — sign-off Darka +
   backup gałęzią Neona + transakcyjny SQL; model z DB bajtowo identyczny z JSON).
4. **AG.1+** oraz reszta Fazy 1 wg ścieżki krytycznej (§7 roadmapy).

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
