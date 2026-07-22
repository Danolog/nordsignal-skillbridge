# ADR-017 — Fałszywe zaliczenie w labach M-SQL: rozerwanie korelacji minuty↔kwota + wzmocnienie ładunku rankingu

- **Status:** ZAAKCEPTOWANY — decyzja Ethana (CTO). Podstawa: `CLAUDE.md` v1.11 §5
  (decyzja techniczna odwracalna w domenie Engineering; treść w drzewie roboczym,
  wykonanie przez PR z bramką Leo). **Nie wymaga sign-offu Darka.** Ingest na
  produkcję objęty delegacją `CLAUDE.md` v1.12 (Ethan decyduje i wykonuje).
- **Data:** 2026-07-22 · **Autor:** Ethan (CTO) · **Zlecenie:** Darek, brief 2026-07-22
- **Koryguje:** kontrakt checków SQL.4/SQL.7 z ADR-015 §7 (ładunek pieczątki SQL.7)
  oraz kanoniczny listing mini-świata przybity przeglądem jakości 2026-07-21 (WAŻN-1).
- **Powiązania:** ADR-015 (kontrakt checków i tokenu), ADR-014 D3 (definicja
  zaliczenia per typ pozycji), ADR-010 (ingest = procedura produkcyjna),
  `docs/curation/sophia-1e2-msql-atomy.md` (źródło treści M-SQL).
- **Wykonanie:** Sophia (treść + przeliczenia w dokumencie kuracji), Oliver
  (pieczątki labów), Eva/Quinn (kontrakt-test), Ethan (packer, scalenie, ingest).

---

## 1. Problem — to jest błąd oceny, nie kosmetyka

W kanonicznym mini-świecie M-SQL **minuty i kwota są idealnie skorelowane**
(12→23.5, 35→61.0, 7→14.0, 22→41.5, 15→28.0 — im dłużej, tym drożej). Skutki,
zweryfikowane wykonaniem na realnym DuckDB (1.5.4, 2026-07-22):

| Lab | Zadanie | Poprawna droga | Błędna droga | Wynik checku |
|---|---|---|---|---|
| **SQL.4 / C3** (`z2_pierwszy_id`) | „od najdłuższego" | `ORDER BY minuty DESC` → id `[2,4,5,1]` | `ORDER BY kwota DESC` → id `[2,4,5,1]` | **identyczny** → token wydany |
| **SQL.7 / C5** (`z3_miejsca_1`) | „miejsce w rankingu **najdroższych** swojej strefy" | `OVER (… ORDER BY kwota DESC)` | `ORDER BY minuty DESC` | `3` w obu → token wydany |

Student z błędną kolumną porządkującą **dostaje token, czyli fałszywe zaliczenie**.

### Drugi mechanizm — dotąd niezgłoszony, groźniejszy od pierwszego

Ładunek SQL.7 niesie **liczbę** wierszy z miejscem 1, a ta liczba jest niezmiennikiem
podziału na strefy — nie zależy ani od kolumny, ani od **kierunku** sortowania:

```
OVER (PARTITION BY nazwa ORDER BY kwota DESC)  → miejsca_1 = 3   ✔ poprawne
OVER (PARTITION BY nazwa ORDER BY minuty DESC) → miejsca_1 = 3   ✘ zła kolumna
OVER (PARTITION BY nazwa ORDER BY kwota ASC)   → miejsca_1 = 3   ✘ ranking ODWRÓCONY
OVER (PARTITION BY nazwa ORDER BY id DESC)     → miejsca_1 = 3   ✘ ranking bez sensu
```

`ORDER BY kwota ASC` daje ranking **najtańszych** zamiast najdroższych — odwrotność
zadania — i przechodzi. **Tego samą zmianą danych nie da się naprawić**: dopóki
ładunek jest licznikiem, żaden mini-świat go nie uwrażliwi. To wymaga zmiany kontraktu.

**Zmierzone, nie wywnioskowane** (2026-07-22, realny harness
`tests/unit/ds/notebook-stamp-harness.py` uruchomiony na opublikowanym
`notebooks/msql/sql-7-lab-raport-stref.ipynb`, DuckDB 1.5.4):

| Rozwiązanie studenta | Werdykt pieczątki DZIŚ | Po samej zmianie danych (D1) | Po D1 + D2 |
|---|---|---|---|
| `ORDER BY p.kwota DESC` (poprawne) | TOKEN | TOKEN | **TOKEN** ✔ |
| `ORDER BY p.minuty DESC` (zła kolumna) | **TOKEN** ✘ | **TOKEN** ✘ | **ODMOWA** ✔ |
| `ORDER BY p.kwota ASC` (odwrócony) | **TOKEN** ✘ | **TOKEN** ✘ | **ODMOWA** ✔ |
| `ORDER BY p.id DESC` (bez sensu) | **TOKEN** ✘ | **TOKEN** ✘ | **ODMOWA** ✔ |

Odmowa po D1+D2 pada z diagnozą wskazującą przyczynę, nie sam fakt:
*„miejsce 1 w swojej strefie zajmują u Ciebie przejazdy o id [2, 4, 5], a powinny
[1, 2, 4] — ranking ma być po KWOCIE malejąco…"*.

Analogiczny przebieg dla **SQL.4** (harness na `sql-4-lab-godziny-szczytu.ipynb`,
nowe dane): `ORDER BY minuty DESC` → token z ładunkiem `z3_top_suma: 72`;
`ORDER BY kwota DESC` → **odmowa**: *„na czele `z2` stoi przejazd id=1, a powinien
id=2 (najdłuższy). Sprawdź lukę 3…"*. Dziś oba warianty dają token.

### Dlaczego to jest prawdopodobne, a nie hipotetyczne

Drabina uczy tak: **SQL.6** ćwiczy `ROW_NUMBER() … ORDER BY minuty DESC`
(„numeruje przejazdy każdej strefy od najdłuższego"), a **SQL.7** — bezpośrednio
po nim — żąda rankingu **po kwocie**. Pomyłka „przeniosłem wzorzec z poprzedniego
atomu" jest tu zaprojektowana przez sekwencję fadingu. Check ma ją łapać; nie łapie.

### Uczciwa waga: co to psuje, a czego nie

- **NIE psuje kredencjału.** ADR-015 §5 jest jednoznaczny: token laba bramkuje
  postęp, nie wystawia dowodu kompetencji. Verified Project Receipt nadal wymaga
  sandboxa + vivy + człowieka. Zasada „człowiek ma ostatnie słowo" (`CLAUDE.md` §7)
  nie jest naruszona.
- **Psuje ocenę formującą — tam, gdzie od 2026-06-29 maszyna jest samowystarczalna.**
  `CLAUDE.md` §7 (v1.13) rozdziela wagę oceny: w warstwie edukacyjnej werdykt maszyny
  obowiązuje sam. Skoro obowiązuje sam, to musi być prawdziwy. Fałszywie pozytywna
  ocena formująca to nie „drobiazg poniżej progu kredencjału" — to jedyna informacja
  zwrotna, jaką student dostaje w chwili, w której nieporozumienie jest jeszcze tanie.
- **Psuje najtańszy moment naprawy.** Wykryte na capstonie kosztuje recenzję
  człowieka i vivę; wykryte przez pieczątkę kosztuje jedno kliknięcie i hint.

## 2. Decyzja

### D1 · Nowy kanoniczny mini-świat — dwie wartości `kwota`, zero zmian w `minuty`

```python
przejazdy = pd.DataFrame([
    {"id": 1, "strefa_id": 10, "minuty": 12, "kwota": 50.0, "godzina": 8},   # ZMIANA: 23.5 → 50.0
    {"id": 2, "strefa_id": 20, "minuty": 35, "kwota": 22.0, "godzina": 8},   # ZMIANA: 61.0 → 22.0
    {"id": 3, "strefa_id": 10, "minuty":  7, "kwota": 14.0, "godzina": 9},
    {"id": 4, "strefa_id": 30, "minuty": 22, "kwota": 41.5, "godzina": 17},
    {"id": 5, "strefa_id": 10, "minuty": 15, "kwota": 28.0, "godzina": 17},
])
# `strefy` — BEZ ZMIAN (10 Manhattan, 20 Brooklyn, 30 Queens)
```

**Historia dla studenta (jedno zdanie, wchodzi do treści):** przejazd 2 to
**35 minut w korku na krótkim dystansie — długo, a tanio**; przejazd 1 to
**12 minut ekspresówką — krótko, a drogo**. Czas nie jest przychodem. To nie jest
sztuczka pod check: to obserwacja, której rubryka capstone'u wprost żąda
(kryterium „wnioski z danych").

**Dlaczego `minuty` nietknięte:** filtr `WHERE minuty > 10` i cały atom SQL.6
(ranking po minutach) są policzone z minut. Zostawienie ich w spokoju zeruje ryzyko
w dwóch atomach i w czterech scenariuszach odmowy kontrakt-testu.

**Dlaczego akurat te dwie liczby** — dobrane tak, by ZACHOWAĆ maksimum wartości
kontraktowych (weryfikacja wykonaniem, DuckDB 1.5.4, 2026-07-22):

| Check | Było | Jest | |
|---|---|---|---|
| SQL.4 C1 `z1_wiersze` | 5 | **5** | bez zmian |
| SQL.4 C2 `z2_wiersze` | 4 | **4** | bez zmian |
| SQL.4 C3 `z2_pierwszy_id` | 2 | **2** | bez zmian — ale `ORDER BY kwota DESC` daje teraz **1** ⇒ **złapane** |
| SQL.4 C4 `z3_grupy` | 3 | **3** | bez zmian |
| SQL.4 C5 `z3_top_godzina` | 8 | **8** | bez zmian (72,0 vs 69,5) |
| SQL.4 C6 `z3_top_suma` | 84.5 | **72.0** | ZMIANA |
| SQL.7 C1 `z1_wiersze` | 5 | **5** | bez zmian |
| SQL.7 C2 `z2_top_nazwa` | Manhattan | **Manhattan** | bez zmian |
| SQL.7 C3 `z2_top_liczba` | 3 | **3** | bez zmian |
| SQL.7 C4 `z2_top_suma` | 65.5 | **92.0** | ZMIANA |
| SQL.7 C5 `z3_miejsca_1` | 3 | **3** | bez zmian (zostaje jako diagnostyka) |

**Zmieniają się dwie wartości oczekiwane z jedenastu.** Zachowane zostają też
własności dydaktyczne, które treść wykorzystuje: długi ogon float w średniej strefy 10
(`30.666666666666668` zamiast `21.833333333333332` — mechanizm ten sam), remis
`COUNT` w godzinach 8 i 17 (na nim stoi scenariusz odmowy „COUNT zamiast SUM"),
brak remisów w kwotach i sumach.

### D2 · Wzmocnienie ładunku SQL.7 — nowy check `z3_miejsca1_ids`

Ładunek pieczątki SQL.7 dostaje **posortowaną listę identyfikatorów przejazdów
z miejscem 1** (obok dotychczasowego licznika):

```python
"z3_miejsca1_ids": sorted(int(i) for i, m in zip(z3["id"], z3[kolumna_miejsca]) if int(m) == 1)
```

Rozróżnialność na nowych danych (zweryfikowana wykonaniem):

| Zapytanie w oknie | `z3_miejsca1_ids` | Werdykt |
|---|---|---|
| `ORDER BY p.kwota DESC` (poprawne) | `[1, 2, 4]` | ✔ zalicza |
| `ORDER BY p.minuty DESC` (zła kolumna) | `[2, 4, 5]` | ✘ odmowa |
| `ORDER BY p.kwota ASC` (odwrócony) | `[2, 3, 4]` | ✘ odmowa |
| `ORDER BY p.id DESC` (bez sensu) | `[2, 4, 5]` | ✘ odmowa |

Nowy check w kontrakcie: `{ id: "C6", kind: "value", var: "z3_miejsca1_ids",
expect: [1, 2, 4] }`. Typy to unoszą bez zmian w kodzie: `StampValue` dopuszcza
listy, `canonicalPayload` (TS) i `_norm` (Python) normalizują je identycznie,
`evalValue` porównuje strukturalnie po kanonicznym JSON-ie.

Analogiczne wzmocnienie **w samej pieczątce** (odmowa przed emisją tokenu, z celną
diagnozą po polsku) — pieczątka już liczy `ref3` własną kopią SQL-a, więc dokłada
się jedno porównanie i jeden komunikat. Warunek wstępny: asercja obecności kolumny
`id` w `z3` (dziś sprawdzana jest tylko obecność rankingu i liczba wierszy) —
wzorzec komunikatu jak istniejący „`z1` nie ma kolumny `nazwa`".

**To jest zmiana niezależna od danych** i to ona, a nie mini-świat, zamyka dziurę
`ASC`/`DESC`. Gdyby robić tylko jedną rzecz z tego ADR-a — tę.

### D3 · Termin: **ROBIMY TERAZ**, osobnym PR-em, przed partią M-ML

Uzasadnienie w §4.

## 3. Koszt policzony

### 3.1 Miejsca do zmiany (policzone `grep`-em, nie oszacowane)

| Plik | Linie do ręcznej zmiany | Co |
|---|---|---|
| `docs/curation/sophia-1e2-msql-atomy.md` | **19** (228, 231, 319, 459, 460, 519, 532, 711, 714, 863, 864, 886, 887, 1166, 1167, 1180, 1181, 1257, 1275) + przepisanie bloku „INFO" logu QG (1250–1266) | źródło prawdy treści |
| `tools/content/notebooks/msql/*.py` (7 plików) | **24** = 14 (komórka „Dane": 2 linie × 7) + 10 (proza cytująca liczby: sql-2 ×2, sql-3 ×1, sql-4 ×2, sql-5 ×1, sql-6 ×2, sql-7 ×2) | źródła notebooków |
| `tools/content/notebooks/msql/sql-7-lab-raport-stref.py` | **+ ~12 nowych** | ładunek D2 + odmowa + asercja kolumny `id` |
| `tools/pack-curriculum-atoms.ts` | **4 zmienione + ~7 nowych** | `CHECKS_SQL_4.C6`, `CHECKS_SQL_7.C4`, nowy `CHECKS_SQL_7.C6` |
| `tests/unit/ds/notebooks-msql.contract.test.ts` | **2 zmienione + ~45 nowych** | 2 stałe w ładunkach + 3 nowe scenariusze odmowy |
| **Razem ręcznie** | **≈ 113 linii w 11 plikach** | |
| `notebooks/msql/*.ipynb` (7) | 0 — `pnpm content:build-notebooks` | artefakt generowany |
| `tools/content/curriculum-atoms/m-sql.json` | 0 — `pnpm content:pack-curriculum` | artefakt generowany (⚠ ręczna edycja znika bez śladu) |

**Korekta założenia z briefu:** „22 testy kontraktowe do przeliczenia" —
plik ma faktycznie 22 testy (zmierzone: `npx vitest run
tests/unit/ds/notebooks-msql.contract.test.ts` → **22/22 zielone**, 16 s, maszyna dev
z DuckDB 1.5.4, 2026-07-22 — to jest linia bazowa dla tej zmiany), ale do przeliczenia
idą **2 stałe** w dwóch ładunkach; pozostałe 20 przypadków przechodzi
bez zmian, bo są strukturalne (kartezjan, brak `.df()`, aliasy, `GROUP BY` zamiast
okna, brak kolumny rankingu, pominięte komórki) albo oparte na `minuty` i na remisie
`COUNT`, których nie ruszamy. Sprawdzone po kolei, scenariusz po scenariuszu —
w tym dwa nieoczywiste: „AVG zamiast SUM" (nowe średnie godzinowe 36,0 / 34,75 / 14,0
— czołowa godzina nadal 8, więc odmowa nadal pada na sumie, komunikat bez zmian)
i „COUNT zamiast SUM" (remis 2:2 w godzinach 8 i 17 zachowany, więc obie legalne
diagnozy nadal możliwe).

### 3.2 Nakład czasu

| Krok | Wykonawca | h |
|---|---|---|
| Projekt wariantu danych + ładunku, przeliczenie wszystkich wartości referencyjnych, **prototyp łatki pieczątki SQL.7 przepuszczony przez realny harness** (4 warianty ×2 laby) | Ethan | **0 — zrobione 2026-07-22** (§1, §2 — liczby pochodzą z wykonania, nie z rachunku na kartce) |
| Treść: 19 linii + przepisanie obserwacji „Brooklyn blisko Manhattanu" na „najdłuższy kurs = najniższy przychód" + log QG | Sophia | 1,0 |
| Źródła notebooków: 24 linie + ładunek/odmowa SQL.7 | Oliver | 1,5 |
| Packer (3 checki) + `content:pack-curriculum` + `content:build-notebooks` | Ethan | 0,5 |
| Kontrakt-test: 2 stałe + 3 scenariusze odmowy (zła kolumna w SQL.4, zła kolumna w SQL.7, odwrócony kierunek w SQL.7) | Quinn | 1,0 |
| Pełny bieg: `pnpm test:run` + harness na duckdb 1.3.2 **oraz** 1.5.4 (parytet CI↔dev) | Quinn | 0,5 |
| Przegląd jakości treści (spójność liczb w 7 notebookach i dokumencie) | Sophia | 1,0 |
| PR + review Leo + scalenie | Leo / Ethan | 0,5 |
| Publikacja 7 plików do `Danolog/skillbridge-notebooks` | Ethan | 0,25 |
| Produkcja: kopia zapasowa Neon → ingest ×2 (idempotencja) → weryfikacja PO → smoke | Ethan | 0,75 |
| **Razem** | | **≈ 7,0 h** + 1 gałąź kopii zapasowej Neon |

Dla skali: stawka kuratorska jednego **nowego** atomu to 2,8–4,1 h (ADR-014 D1).
Ta poprawka kosztuje **mniej niż dwa atomy** i dotyka modułu, który w całości
kosztował ~19–31 h.

### 3.3 Koszt zaniechania

- **Dziś: zero szkody naliczonej.** Darek potwierdził 2026-07-22, że aplikacja nie
  ma żadnych realnych studentów — wszystkie konta są testowe. Fałszywe zaliczenie
  nie spotkało jeszcze nikogo.
- **Koszt naprawy nie rośnie z czasem** — zasięg zmiany jest domknięty: M-ML, M-LLM
  i M-EDA nie dotykają mini-świata, a capstone `ds-sql-analiza-przejazdow` pracuje
  na prawdziwej próbce NYC TLC. Odłożenie nie oszczędza ani jednej linii.
- **Rośnie natomiast koszt kontekstu.** Kanoniczny listing został przybity dopiero
  przeglądem jakości 21.07 (znalezisko WAŻN-1: wartości były rozsypane po hintach
  pięciu atomów), a jego rekonstrukcja wymagała osobnego przebiegu agenta z 10+
  punktami kontrolnymi. Ta sieć liczbowa jest teraz w pamięci roboczej zespołu;
  za dwie partie nie będzie.
- **„Przy następnej iteracji treści" nie ma daty.** Roadmapa idzie M-ML → M-LLM →
  M-EDA → 58/58; żadna z nich nie otwiera M-SQL. Odroczenie bez terminu jest
  decyzją o wysłaniu defektu, tylko nienazwaną wprost.
- **Data pierwszej rejestracji nie jest pod naszą kontrolą.** Zastrzeżenie Darka
  brzmi: „założenie wygasa z chwilą pierwszej realnej rejestracji". Flagi są
  zapalone na produkcji od 2026-07-22, drabina jest przechodnia. Odległość między
  „zero szkody" a „szkoda" to jedno konto.

### 3.4 Co się zmieniło od decyzji „nie zmieniam danych" z 21.07 — i dlaczego tamta decyzja była wtedy słuszna

Przegląd jakości 22.07 zapisał świadome „nie ruszam danych; do decyzji przy następnej
iteracji". To była **dobra decyzja w tamtych warunkach**: partia 6 była w locie,
zmiana danych oznaczała przepisanie kontraktu w środku przebiegu, a każdy ingest
na produkcję wymagał wtedy sign-offu Darka per akcja — koszt organizacyjny
przewyższał ryzyko przy fladze `FLAG_CURRICULUM_PATH=0`.

Oba te warunki zniknęły w ciągu doby:
1. **Flagi są ON na produkcji** (22.07) — drabina jest widoczna i przechodnia.
2. **Ingest przestał kosztować sign-off Darka** — `CLAUDE.md` v1.12 (27.06)
   deleguje scalenie do `main`, wdrożenie i zmiany bazy produkcyjnej Ethanowi,
   pod bramkami jakości. Najdroższy składnik odroczenia został usunięty.

Utrzymywanie decyzji, której przesłanki wygasły, nie jest konsekwencją — jest
bezwładnością.

## 4. Rekomendacja — jednoznaczna

> **ROBIMY TERAZ.** Osobny PR „fix(tresc): rozerwanie korelacji minuty↔kwota
> w M-SQL + wzmocnienie ładunku rankingu SQL.7", wykonany **przed** startem partii
> M-ML, z ingestem na produkcję w tym samym przebiegu.

Trzy powody, w kolejności wagi:

1. **Produkt sprzedaje wiarygodność oceny.** Warstwa formująca od 2026-06-29 jest
   samowystarczalna — werdykt maszyny obowiązuje sam (`CLAUDE.md` §7). Sprzedawanie
   werdyktu, o którym wiemy, że przepuszcza znaną błędną drogę, jest sprzeczne
   z wartością „customer trust > short-term win".
2. **Koszt jest znany, mały i nie maleje z odroczeniem** — ~7 h, 113 linii,
   11 plików, dwie wartości oczekiwane, zero zmian w schemacie bazy.
3. **Okno jest teraz idealne: zero realnych studentów.** Zmiana danych mini-świata
   po pierwszej rejestracji oznacza, że **tokeny w obiegu przestają pasować** —
   student z policzoną, ale niewklejoną pieczątką dostanie odmowę bez własnej winy.
   Dziś to zdarzenie puste. Po pierwszej rejestracji to incydent do obsłużenia.

Odrzucone warianty:

| Wariant | Werdykt |
|---|---|
| **Nie robimy** | ODRZUCONE — zostawia znaną, powtarzalną fałszywie pozytywną ocenę w module, którego sekwencja fadingu wprost prowokuje tę pomyłkę |
| **Przy następnej iteracji treści** | ODRZUCONE — brak daty (żadna zaplanowana partia nie otwiera M-SQL), koszt nie maleje, a okno „zero studentów" się zamyka |
| **Tylko D2 (ładunek), bez zmiany danych** | ODRZUCONE jako komplet — zamyka dziurę SQL.7 (kierunek i kolumna), ale SQL.4 zostaje ślepy: przy skorelowanych danych `ORDER BY kwota` daje identyczną sekwencję id, więc żaden ładunek go nie odróżni. Do rozważenia wyłącznie jako awaryjne pół-kroku, gdyby zmiana danych była zablokowana |
| **Tylko D1 (dane), bez zmiany ładunku** | ODRZUCONE — zostawia otwartą dziurę `ORDER BY kwota ASC` (ranking najtańszych zamiast najdroższych), której licznik miejsc nie widzi z definicji |
| **Przepisać mini-świat od zera (więcej wierszy, realistyczne dane)** | ODRZUCONE — 5 wierszy jest policzalne w pamięci przez studenta („przewidź, zanim uruchomisz" w każdym atomie); większy zbiór kosztuje przepisanie wszystkich siedmiu atomów, nie dwóch liczb |

## 5. Runbook wykonania — dokładna lista kroków

Kolejność jest wiążąca: **treść → źródła → packer → testy → publikacja → produkcja**.
Odwrócenie kroków 1 i 2 tworzy rozjazd między dokumentem kuracji a notebookami.

### Krok 1 — `docs/curation/sophia-1e2-msql-atomy.md` (Sophia)

| Linia | Było | Ma być |
|---|---|---|
| 228 | „kwoty w `przejazdy` to 23.5, 61.0, 14.0, 41.5, 28.0" | „50.0, 22.0, 14.0, 41.5, 28.0" |
| 231 | „Trzy wiersze: 61.0, 41.5, 28.0" (`WHERE kwota > 25`) | „Trzy wiersze: **50.0, 41.5, 28.0**" (nadal 3 — sprawdzone) |
| 319 | „(28.0, 23.5, 14.0)" — strefa 10 od najdroższego | „(**50.0, 28.0, 14.0**)", id kolejno **1, 5, 3** |
| 459–460 | „23.5+61.0 = 84.5 … ranking: 84.5, 69.5, 14.0" | „**50.0+22.0 = 72.0** … ranking: **72.0, 69.5, 14.0**" |
| 519 | „na czele godzina 8 z sumą 84.5" | „…z sumą **72.0**" |
| 532 | „sumy 84.5/69.5/14.0" | „**72.0**/69.5/14.0" |
| 711 | „(kwoty 23.5, 14.0, 28.0)" | „(kwoty **50.0**, 14.0, 28.0)" |
| 714 | „`65.5` (suma jego grupy)" | „`**92.0**`" |
| 863–864 | „Manhattan 3/65.5 … Brooklyn ma 61.0 jednym kursem!" | „Manhattan 3/**92.0** … Brooklyn ma **najdłuższy kurs (35 min) i najniższą sumę (22.0)**" |
| 886–889 | „Manhattan 3/65.5, Brooklyn 1/61.0, Queens 1/41.5 … jak blisko Manhattanu jest Brooklyn" | „Manhattan 3/**92.0**, **Queens 1/41.5, Brooklyn 1/22.0** … **najdłuższy kurs dał najniższy przychód — czas nie jest przychodem**" (kryterium rubryki „wnioski z danych" utrzymane, teza mocniejsza) |
| 1166–1167 | listing kanoniczny, id 1 i id 2 | `kwota` **50.0** i **22.0** |
| 1180–1182 | punkty kontrolne | „Z3 → (8, **72.0**), (17, 69.5), (9, 14.0); SQL.7 Z2 → Manhattan 3/**92.0**, **Queens 1/41.5, Brooklyn 1/22.0**; kartezjan bez ON → 15" |
| 1250–1266 | blok „Znalezisko INFO — świadomy limit checków" | przepisać na „**ROZWIĄZANE 2026-07-22, ADR-017**" z krótkim opisem obu mechanizmów (dane + ładunek) i odesłaniem |
| 1275 | „`AVG(kwota)` strefy 10 = `21.833333333333332`" | „`**30.666666666666668**`" (długi ogon float zachowany — mechanizm dydaktyczny nietknięty) |

⚠ Sekcje atomów idą **verbatim** do widoku studenta. Erraty i meta wyłącznie
w logu QG (nauka procesowa z L0 — wyciek erraty do `contentMd`).

### Krok 2 — `tools/content/notebooks/msql/*.py` (Oliver)

1. Komórka „Dane" w **każdym z 7 plików** (linie ~17–34 zależnie od pliku):
   `23.5` → `50.0`, `61.0` → `22.0`.
2. `sql-2-where-order-by.py`: linia 36 („kwoty w strefie 10 to 23.5, 14.0 i 28.0"
   → „**50.0**, 14.0 i 28.0"), linia 48 („Trzy wiersze: 28.0, 23.5, 14.0 — id kolejno
   5, 1, 3" → „**50.0, 28.0, 14.0 — id kolejno 1, 5, 3**").
3. `sql-3-group-by-agregaty.py`: linia 63 — średnia strefy 10 → `30.666666666666668`.
4. `sql-4-lab-godziny-szczytu.py`: linie 130 i 133 — kontrakt wejścia
   `168.0` → **`155.5`** (suma minut `91` **bez zmian**).
5. `sql-5-join-ziarno.py`: linia 107 — „suma 504.0 zamiast 168.0" → „**466.5**
   zamiast **155.5**" (kartezjan = 3× suma).
6. `sql-6-funkcje-okna.py`: linia 41 (kwoty strefy 10 → `50.0, 14.0, 28.0`),
   linia 57 (`65.5` → `92.0`).
7. `sql-7-lab-raport-stref.py`: linie 138 i 141 — `168.0` → `155.5`; **oraz D2**:
   - asercja obecności kolumny `id` w `z3` (wzorzec komunikatu jak dla `nazwa` w `z1`);
   - po wykryciu `kolumna_miejsca`: porównanie zbioru identyfikatorów z miejscem 1
     z referencją `ref3`; odmowa z diagnozą wskazującą **kolumnę i kierunek**
     w `ORDER BY` wewnątrz `OVER(...)`;
   - `"z3_miejsca1_ids"` w zwracanym ładunku (obok istniejącego `z3_miejsca_1`).

   ⚠ Blok wspólny pieczątki (poniżej linii „NIE ZMIENIAJ NICZEGO PONIŻEJ") **nietknięty**
   — kontrakt-test porównuje go bajt w bajt we wszystkich modułach.

### Krok 3 — `tools/pack-curriculum-atoms.ts` (Ethan)

- `CHECKS_SQL_4` → `C6.expect: 72.0` (+ `note`: „suma kwot godziny 8 = 72.0").
- `CHECKS_SQL_7` → `C4.expect: 92.0` (+ `note`), **nowy** `C6`:
  `{ id: "C6", kind: "value", var: "z3_miejsca1_ids", expect: [1, 2, 4],
  note: "Z3: miejsce 1 w każdej strefie po KWOCIE malejąco (po minutach dałoby [2,4,5], rosnąco [2,3,4])" }`.
- `pnpm content:pack-curriculum` → `m-sql.json` (**nigdy ręcznie** — packer nadpisuje).
- `pnpm content:build-notebooks` → 7 × `notebooks/msql/*.ipynb`.

### Krok 4 — `tests/unit/ds/notebooks-msql.contract.test.ts` (Quinn)

- `SQL4_PAYLOAD.z3_top_suma`: `84.5` → `72.0`.
- `SQL7_PAYLOAD.z2_top_suma`: `65.5` → `92.0`; dodać `z3_miejsca1_ids: [1, 2, 4]`.
- **Trzy nowe scenariusze odmowy** (to są regresje na dokładnie ten defekt):
  1. `sql-4`: luka 3 = `ORDER BY kwota DESC` → odmowa (komunikat o kolumnie `minuty`);
  2. `sql-7`: okno `ORDER BY p.minuty DESC` → odmowa (zła kolumna rankingu);
  3. `sql-7`: okno `ORDER BY p.kwota ASC` → odmowa (odwrócony kierunek).
- `pnpm test:run` **oraz** bieg z `duckdb 1.5.x` na maszynie dev — parytet CI↔dev
  (obie wersje muszą dawać ten sam werdykt; składnia pozostaje w ANSI obecnym w obu).

### Krok 5 — publikacja i produkcja (Ethan)

1. Bramka jakości: **review Leo** przed scaleniem (`CLAUDE.md` v1.12).
2. Scalenie do `main`; autor commita = Darek (`mubueu@gmail.com`).
3. Publikacja 7 × `.ipynb` do `Danolog/skillbridge-notebooks`, katalog `msql/`;
   weryfikacja `raw` = 200 dla każdego pliku.
4. **Kopia zapasowa Neon** `prod-backup-pre-ingest-adr017-msql-<data>` (przed
   jakąkolwiek zmianą danych — warunek delegacji).
5. `db:ingest-curriculum` **×2** (dowód idempotencji: moduły=9, pozycje=70,
   pytania 129 bez zmian, 0 obniżeń postępu).
6. Weryfikacja PO: w `contentMd` modułu M-SQL **zero wystąpień** `61.0`, `23.5`,
   `84.5`, `65.5`, `21.8333`; `checks` pozycji `sql-7` zawiera `z3_miejsca1_ids`.
7. Smoke: `/` 200, `/login` 200, `/api/curriculum` 401, `/curriculum` 307.
8. Wpis do `docs/SESSION_HANDOFF.md` + zamknięcie noty INFO w logu QG M-SQL.

**Bez sign-offu Darka** — kroki 2, 4 i 5 mieszczą się w delegacji `CLAUDE.md` v1.12.
Eskalacja obowiązuje tylko, gdyby ingest wymagał komendy genuinnie niszczącej
(`DROP`/`TRUNCATE`/`DELETE` bez `WHERE`) — nie wymaga; zaciąg jest transakcyjny.

## 6. Ryzyka i wycofanie

| Ryzyko | Waga | Obsługa |
|---|---|---|
| Tokeny w obiegu przestają pasować (student policzył pieczątkę przed zmianą, wkleja po) | **zerowa dziś** (brak realnych studentów), wysoka po pierwszej rejestracji | dodatkowy argument za „teraz"; postęp już zapisany w `curriculum_item_progress` nigdy nie jest cofany |
| Rozjazd dokument kuracji ↔ źródła notebooków (dwa miejsca z tymi samymi liczbami, brak automatycznego wiązania) | średnia — **znany dług strukturalny** | punkty kontrolne w dokumencie (linie 1180–1182) + przegląd Sophii; do rozważenia osobno: wyprowadzanie komórki „Dane" z jednego pliku źródłowego zamiast siedmiu kopii |
| Nowa liczba psuje niezauważony scenariusz testu | niska | pełny bieg `test:run` na dwóch wersjach DuckDB przed scaleniem; scenariusze przeanalizowane po kolei w §3.1 |
| Ingest nieidempotentny | niska | ingest ×2 z porównaniem liczników (procedura ADR-010, wykonana bezbłędnie 3× w ciągu 48 h) |

**Wycofanie:** rewert PR-a + ponowny ingest z poprzedniej treści; kopia zapasowa
Neon z kroku 5.4 jako siatka. Zmiana jest wyłącznie treściowa i konfiguracyjna —
**zero migracji schematu**, `configJson` jest typu `jsonb`.

## 7. Wniosek ogólniejszy (do wykonania osobno)

Ten defekt nie jest o SQL-u. Jest o własności kontraktu z ADR-015:

> Check klasy `value` na **skalarze zagregowanym** jest tak mocny, jak wąski jest
> zbiór **błędnych dróg**, które trafiają w ten sam skalar. Licznik (`ile wierszy
> ma miejsce 1`) jest niezmiennikiem struktury i nie mierzy niczego poza strukturą.

**Zadanie następcze:** przegląd pozostałych **16 labów** (z 18) pod jednym pytaniem:
„jaka prawdopodobna błędna droga daje ten sam ładunek?" — ze szczególnym podejrzeniem
wobec checków będących licznikami, długościami i sumami. Nakład: ~1,5 h jednego
przebiegu, właściciel: Ethan, termin: przed partią M-ML (żeby wnioski weszły
do 14 nowych notebooków, zamiast być do nich dopisywane później).
