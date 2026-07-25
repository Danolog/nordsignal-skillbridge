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

## STAN NA DZIŚ — 2026-07-25 (1E.4 powtórki FSRS) — BACKEND KOMPLETNY (R1–R5) NA PRODZIE ZA FLAGĄ OFF

**Jednym zdaniem:** cały backend powtórek rozłożonych w czasie (FSRS) — od schematu bazy,
przez planer i serwis, po API i wpięcie w mastery gate — jest na prodzie **za flagą OFF**
(deploy ≠ release); zostaje UI (R6) + zapłon świadomą decyzją Darka.

**Flaga na prodzie:** `FLAG_SPACED_REPETITION` **OFF** — `defaultValue false`, nieustawiona
w env prod. Skutek: trasy `/api/review/*` → **404**, hook enrollment (auto-zapis konceptu na
powtórki) nie odpala, zero wierszy w `review_states`/`review_logs`. Student NIC nie widzi do
świadomego zapłonu.

**Baseline `main` = `f827417`** (= R5, `origin/main`). Każdy plasterek: Quinn adwersaryjnie +
Leo (14 domen), autor commitów = Darek, jeden pisarz per gałąź.

### Pięć plasterków R1–R5 (backend end-to-end)

- **R1 — fundament (PR #236, `7e936a8`).** Schema `review_states` + `review_logs` + RLS
  (Row Level Security — izolacja wierszy po studencie; **Ryan CRCO GO**, klasa K-INT,
  `rls-matrix.md` v0.29) + flaga OFF + biblioteka planująca `ts-fsrs@5.4.1` (licencja MIT).
  Migracja **`0042`** wygenerowana i na `main`, **NIE zastosowana na prod NEON** (zaciąg ręczny —
  czeka do R6, delegacja v1.12 + kopia Neon).
- **R2 — planer (PR #239, `297865f`).** Scheduler FSRS jako czyste funkcje (bez efektów
  ubocznych). Decyzja **G1 = short-term OFF** (Wariant A: przejście koncept→powtórka bez
  wewnątrzdniowych mikro-kroków nauki).
- **R3 — serwis (PR #240, `60aa2a6`).** `review-service.ts`: `getDueQueue` (kolejka na dziś,
  jedno zapytanie), `recordReview` (transakcja + blokada wiersza `FOR UPDATE`), `enrollConcept`
  (idempotentny — ponowny zapis nie duplikuje). Quinn 10 testów, mutation-proven.
- **R4 — API (PR #242, `f0227d5`).** `/api/review/{queue,answer}`. Twarde niezmienniki:
  **K1** studentId z sesji (nie z ciała żądania), **K2** cap 20/dobę, **K3** walidacja wejścia,
  strip klucza odpowiedzi z payloadu, głębokość podpowiedzi = 0 wyliczana serwerowo. Quinn 15
  testów (IDOR + strip mutation-proven).
- **R5 — wpięcie w mastery gate (PR #245, `f827417`).** Enrollment wyzwalany przy zdanym
  egzaminie modułowym (`exam/complete`), po stronie właściciela best-effort, gating szczelny.
  **Inwariant flag-OFF mutation-proven: żywa trasa `exam/complete` zachowuje się bajt-w-bajt jak
  dziś, gdy flaga OFF.** Enrollment obejmuje koncepty `active AND trunk='market' AND ≥1 pytanie`.
  Decyzje Sophii: **§4** (niższa stabilność startowa dla oblanych) **DEFER**; **corrective-done**
  jako trigger **DEFER**; wejście na powtórki **tylko przez mastery gate**. Plan v0.6.

### ZOSTAJE R6 + ZAPŁON

**R6 (UI + prod-migracja):**
- Kafelek „Powtórki na dziś: N" na dashboardzie + ekran sesji powtórki — **Mila** design →
  **Jack** implementacja → skan **axe** (a11y).
- Migracja **`0042`** na prod NEON — **Ethan** (delegacja v1.12) + kopia Neon przed zmianą.
- Limit dzienny **D3** (cap na liczbę powtórek/dobę na UI), rotacja pytań.

**BRAMKI ZAPŁONU `FLAG_SPACED_REPETITION=1`** (świadoma decyzja Darka, wszystkie muszą paść):
1. **RODO** — reguła retencji dla `review_logs` w `retention.md` + nota RoPA (rejestr czynności
   przetwarzania) — **Ryan**.
2. **Realny test limitu 429** z Upstash (rate-limit) — **Quinn** (nie tylko test jednostkowy).
3. **Decyzja N1 phantom-wiersz** — zawęzić `EXISTS` do `single_choice` albo świadomie
   zaakceptować pusty wiersz — **Sophia/Ethan**.
4. **N2 indeks** `question_items(concept_id, status)` — pod zapytanie kolejki.
5. **N3** rozważyć `after()` (Next.js — praca po odpowiedzi HTTP) dla latencji zapisu logu.
6. **Migracja `0042` zastosowana na prod** (część R6).

### Dług równoległy (sesja Darka)

Partie A/B długu wpięte na `main` (kontrast, bramka a11y-tutor w CI). Prompt spłaty w historii.
Stash `stash@{0}` (v0.5 planu, **przeterminowany**) — do dropnięcia.

---

## STAN POPRZEDNI — 2026-07-25 (zapłon produkcyjny) — TUTOR 1.13 + 1E.3 MASTERY GATE — OBA LIVE NA PRODZIE (flagi=1, smoke-zweryfikowane)

**Jednym zdaniem:** dwie funkcje kręgosłupa zapalone na prodzie w uszanowanej
kolejności — tutor sokratyczny (1.13) PRZED egzaminem modułowym (1E.3 mastery gate);
obie flagi `=1`, każda potwierdzona smoke'em trasy (401 ≠ 404).

**Flagi na prodzie (deploy = release, świadoma decyzja Darka):**
- `FLAG_SOCRATIC_TUTOR=1` — tutor sokratyczny (widok projektu). Smoke
  `GET /api/projects/<uuid>/tutor` → **401** (trasa żyje).
- `FLAG_MASTERY_GATE=1` — 1E.3 egzamin modułowy. Smoke `POST /api/exam/start` → **401**
  (≠ 404).
- Kolejność roadmapy uszanowana: tutor wypuszczony PRZED egzaminem (twardy warunek
  „nie zapalać mastery gate przed tutorem 1.13").

**Łańcuch release'u (3 PR-y, autor Darek), baseline `main` = `7e54f69`:**
- **#233** (`1f48232`) — okablowanie bramki axe egzaminu w CI (blokujący job
  `a11y-exam`) + fix tokenu kontrastu `--muted-foreground` (5.50:1). Bramka `a11y-exam`
  zaobserwowana zielona.
- **#235** (`27a11e9`) — higiena zależności: override `brace-expansion >=5.0.8`
  (GHSA-mh99-v99m-4gvg, HIGH, dev-only tranzytywna). Odblokował skan zależności.
- **#234** (`7e54f69`, HEAD `main`) — C11 tutor a11y: fix powrotu fokusu (WCAG 2.4.3) +
  fix kontrastu stanu KRYZYSOWEGO `.tutor-crisis` `#dc2626`→`#b91c1c` (4.35→5.83:1,
  złapany wymuszonym skanem stanu kryzysowego — Leo słusznie go zażądał) + nowy skan
  axe tutora `63-c11-tutor-a11y.spec.ts` (4 stany zielone).

### DŁUG NOWY (5 ticketów, właściciele nazwani)

1. **M1 kontrast CTA** — `--ed-amber` biały-na-bursztynie 2.885:1 (przekrojowy:
   tutor/submit/brief/onboarding; kierunek: token `--ed-amber-text`) → **Mila, P2**.
2. **Wiring spec 63 tutora** → blokujący job w `pr.yml` z deterministycznym fixture
   projektu → **Eva, z terminem**.
3. **`.viva-crisis`** — ten sam defekt kontrastu co naprawiony `.tutor-crisis` →
   a11y ticket.
4. **Token `--ed-crisis-text` AA-safe** — literał `#b91c1c` powtórzony w
   `.tutor-crisis`/`.viva-outcome-failed` → dług tokenizacji.
5. **Normalizacja wartości flag env prod** (dryf pustego stringa) — obie zapalone flagi
   już jawne `"1"`, przejść resztę flag.

### GOVERNANCE (nieblokujące)

Branch-protection `required-status-checks` NIEDOSTĘPNE (repo prywatne na darmowym planie
GitHub → 403) — bramki CI egzekwowane **proceduralnie** (obserwacja checku przed merge).
Odblokowanie = GitHub Pro (wydatek) LUB repo publiczne (+Ryan/RODO) → decyzja Darka.

### 1E.4 (powtórki FSRS) — NASTĘPNA funkcja kręgosłupa

Plan zaakceptowany przez Darka (`docs/product/plan-1e4-fsrs-v0.1.md`), implementacja
**ROZPOCZĘTA** (R1 fundament w toku). Flaga `FLAG_SPACED_REPETITION` OFF.

---

## STAN POPRZEDNI — 2026-07-24 (sesja Oliver, COO — KRĘGOSŁUP TOR B) — 58/58 NOTEBOOKÓW + 1E.3 MASTERY GATE KOMPLETNY END-TO-END (backend+UI+bank na prod, flaga OFF)

**Jednym zdaniem:** dobudowane 10 brakujących notebooków-towarzyszy ćwiczeń
(M-ML + M-LLM) → **produkcja 58/58, drabina content-complete**; każda liczba
„done" potwierdzona odczytem z prod, nie na słowo.

**Baseline `main` = `b70ccd1`** (= `origin/main`). Prod: **58/58**, rozkład per
moduł: l0=4, f1=7, f2=7, f3=7, meda=4, mpd=8, msql=7, **mml=7**, **mllm=7**.

### Dwie partie (sekwencyjnie, jeden pisarz per gałąź, autor commitów = Darek)

**Partia M-ML (PR #223, merge `4eeb477`) — 53/58.** 5 towarzyszy ML.1/2/3/5/6
(worked example + brudnopis, **świadomie BEZ pieczątki** — atom `exercise`
zalicza się pytaniami). Sophia treść (weryfikacja sklearn: acc 1.0/0.833, macierz
[[1,1],[0,4]], precision 0.8/recall 1.0) → Ethan packer notebookUrl + build →
Quinn kontrakt-test (13→19, +6 adwersaryjnych, auto-łapie literówkę sluga) → Leo
GO Z NOTAMI → Ethan prod (backup `br-wispy-boat-al8tedpx`, ingest ×2, retired=0).
Komórka „Dane" (24 rekordy, 17 napiwków) bit-w-bit z ml-4.

**Partia M-LLM (PR #224, merge `b70ccd1`) — 58/58.** 5 towarzyszy LLM.1/2/3/5/6.
Sophia treść (LLM.5: zgodność 0.75, halucynacje 2/4=0.5, trafność 5/6·4/6·3/6;
**0 żywych wywołań API** — pierwsze wywołanie studenta = capstone; „Dane" bit-w-bit
z llm-4/llm-7) → Ethan packer+build → Quinn kontrakt-test (14→20) → Leo GO Z NOTAMI
(niezależnie przeliczył WSZYSTKIE liczby LLM.5) → Ethan prod (backup
`br-rough-resonance-albjhxaa`, ingest ×2, retired=0, downgrade=0). Weryfikacja PO:
notebookUrl 53→58, 0 wycieków logu QG do content_md.

### DŁUG NASTĘPCZY (fast-follow, niepilne — wpleść, nie robić osobno)

1. **ADR-010 l.120 NIEAKTUALNA** (Ethan): „Ethan NIE wykonuje — Darek wykonuje"
   sprzeczne z delegacją v1.12 i precedensem (M-EDA/M-SQL/M-ML) → runbook ADR-010
   §7 do modelu v1.12.
2. **Rekoncyliacja liczb ilustracyjnych sprzed-ADR-022** (Leo W1 + prompt): ADR-022
   §1.4/§2.5 (0.875→0.75) **oraz** Teoria atomu LLM.5 (hipotetyczne „4 przypadki" →
   kanoniczny zbiór 6/8; sedno 2/4=0.5 bez zmian). Towarzysz deterministycznie
   poprawny — rozjazd dotyczy Teorii. Wymaga re-ingest `content_md` LLM.5 + Leo.
3. **Noty Leo N1/N2 (#219):** komunikat D1 M-ML — edge Pipeline/podklasa (Gałąź A);
   brak testu jednostkowego Gałęzi A (non-DecisionTree→odmowa, token null).
4. **I1 (Leo):** guard `notebookUrlViolations` nie waliduje segmentu repo — przyszłe
   utwardzenie (packer-determinizm zamyka realne wejście).
5. **gitleaks FP** na slugu w `notebooks-mml.contract.test.ts:203` (`// gitleaks:allow`,
   zweryfikowany FP) — zgłoszone Ryanowi. ✅ `mllm-atomy.md` l.1437 — ZROBIONE (Sophia).

### ZADANIE 2 — 1E.3 MASTERY GATE — ZBUDOWANY END-TO-END, flaga OFF (deploy≠release)

Spec: ADR-014 **D3**. Plany/decyzje: `plan-1e3-mastery-gate-v0.1.md`, `decyzje-1e3-p5-egzamin-v0.1.md`
(Sophia), `mila-1e3-p5-egzamin-spec-v0.1.md`. Wg §7 mastery gate = progresja WEWNĘTRZNA = ocena
formująca → maszyna samowystarczalna (zero human-in-loop dla bramki). **Cały mechanizm na prodzie
za flagą `FLAG_MASTERY_GATE` OFF** — student NIC nie widzi do świadomego zapłonu. Każdy plasterek:
Quinn adwersaryjnie + Leo (14 domen), autor commitów = Darek.

**✅ SCALONE + na prodzie (flaga OFF):**
- **P1** `ba25e9a` — scaffold: flaga OFF, Zod `examConfigJson` (próg=licznik błędów ≥90%), `exam` w ITEM_KINDS.
- **P2** `120ee5e` — migracja **0041** na Neon (`assessment_sessions`: `module_id` FK restrict, `module_exam`,
  unique per (student,kind,module) z COALESCE, CHECK integralności). Backup `…pre-0041-…`.
- **P3** `0461dcd` — silnik: `gradeExam` (licznik błędów), warianty FNV-1a (cap 2, anti-wyrocznia), API
  `/api/exam/*` (404 OFF; **odpowiedzi NIGDY do klienta** — 5 wektorów). R4: pytania w `question_items` DENY,
  `examSlots`=tylko UUID.
- **P4** `b713bab` — correctives: paczka `failedConcepts`→≤3 atomy (filtr w ON, R2), ślad aktywności; w `result_json`.
- **P4.5** `a6579aa` — maszyna stanów cyklu (`evaluateExamCycle`: granica z timestampów, `failedInCycle` scoped,
  „correctives odbyte" z `curriculum_item_answers`), `/start` w S-C → **HTTP 423 `correctives_required`** (domyka
  lukę `clampAttempt(3)=2`). + W1 `syncQuestionBank` exam-aware + hoist `pgErrorCode` (4 trasy, naprawia latentny
  owinięty-23505→500) + I1. Bez migracji.
- **P5** `63bee3b` — UI: drabina z bramką + „test out", ekran egzaminu (liniowy, ~25 min, pauza/wznowienie),
  wynik (3 warianty), correctives (koncept→atomy, atom-less→tekst, 4. pod-stan „w toku"), resolver
  `/curriculum/atom/…`, obsługa 423. Seam `getModuleExamGate`→`evaluateExamCycle` (jedyne źródło S-C, 7/7 na
  żywej bazie). Design system bez nowych tokenów, a11y RTL.
- **C1 bank F1 NA PRODZIE** (backup `br-quiet-queen-al8ayk83`, ingest ×2 idempotentny) — 30 pytań
  (`question_items` DENY), `examSlots` **tylko-UUID** (W1 na prodzie, grep=0 wycieków), `exam_config {15,1}`.
  Bank v1.0 QG-GO Sophii (30 wariantów re-wykonane w Pythonie 3.12+3.14, zero driftu).

**Baseline `main` = `63bee3b`.** Notebooki bez regresji (58). Smoke: `/api/exam/start`→404 (flaga OFF).

**🚦 ZOSTAJE PRZED ZAPŁONEM FLAGI (świadoma decyzja Darka):**
- ✅ **W1** (write-side examSlots tylko-UUID — na prodzie) · ✅ **W2** (test integr. `/api/exam/*` — złapał realny
  bug współbieżności Drizzle-wrapped-23505) · ✅ **W3** (koncepty egzaminu nie diagnostic+market+active — na prodzie).
- ✅ **Tutor 1.13** — ZROBIONE, zapalony na prodzie PRZED egzaminem (`FLAG_SOCRATIC_TUTOR=1`, #234).
- ✅ **axe a11y** (twardy warunek Leo B) — ZROBIONE: bramka `a11y-exam` w CI zielona (#233) + skan axe tutora
  `63-c11-tutor-a11y.spec.ts` (#234). Wszystkie bramki zapłonu spełnione → flagi 1E.3 i tutora zapalone (patrz STAN NA DZIŚ).

**🔧 DŁUG 1E.3 (backlog, nieblokujący):** batch `evaluateExamCycle` (N+1 przy wielu cyklach — I Leo); ekstrakcja
`FORBIDDEN_EXAM_SLOT_KEYS` po 3. konsumencie (I1); test „zero-query przy OFF"; komunikat I3 (423-bez-paczki →
dedykowany zamiast „network"); lint-boundary `correctives.ts` (0 DB/LLM).

- **1E.4 powtórki FSRS** — NASTĘPNA funkcja kręgosłupa po 1E.3 (odblokowane hintDepth #217 + MIS.1).

---

## STAN POPRZEDNI — 2026-07-24 (rano) — KROK 4: WSZYSTKIE LABY DRABINY NA PRODZIE (nowy kontrakt oceny ADR-020/022); 48/58 NOTEBOOKÓW, 10 TOWARZYSZY ĆWICZEŃ DO DOBUDOWANIA

**Jednym zdaniem:** wszystkie laby drabiny — z modułami M-ML i M-LLM włącznie — są
na produkcji z nowym, twardszym kontraktem oceny (ADR-020/ADR-022); do
content-complete zostaje **10 notebooków-towarzyszy ćwiczeń** (warstwa dydaktyczna,
bez pieczątki-tokenu) → wtedy prawdziwe **58/58**.

### Na prodzie tej sesji (5 zaciągów, każdy pod bramkami Quinn + Leo)

- **#217 hintDepth (ADR-018)** — głębokość podpowiedzi (`hint_depth`) liczona
  SERWEROWO w chwili zamknięcia deklaracji klienta (koniec deklaracji, nie klient).
  Migracje 0039/0040 na NEON. **Odblokowuje 1E.4 (FSRS — algorytm powtórek).**
  Backup `br-fragrant-sound-al88573l`.
- **#218 M-SQL fix (ADR-017)** — rozerwana korelacja minuta↔kwota + `z3_miejsca1_ids`;
  dziura „odwrotne sortowanie → token" (fałszywe zaliczenie) ZAMKNIĘTA.
  Backup `br-sparkling-tooth-al9imx5v`.
- **#219 M-ML (ADR-020)** — pathfinder nowego kontraktu oceny: sprawdzamy wektor
  predykcji + tożsamość próbki (D1), pochodzenie podziału (D2), anty-przeciek (D3),
  rozkład predykcji (D4). Zbiór model-agnostyczny (6 różnych potoków myli id=18).
  Pieczątki ml-4/ml-7. Backup `br-icy-math-algnxu39`.
- **#220 D1 fix** — komunikat D1 rozgałęziony: legalny inny model vs zepsuty potok;
  decyzja bramki G4 = ODMAWIAĆ. Zmiana tylko w komunikacie, bez ponownego zaciągu.
  Zawężenie parytetu w ADR-020: pełna model-agnostyczność NIEMOŻLIWA na granicznym id=18.
- **#221 M-LLM (ADR-022)** — ostatni moduł labów: zakotwiczony wskaźnik halucynacji,
  trafność per pole + tolerancja, rozdział parsowanie/schemat, filtr schema-valid
  (parytet: przeliczenie ↔ proza). `zgodnosc`=0.75. Backup `br-twilight-moon-al31z4eq`.

Wszystkie pod bramkami Quinn (mutacją) + Leo (14 domen). Serializacja prod między
sesjami wg runbooka `6f4117c` (backup = gałąź NEON, nie git).

### Debt-sesja równolegle (Darek)

a11y (fokus + `role="alert"`), f2-7 (sonda asymetryczna), retencja R-1 (skrypt
egzekucji), marketPercentage §8c (ADR-021, źródło serwerowe), **U1** (parytet
audit-logu `SubagentStart`/`SubagentStop` — czerwona linia, Plan Mode Darka).

### Inwentarz notebooków — PRAWDA (nie „58/58")

**48 zbudowanych** (46 przed #221 + 2 M-LLM). **Brakuje 10 towarzyszy ćwiczeń:**
M-ML 5 (ML.1/2/3/5/6) + M-LLM 5 (LLM.1/2/3/5/6) — warstwa dydaktyczna Sophii
(wprowadzenie + brudnopis, BEZ pieczątki; ~20 h, widełki 16–26 h). ⚠ Ćwiczenia
JUŻ odsyłają studenta do tych notebooków po nazwie → na prodzie są złamane
odniesienia (niepilne — zero realnych studentów). Cel 58 = poprawny
(notebook-per-atom), nie zmiana zakresu.

### Dług następczy (w kolejce, niepilny)

- **ADR-022 §1.4/§2.5** — liczby ilustracyjne SPRZED D3 (0.875) bez znacznika
  „przed/po" w tekście; rekoncyliacja do 0.75 (poprawka-dogrywka w dokumentacji).
- **`sophia-1e2-mllm-atomy.md` ~l.1437** — nieaktualne zdanie „manifest na starych
  wartościach — blocker"; #221 to naprawił, usunąć.
- **Leo N1/N2 (#219-followup)** — brzeg Pipeline/podklasa w komunikacie D1; brak
  testu jednostkowego Gałęzi A.

### NASTĘPNE (kolejność)

1. **10 towarzyszy ćwiczeń M-ML/M-LLM** (Sophia, partiami w time-boksie) →
   content-complete i prawdziwe **58/58**.
2. **1E.3 mastery gate** (odblokowane — bramka na labach) → **1E.4 FSRS**
   (odblokowane przez hintDepth #217).
3. Dług dokumentacyjny (dogrywki wyżej).

### Baseline `main` po tej sesji

`8d4aa80` (#221). Notebooki **48/58**. Gałęzie NEON: **9**. Bramka środowiska
(sonda Colab): **OTWARTA** (~2026-10-31).

---

## STAN POPRZEDNI (ten sam dzień) — M-EDA NA PRODUKCJI (44/58); SONDA WYKONANA, BRAMKA OTWARTA

**Jednym zdaniem:** partia 7 (M-EDA) jest na produkcji — sonda środowiska
wykonana przez Darka odblokowała bramkę, zaciąg przeszedł, **produkcja = 44/58**.
Po drodze security-patch Next.js (4 wysokie advisory z App Router) wszedł osobnym
PR-em, bo blokował deps-scan na całym main.

### Produkcja: zaciąg M-EDA (44/58) — WYKONANY 2026-07-23 (Ethan, mandat v1.12)

- **Backup przed zaciągiem:** gałąź Neona **`prod-backup-pre-ingest-krok4-meda-20260723`**
  (`br-solitary-river-alkdbxgl`), zero-kopiowy snapshot `main` (`br-proud-sun-al3aezrj`).
  Punkt przywracania: Neon Console → Branches → main → Restore z tej gałęzi.
- **Zaciąg** `CONFIRM_PROD_DB=1 pnpm db:ingest-curriculum` na **DIRECT** (bez poolera),
  transakcyjny (`BEGIN…COMMIT`, upsert + `DELETE WHERE`+`INSERT`, **nigdy** `db:seed`),
  **×2 idempotentny** — oba biegi identyczne: moduły=9, pozycje=70, prereqi=8;
  bank koncepty=43, pytania **+0** / 129 bez zmian / **0 retired**; **0 downgrade**
  module_progress.
- **⚠ 0 retired to dowód, nie szczęście** — niezmiennik F1 (żaden koncept ani
  `questionRef` nie przecina granicy `M-*`/nie-`M-*`) trzyma: gdyby przeciął,
  `syncQuestionBank` wygasiłby cicho pytania na prodzie. Bramkuje to test z #208.
- **Weryfikacja PO (odczyt z prod):** notebookUrl **40 → 44** ✅; m-eda:
  eda-1/2/3 `url=true, checks=false`, **eda-4** `lab, url=true, checks=true`
  (1 lab z checkami), **eda-przeglad bez URL-a**, capstone bez zmian;
  **0 wycieków logu QG do `content_md`** (grep markerów WAŻN/KRYT/INFO-/errata/
  TODO/imion ról → 0).
- **Smoke prod:** `/` 200, `/login` 200, `/api/curriculum` 401, `/curriculum` 307;
  notebook `eda-4` raw **200** (student otworzy). **Produkcja: 44/58.**

### Sonda środowiska Colab — WYKONANA (ADR-016 D3) — PR #209 (squash `1bc5bce`)

Darek uruchomił sondę 2026-07-23. `pnpm srodowisko:zapisz-sonde` **przeliczył
werdykt w repo z surowego `faktyczny`** (zabezpieczenie Evy — nie ufa polu `zgodny`
z notebooka):
- **cytaty 35/35 zgodne**, `niezgodnosciWerdyktu: 0`. DB-01 z ogonem
  `Did you mean "pg_prepared_statements"?` i K2-02/03 w nawiasach listy —
  **zgodne** pod dopasowaniem prefiksowym (ADR-016 D5), przeliczenie potwierdziło.
- **python 3.12.13** — pierwszy realny pomiar, w zakresie 3.11–3.13 (zastąpił `null`);
  pandas 2.2.2, duckdb 1.3.2, requests 2.32.4 — wszystkie w pinie; BDL 200,
  kontrakt rekordu bez zmian.
- `rozjazd: false`, `ostatnia_sonda: 2026-07-23`. **`pnpm srodowisko:bramka` →
  OTWARTA (exit 0)** na 100 dni od daty sondy. Dowód sondy:
  `docs/curation/sondy/sonda-srodowiska-20260723.txt`.
- Noty `python`/`requests` w deklaracji przepisane z „nikt nie zmierzył" na czas
  przeszły (plik nie może twierdzić czegoś, co sonda obaliła).

### Next.js 16.2.9 → 16.2.11 — PR #210 (squash `c1b6f9a`) — cztery wysokie advisory

Nocny deps-scan zczerwieniał na main (bieg 05:48, `b4e528d` był zielony o 21:59) —
cztery advisory Next.js z 2026-07-23, zakres `>=16.0.0 <16.2.11`: bypass
middleware w App Router (GHSA-6gpp-xcg3-4w24), DoS (GHSA-m99w-x7hq-7vfj), dwa SSRF
(GHSA-89xv-2m56-2m9x, GHSA-p9j2-gv94-2wf4). Patch bump domyka wszystkie cztery.
Blokował merge sondy i każdy inny — dlatego wszedł pierwszy, sonda rebase'owana na
zielony main. Review Leo: ACCEPT bez uwag blokujących.

### 🔒 Nota architektoniczna N1 (Leo, do utrwalenia — reguła, nie przypadek)

**Autoryzacja żyje w trasach i layoutach RSC, nie w pośredniku (middleware) —
świadomie.** 68 sprawdzeń sesji w 57 trasach + layout RSC czyta sesję serwerowo;
pośrednik NIE jest u nas granicą autoryzacji. Dlatego cała klasa CVE „obejście
pośrednika" (jak GHSA-6gpp-xcg3-4w24) jest dla nas **utwardzeniem, nie incydentem**
— grunt pod autoryzacją się nie przesuwa. **Gdyby ktoś przeniósł decyzję
autoryzacyjną do pośrednika** (kuszące dla wydajności), ta odporność znika.
Trzymać autoryzację w trasach/RSC to intencjonalna reguła bezpieczeństwa.

### Stan sekwencji Kroku 4 (notebooki)

44/58 na produkcji. Pozostałe do 58: moduły `M-ML` i `M-LLM` (po 7 notebooków
wg inwentarza) + ewentualne dogrywki. Każda kolejna partia M-* przed zaciągiem
wymaga **świeżej sondy** (ADR-016 D3: bramka bezwarunkowa dla M-*, ważność 100 dni
— sonda z 2026-07-23 pokrywa okno do ~2026-10-31).

### CZEKA NA DARKA (nie blokuje 44/58)

1. **E-1 (Ryan)** — decyzja o klauzuli informacyjnej art. 13 wobec obietnicy
   złożonej uczelniom (sign-off `hint-reveals-retencja-signoff.md`). Nie blokuje
   drabinki hintów ani niczego na prodzie.
2. **Zrzuty `meda-5`/`meda-6`** + test labu EDA.4 na świeżym koncie (autoryzacja
   Colab↔GitHub od zera) — treść działa bez nich.
3. Starsze zaległości — sekcja „Otwarte zaległości (akcje Darka, nie kod)" na końcu
   pliku (tokeny 0.7-sekret, CSP 0.13, baza testowa `:5433`, Dependabot).

### Otwarte w kolejce Engineeringu (nie na prodzie)

- **Serwerowa drabinka hintów** (ADR-018, plan naprawy `hintDepth`) — rozstrzygnięte
  A1/A2/A3, Max może zaczynać; potem `marketPercentage` (dług wyższej wagi —
  deklaracja klienta pokazywana uczelni), potem 1E.4 (FSRS).
- **Gałąź backupu** `prod-backup-pre-ingest-krok4-meda-20260723` — zostawić kilka
  dni, potem skasować (oszczędność compute), jak poprzednie.

### Baseline `main` po tej sesji

`1bc5bce` (sonda #209) na bazie `c1b6f9a` (Next 16.2.11 #210) i `ee07e11`
(partia 7 #206). Publikacja notebooków: `skillbridge-notebooks` @ `32eb909`
(`meda/` + `sonda/`). **Produkcja: 44/58**, backup `br-solitary-river-alkdbxgl`.
Bramka środowiska: **OTWARTA** (sonda 2026-07-23, ważna ~100 dni).

## Poprzednio tego dnia — 🔴→🟢 FLAGI ZAPALONE NA PRODZIE; ETYKIETY UI ZWERYFIKOWANE ZRZUTAMI

### 🔑 ZMIANA ZAŁOŻENIA, KTÓRA ODBLOKOWAŁA WSZYSTKO

**Darek (2026-07-22): aplikacja NIE MA żadnych realnych studentów** — wszystkie
konta na prodzie (w tym „27 studentów" z handoffów 2026-07-13/14) to konta
testowe/jego własne. Cała racja trzymania `FLAG_CURRICULUM_PATH=0` (ochrona
realnych studentów przed ślepym zaułkiem „notebook bez linku") **przestała
obowiązywać**. Polecenie: zapalać flagi i prowadzić implementację do końca.
⚠ Założenie wygasa z chwilą pierwszej realnej rejestracji.

### FLAGI ZAPALONE (Production + redeploy, 2026-07-22)

- `FLAG_CURRICULUM_PATH=1`, `FLAG_CONFIDENCE_PROBE=1`, `FLAG_PASSPORT_FRESHNESS=1`
  (redeploy `skill-bridge-qdatxdjy5…`, aliased na `skill-bridge-ai-seven.vercel.app`).
- **Dowód funkcjonalny (nie deklaracja):** `/api/curriculum` **401** (było **404**
  przy fladze OFF — trasa istnieje, wymaga tylko logowania), `/curriculum` 307
  na login, `/` i `/login` 200. ⚠ `vercel env pull` MASKUJE wartości
  (pokazuje `""` nawet dla flag na pewno zapalonych) — weryfikacja MUSI być
  funkcjonalna, nie przez odczyt env.
- **Drabina L0→M-PD jest odtąd WIDOCZNA i PRZECHODNIA dla zalogowanego konta.**

### Screenshoty kontrolne UI — TODO z QG domknięte (PR #204, squash `eeed503`)

Darek dostarczył 6 zrzutów (w repo: `docs/curation/screenshots/*-20260722.png`)
— dowód dla kwartalnej reweryfikacji `verifiedAt` (D4).

- **L0 — ZERO korekt, treść potwierdzona litera-w-literę.** Ostrzeżenie:
  „Ostrzeżenie: Google nie jest autorem tego notatnika" + przycisk „Uruchom
  mimo to" (cytat L0.1 zgodny); nazwa kopii: „Kopia notatnika `<plik>`"
  (L0.2 i hint 2 trafione). Ostrożna redakcja Sophii się obroniła.
- **M-EDA (EDA.2) — 3 rozjazdy, poprawione:** (1) GitHub NIE MA przycisku
  „New repository" — jest „New" → formularz „Create a new repository"
  („Repository name"/„Description"/„Choose visibility"→„Public") → przycisk
  „Create repository"; (2) okno zapisu z Colab to „**Kopiuj do GitHuba**",
  a pole opisu commita ma etykietę „**Komunikat zatwierdzenia**"; (3)
  **ZNALEZISKO DYDAKTYCZNE:** Colab wstawia domyślne „Utworzono za pomocą
  Colab" — bez nadpisania student buduje historię identycznych, pustych
  commitów, czyli **oblewa kryterium rubryki „sensowna historia commitów"**;
  treść i hint 2 dostały jawny nakaz nadpisania.
- Potwierdzone bez zmian: „Add file"→„Create new file"; brak pozycji „Zapisz
  kopię w usłudze GitHub" w menu **podglądu cudzego notebooka** — dokładnie
  jak przewidywał hint 3 (zrzut `meda-1` potwierdza realnym UI).
- **Werdykt wideo PL (wlRT_MZOvBE): Darek ZATWIERDZA jako zasób L0** (seans
  kontrolny odbyty 2026-07-22).

### ⚠ PUŁAPKA ARCHITEKTONICZNA (kosztowała pół godziny — nie powtarzać)

**`tools/content/curriculum-atoms/*.json` to ARTEFAKTY GENEROWANE** przez
`tools/pack-curriculum-atoms.ts` z dokumentów `docs/curation/sophia-1e2-*-atomy.md`.
Ręczna edycja JSON-a **znika bez śladu**: test `curriculum-atoms.contract.test.ts`
→ „DETERMINIZM: packer odtwarza commitowane JSON-y 1:1" URUCHAMIA packer
w trakcie biegu i nadpisuje plik. Objaw mylący: „hook Biome cofnął mi zmiany"
(Biome jest niewinny — sprawdzone empirycznie) + „pierwszy bieg testu czerwony,
drugi zielony". **Poprawki treści nanosić WYŁĄCZNIE w `docs/curation/*.md`,
potem repack.**

### PROD — ingest etykiet (czerwona linia wzorcem)

- Backup: **`prod-backup-pre-ingest-etykiety-eda2-20260722`**
  (`br-steep-glitter-alizh8ow`). Gałęzi Neona: **8** (nic przeterminowane —
  wszystkie backupy z 21–22.07).
- Ingest ×2 idempotentny (oba biegi: moduły=9, pozycje=70, prereqi=8,
  pytania 129 bez zmian, 0 downgrade'ów progresu).
- **Weryfikacja PO:** stara etykieta „New repository" **0 wystąpień w całej
  bazie**; „Komunikat zatwierdzenia" 1×, „Utworzono za pomocą Colab" 1×,
  „Create a new repository" 1× (wszystko w eda-2); 33 pozycje z `notebookUrl`
  (bez zmian); **0 wycieków notatek/errat do `contentMd`** (znany incydent QG L0).
- Smoke po ingeście: `/` 200, `/login` 200, `/api/curriculum` **401**,
  `/curriculum` 307.

### Baseline `main` po tej sesji
build OK · tsc 0 · Biome 0 · unit **1416/1416** · pełna bramka CI zielona
na #204 i #205 · notebooki **40/58** · gałęzie Neona: **9**.
⚠ Nota: jeden bieg `test:run` w trakcie prac był czerwony (1 failed), kolejnych
6 zielonych przy stabilnym diffie — nie odtworzony, nie zidentyfikowany.
Obserwować w CI.

### NASTĘPNE (kolejność)
1. ~~Notebooki M-SQL (7)~~ — ZROBIONE (#205). Zostaje **18/58**: **M-ML (7)**,
   **M-LLM (7)** (nota: 4 pola-braki prawdy w przypadkach parsowalnych),
   **M-EDA (4)** — screenshoty dostarczone 2026-07-22, partia odblokowana.
   Cel: **58/58**.
2. **Test przebiegu ≤15 min L0.1** (D10) — akcja Darka, teraz wykonalna na
   żywym prodzie z zapalonej flagi (czyste konto Google, stoper).
3. **1E.3** (packer: `exam` w `ITEM_KINDS`) → **naprawa `hintDepth`** → **1E.4**.
4. Otwarte drobiazgi: sign-off Ryana za `aiLight` (#190), UX 429 tury czatu,
   `git remote set-url` (repo = `Danolog/nordsignal-skillbridge`), rotacja
   `GITHUB_TOKEN` (0.7-sekret), SageMaker free plan, 1E.R2.

## STAN POPRZEDNI — 2026-07-21 (późna noc) — NOTEBOOKI M-PD NA PRODZIE, KOREKTA INWENTARZA M-*

### Partia 5: notebooki M-PD (8 szt.) — PR #200 (squash `b27fc8e`), **33/58**

⚠ **Korekta inwentarza M-* (jak wcześniej F3=7):** liczby „M-PD=9,
M-SQL=9, M-ML=9, M-LLM=9" były szacunkiem sprzed finalizacji modułów.
Realne atomy (bez `*-przeglad`, który notebooka nie dostaje): **M-PD=8,
M-EDA=4, M-SQL=7, M-ML=7, M-LLM=7** → M-*=33, cel całkowity = **58**
notebooków (nie 65). Zrobione **33/58** (L0=4, F1=7, F2=7, F3=7,
M-PD=8); zostaje 25 (M-EDA=4, M-SQL=7, M-ML=7, M-LLM=7).

- Wzorzec F1–F3 + **nowe mechanizmy**: pierwsze notebooki z pandas —
  **CI job `test` dostał krok `pip install "pandas~=2.2.0"`**
  (parytet z Colab 2.2.2; harness wykonuje komórki realnym python3;
  zmiana CI w tym samym PR co testy, które jej wymagają). Pieczątka
  PD.4: własna maska na `df`, „jedno województwo w `maz`" przez indeksy
  (`df.loc[maz.index, ...]` — nota inżynierska Sophii), wartości
  porównywane z pełną tabelą. Pieczątka PD.8: kontrakt wejścia
  12 wierszy / 2 braki / **odcisk sumy wartości (1003.1)**, widełki len
  7–12, **pochodzenie wierszy `dane_analiza` multizbiorem rekordów**
  (niezależne od indeksu — `fillna(0)` dostaje celną odmowę, `reset_index`
  legalny), niezależne przeliczenie `groupby(...).mean()`.
- **QG agentem (realne wykonanie, 31 ścieżek): GO Z NOTAMI (0K/4W/8I)**
  — wszystkie WAŻN wcielone + regresje w kontrakt-teście
  (`notebooks-mpd.contract.test.ts`, 21 testów): (1) token za `fillna(0)`
  → check pochodzenia; (2) kontrakt wejścia tylko kształtowy → odcisk
  wartości; (3) fałszywa liczba w przykładowym zdaniu decyzji PD.5;
  (4) hint 3 PD.8 cytował „17% roku 2022", braki są w 2020/2021 —
  poprawka w dokumencie Sophii + repack. Log w `sophia-1e2-mpd-atomy.md`.
- **Publikacja:** `skillbridge-notebooks` @ `b99a26c` (katalog `mpd/`,
  raw 8×200).
- **PROD:** retencja — usunięte 2 przeterminowane gałęzie
  (pre-0037-20260713, pre-ingest-partia2-20260714); backup
  **`prod-backup-pre-ingest-krok4-mpd-20260721`**
  (`br-ancient-moon-al3kt8x1`); ingest ×2 idempotentny (moduły=9,
  pozycje=70, pytania 129 bez zmian); weryfikacja PO: **33 pozycje
  z notebookUrl** (4+7+7+7+8 — jedyne w bazie), `pd-przeglad` bez URL-a,
  0 labów bez checków, poprawiony hint pd-8 na prodzie (stary rok 2022
  zniknął). Smoke: `/` 200, `/login` 200, `/api/curriculum` 404
  (flaga OFF — bez zmian, czeka na akcje Darka).
- ⚠ **Nota:** repo aplikacji przemianowane na GitHubie na
  **`Danolog/nordsignal-skillbridge`** (push/PR działają przez redirect;
  lokalne originy wciąż wskazują stary URL — działa, ale przy okazji
  warto zrobić `git remote set-url`).
- **Następna partia (M-EDA=4):** wymaga screenshotów UI (akcje Darka —
  zgłoszone); kontrakty danych M-SQL (listing `przejazdy`/`strefy`)
  i M-LLM (4 pola-braki parsowalne) przybite w #197.

### Dopisek 2026-07-22 (rano): nocny bieg + naprawa deps-scan (PR #202)

- **Nocny tor e2e-llm ZIELONY ZE SCHEDULE pierwszy raz** (run 29894578830,
  05:43 UTC: 9 testów w 10m41s) — poprzedni zielony (#195) był z ręcznego
  workflow_dispatch; to pierwszy miarodajny bieg automatyczny.
- W tym samym biegu **padł deps-scan**: 3 nowe HIGH z nocnych advisories —
  2× `fast-uri` (GHSA-4c8g-83qw-93j6, GHSA-v2hh-gcrm-f6hx; łańcuch dev
  `shadcn>@modelcontextprotocol/sdk>ajv`) i `sharp <0.35.0` (libvips CVE,
  ścieżka `next>sharp`). Naprawa wzorcem #184 (`pnpm.overrides`):
  `fast-uri ^3.1.4` (podbicie istniejącego), `sharp ^0.35.0` (nowy) —
  PR #202. Po zmianie: 0 high (7 low / 15 moderate — nieblokujące);
  build + unit 1387/1387 zielone z sharp 0.35.3.

### Baseline `main` po tej sesji
build OK · tsc 0 · Biome 0 · unit **1387/1387** · pełna bramka CI
zielona na #200 · notebooki **33/58** · gałęzie Neona: **9**.

## STAN POPRZEDNI — 2026-07-21 (noc) — NOTEBOOKI F1+F2+F3 I SPŁATA DŁUGU 6 LABÓW NA PRODZIE

### Część 4: notebooki F3 (7 szt.) — PR #199 (squash `5a9eab1`), **25/65**

⚠ **Korekta inwentarza:** F3 ma **7 atomów, nie 8** (szacunek „F3=8"
z 2026-07-13 był sprzed finalizacji modułów) → łączny cel = **65**
notebooków, zrobione 25 (L0=4, F1=7, F2=7, F3=7); zostają M-*=40.

- Wzorzec F1/F2 + **nowe mechanizmy**: pieczątka mini-projektu F3.7
  z kamieniami K1/K2/K3 — **sonda WIELOFUNKCYJNA** (trzy funkcje studenta
  na próbnej tabeli, `ref_*` własnymi pętlami) + K3 spójność sum
  z kategoriami wyprowadzonymi z DANYCH studenta; payload spłaszczony
  (lista kwot — kanonizacja nie przenosi słowników). F3.4: pieczątka
  przelicza sito własną pętlą → relacje serwerowe `ref_*`.
- **STRAŻNIK TRWAŁY** `notebooks-stamp-syntax.contract.test.ts`:
  kompiluje python3-em każdą komórkę-pieczątkę każdego zbudowanego
  notebooka — klasa błędu „ASCII `"` po polskim cudzysłowie" (wracała
  w F1/F2/F3) już nie przejdzie builda.
- **QG agentem: ZATWIERDZONE (0K/1W/5I)** — WAŻN wcielone + test
  regresyjny (pieczątka F3.7 nie weryfikowała lokalnie KWOTY rekordu
  z `najdrozszy` — token wychodził lokalnie, serwer odrzucał bez
  wskazówki); INFO-1 wcielone (strażnik niepustej listy F3.4).
  Log w `sophia-1e2-f3-atomy.md`. (Nota operacyjna: QG padło 2× —
  wygasły login + 522 Cloudflare — trzeci bieg czysty.)
- **Publikacja:** `skillbridge-notebooks` @ `478b2ac` (katalog `f3/`,
  raw zweryfikowany 200).
- **PROD:** backup **`prod-backup-pre-ingest-krok4-f3-20260721`**
  (`br-round-dawn-alzx7bli`); ingest ×2 idempotentny; weryfikacja PO:
  **25 pozycji z notebookUrl** (pełne fundamenty L0→F3), 0 labów bez
  checków, `f3-przeglad` bez URL-a. Smoke: `/` 200, `/login` 200,
  `/api/curriculum` 404 (flaga OFF).

### Część 3: notebooki F2 (7 szt.) — PR #198 (squash `884bc4f`), 18/66

- Wzorzec F1 + **nowe mechanizmy**: pieczątka F2.7 WYWOŁUJE funkcję
  studenta na próbnej liście (`[1,2,3]→6`, parytet z serwerowym
  value-checkiem `sonda_suma_wydatkow`; celny komunikat przy pętli po
  globalnej liście); pieczątka NIE wywołuje `input()` (token bez
  interakcji); `_zrodlo` = ostatni kandydat z KOMPLETEM
  `input(`/`if`/`else` (lekcja F1.7). Harness: kolejka `inputs`.
- **QG agentem (realne wykonanie komórek + WSZYSTKIE ścieżki odmów):
  GO Z NOTAMI (0K/0W/7I)** — m.in. zweryfikowane, że `NameError`
  w `_luka_(input(...))` pada PRZED polem input; INFO-5 wcielone;
  log w `sophia-1e2-f2-atomy.md`. Kontrakt-test notebooks-f2: 13 testów.
- Pułapka CI tej partii: flaga regex `/s` (dotAll) nie przechodzi przez
  `tsc --noEmit` (target) — używać `[\s\S]`; lokalny `pnpm build` tego
  NIE łapie, typecheck w CI tak.
- **Publikacja:** `skillbridge-notebooks` @ `b68a947` (katalog `f2/`).
- **PROD:** retencja — usunięte 2 przeterminowane gałęzie backupowe
  (pre-0036, pre-ingest-1er z 2026-07-13); backup
  **`prod-backup-pre-ingest-krok4-f2-20260721`** (`br-crimson-unit-al0vmsm2`);
  ingest ×2 idempotentny; weryfikacja PO: **18 pozycji z notebookUrl**
  (4 L0 + 7 F1 + 7 F2 — komplet fundamentów L0/F1/F2), `f2-przeglad`
  bez URL-a. Smoke: `/` 200, `/login` 200, `/api/curriculum` 404
  (flaga OFF).

### Część 2: dług treści 6 labów SPŁACONY (PR #197, squash `9509007`)

Dług z 1E.6b (PD.4/PD.8/EDA.4/SQL.4/SQL.7/LLM.7 — niesprawdzalna treść,
uczciwe 501) domknięty; **wszystkie 19 labów ścieżki ma realny kontrakt
checków** (kontrakt-test pilnuje 19/19 — dług nie wróci po cichu).

- **Poprawki treści:** PD.4 — Zaliczenie bez sprzeczności (pieczątka
  porównuje wartości `maz` z pełną tabelą); PD.8 — kształt danych przybity
  (12 wierszy / 2 braki, widełki `len` 7–12); EDA.4 — kotwica
  `srednie_rok` + status 200; SQL.4/SQL.7 — wyniki pod `z1`–`z3` przez
  `.df()` (SQL.1), nazwy częścią specyfikacji; LLM.7 — `zgodnosc` =
  ODSETEK (0.875), `halucynacje_wskaznik` 0.5 = 2/4 pól-braków (przybite
  w treści), `trafnosc` czytana jako lista w kolejności `POLA`.
- **QG agentem (realne przeliczenia): GO Z NOTAMI (0K/2W/5I)** — agent
  przeliczył WSZYSTKIE `expect` niezależnie (pandas, DuckDB, ŻYWE API BDL,
  26 symulacji ładunków przez `evaluateChecks`). WAŻN wcielone:
  (1) **kanoniczny listing `przejazdy`/`strefy`** przybity w „Notatkach
  dla Olivera" msql (wartości były rozsypane po hintach 5 atomów —
  budowniczy notebooków M-SQL mógłby zbudować dane niezgodne z checkami);
  (2) kontrakt SQL.4 rozszerzony o `z1_wiersze=5`. Logi QG w 4 dokumentach.
- **Nota dla budowniczego notebooków M-LLM:** wszystkie 4 pola-braki
  prawdy w przypadkach PARSOWALNYCH (TODO w mllm — inaczej wskaźnik 2/4
  nieokreślony).
- **PROD:** backup **`prod-backup-pre-ingest-dlug6labow-20260721`**
  (`br-ancient-heart-al1kqhq4`); ingest ×2 idempotentny (9/70, pytania
  bez zmian); weryfikacja PO: 19/19 labów z checkami (5–6 per lab),
  `z1_wiersze` w sql-4, 0 przecieków listingu do contentMd, `0.875`
  w llm-7, `srednie_rok` w eda-4. Smoke: `/` 200, `/login` 200,
  `/api/curriculum` 404 (flaga OFF).

### Co się wydarzyło (PR #196, squash `4f24f91` na main)

- **7 notebooków Colab F1** wg wzorca L0 (percent + wspólny blok
  `pieczatka.py`): 5 **notebooków towarzyszących ćwiczeń** (WE + brudnopisy,
  ŚWIADOMIE BEZ pieczątki — atom `exercise` zalicza się pytaniami; klasa
  doprecyzowana w ADR-015 §7) + 2 laby **F1.4/F1.7** z pieczątką.
- **Nowe mechanizmy vs L0:** `config.notebookUrl` dozwolony przy
  `kind="exercise"` (walidator packera + `item-view` + przycisk Colab
  w `item-detail`); builder dopuszcza 0-lub-1 pieczątkę (podział
  lab/ćwiczenie egzekwuje kontrakt-test względem JSON-a modułu); pieczątka
  F1.7 czyta źródło komórki programu z historii sesji **`In`** i wysyła jako
  `_zrodlo` (serwerowy check `contains_all if/else`, fragile). Harness
  testowy emuluje `In` + `insertCells`.
- **Kontrakt-test** `tests/unit/ds/notebooks-f1.contract.test.ts` (37):
  warstwy, drift buildera, notebookUrl→istniejący plik, parytet stringów
  wielolinijkowych, happy+odmowy obu labów na checkach z prod-JSON-a,
  regresja WAŻN-2.
- **QG agentem (adwersaryjnie, realne wykonanie komórek): GO Z NOTAMI
  (0 KRYT / 3 WAŻN / 5 INFO)** — wszystkie WAŻN wcielone przed PR-em, log
  w `sophia-1e2-f1-atomy.md`: (1) hint 2 F1.3 cytował nieistniejącą komórkę
  i zawierał `___` (pułapka z QG L0) → przepisany + repack; (2) pieczątka
  F1.7 brała `kandydaci[-1]` → fałszywa odmowa po komórce diagnostycznej →
  preferowany ostatni kandydat Z `if`/`else`; (3) F1.5: zapowiedź
  `SyntaxError` przy niepodmienionej luce operatorowej. INFO wcielone:
  wariant `IndentationError: unexpected indent` w „Pierwszej pomocy F1".
- **Publikacja:** `skillbridge-notebooks` @ `861a3e1` (katalog `f1/`
  + README z podziałem lab/ćwiczenie). Plik raw zweryfikowany 200.

### PROD (czerwona linia wzorcem, 2026-07-21)

- Backup: **`prod-backup-pre-ingest-krok4-f1-20260721`**
  (`br-twilight-queen-al4kt6ax`). Ingest **×2 idempotentny** (oba biegi:
  moduły=9, pozycje=70, pytania 129 bez zmian). Weryfikacja PO: **11 pozycji
  z `notebookUrl`** (4 L0 + 7 F1 — JEDYNE w bazie), `f1-przeglad` bez URL-a,
  hint f1-3 z `_luka_` i 0 gołych `___`. Smoke: `/` 200, `/login` 200,
  `/api/curriculum` **404** (flaga OFF — bez zmian).
- 🔴 `FLAG_CURRICULUM_PATH` NADAL 0 — czeka wyłącznie na akcje Darka
  (screenshoty 2 etykiet Colab, seans wideo PL, test ≤15 min L0.1).
- Retencja gałęzi Neona: jest ich 8; kandydaci do delete (przeterminowane,
  nadpisane nowszymi): `prod-backup-pre-0036-20260713-1712`,
  `prod-backup-pre-ingest-1er-20260713`.

### Noty
- Dzisiejszy schedule (05:44) był czerwony, ale SPRZED napraw #194/#195 —
  **pierwszy miarodajny nocny bieg dziś w nocy** (03:00 UTC ≈ 05:00 PL).
- Baza :5433 dostała komplet ds-projektów (13) + curriculum ×2 — gotowa do
  weryfikacji uruchomieniowych.
- Token F1.7 niesie pełne `_zrodlo` (~700 znaków przy wzorcowym rozwiązaniu;
  guard 2500 znaków źródła) — obserwować w telemetrii wklejek.

### NASTĘPNE (kolejność — zgodnie z roadmapą §4, potwierdzone przez Darka)
1. **Akcje Darka do flagi L0** (bez zmian). 2. ~~Dług 6 labów~~ (#197).
3. ~~Notebooki F2~~ (#198). 4. ~~Notebooki F3~~ (#199).
5. **Notebooki M-*** (zostało 40/65: M-PD=9, M-EDA=4, M-SQL=9, M-ML=9,
   M-LLM=9; kontrakty danych M-SQL/M-LLM już przybite — listing
   `przejazdy`/`strefy`, nota o 4 polach-brakach; przy M-EDA/M-LLM
   screenshoty UI = akcje Darka).
6. **1E.3** (packer: `exam` w `ITEM_KINDS`). 7. **1E.4** dopiero po
   naprawie `hintDepth` (MIS.1 już na main). 8. Tor równoległy bez zmian.

### Baseline `main` po tej sesji
build OK · tsc 0 · Biome 0 · unit **1358/1358** · pełna bramka CI zielona
na #196/#197/#198/#199 · dług notebooków **25/65** · gałęzie Neona: 10.

## STAN POPRZEDNI — 2026-07-21 (po południu) — NOCNY TOR e2e-llm ZIELONY PIERWSZY RAZ W HISTORII

### Werdykt

Run 29829371083 (workflow_dispatch po #195): **8/8 jobów success, e2e-llm 9/9
testów w 6,1 min.** Wcześniej nocny tor NIE BYŁ zielony ANI RAZU od powstania
(2026-06-25) — padał co noc, po cichu (job non-blocking, na PR-ach się pomijał).
Naprawa zeszła przez **7 warstw** (PR #184, #190–#195), każda odkryta realnym
przebiegiem:

1. **#184 infra:** sidecar `redis`+SRH (REST zgodny z Upstash) — serwer
   produkcyjny w CI wstaje z NIETKNIĘTYM boot-guardem rate-limitera; do tego
   `.gitleaksignore` (rekwizyt testu PII flagowany przez pełny skan historii)
   i 2×HIGH audytu (`pnpm.overrides`: brace-expansion, js-yaml). Sekret
   `ANTHROPIC_API_KEY_CI` był OK — plotka o jego braku to echo źródła kroku w logu.
2. **#190 PRODUKT:** tura czatu B0 z `aiHeavy` (5/min) → `aiLight` — limiter
   ścinał 9-turową rozmowę na turze 5 (ścinałby też ŻYWEGO studenta piszącego
   szybciej niż 12 s/turę). `/summary` zostaje na aiHeavy. ⚠ Rekalibracja
   w terytorium audytu Ryana — uzasadnienie w komicie; sign-off wskazany.
3. **#191:** izolacja stanu konta b4 (specy 10/20/40 współdzielą konto —
   `helpers/db-reset.ts` przywraca Krok 0 + czyści sesje Pomocnika).
4. **#192:** specy 20/40 dogonione do redesignu wizarda (krok 2 = „Sylabus
   (opcjonalny)"; test B4 pokrywał krok samooceny ZNIESIONY przez D5 —
   przepisany pod katalog rynku z anty-regresją progu).
5. **#193:** cel kariery przez deterministyczny picker (LLM proponował ścieżki
   spoza katalogu — „Backend Developer" — a krok 3 uczciwie blokuje Zatwierdź).
6. **#194:** `db:ingest-career-model` w jobie (model kariery w bazie CI).
7. **#195:** `seed:e2e` zasila `jobMarketData` z artefaktu JustJoinIT
   (tylko-gdy-pusto) — krok 3 czyta TĘ tabelę, a wgrywał ją wyłącznie demo
   `db:seed`, którego CI nie zna. Klasyka „works on my machine".

### Długi/noty po tej robocie
- **Klient nie sygnalizuje 429 tury czatu** (wiadomości pęcznieją bez odpowiedzi
  i bez komunikatu) — UX-owy dług, osobne zadanie.
- **Sign-off Ryana** dla rekalibracji `aiLight` (pkt 2) — decyzja Darka.
- B0 „przebieg 3/3" bywa flaky (timeout LLM raz na kilka biegów; retry łapie) —
  akceptowalne dla non-blocking nocnego toru.
- ⚠ **Incydent współdzielonego katalogu:** gałąź #190 przemyciła cudzy commit
  (mis3 siedział na lokalnym main w trakcie brancha) — wykryte, gałąź
  przebudowana; worktree per strumień SKONFIGUROWANE (drzewo główne = 1E/CI,
  `SkillBridge-worktrees/mis` = strumień MIS; runbook:
  `docs/runbooks/worktree-strumienie.md` — w tym reguła „nikt nie commituje
  na lokalnym main").

## STAN POPRZEDNI — 2026-07-21 — MAKE IT STICK: PLAN 13 + QUICK-WINY MIS NA MAIN, MIGRACJA 0038 NA PRODZIE

### Co się wydarzyło (4 PR-y, wszystkie squash na main)

Darek dostarczył dokument „Od nauki o uczeniu się do produktu" (9 propozycji
z „Make It Stick" + Paszport 2.0). Analiza vs roadmapa/ADR-y: większość JUŻ
pokryta (1E.3/1E.4, ADR-014, B5, „jeszcze nie" w item-runnerze) — luki domykają
pakiety **MIS.1–MIS.8** w nowym **`.agents/plans/13-make-it-stick.md`**.

- **#186 · plan 13 + roadmapa** — sekcja 4-ter, warunek na ścieżce krytycznej:
  **MIS.1 + naprawa hintDepth PRZED 1E.4**. Decyzje Darka (2026-07-21, wpisane
  do planu): (1) „najpierw próba" NIE zmienia ADR-014 D1 (worked example
  zostaje; generacja → pre-testy/powtórki/fading); (2) quick-winy równolegle
  poza ścieżką krytyczną; (3) Paszport 2.0 **najpierw prywatnie** — publiczny
  bez zmian do osobnej decyzji po pilotażu.
- **#187 · MIS.7 mikrocopy** — student widział SUROWY status EN („Status
  zgłoszenia: rejected") → mapa PL w `submission-status.ts`: „rejected" =
  „Jeszcze nie zaliczone — sprawdź feedback, popraw i wyślij ponownie";
  lab-stamp/viva w tym samym tonie. Poza PR-em (świadomie): 4. pytanie
  refleksji (wymaga migracji — decyzja Darka).
- **#188 · MIS.1 sonda pewności** — `curriculum_item_answers.confidence`
  (migracja **0038**, NULL=sprzed flagi) + 3 przyciski przed „Sprawdź"
  (`FLAG_CONFIDENCE_PROBE`; wymagana SERWEROWO przy ON — 400 bez zapisu;
  przy OFF wartość z body ignorowana → NULL). Cecha FSRS 1E.4 od dnia 1.
- **#189 · MIS.3 Paszport 2.0** — `loadVerifiedCompetencyStats`
  (MAX(verifiedAt)+COUNT(DISTINCT submissionId); ta sama funkcja zasili
  metrykę transferu MIS.8) + `VerifiedStatsPanel` W WIDOKU PRYWATNYM za
  `FLAG_PASSPORT_FRESHNESS` (∧ passportVerifiedOnly). Progi: <90 świeża /
  90–180 starzejąca / >180 do odświeżenia; „ugruntowana" ≥2 konteksty.
  Świadomie POZA PassportDocument (współdzielony z publicznym). Zero migracji.

### PROD (2026-07-21)

- **Migracja 0038 WYKONANA** wg wzorca: backup **`prod-backup-pre-0038-20260721`**
  (`br-cool-star-albszb22`), dziennik 38→39, DIRECT; weryfikacja PO: kolumna
  smallint NULL + CHECK `confidence_range` + 0 wierszy z wartością. Musiała
  wyprzedzić zapalenie `FLAG_CURRICULUM_PATH` — trasa answer po merge #188
  ZAWSZE pisze kolumnę confidence (przy OFF trasy = 404, więc okna 500 nie było).
- Smoke: `/` 200, `/login` 200, `/api/curriculum` **404** (flaga curriculum
  nadal OFF — akcje Darka bez zmian). ⚠ **PUŁAPKA URL:**
  `skill-bridge-ai.vercel.app` to OBCA aplikacja (create-react-app, kolizja
  nazw vercel.app) — prod to **`skill-bridge-ai-seven.vercel.app`**
  (czytać z `NEXT_PUBLIC_APP_URL` w `.env.prod`, nie z nazwy projektu).
- Nowe flagi `FLAG_CONFIDENCE_PROBE` / `FLAG_PASSPORT_FRESHNESS`: **OFF
  wszędzie** (env nieustawione = default false). Zapalenie = env + REDEPLOY.

### NASTĘPNE (kolejność)
1. **Akcje Darka do flagi L0** (bez zmian: screenshoty, seans wideo, test ≤15
   min) → flaga=1 + redeploy. Migracja 0038 już NIE blokuje. Przy zapalaniu
   curriculum rozważyć od razu `FLAG_CONFIDENCE_PROBE=1` (dane kalibracji od
   pierwszego dnia realnych studentów) i `FLAG_PASSPORT_FRESHNESS=1`.
2. **Notebooki F1 (7 szt.)** i dalej kolejka bez zmian (dług 6 labów → 1E.3 →
   **naprawa hintDepth** → 1E.4 → …).
3. **MIS wg planu 13:** MIS.2 + MIS.8-A po ~2 tyg. danych z sondy; MIS.4 przy
   1E.3 (wspólna migracja `assessment_sessions.kind`); MIS.3b/MIS.5/MIS.6/
   MIS.8-B po 1E.4.
4. Tor równoległy bez zmian; **UWAGA: równolegle żyje cudza gałąź
   `fix/b0-turn-ailight`** (tura czatu na aiLight) — nie moja, nie ruszałem.

### Baseline `main` po tej sesji
Pełna bramka CI zielona na KAŻDYM z #186–#189 (build, tsc, Biome, vitest,
integration, gitleaks, deps-scan). Per gałąź: unit 1285 (MIS.7) / 1284 (MIS.1)
/ 1284 (MIS.3), integration 176; suma na main ≈ **1289 unit / 178 integration**
— potwierdzi nocny tor. Konflikt #188↔#189 (flags.ts/.env.example) rozwiązany
merge'em main do gałęzi przed merge.

## STAN POPRZEDNI — 2026-07-14 (noc) — KROK 4/L0: NOTEBOOKI SĄ, DRABINA DZIAŁA END-TO-END

### Co się wydarzyło (PR #182, squash na main)

- **4 notebooki Colab L0** wg kontraktu ADR-015 — pierwszy realny materiał, na
  którym student może przejść drabinę. **Warstwa pieczątki = JEDEN wspólny blok**
  (`tools/content/notebooks/pieczatka.py`, jedyne źródło prawdy funkcji tokenu);
  źródła notebooków w formacie percent (`tools/content/notebooks/l0/*.py`,
  komórka `# %% [pieczatka]` niesie tylko warstwę treści checku per atom);
  builder `pnpm content:build-notebooks` → deterministyczne `notebooks/l0/*.ipynb`.
- **Publikacja: `github.com/Danolog/skillbridge-notebooks` (PUBLIC)** — Colab
  nie otwiera notebooków z prywatnego repo, a nasze jest PRIVATE. Publiczne repo
  to WYŁĄCZNIE cel publikacji (README to mówi): edycje w głównym repo → rebuild
  → push zbudowanych .ipynb (na razie ręcznie: cp + commit; klon jednorazowy).
- **`config.notebookUrl`**: packer (manifest L0) → walidator (tylko `lab`,
  tylko https colab) → `item-view` (guard hosta powtórzony przy odczycie) →
  przycisk „Otwórz notebook w Google Colab" nad teorią laba.
- **Parytet Python↔TS przybity testem** (`tests/unit/ds/notebooks-l0.contract.test.ts`,
  21 testów): identyczność bloku pieczątki bajt-w-bajt, drift buildera, token
  z REALNEGO python3 przez `parseToken`+`evaluateChecks` na checkach z prod-JSON-a,
  odmowy pieczątki. python3 wymagany twardo (macOS/ubuntu mają).

### QG treści notebooków: GO Z NOTAMI (0 KRYT / 2 WAŻN / 3 INFO) — wcielone

Log w `sophia-1e2-l0-atomy.md` (sekcja „Przebieg QG notebooków L0"). Perła
WAŻN-1: **`___` w IPythonie/Colabie ISTNIEJE od startu sesji** (zmienna historii)
— nieuzupełniona luka rozgrzewki L0.4 wykonywała się PO CICHU zamiast dać uczący
NameError → placeholder zmieniony na `_luka_` (podkreślnik = nie liczy się do
checku). ⚠ **Nauka procesowa: sekcje atomów w dokumentach Sophii idą VERBATIM
do widoku studenta** — erraty/meta wolno pisać wyłącznie w logu QG (pierwsza
wersja erraty wyciekła do contentMd; wyłapane przed PR-em, przeniesione).

### Weryfikacja uruchomieniowa (baza :5433, flaga ON lokalnie)

Student e2e przeszedł **całe L0 tokenami z OPUBLIKOWANYCH notebooków**
(pobranych z GitHuba — dokładnie to, co dostanie student): L0.1→L0.4
`itemCompleted`, moduł `completed`, **F1 odblokowany**. Negatywy: literówka
w tokenie → 400 `bad_signature`; token z cudzego kodu atomu → 400; pieczątka
bez wykonanej pracy → polska odmowa PRZED emisją tokenu. Przycisk Colab
w HTML pozycji. (Drobiazg po sesji: konto `e2e-main` na :5433 ma
`career_goal='Data Scientist'` — seed:e2e to nadpisze.)

### PROD (2026-07-14, czerwona linia wzorcem)

- Backup: **`prod-backup-pre-ingest-krok4-l0-20260714`** (`br-fancy-mud-algw5lzi`);
  zwolnienie limitu gałęzi: usunięty przeterminowany `backup/pre-0031-2026-07-09`.
- Ingest **×2 idempotentny** (2. bieg: 0 zmian; „moduły=9, pozycje=70" oba biegi).
- Weryfikacja PO: 4 laby L0 z `notebookUrl` (JEDYNE w całej bazie), `_luka_`
  w contentMd l0-4, **0 przecieków erraty**, 70 pozycji bez zmian.
  Smoke: `/` 200, `/login` 200, `/api/curriculum` **404** (flaga off).
- 🔴 **`FLAG_CURRICULUM_PATH` NADAL 0 — celowo.** Do zapalenia brakuje WYŁĄCZNIE
  akcji Darka (kod i treść L0 są gotowe): (1) screenshoty 2 etykiet UI Colab,
  (2) seans kontrolny wideo PL (wlRT_MZOvBE), (3) test przebiegu **≤15 min** L0.1
  na czystym koncie Google (twardy wymóg D10). Po nich: flaga=1 + **REDEPLOY**.

### NASTĘPNE (kolejność)
1. **Akcje Darka do flagi** (wyżej) — nic więcej nie blokuje L0 na prodzie.
2. **Notebooki F1 (7 szt.)** — wzorzec kompletny (źródło percent + `[pieczatka]`;
   checki F1.4/F1.7 już w packerze); dalej F2/F3/M-* (razem 62 do zrobienia).
3. **Dług treści 6 labów** (PD.4, PD.8, EDA.4, SQL.4, SQL.7, LLM.7 — bez checków,
   uczciwe 501) → poprawka treści → QG → repack → re-ingest.
4. **1E.3** (packer: `exam` w `ITEM_KINDS`), **1E.4** (najpierw `hintDepth`),
   **1E.5**, **1E.7** — bez zmian.
5. Tor równoległy bez zmian (sprzątanie po flipie paszportu, 1E.R2, żywy ekspert
   QG-6, SageMaker, 0.7-sekret, 0.13).

### Baseline `main` po tej sesji
build OK · tsc 0 · Biome 0 · unit **1282/1282** (było 1261) · pełna bramka CI
zielona na #182 (integration, e2e-safe, gitleaks, deps-scan w komplecie).

## STAN POPRZEDNI — 2026-07-14 (wieczór) — 1E.6 DOMKNIĘTE: DRABINA RUSZYŁA

### Co się wydarzyło (4 PR-y, wszystkie na `main`)

- **#178 · roadmapa v3** — `.agents/plans/11-roadmap-fazy-0-3.md` deklarował się „źródłem
  prawdy", ale był zamrożony od 2026-07-03. **Etykieta `1E.6` była PRZECIĄŻONA**: roadmapa
  i kod rozumiały ją jako *UI drabiny*, ADR-014 (D3/D10/pkt 11) i handoffy jako *checki labów*
  — **oba zakresy były otwarte**. Rozbite na **1E.6a** (UI) i **1E.6b** (checki + token).
  Dopisane 1E.R/1E.R2, statusy 1E.0–1E.2, korekta 0.13 (PR #121 jest zmergowany).
- **#179 · dług DoD** — kontrakt-test treści pokrywał **4 z 9 modułów**; 5 modułów M-* poszło
  na prod (#170) **bez testu**. Rozszerzone na 9 (66 pozycji, 129 pytań) + Biome 3 → **0**.
- **#180 · 1E.6a — UI drabiny.** Treść 1E.2 leżała na prodzie i **nie było jak jej zobaczyć**
  (zero `.tsx` z curriculum). Nowa trasa `GET /api/curriculum/items/[id]` (API nie miało czym
  nakarmić UI). Guardy UUID na WSZYSTKICH trasach curriculum (wzorzec 0.15/B3 — zły id dawał
  500 zamiast 400).
- **#181 · 1E.6b — checki labów + ADR-015.** **Największy bloker fazy 1E domknięty.**

### 1E.6b — jak to działa (ADR-015: `docs/decisions/015-kontrakt-checkow-labow.md`)

**Pieczątka NIE mówi „zaliczone"** — przenosi ŁADUNEK z wartościami wyliczonymi w sesji Colab,
a **serwer sam weryfikuje każdy check**. Trzy klasy o uczciwie różnej sile: `value` (mocna),
`relation` (średnia), `predicate` (słaba). **Żadna nie dowodzi, że student napisał kod sam** —
dlatego lab BRAMKUJE POSTĘP, a kredencjał nadal wymaga sandboxa + vivy + człowieka.

⚠ **HMAC NIE JEST TU KONTROLĄ BEZPIECZEŃSTWA** (tak zapisane w kodzie i ADR): student zna swój
kod atomu, więc policzy podpis ręcznie. To **suma kontrolna** — łapie literówkę i blokuje token
kolegi (kod jest per student+pozycja).

⚠ **KOREKTA ADR-014 D3:** zakładał „reuse sandboxa 1.9". Audyt **19 labów** (nie 18 — F3.7 jest
nadpisany `project→lab` w manifeście packera): **ZERO wymaga uruchomienia kodu studenta u nas.**
Sandbox wypada z zakresu.

### STAN PROD (2026-07-14)
- Kod 1E.6a+1E.6b **na prodzie**; `LAB_TOKEN_SECRET` ustawiony (Production + Preview).
- Ingest treści z REALNYMI checkami wykonany. Backup: **`prod-backup-pre-1e6b-20260714`**
  (`br-orange-lake-al3iweal`). Idempotentny (2. bieg: 0 zmian). Migracja NIEPOTRZEBNA
  (`config_json` = jsonb, zmiana czysto treściowa; dziennik nadal 38).
- Weryfikacja: **0 atrap**, **13 labów z kontraktem**, **6 bez checków** (dług treści, niżej).
  9 modułów / 70 pozycji / 273 pytania (= 144 diagnostyczne + 129 curriculum — liczba z handoffa
  POTWIERDZONA, nie jest zawyżona).
- 🔴 **`FLAG_CURRICULUM_PATH` WYŁĄCZONA NA PRODZIE (0) — świadomie, przeze mnie.**
  Powód: po 1E.6a/6b realni studenci (jest ich 27) **zobaczyliby kafelek „Ścieżka nauki",
  weszli w L0.1 i przeczytali „Otwórz notebook L0.1 linkiem z tej pozycji" — a takiego linku
  NIE MA.** Notebooki to Krok 4. To był ślepy zaułek. **Flagę zapalić DOPIERO po notebookach L0.**
  Smoke po redeployu: `/` 200, `/login` 200, `/api/curriculum` **404** (flaga off).
  ⚠ Zmiana env na Vercelu NIE działa wstecz — wymagany był redeploy (zrobiony).

### DŁUGI OTWARTE (jawne, nie zamiecione)

1. 🔴 **6 labów bez checków — dług TREŚCI, nie kodu.** `PD.4`, `PD.8`, `EDA.4`, `SQL.4`,
   `SQL.7`, `LLM.7`. Ich treść jest **niesprawdzalna**:
   - **SQL.4/SQL.7:** `duckdb.sql()` **bez przypisania wyniku do zmiennej** — pieczątka nie ma
     czego porównać, choć treść obiecuje porównanie;
   - **EDA.4:** `groupby().mean()` bez kotwicy w zmiennej;
   - **PD.4:** sprzeczność — „`maz` ma 2 kolumny **i** jedno województwo", ale po wyborze kolumn
     `wojewodztwo` w `maz` **już nie istnieje**;
   - **PD.8:** dane źródłowe tylko w notebooku;
   - **LLM.7:** `zgodnosc` — odsetek czy licznik?
   Zostawione BEZ checków → uczciwe 501. **Świadomie NIE wpuściłem na prod zgadniętych nazw
   zmiennych.** Poprawka treści → QG → repack → re-ingest.
2. 🟠 **`hintDepth` NIE JEST POMIAREM** (przegląd bezpieczeństwa 1E.6a). Cała drabinka hintów
   (w tym hint 3 = „pełne rozwiązanie") jedzie w propsach do klienta → siedzi w HTML; `slice`
   jest filtrem wyłącznie prezentacyjnym. Nieszkodliwe dla R13, ale **`hintDepth` to cecha
   wejściowa FSRS** → **NAPRAWIĆ PRZED 1E.4** (serwować hint N na żądanie z trasy zapisującej
   głębokość serwerowo).

### NASTĘPNE (kolejność)
1. **Notebooki Colab** (Krok 4) — kontrakt tokenu JEST, więc nic ich już nie blokuje.
   **Bez nich nie zapalamy flagi.** Warstwa pieczątki = JEDEN blok identyczny we wszystkich
   (wzorzec w `pieczatka.py` z weryfikacji — Python i TS zgodne co do kanonicznej serializacji).
   ⚠ Screenshoty UI i seanse 8 wideo PL = **akcje Darka** (konto Google; agent wideo nie ogląda).
2. **Dług treści 6 labów** (wyżej) → QG → re-ingest.
3. **1E.3** (egzaminy + mastery gate) — packer nie parsuje `kind='exam'` (`ITEM_KINDS`).
4. **1E.4** (FSRS) — najpierw napraw `hintDepth`.
5. **1E.5** (kuracja + mostki), **1E.7** (placement — obie strony już istnieją).
6. Tor równoległy (bez zmian): sprzątanie po flipie paszportu, 1E.R2, żywy ekspert QG-6,
   SageMaker, 0.7-sekret, 0.13.

### Baseline `main` po tej sesji
build OK · tsc 0 · **Biome 0** (było 3) · unit **1261/1261** (było 1216) · integration **174/174**.
**Chromium Playwrighta DZIAŁA na macOS** — brakowało tylko binarki (`playwright install chromium`);
notka „nie wspiera WSL" była myląca. E2E przeglądarkowy jest odtąd możliwy.

## STAN POPRZEDNI — 2026-07-14 — PLAN NAPRAW DOMKNIĘTY: B2/B3/B4 NA PRODZIE (INGEST WYKONANY)

### INGEST PROD WYKONANY (2026-07-14, polecenie Darka — czerwona linia ADR-010)
- Backup: gałąź Neona **`prod-backup-pre-ingest-partia2-20260714`**
  (`br-polished-sky-al0fstob`); zwolnienie limitu gałęzi: usunięty przeterminowany
  `prod-backup-pre-0022-20260707-154154` (7 dni, nadpisany 4 nowszymi); backupy
  z 2026-07-13 zachowane (retencja: trzymać kilka dni → delete).
- Ingest ×2 (idempotencja): 1r „zaktualizowano 5, błędów 0" ×2; partia 2 „wstawiono 3"
  → „zaktualizowano 3", błędów 0.
- Weryfikacja PO: **13 projektów ds-*** na prodzie; role `ds-chmura` = CI/CD+MLOps,
  `ds-endpoint-*` = chmura+MLOps; pokrycie 23/24 (Snowflake poza); klauzula karty
  w 1. zdaniu, linki budżetowe i link polityki Groq w bazie. Smoke: `/` 200,
  `/login` 200, `/projects` 307 (chroniona). Rekord wykonania: spec partii 2 §8.
- Otwarte po ingeście: ręczna weryfikacja dostępności SageMaker w AWS free planie
  (spec §7; treść ma instrukcję awaryjną, nieblokujące) — akcja Darka lub pilot.

### Blok B2 — partia 2 (3 projekty chmurowe) NAPISANA i ZWALIDOWANA
- **`tools/content/ds-projects-partia-2.json`**: `ds-endpoint-azure` / `ds-endpoint-gcp`
  / `ds-endpoint-aws` — L2×10 h, ten sam model (własny artefakt studenta
  z `ds-pierwszy-model-predykcyjny`), pipeline: budżet+alert PRZED pierwszym zasobem →
  wdrożenie WYŁĄCZNIE jako kod → smoke test na znanych predykcjach (baseline) → pomiar
  mediany/p95 latencji → teardown → dowód zerowego kosztu (tekstowy eksport preferowany).
  `required` = jedna chmura + MLOps; `acquired` = Python/Git/Uczenie maszynowe.
  QG-5 §5: klauzula karty w 1. zdaniu description („wyłącznie weryfikacji tożsamości"),
  link do panelu budżetu w source_links, zakaz przekraczania kwot, klauzula „kredyty
  tylko dla NOWYCH kont". **Celowo BEZ kryterium żywego URL** (endpoint usuwany —
  utrzymanie paliłoby kredyt); dowód = artefakty repo. Teorie 1034/1076/1185 słów
  z „Metodyką i pułapkami"; zasoby 4/projekt z kompletem licencji i verifiedAt.
- **Spec partii 2**: `docs/curation/ds-projekty-partia-2-spec.md` — pełny tor QG-1…QG-7:
  benchmark 7 ofert z URL-ami (fetch 2026-07-13; triada SageMaker/Vertex/Azure ML
  dosłownie w 3/7), kurs referencyjny Stanford CS329S + FSDL, mapowanie kryteriów→oferty,
  fakty free-tier zweryfikowane (Azure 200 USD/30 dni; GCP 300 USD/90 dni, ręczny
  upgrade; AWS free plan 6 mies./100 USD, konto zamyka się zamiast obciążyć kartę;
  budżety ALARMUJĄ, nie zatrzymują). Nota w specu partii 1 §4 (wiersz P6 nieaktualny).
- **Recenzje bramkowe (forki, 2026-07-13): Ryan GO Z NOTAMI (0K/2W/3I), Ethan GO
  Z NOTAMI (0K/3W/5I)** — wszystkie WAŻN zastosowane: maskowanie identyfikatorów
  konta/subskrypcji na zrzutach, higiena sekretów w zapisach żądań, tekstowy dowód
  kosztowy obok zrzutu, klauzula nowych kont. **Dług odnotowany w specu §6 (→ 1E.R2):**
  ds-chmura przyznaje CI/CD required bez kryterium rubryki wymuszającego CI.

### Blok B3 — ds-chmura przełożony (w partii 1r — wersja efektywna last-wins!)
`ds-chmura-wdrozenie-modelu`: `required` = **CI/CD + MLOps** (chmury zdjęte całkowicie,
nie zdegradowane do acquired); zdanie w description kieruje do projektów Managed
endpoint. Parytet w `seed-projects.ts` (także opis 1r-owy). Matchmaker: luka „Azure" →
`ds-endpoint-azure`, luka „CI/CD" → `ds-chmura` (potwierdzone w kodzie przez Ethana).

### Blok B4 — test kontraktowy + seed + noty Ryana 1E.R
- **`content-ds-projects.contract.test.ts`** przepisany na glob `ds-projects-partia-*`
  z semantyką **katalogu efektywnego** (last-wins po slugu; 1r nadpisuje 5 slugów
  partii 1, partia 2 tylko dodaje — obie własności asertowane). Katalog efektywny:
  13 projektów, 4×L1/7×L2/2×L3, pokrycie **23/24** (Snowflake jedyny niepokryty).
  Guardy maszynowe QG-5 §5: klauzula karty w 1. zdaniu, link budżetu, role B3.
  UWAGA: sort plików leksykograficzny — przy partii ≥10 przejść na numeryczny.
- **Seed-parytet**: +3 wpisy `ds-endpoint-*` → `DEMO_PROJECTS` = **33**, rozkład
  **12/15/6**, oss 12 (testy zaktualizowane).
- **Noty Ryana z 1E.R uregulowane w 1r**: (1) link polityki danych Groq
  (console.groq.com/docs/your-data — Groq NIE trenuje na inputach API; etykieta
  ostrożna); (2) nakaz fikcyjnych nazwisk/domen example.com w syntetycznym korpusie
  ds-llm (description + teoria).

### Walidacja (pełna bramka, 2026-07-14)
Ingest ×2 na :5433 dla 1r i partii 2 — idempotentny (2. bieg: 0 wstawionych), role
w bazie zgodne. `pnpm test:run` **1216/1216** (baseline 1194 + nowe testy kontraktu),
`pnpm build` OK, Biome 3 warningi (baseline).

### NASTĘPNE (kolejność)
1. ✅ ~~Ingest partii 2 + 1r na prod~~ — WYKONANY (sekcja wyżej). Zostaje: ręczna
   weryfikacja dostępności SageMaker w AWS free planie (spec §7, nieblokujące).
2. **Sprzątanie po flipie paszportu** (nieblokujące, z poprzedniego snapshotu):
   calculateCoverage, licznik onboardingu client-side, kafelek „W trakcie: 0".
3. **1E.6** (checki labów — największy bloker produktowy) i reszta kolejki 1E.
4. Do pilotażu: żywy ekspert QG-6 (akcja Darka; losowy L2 MUSI objąć projekt chmurowy
   partii 2), dług 1E.R2 (z Sophią — w tym kryterium CI dla ds-chmura, Ethan WAŻN-1).

### Infrastruktura
- Baza testowa :5433 działa (kontener `skillbridge-postgres-test`, po ingestach ma
  8 projektów ds-*: 5×1r + 3×partia 2 — partii 1 nigdy tam nie było, to OK).
- Baseline main po tej sesji: build OK, tsc 0, Biome 3 warningi, unit **1216/1216**.

## STAN POPRZEDNI — 2026-07-13 (noc) — PLAN NAPRAW: BLOKI A/B1/C/D/E WYKONANE I NA PRODZIE

### Co się wydarzyło (pełna sekwencja czerwonych linii, polecenie Darka)
- **Wszystkie PR-y planu ZMERGOWANE do main:** #171 (werdykt QG + sprostowania),
  #172 (naprawa K1–K5), #173 (runbook v1.1), #176 (Blok E), #174→#175→#177
  (łańcuch C — squash w kolejności; konflikt squash-stacka na #177 rozwiązany
  merge'em main do gałęzi, pełna bramka CI zielona przed każdym merge).
- **Migracja 0037 NA PRODZIE** (verified_competencies): backup
  `prod-backup-pre-0037-20260713-2130` (`ep-jolly-wind-aljy93t8`), dziennik
  37→38, RLS ENABLE+FORCE + polityki + grant SELECT-only app_student,
  backfill 2 kredencjały z 1 submisji verified (Python, Pandas).
- **Ingest 1E.R NA PRODZIE**: backup `prod-backup-pre-ingest-1er-20260713`
  (`ep-hidden-hat-alxesr4j`), 2× „zaktualizowano 5, błędów 0" (idempotencja),
  weryfikacja treści (progi 792/793/787 słów, markery K1–K5, pokrycie 23 liści,
  10 projektów ds-*), smoke `/` 200 `/login` 200 `/api/curriculum` 401.
- **Bramka QG 1E.R: GO** — re-review Ryana (diff LLM): **GO Z NOTAMI**; werdykt
  i rekord wykonania (ADR-010 §10) dopisane do `qg-1er-partia-naprawcza.md`.
  Noty Ryana do następnej iteracji treści: (1) link do polityki danych Groq
  albo zawęzić fallback; (2) w syntetycznych przykładach nakazać fikcyjne
  nazwiska/domeny example.com.
- **Retencja backupów Neona:** oba branche trzymać min. kilka dni → potem delete.

### Flaga paszportu: FLIP WYKONANY (2026-07-13, polecenie Darka)
`FLAG_PASSPORT_VERIFIED_ONLY=1` na Production (Vercel), deploy success, smoke
zielony. Pre-flight: k3-validate na prodzie 25/25 PASS; prognoza pokrycia dla
jedynego studenta z kredencjałami (Python+Pandas → 27%) potwierdzona po flipie.
Cache `marketCoveragePercent` przeliczony dla 27 studentów: 26×0% (uczciwa
prawda), 1×27%. **Sign-off Ryana dla rls-matrix v0.28: GO** (0 KRYT/0 WAŻN,
3 noty INFO — wpisane do macierzy). ZOSTAJE sprzątanie po flipie (nieblokujące):
`calculateCoverage` (martwa gałąź przy ON), licznik pokrycia w onboardingu
(client-side, dalej liczy z deklaracji), kafelek „W trakcie: 0" w dokumencie.

### NASTĘPNE (kolejność)
1. **Blok B2/B3/B4** — trzy projekty `ds-endpoint-azure/gcp/aws` (partia 2,
   pełne QG-1…7: benchmark ≥5 ofert z URL-ami, teorie 800–1500 słów, zasoby
   z licencjami, klauzula karty w 1. zdaniu description — runbook v1.1 §5 już
   to sankcjonuje); potem B3 (`ds-chmura` → CI/CD+MLOps required) i B4 (test
   kontraktowy na glob — UWAGA: 1r celowo nadpisuje 5 slugów partii 1, więc
   asercja musi rozumieć katalog efektywny last-wins, nie porównywać plików).
2. **Sprzątanie po flipie** (wyżej — nieblokujące).
3. **1E.6** (checki labów — największy bloker produktowy) i reszta kolejki 1E
   — bez zmian, patrz snapshot poprzedni.
4. Do pilotażu: żywy ekspert QG-6 (akcja Darka), dług 1E.R2 (z Sophią).

### Infrastruktura
- Baza testowa **:5433 działa** (kontener `skillbridge-postgres-test`,
  zmigrowany do 0037). `pnpm db:seed` na niej pada na FK
  `curriculum_module_items→projects` — testy integracyjne mają własne fixtures.
- Baseline main po merge'ach: build OK, tsc 0, Biome 3 warningi (baseline),
  unit **1194/1194**, pełna bramka CI zielona na main.

## STAN POPRZEDNI — 2026-07-13 (późny wieczór) — PLAN NAPRAW W IMPLEMENTACJI

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
