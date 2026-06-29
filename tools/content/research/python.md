# Research kompetencji: Python

> **Status:** research liścia-narzędzia w ETAP E3 — nadbudowuje nad wzorcem `tools/content/research/siem.md` (golden-example). **Soczewka cyber:** ten plik NIE jest kursem programowania w Pythonie. Python opisujemy wyłącznie jako narzędzie pracy specjalisty bezpieczeństwa — automatyzację roboty analityka (przerabianie logów, łączenie z narzędziami przez API, własne skrypty wykrywające zagrożenia). Wszystko spoza tej soczewki (web, aplikacje, data science) jest poza zakresem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Python` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Programowanie i automatyzacja" (`unionShare` grupy: **14,8%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **14,8%** ofert ścieżki wymienia Python |
| **Liczba ofert (`offers`)** | **55** — **najczęściej wymieniana pojedyncza technologia w całej ścieżce Cybersecurity Specialist** |
| **`kind`** | `tool` (konkretna technologia, nie koncept) |
| **`lift`** | **0,73** (siła powiązania liścia z tą ścieżką — patrz wniosek niżej) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Wniosek dla autoringu — dwie liczby, które trzeba czytać razem.** Python ma **najwyższy popyt** w całej ścieżce (14,8% — więcej niż SIEM), ale **najniższy `lift`** ze wszystkich liści technicznych (0,73). To nie sprzeczność, to definicja soczewki tego researchu:

- **Wysoki popyt** mówi: bez Pythona kandydat odpada z większości ofert cyber.
- **Niski `lift` (< 1,0)** mówi: Python *nie jest specyficzny dla cyberbezpieczeństwa* — wymieniają go niemal wszystkie ścieżki IT (data, backend, devops). Sam Python nie odróżnia kandydata na analityka bezpieczeństwa od kandydata na dowolne inne stanowisko.

**Stąd twarda zasada autoringu:** wartość zawodowa nie leży w „znam Pythona", lecz w **zastosowaniu Pythona do problemu bezpieczeństwa**. Projekty muszą uczyć *automatyzacji pracy obrońcy* — nie ogólnego programowania. Hasło z opisu grupy w modelu: *„Nie musisz być programistą aplikacji, ale bez podstaw Pythona zostajesz przy ręcznym klikaniu."* To jest cała teza tego researchu.

**Pozycja w ścieżce (kontekst dla pokrycia i prerekwizytów):** Python to jedyny liść swojej grupy, ale wpina się w niemal każdą inną grupę ścieżki — automatyzuje pracę w SIEM (zapytania przez API), w IAM (audyt kont skryptem), w AppSec (czytanie wyników skanerów), w GRC (raporty zgodności). To „klej" całej ścieżki, dlatego autorowany wcześnie.

---

## 2. Definicja kompetencji i jej rola w pracy

**Python w cyberbezpieczeństwie** to język, którym specjalista bezpieczeństwa **automatyzuje powtarzalną robotę**, której nie da się (albo nie opłaca się) klikać ręcznie. Nie chodzi o budowanie aplikacji — chodzi o cztery konkretne czynności obrońcy:

1. **Przerabianie logów (parsing — rozbiór logu na pola).** Wyciąganie z surowych, nieuporządkowanych zapisów zdarzeń konkretnych pól (znacznik czasu, adres IP, użytkownik, wynik akcji) i sprowadzanie ich do postaci, którą da się analizować.
2. **Łączenie z narzędziami przez API (Application Programming Interface — interfejs do sterowania programem z kodu).** Pobranie danych z SIEM, odpytanie zewnętrznego źródła o reputację adresu IP (threat intelligence — wywiad o zagrożeniach), wysłanie sygnału do systemu reakcji — wszystko skryptem, bez klikania w interfejsie.
3. **Własne skrypty wykrywające zagrożenia.** Logika, której gotowe narzędzie nie ma: wykrycie konkretnego wzorca ataku w danych firmy (np. nietypowa sekwencja logowań), gdy reguła SIEM nie wystarcza.
4. **Parsowanie i wzbogacanie danych (enrichment — dokładanie kontekstu).** Sklejenie kilku źródeł: do zdarzenia z logu dokładamy lokalizację adresu IP, informację, czy konto jest administracyjne, czy adres jest na liście znanych zagrożeń.

**Czym ta kompetencja NIE jest (rozróżnienie zawodowca):**
- To **nie jest** stanowisko programisty aplikacji. Analityk bezpieczeństwa pisze krótkie, jednorazowe lub powtarzalne **narzędzia**, nie produkty. Cel to „zaoszczędzić sobie godzinę ręcznej roboty", nie „wydać oprogramowanie".
- To **nie jest** umiejętność „składniowa". Pisanie pętli to nie kompetencja cyber. Kompetencją jest *wiedzieć, jaki wzorzec ataku zakodować* i *jak zrobić to bezpiecznie* (patrz §4 — skrypt obrońcy sam bywa dziurą).
- Python **nie zastępuje** SIEM ani narzędzi gotowych — uzupełnia je tam, gdzie kończy się ich logika lub interfejs.

**Kto tego używa i jak wygląda dzień pracy.** Python jest narzędziem **analityka SOC** (Security Operations Center — centrum monitorowania bezpieczeństwa), **inżyniera detekcji**, **specjalisty reagowania na incydenty (incident responder)** i **inżyniera bezpieczeństwa**. Typowe użycia w ciągu dnia:
- Dostajesz wyrzut 200 tys. linii logu i masz znaleźć, z których adresów ktoś próbował się włamać — pętla w Pythonie zamiast ręcznego przeglądania.
- Masz listę 500 podejrzanych adresów IP i chcesz wiedzieć, które są znane jako złośliwe — skrypt odpytuje API wywiadu o zagrożeniach (np. AbuseIPDB) zamiast wpisywania ich pojedynczo.
- Twój SIEM nie ma reguły na konkretny wzorzec — piszesz skrypt, który go wypatruje, dopóki reguła nie powstanie.

**Po co rynkowi ta kompetencja.** Praca obrońcy skaluje się tylko przez automatyzację — ataków i danych jest za dużo na ręczną obróbkę. Specjalista, który automatyzuje, obsługuje dziesięciokrotnie więcej niż ten, który klika. Dlatego Python pojawia się w 55 ofertach (najwięcej w ścieżce) — ale, jak w §1, jako *narzędzie do roboty bezpieczeństwa*, nie jako cel sam w sobie.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

> **Nadbudowa nad partią 1 (twarde, by nie powtórzyć).** Fundament L1 — czytanie i parsowanie publicznego logu w Pythonie oraz prosta detekcja ataku siłowego (brute-force) — jest **już zrealizowany** projektem `cyber-python-automatyzacja-logow` (partia 1, L1, 4 h). Ten research **nie tworzy drugiego projektu L1 o tym samym zakresie.** L1 poniżej opisuje zakres *domknięty przez tamten projekt*; nowy autoring rusza od L2 w górę.

### L1 — Fundamenty: parsowanie logu i prosta detekcja (3–6 h) — POKRYTE w partii 1

**Zakres wiedzy/umiejętności (dla kompletności mapy):**
- Wczytanie publicznego zbioru logów (np. loghub) i wyłuskanie pól skryptem zamiast ręcznie.
- Podstawy parsowania: wyrażenia regularne (regex — wzorce do wyszukiwania w tekście, moduł `re`), praca po liniach, obsługa złej linii.
- Prosta logika detekcji z progiem: zliczenie nieudanych logowań z jednego adresu w oknie czasowym (brute-force).
- Zapis raportu znalezisk do pliku (CSV/JSON) oraz maskowanie adresów IP (RODO).

**Co student musi UMIEĆ ZROBIĆ:** napisać skrypt czytający log, wyłuskujący pola i zgłaszający prosty wzorzec ataku do pliku raportu. **(Domknięte przez `cyber-python-automatyzacja-logow`.)**

### L2 — Zastosowanie: wzbogacanie danych i łączenie z narzędziami przez API (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Praca z danymi strukturalnymi:** czytanie i zapis JSON i CSV, logi w formacie JSON (coraz częstsze), różnica między parsowaniem regex a parsowaniem strukturalnym (i kiedy które).
- **Łączenie z API (biblioteka `requests` lub `httpx`):** odpytanie zewnętrznego źródła — np. reputacja adresu IP (AbuseIPDB), informacja o pliku po jego skrócie (hash) z publicznego API. Pojęcie klucza API i jego **bezpiecznego przechowywania** (zmienna środowiskowa / menedżer sekretów — nigdy na sztywno w kodzie, §4).
- **Wzbogacanie alertu (enrichment):** sklejenie zdarzenia z logu z zewnętrznym kontekstem (reputacja IP, lokalizacja geograficzna, czy konto jest administracyjne) i pokazanie, jak kontekst zmienia priorytet.
- **Obsługa realiów API:** limity zapytań (rate limit — ile na minutę), stronicowanie wyników (pagination), ponawianie po błędzie, kod odpowiedzi HTTP. Skrypt, który „działa na 5 adresach", a pada na 5000 — to klasyka amatora.
- **Higiena skryptu:** podział na funkcje, parametry zamiast ścieżek na sztywno, środowisko wirtualne (`venv`) i przypięte wersje bibliotek (`requirements.txt`).

**Co student musi UMIEĆ ZROBIĆ:** napisać skrypt, który bierze listę adresów IP z logu, odpytuje publiczne API wywiadu o zagrożeniach z poprawną obsługą limitów i błędów, wzbogaca każdy wpis o kontekst i zapisuje wzbogacony raport — z kluczem API trzymanym poza kodem.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Klucz API w kodzie to wyciek.** Wrzucony do repozytorium klucz trafia do historii git na zawsze — to jeden z najczęstszych realnych wycieków. Zawodowiec trzyma sekrety w zmiennej środowiskowej albo menedżerze sekretów i nigdy ich nie wypisuje.
- **API ma limity i pada.** Skrypt bez obsługi limitu zapytań i ponawiania zadławi się na realnym wolumenie albo zostanie zablokowany przez dostawcę. Pro projektuje pod 10 000 rekordów, nie pod 5.
- **Wzbogacanie zmienia priorytet, nie tylko dokłada pole.** Sens enrichmentu to *decyzja*: ten adres jest na liście zagrożeń → alert rośnie z niskiego na wysoki. Amator dokłada kolumnę i nic z niej nie wynika.

### L3 — Portfolio: własne, wielokrotnego użytku narzędzie detekcji (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Narzędzie, nie skrypt jednorazowy:** przekształcenie luźnego skryptu w narzędzie z interfejsem wiersza poleceń (CLI — uruchamiane z parametrami), które inny analityk może uruchomić na swoich danych bez grzebania w kodzie.
- **Wykrywanie po wskaźnikach włamania (IoC — Indicators of Compromise: znane złe adresy, skróty plików, domeny):** skrypt porównujący zdarzenia z logu z listą wskaźników (np. w formacie STIX/CSV) i zgłaszający trafienia.
- **Wiele źródeł na raz:** połączenie logu uwierzytelniania + logu zapory + zewnętrznego wywiadu w jeden, skorelowany wynik — odpowiednik korelacji z SIEM, ale tam, gdzie SIEM nie sięga.
- **Bezpieczne pisanie skryptu (secure coding — patrz §4):** świadomość, że narzędzie obrońcy samo bywa dziurą — brak wstrzyknięcia poleceń (command injection), brak `eval` na danych wejściowych, walidacja wejścia, bezpieczne czytanie plików.
- **Wydajność na dużych danych:** przetwarzanie strumieniowe (czytanie linia po linii / generatory) zamiast wczytania całego pliku do pamięci; świadomość pułapki wyrażeń regularnych (ReDoS — katastrofalne cofanie się regexa, które zawiesza skrypt na spreparowanym wejściu).
- **Testy i odtwarzalność:** prosty test, że detekcja faktycznie łapie wzorzec (na własnym, kontrolowanym wejściu), README z instrukcją uruchomienia, przypięte zależności.

**Co student musi UMIEĆ ZROBIĆ:** zbudować narzędzie CLI, które na zadanym zbiorze logów wykrywa zagrożenia po wskaźnikach włamania i koreluje co najmniej dwa źródła, jest napisane bezpiecznie (bez wstrzyknięć), radzi sobie z dużym plikiem strumieniowo i ma test potwierdzający detekcję. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Narzędzie obrońcy bywa wektorem ataku.** Skrypt, który uruchamia polecenie systemowe sklejone z danej z logu, albo robi `eval` na wejściu — sam jest dziurą (wstrzyknięcie poleceń). Atakujący wstawia ładunek do logu, Twój skrypt go wykonuje. Zawodowiec nigdy nie buduje poleceń przez sklejanie tekstu.
- **Wczytanie całego logu do pamięci kładzie skrypt.** Plik 10 GB w jednej liście to zawieszony komputer. Pro czyta strumieniowo (generator), amator robi `f.readlines()` i czeka.
- **Łańcuch dostaw to też ryzyko.** `pip install` ściąga cudzy kod; literówka w nazwie paczki (typosquatting) albo niezweryfikowana zależność wprowadza złośliwy kod do narzędzia bezpieczeństwa. Pro przypina wersje i sprawdza, co instaluje.
- **Nie wymyślaj parsera od zera, ale rozumiej, czego używasz.** Dojrzały inżynier sięga po sprawdzoną bibliotekę, ale wie, jak działa — nie wkleja kodu, którego nie rozumie.

### L4 — Realny przypadek profesjonalny: narzędzie automatyzacji dla działającego SOC (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, brudnego* problemu operacyjnego SOC: powtarzalna ręczna czynność (np. wzbogacanie każdego alertu o pięć źródeł kontekstu, ręczne dziś), którą trzeba zautomatyzować end-to-end, łącząc API SIEM, wywiadu o zagrożeniach i wewnętrznej bazy zasobów.
- Narzędzie zdatne do *oddania koledze z zespołu*: konfigurowalne, odporne na błędy danych i awarie API, z logowaniem własnego działania i obsługą sekretów.
- **Benchmark:** czas i jakość pracy z narzędziem studenta zestawione z rozwiązaniem profesjonalisty — czy realnie oszczędza pracę analityka, czy tworzy nowy dług utrzymaniowy.

### L5 — Biegłość: architektura automatyzacji bezpieczeństwa i jej ekonomia (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Automatyzacja reakcji (w stronę SOAR):** skrypt jako element łańcucha automatycznej reakcji (Security Orchestration, Automation and Response — orkiestracja i automatyzacja reakcji), ze świadomością ryzyka „automatyczne działanie na fałszywym alarmie".
- **Inżynieria narzędzia detekcji jako oprogramowania:** kod w repozytorium z kontrolą wersji, testami i wdrożeniem — detection-as-code (detekcja jako kod), dojrzałość zespołu.
- **Ekonomia i utrzymanie:** decyzja, *co warto* automatyzować (automatyzacja, którą nikt nie utrzymuje, to dług), wydajność na realnym wolumenie, koszt zapytań do płatnych API.
- **Benchmark** wobec rozwiązania realnego inżyniera bezpieczeństwa: nie „czy działa", lecz „czy da się to utrzymać i czy jest bezpieczne w skali".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Wartość jest w soczewce, nie w języku.** Python to towar (niski `lift`, §1). Zawodowiec różni się od amatora tym, że wie *jaki problem bezpieczeństwa* automatyzuje i dlaczego — nie tym, że zna składnię. Każdy projekt musi rozwiązywać problem obrońcy, nie ćwiczyć pętle.

2. **Narzędzie obrońcy samo bywa dziurą (secure coding).** Skrypt sklejający polecenie systemowe z danej z logu (wstrzyknięcie poleceń — command injection) albo robiący `eval`/`exec` na wejściu to gotowy wektor ataku. Atakujący wstawia ładunek do danych, Twój skrypt go wykonuje. Zawodowiec waliduje wejście i nigdy nie buduje poleceń przez konkatenację.

3. **Sekrety nigdy w kodzie.** Klucz API, hasło, token wrzucone do repozytorium trafiają do historii git na zawsze — jeden z najczęstszych realnych wycieków danych. Sekrety idą do zmiennej środowiskowej albo menedżera sekretów; skrypt ich nie wypisuje.

4. **Wydajność na dużych logach to nie optymalizacja, to wymóg.** Wczytanie wielogigabajtowego logu do pamięci (`readlines`) kładzie maszynę. Zawodowiec przetwarza strumieniowo (generatory, czytanie linia po linii). Amator dziwi się, czemu „skrypt się zawiesił".

5. **Pułapka wyrażeń regularnych (ReDoS).** Źle napisany regex na spreparowanym wejściu wpada w katastrofalne cofanie się (catastrophic backtracking) i wiesza skrypt — to nawet wektor odmowy usługi (DoS). Pro pisze regexy odporne i testuje je na złośliwym wejściu.

6. **API ma limity, pada i stronicuje.** Skrypt bez obsługi limitu zapytań (rate limit), ponawiania i stronicowania działa na pięciu rekordach i pada na pięciu tysiącach. Projektuj pod realny wolumen.

7. **Łańcuch dostaw (supply chain).** `pip install` to wykonanie cudzego kodu. Literówka w nazwie paczki (typosquatting), porzucona biblioteka, niezweryfikowana zależność — wprowadzają złośliwy kod do narzędzia, które ma *chronić*. Pro przypina wersje i sprawdza zależności.

8. **Strukturalnie zamiast regexem, gdy się da.** Log w JSON parsuje się jako JSON, nie regexem. Regex na danych, które mają strukturę, jest kruchy i pęka przy pierwszej zmianie formatu. Zawodowiec dobiera narzędzie do danych.

9. **RODO i minimalizacja w skrypcie.** Logi bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14). Skrypt obrońcy przetwarza tylko to, co konieczne, maskuje identyfikatory w raporcie i nie re-identyfikuje osób. To element rzemiosła, nie dodatek.

10. **Fałszywy pozytyw kosztuje, fałszywy negatyw zabija.** To samo napięcie co w SIEM (§4 SIEM): skrypt detekcyjny z progiem zbyt czułym topi analityka w szumie, zbyt luźnym — przepuszcza atak. Próg dobiera się świadomie, nie z poradnika.

11. **Automatyzacja bez utrzymania to dług.** Skrypt, którego nikt nie rozumie i nie testuje, po pół roku jest ryzykiem, nie pomocą. Dojrzały inżynier pisze narzędzie do oddania (CLI, README, testy), nie jednorazowy „samograj".

12. **Granica etyczno-prawna jest częścią kompetencji.** Skrypty pracują na danych, które bywają osobowe, i mogą realizować techniki ofensywne. Automatyzację poznajesz wyłącznie po stronie obrony i na własnym/treningowym systemie. Nieautoryzowany dostęp do cudzych systemów/danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Python muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał samodzielnie automatyzować pracę obrońcy. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Parser logów i detekcja brute-force** — już istnieje: `cyber-python-automatyzacja-logow` (partia 1) | Parsowanie logu, prosta detekcja z progiem, maskowanie IP, raport do pliku | #9, #10 |
| P2 | L2 | **Wzbogacanie alertu z publicznego API wywiadu o zagrożeniach** — lista IP z logu → reputacja z AbuseIPDB → wzbogacony raport zmieniający priorytet; klucz API poza kodem, obsługa limitów | API, enrichment, sekrety poza kodem, limity/ponawianie | #3, #6 |
| P3 | L2 | **Parsowanie danych strukturalnych (JSON/CSV)** — logi w JSON, sprowadzenie 2 formatów do wspólnej postaci, regex vs parser strukturalny | Dane strukturalne, dobór narzędzia parsowania, higiena skryptu | #8 |
| P4 | L3 | **Narzędzie CLI do wykrywania po wskaźnikach włamania (IoC)** — porównanie logu z listą znanych złych adresów/skrótów, wynik trafień, uruchamiane z parametrami | Narzędzie CLI, detekcja po IoC, odtwarzalność | #11 |
| P5 | L3 | **Bezpieczne i wydajne przetwarzanie dużego logu** — strumieniowe czytanie wielkiego pliku, bezpieczne budowanie poleceń (bez wstrzyknięć), odporny regex | Secure coding, wydajność/strumień, pułapka ReDoS, łańcuch dostaw | #2, #4, #5, #7 |
| P6 | L3 | **Korelacja wielu źródeł skryptem** — sklejenie logu uwierzytelniania + zapory + wywiadu w jeden skorelowany wynik z testem detekcji | Korelacja wieloźródłowa, test detekcji | #10, #11 |
| (P7–P8) | L4–L5 | **ZAPOWIEDŹ** — narzędzie automatyzacji dla działającego SOC + architektura automatyzacji/SOAR z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #1, #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 6 projektów** (z czego 1 już istnieje, partia 1). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (partia 1) → P2 (API/enrichment) → P3 (dane strukturalne) → P4 (narzędzie IoC) → P5 (bezpieczeństwo/wydajność) → P6 (korelacja). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy; P2/P3 nadbudowują na parserze z P1, P4–P6 zakładają umiejętność pracy z API i danymi strukturalnymi.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Python w cyber **nadbudowuje** na fundamencie partii 1 i na podstawach ścieżki. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Parser logu w Pythonie (partia 1)** — projekt `cyber-python-automatyzacja-logow` (liść `Python`, L1) domyka czytanie, parsowanie i prostą detekcję. **Wymagane przed L2 tego researchu** — L2 zaczyna od „mam już pola z logu, teraz je wzbogacam".
2. **Czytanie i pojęcie logu** — co to log, gdzie powstaje, jakie ma pola (wspólny fundament z L1 SIEM, `tools/content/research/siem.md`). **Wymagane przed L2.**
3. **Podstawy sieci i TCP/IP** (liście `TCP/IP`, `Network`) — bez rozumienia adresu IP, portu, protokołu student nie zinterpretuje danych, które skrypt wzbogaca, ani logu zapory w korelacji (P6). **Wymagane przed L2 (enrichment) i L3 (korelacja).**
4. **Podstawy systemu operacyjnego** — `Linux` (środowisko uruchamiania skryptów, ścieżki, uprawnienia plików, zmienne środowiskowe dla sekretów). Projekt `cyber-hardening-linux-bash` (partia 1) tworzy tę bazę. **Wymagane przed L2.**
5. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (czym jest konto administracyjne) — żeby wzbogacanie alertu o „to konto administratora" miało sens. **Pomocne przed L2 (enrichment).**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie). **Wymagane od L1.**

**Czego Python dostarcza jako prerekwizyt/wsparcie dla innych liści ścieżki:** Python jest „klejem" — wpina się w `SIEM`/`SOC` (automatyzacja zapytań i wzbogacania przez API), `OWASP`/`SAST`/`DAST` (czytanie i przetwarzanie wyników skanerów), `IAM` (audyt kont skryptem), `GRC`/`ISO 27001` (automatyczne raporty zgodności), `SQL` (skryptowe odpytywanie baz z logami — patrz `tools/content/research/sql.md`). Dlatego autorowany wcześnie w ścieżce — narzędzie wspiera niemal całą resztę.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja Pythona (oficjalna, darmowa):**
- Python — moduł `re` (wyrażenia regularne do parsowania logów): https://docs.python.org/3/library/re.html
- Python — moduł `json` (parsowanie danych strukturalnych): https://docs.python.org/3/library/json.html
- Python — moduł `csv` (zapis raportu znalezisk): https://docs.python.org/3/library/csv.html
- Python — moduł `argparse` (interfejs wiersza poleceń dla narzędzia CLI): https://docs.python.org/3/library/argparse.html
- Python — środowiska wirtualne (`venv`, izolacja zależności): https://docs.python.org/3/library/venv.html
- `requests` — biblioteka do API HTTP (dokumentacja oficjalna): https://requests.readthedocs.io/

**Bezpieczne pisanie kodu (secure coding — autorytatywne, otwarte):**
- OWASP — wstrzyknięcie poleceń (Command Injection): https://owasp.org/www-community/attacks/Command_Injection
- OWASP Secure Coding Practices — przewodnik: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/
- OWASP — ReDoS (Regular Expression Denial of Service): https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
- CWE-78 (wstrzyknięcie poleceń OS) — baza słabości MITRE: https://cwe.mitre.org/data/definitions/78.html
- Bandit — otwartoźródłowy skaner kodu Python pod kątem dziur (do testu własnego skryptu): https://bandit.readthedocs.io/

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników — mapowanie skryptów detekcji): https://attack.mitre.org/
- AbuseIPDB — publiczne API reputacji adresów IP (wzbogacanie, darmowy plan): https://docs.abuseipdb.com/
- STIX — otwarty standard wskaźników włamania (IoC): https://oasis-open.github.io/cti-documentation/

**Dane do ćwiczeń (publiczne, otwarte):**
- loghub — publiczne zbiory logów systemowych: https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Kodeks karny, art. 267 (nieuprawniony dostęp do informacji): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Zbiory ćwiczeniowe (loghub, SecRepo) wymagają klauzuli maskowania IP w projektach (jak w partii 1). API AbuseIPDB w projektach używamy wyłącznie w darmowym planie i z własnym kluczem trzymanym poza kodem — projekt uczy *bezpiecznego* obchodzenia się z kluczem, więc instrukcja nie może zawierać żadnego realnego klucza. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził zsunięciem się w „kurs Pythona".** CISO: „nie potrzebuję kolejnego juniora, który zna pętle — potrzebuję kogoś, kto zautomatyzuje robotę SOC". **Poprawka:** wyniosłam soczewkę cyber do nagłówka i §1 jako twardą zasadę, oparłam ją o twardą daną (`lift` 0,73 = Python jest towarem, wartość w zastosowaniu), i zrobiłam z niej niuans #1. Każdy projekt w §5 rozwiązuje problem obrońcy, nie ćwiczy składnię.

2. **Słabość: pominięte bezpieczeństwo samego skryptu.** CISO: „junior, który pisze narzędzie z wstrzyknięciem poleceń, otwiera mi drzwi zamiast je zamykać — to dyskwalifikacja". **Poprawka:** dodałam secure coding jako osobną umiejętność L3 i niuanse #2 (wstrzyknięcie poleceń), #5 (ReDoS), #7 (łańcuch dostaw) oraz projekt P5 w całości o tym. Dorzuciłam Bandit do źródeł jako narzędzie samokontroli.

3. **Słabość: brak realiów pracy z API.** CISO: „każdy skrypt, który padnie na limicie zapytań albo wystawi klucz API w repo, to junior, którego muszę pilnować". **Poprawka:** L2 dostał obsługę limitów/ponawiania/stronicowania (niuans #6) i bezwzględną zasadę „sekrety poza kodem" (niuans #3, projekt P2) — to realny rozdzielnik amator↔zawodowiec.

4. **Słabość: wydajność potraktowana jako „miło mieć".** CISO: „junior, który wczytuje 10 GB logu do pamięci, kładzie mi maszynę w trakcie incydentu". **Poprawka:** dodałam przetwarzanie strumieniowe jako umiejętność L3 i niuans #4, z osobnym projektem P5 — to nie optymalizacja, to wymóg pracy na realnym wolumenie.

5. **Słabość: nadbudowa nad partią 1 była niejasna — groziło powtórzenie L1.** CISO (tu wewnętrzny, redakcyjny): „po co drugi projekt o parsowaniu logu?". **Poprawka:** §3 jawnie oznacza L1 jako POKRYTE przez `cyber-python-automatyzacja-logow` i rusza autoring od L2; §6 zapisuje ten projekt jako twardy prerekwizyt L2; §5 stawia go jako P1 i buduje łańcuch P2→P6 na nim, bez powielania.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (API, parsing, enrichment, threat intelligence, IoC, regex, ReDoS, command injection, secure coding, supply chain, typosquatting, rate limit, pagination, CLI, venv, SOAR, detection-as-code, hash, STIX, SOC, CISO, lift). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie projekty L2–L3 (P2–P6) z niuansami #1–#8, #10–#11 *w soczewce bezpieczeństwa*. Niuanse #1 (soczewka), #11 (utrzymanie), #12 (granica prawna w skali) domkną się w pełni dopiero w L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione. Ryzyko numer jeden tej kompetencji — zsunięcie w ogólne programowanie — jest świadomie zaadresowane na poziomie nagłówka, §1, niuansu #1 i każdego projektu.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
