# ADR-014 — 1E.0: curriculum — pełna ścieżka edukacyjna (pilotaż Data Science)

**Status:** ZAAKCEPTOWANY · **Sign-off:** Darek 2026-07-11 (komplet 13 punktów:
pkt 1–4, 6, 8–10 wg rekomendacji; pkt 5, 7, 11, 13 ze zmianami — implementacja
docelowa bez rozdzielania pilot/po-pilocie, 4 capstone'y, weryfikacja
automatyczna, pełne drabinki hintów; pkt 12 = wariant b) + **Sophia 2026-07-11
(wolumen ~200–285 h zatwierdzony)** · **Data:** 2026-07-11 · **Autor spike'u:**
Oliver (time-box 1E.0) · **Odblokowuje:** 1E.1+ (atomizacja:
`.agents/plans/12-curriculum-1e1-atomizacja.md`)
**Przebieg:** pre-brief sesji nauki (3 agentów) → Faza A (4 agentów researchu,
71 unikalnych ustaleń z rangami + errata) ∥ Faza B (2 agentów audytu, 10/10 projektów,
54 URL-e) → v0.1 → **krytyczny przegląd 4 soczewkami: 59 znalezisk (1 WETO warunkowe
content-ops, 7 krytycznych, 22 ważne, 20 drobnych, 10 do listy decyzyjnej); weto
zdjęte pakietem cięć A–E, wszystkie krytyczne i ważne wcielone** → v0.2.
**Powiązania:** roadmapa §Strumień 1E (1E.0–1E.7); decyzje Darka WIĄŻĄCE
(2026-07-10/11 — persona „literalne zero", sesja 15–30 min, remediacja przed
pilotażem, pomoc static-first, model atomu);
`docs/curation/research-kognitywistyka-1e0.md` (tabela syntezy + errata — KAŻDY
mechanizm niżej cytuje ID: P*/M*/G*/C*/R*); `docs/curation/audyt-ds-partia-1-luki.md`
(mapa luk, wycena ~86,5 h); `docs/curation/pre-brief-1e0-sesje-nauki.md`;
ADR-010 (ingest = czerwona linia); ADR-013 (wzorzec procesu; viva);
bank pytań A5 (1.10–1.12); rytm 1.18; tutor C11; sandbox 1.9.

## Kontekst

Marketplace projektów zakłada studenta, który ma luki, ale umie się uczyć sam.
Persona docelowa Fazy 1E to **literalne zero**: student, który nigdy nie programował
i ma zostać przeprowadzony za rękę od pierwszego do ostatniego kroku. Audyt partii 1
DS potwierdza, że dzisiejsza treść tego nie umie: **0/10 projektów przechodzi test
literalnego zera** — teorie to dobre eseje „dlaczego" bez ramp „jak", prerekwizyty
są deklaratywne (nic ich nie uczy ani nie egzekwuje), a drabina modułów nie istnieje.
Prerekwizyty w schemacie dziś tylko ważą matching; skill-map celowo nie ma krawędzi
zależności (komentarz w `build-graph.ts`: potrzebne osobne źródło danych —
curriculum nim będzie).

Spike 1E.0 projektuje warstwę curriculum: encje, semantykę prerekwizytów blokujących,
model pedagogiczny oparty na dowodach i zakres pilotażu DS. Wyjście = ten ADR;
kod i migracje zaczynają się w 1E.1 po sign-offie.

## Decyzja (proponowana)

### D1 · Atom postępu i granulacja

Model atomu jest ZWIĄZANY decyzją Darka (2026-07-11), potwierdzoną dowodami
(P1, C2, C12, R1) i benchmarkiem MIT/CS50/Code in Place (pre-brief) oraz precedensem
Duolingo/Brilliant (G1, G10). Parametry skorygowane przeglądem content-ops
(pakiet cięć A–B — weto zdjęte):

- **Atom = teoria ~5–8 min (300–600 słów) + ćwiczenie retrieval 3 pytania MC
  BEZPOŚREDNIO po teorii.** Rozmiar jednostki ma dowód behawioralny (P1 — z errą:
  ranga „SILNY w kontekście dobrowolnym"); umiejscowienie „zaraz po teorii" to
  decyzja projektowa wsparta mechanizmem retrieval (R1), nie danymi Guo.
  **Sesja 15–30 min = 2–4 atomy.**
- **Bez wariantów pytań na poziomie atomu** — nielimitowane próby z wyjaśnieniem
  (R13) chronią przed memoryzacją wystarczająco; warianty istnieją wyłącznie
  w banku egzaminacyjnym (cap = 2 per koncept — po 2. oblaniu i tak wchodzą
  correctives, D3).
- **1 koncept = 1 atom** (C12, G10); budżet słów wymusza higienę anty-dygresyjną (C10).
- Struktura atomu nowego konceptu: cel → teoria z worked example (C1, C2 — WE PRZED
  pierwszym pytaniem; zakaz „spróbuj sam zanim pokażemy" na poziomie wejściowym)
  → retrieval izomorficzny z przykładem. W teorii mikro-generacja: „przewidź wynik
  komórki" (R14).
- **Nowy typ pozycji `lab`** (znalezisko krytyczne przeglądu — bez niego pierwszy
  samodzielnie napisany i uruchomiony kod w życiu studenta przypadałby na OCENIANY
  projekt): zadanie notebookowe — gotowy szkielet (Colab), student wypełnia
  i URUCHAMIA; 1–2 na moduł F1–F3 + obowiązkowo między ostatnim atomem modułu
  projektowego a capstone'em. Zaliczenie: wykonanie + artefakt (samodeklaracja
  z linkiem w pilocie — rygor: pkt 11 listy decyzyjnej). Fading D5 przestaje być
  w całości formatem zamkniętym.
- Format bazowy pytań: **MC z natychmiastowym deterministycznym feedbackiem**
  (R2: MC g=+0,70 nie ustępuje otwartym w warunkach stosowanych; R5: w self-paced
  opóźniony feedback nie zostaje obejrzany). Formaty otwarte w powtórkach (R3).
- Zaliczenie atomu: **licznik, nie procent** (M10); wszystkie pytania odpowiedziane
  poprawnie, nielimitowane próby, błąd nigdy nie jest stanem końcowym (R13 —
  ostatnie doświadczenie w atomie zawsze = sukces).
- Opcjonalny pretest „zgadnij, zanim przeczytasz" (R12) — parametr eksperymentu,
  domyślnie OFF (spór C14 vs G10 → pkt 8 listy; dane D11 rozstrzygną).
- Start ścieżki: atomy krótsze, checkpointy odpowiedzi gęstsze (P8); trudność pytań
  blisko tekstu, rośnie z pozycją (R20); blocking przy pierwszej nauce, interleaving
  w powtórkach mylących się par (R15).
- **Wartości = parametry strojone** w konfiguracji treści, walidowane D11, nie opinią.

**Matematyka wolumenu (skorygowana — decyzja kosztowa udająca schematową).**
Stawka atomu PO cięciach: **2,5–3,5 h** (teoria konforemna z regułami D6 + WE
wykonywalny i zweryfikowany + 3 pytania MC z dystraktorami diagnostycznymi
i feedbackiem per opcja + hinty + przejście QG z poprawkami; rozbicie — raport
soczewki 4). Po decyzji Darka pkt 13 (pełna drabinka hintów wszędzie, +0,3–0,6 h):
**stawka atomu 2,8–4,1 h; moduł = 5–6 atomów (~14–25 h) + egzamin jawnie wyceniony
(15–20 pytań × 2 warianty ≈ 5–6 h) ≈ 19–31 h/moduł.** Pilot z D10 [decyzje Darka
2026-07-11: 4 capstone'y, mini-projekt po F3] (L0 lean ~10 h + 7 modułów × 19–31 h
+ mini-projekt transferowy ~10–15 h + remediacja pilot-path ~36,5 h + aktualizacja
standardu QG-5 ~6 h) = **ścieżka krytyczna treści ≈ 200–285 h ≈ 14–24 tygodnie
pracy kuratorskiej** (12–15 h/tydz.) → orientacyjnie treść I kw. 2027, pilot
wiosna/lato 2027 (kalendarz = prognoza wykonalności, bez deadline'u zewnętrznego).
Pakiet cięć A–E z przeglądu content-ops POZOSTAJE w mocy (warunek zdjęcia weta);
opcja F (płytsze drabinki) odrzucona decyzją Darka — koszt jawnie doliczony wyżej.
**Wykonalność ~200–285 h = główny punkt sign-offu Sophii.** Moduły 1–3 planowo wolniejsze dla studenta — front-loaded time to cecha
mastery, nie bug (M6). Weto soczewki content-ops zdjęte pod warunkiem utrzymania
tych parametrów; mechanizmy rangi SILNY (retrieval po atomie, WE przed retrieval,
spacing spiralny) — nietknięte.

### D2 · Model encji

Addytywne, za flagą `FLAG_CURRICULUM_PATH`, flaga OFF = zero zmian zachowania.
Model uzupełniony po przeglądzie architektury (instrumentacja, postęp modułu, RLS):

- **`curriculum_modules`** — id, slug, title, description, examConfigJson
  (parametry egzaminu per moduł — D3), timestamps.
- **`curriculum_path_modules`** — relacja **M:N moduł↔ścieżka** (pathKey, moduleId,
  `order`). Przesądzona TERAZ (nie pathKey na module): fundamenty (L0, F1–F2, SQL)
  to 30–40% wolumenu każdej ścieżki technicznej i MUSZĄ być współdzielone przy
  rollout'cie na 21 ścieżek — retrofit po zasianiu treści byłby migracją treści,
  nie schematu. Pilot wypełnia jedną ścieżkę ('data-science'). Zgodne z 1E.2
  („wspólny trzon Fundamenty"): na poziomie taksonomii trzon już jest wspólny
  (`questionConcepts.trunk`), M:N czyni go wspólnym na poziomie modułów.
- **`curriculum_module_items`** — id, moduleId FK, `order`, **kind ENUM:
  `theory` / `exercise` / `lab` / `project` / `exam` + ZAREZERWOWANE `review`**
  (pod FSRS 1E.4), title, contentMd, configJson. Pozycja `project` wskazuje
  `projectId` FK → `projects` (reuse-as-capstone, D4) i definiuje **3–5 kamieni
  milowych** (checklist w configJson — D3). Pozycja `exercise`/`exam` wskazuje
  koncepty banku pytań.
- **Kręgosłup konceptów (warunek konieczny):** `curriculum_item_concepts`
  (itemId, conceptId FK → `questionConcepts`) — jedna taksonomia, wielu konsumentów
  (ćwiczenia 1E.2, egzaminy 1E.3, powtórki 1E.4, placement 1E.7, correctives D5,
  audyt pojemności D10). Zakaz drugiej taksonomii; koncepty `retired` = strażnik
  w kontrakt-teście; mapowanie na kompetencje rynkowe przez
  `project_competencies.competencyName` ↔ `questionConcepts.competencyName`
  (join po nazwie liścia, chroniony istniejącą konwencją kontrakt-testu).
- **`curriculum_item_progress`** — studentId, **tenantId** (wzorzec RLS 0030:
  ENABLE+FORCE, student_sees_own, owner_passthrough — bez tego wpis rls-matrix
  nie przejdzie sign-offu), itemId, status (locked/available/in_progress/completed/
  **skipped_by_placement**), attempts, lastAnswerAt, completedAt + indeksy.
- **`curriculum_item_answers`** — **append-only** (znalezisko krytyczne przeglądu:
  tabela stanu nie uniesie instrumentacji D11 ani cech FSRS): studentId, tenantId,
  itemId, questionItemId FK, isCorrect, answeredAt, hintDepth. Na niej wiszą:
  success rate PIERWSZEJ próby, czas-na-pytanie, powtórzone błędy, logowanie cech
  pod model zapominania (G6) — od pierwszego dnia. **Ślad streaka czerpie z tej
  tabeli** (append-only nie gubi wcześniejszych dni pracy — D9).
- **`curriculum_module_progress`** — studentId, tenantId, moduleId, status,
  **`verifiedByMethod` IN ('exam','diagnostic','test_out')** — nośnik blokady D3,
  placementu D8 i test-outu (moduł zaliczony przy zerze ukończonych pozycji);
  „zaliczony" NIE jest derywatem z pozycji.
- **`curriculum_item_resources`** — zasoby pozycji modułów jako NOWA tabela
  (rozszerzanie `project_learning_resources` odrzucone: projectId NOT NULL —
  nie byłoby addytywne). Kolumny od dnia 1: url, label, function, **license,
  language, registrationRequired, verifiedAt** (dług QG-5 §3/§4/§7 spłacony
  w nowej encji od razu).
- **Stan powtórek FSRS (stability/difficulty/due/lapses per student×koncept) =
  OSOBNA addytywna tabela w 1E.4** — D2 świadomie jej nie projektuje; rezerwacja
  `kind='review'` dotyczy pozycji treści, nie stanu schedulera.
- Treść przez **wersjonowany JSON + ingest wg ADR-010** [CZERWONA LINIA — wykonuje
  Darek] + rozszerzony kontrakt-test; bez UI autorskiego (D10). Migracje addytywne,
  wpisy RLS do rls-matrix, rejestr flag.

### D3 · Prerekwizyty blokujące + definicja „zaliczenia" per typ

**Blokada na poziomie MODUŁU** (nośnik: `curriculum_module_progress`): moduł N+1
dostępny po zaliczeniu N (pilot: łańcuch; model dopuszcza DAG przez
`curriculum_module_prereqs`). Wewnątrz modułu pozycje odblokowują się sekwencyjnie,
bez bramek % między atomami. Egzekwowanie w API (dowód 1E.1). **Wejście z placementu
(D8): pominięte pozycje dostają status `skipped_by_placement`** (nie `completed` —
postęp modułu liczy się z dowodów, G8).

**UX drabiny: widoczna-ale-zablokowana** + przycisk **„test out"** (egzamin modułu
wprost — M16, G7) przy każdym zablokowanym module. Wariant „ukryta" odrzucony.

**Definicja zaliczenia per typ pozycji:**

| Typ | Zaliczenie | Dowód/ID |
|---|---|---|
| `theory` | przeczytana + pytanie kontrolne retrieval poprawnie (nie sam scroll; ponowna lektura dostępna, ale nie zalicza — R4) | R1, R4 |
| `exercise` | wszystkie pytania poprawnie; nielimitowane próby, natychmiastowy feedback, licznik zamiast % (M10); błąd → wyjaśnienie → retry (R13) | M10, R2, R5, R13 |
| `lab` | wykonanie zweryfikowane **AUTOMATYCZNIE** [decyzja Darka 2026-07-11, pkt 11: implementacja docelowa od razu] — deterministyczny check wyniku/artefaktu; tam, gdzie trzeba uruchomić kod studenta, reuse infrastruktury sandboxa 1.9; definicja checków per lab w 1E.1/1E.6 | znalezisko przeglądu; trenuje czynność, którą rubryka capstone'u ocenia |
| `project` | **3–5 kamieni milowych weryfikowanych AUTOMATYCZNIE** [decyzja Darka 2026-07-11, pkt 11] (deterministyczne checki: dane pobrane / notebook uruchamia się / repo wypchnięte / submit — definicja per projekt w 1E.1/1E.6, reuse sandboxa 1.9) — każdy kamień = zdarzenie postępu i ślad aktywności (bez tego capstone to 10–30 wieczorów bez żadnego „completed"); finał: submit do istniejącego pipeline'u. **Rekomendacja: wariant C** — `submitted` ODBLOKOWUJE następny moduł, `verified` (viva/człowiek) pozostaje warunkiem receiptu w Passporcie (dwie waluty G9: postęp nauki ≠ dowód kompetencji). Usuwa „martwą ciszę vivy" (drabina zamrożona + streak umiera w szczycie motywacji). Alternatywa 'verified'-blokujące → pkt 2 listy. Niezależnie od wyboru: **SLA vivy jawne dla studenta; na czas oczekiwania alert zastoju 1.18 wyłączony + dzień łaski streaka** (D9) | G9, ADR-013; znaleziska przeglądu |
| `exam` | mastery gate 1E.3: **15–20 pytań, próg jako LICZNIK dopuszczalnych błędów** (≈90%: ≤1 błąd przy 15 / ≤2 przy 20 — spójnie z M10; wariant „12 pytań/90%" odrzucony: progu 90% nie da się przy 12 osiągnąć dokładnie, a 1 lapsus oblewa). Parametr per moduł w examConfigJson. **Pytania egzaminacyjne kalibrowane OSOBNO (wyższy docelowy success rate niż atomowe)** — bez tego próg 90% i kalibracja atomów 80–90% są matematycznie sprzeczne (przy p=0,85 ~56% oblewa 1. podejście; liczby → wejście do pkt 1 listy). **Transfer w fundamentach [decyzja Darka 2026-07-11, pkt 12 = wariant (b)]: MINI-PROJEKT po F3** (lekki, weryfikowany automatycznie — pierwsza samodzielna praca przed pełnym capstone'em) = miara transferu fundamentów, konsumuje M17/M5 (mastery pytań zamkniętych nie transferuje do kodu); egzaminy F1–F3 pozostają MC, wykonanie trenują laby. Oblany → retry z INNYM wariantem (cap 2); **po 2. oblaniu — obowiązkowe correctives** (M13, M14): paczka ≤3 atomów wskazanych per błędne pytanie (przez `curriculum_item_concepts`), mikrocopy „zabrakło Ci 1 pytania — 2 koncepty do odświeżenia, ~15 min" (nie lista braków); podejście do egzaminu (zdane czy nie) = ślad aktywności dla streaka. Stan egzaminu zapisywany (pauza/wznowienie — wzorzec `assessment_sessions`); ostrzeżenie „zarezerwuj ~25 min" przed startem | M3, M8, M9, M10, M13, M14, M17, R16 |

Uzasadnienie progu ~90% (bez inflacji retorycznej — korekta przeglądu): **zbieżność
kierunkowa trzech słabych/mieszanych źródeł, z których dwa czerpią z częściowo
wspólnego korpusu** (M3: analiza wtórna VanLehna — próg 90 vs 80 tłumaczy część
„2 sigma"; M9: moderatory tej samej literatury mastery; M8: małe kliniczne ABA —
retencja 90% >> 80%). Żadne źródło nie wskazuje jednej „naukowej" liczby — stąd
parametr + dane D11. Koszt progu MUSI być zrównoważony przez: warianty retry,
correctives i test-out (inaczej wheel-spinning u ~25% par student–umiejętność — M13).

**Dwustopniowość statusu konceptu (G7, G9):** atom „zaliczony" ≠ koncept „opanowany";
opanowanie potwierdza egzamin (i utrzymują powtórki 1E.4 — R7 z kryterium „1 poprawna
odpowiedź/sesja × ~3 rozłożone sesje"; kryterium niskie także w sesji początkowej =
kompromis czasowy uzasadniony relearning-override, R21). Do Passportu — wyłącznie
dowody opanowania.

### D4 · Relacja do istniejących encji

**Werdykt audytu:** rdzenie merytoryczne 10 projektów DOBRE, brakuje ramp →
**REUSE-as-capstone, nie rewrite**:

- 10 projektów DS = pozycje `kind='project'` modułów; żywy prod, kontrakt Ethana
  i czerwona linia ADR-010 nietknięte.
- `projects.theoryMd` zostaje briefingiem projektu; NOWE atomy go OTACZAJĄ
  (rampa wg mapy luk).
- **Moduł zerowy L0 — wariant LEAN** (ujednolicenie wycen 8 vs 12–20 h):
  4 atomy-checklisty środowiskowe (~10 h), zaliczenie przez WYKONANIE (pierwszy
  uruchomiony skrypt jako dowód), **bez egzaminu MC** (12 pytań zamkniętych
  o terminalu = teatr pomiaru; forma → pkt 10 listy). Zdejmuje bloker #1 audytu
  i ~8–10 h z ramp per projekt.
- Zasoby pozycji modułów: **`curriculum_item_resources`** (D2) — od razu z licencją,
  językiem, flagą rejestracji i `verifiedAt`. Na istniejącej
  `project_learning_resources` tylko addytywne kolumny nullable (licencja, język,
  rejestracja, verifiedAt) — dług QG-5 partii 1.
- **Zasób EN nigdy na ścieżce krytycznej zaliczenia** (audyt: ~97% zasobów EN) —
  sedno zawsze w polskiej teorii atomu; zasoby = pogłębienie opcjonalne.
- **`verifiedAt` = linia utrzymaniowa, nie jednorazówka:** ręczna reweryfikacja
  ~2–4 h/kwartał/ścieżkę DO CZASU wdrożenia automatu link-check (wymagania z audytu:
  UA przeglądarki, detekcja SPA — nyc.gov 403 dla botów, customer-academy „Loading");
  automat przed startem pilotażu. Konwencja świeżości obejmuje też ATOMY OPERACYJNE
  (walkthrough'y UI Colab/GitHub starzeją się szybciej niż koncepty).
- **Jawna deklaracja: flaga OFF = dzisiejszy marketplace w 100% nietknięty.**

### D5 · Pomoc na każdym kroku (zastrzeżenie #1 jako architektura)

Warstwowo, **static-first** (decyzja Darka):

- **(a) Warstwa statyczna (0 LLM, pre-authored):**
  - Worked example w KAŻDYM atomie nowego konceptu, PRZED retrieval (C1, C2).
  - **Drabinka hintów: pełna 3-stopniowa WSZĘDZIE** (koncepcyjny → szkielet →
    pełne rozwiązanie z objaśnieniem — C5) [decyzja Darka 2026-07-11, pkt 13:
    maksymalna siatka bezpieczeństwa; koszt +0,3–0,6 h/atom doliczony w D1].
    Dno drabinki nie blokuje zaliczenia (R13).
  - **Completion problems** między WE a zadaniem samodzielnym (C3 — ranga
    po erracie: SILNY-kierunkowo w domenie programowania; warianty maskowaniem
    linii wzorca).
  - **Harmonogram fading w module** (C5, backward fading): pełne WE → backward
    completion → luki w środku → `lab`/zadanie samodzielne. **Fading ADAPTACYJNY
    od razu** [decyzja Darka 2026-07-11, pkt 5: implementacja docelowa, bez
    rozdzielania pilot/po-pilocie] (C6 — po erracie ranga MIESZANY; reguły
    DETERMINISTYCZNE z `curriculum_item_answers`, 0 LLM: 2 bezbłędne retrieval
    bez hintów ⇒ następny atom z mniejszym wsparciem; 2 błędy na kroku / dno
    drabinki / eskalacja ⇒ szczebel wstecz); warianty completion generowane
    mechanicznie z wzorcowego rozwiązania (maskowanie linii — koszt kuratorski
    ograniczony).
  - **Strona „pierwsza pomoc środowiskowa" per moduł** (statyczna, utrzymywana jak
    treść): topowe błędy Colab/Git/kont z audytu — bo błędy środowiska to blokady,
    których hint per-koncept nie przewidzi.
- **(b) Tutor z kontekstem pozycji:** istniejący tutor C11 dostaje teorię modułu
  przez ZAREZERWOWANE `moduleTheory` w `TutorProjectContext`
  (`src/lib/ai/project-tutor.ts` — stub czeka; wypełnienie w trasie, zero zmian
  w module). Guardraile i ledger bez zmian.
- **(c) Przycisk „utknąłem":** eskalacja do tutora AI z limitami + ledger.
  Prior art: **CS50 Duck (G11, PRECEDENS-INŻ)** — limity z regeneracją czasową,
  „prowadź, nie zdradzaj". **Eskalacja zawiera pole „wklej komunikat błędu"**
  (tutor nie widzi ekranu studenta — bez tego pomoc środowiskowa jest ślepa).
  **Pozycje `project`/`lab` mają odrębną (szybciej regenerującą) pulę limitów** —
  wieczorem w połowie projektu tutor to jedyny żywy kanał; wyczerpany limit
  o 21:30 = churn. Po serii błędów NAJPIERW propozycja atomu powtórkowego (G4 —
  droga powrotu przez praktykę), eskalacja AI jako następny szczebel.
- **Correctives po oblanym egzaminie** (M14): paczka ≤3 atomów + wariant B
  wyjaśnienia. **Zakres wariantu B (korekta sprzeczności v0.1): TYLKO koncepty
  z alarmem D11** (wheel-spinning ≥2 oblane egzaminy / success rate <70%),
  autorowany REAKTYWNIE w trakcie pilotażu — nie z góry dla wszystkich atomów.
- **Domknięcie kosztów treści:** cała treść pętli nauki (pytania, warianty, hinty,
  wyjaśnienia, completion, strony pierwszej pomocy) = **pre-authored przez kuratora,
  0 LLM**. **Jedyny wyjątek LLM build-time: „mostki" kuracji 1E.5** (czego szukać
  w źródle i po co) — generowane RAZ per moduł, cache w DB, koszt w `ai_usage_ledger`,
  0 wywołań na odczycie (zgodnie z roadmapą 1E.5; usuwa sprzeczność z v0.1
  „LLM wyłącznie w tutorze"). LLM runtime — wyłącznie eskalacje tutora.

### D6 · Model pedagogiczny (evidence-based)

Każdy mechanizm cytuje ID z tabeli syntezy (+ errata); wpisy bez dowodu naukowego
oznaczone PRECEDENS-INŻ.

1. **Mastery gating** na egzaminach modułowych (M4: ES≈0,5, najwięcej dla słabszych;
   M15: silne dla umiejętności proceduralnych). Granice: M12 (bramki to higiena,
   nie USP — przewagę budują correctives M14 i retrieval/spacing), M5+M17 (transfer
   poza pytania kursowe ≈ 0 → pozycja produkcyjna w egzaminie D3 + miara zewnętrzna
   D11), M2 (realnie 0,2–0,5 SD, nie „2 sigma").
2. **Retrieval po każdym atomie** = główny mechanizm uczenia (R1, R2, R6, P1);
   bez restudy-jako-zaliczenia (R4).
3. **Spacing** (P2; R9–R11): **(i) pytania spiralne per KONCEPT KLUCZOWY modułu**
   (≤4 konceptów kluczowych/moduł, tagowane przy autoringu — pozycja w checkliście
   QG, nie retrofit), **(ii) „przegląd przed egzaminem"** = zestaw z ISTNIEJĄCYCH
   pytań atomowych wcześniejszych modułów (czysty reuse, 0 nowego autoringu —
   godzi dawkę spacingu z budżetem content-ops), (iii) egzamin modułu. Harmonogram
   równomierny (R9 — expanding bez przewagi); odstępy wg R10 (Cepeda 2008, zakres
   5–40% horyzontu). **Specyfikacja pod FSRS 1E.4:** opanowanie = ~3 rozłożone
   sesje × 1 poprawne przypomnienie (R7, R21 relearning-override; R8: +40% retencji);
   logowanie cech od dnia 1 przez `curriculum_item_answers` (G6). Po sesji sugestia
   przerwy/„wróć jutro" (P4 — dobrostan; bez twierdzeń o „konsolidacji w przerwie").
4. **Scaffolding + fading** (C1, C2, C3, C5); instruction-first dla zera —
   productive failure odrzucone na poziomie wejściowym (C14, R19).
5. **Reguły autorstwa treści → aktualizacja standardu QG-5** (zadanie ~6 h ze
   specyfikacją — progi QG-5 dziś dotyczą projektów, atom 300–600 słów nie ma
   standardu): (1) integracja objaśnień z kodem (C9, d≈0,72 po erracie); (2) cięcie
   seductive details (C10); (3) signaling (C11); (4) WE przed retrieval (C1/C2);
   (5) 1 koncept = 1 atom (C12); (6) anty-redundancja (C13); (7) samo-wyjaśnianie
   oszczędnie (C4).
6. **Zdanie godzące zastrzeżenie #5 Darka (WIĄŻĄCE):** **„bez wysiłku" = zero
   tarcia pozażądanego (extraneous); trudność pożądana (retrieval, generowanie)
   ZOSTAJE.** Konflikt realny (R17, R4). Operacjonalizacja: kalibracja ~80–90%
   sukcesu 1. próby NA ATOMACH (R16 — heurystyka strojona danymi), wyższa kalibracja
   na egzaminie (D3), błąd nigdy nie jest stanem końcowym (R13), reframing wysiłku
   w mikrocopy (R17), quizy niskostawkowe redukują stres testowy (R18 — hipoteza
   do potwierdzenia).
7. **Mechanika postępu wpięta w streak 1.18:** streak za MINIMALNĄ jednostkę —
   1 atom dziennie (G2, PRECEDENS-INŻ), nigdy za bezbłędność (R13); „dzień łaski"/
   freeze zamiast twardego zerowania (G3, PRECEDENS-INŻ — 3,6× to KORELACJA;
   patrz D11 anty-Goodhart). **Dwie waluty rozdzielone (G9):** wysiłek/rytm ≠
   opanowanie (Passport).
8. **Komunikacja produktu bez mitów:** zakaz „25 min naukowo optymalne" (P5),
   „uwaga spada po 10–15 min" (P6), „2 sigma" (M2), liczb microlearningu (P7)
   **oraz „95% uczniów osiąga mastery" (M1)** — narracja „czas, nie talent"
   dozwolona wyłącznie BEZ liczby. Bariera językowa (M11) → treść PL, terminy EN
   ze słowniczkiem.

### D7 · Remediacja partii DS (przed pilotażem — decyzja Darka; zakres → pkt 4 listy)

Mapa: `docs/curation/audyt-ds-partia-1-luki.md`. Wycena całości ~86,5 h; kluczowe
blokery i priorytety — w mapie.

- **Remediacja SEKWENCJONOWANA [ZATWIERDZONE — Darek 2026-07-11].** Na ścieżce
  krytycznej pilotażu projekty osiągalne przez pilotów (po decyzji o 4 capstone'ach):
  `ds-eda` (~10 h) + `ds-sql` (~8,5 h) + `ds-pierwszy-model-predykcyjny` (~9 h)
  + `ds-llm-strukturalna-ekstrakcja` (~9 h) ≈ **36,5 h przed startem** (L0 lean
  pokrywa wspólną materię środowiskową); pozostałe 6 projektów (~50 h) równolegle/
  po starcie — liniowa drabina pilotażu kończy się na M-LLM, pilot fizycznie ich
  nie dotknie. Dodatkowy argument za sekwencjonowaniem (po zniknięciu deadline'u):
  tamte projekty i tak będą później obudowywane modułami — rampy naprawione dziś
  mogłyby wymagać drugiej ręki, a dane z pilotażu (D11) nauczą nas pisać je lepiej.
- Kolejność: L0 lean najpierw (bloker #1) → link Azure Sandbox + sprzeczność
  ds-chmura (przy partii po-pilotażowej, bo poza drabiną pilotażu — ale link do
  PŁATNEGO produktu naprawić od razu, koszt minuty) → dataset+Biome→ruff w ds-mlops
  → próg słów ds-pierwszy-model → rampy w kolejności drabiny (kaskada `acquired`).
- Partia naprawcza przez pełny proces QG-1…7 + ingest ADR-010 [CZERWONA LINIA].
- Struktura: osobne zadanie **1E.R** (przed 1E.5); moduł L0 formalnie = treść
  curriculum (1E.2), budowany najpierw.
- Główny punkt sign-offu Sophii: wykonalność względem kalendarza (D1).

### D8 · Placement — interfejs, nie algorytm

Kontrakt dla 1E.7 (bez schodzenia głębiej):

- Diagnoza 1.11/1.12 → `result_json.concepts` (źródło prawdy). **Szew granulacji
  (korekta przeglądu):** diagnoza mierzy TYLKO koncepty `diagnostic=true`
  (gruboziarniste — 1 per liść DS), a `curriculum_item_concepts` wskaże koncepty
  drobnoziarniste z 1E.2 → **reguła rollupu: każdy moduł jest dodatkowo otagowany
  konceptem diagnostycznym** (relacja drobny→diagnostyczny wewnątrz jednej
  taksonomii); placement operuje na tagach diagnostycznych modułów.
- Moduł opanowany wg diagnozy → `curriculum_module_progress.verifiedByMethod=
  'diagnostic'`; pozycje wewnątrz → `skipped_by_placement` (D3). Drabina otwiera
  się od pierwszego nieopanowanego modułu.
- **„Test out"** = egzamin modułu wprost (M16, G7) → `verifiedByMethod='test_out'`.
- **Student bez diagnozy = moduł L0.**
- **Placement steruje trybem wsparcia (C7 z asymetrią, C8):** wejście w moduł
  graniczny od fazy completion, nigdy „od zera wsparcia"; przy niepewności domyślnie
  dawaj wsparcie; higiena tekstu (signaling/koherencja/segmentacja) dla wszystkich;
  automatyczny powrót o szczebel przy błędach.

### D9 · Integracje z istniejącym systemem

- **Rytm 1.18:** ślad aktywności curriculum z **`curriculum_item_answers`**
  (append-only — nie gubi dni pracy nad tym samym atomem; upsertowy `lastAnswerAt`
  w progress odrzucony jako źródło) dołącza do UNION ALL w
  `src/lib/rhythm/activity.ts` (+ indeks student_id). Flaga OFF = pusta tabela =
  zachowanie identyczne. **Na czas oczekiwania na werdykt vivy capstone'u: alert
  zastoju wyłączony + dzień łaski streaka** (platforma nie karze za własną latencję).
- **`study_rhythms`** (korekta v0.1 — kolumna `activeProjectId` żyje TU, nie
  w `students`): semantyka bez zmian; istniejący hak **`study_rhythms.module_ref`**
  („Hak 1E.6" w schemacie) = miejsce powiązania rytmu z modułem w 1E.6; curriculum
  nie dubluje wskaźnika pozycji (ostatnia ukończona pozycja = zapytanie).
- **`assessment_sessions`:** ALTER CHECK `kind` + `'module_exam'` (komentarz
  w schemacie przewiduje; konsumenci filtrują jawnie po kind — bezpieczne przy OFF)
  **+ addytywna kolumna `module_id` (nullable FK)** — sesja egzaminu musi mieć adres
  modułu; **partial unique `(student_id, kind) WHERE in_progress` rozszerzony
  o module_id** dla kind='module_exam' (inaczej test-out koliduje z otwartym
  egzaminem innego modułu).
- **Tutor C11:** wypełnienie `moduleTheory` w trasie (stub gotowy — D5b).
- **Skill-map:** curriculum = przyszłe źródło krawędzi prerekwizytów — **jawnie
  ODROCZONE do po pilotażu**.
- **Bank pytań A5:** `questionConcepts`/`questionItems` = jedyne źródło pytań;
  warianty egzaminacyjne (cap 2) w 1E.2/1E.3.
- **Rejestr flag:** `FLAG_CURRICULUM_PATH`; wpisy rls-matrix przy 1E.1.

### D10 · Zakres pilotażu i cięcia

- **Tylko DS, drabina LINIOWA [ZAKRES ZATWIERDZONY ZE ZMIANĄ — Darek 2026-07-11:
  4 capstone'y]:** **L0 Start (lean)** → **F1 Python I** → **F2 Python II** →
  **F3 Dane w Pythonie** (zwieńczony **MINI-PROJEKTEM transferowym** — pkt 12b:
  lekki projekt weryfikowany automatycznie, pierwsza samodzielna praca przed
  pełnym capstone'em) → **M-EDA** (capstone: `ds-eda-polska-w-liczbach-bdl`)
  → **M-SQL** (capstone: `ds-sql-analiza-przejazdow`) → **M-ML** (capstone:
  `ds-pierwszy-model-predykcyjny`) → **M-LLM** (capstone:
  `ds-llm-strukturalna-ekstrakcja`). **8 modułów, 4 capstone'y** — dodane dwa
  pozostałe projekty poziomu L1 (kolejne w naturalnej drabinie partii; projekty
  L2+ jak Databricks/chmura wymagają kont zewnętrznych — poza pilotem);
  finalny podział atomów = Sophia w 1E.2/1E.5.
- **Wymóg audytu pojemności (kontrakt-test na treści, przez
  `curriculum_item_concepts`):** lista konceptów wymaganych przez rubrykę capstone'u
  MINUS koncepty pokryte atomami drabiny **= 0** — bez tego M-SQL nie pomieści drogi
  „czym jest tabela"→„funkcje okna wymagane rubryką" (znalezisko przeglądu), a M-EDA
  nie pokryje API/JSON. Jeśli bilans nie wychodzi w 5–6 atomach — moduł dzielony
  albo rubryka capstone'u zmiękczana (decyzja treściowa Sophii, nie kod).
- **Pierwsza sesja (twardy wymóg):** atom 1–2 modułu L0 kończy się URUCHOMIENIEM
  gotowej komórki w Colab (jeden klik), **≤15 min od wejścia na ścieżkę**; pierwszy
  wieczór = „komputer wykonał mój kod", nie „dobrze odpowiedziałem na quiz
  o notebooku". Prerekwizyty kont (Google) jawnie w onboardingu ścieżki.
- **Pilot ≤12 tygodni** — jako rama MIERZALNOŚCI (M7 — moderator opisowy, nie dowód
  „krótsze uczy lepiej"); target = studenci bez doświadczenia (M4); próg zdrowego
  użycia ~30 min/tydz. jako referencja (M11). Kalendarz orientacyjny przy tempie
  kuratorki 12–15 h/tydz.: treść X–XI 2026 → pilot I–II 2027. **Konkurs EduTech
  Masters WYGRANY (decyzja Darka 2026-07-11: deadline usunięty z dokumentów)** —
  tempo dyktuje wyłącznie przepustowość Sophii i jakość, nie data zewnętrzna;
  rachunek wolumenu z D1 pozostaje wiążący jako miara wykonalności.
- **Cięcia:** bez UI autorskiego; FSRS = rezerwacja (algorytm 1E.4); bez multi-tenant
  wariantów; pretest jako przełącznik eksperymentu, domyślnie OFF (pkt 8 ✅);
  skill-map bez zmian; komunikacja liczb efektów zakazana do własnych danych
  (M2, P7). **Fading adaptacyjny i weryfikacja automatyczna kamieni/labów
  W ZAKRESIE od razu** [decyzje Darka pkt 5/11: implementacja docelowa, bez
  rozdzielania pilot/po-pilocie] — koszt inżynieryjny (checki, reguły fadingu,
  reuse sandboxa 1.9) wyceniany przy atomizacji 1E.1/1E.6.
- **Po pilocie, przed E2.C (warunek skali — z przeglądu):** tooling treści
  (generator wariantów pytań z human review, automat maskowania linii WE→completion,
  automat link-check) + współdzielenie modułów fundamentów przez
  `curriculum_path_modules` — bez tego 21 ścieżek ≈ 4 200 h ręcznej kuracji (fikcja).

### D11 · Metryki sukcesu / bezpieczniki churnu

Deterministyczne, z `curriculum_item_answers` + progress (0 LLM):

- **Drop-off per pozycja** (ukończył k, nie zaczął k+1) — pierwszorzędna metryka
  „za duży krok"; krzywa ukończeń modułu.
- **Czas-na-atom / czas-na-pytanie** (>2× mediana = flaga); kompozyt przeciążenia:
  czas + błędy + hint-depth (+ opcjonalny 1-tap po atomie — **adaptacja własna
  5-punktowa skali Paasa**, C15 z errą; pełny kwestionariusz Leppink tylko do
  audytów czerwonych flag — C16).
- **Success rate 1. próby per atom** — cel ~80–90% (R16); alert <70% (za trudne)
  i >95% (za płytkie — testing effect znika).
- **% zdanych egzaminów za 1. podejściem** (nowa — konsekwencja matematyki progu
  z D3) z alertem; osobna kalibracja pytań egzaminacyjnych monitorowana.
- **Odsetek retrievalu odroczonego vs natychmiastowego** (nowa — bezpiecznik przeciw
  „przemyceniu łatwości": pilnuje, by pytania spiralne i przeglądy przed egzaminem
  realnie występowały, nie tylko izomorficzne MC po teorii).
- **Licznik wheel-spinning** (M13): ≥2 oblane egzaminy modułu = alarm → correctives
  + przegląd treści; ~10 nieudanych prób konceptu = sygnał twardy.
- **Sygnały utknięcia:** dno drabinki hintów, eskalacje „utknąłem" (ledger),
  powtórzone błędy; kamienie milowe projektu bez postępu >X dni.
- **Retencja rytmu:** streak ≥7 dni (G3 — leading indicator, KORELACJA;
  **anty-Goodhart: optymalizowanie streaka nie jest celem — interpretować wyłącznie
  łącznie z metrykami opanowania G9**), aktywny tydzień 2/4/8 (M16), % opanowania
  modułu z DOWODÓW (G8).
- **Miara zewnętrzna (M5, M17):** ukończony capstone (istniejący pipeline) jako
  test transferu — % zdanych egzaminów NIE wystarcza.
- **Koszt:** LLM tylko w eskalacjach tutora + mostki build-time (D5) — widoczne
  w `ai_usage_ledger`; pętla nauki = 0 LLM.
- **Utrzymanie:** linia `verifiedAt` (ręcznie ~2–4 h/kwartał/ścieżkę do czasu
  automatu — D4).

## Alternatywy rozważone

| Opcja | Werdykt |
|---|---|
| Supersede 10 projektów (przepisanie od zera) | ODRZUCONE — audyt: dobre rdzenie bez ramp; reuse-as-capstone + atomy wokół (D4) |
| Bramka procentowa na poziomie atomu | ODRZUCONE — przy 1–5 pytaniach % to szum; licznik (M10) |
| Egzamin „12 pytań / próg 90%" | ODRZUCONE po przeglądzie — arytmetyka: 90% przy 12 nieosiągalne dokładnie, 1 lapsus oblewa; 15–20 pytań + licznik błędów (D3) |
| Warianty pytań na poziomie atomu | ODRZUCONE po wecie content-ops — nielimitowane próby chronią; warianty tylko na egzaminie (cap 2) |
| Kary za błędy w atomach (hearts Duolingo) | ODRZUCONE — monetyzacja sprzeczna z pedagogiką (G4); przejęta tylko „droga powrotu przez praktykę" |
| Productive failure / problem-first dla zera | ODRZUCONE na wejściu (C14, R19); parametr A/B pretestu (R12) |
| Harmonogram powtórek expanding | NIEPOTRZEBNE — równomierny nie ustępuje (R9) |
| Blokada na poziomie pozycji (twarde bramki między atomami) | ODRZUCONE — sekwencja bez bramek %; twarde bramki na module (D3) |
| DAG prerekwizytów w pilocie | ODRZUCONE dla pilotażu — model dopuszcza, pilot = łańcuch |
| `pathKey` na module (moduł należy do 1 ścieżki) | ODRZUCONE po przeglądzie — blokuje współdzielenie fundamentów (30–40% wolumenu); M:N `curriculum_path_modules` od 1E.1 (D2) |
| Rozszerzenie `project_learning_resources` na pozycje modułów | ODRZUCONE — projectId NOT NULL (nie-addytywne); nowa `curriculum_item_resources` (D2) |
| UI autorskie treści (CMS) | ODRZUCONE dla pilotażu — JSON + ingest + kontrakt-test |
| LLM w pętli nauki | ODRZUCONE — static-first; wyjątki jawne: eskalacja tutora (runtime) + mostki 1E.5 (build-time, cache, ledger) |
| Wariant B wyjaśnień dla wszystkich atomów z góry | ODRZUCONE po wecie — tylko koncepty z alarmem D11, reaktywnie (D5) |
| Pełna remediacja ~86,5 h przed startem pilotażu | DO DECYZJI (pkt 4) — rekomendacja: sekwencjonowana (pilot-path ~18,5 h przed, reszta po); pełna = start pilotażu przesuwa się o ~4–6 tygodni |
| Ukryta drabina | ODRZUCONE — widoczna-ale-zablokowana + test-out (D3) |
| „Naukowe 25 minut" jako interwał sesji | ODRZUCONE — P5/P6 mity; sesja = 2–4 atomy, parametry strojone (D1) |

## Do decyzji Darka i Sophii (lista finalna v0.2)

1. **Próg mastery egzaminu** — **✅ ZATWIERDZONE (Darek, 2026-07-11) wg
   rekomendacji:** licznik błędów na egzaminie 15–20 pytań (≤1/15 lub ≤2/20 ≈ 90%),
   parametr per moduł; pytania egzaminacyjne kalibrowane osobno (wyższy success
   rate niż atomowe). Wejście liczbowe: przy p=0,85 i sztywnym 90%/12 aż ~56%
   oblewałoby 1. podejście.
2. **Zaliczenie pozycji projektowej** — **✅ ZATWIERDZONE (Darek, 2026-07-11) wg
   rekomendacji: wariant C** — `submitted` odblokowuje następny moduł, `verified`
   = warunek receiptu w Passporcie (dwie waluty G9; usuwa martwą ciszę vivy
   w szczycie motywacji).
3. **UX drabiny** — **✅ ZATWIERDZONE (Darek, 2026-07-11) wg rekomendacji:**
   widoczna-ale-zablokowana + test-out (D3).
4. **Zakres remediacji przed startem** — **✅ ZATWIERDZONE (Darek, 2026-07-11) wg
   rekomendacji: sekwencjonowana.** Po decyzji o 4 capstone'ach: pilot-path
   ~36,5 h przed startem (ds-eda, ds-sql, ds-pierwszy-model, ds-llm); pozostałe
   6 projektów (~50 h) po starcie.
5. **Warstwy pomocy** — **✅ ZATWIERDZONE ZE ZMIANĄ (Darek, 2026-07-11): BEZ
   rozdzielania pilot/po-pilocie — implementacja od razu docelowa.** Zestaw:
   (a) statyczna + (b) kontekst tutora + (c) „utknąłem" z polem błędu i odrębną
   pulą limitów dla projektów/labów; strony „pierwszej pomocy środowiskowej";
   **fading adaptacyjny od razu** (reguły deterministyczne — D5).
6. **Parametry rozmiaru kroku (startowe, strojone D11)** — **✅ ZATWIERDZONE
   (Darek, 2026-07-11) wg rekomendacji:** teoria 300–600 słów; 3 pytania MC/atom
   (bez wariantów); moduł 5–6 atomów + egzamin; sesja 2–4 atomy; sukces 1. próby
   80–90% na atomach, wyżej na egzaminie. Stawka kuratorska po pkt 13:
   2,8–4,1 h/atom, moduł 19–31 h (D1). Wykonalność = sign-off Sophii.
7. **Zakres i kalendarz pilotażu** — **✅ ZATWIERDZONE ZE ZMIANĄ (Darek,
   2026-07-11): 4 capstone'y** — 8 modułów (L0 lean, F1–F3 + mini-projekt po F3,
   M-EDA, M-SQL, M-ML, M-LLM), ścieżka krytyczna treści **~200–285 h** (po
   wszystkich decyzjach: 4 capstone'y + pełne drabinki + mini-projekt) →
   orientacyjnie treść I kw. 2027, pilot wiosna/lato 2027. Konkurs wygrany,
   deadline usunięty — tempo dyktuje przepustowość Sophii; kalendarz to prognoza
   wykonalności, nie przymus. **Wykonalność ~200–285 h = główny punkt sign-offu
   Sophii.**
8. **Pretest „zgadnij zanim przeczytasz"** — **✅ ZATWIERDZONE (Darek, 2026-07-11)
   wg rekomendacji:** parametr eksperymentu, domyślnie OFF (R12 vs C14/G10).
9. **Umiejscowienie terminala i Gita** — **✅ ZATWIERDZONE (Darek, 2026-07-11):
   wariant (b) just-in-time** — L0 uczy tylko Colab/notebook; Git/terminal wchodzą
   atomami tuż przed pierwszym capstone'em (M-EDA), gdzie są realnie potrzebne.
10. **Forma zaliczenia L0** — **✅ ZATWIERDZONE (Darek, 2026-07-11) wg
    rekomendacji: przez wykonanie** (uruchomiony skrypt jako dowód, bez egzaminu MC).
11. **Typ `lab` + rygor kamieni milowych** — **✅ ZATWIERDZONE ZE ZMIANĄ (Darek,
    2026-07-11): WERYFIKACJA AUTOMATYCZNA, bez rozdzielania pilot/po-pilocie —
    implementacja od razu docelowa.** Deterministyczne checki labów i kamieni
    (reuse sandboxa 1.9 tam, gdzie trzeba uruchomić kod); definicja checków
    per lab/projekt przy atomizacji 1E.1/1E.6 (koszt inżynieryjny tam wyceniony).
12. **Transfer w fundamentach (luka M17)** — **✅ ZATWIERDZONE (Darek, 2026-07-11):
    wariant (b) — MINI-PROJEKT po F3** (lekki, weryfikowany automatycznie;
    ~10–15 h treści doliczone w D1); egzaminy F1–F3 pozostają MC, wykonanie
    trenują laby.
13. **Głębokość drabinki hintów** — **✅ ZATWIERDZONE (Darek, 2026-07-11):
    3 stopnie WSZĘDZIE — maksymalna siatka bezpieczeństwa** (koszt +0,3–0,6 h/atom
    doliczony w D1; opcja F przeglądu content-ops odrzucona).

## Weryfikacja (kryteria „zrobione" spike'a — z planu 1E.0)

1. Tabela syntezy: 71 unikalnych ustaleń z rangami + errata po przeglądzie
   (`research-kognitywistyka-1e0.md`); indeks D→ID zaudytowany (M1/P4/M6/G3
   wpięte, duplikat P3≡R10 scalony, G11/R21 dodane); mechanizmy D1/D3/D5/D6/D8/D11
   cytują ID; wpisy bez dowodu = PRECEDENS-INŻ.
2. Mapa luk: 10/10 projektów, 54/54 URL-e (HTTP + dopasowanie + język), wycena
   w godzinach — `audyt-ds-partia-1-luki.md`.
3. ADR-014 v0.2: komplet D1–D11; sweep zgodności 1E.1–1E.7 wykonany soczewką
   architektury (wszystkie zadania znajdują haki; sprzeczność z 1E.5 rozwiązana
   jawnym wyjątkiem build-time w D5; 1E.2 „wspólny trzon" zrealizowany przez M:N
   w D2); alternatywy w tabeli Opcja|Werdykt; Przebieg z liczbami znalezisk.
4. Lista „Do decyzji Darka i Sophii" — 13 punktów, każdy z rekomendacją i kosztem
   alternatywy.
5. Zero zmian w `src/`, `drizzle/`, `tools/` — spike wyłącznie dokumentowy.
