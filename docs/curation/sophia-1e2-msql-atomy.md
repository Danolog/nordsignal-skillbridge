# 1E.2 · Moduł M-SQL „SQL: analiza danych w bazie" — treść atomów + rampa capstone'u

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z 31/31 checkami na prawdziwym
DuckDB + research zasobów PL; przebieg na końcu dokumentu); przed
ingest 1E.2: TODO z notatek (notebooki, skrypt ładujący NYC z przypiętym
miesiącem, seanse wideo).
**Podstawa:** ADR-014 D1/D3/D5/D6.5; prerekwizyt: **M-EDA zaliczony**
(Git/GitHub z EDA.2, wnioski/hipotezy z EDA.3 — capstone SQL ich używa).
**Środowisko (zweryfikowane 2026-07-11):** DuckDB **1.3.2 jest
preinstalowany w Colab** (oficjalny pip-freeze backend-info) — zero
instalacji; `duckdb.sql("...")` odpytuje DataFrame'y z sesji PO NAZWIE —
bezpośredni most z M-PD. Wszystkie zapytania treści wykonane na
prawdziwym silniku (DuckDB 1.5.4 lokalnie; składnia wspólna z 1.3.2).

## Audyt pojemności D10 (wymóg ADR wprost dla M-SQL)

ADR-014 D10 flaguje ten moduł imiennie: droga „czym jest tabela" →
„funkcje okna wymagane rubryką" musi się zbilansować. Dekompozycja
rubryki (`ds-sql-analiza-przejazdow`: poprawność/czytelność 30, funkcje
okna 30, wnioski 20, reprodukowalność 20) + przepływu projektu:

| # | Koncept wymagany | Pokrycie |
|---|---|---|
| S1 | baza/tabela/zapytanie, SELECT-FROM-LIMIT, silnik w notebooku | **NOWY → SQL.1** |
| S2 | filtrowanie WHERE + porządek ORDER BY | **NOWY → SQL.2** (mostek: maski PD.3) |
| S3 | agregacje + GROUP BY + aliasy | **NOWY → SQL.3** (mostek: groupby PD.6) |
| S4 | JOIN + ziarno wiersza + iloczyn kartezjański | **NOWY → SQL.5** (briefing theory_md pogłębia ziarno) |
| S5 | funkcje okna (ROW_NUMBER/RANK/SUM OVER) | **NOWY → SQL.6** |
| S6 | czytelność zapytań (wcięcia, aliasy, komentarze) | materia KAŻDEGO atomu + zasada modułu, nie osobny koncept |
| S7 | wnioski z danych w raporcie | EDA.3 (hipotezy) + kontekst capstone'u |
| S8 | repro: skrypt ładujący, pliki .sql, README, Git | EDA.2 (Git/README) + kroki capstone'u; „optymalizacja najcięższych zapytań" jest w OPISIE projektu, ale NIE w kryteriach rubryki — poza modułem (jawnie) |

**Bilans: 5 nowych atomów = mieści się w widełkach D1 (5–6) — bez
podziału modułu.** Wynik audytu zapisany tu (osobny dokument niepotrzebny
— drabina bez zmian).

---

## Zasady modułu M-SQL

- **Struktura:** 5 atomów `exercise` + 2 laby + **egzamin 15 pytań × 2
  warianty, próg ≤1 błąd** (jak F1–F3) + przegląd przed egzaminem +
  **capstone** (pozycja `project` w drabinie — position 100). Zaliczenia:
  atomy — licznik M10; laby — pieczątka+token; capstone — kamienie +
  submit (wariant C).
- **Nowy JĘZYK w komórce:** SQL żyje w tekście podawanym do
  `duckdb.sql("...")` — jak `!` w PD.1 był mową do systemu, tak ten
  tekst jest mową do silnika SQL. Wewnątrz obowiązują reguły SQL, nie
  Pythona (o różnicach — atomy).
- **Zasada czytelności (S6, rubryka 30%):** od pierwszego atomu zapytania
  piszemy wielopoliniowo — słowa kluczowe WIELKIMI, każda klauzula od
  nowej linii, aliasy tam, gdzie skracają; drabinki egzekwują.
- **Dane przewodnie:** mini-świat capstone'u — tabele `przejazdy`
  (5 wierszy: id, strefa_id, minuty, kwota, godzina) i `strefy`
  (3 wiersze: strefa_id, nazwa) jako DataFrame'y w sesji (ciągłość M-PD);
  capstone przenosi te same wzorce na próbkę NYC TLC.
- **Fading (D5a):** SQL.1–SQL.2 pełne WE → SQL.3 completion → SQL.4
  lab-szkielet → SQL.5 luki w środku → SQL.6 backward completion →
  SQL.7 lab samodzielny → capstone z rubryką.
- **Koncepty kluczowe (≤4 — D6.3):** `sql-select-zapytanie` (SQL.1),
  `sql-group-by-agregacja` (SQL.3), `sql-join-ziarno` (SQL.5),
  `sql-funkcje-okna` (SQL.6). SQL.2 (`sql-where-order`) — koncept zwykły.
- **Przegląd przed egzaminem (reuse):** PD.3-P1, PD.6-P2, EDA.3-P3,
  SQL.1-P2, SQL.2-P1, SQL.2-P3, SQL.3-P2, SQL.5-P1, SQL.5-P3, SQL.6-P2
  (10 pytań; konfiguracja pozycji).
- **Sesja i czas:** 9 pozycji ≈ 4–5 sesji (suma szacunków ~140–155 min
  z przeglądem i egzaminem); capstone ~4 h estymaty projektu.

---

## Atom SQL.1 — Zapytanie: powiedz tabeli, czego chcesz

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`sql-select-zapytanie` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Zadasz tabeli pierwsze zapytanie SQL — `SELECT … FROM … LIMIT` —
i zrozumiesz, czym język deklaratywny („czego chcę") różni się od
Pythona („jak to policzyć").

### Teoria

Większość danych w firmach nie leży w plikach, tylko w **bazach danych**
— a z bazami rozmawia się w języku **SQL** (czytaj: „es-ku-el").
Briefing Twojego capstone'u nazywa go codziennym językiem analityka —
i używa się go INACZEJ niż Pythona: nie opisujesz krok po kroku, JAK
policzyć (pętle, akumulatory), tylko deklarujesz, CZEGO chcesz —
a silnik sam wymyśla wykonanie.

Silnik masz pod ręką: **DuckDB** jest w Colab preinstalowany i — uwaga,
to zrobi Ci dzień — **widzi DataFrame'y z Twojej sesji po nazwie**:

```python
import duckdb

duckdb.sql("""
    SELECT id, kwota             -- które kolumny chcę
    FROM przejazdy               -- z której tabeli
    LIMIT 3                      -- ile wierszy na początek
""")
```

**Przewidź:** `przejazdy` to DataFrame z sesji (5 wierszy). Co zwróci to
zapytanie? A co zwróciłby `SELECT * FROM przejazdy`?

Trzy pierwsze wiersze z dwiema kolumnami — oraz, w drugiej wersji,
wszystkie kolumny (`*` czytaj: „wszystko"). Rozbiór:

- Tekst w potrójnych cudzysłowach to **zapytanie** — mowa do silnika SQL,
  nie do Pythona (jak `!` w PD.1 był mową do systemu). Same potrójne
  cudzysłowy to Pythonowy zapis tekstu WIELOLINIJKOWEGO — dzięki nim
  zapytanie łamie się na czytelne wiersze (zwykłe cudzysłowy z F1.3 nie
  przeżyłyby końca linii). Wewnątrz obowiązuje składnia SQL: klauzule,
  nie instrukcje.
- **`SELECT`** wymienia kolumny (albo `*`), **`FROM`** wskazuje tabelę,
  **`LIMIT`** ucina podgląd — odpowiednik `head()` z PD.2, i tak samo
  obowiązkowy nawyk przy pierwszym kontakcie z tabelą.
- Wielkie litery słów kluczowych to KONWENCJA czytelności (silnik
  przyjmie i małe): SELECT/FROM/LIMIT wielkimi, nazwy kolumn i tabel —
  jak w danych. Każda klauzula od nowej linii, komentarze po `--` —
  Twoje zapytania mają wyglądać tak od dziś, bo rubryka capstone'u daje
  30% punktów właśnie za czytelność.
- Kolejność klauzul jest sztywna: SELECT → FROM → (reszta, którą
  poznasz) → LIMIT na końcu.

Skąd silnik zna tabelę `przejazdy`? DuckDB zagląda do Twojej sesji
Pythona: DataFrame o tej nazwie staje się tabelą. Działa to też
w drugą stronę — wynik zapytania odbierzesz jako DataFrame metodą
`.df()` i dalej rysujesz go wykresem z PD.7: dwa języki, jedna analiza.
Ta integracja oszczędza w pilocie całą instalację baz — a wzorce
zapytań są te same, które na capstonie puścisz na próbce prawdziwych
przejazdów NYC.

### Pytania (retrieval)

**P1. Czym zapytanie SQL różni się od Twojej pętli z F2/F3?**

- A. Niczym — SQL to skrót na pętle — *Nie — różnica jest zasadnicza:
  w SQL nie piszesz JAK liczyć; silnik sam dobiera wykonanie do Twojego
  „czego chcę".* (diagnoza: nie widzi zmiany paradygmatu)
- B. **Pętla opisuje wykonanie krok po kroku; zapytanie DEKLARUJE
  oczekiwany wynik, a wykonanie wymyśla silnik** ✓ — *Tak — dlatego
  w SQL myśli się zbiorami wierszy, nie obrotami pętli.*
- C. SQL działa tylko na małych danych — *Nie — odwrotnie: silniki SQL
  są budowane właśnie do dużych danych; to podgląd ograniczasz LIMIT-em.*
  (diagnoza: myli LIMIT podglądu z limitem możliwości)
- D. Zapytanie zmienia tabelę, pętla nie — *Nie — SELECT niczego nie
  zmienia: czyta i zwraca wynik; tabela źródłowa zostaje nietknięta
  (jak filtry w PD.3).* (diagnoza: SELECT mylony z edycją danych)

**P2. Skąd DuckDB w Colab „zna" tabelę `przejazdy`?**

- A. Pobiera ją z internetu po nazwie — *Nie — nic nie jest pobierane:
  silnik działa na tym, co już masz.* (diagnoza: „baza = coś w sieci")
- B. **To DataFrame z Twojej sesji — DuckDB widzi go po nazwie
  zmiennej** ✓ — *Tak — most między M-PD a SQL: ta sama tabela, dwa
  języki pytań.*
- C. Trzeba ją było wcześniej wpisać do pliku bazy — *Nie — w naszym
  przepływie plik bazy nie istnieje; wystarczy DataFrame w pamięci
  sesji (L0.3!).* (diagnoza: zakłada obowiązkowy rytuał „stwórz bazę")
- D. DuckDB tworzy ją pustą przy pierwszym zapytaniu — *Nie — zapytanie
  do NIEISTNIEJĄCEJ nazwy to błąd (`Catalog Error`), nie cicha pusta
  tabela.* (diagnoza: model „rośnie na żądanie" — kalka błędu z F2.2)

**P3. Co zwróci `SELECT * FROM przejazdy LIMIT 2` dla tabeli
o 5 wierszach i 5 kolumnach?**

- A. 5 wierszy, 2 kolumny — *Nie — LIMIT ucina WIERSZE; kolumny wybiera
  SELECT (a `*` znaczy wszystkie).* (diagnoza: osie pomylone — kalka
  PD.2-P3)
- B. **2 wiersze, wszystkie kolumny** ✓ — *Tak — `*` = komplet kolumn,
  LIMIT 2 = dwa pierwsze wiersze podglądu.*
- C. 2 losowe wiersze — *Nie — LIMIT bierze wiersze z początku wyniku;
  o kolejności zdecydujesz ORDER BY (następny atom).* (diagnoza: LIMIT
  jako próbkowanie)
- D. Błąd — `*` i LIMIT się wykluczają — *Nie — to najzwyklejsza para
  na świecie: „pokaż wszystko, ale na razie kawałek".* (diagnoza:
  zgaduje konflikt tam, gdzie go nie ma)

### Drabinka hintów

1. **Koncepcyjny:** Szkielet każdego zapytania czytaj jak zdanie:
   „WYBIERZ (kolumny) Z (tabeli), pokaż (ile)". Pisz od razu czytelnie:
   klauzule od nowych linii, słowa kluczowe wielkimi — nawyk, za który
   rubryka płaci.
2. **Szkielet:** W notebooku SQL.1: uruchom WE, potem zmień listę kolumn
   na `id, minuty` i LIMIT na 2. Na koniec celowo wpisz nazwę tabeli
   z literówką (`przejazdyy`) — obejrzyj `Catalog Error` (rytuał znany
   z L0.3/F2.2: błąd ma Cię nie zaskakiwać).
3. **Pełne rozwiązanie z objaśnieniem:**
   `SELECT id, minuty FROM przejazdy LIMIT 2` → 2 wiersze, 2 kolumny.
   `Catalog Error: Table with name przejazdyy does not exist!` —
   silnik mówi wprost: nie zna takiej tabeli (literówka albo DataFrame
   nie istnieje w sesji — sprawdź, czy komórka z danymi się wykonała,
   L0.3). Drugi błąd-strażnik: `Parser Error: syntax error at or near
   "SELCT"` — literówka w SŁOWIE KLUCZOWYM; silnik wskazuje miejsce,
   w którym przestał rozumieć.

---

## Atom SQL.2 — WHERE i ORDER BY: przesiej i uporządkuj

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`sql-where-order` · **Krok fadingu:** pełne WE

### Cel

Przefiltrujesz wiersze klauzulą `WHERE`, uporządkujesz wynik `ORDER BY`
i złożysz z LIMIT-em wzorzec „top-N" — omijając pułapkę cudzysłowów.

### Teoria

Maska z PD.3 mówiła „zostaw wiersze spełniające warunek". W SQL to samo
robi klauzula **`WHERE`** — a porządek wyniku ustala **`ORDER BY`**:

```python
duckdb.sql("""
    SELECT id, kwota
    FROM przejazdy
    WHERE kwota > 25          -- zostaw wiersze spełniające warunek
    ORDER BY kwota DESC       -- ułóż od największej (DESC = malejąco)
""")
```

**Przewidź:** kwoty w `przejazdy` to 50.0, 22.0, 14.0, 41.5, 28.0.
Które wiersze wrócą i w jakiej kolejności?

Trzy wiersze: 50.0, 41.5, 28.0 — przesiane warunkiem, ułożone malejąco.
Zasady klauzul:

- Warunki `WHERE` wyglądają znajomo: `>`, `<`, `>=`, `<=`, `<>` (różne;
  SQL-owy odpowiednik `!=`). **Równość to POJEDYNCZY znak `=`** —
  w SQL to nie przypisanie, więc pułapka z F1.5 tu nie istnieje (DuckDB
  przyjmie też Pythonowe `==`, ale konwencja SQL to `=` i tak pisz).
- **Teksty w POJEDYNCZYCH cudzysłowach:** `WHERE nazwa = 'Manhattan'`.
  Podwójne cudzysłowy znaczą w SQL co innego (nazwę kolumny!) —
  `WHERE nazwa = "Manhattan"` zatrzyma się błędem `Binder Error:
  Referenced column "Manhattan" not found`. To najczęstsza pomyłka
  przybysza z Pythona — zapamiętaj: **dane w apostrofach**.
- `ORDER BY kolumna` rośnie domyślnie; `DESC` odwraca; teksty układa
  alfabetycznie. Bez ORDER BY kolejność wyniku jest NIEgwarantowana —
  jeśli ma być „od największej", musisz to POWIEDZIEĆ (deklaratywność
  w praktyce: czego nie zadeklarujesz, tego nie obiecano).
- Kolejność klauzul: `SELECT → FROM → WHERE → ORDER BY → LIMIT`.

Warunki łączysz spójnikami — `AND` (oba muszą zajść) i `OR` (wystarczy
jeden); logika znana z bramek, tylko przesiewa hurtowo: `WHERE minuty > 10 AND strefa_id = 10` przesieje do długich
kursów z jednej strefy. Przy mieszaniu AND z OR stawiaj nawiasy wokół
części OR — bez nich silnik zwiąże warunki inaczej, niż czytasz je
po polsku, i znowu dostaniesz wynik „działający, tylko niewłaściwy".

Duet `ORDER BY … DESC` + `LIMIT n` to wzorzec **top-N** — „trzy
najdroższe przejazdy" to dokładnie `ORDER BY kwota DESC LIMIT 3`.
Na capstonie top-N będzie codziennością („najdłuższe kursy",
„najruchliwsze godziny") — a w SQL.6 zobaczysz jego mocniejszą wersję
z funkcją okna, gdy top-N ma być „w każdej strefie osobno".

### Pytania (retrieval)

**P1. Jak w SQL zapisać warunek „strefa to dokładnie tekst Brooklyn"?**

- A. `WHERE nazwa == "Brooklyn"` — *Nie — podwójne cudzysłowy to w SQL
  NAZWA KOLUMNY: silnik poszuka kolumny „Brooklyn" i zgłosi Binder
  Error.* (diagnoza: cudzysłowy z Pythona przeniesione 1:1 — sedno
  pułapki atomu)
- B. **`WHERE nazwa = 'Brooklyn'`** ✓ — *Tak — równość pojedynczym `=`,
  tekst w apostrofach: dane w apostrofach, nazwy w (ewentualnych)
  podwójnych.*
- C. `WHERE nazwa IS Brooklyn` — *Nie — goły tekst bez cudzysłowów
  silnik weźmie za nazwę kolumny; a IS ma inną robotę: sprawdza braki
  (`IS NULL`), nie równość tekstów.* (diagnoza: składnia „na ucho")
- D. `IF nazwa = 'Brooklyn'` — *Nie — IF to Python (F1.6); w zapytaniu
  filtruje klauzula WHERE.* (diagnoza: miesza języki w jednej komórce —
  granica z SQL.1)

**P2. Bez `ORDER BY` kolejność wierszy wyniku jest…**

- A. Zawsze taka jak w tabeli — *Nie — bywa taka, ale silnik NIE daje
  gwarancji: wolno mu zwrócić wiersze w dowolnej kolejności.* (diagnoza:
  bierze zachowanie przypadkowe za regułę)
- B. Zawsze rosnąca po pierwszej kolumnie — *Nie — żadnego domyślnego
  sortowania nie ma; rosnąco układa dopiero ORDER BY.* (diagnoza:
  wymyśla regułę, której nie zadeklarował)
- C. **Niegwarantowana — jeśli kolejność ma znaczenie, deklarujesz ją
  ORDER BY** ✓ — *Tak — to esencja deklaratywności: czego nie
  powiedziałeś, tego nie obiecano.*
- D. Losowa za każdym razem — *Nie — „niegwarantowana" nie znaczy
  „celowo tasowana"; znaczy: nie opieraj na niej wniosków.* (diagnoza:
  przegina w drugą stronę)

**P3. „Pokaż DWA najtańsze przejazdy (id i kwota)". Które zapytanie?**

- A. `SELECT id, kwota FROM przejazdy LIMIT 2` — *Nie — bez ORDER BY
  LIMIT utnie dwa PIERWSZE wiersze wyniku, niekoniecznie najtańsze.*
  (diagnoza: LIMIT bez uporządkowania — P2 w akcji)
- B. `SELECT id, kwota FROM przejazdy ORDER BY kwota DESC LIMIT 2` —
  *Prawie — DESC układa od NAJDROŻSZEJ: dostaniesz dwa najdroższe.
  Najtańsze = porządek rosnący.* (diagnoza: kierunek sortowania)
- C. **`SELECT id, kwota FROM przejazdy ORDER BY kwota LIMIT 2`** ✓ —
  *Tak — domyślny porządek rosnący + LIMIT 2 = top-N od dołu.*
- D. `SELECT MIN(kwota) FROM przejazdy` — *Nie — MIN odda JEDNĄ
  najmniejszą wartość (F3.6/agregaty — następny atom), a pytanie żąda
  dwóch WIERSZY z id.* (diagnoza: agregat zamiast top-N)

### Drabinka hintów

1. **Koncepcyjny:** Buduj zapytanie klauzula po klauzuli, uruchamiając
   po każdej (nawyk z L0.4): najpierw SELECT-FROM-LIMIT, potem dołóż
   WHERE, na końcu ORDER BY. Mantra cudzysłowów: DANE W APOSTROFACH.
2. **Szkielet:** W notebooku SQL.2: „przejazdy z Manhattanu"… chwila —
   w `przejazdy` nie ma nazwy strefy, jest `strefa_id`! Filtruj po tym,
   co JEST: `WHERE strefa_id = 10`. (Nazwy stref dołączysz JOIN-em
   w SQL.5 — zapamiętaj ten zgrzyt, to on uzasadnia JOIN-y.)
3. **Pełne rozwiązanie z objaśnieniem:**
   `SELECT id, kwota FROM przejazdy WHERE strefa_id = 10 ORDER BY kwota
   DESC` → trzy przejazdy strefy 10, od najdroższego (50.0, 28.0, 14.0).
   `Binder Error` z nazwą w komunikacie → tekst w podwójnych
   cudzysłowach (zamień na apostrofy) albo literówka kolumny; wynik
   pusty → warunek nie pasuje do danych (sprawdź wartości: `SELECT
   DISTINCT strefa_id FROM przejazdy` — odpowiednik `unique()` z M-PD,
   gotowy przepis diagnostyczny).

---

## Atom SQL.3 — GROUP BY: agregaty per grupa, po SQL-owemu

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`sql-group-by-agregacja` (KLUCZOWY) · **Krok fadingu:** completion
(luka na końcu WE)

### Cel

Policzysz agregaty per grupa (`COUNT`, `SUM`, `AVG` z `GROUP BY`),
nadasz wynikom czytelne nazwy aliasem `AS` — i zrozumiesz błąd,
którym silnik pilnuje spójności grupowania.

### Teoria

`groupby` z PD.6 („podziel-policz-sklej") ma w SQL rodzonego brata:

```python
duckdb.sql("""
    SELECT
        strefa_id,
        COUNT(*)   AS liczba_przejazdow,   -- ile wierszy w grupie
        AVG(kwota) AS srednia_kwota        -- średnia w grupie
    FROM przejazdy
    GROUP BY strefa_id                     -- grupuj po strefie
""")
```

**Przewidź:** strefy w `przejazdy` to 10, 20, 10, 30, 10. Ile wierszy
będzie miał wynik i co pokaże `liczba_przejazdow`?

Trzy wiersze — po jednym NA GRUPĘ (dokładnie jak w PD.6): strefa 10
z liczbą 3, strefy 20 i 30 z liczbą 1. Rozbiór:

- **Agregaty** znasz z F3.6/PD.6: `COUNT(*)` (ile wierszy), `SUM(...)`,
  `AVG(...)` (średnia — nowa nazwa, stara znajoma), `MIN`/`MAX`.
  Niuans wart zapamiętania: `COUNT(*)` liczy WIERSZE, a `COUNT(kolumna)`
  — wartości NIEPUSTE tej kolumny (echo braków z PD.5: przy dziurawych
  danych te liczby się rozjadą i to jest informacja, nie usterka —
  dokładnie jak `count` w describe).
- **`AS` nadaje aliasy** — bez nich kolumny wyniku nazywałyby się
  `count_star()` czy `avg(kwota)`: działa, ale raport z takimi
  nagłówkami czyta się źle. Rubryka płaci za czytelność — aliasuj
  wszystko, co policzone.
- **`GROUP BY` wskazuje, po czym dzielić** — i tu twarda reguła,
  której silnik pilnuje błędem: w `SELECT` może stać TYLKO to, po czym
  grupujesz, albo agregat. Kolumna „luzem" (np. `minuty` bez agregatu
  przy grupowaniu po strefie) to pytanie bez odpowiedzi — KTÓRĄ wartość
  minut miałby pokazać dla strefy o trzech przejazdach? Silnik odmawia:
  `Binder Error: column "minuty" must appear in the GROUP BY clause or
  must be part of an aggregate function` — czytaj to jako przypomnienie
  „albo grupujesz, albo agregujesz".
- Kolejność klauzul rośnie: `SELECT → FROM → WHERE → GROUP BY →
  ORDER BY → LIMIT`. WHERE przesiewa wiersze PRZED grupowaniem —
  „średnia kwota per strefa, ale tylko dla kursów dłuższych niż
  10 minut" to WHERE nad minutami, ZANIM grupy w ogóle powstaną.

Nawyk samokontroli grupowania: suma wartości `COUNT(*)` ze wszystkich
grup musi równać się liczbie wierszy tabeli (u nas 3+1+1 = 5) — tanie
sprawdzenie, że żaden wiersz nie zginął ani się nie zdublował.

Completion (luka na końcu — notebook SQL.3): suma kwot per godzina,
od najruchliwszej:

```sql
SELECT
    godzina,
    SUM(kwota) AS suma_kwot
FROM przejazdy
GROUP BY ______
ORDER BY suma_kwot DESC
```

### Pytania (retrieval)

**P1. `GROUP BY strefa_id` na tabeli z 5 przejazdami w 3 strefach —
ile wierszy ma wynik?**

- A. 5 — po jednym na przejazd — *Nie — grupowanie ZWIJA wiersze:
  wynik ma po jednym wierszu na GRUPĘ (PD.6: podziel-policz-sklej).*
  (diagnoza: nie widzi zwinięcia ziarna)
- B. **3 — po jednym na strefę** ✓ — *Tak — tyle wierszy, ile
  unikalnych wartości w kolumnie grupowania.*
- C. 1 — jedna suma dla całości — *Nie — jedną sumę dla całości daje
  agregat BEZ GROUP BY; grupowanie właśnie rozbija ją per grupa.*
  (diagnoza: myli agregat globalny z grupowym)
- D. 15 — strefy × przejazdy — *Nie — mnożenie wierszy to domena złych
  JOIN-ów (następny atom!); grupowanie tylko zwija.* (diagnoza:
  przeczucie kartezjana w złym miejscu)

**P2. Czemu `SELECT strefa_id, minuty, COUNT(*) FROM przejazdy GROUP BY
strefa_id` kończy się błędem?**

- A. COUNT nie działa z GROUP BY — *Nie — COUNT z GROUP BY to
  najklasyczniejsza para; problemem jest kolumna `minuty`.* (diagnoza:
  wini agregat zamiast kolumny luzem)
- B. **`minuty` nie jest ani kolumną grupowania, ani agregatem — dla
  grupy o 3 przejazdach silnik nie wie, KTÓRE minuty pokazać** ✓ —
  *Tak — reguła „albo grupujesz, albo agregujesz"; poprawki:
  `AVG(minuty)`, `SUM(minuty)`… albo dodanie minut do GROUP BY (co
  zmienia grupy!).*
- C. Za dużo kolumn w SELECT — *Nie — kolumn może być wiele; każda
  musi tylko spełniać regułę grupowania.* (diagnoza: limit ilościowy
  zamiast reguły jakościowej)
- D. Brakuje ORDER BY — *Nie — ORDER BY jest zawsze opcjonalne; sam
  komunikat mówi wprost o GROUP BY i kolumnie (metoda czytania z L0.3).*
  (diagnoza: nie czyta komunikatu)

**P3. Po co alias `AS srednia_kwota`, skoro wynik i tak się policzy?**

- A. Bez aliasu zapytanie nie ruszy — *Nie — ruszy; kolumna dostanie
  tylko techniczną nazwę w stylu `avg(kwota)`.* (diagnoza: szuka
  przymusu składniowego — kalka PD.7-P1)
- B. **Alias nadaje wynikowi czytelną nazwę — raport i kolejne
  zapytania mówią wtedy ludzkim językiem; rubryka ocenia czytelność**
  ✓ — *Tak — `srednia_kwota` w nagłówku raportu vs `avg(kwota)` —
  wybór jest oczywisty.*
- C. Alias przyspiesza obliczenie — *Nie — to nazwa, nie optymalizacja.*
  (diagnoza: „techniczna korzyść" — kalka PD.7-P1/C)
- D. Alias zaokrągla wynik — *Nie — zaokrąglenie to osobna operacja;
  alias tylko podpisuje kolumnę.* (diagnoza: przypisuje aliasowi cudzą
  robotę)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** GROUP BY wskazuje tę samą kolumnę, którą chcesz
   widzieć „luzem" w SELECT — tu grupujesz po godzinie, więc… Zasada
   samokontroli każdego grupowania: policz w głowie, ile grup powinno
   wyjść, i porównaj z liczbą wierszy wyniku.
2. **Szkielet:** luka: `GROUP BY godzina`. Godziny w danych to 8, 8, 9,
   17, 17 — ile grup oczekujesz? Która wygra ranking sumy?
3. **Pełne rozwiązanie z objaśnieniem:** trzy grupy; suma dla 8 →
   50.0+22.0 = 72.0, dla 17 → 41.5+28.0 = 69.5, dla 9 → 14.0; ranking:
   72.0, 69.5, 14.0. Błąd „must appear in the GROUP BY clause" →
   kolumna luzem (P2); wynik ma za dużo wierszy → grupujesz po zbyt
   szczegółowej kolumnie (np. po id — każdy wiersz własną grupą).
   Nota do budowy notebooka: w P2 opcję D doprecyzować, by nie
   sugerowała, że ORDER BY bywa obowiązkowy.

---

## Atom SQL.4 — LAB „Godziny szczytu" (SELECT→WHERE→GROUP BY na mini-przejazdach)

**Typ:** `lab` · **Czas studenta:** ~15–20 min · **Koncepty ćwiczone:**
`sql-select-zapytanie`, `sql-where-order`, `sql-group-by-agregacja` ·
**Krok fadingu:** szkielet z lukami

### Cel

Trzy zapytania rosnącej mocy na mini-świecie capstone'u: podgląd →
przesiew z porządkiem → agregacja per grupa. Dokładnie ta drabinka,
którą na capstonie przejdziesz na prawdziwych przejazdach NYC.

### Zadanie (notebook SQL.4 — tabele `przejazdy`/`strefy` w komórce
„Dane", uzupełnij luki)

```python
import duckdb

# Z1: obejrzyj tabelę (rytuał!)
z1 = duckdb.sql("SELECT * FROM przejazdy LIMIT ______").df()  # luka 1
z1

# Z2: przejazdy dłuższe niż 10 minut, od najdłuższego
z2 = duckdb.sql("""
    SELECT id, minuty, kwota
    FROM przejazdy
    WHERE ______                                              -- luka 2
    ORDER BY ______ DESC                                      -- luka 3
""").df()
z2

# Z3: ile przejazdów i jaka suma kwot w każdej godzinie?
z3 = duckdb.sql("""
    SELECT
        godzina,
        ______   AS liczba,                                   -- luka 4
        ______   AS suma_kwot                                 -- luka 5
    FROM przejazdy
    GROUP BY godzina
    ORDER BY suma_kwot DESC
""").df()
z3
```

Wyniki lądują pod nazwami **`z1`–`z3`** (metoda `.df()` z SQL.1 — wynik
jako DataFrame); nazwy są częścią specyfikacji, bo pieczątka musi
wiedzieć, gdzie patrzeć. W notebooku każde zapytanie stoi w osobnej
komórce, a nazwa w jej ostatniej linii pokazuje tabelę.

**Zaliczenie:** komórka-pieczątka: wykonuje trzy zapytania kontrolne
własną kopią SQL-a i porównuje z Twoimi `z1`–`z3` (Z2: 4 wiersze,
pierwszy id=2; Z3: 3 grupy, na czele godzina 8 z sumą 72.0) — token
przy zgodności. Limity klasy L0 obowiązują.

### Drabinka hintów

1. **Koncepcyjny:** Z1 to `head()` po SQL-owemu; Z2 — warunek na
   minutach + porządek po nich; Z3 — para agregatów z SQL.3 (ile wierszy
   w grupie? suma czego?).
2. **Szkielet:** luka 1: tyle, ile tabela ma wierszy (5); luka 2:
   `minuty > 10`; luka 3: po czym układasz „od najdłuższego"?; luki
   4–5: `COUNT(*)` i `SUM(kwota)`.
3. **Pełne rozwiązanie z objaśnieniem:** Z2: `WHERE minuty > 10 ORDER BY
   minuty DESC` → 4 wiersze (35, 22, 15, 12 minut; id 2, 4, 5, 1).
   Z3: godziny 8/17/9, sumy 72.0/69.5/14.0. Jeśli Z3 zwraca błąd „must
   appear in the GROUP BY" — któraś kolumna stoi luzem (SQL.3-P2);
   jeśli Z2 puste — kierunek znaku w warunku.

---

## Atom SQL.5 — JOIN i ziarno wiersza: łącz bez mnożenia

**Typ:** `exercise` · **Czas studenta:** ~15–20 min · **Koncept:**
`sql-join-ziarno` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Połączysz dwie tabele `JOIN … ON`, sprawdzisz ziarno wyniku i zobaczysz
na własne oczy iloczyn kartezjański — błąd, który „działa i zwraca
liczby, tylko niewłaściwe".

### Teoria

Zgrzyt z SQL.2 wraca: w `przejazdy` jest `strefa_id`, a nazwa strefy —
w `strefy`. Dane rozdziela się tak celowo: po co powtarzać „Manhattan"
przy każdym z tysięcy przejazdów? Każda kopia to okazja do literówki —
a przy setkach kopii tej samej nazwy nie wiadomo już, która wersja jest
prawdziwa. Słownik trzyma nazwę RAZ, fakty noszą tylko identyfikator,
a łączy je z powrotem **JOIN**:

```python
duckdb.sql("""
    SELECT p.id, s.nazwa, p.kwota
    FROM przejazdy AS p                  -- alias tabeli: p
    JOIN strefy    AS s                  -- druga tabela: s
      ON p.strefa_id = s.strefa_id       -- WARUNEK łączenia: co pasuje do czego
""")
```

**Przewidź:** ile wierszy będzie miał wynik? (Przejazdów jest 5, stref 3.)

**5** — i to jest sedno: JOIN dopasował do KAŻDEGO przejazdu jego strefę,
więc **ziarno wyniku = ziarno przejazdów** (jeden wiersz = jeden
przejazd, teraz z nazwą strefy). Briefing capstone'u nazywa ziarno
najważniejszym pytaniem analitycznego SQL — a przy JOIN-ach brzmi ono:
„czy po złączeniu jeden wiersz nadal reprezentuje to samo, co przed?".

Rozbiór składni: `ON` podaje warunek dopasowania (które wiersze lewej
tabeli kleją się z którymi prawej); aliasy `p`/`s` skracają zapis,
a prefiksy `p.`/`s.` mówią, z której tabeli pochodzi kolumna (przy
wspólnej nazwie `strefa_id` — obowiązkowe, inaczej silnik nie wie,
o którą pytasz).

Zwykły `JOIN` ma jeszcze jedną cechę, o której trzeba wiedzieć:
**gubi wiersze bez pary**. Przejazd ze strefą spoza słownika po prostu
zniknie z wyniku — bez błędu. Gdy chcesz zachować WSZYSTKIE wiersze
lewej tabeli (a brakującą parę dostać jako pustkę), piszesz
`LEFT JOIN` — wybór między nimi to decyzja analityczna („czy przejazdy
bez strefy mają wejść do raportu?"), którą warto zapisać komentarzem,
jak decyzje o brakach w PD.5. W naszym mini-świecie par nie zabraknie;
na prawdziwych danych NYC — bywa różnie.

A teraz błąd, przed którym rubryka ostrzega wprost („brak niejawnych
iloczynów kartezjańskich"). Zapomnij warunku ON — napisz
`FROM przejazdy, strefy` — a silnik sklei KAŻDY przejazd z KAŻDĄ strefą:

```python
duckdb.sql("SELECT COUNT(*) FROM przejazdy, strefy")   # → 15  (5 × 3!)
```

Piętnaście wierszy zamiast pięciu — i żadnego błędu. Gdy teraz policzysz
`SUM(kwota)`, każda kwota wejdzie trzykrotnie: wynik zawyżony 3×,
a wygląda wiarygodnie. Dlatego rytuał po KAŻDYM JOIN-ie (luki —
notebook SQL.5):

```sql
SELECT COUNT(*) FROM przejazdy;                       -- ile wierszy przed?
SELECT COUNT(*)
FROM przejazdy AS p
JOIN strefy AS s ON ______ = ______;                  -- luki: warunek łączenia
-- liczby RÓWNE? ziarno zachowane. Wynik większy? mnożysz wiersze.
```

### Pytania (retrieval)

**P1. Po co w ogóle JOIN — czemu nazwa strefy nie siedzi w tabeli
przejazdów?**

- A. Bo SQL nie pozwala na teksty w dużych tabelach — *Nie — pozwala;
  rozdzielenie to świadomy projekt danych.* (diagnoza: wymyśla
  ograniczenie techniczne)
- B. **Dane trzyma się bez powtórzeń (nazwa strefy raz, nie przy każdym
  przejeździe), a JOIN skleja je na czas zapytania** ✓ — *Tak — mniej
  powtórzeń = mniej okazji do niespójności; łączenie jest tanie.*
- C. Przez przypadek — ktoś źle wyeksportował — *Nie — tak wyglądają
  prawie wszystkie prawdziwe dane (NYC TLC też: przejazdy osobno,
  słownik stref osobno).* (diagnoza: norma wzięta za usterkę)
- D. Żeby dane były trudniejsze do analizy — *Nie — cel jest odwrotny;
  JOIN to standardowy most, nie tor przeszkód.* (diagnoza: frustracja
  zamiast modelu)

**P2. Tabela A ma 100 wierszy. Po JOIN-ie ze słownikiem B wynik ma
100 wierszy. Co to znaczy?**

- A. JOIN się nie udał — *Nie — udał się wzorcowo: każdy wiersz A
  dostał SWOJE dopasowanie, ziarno zachowane.* (diagnoza: oczekuje,
  że łączenie „coś zmienia" w liczbie wierszy)
- B. **Ziarno zachowane — jeden wiersz wyniku nadal odpowiada jednemu
  wierszowi A; agregaty policzą się uczciwie** ✓ — *Tak — to jest
  wynik rytuału COUNT przed/po; równość = zielone światło dla SUM.*
- C. B miało dokładnie 100 wierszy — *Nie — słownik może mieć ich 3
  (jak strefy): liczy się dopasowanie, nie rozmiar drugiej tabeli.*
  (diagnoza: myli rozmiar słownika z ziarnem wyniku)
- D. Zabrakło LIMIT 100 — *Nie — LIMIT nie brał udziału; 100 to
  naturalna liczba dopasowań.* (diagnoza: szuka przycinania tam, gdzie
  go nie było)

**P3. `SUM(kwota)` po JOIN-ie wyszła dokładnie 3× większa niż przed.
Najbardziej prawdopodobna przyczyna?**

- A. Silnik liczy sumy trzykrotnie dla pewności — *Nie — silnik liczy
  raz; to WIERSZE się potroiły, zanim suma je zebrała.* (diagnoza:
  wini narzędzie — kalka L0.2-P2/A)
- B. **JOIN zwielokrotnił wiersze (np. brak/zły warunek ON — każdy
  wiersz skleił się z wieloma) i każda kwota weszła do sumy
  wielokrotnie** ✓ — *Tak — klasyk z briefingu: wynik „działa", tylko
  jest 3× zawyżony; rytuał COUNT przed/po łapie to od razu.*
- C. Kwoty w drugiej tabeli też się sumują — *Nie — SUM zbiera jedną
  wskazaną kolumnę; problemem jest liczba WIERSZY, nie źródło kolumny.*
  (diagnoza: szuka drugiego źródła wartości)
- D. Tak działa AVG, trzeba było SUM — *Nie — to JEST SUM; AVG dałby
  inną wartość, ale też skażoną zwielokrotnieniem.* (diagnoza: miesza
  agregaty zamiast zbadać ziarno)

### Drabinka hintów (luki z teorii)

1. **Koncepcyjny:** Warunek ON łączy kolumny, które ZNACZĄ to samo
   w obu tabelach — z prefiksami tabel po obu stronach znaku równości.
   Rytuał: COUNT przed, COUNT po, porównaj.
2. **Szkielet:** `ON p.strefa_id = s.strefa_id` — lewa strona z aliasem
   przejazdów, prawa z aliasem stref.
3. **Pełne rozwiązanie z objaśnieniem:** COUNT przed = 5, po JOIN = 5 —
   ziarno zachowane. Przećwicz też antyprzykład: `FROM przejazdy,
   strefy` (bez ON) → COUNT = 15 = 5×3 — obejrzany na własne oczy
   kartezjan przestaje być teorią. Wynik JOIN-a MNIEJSZY niż tabela
   lewa? Część wierszy nie znalazła pary w słowniku (np. przejazd ze
   strefą spoza słownika — w naszych mini-danych to nie występuje;
   na prawdziwych danych to sygnał do zbadania, nie do zignorowania).

---

## Atom SQL.6 — Funkcje okna: agregat, który nie zjada wierszy

**Typ:** `exercise` · **Czas studenta:** ~15–20 min · **Koncept:**
`sql-funkcje-okna` (KLUCZOWY) · **Krok fadingu:** backward completion

### Cel

Użyjesz funkcji okna tam, gdzie `GROUP BY` nie wystarcza: dołożysz
agregat grupy do każdego wiersza (`SUM OVER PARTITION BY`) i ponumerujesz
ranking (`ROW_NUMBER OVER ORDER BY`) — z uzasadnieniem wyboru, którego
żąda rubryka.

### Teoria

GROUP BY ma cenę: ZWIJA wiersze (SQL.3-P1). A co, gdy potrzebujesz
JEDNOCZEŚNIE szczegółu i agregatu — np. przy każdym przejeździe pokazać,
jaki procent sumy jego strefy stanowi? Grupowanie zje przejazdy;
**funkcja okna** policzy agregat, NIE zjadając wierszy:

```python
duckdb.sql("""
    SELECT
        id,
        strefa_id,
        kwota,
        SUM(kwota) OVER (PARTITION BY strefa_id) AS suma_strefy
    FROM przejazdy
    ORDER BY id
""")
```

**Przewidź:** ile wierszy ma wynik? I co stoi w `suma_strefy` przy
trzech przejazdach strefy 10 (kwoty 50.0, 14.0, 28.0)?

**Pięć wierszy — wszystkie!** — a przy każdym przejeździe strefy 10 ta
sama wartość `92.0` (suma jego grupy). Czytaj składnię od słowa **OVER**:
„policz SUM(kwota) PONAD oknem" — a okno definiuje nawias:
`PARTITION BY strefa_id` = „oknem są wiersze tej samej strefy". Okno to
jakby GROUP BY, który zagląda przez ramię każdemu wierszowi, zamiast
zwijać tabelę.

Druga wielka rodzina okien — **numerowanie i rankingi**:

```sql
SELECT id, kwota,
       ROW_NUMBER() OVER (ORDER BY kwota DESC) AS miejsce
FROM przejazdy
```

`ROW_NUMBER()` nadaje kolejne numery wg porządku Z NAWIASU (tu: od
najdroższego — miejsca 1–5). Połącz oba mechanizmy —
`ROW_NUMBER() OVER (PARTITION BY strefa_id ORDER BY kwota DESC)` —
a dostaniesz ranking OSOBNY w każdej strefie: to jest top-N per grupa,
którego zwykły `ORDER BY … LIMIT` (SQL.2) nie umie. Kuzyni, których
wystarczy kojarzyć: `RANK()` (jak ROW_NUMBER, ale remisy dostają to
samo miejsce) i `LAG()` (wartość z poprzedniego wiersza okna — np.
porównanie z wcześniejszą godziną).

Szczegół kolejności: okno liczy się PO przesiewie `WHERE` — widzi tylko
wiersze, które przeszły filtr; ranking „w całej tabeli" i ranking
„wśród przefiltrowanych" to różne rankingi.

Kiedy co — reguła do uzasadnień, których żąda rubryka (30% punktów!):
**potrzebujesz TYLKO wyników per grupa → GROUP BY; potrzebujesz agregatu
OBOK szczegółu wierszy (udział w grupie, ranking w grupie, porównanie
z sąsiadem) → funkcja okna.** Jedno zdanie tej postaci przy zapytaniu
(„okno, bo chcę udział przejazdu w sumie strefy — GROUP BY zjadłby
przejazdy") to dokładnie uzasadnienie, które oceni recenzent.

Backward completion (notebook SQL.6 — wynik gotowy, dopisz zapytanie):
wynik ma 5 wierszy: `id, minuty, nr_w_strefie` — gdzie `nr_w_strefie`
numeruje przejazdy KAŻDEJ strefy od najdłuższego.

### Pytania (retrieval)

**P1. Czym `SUM(kwota) OVER (PARTITION BY strefa_id)` różni się od
`SUM(kwota) … GROUP BY strefa_id`?**

- A. Niczym — to synonimy — *Nie — wyniki mają INNE ziarno: grupowanie
  zwija do 3 wierszy-stref, okno zostawia 5 wierszy-przejazdów z sumą
  obok.* (diagnoza: nie widzi różnicy ziarna — sedno atomu)
- B. **GROUP BY zwija wiersze do grup; okno liczy ten sam agregat, ale
  zostawia wszystkie wiersze i dopisuje wynik obok** ✓ — *Tak —
  „agregat, który nie zjada wierszy".*
- C. Okno jest zawsze szybsze — *Nie — wybór dotyczy KSZTAŁTU wyniku,
  nie szybkości.* (diagnoza: kryterium wydajnościowe zamiast
  semantycznego)
- D. Okno działa tylko na liczbach — *Nie — rodzina okien obejmuje też
  numerowanie (ROW_NUMBER) — żadnych liczb w danych nie wymaga.*
  (diagnoza: zawęża mechanizm do jednego przykładu)

**P2. Chcesz listę WSZYSTKICH przejazdów z miejscem w rankingu
najdroższych WEWNĄTRZ swojej strefy. Które narzędzie?**

- A. `ORDER BY kwota DESC LIMIT 3` — *Nie — to top-N GLOBALNY: jeden
  ranking dla całej tabeli, bez podziału na strefy i z uciętymi
  wierszami.* (diagnoza: wzorzec z SQL.2 rozciągnięty ponad jego
  możliwości)
- B. `GROUP BY strefa_id` — *Nie — grupowanie odda po jednym wierszu na
  strefę; ranking wymaga ZACHOWANIA przejazdów.* (diagnoza: grupowanie
  jako uniwersalny „per grupa")
- C. **`ROW_NUMBER() OVER (PARTITION BY strefa_id ORDER BY kwota
  DESC)`** ✓ — *Tak — partycja dzieli na strefy, ORDER BY w nawiasie
  ustawia ranking, wiersze zostają.*
- D. Trzy osobne zapytania, po jednym na strefę — *Działa, ale nie
  skaluje się (16 stref = 16 zapytań) i rubryka oczekuje właśnie okna
  tam, gdzie GROUP BY nie wystarcza.* (diagnoza: brute force zamiast
  narzędzia)

**P3. W wyniku okna `SUM(kwota) OVER (PARTITION BY strefa_id)` przy
KAŻDYM przejeździe strefy 10 stoi ta sama liczba. To błąd?**

- A. Tak — suma powinna narastać wiersz po wierszu — *Nie — narastanie
  to inna odmiana okna (z ORDER BY w nawiasie); czysta partycja daje
  sumę CAŁEJ grupy przy każdym jej wierszu.* (diagnoza: myli okno
  partycyjne z narastającym)
- B. Tak — powtórzenia znaczą, że JOIN zwielokrotnił — *Nie — tu nie ma
  JOIN-a; powtórzona wartość agregatu grupy przy jej wierszach to
  DEFINICJA okna partycyjnego.* (diagnoza: pułapka SQL.5 przeniesiona
  w złe miejsce)
- C. **Nie — to poprawne: każdy wiersz grupy dostaje obok siebie ten
  sam agregat swojej grupy** ✓ — *Tak — dzięki temu policzysz np.
  `kwota / suma_strefy` — udział przejazdu w strefie — w następnej
  kolumnie.*
- D. Nie wiadomo — trzeba porównać z GROUP BY — *Porównanie to dobra
  praktyka kontrolna, ale wynik NIE jest „niewiadomą": zachowanie okna
  jest zdefiniowane.* (diagnoza: brak zaufania do semantyki zamiast
  jej znajomości)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Z wyniku czytasz składniki nawiasu OVER: numeracja
   OSOBNA per strefa → PARTITION BY czym?; „od najdłuższego" → ORDER BY
   czym i w którą stronę? Funkcja numerująca — ta z teorii.
2. **Szkielet:**

   ```sql
   SELECT id, minuty,
          ROW_NUMBER() OVER (PARTITION BY ______ ORDER BY ______ DESC)
              AS nr_w_strefie
   FROM przejazdy
   ```

3. **Pełne rozwiązanie z objaśnieniem:** `PARTITION BY strefa_id ORDER
   BY minuty DESC` — strefa 10 dostaje miejsca 1–3 (15, 12, 7 minut),
   strefy 20 i 30 po miejscu 1. Autokontrola okna: liczba wierszy
   wyniku = liczba wierszy tabeli (nic nie zjedzone). Do uzasadnienia
   w capstonie przećwicz zdanie: „okno, bo potrzebuję rankingu WEWNĄTRZ
   grupy przy zachowaniu wierszy — GROUP BY zwinąłby przejazdy".

---

## Atom SQL.7 — LAB „Raport stref" (samodzielny finał: JOIN + GROUP BY + okno)

**Typ:** `lab` · **Czas studenta:** ~25 min · **Koncepty ćwiczone:**
wszystkie z M-SQL · **Krok fadingu:** zadanie samodzielne (sama
specyfikacja)

### Cel

Zbudujesz trzy zapytania raportu, które na capstonie napiszesz dla
prawdziwych danych NYC: złączenie ze słownikiem, agregat per strefa
i ranking oknem — każde z rytuałem kontroli ziarna.

### Zadanie (notebook SQL.7 — tabele `przejazdy`/`strefy` + pusta
komórka „Twój raport" + pieczątka)

Napisz trzy zapytania (każde w osobnym wywołaniu `duckdb.sql`,
sformatowane wg zasady czytelności). Wyniki zapisz pod nazwami **`z1`**,
**`z2`**, **`z3`** (metoda `.df()` z SQL.1) — nazwy są częścią
specyfikacji, jak w PD.8: pieczątka musi wiedzieć, gdzie patrzeć:

1. **Z1 — złączenie:** wszystkie przejazdy z NAZWĄ strefy (id, nazwa,
   minuty, kwota); najpierw rytuał COUNT przed/po (SQL.5) — w komórce
   tekstowej zapisz jego wynik jednym zdaniem.
2. **Z2 — agregat per strefa:** nazwa strefy, liczba przejazdów, suma
   kwot; od najwyższej sumy. (Uwaga: grupujesz po wyniku złączenia —
   nazwa strefy pochodzi ze słownika!)
3. **Z3 — ranking oknem:** id, nazwa strefy, kwota i miejsce przejazdu
   w rankingu najdroższych SWOJEJ strefy; plus jedno zdanie w komórce
   tekstowej: dlaczego okno, a nie GROUP BY (wzorzec uzasadnienia
   z SQL.6 — rubryka!).

**Zaliczenie:** komórka-pieczątka: wykonuje własne wersje Z1–Z3
i porównuje z Twoimi `z1`–`z3` (Z1: 5 wierszy; Z2: Manhattan 3/92.0 na
czele? sprawdź — Brooklyn ma najdłuższy kurs (35 min) i najniższą sumę
(22.0)!; Z3: miejsca 1 w trzech strefach) — token przy zgodności. Zdania w komórkach tekstowych poza
checkiem (jawny limit klasy L0) — oceni je rubryka capstone'u, tu
ćwiczysz formę.

### Drabinka hintów

1. **Koncepcyjny:** Z1 to WE z SQL.5 rozszerzone o kolumny; Z2 to
   SQL.3 na WYNIKU złączenia (JOIN i GROUP BY żyją w jednym zapytaniu:
   FROM…JOIN…ON…GROUP BY); Z3 to backward z SQL.6 + nazwa strefy
   (znów JOIN). Buduj przyrostowo, kontroluj COUNT-em.
2. **Szkielet:** Z2:

   ```sql
   SELECT s.nazwa, COUNT(*) AS liczba, SUM(p.kwota) AS suma_kwot
   FROM przejazdy AS p
   JOIN strefy AS s ON p.strefa_id = s.strefa_id
   GROUP BY ______
   ORDER BY ______ DESC
   ```

3. **Pełne rozwiązanie z objaśnieniem:** Z2: `GROUP BY s.nazwa ORDER BY
   suma_kwot DESC` → Manhattan 3 przejazdy/92.0, Queens 1/41.5,
   Brooklyn 1/22.0 — zwróć uwagę, że Brooklyn ma najdłuższy kurs
   (35 min), a mimo to najniższą sumę: najdłuższy kurs dał najniższy
   przychód — czas nie jest przychodem. To jest obserwacja do raportu,
   dokładnie w duchu kryterium „wnioski z danych". Z3: `ROW_NUMBER()
   OVER (PARTITION BY s.nazwa ORDER BY p.kwota DESC)`. Suma w Z2
   zawyżona ×3? Kartezjan — wróć do rytuału SQL.5.

---

## Egzamin modułu M-SQL (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**;
2 warianty izomorficzne (cap 2); retry z drugim wariantem; po 2. oblaniu
correctives; „zarezerwuj ~25 min"; pokrycie 3 × 5 atomów; kalibracja
OSOBNA, przy WE. Format jak poprzednie moduły.

**E1** · A: Co robi `LIMIT 5` w zapytaniu? — wybiera 5 kolumn / **ucina
wynik do 5 pierwszych wierszy** / bierze 5 losowych wierszy / sortuje —
*LIMIT = podgląd wierszy.* · B: Co robi `SELECT *`? — wybiera wszystkie
wiersze / **wybiera wszystkie KOLUMNY** / czyści tabelę / sortuje —
*gwiazdka = komplet kolumn.* → `sql-select-zapytanie` → SQL.1

**E2** · A: `SELECT` czyta dane. Co dzieje się z tabelą źródłową? —
zmniejsza się / **nic — SELECT zwraca wynik, źródło nietknięte** /
sortuje się na stałe / kasuje się po LIMIT — *jak filtry w PD.3.* ·
B: Skąd DuckDB w Colab zna tabelę o nazwie Twojego DataFrame'a? —
z internetu / **z Twojej sesji — widzi DataFrame po nazwie** / z pliku
bazy / tworzy pustą — *most M-PD→SQL.* → `sql-select-zapytanie` → SQL.1

**E3** · A: `Catalog Error: Table with name przejazdyy does not exist` —
co się stało? — składnia SELECT zła / **literówka nazwy tabeli albo
DataFrame nie istnieje w sesji** / za mało wierszy / brak LIMIT —
*katalog = spis tabel.* · B: `Parser Error: syntax error at or near
"SELCT"` — co się stało? — zła tabela / **literówka w słowie kluczowym
SQL** / za dużo kolumn / brak cudzysłowów — *parser czyta słowa
kluczowe.* → `sql-select-zapytanie` → SQL.1

**E4** · A: Jak zapisać warunek „nazwa równa się tekst Queens"? —
`WHERE nazwa == "Queens"` / **`WHERE nazwa = 'Queens'`** / `WHERE
nazwa IS Queens` / `IF nazwa = 'Queens'` — *dane w apostrofach,
równość `=`.* · B: Co zrobi silnik z `WHERE nazwa = "Queens"`
(podwójne cudzysłowy)? — zadziała jak z apostrofami / **poszuka KOLUMNY
o nazwie Queens — Binder Error** / zignoruje warunek / zwróci pusty
wynik — *podwójne = identyfikator.* → `sql-where-order` → SQL.2

**E5** · A: „Trzy najdroższe przejazdy" — które zapytanie? — `LIMIT 3`
bez ORDER / **`ORDER BY kwota DESC LIMIT 3`** / `ORDER BY kwota LIMIT
3` / `MAX(kwota)` — *top-N = porządek + ucięcie.* · B: „Dwa najkrótsze
przejazdy (minuty)" — które zapytanie? — `LIMIT 2` / `ORDER BY minuty
DESC LIMIT 2` / **`ORDER BY minuty LIMIT 2`** / `MIN(minuty)` —
*rosnąco = domyślnie.* → `sql-where-order` → SQL.2

**E6** · A: Bez ORDER BY kolejność wyniku jest… — jak w tabeli, zawsze /
**niegwarantowana** / rosnąca po pierwszej kolumnie / losowa celowo —
*czego nie zadeklarujesz, tego nie obiecano.* · B: Kolejność klauzul
to… — WHERE przed FROM / **SELECT → FROM → WHERE → GROUP BY → ORDER BY
→ LIMIT** / dowolna / LIMIT zawsze pierwszy — *sztywny szkielet
zapytania.* → `sql-where-order` → SQL.2

**E7** · A: `GROUP BY strefa_id` na 5 przejazdach w 3 strefach — ile
wierszy wyniku? — 5 / **3** / 1 / 15 — *jeden wiersz na grupę.* · B:
Agregat BEZ GROUP BY (np. `SELECT SUM(kwota) FROM przejazdy`) — ile
wierszy wyniku? — po jednym na wiersz / po jednym na strefę / **1 —
jedna liczba dla całości** / 0 — *bez grup = agregat globalny.*
→ `sql-group-by-agregacja` → SQL.3

**E8** · A: `SELECT strefa_id, minuty, COUNT(*) … GROUP BY strefa_id` —
efekt? — działa / **Binder Error: `minuty` musi być w GROUP BY albo
w agregacie** / zwraca zera / sortuje po minutach — *albo grupujesz,
albo agregujesz.* · B: Jak POPRAWNIE pokazać średnie minuty per strefa?
— `minuty` luzem obok GROUP BY / **`AVG(minuty)` przy `GROUP BY
strefa_id`** / drugi GROUP BY / ORDER BY minuty — *agregat odpowiada
za kolumnę spoza grupowania.* → `sql-group-by-agregacja` → SQL.3

**E9** · A: Po co `AS liczba_przejazdow`? — przyspiesza / **czytelna
nazwa kolumny wyniku (rubryka: czytelność)** / zaokrągla / wymusza
sortowanie — *alias = podpis.* · B: Bez aliasu kolumna z `COUNT(*)`
nazywa się… — count / **technicznie, np. `count_star()`** / pusto /
błąd — *działa, ale czyta się źle.* → `sql-group-by-agregacja` → SQL.3

**E10** · A: Po co JOIN, skoro można trzymać nazwę strefy przy każdym
przejeździe? — SQL zabrania tekstów / **dane trzyma się bez powtórzeń,
a łączy na czas zapytania** / przez przypadek / dla utrudnienia —
*słownik osobno, fakty osobno.* · B: Co podaje klauzula `ON`? — ile
wierszy wziąć / **warunek dopasowania wierszy obu tabel** / kolejność
wyniku / alias tabeli — *co pasuje do czego.* → `sql-join-ziarno` →
SQL.5

**E11** · A: Tabela faktów: 100 wierszy; po JOIN-ie ze słownikiem: 100
wierszy. Znaczy to, że… — JOIN się nie udał / **ziarno zachowane —
agregaty policzą się uczciwie** / słownik miał 100 wierszy / zabrakło
LIMIT — *rytuał COUNT przed/po.* · B: 5 przejazdów, 3 strefy, `FROM
przejazdy, strefy` BEZ ON — ile wierszy? — 5 / 8 / **15** / błąd —
*kartezjan: każdy z każdym.* → `sql-join-ziarno` → SQL.5

**E12** · A: `SUM(kwota)` po JOIN-ie wyszła 3× większa niż przed —
przyczyna? — silnik liczy 3× / **JOIN zwielokrotnił wiersze (zły/brak
ON)** / kwoty z drugiej tabeli / tak działa SUM — *wiersze potrojone
przed sumą.* · B: Jak WYKRYĆ zwielokrotnienie po JOIN-ie? — nie da się
/ **porównać COUNT(*) przed i po złączeniu** / posortować / dodać
LIMIT — *rytuał ziarna.* → `sql-join-ziarno` → SQL.5

**E13** · A: Czym okno (`OVER`) różni się od GROUP BY? — niczym /
**GROUP BY zwija wiersze; okno liczy agregat, zostawiając wszystkie
wiersze** / okno jest szybsze / okno tylko dla liczb — *agregat obok
szczegółu.* · B: Ile wierszy zwróci `SELECT id, SUM(kwota) OVER
(PARTITION BY strefa_id) FROM przejazdy` (5 przejazdów)? — 3 / 1 /
**5** / 15 — *okno nie zjada wierszy.* → `sql-funkcje-okna` → SQL.6

**E14** · A: Ranking najdroższych przejazdów OSOBNO w każdej strefie —
które narzędzie? — ORDER BY…LIMIT / GROUP BY / **ROW_NUMBER() OVER
(PARTITION BY strefa_id ORDER BY kwota DESC)** / trzy zapytania — *top-N
per grupa = okno.* · B: Co robi `PARTITION BY` w nawiasie OVER? —
sortuje wynik / **dzieli wiersze na okna-grupy, w których liczy się
funkcja** / ucina wiersze / łączy tabele — *partycja = grupa okna.*
→ `sql-funkcje-okna` → SQL.6

**E15** · A: Przy każdym wierszu grupy okno partycyjne pokazuje TĘ SAMĄ
wartość sumy. To… — błąd okna / skutek złego JOIN-a / **poprawne —
każdy wiersz dostaje agregat SWOJEJ grupy** / przypadek — *definicja
okna partycyjnego.* · B: Kiedy wg rubryki wybierasz okno zamiast
GROUP BY (z uzasadnieniem)? — zawsze, okno jest nowsze / **gdy
potrzebujesz agregatu/rankingu OBOK zachowanych wierszy** / gdy tabela
mała / gdy brak JOIN-ów — *uzasadnienie = kształt wyniku.*
→ `sql-funkcje-okna` → SQL.6

---

## Pozycja CAPSTONE — `ds-sql-analiza-przejazdow` (rampa i kamienie)

**Typ:** `project` (REUSE-as-capstone, D4; rubryka NIETKNIĘTA) ·
**Czas studenta:** ~4 h (estymata projektu).

**Rampa:** cała droga rubryki ma atomy — czytelne zapytania (zasada
modułu + drabinki), JOIN-y bez kartezjanów z rytuałem ziarna (SQL.5),
≥2 funkcje okna z uzasadnieniem (SQL.6 + Z3 labu), wnioski (EDA.3 +
obserwacja „Brooklyn jednym kursem" z SQL.7), repro (EDA.2: repo,
README, historia commitów; pliki `.sql` = nowość operacyjna — patrz
kamienie). Briefing = `theory_md` projektu (ziarno pogłębione — atomy
celowo nie dublują eseju). Dane: próbka NYC TLC wg skryptu ładującego
projektu; licencja NYC Open Data Terms of Use (nie CC — bez gwarancji
poprawności; adnotacja do README jak przy BDL).

**Kamienie milowe (propozycja do `configJson.checks`, 4 szt. — widełki
D3; definicja finalna przy 1E.6):**

- **K1 „Próbka załadowana":** w sesji istnieje tabela/DataFrame
  z próbką przejazdów (≥ tysiące wierszy, kolumny czasu/stref/kwot) —
  check generyczny jak K1 M-EDA.
- **K2 „Zapytania wykonują się":** pieczątka na końcu notebooka —
  wykonanie w bieżącej sesji dotarło bez zatrzymania (limit trybu
  uruchomienia jak K2 M-EDA — jawnie; pełny test od zera robi student,
  rozstrzyga recenzent).
- **K3 „Repo z plikami .sql":** link do publicznego repo; check HTTP
  weryfikuje obecność ≥2 plików `.sql`, skryptu ładującego, `README.md`
  i `requirements.txt` (jak K3 M-EDA + rozszerzenie o .sql).
- **K4 „Submit"** do pipeline'u recenzji (rubryka + viva; wariant C;
  ochrona streaka na czas vivy — D9).

---

## Strona „Pierwsza pomoc — M-SQL" (D5a, statyczna, per moduł)

Strony L0–M-EDA obowiązują. Przyrost M-SQL (komunikaty zweryfikowane
na DuckDB):

1. **`Catalog Error: Table with name … does not exist`** → literówka
   nazwy tabeli ALBO DataFrame nie istnieje w tej sesji (komórka
   z danymi niewykonana — L0.3): uruchom komórki od góry (SQL.1).
2. **`Parser Error: syntax error at or near "…"`** → literówka
   w słowie kluczowym albo zgubiony element składni — silnik wskazuje
   miejsce, w którym przestał rozumieć (SQL.1).
3. **`Binder Error: Referenced column "…" not found`** → literówka
   nazwy kolumny ALBO tekst w PODWÓJNYCH cudzysłowach zamiast
   apostrofów (silnik szuka kolumny o treści Twojego tekstu!) —
   dane w apostrofach (SQL.2).
4. **`Binder Error: column "…" must appear in the GROUP BY clause…`**
   → kolumna luzem przy grupowaniu: opakuj w agregat albo dodaj do
   GROUP BY — świadomie (SQL.3).
5. **Wynik pusty przy poprawnej składni** → warunek nie trafia
   w dane: `SELECT DISTINCT kolumna FROM tabela` pokaże, co naprawdę
   siedzi w kolumnie (odpowiednik `unique()` z M-PD) (SQL.2).
6. **Sumy/liczby „za duże, ale bez błędu"** → kartezjan albo zły ON:
   rytuał `COUNT(*)` przed i po JOIN-ie; równość = ziarno zachowane
   (SQL.5). Najgroźniejsze błędy nie mają komunikatu (F2.5-P2).
7. **Okno „powtarza wartości"** → to definicja okna partycyjnego, nie
   błąd (SQL.6-P3); jeśli chcesz JEDEN wiersz na grupę — to zadanie dla
   GROUP BY.
8. **Zapytanie-tasiemiec nieczytelne dla Ciebie samego** → wróć do
   zasady: klauzule od nowych linii, słowa kluczowe wielkimi, aliasy,
   komentarz `--` nad każdym nieoczywistym fragmentem; buduj klauzula
   po klauzuli, uruchamiając po każdej (L0.4).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://duckdb.org/docs/current/ | Dokumentacja DuckDB — URL kanoniczny po restrukturyzacji (stary `/docs/` przekierowuje) | praktyka-docs (EN — poza ścieżką krytyczną) | MIT (DuckDB) | EN | nie | 2026-07-11 (HTTP 200) |
| https://duckdb.org/docs/current/sql/functions/window_functions | DuckDB — funkcje okna (referencja do SQL.6/capstone'u) | praktyka-docs (EN) | MIT (DuckDB) | EN | nie | 2026-07-11 (HTTP 200, kanoniczny) |
| https://www.youtube.com/watch?v=jIcuNg1RiJA | KajoData — „Darmowy kurs SQL cz. 1" (~31 min, 2022; SELECT 0:40, WHERE 7:28, ORDER BY 14:09, GROUP BY 19:18) | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; silnik MySQL — składnia ANSI przenośna do DuckDB, adnotacja przy prezentacji) |
| https://www.youtube.com/watch?v=ab3gvOHyTEA | KajoData — „Opanuj SQL JOIN w 10 minut" (INNER/LEFT, ~12 min, 2022) | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane) |
| https://www.youtube.com/watch?v=t8Qtw5_EYWA | KajoData — „SQL Window Functions" (~7 min, 2023) — jedyne znalezione darmowe polskie wideo o funkcjach okna | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; seans kontrolny przed ingest) |

Sedno M-SQL w całości w polskiej teorii atomów (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0–M-EDA

| Termin | Po polsku |
|---|---|
| SQL / zapytanie (*query*) | deklaratywny język pytań do tabel: opisujesz wynik, silnik wymyśla wykonanie |
| `SELECT` / `FROM` / `LIMIT` | które kolumny / z której tabeli / ile wierszy podglądu |
| `WHERE` | przesiew wierszy warunkiem (maska z PD.3 po SQL-owemu; równość: pojedynczy `=`) |
| `ORDER BY … DESC` | porządek wyniku (bez niego kolejność NIEgwarantowana); DESC = malejąco |
| `GROUP BY` + `COUNT/SUM/AVG` | podziel-policz-sklej (groupby z PD.6); agregat globalny = bez GROUP BY |
| `AS` (alias) | czytelna nazwa kolumny wyniku albo skrót tabeli |
| `JOIN … ON` | sklejenie tabel wg warunku dopasowania |
| ziarno (*grain*) | co reprezentuje jeden wiersz; rytuał: COUNT przed/po JOIN-ie |
| iloczyn kartezjański | każdy-z-każdym po złączeniu bez warunku — zawyża agregaty bez komunikatu błędu |
| `LEFT JOIN` | złączenie zachowujące WSZYSTKIE wiersze lewej tabeli (brak pary → pustka); zwykły JOIN wiersze bez pary gubi |
| funkcja okna / `OVER (PARTITION BY … ORDER BY …)` | agregat/numeracja liczona w grupach-oknach BEZ zwijania wierszy |
| `ROW_NUMBER` / `RANK` / `LAG` | numeruj wg porządku / z remisami / wartość z poprzedniego wiersza okna |
| `DISTINCT` | unikalne wartości kolumny (przepis diagnostyczny — odpowiednik `unique()`) |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** SQL.1 → SQL.2 → SQL.3 → SQL.4 (lab)
  → SQL.5 → SQL.6 → SQL.7 (lab) → przegląd przed egzaminem (reuse) →
  egzamin (15/≤1) → CAPSTONE (position 100 w drabinie). Modelowanie
  atomów jak poprzednie moduły.
- **Audyt pojemności D10 — wykonany w tym dokumencie** (sekcja na
  górze): bilans 5 nowych atomów, bez podziału modułu; „optymalizacja
  najcięższych zapytań" z OPISU projektu jawnie poza modułem (nie jest
  kryterium rubryki) — gdyby przy 1E.R opis projektu był korygowany,
  to kandydat do złagodzenia.
- **Środowisko:** DuckDB 1.3.2 preinstalowany w Colab (backend-info
  2026-06-25) — bez `!pip`; `duckdb.sql` widzi DataFrame'y sesji po
  nazwie (most M-PD). Wszystkie zapytania treści + komunikaty błędów
  (Catalog/Parser/Binder ×2) zweryfikowane na silniku. `==` w DuckDB
  DZIAŁA jako alias `=` — treść uczy konwencji `=`, bez straszenia.
- **Pieczątki labów:** SQL.4/SQL.7 — pieczątka wykonuje WŁASNE
  zapytania kontrolne i porównuje wyniki (deterministyczne, 0 LLM);
  komórki tekstowe (rytuał ziarna, uzasadnienie okna) poza checkiem —
  jawny limit klasy L0.
- **Kamienie capstone'u:** K1–K4 wyżej (analogia M-EDA + rozszerzenie
  K3 o pliki `.sql`); licencja NYC (Terms of Use, nie CC) — adnotacja
  do README w rampie; definicja finalna przy 1E.6.
- **1 koncept = 1 atom — deklaracja dla SQL.5 (standard L0.2):**
  koncept to JOIN + ziarno; `LEFT JOIN` to świadomy rider (jeden akapit
  teorii + słowniczek, bez pytań/egzaminu) — dane NYC mają wiersze bez
  pary, więc student musi wiedzieć, że wybór typu złączenia istnieje.
  AND/OR (SQL.2) i COUNT(kolumna) (SQL.3) — kontekst konceptów, bez
  deklaracji (ocena przeglądu QG).
- **Monitoring par egzaminu w D11 (precedensy E11/F2, E6/F3,
  E3+E12/M-PD): E3, E6, E12** — pary „dwustronne" (komplementarne
  aspekty), nie ścisłe izomorfy; przy odstającym success rate —
  kandydaci do przepisania.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie SQL.1–SQL.6
  = 325–393 słów z blokami kodu, ~296–308 bez nich — w widełkach przy
  obu metodach; marginesy prozy niskie (jak M-PD) — korekty redakcyjne
  wymagają ponownego pomiaru.
- **Skrypt ładujący próbkę NYC (hak do 1E.R/1E.6, research 2026-07-11):**
  pliki parquet publiczne bez rejestracji na CloudFront TLC (wzorzec
  `yellow_tripdata_RRRR-MM.parquet`); DuckDB czyta je natywnie (httpfs).
  W skrypcie PRZYPIĄĆ konkretny miesiąc (TLC uprzedza o zmianach
  schematu między latami); nyc.gov blokuje boty bez przeglądarkowego
  UA — znane z audytu partii 1, pliki CloudFront wolne od tego.
- **Kanoniczny mini-świat `przejazdy`/`strefy` (QG 2026-07-21, WAŻN-1):**
  wartości były rozsypane po atomach/hintach — poniżej JEDYNY obowiązujący
  listing (checki labów SQL.4/SQL.7 są policzone z NIEGO; komórka „Dane"
  notebooków M-SQL musi go odtworzyć co do wartości):

  ```python
  przejazdy = pd.DataFrame([
      {"id": 1, "strefa_id": 10, "minuty": 12, "kwota": 50.0, "godzina": 8},
      {"id": 2, "strefa_id": 20, "minuty": 35, "kwota": 22.0, "godzina": 8},
      {"id": 3, "strefa_id": 10, "minuty": 7,  "kwota": 14.0, "godzina": 9},
      {"id": 4, "strefa_id": 30, "minuty": 22, "kwota": 41.5, "godzina": 17},
      {"id": 5, "strefa_id": 10, "minuty": 15, "kwota": 28.0, "godzina": 17},
  ])
  strefy = pd.DataFrame([
      {"strefa_id": 10, "nazwa": "Manhattan"},
      {"strefa_id": 20, "nazwa": "Brooklyn"},
      {"strefa_id": 30, "nazwa": "Queens"},
  ])
  ```

  Punkty kontrolne (muszą się zgadzać po każdej edycji danych): SQL.4
  Z2 → 4 wiersze, pierwszy id=2; Z3 → (8, 72.0), (17, 69.5), (9, 14.0);
  SQL.7 Z1 → 5 wierszy; Z2 → Manhattan 3/92.0, Queens 1/41.5,
  Brooklyn 1/22.0; kartezjan bez ON → 15.
- **TODO przed ingest 1E.2:**
  1. Budowa 9 notebooków M-SQL (DuckDB 1.3.2; test `duckdb.sql` na
     DataFrame'ach w Colab — smoke na świeżej sesji).
  2. Research: wideo PL SQL + weryfikacja URL duckdb.org/docs (agent).
  3. Skrypt ładujący próbkę NYC TLC (własność projektu/1E.R) —
     sprawdzić przy 1E.R spójność z atomami (nazwy kolumn PL vs EN
     w próbce: atomy używają mini-świata PL, capstone przejdzie na
     nazwy oryginalne — briefing musi zmostkować, wpis do 1E.R).

## Przebieg QG tego dokumentu (2026-07-11)

Draft → wszystkie zapytania i komunikaty błędów wykonane przez autora
na prawdziwym DuckDB (1.5.4; Colab ma 1.3.2 preinstalowany — ustalone
z backend-info) PRZED pisaniem treści → **2 agentów weryfikacyjnych
(Fable 5)**: (1) przegląd zgodności z ADR-014, 31/31 checków silnika +
**1 znalezisko KRYTYCZNE** (WE atomu SQL.1 sięgało po kolumnę `nazwa`,
której nie ma w `przejazdy` — pierwsza komórka SQL-a w życiu studenta
wybuchałaby Binder Errorem; poprawione na `id, kwota`), 2 WAŻNE
(potrójne cudzysłowy — składnia nigdy nieuczona w drabinie: domknięta
pół-zdaniem w teorii SQL.1; pomiary budżetów), 6 drobnych — wcielone
(m.in. `IS NULL` uczone w miejscu zamiast obiecywane; deklaracja ridera
LEFT JOIN; monitoring par E3/E6/E12; adres kalki L0.2-P2/A); audyt
pojemności D10 potwierdzony (4/4 kryteria rubryki pokryte;
„optymalizacja" tylko w opisie projektu, nie w kryteriach); werdykt
„gotowe po poprawkach"; (2) research zasobów — kanoniczny URL docs
DuckDB to `/docs/current/` (stary przekierowuje), komplet wideo PL
(KajoData: podstawy+JOIN+funkcje okna — jedyny darmowy polski materiał
o oknach; silnik MySQL, składnia ANSI przenośna — adnotacja), pliki
parquet NYC TLC publiczne na CloudFront bez rejestracji (wzorzec pod
skrypt ładujący — hak do 1E.R).

## Przebieg QG spłaty długu labów SQL.4/SQL.7 (2026-07-21)

Kotwice `z1`–`z3` (metoda `.df()` z SQL.1) dopisane do zadań — bez
przypisania wyników pieczątka nie miała czego porównywać. **WAŻN-1:**
wartości mini-świata były rozsypane po hintach pięciu atomów — kanoniczny
listing `przejazdy`/`strefy` przybity w „Notatkach dla Olivera" (checki
labów policzone z NIEGO; rekonstrukcja zweryfikowana przez agenta QG
realnym DuckDB — 10+ punktów kontrolnych SQL.2–SQL.7 spójnych z jednym
zbiorem). **WAŻN-2:** kontrakt SQL.4 rozszerzony o `z1_wiersze=5`
(Zaliczenie obiecuje porównanie `z1`–`z3` — teraz sprawdzane w komplecie).
**GO Z NOTAMI.**

## Przebieg QG notebooków M-SQL (2026-07-22, Krok 4 partia 6)

Notebooki (7 szt., katalog `msql/`) zbudowane wg kontraktu ADR-015: 5 ćwiczeń
bez pieczątki (Sophia) + laby SQL.4/SQL.7 z pieczątką (Oliver). Weryfikacja:
każde zapytanie wykonane realnym DuckDB na kanonicznym mini-świecie; pieczątki
uruchomione ze wzorcowym rozwiązaniem i z 15 wariantami błędnymi.

**Znaleziska wcielone przed PR-em:**

1. **KRYT — luki `______` dają `Binder Error`, NIE `Parser Error`.** DuckDB
   traktuje `______` jako poprawny **identyfikator kolumny**, więc każda
   nieuzupełniona luka kończy się
   `Binder Error: Referenced column "______" not found in FROM clause!`
   (zweryfikowane dla wszystkich 5 kształtów luk SQL.4: `LIMIT`, `WHERE`,
   `ORDER BY`, `______ AS liczba`, `______ AS suma_kwot`). Pierwsza wersja
   nagłówka SQL.4 zapowiadała `Parser Error` — student szukałby błędu
   składni zamiast luki. Poprawione: nagłówek cytuje prawdziwy komunikat
   i dokłada trzeci człon do podziału ról z SQL.1 (*Catalog* = nie znam
   TABELI, *Parser* = nie rozumiem SKŁADNI, ***Binder* = nie znam KOLUMNY**).
2. **WAŻN — pusta komórka SQL.7 daje `AttributeError`, nie błąd SQL.** Komórki
   „Twój raport" zawierają sam komentarz `--`, a `duckdb.sql()` zwraca wtedy
   `None` → `AttributeError: 'NoneType' object has no attribute 'df'`.
   Komunikat niskopoziomowy i mylący („usterka notebooka?"). Poprawione:
   nagłówek SQL.7 zapowiada go i tłumaczy przyczynę.
3. **WAŻN — rozjazd tytułu modułu.** Laby miały „SQL: pytania do danych";
   źródło prawdy (`curriculum_modules.title` na prodzie) to
   **„SQL: analiza danych w bazie"**. Ujednolicone we wszystkich 7.

**Znalezisko INFO — świadomy limit checków → ROZWIĄZANE 2026-07-22 (ADR-017):**

Pierwotnie zanotowano tu świadomy limit checków bez zmiany danych: w mini-świecie
**minuty i kwota były idealnie skorelowane** (12→23.5, 35→61.0, 7→14.0, 22→41.5,
15→28.0 — im dłużej, tym drożej). Skutek: `ORDER BY kwota DESC` dawało identyczną
kolejność co `ORDER BY minuty DESC` (oba: id 2, 4, 5, 1), więc check SQL.4 C3
(`z2_pierwszy_id`) nie odróżniał porządku po minutach od porządku po kwocie;
w SQL.7 licznik miejsc C5 (`z3_miejsca_1`) był niezmiennikiem podziału na strefy —
nie zależał ani od kolumny, ani od kierunku sortowania (`kwota ASC` dawało ranking
najtańszych zamiast najdroższych i również przechodziło). Student z błędną kolumną
lub odwróconym kierunkiem dostawał token.

**Rozwiązane w ADR-017 (2026-07-22) dwoma niezależnymi zmianami:**
1. **Dane (D1):** rozerwana korelacja — dwie kwoty zmienione (id 1: 23.5→50.0,
   id 2: 61.0→22.0), `minuty` nietknięte. Teraz `ORDER BY kwota DESC` w SQL.4 daje
   inną kolejność niż po minutach (na czele id=1 zamiast id=2) → C3 łapie złą kolumnę.
2. **Ładunek (D2):** SQL.7 dostał nowy check `z3_miejsca1_ids` (posortowana lista
   identyfikatorów z miejscem 1) zamiast samego licznika. Rozróżnia: kwota malejąco
   `[1,2,4]` ✔, minuty malejąco `[2,4,5]` ✘, kwota rosnąco `[2,3,4]` ✘. Pieczątka
   SQL.7 odmawia przed emisją tokenu, z diagnozą wskazującą kolumnę i kierunek.

Koszt, warianty odrzucone i tabela rozróżnialności zweryfikowana wykonaniem:
`docs/decisions/017-korelacja-minuty-kwota-msql.md`. Wartości oczekiwane w kontrakcie
przeliczone (SQL.4 C6 `z3_top_suma` 84.5→72.0; SQL.7 C4 `z2_top_suma` 65.5→92.0;
nowy SQL.7 C6 `z3_miejsca1_ids` `[1,2,4]`).

**Pozostałe noty (bez zmian w treści):** kolejność grup bez `ORDER BY` jest
przypadkowa (silnik niczego nie obiecuje — opisane wprost w SQL.3);
`AVG(kwota)` strefy 10 = `30.666666666666668` (długi ogon float — opisany,
żeby nie wyglądał na usterkę); `Catalog Error` dokleja absurdalne
„Did you mean `pg_prepared_statements`?" — rytuał czytania błędu z L0.3
doprecyzowany w SQL.1 (prawdę mówi linia z nazwą błędu NAD podpowiedzią).

**CI:** job `test` dostał `pip install "duckdb~=1.3.2"` obok pandas — harness
wykonuje komórki labów realnym python3, a te importują duckdb. Wersja pinowana
do **Colaba (1.3.2)**, nie do maszyny dev (1.5.x): student ma dostać to, co
przetestowane. Składnia notebooków ograniczona do ANSI obecnego w obu.
