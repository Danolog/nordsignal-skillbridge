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
                                        dokładnie `d` wpisów, dopisywany
                                        WYŁĄCZNIE gdy głębokość rośnie
```

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
2. **Sticky + `at` jest ściśle bogatsze niż reset.** Mając znaczniki czasu przyznań, analityka
   odtwarza odczyt „per podejście" (czy w oknie tego podejścia padło jakiekolwiek odsłonięcie
   i ile), a z zapisu zresetowanego nie odtworzy historii nigdy. Wybieramy reprezentację, która
   zachowuje **oba** odczyty, i zostawiamy definicję cechy FSRS otwartą do 1E.4.

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

Uzasadnienie: `NOT NULL` **bez** domyślnej wartości zmusza każdego przyszłego pisarza do
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
