# Research kompetencji: EDR / XDR

> **Status:** research liścia-rdzenia rodziny „detekcja na końcówce" (endpoint) w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). Dwa liście-narzędzia tej rodziny (`microsoft-defender.md`, `crowdstrike.md`) **dziedziczą teorię detekcji z tego pliku** i nadbudowują nad nim specyfikę narzędzia, bez powtarzania podstaw.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — szczególnie monitoring pracownika i głęboka telemetria stacji) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `EDR / XDR` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,2%** ofert ścieżki wymienia EDR / XDR |
| **Liczba ofert (`offers`)** | **12** |
| **`kind`** | `tool` w modelu — ale w praktyce **kompetencja koncepcyjna** (klasa narzędzi, nie jeden produkt); traktujemy ją jak rdzeń-koncept rodziny detekcji na końcówce (patrz §2) |
| **`lift`** | 26,74 (siła powiązania liścia z tą ścieżką — najwyższa w grupie obok SOAR/Incident Response) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| SIEM | 10,8 | 40 | concept |
| SOC | 5,1 | 19 | concept |
| Splunk | 4,3 | 16 | tool |
| **EDR / XDR** (ten plik) | 3,2 | 12 | tool |
| SOAR | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| Incident Response | 1,1 | 4 | concept |

**Wniosek dla autoringu:** EDR / XDR ma trzeci popyt w grupie (3,2%), ale jest **rdzeniem mniejszej rodziny w obrębie grupy** — „detekcji na końcówce". Dwa konkretne narzędzia z tej rodziny (Microsoft Defender 1,6% i CrowdStrike 1,6%) razem dokładają tyle samo popytu co sam EDR / XDR, a oferty często wymieniają je *zamiennie* („doświadczenie z EDR, np. Defender lub CrowdStrike"). Dlatego EDR / XDR autorowany jest pierwszy w rodzinie: tu mieszka cała teoria (telemetria z końcówek, wykrywanie zachowań, izolacja, polowanie na zagrożenia), a researche Defendera i CrowdStrike’a tylko ją zakotwiczają w konkretnym ekosystemie. To ten sam wzorzec co relacja SIEM → Splunk: kompetencja jest rdzeniem, narzędzie pochodną.

---

## 2. Definicja kompetencji i jej rola w pracy

**EDR (Endpoint Detection and Response — wykrywanie i reagowanie na końcówkach)** to klasa narzędzi, która na każdej *końcówce* (endpoint — laptop, serwer, stacja robocza, czyli pojedyncze urządzenie w firmie) instaluje lekki program-czujnik (agent / sensor) i nieprzerwanie zbiera z niej *telemetrię* (telemetry — strumień szczegółowych danych o tym, co robi system): jakie procesy się uruchomiły, w jakiej kolejności (drzewo procesów), jakie połączenia sieciowe nawiązały, jakie pliki i wpisy rejestru zmieniły, jakie biblioteki załadowały. EDR robi trzy rzeczy, których zwykły antywirus nie potrafi:

1. **Widzi zachowanie, nie tylko plik.** Antywirus pyta „czy ten plik jest na liście znanych wirusów (sygnatura)?". EDR pyta „czy to, co ten program *robi*, wygląda jak atak?" — np. dokument Worda uruchamia PowerShell, który pobiera plik z internetu i szyfruje dyski. Żaden pojedynczy krok nie jest wirusem; wzorzec całości jest atakiem.
2. **Pamięta i pozwala cofnąć się w czasie.** Telemetria jest zapisywana, więc po wykryciu można odtworzyć całą historię: „czym to się zaczęło, co napastnik dotknął, dokąd się rozszedł" (*dochodzenie* — investigation).
3. **Reaguje na końcówce.** Nie tylko alarmuje — pozwala *odciąć* zainfekowaną maszynę od sieci (izolacja hosta), zabić proces, usunąć plik, zdalnie wejść na maszynę — wszystko z konsoli, bez chodzenia do biurka użytkownika.

**XDR (Extended Detection and Response — rozszerzone, wieloźródłowe wykrywanie i reagowanie)** to nadbudowa nad EDR: bierze telemetrię z końcówek i *łączy* ją z innymi źródłami jednego producenta — tożsamością (kto się loguje), pocztą (skąd przyszedł złośliwy załącznik), chmurą, siecią — w jeden, skorelowany obraz incydentu. Różnica w jednym zdaniu: **EDR widzi głęboko jedną końcówkę; XDR próbuje połączyć końcówkę z resztą świata napastnika** — ale w ramach jednego, zintegrowanego ekosystemu producenta.

**Czym EDR/XDR NIE jest (rozróżnienie zawodowca):**
- **EDR ≠ antywirus / NGAV.** Antywirus (i jego nowsza odmiana NGAV — next-gen antivirus, antywirus nowej generacji) *blokuje* znane i podejrzane pliki. EDR *widzi, zapisuje i pozwala reagować* na zachowania. W praktyce nowoczesna platforma łączy oba (NGAV blokuje, EDR obserwuje i daje narzędzia reakcji) — ale mylenie ich to błąd juniora. EPP (Endpoint Protection Platform — platforma ochrony końcówek) to parasol na obie funkcje.
- **EDR ≠ SIEM, XDR ≠ SIEM.** SIEM (Security Information and Event Management — patrz `siem.md`) zbiera logi z *całej* firmy, w tym z różnych producentów, i jest neutralny. XDR łączy źródła, ale zwykle *jednego* producenta i z naciskiem na detekcję. Zawodowiec wie: EDR bywa najcenniejszym *źródłem* telemetrii dla SIEM; XDR i SIEM się uzupełniają, nie wykluczają (patrz niuans #7).
- **EDR to nie „magiczne pudełko, które samo łapie".** Jest tak dobry, jak jakość telemetrii, pokrycie końcówek (czy agent jest *wszędzie*) i umiejętność analityka, który czyta zachowania i poluje (§4).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja EDR/XDR jest rdzeniem pracy **analityka SOC** (Security Operations Center — centrum monitorowania bezpieczeństwa) na linii reagowania oraz **łowcy zagrożeń (threat hunter)** i **specjalisty reagowania na incydenty (incident responder)**. Typowy dzień:
- **Analityk SOC:** dostaje alert EDR („podejrzane drzewo procesów na laptopie księgowej"), przeprowadza *triage* (segregację — realne zagrożenie czy fałszywy alarm), a jeśli realne — *izoluje hosta* jednym kliknięciem, żeby zatrzymać rozprzestrzenianie, i eskaluje.
- **Łowca zagrożeń:** nie czeka na alert. Stawia *hipotezę* („gdyby napastnik był u nas, użyłby techniki X") i przeszukuje telemetrię końcówek w poszukiwaniu śladów, których żadna reguła nie złapała (polowanie na zagrożenia — threat hunting, §4).

**Po co rynkowi ta kompetencja.** Końcówka to dziś najczęstszy *pierwszy punkt wejścia* napastnika (kliknięty załącznik, zainfekowany plik, przejęte konto na laptopie). Regulacje europejskie (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — rozporządzenie o odporności cyfrowej sektora finansowego) wymagają zdolności *wykrywania i reagowania*, nie tylko prewencji. Stąd stały popyt na ludzi, którzy umieją czytać telemetrię końcówki i reagować — niezależnie od tego, czy firma kupiła Defendera, CrowdStrike’a czy coś innego.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Uwaga: ten liść zakłada wcześniejsze opanowanie podstaw detekcji z `siem.md` (korelacja, MITRE ATT&CK, próg, triage) — patrz §6.

### L1 — Fundamenty: czytanie telemetrii końcówki i drzewa procesów (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest telemetria końcówki: zdarzenia procesów (uruchomienie, rodzic-dziecko), zdarzenia sieciowe (połączenie wychodzące, adres docelowy), zdarzenia plików i rejestru. Czym różni się od logu SIEM (głębia jednego hosta vs szerokość firmy).
- **Drzewo procesów (process tree — łańcuch „kto kogo uruchomił"):** odczytanie, że `winword.exe` → `cmd.exe` → `powershell.exe` to nie to samo co `explorer.exe` → `powershell.exe`. Pojęcie procesu rodzica i dziecka.
- Uruchomienie *darmowego* laba: otwartoźródłowy EDR/DFIR **Velociraptor** albo bezpłatna warstwa Microsoft Defender for Endpoint (wersja próbna) na jednej maszynie testowej; wczytanie i przejrzenie telemetrii.
- Podstawy języka zapytań o telemetrię (KQL — Kusto Query Language w ekosystemie Microsoft, albo wbudowane wyszukiwanie zdarzeń platformy): filtr po procesie, po hoście, po czasie.
- Odczytanie z telemetrii prostego, podejrzanego zachowania: program biurowy uruchamia powłokę (shell), nietypowe połączenie wychodzące, uruchomienie z katalogu tymczasowego.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić agenta EDR na maszynie testowej; odczytać drzewo procesów i wskazać proces rodzica; napisać 3–5 zapytań o zdarzenia procesów/sieci; opisać słownie, dlaczego dane zachowanie jest podejrzane.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Kontekst rodzica zmienia wszystko.** `powershell.exe` sam w sobie jest neutralny — codzienne narzędzie administratora. Ten sam PowerShell uruchomiony *przez Worda* to niemal zawsze atak. Amator patrzy na nazwę procesu; zawodowiec na *kto go uruchomił i po co*.
- **Brak zdarzenia to też dana.** Jeśli na końcówce nagle *przestaje* spływać telemetria, to może znaczyć, że napastnik wyłączył agenta (tamper — manipulacja, niuans #9), a nie że „nic się nie dzieje".

### L2 — Zastosowanie: wykrywanie zachowań, reagowanie i triage alertu EDR (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Wykrywanie zachowań (behavioral detection):** zamiana opisu techniki napastnika na regułę wykrywającą *wzorzec* (np. „proces biurowy uruchamia interpreter skryptów, który łączy się z internetem"), nie pojedynczy plik.
- **IOC vs IOA** — fundament tej klasy narzędzi: **IOC (Indicator of Compromise — wskaźnik naruszenia)** to ślad *po fakcie* (znany zły adres IP, suma kontrolna pliku); **IOA (Indicator of Attack — wskaźnik ataku)** to *zachowanie w trakcie* (sekwencja działań typowa dla ataku, niezależnie od konkretnego pliku). Zawodowiec wie, że IOA łapie to, czego IOC nie zna (patrz niuans #2).
- **Reagowanie na końcówce (response actions):** izolacja hosta (network containment — odcięcie maszyny od sieci z zachowaniem łączności z konsolą), zabicie procesu, kwarantanna pliku, zebranie pakietu dowodowego.
- **Triage alertu EDR:** ustalenie priorytetu (severity), odróżnienie prawdziwego pozytywu (true positive — realne zagrożenie) od fałszywego alarmu (false positive), decyzja „izolować czy obserwować".
- **Wzbogacanie (enrichment):** dołożenie kontekstu — czy to konto administratora, czy host produkcyjny, czy ten adres docelowy jest na liście znanych zagrożeń (threat intelligence — wywiad o zagrożeniach).

**Co student musi UMIEĆ ZROBIĆ:** napisać regułę wykrywania zachowania i uruchomić ją na telemetrii; odróżnić prawdziwy pozytyw od fałszywego; podjąć i uzasadnić decyzję o reakcji (izolacja vs obserwacja); napisać raport triage z następnym krokiem.

**Profesjonalne niuanse:**
- **Izolacja hosta to decyzja biznesowa, nie tylko techniczna.** Odcięcie laptopa stażysty kosztuje firmę nic; odcięcie serwera bazy danych produkcyjnej w godzinach szczytu może zatrzymać sprzedaż. Zawodowiec waży „powstrzymać atak" przeciw „zatrzymać biznes" — i wie, kiedy eskalować decyzję, zamiast klikać samemu (niuans #3).
- **Fałszywy pozytyw na końcówce boli inaczej niż w SIEM.** Reakcja EDR potrafi *zablokować* legalny program lub odciąć użytkownika od pracy. Za agresywne strojenie = telefony od wkurzonych pracowników; za luźne = przeoczony atak. To napięcie jest ostrzejsze niż przy czystym alertowaniu (niuans #11).
- **Living-off-the-land — najtrudniejszy przypadek.** Napastnik coraz częściej nie wnosi własnych narzędzi, tylko używa *legalnych* programów systemowych (PowerShell, `certutil`, `wmic` — tzw. LOLBins, Living-off-the-Land Binaries, „życie z tego, co zastał"). Reguła oparta na „złym pliku" tego nie złapie; trzeba reguły opartej na *zachowaniu i kontekście* (niuans #6).

### L3 — Portfolio: polowanie na zagrożenia, mapowanie ATT&CK, korelacja (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Polowanie na zagrożenia (threat hunting) oparte na hipotezie:** sformułowanie hipotezy („gdyby napastnik utrwalał dostęp, dodałby zadanie w harmonogramie") i przeszukanie telemetrii pod jej kątem — proaktywnie, bez czekania na alert.
- **Mapowanie na MITRE ATT&CK** (otwarta baza taktyk i technik napastników — patrz `siem.md` §4 i §7 tu): przypisanie każdej reguły/polowania do konkretnej techniki na końcówce (np. T1059 — wykonanie przez interpreter poleceń), świadome zbudowanie *pokrycia detekcji* i nazwanie luk (blind spots — martwych pól).
- **Korelacja końcówka ↔ reszta (logika XDR):** połączenie zdarzenia z końcówki ze zdarzeniem tożsamości (logowanie) i sieci w jeden, pewniejszy obraz incydentu — i zrozumienie, gdzie kończy się EDR, a zaczyna XDR/SIEM.
- **Testowanie detekcji:** odtworzenie techniki na własnym labie (otwarty zestaw **Atomic Red Team** — bezpieczne odwzorowania technik ATT&CK) i potwierdzenie, że reguła/polowanie faktycznie wykrywa.
- **Rekonstrukcja incydentu (timeline):** złożenie z telemetrii pełnej osi czasu ataku — od pierwszego wejścia, przez rozprzestrzenianie (lateral movement — ruch boczny), po cel — jako materiał do reakcji.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić polowanie oparte na hipotezie i udokumentować wynik (znalazłem / nie znalazłem + dlaczego); zbudować zestaw reguł zachowań zmapowanych na ATT&CK ze świadomie pokazaną luką; udowodnić wykrycie, odtwarzając technikę (Atomic Red Team); zrekonstruować oś czasu incydentu z telemetrii. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Polowanie bez hipotezy to klikanie.** „Pooglądam sobie telemetrię, może coś zobaczę" nie jest polowaniem. Zawodowiec startuje od konkretnej hipotezy zakotwiczonej w ATT&CK i wie, *czego* szuka i *gdzie* (niuans #5).
- **Pokrycie końcówek bije pokrycie reguł.** Najlepsza reguła nic nie da na maszynie, na której nie ma agenta. Niezarządzane urządzenia (prywatne laptopy, zapomniane serwery, urządzenia IoT) to martwe pole — i to one bywają punktem wejścia (niuans #10).
- **XDR to nie magia korelacji.** Marketing obiecuje, że XDR „sam połączy kropki". W praktyce korelacja jest tak dobra, jak dane, które wpłyną, i reguły, które ją napędzają. Zawodowiec nie ufa „automatycznej korelacji" bez sprawdzenia (niuans #7).

### L4 — Realny przypadek profesjonalny: reakcja na incydent na końcówce (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, brudnego* zrzutu telemetrii końcówki z trwającego incydentu (proces wykorzystujący LOLBins, ruch boczny, próba wyłączenia agenta) i przeprowadzenie pełnej reakcji: rozpoznanie, powstrzymanie (izolacja), rekonstrukcja osi czasu, rekomendacja usunięcia (eradication).
- Podjęcie i *uzasadnienie* decyzji o izolacji w kontekście biznesowym (serwer produkcyjny vs stacja użytkownika), z udokumentowaniem kompromisu.
- **Benchmark:** wynik studenta (kompletność rekonstrukcji, trafność decyzji o reakcji, czas do powstrzymania) zestawiony z tym, co osiągnął specjalista reagowania na incydenty na tym samym przypadku.

### L5 — Biegłość: architektura EDR/XDR w organizacji i jej ekonomia (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia wdrożenia na całą organizację:** jak osiągnąć pełne pokrycie końcówek (w tym serwery, maszyny wirtualne, urządzenia zdalne), jak wdrożyć agenta bez zatrzymania firmy, jak ustawić politykę reakcji (co automat, co człowiek).
- **Architektura EDR → SIEM/XDR:** decyzja, którą telemetrię trzymać w EDR, a którą przekazać do SIEM (koszt vs wartość, niuans #4 i #8), jak uniknąć dublowania i ślepych pól na styku narzędzi.
- **Model obsługi: własny SOC vs MDR (Managed Detection and Response — usługa zarządzanego wykrywania, gdy zewnętrzny zespół obsługuje EDR firmy):** świadoma decyzja, kiedy kupić usługę, a kiedy budować zespół.
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie „czy wykrywa", lecz „czy wykrywa przy rozsądnym koszcie, pełnym pokryciu i obsłudze, którą zespół udźwignie".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **EDR to wykrywanie zachowań, nie sygnatur.** Antywirus pyta „znam ten plik?". EDR pyta „to zachowanie wygląda na atak?". Najgroźniejsze ataki używają plików, których nikt jeszcze nie zna (zero-day) albo wcale nie wnoszą plików (LOLBins). Amator szuka „złego pliku"; zawodowiec czyta *sekwencję zachowań i kontekst*.

2. **IOC vs IOA — różnica, która dzieli juniora od specjalisty.** IOC (wskaźnik naruszenia) to ślad po fakcie — znany zły adres, suma kontrolna. IOA (wskaźnik ataku) to zachowanie w trakcie — sekwencja typowa dla ataku, niezależna od konkretnego pliku. IOC łapie znane; IOA łapie *nowe i nieznane*. Detekcja oparta tylko na IOC zawsze jest o krok za napastnikiem.

3. **Izolacja hosta to decyzja biznesowa.** Odcięcie maszyny od sieci powstrzymuje atak, ale potrafi zatrzymać biznes (serwer produkcyjny, kasa, system medyczny). Zawodowiec waży koszt powstrzymania przeciw kosztowi przestoju i wie, kiedy *eskalować* decyzję, zamiast klikać samemu. To nie jest przycisk „bezpiecznie".

4. **Telemetria kosztuje — końcówkę i budżet.** Pełny zapis każdego zdarzenia procesu obciąża wydajność stacji (użytkownik narzeka na wolny laptop) i generuje ogromne ilości danych do przechowania i przesłania do chmury. Zawodowiec dobiera, *co* zbierać i jak głęboko; amator włącza „wszystko" i dziwi się rachunkowi oraz skargom (powiązane z ekonomią zaciągu SIEM, `siem.md` niuans #9).

5. **Polowanie na zagrożenia zaczyna się od hipotezy.** Proaktywne szukanie wroga, którego żadna reguła nie złapała, wymaga hipotezy zakotwiczonej w ATT&CK („gdyby był u nas, robiłby X"). Bez hipotezy „przeglądanie telemetrii" to strata czasu. To umiejętność, która oddziela analityka reagującego od łowcy.

6. **Living-off-the-land (LOLBins) — atak bez własnych narzędzi.** Napastnik używa legalnych narzędzi systemowych (PowerShell, `certutil`, `rundll32`, `wmic`), bo są wszędzie i nie wzbudzają podejrzeń. Wykrycie wymaga *kontekstu i sekwencji* (kto uruchomił, po czym, w jakim celu), nie listy złych plików. Projekt LOLBAS (§7) kataloguje te techniki.

7. **EDR ≠ SIEM ≠ XDR — i nie zastępują się nawzajem.** EDR widzi głęboko jedną końcówkę. SIEM widzi szeroko całą firmę, neutralnie wobec producenta. XDR łączy źródła, zwykle jednego producenta, z naciskiem na detekcję. Najczęstszy realny układ: EDR jest *źródłem* dla SIEM, a XDR to wygodna integracja w obrębie jednego ekosystemu. „XDR zastąpi SIEM" to hasło marketingowe, nie reguła architektury — zawodowiec zna granice każdego.

8. **Czas przebywania napastnika (dwell time) to miara, która liczy się naprawdę.** Liczy się nie „ile alertów", lecz „jak szybko od wejścia napastnika do jego wykrycia i powstrzymania". Krótki dwell time = atak powstrzymany, zanim wyrządził szkodę. EDR/XDR istnieje po to, by ten czas skracać — i tak należy mierzyć jego wartość.

9. **Manipulacja agentem (tamper) — napastnik atakuje samą obronę.** Sprytny napastnik najpierw próbuje *wyłączyć* EDR (zatrzymać usługę, odinstalować sensor, zablokować łączność z chmurą). Ochrona przed manipulacją (tamper protection) i alert „agent zamilkł" to fundament — cisza z końcówki bywa najgłośniejszym sygnałem.

10. **Pokrycie końcówek to fundament, nie szczegół.** Reguła nie działa na maszynie bez agenta. Niezarządzane i zapomniane urządzenia (prywatne laptopy w modelu BYOD, stare serwery, IoT) to martwe pola — i często właśnie one są punktem wejścia. Zawodowiec mapuje, *gdzie agenta nie ma*, zanim chwali się pokryciem reguł.

11. **Fałszywy pozytyw z reakcją automatyczną boli podwójnie.** EDR potrafi sam zablokować proces albo odciąć użytkownika. Błędna automatyczna reakcja na legalny program zatrzymuje czyjąś pracę i podkopuje zaufanie do narzędzia. Strojenie reakcji automatycznej jest trudniejsze i bardziej kosztowne w błędzie niż strojenie samych alertów.

12. **Głęboka telemetria stacji to głęboka inwigilacja pracownika — granica RODO.** EDR widzi *wszystko*, co pracownik robi na służbowym sprzęcie: jakie programy, jakie strony, kiedy. To jednocześnie narzędzie obrony i potencjalne narzędzie nadzoru. RODO i prawo pracy wymagają poinformowania pracowników o monitoringu, celowości i minimalizacji. To nie „dodatek prawny" — to element zawodowego rzemiosła i czerwona linia w projektach (patrz §7, uwaga Ryana).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty EDR/XDR muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania analityka SOC reagującego na końcówce / łowcy zagrożeń. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Dwa narzędziowe researche (Defender, CrowdStrike) **nie powielają tych projektów** — dokładają warianty „to samo w konkretnym ekosystemie" (patrz ich §5).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Czytanie telemetrii końcówki i drzewa procesów** — uruchomienie darmowego agenta (Velociraptor / próbny Defender), odczyt drzewa procesów, wskazanie podejrzanego rodzica-dziecka | Telemetria, drzewo procesów, podstawy zapytań, odczyt prostego zachowania | #1 |
| P2 | L2 | **Reguła wykrywania zachowania (IOA) + triage** — wykrycie wzorca „program biurowy uruchamia powłokę", odróżnienie TP/FP, raport triage | Wykrywanie zachowań, IOC vs IOA, triage, enrichment | #1, #2 |
| P3 | L2 | **Reagowanie na końcówce z uzasadnieniem** — decyzja izolacja vs obserwacja na scenariuszu (stacja vs serwer produkcyjny), wykonanie i udokumentowanie | Reagowanie (izolacja, kwarantanna), decyzja biznesowa | #3, #11 |
| P4 | L2/L3 | **Wykrycie ataku living-off-the-land** — atak na legalnych narzędziach systemowych (LOLBins), reguła oparta na kontekście, nie na pliku | Wykrywanie zachowań w trudnym przypadku, LOLBins | #6 |
| P5 | L3 | **Polowanie na zagrożenia oparte na hipotezie** — hipoteza zakotwiczona w ATT&CK, przeszukanie telemetrii, udokumentowany wynik (z luką) | Threat hunting, hipoteza, mapowanie ATT&CK | #5, #10 |
| P6 | L3 | **Mapowanie detekcji na MITRE ATT&CK + mapa luk** — zestaw reguł zachowań na techniki końcówki, świadomie nazwana luka pokrycia | Mapowanie ATT&CK, pokrycie, blind spots | #5, #10 |
| P7 | L3 | **Testowanie detekcji (Atomic Red Team)** — odtworzenie techniki na własnym labie, dowód, że reguła wykrywa; wykrycie próby manipulacji agentem | Testowanie detekcji, tamper, dowód wykrycia | #9, #6 |
| P8 | L3 | **Rekonstrukcja osi czasu incydentu** — złożenie z telemetrii pełnej historii ataku (wejście → ruch boczny → cel) | Rekonstrukcja timeline, korelacja końcówka↔reszta | #7, #8 |
| (P9–P11) | L4–L5 | **ZAPOWIEDŹ** — pełna reakcja na realny incydent z brudną telemetrią; architektura EDR→SIEM/XDR + ekonomia + decyzja MDR; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #4, #8, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów** (rdzeń rodziny; narzędziowe warianty Defender/CrowdStrike dokładają po 1–2, nie powielając teorii). L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z **obowiązkową klauzulą etyczno-prawną o monitoringu pracownika i RODO** (niuans #12), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (telemetria) → P2 (reguła IOA) → P3 (reakcja) → P4 (LOLBins) → P5 (polowanie) → P6 (ATT&CK) → P7 (test/tamper) → P8 (rekonstrukcja). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy *ani* prerekwizyt z SIEM.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

EDR/XDR **nie ma sensu** bez wcześniej opanowanych fundamentów detekcji i systemów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Podstawy detekcji i monitorowania — `SIEM`** (siostrzany research `siem.md`). Korelacja zdarzeń, próg, okno czasowe, triage TP/FP, mapowanie na MITRE ATT&CK, język zapytań (SPL/KQL) — to wszystko mieszka w SIEM i EDR/XDR **dziedziczy to jako bazę**. **Wymagane przed L2.** To najważniejszy prerekwizyt: bez niego student uczyłby się detekcji od zera w trudniejszym, węższym kontekście końcówki.
2. **Podstawy systemów operacyjnych — `Windows` i/lub `Linux`** (procesy, usługi, rejestr Windows, drzewo procesów). Bez tego student nie zinterpretuje telemetrii końcówki. Projekty partii 1 (`cyber-hardening-linux-bash`) budują bazę systemową. **Wymagane przed L1.**
3. **Pojęcie logu i odczytu zdarzeń** — domknięte częściowo przez `cyber-python-automatyzacja-logow` (partia 1, liść `Python`, wykrywanie brute-force z logów). **Wymagane/równoległe na L1.**
4. **Tożsamość i dostęp — `IAM` / `Active Directory`** (kto się loguje, czym jest konto i grupa, ruch boczny między kontami) — żeby zrozumieć alerty o przejęciu konta na końcówce i logikę korelacji XDR. Projekt partii 1 `cyber-iam-active-directory-lab` tworzy tę bazę. **Wymagane przed L3 (korelacja końcówka↔tożsamość).**
5. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — do interpretacji zdarzeń sieciowych z końcówki (połączenia wychodzące, adres docelowy). **Wymagane przed L2.**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 Kodeksu karnego, praca wyłącznie na własnym/treningowym systemie) **plus rozszerzenie o monitoring pracownika** (niuans #12). **Wymagane od L1.**

**Czego EDR/XDR dostarcza jako prerekwizyt dla innych liści grupy:** EDR/XDR jest fundamentem dla **`Microsoft Defender`** i **`CrowdStrike`** (oba to konkretne platformy klasy EDR/XDR — ich researche dziedziczą całą teorię stąd), zasila danymi `SOC` i `Incident Response` (reakcja na końcówce to rdzeń obsługi incydentu) oraz dokłada źródło telemetrii dla `SIEM` i automatyzacji `SOAR`. Dlatego EDR/XDR autorowany jest w rodzinie pierwszy, zaraz po SIEM.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja narzędzi (oficjalna, darmowa):**
- Microsoft Defender for Endpoint — dokumentacja: https://learn.microsoft.com/en-us/defender-endpoint/
- Microsoft Defender — zaawansowane polowanie w KQL (Kusto Query Language): https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-query-language
- CrowdStrike Falcon — dokumentacja i materiały (oficjalne): https://www.crowdstrike.com/resources/
- Velociraptor (otwartoźródłowy EDR/DFIR do laba — wykrywanie i analiza końcówek): https://docs.velociraptor.app/
- Sysmon (System Monitor, darmowe narzędzie Microsoft do głębokiej telemetrii procesów na Windows — fundament laba EDR): https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

**Wiedza o zagrożeniach, detekcji i testowaniu (otwarte, autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników, w tym techniki na końcówce): https://attack.mitre.org/
- MITRE Engenuity ATT&CK Evaluations (niezależne, jawne testy skuteczności produktów EDR — punkt odniesienia, jak czytać porównania narzędzi): https://attackevals.mitre-engenuity.org/
- Atomic Red Team (bezpieczne odwzorowania technik ATT&CK do testu detekcji na własnym labie): https://github.com/redcanaryco/atomic-red-team
- LOLBAS (Living Off The Land Binaries And Scripts — katalog legalnych narzędzi systemowych nadużywanych przez napastników): https://lolbas-project.github.io/
- Sigma (otwarty, neutralny format reguł detekcji — przenośny między platformami): https://github.com/SigmaHQ/sigma

**Standardy i normy (oficjalne):**
- NIST SP 800-61r2 „Computer Security Incident Handling Guide" (obsługa incydentów — rdzeń części „Response" w EDR): https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST Cybersecurity Framework 2.0 (funkcje Detect / Respond): https://www.nist.gov/cyberframework
- ENISA — materiały o wykrywaniu i reagowaniu (agencja UE ds. cyberbezpieczeństwa): https://www.enisa.europa.eu/

**Kontekst prawny EU/PL (do projektów i klauzul — szczególnie monitoring pracownika):**
- UODO — monitoring pracownika i dane osobowe w miejscu pracy (granice prawne głębokiej telemetrii stacji): https://uodo.gov.pl/
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/reagowania): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana (kluczowe dla tego liścia):** EDR to **głęboka inwigilacja stacji pracownika** — projekty MUSZĄ zawierać klauzulę o monitoringu pracownika (art. 22³ Kodeksu pracy — obowiązek poinformowania o monitoringu, celowość, proporcjonalność) obok standardowej klauzuli art. 267 KK. Lab wyłącznie na własnych/treningowych maszynach. Telemetria do ćwiczeń generowana samodzielnie (Atomic Red Team na własnym labie), nie pobierana z cudzych systemów. Wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Wersje próbne (Defender, CrowdStrike) używane zgodnie z regulaminem producenta — do potwierdzenia aktualności warunków przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu reagowania (Blue Team) i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research mylił EDR z antywirusem i z SIEM.** CISO: „junior, który mówi «EDR to lepszy antywirus», jest bezużyteczny — nie rozumie, po co go zatrudniam". **Poprawka:** dodałam w §2 wyraźne trzy rozróżnienia (EDR vs NGAV/EPP, EDR vs SIEM, EDR vs XDR) i osobny niuans #7 o granicach każdego narzędzia. Postawiłam wykrywanie zachowań (nie sygnatur) jako pierwszy niuans #1.

2. **Słabość: brak IOA vs IOC.** CISO: „to jest pierwsze pytanie na rozmowie o EDR — jeśli kandydat nie zna różnicy, kończymy rozmowę". **Poprawka:** wyniosłam IOC vs IOA do osobnej umiejętności L2 i niuansu #2, i powiązałam z living-off-the-land (#6) — bo to pokazuje, *dlaczego* IOA wygrywa z IOC.

3. **Słabość: reagowanie traktowane jak przycisk, bez kontekstu biznesowego.** CISO: „junior, który izoluje mój serwer produkcyjny w środku dnia bez pytania, robi mi drugi incydent". **Poprawka:** dodałam niuans #3 (izolacja = decyzja biznesowa) i osobny projekt P3, w którym student *uzasadnia* decyzję izolacja vs obserwacja na scenariuszu stacja-vs-serwer, oraz niuans #11 o koszcie fałszywego pozytywu z reakcją automatyczną.

4. **Słabość: polowanie na zagrożenia opisane jako „przeglądanie telemetrii".** CISO: „polowanie bez hipotezy to nie polowanie, to nuda za moje pieniądze". **Poprawka:** w L3 i niuansie #5 polowanie zaczyna się *zawsze* od hipotezy zakotwiczonej w ATT&CK; projekt P5 wymaga udokumentowanej hipotezy i wyniku (również negatywnego, z uzasadnieniem).

5. **Słabość: pominięta granica prawna głębokiej telemetrii.** CISO: „EDR widzi wszystko, co robi mój pracownik — junior, który nie rozumie monitoringu pracowniczego i RODO, narobi mi sprawy w sądzie pracy". **Poprawka:** dodałam niuans #12 (monitoring pracownika), uczyniłam klauzulę o art. 22³ Kodeksu pracy *obowiązkową* w każdym projekcie (§5, §6 pkt 6, uwaga dla Ryana w §7) — to specyfika EDR, której SIEM nie ma w tym stopniu.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (EDR, XDR, endpoint/końcówka, telemetria, sensor/agent, NGAV, EPP, drzewo procesów, behavioral detection, IOC, IOA, izolacja hosta/containment, LOLBins, threat hunting, dwell time, tamper, MDR, BYOD, lateral movement/ruch boczny, MITRE ATT&CK, Sigma, Atomic Red Team, KQL, triage, true/false positive, enrichment, threat intelligence, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie 8 projektów L1–L3 z niuansami #1–#7, #9–#11. Niuanse #4, #8 (ekonomia, dwell time w skali) i #12 w pełnej skali organizacyjnej wymagają L4/L5 — research je zapowiada, ale pełna „zawodowość" EDR/XDR domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione. **Granica dziedziczenia:** ten plik świadomie nie powtarza podstaw detekcji z `siem.md` (korelacja, próg, ATT&CK jako pojęcie) — zakłada je jako prerekwizyt (§6 pkt 1), żeby skupić głębię na specyfice końcówki. Defender i CrowdStrike dziedziczą dalej stąd.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
