# Research kompetencji: SOAR

> **Status:** research liścia koncepcyjnego w ETAP E3 — nadbudowuje nad wzorcem `tools/content/research/siem.md` (golden-example). SOAR jest warstwą *reakcji* domykającą cykl SIEM (wykrycie) → SOAR (zautomatyzowana odpowiedź); ten plik zakłada opanowany koncept SIEM i go nie powtarza.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SOAR` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **2,4%** ofert ścieżki wymienia SOAR |
| **Liczba ofert (`offers`)** | **9** |
| **`kind`** | `concept` (kompetencja koncepcyjna — klasa rozwiązań i sposób myślenia, nie jeden produkt — patrz §2) |
| **`lift`** | 26,74 (siła powiązania liścia z tą ścieżką — najwyższa w grupie) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| SIEM (liść-rdzeń, osobny plik) | 10,8 | 40 | concept |
| SOC | 5,1 | 19 | concept |
| Splunk | 4,3 | 16 | tool |
| EDR / XDR | 3,2 | 12 | tool |
| **SOAR** (ten plik) | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| Incident Response | 1,1 | 4 | concept |

**Wniosek dla autoringu:** SOAR ma niższy surowy popyt (2,4%, 9 ofert), ale **najwyższy `lift` w całej grupie (26,74)** — to znaczy, że gdy SOAR pojawia się w ofercie, jest bardzo silnie skorelowany właśnie z tą ścieżką (sygnał wyspecjalizowanej, dojrzałej roli SOC/inżyniera automatyzacji, nie przypadkowego dopisku). SOAR to **warstwa nadbudowana**: ma sens *wyłącznie* po opanowaniu wykrywania (SIEM) i reagowania (Incident Response). W kolejności autoringu idzie po rdzeniu SIEM i po Incident Response. Liść `kind: concept` potwierdza: rynek pyta o *umiejętność projektowania automatyzacji reakcji* (playbooki, integracje, decyzja „co automatyzować"), nie o jeden produkt — choć narzędzia (Splunk SOAR, Microsoft Sentinel, Tines, Shuffle) są jej nośnikiem.

---

## 2. Definicja kompetencji i jej rola w pracy

**SOAR (Security Orchestration, Automation and Response — orkiestracja, automatyzacja i reagowanie w bezpieczeństwie)** to klasa rozwiązań i sposób pracy, w którym **powtarzalne czynności reakcji na zagrożenie wykonuje maszyna według wcześniej zaprojektowanego scenariusza**, a człowiek decyduje tam, gdzie trzeba osądu. Rozbijmy nazwę, bo każde z trzech słów to osobna rzecz:

1. **Orkiestracja (orchestration — spinanie wielu narzędzi w jeden przepływ).** SOAR łączy przez interfejsy programistyczne (API — sposób, w jaki programy „rozmawiają" ze sobą) narzędzia, które normalnie działają osobno: SIEM, EDR (wykrywanie na stacji końcowej), zaporę, system zgłoszeń (ticketing), katalog tożsamości (Active Directory), komunikator. Zamiast analityka klikającego w pięć paneli — jeden spięty przepływ.
2. **Automatyzacja (automation — maszyna wykonuje kroki bez człowieka).** Czynności mechaniczne i powtarzalne (sprawdź adres IP w bazie zagrożeń, pobierz dane konta, załóż zgłoszenie, zablokuj plik) robi automat — w sekundy, bez zmęczenia, identycznie za każdym razem.
3. **Reagowanie (response — domknięcie cyklu od wykrycia do działania).** SOAR jest warstwą *po* wykryciu: SIEM mówi „dzieje się coś podejrzanego", SOAR wykonuje (lub przygotowuje) odpowiedź — blokadę konta, izolację stacji, powiadomienie zespołu.

Nośnikiem tego wszystkiego jest **playbook (scenariusz reakcji — zapisany krok po kroku ciąg działań na dany typ zdarzenia)**. Playbook to serce SOAR: „gdy przyjdzie alert typu X, zrób kroki 1–2–3 automatycznie, przy kroku 4 zapytaj człowieka, przy kroku 5 zamknij zgłoszenie".

**Czym SOAR NIE jest (rozróżnienie zawodowca):**
- **SOAR ≠ SIEM.** SIEM *wykrywa* (zbiera, koreluje, alarmuje); SOAR *reaguje* (orkiestruje i wykonuje odpowiedź po alercie). To dwa osobne liście grupy. SOAR często bierze alert *ze* SIEM jako wejście — są komplementarne, nie zamienne. (Granica zaciera się w produktach „SIEM+SOAR w jednym", ale jako *kompetencje* to dwie różne umiejętności.)
- **SOAR ≠ „zautomatyzuj wszystko".** Najważniejsza część kompetencji to wiedza, **czego NIE automatyzować** — bo automatyzacja błędnej decyzji powiela ten błąd w skali i z prędkością maszyny (patrz niuanse §4). To odróżnia inżyniera SOAR od entuzjasty skryptów.
- **SOAR to nie jeden produkt.** To klasa: Splunk SOAR (dawniej Phantom), Microsoft Sentinel (z mechanizmem playbooków na bazie Azure Logic Apps), Tines, Shuffle (otwartoźródłowy — ważny dla darmowego laba). Kompetencja jest przenośna; produkt to nośnik.

**Kto tego używa i jak wygląda dzień pracy.** SOAR to domena **inżyniera automatyzacji SOC / inżyniera SOAR** oraz dojrzałego **analityka SOC (Security Operations Center — centrum monitorowania bezpieczeństwa)**. Typowo:
- **Analityk SOC** korzysta z gotowych playbooków: alert przychodzi już *wzbogacony* (SOAR sam dociągnął kontekst — kto, skąd, czy znane zagrożenie), a część rutyny jest odklikana. Dzięki temu analityk zajmuje się osądem, nie kopiowaniem danych między panelami.
- **Inżynier SOAR** projektuje, testuje i utrzymuje playbooki, podłącza integracje przez API, mierzy oszczędność czasu i pilnuje, by automat nie wyrządził szkody (np. nie zablokował konta prezesa o 3 w nocy na podstawie fałszywego alarmu).

**Po co rynkowi ta kompetencja.** SOC tonie w alertach (zmęczenie alertami — alert fatigue, patrz research SIEM §4). SOAR to odpowiedź na deficyt ludzi i nadmiar powtarzalnej roboty: pozwala obsłużyć więcej zdarzeń tym samym zespołem i skrócić **MTTR (Mean Time To Respond — średni czas reakcji)**. Regulacje EU (NIS2, DORA) wymagają reakcji na incydent w krótkich terminach — SOAR jest sposobem dotrzymania tych terminów powtarzalnie. Wysoki `lift` (26,74) mówi, że to kompetencja dojrzałych zespołów — i dlatego ceniona.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić*. Ponieważ SOAR nadbudowuje nad wykryciem (SIEM) i reakcją (Incident Response), **każdy poziom zakłada opanowany odpowiadający mu zakres tych prerekwizytów** i dokłada wyłącznie warstwę orkiestracji/automatyzacji.

### L1 — Fundamenty: czym jest playbook i przepływ reakcji (3–6 h)

**Zakres wiedzy/umiejętności:**
- Pojęcie playbooka (scenariusza reakcji): wejście (wyzwalacz — np. alert SIEM), kroki, rozgałęzienia (warunek „jeśli to, zrób tamto"), wyjście (zamknięcie zgłoszenia / powiadomienie).
- Rozróżnienie trzech rzeczy w nazwie SOAR (orkiestracja vs automatyzacja vs reagowanie) na konkretnym przykładzie.
- **Mapowanie ręcznego procesu na schemat:** wzięcie istniejącej, ręcznej procedury reakcji (np. „przyszedł alert o podejrzanym logowaniu — co robi analityk krok po kroku") i narysowanie jej jako diagramu przepływu, *zanim* cokolwiek się automatyzuje. To fundament — automatyzuje się zrozumiany proces, nie chaos.
- Uruchomienie darmowego/otwartoźródłowego środowiska SOAR (np. **Shuffle** — otwarty SOAR) albo przejście oficjalnego samouczka playbooka.

**Co student musi UMIEĆ ZROBIĆ:** opisać ręczny proces reakcji na jeden typ alertu jako diagram przepływu z krokami i rozgałęzieniami; wskazać w nim, które kroki są czysto mechaniczne (kandydaci do automatyzacji), a które wymagają osądu człowieka; zbudować najprostszy playbook (wyzwalacz → 1–2 kroki → powiadomienie) w darmowym narzędziu.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Nie automatyzujesz narzędzia — automatyzujesz proces.** Amator zaczyna od „co umie kliknąć SOAR"; zawodowiec zaczyna od mapy ręcznego procesu i pyta „który krok jest powtarzalny i bezpieczny do oddania maszynie". Automatyzacja niezrozumianego procesu betonuje bałagan.
- **Każdy automatyczny krok musi mieć jasne wejście i wyjście.** Krok „sprawdź IP" jest bezwartościowy, jeśli playbook nie wie, *co zrobić* z wynikiem. Junior buduje kroki; zawodowiec buduje *decyzje* między krokami.

### L2 — Zastosowanie: integracje przez API i playbook z wzbogacaniem (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Integracja przez API (interfejs programistyczny — sposób, w jaki SOAR „rozmawia" z innym narzędziem):** pojęcie żądania i odpowiedzi, klucza dostępu (token/klucz API), formatu danych (JSON — tekstowy format wymiany danych). Podłączenie jednej zewnętrznej usługi do playbooka (np. publiczna baza reputacji adresów IP / domen).
- **Playbook wzbogacający alert (enrichment — dociąganie kontekstu):** automatyczne pobranie informacji o adresie/koncie/pliku z alertu i dołączenie ich, tak by analityk dostał alert „gotowy do osądu". To narzędziowa realizacja wzbogacania znanego z research SIEM §3 (L2).
- **Rozgałęzienia i warunki:** logika „jeśli reputacja zła → eskaluj; jeśli nieznana → poproś człowieka o decyzję; jeśli dobra → zamknij jako fałszywy alarm". Pojęcie progu pewności w automatyzacji.
- **Bramka decyzji człowieka (human-in-the-loop — człowiek w pętli):** świadome wstawienie kroku „zatrzymaj i zapytaj analityka" przed każdym działaniem nieodwracalnym. Mechanizm zatwierdzenia.
- **Obsługa błędów i ponowień (error handling):** co robi playbook, gdy integracja nie odpowie albo zwróci błąd — bo automat, który „cicho pada", jest gorszy niż brak automatu.

**Co student musi UMIEĆ ZROBIĆ:** podłączyć przez API jedną zewnętrzną usługę do playbooka; zbudować playbook, który wzbogaca alert i rozgałęzia się wg wyniku; wstawić świadomą bramkę zatwierdzenia człowieka przed działaniem nieodwracalnym; dodać obsługę błędu integracji; opisać, dlaczego dany krok jest (lub nie jest) bezpieczny do pełnej automatyzacji.

**Profesjonalne niuanse:**
- **Bramka „human-in-the-loop" to nie brak zaufania do automatu — to projekt ryzyka.** Działania odwracalne (wzbogać, załóż zgłoszenie, powiadom) automatyzuje się śmiało. Działania nieodwracalne lub uderzające w ludzi (zablokuj konto, izoluj serwer produkcyjny) dostają bramkę zatwierdzenia. Zawodowiec klasyfikuje każdy krok wg odwracalności — to ten sam wzorzec, co czerwone linie firmy.
- **Klucz API w playbooku to sekret — nie wkleja się go do treści.** Junior wpisuje token na sztywno w krok playbooka; zawodowiec trzyma go w magazynie sekretów narzędzia. Wyciek klucza SOAR = klucze do całego SOC.
- **Automat bez obsługi błędu kłamie ciszą.** Playbook, który przy awarii integracji po prostu „kończy się", zostawia incydent nieobsłużony, a SOC w przekonaniu, że „SOAR to ogarnął". Cisza automatu jest groźniejsza niż cisza człowieka.

### L3 — Portfolio: playbook reakcji end-to-end z metrykami i bezpiecznikami (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Playbook reakcji od alertu do domknięcia** dla realnego scenariusza (np. przejęcie konta — account takeover): wejście z SIEM → wzbogacenie → ocena ryzyka → rozgałęzienie (auto-akcja dla niskiego ryzyka, bramka człowieka dla wysokiego) → wykonanie reakcji → zapis i zamknięcie zgłoszenia → powiadomienie.
- **Powiązanie z Incident Response:** osadzenie playbooka w fazach obsługi incydentu (wg NIST SP 800-61: przygotowanie → wykrycie/analiza → powstrzymanie/eliminacja/odtworzenie → wnioski). Które fazy SOAR wspiera, a których (analiza źródłowa, decyzja strategiczna) nie zastępuje.
- **Metryki oszczędności i jakości:** pomiar, *ile* czasu playbook oszczędza (czas ręczny vs zautomatyzowany na zdarzenie), skrócenie MTTR, liczba zdarzeń obsłużonych bez człowieka, oraz — krytycznie — **wskaźnik błędnych auto-akcji** (ile razy automat zadziałał na fałszywym alarmie).
- **Bezpieczniki i wycofanie (kill switch + rollback):** mechanizm awaryjnego wyłączenia playbooka i — gdzie to możliwe — cofnięcia jego skutku (np. odblokowanie błędnie zablokowanego konta). Plan „co, gdy automat się myli".
- **Testowanie playbooka:** uruchomienie na danych testowych/symulacji *przed* wpięciem do produkcji; potwierdzenie, że rozgałęzienia i bramki działają, zanim automat dostanie realną władzę.

**Co student musi UMIEĆ ZROBIĆ:** zbudować i przetestować playbook reakcji end-to-end z co najmniej jedną auto-akcją i jedną bramką człowieka; osadzić go w fazach Incident Response; policzyć metryki oszczędności czasu i wskaźnik błędnych auto-akcji; zaprojektować bezpiecznik (wyłącznik awaryjny) i opisać scenariusz wycofania. To poziom „portfolio na rozmowę o pracę inżyniera automatyzacji SOC".

**Profesjonalne niuanse:**
- **Metryka „oszczędzony czas" bez metryki „błędne auto-akcje" to połowa prawdy — ta groźniejsza.** Playbook, który oszczędza 20 godzin miesięcznie, ale raz na tydzień blokuje niewinne konto, może kosztować więcej (zaufanie biznesu, przestoje), niż oszczędza. Zawodowiec raportuje obie liczby razem.
- **Automatyzacja w niedojrzałym SOC powiela bałagan szybciej.** SOAR nałożony na proces pełen fałszywych alarmów automatyzuje *reagowanie na szum*. Najpierw porządkuje się detekcję (SIEM), potem automatyzuje reakcję. Odwrotna kolejność to wzmacniacz problemu.
- **Playbook bez właściciela i bez przeglądu gnije.** Integracje się zmieniają (API się aktualizuje), zagrożenia ewoluują. Playbook „ustawiony i zapomniany" po pół roku działa na nieaktualnych założeniach — i nikt tego nie zauważy, dopóki nie zawiedzie w incydencie.

### L4 — Realny przypadek profesjonalny: automatyzacja reakcji w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Wzięcie *realnego, zaszumionego* strumienia alertów (z fałszywymi pozytywami, niespójnym kontekstem) i zaprojektowanie zestawu playbooków, które realnie odciążają SOC, nie tworząc nowego ryzyka — z jawną decyzją, które kroki dostają bramkę człowieka.
- Scenariusz branżowy z regulacją (np. wymóg reakcji/zgłoszenia w terminach DORA dla firmy finansowej) — playbook musi nie tylko reagować, ale i udokumentować reakcję na potrzeby audytu.
- **Benchmark:** wynik studenta (oszczędność czasu, MTTR, wskaźnik błędnych auto-akcji, pokrycie scenariusza) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: strategia automatyzacji SOC i jej granice (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia: co automatyzować, a czego nie, w skali całego SOC** — świadoma mapa procesów wg odwracalności i ryzyka, decyzja o stopniowym oddawaniu władzy automatowi w miarę wzrostu zaufania (i danych o jego trafności).
- **Zarządzanie playbookami jako kodem (automation-as-code):** wersjonowanie, testy, przegląd zmian, wdrożenie jak oprogramowanie — dojrzałość zespołu automatyzacji.
- **Ekonomia i granice:** kiedy automatyzacja przestaje się opłacać (koszt utrzymania playbooka > oszczędność), ryzyko nadmiernej automatyzacji (kruchość, ślepe zaufanie, utrata kompetencji ręcznej u analityków).
- **Benchmark** wobec rozwiązania realnego architekta SOC: nie „czy automatyzuje", lecz „czy automatyzuje *właściwe* rzeczy, bezpiecznie i w sposób utrzymywalny".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Niuanse konceptu SIEM (alert fatigue, triage, jakość danych, granica prawna) obowiązują tu w całości — patrz research SIEM §4. Poniżej **specyficzne dla SOAR** decyzje i pułapki.

1. **Czego NIE automatyzować to ważniejsza decyzja niż co automatyzować.** Automatyzacja błędnej reakcji powiela błąd z prędkością i skalą maszyny. Działania nieodwracalne (blokada konta, izolacja serwera produkcyjnego, usunięcie pliku) wymagają bramki człowieka albo bardzo wysokiej pewności. To rdzeń kompetencji — i pierwszy filtr, którym rekruter odróżnia inżyniera od entuzjasty skryptów.

2. **Klasyfikacja kroków wg odwracalności.** Zawodowiec dzieli każdy krok playbooka na: odwracalny i bezpieczny (wzbogać, załóż zgłoszenie, powiadom — automatyzuj śmiało), odwracalny ale wrażliwy (oznacz konto — automatyzuj z logiem), nieodwracalny / uderzający w ludzi (zablokuj, izoluj, skasuj — bramka człowieka). To ten sam wzorzec myślenia co czerwone linie i human-in-the-loop w odpowiedzialnym projektowaniu systemów.

3. **Metryka oszczędności czasu MUSI iść w parze z metryką błędu.** „Zaoszczędziliśmy X godzin" bez „automat pomylił się Y razy" to liczba reklamowa, nie inżynierska. Wartość playbooka to oszczędność *minus* koszt błędnych auto-akcji (przestoje, utrata zaufania biznesu).

4. **SOAR wzmacnia dojrzały SOC i pogarsza niedojrzały.** Automatyzacja nałożona na proces pełen fałszywych alarmów automatyzuje reagowanie na szum. Kolejność jest twarda: najpierw porządna detekcja i triage (SIEM/SOC), potem automatyzacja reakcji. Amator zaczyna od SOAR „bo modne".

5. **Obsługa błędów i cicha awaria.** Automat, który przy awarii integracji kończy się bez śladu, zostawia incydent nieobsłużony przy fałszywym poczuciu „SOAR to ogarnął". Każdy playbook potrzebuje ścieżki błędu, ponowień i powiadomienia człowieka, gdy automatyka zawiedzie.

6. **Bezpiecznik i wycofanie (kill switch + rollback).** Dojrzały playbook ma awaryjny wyłącznik i — gdzie możliwe — plan cofnięcia skutku (odblokuj błędnie zablokowane konto). „Co, gdy automat się myli" to projekt, nie improwizacja w trakcie incydentu.

7. **Sekrety i uprawnienia automatu.** SOAR ma potężne uprawnienia (potrafi blokować konta, izolować maszyny) — to łakomy cel. Klucze API w magazynie sekretów (nie na sztywno w playbooku), zasada najmniejszych uprawnień dla integracji, log każdej auto-akcji. Przejęty SOAR to przejęty cały SOC.

8. **Utrzymanie: playbook to żywy organizm, nie „ustaw i zapomnij".** API integracji się zmieniają, zagrożenia ewoluują, założenia się starzeją. Playbook bez właściciela i okresowego przeglądu cicho dezaktualizuje się i zawodzi dokładnie wtedy, gdy jest potrzebny.

9. **Granica prawna i RODO w automatyzacji.** Playbook operuje na danych osobowych (adres IP — wyrok TSUE Breyer, C-582/14; konta, dane pracowników) i podejmuje działania wobec ludzi (blokada konta pracownika). Automatyczne decyzje dotykające osób mają wymiar RODO (m.in. art. 22 RODO o decyzjach automatycznych) — log, możliwość interwencji człowieka i uzasadnienie to nie „dodatek", lecz wymóg. Praca wyłącznie na własnym/treningowym systemie (art. 267 Kodeksu karnego), jak w każdym projekcie cyber.

10. **Przenośność kompetencji.** Logika playbooka (proces, decyzje, klasyfikacja odwracalności) przenosi się między narzędziami (Splunk SOAR, Sentinel, Tines, Shuffle). Zawodowiec uczy się *projektowania automatyzacji*; amator — klikania w jednym edytorze playbooków i jest bezradny przy zmianie platformy.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SOAR muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał projektować i utrzymywać automatyzację reakcji jak inżynier SOC — **nie powtarzając** pokrycia detekcji (to robią projekty SIEM) ani teorii incydentu (Incident Response). Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| R1 | L1 | **Od ręcznego procesu do playbooka** — zmapowanie ręcznej procedury reakcji jako diagram, oznaczenie kroków mechanicznych vs wymagających osądu, najprostszy playbook (wyzwalacz → krok → powiadomienie) w darmowym narzędziu (np. Shuffle) | Pojęcie playbooka, mapowanie procesu, orkiestracja/automatyzacja/reakcja | #1 |
| R2 | L2 | **Integracja przez API + wzbogacanie alertu** — podłączenie jednej publicznej usługi reputacji, playbook dociągający kontekst do alertu | Integracja API, JSON/token, wzbogacanie | #7 |
| R3 | L2 | **Rozgałęzienia i bramka człowieka** — logika wg progu pewności, świadoma bramka zatwierdzenia przed działaniem nieodwracalnym | Rozgałęzienia, human-in-the-loop, klasyfikacja odwracalności | #1, #2 |
| R4 | L2 | **Obsługa błędów playbooka** — co robi automat, gdy integracja zawiedzie: ponowienia, ścieżka błędu, powiadomienie człowieka | Error handling, cicha awaria | #5 |
| R5 | L3 | **Playbook reakcji end-to-end** — np. przejęcie konta: alert → wzbogacenie → ocena ryzyka → auto-akcja / bramka → reakcja → zamknięcie zgłoszenia; osadzenie w fazach Incident Response (NIST 800-61) | Playbook end-to-end, powiązanie z IR | #2, #4 |
| R6 | L3 | **Metryki i bezpieczniki** — pomiar oszczędności czasu + MTTR + wskaźnik błędnych auto-akcji; wyłącznik awaryjny i scenariusz wycofania | Metryki oszczędności/jakości, kill switch, rollback | #3, #6 |
| R7 | L3 | **Testowanie playbooka przed produkcją** — uruchomienie na symulacji, potwierdzenie rozgałęzień i bramek zanim automat dostanie realną władzę | Testowanie playbooka, dojrzałość przed wdrożeniem | #4, #8 |
| (R8–R10) | L4–L5 | **ZAPOWIEDŹ** — realny zaszumiony strumień + scenariusz branżowy (DORA) z dokumentacją reakcji do audytu; strategia „co automatyzować w skali", automation-as-code, ekonomia i granice automatyzacji; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #8, #9, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 7 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku).

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** R1 (proces→playbook) → R2 (integracja/wzbogacanie) → R3 (rozgałęzienia/bramka) → R4 (błędy) → R5 (end-to-end + IR) → R6 (metryki/bezpieczniki) → R7 (testowanie). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy ani prerekwizyt z §6.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

SOAR **nie ma sensu** bez wcześniej opanowanego wykrywania i reagowania — to warstwa nadbudowana. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Koncept SIEM (liść-rdzeń `SIEM`)** — *nadrzędny prerekwizyt.* SOAR reaguje na to, co wykrył SIEM. Bez rozumienia alertu, triage'u, prawdziwego vs fałszywego pozytywu student nie zaprojektuje sensownego wyzwalacza ani rozgałęzienia playbooka. **Wymagane przed L1 SOAR** (cały koncept wykrywania).
2. **Incident Response (liść `Incident Response`)** — SOAR automatyzuje *część* reakcji na incydent; bez rozumienia faz obsługi incydentu (NIST 800-61: przygotowanie → wykrycie → powstrzymanie → odtworzenie → wnioski) student zautomatyzuje kroki w oderwaniu od cyklu. **Wymagane przed L3** (gdzie playbook osadza się w fazach IR). *Uwaga dla Ethana/Leo: Incident Response (1,1%, kind concept) nie ma jeszcze własnego researchu — patrz §9, zależność do rozstrzygnięcia.*
3. **Podstawy programistyczne / praca z API i JSON** — integracje SOAR to wywołania API zwracające JSON; bez pojęcia żądania/odpowiedzi, klucza dostępu, formatu danych student nie podłączy integracji. Bazę daje liść `Python` (projekt partii 1 `cyber-python-automatyzacja-logow`). **Wymagane przed L2.**
4. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (czym jest konto, blokada konta, grupa) — bo najczęstsze auto-akcje SOAR dotyczą tożsamości. **Wymagane przed L3** (playbooki reakcji na przejęcie konta).
5. **Podstawy SOC** (liść `SOC`) — kontekst pracy zespołu, dla którego SOAR jest narzędziem; bez tego automatyzacja jest „w próżni". **Zalecane przed L2.**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 Kodeksu karnego; przy SOAR dodatkowo art. 22 RODO — decyzje automatyczne wobec osób). **Wymagane od L1.**

**Czego SOAR dostarcza dalej:** SOAR domyka grupę „SIEM i Monitorowanie Zdarzeń" — jest ostatnią warstwą cyklu (wykrycie → reakcja → automatyzacja reakcji). Nie jest prerekwizytem innych liści grupy; jest ich zwieńczeniem. Dlatego w kolejności autoringu grupy SOAR idzie **na końcu** (po SIEM, SOC, narzędziach i Incident Response).

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość. Część (MITRE, NIST, kontekst prawny) wspólna z research SIEM; tu dochodzą źródła specyficzne dla automatyzacji reakcji.

**Dokumentacja narzędzi SOAR (oficjalna/otwarta, darmowa do nauki):**
- Shuffle — otwartoźródłowy SOAR, dokumentacja (darmowy lab): https://shuffler.io/docs
- Splunk SOAR (dawniej Phantom) — dokumentacja playbooków: https://docs.splunk.com/Documentation/SOAR
- Microsoft Sentinel — automatyzacja i playbooki (Logic Apps): https://learn.microsoft.com/en-us/azure/sentinel/automation/automation
- Tines — biblioteka publicznych playbooków/szablonów (do inspiracji procesem): https://www.tines.com/library/

**Standardy i ramy reagowania (oficjalne, autorytatywne):**
- NIST SP 800-61r2 „Computer Security Incident Handling Guide" (fazy obsługi incydentu — fundament osadzenia playbooka): https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST Cybersecurity Framework 2.0 (funkcja Respond/Recover): https://www.nist.gov/cyberframework
- MITRE ATT&CK (techniki napastników — wejście dla wyzwalaczy playbooków): https://attack.mitre.org/
- SANS Reading Room — automatyzacja SOC i Incident Response (białe księgi, darmowe): https://www.sans.org/white-papers/

**Dane / usługi do ćwiczeń (publiczne, otwarte):**
- Publiczne API reputacji do wzbogacania (np. AbuseIPDB, VirusTotal — darmowe limity; weryfikacja regulaminu darmowego użycia przez Ryana): https://www.abuseipdb.com/ , https://www.virustotal.com/
- Splunk Boss of the SOC (BOTS v3) — zbiór alertów/zdarzeń do zasilenia playbooków testowych: https://github.com/splunk/botsv3

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- RODO, art. 22 (zautomatyzowane podejmowanie decyzji wobec osób — kluczowe dla auto-akcji SOAR): https://eur-lex.europa.eu/eli/reg/2016/679
- Dyrektywa NIS2 (reakcja/zgłaszanie incydentów w terminach): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego, terminy reakcji): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje oficjalne/otwarte; brak źródeł pirackich. **Dwie rzeczy do szczególnej weryfikacji:** (1) publiczne API reputacji (AbuseIPDB, VirusTotal) mają regulaminy darmowego użytku i limity — projekt musi wskazać darmowy wariant i nie zachęcać do łamania regulaminu; (2) **art. 22 RODO** (decyzje automatyczne) jest tu prawnie istotniejszy niż w innych liściach grupy, bo SOAR *podejmuje działania wobec osób* (blokada konta pracownika) — klauzula projektu musi to adresować, nie tylko art. 267 KK. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia inżynierów automatyzacji SOC z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research był „automatyzuj wszystko" — bez kultury powściągliwości.** Pierwsza wersja celebrowała ile da się zautomatyzować. CISO: „junior, który automatyzuje blokadę konta na fałszywym alarmie, jest groźniejszy niż brak automatyzacji — w godzinę zablokuje pół firmy". **Poprawka:** uczyniłam „czego NIE automatyzować" niuansem #1 (najważniejszym), dodałam klasyfikację kroków wg odwracalności (#2) i bramkę human-in-the-loop jako osobną umiejętność L2 (projekt R3). To rdzeń kompetencji, nie przypis.

2. **Słabość: metryka oszczędności bez metryki błędu.** CISO: „każdy sprzeda mi «oszczędziliśmy 30 godzin»; pytam, ile razy automat się pomylił — i tu junior milczy". **Poprawka:** niuans #3 i projekt R6 wymagają *pary* metryk — oszczędność czasu ORAZ wskaźnik błędnych auto-akcji. Wartość = oszczędność minus koszt błędu.

3. **Słabość: SOAR w oderwaniu od dojrzałości SOC.** CISO: „SOAR na rozsypanym SIEM to automatyzacja chaosu — najpierw detekcja, potem automatyzacja". **Poprawka:** niuans #4 i twarda kolejność prerekwizytów w §6 (SIEM i Incident Response *przed* SOAR); §1 podkreśla, że SOAR to warstwa nadbudowana, a wysoki `lift` to sygnał roli dojrzałej, nie wejściowej.

4. **Słabość: brak „co, gdy automat zawiedzie".** Pierwsza wersja kończyła na „playbook działa". CISO: „interesuje mnie, co się dzieje, gdy integracja padnie albo automat się pomyli — bo *to* się zdarzy". **Poprawka:** dodałam obsługę błędów (#5, projekt R4), bezpiecznik i wycofanie — kill switch + rollback (#6, projekt R6), oraz testowanie przed produkcją (projekt R7). Automat bez planu awarii to teatr.

5. **Słabość: RODO potraktowane jak w innych liściach (tylko art. 267 KK).** CISO: „SOAR *podejmuje decyzje wobec ludzi* — blokuje konta pracowników; to jest art. 22 RODO, nie tylko «nie włamuj się»". **Poprawka:** wyniosłam wymiar prawny auto-decyzji do niuansu #9 i dodałam jawną notę do Ryana w §7 — art. 22 RODO (decyzje automatyczne) jako prawnie istotniejszy tu niż gdzie indziej w grupie. Uczciwie oznaczone jako punkt do recenzji prawnej.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (SOAR, orkiestracja, automatyzacja, reagowanie, playbook, SIEM, SOC, EDR, API, JSON, token/klucz API, enrichment/wzbogacanie, human-in-the-loop, error handling, kill switch, rollback, MTTR, true/false positive, Incident Response, NIST 800-61, MITRE ATT&CK, account takeover, automation-as-code, CISO, NIS2, DORA, RODO art. 22, art. 267 KK). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego do roli inżyniera automatyzacji SOC" — spełniony, jeśli autoring domknie projekty L1–L3 (R1–R7) z niuansami #1–#7 *na bazie* opanowanego SIEM i Incident Response. Niuanse #8, #9, #10 (utrzymanie w skali, RODO auto-decyzji, strategia/granice automatyzacji) wymagają L4/L5 — research je zapowiada, ale pełna „zawodowość" SOAR domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
