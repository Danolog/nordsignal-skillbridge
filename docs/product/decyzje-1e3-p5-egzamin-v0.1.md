# Decyzje produktowe 1E.3 · P5 — maszyna stanów mastery gate (po 2. oblaniu, blokada 3. próby, test-out)

**Changelog v0.1 → v0.2 (2026-07-25, Sophia):** dodana **DECYZJA 6** — rozstrzygnięcie zdegradowanej gałęzi stanu S-C (`correctives_required` BEZ paczki correctives), którą eskalował Leo z review partii C (nota 1, G1/G4 produkt+arch). Rozstrzygnięcie: **hybryda — akceptuję obecny bezpiecznik C4 na prodzie TERAZ + ticket B (ograniczona odbudowa ścieżki, nie generyczny rebuild) z progiem spłaty.** Plus poprawka mikrocopy `correctives_unavailable` (obietnica, której system nie dotrzymuje). Decyzja w mojej domenie (produkt/UX/dydaktyka, CLAUDE.md §5 v1.11 — odwracalna, wewnętrzna, bez wydatku); realizacja B = kod silnika → arch-sign-off Ethana. Reszta dokumentu (D1–D5, §5a, §7) bez zmian.

**Autor:** Sophia (PO, dydaktyka) · **Data:** 2026-07-24 (v0.1) · 2026-07-25 (v0.2) · **Status:** v0.2 — WIĄŻĄCY KONTRAKT dla Jacka (UI) i Ethana (backend, P4/P5)
**Zleca:** rozstrzygnięcie otwartych pytań spec Mili P5 (`docs/product/mila-1e3-p5-egzamin-spec-v0.1.md`, rozdz. 10) i luki „brak twardej blokady 3. próby" (Mila 6.3) — decyzje w mojej domenie (CLAUDE.md §7, ADR-014 D3).
**Źródło prawdy parametrów:** ADR-014 D3 (wiersz `exam`), D5 (correctives), D11 (metryki). Rama: CLAUDE.md §7 v1.13 — mastery gate = **ocena formująca, progresja WEWNĘTRZNA, maszyna samowystarczalna, ZERO human-in-the-loop**. Nic tu nie wychodzi do pracodawcy — to nie kredencjał.
**Relacja do innych dokumentów:**
- Spec Mili P5 = brief UI (jej autorstwo). Ten dokument ROZSTRZYGA jej rozdz. 10 i 6.3 — Mila i Jack traktują go jako źródło decyzji, nie jej otwarte pytania.
- `docs/curation/sophia-1e3-egzamin-f1-v0.1.md` §5/§5a = bank pytań F1 + noty Leo a–d. Semantyka N i M mikrocopy pochodzi stamtąd — tu ją SYNCHRONIZUJĘ, nie duplikuję (jedno źródło).
- Plan techniczny Ethana `docs/product/plan-1e3-mastery-gate-v0.1.md` — plasterki P4 (retry+correctives), P5 (drabina+UX).

> **Granica roli.** Decyduję KIEDY i CO (dydaktyka, produkt). JAK technicznie (kształt zapytania, schemat, trasa) = Ethan/Jack. Tagi **[WYMÓG BACKENDU — Ethan]** i **[WYMÓG UI — Jack]** przy każdej decyzji mówią, czyja jest realizacja.

---

## 0. Fakt z kodu, na którym stoją decyzje

Zweryfikowane czytaniem `src/app/api/exam/start/route.ts` (l.95–109) i `src/lib/assessment/exam.ts` (l.148–151, 302):

- `attempt = clampAttempt(priorFailed.length + 1)`; `priorFailed` = ukończone sesje `module_exam` TEGO modułu z `passed:false`, **bez rozróżnienia test-out vs egzamin po lekcjach**. `clampAttempt` przycina do `[1,2]`.
- **Skutek dzisiaj:** po 2. oblaniu `priorFailed.length = 2`, `attempt = clampAttempt(3) = 2` — `/start` tworzy KOLEJNĄ sesję z wariantem B, i tak w nieskończoność. **Nie ma twardej blokady 3. wywołania.** To jest luka, którą Mila oflagowała (6.3, 10.4).
- `gradeExam` ustawia `correctives: !passed && plan.attempt >= EXAM_MAX_ATTEMPTS(2)` — flaga „uruchom correctives" zapala się po 2. oblaniu. Ten sygnał zostaje; decyzje niżej definiują, co się dzieje DALEJ.

---

## DECYZJA 1 — Maszyna stanów po 2. oblaniu (correctives + reset cyklu)

**Rozstrzygnięcie w jednym zdaniu:** po odbyciu obowiązkowych correctives student **MOŻE podejść znów**; cap resetuje się do **świeżej pary A/B (nowy cykl, podejście liczone od 1)**; cykle są **nieograniczone** (R13 — błąd nigdy nie jest stanem końcowym, żadnej trwałej blokady ścieżki), a wheel-spinning łapie monitoring D11 (alarm → przegląd TREŚCI), nie blokada studenta.

**Dlaczego nie „cap 2 na zawsze":** trwałe zablokowanie modułu po 2. oblaniu łamie R13 („ostatnie doświadczenie zawsze = sukces; błąd prowadzi do opanowania") i narrację „czas, nie talent" (ADR D6.8). Mastery gate to bramka FORMUJĄCA (§7) — jej celem jest doprowadzić do opanowania, nie odsiać. M12: bramki to higiena, przewagę budują correctives (M14). Dlatego correctives = warunek KOLEJNEGO podejścia, nie ślepy zaułek.

**Dlaczego to bezpieczne wobec §7 (kredencjał):** nawet gdyby student przeszedł po wielu cyklach częściowo z pamięci, to nadal tylko progresja WEWNĘTRZNA (odblokowanie następnego modułu). Kredencjał wychodzący na zewnątrz (receipt w Passporcie) wymaga capstone'u weryfikowanego przez CZŁOWIEKA (ADR D3 wariant C, §7) — osobna waluta (G9). Nieograniczone cykle wewnętrzne nie dotykają kredencjału.

### Maszyna stanów (jednoznacznie)

Jednostka licząca: **cykl** = do 2 podejść (wariant A + wariant B). „Podejście w cyklu" ∈ {1, 2}.

| Stan | Warunek | Co widzi student | Przejście |
|---|---|---|---|
| **S-A · gotowy** | brak aktywnej sesji; `failedInCycle = 0` | Blok A „Podejdź do egzaminu" (E3 Mili) / Blok B test-out (E1) | `/start` → podejście 1, wariant X |
| **S-B · oblane 1. w cyklu** | ostatnia sesja `passed:false`, `attempt=1`, `correctives:false` | **W2** Mili — „Nie tym razem, masz jeszcze jedno podejście" + przycisk retry | `/start` → podejście 2, wariant Y (drugi) |
| **S-C · oblane 2. w cyklu (cap wyczerpany)** | ostatnia sesja `passed:false`, `attempt=2`, `correctives:true`; correctives cyklu NIE odbyte | **W3** Mili — paczka ≤3 atomów (Ekran 5). **BRAK przycisku retry.** `/start` ODRZUCA (Decyzja 2) | student odbywa correctives (Decyzja 4) |
| **S-D · correctives odbyte** | warunek „odbyte" (Decyzja 4) spełniony | Blok A znów aktywny — „Podejdź do egzaminu" (świeży cykl) | `/start` → **NOWY cykl**, podejście 1, świeża para A/B |
| **S-E · zdany** | dowolna sesja `passed:true` | **W1** Mili — „Zdałeś", kolejny moduł otwarty | `verifiedByMethod='exam'`, koniec |

Pętla S-C → S-D → S-A(cykl n+1) powtarza się bez limitu. **Nigdy** nie ma stanu „zablokowany na zawsze".

**[WYMÓG BACKENDU — Ethan]**
1. `priorFailed` w `/start` liczymy **w obrębie bieżącego cyklu**, nie dożywotnio: oblane sesje `module_exam` tego modułu z `completedAt` PÓŹNIEJSZYM niż granica ostatniego domkniętego cyklu correctives (albo od początku, jeśli żaden cykl jeszcze nie domknięty). Wtedy `clampAttempt(failedInCycle + 1)` **naturalnie resetuje** podejście do 1 po correctives — reszta silnika (`buildExamPlan`, `gradeExam`, flaga `correctives`) zostaje BEZ ZMIAN. To jedyna zmiana logiki zliczania.
2. Potrzebna **granica cyklu** (moment „correctives odbyte"). Scoping `> ostatnia_granica` bez znacznika jest rekurencyjny między cyklami — dlatego **rekomenduję lekki, trwały znacznik per (student, moduł) cyklu correctives** (np. `cycleIndex` + `completedAt`). Kształt (kolumna/tabela/derywacja) = Twoja decyzja techniczna; jeśli wymaga persystencji, **dopina się do migracji P2** (jedna migracja, nie druga). Derywacja z `curriculum_item_answers` jest możliwa dla JEDNEGO cyklu, ale znacznik jest czystszy przy wielu — zostawiam wybór Tobie.
3. Cykle nieograniczone — **żadnego twardego limitu liczby cykli w kodzie.** Ograniczenie żyje w analityce D11 (niżej), nie w blokadzie studenta.

**[WYMÓG UI — Jack]** Ekran 5 (W3) ma jedyną akcję „Wróć do modułu" + linki atomów correctives (jak w spec Mili 7.1). Powrót do egzaminu NIE jest przyciskiem na W3 — pojawia się dopiero na stronie modułu, gdy correctives odbyte (patrz „Konsekwencje dla Mili", nowy pod-stan E3).

**Monitoring (nie blokada) — [WYMÓG BACKENDU/analityka, D11]:** ≥2 oblane egzaminy modułu = alarm wheel-spinning → przegląd treści (wraca do mnie na re-kalibrację, nie karze studenta); ~10 nieudanych prób konceptu = sygnał twardy. Metryka „% zdanych za 1. podejściem" per moduł z alertem. To jest właściwa reakcja na „za trudne" — naprawa treści, nie zamknięcie ścieżki.

---

## DECYZJA 2 — Twarda blokada 3. próby (KIEDY blokować)

**Rozstrzygnięcie:** `/start` **ODRZUCA** utworzenie nowej sesji, gdy `failedInCycle ≥ 2` **i** correctives bieżącego cyklu nie są odbyte (Decyzja 4). To domyka lukę z kodu (§0) i lukę Mili 6.3.

**Kiedy dokładnie blokuje:** wyłącznie w stanie **S-C** (2 oblania w cyklu, correctives niewykonane). W stanie S-D (correctives odbyte) blokada znika — `/start` zwraca świeżą sesję podejścia 1.

**[WYMÓG BACKENDU — Ethan]**
- W `/start`, PRZED utworzeniem sesji: jeśli `failedInCycle ≥ EXAM_MAX_ATTEMPTS(2)` i correctives cyklu niewykonane → **odmowa z wyróżnialnym, maszynowo-czytelnym stanem**, np. HTTP **423 Locked** albo 409 z ciałem `{ state: "correctives_required", correctivesPackage }`. NIE generyczne 500/409 „już trwa" — front musi odróżnić „masz correctives do zrobienia" od błędu technicznego. Payload niesie tę samą `correctivesPackage`, którą P4 zbudował przy 2. oblaniu (z `result_json` oblanej sesji), żeby Ekran 5 dało się wyrenderować także z odpowiedzi `/start`, nie tylko z ekranu wyniku.
- Kod P3/P4 nie może zakładać, że próg jest osiągalny (R1 planu) — blokada 3. próby jest po stronie `/start`, nie w silniku oceny.

**[WYMÓG UI — Jack]**
- W3 (spec Mili 6.3): brak przycisku retry — POTWIERDZONE jako docelowe, nie tymczasowe. To już nie „miękka blokada do wyjaśnienia" — to twardy kontrakt: serwer i tak odrzuci 3. podejście w S-C.
- Jeśli front (np. druga karta) mimo to wywoła `/start` w S-C → obsłuż `423/correctives_required` renderem Ekranu 5 (paczka z payloadu), nie błędem technicznym.

---

## DECYZJA 3 — Test-out vs cap 2 (jedna wspólna pula)

**Rozstrzygnięcie:** test-out **dzieli** licznik cap-2 ze zwykłym egzaminem modułu — **jedna pula, jeden cykl per (student, moduł)**. Oblany test-out **spycha do normalnej ścieżki** (student uczy się przez atomy) i **konsumuje podejście 1** wspólnego cyklu.

**Dlaczego wspólna pula:** test-out (M16, G7) to **ten sam egzamin** — ten sam bank, ten sam `examConfigJson`, te same koncepty, ten sam próg. Różni się tylko MOMENTEM (przed lekcjami vs po). Dwie osobne pule dałyby studentowi 4 podejścia do identycznego egzaminu (2 test-out + 2 po lekcjach) — brute-force psujący sygnał mastery. Jeden model dla studenta: „masz 2 podejścia do egzaminu tego modułu w cyklu, czy bierzesz go na zimno (test-out), czy po lekcjach".

**Dlaczego to NIE karze:** koszt wspólnej puli jest łagodny właśnie dzięki Decyzji 1 — correctives nie są karą, tylko ~15 min celowanej powtórki, po której otwiera się świeży cykl. Najgorszy scenariusz „oblany test-out + oblane podejście po lekcjach" → ≤3 atomy correctives → nowe 2 podejścia. Student nigdy nie jest w gorszej sytuacji niż „jeszcze trochę ćwiczeń". Dlatego rezygnuję z osobnej puli mimo jej powierzchownego uroku (zachęca do test-out) — komplikuje backend (rozróżnianie sesji test-out), grozi pętlą brute-force i nie jest potrzebna, gdy correctives są łagodne.

**Oblany test-out spycha do normalnej ścieżki — operacyjnie ZERO nowej logiki:** oblany test-out po prostu NIE ustawia `verifiedByMethod` — moduł zostaje niezaliczony, drabina atomów obowiązuje normalnie. Gdy student zrobi atomy (bramka E3) i podejdzie do egzaminu, `failedInCycle = 1` (oblany test-out) → `attempt = 2`, wariant B — czyli „zostało 1 podejście, drugi wariant". Spójne, bez specjalnego kodu „drop".

**[WYMÓG BACKENDU — Ethan]** Zachowanie z §0 (jeden licznik `priorFailed` bez rozróżniania test-out) jest **POPRAWNE i zamierzone** — nie dokładaj rozróżnienia sesji test-out. Jedyna zmiana to scoping cyklu z Decyzji 1 (test-out to po prostu pierwsze oblanie cyklu 1).

**[WYMÓG UI — Jack + nota do Mili]** Blok B test-out (spec Mili 3.2) używa **wersji BEZPIECZNEJ** copy, zdanie „nie zdasz — nie liczy się jako oblany raz na 2" **ZDJĄĆ** (byłoby fałszywą obietnicą). Wiążące brzmienie:
> „Znasz już ten temat? Możesz spróbować zdać egzamin bez przechodzenia pozycji. Uwaga: to jest ten sam egzamin — masz **2 podejścia w tym module** łącznie (test-out liczy się jako podejście). Nie zdasz — wracasz i uczysz się normalnie."

---

## DECYZJA 4 — Definicja „correctives odbyte" (maszynowo, zero human, zero honor-system)

**Rozstrzygnięcie:** correctives cyklu są ODBYTE, gdy dla **każdego ukończalnego atomu** paczki correctives student ma **świeże ukończenie** (poprawna odpowiedź na pytanie retrieval atomu) z czasem PÓŹNIEJSZYM niż `completedAt` 2. oblanej sesji cyklu.

- Atom `theory`/`exercise` w paczce → **ponowne ukończenie** (poprawna odpowiedź retrieval, nielimitowane próby — R13 gwarantuje, że zawsze da się spełnić; zero ślepego zaułka).
- Atom `lab` w paczce (nie występuje w F1, siatka pod F2+/M-*) → wystarczy **ponowne otwarcie** (re-wizyta); nie wymuszamy re-submitu labu — byłoby nieproporcjonalne.
- Koncept bez ukończalnego atomu — fallback statyczny „Pierwsza pomoc" (§5a nota 1, ścieżka 3, NIE występuje w F1) → **nie bramkuje** (brak zdarzenia do sprawdzenia; nie może blokować).

**Dlaczego re-ukończenie, nie honor-system:** ADR D3 mówi „**OBOWIĄZKOWE** correctives". Honor-system („kliknij: gotowe") czyni je opcjonalnymi i nie przerywa wheel-spinningu (M13/M14 — sedno interwencji). Re-wizyta („otworzył i zamknął") nie gwarantuje kontaktu z mechanizmem uczenia (retrieval, R1). Re-ukończenie wymusza realny retrieval, jest w 100% maszynowo sprawdzalne (`curriculum_item_answers`, append-only — ADR D2 loguje to od dnia 1 dokładnie po to) i **nie łamie R13** (atom = nielimitowane próby, ostatnie doświadczenie zawsze sukces). To najlżejsza REALNA bramka, nie najcięższa.

**Dlaczego zero human:** mastery gate to bramka wewnętrzna, maszyna samowystarczalna (§7 v1.13). Wstawienie „poproś wykładowcę" wstrzyknęłoby człowieka w bramkę, która z definicji rządzi się sama. Człowiek wchodzi dopiero przy kredencjale wychodzącym na zewnątrz — mastery gate nim nie jest (spójne z §5a nota 1).

**[WYMÓG BACKENDU — Ethan]** Warunek „odbyte" wyliczasz z `curriculum_item_answers` (poprawna odpowiedź do pytania retrieval każdego wymaganego atomu z `answeredAt > completedAt` 2. oblanej sesji) vs zbiór wymaganych atomów (`failedConcepts` oblanej sesji → atomy przez `curriculum_item_concepts`, klasa `theory`/`exercise`). Derywacja albo znacznik (patrz Decyzja 1 pkt 2) — Twój wybór; JAK jest Twoje.

**[WYMÓG UI — Jack]** Ekran 5 nie potrzebuje przycisku „oznacz jako zrobione" — stan „odbyte" liczy backend z faktycznego re-ukończenia atomów. Student wraca do egzaminu naturalnie: linki correctives → atomy → (re-ukończenie) → powrót na stronę modułu, która sama pokaże „Podejdź do egzaminu" (świeży cykl).

---

## DECYZJA 5 — Pozostałe otwarte pytania Mili (rozdz. 10) + sync z §5a

| # (Mila 10.x) | Pytanie | Rozstrzygnięcie |
|---|---|---|
| **10.1** | test-out i cap 2 | **Decyzja 3** — wspólna pula; Blok B copy bezpieczna, zdanie „nie liczy się" zdjęte. |
| **10.2** | nota Leo (c) — semantyka „N" w mikrocopy | **N = `errorCount − maxErrors`** (dystans do progu), NIE surowe `errorCount`; człon „**do zaliczenia**" OBOWIĄZKOWY. Sync z §5/§5a nota 3. Dotyczy W2 **i** W3 (jedna reguła). Przy `maxErrors=1`, `errorCount=2` → N=1 → „zabrakło Ci **1** pytania **do zaliczenia**". **[WYMÓG UI/BACKENDU]** Mila 6.2: zamień „Zabrakło Ci {errorCount} … do progu" na formułę z N i „do zaliczenia"; P4 liczy `N = errorCount − maxErrors`. |
| **10.3** | nota Leo (b) — „M konceptów" liczy atom-less | **M = wszystkie RÓŻNE oblane koncepty** (deduplikacja po koncepcie), potwierdzam odczyt Leo. Bezpieczne, bo Decyzja 4 / §5a nota 1 gwarantuje, że KAŻDY policzony koncept renderuje coś do odświeżenia (atom / lab / statyczna „Pierwsza pomoc") — M nigdy nie obiecuje lekcji, której nie ma. Dla F1 bezprzedmiotowe (5/5 konceptów ma atom `exercise`). |
| **10.4** | co po correctives | **Decyzja 1 + 2** — świeży cykl (nowe 2 podejścia) po odbyciu correctives; W3 słusznie bez przycisku retry; retry wraca jako świeży cykl przez stronę modułu. **ODBLOKOWUJE merge P5** (to nie jest przeoczenie planu wymagające P6 — to była luka zliczania cyklu, teraz rozstrzygnięta jako wymóg backendu w P4). |
| **10.5** | nota Leo (d) — gwarancja ≥1 atom/koncept egzaminowany | **TAK, na poziomie curriculum** — audyt pojemności D10 (koncepty egzaminu ⊆ koncepty pokryte atomami) egzekwowany kontrakt-testem treści. Dla F1 potwierdzone (§5a nota 4: 5/5 `exercise`). **Ale front i tak obsługuje degradację defensywnie** (Mila 7.2 trzy-stan) — kontrakt-test jest na treści, defensywny render to tania polisa. Spójne z §5a nota 1. |

---

## DECYZJA 6 — Zdegradowana gałąź S-C: `correctives_required` BEZ paczki (nota 1 Leo, partia C)

**Eskalacja Leo (review partii C, 1E.3, G1/G4 — produkt+arch).** Trasa `POST /api/exam/start` może zwrócić `423 correctives_required` z `correctivesPackage === undefined` w JEDNYM przypadku: cykl oblany (S-C, `correctivesRequired=true`), ale żadna oblana sesja cyklu nie niesie zapisanej paczki w `result_json` — czyli **dane zdegradowane/historyczne** (stare `result_json` sprzed utrwalania paczki). **Na bieżącej ścieżce zapisu to NIE występuje** — P4 w trasie `complete` zawsze buduje i utrwala paczkę (niezmiennik D2). To odporność na dane uszkodzone, nie żywy bug. Fix C4 (już na prodzie) obsługuje ten stan bezpiecznie: front pokazuje dedykowany `correctives_unavailable` (twarda blokada, BEZ retry — ponowienie da ten sam 423), backend loguje `logError("exam.start.correctivesMissing")` u źródła (koniec cichej degradacji). **Konsekwencja dla studenta na zdegradowanych danych: ślepy zaułek** — nie ponowi i nie dostaje listy tematów do powtórki, utyka do ręcznej interwencji.

**Rozstrzygnięcie w jednym zdaniu:** **hybryda — obecny bezpiecznik C4 zostaje na prodzie TERAZ** (jest poprawny i wysyłkowy), **plus ticket B: ograniczona ODBUDOWA ŚCIEŻKI remediacji na odczycie** (nie generyczny rebuild całej paczki), z **progiem spłaty przed 1. realną rejestracją LUB przed pojawieniem się ścieżki zapisu mogącej wyprodukować zdegradowany `result_json`** — co pierwsze. Plus **natychmiastowa poprawka mikrocopy** C4 (niżej), bo obecne obiecuje coś, czego system nie robi.

### Dlaczego nie samo A (zaakceptuj dead-end na zawsze)

Ślepy zaułek w bramce formującej **łamie R13** — mój własny niezmiennik z D1: „błąd nigdy nie jest stanem końcowym, żadnej trwałej blokady ścieżki; ostatnie doświadczenie zawsze = sukces". Student utknięty do ręcznej interwencji to dokładnie stan „zablokowany na zawsze", którego cała maszyna stanów (S-C → S-D → S-A) ma nie dopuszczać. `logError` mówi NAM, ale student widzi zaułek i odchodzi. To jest najgorszy możliwy wynik dla produktu, którego teza brzmi „czas, nie talent; błąd prowadzi do opanowania". Argument „stan nieosiągalny + zero studentów" jest prawdziwy **dziś**, ale założenie „zero studentów" **wygasa z 1. rejestracją** — a wtedy asymetria kosztu błędu jest brutalna: koszt A = pojedynczy student cicho utknięty w bramce, która obiecuje mu przeciwieństwo.

### Dlaczego nie samo B (wymuś niezmiennik — zawsze odbuduj pełną paczkę na odczycie)

Dwa realne koszty, oba dydaktyczne, nie techniczne:

1. **Generyczny rebuild MASKUJE naruszenie niezmiennika zapisu.** Gdyby przyszły regres P4 przestał utrwalać paczkę, cichy rebuild na odczycie zamiótłby sygnał — dokładnie tę cichą degradację, którą C4 zabił przez `logError`. Odbudowa NIE może uciszyć alertu.
2. **Zdegradowany `result_json` może nie mieć wiarygodnego `errorCount`/`maxErrors`.** Te dwie liczby sterują WYŁĄCZNIE mikrocopy paczki (`N = errorCount − maxErrors`, „ile pytań do zaliczenia" — Decyzja 5.10.2, `buildCorrectivesPackage`). Odbudowa z brakującymi/niepewnymi liczbami wyprodukowałaby **sfałszowane N** — „zabrakło Ci X do zaliczenia" z liczbą zmyśloną. **Sfałszowany licznik dystansu do progu jest gorszy niż jego brak** — okłamuje studenta o odległości od zdania. To dydaktyczna czerwona linia (spójne z regułą banku F1: N liczone, nigdy zgadywane).

### Co rozstrzygam (dydaktyka/produkt) — kształt ticketu B

Rozdzielam **wartość nośną** paczki od **copy zachęty**:

- **Wartość nośna = lista ≤3 atomów do powtórki** (deterministyczna, `assembleCorrectives` z `failedConcepts`, **0 LLM**). To jest realna remediacja — to ona wypełnia obietnicę R13 (student dostaje ścieżkę naprzód). **Odbudowujemy JĄ**, o ile `failedConcepts` są odzyskiwalne ze zdegradowanego `result_json` **lub** re-derywowalne z odpowiedzi oblanej sesji (`assessment_answers` → koncepty błędnych pytań).
- **Licznik N („ile do zaliczenia") = copy wtórna.** Gdy `errorCount`/`maxErrors` są nieobecne/niepewne → paczka renderuje się w wariancie **„dystans nieznany"**: pokazuje tematy do powtórki BEZ zdania o liczbie pytań do zaliczenia. Lepsza paczka bez licznika niż paczka z licznikiem, który kłamie. **To decyzja w mojej domenie** (mikrocopy = dydaktyka).
- **Sygnał zapisu przeżywa odbudowę.** `logError("exam.start.correctivesMissing")` **zostaje** — rebuild ≠ wyciszenie. Rozróżnienie „dane historyczne (oczekiwane, niska waga)" vs „żywy regres P4 (wysoka waga)" może iść jako pole w logu, ale log pada zawsze. Odbudowa przywraca studentowi ścieżkę, NIE udając, że niezmiennik zapisu był dotrzymany.
- **Najgłębsza degradacja = A zostaje na zawsze.** Jeśli `failedConcepts` są nieodzyskiwalne i nie da się ich tanio re-derywować → **fallback do obecnej twardej blokady C4**. B **zawęża** zaułek do przypadku genuinnie nieodwracalnego, nie znosi bezpiecznika.

### Poprawka natychmiastowa (w zakresie A, przed ticketem B) — mikrocopy `correctives_unavailable`

Obecne copy C4: „…lista tematów do powtórki nie jest teraz dostępna. Wróć do modułu; **przygotujemy ją dla Ciebie**." — **obiecuje przygotowanie, którego żaden mechanizm nie dostarcza** (dopóki nie ma B). To małe naruszenie zaufania (brand voice: „customer trust > short-term win") i mojej bramy treści (copy nie obiecuje funkcji, której zakres stawia poza zasięgiem). **[WYMÓG UI — Jack]** zdjąć obietnicę auto-przygotowania: copy stwierdza fakt („nie możemy teraz odtworzyć listy tematów") + jedyna akcja „Wróć do modułu", bez zdania sugerującego, że system sam ją dostarczy. Gdy wejdzie B, copy tego wariantu i tak stanie się rzadsze (B renderuje realną paczkę, gdy tylko `failedConcepts` odzyskiwalne).

### Próg spłaty ticketu B (jednoznacznie)

Ticket B wchodzi do kolejki **przed** którymkolwiek z dwóch zdarzeń, co pierwsze:
- **T1 — przed 1. realną rejestracją studenta na prodzie** (moment, w którym wygasa założenie „zero studentów" i ekspozycja na zaułek staje się realna); albo
- **T2 — przed scaleniem jakiejkolwiek zmiany schematu/kodu mogącej wyprodukować `result_json` bez paczki na żywej ścieżce zapisu** (moment, w którym klasa zdegradowana daje się wygenerować na produkcji, nie tylko historycznie).

Dziś **żadne** z T1/T2 nie zachodzi (P4 zawsze utrwala, zero studentów), więc **A jest bezpieczne do wysyłki teraz, a B nie jest pilne dziś** — ale próg jest twardy i nazwany, nie „kiedyś".

**[WYMÓG BACKENDU — Ethan, arch-sign-off wymagany]** Realizacja B to kod silnika (trasa `start` + `exam-service`): (a) próba odzyskania/re-derywacji `failedConcepts` ze zdegradowanego stanu; (b) `buildCorrectivesPackage`/`assembleCorrectives` wywołane z odzyskanymi konceptami i **jawnym znacznikiem „dystans nieznany"** zamiast zmyślonego `errorCount`/`maxErrors`; (c) `logError` zachowany przy każdej odbudowie; (d) fallback do C4, gdy `failedConcepts` nieodzyskiwalne. **Czy `failedConcepts` są tanio re-derywowalne z `assessment_answers` — to feasibility do oceny Ethana**; jeśli nie, B degraduje się do „popraw copy + zostaw C4" i to jest akceptowalny wynik. JAK (kształt zapytania, gdzie helper) = domena Ethana/Maxa; ja rozstrzygam CO odbudować (atomy: tak; N: nigdy zmyślone) i KIEDY (próg spłaty).

---

## 6. Konsekwencje dla spec Mili (do naniesienia przez Milę/Jacka)

1. **Ekran 1, Blok A (E3) — nowy 4. pod-stan „correctives w toku".** Gdy wszystkie pozycje zrobione, egzamin oblany cap-2 (stan S-C), correctives NIE odbyte → Blok A nie pokazuje „Podejdź do egzaminu", tylko: „Dokończ powtórkę, żeby podejść ponownie" + link do paczki correctives (Ekran 5 z ostatniego wyniku). Gdy correctives odbyte (S-D) → Blok A wraca do „Podejdź do egzaminu" (świeży cykl). **[WYMÓG UI — Jack + dane: strona modułu musi znać stan correctives z backendu.]**
2. **Blok B (test-out) — copy bezpieczna** (Decyzja 3), zdanie o „nie liczy się" zdjęte.
3. **W2 i W3 — mikrocopy N/M** wg Decyzji 5 (10.2/10.3): N = `errorCount − maxErrors`, „do zaliczenia"; M = wszystkie różne oblane koncepty.
4. **W3 — brak przycisku retry** jest docelowy (Decyzja 2), nie „do wyjaśnienia". Ekran 5 stoi bez zmian projektowych Mili (jedyna akcja „Wróć do modułu" + linki atomów).

Routing slug↔UUID (Mila 7.4) i atom osierocony (7.2) to warstwa TECHNICZNA (Jack/Ethan) — poza moją decyzją; oflagowane słusznie, rekomendacja trasy-resolvera = decyzja Ethana (odwracalny kod, jego mandat P2/P5).

---

## 7. Podsumowanie — kto realizuje

| Decyzja | Wymóg backendu (Ethan, P4/P5) | Wymóg UI (Jack) |
|---|---|---|
| D1 maszyna stanów / reset cyklu | `priorFailed` scoped do cyklu; granica cyklu (znacznik lub derywacja); cykle nieograniczone | — |
| D2 blokada 3. próby | `/start` odrzuca w S-C stanem `correctives_required` (423/409 + payload paczki) | W3 bez retry; obsługa `correctives_required` z `/start` |
| D3 test-out vs cap-2 | ZERO zmian (obecny licznik poprawny); tylko scoping cyklu D1 | Blok B copy bezpieczna |
| D4 „correctives odbyte" | wyliczenie z `curriculum_item_answers` (re-ukończenie po `completedAt` 2. oblania) | brak przycisku „gotowe"; powrót naturalny przez stronę modułu |
| D5.10.2 N w mikrocopy | `N = errorCount − maxErrors` w budowie message P4 | brzmienie „…{N}… do zaliczenia" w W2/W3 |
| D5.10.3 M koncepty | M = distinct `failedConcepts` | render KAŻDEGO konceptu (3-stan Mili 7.2) |
| D6.1 pod-stan E3 „correctives w toku" | strona modułu dostaje stan correctives | 4. pod-stan Bloku A |
| DECYZJA 6 zdegradowana S-C (poprawka copy, TERAZ) | — | copy `correctives_unavailable` bez obietnicy auto-przygotowania |
| DECYZJA 6 ticket B (odbudowa ścieżki, próg T1/T2) | odzysk/re-derywacja `failedConcepts`; `assembleCorrectives` z wariantem „dystans nieznany"; `logError` zachowany; fallback do C4 — **arch-sign-off Ethana** | render paczki „dystans nieznany" (tematy bez licznika N) |

---

## Brama przed oddaniem — część A (produktowa, A1/A2)

Ten dokument to **decyzje produktowe**, nie treść curriculum (brak atomów, brak liczb liczonych ze zbioru danych, brak prozy studenta wymagającej uruchomienia w Pythonie). Bramą właściwą jest `skills/product/SKILL.md` A1/A2 (kompletność + spójność IN/OUT), nie treściowa T1–T5 (`skills/product/tresci-edukacyjne.md`) — zgodnie z regułą „dla PRD A1/A2, dla treści T1–T5".

**A1 — kompletność dostaw.** Sześć oznaczonych rozstrzygnięć: maszyna stanów po 2. oblaniu (DECYZJA 1), twarda blokada 3. próby (DECYZJA 2), test-out vs cap-2 (DECYZJA 3), definicja „correctives odbyte" (DECYZJA 4), pozostałe pytania Mili + sync §5a (DECYZJA 5), zdegradowana gałąź S-C bez paczki (DECYZJA 6 — nota 1 Leo, dodana v0.2). Plus ścieżka realizacji (§7, z wierszami D6). **PASS.**

**A2 — spójność IN/OUT.** Żadna decyzja nie opiera się na funkcji postawionej w OUT. Sprawdzone styki: (a) reset cyklu (D1) nie zakłada nowego silnika — reużywa `clampAttempt`/`gradeExam` bez zmian, zmienia tylko zakres zliczania; (b) blokada 3. próby (D2) nie zakłada UI retry na W3 — przeciwnie, potwierdza jego brak; (c) „correctives odbyte" (D4) nie zakłada human-in-the-loop (jawnie OUT wg §7) ani honor-systemu (jawnie odrzucony) — opiera się na `curriculum_item_answers`, który ISTNIEJE (ADR D2); (d) test-out (D3) nie zakłada rozróżniania sesji test-out (jawnie OUT — „zero zmian") — opiera się na obecnym liczniku; (e) **DECYZJA 6 odbudowa ścieżki (B) NIE zakłada wiarygodnego `errorCount`/`maxErrors` na zdegradowanych danych — przeciwnie, jawnie stawia je w OUT dla tej gałęzi (wariant „dystans nieznany"); NIE zakłada też cichego rebuildu (zachowuje `logError`) ani human-in-the-loop; opiera się na `assembleCorrectives`/`failedConcepts`, które ISTNIEJĄ, z jawnym fallbackiem do C4, gdy nie są odzyskiwalne**. **PASS.**

## Brama część B — self-critique (senior product lead, SaaS edukacyjny, po źle zescope'owanym launchu mastery-gate)

1. **SŁABOŚĆ — nieograniczone cykle mogą wyglądać jak „brak bramki" (student przechodzi z pamięci po N cyklach).** POPRAWKA: dopisałem uzasadnienie wobec §7 — to progresja WEWNĘTRZNA, kredencjał wychodzący i tak wymaga człowieka (capstone, D3 wariant C). Wewnętrzna bramka bez trwałej blokady jest zgodna z M12 (bramki=higiena) i R13; integralność kredencjału nietknięta. Ryzyko realne (memoryzacja) monitoruje D11, nie ignoruję go.
2. **SŁABOŚĆ — „correctives odbyte = re-ukończenie" może utknąć studenta, jeśli atom ma trudne pytanie.** POPRAWKA: zweryfikowałem wobec R13 — atomy mają nielimitowane próby, ostatnie doświadczenie zawsze sukces; re-ukończenie ZAWSZE się domyka. Zero ślepego zaułka. Jawnie zapisane.
3. **SŁABOŚĆ — reset cyklu jest rekurencyjny do wyliczenia (granica „> ostatnie correctives-done").** POPRAWKA: nie ukryłem tego pod „derywacja z telemetrii"; nazwałem rekurencję wprost i zarekomendowałem lekki znacznik cyklu, zostawiając JAK Ethanowi (granica roli) — nie udaję, że to trywialny SELECT.
4. **SŁABOŚĆ — wspólna pula test-out mogła zniechęcać do test-out (student boi się „zmarnować" podejście).** POPRAWKA: pokazałem, że przy łagodnych correctives (D1) koszt jest mały, i zapisałem, że D11 (uptake/porzucenia test-out) może to zrewidować — decyzja jest świadoma, nie z lenistwa, i ma warunek powrotu.
5. **SŁABOŚĆ — mnożę stany UI (4. pod-stan E3), mogę rozlać zakres P5.** POPRAWKA: ograniczyłem konsekwencje UI do JEDNEGO nowego pod-stanu + poprawek copy, wszystko na istniejących wzorcach Mili (Blok A, Ekran 5); nie wymyślam nowych ekranów. Routing i atom osierocony jawnie zostawiłem poza moją decyzją (warstwa techniczna) — nie rozlewam roli.

**Efekt B:** żadna zmiana nie ruszyła parametrów egzaminu (`{questionCount:15, maxErrors:1}` z §5a) ani banku F1; doprecyzowania dotyczyły uzasadnień (1,2), jawności rekurencji (3), warunku powrotu (4) i dyscypliny zakresu UI (5).
