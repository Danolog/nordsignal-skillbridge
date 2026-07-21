# 1E.2 · Moduł M-PD „Pandas: dane w tabelach" — treść atomów

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z wykonaniem 48/48 checków
w pandas 2.x i 3.x — zero krytyków + research zasobów PL; przebieg na
końcu dokumentu); przed ingest 1E.2: TODO z notatek (notebooki pod
pandas 2.2.x, seans wideo).
**Podstawa:** ADR-014 D1/D3/D5/D6.5 (parametry jak F1–F3) + **audyt
pojemności D10** (`sophia-1e2-audyt-pojemnosci-m-eda.md`): moduł wydzielony
z M-EDA decyzją treściową Sophii; pokrywa R5–R6, R8–R13 z audytu.
Prerekwizyt: **F3 zaliczony** (lista słowników = surowiec DataFrame).
**Uwaga wersyjna (ustalona przy autoringu):** kolumny tekstowe w `dtypes`
pokazują się jako `object` (pandas 2.x) albo `str` (pandas 3.x) — treść
nigdzie nie cytuje tego wyniku bezwarunkowo; snippety zweryfikowane w OBU
wersjach (2.3.3 i 3.0.3).

---

## Zasady modułu M-PD (przyrost względem F1–F3)

- **Struktura:** 6 atomów `exercise` + 2 laby + egzamin. Zaliczenia: atomy
  — licznik M10; laby — pieczątka+token (limity klasy L0).
- **Egzamin:** **18 pytań × 2 warianty, próg: ≤2 błędy** (~88,9% — między
  wzorcowymi ≤1/15 a ≤2/20 z D3; 18 = konsekwencja 6 atomów × pokrycie 3;
  parametr per moduł w `examConfigJson`, D11 skoryguje).
- **Fading backward (D5a):** PD.1–PD.2 pełne WE → PD.3 completion → PD.4
  lab-szkielet → PD.5 luki w środku → PD.6 backward completion → PD.7
  krótkie WE + zadanie → PD.8 lab samodzielny.
- **Koncepty kluczowe (≤4 — D6.3):** `dataframe-tabela` (PD.2),
  `maska-filtrowanie` (PD.3), `braki-danych-decyzje` (PD.5),
  `grupowanie-agregacja` (PD.6). PD.1 (`import-pakiety-terminal`) i PD.7
  (`wykresy-opisane`) — koncepty zwykłe (PD.7 utrwala lab PD.8 i capstone).
- **Przegląd przed egzaminem (reuse):** F3.5-P1, F3.5-P2, F3.2-P2,
  F3.6-P2, PD.1-P2, PD.2-P2, PD.3-P1, PD.5-P3, PD.6-P2, PD.7-P3 (10 pytań).
- **Terminal (pkt 9, just-in-time):** PD.1 wprowadza `!` w komórce Colab —
  to jest zaplanowane wejście terminala; Git wchodzi w M-EDA.
- **Dane przewodnie:** ta sama tabela wydatków co w F3.5/mini-projekcie
  (ciągłość) + tabela à la BDL (rok/województwo/wartość) — celowo w kształcie
  danych capstone'u.
- **Sesja i czas:** 9 pozycji ≈ 4–5 sesji (suma szacunków ~125–140 min).

---

## Atom PD.1 — Pakiety: import, alias i terminal w komórce

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`import-pakiety-terminal` · **Krok fadingu:** pełne WE

### Cel

Zaimportujesz pakiet pod aliasem, rozpoznasz `ModuleNotFoundError`
i doinstalujesz pakiet poleceniem terminala `!pip` — pierwszy raz mówiąc
do komputera, nie do Pythona.

### Teoria

Wszystko, czego używałeś(-aś) dotąd — `print`, `len`, `sum`, listy,
słowniki — to **Python bazowy**: jest zawsze, bez pytania. Ale narzędzia
do tabel, wykresów czy pobierania danych z internetu mieszkają
w **pakietach** — bibliotekach dopisanych przez społeczność. Najważniejszy
dla nas: **pandas**, standard pracy z danymi tabelarycznymi.

Pakiet trzeba najpierw WPUŚCIĆ do sesji — robi to **`import`**:

```python
import pandas as pd      # wpuść pakiet pandas pod skrótem: pd
print(pd.__version__)    # dowód życia: wersja pakietu
```

**Przewidź:** co zrobi ta komórka przy pierwszym uruchomieniu w Colab?

Wypisze numer wersji (np. `2.3.3` — zależnie od środowiska; sam numer jest
nieistotny, istotne, że JEST). Dwie rzeczy w tej składni:

- `import pandas` działa jak wpuszczenie skrzynki z narzędziami do sesji
  (pamięć sesji — L0.3: po restarcie import trzeba wykonać PONOWNIE,
  dlatego stoi zawsze w pierwszej komórce notebooka);
- `as pd` nadaje **alias** — od tej pory piszesz `pd.` zamiast `pandas.`.
  Alias to konwencja całej społeczności: każdy kurs, dokumentacja
  i odpowiedź w internecie pisze `pd` — trzymaj się jej, a cudzy kod
  będzie wyglądał jak Twój.

Skąd pakiet bierze się na komputerze? W Colab pandas (i wiele innych) jest
**preinstalowany** — import po prostu działa. Gdy pakietu brak, import
zatrzymuje się błędem `ModuleNotFoundError: No module named '…'`.
Lekarstwem jest instalacja — i tu nowość zapowiadana od L0: **terminal**.
Linia zaczynająca się od **`!`** w komórce Colab NIE jest Pythonem — to
polecenie wysyłane wprost do komputera (systemu), na którym działa sesja:

```python
!pip install nazwa_pakietu    # ! = "komputerze, wykonaj"; pip = instalator pakietów
```

Skąd pip bierze pakiety? Z publicznego archiwum pakietów Pythona —
ogromnej biblioteki, do której społeczność wrzuca narzędzia; pip pobiera
stamtąd i instaluje. Po instalacji wracasz do Pythona zwykłym `import`.
Zapamiętaj podział ról: `!` mówi do SYSTEMU (instalacje, pliki), reszta
komórki mówi do PYTHONA.

Dwie konwencje na przyszłość: **importy stoją w PIERWSZEJ komórce
notebooka** — czytelnik od razu widzi, jakich narzędzi projekt używa;
a listę pakietów projektu zapisuje się w pliku `requirements.txt` —
zrobisz to przy repozytorium w M-EDA i to właśnie ta lista czyni analizę
odtwarzalną u kogoś innego (rubryka capstone'u, kryterium
„Reprodukowalność").

### Pytania (retrieval)

**P1. Co robi linia `import pandas as pd`?**

- A. Instaluje pandas na komputerze — *Nie — instaluje `!pip install`;
  import tylko WPUSZCZA już zainstalowany pakiet do bieżącej sesji.*
  (diagnoza: myli instalację z importem — kluczowe rozróżnienie atomu)
- B. **Udostępnia w sesji pakiet pandas pod skrótem `pd`** ✓ — *Tak —
  od tej linii wszystko z pandas wywołujesz przez `pd.…`.*
- C. Tworzy zmienną `pd` o wartości „pandas" — *Nie — `pd` to uchwyt do
  całej skrzynki narzędzi, nie tekst; `pd.DataFrame(...)` działa,
  `"pandas".DataFrame(...)` — nie.* (diagnoza: alias mylony ze zwykłym
  przypisaniem tekstu)
- D. Pobiera dane z internetu — *Nie — import niczego nie pobiera z sieci;
  sięga po pakiet zainstalowany na komputerze sesji.* (diagnoza: „pakiet"
  kojarzony z pobieraniem danych)

**P2. Uruchamiasz `import wykresy_pro` i dostajesz `ModuleNotFoundError:
No module named 'wykresy_pro'`. Co to znaczy i co robisz?**

- A. Literówka w słowie import — *Nie — komunikat wskazuje NAZWĘ modułu
  (metoda z L0.3: konkret po dwukropku); import wykonał się na tyle, żeby
  szukać pakietu.* (diagnoza: nie czyta konkretu z komunikatu)
- B. **Pakietu nie ma w środowisku — instaluję: `!pip install wykresy_pro`
  i powtarzam import** ✓ — *Tak — brak pakietu to nie błąd Twojego kodu,
  tylko brak narzędzia; po instalacji import przejdzie.*
- C. Pakiet istnieje, ale sesja wygasła — *Nie — po wygaśnięciu sesji
  import trzeba POWTÓRZYĆ, ale preinstalowany pakiet nadal by się
  zaimportował; ten komunikat mówi „nie znam takiego pakietu w ogóle".*
  (diagnoza: myli utratę sesji z brakiem pakietu)
- D. Trzeba napisać ten pakiet samodzielnie — *Nie — najpierw instalator:
  ogromna większość narzędzi już istnieje, pip je pobiera i instaluje.*
  (diagnoza: nie zna drogi „ktoś to już napisał")

**P3. Czym linia `!pip install requests` różni się od pozostałych linii
w komórce?**

- A. Niczym — to też Python — *Nie — `pip install requests` NIE jest
  poprawnym Pythonem; wykrzyknik wysyła tę linię do systemu, z pominięciem
  Pythona.* (diagnoza: nie rozdziela dwóch adresatów komórki)
- B. **To polecenie dla SYSTEMU (terminal) — `!` kieruje linię do
  komputera, nie do Pythona** ✓ — *Tak — dwa języki w jednej komórce:
  `!`-linie do systemu, reszta do Pythona.*
- C. To komentarz — *Nie — komentarz zaczyna się od `#` i nic nie robi;
  linia z `!` WYKONUJE polecenie systemowe.* (diagnoza: myli znaki
  specjalne na początku linii)
- D. To zapytanie do internetu — *Nie — internet pojawia się dopiero
  w środku: pip pobiera pakiet z archiwum pakietów, ale sama linia to
  polecenie dla systemu.* (diagnoza: skojarzenie „instalacja = strona
  WWW")

### Drabinka hintów

1. **Koncepcyjny:** Trzy piętra narzędzi: (1) Python bazowy — jest zawsze;
   (2) pakiet zainstalowany — wymaga `import … as …` w każdej sesji;
   (3) pakiet niezainstalowany — najpierw `!pip install …` (rozmowa
   z systemem), potem import (rozmowa z Pythonem).
2. **Szkielet:** W notebooku PD.1: `import pandas ____ pd` (słowo nadające
   skrót), potem `print(pd.__version__)`. Następnie celowo
   `import nieistniejacy_pakiet` — obejrzyj `ModuleNotFoundError` na
   własne oczy (rytuał znany z L0.3/F2.2).
3. **Pełne rozwiązanie z objaśnieniem:** `import pandas as pd` →
   `print(pd.__version__)` wypisze numer (różny między środowiskami —
   to w porządku). `import nieistniejacy_pakiet` → `ModuleNotFoundError:
   No module named 'nieistniejacy_pakiet'` — konkret po dwukropku podaje
   nazwę, której system nie zna. Jeśli import pandas NIE działa (świeży
   `ModuleNotFoundError` po restarcie) — sprawdź, czy komórka z importem
   została wykonana W TEJ sesji (L0.3: import żyje w pamięci sesji).

---

## Atom PD.2 — DataFrame: Twoja tabela w opakowaniu narzędzia

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`dataframe-tabela` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Zbudujesz DataFrame z listy słowników, obejrzysz go (`head`, `info`,
`dtypes`, `len`) i sięgniesz po pojedynczą kolumnę — dokładnie tak, jak
w F3.3 sięgałeś(-aś) po klucz.

### Teoria

W F3.5 zbudowałeś(-aś) „tabelę" z listy słowników i wszystko liczyłeś(-aś)
pętlami. **DataFrame** to ta sama tabela w opakowaniu pandas — z gotowymi
narzędziami zamiast ręcznych pętli. Najlepsze: surowiec już znasz,
DataFrame powstaje WPROST z listy słowników:

```python
import pandas as pd

wydatki = [
    {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad", "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",  "kategoria": "jedzenie",  "kwota": 12.00},
    {"nazwa": "kino",  "kategoria": "rozrywka",  "kwota": 35.00},
]
df = pd.DataFrame(wydatki)   # lista słowników → tabela
df.head()                    # pokaż pierwsze wiersze
```

**Przewidź:** co stanie się kolumnami tej tabeli, a co wierszami?

Klucze słowników (`nazwa`, `kategoria`, `kwota`) → **kolumny**; każdy
rekord → **wiersz**. `df.head()` wyświetla początek tabeli (domyślnie
5 pierwszych wierszy — przy dużych danych nie chcesz oglądać tysięcy);
z lewej widać dodatkową kolumnę bez nagłówka — to **indeks** wierszy,
numeracja od zera, jak w listach (F2.2). Indeks jest przypięty do wiersza
na stałe — zapamiętaj to na zapas: po odfiltrowaniu części wierszy
numeracja będzie miała dziury i to jest normalne.

Trzy narzędzia do OBEJRZENIA tabeli, zanim cokolwiek policzysz (nawyk,
który rubryka capstone'u nazywa „kontrolą typów"):

- `len(df)` — liczba WIERSZY (stary znajomy `len` działa i tu);
- `df.info()` — podsumowanie: ile wierszy, jakie kolumny, ile wartości
  niepustych, jakie typy;
- `df.dtypes` — same typy kolumn: liczby to `int64`/`float64` (rozszerzone
  int/float z F1.1), kolumny tekstowe pokazują się jako `object` albo
  `str` — zależnie od wersji pandas; jedno i drugie czytaj: „tekst".

Po pojedynczą kolumnę sięgasz jak po klucz słownika (F3.3):
`df["kwota"]` — dostajesz **serię**: wszystkie wartości tej kolumny,
z indeksami. Seria ma własne metody — `df["kwota"].sum()` policzy sumę
kolumny bez żadnej pętli (Twój akumulator z F2.5 w jednym słowie; więcej
w PD.6). Klucz kolumny musi się zgadzać co do znaku — `df["Kwota"]`
to `KeyError`, ta sama zasada co w słownikach (F3.3-P3). Listę wszystkich
nazw kolumn podejrzysz przez `df.columns` — przydatne, zanim zaczniesz
zgadywać klucze.

Skąd jeszcze biorą się DataFrame'y? Z plików i z internetu — w M-EDA
zbudujesz tabelę wprost z odpowiedzi API. Dziś budujemy z listy słowników
celowo: widzisz mechanikę bez opakowań, a gdy pandas kiedyś zrobi coś
zaskakującego, wrócisz do myślenia rekordami z F3.5 — pod spodem to
zawsze ta sama tabela.

### Pytania (retrieval)

**P1. `df = pd.DataFrame(lista_rekordow)` — skąd DataFrame weźmie NAZWY
kolumn?**

- A. Zapyta użytkownika — *Nie — nic nie jest dopytywane: wszystko już
  jest w danych.* (diagnoza: oczekuje kreatora/dialogu)
- B. Ponumeruje kolumny od zera — *Nie — numerację od zera dostają
  WIERSZE (indeks); kolumny dostają nazwy z danych.* (diagnoza: miesza osie
  tabeli)
- C. **Z kluczy słowników-rekordów** ✓ — *Tak — klucz = nazwa kolumny,
  rekord = wiersz; dokładnie kształt z F3.5.*
- D. Trzeba je podać osobną komendą — *Nie — przy liście słowników nazwy
  jadą z kluczy automatycznie; osobne podawanie bywa potrzebne przy innych
  surowcach.* (diagnoza: nie widzi, że dane już niosą strukturę)

**P2. Co zwraca `df["kwota"]`?**

- A. Pojedynczą liczbę — pierwszą kwotę — *Nie — po jednej wartości
  sięgałbyś dalej (wiersz+kolumna); sam klucz kolumny daje CAŁĄ kolumnę.*
  (diagnoza: klucz kolumny mylony z odczytem komórki tabeli)
- B. **Serię — wszystkie wartości kolumny `kwota`** ✓ — *Tak — kolumna to
  seria; ma własne metody, np. `.sum()`.*
- C. Nową tabelę z jedną kolumną — *Blisko — jedna para nawiasów daje
  SERIĘ; tabelę z wybranymi kolumnami dają dopiero podwójne nawiasy
  `df[["kwota"]]` (o wybieraniu kolumn — PD.3).* (diagnoza: seria vs
  tabela — rozróżnienie przyda się w PD.3)
- D. `KeyError` — *Nie — kolumna `kwota` istnieje; KeyError byłby przy
  literówce, np. `df["Kwota"]` — zasada ze słowników obowiązuje.*
  (diagnoza: błąd-dyżurny bez sprawdzenia klucza)

**P3. Tabela ma 4 wiersze i 3 kolumny. Co zwróci `len(df)`?**

- A. 3 — *Nie — `len(df)` liczy WIERSZE; kolumny zobaczysz w `df.info()`
  albo `len(df.columns)`.* (diagnoza: osie tabeli pomylone — jak P1/B)
- B. **4** ✓ — *Tak — len tabeli = liczba wierszy (rekordów), spójnie
  z `len` listy rekordów z F3.5.*
- C. 12 — *Nie — len nie liczy komórek tabeli, tylko wiersze.* (diagnoza:
  len jako „rozmiar całkowity")
- D. 5 — bo head pokazuje 5 — *Nie — `head()` to tylko PODGLĄD (i pokaże
  co najwyżej tyle, ile jest); len mówi o całej tabeli.* (diagnoza: myli
  podgląd z danymi)

### Drabinka hintów

1. **Koncepcyjny:** DataFrame czytaj przez F3.5: rekord = wiersz, klucz =
   kolumna, `df["klucz"]` = cała kolumna (seria). Rytuał oglądania NOWEJ
   tabeli, zawsze w tej kolejności: `head()` (jak wygląda?), `len(df)`
   (ile wierszy?), `info()`/`dtypes` (jakie typy? ile niepustych?).
2. **Szkielet:** W notebooku PD.2 wykonaj rytuał na `df` z WE: trzy
   komórki — `df.head()`, `print(len(df))`, `df.info()` — i porównaj
   liczbę wierszy z tym, co widzisz w danych. Potem
   `print(df["kwota"].sum())` — zgadza się z ręcznym rachunkiem?
3. **Pełne rozwiązanie z objaśnieniem:** `head()` pokaże 4 wiersze
   z indeksem 0–3; `len(df)` → `4`; `info()` wymieni 3 kolumny,
   po 4 wartości niepuste (non-null), typy: `kwota` jako `float64`,
   tekstowe jako `object`/`str` (wersja pandas — obie znaczą tekst);
   `df["kwota"].sum()` → `75.9`. Jeśli `NameError: name 'pd' is not
   defined` — komórka z importem nie wykonała się w tej sesji (PD.1);
   jeśli `KeyError` — porównaj klucz kolumny znak po znaku z `head()`.

---

## Atom PD.3 — Maska: warunek na całej kolumnie naraz

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`maska-filtrowanie` (KLUCZOWY) · **Krok fadingu:** completion (luka na
końcu WE)

### Cel

Przefiltrujesz wiersze tabeli maską logiczną i wybierzesz podzbiór kolumn
— rozumiejąc, że pandas robi hurtowo to, co Twoja bramka z F3.2 robiła
element po elemencie.

### Teoria

W F3.2 filtrowałeś(-aś) pętlą: każdy element przez bramkę `if`, pasujące
do zbieracza. Pandas składa całą tę pętlę w JEDNO wyrażenie. Fundament:
**porównanie zadziała na całej kolumnie naraz**:

```python
maska = df["kwota"] > 20     # porównaj KAŻDĄ kwotę z 20 — hurtem
print(maska)
```

**Przewidź:** co siedzi w `maska` dla tabeli wydatków z PD.2
(4.40 / 24.50 / 12.00 / 35.00)?

Seria wartości `False, True, False, True` — po jednej odpowiedzi na
wiersz. To jest **maska logiczna**: te same `True`/`False` z F1.5, tylko
hurtowo. Bramka z F3.2 zadawała pytanie w każdym obrocie pętli; pandas
zadaje je wszystkim wierszom jednocześnie.

Maskę wkładasz w nawiasy tabeli — zostają wiersze z `True`:

```python
drogie = df[df["kwota"] > 20]     # tabela ograniczona do wierszy True
```

Wynik to NOWA, mniejsza tabela (jak filtr-append w F3.2 budował mniejszą
listę rekordów) — oryginalny `df` zostaje nietknięty. Jeśli wynik ma żyć
dłużej niż jedno spojrzenie, przypisz go do nazwy (`drogie = df[...]`) —
bez przypisania przepada, jak każda niezłapana wartość. Warunki piszesz
dokładnie jak w F1.5: `df["kategoria"] == "jedzenie"` (podwójny znak!),
`df["kwota"] <= 10`, `df["rok"] != 2020`.

A dwa warunki naraz — „mazowieckie I rok po 2019"? Na razie najprościej:
dwa sita jedno po drugim, każde z własną nazwą pośrednią:

```python
maz = df[df["wojewodztwo"] == "mazowieckie"]   # sito 1 → nazwana tabela
maz_nowe = maz[maz["rok"] > 2019]              # sito 2 — maska budowana Z maz!
```

Ważny szczegół: drugą maskę budujesz z tabeli POŚREDNIEJ (`maz[...]`),
nie z oryginalnego `df` — sito zawsze na tym, co przesiewasz. Spójniki
logiczne w jednej masce poznasz, gdy będą naprawdę potrzebne — dwa
nazwane sita pokrywają całe Twoje EDA, a nazwy pośrednie robią z kodu
czytelny protokół decyzji.

Druga oś selekcji — **wybór kolumn**. Jedna para nawiasów z kluczem daje
serię (PD.2); **lista nazw w podwójnych nawiasach** daje tabelę
z wybranymi kolumnami:

```python
df[["nazwa", "kwota"]]            # tabela: tylko te dwie kolumny
```

Podwójne nawiasy nie są magią — to zwykłe nawiasy tabeli, w które
włożyłeś(-aś) LISTĘ (F2.2) nazw kolumn.

Dla czytelności maskę często trzyma się w zmiennej (jak w pierwszym WE:
`maska = ...`, potem `df[maska]`) — przy dłuższych warunkach kod czyta
się wtedy jak zdanie. I przypomnienie z PD.2 w praktyce: tabela po sicie
zachowuje ORYGINALNE numery indeksu — dziury w numeracji z lewej to ślad
filtra, nie błąd.

Completion (luka na końcu — notebook PD.3): z tabeli wydatków wybierz
wiersze kategorii „jedzenie":

```python
jedzenie = df[df[______] == ______]   # luka: która kolumna, jaka wartość?
print(len(jedzenie))
```

### Pytania (retrieval)

**P1. Co zwraca samo wyrażenie `df["kwota"] > 20`?**

- A. Wiersze z kwotą powyżej 20 — *Nie — wiersze dostaniesz dopiero po
  włożeniu maski w nawiasy tabeli: `df[maska]`; samo porównanie daje
  odpowiedzi True/False.* (diagnoza: skleja dwa kroki filtrowania w jeden)
- B. **Serię True/False — po jednej odpowiedzi na każdy wiersz** ✓ —
  *Tak — to maska logiczna: hurtowa wersja porównania z F1.5.*
- C. `True` albo `False` — jedną odpowiedź dla całej kolumny — *Nie —
  pytanie pada OSOBNO dla każdego wiersza; odpowiedzi jest tyle, ile
  wierszy.* (diagnoza: porównanie „całościowe" zamiast per wiersz)
- D. Liczbę wierszy spełniających warunek — *Nie — liczbę dałoby dopiero
  `len(df[maska])`; maska to surowe odpowiedzi.* (diagnoza: przeskakuje
  do wyniku, gubi mechanizm)

**P2. Tabela wydatków z PD.2. Ile wierszy ma `df[df["kwota"] > 20]`
i co dzieje się z oryginalnym `df`?**

- A. 2 wiersze; oryginał traci te wiersze — *Połowicznie — liczba się
  zgadza, ale filtr TWORZY nową tabelę; `df` zostaje w całości (jak
  filtr-append w F3.2 nie ruszał źródłowej listy).* (diagnoza: filtr
  mylony z usuwaniem w miejscu)
- B. **2 wiersze (24.50 i 35.00); oryginalny `df` bez zmian** ✓ — *Tak —
  wynik to nowa, mniejsza tabela; źródło nietknięte.*
- C. 4 wiersze — maska tylko zaznacza — *Nie — nawiasy z maską ZOSTAWIAJĄ
  wyłącznie wiersze True; False odpadają z wyniku.* (diagnoza: maska jako
  adnotacja, nie sito)
- D. 2 wiersze, ale trzeba było najpierw posortować — *Nie — filtr nie
  wymaga żadnego przygotowania; działa na tabeli takiej, jaka jest.*
  (diagnoza: dokłada nieistniejący rytuał)

**P3. Czym różni się `df["kwota"]` od `df[["nazwa", "kwota"]]`?**

- A. Niczym — obie dają to samo — *Nie — pierwsza daje SERIĘ (jedną
  kolumnę), druga TABELĘ z dwiema kolumnami; to inne kształty wyniku.*
  (diagnoza: nie odróżnia serii od tabeli — rozróżnienie z PD.2-P2)
- B. **Pierwsza daje serię jednej kolumny; druga — tabelę ograniczoną do
  wymienionych kolumn** ✓ — *Tak — w drugiej wewnątrz nawiasów siedzi
  LISTA nazw; stąd „podwójne" nawiasy.*
- C. Druga jest błędna — za dużo nawiasów — *Nie — wewnętrzne nawiasy to
  po prostu lista (F2.2); składnia w pełni poprawna.* (diagnoza: czyta
  składnię „na oko" zamiast przez znane klocki)
- D. Pierwsza filtruje wiersze, druga kolumny — *Nie — WIERSZE filtruje
  maska (warunek); oba te zapisy wybierają wyłącznie kolumny.* (diagnoza:
  miesza dwie osie selekcji)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** Luka to bramka z F3.5 („kategoria równa jedzenie")
   w hurtowym zapisie: wewnątrz nawiasów tabeli stoi porównanie kolumny
   z wartością. Kolumnę podajesz jak klucz słownika (w cudzysłowie),
   wartość — jak w F1.5 (tekst w cudzysłowie, podwójny znak równości).
2. **Szkielet:** `df[df["kategoria"] == ______]` — z jaką wartością
   porównujesz? (dokładnie ta z danych, co do znaku).
3. **Pełne rozwiązanie z objaśnieniem:**
   `jedzenie = df[df["kategoria"] == "jedzenie"]` → `len(jedzenie)` = `2`
   (obiad i kawa). Pułapki: pojedynczy `=` w masce → `SyntaxError`
   (strażnik z F1.5 działa i tu); `KeyError` → literówka nazwy kolumny;
   0 wierszy przy poprawnej składni → wartość nie zgadza się co do znaku
   z danymi (np. „Jedzenie" wielką literą — porównania tekstów z F1.5).

---

## Atom PD.4 — LAB „Sito na tabeli" (maski + wybór kolumn na danych à la BDL)

**Typ:** `lab` · **Czas studenta:** ~15–20 min · **Koncepty ćwiczone:**
`dataframe-tabela`, `maska-filtrowanie` · **Krok fadingu:** szkielet
z lukami

### Cel

Powtórzysz sito z F3.4 — ale na DataFrame i bez jednej pętli: maski
i wybór kolumn na danych w kształcie, w jakim przyjdą z GUS BDL.

### Zadanie (notebook PD.4 — kopia na Dysk, uzupełnij luki, uruchom)

```python
import pandas as pd

dane = [
    {"rok": 2019, "wojewodztwo": "mazowieckie", "wartosc": 102.5},
    {"rok": 2020, "wojewodztwo": "mazowieckie", "wartosc": 98.7},
    {"rok": 2021, "wojewodztwo": "mazowieckie", "wartosc": 105.1},
    {"rok": 2019, "wojewodztwo": "opolskie",    "wartosc": 91.2},
    {"rok": 2020, "wojewodztwo": "opolskie",    "wartosc": 89.4},
    {"rok": 2021, "wojewodztwo": "opolskie",    "wartosc": 93.8},
    {"rok": 2019, "wojewodztwo": "pomorskie",   "wartosc": 99.9},
    {"rok": 2020, "wojewodztwo": "pomorskie",   "wartosc": 97.3},
]
df = pd.DataFrame(dane)

# 1. Obejrzyj tabelę (rytuał PD.2):
df.head(______)                 # luka 1: pokaż WSZYSTKIE wiersze tej małej tabeli

# 2. Tylko rok 2020:
rok2020 = df[______]            # luka 2: maska po kolumnie rok

# 3. Mazowieckie, tylko rok i wartość:
maz = df[df["wojewodztwo"] == ______][[______, ______]]   # luki 3–5

print(len(rok2020), len(maz))
```

Wymagania: luka 1 — argument `head` (ile wierszy pokazać); luka 2 —
pełna maska (porównanie kolumny z liczbą); luki 3–5 — wartość tekstowa
i dwie nazwy kolumn. Po uruchomieniu zmień województwo w kroku 3 na
„opolskie" — wynik ma się przeliczyć bez innych zmian.

**Zaliczenie:** komórka-pieczątka: sprawdza dla bieżących danych, że
`rok2020` to dokładnie wiersze z rokiem 2020 (liczy własną maską), a `maz`
ma dokładnie 2 kolumny (`rok`, `wartosc`) i jego wartości pokrywają się
z dokładnie JEDNYM województwem z `df` — po wyborze kolumn nazwy
województwa w `maz` już nie ma, więc pieczątka porównuje wartości
z pełną tabelą — i liczy token. Limity klasy L0 obowiązują.

### Drabinka hintów

1. **Koncepcyjny:** Krok 2 to P1→P2 z PD.3 sklejone: porównanie kolumny
   z wartością, włożone w nawiasy tabeli. Krok 3 to dwa sita jedno po
   drugim: najpierw maska (wiersze), potem lista nazw (kolumny) — czytaj
   od lewej, jak łańcuszek z F3.5.
2. **Szkielet:** luka 1: `head(8)` (albo `len(df)` — ile wierszy ma
   tabela?); luka 2: `df["rok"] == ______` (który rok?); luki 3–5:
   `"mazowieckie"`, `"rok"`, `"wartosc"` — wszystkie co do znaku
   z danych.
3. **Pełne rozwiązanie z objaśnieniem:** `df.head(8)`;
   `rok2020 = df[df["rok"] == 2020]` (3 wiersze — po jednym na
   województwo); `maz = df[df["wojewodztwo"] == "mazowieckie"][["rok",
   "wartosc"]]` (3 wiersze, 2 kolumny). `print` → `3 3`. Po podmianie na
   „opolskie": nadal `3 3` (te dane są symetryczne — pomorskie miałoby 2).
   `KeyError` → literówka kolumny; 0 wierszy → wartość tekstowa nie
   zgadza się co do znaku; `SyntaxError` przy masce → pojedynczy `=`.

---

## Atom PD.5 — Braki danych: policz, zrozum, dopiero potem decyduj

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`braki-danych-decyzje` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Policzysz braki w tabeli (`isna`), rozróżnisz świadome `dropna` od
ślepego i uzasadnisz decyzję — dokładnie to, za co rubryka capstone'u
daje 30% punktów.

### Teoria

Prawdziwe dane mają dziury. W tabeli brak pokazuje się jako **`NaN`**
(czytaj: „brak wartości") — pandas wstawia go tam, gdzie w rekordzie było
`None` albo gdzie źródło nic nie podało. Danych z brakami nie wolno ani
ignorować, ani czyścić w ciemno — rubryka Twojego capstone'u mówi wprost:
„świadoma obsługa braków (nie ślepe dropna)".

Krok pierwszy — ZAWSZE policz:

```python
df.isna()          # cała tabela True/False: gdzie jest brak?
df.isna().sum()    # ile braków W KAŻDEJ kolumNIE (True liczy się jak 1)
```

**Przewidź:** tabela à la BDL ma 8 wierszy, w kolumnie `wartosc` dwa
wiersze z `None`. Co pokaże `df.isna().sum()`?

Trzy linijki — po jednej na kolumnę: `rok 0`, `wojewodztwo 0`,
`wartosc 2`. To Twoja mapa dziur. Krok drugi — ZROZUM, skąd dziury:
w danych BDL braki bywają **strukturalne** (wskaźnik wprowadzono dopiero
od pewnego roku, więc wcześniejsze lata są puste) albo **punktowe**
(pojedynczy niepodany pomiar). Od diagnozy zależy decyzja.

Dwa narzędzia decyzji (oba tworzą NOWĄ tabelę, jak filtr w PD.3):

```python
czysta = df.dropna()             # usuń wiersze z JAKIMKOLWIEK brakiem
pelna = df.fillna(______)        # luka A: wstaw wartość w miejsce braków
```

- **`dropna()`** jest w porządku, gdy braków jest mało i są punktowe.
  Jest „ślepe", gdy braki są strukturalne: wytniesz systematycznie całe
  lata albo województwa i wnioski będą przekrzywione — policz `len` przed
  i po (luka B poniżej), żeby wiedzieć, ILE tracisz.
- **`fillna(wartość)`** bywa sensowne, gdy brak ma naturalną wartość
  (np. 0 tam, gdzie brak = „nie odnotowano żadnych zdarzeń"). Dla
  wskaźników ciągłych (ceny, stopy, wartości indeksów) wpisanie zera to
  FAŁSZOWANIE danych — zero to nie „brak", to konkretna wartość.

Krok trzeci — ZAPISZ decyzję: jedno zdanie w komórce tekstowej („usuwam
2 wiersze punktowych braków, tracę 25% roku 2021 — akceptowalne, bo…").
Rubryka ocenia uzasadnienie, nie samo wywołanie.

Jeszcze jedna rzecz, którą MUSISZ wiedzieć, nawet jeśli nic nie usuwasz:
statystyki pandas domyślnie POMIJAJĄ braki. `mean()` na kolumnie
z dziurami policzy średnią z wartości, które SĄ — bez błędu i bez
ostrzeżenia. Bywa to sensowne, ale bywa pułapką: średnia z trzech lat
udaje średnią z pięciu. Dlatego mapa braków (krok pierwszy) jest
obowiązkowa niezależnie od decyzji.

Luki w środku (notebook PD.5):

```python
print(len(df))            # ile wierszy przed czyszczeniem?
czysta = df.______()      # luka B: usuń wiersze z brakami
print(len(______))        # luka C: ile wierszy zostało?
```

### Pytania (retrieval)

**P1. Co pokazuje `df.isna().sum()`?**

- A. Sumę wartości w kolumnach — *Nie — najpierw działa `isna()` (mapa
  True/False braków), a sum liczy True jak jedynki: wynik to LICZBA BRAKÓW
  per kolumna.* (diagnoza: czyta sum bez kroku isna — łańcuszek od lewej,
  F3.5)
- B. **Liczbę braków w każdej kolumnie** ✓ — *Tak — to pierwsza komenda
  przy każdej nowej tabeli z dziurami: mapa, zanim decyzja.*
- C. Czy tabela ma jakikolwiek brak (True/False) — *Nie — wynik jest per
  kolumna, z liczbami; dokładniejszy niż jedno tak/nie.* (diagnoza:
  spłaszcza wynik do booleana)
- D. Usuwa braki i pokazuje wynik — *Nie — `isna` niczego nie zmienia,
  tylko RAPORTUJE; usuwanie to osobna, świadoma decyzja (`dropna`).*
  (diagnoza: miesza diagnozę z terapią — sedno atomu)

**P2. `df` ma 8 wierszy, 2 z nich mają brak w `wartosc`. Co zrobi
`czysta = df.dropna()`?**

- A. Usunie 2 braki, wstawiając zera — *Nie — wstawianie to `fillna`;
  dropna USUWA całe wiersze z brakiem.* (diagnoza: miesza dwa narzędzia
  decyzji)
- B. **`czysta` będzie mieć 6 wierszy; oryginalny `df` bez zmian** ✓ —
  *Tak — nowa tabela bez wierszy z brakiem, źródło nietknięte (jak filtr
  w PD.3).*
- C. Usunie kolumnę `wartosc` — *Nie — domyślnie dropna działa na
  WIERSZACH: znika cały rekord z dziurą, nie cała kolumna.* (diagnoza:
  osie tabeli — kalka z PD.2-P3)
- D. Zgłosi błąd — najpierw trzeba fillna — *Nie — żadnej wymaganej
  kolejności nie ma; dropna i fillna to ALTERNATYWNE decyzje, wybierasz
  jedną ze zrozumieniem danych.* (diagnoza: szuka rytuału zamiast decyzji)

**P3. Tabela wskaźnika cen ma braki za lata przed wprowadzeniem pomiaru.
Kolega proponuje `fillna(0)`. Dlaczego to zły pomysł?**

- A. Bo fillna działa tylko na tekstach — *Nie — fillna działa na
  liczbach; problem nie jest techniczny, tylko merytoryczny.* (diagnoza:
  szuka błędu składni tam, gdzie jest błąd znaczenia)
- B. Bo trzeba było użyć dropna — zawsze lepszego — *Nie — dropna też
  bywa złe (braki strukturalne = systematyczna utrata lat); nie ma „zawsze
  lepszego", jest decyzja pod dane.* (diagnoza: zamienia jedną ślepą
  regułę na drugą)
- C. **Bo zero to konkretna wartość wskaźnika, nie „brak" — wykres
  i średnie pokażą fałszywy spadek do zera** ✓ — *Tak — dla wskaźników
  ciągłych wpisanie zera fałszuje dane; brak strukturalny lepiej zostawić
  jako brak albo zawęzić analizę do lat z pomiarem — i uzasadnić.*
- D. Bo fillna zmienia oryginalną tabelę bezpowrotnie — *Nie — fillna
  tworzy nową tabelę jak dropna; problem jest w ZNACZENIU zera, nie
  w mechanice.* (diagnoza: mechanika zamiast znaczenia)

### Drabinka hintów (luki z teorii)

1. **Koncepcyjny:** Trzy kroki w kolejności: policz (`isna().sum()`) →
   zrozum (strukturalne czy punktowe?) → zdecyduj i zapisz. Luki B–C to
   pomiar kosztu decyzji: len przed, len po — różnica to cena dropna.
2. **Szkielet:** luka A: wartość, która ma SENS jako „brak" w Twoich
   danych (a jeśli żadna nie ma — to sygnał, że fillna nie jest Twoją
   decyzją); luka B: nazwa narzędzia usuwającego wiersze; luka C: nazwa
   nowej tabeli z linii wyżej.
3. **Pełne rozwiązanie z objaśnieniem:** `czysta = df.dropna()`,
   `print(len(czysta))` — przy 8 wierszach i 2 brakach: `8`, potem `6`.
   Decyzja do komórki tekstowej: co usuwasz, ile tracisz, czemu to
   akceptowalne. Częsty błąd mechaniczny: `df.dropna` BEZ nawiasów —
   Python wypisze dziwny opis zamiast tabeli (to metoda nieWYWOŁANA —
   nawiasy uruchamiają, jak w F2.6: definicja ≠ wywołanie).

---

## Atom PD.6 — Grupowanie: podziel, policz w każdej grupie, sklej

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`grupowanie-agregacja` (KLUCZOWY) · **Krok fadingu:** backward completion

### Cel

Streścisz kolumnę jednym `describe()`, policzysz agregat per grupa
(`groupby`) i użyjesz kwantyli do wskazania kandydatów na wartości
odstające.

### Teoria

Twoja funkcja `suma_kategorii` z mini-projektu F3.7 robiła pętlą to, co
pandas nazywa **grupowaniem**: podziel wiersze na grupy po wartości
kolumny, policz coś W KAŻDEJ grupie, sklej wyniki. Jedno zdanie kodu:

```python
df.groupby("kategoria")["kwota"].sum()
```

Czytaj od lewej, człon po członie (łańcuszek — F3.5): „weź tabelę →
pogrupuj po kategorii → z każdej grupy weź kolumnę kwota → policz sumę".

**Przewidź:** co wyjdzie dla tabeli wydatków z PD.2 (transport 4.40;
jedzenie 24.50 i 12.00; rozrywka 35.00)?

```
kategoria
jedzenie     36.5
rozrywka     35.0
transport     4.4
```

Po jednej linii na grupę — to jest odpowiedź na pytania typu „które
województwo…", „która kategoria…". Zamiast `.sum()` wstaw `.mean()`
(średnia), `.max()`, `.min()`, `.count()` — agregaty z F3.6, tylko per
grupa. Grupować można po każdej kolumnie o powtarzalnych wartościach —
po kategorii, po województwie, po ROKU (grupy „2019", „2020"… — tak
porównasz lata między sobą).

Drugie narzędzie — **`describe()`** — streszcza kolumnę liczbową jednym
wywołaniem: `df["kwota"].describe()` wypisze liczbę wartości (`count`),
średnią (`mean`), odchylenie (`std` — na razie czytaj: „typowy rozrzut"),
minimum, maksimum i trzy **kwantyle**: `25%`, `50%` (mediana), `75%` —
wartości, poniżej których leży ćwierć, połowa i trzy czwarte danych.
Czytaj `count` uważnie: to liczba wartości NIEPUSTYCH — gdy jest mniejsza
niż `len(df)`, właśnie znalazłeś(-aś) braki (PD.5) bez żadnej dodatkowej
komendy. Wynik grupowania też jest serią — możesz go przypisać do nazwy
i używać dalej, jak każdej wartości.

Kwantyle to Twój radar na **wartości odstające** (rubryka, kryterium 1):
gdy `max` jest DALEKO ponad `75%` (albo `min` daleko pod `25%`), masz
kandydata na odstającą obserwację. Kandydata — nie wyrok: sprawdź ją
(literówka w źródle? inna jednostka? prawdziwy rekord?) i dopiero potem
zdecyduj, czy zostaje, czy odpada — z uzasadnieniem, jak przy brakach
(PD.5). Usuwanie odstających „bo psują wykres" to fałszowanie danych.

Backward completion (notebook PD.6 — wynik gotowy, dopisz wywołanie):

```python
# dopisz JEDNO zdanie kodu, które daje poniższy wynik
# (wartości zaokrąglone tu do 2 miejsc dla czytelności —
#  surowy wynik pokaże więcej cyfr po kropce):
# wojewodztwo
# mazowieckie    102.10
# opolskie        91.47
# pomorskie       98.60
# Name: wartosc, dtype: float64
```

(Wskazówki w samym wyniku: po czym pogrupowano? którą kolumnę policzono?
jaka to statystyka — sumy byłyby większe od pojedynczych wartości…)

### Pytania (retrieval)

**P1. Które z tych statystyk NIE ma w wyniku `df["kwota"].describe()`?**

- A. Średnia — *Nie — jest, jako `mean`.* (diagnoza: nie kojarzy nazw EN
  ze statystykami)
- B. Mediana — *Nie — jest, jako `50%` (kwantyl połowy danych).*
  (diagnoza: nie wie, że 50% = mediana)
- C. **Suma** ✓ — *Tak — describe streszcza rozkład (count/mean/std/min/
  kwantyle/max), ale sumy tam NIE ma; sumę liczysz osobno: `.sum()`.*
- D. Maksimum — *Nie — jest, jako `max`.* (diagnoza: zgaduje bez czytania
  wyniku)

**P2. Jak przeczytasz na głos `df.groupby("wojewodztwo")["wartosc"]
.mean()`?**

- A. „Policz średnią wartość całej tabeli" — *Nie — od tego jest samo
  `df["wartosc"].mean()`; groupby wkłada między tabelę a średnią PODZIAŁ
  na grupy.* (diagnoza: ignoruje człon groupby w łańcuszku)
- B. **„Dla każdego województwa osobno policz średnią z wartości"** ✓ —
  *Tak — podziel po województwie, w każdej grupie średnia z kolumny,
  wyniki sklejone w jedną odpowiedź.*
- C. „Wybierz województwa ze średnią wartością" — *Nie — groupby niczego
  nie filtruje: KAŻDA grupa dostaje swój wynik; filtrowanie to maski
  (PD.3).* (diagnoza: myli grupowanie z filtrowaniem)
- D. „Posortuj województwa po wartości" — *Nie — wynik bywa ułożony
  alfabetycznie po grupie, ale to efekt uboczny; treścią jest ŚREDNIA per
  grupa.* (diagnoza: czyta układ wyniku zamiast jego treści)

**P3. W `describe()` kolumny cen: `75%` = 120, a `max` = 4 500. Co
robisz?**

- A. Usuwam wiersz z 4 500 — psuje statystyki — *Nie — najpierw ŚLEDZTWO:
  usuwanie bez sprawdzenia to fałszowanie danych (ta sama zasada co przy
  brakach).* (diagnoza: „czyszczenie" jako odruch, nie decyzja)
- B. Nic — describe się nie myli — *Nie — describe policzył dobrze, ale
  liczby trzeba INTERPRETOWAĆ: tak daleki max to sygnał wymagający
  sprawdzenia.* (diagnoza: statystyka jako wyrocznia)
- C. **Sprawdzam tę obserwację: błąd danych (literówka, jednostka) czy
  prawdziwa wartość niosąca informację — i decyzję z uzasadnieniem
  zapisuję** ✓ — *Tak — kandydat na odstającą wartość dostaje śledztwo,
  nie automatyczny wyrok; dokładnie tego chce rubryka.*
- D. Zamieniam 4 500 na średnią — *Nie — to fillna-myślenie w złym
  miejscu: podmiana prawdziwej obserwacji na średnią fałszuje dane
  mocniej niż jej usunięcie.* (diagnoza: transfer fillna tam, gdzie nie
  ma braku)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Odtwórz zdanie z wyniku, od lewej: nagłówek wyniku
   (`wojewodztwo`) = kolumna grupowania; `Name: wartosc` = kolumna
   liczona; wartości bliskie pojedynczym pomiarom (nie ich sumom) =
   średnia.
2. **Szkielet:** `df.groupby(______)[______].______()` — trzy luki:
   po czym dzielisz, co liczysz, jaka statystyka.
3. **Pełne rozwiązanie z objaśnieniem:**
   `df.groupby("wojewodztwo")["wartosc"].mean()` — dla danych PD.4:
   mazowieckie (102.5+98.7+105.1)/3 = 102.1, opolskie
   (91.2+89.4+93.8)/3 ≈ 91.47, pomorskie (99.9+97.3)/2 = 98.6. Surowy
   wynik pandas pokaże więcej cyfr po kropce (float — F2.1); komentarz
   zadania zaokrągla do 2 miejsc dla czytelności — wartości mają się
   zgadzać co do zaokrąglenia, nie co do znaku. Częste potknięcia: `sum`
   zamiast `mean` (wartości ~3× większe — porównaj rząd wielkości
   z danymi); `KeyError` — literówka nazwy kolumny w którymkolwiek
   członie.

---

## Atom PD.7 — Wykres, który wspiera wniosek

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`wykresy-opisane` · **Krok fadingu:** krótkie WE + zadanie

### Cel

Narysujesz wykres liniowy trendu i histogram rozkładu — z tytułem,
opisanymi osiami i legendą — i rozstrzygniesz, który rodzaj wykresu pasuje
do którego pytania.

### Teoria

Rubryka capstone'u (20% punktów) żąda wykresu z opisanymi osiami,
jednostkami, tytułem i legendą — bo wykres bez opisów jest ozdobą,
a z opisami ARGUMENTEM. W pandas rysuje się metodą `.plot(...)` — wykres
pojawia się pod komórką (Colab renderuje automatycznie) i ZOSTAJE
w zapisanym notebooku: kto otworzy Twój plik, zobaczy wykres bez
uruchamiania czegokolwiek — notebook z wykresami czyta się jak raport:

```python
maz = df[df["wojewodztwo"] == "mazowieckie"]     # sito z PD.3
maz.plot(x="rok", y="wartosc", kind="line",
         title="Wskaźnik w woj. mazowieckim",
         xlabel="Rok", ylabel="Wartość wskaźnika (2015 = 100)")
```

**Przewidź:** co będzie na osi poziomej, co na pionowej i skąd wykres
weźmie legendę?

Poziomo lata (`x="rok"`), pionowo wartości (`y="wartosc"`), legenda
powstaje sama z nazwy kolumny `y`. Argumenty czytaj wprost: `kind="line"`
— rodzaj wykresu; `title`/`xlabel`/`ylabel` — komplet opisów, którego
żąda rubryka (w `ylabel` podawaj JEDNOSTKĘ — czytelnik musi wiedzieć,
czy patrzy na procenty, złotówki czy indeks).

Dwa rodzaje wykresów zamykają większość potrzeb EDA:

- **`kind="line"`** — TREND: coś zmienia się w czasie (oś x = czas).
- **`kind="hist"`** — ROZKŁAD jednej kolumny liczb: które wartości częste,
  które rzadkie, czy coś odstaje (radar z PD.6 w wersji obrazkowej):
  `df["wartosc"].plot(kind="hist", title="Rozkład wartości")`.

Reguła doboru: pytanie „jak zmienia się w czasie?" → linia; pytanie „jakie
wartości i jak często?" → histogram. Zauważ różnicę surowca: histogram
rysujesz na SERII (jednej kolumnie), linię — na tabeli ze wskazanym
`x` i `y`. Inne rodzaje wykresów istnieją
(słupki, punkty) — poznasz je, gdy zada je konkretne pytanie; do
capstone'u te dwa wystarczą w zupełności.

Zasada nadrzędna z rubryki: wykres ma WSPIERAĆ konkretny wniosek —
rysujesz go po to, żeby czytelnik zobaczył to, o czym piszesz, a nie „bo
ładnie". Dobry test: czy tytuł wykresu mógłby być zdaniem wniosku
(„Wskaźnik rośnie nieprzerwanie od 2020"), a nie etykietą („Wykres 1")?
Zauważ też łańcuszek w WE: sito z PD.3 i `.plot` w jednej linii — filtr
zwraca tabelę, a każda tabela umie się narysować.

Zadanie (notebook PD.7): narysuj OBA wykresy dla danych à la BDL z PD.4 —
trend dla jednego województwa (linia) i rozkład wszystkich wartości
(histogram) — komplet opisów w obu.

### Pytania (retrieval)

**P1. Po co `xlabel`, `ylabel` i `title`, skoro wykres i bez nich się
narysuje?**

- A. Bez nich pandas zgłasza błąd — *Nie — narysuje się bez błędu;
  problem nie jest techniczny.* (diagnoza: szuka przymusu składniowego
  zamiast celu komunikacyjnego)
- B. **Bez nich czytelnik nie wie, na co patrzy — wykres przestaje być
  argumentem; rubryka wprost tego wymaga** ✓ — *Tak — osie z jednostkami
  + tytuł = wykres czytelny bez zaglądania w kod.*
- C. Przyspieszają rysowanie — *Nie — to opisy, nie optymalizacja.*
  (diagnoza: zgaduje „techniczną" korzyść)
- D. Są potrzebne tylko w histogramach — *Nie — każdy rodzaj wykresu
  wymaga opisów; rubryka nie robi wyjątków.* (diagnoza: przypisuje regułę
  jednemu rodzajowi)

**P2. Chcesz pokazać, jak wskaźnik zmieniał się w latach 2015–2024 dla
jednego województwa. Który wykres?**

- A. Histogram wartości — *Nie — histogram gubi CZAS: pokaże, które
  wartości częste, ale nie kiedy wystąpiły.* (diagnoza: rodzaj wykresu
  bez pytania, na które odpowiada)
- B. **Linia: `x="rok"`, `y=` wskaźnik** ✓ — *Tak — trend w czasie to
  linia; oś pozioma = czas.*
- C. Dwie tabele head() obok siebie — *Nie — do trendu służy wykres;
  tabela nie pokazuje kształtu zmian na pierwszy rzut oka.* (diagnoza:
  unika wykresów w ogóle)
- D. Wykres czegokolwiek, byle z tytułem — *Nie — opisy są konieczne, ale
  nie zastąpią doboru RODZAJU do pytania.* (diagnoza: rubrykę czyta jako
  checklistę ozdób)

**P3. Kolega wstawił do raportu wykres bez podpisanych osi — „przecież
widać". Co mu odpowiesz zgodnie z rubryką?**

- A. Że wystarczy dopisać zdanie pod wykresem — *Nie — opis POD wykresem
  nie zastępuje osi: wykres wędruje po prezentacjach sam i musi bronić
  się sam.* (diagnoza: przenosi obowiązek opisu poza wykres)
- B. Że rubryka tego nie sprawdza — *Nie — sprawdza wprost: „opisane osie,
  jednostki, tytuł, legenda" to kryterium za 20%.* (diagnoza: nie czyta
  rubryki)
- C. **Że „widać" tylko autorowi: bez osi i jednostek czytelnik nie wie,
  co i w czym mierzono — wykres trzeba opisać** ✓ — *Tak — autor zna
  kontekst z pamięci, czytelnik ma tylko to, co na obrazku.*
- D. Że lepiej usunąć wykres — *Nie — wykres trendu jest WYMAGANY;
  rozwiązaniem jest opisanie, nie usunięcie.* (diagnoza: ucieczka od
  wymogu zamiast poprawy)

### Drabinka hintów (zadanie z teorii)

1. **Koncepcyjny:** Dwa wykresy = dwa pytania: „jak zmienia się w czasie
   w JEDNYM województwie?" (najpierw sito PD.3, potem linia) i „jakie
   wartości w ogóle występują?" (cała kolumna, histogram). W obu komplet:
   `title`, `xlabel`, `ylabel` z jednostką.
2. **Szkielet:** wykres 1: `df[df["wojewodztwo"] == ______].plot(x=______,
   y="wartosc", kind=______, title=..., xlabel=..., ylabel=...)`;
   wykres 2: `df[______].plot(kind="hist", ...)` — która kolumna?
3. **Pełne rozwiązanie z objaśnieniem:** wykres 1:
   `df[df["wojewodztwo"] == "mazowieckie"].plot(x="rok", y="wartosc",
   kind="line", title="Wskaźnik — mazowieckie", xlabel="Rok",
   ylabel="Wartość (2015 = 100)")`; wykres 2: `df["wartosc"]
   .plot(kind="hist", title="Rozkład wartości", xlabel="Wartość")`.
   Jeśli wykres się „nie pokazuje" — uruchom komórkę ponownie i sprawdź,
   czy wywołanie `.plot` nie jest w środku komórki, po którym następują
   inne printy (najczyściej: jedno wywołanie plot na komórkę); linia
   „schodkowa" zamiast gładkiej → dane nieprzefiltrowane (rysujesz
   wszystkie województwa naraz — najpierw sito).

---

## Atom PD.8 — LAB „Mini-EDA bez API" (samodzielny finał M-PD)

**Typ:** `lab` · **Czas studenta:** ~25–30 min · **Koncepty ćwiczone:**
wszystkie z M-PD · **Krok fadingu:** zadanie samodzielne (sama
specyfikacja)

### Cel

Przeprowadzisz kompletną mini-eksplorację tabeli — od rytuału obejrzenia,
przez braki i grupy, po opisany wykres z wnioskiem. To capstone M-EDA
w miniaturze, na danych wpisanych w kod (API dojdzie w M-EDA).

### Zadanie (notebook PD.8 — tabela 12 rekordów à la BDL w komórce
„Dane" + pusta komórka „Twoja analiza" + pieczątka)

Na danych z notebooka (**dokładnie 12 wierszy**: 3 województwa × 4 lata,
kolumny `rok`, `wojewodztwo`, `wartosc`, **dokładnie 2 wiersze z brakiem
w `wartosc`** — kształt danych jest częścią kontraktu pieczątki):

1. **Rytuał PD.2:** obejrzyj tabelę (`head`, `len`, `info`).
2. **Braki (PD.5):** policz je, podejmij decyzję (drop/zostaw/zawęź —
   przy zawężeniu np. do 3 ostatnich lat, nie węziej) i UZASADNIJ
   jednym zdaniem w komórce tekstowej.
3. **Grupy (PD.6):** średnia `wartosc` per województwo; wskaż w komórce
   tekstowej, które województwo najwyżej.
4. **Wykres (PD.7):** trend `wartosc` w czasie dla wybranego województwa
   — komplet opisów.
5. **Wniosek:** 1–2 zdania w komórce tekstowej — co widać na wykresie
   i jaka hipoteza z tego płynie (hipoteza = „do sprawdzenia", nie
   „udowodnione" — przedsmak EDA.3).

Dwie nazwy są CZĘŚCIĄ specyfikacji (pieczątka musi wiedzieć, gdzie
patrzeć): tabelę po decyzji o brakach nazwij **`dane_analiza`**, wynik
grupowania — **`srednie_woj`**. Reszta nazw dowolna.

**Zaliczenie:** komórka-pieczątka: sprawdza, że tabela wejściowa jest
nietknięta (12 wierszy, 2 braki), `dane_analiza` istnieje i ma spójny
`len` (od 7 do 12 — każda z trzech decyzji o brakach legalna, również
zawężenie lat połączone z usunięciem braków), a `srednie_woj` zgadza się
z niezależnym przeliczeniem grupowania na `dane_analiza` — i liczy
token. Jawny limit (klasa L0): komórek TEKSTOWYCH (uzasadnienie,
wniosek) pieczątka nie
ocenia — w M-PD ocenia je student sam wg drabinki; przy capstonie zrobi
to rubryka i viva.

### Drabinka hintów

1. **Koncepcyjny:** To sekwencja czterech atomów w kolejności, w jakiej
   je przeszedłeś(-aś): obejrzyj → braki (policz-zrozum-zdecyduj-zapisz)
   → pogrupuj → narysuj i podpisz. Każdy krok masz przećwiczony; nowa
   jest tylko samodzielność złożenia.
2. **Szkielet:** komórka 1: `df.head(12)`, `len(df)`, `df.info()`;
   komórka 2: `df.isna().sum()` → decyzja → `czysta = ...` →
   `len(czysta)`; komórka 3: `czysta.groupby(______)[______].mean()`;
   komórka 4: sito na jedno województwo + `.plot(x=..., y=...,
   kind="line", title=..., xlabel=..., ylabel=...)`.
3. **Pełne rozwiązanie z objaśnieniem:** (w notebooku, zwinięte —
   dno drabinki nie blokuje zaliczenia, R13): przykładowa decyzja
   „usuwam 2 punktowe braki (2 z 12 wierszy, ~17% tabeli; braki w 2020
   i 2021) — akceptowalne, bo analiza dotyczy trendu wieloletniego"; grupowanie i wykres jak w PD.6/PD.7;
   wniosek wzorcowy: „wartość w mazowieckim rośnie w całym okresie;
   hipoteza: wzrost wiąże się z X — wymaga danych o X". Sprawdzian
   samokontroli przed tokenem: czy każda liczba w Twoich zdaniach
   pochodzi z komórki wyżej (nie z pamięci)?

---

## Egzamin modułu M-PD (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** **18 pytań, próg: ≤2 błędy** (~88,9%
— uzasadnienie w zasadach modułu); 2 warianty izomorficzne (cap 2); retry
z drugim wariantem; po 2. oblaniu correctives; „zarezerwuj ~30 min";
pokrycie 3 × 6 atomów; kalibracja OSOBNA, przy WE. Format jak F1–F3.

**E1** · A: Pandas jest zainstalowany w Colab. Co musisz zrobić, żeby go
użyć w nowej sesji? — nic, działa od razu / **wykonać `import pandas as
pd`** / `!pip install pandas` za każdym razem / założyć konto pandas —
*import wpuszcza pakiet do sesji.* · B: Po restarcie sesji `pd.DataFrame`
daje `NameError: name 'pd' is not defined`. Co robisz? — instaluję pandas
od nowa / **wykonuję ponownie komórkę z `import pandas as pd`** /
zakładam nową kopię notebooka / czekam aż sesja wróci — *import żyje
w pamięci sesji (L0.3).* → `import-pakiety-terminal` → PD.1

**E2** · A: `import mapy_swiata` → `ModuleNotFoundError`. Pierwszy ruch?
— przepisać import wielkimi literami / **`!pip install mapy_swiata`,
potem powtórzyć import** / zrestartować Colab / napisać pakiet samemu —
*brak pakietu = instalacja.* · B: `import wykresiki` →
`ModuleNotFoundError`. Pierwszy ruch? — usunąć linię / **`!pip install
wykresiki`, potem powtórzyć import** / zmienić alias / zgłosić błąd
Google — *jak w A.* → `import-pakiety-terminal` → PD.1

**E3** · A: Do kogo mówi linia `!pip install requests`? — do Pythona /
**do systemu (terminal) — `!` omija Pythona** / do przeglądarki / to
komentarz — *dwa adresaty komórki.* · B: Do kogo mówi linia
`print("start")` w tej samej komórce? — **do Pythona** / do systemu /
do pip / to komentarz — *bez `!` mówisz do Pythona.*
→ `import-pakiety-terminal` → PD.1

**E4** · A: `pd.DataFrame(lista_rekordow)` — co stanie się kolumnami? —
numery 0,1,2… / **klucze słowników** / pierwszy rekord / trzeba podać
ręcznie — *klucz = kolumna, rekord = wiersz.* · B: …a co stanie się
wierszami? — klucze / **kolejne rekordy (słowniki) z listy** / tylko
rekordy bez braków / wartości tekstowe — *jak w A.* →
`dataframe-tabela` → PD.2

**E5** · A: Co zwraca `df["wartosc"]`? — jedną wartość / **serię — całą
kolumnę** / tabelę bez tej kolumny / `True`/`False` — *klucz kolumny =
cała kolumna.* · B: Co zwraca `df["rok"]`? — jedną wartość / **serię —
całą kolumnę** / liczbę wierszy / maskę — *jak w A.* →
`dataframe-tabela` → PD.2

**E6** · A: Tabela: 6 wierszy, 4 kolumny. `len(df)`? — 4 / **6** / 24 /
10 — *len = wiersze.* · B: Tabela: 9 wierszy, 2 kolumny. `len(df)`? —
2 / **9** / 18 / 11 — *jak w A.* → `dataframe-tabela` → PD.2

**E7** · A: Co zwraca `df["rok"] == 2020`? — wiersze z 2020 / **serię
True/False per wiersz** / liczbę wierszy z 2020 / `SyntaxError` — *maska
= hurtowe porównanie.* · B: Co zwraca `df["kwota"] < 10`? — wiersze
z kwotą <10 / **serię True/False per wiersz** / najmniejszą kwotę /
`SyntaxError` — *jak w A.* → `maska-filtrowanie` → PD.3

**E8** · A: Co daje `df[df["rok"] == 2020]`? — **nową tabelę z wierszami
roku 2020; oryginał bez zmian** / usuwa rok 2020 z df / serię True/False
/ jedną wartość — *maska w nawiasach = sito wierszy.* · B: Co daje
`df[df["kwota"] > 100]`? — **nową tabelę z wierszami kwot >100; oryginał
bez zmian** / usuwa te wiersze z df / serię True/False / sumę tych kwot —
*jak w A.* → `maska-filtrowanie` → PD.3

**E9** · A: `df[["rok", "wartosc"]]` — co dostajesz? — serię / **tabelę
ograniczoną do dwóch kolumn** / dwa wiersze / `KeyError` — *lista nazw
w nawiasach = wybór kolumn.* · B: `df[["nazwa"]]` vs `df["nazwa"]` —
różnica? — żadna / **pierwsza to tabela z jedną kolumną, druga to seria**
/ pierwsza filtruje wiersze / druga jest błędna — *lista vs klucz.*
→ `maska-filtrowanie` → PD.3

**E10** · A: Co pokazuje `df.isna().sum()`? — sumę wartości / **liczbę
braków per kolumna** / czy są duplikaty / usuwa braki — *mapa dziur,
zanim decyzja.* · B: Pierwsza komenda przy tabeli, w której podejrzewasz
braki? — `dropna()` od razu / **`isna().sum()` — najpierw policz** /
`fillna(0)` od razu / `describe()` — *policz → zrozum → zdecyduj.*
→ `braki-danych-decyzje` → PD.5

**E11** · A: `df` ma 10 wierszy, 3 z brakami. Po `czysta = df.dropna()`:
ile wierszy ma `czysta`, a ile `df`? — 7 i 7 / **7 i 10** / 10 i 7 /
10 i 10 — *dropna tworzy nową tabelę; źródło nietknięte.* · B: `df` ma
6 wierszy, 1 z brakiem. Po `czysta = df.dropna()`: ile wierszy ma
`czysta`, a ile `df`? — 5 i 5 / **5 i 6** / 6 i 5 / 6 i 6 — *jak w A.*
→ `braki-danych-decyzje` → PD.5

**E12** · A: Wskaźnik cen ma braki za lata sprzed pomiaru. Dlaczego
`fillna(0)` to błąd? — fillna nie działa na liczbach / **zero to
konkretna wartość wskaźnika — wykresy i średnie pokażą fałszywy spadek**
/ bo zawsze lepsze jest dropna / bo fillna kasuje kolumnę — *zero ≠
brak.* · B: Kiedy `fillna(0)` bywa POPRAWNE? — zawsze, to standard /
**gdy brak znaczy „zero zdarzeń" (np. brak zgłoszeń = 0 zgłoszeń)** /
nigdy / gdy braków jest dużo — *decyzja pod znaczenie danych.*
→ `braki-danych-decyzje` → PD.5

**E13** · A: Jak przeczytać `df.groupby("kategoria")["kwota"].sum()`? —
suma kwot całej tabeli / **dla każdej kategorii osobno suma kwot** /
wybierz kategorie z sumą / posortuj po kwocie — *podziel-policz-sklej.* ·
B: Jak przeczytać `df.groupby("wojewodztwo")["wartosc"].max()`? —
maksimum całej tabeli / **dla każdego województwa osobno największa
wartość** / województwo z maksimum / sortowanie malejące — *jak w A.*
→ `grupowanie-agregacja` → PD.6

**E14** · A: Czego NIE ma w wyniku `describe()`? — średniej / mediany /
**sumy** / maksimum — *describe streszcza rozkład; sumę liczy `.sum()`.*
· B: Gdzie w `describe()` siedzi mediana? — w `mean` / **w `50%`**
/ w `std` / nie ma jej — *mediana = kwantyl 50%.*
→ `grupowanie-agregacja` → PD.6

**E15** · A: `75%` = 40, `max` = 2 000. Co robisz z obserwacją 2 000? —
usuwam, psuje wykres / **sprawdzam: błąd danych czy prawdziwa wartość —
decyzja z uzasadnieniem** / zamieniam na średnią / nic, describe wie
lepiej — *kandydat na odstającą = śledztwo, nie wyrok.* · B: Odstającą
obserwację wolno usunąć, gdy… — psuje trend na wykresie / **śledztwo
wykazało błąd danych, a decyzja jest uzasadniona w raporcie** / jest
większa od średniej / zawsze — *jak w A.* → `grupowanie-agregacja` → PD.6

**E16** · A: „Jak zmieniała się wartość w latach 2015–2024?" — który
wykres? — histogram / **linia (`kind="line"`, x = rok)** / tabela head /
dowolny z tytułem — *trend w czasie = linia.* · B: „Które wartości
wskaźnika są częste, a które rzadkie?" — który wykres? — linia /
**histogram (`kind="hist"`)** / dwie tabele / dowolny z legendą —
*rozkład = histogram.* → `wykresy-opisane` → PD.7

**E17** · A: Skąd wykres liniowy pandas bierze legendę? — trzeba dopisać
ręcznie zawsze / **z nazwy kolumny `y`** / z tytułu / z xlabel — *legenda
domyślnie z y.* · B: Gdzie w wykresie podajesz JEDNOSTKĘ mierzonej
wielkości? — w legendzie / **w `ylabel` (opisie osi wartości)** /
w nazwie pliku / nigdzie — *czytelnik musi wiedzieć, w czym mierzono.*
→ `wykresy-opisane` → PD.7

**E18** · A: Wykres bez opisanych osi w raporcie — co mówi rubryka? —
dopuszcza, jeśli jest zdanie pod spodem / **wymaga osi, jednostek,
tytułu i legendy — wykres ma bronić się sam** / ocenia tylko kod / nie
dotyczy wykresów — *kryterium 3, 20% punktów.* · B: Po co w ogóle wykres
w EDA wg rubryki? — jako ozdoba raportu / **żeby WSPIERAŁ konkretny
wniosek** / żeby pokazać znajomość pandas / bo tak wypada — *wykres =
argument.* → `wykresy-opisane` → PD.7

---

## Strona „Pierwsza pomoc — M-PD" (D5a, statyczna, per moduł)

Strony L0–F3 obowiązują. Przyrost M-PD:

1. **`NameError: name 'pd' is not defined`** → komórka z `import pandas
   as pd` nie wykonała się w TEJ sesji (restart/wygaśnięcie — L0.3);
   uruchom komórki od góry (PD.1).
2. **`ModuleNotFoundError: No module named '…'`** → pakietu nie ma
   w środowisku: `!pip install nazwa`, potem powtórz import (PD.1).
3. **`KeyError: '…'` przy `df["…"]`** → literówka nazwy kolumny —
   porównaj znak po znaku z `df.head()`; wielkość liter ma znaczenie
   (zasada ze słowników, F3.3).
4. **`SyntaxError` w masce** → pojedynczy `=` zamiast `==` w porównaniu
   kolumny (strażnik z F1.5 działa i tu) (PD.3).
5. **Filtr zwraca 0 wierszy przy poprawnej składni** → wartość
   porównywana nie zgadza się co do znaku z danymi (spacje! wielkość
   liter!); podejrzyj unikalne wartości: `df["kolumna"].unique()` —
   wypisze, co NAPRAWDĘ siedzi w kolumnie (PD.3).
6. **Metoda „nic nie robi" / wynik wygląda jak opis, nie tabela** →
   brak nawiasów: `df.dropna` zamiast `df.dropna()` — metoda niewywołana
   (definicja ≠ wywołanie, F2.6) (PD.5).
7. **Wynik dropna/fillna/filtra „znika"** → te operacje tworzą NOWĄ
   tabelę; bez przypisania (`czysta = df.dropna()`) wynik przepada —
   odwrotność pułapki append z F3.1 (tam NIE przypisujesz, tu MUSISZ).
8. **`TypeError` przy `.sum()`/`.mean()` na kolumnie** → kolumna nie
   jest liczbowa (sprawdź `dtypes` — liczby wczytane jako tekst to
   częsty grzech źródeł danych; konwersję poznasz przy prawdziwych
   danych w M-EDA).
9. **Wykres się nie pokazuje** → uruchom komórkę ponownie; trzymaj jedno
   wywołanie `.plot(...)` na komórkę, najlepiej jako ostatnią linię
   (PD.7).
10. **Na wykresie liniowym „zęby piły"** → rysujesz wszystkie grupy
    naraz (np. 3 województwa w jednej linii) — najpierw sito PD.3 na
    jedną grupę, potem plot.
11. **Żółte ostrzeżenie „Boolean Series key will be reindexed…"** →
    druga maska zbudowana z ORYGINALNEGO `df`, a przesiewasz tabelę
    pośrednią. Wynik może być nawet poprawny, ale zapis jest mylący —
    buduj maskę z tej tabeli, którą filtrujesz (PD.3: sito zawsze na
    tym, co przesiewasz).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://pandas.pydata.org/docs/user_guide/10min.html | „10 minutes to pandas" — oficjalny przegląd (docs pokazują pandas 3.x; Colab ma 2.2.x — zakres modułu wspólny dla obu) | praktyka-docs (pogłębienie; EN — poza ścieżką krytyczną) | BSD (dokumentacja pandas) | EN | nie | 2026-07-11 (URL kanoniczny, bez przekierowań) |
| https://www.youtube.com/watch?v=hmBKMQzOdVs | „Wprowadzenie do analizy danych z Python i Pandas [WEBINAR]" (Kodołamacz.pl/Sages, ~1 h 39 min, 2025) — czyszczenie, przekształcanie, wizualizacja | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; rocznik 2025 = era pandas 2.x, bez archaizmów; seans kontrolny przed ingest) |
| https://www.youtube.com/watch?v=Mc0CUFjEhGU | „Python pandas — wszystko co trzeba wiedzieć, aby zacząć" (Analityk edu pl, ~14 min, 2020) — krótki wstęp; BEZ braków danych | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (notebook autora sprawdzony: 0×`.append(`, 0×`.ix[` — składnia bezpieczna) |

Sedno M-PD w całości w polskiej teorii atomów (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0–F3

| Termin | Po polsku |
|---|---|
| pakiet / *package* / biblioteka | narzędzia spoza Pythona bazowego; instalowane raz, importowane w każdej sesji |
| `import … as …` | wpuszczenie pakietu do sesji pod skrótem (aliasem) |
| `!` (w komórce Colab) | linia dla SYSTEMU (terminal), nie dla Pythona |
| `pip` | instalator pakietów (`!pip install nazwa`) |
| `ModuleNotFoundError` | pakietu nie ma w środowisku — do zainstalowania |
| DataFrame | tabela pandas: rekordy → wiersze, klucze → kolumny |
| seria / *Series* | jedna kolumna tabeli (`df["kolumna"]`) |
| indeks (w tabeli) | numeracja wierszy od zera (kolumna bez nagłówka z lewej) |
| `head()` / `info()` / `dtypes` | rytuał oglądania: początek tabeli / podsumowanie / typy kolumn |
| maska logiczna | seria True/False z porównania na całej kolumnie |
| `NaN` | brak wartości w tabeli |
| `isna()` / `dropna()` / `fillna()` | policz braki / usuń wiersze z brakami / wstaw wartość w braki |
| `groupby` | podziel na grupy → policz w każdej → sklej wyniki |
| `describe()` | streszczenie rozkładu: count, mean, std, min, kwantyle, max |
| kwantyl (25% / 50% / 75%) | wartość, poniżej której leży ćwierć / połowa / trzy czwarte danych; 50% = mediana |
| `.plot(kind="line"/"hist")` | wykres liniowy (trend) / histogram (rozkład) |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** PD.1 → PD.2 → PD.3 → PD.4 (lab) →
  PD.5 → PD.6 → PD.7 → PD.8 (lab) → przegląd przed egzaminem (reuse —
  lista w zasadach) → egzamin. Moduł `m-pandas` (drabina zaktualizowana
  commitem 2a6b0c5). Modelowanie atomów jak F1–F3.
- **Egzamin 18 pytań / ≤2 błędy:** pierwszy moduł z 6 atomami — parametr
  jawnie uzasadniony w zasadach (między wzorcami D3); wpis do
  `examConfigJson`; monitorować w D11 jak wszystkie progi. **Monitoring
  par (precedens E11/F2, E6/F3): E3 i E12** — pary „dwustronne"
  (komplementarne aspekty), nie ścisłe izomorfy; jeśli success rate
  odstaje, kandydaci do przepisania.
- **1 koncept = 1 atom — deklaracje (standard L0.2):** PD.1 — bundling
  import+pip+`!` (jedna materia „skąd narzędzia"; `!` to zaplanowane
  wejście terminala pkt 9); PD.6 — describe+groupby+kwantyle-odstające
  (jedna materia „co mówią grupy liczb"; odstające NIE dostają osobnego
  atomu — decyzja z audytu pojemności).
- **Wersje pandas:** treść nie cytuje bezwarunkowo niczego, co różni się
  między 2.x a 3.x (dtype tekstu `object` vs `str` — obsłużone w PD.2
  i uwadze nagłówkowej); snippety zweryfikowane w 2.3.3 i 3.0.3.
  Przy budowie notebooków sprawdzić wersję pandas w Colab.
- **Pieczątki labów:** PD.4/PD.8 — relacje przeliczane niezależnie przez
  pieczątkę (własne maski/groupby), tolerancja float `abs < 0.01` (nota
  z F3). PD.4, warunek „jedno województwo w `maz`": po wyborze kolumn
  kolumny `wojewodztwo` już tam NIE MA — weryfikacja przez indeksy:
  `df.loc[maz.index, "wojewodztwo"].nunique() == 1` (indeksy przeżywają
  sito — treść PD.2/PD.3 sama tego uczy). PD.8: check związany z nazwami
  ze specyfikacji (`dane_analiza`, `srednie_woj`); trzy legalne decyzje
  o brakach — check akceptuje każdą spójną; komórki tekstowe poza
  checkiem (jawny limit).
- **`requests` w PD.1-P3/E3-A:** świadoma zapowiedź M-EDA (tam pakiet
  wchodzi naprawdę) — testowane jest rozróżnienie `!`/Python, nie
  requests; nie uznawać za przemyt przy przeglądzie M-EDA.
- **Wersja pandas w Colab (research 2026-07-11):** **2.2.2**
  (oficjalne `googlecolab/backend-info`, pip-freeze z 2026-06-25;
  numpy 2.0.2, matplotlib 3.10.0) — notebooki budować i testować pod
  2.2.x; treść pisana warunkowo pod 2.x/3.x pozostaje bez zmian.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie PD.1–PD.7 =
  320–375 słów z blokami kodu, ~300–315 bez nich — w widełkach przy obu
  metodach. Uwaga: PD.6 ~300 słów prozy przy zerowym marginesie
  (precedens F2.1/F2.3) — korekty redakcyjne wymagają ponownego pomiaru.
- **TODO przed ingest 1E.2:**
  1. Budowa 9 notebooków M-PD pod pandas 2.2.x; test zachowania `.plot`
     w komórce z pieczątką.
  2. Seans kontrolny wideo PL (webinar Kodołamacz ~1 h 39 min — do
     wybiórczego obejrzenia; krótki wstęp Analityk edu pl) — metadane
     i składnia zweryfikowane researchem 2026-07-11.
  3. `df["kolumna"].unique()` (pierwsza pomoc poz. 5) — wyłącznie gotowy
     przepis diagnostyczny; potwierdzone przeglądem QG.

## Przebieg QG tego dokumentu (2026-07-11)

Draft → snippety wykonane przez autora w pandas 2.3.3 i 3.0.3 (uv) PRZED
pisaniem treści (wyłapane: różnica dtype `object`/`str` między wersjami —
treść warunkowa; błąd zaokrąglenia w backward completion PD.6 — 91.4 →
91.47) → **2 agentów weryfikacyjnych (Fable 5)**: (1) przegląd zgodności
z ADR-014 z wykonaniem **48/48 checków w OBU wersjach pandas** — ZERO
znalezisk krytycznych; 3 WAŻNE (zapis „dwóch sit" `df[m1][m2]` wywoływał
`UserWarning` o reindeksacji — przepisany na nazwane sita pośrednie +
nowa pozycja 11 pierwszej pomocy; spec PD.8 bez ustalonych nazw obiektów
— pieczątka nie miałaby gdzie patrzeć: dodane `dane_analiza`/`srednie_woj`;
pomiary budżetów wpisane), 5 drobnych — wcielone (m.in. nota inżynierska
weryfikacji „jednego województwa" przez indeksy; E3/E12 do monitoringu
D11; `requests` zadeklarowany jako świadoma zapowiedź M-EDA); pokrycie
R5–R6/R8–R13 z audytu pojemności potwierdzone; werdykt „gotowe po
poprawkach"; (2) research zasobów — URL „10 minutes to pandas" kanoniczny,
dwa polskie wideo (webinar Kodołamacz 2025 + krótki wstęp Analityk edu pl
ze sprawdzonym notebookiem — 0 archaizmów), **Colab = pandas 2.2.2**
(oficjalne backend-info, stan 2026-06-25); kanał z F1–F3 nie ma materiału
o pandas (sprawdzone — ciągłość autora odpada).

## Przebieg QG spłaty długu labów PD.4/PD.8 (2026-07-21)

Dług „lab bez checków" spłacony: PD.4 — Zaliczenie przepisane bez
sprzeczności (po wyborze kolumn `wojewodztwo` w `maz` nie istnieje;
pieczątka porównuje wartości z pełną tabelą); PD.8 — kształt danych
przybity w treści (12 wierszy / 2 braki), widełki `len` 7–12, krok 2
doprecyzowany („zawęź np. do 3 ostatnich lat" — INFO-1; osiągalność
len=7 sprawdzona kombinatorycznie). Kontrakty CHECKS_PD_4/PD_8
w packerze policzone z danych treści i zweryfikowane przez agenta QG
realnym pandas — **GO Z NOTAMI** (0 KRYT / przeliczenia w raporcie QG
sesji 2026-07-21). Nota INFO-5: check C5 PD.4 (`len(maz) ≥ 2`) sprawdza
minimalnie więcej, niż Zaliczenie obiecuje — świadome, nieszkodliwe.

## Przebieg QG notebooków M-PD (2026-07-21, Krok 4 partia 5)

Recenzja adwersaryjna agentem z REALNYM wykonaniem wszystkich komórek
(python3, pandas 2.2.3, matplotlib 3.10.1; Colab ma 2.2.2 — zakres wspólny):
8 notebooków komórka po komórce, pieczątki PD.4/PD.8 na 4 happy path +
17 ścieżkach adwersaryjnych ponad kontrakt-test (31 ścieżek łącznie),
serializacja ładunku (wyłącznie czyste int/bool — zero numpy.int64/bool_),
kombinatoryka decyzji PD.8 (drop=10 / zostaw=12 / zawężenie=9 /
zawężenie+drop=7 — wszystkie wydają token). **Werdykt: GO Z NOTAMI
(0 KRYT / 4 WAŻN / 8 INFO).** Wcielone przed PR-em:

- **WAŻN-1:** pieczątka PD.8 wydawała token za `dane_analiza = df.fillna(0)`
  (anty-wzorzec potępiany w PD.5-P3/E12; payload nieodróżnialny od decyzji
  „zostaw") → nowy lokalny check pochodzenia wierszy: każdy rekord
  `dane_analiza` musi występować w `df` (porównanie multizbiorem rekordów,
  NIEZALEŻNE od indeksu — `reset_index` legalny), celna odmowa nazywa
  fillna po imieniu. Payload bez zmian — parytet z checkami serwerowymi
  C1–C5 zachowany (lokalne zaostrzenie, wzorzec PD.4).
- **WAŻN-2:** kontrakt „tabela wejściowa nietknięta" był tylko kształtowy
  (12 wierszy / 2 braki) — podmiana wartości (`df.loc[0,"wartosc"]=999`)
  przechodziła → dodany odcisk wartości wejścia
  (`sum(wartosc) == 1003.1 ± 0.01`); markdown pieczątki doprecyzowany
  („wartości bez zmian").
- **WAŻN-3:** przykładowe zdanie decyzji w notebooku PD.5 zawierało
  fałszywą liczbę („tracę 25% pomiarów roku 2020" — naprawdę 2/3) →
  przepisane: „2 z 8 wierszy (25% tabeli), oba to pomiary roku 2020 —
  tracę 2 z 3 pomiarów tego roku".
- **WAŻN-4:** hint 3 PD.8 (ten dokument + spakowany JSON) cytował
  „17% roku 2022", a braki notebooka leżą w 2020 i 2021 (rok 2022
  kompletny) — relikt sprzed przybicia kształtu danych → poprawione
  na „2 z 12 wierszy, ~17% tabeli; braki w 2020 i 2021" + repack.
- **INFO-1 wcielone:** diagnoza PD.4 „wartości maz nie pokrywają się"
  wymienia teraz także przestawienie indeksu (reset_index) jako przyczynę.
  Pozostałe INFO (świadomie bez zmian): łagodne akceptacje litery
  kontraktu PD.4 (kolejność kolumn, dublowanie wierszy poza zasięgiem
  luk — spójne z notą INFO-5 QG 2026-07-21); `srednie_woj` liczone na
  `df` przy decyzji drop nieodróżnialne matematycznie (NaN pomijane).

Regresje WAŻN-1/WAŻN-2 przybite w
`tests/unit/ds/notebooks-mpd.contract.test.ts` (scenariusze fillna
i podmiany wartości). Kontrakt-test po poprawkach: 21/21; strażnik
składni pieczątek: zielony.
