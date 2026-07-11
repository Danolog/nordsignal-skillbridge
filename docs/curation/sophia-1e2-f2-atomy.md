# 1E.2 · Moduł F2 „Python II — kolekcje, pętle, funkcje" — treść atomów

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z wykonaniem 56/56 checków Pythona
— zero krytyków + research zasobów PL; przebieg na końcu dokumentu);
przed ingest 1E.2: TODO z notatek (notebooki F2 z testem usterki input
#3318, seans wideo).
**Podstawa:** ADR-014 — D1/D3/D5/D6/D6.5 (parametry jak w F1); prerekwizyt:
**F1 zaliczony** (typy, wyrażenia, f-string, porównania, if/else —
`sophia-1e2-f1-atomy.md`), L0 zaliczony (Colab, sesja, pieczątka).
**Format:** treść merytoryczna w markdownie; spec JSON pod ingest przy PR-2.

---

## Zasady modułu F2 (przyrost względem F1)

- **Struktura i zaliczenia jak w F1:** 5 atomów `exercise` (wszystkie
  3 pytania poprawnie — licznik M10, nielimitowane próby, R13) + 2 laby
  (wykonanie — pieczątka+token; limity mechanizmu z L0 obowiązują) + egzamin.
- **Spłata obietnic z F1/L0 (anty-redundancja — jawnie):** F2.1 wprowadza
  `input()` („interakcja wejdzie w F2" — zasady F1) oraz `round()` („ładne
  zaokrąglanie poznasz w F2" — pierwsza pomoc F1 poz. 9).
- **Świadomie POZA F2 (pkt 9, just-in-time):** `while`, `range()`,
  `.append()`, słowniki — wejdą w F3/M-EDA, gdzie są pierwszy raz potrzebne;
  F2 domyka minimum potrzebne do pracy na danych: lista → pętla → agregat →
  funkcja.
- **Fading backward (D5a):** F2.1–F2.2 pełne WE → F2.3 completion (luka na
  końcu) → F2.4 lab-szkielet z lukami → F2.5 luki w środku → F2.6 backward
  completion (student pisze definicję do gotowego wywołania) → F2.7 lab
  samodzielny (sama specyfikacja).
- **Koncepty kluczowe modułu (≤4, pod spacing — D6.3):** `lista-kolekcja`
  (F2.2), `petla-for` (F2.3), `wzorzec-akumulatora` (F2.5),
  `funkcja-def-return` (F2.6). F2.1 (`input-konwersja-typow`) — koncept
  zwykły, utrwalany labami.
- **Przegląd przed egzaminem (reuse, 0 nowego autoringu):** F1.5-P2, F1.6-P1,
  F1.6-P3, F2.1-P2, F2.2-P1, F2.3-P1, F2.3-P3, F2.5-P2, F2.6-P1, F2.6-P3
  (10 pytań; konfiguracja pozycji).
- **Egzamin F2:** 15 pytań × 2 warianty, **próg: ≤1 błąd** (jak F1);
  pokrycie 3 pytania na każdy z 5 atomów; kalibracja łatwiejsza niż atomowa
  (D3); bank na końcu dokumentu.
- **Sesja i czas:** 7 pozycji ≈ 3 sesje po 15–30 min (suma szacunków
  ~85–110 min).

---

## Atom F2.1 — Program pyta: input() i konwersja typów

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`input-konwersja-typow` · **Krok fadingu:** pełne WE

### Cel

Napiszesz program, który pyta użytkownika o wartość, zamieni odpowiedź na
liczbę, policzy na niej wynik i zaokrągli go do wypisania — omijając dwie
pułapki: „input zawsze daje tekst" i błąd `ValueError`.

### Teoria

Dotąd „danymi wejściowymi" programu były zmienne wpisane w kod: żeby
policzyć paragon dla innych zakupów, ZMIENIAŁEŚ(-AŚ) KOD. Prawdziwe programy
działają odwrotnie — kod stoi, dane przychodzą od użytkownika. Do tego służy
**`input()`**: program zatrzymuje się, wyświetla pytanie (w Colab pojawia
się pole do wpisania pod komórką), czeka na odpowiedź i dopiero po
zatwierdzeniu Enterem idzie dalej. Tekst pytania podajesz w nawiasie —
tak samo, jak podajesz wartości print-owi. Drobny nawyk czytelności:
zakończ pytanie spacją (`"Ile masz lat? "`), żeby wpisywana odpowiedź nie
kleiła się do znaku zapytania.

Najważniejsza reguła — i pułapka numer jeden: **`input()` ZAWSZE zwraca
tekst (`str`)**. Nawet gdy użytkownik wpisze `25`, dostajesz `"25"` —
z cudzysłowem, typ z F1.1. Zobacz, jak to prowadzi do błędu i jak się go
naprawia:

```python
wiek = input("Ile masz lat? ")   # odpowiedź użytkownika — ZAWSZE str
print(wiek + 1)                  # str + int → jaki błąd znasz z F1?
```

**Przewidź:** użytkownik wpisał 25 — co się stanie w drugiej linii?

`TypeError` — dokładnie ten z F1.1: tekstu nie dodasz do liczby. Naprawa to
**konwersja**: `int(...)` zamienia tekst na liczbę całkowitą, `float(...)` —
na liczbę z kropką:

```python
wiek = int(input("Ile masz lat? "))    # od razu: zapytaj i zamień na int
print(f"Za rok będziesz mieć {wiek + 1} lat.")
```

Zapis `int(input(...))` czytaj od środka na zewnątrz: najpierw wykonuje się
`input(...)` (pytanie, odpowiedź-tekst), a jego wynik od razu wchodzi do
`int(...)` — tak jak w F1.1 wkładałeś(-aś) `type(...)` do `print(...)`.
Od tej linii `wiek` jest już liczbą i cała reszta programu może na nim
normalnie liczyć.

Konwersja ma warunek: tekst musi dać się przeczytać jako liczba.
`int("25")` → `25`, ale `int("dwadzieścia")` zatrzyma program
z **`ValueError`** („zła wartość") — komunikat czytasz metodą z L0.3.
Uwaga na drobiazg: `int("7.5")` też rzuca `ValueError` — tekst z kropką
konwertuj przez `float(...)`.

Druga spłata obietnicy (pierwsza pomoc F1, poz. 9 — ogon cyfr float):
**`round(wartość, liczba_miejsc)`** zaokrągla: `round(16.200000000000003, 2)`
→ `16.2`, a `round(3.14159, 2)` → `3.14`. Używaj go przy WYPISYWANIU
wyników, w klamrze f-stringa — `f"Razem: {round(suma, 2)} zł"` — a nie przy
liczeniu: wewnątrz obliczeń pełna dokładność nie przeszkadza, zaokrąglenie
to kosmetyka ostatniej chwili.

### Pytania (retrieval)

**P1. Użytkownik na pytanie `input("Podaj cenę: ")` wpisał `40`. Jaką wartość
dostał program?**

- A. Liczbę `40` typu `int` — *Nie — input nie zgaduje, czym jest odpowiedź:
  ZAWSZE oddaje tekst; o zamianę na liczbę musisz poprosić sam(a).*
  (diagnoza: zakłada domyślną konwersję po wyglądzie)
- B. **Tekst `"40"` typu `str`** ✓ — *Tak — wszystko, co przychodzi
  z `input()`, jest napisem; do liczenia zamień je przez `int(...)` albo
  `float(...)`.*
- C. Liczbę `40.0` typu `float` — *Nie — nawet gdyby użytkownik wpisał
  `40.0`, program dostałby TEKST `"40.0"`; float robi się dopiero konwersją.*
  (diagnoza: jak A, z innym typem)
- D. To zależy, co wpisał użytkownik — *Nie — treść zależy od użytkownika,
  ale TYP nigdy: zawsze `str`. Ta pewność to właśnie sedno reguły.*
  (diagnoza: myli treść odpowiedzi z jej typem)

**P2. Program: `kwota = input("Kwota: ")`, potem `print(kwota + 10)`.
Użytkownik wpisał 50. Co się stanie i jaka jest poprawka?**

- A. Wypisze 60; nic nie trzeba poprawiać — *Nie — `kwota` to tekst `"50"`,
  a `"50" + 10` to `TypeError` (F1.1): tekstu nie dodasz do liczby.*
  (diagnoza: nie stosuje reguły „input daje str")
- B. Wypisze 5010 — *Nie — sklejanie plusem działa między DWOMA tekstami;
  tu po prawej jest liczba, więc zamiast sklejenia jest `TypeError`.*
  (diagnoza: pamięta o sklejaniu, zapomina o typie prawej strony)
- C. **`TypeError`; poprawka: `kwota = int(input("Kwota: "))`** ✓ — *Tak —
  konwersja na wejściu załatwia sprawę raz na zawsze: dalej `kwota` jest już
  liczbą.*
- D. `ValueError`, bo 50 to nie tekst — *Nie — `ValueError` pojawia się przy
  KONWERSJI tekstu, który nie jest liczbą (np. `int("abc")`); tu do żadnej
  konwersji nie doszło — poległo dodawanie, czyli `TypeError`.* (diagnoza:
  myli dwa błędy — warto je rozróżniać, bo wskazują różne poprawki)

**P3. Co zrobi `int("abc")`?**

- A. Zwróci 0 — *Nie — Python nie wstawia wartości zastępczej: konwersja,
  która nie ma sensu, zatrzymuje program błędem.* (diagnoza: oczekuje
  „cichego" ratunku)
- B. Zwróci `"abc"` bez zmian — *Nie — `int(...)` nie przepuszcza dalej
  rzeczy, których nie umie zamienić: zatrzymuje się błędem.* (diagnoza:
  konwersja jako „sugestia")
- C. **Zatrzyma program z `ValueError`** ✓ — *Tak — „zła wartość": tekst
  `"abc"` nie daje się przeczytać jako liczba całkowita.*
- D. Zatrzyma program z `TypeError` — *Blisko — ale `TypeError` mówi „ta
  OPERACJA nie pasuje do typów", a tu operacja (konwersja) jest legalna,
  tylko WARTOŚĆ jest zła: `ValueError`.* (diagnoza: skleja dwa błędy
  w jeden — rozróżnienie: operacja vs wartość)

### Drabinka hintów

1. **Koncepcyjny:** Mantra atomu: „input daje tekst — licz dopiero po
   konwersji". Schemat: `nazwa = int(input("pytanie"))` dla liczb
   całkowitych, `float(...)` gdy możliwa kropka. `ValueError` przy konwersji
   = użytkownik wpisał coś, co liczbą nie jest.
2. **Szkielet:** W notebooku F2.1 uzupełnij:
   `cena = _____(input("Cena biletu (może być z groszami): "))` — która
   konwersja, skoro mogą być grosze? Potem
   `print(f"Dwa bilety: {round(_____ * 2, 2)} zł")` — co mnożysz?
3. **Pełne rozwiązanie z objaśnieniem:**
   `cena = float(input("Cena biletu (może być z groszami): "))` — float, bo
   „z groszami" znaczy możliwa kropka (`int("7.50")` rzuciłby `ValueError`);
   `print(f"Dwa bilety: {round(cena * 2, 2)} zł")` — mnożysz skonwertowaną
   `cena`, a `round(..., 2)` obcina ewentualny ogon cyfr float do dwóch
   miejsc. Test: wpisz `7.50` → `Dwa bilety: 15.0 zł`. Jeśli dostajesz
   `ValueError` przy poprawnej liczbie — sprawdź, czy nie wpisujesz
   przecinka zamiast kropki (F1.1 obowiązuje też użytkownika!).

---

## Atom F2.2 — Lista: jedno pudełko, wiele przegródek

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`lista-kolekcja` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Zapiszesz kilka wartości w jednej liście, odczytasz wybraną przegródkę
(pamiętając, że Python liczy od zera) i sprawdzisz długość listy funkcją
`len()`.

### Teoria

Dotąd jedno pudełko trzymało jedną wartość. Przy danych to za mało: wydatki
z tygodnia to nie jedna liczba, ale seria. **Lista** to pudełko
z przegródkami — jedna zmienna, wiele wartości, w ustalonej kolejności:

```python
wydatki = [120, 80, 45, 60]     # lista: nawiasy KWADRATOWE, wartości po przecinku
print(len(wydatki))             # len(...) = ile przegródek?
print(wydatki[0])               # wartość z przegródki numer 0
```

**Przewidź:** co wypiszą dwie ostatnie linie?

`4` i `120`. Pierwsza niespodzianka ukryta jest w drugiej odpowiedzi:
**Python numeruje przegródki od ZERA**. `wydatki[0]` to pierwsza wartość,
`wydatki[1]` — druga, a ostatnia z czterech siedzi pod numerem `[3]`.
Numer przegródki (fachowo: **indeks**) podajesz w nawiasach kwadratowych
za nazwą listy.

Numeracja od zera to nie pomyłka projektantów — to konwencja ogromnej
większości języków programowania; nie da się jej obejść, trzeba przywyknąć
(pomaga czytanie indeksu jako „o ile przegródek od początku"). Wynika z niej
reguła, która będzie wracać: **ostatni indeks = długość minus jeden**.
Lista o `len(...)` równym 4 ma przegródki 0, 1, 2, 3.
Sięgnięcie po nieistniejącą przegródkę — `wydatki[4]` — zatrzymuje program
z **`IndexError: list index out of range`** („indeks poza zakresem";
czytanie komunikatów — L0.3). To trzeci błąd-drogowskaz w Twojej kolekcji,
obok `TypeError` i `ValueError`: mówi „lista jest krótsza, niż myślisz".

Lista przechowa każdy typ z F1.1 — także teksty:
`zakupy = ["chleb", "masło", "ser"]` — i typy można mieszać, choć
w praktyce jedna lista najlepiej trzyma jeden rodzaj wartości (ta sama
higiena, co przy pudełkach w F1.1). Przegródkę można też nadpisać jak
zwykłą zmienną: `wydatki[1] = 95` podmienia drugą wartość — ale tylko
ISTNIEJĄCĄ: nowych przegródek tym sposobem nie dodasz (dodawanie elementów
do listy poznasz w F3, gdy będzie potrzebne). Całą listę
wypisuje zwykły print: `print(wydatki)` pokaże ją w nawiasach kwadratowych,
z przecinkami — wygodne do szybkiego podejrzenia danych. Istnieje też lista
pusta, `[]`, o długości zero — brzmi jak dziwactwo, ale to naturalny stan
początkowy „jeszcze nic nie zebrałem". Kolejność w liście jest stała —
wartości siedzą tak, jak je wpisano, i to na tej gwarancji zbudujemy pętlę
w następnym atomie.

### Pytania (retrieval)

**P1. `oceny = [3, 5, 4]`. Co wypisze `print(oceny[1])`?**

- A. 3 — *Nie — 3 siedzi pod indeksem 0; Python numeruje od zera, więc `[1]`
  to DRUGA przegródka.* (diagnoza: numeracja od jedynki)
- B. **5** ✓ — *Tak — indeks 1 = druga wartość; pierwsza ma indeks 0.*
- C. 1 — *Nie — w nawiasie kwadratowym stoi NUMER przegródki, a wypisuje się
  jej ZAWARTOŚĆ.* (diagnoza: myli indeks z wartością)
- D. `IndexError` — *Nie — lista ma przegródki 0, 1, 2, więc `[1]` istnieje;
  błąd byłby przy `[3]` i wyżej.* (diagnoza: nie wiąże jeszcze zakresu
  indeksów z długością)

**P2. `zakupy = ["chleb", "masło", "ser", "jajka"]`. Co zwróci
`len(zakupy)` i jaki indeks ma OSTATNI element?**

- A. 4 i 4 — *Prawie — długość się zgadza, ale numeracja idzie od zera:
  ostatnia przegródka to `len - 1`, czyli 3.* (diagnoza: długość poprawna,
  reguła „minus jeden" pominięta)
- B. **4 i 3** ✓ — *Tak — cztery przegródki o numerach 0–3; ostatni indeks
  to zawsze długość minus jeden.*
- C. 3 i 3 — *Nie — `len` zlicza WSZYSTKIE przegródki (jest ich 4);
  to indeksy kończą się na 3.* (diagnoza: odwrotne pomieszanie — długość
  „od zera")
- D. 4 i „jajka" — *Nie — pytanie o INDEKS, czyli numer przegródki; „jajka"
  to jej zawartość.* (diagnoza: indeks vs wartość, jak P1/C)

**P3. `ceny = [10, 20, 30]`. Co zrobi `print(ceny[3])`?**

- A. Wypisze 30 — *Nie — 30 siedzi pod indeksem 2; numer 3 wskazuje CZWARTĄ
  przegródkę, której nie ma.* (diagnoza: numeracja od jedynki, wersja
  „z końca")
- B. Wypisze 3 — *Nie — w nawiasie stoi żądany numer przegródki, nie wartość
  do wypisania.* (diagnoza: indeks vs wartość)
- C. Dopisze nową przegródkę i wypisze pustkę — *Nie — odczyt nie tworzy
  przegródek; sięgnięcie poza listę to błąd, nie rozszerzenie.* (diagnoza:
  model „lista rośnie na żądanie")
- D. **Zatrzyma program z `IndexError: list index out of range`** ✓ — *Tak —
  trzy przegródki mają numery 0, 1, 2; `[3]` jest poza zakresem. Komunikat
  mówi wprost: indeks poza zakresem listy.*

### Drabinka hintów

1. **Koncepcyjny:** Narysuj listę jako szereg przegródek i PODPISZ je
   numerami, zaczynając od 0. Wszystkie trzy pytania rozstrzyga ten jeden
   rysunek: indeks to podpis przegródki, wartość to jej zawartość, a podpisów
   jest tyle, co przegródek — od 0 do `len - 1`.
2. **Szkielet:** Dla `oceny = [3, 5, 4]` wypisz w notebooku F2.2 po kolei
   `oceny[0]`, `oceny[1]`, `oceny[2]` — i przekonaj się, co wisi pod którym
   numerem. Potem spróbuj ŚWIADOMIE `oceny[3]` — zobacz `IndexError` na
   własne oczy (jak `NameError` w L0.3: ma Cię nie zaskakiwać).
3. **Pełne rozwiązanie z objaśnieniem:** `oceny[1]` → `5` (indeks 1 = druga
   wartość). `len(zakupy)` → `4`, ostatni indeks `3` (= 4 − 1). `ceny[3]` →
   `IndexError: list index out of range`, bo istnieją tylko indeksy 0–2.
   Gdy w prawdziwym kodzie widzisz `IndexError`, sprawdź dwie rzeczy:
   (a) czy nie liczysz od jedynki, (b) czy lista na pewno ma tyle
   elementów, ile zakładasz (`print(len(...))` to najszybsza diagnoza).

---

## Atom F2.3 — Pętla for: zrób to dla każdego elementu

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:** `petla-for`
(KLUCZOWY) · **Krok fadingu:** completion (luka na końcu WE)

### Cel

Napiszesz pętlę `for`, która wykona ten sam blok kodu dla każdego elementu
listy po kolei — i wskażesz, co w programie wykonuje się wielokrotnie,
a co tylko raz.

### Teoria

Masz listę czterech wydatków i chcesz każdy wypisać w osobnej linii
paragonu. Cztery printy? A co przy czterdziestu? Od powtarzania jest
**pętla `for`** — „dla każdego elementu listy wykonaj ten blok":

```python
wydatki = [120, 80, 45, 60]
for wydatek in wydatki:                  # nagłówek: dwukropek jak w if!
    print(f"Pozycja: {wydatek} zł")      # ciało pętli — WCIĘTE jak w if
print("--- koniec paragonu ---")         # bez wcięcia: wykona się RAZ, po pętli
```

**Przewidź:** ile linii wypisze ten program i co będzie w ostatniej?

Pięć linii: cztery `Pozycja: … zł` (po jednej na element, w kolejności
z listy) i raz `--- koniec paragonu ---`. Rozbierzmy nagłówek na części:

- `wydatki` (po `in`) — lista, po której pętla przechodzi;
- `wydatek` (po `for`) — **zmienna pętli**: nazwa, którą wybierasz sam(a);
  przy każdym obrocie Python wkłada do niej KOLEJNY element listy. W obrocie
  pierwszym `wydatek` to 120, w drugim 80, i tak dalej. Dobra konwencja
  nazywania: liczba pojedyncza dla elementu, mnoga dla listy (`wydatek`
  w `wydatki`, `ocena` w `oceny`) — nagłówek czyta się wtedy jak zdanie
  i trudniej pomylić, która nazwa jest którą;
- dwukropek i wcięcie — dokładnie ta sama mechanika, co w `if` (F1.6):
  dwukropek kończy nagłówek, wcięte linie to ciało pętli (może ich być
  wiele), pierwsza linia bez wcięcia to powrót do zwykłego biegu programu.

Ile obrotów zrobi pętla? Tyle, ile elementów ma lista — `len(wydatki)`
(F2.2). Lista pusta = zero obrotów: ciało nie wykona się wcale i program
przechodzi od razu za pętlę — to nie błąd, tylko całkowicie poprawna odpowiedź
na sytuację „nie było czego powtórzyć".
Zauważ też, czego w nagłówku NIE ma: żadnych indeksów. Pętla sama sięga po
kolejne przegródki — nie piszesz `wydatki[0]`, `wydatki[1]`… i nie
ryzykujesz `IndexError`; to pętla pilnuje, żeby nie wyjść poza listę.
Szczegół przydatny przy szukaniu błędów: po zakończeniu pętli zmienna
pętli nadal istnieje i trzyma OSTATNI element — `print(wydatek)` za pętlą
wypisze 60.

Completion na rozgrzewkę (luka na końcu — notebook F2.3): dopisz nagłówek
tak, by wypisać każdy produkt z listy:

```python
zakupy = ["chleb", "masło", "ser"]
for ______ in ______:
    print(f"Do koszyka: {produkt}")
```

(Wskazówka jest w ciele pętli: jakiej nazwy zmiennej pętli ono oczekuje?)

### Pytania (retrieval)

**P1. `ceny = [5, 10, 15, 20]`; pętla `for cena in ceny:` z jedną wciętą
linią w ciele. Ile razy wykona się ciało pętli?**

- A. Raz — dla całej listy naraz — *Nie — pętla podaje elementy POJEDYNCZO:
  ciało wykonuje się osobno dla każdego z nich.* (diagnoza: pętla jako
  operacja „hurtowa")
- B. **4 razy — po jednym obrocie na element** ✓ — *Tak — tyle obrotów, ile
  elementów ma lista; w każdym obrocie `cena` to kolejna wartość.*
- C. 3 razy — indeksy kończą się na 3 — *Nie — indeksy 0–3 to CZTERY
  przegródki (F2.2); pętla obraca się raz na każdą.* (diagnoza: reguła
  „ostatni indeks = len − 1" źle przeniesiona na LICZBĘ obrotów)
- D. To zależy od liczby linii w ciele — *Nie — liczba linii w ciele mówi,
  ile pracy jest W JEDNYM obrocie; liczbę obrotów wyznacza wyłącznie długość
  listy.* (diagnoza: myli rozmiar ciała z liczbą powtórzeń)

**P2. Co wypisze: `for n in [1, 2, 3]:` / (wcięte) `print(n * 2)`?**

- A. 1 2 3 — *Nie — ciało mnoży każdy element przez 2 przed wypisaniem;
  zmienna pętli to surowiec, print dostaje wynik wyrażenia.* (diagnoza:
  ignoruje operację w ciele)
- B. 6 — *Nie — pętla nie sumuje elementów; wykonuje ciało osobno dla
  każdego: trzy printy, nie jeden.* (diagnoza: myli pętlę z agregacją —
  o zbieraniu wyników mówi dopiero F2.5)
- C. **2, 4, 6 — każda liczba w osobnej linii** ✓ — *Tak — trzy obroty:
  `n` przyjmuje 1, 2, 3, a print wypisuje `n * 2`.*
- D. 2 4 6 w jednej linii — *Prawie — wartości się zgadzają, ale każdy obrót
  to OSOBNE wywołanie print, a print kończy linię: trzy linie.* (diagnoza:
  wynik policzony, mechanika printów pominięta)

**P3. Po pętli stoi linia `print("Gotowe")` BEZ wcięcia. Kiedy się
wykona?**

- A. Po każdym obrocie pętli — *Nie — po każdym obrocie wykonują się tylko
  linie WCIĘTE; brak wcięcia wyprowadza linię poza ciało.* (diagnoza:
  granica ciała nieczytana z wcięcia — ta sama reguła co w F1.6)
- B. Wcale — pętla „zjada" resztę programu — *Nie — pętla kończy się wraz
  z listą, a program normalnie biegnie dalej od pierwszej niewciętej
  linii.* (diagnoza: pętla jako koniec programu)
- C. **Raz — po zakończeniu ostatniego obrotu** ✓ — *Tak — to zwykły dalszy
  ciąg programu: pętla wykonała swoje obroty i bieg przeszedł niżej
  (identycznie jak `print("Koniec zakupów")` za if/else w F1.6).*
- D. Przed pętlą — Python najpierw robi to, co krótsze — *Nie — program
  wykonuje się ściśle od góry do dołu (L0.4); nic nie jest przestawiane.*
  (diagnoza: magiczna optymalizacja kolejności)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** Nagłówek pętli czyta się jak zdanie: „dla każdego
   ELEMENTU w LIŚCIE". Po `for` stoi nazwa, którą nadajesz kolejnym
   elementom (i której używa ciało!), po `in` — istniejąca lista. Ciało już
   napisane — ono zdradza, jakiej nazwy oczekuje.
2. **Szkielet:** Ciało brzmi `print(f"Do koszyka: {produkt}")` — więc
   zmienna pętli MUSI nazywać się `produkt` (inaczej `NameError`). Lista
   w tym programie jest jedna. Złóż: `for produkt in ______:`.
3. **Pełne rozwiązanie z objaśnieniem:** `for produkt in zakupy:` — trzy
   obroty: `produkt` przyjmuje `"chleb"`, `"masło"`, `"ser"`; wynik to trzy
   linie „Do koszyka: …". Najczęstsze potknięcia: nazwa po `for` inna niż
   ta w ciele → `NameError` w pierwszym obrocie (Python szuka `produkt`,
   a Ty dałeś(-aś) np. `p`); brak dwukropka → `SyntaxError: expected ':'`
   (strażnik znany z F1.6); ciało bez wcięcia →
   `IndentationError: expected an indented block`.

---

## Atom F2.4 — LAB „Paragon z listy" (lista + pętla w jednym programie)

**Typ:** `lab` · **Czas studenta:** ~15–20 min · **Koncepty ćwiczone:**
`lista-kolekcja`, `petla-for` (+ f-string z F1) · **Krok fadingu:**
szkielet z lukami

### Cel

Przepiszesz paragon z F1.4 na listę i pętlę: jeden program obsłuży dowolną
liczbę pozycji — dopisanie zakupu to zmiana danych, nie kodu.

### Zadanie (notebook F2.4 — kopia na Dysk, uzupełnij luki, uruchom)

```python
# --- dane wejściowe ---
ceny = [5.50, 12.00, 3.75, 8.25]      # ceny zakupów w zł

# --- paragon ---
print("--- PARAGON ---")
for ______ in ______:                  # luka 1: nagłówek pętli
    print(f"Pozycja: {______} zł")     # luka 2: co w klamrze?
print(f"Pozycji na paragonie: {______}")   # luka 3: ile zakupów? (jedna funkcja z F2.2)
```

Wymagania: pętla ma przejść po `ceny`; klamra w ciele wypisuje bieżący
element; luka 3 zlicza pozycje FUNKCJĄ, nie ręcznie wpisaną liczbą. Po
uruchomieniu dopisz do listy piątą cenę i uruchom ponownie — paragon ma się
wydłużyć bez żadnej zmiany w kodzie poniżej linii „paragon".

**Zaliczenie:** komórka-pieczątka: sprawdza, że `ceny` istnieje i jest listą
**co najmniej 5** wartości liczbowych — szkielet startuje z czterema, więc
token dowodzi właśnie kroku „dopisz piątą cenę i uruchom ponownie", który
jest sednem labu — i liczy token z kodu atomu. Jawny limit
(klasa L0): wypisania linii paragonu pieczątka nie widzi — luki 1–2
weryfikuje treściowo drabinka, a docelowo pytania egzaminu; check mierzy
wykonanie notebooka z poprawnymi danymi.

### Drabinka hintów

1. **Koncepcyjny:** Luka 1 to pełny nagłówek z F2.3: „dla każdej CENY
   w CENACH". Nazwę zmiennej pętli wybierasz sam(a) — ale ciało (luka 2)
   musi używać TEJ SAMEJ nazwy. Luka 3: funkcja, która mówi, ile przegródek
   ma lista (F2.2).
2. **Szkielet:** luka 1: `for cena in ______:` (co stoi po `in`?); luka 2:
   nazwa z luki 1; luka 3: `len(______)`.
3. **Pełne rozwiązanie z objaśnieniem:** `for cena in ceny:` /
   `print(f"Pozycja: {cena} zł")` / `print(f"Pozycji na paragonie:
   {len(ceny)}")`. Cztery obroty → cztery linie pozycji + jedna
   podsumowania (`4`). Po dopisaniu piątej ceny: pięć linii i `5` — bez
   dotykania kodu, bo i pętla, i `len` czytają AKTUALNĄ listę. Jeśli
   w ciele masz `NameError` — nazwa w klamrze różni się od nazwy po `for`;
   jeśli wypisuje się jedna linia — sprawdź wcięcie (linia poza ciałem
   wykonuje się raz, F2.3-P3).

---

## Atom F2.5 — Wzorzec akumulatora: zbierz wynik z całej listy

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`wzorzec-akumulatora` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Policzysz jedną wartość z całej listy (sumę, a z niej średnią) prowadząc
przez pętlę zmienną-zbieracza — i wskażesz, dlaczego zbieracz startuje
PRZED pętlą.

### Teoria

Pętla z F2.3 widzi jeden element naraz — wypisze każdy wydatek, ale „ile
wydałem ŁĄCZNIE?" wymaga pamiętania czegoś MIĘDZY obrotami. Do tego służy
**akumulator**: zwykła zmienna-zbieracz, którą zakładasz przed pętlą
i powiększasz w każdym obrocie.

```python
wydatki = [120, 80, 45, 60]

suma = 0                       # akumulator: startuje z zerem PRZED pętlą
for wydatek in wydatki:
    suma = suma + wydatek      # nowa suma = stara suma + bieżący element
print(f"Łącznie: {suma} zł")   # po pętli akumulator ma wynik z całości
```

**Przewidź:** jaką wartość ma `suma` po pierwszym obrocie? A po ostatnim?

Po pierwszym: 120 (0 + 120). Po ostatnim: 305. Kluczowa linia to
`suma = suma + wydatek` — czytaj ją jak w L0: prawa strona liczy się
NAJPIERW (stara wartość plus bieżący element), wynik ląduje z powrotem
w pudełku. Obrót po obrocie: 0 → 120 → 200 → 245 → 305. Takie rozpisanie
stanów w tabelce (obrót | element | suma) to najlepszy sposób sprawdzania
KAŻDEJ pętli z akumulatorem — chwila z kartką oszczędza długie zgadywanie,
czemu wynik jest dziwny.

Dwie zasady położenia — obie brzmią pedantycznie, obie są śmiertelnie
ważne:

1. **Start akumulatora PRZED pętlą.** Gdyby `suma = 0` stało WEWNĄTRZ
   ciała, każdy obrót kasowałby zebrane — na końcu zostałby sam ostatni
   wydatek.
2. **Odczyt wyniku PO pętli** (linia bez wcięcia). Print wewnątrz ciała też
   działa, ale pokazuje stany pośrednie — czasem tego chcesz (np. do
   podejrzenia, jak suma narasta), zwykle nie.

Akumulatorem nie musi być suma. Ten sam wzorzec ZLICZA: `licznik = 0` przed
pętlą, `licznik = licznik + 1` w ciele — policzy obroty. Dla całej listy
szybciej zrobi to `len(...)`, ale licznik zabłyśnie w F3, gdy będziesz
zliczać tylko WYBRANE elementy (np. wydatki powyżej 100 zł).

Akumulator z lukami w środku (uzupełnij w notebooku F2.5 — policz średnią
ocen):

```python
oceny = [4, 5, 3, 4]

suma = ______                  # luka A: od czego startuje zbieracz?
for ocena in oceny:
    suma = ______ + ______     # luka B: nowa wartość zbieracza
srednia = suma / len(oceny)    # F2.2: len zlicza elementy
print(f"Średnia: {srednia}")
```

Średnia wychodzi `4.0` — z kropką, bo dzielenie (F1.2). Nazwa `suma` nie
jest niczym wyjątkowym — akumulatorem bywa każda zmienna prowadzona przez
pętlę: zbieracz kwot, licznik sztuk, sklejany tekst. Wspólny mianownik
zawsze ten sam: start przed pętlą, dokładka co obrót, odczyt po. Ten sam
wzorzec policzy Ci kiedyś sumę kolumny w danych — nazwy się zmienią,
szkielet zostaje.

### Pytania (retrieval)

**P1. `kwoty = [10, 20, 30]`; `suma = 0` przed pętlą;
w ciele `suma = suma + kwota`. Jaka jest `suma` po pętli?**

- A. 30 — *Nie — 30 to wkład OSTATNIEGO obrotu; akumulator zbiera wszystkie:
  0+10, potem +20, potem +30.* (diagnoza: widzi ostatni obrót zamiast
  narastania)
- B. **60** ✓ — *Tak — trzy obroty dokładają kolejno 10, 20, 30 do zera:
  0 → 10 → 30 → 60.*
- C. 0 — *Nie — zero to stan STARTOWY; każdy obrót pętli powiększa
  akumulator o bieżący element.* (diagnoza: nie widzi, że przypisanie
  w ciele zmienia zmienną spoza pętli)
- D. `NameError` — `suma` użyta zanim policzona — *Nie — `suma` istnieje od
  linii `suma = 0`; w ciele prawa strona czyta jej BIEŻĄCĄ wartość, to
  legalne i to sedno wzorca.* (diagnoza: nie ufa odczytowi i zapisowi tej
  samej zmiennej w jednej linii)

**P2. Ten sam program, ale `suma = 0` przeniesione DO WNĘTRZA pętli (wcięte,
pierwsza linia ciała). Jaka jest `suma` po pętli?**

- A. 60, jak wcześniej — *Nie — teraz KAŻDY obrót zaczyna od wyzerowania:
  z poprzednich obrotów nic nie zostaje.* (diagnoza: położenie inicjalizacji
  uznane za nieistotne — sedno tego pytania)
- B. **30 — każdy obrót zeruje zbieracza, więc zostaje tylko ostatni
  element** ✓ — *Tak — obrót: wyzeruj, dodaj bieżący; po ostatnim obrocie
  w środku jest sam element 30. Dlatego akumulator startuje PRZED pętlą.*
- C. 0 — *Blisko — zerowanie faktycznie psuje zbieranie, ale po wyzerowaniu
  obrót jeszcze DODAJE bieżący element; na końcu zostaje ostatni: 30.*
  (diagnoza: dostrzega zerowanie, gubi dodawanie po nim)
- D. Błąd — nie wolno zerować w pętli — *Nie — Python wykona to posłusznie,
  bez błędu; program jest legalny, tylko liczy co innego, niż chcesz.
  Najgroźniejsze błędy to te BEZ komunikatu.* (diagnoza: oczekuje, że język
  wyłapie błąd logiczny)

**P3. Do akumulatora nad `oceny = [4, 5, 3, 4]` dokładasz
`srednia = suma / len(oceny)` po pętli. Jaki wynik i jaki typ?**

- A. 4 typu `int` — *Prawie — wartość dobra, ale dzielenie `/` ZAWSZE daje
  float (F1.2): wynik to `4.0`.* (diagnoza: reguła typu wyniku dzielenia)
- B. **4.0 typu `float`** ✓ — *Tak — 16 / 4 = 4.0; kropka to podpis
  dzielenia, wartość się nie zmienia.*
- C. 5.33 — bo `len` zlicza od zera i daje 3 — *Nie — `len` zlicza
  WSZYSTKIE elementy (4); to INDEKSY kończą się na len − 1 (F2.2). Suma 16
  przez 4 to 4.0.* (diagnoza: „minus jeden" wciśnięte tam, gdzie go nie ma)
- D. `ZeroDivisionError` — *Nie — ten błąd wymaga zera w mianowniku,
  a `len(oceny)` to 4; groziłby dopiero przy PUSTEJ liście — dobra
  intuicja, złe miejsce.* (diagnoza: pamięta o pułapce dzielenia, nie
  sprawdza warunku)

### Drabinka hintów (luki z teorii)

1. **Koncepcyjny:** Wzorzec ma trzy piętra i każde ma swoje miejsce: start
   zbieracza (PRZED pętlą, raz), powiększanie (W ciele, co obrót), odczyt
   (PO pętli, raz). Luka A to piętro pierwsze; luka B to linia „nowa wartość
   = stara wartość + bieżący element" — obie nazwy już w programie są.
2. **Szkielet:** luka A: liczba, od której zaczyna się sumowanie (ile masz
   ZANIM cokolwiek dodasz?); luka B: `suma = suma + ______` — co dokłada
   bieżący obrót? (nazwa z nagłówka pętli).
3. **Pełne rozwiązanie z objaśnieniem:** luka A: `0`; luka B:
   `suma = suma + ocena`. Przebieg: 0 → 4 → 9 → 12 → 16; średnia
   `16 / 4` = `4.0`. Samokontrola wzorca przy każdym przyszłym użyciu:
   (1) zbieracz przed pętlą? (2) w ciele stara wartość + element? (3) odczyt
   bez wcięcia? Jeśli wynik to „ostatni element zamiast sumy" — pkt 1 wisi
   w ciele (pytanie P2); jeśli `NameError` przy `suma` — pkt 1 w ogóle
   nie istnieje.

---

## Atom F2.6 — Funkcja: nazwij fragment kodu i używaj go wielokrotnie

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`funkcja-def-return` (KLUCZOWY) · **Krok fadingu:** backward completion —
student pisze definicję do gotowych wywołań

### Cel

Zdefiniujesz własną funkcję z parametrem i `return`, wywołasz ją
wielokrotnie z różnymi argumentami — i rozróżnisz definicję (przepis) od
wywołania (gotowanie).

### Teoria

Znasz już funkcje cudze: `print(...)`, `len(...)`, `int(...)`, `round(...)`
— podajesz wartość w nawiasie, dostajesz efekt. **Teraz napiszesz własną.**
Funkcja to nazwany fragment kodu: definiujesz raz, wywołujesz ile chcesz.
Zysk jest podwójny: nie powtarzasz kodu (obliczenie brutto w dziesięciu
miejscach = dziesięć okazji do literówki; funkcja = jedno miejsce prawdy),
a dobrze nazwana funkcja czyta się jak słowo w zdaniu — `brutto(100)` mówi
CO się dzieje, bez zaglądania JAK.

```python
def brutto(cena):                  # DEFINICJA: słowo def, nazwa, parametr, dwukropek
    return cena * 1.23             # ciało WCIĘTE; return odsyła wynik

print(brutto(100))                 # WYWOŁANIE: nazwa + wartość w nawiasie
print(brutto(200))
```

**Przewidź:** co wypiszą dwa printy?

`123.0` i `246.0`. Rozbiór na części:

- **`def`** otwiera definicję: nazwa funkcji (zasady jak dla zmiennych —
  L0.4), w nawiasie **parametr** — pudełko, które przy każdym wywołaniu
  dostaje podaną wartość. Wartość podawaną w wywołaniu nazywa się
  **argumentem**: przy `brutto(100)` argument 100 ląduje w parametrze
  `cena`. Dwukropek i wcięte ciało — mechanika znana z `if` i `for`.
- **`return`** kończy pracę funkcji NATYCHMIAST i ODSYŁA wynik w miejsce
  wywołania: `brutto(100)` staje się wartością `123.0`, którą można
  wypisać, zapisać do zmiennej (`vat = brutto(100)`) albo wstawić w klamrę
  f-stringa — jak każde wyrażenie (F1.2). „Natychmiast" znaczy dosłownie:
  linie pod wykonanym return-em już się nie wykonają.
- **Definicja sama z siebie NIC nie robi.** Komórka z samym `def` wykona
  się „bezgłośnie" — Python tylko zapamiętał przepis. Rzeczy dzieją się
  przy WYWOŁANIU. To najczęstsze zdziwienie tego atomu: „napisałem funkcję
  i nic się nie wypisało" — bo nikt jej nie wywołał.

Parametrów może być więcej — wypisujesz je w definicji po przecinku
(np. `def rata(kwota, miesiace):`) i podajesz w wywołaniu tyle samo
argumentów, w tej samej kolejności. W F2 w zupełności wystarczy jeden.

I pułapka domykająca: funkcja bez `return` (np. taka, która tylko
`print`-uje w ciele) po wywołaniu odsyła **`None`** — specjalną wartość
„nic". `wynik = funkcja_bez_return(5)` da `wynik` równy `None`, a
`print(wynik)` wypisze dosłownie `None`. Gdy widzisz `None` tam, gdzie
czekałeś(-aś) na liczbę — w funkcji brakuje `return`.

Backward completion (notebook F2.6 — wywołania gotowe, dopisz definicję):

```python
# dopisz tu definicję funkcji podroz(kilometry),
# która zwraca koszt przejazdu: kilometry * 0.85

print(podroz(10))     # ma wypisać 8.5
print(podroz(100))    # ma wypisać 85.0
```

### Pytania (retrieval)

**P1. Komórka zawiera TYLKO definicję: `def powitanie(imie):` / (wcięte)
`return f"Cześć, {imie}!"`. Uruchamiasz ją. Co się wypisze?**

- A. Cześć, imie! — *Nie — ciało definicji nie wykonuje się przy jej
  uruchomieniu; Python dopiero zapamiętuje przepis.* (diagnoza: definicja
  mylona z wykonaniem)
- B. Pyta o imię — *Nie — parametr to nie `input()`: wartość dostanie
  dopiero przy wywołaniu, np. `powitanie("Ola")`.* (diagnoza: parametr
  mylony z pytaniem do użytkownika)
- C. **Nic — definicja tylko zapamiętuje przepis; efekt będzie przy
  wywołaniu** ✓ — *Tak — żeby coś zobaczyć: `print(powitanie("Ola"))`.*
- D. Błąd — funkcja bez wywołania jest niedozwolona — *Nie — definicja bez
  wywołania jest legalna i częsta (przepis czeka na użycie); brak efektu
  to nie błąd.* (diagnoza: „skoro nic nie robi, to pewnie błąd")

**P2. Do definicji `def brutto(cena):` / (wcięte) `return cena * 1.23`
dopisujesz `koszt = brutto(300)` i `print(koszt)`. Co się wypisze?**

- A. cena * 1.23 — *Nie — return odsyła WYNIK obliczenia, nie tekst
  przepisu: przy wywołaniu `cena` to 300, więc liczy się 300 · 1.23.*
  (diagnoza: nie wykonuje podstawienia argumentu)
- B. **369.0** ✓ — *Tak — wywołanie wkłada 300 do parametru `cena`,
  `return` odsyła 369.0, przypisanie łapie wynik do `koszt`.*
- C. `None` — *Nie — `None` wraca z funkcji BEZ return; ta ma return, więc
  odsyła policzoną wartość.* (diagnoza: pułapka None zapamiętana, warunek
  jej wystąpienia nie)
- D. 300 — *Nie — 300 to argument (surowiec); funkcja zwraca wynik SWOJEGO
  obliczenia: 300 · 1.23 = 369.0.* (diagnoza: wywołanie jako „przekaźnik"
  bez obliczenia)

**P3. `def pokaz(kwota):` / (wcięte) `print(f"{kwota} zł")` — funkcja
z print, BEZ return. Wykonujesz: `w = pokaz(50)`, potem `print(w)`.
Co zobaczysz?**

- A. Dwa razy „50 zł" — *Nie — drugi print wypisuje `w`, czyli to, co
  funkcja ZWRÓCIŁA — a bez return zwróciła `None`.* (diagnoza: print
  w ciele mylony z wartością zwracaną — sedno pytania)
- B. „50 zł", potem 50 — *Nie — funkcja nigdzie nie odsyła `kwota`;
  bez return odsyła `None` i to on ląduje w `w`.* (diagnoza: zakłada
  domyślne „zwróć parametr")
- C. **„50 zł", potem `None`** ✓ — *Tak — print w ciele wykonał się przy
  wywołaniu; ale wartością wywołania jest `None`, bo return-u brak. Gdy
  potrzebujesz WYNIKU — dodaj return.*
- D. Błąd — funkcja musi mieć return — *Nie — return jest opcjonalny;
  funkcja bez niego jest legalna, po prostu odsyła `None`. Błędu nie ma —
  jest niespodzianka.* (diagnoza: reguła „musi" tam, gdzie jest „domyślnie
  None")

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Wywołania mówią Ci wszystko o definicji: nazwa
   `podroz`, JEDEN parametr (w wywołaniu jedna wartość), wynik ma wracać
   (printy wypisują wartość wywołania → w ciele musi być return).
   Struktura: nagłówek z def i dwukropkiem + wcięte ciało z return.
2. **Szkielet:**

   ```python
   def ______(kilometry):
       return ______ * 0.85
   ```

3. **Pełne rozwiązanie z objaśnieniem:**

   ```python
   def podroz(kilometry):
       return kilometry * 0.85
   ```

   `podroz(10)` → w parametrze `kilometry` siedzi 10 → return odsyła
   `8.5`; `podroz(100)` → `85.0`. Typowe potknięcia: `print` zamiast
   `return` w ciele — liczby się WYPISZĄ, ale `print(podroz(10))` pokaże
   dodatkowo `None` (pytanie P3 w akcji: wypisywanie ≠ zwracanie); nazwa
   parametru w ciele inna niż w nagłówku → `NameError` przy wywołaniu;
   brak wcięcia ciała → `IndentationError` (strażnik z F1.6 pilnuje też
   def-a).

---

## Atom F2.7 — LAB „Strażnik budżetu" (samodzielny finał F2)

**Typ:** `lab` · **Czas studenta:** ~25 min · **Koncepty ćwiczone:**
wszystkie z F2 + if/else i f-string z F1 · **Krok fadingu:** zadanie
samodzielne (sama specyfikacja)

### Cel

Napiszesz od zera kompletny, interaktywny program: funkcja z akumulatorem
liczy sumę z listy, `input()` pobiera budżet, decyzja if/else wydaje
werdykt. Wszystko, co umiesz po L0–F2, w jednym pliku.

### Zadanie (notebook F2.7 — pusta komórka „Twój program" + pieczątka)

Napisz **program porównujący wydatki z budżetem**:

1. Lista `wydatki` z co najmniej pięcioma kwotami (mogą być z kropką).
2. Funkcja `suma_wydatkow(lista)` — wzorzec akumulatora w ciele, `return`
   sumy (żadnych printów w funkcji).
3. Pobranie budżetu od użytkownika: `input()` + właściwa konwersja
   (kwota może mieć grosze — który typ?).
4. Wywołanie funkcji, zapamiętanie wyniku w zmiennej.
5. Decyzja: wydatki w budżecie → f-string „ile zostaje"; przekroczony →
   f-string „ile brakuje"; obie kwoty liczone w klamrze i zaokrąglone
   `round(..., 2)`.
6. Po decyzji, bez wcięcia: podsumowanie z sumą wydatków i liczbą pozycji
   (`len`).

Przetestuj dwa przebiegi: budżet powyżej i poniżej sumy (zmieniasz tylko
odpowiedź na input — kod bez zmian).

**Zaliczenie:** komórka-pieczątka: sprawdza, że `wydatki` to lista ≥5 liczb,
że funkcja `suma_wydatkow` istnieje i wywołana na PRÓBNEJ liście pieczątki
(np. `[1, 2, 3]`) zwraca poprawną sumę `6` — czyli że działa dla dowolnych
danych, nie tylko Twoich — oraz że w komórce programu występują `input(`,
`if`/`else` (introspekcja tekstu jak w F1.7); wtedy liczy token. Wywołanie
funkcji studenta przez pieczątkę na próbnej liście jest deterministyczne
(czysta arytmetyka, 0 LLM). Limity klasy L0 obowiązują.

### Drabinka hintów

1. **Koncepcyjny:** Składasz cztery znane klocki w kolejności: dane (lista)
   → przepis (def z akumulatorem i return — F2.5 wewnątrz F2.6) → pytanie
   (input + float — F2.1) → werdykt (if/else + f-string + round — F1.6,
   F2.1). Buduj przyrostowo i uruchamiaj po każdym klocku (nawyk z L0.4):
   najpierw lista + funkcja + print sumy; input i werdykt dopiero, gdy suma
   się zgadza.
2. **Szkielet:**

   ```python
   wydatki = [______]

   def suma_wydatkow(lista):
       suma = ______
       for kwota in ______:
           suma = ______
       return ______

   budzet = ______(input("Twój budżet na tydzień: "))
   razem = suma_wydatkow(______)

   if ______ <= ______:
       print(f"W budżecie. Zostaje {round(______, 2)} zł")
   else:
       print(f"Przekroczony! Brakuje {round(______, 2)} zł")
   print(f"Wydatki: {round(razem, 2)} zł w {len(wydatki)} pozycjach")
   ```

3. **Pełne rozwiązanie z objaśnieniem:**

   ```python
   wydatki = [45.50, 120.00, 33.20, 18.99, 67.30]

   def suma_wydatkow(lista):
       suma = 0
       for kwota in lista:          # pętla po PARAMETRZE, nie po globalnej liście
           suma = suma + kwota
       return suma                  # return PO pętli, bez wcięcia pętli

   budzet = float(input("Twój budżet na tydzień: "))
   razem = suma_wydatkow(wydatki)

   if razem <= budzet:
       print(f"W budżecie. Zostaje {round(budzet - razem, 2)} zł")
   else:
       print(f"Przekroczony! Brakuje {round(razem - budzet, 2)} zł")
   print(f"Wydatki: {round(razem, 2)} zł w {len(wydatki)} pozycjach")
   ```

   Suma listy = 284.99. Budżet 300 → `W budżecie. Zostaje 15.01 zł`;
   budżet 250 → `Przekroczony! Brakuje 34.99 zł`. Newralgiczne miejsca:
   w ciele funkcji pętla idzie po `lista` (parametrze) — dzięki temu
   funkcja policzy KAŻDĄ listę, także próbną listę pieczątki; `return suma`
   stoi po pętli (wcięty raz — należy do funkcji, nie do pętli); budżet
   przez `float` (grosze!); kierunki odejmowania jak w F1.7. `None` zamiast
   sumy → w funkcji został print zamiast return (F2.6-P3).

---

## Egzamin modułu F2 (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**; 2 warianty
izomorficzne (cap 2); retry z drugim wariantem; po 2. oblaniu correctives
(mapowanie niżej); „zarezerwuj ~25 min"; pokrycie 3 pytania × 5 atomów;
kalibracja OSOBNA, łatwiejsza niż atomowa — pytania przy WE. Format jak
w F1: **pogrubiona** opcja poprawna, jedno zdanie wyjaśnienia,
`koncept → atom`.

**E1** · A: Użytkownik na `input("Wiek: ")` wpisał 30. Jakiego typu wartość
dostał program? — `int` / **`str`** / `float` / zależy od wpisu — *input
zawsze zwraca tekst.* · B: Użytkownik na `input("Waga: ")` wpisał 7.5.
Jakiego typu wartość dostał program? — `float` / **`str`** / `int` / zależy
od wpisu — *jak w A.* → `input-konwersja-typow` → F2.1

**E2** · A: Który zapis zamieni tekst `"25"` na liczbę całkowitą? —
`str("25")` / **`int("25")`** / `round("25")` / `len("25")` — *int
konwertuje na liczbę całkowitą.* · B: Który zapis zamieni tekst `"3.5"` na
liczbę z kropką? — `int("3.5")` / **`float("3.5")`** / `str("3.5")` /
`len("3.5")` — *tekst z kropką konwertuje float; int rzuciłby ValueError.*
→ `input-konwersja-typow` → F2.1

**E3** · A: Co zrobi `int("pies")`? — zwróci 0 / zwróci `"pies"` /
**zatrzyma program z `ValueError`** / zatrzyma program z `TypeError` —
*tekst nie daje się przeczytać jako liczba: zła wartość.* · B: Co zrobi
`float("kot")`? — zwróci 0.0 / zwróci `"kot"` / **zatrzyma program
z `ValueError`** / zatrzyma program z `TypeError` — *jak w A.*
→ `input-konwersja-typow` → F2.1

**E4** · A: `dni = [7, 14, 21]`. Co wypisze `print(dni[0])`? — **7** / 14 /
0 / `IndexError` — *indeks 0 = pierwsza przegródka.* · B:
`progi = [2, 4, 6]`. Co wypisze `print(progi[2])`? — 2 / 4 / **6** /
`IndexError` — *indeks 2 = trzecia przegródka.* → `lista-kolekcja` → F2.2

**E5** · A: Co zwróci `len(["a", "b"])`? — 1 / **2** / 3 / `"ab"` — *len
zlicza elementy.* · B: Co zwróci `len([5, 10, 15, 20])`? — 3 / **4** / 5 /
50 — *jak w A.* → `lista-kolekcja` → F2.2

**E6** · A: `x = [1, 2]`. Co zrobi `print(x[2])`? — wypisze 2 / wypisze
nic / **zatrzyma program z `IndexError`** / dopisze przegródkę — *indeksy
kończą się na 1 (len − 1).* · B: `y = [9, 8, 7]`. Co zrobi `print(y[5])`?
— wypisze 7 / wypisze 5 / **zatrzyma program z `IndexError`** / dopisze
przegródki — *jak w A.* → `lista-kolekcja` → F2.2

**E7** · A: `for k in [1, 2, 3]:` / (wcięte) `print("hej")`. Ile razy
wypisze się „hej"? — raz / 2 razy / **3 razy** / wcale — *jeden obrót na
element.* · B: `for k in [10, 20]:` / (wcięte) `print("start")`. Ile razy
wypisze się „start"? — raz / **2 razy** / 10 razy / wcale — *jak w A.*
→ `petla-for` → F2.3

**E8** · A: Co wypisze `for n in [2, 3]:` / (wcięte) `print(n + 1)`? —
2 i 3 / **3 i 4 (osobne linie)** / 5 / `SyntaxError` — *ciało liczy n + 1
w każdym obrocie.* · B: Co wypisze `for n in [5, 6]:` / (wcięte)
`print(n - 1)`? — 5 i 6 / **4 i 5 (osobne linie)** / 9 / `SyntaxError` —
*jak w A.* → `petla-for` → F2.3

**E9** · A: Linia `print("Koniec")` stoi PO pętli, bez wcięcia. Kiedy się
wykona? — po każdym obrocie / **raz, po zakończeniu pętli** / przed pętlą /
wcale — *bez wcięcia = poza ciałem.* · B: Linia `print("krok")` stoi
W CIELE pętli (wcięta). Kiedy się wykona? — **przy każdym obrocie** / raz
po pętli / raz przed pętlą / wcale — *wcięcie = ciało pętli.*
→ `petla-for` → F2.3

**E10** · A: `suma = 0` przed pętlą; `for x in [5, 5, 5]:` / (wcięte)
`suma = suma + x`. Jaka jest `suma` po pętli? — 5 / 10 / **15** / 0 —
*0 + 5 + 5 + 5.* · B: to samo nad `[2, 4, 6]` — 6 / 10 / **12** / 0 —
*0 + 2 + 4 + 6.* → `wzorzec-akumulatora` → F2.5

**E11** · A: `suma = 0` przeniesione DO ciała pętli nad `[10, 20]`
(pierwsza linia ciała, potem `suma = suma + x`). Jaka jest `suma` po pętli?
— 30 / **20** / 0 / błąd — *każdy obrót zeruje: zostaje ostatni element.* ·
B: to samo nad `[7, 8]` — 15 / **8** / 0 / błąd — *jak w A.*
→ `wzorzec-akumulatora` → F2.5

**E12** · A: `suma` po pętli wynosi 20, `len(oceny)` to 4. Co da
`suma / len(oceny)` i jakiego typu? — 5 typu `int` / **5.0 typu `float`** /
4.0 typu `float` / `ZeroDivisionError` — *dzielenie zawsze daje float.* ·
B: `suma` 30, `len` 5 — 6 typu `int` / **6.0 typu `float`** / 5.0 typu
`float` / `ZeroDivisionError` — *jak w A.* → `wzorzec-akumulatora` → F2.5

**E13** · A: `def podwoj(x):` / (wcięte) `return x * 2`. Co wypisze
`print(podwoj(6))`? — x * 2 / 6 / **12** / `None` — *wywołanie wkłada 6
do x, return odsyła 12.* · B: `def potroj(x):` / (wcięte) `return x * 3`.
Co wypisze `print(potroj(4))`? — x * 3 / 4 / **12** / `None` — *jak w A.*
→ `funkcja-def-return` → F2.6

**E14** · A: Komórka zawiera tylko definicję funkcji (def + ciało).
Uruchamiasz ją. Co się stanie? — wykona się ciało / **nic widocznego —
Python zapamiętał przepis** / błąd / wypisze `None` — *efekt jest przy
wywołaniu.* · B: Masz definicję `powitanie(imie)` zwracającą tekst.
Co dopisać, żeby zobaczyć jej wynik? — samą nazwę `powitanie` / drugą
definicję / **wywołanie w print: `print(powitanie("Ola"))`** / return —
*wywołanie z argumentem uruchamia przepis.* → `funkcja-def-return` → F2.6

**E15** · A: Funkcja ma w ciele TYLKO `print(...)`, bez return. Co trafi do
`w` po `w = funkcja(5)`? — 5 / wypisany tekst / **`None`** / błąd — *bez
return funkcja odsyła None.* · B: Chcesz, by funkcja ODDAWAŁA wynik do
zmiennej. Co musi być w ciele? — `print` z wynikiem / **`return`
z wynikiem** / f-string / `input` — *return = odesłanie wartości; print
tylko wypisuje.* → `funkcja-def-return` → F2.6

---

## Strona „Pierwsza pomoc — F2" (D5a, statyczna, per moduł)

Strony L0 (środowisko) i F1 (błędy języka) obowiązują nadal. Przyrost F2:

1. **Komórka „wisi" z kręcącym się `[*]` po uruchomieniu** → jeśli
   w komórce jest `input(...)`, program CZEKA na Twoją odpowiedź: znajdź
   pole tekstowe pod komórką, wpisz wartość i zatwierdź Enterem. To nie
   zawieszenie — to pytanie (F2.1). Rzadki kaprys Colab: pole czasem się
   NIE pojawia (znana usterka) — zatrzymaj komórkę (przycisk stop w miejscu
   ▶) i uruchom ją jeszcze raz; zwykle pomaga za 1.–2. razem.
2. **`ValueError` przy `int(...)`/`float(...)`** → odpowiedź nie daje się
   przeczytać jako liczba: literówka, przecinek zamiast kropki (F1.1!)
   albo tekst z kropką konwertowany przez `int` (użyj `float`).
3. **`IndexError: list index out of range`** → sięgasz po przegródkę,
   której nie ma: pamiętaj o numeracji od zera i regule „ostatni indeks =
   len − 1"; szybka diagnoza: `print(len(lista))` (F2.2).
4. **`NameError` w pierwszym obrocie pętli** → nazwa w ciele różni się od
   zmiennej pętli w nagłówku (`for produkt in …` vs `{produk}` w klamrze);
   skopiuj nazwę zamiast przepisywać (F2.3).
5. **Wynik pętli to OSTATNI element zamiast sumy** → `suma = 0` wisi
   wewnątrz ciała i zeruje się co obrót; przenieś start akumulatora PRZED
   pętlę. Uwaga: ten błąd NIE daje komunikatu — wykrywasz go po dziwnym
   wyniku (F2.5).
6. **`None` tam, gdzie czekasz na liczbę** → funkcja nie ma `return`
   (najczęściej: print w ciele zamiast return). Wypisywanie ≠ zwracanie
   (F2.6).
7. **`IndentationError` przy `for`/`def`** → po nagłówku z dwukropkiem
   musi stać wcięte ciało — ta sama reguła, co przy `if` (F1.6).
8. **Wpisujesz odpowiedź na input, a program liczy źle/wcale** → po każdej
   zmianie kodu komórkę z `input` uruchamiasz od nowa i odpowiadasz od
   nowa — stara odpowiedź nie jest pamiętana (mechanika sesji z L0.3).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://docs.python.org/pl/3/tutorial/controlflow.html | Oficjalny tutorial Pythona po polsku — sekcje „4.2. Instrukcje for" i „4.8. Definiowanie funkcji" (bez input() i list — te w teorii atomów) | kanon | PSF (dokumentacja Pythona) | PL | nie | 2026-07-11 (HTTP 200; treść strony faktycznie PL — zweryfikowana, nie fallback) |
| https://www.youtube.com/watch?v=eB3r2NQwNi4 | „Python od podstaw [2024]" (Jak nauczyć się programowania) — rozdziały F2: input 0:08:38, pętla for 1:56:01, listy 2:13:53, funkcje 2:56:02 + return 3:07:39 | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | PL | nie | 2026-07-11 (timestampy z opisu wideo; seans kontrolny Sophii przed ingest) |

Sedno F2 w całości w polskiej teorii atomów; zasoby = pogłębienie (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0/F1

| Termin | Po polsku |
|---|---|
| `input(...)` | pytanie do użytkownika; ZAWSZE zwraca tekst (`str`) |
| `int(...)` / `float(...)` | konwersja tekstu na liczbę (całkowitą / z kropką) |
| `round(x, n)` | zaokrąglenie do n miejsc po kropce |
| `ValueError` | „zła wartość" — np. konwersja tekstu, który nie jest liczbą |
| lista / *list* | pudełko z przegródkami; nawiasy kwadratowe |
| indeks / *index* | numer przegródki listy — liczony OD ZERA |
| `len(...)` | liczba elementów listy |
| `IndexError` | indeks poza zakresem listy |
| `for … in …:` | pętla „dla każdego elementu" |
| akumulator | zmienna-zbieracz prowadzona przez pętlę |
| `def` / parametr / `return` | definicja funkcji / jej „pudełko na wejście" / odesłanie wyniku |
| `None` | wartość „nic" — m.in. wynik funkcji bez return |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** F2.1 → F2.2 → F2.3 → F2.4 (lab) → F2.5 →
  F2.6 → F2.7 (lab) → przegląd przed egzaminem (reuse — lista w zasadach) →
  egzamin. Modelowanie pozycji jak w F1 (atom = jedna pozycja `exercise`;
  do potwierdzenia przy spec JSON — wpis w notatkach F1).
- **Checki labów:** F2.4 — relacje na danych (klasa limitów L0,
  zadeklarowana przy zaliczeniu). F2.7 — NOWY element: pieczątka WYWOŁUJE
  funkcję studenta na próbnej liście i porównuje wynik z oczekiwanym
  (deterministyczne, 0 LLM, w tej samej sesji Colab — bez sandboxa);
  wykonalność potwierdzić przy budowie notebooków (funkcja musi istnieć
  w pamięci sesji — tak jak zmienne w checkach L0/F1). Introspekcja tekstu
  komórki (`input(`, `if`) jak w F1.7, z tym samym fallbackiem.
- **`input()` a checki:** pieczątka F2.7 NIE wywołuje input (sprawdza stan
  po przebiegu studenta) — dzięki temu token nie wymaga interakcji
  z pieczątką.
- **Spłacone obietnice treści:** F2.1 zamyka dwa „poznasz w F2" (interakcja
  — zasady F1; round — pierwsza pomoc F1 poz. 9). Nowe obietnice F2:
  `.append()`/słowniki/`range()`/`while` JAWNIE odłożone do F3/M-EDA
  (zasady modułu) — F3 musi je spłacić albo jawnie odwołać.
- **Egzamin:** 15 pytań / ≤1 błąd / 2 warianty; mapowanie
  pytanie→koncept→atom kompletne w banku; kalibracja przy WE. **Wyjątek do
  monitorowania w D11: E11** (zerowanie akumulatora w ciele) — izomorf
  najtrudniejszego pytania atomowego (F2.5-P2), jedyny test położenia
  inicjalizacji; jeśli success rate egzaminacyjny odstaje — kandydat do
  zmiękczenia.
- **1 koncept = 1 atom — deklaracja dla F2.1 (standard z L0.2):** atom uczy
  input+konwersji; `round()` to świadomy rider — jawna spłata obietnicy
  z pierwszej pomocy F1 poz. 9, używany dalej w obu labach; egzamin go NIE
  testuje (E1–E3 czyste). Bundling jawny, do akceptacji w standardzie QG-5.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie F2.1–F2.6 =
  333–400 słów z blokami kodu, ~300–310 bez nich — w widełkach przy obu
  metodach (standard L0/F1). Uwaga: F2.1 i F2.3 mają ~300 słów prozy przy
  zerowym marginesie — każda przyszła korekta redakcyjna wymaga ponownego
  pomiaru.
- **TODO przed ingest 1E.2:**
  1. Budowa 7 notebooków F2 (w tym test mechanizmu „pieczątka wywołuje
     funkcję studenta" w F2.7 i zachowania input w komórce z pieczątką).
  2. Seans kontrolny fragmentów wideo (timestampy w tabeli zasobów) —
     tłumaczenie controlflow.html i obecność rozdziałów zweryfikowane
     (research 2026-07-11).
  3. Przy budowie notebooka F2.1/F2.7 uwzględnić znaną usterkę Colab:
     pole input() sporadycznie się nie pojawia (issue colabtools #3318,
     zamknięte „not planned") — workaround opisany w pierwszej pomocy
     poz. 1; test ręczny przy budowie.

## Przebieg QG tego dokumentu (2026-07-11)

Draft → samodzielne wykonanie wszystkich snippetów w Pythonie przez autora
(zero rozbieżności — wartości labów, input przez stdin, komunikaty błędów)
→ **2 agentów weryfikacyjnych (Fable 5)**: (1) przegląd zgodności z ADR-014
z wykonaniem **56/56 checków Pythona** — ZERO znalezisk krytycznych
(deklaracje checków labów uczciwe od pierwszej wersji — lekcja L0/F1
odrobiona), 3 WAŻNE (check F2.4 podniesiony do ≥5 elementów, by dowodził
sedna labu; bundling `round()` w F2.1 zadeklarowany jawnie; pomiary budżetów
wpisane), 6 drobnych — wcielone (D6 świadomie pominięte: format egzaminu
ma jedno zdanie wyjaśnienia, nie feedback per opcja); ciągłość drabiny
L0→F1→F2 potwierdzona referencja po referencji; werdykt „gotowe po
poprawkach"; (2) research zasobów — controlflow.html PL potwierdzone
(HTTP 200, treść faktycznie polska, sekcje 4.2 for / 4.8 def), timestampy
wideo dla wszystkich tematów F2 (input 0:08:38, for 1:56:01, listy 2:13:53,
funkcje 2:56:02, return 3:07:39), znana usterka input() w Colab
(colabtools #3318) wciągnięta do pierwszej pomocy poz. 1 i TODO budowy
notebooków.
