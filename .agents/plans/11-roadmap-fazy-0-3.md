# Roadmap wdrożenia: Fazy 0–3 + warstwa edukacyjna (pilotaż Data Science)

> Źródło prawdy dla sekwencji zadań po audycie (2026-07). Wersja 2 — dodana
> **Faza 1E: pełna ścieżka edukacyjna** (A1–A4) z pilotażem na kierunku
> **Data Science**, oraz korekty priorytetów w F2/F3 (D14→P0, D16, C12).
> Nowe/zmienione względem wersji 1 oznaczone **[NOWE]** / **[ZMIANA]**.

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
- **0.13 ⏳ WSTRZYMANE — PREVIEW (Darek), PR #121 otwarty** · CSP enforce + drop unsafe-eval
  (unsafe-inline zostaje). Runtime CSP niewykrywalny lokalnie → weryfikacja na Preview.
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
człowieka (1.5); zero mapy wyłącznie z samooceny (1.12); model kariery w DB
(1.0); placement mierzony (1.17).

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

- **1E.0 · Design spike curriculum (A1)** [SIGN-OFF Darek/Sophia — decyzja
  dydaktyczna, nie techniczna]. Encje `curriculum_modules` / pozycje modułu
  (teoria, ćwiczenia, projekt, egzamin) / prerekwizyty BLOKUJĄCE (dziś prereqi
  tylko ważą matching — mają wymuszać kolejność). Wzorzec: MIT OCW / CS50
  (wykład → problem set → projekt). Definicja relacji do istniejących encji
  (projects, project_learning_resources.theoryMd, project_competencies).
  Time-box, wyjście = ADR. Blokuje 1E.1–1E.7.

- **1E.1 · Model danych curriculum + migracje (A1)** — addytywne, RLS wg DoD.
  Moduły DS spinają istniejące projekty z partii 1 w drabinę; egzekwowanie
  prereq w API (blokada zapisu do modułu bez zaliczenia poprzedniego — za
  flagą). Dowód: test — student bez zaliczonego modułu N nie otworzy N+1;
  z flagą off zachowanie jak dziś.

- **1E.2 · Fundamenty CS/matmy — model + partia 1 DS (A2, P0)**. Osobny trzon
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

- **1E.5 · Kuracja treści zewnętrznych na całe curriculum DS (A4, P1)** —
  obniża koszt A1: nie piszemy wykładów, sekwencjonujemy najlepsze darmowe
  (MIT OCW, CS50, fast.ai, karpathy, StatQuest). Rozszerzenie
  project_learning_resources na pozycje modułów + AI-generowane „mostki"
  (czego szukać w źródle i po co — generowane RAZ per moduł, cache w DB,
  koszt widoczny w ai_usage_ledger). Licencje źródeł weryfikowane jak w DS
  partia 1. **Zastępuje E2.I z wersji 1 planu.**
  Dowód: test — mostek serwowany z cache przy drugim odczycie (0 wywołań LLM);
  każda pozycja kuracji ma źródło+licencję.

- **1E.6 · UI ścieżki: drabina modułów (A1)** — widok curriculum DS: postęp,
  blokady prereq, teoria/ćwiczenia/projekt/egzamin per moduł; za flagą.
  Dowód: E2E — student widzi drabinę, moduł zablokowany do zaliczenia
  poprzedniego, wejście w moduł pokazuje pozycje.

- **1E.7 · Placement diagnozy w curriculum (A5-domknięcie)** — wynik testu
  adaptacyjnego (1.11/1.12) mapuje studenta na pozycję startową w drabinie DS
  (moduły „zaliczone przez diagnozę" oznaczone verifiedByMethod='diagnostic').
  Dowód: E2E — student bez sylabusa: diagnoza → start od modułu adekwatnego
  do wyniku, nie od zera.

**Bramka wyjścia 1E (pilotaż DS):** student bez sylabusa przechodzi diagnozę →
placement → moduł (teoria z kuracji + ćwiczenia z autogradingiem + projekt +
egzamin) → mastery gate ≥ progu → powtórki FSRS utrzymują wiedzę; tutor (1.13)
zna kontekst modułu; całość za flagą; koszt per student w ai_usage_ledger
mieści się w założeniach P&L. Decyzja o rollout'cie na kolejną ścieżkę =
osobny sign-off po przeglądzie metryk pilotażu.

---

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
3. **1.0 → 1E.0 → 1E.1 → 1E.2 → 1E.3 → 1E.4** — kręgosłup warstwy edukacyjnej;
   1E.2 blokuje zarówno mastery (1E.3) jak i powtórki (1E.4).
4. **1.11 i 1E.2 projektować RAZEM** (wspólny bank pytań) — zrobione osobno
   wymuszą bolesną migrację scalającą.
5. 1E (pilotaż DS) → E2.C → rollout curriculum na kolejne ścieżki. Nie odwrotnie.
6. Wiarygodność F1 (1.5/1.9/1.16) przed E2.B; 1.17 rusza z pierwszą kohortą.
7. D14 (L4/L5) po bramce 1E dla DS — L4 ma być szczytem drabiny, nie luźnym bytem.

**Ryzyka nowe:**
- **Treści to nie kod** — 1E.2/1E.5 skalują się liczbą godzin kuracji i QG,
  nie PR-ami. Time-boxować partie (jak DS partia 1), nie „całość naraz".
- **Mastery gate vs dropout** — próg 90% bez tutora (1.13) i powtórek (1E.4)
  podniesie odpływ zamiast jakości; nie włączać 1E.3 na pilotażu przed 1.13.
- **Spike'y (1E.0, 1.7, 1.15, E2.A/B)** — time-box z wyjściem = ADR; dopiero
  ADR odblokowuje atomizację.
- **Koszt AI warstwy edukacyjnej** — projektowo ~0 w pętli (autograding
  deterministyczny, FSRS deterministyczny, mostki cache'owane); jedyne
  wywołania LLM: generacja mostków (raz per moduł) i tutor. Pilnuje 0.0.
