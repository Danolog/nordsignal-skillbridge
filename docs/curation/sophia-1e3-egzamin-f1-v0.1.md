# 1E.3 · Egzamin modułu F1 „Python I — podstawy języka" — bank pytań egzaminacyjnych (mastery gate)

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-24 · **Status:** **v1.0 — QG-GO, gotowe do ingestu** (blocker C1 planu 1E.3 domknięty)

**Changelog v0.1 → v1.0 (2026-07-24):** QG adwersaryjny (Sophia w roli egzaminatora-adwersarza) + rozstrzygnięcie 4 not produktowych z review Leo P4.
- **QG:** wszystkie 30 wariantów (15 pytań × A/B) re-wykonane w **dwóch silnikach — Python 3.12.4 i 3.14.6** — wyniki **identyczne, zero driftu wersji**. E14 (`SyntaxError: expected ':'`) stabilny w obu. Każda poprawna odpowiedź potwierdzona, każdy dystraktor potwierdzony jako faktycznie błędny; `ZeroDivisionError`/`TypeError`/`SyntaxError`-dystraktory potwierdzone jako niewyzwalane. Izomorfizm par A/B i kalibracja R1 zweryfikowane. Brama T1–T5: PASS. **0 błędów do poprawy** — bank bez zmian merytorycznych.
- **4 noty Leo P4 rozstrzygnięte** (nowa §5a): render konceptu bez atomu (R2) → spec dla Mili P5; semantyka M (koncepty) i N (pytania) w mikrocopy doprecyzowana (§5); pokrycie 5/5 konceptów F1 atomami `exercise` potwierdzone (§4).
- Log QG adwersaryjny dopisany do §9; §9 oznaczona „QG-GO — gotowe do ingestu". Bank oddany Engineeringowi (Ethan) do pakowania/ingestu (P1/P3) — ingest = czerwona linia, wykonuje po GO.
**Zadanie:** C1 planu technicznego 1E.3 (`docs/product/plan-1e3-mastery-gate-v0.1.md`, plasterek C1 — „Bank pytań egzaminacyjnych"). Autoryzacja Darka („puszczaj" + „wykonaj punkt 2").
**Podstawa:** ADR-014 D3 (`docs/decisions/014-curriculum-sciezka-edukacyjna.md`, l.~175 — wiersz `exam` tabeli „Definicja zaliczenia per typ") + D11 (metryka „% zdanych za 1. podejściem"). Rama produktowa: CLAUDE.md §7 (v1.13) — mastery gate = **progresja WEWNĘTRZNA** (odblokowanie następnego modułu), ocena FORMUJĄCA, maszyna samowystarczalna, zero human-in-the-loop dla bramki. Nic nie wychodzi do pracodawcy — to nie kredencjał.
**Prerekwizyt merytoryczny:** treść atomów F1 (`docs/curation/sophia-1e2-f1-atomy.md`, ZATWIERDZONA Darek 2026-07-11; notebooki QG 2026-07-21).

> **Czym jest ten dokument.** ŹRÓDŁO PRAWDY pytań egzaminacyjnych modułu F1 dla 1E.3.
> Dostarczam TREŚĆ: pytanie, cztery opcje, poprawną odpowiedź, tag konceptu, uzasadnienie
> i diagnozę każdego dystraktora (błędnej opcji). Konwencję znakowania „pytanie egzaminacyjne"
> w banku (`questionItems`), wpięcie do packera i kontrakt-test robi Engineering w plasterku P3 —
> to warstwa TECHNICZNA (Ethan), nie moja (granica roli: `skills/product/tresci-edukacyjne.md`).

> **Relacja do `sophia-1e2-f1-atomy.md` (jedno źródło prawdy — reguła twarda 1).**
> Dokument atomów F1 nosił kondensat egzaminu (sekcja „Egzamin modułu F1", wpisy E1–E15
> z jednozdaniowym feedbackiem). **Ten plik go ZASTĘPUJE jako źródło dla 1E.3** i wzbogaca:
> pełna diagnoza per dystraktor (pod correctives i QG), jawna kalibracja per pytanie, mapa
> correctives. Przy ingeście packer czyta JEDEN bank — nota dla Olivera/Engineering na końcu
> nakazuje de-duplikację (kondensat w atomy-doc oznaczyć jako przeniesiony tutaj). Numeracja
> E1–E15 zachowana 1:1, żeby ślad był policzalny.

---

## 1. Wybór modułu pilotowego + uzasadnienie

**Moduł pilotowy: F1 „Python I — podstawy języka".**

Ścieżka DS ma 8 modułów (ADR-014 D10): L0 → **F1** → F2 → F3 (+ mini-projekt) → M-EDA → M-SQL → M-ML → M-LLM. Na pilota mastery gate wybieram **F1**. Sześć powodów, w kolejności wagi:

1. **F1 to PIERWSZA bramka egzaminacyjna w całej ścieżce.** L0 zalicza się przez WYKONANIE, bez egzaminu MC (ADR-014 D4/pkt 10 — „12 pytań o terminalu = teatr pomiaru"). Egzamin F1 jest więc pierwszym realnym mastery gate, jaki student napotyka. Najwyższa dźwignia walidacyjna: jeśli mechanizm progu, retry i correctives ma się sprawdzić, ma się sprawdzić TU, zanim wejdzie w moduły cięższe.
2. **Koncepty maksymalnie domknięte i atomowe.** Typ wartości, wyrażenie, f-string, porównanie, decyzja if/else — kanon podstaw programowania, każdy jednoznaczny, każdy = dokładnie jeden atom (D1 „1 koncept = 1 atom"). To dokładnie profil, na którym egzamin ma POTWIERDZAĆ opanowanie, a nie różnicować zdolność (R1 — niżej): pytanie centralne dla konceptu daje się zadać bez pułapki wielopoziomowej.
3. **Treść kompletna i przez QG.** Atomy F1 zatwierdzone przez Darka 2026-07-11 (2 agentów weryfikacyjnych, **62/62 checki Pythona** wykonane); notebooki F1 zbudowane i przez QG 2026-07-21 (0 KRYT). Nie kalibruję egzaminu na treści, która jeszcze się rusza.
4. **Odpowiedzi w 100% deterministyczne i policzalne.** Każde pytanie to wynik jednej komórki Pythona — mogę je wykonać i zacytować z realnego uruchomienia (bramka T3/T4 przechodzi empirycznie, nie z pamięci). To warunek uczciwego banku egzaminacyjnego bramkującego postęp.
5. **Komplet konceptów mieści się w widełkach D1.** 5 konceptów × 3 pytania = 15 pytań — dolna granica D3 (15–20), próg licznikowy ≤1 błąd wychodzi dokładnie (≈93%). Żaden koncept nie zostaje bez pokrycia, rozkład równomierny.
6. **Correctives mają dokąd wracać (R2 planu).** Każdy koncept F1 ma swój atom-źródło (F1.1/F1.2/F1.3/F1.5/F1.6) — paczka powtórkowa po oblaniu nigdy nie jest pusta. Audyt pojemności (D10) dla F1 trywialnie = 0: rubryka F1 to dokładnie te 5 konceptów, wszystkie pokryte atomami.

**Odrzucone alternatywy na pilota:** L0 (brak egzaminu z założenia); M-PD/M-EDA/M-SQL/M-ML/M-LLM (koncepty cięższe, część zależna od danych mini-świata i od cudzego UI — gorsze pole do WALIDACJI samego mechanizmu bramki; kandydaci na kolejne bramki po nauczkach z pilota F1). F2/F3 to naturalni następcy — ten sam wzorzec, wgra się po domknięciu pilota.

---

## 2. examConfigJson pilota (parametr per moduł)

```json
{
  "questionCount": 15,
  "maxErrors": 1
}
```

- **`questionCount` = 15** — dolna granica D3 (15–20). Dla F1 wystarcza: 5 konceptów × 3 pytania daje pełne, równomierne pokrycie bez rozdymania (F1 to podstawy — 15 celnych pytań potwierdza opanowanie lepiej niż 20 z powtórzeniami).
- **`maxErrors` = 1** — LICZNIK dopuszczalnych błędów, nie procent (M10). Spójność wg reguły planu: `maxErrors ≤ floor(questionCount / 10)` = `floor(15/10)` = 1. Przy 15 pytaniach ≤1 błąd = ≈93% — mieści się w widełkach „≈90%" z D3. „14 pytań/90%" odrzucone tą samą arytmetyką co „12/90%" w ADR (progu nie da się trafić dokładnie).
- **Parametry towarzyszące (poza `examConfigJson` — wchodzą do logiki P3/P4/P5, tu deklaruję jako wymóg treściowy):** 2 warianty izomorficzne per pytanie (izomorficzny = ta sama struktura, inne liczby/nazwy — cap 2, D1); oblany → retry z DRUGIM wariantem; po 2. oblaniu obowiązkowe correctives (mapa w §5); ostrzeżenie przed startem „zarezerwuj ~25 min"; stan zapisywany (pauza/wznowienie — wzorzec `assessment_sessions`, kind `module_exam`).

**Monitoring (D11, obowiązek Engineering/analityki po włączeniu flagi):** metryka „% zdanych egzaminu F1 za 1. podejściem" z alertem. To ta metryka domyka kalibrację R1 danymi — jeśli 1. podejście masowo oblewa, pytania są za trudne jak na egzamin (nie jak na diagnozę) i wracają do mnie na re-kalibrację.

---

## 3. R1 — kalibracja EGZAMINACYJNA vs ATOMOWA (jawne oznaczenie)

To sedno zadania C1 i największe ryzyko planu (R1). Egzamin **nie jest** złożony z pytań atomowych — pełniłby inną funkcję i matematycznie oblewałby większość na 1. podejściu.

**Dlaczego nie wolno składać egzaminu z pytań atomowych.** Pytania atomowe celują w ~80–90% sukcesu 1. próby (D6 pkt 6, R16) — bo mają RÓŻNICOWAĆ i uczyć przez błąd. Gdyby egzamin z nich złożyć, przy prawdopodobieństwie p=0,85 na pytanie ~56% studentów oblałoby próg ≤1/15 na 1. podejściu (ADR l.~483). Próg 90% i kalibracja atomów 80–90% są matematycznie sprzeczne — dopóki pytania egzaminacyjne nie są kalibrowane OSOBNO, na WYŻSZY docelowy success rate.

**To nie jest obniżenie poziomu — to inna FUNKCJA pytania.** Pytanie atomowe różnicuje (uczy, na czym student się potyka). Pytanie egzaminacyjne potwierdza (czy koncept jest opanowany). Pięć różnic operacyjnych, których trzyma się ten bank:

| Wymiar | Pytanie ATOMOWE (różnicujące) | Pytanie EGZAMINACYJNE (potwierdzające) — ten bank |
|---|---|---|
| **Liczba konceptów** | bywa wielopoziomowe (np. atom F1.5-P3: `print(cena - 20 <= budzet)` — najpierw arytmetyka, potem porównanie; dwa kroki) | **jeden koncept, jeden krok.** Q10–Q12 pytają wyłącznie o porównanie, bez arytmetyki po drodze |
| **Scenariusz** | nowy, transferowy (student musi przenieść regułę na nieznany przykład) | **blisko worked example** — rozpoznawalny, nie zaskakuje kontekstem |
| **Dystraktory** | „prawie-poprawne" pułapki (atom F1.1-P2: `"12.5"` „Prawie — legalne, ale robi tekst") | **wyraźnie błędne dla kogoś, kto opanował regułę** — żaden dystraktor nie wymaga drugiego kroku rozumowania, by go odrzucić |
| **Feedback** | pełna diagnostyka per opcja (uczy) | **kondensat: jedno zdanie + wskazanie atomu**; ciężar remediacji niosą correctives (D3, M14) |
| **Cel pomiaru** | znaleźć luki, sprowokować produktywny błąd | potwierdzić mastery; docelowy success rate mistrza konceptu ~92–95% |

**Znakowanie w tym dokumencie.** Każde pytanie ma linię `Kalibracja:` mówiącą wprost, dlaczego jest egzaminacyjne (centralne + jednoznaczne + dystraktory wyraźnie błędne), oraz linię `Feedback studenta (D3):` z kondensatem, który realnie zobaczy student. Pełna diagnoza per dystraktor niżej jest materiałem ŹRÓDŁOWYM (dla QG i correctives), nie widokiem studenta.

---

## 4. Koncepty modułu + pokrycie

5 konceptów F1 (z „Zasad modułu F1" w atomy-doc i z `curriculum_item_concepts`). Cztery są KLUCZOWE (tagowane pod spacing spiralny D6.3), f-string jest zwykły. Egzamin pokrywa KAŻDY konceptem ≥1 pytania; rozkład równomierny 3/koncept.

| Koncept | Atom-źródło | Rola | Pytania egzaminu | Liczba |
|---|---|---|---|---|
| `typ-wartosci` | F1.1 | kluczowy | E1, E2, E3 | 3 |
| `wyrazenie-obliczenie` | F1.2 | kluczowy | E4, E5, E6 | 3 |
| `f-string-budowanie-tekstu` | F1.3 | zwykły | E7, E8, E9 | 3 |
| `porownanie-bool` | F1.5 | kluczowy | E10, E11, E12 | 3 |
| `decyzja-if-else` | F1.6 | kluczowy | E13, E14, E15 | 3 |

**Audyt pojemności (D10):** koncepty rubryki F1 = {te 5} MINUS koncepty pokryte atomami drabiny {te 5} = **0**. Bilans zerowy — egzamin nie pyta o nic, czego atom nie uczył. F1.4 i F1.7 (laby) ćwiczą złożenie konceptów w program; egzamin sprawdza koncepty pojedynczo — dlatego brak osobnego „pytania labowego" w banku jest zamierzony (lab bramkuje wykonaniem, nie MC).

---

## 5. Correctives — mapa błędne pytanie → koncept → atomy (≤3)

Po 2. oblaniu egzaminu, per BŁĘDNE pytanie, student dostaje paczkę ≤3 atomów przez `curriculum_item_concepts` (D3, M14). Primary = atom konceptu; dokładam prerekwizyt, gdy błąd zwykle leży u źródła (decyzja DYDAKTYCZNA — mój styk, nie kod).

| Koncept pytania | Atomy correctives (≤3) | Uzasadnienie prerekwizytu |
|---|---|---|
| `typ-wartosci` | F1.1 | koncept źródłowy, bez prerekwizytu |
| `wyrazenie-obliczenie` | F1.2, F1.1 | „kropka w wyniku `/`" to typ `float` — potknięcie często siedzi w typach |
| `f-string-budowanie-tekstu` | F1.3, F1.1 | `TypeError` przy `"tekst" + liczba` i legalność klamry wynikają z typów |
| `porownanie-bool` | F1.5, F1.1 | `"7" == 7` i rola cudzysłowu przy nazwie wracają do typów |
| `decyzja-if-else` | F1.6, F1.5 | `if` ZUŻYWA wynik porównania — oblany if/else zwykle ma źródło w `bool` |

Mikrocopy po oblaniu (D3, wzorzec „nie lista braków"): *„Zabrakło Ci 1 pytania do zaliczenia — 2 koncepty do odświeżenia, ~15 min."* Każdy koncept ma niepusty atom → correctives nigdy nie zwrócą pustej paczki (R2 planu spełnione).

**Semantyka N i M mikrocopy (rozstrzygnięcie not Leo P4 nr 2 i 3 — decyzja dydaktyczna, wiąże Engineering P4):**

- **N = liczba pytań DO ZALICZENIA, nie liczba błędów.** N = `errorCount − maxErrors` (dystans do progu), a nie surowe `errorCount`. Uzasadnienie: „zabrakło Ci" znaczy „byłeś tyle poniżej progu". Przy `maxErrors=1` minimalne oblanie to `errorCount=2` → `2 − 1 = 1` → „zabrakło Ci **1** pytania do zaliczenia" (jedna poprawna odpowiedź więcej i przechodzisz). Człon „**do zaliczenia**" jest OBOWIĄZKOWY — bez niego „zabrakło Ci N pytań" myli się z „masz N błędów". To motywujące, prawdziwe brzmienie dla bramki formującej. **Nota dla Engineering:** P4 liczy N = `errorCount − maxErrors`, nie `errorCount`.
- **M = liczba RÓŻNYCH konceptów wśród błędnych pytań** (deduplikacja po koncepcie), niezależna od N. Przy 2 błędnych pytaniach z 2 różnych konceptów → M=2. Dwa błędy w tym samym koncepcie → M=1 (jedna paczka correctives). **M liczy WSZYSTKIE oblane koncepty** — potwierdzam odczyt Leo (nota 2): uczciwie „koncepty do odświeżenia" niezależnie od tego, czy koncept ma atom `theory`/`exercise`, czy tylko lab. Jest to bezpieczne, bo rozstrzygnięcie noty 1 (§5a) gwarantuje, że KAŻDY policzony koncept renderuje coś do odświeżenia (atom, lab albo statyczna „Pierwsza pomoc") — paczka nigdy nie jest pusta, więc M nigdy nie obiecuje lekcji, której nie ma. Dla F1 rozróżnienie jest bezprzedmiotowe: wszystkie 5 konceptów ma atom `exercise` (§4).

---

## 5a. Rozstrzygnięcie 4 not produktowych z review Leo P4

Leo (Tech Lead) w review plasterka P4 (retry + correctives) podniósł 4 kwestie, które są decyzjami DYDAKTYCZNYMI (mój styk), nie technicznymi. Rozstrzygam z uzasadnieniem; noty 1–3 wiążą Engineering/Milę, nota 4 to potwierdzenie pokrycia.

**Nota 1 — render konceptu BEZ atomu `theory`/`exercise` (R2) → decyzja dla Mili (P5).**
Correctives mapują błędne pytanie → koncept → atomy. Może się zdarzyć (w innych modułach, NIE w F1), że koncept ma tylko lab albo — teoretycznie — zero atomów. Rozstrzygnięcie, trzystopniowe:
1. **Koncept z atomem `theory`/`exercise`** → karta(y) atomu, jak dziś. (F1: zawsze ta ścieżka.)
2. **Koncept pokryty tylko labem** → correctives wskazują **lab** jako cel odświeżenia („wróć do labu X — ćwiczy ten koncept"). Ponowne przejście labu jest prawomocnym odświeżeniem — decyzja dydaktyczna: lab też jest atomem w `curriculum_item_concepts`.
3. **Koncept bez żadnego atomu** (nie może wystąpić przy bilansie audytu pojemności D10 = 0, egzekwowanym kontrakt-testem treści) → **fallback UI:** statyczna karta „Pierwsza pomoc — F1/Python" (D5a, istnieje per moduł) + jednozdaniowa reguła pozytywna konceptu wstawiona inline. **Nigdy** pusty ekran, **nigdy** CTA do wykładowcy.
   - **Uzasadnienie „bez CTA do człowieka":** mastery gate to bramka FORMUJĄCA, wewnętrzna, maszyna samowystarczalna, ZERO human-in-the-loop (CLAUDE.md §7, v1.13). Wstawienie „poproś wykładowcę" wstrzyknęłoby człowieka w bramkę, która z definicji rządzi się sama — złamałoby ramę produktową. Człowiek wchodzi dopiero przy KREDENCJALE wychodzącym na zewnątrz, czego mastery gate nie jest.
   - **Placeholder odrzucony:** placeholder („wkrótce lekcja") to obietnica bez pokrycia — łamie regułę „nie obiecuj więcej, niż system pokaże".
- **Dla F1: ścieżka 1 dla wszystkich 5 konceptów.** Ścieżki 2/3 to siatka bezpieczeństwa dla F2+/M-*, nie żywy przypadek F1. Mila w P5 buduje wszystkie trzy stany (2/3 jako komponenty-zaślepki gotowe pod przyszłe moduły).

**Nota 2 — semantyka M (koncepty do odświeżenia):** rozstrzygnięta w §5. M = wszystkie różne oblane koncepty (potwierdzam odczyt Leo), bezpiecznie, bo nota 1 gwarantuje render każdego. Bez zmian dla F1.

**Nota 3 — semantyka N (pytania):** rozstrzygnięta w §5. N = `errorCount − maxErrors` = „ile brakło do progu", brzmienie „zabrakło Ci N pytań **do zaliczenia**". NIE surowe `errorCount`. Zmieniam brzmienie mikrocopy (dopisany człon „do zaliczenia") i przekazuję wiążącą notę do P4.

**Nota 4 — pokrycie curriculum F1 (potwierdzenie).** Każdy z 5 konceptów F1 ma ≥1 atom `theory`/`exercise` w drabinie, więc correctives zawsze mają dokąd wracać:

| Koncept | Atom-źródło | Typ pozycji | Pokrycie |
|---|---|---|---|
| `typ-wartosci` | F1.1 | `exercise` | ✓ |
| `wyrazenie-obliczenie` | F1.2 | `exercise` | ✓ |
| `f-string-budowanie-tekstu` | F1.3 | `exercise` | ✓ |
| `porownanie-bool` | F1.5 | `exercise` | ✓ |
| `decyzja-if-else` | F1.6 | `exercise` | ✓ |

Zweryfikowane w `docs/curation/sophia-1e2-f1-atomy.md`: 5 atomów `exercise` (F1.1/F1.2/F1.3/F1.5/F1.6) + 2 laby (F1.4, F1.7). Slug-i konceptów zgodne 1:1 z „Zasadami modułu F1" (l.38–41 tamtego dokumentu) i z `curriculum_item_concepts`. Laby F1.4/F1.7 tylko SKŁADAJĄ istniejące koncepty (typy+wyrażenia+f-string; decyzja) — żadnego sierocego konceptu bez atomu. Audyt pojemności D10 = 0. **Pokrycie F1: KOMPLETNE — brak luki.**

---

## 6. Bank pytań egzaminacyjnych F1 (E1–E15)

Format wpisu: **wariant A** i **wariant B** (izomorficzne — cap 2); cztery opcje, **pogrubiona** poprawna; po opcjach diagnoza każdego dystraktora (materiał źródłowy); `→ koncept → atom` (steruje correctives); `Kalibracja:` (dlaczego egzaminacyjne — R1); `Feedback studenta (D3):` (kondensat widoku studenta). **Wszystkie wyniki wykonane w Pythonie 2026-07-24** — tabela weryfikacji w bramie T3/T4 (§7).

### Koncept `typ-wartosci` (F1.1) — E1–E3

**E1.** Rozpoznanie typu liczby (kropka bez cudzysłowu = `float`; goła całkowita = `int`).
- **A. Jaki typ ma wartość `19.99`?** — `int` / **`float`** / `str` / „Python zdecyduje później"
  - `int` — *błędne: `int` nie ma części ułamkowej; kropka w `19.99` przesądza `float`.*
  - `str` — *błędne: `str` wymaga cudzysłowu, tu go nie ma.*
  - „Python zdecyduje później" — *błędne: typ znany od razu z zapisu, nic nie czeka na „użycie".*
- **B. Jaki typ ma wartość `200`?** — **`int`** / `float` / `str` / „Python zdecyduje później"
  - `float` — *błędne: brak kropki = brak części ułamkowej = `int`.* `str` — *błędne: brak cudzysłowu.* „później" — *błędne jak w A.*
- → `typ-wartosci` → F1.1
- **Kalibracja:** jeden koncept (reguła zapisu → typ), scenariusz = pojedyncza wartość jak w WE, dystraktory wyraźnie błędne po jednej regule. Egzaminacyjne, nie atomowe.
- **Feedback studenta (D3):** „Kropka bez cudzysłowu to `float`, goła liczba całkowita to `int`. Odśwież: atom F1.1."

**E2.** Cudzysłów wygrywa (wszystko w cudzysłowie to `str`, nawet gdy wygląda jak liczba).
- **A. Jaki typ ma wartość `"42"`?** — `int` / `float` / **`str`** / `bool`
  - `int` — *błędne: cudzysłów robi tekst, choć w środku są cyfry.* `float` — *błędne: brak znaczenia ma kropka, gdy jest cudzysłów.* `bool` — *błędne: `bool` to `True`/`False`, nie tekst.*
- **B. Jaki typ ma wartość `"2.5"`?** — `int` / `float` / **`str`** / `bool`
  - `float` — *błędne: cudzysłów wygrywa z kropką — to tekst.* `int` — *błędne jak w A.* `bool` — *błędne jak w A.*
- → `typ-wartosci` → F1.1
- **Kalibracja:** centralna reguła „cudzysłów = tekst"; `"2.5"` to klasyczny near-miss, ale dla kogoś, kto opanował regułę, jednoznacznie `str` — nie wymaga drugiego kroku rozumowania.
- **Feedback studenta (D3):** „Cokolwiek jest w cudzysłowie, jest tekstem (`str`). Odśwież: atom F1.1."

**E3.** Poprawny zapis liczby ułamkowej (kropka dziesiętna, bez cudzysłowu, bez jednostki).
- **A. Który zapis tworzy liczbę z ułamkiem pod nazwą `waga`?** — `waga = 3,5` / `waga = "3.5"` / **`waga = 3.5`** / `waga = 3.5 kg`
  - `waga = 3,5` — *błędne: przecinek nie łączy w liczbę — Python czyta to jako dwie rzeczy (krotkę `(3, 5)`); część ułamkową oddziela KROPKA.*
  - `waga = "3.5"` — *błędne: cudzysłów robi TEKST, nie liczbę do obliczeń.*
  - `waga = 3.5 kg` — *błędne: jednostka po liczbie łamie składnię (`SyntaxError`); jednostkę trzymaj w nazwie lub tekście.*
- **B. Który zapis tworzy liczbę z ułamkiem pod nazwą `cena`?** — `cena = 7,25` / `cena = "7.25"` / **`cena = 7.25`** / `cena = 7.25 zł`
  - analogicznie: przecinek → krotka; cudzysłów → tekst; jednostka → `SyntaxError`.
- → `typ-wartosci` → F1.1
- **Kalibracja:** produkcja poprawnego zapisu (nie tylko rozpoznanie); trzy dystraktory to trzy różne, jednoznaczne błędy zapisu — brak pułapki wielopoziomowej.
- **Feedback studenta (D3):** „Liczba ułamkowa: kropka, bez cudzysłowu, bez jednostki. Odśwież: atom F1.1."

### Koncept `wyrazenie-obliczenie` (F1.2) — E4–E6

**E4.** Pierwszeństwo działań (mnożenie/dzielenie przed dodawaniem/odejmowaniem).
- **A. Co wypisze `print(2 + 3 * 4)`?** — `20` / **`14`** / `24` / `SyntaxError`
  - `20` — *błędne: to wynik `(2 + 3) * 4`, ale nawiasu nie ma; `*` idzie pierwsze: `2 + 12`.*
  - `24` — *błędne: to `(2 + 3) * 4` policzone całkiem inaczej; kolejność działań mówi `3 * 4` najpierw.*
  - `SyntaxError` — *błędne: dwa działania w linii są legalne, Python zna ich kolejność.*
- **B. Co wypisze `print(10 - 2 * 3)`?** — `24` / **`4`** / `16` / `SyntaxError`
  - `24` — *błędne: `(10 - 2) * 3`, nie ta kolejność.* `16` — *błędne: mieszanka.* `SyntaxError` — *błędne jak w A.*
- → `wyrazenie-obliczenie` → F1.2
- **Kalibracja:** jedna reguła (pierwszeństwo), liczby małe, wynik całkowity — bez „niespodzianki float" (osobno w E6), by pytanie mierzyło TYLKO kolejność.
- **Feedback studenta (D3):** „Mnożenie i dzielenie idą przed dodawaniem. Odśwież: atom F1.2."

**E5.** Nawias wygrywa ze wszystkim.
- **A. Co wypisze `print((2 + 3) * 4)`?** — **`20`** / `14` / `11` / `SyntaxError`
  - `14` — *błędne: to wynik BEZ nawiasu (`2 + 3*4`); nawias wymusza sumę najpierw: `5 * 4`.*
  - `11` — *błędne: żadna kolejność działań tu tego nie daje.*
  - `SyntaxError` — *błędne: nawiasy są poprawne i domknięte.*
- **B. Co wypisze `print((10 - 2) * 3)`?** — `4` / **`24`** / `28` / `SyntaxError`
  - `4` — *błędne: to wynik bez nawiasu (`10 - 2*3`).* `28` — *błędne: mieszanka.* `SyntaxError` — *błędne jak w A.*
- → `wyrazenie-obliczenie` → F1.2
- **Kalibracja:** ta sama liczba wejściowa co E4, ale z nawiasem — potwierdza, że student widzi, iż nawias ZMIENIA sens; dystraktor `14`/`4` to wynik bez nawiasu, wyraźnie błędny tu.
- **Feedback studenta (D3):** „Nawias liczy się przed wszystkim. Odśwież: atom F1.2."

**E6.** Dzielenie `/` zawsze daje `float` (wynik z kropką, nawet „okrągły").
- **A. Co wypisze `print(9 / 3)`?** — `3` / **`3.0`** / `ZeroDivisionError` / `"9/3"`
  - `3` — *błędne: `/` zawsze daje kropkę, nawet gdy wynik równy; to `3.0`.*
  - `ZeroDivisionError` — *błędne: dzielnik to 3, nie 0 — nic nie wybucha.*
  - `"9/3"` — *błędne: Python liczy wyrażenie, nie wypisuje go jako tekst.*
- **B. Co wypisze `print(8 / 2)`?** — `4` / **`4.0`** / `ZeroDivisionError` / `"8/2"`
  - `4` — *błędne: `/` daje `4.0`.* `ZeroDivisionError` — *błędne: dzielnik 2.* `"8/2"` — *błędne jak w A.*
- → `wyrazenie-obliczenie` → F1.2
- **Kalibracja:** jedna reguła („`/` daje float"); dystraktor `3`/`4` to najczęstsze potknięcie, ale wyraźnie błędne po regule. `ZeroDivisionError` obecny jako opcja, lecz NIE wyzwolony (dzielnik ≠ 0) — nie jest pułapką, jest jawnie fałszywy.
- **Feedback studenta (D3):** „Dzielenie `/` zawsze daje liczbę z kropką (`float`). Odśwież: atom F1.2."

### Koncept `f-string-budowanie-tekstu` (F1.3) — E7–E9

**E7.** f-string podmienia klamrę na wartość (litera `f` + klamra `{}`).
- **A. `miasto = "Gdańsk"`. Co wypisze `print(f"Mieszkam w {miasto}")`?** — `Mieszkam w {miasto}` / **`Mieszkam w Gdańsk`** / `Mieszkam w miasto` / `SyntaxError`
  - `Mieszkam w {miasto}` — *błędne: to wynik BEZ `f`; tu `f` jest, więc klamra się podmienia.*
  - `Mieszkam w miasto` — *błędne: podmienia się WARTOŚĆ zmiennej, nie jej nazwa jako słowo.*
  - `SyntaxError` — *błędne: poprawny f-string.*
- **B. `kolor = "zielony"`. Co wypisze `print(f"Lubię {kolor}")`?** — `Lubię {kolor}` / **`Lubię zielony`** / `Lubię kolor` / `SyntaxError`
  - analogicznie: bez-`f` / nazwa-jako-słowo / błąd.
- → `f-string-budowanie-tekstu` → F1.3
- **Kalibracja:** rdzeń konceptu (podmiana), scenariusz identyczny z WE; dystraktory to trzy jawne warianty niezrozumienia, każdy odrzucalny jedną regułą „f + klamra = wartość".
- **Feedback studenta (D3):** „`f` przed cudzysłowem + klamra `{}` = wartość zmiennej wchodzi w tekst. Odśwież: atom F1.3."

**E8.** Bez litery `f` klamra zostaje w wyniku dosłownie.
- **A. `a = 5`. Co wypisze `print("Wynik: {a}")` (bez `f`)?** — `Wynik: 5` / **`Wynik: {a}`** / `Wynik: a` / `SyntaxError`
  - `Wynik: 5` — *błędne: podmiana działa TYLKO w f-stringu; bez `f` nic się nie podmienia.*
  - `Wynik: a` — *błędne: nic nie „odklamrowuje" nazwy — klamry zostają razem z nazwą.*
  - `SyntaxError` — *błędne: to legalny (choć pewnie niezamierzony) zwykły tekst.*
- **B. `lat = 30`. Co wypisze `print("Mam {lat} lat")` (bez `f`)?** — `Mam 30 lat` / **`Mam {lat} lat`** / `Mam lat lat` / `SyntaxError`
  - analogicznie: podmiana-bez-f / odklamrowanie / błąd.
- → `f-string-budowanie-tekstu` → F1.3
- **Kalibracja:** lustro E7 — potwierdza, że student wie, iż to `f` włącza podmianę (a nie same klamry). Jeden koncept, jednoznacznie.
- **Feedback studenta (D3):** „Bez `f` klamry to zwykłe znaki — zostają w wyniku. Odśwież: atom F1.3."

**E9.** W klamrze może stać wyrażenie — Python najpierw je LICZY, potem wstawia wynik.
- **A. Co wypisze `print(f"Suma: {2 + 3}")`?** — `Suma: {2 + 3}` / `Suma: 2 + 3` / **`Suma: 5`** / `TypeError`
  - `Suma: {2 + 3}` — *błędne: `f` jest, więc klamra się podmienia (nie zostaje dosłownie).*
  - `Suma: 2 + 3` — *błędne: klamra nie wkleja wyrażenia jako tekst — najpierw je liczy.*
  - `TypeError` — *błędne: f-string legalnie wstawia liczbę do tekstu; `TypeError` groziłby sklejaniu plusem.*
- **B. Co wypisze `print(f"Iloczyn: {4 * 5}")`?** — `Iloczyn: {4 * 5}` / `Iloczyn: 4 * 5` / **`Iloczyn: 20`** / `TypeError`
  - analogicznie: dosłowna-klamra / wyrażenie-jako-tekst / błąd.
- → `f-string-budowanie-tekstu` → F1.3
- **Kalibracja:** łączy f-string z „Python liczy wyrażenie", ale to JEDEN krok w kontekście f-stringa (nie łańcuch); scenariusz prosty (`2 + 3`), dystraktory jawne.
- **Feedback studenta (D3):** „W klamrze Python najpierw liczy, potem wstawia wynik. Odśwież: atom F1.3."

### Koncept `porownanie-bool` (F1.5) — E10–E12

**E10.** Porównanie zwraca `True`/`False` (typ `bool`).
- **A. Co wypisze `print(7 > 10)`?** — `True` / **`False`** / `7` / `SyntaxError`
  - `True` — *błędne: 7 NIE jest większe od 10.*
  - `7` — *błędne: porównanie zwraca wartość logiczną, nie jedną z porównywanych liczb.*
  - `SyntaxError` — *błędne: `>` w `print` jest legalne.*
- **B. Co wypisze `print(5 < 2)`?** — `True` / **`False`** / `5` / `SyntaxError`
  - `True` — *błędne: 5 nie jest mniejsze od 2.* `5` — *błędne jak w A.* `SyntaxError` — *błędne jak w A.*
- → `porownanie-bool` → F1.5
- **Kalibracja:** rdzeń (porównanie → `bool`); TYLKO porównanie, bez arytmetyki po lewej (odróżnienie od atomowego F1.5-P3, które łączyło `65 - 20 <= 50`). To jest ta różnica atomowe↔egzaminacyjne w praktyce.
- **Feedback studenta (D3):** „Porównanie zwraca `True` albo `False`. Odśwież: atom F1.5."

**E11.** `==` PYTA (nie zmienia), `=` przypisuje.
- **A. Który zapis PYTA, czy `stan` równa się 5 — nie zmieniając go?** — `stan = 5` / **`stan == 5`** / `stan != 5` / `"stan" == 5`
  - `stan = 5` — *błędne: jeden znak PRZYPISZE — nadpisze `stan` na 5, zamiast zapytać.*
  - `stan != 5` — *błędne: `!=` pyta „RÓŻNE?", odwrotnie niż „równe".*
  - `"stan" == 5` — *błędne: cudzysłów porównuje słowo „stan" z liczbą (zawsze `False`), zamiast zajrzeć do zmiennej.*
- **B. Który zapis PYTA, czy `poziom` równa się 3 — nie zmieniając go?** — `poziom = 3` / **`poziom == 3`** / `poziom != 3` / `"poziom" == 3`
  - analogicznie: przypisanie / negacja / cudzysłów odbiera rolę zmiennej.
- → `porownanie-bool` → F1.5
- **Kalibracja:** najważniejsza pułapka konceptu (`==` vs `=`) postawiona wprost jako WYBÓR zapisu; każdy dystraktor to jeden jednoznaczny błąd, nie stopniowana pułapka.
- **Feedback studenta (D3):** „Dwa znaki `==` pytają, jeden znak `=` przypisuje. Odśwież: atom F1.5."

**E12.** `!=` czyta się „różne od".
- **A. `x = 10`. Co wypisze `print(x != 10)`?** — `True` / **`False`** / `10` / `SyntaxError`
  - `True` — *błędne: 10 NIE różni się od 10, więc „różne?" to `False`.*
  - `10` — *błędne: wynik to wartość logiczna, nie liczba.*
  - `SyntaxError` — *błędne: `!=` legalne.*
- **B. `y = 4`. Co wypisze `print(y != 7)`?** — **`True`** / `False` / `4` / `SyntaxError`
  - `False` — *błędne: 4 różni się od 7, więc `True`.* `4` — *błędne jak w A.* `SyntaxError` — *błędne jak w A.*
- → `porownanie-bool` → F1.5
- **Kalibracja:** dopełnia parę `==`/`!=`; wariant A daje `False`, B daje `True` — chroni przed zgadywaniem „zawsze True/False". Jeden koncept.
- **Feedback studenta (D3):** „`!=` znaczy „różne od" — `True`, gdy wartości się nie zgadzają. Odśwież: atom F1.5."

### Koncept `decyzja-if-else` (F1.6) — E13–E15

**E13.** `if`/`else` wybiera JEDNĄ gałąź (gałęzie się wykluczają).
- **A. `if 8 > 5:` → (wcięte) `print("duże")`; `else:` → (wcięte) `print("małe")`. Co się wypisze?** — **`duże`** / `małe` / `duże` i `małe` / nic
  - `małe` — *błędne: warunek `8 > 5` to `True`, więc gałąź `if`, nie `else`.*
  - `duże` i `małe` — *błędne: gałęzie się WYKLUCZAJĄ; nigdy obie.*
  - nic — *błędne: dokładnie jedna gałąź zawsze się wykona.*
- **B. ten sam program z `if 3 > 5:`** — `duże` / **`małe`** / `duże` i `małe` / nic
  - `duże` — *błędne: `3 > 5` to `False` → gałąź `else`.* reszta jak w A.
- → `decyzja-if-else` → F1.6
- **Kalibracja:** rdzeń (wybór gałęzi wg warunku); warunek stałą liczbą (`8 > 5`), bez zmiennych i arytmetyki, by mierzyć TYLKO wybór gałęzi.
- **Feedback studenta (D3):** „`if`/`else` wybiera dokładnie jedną gałąź — wg tego, czy warunek jest `True`. Odśwież: atom F1.6."

**E14.** Dwukropek jest składnią, nie ozdobą.
- **A. Linia `if x > 0` bez dwukropka na końcu, pod nią wcięty `print`. Co zrobi Python?** — zadziała normalnie / **zatrzyma się z `SyntaxError`** / wykona obie gałęzie / zapyta o dwukropek
  - zadziała normalnie — *błędne: brak `:` = kod nie startuje.*
  - wykona obie gałęzie — *błędne: kod z błędem składni nie wykonuje się wcale.*
  - zapyta o dwukropek — *błędne: Python nie dopytuje — zatrzymuje się komunikatem (`SyntaxError: expected ':'`).*
- **B. Linia `else` bez dwukropka na końcu. Co zrobi Python?** — zadziała normalnie / **zatrzyma się z `SyntaxError`** / pominie gałąź `else` / zapyta o dwukropek
  - analogicznie; „pominie else" — *błędne: to nie cichy skip, to `SyntaxError` przed startem.*
- → `decyzja-if-else` → F1.6
- **Kalibracja:** jedna reguła składniowa; poprawna odpowiedź to KLASA błędu (`SyntaxError`) — zweryfikowana empirycznie (§7), komunikat `expected ':'` zgodny z silnikiem studenta.
- **Feedback studenta (D3):** „Nagłówek `if`/`else` kończy się dwukropkiem — bez niego `SyntaxError`. Odśwież: atom F1.6."

**E15.** `else` jest opcjonalne (samo `if` przy `False` = „nic dodatkowego").
- **A. `if punkty >= 50:` → (wcięte) `print("Zdane")` — bez `else`. Warunek wychodzi `False`. Co się stanie?** — wypisze „Zdane" / błąd — brak `else` / **nic z gałęzi; program idzie dalej** / wypisze „False"
  - wypisze „Zdane" — *błędne: warunek `False`, gałąź `if` się nie wykonuje.*
  - błąd — brak `else` — *błędne: samo `if` jest w pełni legalne.*
  - wypisze „False" — *błędne: `if` ZUŻYWA wynik warunku do wyboru, sam niczego nie wypisuje.*
- **B. ten sam fragment, warunek wychodzi `True`. Co się stanie?** — **wypisze „Zdane" i idzie dalej** / błąd — brak `else` / nic / wypisze „True"
  - błąd — brak `else` — *błędne jak w A.* nic — *błędne: `True` → gałąź `if` się wykonuje.* wypisze „True" — *błędne jak w A.*
- → `decyzja-if-else` → F1.6
- **Kalibracja:** dopełnia if/else o przypadek bez `else`; para wariantów (False→nic, True→Zdane) chroni przed zgadywaniem. Jeden koncept.
- **Feedback studenta (D3):** „`else` jest opcjonalne: bez niego przy `False` program po prostu idzie dalej. Odśwież: atom F1.6."

---

## 7. Brama przed oddaniem treści — część A (T1–T5, pass/fail)

Bramka z `skills/product/tresci-edukacyjne.md`. Dopóki część A nie przejdzie czysto — nie oddaję.

### T1 — źródło i determinizm

| Kontrola | Stan | Nota |
|---|---|---|
| Poprawki w `docs/curation/*.md`, nie w JSON | **PASS** | Ten plik jest jedynym źródłem pytań egzaminu F1. JSON egzaminacyjny NIE ISTNIEJE — packing pytań egzaminacyjnych to plasterek P3 (Engineering, Ethan), z osobną gałęzią `ITEM_KINDS += "exam"` (P1). Ręcznej edycji artefaktu nie ma, bo artefaktu nie ma. |
| Kontrakt-test determinizmu 2× zielony | **N/A na tym etapie** | Uruchamiany przy repacku w P3. Deklaruję wymóg dla Engineering: po wpięciu banku packer musi odtwarzać JSON 1:1 dwukrotnie. |

Werdykt T1: **PASS w zakresie odpowiedzialności Sophii** (źródło = markdown, determinizm domknie P3).

### T2 — czystość widoku studenta

Widok studenta = treść pytania + 4 opcje + `Feedback studenta (D3)`. Diagnozy per dystraktor, linie `Kalibracja:`, `→ koncept → atom` i cała sekcja §3–§5/§7–§8 to **materiał źródłowy/meta** — NIE trafiają do `contentMd` (packer bierze wyłącznie treść pytania, opcje i kondensat feedbacku; mapowanie pól = P3). Grep po znacznikach meta w treści pytań i opcjach (nie w diagnozach): „errata"/„QG"/„WAŻN"/„KRYT"/„INFO"/„TODO"/„nota"/„poprawione po" — **0 trafień w treści pytań i opcjach**. **PASS.**

### T3 — liczby/wyniki policzone

Każdy wynik cytowany w banku wykonany w Pythonie 2026-07-24 (uruchomienia w logu §9). Tabela weryfikacji:

| Pytanie | Wyrażenie | Wynik zacytowany | Weryfikacja |
|---|---|---|---|
| E1 A/B | `type(19.99)`, `type(200)` | `float`, `int` | wykonane: `<class 'float'>`, `<class 'int'>` |
| E2 A/B | `type("42")`, `type("2.5")` | `str`, `str` | wykonane: `<class 'str'>` ×2 |
| E3 A/B | zapisy `3.5`/`7.25` + dystraktory | float; `3,5`→krotka; `"3.5"`→str; `3.5 kg`→SyntaxError | wykonane: `(3,5)` to `tuple`; `'3.5'` to `str`; `3.5 kg` → `SyntaxError` |
| E4 A/B | `2 + 3 * 4`, `10 - 2 * 3` | `14`, `4` | wykonane |
| E5 A/B | `(2 + 3) * 4`, `(10 - 2) * 3` | `20`, `24` | wykonane |
| E6 A/B | `9 / 3`, `8 / 2` | `3.0`, `4.0` | wykonane |
| E7 A/B | f-string podmiana | `Mieszkam w Gdańsk`, `Lubię zielony` | wykonane |
| E8 A/B | brak `f` | `Wynik: {a}`, `Mam {lat} lat` | wykonane |
| E9 A/B | wyrażenie w klamrze | `Suma: 5`, `Iloczyn: 20` | wykonane |
| E10 A/B | `7 > 10`, `5 < 2` | `False`, `False` | wykonane |
| E11 A/B | dystraktor `"stan" == 5` | `False` | wykonane |
| E12 A/B | `x != 10` (10), `y != 7` (4) | `False`, `True` | wykonane |
| E13 A/B | if/else wybór | `duże`, `małe` | wykonane |
| E15 A/B | if bez else | (False) nic + dalej; (True) `Zdane` + dalej | wykonane |

**PASS** — zero liczb/wyników oszacowanych „z pamięci".

### T4 — błędy zapowiedziane i placeholdery

- **Klasa błędu jako poprawna odpowiedź:** tylko E14 (`SyntaxError` przy braku dwukropka). Wykonane empirycznie: `if x > 0` bez `:` → `SyntaxError: expected ':'`; `else` bez `:` → `SyntaxError: expected ':'`. Komunikat `expected ':'` stabilny od Pythona 3.10 → zgodny z silnikiem studenta (Colab 3.11/3.12); dodatkowo zacytowany już w atomy-doc F1 zweryfikowanym 2026-07-11.
- **Klasa błędu jako DYSTRAKTOR (nie wyzwolona):** `ZeroDivisionError` w E6 (dzielnik ≠ 0 — nie pada), `TypeError` w E9 (f-string legalny — nie pada), `SyntaxError` w E4/E5/E7/E8/E10/E12 (kod legalny — nie pada). Każda sprawdzona: opcja jest jawnie fałszywa, nie „prawie-poprawna pułapka".
- **Placeholdery:** trzy podkreślenia z rzędu — **0 wystąpień w treści pytań, opcjach, feedbackach i diagnozach** (bank egzaminacyjny nie ma luk do uzupełniania — to pytania MC; jedyne literalne wystąpienie tego wzorca w pliku to niniejszy opis kontroli T4, poza widokiem studenta). Żaden string w kodzie pytań nie zawiera polskiego cudzysłowu `„…"` ani polskiego cudzysłowu wewnątrz `"…"` — sprawdzone: wszystkie kody-spany (`"stan" == 5`, `print("Zdane")`) używają prostych cudzysłowów, polskie `„…"` występują wyłącznie w prozie diagnoz.

**PASS.**

### T5 — cudze UI

Bank F1 nie cytuje żadnej etykiety cudzego interfejsu (Colab/GitHub/przeglądarka) — pytania to czysty Python. **N/A → PASS** (brak cytatu etykiety = brak wymogu zrzutu).

**WERDYKT CZĘŚCI A: PASS** (T1 pass w zakresie Sophii, T2/T3/T4 pass, T5 N/A). Dopiero teraz część B.

---

## 8. Brama część B — self-critique (5 słabości + poprawki)

Rola: najsurowszy autor egzaminów kompetencyjnych po launchu, w którym mastery gate masowo oblewał na 1. podejściu i studenci porzucili ścieżkę na module 1. Pięć słabości pierwszej wersji, poprawki wcielone:

1. **SŁABOŚĆ — dystraktor „prawie-poprawny" przemycony z atomu (`"2.5"`/`"3.5"` jako `str`).** W E2/E3 użyłam near-missów, które w atomy-doc niosły framing „Prawie — legalne, ale…". Dla egzaminu to zapach różnicowania, nie potwierdzania.
   **POPRAWKA:** przeredagowałam diagnozy z „prawie" na „**błędne**: cudzysłów wygrywa" — jednoznacznie, bez sugestii częściowej racji. Dla mistrza konceptu `"2.5"` to `str` bez wahania (jeden krok reguły), więc pytanie ZOSTAJE egzaminacyjne; ale język diagnozy nie może udawać, że to trudny wybór. Zweryfikowane: żaden dystraktor w banku nie wymaga DRUGIEGO kroku rozumowania, by go odrzucić.

2. **SŁABOŚĆ — czy pytania faktycznie POTWIERDZAJĄ, a nie RÓŻNICUJĄ? Test na najtrudniejszym: E11 (`==` vs `=`).** To najczęstsza pułapka konceptu — ryzyko, że działa jak pytanie diagnostyczne (różnicujące słabszych).
   **POPRAWKA:** sprawdziłam każde pytanie kryterium „czy student, który przeczytał atom ze zrozumieniem, odpowie bez wahania?". E11 przechodzi: to WYBÓR zapisu z jawnie opisanym celem („PYTA, nie zmieniając"), nie subtelne odróżnienie dwóch bliskich wyników. Usunęłam z rozważań warianty łączące arytmetykę z porównaniem (były w atomowym F1.5-P3) — w E10/E12 porównanie jest „gołe". To operacyjna realizacja R1: egzamin = jeden krok.

3. **SŁABOŚĆ — pokrycie nierówne wagą, nie liczbą.** 3/koncept to równy ROZKŁAD, ale f-string jest konceptem „zwykłym", a dostał tyle samo pytań co kluczowe `porownanie-bool`. Czy egzamin nie przecenia f-stringa?
   **POPRAWKA:** świadomie zostawiam 3/3/3/3/3. Uzasadnienie dydaktyczne: na egzaminie MASTERY każdy koncept, który atom wprowadził, musi być potwierdzony — „zwykłość" f-stringa dotyczy spacingu spiralnego (D6.3: nie wraca w kolejnych modułach jako pytanie spiralne), nie jego wagi w bramce F1. Równy rozkład = brak martwych stref w pokryciu. Zapisane jako świadoma decyzja, nie przeoczenie.

4. **SŁABOŚĆ — `ZeroDivisionError`/`TypeError`/`SyntaxError` jako dystraktory mogą uczyć błędnego skojarzenia „przy dzieleniu/f-stringu grozi błąd".** Jeśli student zapamięta opcję zamiast reguły, correctives tego nie złapią (feedback egzaminacyjny jest kondensatem).
   **POPRAWKA:** w kondensatach `Feedback studenta (D3)` NIGDY nie ma nazwy błędu-dystraktora — jest wyłącznie reguła pozytywna („`/` zawsze daje kropkę", „f-string legalnie wstawia liczbę"). Nazwa błędu pada tylko tam, gdzie błąd jest POPRAWNĄ odpowiedzią (E14). Diagnozy błędów-dystraktorów zostają w materiale źródłowym (dla QG), nie w widoku studenta. T2 to potwierdza.

5. **SŁABOŚĆ — warianty A/B mogą nie być izomorficzne (różna trudność) i cap 2 wariantów przy retry da niesprawiedliwy 2. rzut.** Jeśli B trudniejszy niż A, retry karze losowo.
   **POPRAWKA:** przeszłam parami. Każda para trzyma tę samą strukturę i klasę liczb: E4 `2+3*4`/`10-2*3` (ta sama forma, wynik jednocyfrowy), E12 celowo A→`False`/B→`True` (symetria, nie eskalacja trudności), E13 A→`True`-branch/B→`False`-branch. Jedyna asymetria świadoma: E1 A pyta o `float`, B o `int` — obie równie proste, dobrane tak, by wariant nie zdradzał odpowiedzi drugiego. Izomorfizm potwierdzony: retry drugim wariantem mierzy ten sam koncept z tą samą trudnością.

**Efekt B:** żadna zmiana nie ruszyła pokrycia ani examConfigJson; zmiany dotyczyły języka diagnoz (1,4), weryfikacji jednokrokowości (2), świadomego uzasadnienia rozkładu (3) i izomorfizmu wariantów (5).

---

## 9. Log QG (2026-07-24) — **QG-GO — gotowe do ingestu**

### 9b. QG ADWERSARYJNY (2026-07-24, Sophia w roli egzaminatora-adwersarza — surowszy niż autor)

- **Re-wykonanie 30 wariantów w DWÓCH silnikach:** wszystkie 15 pytań × oba warianty (A/B) uruchomione w **Pythonie 3.12.4 i 3.14.6** — wyniki **bit-w-bit identyczne, zero driftu wersji**. Skrypt: `qg_f1.py` (scratchpad). Potwierdzone: każda wskazana poprawna odpowiedź faktycznie poprawna; każdy dystraktor faktycznie błędny.
- **Drift wersji (kluczowe ryzyko zadania):** `SyntaxError: expected ':'` (E14, `if`/`else` bez dwukropka) **identyczny w 3.12 i 3.14** — brzmienie stabilne, zgodne z silnikiem studenta (Colab 3.11/3.12). `IndentationError` NIE jest poprawną odpowiedzią żadnego pytania (E14 = `SyntaxError`), więc jego brzmienie nie bramkuje. `/` daje `float` w obu (E6). Żadne pytanie nie zależy od wersji.
- **Dystraktory klasy błędu — potwierdzone niewyzwalane:** `ZeroDivisionError` (E6, dzielnik≠0) i `TypeError` (E9, f-string legalny) NIE padają — jawnie fałszywe, nie pułapki. `3,5`→`tuple`, `"3.5"`→`str`, `3.5 kg`→`SyntaxError` (E3): trzy różne, jednoznaczne błędy.
- **Izomorfizm par A/B:** wszystkie 15 par tej samej struktury i klasy trudności. Pary anty-zgadywaniowe (E12 A→`False`/B→`True`, E13 A→`duże`/B→`małe`, E15 A→nic/B→`Zdane`) chronią przed „zawsze True/False". E10 A/B oba `False` — jedyny „ten sam werdykt", ale retry testuje ten sam koncept z inną liczbą; sprawiedliwość cap-2 zachowana. **Izomorfizm: PASS.**
- **Kalibracja R1 (potwierdzają, nie różnicują):** każde pytanie jeden koncept, jeden krok; żaden dystraktor nie wymaga drugiego kroku rozumowania. Near-missy (`"2.5"`→`str` E2, `3`↔`3.0` E6, `=`↔`==` E11) odrzucalne jedną regułą. **Zero dystraktorów „prawie-poprawnych" wymagających łańcucha.** Kalibracja: PASS.
- **Pokrycie konceptów:** 5 × 3 = 15, równomiernie; każde pytanie tagowane właściwym konceptem pod correctives (§4). PASS.
- **Brama T1–T5:** PASS (§7) — T2 grep 0 znaczników meta w treści pytań; T4 grep 0 `___`, 0 polskich cudzysłowów w code-spanach (trafienia regexu to prose między spanami).
- **WERDYKT QG ADWERSARYJNEGO: GO — 0 KRYT / 0 WAŻN / 0 błędów do poprawy.** Bank finalizowany do v1.0 bez zmian merytorycznych; jedyne edycje v1.0 to doprecyzowanie mikrocopy (nota 3) i dopisanie rozstrzygnięć not (§5a) — treść pytań nietknięta. **Przekazane Engineeringowi (Ethan) do P1/P3: pakowanie + ingest (czerwona linia, po GO).**

### 9a. Przebieg autorstwa (2026-07-24)

- **Samodzielne wykonanie:** wszystkie 15 pytań × oba warianty wykonane w Pythonie 3.14.6 (dev) 2026-07-24; wyniki w tabeli T3. Klasa błędu E14 (`SyntaxError: expected ':'`) potwierdzona dla `if` i `else` bez dwukropka; komunikat zgodny z silnikiem studenta (stabilny od 3.10; Colab 3.11/3.12).
- **Weryfikacja dystraktorów-błędów:** potwierdzono empirycznie, że `ZeroDivisionError` (E6), `TypeError` (E9) i `SyntaxError` (E4/E5/E7/E8) NIE padają dla podanego kodu — są jawnie fałszywe, nie pułapki. `3,5` daje `tuple` (nie liczbę), `"3.5"` daje `str`, `3.5 kg` daje `SyntaxError` — trzy różne, jednoznaczne błędy w E3.
- **Znaleziska autora (wcielone przed oddaniem):** (a) usunięcie framingu „prawie" z dystraktorów E2/E3 — patrz self-critique 1; (b) wyczyszczenie nazw błędów-dystraktorów z kondensatów feedbacku — self-critique 4; (c) potwierdzenie izomorfizmu par A/B — self-critique 5.
- **Świadome limity (bez akcji):** (i) diagnozy per dystraktor są bogatsze niż widok studenta (D3 przewiduje kondensat + atom) — to zamierzone: bogactwo służy QG i correctives, packer bierze kondensat (mapowanie pól = P3); (ii) determinizm packera (T1) i konwencja znakowania „pytanie egzaminacyjne" (R4 planu) domykają się w Engineering P1/P3 — poza moją granicą roli.
- **Do QG (następny krok, poza tym dokumentem):** 2 agentów adwersaryjnych — (1) re-wykonanie 30 wariantów w silniku Colab (nie tylko dev), (2) kontrola, czy żaden dystraktor nie jest poprawny w Pythonie 3.11/3.12 (drift wersji). Dopiero po GO — repack (Engineering) i zgłoszenie do ingestu jako czerwona linia (Darek).

## 10. Nota dla Olivera / Engineering (P1/P3 — haki i decyzje)

- **De-duplikacja (reguła twarda 1 — jedno źródło):** kondensat E1–E15 w `sophia-1e2-f1-atomy.md` (sekcja „Egzamin modułu F1") ma być przy ingeście oznaczony jako PRZENIESIONY tutaj; packer czyta pytania egzaminacyjne F1 WYŁĄCZNIE z tego pliku. Numeracja E1–E15 zgodna 1:1 — bezpieczne zszycie.
- **examConfigJson F1:** `{"questionCount": 15, "maxErrors": 1}` do kolumny `curriculum_modules.examConfigJson` modułu F1 (P1 dostarcza typ + Zod; wypełnienie wartością = przy ingeście treści).
- **Correctives (P4):** mapa §5 — koncept → atomy (≤3). Każdy koncept ma niepusty atom (R2 planu spełnione dla F1).
- **Konwencja „pytanie egzaminacyjne" (R4 planu, OTWARTE):** to pytania kalibrowane osobno — NIE `difficulty=3` z banku atomowego. Rekomendacja treściowa: potrzebują własnego znacznika (nie da się ich odróżnić przez `difficulty`, bo są celowo ŁATWIEJSZE od atomowych, nie trudniejsze). Jeśli Engineering wybierze kolumnę/znacznik zamiast konwencji — dopina się do migracji P2. Decyzja techniczna Ethana; ja sygnalizuję, że `difficulty` tu nie wystarcza.
- **Pokrycie i próg:** 15 pytań, 5 konceptów × 3, ≤1 błąd — spójne z examConfigJson i z widełkami D3.
