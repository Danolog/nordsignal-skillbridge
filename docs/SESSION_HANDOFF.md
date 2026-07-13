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

## STAN NA DZIŚ — 2026-07-13 (późny wieczór) — PLAN NAPRAW W IMPLEMENTACJI

### Plan napraw (1E.R / chmury / paszport / QG-6) — 6 PR-ów czeka na przegląd
Plan (wiążący, decyzje Darka D1–D4) żyje POZA repo:
`~/.claude/plans/napisz-plan-tych-wszystkich-eager-pine.md`. Wykonanie tej sesji:
- **Blok A ✅ PR #172** — blokery K1–K5 bramki QG 1E.R naprawione w
  `ds-projects-partia-1r.json` (tylko description/theory_md/source_links; rubryki
  bit-w-bit nietknięte; progi 600–800 słów trzymane; ingest testowy ×2 zielony;
  recenzja adwersaryjna agenta: GO). **Ryan: wystarczy diff projektu LLM** (3. hunk).
  Po merge → ingest 1E.R na prod = [CZERWONA LINIA] ADR-010.
- **PR #171 uzupełniony** — sprostowanie D1 (zdanie o „Verified Receipt na trzy
  chmury" było nieprawdziwe: mostek projekt→paszport nie istniał; ryzyko przyszłe)
  + notka QG-6 (1E.R nie jest blokowana — brak L3).
- **Blok B1+D ✅ PR #173** — runbook v1.1: QG-5 §5 wyjątek karty (wyłącznie
  weryfikacja tożsamości; Azure 35%/AWS 30%/GCP 19%), QG-6 (agent-recenzent OK
  przed pilotażem, żywy ekspert przed pierwszym receiptem), QG-4 §7 (instrukcje
  różnicujące per student MUSZĄ żyć w description — generate-brief nie widzi theory_md).
- **Blok C ✅ kodowo — łańcuch stacked PR: #174 → #175 → #177** (merge W TEJ
  kolejności, bez --delete-branch przed retargetem):
  - #174 C1: tabela `verified_competencies` (migracja **0037** + RLS wzorzec 0034
    + backfill w migracji) + flaga `FLAG_PASSPORT_VERIFIED_ONLY` + **rls-matrix
    v0.28 → DO SIGN-OFFU RYANA**;
  - #175 C2: `reconcileVerifiedCompetencies` wpięta w submit/resubmit, vivę,
    decyzję człowieka (+ tenant-sync w onboardingu); test integracyjny 8/8;
  - #177 C3/C4: odczyt paszportu za flagą (5 czytelników — plan mówił o 4, doszła
    trasa tokenowa `api/passport/[id]`), `computeDemandCoverage` (D3, parytet
    WZORU), cache pisany przez `recomputeConfirmedCoverage` PO commicie tranzycji.
  - **Flip (krok C5): migracja 0037 na prod → merge łańcucha → weryfikacja →
    FLAG_PASSPORT_VERIFIED_ONLY=1 na Vercel → sprzątanie** (calculateCoverage,
    licznik onboardingu client-side, kafelek „W trakcie: 0").
- **Blok E ✅ PR #176** — pipeline oceny: commity do kroku 3 (<COMMIT_HISTORY>
  w bloku untrusted; kryterium 20% wagi zaliczalne), endpoint-check z guardem
  SSRF (25% wagi L2), kontrakt README na klasach synonimów, plakietki compliance
  (license/registrationRequired/verifiedAt) w SourceLinkRow.
- **Blok B2/B3/B4 ⏳ NIEZACZĘTY** — trzy projekty `ds-endpoint-azure/gcp/aws`
  (partia 2, autoring z pełnym QG-1…7 — w tym benchmark ofert z URL-ami), potem
  B3 (`ds-chmura`: zdjąć chmury z required, dać CI/CD+MLOps) i B4 (test
  kontraktowy na glob + seed-parytet). UWAGA do B4: partia 1r NADPISUJE 5 slugów
  partii 1 (celowo) — „unikalność slugów między plikami" wymaga semantyki
  katalogu efektywnego (last-wins po slugu), nie prostej asercji.
- **Bloki D3 (żywy ekspert) i F (1E.R2 z Sophią)** — do pilotażu, akcje poza agentami.

### Infrastruktura tej sesji
- **Baza testowa :5433 DZIAŁA** — postawiony kontener `skillbridge-postgres-test`
  (postgres:16, user/pass postgres, db `skillbridge_test`), zmigrowany do 0037.
  Handoffowa notka „:5433 nie działa" NIEAKTUALNA. `pnpm db:seed` na tej bazie
  pada na FK `curriculum_module_items→projects` (pozostałość testów curriculum) —
  testy integracyjne radzą sobie bez seedu (fixtures własne).
- Baseline main bez zmian: build OK, tsc 0, **Biome: 3 warningi (baseline!)**,
  unit 1166/1166 (na gałęziach planu odpowiednio 1175/1185 z nowymi testami).

## STAN POPRZEDNI — 2026-07-13 (wieczór)

### Gdzie żyje repo
- **iMac: `~/Claude_Projekty/SkillBridge`** — **POZA iCloud, i tak ma zostać.**
  Repo stało wcześniej w `~/Documents/kodowanie/SkillBridge_AI`, a `~/Documents`
  jest synchronizowane z iCloud Drive — iCloud **uszkodził bazę obiektów `.git`**
  (`git fsck`: 216 błędów; 111 śledzonych plików zniknęło z drzewa i NIE dawało
  się ich odtworzyć z HEAD: `error: Could not read <sha>`). Naprawa 2026-07-13:
  dołożenie paczek obiektów z lustrzanego klonu origin do `.git/objects/pack/`
  → `git restore` usuniętych ścieżek → czysto. **Nie przenosić repo z powrotem
  pod `~/Documents` ani `~/Desktop`.** Obejście „`.next` jako symlink do
  `.next.nosync`" jest NIEAKTUALNE (a osierocony `.next.nosync` wywala `pnpm lint`).
- **Zdalnie:** `github.com/Danolog/nordsignal-skillbridge` (stary URL
  `Danolog/SkillBridge_AI` w `origin` przekierowuje — to to samo repo).
- **Środowisko:** Node 25.6.0, pnpm 10.29.2, Next 16.2.9. Baza lokalna: kontener
  `skillbridge-postgres` (:5432) — NIE twórz nowego. Trzy pliki env; wejście na prod
  zawsze jawne: `pnpm dotenv -e .env.prod -- …`.
- **Baseline `main` (`04f9eca`):** build OK, tsc 0, Biome 0, unit **1166/1166**;
  pełna bramka CI zielona na #164/#169/#170.
- **Migracje: lokalna = 0036, prod = 0036** (pełna parzystość, dziennik 37/37).
  **Kolejka migracji prod: PUSTA.**

### Oliver ma teraz dostęp do prod DB (2026-07-13)
- `NEON_API_KEY` w `.env.prod` (dodał Darek) + allowlista w
  `.claude/settings.local.json`: `pnpm dotenv`, `pnpm db:migrate`,
  `pnpm db:ingest-curriculum`, `npx neonctl`.
- **Migracje robię sam z terminala** — Neon CLI potrzebne TYLKO do backupu gałęzią
  i rollbacku; sama migracja idzie przez `.env.prod` + `CONFIRM_PROD_DB=1`.
- **Wzorzec wykonany 2026-07-13 (powtarzać):** backup gałęzią Neona →
  kontrola dziennika PRZED (`__drizzle_migrations` vs `_journal.json`) →
  `pnpm dotenv -e .env.prod -- bash -c 'CONFIRM_PROD_DB=1 DATABASE_URL="$DATABASE_URL_UNPOOLED" pnpm db:migrate'`
  (**DIRECT, nie pooler**; drizzle-kit sam wpisuje hash do dziennika — koniec
  z ręcznym INSERT-em z runbooków i ryzykiem rozjazdu) → weryfikacja obiektów.
- Guard `assertTestDb`: hard-deny na fragment `skill-bridge-ai` NIE łapie prod-DSN
  (fragment siedzi w `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL`, nie w `DATABASE_URL`).

### Faza 0 — ZAMKNIĘTA · Faza 1 — KODOWO DOMKNIĘTA
Bloki AG, B8, B6, A5, C11, B7 zamknięte; A5/C11/B7 + 1.17/1.18 LIVE na prodzie.
Szczegóły: `git log` i wcześniejsze snapshoty tego pliku.

### Faza 1E — pilotaż DS

- **1E.1 ✅ LIVE** — model danych curriculum + drabina (0035, flaga ON).

- **1E.2 ✅ LIVE NA PRODZIE — PEŁNA DRABINA (2026-07-13).**
  - Migracja **0036** wykonana na prodzie PRZED mergem #164 (trasa answer czyta
    nową kolumnę): dziennik 37/37, `when` zgodny, kolumny `curriculum_module_items.slug`
    + `question_items.option_feedback_json`, UNIQUE INDEX `(module_id, slug)`,
    backfill slugów 4/4, granty OK (`question_items` = wariant DENY).
    Backup: gałąź Neona **`prod-backup-pre-0036-20260713-1712`**.
  - **#164** (mechanika) → merge. **#165 ZAMKNĄŁ SIĘ SAM** przy mergu #164 (GitHub
    zamyka PR, gdy znika jego gałąź bazowa — PR-y były stacked) → wystawiony
    następca **#169** z tej samej gałęzi na `main` → merge. Konflikt add/add
    w `tools/ingest-curriculum.ts` rozwiązany na korzyść gałęzi (nadzbiór z fixem
    `canonicalJson` — idempotencja feedbacku).
  - **#170** — spakowane **5 modułów M-\*** (M-PD/M-EDA/M-SQL/M-ML/M-LLM):
    33 atomy + 5 pozycji przeglądu = 38 pozycji, 72 pytania, 24 koncepty.
    Poprawka formatu w treści: `M-EDA/EDA.2` — akapit „Atom zalicza quiz (M10)…"
    stał PO opcjach pytania (parser doklejał go do feedbacku opcji D) → przeniesiony
    do teorii. Jedyne takie miejsce w 9 dokumentach.
  - **STAN PROD:** 9 modułów, **70 pozycji, 0 modułów pustych**, 273 pytania
    (144 diagnostyczne + 129 curriculum), 67 konceptów, 129 z feedbackiem per opcja,
    0 duplikatów `(module_id, slug)`. Smoke: `/` 200, `/login` 200,
    `/api/curriculum` 401. Ingest idempotentny (drugi bieg: +0 nowych).
  - ⚠ **Laby są NIEKOMPLETOWALNE do 1E.6** (brak checków automatycznych) — całe L0
    to laby. **Onboarding realnych studentów dopiero po 1E.6.** Do tego czasu drabina
    służy podglądowi treści i atomom `exercise`.
  - ⚠ **TODO treściowe Sophii sprzed ingestu wciąż otwarte** (sekcje „Notatki dla
    Olivera" w `docs/curation/sophia-1e2-*.md`). Nie blokowały pakowania; blokują
    dopiero realny onboarding (razem z 1E.6). **Inwentaryzacja 2026-07-13:**
    - **Notebooki Colab — 66 szt.** (L0=4, F1=7, F2=7, F3=8, M-PD=9, M-EDA=4,
      M-SQL=9, M-ML=9, M-LLM=9). W repo **nie ma ani jednego `.ipynb`** — budowa
      od zera. **ŚWIADOMIE ODŁOŻONE DO 1E.6** (decyzja Darka 2026-07-13) — powód
      niżej, w kolejce.
    - **Screenshoty UI:** L0 (2 etykiety: pełny tytuł ostrzeżenia o cudzym notebooku
      + dokładny format nazwy kopii „Kopia…"), M-EDA (Colab↔GitHub, EDA.2),
      M-LLM (panel Secrets). Wymagają konta Google — **akcja Darka albo sterowanie
      jego Chrome** (agent nie ma konta).
    - **Wideo PL:** 8 seansów kontrolnych (L0, F1, F2, F3, M-PD, M-EDA ×2, M-ML ×3,
      M-LLM ×2 — URL-e i timestampy w tabelach zasobów) + **1 realny research
      niezrobiony: M-SQL** (wideo PL SQL + weryfikacja URL `duckdb.org/docs`).
      ⚠ **Agent nie ogląda wideo** — może najwyżej zweryfikować transkrypt/opis/
      rozdziały/żywotność URL; „seans" pozostaje akcją człowieka.
  - **Do zrobienia:** sign-off Ryana dla **rls-matrix v0.27**.

- **1E.R ✅ DOMKNIĘTE KODOWO (#168)** — partia naprawcza projektów DS (ADR-014 D7).
  21/21 zasobów z kompletem metadanych (`license`/`language`/`registrationRequired`/
  `verifiedAt`) → **dług QG-5 §3/§4/§7 spłacony**; 0 placeholderów PENDING (blokowały
  ingest — `validateUrl` woła `new URL()`); **0 zasobów wymagających karty**.
  Usunięty Microsoft Learn z `ds-chmura`: darmowe sandboxy Microsoft Learn **WYCOFANE**,
  ćwiczenia wymagają subskrypcji Azure (karta) — ten sam błąd, dla którego 1E.R powstało.
  Sprostowane licencje Gemini (CC BY 4.0, nie „własnościowa"; portale deweloperskie
  Google publikują na CC BY 4.0 — każde „własnościowa" przy `ai.google.dev` podejrzane).
  **CZEGO BRAKUJE:** QG-1…7 (wymóg ADR-014 D7) + ingest 1E.R na prod
  ([CZERWONA LINIA], ADR-010).

### NASTĘPNE (kolejność)
1. **1E.6** — checki automatyczne labów. **Bez tego nie ma onboardingu studentów**
   (całe L0 = laby). Największy bloker produktowy.
   **Pierwsza decyzja 1E.6 = kontrakt tokenu pieczątki — ona odblokowuje 66 notebooków.**
   `sophia-1e2-l0-atomy.md:747` odkłada „finalny kształt funkcji tokenu" właśnie tu,
   a każdy notebook kończy komórką-pieczątką, która tę funkcję zawiera → pisanie
   notebooków PRZED tą decyzją = ryzyko przepisania 66 plików. Dlatego notebooki
   czekają na 1E.6, nie odwrotnie.
   **Rekomendacja projektowa (Sophia 2026-07-13):** rozdzielić w pieczątce dwie
   warstwy — (a) *check per atom* (logika treściowa, różna w każdym notebooku,
   definicje w sekcjach „Zaliczenie" dokumentów Sophii) i (b) *derywacja tokenu*
   (jeden wspólny blok, identyczny we wszystkich 66). Wtedy zmiana decyzji o funkcji
   tokenu = mechaniczna podmiana jednego bloku, a nie rewrite treści.
   Znane limity mechanizmu (świadome, na pilot) — `sophia-1e2-l0-atomy.md:747-760`.
2. **QG-1…7 partii 1E.R** → ingest 1E.R na prod (czerwona linia).
3. **1E.3** (egzaminy modułowe + mastery gate) — treść egzaminów JEST w plikach
   Sophii, packer jej nie parsuje (świadomie, poza zakresem 1E.2).
4. **1E.4** (spaced repetition) — bank pytań z 1E.2 gotowy (273 pytania).
5. Sign-off Ryana: rls-matrix v0.27.

### Otwarte zaległości (akcje Darka, nie kod)
- **0.7-sekret** — skasować tokeny `skillbridge-prod-repo-read` (2026-07-10 i stary
  z 2026-06-29); wystawić świeży fine-grained public-read i podmienić env.
- **0.13 CSP** — potwierdzić PR #121 (CSP enforce + drop `unsafe-eval`) na Preview/prod
  albo rollback. Runtime CSP niewykrywalny lokalnie.
- **Baza testowa integration** — :5433 na iMacu NIE działa; `pnpm test:integration`
  lokalnie nie ruszy bez ręcznego setupu (bramką jest CI). Rozważyć stały compose.
- **Dependabot** — otwarte PR-y: #167, #127, #88, #87, #86, #83.

### Ostrzeżenia / kontekst dla nowej sesji
- **Tryb Wykonawca/Audytor PORZUCONY NA ZAWSZE** (2026-07-07) — jeden agent
  implementuje i weryfikuje.
- **Nie trzymać repo pod iCloud** — kasuje nie tylko `.next`, ale i obiekty `.git`
  oraz pliki typu `.vercel/project.json`. „Plik zniknął sam" = pierwszy podejrzany.
- **Merge stacked PR-ów:** `--delete-branch` na dolnym PR-ze ZAMYKA górny (jego baza
  znika) i reopen jest niemożliwy → wystawić nowy PR z tej samej gałęzi.
- **Ingest na prod = [CZERWONA LINIA]:** sign-off + backup gałęzią Neona +
  transakcyjny SQL (ADR-009/010).
- **Migracja przed deployem:** gdy nowy kod czyta obiekt ze swojej migracji, migracja
  prod MUSI wyprzedzić merge (Vercel auto-deployuje z `main`).
- **Vercel env = `sensitive`:** `vercel env pull` pokazuje `""` dla wszystkich zmiennych,
  także działających — artefakt pulla, nie stan flagi; dowód tylko funkcjonalny.
- „Partie 0–5" w starszych handoffach to tor **10 poprawek**, NIE partie treści B3 ani
  fazy 0–3 z roadmapy — nie mylić numeracji.
- **Reguła twarda:** handoff i commity **pushować** na koniec sesji.

---

## Konwencja pliku
- Aktualizuj **tylko** sekcję „STAN NA DZIŚ" (zastąp snapshotem), datę w nagłówku.
- Commituj selektywnie (sam ten plik) i **push** na koniec sesji.
- Historia poprzednich stanów: `git log -- docs/SESSION_HANDOFF.md`.
