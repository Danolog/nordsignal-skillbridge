# Przegląd „jaka błędna droga daje ten sam ładunek?" — laby ścieżki DS poza M-SQL

- **Wersja:** v1.0 · 2026-07-23
- **Autor:** Ethan (CTO) · **Zlecenie:** Oliver (COO), brief 2026-07-23
- **Podstawa metody:** ADR-017 §7 (`docs/decisions/017-korelacja-minuty-kwota-msql.md`) —
  „check klasy `value` na skalarze zagregowanym jest tak mocny, jak wąski jest zbiór
  błędnych dróg, które trafiają w ten sam skalar".
- **Charakter dokumentu:** DIAGNOZA (krok 1 z 2 przed partią M-ML). Same naprawy słabych
  labów to osobny krok (jak M-SQL / ADR-017) — tu je nazywam i priorytetyzuję, nie wykonuję.
- **Podstawa mandatu:** `CLAUDE.md` v1.11 §5 (decyzja techniczna odwracalna w domenie
  Engineering — diagnoza, bez sign-offu Darka). NIE scalam, NIE ruszam prod, NIE zmieniam
  treści labów w tym kroku.

---

## 0. Podsumowanie

| Miara | Wartość |
|---|---|
| Laby realnie przejrzane | **13** (nie 16 — patrz §1, uczciwe rozliczenie liczby) |
| MOCNY (zbiór błędnych dróg pusty/pomijalny) | **12** |
| SŁABY (istnieje realna błędna droga → wzmocnienie) | **1** (f2-7) |
| 🔴 KRYTYCZNY (token dla ewidentnie błędnego rozwiązania na prodzie) | **0** |

**Jednozdaniowy werdykt:** istniejące laby poza M-SQL są w dobrym stanie — większość
wygrywa dokładnie tym, czego ADR-017 wymaga (przeliczenie z artefaktu studenta,
check pochodzenia, asymetryczna próbka sondy). **Jedyny realny defekt to degeneracja
próbki sondy w f2-7.** Znacznie ważniejsze znalezisko dotyczy jednak **przyszłości, nie
przeszłości: scaffold M-ML (`m-ml.json`) niesie czyste checki `value` na metrykach ML —
to najgorszy profil ryzyka w całym programie i NIE wolno go zbudować w obecnej postaci**
(§4). To jest właściwy cel tego przeglądu.

**Nic nie blokuje istniejących 13 labów. Blokuje natomiast naiwny scaffold M-ML** —
checki ml-4/ml-7 wymagają przeprojektowania (wzorem ADR-017 D2) ZANIM powstaną notebooki
M-ML. Diagnoza może iść równolegle z projektem treści M-ML; budowa pieczątek M-ML — nie
przed wzmocnieniem checków.

---

## 1. Uczciwe rozliczenie liczby: 13, nie 16

Brief zakłada „~16 labów (L0, F1–F3, M-PD, M-EDA)"; ADR-017 §7 szacował „16 z 18".
Po dokładnej enumeracji (kontrakt-testy + atomy + źródła notebooków) **realnych labów
z pieczątką w tym zakresie jest 13**. Rozliczenie:

| Moduł | Laby z pieczątką (checki `value`/`relation`/`predicate`) |
|---|---|
| L0 | 4 (l0-1, l0-2, l0-3, l0-4) |
| F1 | 2 (f1-4, f1-7) |
| F2 | 2 (f2-4, f2-7) |
| F3 | 2 (f3-4, f3-7) |
| M-PD | 2 (pd-4, pd-8) |
| M-EDA | 1 (eda-4) |
| **Razem w zakresie** | **13** |

Pełny obraz „19/19" z handoffa = te 13 **+** M-SQL (2, wyłączone — ADR-017) **+** M-ML
(2, cel odgruzowania — jeszcze niezbudowane, sam scaffold) **+** M-LLM (2, poza zakresem
briefu, niezbudowane). 13 + 2 + 2 + 2 = 19. Liczba „16" była szacunkiem sprzed
enumeracji — nie naciągam jej do zgodności; realnie przejrzałem **13**.

Metoda per lab: odczyt kontraktu checków z atomu (`tools/content/curriculum-atoms/*.json`)
**oraz** logiki pieczątki ze źródła (`tools/content/notebooks/**/*.py`) — bo notatka
w atomie deklaruje intencję, a dopiero kod pieczątki pokazuje, czy check realnie przelicza,
czy tylko porównuje skalar. (Lekcja ADR-017: „zmierzone, nie wywnioskowane".)

---

## 2. Tabela per lab

Legenda ładunków: `value` = porównanie do skalara/struktury; `relation` = pieczątka
przelicza niezależnie z danych studenta; `predicate` = własność (typ, obecność, niepusty).

| Lab | Check(i) klasy `value`/`relation` — co porównuje | Błędna droga dająca ten sam ładunek | Werdykt | Rekomendacja |
|---|---|---|---|---|
| **l0-1..l0-4** | brak — same `predicate` (wykonanie komórki, `imie`≠„Alex", ≥2 zmienne) | brak ładunku skalarnego do zgrania; „hello world", limity jawne (restart nieweryfikowalny z Pythona) | **MOCNY** | żadna — token nie niesie kredensu kompetencji, limity zadeklarowane |
| **f1-4** | `relation`: `razem`=`cena`×`sztuki`; `srednio_dziennie`=`razem`/30 — przeliczane z wejść studenta | brak — relacja JEST poprawnym obliczeniem; wejścia wybiera student | **MOCNY** | żadna |
| **f1-7** | `relation`: `koszt_tygodnia`=`cena`×`dziennie`×5 (przeliczane) + `predicate` if/else (KRUCHE, jawnie nieblokujące) | brak dla relacji; introspekcja tekstu if/else obchodliwa, ale zadeklarowana i nieblokująca | **MOCNY** | żadna (fragilność if/else świadoma) |
| **f2-4** | brak `value`; `predicate`: `ceny` ≥5 pozycji, wszystkie liczby | brak ładunku skalarnego; jawny limit „pieczątka nie widzi wypisania paragonu" | **MOCNY** | żadna (limit pętli zadeklarowany, poza zakresem tokenu) |
| **f2-7** | **`value`: `sonda_suma_wydatkow`=6** — pieczątka woła `suma_wydatkow([1,2,3])` | **`return math.prod(vals)`** → 6; `return len(vals)*2` → 6; `return max(vals)*2` → 6. Na [1,2,3] suma=iloczyn=len×2=6 (próbka zdegenerowana) | **SŁABY** | asymetryczna próbka, np. `[2,5,10]` → suma=17 (iloczyn=100, len×2=6, max×2=20 — tylko suma daje 17). Zabija wszystkie kolizje jedną zmianą. Wzór już w f3-7 K2 |
| **f3-4** | `relation`: `suma_duzych` i `male_licznik` — pieczątka liczy `ref_duze`, `ref_suma`, `ref_licznik` i sprawdza `duze==ref_duze` (tożsamość LISTY, nie sam skalar) | brak — sprawdza i listę, i sumę, i licznik względem własnej maski | **MOCNY** | żadna (wzorzec docelowy) |
| **f3-7** | `relation` K2 (sonda 3-funkcyjna na próbce alfa=14.5/beta=5.5/total=20 — wszystkie różne, sprawdza tożsamość rekordu `najdrozszy`) + K3 (spójność sum, przeliczana) | brak — próbka asymetryczna, `najdrozszy` sprawdza `nazwa` rekordu, nie samą kwotę | **MOCNY** | żadna — **wzorcowy przykład**, kontrapunkt do f2-7 |
| **pd-4** | **`value`: `rok2020_wiersze`=3, `maz_kolumny`=2** | rok2020: `df.head(3)` daje 3 wiersze → ale check przelicza `df[df.rok==2020]` i żąda „wszystkie=2020" → złapane. maz: wybór złych 2 kolumn → check żąda DOKŁADNIE `{rok,wartosc}` + pochodzenia z indeksu `df` → złapane | **MOCNY** | żadna — skalary podparte przeliczeniem i pochodzeniem |
| **pd-8** | **`value`: `wiersze_wejscie`=12, `braki_wejscie`=2** (strażniki nienaruszalności wejścia) + `relation` C5 (`srednie_woj` przeliczane) | strażniki wejścia nie niosą tezy analitycznej; C5 przelicza grupowanie na `dane_analiza` studenta; C3/C4 świadomie luźne (7≤len≤12 — wiele decyzji o brakach legalnych) | **MOCNY** | żadna (luz jest kontraktowy, nie defektem) |
| **eda-4** | **`value`: `status`=200, `kolumny`=3, `wiersze`=32** | kształt jest niezmiennikiem — ale pieczątka robi **check POCHODZENIA**: `wojewodztwo`⊂nazwy z API, `stopa`⊂wartości `val` z API. Już zamknęli dziurę „attrId=1 dawał token identyczny z poprawnym" (komentarz w kodzie, l. 240-243) | **MOCNY** | żadna — **drugi wzorzec** (ADR-017 D2 zinternalizowany); jedyny residuum: `status=200` obchodliwe ręcznie, ale to jawny limit, nie błędna-droga-rozumienia |

---

## 3. SŁABE laby — lista skondensowana

**f2-7 „Strażnik budżetu" (F2)** — jedyny SŁABY.
- **Błędna droga (jedno zdanie):** funkcja licząca `iloczyn` (albo `len×2`, `max×2`) zamiast
  sumy przechodzi, bo sonda woła ją na `[1,2,3]`, gdzie suma = iloczyn = len×2 = 6.
- **Rekomendacja:** zmienić próbkę sondy na asymetryczną, np. `[2, 5, 10]` (jedyny wynik
  sumy = 17; żadna z kolidujących operacji tam nie trafia). Zero zmian w kontrakcie
  poza stałą oczekiwaną (17 zamiast 6) i próbką — koszt < 0,5 h, wzór gotowy w f3-7 K2.
- **Kalibracja wagi (dlaczego SŁABY, nie 🔴):** deklarowany cel sondy (złapanie funkcji
  czytającej globalną `wydatki` zamiast parametru) **działa** — funkcja ignorująca
  parametr zwraca sumę globalnej listy ≠ 6. Residuum to tylko kolizja suma↔iloczyn, a
  „iloczyn zamiast sumy" w atomie wprost nazwanym „suma", po F2.5 (wzorzec akumulatora),
  to droga NISKIEGO prawdopodobieństwa — w przeciwieństwie do ADR-017, gdzie sekwencja
  fadingu AKTYWNIE prowokowała odwrotne sortowanie. Realny defekt, tania naprawa, brak
  aktywnej prowokacji → SŁABY.

---

## 4. 🔴 Priorytet #1 — nie laby, lecz scaffold M-ML (blokuje budowę pieczątek M-ML)

To jest najważniejsze znalezisko przeglądu i właściwy powód zlecenia. Scaffold
`tools/content/curriculum-atoms/m-ml.json` niesie **wyłącznie checki `value` na metrykach ML**:

| Lab | Check | Ładunek | Kolizja (błędna droga → ten sam skalar) |
|---|---|---|---|
| ml-4 | C1 `acc_base`=0.6667 | dokładność baseline 4/6 | KAŻDY klasyfikator trafiający 4/6 na 6-elementowym teście: zła cecha, przewidywanie stałej, przeciek |
| ml-4 | C2 `acc_model`=0.8333 | dokładność 5/6 | dowolny model z 5/6 — w tym z przeciekiem etykiety albo odwróconą logiką „przypadkiem trafioną" |
| ml-7 | C3 `prec`=0.8, C4 `rec`=1.0 | precyzja 4/5, czułość 4/4 | czułość=1.0 osiąga trywialnie model przewidujący „wszystko pozytywne"; gołe ilorazy kolizyjne |
| ml-7 | C5 `macierz`=[1,1,0,4] | macierz pomyłek spłaszczona | **jedyny check o dobrym instynkcie** — struktura, trudniej trafić błędną drogą |

**Dlaczego to gorsze niż M-SQL:** metryki ML są z natury grubym sitem. Na 6 próbkach
testowych dokładność ma tylko 7 możliwych wartości (0..6/6) — kolizje są nie wyjątkiem,
lecz regułą. Cztery klasyczne błędne drogi trafiają w tę samą liczbę:
1. **Przeciek etykiety** (cecha = cel) → metryki niemal idealne, po zaokrągleniu mogą
   trafić w oczekiwaną wartość.
2. **Zły podział** train/test, który przypadkiem daje 4/6 albo 5/6.
3. **Odwrócone etykiety / klasa większościowa** trafiające ten sam accuracy.
4. **Model przewidujący jedną klasę** → czułość 1.0 „za darmo".

**Rekomendacja (ZANIM powstaną notebooki M-ML — wzór ADR-017 D2):**
- **Ładunek = wektor predykcji / macierz tożsamości, nie goła metryka.** C5 (macierz)
  już to robi — **rozszerzyć wzorzec na ml-4** (porównywać `y_pred` jako listę wobec
  referencji, nie sam `acc_model`). Zabija odwrócone etykiety, klasę większościową
  i szczęśliwe trafienia w accuracy.
- **Korelacja drugiej wielkości** (odpowiednik minuty↔kwota): obok accuracy sprawdzać
  strukturę pomyłek (którą obserwację model myli), nie tylko ile.
- **Check pochodzenia podziału:** zweryfikować, że test to zafiksowany zbiór indeksów
  (jak eda-4 weryfikuje pochodzenie kolumn z API) — zamyka „zły podział dający 4/6".
- **Bramka przeciw przeciekowi:** asercja, że zbiór cech NIE zawiera kolumny celu —
  przeciek daje podejrzanie wysokie metryki, które gołym progiem accuracy przechodzą.

Bez tego M-ML powtórzy defekt SQL.7 w skali całego modułu — z tą różnicą, że tu nie ma
nawet skorelowanych danych do rozerwania; kolizja siedzi w samej naturze metryki.

---

## 5. Priorytet napraw

| # | Element | Blokuje | Priorytet | Koszt |
|---|---|---|---|---|
| 1 | **Przeprojektowanie checków M-ML** (ml-4/ml-7: wektor predykcji + pochodzenie podziału + bramka przecieku) | **budowę pieczątek M-ML** | 🔴 **przed budową M-ML** | osobny krok projektowy (jak ADR-017), ~pół dnia projektu kontraktu |
| 2 | **f2-7 — asymetryczna próbka sondy** `[2,5,10]` | nic (lab niezależny od M-ML) | średni-niski | < 0,5 h, osobny mały PR |
| 3 | Pozostałe 12 labów | nic | — | brak napraw — MOCNE |

**Wynik dla startu M-ML (odpowiedź na pytanie Olivera):** istniejące laby NIE blokują.
Projekt TREŚCI M-ML może iść równolegle. **Budowa pieczątek M-ML musi poczekać na
przeprojektowanie kontraktu checków (poz. 1)** — inaczej wchodzimy w moduł o najwyższym
ryzyku kolizji z naiwnym gołym-skalarnym ładunkiem. f2-7 do naprawy osobno, bez związku
z terminem M-ML.

## 6. Wniosek metodyczny (do przeniesienia do standardu)

Przegląd potwierdził tezę ADR-017 §7 i dał trzy **wzorce mocnego checku**, które powinny
stać się regułą przy każdym nowym labie (kandydat do `skills/engineering/production-readiness.md`,
domena „AI/LLM Layer" i „ocena"):
1. **Przeliczenie z artefaktu studenta** (f1-4, f3-4, f3-7 K3, pd-8 C5, eda-4 C5) — check
   liczy referencję sam z surowych danych studenta, nie ufa jego skalarowi.
2. **Check pochodzenia** (eda-4: kolumny ⊂ API; pd-4: indeks ⊂ `df`) — „skąd to jest",
   nie „czy wygląda dobrze".
3. **Sonda na próbce asymetrycznej + tożsamość** (f3-7 K2: różne sumy kategorii, sprawdza
   rekord, nie kwotę) — antywzorzec to f2-7 (`[1,2,3]`).
Antywzorzec do eliminacji: **goły `value` na skalarze zagregowanym/metryce** (licznik,
długość, suma, accuracy) bez którejś z trzech powyższych podpórek.
