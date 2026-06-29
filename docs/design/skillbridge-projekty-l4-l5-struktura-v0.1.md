# SkillBridge — struktura danych pod projekty L4/L5 (referencja profesjonalisty + benchmark)

**Wersja:** v0.1 · 2026-06-29 · autor: Ethan (CTO), wsparcie Leo (Tech Lead)
**Status:** DOKUMENT DESIGNOWY — do recenzji Leo i decyzji Darka. **Zero kodu, zero zmian schemy, zero dotykania produkcji.** To plan, nie wykonanie.
**Kontekst:** rozszerzenie struktury zapowiedziane we frameworku E3 (`docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`, §3 i §10). Dziś tabela `projects` nie umie przechować realnego projektu profesjonalisty ani mechanizmu porównania.

---

## 0. Słowniczek (żargon tłumaczony przy pierwszym użyciu)

Darek nie jest deweloperem — żeby świadomie zaakceptować ten design, musi rozumieć każdy termin. Tłumaczenia:

- **tabela** — arkusz danych w bazie; jeden wiersz = jeden obiekt (np. jeden projekt).
- **kolumna** — pojedyncze pole w wierszu (np. tytuł projektu).
- **tabela satelicka** — osobna tabela „doczepiona" do głównej (tu: do `projects`) przez wskaźnik `project_id`; trzyma dane, które nie pasują wprost do głównej tabeli.
- **nullable** (kolumna „pusta-dozwolona") — kolumna, która może nie mieć wartości (NULL = „brak danych"). Kluczowe dla wstecznej zgodności: stare wiersze po prostu mają NULL.
- **wsteczna zgodność** — zmiana nie psuje tego, co już działa; istniejące projekty L1–L3 zachowują się dokładnie jak dziś.
- **migracja schemy** — kontrolowana zmiana struktury bazy (dodanie tabeli/kolumny), zapisana w numerowanym pliku (`drizzle/00NN_*.sql`).
- **upsert keyed-by-slug** — „wstaw albo zaktualizuj po `slug`": narzędzie zaciągu rozpoznaje projekt po unikalnym `slug` (czytelny identyfikator, np. `cyber-siem-pierwsze-alerty-splunk`), nie po losowym `id`. Ponowne uruchomienie nie duplikuje danych (idempotencja).
- **idempotentny** — bezpieczny do powtórzenia: drugie i kolejne uruchomienia dają ten sam stan, nie dokładają śmieci.
- **replace-per-projekt** — przy aktualizacji jednego projektu narzędzie kasuje jego stare wiersze potomne (`DELETE … WHERE project_id = …`, **zawsze z warunkiem WHERE**) i wstawia nowe. Nigdy `DELETE` bez WHERE.
- **rubryka** (`rubricJson`) — lista kryteriów oceny z wagami sumującymi się do 100; AI ocenia zgłoszenie wg tych kryteriów.
- **jsonb** — typ kolumny przechowujący ustrukturyzowane dane (listę/obiekt) w jednym polu; tak dziś trzymamy `rubricJson` i `aiReviewJson`.
- **RLS** (Row-Level Security, bezpieczeństwo na poziomie wiersza) — reguły bazy mówiące, kto które wiersze widzi. `app_student` = rola bazodanowa studenta, `app_faculty` = rola wykładowcy.
- **K-PUB** — wewnętrzna klasa danych: „globalny katalog, nie dane studenta" (np. `projects`, `project_competencies`); każdy zalogowany może czytać.
- **PII** (Personally Identifiable Information) — dane osobowe pozwalające zidentyfikować człowieka (imię, e-mail, identyfikator pracownika).
- **HITL** (Human-in-the-loop) — człowiek w pętli decyzyjnej; w SkillBridge ostatnie słowo w istotnej ocenie ma człowiek (wykładowca — dopiero po walidacji produktu).

---

## 1. Czego wymaga framework (§3 E3) i czego dziś brakuje

L4/L5 to **realne projekty, które profesjonaliści już wykonali dla prawdziwych firm**. Student robi taki projekt sam, a jego wynik **zestawiamy z wynikiem profesjonalisty** (benchmark — punkt odniesienia). To klasa „dowód biegłości", nie ćwiczenie.

Żeby to było możliwe, baza musi umieć przechować dwie rzeczy, których dziś nie ma:

1. **Referencyjny wynik profesjonalisty** — opis realnego projektu, artefakt/wynik osiągnięty przez zawodowca, metryki referencyjne („co znaczy dobry wynik").
2. **Mechanizm porównania (benchmark)** — jak zestawić wynik studenta z referencją: wymiary porównania i progi „dorównał / zbliżył się / poniżej".

Stan zastany (fakty ze zwiadu kodu):

- Enum poziomów `project_level` **już dopuszcza L1–L5** (`src/lib/db/schema.ts:95`) — nie trzeba go ruszać.
- Tabela `projects` (`schema.ts:276`) ma: `slug`, `title`, `description`, `level`, `estimatedHours`, `sourceType`, `sourceUrl`, `theoryMd`, `rubricJson`, `status`. **Nie ma niczego o referencji profesjonalisty.**
- Tabele satelickie projektu: `project_competencies` (kompetencje wymagane/nabyte), `project_learning_resources` (materiały), `project_source_links` (linki źródła), `project_submissions` (zgłoszenia studenta), `project_reflections` (prywatne refleksje). Żadna nie trzyma referencji.
- Ocena: `src/lib/ai/review-submission.ts` ocenia zgłoszenie wyłącznie wg `rubricJson` (kryteria + wagi). **Nie zna pojęcia „porównaj z profesjonalistą".**
- Zaciąg treści: `tools/content-cyber-projects.ts` robi upsert keyed-by-slug; jego walidator **na twardo dopuszcza tylko `level` ∈ {L1,L2,L3}** (`PROJECT_LEVELS`, linia 52) i tylko `sourceType` ∈ {open_data, oss} (linia 55). To trzeba będzie rozszerzyć.

### ⚠ Krytyczne odkrycie — ryzyko wycieku referencji

Trasa `GET /api/projects/[id]/route.ts` (linia 66) zwraca do przeglądarki studenta `...project` — **cały rekord projektu**. Gdyby referencja profesjonalisty (opis wzorcowego wyniku, metryki) była **kolumną w `projects`**, wyciekłaby studentowi **zanim odda projekt** — czyli podpowiedź gotowej odpowiedzi. To psuje sens benchmarku (student ma osiągnąć wynik sam, nie skopiować wzorzec). To **najmocniejszy argument za osobną tabelą**, której ta trasa nie dołącza (sekcja 2).

---

## 2. Model danych referencyjnego wyniku profesjonalisty

### Rekomendacja: NOWA tabela satelicka `project_reference_solutions` (nie kolumny w `projects`)

Zgodnie ze wzorcem decyzji schematu B3/B5 (komentarze w `schema.ts:305` i `:436`: „nowa tabela, nie kolumny na współdzielonej tabeli"). Cztery powody:

1. **Bezpieczeństwo — brak wycieku.** Kolumny w `projects` wyciekłyby przez `...project` w trasie szczegółów (sekcja 1). Osobna tabela, której ta trasa **nie dołącza**, trzyma referencję poza zasięgiem studenta z definicji, a nie przez pamiętanie o whitelistowaniu pól. Bezpieczeństwo przez konstrukcję, nie przez dyscyplinę.
2. **Wsteczna zgodność za darmo.** Projekty L1–L3 **nie mają wiersza** w tej tabeli — zero NULL-i rozsianych po `projects`, zero zmiany zachowania istniejących projektów. „Brak referencji" = „brak wiersza", czytelnie.
3. **Normalizacja.** Referencja to złożony obiekt (opis + artefakt + zestaw metryk + kryteria porównania), logicznie odrębny od katalogu. Nie zaśmieca głównej tabeli pięcioma–sześcioma kolumnami używanymi tylko przez ułamek projektów.
4. **Idempotentny upsert keyed-by-slug zachowany.** Narzędzie zaciągu rozwiązuje `project_id` po `slug` (jak dziś), potem robi replace-per-projekt na satelicie (`DELETE … WHERE project_id` + `INSERT`) — dokładnie wzorzec `project_learning_resources` / `project_source_links`. Slug pozostaje jedynym kluczem idempotencji.

### Klasa danych: NIE K-PUB — to dane wewnętrzne (server-only)

Uwaga ważna dla Ryana i Leo: w odróżnieniu od `project_learning_resources` (K-PUB, czyta każdy zalogowany), referencja **nie może być czytelna dla `app_student`**. Student nie widzi wzorca przed oddaniem. Proponowana klasa: **server-only** — czyta ją wyłącznie kod serwera (ocena), żadnego `GRANT SELECT` dla `app_student` ani `app_faculty`. To deny-by-default (domyślnie brak dostępu), spójne z decyzją o `project_reflections` (grant tylko dla właściwej roli).

### Proponowane kolumny `project_reference_solutions`

Diagram jako lista kolumn z typami (jeden wiersz = referencja jednego projektu L4/L5):

```
project_reference_solutions
  id                  uuid        — klucz główny (losowy)
  project_id          uuid        — wskaźnik na projects.id (ON DELETE CASCADE);
                                    UNIQUE (jedna referencja na projekt — relacja 1:1)
  context_md          text        — opis realnego projektu i firmy, ZANONIMIZOWANY
                                    (persona zamiast nazwy firmy — patrz §6 RODO).
                                    Markdown. To student widzi PO oddaniu, w omówieniu.
  professional_outcome_md  text   — co osiągnął profesjonalista (wynik/artefakt opisowo).
                                    NIE pokazywane studentowi przed oddaniem.
  artifact_url        text        — opcjonalny link do wzorcowego artefaktu
                                    (np. publiczny raport, repo referencyjne); NULL dozwolony
  artifact_type       text        — rodzaj artefaktu (np. 'report','repo','dashboard');
                                    CHECK na liście wartości (lista miękka, nie enum Postgres
                                    — łatwiej rozszerzyć, jak przy project_learning_resources)
  benchmark_metrics   jsonb       — metryki referencyjne „co znaczy dobry wynik":
                                    lista obiektów { metric, target, unit, direction }
                                    direction ∈ {'higher_better','lower_better','match'}
                                    (np. {metric:'czas wykrycia alertu', target:5, unit:'min',
                                     direction:'lower_better'})
  comparison_criteria jsonb       — wymiary porównania wynik-studenta↔referencja
                                    (sekcja 3); lista { dimension, weight, how_to_compare }
  passing_band        text        — opcjonalny próg „zaliczenia benchmarku" dla tego projektu
                                    (np. 'zblizyl_sie'); NULL = używamy progów domyślnych
  created_at          timestamptz — znacznik utworzenia
  updated_at          timestamptz — znacznik aktualizacji (bump przy upsert)
```

Decyzja jsonb vs tabele-dzieci dla `benchmark_metrics` i `comparison_criteria`: **jsonb** — spójnie z istniejącym `rubricJson` (też jsonb, lista kryteriów). Metryki i kryteria porównania są zawsze czytane razem z referencją, nie filtrujemy ani nie sortujemy po nich w bazie → osobna tabela-dziecko byłaby nadmiarem (over-engineering). Walidator narzędzia zaciągu pilnuje ich kształtu przed zapisem (sekcja 4), tak jak dziś pilnuje sumy wag rubryki = 100.

---

## 3. Mechanizm porównania (benchmark)

### Czym L4/L5 różni się od L1–L3 w ocenie

L1–L3 (dziś): AI ocenia zgłoszenie **bezwzględnie** wg `rubricJson` → `score` 0–100. Punkt odniesienia = abstrakcyjna „dobra robota".

L4/L5 (nowe): do oceny bezwzględnej **dokładamy wymiar porównawczy** — „jak blisko wyniku profesjonalisty". Trzy pasma (bands):

- **dorównał** — wynik studenta na poziomie referencji (lub lepszy).
- **zbliżył się** — wynik niższy, ale w akceptowalnym zakresie względem referencji.
- **poniżej** — istotnie poniżej referencji.

Pasma liczone z `benchmark_metrics` i `comparison_criteria` (sekcja 2): AI dostaje referencję profesjonalisty **po stronie serwera** i ocenia różnicę (deltę) wymiar po wymiarze, agreguje do pasma.

### Gdzie to trzymać: rubricJson czy osobna struktura?

**Rekomendacja: zostawić `rubricJson` bez zmian** (kryteria + wagi działają dla wszystkich poziomów), a konfigurację porównania trzymać w `comparison_criteria` w nowej tabeli (sekcja 2). Powód: `rubricJson` jest wysyłane do AI **dla każdego projektu** i nie jest wrażliwe; gdybyśmy wcisnęli tam referencję, wyciekłaby przez tę samą ścieżkę co kryteria. Rozdzielenie „jawna rubryka" (wszyscy poziomy) od „tajna referencja + konfiguracja porównania" (tylko L4/L5, server-only) trzyma granicę wycieku czysto.

### Jak `review-submission.ts` miałby to liczyć (plan, nie kod)

1. Trasa `submit` pobiera projekt. **Jeśli `level` ∈ {L4,L5}**, dodatkowo pobiera wiersz `project_reference_solutions` po `project_id` — **po stronie serwera, nigdy do przeglądarki**.
2. `reviewSubmission(...)` dostaje dodatkowy argument: referencję (opis wyniku profesjonalisty + metryki + kryteria porównania). Dla L1–L3 argument jest pusty → zachowanie jak dziś (pełna wsteczna zgodność funkcji).
3. Prompt oceny rozszerzony o sekcję „porównaj z wynikiem profesjonalisty" — referencja wstrzyknięta jako **zaufany kontekst** (analogicznie do dzisiejszego `repoContext`), zgłoszenie studenta dalej w bloku `<user_input untrusted="true">` (ochrona przed wstrzyknięciem instrukcji, jak dziś, linia 80–86).
4. Schemat odpowiedzi AI (`ReviewSchema`, dziś linia 6) rozszerzony **opcjonalnie** o pole porównawcze: `benchmarkBand` ∈ {dorównał, zbliżył się, poniżej} + `benchmarkDelta` (krótkie wyjaśnienie różnicy per wymiar). Pola opcjonalne → L1–L3 ich nie zwraca, walidacja schematu nadal przechodzi.

### Ochrona przed wyciekiem odpowiedzi (krytyczne)

- Referencja **nigdy** nie trafia do trasy `GET /api/projects/[id]` ani do matchera (sekcja 1, sekcja 4).
- W odpowiedzi `submit` do studenta zwracamy **band i feedback**, ale **nie surową treść `professional_outcome_md`** przed oddaniem. Po oddaniu możemy pokazać `context_md` (zanonimizowane omówienie) — to wartość edukacyjna, decyzja produktowa Sophii.
- Ryzyko, że student „wyłudzi" referencję przez prompt-injection w treści zgłoszenia: referencja jest w bloku zaufanym, zgłoszenie w bloku niezaufanym; model instruowany jak dziś, by ignorować instrukcje z bloku niezaufanego. To pytanie dla bramki Ryana (sekcja 6).

---

## 4. Wpływ na matcher i `project_submissions`

### Matcher (`src/lib/ai/match-projects.ts`)

- Matcher czyta `project.level` i `project.competencies` — **referencja jest mu niepotrzebna i nie wolno mu jej pobierać** (wyciek). Dopasowanie L4/L5 do luki = czysto kompetencyjne, jak dziś.
- Dla samej struktury danych: **żadna zmiana w matcherze nie jest wymagana**. (Rozszerzenie UI/matchera o filtrowanie/pokazywanie L4/L5 to osobne zadanie Jacka/Ethana — framework §3, nieblokujące tego designu.)
- Otwarta kwestia produktowa (nie strukturalna): czy L4/L5 powinny być widoczne dopiero po ukończeniu L3 (łańcuch prerekwizytów, §4 frameworku). To bramka pokazywania, nie schema — odnotowane jako pytanie (sekcja 7).

### `project_submissions` — czy potrzebny nowy `score` porównawczy?

Dziś `project_submissions` ma: `score` (int), `status` (enum), `aiReviewJson` (jsonb — trzyma całą odpowiedź AI). Submit zapisuje całość recenzji do `aiReviewJson` (`{ review }`, linia 137/151).

**Rekomendacja: na start ZERO zmian w `project_submissions`.** Pasmo benchmarku (`benchmarkBand`) i deltę zapisujemy w istniejącym `aiReviewJson` (jsonb jest dowolnie rozszerzalny) — zero migracji tej tabeli, pełna wsteczna zgodność. `score` bezwzględny zostaje jak dziś.

**Opcja do rozważenia (Leo/Darek):** jeśli paszport studenta ma kiedyś pokazywać „dorównał profesjonaliście" jako odznakę i chcemy po tym **filtrować/sortować w bazie**, warto dodać nullable kolumnę `benchmark_band text` na `project_submissions` (NULL dla L1–L3 i starych zgłoszeń → wstecznie zgodne). Dopóki to tylko wyświetlanie pojedynczego zgłoszenia — jsonb wystarcza. Rekomendacja: **jsonb-first**, kolumnę dodać dopiero gdy pojawi się realne zapytanie filtrujące (nie budujmy na zapas).

---

## 5. Wpływ na narzędzie zaciągu i kanon JSON

Narzędzie `tools/content-cyber-projects.ts` + kanon `README-cyber-projects.md`. Cel frameworka §8: L4/L5 dają się zaciągnąć **tym samym** mechanizmem (upsert keyed-by-slug). Zmiany potrzebne (do zaprojektowania, tu tylko plan):

### Nowe (opcjonalne) klucze w pliku treści dla L4/L5

```jsonc
{
  // … istniejące pola projektu (slug, title, level: "L4", …) …
  "reference_solution": {                       // WYMAGANE gdy level ∈ {L4,L5}; ZABRONIONE dla L1–L3
    "context_md": "Zanonimizowany opis: 'Fintech · DACH · 80 FTE' …",
    "professional_outcome_md": "Profesjonalista osiągnął …",
    "artifact_url": "https://…",                // opcjonalne
    "artifact_type": "report",                  // report|repo|dashboard|… (lista miękka)
    "benchmark_metrics": [
      { "metric": "czas wykrycia", "target": 5, "unit": "min", "direction": "lower_better" }
    ],
    "comparison_criteria": [
      { "dimension": "trafność detekcji", "weight": 60, "how_to_compare": "…" },
      { "dimension": "kompletność raportu", "weight": 40, "how_to_compare": "…" }
    ],
    "passing_band": "zblizyl_sie"               // opcjonalne
  }
}
```

### Rozszerzenia walidatora (bramka jakości — fail-fast przed bazą)

1. **`PROJECT_LEVELS`** (dziś `["L1","L2","L3"]`, linia 52) → dodać `"L4","L5"`. Enum bazy już je dopuszcza, ogranicza tylko walidator narzędzia.
2. **`SOURCE_TYPES`** (dziś `["open_data","oss"]`, linia 55) → realne projekty firm to najpewniej `partner` (enum bazy `project_source_type` już ma `partner`/`ngo`/`faculty`). Rozszerzyć dopuszczalną listę dla L4/L5.
3. **Spójność poziom↔referencja:** nowa reguła walidacji — `level` ∈ {L4,L5} **wymaga** klucza `reference_solution`; `level` ∈ {L1,L2,L3} **nie może** go mieć (albo jest ignorowany — decyzja Leo). Symetria do dzisiejszej reguły „suma wag rubryki = 100".
4. **Walidacja kształtu `reference_solution`:** `benchmark_metrics` niepuste, `direction` z dozwolonego zbioru; `comparison_criteria` niepuste, suma `weight` = 100 (wzór z rubryki); `artifact_url` http/https (reuse `validateUrl`); `artifact_type` z listy.
5. **Walidator nazw kompetencji — bez zmian** (dalej dosłowne liście ścieżki z `career-model.ts`). L4/L5 obejmują kompetencje wyższego poziomu, ale nazwy liści te same.

### Upsert keyed-by-slug — NIENARUSZONY

- Główny upsert `projects` (ON CONFLICT slug DO UPDATE) bez zmian.
- `reference_solution` obsługiwane **replace-per-projekt**: `DELETE FROM project_reference_solutions WHERE project_id = …` + `INSERT`, dokładnie jak `learning_resources`/`source_links` (linie 358–390). Pominięcie klucza = nie ruszamy istniejącej referencji. Idempotencja zachowana.
- Guard prod bez zmian (`assert-test-db.ts`: host zdalny bez `CONFIRM_PROD_DB=1` → ABORT; fragment `skill-bridge-ai` → ABORT; connection string niedrukowany). Zaciąg prod robi Ethan pod bramkami v1.12.

---

## 6. Plan migracji schemy (drizzle) — PLAN, nie wykonanie

**Następny numer migracji: `0019`** (ostatnia w repo to `0018_glamorous_meteorite.sql`).

### Co robi migracja

1. **`CREATE TABLE project_reference_solutions`** (sekcja 2) — czysto addytywne (dokładające): nowa tabela, zero zmian na `projects` i `project_submissions`.
2. **`CHECK`** na `artifact_type` (lista miękka — łatwy `ALTER` później, bez nieodwracalnego `ALTER TYPE` enuma Postgres).
3. **`UNIQUE`** na `project_id` (relacja 1:1 projekt↔referencja).
4. **Indeks** na `project_id` (szybki odczyt przy ocenie).
5. **`FOREIGN KEY` z `ON DELETE CASCADE`** na `projects.id` — usunięcie projektu sprząta referencję.
6. **Sekcja uprawnień/RLS dopisana ręcznie** (drizzle-kit jej nie generuje, jak przy 0013/0015): **brak `GRANT SELECT` dla `app_student` i `app_faculty`** — tabela server-only. Wyjątek w `docs/security/rls-matrix.md` + `tools/k3-validate.ts` analogicznie do innych tabel projektowych, ale z odwrotnym znakiem (deny zamiast public-read).

### Czy wstecznie zgodne? **TAK.**

- Zero `ALTER` na istniejących tabelach → istniejące projekty L1–L3, zgłoszenia, zapytania i trasa `GET /api/projects/[id]` działają **bez żadnej zmiany**.
- Nowa tabela startuje pusta; „brak referencji" = „brak wiersza".
- Nic nie kasujemy, nic nie zwężamy. Czysto addytywna migracja.
- (Jeśli kiedyś dodamy opcjonalną kolumnę `benchmark_band` na `project_submissions` — sekcja 4 — to też wstecznie zgodne, bo nullable z NULL dla starych wierszy. To osobna, późniejsza decyzja.)

### Egzekucja na produkcji (gdy przyjdzie czas — POZA tym designem)

To byłaby **migracja schemy bazy produkcyjnej NEON** — od konstytucji v1.12 delegacja Ethana (CTO) pod bramkami: **Leo review przed scaleniem**, **kopia zapasowa Neon przed zmianą**, **transakcyjny SQL**, **NIGDY niszczący `db:seed` na prod**, autor commitu = Darek, każda akcja w audit logu. **W tym dokumencie tylko PLANUJEMY — nie wykonujemy.** Czysty `CREATE TABLE` jest nie-niszczący (nie wywołuje hooka `ask`, bo nie ma `DROP`/`DELETE`/`TRUNCATE`), ale i tak idzie przez Leo review i kopię zapasową.

---

## 7. RODO / etyka — sygnał dla Ryana (CRCO)

Realne projekty realnych firm to **nowa klasa ryzyka** — pierwszy raz wprowadzamy do bazy dane wywiedzione z faktycznych projektów komercyjnych. Punkty do bramki Ryana (§7 frameworku):

1. **Anonimizacja firmy.** `context_md` i `professional_outcome_md` **nie mogą** zawierać nazwy firmy, marki, ani danych pozwalających ją zidentyfikować. Wzorzec z brand voice nordsignal: persona-konkret zamiast nazwy („Fintech · DACH · 80 FTE", jak „Manufacturing · DACH · 200 FTE" na stronie). Bramka: walidator/recenzja treści sprawdza brak nazw własnych.
2. **PII (dane osobowe).** Zero imion, e-maili, identyfikatorów pracowników profesjonalisty czy klientów w opisie i artefakcie. Bramka Ryana jak przy researchu (§6 frameworku, „brak PII").
3. **Legalność użycia realnego case'u.** Czy mamy prawo opisać i wykorzystać projekt firmy jako materiał edukacyjny? Trzy źródła legalności do rozstrzygnięcia: (a) publiczny case study / dane otwarte (najbezpieczniej), (b) zgoda firmy/profesjonalisty, (c) anonimizacja na tyle głęboka, że to już „typ projektu", nie konkretny projekt. **Ryan rozstrzyga, które dopuszczamy.**
4. **Własność intelektualna artefaktu.** `artifact_url` wskazujący wzorcowy wynik profesjonalisty — czyja to własność, czy wolno linkować/pokazywać. Jeśli to czyjeś repo/raport — licencja/zgoda.
5. **Uczciwość względem §7 (HITL).** Ocena benchmarku jest **automatyczna (AI)** — w UI nazywamy ją uczciwie „ocena automatyczna", nie „zweryfikowane przez profesjonalistę". Pasmo „dorównał" to porównanie maszynowe, nie werdykt człowieka. Spójne z decyzją E3 §5 (wykładowca dopiero po walidacji produktu).
6. **Retencja / klasa danych.** Referencja jest server-only (sekcja 2) — potwierdzić z Ryanem, że to wystarcza i nie wymaga osobnej polityki retencji (to nie dane studenta, to treść katalogu).

---

## 8. Ryzyka i pytania otwarte (dla Leo review i decyzji Darka)

1. **Wyciek referencji — czy osobna tabela wystarcza?** Rekomendacja (osobna tabela server-only) eliminuje wyciek przez `...project`. Pytanie do Leo: czy są **inne** ścieżki serializujące projekt do klienta (np. brief, recommend), które mogłyby dołączyć referencję, jeśli ktoś nieuważnie doda `with: { referenceSolution: true }`? Proponuję twardą regułę przeglądu: żadna trasa kliencka nie dołącza `project_reference_solutions`.
2. **jsonb vs kolumna `benchmark_band` na `project_submissions`.** Rekomendacja jsonb-first (zero migracji submissions). Pytanie do Darka/Sophii: czy paszport ma **filtrować** po „dorównał profesjonaliście" (→ wtedy kolumna), czy tylko pokazywać przy pojedynczym zgłoszeniu (→ jsonb wystarcza)?
3. **Prereqs L4/L5 — bramka pokazywania.** Czy L4/L5 widoczne dopiero po ukończeniu L3 (łańcuch prerekwizytów §4)? To decyzja produktowa Sophii + zadanie matchera/UI (Jack), **nie** ta struktura danych — ale wpływa na to, kiedy w ogóle pierwszy L4/L5 ma sens. Do potwierdzenia przed pierwszą partią.
4. **Jakość benchmarku przez AI.** Czy model na ocenie (`getModel("standard")`) wiarygodnie liczy deltę wobec referencji dla projektów klasy „dowód biegłości"? Ryzyko: powierzchowne „dorównał". Możliwa potrzeba mocniejszego modelu na L4/L5 lub osobnej rubryki porównawczej. Do zmierzenia na golden-example (framework §7).
5. **Źródło L4/L5.** `sourceType: partner` zakłada partnerstwo z firmą — czy mamy partnerów na pierwszą partię, czy startujemy z publicznych case studies (`open_data`/publiczny raport)? Wpływa na §7 RODO i na to, czy struktura `partnerId`/`exclusivity` (już w `projects`) jest tu potrzebna.

---

## Changelog

- **v0.1 (2026-06-29):** pierwsza wersja designu. Rekomendacja: nowa tabela satelicka `project_reference_solutions` (server-only, nie kolumny w `projects`) — główny powód: trasa `GET /api/projects/[id]` zwraca `...project`, więc kolumny wyciekłyby studentowi przed oddaniem. Benchmark: rozszerzenie `aiReviewJson` (jsonb) o pasmo dorównał/zbliżył się/poniżej, bez zmian w `project_submissions`. Migracja 0019 czysto addytywna (CREATE TABLE), wstecznie zgodna. Narzędzie zaciągu: nowe opcjonalne `reference_solution`, rozszerzenie `PROJECT_LEVELS` i `SOURCE_TYPES` w walidatorze, upsert keyed-by-slug nienaruszony. Punkty RODO dla Ryana (§7). Autor: Ethan (CTO), wsparcie Leo.
