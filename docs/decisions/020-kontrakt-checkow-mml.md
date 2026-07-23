# ADR-020 — Nowy kontrakt checków dla M-ML: wektor predykcji, pochodzenie podziału i bramka przecieku zamiast gołej metryki

- **Status:** PROPOZYCJA — czeka na przegląd domenowy Sophii (produkt) + moją finalizację.
  Bramka PROJEKTOWA przed budową pieczątek M-ML. Podstawa mandatu: `CLAUDE.md` v1.11 §5
  (decyzja techniczna odwracalna w domenie Engineering — projekt kontraktu, bez sign-offu
  Darka). Ten dokument **nie** buduje pieczątek, **nie** dotyka `m-ml.json` i **nie** rusza
  produkcji — patrz §5 (runbook następczy) i §6 (granice).
- **Data:** 2026-07-23 · **Autor:** Ethan (CTO) · **Zlecenie:** Oliver (COO), brief 2026-07-23
- **Uruchamia:** znalezisko §4 przeglądu `docs/curation/przeglad-bledne-drogi-16-labow-20260723.md`
  — naiwny scaffold `m-ml.json` niesie wyłącznie checki `value` na skalarnych metrykach ML
  (accuracy, precyzja, czułość) i jest **najgorszym profilem kolizji w całym programie**.
- **Wzór formalny:** ADR-017 (problem z tabelą kolizji zweryfikowaną wykonaniem → decyzja
  z tabelą rozróżnialności → koszt → runbook → ryzyka) oraz ADR-018 (poziom rygoru,
  słowniczek żargonu, „egzekwowanie kodem, nie komentarzem").
- **Powiązania:** ADR-015 (kontrakt checków labów: klasy `value`/`relation`/`predicate`,
  token pieczątki, jawne limity — token laba NIE jest kredencjałem), ADR-017 (precedens
  „struktura zamiast gołego skalara" dla SQL.7, `z3_miejsca1_ids`), ADR-014 D3 (dwie waluty:
  token postępu vs Verified Project Receipt), `CLAUDE.md` §7 (rozdział wagi oceny formującej
  vs kredencjału).
- **Wykonanie (runbook następczy, NIE ten ADR):** Sophia (treść M-ML: dane produkujące
  rozróżnialny artefakt + kanoniczny zbiór), builder pieczątek M-ML (implementacja checków
  z tego kontraktu), Quinn/Eva (kontrakt-testy regresyjne na cztery błędne drogi).

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu, `CLAUDE.md` §3): **check** —
> maszynowa reguła, którą serwer sprawdza po zaliczeniu laba; **pieczątka** (ang. *stamp*) —
> komórka na końcu notebooka, która liczy wynik i wypisuje **token** do wklejenia w SkillBridge;
> **ładunek** (ang. *payload*) — wartości, które token przenosi z sesji studenta do serwera;
> **metryka** — liczba oceniająca model (accuracy = dokładność, precision = precyzja,
> recall = czułość); **accuracy** — odsetek trafnych predykcji; **macierz pomyłek** (ang.
> *confusion matrix*) — tabela 2×2 [TN, FP, FN, TP]: trafne negatywy, fałszywe alarmy,
> przegapienia, trafne pozytywy; **przeciek etykiety** (ang. *label leak*) — cecha będąca
> funkcją celu, przez którą model „zna odpowiedź"; **podział train/test** — rozdzielenie
> danych na uczące i sprawdzające; **provenance / pochodzenie** — dowód, skąd wartość
> pochodzi (tu: z którego zestawu testowego); **baseline** — trywialny model odniesienia
> (strzela najczęstszą klasą); **wektor predykcji** — lista przewidywań modelu z tożsamością
> każdej próbki.

---

## 1. Problem — to jest projektowanie oceny, nie kosmetyka

### 1.1 Defekt w jednym zdaniu

Scaffold `tools/content/curriculum-atoms/m-ml.json` niesie **wyłącznie checki klasy `value`
na skalarnych metrykach** (ml-4: `acc_base`=0.6667, `acc_model`=0.8333; ml-7: `prec`=0.8,
`rec`=1.0). Metryka policzona na 6-elementowym teście przyjmuje **~7 możliwych wartości**
(0/6…6/6), więc kolizja — kilka różnych dróg lądujących na tej samej liczbie — jest tu nie
wyjątkiem, lecz regułą. To ten sam defekt co SQL.7 z ADR-017 (goły licznik jako ładunek),
tylko **14 notebooków naprzód i groźniejszy**: w M-SQL kolizję dawała skorelowana treść,
którą dało się rozerwać (zmiana danych); tutaj kolizja siedzi **w samej naturze metryki**
i zmianą danych jej nie usuniesz.

Skutek: student, który dojdzie do właściwej liczby **błędną drogą**, dostaje token —
fałszywie pozytywna **ocena formująca**, która od 2026-06-29 obowiązuje sama (`CLAUDE.md`
§7: w warstwie edukacyjnej werdykt maszyny jest samowystarczalny). Skoro obowiązuje sam,
musi być prawdziwy.

### 1.2 Jedyny dobry instynkt scaffoldu

ml-7 C5 `macierz`=[1,1,0,4] — **struktura, nie goły skalar**. To jest zalążek właściwego
kierunku; ten ADR rozszerza go na cały moduł i uzupełnia o dwie bramki, których macierz
sama nie daje (pochodzenie podziału i przeciek).

### 1.3 Cztery klasyczne błędne drogi trafiające w ten sam skalar

Klasyka dydaktyki ML — dokładnie te, przed którymi treść M-ML ostrzega (ml-2 „ocena na
treningu", ml-3 „baseline", ml-6 „leakage"):

1. **Przeciek etykiety** — cecha jest funkcją celu; accuracy blisko 1.0 **wygląda jak
   sukces**. Najgroźniejszy, bo nie daje komunikatu błędu (ml-6 to nazywa: „najgroźniejsze
   błędy nie mają komunikatów").
2. **Zły podział train/test** — inny zestaw testowy, który przypadkiem daje 4/6 albo 5/6.
3. **Klasa większościowa** (baseline `most_frequent`) — strzela zawsze najczęstszą klasą.
4. **Model „wszystko pozytywne"** (`constant=1`) — czułość 1.0 **za darmo**.

### 1.4 Tabela kolizji — zmierzona wykonaniem, nie wywnioskowana

Zweryfikowane na kanonicznym mini-świecie odtwarzającym liczby modułu (24 przejazdy,
cechy minuty/kwota/godzina, cel „napiwek"; `train_test_split(test_size=0.25,
random_state=42)` → 18 uczących / 6 testowych; scikit-learn 1.9.0, 2026-07-23 — szczegóły
i pełny listing w §7). Punkt odniesienia: dobra droga daje `acc_model`=0.8333,
macierz [[1,1],[0,4]], `prec`=0.8, `rec`=1.0, zestaw testowy o identyfikatorach
`[0, 8, 9, 11, 16, 18]`.

| Błędna droga | Naiwny check `value` | Werdykt dziś | Dlaczego groźne |
|---|---|---|---|
| **Zły podział** (`random_state=5` zamiast 42) | `acc_model`=**0.8333** | **TOKEN** ✘ | trafia 5/6 na **innym** zestawie testowym `[2,17,18,19,20,23]` — goły skalar tego nie widzi |
| **Wszystko pozytywne** (`constant=1`) | `rec`=**1.0** | **TOKEN** ✘ | dobra droga też ma `rec`=1.0 — czułość sama nie odróżnia modelu od strzelca |
| **Klasa większościowa** — model zdegenerowany do `most_frequent` | `acc_model`=**0.6667** | **TOKEN** ✘ jeśli check dopuszcza 0.667 | check `acc_base`=0.6667 jest legalny (baseline TO jest `most_frequent`); defekt to **model** strzelający większościową, który przechodzi tam, gdzie ładunkiem jest sam skalar |
| **Przeciek etykiety** (cecha = cel) | `acc_model`=1.0 → dziś odrzuca | pół-ślepy | odrzuca go **przypadkiem** (1.0 ≠ 0.833); przy luźniejszym progu albo innej wartości oczekiwanej przechodzi — patrz §2 D3 |

Dwa pierwsze wiersze to **realne fałszywe zaliczenia już w naiwnym kontrakcie** (zmierzone:
zły podział `random_state=5` daje dokładnie 5/6; „wszystko pozytywne" daje `rec`=1.0). Trzeci
i czwarty pokazują, że skalar broni się tylko tam, gdzie ma szczęście do wartości oczekiwanej
— to nie jest obrona, to zbieg okoliczności.

### 1.5 Uczciwa waga: co to psuje, a czego nie (wzór ADR-017 §1.4)

- **NIE psuje kredencjału.** Token laba bramkuje postęp w drabinie, nie wystawia dowodu
  kompetencji (ADR-015 §5, ADR-014 D3). Verified Project Receipt nadal wymaga sandboxa,
  vivy i człowieka; **człowiek ma ostatnie słowo** (`CLAUDE.md` §7, bez zmian). Ten ADR
  nie dotyka warstwy kredencjału.
- **Psuje ocenę formującą — tam, gdzie od 2026-06-29 maszyna jest samowystarczalna.**
  Fałszywie pozytywna ocena formująca to nie „drobiazg poniżej progu kredencjału" — to
  jedyna informacja zwrotna, jaką student dostaje w chwili, gdy nieporozumienie o leakage
  albo baseline jest jeszcze tanie do naprawienia. M-ML uczy dokładnie tych trzech grzechów
  (ocena na treningu, przeciek, brak baseline'u) — check, który je przepuszcza, uczy
  studenta, że popełnił je bezkarnie.
- **Psuje najtańszy moment naprawy.** Grzech wykryty na capstonie kosztuje recenzję człowieka
  i vivę; wykryty przez pieczątkę kosztuje jeden hint.

### 1.6 Dlaczego robimy to TERAZ, przed budową M-ML

M-ML jeszcze nie istnieje jako notebooki — jest sam scaffold. Wzmocnienie kontraktu **przed**
napisaniem 7 notebooków oznacza, że treść od razu produkuje dane, na których checki mają moc.
Odwrotna kolejność to ADR-017 raz jeszcze: naprawa po fakcie, 14 plików do przepisania.
Diagnoza (ten ADR) może iść **równolegle** z projektem treści M-ML; **budowa pieczątek —
nie przed finalizacją tego kontraktu**.

---

## 2. Decyzja — cztery bramki, każda łapie inną błędną drogę

Zasada nadrzędna (rozwinięcie ADR-017 §7): **ładunek pieczątki niesie strukturę z tożsamością
próbek, nie zagregowany skalar.** Cztery błędne drogi z §1.3 muszą dać **różne ładunki** —
i dają, co pokazuje tabela rozróżnialności w §2.5 (zmierzona wykonaniem).

### D1 · Wektor predykcji z tożsamością próbki — rdzeń decyzji

Ładunek ml-4 i ml-7 niesie **posortowaną listę par `[id_próbki, predykcja]`** dla zestawu
testowego, nie samo `acc_model`:

```
"y_pred_test": [[0, 1], [8, 0], [9, 1], [11, 1], [16, 1], [18, 1]]
                 ^id     ^predykcja modelu dla tej konkretnej próbki
```

To jest odpowiednik `z3_miejsca1_ids` z ADR-017 D2, podniesiony o jeden poziom: nie „ile
trafień", lecz „**co dokładnie przewidział model dla której próbki**". Kluczowa własność
(zmierzona, §7): wektor referencyjny koduje **charakterystyczną pomyłkę** poprawnego modelu —
naiwne drzewo myli próbkę 9 (przewiduje 1, prawda 0; stąd macierz [[1,1],[0,4]] z jednym
fałszywym alarmem). Każda droga, która tej pomyłki **nie** powtarza albo popełnia **inną**,
daje inny wektor:

- **Wszystko pozytywne / klasa większościowa** → wektor stały `[…,1],[…,1],…` — różni się
  od wzorca na próbce 8 (wzorzec: 0). **Złapane.**
- **Przeciek etykiety** (cecha = cel, accuracy 1.0) → wektor `[[0,1],[8,0],[9,0],…]` —
  poprawnie przewiduje próbkę 9, której wzorzec NIE trafia. Różni się na próbce 9.
  **Złapane** — i to jest mocne: wektor referencyjny jest „za słaby" celowo (ma pomyłkę),
  więc bezbłędny przeciek go zdradza.
- **Inny/błędny model** trafiający te same 5/6, ale mylący inną próbkę → inny wektor.
  **Złapane.**

Zysk uboczny: wektor **weryfikuje wynik (predykcje per próbka), nie metodę**. Zmierzone (§7):
drzewo o innej głębokości, kNN, regresja logistyczna — wszystkie poprawne pipeline'y —
dają **ten sam** wektor. Kontrakt nie odrzuca legalnych alternatyw; odrzuca błędne drogi.

### D2 · Check pochodzenia podziału (split-provenance)

Ładunek niesie **posortowaną listę identyfikatorów zestawu testowego**:

```
"test_ids": [0, 8, 9, 11, 16, 18]
```

Provenance ma sens, bo **podział jest zafiksowany w szkielecie notebooka** (`random_state=42`
w treści laba, jak dziś w ml-4/ml-7) — zestaw testowy jest więc deterministyczny i serwer zna
jego `test_ids` z góry. Łapie to, czego wektor sam nie złapie: **zły podział** (student zmienia
`random_state` → inny zestaw testowy → inne `test_ids` ≠ wzorzec) oraz **ocenę na treningu**
(18 identyfikatorów zamiast 6, obce klucze). Zmierzone (§7): `random_state=5` daje `acc_model`=0.8333 (przechodzi naiwny
skalar!) na zestawie `[2,17,18,19,20,23]` — provenance to odrzuca. To jest odpowiednik
eda-4, gdzie pieczątka weryfikuje, że kolumny pochodzą z API, a nie „wyglądają dobrze".

Dodatkowo — bramka „metryka liczona na teście, nie na treningu": skoro `test_ids` są zafiksowane
i rozłączne z treningiem, a `y_pred_test` ma dokładnie tyle wpisów, ile `test_ids`, ocena na
treningu (18 predykcji) rozjeżdża się na obu checkach naraz.

### D3 · Bramka anty-przeciek celu (target-leak gate)

Pieczątka liczy — na **danych treningowych** — czy któraś cecha jest (niemal) deterministyczną
funkcją celu, i wystawia to jako check:

```
"max_corr_cecha_cel": 0.0 …             # |korelacja| najsilniejszej cechy z celem na treningu
# odmowa / brak tokenu, gdy przekracza próg (np. 0.98) — cecha „zna odpowiedź"
```

Rola tej bramki jest **podwójna i trzeba ją nazwać uczciwie**:

- **Na labie z zafiksowanym mini-światem** przeciek łapie już D1 (bezbłędny przeciek daje
  inny wektor — zmierzone). Bramka D3 jest tu **defense-in-depth + dydaktyka**: zamiast
  niemej odmowy „zły wektor" student dostaje **celną diagnozę** — „cecha `X` jest funkcją
  celu, to przeciek (ml-6 grzech 3)". To zamienia odrzucenie w naukę.
- **Na capstonie** (dane realne, brak wektora referencyjnego, bo zbiór nie jest kanoniczny)
  D1 nie działa — **D3 jest jedyną maszynową obroną przed przeciekiem.** Dlatego projektujemy
  ją teraz jako część kontraktu M-ML, nie jako łatkę per lab.

**Uczciwa granica (zmierzona, §7):** bramka celuje w **deterministyczny / bliski-deterministyczny**
przeciek (korelacja → 1, accuracy → 1.0 „100% wygląda jak sukces") — czyli w klasyczny,
groźny przypadek. Zaszumiony częściowy przeciek, który przypadkiem odtwarza **dokładnie**
poprawne predykcje wzorca, jest wynikowo nieodróżnialny od poprawnego modelu (ta sama lista
`y_pred_test`) — i nie jest „oszustwem" w sensie, który ma znaczenie dla oceny formującej,
bo output jest poprawny. Progu nie ustawiamy agresywnie w dół (fałszywe odmowy legalnych,
silnie skorelowanych cech kosztują więcej niż łapią). Próg i dokładna definicja korelacji
(Pearson dla cech liczbowych; osobno cechy kategoryczne) → do domknięcia w runbooku z Sophią,
bo zależą od finalnych cech treści.

### D4 · Rozkład predykcji jako szybki dyskryminator degeneracji

Ładunek niesie flagę **`predykcja_stala`** (czy model przewiduje jedną klasę dla całego testu).
Formalnie podzbiór D1 (stały wektor to szczególny przypadek), ale wystawiony osobno, bo daje
**czytelną diagnozę** dla dwóch najczęstszych degeneracji: „Twój model przewiduje zawsze tę
samą klasę — to klasa większościowa / «wszystko pozytywne», nie nauczony model (ml-3, ml-5)".
Rozstrzyga też kolizję z §1.4 wiersz 2: dobra droga i „wszystko pozytywne" mają **identyczną
czułość 1.0**, ale macierz [1,1,0,4] vs [0,2,0,4] (TN: 1 vs 0) i `predykcja_stala` (fałsz vs
prawda) je rozdzielają — zmierzone (§7).

**Zachowujemy macierz pomyłek** (dobry instynkt ml-7 C5) jako check `value` na strukturze
[TN, FP, FN, TP] — jest tańsza do przeczytania przez człowieka niż pełny wektor i domyka oś
precyzja/czułość na ml-7.

### 2.5 Tabela rozróżnialności — zmierzona wykonaniem (rdzeń, wzór ADR-017 D2)

Cztery błędne drogi vs cztery bramki. „✔ przechodzi" = wygląda jak dobra droga na tej bramce;
„✘ ODMOWA" = bramka łapie. Dobra droga przechodzi wszystkie (kolumna kontrolna).

| Droga | `acc` (naiwny skalar) | D1 wektor `y_pred_test` | D2 provenance `test_ids` | D3 bramka przecieku | D4 `predykcja_stala` | Werdykt kontraktu |
|---|---|---|---|---|---|---|
| **Dobra droga** | 0.833 ✔ | `[[0,1],[8,0],[9,1],[11,1],[16,1],[18,1]]` ✔ | `[0,8,9,11,16,18]` ✔ | ~0 ✔ | fałsz ✔ | **TOKEN** ✔ |
| Zły podział (rs=5) | **0.833 ✔** (przechodzi!) | inny wektor ✘ | `[2,17,18,19,20,23]` **✘ ODMOWA** | ~0 | fałsz | **ODMOWA** (D2) |
| Ocena na treningu | 1.0 | 18 wpisów, obce klucze ✘ | 18 identyfikatorów **✘ ODMOWA** | ~0 | fałsz | **ODMOWA** (D1+D2) |
| Klasa większościowa | 0.667 | `[[…,1]×6]` **✘ ODMOWA** | `[0,8,9,11,16,18]` ✔ | ~0 | **prawda ✘ ODMOWA** | **ODMOWA** (D1+D4) |
| Wszystko pozytywne | 0.667; **`rec`=1.0 ✔** | `[[…,1]×6]` **✘ ODMOWA** | ✔ | ~0 | **prawda ✘ ODMOWA** | **ODMOWA** (D1+D4) |
| Przeciek etykiety | 1.0 | `[[0,1],[8,0],[9,0],…]` **✘ ODMOWA** | ✔ | **wysoka ✘ ODMOWA** | fałsz | **ODMOWA** (D1+D3) |

**Każda z czterech błędnych dróg daje inny ładunek niż dobra droga** — a większość jest łapana
przez ≥2 bramki (obrona nadmiarowa). Odmowa pada z **diagnozą wskazującą przyczynę**, nie sam
fakt (wzór ADR-017): „oceniasz na treningu — masz 18 predykcji zamiast 6" / „inny podział niż
zafiksowany `random_state=42`" / „model przewiduje zawsze jedną klasę" / „cecha `X` jest funkcją
celu — przeciek".

---

## 3. Koszt

Ten ADR to **projekt kontraktu** — jego własny koszt to przeliczenia z §7 (zrobione). Koszt
**wdrożenia** (osobne kroki, §5) — oszacowany, nie poniesiony:

| Krok | Wykonawca | Szacunek |
|---|---|---|
| Projekt kontraktu + weryfikacja rozróżnialności wykonaniem (ten ADR) | Ethan | **0 — zrobione 2026-07-23** (liczby z §7, nie z rachunku na kartce) |
| Treść M-ML tak, by dane produkowały rozróżnialny artefakt (kanoniczny zbiór z charakterystyczną pomyłką modelu; cechy bez przypadkowego przecieku) | Sophia | w ramach kuracji M-ML (7 atomów, stawka ADR-014: 2,8–4,1 h/atom) — **+~1 h** na domknięcie kanonicznego zbioru i punktów kontrolnych |
| Builder pieczątek: warstwa treści licząca `y_pred_test`/`test_ids`/`max_corr`/`predykcja_stala` + odmowy z diagnozą | builder M-ML | ~2–3 h (warstwa pieczątki wspólna z ADR-015 bez zmian — liczy się tylko warstwa treści) |
| Packer: checki `value` na strukturach dla ml-4/ml-7 (wzór `z3_miejsca1_ids` z ADR-017) | Ethan | ~0,5 h |
| Kontrakt-testy: 4 scenariusze odmowy (zły podział, ocena na treningu, wszystko pozytywne, przeciek) + dobra droga | Quinn/Eva | ~1,5 h |
| **Razem wdrożenie** (poza kuracją treści) | | **~5–7 h**, zero migracji schematu |

Dla skali: to mniej niż dwa nowe atomy. Zero nowej infrastruktury — mechanizm token/pieczątka
z ADR-015 unosi struktury bez zmian (StampValue dopuszcza listy; ADR-017 przećwiczył listę
`[1,2,4]`). **Jedno do potwierdzenia przez buildera:** czy `evalValue`/`_norm` normalizują
**listy zagnieżdżone** `[[0,1],[8,0]]` tak samo jak płaskie. Jeśli nie — fallback bez zmian
w kodzie pieczątki: dwie równoległe listy płaskie `y_pred_ids` + `y_pred_vals` (ta sama moc
rozróżniania, koszt: jeden check więcej).

---

## 4. Rekomendacja i warianty odrzucone

> **Wzmacniamy kontrakt M-ML wg D1–D4 przed budową pieczątek M-ML.** Diagnoza (ten ADR)
> gotowa; projekt treści M-ML idzie równolegle; **budowa pieczątek czeka na finalizację tego
> kontraktu po przeglądzie Sophii.**

| Wariant | Werdykt |
|---|---|
| **Nie zmieniamy (goły skalar)** | ODRZUCONE — zmierzone fałszywe zaliczenia (zły podział 5/6, „wszystko pozytywne" `rec`=1.0) w module uczącym dokładnie tych grzechów |
| **Tylko macierz pomyłek** (rozszerzyć C5 na ml-4) | ODRZUCONE jako komplet — macierz łapie degeneracje i oś czułości, ale **nie** złego podziału (inny test o tej samej macierzy) ani przecieku na capstonie. Dobry składnik (D4), niewystarczający sam |
| **Tylko wektor predykcji** (D1 bez D2/D3) | ODRZUCONE — nie łapie złego podziału trafiającego 5/6 (inny zestaw, inny wektor „legalnie"), a na capstonie bez wektora referencyjnego nie broni przed przeciekiem |
| **Uruchamiać kod studenta w sandboxie i liczyć metryki po naszej stronie** | ODRZUCONE — ADR-015 D4 wprost: żaden check laba nie wymaga wykonania kodu studenta; sandbox zostaje w ocenie projektów. Ładunek deterministyczny wystarcza |
| **Podnieść próg/tolerancję na skalarze** | ODRZUCONE — kolizja jest strukturalna (7 możliwych wartości), nie tolerancyjna; luźniejszy próg **pogarsza** (wpuszcza więcej dróg) |

---

## 5. Runbook następczy — co robi kto (NIE w tym ADR)

Kolejność wiążąca: **treść → builder pieczątek → packer → kontrakt-testy**. Ten ADR kończy
się na projekcie; poniższe to osobne zadania po przeglądzie Sophii i mojej finalizacji.

### Sophia (treść M-ML) — warunek konieczny, żeby checki miały moc

- **Kanoniczny zbiór z charakterystyczną pomyłką modelu.** Dane muszą być takie, by poprawny
  naiwny model **mylił się na ≥1 próbce testowej** (jak wzorcowa macierz [[1,1],[0,4]] z jednym
  fałszywym alarmem). To jest fundament D1: gdyby model trafiał 6/6, wektor referencyjny byłby
  identyczny z przeciekiem i D1 straciłby moc. Zbiór zafiksowany ziarnami (`random_state=42`
  wszędzie), policzalny w pamięci (rząd 20–30 wierszy, jak dziś).
- **Cechy bez przypadkowego przecieku.** Żadna cecha treści (minuty/kwota/godzina) nie może
  być funkcją celu — inaczej D3 odrzuci poprawną drogę. To ustala próg D3.
- **Treść, która prowokuje błędne drogi świadomie** (jak M-SQL fading) — po to, by check
  je łapał; ml-2/ml-3/ml-6 już to robią narracyjnie.
- **Nota:** to NIE jest zmiana istniejącej produkcji — M-ML jeszcze nie zbudowane. Sophia
  pisze treść od zera pod ten kontrakt.

### Builder pieczątek M-ML

- Warstwa treści pieczątki ml-4/ml-7 liczy i wystawia: `y_pred_test` (posortowane pary
  `[id,pred]`), `test_ids`, `max_corr_cecha_cel`, `predykcja_stala`, `macierz` [TN,FP,FN,TP].
- Odmowy **przed emisją tokenu** z diagnozą po polsku wskazującą przyczynę (wzór ADR-017:
  „miejsce 1 zajmują u Ciebie … a powinny …").
- Warstwa pieczątki (serializacja + podpis) — **wspólny blok z ADR-015, nietknięty**.
- Potwierdzić normalizację list zagnieżdżonych (§3) — albo fallback dwóch list płaskich.

### Packer + kontrakt-testy (Ethan; Quinn/Eva)

- `pack-curriculum-atoms.ts`: checki `value` na strukturach dla ml-4/ml-7; `expect` wyliczone
  z **finalnego** notebooka Sophii (jak ADR-017 liczył `expect` z finalnych danych — wartości
  z §7 są ze zbioru-atrapy, nie z produkcji).
- Kontrakt-test: 4 scenariusze odmowy (§2.5) + dobra droga jako regresja na dokładnie ten defekt.

---

## 6. Granice, ryzyka i czego ten ADR nie robi

**Czego ten ADR świadomie nie robi (nazwane, nie zamiecione):**

- **Nie buduje pieczątek ani treści M-ML** i **nie dotyka `m-ml.json`** (artefakt). To projekt
  kontraktu — wykonanie w §5.
- **Nie rusza produkcji, nie scala, nie ingestuje.** Zero zmian schematu bazy.
- **Nie wystawia kredencjału.** Warstwa dowodu kompetencji (sandbox + viva + człowiek) bez
  zmian; `CLAUDE.md` §7 nienaruszone.

**Ryzyka:**

| Ryzyko | Waga | Obsługa |
|---|---|---|
| Zbiór-atrapa z §7 ≠ finalny zbiór Sophii — konkretne `expect` (wektor, `test_ids`) się zmienią | pewne, wbudowane | wartości liczy builder z **finalnego** notebooka; §7 dowodzi **własności** (rozróżnialność), nie konkretnych liczb produkcyjnych |
| Model trafia 6/6 → wektor referencyjny = przeciek, D1 traci moc | średnia | warunek treści dla Sophii (§5): model MUSI mylić ≥1 próbkę; kontrakt-test to sprawdza |
| Próg D3 za ostry → fałszywe odmowy legalnych silnie skorelowanych cech | średnia | próg dobrany na finalnych cechach; domyślnie konserwatywny (0.98), celuje w deterministyczny przeciek |
| Listy zagnieżdżone nienormalizowane przez `evalValue` | niska | fallback dwóch list płaskich (§3), zero zmian w pieczątce |
| Token podrabialny (student zna funkcję) | akceptowane | jak ADR-015 D3 — laby nie wystawiają kredencjału; bramki celują w **przypadkową** błędną drogę (uczciwy student), nie w zdeterminowanego oszusta |

**Wycofanie:** N/D — dokument projektowy, nic nie wdraża. Zmiana kierunku = rewizja tego ADR
przed budową.

---

## 7. Weryfikacja wykonaniem (scikit-learn 1.9.0, 2026-07-23)

**Uczciwe zastrzeżenie o statusie danych.** M-ML nie ma jeszcze notebooków — kanoniczny zbiór
„napiwki" jest tylko **cytowany** w treści scaffoldu, nie zmaterializowany. Do weryfikacji
zbudowałem **zbiór-atrapę** (24 wiersze, ziarno generatora 17), dobrany tak, by **odtworzyć
opublikowane liczby modułu**: baseline 0.6667 (4/6), model 0.8333 (5/6), macierz [[1,1],[0,4]],
precyzja 0.8, czułość 1.0. Zbiór-atrapa zastępuje finalny zbiór Sophii wyłącznie po to, by
**własność rozróżnialności** dało się zmierzyć, a nie tylko opisać. Rozróżnialność jest
**strukturalna** (niezależna od konkretnego zbioru); konkretne wartości `expect` policzy builder
z finalnego notebooka (§5) — dokładnie jak ADR-017 liczył `expect` z finalnych danych.

**Zmierzone (nie wywnioskowane):**

- **Punkt odniesienia** (drzewo `random_state=42`, ocena na teście `random_state=42`):
  `acc_model`=0.8333, macierz [[1,1],[0,4]], `prec`=0.8, `rec`=1.0, `test_ids`=[0,8,9,11,16,18],
  wektor `[[0,1],[8,0],[9,1],[11,1],[16,1],[18,1]]`. Model myli próbkę 9 (fałszywy alarm).
- **Zły podział** `random_state=5`: `acc_model`=0.8333 (**przechodzi naiwny skalar**), zestaw
  testowy [2,17,18,19,20,23] ≠ wzorzec → **provenance odrzuca**.
- **Ocena na treningu**: `acc`=1.0, 18 predykcji, klucze [1,2,3,4,5,6,7,10,…] → **D1+D2 odrzucają**.
- **Klasa większościowa** i **wszystko pozytywne**: obie `acc`=0.6667, obie `rec`=**1.0**
  (kolizja z dobrą drogą na czułości), wektor stały `[…,1]×6`, `predykcja_stala`=prawda,
  macierz [0,2,0,4] ≠ [1,1,0,4] → **D1+D4 odrzucają; macierz rozdziela oś czułości**.
- **Przeciek etykiety** (cecha = cel): `acc`=1.0, wektor `[[0,1],[8,0],[9,0],[11,1],[16,1],[18,1]]`
  (poprawnie trafia próbkę 9, której wzorzec NIE trafia) → **D1 odrzuca**; korelacja cechy z celem
  na treningu ≈ 1.0 → **D3 odrzuca** z diagnozą.
- **Brak nadmiarowego odrzucania**: drzewo o innej głębokości (1, 2), kNN (k=3, 5), regresja
  logistyczna — wszystkie poprawne — dają **identyczny wektor** co wzorzec. Kontrakt weryfikuje
  wynik, nie metodę.

**Na papierze (niezweryfikowane wykonaniem):** dokładny próg D3 i traktowanie cech
kategorycznych (zbiór-atrapa ma tylko cechy liczbowe); normalizacja list zagnieżdżonych przez
`evalValue`/`_norm` (§3 — do potwierdzenia przez buildera na realnym harnessie, jak ADR-018
sprawdził generator migracji); zachowanie na finalnym zbiorze Sophii (inne konkretne liczby,
ta sama struktura).

Skrypty weryfikacyjne (zbiór-atrapa + sześć dróg + tabela rozróżnialności) uruchomione lokalnie
w izolowanym środowisku; nie wchodzą do repo (jak przeliczenia DuckDB w ADR-017). Reprodukcja:
`train_test_split(test_size=0.25, random_state=42)`, `DecisionTreeClassifier(random_state=42)`,
`DummyClassifier(strategy="most_frequent" | constant=1)`, scikit-learn 1.9.0.
