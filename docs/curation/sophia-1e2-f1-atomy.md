# 1E.2 · Moduł F1 „Python I — podstawy języka" — treść atomów

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z wykonaniem 62/62 checków Pythona
+ research zasobów PL; znaleziska wcielone — przebieg na końcu dokumentu); przed
ingest 1E.2 pozostają TODO z notatek (notebooki F1, seans wideo,
potwierdzenie modelowania pozycji przy spec JSON).
**Podstawa:** ADR-014 — D1 (atom 300–600 słów, 3 MC z dystraktorami
diagnostycznymi i feedbackiem per opcja, WE przed retrieval, 1 koncept =
1 atom), D3 (zaliczenie per typ; egzamin 15–20 pytań, próg licznikowy,
pytania egzaminacyjne kalibrowane OSOBNO — wyższy success rate), D5 (drabinki
3-stopniowe wszędzie — pkt 13; completion problems; fading backward w module;
pierwsza pomoc per moduł), D6 (retrieval, spacing — ≤4 koncepty kluczowe
tagowane przy autoringu; mity liczbowe zakazane), D6.5 (siedem reguł
redakcyjnych). Prerekwizyt: **moduł L0 zaliczony** (student umie: uruchomić
komórkę, zrobić kopię, zna zmienną/`print`/sesję — `sophia-1e2-l0-atomy.md`).
**Format:** treść merytoryczna w markdownie; spec JSON pod ingest przy PR-2.

---

## Zasady modułu F1 (różnice względem L0)

- **Zaliczenie atomów F1.1–F1.3 i F1.5–F1.6 (typ `exercise`):** wszystkie
  3 pytania odpowiedziane poprawnie — licznik, nie procent (M10);
  nielimitowane próby, feedback natychmiastowy, błąd nigdy nie jest stanem
  końcowym (R13). To NORMALNE atomy — inaczej niż checklisty L0.
- **Zaliczenie labów F1.4 i F1.7 (typ `lab`):** przez WYKONANIE w Colab —
  mechanizm „komórka-pieczątka + token" przejęty 1:1 z L0 (deterministyczny,
  0 LLM, bez sandboxa; limity mechanizmu zadeklarowane w L0 obowiązują).
- **Praca w Colab:** każdy atom ma notebook towarzyszący (kopiuj na Dysk jak
  w L0.2); WE i pytania „przewidź wynik" student może sprawdzać uruchomieniem.
- **Fading backward w skali modułu (C5):** F1.1–F1.2 pełne WE → F1.3
  completion (luka na końcu WE) → F1.4 lab-completion (szkielet z lukami) →
  F1.5 luki w środku → F1.6 backward completion (student pisze POCZĄTEK) →
  F1.7 lab samodzielny (tylko specyfikacja). Fading adaptacyjny (pkt 5)
  moduluje to per student regułami z `curriculum_item_answers`.
- **Koncepty kluczowe modułu (≤4, tagowane pod spacing spiralny — D6.3):**
  `typ-wartosci` (F1.1), `wyrazenie-obliczenie` (F1.2), `porownanie-bool`
  (F1.5), `decyzja-if-else` (F1.6). F1.3 (`f-string-budowanie-tekstu`) —
  koncept zwykły, utrwalany labami.
- **Przegląd przed egzaminem (D6.3, czysty reuse — 0 nowego autoringu):**
  zestaw z istniejących pytań atomowych: L0.3-P2, L0.4-P1/P2/P3, F1.1-P3,
  F1.2-P2, F1.3-P2, F1.5-P1/P3, F1.6-P1/P2 (11 pytań; konfiguracja pozycji,
  nie nowa treść).
- **Egzamin F1:** 15 pytań × 2 warianty izomorficzne, **próg: ≤1 błąd**
  (≈93%, spójne z widełkami „≈90%" z D3 dla 15 pytań); po 2. oblaniu
  correctives ≤3 atomów wskazanych per błędne pytanie. Pytania kalibrowane
  ŁATWIEJ niż atomowe (bliżej WE — D3); pełny bank na końcu dokumentu.
- **Dane wejściowe programów:** w F1 świadomie BEZ `input()` — „danymi
  wejściowymi" są zmienne na górze skryptu (jawnie tak nazywane); interakcja
  wejdzie w F2. Zakres pkt 9 bez zmian: zero Gita/terminala/instalacji.

---

## Atom F1.1 — Każda wartość ma typ

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`typ-wartosci` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Rozpoznasz trzy podstawowe typy wartości w Pythonie — liczbę całkowitą,
liczbę z ułamkiem i tekst — i sprawdzisz typ dowolnej wartości poleceniem
`type(...)`.

### Teoria

W L0.4 rozdzieliliśmy liczbę `12` od tekstu `"12"`. Dziś ta sama myśl
w pełnej wersji: **każda wartość w Pythonie ma swój typ**, a typ decyduje,
co z wartością można zrobić. Na liczbach się liczy, tekstów się nie podzieli.

Trzy typy, które wystarczą na długo:

- **`int`** (od ang. *integer*) — liczba całkowita: `12`, `0`, `-5`. Dobra do
  liczenia sztuk, dni, punktów — wszystkiego, co się nie dzieli.
- **`float`** (ang. „zmiennoprzecinkowa") — liczba z częścią ułamkową:
  `12.5`, `0.1`. Dobra do cen, wag, temperatur. Uwaga: Python używa
  **kropki**, nie przecinka — `12,5` to NIE jest jedna liczba.
- **`str`** (od ang. *string*, „napis") — tekst w cudzysłowie: `"Ala"`,
  `"12"`. Wszystko w cudzysłowie jest tekstem, nawet jeśli wygląda jak liczba.

Jedno doprecyzowanie do obrazka „pudełka" z L0: **typ ma wartość, nie
pudełko**. Ta sama zmienna może dziś trzymać `int`, a po następnym
przypisaniu tekst — `type(cena)` mówi o tym, co jest w środku TERAZ.
W praktyce lepiej z tej swobody nie korzystać: trzymaj w jednym pudełku
jeden rodzaj wartości, a Twój kod pozostanie przewidywalny.

Typ wartości można sprawdzić poleceniem `type(...)` — podajesz wartość
w nawiasie, a odpowiedź wypisujesz printem, w parze: `print(type(cena))`.
Zobacz worked example:

```python
cena = 12          # liczba całkowita
waga = 0.5         # liczba z kropką — część ułamkowa
nazwa = "jabłko"   # tekst w cudzysłowie
print(type(cena))  # sprawdź typ wartości spod nazwy: cena
print(type(waga))
print(type(nazwa))
```

**Przewidź, zanim uruchomisz:** które z trzech linijek `print` wypiszą co?

Wynik:

```
<class 'int'>
<class 'float'>
<class 'str'>
```

Zapis `<class 'int'>` czytaj po prostu: „to jest int". Słowo *class* wyjaśnimy
dużo później — na razie liczy się nazwa typu w środku.

Po co Ci to? Bo typ przesądza o zachowaniu. `12 + 1` daje `13`, ale
`"12" + 1` kończy się błędem `TypeError` — Python odmawia dodania liczby do
tekstu, bo nie wie, czy chcesz liczyć, czy sklejać. Gdy widzisz `TypeError`,
niemal zawsze jakaś wartość ma inny typ, niż zakładasz — a `type(...)` jest
narzędziem, którym to sprawdzasz. Reguła z L0.4 „licz bez cudzysłowu" to był
właśnie typ w przebraniu: cudzysłów robi `str`, kropka robi `float`, goła
liczba to `int`.

### Pytania (retrieval — zaliczenie: wszystkie poprawnie, nielimitowane próby)

**P1. Jakiego typu jest wartość `"3.14"` (dokładnie tak zapisana)?**

- A. `float` — bo ma kropkę — *Nie — kropka byłaby argumentem, gdyby nie
  cudzysłów. Cudzysłów wygrywa: wszystko w cudzysłowie to tekst.* (diagnoza:
  patrzy na zawartość, nie na zapis)
- B. **`str` — cudzysłów robi z tego tekst** ✓ — *Tak. `"3.14"` tylko WYGLĄDA
  jak liczba; dla Pythona to napis, jak `"Ala"`.*
- C. `int` — bo to liczba — *Nie — po pierwsze cudzysłów robi tekst; po drugie
  nawet bez cudzysłowu `3.14` byłoby typu `float`, bo ma część ułamkową.*
  (diagnoza: podwójne pomieszanie — cudzysłów i podział int/float)
- D. Python sam zdecyduje przy pierwszym użyciu — *Nie — typ jest znany od
  razu z zapisu: cudzysłów → `str`, kropka → `float`, goła liczba całkowita →
  `int`. Nic nie zależy od „użycia później".* (diagnoza: magiczne myślenie
  o „domyślaniu się" komputera)

**P2. Chcesz zapisać pod nazwą `temperatura` wartość dwanaście i pół stopnia.
Który zapis jest poprawny?**

- A. `temperatura = 12,5` — *Nie — przecinek nie łączy tu liczby w całość;
  w Pythonie część ułamkową oddziela KROPKA.* (diagnoza: przenosi polską
  notację dziesiętną)
- B. `temperatura = "12.5"` — *Prawie — zapis jest legalny, ale cudzysłów robi
  TEKST: na `"12.5"` nie policzysz, np. nie porównasz z inną temperaturą bez
  kłopotów.* (diagnoza: cudzysłów „na wszelki wypadek")
- C. **`temperatura = 12.5`** ✓ — *Tak — kropka dziesiętna, bez cudzysłowu:
  liczba typu `float`, gotowa do obliczeń.*
- D. `temperatura = 12.5 stopnia` — *Nie — jednostka to nie część liczby;
  Python zgłosi `SyntaxError`. Jednostkę trzymaj w nazwie (`temperatura_c`)
  albo w tekście przy wypisywaniu.* (diagnoza: miesza notację z zeszytu
  z kodem)

**P3. Komórka: `print(type("7"))`. Co się wypisze?**

- A. `<class 'int'>` — *Nie — cudzysłów wokół `7` robi tekst; `type` odpowiada
  na pytanie o ZAPIS wartości, a zapisano napis.* (diagnoza: ignoruje
  cudzysłów przy „oczywistej liczbie")
- B. **`<class 'str'>`** ✓ — *Tak — `"7"` to tekst; wynik czytamy „to jest
  str".*
- C. 7 — *Nie — `type(...)` nie wypisuje wartości, tylko jej typ; wartość
  wypisałby zapis `print("7")`.* (diagnoza: myli sprawdzanie typu
  z wypisywaniem wartości)
- D. `TypeError` — *Nie — błędu nie ma: pytać o typ można każdą wartość.
  `TypeError` pojawia się, gdy próbujesz zrobić z wartością coś, na co jej
  typ nie pozwala (np. `"7" + 1`).* (diagnoza: kojarzy słowo „type" wyłącznie
  z błędem)

### Drabinka hintów (do pytań i pracy w notebooku)

1. **Koncepcyjny:** Rozstrzygaj W TEJ kolejności: (1) jest cudzysłów? → `str`,
   koniec. (2) Nie ma — jest kropka? → `float`. (3) Nie ma ani jednego →
   `int`. Zawartość (czy „wygląda jak liczba") nie ma znaczenia — liczy się
   zapis.
2. **Szkielet:** W notebooku F1.1 masz komórkę-brudnopis: wpisz
   `print(type(TU_WSTAW_WARTOŚĆ))`, podstaw wartość z pytania i uruchom —
   Python sam odpowie, jaki to typ. Porównaj z regułą z hintu 1.
3. **Pełne rozwiązanie z objaśnieniem:** `"3.14"` i `"7"` mają cudzysłów →
   obie `str` (krok 1 reguły; kropka w `"3.14"` jest częścią NAPISU, nie
   liczby). `12.5` bez cudzysłowu, z kropką → `float` (krok 2). `12,5`
   z przecinkiem nie jest jedną wartością — Python czyta to jako DWIE rzeczy
   rozdzielone przecinkiem, stąd polska notacja dziesiętna nie działa.
   `12.5 stopnia` łamie składnię: po wartości nie może stać gołe słowo —
   `SyntaxError`.

---

## Atom F1.2 — Wyrażenie: Python liczy, zanim wypisze

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`wyrazenie-obliczenie` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Przewidzisz wynik wyrażenia arytmetycznego z nawiasami i poznasz dwie
niespodzianki dzielenia: wynik z kropką i błąd dzielenia przez zero.

### Teoria

Zapis w rodzaju `cena * dni` z L0.4 to **wyrażenie** — fragment kodu, który
Python najpierw OBLICZA do pojedynczej wartości, a dopiero potem robi z nią
coś dalej (wypisuje, zapamiętuje pod nazwą). Ta kolejność — „policz wyrażenie,
potem użyj wyniku" — to serce dzisiejszego atomu.

Działania masz cztery: `+`, `-`, `*` (mnożenie) i `/` (dzielenie — ukośnik).
Kolejność jak w matematyce: mnożenie i dzielenie przed dodawaniem
i odejmowaniem; działania równej rangi idą od lewej do prawej, a **nawiasy
wygrywają ze wszystkim**. Gdy masz wątpliwość, po prostu dodaj nawiasy —
nadmiarowe nawiasy niczego nie psują, a czytelność podnoszą.

Worked example — rachunek za wspólną pizzę:

```python
pizza = 48                    # cena pizzy w zł
dostawa = 6                   # dowóz w zł
osoby = 3
skladka = (pizza + dostawa) / osoby   # nawias: NAJPIERW suma, potem dzielenie
print(skladka)
```

**Przewidź:** co wypisze `print(skladka)`? I pytanie pomocnicze: co wyszłoby
BEZ nawiasu, z zapisu `pizza + dostawa / osoby`?

Wynik: `18.0`. Bez nawiasu byłoby `50.0` — dzielenie wykonuje się przed
dodawaniem, więc Python policzyłby `dostawa / osoby` = 2.0 i dodał do 48.
Nawias zmienia sens rachunku, nie tylko wygląd.

Dwie niespodzianki dzielenia, obie warte zapamiętania:

1. **`/` zawsze daje `float`** — nawet gdy wynik jest „okrągły". `54 / 3` to
   `18.0`, nie `18`. Stąd kropka w wyniku powyżej — to nie usterka, to typ
   wyniku (poznajesz go po kropce — atom F1.1 w akcji). Do `18.0` odnoś się
   jak do zwykłego 18: kropka informuje o typie, wartości nie zmienia.
2. **Dzielenia przez zero Python odmawia** — komunikat
   `ZeroDivisionError: division by zero`. Czytasz go metodą z L0.3: ostatnia
   linia, przed dwukropkiem rodzaj problemu, po dwukropku konkret. Taki błąd
   niemal zawsze znaczy, że zmienna w mianowniku ma wartość 0, choć miała
   mieć inną — sprawdź, co naprawdę siedzi w zmiennych.

Na koniec domknięcie myśli z celu: wyrażenie może stać wszędzie tam, gdzie
stoi wartość — `print((pizza + dostawa) / osoby)` policzy i wypisze w jednej
linii, bez zmiennej `skladka`. Zmienna pośrednia to Twój wybór dla
czytelności, nie wymóg Pythona.

### Pytania (retrieval)

**P1. Co wypisze `print(10 + 20 / 2)`?**

- A. 15.0 — *Nie — 15 wyszłoby z `(10 + 20) / 2`, ale nawiasu tu NIE MA:
  dzielenie wykonuje się pierwsze, więc liczy się `10 + 10.0`.* (diagnoza:
  czyta od lewej do prawej, ignorując pierwszeństwo działań)
- B. **20.0** ✓ — *Tak — najpierw `20 / 2` = `10.0`, potem `10 + 10.0`;
  kropka, bo w rachunku wzięło udział dzielenie.*
- C. 20 — *Prawie — wartość się zgadza, ale dzielenie `/` zawsze daje liczbę
  z kropką, więc wynik to `20.0`.* (diagnoza: pomija regułę „`/` daje
  `float`")
- D. `SyntaxError` — *Nie — to poprawne wyrażenie; dwa działania w jednej
  linii są w porządku, Python zna ich kolejność.* (diagnoza: niepewność
  „czy tak w ogóle wolno" zamiast reguły pierwszeństwa)

**P2. Rachunek `48 + 6 / 3` daje 50.0, a chcesz podzielić CAŁOŚĆ rachunku
przez 3. Co robisz?**

- A. Zamieniam kolejność: `6 / 3 + 48` — *Nie — to ten sam rachunek w innym
  szyku; dzielenie nadal dotyczy tylko szóstki.* (diagnoza: myli kolejność
  zapisu z kolejnością działań)
- B. **Dodaję nawias: `(48 + 6) / 3`** ✓ — *Tak — nawias wymusza „najpierw
  suma", dzielenie dostaje całość: 18.0.*
- C. Piszę dzielenie w nowej linii — *Nie — nowa linia to nowa instrukcja,
  a stara suma nie jest nigdzie zapamiętana; wewnątrz JEDNEGO wyrażenia
  kolejność ustawia się nawiasami.* (diagnoza: szuka rozwiązania w układzie
  wierszy zamiast w składni wyrażenia)
- D. Używam `*` zamiast `/`, bo dzielenie jest niepewne — *Nie — dzielenie
  jest w pełni przewidywalne; problemem była kolejność działań, a tę załatwia
  nawias.* (diagnoza: unik zamiast diagnozy)

**P3. Skrypt: `koszty = 120`, `osoby = 0`, `print(koszty / osoby)`.
Co się stanie?**

- A. Wypisze 0 — *Nie — dzielenie PRZEZ zero to nie zero; Python w ogóle nie
  ma jak policzyć takiego rachunku i zgłasza błąd.* (diagnoza: myli
  `0 / x` z `x / 0`)
- B. Wypisze `nieskończoność` — *Nie — Python nie wstawia tu żadnej wartości
  zastępczej: zatrzymuje się z komunikatem błędu.* (diagnoza: przenosi
  szkolną intuicję granicy)
- C. **Zatrzyma się z `ZeroDivisionError: division by zero`** ✓ — *Tak —
  a w praktyce taki błąd czytaj jako podpowiedź: zmienna `osoby` ma zero,
  choć pewnie miała mieć co innego.*
- D. Poprosi o inną wartość `osoby` — *Nie — Python niczego nie dopyta: skrypt
  po prostu zatrzymuje się na błędzie; poprawa wartości to Twój ruch.*
  (diagnoza: oczekuje interaktywnego „opiekuna" w języku)

### Drabinka hintów

1. **Koncepcyjny:** Licz jak Python, na kartce, w dwóch przejściach: najpierw
   WSZYSTKIE `*` i `/` (od lewej), dopiero potem `+` i `-`. Nawias liczysz
   przed wszystkim. Jeśli w rachunku wystąpiło `/`, dopisz wynikowi kropkę.
2. **Szkielet:** Rozpisz `10 + 20 / 2` po kroku: podkreśl `20 / 2`, zastąp
   wynikiem (`10.0`), zostaje `10 + 10.0` — policz. Ten sam zabieg zrób dla
   wersji z nawiasem: podkreśl `(10 + 20)`, zastąp, potem dziel. W notebooku
   F1.2 komórka-brudnopis czeka na sprawdzenie obu wersji.
3. **Pełne rozwiązanie z objaśnieniem:** `10 + 20 / 2` → krok 1: `20 / 2` =
   `10.0` (dzielenie przed dodawaniem, wynik z kropką, bo to `/`); krok 2:
   `10 + 10.0` = `20.0`. Wersja z nawiasem: `(10 + 20)` = `30`, potem
   `30 / 2` = `15.0`. Dzielenie przez zero: Python nie zgaduje i nie wstawia
   nieskończoności — `ZeroDivisionError` zatrzymuje skrypt w tej linii;
   szukasz wtedy, SKĄD w mianowniku wzięło się zero (najczęściej: zmienna
   ustawiona wyżej na 0 albo nadpisana po drodze).

---

## Atom F1.3 — Budowanie tekstu z wartości: f-string

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`f-string-budowanie-tekstu` · **Krok fadingu:** completion (luka na końcu WE)

### Cel

Zbudujesz jeden czytelny komunikat z tekstu i wartości zmiennych — f-stringiem
— zamiast wypisywać każdą rzecz osobnym `print`.

### Teoria

Twoje skrypty z L0.4 wypisywały etykietę i wynik DWOMA printami:
`print("Kawa miesięcznie, zł:")`, potem `print(koszt)`. Działa, ale wynik
czyta się jak telegram. Chcemy jednego zdania: „Kawa kosztuje mnie 360 zł
miesięcznie". Do tego służy **f-string** — tekst z okienkami na wartości.

Przepis: przed cudzysłowem otwierającym stawiasz literę `f`, a w środku
tekstu — **nawiasy klamrowe `{}`** z nazwą zmiennej. Python podmienia każdą
klamrę na aktualną wartość:

```python
kawa = 12
dni = 30
koszt = kawa * dni
print(f"Kawa kosztuje mnie {koszt} zł miesięcznie.")  # f przed cudzysłowem!
```

**Przewidź:** co dokładnie się wypisze? Gdzie w wyniku będą klamry?

Wynik: `Kawa kosztuje mnie 360 zł miesięcznie.` — klamry znikają, w ich
miejsce wchodzi wartość. Litera `f` pochodzi od *format* — „tekst
formatowany". Trzy reguły, które załatwiają większość kłopotów:

1. **Litera `f` jest obowiązkowa.** Bez niej klamry to zwykłe znaki: zapis
   `print("...{koszt}...")` wypisze dosłownie `{koszt}`. To najczęstsza
   pomyłka — jeśli widzisz klamry w wyniku, brakło `f`.
2. **W klamrze może stać całe wyrażenie**, nie tylko nazwa:
   `f"Dziennie: {koszt / 30} zł"` policzy i wstawi wynik (atom F1.2 w akcji).
3. **W klamrze wolno wstawić liczbę do tekstu** — f-string sam zamieni ją na
   napis. To legalne obejście reguły z F1.1: `"tekst" + koszt` to
   `TypeError`, ale `f"tekst {koszt}"` działa. Sklejanie plusem zostaw na
   sklejanie dwóch TEKSTÓW.

Klamer w jednym tekście może być dowolnie wiele, a w klamrach mogą stać także
zmienne tekstowe: `f"{imie}, wydasz {koszt} zł"` podmieni obie. Jedno zdanie
zamiast telegramu z trzech printów — o to chodziło w celu atomu.

Ostatni szczegół, o który łatwo się potknąć: spacje w wyniku pochodzą
WYŁĄCZNIE z tekstu, nie z klamer. `f"Masz{lat} lat"` skleja się w `Masz30
lat` — zabrakło spacji przed klamrą. Gdy wynik wygląda na „zlepiony",
sprawdź odstępy wokół klamer w tekście.

Worked example z luką (completion — uzupełnij i sprawdź w notebooku F1.3):

```python
przejazdy = 8
bilet = 4
tydzien = przejazdy * bilet
print(f"Bilety kosztują mnie {______} zł na tydzień.")   # luka: co w klamrze?
```

Do luki pasuje zarówno `tydzien`, jak i całe `przejazdy * bilet` — reguła 2.
Wybierz nazwę, gdy wynik już policzono; wyrażenie, gdy potrzebne jednorazowo.

### Pytania (retrieval)

**P1. `imie = "Ola"`. Co wypisze `print("Cześć, {imie}!")` — bez litery `f`?**

- A. Cześć, Ola! — *Nie — podmiana działa tylko w f-stringu; tu cudzysłów
  otwiera zwykły tekst, więc klamry są zwykłymi znakami.* (diagnoza: uważa
  klamry za magiczne same z siebie)
- B. **Cześć, {imie}!** ✓ — *Tak — bez `f` żadnej podmiany nie ma: wypisuje
  się dosłownie to, co w cudzysłowie, z klamrami włącznie.*
- C. `SyntaxError` — *Nie — to poprawny, choć pewnie niezamierzony kod: zwykły
  tekst z klamrami w środku. Python nie zgadnie, że chodziło o f-string.*
  (diagnoza: oczekuje, że język wykryje intencję)
- D. Cześć, imie! — *Nie — nic nie „odklamrowuje" nazwy: bez `f` klamry
  zostają w wyniku razem z nazwą.* (diagnoza: półreguła — wie, że coś się
  podmienia, nie wie kiedy)

**P2. `cena = 250`. Chcesz wypisać dokładnie: `Rower kosztuje 250 zł`.
Który zapis zadziała?**

- A. `print("Rower kosztuje " + cena + " zł")` — *Nie — plus skleja tylko
  teksty, a `cena` to liczba: `TypeError`. Do mieszania tekstu z liczbą
  służy f-string.* (diagnoza: sklejanie plusem jako uniwersalne)
- B. `print(f"Rower kosztuje cena zł")` — *Nie — jest `f`, ale nie ma KLAMRY:
  `cena` bez klamry to zwykłe słowo w tekście, wypisze się dosłownie.*
  (diagnoza: `f` jako zaklęcie, klamra zapomniana)
- C. **`print(f"Rower kosztuje {cena} zł")`** ✓ — *Tak — `f` włącza podmianę,
  klamra wskazuje, co podmienić; liczba wchodzi do tekstu bez protestu.*
- D. `print("Rower kosztuje {cena} zł")` — *Nie — klamra jest, ale bez `f`
  zostanie w wyniku dosłownie: `Rower kosztuje {cena} zł` (pytanie P1
  w akcji).* (diagnoza: lustrzane odbicie błędu z B)

**P3. `sztuki = 3` i `cena = 20`. Co wypisze
`print(f"Razem: {sztuki * cena} zł")`?**

- A. Razem: {sztuki * cena} zł — *Nie — litera `f` JEST, więc klamra się
  podmienia; dosłowne klamry zostają tylko bez `f`.* (diagnoza: nie
  dostrzega `f` / odwrócona reguła P1)
- B. Razem: 3 * 20 zł — *Nie — w klamrze stoi wyrażenie, a wyrażenie Python
  najpierw LICZY (F1.2), dopiero wynik wstawia do tekstu.* (diagnoza:
  podmiana „tekstowa" zamiast obliczenia)
- C. **Razem: 60 zł** ✓ — *Tak — klamra z wyrażeniem: policz `3 * 20`, wstaw
  `60`, reszta tekstu bez zmian.*
- D. `TypeError` — bo tekst miesza się z liczbą — *Nie — to właśnie f-string
  robi legalnie: wynik klamry sam zamienia się na napis. `TypeError` groziłby
  przy sklejaniu plusem.* (diagnoza: reguła F1.1 nadgorliwie przeniesiona na
  f-string)

### Drabinka hintów

1. **Koncepcyjny:** Checklist f-stringa jest dwupunktowy: (1) litera `f`
   PRZED cudzysłowem, (2) klamra `{}` wokół każdej rzeczy do podmiany.
   Zabrakło (1) → klamry widać w wyniku; zabrakło (2) → nazwa wypisuje się
   jako słowo. Wynik czytasz tak: tekst zostaje, klamry znikają, w ich miejsce
   wchodzą obliczone wartości.
2. **Szkielet:** Uzupełnij w notebooku F1.3 komórkę
   `print(f"Bilety kosztują mnie {_luka_} zł na tydzień.")` — w miejsce
   `_luka_` postaw najpierw nazwę `tydzien`, uruchom; potem podmień lukę na
   wyrażenie `przejazdy * bilet`, uruchom znowu. Wynik ma być identyczny —
   zobacz na własne oczy regułę „klamra przyjmuje i nazwę, i wyrażenie".
3. **Pełne rozwiązanie z objaśnieniem:**
   `print(f"Bilety kosztują mnie {tydzien} zł na tydzień.")` — albo
   z wyrażeniem: `print(f"Bilety kosztują mnie {przejazdy * bilet} zł na
   tydzień.")`. Obie wersje wypisują `Bilety kosztują mnie 32 zł na tydzień.`
   Rozstrzyganie pytań P1–P3 jedną regułą: jest `f` i jest klamra → podmiana
   (wyrażenie najpierw policzone); jest klamra bez `f` → klamra dosłownie
   w wyniku; jest `f` bez klamry → słowo dosłownie w tekście; plus między
   tekstem a liczbą → `TypeError` (plusem sklejaj wyłącznie teksty).

---

## Atom F1.4 — LAB „Paragon" (typy + wyrażenia + f-string w jednym programie)

**Typ:** `lab` · **Czas studenta:** ~20 min · **Koncepty ćwiczone:**
`typ-wartosci`, `wyrazenie-obliczenie`, `f-string-budowanie-tekstu` ·
**Krok fadingu:** completion — szkielet z lukami

### Cel

Złożysz z klocków F1.1–F1.3 pierwszy program, który wygląda jak produkt:
paragon zakupów z policzonymi kwotami, wypisany trzema czytelnymi zdaniami.

### Zadanie (notebook F1.4 — skopiuj na Dysk, uzupełnij luki, uruchom)

Szkielet w notebooku:

```python
# --- dane wejściowe programu (w F1 "wejściem" są zmienne na górze) ---
produkt = "chleb"
cena = 5.50          # cena za sztukę, zł
sztuki = 3

# --- obliczenia ---
razem = ______              # luka 1: kwota za wszystkie sztuki
srednio_dziennie = ______   # luka 2: ile to dziennie przy 30 dniach

# --- paragon ---
print(f"Kupuję: {produkt}, {sztuki} szt. po {cena} zł")
print(f"Razem: {______} zł")            # luka 3: co w klamrze?
print(f"W skali dnia: {srednio_dziennie} zł")
```

Wymagania: luka 1 to wyrażenie z `*`; luka 2 — wyrażenie z `/` (zauważ kropkę
w wyniku — wiesz z F1.2, skąd się bierze); luka 3 — nazwa albo wyrażenie
(reguła 2 z F1.3). Po uzupełnieniu uruchom całość i przeczytaj swój paragon.
Potem podmień dane wejściowe na własne zakupy i uruchom ponownie — program ma
policzyć wszystko sam, bez zmian poniżej linii „obliczenia".

**Zaliczenie:** komórka-pieczątka (mechanizm z L0): sprawdza deterministycznie,
że `razem` i `srednio_dziennie` istnieją i spełniają relacje
`razem == cena * sztuki` oraz `srednio_dziennie == razem / 30` dla bieżących
danych wejściowych — i wtedy liczy token z kodu atomu. Jawny limit (klasa
limitów z L0): relacje da się spełnić także ręcznie policzonymi stałymi —
to świadome oszustwo, które szkodzi tylko oszukującemu; check mierzy
wykonanie, nie drogę dojścia.

### Drabinka hintów

1. **Koncepcyjny:** Każda luka to jedno z Twoich narzędzi: luka 1 — mnożenie
   dwóch zmiennych (jak `kawa * dni` w L0.4); luka 2 — dzielenie świeżo
   policzonej wartości; luka 3 — f-stringowa klamra przyjmie nazwę `razem`
   albo całe wyrażenie. Nie wpisuj gotowych liczb — paragon ma się przeliczać
   sam po zmianie danych.
2. **Szkielet:** luka 1: `cena * ______`; luka 2: `razem / ______`; luka 3:
   nazwa zmiennej z sekcji „obliczenia", ta sama, którą właśnie policzyła
   luka 1.
3. **Pełne rozwiązanie z objaśnieniem:** luka 1: `cena * sztuki` (5.50 · 3 =
   16.5 — float, bo `cena` ma kropkę); luka 2: `razem / 30` (0.55 — wynik
   z kropką: dzielenie ZAWSZE daje float); luka 3: `razem` (albo `cena * sztuki` —
   identyczny wynik, reguła „klamra przyjmuje nazwę i wyrażenie"). Jeśli
   pieczątka odmawia tokenu, a paragon wygląda dobrze — najczęściej
   zmieniłeś(-aś) dane wejściowe i nie uruchomiłeś(-aś) PONOWNIE komórki
   obliczeń: w pamięci sesji siedzą stare wartości (mechanizm z L0.3).
   Uruchom komórki od góry i spróbuj jeszcze raz.

---

## Atom F1.5 — Porównanie: pytanie, na które odpowiedź brzmi True albo False

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`porownanie-bool` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Zapiszesz porównanie dwóch wartości i przewidzisz jego wynik — `True` albo
`False` — oraz odróżnisz porównanie `==` od przypisania `=`.

### Teoria

Programy z F1.4 zawsze robią to samo. Żeby program mógł ZDECYDOWAĆ (następny
atom), musi najpierw umieć zadać pytanie. Pytanie zapisuje się jako
**porównanie**:

```python
budzet = 50
cena = 65
print(cena > budzet)    # pytanie: czy cena przekracza budżet?
```

**Przewidź:** co wypisze ta komórka?

Wynik: `True`. Porównanie to wyrażenie jak każde inne (F1.2): Python je
OBLICZA, a wynikiem jest wartość specjalnego typu **`bool`** — jedna z dwóch:
`True` (prawda) albo `False` (fałsz). Pisane wielką literą, bez cudzysłowu —
to wartości, nie teksty.

Znaki porównań: `>` (większe), `<` (mniejsze), `>=` i `<=` (większe/mniejsze
lub równe), `==` (równe), `!=` (różne). Dwuznaki pisz zawsze w tej
kolejności — najpierw kierunek, potem równość: zapis `=<` to błąd składni.
Dwa znaki wymagają szczególnej uwagi:

- **`==` to porównanie, `=` to przypisanie.** Jeden znak robi, drugi znak
  PYTA. `cena = 65` wkłada wartość do pudełka; `cena == 65` pyta „czy
  w pudełku jest 65?" i zwraca `True`/`False`. Pomyłka w tę stronę jest tak
  częsta, że gdy napiszesz `=` w nagłówku pytania (następny atom), Python
  wprost podpowie w komunikacie: `Maybe you meant '==' …?` („może chodziło
  o ==?").
- **`!=` czytaj „różne od”.** Wykrzyknik neguje: `cena != 65` to `True`
  dokładnie wtedy, gdy `cena == 65` jest `False`.

Porównywać można też teksty — `==` i `!=` działają na nich tak samo:
`"kot" == "kot"` to `True`. Pamiętaj tylko, że dla Pythona wielkość liter ma
znaczenie: `"Kot" == "kot"` to `False`, bo to różne napisy. Porównania
tekstu z liczbą unikaj — `"7" == 7` da `False`, nie błąd, i łatwo się na tym
przejechać (typy z F1.1 znów w akcji).

Worked example z lukami w środku (uzupełnij w myślach, sprawdź w notebooku
F1.5):

```python
wiek = 17
print(wiek >= 18)      # pełnoletność? → False
print(wiek ____ 17)    # luka A: jaki znak da True, pytając "równe"?
print(wiek ____ 20)    # luka B: jaki znak da True, pytając "różne od"?
```

Luka A: `==` (w pudełku jest 17 → `True`). Luka B: `!=` (17 różne od 20 →
`True`). Zauważ, że porównywać można też zmienną ze zmienną (`cena > budzet`)
— po obu stronach znaku stoją wyrażenia, a Python najpierw liczy strony,
potem porównuje wyniki.

### Pytania (retrieval)

**P1. `saldo = 100`. Co wypisze `print(saldo == 200)`?**

- A. 200 — *Nie — `==` niczego nie wkłada do pudełka: to pytanie „czy równe?",
  a odpowiedzią jest True/False.* (diagnoza: czyta `==` jak przypisanie)
- B. `True` — *Nie — w pudełku `saldo` jest 100, a pytanie brzmi „czy tam jest
  200?"; odpowiedź brzmi: nie.* (diagnoza: zgaduje wynik bez sprawdzenia
  wartości)
- C. **`False`** ✓ — *Tak — 100 nie równa się 200; porównanie obliczyło się
  do wartości `False` i ją wypisano.*
- D. `SyntaxError` — *Nie — `==` w `print(...)` jest w pełni legalne;
  błędem skończyłby się pojedynczy `=` w tym miejscu.* (diagnoza: pamięta, że
  „coś z równościami w print nie działa", ale nie pamięta co)

**P2. Chcesz SPRAWDZIĆ, czy `haslo` ma wartość `"smok"` — nie zmieniając
niczego. Który zapis?**

- A. `haslo = "smok"` — *Nie — pojedynczy `=` PRZYPISZE: od tej linii hasło
  NA PEWNO jest smokiem, bo właśnie je nadpisałeś(-aś). Pytanie zadaje `==`.*
  (diagnoza: kluczowa pułapka atomu — przypisanie zamiast porównania)
- B. **`haslo == "smok"`** ✓ — *Tak — podwójny znak pyta i zwraca
  `True`/`False`, wartość w pudełku zostaje nietknięta.*
- C. `haslo != "smok"` — *Blisko, ale odwrotnie — to pytanie „czy RÓŻNE od
  smoka?": dostaniesz `True`, gdy hasło się NIE zgadza.* (diagnoza: myli
  kierunek negacji)
- D. `"haslo" == "smok"` — *Nie — cudzysłów wokół `haslo` porównuje dosłowne
  SŁOWO „haslo" ze słowem „smok" (zawsze `False`), zamiast zajrzeć do
  zmiennej.* (diagnoza: cudzysłów odbiera nazwie rolę zmiennej — F1.1
  w akcji)

**P3. `cena = 65` i `budzet = 50`. Co wypisze
`print(cena - 20 <= budzet)`?**

- A. `False` — *Nie — po lewej stoi wyrażenie i Python NAJPIERW je liczy:
  `65 - 20` to 45, a dopiero potem pyta „45 ≤ 50?".* (diagnoza: porównuje
  surowe `cena` z budżetem, ignorując obliczenie strony)
- B. **`True`** ✓ — *Tak — najpierw arytmetyka strony lewej (45), potem
  porównanie: 45 ≤ 50 to prawda.*
- C. 45 — *Nie — 45 to tylko półprodukt; ostatnim działaniem jest porównanie,
  więc wynikiem całości jest `True`/`False`.* (diagnoza: zatrzymuje się po
  arytmetyce, gubi porównanie)
- D. `TypeError` — *Nie — po obu stronach są liczby, wszystko legalne;
  `TypeError` groziłby przy porównywaniu liczby z tekstem.* (diagnoza:
  błąd-dyżurny zamiast policzenia)

### Drabinka hintów

1. **Koncepcyjny:** Porównanie licz w dwóch krokach, jak Python: (1) policz
   OBIE strony znaku do pojedynczych wartości (to zwykłe wyrażenia z F1.2);
   (2) odpowiedz na pytanie znaku: `True` albo `False`. I mantra atomu: jeden
   znak `=` robi, dwa znaki `==` pytają.
2. **Szkielet:** Dla `cena - 20 <= budzet` rozpisz: lewa strona = `65 - 20` =
   `45`; prawa strona = `50`; pytanie: `45 <= 50`? W notebooku F1.5
   komórka-brudnopis: wpisuj same strony (`print(cena - 20)`), zanim wpiszesz
   całe porównanie — zobaczysz półprodukty.
3. **Pełne rozwiązanie z objaśnieniem:** P1: w pudełku 100, pytanie o 200 →
   `False`. P2: poprawne `haslo == "smok"`; wersja z `=` nie tylko nie pyta —
   ona NISZCZY dane (nadpisuje hasło), dlatego Python blokuje `=` w miejscach
   „pytających". P3: `65 - 20` = 45, `45 <= 50` → `True`; gdyby stało `>=`,
   wyszłoby `False` — znak czytaj zawsze od lewej: „lewa większa-lub-równa
   prawej?".

---

## Atom F1.6 — Decyzja: if / else

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`decyzja-if-else` (KLUCZOWY) · **Krok fadingu:** backward completion —
student pisze POCZĄTEK

### Cel

Napiszesz program, który na podstawie porównania wykonuje jedną z dwóch
gałęzi — z poprawnym dwukropkiem i wcięciem — i przewidzisz, którą gałąź
wybierze Python.

### Teoria

Masz już pytania (`bool` z F1.5). **`if`** to instrukcja, która na odpowiedź
reaguje: „JEŚLI prawda — zrób to; W PRZECIWNYM RAZIE (`else`) — zrób tamto".
Program dochodzi do `if` jak do rozwidlenia ścieżki i wybiera jedną z dwóch
odnóg — stąd mówimy o **gałęziach**.

```python
budzet = 50
cena = 65
if cena <= budzet:                       # warunek + DWUKROPEK
    print("Kupuję!")                     # gałąź na True — WCIĘTA
else:                                    # else też z dwukropkiem
    print(f"Brakuje {cena - budzet} zł") # gałąź na False — WCIĘTA
print("Koniec zakupów")                  # bez wcięcia — wykona się ZAWSZE
```

**Przewidź:** które linie się wypiszą przy tych wartościach? A po zmianie
`cena = 40`?

Przy 65: `Brakuje 15 zł`, potem `Koniec zakupów`. Przy 40: `Kupuję!`, potem
`Koniec zakupów`. Nigdy obie gałęzie naraz — warunek jest albo `True`, albo
`False`.

Prześledź, co Python robi krok po kroku, gdy trafia na `if`: (1) liczy
warunek — to zwykłe porównanie z F1.5, wychodzi `True` albo `False`;
(2) wybiera gałąź: przy `True` wykonuje linie wcięte pod `if`, przy `False` —
wcięte pod `else`; (3) niezależnie od wyboru idzie dalej od pierwszej linii
BEZ wcięcia. Gałąź pominięta nie wykonuje się wcale — Python nawet do niej
nie zagląda.

Składnia trzyma się dwóch znaków:

- **Dwukropek** kończy linijkę z `if` i linijkę z `else`. Bez niego Python
  zatrzyma się z `SyntaxError: expected ':'` — komunikat mówi wprost, czego
  brakuje.
- **Wcięcie** (4 spacje; w Colab klawisz Tab wstawia je za Ciebie) mówi
  Pythonowi, CO NALEŻY do gałęzi. Wcięte linie pod `if` wykonują się tylko
  przy `True`; wcięte pod `else` — tylko przy `False`; linia bez wcięcia to
  już zwykły dalszy ciąg skryptu, poza decyzją. Wcięcie nie jest ozdobą —
  jest znaczeniem. Brak wcięcia tam, gdzie musi być, to
  `IndentationError: expected an indented block`.

`else` jest opcjonalne — samo `if` bez `else` znaczy „przy False po prostu
nic dodatkowego". W gałęzi może stać wiele wciętych linii; gałąź kończy się
tam, gdzie kończy się wcięcie.

Backward completion (odwrotnie niż dotąd — KONIEC jest gotowy, dopisz
POCZĄTEK; notebook F1.6):

```python
temperatura = 3
# dopisz tu dwie linie: warunek "poniżej zera?" z dwukropkiem
# oraz else z dwukropkiem — tak, żeby całość działała
    print("Weź czapkę, mróz!")
    print("Kurtka wystarczy.")
```

(Podpowiedź w strukturze: pierwsza wcięta linia ma trafić do gałęzi `if`,
druga — do `else`; Twoje dwie linie wchodzą PRZED każdą z nich.)

### Pytania (retrieval)

**P1. `wiek = 20`. Program: `if wiek >= 18:` / (wcięte) `print("Pełnoletni")`
/ `else:` / (wcięte) `print("Niepełnoletni")` / (bez wcięcia)
`print("Sprawdzono")`. Co się wypisze?**

- A. Pełnoletni, Niepełnoletni, Sprawdzono — *Nie — gałęzie się WYKLUCZAJĄ:
  warunek jest True, więc gałąź else w ogóle się nie wykonuje.* (diagnoza:
  czyta program jak listę do wykonania w całości)
- B. **Pełnoletni, Sprawdzono** ✓ — *Tak — 20 ≥ 18 to True → gałąź if;
  ostatni print stoi bez wcięcia, czyli poza decyzją: wykonuje się zawsze.*
- C. Pełnoletni — *Prawie — gałąź wybrana dobrze, ale `print("Sprawdzono")`
  nie jest wcięty: nie należy do żadnej gałęzi i wykona się niezależnie od
  warunku.* (diagnoza: nie czyta wcięcia jako granicy gałęzi)
- D. Sprawdzono — *Nie — warunek 20 ≥ 18 jest True, więc gałąź if na pewno
  się wykona; pomijana jest tylko gałąź else.* (diagnoza: traktuje całe
  if/else jako „może się nie wykonać")

**P2. Linia `if cena <= budzet` (bez dwukropka) i pod nią wcięty `print`.
Co zrobi Python?**

- A. Zadziała — dwukropek to konwencja — *Nie — dwukropek jest częścią
  składni: bez niego Python zatrzyma się z `SyntaxError`, zanim cokolwiek
  wykona.* (diagnoza: „kosmetyka" vs składnia)
- B. **Zatrzyma się z `SyntaxError: expected ':'`** ✓ — *Tak — metoda z L0.3:
  ostatnia linia komunikatu mówi wprost „oczekiwałem dwukropka"; poprawka to
  jeden znak `:` na końcu warunku.*
- C. Wykona obie gałęzie na wszelki wypadek — *Nie — Python nigdy nie wykonuje
  „na wszelki wypadek": kod z błędem składni nie startuje wcale.* (diagnoza:
  wyobraża sobie tryb awaryjny)
- D. `IndentationError` — *Blisko — to drugi błąd-strażnik `if`, ale zgłaszany
  gdy brakuje WCIĘCIA po poprawnej linii z dwukropkiem; tu problemem jest sam
  brak dwukropka.* (diagnoza: myli dwóch strażników składni — warto ich
  rozróżniać, bo wskazują różne poprawki)

**P3. `punkty = 40`, próg to 50. Fragment: `if punkty >= 50:` / (wcięte)
`print("Zdane")` — i NIC więcej. Co się wypisze?**

- A. Zdane — *Nie — 40 ≥ 50 to False, gałąź if się nie wykonuje.* (diagnoza:
  nie policzył(-a) warunku)
- B. `False` — *Nie — `if` ZUŻYWA wynik porównania do wyboru gałęzi; sam
  z siebie niczego nie wypisuje.* (diagnoza: myli `if warunek:`
  z `print(warunek)`)
- C. **Nic — warunek jest False, a `else` nie ma, więc program po prostu
  idzie dalej** ✓ — *Tak — `else` jest opcjonalne: brak gałęzi na False
  znaczy „nic dodatkowego nie rób".*
- D. Błąd — `if` bez `else` jest niedozwolony — *Nie — samo `if` jest
  w pełni legalne; `else` dodajesz tylko wtedy, gdy na False też ma się coś
  wydarzyć.* (diagnoza: uogólnia wzorzec „zawsze parą" z przykładów)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Piszesz dwie linie-nagłówki, każda z dwukropkiem: pytanie
   („temperatura poniżej zera?" — znak z F1.5) i `else`. Gotowe printy są już
   wcięte — Twoje linie mają stać NA POCZĄTKU wiersza, bez wcięcia; to one
   otwierają gałęzie.
2. **Szkielet:**

   ```python
   temperatura = 3
   if temperatura ____ 0:     # jaki znak pyta "poniżej"?
       print("Weź czapkę, mróz!")
   ____:                      # słowo otwierające gałąź "w przeciwnym razie"
       print("Kurtka wystarczy.")
   ```

3. **Pełne rozwiązanie z objaśnieniem:**

   ```python
   temperatura = 3
   if temperatura < 0:            # "poniżej zera" = ostro mniejsze
       print("Weź czapkę, mróz!")
   else:
       print("Kurtka wystarczy.")
   ```

   Przy 3 warunek to `False` → wypisze się `Kurtka wystarczy.` Dwa typowe
   potknięcia: `if temperatura < 0` bez dwukropka → `SyntaxError` (dopisz
   `:`); Twoje nagłówki przypadkiem WCIĘTE → Python nie widzi początku
   instrukcji — nagłówki `if`/`else` stoją od początku wiersza, wcięte są
   tylko gałęzie. Sprawdź też krzyżowo: zmień `temperatura` na `-5`
   i uruchom — ma się wypisać druga wiadomość… a właściwie pierwsza. Który
   print jest „pierwszy" przy `-5`? Uruchom i sprawdź swoją odpowiedź.

---

## Atom F1.7 — LAB „Program, który decyduje" (samodzielny finał modułu)

**Typ:** `lab` · **Czas studenta:** ~20–25 min · **Koncepty ćwiczone:**
wszystkie z F1 · **Krok fadingu:** zadanie samodzielne (sama specyfikacja)

### Cel

Napiszesz od zera kompletny program: dane wejściowe → obliczenie → porównanie
→ decyzja z komunikatem f-stringiem. To finał fadingu F1 — bez szkieletu,
z samą specyfikacją (jak przy prawdziwych zadaniach od F3 wzwyż).

### Zadanie (notebook F1.7 — pusta komórka „Twój program" + pieczątka)

Napisz **program oceniający Twój tygodniowy budżet na dojazdy**:

1. Dane wejściowe (zmienne na górze): `budzet_tygodnia` (liczba),
   `cena_przejazdu` (liczba, może być z kropką), `przejazdy_dziennie`
   (liczba całkowita).
2. Obliczenie: `koszt_tygodnia` = cena × przejazdy dziennie × 5 dni roboczych
   (jedno wyrażenie).
3. Decyzja: jeśli koszt mieści się w budżecie — wypisz f-stringiem, ile
   zostaje (`budzet_tygodnia - koszt_tygodnia`); w przeciwnym razie — ile
   brakuje. W OBU gałęziach kwota ma być policzona w klamrze, nie wpisana
   ręcznie.
4. Po decyzji, bez wcięcia, jedna linia podsumowania z samym kosztem
   (f-string).

Sprawdź program dwa razy: z danymi, przy których się mieści, i z takimi, przy
których brakuje (zmień tylko dane wejściowe — logika bez zmian).

**Zaliczenie:** komórka-pieczątka: sprawdza, że `koszt_tygodnia` istnieje
i równa się `cena_przejazdu * przejazdy_dziennie * 5` dla bieżących danych,
oraz że w komórce programu występują `if`/`else` (introspekcja tekstu komórki
przez pieczątkę — deterministyczna, szczegół checku do decyzji przy 1E.6);
wtedy liczy token. Jak we wszystkich labach: dno drabinki (pełne rozwiązanie)
nie blokuje zaliczenia — przepisany i URUCHOMIONY kod to wciąż wykonanie
(R13); pieczątka mierzy wykonanie, nie samodzielność.

### Drabinka hintów

1. **Koncepcyjny:** To jest paragon z F1.4 + decyzja z F1.6, sklejone: sekcja
   danych, jedna linia obliczenia, `if koszt <= budzet:` z gałęzią „zostaje",
   `else:` z gałęzią „brakuje", na końcu niewcięta linia podsumowania.
   Zacznij od sekcji danych i obliczenia — uruchom i sprawdź `print`-em, ZANIM
   dopiszesz decyzję (nawyk krótkich pętli z L0.4).
2. **Szkielet:**

   ```python
   budzet_tygodnia = ____
   cena_przejazdu = ____
   przejazdy_dziennie = ____

   koszt_tygodnia = ____ * ____ * 5

   if ____ <= ____:
       print(f"Mieści się! Zostaje {____} zł")
   else:
       print(f"Za drogo — brakuje {____} zł")
   print(f"Koszt tygodnia: {koszt_tygodnia} zł")
   ```

3. **Pełne rozwiązanie z objaśnieniem:**

   ```python
   budzet_tygodnia = 60
   cena_przejazdu = 3.20
   przejazdy_dziennie = 4

   koszt_tygodnia = cena_przejazdu * przejazdy_dziennie * 5   # 64.0

   if koszt_tygodnia <= budzet_tygodnia:
       print(f"Mieści się! Zostaje {budzet_tygodnia - koszt_tygodnia} zł")
   else:
       print(f"Za drogo — brakuje {koszt_tygodnia - budzet_tygodnia} zł")
   print(f"Koszt tygodnia: {koszt_tygodnia} zł")
   ```

   Przy tych danych: 64.0 > 60 → `Za drogo — brakuje 4.0 zł`, potem
   `Koszt tygodnia: 64.0 zł`. Zwróć uwagę na kierunki odejmowania: w gałęzi
   „zostaje" od budżetu odejmujesz koszt, w gałęzi „brakuje" — odwrotnie
   (inaczej wyjdą kwoty ujemne). Kropka w `64.0` — bo `cena_przejazdu` to
   float (F1.1/F1.2). Typowe błędy: `SyntaxError` przy `if` → brak dwukropka;
   `IndentationError` → print gałęzi bez wcięcia; `NameError` → literówka
   w długich nazwach (skopiuj nazwę z sekcji danych zamiast przepisywać).

---

## Egzamin modułu F1 (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**; 2 warianty
izomorficzne (cap 2 — D1); oblany → retry z drugim wariantem; po 2. oblaniu
obowiązkowe correctives (≤3 atomy per błędne pytanie — mapowanie niżej);
ostrzeżenie przed startem: „zarezerwuj ~25 min"; stan zapisywany
(`assessment_sessions`, kind `module_exam` — 1E.3). Pokrycie: 3 pytania na
każdy z 5 atomów. **Kalibracja OSOBNA, łatwiejsza niż atomowa** (D3): pytania
trzymają się blisko worked examples, bez pułapek wielopoziomowych; feedback
egzaminacyjny = jedno zdanie wyjaśnienia + wskazanie atomu (correctives robią
resztę), nie pełna diagnostyka per opcja.

Format wpisu: warianty A/B parami; **pogrubiona** opcja poprawna; `koncept →
atom` na końcu wpisu steruje correctives.

**E1** · A: Jaki typ ma wartość `19.99`? — int / **float** / str / „zależy od
użycia" — *kropka bez cudzysłowu = float.* · B: Jaki typ ma wartość `200`? —
**int** / float / str / „zależy od użycia" — *goła liczba całkowita = int.*
→ `typ-wartosci` → F1.1

**E2** · A: Jaki typ ma wartość `"42"`? — int / float / **str** / bool —
*cudzysłów zawsze robi tekst.* · B: Jaki typ ma wartość `"2.5"`? — int /
float / **str** / bool — *cudzysłów wygrywa z kropką.* → `typ-wartosci` → F1.1

**E3** · A: Który zapis tworzy liczbę z ułamkiem pod nazwą `waga`? —
`waga = 3,5` / `waga = "3.5"` / **`waga = 3.5`** / `waga = 3.5 kg` — *kropka
dziesiętna, bez cudzysłowu i bez jednostki.* · B: Który zapis tworzy liczbę
z ułamkiem pod nazwą `cena`? — `cena = 7,25` / `cena = "7.25"` /
**`cena = 7.25`** / `cena = 7.25 zł` — *jak w A.* → `typ-wartosci` → F1.1

**E4** · A: Co wypisze `print(2 + 3 * 4)`? — 20 / **14** / 24 / `SyntaxError`
— *mnożenie przed dodawaniem: 2 + 12.* · B: Co wypisze `print(10 - 2 * 3)`?
— 24 / **4** / 16 / `SyntaxError` — *10 - 6.* → `wyrazenie-obliczenie` → F1.2

**E5** · A: Co wypisze `print((2 + 3) * 4)`? — **20** / 14 / 11 /
`SyntaxError` — *nawias najpierw: 5 · 4.* · B: Co wypisze
`print((10 - 2) * 3)`? — 4 / **24** / 28 / `SyntaxError` — *8 · 3.*
→ `wyrazenie-obliczenie` → F1.2

**E6** · A: Co wypisze `print(9 / 3)`? — 3 / **3.0** / `ZeroDivisionError` /
`"9/3"` — *`/` zawsze daje wynik z kropką.* · B: Co wypisze `print(8 / 2)`?
— 4 / **4.0** / `ZeroDivisionError` / `"8/2"` — *jak w A.*
→ `wyrazenie-obliczenie` → F1.2

**E7** · A: `miasto = "Gdańsk"`. Co wypisze `print(f"Mieszkam w {miasto}")`?
— Mieszkam w {miasto} / **Mieszkam w Gdańsk** / Mieszkam w miasto /
`SyntaxError` — *f + klamra = podmiana na wartość.* · B: `kolor = "zielony"`.
Co wypisze `print(f"Lubię {kolor}")`? — Lubię {kolor} / **Lubię zielony** /
Lubię kolor / `SyntaxError` — *jak w A.* → `f-string-budowanie-tekstu` → F1.3

**E8** · A: `a = 5`. Co wypisze `print("Wynik: {a}")` (bez `f`)? — Wynik: 5 /
**Wynik: {a}** / Wynik: a / `SyntaxError` — *bez `f` klamra zostaje
dosłownie.* · B: `lat = 30`. Co wypisze `print("Mam {lat} lat")` (bez `f`)?
— Mam 30 lat / **Mam {lat} lat** / Mam lat lat / `SyntaxError` — *jak w A.*
→ `f-string-budowanie-tekstu` → F1.3

**E9** · A: Co wypisze `print(f"Suma: {2 + 3}")`? — Suma: {2 + 3} /
Suma: 2 + 3 / **Suma: 5** / `TypeError` — *klamra liczy wyrażenie, wstawia
wynik.* · B: Co wypisze `print(f"Iloczyn: {4 * 5}")`? — Iloczyn: {4 * 5} /
Iloczyn: 4 * 5 / **Iloczyn: 20** / `TypeError` — *jak w A.*
→ `f-string-budowanie-tekstu` → F1.3

**E10** · A: Co wypisze `print(7 > 10)`? — True / **False** / 7 /
`SyntaxError` — *porównanie zwraca True/False; 7 nie jest większe od 10.* ·
B: Co wypisze `print(5 < 2)`? — True / **False** / 5 / `SyntaxError` —
*jak w A.* → `porownanie-bool` → F1.5

**E11** · A: Który zapis PYTA, czy `stan` równa się 5 — nie zmieniając go? —
`stan = 5` / **`stan == 5`** / `stan != 5` / `"stan" == 5` — *dwa znaki
pytają, jeden robi.* · B: Który zapis PYTA, czy `poziom` równa się 3 — nie
zmieniając go? — `poziom = 3` / **`poziom == 3`** / `poziom != 3` /
`"poziom" == 3` — *jak w A.* → `porownanie-bool` → F1.5

**E12** · A: `x = 10`. Co wypisze `print(x != 10)`? — True / **False** / 10 /
`SyntaxError` — *`!=` pyta „różne?"; 10 nie różni się od 10.* · B: `y = 4`.
Co wypisze `print(y != 7)`? — **True** / False / 4 / `SyntaxError` — *4 różni
się od 7.* → `porownanie-bool` → F1.5

**E13** · A: `if 8 > 5:` / (wcięte) `print("duże")` / `else:` / (wcięte)
`print("małe")`. Co się wypisze? — **duże** / małe / duże i małe / nic —
*warunek True → wyłącznie gałąź if.* · B: ten sam program z `if 3 > 5:` —
duże / **małe** / duże i małe / nic — *warunek False → wyłącznie gałąź else.*
→ `decyzja-if-else` → F1.6

**E14** · A: Linia `if x > 0` bez dwukropka na końcu. Co zrobi Python? —
zadziała normalnie / **zatrzyma się z `SyntaxError`** / wykona obie gałęzie /
zapyta o dwukropek — *dwukropek to składnia, nie ozdoba.* · B: Linia `else`
bez dwukropka na końcu. Co zrobi Python? — zadziała normalnie / **zatrzyma
się z `SyntaxError`** / pominie gałąź else / zapyta o dwukropek — *jak w A.*
→ `decyzja-if-else` → F1.6

**E15** · A: `if punkty >= 50:` / (wcięte) `print("Zdane")` — bez `else`.
Warunek wychodzi False. Co się stanie? — wypisze „Zdane" / błąd — brak else /
**nic z gałęzi; program idzie dalej** / wypisze „False" — *else jest
opcjonalne.* · B: ten sam fragment, warunek wychodzi True. Co się stanie? —
**wypisze „Zdane" i idzie dalej** / błąd — brak else / nic / wypisze „True"
— *gałąź if wykonuje się przy True.* → `decyzja-if-else` → F1.6

---

## Strona „Pierwsza pomoc — F1/Python" (D5a, statyczna, per moduł)

Blokady środowiskowe Colab → strona „Pierwsza pomoc L0" obowiązuje nadal
(login, sesja, kopia). Tu — błędy JĘZYKA, na które F1 wystawia studenta.
Metoda czytania komunikatów z L0.3 (ostatnia linia, rodzaj : konkret)
obowiązuje wszędzie:

1. **`TypeError` przy `+`** (…`can only concatenate str`… / …`unsupported
   operand`…) → mieszasz tekst z liczbą: `"tekst" + liczba`. Do wstawiania
   liczb w tekst służy f-string: `f"tekst {liczba}"` (F1.3).
2. **`SyntaxError: expected ':'`** → brak dwukropka na końcu nagłówka
   `if`/`else` (F1.6); komunikat mówi wprost, czego oczekiwał Python.
3. **`IndentationError: expected an indented block`** → po linii
   z dwukropkiem musi stać co najmniej jedna WCIĘTA linia (4 spacje / Tab) —
   to ona jest treścią gałęzi (F1.6). Wariant **`unexpected indent`** to
   sytuacja odwrotna: linia jest wcięta, choć żaden nagłówek z dwukropkiem
   nie otworzył gałęzi (np. gotowe printy zadania F1.6, zanim dopiszesz
   `if`/`else`) — dopisz brakujący nagłówek albo usuń wcięcie.
4. **`SyntaxError: invalid syntax. Maybe you meant '==' …?`** → pojedynczy
   `=` w nagłówku `if`; Python sam podpowiada poprawkę: porównanie to `==`
   (F1.5). (Ta sama pomyłka wewnątrz `print(...)` daje mniej pomocny
   `TypeError … unexpected keyword argument` — poprawka identyczna.)
5. **`ZeroDivisionError`** → w mianowniku jest zero: sprawdź `print`-em, co
   NAPRAWDĘ siedzi w zmiennej, przez którą dzielisz (F1.2).
6. **Klamry `{...}` widoczne w wyniku** → to nie błąd Pythona, ale brakło
   litery `f` przed cudzysłowem (F1.3).
7. **`NameError`** → jak w L0: nazwa nieutworzona w tej sesji ALBO literówka —
   w F1 najczęściej w długich nazwach (`budzet_tygodnia`); kopiuj nazwy
   zamiast przepisywać. Wielkość liter ma znaczenie.
8. **Przecinek w liczbie** (`12,5`) → Python czyta to jako dwie rzeczy, nie
   jedną liczbę; część ułamkową oddziela KROPKA (F1.1). Objawy bywają różne
   (błąd albo dziwny wynik) — szukaj przecinka.
9. **Bardzo długi ogon cyfr po kropce** (np. `16.200000000000003` zamiast
   `16.2`) → to nie błąd Twojego kodu: komputer przechowuje ułamki
   z mikroskopijnym przybliżeniem i czasem je widać. Wynik jest praktycznie
   poprawny; ładne zaokrąglanie przy wypisywaniu poznasz w F2.

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://docs.python.org/pl/3/tutorial/introduction.html | Oficjalny tutorial Pythona po polsku — „Nieformalne wprowadzenie" (liczby, teksty; BEZ f-stringów i if — te tylko w teorii atomów) | kanon | PSF (dokumentacja Pythona) | **PL** | nie | 2026-07-11 (HTTP 200; tłumaczenie pełne — zweryfikowane grep-em treści, nie fallback EN) |
| https://www.youtube.com/watch?v=eB3r2NQwNi4 | „Python od podstaw [2024]" (Jak nauczyć się programowania, ~3,5 h, 2023) — rozdziały pokrywają F1 1:1; segment o instalacji 17:02–42:54 POMINĄĆ (poza zakresem pkt 9) | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; seans kontrolny Sophii przed ingest) |

Sedno F1 w całości w polskiej teorii atomów; zasoby = pogłębienie opcjonalne
(D4). Zasób EN nigdy na ścieżce krytycznej.

---

## Słowniczek terminów EN (M11) — przyrost względem L0

| Termin | Po polsku |
|---|---|
| `int` / *integer* | liczba całkowita |
| `float` | liczba z częścią ułamkową (kropka dziesiętna) |
| `str` / *string* | tekst („napis") w cudzysłowie |
| `bool` | typ logiczny: `True` (prawda) / `False` (fałsz) |
| f-string | tekst z klamrami `{}` podmienianymi na wartości (litera `f` przed cudzysłowem) |
| `type(...)` | polecenie „powiedz, jakiego typu jest ta wartość" |
| `TypeError` / `ZeroDivisionError` / `IndentationError` | błędy: „typ nie pozwala na tę operację" / „dzielenie przez zero" / „brakuje wcięcia" |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji modułu (kolejność `order`):** F1.1 → F1.2 → F1.3 →
  F1.4 (lab) → F1.5 → F1.6 → F1.7 (lab) → przegląd przed egzaminem
  (pozycja-konfiguracja, reuse pytań — lista w zasadach modułu) → egzamin.
  5 atomów `exercise` + 2 laby = mieści się w widełkach D1 („moduł = 5–6
  atomów + egzamin"; laby są pozycjami DODATKOWYMI wg D1 „1–2 na moduł
  F1–F3" — tak czytam ADR; do potwierdzenia przy ingest).
- **Zaliczenia:** atomy `exercise` — licznik „wszystkie 3 poprawnie" (M10);
  laby — pieczątka+token (limity mechanizmu jak w L0, zadeklarowane tam).
  Check F1.7 wymaga introspekcji tekstu komórki (obecność `if`/`else`) —
  jedyny nowy element względem L0; jeśli przy 1E.6 okaże się kruchy, fallback:
  check tylko relacji wartości (jak F1.4) + `if`/`else` egzekwowane treścią
  zadania.
- **Egzamin:** 15 pytań / ≤1 błąd / 2 warianty — parametry do
  `examConfigJson`; mapowanie pytanie→koncept→atom w banku (correctives).
  Kalibracja egzaminu jawnie ŁATWIEJSZA niż atomowa (D3) — pytania przy WE;
  monitorować „% zdanych za 1. podejściem" (D11).
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie F1.1–F1.6 =
  335–386 słów z blokami kodu, 301–307 bez nich — w widełkach 300–600 przy
  obu metodach liczenia (jak w L0; metodę kanoniczną ustali standard QG-5
  dla atomów).
- **Modelowanie pozycji (do potwierdzenia przy spec JSON, PR-2):** atom =
  JEDNA pozycja `exercise` z teorią i pytaniami razem (wybór wg D1 „teoria +
  retrieval bezpośrednio po"), nie osobne pozycje `theory`+`exercise` z D2 —
  Oliver potwierdza kind przy ingest.
- **Spacing (D6.3):** 4 koncepty kluczowe otagowane (zasady modułu); pytania
  spiralne F1 do wykorzystania w F2/F3 — hak dla przyszłych modułów, nie
  nowa treść tutaj. „Przegląd przed egzaminem" = czysty reuse 11 pytań
  (lista w zasadach modułu).
- **TODO przed ingest 1E.2:**
  1. Budowa 7 notebooków F1 (WE + brudnopisy + luki + pieczątki w labach).
  2. Seans kontrolny wideo PL (YouTube eB3r2NQwNi4) przed zatwierdzeniem —
     w konfiguracji zasobu zaznaczyć pominięcie segmentu o instalacji
     (17:02–42:54). URL tutoriala PL zweryfikowany (research 2026-07-11).
  3. Wskazanie w treści atomów F1.1/F1.2 komórek-brudnopisów wymaga, by
     notebooki miały je z nagłówkiem „Brudnopis" — szczegół budowy notebooka.

## Przebieg QG tego dokumentu (2026-07-11)

Draft → samodzielne wykonanie snippetów w Pythonie przez autora (wyłapane
przed przeglądem: artefakt float `16.200000000000003` przy cenie 5.40 —
dane zmienione na czyste binarnie + nowa pozycja 9 pierwszej pomocy;
mylący `TypeError` przy `print(cena = 65)` — teoria F1.5 przepisana na
strażnika `Maybe you meant '=='`; komunikat `SyntaxError: expected ':'`
zacytowany dosłownie) → **2 agentów weryfikacyjnych (Fable 5)**:
(1) przegląd zgodności z ADR-014 z wykonaniem **62/62 checków Pythona**
(wszystkie WE, pytania, feedbacki, oba warianty E1–E15, komunikaty błędów) —
1 znalezisko KRYTYCZNE (niespójna deklaracja mechanizmu checku F1.4 —
ujednolicona do uczciwego limitu klasy L0), 2 WAŻNE (budżety prozy
dociągnięte do ≥300 przy obu metodach; pomiary dopisane do notatek),
6 drobnych — wszystkie wcielone; werdykt „gotowe po poprawkach";
(2) research zasobów — tutorial PL docs.python.org/pl potwierdzony jako
w pełni przetłumaczony (HTTP 200, grep treści), wideo PL wybrane
(eB3r2NQwNi4, rozdziały pokrywają F1 1:1), CC BY 4.0 `deed.pl` istnieje
(notatka pod inne moduły).

## Przebieg QG notebooków F1 (2026-07-21, Krok 4 partia 2)

7 źródeł percent (`tools/content/notebooks/f1/`) + build deterministyczny →
**agent QG (Fable 5, adwersaryjnie, z realnym wykonaniem komórek python3):
GO Z NOTAMI (0 KRYT / 3 WAŻN / 5 INFO)** — wszystkie WAŻN wcielone przed PR-em:

- **WAŻN-1:** hint 2 atomu F1.3 cytował nieistniejącą komórkę
  (`print(f"Razem: {___} zł")`) i zawierał dokładnie `___` — w IPythonie
  zmienna historii, więc przepisany dosłownie wykonywał się PO CICHU (ta sama
  klasa co WAŻN-1 z QG L0). Hint przepisany na realną komórkę notebooka
  z `_luka_`; repack JSON.
- **WAŻN-2:** pieczątka F1.7 brała ostatnią komórkę z `koszt_tygodnia`
  (`kandydaci[-1]`) — kontrolny print PO programie dawał fałszywą odmowę
  „dopisz if/else". Poprawka: preferowany OSTATNI kandydat zawierający
  `if` i `else`; odmowa dopiero, gdy żaden go nie ma.
- **WAŻN-3:** F1.5 — odkomentowanie luk operatorowych bez podmiany `_luka_`
  dawało NIEZAPOWIEDZIANY `SyntaxError` (luka w pozycji operatora nie może
  być NameError). Dopisana zapowiedź w markdownie komórki.
- **INFO wcielone:** wariant `IndentationError: unexpected indent` dopisany do
  „Pierwszej pomocy F1" poz. 3 (student widzi go w zadaniu F1.6).
- **Świadome redakcje (bez zmian):** komentarz luki 3 w F1.4 „nazwa albo
  wyrażenie" (precyzyjniejszy niż doc, zgodny z Wymaganiami); F1.5 WE-luka
  `# → przewidź wynik` zamiast zdradzania odpowiedzi w komentarzu.
- **Limity zadeklarowane (bez akcji):** trywialny bypass F1.7 (zera + `# if
  else` w komentarzu) = klasa limitu ADR-015 §5 (lab bramkuje postęp, nie
  kredencjał); token F1.7 z pełnym `_zrodlo` ≈ 700 znaków (guard 2500 znaków
  źródła działa) — obserwować w telemetrii wklejek.

Parytet Python↔TS i drift buildera przybite testem
`tests/unit/ds/notebooks-f1.contract.test.ts` (kontrakt: laby z pieczątką ze
wspólnym blokiem, ćwiczenia bez; happy + odmowy na checkach z prod-JSON-a).
