# A5/1.11 — Bank pytań (wspólny) + silnik testu adaptacyjnego · spec v0.2

**Status:** ZATWIERDZONE (Darek, 2026-07-08) — decyzje §8: (1) schemat
zatwierdzony bez zmian, (2) zakres diagnozy = **Opcja A** (tylko zaznaczone),
(3) powtórki = **tylko re-onboarding** (bez przycisku w Becie), (4) bramka F1
„zero mapy wyłącznie z samooceny" **zawężona do ścieżki pilotażowej DS**
(adnotacja [ZMIANA] w roadmapie) · **Data:** 2026-07-08 · **Autor:** Oliver
**Weryfikacja:** v0.1 przeszła krytyczny przegląd 3 niezależnych agentów
(soczewki: konsumenci 1E / bezpieczeństwo-RLS / determinizm-krawędzie);
24 znaleziska (5 krytycznych) wcielone do v0.2 — zmiany oznaczone **[REV]**.
**Powiązania:** roadmapa §3 Blok A5 (1.10 ✅ → **1.11** → 1.12), §4 FAZA 1E
(1E.2/1E.3/1E.4 — współkonsumenci banku), ścieżka krytyczna pkt 4
(„1.11 i 1E.2 projektować RAZEM — zrobione osobno wymuszą bolesną migrację
scalającą"), migracja 0029 (`verified_by_method` otwarty na `'diagnostic'`),
B4 `levelToStatus` (decyzja Darka 2026-06-01, ratyfikowana).

---

## 1. Problem i wymagania

**1.11 (teraz):** silnik testu adaptacyjnego + bank pytań; deterministyczne
mapowanie odpowiedzi → poziom kompetencji. Konsumowane przez 1.12 (ścieżka
onboardingu bez sylabusa: diagnoza → mapa kompetencji).

**Twardy wymóg projektowy [ZMIANA w roadmapie]:** te same encje banku mają
służyć trzem konsumentom:

| Konsument | Zadanie | Czego potrzebuje od banku |
|---|---|---|
| Diagnoza wejściowa | **1.11/1.12** (teraz) | pytania per kompetencja rynkowa, stopniowana trudność |
| Egzaminy modułowe | 1E.3 (później) | warianty per koncept (powtórka ≠ pierwsze podejście), próg mastery 90% |
| Spaced repetition | 1E.4 (później) | pojedyncze pytania per koncept + wyjaśnienie po odpowiedzi (FSRS) |

Do tego 1E.2 (fundamenty CS/matmy) wymaga: zadania o **jednoznacznych
odpowiedziach** (zamknięte / numeryczne / krótka forma) + **deterministyczny
autograding bez LLM** (koszt ~0) + koncepty spoza katalogu rynku (algebra
liniowa nie jest liściem żadnej ścieżki).

## 2. Decyzje projektowe (propozycja)

### 2.1 Oś banku = KONCEPT, nie kompetencja

Kompetencja rynkowa (liść modelu kariery, np. „Statystyka (Statistics)") jest
za gruba dla 1E.3/1E.4 (egzamin modułu pyta o rozkład normalny, nie o „całą
statystykę"), a fundamenty 1E.2 w ogóle nie mają liścia. Stąd:

- **`question_concepts`** — jednostka wiedzy; ma **opcjonalne** mapowanie na
  dokładny liść modelu kariery (`competencyName`). Koncept rynkowy → liść
  NOT NULL (kontrakt-test literówek jak DS partia 1); koncept fundamentów →
  NULL + trunk `'foundations'`.
- **[REV] Reguła wyboru konceptu dla diagnozy** (liść będzie miał z czasem
  WIELE konceptów): flaga `question_concepts.diagnostic boolean` — diagnoza
  używa wyłącznie konceptów z flagą. **Partia 1: dokładnie 1 koncept
  diagnostyczny per liść DS** (nazwa konceptu = liść), koncepty drobnoziarniste
  dojdą w 1E.2 z flagą `false`. Kontrakt-test: każdy liść DS ma dokładnie
  1 koncept diagnostyczny z pełnym pokryciem trudności i wariantów (§5).
- **`question_items`** — pytanie-wariant należące do konceptu; wiele itemów
  per (koncept, trudność) = warianty. Wymóg „drugi wariant nie powtarza zadań
  pierwszego" (1E.3, a po [REV] także re-diagnoza) realizuje selekcja planu
  wykluczająca itemy poprzednich podejść — nie osobna encja.
- **[REV] Niemutowalność itemów:** poprawka merytoryczna = `status='retired'`
  + NOWY item (reguła egzekwowana w ingest, audyt jak ADR-010). Edycja
  `stem`/`answer_json` w miejscu unieważniałaby audytowalność historycznych
  `is_correct` (przy mastery gate 1E.3 blokującym postęp to spór
  nierozstrzygalny). Dozwolona edycja w miejscu: tylko `explanation_md`
  (feedback, nie wpływa na ocenę).
- **Kierunek zależności:** przyszłe curriculum (1E.1) będzie wskazywać
  koncepty banku (pozycja modułu → concept). Bank NIE zna modułów — 1E.1/1E.3
  dołożą swoje kolumny/tabele addytywnie, zero migracji scalającej.
- **[REV] Diagnoza filtruje `trunk='market'`** — wyniki konceptów
  `foundations` nie mają dziś ujścia (piszemy do `competencies` kluczem
  liścia). Gdzie mastery fundamentów będzie widoczne (paszport? drabina
  1E.6?) = decyzja produktowa 1E, schemat jej nie przesądza.

### 2.2 Dostęp do banku: wariant DENY (wzorzec `project_hidden_tests`)

Bank z odpowiedziami czytelny dla roli studenta = memoryzacja przed egzaminem
mastery 90% (1E.3) — ta sama klasa ryzyka co ukryte test-suites (ADR w 0028,
k3 #13a). Propozycja: **obie tabele banku REVOKE ALL dla app_student i
app_faculty**; pytania serwuje wyłącznie API per sesja (stem + opcje, nigdy
`answer_json`), ocenianie wyłącznie server-side owner-side.

**[REV] Twarde kontrakty przeciw wyciekom** (z przeglądu bezpieczeństwa):
- `plan_json` zawiera WYŁĄCZNIE `question_item_id` + metadane kolejności —
  nigdy treść itemu, nigdy `answer_json` (student ma SELECT na swój wiersz
  sesji, więc treść w planie = wyciek surowym SELECT-em).
- Trasa `answer` w diagnozie NIE zwraca `is_correct` ani `explanation_md` —
  tylko „przyjęto + następny krok"; wyniki dopiero w `complete` (poziomy per
  kompetencja, bez mapy item→poprawność). `explanation_md` konsumuje dopiero
  1E.4. Ryzyko rezydualne, jawnie zaakceptowane: staircase zdradza poprawność
  przez trudność następnego pytania — nieusuwalne przy 2 pytaniach; mitygacją
  jest polityka powtórek (§2.5), nie ukrywanie.
- Wpis w rls-matrix odnotowuje: `answer_json` żyje też w repo
  (`tools/content/*.json`) — dostęp do repo = dostęp do odpowiedzi (precedens
  hidden tests); przyszłe rozszerzanie dostępu do repo ma o tym wiedzieć.

### 2.3 Typy pytań i deterministyczny grading (0 LLM)

`type` (CHECK, lista miękka) + `answer_json` (jsonb, kształt per typ):

| type | options_json | answer_json | grading |
|---|---|---|---|
| `single_choice` | lista opcji | `{"correct": 2}` | indeks równy |
| `multi_choice` | lista opcji | `{"correct": [0,2]}` | zbiór równy (bez częściowych punktów) |
| `numeric` | — | `{"value": 3.14, "tolerance": 0.01, "relative": false}` | **[REV]** absolutna: \|odp−v\| ≤ t · względna: \|odp−v\| ≤ t·\|v\| |
| `short_text` | — | `{"accepted": ["dataframe","data frame"]}` | normalizacja + dokładne dopasowanie |

- **[REV]** `numeric`: `grade.ts` normalizuje polski zapis (przecinek→kropka,
  spacje tysięcy) PRZED parsowaniem; tryb `relative` dla wartości dużych/
  bliskich zera. Testy brzegowe na oba tryby.
- **[REV]** `short_text`: normalizacja rozszerzona (trim/lower/NFD-strip
  diakrytyków/interpunkcja), ale **partia 1 diagnozy NIE używa `short_text`**
  (pułapki odmiany i liczebników = false-negative zaniżający placement bez
  odwołania). Typ zostaje w schemacie i gradingu — konsument to 1E.2 (niska
  stawka, feedback z `explanation_md`, kuratorowana lista `accepted`).
- **[REV] Wymóg treściowy przeciw zgadywaniu:** w partii 1 itemy trudności
  **2 i 3** dla konceptów diagnostycznych preferują `numeric`/`multi_choice`
  (single_choice d2 zgadnięte z p=25% dawałoby status `acquired` — odwrotność
  celu A5). Egzekwowane kontrakt-testem partii 1.

Grading to czysta funkcja (`src/lib/assessment/grade.ts`), unit-testowana na
poprawnej / błędnej / brzegowej odpowiedzi (dowód DoD 1E.2 „za darmo" już teraz).

### 2.4 Skala trudności i deterministyczny staircase

Trudność itemu: **1–3** (podstawowa / średnia / zaawansowana). Silnik per
kompetencja = wyszukiwanie binarne po 3 trudnościach — **dokładnie 2 pytania
na kompetencję**, wynik na skali poziomów **1–4 identycznej z samooceną B4**:

```
start: pytanie trudność 2
  ✓ → pytanie trudność 3:  ✓ → poziom 4   ✗ → poziom 3
  ✗ → pytanie trudność 1:  ✓ → poziom 2   ✗ → poziom 1
```

- Mapowanie poziom→status: **istniejące, ratyfikowane `levelToStatus`**
  (1→missing, 2→in_progress, 3/4→acquired); `verified_by_method='diagnostic'`
  (migracja 0029 już na to gotowa). **[REV] Uwaga:** „dalszy potok nie widzi
  różnicy" jest prawdziwe dla mapy/paszportu, ale NIE dla kontraktu zapisu
  onboardingu — patrz §4a (wymagania interfejsu dla 1.12).
- Tabela wyników skończona (4 trajektorie) → golden test wyczerpujący.
- **[REV] Deterministyczny wybór wariantu:**
  `hash(sessionId, conceptId, difficulty) mod N` po wariantach w **stabilnym
  porządku `ORDER BY id`**, z wykluczeniem itemów użytych w poprzednich
  sesjach studenta (dopiero gdy wszystkie zużyte — reset wykluczeń). Sól =
  `sessionId` (nie `studentId`): nowa sesja → inne warianty; bez tego
  powtarzalna diagnoza = wyrocznia odpowiedzi, a 1E.3/1E.4 nie miałyby
  rotacji wariantów.
- **[REV] Plan sesji mrozi OBA rozgałęzienia** staircase per kompetencja
  (item d2 + item d1 + item d3 — 3 itemy, 2 zadane) w `plan_json` przy
  starcie; sesja przerwana wznawia się na tym samym planie; serwer waliduje
  przy `answer`, że item = oczekiwany następny krok planu (klient nie może
  odpowiadać poza kolejnością ani na item spoza planu).

### 2.5 Cykl życia sesji i polityka powtórek **[REV — nowa sekcja]**

- **Jedna aktywna sesja** per (student, kind): partial unique index
  `WHERE status='in_progress'`.
- **Odcisk wejścia:** sesja niesie hash (careerGoal + posortowana lista
  kompetencji do zbadania); mismatch przy wznowieniu (student cofnął się
  w kreatorze i zmienił zaznaczenia/cel) → sesja `abandoned` + nowa.
- **TTL:** `in_progress` starsza niż 7 dni → traktowana jak `abandoned`
  przy próbie wznowienia (bez crona — leniwie).
- **Powtórki:** ponowna diagnoza dozwolona wyłącznie przez re-onboarding
  (dzisiejsza semantyka: nowy przebieg kreatora), z rotacją wariantów (§2.4).
  Bez osobnego przycisku „powtórz test" w Becie — domyka wyrocznię odpowiedzi.
- **[REV] Precedencja zapisu do `competencies`:** wynik diagnozy nadpisuje
  wyłącznie wiersze `verified_by_method='self'` lub wcześniejsze
  `'diagnostic'` — przyszłe silniejsze metody (np. weryfikacja receiptem)
  nie mogą być degradowane słabszym dowodem; macierz rośnie z metodami.

### 2.6 Zakres diagnozy — DECYZJA DARKA (dydaktyczna)

- **Opcja A (rekomendowana):** diagnoza mierzy poziom TYLKO kompetencji
  zaznaczonych przez studenta w istniejącym kroku wyboru (checkboxy katalogu);
  niezaznaczone = `missing` jak dziś. Typowo 5–10 zaznaczeń × 2 pytania =
  **10–20 pytań (~5–10 min)**. Diagnoza zastępuje krok samooceny 1:1 —
  „zamiast deklarować, sprawdzasz się".
- **Opcja B:** pełny katalog ścieżki (np. DS: 21 liści × 2 = 42+ pytań).
  Dokładniejsza mapa (wykrywa wiedzę niezadeklarowaną), ale realny dropout
  w onboardingu i 3× większy koszt kuracji partii 1.

Opcja A nie zamyka B: silnik dostaje listę kompetencji jako wejście — zmiana
zakresu to zmiana wywołania, nie schematu.

## 3. Schemat (4 tabele, jedna migracja 0030)

### Bank — globalny katalog treści (klasa DENY, jak `project_hidden_tests`)

```
question_concepts
  id              uuid PK default random
  slug            text NOT NULL UNIQUE        -- stabilny id treści (jak projects.slug)
  name            text NOT NULL
  trunk           text NOT NULL CHECK ('market','foundations')
  competency_name text NULL                   -- dokładny liść modelu kariery
                                              -- CHECK: trunk='market' → NOT NULL
  diagnostic      boolean NOT NULL DEFAULT false  -- [REV] koncept używany przez diagnozę 1.11
  status          text NOT NULL DEFAULT 'active' CHECK ('active','retired')
  created_at / updated_at

question_items
  id              uuid PK default random
  concept_id      uuid NOT NULL FK → question_concepts (CASCADE)
  difficulty      smallint NOT NULL CHECK 1–3
  type            text NOT NULL CHECK ('single_choice','multi_choice','numeric','short_text')
  stem            text NOT NULL
  options_json    jsonb NULL                  -- tylko typy choice
  answer_json     jsonb NOT NULL              -- NIGDY w odpowiedzi API
  explanation_md  text NULL                   -- feedback po odpowiedzi (1E.4)
  status          text NOT NULL DEFAULT 'active' CHECK ('active','retired')
  created_at / updated_at
  INDEX (concept_id, difficulty)
```

REVOKE ALL od app_student/app_faculty na obu. Zapis tylko ingest/seed (guard
`assertTestDb` lokalnie; prod = [CZERWONA LINIA] jak ADR-009/010).

### Przebiegi — dane studenta (tenant RLS)

```
assessment_sessions
  id           uuid PK default random
  student_id   uuid NOT NULL FK → students (CASCADE)
  tenant_id    uuid NOT NULL FK → tenants
  kind         text NOT NULL CHECK ('diagnostic')   -- lista miękka; 'module_exam' w 1E.3 = ALTER CHECK (koszt zaakceptowany, konwencja repo)
  career_goal  text NULL                    -- [REV] NULL-owalne od dnia 1: egzamin fundamentów (1E.3) nie ma ścieżki
  input_hash   text NOT NULL                -- [REV] odcisk wejścia (§2.5)
  status       text NOT NULL DEFAULT 'in_progress' CHECK ('in_progress','completed','abandoned')
  plan_json    jsonb NOT NULL               -- TYLKO item-idy + kolejność/gałęzie (§2.2)
  result_json  jsonb NULL                   -- koperta [REV]: {schemaVersion, kind,
                                            --   concepts: {slug → {correct, asked, level?}},   ← źródło prawdy (placement 1E.7)
                                            --   competencies: {name → poziom 1–4}}             ← rollup dla 1.12
  started_at / completed_at
  UNIQUE PARTIAL (student_id, kind) WHERE status='in_progress'   -- [REV]

assessment_answers
  id               uuid PK default random
  session_id       uuid NOT NULL FK → assessment_sessions (CASCADE)
  student_id       uuid NOT NULL FK → students (CASCADE)   -- [REV] dla polityki RLS bez joinu
  tenant_id        uuid NOT NULL FK → tenants
  question_item_id uuid NOT NULL FK → question_items
  answer_json      jsonb NOT NULL            -- odpowiedź studenta
  is_correct       boolean NOT NULL          -- ocenione deterministycznie przy zapisie
  position         smallint NOT NULL
  answered_at      timestamptz
  UNIQUE (session_id, question_item_id)
  UNIQUE (session_id, position)              -- [REV]
```

**[REV] Granty doprecyzowane** (przegląd bezpieczeństwa: „wzorzec 0024/0025"
to dwa różne wzorce):
- `assessment_sessions` — grant **TYLKO SELECT** dla app_student (dokładnie
  wzorzec 0025); wszystkie zapisy owner-side przez API.
- `assessment_answers` — **wariant DENY** (zero grantów app_*): student nie
  potrzebuje surowych odpowiedzi, dostaje `result_json`; historia odpowiedzi
  służy silnikowi i przyszłej kalibracji banku (owner-side).
- app_faculty: brak dostępu do obu (panel agreguje z `competencies`/`gaps`).

**[REV] Checklist konwencji** (kompletny, z przeglądu): `question_concepts`/
`question_items` → `K_PUB_TABLES`-wyjątki + rozszerzenie hardkodowanej listy
w k3-validate #13a; `assessment_sessions`/`assessment_answers` →
`TENANT_TABLES` (#3/#4/#10 — dryf tej klasy domykano już przy AG.5); wiersze
+ changelog w rls-matrix (→ **v0.21**) i **sign-off Ryana** przy review PR-a
(jak każda nowa tabela od v0.14).

**[REV] Współbieżność:** `answer` w jednej transakcji waliduje oczekiwany
krok planu + INSERT (ON CONFLICT → 409); `complete` idempotentne — UPDATE
z warunkiem `status='in_progress'` (drugi complete → 409, zapis do
`competencies` tylko przy pierwszym).

## 4. Silnik — `src/lib/assessment/` (czyste funkcje, 0 LLM, 0 kosztu)

- `grade.ts` — `gradeAnswer(item, answer) → boolean` (tabela §2.3,
  z normalizacją numeric/short_text).
- `staircase.ts` — `nextStep(trajectory) → difficulty | done`,
  `levelFromTrajectory(trajectory) → 1–4` (tabela §2.4, golden test 4/4).
- `plan.ts` — `buildPlan(competencyNames, bank, sessionSeed, excludedItemIds)
  → plan_json` (koncepty `diagnostic=true` ∩ `trunk='market'`; oba
  rozgałęzienia; deterministyczny wybór wariantów §2.4; brak itemów dla
  kompetencji → kompetencja raportowana jako `uncovered`, NIE cichy fallback
  — jawność braków treści).
- Trasy API (1.11 dostarcza silnik + trasy; 1.12 wpina w kreator):
  `POST /api/assessment/start`, `POST /api/assessment/[id]/answer`,
  `POST /api/assessment/[id]/complete` — wszystko za flagą
  **`diagnosticAssessment`** (off = zero zmian, onboarding jak dziś).
  Kształty odpowiedzi wg kontraktów §2.2 (bez `answer_json`, bez `is_correct`
  w trakcie, wyniki w `complete`).

### 4a. Wymagania interfejsu dla 1.12 **[REV — nowa sekcja]**

Dwa twarde znaleziska przeglądu, które są punktami PROJEKTU 1.12 (nie 1.11),
ale schemat/spec muszą je zapowiedzieć, żeby 1.12 ich nie odkrył po fakcie:

1. **Poziom 1 nie przechodzi dzisiejszym kontraktem zapisu.**
   `POST /api/onboarding` przyjmuje poziomy `z.union([2,3,4])`, a luki liczy
   z listy zaznaczeń (katalog ∖ wybór) — kompetencja zaznaczona, ale oblana
   w diagnozie (poziom 1 → `missing`) nie przejdzie walidacji i nie trafi do
   luk. 1.12 musi: rozszerzyć kontrakt persystencji o poziom 1 z metodą
   `diagnostic` ORAZ wyprowadzać luki ze **statusów** (`status='missing'` ⇒
   luka), nie z listy zaznaczeń.
2. **Re-onboarding kasuje wyniki diagnozy.** Dzisiejszy `POST /api/onboarding`
   bezwarunkowo usuwa `competencies` i wstawia `'self'` — polityka dla
   wierszy `'diagnostic'` (zachować? wymusić re-diagnozę?) to decyzja 1.12;
   §2.5 daje mechanikę (odcisk wejścia, rotacja wariantów).

## 5. Treść — partia 1 (minimalna, do E2E 1.12)

`tools/content/question-bank-ds-partia-1.json` + ingest wzorem
`content-cyber-projects.ts` (niemutowalność §2.1: poprawka = retire + nowy
item). Zakres: **1 koncept diagnostyczny per liść DS** (21 konceptów),
**≥2 warianty per (koncept, trudność)** = 6 itemów/koncept, ~126 pytań.
**[REV] Arytmetyka wariantów jawnie:** ≥2 per (koncept, trudność) gwarantuje
2 podejścia bez powtórek (onboarding + 1 re-diagnoza) — wystarcza dla 1.11;
koncepty współdzielone z egzaminami dostaną wymóg **≥3** w partii 1E.2
(kontrakt-test parametryzowany per konsument), bo łańcuch diagnoza → egzamin →
powtórka egzaminu to 3 ekspozycje.

Kontrakt-test (unit, always-on, jak `content-ds-projects.contract.test.ts`):
`competency_name` = dokładny liść DS; dokładnie 1 koncept `diagnostic` per
liść; liczenie wariantów per (koncept, trudność) — nie per koncept; struktura
`answer_json` per typ; d2/d3 bez `single_choice` i bez `short_text` (§2.3).
Kuracja jakościowa treści = proces QG (wątek Sophii, time-box, partia — nie
„całość naraz"). Diagnoza degraduje jawnie przy brakach (`uncovered`), więc
partia 1 może rosnąć przyrostowo.

## 6. Czego świadomie NIE budujemy teraz (a schemat nie blokuje)

- **1E.3:** `kind='module_exam'` (ALTER CHECK — koszt zaakceptowany §3),
  `module_id` addytywnie po 1E.1, próg mastery per moduł — poza bankiem.
  Polityka liczby podejść do egzaminu = decyzja 1E.3.
- **1E.4:** karty FSRS przyjdą w 1E.4; **[REV]** cel karty (item vs koncept
  z rotacją itemów) = otwarta decyzja dydaktyczna 1E.4, obie opcje mają FK
  gotowe; historia odpowiedzi powtórek: dopuszczalny `kind='review'`
  (sesja-batch dzienny) — jedno źródło historii odpowiedzi, bez UNION.
- **1E.2:** koncepty `foundations` z `competency_name` NULL — schemat gotowy,
  treść/ingest/ujście wyników (§2.1) w 1E.
- **IRT/CAT z prawdziwego zdarzenia** (estymacja theta): świadomie NIE —
  staircase jest deterministyczny, wyjaśnialny studentowi i wystarczający do
  placementu na skali 1–4. IRT wymagałby danych kalibracyjnych, których nie ma.

## 7. Ryzyka

- **Zgadywanie:** mitygacja treścią przeniesiona do wymogu twardego (§2.3:
  d2/d3 = numeric/multi w partii 1); rezydualnie multi_choice z 5 opcji
  i 2 poprawnymi ≈ p=10% na strzał. Akceptowalne dla placementu (samoocena,
  którą zastępujemy, ma 100% „zgadywalności"); egzaminy mastery 1E.3 mają
  próg 90% na większej liczbie pytań.
- **Jakość dystraktorów** — to treść, nie kod; QG partii 1 (Sophia) + `status
  retired` na wycofanie złego pytania bez kasowania historii odpowiedzi.
- **Bank per ścieżka:** partia 1 pokrywa DS; inne ścieżki degradują do
  `uncovered` → 1.12 musi pokazać samoocenę jako fallback ścieżek bez
  pokrycia. **[REV] Napięcie z bramką F1** „zero mapy wyłącznie z samooceny
  (1.12)": fallback samooceny dla ścieżek nie-DS formalnie łamie bramkę —
  do decyzji Darka (§8 pkt 4).

## 8. Do decyzji Darka

1. **Sign-off schematu** (§3: 2 tabele banku DENY + 2 tabele sesji tenant;
   koncept jako oś z flagą `diagnostic`; niemutowalność itemów; jedna
   migracja 0030). Sign-off Ryana dla rls-matrix v0.21 przy review PR-a.
2. **Zakres diagnozy** (§2.6): A — tylko zaznaczone kompetencje (rekomendacja)
   / B — cały katalog ścieżki.
3. **Polityka powtórek** (§2.5): re-diagnoza tylko przez re-onboarding,
   z rotacją wariantów, bez przycisku „powtórz test" w Becie (rekomendacja) —
   czy dopuścić jawną powtórkę z cooldownem?
4. **Bramka F1 vs ścieżki bez banku** (§7): zawęzić „zero mapy wyłącznie
   z samooceny" do ścieżki pilotażowej DS (rekomendacja — spójne z pilotażem
   1E) / kurować partię 1 dla wszystkich 5 ścieżek demo (~630 pytań).

Po decyzjach: implementacja 1.11 (migracja 0030 + silnik + trasy za flagą +
partia 1 treści DS + kontrakt-testy + integracja RLS/k3), potem 1.12.
