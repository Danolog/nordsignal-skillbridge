# Research kompetencji: SAST

> **Status:** research liścia-narzędzia grupy „Bezpieczeństwo aplikacji (AppSec)" w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **Teorię podatności webowych dziedziczy w całości z `owasp.md`** (rdzeń koncepcyjny grupy): kategorie OWASP Top 10, mechanizm i naprawa wstrzyknięć / XSS / kontroli dostępu, mapowanie na CWE, triage realnej dziury vs fałszywego alarmu. Ten plik **nie powtarza** tej teorii — skupia się na tym, **co statyczna analiza kodu wykrywa, a czego nie**, i na triage jej wyników.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — analiza tylko kodu własnego/otwartego) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SAST` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Bezpieczeństwo aplikacji (AppSec)" (`unionShare` grupy: **4,9%**) |
| **Popyt liścia (`demandPercentage`)** | **1,6%** ofert ścieżki wymienia SAST |
| **Liczba ofert (`offers`)** | **6** |
| **`kind`** | `tool` (klasa narzędzi statycznej analizy kodu — patrz §2) |
| **`lift`** | 20,06 |
| **Liść-rdzeń (dziedziczona teoria)** | `OWASP` → `tools/content/research/owasp.md` |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Wniosek dla autoringu:** SAST (Static Application Security Testing — statyczne testowanie bezpieczeństwa aplikacji) to *narzędziowa* nadbudowa nad teorią OWASP. Popyt 1,6% (6 ofert) — niższy niż OWASP (3,2%), bo rynek pyta o narzędzie *po* fundamencie pojęciowym. Research jest **cienki w teorii podatności** (ta jest w `owasp.md`), a **gruby w specyfice statycznej analizy:** jak narzędzie czyta kod *bez uruchamiania*, co przez to widzi (wzorce w kodzie źródłowym, przepływ danych), a czego z definicji nie zobaczy (zachowanie w czasie działania, konfiguracja, zależności), i — przede wszystkim — jak segregować jego wyniki, w których fałszywych alarmów bywa więcej niż prawdziwych dziur. Autoring tego liścia to projekty „weź regułę OWASP, którą już rozumiesz, i naucz się czytać, jak widzi ją skaner statyczny".

---

## 2. Definicja kompetencji i jej rola w pracy

**SAST (statyczne testowanie bezpieczeństwa aplikacji)** to analiza **kodu źródłowego** (albo skompilowanego bajtkodu) **bez uruchamiania programu** — stąd „statyczne". Narzędzie czyta kod tak, jak czytałby go recenzent, tylko maszynowo i w skali: szuka wzorców, które odpowiadają znanym klasom podatności z OWASP/CWE.

Jak to robi (mechanizm, który odróżnia SAST od zwykłego wyszukiwania tekstu):
- **Analiza przepływu danych (data flow / taint analysis — śledzenie „skażonych" danych)** — narzędzie śledzi, jak dane *od użytkownika* (źródło — *source*) wędrują przez kod aż do miejsca niebezpiecznego (ujście — *sink*, np. zapytanie do bazy). Jeśli dane dotrą do ujścia bez „oczyszczenia" (walidacji/parametryzacji), narzędzie zgłasza możliwe wstrzyknięcie.
- **Dopasowanie wzorców (pattern matching)** — reguły opisujące niebezpieczne konstrukcje (np. sklejanie zapytania SQL ze stringów, użycie słabej funkcji kryptograficznej).

**Co SAST WIDZI (jego mocna strona):**
- Wstrzyknięcia (SQL injection, polecenia systemowe), gdzie da się prześledzić ścieżkę skażonych danych w kodzie.
- Twardo zaszyte sekrety (hasła, klucze) w kodzie źródłowym.
- Słabe lub przestarzałe funkcje kryptograficzne, niebezpieczne wywołania.
- Część błędów kontroli dostępu *widocznych w kodzie*.
- **Najwcześniej z całej trójki** — działa na samym kodzie, jeszcze zanim aplikacja w ogóle ruszy („shift-left" — przesunięcie bezpieczeństwa na wczesny etap wytwarzania, do edytora kodu i potoku CI/CD).

**Czego SAST NIE WIDZI (granica narzędzia — to jest sedno tego pliku):**
- **Zachowania w czasie działania** — dziur, które ujawniają się dopiero, gdy aplikacja działa i jest skonfigurowana (to domena `dast.md`).
- **Błędnej konfiguracji środowiska** — serwera, nagłówków, uprawnień (kod może być czysty, a wdrożenie dziurawe).
- **Podatności w zależnościach/bibliotekach** — to nie „nasz" kod, więc SAST go nie analizuje (to domena `sca.md`).
- **Logiki biznesowej** — „mogę kupić za ujemną cenę" jest poprawne składniowo, więc statyczny analizator nie widzi problemu (niuans #11 z `owasp.md`).

**Kto tego używa i jak wygląda dzień pracy.** Inżynier AppSec i bezpieczny programista. Typowy cykl: skaner SAST odpala się w potoku CI/CD przy każdej zmianie kodu i produkuje listę znalezisk; zadaniem człowieka jest **triage** — odróżnić prawdziwą dziurę od fałszywego alarmu, nadać priorytet, otworzyć zgłoszenie naprawcze albo świadomie odrzucić znalezisko z uzasadnieniem. To rzemiosło decyduje, czy SAST pomaga, czy zalewa zespół szumem.

**Narzędzia rynkowe (do laba — wersje darmowe/otwarte):** Semgrep (otwarte, reguły czytelne dla człowieka), SonarQube Community / SonarCloud (darmowe dla projektów otwartych), CodeQL (darmowe dla repozytoriów otwartych), Bandit (statyczna analiza Pythona, otwarte). Wszystkie pozwalają ćwiczyć **na kodzie własnym lub otwartym** — bez dotykania cudzej własności.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował (niezmiennik §4 frameworku). **Poziomy zakładają opanowaną teorię podatności z `owasp.md`** (zwłaszcza O1–O4: rozumienie dziury i ręczny triage) — tu nadbudowujemy *specyfikę statycznej analizy*, nie uczymy podatności od zera (patrz §6).

> **Klauzula całej ścieżki:** analiza wyłącznie kodu **własnego lub otwartego** (open source na licencji pozwalającej), nigdy cudzego prywatnego kodu bez zgody. Wchodzi do `theory_md` każdego projektu.

### L1 — Fundamenty: uruchomić skaner i przeczytać znalezisko (3–6 h)

**Zakres wiedzy/umiejętności (specyfika SAST):**
- Uruchomienie darmowego skanera SAST (np. Semgrep albo Bandit) na **własnym, celowo podatnym repozytorium** (np. kod z laba OWASP albo otwarty przykład).
- Odczytanie pojedynczego znaleziska: jaka kategoria, jaki numer CWE, gdzie w kodzie (plik, linia), jaka ścieżka danych (źródło → ujście).
- Powiązanie znaleziska z kategorią OWASP Top 10, którą student już zna z `owasp.md`.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić skaner na własnym kodzie; odczytać 3–5 znalezisk i dla każdego wskazać kategorię Top 10 + CWE oraz miejsce w kodzie; słownie opisać, dlaczego skaner to zgłosił.

**Profesjonalne niuanse na tym poziomie:**
- **Skaner pokazuje *podejrzenie*, nie wyrok.** Pierwszy odruch amatora — „skaner coś podświetlił, więc to dziura". Zawodowiec wie, że znalezisko to hipoteza do sprawdzenia.
- **„Zero znalezisk" nie znaczy „bezpiecznie".** Może znaczyć „skaner nie objął tego języka / nie ma reguły / dziura jest w czasie działania albo w zależności". Cisza skanera to nie cisza ryzyka.

### L2 — Zastosowanie: triage fałszywych alarmów i strojenie (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Triage znalezisk:** dla każdego — prawdziwy pozytyw (realna dziura) czy fałszywy alarm? Ocena na podstawie osiągalności (czy ujście jest realnie zasilane skażonymi danymi), istniejących zabezpieczeń, kontekstu.
- **Dlaczego SAST ma dużo fałszywych alarmów:** analiza przepływu danych *nadmiarowo przybliża* (over-approximation) — zgłasza ścieżkę, która teoretycznie istnieje, choć w praktyce dane są już oczyszczone gdzie indziej. Zrozumienie tej przyczyny to klucz do triage.
- **Strojenie reguł (tuning):** świadome wyciszenie reguły / oznaczenie znaleziska jako zaakceptowane — z dokumentacją *dlaczego* (analogia do allowlist w SIEM: każdy wyjątek to potencjalna dziura).
- **Naprawa znalezionej dziury** (z użyciem wiedzy z `owasp.md` — parametryzacja, kodowanie wyjścia) i ponowny skan jako dowód, że znikła.

**Co student musi UMIEĆ ZROBIĆ:** przejść listę znalezisk skanera i podzielić ją na prawdziwe pozytywy i fałszywe alarmy z uzasadnieniem; naprawić co najmniej jedną prawdziwą dziurę i pokazać, że ponowny skan jej nie zgłasza; udokumentować świadomie wyciszone znalezisko.

**Profesjonalne niuanse:**
- **Fałszywy alarm kosztuje, fałszywy negatyw boli.** Te błędy nie są symetryczne (jak w SIEM). Za agresywne wyciszanie chowa prawdziwe dziury; za luźny próg topi zespół w szumie i uczy ignorowania skanera.
- **Wyciszenie ≠ naprawa.** Oznaczenie znaleziska jako „zaakceptowane ryzyko" bez uzasadnienia to zamiatanie pod dywan. Każde wyciszenie wymaga *dlaczego* — inaczej następny człowiek nie wie, czy to świadoma decyzja, czy lenistwo.

### L3 — Portfolio: SAST w potoku CI/CD i raport jakości (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Wpięcie SAST w potok CI/CD** (taśmę budowania) własnego repozytorium: skan automatyczny przy każdej zmianie, próg blokujący (np. „nie scalaj, jeśli pojawiła się nowa dziura krytyczna").
- **Balans szybkość ↔ rygor:** próg za ostry blokuje pracę zespołu na fałszywych alarmach; za luźny przepuszcza dziury. Świadomy dobór.
- **Raport z triage:** zestaw znalezisk z podziałem TP/FP, priorytetami, naprawami i udokumentowanymi wyciszeniami — profesjonalnej jakości.
- **Granica SAST wobec DAST/SCA:** jawne nazwanie, czego ten skan *nie* pokrył i co trzeba dołożyć innym narzędziem (kieruje do `dast.md`, `sca.md`).

**Co student musi UMIEĆ ZROBIĆ:** wpiąć SAST w potok CI/CD z uzasadnionym progiem blokującym; wyprodukować raport z triage gotowy na rozmowę o pracę; jawnie nazwać luki pokrycia SAST i wskazać, co domyka DAST/SCA. To poziom „portfolio".

**Profesjonalne niuanse:**
- **Próg blokujący to decyzja kulturowo-techniczna.** Zbyt rygorystyczna brama, która faluje na fałszywych alarmach, zostanie obejściem („pomińmy skan, goni nas termin") — i wtedy nie chroni niczego. Zawodowiec stroi bramę tak, by zespół jej *ufał*.
- **Skanuj różnicę, nie całość.** Dojrzały potok zgłasza *nowe* dziury wprowadzone zmianą, nie zalewa listą historycznych. Inaczej każdy skan to ta sama ściana szumu.

### L4 / L5 — ZAPOWIEDŹ ZAKRESEM

> **Uwaga (§3 frameworku):** struktura L4/L5 (referencyjny wynik profesjonalisty + benchmark) jest projektowana **osobno przez Ethana/Leo**. Research tylko zapowiada zakres.

- **L4:** triage realnego, dużego raportu SAST z prawdziwego (otwartego) projektu — setki znalezisk, mieszanka prawdy i szumu — z priorytetyzacją i korelacją z wynikami DAST/SCA. Benchmark wobec inżyniera AppSec.
- **L5:** strategia statycznej analizy dla organizacji — własne reguły (np. pod wewnętrzny standard kodowania), zarządzanie długiem fałszywych alarmów, wpięcie w secure SDLC bez zatrzymywania wytwarzania. Benchmark wobec architekta.

---

## 4. Profesjonalne niuanse — sedno North Star

To materiał na głębię projektów. **Teoria *samych podatności* jest w `owasp.md` §4** — tu niuanse *specyficzne dla statycznej analizy*.

1. **SAST widzi kod, nie rzeczywistość.** Zgłasza, że ścieżka skażonych danych *istnieje w kodzie* — nie potwierdza, że da się ją wykorzystać na działającej aplikacji. Potwierdzenie wykorzystywalności to rola DAST. SAST mówi „tu może być dziura", nie „tu jest dziura".
2. **Wysoki odsetek fałszywych alarmów to cecha, nie usterka.** Analiza przepływu danych nadmiarowo przybliża, żeby nie przeoczyć prawdziwych ścieżek — kosztem zgłaszania też nierealnych. Triage to nie „naprawa narzędzia", to istota pracy z SAST.
3. **Fałszywy negatyw jest groźniejszy, bo niewidzialny.** Czego skaner nie zgłosił (bo brak reguły / niewspierany język / dziura poza kodem), tego nikt nie sprawdzi. „Zielony skan" usypia. Zawodowiec zna *zakres* swojego narzędzia.
4. **Triage = naprawa klasy, nie pojedynczego znaleziska** (dziedziczy z `owasp.md` #4): jedno prawdziwe znalezisko często wskazuje wzorzec powtórzony w kodzie — zawodowiec naprawia źródło, nie dziesięć kopii.
5. **Wyciszenie wymaga uzasadnienia.** Każde oznaczenie „fałszywy alarm / zaakceptowane ryzyko" to decyzja, którą ktoś kiedyś będzie rewidował. Bez „dlaczego" to dziura w procesie (analogia do allowlist w SIEM).
6. **Shift-left ma sens tylko, jeśli zespół ufa skanerowi.** SAST w edytorze i w potoku CI/CD łapie dziury najtaniej — ale jeśli zalewa fałszywymi alarmami, programiści go wyłączają. Strojenie pod zaufanie > liczba reguł.
7. **Pokrycie języków i frameworków bywa nierówne.** Skaner dobry w Pythonie może słabo rozumieć inny język albo nietypowy framework — i cicho przepuszczać dziury. Zawodowiec wie, *co* jego narzędzie naprawdę analizuje.
8. **Granica etyczno-prawna:** analiza **kodu własnego lub otwartego** (licencja pozwalająca), nigdy cudzego prywatnego kodu bez zgody. Wyniki skanu kodu mogą ujawniać sekrety — traktuje się je jak dane wrażliwe.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SAST muszą pokryć umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury). Poniżej mapa pokrycia — nie pełne projekty (te powstają w E3-A).

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3 | Niuanse z §4 |
|---|---|---|---|---|
| S1 | L1 | **Pierwszy skan SAST własnego kodu** — uruchomienie Semgrep/Bandit na celowo podatnym repozytorium, odczyt znalezisk, mapowanie na Top 10/CWE | Uruchomienie, odczyt, mapowanie | #1, #3 |
| S2 | L2 | **Triage: prawda czy fałszywy alarm** — podział listy znalezisk na TP/FP z uzasadnieniem osiągalności, naprawa prawdziwej dziury + dowód re-skanem | Triage, naprawa, dowód | #1, #2, #4 |
| S3 | L2 | **Świadome strojenie i wyciszanie** — udokumentowane wyciszenie fałszywego alarmu, zrozumienie przyczyny over-approximation | Strojenie, dokumentacja wyjątku | #2, #5 |
| S4 | L3 | **SAST w potoku CI/CD** — wpięcie skanera z progiem blokującym, skan różnicy, raport jakości + jawne luki pokrycia (co domyka DAST/SCA) | CI/CD, próg, raport, granica narzędzia | #6, #7 |
| (S5) | L4–L5 | **ZAPOWIEDŹ** — triage realnego dużego raportu + strategia SAST dla organizacji; benchmark profesjonalisty | Zakres L4/L5 | #3, #6 |

**Szacowana pula L1–L3: ok. 4 projekty.** L4–L5: 1–2 projekty po rozszerzeniu struktury. Liczba z pokrycia, nie z targetu.

**Łańcuch zależności:** S1 → S2 → S3 → S4. **Cały blok SAST zakłada opanowane O1–O4 z `owasp.md`** — student najpierw rozumie dziurę i triage *ręcznie*, dopiero potem czyta skaner.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

1. **OWASP (rdzeń teorii)** — `owasp.md`, zwłaszcza zrozumienie kategorii Top 10, mapowania na CWE i ręcznego triage realnej dziury vs fałszywego alarmu. **Bezwzględnie wymagane przed L1 SAST** — bez tego student „naprawia, co podświetlił skaner", nie rozumiejąc czego.
2. **Podstawy programowania** — czytanie kodu, w którym skaner wskazuje znalezisko. Liść `Python` (projekt `cyber-python-automatyzacja-logow`, partia 1). **Wymagane przed L1.**
3. **Podstawy SQL** — żeby zrozumieć znaleziska o wstrzyknięciu SQL. Liść `SQL`. **Wymagane przed L1.**
4. **Pojęcie potoku CI/CD** — taśma budowania/wdrażania, do której wpina się skan na L3. Liść `CI/CD`. **Wymagane przed L3.**
5. **Klauzula etyczno-prawna** — analiza kodu własnego/otwartego. **Wymagane od L1.**

**Czego SAST dostarcza dalej:** SAST jest jednym z trzech filarów oceny aplikacji obok `DAST` (analiza działającej aplikacji) i `SCA` (analiza zależności). Na L4 trzy źródła się *korelują* — dlatego student musi znać granice każdego. SAST nie jest prerekwizytem DAST/SCA (są równoległe), ale wszystkie trzy mają wspólny prerekwizyt: **OWASP**.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

**Narzędzia SAST (darmowe/otwarte, do laba):**
- Semgrep (otwarte, czytelne reguły): https://semgrep.dev/docs/
- Bandit (statyczna analiza Pythona, OWASP/PyCQA): https://bandit.readthedocs.io/
- SonarQube Community / SonarCloud (darmowe dla projektów otwartych): https://docs.sonarsource.com/
- CodeQL (darmowe dla repozytoriów otwartych): https://codeql.github.com/docs/

**Wiedza o klasach słabości (otwarte, autorytatywne):**
- MITRE CWE (katalog typów słabości): https://cwe.mitre.org/
- OWASP Source Code Analysis Tools (przegląd kategorii narzędzi): https://owasp.org/www-community/Source_Code_Analysis_Tools
- NIST SP 800-218 SSDF (bezpieczny cykl wytwarzania, kontekst CI/CD): https://csrc.nist.gov/pubs/sp/800/218/final

**Kod do ćwiczeń (celowo podatny / otwarty — legalny):**
- OWASP Juice Shop (celowo podatna aplikacja): https://owasp.org/www-project-juice-shop/
- OWASP Benchmark (zbiór testowy do oceny skanerów): https://owasp.org/www-project-benchmark/

> **Do uwagi Ryana:** wszystkie narzędzia w wersjach darmowych/otwartych; ćwiczenie **wyłącznie na kodzie własnym lub otwartym** (celowo podatne repozytoria, OWASP Benchmark). Brak skanowania cudzego prywatnego kodu. Wyniki SAST mogą ujawniać sekrety zaszyte w kodzie — w projektach traktujemy je jak dane wrażliwe (nie publikujemy surowych raportów z sekretami). Klauzula etyczna i mapowanie do `owasp.md`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Najsurowszy krytyk — CISO zatrudniający juniorów AppSec. Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: research powtarzał teorię podatności z OWASP.** CISO: „nie chcę czytać czwarty raz, czym jest wstrzyknięcie SQL — chcę wiedzieć, co *ten* skaner z nim robi". **Poprawka:** jawnie zadeklarowałam dziedziczenie teorii z `owasp.md` (nagłówek + §4 wstęp) i przesunęłam cały ciężar na specyfikę statycznej analizy: source→sink, over-approximation, granice narzędzia.

2. **Słabość: SAST przedstawiony jako „wykrywacz dziur".** CISO: „junior, który ufa każdemu znalezisku skanera, zasypie mi programistów fałszywymi alarmami i spali zaufanie do narzędzia". **Poprawka:** niuans #1 (SAST widzi kod, nie rzeczywistość) i #2 (fałszywe alarmy to cecha), osobny projekt L2 (S2) w całości o triage TP/FP. To rozdzielnik amator↔zawodowiec z opisu grupy.

3. **Słabość: pominięte granice narzędzia.** CISO: „najgroźniejszy jest junior, który myśli, że zielony SAST = aplikacja bezpieczna". **Poprawka:** niuans #3 (fałszywy negatyw niewidzialny) i #7 (nierówne pokrycie języków), oraz wymóg na L3 (S4), by *jawnie nazwać*, czego SAST nie pokrył i co domyka DAST/SCA.

4. **Słabość: wyciszanie bez dyscypliny.** CISO: „junior, który klika «to fałszywy alarm», żeby zielono było, jest gorszy niż brak skanera". **Poprawka:** niuans #5 (wyciszenie wymaga uzasadnienia, analogia do allowlist SIEM) i projekt S3 z udokumentowanym wyciszeniem.

5. **Słabość: brak realiów potoku CI/CD.** CISO: „skan, który zatrzymuje wytwarzanie na fałszywych alarmach, zespół obejdzie pierwszego dnia". **Poprawka:** niuans #6 (zaufanie > liczba reguł) i wymóg „skanuj różnicę, nie całość"; projekt L3 (S4) o progu blokującym strojonym pod zaufanie zespołu.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty po polsku przy pierwszym użyciu (SAST, taint analysis, source/sink, pattern matching, shift-left, CI/CD, true/false positive, over-approximation, tuning, allowlist, SSDF, Semgrep/Bandit/SonarQube/CodeQL). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** spełniona, jeśli autoring domknie 4 projekty L1–L3 z niuansami #1–#7. Strategia organizacyjna (#6 w skali, własne reguły) wymaga L4/L5 — zapowiedziane, zależne od Ethana/Leo. Pełna „zawodowość" SAST domyka się dopiero z DAST i SCA (ocena aplikacji to trzy źródła naraz) — uczciwie oznaczone.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
