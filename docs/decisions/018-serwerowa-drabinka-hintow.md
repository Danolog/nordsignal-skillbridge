# ADR-018 — Serwerowa drabinka podpowiedzi: wariant migracji, semantyka głębokości i dyskryminator źródła

- **Status:** ZAAKCEPTOWANY — decyzja Ethana (CTO). Podstawa mandatu: `CLAUDE.md` v1.11 §5
  (decyzja techniczna w domenie Engineering); wykonanie migracji na produkcji objęte
  delegacją `CLAUDE.md` v1.12 (Ethan decyduje i wykonuje: scalenie, wdrożenie, baza NEON).
  **Nie wymaga sign-offu Darka.**
- **Data:** 2026-07-22 · **Autor:** Ethan (CTO)
- **Rozstrzyga:** dwie decyzje jawnie zostawione mi przez Leo w planie naprawy
  `docs/2026-07-22-dlug-hintdepth-plan-naprawy.md` §3 — (1) wariant migracji A vs B,
  (2) semantyka „sticky" — plus jego propozycję dyskryminatora źródła wartości (§2.1).
- **Powiązania:** ADR-014 (D5 wygaszanie rusztowania, D11 instrumentacja), ADR-015
  (kontrakt checków labów), plan 12 ustalenie wiążące nr 5, MIS.1 (migracja `0038`,
  kolumna `confidence` — precedens „NULL = sprzed flagi, nie zgadujemy").
- **Blokuje/odblokowuje:** 1E.4 (powtórki rozłożone w czasie / FSRS) — ścieżka krytyczna.
- **Wykonanie:** Max (cały PR end-to-end), Jack (review kroku 6), Leo (review wg 14 domen),
  Ryan (nota do macierzy RLS — bez sign-offu, patrz D1), Ethan (scalenie, migracja prod,
  wdrożenie, obserwacja).
- **Aktualizacja 2026-07-22 wieczór (po review Leo i sign-offie Ryana) — trzy poprawki,
  wszystkie PRZED startem Maxa:**
  **(A1)** dwie migracje `0039` + `0040` zamiast jednej — **potwierdzone wykonaniem**
  generatora, żadnego wyjątku od reguły „migracje tylko-do-dopisywania" (D3, sekcja
  „Jak to wychodzi z generatora");
  **(A2)** niezmiennik trwały to **`at.length ≤ d`**, nie równość — wybór zapisany jawnie,
  nie domyślny (D1);
  **(A3)** osłabione twierdzenie o odtwarzalności odczytu „per podejście" — dane dają je
  wyłącznie dla **pierwszego** odsłonięcia na danej głębokości (D2, argument 2). Decyzja
  bez zmian; zmienia się to, na czym wolno oprzeć cechę FSRS w 1E.4.
  Sign-off domeny ryzyka: `docs/security/hint-reveals-retencja-signoff.md` (GO warunkowe,
  8 warunków W-1..W-8 dla Maxa) — **żaden z warunków nie koliduje z tym ADR-em**, weryfikacja
  w sekcji 6.

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu): **podpowiedź / hint** — kolejny
> poziom pomocy przy pytaniu (0 = żadnej, 3 = pełne rozwiązanie); **głębokość / `hint_depth`** —
> ile podpowiedzi student odsłonił, zanim odpowiedział; **FSRS** — algorytm planujący powtórki
> (etap 1E.4), który tę liczbę ma zjadać jako cechę wejściową; **JSONB** — typ kolumny
> w PostgreSQL trzymający strukturę danych (tu: mapa „pytanie → co przyznano"); **migracja** —
> ponumerowana zmiana struktury bazy; **RLS** — reguły bazy pilnujące, że student widzi wyłącznie
> własne wiersze; **K-INT** — klasa tabel z danymi studenta (RLS obowiązkowe); **upsert** —
> zapis „wstaw albo zaktualizuj, jeśli wiersz już jest"; **backfill** — nadanie wartości wierszom,
> które powstały wcześniej.

---

## 1. Kontekst w jednym akapicie

`hint_depth` w `curriculum_item_answers` jest dziś liczbą, którą **klient sam o sobie deklaruje**
(`answer/route.ts:48,140`) — cała drabinka podpowiedzi, z pełnym rozwiązaniem włącznie, jedzie do
przeglądarki, a licznik jest stanem komponentu. Diagnoza, sekwencja wykonawcza i kontrakt trasy:
plan Leo, przyjmuję je bez zmian. Ten ADR rozstrzyga wyłącznie to, co Leo świadomie zostawił do
decyzji **przed kodowaniem** — bo dołożenie tego później to druga migracja i druga runda z domeną
bezpieczeństwa.

---

## 2. Decyzja

### D1 · Wariant A — kolumna na istniejącej tabeli postępu — z **bogatszym kształtem wartości**

Odrzucam wariant B (nowa tabela `curriculum_item_hint_reveals`). Przyjmuję wariant A, ale
**nie w kształcie zaproponowanym przez Leo** (`{ "<question_item_id>": <0..3> }`). Kształt wiążący:

```
curriculum_item_progress + hints_revealed_json jsonb NOT NULL DEFAULT '{}'::jsonb

{ "<question_item_id>": { "d": 0..3, "at": ["<iso8601>", …] } }
                          ^ maksymalna przyznana głębokość
                                      ^ znacznik czasu KAŻDEGO przyznania;
                                        NAJWYŻEJ `d` wpisów, dopisywany
                                        WYŁĄCZNIE gdy głębokość rośnie
```

**Niezmiennik wiążący: `at.length ≤ d` (A2, poprawka 2026-07-22).** Pierwsza wersja tego ADR-a
mówiła „dokładnie `d` wpisów". Leo zauważył, że nic tego nie egzekwuje, a Ryan rozstrzygnął to
od strony swojej domeny: retencja 12-miesięczna dla `at[]` (sign-off §2) **usuwa znaczniki
i zostawia `d`**, więc równość przestaje być prawdziwa dla wierszy starszych niż rok. Przyjmuję
jego sprostowanie i zapisuję wybór jawnie, zamiast zostawiać go domyślnym:

- **W chwili zapisu** (`grantNextHint`) obowiązuje **równość** — każdy wzrost głębokości dopisuje
  dokładnie jeden znacznik. To jest testowane (§5 pkt 6) i to jest kontrakt pisarza.
- **Jako niezmiennik trwały** obowiązuje **`at.length ≤ d`**. Krótsza lista to stan legalny
  (przycięcie retencyjne), **nigdy** błąd — czytelnik nie ma prawa jej odrzucić ani uznać za
  uszkodzoną. `d` pozostaje jedynym źródłem głębokości; `at` jest cechą pomocniczą o krótszym
  życiu niż wartość, którą opisuje.
- **Egzekwowanie: kod, nie komentarz.** Schemat Zod w `hints.ts` (jedyny pisarz i jedyny czytelnik,
  D3/D5) odrzuca `at.length > d` przy **zapisie i odczycie**; test jednostkowy: `{d:1, at:[t1,t2]}`
  → wyjątek, `{d:3, at:[]}` → przechodzi. Zapytanie wykrywające rozjazd na produkcji — §9
  sign-offu Ryana (wzorzec do skopiowania z `NOT IN ('d','at')`).
- **Świadomie BEZ ograniczenia `CHECK` w bazie.** Sprawdzenie „dla każdego klucza mapy" wymaga
  iteracji po kluczach JSONB, a `CHECK` w PostgreSQL nie przyjmuje podzapytań ani agregatów —
  zrobienie tego wymagałoby własnej funkcji `IMMUTABLE` w schemacie i utrzymywania jej przez
  migracje. Cena wyższa niż korzyść przy **jednym** pisarzu; bramką pozostaje `CHECK
  (jsonb_typeof(...) = 'object')` z D5 plus schemat Zod. Nazywam to tu wprost, żeby przyszły
  czytelnik nie odkrył tego jako niespodzianki.

**Dlaczego nie B.** Jedynym realnym argumentem za B był sygnał czasowy („ile trwało do pierwszej
podpowiedzi") dla FSRS/D5 — sam Leo tak to postawił: *„jeśli 1E.4 ma w planie cechę czasową,
wybieramy B teraz"*. Ten argument znika, gdy wartość w mapie jest obiektem, a nie liczbą.
`at` daje pełną historię odsłonięć: kiedy padło pierwsze, kiedy każde kolejne. B kosztowałby
politykę RLS + granty + wpis w `TENANT_TABLES` (`tools/k3-validate.ts`) + aktualizację
`docs/security/rls-matrix.md` + sign-off Ryana + test izolacji + rozszerzenie strażnika ingestu —
czyli dodatkowy punkt szeregowania na ścieżce krytycznej **za dane, które mieszczą się w kolumnie
na tabeli już objętej RLS**.

**Dlaczego to nie jest „JSON zamiast porządnego modelu".** Zbiór jest domknięty od góry przez
treść, nie przez zachowanie studenta: głębokość ≤ 3, więc na pytanie przypadają najwyżej 3 wpisy
`at`, a pozycja ma kilka pytań (M-EDA: 5 pozycji / 9 pytań). Rozmiar mapy jest ograniczony
zawartością modułu i **nie rośnie z liczbą kliknięć** — bo D2 (niemalejąca głębokość) sprawia,
że ponowne kliknięcie nie przyznaje nic nowego. To sprzężenie jest istotą decyzji: przy semantyce
„reset per podejście" historia byłaby nieograniczona i wtedy B byłby jedynym uczciwym wyborem.

**Konsekwencja dla Ryana:** zero nowej powierzchni RLS. `curriculum_item_progress` ma już
RLS ENABLE+FORCE, polityki `student_sees_own` + `owner_passthrough`, granty wg `0035_*.sql:164–186`
i figuruje w `TENANT_TABLES`. Ryan dostaje **notę do macierzy**, nie sign-off nowej tabeli.

**Nota do §8(b) planu Leo** (podpowiedzi są własnością pozycji, a głębokość mierzymy per pytanie):
wybrany kształt jest odporny na tę przyszłą zmianę — kluczem mapy jest `question_item_id`, więc
przejście treści na podpowiedzi per pytanie nie zmienia struktury magazynu ani migracji. To był
dodatkowy argument przeciw B (tam kolumna `question_item_id NULL` musiałaby zmienić znaczenie).

### D2 · Głębokość niemalejąca (sticky) per (student, pozycja, pytanie) — **przyjęta**

Zatwierdzam rekomendację Leo. Odświeżenie strony, nowa sesja ani nowe podejście nie zerują
przyznanej głębokości.

Argument Leo („wariant z resetem jest zerowalny przeładowaniem strony, czyli odtwarza ten sam
dług w nowym przebraniu") jest poprawny, ale **nie jest najmocniejszy** — reset per podejście
dałoby się zrobić uczciwie, gdyby serwer trzymał granicę podejścia. Rozstrzygają dwa inne:

1. **Asymetria kosztu błędu.** Sticky przeszacowuje trudność (student, który wczoraj zajrzał
   do rozwiązania, a dziś odpowiada z pamięci, zapisze `hint_depth = 3`). Skutek: FSRS zaplanuje
   powtórkę **częściej, niż trzeba**. Reset niedoszacowuje: materiał zostaje uznany za opanowany,
   bo odsłonięcie „się nie liczyło". Kosztem pierwszego błędu jest zmarnowana minuta studenta;
   kosztem drugiego — kompetencja uznana za posiadaną, której nie ma. Przy produkcie, którego
   wyjściem jest dowód kompetencji, tylko jeden z tych błędów wolno nam popełniać.
2. **Sticky + `at` jest bogatsze niż reset** — ale nie tak bogate, jak napisałem w pierwszej wersji.
   **Poprawka A3 (Leo, 2026-07-22).** Twierdzenie „analityka odtwarza odczyt »per podejście«"
   było **za mocne** i wycofuję je w tym kształcie. Skoro `at` dopisujemy **wyłącznie przy wzroście
   głębokości** (D1), to student, który wraca do materiału i odsłania podpowiedź, którą już
   kiedyś widział, **nie generuje żadnego wpisu** — z punktu widzenia danych to podejście wygląda
   na przebyte bez pomocy. Co `at` daje naprawdę:

   - **daje:** moment **pierwszego** odsłonięcia na każdej głębokości (0→1, 1→2, 2→3), czyli
     „kiedy student po raz pierwszy potrzebował pomocy tego poziomu" i odstęp od poprzedniego;
   - **nie daje:** liczby ani czasu **powtórnych** odsłonięć tej samej podpowiedzi, więc pytanie
     „czy w oknie TEGO podejścia padło jakiekolwiek odsłonięcie" ma odpowiedź pewną tylko
     wtedy, gdy w tym oknie głębokość **wzrosła**. W przeciwnym razie odpowiedź brzmi
     „nie wiem", a nie „nie padło".

   **Decyzji to nie zmienia** — broni jej argument 1 (asymetria kosztu błędu), który stoi
   samodzielnie. Zmienia natomiast to, **na czym wolno oprzeć cechę FSRS w 1E.4**: cecha
   „czy w tym podejściu korzystał z pomocy" **nie ma pokrycia w danych** i nie wolno jej
   zaplanować bez wcześniejszej zmiany reguły zapisu. Cechy z pokryciem: `d` (maksymalna
   przyznana głębokość — sticky, zawsze) oraz „czas od pierwszego odsłonięcia danego poziomu".
   Zapisuję to tutaj, bo dokładnie ten typ cichego założenia kosztuje później przeprojektowanie
   modelu: 1E.4 przeczyta ADR, nie pamięć zespołu.

   **Gdyby 1E.4 uznało, że potrzebuje pełnej historii kliknięć** — to jest zmiana reguły zapisu
   („dopisuj `at` przy każdym odsłonięciu"), która **znosi ograniczenie rozmiaru mapy** będące
   fundamentem odrzucenia wariantu B (D1) i unieważnia podstawę sign-offu Ryana (minimalizacja
   przy zbiorze domkniętym od góry). Wtedy właściwą odpowiedzią jest **wariant B z osobną tabelą
   i własną retencją**, a nie rozpychanie JSONB-a. To jest jedyny warunek, przy którym D1 się
   otwiera — nazwany, żeby nikt nie musiał go odkrywać po fakcie.

Skutek uboczny z §3 planu Leo (odsłonięcie sprzed miesiąca podbija dzisiejszą odpowiedź)
**akceptuję świadomie** — jest ceną punktu 1.

### D3 · Dyskryminator `hint_depth_source` — przyjęty **z jedną poprawką: po backfillu kasujemy domyślną wartość**

Przyjmuję kolumnę `hint_depth_source text NOT NULL` z `CHECK (hint_depth_source IN ('client','server'))`
oraz zasadę, że wiersze sprzed naprawy dostają `'client'` **z domyślnej wartości, bez ani jednego
`UPDATE` na danych historycznych** (precedens MIS.1: nie zgadujemy wstecz). Odrzucam wariant tańszy
(„prod jest pusty, wystarczy data scalenia") z tego samego powodu co Leo: przenosi rozróżnienie
z danych do folkloru zespołu.

**Poprawka wiążąca.** Domyślna wartość `'client'` **nie może zostać w schemacie na stałe**.
Migracja `0039` wykonuje dwa kroki na tej kolumnie:

```sql
ALTER TABLE curriculum_item_answers
  ADD COLUMN hint_depth_source text NOT NULL DEFAULT 'client';   -- backfill historii
ALTER TABLE curriculum_item_answers
  ALTER COLUMN hint_depth_source DROP DEFAULT;                   -- od teraz: deklaruj jawnie
```

**Jak to wychodzi z generatora — A1, zweryfikowane wykonaniem 2026-07-22 (Ethan).**
Leo słusznie zauważył, że **dwa polecenia `ALTER` na jednej kolumnie nie wyjdą z jednego przebiegu
`pnpm db:generate`** (generator porównuje schemat z migawką — w jednym porównaniu kolumna albo ma
domyślną wartość, albo jej nie ma), a ręczna edycja pliku migracji jest zablokowana hookiem
(`.claude/settings.json`, `deny`, „migracje są tylko-do-dopisywania" — incydent dziennika
2026-07-02). Jego propozycja: **dwie migracje, `0039` i `0040`**. Nie potwierdził jej jednak
wykonaniem — a wisiało na niej pytanie, czy generator w ogóle **emituje `DROP DEFAULT`** przy
usunięciu `.default()` ze schematu. Sprawdziłem to na izolowanej kopii (drizzle-kit **0.31.9**,
ta sama wersja co w repo; osobny katalog `out`, dziennik repo nietknięty):

| Krok | Schemat | Wygenerowany SQL |
|---|---|---|
| 0 | tabela bez kolumny | `CREATE TABLE …` (punkt odniesienia) |
| **1** | `text("hint_depth_source").notNull().default("client")` | `ALTER TABLE "curriculum_item_answers" ADD COLUMN "hint_depth_source" text DEFAULT 'client' NOT NULL;` |
| **2** | `.default("client")` **usunięte** ze schematu | `ALTER TABLE "curriculum_item_answers" ALTER COLUMN "hint_depth_source" DROP DEFAULT;` |

**Rozstrzygnięcie: propozycja Leo działa, wyjątku od reguły append-only NIE ma i nie będzie.**
Max wykonuje `pnpm db:generate` **dwa razy** — najpierw ze schematem z domyślną wartością (`0039`),
potem po jej usunięciu ze schematu (`0040`) — i **nie tyka ręcznie żadnego pliku migracji**.
Numeracja: dziennik kończy się na `idx: 38`, więc `0039` i `0040` to kolejne wolne numery.

**Czy `DROP DEFAULT` nie zablokuje się o bramkę — sprawdzone, nie założone.** Fraza zawiera słowo
`DROP`, więc pytanie jest zasadne. (a) Hook komend Bash w repo nadrzędnym (`hooks/guard-bash.py`)
łapie wyłącznie wzorzec `DROP (TABLE|DATABASE|SCHEMA|INDEX)` — `ALTER COLUMN … DROP DEFAULT` **nie
pasuje** i nie wywoła pauzy. (b) `pnpm db:migrate` (`tools/db-guard-migrate.ts`) bramkuje **host**
(zdalny wymaga `CONFIRM_PROD_DB=1`), a nie treść SQL. Wniosek: migracja `0040` przechodzi normalną
ścieżką, bez obchodzenia czegokolwiek. Gdyby któraś bramka jednak zareagowała — **eskalacja, nie
obejście** (`CLAUDE.md` v1.12).

Sprawdziłem też wariant przeciwny (kolumna dodana od razu jako `NOT NULL` bez domyślnej wartości,
jedna migracja): generator emituje `ADD COLUMN "hint_depth_source" text NOT NULL`, co na tabeli
z jakimikolwiek wierszami kończy się błędem PostgreSQL („column contains null values"). Na
produkcji przeszłoby dziś przypadkiem (0 wierszy), a wywaliłoby się na bazie lokalnej i w CI —
i **nie oznaczyłoby historii**, czyli straciłoby cały sens D3. Ten wariant jest odrzucony
dowodem, nie przeczuciem.

Uzasadnienie poprawki: `NOT NULL` **bez** domyślnej wartości zmusza każdego przyszłego pisarza do
zadeklarowania źródła — pominięcie kończy się błędem zapisu (głośno, natychmiast), a nie cichym
oznaczeniem świeżego pomiaru serwerowego jako `'client'`. Zostawiony `DEFAULT 'client'` to pułapka
z opóźnionym zapłonem: pierwszy zauważy ją ktoś, kto za pół roku policzy krzywą zapominania na
zbiorze, z którego połowa pomiarów wypadła jako „sprzed naprawy". Odwrotność (`DEFAULT 'server'`)
jest gorsza — mianowałaby niezmierzone wartości pomiarem. Trasa `answer` jest jedynym pisarzem
tej tabeli, więc koszt jawnej deklaracji to jedno pole w jednym miejscu.

**Egzekwowanie reguły odczytu — maszynowo, nie komentarzem.** Zasada Leo („FSRS i analityka czytają
wyłącznie `hint_depth_source = 'server'`; `'client'` = głębokość nieznana, nigdy zero") jest słuszna,
ale zapisana w prozie nie jest bramką. Wymagam:
- jednego miejsca odczytu w kodzie (helper w `src/lib/curriculum/hints.ts`, np. `readMeasuredHintDepths`),
  które ten filtr nakłada — żaden konsument nie pisze zapytania samodzielnie;
- testu jednostkowego: wiersz `'client'` z `hint_depth = 0` **nie pojawia się** w wyniku helpera
  (a nie: „pojawia się jako zero");
- komentarza przy kolumnie w `schema.ts` odsyłającego do tego ADR-a.

**Bramka przed scaleniem** — zostaje jak u Leo: `SELECT count(*) FROM curriculum_item_answers`
na produkcji, liczba wpisana do opisu PR-a. Wykonuję ją ja przy scalaniu (delegacja v1.12).

### D4 · Upsert wiersza postępu przy odsłonięciu — znalezisko spoza planu

Wariant A zapisuje do `curriculum_item_progress`, a **odsłonięcie podpowiedzi może być pierwszą
interakcją studenta z pozycją** — wiersza postępu jeszcze wtedy nie ma. Plan Leo tego nie nazywa,
a jest to jedyne realne ryzyko wariantu A. Reguły wiążące dla `grantNextHint`:

- upsert `ON CONFLICT (student_id, item_id)` — jak `recordAttempt` (`completion.ts:86–103`);
- przy **wstawieniu** status = `'in_progress'`, **nigdy** domyślny `'locked'`. Dziś
  `getItemLadder` (`ladder.ts:227–250`) wyprowadza dostępność z sekwencji, więc wiersz `'locked'`
  nie zablokowałby pozycji — ale opiera się to na jednej linijce derywacji. Nie zostawiam min
  pod przyszły refaktor, który uwierzy zapisanemu statusowi dosłownie;
- **`attempts` NIE rośnie** i `last_answer_at` pozostaje nietknięty — odsłonięcie podpowiedzi
  nie jest podejściem. Test: odsłonięcie ×3 → `attempts = 0`;
- guard przed cofnięciem statusu — `CASE WHEN status IN ('completed','skipped_by_placement')
  THEN status ELSE 'in_progress' END`, dokładnie jak w `recordAttempt`.

### D5 · Współbieżność, walidacja kształtu, limit żądań

- **Wyścig dwóch kliknięć.** Dopuszczam obie drogi: jednoinstrukcyjny `jsonb_set` z `GREATEST`
  albo odczyt-zapis w **jednej transakcji** z `SELECT … FOR UPDATE` na wierszu postępu.
  Zapis warunkowy `at` (dopisz tylko przy wzroście) jest w jednej instrukcji nieczytelny, a
  czytelność kodu, który pilnuje uczciwości pomiaru, ma wartość. Wiążący jest **dowód, nie forma**:
  test „dwa równoległe żądania → głębokość 2 i dokładnie 2 wpisy `at`".
- **Walidacja kształtu.** `CHECK (jsonb_typeof(hints_revealed_json) = 'object')` w migracji +
  schemat Zod przy odczycie w `hints.ts` (błąd kształtu = wyjątek, nigdy ciche `?? 0`) +
  przycięcie do `min(hints.length, 3)` przy zapisie. Twardą bramką zakresu pozostaje istniejące
  ograniczenie `curriculum_item_answers_hint_depth_range` na kolumnie mierzonej — mapa JSONB
  jest stanem pośrednim, a nie źródłem, z którego czyta FSRS.
- **Limiter `hintReveal: slidingWindow(60, "1 m")`** — przyjmuję. Uwaga do wykonania:
  `makeLimiter` zwraca `null`, gdy Redis nie jest skonfigurowany (`rate-limit.ts:39`), więc limiter
  jest obroną przed obciążeniem bazy, **nie** gwarantem poprawności. Gwarantem jest idempotencja
  z D2: pętla kliknięć nie przyrasta danych, tylko powtarza ten sam zapis.

---

## 3. Alternatywy rozważone i odrzucone

| Wariant | Dlaczego odrzucony |
|---|---|
| **B — nowa tabela `curriculum_item_hint_reveals`** | Jedyna przewaga (historia czasowa) osiągnięta w A przez kształt wartości (D1). Koszt realny: polityki RLS + granty + `TENANT_TABLES` + macierz v0.28 + sign-off Ryana + test izolacji + strażnik ingestu = dodatkowy punkt szeregowania na ścieżce krytycznej 1E.4. |
| **A w kształcie Leo (`{qid: <int>}`)** | Tańszy o zero, a zostawia otwarte ryzyko drugiej migracji, dla którego Leo sam kazał wybierać B. Wyższa cena za mniej informacji. |
| **Reset głębokości per podejście** | Niedoszacowuje trudności (błąd w kierunku „opanowane, choć nie jest"), traci historię bezpowrotnie i wymaga serwerowej granicy podejścia, której dziś nie ma. |
| **Bez dyskryminatora („prod pusty, wystarczy data scalenia")** | Rozróżnienie żyje w pamięci zespołu, nie w danych. Bazy lokalne i CI mają wiersze mieszane. |
| **`DEFAULT 'client'` zostaje na stałe** | Cicho mislabeluje przyszłe pomiary serwerowe jako sprzed naprawy. Patrz D3. |

---

## 4. Konsekwencje

**Dla planu Leo — co się zmienia:**
1. Krok 1 (schemat + migracja `0039`): kolumna `hints_revealed_json` w kształcie z D1 (obiekt,
   nie liczba); `hint_depth_source` z **dwoma** krokami `ALTER` (D3); `CHECK` na `jsonb_typeof`.
   Kolejny wolny numer migracji potwierdzony: dziennik `drizzle/meta/_journal.json` kończy się
   na `idx: 38` (`0038_black_absorbing_man`).
2. Krok 2 (`src/lib/curriculum/hints.ts`): dochodzi zapis znaczników czasu, reguły upsertu z D4
   i helper odczytu z filtrem `'server'` (D3). Testy: monotoniczność, `attempts = 0` po odsłonięciach,
   dwa równoległe → 2, wiersz `'client'` niewidoczny dla helpera.
3. Kroki 3–8: **bez zmian**, łącznie z „jeden PR" (§7), obsadą (Max prowadzi, Jack review kroku 6,
   Leo review 14 domen) i sekwencją produkcyjną. Rozbicie na dwa PR-y było uwarunkowane wariantem B —
   odpada.
4. Szacunek Leo (9–11 plików, ~230 linii kodu + ~260 testów, 1 dzień Maxa + pół dnia review)
   pozostaje w mocy; D1/D4 dokładają ~pół godziny, nie dzień.
5. Ryan: nota do macierzy RLS zamiast sign-offu (D1). `docs/security/rls-matrix.md` bez zmian
   strukturalnych — dopisek o nowej kolumnie na tabeli już objętej.

**Czego ten ADR nie domyka (nazwane, nie zamiecione):**
- Definicja cechy FSRS („czy używamy `d`, czy `d` w oknie podejścia z `at`") zostaje otwarta do
  1E.4 — celowo, bo dane pozwalają na oba odczyty.
- §8(a) planu — laby pokazują pełne rozwiązanie obok bramki postępu — zostaje poza zakresem;
  to pytanie dydaktyczne do Sophii, nie dług pomiarowy.
- §8(c) — **`marketPercentage` przyjmowany z ciała żądania klienta** (`onboarding/route.ts:38,289`)
  i agregowany do panelu uczelni (`faculty/dashboard/route.ts:106`). Przyjmuję zgłoszenie Leo.
  Ocena stawki: to dług **wyższej wagi na jednostkę pracy** niż `hintDepth` — liczba, którą
  pokazujemy uczelni jako dowód dopasowania programu do rynku, jest deklaracją przeglądarki, a
  właściwy wzorzec serwerowy (`passport-verified.ts:122`, `demandByName`) już w repo istnieje.
  Naprawa prawdopodobnie czysto aplikacyjna, zero migracji. **Osobne zadanie, poza tym PR-em**;
  wchodzi do kolejki zaraz po nim, przed 1E.4.

**Rollback.** Migracja jest w całości addytywna: dwie kolumny, zero zmian istniejących.
Wycofanie = revert PR-a; kolumny zostają puste i nieczytane (kolumn nie kasujemy — migracje są
tylko-do-dopisywania).

---

## 5. Weryfikacja (kryteria „zrobione" — dla Maxa i Leo)

1. `\d curriculum_item_progress` na bazie lokalnej `:5433` pokazuje `hints_revealed_json jsonb NOT NULL DEFAULT '{}'::jsonb`
   i ograniczenie `jsonb_typeof`.
2. `\d curriculum_item_answers` pokazuje `hint_depth_source text NOT NULL` **bez** `DEFAULT`
   oraz `CHECK … IN ('client','server')`.
3. Wiersz wstawiony przed migracją ma po migracji `hint_depth_source = 'client'` — bez żadnego
   `UPDATE` w pliku migracji (`grep -c UPDATE drizzle/0039_*.sql` → `0`).
4. `INSERT` do `curriculum_item_answers` bez podania `hint_depth_source` **kończy się błędem**
   (test integracyjny — to jest dowód poprawki z D3).
5. POST `/hint` ×2, potem POST `/answer` z jawnie sfałszowanym `hintDepth: 0` → wiersz ma
   `hint_depth = 2`, `hint_depth_source = 'server'` (test Leo, krok 5 — bez zmian).
6. Dwa równoległe POST `/hint` → `d = 2` i **dokładnie 2** wpisy `at`.
7. Odsłonięcie ×3 na pozycji bez wcześniejszej odpowiedzi → wiersz postępu istnieje ze statusem
   `in_progress` i `attempts = 0`; pozycja jest na drabinie nadal dostępna (nie `locked`).
8. `pnpm tsx tools/k3-validate.ts` zielone bez zmian w listach (wariant A nie dodaje tabeli).
9. `expect(JSON.stringify(body)).not.toContain(<tekst nieodsłoniętej podpowiedzi>)` na
   `GET /api/curriculum/items/[id]` — dowód zamknięcia wycieku (krok 4 Leo, bez zmian).
10. **(A2)** `{ d: 1, at: [t1, t2] }` → schemat Zod **rzuca** (niezmiennik `at.length ≤ d`);
    `{ d: 3, at: [t1] }` (stan po przycięciu retencyjnym) → **przechodzi**. Dwa testy, nie jeden —
    pierwszy pilnuje niezmiennika, drugi pilnuje, że przycięcie NIE jest traktowane jak awaria.
11. **(A1)** `drizzle/0039_*.sql` zawiera `ADD COLUMN … DEFAULT 'client' NOT NULL`, a
    `drizzle/0040_*.sql` — `ALTER COLUMN … DROP DEFAULT`. Oba pliki **wygenerowane**
    (`pnpm db:generate` ×2), żaden nie edytowany ręcznie; `drizzle/meta/_journal.json` ma
    `idx: 39` i `idx: 40` w kolejności.

---

## 6. Warunki Ryana (sign-off retencji) — sprawdzenie kolizji z tym ADR-em

Przeszedłem osiem warunków W-1..W-8 z `docs/security/hint-reveals-retencja-signoff.md` §6 pod
kątem sprzeczności z decyzjami D1–D5. **Kolizji nie ma — trzy warunki zawężają to, co ADR
zostawiał szerzej, i te zawężenia przyjmuję jako wiążące.** Max wykonuje jedno i drugie; przy
rozbieżności wygrywa wersja węższa.

| Warunek | Relacja do ADR-018 | Rozstrzygnięcie |
|---|---|---|
| **W-1** ciało `POST /hint` `.strict()`, znacznik wyłącznie z zegara serwera | dokłada się do D5 (walidacja kształtu) | przyjęty; spójny z sensem całego PR-a — nie przyjmujemy od klienta ani liczby, ani czasu |
| **W-2** UTC, pełne sekundy, bez milisekund | **zawęża** D1 (`<iso8601>` było szersze) | **wiążący format W-2**; ADR nie miał tu preferencji, sign-off ma uzasadnienie (minimalizacja precyzji) |
| **W-3** jeden schemat Zod, `.strict()`, `.max(3)`, `at.length ≤ d` w `refine` | **to jest maszynowe wykonanie A2** | przyjęty w całości; §5 pkt 10 to jego kryterium odbioru |
| **W-4** komentarz-wyzwalacz przy kolumnie | dokłada się do D1 | przyjęty; ADR jest w nim cytowany jako podstawa ograniczoności struktury |
| **W-5** zero wpisów do `audit_log` | ADR nie żądał audytu; W-5 czyni zakaz jawnym | przyjęty bez zastrzeżeń — argument o nieusuwalności wiersza `audit_log` jest mocny |
| **W-6** znaczniki nie opuszczają serwera + nota do macierzy RLS | **zawęża** D1 („zero nowej powierzchni RLS" → plus zakaz wynoszenia wartości) | przyjęty; kontrakt tras Leo (§4–§5 planu) już tego nie łamie |
| **W-7** jedyny czytelnik kolumny w `src/lib/curriculum/hints.ts` | **rozszerza** helper z D3 (filtr `'server'`) na cały dostęp do kolumny | przyjęty; jeden czytelnik zamiast dwóch reguł to upraszczenie, nie koszt |
| **W-8** wiersze w rejestrze retencji + zdanie dla studenta w `item-runner.tsx` | **rozszerza zakres PR-a** poza to, co ADR §4 pkt 3 zapisał jako „kroki 3–8 bez zmian" | przyjęty — **to jedyna realna zmiana zakresu**: dochodzą dwa wiersze w `docs/data/retention.md` i jedno zdanie w UI (treść: Sophia; jeśli nie zdąży, wchodzi wersja z §4.2 sign-offu). Krok 6 (review Jacka, dostępność) obejmuje też to zdanie i jego `aria-live`. |

**Skutek retencji dla 1E.4 — nazywam wprost, bo wynika ze złożenia A3 i W-8a:** znaczniki `at`
żyją **12 miesięcy**, a `d` bezterminowo (do końca życia konta). Cecha „czas od pierwszego
odsłonięcia" jest więc dostępna **wyłącznie w oknie rocznym**; model powtórek nie może na niej
polegać dla materiału starszego. `d` takiego ograniczenia nie ma i pozostaje cechą podstawową.

**Eskalacja E-1 z sign-offu (brak klauzuli informacyjnej art. 13) NIE blokuje tego PR-a** —
jest sprawą Darka i zakresu produktu, nie warunkiem wykonania serwerowej drabinki. Odnotowuję
ją tutaj wyłącznie po to, żeby nie zniknęła między dokumentami.

---

## 7. Stan startowy dla Maxa

**Max może zaczynać.** Wszystkie trzy pytania, które wisiały przed kodowaniem (A1 kształt migracji,
A2 niezmiennik, A3 siła twierdzenia o odtwarzalności), są rozstrzygnięte tym dokumentem, a warunki
domeny ryzyka sprawdzone pod kątem kolizji (sekcja 6). Wejście: plan Leo
(`docs/2026-07-22-dlug-hintdepth-plan-naprawy.md`, kroki 1–8) czytany **razem** z sekcją 4 tego
ADR-a i §6 sign-offu Ryana. Kolejność: migracje `0039`+`0040` (dwa przebiegi generatora, zero
ręcznej edycji plików migracji) → `hints.ts` → trasy → UI → testy.

Bramka przed scaleniem bez zmian: `SELECT count(*) FROM curriculum_item_answers` na produkcji,
liczba w opisie PR-a; wykonuję ją ja (delegacja `CLAUDE.md` v1.12).
