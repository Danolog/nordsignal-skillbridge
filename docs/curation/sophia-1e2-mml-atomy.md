# 1E.2 · Moduł M-ML „Pierwszy model predykcyjny" — treść atomów + rampa capstone'u

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z pełnym przepływem w sklearn
1.6.1 i 1.9.0 — zero krytyków + research zasobów PL; przebieg na końcu
dokumentu); przed ingest 1E.2: TODO z notatek (notebooki, seanse wideo,
odporność kamienia K2 przy 1E.6).
**Podstawa:** ADR-014 D1/D3/D5/D6.5; prerekwizyt: **M-SQL zaliczony**
(cała analityka danych L0→M-SQL; capstone ML używa pandas z M-PD,
Gita z EDA.2, formy Ograniczeń z EDA.3).
**Środowisko (zweryfikowane 2026-07-11):** scikit-learn **1.6.1
preinstalowany w Colab** (backend-info); WSZYSTKIE wartości liczbowe
treści wykonane w 1.6.1 ORAZ najnowszym (1.9.0) — identyczne
(deterministyczne przez `random_state`).

## Audyt pojemności D10

Dekompozycja rubryki (`ds-pierwszy-model-predykcyjny`: baseline 20,
walidacja+leakage 25, dobór metryk 20, analiza błędów 15,
repro+Ograniczenia 20) + przepływu projektu:

| # | Koncept wymagany | Pokrycie |
|---|---|---|
| M1 | model = funkcja z danych: cechy X, cel y, fit/predict, `random_state` | **NOWY → ML.1** |
| M2 | podział train/test + zakaz oceny na treningu (objaw overfittingu) | **NOWY → ML.2** |
| M3 | baseline (klasa większościowa / średnia) PRZED modelem | **NOWY → ML.3** |
| M4 | metryki: pułapka accuracy, precision/recall/F1 + macierz pomyłek (analiza błędów) | **NOWY → ML.5** (bundling metryki+macierz — deklaracja w notatkach; MAE/RMSE dla regresji = rider-wzmianka) |
| M5 | leakage (3 grzechy) + sekcja Ograniczenia | **NOWY → ML.6** |
| M6 | seed/reprodukowalność | `random_state` w ML.1/ML.2 (spłata wymogu rubryki wprost) + EDA.2 (repo/README) |
| M7 | teoria bias/wariancja/overfitting „dlaczego" | briefing `theory_md` projektu — atomy uczą JAK, esej zostaje (anty-redundancja) |

**Bilans: 5 nowych atomów — w widełkach D1, bez podziału modułu.**
Obietnica `while`/`range()` (odwołana w F3 „pierwszy kandydat M-ML"):
M-ML też ich NIE potrzebuje (scikit-learn liczy bez pętli studenta) —
odwołanie podtrzymane, wejdą just-in-time, gdy zadanie zapyta
(kandydat: iteracja po przykładach w M-LLM zwykłym `for` z F2.3 — bez
nowej składni).

---

## Zasady modułu M-ML

- **Struktura:** 5 atomów `exercise` + 2 laby + **egzamin 15 × 2, próg
  ≤1 błąd** + przegląd przed egzaminem + **capstone** (position 100
  w drabinie). Zaliczenia jak w poprzednich modułach.
- **Dane przewodnie:** mini-świat przejazdów z M-SQL rozszerzony
  o kolumnę celu — **„czy pasażer zostawił napiwek"** (24 rekordy,
  niezbalansowane 17:7, wpisane w notebook; deterministyczne).
  Capstone przenosi wzorce na UCI Online Retail / BDL.
- **Wartości liczbowe w treści są WYKONANE, nie wymyślone** (split
  18/6 przy `random_state=42`; baseline 0.667; drzewo: trening 1.0,
  test 0.833; macierz [[1,1],[0,4]]; precision 0.8 / recall 1.0 /
  F1 0.889) — identyczne w sklearn 1.6.1 i 1.9.0.
- **Fading (D5a):** ML.1–ML.2 pełne WE → ML.3 completion → ML.4
  lab-szkielet → ML.5 luki w środku → ML.6 backward (student pisze
  sekcję Ograniczeń do gotowego raportu) → ML.7 lab samodzielny →
  capstone z rubryką.
- **Koncepty kluczowe (≤4 — D6.3):** `train-test-podzial` (ML.2),
  `baseline-punkt-odniesienia` (ML.3), `metryki-macierz-pomylek`
  (ML.5), `leakage-uczciwosc-ewaluacji` (ML.6). ML.1
  (`model-fit-predict`) — koncept zwykły, utrwalany wszędzie.
- **Przegląd przed egzaminem (reuse):** PD.5-P3, PD.6-P3, EDA.3-P1,
  SQL.5-P3, ML.1-P2, ML.2-P1, ML.2-P3, ML.3-P2, ML.5-P1, ML.6-P2
  (10 pytań).
- **Sesja i czas:** 9 pozycji ≈ 4–5 sesji; capstone ~6 h estymaty
  (najdłuższy dotąd — rubryka o pięciu kryteriach).

---

## Atom ML.1 — Model: funkcja, której nie piszesz — dopasowujesz ją z danych

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`model-fit-predict` · **Krok fadingu:** pełne WE

### Cel

Wytrenujesz pierwszy model (`fit`), użyjesz go do przewidywania
(`predict`) i nazwiesz role danych: cechy X, cel y — plus parametr
`random_state`, od którego zależy powtarzalność.

### Teoria

Wszystko, co dotąd liczyłeś(-aś), było WSTECZ: sumy, średnie, trendy —
opis tego, co już się zdarzyło. **Model predykcyjny** patrzy W PRZÓD:
na podstawie znanych przykładów przewiduje wynik dla nowych. Funkcji
przewidującej nie piszesz sam(a) — każesz jej się DOPASOWAĆ do danych.

Słownictwo ról: **cechy** (X) to kolumny-wejścia (u nas: minuty, kwota,
godzina przejazdu); **cel** (y) to kolumna-wyjście, którą chcemy
przewidywać (u nas: `napiwek` — 1 był, 0 nie było). Przewidywanie
kategorii tak/nie to **klasyfikacja**; przewidywanie liczby (np. kwoty)
to **regresja** — capstone pozwoli wybrać, atomy ćwiczą klasyfikację.

```python
from sklearn.tree import DecisionTreeClassifier

X = df[["minuty", "kwota", "godzina"]]   # cechy: tabela (PD.3 — podwójne nawiasy!)
y = df["napiwek"]                        # cel: seria

model = DecisionTreeClassifier(random_state=42)   # drzewo decyzyjne + ziarno
model.fit(X, y)                                   # TRENING: dopasuj się do przykładów
model.predict(pd.DataFrame([{"minuty": 10, "kwota": 18.0, "godzina": 23}]))
```

**Przewidź:** co zwróci ostatnia linia — tekst, liczbę, tabelę?

Przewidzianą klasę dla nowego przejazdu — u nas `0` („bez napiwku" dla
krótkiego nocnego kursu). Rozbiór:

- **`fit(X, y)`** to trening: model ogląda przykłady i dopasowuje swoje
  wewnętrzne reguły (drzewo decyzyjne buduje serię pytań o cechy —
  pierwsze pytanie NASZEGO wytrenowanego drzewa brzmi „kwota ≤ 20?" —
  aż rozdzieli klasy). Ty reguł nie piszesz.
- **`predict(nowe_X)`** to użycie: podajesz cechy BEZ celu, model
  odpowiada przewidywaniem. Wejście musi mieć te same kolumny co
  trening — i musi być tabelą (dlatego nowy przejazd pakujemy
  w DataFrame).
- **`random_state=42`** to **ziarno** (ang. *seed*): wiele algorytmów
  losuje (np. przy remisach), a ziarno mrozi losowość — ten sam kod,
  te same dane, TEN SAM wynik u Ciebie, u recenzenta i za tydzień.
  Rubryka capstone'u wymaga seeda wprost; liczba jest dowolna (42 to
  tradycja), liczy się jej OBECNOŚĆ i stałość.

Czemu na start drzewo decyzyjne? Bo jego reguły da się przeczytać
(seria pytań o cechy), a rytm `fit`/`predict` jest wspólny dla CAŁEJ
rodziny modeli scikit-learn — nauczywszy się go raz, wymieniasz model
jedną linijką, resztą przepływu bez zmian. Uwaga na proporcje: w tym
atomie model trenuje i przewiduje na tych samych danych — to celowo
NAIWNE. Czy takiemu przewidywaniu można
wierzyć i jak to uczciwie sprawdzić — o tym są WSZYSTKIE następne atomy;
ten daje tylko mechanikę.

### Pytania (retrieval)

**P1. Co robi `model.fit(X, y)`?**

- A. Przewiduje wyniki dla X — *Nie — przewiduje `predict`; fit to
  TRENING: dopasowanie reguł modelu do znanych par cechy→cel.*
  (diagnoza: myli dwie fazy życia modelu)
- B. **Dopasowuje wewnętrzne reguły modelu do przykładów z X i y** ✓ —
  *Tak — po fit model „umie"; przed fit jest pustą formą (próba predict
  przed fit → NotFittedError).*
- C. Sprawdza jakość modelu — *Nie — ocena jakości to osobny krok
  (metryki — ML.5) i osobne dane (ML.2).* (diagnoza: wciska ewaluację
  w trening — grzech, który ML.6 nazwie po imieniu)
- D. Czyści dane z braków — *Nie — czyszczenie to Twoja praca PRZED
  modelem (PD.5); fit zakłada dane gotowe.* (diagnoza: model jako
  magiczny odkurzacz)

**P2. Do czego służy `random_state`?**

- A. Poprawia trafność modelu — *Nie — ziarno nie zmienia jakości;
  zamraża LOSOWOŚĆ, żeby wynik był powtarzalny.* (diagnoza: myli
  powtarzalność z jakością)
- B. **Mrozi losowość: ten sam kod i dane dają ten sam wynik — u Ciebie,
  u recenzenta, za tydzień** ✓ — *Tak — to jest „ustawiony seed"
  z rubryki; bez niego wyniki potrafią się różnić między uruchomieniami.*
- C. Wybiera najlepszą wartość losowania — *Nie — nie ma „najlepszego"
  ziarna; 42 czy 7 — byle stałe i zapisane.* (diagnoza: szuka
  optymalizacji w parametrze powtarzalności)
- D. Jest wymagany, inaczej kod nie ruszy — *Nie — bez niego kod działa,
  tylko wyniki bywają niepowtarzalne; wymaga go RUBRYKA, nie składnia.*
  (diagnoza: przymus składniowy vs wymóg rzetelności)

**P3. Model wytrenowany na kolumnach minuty/kwota/godzina. Co podajesz
do `predict`, żeby przewidzieć napiwek dla nowego przejazdu?**

- A. Cechy + oczekiwany napiwek — *Nie — gdybyś znał(a) napiwek, nie
  potrzebowałbyś przewidywania; predict dostaje SAME cechy.* (diagnoza:
  nie rozdziela wejścia od wyjścia)
- B. **Tabelę z tymi samymi kolumnami cech: minuty, kwota, godzina** ✓ —
  *Tak — ten sam kształt wejścia co przy treningu, bez kolumny celu.*
- C. Cokolwiek — model się domyśli — *Nie — inne kolumny to błąd;
  model zna dokładnie ten kształt danych, na którym trenował.*
  (diagnoza: magiczna elastyczność)
- D. Całą tabelę treningową jeszcze raz — *Nie — to by „przewidziało"
  przeszłość, którą już znasz; sens predykcji to NOWE przypadki (a ocena
  na treningu to osobny grzech — ML.2).* (diagnoza: brak rozróżnienia
  stare/nowe dane)

### Drabinka hintów

1. **Koncepcyjny:** Rytm życia modelu: przygotuj X (tabela cech —
   podwójne nawiasy z PD.3) i y (seria celu) → `fit` raz → `predict`
   ile chcesz. Ziarno wpisz od pierwszej linii — nawyk, nie ozdoba.
2. **Szkielet:** W notebooku ML.1: uruchom WE; potem przewidź napiwek
   dla WŁASNEGO wymyślonego przejazdu (zmień trzy liczby w predict).
   Na koniec celowo wywołaj `predict` na ŚWIEŻYM, niewytrenowanym
   modelu — obejrzyj `NotFittedError` (rytuał z L0.3).
3. **Pełne rozwiązanie z objaśnieniem:** `NotFittedError: This
   DecisionTreeClassifier instance is not fitted yet…` — model przed
   fit to pusta forma; kolejność fit→predict jest bezwzględna.
   `ValueError: could not convert string to float` przy fit → w X
   została kolumna tekstowa (drzewo liczy na liczbach; kolumny
   tekstowe wymagają przygotowania — poznasz je, gdy capstone zapyta,
   na atomach cechy są liczbowe). Przewidywanie dla Twojego przejazdu
   może wyjść 0 albo 1 — oba poprawne składniowo; czy im WIERZYĆ,
   rozstrzygną następne atomy.

---

## Atom ML.2 — Uczciwy sprawdzian: dane, których model nie widział

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`train-test-podzial` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Podzielisz dane na trening i test (`train_test_split`), zobaczysz
podręcznikowy objaw overfittingu (100% na treningu, mniej na teście)
i przyjmiesz zasadę: oceniaj wyłącznie na danych spoza treningu.

### Teoria

Sprawdzian, do którego znasz odpowiedzi, nie mierzy wiedzy. Model
oceniany na danych TRENINGOWYCH ma dokładnie taki sprawdzian — mógł
zapamiętać przykłady zamiast nauczyć się prawidłowości (briefing nazywa
to overfittingiem). Uczciwa ocena wymaga danych, których model nie
widział — dlatego PRZED treningiem odkładasz część na bok:

```python
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.25, random_state=42   # 25% na test, ziarno = powtarzalność
)
model = DecisionTreeClassifier(random_state=42)
model.fit(X_tr, y_tr)                        # trening WYŁĄCZNIE na części treningowej

print(accuracy_score(y_tr, model.predict(X_tr)))   # trafność na treningu
print(accuracy_score(y_te, model.predict(X_te)))   # trafność na TEŚCIE
```

**Przewidź:** 24 przejazdy, `test_size=0.25` — ile trafi do treningu,
ile do testu? I która z dwóch trafności będzie wyższa?

18 do treningu, 6 do testu. Trafności: **1.0 na treningu, 0.833 na
teście** — i to jest najważniejsza para liczb tego modułu. Drzewo bez
ograniczeń zapamiętało trening PERFEKCYJNIE (100%), ale na nowych
danych myli się w 1 przypadku na 6. Gdybyś ocenił(a) model na treningu,
ogłosiłbyś nieomylność — która nie istnieje. **Objaw overfittingu:
świetnie na treningu, słabiej na teście; miara prawdy jest jedna —
test.**

Mechanika `train_test_split`: dzieli LOSOWO (stąd `random_state` —
bez ziarna każde uruchomienie da inny podział i inne wyniki).
`test_size=0.25` to kompromis, który warto rozumieć: większy test =
stabilniejsza ocena, ale mniej danych do nauki; mniejszy test = model
uczy się na większości, ale ocena chwieje się na kilku przykładach
(u nas: 6 przykładów ⇒ jedna pomyłka zmienia wynik o 0.167!). Decyzję
o proporcji zapisz w raporcie jednym zdaniem, z uzasadnieniem. Rubryka dopuszcza też **k-fold** —
wielokrotny podział z uśrednieniem ocen, stabilniejszy przy małych
zbiorach; atomy trzymają się pojedynczego podziału (prostszy
i wystarczający), a k-fold poznasz z briefingu, jeśli capstone o niego
poprosi. Cztery wyniki podziału nazywaj
konwencją `X_tr, X_te, y_tr, y_te` — cudzy kod i dokumentacja używają
tych ról wszędzie.

Od tego atomu obowiązuje żelazna kolejność: **podział → trening na
części treningowej → ocena na testowej.** Wszystko, co „uczy się"
z danych — na czele z samym modelem — może oglądać wyłącznie trening;
test jest zapieczętowany do momentu oceny. (Co jeszcze „uczy się"
z danych i jak łatwo złamać pieczęć nieumyślnie — ML.6.)

### Pytania (retrieval)

**P1. Po co odkładać część danych na test, skoro model mógłby trenować
na wszystkich?**

- A. Żeby trening był szybszy — *Nie — chodzi o UCZCIWOŚĆ oceny, nie
  szybkość.* (diagnoza: „techniczna korzyść" — kalka PD.7-P1)
- B. **Bo ocena na danych treningowych nie mierzy uogólnienia — model
  mógł zapamiętać przykłady; test to dane, których nie widział** ✓ —
  *Tak — sprawdzian bez znanych odpowiedzi.*
- C. Bo sklearn tego wymaga — *Nie — składniowo można trenować na
  całości; to RZETELNOŚĆ (i rubryka) wymagają podziału.* (diagnoza:
  przymus składniowy — kalka ML.1-P2/D)
- D. Żeby dane się nie zużyły — *Nie — dane się nie zużywają; problemem
  jest wiedza modelu o odpowiedziach, nie eksploatacja.* (diagnoza:
  fizyczna metafora w złym miejscu)

**P2. Trening: trafność 1.0; test: 0.75. Co to znaczy?**

- A. Model jest znakomity — patrz trening — *Nie — trening z oceną 1.0
  to sprawdzian ze znanymi odpowiedziami; prawdę mówi test.* (diagnoza:
  czyta niewłaściwą liczbę — sedno atomu)
- B. **Model przeuczony (overfitting): zapamiętał trening; realna
  jakość to 0.75 z testu** ✓ — *Tak — rozjazd trening≫test to
  podręcznikowy objaw; raportujesz 0.75.*
- C. Test jest zepsuty — *Nie — rozjazd to informacja o MODELU, nie
  o teście; test właśnie zadziałał.* (diagnoza: wini miernik — kalka
  L0.2-P2/A)
- D. Trzeba uśrednić: 0.875 — *Nie — te liczby mierzą różne rzeczy;
  uśrednianie miesza sprawdzian uczciwy z nieuczciwym.* (diagnoza:
  arytmetyka zamiast semantyki)

**P3. Kolega puścił `train_test_split` bez `random_state` i za każdym
uruchomieniem ma inne wyniki. Dlaczego i co poradzisz?**

- A. Bo sklearn ma błąd — aktualizacja pomoże — *Nie — to zamierzone:
  podział jest losowy, a bez ziarna losowanie za każdym razem inne.*
  (diagnoza: wini narzędzie — kalka L0.2-P2/A)
- B. **Podział losuje się na nowo przy każdym uruchomieniu; ziarno
  (`random_state=…`) mrozi go — wyniki staną się powtarzalne** ✓ —
  *Tak — dokładnie wymóg „ustawiony seed" z rubryki (ML.1-P2).*
- C. Bo dane są za małe — *Nie — małe dane zwiększają WAHANIA, ale
  przyczyną niepowtarzalności jest brak ziarna.* (diagnoza: prawda
  poboczna zamiast przyczyny)
- D. Musi zapisywać wyniki ręcznie po każdym runie — *Nie — leczenie
  objawów; jedno ziarno załatwia przyczynę.* (diagnoza: obejście
  zamiast naprawy)

### Drabinka hintów

1. **Koncepcyjny:** Zapamiętaj parę liczb z WE (1.0 vs 0.833) jako
   wzorzec czytania: górna to iluzja, dolna to prawda. Kolejność
   żelazna: split → fit(trening) → ocena(test); ziarno w OBU miejscach
   (split i model).
2. **Szkielet:** W notebooku ML.2: uruchom WE; potem zmień
   `random_state` splitu na inną liczbę i uruchom ponownie — trafność
   testowa DRGNIE (inny podział = inny sprawdzian). Wróć do 42
   i sprawdź, że wynik wrócił. To jest powtarzalność w praktyce.
3. **Pełne rozwiązanie z objaśnieniem:** przy 24 rekordach każdy inny
   podział zauważalnie zmienia wynik testu (6 przykładów = 1 pomyłka
   waży 0.167!) — dlatego przy małych zbiorach wyniku testu nie czyta
   się co do trzeciego miejsca po przecinku, a capstone (setki+
   rekordów) będzie stabilniejszy. Jeśli obie trafności wyszły Ci
   identyczne i wysokie — sprawdź, czy przypadkiem nie oceniasz dwa
   razy na tym samym zbiorze (literówka `X_tr` zamiast `X_te` —
   najczęstszy błąd tego atomu i grzech nr 1 z ML.6).

---

## Atom ML.3 — Baseline: najpierw głupi strzał, potem model

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`baseline-punkt-odniesienia` (KLUCZOWY) · **Krok fadingu:** completion
(luka na końcu WE)

### Cel

Policzysz baseline — model trywialny strzelający najczęstszą klasą —
i użyjesz go jako punktu odniesienia: model, który nie bije głupiego
strzału, nie jest żadnym modelem.

### Teoria

Trafność 0.833 z ML.2 brzmi dobrze. Ale czy JEST dobra? Briefing
stawia sprawę ostro: „bez baseline nie wiesz, czy twój model jest
dobry, czy tylko wygląda dobrze". **Baseline** to najgłupsza sensowna
strategia — dla klasyfikacji: strzelaj ZAWSZE najczęstszą klasą.
W scikit-learn ma gotowca:

```python
from sklearn.dummy import DummyClassifier

baseline = DummyClassifier(strategy="most_frequent")   # strzelec: zawsze klasa większościowa
baseline.fit(X_tr, y_tr)                               # "trening": zapamiętaj, która częstsza
print(accuracy_score(y_te, baseline.predict(X_te)))
```

**Przewidź:** w danych napiwek daje ~7 na 10 pasażerów. Jakiej
trafności baseline'u się spodziewasz na teście?

**0.667** — cztery z sześciu przypadków testowych to napiwki, więc
strzelec „zawsze będzie napiwek" trafia 4/6. I nagle 0.833 z ML.2
nabiera znaczenia: prawdziwy model bije głupi strzał o ~0.17 — TO jest
wynik do raportowania, nie goła trafność. Reguły baseline'u:

- **Baseline liczysz PRZED modelem właściwym** (rubryka mówi wprost:
  „policzony PRZED modelem") — inaczej kusi dobieranie porównania pod
  wynik.
- Baseline przechodzi przez TEN SAM rygor: trening na treningu, ocena
  na teście, ta sama metryka. Porównanie jest uczciwe tylko przy
  identycznych warunkach.
- Model gorszy lub równy baseline'owi to informacja, nie wstyd: cechy
  nie niosą sygnału, model źle dobrany albo błąd w przepływie —
  wracasz i sprawdzasz, ZANIM raportujesz sukces.
- Dla regresji analogicznie: strzał średnią (`DummyRegressor`,
  strategia mean) — jedna linijka różnicy, ta sama filozofia.

Zauważ zależność od danych: przy klasach 50:50 strzelec ma ~0.5, przy
80:20 — już ~0.8 (dokładna wartość zależy od tego, co trafiło do
testu — nasz zbiór 17:7 dał baseline 0.667). Im mocniejsze niezbalansowanie, tym wyższy próg do
pobicia — dlatego baseline liczy się zawsze na TWOICH danych, nie
przyjmuje z pamięci.

Czemu „najczęstsza klasa", a nie strzał losowy? Bo losowy jest od niej
GORSZY i niestabilny — baseline ma być najlepszą strategią, która nie
patrzy na cechy; dopiero pobicie jej dowodzi, że cechy cokolwiek
wnoszą. Baseline pełni też rolę językową w raporcie: zdanie „model
poprawia naiwną regułę o 17 punktów procentowych" rozumie każdy
odbiorca — także ten, który nie wie, czym jest drzewo decyzyjne.
Goła trafność takiej mocy komunikacyjnej nie ma.

Completion (luka na końcu — notebook ML.3): porównanie w jednym
f-stringu (F1.3 wciąż pracuje!):

```python
roznica = acc_model - acc_baseline
print(f"Model bije baseline o {round(______, 3)}")   # luka: co wstawiasz?
```

### Pytania (retrieval)

**P1. Trafność Twojego modelu: 0.90. Kiedy to DOBRY wynik?**

- A. Zawsze — 90% to 90% — *Nie — przy klasie większościowej 95:5
  głupi strzał ma 0.95: Twój model byłby GORSZY od strzelca.*
  (diagnoza: czyta metrykę bez punktu odniesienia — sedno atomu)
- B. **Gdy wyraźnie bije baseline policzony w tych samych warunkach**
  ✓ — *Tak — dobroć wyniku jest WZGLĘDNA: wobec głupiego strzału,
  nie wobec okrągłości liczby.*
- C. Gdy na treningu jest jeszcze wyżej — *Nie — trening to iluzja
  (ML.2); wysoki trening niczego nie uwiarygadnia.* (diagnoza:
  wraca do czytania niewłaściwej liczby)
- D. Gdy inni mają gorzej — *Nie — cudze wyniki na innych danych to
  nie punkt odniesienia; baseline na TWOICH danych — tak.* (diagnoza:
  porównanie społeczne zamiast metodycznego)

**P2. Dlaczego baseline liczy się PRZED modelem właściwym?**

- A. Bo inaczej sklearn go nie policzy — *Nie — składniowo kolejność
  dowolna; chodzi o uczciwość procesu.* (diagnoza: przymus składniowy)
- B. **Żeby punkt odniesienia był ustalony z góry, a nie dobierany po
  fakcie pod wynik modelu** ✓ — *Tak — ta sama logika co hipotezy
  w EDA.3: najpierw deklaracja, potem wynik; rubryka egzekwuje
  kolejność wprost.*
- C. Bo baseline długo się trenuje — *Nie — trenuje się natychmiast
  (zapamiętuje jedną klasę); kolejność to zasada, nie wydajność.*
  (diagnoza: „techniczna korzyść")
- D. Żeby model widział wynik baseline'u — *Nie — model niczego nie
  „widzi"; kolejność jest dla CIEBIE i czytelnika raportu.* (diagnoza:
  antropomorfizacja modelu)

**P3. Model wyszedł MINIMALNIE lepszy od baseline'u (0.68 vs 0.67).
Co piszesz w raporcie?**

- A. „Model działa świetnie" — *Nie — 0.01 przewagi nad głupim
  strzałem to nie sukces; uczciwość raportu to Twoja waluta (EDA.3).*
  (diagnoza: inflacja wniosku)
- B. Nic — ukrywam baseline — *Nie — zatajenie punktu odniesienia to
  fałszowanie obrazu; rubryka i tak wymaga baseline'u w notebooku.*
  (diagnoza: kosmetyka wyników — grzech kapitalny)
- C. **„Model ledwie przewyższa baseline — cechy nie niosą silnego
  sygnału / potrzebne dalsze prace" — z liczbami obu wyników** ✓ —
  *Tak — wynik słaby uczciwie opisany jest wartościowszy niż mocny
  zmyślony; to prosto do sekcji Ograniczenia (ML.6).*
- D. Zmieniam ziarno, aż różnica urośnie — *Nie — to polowanie na
  szczęśliwy podział, wprost nieuczciwe (i wykrywalne: ziarno ma być
  ustawione RAZ).* (diagnoza: seed-hacking — nazwać, żeby odstraszyć)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** Luka to gotowa zmienna z linii wyżej — f-string
   wstawia jej wartość (F1.3, reguła 2). Sens ćwiczenia: raportuj
   RÓŻNICĘ względem baseline'u, nie gołą trafność.
2. **Szkielet:** `round(roznica, 3)` — co już policzone w linii wyżej?
3. **Pełne rozwiązanie z objaśnieniem:** `print(f"Model bije baseline
   o {round(roznica, 3)}")` → `Model bije baseline o 0.167` (0.833 −
   0.667 przy ziarnie 42). Gdyby różnica wyszła ujemna — to nie awaria
   printa, to informacja z P3: wróć i sprawdź przepływ, zanim
   cokolwiek raportujesz.

---

## Atom ML.4 — LAB „Napiwki: pełna ścieżka" (split → baseline → model → porównanie)

**Typ:** `lab` · **Czas studenta:** ~20 min · **Koncepty ćwiczone:**
ML.1–ML.3 · **Krok fadingu:** szkielet z lukami

### Cel

Złożysz rytuał rzetelnego modelowania w jeden przepływ — ten sam,
który na capstonie wykonasz na prawdziwych danych: podział, baseline,
model, uczciwe porównanie.

### Zadanie (notebook ML.4 — tabela `napiwki` (24 rekordy) w komórce
„Dane", uzupełnij luki)

```python
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

X = df[[______]]                          # luka 1: trzy kolumny cech
y = df[______]                            # luka 2: kolumna celu

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25,
                                          random_state=______)   # luka 3

baseline = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)
acc_base = accuracy_score(y_te, baseline.predict(X_te))

model = DecisionTreeClassifier(random_state=42).fit(______, ______)  # luki 4–5
acc_model = accuracy_score(y_te, model.predict(______))              # luka 6

print(f"Baseline: {round(acc_base, 3)} | Model: {round(acc_model, 3)}")
```

**Zaliczenie:** komórka-pieczątka: przelicza przepływ niezależnie
(ziarna są w szkielecie, więc wynik jest JEDEN: baseline 0.667, model
0.833) i porównuje z Twoimi zmiennymi `acc_base`/`acc_model` — token
przy zgodności. Limity klasy L0 obowiązują.

### Drabinka hintów

1. **Koncepcyjny:** Luki to role z ML.1 (cechy/cel), ziarno z ML.2
   i żelazna kolejność: model uczy się WYŁĄCZNIE na `_tr`, oceniany
   jest WYŁĄCZNIE na `_te`.
2. **Szkielet:** luka 1: `"minuty", "kwota", "godzina"`; luka 2:
   `"napiwek"`; luka 3: 42 (jak wszędzie w notebooku); luki 4–5: para
   treningowa; luka 6: cechy testowe.
3. **Pełne rozwiązanie z objaśnieniem:** `fit(X_tr, y_tr)`,
   `predict(X_te)` → `Baseline: 0.667 | Model: 0.833`. Pieczątka
   czerwona przy „ładnych" liczbach → najczęściej literówka `X_tr`
   w ocenie (oceniasz na treningu — acc_model wyjdzie 1.0 i to jest
   właśnie grzech nr 1, który pieczątka celowo łapie) albo inne ziarno.

---

## Atom ML.5 — Metryki i macierz pomyłek: gdzie i jak model się myli

**Typ:** `exercise` · **Czas studenta:** ~20 min · **Koncept:**
`metryki-macierz-pomylek` (KLUCZOWY) · **Krok fadingu:** luki w środku
WE

### Cel

Przeczytasz macierz pomyłek, policzysz z niej precision/recall/F1
i dobierzesz metrykę do problemu — bo accuracy przy niezbalansowanych
klasach potrafi kłamać.

### Teoria

Pułapka na dzień dobry: klasyfikator spamu, który ZAWSZE mówi
„nie-spam", przy skrzynce 95:5 ma accuracy 0.95 — i jest bezużyteczny
(nie łapie ŻADNEGO spamu). **Accuracy uśrednia wszystko w jedną
liczbę** i przy niezbalansowanych klasach ukrywa porażkę na klasie
rzadkiej. Zanim wybierzesz metrykę — zobacz, JAK model się myli:

```python
from sklearn.metrics import confusion_matrix

print(confusion_matrix(y_te, model.predict(X_te)))
# [[1 1]
#  [0 4]]
```

To **macierz pomyłek** dla naszego testu (6 przejazdów): wiersze =
prawda (0, potem 1), kolumny = przewidywanie (0, potem 1). Czytamy:

- lewy-górny **1**: prawdziwe „bez napiwku" przewidziane jako „bez" ✓;
- prawy-górny **1**: prawdziwe „bez", przewidziane jako „będzie" —
  **fałszywy alarm** (FP);
- lewy-dolny **0**: prawdziwe „będzie" przegapione (FN) — zero takich;
- prawy-dolny **4**: napiwki trafione ✓.

Z tych czterech pól rodzą się metryki celowane w klasę, na której Ci
zależy (u nas: 1, „będzie napiwek"):

- **Precision** — z tego, co OGŁOSIŁEM jako napiwek, ile faktycznie
  nim było: 4/(4+1) = **0.8** (jeden fałszywy alarm kosztuje);
- **Recall** (czułość) — z PRAWDZIWYCH napiwków, ile wyłapałem:
  4/(4+0) = **1.0** (żaden nie uciekł);
- **F1** — kompromis obu w jednej liczbie: **0.889** (gdy potrzebujesz
  jednej metryki przy niezbalansowaniu).

Domyślnie sklearn liczy te metryki dla klasy „1" — gdy Twoją klasą
ważną jest „0", trzeba to jawnie wskazać (role pól macierzy się wtedy
odwracają); przy capstonie z rzadką klasą negatywną to pierwsza rzecz
do sprawdzenia, zanim uwierzysz liczbom.

Dobór metryki to decyzja o KOSZCIE pomyłki — i rubryka żąda jej
uzasadnienia: drogi fałszywy alarm (np. bank blokuje konto uczciwemu
klientowi) → patrz precision; drogie przegapienie (np. przesiew
choroby) → patrz recall; klasy niezbalansowane, potrzeba jednej liczby
→ F1 zamiast accuracy. Dla regresji świat metryk jest inny — **MAE**
(średni błąd w jednostkach celu: „mylę się średnio o 4 zł") i **RMSE**
(mocniej karze duże wpadki) — capstone regresyjny użyje ich analogicznie.

Luki w środku (notebook ML.5 — policz metryki z macierzy RĘCZNIE,
zanim sprawdzisz funkcjami):

```python
TP, FP, FN = 4, 1, 0
precision = TP / (TP + ______)     # luka A: co psuje precision?
recall    = TP / (TP + ______)     # luka B: co psuje recall?
```

### Pytania (retrieval)

**P1. Skrzynka 95:5; klasyfikator „zawsze nie-spam" ma accuracy 0.95.
Dlaczego to zła miara jego jakości?**

- A. Bo 0.95 to za mało — trzeba 0.99 — *Nie — problem nie leży
  w progu, tylko w tym, CO accuracy ukrywa: zero złapanego spamu.*
  (diagnoza: kręci śrubą progu zamiast zmienić miarę)
- B. **Bo accuracy uśrednia klasy: na rzadkiej klasie (spam) model ma
  recall 0 — nie łapie NIC, a liczba wygląda świetnie** ✓ — *Tak —
  przy niezbalansowaniu patrz na metryki per klasa (precision/recall/
  F1), nie na średnią.*
- C. Bo accuracy działa tylko dla regresji — *Nie — accuracy jest
  właśnie klasyfikacyjna; dla regresji są MAE/RMSE.* (diagnoza: miesza
  rodziny metryk)
- D. Bo trzeba było policzyć na treningu — *Nie — trening dałby jeszcze
  bardziej złudną liczbę (ML.2); problem accuracy jest niezależny od
  zbioru.* (diagnoza: cofa się do grzechu z ML.2)

**P2. Macierz `[[50, 10], [5, 35]]` (wiersze: prawda 0,1; kolumny:
przewidziane 0,1). Ile wynosi recall klasy 1?**

- A. 35/45 — *Blisko rachunkowo, ale to 35/(35+10) liczy złe pole:
  10 to fałszywe ALARMY (psują precision), nie przegapienia.* (diagnoza:
  FP i FN zamienione — najczęstsza pomyłka macierzy)
- B. **35/40 = 0.875 — z 40 prawdziwych jedynek (wiersz dolny: 5+35)
  model wyłapał 35** ✓ — *Tak — recall czyta się WIERSZEM prawdy:
  TP/(TP+FN) = 35/(35+5).*
- C. 35/100 — *Nie — dzielisz przez wszystkie przypadki: to składnik
  accuracy, nie recall.* (diagnoza: miesza metryki)
- D. 85/100 — *Nie — (50+35)/100 to ACCURACY całości; recall dotyczy
  jednej klasy.* (diagnoza: jak C, z drugiej strony)

**P3. Model przesiewowy ma przegapiać jak najmniej chorych; fałszywy
alarm kończy się tylko dodatkowym badaniem. Którą metrykę
maksymalizujesz i jak to uzasadnisz?**

- A. Precision — alarmy są najważniejsze — *Nie — tu alarm jest TANI,
  a przegapienie DROGIE; to profil recall.* (diagnoza: odwrócony
  rachunek kosztów)
- B. **Recall — koszt przegapienia (FN) jest wysoki, koszt fałszywego
  alarmu (FP) niski; uzasadnienie: „wolimy dodatkowe badanie niż
  przeoczenie"** ✓ — *Tak — dobór metryki = jawna decyzja o koszcie
  pomyłki, dokładnie forma z rubryki.*
- C. Accuracy — jest najprostsza — *Nie — przesiew to klasy skrajnie
  niezbalansowane: accuracy ukryje przegapienia (P1).* (diagnoza:
  prostota ponad trafność doboru)
- D. Wszystkie naraz, bez wybierania — *Raportować można wiele, ale
  rubryka żąda DOBORU z uzasadnieniem — decyzji, która metryka
  rozstrzyga o jakości w TYM problemie.* (diagnoza: unik decyzji)

### Drabinka hintów (luki z teorii)

1. **Koncepcyjny:** Precision psują fałszywe ALARMY (ogłosiłem — nie
   było), recall psują PRZEGAPIENIA (było — nie ogłosiłem). Wstaw
   właściwy skrót do mianownika.
2. **Szkielet:** luka A: `FP`; luka B: `FN` — policz i porównaj
   z wynikami `precision_score`/`recall_score` w następnej komórce
   notebooka (mają się zgodzić co do joty).
3. **Pełne rozwiązanie z objaśnieniem:** precision = 4/5 = 0.8,
   recall = 4/4 = 1.0 — zgodne z funkcjami sklearn. Rachunek ręczny
   raz w życiu jest obowiązkowy: od tej pory macierz czytasz, a nie
   zgadujesz. Metryki per klasa liczone są dla klasy „1" — gdy zależy
   Ci na klasie „0", role pól się odwracają (uwaga przy capstonie
   z rzadką klasą negatywną).

---

## Atom ML.6 — Leakage: trzy grzechy nieuczciwej ewaluacji (i sekcja Ograniczenia)

**Typ:** `exercise` · **Czas studenta:** ~15–20 min · **Koncept:**
`leakage-uczciwosc-ewaluacji` (KLUCZOWY) · **Krok fadingu:** backward
completion — student pisze sekcję Ograniczeń do gotowego raportu

### Cel

Rozpoznasz trzy najczęstsze drogi wycieku danych (leakage) — ocena na
treningu, preprocessing na całości, informacja z przyszłości —
i napiszesz sekcję Ograniczenia, której rubryka wymaga w każdym
raporcie.

### Teoria

**Leakage** (wyciek) to sytuacja, w której do treningu albo oceny
przecieka informacja, której model nie miałby w prawdziwym użyciu.
Wyniki wyglądają wtedy świetnie — i są bezwartościowe. Trzy grzechy,
które łapie rubryka (25% punktów!):

1. **Ocena na danych treningowych.** Znasz z ML.2 (1.0 vs 0.833) —
   najprostszy wyciek: sprawdzian ze znanymi odpowiedziami.
2. **Preprocessing dopasowany na CAŁOŚCI danych.** Wszystko, co „uczy
   się" z danych — skalowanie, wypełnianie braków średnią (PD.5!),
   kodowanie — musi być dopasowane WYŁĄCZNIE na treningu, a potem tylko
   ZASTOSOWANE do testu. Średnia policzona z całości zna już test —
   pieczęć złamana, choć model testu „nie widział". Reguła praktyczna:
   **najpierw split, potem wszystko inne.**
3. **Informacja z przyszłości.** Cecha, która w momencie przewidywania
   nie istnieje — np. przewidujesz napiwek PRZED kursem, a wśród cech
   jest „ocena kursu wystawiona po przejeździe". Model na teście
   błyszczy; w produkcji ta kolumna jest pusta. Test na każdą cechę:
   „czy znam tę wartość W CHWILI, gdy robię predykcję?".

Wspólny mianownik: leakage nie daje komunikatu błędu (najgroźniejsze
błędy nie mają komunikatów — F2.5-P2); łapie się go PROCEDURĄ (żelazna
kolejność z ML.2 + test chwili predykcji) i uczciwym opisem. Stąd
**sekcja Ograniczenia** — obowiązkowy element raportu wg rubryki:
2–4 zdania o słabościach danych (mało rekordów? klasa rzadka?), metody
(prosty model, jeden podział) i wniosków (na czym NIE polegać). To
rodzona siostra hipotez z EDA.3: zastrzeżenie to znak, że wiesz, co
robisz — nie asekuracja. I ta sama higiena języka: w raporcie modelu
słowo „dowodzi" zamieniaj na „sugeruje", a „zawsze" na „na tych
danych" — czytelnik ma wiedzieć, gdzie kończy się Twoja pewność.

Backward completion (notebook ML.6): dostajesz GOTOWY raport z ML.4
(liczby: baseline 0.667, model 0.833, test 6 przykładów) — dopisz
sekcję Ograniczenia (3 zdania). Wzorzec zdania: słabość + konsekwencja
(„test ma 6 przykładów, więc jedna pomyłka zmienia wynik o 0.167 —
liczb nie czytamy co do trzeciego miejsca").

### Pytania (retrieval)

**P1. Wypełniłeś braki średnią policzoną z CAŁEGO zbioru, potem
zrobiłeś split. Czemu to leakage, skoro model nie widział testu?**

- A. To nie leakage — model to nie preprocessing — *Nie — pieczęć
  dotyczy WSZYSTKIEGO, co uczy się z danych: średnia z całości już
  „zna" wartości testu.* (diagnoza: zawęża pieczęć do samego modelu —
  sedno grzechu 2)
- B. **Średnia policzona z całości niesie informację o teście do
  treningu — dopasuj wypełnianie na treningu, do testu tylko ZASTOSUJ**
  ✓ — *Tak — reguła: najpierw split, potem wszystko inne.*
- C. To leakage tylko przy dużych zbiorach — *Nie — mechanizm nie
  zależy od rozmiaru; przy małych zbiorach skażenie bywa wręcz
  silniejsze.* (diagnoza: warunkuje zasadę rozmiarem)
- D. Braków nie wolno wypełniać w ML — *Nie — wolno i często trzeba
  (PD.5); grzechem jest KOLEJNOŚĆ, nie sama operacja.* (diagnoza:
  wylewa dziecko z kąpielą)

**P2. Przewidujesz, czy klient zrezygnuje z usługi w tym miesiącu.
Która cecha to informacja z przyszłości?**

- A. Liczba reklamacji w ZESZŁYM miesiącu — *Nie — przeszłość jest
  legalna: znasz ją w chwili predykcji.* (diagnoza: myli przeszłość
  z przyszłością)
- B. **„Data zamknięcia konta" — istnieje dopiero, gdy rezygnacja już
  się wydarzy** ✓ — *Tak — test chwili predykcji: przewidując na
  początku miesiąca, tej wartości NIE znasz; na teście cecha błyszczy,
  w produkcji jest pusta.*
- C. Wiek klienta — *Nie — znany w chwili predykcji.* (diagnoza: brak
  testu chwili — zgaduje po „ważności")
- D. Średnia liczba logowań — *Nie — o ile liczona z danych SPRZED
  chwili predykcji; sama w sobie legalna.* (diagnoza: jak C)

**P3. Po co raportowi sekcja Ograniczenia, skoro wyniki są dobre?**

- A. Żeby recenzent miał co czytać — *Nie — to nie zapełniacz;
  rubryka wymaga jej merytorycznie.* (diagnoza: traktuje wymóg jako
  biurokrację)
- B. Bo dobre wyniki są zawsze podejrzane — *Nie — dobre wyniki bywają
  prawdziwe; Ograniczenia mówią, DOKĄD sięga ich ważność, nie że są
  fałszywe.* (diagnoza: cynizm zamiast kalibracji)
- C. **Bo każdy wynik ma granice ważności (mało danych, jeden podział,
  prosty model) — kto ich nie zna, ten nie wie, co raportuje** ✓ —
  *Tak — siostra hipotez z EDA.3: zastrzeżenie = dowód warsztatu;
  czytelnik wie, na czym może polegać.*
- D. Żeby zdjąć z siebie odpowiedzialność — *Nie — Ograniczenia
  precyzują odpowiedzialność, nie znoszą jej: mówisz, co sprawdziłeś,
  a czego nie.* (diagnoza: asekuracja zamiast kalibracji)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Trzy zdania = trzy poziomy: DANE (ile rekordów?
   jaki balans klas?), METODA (jeden podział? prosty model? co
   „uczyło się" z danych i kiedy?), WNIOSKI (czego ten wynik NIE
   dowodzi?). Wzorzec: słabość + konsekwencja.
2. **Szkielet:** „Dane: … (24 rekordy, klasa 0 to tylko 7 przypadków —
   …). Metoda: pojedynczy podział 18/6 — … Wnioski: wynik 0.833
   oznacza …, ale nie …".
3. **Pełne rozwiązanie z objaśnieniem (przykładowe):** „Dane: 24
   przejazdy, klasa «bez napiwku» ma 7 przypadków — metryki dla niej
   są niestabilne. Metoda: pojedynczy podział z jednym ziarnem; test
   ma 6 przykładów, więc jedna pomyłka zmienia trafność o 0.167.
   Wnioski: model bije baseline na tym zbiorze, ale wynik nie
   przenosi się automatycznie na inne miasta/okresy — wymaga
   walidacji na większych danych." Trzy zdania, zero asekuracyjnej
   waty, każde z konsekwencją — to jest forma na capstone.

---

## Atom ML.7 — LAB „Raport modelu" (samodzielny finał M-ML)

**Typ:** `lab` · **Czas studenta:** ~30 min · **Koncepty ćwiczone:**
wszystkie z M-ML · **Krok fadingu:** zadanie samodzielne (sama
specyfikacja)

### Cel

Capstone w miniaturze: pełny rzetelny cykl na danych napiwkowych —
od podziału po raport z macierzą, doborem metryki i Ograniczeniami.

### Zadanie (notebook ML.7 — tabela `napiwki` + pusta komórka „Twój
model" + pieczątka)

1. Podział z ziarnem (nazwy konwencją: `X_tr, X_te, y_tr, y_te`).
2. Baseline `most_frequent`, trafność na teście → zmienna
   **`acc_base`**.
3. Model (drzewo z ziarnem), trafność na teście → **`acc_model`**;
   porównanie z baseline'em f-stringiem.
4. Macierz pomyłek na teście → **`macierz`**; z niej precision
   i recall (funkcjami sklearn) → **`prec`**, **`rec`**.
5. Komórka tekstowa: (a) które pole macierzy boli najbardziej i czemu,
   (b) dobór metryki dla problemu „przewidujemy napiwek" z uzasadnieniem
   jednym zdaniem, (c) sekcja Ograniczenia — 3 zdania wzorcem z ML.6.

Nazwy pogrubione są CZĘŚCIĄ specyfikacji (pieczątka musi wiedzieć,
gdzie patrzeć — lekcja PD.8).

**Zaliczenie:** komórka-pieczątka: przelicza przepływ niezależnie
(ziarna w specyfikacji ⇒ wynik jedyny) i porównuje `acc_base`,
`acc_model`, `macierz`, `prec`, `rec` z oczekiwanymi — token przy
zgodności. Komórki tekstowe poza checkiem (jawny limit klasy L0) —
ocenia je rubryka capstone'u, tu ćwiczysz formę.

### Drabinka hintów

1. **Koncepcyjny:** To ML.4 + ML.5 + ML.6 w jednym przepływie —
   wszystkie fragmenty masz przećwiczone; nowa jest tylko kompletność.
   Kolejność żelazna: split → baseline → model → metryki → słowa.
2. **Szkielet:** kroki 1–3 = szkielet ML.4 (bez luk — z pamięci);
   krok 4: `confusion_matrix(y_te, model.predict(X_te))` +
   `precision_score`/`recall_score`; krok 5: wzorce zdań z ML.5-P3
   i ML.6 hint 2.
3. **Pełne rozwiązanie z objaśnieniem:** liczby jak w module (0.667 /
   0.833 / [[1,1],[0,4]] / 0.8 / 1.0). Dobór metryki — dopuszczalne
   różne decyzje z uzasadnieniem (np. „precision, bo fałszywa obietnica
   napiwku psuje planowanie przychodu" ALBO „F1, bo klasy
   niezbalansowane") — pieczątka nie ocenia decyzji, rubryka na
   capstonie tak. `acc_model` = 1.0 → oceniasz na treningu (grzech 1);
   macierz o innych liczbach → inne ziarno gdzieś w przepływie.

---

## Egzamin modułu M-ML (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**;
2 warianty izomorficzne (cap 2); retry z drugim wariantem; po 2. oblaniu
correctives; „zarezerwuj ~25 min"; pokrycie 3 × 5 atomów; kalibracja
OSOBNA, przy WE. Format jak poprzednie moduły.

**E1** · A: Co robi `model.fit(X, y)`? — przewiduje / **dopasowuje
reguły modelu do przykładów (trening)** / liczy metryki / czyści dane —
*fit = trening.* · B: Co robi `model.predict(nowe_X)`? — trenuje /
**zwraca przewidywania dla podanych cech** / liczy accuracy / dzieli
dane — *predict = użycie.* → `model-fit-predict` → ML.1

**E2** · A: Cechy (X) i cel (y) to… — dwa modele / **kolumny-wejścia
i kolumna-wyjście do przewidywania** / trening i test / metryki —
*role danych.* · B: Przewidywanie kategorii tak/nie vs liczby to… —
fit vs predict / **klasyfikacja vs regresja** / trening vs test /
precision vs recall — *dwa rodzaje zadań.* → `model-fit-predict` → ML.1

**E3** · A: `predict` na modelu przed `fit` → co się stanie? — zwróci
zera / **`NotFittedError` — model przed treningiem to pusta forma** /
zwróci losowo / wytrenuje się sam — *kolejność bezwzględna.* · B:
Po co `random_state`? — poprawia trafność / **mrozi losowość — wyniki
powtarzalne (wymóg seed z rubryki)** / przyspiesza / wybiera model —
*powtarzalność ≠ jakość.* → `model-fit-predict` → ML.1

**E4** · A: Po co dzielić dane na trening i test? — szybszy trening /
**uczciwa ocena: test to dane, których model nie widział** / wymóg
składni / oszczędność pamięci — *sprawdzian bez znanych odpowiedzi.* ·
B: Model wolno trenować na… — całości zawsze / **wyłącznie części
treningowej** / części testowej / na zmianę — *test zapieczętowany do
oceny.* → `train-test-podzial` → ML.2

**E5** · A: Trening 1.0, test 0.78 — co raportujesz jako jakość
modelu? — 1.0 / **0.78 — test jest miarą prawdy; rozjazd = objaw
overfittingu** / średnią 0.89 / żadnej — *iluzja vs prawda.* · B:
Świetnie na treningu, słabo na teście — to objaw… — leniwego modelu /
**overfittingu: model zapamiętał trening zamiast się nauczyć** /
złych metryk / za dużego testu — *podręcznikowy rozjazd.*
→ `train-test-podzial` → ML.2

**E6** · A: Bez `random_state` w `train_test_split` wyniki między
uruchomieniami… — identyczne / **różnią się — podział losuje się na
nowo** / zawsze lepsze / zawsze gorsze — *ziarno mrozi podział.* · B:
24 rekordy, `test_size=0.25` — ile w treningu i teście? — 12/12 /
**18/6** / 6/18 / 20/4 — *ćwierć na test.* → `train-test-podzial` →
ML.2

**E7** · A: Baseline dla klasyfikacji to np… — najlepszy możliwy
model / **strzał zawsze najczęstszą klasą** / model bez danych /
średnia z metryk — *głupi strzał jako punkt odniesienia.* · B:
Baseline liczysz… — po modelu, dla porównania / **przed modelem
właściwym (wymóg rubryki)** / tylko gdy model słaby / nigdy —
*punkt odniesienia ustalony z góry.* → `baseline-punkt-odniesienia`
→ ML.3

**E8** · A: Accuracy modelu 0.90 przy klasie większościowej 95% —
model jest… — świetny / **gorszy od głupiego strzału (baseline 0.95)**
/ dokładnie dobry / nieoceniony — *dobroć jest względna.* · B: Model
nie bije baseline'u — co to znaczy? — sklearn ma błąd / **cechy nie
niosą sygnału, model źle dobrany albo błąd w przepływie — sprawdź
zanim raportujesz** / trzeba zmienić ziarno aż pobije / test za mały —
*informacja, nie wstyd.* → `baseline-punkt-odniesienia` → ML.3

**E9** · A: Uczciwe porównanie modelu z baseline'em wymaga… — różnych
metryk / **tych samych danych testowych i tej samej metryki** /
oceny baseline'u na treningu / dwóch ziaren — *identyczne warunki.* ·
B: Raportujesz jakość modelu najlepiej jako… — gołą trafność /
**wynik ZESTAWIONY z baseline'em (o ile go bije)** / trafność
treningową / liczbę drzew — *różnica niesie sens.*
→ `baseline-punkt-odniesienia` → ML.3

**E10** · A: Klasyfikator „zawsze nie-spam" przy 95:5 ma accuracy
0.95 i recall spamu… — 0.95 / **0 — nie łapie żadnego spamu** / 0.5 /
1.0 — *accuracy ukrywa porażkę na klasie rzadkiej.* · B: Przy
niezbalansowanych klasach zamiast samej accuracy patrzysz na… — MAE /
**precision/recall/F1 per klasa** / trafność treningową / liczbę
cech — *metryki celowane.* → `metryki-macierz-pomylek` → ML.5

**E11** · A: W macierzy pomyłek fałszywy alarm (FP) to… — prawda 1,
przewidziane 1 / **prawda 0, przewidziane 1** / prawda 1, przewidziane
0 / prawda 0, przewidziane 0 — *ogłosiłem, a nie było.* · B:
Przegapienie (FN) psuje… — precision / **recall** / accuracy tylko /
nic — *recall = wyłapywanie prawdziwych.* → `metryki-macierz-pomylek`
→ ML.5

**E12** · A: Drogie przegapienie, tani alarm (przesiew) →
maksymalizujesz… — precision / **recall** / accuracy / MAE — *koszt
pomyłki wybiera metrykę.* · B: Drogi fałszywy alarm, tanie
przegapienie → patrzysz przede wszystkim na… — **precision** / recall
/ RMSE / liczbę TP — *odwrotny profil kosztów.*
→ `metryki-macierz-pomylek` → ML.5

**E13** · A: Wypełnienie braków średnią policzoną z CAŁOŚCI przed
splitem to… — dobra praktyka / **leakage — średnia zna test; dopasuj
na treningu, zastosuj do testu** / błąd składni / wymóg sklearn —
*najpierw split, potem wszystko.* · B: Reguła kolejności brzmi… —
najpierw model, potem split / **najpierw split, potem wszystko, co
uczy się z danych** / kolejność dowolna / najpierw metryki —
*pieczęć na teście.* → `leakage-uczciwosc-ewaluacji` → ML.6

**E14** · A: Przewidujesz rezygnację klienta w tym miesiącu; cecha
„data zamknięcia konta" to… — dobra cecha / **informacja
z przyszłości — w chwili predykcji nie istnieje** / cecha neutralna /
cel — *test chwili predykcji.* · B: Leakage objawia się zwykle… —
komunikatem błędu / **podejrzanie świetnym wynikiem bez żadnego
błędu** / crashem sesji / pustą macierzą — *najgroźniejsze błędy są
ciche.* → `leakage-uczciwosc-ewaluacji` → ML.6

**E15** · A: Sekcja Ograniczenia w raporcie służy… — asekuracji /
**opisaniu granic ważności wyniku (dane, metoda, wnioski)** /
wydłużeniu raportu / ukryciu słabości — *dowód warsztatu.* · B:
Dobre zdanie Ograniczeń to… — „wyniki mogą być różne" / **konkretna
słabość + konsekwencja (np. „test ma 6 przykładów — jedna pomyłka
zmienia wynik o 0.167")** / „model wymaga dalszych badań" / przeprosiny
— *słabość + konsekwencja, zero waty.* → `leakage-uczciwosc-ewaluacji`
→ ML.6

---

## Pozycja CAPSTONE — `ds-pierwszy-model-predykcyjny` (rampa i kamienie)

**Typ:** `project` (REUSE-as-capstone, D4; rubryka NIETKNIĘTA) ·
**Czas studenta:** ~6 h (estymata projektu).

**Rampa — mapowanie 5 kryteriów rubryki na drabinę:** baseline (20%) →
ML.3; walidacja+leakage (25%) → ML.2+ML.6; dobór metryk (20%) → ML.5;
analiza błędów (15%) → ML.5 (macierz + „które pole boli"; wariant
„przykłady błędnych predykcji" z rubryki to maska z PD.3:
`X_te[model.predict(X_te) != y_te]` — błędne wiersze do obejrzenia,
same znane klocki); repro+
Ograniczenia (20%) → ML.1/ML.2 (`random_state`), EDA.2 (repo/README/
requirements), ML.6 (sekcja Ograniczenia). Briefing = `theory_md`
(bias/wariancja — teoria „dlaczego"; atomy dały „jak"). Dane: UCI
Online Retail (sourceUrl projektu) lub BDL — wybór zadania
klasyfikacja/regresja należy do studenta; przy regresji metryki
MAE/RMSE (wzmianka ML.5) — briefing projektu prowadzi.

**Kamienie milowe (propozycja do `configJson.checks`, 4 szt.;
definicja finalna przy 1E.6):**

- **K1 „Dane gotowe":** w sesji DataFrame z danych projektu +
  zdefiniowane X/y (check generyczny — bez przywiązania do zbioru).
- **K2 „Przepływ dotarł do końca":** pieczątka na końcu — wykonanie
  w bieżącej sesji bez zatrzymania; dodatkowo sprawdza ISTNIENIE
  baseline'u i podziału (obecność zmiennych konwencji) — limit trybu
  uruchomienia jak w M-EDA/M-SQL (jawnie).
- **K3 „Repo":** link do publicznego repo; check HTTP: notebook,
  `README.md`, `requirements.txt` (wzorzec K3 M-EDA).
- **K4 „Submit"** do pipeline'u recenzji (rubryka + viva; wariant C;
  ochrona streaka — D9).

---

## Strona „Pierwsza pomoc — M-ML" (D5a, statyczna, per moduł)

Strony L0–M-SQL obowiązują. Przyrost M-ML (komunikaty zweryfikowane
w sklearn 1.6.1):

1. **`NotFittedError: This … instance is not fitted yet`** → `predict`
   przed `fit`; kolejność bezwzględna (ML.1).
2. **`ValueError: could not convert string to float: '…'`** przy fit →
   w X została kolumna TEKSTOWA — drzewo liczy na liczbach; sprawdź
   `X.dtypes` (PD.2) i zostaw kolumny liczbowe (kodowanie tekstów
   poznasz, gdy capstone zapyta — briefing prowadzi).
3. **`ValueError: Expected a 2-dimensional container…`** → do fit/
   predict poszła SERIA zamiast tabeli: `df["kolumna"]` vs
   `df[["kolumna"]]` — podwójne nawiasy (PD.3-P3 w bojowym użyciu).
4. **Wyniki zmieniają się między uruchomieniami** → brak `random_state`
   w splicie ALBO w modelu — ziarno w obu miejscach (ML.2).
5. **Trafność 1.0 i wszystko „pięknie"** → prawie na pewno oceniasz na
   treningu (literówka `X_tr`/`X_te`) albo cecha-cel przeciekła do X
   (kolumna celu w cechach!) — sprawdź listę kolumn X (ML.2/ML.6).
6. **Macierz pomyłek „odwrócona"** → wiersze to PRAWDA, kolumny to
   przewidywania (0 przed 1); nie zgaduj — podpisz pola na kartce raz,
   metodą z ML.5.
7. **Metryki precision/recall dziwnie niskie/wysokie** → licz dla
   właściwej klasy (domyślnie „1"); gdy Twoja klasa ważna to „0" —
   role pól się odwracają (ML.5, drabinka).
8. **Model nie bije baseline'u** → to wynik, nie awaria: sprawdź
   przepływ (grzechy ML.6), potem raportuj uczciwie z Ograniczeniami
   (ML.3-P3).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://scikit-learn.org/stable/user_guide.html | scikit-learn User Guide (referencja; z projektu) | praktyka-docs (EN — poza ścieżką krytyczną) | BSD (scikit-learn) | EN | nie | 2026-07-11 (HTTP 200, kanoniczny) |
| https://youtu.be/qnikedWLqRw | „Twój start w ML — KROK #3: jak wytrenować model (scikit-learn)" (I and AI, ~29 min, 2025) — split 04:20, fit, macierz pomyłek + precision/recall/F1 13:59 | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (API zweryfikowane w notebooku autora na GitHubie — nowoczesne; BEZ baseline'u i leakage — te tylko w atomach; seans kontrolny przed ingest) |
| https://youtu.be/PKKrnOEBZbc | „Uczenie maszynowe: podstawy — przykładowy model" (Kacper Sieradziński/pystart, ~23 min, 2024) — łagodny wstęp koncepcyjny + pierwszy fit/predict | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; bez splitu i metryk — wyłącznie wstęp) |
| https://youtu.be/1uYvFbPml_A | „Macierz pomyłek" (DATAcademy, ~7 min, 2021) — koncepcyjnie, bez kodu | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (bez kodu = zero ryzyka przestarzałego API) |

Sedno M-ML w całości w polskiej teorii atomów (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0–M-SQL

| Termin | Po polsku |
|---|---|
| cechy (*features*, X) / cel (*target*, y) | kolumny-wejścia / kolumna-wyjście do przewidywania |
| klasyfikacja / regresja | przewidywanie kategorii / liczby |
| `fit` / `predict` | trening (dopasowanie reguł) / użycie (przewidywanie) |
| `random_state` (ziarno, *seed*) | zamrożenie losowości — powtarzalne wyniki (wymóg rubryki) |
| `train_test_split` / X_tr, X_te, y_tr, y_te | podział na trening i test / konwencja nazw czterech części |
| overfitting (przeuczenie) | model zapamiętał trening; objaw: świetnie na treningu, słabiej na teście |
| drzewo decyzyjne / `DecisionTreeClassifier` | model-seria pytań o cechy; czytelne reguły, zero preprocessingu na start |
| baseline | model trywialny (najczęstsza klasa / średnia) jako punkt odniesienia |
| accuracy | odsetek trafień ogółem — myli przy niezbalansowanych klasach |
| macierz pomyłek (*confusion matrix*) | wiersze = prawda, kolumny = przewidywania; pola TP/FP/FN/TN |
| precision / recall / F1 | czystość alarmów / wyłapywalność prawdziwych / kompromis obu |
| MAE / RMSE | metryki regresji: średni błąd / z karą za duże wpadki |
| leakage (wyciek) | informacja, której nie ma w prawdziwym użyciu, przecieka do treningu/oceny |
| `NotFittedError` | użycie modelu przed treningiem |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** ML.1 → ML.2 → ML.3 → ML.4 (lab) →
  ML.5 → ML.6 → ML.7 (lab) → przegląd przed egzaminem (reuse) →
  egzamin (15/≤1) → CAPSTONE. Modelowanie atomów jak poprzednie moduły.
- **Audyt pojemności D10 — w tym dokumencie** (sekcja na górze):
  5 atomów, bez podziału; teoria bias/wariancja jawnie pozostawiona
  briefingowi (anty-redundancja).
- **1 koncept = 1 atom — deklaracje (standard L0.2):** ML.5 —
  bundling metryki+macierz (jedna materia: „czytanie jakości
  klasyfikatora z pól macierzy"; analiza błędów z rubryki = te same
  pola); MAE/RMSE = rider-wzmianka dla ścieżki regresyjnej capstone'u
  (bez pytań/egzaminu; słowniczek jest). ML.2 — **k-fold =
  rider-wzmianka** (rubryka dopuszcza go jako alternatywę, więc nazwa
  musi paść; bez pytań/egzaminu, briefing prowadzi). ML.6 — sekcja
  Ograniczeń to operacjonalizacja konceptu leakage/uczciwość, nie
  drugi koncept. DummyRegressor (ML.3) — kontekst-analogia, bez
  deklaracji (ocena przeglądu QG).
- **Monitoring par egzaminu w D11 (precedensy wszystkich modułów od
  F2): E2, E3, E6, E9, E14** — najliczniejszy zestaw par
  „dwustronnych" dotąd (5/15; komplementarne aspekty, nie ścisłe
  izomorfy); przy odstającym success rate — kandydaci do przepisania
  w pierwszej kolejności.
- **Obietnica `while`/`range()`:** ponownie odwołana (audyt na górze)
  — M-ML nie potrzebuje; wpis dla M-LLM: iteracja po przykładach
  zwykłym `for` (F2.3), bez nowej składni.
- **Determinizm treści:** wszystkie liczby wykonane w sklearn 1.6.1
  (Colab) i 1.9.0 — identyczne; zbiór `napiwki` (24 rekordy) wpisany
  w notebook, ziarna w treści. Przy budowie notebooków NIE zmieniać
  danych ani ziaren bez przeliczenia całości (wartości są cytowane
  w teorii, labach, pieczątkach i drabinkach).
- **Pieczątki:** ML.4/ML.7 — pełny przepływ przeliczany niezależnie
  (ziarna w spec ⇒ wynik jedyny); nazwy zmiennych częścią specyfikacji
  (lekcja PD.8); komórki tekstowe poza checkiem.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie ML.1–ML.6
  = 304–356 słów z blokami kodu, ~301–310 bez nich — w widełkach przy
  obu metodach; **marginesy najniższe w ścieżce** (precedens
  F2.1/PD.6) — każda korekta redakcyjna wymaga ponownego pomiaru.
- **Dane capstone'u (research 2026-07-11):** UCI Online Retail —
  HTTP 200, pobieranie bez rejestracji, bezpośredni zip
  (`archive.ics.uci.edu/static/public/352/online+retail.zip`, w środku
  `Online Retail.xlsx` — `pd.read_excel` wymaga `openpyxl`!); UWAGA:
  strona deklaruje „brak braków", a realnie **~25% wierszy ma pusty
  CustomerID** — złota okazja dydaktyczna do PD.5/Ograniczeń, wpis do
  briefingu przy 1E.R. StatQuest (zasób EN projektu) żywy i aktywny.
- **TODO przed ingest 1E.2:**
  1. Budowa 9 notebooków M-ML (sklearn 1.6.1; smoke test przepływu
     w Colab); komórka „Dane" każdego notebooka importuje pandas
     (WE atomów zakładają gotowe `pd` — konwencja PD.1).
  2. Seanse kontrolne wideo PL (I and AI KROK #3 — główne; wstęp
     pystart; macierz DATAcademy) — metadane i API zweryfikowane
     researchem 2026-07-11.
  3. Kamień K2: sprawdzić przy 1E.6, czy detekcja „istnienia baseline'u
     i podziału" po nazwach konwencji jest wystarczająco odporna
     (student może nazwać inaczej — spec capstone'u musi wtedy nazwy
     ustalić, jak ML.7).

## Aneks — zbiór przewodni `napiwki` (źródło prawdy dla wszystkich liczb modułu)

24 rekordy do komórki „Dane" każdego notebooka M-ML (kolumny: minuty,
kwota, godzina, napiwek; rozkład celu 17:7). NIE zmieniać bez
przeliczenia całej treści:

```python
dane = [
    {"minuty": 12, "kwota": 23.5, "godzina": 8,  "napiwek": 1},
    {"minuty": 35, "kwota": 61.0, "godzina": 8,  "napiwek": 1},
    {"minuty": 7,  "kwota": 14.0, "godzina": 9,  "napiwek": 0},
    {"minuty": 22, "kwota": 41.5, "godzina": 17, "napiwek": 1},
    {"minuty": 15, "kwota": 28.0, "godzina": 17, "napiwek": 1},
    {"minuty": 5,  "kwota": 9.5,  "godzina": 23, "napiwek": 0},
    {"minuty": 40, "kwota": 72.0, "godzina": 18, "napiwek": 1},
    {"minuty": 9,  "kwota": 16.5, "godzina": 7,  "napiwek": 0},
    {"minuty": 28, "kwota": 50.0, "godzina": 16, "napiwek": 1},
    {"minuty": 18, "kwota": 33.0, "godzina": 12, "napiwek": 1},
    {"minuty": 11, "kwota": 21.0, "godzina": 10, "napiwek": 1},
    {"minuty": 6,  "kwota": 11.0, "godzina": 2,  "napiwek": 0},
    {"minuty": 25, "kwota": 45.5, "godzina": 15, "napiwek": 1},
    {"minuty": 31, "kwota": 57.0, "godzina": 19, "napiwek": 1},
    {"minuty": 8,  "kwota": 15.0, "godzina": 3,  "napiwek": 0},
    {"minuty": 20, "kwota": 37.0, "godzina": 14, "napiwek": 1},
    {"minuty": 14, "kwota": 26.0, "godzina": 11, "napiwek": 1},
    {"minuty": 45, "kwota": 80.5, "godzina": 18, "napiwek": 1},
    {"minuty": 10, "kwota": 19.0, "godzina": 22, "napiwek": 0},
    {"minuty": 16, "kwota": 30.0, "godzina": 13, "napiwek": 1},
    {"minuty": 27, "kwota": 48.0, "godzina": 16, "napiwek": 1},
    {"minuty": 13, "kwota": 24.5, "godzina": 9,  "napiwek": 1},
    {"minuty": 4,  "kwota": 8.0,  "godzina": 1,  "napiwek": 0},
    {"minuty": 33, "kwota": 60.0, "godzina": 17, "napiwek": 1},
]
```

## Przebieg QG tego dokumentu (2026-07-11)

Draft → cały przepływ liczbowy wykonany przez autora w sklearn 1.6.1
(Colab) i 1.9.0 PRZED pisaniem treści (wyniki identyczne,
deterministyczne; aneks z 24-rekordowym zbiorem dodany jako źródło
prawdy) → **2 agentów weryfikacyjnych (Fable 5)**: (1) przegląd
zgodności z ADR-014 z wykonaniem pełnego przepływu w OBU wersjach —
ZERO znalezisk krytycznych; 3 WAŻNE (przykładowe pytanie drzewa
w teorii było WYMYŚLONE wbrew deklaracji „wykonane, nie wymyślone" —
zweryfikowane `export_text`: prawdziwe brzmi „kwota ≤ 20?", poprawione;
pomiary budżetów wpisane; monitoring 5 par dwustronnych E2/E3/E6/E9/E14
dopisany), 5 drobnych — wcielone (m.in. ~0.8 z tyldą; deklaracja
ridera k-fold; słowniczek drzewa; maska błędnych predykcji w rampie);
agent sprawdził też wariant nietestowany przez autora (predict modelu
trenowanego na całości → 0 ✓); mapowanie 5/5 kryteriów rubryki
potwierdzone; werdykt „gotowe po poprawkach"; (2) research zasobów —
User Guide kanoniczny, wideo PL: seria „I and AI" 2025 (API
zweryfikowane w notebooku autora — pokrycie split/fit/macierz/metryki),
wstęp pystart, macierz DATAcademy; kanały poprzednich modułów bez
materiałów ML (sprawdzone); UCI Online Retail: zip bez rejestracji,
xlsx wymaga openpyxl, **~25% pustych CustomerID wbrew deklaracji
strony** (hak do briefingu 1E.R); StatQuest aktywny.
