# Research kompetencji: Incident Response

> **Status:** research kompetencji w ETAP E3, powstały wg wzorca (golden-example) `tools/content/research/siem.md`. Trzyma jego strukturę, głębię i poprzeczkę zawodową.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (North Star §0.1 jest nadrzędny nad całym tym plikiem). Researche bratnie: `tools/content/research/siem.md` i `tools/content/research/soc.md` — Incident Response opiera się o oba.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Incident Response` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **1,1%** ofert ścieżki wymienia Incident Response |
| **Liczba ofert (`offers`)** | **4** |
| **`kind`** | `concept` (kompetencja koncepcyjna — proces reagowania, nie pojedyncze narzędzie; patrz §2) |
| **`lift`** | 26,74 (siła powiązania liścia z tą ścieżką — najwyższa w grupie obok SOAR/EDR) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| SIEM | 10,8 | 40 | concept |
| SOC | 5,1 | 19 | concept |
| Splunk | 4,3 | 16 | tool |
| EDR / XDR | 3,2 | 12 | tool |
| SOAR | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| **Incident Response** (ten plik) | 1,1 | 4 | concept |

**Wniosek dla autoringu:** Incident Response (reagowanie na incydenty) ma najniższy *surowy* popyt w grupie (1,1%, 4 oferty), ale **najwyższy `lift` (26,74)** — czyli gdy oferta go wymienia, jest to bardzo silny, kierunkowy sygnał (to stanowiska wyraźnie dochodzeniowo-reakcyjne, często w zespołach CSIRT/CERT — patrz §2). Niski wolumen to **nie** powód, by traktować ten liść płycej: reagowanie na incydent jest *zwieńczeniem* całej grupy — to moment, w którym wykrycie (SIEM) i proces (SOC) zamieniają się w realne działanie pod presją. Dlatego research IR autorowany jest **na końcu łańcucha grupy** (SIEM → SOC → Incident Response) i wprost się o nie opiera (prerekwizyty, §6). Poprzeczka pozostaje pełna mimo niskiego wolumenu ofert (North Star §0.1 nie skaluje się popytem).

---

## 2. Definicja kompetencji i jej rola w pracy

**Incident Response (IR — reagowanie na incydenty bezpieczeństwa)** to zorganizowany proces, którym firma **opanowuje i zamyka realny incydent** — czyli zdarzenie, które już *nie jest* tylko alertem do segregacji, lecz potwierdzonym naruszeniem albo jego silnym podejrzeniem (włamanie, złośliwe oprogramowanie, wyciek danych, przejęcie konta). IR zaczyna się tam, gdzie kończy się triage w SOC: gdy analityk uzna „to jest prawdziwe", uruchamia proces reagowania.

Kanonem tego procesu jest **NIST SP 800-61** (amerykański standard obsługi zdarzeń bezpieczeństwa, faktyczny punkt odniesienia całej branży). Definiuje on **cykl życia incydentu** w czterech fazach, które w praktyce rozkłada się na sześć kroków:

1. **Przygotowanie (preparation)** — wszystko, co robi się *zanim* incydent nastąpi: plan reagowania, role i kontakty, narzędzia, kopie zapasowe, ćwiczenia. Najtańsza i najważniejsza faza — incydentu nie opanowuje się improwizacją.
2. **Wykrycie i analiza (detection & analysis)** — potwierdzenie, że incydent faktycznie zaszedł, ustalenie jego zakresu (co i kto jest dotknięty) i wagi (jak groźny).
3. **Powstrzymanie (containment)** — zatrzymanie rozprzestrzeniania się szkody (np. odcięcie zainfekowanej maszyny od sieci) bez niszczenia dowodów. Dzieli się na powstrzymanie krótkoterminowe (gasi pożar) i długoterminowe (trzyma sytuację pod kontrolą do eradykacji).
4. **Eradykacja (eradication)** — usunięcie przyczyny: skasowanie złośliwego oprogramowania, zamknięcie wykorzystanej luki, unieważnienie przejętych poświadczeń.
5. **Odtworzenie (recovery)** — przywrócenie systemów do normalnej, bezpiecznej pracy i potwierdzenie, że napastnik faktycznie zniknął (a nie tylko się przyczaił).
6. **Wnioski / faza po incydencie (lessons learned / post-incident)** — retrospektywa: co zadziałało, co nie, jak nie dopuścić do powtórki. To pętla uczenia całej obrony.

W NIST 800-61 kroki 3–5 (powstrzymanie, eradykacja, odtworzenie) tworzą jedną fazę „Containment, Eradication & Recovery", a kroki 2 i 6 to osobne fazy — łącznie cztery fazy, sześć praktycznych kroków. Ten research trzyma się rozbicia na sześć, bo każdy krok niesie inne decyzje i pułapki.

**Czym IR NIE jest (rozróżnienie zawodowca):**
- **IR ≠ triage w SOC.** SOC segreguje *alerty* i decyduje, *czy* to incydent. IR przejmuje sprawę, *gdy już wiadomo*, że to incydent, i prowadzi ją do zamknięcia. Granica między nimi (eskalacja z SOC do IR) to realny moment decyzyjny, nie formalność.
- **IR ≠ informatyka śledcza (digital forensics).** Forensics to *technika* zbierania i badania dowodów (obrazy dysków, pamięć, łańcuch dowodowy); IR to *proces zarządzania* całym incydentem, który z forensics korzysta. IR decyduje „czy w ogóle zabezpieczamy dowody i po co", forensics je zabezpiecza. (W praktyce łączy się to w skrót **DFIR** — Digital Forensics and Incident Response.)
- **IR ≠ tylko technika.** Połowa IR to komunikacja i decyzje (kogo powiadomić, kiedy zgłosić regulatorowi, co powiedzieć klientom) — nie sama praca przy klawiaturze.
- **IR ≠ disaster recovery / business continuity.** Odtwarzanie po awarii (DR) i ciągłość działania (BC) dotyczą *dostępności* po dowolnej awarii (pożar, awaria sprzętu). IR dotyczy *wrogiego działania* i musi zachować dowody — to inny cel, choć fazy odtworzenia się stykają.

**Kto tego używa i jak wygląda praca.** Kompetencja IR jest rdzeniem pracy **zespołu reagowania — CSIRT / CERT** (Computer Security Incident Response Team / Computer Emergency Response Team — zespół powołany do obsługi incydentów) oraz **starszego analityka SOC (poziom 2/3)**, który prowadzi sprawę po eskalacji. Praca:
- **Reagujący (incident responder / handler):** prowadzi pojedynczy incydent przez cały cykl — od potwierdzenia, przez powstrzymanie i eradykację, po odtworzenie i wnioski; pilnuje dowodów i osi czasu.
- **Koordynator incydentu (incident commander):** przy poważnym incydencie zarządza *ludźmi i komunikacją* (techniczni, prawni, PR, zarząd, regulator), nie klawiaturą — utrzymuje jeden ośrodek decyzji.
- **Analityk po incydencie:** prowadzi retrospektywę i zamienia wnioski w trwałe poprawki (nowe reguły detekcji, łatki, zmiany procesu).

**Po co rynkowi ta kompetencja.** Regulacje europejskie nałożyły **twarde terminy zgłaszania incydentów**: NIS2 (dyrektywa o cyberbezpieczeństwie) wymaga wczesnego ostrzeżenia w ciągu **24 godzin** i zgłoszenia w **72 godziny**; DORA (rozporządzenie o odporności cyfrowej sektora finansowego) i RODO (zgłoszenie naruszenia danych osobowych do organu w **72 godziny**) nakładają podobne reżimy. Bez sprawnego IR firma nie tylko traci więcej w samym incydencie, ale i **łamie prawo, nie zgłaszając na czas**. Wysoki `lift` tego liścia oddaje, że to kompetencja stanowisk wyraźnie dochodzeniowych, gdzie ta zdolność jest sednem roli.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Soczewka całej mapy: **cykl życia incydentu wg NIST 800-61** — przygotowanie → wykrycie → powstrzymanie → eradykacja → odtworzenie → wnioski.

### L1 — Fundamenty: cykl życia incydentu i runbook (3–6 h)

**Zakres wiedzy/umiejętności:**
- **Sześć kroków cyklu życia incydentu** (NIST 800-61) — co dzieje się w każdym i dlaczego kolejność ma znaczenie (np. nie wolno eradykować przed powstrzymaniem ani niszczyć dowodów w pośpiechu).
- **Zdarzenie (event) vs incydent (incident):** kiedy alert staje się incydentem — kryterium, które wszczyna proces.
- **Klasyfikacja incydentu:** nadanie kategorii i wagi (severity) — jak groźny, co dotknięte, jaki priorytet.
- **Runbook (procedura krok po kroku) dla prostego incydentu:** przeczytanie i wykonanie spisanego scenariusza (np. zainfekowana stacja robocza) zgodnie z cyklem życia.

**Co student musi UMIEĆ ZROBIĆ:** dla zadanego scenariusza incydentu poprawnie wskazać, w którym kroku cyklu się znajduje, sklasyfikować incydent (kategoria + waga), i wykonać prosty runbook, nie przeskakując ani nie odwracając kroków.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Kolejność kroków jest twarda z powodu.** Amator, widząc złośliwe oprogramowanie, od razu je kasuje (eradykacja) — i niszczy dowody oraz traci wiedzę o tym, jak napastnik wszedł. Zawodowiec najpierw powstrzymuje i zabezpiecza ślady, dopiero potem eradykuje.
- **Wyłączenie maszyny bywa najgorszym odruchem.** Wyłączenie zainfekowanego komputera kasuje pamięć ulotną (RAM), w której często jest klucz do zrozumienia ataku. Czasem trzeba odciąć od sieci, ale *nie* wyłączać — to decyzja, nie odruch.

### L2 — Zastosowanie: powstrzymanie, dowody, komunikacja (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Strategia powstrzymania (containment):** wybór między powstrzymaniem krótko- i długoterminowym; świadomość kompromisu „odciąć szybko vs zachować widoczność, by zrozumieć zakres".
- **Łańcuch dowodowy (chain of custody — udokumentowana, nieprzerwana historia tego, kto, kiedy i jak dotykał dowodu):** dlaczego dowód bez udokumentowanej historii jest bezwartościowy (prawnie i dochodzeniowo), i jak go zabezpieczyć (skróty kryptograficzne — hash, kopie, zapis kto/kiedy).
- **Oś czasu incydentu (timeline):** zbudowanie chronologii „co, kiedy, na którym systemie" z wielu źródeł — szkielet każdego dochodzenia.
- **Komunikacja incydentu:** kto musi wiedzieć i kiedy (techniczni, kierownictwo, prawnik, ewentualnie regulator), zasada jednego źródła prawdy, oddzielenie faktów od domysłów w komunikacji.
- **Obowiązki zgłoszeniowe — wprowadzenie:** istnienie terminów (RODO 72 h, NIS2 24 h/72 h, DORA) i tego, że to decyzja prawna, nie tylko techniczna.

**Co student musi UMIEĆ ZROBIĆ:** dla zadanego incydentu wybrać i uzasadnić strategię powstrzymania, zabezpieczyć dowód z poprawnym łańcuchem dowodowym (skrót + opis), zbudować oś czasu z dostarczonych logów oraz napisać komunikat o stanie incydentu rozdzielający fakty od hipotez i wskazujący, czy włącza się zegar zgłoszenia regulatorowi.

**Profesjonalne niuanse:**
- **Powstrzymanie to kompromis, nie przycisk „stop".** Odciąć od razu = napastnik wie, że go widać, i może zatrzeć ślady lub uderzyć mocniej. Poczekać i obserwować = ryzyko większej szkody. Ten wybór to sedno rzemiosła, nie procedura.
- **Dowód bez łańcucha dowodowego nie istnieje.** Skopiowanie pliku „na szybko" bez zapisu kto/kiedy/jak i bez skrótu kryptograficznego sprawia, że dowód jest bezużyteczny w postępowaniu. To rozdziela amatora od profesjonalisty natychmiast.
- **Zegar regulatora rusza wcześniej, niż myślisz.** Termin 72 h RODO liczy się od *stwierdzenia* naruszenia, nie od jego zamknięcia. Junior, który „najpierw posprząta, potem zgłosi", naraża firmę na karę.
- **Komunikacja, która miesza fakty z domysłami, sama staje się incydentem.** Przedwczesne „mamy wyciek 1 mln rekordów", które okazuje się błędem, kosztuje zaufanie i bywa podstawą roszczeń.

### L3 — Portfolio: pełny przebieg incydentu i retrospektywa (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Plan reagowania na incydent (incident response plan):** napisanie spójnego planu dla wybranego typu incydentu — role, kroki, kryteria decyzji, ścieżka eskalacji i komunikacji.
- **Przeprowadzenie pełnego cyklu na scenariuszu (tabletop / symulacja):** poprowadzenie incydentu od wykrycia do wniosków na zadanym, realistycznym scenariuszu (np. ransomware — oprogramowanie szyfrujące dla okupu; przejęcie konta z eksfiltracją danych).
- **Mapowanie na MITRE ATT&CK:** odtworzenie, *jak* napastnik działał krok po kroku (techniki), żeby eradykacja domknęła całą ścieżkę, a nie tylko ostatni objaw.
- **Retrospektywa bez obwiniania (blameless post-mortem):** poprowadzenie analizy po incydencie, która szuka *przyczyn systemowych*, nie winnych, i zamienia wnioski w konkretne poprawki (nowa reguła detekcji w SIEM, zmiana w playbooku SOC, łatka).
- **Pętla z SOC/SIEM:** zamknięcie obiegu — wnioski z IR wracają jako lepsza detekcja (SIEM) i lepsze playbooki (SOC).

**Co student musi UMIEĆ ZROBIĆ:** napisać plan reagowania, przeprowadzić udokumentowany pełny przebieg incydentu na realistycznym scenariuszu (sześć kroków, oś czasu, decyzje powstrzymania/eradykacji, dowody), zmapować działanie napastnika na ATT&CK i poprowadzić retrospektywę bez obwiniania, która kończy się listą trwałych poprawek wracających do SIEM/SOC. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Eradykacja, która nie domyka całej ścieżki ATT&CK, to nawrót.** Usunięcie złośliwego pliku, gdy napastnik zostawił tylne wejście (persistence), gwarantuje powrót. Zawodowiec eradykuje *całą* ścieżkę, nie ostatni objaw.
- **Odtworzenie bez potwierdzenia „czysto" to oddanie systemu napastnikowi.** Przywrócenie z kopii zapasowej, która *też* była zainfekowana, albo zanim usunięto dostęp napastnika, to klasyczny błąd. Recovery wymaga dowodu, że napastnik zniknął.
- **Retrospektywa, która szuka winnego, zabija zgłaszanie.** Jeśli ludzie boją się kary, przestają zgłaszać własne błędy i incydenty się ukrywają. Blameless post-mortem to nie miękkość — to warunek, by organizacja w ogóle się uczyła (wartość firmy: compounding > heroics).

### L4 — Realny przypadek profesjonalny: prowadzenie poważnego incydentu (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Poprowadzenie *poważnego, wieloetapowego* incydentu (np. ransomware z eksfiltracją danych w firmie podlegającej DORA/RODO) przez pełny cykl, pod presją czasu i z realnym napięciem między „powstrzymać szybko" a „zachować dowody i zrozumieć zakres".
- Podjęcie i uzasadnienie decyzji *prawno-komunikacyjnych*: czy i kiedy rusza zegar 72 h, co i komu komunikować, jak zachować dowody do ewentualnego postępowania.
- **Benchmark:** decyzje studenta (kolejność i trafność kroków, jakość dowodów, oś czasu, terminowość zgłoszenia, kompletność eradykacji) zestawione z tym, jak ten sam incydent poprowadził profesjonalny reagujący / koordynator incydentu.

### L5 — Biegłość: zdolność reagowania w skali organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Program reagowania dla organizacji:** projekt zdolności IR — struktura zespołu (własny CSIRT vs retainer zewnętrzny), gotowość (ćwiczenia, playbooki, kontakty), zgodność z reżimem regulacyjnym (NIS2/DORA/RODO) jako spójny program, nie pojedynczy plan.
- **Gotowość mierzona ćwiczeniami:** zaprojektowanie i ocena ćwiczeń sztabowych (tabletop exercises) i ich wpływu na realne metryki reagowania.
- **Ekonomia i decyzje strategiczne:** kiedy płacić/nie płacić okupu (i dlaczego płacenie bywa nielegalne lub bezskuteczne), kiedy angażować zewnętrznego reagującego, jak budżetować gotowość vs ryzyko.
- **Benchmark** wobec rozwiązania realnego szefa reagowania / CISO: nie „czy plan istnieje", lecz „czy organizacja faktycznie opanuje poważny incydent w terminach regulacyjnych i przy akceptowalnym koszcie".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Kolejność faz cyklu życia jest twarda.** Powstrzymanie *przed* eradykacją, dowody *przed* czyszczeniem. Amator kasuje zagrożenie w pierwszym odruchu i niszczy zdolność zrozumienia, jak doszło do incydentu — i często wpuszcza napastnika z powrotem.
2. **Powstrzymanie to kompromis czasu i widoczności.** Odciąć natychmiast (szybko, ale napastnik wie, że go widać i zaciera ślady) vs obserwować (więcej wiedzy, ale rośnie szkoda). To sedno decyzji reagującego, nie pozycja w checkliście.
3. **Pamięć ulotna ginie przy wyłączeniu.** Wyłączenie maszyny kasuje RAM — często jedyne miejsce, gdzie żyje klucz do zrozumienia ataku. Odcięcie od sieci ≠ wyłączenie zasilania.
4. **Łańcuch dowodowy decyduje o wartości dowodu.** Bez udokumentowanej, nieprzerwanej historii „kto/kiedy/jak" i bez skrótu kryptograficznego (hash) dowód jest bezużyteczny prawnie. To natychmiastowy wyróżnik profesjonalisty.
5. **Eradykacja musi domknąć całą ścieżkę ATT&CK.** Usunięcie ostatniego objawu przy pozostawionym tylnym wejściu (persistence) = gwarantowany nawrót. Mapowanie na MITRE ATT&CK pilnuje, by domknąć *całą* drogę napastnika.
6. **Odtworzenie wymaga dowodu „czysto".** Przywrócenie z zainfekowanej kopii albo zanim usunięto dostęp napastnika oddaje system z powrotem. Recovery to potwierdzenie, że napastnik zniknął — nie samo włączenie.
7. **Zegar regulatora rusza od stwierdzenia, nie od zamknięcia.** RODO 72 h, NIS2 24 h/72 h, DORA — terminy liczą się wcześnie. „Najpierw posprzątam, potem zgłoszę" to droga do kary niezależnej od samego incydentu.
8. **Komunikacja oddziela fakty od domysłów.** Przedwczesne lub przesadzone komunikaty same stają się incydentem (utrata zaufania, roszczenia). Jedno źródło prawdy, fakty osobno od hipotez.
9. **Retrospektywa bez obwiniania to warunek uczenia się.** Szukanie winnego zabija zgłaszanie i pcha incydenty pod dywan. Blameless post-mortem szuka przyczyn systemowych — i tylko on zamienia incydent w trwałą poprawę.
10. **IR domyka pętlę z SIEM i SOC.** Wnioski z incydentu wracają jako nowe reguły detekcji (SIEM) i lepsze playbooki (SOC). Incydent bez tej pętli to zmarnowana (droga) lekcja.
11. **Połowa IR to nie technika.** Decyzje prawne, komunikacyjne i koordynacja ludzi (incident commander) ważą tyle, co praca przy klawiaturze. Junior, który widzi tylko technikę, nie poprowadzi poważnego incydentu.
12. **Granica etyczno-prawna jest częścią kompetencji.** IR dotyka danych osobowych (logi, treści, dane dotkniętych osób — adres IP bywa daną osobową, wyrok TSUE Breyer, C-582/14), obowiązków zgłoszeniowych i dowodów do postępowania. Minimalizacja, legalność dostępu i poprawne obchodzenie się z dowodami to rzemiosło, nie dodatek. Nieautoryzowany dostęp do cudzych systemów/danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego); całe ćwiczenia odbywają się wyłącznie na własnych/treningowych, syntetycznych scenariuszach.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Incident Response muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student potrafił samodzielnie poprowadzić incydent przez pełny cykl życia i rozumiał jego wymiar prawny i komunikacyjny. Niski wolumen ofert **nie obniża** poprzeczki ani pokrycia (North Star §0.1). Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| I1 | L1 | **Mapa cyklu życia incydentu** — student układa zadany scenariusz na sześć kroków NIST 800-61 i uzasadnia, dlaczego ta kolejność (zwłaszcza powstrzymanie przed eradykacją) | Sześć kroków, kolejność faz | #1, #3 |
| I2 | L1 | **Zdarzenie vs incydent + klasyfikacja** — kryterium wszczęcia procesu, nadanie kategorii i wagi; wykonanie prostego runbooka | Event vs incident, klasyfikacja, runbook | #1 |
| I3 | L2 | **Strategia powstrzymania** — wybór i uzasadnienie powstrzymania krótko-/długoterminowego dla zadanego incydentu, z kompromisem czas↔widoczność | Containment, kompromis | #2, #3 |
| I4 | L2 | **Łańcuch dowodowy** — zabezpieczenie dowodu ze skrótem kryptograficznym i udokumentowaną historią kto/kiedy/jak (na własnym, syntetycznym artefakcie) | Chain of custody, hash, zabezpieczenie dowodu | #4 |
| I5 | L2 | **Oś czasu incydentu** — budowa chronologii z wielu źródeł logów (pomost do SIEM/SOC) | Timeline z wielu źródeł | #2, #10 |
| I6 | L2 | **Komunikacja i zegar zgłoszenia** — komunikat o stanie incydentu (fakty vs domysły) + decyzja, czy rusza termin RODO 72 h / NIS2 | Komunikacja, obowiązki zgłoszeniowe | #7, #8, #12 |
| I7 | L3 | **Plan reagowania na incydent** — spójny plan dla wybranego typu (role, kroki, eskalacja, komunikacja) | Incident response plan | #11 |
| I8 | L3 | **Pełny przebieg na scenariuszu (tabletop) + ATT&CK** — poprowadzenie incydentu od wykrycia do odtworzenia, z mapowaniem ścieżki napastnika i pełną eradykacją | Pełny cykl, mapowanie ATT&CK, eradykacja, recovery | #1, #5, #6 |
| I9 | L3 | **Retrospektywa bez obwiniania + pętla do SIEM/SOC** — post-mortem szukający przyczyn systemowych, zakończony listą trwałych poprawek wracających do detekcji i playbooków | Blameless post-mortem, pętla uczenia | #9, #10 |
| (I10–I12) | L4–L5 | **ZAPOWIEDŹ** — prowadzenie poważnego incydentu pod presją z decyzjami prawno-komunikacyjnymi (L4); program reagowania w skali organizacji + ćwiczenia + ekonomia (L5); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #2, #7, #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** I1→I2 (cykl i klasyfikacja) → I3 (powstrzymanie) → I4 (dowody) → I5 (oś czasu) → I6 (komunikacja/zegar) → I7 (plan) → I8 (pełny przebieg + ATT&CK) → I9 (retrospektywa + pętla). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

**Zależność od SOC i SIEM (twarda):** IR zaczyna się tam, gdzie SOC potwierdza incydent (eskalacja z triage), a oś czasu i dochodzenie (I5, I8) korzystają z danych SIEM. Projekty IR zakładają, że student przeszedł SIEM (jak powstaje alert) i SOC (jak wygląda triage i pierwsze powstrzymanie). Scenariusze i dane mogą pochodzić z tych samych publicznych zbiorów (BOTS, loghub — §7), wzbogaconych o syntetyczne, realistyczne przebiegi incydentów.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Incident Response **nie ma sensu** bez wcześniejszego rozumienia, jak incydent się wykrywa i jak wygląda proces SOC, z którego IR wyrasta. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **SOC** (liść `SOC`, research `tools/content/research/soc.md`) — IR przejmuje sprawę *po* triage i eskalacji w SOC; bez rozumienia tego procesu student nie wie, skąd incydent przychodzi ani gdzie wraca. **Najtwardszy prerekwizyt — wymagane przed L1 IR.**
2. **SIEM** (liść `SIEM`, research `tools/content/research/siem.md`) — dochodzenie i oś czasu opierają się na danych z SIEM; bez tego student nie zbuduje chronologii incydentu. **Wymagane przed L2 IR.**
3. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — bez rozumienia adresu, portu, protokołu, sesji student nie zinterpretuje śladów ataku ani decyzji o odcięciu od sieci. **Wymagane przed L1.**
4. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (przejęcie konta to najczęstszy incydent; unieważnienie poświadczeń to typowa eradykacja). Projekt partii 1 `cyber-iam-active-directory-lab` tworzy tę bazę. **Wymagane przed L2.**
5. **Podstawy systemów operacyjnych i logów** — `Linux`/`Windows` oraz czytanie logów (projekty partii 1 `cyber-hardening-linux-bash`, `cyber-python-automatyzacja-logow`). Reagujący musi rozumieć, co widzi na dotkniętym systemie. **Wymagane przed L2.**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnych/treningowych, syntetycznych scenariuszach; szczególna ostrożność z dowodami i danymi osobowymi). **Wymagane od L1.**

**Czego IR dostarcza dalej:** Incident Response **zamyka łańcuch grupy** SIEM → SOC → Incident Response — jego wnioski (retrospektywa) wracają jako lepsza detekcja (reguły SIEM) i lepsze procedury (playbooki SOC, w tym automatyzacja przez `SOAR`). IR jest też naturalnym pomostem do liści zgodności z innych grup ścieżki (`NIST`, `DORA`, `RODO / GDPR`, `Risk Management`), bo obowiązki zgłoszeniowe łączą reagowanie z GRC (Governance, Risk, Compliance — ład, ryzyko, zgodność). Dlatego IR autorowany jest jako ostatni w grupie monitorowania.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy i normy (oficjalne — kanon procesu IR):**
- NIST SP 800-61r2 „Computer Security Incident Handling Guide" (kanoniczny cykl życia incydentu): https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST SP 800-86 „Guide to Integrating Forensic Techniques into Incident Response" (dowody i forensics w IR): https://csrc.nist.gov/pubs/sp/800/86/final
- NIST Cybersecurity Framework 2.0 (funkcje Respond / Recover): https://www.nist.gov/cyberframework
- ISO/IEC 27035 — zarządzanie incydentami bezpieczeństwa informacji (norma międzynarodowa, strona przeglądowa): https://www.iso.org/standard/78973.html

**Wiedza o technikach napastnika i reagowaniu (otwarte/autorytatywne):**
- MITRE ATT&CK (taktyki i techniki — do mapowania ścieżki napastnika i eradykacji): https://attack.mitre.org/
- SANS — Incident Handler's Handbook / materiały IR (białe księgi, darmowe): https://www.sans.org/white-papers/
- CISA — Federal Incident & Vulnerability Response Playbooks (oficjalne wzorce procedur reagowania): https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks
- ENISA — Good Practice Guide for Incident Management (przewodnik UE, oficjalny): https://www.enisa.europa.eu/publications/good-practice-guide-for-incident-management

**Dane i scenariusze do ćwiczeń (publiczne, otwarte):**
- Splunk Boss of the SOC (BOTS) — publiczne zbiory danych do dochodzenia incydentu: https://github.com/splunk/botsv3
- loghub — publiczne zbiory logów systemowych (oś czasu, ślady): https://github.com/logpai/loghub
- The DFIR Report — publiczne, szczegółowe opisy realnych incydentów z mapowaniem ATT&CK (do scenariuszy tabletop): https://thedfirreport.com/

**Kontekst prawny EU/PL (obowiązki zgłoszeniowe — rdzeń niuansu #7):**
- RODO / GDPR, art. 33 (zgłoszenie naruszenia ochrony danych w 72 h): https://eur-lex.europa.eu/eli/reg/2016/679
- Dyrektywa NIS2 (terminy zgłaszania incydentów: 24 h ostrzeżenie / 72 h zgłoszenie): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (raportowanie incydentów w sektorze finansowym): https://eur-lex.europa.eu/eli/reg/2022/2554
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Trzy pozycje do szczególnej weryfikacji przed wejściem do `learning_resources`: (1) **The DFIR Report** — to zewnętrzny, niezależny serwis (nie instytucja); warto potwierdzić, czy opisy realnych włamań nadają się jako materiał edukacyjny bez ryzyka (są publiczne i anonimizowane, ale to zewnętrzne źródło — Twoja ocena); (2) dokładny adres playbooków **CISA** (CISA bywa reorganizuje URL); (3) numer normy **ISO/IEC 27035** (norma płatna — link tylko przeglądowy, w projektach cytujemy z opisu, nie udostępniamy treści). Zbiory BOTS/loghub wymagają tej samej klauzuli maskowania adresów IP, co projekty partii 1. Reszta to stabilne domeny (NIST, MITRE, SANS, ENISA, EUR-Lex).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu reagowania i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: IR opisany jako sama technika.** Pierwsza wersja kończyła na „znajdź i usuń zagrożenie". CISO: „junior, który nie wie, kiedy ruszy zegar 72 h i kogo powiadomić, naraża mnie na karę większą niż sam incydent". **Poprawka:** dodałam wymiar prawno-komunikacyjny jako pełnoprawną umiejętność L2 (komunikacja, obowiązki zgłoszeniowe — niuans #7, #8, projekt I6) i niuans #11 („połowa IR to nie technika"); obowiązki RODO/NIS2/DORA wpisane wprost w §2 i §7.
2. **Słabość: dowody i łańcuch dowodowy pominięte.** CISO: „dowód zebrany bez łańcucha dowodowego jest bezwartościowy — to pierwsza rzecz, którą sprawdzam". **Poprawka:** dodałam łańcuch dowodowy jako osobną umiejętność L2 (niuans #4, projekt I4) ze skrótem kryptograficznym i historią kto/kiedy/jak, oraz źródło NIST 800-86 (forensics w IR).
3. **Słabość: kolejność faz traktowana jako formalność.** Pierwsza wersja nie tłumaczyła, *dlaczego* powstrzymanie przed eradykacją. CISO: „junior, który od razu kasuje malware i wyłącza maszynę, niszczy mi dochodzenie i wpuszcza napastnika z powrotem". **Poprawka:** wyniosłam to do niuansów #1, #3, #5, #6 (kolejność, pamięć ulotna, pełna ścieżka ATT&CK, dowód „czysto" przy recovery) i zakotwiczyłam w projektach I1, I8.
4. **Słabość: brak pętli zwrotnej do SIEM/SOC.** CISO: „incydent, z którego nic nie wraca do detekcji, to droga lekcja wyrzucona do kosza". **Poprawka:** dodałam retrospektywę bez obwiniania (blameless post-mortem) jako umiejętność L3 (niuans #9, #10, projekt I9), kończącą się trwałymi poprawkami wracającymi do reguł SIEM i playbooków SOC — domknięcie łańcucha grupy.
5. **Słabość: niski wolumen ofert kusił, by potraktować liść płycej.** CISO: „IR jest rzadkie w ogłoszeniach, ale gdy go wymieniają, to jest sedno roli — nie chcę powierzchownego kandydata". **Poprawka:** w §1 i §5 jawnie rozdzieliłam niski *wolumen* (1,1%) od wysokiego `lift` (26,74) i zapisałam, że North Star nie skaluje poprzeczki popytem — pokrycie L1–L3 pozostaje pełne (9 projektów), tak jak przy SIEM/SOC.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (IR, incydent vs zdarzenie, NIST 800-61, preparation/detection/containment/eradication/recovery/lessons learned, forensics, DFIR, CSIRT/CERT, incident commander, severity, runbook, chain of custody, hash, timeline, persistence, ransomware, blameless post-mortem, tabletop, MITRE ATT&CK, DR/BC, retainer, GRC, RODO/NIS2/DORA, CISO). Polskie nazwy tam, gdzie nie tracą precyzji. Terminy prawne (72 h, art. 267 KK, Breyer C-582/14) podane z kontekstem.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego do reagowania na incydent" — spełniony, jeśli autoring domknie 9 projektów L1–L3 z niuansami #1–#10. Niuanse #2 (pełen kompromis powstrzymania pod realną presją), #11 (koordynacja i komunikacja w poważnym incydencie) i #12 (granica prawna w skali) domkną się dopiero na L4/L5 — research je zapowiada, ale pełna „zawodowość" IR zależy od struktury L4/L5 (Ethan/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
