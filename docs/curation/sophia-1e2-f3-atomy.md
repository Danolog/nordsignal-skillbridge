# 1E.2 · Moduł F3 „Dane w Pythonie" — treść atomów + MINI-PROJEKT

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z wykonaniem 64/64 checków Pythona
— zero krytyków + research zasobów PL; przebieg na końcu dokumentu);
przed ingest 1E.2: TODO z notatek (notebooki F3 z pieczątką
wielofunkcyjną K2, seans wideo, audyt pojemności D10 pod M-EDA).
**Podstawa:** ADR-014 — D1/D3/D5/D6/D6.5 (parametry jak F1/F2) + **decyzja
Darka pkt 12b: MINI-PROJEKT transferowy po F3** (lekki, weryfikowany
automatycznie, pierwsza samodzielna praca przed pełnym capstone'em; pozycja
`kind='project'` w F3 — plan 1E.1c). Prerekwizyt: **F2 zaliczony**
(input/konwersja, listy, for, akumulator, funkcje), F1/L0 wcześniej.
**Format:** treść merytoryczna w markdownie; spec JSON przy PR-2.

---

## Zasady modułu F3 (przyrost względem F2)

- **Struktura:** 5 atomów `exercise` + 1 lab + **MINI-PROJEKT** (pozycja
  `project`, 3 kamienie milowe) + egzamin. Zaliczenia: atomy — licznik M10;
  lab i kamienie projektu — wykonanie (pieczątka+token, limity klasy L0).
- **Spłata obietnic z F2 (jawnie):** F3.1 — `.append()` („dodawanie
  elementów poznasz w F3" — F2.2); F3.2 — zliczanie WYBRANYCH elementów
  („licznik zabłyśnie w F3" — F2.5); F3.3/F3.5 — słowniki (notatki F2).
- **Jawne ODWOŁANIE obietnicy (za zgodą reguły z notatek F2 „spłacić albo
  jawnie odwołać"):** `while` i `range()` NIE weszły do F3 — do pracy
  z danymi w tym module nie są potrzebne; wejdą just-in-time w modułach
  projektowych (pkt 9), pierwszy kandydat: pętle iteracyjne w M-ML.
- **Fading backward (D5a):** F3.1 pełne WE → F3.2 completion (luka na
  końcu) → F3.3 luki w środku → F3.4 lab-szkielet → F3.5 backward
  completion → F3.6 krótkie WE + zadanie → F3.7 MINI-PROJEKT w pełni
  samodzielny (sama specyfikacja — pierwszy raz bez drabinki „szkieletowej":
  drabinka hintów 3-stopniowa oczywiście JEST, pkt 13).
- **Koncepty kluczowe (≤4, pod spacing — D6.3):** `append-budowanie-listy`
  (F3.1), `if-w-petli-filtrowanie` (F3.2), `slownik-klucz-wartosc` (F3.3),
  `lista-slownikow-rekordy` (F3.5). F3.6 (`agregaty-sum-min-max`) — koncept
  zwykły.
- **Przegląd przed egzaminem (reuse):** F2.3-P1, F2.5-P1, F2.5-P2, F2.6-P2,
  F3.1-P3, F3.2-P1, F3.3-P2, F3.5-P1, F3.5-P3, F3.6-P2 (10 pytań;
  konfiguracja pozycji).
- **Egzamin F3:** 15 pytań × 2 warianty, **próg: ≤1 błąd**; pokrycie
  3 pytania × 5 atomów; kalibracja łatwiejsza niż atomowa (D3); bank na
  końcu.
- **Sesja i czas:** 8 pozycji ≈ 3–4 sesje (mini-projekt sam w sobie ~45–60
  min — pierwsza „duża" praca, celowo przed capstone'em M-EDA).

---

## Atom F3.1 — Lista rośnie: metoda .append()

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`append-budowanie-listy` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Zbudujesz listę element po elemencie metodą `.append()` — także wewnątrz
pętli — i ominiesz pułapkę „append zwraca `None`".

### Teoria

W F2.2 obiecaliśmy: dodawanie elementów do listy poznasz w F3. Oto ono.
Nowa rzecz ma nową składnię — **metodę**: polecenie przypięte do konkretnej
wartości, wywoływane PO KROPCE za jej nazwą. `len(lista)` to funkcja,
której listę podajesz; `lista.append(60)` to metoda, którą lista „ma przy
sobie". Kropka czyta się „…, zrób swoje append z wartością 60". Metod
będzie przybywać (teksty i tabele w pandas mają ich dziesiątki) — append
otwiera tę rodzinę i uczy jej składni.

```python
wydatki = [120, 80, 45]
wydatki.append(60)          # dopisz 60 NA KONIEC listy
print(wydatki)              # cała lista po zmianie
print(len(wydatki))
```

**Przewidź:** co wypiszą oba printy?

`[120, 80, 45, 60]` i `4`. Zapamiętaj trzy własności `.append(...)`:

1. **Dokleja zawsze na koniec** — nowy element dostaje najwyższy indeks
   (tu: 3).
2. **Zmienia listę W MIEJSCU** — nie tworzy nowej; po wywołaniu ta sama
   zmienna `wydatki` ma po prostu więcej przegródek.
3. **Niczego nie zwraca** — a dokładniej zwraca `None` (znasz go z F2.6).
   Stąd pułapka numer jeden tego atomu: zapis
   `wydatki = wydatki.append(60)` wygląda rozsądnie, a NISZCZY listę —
   do `wydatki` trafia `None`, a każda następna operacja na liście kończy
   się błędem w stylu `AttributeError`/`TypeError`. Reguła: **append
   wywołujesz, wyniku NIE przypisujesz.**

Prawdziwa siła append ujawnia się w pętli. W F2.5 akumulatorem była liczba;
teraz zbieraczem może być LISTA — startujesz od pustej `[]` (F2.2) i
dokładasz obrót po obrocie:

```python
kwoty_brutto = []                     # pusty zbieracz PRZED pętlą (jak suma = 0)
for kwota in [100, 200, 50]:
    kwoty_brutto.append(kwota * 1.23) # dołóż przeliczony element
print(kwoty_brutto)
```

**Przewidź** wynik — a potem sprawdź w notebooku F3.1:
`[123.0, 246.0, 61.5]`. Szkielet jest identyczny ze wzorcem akumulatora
(start przed pętlą, dokładka w ciele, odczyt po) — zmienił się tylko typ
zbieracza i gest dokładania: zamiast `suma = suma + …` jest
`lista.append(…)`.

Po co budować listę pętlą, skoro można ją wpisać wprost? Bo dane rzadko
przychodzą w kształcie, którego potrzebujesz: dostajesz ceny netto,
a chcesz brutto; dostajesz kwoty, a chcesz zaokrąglone. Pętla z append to
taśma produkcyjna „stara lista → nowa lista po przeróbce" — i to jest
chleb powszedni pracy z danymi. Te dwa zbieracze — liczba (F2.5) i lista —
załatwią Ci większość roboty aż po M-EDA.

### Pytania (retrieval)

**P1. `oceny = [4, 5]`. Wykonujesz `oceny.append(3)`. Jak wygląda lista
i pod jakim indeksem siedzi trójka?**

- A. `[3, 4, 5]`, indeks 0 — *Nie — append dokleja NA KONIEC, nie na
  początek; kolejność wcześniejszych elementów się nie zmienia.* (diagnoza:
  append mylony z wstawianiem na początek)
- B. **`[4, 5, 3]`, indeks 2** ✓ — *Tak — nowy element ląduje na końcu
  i dostaje najwyższy indeks: len wzrosło do 3, ostatni indeks to 2.*
- C. `[4, 5, 3]`, indeks 3 — *Prawie — lista się zgadza, ale indeksy liczy
  się od zera (F2.2): trzeci element ma indeks 2.* (diagnoza: numeracja od
  jedynki)
- D. `[4, 5]` — append tworzy NOWĄ listę, stara bez zmian — *Nie — append
  zmienia listę w miejscu; żadna nowa lista nie powstaje.* (diagnoza: model
  „operacje zwracają kopię")

**P2. Co zrobi zapis `zakupy = zakupy.append("ser")`?**

- A. Doda „ser" i zapisze powiększoną listę — *Nie — element faktycznie się
  doklei, ale append zwraca `None` i właśnie ON trafi do `zakupy`: lista
  ginie z tej nazwy.* (diagnoza: sedno pułapki — przypisanie wyniku append)
- B. **Doklei „ser", ale do `zakupy` trafi `None` — lista przepada z tej
  nazwy** ✓ — *Tak — append wywołujesz, wyniku nie przypisujesz: samo
  `zakupy.append("ser")` wystarczy.*
- C. `SyntaxError` — nie wolno przypisywać metody — *Nie — składniowo zapis
  jest legalny i Python wykona go posłusznie; problem jest znaczeniowy,
  nie składniowy (najgroźniejsze błędy nie mają komunikatu — F2.5-P2).*
  (diagnoza: liczy na strażnika składni tam, gdzie go nie ma)
- D. Nic — te dwa zapisy znaczą to samo — *Nie — różnica jest zasadnicza:
  bez przypisania lista rośnie i ŻYJE dalej pod swoją nazwą; z przypisaniem
  nazwa wskazuje `None`.* (diagnoza: przypisanie jako „ozdobnik")

**P3. `progi = []`, potem `for n in [1, 2, 3]:` / (wcięte)
`progi.append(n * 10)`. Co jest w `progi` po pętli?**

- A. `[1, 2, 3]` — *Nie — do listy trafia WYNIK wyrażenia `n * 10`, nie
  surowe `n` (jak w F2.3-P2: ciało najpierw liczy).* (diagnoza: ignoruje
  przekształcenie w ciele)
- B. `[30]` — *Nie — append DOKŁADA, niczego nie nadpisuje: po trzech
  obrotach są trzy elementy, nie sam ostatni.* (diagnoza: myli dokładanie
  z nadpisywaniem — kalka błędu „zerowanie w ciele" z F2.5)
- C. **`[10, 20, 30]`** ✓ — *Tak — trzy obroty, trzy dokładki, każda po
  przeliczeniu: 10, 20, 30, w kolejności obrotów.*
- D. `None` — *Nie — `None` zwraca samo WYWOŁANIE append; lista `progi`
  istnieje dalej i rośnie. `None` zniszczyłoby ją dopiero przy zapisie
  `progi = progi.append(...)` (P2).* (diagnoza: pułapka None przypięta do
  złego miejsca)

### Drabinka hintów

1. **Koncepcyjny:** Wzorzec znasz z F2.5 — zmień tylko zbieracza: start
   `nazwa = []` PRZED pętlą, w ciele `nazwa.append(element_po_przeróbce)`,
   odczyt po pętli. I mantra: append wywołuj, wyniku nie przypisuj.
2. **Szkielet:** W notebooku F3.1: `ceny_po_rabacie = ______` (pusty
   start), w ciele pętli po `[100, 40, 250]`:
   `ceny_po_rabacie.append(______ * 0.9)` — co przerabiasz w każdym
   obrocie?
3. **Pełne rozwiązanie z objaśnieniem:** `ceny_po_rabacie = []`, w ciele
   `ceny_po_rabacie.append(cena * 0.9)` (nazwa z nagłówka pętli). Wynik:
   `[90.0, 36.0, 225.0]` — każdy element przeszedł przez `* 0.9`, kolejność
   z listy źródłowej. Diagnostyka: `AttributeError: 'NoneType' object has
   no attribute 'append'` w drugim obrocie = gdzieś wcześniej przypisano
   wynik append do nazwy listy (P2); lista z jednym elementem zamiast
   trzech = start `[]` wisi w ciele pętli (zerowanie — F2.5-P2, ta sama
   choroba).

---

## Atom F3.2 — Decyzja w każdym obrocie: filtrowanie i zliczanie

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`if-w-petli-filtrowanie` (KLUCZOWY) · **Krok fadingu:** completion (luka
na końcu WE)

### Cel

Połączysz `for` z `if`: zliczysz elementy spełniające warunek, zbierzesz je
do nowej listy i wyśledzisz największy — trzy odmiany jednego ruchu
„decyzja per element".

### Teoria

W F2.5 obiecaliśmy moment, w którym licznik zabłyśnie: gdy trzeba
policzyć tylko WYBRANE elementy — bo prawdziwe pytania do danych prawie
zawsze mają warunek („ile wydatków POWYŻEJ stu?"). Ten moment nadszedł. Konstrukcja to `if` (F1.6)
wstawiony W CIAŁO pętli (F2.3) — każdy element przechodzi przez bramkę:

```python
wydatki = [120, 80, 45, 200, 15]

duze = 0                        # licznik — startuje przed pętlą (F2.5)
for wydatek in wydatki:
    if wydatek > 100:           # bramka: decyzja dla BIEŻĄCEGO elementu
        duze = duze + 1         # podwójne wcięcie: należy do if wewnątrz for
print(f"Wydatków powyżej 100 zł: {duze}")
```

**Przewidź:** co wypisze program?

`Wydatków powyżej 100 zł: 2` (120 i 200 przechodzą bramkę; 80, 45 i 15 —
nie). Zwróć uwagę na **podwójne wcięcie**: linia `duze = duze + 1` jest
wcięta dwa razy, bo należy do `if`, który należy do `for`. Wcięcia czytasz
jak w F1.6, tylko piętrowo: co obrót wykonuje się `if` (pojedyncze
wcięcie), a linia podwójnie wcięta — tylko gdy warunek dał `True`.

Ta sama bramka ma trzy klasyczne odmiany — różni je wyłącznie to, co
robisz, gdy element przejdzie:

1. **Zliczanie** — `licznik = licznik + 1` (wyżej).
2. **Filtrowanie** — `wybrane.append(wydatek)` (zbieracz-lista z F3.1):
   po pętli masz NOWĄ listę z samymi pasującymi elementami.
3. **Śledzenie największego** — `najwiekszy = wydatek`, gdy
   `wydatek > najwiekszy`: pudełko przechowuje dotychczasowego lidera,
   a bramka wpuszcza tylko nowych rekordzistów. Start: pierwszy element
   listy (`najwiekszy = wydatki[0]` — F2.2), nie zero — zero „wygrałoby"
   z każdą wartością, gdyby dane były ujemne (temperatury, salda),
   a pierwszy element niczego o danych nie zakłada.

Wszystkie odmiany sprawdzasz tą samą metodą, co akumulator w F2.5:
przejdź listę palcem, element po elemencie, i przy każdym zadaj pytanie
bramki — True wykonuje gest, False nie robi nic. Odmiany wolno też
łączyć: jedna pętla może naraz zliczać małe, zbierać duże i sumować —
każdy zbieracz ma swój start przed pętlą i swój gest w gałęzi (zrobisz
to w labie F3.4; `else` przy bramce działa jak w F1.6 i bywa przydatny,
ale nie jest obowiązkowy).

Completion na rozgrzewkę (luka na końcu — notebook F3.2), odmiana 2:

```python
wydatki = [120, 80, 45, 200, 15]
male = []
for wydatek in wydatki:
    if wydatek < 50:
        ______                    # luka: dołóż pasujący element do male
print(male)
```

Po uzupełnieniu wynik to `[45, 15]` — nowa lista, oryginał nietknięty.

### Pytania (retrieval)

**P1. `oceny = [3, 5, 2, 5, 4]`; licznik piątek: `if ocena == 5:` /
(podwójnie wcięte) `piatki = piatki + 1`. Ile wyniesie `piatki` po pętli
(start od 0)?**

- A. 5 — *Nie — licznik rośnie tylko w obrotach, w których bramka
  przepuściła: piątki są dwie, nie pięć.* (diagnoza: zlicza obroty zamiast
  trafień)
- B. **2** ✓ — *Tak — bramka `== 5` otwiera się w obrocie 2. i 4.; licznik:
  0 → 1 → 2.*
- C. 10 — *Nie — `piatki + 1` zwiększa o JEDEN za trafienie; wartość oceny
  (5) nie jest dodawana.* (diagnoza: myli zliczanie z sumowaniem trafień)
- D. 0 — bramka blokuje wszystko — *Nie — `==` porównuje (F1.5) i dla
  dwóch elementów daje True; licznik ruszy. Zero wyszłoby np. przy
  literówce w warunku.* (diagnoza: nie wykonuje porównania w głowie)

**P2. Odmiana filtrująca: `male.append(wydatek)` stoi wcięte POJEDYNCZO
(na poziomie `if`, nie pod nim). Co się stanie?**

- A. Zadziała tak samo — *Nie — wcięcie to znaczenie (F1.6): linia na
  poziomie `if` nie należy już do niego i wykona się w KAŻDYM obrocie.*
  (diagnoza: wcięcie jako kosmetyka — na piętrowym przykładzie)
- B. **Append wykona się co obrót — `male` będzie kopią całej listy,
  bramka przestanie filtrować** ✓ — *Tak — linia wypadła z `if`, ale
  została w `for`: dokłada każdy element. Poprawka: podwójne wcięcie.*
- C. `IndentationError` — *Nie — składniowo oba poziomy są legalne
  (Python nie wie, że CHCIAŁEŚ pod if); błąd jest znaczeniowy, bez
  komunikatu.* (diagnoza: liczy na strażnika tam, gdzie go nie ma —
  jak F3.1-P2/C)
- D. `male` zostanie puste — *Nie — odwrotnie: append poza bramką wykonuje
  się ZAWSZE, więc trafi tam wszystko.* (diagnoza: kierunek skutku
  odwrócony)

**P3. Śledzenie największego w `temperatury = [12, 19, 7, 23, 18]`:
start `naj = temperatury[0]`, bramka `if t > naj:` → `naj = t`.
Jaka jest `naj` po pętli i czemu start nie od zera?**

- A. 23; start od zera też by działał — *Wynik tak, uzasadnienie nie —
  przy danych UJEMNYCH (np. same mrozy) zero „wygrałoby" z każdym
  elementem i wynik byłby fałszywy; pierwszy element jest zawsze
  bezpieczny.* (diagnoza: strategia działa przypadkiem, nie z zasady)
- B. **23; start od pierwszego elementu jest bezpieczny dla każdych
  danych, start od zera zawiódłby przy ujemnych** ✓ — *Tak — lider mienia
  się: 12 → 19 → 23; a start `[0]` nie zakłada niczego o wartościach.*
- C. 18 — ostatnia wygrywa — *Nie — bramka `>` wpuszcza tylko NOWYCH
  rekordzistów; 18 < 23, więc lider zostaje.* (diagnoza: nadpisywanie co
  obrót zamiast warunkowego — zgubiona bramka)
- D. 79 — *Nie — to suma; śledzenie największego niczego nie dodaje, tylko
  PODMIENIA lidera, gdy pojawi się większy.* (diagnoza: wzorzec sumy
  wciśnięty w zadanie o maksimum)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** Luka to gest odmiany 2: „dołóż BIEŻĄCY element do
   zbieracza-listy" — poznałeś(-aś) go w F3.1. Pamiętaj o podwójnym
   wcięciu: gest należy do `if`, który należy do `for`.
2. **Szkielet:** `______.append(______)` — dokąd dokładasz i co
   (nazwa zbieracza sprzed pętli; nazwa z nagłówka pętli)?
3. **Pełne rozwiązanie z objaśnieniem:** `male.append(wydatek)` —
   podwójnie wcięte. Przebieg bramki `< 50`: 120 nie, 80 nie, 45 TAK,
   200 nie, 15 TAK → `[45, 15]`. Jeśli `male` wyszło jako kopia całej
   listy — wcięcie pojedyncze (P2); jeśli puste — sprawdź kierunek znaku
   w bramce (`<` vs `>`, F1.5); jeśli `AttributeError` o NoneType —
   gdzieś przypisano wynik append (F3.1-P2).

---

## Atom F3.3 — Słownik: wartość pod kluczem, nie pod numerem

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`slownik-klucz-wartosc` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Zapiszesz powiązane dane w słowniku, odczytasz wartość po kluczu,
dopiszesz nową parę i obsłużysz `KeyError` — czwarty błąd-drogowskaz
w Twojej kolekcji.

### Teoria

Lista numeruje przegródki: `wydatek[0]`, `wydatek[1]`… Ale opis JEDNEJ
rzeczy — powiedzmy wydatku — to nie seria, tylko zestaw NAZWANYCH cech:
nazwa, kategoria, kwota. Trzymanie ich w liście (`w[0]` to nazwa czy
kategoria?) prosi się o pomyłkę. Do nazwanych cech służy **słownik**
(ang. *dictionary*, stąd `dict`): przegródki podpisane KLUCZAMI zamiast
numerami.

```python
wydatek = {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40}
print(wydatek["nazwa"])          # odczyt: klucz w nawiasach kwadratowych
print(wydatek["kwota"] * 2)      # wartość spod klucza to zwykła wartość
```

**Przewidź:** co wypiszą oba printy?

`bilet` i `8.8`. Rozbiór składni: całość w nawiasach KLAMROWYCH `{}`
(uwaga — w f-stringu klamry robiły co innego; kontekst je rozróżnia),
każda para to `klucz: wartość`, pary rozdziela przecinek. Klucze to
najczęściej teksty w cudzysłowie; wartości — dowolne typy z F1.1.
Odczyt wygląda jak w liście, tylko w kwadratowych nawiasach stoi KLUCZ,
nie numer.

Kiedy lista, a kiedy słownik? Prosta reguła: **seria takich samych
rzeczy → lista; nazwane cechy jednej rzeczy → słownik.** Pięć kwot
z tygodnia to lista; opis jednego wydatku (nazwa, kategoria, kwota) —
słownik. Kolejność par w słowniku nie gra roli przy odczycie — sięgasz
po kluczu, nie po pozycji, więc „gdzie w słowniku leży kwota" to pytanie
bez znaczenia. Oba kształty złożymy zresztą za chwilę w jedną całość
(F3.5).

Słownik można zmieniać — i tu miła niespodzianka na tle listy (F2.2
zabraniała tworzyć przegródki nadpisem): **przypisanie pod nowy klucz
DOPISUJE parę**, a pod istniejący — podmienia wartość:

```python
wydatek["oplacone"] = True     # nowa para dopisana
wydatek["kwota"] = 4.90        # istniejąca wartość podmieniona
```

Za tę swobodę płacisz czujnością przy odczycie: **klucz, którego nie ma,
to `KeyError`** — np. `wydatek["cena"]` (jest „kwota", nie „cena")
zatrzyma program komunikatem `KeyError: 'cena'`. Komunikat pokazuje
dosłownie klucz, o który pytałeś(-aś) — literówka widoczna gołym okiem
(metoda z L0.3). Czy klucz istnieje, sprawdzisz słowem `in`:
`"cena" in wydatek` to zwykłe porównanie w duchu F1.5 — daje `True`/
`False`, więc działa też jako bramka w `if`. Przyda się przy kluczach
opcjonalnych: nie każdy wydatek musi mieć np. pole `"rabat"`, a bramka
`if "rabat" in wydatek:` pozwala sięgać po nie tylko tam, gdzie istnieje.

Luki w środku (notebook F3.3 — opisz swój obiad):

```python
obiad = {"danie": ______, "cena": ______}   # luki: tekst i liczba — które gdzie?
print(f"{obiad[______]} za {obiad['cena']} zł")   # luka: klucz dania
```

### Pytania (retrieval)

**P1. `kot = {"imie": "Mruczek", "wiek": 3}`. Co wypisze
`print(kot["wiek"])`?**

- A. `"wiek"` — *Nie — w nawiasach podajesz klucz, a dostajesz WARTOŚĆ
  spod niego; klucz to podpis przegródki, nie jej zawartość.* (diagnoza:
  klucz vs wartość — kalka indeks vs wartość z F2.2)
- B. **3** ✓ — *Tak — pod kluczem „wiek" siedzi 3; odczyt po kluczu
  zwraca wartość.*
- C. 1 — bo „wiek" jest drugą parą — *Nie — słownik nie używa numerów;
  pary wybiera się wyłącznie po kluczu.* (diagnoza: przenosi indeksy
  z listy na słownik)
- D. `KeyError` — *Nie — klucz „wiek" istnieje; KeyError pojawia się przy
  kluczu, którego NIE ma (np. `kot["rasa"]`).* (diagnoza: pułapka
  zapamiętana, warunek nie)

**P2. `ceny = {"kawa": 12}`. Wykonujesz `ceny["herbata"] = 9`. Co się
stanie?**

- A. `KeyError` — „herbata" nie istnieje — *Nie — KeyError grozi przy
  ODCZYCIE brakującego klucza; ZAPIS pod nowy klucz jest legalny i tworzy
  parę.* (diagnoza: reguła odczytu rozciągnięta na zapis — kluczowe
  rozróżnienie atomu)
- B. Podmieni cenę kawy na 9 — *Nie — zapis dotyczy klucza „herbata";
  „kawa" zostaje nietknięta.* (diagnoza: „ostatni zapis nadpisuje
  wszystko")
- C. **Dopisze parę: `{"kawa": 12, "herbata": 9}`** ✓ — *Tak — przypisanie
  pod nowy klucz DOPISUJE; pod istniejący — podmienia. To różnica względem
  listy, gdzie nowych przegródek nadpisem nie utworzysz.*
- D. `SyntaxError` — *Nie — składnia jest identyczna jak przy podmianie
  wartości; Python rozstrzyga po tym, czy klucz już istnieje.* (diagnoza:
  oczekuje osobnej składni na „dodaj")

**P3. `produkt = {"nazwa": "sok", "cena": 6.50}`. Program wykonuje
`print(produkt["Nazwa"])`. Co się stanie?**

- A. Wypisze „sok" — Python domyśli się, o co chodzi — *Nie — klucz musi
  się zgadzać CO DO ZNAKU; „Nazwa" i „nazwa" to różne teksty (F1.5:
  wielkość liter ma znaczenie).* (diagnoza: oczekuje tolerancji
  wielkości liter)
- B. Wypisze `None` — *Nie — słownik nie oddaje „niczego" po cichu:
  brakujący klucz to głośny błąd, nie None.* (diagnoza: przenosi „ciche"
  zachowanie funkcji bez return)
- C. **Zatrzyma program z `KeyError: 'Nazwa'`** ✓ — *Tak — komunikat
  pokazuje dosłownie klucz z Twojego odczytu: wielka litera zdradza
  literówkę od razu.*
- D. Dopisze pustą parę „Nazwa" — *Nie — dopisanie robi ZAPIS
  (`produkt["Nazwa"] = …`); sam odczyt niczego nie tworzy — jak
  w liście (F2.2-P3).* (diagnoza: myli odczyt z zapisem — lustrzane
  odbicie P2/A)

### Drabinka hintów (luki z teorii)

1. **Koncepcyjny:** Para to `klucz: wartość` — klucz opisuje (tekst
   w cudzysłowie), wartość jest opisywana. „Danie" opisuje się tekstem,
   „cena" liczbą. Przy odczycie w kwadratowych nawiasach stoi KLUCZ —
   dokładnie ten, który wpisałeś(-aś) przy tworzeniu, co do znaku.
2. **Szkielet:** `{"danie": "pierogi", "cena": ______}` — cena to liczba
   (bez cudzysłowu — F1.1); w print: `obiad[______]` — klucz jest tekstem,
   więc w cudzysłowie: `obiad["danie"]`.
3. **Pełne rozwiązanie z objaśnieniem:**
   `obiad = {"danie": "pierogi", "cena": 24.50}` i
   `print(f"{obiad['danie']} za {obiad['cena']} zł")` →
   `pierogi za 24.5 zł`. Dwa niuanse: wewnątrz f-stringa klucz ujmij
   w POJEDYNCZE cudzysłowy (`'danie'`), żeby nie zderzył się z podwójnymi
   obejmującymi cały tekst; `24.50` wypisuje się jako `24.5` — Python
   ucina nieznaczące zero (to nadal ta sama wartość; `round`/formatowanie
   groszy dopracujesz w mini-projekcie). `KeyError: 'Danie'`? Porównaj
   klucz z odczytu z kluczem z definicji znak po znaku.

---

## Atom F3.4 — LAB „Sito wydatków" (filtr + zbieracze w jednym programie)

**Typ:** `lab` · **Czas studenta:** ~20 min · **Koncepty ćwiczone:**
`append-budowanie-listy`, `if-w-petli-filtrowanie` (+ akumulator z F2.5) ·
**Krok fadingu:** szkielet z lukami

### Cel

Jednym przejściem pętli rozdzielisz wydatki na duże i małe ORAZ policzysz
sumę dużych — trzy zbieracze pracujące równolegle w jednej pętli.

### Zadanie (notebook F3.4 — kopia na Dysk, uzupełnij luki, uruchom)

```python
wydatki = [120, 80, 45, 200, 15, 95]
prog = 100

duze = []                      # zbieracz-lista na wydatki >= prog
suma_duzych = 0                # zbieracz-liczba
male_licznik = 0               # zbieracz-licznik

for wydatek in wydatki:
    if wydatek >= prog:
        duze.append(______)            # luka 1: co dokładasz?
        suma_duzych = ______           # luka 2: wzorzec z F2.5
    else:
        male_licznik = ______          # luka 3: zliczanie (F3.2)

print(f"Duże wydatki: {duze}")
print(f"Suma dużych: {suma_duzych} zł")
print(f"Małych wydatków: {male_licznik}")
```

Wymagania: trzy zbieracze startują PRZED pętlą (już w szkielecie); gałąź
`if` karmi dwa pierwsze, gałąź `else` — trzeci; żadnych ręcznie wpisanych
wyników. Po uruchomieniu zmień `prog` na 50 i uruchom ponownie — wyniki
mają się przeliczyć same.

**Zaliczenie:** komórka-pieczątka: sprawdza relacje dla BIEŻĄCYCH danych —
`duze` to lista elementów `wydatki` spełniających `>= prog`, `suma_duzych`
równa się sumie `duze`, `male_licznik` równa się liczbie pozostałych —
i liczy token. Relacje liczone niezależnie przez pieczątkę (własna pętla),
więc zgodzą się tylko, gdy Twoje zbieracze naprawdę policzyły; ręczne
stałe przeszłyby dla jednego ustawienia `prog` — drabinka każe sprawdzić
dwa, ale instruktażowo (token może paść po pierwszym zielonym przebiegu;
świadome obejście = limity klasy L0).

### Drabinka hintów

1. **Koncepcyjny:** Każda luka to jeden znany gest: luka 1 — „dołóż bieżący
   element" (F3.1); luka 2 — „stara suma + bieżący element" (F2.5); luka 3
   — „licznik + 1" (F3.2). Gałąź decyduje, KTÓRE gesty wykonują się dla
   danego elementu.
2. **Szkielet:** luka 1: nazwa z nagłówka pętli; luka 2:
   `suma_duzych + ______`; luka 3: `male_licznik + ______` (o ile rośnie
   licznik za jedno trafienie?).
3. **Pełne rozwiązanie z objaśnieniem:** luka 1: `wydatek`; luka 2:
   `suma_duzych + wydatek`; luka 3: `male_licznik + 1`. Dla progu 100:
   `[120, 200]`, `320 zł`, `4`. Dla progu 50: `[120, 80, 200, 95]`,
   `495 zł`, `2`. Trzy zbieracze w jednej pętli to norma, nie sztuczka —
   każdy ma własny start przed pętlą i własny gest w ciele. Typowe
   potknięcia: suma w złej gałęzi (sumują się małe zamiast dużych —
   porównaj wcięcia z gałęziami); licznik `+ wydatek` zamiast `+ 1`
   (F3.2-P1/C: zliczanie ≠ sumowanie).

---

## Atom F3.5 — Lista słowników: Twoja pierwsza tabela danych

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`lista-slownikow-rekordy` (KLUCZOWY) · **Krok fadingu:** backward
completion — student pisze nagłówek pętli i bramkę do gotowego ciała

### Cel

Połączysz listę ze słownikami w „tabelę": przejdziesz pętlą po rekordach,
sięgniesz po pola po kluczu i przefiltrujesz rekordy po wartości pola.
To dokładnie kształt danych, który spotkasz w API i w pandas (M-EDA).

### Teoria

Słownik (F3.3) opisuje JEDNĄ rzecz. Danych jest zwykle wiele — a wiele
rzeczy trzymamy w liście (F2.2). Złożenie obu to **lista słowników**:
każdy element listy jest słownikiem o TYCH SAMYCH kluczach. Czytaj to jak
tabelę: element listy = wiersz (fachowo: **rekord**), klucz = nazwa
kolumny.

```python
wydatki = [
    {"nazwa": "bilet",  "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad",  "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",   "kategoria": "jedzenie",  "kwota": 12.00},
]
print(len(wydatki))                # ile rekordów?
print(wydatki[0]["nazwa"])         # rekord 0, pole "nazwa"
```

**Przewidź:** co wypiszą oba printy?

`3` i `bilet`. Zapis `wydatki[0]["nazwa"]` czytaj spokojnie, od lewej,
dwoma krokami:
`wydatki[0]` wyjmuje z listy PIERWSZY słownik (indeks — F2.2), a
`["nazwa"]` sięga w nim po wartość spod klucza (F3.3). Nic nowego — dwa
znane gesty sklejone w łańcuszek.

Skąd ten kształt w prawdziwym życiu? Dane pobierane z internetu (poznasz
to przy capstonie M-EDA) przychodzą DOKŁADNIE tak: lista rekordów
o nazwanych polach. Także tabele w pandas, których użyjesz do analiz, pod
spodem opisują to samo — wiersze i nazwane kolumny. Ucząc się listy
słowników, uczysz się uniwersalnego kształtu danych, tylko bez opakowań.

Jedna dyscyplina przy budowie tabeli: **te same klucze w każdym
rekordzie**, co do znaku. Literówka klucza w jednym rekordzie
(`"kwot"` zamiast `"kwota"`) nie zaboli przy tworzeniu — zaboli
`KeyError`-em dopiero w pętli, przy tym jednym obrocie. Dlatego kolejne
rekordy najbezpieczniej pisać, kopiując pierwszy i podmieniając wartości.

Pętla po tabeli to pętla po liście — zmienna pętli dostaje w każdym
obrocie CAŁY rekord (słownik), a w ciele sięgasz po pola:

```python
for wydatek in wydatki:
    print(f"{wydatek['nazwa']}: {wydatek['kwota']} zł")
```

Trzy linie wydruku, po jednej na rekord. A filtrowanie? Bramka z F3.2,
tylko warunek pyta o POLE rekordu — np. zbierz wydatki na jedzenie:
`if wydatek["kategoria"] == "jedzenie":` i w środku
`jedzenie.append(wydatek)` (do zbieracza trafiają całe rekordy).
Wszystkie wzorce z F2.5–F3.2 — suma, licznik, filtr, największy —
działają na tabeli identycznie; jedyna zmiana to `wydatek["kwota"]`
w miejscu gołego `wydatek`.

Backward completion (notebook F3.5 — ciało gotowe, dopisz nagłówek pętli
i bramkę: policz sumę wydatków na transport):

```python
suma_transport = 0
# dopisz tu nagłówek pętli po wydatki
# dopisz tu bramkę: kategoria równa "transport"
        suma_transport = suma_transport + wydatek["kwota"]
print(f"Transport: {suma_transport} zł")
```

(Struktura zdradza wcięcia: gotowa linia jest wcięta PODWÓJNIE — Twoje
dwie linie to piętro `for` i piętro `if`.)

### Pytania (retrieval)

**P1. `osoby = [{"imie": "Jan", "wiek": 30}, {"imie": "Ala", "wiek": 25}]`.
Co wypisze `print(osoby[1]["imie"])`?**

- A. Jan — *Nie — `osoby[1]` to DRUGI rekord (indeksy od zera — F2.2);
  Jan siedzi w `osoby[0]`.* (diagnoza: numeracja od jedynki, na tabeli)
- B. **Ala** ✓ — *Tak — krok 1: `osoby[1]` = drugi słownik; krok 2:
  `["imie"]` = wartość spod klucza.*
- C. `{"imie": "Ala", "wiek": 25}` — *Prawie — to wynik SAMEGO `osoby[1]`;
  ale łańcuszek idzie dalej i `["imie"]` wyjmuje już tylko jedno pole.*
  (diagnoza: zatrzymuje się po pierwszym kroku łańcuszka)
- D. `KeyError` — *Nie — klucz „imie" istnieje w rekordzie; błąd byłby
  przy literówce klucza, np. `["Imie"]` (F3.3-P3).* (diagnoza: błąd-dyżurny
  bez sprawdzenia klucza)

**P2. W pętli `for osoba in osoby:` chcesz wypisać wiek każdej osoby.
Który zapis w ciele jest poprawny?**

- A. `print(osoba[1])` — *Nie — `osoba` to SŁOWNIK, nie lista: w środku
  nie ma numerów, są klucze.* (diagnoza: indeks liczbowy na słowniku —
  najczęstsza kalka z listy)
- B. `print(osoby["wiek"])` — *Nie — `osoby` to LISTA (cała tabela);
  po kluczu sięgasz w pojedynczym rekordzie, czyli w zmiennej pętli.*
  (diagnoza: myli tabelę z rekordem — liczba mnoga vs pojedyncza)
- C. **`print(osoba["wiek"])`** ✓ — *Tak — zmienna pętli trzyma bieżący
  rekord; klucz wyjmuje z niego pole.*
- D. `print(wiek)` — *Nie — `wiek` nie jest samodzielną zmienną, tylko
  KLUCZEM w rekordzie; goła nazwa da `NameError`.* (diagnoza: klucz
  traktowany jak zmienna)

**P3. Filtr rekordów: `if wydatek["kwota"] > 20:` /
`drogie.append(wydatek)`. Co ląduje w `drogie`?**

- A. Same kwoty (liczby) — *Nie — append dokłada to, co mu podasz,
  a podano CAŁY rekord `wydatek`; kwoty zbierałby zapis
  `append(wydatek["kwota"])`.* (diagnoza: nie odróżnia rekordu od pola
  w geście zbierania)
- B. **Całe rekordy (słowniki) spełniające warunek** ✓ — *Tak — bramka
  pyta o pole, ale do zbieracza wpada cały wiersz tabeli: `drogie` to
  mniejsza tabela o tych samych kolumnach.*
- C. Wartości `True`/`False` — *Nie — wynik porównania steruje bramką
  (F1.6) i nigdzie się nie zapisuje; zbieracz dostaje rekordy.* (diagnoza:
  miesza warunek z zawartością)
- D. Nazwy wydatków — *Nie — po nazwę trzeba by sięgnąć jawnie
  (`wydatek["nazwa"]`); append nie wybiera pola za Ciebie.* (diagnoza:
  oczekuje domyślnego „reprezentanta" rekordu)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Piszesz dwa nagłówki-piętra, oba z dwukropkiem:
   pętla po tabeli (F2.3 — po czym iterujesz i jak nazwiesz rekord?
   ciało zdradza: `wydatek`) i bramka o pole `kategoria` (F3.2 + odczyt
   po kluczu z F3.3). Twoje linie stoją: pierwsza bez wcięcia, druga
   z pojedynczym wcięciem.
2. **Szkielet:**

   ```python
   for wydatek in ______:
       if wydatek[______] == ______:
           suma_transport = suma_transport + wydatek["kwota"]
   ```

3. **Pełne rozwiązanie z objaśnieniem:** `for wydatek in wydatki:` oraz
   `if wydatek["kategoria"] == "transport":`. Dla tabeli z teorii suma
   to `4.4` (jeden rekord transportu). Kontrola pięter: `for` bez
   wcięcia, `if` wcięty raz, sumowanie — dwa razy (należy do bramki).
   `KeyError: 'Kategoria'` → literówka klucza (F3.3-P3); suma 40.9
   (wszystko) → bramka wypadła z pętli albo sumowanie z bramki
   (wcięcia — F3.2-P2).

---

## Atom F3.6 — Gotowe agregaty: sum, min, max

**Typ:** `exercise` · **Czas studenta:** ~10 min · **Koncept:**
`agregaty-sum-min-max` · **Krok fadingu:** krótkie WE + zadanie
(przedostatni przystanek przed samodzielnością)

### Cel

Policzysz sumę, minimum i maksimum płaskiej listy liczb jedną funkcją —
i rozstrzygniesz, kiedy sięgnąć po gotowca, a kiedy wrócić do własnej
pętli z F2.5/F3.2.

### Teoria

Uczciwa wiadomość na koniec fundamentów: sumę listy liczb Python policzy
za Ciebie. **`sum(lista)`**, **`min(lista)`**, **`max(lista)`** to gotowe
funkcje wbudowane — czwarta z tej rodziny, `len`, służy Ci od F2.2.
Wszystkie robią to samo co Twoje pętle z F2.5/F3.2, tylko w jednym
słowie — a kod, który czyta się jak zdanie („suma kwot"), to kod,
w którym trudniej o błąd:

```python
kwoty = [120, 80, 45, 200, 15]
print(sum(kwoty))     # suma wszystkich
print(max(kwoty))     # największa
print(min(kwoty))     # najmniejsza
print(round(sum(kwoty) / len(kwoty), 2))   # średnia — złożenie gotowców
```

**Przewidź:** cztery wyniki?

`460`, `200`, `15`, `92.0`. Przyjrzyj się linii ze średnią: to cztery
znane klocki w jednym wyrażeniu — `sum` i `len` policzone osobno,
dzielenie między nimi (F1.2), całość opakowana w `round` (F2.1). Gotowce
komponują się jak każde funkcje: wynik jednego może być argumentem
drugiego, a całe wyrażenie zmieści się też w klamrze f-stringa.

Czemu więc męczyliśmy się z akumulatorem i śledzeniem największego? Bo gotowce mają granicę: działają na GOTOWEJ,
płaskiej liście liczb. Gdy warunek wybiera elementy (tylko „jedzenie"),
gdy elementy to rekordy (`wydatek["kwota"]`), gdy w jednym przejściu
liczysz trzy rzeczy naraz (F3.4) — wracasz do pętli. W praktyce
najczęstszy jest duet: pętlą z bramką ZBUDUJ listę kwot, które Cię
interesują (F3.1+F3.2), a potem oddaj ją gotowcowi:

```python
jedzenie_kwoty = []
for wydatek in wydatki:                       # tabela z F3.5
    if wydatek["kategoria"] == "jedzenie":
        jedzenie_kwoty.append(wydatek["kwota"])
print(sum(jedzenie_kwoty))                    # gotowiec na przefiltrowanym
```

Dwie pułapki gotowców: `sum`/`min`/`max` na liście z tekstem w środku to
`TypeError` (F1.1 — na tekstach się nie liczy), a `min`/`max` na liście
PUSTEJ to `ValueError` — gotowiec nie wie, co jest „najmniejsze wśród
niczego". `sum([])` zwraca grzecznie `0` (jak start akumulatora). Pusta
lista to przy filtrach normalny stan danych (bramka mogła nic nie
przepuścić — F2.3), więc przed `min`/`max` na wyniku filtra warto
sprawdzić `len`.

Ściąga decyzyjna na całą dalszą drogę: **płaska lista liczb → gotowiec;
warunek, rekordy albo kilka wyników z jednego przejścia → pętla** —
najczęściej w duecie: pętla buduje płaską listę, gotowiec ją zwija.
Tę ściągę zabierz ze sobą do mini-projektu — przyda się przy każdej
funkcji. Zadanie w notebooku F3.6: policz `min`, `max` i średnią swoich
pięciu ostatnich wydatków — trzy linijki, zero pętli.

### Pytania (retrieval)

**P1. `oceny = [3, 5, 2, 4]`. Co wypisze `print(sum(oceny))`?**

- A. 4 — *Nie — 4 to LICZBA elementów (len); sum dodaje wartości.*
  (diagnoza: sum mylone z len)
- B. **14** ✓ — *Tak — 3 + 5 + 2 + 4; jedna funkcja zamiast pętli
  z akumulatorem — na płaskiej liście liczb wolno iść na skróty.*
- C. 5 — *Nie — 5 to max; sum dodaje wszystkie.* (diagnoza: agregaty
  pomieszane)
- D. `[3, 5, 2, 4]` — *Nie — sum zwraca JEDNĄ liczbę, nie listę;
  agregacja zwija wiele wartości w jedną.* (diagnoza: nie odróżnia
  agregacji od przekształcenia listy)

**P2. Chcesz sumę kwot TYLKO z kategorii „transport" w tabeli rekordów.
Czy `sum(wydatki)` to zrobi?**

- A. Tak — sum sam znajdzie kwoty — *Nie — sum nie wie, co to „kwota"
  ani „transport": dodaje elementy listy wprost, a elementy są
  słownikami — będzie `TypeError`.* (diagnoza: gotowiec jako magia
  rozumiejąca dane)
- B. Tak, po dopisaniu warunku w nawiasie sum — *Nie — sum nie przyjmuje
  warunków; filtrowanie to praca bramki w pętli (F3.2), nie argument
  gotowca.* (diagnoza: zgaduje nieistniejącą składnię)
- C. **Nie — najpierw pętlą z bramką zbuduj listę kwot transportu
  (append), potem sum na tej liście** ✓ — *Tak — duet z teorii: filtr
  buduje płaską listę, gotowiec ją zwija.*
- D. Nie — trzeba zrezygnować z sum i wszystko liczyć pętlą — *Prawie —
  pętla faktycznie da radę sama (F3.5), ale duet filtr+sum jest równie
  poprawny i krótszy; gotowiec odpada tylko tam, gdzie lista nie jest
  płaską listą liczb.* (diagnoza: odrzuca gotowce w ogóle — druga
  skrajność)

**P3. `puste = []`. Co zrobią `sum(puste)` i `max(puste)`?**

- A. Oba zwrócą 0 — *Nie — sum owszem (0 to naturalny start sumowania),
  ale max nie ma „największego wśród niczego": `ValueError`.* (diagnoza:
  uogólnia łagodność sum na max)
- B. Oba zatrzymają program — *Nie — sum([]) grzecznie zwraca 0; to
  max/min wymagają choć jednego elementu.* (diagnoza: uogólnia w drugą
  stronę)
- C. **`sum(puste)` → 0; `max(puste)` → `ValueError`** ✓ — *Tak — suma
  niczego to zero, ale maksimum niczego nie istnieje. Przy danych
  z filtra warto pamiętać: pusta lista po bramce jest legalna (F2.3 —
  zero obrotów), a max na niej już nie.*
- D. `sum` → 0, `max` → `None` — *Nie — max nie oddaje None po cichu:
  zatrzymuje się głośnym ValueError (jak konwersje w F2.1).* (diagnoza:
  „ciche None" wstawione w złe miejsce)

### Drabinka hintów (zadanie z teorii)

1. **Koncepcyjny:** Trzy linijki, każda to print z jednym gotowcem na
   TWOJEJ liście pięciu kwot; średnia to sum podzielone przez len
   (duet z WE), opakowane w round do dwóch miejsc (F2.1).
2. **Szkielet:** `moje = [__, __, __, __, __]`, potem
   `print(min(moje))`, `print(max(moje))`,
   `print(round(______ / ______, 2))`.
3. **Pełne rozwiązanie z objaśnieniem:** np.
   `moje = [12.50, 45.00, 8.20, 120.00, 33.40]` →
   `min` 8.2, `max` 120.0, średnia `round(sum(moje) / len(moje), 2)` →
   `43.82`. `TypeError` przy sum → w liście został tekst (sprawdź
   cudzysłowy); `ValueError` przy max → lista pusta (nie uzupełniona).

---

## Atom F3.7 — MINI-PROJEKT „Tygodniowy raport wydatków" (pkt 12b)

**Typ:** `project` (pozycja projektu w F3 — plan 1E.1c; 3 kamienie
milowe) · **Czas studenta:** ~45–60 min · **Koncepty:** wszystkie z F1–F3
· **Krok fadingu:** w pełni samodzielny — sama specyfikacja

### Cel

Pierwsza samodzielna praca od zera do raportu: dostajesz opis danych
i wymagania, projektujesz strukturę, piszesz funkcje, wypisujesz raport.
Miara transferu fundamentów (M17) — dokładnie to, co przy capstone M-EDA,
w skali jednego wieczoru.

### Specyfikacja (notebook F3.7 — pusta komórka + pieczątka)

Zbuduj **raport swoich wydatków z tygodnia**:

1. **Dane** — lista `wydatki` z co najmniej **8 rekordami**; rekord to
   słownik z kluczami `"nazwa"` (tekst), `"kategoria"` (tekst; użyj
   co najmniej 3 różnych kategorii) i `"kwota"` (liczba). Dane wpisujesz
   w kod (bez input — raport ma być powtarzalny).
2. **Funkcja `suma_wszystkich(wydatki)`** — zwraca sumę pól `"kwota"`
   (pętla z akumulatorem albo append+sum — Twój wybór).
3. **Funkcja `suma_kategorii(wydatki, kategoria)`** — dwa parametry
   (F2.6): zwraca sumę kwot rekordów o podanej kategorii (bramka po polu
   — F3.5).
4. **Funkcja `najdrozszy(wydatki)`** — zwraca REKORD (cały słownik)
   o największej kwocie (śledzenie lidera — F3.2-P3; start od
   `wydatki[0]`).
5. **Raport** — wypisany f-stringami, kwoty przez `round(..., 2)`:
   suma tygodnia, suma dla każdej z Twoich kategorii (wywołania
   `suma_kategorii`), nazwa i kwota najdroższego wydatku, liczba pozycji
   (`len`).

**Kamienie milowe (weryfikacja AUTOMATYCZNA — pkt 11; 3 kamienie,
hak `configJson.checks` do 1E.6):**

- **K1 „Dane gotowe":** pieczątka sprawdza — `wydatki` to lista ≥8
  słowników, każdy ma komplet trzech kluczy, `"kwota"` liczbowa,
  ≥3 różne kategorie.
- **K2 „Funkcje liczą":** pieczątka wywołuje wszystkie trzy funkcje na
  WŁASNEJ próbnej tabeli (mechanizm z F2.7) i porównuje wyniki
  z niezależnie policzonymi; `najdrozszy` musi zwrócić rekord, nie kwotę.
- **K3 „Raport spójny":** pieczątka sprawdza spójność wartości —
  `suma_wszystkich(wydatki)` równa sumie wyników `suma_kategorii` po
  każdej kategorii, przy czym **listę kategorii pieczątka wyprowadza
  sama z DANYCH studenta** (nie z raportu, którego nie widzi) — i liczy
  token końcowy. Jawny limit: samego WYDRUKU raportu pieczątka nie widzi
  (klasa L0) — literówki kategorii w printach NIE wykryje; wydruk
  weryfikuje treściowo drabinka, a rubryka nie istnieje — mini-projekt
  świadomie bez oceny człowieka (pkt 12b: lekki, automatyczny).

Każdy kamień = zdarzenie postępu (ślad aktywności dla streaka — D3).

### Drabinka hintów

1. **Koncepcyjny:** To lab F3.4 + tabela F3.5 + funkcje F2.6, poskładane
   wg planu: najpierw dane (K1) i przetestuj SAMO `suma_wszystkich`
   printem; potem `suma_kategorii` (to samo + bramka + drugi parametr
   w warunku); potem `najdrozszy` (lider z F3.2-P3, tylko porównujesz
   `wydatek["kwota"] > lider["kwota"]`); raport na końcu. Krótkie pętle
   napisz–uruchom–sprawdź (L0.4) — nie pisz wszystkiego na raz.
2. **Szkielet (sięgnij dopiero, gdy hint 1 nie wystarczy):**

   ```python
   wydatki = [
       {"nazwa": ______, "kategoria": ______, "kwota": ______},
       # … ≥8 rekordów, ≥3 kategorie
   ]

   def suma_wszystkich(wydatki):
       suma = 0
       for wydatek in wydatki:
           suma = suma + ______
       return suma

   def suma_kategorii(wydatki, kategoria):
       suma = 0
       for wydatek in wydatki:
           if wydatek[______] == ______:
               suma = suma + wydatek["kwota"]
       return suma

   def najdrozszy(wydatki):
       lider = ______
       for wydatek in wydatki:
           if wydatek["kwota"] > ______:
               lider = wydatek
       return lider

   # raport: print-y f-stringami, kwoty w round(..., 2)
   ```

3. **Pełne rozwiązanie z objaśnieniem:** luki kolejno:
   `wydatek["kwota"]`; `"kategoria"` i `kategoria` (klucz w cudzysłowie
   to POLE rekordu, goły `kategoria` to PARAMETR funkcji — obok siebie
   w jednej linii, i właśnie o to chodzi); `wydatki[0]` oraz
   `lider["kwota"]`. Raport przykładowy:

   ```python
   print(f"Suma tygodnia: {round(suma_wszystkich(wydatki), 2)} zł")
   print(f"Jedzenie: {round(suma_kategorii(wydatki, 'jedzenie'), 2)} zł")
   top = najdrozszy(wydatki)
   print(f"Najdroższy: {top['nazwa']} — {round(top['kwota'], 2)} zł")
   print(f"Pozycji: {len(wydatki)}")
   ```

   Diagnostyka końcowa: K2 czerwone przy zielonym Twoim teście →
   funkcja czyta globalną `wydatki` zamiast SWOJEGO parametru (pętla po
   parametrze! — lekcja z F2.7); `najdrozszy` zwraca liczbę → return
   `lider`, nie `lider["kwota"]`; K3 czerwone → `suma_kategorii` liczy
   na Twoich danych inaczej niż powinna (np. bramka porównuje inny klucz
   niż `"kategoria"`). Uwaga: literówki kategorii W RAPORCIE (np.
   `'jedzenei'` w princie — kwota wyjdzie zaniżona) pieczątka NIE
   wykryje — porównaj nazwy kategorii w printach z danymi sam(a),
   zanim uznasz raport za skończony.

---

## Egzamin modułu F3 (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**;
2 warianty izomorficzne (cap 2); retry z drugim wariantem; po 2. oblaniu
correctives; „zarezerwuj ~25 min"; pokrycie 3 × 5 atomów; kalibracja
OSOBNA, łatwiejsza niż atomowa (przy WE). Format jak F1/F2.

**E1** · A: `lista = [1, 2]`; `lista.append(3)`. Jak wygląda lista? —
`[3, 1, 2]` / **`[1, 2, 3]`** / `[1, 2]` / `[3]` — *append dokleja na
koniec.* · B: `lista = [7, 8]`; `lista.append(9)`. Jak wygląda lista? —
`[9, 7, 8]` / **`[7, 8, 9]`** / `[7, 8]` / `[9]` — *jak w A.*
→ `append-budowanie-listy` → F3.1

**E2** · A: Co trafi do `w` po `w = zakupy.append("ser")`? — powiększona
lista / `"ser"` / **`None`** / błąd — *append zwraca None; wyniku się nie
przypisuje.* · B: Co trafi do `w` po `w = oceny.append(5)`? — powiększona
lista / `5` / **`None`** / błąd — *jak w A.* → `append-budowanie-listy`
→ F3.1

**E3** · A: `x = []`; `for n in [1, 2]:` / (wcięte) `x.append(n * 5)`.
Co jest w `x`? — `[1, 2]` / **`[5, 10]`** / `[10]` / `None` — *dwa obroty,
każdy dokłada wynik n·5.* · B: `x = []`; `for n in [3, 4]:` / (wcięte)
`x.append(n * 2)`. Co jest w `x`? — `[3, 4]` / **`[6, 8]`** / `[8]` /
`None` — *jak w A.* → `append-budowanie-listy` → F3.1

**E4** · A: `ile = 0`; `for n in [4, 9, 12, 2]:` / (wcięte) `if n > 5:` /
(podwójnie wcięte) `ile = ile + 1`. Ile wyniesie `ile`? — 4 / **2** / 21 /
0 — *bramkę przechodzą 9 i 12.* · B: to samo nad `[7, 3, 8, 1]` z bramką
`> 5` — 4 / **2** / 15 / 0 — *przechodzą 7 i 8.*
→ `if-w-petli-filtrowanie` → F3.2

**E5** · A: `duze = []`; pętla po `[120, 40, 300]` z bramką `> 100`
i `duze.append(n)`. Co jest w `duze`? — `[120, 40, 300]` /
**`[120, 300]`** / `[40]` / `2` — *do zbieracza wpadają tylko elementy
przepuszczone bramką.* · B: `male = []`; pętla po `[15, 90, 8]` z bramką
`< 20` i append. Co jest w `male`? — `[15, 90, 8]` / **`[15, 8]`** /
`[90]` / `2` — *jak w A.* → `if-w-petli-filtrowanie` → F3.2

**E6** · A: Śledzenie największego: skąd bezpieczny START lidera? — od 0 /
**od pierwszego elementu listy** / od ostatniego elementu / od 100 —
*zero zawodzi przy danych ujemnych; pierwszy element nie zakłada nic.* ·
B: Bramka śledzenia największego to: — `if element == lider:` /
**`if element > lider:`** / `if element < lider:` / bez bramki, nadpisuj
co obrót — *wpuszczamy tylko nowych rekordzistów.*
→ `if-w-petli-filtrowanie` → F3.2

**E7** · A: `auto = {"marka": "Fiat", "rok": 2015}`. Co wypisze
`print(auto["rok"])`? — `"rok"` / **2015** / 1 / `KeyError` — *odczyt po
kluczu zwraca wartość spod niego.* · B: `dom = {"miasto": "Radom",
"pokoje": 3}`. Co wypisze `print(dom["pokoje"])`? — `"pokoje"` / **3** /
1 / `KeyError` — *jak w A.* → `slownik-klucz-wartosc` → F3.3

**E8** · A: `ceny = {"kawa": 12}`; wykonujesz `ceny["sok"] = 6`. Efekt? —
`KeyError` / podmiana ceny kawy / **dopisana para: sok → 6** /
`SyntaxError` — *zapis pod nowy klucz dopisuje parę.* · B:
`stany = {"drzwi": "otwarte"}`; wykonujesz `stany["okno"] = "zamknięte"`.
Efekt? — `KeyError` / podmiana wartości drzwi / **dopisana para: okno →
zamknięte** / `SyntaxError` — *jak w A.* → `slownik-klucz-wartosc` → F3.3

**E9** · A: `p = {"nazwa": "sok"}`; wykonujesz `print(p["cena"])`. Co się
stanie? — wypisze `None` / wypisze 0 / **`KeyError: 'cena'`** / dopisze
klucz — *odczyt brakującego klucza to głośny błąd.* · B:
`u = {"login": "ala"}`; wykonujesz `print(u["haslo"])`. Co się stanie? —
wypisze `None` / wypisze pusty tekst / **`KeyError: 'haslo'`** / dopisze
klucz — *jak w A.* → `slownik-klucz-wartosc` → F3.3

**E10** · A: `koty = [{"imie": "Mruczek"}, {"imie": "Filemon"}]`. Co
wypisze `print(koty[0]["imie"])`? — **Mruczek** / Filemon / `{"imie":
"Mruczek"}` / `KeyError` — *krok 1: rekord 0; krok 2: pole imie.* · B:
`psy = [{"imie": "Burek"}, {"imie": "Azor"}]`. Co wypisze
`print(psy[1]["imie"])`? — Burek / **Azor** / `{"imie": "Azor"}` /
`KeyError` — *rekord 1 = drugi.* → `lista-slownikow-rekordy` → F3.5

**E11** · A: W pętli `for produkt in produkty:` po tabeli rekordów —
jak wypisać pole „cena" bieżącego rekordu? — `print(produkty["cena"])` /
**`print(produkt["cena"])`** / `print(produkt[0])` / `print(cena)` —
*po kluczu sięgasz w zmiennej pętli (rekordzie).* · B: W pętli
`for osoba in osoby:` — jak wypisać pole „imie" bieżącego rekordu? —
`print(osoby["imie"])` / **`print(osoba["imie"])`** / `print(osoba[0])` /
`print(imie)` — *jak w A.* → `lista-slownikow-rekordy` → F3.5

**E12** · A: Bramka `if r["typ"] == "auto":` i `wybrane.append(r)` —
co jest w `wybrane` po pętli? — kwoty / **całe rekordy z typem auto** /
True/False / nazwy typów — *append dokłada to, co podano: cały rekord.* ·
B: Bramka `if r["rok"] > 2020:` i `nowe.append(r)` — co jest w `nowe`?
— lata / **całe rekordy z rokiem > 2020** / True/False / liczba rekordów
— *jak w A.* → `lista-slownikow-rekordy` → F3.5

**E13** · A: `kwoty = [10, 25, 5]`. Co zwróci `sum(kwoty)`? — 3 / **40** /
25 / `[10, 25, 5]` — *sum dodaje wartości.* · B: `pkt = [8, 2, 30]`.
Co zwróci `sum(pkt)`? — 3 / **40** / 30 / `[8, 2, 30]` — *jak w A.*
→ `agregaty-sum-min-max` → F3.6

**E14** · A: `ceny = [12, 7, 30]`. Co zwrócą `max(ceny)` i `min(ceny)`? —
30 i 12 / **30 i 7** / 3 i 1 / 49 i 7 — *max największa, min najmniejsza.*
· B: `wagi = [5, 22, 9]`. Co zwrócą `max(wagi)` i `min(wagi)`? — 22 i 9 /
**22 i 5** / 3 i 1 / 36 i 5 — *jak w A.* → `agregaty-sum-min-max` → F3.6

**E15** · A: Suma kwot TYLKO wybranej kategorii z tabeli rekordów — jak? —
`sum(wydatki)` wprost / sum z warunkiem w nawiasie / **pętla z bramką
buduje listę kwot, potem sum** / rezygnacja z sum, bo tabele wykluczają
gotowce — *filtr buduje płaską listę, gotowiec ją zwija.* · B:
`sum(tabela_rekordow)` wykonane wprost na liście słowników — co się
stanie? — policzy kwoty / zwróci 0 / **`TypeError` — elementy nie są
liczbami** / `KeyError` — *sum dodaje elementy wprost, a to słowniki.*
→ `agregaty-sum-min-max` → F3.6

---

## Strona „Pierwsza pomoc — F3" (D5a, statyczna, per moduł)

Strony L0/F1/F2 obowiązują nadal. Przyrost F3:

1. **`AttributeError: 'NoneType' object has no attribute 'append'`** →
   gdzieś wcześniej stało `lista = lista.append(...)` — do nazwy trafił
   `None`. Popraw na samo `lista.append(...)` i uruchom komórki od góry
   (F3.1).
2. **`KeyError: '…'`** → komunikat pokazuje dosłownie klucz z Twojego
   odczytu: porównaj go znak po znaku z kluczem w danych (wielkość liter!).
   Jeśli klucz ma dopiero powstać — to zapis (`d[klucz] = …`), nie odczyt
   (F3.3).
3. **Filtr „przepuszcza wszystko" albo „nic"** → wcięcia: gest musi być
   wcięty PODWÓJNIE (należy do if w for); pojedyncze wcięcie = wykonuje
   się co obrót (F3.2-P2). „Nic" — sprawdź kierunek znaku w bramce.
4. **`TypeError` przy `sum`/`min`/`max`** → lista nie jest płaską listą
   liczb: został tekst w cudzysłowie albo podajesz tabelę rekordów —
   najpierw zbuduj listę kwot (F3.6).
5. **`ValueError` przy `max`/`min` z informacją o pustym argumencie**
   (brzmienie zależy od wersji Pythona: od 3.12 „iterable argument is
   empty", wcześniej „arg is an empty sequence") → lista pusta — zwykle
   bramka nic nie przepuściła; to legalny stan danych, który Twój program
   musi przewidzieć (np. sprawdź `len` przed max) (F3.6).
6. **Suma kategorii = suma wszystkiego** → bramka wypadła z pętli albo
   sumowanie z bramki (piętra wcięć — F3.5); albo funkcja czyta globalną
   tabelę zamiast parametru (F2.7/mini-projekt).
7. **`TypeError` z frazą „unhashable type" przy słowniku** (dokładne
   brzmienie zależy od wersji Pythona) → słownik wylądował w miejscu
   KLUCZA (np. `d[rekord]` zamiast `d[rekord["nazwa"]]`) — kluczem bywa
   tekst/liczba, nie cały rekord.
8. **W f-stringu `SyntaxError` przy odczycie pola** → cudzysłowy się
   zderzyły: wewnątrz f-stringa z podwójnymi cudzysłowami klucz ujmij
   w pojedyncze — `f"{r['nazwa']}"` (F3.3, drabinka).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://docs.python.org/pl/3/tutorial/datastructures.html | Oficjalny tutorial Pythona po polsku — „5. Struktury danych": 5.1 metody list (append), 5.5 Słowniki | kanon | PSF (dokumentacja Pythona) | PL | nie | 2026-07-11 (HTTP 200; treść w pełni PL — zweryfikowana, nie fallback) |
| https://www.youtube.com/watch?v=eB3r2NQwNi4 | „Python od podstaw [2024]" (Jak nauczyć się programowania) — rozdziały F3: listy 2:13:53, słowniki 2:38:22; list słowników/rekordów wideo NIE pokrywa (tylko teoria atomu F3.5) | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | PL | nie | 2026-07-11 (timestampy z opisu wideo; seans kontrolny Sophii przed ingest) |

Sedno F3 w całości w polskiej teorii atomów; zasoby = pogłębienie (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0–F2

| Termin | Po polsku |
|---|---|
| metoda / *method* | polecenie przypięte do wartości, wywoływane po kropce (`lista.append(...)`) |
| `.append(x)` | doklej x na koniec listy (zmienia listę w miejscu; zwraca `None`) |
| `AttributeError` | „ta wartość nie ma takiej metody" — częsty ślad po `lista = lista.append(...)` |
| słownik / *dictionary* (`dict`) | przegródki podpisane kluczami: `{"klucz": wartość}` |
| klucz / *key* | podpis przegródki słownika (najczęściej tekst) |
| `KeyError` | odczyt klucza, którego nie ma w słowniku |
| `in` (dla słownika) | pytanie „czy klucz istnieje?" — zwraca True/False |
| rekord / *record* | jeden słownik w liście słowników = wiersz tabeli |
| `sum` / `min` / `max` | gotowe agregaty dla płaskiej listy liczb |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** F3.1 → F3.2 → F3.3 → F3.4 (lab) →
  F3.5 → F3.6 → **F3.7 (`kind='project'` — MINI-PROJEKT pkt 12b,
  3 kamienie w `configJson.checks`)** → przegląd przed egzaminem (reuse)
  → egzamin. Modelowanie atomów jak F1/F2 (potwierdzenie przy spec JSON).
- **Kamienie mini-projektu:** K1 walidacja struktury danych, K2 wywołanie
  trzech funkcji studenta na próbnej tabeli pieczątki (rozszerzenie
  mechanizmu F2.7 na wiele funkcji), K3 spójność sum (całość = suma po
  kategoriach WYPROWADZONYCH z danych studenta — nie z raportu).
  Wszystko deterministyczne, 0 LLM, bez sandboxa; każdy kamień =
  zdarzenie postępu (streak — D3/D9). Nota inżynierska: porównania sum
  w K2/K3 przez tolerancję `abs(x - y) < 0.01`, NIE przez `round(...) ==`
  (kolejność dodawania floatów umie fałszywie oblać na granicy).
  Jawny limit: wydruk raportu nieweryfikowany (klasa L0 — literówki
  kategorii w printach niewykrywalne, drabinka o tym uprzedza), rubryki
  i oceny człowieka BRAK (pkt 12b — lekki, automatyczny).
- **1 koncept = 1 atom — deklaracja dla F3.2 (standard L0.2/F2.1):**
  koncept to JEDNA konstrukcja „bramka w pętli"; zliczanie/filtr/lider to
  trzy zastosowania, nie trzy koncepty — ale lider (odmiana 3) ma własną
  mikro-strukturę (start od `[0]`), więc odnotowuję do oceny w standardzie
  QG-5. Egzamin testuje wszystkie trzy odmiany (E4–E6).
- **Odwołana obietnica:** `while`/`range()` poza F3 (zasady modułu) —
  pierwszy kandydat M-ML; wpis, żeby moduły projektowe wiedziały, że
  drabina tych konstrukcji NIE uczy.
- **Egzamin:** 15 pytań / ≤1 błąd / 2 warianty; mapowanie 15/15.
  **Do monitorowania w D11 (precedens E11 z F2): E6** — warianty A/B
  testują dwa różne aspekty odmiany „lider" (start vs bramka) i są
  koncepcyjne („dlaczego"), nie „przy WE"; jeśli success rate odstaje —
  kandydat do przepisania na parę izomorficzną.
- **1 koncept = 1 atom — deklaracja dla F3.6 (spójnie z F3.2):** jedna
  rodzina wbudowanych agregatów o identycznej składni (`sum`/`min`/`max`)
  = jeden koncept; egzamin E13–E15 testuje rodzinę, nie trzy osobne
  umiejętności.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie F3.1–F3.6 =
  357–385 słów z blokami kodu, 305–311 bez nich — w widełkach przy obu
  metodach (standard L0–F2; marginesy zdrowsze niż w F2).
- **TODO przed ingest 1E.2:**
  1. Budowa 8 notebooków F3 (w tym pieczątka wielofunkcyjna K2
     mini-projektu — test mechanizmu przy budowie).
  2. Seans kontrolny fragmentów wideo (listy 2:13:53, słowniki 2:38:22) —
     tłumaczenie datastructures.html i timestampy zweryfikowane (research
     2026-07-11). Uwaga wersyjna: komunikat `max([])` różni się między
     Pythonem ≤3.11 a ≥3.12 (treść cytuje ostrożnie — pierwsza pomoc
     poz. 5); przy budowie notebooków sprawdzić wersję Pythona w Colab.
  3. Audyt pojemności D10 po ukończeniu F1–F3: koncepty wymagane rubryką
     capstone'u M-EDA MINUS koncepty drabiny L0→F3 — bilans wejdzie do
     planowania atomów M-EDA (API/JSON/pandas/Git są PO stronie M-EDA).

## Przebieg QG tego dokumentu (2026-07-11)

Draft → samodzielne wykonanie wszystkich snippetów w Pythonie przez autora
(łącznie z pełnym rozwiązaniem mini-projektu i checkami K1–K3; wyłapane
przed przeglądem: niestabilne między wersjami brzmienie `TypeError`
„unhashable type" — cytowane ostrożnie) → **2 agentów weryfikacyjnych
(Fable 5)**: (1) przegląd zgodności z ADR-014 z wykonaniem **64/64 checków
wartości + 7/7 komunikatów błędów** — ZERO znalezisk krytycznych; 2 WAŻNE
(diagnostyka K3 w drabince obiecywała detekcję literówek raportu, której
mechanizm nie ma — przepisana na prawdziwą + jawne źródło listy kategorii
w definicji kamienia; pomiary budżetów wpisane), 5 drobnych — wcielone
(w tym nota inżynierska: tolerancja float w K2/K3 zamiast `round ==`;
E6 dopisane do monitoringu D11 obok E11 z F2; bundling agregatów F3.6
zadeklarowany); mini-projekt potwierdzony jako zgodny z pkt 12b (lekki,
automatyczny, 3 kamienie w widełkach D3, wykonalny wyłącznie materiałem
drabiny); ciągłość L0→F3 i spłata/odwołanie obietnic F2 potwierdzone
referencja po referencji; werdykt „gotowe po poprawkach";
(2) research zasobów — datastructures.html w pełni PL (sekcje 5.1 append
i 5.5 Słowniki), timestamp słowników w wideo (2:38:22), ustalona
NIESTABILNOŚĆ komunikatu `max([])` między Pythonem ≤3.11 a ≥3.12
(zmiana w 3.12.0, zweryfikowana w źródłach CPython) — treść cytuje
ostrożnie, uwaga wersyjna w TODO budowy notebooków.
