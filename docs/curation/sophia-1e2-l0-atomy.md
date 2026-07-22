# 1E.2 · Moduł L0 „Start" (lean) — treść atomów

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: research faktów Colab z webem + krytyczny przegląd
zgodności z ADR-014; znaleziska wcielone — przebieg na końcu dokumentu);
przed ingest 1E.2 pozostają 3 TODO z notatek (screenshoty 2 etykiet UI,
seans wideo, budowa notebooków).
**Podstawa:** ADR-014 — D1 (parametry atomu), D4 (L0 lean: 4 atomy-checklisty,
~10 h kuracji, zaliczenie przez WYKONANIE, bez egzaminu MC), D5 (drabinka hintów
3-stopniowa wszędzie — decyzja Darka pkt 13; strona pierwszej pomocy per moduł),
D6.5 (siedem reguł redakcyjnych), D10 (twardy wymóg: atom 1 kończy się
uruchomieniem gotowej komórki w Colab **≤15 min od wejścia na ścieżkę**),
decyzje Darka pkt 9 (just-in-time: L0 uczy TYLKO Colab/notebooka — Git i terminal
wchodzą atomami tuż przed M-EDA) i pkt 10 (zaliczenie L0 przez wykonanie).
**Format:** treść merytoryczna w markdownie — spec JSON pod ingest wyda Oliver
przy PR-2 (1E.1); przepakowanie = mechanika, nie autoring.
**Konwencja świeżości (D4):** atomy L0 to atomy OPERACYJNE (walkthrough UI) —
starzeją się szybciej niż koncepty; każdy atom ma linię „UI zweryfikowano: DATA".

---

## Zasady zastosowane w całym module (żeby nie powtarzać per atom)

- **Zaliczenie atomu = WYKONANIE** (deterministyczny dowód — mechanizm tokenu
  niżej), nie odpowiedzi na pytania. Pytania retrieval SĄ w każdym atomie
  (główny mechanizm uczenia, R1/R2), z nielimitowanymi próbami i feedbackiem
  per opcja; błąd nigdy nie jest stanem końcowym (R13). Rozstrzygnięcie
  styku D1×pkt 10: pytania uczą, wykonanie zalicza.
- **Mechanizm dowodu wykonania (propozycja do decyzji inżynierskiej
  Ethana/Olivera przy 1E.6, hak: `configJson.checks`):** ostatnia komórka
  każdego notebooka L0 („komórka-pieczątka") prosi o **kod atomu** widoczny
  w SkillBridge przy pozycji (krótki, per student × atom), liczy z niego
  deterministyczny token (czysta funkcja, 0 LLM, bez sieci) i wypisuje go;
  student wkleja token w SkillBridge, platforma weryfikuje tę samą funkcją.
  Zero kont zewnętrznych poza wymaganym i tak Google, zero sandboxa dla L0.
- **Sesja i czas:** 4 atomy ≈ 2–3 sesje po 15–30 min (D1; suma szacunków
  55–70 min); atom 1 zaprojektowany
  na ≤15 min łącznie z teorią (D10). Szacunek czasu studenta podany per atom.
- **Struktura każdego atomu (jawny szkielet — D6.5):** Cel → Teoria z worked
  example i mikro-generacją „przewidź wynik" (R14) → Checklist wykonania
  (zaliczenie) → 3 pytania MC (retrieval, izomorficzne z WE) → Drabinka hintów
  3-stopniowa do zadania wykonawczego.
- **Język:** PL; terminy EN przy pierwszym użyciu objaśnione w miejscu +
  słowniczek na końcu (M11). Zasób EN nigdy na ścieżce krytycznej (D4).
- **Prerekwizyt kont:** konto Google — jawnie w onboardingu ścieżki (D10),
  atom 1 tylko sprawdza zalogowanie, nie uczy zakładania konta.
- **Koncepty (propozycja tagów do `curriculum_item_concepts`;
  koncepty kluczowe modułu do spacingu — D6.3):**
  - L0.1 → `colab-uruchomienie-komorki` (kluczowy),
  - L0.2 → `notebook-komorki-kod-tekst`,
  - L0.3 → `sesja-stan-zmiennych` (kluczowy),
  - L0.4 → `skrypt-sekwencja-instrukcji` (kluczowy).

---

## Atom L0.1 — „Komputer wykonał mój kod"

**Typ:** `lab` (checklist środowiskowy) · **Czas studenta:** ~10–15 min
(twardy wymóg D10) · **Koncept:** uruchamiam kod w przeglądarce jednym
kliknięciem · **UI zweryfikowano:** 2026-07-11

### Cel

Uruchomisz prawdziwy kod i zobaczysz jego wynik — w przeglądarce, bez
instalowania czegokolwiek. To pierwszy krok każdej dalszej pracy na tej ścieżce.

### Teoria

Programowanie to pisanie **instrukcji, które komputer wykonuje**. Instrukcje
zapisuje się w języku programowania — na tej ścieżce będzie to **Python**,
język, w którym będziesz analizować dane do końca tej ścieżki. Żeby uruchomić
pierwszy kod, nie musisz nic instalować.

Skorzystamy z **Google Colab** (skrót od *Colaboratory* — czytaj: „kolab") —
darmowej strony Google. Działa to tak: Ty klikasz w przeglądarce, Twój kod
jedzie do wykonania na komputer Google, a wynik wraca i pojawia się na Twoim
ekranie. Wystarczy konto Google — to samo, którego używasz do Gmaila.

Dokument, który otworzysz w Colab, to **notebook** (po polsku w interfejsie:
*notatnik*). Notebook składa się z **komórek**. Komórka to prostokątne pole:
może zawierać zwykły tekst z objaśnieniami albo kod. Komórkę z kodem uruchamiasz
jednym kliknięciem — i pod nią pojawia się wynik.

Zobacz, jak wygląda komórka, którą za chwilę uruchomisz:

```python
print("Witaj w SkillBridge!")   # print(...) = „wypisz na ekran"
                                # tekst w cudzysłowie = dokładnie to, co ma być wypisane
```

`print` to gotowe polecenie Pythona: „wypisz na ekran to, co podam w nawiasie".
Tekst do wypisania stoi w cudzysłowie.

**Przewidź, zanim uruchomisz:** co pojawi się pod komórką po kliknięciu ▶?

Pojawi się dokładnie to:

```
Witaj w SkillBridge!
```

Bez cudzysłowów — cudzysłów mówi Pythonowi, gdzie tekst się zaczyna i kończy,
ale sam nie jest częścią wyniku.

Dwie rzeczy, które zobaczysz przy pierwszym uruchomieniu i które są **normalne**:

1. Colab przez kilkanaście–kilkadziesiąt sekund „łączy się" z komputerem Google
   (komunikat w prawym górnym rogu). Przy przycisku komórki kręci się wtedy
   kółko, a w nawiasie obok widać `[*]`. Gdy skończy, `[*]` zmienia się
   w liczbę, np. `[1]` — to licznik uruchomień.
2. Przy notebooku otwartym z cudzego linku Colab wyświetla ostrzeżenie, że
   notatnik nie pochodzi od Google, i pyta, czy uruchomić mimo to. Ten notebook
   przygotowaliśmy my — zawiera tylko kod, który widzisz — więc potwierdź
   uruchomienie.

I jeszcze jedno na spokój: komórkę można uruchamiać **wiele razy** — licznik
w nawiasie po prostu rośnie (`[2]`, `[3]`…), a wynik pod komórką jest za każdym
razem liczony na nowo. Niczego tym nie zepsujesz. Eksperymentowanie
z przyciskiem ▶ jest tu najtańszą rzeczą na świecie.

### Checklist wykonania (to zalicza atom)

1. Upewnij się, że jesteś w przeglądarce zalogowany(-a) na konto Google
   (prawy górny róg dowolnej strony Google — kółko z Twoim awatarem).
2. Otwórz notebook **L0.1** linkiem z tej pozycji w SkillBridge — otworzy się
   Google Colab.
3. Najedź kursorem na pierwszą komórkę kodu i kliknij przycisk **▶** po jej
   lewej stronie (albo kliknij w komórkę i wciśnij **Ctrl+Enter**).
4. Jeśli pojawi się ostrzeżenie o notatniku spoza Google — kliknij
   **„Uruchom mimo to"** (punkt 2 teorii).
5. Poczekaj, aż `[*]` zmieni się w liczbę, i przeczytaj wynik pod komórką.
6. Uruchom tak samo **komórkę-pieczątkę** na końcu notebooka: wpisz w niej kod
   atomu widoczny w SkillBridge przy tej pozycji, a wypisany token wklej
   z powrotem w SkillBridge.

**Zaliczenie:** poprawny token (deterministyczny check — mechanizm w zasadach
modułu wyżej).

### Pytania (retrieval — nie blokują zaliczenia, nielimitowane próby)

**P1. Co musisz zainstalować na swoim komputerze, żeby uruchomić kod w Google
Colab?**

- A. Pythona — *Nie — i to jest właśnie siła Colab: Python jest już
  zainstalowany na komputerach Google, na których wykonuje się Twój kod.
  U siebie potrzebujesz tylko przeglądarki.* (diagnoza: myli Colab z pracą
  lokalną)
- B. Program Google Colab — *Nie — Colab nie jest programem do zainstalowania,
  tylko stroną internetową: otwierasz ją w przeglądarce jak Gmaila.* (diagnoza:
  myli usługę w przeglądarce z aplikacją)
- C. **Nic — wystarczy przeglądarka i konto Google** ✓ — *Tak. Kod wykonuje się
  na komputerach Google, a Ty widzisz wynik w przeglądarce.*
- D. Specjalny edytor do pisania kodu — *Nie — edytorem jest sam notebook:
  piszesz i uruchamiasz kod bezpośrednio w komórkach na stronie.* (diagnoza:
  przenosi wyobrażenie „programista = osobny program-edytor")

**P2. Po czym poznasz, że komórka została wykonana?**

- A. Przycisk ▶ znika z komórki — *Nie — przycisk zostaje, żeby można było
  uruchomić komórkę ponownie.* (diagnoza: oczekuje zmiany „przycisku
  jednorazowego")
- B. **Pod komórką pojawia się wynik, a `[*]` zmienia się w liczbę, np. `[1]`**
  ✓ — *Tak. Liczba to licznik uruchomień, a wynik stoi bezpośrednio pod
  komórką.*
- C. Strona przeładowuje się i pokazuje nową kartę z wynikiem — *Nie — wszystko
  dzieje się w tym samym miejscu: wynik pojawia się pod komórką, bez
  przeładowania.* (diagnoza: model „formularza WWW", nie notebooka)
- D. Przychodzi e-mail z wynikiem — *Nie — wynik widzisz od razu pod komórką;
  Colab niczego nie wysyła.* (diagnoza: model „zadania wysyłanego do
  sprawdzenia")

**P3. Komórka zawiera `print("Do dzieła")`. Co dokładnie pojawi się pod nią po
uruchomieniu?**

- A. **Do dzieła** ✓ — *Tak. Cudzysłów wyznacza początek i koniec tekstu, ale
  sam nie jest wypisywany.*
- B. "Do dzieła" — *Prawie — ale cudzysłów tylko mówi Pythonowi, gdzie tekst
  się zaczyna i kończy; w wyniku go nie ma.* (diagnoza: traktuje cudzysłów jako
  część tekstu)
- C. print("Do dzieła") — *Nie — to jest instrukcja, którą Python wykonuje,
  a nie tekst do pokazania. Pod komórką ląduje wynik wykonania, czyli samo
  „Do dzieła".* (diagnoza: nie odróżnia jeszcze instrukcji od jej wyniku)
- D. Nic — kod tylko się sprawdza — *Nie — `print` właśnie po to jest, żeby coś
  wypisać. Jeśli pod komórką nic nie ma, komórka nie została uruchomiona.*
  (diagnoza: model „kompilacji bez efektu")

### Drabinka hintów (zadanie wykonawcze)

1. **Koncepcyjny:** Przycisk ▶ pokazuje się dopiero, gdy najedziesz kursorem na
   komórkę z kodem (komórki z samym tekstem go nie mają). Sprawdź też prawy
   górny róg: musisz być zalogowany(-a) na konto Google, inaczej Colab
   poprosi o logowanie zamiast uruchomić kod.
2. **Szkielet:** Kolejność: (1) otwórz link z SkillBridge → (2) zaloguj się,
   jeśli Colab o to poprosi → (3) najedź na PIERWSZĄ komórkę z kodem (szare pole
   z `print(...)`) → (4) klik ▶ → (5) przy ostrzeżeniu o notatniku spoza Google
   potwierdź uruchomienie → (6) czekaj, aż `[*]` zmieni się w `[1]`.
3. **Pełne rozwiązanie z objaśnieniem:** Najczęstsze trzy blokady: (a) brak
   zalogowania — Colab pokazuje stronę logowania Google: zaloguj się i wróć do
   linku; (b) ostrzeżenie „notatnik nie pochodzi od Google" — to standardowe
   ostrzeżenie przy KAŻDYM cudzym notebooku, nasz zawiera wyłącznie widoczny
   kod: kliknij „Uruchom mimo to"; (c) `[*]` kręci się długo — pierwsze połączenie z komputerem
   Google trwa zwykle do minuty, czasem dłużej: nie klikaj wielokrotnie,
   poczekaj na `[1]`.
   Jeśli po minucie nadal nic — otwórz stronę „Pierwsza pomoc L0" (niżej)
   albo użyj przycisku „utknąłem".

---

## Atom L0.2 — Komórki: tekst, kod i Twoja własna kopia

**Typ:** `lab` · **Czas studenta:** ~15 min · **Koncept:** notebook to komórki —
czytam, edytuję i uruchamiam je pojedynczo · **UI zweryfikowano:** 2026-07-11

### Cel

Rozróżnisz komórki tekstowe i komórki kodu, zmienisz kod w komórce i uruchomisz
ją ponownie — na własnej kopii notebooka, zapisanej na Twoim Dysku Google.

### Teoria

Notebook składa się z komórek dwóch rodzajów:

- **Komórka tekstowa** — objaśnienia, nagłówki, notatki. Wygląda jak zwykły
  dokument, nie ma przycisku ▶ i **nie wykonuje się** — jest tylko do czytania.
- **Komórka kodu** — szare pole z kodem i przyciskiem ▶. Tylko ona „coś robi".

Po co ten podział? Notebooki, na których będziesz pracować przez całą ścieżkę,
przeplatają objaśnienia z kodem: komórka tekstowa mówi, CO zaraz zrobimy i po
co, komórka kodu — robi to. Czytaj je więc po kolei, jak rozdziały, a nie
przeskakuj od razu do kodu.

W atomie L0.1 kod tylko uruchamiałeś(-aś). Teraz go **zmienisz**. Komórkę kodu
edytuje się jak tekst w dokumencie: klikasz w nią i piszesz — a gdy coś
przypadkiem zepsujesz, cofnięcie działa jak wszędzie: **Ctrl+Z** wewnątrz
komórki przywraca poprzedni stan. Ważna zasada:

> **Zmiana kodu nie zmienia wyniku sama z siebie.** Wynik pod komórką pochodzi
> z jej OSTATNIEGO uruchomienia. Po każdej zmianie kodu uruchom komórkę
> ponownie — inaczej patrzysz na stary wynik.

Zobacz komórkę, którą za chwilę zmienisz:

```python
imie = "Alex"            # zapamiętaj tekst "Alex" pod nazwą: imie
print("Cześć, " + imie)  # wypisz "Cześć, " sklejone z tym, co kryje się pod: imie
```

Nowość: `imie = "Alex"` **zapamiętuje wartość pod nazwą** — o tym, jak to
działa, więcej w następnym atomie; tu wystarczy intuicja „pudełko z etykietą".
Znak `+` skleja dwa teksty w jeden.

**Przewidź:** co wypisze ta komórka? A co wypisze, gdy w pierwszej linii
wpiszesz swoje imię zamiast `Alex` i uruchomisz ją ponownie?

Za pierwszym razem: `Cześć, Alex`. Po Twojej zmianie i PONOWNYM uruchomieniu —
Twoje imię. Bez ponownego uruchomienia — nadal `Cześć, Alex`, choć kod już
wygląda inaczej.

Ostatnia rzecz: notebook otwarty z naszego linku jest **tylko do odczytu** —
możesz uruchamiać komórki, ale zmiany nie zapiszą się na stałe. Żeby mieć
własną, zapisywaną wersję, zrób kopię: menu **Plik → Zapisz kopię na Dysku**.
Colab otworzy nową kartę z Twoją kopią (jej nazwa zaczyna się od „Kopia…"),
która od tej pory **zapisuje się automatycznie** na Twoim Dysku Google,
w folderze „Colab Notebooks". Od tego miejsca pracujesz zawsze na swojej kopii.

### Checklist wykonania (to zalicza atom)

1. Otwórz notebook **L0.2** linkiem z SkillBridge.
2. Zrób własną kopię: **Plik → Zapisz kopię na Dysku**; dalej pracuj w karcie
   z kopią.
3. Kliknij w komórkę z `imie = "Alex"` i zamień `Alex` na swoje imię
   (cudzysłowy zostają!).
4. Uruchom tę komórkę ponownie (▶ lub Ctrl+Enter) i sprawdź, że wynik się
   zmienił.
5. Uruchom komórkę-pieczątkę (kod atomu z SkillBridge) i wklej token
   w SkillBridge.

**Zaliczenie:** poprawny token; komórka-pieczątka wypisuje go dopiero, gdy
wartość `imie` różni się od domyślnej (deterministyczny check zmiany + wykonania).

### Pytania (retrieval)

**P1. Czym komórka tekstowa różni się od komórki kodu?**

- A. Tekstowa wykonuje się wolniej — *Nie — tekstowa nie wykonuje się wcale:
  to objaśnienie do czytania, nie instrukcje dla komputera.* (diagnoza: sądzi,
  że wszystko w notebooku się „wykonuje")
- B. **Tekstowa to objaśnienia i nie wykonuje się; komórka kodu zawiera
  instrukcje i ma przycisk ▶** ✓ — *Tak. „Coś robi" tylko komórka kodu.*
- C. Niczym — to dwa widoki tej samej komórki — *Nie — to osobne komórki
  różnych rodzajów; tekstowa nie ma przycisku ▶ i nie da się jej „uruchomić".*
  (diagnoza: nie rozdziela jeszcze warstwy objaśnień od warstwy kodu)
- D. W tekstowej nie można nic zmienić — *Nie — obie rodzaje komórek można
  edytować (we własnej kopii); różnica jest w tym, że tylko komórka kodu się
  wykonuje.* (diagnoza: myli „tylko do odczytu" cudzego notebooka z rodzajem
  komórki)

**P2. Zmieniłeś(-aś) kod w komórce, ale wynik pod nią się nie zmienił.
Najbardziej prawdopodobny powód?**

- A. Colab się zepsuł — *Mało prawdopodobne — zanim to założysz, sprawdź
  prostsze wyjaśnienie: czy komórka została uruchomiona PO zmianie?* (diagnoza:
  atrybucja do narzędzia zamiast do przebiegu)
- B. **Komórka nie została uruchomiona ponownie po zmianie** ✓ — *Tak. Wynik
  pochodzi z ostatniego uruchomienia — po każdej zmianie kodu uruchom komórkę
  jeszcze raz.*
- C. Trzeba było dopisać kod w nowej komórce, nie zmieniać starej — *Nie —
  zmienianie istniejących komórek jest normalne; wystarczy po zmianie uruchomić
  komórkę ponownie.* (diagnoza: model „kod się nie edytuje, tylko dopisuje")
- D. Zmiany w kodzie widać dopiero po zapisaniu pliku — *Nie — w Colab kopia
  zapisuje się sama, a wynik zależy wyłącznie od tego, czy komórka została
  uruchomiona po zmianie.* (diagnoza: przenosi model „zapisz plik, żeby
  zadziałało")

**P3. Po co robisz kopię notebooka na swoim Dysku, skoro cudzy notebook też da
się uruchamiać?**

- A. Bez kopii kod się nie wykona — *Nie — uruchamiać można i cudzy notebook;
  kopia jest po to, żeby Twoje ZMIANY miały się gdzie zapisać.* (diagnoza: myli
  prawo uruchamiania z prawem zapisu)
- B. Kopia działa szybciej — *Nie — szybkość jest taka sama; różnica dotyczy
  zapisywania zmian.* (diagnoza: zgaduje „lepszość" kopii po niewłaściwej osi)
- C. **Cudzy notebook jest tylko do odczytu — zmiany zapisują się dopiero
  w Twojej kopii na Twoim Dysku** ✓ — *Tak. Kopia z „Plik → Zapisz kopię na
  Dysku" zapisuje się automatycznie w folderze „Colab Notebooks".*
- D. Google usuwa cudze notebooki po zamknięciu karty — *Nie — notebook autora
  zostaje u autora; znika tylko Twoja niezapisana praca, jeśli nie zrobisz
  kopii.* (diagnoza: słuszna intuicja „coś przepadnie", błędnie umiejscowiona)

### Drabinka hintów (zadanie wykonawcze)

1. **Koncepcyjny:** Pracujesz w DWÓCH krokach: najpierw kopia na Dysk (żeby
   zmiany się zapisywały), potem edycja + PONOWNE uruchomienie komórki (żeby
   zmianę było widać w wyniku). Jeśli wynik się nie zmienia — prawie na pewno
   brakuje ponownego uruchomienia.
2. **Szkielet:** (1) menu **Plik** (lewy górny róg) → **Zapisz kopię na Dysku**
   → (2) przełącz się na nową kartę „Kopia notatnika…" → (3) klik w linię
   `imie = "Alex"` → zamień tylko tekst między cudzysłowami → (4) ▶ na TEJ
   komórce → (5) sprawdź wynik → (6) ▶ na komórce-pieczątce.
3. **Pełne rozwiązanie z objaśnieniem:** Po kroku 1 nazwa pliku (lewy górny
   róg) zaczyna się od „Kopia" — jeśli nie zaczyna, nadal jesteś w oryginale
   (tylko do odczytu) i zmiany przepadną. W linii `imie = "Alex"` zamień wyłącznie
   `Alex`, zostawiając cudzysłowy: `imie = "Kasia"`. Skasowanie cudzysłowu to
   najczęstszy błąd — Python zgłosi wtedy `SyntaxError`; poprawka: przywróć
   cudzysłów z obu stron. Po zmianie kliknij ▶ na tej samej komórce — dopiero
   to uruchamia nowy kod — a potem ▶ na komórce-pieczątce, wpisz kod atomu
   z SkillBridge i przenieś token.

---

## Atom L0.3 — Sesja ma pamięć: zmienne, kolejność, restart

**Typ:** `lab` · **Czas studenta:** ~15–20 min · **Koncept:** komórki
współdzielą pamięć sesji — kolejność uruchamiania ma znaczenie, a restart
czyści wszystko · **UI zweryfikowano:** 2026-07-11

### Cel

Zobaczysz, że notebook „pamięta" wartości między komórkami, świadomie
wywołasz i naprawisz najczęstszy błąd początkujących (`NameError`) oraz
zrestartujesz sesję i przywrócisz notebook do działania.

### Teoria

W atomie L0.2 linia `imie = "Alex"` zapamiętała tekst pod nazwą. Taka nazwa
z przypisaną wartością to **zmienna** — pudełko z etykietą: `imie` to etykieta,
`"Alex"` to zawartość.

Najważniejsza właściwość notebooka: **komórki współdzielą jedną pamięć**.
Zmienna utworzona w jednej komórce jest dostępna w każdej następnej, którą
uruchomisz. Ta wspólna pamięć to **sesja** (Colab mówi też: *środowisko
wykonawcze*, ang. *runtime*) — połączenie z komputerem Google, który trzyma
Twoje zmienne.

Z tego wynika zasada: **liczy się kolejność URUCHAMIANIA, nie kolejność na
stronie**. Zobacz dwie komórki:

```python
# komórka 1
kawa = 12        # zapamiętaj liczbę 12 pod nazwą: kawa
```

```python
# komórka 2
print(kawa * 30) # wypisz: zawartość pudełka kawa razy 30
```

**Przewidź:** co wypisze komórka 2 uruchomiona PO komórce 1? A co się stanie,
gdy w świeżo otwartym notebooku uruchomisz komórkę 2 jako PIERWSZĄ?

Po kolei: `360`. Komórka 2 jako pierwsza — błąd:

```
NameError: name 'kawa' is not defined
```

Python mówi: „nie znam nazwy `kawa`" — bo komórka, która ją tworzy, jeszcze się
nie wykonała. **Błąd to komunikat, nie katastrofa** — i warto od razu nauczyć
się go czytać, bo czerwone komunikaty będą Ci towarzyszyć całą ścieżkę (każdemu
programującemu towarzyszą codziennie). Instrukcja czytania jest krótka:
patrz na **ostatnią linię** komunikatu. Przed dwukropkiem stoi rodzaj problemu
(`NameError` — „nie znam nazwy"), po dwukropku — konkret (której nazwy).
Wyżej Python pokazuje jeszcze, w której linii kodu się zatrzymał. Nic poza tym
nie musisz z komunikatu rozumieć. Tu diagnoza brzmi: brakuje nazwy `kawa`,
więc lekarstwem jest uruchomienie najpierw komórki 1, która tę nazwę tworzy.

Drugie źródło tego samego błędu: **sesja wygasa**. Po dłuższej bezczynności
Colab rozłącza połączenie — kod w komórkach zostaje (to część pliku), ale
**wartości zmiennych znikają** (były w pamięci sesji). Notebook wygląda
normalnie, lecz zachowuje się „jak nowy". Sesję można też wyczyścić samodzielnie:
menu **Środowisko wykonawcze → Uruchom ponownie sesję**. Lekarstwo po każdym
restarcie jest jedno: uruchom komórki od początku — ręcznie po kolei albo
**Środowisko wykonawcze → Uruchom wszystkie**. Ta druga opcja wykonuje komórki
dokładnie w kolejności, w jakiej stoją na stronie — dlatego notebooki pisze
się tak, żeby komórka tworząca zmienną stała wyżej niż komórki, które jej
używają.

### Checklist wykonania (to zalicza atom)

1. Otwórz notebook **L0.3** i od razu zrób kopię na Dysk (jak w L0.2).
2. Uruchom komórki 1 i 2 po kolei — sprawdź wynik `360`.
3. Zrestartuj sesję: **Środowisko wykonawcze → Uruchom ponownie sesję**
   (potwierdź w okienku).
4. Uruchom teraz SAMĄ komórkę 2 — zobacz `NameError` na własne oczy. To
   zaplanowane: masz zobaczyć, jak wygląda, żeby Cię nigdy nie zaskoczył.
5. Napraw: **Środowisko wykonawcze → Uruchom wszystkie** — sprawdź, że `360`
   wróciło.
6. Uruchom komórkę-pieczątkę i przenieś token do SkillBridge.

**Zaliczenie:** poprawny token (komórka-pieczątka liczy go z kodu atomu
i wartości zmiennych obecnych w bieżącej sesji — dowód, że komórki notebooka
zostały wykonane). Jawne ustępstwo: sam fakt restartu jest z poziomu Pythona
nieweryfikowalny — kroki 3–5 są instruktażowe; token potwierdza wykonanie
komórek, nie przebieg restartu (odnotowane w notatkach dla Olivera).

### Pytania (retrieval)

**P1. Po restarcie sesji („Uruchom ponownie sesję") co znika, a co zostaje?**

- A. Znika wszystko, łącznie z kodem w komórkach — *Nie — kod to część pliku
  notebooka i zostaje nietknięty; znika tylko pamięć sesji.* (diagnoza: nie
  rozdziela pliku od pamięci sesji — w drugą stronę)
- B. **Znikają wartości zmiennych; kod w komórkach zostaje** ✓ — *Tak. Dlatego
  po restarcie uruchamia się komórki od początku — plik jest cały, pamięć
  pusta.*
- C. Nic nie znika — restart tylko odświeża stronę — *Nie — restart czyści
  pamięć sesji: każda zmienna przestaje istnieć, dopóki jej komórka nie
  wykona się ponownie.* (diagnoza: myli restart sesji z odświeżeniem karty)
- D. Znika notebook z Dysku — *Nie — plik na Twoim Dysku jest bezpieczny;
  restart dotyczy wyłącznie połączenia z komputerem Google i jego pamięci.*
  (diagnoza: strach „stracę pracę" przypięty do złego mechanizmu)

**P2. Komórka `print(kawa * 30)` zgłasza `NameError: name 'kawa' is not
defined`. Najbardziej prawdopodobna przyczyna?**

- A. Literówka w słowie `print` — *Nie — komunikat wskazuje nazwę `kawa`, nie
  `print`; Python mówi dokładnie, której nazwy nie zna.* (diagnoza: nie czyta
  jeszcze treści komunikatu błędu)
- B. Python nie umie mnożyć — *Nie — do mnożenia w ogóle nie doszło: Python
  zatrzymał się wcześniej, bo nie wie, co kryje się pod nazwą `kawa`.*
  (diagnoza: szuka winy w operacji zamiast w brakującej definicji)
- C. **Komórka tworząca zmienną `kawa` nie została uruchomiona w tej sesji**
  ✓ — *Tak — np. po restarcie albo przy uruchomieniu komórek w złej kolejności.
  Lek: uruchom komórki od początku.*
- D. Trzeba zrobić kopię notebooka na Dysk — *Nie — kopia dotyczy zapisywania
  zmian; `NameError` dotyczy pamięci sesji i kolejności uruchamiania.*
  (diagnoza: skleja dwa świeżo poznane mechanizmy w jeden)

**P3. Wieczorem wszystko działało; rano ta sama komórka daje `NameError`,
choć kodu nikt nie zmieniał. Co się stało i co robisz?**

- A. Notebook się uszkodził — zaczynam od nowa w nowym pliku — *Nie — plik jest
  cały. Przez noc wygasła sesja i pamięć zmiennych jest pusta; wystarczy
  „Uruchom wszystkie".* (diagnoza: brak pojęcia wygasającej sesji → drastyczne
  obejścia)
- B. **Sesja wygasła przez bezczynność — uruchamiam komórki od początku
  („Uruchom wszystkie")** ✓ — *Tak. Kod został, zmienne zniknęły — to ten sam
  stan co po ręcznym restarcie.*
- C. Google cofnęło moje zmiany do wersji z linku — *Nie — Twoja kopia na Dysku
  zapisuje się automatycznie i nikt jej nie cofa; zniknęła tylko pamięć
  sesji.* (diagnoza: winą obarcza zapis pliku zamiast sesji)
- D. Rano trzeba najpierw odpowiedzieć na pytania atomu, żeby kod działał —
  *Nie — pytania w SkillBridge i pamięć sesji Colab to zupełnie osobne światy.*
  (diagnoza: kontrola — myli mechanikę platformy z mechaniką narzędzia)

### Drabinka hintów (zadanie wykonawcze)

1. **Koncepcyjny:** W tym atomie błąd w kroku 4 jest CELEM, nie problemem —
   masz go zobaczyć. Pilnuj rozróżnienia: plik (kod, zostaje) vs sesja
   (zmienne, znikają). Menu od restartu i od „Uruchom wszystkie" to to samo
   menu: **Środowisko wykonawcze** na górnym pasku.
2. **Szkielet:** (1) kopia na Dysk → (2) ▶ komórka 1, ▶ komórka 2 → widzisz
   `360` → (3) **Środowisko wykonawcze → Uruchom ponownie sesję** → potwierdź
   → (4) ▶ TYLKO komórka 2 → czerwony `NameError` (tak ma być) → (5)
   **Środowisko wykonawcze → Uruchom wszystkie** → `360` wraca → (6) ▶
   komórka-pieczątka.
3. **Pełne rozwiązanie z objaśnieniem:** Jeśli w kroku 4 zamiast `NameError`
   widzisz `360` — sesja nie została zrestartowana (np. kliknięcie „Anuluj"
   w okienku potwierdzenia); wróć do kroku 3. Jeśli po „Uruchom wszystkie"
   `NameError` nie znika — sprawdź, czy jesteś w SWOJEJ kopii i czy komórka 1
   nadal zawiera `kawa = 12` (przypadkowe skasowanie linii = ta sama choroba:
   nazwa nie istnieje). Gdy Colab w ogóle nie chce się połączyć (pasek „Łączę…"
   bez końca) — patrz „Pierwsza pomoc L0", pozycja 3, albo przycisk „utknąłem".

---

## Atom L0.4 — Twój pierwszy własny skrypt

**Typ:** `lab` · **Czas studenta:** ~15–20 min · **Koncept:** skrypt =
sekwencja instrukcji wykonywana od góry do dołu — piszę ją sam(a) ·
**UI zweryfikowano:** 2026-07-11

### Cel

Napiszesz od zera i uruchomisz własny, kilkulinijkowy skrypt, który coś
policzy i wypisze wynik. Uruchomiony skrypt to Twój dowód zaliczenia całego
modułu L0.

### Teoria

Wszystkie klocki już znasz z L0.1–L0.3 — teraz złożysz z nich pierwszą całość.

**Skrypt** to przepis: lista instrukcji, którą Python wykonuje **od góry do
dołu, linia po linii**. W jednej komórce może być wiele linii — to wciąż jeden
skrypt. Dobry nawyk od pierwszego dnia: nie pisz wszystkiego na raz. Dopisz
linię, uruchom komórkę, sprawdź wynik, dopisz następną. Krótkie pętle
„napisz–uruchom–sprawdź" to normalny tryb pracy z kodem — a ewentualny błąd
zawsze dotyczy wtedy ostatniej dopisanej linii, więc wiadomo, gdzie szukać.
Twoje klocki:

- **zmienna** — zapamiętuje wartość pod nazwą (`kawa = 12`),
- **działanie** — `+`, `-`, `*` (mnożenie to gwiazdka, nie ×),
- **`print(...)`** — wypisuje wynik na ekran.

Skoro piszesz sam(a), to Ty wymyślasz **nazwy zmiennych**. Zasady są trzy:
nazwa bez spacji (zamiast spacji podkreślnik: `cena_biletu`), Python rozróżnia
wielkość liter (`Dni` i `dni` to DWIE różne nazwy — najbezpieczniej pisz
wszystko małymi), a najlepsza nazwa to taka, która mówi, co jest w pudełku
(`cena`, nie `x` — za dwa tygodnie podziękujesz sobie za czytelność). Polskich
znaków (ą, ż) unikaj — formalnie działają, ale przysporzą kłopotów przy pracy
z cudzym kodem.

Jedna nowa rzecz, o którą potyka się każdy początkujący: **liczba a tekst**.
`12` (bez cudzysłowu) to liczba — można na niej liczyć. `"12"` (w cudzysłowie)
to tekst, który tylko WYGLĄDA jak liczba. Zasada na teraz: **to, na czym
liczysz, piszesz bez cudzysłowu; cudzysłów jest dla tekstu do wypisania.**

Przykład w całości — miesięczny koszt nawyku kawowego:

```python
cena = 12               # liczba (bez cudzysłowu) — cena jednej kawy w zł
dni = 30                # liczba dni w miesiącu
koszt = cena * dni      # policz i zapamiętaj wynik pod nazwą: koszt
print("Kawa miesięcznie, zł:")   # tekst w cudzysłowie — etykieta wyniku
print(koszt)            # liczba spod nazwy koszt — bez cudzysłowu!
```

**Przewidź:** co dokładnie wypiszą dwie ostatnie linie? I pytanie-pułapka: co
wypisałaby linia `print("koszt")` — z cudzysłowem?

Wynik: `Kawa miesięcznie, zł:` i pod spodem `360`. A `print("koszt")` wypisze
dosłownie słowo `koszt` — cudzysłów mówi „to tekst", więc Python nie zagląda
do pudełka o tej nazwie.

Zanim napiszesz własny skrypt, rozgrzewka na uzupełnianie (w notebooku L0.4,
komórka „Rozgrzewka" — uzupełnij dwie luki i uruchom):

```python
bilet = 4             # cena biletu w zł
przejazdy = _luka_    # ile razy jeździsz w tygodniu — wpisz liczbę
print(bilet * _luka_) # policz koszt tygodnia — jakiej nazwy tu użyć?
```

### Checklist wykonania (to zalicza atom i moduł L0)

1. Otwórz notebook **L0.4**, zrób kopię na Dysk.
2. Uruchom komórkę z przykładem „kawa" i sprawdź przewidywania z teorii.
3. Uzupełnij i uruchom komórkę „Rozgrzewka" (dwie luki).
4. W pustej komórce „Twój skrypt" napisz własny skrypt wg specyfikacji:
   **co najmniej dwie zmienne liczbowe, jedno działanie na nich i jeden
   `print` z wynikiem** — policz coś swojego (wydatki, kilometry, strony
   książki — temat dowolny).
5. Uruchom swój skrypt; jeśli czerwony błąd — czytaj komunikat i drabinkę
   hintów (błąd ≠ porażka, to feedback).
6. Uruchom komórkę-pieczątkę i przenieś token do SkillBridge.

**Zaliczenie:** poprawny token — komórka-pieczątka sprawdza deterministycznie,
że w pamięci sesji istnieją ≥2 zmienne liczbowe **o nazwach spoza przykładów
notebooka** (wykluczone: `cena`, `dni`, `koszt`, `bilet`, `przejazdy`) — czyli
że własny skrypt z kroku 4 faktycznie SIĘ WYKONAŁ w tej sesji — i dopiero
wtedy liczy token z kodu atomu. To jest
„pierwszy uruchomiony skrypt jako dowód" z ADR-014. (Check pozostaje obchodzilny
świadomym oszustwem — wystarczający na pilot; szczegóły w notatkach niżej.)

### Pytania (retrieval)

**P1. Skrypt: `a = 5`, potem `b = 3`, potem `print(a * b)`. Co pojawi się pod
komórką?**

- A. **15** ✓ — *Tak: Python wykonał linie od góry do dołu, `a * b` to 5 razy
  3, a `print` wypisał wynik.*
- B. a * b — *Nie — bez cudzysłowu `a * b` to działanie do WYKONANIA, nie tekst;
  wypisany zostaje jego wynik.* (diagnoza: nie odróżnia zapisu działania od
  jego wyniku)
- C. 53 — *Nie — gwiazdka to mnożenie liczb: 5 · 3 = 15. „Sklejenie" 5 i 3
  w 53 to intuicja z tekstów, nie z liczb.* (diagnoza: model sklejania zamiast
  arytmetyki)
- D. 8 — *Nie — 8 to wynik DODAWANIA (5 + 3); gwiazdka `*` oznacza mnożenie.*
  (diagnoza: myli symbole operatorów)

**P2. Chcesz wypisać WYNIK obliczeń zapamiętany pod nazwą `koszt`. Która linia
jest poprawna?**

- A. print("koszt") — *Nie — cudzysłów robi z tego zwykły tekst: wypisze się
  słowo „koszt", a nie wartość spod tej nazwy.* (diagnoza: cudzysłów „na
  wszelki wypadek" wokół nazwy zmiennej — błąd nr 1 początkujących)
- B. **print(koszt)** ✓ — *Tak — bez cudzysłowu Python sięga do pudełka
  o nazwie `koszt` i wypisuje jego zawartość.*
- C. print = koszt — *Nie — znak `=` przypisuje wartość do nazwy, niczego nie
  wypisuje; do wypisywania służy `print(...)` z nawiasami.* (diagnoza: myli
  przypisanie z wywołaniem polecenia)
- D. koszt — *Prawie — w notebooku ostatnia goła nazwa w komórce faktycznie
  pokaże wartość, ale to cecha notebooka, nie skryptu; niezawodny i uniwersalny
  sposób to `print(koszt)`.* (diagnoza: skrót notebookowy mylony z regułą
  języka)

**P3. W nowej, świeżo uruchomionej sesji wykonujesz skrypt o trzech liniach:
(1) `oplata = 12`, (2) `print(suma)`, (3) `suma = oplata * 30`. Co się
stanie?**

- A. Wypisze 360 — Python najpierw przeczyta cały skrypt — *Nie — Python nie
  czyta „na zapas": wykonuje linie ściśle od góry do dołu i w linii 2 nazwa
  `suma` jeszcze nie istnieje.* (diagnoza: model „komputer rozumie intencję
  całości")
- B. Wypisze 360, ale z ostrzeżeniem — *Nie — to nie ostrzeżenie, tylko
  zatrzymanie: `NameError` przerywa wykonanie w linii 2 i do linii 3 w ogóle
  nie dochodzi.* (diagnoza: traktuje błąd jako kosmetykę)
- C. **`NameError` w linii 2 — `suma` jest tworzona dopiero w linii 3, czyli
  za późno** ✓ — *Tak. Kolejność linii w skrypcie działa jak kolejność
  uruchamiania komórek w L0.3: najpierw stwórz, potem użyj. Poprawka: przenieś
  linię 3 przed linię 2.*
- D. Wypisze słowo „suma" — *Nie — `suma` stoi tu bez cudzysłowu, więc Python
  szuka wartości pod tą nazwą (i jej nie znajduje); słowo wypisałby zapis
  `print("suma")`.* (diagnoza: odwrócone rozumienie reguły cudzysłowu)

### Drabinka hintów (zadanie wykonawcze — krok 4)

1. **Koncepcyjny:** Twój skrypt to dokładnie wzorzec z przykładu „kawa", tylko
   z Twoim tematem: dwie linie „zapamiętaj liczbę", jedna linia „policz",
   jedna linia „wypisz". Liczby bez cudzysłowów; kolejność: najpierw zmienne,
   na końcu `print`.
2. **Szkielet:** Uzupełnij pod siebie:

   ```python
   ___ = ___          # pierwsza wielkość (nazwa = liczba)
   ___ = ___          # druga wielkość
   wynik = ___ * ___  # działanie na obu nazwach (* + albo -)
   print(wynik)
   ```

3. **Pełne rozwiązanie z objaśnieniem:**

   ```python
   strony = 20                # tyle stron czytam jednego wieczora
   wieczory = 14              # przez dwa tygodnie
   wynik = strony * wieczory  # 20 · 14 = razem stron
   print("Przeczytam stron:")
   print(wynik)               # bez cudzysłowu — chcę wartość, nie słowo "wynik"
   ```

   Typowe czerwone komunikaty przy własnym skrypcie: `SyntaxError` — najczęściej
   niedomknięty cudzysłów lub nawias w linii z `print`; `NameError: name '…'
   is not defined` — nazwa w `print`/działaniu różni się od nazwy przy `=`
   (Python rozróżnia wielkość liter: `Dni` ≠ `dni`) albo linia definiująca nie
   została wykonana. Przeczytaj, KTÓRĄ nazwę wskazuje komunikat, popraw
   i uruchom ponownie — a jeśli trzeci raz to samo, przycisk „utknąłem" jest
   dokładnie na tę okazję.

---

## Strona „Pierwsza pomoc środowiskowa — L0/Colab" (D5a, statyczna, per moduł)

Utrzymywana jak treść (konwencja `verifiedAt`). Topowe blokady środowiskowe,
których hint per koncept nie przewidzi:

1. **Nie widzę przycisku ▶ / nic nie da się kliknąć** → nie jesteś zalogowany
   na konto Google albo patrzysz na komórkę tekstową (▶ mają tylko komórki
   kodu; pokaż się po najechaniu kursorem).
2. **Ostrzeżenie w stylu „Ten notatnik nie został utworzony przez Google"** →
   standardowe przy każdym cudzym notebooku; notebooki L0 zawierają wyłącznie
   widoczny kod — kliknij **„Uruchom mimo to"**.
3. **`[*]` kręci się bardzo długo / pasek „Łączę…" bez końca** → pierwsze
   połączenie umie trwać do minuty. Dłużej: menu **Środowisko wykonawcze →
   Uruchom ponownie sesję**, a gdy to nie pomaga — zamknij kartę i otwórz
   notebook ponownie z linku/Dysku. Nie klikaj ▶ wielokrotnie w pętli.
4. **`NameError: name '…' is not defined`** → komórka tworząca tę nazwę nie
   wykonała się w tej sesji (zła kolejność, wygasła sesja, literówka
   w nazwie — wielkość liter ma znaczenie). Lek: **Środowisko wykonawcze →
   Uruchom wszystkie**; literówkę popraw.
5. **`SyntaxError`** → Python nie rozumie zapisu linii: najczęściej brakuje
   cudzysłowu z jednej strony tekstu albo nawiasu w `print(...)`. Porównaj
   linię ze wzorcem z worked example atomu.
6. **Zniknęły moje zmiany / „gdzie mój notebook?"** → pracowałeś(-aś)
   w oryginale tylko-do-odczytu zamiast w kopii (zrób: **Plik → Zapisz kopię
   na Dysku**). Kopie leżą na Twoim Dysku Google w folderze **Colab
   Notebooks**; najszybciej: colab → **Plik → Otwórz notatnik → Dysk Google**.
7. **Rano wszystko „nie działa", wczoraj działało** → wygasła sesja: kod
   został, zmienne zniknęły → **Uruchom wszystkie** (pozycja 4).
8. **Colab po angielsku, a instrukcje po polsku** → język interfejsu Colab
   idzie za językiem konta Google; nazwy menu podajemy PL, w nawiasach ścieżka
   jest identyczna pozycyjnie (Plik = File, Środowisko wykonawcze = Runtime).
   Zmiana języka konta: ustawienia konta Google → Język; doraźnie działa też
   otwarcie Colab z końcówką `?hl=pl` w adresie.

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; EN poza ścieżką krytyczną — D4)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://colab.research.google.com/notebooks/intro.ipynb | „Witamy w Colab" — oficjalny notebook wprowadzający | praktyka-docs (pogłębienie) | własnościowa (Google), darmowe użycie | EN (UI podąża za kontem) | tak (konto Google — i tak wymagane) | 2026-07-11 |
| https://support.google.com/drive/ | Pomoc Dysku Google (odnajdywanie plików, folder Colab Notebooks) | docs pomocnicze | własnościowa (Google) | PL | nie | 2026-07-11 |
| https://www.youtube.com/watch?v=wlRT_MZOvBE | „Google Colab + Python dla początkujących — Wprowadzenie" (Analiza danych z Arkadiuszem, ~22 min, 2024) | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; seans kontrolny Sophii przed ingest — patrz notatki) |

Świadomie minimalnie: sedno L0 w całości w polskiej teorii atomów; zasoby to
wyłącznie pogłębienie (EN poza ścieżką krytyczną; wideo — polskie).

---

## Słowniczek terminów EN (M11)

| Termin | Po polsku |
|---|---|
| notebook / notatnik | dokument złożony z komórek tekstu i kodu |
| cell / komórka | pojedyncze pole notebooka; wykonuje się tylko komórka kodu |
| runtime / środowisko wykonawcze | sesja: połączenie z komputerem Google trzymające Twoje zmienne |
| `print` | polecenie „wypisz na ekran" |
| `NameError` / `SyntaxError` | komunikaty błędów: „nie znam tej nazwy" / „nie rozumiem zapisu tej linii" |
| script / skrypt | lista instrukcji wykonywana od góry do dołu |

---

## Notatki dla Olivera (ingest/1E.6) — jawne ustępstwa i haki

- **Checki automatyczne (pkt 11):** wszystkie 4 atomy używają jednego
  mechanizmu „komórka-pieczątka + token" — deterministyczny, 0 LLM, bez
  sandboxa (L0 nie uruchamia kodu studenta po naszej stronie). Definicje per
  atom w sekcjach „Zaliczenie"; finalny kształt funkcji tokenu = decyzja
  inżynierska przy 1E.6. **Jawne limity mechanizmu (świadome, na pilot):**
  (a) funkcja tokenu jest widoczna w komórce — student A może policzyć token
  dla kodu studenta B (współdzielenie = świadome oszustwo, szkodzi tylko
  oszukującemu); (b) L0.3 — restart sesji jest z poziomu Pythona
  nieweryfikowalny: token dowodzi wykonania komórek, kroki restartu są
  instruktażowe; (c) L0.4 — check „≥2 zmienne liczbowe spoza listy nazw
  przykładów" jest obchodzilny ręcznym zdefiniowaniem zmiennych, wystarczający
  na pilot.
- **≤15 min (D10):** pierwszy uruchomiony kod wypada w kroku 3 checklisty
  L0.1 — przed pytaniami; pytania można robić po fakcie, bo wykonanie już
  zaliczyło atom. Teoria L0.1 = ~2–3 min czytania.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie L0.1–L0.4 =
  324–360 słów z blokami kodu, ~300–320 bez nich — w widełkach 300–600
  przy obu metodach liczenia (metodę pomiaru w treści atomów ustali standard
  QG-5 dla atomów, zadanie ~6 h z D6.5).
- **1 koncept = 1 atom — deklaracja dla L0.2:** atom uczy pracy z komórkami
  (typy, edycja, reguła starego wyniku); kopia na Dysku to KROK OPERACYJNY
  checklisty, nie drugi koncept — ale P3 świadomie ją utrwala, bo zgubiona
  praca to realne ryzyko churnu. Bundling jawny, do akceptacji w przeglądzie
  standardu QG-5.
- **Zakres pkt 9 pilnowany:** zero Gita, zero terminala, zero instalacji
  lokalnej w całym module; „instalacja pakietów w Colab" też świadomie poza L0
  (wejdzie just-in-time przy F3/M-EDA, gdzie pierwszy raz potrzebna).
- **Fading (D5a) w skali modułu:** L0.1 pełne WE (tylko uruchom) → L0.2 zmiana
  jednej wartości → L0.4 completion z lukami (rozgrzewka) → L0.4 zadanie
  samodzielne. L0 realizuje backward fading zanim jeszcze zacznie się F1.
- **TODO przed ingest 1E.2 (z przeglądu QG):**
  1. ✅ **WYKONANE (2026-07-22) — ZERO KOREKT, treść potwierdzona.**
     Zrzuty Darka: `docs/curation/screenshots/l0-a1-ostrzezenie-cudzy-notatnik-20260722.png`
     i `l0-a2-nazwa-kopii-20260722.png`.
     - **Ostrzeżenie o cudzym notebooku:** pełny tytuł brzmi
       „**Ostrzeżenie: Google nie jest autorem tego notatnika**", treść:
       „Ten notatnik został wczytany ze strony GitHub. Może on wymagać
       dostępu do Twoich danych przechowywanych w Google lub odczytu
       informacji i danych uwierzytelniających z innych sesji. Sprawdź kod
       źródłowy w tym notatniku przed jego uruchomieniem.", przyciski
       „Anuluj" / „**Uruchom mimo to**". Cytat w L0.1 („kliknij «Uruchom
       mimo to»", „to standardowe ostrzeżenie przy każdym cudzym
       notebooku") jest **dosłownie zgodny** — a uprzedzenie studenta, że
       ostrzeżenie jest normalne, okazuje się tym cenniejsze, że realny
       dialog mówi o „dostępie do danych" i „danych uwierzytelniających".
     - **Format nazwy kopii:** realnie „**Kopia notatnika** l0-1-komputer-wykonal-moj-kod.ipynb".
       L0.2 mówi „jej nazwa zaczyna się od «Kopia…»" i cytuje w hincie 2
       kartę „Kopia notatnika…" — **trafione litera-w-literę**, ostrożna
       redakcja się obroniła.
  2. ✅ **WYKONANE (2026-07-22) — seans kontrolny odbyty, werdykt Darka:
     ZATWIERDZAM jako zasób L0** (YouTube wlRT_MZOvBE, ~22 min). Wpis
     w tabeli zasobów zostaje; `verifiedAt` = 2026-07-11 (metadane),
     seans potwierdzony 2026-07-22.
  3. Zbudowanie 4 notebooków L0 (komórki wg checklist + komórka-pieczątka)
     i test przebiegu ≤15 min dla L0.1 na czystym koncie Google.

## Przebieg QG tego dokumentu (2026-07-11)

Draft → **2 agentów weryfikacyjnych (Fable 5)**: (1) research faktograficzny
Colab z webem — mechanizmy i etykiety PL potwierdzone źródłami (m.in.
„Środowisko wykonawcze → Uruchom ponownie sesję" po rebrandingu 2023, „Zapisz
kopię na Dysku", folder „Colab Notebooks", przycisk „Uruchom mimo to",
`intro.ipynb` HTTP 200 na 2026-07-11), 2 etykiety do screenshotu (TODO wyżej);
(2) krytyczny przegląd zgodności z ADR-014 — 2 znaleziska KRYTYCZNE (pułapka
stanu sesji w P3 L0.4 — zmienne przemianowane na nieużywane + dopisek „świeża
sesja"; check L0.4 zaliczający na zmiennych z przykładu — dodane wykluczenie
nazw), 5 WAŻNYCH i 6 drobnych — wszystkie wcielone lub jawnie zadeklarowane
wyżej. Werdykt przeglądu: „gotowe po poprawkach", poprawki naniesione.

## Przebieg QG notebooków L0 (2026-07-14, Krok 4)

Notebooki zbudowane wg kontraktu ADR-015 (`tools/content/notebooks/l0/`,
warstwa pieczątki = jeden wspólny blok `pieczatka.py`) przeszły adwersaryjny
przegląd agenta (Fable 5): **GO Z NOTAMI** — 0 KRYT, 2 WAŻN, 3 INFO.
Erraty wcielone w tej samej sesji (w treści atomów tylko poprawki — notatki
QG żyją tu, bo sekcje atomów idą VERBATIM do widoku studenta):
1. **WAŻN — placeholder rozgrzewki L0.4:** `___` → `_luka_`. W IPythonie/Colabie
   `___` ISTNIEJE od startu sesji (zmienna historii), więc nieuzupełniona luka
   wykonywała się PO CICHU (`4 * ''` = pusta linia) zamiast dać uczący
   `NameError`; `_luka_` nie istnieje i daje dokładnie błąd, który L0.3 uczy czytać.
2. **WAŻN — diagnoza literówki kodu atomu:** komunikat `bad_signature` w
   `lab-stamp.tsx` wskazuje teraz także błędnie przepisany kod atomu (pieczątka
   wypisze token dla dowolnego niepustego kodu — HMAC łapie to dopiero na serwerze).
3. **INFO — zdanie „Zaliczenie" L0.4:** usunięte „oraz wynik działania na nich" —
   check liczy WYŁĄCZNIE zmienne (zredukowany check z notatki (c) niżej,
   ADR-015 §5 pkt 3); pozostałe INFO: zapowiedź pola `input()` w L0.1,
   opis komórki tekstowej bez koloru tła (ciemny motyw Colaba).
Parytet pieczątki Python↔TS oraz
zgodność ładunków z checkami na prodzie przybite testem
`tests/unit/ds/notebooks-l0.contract.test.ts`; przejście całego L0
tokenami z opublikowanych notebooków zweryfikowane na bazie testowej.
