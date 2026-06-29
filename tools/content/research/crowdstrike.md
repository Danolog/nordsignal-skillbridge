# Research kompetencji: CrowdStrike

> **Status:** research liścia-narzędzia rodziny „detekcja na końcówce" (endpoint) w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **Teorię detekcji dziedziczy w całości z `edr-xdr.md`** (rdzeń rodziny): wykrywanie zachowań, IOC vs IOA, izolacja hosta, polowanie na zagrożenia, mapowanie na MITRE ATT&CK. Ten plik **nie powtarza** tych podstaw — skupia się na specyfice platformy CrowdStrike Falcon.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — monitoring pracownika, telemetria w chmurze dostawcy spoza EU) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `CrowdStrike` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%**) |
| **Popyt liścia (`demandPercentage`)** | **1,6%** ofert ścieżki wymienia CrowdStrike |
| **Liczba ofert (`offers`)** | **6** |
| **`kind`** | `tool` (konkretna platforma klasy EDR/XDR — CrowdStrike Falcon) |
| **`lift`** | 22,92 |
| **Liść-rdzeń (dziedziczona teoria)** | `EDR / XDR` → `tools/content/research/edr-xdr.md` |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Wniosek dla autoringu:** CrowdStrike to *konkretyzacja* kompetencji EDR/XDR w wiodącej, „czysto bezpieczeństwowej" platformie chmurowej — przeciwwaga dla Microsoft Defendera. Oferty często wymieniają je zamiennie („EDR, np. CrowdStrike lub Defender"), ale CrowdStrike pojawia się głównie w firmach, dla których bezpieczeństwo to *osobna* warstwa, nie dodatek do Microsoft 365 — większe organizacje, sektor finansowy, firmy po incydencie. Popyt 1,6% (6 ofert), identyczny jak Defender. Research jest cienki w teorii (ta jest w `edr-xdr.md`), gruby w specyfice: model jednego lekkiego czujnika w chmurze, podejście oparte na IOA, polowanie w języku zapytań Falcona i zdalny dostęp do końcówki (RTR). Autoring to **warianty „to samo, ale w Falconie"** projektów rdzenia EDR/XDR.

---

## 2. Definicja kompetencji i jej rola w pracy

**CrowdStrike Falcon** to chmurowa platforma ochrony i wykrywania na końcówkach. Jej znak rozpoznawczy — i to, co realnie różni ją od Defendera — sprowadza się do czterech rzeczy:

- **Jeden lekki czujnik (single lightweight sensor).** Na końcówce instaluje się *jeden* mały agent, który zbiera telemetrię i wysyła ją do chmury CrowdStrike (Falcon to platforma „cloud-native" — zaprojektowana od początku jako usługa w chmurze, bez serwera u klienta). Całe przetwarzanie, korelacja i historia dzieją się w chmurze, nie na maszynie. To zmienia ekonomię (#4 z rdzenia) i wydajność końcówki w stosunku do rozwiązań cięższych.
- **Threat Graph (graf zagrożeń).** Telemetria ze wszystkich końcówek wszystkich klientów spływa do wielkiego grafu zdarzeń w chmurze, gdzie CrowdStrike koreluje je w czasie zbliżonym do rzeczywistego. To techniczne serce „wykrywania zachowań" z `edr-xdr.md`, w wykonaniu Falcona.
- **Podejście oparte na IOA (Indicator of Attack — wskaźnik ataku).** CrowdStrike rozsławił detekcję opartą na *zachowaniu w trakcie ataku*, nie na śladach po fakcie (IOC). To dokładnie rozróżnienie z `edr-xdr.md §4 #2` — tu jest filozofią produktu, nie dodatkiem.
- **Modułowa platforma.** Falcon to zestaw modułów na wspólnym czujniku: **Falcon Insight** (właściwy EDR — wykrywanie i reagowanie), **Falcon Prevent** (NGAV — antywirus nowej generacji, blokowanie), **Falcon OverWatch** (zarządzane polowanie — zespół CrowdStrike poluje za klienta, realizacja modelu MDR z `edr-xdr.md` L5), **Falcon Discover** (widoczność zasobów). Junior musi wiedzieć, że „CrowdStrike" w ofercie to zwykle Insight + Prevent.

**Spoiwo całości — język zapytań i polowanie.** Polowanie na zagrożenia w Falconie odbywa się przez wyszukiwanie zdarzeń (Falcon event search) oraz — w nowszej warstwie zarządzania logami **Falcon LogScale** (dawniej Humio) — własny język zapytań. Umiejętność „zadać pytanie telemetrii" jest tu, jak w Defenderze KQL, centralna; różni się składnią, nie ideą.

**Zdalny dostęp do końcówki — Real Time Response (RTR).** Falcon pozwala analitykowi *wejść* na zainfekowaną maszynę zdalnie (powłoka), zebrać dowody, zabić proces, usunąć plik — w trakcie incydentu, bez chodzenia do urządzenia. To konkretyzacja „reagowania na końcówce" z `edr-xdr.md §3`, mocniejsza i bardziej bezpośrednia niż typowa izolacja — i przez to bardziej wrażliwa prawnie (§7).

**Czym specyfika Falcona różni się od ogólnego EDR/XDR (sedno tego pliku):** model jednego czujnika w chmurze (lekkość + zależność od łączności z chmurą), filozofia IOA jako rdzeń, graf zagrożeń jako mechanizm korelacji, OverWatch jako gotowy model zarządzanego polowania, RTR jako bezpośredni zdalny dostęp. Reszta — czym jest wykrywanie zachowań, izolacja, ATT&CK — to `edr-xdr.md`.

**Kto tego używa.** Analityk SOC i łowca zagrożeń w większych organizacjach i sektorze finansowym, specjalista reagowania na incydenty (CrowdStrike jest częsty w firmach *po* poważnym włamaniu), zespoły, które chcą bezpieczeństwa niezależnego od dostawcy systemu operacyjnego.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował (niezmiennik §4 frameworku). **Poziomy zakładają opanowaną teorię detekcji z `edr-xdr.md`** — tu nadbudowujemy *specyfikę Falcona* (patrz §6).

### L1 — Fundamenty: konsola Falcon, czujnik, wyszukiwanie zdarzeń (3–6 h)

**Zakres wiedzy/umiejętności (specyfika CrowdStrike):**
- Orientacja w konsoli Falcon: gdzie są hosty (z czujnikiem), wykrycia (detections), incydenty; pojęcie jednego czujnika i jego stanu (online/offline, „czujnik zamilkł" = niuans #9 z rdzenia w realiach Falcona).
- **Model IOA w praktyce:** odczytanie wykrycia opartego na wskaźniku ataku — Falcon pokazuje *zachowanie* i jego mapowanie na MITRE ATT&CK; student weryfikuje, nie przyjmuje na wiarę.
- **Wyszukiwanie zdarzeń (event search):** podstawowe zapytanie po hoście, procesie, czasie; odczyt drzewa procesów w widoku Falcona.
- Rozróżnienie modułów: co robi Insight (EDR), co Prevent (NGAV) — żeby junior wiedział, czego dotyczy jego praca.

**Co student musi UMIEĆ ZROBIĆ:** odnaleźć w konsoli wykrycie i incydent; odczytać, na czym oparł się IOA i jaką technikę ATT&CK wskazuje; napisać 3–5 zapytań wyszukujących zdarzenia; odczytać drzewo procesów.

**Profesjonalne niuanse (specyfika CrowdStrike):**
- **Czujnik offline = ślepota, nie spokój.** W modelu chmurowym końcówka bez łączności nie wysyła telemetrii — i nie jest chroniona w pełni. Junior, który widzi „brak wykryć", musi najpierw sprawdzić, czy czujnik *w ogóle raportuje*.
- **Wykrycie Falcona jest już zmapowane na ATT&CK — ale mapowanie trzeba rozumieć, nie ufać.** Student ma umieć powiedzieć, *dlaczego* to ta technika, a nie tylko przepisać etykietę.

### L2 — Zastosowanie: polowanie w Falconie, reagowanie, RTR (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Polowanie w wyszukiwaniu zdarzeń / LogScale:** zapytanie wykrywające wzorzec zachowania (IOA), łączenie zdarzeń procesu i sieci, zawężanie czasem.
- **Reagowanie w Falconie:** izolacja sieciowa hosta (network containment), kwarantanna pliku, zablokowanie wskaźnika.
- **Real Time Response (RTR — zdalny dostęp do końcówki w trakcie incydentu):** wejście na maszynę, zebranie dowodów, zabicie procesu — ze świadomością, że to *najmocniejsza i najbardziej wrażliwa* akcja (dostęp do żywej stacji pracownika; granica prawna #12 z rdzenia, tu zaostrzona).
- **Triage wykrycia Falcona:** priorytet, TP vs FP, decyzja izolacja vs obserwacja (dziedziczone #3 z rdzenia — decyzja biznesowa).

**Co student musi UMIEĆ ZROBIĆ:** napisać zapytanie wykrywające wzorzec ataku; wykonać i uzasadnić reakcję (izolacja vs RTR vs obserwacja); przeprowadzić sesję RTR zbierającą dowód na własnej maszynie testowej; napisać raport triage.

**Profesjonalne niuanse (specyfika CrowdStrike):**
- **RTR to potężne i niebezpieczne narzędzie.** Zdalna powłoka na żywej końcówce pozwala zrobić wszystko — w tym narobić szkód i naruszyć prywatność pracownika. Zawodowiec używa RTR celowo, z udokumentowanym uzasadnieniem i w granicach upoważnienia; junior, który „pobawi się" RTR na cudzej maszynie, łamie prawo (art. 267 KK + monitoring pracownika).
- **Zależność od chmury i łączności.** Reakcja i polowanie działają, gdy czujnik ma kontakt z chmurą. To projektowy kompromis Falcona — lekkość kosztem zależności; zawodowiec o tym pamięta przy maszynach odciętych od sieci.

### L3 — Portfolio: polowanie oparte na hipotezie, ATT&CK, testowanie (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Polowanie oparte na hipotezie w Falconie:** hipoteza z ATT&CK → zapytanie w event search / LogScale → udokumentowany wynik (również negatywny). Bezpośrednie przełożenie `edr-xdr.md` L3 na język Falcona.
- **Mapowanie własnych polowań i wykryć na MITRE ATT&CK** i nazwanie luk pokrycia (co czujnik i graf *widzą*, czego nie).
- **Korelacja w grafie zagrożeń:** zrozumienie, jak Falcon łączy zdarzenia w czasie i jak to czytać w dochodzeniu (rekonstrukcja osi czasu z `edr-xdr.md` L3).
- **Testowanie detekcji:** odtworzenie techniki na własnej maszynie testowej (Atomic Red Team) i potwierdzenie wykrycia przez Falcona; sprawdzenie reakcji na próbę manipulacji czujnikiem (#9 z rdzenia).

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić polowanie oparte na hipotezie i udokumentować wynik; zmapować zestaw wykryć/polowań na ATT&CK z nazwaną luką; zrekonstruować oś czasu incydentu z grafu; udowodnić wykrycie odtworzeniem techniki. Poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse (specyfika CrowdStrike):**
- **OverWatch nie zwalnia z myślenia.** Zarządzane polowanie CrowdStrike (zespół producenta poluje za klienta) kusi, by „zostawić to im". Zawodowiec wie, że własne polowanie i znajomość swojego środowiska są niezbędne — OverWatch to wzmocnienie, nie zastępstwo (wariant decyzji MDR z `edr-xdr.md` L5).
- **Składnia jest specyficzna, detekcja przenośna.** Język zapytań Falcona różni się od KQL Defendera, ale *co* się odpytuje (zachowania, ATT&CK) jest identyczne. Zawodowiec, który zna rdzeń EDR/XDR, przesiada się między narzędziami; junior „od jednej składni" nie.

### L4 — Realny przypadek profesjonalny (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 projektowana **osobno przez Ethana/Leo**. Research tu tylko **zapowiada zakres**.

**Co obejmowałby zakres L4:** reakcja na realny incydent w Falconie — od wykrycia IOA, przez polowanie w event search/LogScale, sesję RTR zbierającą dowody, decyzję o izolacji w kontekście biznesowym, po rekonstrukcję osi czasu z grafu zagrożeń. **Benchmark** wobec specjalisty reagowania na incydenty pracującego na Falconie.

### L5 — Biegłość: architektura Falcon w organizacji + model obsługi (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5:** wdrożenie czujnika na pełne pokrycie końcówek, decyzja o modułach (Insight/Prevent/OverWatch), model obsługi własny SOC vs OverWatch (MDR), integracja Falcona jako źródła do zewnętrznego SIEM, ekonomia i zależność od chmury/łączności. **Benchmark** wobec architekta bezpieczeństwa.

---

## 4. Profesjonalne niuanse — sedno North Star

> **Dziedziczenie:** dwanaście niuansów rozdzielających zawodowca od amatora w detekcji na końcówce jest w `edr-xdr.md §4`. **Tu tylko niuanse swoiste dla CrowdStrike Falcon.**

1. **IOA to filozofia produktu, nie opcja.** Falcon zbudowano wokół wykrywania zachowań w trakcie ataku (IOA), nie śladów po fakcie (IOC). Junior, który traktuje Falcona jak „listę złych plików", nie rozumie, za co firma płaci. Wartość to czytanie *sekwencji zachowań*, którą graf zagrożeń złożył.

2. **Model jednego czujnika w chmurze: lekkość kosztem zależności.** Falcon jest lekki, bo przetwarza w chmurze — ale to znaczy, że końcówka bez łączności z chmurą jest częściowo ślepa. Zawodowiec rozumie ten kompromis: świetna wydajność i historia, cena = zależność od sieci i od dostawcy.

3. **RTR (zdalny dostęp) to broń — używana z upoważnieniem i dokumentacją.** Real Time Response daje powłokę na żywej końcówce. To najpotężniejsza akcja Falcona i najbardziej wrażliwa prawnie (dostęp do stacji pracownika w czasie rzeczywistym). Każde użycie wymaga uzasadnienia, upoważnienia i śladu — to nie zabawka do eksploracji.

4. **Czujnik offline / manipulacja = pierwszy sygnał, nie cisza.** Jak w rdzeniu (#9), ale w Falconie ze specyfiką chmury: host, który przestał raportować do chmury, jest poza ochroną i poza widokiem. Dojrzały analityk monitoruje *stan czujników*, nie tylko wykrycia.

5. **OverWatch (zarządzane polowanie) wzmacnia, nie zastępuje.** Pokusa „CrowdStrike i tak za nas poluje" prowadzi do utraty znajomości własnego środowiska. Zawodowiec łączy własne polowanie z OverWatch; nie oddaje całej odpowiedzialności na zewnątrz.

6. **Telemetria w chmurze dostawcy spoza EU — RODO i suwerenność danych.** CrowdStrike to dostawca amerykański; telemetria końcówek (a więc aktywność pracowników) jest przetwarzana w jego chmurze. Region przechowywania, transfer poza EOG i podstawa prawna transferu to realna decyzja zgodności — szczególnie w sektorze publicznym i finansowym (DORA). Rozszerza granicę #12 z rdzenia o wymiar transferu transgranicznego.

7. **Składnia zapytań jest wymienna — rdzeń detekcji nie.** Język Falcona ≠ KQL Defendera ≠ SPL Splunka. Kto rozumie zachowania i ATT&CK, przesiada się między nimi w dni; kto nauczył się klikać w jednej konsoli, zaczyna od zera przy każdej zmianie pracy. Inwestycja idzie w rdzeń, nie w składnię.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty CrowdStrike muszą pokryć umiejętności *swoiste* z §3 — **bez powielania** projektów rdzenia EDR/XDR ani Defendera. Student z opanowanym rdzeniem udowadnia, że umie tę samą detekcję wykonać w Falconie.

| # | Poziom | Roboczy zakres projektu (swoisty dla Falcon) | Umiejętności z §3 | Dziedziczy z `edr-xdr.md` |
|---|---|---|---|---|
| C1 | L1 | **Pierwsze kroki w konsoli Falcon** — odczyt wykrycia opartego na IOA, weryfikacja mapowania ATT&CK, 5 zapytań w wyszukiwaniu zdarzeń, stan czujnika | Konsola, IOA, event search, czujnik | wykrywanie zachowań, IOC/IOA, drzewo procesów (#1,#2) |
| C2 | L2 | **Reagowanie i RTR z uzasadnieniem** — decyzja izolacja vs RTR vs obserwacja na scenariuszu; sesja RTR zbierająca dowód na własnej maszynie; raport | Reagowanie, RTR, triage, decyzja biznesowa | izolacja jako decyzja (#3), granica RODO (#12) |
| C3 | L3 | **Polowanie oparte na hipotezie + ATT&CK + test** — hipoteza → zapytanie w Falconie → wynik z luką; rekonstrukcja osi czasu z grafu; dowód wykrycia (Atomic Red Team) | Polowanie, ATT&CK, korelacja w grafie, test | polowanie z hipotezą, ATT&CK, testowanie (#5–#7) |
| (C4–C5) | L4–L5 | **ZAPOWIEDŹ** — reakcja na incydent w Falconie z RTR; architektura + decyzja OverWatch/MDR + zależność od chmury; benchmark profesjonalisty | Zakres L4/L5 | ekonomia, dwell time, MDR (#4,#8) |

**Szacowana pula L1–L3: ok. 3 projekty swoiste** (rdzeń teorii pokryty w EDR/XDR). L4–L5: 2 projekty po rozszerzeniu struktury. Każdy projekt dostanie pełny `theory_md` z **zaostrzoną klauzulą etyczno-prawną** — RTR (zdalny dostęp do żywej końcówki) + monitoring pracownika + transfer danych do chmury dostawcy spoza EU (niuanse #3, #5, dziedziczone #12), rubrykę (wagi = 100), źródła wg kanonu README.

**Łańcuch zależności:** (EDR/XDR P1–P8 jako prerekwizyt) → C1 (konsola/IOA/event search) → C2 (reagowanie/RTR) → C3 (polowanie/ATT&CK/test). Żaden projekt nie wprowadza pojęcia detekcji, którego nie objął wcześniej rdzeń EDR/XDR.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

1. **`EDR / XDR`** (`edr-xdr.md`) — **najważniejszy prerekwizyt**. Cała teoria detekcji na końcówce (wykrywanie zachowań, IOC/IOA, izolacja, polowanie z hipotezą, ATT&CK, granica RODO) jest tam. Falcon to jej wykonanie w konkretnej platformie. **Wymagane przed L2; pożądane przed L1.**
2. **`SIEM`** (`siem.md`) — pojęcie języka zapytań, korelacji, progu i triage; relacja EDR↔SIEM (Falcon jako źródło do zewnętrznego SIEM). **Wymagane przed L1.**
3. **`Windows` i/lub `Linux`** (procesy, usługi) + podstawy `IAM`/`Active Directory` (konta, ruch boczny) — do interpretacji telemetrii i wykryć Falcona. Bazę dają projekty partii 1. **Wymagane przed L2.**
4. **Podstawy sieci `TCP/IP`** — do interpretacji zdarzeń sieciowych i zrozumienia zależności czujnik↔chmura. **Wymagane przed L2.**
5. **Klauzula etyczno-prawna — zaostrzona** — art. 267 KK + monitoring pracownika (art. 22³ KP) + **RTR** (zdalny dostęp = szczególna odpowiedzialność) + transfer danych poza EOG (RODO). **Wymagane od L1.**

**Czego CrowdStrike dostarcza dalej:** zasila praktyką `SOC`, `Incident Response` (Falcon jest częsty w reakcji na poważne włamania) i `SOAR` (automatyzacja reakcji); dokłada źródło telemetrii dla zewnętrznego `SIEM`. Wraz z `Microsoft Defender` domyka rodzinę „detekcja na końcówce" w dwóch dominujących na rynku ekosystemach.

---

## 7. Źródła (rzetelne, legalne, oficjalne — do akceptacji Ryana)

> **Dziedziczenie:** otwarte źródła ogólne (MITRE ATT&CK, Atomic Red Team, Sigma, LOLBAS, NIST) są w `edr-xdr.md §7`. Tu **tylko źródła swoiste dla CrowdStrike** plus prawo.

**Dokumentacja i materiały CrowdStrike (oficjalne):**
- CrowdStrike — baza wiedzy i materiały edukacyjne (oficjalne): https://www.crowdstrike.com/resources/
- CrowdStrike — słownik pojęć bezpieczeństwa (cybersecurity 101, darmowe, dobre do teorii narzędziowej): https://www.crowdstrike.com/cybersecurity-101/
- CrowdStrike Falcon LogScale (zarządzanie logami, dawniej Humio) — dokumentacja: https://library.humio.com/
- CrowdStrike — MITRE Engenuity ATT&CK Evaluations (jak czytać niezależne testy platformy): https://attackevals.mitre-engenuity.org/
- Falcon — wersja próbna / Go (dostęp testowy zgodnie z regulaminem producenta): https://www.crowdstrike.com/products/trials/

**Standard niezależny (do oceny narzędzia):**
- MITRE Engenuity ATT&CK Evaluations — wyniki dla EDR (punkt odniesienia ponad marketingiem producenta): https://attackevals.mitre-engenuity.org/

**Kontekst prawny EU/PL (do klauzul — szczególnie RTR i transfer danych):**
- UODO — monitoring pracownika i dane osobowe w miejscu pracy: https://uodo.gov.pl/
- RODO — transfer danych poza EOG (Europejski Obszar Gospodarczy), podstawy i standardowe klauzule umowne: https://eur-lex.europa.eu/eli/reg/2016/679
- Rozporządzenie DORA (sektor finansowy — istotne przy dostawcy chmury spoza EU): https://eur-lex.europa.eu/eli/reg/2022/2554
- Art. 267 Kodeksu karnego (nieuprawniony dostęp do systemu/danych — kluczowe przy RTR): https://isap.sejm.gov.pl/

> **Do uwagi Ryana (kluczowe dla tego liścia):** dwa zaostrzenia względem reszty rodziny. (1) **RTR** to zdalny dostęp do żywej końcówki — projekty MUSZĄ jasno ograniczać go do *własnych maszyn testowych* i podkreślać, że na cudzym systemie to przestępstwo (art. 267 KK); klauzula obowiązkowa. (2) **Transfer danych do chmury dostawcy spoza EU** — telemetria (aktywność pracownika) trafia do CrowdStrike; region, transfer poza EOG i podstawa prawna to element zgodności do omówienia w teorii projektów (RODO, DORA). Dostęp do Falcona wyłącznie przez oficjalną wersję próbną/Go, zgodnie z regulaminem. Wszystkie źródła oficjalne; warunki próbne do weryfikacji aktualności przed `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w CISO, który prowadzi SOC na CrowdStrike Falcon (większa organizacja, sektor finansowy) i ocenia, czy poleciłby kandydata. Pięć słabości i poprawki:

1. **Słabość: research powielał teorię EDR zamiast skupić się na Falconie.** CISO: „nie chcę trzeciego wykładu o EDR — chcę wiedzieć, czy junior rozumie model czujnika w chmurze, IOA i czy nie zrobi mi katastrofy w RTR". **Poprawka:** teoria oddelegowana do `edr-xdr.md` (nagłówek, §4, §6 pkt 1); §2–§3 przepisane na specyfikę Falcona — jeden czujnik, graf zagrożeń, IOA jako filozofia, moduły, RTR.

2. **Słabość: RTR potraktowany jak zwykła funkcja.** CISO: „RTR to zdalna powłoka na maszynie mojego pracownika — junior, który traktuje to jak zabawkę, to ryzyko prawne i wizerunkowe". **Poprawka:** RTR dostał osobny niuans #3, zaostrzoną klauzulę prawną (§5, §6 pkt 5, uwaga Ryana) i wbudowanie w projekt C2 z naciskiem na uzasadnienie i upoważnienie.

3. **Słabość: pominięta zależność od chmury i transfer danych poza EU.** CISO: „jestem w finansach — dane do amerykańskiej chmury to pytanie DORA i RODO na pierwszym spotkaniu". **Poprawka:** niuans #2 (lekkość kosztem zależności) i #6 (transfer poza EOG), z odzwierciedleniem w źródłach i klauzuli — to realny rozdzielnik dla polskiego/EU rynku.

4. **Słabość: OverWatch przedstawiony jak „rozwiązanie problemu polowania".** CISO: „junior, który myśli, że OverWatch zwalnia go z myślenia, nie zna własnego środowiska — bezużyteczny w kryzysie". **Poprawka:** niuans #5 (wzmacnia, nie zastępuje) i powiązanie z decyzją MDR z rdzenia w L5.

5. **Słabość: brak przenośności — research uczył „klikania w Falconie".** CISO: „za rok kupię inne narzędzie; chcę kogoś, kto myśli detekcją, nie kogoś od jednej konsoli". **Poprawka:** niuans #7 (składnia wymienna, rdzeń przenośny) i jawne, wielokrotne odesłanie, że wartość siedzi w opanowanym `edr-xdr.md`, a Falcon to wykonanie.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty przy pierwszym użyciu (CrowdStrike Falcon, czujnik/sensor, cloud-native/chmurowa od początku, Threat Graph/graf zagrożeń, IOA/IOC z odesłaniem do rdzenia, Falcon Insight/Prevent/OverWatch/Discover, NGAV, LogScale/Humio, event search/wyszukiwanie zdarzeń, RTR/Real Time Response/zdalny dostęp, network containment/izolacja, MDR/zarządzane wykrywanie, EOG, MITRE Engenuity ATT&CK Evaluations). Terminy detekcji odsyłane do `edr-xdr.md`.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test „czy pracodawca EU na CrowdStrike uzna kandydata za gotowego" — spełniony, jeśli autoring domknie 3 projekty swoiste L1–L3 (konsola/IOA, RTR z uzasadnieniem, polowanie/ATT&CK/test) *na bazie* opanowanego rdzenia EDR/XDR. Pełna zawodowość organizacyjna (architektura, OverWatch/MDR, transfer danych w skali) wymaga L4/L5 — zapowiedziane, zależne od Ethana/Leo. **Granica dziedziczenia uczciwie oznaczona:** ten plik bez `edr-xdr.md` jest niekompletny — świadomy wybór przeciw duplikacji, spójny z relacją SIEM → Splunk.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
