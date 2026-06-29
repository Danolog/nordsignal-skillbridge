# Research kompetencji: SQL

> **Status:** research liścia-narzędzia w ETAP E3 — nadbudowuje nad wzorcem `tools/content/research/siem.md` (golden-example). **Soczewka cyber:** ten plik NIE jest kursem baz danych. SQL opisujemy z dwóch stron pracy specjalisty bezpieczeństwa — (1) atak przez wstrzyknięcie zapytania (SQL injection) i obrona przed nim, (2) odpytywanie baz z logami w poszukiwaniu śladów incydentu. To **kompetencja wspierająca, nie rdzeń roli** (patrz §1). Most do liści `OWASP` i `SIEM`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SQL` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Bazy danych (SQL)" (`unionShare` grupy: **3,5%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,5%** ofert ścieżki wymienia SQL |
| **Liczba ofert (`offers`)** | **13** |
| **`kind`** | `tool` (konkretna technologia — język zapytań do baz) |
| **`lift`** | **0,20** (siła powiązania liścia z tą ścieżką — najniższa w ścieżce, patrz wniosek) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Wniosek dla autoringu — kompetencja wspierająca, nie rdzeń.** SQL ma niski popyt (3,5%, 13 ofert) i **najniższy `lift` w całej ścieżce** (0,20). `lift` < 1,0 znaczy, że SQL jest mniej związany z cyberbezpieczeństwem niż ze ścieżką przeciętną — to język wspólny dla danych, backendu i analityki. Dla obrońcy SQL nie jest rdzeniem (rdzeniem jest SIEM/SOC), lecz **kompetencją wspierającą, która realnie bywa wymagana** i staje się ważna w dwóch konkretnych momentach pracy (§2). Autoring SQL musi być proporcjonalny: kilka projektów domykających soczewkę cyber, nie pełny kurs baz danych.

**Most, nie wyspa.** SQL w tej ścieżce ma sens tylko jako **most między dwiema sąsiednimi grupami**:
- ku **Bezpieczeństwu aplikacji (AppSec)** — przez `OWASP` (wstrzyknięcie zapytania, SQL injection, to klasyczna dziura z listy OWASP Top 10);
- ku **SIEM i Monitorowaniu Zdarzeń** — przez odpytywanie baz, w których siedzą logi, w poszukiwaniu śladów incydentu.

Stąd kolejność: SQL autorowany **po** wprowadzeniu OWASP i SIEM (patrz §6), bo dopiero one nadają mu cel.

---

## 2. Definicja kompetencji i jej rola w pracy

**SQL (Structured Query Language — strukturalny język zapytań)** to język, którym rozmawia się z bazami danych: prosi je o dane, dokłada, zmienia i usuwa wpisy. W cyberbezpieczeństwie nie używamy SQL do *budowania* aplikacji bazodanowych — używamy go z **dwóch stron, ofensywnej i defensywnej**:

**Strona 1 — atak przez wstrzyknięcie zapytania (SQL injection) i obrona.**
SQL injection (w skrócie SQLi — wstrzyknięcie złośliwego fragmentu zapytania przez pole wejściowe aplikacji) to jedna z najstarszych i najgroźniejszych dziur aplikacji webowych (kategoria *Injection* na liście OWASP Top 10). Mechanizm: aplikacja skleja zapytanie SQL z tekstem od użytkownika; atakujący wpisuje w pole nie nazwisko, lecz fragment SQL, który zmienia sens zapytania — i wyciąga z bazy dane, do których nie miał prawa. Obrońca musi:
- **rozumieć atak** — żeby go wykryć w logach i ocenić ryzyko aplikacji;
- **znać obronę** — przede wszystkim **zapytania parametryzowane** (parametry przekazywane osobno od treści zapytania — baza traktuje wejście jako *dane*, nigdy jako *kod*), w przeciwieństwie do **konkatenacji** (sklejania zapytania z tekstem — źródło dziury).

**Strona 2 — odpytywanie baz z logami w poszukiwaniu śladów incydentu.**
Wiele systemów (SIEM, hurtownie logów, bazy zdarzeń) trzyma dane, które analityk musi przeszukać podczas dochodzenia: „kto logował się z tego adresu między 2:00 a 4:00", „które konta sięgnęły po tę tabelę". To czytanie danych zapytaniami `SELECT` — bez modyfikowania bazy. Tu kompetencją jest **pisanie celnych, wydajnych zapytań na dużych tabelach logów**, bez zakłócania działającego systemu.

**Czym ta kompetencja NIE jest (rozróżnienie zawodowca):**
- To **nie** projektowanie baz danych ani strojenie wydajności silnika — to nie praca obrońcy.
- SQLi **nie** poznajesz po to, by atakować — poznajesz, by **wykrywać i bronić**. Ćwiczysz wyłącznie na celowo podatnych, treningowych aplikacjach (np. DVWA — Damn Vulnerable Web Application, aplikacja stworzona, by się na niej uczyć), **nigdy** na cudzych systemach (§4, klauzula prawna).
- Odpytywanie logów to **czytanie** (`SELECT`), nie modyfikowanie — obrońca w dochodzeniu nie zmienia danych, które bada (integralność dowodu).

**Kto tego używa i jak wygląda dzień pracy.** SQL jest narzędziem **analityka bezpieczeństwa aplikacji (AppSec)**, **pentestera** (testera penetracyjnego — po stronie ofensywnej, w granicach zlecenia), **analityka SOC** i **specjalisty reagowania na incydenty**. Przykłady:
- AppSec ocenia, czy formularz logowania jest podatny na SQLi, i zaleca zapytania parametryzowane.
- Analityk SOC pisze `SELECT`, by w bazie zdarzeń znaleźć wszystkie logowania z podejrzanego adresu w oknie incydentu.
- Inżynier detekcji buduje regułę wykrywającą próby SQLi w logach serwera WWW (charakterystyczne ciągi w adresach żądań).

**Po co rynkowi ta kompetencja.** Dane są celem ataku, a bazy je trzymają — więc obrońca musi i *chronić* bazę przed wyciekiem (strona 1), i *przeszukiwać* dane podczas dochodzenia (strona 2). To wyjaśnia, czemu SQL, choć nie jest rdzeniem, pojawia się w 13 ofertach ścieżki jako kompetencja wspierająca.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: czytanie danych zapytaniem `SELECT` (3–6 h)

**Zakres wiedzy/umiejętności:**
- Model danych: tabela, wiersz, kolumna, klucz; co znaczy „baza trzyma logi/zdarzenia".
- Podstawy `SELECT`: wybór kolumn, filtrowanie `WHERE`, sortowanie `ORDER BY`, ograniczenie `LIMIT`, zliczanie `COUNT`, grupowanie `GROUP BY`.
- Filtrowanie po czasie i adresie — odczytanie z tabeli zdarzeń bezpieczeństwa konkretnego śladu (logowania z danego IP, w danym oknie czasu).
- Praca na **własnej, treningowej** bazie z publicznym zbiorem logów (np. wczytanym z loghub do darmowej bazy SQLite/PostgreSQL lokalnie).

**Co student musi UMIEĆ ZROBIĆ:** napisać 4–6 zapytań `SELECT` wyszukujących i zliczających zdarzenia bezpieczeństwa w treningowej bazie logów; opisać słownie, czego szuka i dlaczego.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **`SELECT *` na tabeli logów to strzał w stopę.** Tabele zdarzeń mają miliony wierszy; pobranie wszystkiego bez `WHERE` i `LIMIT` obciąża bazę i zwraca śmieci. Zawodowiec pyta wąsko od początku.
- **Strefy czasowe kłamią tak samo jak w SIEM.** Kolumna czasu w UTC vs czas lokalny to klasyczne źródło „nic nie znalazłem" (spójne z niuansem czasu w `tools/content/research/siem.md`).

### L2 — Zastosowanie: wstrzyknięcie zapytania (SQL injection) — atak i obrona (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Mechanizm SQLi:** jak sklejenie zapytania z wejściem użytkownika (konkatenacja) pozwala zmienić sens zapytania; rozpoznanie podatnego wzorca w opisie aplikacji.
- **Rodzaje SQLi (rozpoznanie, nie wyczyn):** klasyczna (wynik wprost), oparta na sumie zbiorów (`UNION`), ślepa (blind — wniosek z zachowania aplikacji), czasowa (time-based — wniosek z opóźnienia). Student rozumie różnice, nie „odpala" ich na cudzym systemie.
- **Obrona — rdzeń tego poziomu:** **zapytania parametryzowane** (parametry osobno od treści — baza nie traktuje wejścia jak kodu) kontra **konkatenacja**; rola walidacji wejścia; zasada najmniejszych uprawnień konta bazy (aplikacja nie łączy się jako administrator).
- **Wykrycie SQLi w logach:** charakterystyczne ślady prób wstrzyknięcia w logu serwera WWW (apostrofy, słowa kluczowe SQL, sekwencje `UNION SELECT` w adresach żądań).
- **Środowisko ćwiczeń:** wyłącznie celowo podatna, treningowa aplikacja (DVWA / OWASP Juice Shop / WebGoat) na własnej maszynie — klauzula §4.

**Co student musi UMIEĆ ZROBIĆ:** na treningowej, celowo podatnej aplikacji pokazać, *dlaczego* podatne zapytanie jest podatne; przepisać je na zapytanie parametryzowane i wykazać, że atak przestaje działać; rozpoznać próbę SQLi w przykładowym logu serwera WWW.

**Profesjonalne niuanse:**
- **Zapytanie parametryzowane to obrona numer jeden — nie filtrowanie „brzydkich słów".** Amator próbuje blokować apostrofy i słowo `SELECT`; zawodowiec rozdziela dane od kodu parametryzacją, bo czarne listy zawsze da się obejść.
- **Mapa obiektowo-relacyjna (ORM) i procedury składowane to warstwy, nie tarcza absolutna.** Pomagają, ale źle użyte (sklejanie wewnątrz) wciąż bywają podatne. Pro wie, że bezpieczeństwo daje *parametryzacja*, nie sama obecność ORM.
- **Najmniejsze uprawnienia konta bazy ograniczają szkodę.** Nawet przy udanym wstrzyknięciu konto z prawem tylko do odczytu jednej tabeli wyrządza mniej szkód niż konto administracyjne. Obrona warstwowa (defense in depth).

### L3 — Portfolio: dochodzenie na danych i detekcja SQLi (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Dochodzenie zapytaniami na dużej tabeli logów:** złączenia (`JOIN` — łączenie dwóch tabel po wspólnym kluczu, np. zdarzenia + słownik kont), podzapytania, agregacje w oknie czasowym incydentu; rekonstrukcja sekwencji zdarzeń („co się działo po kolei").
- **Wydajność na dużych logach:** rola indeksu (struktura przyspieszająca wyszukiwanie), filtr po czasie przed agregacją, unikanie pełnego skanu tabeli; **czytanie bez zakłócania** działającego systemu (zapytania tylko do odczytu, świadomość blokad i obciążenia bazy produkcyjnej).
- **Reguła detekcji SQLi:** zamiana wiedzy z L2 na wzorzec wykrywający próby wstrzyknięcia w logach serwera WWW — most do SIEM (reguła detekcji) i do OWASP (klasa ataku).
- **Integralność dowodu:** dochodzenie czyta dane, nie modyfikuje ich; świadomość, że zmiana danych w trakcie badania niszczy materiał dowodowy.

**Co student musi UMIEĆ ZROBIĆ:** na treningowej bazie logów przeprowadzić dochodzenie złożonym zapytaniem (złączenie + agregacja + okno czasowe) rekonstruujące przebieg incydentu, z uzasadnieniem doboru zapytania pod wydajność; oraz zapisać regułę/wzorzec wykrywający próby SQLi w logu serwera WWW. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Zapytanie dochodzeniowe na produkcji bywa samo w sobie incydentem.** Ciężki `JOIN` bez indeksu na żywej bazie potrafi ją zablokować. Zawodowiec testuje na kopii, filtruje czasem, używa odczytu — amator odpala `SELECT *` na produkcji w trakcie ataku i dokłada awarię do awarii.
- **Indeks decyduje o tym, czy dochodzenie trwa sekundę, czy godzinę.** Filtr po niezindeksowanej kolumnie czasu na miliardach wierszy to pełny skan. Pro wie, po czym baza ma indeks.
- **Detekcja SQLi po słowach kluczowych daje fałszywe alarmy.** Słowo `select` w treści żądania bywa niewinne. To samo napięcie sygnał↔szum co w SIEM — wzorzec trzeba stroić.

### L4 — Realny przypadek profesjonalny: dochodzenie po incydencie wycieku z bazy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, brudnego* zestawu danych z incydentu (logi serwera WWW + tabela zdarzeń uwierzytelniania + dziennik bazy) i odpowiedź zapytaniami na pytania dochodzenia: czy doszło do wstrzyknięcia, co wyciekło, którędy, kiedy — bez modyfikowania materiału.
- Ocena podatności realistycznej (treningowej) aplikacji na SQLi i rekomendacja naprawy (parametryzacja + najmniejsze uprawnienia + walidacja), zestawiona z tym, co zaleciłby profesjonalista.
- **Benchmark:** kompletność i trafność dochodzenia oraz rekomendacji obrony zestawione z rozwiązaniem profesjonalisty na tym samym przypadku.

### L5 — Biegłość: obrona warstwowa danych i ekonomia dochodzenia (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Obrona warstwowa bazy w skali:** parametryzacja + najmniejsze uprawnienia + monitorowanie zapytań + zapora aplikacji webowej (WAF) jako warstwy, ze świadomością, że żadna pojedyncza nie wystarcza.
- **Architektura dostępu do danych logów:** jak udostępnić analitykom dane do dochodzeń bez ryzyka dla systemu produkcyjnego (repliki tylko do odczytu, hurtownia logów), z uwzględnieniem retencji i RODO.
- **Ekonomia i ryzyko zapytań:** koszt ciężkich zapytań na ogromnych zbiorach, ślad RODO w danych logów (adres IP jako dana osobowa), minimalizacja w dochodzeniu.
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie „czy znajdę dane", lecz „czy znajdę je bezpiecznie, zgodnie z prawem i bez szkody dla systemu".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zapytanie parametryzowane to obrona numer jeden przed SQLi — czarna lista to teatr.** Rozdzielenie danych od kodu (parametry osobno od treści zapytania) jest jedyną pewną obroną. Filtrowanie apostrofów i słów kluczowych zawsze da się obejść. Zawodowiec parametryzuje; amator „czyści" wejście i ma złudne poczucie bezpieczeństwa.

2. **Konkatenacja zapytania z wejściem użytkownika to definicja dziury.** Każde sklejenie SQL z tekstem od użytkownika to potencjalne wstrzyknięcie. To rozdzielnik pierwszego rzędu między kodem podatnym a bezpiecznym.

3. **Najmniejsze uprawnienia konta bazy ograniczają szkodę (defense in depth).** Aplikacja łącząca się jako administrator zamienia drobną dziurę w katastrofę. Konto z prawem tylko do odczytu potrzebnych tabel to obrona warstwowa — wstrzyknięcie wciąż boli, ale mniej.

4. **Zapytanie dochodzeniowe na produkcji bywa samo incydentem.** Ciężki `JOIN` bez indeksu na żywej bazie potrafi ją zablokować w środku ataku. Zawodowiec pracuje na kopii/replice tylko do odczytu, filtruje czasem, zna obciążenie. Amator odpala `SELECT *` na produkcji.

5. **Indeks decyduje o czasie dochodzenia.** Filtr po niezindeksowanej kolumnie na miliardach wierszy to pełny skan i godziny czekania. Pro wie, po czym baza ma indeks, i tak pisze zapytanie.

6. **Detekcja SQLi w logach to gra sygnał↔szum.** Wzorzec łapiący każde `select` w żądaniu tonie w fałszywych alarmach. To samo napięcie co w SIEM — regułę trzeba stroić (spójne z `tools/content/research/siem.md`).

7. **Integralność dowodu: dochodzenie czyta, nie zmienia.** Modyfikacja badanych danych niszczy materiał dowodowy i bywa łamaniem procedur. Obrońca w dochodzeniu używa wyłącznie odczytu.

8. **ORM i procedury składowane to warstwy, nie tarcza absolutna.** Pomagają, ale źle użyte (sklejanie wewnątrz procedury) wciąż bywają podatne. Bezpieczeństwo daje *parametryzacja*, nie sama etykieta „używamy ORM".

9. **RODO w danych logów.** Tabele zdarzeń trzymają adresy IP i loginy — bywają danymi osobowymi (wyrok TSUE Breyer, C-582/14). Dochodzenie minimalizuje dostęp, maskuje identyfikatory w raporcie i nie re-identyfikuje osób. Retencja logów to decyzja prawno-kosztowa (jak w SIEM, §4 SIEM pkt 8).

10. **Granica etyczno-prawna jest częścią kompetencji — twardo.** SQL injection ćwiczysz **wyłącznie na celowo podatnych, treningowych aplikacjach** (DVWA, OWASP Juice Shop, WebGoat) na własnej maszynie. **Nigdy** na cudzej aplikacji, stronie ani bazie. Nieautoryzowany dostęp do systemu lub danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego); test bez zgody właściciela to przestępstwo, nie „nauka".

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SQL muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury) — w soczewce cyber, proporcjonalnie do roli wspierającej (§1). Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Strona ofensywno-obronna (SQLi) i strona dochodzeniowa (odpytywanie logów) to dwa osobne wątki — nie miesza się ich w jednym projekcie.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Czytanie logów zapytaniem `SELECT`** — wczytanie publicznego zbioru logów do treningowej bazy, wyszukiwanie i zliczanie zdarzeń bezpieczeństwa, filtr po czasie i adresie | Model danych, `SELECT`/`WHERE`/`GROUP BY`, odczyt śladu | #1 (wąsko), #9 |
| P2 | L2 | **SQL injection: dlaczego podatne i jak naprawić** — na DVWA/Juice Shop pokazanie podatnego zapytania, przepisanie na parametryzowane, dowód że atak ustaje; konto bazy z najmniejszymi uprawnieniami | Mechanizm SQLi, parametryzacja vs konkatenacja, najmniejsze uprawnienia | #1, #2, #3, #8, #10 |
| P3 | L2/L3 | **Wykrywanie prób SQLi w logach serwera WWW** — wzorzec/reguła łapiąca ślady wstrzyknięcia, strojenie pod fałszywe alarmy; most do SIEM i OWASP | Ślady SQLi w logu, detekcja, strojenie sygnał↔szum | #6 |
| P4 | L3 | **Dochodzenie zapytaniami na dużej tabeli logów** — złączenie + agregacja + okno czasowe rekonstruujące incydent, dobór pod wydajność, praca tylko do odczytu | `JOIN`/podzapytania/agregacje, wydajność/indeks, integralność dowodu | #4, #5, #7 |
| (P5) | L4–L5 | **ZAPOWIEDŹ** — dochodzenie po realnym wycieku + obrona warstwowa danych w skali, z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #3, #9, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 4 projekty.** L4–L5: 1–2 projekty, po rozszerzeniu struktury. Liczba jest mniejsza niż przy SIEM/Python — proporcjonalnie do roli wspierającej (`lift` 0,20, §1), a nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (`SELECT`) → P2 (SQLi atak/obrona) → P3 (detekcja SQLi w logach) → P4 (dochodzenie). P3 i P4 są mostami: P3 do OWASP+SIEM, P4 do SIEM. Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

SQL jako kompetencja wspierająca **nie ma sensu w próżni** — dwie strony soczewki wymagają wcześniejszych liści. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Podstawy aplikacji webowych i `OWASP`** (liść `OWASP`, grupa AppSec) — bez rozumienia, czym jest aplikacja webowa, formularz i żądanie, student nie zrozumie mechanizmu wstrzyknięcia zapytania. **Wymagane przed L2 (SQLi).** To główny most ku stronie ofensywno-obronnej.
2. **Pojęcie logu i czytanie zdarzeń** — wspólny fundament z L1 SIEM (`tools/content/research/siem.md`) i z parserem logów w Pythonie (`cyber-python-automatyzacja-logow`, partia 1). **Wymagane przed L1 (odpytywanie logów).** To most ku stronie dochodzeniowej.
3. **Podstawy sieci i TCP/IP** (liście `TCP/IP`, `Network`) — żeby zinterpretować adres IP i żądanie HTTP w logu serwera WWW (P3, P4). **Wymagane przed L3.**
4. **`SIEM` jako kontekst detekcji** — reguła wykrywająca SQLi (P3) jest odmianą reguły detekcji z SIEM; znajomość pojęć progu, fałszywego alarmu i strojenia z L2 SIEM bardzo pomaga. **Pomocne/równoległe przy P3.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber, ze szczególnym naciskiem na SQLi (art. 267 KK, ćwiczenie wyłącznie na DVWA/Juice Shop/WebGoat na własnej maszynie). **Wymagane od L2.**

**Czego SQL dostarcza jako wsparcie dla innych liści ścieżki:** SQL domyka stronę danych w `OWASP` (wstrzyknięcie zapytania to konkretna pozycja listy), wspiera `SIEM`/`SOC` (odpytywanie baz zdarzeń w dochodzeniu) i `Incident Response` (rekonstrukcja przebiegu incydentu z danych). Łączy się też z `Python` (`tools/content/research/python.md`) — skryptowe, bezpieczne (parametryzowane!) odpytywanie baz. Dlatego SQL autorowany jest **po** OWASP i SIEM — most ma sens, gdy oba brzegi już stoją.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja SQL i baz (oficjalna, darmowa):**
- PostgreSQL — tutorial i referencja `SELECT` (otwartoźródłowa baza): https://www.postgresql.org/docs/current/sql-select.html
- SQLite — składnia języka (lekka baza do laba lokalnego): https://www.sqlite.org/lang.html
- PostgreSQL — indeksy (wydajność dochodzenia): https://www.postgresql.org/docs/current/indexes.html

**Wstrzyknięcie zapytania — atak i obrona (autorytatywne, otwarte):**
- OWASP — SQL Injection (opis ataku): https://owasp.org/www-community/attacks/SQL_Injection
- OWASP Top 10 — kategoria A03 Injection: https://owasp.org/Top10/A03_2021-Injection/
- OWASP SQL Injection Prevention Cheat Sheet (parametryzacja, obrona): https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP Query Parameterization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html
- PortSwigger Web Security Academy — SQL injection (darmowe, legalne laby w przeglądarce): https://portswigger.net/web-security/sql-injection
- CWE-89 (wstrzyknięcie SQL) — baza słabości MITRE: https://cwe.mitre.org/data/definitions/89.html
- MITRE ATT&CK — Exploit Public-Facing Application (T1190): https://attack.mitre.org/techniques/T1190/

**Treningowe, celowo podatne aplikacje (do ćwiczeń — wyłącznie własna maszyna):**
- DVWA — Damn Vulnerable Web Application (otwartoźródłowa, do nauki): https://github.com/digininja/DVWA
- OWASP Juice Shop (celowo podatna aplikacja szkoleniowa): https://owasp.org/www-project-juice-shop/
- OWASP WebGoat (środowisko nauki bezpieczeństwa aplikacji): https://owasp.org/www-project-webgoat/

**Dane do ćwiczeń (publiczne, otwarte):**
- loghub — publiczne zbiory logów do wczytania do treningowej bazy: https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Kodeks karny, art. 267 (nieuprawniony dostęp do informacji): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana — punkt szczególnej wagi.** SQL injection to jedyna kompetencja w tej partii z elementem **techniki ofensywnej**. Wszystkie laby SQLi (DVWA, Juice Shop, WebGoat, PortSwigger Academy) są **celowo podatne i stworzone do nauki** — ćwiczy się je wyłącznie na własnej, lokalnej maszynie albo w sandboksie dostawcy laba. Każdy projekt SQLi MUSI zawierać wzmocnioną klauzulę: zakaz testowania jakiejkolwiek cudzej aplikacji/strony/bazy, jawne odwołanie do art. 267 KK. Zbiory logów (loghub, SecRepo) wymagają klauzuli maskowania IP w raporcie (RODO, jak w partii 1). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził rozdęciem SQL do pełnego kursu baz danych.** CISO: „nie szukam administratora baz — szukam obrońcy, który ogarnia SQL na tyle, na ile trzeba". **Poprawka:** oparłam zakres o twardą daną (`lift` 0,20, najniższy w ścieżce → kompetencja wspierająca), ograniczyłam pulę do ~4 projektów L1–L3 i wprost wykluczyłam projektowanie/strojenie baz z zakresu (§1, §2). Proporcja zamiast kompletności kursu.

2. **Słabość: SQLi pokazane jako sztuczka ofensywna, nie jako obrona.** CISO: „jeśli uczycie wstrzykiwać, a nie bronić, produkujecie mi problem, nie pracownika". **Poprawka:** L2 ma rdzeń obronny — parametryzacja vs konkatenacja (niuans #1, #2), najmniejsze uprawnienia (#3), a atak poznajemy *po to, by wykryć i naprawić*. Dodałam projekt P2 kończący się dowodem, że po parametryzacji atak ustaje, oraz P3 o wykrywaniu prób w logach.

3. **Słabość: granica prawna potraktowana miękko jak przy projektach defensywnych.** CISO: „SQLi to jedyna rzecz w tej partii, którą junior może realnie złamać prawo — to musi krzyczeć z każdej strony". **Poprawka:** wzmocniłam klauzulę (niuans #10, nota dla Ryana w §7, prereq #5 w §6): ćwiczenie wyłącznie na DVWA/Juice Shop/WebGoat na własnej maszynie, jawny art. 267 KK, zakaz cudzych systemów w każdym projekcie SQLi.

4. **Słabość: strona dochodzeniowa ignorowała ryzyko dla produkcji.** CISO: „junior, który odpala ciężki `JOIN` na produkcji w trakcie ataku, dokłada awarię do incydentu". **Poprawka:** L3 dostał wydajność (indeks, filtr czasem), pracę tylko do odczytu i integralność dowodu (niuanse #4, #5, #7), z osobnym projektem P4. To realny rozdzielnik amator↔zawodowiec.

5. **Słabość: SQL wisiał w próżni, oderwany od reszty ścieżki.** CISO: „kompetencja wspierająca bez mostu do rdzenia jest bezużyteczna". **Poprawka:** §1 i §6 przepisałam wokół tezy „most, nie wyspa" — SQL stoi między OWASP (SQLi) a SIEM (dochodzenie/detekcja), autorowany po obu; P3/P4 jawnie oznaczone jako mosty; dodałam powiązanie z Pythonem (bezpieczne, parametryzowane odpytywanie skryptem).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (SQL, SQLi / SQL injection, konkatenacja, zapytanie parametryzowane, `SELECT`/`WHERE`/`JOIN`/`GROUP BY`, blind/time-based/UNION, ORM, procedura składowana, indeks, pełny skan, defense in depth, WAF, DVWA, Juice Shop, WebGoat, IoC kontekstowo, retencja, lift, CISO). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli *wspierającej*, jeśli autoring domknie projekty L1–L3 (P1–P4) z niuansami #1–#7, #9–#10. Pełna obrona warstwowa w skali i dochodzenie po realnym wycieku (#3, #9, #10) domkną się w L4/L5 (zależność od Ethana/Leo). Świadomie nie podnoszę SQL do rangi rdzenia — to byłoby niezgodne z danymi rynku (`lift` 0,20). Uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
