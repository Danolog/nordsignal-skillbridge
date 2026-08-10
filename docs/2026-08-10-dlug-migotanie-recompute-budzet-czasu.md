# Dług: migotanie `recompute.integration.test.ts` — koszt testu rośnie z resztkami po innych plikach

**Założony:** 2026-08-10 (znalezisko Maxa przy PR #270, przekazane przez Olivera) · **Owner:** Quinn (QA)
**Decyzje zastrzeżone:** Leo (Tech Lead) — czy sprzątać w dziesięciu plikach źródłowych; Ethan (CTO) — budżet czasu projektu
**Status:** OTWARTY — diagnoza zmierzona, naprawa zaproponowana, nie wykonana (świadomie poza PR #268)
**Powiązane:** `vitest.config.mts` (projekt `integration`), `src/lib/market-refresh/recompute.ts`,
pamięć operacyjna „Baza testowa współdzielona psuje bramkę"

> **Słowniczek:** **budżet czasu (timeout)** = ile najdłużej wolno biec pojedynczemu testowi,
> zanim przebieg uzna go za nieudany; **migotanie (flake)** = test, który raz przechodzi, raz nie,
> bez zmiany w kodzie; **sekwencer** = część vitesta decydująca, w jakiej kolejności biegną pliki;
> **resztki** = wiersze zostawione w bazie przez wcześniejszy test.

---

## Diagnoza Maxa — potwierdzam mechanizm

`runMarketRecompute` przelicza **każdego studenta w bazie** (nagłówek `src/lib/market-refresh/recompute.ts`,
linia 5: „Recompute przelicza KAŻDEGO studenta"). Test AG.5 woła go trzy razy. Pliki integracyjne
biegną sekwencyjnie na jednej bazie (`fileParallelism: false`, `vitest.config.mts`), więc koszt tego
testu rośnie z liczbą studentów zostawionych przez pliki, które biegły **wcześniej**.

Budżet czasu projektu `integration` — zmierzony, nie założony:

```
$ grep -n 'testTimeout\|hookTimeout' vitest.config.mts
49:  testTimeout: 60_000,      # to projekt `evals`, nie `integration`
50:  hookTimeout: 300_000,     # j.w.
```

Projekt `integration` nie ustawia żadnego, czyli jedzie na domyślnym. Domyślny zmierzony sondą
z kontrolą dodatnią (test celowo śpiący 5 200 ms, czyli zjawisko na pewno występuje):

```
$ pnpm vitest run --project unit src/test/__tests__/TMP-pomiar-budzetu.test.ts
 FAIL  sonda: czy domyslny budzet czasu to 5000 ms   5024ms
 „If this is a long-running test, pass a timeout value as the last argument…"
```

**5 000 ms.** Pomiar 662 ms podany przez Maxa jest jego, nie mój — nie mam lokalnej bazy na porcie
5433 (`nc -z localhost 5433` → zamknięty), więc czasu przebiegu nie odtwarzałem. Oznaczam jako
niezweryfikowane po mojej stronie.

## Co dokładam do diagnozy — dwie rzeczy zmieniają wnioski

### 1. Źródłem resztek jest dziesięć konkretnych plików, nie „testy w ogóle"

```
$ pliki integracyjne wstawiające studentów : 42
$ z tego kasujące wiersz studenta          : 36
```

Dziesięć plików kasuje wiersze potomne (postępy, odpowiedzi, umieszczenia), ale **zostawia sam
wiersz studenta** — sprawdzone w treści, m.in. `curriculum.integration.test.ts` i
`placement-service.integration.test.ts` kasują po sobie wszystko poza `students`. Cztery z nich
(`src/app/api/curriculum/…`) sortują się przed `market-refresh`, więc trafiają przed recompute
w każdej kolejności opartej o ścieżkę.

### 2. Kolejność plików NIE jest stała — i to ona robi z tego migotanie, a nie powolność

Sekwencer vitesta 4.1.9 (`node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js`, `BaseSequencer.sort`)
ustala kolejność tak: najpierw pliki bez wpisu w pamięci podręcznej, potem **większe pliki
najpierw**, a gdy pamięć podręczna ma wyniki poprzedniego przebiegu — **wolniejsze najpierw**.

Konsekwencje, których sama diagnoza „koszt rośnie" nie oddaje:

- **CI i laptop mają inną kolejność.** CI startuje z zimną pamięcią podręczną i świeżym
  kontenerem; laptop ma ciepłą i porządkuje po czasach poprzedniego przebiegu.
- **Ten sam przebieg powtórzony daje inną kolejność**, bo pierwszy przebieg zapisuje czasy.
  Stąd „raz przechodzi, raz nie" przy zerowej zmianie w kodzie.
- **Lokalnie populacja rośnie MIĘDZY przebiegami**, bo baza na 5433 żyje dłużej niż przebieg;
  w CI jest ograniczona jednym przebiegiem na świeżym kontenerze. Pomiar lokalny 662 ms nie
  ogranicza więc kosztu w CI ani w drugą stronę — to dwa różne reżimy.

## Naprawa — co rekomenduję i czego świadomie NIE rekomenduję

**Odrzucam: zawężenie przeliczania w teście.** To jest tańsza droga i dlatego kusząca, ale kasuje
własność, dla której ten test istnieje: `expect(summary.studentsWithNewGaps).toBe(1)` oraz
„inni studenci bez zdarzeń" są twierdzeniami **o całej populacji**. Test przeliczający wyłącznie
własnego studenta przestaje dowodzić, że recompute-all nie szkodzi pozostałym — czyli zostaje
zielony test bez przedmiotu. To ta sama klasa błędu, którą zamyka PR #268.

**Odrzucam: podniesienie budżetu całemu projektowi `integration`.** Jeden `testTimeout` w konfiguracji
byłby najkrótszym diffem, ale rozluźnia budżet pozostałym 57 plikom, w tym takim, które powinny
paść, gdy zwolnią.

**Rekomenduję, w tej kolejności:**

1. **Jawny budżet dla trzech testów w tym pliku** (trzeci argument `it(…, 30_000)`), z komentarzem
   nazywającym powód: koszt jest liniowy względem liczby studentów w bazie, więc zależy od plików
   biegnących wcześniej. Doraźne, tanie, bez zmiany zachowania.
2. **Zamiana cichego przekroczenia budżetu na nazwaną porażkę.** Test zna `summary.students` —
   niech sprawdzi tę liczbę wobec jawnego sufitu i przy przekroczeniu powie wprost: „populacja
   zostawiona przez wcześniejsze pliki przekroczyła N, koszt tego testu rośnie liniowo, patrz
   ten dług". Bez tego następna osoba zobaczy wyłącznie „przekroczono 5 000 ms" i zacznie od
   podejrzewania recompute, czyli złego miejsca. To jest właściwa naprawa migotania: nie schowanie
   objawu, tylko zamiana go w komunikat, który wskazuje przyczynę.
3. **Sprzątanie u źródła — dziesięć plików kasuje wiersz studenta po sobie** (decyzja Leo).
   To jedyna zmiana, która ogranicza populację dla **wszystkich** testów, a nie tylko dla tego
   jednego, i jedyna, która zatrzymuje wzrost lokalny między przebiegami.

Punkty 1–2 to jedno wąskie zgłoszenie w pliku testu; punkt 3 osobne, bo dotyka dziesięciu plików
i wymaga sprawdzenia, czy któryś nie polega na cudzych resztkach.

**Świadomie poza PR #268** — tamten PR ma jedną tezę (brak bazy = porażka, nie ciche pominięcie)
i dokładanie do niego budżetów czasu zrobiłoby z przeglądu dwa tematy naraz.
