# Research kompetencji: SIEM

> **Status:** WZORZEC (golden-example) researchu kompetencji w ETAP E3 — wg niego powstają researche pozostałych liści ścieżki Cybersecurity Specialist i kolejnych ścieżek.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SIEM` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **10,8%** ofert ścieżki wymienia SIEM |
| **Liczba ofert (`offers`)** | **40** |
| **`kind`** | `concept` (kompetencja koncepcyjna, nie pojedyncze narzędzie — patrz §2) |
| **`lift`** | 23,77 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| **SIEM** (ten plik) | 10,8 | 40 | concept |
| SOC | 5,1 | 19 | concept |
| Splunk | 4,3 | 16 | tool |
| EDR / XDR | 3,2 | 12 | tool |
| SOAR | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| Incident Response | 1,1 | 4 | concept |

**Wniosek dla autoringu:** SIEM to liść o najwyższym popycie w całej ścieżce Cybersecurity Specialist (10,8% — więcej niż samodzielne narzędzia Splunk czy EDR/XDR). To znaczy, że rynek pyta o *kompetencję koncepcyjną* „umiem prowadzić monitorowanie zdarzeń w SIEM", a konkretne narzędzie (Splunk, Defender, CrowdStrike) jest pochodną. Research SIEM jest więc rdzeniem grupy — projekty pozostałych liści (SOC, Splunk, SOAR…) będą się o niego opierać.

---

## 2. Definicja kompetencji i jej rola w pracy

**SIEM (Security Information and Event Management — system zbierania, normalizacji i korelowania zdarzeń bezpieczeństwa)** to centralne miejsce, do którego spływają zapisy zdarzeń (tzw. *logi* — ślady tego, co się działo w systemie: kto się zalogował, co uruchomił, jaki ruch przeszedł przez zaporę) ze wszystkich systemów firmy. SIEM robi cztery rzeczy, których pojedynczy log nie potrafi:

1. **Zbiera (collection / ingestion — zaciąg)** logi z setek źródeł w jedno miejsce.
2. **Normalizuje (normalization)** — sprowadza różne formaty zapisu do wspólnego słownika pól, żeby „adres źródłowy" z zapory i z serwera nazywał się tak samo i dał się porównać.
3. **Koreluje (correlation — łączenie zdarzeń)** — zestawia zdarzenia z różnych źródeł w czasie, żeby zobaczyć wzorzec, którego nie widać w jednym logu (np. nieudane logowanie + udane logowanie + pobranie dużej ilości danych = możliwe przejęcie konta).
4. **Alarmuje i przechowuje (alerting + retention — reguły alertów i retencja)** — wyzwala alert, gdy reguła wykryje podejrzany wzorzec, i trzyma logi przez wymagany czas (dla audytu, dochodzenia, zgodności z prawem).

**Czym SIEM NIE jest (rozróżnienie zawodowca):**
- SIEM to nie antywirus i nie „wykrywacz" sam z siebie — to platforma, która jest tak dobra, jak **reguły detekcji** (logika wykrywania) i **jakość danych**, które do niej wpłyną. Pusty SIEM nie wykrywa niczego.
- SIEM ≠ SOAR. SOAR (Security Orchestration, Automation and Response — orkiestracja i automatyzacja reakcji) automatyzuje *odpowiedź* po wykryciu (np. automatyczne zablokowanie konta). SIEM wykrywa; SOAR reaguje. To osobny liść grupy.
- SIEM ≠ EDR/XDR. EDR (Endpoint Detection and Response — wykrywanie na stacji końcowej) widzi głęboko jeden punkt (laptop, serwer); SIEM widzi szeroko całą firmę, łącząc EDR z resztą. Często EDR jest *źródłem* logów dla SIEM.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja SIEM jest rdzeniem pracy **analityka SOC (Security Operations Center — centrum monitorowania bezpieczeństwa)** oraz **inżyniera detekcji (detection engineer)**. Typowy dzień:
- **Analityk SOC (L1/L2 w nomenklaturze rynkowej, nie mylić z poziomami SkillBridge L1–L5):** przegląda kolejkę alertów wygenerowanych przez SIEM, przeprowadza *triage* (segregację — który alert jest realnym zagrożeniem, który fałszywym alarmem), eskaluje istotne, zamyka szum. Kluczowa umiejętność: szybko odróżnić sygnał od szumu.
- **Inżynier detekcji / inżynier SIEM:** buduje i stroi reguły detekcji, podłącza nowe źródła logów, dba o jakość danych, mapuje pokrycie wykrywania na taktyki napastnika (MITRE ATT&CK — patrz §4), pilnuje kosztu zaciągu.

**Po co rynkowi ta kompetencja.** Regulacje europejskie (NIS2 — dyrektywa o cyberbezpieczeństwie sieci i informacji; DORA — rozporządzenie o odporności cyfrowej sektora finansowego) wymagają od coraz większej liczby firm zdolności wykrywania i raportowania incydentów w krótkich terminach. Bez SIEM firma nie ma jak udowodnić, że *wie*, co się u niej dzieje. Stąd stały, wysoki popyt (10,8% ofert ścieżki).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: czytanie i wyszukiwanie zdarzeń (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest log, jakie ma typowe pola (znacznik czasu, źródło, host, użytkownik, akcja, wynik), czym różni się log uwierzytelniania od logu zapory czy serwera WWW.
- Zaciąg danych do SIEM: wczytanie publicznego, tutorialowego zbioru logów do darmowej instancji (np. **Splunk Free** albo **Elastic/OpenSearch** uruchomiony lokalnie); pojęcie `sourcetype` (typ źródła — etykieta mówiąca SIEM-owi, jak rozumieć dane).
- Podstawy języka zapytań: **SPL** (Search Processing Language — język zapytań Splunk) lub **KQL** (Kusto Query Language — język zapytań Microsoft Sentinel/Defender). Filtr po czasie, po polu, zliczanie (`stats count`), sortowanie.
- Odczytanie z logów konkretnego, prostego zdarzenia bezpieczeństwa: nieudane logowania, logowanie poza godzinami pracy, dostęp z nietypowego adresu.

**Co student musi UMIEĆ ZROBIĆ:** wczytać zbiór logów do SIEM z poprawnym `sourcetype`; napisać 3–5 zapytań wyszukujących i zliczających zdarzenia; opisać słownie, co dane zdarzenie oznacza dla bezpieczeństwa.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Znacznik czasu kłamie częściej, niż myślisz.** Log ma często dwa czasy: kiedy zdarzenie *się stało* (event time) i kiedy *dotarło* do SIEM (index time). Bez zsynchronizowanego czasu (NTP — protokół synchronizacji czasu) korelacja między systemami się rozjeżdża. Amator filtruje po złym czasie i „nie widzi" ataku, który jest w danych.
- **Strefy czasowe i format daty** — log w UTC vs log w czasie lokalnym to klasyczne źródło fałszywego „nic nie znalazłem".

### L2 — Zastosowanie: detekcja, reguły alertów, triage (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Normalizacja i parsowanie (parsing — rozbiór logu na pola):** wyciągnięcie pól z surowego, niestrukturalnego logu; pojęcie wspólnego modelu pól (np. Splunk CIM — Common Information Model, albo Elastic ECS — Elastic Common Schema), żeby reguły działały niezależnie od źródła.
- **Reguła detekcji / przypadek użycia (use case):** zamiana opisu zagrożenia („wiele nieudanych logowań, potem jedno udane") na zapytanie z progiem i oknem czasowym.
- **Próg i okno czasowe (threshold + time window):** świadomy dobór „ile w jakim czasie" jest podejrzane — i dlaczego ten próg, a nie inny.
- **Triage alertu:** nadanie priorytetu (severity), ustalenie, czy to prawdziwy pozytyw (true positive — realne zagrożenie) czy fałszywy alarm (false positive), i co dalej.
- **Wzbogacanie (enrichment):** dołożenie kontekstu do alertu — czy to konto administratora? czy ten adres IP jest na liście znanych zagrożeń (threat intelligence — wywiad o zagrożeniach)? czy host to serwer produkcyjny?

**Co student musi UMIEĆ ZROBIĆ:** napisać regułę detekcji z uzasadnionym progiem; uruchomić ją na zbiorze i odróżnić prawdziwe pozytywy od fałszywych; napisać raport triage (priorytet + następny krok); wzbogacić alert o jeden zewnętrzny kontekst.

**Profesjonalne niuanse:**
- **Próg to kompromis, nie liczba z sufitu.** Za niski próg → lawina fałszywych alarmów (alert fatigue — zmęczenie alertami, §4). Za wysoki → przeoczony atak. Zawodowiec dobiera próg na podstawie *bazowej linii* (baseline — normalny poziom danego zdarzenia w tej firmie), nie z poradnika.
- **Fałszywy pozytyw kosztuje, fałszywy negatyw zabija.** Te dwa błędy nie są symetryczne — i to napięcie definiuje całe strojenie reguł.
- **Reguła bez właściciela i bez opisu reakcji to martwa reguła.** Alert, przy którym analityk nie wie, co zrobić, jest gorszy niż brak alertu — bo zajmuje czas i uczy ignorowania.

### L3 — Portfolio: inżynieria detekcji i pokrycie zagrożeń (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Mapowanie na MITRE ATT&CK** (otwarta baza wiedzy o taktykach i technikach napastników — patrz §4 i §7): przypisanie każdej reguły do konkretnej techniki, świadome zbudowanie *pokrycia detekcji* (detection coverage) i zobaczenie luk (blind spots — martwych pól, w których nic nie wykrywamy).
- **Detekcja niezależna od producenta:** reguły w formacie **Sigma** (otwarty, neutralny format reguł detekcji, tłumaczony potem na SPL/KQL/inne) — żeby logika nie była uwięziona w jednym SIEM.
- **Strojenie reguł (tuning) na danych:** redukcja fałszywych alarmów bez gubienia prawdziwych zagrożeń; pojęcie listy wyjątków (allowlist) i jej ryzyka (patrz §4).
- **Korelacja wielu źródeł:** reguła łącząca np. log uwierzytelniania + log EDR + log zapory w jeden alert o wyższej pewności.
- **Pulpit i metryki SOC:** zbudowanie pulpitu (dashboard) i policzenie miar pracy SOC — MTTD (Mean Time To Detect — średni czas wykrycia), MTTR (Mean Time To Respond — średni czas reakcji), liczba fałszywych alarmów na regułę.
- **Testowanie detekcji:** świadomość, że regułę trzeba *sprawdzić, czy w ogóle wykrywa* — symulacja techniki (np. otwarty zestaw **Atomic Red Team** — gotowe, bezpieczne odwzorowania technik ATT&CK do testu detekcji na własnym labie) i potwierdzenie, że reguła się odpaliła.

**Co student musi UMIEĆ ZROBIĆ:** zbudować zestaw kilku skorelowanych reguł zmapowanych na ATT&CK, ze świadomie pokazaną luką pokrycia; nastroić je na danych redukując fałszywe alarmy z udokumentowaniem decyzji; udowodnić, że reguła wykrywa, odtwarzając technikę na własnym labie; przedstawić pulpit z miarami SOC. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Pokrycie ATT&CK to nie wyścig „im więcej reguł, tym lepiej".** Sto reguł na jedną technikę i zero na inną to gorsze pokrycie niż równomierne. Zawodowiec patrzy na *mapę luk*, nie na licznik reguł.
- **Strojenie przez allowlist to broń obosieczna.** Każdy wyjątek („ignoruj ten proces") to potencjalna dziura, którą napastnik może wykorzystać, podszywając się pod to, co odsialiśmy. Zawodowiec dokumentuje *każdy* wyjątek i jego uzasadnienie.
- **Reguła, której nikt nie przetestował, nie istnieje.** Cisza w SIEM nie znaczy „bezpiecznie" — może znaczyć „reguła nigdy się nie odpaliła, bo ma błąd albo brak danych".

### L4 — Realny przypadek profesjonalny: wdrożenie/strojenie detekcji w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *nieuporządkowanego, realnego* zestawu logów z wieloma źródłami o złej jakości (brakujące pola, niespójne czasy, śmieci) i doprowadzenie go do stanu zdatnego do detekcji — to jest realna codzienność, nie laboratoryjny, czysty zbiór.
- Zaprojektowanie zestawu reguł pod *konkretny scenariusz zagrożenia* istotny dla danej branży (np. wyłudzenie dostępu w firmie finansowej pod kątem DORA) i nastrojenie ich tak, by SOC dało się obsłużyć tę kolejkę alertów realnym zespołem.
- **Benchmark:** wynik studenta (zestaw reguł, redukcja fałszywych alarmów, pokrycie ATT&CK, MTTD na symulacji) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: architektura wykrywania i ekonomia SIEM (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia detekcji dla całej organizacji:** decyzja, *które* źródła logów podłączyć (i których nie warto), świadoma wobec kosztu zaciągu (patrz niuans ekonomiczny w §4) i wartości wykrywania.
- **Architektura potoku danych (data pipeline):** filtrowanie i kształtowanie logów *przed* zaciągiem do SIEM, warstwy retencji (hot/warm/cold — gorąca/ciepła/zimna; szybkie drogie vs wolne tanie przechowywanie), zgodność z wymogami prawnymi retencji.
- **Detection-as-code (detekcja jako kod):** reguły w repozytorium z kontrolą wersji, testami i wdrożeniem jak oprogramowanie — dojrzałość zespołu detekcji.
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie tylko „czy wykrywa", ale „czy wykrywa za rozsądny koszt i da się to utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zmęczenie alertami (alert fatigue) i stosunek sygnału do szumu.** Realny SOC tonie w alertach; badania branżowe od lat pokazują, że większość alertów nigdy nie jest zbadana, a duża część to fałszywe alarmy. Zawodowiec optymalizuje *jakość* kolejki alertów (mało, trafnie), nie *liczbę* reguł. Amator dokłada reguły i pogarsza problem.

2. **Triage fałszywych pozytywów to rzemiosło, nie checkbox.** Odróżnienie „skaner podatności robi swoje" od „ktoś nas skanuje" wymaga kontekstu: czyj to adres, czy zaplanowane, czy znane. Bez kontekstu każdy triage to zgadywanie.

3. **Korelacja zdarzeń bije pojedynczą regułę.** Pojedyncze nieudane logowanie to nic. Nieudane logowania z dziesięciu kont z jednego adresu, a potem jedno udane i pobranie danych — to atak. Wartość SIEM tkwi w *łączeniu*, nie w pojedynczym alercie.

4. **Normalizacja i jakość danych to fundament, nie nuda.** Reguła napisana na pole `src_ip` nie zadziała na źródle, gdzie to pole nazywa się `source_address`. Wspólny model pól (CIM/ECS) to warunek tego, by detekcja w ogóle działała w skali. Amator pisze reguły pod jedno źródło; zawodowiec pod znormalizowany model.

5. **Martwe pola (blind spots) i luki pokrycia.** Najgroźniejsze jest to, czego SIEM *nie widzi*, bo źródło nie jest podłączone albo log nie powstaje. Zawodowiec mapuje pokrycie na MITRE ATT&CK i *świadomie* nazywa luki; amator zakłada, że „skoro cisza, to bezpiecznie".

6. **Mapowanie na MITRE ATT&CK** (otwarta, darmowa baza taktyk i technik realnych napastników, utrzymywana przez MITRE) — wspólny język między detekcją a zagrożeniem. Reguła bez przypisanej techniki to reguła bez odpowiedzi na pytanie „przed czym chroni".

7. **Strojenie (tuning) ≠ wyciszanie (muting).** Nastrojenie reguły to zmiana logiki tak, by była trafniejsza. Wyciszenie to zamiecenie alertu pod dywan. Allowlist (lista wyjątków) bywa konieczna, ale każdy wyjątek to ryzyko — napastnik celuje w to, co odsialiśmy. Każdy wyjątek = dokumentacja + uzasadnienie.

8. **Retencja to decyzja prawno-kosztowa, nie techniczna.** Jak długo trzymać logi? Za krótko → nie zbadasz incydentu sprzed miesięcy i łamiesz wymogi (NIS2/DORA, PCI-DSS dla kart, krajowe przepisy). Za długo → rosną koszty i ryzyko RODO (logi bywają danymi osobowymi). Warstwy hot/warm/cold to kompromis koszt–dostępność.

9. **Ekonomia zaciągu — SIEM kosztuje za gigabajt.** Większość komercyjnych SIEM rozlicza się od ilości wchłanianych danych (GB/dzień) albo mocy obliczeniowej. Podłączenie „wszystkiego" rujnuje budżet i topi sygnał w szumie. Zawodowiec decyduje, *co warto* zaciągać i co filtrować przed zaciągiem; amator zaciąga wszystko.

10. **Czas i synchronizacja (NTP).** Korelacja między systemami działa tylko, gdy zegary są zgodne. Rozjechany czas = niewidzialny atak. To jeden z pierwszych rzeczy, które sprawdza dojrzały inżynier.

11. **Testowanie detekcji (np. Atomic Red Team).** Reguła musi być sprawdzona pod kątem „czy faktycznie wykrywa technikę". Bezpieczna symulacja techniki na własnym labie i potwierdzenie alertu odróżnia inżyniera detekcji od osoby, która „napisała regułę i ma nadzieję".

12. **Granica etyczno-prawna jest częścią kompetencji.** Analityk pracuje na logach, które bywają danymi osobowymi (adres IP bywa daną osobową — wyrok TSUE Breyer, C-582/14). Minimalizacja, maskowanie, brak re-identyfikacji to nie „dodatek RODO", lecz element zawodowego rzemiosła. Nieautoryzowany dostęp do cudzych systemów/danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SIEM muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania analityka SOC / inżeniera detekcji. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwsze alerty w SIEM** — zaciąg publicznych logów, zapytania, prosty warunek alertu (już istnieje: `cyber-siem-pierwsze-alerty-splunk` w partii 1) | Zaciąg, `sourcetype`, podstawy SPL/KQL, odczyt prostego zdarzenia, raport triage | #2 (triage), #10 (czas) |
| P2 | L1 | **Czytanie czasu i stref** — ten sam zbiór, ale ćwiczenie event-time vs index-time, strefy, NTP; znalezienie zdarzenia ukrytego przez złą strefę | Pola logu, znacznik czasu, pułapka czasu | #10 |
| P3 | L2 | **Normalizacja i parsowanie** — sprowadzenie 2–3 różnych źródeł do wspólnego modelu pól (CIM/ECS), reguła działająca na obu | Parsowanie, normalizacja, wspólny model pól | #4 |
| P4 | L2 | **Reguła detekcji z uzasadnionym progiem + triage** — np. brute-force / rozpylanie haseł (password spraying), świadomy próg z bazowej linii, segregacja TP/FP | Reguła, próg, okno, triage, TP vs FP | #1, #2 |
| P5 | L2 | **Wzbogacanie alertu** — dołożenie threat intelligence / GeoIP / kontekstu konta do alertu i pokazanie, jak zmienia priorytet | Enrichment, severity, kontekst | #2, #5 |
| P6 | L3 | **Korelacja wielu źródeł** — jedna reguła łącząca uwierzytelnianie + EDR + zapora w alert wyższej pewności | Korelacja wieloźródłowa | #3 |
| P7 | L3 | **Mapowanie na MITRE ATT&CK + mapa luk** — zestaw reguł zmapowanych na techniki, świadomie nazwana luka pokrycia, reguły w formacie Sigma | Mapowanie ATT&CK, pokrycie, Sigma, blind spots | #5, #6 |
| P8 | L3 | **Strojenie i testowanie detekcji** — redukcja fałszywych alarmów z dokumentacją wyjątków + dowód, że reguła wykrywa (Atomic Red Team na własnym labie) | Tuning, allowlist, testowanie detekcji | #7, #11 |
| P9 | L3 | **Pulpit i metryki SOC** — dashboard + MTTD/MTTR + liczba FP na regułę, interpretacja | Pulpit, metryki SOC | #1 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — realny brudny zbiór + scenariusz branżowy (DORA), architektura potoku + retencja + ekonomia zaciągu, detection-as-code; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #8, #9, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów** (z czego 1 już istnieje). L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1→P2 (czas) → P3 (normalizacja) → P4 (reguła) → P5 (wzbogacanie) → P6 (korelacja) → P7 (ATT&CK) → P8 (strojenie/test) → P9 (metryki). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

SIEM **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — bez rozumienia adresu IP, portu, protokołu, sesji student nie zinterpretuje logu zapory ani ruchu. **Wymagane przed L1.**
2. **Czytanie i pojęcie logu** — co to log, gdzie powstaje, jakie ma pola. Częściowo budowane w L1 SIEM, ale fundament logów uwierzytelniania domyka projekt `cyber-python-automatyzacja-logow` (partia 1, liść `Python`). **Wymagane/równoległe na L1.**
3. **Podstawy systemów operacyjnych** — `Linux` i/lub `Windows` (logi tych systemów to główne źródło dla SIEM); rozumienie, czym jest zdarzenie logowania, proces, usługa. Projekty partii 1 (`cyber-hardening-linux-bash`, `cyber-iam-active-directory-lab`) tworzą tę bazę. **Wymagane przed L2.**
4. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (kto się loguje, czym jest konto i grupa) — żeby zrozumieć alerty o przejęciu konta. **Wymagane przed L2 (reguły uwierzytelniania).**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie). **Wymagane od L1.**

**Czego SIEM dostarcza jako prerekwizyt dla innych liści grupy:** SIEM jest fundamentem dla `SOC` (cała praca SOC dzieje się w SIEM), `Splunk`/`Microsoft Defender`/`CrowdStrike` (konkretne narzędzia klasy SIEM/EDR), `SOAR` (automatyzacja reakcji *po* wykryciu w SIEM) i `Incident Response` (dochodzenie korzysta z danych SIEM). Dlatego SIEM autorowany jest w grupie pierwszy.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja narzędzi (oficjalna, darmowa):**
- Splunk — wczytanie danych tutorialowych: https://docs.splunk.com/Documentation/Splunk/latest/SearchTutorial/GetthetutorialdataintoSplunk
- Splunk — referencja języka SPL: https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual
- Splunk Common Information Model (CIM — wspólny model pól): https://docs.splunk.com/Documentation/CIM/latest/User/Overview
- Microsoft Sentinel / KQL (Kusto Query Language): https://learn.microsoft.com/en-us/azure/azure-monitor/logs/get-started-queries
- Elastic Common Schema (ECS — wspólny model pól Elastic): https://www.elastic.co/guide/en/ecs/current/index.html
- OpenSearch (otwartoźródłowa alternatywa do laba SIEM): https://opensearch.org/docs/latest/

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników): https://attack.mitre.org/
- Sigma (otwarty, neutralny format reguł detekcji): https://github.com/SigmaHQ/sigma
- Atomic Red Team (bezpieczne odwzorowania technik ATT&CK do testu detekcji): https://github.com/redcanaryco/atomic-red-team

**Standardy i normy (oficjalne):**
- NIST SP 800-92 „Guide to Computer Security Log Management" (zarządzanie logami): https://csrc.nist.gov/pubs/sp/800/92/final
- NIST SP 800-61r2 „Computer Security Incident Handling Guide" (obsługa incydentów): https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST Cybersecurity Framework 2.0 (funkcja Detect/Respond): https://www.nist.gov/cyberframework
- SANS Reading Room — analityka logów i SIEM (białe księgi, darmowe): https://www.sans.org/white-papers/
- OWASP Logging Cheat Sheet (dobre praktyki logowania): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

**Dane do ćwiczeń (publiczne, otwarte):**
- loghub — publiczne zbiory logów systemowych: https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/
- Splunk Boss of the SOC (BOTS) — publiczne zbiory danych SOC do ćwiczeń: https://github.com/splunk/botsv3

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/zgłaszania): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich, brak danych osobowych w zbiorach ćwiczeniowych poza tym, co publicznie udostępnione do badań (loghub, BOTS — wymaga klauzuli maskowania IP w projektach, jak w partii 1). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research był zbyt „Splunk-centryczny".** Pierwsza wersja pisała SIEM = Splunk. CISO: „rynek to też Sentinel/KQL, Elastic, QRadar — junior uwięziony w jednym narzędziu jest mniej wart". **Poprawka:** dodałam KQL i Elastic/OpenSearch jako równoważne ścieżki w L1–L2, format Sigma (neutralny) w L3, i osobny niuans #4 o normalizacji ponad narzędziem. Liść `kind: concept` to potwierdza — rynek pyta o kompetencję, nie narzędzie.

2. **Słabość: brak ekonomii i kosztu zaciągu.** CISO: „junior, który podłącza wszystko do SIEM, kosztuje mnie fortunę i topi SOC w szumie — to pierwszy błąd, który tępię". **Poprawka:** dodałam niuans #9 (ekonomia GB/dzień) i wbudowałam go w zakres L5 oraz w projekty P10–P12. To realny rozdzielnik amator↔zawodowiec.

3. **Słabość: detekcja bez dowodu, że działa.** Pierwsza wersja kończyła na „napisz regułę". CISO: „reguła nieprzetestowana to teatr bezpieczeństwa". **Poprawka:** dodałam testowanie detekcji (Atomic Red Team) jako osobną umiejętność L3 (niuans #11, projekt P8) — student musi *udowodnić* wykrycie, nie zadeklarować.

4. **Słabość: pułapka czasu i NTP pominięta na L1.** CISO: „połowa fałszywych «nic nie znalazłem» juniorów to rozjechane strefy czasowe". **Poprawka:** wyniosłam czas/strefy/NTP do niuansu #10 i dodałam osobny projekt L1 (P2) tylko o tym — bo to fundament, na którym potem stoi cała korelacja.

5. **Słabość: prerekwizyty były listą, nie łańcuchem.** CISO: „nie obchodzi mnie, co student «zna» — obchodzi mnie, czego nie umie zinterpretować, bo przeskoczył podstawy sieci". **Poprawka:** §6 przepisałam jako jawny łańcuch zależności z przypisaniem „wymagane przed L_n" i z powiązaniem do konkretnych istniejących projektów partii 1; dodałam też, czego SIEM dostarcza dalej (SOC/SOAR/IR), bo to uzasadnia kolejność autoringu w grupie.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (SIEM, SOC, SOAR, EDR/XDR, log, ingestion, normalization, correlation, sourcetype, SPL, KQL, CIM, ECS, threshold, triage, true/false positive, enrichment, threat intelligence, MITRE ATT&CK, Sigma, tuning, allowlist, blind spot, baseline, NTP, MTTD, MTTR, hot/warm/cold, detection-as-code, Atomic Red Team, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#7, #10–#11. Niuanse #8, #9, #12 (retencja, ekonomia, granica prawna w skali) wymagają L4/L5 — research je zapowiada, ale pełna „zawodowość" SIEM domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
