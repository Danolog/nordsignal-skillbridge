# 1E.2 · Audyt pojemności D10 — rubryka capstone'u M-EDA vs drabina L0→F3

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** WYKONANY — z decyzją treściową Sophii (podział modułu) na mocy
delegacji z ADR-014 D10 („moduł dzielony albo rubryka zmiękczana — decyzja
treściowa Sophii, nie kod"); do wiadomości Darka.
**Wymóg źródłowy (ADR-014 D10):** lista konceptów wymaganych przez rubrykę
capstone'u MINUS koncepty pokryte atomami drabiny **= 0**; jeśli bilans nie
wychodzi w 5–6 atomach — moduł dzielony albo rubryka zmiękczana.
**Wejścia:** rubricJson + competencies + theory_md projektu
`ds-eda-polska-w-liczbach-bdl` (`tools/content/ds-projects-partia-1.json`),
zatwierdzone treści L0–F3 (`sophia-1e2-{l0,f1,f2,f3}-atomy.md`), struktura
drabiny (`tools/content/curriculum-ds-drabina.json`), decyzja Darka pkt 9
(Git/terminal just-in-time w M-EDA).

---

## 1. Dekompozycja wymagań capstone'u na koncepty

Rubryka (4 kryteria) + przepływ pracy projektu (pobranie danych z API BDL →
czyszczenie → EDA → wykres → repo) wymagają od studenta:

| # | Koncept wymagany | Źródło wymogu |
|---|---|---|
| R1 | Notebook/Colab: komórki, sesja, „uruchamia się od góry do dołu" | rubryka „Reprodukowalność" |
| R2 | Python: zmienne, typy, wyrażenia, f-string, if | kryteria 1–2 (kod analizy) |
| R3 | Pętle, funkcje, listy | kryteria 1–2 |
| R4 | Lista słowników / rekordy (kształt odpowiedzi API) | przepływ: BDL zwraca JSON |
| R5 | Import modułów i pojęcie pakietu (+ `requirements.txt`) | przepływ + rubryka „Reprodukowalność" |
| R6 | Terminal w komórce Colab (`!`, `!pip`) | pkt 9 (decyzja Darka) + R5 |
| R7 | HTTP/API: zapytanie GET z parametrami, status, `.json()` | przepływ: API GUS BDL |
| R8 | DataFrame: budowa z rekordów, `head`/`info`/`dtypes`, kolumny | kryterium 1 „kontrola typów" |
| R9 | Selekcja i filtrowanie w pandas (wiersze po warunku, wybór kolumn) | kryteria 1–2 |
| R10 | Braki danych: wykrycie (`isna`), świadome `dropna`/`fillna` z uzasadnieniem | kryterium 1 (wprost: „nie ślepe dropna") |
| R11 | Rozkłady, agregacje i grupowanie (`describe`, `groupby`, relacje między grupami) | kryterium 2 „wykracza poza describe()" |
| R12 | Wartości odstające: identyfikacja (kwantyle + wykres) | kryterium 1 |
| R13 | Wykresy: trend liniowy + histogram; osie/jednostki/tytuł/legenda | kryterium 3 |
| R14 | Git/GitHub: repo, commit, push, README, historia commitów | rubryka „Reprodukowalność" + competencies `Git: acquired` + pkt 9 |
| R15 | EDA jako metoda: pytania badawcze, eksploracja≠konfirmacja, hipotezy | kryterium 2 + theory_md |
| R16 | Seed przy losowości | rubryka (warunkowe: „tam gdzie istnieje losowość" — w EDA zwykle brak) |

## 2. Bilans pokrycia drabiną L0→F3

**Pokryte (zatwierdzone treści):** R1 — L0.1–L0.4 (w tym „Uruchom
wszystkie" = dokładnie test „od góry do dołu" z rubryki); R2 — F1.1–F1.6;
R3 — F2.2–F2.6; R4 — F3.5 (lista słowników jawnie budowana jako pomost do
JSON/pandas) + F3.1–F3.3, F3.6.

**NIEPOKRYTE (= materia nowych atomów):** R5, R6, R7, R8, R9, R10, R11,
R12, R13, R14, R15.

**Bilans: 11 konceptów niepokrytych.** Nawet po uczciwym sklejeniu
(R5+R6 = jeden atom „import, pakiety i terminal w Colab"; R11+R12 = jeden
atom „rozkłady, grupy i odstające"; R15 = briefing projektu, czyli
istniejący `theory_md` + krótka teoria przy capstonie, nie osobny atom)
zostaje **8 atomów konceptowych + laby**. W jednym module się to nie
mieści: przekroczylibyśmy widełki D1 (moduł = 5–6 atomów) o ~60%, a moduł
liczyłby 10–11 pozycji — dwa razy więcej niż F1–F3.

## 3. Decyzja treściowa (delegacja ADR-014 D10): PODZIAŁ MODUŁU

Zmiękczanie rubryki odrzucam: kryterium „Reprodukowalność" (Git/README/
requirements) jest sednem wartości rynkowej capstone'u, a Git i tak wchodzi
decyzją Darka pkt 9; kryteria 1–2 to sedno EDA. Zamiast tego **M-EDA dzielę
na dwa moduły**:

### M-PD „Pandas: dane w tabelach" (nowy moduł, klasyczny kształt F-modułu)

- **Atomy (5):** PD.1 import + pakiety + terminal `!` w Colab (R5+R6;
  bundling zadeklarowany — jedna materia „skąd się biorą narzędzia");
  PD.2 DataFrame z rekordów + `head`/`info`/`dtypes` (R8); PD.3 selekcja
  i filtrowanie (R9); PD.4 braki danych — świadome decyzje (R10);
  PD.5 rozkłady, grupowanie i odstające (R11+R12; bundling — jedna materia
  „co mówią grupy liczb").
- **Laby (2):** po PD.3 (filtr na prawdziwej tabeli) i po PD.5 (mini-EDA
  na wbudowanym zbiorze, bez API).
- **Wykresy (R13):** atom PD.6 ALBO materia labu 2 — rozstrzygnę przy
  pisaniu; jeśli PD.6, moduł ma 6 atomów (górna granica D1, nadal
  w widełkach).
- **Egzamin:** standardowo 15×2, ≤1 błąd.
- **Rollup diagnostyczny modułu:** `Pandas`, `NumPy` (tło), `Statystyka
  (Statistics)` — istniejące koncepty diagnostyczne banku.

### M-EDA „EDA: od API do repozytorium" (moduł projektowy, odchudzony)

- **Atomy (3):** EDA.1 API i JSON — `requests.get`, parametry, status,
  `.json()` → lista słowników → DataFrame (R7; pomost F3.5→PD.2 domyka
  się tutaj); EDA.2 Git/GitHub bez terminala lokalnego — repo, commit
  z Colab („Zapisz kopię w GitHub"), README i `requirements.txt` przez
  interfejs GitHub, czym jest historia commitów (R14); EDA.3 przebieg
  EDA — pytania badawcze, eksploracja≠konfirmacja, hipotezy „wprost
  z danych" (R15; kondensacja metody, `theory_md` projektu pozostaje
  briefingiem — anty-redundancja pilnowana).
- **Lab (1):** „Pierwsze pobranie z BDL" — gotowy szkielet zapytania,
  student uruchamia i ogląda JSON (zdejmuje ryzyko „utknięcia na API"
  przed capstone'em — obowiązkowy lab między ostatnim atomem a capstone'em
  wg D1).
- **Capstone:** `ds-eda-polska-w-liczbach-bdl` (bez zmian rubryki).
- **Bez egzaminu MC** — bramką modułu jest capstone (`submitted`
  odblokowuje — pkt 2/wariant C); egzamin MC z Gita to „teatr pomiaru"
  (precedens L0, pkt 10). Pytania spiralne M-PD wchodzą w przegląd przed
  capstone'em (spacing D6.3 zachowany).
- **Rollup diagnostyczny:** `EDA`, `Git`.

### Konsekwencje i zgodność

- **Drabina: 8 → 9 modułów** (L0 → F1 → F2 → F3 → **M-PD** → M-EDA →
  M-SQL → M-ML → M-LLM). Liczba capstone'ów **bez zmian (4)** — decyzja
  Darka pkt 7 nietknięta; łańcuch liniowy nietknięty; zmiana czysto
  addytywna w `curriculum-ds-drabina.json` (kontrakt-test do przepuszczenia
  po edycji).
- **Wolumen:** M-PD ~19–31 h (pełny moduł) + M-EDA ~11–17 h (3 atomy
  + lab + rampa capstone'u, bez egzaminu) — mieści się w kopercie D1
  „M-EDA" liczonej pierwotnie jako moduł ~19–31 h + remediacja ds-eda
  ~10 h; realny przyrost względem rachunku ADR: ~+6–10 h (koszt drugiego
  kompletu struktury modułu). W skali ścieżki 200–285 h — bez wpływu na
  sign-off wolumenu.
- **Dryf opisu w drabinie (naprawiany przy tej edycji):**
  `f3-dane-python` ma w JSON opis „pandas i pliki", podczas gdy
  ZATWIERDZONA treść F3 to czysty Python (pandas przeniesione tu, do
  M-PD) — opis do korekty razem z dodaniem M-PD.
- **Placement (D8):** M-PD dostaje tag diagnostyczny `Pandas` — student
  z opanowanym pandas przeskoczy moduł; rollup M-EDA bez zmian.

## 4. Werdykt audytu

Bilans „rubryka minus drabina" **wychodzi na 0** przy podziale na
M-PD (5–6 atomów) + M-EDA (3 atomy + lab + capstone) — oba moduły
w widełkach D1. Bez podziału bilans NIE wychodzi (8+ atomów w jednym
module). Decyzja: podział, rubryka nietknięta. Kolejność dalszej pracy:
aktualizacja `curriculum-ds-drabina.json` → treść M-PD (pełny cykl QG) →
treść M-EDA (pełny cykl QG) → rampy capstone'u wg mapy luk audytu partii 1
(pozycja `ds-eda` ~10 h — osobne zadanie 1E.R).
