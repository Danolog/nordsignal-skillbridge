# Plan 13 — Pakiety MIS („Make It Stick")

> Źródło: dokument Darka „Od nauki o uczeniu się do produktu: SkillBridge"
> (Google Docs, 2026-07) — 9 propozycji ulepszeń opartych na „Make It Stick"
> + koncepcja „Paszport Kompetencji 2.0" (świeżość / kalibracja / transfer).
> Ten plik jest wynikiem porównania dokumentu z roadmapą v3
> (`11-roadmap-fazy-0-3.md`) i ADR-014/015: pakiety MIS pokrywają WYŁĄCZNIE
> luki — nie dublują 1E.3/1E.4 i nie wchodzą na ścieżkę krytyczną
> (flaga L0 → notebooki F1 → dług 6 labów → 1E.3 → 1E.4 → 1E.5 → 1E.7).
> Jedyny twardy warunek kolejności: **MIS.1 przed 1E.4**.

## 1. Decyzje Darka (2026-07-21, wiążące)

1. **„Najpierw próba": trzymamy ADR-014 D1** — worked example zostaje przed
   pierwszym pytaniem nowicjusza (expertise reversal effect). Efekt generowania
   wdrażamy tam, gdzie badania go popierają: pre-testy przed projektami (MIS.4),
   powtórki FSRS (1E.4), fading (D5). Zero re-ingestu treści.
2. **Sekwencja: quick-winy równolegle** — MIS.7 / MIS.1 / MIS.3 od zaraz
   (małe PR-y poza ścieżką krytyczną); reszta wpleciona w 1E.3/1E.4.
3. **Paszport 2.0: najpierw prywatnie** — wskaźniki świeżości/kalibracji/
   transferu tylko w widoku studenta (dashboard); do publicznego paszportu
   osobną decyzją po pilotażu (osobna flaga).

Przyjęte defaulty (do nadpisania przy implementacji, jeśli Darek zdecyduje
inaczej): pewność = 3 przyciski „Zgaduję / Chyba wiem / Jestem pewny" (nie
suwak), obowiązkowa przy fladze ON; pre-test informacyjny, nie bramkujący;
metryki najpierw jako skrypt raportowy (bez UI); Feynman jako wariant tutora C11.

## 2. Mapowanie 9 propozycji dokumentu → stan

| # | Propozycja | Stan |
|---|---|---|
| 1 | Praktyka przywołania | ✅ atomy 3×MC (1E.2 LIVE); mikro-quizy sesyjne = 1E.4; **luka: pre-testy przed projektami → MIS.4** |
| 2 | Praktyka rozłożona | ✅ zaplanowane 1E.4 (FSRS > sztywny harmonogram); **luka: świeżość w Paszporcie → MIS.3** |
| 3 | Przeplatanie | ✅ w powtórkach (ADR-014 R15 / 1E.4); **luka: w doborze projektów → MIS.5** |
| 4 | Generowanie i trudności | rozstrzygnięte decyzją 1 (ADR-014 D1 zostaje); „projekty powyżej poziomu" = matchmaker + E2.G |
| 5 | Elaboracja (Feynman) | **luka → MIS.6** |
| 6 | Refleksja | ✅ istnieje (`project_reflections`, B5); opcjonalnie 4. pytanie — patrz MIS.7 |
| 7 | Kalibracja | **luka → MIS.1 + MIS.2** |
| 8 | Transfer ≥2 konteksty | dane są (`verified_competencies`); **luka: ekspozycja → MIS.3** |
| 9 | „Jeszcze nie" | ✅ rdzeń jest (`item-runner.tsx`); **domknięcie: audyt copy → MIS.7** |

## 3. Pakiety robocze

### MIS.1 · Sonda pewności przed odpowiedzią (#7a) — P1, PRZED 1E.4
- **Zakres:** przy fladze ON student przed „Sprawdź" wybiera pewność
  (3 przyciski, obowiązkowe); zapis append-only obok `hintDepth`.
- **DB:** migracja addytywna — `curriculum_item_answers.confidence smallint NULL`
  + `CHECK (confidence BETWEEN 1 AND 3)` (wzorem
  `curriculum_item_answers_hint_depth_range`). NULL = sprzed flagi.
- **Pliki:** `src/lib/db/schema.ts`,
  `src/app/api/curriculum/items/[id]/answer/route.ts` (walidacja + zapis w tej
  samej transakcji), `src/components/curriculum/item-runner.tsx`.
- **Flaga:** `FLAG_CONFIDENCE_PROBE` (`src/lib/flags.ts` + `.env.example`).
- **Testy:** unit walidacji payloadu; integration answer route; regresja:
  flaga OFF → stary payload przechodzi, kolumna NULL.
- **Dowód:** odpowiedź z pewnością w DB; flaga OFF = UI/API identyczne jak dziś.
- **Koordynacja:** te same pliki co naprawa długu hintów (`item-runner.tsx` —
  hinty w propsach, hintDepth zaniżalny). MIS.1 jako osobny mały PR, naprawa
  hintów tuż po — obie rzeczy muszą wejść przed 1E.4 (FSRS konsumuje
  `confidence` + `hintDepth` jako cechy).

### MIS.2 · Wskaźnik rozjazdu pewność–wynik (#7b) — P2, po MIS.1 + ~2 tyg. danych
- **Zakres:** czysta funkcja agregująca (0 LLM): accuracy per poziom pewności;
  rozjazd = odsetek błędnych wśród „Jestem pewny" + poprawnych wśród „Zgaduję".
  Widget w widoku drabiny/dashboardu (prywatny; mikrocopy w duchu ADR-014 D6
  pkt 8 — bez zawstydzania), później ew. sekcja faculty.
- **Pliki (nowe):** `src/lib/curriculum/calibration.ts` + widget w UI drabiny.
  **DB:** brak.
- **Flaga:** ta sama `FLAG_CONFIDENCE_PROBE`; widget dopiero przy ≥20
  odpowiedziach z confidence (próg w kodzie).
- **Testy:** unit na fixture (brzegi: brak danych, same NULL); integration.
- **Dowód:** student „pewny+błędny" widzi rozjazd; student z <20 odpowiedziami
  nie widzi nic.

### MIS.3 · Paszport 2.0 — świeżość + konteksty (#2b, #8) — P1, równolegle od zaraz
- **Zakres:** ekspozycja danych już obecnych w `verified_competencies`:
  per kompetencja `MAX(verifiedAt)` → badge świeżości (progi startowe:
  <90 dni świeża / 90–180 starzejąca się / >180 do odświeżenia) oraz
  `COUNT(DISTINCT submissionId)` → „potwierdzona w N kontekstach", status
  „ugruntowana" przy ≥2. **Wyłącznie widok prywatny**
  (`src/app/(dashboard)/passport/page.tsx`) — decyzja 3; publiczny
  `src/app/passport/[id]/page.tsx` bez zmian.
- **Pliki:** `src/lib/passport-verified.ts` (rozszerzyć odczyt do
  `groupBy(competencyName)` z `max(verifiedAt)` i `countDistinct(submissionId)`),
  widok prywatny paszportu, komponenty `src/components/passport/`.
  **DB:** brak migracji.
- **Flaga:** `FLAG_PASSPORT_FRESHNESS` (sensowna tylko przy
  `FLAG_PASSPORT_VERIFIED_ONLY=1` — na prodzie już ON).
- **Testy:** unit agregacji; integration — kompetencja z 2 submisji →
  „2 konteksty"; E2E publicznego paszportu bez regresji.
- **Dowód:** prywatny paszport pokazuje datę ostatniego potwierdzenia i licznik
  kontekstów; 1 kontekst ≠ „ugruntowana"; publiczny paszport niezmieniony.
- **Follow-up MIS.3b (po 1E.4, nie projektować teraz):** zaliczona powtórka
  FSRS konceptów kompetencji odświeża świeżość (ew. pole `refreshedAt` — wtedy
  jedyna dodatkowa migracja).

### MIS.4 · Pre-test przed projektem (#1b) — P2, spięte z 1E.3
- **Zakres:** przed odsłonięciem briefu quiz 5–8 pytań z konceptów wymaganych
  przez projekt (bank pytań 1E.2, reuse silnika `src/lib/assessment/` —
  selekcja po konceptach zamiast adaptacji). Wynik **informacyjny, nie
  bramkujący**; po quizie sugestia powtórki słabych konceptów. Koszt LLM = 0.
- **DB:** rozszerzenie `assessment_sessions.kind` o `'project_pretest'` —
  dokleić do tej samej migracji, którą 1E.3 robi dla `'module_exam'`
  (jedna migracja, dwaj konsumenci).
- **Pliki:** nowa trasa `src/app/api/projects/[id]/pretest/route.ts`; gate
  w trasie briefu (przy fladze ON brief po pre-teście); UI w
  `src/app/(dashboard)/projects/[id]/page.tsx`.
- **Flaga:** `FLAG_PROJECT_PRETEST`.
- **Testy:** integration — brief odsłaniany po pre-teście przy fladze ON;
  flaga OFF = zero zmian (regresja na istniejących testach briefu); unit
  selektora pytań.
- **Dowód:** sesja `project_pretest` z odpowiedziami w DB; 0 wywołań LLM.

### MIS.5 · Przeplatanie w doborze projektów (#3) — P3, po 1E.4/MIS.3
- **Zakres:** deterministyczny bonus w scoringu `src/lib/ai/match-projects.ts`
  dla projektów pokrywających 1–2 kompetencje już potwierdzone
  (z `verified_competencies`) OBOK nowych; w `src/lib/ai/generate-brief.ts`
  instrukcja promptu: wpleć 1 wcześniejszą kompetencję studenta. Synergia
  z MIS.3: drugi projekt z tą samą kompetencją = drugi kontekst = transfer.
- **DB:** brak. **Flaga:** `FLAG_INTERLEAVED_PROJECTS`.
- **Testy:** unit — „1 stara + nowe" wygrywa z „same nowe" i „same stare";
  snapshot promptu.
- **Dowód:** deterministyczna część scoringu przetestowana bez LLM; delta
  dopasowania raportowana w PR.

### MIS.6 · Tryb Feynmana — wariant minimalny (#5) — P3, po 1E.4
- **Zakres:** wariant promptu tutora sokratycznego (C11, za
  `FLAG_SOCRATIC_TUTOR`): po zaliczeniu modułu / z widoku powtórek wejście
  „Wyjaśnij to komuś, kto zaczyna" — tutor odgrywa początkującego, dopytuje,
  na końcu wskazuje 1–2 luki w wyjaśnieniu. Zapis w istniejących sesjach
  tutora, koszt w `ai_usage_ledger`. Świadomie BEZ: nowego `kind` pozycji,
  oceny w review queue, wpływu na mastery — to eksperyment.
- **Flaga:** `FLAG_FEYNMAN_MODE` (wymaga `FLAG_SOCRATIC_TUTOR`).
- **Testy:** unit kontraktu promptu (tutor nie wykłada, dopytuje); integration
  z mockiem LLM; koszt w ledger.
- **Dowód:** sesja Feynmana z transkryptem i kosztem w ledger; flaga OFF =
  brak punktu wejścia.

### MIS.7 · Audyt mikrocopy growth-mindset (#9 — domknięcie) — P2, od zaraz
- **Zakres:** sweep po komunikatach negatywnych:
  `src/components/review/review-queue-view.tsx` („Odrzucono." — kluczowy jest
  komunikat widziany przez STUDENTA po decyzji),
  `src/components/curriculum/lab-stamp.tsx`,
  `src/components/projects/viva-panel.tsx`, komunikaty pipeline'u oceny;
  grep całości po `Błąd|Błędna|Odrzucono|Niepoprawna|Nie zdałeś`. Wzorzec tonu
  już ustalony w `item-runner.tsx` („Jeszcze nie — spróbuj ponownie", „Błędna
  odpowiedź nic nie psuje"); zgodnie z ADR-014 R17 i D6 pkt 8 (bez mitów;
  „jeszcze nie" + konkretny następny krok). Opcjonalnie w tym samym PR:
  4. pytanie retrospektywy „Co następnym razem zrobisz inaczej?"
  w `project_reflections`/`ReflectionForm.tsx` (jeśli tak → mała migracja
  addytywna, kolumna NULL-owalna).
- **DB/flaga:** brak (czysty copy; wyjątek: 4. pytanie).
- **Testy:** aktualizacja asercji tekstów.
- **Dowód:** tabela „przed/po" wszystkich stringów w opisie PR.

### MIS.8 · Metryki uczenia — dwie transze
- **Transza A (po MIS.1+MIS.3):** kalibracja + transfer.
  **Transza B (po 1E.4):** retencja 30/90 dni.
- **Zakres:** `src/lib/metrics/learning-metrics.ts` (czyste zapytania Drizzle,
  0 LLM) + na start skrypt `scripts/report-learning-metrics.ts` (bez UI;
  sekcja faculty ew. później).
- **Definicje:**
  - *Kalibracja:* z `curriculum_item_answers` — `GROUP BY confidence:
    AVG(is_correct), COUNT(*)`; overconfidence = odsetek błędnych przy
    `confidence=3`; trend: malejący rozjazd w kohortach tygodniowych.
  - *Retencja 30/90:* poprawność pierwszej powtórki FSRS w oknie 30±7 / 90±14
    dni od opanowania (źródło: tabela stanu/log FSRS z 1E.4; fallback przed
    FSRS: `curriculum_item_answers` JOIN bank pytań po `answeredAt` — indeks
    `(student_id, answered_at)` już jest).
  - *Transfer:* `COUNT(DISTINCT submission_id) per competency_name`
    z `verified_competencies`; metryka = odsetek kompetencji z ≥2 kontekstami
    (ta sama funkcja zasila badge MIS.3).
  - *Sygnał rynkowy:* istniejące verified × `demandPercentage`; po MIS.3
    raportować popyt osobno dla „ugruntowanych" vs 1-kontekstowych.
- **Testy:** unit na fixture; integration zapytań.
- **Dowód:** raport liczy się na danych prod bez timeoutu.

## 4. Sekwencja (względem ścieżki krytycznej — nie rusza jej)

```
RÓWNOLEGLE OD ZARAZ:      MIS.7 → MIS.1 → MIS.3   (3 małe PR-y + naprawa hintów po MIS.1)
PO ~2 TYG. DANYCH MIS.1:  MIS.2, MIS.8-A
PRZY 1E.3:                MIS.4 (wspólna migracja assessment_sessions.kind)
PO 1E.4:                  MIS.3b, MIS.8-B, MIS.5, MIS.6
```

Jedyny twardy warunek kolejności: **MIS.1 (+ naprawa hintDepth) przed 1E.4** —
FSRS ma mieć cechy `confidence`/`hintDepth` wiarygodne od startu, a dane
kalibracyjne mają zbierać się od pierwszych realnych studentów.

## 5. Czego NIE robimy (pokryte istniejącym planem)

- Mikro-quizy sesyjne i harmonogram powtórek → **1E.4** (FSRS + widok
  „dzisiejsze powtórki" w check-inach 1.18). Nie budować osobnego mechanizmu.
- Przeplatanie w teorii → ADR-014 R15 (część 1E.4).
- „Najpierw próba" globalnie → odrzucone (decyzja 1, ADR-014 D1).
- Retrospektywa → istnieje (B5); miara transferu przez dedykowany projekt →
  mini-projekt po F3 (ADR-014).
- Rdzeń „jeszcze nie" → istnieje; streak z dniem łaski → ADR-014 D6 pkt 7.
- Pełny FSRS / golden testy / koncepty z receiptów w kolejce powtórek →
  **1E.4 bez zmian**.

## 6. Weryfikacja

Per PR: pełna bramka lokalna (`pnpm build` + `pnpm lint` 0 warn +
`pnpm test:run` + integration na :5433 gdzie dotyczy) i CI. Migracja
`confidence` na prod wg wzorca: backup gałęzią Neona → migrate DIRECT →
weryfikacja. Funkcjonalnie: MIS.1/2 — odpowiedź w drabinie z flagą ON/OFF
na :5433 (konto e2e); MIS.3 — student z 2 submisjami verified widzi
„2 konteksty" prywatnie, publiczny paszport bez zmian; MIS.4 — brief po
pre-teście przy fladze ON; wszystkie flagi startują OFF na prodzie
(deploy ≠ release).
