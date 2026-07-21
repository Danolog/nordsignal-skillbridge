# Roadmap wdrożenia: Fazy 0–3 + warstwa edukacyjna (pilotaż Data Science)

> Źródło prawdy dla sekwencji zadań po audycie (2026-07). Wersja 2 — dodana
> **Faza 1E: pełna ścieżka edukacyjna** (A1–A4) z pilotażem na kierunku
> **Data Science**, oraz korekty priorytetów w F2/F3 (D14→P0, D16, C12).
> Nowe/zmienione względem wersji 1 oznaczone **[NOWE]** / **[ZMIANA]**.
>
> **Wersja 3 (2026-07-14) — synchronizacja z rzeczywistością.** Plik był zamrożony
> od 2026-07-03 i rozjechał się z ADR-014 oraz ze stanem kodu. Zmiany: statusy
> wykonania w Fazie 1E, **rozbicie przeciążonej etykiety 1E.6 na 1E.6a (UI) i 1E.6b
> (checki labów + kontrakt tokenu)**, dopisanie **1E.R/1E.R2** (ADR-014 D7),
> aktualizacja kręgosłupa w §7 i wpisu 0.13. Oznaczone **[AKTUALIZACJA 2026-07-14]**.
> Statusy Fazy 0/1/AG zweryfikowane w kodzie (plik + commit + test + flaga), nie w opisach.
>
> **[AKTUALIZACJA 2026-07-21] Pakiety MIS („Make It Stick").** Dokument Darka
> z propozycjami ulepszeń porównany z tym planem — większość propozycji już
> pokryta (1E.3/1E.4, ADR-014, B5); luki domykają pakiety **MIS.1–MIS.8**
> w `13-make-it-stick.md` (sekcja 4-ter niżej). Jedyny twardy warunek
> kolejności: **MIS.1 (sonda pewności) przed 1E.4**.

---

## 1. Metodyka (jak wykonać)

**Zasada sekwencji.** Jedno atomowe zadanie = jedna gałąź = jeden PR. Zadanie
N+1 nie startuje, dopóki bramka zadania N nie jest zielona na main. Zadania
oznaczone „równolegle" mogą iść współbieżnie.

**Uniwersalna Bramka (DoD) — dziedziczona przez KAŻDE zadanie:**
1. `pnpm build` — 0 błędów (tsc + Next).
2. `pnpm lint` — 0 ostrzeżeń (Biome).
3. `pnpm test:run` — wszystkie testy zielone, w tym nowy test regresyjny zadania.
4. Dowód red-green — dla poprawek: test, który pada przed zmianą i przechodzi po.
5. Zmiany widoczne dla użytkownika: `pnpm test:e2e` + weryfikacja na Preview (Vercel).
6. Zmiany DB: migracja addytywna, `db:migrate` czysto na testowej bazie (guard
   assert-test-db), idempotencja, zgodność wstecz; każda nowa tabela ma politykę
   RLS + decyzję o GRANT dla app_faculty (ADR-002/004 — kolumny samooceny/PII
   nie wyciekają do wykładowcy).
7. Rollback udokumentowany (flaga off / revert PR / migracja addytywna).

**Narzędzia:** Neon branching do testu migracji na danych prod (⚠ patrz też:
rozjazd dziennika drizzle — przed prod `db:migrate` porównaj
`drizzle.__drizzle_migrations` z `_journal.json`; incydent 2026-07-02, wzór
naprawy: `tools/fix-drizzle-journal-0019.sql`). Feature flags = deploy ≠
release (wszystko kosztowne/ryzykowne za flagą). Preview per PR.
**[CZERWONA LINIA]** = nowe źródło danych / usługa zewnętrzna / DDL na prod →
jawny sign-off Darka + backup Neona (gałąź) + transakcyjny SQL (ADR-009/010).

**Treści edukacyjne** (bank zadań, teoria, kuracja źródeł) NIE wchodzą zwykłym
PR-em kodu: obowiązuje proces jak przy DS partia 1 — kontrakt struktury
(Ethan), krytyczna weryfikacja agentami, bramki QG-1…7, audit log ingestu
(wzorzec ADR-010).

---

## 2. FAZA 0 — Stabilizacja (bezpieczeństwo + integralność + obserwowalność)

Cel: fundament zdolny bezpiecznie unieść funkcje H1 i warstwę edukacyjną.
Wejście do Fazy 1/1E dopiero po zamknięciu HIGH/MEDIUM z audytu.

- **0.0 ✅ WYKONANE (2026-07-02, PR #98)** · Obserwowalność kosztu i błędów AI —
  `ai_usage_ledger` + wrapper `withAiUsage`/`streamUsageTracker`
  (src/lib/ai/usage.ts), raport `tools/report-ai-usage.ts`. Migracja 0020 na
  prodzie, RLS zweryfikowane.
- **0.1 ✅ WYKONANE (2026-07-02, PR #102)** · Rate limiting fail-closed w produkcji
  (HIGH) — brak Upstash w prod → twardy sygnał, nie success:true.
  `src/lib/rate-limit.ts` (`assertRateLimitConfigured`) + boot-check
  `src/instrumentation.ts`.
- **0.2a ✅ WYKONANE (2026-07-02, PR #105)** · Remediacja duplikatów zgłoszeń
  (prekursor 0.2b) — `tools/remediate-duplicate-submissions.ts` (dry-run/
  --execute, ochrona dzieci przez przepięcie, wykrywanie konfliktów). Dry-run na
  prodzie 2026-07-02: brak duplikatów.
- **0.2b ✅ WYKONANE (2026-07-02, PR #107)** · Unikat (studentId, projectId) +
  onConflictDoUpdate (HIGH). Migracja 0021 na prodzie (backup gałęzią Neona
  `prod-backup-pre-0021-20260702-182815`), NULL-safe merge jsonb w submit +
  brief. Kolejność: migracja PRZED merge (ON CONFLICT wymaga indeksu).
- **0.3 ✅ WYKONANE (2026-07-03, PR #110)** · Transakcja w generate-gaps (HIGH) —
  wszystkie mutacje + odczyt pokrycia w jednej `db.transaction`, LLM poza tx.
  Follow-up: to samo domknięte w `persistMarketGaps` (PR #111).
- **0.4 ✅ WYKONANE (2026-07-03, PR #112)** · matchProjects IDOR — guard własności+tenanta
  luki (obcy gapId → generyczne „Gap not found"). Marketplace globalny (projects bez tenantId).
- **0.5 ✅ WYKONANE (2026-07-03, PR #113)** · faculty/dashboard: rate-limit per tenant
  (aiLight) + cache sugestii LLM (in-memory TTL 10min, tylko udana generacja).
- **0.6 ✅ WYKONANE (2026-07-03, PR #114)** · Utwardzenie sanitizeForPrompt — breakout
  delimitera (`user_input`→`user input`), C1/U2028-29, zero-width/bidi.
- **0.7 · CZĘŚCIOWO** [CZERWONA LINIA — sekret prod]:
  - **0.7-kod ✅ WYKONANE (2026-07-03, PR #115)** · weryfikacja repo publicznego
    (gate `meta.private` + krok 4 tylko gdy content.ok) — obrona confused-deputy.
  - **0.7-sekret ⏳ DAREK (prod):** rotacja `GITHUB_TOKEN` na fine-grained public-read.
- **0.8 ✅ WYKONANE (2026-07-03, PR #116)** · Usunięcie martwego review-submission.ts;
  ReviewResult/ReviewSchema przeniesione do pipeline/types.ts. Walidacja LLM = SemanticOutputSchema.
- **0.9 ✅ WYKONANE (2026-07-03, PR #117)** · Timeouty wywołań LLM — `abortSignal`
  (45s) na wszystkich 11 wywołaniach + `src/lib/ai/timeout.ts`.
- **0.10 ✅ WYKONANE (2026-07-03, PR #118)** · Równoległe pobieranie blobów (chunki
  Promise.all, concurrency 6), identyczna semantyka pakowania.
- **0.11 ✅ WYKONANE (2026-07-03, PR #119)** · Limit sesji Pomocnika `MAX_SESSIONS_PER_DAY=10`
  w oknie 24h (check w tx przed zamknięciem aktywnej → 429).
- **0.12 ✅ WYKONANE (2026-07-03, PR #120)** · Limit stron PDF `getText({ first: 40 })`
  (tnie parsowanie, nie tylko output).
- **0.13 ✅ KODOWO — PR #121 ZMERGOWANY; ⏳ weryfikacja runtime (Darek)** [AKTUALIZACJA
  2026-07-14] · CSP enforce + drop unsafe-eval (unsafe-inline zostaje) — `next.config.ts:11-21`.
  Runtime CSP niewykrywalny lokalnie → zostaje wyłącznie potwierdzenie na Preview/prod.
  Follow-up: pełne usunięcie unsafe-inline = migracja na nonce w middleware.
- **0.14 ✅ WYKONANE (2026-07-03, PR #122)** · Guard `assertTestDb` w run-sql-file (.mjs→.ts)
  + testy guarda (był nietestowany). `tools/fix-drizzle-journal-0019.sql` już w repo.
  Follow-up (Darek, prod-ops): guard dla k3-validate.ts (INSERT sondy do audit_log) i
  activate-app-runtime.ts.
- **0.15 ✅ WYKONANE (2026-07-04)** · Paczka LOW — oryginalna lista audytu 2026-07 była
  nieodtwarzalna (brak w repo/historii); zregenerowana świeżym przeglądem (3 soczewki:
  bugi/martwy kod/walidacja), zakres zaakceptowany przez Darka. A1 (obejście capu sesji
  przez /restart — podniesione ponad LOW) osobnym PR #124; paczka B1–B8/C1–C5/D1–D6/E1–E2
  (21 pozycji: hardening API, drobne bugi, −1400 linii martwego kodu, follow-upy audytów)
  jednym PR. Bonus: naprawa 2 zaszłych błędów tsc (czerwony typecheck na main).
- **0.16 ✅ WYKONANE (2026-07-03)** · Synchronizacja dokumentacji (ten wpis) + deps-scan
  jako bramka blokująca: job `deps-scan` w `.github/workflows/pr.yml` (`pnpm deps:scan` =
  `pnpm audit --audit-level high`) już blokuje PR na high/critical; secret-scan (gitleaks) też.

---

## 3. FAZA 1 — Horyzont 1 „Dowód działa" (funkcje weryfikacji)

Wejście: Faza 0 zielona. Cel: receipt obronny wobec sceptycznego rekrutera.

> **[NOWE — restart F1]** Pierwsza akcja przy wznowieniu Fazy 1: **AG.0 — harness
> ewaluacyjny gap detection** (Blok AG, §4-bis). Bez zmierzonej jakości wykrywania
> luk każda funkcja budowana wyżej (powiadomienia, doradca) wzmacnia błędy. AG.0
> nie ma zależności — może ruszyć natychmiast, równolegle do 1.0/1.1. Dalej wg
> ścieżki krytycznej: 1.0 → 1.1, a warstwa agentowa (AG.1+) po 1.1.

- **1.0** · Migracja modelu kariery JSON→DB (P0, prerekwizyt 1E.0/D17/E19)
  [CZERWONA LINIA]. Test: model z DB identyczny bajtowo z JSON.
- **1.1** · System feature flags + szkielet (P0). Flaga off = zero zmian.

**Blok B8 — Recenzja człowieka** (tabele z migracji 0019):
- **1.2** · Decyzja „kto ocenia w Becie" [SIGN-OFF Darek/Sophia] → ADR. Blokuje 1.3–1.5.
- **1.3** · API kolejki recenzji (needsHumanReview, auth + RLS/tenant).
- **1.4** · API approve/reject — transakcyjnie, idempotentnie, audit.
- **1.5** · UI kolejki + akcje (E2E).
- **1.6** · Plakietka „Oceniał człowiek" na receipcie wg reviewerType.

**Blok B6 — Sandbox:**
- **1.7** · Design spike + ADR sandbox [CZERWONA LINIA — usługa zewnętrzna].
- **1.8** · Integracja runnera za flagą (ukryte test-suites per deliverableType);
  koszt ograniczony budżetem z 0.0.
- **1.9** · runOk do pipeline'u (krok 2/5) — fail-closed zachowane.

**Blok A5 — Diagnoza zamiast samooceny** (P0; domyka też wejście bez sylabusa):
- **1.10** · Migracja verifiedByMethod — CHECK + 'diagnostic'.
- **1.11** · Silnik testu adaptacyjnego + bank pytań. **[ZMIANA]** Wymóg
  projektowy: bank pytań wspólny z warstwą edukacyjną — te same encje mają
  służyć egzaminom modułowym (1E.3) i powtórkom spaced repetition (1E.4).
  Deterministyczne mapowanie odpowiedzi → poziom kompetencji.
- **1.12** · Wpięcie w onboarding: równorzędna ścieżka wejścia bez sylabusa
  (diagnoza → mapa kompetencji). **[ZMIANA]** Wynik diagnozy musi być
  reprezentowalny jako placement w curriculum (konsumuje 1E.7).

**Blok C11 — Tutor sokratyczny** (P0, za flagą):
- **1.13** · Endpoint tutora z guardrailami (brief+rubryka+repo z kroku 1
  pipeline'u; wzorzec Pomocnika: filtr, sędzia; nie podaje rozwiązań;
  rate-limit + budżet z 0.0). **[ZMIANA]** Kontekst rozszerzony o teorię
  modułu (1E.1/1E.5), gdy curriculum aktywne.
- **1.14** · Panel czatu w widoku projektu (E2E; licznik kosztu rośnie).

**Blok B7 — Obrona ustna AI** (za flagą):
- **1.15** · Design spike viva [SIGN-OFF]. Blokuje 1.16.
- **1.16** · Krok 6 pipeline'u: odpytanie o własny kod.

**Cross-cutting:**
- **1.17** · Instrumentacja placement rate (P1, start z 1. kohortą — dane
  nieodtwarzalne wstecz). Zgoda studenta (RODO).
- **1.18** · C13: rytm/accountability (P1) — deklaracja godzin/tydzień,
  harmonogram, check-iny, streak, powiadomienia o zastoju. **[ZMIANA]**
  Harmonogram spina się z modułami curriculum (1E.6), nie tylko projektami.

**Bramka wyjścia F1:** receipt = sandbox (1.9) + obrona (1.16) + recenzja
człowieka (1.5); zero mapy wyłącznie z samooceny (1.12) **[ZMIANA — decyzja
Darka 2026-07-08 przy 1.11: kryterium zawężone do ścieżki pilotażowej DS
(spójnie z pilotażem 1E); pozostałe ścieżki mają samoocenę jako jawny
fallback do czasu kuracji banku pytań (diagnoza degraduje do `uncovered`,
nie udaje pomiaru)]**; model kariery w DB (1.0); placement mierzony (1.17).

---

## 4. **[NOWE]** FAZA 1E — Pełna ścieżka edukacyjna (pilotaż Data Science)

**Teza:** przejście od „marketplace projektów" do „pełnej ścieżki edukacyjnej":
sekwencja modułów (teoria + ćwiczenia + projekt + egzamin), fundamenty CS/matmy,
mastery learning z utrwalaniem (spaced repetition), kuracja darmowych źródeł
światowej klasy zamiast pisania własnych wykładów.

**Zakres pilotażu: WYŁĄCZNIE ścieżka Data Science.** Fundament treściowy już
istnieje (DS partia 1: 10 projektów + faza E, kontrakt Ethana, QG). Rollout na
kolejne ścieżki dopiero po bramce wyjścia 1E i po E2.C (półautomatyczna
kuracja) — ręczna kuracja nie skaluje się na 21 ścieżek.

**Wejście:** Faza 0 zielona + 1.0 (model kariery w DB) + 1.1 (flagi).
Strumień może biec równolegle do bloków B6–B8 z Fazy 1 (inne pliki, inne
kompetencje zespołu); punkty styku z 1.11/1.12 wskazane niżej.

> **[AKTUALIZACJA 2026-07-14 — synchronizacja z rzeczywistością]** Ta sekcja była
> zamrożona od 2026-07-03 i rozjechała się z ADR-014 oraz stanem kodu. Korekty:
> 1. **1E.0 / 1E.1 / 1E.2 / 1E.R — WYKONANE** (statusy przy pozycjach).
> 2. **1E.6 było etykietą PRZECIĄŻONĄ.** Roadmapa (i kod) rozumiały ją jako *UI
>    drabiny*; ADR-014 (D3/D10/pkt 11) i handoffy jako *checki automatyczne labów*.
>    **Oba zakresy są otwarte** — nic nie zostało po cichu dostarczone. Rozbite
>    poniżej na **1E.6a** (UI) i **1E.6b** (checki + kontrakt tokenu).
> 3. **1E.R** (partia naprawcza projektów DS, ADR-014 D7) nie istniało w tej
>    roadmapie — dopisane niżej. Otwarty następca: **1E.R2**.
> 4. ⚠ **1E.1 dostarczyło wyłącznie API** (`/api/curriculum/*`). UI drabiny NIE
>    ISTNIEJE — zero plików `.tsx` z curriculum; `tests/e2e-pw/60-1e1-curriculum.spec.ts`
>    sam to przyznaje: *„feature jest API-only do 1E.6"*. Skutek: treść 1E.2
>    (9 modułów, 70 pozycji) leży na produkcji i **nie ma jak jej zobaczyć**.

- **1E.0 ✅ WYKONANE (2026-07-11)** · Design spike curriculum (A1) [SIGN-OFF Darek/Sophia — decyzja
  dydaktyczna, nie techniczna]. Encje `curriculum_modules` / pozycje modułu
  (teoria, ćwiczenia, projekt, egzamin) / prerekwizyty BLOKUJĄCE (dziś prereqi
  tylko ważą matching — mają wymuszać kolejność). Wzorzec: MIT OCW / CS50
  (wykład → problem set → projekt). Definicja relacji do istniejących encji
  (projects, project_learning_resources.theoryMd, project_competencies).
  Time-box, wyjście = ADR. Blokuje 1E.1–1E.7.
  **Wyjście: `docs/decisions/014-curriculum-sciezka-edukacyjna.md` (ADR-014), sign-off Darka.**

- **1E.1 ✅ WYKONANE — LIVE na prodzie (migracja 0035)** · Model danych curriculum
  + migracje (A1) — addytywne, RLS wg DoD.
  Moduły DS spinają istniejące projekty z partii 1 w drabinę; egzekwowanie
  prereq w API (blokada zapisu do modułu bez zaliczenia poprzedniego — za
  flagą `curriculumPath`). Dowód: test — student bez zaliczonego modułu N nie otworzy N+1;
  z flagą off zachowanie jak dziś.
  ⚠ **Dostarczone WYŁĄCZNIE API** (`src/app/api/curriculum/*`, `src/lib/curriculum/ladder.ts`).
  UI drabiny = osobne zadanie **1E.6a** (niżej).

- **1E.2 ✅ WYKONANE — LIVE na prodzie (migracja 0036; PR #164/#169/#170)** ·
  Fundamenty CS/matmy — model + partia 1 DS (A2, P0). Stan: 9 modułów, 70 pozycji,
  67 konceptów. Otwarty dług treściowy: **66 notebooków Colab** (0 `.ipynb` w repo)
  — zablokowany kontraktem tokenu z **1E.6b**; plus screenshoty UI i seanse wideo
  (akcje Darka). Osobny trzon
  „Fundamenty" wspólny dla rodzin ścieżek: bank zadań o jednoznacznych
  odpowiedziach (zamknięte/numeryczne/krótka forma) + **deterministyczny
  autograding** (bez LLM — zadania mają jednoznaczne odpowiedzi; koszt ~0).
  Pilotaż DS: statystyka, algebra liniowa, Python + struktury danych.
  Treści przechodzą proces QG (kontrakt Ethana, weryfikacja agentami, audit
  ingestu jak ADR-010) [CZERWONA LINIA — ingest na prod]. Punkt styku: wspólny
  model banku pytań z 1.11 (jedna encja, dwa konsumenty).
  Dowód: kontrakt-test treści (jak content-ds-projects.contract.test.ts) +
  test autogradera (poprawna/niepoprawna/brzegowa odpowiedź).

- **1E.3 · Egzaminy modułowe + mastery gate (A3a, P1)**. Zasada mastery: próg
  opanowania (parametr per moduł, default 90%) zamiast zaliczenia 50%;
  niezaliczony egzamin → powtórka z INNYM wariantem zadań (bank z 1E.2 musi
  mieć warianty per koncept); wynik egzaminu odblokowuje prereq z 1E.1.
  Dowód: test — wynik < progu nie odblokowuje modułu; drugi wariant nie
  powtarza zadań pierwszego.

- **1E.4 · Spaced repetition dla teorii (A3b, P1)** — mechanizm utrwalania:
  wiedza z modułu 1 ma przetrwać do modułu 12. Scheduler **FSRS (fallback
  SM-2)** — algorytm deterministyczny, biblioteka przez deps-scan (bramka
  0.16), zero kosztu LLM w pętli powtórek; pytania z banku 1E.2 (+ po
  projektach: koncepty z receiptu trafiają do kolejki powtórek). Widok „dzisiejsze
  powtórki" + zaległości wpięte w check-iny 1.18. Dowód: test — poprawna
  odpowiedź wydłuża interwał, błędna skraca (golden test przeciw referencyjnej
  implementacji FSRS); powtórka nie generuje wywołania LLM.
  **[AKTUALIZACJA 2026-07-21] Warunek wstępny: MIS.1 (sonda pewności) + naprawa
  długu hintDepth PRZED startem 1E.4** — FSRS ma konsumować `confidence`
  i wiarygodny `hintDepth` jako cechy od dnia 1 (patrz `13-make-it-stick.md`).

- **1E.5 · Kuracja treści zewnętrznych na całe curriculum DS (A4, P1)** —
  obniża koszt A1: nie piszemy wykładów, sekwencjonujemy najlepsze darmowe
  (MIT OCW, CS50, fast.ai, karpathy, StatQuest). Rozszerzenie
  project_learning_resources na pozycje modułów + AI-generowane „mostki"
  (czego szukać w źródle i po co — generowane RAZ per moduł, cache w DB,
  koszt widoczny w ai_usage_ledger). Licencje źródeł weryfikowane jak w DS
  partia 1. **Zastępuje E2.I z wersji 1 planu.**
  Dowód: test — mostek serwowany z cache przy drugim odczycie (0 wywołań LLM);
  każda pozycja kuracji ma źródło+licencję.

- **1E.6a · UI ścieżki: drabina modułów (A1)** [ROZBITE 2026-07-14 — patrz nota
  na górze sekcji] — widok curriculum DS: postęp, blokady prereq,
  teoria/ćwiczenia/lab/projekt/egzamin per moduł; za flagą. Konsumuje **istniejące**
  API z 1E.1 (`getLadder`, `isModuleUnlocked`, `getModuleItems`) — zero nowych tras,
  zero migracji. Pozycja `lab` renderuje się jako zablokowana do czasu 1E.6b.
  Dowód: E2E — student widzi drabinę, moduł zablokowany do zaliczenia
  poprzedniego, wejście w moduł pokazuje pozycje.

- **1E.6b · Checki automatyczne labów + kontrakt tokenu pieczątki (A1)** [NOWE
  2026-07-14 — zakres wprowadzony przez ADR-014 D3/D10/pkt 11, wcześniej ukryty
  pod przeciążoną etykietą „1E.6"]. **Największy bloker produktowy — całe L0 to laby,
  a `POST /api/curriculum/items/[id]/complete` zwraca dla nich `501`.**
  - Wyjście spike'u = **ADR kontraktu tokenu** [SIGN-OFF]: laby L0–F3 = pieczątka
    licząca check deterministycznie **w sesji Colab** (0 LLM, bez sandboxa);
    kamienie capstone'ów wymagające URUCHOMIENIA kodu studenta = **reuse sandboxa 1.9**
    (`src/lib/sandbox/run-hidden-tests.ts`).
  - Kontrakt `configJson.checks` per pozycja (hak zarezerwowany w schemacie).
  - **Rozdzielenie warstw:** *check per atom* (treść) oddzielony od *derywacji tokenu*
    (jeden wspólny blok we wszystkich notebookach) — inaczej zmiana decyzji o tokenie
    = rewrite 66 notebooków.
  - **Jawny limit:** token jest podrabialny (funkcja widoczna w komórce). Świadomie
    zaakceptowane — laby **bramkują postęp, nie wystawiają kredencjału**; receipt
    nadal wymaga sandboxa + vivy + recenzji człowieka (ADR-014 D3 wariant C; od
    2026-07-14 wzmocnione flagą `passportVerifiedOnly`).
  - **Odblokowuje 66 notebooków Colab** (dług treściowy 1E.2).
  Dowód: poprawny token zalicza lab; token z innego atomu/studenta odrzucony;
  flaga off = zachowanie jak dziś.

- **1E.R ✅ WYKONANE — LIVE na prodzie (PR #168; QG: GO; ingest 2026-07-13/14)**
  [NOWE 2026-07-14 — zadanie wprowadzone przez **ADR-014 D7**, nie istniało
  w pierwotnej numeracji roadmapy; wykonywane równolegle z 1E.1/1E.2, „przed 1E.5"] ·
  Partia naprawcza projektów DS: komplet metadanych zasobów
  (`license`/`language`/`registrationRequired`/`verifiedAt`), usunięcie źródeł
  wymagających karty → **dług QG-5 §3/§4/§7 spłacony**.
  **Otwarty następca: 1E.R2** (z Sophią) — m.in. kryterium rubryki wymuszające CI
  dla `ds-chmura` (projekt przyznaje CI/CD `required` bez kryterium, które CI egzekwuje).

- **1E.7 · Placement diagnozy w curriculum (A5-domknięcie)** — wynik testu
  adaptacyjnego (1.11/1.12) mapuje studenta na pozycję startową w drabinie DS
  (moduły „zaliczone przez diagnozę" oznaczone verifiedByMethod='diagnostic').
  Dowód: E2E — student bez sylabusa: diagnoza → start od modułu adekwatnego
  do wyniku, nie od zera.

**Bramka wyjścia 1E (pilotaż DS):** student bez sylabusa przechodzi diagnozę →
placement → moduł (teoria z kuracji + ćwiczenia z autogradingiem + **lab zaliczany
checkiem automatycznym** + projekt + egzamin) → mastery gate ≥ progu → powtórki FSRS
utrzymują wiedzę; tutor (1.13) zna kontekst modułu; całość za flagą; koszt per student
w ai_usage_ledger mieści się w założeniach P&L. Decyzja o rollout'cie na kolejną
ścieżkę = osobny sign-off po przeglądzie metryk pilotażu.
**[AKTUALIZACJA 2026-07-14] Warunek wstępny onboardingu realnych studentów:** 1E.6a
(student widzi drabinę) + 1E.6b (laby są kompletowalne) + 66 notebooków Colab.
Bez tego kompletu drabina jest niewidoczna i nieprzechodnia — całe L0 to laby.

---

## 4-bis. **[NOWE]** BLOK AG — Warstwa agentowa (eval + proaktywny rynek + doradca z pamięcią)

**Teza:** przejście od „analizy luk na żądanie" do **procesu, który sam nadąża za
rynkiem** — cykliczne odświeżanie danych, deterministyczny recompute luk,
powiadomienie „pojawiła się nowa luka", oraz doradca pamiętający studenta między
sesjami. Fundamentem jest **eval**: gap detection musi mieć zmierzoną jakość,
zanim cokolwiek zbudujemy na wierzchu.

**Korekta platformowa (WAŻNE — unikanie ślepego zaułka):** „Routines" i „Dynamic
Workflows" z warsztatów Anthropic to **narzędzia deweloperskie Claude Code, NIE
runtime produktu** — nie da się ich wywołać z API route Next.js. Produktowe
odpowiedniki, których używamy tutaj:
- harmonogram „bez laptopa" → **Vercel Cron** (wpis `crons` w `vercel.json`);
- fan-out + weryfikator → **Messages API (ai-sdk) + `Promise.all`** w API route;
- pamięć doradcy → **Postgres** (źródło prawdy), nie Managed Agents memory store;
- Managed Agents API świadomie **odłożone** (nowa zależność w becie, [CZERWONA
  LINIA] usługi zewnętrznej) — wracamy do tematu, gdy pojawi się potrzeba długich
  stanowych zadań przekraczających timeout funkcji Vercela.

**Wejście:** Faza 0 zielona. AG.0 bez zależności (rusza od razu). AG.1+ po 1.1
(flagi) — cała warstwa produktowa za flagą. AG.3–AG.6 używają istniejącego modelu
`job_market_data` i ETL `tools/etl-justjoinit.ts` (reużycie). Strumień może biec
równolegle do 1E i bloków B6–B8 (inne pliki).

**Reużycie istniejącego kodu (nie budujemy od zera):** wzorzec potoku
`src/lib/ai/pipeline/` (step1–5); agent-sędzia z Pomocnika (`career-helper.ts`,
tryb Opus blokujący) jako wzorzec weryfikatora; ETL JustJoinIT; `ai_usage_ledger`
(`withAiUsage`) do kosztu; backup-tabele (wzorzec `students_bak`/
`job_market_data_bak` + ADR-009/010) do swapu.

- **AG.0 · Harness ewaluacyjny gap detection (P0 — PIERWSZE, bramkuje jakość)**.
  Golden set 10–20 przypadków: sylabus + ręcznie zweryfikowane oczekiwane luki.
  Metryki programistyczne (precision/recall wykrytych luk vs golden) + LLM-as-judge
  dla trafności opisu (wzorzec agenta-sędziego z Pomocnika). Uruchamiane jak
  `pnpm test:evals` (poza zwykłym `test:run`, żeby koszt LLM nie szedł w każdym CI).
  Nie jest twardą bramką merge'a, ALE każda zmiana promptu/modelu gap detection
  MUSI raportować deltę metryki (dziedziczy Bramkę DoD pkt 4 — red-green). Dowód:
  eval zielony na baseline; celowe pogorszenie promptu → mierzalny spadek metryki.

- **AG.1 · Weryfikator luk w potoku (P0, za flagą)**. Drugi przebieg Messages API:
  dla każdej wykrytej luki sprawdza, czy wynika z danych rynkowych
  (`job_market_data`), zanim trafi do studenta. Wzorzec: agent-sędzia z Pomocnika
  (blokująco). Fan-out weryfikacji równolegle (`Promise.all`), koszt w
  `ai_usage_ledger`, budżet z 0.0. Dowód: luka bez pokrycia w rynku
  odrzucona/oznaczona; golden set AG.0 pokazuje poprawę precision.

- **AG.2 · Usunięcie legacy ścieżki LLM luk (P1) [ZMIANA — decyzja Darka
  2026-07-07]**. Pierwotny zakres (refactor `generate-gaps` na potok) zdezaktualizowany:
  po Partii 4 + korekcie AG.0 luki liczą się deterministycznie z katalogu rynku,
  a LLM-owy `generate-gaps` żyje tylko w gałęzi legacy POST /api/onboarding bez
  żywego wołacza w UI (w kodzie oznaczony jako kandydat do usunięcia). Nowy zakres:
  usunąć gałąź legacy (kontrakt tablicy stringów) + `generate-gaps.ts` i jego testy;
  `verify-gaps.ts` (AG.1) ZOSTAJE — klocek reużywalny wszędzie, gdzie model produkuje
  nazwy kompetencji (AG.5 opisy nowych luk, przyszłe potoki). Wraz z gałęzią znika
  flaga `gapVerifier` (jedyny konsument skasowany; env `FLAG_GAP_VERIFIER` na
  Vercelu do usunięcia — nieszkodliwa, nic jej nie czyta). Opcjonalny osobny
  punkt P2 (poza AG.2): jakość adnotacji sylabusem — lepsze dopasowanie nazw
  z `/api/syllabus/parse` do katalogu (wartość dla panelu wykładowcy program vs
  rynek), NIE wpływa na luki. Dowód: kontrakt legacy zwraca 400 (albo ścieżka
  znika ze schematu), testy i build zielone, zero martwego kodu LLM luk.

- **AG.3 · MIESIĘCZNE odświeżanie rynku → STAGING (P1) [CZERWONA LINIA — dane
  prod] [ZMIANA ×2 — decyzje Darka 2026-07-07: (a) raz w miesiącu, nie co
  tydzień; (b) architektura UPLOAD-DRIVEN zamiast crona pobierającego]**.
  Powód (b): dane rynku pochodzą z RĘCZNEGO eksportu CSV JustJoinIT (prowenicja
  §0, md5) — automatyczne źródło nie istnieje, cron nie miałby czego pobrać.
  Realizacja: Darek raz w miesiącu wgrywa oba CSV (.gz) na
  `POST /api/market-refresh/ingest` (flaga `proactiveMarketRefresh` + sekret
  `MARKET_REFRESH_TOKEN`, limit body 8 MB per-trasa) → TEN SAM silnik ETL
  (`tools/etl-justjoinit.ts` przez shim `src/lib/market-refresh/etl-core`) →
  wipe+insert `job_market_data_staging` + wiersz `market_refresh_runs` (md5 obu
  CSV, liczniki silnika, diff jsonb, dokładne bajty OBU artefaktów — wsad dla
  AG.4 bez ponownego uploadu). ZERO zapisu na prod. Przypomnienie miesięczne =
  kalendarz Darka do czasu warstwy powiadomień (AG.6). ⚠ Limit czasu
  ROZSTRZYGNIĘTY pomiarem: pełna skala zrzutu (9 922 ofert / ~50k wierszy tech)
  = ~0,4 s (`tests/unit/etl-scale.test.ts`) — chunking (0.10) zbędny.
  Dowód: ingest pisze staging + run (integracja na realnej bazie), diff poprawny
  na sztucznym delcie (unit), prod bajt-w-bajt nietknięty (integracja).
  Runbook: `docs/runbooks/market-refresh-runbook.md`.

- **AG.4 · Bramka akceptacji + swap na prod (P1) [CZERWONA LINIA]**. Widok/endpoint:
  Darek ogląda diff z AG.3, akceptuje jednym tapnięciem (mobile-friendly) →
  transakcyjny swap `staging`→prod z auto-backupem (wzorzec `job_market_data_bak` +
  ADR-009/010), rollback udokumentowany. Odrzucenie zostawia prod bez zmian. To
  świadomy kompromis z „bez laptopa": pobranie i recompute są automatyczne, sam
  swap wymaga jednego tapnięcia (decyzja: szanujemy czerwoną linię). Dowód: E2E —
  akceptacja robi swap w tx z backupem; odrzucenie = prod bez zmian.

- **AG.5 · Deterministyczny recompute luk po swapie (P0 dla wartości)**. Po
  zaakceptowanym swapie: dla każdego studenta przelicz pokrycie kompetencji vs nowy
  rynek **operacjami na zbiorach (~0 LLM)**. Wykryj NOWE luki (były pokryte, teraz
  nie). LLM woła się TYLKO na nową lukę, by wygenerować opis — raz, cache w DB
  (wzorzec `generate-why`). Koszt w `ai_usage_ledger`. Dowód: recompute bez LLM dla
  niezmienionych; LLM tylko dla nowej luki; drugi odczyt opisu z cache (0 wywołań).

- **AG.6 · Powiadomienie „nowa luka" (P1, feature produktowy) [ZMIANA — decyzje
  Darka 2026-07-08]**. Nowa luka z AG.5 → powiadomienie „w Twoim profilu pojawiła
  się nowa luka — rynek zaczął wymagać X". Decyzje: kanał **in-app** (karta na
  dashboardzie czytająca `market_new_gap_events`; zero nowych usług zewnętrznych,
  e-mail może dojść później jako drugi konsument tych samych zdarzeń); RODO
  **opt-in checkbox** (kolumny zgody na `students`, migracja 0026; bez zgody
  recompute działa — rdzeń usługi — ale powiadomienia się nie pokazują; zgoda
  odwoływalna tym samym endpointem). System powiadomień 1.18 nie istnieje —
  AG.6 buduje fundament (zdarzenia + `notified_at`), w który 1.18 się wepnie.
  Osobna flaga `marketGapNotifications` (release UI studenta niezależny od
  potoku rynku). Dowód: E2E — swap wprowadzający nową kompetencję generuje
  powiadomienie u dotkniętego studenta, nie u innych.

- **AG.7 · Pamięć doradcy między sesjami (P1) — rozszerza Pomocnika**. Trwała pamięć
  per student w Postgresie (źródło prawdy): ukończone mikrokursy/projekty,
  zainteresowania, historia luk. Doradca (`career-helper`/`session.ts`) czyta
  kontekst z DB do promptu, zamiast zaczynać od zera. **Nie** Managed Agents memory
  store (decyzja) — opcjonalnie Memory Tool później. Styk z tutorem 1.13 (wspólny
  kontekst modułu). RLS wg DoD. Dowód: test — druga sesja doradcy zna stan z
  pierwszej; kontekst zbudowany z DB, nie z modelu.

**Bramka wyjścia AG:** gap detection ma zmierzoną jakość (AG.0) + weryfikator
(AG.1); rynek odświeża się cyklicznie z akceptacją Darka (AG.3/AG.4) bez ręcznego
ETL; nowe luki generują powiadomienia (AG.6); doradca pamięta studenta między
sesjami (AG.7); koszt per student/tydzień w `ai_usage_ledger` mieści się w
założeniach P&L.

---

## 4-ter. **[NOWE 2026-07-21]** Pakiety MIS — „Make It Stick"

> Szczegóły, decyzje Darka i pełne mapowanie 9 propozycji: `13-make-it-stick.md`.
> Pakiety pokrywają wyłącznie LUKI względem tego planu; nic z 1E.3/1E.4 nie dublują.

- **MIS.1 · Sonda pewności przed odpowiedzią (P1, PRZED 1E.4)** — kolumna
  `confidence` (1–3) w `curriculum_item_answers` + 3 przyciski w item-runner;
  flaga `FLAG_CONFIDENCE_PROBE`. Cecha FSRS od dnia 1.
- **MIS.2 · Wskaźnik rozjazdu pewność–wynik (P2)** — czysta agregacja (0 LLM),
  widget prywatny; ta sama flaga; po ~2 tyg. danych z MIS.1.
- **MIS.3 · Paszport 2.0: świeżość + konteksty (P1)** — ekspozycja
  `MAX(verifiedAt)` i `COUNT(DISTINCT submissionId)` z `verified_competencies`
  w PRYWATNYM widoku paszportu (decyzja Darka: publiczny bez zmian do pilotażu);
  flaga `FLAG_PASSPORT_FRESHNESS`; zero migracji.
- **MIS.4 · Pre-test przed projektem (P2, spięte z 1E.3)** — quiz 5–8 pytań
  z konceptów projektu przed briefem (informacyjny, nie bramkujący); reuse
  silnika assessment; `kind='project_pretest'` w TEJ SAMEJ migracji co
  `'module_exam'` z 1E.3; flaga `FLAG_PROJECT_PRETEST`.
- **MIS.5 · Przeplatanie w doborze projektów (P3, po 1E.4)** — deterministyczny
  bonus scoringu za 1–2 kompetencje potwierdzone obok nowych; flaga
  `FLAG_INTERLEAVED_PROJECTS`.
- **MIS.6 · Tryb Feynmana (P3, po 1E.4)** — wariant promptu tutora C11
  „wyjaśnij początkującemu"; flaga `FLAG_FEYNMAN_MODE`.
- **MIS.7 · Audyt mikrocopy growth-mindset (P2, od zaraz)** — sweep komunikatów
  negatywnych do tonu „jeszcze nie + następny krok" (ADR-014 R17, D6 pkt 8).
- **MIS.8 · Metryki uczenia** — transza A (kalibracja+transfer, po MIS.1+MIS.3),
  transza B (retencja 30/90, po 1E.4); skrypt raportowy, bez UI.

**Rozstrzygnięcie „najpierw próba" (propozycja #4 dokumentu):** ADR-014 D1
zostaje (worked example przed pierwszym pytaniem nowicjusza); efekt generowania
idzie w MIS.4, powtórki 1E.4 i fading D5 — decyzja Darka 2026-07-21.

## 5. FAZA 2 — Horyzont 2 „Sygnał ma popyt"

Wejście: Faza 1 zielona (dla E2.D dodatkowo: bramka 1E dla DS).

- **E2.A** · Kredencjały Europass/Open Badges + ECTS [SIGN-OFF prawny/uczelnia].
- **E2.B** · Portal pracodawców [SIGN-OFF, design-partnerzy].
- **E2.C** · Półautomatyczna kuracja projektów (D17, po 1.0). **[ZMIANA]**
  Rozszerzona o kurację POZYCJI CURRICULUM (kandydaci modułów/zadań wg
  kontraktu Ethana → walidator QG → człowiek) — warunek rolloutu 1E na
  ścieżki poza DS.
- **E2.D** · Poziomy L4/L5 (D14) **[ZMIANA: podbite do P0 w tej fazie]** —
  projekt gotowy w docs (project_reference_solutions + benchmark). Pilotaż:
  pierwszy projekt L4 dla DS (spójnie z 1E). Wymaga partnerstw lub publicznych
  case studies + bramka RODO [SIGN-OFF Ryan]. Bez L4/L5 sufit portfolio to
  projekty 30-godzinne.
- **E2.E** · Płatności (Stripe) — prerekwizyt monetyzacji E2.B slice 2, E2.F.
- **E2.F** · Interview prep (E18, premium).
- **E2.G** · Pętla poprawy po ocenie (C12, P1) — review = początek iteracji:
  „popraw te 3 kryteria i wyślij ponownie", limit prób, diff między
  zgłoszeniami. **[ZMIANA]** To mastery learning zastosowany do projektów —
  spójny próg/logika z 1E.3 (jeden mechanizm, dwa konsumenty).
- **E2.H** · Employability Report (z danych 1.17).
- ~~E2.I~~ **[USUNIĘTE]** — wchłonięte przez 1E.5 (pełne A4 zamiast okrojonego).

Bramka wyjścia: ≥5 uczelni, pierwsza wydaje ECTS, ≥5 firm płacących,
200+ projektów, **≥2 ścieżki z pełnym curriculum** (DS + jedna z E2.C).

---

## 6. FAZA 3 — Horyzont 3 „Standard europejski"

- **E3.A** · Skala (i18n/EN, re-ingest rynkowy + drugie źródło, async review
  queue, budżet kosztu per user — rozbudowa 0.0).
- **E3.B** · API kredencjałów dla ATS [SIGN-OFF partnerzy].
- **E3.C** · Replikacja ETL per kraj.
- **E3.D** · Capstone z żywym wdrożeniem (D16, P1) **[ZMIANA — doprecyzowanie]**:
  OSTATNI moduł curriculum ścieżki (zamyka drabinę z 1E): działający produkt
  na produkcji (Vercel/Fly), monitoring, dokumentacja, post-mortem; receipt
  linkuje do żywej aplikacji. Pilotaż: capstone DS. Dowód: E2E + receipt z
  linkiem do działającego deployu.
- **E3.E** · Projekty zespołowe (D15) [spike modelu danych].
- **E3.F** · Kohorty (F22).

Bramka wyjścia: 30+ uczelni w ≥3 krajach, placement ≥70% dla ścieżek
dojrzałych, receipty w ≥2 ATS.

---

## 7. Ścieżka krytyczna i ryzyka (zaktualizowane)

1. 0.0 ✅ → 0.1 → 0.5 przed funkcjami AI H1 (koszt pod kontrolą).
2. 0.2a → 0.2b (remediacja przed unikatem).
3. **1.0 → 1E.0 → 1E.1 → 1E.2 → 1E.6a → 1E.6b → 1E.3 → 1E.4 → 1E.5 → 1E.7** —
   kręgosłup warstwy edukacyjnej [ZAKTUALIZOWANE 2026-07-14]. 1E.2 blokuje zarówno
   mastery (1E.3) jak i powtórki (1E.4). **1E.6a/1E.6b wsunięte przed 1E.3**, bo bez
   nich drabina jest niewidoczna (brak UI) i niekompletowalna (laby → `501`) —
   dokładanie egzaminów do drabiny, której student nie widzi i nie może przejść,
   nie ma sensu. **1E.6b odblokowuje 66 notebooków Colab** (dług treściowy 1E.2).
   **1E.R** (ADR-014 D7) biegło równolegle z 1E.1/1E.2 — wykonane; następca **1E.R2** otwarty.
   **[AKTUALIZACJA 2026-07-21]** Przed 1E.4 obowiązkowo: **MIS.1** (sonda
   pewności) + naprawa długu hintDepth; pozostałe pakiety MIS poza kręgosłupem
   (sekcja 4-ter, `13-make-it-stick.md`).
4. **1.11 i 1E.2 projektować RAZEM** (wspólny bank pytań) — zrobione osobno
   wymuszą bolesną migrację scalającą.
5. 1E (pilotaż DS) → E2.C → rollout curriculum na kolejne ścieżki. Nie odwrotnie.
6. Wiarygodność F1 (1.5/1.9/1.16) przed E2.B; 1.17 rusza z pierwszą kohortą.
7. D14 (L4/L5) po bramce 1E dla DS — L4 ma być szczytem drabiny, nie luźnym bytem.
8. **Blok AG: AG.0 (eval) najpierw** — bez niego AG.1 nie ma czym mierzyć
   poprawy (AG.2 po [ZMIANIE] to kasacja legacy — bez metryki).
   Łańcuch rynku: **AG.3 → AG.4 → AG.5 → AG.6** (staging → akceptacja →
   recompute → powiadomienie). AG.7 (pamięć doradcy) równolegle — inne pliki
   (`career-helper`). AG zastępuje ad-hoc pomysł „auto-ingest bez laptopa"
   kontrolowanym procesem staging+akceptacja (patrz ryzyko niżej).

**Ryzyka nowe:**
- **AG „bez laptopa" vs [CZERWONA LINIA] danych prod** — pełny auto-swap na prod
  bez człowieka łamałby regułę sign-offu. Wybrany kompromis: pobranie (AG.3) i
  recompute (AG.5) automatyczne, sam swap (AG.4) za jednym tapnięciem Darka. Nie
  „zero laptopa", ale „zero ręcznego ETL".
- **Timeout funkcji Vercela dla ETL — ROZSTRZYGNIĘTE (AG.3, 2026-07-07):** pomiar
  na pełnej skali zrzutu (9 922 ofert / ~50k wierszy tech) = ~0,4 s
  (`tests/unit/etl-scale.test.ts`) przy `maxDuration=300` trasy ingest — chunking
  (0.10) i kolejka zbędne. Ryzyko wraca dopiero, gdyby źródło danych urosło o rzędy
  wielkości.
- **Ślepy zaułek platformowy** — Routines/Dynamic Workflows to narzędzia dev, nie
  runtime produktu (patrz Blok AG). Trzymać się Vercel Cron + Messages API +
  Postgres; Managed Agents dopiero przy realnej potrzebie długich stanowych zadań.
- **Treści to nie kod** — 1E.2/1E.5 skalują się liczbą godzin kuracji i QG,
  nie PR-ami. Time-boxować partie (jak DS partia 1), nie „całość naraz".
- **Mastery gate vs dropout** — próg 90% bez tutora (1.13) i powtórek (1E.4)
  podniesie odpływ zamiast jakości; nie włączać 1E.3 na pilotażu przed 1.13.
- **Spike'y (1E.0, 1.7, 1.15, E2.A/B)** — time-box z wyjściem = ADR; dopiero
  ADR odblokowuje atomizację.
- **Koszt AI warstwy edukacyjnej** — projektowo ~0 w pętli (autograding
  deterministyczny, FSRS deterministyczny, mostki cache'owane); jedyne
  wywołania LLM: generacja mostków (raz per moduł) i tutor. Pilnuje 0.0.
