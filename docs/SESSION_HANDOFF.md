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

## STAN NA DZIŚ — 2026-07-13

### Gdzie żyje repo
- **iMac: `~/Claude_Projekty/SkillBridge`** — **POZA iCloud, i tak ma zostać.**
  Repo stało wcześniej w `~/Documents/kodowanie/SkillBridge_AI`, a `~/Documents`
  jest synchronizowane z iCloud Drive — iCloud **uszkodził bazę obiektów `.git`**
  (`git fsck`: 216 błędów; 111 śledzonych plików zniknęło z drzewa i NIE dawało
  się ich odtworzyć z HEAD: `error: Could not read <sha>`). Naprawa 2026-07-13:
  dołożenie paczek obiektów z lustrzanego klonu origin do `.git/objects/pack/`
  → `git restore` usuniętych ścieżek → czysto. **Nie przenosić repo z powrotem
  pod `~/Documents` ani `~/Desktop`.** Obejście „`.next` jako symlink do
  `.next.nosync`" jest już NIEAKTUALNE (a osierocony `.next.nosync` wywala
  `pnpm lint`, bo biome go nie ignoruje).
- **Zdalnie:** `github.com/Danolog/nordsignal-skillbridge` (stary URL
  `Danolog/SkillBridge_AI` w `origin` przekierowuje — to to samo repo), gałąź `main`.
- **Środowisko:** Node 25.6.0, pnpm 10.29.2, Next 16.2.9. Baza lokalna: kontener
  Dockera `skillbridge-postgres` (port 5432) — NIE twórz nowego. Trzy pliki env
  (`.env.local` / `.env.test` / `.env.prod`); wejście na prod zawsze jawne przez
  `pnpm dotenv -e .env.prod -- …`.
- **Baseline `main` (`0a074c2`):** build OK, tsc 0, Biome 0, unit **1155/1155**
  (117 plików); pełna bramka CI zielona na PR #168 (build, typecheck, lint, test,
  integration, secret-scan, deps-scan, Vercel Preview).
- **Migracje:** lokalna/test = **0035**, prod = **0035** (parzystość).
  **Kolejka prod: 0036** — czeka w PR #164 (patrz 1E.2).

### Faza 0 — ZAMKNIĘTA
Zadania 0.0–0.16 zmergowane. Dwie zaległości — akcje Darka, nie kod (niżej).

### Faza 1 — KODOWO DOMKNIĘTA
Bloki **AG** (eval + rynek + doradca), **B8**, **B6**, **A5**, **C11**, **B7**
— wszystkie zamknięte; A5, C11, B7 oraz 1.17+1.18 **LIVE na produkcji**
(flagi ON: FLAG_DIAGNOSTIC_ASSESSMENT, FLAG_SOCRATIC_TUTOR, FLAG_VIVA_DEFENSE,
FLAG_PLACEMENT_TRACKING, FLAG_STUDY_RHYTHM, FLAG_CAREER_MODEL_FROM_DB,
FLAG_GAP_VERIFIER). Szczegóły każdego bloku: `git log` i poprzednie snapshoty
tego pliku.

### Faza 1E — ścieżka edukacyjna (pilotaż DS) — W TOKU

- **1E.1 ✅ LIVE NA PRODZIE** — model danych curriculum + drabina modułów
  (migracja 0035, ingest drabiny, flaga ON).

- **1E.2 ✅ WYKONANE KODOWO — WISI W DWÓCH PR-ach.**
  - **PR #164** (mechanika): migracja **0036** (`curriculum_module_items.slug`,
    `question_items.option_feedback_json`), ingest atomów + banku foundations,
    strażnik `CONFIRM_CONTENT_MIGRATION=1`, recompute; **rls-matrix v0.27**
    do sign-offu Ryana.
  - **PR #165** (treść fundamentów, stacked na #164): packer
    `pnpm content:pack-curriculum` + 4 pliki JSON w `tools/content/curriculum-atoms/`
    (L0 / F1 / F2 / F3) = 28 pozycji / 57 pytań / 19 konceptów.
  - ⚠ **Obie gałęzie są 7 commitów ZA `main`** (m.in. treść M-* Sophii, #166, #168)
    → **wymagają aktualizacji przed mergem.**
  - **Kolejność wykonania (runbook `docs/runbooks/aktywacja-1e2-neon-console.md`):**
    migracja **0036** w konsoli Neona **PRZED** merge #164 (trasa answer czyta nową
    kolumnę!) → merge #164 → #165 → ingest treści → sign-off rls-matrix v0.27.
  - **Uwaga produktowa:** laby (całe L0) są niekompletowalne do **1E.6** — onboarding
    realnych studentów dopiero po 1E.6.

- **Treść drabiny DS — KOMPLET na `main`, ale spakowane tylko fundamenty.**
  W `docs/curation/` leży 9 zatwierdzonych plików Sophii (~10 400 linii):
  L0 / F1 / F2 / F3 (fundamenty) + **M-PD (8 atomów), M-EDA (4), M-SQL (7),
  M-ML (7), M-LLM (7) = 33 atomy**. Do JSON-a spakowane są **wyłącznie fundamenty**
  (PR #165). **Pięć modułów M-\* czeka na packer + ingest — bez tego drabina DS
  stanie pusta po aktywacji 1E.2.** Mechanika gotowa (packer + kontrakt-testy
  z testem determinizmu), to nie jest nowa robota koncepcyjna.

- **1E.R ✅ DOMKNIĘTE KODOWO (#168, 2026-07-13)** — partia naprawcza projektów DS
  (ADR-014 D7). Praca Sophii przetrwała awarię sesji w
  `tools/content/ds-projects-partia-1r.json` (commit „wip: przed migracją").
  Domknięcie: **21/21 zasobów** z kompletem metadanych (`license`, `language`,
  `registrationRequired`, `verifiedAt` — kolumny z 0035) → **dług QG-5 §3/§4/§7
  partii 1 spłacony**; **0 placeholderów PENDING** (blokowały ingest — `validateUrl`
  woła `new URL()`); **0 zasobów wymagających karty płatniczej**.
  - Uzupełnione: kurs SQL (ThoughtSpot/Mode — funkcje okna, bez rejestracji),
    playlista StatQuest, Groq quickstart jako darmowy fallback dla Gemini.
  - Sprostowane: dokumentacja Gemini to **CC BY 4.0** (kod: Apache 2.0), nie
    „własnościowa (Google)". Wzorzec: portale deweloperskie Google publikują na
    CC BY 4.0 — każde „własnościowa" przy `ai.google.dev` / `developers.google.com`
    jest podejrzane.
  - **`ds-chmura`: usunięty Microsoft Learn** [decyzja Darka]. Darmowe sandboxy
    Microsoft Learn **zostały WYCOFANE** — ćwiczenia wymagają dziś subskrypcji Azure
    (karta), czyli **ten sam błąd, dla którego powstała partia 1E.R**. Wraz z zasobem
    poszły 4 miejsca w treści twierdzące, że sandbox istnieje (`theory_md`,
    `description`, `source_links`).
  - **Dowód:** 40/40 URL-i sprawdzonych (HTTP 200; `skills.google` daje 403 tylko
    botom); ingest na bazie lokalnej ×2 idempotentny (5 projektów / 21 materiałów /
    17 linków, 0 błędów); kolumny wypełnione w 21/21 wierszy.
  - **CZEGO BRAKUJE:** partia **nie przeszła QG-1…7** (wymóg ADR-014 D7) i **nie jest
    zaingestowana na prod** ([CZERWONA LINIA], ADR-010: sign-off + backup +
    transakcyjny SQL).

### NASTĘPNE (kolejność)
1. **Domknąć 1E.2:** migracja 0036 (konsola Neona) → merge #164 → #165 → ingest
   fundamentów → sign-off Ryana dla rls-matrix v0.27. Gałęzie PR najpierw
   zaktualizować względem `main`.
2. **Spakować 5 modułów M-\*** (33 atomy) packerem + ingest — żeby drabina DS nie
   stała pusta.
3. **QG-1…7 partii 1E.R** → dopiero potem ingest 1E.R na prod (czerwona linia).
4. **1E.3** (egzaminy modułowe + mastery gate) i **1E.4** (spaced repetition) —
   oba konsumują bank pytań z 1E.2.

### Otwarte zaległości (akcje Darka, nie kod)
- **0.7-sekret** — skasować na GitHubie tokeny `skillbridge-prod-repo-read`
  (trafił do transkryptu 2026-07-10) oraz stary z 2026-06-29; wystawić świeży
  fine-grained public-read i podmienić env.
- **0.13 CSP** — potwierdzić PR #121 (CSP enforce + drop `unsafe-eval`) na
  Preview/prod albo rollback. Runtime CSP niewykrywalny lokalnie.
- **Baza testowa integration** — nadal stawiana ad-hoc (Docker Postgres :5433 +
  `db:migrate:test`); brak stałego compose. Na iMacu **:5433 nie działa** —
  `pnpm test:integration` lokalnie nie ruszy bez ręcznego setupu (bramką jest CI).
- **Dependabot** — otwarte PR-y: #167, #127, #88, #87, #86, #83.

### Ostrzeżenia / kontekst dla nowej sesji
- **Tryb Wykonawca/Audytor PORZUCONY NA ZAWSZE** (decyzja Darka 2026-07-07) — jeden
  agent implementuje i weryfikuje. Self-merge PR-ów bywa blokowany przez klasyfikator
  (wtedy merge klika Darek).
- **Nie trzymać repo pod iCloud** (patrz „Gdzie żyje repo") — iCloud kasuje nie tylko
  `.next`, ale i obiekty `.git` oraz pliki typu `.vercel/project.json`. Jeśli plik
  konfiguracyjny „zniknął sam", to pierwszy podejrzany, nie bug w kodzie.
- **Ingest na prod = [CZERWONA LINIA]:** sign-off + backup gałęzią Neona +
  transakcyjny SQL (ADR-009/010). Przed prod `db:migrate` porównaj
  `__drizzle_migrations` z `_journal.json`.
- **Migracja przed deployem:** gdy nowy kod czyta obiekt ze swojej migracji, migracja
  prod MUSI wyprzedzić merge (Vercel auto-deployuje z `main`) — dotyczy teraz 0036/#164.
- **Vercel env = `sensitive`:** `vercel env pull` pokazuje `""` dla wszystkich zmiennych,
  także działających. To artefakt pulla, nie stan flagi — dowód tylko funkcjonalny.
- „Partie 0–5" w starszych handoffach to tor **10 poprawek**, NIE partie treści B3 ani
  fazy 0–3 z roadmapy — nie mylić numeracji.
- **Reguła twarda:** handoff i commity **pushować** na koniec sesji. Commit lokalny nie
  przeżywa awarii sprzętu.

---

## Konwencja pliku
- Aktualizuj **tylko** sekcję „STAN NA DZIŚ" (zastąp snapshotem), datę w nagłówku.
- Commituj selektywnie (sam ten plik) i **push** na koniec sesji.
- Historia poprzednich stanów: `git log -- docs/SESSION_HANDOFF.md`.
