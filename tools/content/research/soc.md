# Research kompetencji: SOC

> **Status:** research kompetencji w ETAP E3, powstały wg wzorca (golden-example) `tools/content/research/siem.md`. Trzyma jego strukturę, głębię i poprzeczkę zawodową.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (North Star §0.1 jest nadrzędny nad całym tym plikiem). Research bratni: `tools/content/research/siem.md` — SOC opiera się o niego.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SOC` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **5,1%** ofert ścieżki wymienia SOC |
| **Liczba ofert (`offers`)** | **19** |
| **`kind`** | `concept` (kompetencja koncepcyjna — sposób organizacji i pracy zespołu, nie pojedyncze narzędzie; patrz §2) |
| **`lift`** | 21,17 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| SIEM | 10,8 | 40 | concept |
| **SOC** (ten plik) | 5,1 | 19 | concept |
| Splunk | 4,3 | 16 | tool |
| EDR / XDR | 3,2 | 12 | tool |
| SOAR | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| Incident Response | 1,1 | 4 | concept |

**Wniosek dla autoringu:** SOC to drugi co do popytu liść grupy (5,1%) — zaraz po SIEM. Różnica między nimi jest sednem tego researchu: **SIEM to platforma (narzędzie i jego reguły), SOC to organizacja ludzi i proces, który tej platformy używa**, żeby bronić firmy całą dobę. Rynek pyta o SOC osobno, bo pracodawca chce wiedzieć, czy kandydat rozumie *pracę zespołową analityka broniącego* (kolejka alertów, eskalacje, zmiany, metryki), a nie tylko składnię zapytań. SIEM odpowiada na „czym wykrywasz", SOC na „jak zorganizowana jest praca, która z wykrycia robi reakcję". Dlatego research SOC autorowany jest **po** SIEM i wprost się o niego opiera (prerekwizyt, §6).

---

## 2. Definicja kompetencji i jej rola w pracy

**SOC (Security Operations Center — centrum monitorowania bezpieczeństwa)** to zespół ludzi, procesów i narzędzi, którego jedynym zadaniem jest **wykrywać, segregować i reagować na zdarzenia bezpieczeństwa firmy — najczęściej w trybie ciągłym (24/7)**. SOC jest sercem tzw. *Blue Team* (zespołu broniącego — w odróżnieniu od *Red Team*, czyli zespołu udającego napastnika, który testuje obronę). Kompetencja „SOC" w ofertach pracy oznacza nie znajomość jednego narzędzia, lecz rozumienie **jak ta obrona jest zorganizowana jako proces**:

1. **Kolejka alertów (alert queue) i triage (segregacja).** Alerty z SIEM i innych źródeł trafiają do wspólnej kolejki; analityk nadaje im priorytet, odsiewa szum i decyduje, co badać dalej.
2. **Poziomy i eskalacja (tiers + escalation).** Praca jest podzielona na poziomy zaawansowania (potocznie L1/L2/L3 — **uwaga: to nomenklatura rynkowa stanowisk SOC, nie poziomy projektów SkillBridge L1–L5**). Sprawa, której niższy poziom nie domyka, wędruje wyżej według jasnej reguły eskalacji.
3. **Procedury reakcji (playbooki / runbooki).** Spisany krok po kroku scenariusz: „gdy widzisz X, zrób Y, potem Z". Dzięki temu reakcja nie zależy od tego, kto akurat ma zmianę.
4. **Praca zmianowa i ciągłość (shifts + follow-the-sun).** Bezpieczeństwo nie śpi; SOC organizuje zmiany i przekazanie pałeczki (handover) tak, by nic nie zginęło między zmianami.
5. **Metryki (MTTD/MTTR i pochodne).** SOC mierzy własną skuteczność liczbami — średni czas wykrycia, średni czas reakcji, jakość kolejki alertów — i na ich podstawie się poprawia.

**Czym SOC NIE jest (rozróżnienie zawodowca):**
- **SOC ≠ SIEM.** SIEM to *narzędzie*, w którym powstają alerty. SOC to *zespół i proces*, który te alerty obsługuje. Można mieć drogi SIEM i bezużyteczny SOC (alerty wpadają i nikt ich nie czyta) — i odwrotnie, dobrze zorganizowany SOC wyciska wartość nawet ze skromnych narzędzi. Ten research jest o *procesie*, research SIEM o *narzędziu* — czytaj je razem.
- **SOC ≠ NOC.** NOC (Network Operations Center — centrum monitorowania *sprawności* sieci) pilnuje, czy systemy *działają* (dostępność, wydajność). SOC pilnuje, czy są *bezpieczne*. To dwa różne centra o różnych celach, choć bywają mylone.
- **SOC ≠ jednorazowy projekt.** SOC to praca ciągła i powtarzalna — nudna powtarzalność jest tu cechą, nie wadą. Wartość bierze się z dyscypliny procesu, nie z heroicznego pojedynczego wykrycia.
- **SOC ≠ tylko reagowanie.** Dojrzały SOC nie czeka biernie na alerty — prowadzi też aktywne *threat hunting* (polowanie na zagrożenia: szukanie śladów napastnika, którego żadna reguła jeszcze nie złapała).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja SOC opisuje codzienność **analityka SOC** na różnych poziomach:
- **Analityk poziomu 1 (L1 rynkowy, „pierwsza linia"):** monitoruje kolejkę alertów, robi wstępny triage, zamyka oczywisty szum, eskaluje to, co wygląda realnie. Kluczowa umiejętność: szybko i trafnie odróżnić sygnał od szumu pod presją liczby alertów.
- **Analityk poziomu 2 (L2, „dochodzenie"):** przejmuje eskalowane sprawy, prowadzi głębsze dochodzenie (investigation), łączy ślady z wielu źródeł, decyduje o pierwszym powstrzymaniu (containment) i — gdy to incydent — uruchamia proces reagowania (liść `Incident Response`, osobny research).
- **Analityk poziomu 3 / inżynier detekcji / threat hunter (L3):** poluje na zagrożenia bez alertu, dostraja reguły, buduje nowe playbooki, mierzy i poprawia metryki całego zespołu, współpracuje z inżynierią SIEM/SOAR.
- **Lider zmiany / SOC Manager:** pilnuje obsady zmian, jakości kolejki, metryk i przekazań między zmianami; raportuje skuteczność.

**Po co rynkowi ta kompetencja.** Regulacje europejskie (NIS2 — dyrektywa o cyberbezpieczeństwie sieci i informacji; DORA — rozporządzenie o odporności cyfrowej sektora finansowego) wymagają od coraz większej liczby firm **zdolności ciągłego wykrywania i szybkiego zgłaszania incydentów w krótkich terminach**. Tej zdolności nie da się kupić jednym narzędziem — wymaga zorganizowanego zespołu z procesem, czyli SOC (własnego albo kupionego jako usługa MSSP — Managed Security Service Provider, zewnętrzny dostawca usług bezpieczeństwa). Stąd stały popyt na ludzi, którzy *rozumieją, jak SOC pracuje*, a nie tylko klikają w jednym narzędziu.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Soczewka całej mapy: **organizacja i proces pracy zespołu broniącego**, nie składnia narzędzia (to jest w researchu SIEM/Splunk).

### L1 — Fundamenty: kolejka alertów i triage pierwszej linii (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest alert, skąd przychodzi (SIEM, EDR, zgłoszenie użytkownika), z jakich pól się składa (czas, źródło, host, użytkownik, reguła, priorytet wstępny).
- **Triage pierwszej linii:** odebranie alertu z kolejki, nadanie priorytetu (severity), pierwsza decyzja: prawdziwy pozytyw (true positive — realne zagrożenie), fałszywy alarm (false positive) czy „do eskalacji".
- **Pojęcie kolejki i jej higieny:** dlaczego alert nie może „wisieć" bez właściciela, czym jest czas pierwszej reakcji, co znaczy „zamknięty z uzasadnieniem".
- **Notatka analityka:** zapisanie *dlaczego* podjęto decyzję — fundament audytu i przekazania zmiany.

**Co student musi UMIEĆ ZROBIĆ:** wziąć zestaw przykładowych alertów, posegregować je (priorytet + decyzja TP/FP/eskalacja), uzasadnić każdą decyzję krótką notatką i wskazać, które wymagają eskalacji na wyższy poziom — tak, jak robi to analityk pierwszej linii.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Priorytet ≠ kolejność zgłoszenia.** Amator obrabia kolejkę od góry do dołu. Zawodowiec najpierw przesiewa pod kątem *wpływu* (krytyczny serwer? konto administratora? dane klienta?) i bierze to, co najgroźniejsze, nawet jeśli przyszło później.
- **„Zamknięte jako fałszywy alarm" to decyzja z konsekwencją.** Pochopne zamknięcie realnego alertu to przeoczony atak. Każde zamknięcie wymaga uzasadnienia, które ktoś inny może później skontrolować.

### L2 — Zastosowanie: eskalacja, playbooki, dochodzenie (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Reguła eskalacji (escalation path):** kiedy i jak sprawa przechodzi z poziomu 1 na 2 (i wyżej) — jasne kryteria, nie „wyczucie".
- **Playbook / runbook (procedura reakcji):** odczytanie i *wykonanie według spisanego scenariusza* reakcji na konkretny typ alertu (np. podejrzenie przejęcia konta, wykryte złośliwe oprogramowanie na stacji). Pojęcie, dlaczego procedura musi być powtarzalna niezależnie od osoby.
- **Dochodzenie (investigation):** zebranie kontekstu wokół alertu — co jeszcze robił ten użytkownik/host, czy są powiązane alerty, oś czasu zdarzeń (timeline).
- **Przekazanie zmiany (shift handover):** spisanie stanu otwartych spraw tak, by następna zmiana płynnie przejęła.
- **Pierwsze powstrzymanie (initial containment):** decyzja o najprostszym natychmiastowym ograniczeniu szkody (np. odcięcie konta) — i świadomość, że dalszy proces to już `Incident Response` (osobny liść).

**Co student musi UMIEĆ ZROBIĆ:** dla zadanego alertu przejść playbook krok po kroku, przeprowadzić dochodzenie (zebrać kontekst, zbudować oś czasu), podjąć i uzasadnić decyzję o eskalacji lub pierwszym powstrzymaniu, a na koniec napisać czytelne przekazanie zmiany.

**Profesjonalne niuanse:**
- **Playbook jest dla powtarzalności, nie dla wyłączenia myślenia.** Zawodowiec wykonuje procedurę, ale rozpoznaje moment, gdy rzeczywistość odbiega od scenariusza, i eskaluje zamiast „dopychać" sprawę do playbooka, który nie pasuje.
- **Eskalacja to nie porażka.** Junior boi się eskalować, żeby nie wyjść na niekompetentnego — i przez to przetrzymuje groźny incydent. W dojrzałym SOC trafna eskalacja w porę jest oznaką dobrego analityka, nie słabości.
- **Przekazanie zmiany to najczęstsze miejsce, gdzie ginie incydent.** Atak rozłożony na dwie zmiany umyka, jeśli handover jest niechlujny. To pozornie nudna czynność o realnej wadze.

### L3 — Portfolio: proces SOC, metryki i polowanie na zagrożenia (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Zaprojektowanie procesu SOC (na małą skalę):** zdefiniowanie poziomów, reguł eskalacji, priorytetyzacji i obiegu alertu od wpłynięcia do zamknięcia — jako spójny, opisany proces.
- **Napisanie własnego playbooka** dla wybranego scenariusza zagrożenia (np. password spraying — rozpylanie haseł; phishing zakończony kliknięciem) z jawnymi krokami, kryteriami eskalacji i warunkami zamknięcia.
- **Metryki SOC i ich interpretacja:** MTTD (Mean Time To Detect — średni czas wykrycia), MTTR (Mean Time To Respond — średni czas reakcji), liczba fałszywych alarmów na regułę, odsetek alertów zbadanych, czas pierwszej reakcji. Policzenie ich na danych i *wyciągnięcie wniosku*, nie tylko podanie liczby.
- **Threat hunting (polowanie na zagrożenia):** sformułowanie hipotezy („jeśli napastnik jest w sieci, to zobaczę ślad X"), sprawdzenie jej w danych bez gotowego alertu, mapowanie na MITRE ATT&CK (otwarta baza taktyk i technik napastników — patrz §4 i §7).
- **Współpraca z SIEM/SOAR:** zrozumienie, gdzie kończy się SOC-jako-proces, a zaczyna automatyzacja — które kroki playbooka warto oddać SOAR (Security Orchestration, Automation and Response — orkiestracja i automatyzacja reakcji), a które muszą zostać przy człowieku (filozofia produktowa: człowiek ma ostatnie słowo w istotnej ocenie).

**Co student musi UMIEĆ ZROBIĆ:** zaprojektować mały, spójny proces SOC (poziomy + eskalacja + priorytetyzacja), napisać działający playbook dla wybranego scenariusza, policzyć i zinterpretować metryki SOC na zadanym zbiorze, przeprowadzić jedno polowanie na zagrożenie z hipotezą zmapowaną na ATT&CK i uzasadnić, co zautomatyzować przez SOAR, a co zostawić człowiekowi. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Metryka, którą się optymalizuje, przestaje być uczciwą metryką.** Jeśli SOC jest rozliczany z niskiego MTTR, analityk zacznie zamykać sprawy szybko, a nie dobrze. Zawodowiec rozumie, że metryki kłamią, gdy stają się celem (prawo Goodharta), i czyta je w zestawie, nie pojedynczo.
- **Automatyzacja złego procesu daje szybki zły proces.** Oddanie playbooka do SOAR, zanim proces jest dojrzały, automatyzuje błędy na skalę. Najpierw proces poprawny ręcznie, dopiero potem automatyzacja.
- **Threat hunting bez hipotezy to klikanie na chybił trafił.** Dojrzałe polowanie wychodzi od konkretnej, sprawdzalnej hipotezy zakotwiczonej w ATT&CK — nie od „poprzeglądam sobie logi".

### L4 — Realny przypadek profesjonalny: prowadzenie kolejki incydentu w warunkach SOC (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realistycznej, zaszumionej kolejki alertów* (mieszanka szumu, fałszywych alarmów i jednego rozłożonego w czasie realnego incydentu) i przeprowadzenie jej przez pełny proces SOC: triage → eskalacja → dochodzenie → przekazanie zmiany, pod presją liczby i czasu.
- Rozpoznanie, że pojedyncze alerty układają się w *jeden* incydent (korelacja przez analityka, nie tylko przez regułę), i poprawne wszczęcie procesu reagowania.
- **Benchmark:** decyzje studenta (co wykrył, co przeoczył, jak priorytetyzował, MTTD/MTTR na tej kolejce, jakość notatek i przekazania) zestawione z tym, jak tę samą kolejkę poprowadził profesjonalista.

### L5 — Biegłość: projekt i ekonomia funkcji SOC (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Model operacyjny SOC dla organizacji:** decyzja SOC własny vs usługa zewnętrzna (MSSP), model zmian (24/7 vs follow-the-sun vs godziny pracy + dyżur), obsada per poziom — świadoma wobec kosztu i ryzyka.
- **Dojrzałość procesu i jej pomiar:** zastosowanie uznanego modelu dojrzałości (np. SOC-CMM — Capability Maturity Model dla SOC) do oceny, gdzie funkcja jest mocna, a gdzie ma luki, i co poprawić w pierwszej kolejności.
- **Ekonomia i wypalenie:** projekt obsady i kolejki tak, by metryki były osiągalne *bez* wypalania analityków (rotacja w SOC jest realnym problemem branży) — równowaga koszt / pokrycie / zdrowie zespołu.
- **Benchmark** wobec rozwiązania realnego SOC Managera: nie „czy proces istnieje", lecz „czy jest skuteczny, mierzalny i da się go utrzymać ludźmi za rozsądny koszt".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zmęczenie alertami (alert fatigue) i jakość kolejki.** Realny SOC tonie w alertach; większość nigdy nie jest zbadana, znaczna część to fałszywe alarmy. Zawodowiec walczy o *jakość* kolejki (mało, trafnie) i broni czasu analityka; amator obrabia kolejkę od góry i tonie razem z nią. To bezpośrednie połączenie z researchem SIEM (tam się alerty stroi, tu się je obsługuje).
2. **Priorytet według wpływu, nie według kolejności.** Triage zaczyna się od pytania „co stanie się, jeśli to prawda" — krytyczność zasobu, typ konta, wrażliwość danych — a nie od znacznika czasu wpłynięcia.
3. **Eskalacja w porę bije bohaterstwo.** Najgroźniejszy junior to ten, który nie eskaluje, bo chce sam rozwiązać. Jasna, używana reguła eskalacji jest cenniejsza niż genialny pojedynczy analityk (wartość firmy: compounding > heroics).
4. **Playbook daje powtarzalność, ale nie zwalnia z myślenia.** Procedura zapewnia, że reakcja nie zależy od tego, kto ma zmianę. Zawodowiec wie jednak, kiedy rzeczywistość wyszła poza scenariusz, i nie „dopycha" sprawy do nieadekwatnego playbooka.
5. **Przekazanie zmiany to słaby punkt całej obrony.** Atak rozłożony na kilka zmian umyka przy niechlujnym handoverze. Dyscyplina przekazania jest cichym wyróżnikiem dojrzałego SOC.
6. **MTTD/MTTR mają sens tylko w zestawie i tylko, gdy nie są celem same w sobie.** Optymalizowana pojedyncza metryka psuje proces (prawo Goodharta: „gdy miara staje się celem, przestaje być dobrą miarą"). Zawodowiec czyta metryki łącznie i pyta, co zniekształcają.
7. **Granica człowiek ↔ automat (SOC ↔ SOAR).** Nie wszystko warto automatyzować; krytyczne decyzje (np. odcięcie produkcyjnego systemu) zostają przy człowieku. Automatyzacja niedojrzałego procesu mnoży błędy. Zgodne z filozofią produktową SkillBridge: człowiek ma ostatnie słowo w istotnej ocenie.
8. **Threat hunting wychodzi od hipotezy.** Dojrzałe polowanie to sprawdzalne „jeśli napastnik tu jest, zobaczę ślad X", zakotwiczone w MITRE ATT&CK — nie bezładne przeglądanie logów.
9. **MITRE ATT&CK jako wspólny język.** (Otwarta, darmowa baza taktyk i technik realnych napastników, utrzymywana przez MITRE.) Pozwala SOC mówić o zagrożeniu jednoznacznie — „widzimy technikę T1110 (brute-force)" zamiast „coś dziwnego z logowaniami".
10. **SOC ≠ NOC i SOC ≠ SIEM.** Mylenie monitoringu *sprawności* (NOC) z monitoringiem *bezpieczeństwa* (SOC) albo *narzędzia* (SIEM) z *zespołem* (SOC) to typowy błąd juniora w rozmowie o pracę. Zawodowiec rozdziela te role precyzyjnie.
11. **Wypalenie analityków to ryzyko operacyjne, nie „miękki temat".** Wysoka rotacja w SOC niszczy wiedzę instytucjonalną i pogarsza metryki. Projekt zmian i kolejki musi liczyć się ze zdrowiem zespołu — to część dojrzałości, nie dodatek.
12. **Granica etyczno-prawna jest częścią kompetencji.** Analityk SOC ma wgląd w dane, które bywają danymi osobowymi (adres IP bywa daną osobową — wyrok TSUE Breyer, C-582/14; treść komunikacji, aktywność pracowników). Minimalizacja, dostęp na zasadzie potrzeby (need-to-know), brak nadużycia wglądu to element zawodowego rzemiosła, nie „dodatek RODO". Nieautoryzowany dostęp do cudzych systemów/danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SOC muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student potrafił samodzielnie pracować jako analityk SOC pierwszej/drugiej linii i rozumiał proces całego zespołu. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| S1 | L1 | **Segregacja kolejki alertów** — student dostaje zestaw przykładowych alertów (eksport/CSV), nadaje priorytet, decyduje TP/FP/eskalacja i uzasadnia każdą decyzję notatką | Triage pierwszej linii, priorytet wg wpływu, notatka analityka | #1, #2 |
| S2 | L1 | **Higiena kolejki i czas pierwszej reakcji** — porządkowanie kolejki: własność alertu, kryterium zamknięcia, dlaczego nic nie „wisi" | Higiena kolejki, czas reakcji, zamknięcie z uzasadnieniem | #1, #2 |
| S3 | L2 | **Wykonanie playbooka reakcji** — przejście spisanego scenariusza dla jednego typu alertu (np. podejrzenie przejęcia konta) krok po kroku | Playbook/runbook, powtarzalność reakcji | #4 |
| S4 | L2 | **Dochodzenie i oś czasu** — zebranie kontekstu wokół alertu, budowa osi czasu zdarzeń, decyzja eskalacja vs pierwsze powstrzymanie | Dochodzenie, timeline, initial containment | #3, #4 |
| S5 | L2 | **Przekazanie zmiany** — spisanie stanu otwartych spraw tak, by następna zmiana płynnie przejęła; ćwiczenie na „incydencie przez dwie zmiany" | Shift handover, ciągłość | #5 |
| S6 | L3 | **Projekt procesu SOC (mała skala)** — poziomy, reguły eskalacji, priorytetyzacja, obieg alertu jako spójny opis | Projekt procesu SOC | #3, #4 |
| S7 | L3 | **Własny playbook + kryteria** — napisanie playbooka dla wybranego scenariusza (rozpylanie haseł / phishing) z eskalacją i warunkami zamknięcia | Pisanie playbooka, kryteria eskalacji/zamknięcia | #4, #9 |
| S8 | L3 | **Metryki SOC i interpretacja** — policzenie MTTD/MTTR/FP-na-regułę na zadanym zbiorze i wyciągnięcie wniosku o zdrowiu procesu | Metryki SOC, interpretacja | #1, #6, #11 |
| S9 | L3 | **Polowanie na zagrożenie + granica z SOAR** — hipoteza zmapowana na ATT&CK sprawdzona w danych + uzasadnienie, co zautomatyzować przez SOAR, a co zostawić człowiekowi | Threat hunting, ATT&CK, współpraca SIEM/SOAR | #7, #8, #9 |
| (S10–S12) | L4–L5 | **ZAPOWIEDŹ** — prowadzenie realistycznej zaszumionej kolejki z ukrytym incydentem (L4); model operacyjny + dojrzałość (SOC-CMM) + ekonomia/wypalenie (L5); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #6, #10, #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** S1→S2 (kolejka i higiena) → S3 (playbook wykonanie) → S4 (dochodzenie) → S5 (przekazanie) → S6 (projekt procesu) → S7 (własny playbook) → S8 (metryki) → S9 (hunting + SOAR). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

**Zależność od SIEM (twarda):** projekty SOC S1–S2 zakładają, że alerty *skądś* przychodzą — student powinien wcześniej zobaczyć, jak alert powstaje w SIEM (projekty SIEM P1–P4). SOC nie powtarza nauki narzędzia; pracuje na *wyniku* SIEM. Materiał na alerty do segregacji można czerpać z tych samych publicznych zbiorów SOC, co SIEM (BOTS, loghub — §7).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

SOC **nie ma sensu** bez wcześniej opanowanego rozumienia, jak alert powstaje i co znaczą zdarzenia. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **SIEM** (liść `SIEM`, research `tools/content/research/siem.md`) — student musi wiedzieć, jak alert powstaje, zanim nauczy się go segregować i obsługiwać procesowo. **Wymagane przed L1 SOC** (najtwardszy prerekwizyt; SOC pracuje na wyniku SIEM).
2. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — bez rozumienia adresu IP, portu, protokołu student nie zinterpretuje treści alertu ani dochodzenia. **Wymagane przed L1.**
3. **Czytanie i pojęcie logu** — co to log, gdzie powstaje, jakie ma pola. Domyka to projekt `cyber-python-automatyzacja-logow` (partia 1, liść `Python`) i L1 SIEM. **Wymagane/równoległe na L1.**
4. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (kto się loguje, czym jest konto i grupa) — żeby zrozumieć alerty o przejęciu konta i decyzje o powstrzymaniu. Projekt partii 1 `cyber-iam-active-directory-lab` tworzy tę bazę. **Wymagane przed L2 (dochodzenie kont).**
5. **Podstawy systemów operacyjnych** — `Linux` i/lub `Windows` (logi tych systemów to główne źródło alertów). Projekty partii 1 (`cyber-hardening-linux-bash`, `cyber-iam-active-directory-lab`) tworzą tę bazę. **Wymagane przed L2.**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie i danych). **Wymagane od L1.**

**Czego SOC dostarcza jako prerekwizyt dla innych liści grupy:** SOC jest bezpośrednim fundamentem dla `Incident Response` (reagowanie na incydent to rozwinięcie procesu, który w SOC zaczyna się od triage i pierwszego powstrzymania — research `tools/content/research/incident-response.md`) oraz dla `SOAR` (automatyzacja playbooków SOC). Łańcuch grupy: **SIEM → SOC → Incident Response / SOAR**. Dlatego SOC autorowany jest po SIEM, a przed Incident Response.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy i normy (oficjalne):**
- NIST SP 800-61r2 „Computer Security Incident Handling Guide" (proces obsługi zdarzeń — fundament pracy SOC i IR): https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST Cybersecurity Framework 2.0 (funkcje Detect / Respond — rama dla procesu SOC): https://www.nist.gov/cyberframework
- NIST SP 800-92 „Guide to Computer Security Log Management" (zarządzanie logami — wejście do SOC): https://csrc.nist.gov/pubs/sp/800/92/final

**Wiedza o detekcji, procesie SOC i dojrzałości (otwarte/autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników — wspólny język SOC): https://attack.mitre.org/
- MITRE D3FEND (baza technik obronnych — komplementarna do ATT&CK): https://d3fend.mitre.org/
- SOC-CMM (Capability Maturity Model dla SOC — model oceny dojrzałości, darmowy): https://www.soc-cmm.com/
- SANS Reading Room — białe księgi o budowie i pracy SOC (darmowe): https://www.sans.org/white-papers/
- ENISA — materiały o budowie zdolności wykrywania/CSIRT w UE (oficjalne, darmowe): https://www.enisa.europa.eu/topics/incident-response

**Materiały o playbookach i reagowaniu (otwarte):**
- Incident Response Playbooks (przykłady otwartych procedur, np. inicjatywy społeczności): https://www.incidentresponse.org/playbooks/
- CISA — Federal Incident & Vulnerability Response Playbooks (oficjalne wzorce procedur): https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks

**Dane do ćwiczeń (publiczne, otwarte) — alerty/logi do triage i metryk:**
- Splunk Boss of the SOC (BOTS) — publiczne zbiory danych SOC do ćwiczeń: https://github.com/splunk/botsv3
- loghub — publiczne zbiory logów systemowych: https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/zgłaszania incydentów): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego — wymogi raportowania): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Zbiory ćwiczeniowe (BOTS, loghub) mogą zawierać dane wyglądające jak osobowe — wymagają tej samej klauzuli maskowania adresów IP, co projekty partii 1. Dwie pozycje warte szczególnej weryfikacji aktualności linku przed wejściem do `learning_resources`: `incidentresponse.org/playbooks` (zasób społecznościowy — sprawdzić, czy nadal utrzymywany) oraz dokładny adres playbooków CISA (CISA bywa reorganizuje strukturę URL). Reszta to stabilne domeny (NIST, MITRE, ENISA, SANS, EUR-Lex).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do swojego SOC i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: SOC zlewał się z SIEM.** Pierwsza wersja opisywała SOC przez pryzmat narzędzia (zapytania, reguły). CISO: „za to płacę inżynierowi detekcji; od analityka SOC chcę *procesu* — triage, eskalacji, przekazania zmiany". **Poprawka:** przeniosłam całą soczewkę na proces i organizację (§2 rozróżnienie SOC≠SIEM, cała mapa §3 o kolejce/eskalacji/playbookach/metrykach), a naukę narzędzia jawnie oddałam researchowi SIEM jako prerekwizyt (§6). To uzasadnia osobny liść `kind: concept`.
2. **Słabość: brak pracy zmianowej i przekazania.** CISO: „połowa incydentów, które przeoczyliśmy, umknęła między zmianami — junior, który nie umie zrobić handoveru, jest dla mnie ryzykiem". **Poprawka:** dodałam przekazanie zmiany jako osobną umiejętność L2 (niuans #5, projekt S5) z ćwiczeniem „incydent przez dwie zmiany".
3. **Słabość: metryki podane jako lista skrótów, bez pułapki.** Pierwsza wersja kończyła na „policz MTTD/MTTR". CISO: „junior, który ściga MTTR, zamyka sprawy szybko zamiast dobrze — to mi szkodzi". **Poprawka:** dodałam niuans #6 (prawo Goodharta, metryki w zestawie nie pojedynczo) i wbudowałam interpretację, nie samo liczenie, w umiejętność L3 i projekt S8.
4. **Słabość: brak granicy człowiek↔automat.** CISO: „SOC bez świadomości, co oddać SOAR, a co zostawić człowiekowi, albo automatyzuje błędy, albo nie automatyzuje nic". **Poprawka:** dodałam niuans #7 i umiejętność L3 (współpraca z SOAR + decyzja, co zostaje przy człowieku), spięte z filozofią produktową SkillBridge (człowiek ma ostatnie słowo).
5. **Słabość: prerekwizyty nie pokazywały zależności od SIEM.** CISO: „nie chcę analityka, który segreguje alerty, nie rozumiejąc, skąd się biorą". **Poprawka:** §6 ustawia `SIEM` jako najtwardszy prerekwizyt „przed L1 SOC", a §5 dodaje twardą zależność S1–S2 od projektów SIEM P1–P4; dopisałam też, czego SOC dostarcza dalej (Incident Response / SOAR), co domyka łańcuch grupy SIEM → SOC → IR/SOAR.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (SOC, Blue/Red Team, SIEM, NOC, MSSP, triage, alert queue, tier, escalation, playbook/runbook, severity, true/false positive, investigation, timeline, containment, shift handover, follow-the-sun, MTTD, MTTR, threat hunting, SOAR, MITRE ATT&CK, D3FEND, SOC-CMM, need-to-know, prawo Goodharta, CISO, NIS2, DORA, CSIRT, ENISA, CISA). Polskie nazwy tam, gdzie nie tracą precyzji. Uwaga rozbrojona jawnie: rynkowe poziomy stanowisk SOC (L1/L2/L3) odróżnione od poziomów projektów SkillBridge (L1–L5), żeby nie myliły czytelnika.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego do pracy w SOC" — spełniony, jeśli autoring domknie 9 projektów L1–L3 z niuansami #1–#9. Niuanse #10–#12 (rozróżnienia ról w skali, wypalenie/ekonomia, granica prawna w pełnym wglądzie) domkną się dopiero na L4/L5 — research je zapowiada, ale pełna „zawodowość" SOC zależy od struktury L4/L5 (Ethan/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
