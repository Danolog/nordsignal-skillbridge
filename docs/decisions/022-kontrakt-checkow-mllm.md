# ADR-022 — Kontrakt checków dla M-LLM: zakotwiczony wskaźnik halucynacji, trafność per pole i rozdział parse/schema zamiast gołego ułamka

- **Wersja:** v1.1 · 2026-07-24 — **renumeracja 021→022:** numer 021 zajęła równoległa sesja (marketPercentage serwerowe, `docs/decisions/021-market-percentage-serwerowe-zrodlo.md`, scalone na main). Treść bez zmian — wyłącznie numer + referencje.
- **Wersja:** v1.0 · 2026-07-23 — **PROPOZYCJA.** Draft po przeglądzie checków M-LLM
  (`docs/curation/przeglad-checkow-mllm-20260723.md`). Czeka na przegląd domenowy Sophii
  (PO, produkt = sign-off §8 QA `CLAUDE.md`) i finalizację Olivera (COO). Changelog na dole
  nagłówka pojawi się przy finalizacji (wzór ADR-020 v1.0→v1.1).
- **Status:** **PROPOZYCJA** (2026-07-23) — bramka PROJEKTOWA **otwarta**. Podstawa mandatu:
  `CLAUDE.md` v1.11 §5 (projekt kontraktu = decyzja techniczna odwracalna w domenie Engineering,
  bez sign-offu Darka; sam re-ingest na prod to już czerwona linia — patrz §3/§6). Ten dokument
  **nie** buduje pieczątek, **nie** dotyka `m-llm.json` i **nie** rusza produkcji — patrz §5
  (runbook następczy) i §6 (granice).
- **Data:** 2026-07-23 · **Autor:** Ethan (CTO) · **Zlecenie:** Oliver (COO), brief 2026-07-23
  (kontynuacja przeglądu M-LLM).
- **Źródło prawdy payloadów:** liczby ilustracyjne w tym ADR zmierzone wykonaniem na
  8-elementowym zbiorze ilustracyjnym M-LLM (§7), odtwarzającym wartości kontraktowe atomów
  (`zgodnosc`=0.875, `halucynacje_wskaznik`=0.5). **Wiążący jest FINALNY notebook Sophii** —
  builder liczy `expect` z niego, nie z tego dokumentu (jak ADR-020). Kanoniczny zbiór M-LLM
  (8 trójek: tekst, odpowiedź modelu, ground truth) dostarcza i weryfikuje wykonaniem Sophia
  w runbooku §5.
- **Uruchamia:** przegląd `docs/curation/przeglad-checkow-mllm-20260723.md` §2–3 — scaffold
  `m-llm.json` niesie checki `value` na skalarnych odsetkach/licznikach z małej próbki, a
  główny artefakt (trafność per pole) **nie ma żadnej serwerowej kotwicy `value`**. Ten sam
  profil kolizji, który uruchomił ADR-020 dla M-ML — w dwóch miejscach **słabszy niż M-ML**.
- **Wzór formalny:** ADR-020 (kontrakt checków M-ML: struktura z tożsamością zamiast gołego
  skalara, tabela kolizji i rozróżnialności zmierzona wykonaniem, runbook, ryzyka) oraz ADR-017
  (precedens „struktura zamiast gołego skalara" dla SQL.7) i ADR-018 (rygor, słowniczek,
  „egzekwowanie kodem, nie komentarzem").
- **Powiązania:** ADR-015 (kontrakt checków labów: klasy `value`/`relation`/`predicate`, token
  pieczątki, jawne limity — token laba NIE jest kredencjałem; weryfikator
  `src/lib/curriculum/lab-checks.ts`), ADR-020 (siostrzany kontrakt M-ML — buduje się przed
  M-LLM), `CLAUDE.md` §7 (rozdział wagi oceny formującej vs kredencjału).
- **Wykonanie (runbook następczy, NIE ten ADR):** Sophia (kanoniczny zbiór M-LLM + kształt
  danych: dokładnie 4 pola-braki, 1 odpowiedź złamana, 1 parsowalna-ale-niezgodna) — **do
  zrobienia**; builder pieczątek M-LLM (checki z tego kontraktu), Quinn/Eva (kontrakt-test
  regresyjny na cztery błędne drogi + dobra) — **do zrobienia**.

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu, `CLAUDE.md` §3): **check** — maszynowa
> reguła, którą serwer sprawdza po zaliczeniu laba; **pieczątka** (ang. *stamp*) — komórka na
> końcu notebooka, która liczy wynik i wypisuje **token** do wklejenia w SkillBridge; **ładunek**
> (ang. *payload*) — wartości, które token przenosi z sesji studenta do serwera; **ekstrakcja** —
> zamiana tekstu swobodnego (ogłoszenia) na dane (JSON); **ground truth** (prawda odniesienia) —
> ręcznie oznaczona poprawna odpowiedź; **halucynacja** — pole, które w prawdzie jest `null`
> (informacji NIE MA w tekście), a model je wypełnił; **pole-brak** — pole `null` w prawdzie;
> **trafność per pole** — odsetek pól, w których model zgadza się z prawdą, liczony osobno dla
> każdego pola; **zgodność ze schematem** — czy odpowiedź sparsowała się i ma komplet pól; **odsetek**
> (ang. *ratio*) — ułamek 0–1; **licznik / mianownik** — góra i dół ułamka; **parsowanie** —
> `json.loads`: tekst → słownik; **tolerancja float** — porównanie liczb przez `abs(x-y)<0.01`,
> nigdy przez dokładną równość (limit ADR-015 nr 10).

---

## 1. Problem — to jest projektowanie oceny, nie kosmetyka

### 1.1 Defekt w jednym zdaniu

Scaffold `tools/content/curriculum-atoms/m-llm.json` (laby LLM.4, LLM.7) niesie checki `value`
na **skalarnych odsetkach i licznikach z próbki 5–8 elementów** (LLM.4: `zgodne`=4; LLM.7:
`zgodnosc`=0.875, `halucynacje_wskaznik`=0.5), a **główny artefakt rubryki capstone'u — trafność
per pole (30%) — nie ma ani jednego serwerowego checku `value`** (LLM.7 C4/C5/C6 to predykaty:
długość listy, „to liczby", boolean policzony w notebooku). Odsetek na 8 próbkach przyjmuje ~9
możliwych wartości, wskaźnik `2/4` przyjmuje wartość **0.5 — najgęstszą kolizję ze wszystkich**
(1/2, 2/4, 3/6, 4/8), więc kilka różnych dróg lądujących na tej samej liczbie jest tu regułą, nie
wyjątkiem. To ten sam defekt co M-ML (ADR-020) i SQL.7 (ADR-017: goły licznik jako ładunek).

Skutek: student, który dojdzie do właściwej liczby **błędną drogą**, dostaje token — fałszywie
pozytywna **ocena formująca**, która od 2026-06-29 obowiązuje sama (`CLAUDE.md` §7: w warstwie
edukacyjnej werdykt maszyny jest samowystarczalny). Skoro obowiązuje sam, musi być prawdziwy.

### 1.2 M-LLM jest SŁABSZY niż M-ML w dwóch miejscach

M-ML miał jeden dobry instynkt — `macierz`=[1,1,0,4] jako strukturę (ADR-020 §1.2). **M-LLM nie ma
nawet tego**:

1. **`halucynacje_wskaznik`=0.5 — mianownik niezakotwiczony.** Treść LLM.7 deklaruje „prawda
   zawiera **dokładnie 4 pola-braki** — kształt danych jest częścią kontraktu pieczątki", ale
   **żaden check nie sprawdza, że tych pól-braków jest 4**. Ładunek niesie sam ułamek 0.5. M-ML
   swoje skalary kotwiczy przez `macierz`; M-LLM analogicznej kotwicy pod halucynacją **nie ma**.
2. **`trafnosc` — bez serwerowej kotwicy.** Jedyna brama pod trafnością to C6 (`trafnosc_zgodna`,
   `is_true`) — **boolean policzony w notebooku i przyjęty przez serwer na wiarę** (weryfikator
   `lab-checks.ts` linia 178: `passed: v === true`). Serwer nigdy nie przelicza ułamków trafności.
   Ładunek `trafnosc_wartosci=[1,1,1]` + `trafnosc_zgodna=true` przechodzi C4/C5/C6 — **zmierzone
   w §7**. Najważniejszy artefakt modułu nie jest broniony.

### 1.3 Cztery błędne drogi trafiające w ten sam ładunek

Dokładnie potknięcia, przed którymi ostrzega treść M-LLM (LLM.3 „parsuj z ochroną", LLM.5
„trafność per pole, osobny wskaźnik halucynacji", hint LLM.5 „wcięcia! piętra pętli"):

1. **Błąd wcięcia w pętli halucynacji** — student liczy pola-braki i halucynacje tylko dla
   podzbioru pól (typowy błąd zagnieżdżenia `for`/`if`, hint LLM.5 wprost to nazywa) → dostaje
   `1/2` zamiast `2/4`, ale **ułamek ten sam: 0.5**.
2. **Trafność zdegenerowana** — `trafnosc_wartosci=[1.0,1.0,1.0]` (nie policzył nic, wpisał
   jedynki) + `trafnosc_zgodna=true` → przechodzi dzisiejsze C4/C5/C6.
3. **Trafność liczona na wszystkich przypadkach** (nie tylko zgodnych — brak filtra `if rekord
   is not None`) → miesza porażkę parsowania z porażką ekstrakcji, inne ułamki, ale dziś nikt
   ich nie weryfikuje.
4. **`zgodnosc` = odsetek powodzeń parsowania** zamiast zgodności ze schematem — w obecnym
   zbiorze (jedyna porażka to porażka parsowania) **obie metody dają 7/8**, więc student
   pomijający walidację schematu (`all(pole in rekord …)`) jest nieodróżnialny od poprawnego.

### 1.4 Tabela kolizji — zmierzona wykonaniem, nie wywnioskowana

Zweryfikowane na 8-elementowym zbiorze ilustracyjnym (§7; POLA=[stanowisko, miasto,
widelki_min]; 1 odpowiedź złamana → `zgodnosc` 7/8; prawda z 4 polami-brakami; model wypełnia 2
z nich). Punkt odniesienia (dobra droga): `zgodnosc`=0.875, `trafnosc`={stanowisko 0.857, miasto
0.714, widelki_min 0.571}, `pola_braki_liczba`=4, `halucynacje_liczba`=2, `halucynacje_wskaznik`=0.5.

| Błędna droga | Naiwny check `value`/predicate | Werdykt dziś | Dlaczego groźne |
|---|---|---|---|
| **Błąd wcięcia halucynacji** (liczy tylko pole `miasto`) | `halucynacje_wskaznik`=**0.5** | **TOKEN** ✘ | `1/2` = `2/4` na gołym ułamku; mianownik (pola-braki) niezakotwiczony — zmierzone |
| **Trafność `[1,1,1]`** + `trafnosc_zgodna=true` | C4 len=3 ✔, C5 liczby ✔, C6 `is_true` ✔ | **TOKEN** ✘ | serwer ufa boolowi z notebooka; ułamki trafności nieweryfikowane — zmierzone |
| **Trafność na wszystkich 8** (bez filtra zgodnych) | C4/C5/C6 przechodzą (to nadal 3 liczby) | **TOKEN** ✘ | miesza porażkę parsowania z porażką ekstrakcji — dwie miary, które atom rozdziela |
| **`zgodnosc` = powodzenia parsowania** | `zgodnosc`=**0.875** | **TOKEN** ✘ | w tym zbiorze parse ≡ schema (oba 7/8); check nie wymusza walidacji schematu — zmierzone |

Trzy z czterech to **realne fałszywe zaliczenia już w naiwnym kontrakcie** (zmierzone w §7).
Czwarty (`zgodnosc`) jest fałszywym zaliczeniem **przez konstrukcję danych** — i to jest ważne:
usuwa go dopiero zmiana zbioru (§D3), nie sam check.

### 1.5 Uczciwa waga: co to psuje, a czego nie (wzór ADR-020 §1.5)

- **NIE psuje kredencjału.** Token laba bramkuje postęp w drabinie, nie wystawia dowodu
  kompetencji (ADR-015 §5, ADR-014 D3). Verified Project Receipt nadal wymaga sandboxa, vivy
  i człowieka; **człowiek ma ostatnie słowo** (`CLAUDE.md` §7, bez zmian). Ten ADR nie dotyka
  warstwy kredencjału.
- **Psuje ocenę formującą — tam, gdzie od 2026-06-29 maszyna jest samowystarczalna.** LLM.5/LLM.7
  uczą dokładnie tego, że halucynację liczy się OSOBNO od trafności, a porażkę parsowania OSOBNO
  od porażki ekstrakcji. Check, który przepuszcza pomylenie tych miar, uczy studenta, że pomylił
  je bezkarnie — w chwili, gdy nieporozumienie jest jeszcze tanie do naprawy (jeden hint vs viva).
- **To FINAŁ całej drabiny.** LLM.7 to ostatni lab ścieżki i miniatura artefaktu capstone'u za
  30%. Słaby kontrakt tutaj zostawia najgorsze wrażenie na końcu — i przechodzi wprost do
  capstone'u, gdzie kosztuje recenzję człowieka.

### 1.6 Dlaczego robimy to TERAZ, przed budową 7 notebooków M-LLM

M-LLM jeszcze nie istnieje jako notebooki — jest sam scaffold. Wzmocnienie kontraktu **przed**
napisaniem pieczątek oznacza, że treść od razu produkuje dane, na których checki mają moc
(w szczególności zbiór z 4 polami-brakami i przypadkiem parsowalnym-ale-niezgodnym — §D3).
Odwrotna kolejność to ADR-020 raz jeszcze. Kolejność wiążąca: **ADR-020 (M-ML) → ten ADR (M-LLM)
→ budowa pieczątek obu**.

---

## 2. Decyzja — cztery bramki, każda łapie inną błędną drogę

Zasada nadrzędna (rozwinięcie ADR-020 §2): **ładunek pieczątki niesie strukturę z tożsamością
składników, nie zagregowany skalar.** Odsetek/ułamek zostaje jako liczba czytelna dla człowieka,
ale **nigdy jako jedyna kotwica** — obok niego jadą jego składniki.

### D1 · Zakotwiczenie mianownika i licznika halucynacji (rdzeń)

`halucynacje_wskaznik`=0.5 przestaje być jedynym ładunkiem. Pieczątka wystawia **trzy checki
`value`** zamiast jednego:

```
"pola_braki_liczba":   4     # value == 4  (mianownik — treść już nazywa go kontraktem)
"halucynacje_liczba":  2     # value == 2  (licznik)
"halucynacje_wskaznik": 0.5  # value == 0.5, tolerancja (zostaje: czytelny dla człowieka)
```

To odpowiednik rozłożenia metryki na `macierz` w ADR-020: nie „jaki ułamek", lecz „ile pól-braków
i ile z nich zmyślonych". **Zmierzone (§7):** błąd wcięcia dający `1/2`=0.5 (kolizja na ułamku)
ma `pola_braki_liczba`=2 (≠4) i `halucynacje_liczba`=1 (≠2) → **złapany na obu kotwicach**. 0.5 to
najgęstsza kolizja ułamka — dlatego kotwiczymy jej składniki, nie tolerancję na niej.

Że mianownik jest znany z góry (4) — to wprost deklaracja treści: „prawda zawiera dokładnie
4 pola-braki, kształt danych jest częścią kontraktu pieczątki". Ten ADR tylko **egzekwuje kodem,
co treść dziś obiecuje komentarzem**.

### D2 · Trafność jako `value` per pole — z tożsamością pola i tolerancją float

`trafnosc` przestaje być predykatem-na-wiarę. Pieczątka wystawia **check `value` na pole**, każdy
skalar osobno, z tolerancją:

```
"trafnosc_stanowisko":  0.8571   # value, tolerancja 0.01
"trafnosc_miasto":      0.7143   # value, tolerancja 0.01
"trafnosc_widelki_min": 0.5714   # value, tolerancja 0.01
```

Dwa powody, dla których **per pole ze skalarem**, a nie listą i nie boolem:

1. **Tożsamość pola.** Check per pole wiąże ułamek z konkretnym polem. Lista czytana „w kolejności
   POLA" (dzisiejsze `trafnosc_wartosci`) gubi to wiązanie — permutacja o tym samym multizbiorze
   przechodzi. Diagnoza odmowy jest też celniejsza: „trafność pola `widelki_min` = 0.29, a powinna
   0.57" zamiast „lista się nie zgadza".
2. **Tolerancja float — wymóg, nie wygoda.** Weryfikator `lab-checks.ts` daje tolerancję
   **wyłącznie** skalarom (linia 130: `isFiniteNumber(expect) && isFiniteNumber(got)`); listy
   porównuje **dokładnym `JSON.stringify`** (linia 134), **bez tolerancji**. Ułamek `6/7`=
   `0.857142857…` przy dokładnym porównaniu jest kruchy — a to jest dokładnie przypadek, który
   ADR-015 limit nr 10 zakazuje porównywać dokładnie („kolejność dodawania floatów potrafi
   fałszywie oblać"). **Lista-`value` na trafności łamałaby własny limit kontraktu.** Skalar per
   pole dostaje tolerancję osobno — jedyny poprawny sposób.

**Serwer przelicza, nie ufa notebookowi.** To zdejmuje z C6 rolę jedynej bramy: dziś boolean
`trafnosc_zgodna` jest policzony w sesji i przyjęty na wiarę. Po D2 wartości trafności są
weryfikowane serwerowo przez `value` — jak `acc_model` w M-ML/ADR-020. **Zmierzone (§7):**
degenerat `[1,1,1]` i „trafność na wszystkich 8" (0.75/0.625/0.5) różnią się od wzorca
(0.857/0.714/0.571) na każdym polu → **odrzucone**.

`macierz`-analog nie istnieje w M-LLM (to nie klasyfikacja), więc trafność per pole JEST
strukturą docelową — nie ma tańszej.

### D3 · Przypadek parsowalny-ale-niezgodny — rozdział „parse" od „schema"

`zgodnosc` (i `zgodne` w LLM.4) mierzy dziś to samo, co „powodzenia parsowania", bo w zbiorze
jedyna porażka to porażka parsowania. **Zmiana danych, nie tylko checku:** zbiór dostaje
**co najmniej jeden przypadek, który PARSUJE się, ale łamie schemat** (np. brak pola
`widelki_min`). Wtedy:

- „licz powodzenia parsowania" i „licz zgodne ze schematem" **dają różne liczby** — student
  pomijający walidację schematu jest złapany.
- **Zmierzone (§7):** obecny zbiór LLM.4 (5 przyp.) → parse=4, schema=4 (nie rozdziela);
  wzmocniony (1 złamana + 1 parsowalna-bez-pola + 3 czyste) → parse=4, schema=**3** → student
  liczący parse dostaje 4, kontrakt oczekuje 3 → **odrzucony**.

Pieczątka wystawia obie liczby osobno, żeby check widział rozdział:

```
"parsowalne_liczba":  N     # ile się sparsowało
"zgodne_liczba":      M     # ile ma komplet pól schematu   (M < N, gdy jest przypadek parse-but-invalid)
"zgodnosc":           M/K   # odsetek zgodnych ze schematem (K = wszystkie)
```

To decyzja o **kształcie danych** — dlatego jej właścicielem jest Sophia (PO, §2.6): dokładne
liczby (ile złamanych, ile parsowalnych-niezgodnych, ile pól-braków) są decyzją produktową
o tym, czego student się uczy. Kontrakt wymaga tylko, by rozdział parse/schema był **obserwowalny
w danych**.

### D4 · Kontrakt-test M-LLM — warunek konieczny (dziś NIE ISTNIEJE)

Kontrakt-testu M-LLM **nie ma** (`tests/unit/ds/notebooks-mllm*.contract.test.ts` — brak;
zweryfikowane w przeglądzie). Bez niego D1–D3 to reguły na papierze. Ten ADR czyni test
**warunkiem** budowy pieczątek, wzorem M-ML (ADR-020 §5, Quinn/Eva). Test regresyjny na
**cztery błędne drogi z §1.3 + dobra droga**:

1. błąd wcięcia halucynacji (`1/2`) → ODMOWA na `pola_braki_liczba`/`halucynacje_liczba` (D1);
2. trafność `[1,1,1]` → ODMOWA na `trafnosc_*` per pole (D2);
3. trafność na wszystkich 8 → ODMOWA na `trafnosc_*` per pole (D2);
4. `zgodnosc` = powodzenia parsowania → ODMOWA na `zgodne_liczba` przy zbiorze z przypadkiem
   parse-but-invalid (D3);
5. dobra droga → TOKEN (regresja, że kontrakt nie odrzuca poprawnych).

### 2.5 Tabela rozróżnialności — zmierzona wykonaniem (rdzeń, wzór ADR-020 §2.5)

„✔" = wygląda jak dobra droga na tej bramce; „✘ ODMOWA" = bramka łapie. Dobra droga przechodzi
wszystkie (kolumna kontrolna).

| Droga | ułamek naiwny | D1 `pola_braki`/`hal_liczba` | D2 `trafnosc_*` per pole | D3 `zgodne_liczba` | Werdykt kontraktu |
|---|---|---|---|---|---|
| **Dobra droga** | wskaźnik 0.5 ✔; zgodnosc 0.875 ✔ | 4 / 2 ✔ | 0.857 / 0.714 / 0.571 ✔ | 7 (przy zbiorze +invalid: 6) ✔ | **TOKEN** ✔ |
| Błąd wcięcia halucynacji | wskaźnik **0.5 ✔** (kolizja!) | **2 / 1 ✘ ODMOWA** | ✔ | ✔ | **ODMOWA** (D1) |
| Trafność `[1,1,1]`+true | — | ✔ | **1.0/1.0/1.0 ✘ ODMOWA** | ✔ | **ODMOWA** (D2) |
| Trafność na wszystkich 8 | — | ✔ | **0.75/0.625/0.5 ✘ ODMOWA** | ✔ | **ODMOWA** (D2) |
| `zgodnosc` = powodzenia parsowania | zgodnosc **0.875 ✔** | ✔ | ✔ | **parse 4 vs schema 3 ✘ ODMOWA** | **ODMOWA** (D3, po zmianie zbioru) |

**Każda z czterech błędnych dróg daje inny ładunek niż dobra droga.** Odmowa pada z **diagnozą
wskazującą przyczynę** (wzór ADR-020): „liczysz pola-braki tylko dla części pól — masz 2 zamiast
4 (sprawdź wcięcia pętli, LLM.5)" / „trafność pola `X` = … a powinna …" / „liczysz trafność na
przypadku złamanym — odfiltruj `None` przed pomiarem (LLM.7 krok 2)" / „liczysz powodzenia
parsowania zamiast zgodności ze schematem".

### 2.6 Styki produktowe — decyzje Sophii (PO, ownership jawny)

Kontrakt techniczny (D1–D4) jest mój (Ethan, CTO). Trzy parametry to **decyzje produktowe** —
dotyczą kształtu danych i tego, czego student się uczy — więc ich właścicielem jest **Sophia
(PO)**, do rozstrzygnięcia w przeglądzie domenowym:

- **Styk 1 — kształt zbioru LLM.7:** dokładnie 4 pola-braki w prawdzie, 2 z nich zmyślone przez
  wzorcowy model (→ wskaźnik 0.5), 1 odpowiedź złamana (→ zgodnosc 7/8). To liczby kontraktowe
  atomów — Sophia potwierdza, że kanoniczny zbiór je odtwarza.
- **Styk 2 — przypadek parsowalny-ale-niezgodny (D3):** ile takich i w którym labie (rekomendacja:
  po jednym w LLM.4 i LLM.7). Zmienia to kanoniczne liczby (`zgodne` LLM.4: 4→3 lub zbiór rośnie
  do 6) — decyzja o treści, nie o kodzie.
- **Styk 3 — wartości trafności per pole:** wynikają ze zbioru, ale Sophia dobiera dane tak, by
  ułamki były **dydaktycznie czytelne i różne między polami** (jak w §7: 0.857/0.714/0.571 — od
  razu widać, że `widelki_min` kuleje najbardziej), a nie przypadkiem równe.

---

## 3. Koszt

Ten ADR to **projekt kontraktu** — jego własny koszt to przeliczenia z §7 (zrobione). Koszt
**wdrożenia** (osobne kroki, §5) — oszacowany, nie poniesiony:

| Krok | Wykonawca | Szacunek |
|---|---|---|
| Projekt kontraktu + weryfikacja rozróżnialności wykonaniem (ten ADR) | Ethan | **0 — zrobione 2026-07-23** (liczby z §7) |
| Kanoniczny zbiór M-LLM (4 pola-braki, 1 złamana, ≥1 parsowalna-niezgodna, czytelne trafności) | Sophia | w ramach kuracji M-LLM (7 atomów) — **+~1 h** na domknięcie zbioru i punktów kontrolnych |
| Builder pieczątek: warstwa treści licząca `pola_braki_liczba`/`halucynacje_liczba`/`trafnosc_*`/`parsowalne_liczba`/`zgodne_liczba` + odmowy z diagnozą | builder M-LLM | ~2 h (warstwa pieczątki wspólna z ADR-015 bez zmian) |
| Packer: checki `value` per pole dla LLM.4/LLM.7; `expect` z FINALNEGO notebooka | Ethan | ~0,5 h |
| Kontrakt-test M-LLM: 4 scenariusze odmowy + dobra droga (dziś NIE ISTNIEJE) | Quinn/Eva | ~1,5 h |
| **Razem wdrożenie** (poza kuracją treści) | | **~4–5 h**, zero migracji schematu |

Zero nowej infrastruktury — mechanizm token/pieczątka z ADR-015 unosi te ładunki bez zmian
(same skalary i liczby; brak nawet list zagnieżdżonych, których M-ML wymagało — M-LLM jest
prostszy). **Zmiana kontraktu checków oznacza przepakowanie `m-llm.json` + re-ingest na prod
[CZERWONA LINIA, ADR-010].** To NIE jest krok tego ADR-a — to jego konsekwencja, wykonywana
osobno pod delegacją `CLAUDE.md` v1.12 (Ethan wykonuje re-ingest sam, pod bramkami: kopia
zapasowa, transakcyjny SQL, Leo review, audit log). Nazwane wprost, żeby nie zniknęło.

---

## 4. Rekomendacja i warianty odrzucone

> **Wzmacniamy kontrakt M-LLM wg D1–D4 przed budową pieczątek M-LLM.** Diagnoza (ten ADR) i
> weryfikacja rozróżnialności gotowe; kanoniczny zbiór idzie od Sophii; **budowa pieczątek czeka
> na finalizację tego kontraktu po przeglądzie Sophii.**

| Wariant | Werdykt |
|---|---|
| **Nie zmieniamy (goły ułamek + boolean klienta)** | ODRZUCONE — zmierzone fałszywe zaliczenia (błąd wcięcia `1/2`=0.5; trafność `[1,1,1]`) w finale drabiny uczącym rozdziału tych miar |
| **Tylko kotwica halucynacji (D1), trafność zostaje predykatem** | ODRZUCONE jako komplet — nie broni głównego artefaktu (30% rubryki); `[1,1,1]` nadal przechodzi |
| **Trafność jako lista-`value` `[0.857,0.714,0.571]`** | ODRZUCONE — weryfikator porównuje listy dokładnym `JSON.stringify` bez tolerancji (linia 134), łamie limit ADR-015 nr 10 dla floatów; gubi tożsamość pola. Per-pole skalar daje tolerancję i tożsamość |
| **Tolerancja/próg na `halucynacje_wskaznik`** | ODRZUCONE — kolizja 0.5 jest strukturalna (1/2=2/4=3/6), nie tolerancyjna; luźniejszy próg **pogarsza** |
| **Uruchamiać kod studenta w sandboxie i liczyć metryki u nas** | ODRZUCONE — ADR-015 D4: żaden check laba nie wymaga wykonania kodu studenta; ładunek deterministyczny wystarcza |

---

## 5. Runbook następczy — co robi kto (NIE w tym ADR)

Kolejność wiążąca: **ADR-020 (M-ML) → ten kontrakt sfinalizowany → treść M-LLM → builder pieczątek
→ packer → kontrakt-testy → re-ingest**. Ten ADR kończy się na projekcie.

### Sophia (PO) — kanoniczny zbiór M-LLM (warunek konieczny, żeby checki miały moc)
- Zbiór LLM.7: 8 trójek, **dokładnie 4 pola-braki**, 2 zmyślone (→ 0.5), 1 odpowiedź złamana
  (→ 0.875), trafności per pole **różne i czytelne** (§2.6 styk 3).
- **≥1 przypadek parsowalny-ale-niezgodny** w LLM.4 i LLM.7 (§D3, styk 2) — bez niego D3/„parse
  vs schema" nie ma czego rozdzielać.
- Diagnozy odmów (4 polskie stringi 1:1 na potknięcia modułu: wcięcia, filtr zgodnych, parse vs
  schema).

### Builder pieczątek M-LLM
- Warstwa treści LLM.4/LLM.7 liczy i wystawia: `parsowalne_liczba`, `zgodne_liczba`, `zgodnosc`,
  `pola_braki_liczba`, `halucynacje_liczba`, `halucynacje_wskaznik`, `trafnosc_<pole>` per pole.
- Odmowy **przed emisją tokenu** z diagnozą po polsku (wzór ADR-020).
- Warstwa pieczątki (serializacja + podpis) — **wspólny blok z ADR-015, nietknięty**.

### Packer + kontrakt-testy (Ethan; Quinn/Eva)
- `pack-curriculum-atoms.ts`: checki `value` per pole dla LLM.4/LLM.7; `expect` z **finalnego**
  notebooka Sophii (liczby §7 są ilustracyjne, wiążący finalny notebook).
- Kontrakt-test M-LLM (dziś brak): 4 scenariusze odmowy (§2.5) + dobra droga.

### Re-ingest (Ethan, po zielonym teście)
- Przepakowanie `m-llm.json` + re-ingest na prod — CZERWONA LINIA ADR-010, delegacja `CLAUDE.md`
  v1.12 (kopia zapasowa Neon, transakcyjny SQL, Leo review, audit log). Osobny krok, nie ten ADR.

---

## 6. Granice, ryzyka i czego ten ADR nie robi

**Czego ten ADR świadomie nie robi (nazwane, nie zamiecione):**
- **Nie buduje pieczątek ani treści M-LLM** i **nie dotyka `m-llm.json`**. Projekt kontraktu —
  wykonanie w §5.
- **Nie rusza produkcji, nie scala, nie ingestuje.** Zero zmian schematu bazy.
- **Nie wystawia kredencjału.** Warstwa dowodu kompetencji (sandbox + viva + człowiek) bez zmian;
  `CLAUDE.md` §7 nienaruszone.

**Ryzyka:**

| Ryzyko | Waga | Obsługa |
|---|---|---|
| Liczby ilustracyjne ADR ≠ finalny notebook Sophii — konkretne `expect` się rozjadą | niska | builder liczy `expect` z FINALNEGO notebooka (§5); liczby §7 są ilustracją własności rozróżnialności, nie wektorem produkcyjnym |
| Zmiana zbioru pod D3 zmienia kanoniczne liczby atomów (LLM.4 „4/5"→„3/5" itp.) | średnia | decyzja produktowa Sophii (§2.6 styk 2); treść M-LLM dopiero powstaje, więc to projekt, nie zmiana produkcji; hinty i „wynik jedyny" spisać z finalnym zbiorem |
| Trafności per pole wychodzą przypadkiem równe → słabsza dydaktyka i słabszy dowód tożsamości pola | niska | Sophia dobiera dane pod różne, czytelne ułamki (§2.6 styk 3) |
| Token podrabialny (student zna funkcję) | akceptowane | jak ADR-015 D3 — laby nie wystawiają kredencjału; bramki celują w **przypadkową** błędną drogę (uczciwy student), nie w zdeterminowanego oszusta |
| Re-ingest na prod (konsekwencja, nie ten ADR) | — | osobny krok pod bramkami ADR-010/`CLAUDE.md` v1.12 (§3, §5) |

**Wycofanie:** N/D — dokument projektowy, nic nie wdraża. Zmiana kierunku = rewizja tego ADR
przed budową.

---

## 7. Weryfikacja wykonaniem (Python 3, 2026-07-23)

**Status danych.** M-LLM nie ma jeszcze notebooków — zbiór poniżej jest **ilustracyjny** (8 trójek
odtwarzających wartości kontraktowe atomów: `zgodnosc`=0.875, `halucynacje_wskaznik`=0.5). Weryfikuje
**własność rozróżnialności** (strukturalną, niezależną od konkretnego zbioru); konkretne `expect`
builder policzy z FINALNEGO notebooka Sophii (§5). Semantyka M-LLM to czysta logika słownika/JSON
(nie ML) — przeliczenie jest deterministyczne i pełne, nie próbkowe.

**Zmierzone (nie wywnioskowane):**

- **Dobra droga:** `zgodne_idx`=[0,1,2,4,5,6,7], `zgodnosc`=0.875; `trafnosc`={stanowisko 0.8571,
  miasto 0.7143, widelki_min 0.5714}; `pola_braki_liczba`=4, `halucynacje_liczba`=2,
  `halucynacje_wskaznik`=0.5.
- **Błąd wcięcia halucynacji** (liczy pola-braki/halucynacje tylko dla pola `miasto`):
  `pola_braki_liczba`=2, `halucynacje_liczba`=1, `halucynacje_wskaznik`=**0.5** — **ułamek KOLIDUJE**
  z dobrą drogą, ale D1 odrzuca na `pola_braki_liczba` (2≠4) i `halucynacje_liczba` (1≠2).
- **Trafność `[1,1,1]`** + `trafnosc_zgodna=true`: przechodzi dzisiejsze C4 (len=3), C5 (liczby),
  C6 (`is_true`); D2 (per pole) odrzuca — wzorzec 0.857/0.714/0.571.
- **Trafność na wszystkich 8** (bez filtra zgodnych): {0.75, 0.625, 0.5} ≠ wzorzec → D2 odrzuca.
- **Parse vs schema (LLM.4, 5 przyp.):** obecny zbiór (1 złamana + 4 czyste) → parse=4, schema=4
  (**nie rozdziela**); wzmocniony (1 złamana + 1 parsowalna-bez-pola + 3 czyste) → parse=4,
  schema=**3** (**rozdziela** — D3 łapie liczącego parse).
- **Fakt z kodu weryfikatora** (`src/lib/curriculum/lab-checks.ts`, odczyt 2026-07-23): `value`
  daje tolerancję float **tylko** skalarom (linia 130), listy porównuje dokładnym `JSON.stringify`
  (linia 134); `is_true` zwraca `passed: v === true` (linia 178, boolean klienta na wiarę). To
  domyka uzasadnienie D2 „per pole skalar, nie lista, nie bool".

**Na papierze (niezweryfikowane wykonaniem, do domknięcia w budowie):** integracja checków `value`
per pole z packerem i warstwą pieczątki (builder jeszcze nie istnieje — jak w ADR-020); finalne
`expect` z notebooka Sophii; dokładny kształt kanonicznego zbioru (decyzje produktowe §2.6).

Skrypt weryfikacyjny (dobra droga + cztery błędne + rozdział parse/schema) uruchomiony lokalnie
w izolowanym środowisku; nie wchodzi do repo (jak przeliczenia w ADR-020). Reprodukcja: POLA=
[stanowisko, miasto, widelki_min], `json.loads` z `try/except JSONDecodeError`, filtr zgodnych
`rekord is not None and all(pole in rekord for pole in POLA)`.
