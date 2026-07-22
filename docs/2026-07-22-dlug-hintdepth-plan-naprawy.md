# Dług: `hintDepth` nie jest pomiarem — plan naprawy (serwerowa drabinka podpowiedzi)

**Założony:** 2026-07-14 (przegląd bezpieczeństwa 1E.6a) · **Plan:** 2026-07-22
**Autor planu:** Leo (Tech Lead, Engineering) · **Owner decyzji:** Ethan (CTO)
**Status:** OTWARTY — diagnoza gotowa, wykonanie nie ruszyło
**Decyzje zastrzeżone dla Ethana (§3: wariant A/B, semantyka, dyskryminator) — ROZSTRZYGNIĘTE
2026-07-22:** `docs/decisions/018-serwerowa-drabinka-hintow.md`. Wariant **A z bogatszym kształtem
wartości** (obiekt `{d, at[]}` zamiast liczby), semantyka **sticky przyjęta**, dyskryminator
`hint_depth_source` przyjęty **z poprawką** (po backfillu `DROP DEFAULT`), plus reguły upsertu
wiersza postępu (ADR-018 D4). Treść tego planu pozostaje bez zmian — ADR-018 §4 wylicza, co
konkretnie zmienia w krokach 1–2. Wykonanie odblokowane.
**Domknięcie 2026-07-22 wieczór (Ethan, po review Leo i sign-offie Ryana):** ADR-018 dostał trzy
poprawki przed startem Maxa — **A1** dwie migracje `0039`+`0040` **potwierdzone wykonaniem
generatora** (żadnej ręcznej edycji pliku migracji, żadnego wyjątku od reguły append-only),
**A2** niezmiennik trwały `at.length ≤ d` zapisany jawnie, **A3** osłabione twierdzenie
o odtwarzalności odczytu „per podejście". Warunki Ryana W-1..W-8 sprawdzone pod kątem kolizji
z planem i ADR-em (ADR-018 §6): **kolizji brak**, zakres kroku 6 rośnie o zdanie informacyjne
przy drabince (W-8b) i dwa wiersze w rejestrze retencji (W-8a).
**Blokuje:** **1E.4** (powtórki rozłożone w czasie / FSRS) — ścieżka krytyczna,
`.agents/plans/11-roadmap-fazy-0-3.md` §7 pkt 3 + `.agents/plans/13-make-it-stick.md` §4
**Powiązane:** ADR-014 (D5 fading, D11 instrumentacja), MIS.1 (migracja `0038`, kolumna
`confidence` — ten sam wzorzec), plan 12 ustalenie wiążące nr 5

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu):
> **hint** = podpowiedź; **hintDepth / `hint_depth`** = ile podpowiedzi student odsłonił,
> zanim odpowiedział (0 = żadnej, 3 = łącznie z pełnym rozwiązaniem);
> **FSRS** = algorytm planowania powtórek (etap 1E.4), który ma tę liczbę zjadać jako
> cechę wejściową; **props / payload RSC** = dane, które serwer wstrzykuje w HTML strony,
> widoczne w podglądzie źródła przeglądarki; **trasa / endpoint** = adres API;
> **migracja** = ponumerowana zmiana struktury bazy; **RLS** = reguły bazy, które pilnują,
> że student widzi tylko własne wiersze; **K-INT** = klasa tabel z danymi studenta (RLS
> obowiązkowe); **Zod** = walidator kształtu danych wchodzących do API.

---

## 1. Co dokładnie jest zepsute (fakty z kodu, nie z pamięci)

### 1.1 Cała drabinka podpowiedzi jedzie do przeglądarki

| Miejsce | Plik : linia | Co robi |
|---|---|---|
| Odczyt z treści | `src/lib/curriculum/item-view.ts:94–99` (`hintsFromConfig`) | wyciąga **wszystkie** podpowiedzi z `config_json.hints` |
| Kontrakt widoku | `src/lib/curriculum/item-view.ts:62` + `:225` | pole `hints: string[]` w `CurriculumItemView` — pełna lista |
| Wyciek trasą API | `src/app/api/curriculum/items/[id]/route.ts:49` | `NextResponse.json(result.view)` — **cały widok, z podpowiedzią nr 3 (pełne rozwiązanie)**, dla dowolnego zalogowanego studenta, jednym żądaniem |
| Wyciek stroną (RSC) | `src/components/curriculum/item-detail.tsx:144` | `hints={item.hints}` → props komponentu klienckiego → HTML strony |
| Filtr wyłącznie prezentacyjny | `src/components/curriculum/item-runner.tsx:194` | `hints.slice(0, hintDepth)` — obcina **wyświetlanie**, nie dostęp |
| Licznik po stronie klienta | `src/components/curriculum/item-runner.tsx:65`, `:283–292`, `:143` | `useState(0)`, przycisk `+1`, reset przy następnym pytaniu |
| Deklaracja do serwera | `src/components/curriculum/item-runner.tsx:109` | `hintDepth` w ciele żądania — **jedyne źródło liczby, którą zapiszemy** |

Konsekwencja mierzalna, nie teoretyczna: student, który odsłonił trzy podpowiedzi, może
wysłać `hintDepth: 0` (zwykłe narzędzia przeglądarki, bez żadnej wiedzy technicznej —
wystarczy przeczytać rozwiązanie z podglądu źródła i w ogóle nie kliknąć przycisku).

### 1.2 Gdzie `hint_depth` jest dziś zapisywany i odczytywany

- **Zapis (jedyny):** `src/app/api/curriculum/items/[id]/answer/route.ts:48` (walidacja Zod,
  `0–3`, pole opcjonalne) → `:140` `hintDepth: parsed.data.hintDepth ?? 0` — wartość
  klienta wchodzi do bazy bez żadnej konfrontacji z czymkolwiek serwerowym.
- **Kolumna:** `src/lib/db/schema.ts:1827` (`smallint`, `NOT NULL DEFAULT 0`) + ograniczenie
  `curriculum_item_answers_hint_depth_range` (`schema.ts:1838`); powstała w migracji
  `drizzle/0035_black_senator_kelly.sql:8,10`.
- **Odczyt w kodzie produkcyjnym:** **NIE ISTNIEJE.** Pełny przegląd (`grep` po
  `hintDepth|hint_depth` w `src/`, `tools/`, `tests/`) daje wyłącznie zapis, schemat,
  testy i dokumenty planistyczne.

### 1.3 Dlaczego to jest dług, a nie kosmetyka

Dla ryzyka R13 („błąd nie jest stanem końcowym", podpowiedzi są darmowe i bez kary) wyciek
jest nieszkodliwy — tak zapisał to przegląd 1E.6a i tak zostaje. Szkoda jest
**instrumentacyjna**: `hint_depth` to cecha wejściowa FSRS (1E.4) i sygnał wygaszania
rusztowania (ADR-014 D5). Karmienie algorytmu powtórek liczbą, którą uczący się sam
sobie ustawia, to nie „drobna nieścisłość danych" — to model, który uzna materiał za
opanowany, bo student zajrzał do odpowiedzi. Plan 12 (ustalenie wiążące nr 5) już to
nazwał: *„hintDepth jest dziś deklaratywny od klienta — analityka D11 nie traktuje go
jako twardego sygnału do czasu serwerowej drabinki hintów"*.

---

## 2. Kto konsumuje `hintDepth` (punkt 3 zlecenia)

**Odpowiedź krótka: w kodzie produkcyjnym — nikt. Nie ma czytelnika, którego naprawa
mogłaby zaskoczyć.** Pełna lista wystąpień:

| Konsument | Gdzie | Charakter |
|---|---|---|
| Trasa `answer` | `src/app/api/curriculum/items/[id]/answer/route.ts:48,140` | **zapis** (jedyny pisarz) |
| Schemat + ograniczenie | `src/lib/db/schema.ts:1827,1838`; `drizzle/0035_*.sql:8,10` | definicja |
| Test RLS | `src/lib/db/__tests__/curriculum-rls.integration.test.ts:127,163` | wstawia surowy wiersz, sprawdza izolację — wartość obojętna |
| Test komponentu | `src/components/curriculum/__tests__/item-runner.test.tsx:132` | asercja „klient wysyła `hintDepth: 1`" — **ten test zmieni sens** i musi zostać przepisany |
| Sonda pewności (MIS.1) | `confidence`, `schema.ts:1831` | **sąsiad w tym samym wierszu, nie konsument** — nie rusza `hint_depth` |
| Rytm nauki 1.18 | `src/lib/rhythm/activity.ts:42` | czyta **wyłącznie** `answered_at` z tej tabeli |
| Zaliczanie pozycji | `src/lib/curriculum/completion.ts:117` | czyta wyłącznie `question_item_id` + `is_correct` |
| Strażnik ingestu treści | `tools/ingest-curriculum.ts:278` | sprawdza wyłącznie **istnienie** wierszy (`EXISTS`) |
| Przyszli konsumenci | 1E.4 (FSRS), D11 (analityka), D5 (wygaszanie), MIS.8 | **jeszcze nie istnieją — dlatego naprawiamy teraz, nie po nich** |

### 2.1 NULL vs 0 vs „sprzed naprawy" — rozstrzygnięcie jawne

Problem: kolumna jest `NOT NULL DEFAULT 0`, więc **wiersz sprzed naprawy z wartością `0`
jest nieodróżnialny od uczciwego „nie wziąłem żadnej podpowiedzi"**. Cofnąć się nie da —
danych historycznych nie wolno zgadywać wstecz (ta sama zasada, którą MIS.1 zastosował do
`confidence`: „NULL = sprzed flagi, nie zgadujemy").

Stan faktyczny: wg pomiaru z 2026-07-22 (korekta przy MIS.2 w `13-make-it-stick.md`)
tabela `curriculum_item_answers` na produkcji ma **0 wierszy**. To jednak **nie jest
podstawa do pominięcia problemu**, bo (a) test przebiegu D10 Darka jest zaplanowany i
wygeneruje pierwsze wiersze *przed* tą naprawą albo w jej trakcie, (b) bazy lokalne i CI
mają wiersze mieszane, (c) „sprawdziliśmy raz w lipcu" nie jest dowodem przy scaleniu.

**Rozstrzygnięcie (rekomendacja Leo, do zatwierdzenia przez Ethana):**

1. Dokładamy kolumnę-dyskryminator `hint_depth_source text NOT NULL DEFAULT 'client'`
   z ograniczeniem `CHECK (hint_depth_source IN ('client','server'))`.
   Wiersze sprzed naprawy dostają `'client'` **automatycznie z domyślnej wartości** — bez
   jednego `UPDATE` na danych historycznych. Wiersze po naprawie: `'server'`.
2. FSRS (1E.4) i każda analityka czytają **wyłącznie `hint_depth_source = 'server'`**;
   wiersze `'client'` traktują jako „głębokość nieznana", nigdy jako zero.
3. `0` odzyskuje jednoznaczne znaczenie („serwer nie odnotował żadnego odsłonięcia") i to
   znaczenie jest sprawdzalne maszynowo, nie opisane w komentarzu.

Wariant tańszy („prod jest pusty, wystarczy data scalenia") **odrzucam**: przenosi
rozróżnienie z danych do folkloru zespołu, a różnicę pierwszy raz zauważy ten, kto za pół
roku policzy krzywą zapominania i nie zrozumie, czemu 40 wierszy z pilotażu ma
podejrzanie dużo zer.

**Bramka przed scaleniem (obowiązkowa):** `SELECT count(*) FROM curriculum_item_answers`
na produkcji, liczba wpisana do opisu PR-a. Jeśli > 0 — te wiersze zostają `'client'` i
tak są opisane w handoffie.

---

## 3. Czy potrzebna jest migracja — TAK

Odsłonięcie podpowiedzi zdarza się **przed** powstaniem wiersza odpowiedzi, więc stan
„co ten student już zobaczył" musi gdzieś mieszkać. Naprawa czysto aplikacyjna nie
istnieje. Następny wolny numer: **`0039`** (pliki do `0038_black_absorbing_man.sql`,
dziennik `drizzle/meta/_journal.json` — ostatni wpis `idx: 38`). Plik migracji generuje
`pnpm db:generate` po zmianie `src/lib/db/schema.ts` — **nigdy ręcznie** (migracje są
tylko-do-dopisywania, pilnuje tego hook `PreToolUse` w `.claude/settings.json`).

### Wariant A (rekomendowany) — kolumna JSONB na istniejącej tabeli postępu

```
curriculum_item_progress + hints_revealed_json jsonb NOT NULL DEFAULT '{}'::jsonb
   { "<question_item_id>": <0..3> }   ← maksymalna przyznana głębokość per pytanie
```

- Tabela **już** jest K-INT: ma RLS ENABLE+FORCE, polityki `student_sees_own` +
  `owner_passthrough`, grant tylko `SELECT` dla `app_student`, `REVOKE` dla `app_faculty`
  (`drizzle/0035_*.sql:164–186`), figuruje w `TENANT_TABLES` (`tools/k3-validate.ts:96`).
  **Zero nowej powierzchni RLS** → Ryan dostaje notę do macierzy, nie sign-off nowej tabeli.
- Klucz `UNIQUE(student_id, item_id)` już istnieje — nie trzeba nowego.
- Migracja addytywna, dokładnie w klasie precedensu MIS.1 (`0038`).
- Koszt: tracimy historię odsłonięć (kto, kiedy, po ilu sekundach). Dla cechy FSRS
  potrzebna jest maksymalna głębokość, nie oś czasu.

### Wariant B — nowa tabela dopisywalna `curriculum_item_hint_reveals`

`(id, student_id, tenant_id, item_id, question_item_id NULL, depth, revealed_at)`.
Daje pełną historię (w tym przyszły sygnał „czas do pierwszej podpowiedzi", potencjalnie
użyteczny dla D5). Koszt: nowa tabela K-INT = polityki RLS + granty + wpis w
`TENANT_TABLES` (`tools/k3-validate.ts`) + aktualizacja `docs/security/rls-matrix.md`
(v0.28) + **sign-off Ryana (domena 8 — nie mój)** + test integracyjny izolacji + rozszerzenie
strażnika `assertNoContentMigrationUnderProgress` (`tools/ingest-curriculum.ts:278`) o tę
tabelę. To realny, dodatkowy punkt szeregowania na ścieżce krytycznej.

**Rekomendacja: A.** Wybór należy do Ethana (schemat bazy produkcyjnej = jego review
krytyczne). Jeśli 1E.4 ma w planie cechę czasową („ile trwało do podpowiedzi"), wybieramy
B **teraz** — dokładanie jej później to druga migracja i druga runda z Ryanem.

### Semantyka do zatwierdzenia razem z wariantem

**Przyznana głębokość jest niemalejąca (sticky) w obrębie pary (student, pozycja, pytanie).**
Odświeżenie strony, nowa sesja i nowe podejście jej nie zerują.

- *Za:* odsłonięcie pełnego rozwiązania trwale zmienia wartość dowodową kolejnych
  odpowiedzi na to pytanie — FSRS ma o tym wiedzieć. Wariant „resetuj per podejście"
  jest zerowalny przez przeładowanie strony, czyli **odtwarza dokładnie ten dług w nowym
  przebraniu**.
- *Skutek uboczny do świadomej akceptacji:* student, który wczoraj odsłonił podpowiedź 3,
  a dziś odpowiada z pamięci, zapisze `hint_depth = 3`. To jest zamierzone.
- Decyzja dotyczy definicji cechy FSRS → **Ethan** (ADR-014/plan 13), nie ja.

---

## 4. Czy da się rozszerzyć istniejącą trasę — NIE, potrzebna nowa

Istniejące trasy curriculum: `GET /api/curriculum` (drabina), `GET /api/curriculum/modules/[id]`,
`GET /api/curriculum/items/[id]` (treść), `POST /api/curriculum/items/[id]/answer`,
`POST /api/curriculum/items/[id]/complete` (pieczątka laba). Żadna nie pasuje:

- `GET .../items/[id]` jest odczytem — musiałaby zacząć zapisywać (metoda GET, która
  zmienia stan, to błąd kontraktu i pułapka dla każdego prefetchu przeglądarki);
- `.../answer` działa **po** odpowiedzi — za późno na przyznanie podpowiedzi;
- `.../complete` to zaliczanie laba (inna klasa).

**Nowa trasa: `POST /api/curriculum/items/[id]/hint`**, ciało `{ questionItemId: uuid }`,
odpowiedź `{ depth, hints: string[], hasMore: boolean }` (podpowiedzi **wyłącznie** do
przyznanej głębokości).

Kontrakt bramek — wzorzec kopiowany z trasy `answer`, nie wymyślany od nowa:

| Warunek | Odpowiedź | Wzorzec |
|---|---|---|
| flaga `curriculumPath` off | 404 | `answer/route.ts:53` |
| brak sesji | 401 | `answer/route.ts:57` |
| `id` nie jest uuid | 400 | `isUuid`, `answer/route.ts:61` (0.15/B3) |
| ciało nie przechodzi Zod | 400 | domena 2 standardu |
| moduł albo pozycja zablokowane | 403 | `answer/route.ts:97–104` — sekwencji pilnuje serwer |
| `questionItemId` spoza pozycji | 400 | `questionIdsFromConfig`, `answer/route.ts:108` |
| głębokość ponad `min(hints.length, 3)` | 409 + brak zapisu | inaczej ograniczenie `BETWEEN 0 AND 3` wywali 500 |
| limit żądań przekroczony | 429 | **nowy limiter `hintReveal`** (poniżej) |

**Limit żądań (domena 9 — moja domena jako primary).** Trasa nie kosztuje wywołania modelu,
ale jest zapisem do bazy wyzwalanym kliknięciem w pętli. Wymagam limitera
`hintReveal: slidingWindow(60, "1 m")` per student w `src/lib/rate-limit.ts:48`
(wzorzec `tutorDaily`/`vivaDaily`). Bez niego pojedyncza pętla `for` zamienia się w
wzmocnienie zapisu na wierszu postępu. Koszt: 6 linii.

**Wyścig dwóch kliknięć:** przyznanie głębokości robimy jednym zapisem
`GREATEST(stara, nowa)` w transakcji (wzorzec `recordAttempt`, `completion.ts:99–101`),
nigdy sekwencją „przeczytaj w aplikacji → zapisz". Dwa równoległe kliknięcia mają dać
głębokość 2, nie 3.

---

## 5. Zamknięcie wycieku: kontrakt `getItemView`

Dziś `hints: string[]` (cała lista). Po naprawie:

- `hintsByQuestion: Record<questionItemId, string[]>` — **wyłącznie** podpowiedzi już
  przyznane temu studentowi (odczyt ze stanu z §3). Po odświeżeniu strony student widzi
  to, co widział, bez dodatkowego żądania i bez podbijania licznika;
- `hintsTotal: number` — do napisu „Pokaż podpowiedź (2/3)". Liczba, nie treść;
- `labHints: string[]` — **jawnie publiczna** lista dla pozycji `lab` (patrz §8 nota (a)):
  laby nie mają pętli pytań, więc niczego tu nie mierzymy; osobna nazwa pola pilnuje,
  żeby nikt jej nigdy nie pomylił z drabinką mierzoną.

Trasa `GET /api/curriculum/items/[id]` zwraca ten sam obiekt widoku, więc **wyciek trasą
API zamyka się tą samą zmianą** — bez osobnej poprawki.

---

## 6. Sekwencja wykonawcza

Kolejność jest wiążąca — każdy krok zostawia drzewo w stanie kompilowalnym.

**Krok 1 — schemat + migracja `0039` (backend).**
`src/lib/db/schema.ts`: kolumna z §3 (wariant A: `hints_revealed_json` na
`curriculum_item_progress`) + `hint_depth_source` na `curriculum_item_answers` z
ograniczeniem `CHECK`. Potem `pnpm db:generate` → `drizzle/0039_*.sql` (nazwę nadaje
narzędzie) → `pnpm db:migrate` na bazie lokalnej `:5433`.
*Dowód:* `\d curriculum_item_progress` i `\d curriculum_item_answers` na `:5433` pokazują
kolumny i ograniczenie; `pnpm tsx tools/k3-validate.ts` zielone (bez zmian w listach —
wariant A nie dodaje tabeli).

**Krok 2 — magazyn przyznanej głębokości (backend).**
Nowy moduł `src/lib/curriculum/hints.ts`: `grantNextHint(studentId, tenantId, itemId,
questionItemId, maxDepth, dbc)` → `{ depth, hints }` (zapis `GREATEST`, transakcja) oraz
`getGrantedDepths(studentId, itemId)` → mapa dla widoku. Cała wiedza o podpowiedziach
w jednym pliku — trasa i widok go wołają, żaden nie liczy sam.
*Dowód:* test jednostkowy `src/lib/curriculum/__tests__/hints.test.ts` — monotoniczność
(2 → 1 nie obniża), przycięcie do `min(hints.length, 3)`, izolacja per pytanie.

**Krok 3 — trasa `POST /api/curriculum/items/[id]/hint` (backend).**
Plik `src/app/api/curriculum/items/[id]/hint/route.ts` + limiter `hintReveal` w
`src/lib/rate-limit.ts`. Komplet bramek z §4, `logError("curriculum.hint.failed", …)`
przy błędzie (domena 13).
*Dowód:* test integracyjny `src/app/api/curriculum/__tests__/curriculum-hint.integration.test.ts`
— po jednej asercji na każdy wiersz tabeli bramek z §4 (404/401/400/403/400/409), plus
„dwa żądania → głębokość 2, treść dokładnie dwóch pierwszych podpowiedzi".

**Krok 4 — kontrakt widoku (backend).**
`src/lib/curriculum/item-view.ts`: `hints` → `hintsByQuestion` + `hintsTotal` + `labHints`
(§5). `getItemView` dociąga przyznane głębokości z kroku 2.
*Dowód (to jest właściwy dowód zamknięcia wycieku):* w teście integracyjnym trasy
`GET /api/curriculum/items/[id]` — `expect(JSON.stringify(body)).not.toContain(<tekst
nieodsłoniętej podpowiedzi>)`. Asercja na treści, nie na kształcie pola: przetrwa
refaktor, którego nie przewidzieliśmy. Aktualizacja istniejącej asercji
`curriculum-item.integration.test.ts:212`.

**Krok 5 — trasa `answer` przestaje wierzyć klientowi (backend).**
`answer/route.ts`: usunięcie `hintDepth` ze schematu Zod (`:48`); wartość wyliczana
serwerowo z magazynu z kroku 2 **w tej samej transakcji**, co wstawienie odpowiedzi
(`:133–144`), razem z `hintDepthSource: "server"`. Stary klient, który wciąż wysyła
`hintDepth`, przechodzi bez błędu — Zod domyślnie odcina nieznane pola (zgodność wstecz
w oknie wdrożenia, gdy stara strona żyje w karcie przeglądarki).
*Dowód:* test integracyjny — POST `/hint` ×2, potem POST `/answer` z **jawnie
sfałszowanym** `hintDepth: 0` w ciele → wiersz w bazie ma `hint_depth = 2` i
`hint_depth_source = 'server'`. To jest test, który reprodukuje dokładnie dzisiejszy dług.

**Krok 6 — klient (frontend).**
`item-runner.tsx`: usunięcie licznika lokalnego (`:65`), przycisk woła `POST …/hint` i
renderuje to, co wróciło z serwera (`:283–292`); usunięcie `hintDepth` z ciała żądania
(`:109`) i `slice` (`:194`); stan „wczytuję…" + obsługa 429 (osobny komunikat po polsku —
w przeciwieństwie do znanego długu tury czatu, gdzie 429 jest niewidoczne);
`aria-live="polite"` na kontenerze podpowiedzi (domena 14 — dziś podpowiedź pojawia się
bez ogłoszenia dla czytnika ekranu, a po zmianie na asynchroniczną pojawi się z
opóźnieniem). `item-detail.tsx`: przekazanie `hintsByQuestion`/`hintsTotal`, laby na
`labHints` (`:120–136`, `:144`).
*Dowód:* `item-runner.test.tsx` — przepisany test „podpowiedzi" (`:118–133`): klik →
żądanie na `/hint`, render zwróconej treści, a ciało żądania `/answer` **nie ma** pola
`hintDepth`; nowy test: 429 → komunikat, brak cichej ciszy.

**Krok 7 — dowód end-to-end.**
`tests/e2e-pw/60-1e1-curriculum.spec.ts`: dopisany krok w istniejącym scenariuszu —
odsłonięcie podpowiedzi trasą, odpowiedź z `hintDepth: 0` w ciele, weryfikacja przez
kolejne żądanie, że drabina i postęp są spójne.

**Krok 8 — dokumentacja i produkcja.**
`docs/SESSION_HANDOFF.md` (dług 2 z sekcji „DŁUGI OTWARTE" → zamknięty, z numerem PR-a),
`.agents/plans/13-make-it-stick.md` §4 (warunek przed 1E.4 odhaczony),
`.agents/plans/11-roadmap-fazy-0-3.md` §7 pkt 3. Wariant B dodatkowo:
`docs/security/rls-matrix.md` v0.28 + sign-off Ryana.
Produkcja: kopia zapasowa Neon → migracja `0039` → wdrożenie → **obserwacja**:
`SELECT hint_depth, hint_depth_source, count(*) FROM curriculum_item_answers GROUP BY 1,2`
po przebiegu D10 Darka. Wykonuje **Ethan** (CLAUDE.md v1.12 — scalenie, wdrożenie i baza
produkcyjna są jego, po moim review).

---

## 7. Wielkość i podział PR-a

**Jeden PR.** Rozbicie na „backend" + „frontend" nie działa: kroki 4–6 zmieniają jeden
kontrakt (`CurriculumItemView`), więc rozdzielone zostawiają gałąź, która się nie
kompiluje — albo wymuszają martwe pole przejściowe, czyli dokładanie długu przy spłacie
długu. Migracja `0039` jest addytywna i nie ma osobnego okna wdrożeniowego.

Szacunek: **9–11 plików**, ~230 linii kodu produkcyjnego + ~260 linii testów; 1 nowa trasa,
1 nowy moduł, 1 migracja addytywna, 0 nowych tabel (wariant A). Praca: **1 dzień** roboty
Maxa + pół dnia review i poprawek.

Rozbicie wchodzi w grę tylko przy wyborze **wariantu B** (nowa tabela): wtedy PR-1 =
migracja + RLS + macierz + sign-off Ryana, PR-2 = trasa + kontrakt + klient. Powód
rozbicia jest wtedy proceduralny (sign-off domeny 8), nie techniczny.

**Wykonawca:** **Max (Backend)** prowadzi cały PR end-to-end — delta frontendowa to jeden
komponent i jego test, a reguła „jeden pisarz gita per gałąź" (runbook
`docs/runbooks/worktree-strumienie.md`, po incydencie współdzielonego katalogu przy #190)
jest ważniejsza niż podział po warstwach. **Jack (Frontend)** — review kroku 6 (asynchroniczne
odsłanianie, 429, `aria-live`), bez własnego commita na tej gałęzi. **Leo** — review wg
14 domen. **Ethan** — decyzja wariant A/B + semantyka „sticky" (§3), review krytyczne
migracji, scalenie i produkcja. **Ryan** — nota do macierzy RLS (wariant A) albo pełny
sign-off (wariant B).

---

## 8. Znaleziska poboczne (osobne zadania — NIE wciągać do tego PR-a)

**(a) Laby pokazują komplet podpowiedzi, w tym pełne rozwiązanie, a bramkują postęp.**
`item-detail.tsx:120–136` renderuje wszystkie podpowiedzi laba w rozwijanym bloku.
To **nie jest** dług tej samej klasy — nic tu nie udaje pomiaru (laby nie mają pętli
pytań, `hint_depth` dla nich nie powstaje), więc naprawa niczego nie mierzy lepiej.
Jest to natomiast **pytanie dydaktyczne dla Sophii**: lab jest bramką drabiny, a pełne
rozwiązanie stoi jedno kliknięcie obok. Zgodne z dzisiejszą doktryną („podpowiedzi są
darmowe, ADR-015 i tak nie dowodzi samodzielności"), ale warte świadomej decyzji, nie
przemilczenia.

**(b) Podpowiedzi są własnością POZYCJI, a `hint_depth` zapisujemy per PYTANIE.**
`config_json.hints` jest jedno na całą pozycję (`item-view.ts:94`), a pozycja ma po kilka
pytań — ta sama podpowiedź obsługuje wszystkie. Cecha FSRS opisuje pojedynczą odpowiedź.
Model treści i model pomiaru się rozjeżdżają. Ten plan zachowuje dzisiejszą semantykę
(przyznanie per pytanie), bo zmiana modelu treści to zakres Sophii + repack 58 atomów.
Do rozstrzygnięcia przed 1E.4 przez Ethana i Sophię.

**(c) 🟠 DRUGI DŁUG TEJ SAMEJ KLASY — `marketPercentage` z ciała żądania klienta.**
`src/app/api/onboarding/route.ts:38` przyjmuje `marketPercentage: z.number().int().min(0).max(100)`
i zapisuje **bez konfrontacji ze źródłem** (`:289`, `marketPercentage: c.marketPercentage`).
Wartość pochodzi z katalogu rynku serwowanego przez nasz własny `/api/onboarding/market-catalog`
i wraca do nas odbita od przeglądarki (`onboarding-wizard.tsx:454,468,482` —
`marketPercentage: item.demandPercentage`).
Skąd waga: ta liczba porządkuje priorytety luk studenta **i** trafia do panelu uczelni jako
agregat — `ROUND(AVG(gaps.market_percentage))` w `src/app/api/faculty/dashboard/route.ts:106`.
Czyli liczba pokazywana uczelni jako dowód dopasowania programu do rynku jest deklaracją
klienta, nie pomiarem. Dwa argumenty, że to naprawdę dług, a nie moja nadgorliwość:
(1) w tym samym pliku poziom kompetencji ma jawną precedencję „pomiar > deklaracja"
(`onboarding/route.ts:31–35` — *„serwer bierze poziom z result_json, klientowi nie ufa"*),
`marketPercentage` tę bramkę omija; (2) `src/lib/passport-verified.ts:122` wyprowadza
popyt serwerowo (`demandByName`) — właściwy wzorzec **już istnieje w repo**, tylko nie
został tu użyty. Naprawa jest prawdopodobnie czysto aplikacyjna (wyliczyć z katalogu po
stronie serwera, pole klienta zignorować) i nie ma nic wspólnego z tym PR-em.
**Zgłaszam do Ethana i Sophii jako osobne zadanie.**

---

## 9. Czego ten plan NIE domyka (nazwane, nie zamiecione)

1. **Nie dowodzi samodzielności studenta** i nie ma takiego celu. Student nadal może
   przeczytać rozwiązanie u kolegi. Cel jest węższy i sprawdzalny: liczba w bazie ma
   opisywać to, co **serwer wydał**, a nie to, co klient o sobie twierdzi.
2. **Podpowiedzi laba zostają jawne** (§8a) — świadomie poza zakresem.
3. **Historia odsłonięć nie powstaje** przy wariancie A. Jeśli 1E.4 zechce sygnału
   czasowego, potrzebna będzie druga migracja — koszt: ~pół dnia + runda z Ryanem.
   Dlatego decyzja A/B ma zapaść **przed** kodowaniem, nie w trakcie review.
4. **Okno wdrożeniowe:** między wdrożeniem a odświeżeniem otwartej karty przeglądarki
   stary klient nie woła `/hint` i jego odpowiedzi zapiszą się z `hint_depth = 0`,
   `source = 'server'` — technicznie prawda (serwer nie wydał żadnej podpowiedzi),
   ale przy realnym ruchu warto to odnotować w handoffie. Przy dzisiejszym ruchu
   (zero realnych studentów) nieistotne.
