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
>
> **Wersja 4 (2026-08-01) — druga synchronizacja z rzeczywistością; ZMIANA WĄSKIEGO
> GARDŁA.** Plik stał zamrożony od 2026-07-21 (ostatni commit `64a398b`) i przez
> 11 dni rozjechał się z produktem drugi raz — tym razem w drugą stronę niż w v3:
> **opisywał jako otwarte to, co jest zrobione i żywe na produkcji.** Zmiany:
> 1. **Kręgosłup 1E DOMKNIĘTY W CAŁOŚCI** — 1E.6a, 1E.6b, 1E.3, 1E.4, 1E.7 wykonane
>    i zapalone na prodzie; treść 58/58. Statusy przy pozycjach, każdy z numerem PR.
> 2. **Faza 1 domknięta kodowo** — bloki B6 (piaskownica), B7 (obrona ustna),
>    B8 (recenzja człowieka), A5 (diagnoza), C11 (tutor), 1.17, 1.18 mają kod na
>    `main`. Stan flag na produkcji dla części z nich — **NIEZWERYFIKOWANY**
>    (patrz §8, zadanie A1).
> 3. **Blok AG domknięty kodowo** — AG.0…AG.7 na `main`.
> 4. **MIS.1, MIS.3, MIS.7 wykonane**; otwarte MIS.2, MIS.4, MIS.5, MIS.6, MIS.8.
> 5. **Wąskie gardło przestało być techniczne.** Bramka wyjścia 1E wymaga, żeby
>    pętla została przejechana przez uczestnika — **jeden moduł, nie cała ścieżka**
>    (dosłowne brzmienie bramki, §4). Pętla działa, ale **nie przeszedł jej nikt poza
>    kontami QA**; jedyny wiersz w `curriculum_placements` jest techniczny.
> 6. **Nowa sekcja §8** — stan flag produkcyjnych (dziś nieudokumentowany), twarde
>    bramki przed pierwszą rejestracją, tory A/B/C, **cztery progi czasowe G1–G4**
>    i lista tego, co robimy **dziś** przy zerowej liczbie uczestników (§8.5).
>
> **⚠ Sprostowania w obrębie v4 (2026-08-01, wieczór — uwaga Darka).** Pierwsza
> redakcja v4, wpisana kilka godzin wcześniej, zawierała dwa błędy i **jedną wadę
> ramy**, wszystkie działające w tę samą stronę — wydłużały plan:
> - **Błąd 1 (bramka F1).** Napisałem, że warunek „placement **mierzony**" wymaga
>   pierwszej kohorty. Bramka żąda **przyrządu**, nie wyniku; próg `placement ≥70%`
>   należy do bramki wyjścia **Fazy 3**. Sprostowanie przy bramce F1 w §3.
> - **Błąd 2 (bramka 1E).** Sformułowanie „domknie ją pierwszy uczestnik pilotażu"
>   czytało się jako „ktoś musi przejść ścieżkę DS" — czyli miesiące. Bramka żąda
>   **jednego modułu** i działających powtórek. Sprostowanie na końcu §4.
> - **Wada ramy.** Tor C był opisany jako „czeka na dane z toru A", a tor A jako jedna
>   sekwencja. Zserializowało to pracę, która jest równoległa. Poprawione: progi
>   **G1–G4** (§8.2) i front pracy przy zerowej liczbie uczestników (§8.5).
>   Naprawdę zablokowane danymi są **dwie** pozycje: MIS.2 i MIS.8.
>
> Stare brzmienia zacytowane dosłownie w miejscach sprostowań (CLAUDE.md §8 —
> sprostowanie jawne, nigdy ciche przeredagowanie).
>
> **Reguła dowodowa v4 (CLAUDE.md §8 v1.16).** Statusy „wykonane" opierają się na
> **obecności kodu w repozytorium** (sprawdzone `find`/`git log`, numer PR przy
> pozycji). Daty **zapłonu flag na produkcji** pochodzą z `docs/SESSION_HANDOFF.md`
> — to źródło wtórne, nie odczyt z produkcji; oznaczone „wg handoffu". Twierdzenia
> o **bieżącym stanie flag na produkcji nie są w tym pliku stawiane** — wartości
> zmiennych są typu wrażliwego i nie da się ich odczytać, a weryfikacja
> behawioralna nie została jeszcze wykonana (zadanie **A1**). Oznaczone
> **NIEZWERYFIKOWANE**, nie zgadywane.

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
    **[v4] Nadal otwarte — i urosło.** Od 2026-08-01 do rotacji stoją także
    `NEON_API_KEY` (pełna władza nad projektem produkcyjnej bazy, łącznie
    z kasowaniem bazy razem z kopiami) oraz poświadczenie `neondb_owner` — oba
    **żywe** i leżące w `.env.prod` na laptopie od 19 dni. Priorytet **odwrócony
    pomiarem**: klucz podpisu sesji z `.env.prod` okazał się NIE być kluczem
    produkcji (obalone eksperymentem kontrolnym), więc kolejność brzmi
    **Neon → poświadczenie bazy → klucz sesji**. Rotacja dwóch pierwszych jest
    **poza delegacją Ethana** (CLAUDE.md v1.15) — sign-off Darka. Tor B, §8.
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

> **[AKTUALIZACJA 2026-08-01 — v4] FAZA 1 DOMKNIĘTA KODOWO.** Wszystkie pozycje
> 1.0–1.18 mają kod na `main` (numery PR przy pozycjach). Otwarta zostaje wyłącznie
> **eksploatacja**: które z tych funkcji są zapalone na produkcji — patrz §8/A1.
> Bramka wyjścia F1 nie jest domknięta z powodu jednego warunku — „placement
> **mierzony**" (1.17). ⚠ **SPROSTOWANIE w obrębie v4 (2026-08-01, wieczór):**
> pierwsze brzmienie tego akapitu mówiło, że warunek „wymaga pierwszej kohorty,
> a ta nie istnieje". **To była nadinterpretacja.** Bramka żąda działającego
> **przyrządu pomiarowego**, nie wyniku pomiaru — próg `placement ≥70%` pada
> dopiero w bramce wyjścia **Fazy 3** (§6). Do domknięcia F1 brakuje więc długu
> **D11** (miernik nie ma zapytania odczytu) i potwierdzenia flag (§8/A1) —
> roboty na dni, nie na kwartały.

- **1.0 ✅ WYKONANE (PR #134)** · Migracja modelu kariery JSON→DB (P0, prerekwizyt
  1E.0/D17/E19) [CZERWONA LINIA]. Flaga `careerModelFromDb` (`FLAG_CAREER_MODEL_FROM_DB`).
- **1.1 ✅ WYKONANE (PR #129)** · System feature flags — typowany rejestr `src/lib/flags.ts`
  + env. **Rejestr flag jest de facto drugim źródłem prawdy o zakresie produktu**:
  każdy wpis niesie numer zadania z tej roadmapy, a kompilator pilnuje spójności
  (`satisfies` + typowane `requires`). Przy każdej kolejnej synchronizacji tego pliku
  **czytać rejestr, nie pamięć** — to on nadążył za kodem, gdy roadmapa nie nadążyła.

**Blok B8 — Recenzja człowieka** (tabele z migracji 0019) — **✅ DOMKNIĘTY (PR #144–#147)**:
- **1.2 ✅** · Decyzja „kto ocenia w Becie" → **ADR-011** (`docs/decisions/011-kto-ocenia-w-becie.md`).
- **1.3 ✅ (PR #144)** · API kolejki recenzji (`/api/review-queue`), auth + RLS/tenant.
- **1.4 ✅ (PR #145)** · Decyzja approve/reject — transakcyjnie, idempotentnie, audyt.
- **1.5 ✅ (PR #146)** · UI kolejki `/review` + logowanie operatora (`/api/operator/login`).
- **1.6 ✅ (PR #147)** · Plakietka „Oceniał człowiek" na receipcie wg reviewerType.
- Flaga: `humanReviewQueue` (`FLAG_HUMAN_REVIEW_QUEUE`). Stan na prodzie **NIEZWERYFIKOWANY**.

**Blok B6 — Piaskownica (sandbox)** — **✅ DOMKNIĘTY**:
- **1.7 ✅** · Design spike + **ADR-012** (`012-sandbox-vercel.md`) — wybór: Vercel Sandbox,
  zero nowych dostawców [CZERWONA LINIA rozstrzygnięta sign-offem Darka].
- **1.8 ✅ (PR #148)** · Runner ukrytych zestawów testowych (spike 9,7 s w teście E2E).
- **1.9 ✅ (PR #149)** · `runOk` w kroku 2/5 potoku — zachowanie „awaria = odmowa"
  (fail-closed) utrzymane.
- Flaga: `sandboxRunner` (`FLAG_SANDBOX_RUNNER`). Stan na prodzie **NIEZWERYFIKOWANY**.

**Blok A5 — Diagnoza zamiast samooceny** — **✅ DOMKNIĘTY**:
- **1.10 ✅ (PR #150)** · Migracja 0029 — `verifiedByMethod` otwarte na `'diagnostic'`.
- **1.11 ✅ (PR #151)** · Silnik testu adaptacyjnego + **wspólny bank pytań** (migracja 0030).
  Wymóg z v2 dotrzymany: ten sam bank obsługuje egzaminy modułowe (1E.3) i powtórki (1E.4)
  — jedna encja, trzej konsumenci. Bolesna migracja scalająca (ryzyko §7 pkt 4) **nie wystąpiła**.
- **1.12 ✅ (PR #152, korekta #153)** · Diagnoza wpięta w onboarding jako równorzędna
  ścieżka wejścia bez sylabusa.
- Flaga: `diagnosticAssessment` (`FLAG_DIAGNOSTIC_ASSESSMENT`). Stan na prodzie
  **NIEZWERYFIKOWANY** — ale musi być zapalona, skoro 1E.7 (konsument diagnozy)
  działa na żywym prodzie (wg handoffu 2026-08-01).

**Blok C11 — Tutor sokratyczny** — **✅ DOMKNIĘTY, ZAPALONY NA PRODZIE**:
- **1.13 ✅ (PR #154)** · Endpoint tutora z zabezpieczeniami (migracja 0031).
- **1.14 ✅ (PR #155)** · Panel czatu w widoku projektu; dostępność domknięta PR #234/#237/#238.
- **Zapłon: `FLAG_SOCRATIC_TUTOR=1` na produkcji 2026-07-25** (wg handoffu; smoke
  `GET /api/projects/<uuid>/tutor` → 401, czyli trasa żyje, a nie 404).
  Kolejność z §7 uszanowana: tutor **przed** bramką opanowania (mastery gate).

**Blok B7 — Obrona ustna AI** — **✅ DOMKNIĘTY**:
- **1.15 ✅** · Design spike → **ADR-013** (`013-viva-obrona-ustna.md`).
- **1.16 ✅ (PR #156 silnik + #157 UI)** · Krok 6-prep potoku + trasy
  `/api/submissions/[id]/viva/*`, zestaw wzorcowy (golden set), migracja 0032.
- Flaga: `vivaDefense` (`FLAG_VIVA_DEFENSE`). Stan na prodzie **NIEZWERYFIKOWANY**.

**Cross-cutting:**
- **1.17 ✅ KODOWO (PR #159, migracja 0033)** · Instrumentacja placement rate — zgoda RODO,
  stan wyjściowy + deklarowane zdarzenia (`/api/placement/consent`, `/api/placement/events`).
  ⚠ **Wartościowo NIEDOMKNIĘTE:** dane są nieodtwarzalne wstecz, a kohorty nie ma.
  Dodatkowo dług **D11** — miernik **nie ma ani jednego zapytania, które go czyta**
  (§8, zadanie A3). Flaga `placementTracking`.
- **1.18 ✅ (PR #160, migracja 0034)** · C13 rytm nauki — deklaracja godzin/tydzień, seria
  (streak) z realnych śladów, check-iny, alert zastoju. Spięty z modułami curriculum.
  Flaga `studyRhythm`. Stan na prodzie **NIEZWERYFIKOWANY**.

**Bramka wyjścia F1:** receipt = sandbox (1.9) + obrona (1.16) + recenzja
człowieka (1.5); zero mapy wyłącznie z samooceny (1.12) **[ZMIANA — decyzja
Darka 2026-07-08 przy 1.11: kryterium zawężone do ścieżki pilotażowej DS
(spójnie z pilotażem 1E); pozostałe ścieżki mają samoocenę jako jawny
fallback do czasu kuracji banku pytań (diagnoza degraduje do `uncovered`,
nie udaje pomiaru)]**; model kariery w DB (1.0); placement mierzony (1.17).

**[STATUS 2026-08-01 — v4, ze sprostowaniem tego samego dnia] Bramka F1: kod
kompletny, do domknięcia zostały dwie rzeczy — obie na dni.**
1. **Dług D11** — miernik placementu nie ma ani jednego zapytania, które go czyta.
   Warunek brzmi „placement **mierzony**", więc bez zapytania odczytu przyrząd nie mierzy.
2. **Potwierdzenie flag** bloków B6/B7/B8 (§8/A1) — funkcja za zgaszoną flagą nie
   liczy się do bramki, bo student jej nie widzi.

⚠ **Sprostowanie jawne (CLAUDE.md §8).** Pierwsze brzmienie tego bloku, wpisane
kilka godzin wcześniej tego samego dnia, mówiło dosłownie: *„Niedomknięty jest
»placement mierzony« (1.17) i nie domknie go żaden PR: wymaga (a) pierwszej kohorty,
bo dane są nieodtwarzalne wstecz…"*. **Było błędne.** Bramka żąda przyrządu, nie
wyniku; próg liczbowy `placement ≥70%` należy do bramki wyjścia **Fazy 3**, nie F1.
Nieodtwarzalność danych wstecz jest prawdziwa i pozostaje powodem, by zgodę RODO
i zdarzenia mieć zapalone **zanim** przyjdzie pierwszy uczestnik — ale nie czyni
kohorty warunkiem bramki F1.

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
>
> **[AKTUALIZACJA 2026-08-01 — v4] PUNKT 4 POWYŻEJ JEST NIEAKTUALNY — KRĘGOSŁUP 1E
> DOMKNIĘTY W CAŁOŚCI.** UI drabiny istnieje (PR #180), laby są kompletowalne
> (PR #181), egzaminy i powtórki żyją na prodzie, treść jest kompletna 58/58,
> placement z diagnozy zapalony. Zdanie „zero plików `.tsx` z curriculum" zostaje
> w tekście jako ślad audytowy stanu z 2026-07-14 — **obalone pomiarem**:
> `find src -path "*curriculum*" -name "*.tsx"` zwraca dziś 23 pliki, w tym
> `src/app/(dashboard)/curriculum/page.tsx`, `[moduleId]/`, `[moduleId]/[itemId]/`,
> `[moduleId]/exam/`, `atom/[moduleSlug]/[itemSlug]/` oraz
> `src/components/curriculum/ladder-view.tsx`. Statusy per pozycja niżej.

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
  67 konceptów. **[AKTUALIZACJA 2026-08-01 — v4] DŁUG TREŚCIOWY SPŁACONY: 58/58.**
  Notebooki Colab kompletne — L0=4 (#182), F1=7 (#196), F2=7 (#198), F3=7 (#199),
  M-PD=8 (#200), M-SQL=7 (#205), M-EDA=4 (#206), M-ML=7 (#219 pieczątki + #223
  towarzysze), M-LLM=7 (#221 pieczątki + #224 towarzysze). Dowód w repo:
  `find . -name "*.ipynb" ! -name "sonda-srodowiska.ipynb" | wc -l` → **58**.
  Produkcja 58/58 wg handoffu z 2026-07-24 (baseline `b70ccd1`). Poprzednie
  brzmienie tego akapitu („zrobione 33/58 … zostaje 25") było prawdziwe
  2026-07-21 i jest dziś nieaktualne. Otwarte zostają screenshoty UI i seanse
  wideo (akcje Darka). Osobny trzon
  „Fundamenty" wspólny dla rodzin ścieżek: bank zadań o jednoznacznych
  odpowiedziach (zamknięte/numeryczne/krótka forma) + **deterministyczny
  autograding** (bez LLM — zadania mają jednoznaczne odpowiedzi; koszt ~0).
  Pilotaż DS: statystyka, algebra liniowa, Python + struktury danych.
  Treści przechodzą proces QG (kontrakt Ethana, weryfikacja agentami, audit
  ingestu jak ADR-010) [CZERWONA LINIA — ingest na prod]. Punkt styku: wspólny
  model banku pytań z 1.11 (jedna encja, dwa konsumenty).
  Dowód: kontrakt-test treści (jak content-ds-projects.contract.test.ts) +
  test autogradera (poprawna/niepoprawna/brzegowa odpowiedź).

- **1E.3 ✅ WYKONANE — ZAPALONE NA PRODZIE (`FLAG_MASTERY_GATE=1`, 2026-07-25 wg
  handoffu)** · Egzaminy modułowe + mastery gate (A3a, P1). Łańcuch dostawy:
  P1 rusztowanie (#225) → P2 migracja `assessment_sessions` pod egzamin (#226) →
  P3 silnik + trasy `/api/exam/*` (#227) → P4 paczki naprawcze po oblanym
  egzaminie (#228) → tooling zaciągu banku F1 (#229) → P4.5 maszyna stanów cyklu
  (#231) → P5 UI bramki i runnera (#232) → PARTIA C dług silnika (#241) →
  uczciwe copy zdegradowanej gałęzi (#248, DECYZJA 6). Bramka jakości z §7
  („nie zapalać mastery gate przed tutorem 1.13") **dotrzymana** — tutor zapalony
  tego samego dnia, wcześniej. Zasada mastery: próg
  opanowania (parametr per moduł, default 90%) zamiast zaliczenia 50%;
  niezaliczony egzamin → powtórka z INNYM wariantem zadań (bank z 1E.2 musi
  mieć warianty per koncept); wynik egzaminu odblokowuje prereq z 1E.1.
  Dowód: test — wynik < progu nie odblokowuje modułu; drugi wariant nie
  powtarza zadań pierwszego.

- **1E.4 ✅ WYKONANE — ZAPALONE NA PRODZIE (`FLAG_SPACED_REPETITION=1`, 2026-07-26
  wg handoffu)** · Powtórki rozłożone w czasie (A3b, P1). Łańcuch: R1 fundament
  `review_states`/`review_logs` + migracja 0042 → R2 scheduler FSRS (#239) →
  R3 warstwa serwisowa (#240) → R4 trasy `/api/review/*` (#242) → R5 zapis na
  powtórki przez zdany mastery gate (#245) → R6 UI `/powtorki` (#249) →
  CF-2/N1/N2 + bramki QA (#250, migracja 0043) → dowód żywego limitera 429 (#252).
  Warunek wstępny z v3 (**MIS.1 przed 1E.4**) **dotrzymany** — sonda pewności
  weszła PR #188 przed startem R1. Biblioteka: `ts-fsrs` (wariant długoterminowy),
  jednostka powtórki = **koncept**. Bramki zapłonu (RODO: retencja + rejestr
  czynności przetwarzania, dostępność, realny 429) domknięte przed flipem.
  Poniżej oryginalna specyfikacja — mechanizm utrwalania:
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

- **1E.5 🔶 OTWARTE — JEDYNA NIEZROBIONA POZYCJA KRĘGOSŁUPA 1E; WYMAGA DECYZJI
  ZAKRESOWEJ SOPHII (PO)** [v4]. Stan sprawdzony: brak w kodzie mostków per moduł
  (`grep -riE "bridge|mostek" src/lib/curriculum/ src/lib/ai/` — zero trafień
  o tym znaczeniu); `project_learning_resources` istnieje od 2026-05-31, ale
  obsługuje projekty, nie pozycje modułów. **Uzasadnienie pozycji zmieniło się
  od czasu jej zapisania:** teza brzmiała „nie piszemy wykładów, sekwencjonujemy
  najlepsze darmowe" — a od 2026-07-24 mamy **58 własnych atomów** z teorią,
  ćwiczeniami i labami. 1E.5 nie jest już oszczędnością zastępującą pisanie
  treści, tylko **dołożeniem drugiego źródła obok istniejącego**. To zmienia
  rachunek priorytetu, więc pozycji **nie planujemy do wykonania bez decyzji
  Sophii**: zostaje P1, schodzi do P2/P3, czy wypada z pilotażu DS.
  Oryginalna specyfikacja poniżej —
  obniża koszt A1: nie piszemy wykładów, sekwencjonujemy najlepsze darmowe
  (MIT OCW, CS50, fast.ai, karpathy, StatQuest). Rozszerzenie
  project_learning_resources na pozycje modułów + AI-generowane „mostki"
  (czego szukać w źródle i po co — generowane RAZ per moduł, cache w DB,
  koszt widoczny w ai_usage_ledger). Licencje źródeł weryfikowane jak w DS
  partia 1. **Zastępuje E2.I z wersji 1 planu.**
  Dowód: test — mostek serwowany z cache przy drugim odczycie (0 wywołań LLM);
  każda pozycja kuracji ma źródło+licencję.

- **1E.6a ✅ WYKONANE (PR #180) — ZAPALONE NA PRODZIE (`FLAG_CURRICULUM_PATH=1`,
  2026-07-22 wg handoffu)** · UI ścieżki: drabina modułów (A1) [ROZBITE
  2026-07-14 — patrz nota na górze sekcji]. Dostarczone: `/curriculum`,
  `/curriculum/[moduleId]`, `/curriculum/[moduleId]/[itemId]`, strażniki UUID;
  później dołożone `/curriculum/[moduleId]/exam` (1E.3) i
  `/curriculum/atom/[moduleSlug]/[itemSlug]`. Dowód zapłonu wg handoffu:
  `/api/curriculum` → **401** (było 404 przy zgaszonej fladze — trasa istnieje
  i żąda tylko logowania). ⚠ Nauka procesowa z tego zapłonu: `vercel env pull`
  **maskuje wartości** — weryfikacja flagi musi być funkcjonalna, nie przez
  odczyt zmiennej (patrz §8). Oryginalny opis — widok curriculum DS: postęp, blokady prereq,
  teoria/ćwiczenia/lab/projekt/egzamin per moduł; za flagą. Konsumuje **istniejące**
  API z 1E.1 (`getLadder`, `isModuleUnlocked`, `getModuleItems`) — zero nowych tras,
  zero migracji. Pozycja `lab` renderuje się jako zablokowana do czasu 1E.6b.
  Dowód: E2E — student widzi drabinę, moduł zablokowany do zaliczenia
  poprzedniego, wejście w moduł pokazuje pozycje.

- **1E.6b ✅ WYKONANE (PR #181 + ADR-015) — LABY KOMPLETOWALNE NA PRODZIE** [NOWE
  2026-07-14 — zakres wprowadzony przez ADR-014 D3/D10/pkt 11, wcześniej ukryty
  pod przeciążoną etykietą „1E.6"]. Dostarczone: `src/lib/curriculum/lab-checks.ts`
  + `lab-token.ts`, komponent `lab-stamp.tsx`, kontrakt `configJson.checks`.
  Kontrakty checków rozpisane per rodzina modułów: **ADR-015** (bazowy),
  **ADR-020** (M-ML, PR #219), **ADR-022** (M-LLM, PR #221); spłata długu 6 labów
  bez checków — PR #197 (19/19 labów z kontraktem). Rozdzielenie warstw
  utrzymane: check per atom osobno od derywacji tokenu (wspólny blok w notebookach).
  ⚠ **`501` nie zniknęło i nie powinno** — zostało jako **uczciwa odmowa** przy
  braku sekretu podpisu albo braku kontraktu checków dla pozycji
  (`src/app/api/curriculum/items/[id]/complete/route.ts:122,129`). To nie jest
  resztka niedokończonej funkcji, tylko świadomy wybór „lepiej odmówić niż
  zaliczyć lab bez weryfikacji". Poniżej oryginalna specyfikacja zadania.
  ~~**Największy bloker produktowy — całe L0 to laby, a `POST
  /api/curriculum/items/[id]/complete` zwraca dla nich `501`.**~~ [nieaktualne od PR #181]
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

- **1E.7 ✅ WYKONANE — ZAPALONE NA PRODZIE (`FLAG_PLACEMENT_DIAGNOSTIC=1`,
  2026-08-01 godz. 17:57, decyzja Darka; wg handoffu)** · Placement diagnozy
  w curriculum (A5-domknięcie). Łańcuch siedmiu plasterków: L0 ślad zdanego
  egzaminu w drabinie (#254) → L1 most danych diagnoza→drabina, migracja 0044
  (#255) → L2 reguła placementu (#256) → L3 nośnik odblokowania
  `curriculum_placements` (#257) → L4 drabina honoruje placement + bramka
  sprzężenia flag (#259) → L5 dowód rozróżnia `exam` od `test_out` (#260) →
  L6 ekran wyniku + naprawa blokera D0 (#262) → B1 klucz ścieżki w wierszu
  odblokowania, migracja 0046 (#264).
  **Korekta modelu wobec pierwotnego zapisu (ADR-023):** placement **OTWIERA**
  prefiks drabiny, ale **NIE ZALICZA** modułów — zalicza wyłącznie egzamin
  (wariant hybrydowy). Oryginalne brzmienie „moduły zaliczone przez diagnozę
  oznaczone `verifiedByMethod='diagnostic'`" **nie zostało zrealizowane i nie
  powinno** — zaliczanie z diagnozy odbierało studentowi tanią drogę naprawy
  błędu w dół („test out").
  **Bramka sprzężenia flag w kodzie, nie w runbooku:** `placementDiagnostic`
  ma `requires: ["masteryGate"]` (`src/lib/flags.ts`). Zapalenie placementu przy
  zgaszonym egzaminie nie jest „gorszym UX" — wywraca podstawę prawną
  przetwarzania (warunek A22-2 oceny art. 22 RODO: istnieje alternatywna droga
  bez skutku automatycznego). Dlatego bramka jest w ewaluacji flagi.
  ⚠ **Jedyny wiersz w `curriculum_placements` na produkcji jest TECHNICZNY**
  (konto QA, domena `.invalid`) i musi być wyłączony z każdego odczytu miernika —
  inaczej pilotaż zaczyna od jednego „udanego" placementu, którego nikt nie
  odegrał poza nami. Reguła odczytu: `docs/…/1e7` v0.11.
  Pierwotna specyfikacja: wynik testu adaptacyjnego (1.11/1.12) mapuje studenta
  na pozycję startową w drabinie DS. Dowód: E2E — student bez sylabusa: diagnoza
  → start od modułu adekwatnego do wyniku, nie od zera.

- **1E.R2 🔶 OTWARTE** [v4] · Następca partii naprawczej 1E.R (z Sophią) — m.in.
  kryterium rubryki wymuszające ciągłą integrację (CI) dla projektu `ds-chmura`:
  projekt przyznaje kompetencję CI/CD jako `required`, nie mając kryterium, które
  ją egzekwuje. Nie blokuje bramki 1E; blokuje wiarygodność receiptu tego projektu.

**Bramka wyjścia 1E (pilotaż DS):** student bez sylabusa przechodzi diagnozę →
placement → moduł (teoria z kuracji + ćwiczenia z autogradingiem + **lab zaliczany
checkiem automatycznym** + projekt + egzamin) → mastery gate ≥ progu → powtórki FSRS
utrzymują wiedzę; tutor (1.13) zna kontekst modułu; całość za flagą; koszt per student
w ai_usage_ledger mieści się w założeniach P&L. Decyzja o rollout'cie na kolejną
ścieżkę = osobny sign-off po przeglądzie metryk pilotażu.
**[AKTUALIZACJA 2026-07-14] Warunek wstępny onboardingu realnych studentów:** 1E.6a
(student widzi drabinę) + 1E.6b (laby są kompletowalne) + 66 notebooków Colab.
Bez tego kompletu drabina jest niewidoczna i nieprzechodnia — całe L0 to laby.

**[AKTUALIZACJA 2026-08-01 — v4] TEN WARUNEK WSTĘPNY JEST SPEŁNIONY** (liczba „66"
to nieaktualny inwentarz — realny cel to 58, skorygowany 2026-07-21; dostarczone
58/58). Każdy element pętli żyje na produkcji: diagnoza → placement → moduł (teoria +
ćwiczenia z autogradingiem + lab z checkiem + projekt + egzamin) → mastery gate →
powtórki FSRS, z tutorem znającym kontekst modułu. **Pętli nie przeszedł nikt poza
kontami QA** — i to jest jedyna brakująca rzecz.

**⚠ SPROSTOWANIE w obrębie v4 (2026-08-01, wieczór) — czytać ze zrozumieniem, ile
ta bramka faktycznie żąda.** Pierwsze brzmienie tego akapitu mówiło: *„BRAMKA
WYJŚCIA 1E POZOSTAJE NIEDOMKNIĘTA — i nie domknie jej kod. […] domknie ją pierwszy
uczestnik pilotażu"*, co w praktyce czytało się jako „czekamy, aż ktoś przejdzie
ścieżkę". **Bramka tego nie żąda.** Jej dosłowne brzmienie (wyżej) to
`diagnoza → placement → **MODUŁ** → mastery gate → powtórki utrzymują wiedzę` —
**jeden moduł**, nie dziewięć; nie „ukończenie ścieżki DS". Przejście całej drabiny
to istotnie kwestia miesięcy pracy własnej uczestnika (projekty modułowe są
30-godzinne, `projects.estimated_hours` w schemacie) — **ale to nie jest warunek tej
bramki i nigdy nim nie był.** Realna skala domknięcia 1E: **tygodnie, nie kwartały.**

**Dlaczego to nie blokuje dalszej implementacji.** Placement (1E.7) jest przyrządem,
który **rozszeregowuje pilotaż**: uczestnik zdiagnozowany na poziomie 4 startuje
w głębi drabiny, więc moduł M-ML da się ćwiczyć w pierwszym tygodniu, bez czekania,
aż ktokolwiek się tam wespnie. Kilku uczestników wpuszczonych na **różne** poziomy
pokrywa drabinę równolegle. To była jedna z racji istnienia 1E.7 i tak należy jej używać.

**Trzy twarde bramki przed pierwszą rejestracją** (szczegóły i właściciele: §8, tor A):
klauzula informacyjna art. 13 RODO · wykonalność usunięcia danych z art. 17 (dług
**A-1**: dla zdarzeń paszportu i zgłoszeń projektowych usunięcie jest dziś
**strukturalnie niewykonalne**) · dług **D11** (miernik placementu nie ma zapytania
odczytu) wraz z **D5b** i regułą wyłączenia wiersza technicznego.

**Konsekwencja dla planowania — poprawiona.** Tylko **dwie** pozycje planu są
naprawdę zablokowane danymi od uczestników: **MIS.2** (kalibracja pewność–wynik,
próg ≥20 odpowiedzi) i **MIS.8** (metryki uczenia; transza B — retencja 30/90 dni —
jest jedyną pozycją w skali miesięcy). Cała reszta biegnie równolegle. Ostrzeżenie
z AG.0 („bez zmierzonej jakości każda funkcja budowana wyżej wzmacnia błędy")
dotyczy **strojenia** — progu mastery, wag doboru projektów, harmonogramu powtórek —
a nie budowy pozycji, które jeszcze nie istnieją. Progi czasowe: §8.2.

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

> **[AKTUALIZACJA 2026-08-01 — v4] BLOK AG DOMKNIĘTY KODOWO — AG.0…AG.7 na `main`.**
> Statusy przy pozycjach, każdy z numerem PR. Otwarta zostaje **eksploatacja**, nie
> budowa: flagi `proactiveMarketRefresh`, `marketGapNotifications`, `advisorMemory`
> — stan na produkcji **NIEZWERYFIKOWANY** (§8/A1), a **miesięczna ceremonia
> odświeżenia rynku nie została ani razu przeprowadzona** (AG.3 czeka na pierwszy
> realny wgrany zrzut CSV od Darka). Korekta platformowa z v2 (Vercel Cron +
> Messages API + Postgres zamiast Routines/Managed Agents) **utrzymana w wykonaniu**
> — żadna z tych zależności nie weszła.

**Wejście:** Faza 0 zielona. AG.0 bez zależności (rusza od razu). AG.1+ po 1.1
(flagi) — cała warstwa produktowa za flagą. AG.3–AG.6 używają istniejącego modelu
`job_market_data` i ETL `tools/etl-justjoinit.ts` (reużycie). Strumień może biec
równolegle do 1E i bloków B6–B8 (inne pliki).

**Reużycie istniejącego kodu (nie budujemy od zera):** wzorzec potoku
`src/lib/ai/pipeline/` (step1–5); agent-sędzia z Pomocnika (`career-helper.ts`,
tryb Opus blokujący) jako wzorzec weryfikatora; ETL JustJoinIT; `ai_usage_ledger`
(`withAiUsage`) do kosztu; backup-tabele (wzorzec `students_bak`/
`job_market_data_bak` + ADR-009/010) do swapu.

- **AG.0 ✅ WYKONANE (PR #132)** · Harness ewaluacyjny gap detection (P0 — PIERWSZE,
  bramkuje jakość). W repo: `tests/evals/gap-detection/` (deterministic, verifier,
  verifier-judge, why-judge) + `tests/evals/viva-judge/` + `tests/unit/evals-metrics.test.ts`;
  polecenie `pnpm test:evals` (osobny projekt vitest, poza `test:run` — koszt modelu
  nie idzie w każdym przebiegu CI). Harness od razu się zwrócił: znalezisko AG.0
  wykryło ucięte opisy w `generate-why` (naprawa PR #133).
  Golden set 10–20 przypadków: sylabus + ręcznie zweryfikowane oczekiwane luki.
  Metryki programistyczne (precision/recall wykrytych luk vs golden) + LLM-as-judge
  dla trafności opisu (wzorzec agenta-sędziego z Pomocnika). Uruchamiane jak
  `pnpm test:evals` (poza zwykłym `test:run`, żeby koszt LLM nie szedł w każdym CI).
  Nie jest twardą bramką merge'a, ALE każda zmiana promptu/modelu gap detection
  MUSI raportować deltę metryki (dziedziczy Bramkę DoD pkt 4 — red-green). Dowód:
  eval zielony na baseline; celowe pogorszenie promptu → mierzalny spadek metryki.

- **AG.1 ✅ WYKONANE (PR #135)** · Weryfikator luk w potoku (`src/lib/ai/verify-gaps.ts`).
  ⚠ Flaga `gapVerifier` **usunięta w AG.2** wraz z jedynym konsumentem — moduł żyje
  jako klocek bez flagi, przyszli konsumenci dostaną własne. Drugi przebieg Messages API:
  dla każdej wykrytej luki sprawdza, czy wynika z danych rynkowych
  (`job_market_data`), zanim trafi do studenta. Wzorzec: agent-sędzia z Pomocnika
  (blokująco). Fan-out weryfikacji równolegle (`Promise.all`), koszt w
  `ai_usage_ledger`, budżet z 0.0. Dowód: luka bez pokrycia w rynku
  odrzucona/oznaczona; golden set AG.0 pokazuje poprawę precision.

- **AG.2 ✅ WYKONANE (PR #137)** · Usunięcie legacy ścieżki LLM luk (P1) [ZMIANA — decyzja Darka
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

- **AG.3 ✅ WYKONANE KODOWO (PR #136) — CEREMONIA ANI RAZU NIE PRZEPROWADZONA** [v4].
  Trasa `/api/market-refresh/ingest` istnieje; brakuje **pierwszego realnego wgrania
  zrzutu CSV przez Darka**. Do czasu tego przejazdu runbook jest nieprzetestowany
  na żywym materiale. MIESIĘCZNE odświeżanie rynku → STAGING (P1) [CZERWONA LINIA — dane
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

- **AG.4 ✅ WYKONANE KODOWO (PR #138)** · `/api/market-refresh/runs/[id]/decision`
  + `runs/latest`. Jak AG.3 — nieprzejechane na realnym materiale.
  Bramka akceptacji + swap na prod (P1) [CZERWONA LINIA]. Widok/endpoint:
  Darek ogląda diff z AG.3, akceptuje jednym tapnięciem (mobile-friendly) →
  transakcyjny swap `staging`→prod z auto-backupem (wzorzec `job_market_data_bak` +
  ADR-009/010), rollback udokumentowany. Odrzucenie zostawia prod bez zmian. To
  świadomy kompromis z „bez laptopa": pobranie i recompute są automatyczne, sam
  swap wymaga jednego tapnięcia (decyzja: szanujemy czerwoną linię). Dowód: E2E —
  akceptacja robi swap w tx z backupem; odrzucenie = prod bez zmian.

- **AG.5 ✅ WYKONANE (PR #142)** · `/api/market-refresh/recompute` — deterministyczny
  przelicz luk po swapie, memoizacja opisów. Po
  zaakceptowanym swapie: dla każdego studenta przelicz pokrycie kompetencji vs nowy
  rynek **operacjami na zbiorach (~0 LLM)**. Wykryj NOWE luki (były pokryte, teraz
  nie). LLM woła się TYLKO na nową lukę, by wygenerować opis — raz, cache w DB
  (wzorzec `generate-why`). Koszt w `ai_usage_ledger`. Dowód: recompute bez LLM dla
  niezmienionych; LLM tylko dla nowej luki; drugi odczyt opisu z cache (0 wywołań).

- **AG.6 ✅ WYKONANE (PR #143)** · `/api/market-notifications/consent` + `/read`,
  zgoda RODO opt-in (migracja 0026). Flaga `marketGapNotifications` — stan na
  produkcji **NIEZWERYFIKOWANY**.
  Powiadomienie „nowa luka" (P1, feature produktowy) [ZMIANA — decyzje
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

- **AG.7 ✅ WYKONANE (PR #139)** · Pamięć doradcy między sesjami (P1) — rozszerza
  Pomocnika; flaga `advisorMemory`, stan na produkcji **NIEZWERYFIKOWANY**. Trwała pamięć
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

**[STATUS 2026-08-01 — v4]** Kod: komplet. Bramka **niedomknięta w dwóch punktach**,
oba eksploatacyjne, nie budowlane: (1) **„rynek odświeża się cyklicznie"** — ceremonia
AG.3→AG.4 nie została przeprowadzona ani razu na realnym zrzucie; (2) **„koszt per
student/tydzień mieści się w P&L"** — nie ma studentów, więc mianownik jest zerem
i wskaźnika nie da się policzyć. Oba domykają się razem z torem A z §8.

---

## 4-ter. **[NOWE 2026-07-21]** Pakiety MIS — „Make It Stick"

> Szczegóły, decyzje Darka i pełne mapowanie 9 propozycji: `13-make-it-stick.md`.
> Pakiety pokrywają wyłącznie LUKI względem tego planu; nic z 1E.3/1E.4 nie dublują.

> **[AKTUALIZACJA 2026-08-01 — v4] Stan pakietów: MIS.1, MIS.3, MIS.7 wykonane;
> otwarte MIS.2, MIS.4, MIS.5, MIS.6, MIS.8.** MIS.2 i MIS.8-A są zablokowane
> **danymi** (≥20 realnych odpowiedzi z sondą pewności), nie upływem czasu —
> a więc pośrednio pierwszym uczestnikiem (§8, tor A). MIS.5 i MIS.6 mają
> spełniony warunek wstępny („po 1E.4"), bo 1E.4 jest live.

- **MIS.1 ✅ WYKONANE (PR #188) — ZAPALONE NA PRODZIE (`FLAG_CONFIDENCE_PROBE=1`,
  2026-07-22 wg handoffu)** · Sonda pewności przed odpowiedzią (P1, PRZED 1E.4) — kolumna
  `confidence` (1–3) w `curriculum_item_answers` + 3 przyciski w item-runner;
  flaga `FLAG_CONFIDENCE_PROBE`. Cecha FSRS od dnia 1.
- **MIS.2 🔶 OTWARTE — ZABLOKOWANE DANYMI** (≥20 odpowiedzi z sondą; dziś zero
  realnych uczestników) · Wskaźnik rozjazdu pewność–wynik (P2) — czysta agregacja (0 LLM),
  widget prywatny; ta sama flaga; po ~2 tyg. danych z MIS.1.
- **MIS.3 ✅ WYKONANE (PR #189) — ZAPALONE NA PRODZIE (`FLAG_PASSPORT_FRESHNESS=1`,
  2026-07-22 wg handoffu)** · Paszport 2.0: świeżość + konteksty (P1) — ekspozycja
  `MAX(verifiedAt)` i `COUNT(DISTINCT submissionId)` z `verified_competencies`
  w PRYWATNYM widoku paszportu (decyzja Darka: publiczny bez zmian do pilotażu);
  flaga `FLAG_PASSPORT_FRESHNESS`; zero migracji.
- **MIS.4 🔶 OTWARTE — NAJTAŃSZY OTWARTY PAKIET** (silnik egzaminu 1E.3 gotowy,
  zostaje nowy rodzaj `kind='project_pretest'`) · Pre-test przed projektem (P2) — quiz 5–8 pytań
  z konceptów projektu przed briefem (informacyjny, nie bramkujący); reuse
  silnika assessment; `kind='project_pretest'` w TEJ SAMEJ migracji co
  `'module_exam'` z 1E.3; flaga `FLAG_PROJECT_PRETEST`.
- **MIS.5 🔶 OTWARTE** (warunek „po 1E.4" spełniony) · Przeplatanie w doborze
  projektów (P3) — deterministyczny
  bonus scoringu za 1–2 kompetencje potwierdzone obok nowych; flaga
  `FLAG_INTERLEAVED_PROJECTS`.
- **MIS.6 🔶 OTWARTE** (warunek „po 1E.4" spełniony) · Tryb Feynmana (P3) — wariant promptu tutora C11
  „wyjaśnij początkującemu"; flaga `FLAG_FEYNMAN_MODE`.
- **MIS.7 ✅ WYKONANE (PR #187)** · Audyt mikrocopy growth-mindset — polskie etykiety
  statusu zgłoszenia w tonie „jeszcze nie". Przegląd komunikatów
  negatywnych do tonu „jeszcze nie + następny krok" (ADR-014 R17, D6 pkt 8).
- **MIS.8 🔶 OTWARTE — transza A ZABLOKOWANA DANYMI, transza B odblokowana kodowo**
  (1E.4 live, ale retencja 30/90 dni wymaga uczestników od dnia 0) · Metryki uczenia
  — transza A (kalibracja+transfer, po MIS.1+MIS.3),
  transza B (retencja 30/90, po 1E.4); skrypt raportowy, bez UI.

**Rozstrzygnięcie „najpierw próba" (propozycja #4 dokumentu):** ADR-014 D1
zostaje (worked example przed pierwszym pytaniem nowicjusza); efekt generowania
idzie w MIS.4, powtórki 1E.4 i fading D5 — decyzja Darka 2026-07-21.

## 5. FAZA 2 — Horyzont 2 „Sygnał ma popyt"

Wejście: Faza 1 zielona (dla E2.D dodatkowo: bramka 1E dla DS).

> **[STATUS 2026-08-01 — v4] WEJŚCIE DO FAZY 2 JESZCZE ZAMKNIĘTE — ale bliżej, niż
> wyglądało.** Faza 1 domyka się po A1 (potwierdzenie flag) i A3 (dług D11) — skala
> dni, nie kwartałów; warunek „placement **mierzony**" żąda przyrządu, nie wyniku
> (sprostowanie w §3). Bramka 1E dla DS domyka się na progu **G2** (§8.2) — 3–5 osób
> przez 2–4 tygodnie, nie „ktoś przechodzi całą ścieżkę".
>
> **Co wolno robić już teraz:** projektować i budować **E2.C** (walidator kandydatów
> treści) — to praca niezależna od pilotażu. Czego **nie** robimy przed progiem G2:
> *rolloutu curriculum na drugą ścieżkę*. Powód nie jest formalny — rollout przed
> zmierzeniem pilotażu DS powiela niezmierzony wzorzec na 21 ścieżek.

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

> **[AKTUALIZACJA 2026-08-01 — v4] KRĘGOSŁUP Z PUNKTU 3 JEST PRZEBYTY DO KOŃCA.**
> Łańcuch `1.0 → 1E.0 → 1E.1 → 1E.2 → 1E.6a → 1E.6b → 1E.3 → 1E.4 → 1E.5 → 1E.7`
> ma wykonane **wszystkie ogniwa poza 1E.5**, przy czym 1E.7 (ostatnie) zostało
> dostarczone **przed** 1E.5 — kolejność w łańcuchu okazała się miękka, bo 1E.5
> nie jest prerekwizytem placementu. Wszystkie twarde warunki kolejności zapisane
> w v2/v3 zostały **dotrzymane w wykonaniu**: MIS.1 przed 1E.4 (PR #188 przed R1);
> tutor 1.13 przed mastery gate 1E.3 (oba 2026-07-25, tutor pierwszy);
> 1.11 i 1E.2 zaprojektowane na wspólnym banku pytań (migracja 0030) — bolesna
> migracja scalająca z ryzyka pkt 4 **nie wystąpiła**.
>
> **NOWA ŚCIEŻKA KRYTYCZNA nie biegnie już przez kod.** Brzmi:
> **A1 (inwentarz flag) ∥ A3 (dług D11/D5b) → bramka wyjścia F1** *(skala: dni)*
> **· A2 (art. 13 + dług A-1) → A4 (uczestnik przechodzi JEDEN moduł)** *(dni)*
> **→ G2: 3–5 osób × 2–4 tygodnie → bramka wyjścia 1E** *(tygodnie)*
> **→ rollout curriculum na drugą ścieżkę** *(po G2)*.
>
> ⚠ **To jest ścieżka krytyczna, nie harmonogram całości.** Leży na niej wyłącznie
> to, co warunkuje kolejne bramki. **Tory B i C biegną obok i nie czekają na nic** —
> higiena, rotacja sekretów, MIS.4/5/6, 1E.R2, ceremonia AG.3→AG.4 i projekt
> walidatora E2.C ruszają natychmiast (§8.5). Rozpisane w §8. Punkty 1–8 niżej
> zostają jako zapis historyczny sekwencji budowy.

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

**Ryzyka nowe [v4, 2026-08-01]:**
- **Rozjazd roadmapy z produktem jest wzorcem, nie wpadką.** Zdarzył się dwa razy
  (v3 i v4), za każdym razem po ~11 dniach ciszy, i za drugim razem w drugą stronę
  niż za pierwszym. Naprawa nie polega na obietnicy „będziemy pilnować":
  **sekcję statusów generować z `src/lib/flags.ts`**, który nadąża, bo pilnuje go
  kompilator. Do rozważenia jako pozycja definicji ukończenia.
- **Nie wiemy, co jest zapalone na produkcji.** Wartości zmiennych mają typ
  wrażliwy — nie odczyta ich nikt, także Darek. Jedyna dopuszczalna weryfikacja
  jest **behawioralna** (401 na trasie ≠ 404), a `vercel env pull` **maskuje
  wartości** i pokazuje `""` nawet dla flag na pewno zapalonych. Do dziś nie
  powstał jeden dokument z wynikiem takiego pomiaru — zadanie A1.
- **Ta sama reguła w dwóch kopiach.** Przy 1E.7 jedna reguła zapisana w dwóch
  miejscach wyprodukowała **cztery osobne wady** (D0, D4, K1, znalezisko A).
  Rekomendacja Leo do rozważenia przez Darka: „czy ta reguła ma dokładnie jeden
  nośnik" jako pozycja definicji ukończenia, sprawdzana tak rutynowo jak lint.
  To zmiana `CLAUDE.md` — czerwona linia, sign-off Darka.
- **Zielona suita testów nie dowodzi, że strażnik strzeże.** Przy 1E.7 mutacja
  pola przeżyła **2013 testów**, a bramka parytetu miała zero testów. Wykryło to
  **mutowanie kodu, nie czytanie go**. Wniosek: każdy nowy strażnik dostaje
  mutację, która go czerwieni — inaczej jest atrapą.
- **Bramka jakości bywa fałszywie zielona z powodu środowiska.** Baza testowa
  współdzielona przez równolegle pracujące agenty daje `load average` 19–30 i ten
  sam zestaw raz w 52 s, raz w 283 s — porażki wyłącznie na limitach czasu.
  Autorytatywne jest CI na czystym kontenerze, nie przebieg lokalny.
  Osobno: **testy integracyjne pomijają się po cichu** bez ręcznie ustawionego
  `DATABASE_URL` — „8 skipped" wygląda jak sukces. To jest przyczyna, dla której
  trzy atrapy-strażnicy przeżyły.
- **Pierwszy wiersz miernika jest nasz własny.** `curriculum_placements` zawiera
  jeden wiersz techniczny z konta QA. Bez reguły wyłączenia (dług D11) pilotaż
  wystartuje ze 100% skutecznością placementu, której nikt nie odegrał.

---

## 8. **[NOWE 2026-08-01 — v4]** Stan eksploatacyjny i trzy tory dalszej pracy

**Teza sekcji:** wąskie gardło przestało być techniczne. Kod kręgosłupa jest
kompletny; brakuje **uczestnika, pomiaru i higieny**. Trzy tory poniżej są
niezależne — A jest krytyczny, B i C biegną równolegle **bez czekania na uczestnika**.

> **⚠ SPROSTOWANIE w obrębie v4 (2026-08-01, wieczór; uwaga Darka).** Pierwsze
> brzmienie tej tezy kończyło się słowami *„C czeka na dane z A"*, a tor A był
> rozpisany jako jedna sekwencja domykana „pierwszym uczestnikiem". **Było to
> zserializowanie pracy, która jest równoległa** — czytało się jako „wstrzymujemy
> implementację na miesiące". Nic takiego z planu nie wynika i nic takiego nie
> proponuję. Poprawki: (a) tor A rozbity na **cztery progi o różnej skali czasu**
> (§8.2), tak by każdy odblokowywał **swoją** porcję pracy zamiast blokować wszystko;
> (b) z toru C **tylko MIS.2 i MIS.8** są zablokowane danymi — reszta rusza od zaraz
> (§8.4); (c) dopisany §8.5: co robimy **dziś**, przy zerowej liczbie uczestników.

### 8.1 Stan flag produkcyjnych — NIEZWERYFIKOWANY

Rejestr `src/lib/flags.ts` ma 18 wpisów. Z `docs/SESSION_HANDOFF.md` wynika, że
zapalone były (data zapłonu): `passportVerifiedOnly` (2026-07-19), `curriculumPath`,
`confidenceProbe`, `passportFreshness` (2026-07-22), `socraticTutor`, `masteryGate`
(2026-07-25), `spacedRepetition` (2026-07-26), `placementDiagnostic` (2026-08-01).
**To są zapisy o zdarzeniach z przeszłości, nie pomiar stanu bieżącego.** Dla
pozostałych flag — `sandboxRunner`, `vivaDefense`, `humanReviewQueue`,
`diagnosticAssessment`, `placementTracking`, `studyRhythm`, `careerModelFromDb`,
`proactiveMarketRefresh`, `marketGapNotifications`, `advisorMemory` — **nie mamy
żadnego zapisu stanu**. Ta luka jest zadaniem **A1**, nie zgadywanką.

### 8.2 Tor A — dopuszczenie pierwszego uczestnika (KRYTYCZNY)

| # | Zadanie | Właściciel | Uwagi |
|---|---|---|---|
| **A1** | **Inwentarz flag produkcyjnych** — próba dymowa (ang. *smoke test* — najprostsze sprawdzenie „czy w ogóle działa") wszystkich 18 flag po zachowaniu trasy: żywa odpowiada 401/307, martwa 404; wynik do jednego dokumentu | Eva (DevOps), przegląd Ethana | Bez zależności, rusza natychmiast. Zero ryzyka — same odczyty. Weryfikacja **musi** być funkcjonalna; `vercel env pull` maskuje wartości |
| **A2** | **Klauzula informacyjna art. 13 RODO** + **dług A-1** (wykonalność usunięcia danych z art. 17) | Ryan (CRCO), Wendy | **Twarda bramka przed pierwszą rejestracją.** A-1 nie jest kosmetyką: `actor_id` bez klucza obcego + wyzwalacz blokujący `DELETE` czynią usunięcie **strukturalnie niewykonalnym** — to zmiana schematu |
| **A3** | **Dług D11 + D5b** — miernik placementu dostaje zapytanie odczytu; wiersz techniczny wyłączony regułą; ograniczenia wnioskowania stoją **przy** tym zapytaniu | Max (backend), przegląd Tiny (BI) | Bez tego nawet z kohortą nikt nie zobaczy wyniku |
| **A4** | **Przejazd pętli przez konto spoza zespołu** — diagnoza → placement → **jeden moduł** → egzamin → pierwsze powtórki | Quinn (QA) + Sophia (PO) | Skala: dni. **Jeden moduł, nie ścieżka** — patrz sprostowanie przy bramce 1E |

A1 rusza od razu. A2 i A3 równolegle. A4 po komplecie.

#### Cztery progi zamiast jednej blokady

Bramki nie domyka „uczestnik", tylko **konkretna ilość jego aktywności**. Ta ilość
jest różna dla różnych rzeczy, więc trzymanie ich w jednym worku fałszywie wydłuża
plan. Każdy próg odblokowuje **swoją** porcję pracy:

| Próg | Co domyka | Ile aktywności uczestnika | Skala |
|---|---|---|---|
| **G1 · pętla nie pęka** | A4; najostrzejsze ryzyko — że coś w pętli jest zepsute i nie wiemy, bo testowaliśmy sami | jedna sesja: diagnoza → placement → kilka atomów → egzamin | **dni** |
| **G2 · mechanizmy działają na danych** | bramka wyjścia **1E** („powtórki utrzymują wiedzę"), MIS.2, MIS.8-A, pierwsze strojenie progu mastery | 3–5 osób × 2–4 tygodnie regularnej pracy | **tygodnie** |
| **G3 · retencja** | MIS.8 transza B (retencja 30/90 dni) | ci sami uczestnicy, dalej | **miesiące** |
| **G4 · placement rate** | bramka wyjścia **Fazy 3** (`placement ≥70%`) — **nie** F1 i **nie** 1E | uczestnicy wchodzą na rynek pracy | **kwartały** |

**Bramka F1 nie występuje w tej tabeli** — nie zależy od uczestnika wcale. Domykają
ją A1 i A3 (przyrząd + flagi), oba w skali dni.

**Placement rozszeregowuje pilotaż.** Nie potrzebujemy jednej osoby wspinającej się
przez dziewięć modułów. Potrzebujemy **kilku osób wpuszczonych na różne poziomy** —
diagnoza sadza je od razu w głębi drabiny (1E.7), więc M-ML jest ćwiczony w tym samym
tygodniu co L0. Pokrycie drabiny rośnie równolegle, nie szeregowo.

**Blokada spoza inżynierii:** skąd bierzemy 3–5 uczestników pilotażu DS — decyzja
Darka. Wpływa na **G1–G3**, nie na tempo prac (§8.5).

### 8.3 Tor B — dług i higiena (równolegle, bez zależności od uczestników)

1. **Rotacja `NEON_API_KEY` + poświadczenia `neondb_owner`** — oba żywe, 19 dni
   w `.env.prod`. Poza delegacją Ethana → **sign-off Darka** (CLAUDE.md v1.15).
   Kolejność: Neon → baza → klucz sesji (priorytet odwrócony pomiarem, patrz 0.7).
2. **Domknięcie otwartych PR-ów:** #261 (klucze odpowiedzi do prywatnego repo),
   #265 (runbook kopii zapasowej Neona), #212 (ADR-019 sufit kosztu modeli).
3. **Baza testowa per agent albo szeregowanie przebiegów** — dziś współdzielona
   produkuje fałszywe czerwone i może produkować fałszywe zielone.
4. **Twardy błąd zamiast cichego pomijania** testów integracyjnych bez
   `DATABASE_URL`. Tania zmiana, wysoka wartość — to była przyczyna atrap.
5. **Rekomendacja Leo „jeden nośnik reguły"** do definicji ukończenia
   (`CLAUDE.md` §8) — **czerwona linia, sign-off Darka**.
6. **Przegląd 7 otwartych PR-ów Dependabota** jedną sesją — najstarsze z 2026-06-29;
   `@ai-sdk/anthropic` 3→4 to zmiana główna (wersja niezgodna wstecz), więc nie
   wchodzi automatem.

### 8.4 Tor C — pogłębienie produktu

**Rusza od zaraz, bez uczestników** (kolejność = malejący stosunek wartości do kosztu):

- **MIS.4** (pre-test przed projektem) — najtańszy otwarty pakiet: silnik egzaminu
  gotowy, zostaje nowy rodzaj `kind='project_pretest'` w tej samej migracji.
- **MIS.5** (przeplatanie w doborze projektów) i **MIS.6** (tryb Feynmana) — warunek
  „po 1E.4" spełniony; obie deterministyczne, obie za własną flagą.
- **1E.R2** — kryterium rubryki wymuszające ciągłą integrację dla `ds-chmura`.
- **Blok AG operacyjnie** — pierwszy realny przejazd ceremonii AG.3→AG.4 (miesięczne
  odświeżenie rynku). Kod gotowy, brakuje wgranego zrzutu CSV. **Nie wymaga studentów** —
  dotyczy danych rynku, nie uczestników.
- **1E.5** — decyzja zakresowa Sophii (patrz pozycja 1E.5): P1, P2/P3, czy poza pilotaż.
- **E2.C — przygotowanie, nie wdrożenie.** Walidator kandydatów treści można
  projektować i budować teraz; dopiero *rollout curriculum na drugą ścieżkę* czeka
  na zmierzony pilotaż DS.

**Zablokowane danymi — dokładnie dwie pozycje** (patrz progi G2/G3 w §8.2):
- **MIS.2** (rozjazd pewność–wynik) i **MIS.8-A** — próg ≥20 odpowiedzi z sondą pewności.
- **MIS.8-B** (retencja 30/90 dni) — jedyna pozycja planu w skali miesięcy.

**Faza 2 jako całość** — wejście po bramce wyjścia 1E (próg G2, tygodnie). Powód nie
jest formalny: E2.C jest warunkiem rolloutu na kolejne ścieżki, a rollout przed
zmierzeniem pilotażu powiela niezmierzony wzorzec na 21 ścieżek.

### 8.5 Co robimy DZIŚ, przy zerowej liczbie uczestników

Odpowiedź na zarzut „nie będziemy czekać miesiącami": **nie czekamy i nie ma na co**.
Przy zerowej liczbie uczestników pracy jest na kilka tygodni dla całego działu:

| Front pracy | Pozycje | Zależność od uczestnika |
|---|---|---|
| **Domknięcie bramki F1** | A1 (inwentarz flag) + A3 (dług D11/D5b) | **żadna** |
| **Bramki prawne przed rejestracją** | A2 (art. 13 + dług A-1, zmiana schematu) | **żadna** — muszą być gotowe *zanim* ktokolwiek przyjdzie |
| **Higiena i bezpieczeństwo** | cały tor B: rotacja sekretów, PR #261/#265/#212, baza testowa per agent, ciche pomijanie testów, Dependabot | **żadna** |
| **Nowe funkcje produktu** | MIS.4, MIS.5, MIS.6, 1E.R2, 1E.5 (po decyzji Sophii) | **żadna** |
| **Eksploatacja danych rynku** | pierwszy przejazd AG.3→AG.4 | **żadna** |
| **Przygotowanie Fazy 2** | E2.C — projekt walidatora kandydatów treści | **żadna** |

Uczestnik jest potrzebny do **strojenia i dowodu**, nie do budowy. Im wcześniej
wejdzie, tym wcześniej dostaniemy sygnał — dlatego rekrutacja 3–5 osób jest pilna.
Ale jej brak **nie zatrzymuje ani jednej pozycji z tabeli powyżej**.
