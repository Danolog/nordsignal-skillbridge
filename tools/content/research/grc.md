# Research kompetencji: GRC

> **Status:** research kompetencji w ETAP E3, wg wzorca (golden-example) `tools/content/research/siem.md`. Trzyma jego strukturę, głębię i poprzeczkę. **Nadbudowuje** nad `tools/content/research/risk-management.md` — nie powtarza teorii ryzyka.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `GRC` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Audyt, ryzyko i zgodność (GRC)" (`unionShare` grupy: **13,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **1,3%** ofert ścieżki wymienia GRC wprost |
| **Liczba ofert (`offers`)** | **5** |
| **`kind`** | `concept` (kompetencja koncepcyjna, integrująca — patrz §2) |
| **`lift`** | 22,29 (siła powiązania liścia z tą ścieżką — wysoka, mimo niskiego popytu bezwzględnego) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie GRC** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| Risk Management (research bazowy) | 4,9 | 18 | concept |
| ISO 27001 | 3,2 | 12 | concept |
| NIST | 2,7 | 10 | concept |
| RODO / GDPR | 1,9 | 7 | concept |
| DORA | 1,9 | 7 | concept |
| **GRC** (ten plik) | 1,3 | 5 | concept |

**Wniosek dla autoringu:** GRC ma **najniższy popyt bezwzględny w grupie** (1,3%, 5 ofert), ale **wysoki `lift` (22,29)** — gdy oferta wymienia „GRC" wprost, jest to bardzo silny sygnał roli właśnie z tej rodziny. To znaczy, że GRC nie jest osobną „kolejną umiejętnością obok ryzyka" — to **parasol pojęciowy spinający w jedno: ład (Governance), ryzyko (Risk) i zgodność (Compliance)**. Litera „R" w GRC to dokładnie zarządzanie ryzykiem z osobnego researchu. Dlatego ten plik **nie powtarza teorii ryzyka** (rejestr, macierz, cztery strategie — to fundament z `risk-management.md`), tylko pokazuje, **jak ryzyko, ład i zgodność łączą się w jedną dyscyplinę operacyjną** i jaką pełni rolę w organizacji. Research GRC autorujemy w grupie **jako ostatni** — zbiera w całość to, co Risk Management, ISO 27001, NIST, RODO i DORA wprowadziły osobno.

---

## 2. Definicja kompetencji i jej rola w pracy

**GRC (Governance, Risk and Compliance — ład korporacyjny, zarządzanie ryzykiem i zgodność jako jedna, zintegrowana dyscyplina)** to sposób prowadzenia organizacji, w którym trzy do niedawna osobne światy działają jako jeden spójny system, a nie trzy oddzielne silosy gadające obok siebie. Trzy filary:

1. **Ład (Governance — kierowanie i nadzór):** *kto* w organizacji podejmuje decyzje, według jakich zasad, kto za co odpowiada i komu raportuje. To role, polityki, struktura odpowiedzialności i nadzór zarządu. Odpowiada na pytanie „kto rządzi i według jakich reguł".
2. **Ryzyko (Risk — zarządzanie ryzykiem):** rozpoznawanie i świadome decydowanie o zagrożeniach dla celów organizacji. **Pełna teoria w `risk-management.md`** — tu używamy jej jako gotowego klocka, nie wyprowadzamy od nowa. Odpowiada na pytanie „co może pójść źle i co z tym robimy".
3. **Zgodność (Compliance — zgodność z wymogami):** spełnianie wymagań zewnętrznych (prawo: RODO, NIS2, DORA; normy: ISO 27001) i wewnętrznych (własne polityki). Odpowiada na pytanie „czego wymaga od nas prawo, norma i własne zasady — i czy to spełniamy".

**Po co spinać je w jedno (sedno GRC).** W niedojrzałej organizacji te trzy działy pracują osobno: zespół ryzyka prowadzi swój rejestr, zespół zgodności swoją listę wymogów regulatora, a zarząd swoje polityki — i **te same fakty są zbierane trzy razy, w trzech językach, z trzema sprzecznymi wynikami**. GRC integruje to: jeden mechanizm kontrolny (control — środek zabezpieczający) raz opisany odpowiada jednocześnie na ryzyko *i* na wymóg regulatora *i* mieści się w polityce ładu. Wartość GRC tkwi właśnie w **integracji i jednym źródle prawdy**, nie w robieniu „jeszcze jednego rejestru".

**Czym GRC NIE jest (rozróżnienie zawodowca):**
- **GRC ≠ narzędzie GRC.** Na rynku są platformy GRC (np. Archer, ServiceNow GRC, OneTrust) — ale GRC to *dyscyplina*, nie ich obsługa. Junior, który umie „klikać w Archerze", a nie rozumie, *po co* integrować ład/ryzyko/zgodność, jest operatorem, nie specjalistą GRC.
- **GRC ≠ samo ryzyko i ≠ sam audyt.** Zarządzanie ryzykiem to *jeden filar* GRC. Audyt to *sprawdzenie* zgodności, też część, nie całość. GRC to dopiero ich połączenie z ładem.
- **GRC ≠ „papierologia dla regulatora".** To częsty cynizm. Dojrzałe GRC realnie obniża pracę i ryzyko (jeden control zamiast trzech raportów), a nie produkuje dokumenty na półkę.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja jest rdzeniem pracy **młodszego specjalisty GRC (junior GRC analyst)** oraz spina pracę **analityka ryzyka, specjalisty ds. zgodności i audytora wewnętrznego**. Typowy dzień:
- **Młodszy specjalista GRC:** utrzymuje **macierz zabezpieczeń (control matrix / mapowanie kontroli)** — jedną tabelę, w której pojedynczy mechanizm kontrolny jest powiązany z ryzykiem, które ogranicza, *oraz* z wymogiem normy/regulacji, który spełnia. Zbiera **dowody zgodności (evidence — potwierdzenie, że zabezpieczenie naprawdę działa)** i przygotowuje materiał na **raport do zarządu**.
- **W styku z regulacją:** tłumaczy nowy wymóg (np. artykuł DORA) na konkretne zabezpieczenia i sprawdza, czy organizacja już je ma (mapowanie „wymóg → control → dowód → luka").

**Po co rynkowi ta kompetencja.** Lawina regulacji UE (NIS2, DORA, akt o sztucznej inteligencji, RODO) sprawia, że firmy nie nadążają z osobnym obsługiwaniem każdej z nich. GRC daje sposób, by **jeden raz dobrze opisany system zabezpieczeń odpowiadał na wiele wymogów naraz**. Niski popyt bezwzględny (1,3%) przy wysokim `lift` to sygnał, że to rola wyspecjalizowana i dojrzała — rzadziej w ofertach juniorskich, ale gdy się pojawia, jest rdzeniem stanowiska.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). **GRC zakłada opanowane zarządzanie ryzykiem** (`risk-management.md`, L1–L3) — tu nie uczymy rejestru ani macierzy od nowa, tylko *integrujemy* ryzyko z ładem i zgodnością. Cała ścieżka jest **dokumentowo-analityczna** (artefakty: macierze zabezpieczeń, mapowania wymóg→control, polityki, raporty), zero kodu i zero żywego środowiska.

### L1 — Fundamenty: trzy filary i ich rozdział (3–6 h)

**Zakres wiedzy/umiejętności:**
- Rozróżnienie trzech filarów: **ład / ryzyko / zgodność** — co każdy znaczy, na jakie pytanie odpowiada i czym się różnią (a nie pokrywają).
- Pojęcie **polityki (policy — spisana zasada obowiązująca w organizacji)**, **standardu** (jak politykę realizować) i **procedury** (krok po kroku) — hierarchia dokumentów ładu.
- Pojęcie **mechanizmu kontrolnego (control)** jako wspólnego mianownika trzech filarów: jedno zabezpieczenie służy naraz ryzyku, zgodności i ładowi.
- Mapa **interesariuszy i odpowiedzialności**: kto jest właścicielem ryzyka, kto kontroli, kto raportuje zarządowi (wstęp do modelu trzech linii — patrz L3).

**Co student musi UMIEĆ ZROBIĆ:** wziąć opisaną organizację i poprawnie przypisać kilkanaście przykładowych działań/dokumentów do właściwego filaru (ład / ryzyko / zgodność), uzasadniając rozdział; rozpisać prostą hierarchię polityka → standard → procedura dla jednego obszaru.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Trzy filary się uzupełniają, nie dublują.** Amator wrzuca wszystko do „zgodności". Zawodowiec wie, że to samo zdarzenie ma trzy twarze: zarząd ustala zasadę (ład), analityk wycenia ryzyko (ryzyko), a regulator wymaga dowodu (zgodność).
- **Polityka bez właściciela i przeglądu to dokument-trup.** Spisana zasada, której nikt nie posiada i nie aktualizuje, jest gorsza niż jej brak — daje fałszywe poczucie ładu.

### L2 — Zastosowanie: mapowanie wymóg → control i macierz zabezpieczeń (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Mapowanie wymogu na zabezpieczenie (requirement → control):** zamiana zapisu regulacji/normy (np. artykuł RODO, punkt ISO 27001 zał. A) na konkretne zabezpieczenie, które ten wymóg spełnia.
- **Macierz zabezpieczeń (control matrix):** jedna tabela łącząca *control ↔ ryzyko (z rejestru) ↔ wymóg regulacji/normy* — serce zintegrowanego GRC.
- **Wielokrotne pokrycie (one-to-many):** pokazanie, że jeden control odpowiada na wiele wymogów naraz (np. uwierzytelnianie wieloskładnikowe spełnia jednocześnie wymóg RODO, ISO 27001 i DORA).
- **Dowód zgodności (evidence):** czym jest dowód, że control *działa* (zrzut konfiguracji, polityka, log przeglądu), a nie tylko „istnieje na papierze".
- **Analiza luki (gap analysis — różnica między stanem wymaganym a faktycznym):** wskazanie, których wymogów organizacja jeszcze nie spełnia.

**Co student musi UMIEĆ ZROBIĆ:** zbudować macierz zabezpieczeń dla opisanej organizacji, w której każdy control jest powiązany z ryzykiem (z rejestru z `risk-management.md`) i z co najmniej jednym wymogiem normy/regulacji; pokazać przynajmniej jeden control pokrywający wiele wymogów; przeprowadzić analizę luki i wskazać braki z priorytetem.

**Profesjonalne niuanse:**
- **Integracja oszczędza pracę — to cała stawka GRC.** Mapowanie „jeden control → wiele wymogów" to dowód dojrzałości. Amator robi osobny rejestr pod każdą regulację i tonie; zawodowiec opisuje control raz i podpina pod wiele wymogów.
- **„Mamy politykę" ≠ „control działa".** Dowód zgodności to nie istnienie dokumentu, lecz potwierdzenie skuteczności. Audytor pyta „pokaż, że to naprawdę zadziałało", nie „pokaż, że to napisaliście".
- **Luka nazwana to zarządzane ryzyko; luka ukryta to bomba.** Dojrzałe GRC *jawnie* listuje, czego jeszcze nie spełnia, z planem. Zamiatanie luki pod dywan przed audytem to najgorszy możliwy ruch.

### L3 — Portfolio: zintegrowany przegląd GRC i raport do zarządu (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Model trzech linii (Three Lines Model — IIA: właściciele ryzyka / funkcje nadzoru / audyt wewnętrzny):** kto w organizacji za co odpowiada w systemie GRC i dlaczego rozdział tych ról jest mechanizmem kontroli sam w sobie.
- **Mapowanie wielu ram naraz (crosswalk):** powiązanie jednego zestawu zabezpieczeń jednocześnie z ISO 27001, NIST CSF i wymogiem regulacji (DORA/NIS2/RODO) — pokazanie, że organizacja nie obsługuje każdej ramy osobno.
- **Raportowanie do zarządu (board reporting):** przygotowanie materiału, który zarząd rozumie i na którego podstawie *decyduje* — stan zgodności, kluczowe ryzyka, luki, rekomendacje, językiem decydenta.
- **Cykl życia GRC:** powiązanie z przeglądami, aktualizacją polityk i ciągłością — GRC jako proces, nie jednorazowy audyt.
- **Rola narzędzi GRC:** świadomość, co automatyzuje platforma GRC (zbiór dowodów, mapowania, pulpit dla zarządu) i gdzie kończy się narzędzie, a zaczyna osąd człowieka.

**Co student musi UMIEĆ ZROBIĆ:** przygotować zintegrowany przegląd GRC dla opisanej organizacji — macierz zabezpieczeń zmapowaną na co najmniej dwie ramy (np. ISO 27001 + NIST CSF) i jeden wymóg regulacji, z przypisaniem odpowiedzialności wg modelu trzech linii, analizą luk i **jednostronicowym raportem dla zarządu** z rekomendacją decyzji. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Rozdział ról (trzy linie) to kontrola, nie biurokracja.** Gdy ten sam zespół zarządza ryzykiem *i* audytuje sam siebie, nie ma niezależnej oceny. Zawodowiec rozumie, że niezależność audytu wewnętrznego to mechanizm bezpieczeństwa.
- **Zarząd decyduje, GRC dostarcza obraz.** Specjalista GRC nie „blokuje" — przedstawia stan i rekomendację, decyzję (akceptacja luki, budżet na control) podejmuje zarząd. Junior, który sam rozstrzyga, przekracza rolę (echo niuansu #10 z `risk-management.md`).
- **Mapowanie wielu ram ujawnia, że one w 80% mówią to samo.** Dojrzały specjalista widzi wspólny rdzeń ISO/NIST/regulacji i nie obsługuje każdej osobno. Amator widzi trzy niezależne projekty i potraja pracę.

### L4 — Realny przypadek profesjonalny: zintegrowany GRC w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie organizacji z **trzema silosami** (ryzyko, zgodność, ład pracują osobno, z trzema sprzecznymi rejestrami) i zaprojektowanie *jednej* zintegrowanej macierzy zabezpieczeń, która godzi sprzeczne dane — to realna codzienność wdrożenia GRC, nie czysty scenariusz.
- Obsłużenie **nowej regulacji** (np. wejście DORA dla firmy finansowej): mapowanie jej wymogów na istniejące zabezpieczenia, znalezienie luk, plan domknięcia w terminie regulatora.
- **Benchmark:** zintegrowany przegląd studenta (kompletność mapowania, jakość crosswalku, realność rekomendacji dla zarządu) zestawiony z tym, co na tym samym przypadku przygotował profesjonalny specjalista GRC.

### L5 — Biegłość: program GRC i dojrzałość organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Budowa programu GRC od zera:** model operacyjny (kto, jak często, czym), wybór i wdrożenie narzędzia GRC, automatyzacja zbioru dowodów, pulpit dla zarządu — GRC jako trwała funkcja organizacji, nie projekt.
- **Model dojrzałości (maturity model):** ocena, na jakim poziomie dojrzałości jest organizacja i jak ją podnieść; powiązanie z apetytem na ryzyko (z `risk-management.md`, L5).
- **GRC wobec nowych ram (np. zarządzanie ryzykiem AI — NIST AI RMF, akt o AI):** rozszerzenie systemu na nowe domeny bez budowania go od zera.
- **Benchmark** wobec rozwiązania realnego menedżera GRC / oficera ds. zgodności: nie „czy zrobił macierz", ale „czy zaprojektował program, który wytrzyma audyt regulatora i da się utrzymać latami".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka. **Niuanse czysto ryzykowe są w `risk-management.md` §4 — tu tylko to, co specyficzne dla integracji GRC.**

1. **Integracja to cała wartość GRC — silosy to porażka.** Sedno: jeden control opisany raz odpowiada na ryzyko, wymóg i politykę naraz. Organizacja z trzema osobnymi rejestrami (ryzyko / zgodność / ład) ma „G, R i C", ale **nie ma GRC** — ma trzy silosy. Zawodowiec buduje jedno źródło prawdy; amator mnoży rejestry.

2. **Zgodność ≠ bezpieczeństwo (domknięcie pułapki z researchu ryzyka).** Tu rozwijamy to, co Risk Management tylko zasygnalizował: certyfikat ISO 27001 czy „zgodność z DORA" potwierdza *istnienie i opis systemu*, nie niskie realne ryzyko. Można przejść audyt i zostać zhakowanym. Dojrzałe GRC traktuje zgodność jako *minimum*, nie cel — a realne bezpieczeństwo mierzy ryzykiem, nie liczbą zaznaczonych pól.

3. **„Mamy politykę" ≠ „control działa".** Zgodność na papierze (polityka istnieje) vs zgodność operacyjna (control naprawdę działa i jest dowód). Audytor i regulator pytają o dowód skuteczności, nie o istnienie dokumentu. To rozdzielnik między „teatrem zgodności" a realnym GRC.

4. **Jeden control → wiele wymogów (one-to-many).** Dojrzałość GRC poznaje się po tym, że uwierzytelnianie wieloskładnikowe jest zmapowane raz, a podpięte pod wymóg RODO, ISO 27001 i DORA jednocześnie. Amator opisuje je trzy razy pod trzy regulacje i potraja pracę oraz ryzyko niespójności.

5. **Model trzech linii — niezależność audytu to mechanizm kontroli.** Gdy zespół zarządzający ryzykiem audytuje sam siebie, ocena jest bezwartościowa. Rozdział: właściciele ryzyka (1. linia) / funkcje nadzoru ryzyka i zgodności (2. linia) / niezależny audyt wewnętrzny (3. linia) — to nie biurokracja, to zabezpieczenie przed samooszukiwaniem organizacji.

6. **Zarząd decyduje, GRC oświetla.** Specjalista GRC nie ma mandatu blokować biznesu — dostarcza obraz (stan zgodności, luki, ryzyka) i rekomendację, a decyzję podejmuje zarząd, który ją *podpisuje*. Junior, który traktuje GRC jak „policję wewnętrzną", źle rozumie rolę.

7. **Narzędzie GRC nie zastępuje osądu.** Platforma (Archer, ServiceNow, OneTrust) automatyzuje zbiór dowodów i mapowania — ale *co* zmapować, *które* ryzyko jest istotne i *jak* zinterpretować lukę, to osąd człowieka. Junior, który umie tylko obsługiwać narzędzie, jest operatorem, nie specjalistą. (Spójne z filozofią SkillBridge: AI/narzędzie to ręce, człowiek decyduje.)

8. **Mapowanie wielu ram ujawnia wspólny rdzeń.** ISO 27001, NIST CSF i większość regulacji w dużej części pokrywają się treścią. Zawodowiec robi *crosswalk* (mapę odpowiedniości) i obsługuje wspólny rdzeń raz; amator prowadzi trzy niezależne projekty zgodności i marnuje czas oraz tworzy sprzeczności.

9. **GRC to proces ciągły, nie projekt pod audyt.** Organizacja, która „robi GRC" raz w roku przed audytem, ma zgodność migawkową — między audytami dryfuje. Dojrzałe GRC ma rytm przeglądów i żywe dowody. (Echo cyklu życia rejestru z `risk-management.md` #9, przeniesione na poziom całego systemu.)

10. **Regulacji przybywa — GRC ma skalować, nie puchnąć.** NIS2, DORA, akt o AI, RODO… Wartość dojrzałego GRC w tym, że nową regulację *podpina* się pod istniejący system (nowe mapowanie do istniejących kontroli), a nie buduje od zera. Amator na każdą regulację zakłada nowy silos.

11. **Granica etyczno-prawna i poufność (jak w całym cyber).** Dokumentacja GRC (macierz zabezpieczeń, analiza luk) to **mapa słabości organizacji** — wprost użyteczna dla atakującego. Zawodowiec traktuje ją jak dokument ściśle poufny, minimalizuje dane osobowe (RODO) i pracuje wyłącznie na własnej/fikcyjnej organizacji. Nieautoryzowane pozyskiwanie informacji o cudzej infrastrukturze jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty GRC muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania młodszego specjalisty GRC. **Projekty GRC zakładają ukończone projekty Risk Management** (nie powtarzają rejestru/macierzy/strategii) i skupiają się na *integracji*. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Wszystkie **dokumentowo-analityczne**, `sourceType` zwykle `open_data` (publiczne normy, ramy, scenariusze) — zero kodu, zero żywego środowiska.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Trzy filary w praktyce** — przypisanie kilkunastu działań/dokumentów opisanej organizacji do ładu / ryzyka / zgodności z uzasadnieniem rozdziału | Rozróżnienie filarów, role | #1 |
| P2 | L1 | **Hierarchia dokumentów ładu** — rozpisanie polityka → standard → procedura dla jednego obszaru, z właścicielem i cyklem przeglądu | Polityka/standard/procedura, własność | #1 (polityka-trup) |
| P3 | L2 | **Mapowanie wymóg → control** — zamiana zapisów normy/regulacji (ISO 27001 zał. A / artykuł RODO) na konkretne zabezpieczenia | Requirement → control | #3, #4 |
| P4 | L2 | **Macierz zabezpieczeń (control ↔ ryzyko ↔ wymóg)** — jedna tabela spinająca control z ryzykiem (z rejestru Risk Management) i wymogiem; pokazanie one-to-many | Macierz zabezpieczeń, integracja, one-to-many | #1, #4 |
| P5 | L2 | **Dowód zgodności i analiza luki** — odróżnienie „mamy politykę" od „control działa"; gap analysis z priorytetem braków | Evidence, gap analysis | #3 |
| P6 | L3 | **Crosswalk dwóch ram** — zmapowanie jednego zestawu zabezpieczeń jednocześnie na ISO 27001 i NIST CSF, ujawnienie wspólnego rdzenia | Mapowanie wielu ram, wspólny rdzeń | #8, #10 |
| P7 | L3 | **Model trzech linii w organizacji** — przypisanie odpowiedzialności (właściciele / nadzór / audyt) i uzasadnienie, dlaczego niezależność audytu to kontrola | Three Lines Model, niezależność | #5 |
| P8 | L3 | **Raport GRC dla zarządu** — jednostronicowy materiał: stan zgodności, luki, ryzyka, rekomendacja decyzji, językiem decydenta | Raportowanie do zarządu | #2, #6 |
| P9 | L3 | **Rola narzędzia GRC vs osąd** — co automatyzuje platforma GRC, a gdzie zaczyna się decyzja człowieka; ćwiczenie na opisie funkcji narzędzia (bez wdrożenia) | Rola narzędzi GRC, granica automatyzacji | #7, #9 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — godzenie trzech silosów + obsługa nowej regulacji (DORA) (L4); program GRC od zera + model dojrzałości + GRC dla ryzyka AI (L5); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #1, #9, #10, #11 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną i notą poufności dokumentacji GRC, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (filary) → P2 (dokumenty ładu) → P3 (wymóg→control) → P4 (macierz) → P5 (dowód/luka) → P6 (crosswalk) → P7 (trzy linie) → P8 (zarząd) → P9 (narzędzie vs osąd). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy — i **żaden nie powtarza teorii ryzyka** (przychodzi gotowa z `risk-management.md`).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

GRC **nie ma sensu** bez wcześniej opanowanego zarządzania ryzykiem i bez kontekstu, *czym* są normy i regulacje, które GRC integruje. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Zarządzanie ryzykiem (`Risk Management`) — TWARDY prerekwizyt.** GRC używa rejestru ryzyk, macierzy i czterech strategii jako gotowych klocków (litera „R"). Bez ukończonego `risk-management.md` L1–L3 student nie zbuduje macierzy zabezpieczeń (control ↔ ryzyko ↔ wymóg). **Wymagane przed L1 GRC.**
2. **Znajomość przynajmniej jednej ramy/normy** — `ISO 27001` i/lub `NIST` (katalogi zabezpieczeń, na które GRC mapuje wymogi). Ich własny research jest *równoległy*, ale podstawowa orientacja w strukturze normy jest potrzebna do mapowania. **Wymagane/równoległe przed L2.**
3. **Kontekst regulacyjny** — `RODO / GDPR` i/lub `DORA` (źródła wymogów zgodności, które GRC integruje). Wystarczy orientacja w tym, że to wymóg prawny z konkretnymi obowiązkami. **Zalecane przed L2.**
4. **Pojęcie aktywów i zabezpieczeń technicznych** — z wcześniejszych grup ścieżki (`IAM`, `Active Directory`, hardening systemów, `SIEM`/`SOC`), żeby control w macierzy był konkretem, nie abstrakcją. **Zalecane przed L2.**
5. **Klauzula etyczno-prawna i poufność** — jak w każdym projekcie cyber (art. 267 KK), wzmocniona o poufność dokumentacji GRC (macierz/luki = mapa słabości). Praca wyłącznie na własnej/fikcyjnej organizacji. **Wymagane od L1.**

**Pozycja GRC w grupie:** GRC jest **liściem domykającym grupę** — autorowany jako ostatni, bo *nadbudowuje* nad Risk Management (ryzyko), ISO 27001/NIST (ramy) i RODO/DORA (regulacje). Nie jest prerekwizytem dla żadnego innego liścia grupy; przeciwnie — wszystkie pozostałe są jego materiałem wejściowym. To uzasadnia kolejność autoringu: Risk Management pierwszy, normy i regulacje w środku, GRC na końcu jako spinający.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub oficjalne; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Ramy ładu, ryzyka i zgodności (oficjalne):**
- NIST Cybersecurity Framework 2.0 — funkcja **Govern** (ład) jako oś GRC, darmowa: https://www.nist.gov/cyberframework
- NIST SP 800-53 Rev.5 „Security and Privacy Controls" (katalog zabezpieczeń do mapowania, darmowy): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- ISO/IEC 27001 „Information security management systems" (norma SZBI; strona standardu — opis i zakres): https://www.iso.org/standard/27001
- ISO 37301 „Compliance management systems" (systemy zarządzania zgodnością; strona standardu): https://www.iso.org/standard/75080.html
- IIA — The Three Lines Model (model trzech linii; oficjalny dokument Instytutu Audytorów Wewnętrznych, darmowy): https://www.theiia.org/en/content/position-papers/2020/the-iia-three-lines-model/
- OCEG — GRC Capability Model („Red Book"; oryginalne źródło terminu i modelu GRC): https://www.oceg.org/

> **Uwaga dla Ryana:** normy ISO (27001, 37301) są **płatne** — linkujemy do **oficjalnej strony standardu ISO** (opis/zakres), a naukę praktyczną opieramy na **darmowych** materiałach NIST (CSF 2.0 z funkcją Govern, SP 800-53) i IIA (model trzech linii). Nie udostępniamy pirackich kopii norm. OCEG udostępnia model GRC po darmowej rejestracji — do weryfikacji przez Ryana, czy link nadaje się do `learning_resources`, czy tylko jako kontekst.

**Regulacje EU/PL (oficjalne, darmowe):**
- Dyrektywa NIS2 (obowiązki zarządcze, podejście oparte na ryzyku): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (zgodność i zarządzanie ryzykiem ICT w finansach): https://eur-lex.europa.eu/eli/reg/2022/2554
- RODO/GDPR — tekst rozporządzenia (rozliczalność, art. 5 ust. 2; zgodność): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- ENISA — materiały o zgodności i zarządzaniu ryzykiem (agencja UE ds. cyberbezpieczeństwa): https://www.enisa.europa.eu/topics/risk-management

**Mapowania i crosswalki (otwarte, autorytatywne):**
- NIST — Informative References / mapowania CSF do innych ram (OLIR, darmowe): https://csrc.nist.gov/projects/olir
- Secure Controls Framework (SCF) — otwarty katalog kontroli z gotowymi mapowaniami do wielu ram: https://securecontrolsframework.com/

**Powiązany research (wewnętrzny, prerekwizyt):**
- `tools/content/research/risk-management.md` — pełna teoria ryzyka (rejestr, macierz, cztery strategie); GRC nadbudowuje, nie powtarza.

**Kontekst prawny PL (do klauzul):**
- Kodeks karny art. 267 (nieuprawniony dostęp do informacji — granica etyczno-prawna projektów): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte lub oficjalne strony standardów (normy ISO linkowane do strony ISO, nie do kopii). OCEG i SCF wymagają sprawdzenia warunków udostępniania przed wejściem do `learning_resources`. Brak danych osobowych — scenariusze fikcyjne. Każdy projekt dostaje klauzulę poufności dokumentacji GRC (macierz/luki = mapa słabości; nie odnosić do realnej cudzej organizacji, nie tworzyć materiału ofensywnego). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów GRC na rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research powtarzał teorię ryzyka.** Pierwsza wersja tłumaczyła rejestr i macierz od nowa. CISO: „jeśli uczysz tego samego dwa razy, marnujesz czas studenta i rozmywasz, czym GRC różni się od ryzyka". **Poprawka:** uczyniłam Risk Management twardym prerekwizytem (§6), a w §3/§4/§5 jawnie zaznaczyłam „teoria ryzyka przychodzi gotowa z `risk-management.md`" — GRC skupia się wyłącznie na *integracji* (macierz control ↔ ryzyko ↔ wymóg, crosswalk, trzy linie).

2. **Słabość: GRC mylone z narzędziem GRC.** CISO: „nie chcę kogoś, kto umie klikać w Archerze, a nie rozumie, po co integrować — narzędzia się zmieniają, dyscyplina nie". **Poprawka:** dodałam niuans #7 (narzędzie nie zastępuje osądu) i osobny projekt L3 (P9), świadomie *bez* wdrożenia narzędzia — ćwiczenie na rozumieniu granicy automatyzacja↔osąd, spójne z filozofią SkillBridge (człowiek decyduje).

3. **Słabość: „zgodność = bezpieczeństwo" tylko zasygnalizowane.** CISO: „to jest pułapka numer jeden w tej roli — junior z certyfikatem w głowie uśpi mi zarząd «bo przeszliśmy audyt»". **Poprawka:** przejęłam tę pułapkę z `risk-management.md` (gdzie był tylko fundament) i *domknęłam* ją tutaj jako niuans #2 + #3 (zgodność na papierze vs operacyjna, dowód skuteczności) — to świadomy podział pracy między dwa researche.

4. **Słabość: brak modelu trzech linii i niezależności audytu.** CISO: „organizacja, w której ryzyko audytuje samo siebie, nie ma kontroli — junior musi rozumieć, czemu rozdzielamy te role". **Poprawka:** dodałam model trzech linii do zakresu L3 (P7), niuans #5 i źródło IIA; pokazałam niezależność audytu jako *mechanizm kontroli*, nie biurokrację.

5. **Słabość: brak integracji wielu ram (crosswalk).** CISO: „realna wartość GRC to obsłużyć ISO, NIST i DORA jednym zestawem kontroli — junior, który robi trzy osobne projekty zgodności, kosztuje mnie potrójnie". **Poprawka:** dodałam niuans #4 (one-to-many), #8 i #10 (wspólny rdzeń ram, skalowanie), osobny projekt L3 (P6 — crosswalk ISO 27001 + NIST CSF) i mapowania NIST OLIR / SCF jako źródła (§7).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (GRC, Governance/ład, Compliance/zgodność, policy/polityka, standard, procedura, control/mechanizm kontrolny, control matrix/macierz zabezpieczeń, requirement→control, evidence/dowód zgodności, gap analysis/analiza luki, one-to-many, crosswalk, Three Lines Model/model trzech linii, board reporting, maturity model, ISO 27001/37301, NIST CSF/SP 800-53/OLIR, DORA, NIS2, RODO, SCF, OCEG, IIA, CISO). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli młodszego specjalisty GRC *pod warunkiem* ukończonego Risk Management, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#8. Pełna zawodowość (budowa programu GRC, model dojrzałości, GRC dla ryzyka AI, godzenie silosów w realnej firmie) wymaga L4/L5 — research je zapowiada, ale „seniorska" biegłość domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). Ścisłe sprzężenie z `risk-management.md` jest cechą, nie wadą — odzwierciedla, że w realnej pracy GRC bez ryzyka nie istnieje. To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
