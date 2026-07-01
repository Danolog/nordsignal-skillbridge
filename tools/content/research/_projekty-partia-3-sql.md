# Dossier źródeł — partia 3 (SQL, domknięcie cyber)

> **Zadanie:** E3 „domknięcie cyber" — slate projektów dla klastra „Bazy danych (SQL)" ścieżki Cybersecurity Specialist.
> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner) w parze z researcherem źródeł.
> **Kanon kontraktu:** `tools/content/README-cyber-projects.md` (v0.1, Leo). Golden-example jakości: `tools/content/cyber-projects-partia-2.json` (8 projektów SIEM).
> **Research liścia:** `tools/content/research/sql.md` (v1.0, Sophia) — mapa L1–L3, niuanse #1–#10, źródła §7.
> **Liść klastra do pokrycia:** `SQL` (jedyny liść grupy, `career-model.ts` → „Bazy danych (SQL)", `kind: tool`, `lift` 0,20 — kompetencja **wspierająca**, nie rdzeń).

---

## Reguła pokrycia i rozłożenie poziomów

Klaster ma **jeden** liść — `SQL`. Pokrywam go w **każdym** z 4 projektów jako `required`; prerekwizyty (`acquired`) to dosłowne liście z sąsiednich grup ścieżki (OWASP, SIEM, Network, TCP/IP, Incident Response, Python, Linux) — realizują tezę researchu „most, nie wyspa" (SQL stoi między OWASP a SIEM).

Rozłożenie poziomów zgodne z dojrzałością (§5 researchu): fundament niżej, portfolio wyżej.

| # | slug | poziom | h | strona soczewki cyber |
|---|---|---|---|---|
| P1 | `cyber-sql-select-czytanie-logow` | L1 | 5 | dochodzeniowa (odczyt) |
| P2 | `cyber-sql-injection-parametryzacja-obrona` | L2 | 12 | ofensywno-obronna (SQLi) |
| P3 | `cyber-sql-detekcja-prob-injection-logi-www` | L2 | 12 | most: OWASP + SIEM (detekcja) |
| P4 | `cyber-sql-dochodzenie-join-okno-czasowe` | L3 | 22 | most: SIEM + IR (dochodzenie) |

Mix: **L1×1 · L2×2 · L3×1** — proporcjonalnie do roli wspierającej (§1 researchu: ~4 projekty L1–L3, mniej niż SIEM/Python, bo `lift` 0,20). Łańcuch zależności autoringu: P1 → P2 → P3 → P4 (żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy).

**Sprawdzenie kolizji slugów** (12 istniejących z kanonu): żaden z 4 nowych slugów nie koliduje — prefiks `cyber-sql-` jest nowy (istniejące to `cyber-siem-*`, `cyber-hardening-linux-bash`, `cyber-python-automatyzacja-logow`, `cyber-iam-active-directory-lab`).

---

## Legalność źródeł — wspólny mianownik

Wszystkie 15 adresów zweryfikowane 2026-07-01 (HTTP 200, publiczne, darmowe). Kategorie:

- **Dane do ćwiczeń (open_data):** loghub (publiczne zbiory logów systemowych, licencja repo + cytowanie paperu), SecRepo (otwarte zbiory danych bezpieczeństwa). Student wczytuje je do **własnej, lokalnej** bazy (SQLite/PostgreSQL). Zero cudzej infrastruktury.
- **Treningowe, celowo podatne aplikacje (oss):** DVWA (Damn Vulnerable Web Application), OWASP Juice Shop, OWASP WebGoat — stworzone **do nauki**, uruchamiane wyłącznie na **własnej maszynie/kontenerze**. To jedyna partia z elementem techniki ofensywnej — klauzula wzmocniona (art. 267 KK) obowiązuje od L2.
- **Dokumentacja i wiedza (otwarta):** PostgreSQL/SQLite (składnia, indeksy), OWASP (opis ataku, cheat sheety obrony), PortSwigger Web Security Academy (darmowe laby w piaskownicy dostawcy), CWE-89 (MITRE), MITRE ATT&CK T1190. Materiały referencyjne, nie dane.
- **Kontekst prawny:** TSUE Breyer C-582/14 (adres IP jako dana osobowa → maskowanie w raporcie, RODO), art. 267 KK (nieuprawniony dostęp).

**Nota RODO (wszystkie projekty):** logi trzymają adresy IP i loginy — w oddawanym artefakcie IP maskowane (np. `192.168.0.x`), bez re-identyfikacji osób. **Nota etyczno-prawna (P2–P4):** ćwiczenia SQLi wyłącznie na DVWA/Juice Shop/WebGoat/PortSwigger na własnej maszynie; zakaz dotykania cudzych aplikacji, stron i baz; jawne art. 267 KK. `theory_md` każdego projektu SQLi ZACZYNA się od klauzuli (wzorzec golden-example).

---

## P1 — `cyber-sql-select-czytanie-logow` (L1, 5 h)

**Koncept.** Student wczytuje publiczny zbiór logów (loghub) do własnej, lokalnej bazy (SQLite lub PostgreSQL) i pisze 4–6 zapytań `SELECT`, które wyszukują i zliczają zdarzenia bezpieczeństwa: logowania z danego adresu, w danym oknie czasu, zliczenia po koncie. Oddaje repozytorium z zapytaniami i krótką notą, czego szuka i dlaczego. To strona **dochodzeniowa** soczewki — czytanie danych, nie modyfikowanie.

**Źródło.** open_data — loghub: https://github.com/logpai/loghub (główne). Zapasowo SecRepo: https://www.secrepo.com/. Składnia: PostgreSQL `SELECT` https://www.postgresql.org/docs/current/sql-select.html, SQLite https://www.sqlite.org/lang.html.

**Legalność.** Dane publiczne/otwarte, wczytywane do własnej bazy — zero cudzej infrastruktury. Klauzula RODO (maskowanie IP w oddanym artefakcie). Nie ma tu techniki ofensywnej → klauzula bazowa bez art. 267 wzmocnionego.

**Prerekwizyty.** `required`: SQL. `acquired`: Linux (lokalny lab — baza + wczytanie danych).

**Szkic rubryki (Σ=100):**
- Zapytania `SELECT` wyszukujące zdarzenia — 30 (dowód: eksport 4–6 zapytań + wynik).
- Filtr po czasie i adresie — 25 (odnalezienie konkretnego śladu w oknie czasu; nota o strefie czasowej UTC vs lokalny).
- Zliczanie i grupowanie (`COUNT`/`GROUP BY`) — 20 (zestawienie, np. liczba prób per konto).
- Wąskie pytanie zamiast `SELECT *` — 15 (nota: czemu `SELECT *` na tabeli logów to strzał w stopę; niuans #1 researchu).
- Odtwarzalność, atrybucja, RODO — 10 (README + maskowanie IP + klauzula).

---

## P2 — `cyber-sql-injection-parametryzacja-obrona` (L2, 12 h)

**Koncept.** Na treningowej, celowo podatnej aplikacji (DVWA / OWASP Juice Shop) student pokazuje, **dlaczego** podatne zapytanie jest podatne (sklejanie zapytania z wejściem — konkatenacja), przepisuje je na **zapytanie parametryzowane** i dowodzi, że atak przestaje działać. Konfiguruje konto bazy z **najmniejszymi uprawnieniami**. To strona **ofensywno-obronna** — atak poznaje po to, by go naprawić.

**Źródło.** oss — DVWA: https://github.com/digininja/DVWA (główne, uruchamiane lokalnie). Alternatywy: OWASP Juice Shop https://owasp.org/www-project-juice-shop/, OWASP WebGoat https://owasp.org/www-project-webgoat/. Obrona: OWASP SQLi Prevention Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html, Query Parameterization Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html. Kontekst: OWASP A03 Injection https://owasp.org/Top10/A03_2021-Injection/, CWE-89 https://cwe.mitre.org/data/definitions/89.html, PortSwigger Academy (darmowe laby) https://portswigger.net/web-security/sql-injection.

**Legalność.** DVWA/Juice Shop/WebGoat są **celowo podatne, stworzone do nauki**, uruchamiane wyłącznie na własnej maszynie/kontenerze. `theory_md` ZACZYNA się wzmocnioną klauzulą: zakaz testowania cudzych aplikacji/stron/baz, jawny **art. 267 KK**. PortSwigger — laby w piaskownicy dostawcy (legalne z definicji).

**Prerekwizyty.** `required`: SQL. `acquired`: OWASP (bez rozumienia aplikacji webowej/formularza nie ma mechanizmu wstrzyknięcia — główny most, §6 prereq #1), Linux (lokalny lab z podatną aplikacją).

**Szkic rubryki (Σ=100):**
- Dowód, dlaczego zapytanie jest podatne — 25 (pokazanie konkatenacji jako źródła dziury; niuans #2).
- Naprawa parametryzacją + dowód, że atak ustaje — 30 (zapytanie parametryzowane przed/po; niuans #1 — obrona nr 1, nie czarna lista).
- Najmniejsze uprawnienia konta bazy — 20 (konto tylko-do-potrzebnej-tabeli; niuans #3, defense in depth).
- Rozpoznanie rodzajów SQLi (opis, nie wyczyn na cudzym) — 15 (klasyczna/UNION/blind/time-based — różnice; niuans #8 o ORM jako warstwie).
- Etyka labu, odtwarzalność — 10 (klauzula art. 267 KK, README, praca wyłącznie na treningowej aplikacji lokalnie).

---

## P3 — `cyber-sql-detekcja-prob-injection-logi-www` (L2, 12 h)

**Koncept.** Student buduje wzorzec/regułę wykrywającą **próby SQL injection w logach serwera WWW** (charakterystyczne ślady: apostrofy, `UNION SELECT`, słowa kluczowe SQL w adresach żądań). Zbiera dane z dwóch stron: własne logi z prób na DVWA (ruch złośliwy) + publiczny zbiór ruchu łagodnego (loghub, dziennik serwera WWW) jako tło. Sednem jest **strojenie pod fałszywe alarmy** — słowo `select` w treści żądania bywa niewinne. Most do OWASP (klasa ataku) i SIEM (reguła detekcji).

**Źródło.** open_data — loghub: https://github.com/logpai/loghub (główne, dziennik serwera WWW jako tło łagodne). Zapasowo SecRepo: https://www.secrepo.com/ (zbiory HTTP). Ruch złośliwy student generuje sam na własnym DVWA (https://github.com/digininja/DVWA). Kontekst ataku: OWASP SQL Injection https://owasp.org/www-community/attacks/SQL_Injection, MITRE ATT&CK T1190 (Exploit Public-Facing Application) https://attack.mitre.org/techniques/T1190/.

**Legalność.** Dane łagodne — publiczne/otwarte (loghub). Dane złośliwe — z **własnego** labu DVWA (nie z cudzego systemu). Klauzula wzmocniona (art. 267 KK — próby SQLi tylko na własnej aplikacji), RODO (maskowanie IP w logach WWW; adres IP bywa daną osobową — TSUE Breyer C-582/14).

**Prerekwizyty.** `required`: SQL. `acquired`: OWASP (klasa ataku SQLi), SIEM (pojęcie reguły detekcji, progu, fałszywego alarmu — §6 prereq #4), Network (interpretacja żądania HTTP i adresu w logu).

**Szkic rubryki (Σ=100):**
- Wzorzec/reguła łapiąca ślady SQLi w logu WWW — 30 (dowód: wzorzec + trafienia na złośliwym ruchu z własnego DVWA).
- Rozdział sygnału od szumu (fałszywe alarmy) — 25 (pokazanie, że `select` w łagodnym ruchu nie zapala reguły po strojeniu; niuans #6).
- Strojenie przed/po (liczbowo) — 20 (ile fałszywych alarmów przed, ile po zawężeniu wzorca).
- Most do SIEM/OWASP — 15 (nota: jak ten wzorzec staje się regułą SIEM; mapowanie na kategorię OWASP A03/T1190).
- Etyka, RODO, odtwarzalność — 10 (klauzula art. 267 KK, maskowanie IP, README z atrybucją loghub).

---

## P4 — `cyber-sql-dochodzenie-join-okno-czasowe` (L3, 22 h)

**Koncept.** Na dużej treningowej tabeli logów (loghub) student przeprowadza **dochodzenie złożonym zapytaniem**: złączenie (`JOIN`) tabeli zdarzeń ze słownikiem kont + agregacja + okno czasowe incydentu, rekonstruujące przebieg zdarzeń („co się działo po kolei"). Uzasadnia dobór zapytania **pod wydajność** (indeks, filtr czasem przed agregacją, unikanie pełnego skanu) i pracuje **tylko do odczytu** (integralność dowodu). To poziom „portfolio na rozmowę o pracę". Most do SIEM (rekonstrukcja łańcucha) i Incident Response.

**Źródło.** open_data — loghub: https://github.com/logpai/loghub (główne, duże tabele logów do złączeń i agregacji). Zapasowo SecRepo: https://www.secrepo.com/. Wydajność: PostgreSQL indeksy https://www.postgresql.org/docs/current/indexes.html. Bezpieczne, parametryzowane odpytywanie skryptem: Python (link do researchu Pythona partii 1).

**Legalność.** Dane publiczne/otwarte, wczytane do własnej bazy — zero cudzej infrastruktury. Klauzula bazowa + RODO (maskowanie IP, integralność dowodu — dochodzenie czyta, nie zmienia; niuans #7). Nacisk na niuans #4: ciężki `JOIN` bez indeksu na żywej bazie potrafi ją zablokować — dlatego praca na kopii/replice tylko do odczytu.

**Prerekwizyty.** `required`: SQL. `acquired`: Incident Response (rekonstrukcja przebiegu incydentu — §6), SIEM (kontekst dochodzenia w bazie zdarzeń), TCP/IP (interpretacja adresu i żądania — §6 prereq #3, wymagane przed L3), Python (skryptowe, parametryzowane odpytywanie — powiązanie z researchem Pythona).

**Szkic rubryki (Σ=100):**
- Dochodzenie złączeniem + agregacją + oknem czasowym — 30 (dowód: zapytanie `JOIN` rekonstruujące sekwencję zdarzeń incydentu).
- Uzasadnienie doboru pod wydajność — 25 (rola indeksu, filtr czasem przed agregacją, unikanie pełnego skanu; niuanse #4, #5).
- Praca tylko do odczytu / integralność dowodu — 20 (nota: dochodzenie czyta, nie modyfikuje; świadomość obciążenia bazy produkcyjnej; niuans #7).
- Rekonstrukcja przebiegu incydentu (narracja z danych) — 15 (opis „co się działo po kolei" wsparty wynikami zapytań).
- Dokumentacja, RODO, odtwarzalność — 10 (README, maskowanie IP, atrybucja loghub, klauzula).

---

## Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

1. **Kolizja slugów.** Sprawdzone wobec 12 istniejących — nowy prefiks `cyber-sql-`, zero kolizji. OK.
2. **Pokrycie liścia.** SQL jako `required` w każdym z 4 projektów — liść klastra domknięty wielokrotnie; prereqs to dosłowne liście (weryfikacja pisowni: `Incident Response`, `TCP/IP`, `OWASP`, `SIEM`, `Network`, `Python`, `Linux` — wszystkie ze zbioru). OK.
3. **Proporcja do roli wspierającej.** 4 projekty (nie 8 jak SIEM), zgodnie z `lift` 0,20 — nie rozdmuchane do kursu baz danych. OK.
4. **Granica prawna SQLi.** P2/P3 (technika ofensywna) mają wzmocnioną klauzulę art. 267 KK i wyłącznie własny lab (DVWA/Juice Shop/WebGoat/PortSwigger). P4/P1 — klauzula bazowa + RODO. OK.
5. **Widelki godzin i wagi.** L1=5 (3–6), L2=12/12 (8–14), L3=22 (18–30); każda rubryka Σ=100, kryteria mierzalne z repo/README. OK.

**Żargon:** SQL, SQLi/wstrzyknięcie zapytania, konkatenacja, zapytanie parametryzowane, `SELECT`/`JOIN`/`GROUP BY`, indeks, pełny skan, defense in depth, DVWA — rozwinięte przy pierwszym użyciu w `theory_md` każdego projektu (faza E3-A).
