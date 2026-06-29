# Research kompetencji: DORA

> **Status:** research kompetencji w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). Liść regulacyjny grupy „Audyt, ryzyko i zgodność (GRC)".
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność / legalność źródeł i cytowań regulacji, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 (test akceptacji: „czy pracodawca EU uzna kandydata za przygotowanego") jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `DORA` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Audyt, ryzyko i zgodność (GRC)" (`unionShare` grupy: **13,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **1,9%** ofert ścieżki wymienia DORA |
| **Liczba ofert (`offers`)** | **7** |
| **`kind`** | `concept` (kompetencja koncepcyjno-regulacyjna, nie narzędzie — patrz §2) |
| **`lift`** | 11,01 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie GRC** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| Risk Management | 4,9 | 18 | concept |
| ISO 27001 | 3,2 | 12 | concept |
| NIST | 2,7 | 10 | concept |
| **DORA** (ten plik) | 1,9 | 7 | concept |
| **RODO / GDPR** | 1,9 | 7 | concept |
| GRC | 1,3 | 5 | concept |

**Wniosek dla autoringu:** DORA ma popyt umiarkowany liczbowo (1,9%, 7 ofert), ale to liść o **najwyższej dynamice** w całej ścieżce — regulacja obowiązuje od **17 stycznia 2025 r.**, więc w migawce rynku 2026-02 jesteśmy rok po jej wejściu, w szczycie zapotrzebowania na ludzi, którzy ją wdrażają w bankach i ubezpieczeniach. To liść wąski branżowo (tylko sektor finansowy), ale tam, gdzie obowiązuje, jest *obowiązkowy* — instytucja finansowa bez zgodności z DORA nie działa legalnie. Dla autoringu znaczy to: research celuje w **konkretną, dobrze opłacaną niszę** (junior ICT risk / operational resilience w finansach), nie w masowy popyt. DORA i RODO mają identyczne dane rynkowe i są bliźniaczymi liśćmi regulacyjnymi grupy — różni je zakres (DORA: tylko finanse, odporność operacyjna; RODO: każda firma, ochrona danych) i oba opierają się na wspólnym fundamencie zarządzania ryzykiem.

---

## 2. Definicja kompetencji i jej rola w pracy

**DORA** (ang. **D**igital **O**perational **R**esilience **A**ct — Akt o Cyfrowej Odporności Operacyjnej) to **Rozporządzenie (UE) 2022/2554** — unijne prawo, które od **17 stycznia 2025 r.** wymaga od sektora finansowego (banki, ubezpieczyciele, firmy inwestycyjne, dostawcy usług płatniczych, a nawet dostawcy usług w zakresie kryptoaktywów) **odporności operacyjnej na zakłócenia technologiczne** — ataki, awarie, wycieki, padnięcie dostawcy chmury. Jako rozporządzenie działa bezpośrednio w każdym państwie UE, bez ustawy wdrażającej.

Sens DORA w jednym zdaniu: do tej pory regulatorzy finansowi pilnowali głównie *kapitału* (czy bank ma pieniądze); DORA dokłada pilnowanie *technologii* (czy bank przetrwa cyberatak albo awarię systemu i dalej obsłuży klientów). Regulacja stoi na **pięciu filarach**, które junior odporności operacyjnej musi umieć rozłożyć:

1. **Zarządzanie ryzykiem ICT** (ang. ICT — Information and Communication Technology; technologie informacyjne i komunikacyjne) — instytucja musi mieć spisane ramy zarządzania ryzykiem technologicznym: zinwentaryzowane systemy i zasoby ICT, ocenione ryzyko, wyznaczoną odpowiedzialność na poziomie zarządu (organ zarządzający *odpowiada* za odporność — to nie jest delegowane „do informatyków").
2. **Zgłaszanie incydentów związanych z ICT** — klasyfikacja incydentów wg wagi (czy to „poważny incydent"?), oraz raportowanie poważnych incydentów do organu nadzoru (w Polsce: **KNF** — Komisja Nadzoru Finansowego) w określonych terminach: zgłoszenie wstępne, pośrednie i końcowe.
3. **Testowanie odporności operacyjnej cyfrowej** — regularne testy (skanowanie podatności, testy scenariuszowe), a dla największych, „istotnych" instytucji — **TLPT** (ang. Threat-Led Penetration Testing — zaawansowane testy penetracyjne oparte na realnych scenariuszach zagrożeń), prowadzone co kilka lat.
4. **Zarządzanie ryzykiem stron trzecich ICT** — kontrola dostawców technologii (zwłaszcza **chmury**): obowiązkowy **rejestr informacji** o umowach z dostawcami ICT, wymogi umowne (prawo audytu, plany wyjścia), oraz nadzór europejskich urzędów nad **krytycznymi dostawcami** (ang. CTPP — Critical Third-Party Providers, np. najwięksi dostawcy chmury obsługujący cały sektor).
5. **Wymiana informacji o cyberzagrożeniach** — dobrowolny mechanizm dzielenia się wiedzą o zagrożeniach między instytucjami.

Szczegóły techniczne tych filarów doprecyzowują **standardy techniczne RTS/ITS** (ang. Regulatory / Implementing Technical Standards — regulacyjne i wykonawcze standardy techniczne) wydawane przez trzy europejskie urzędy nadzoru (EBA — bankowy, EIOPA — ubezpieczeniowy, ESMA — rynków kapitałowych) działające we Wspólnym Komitecie. To znaczy: sama DORA mówi „co", a RTS/ITS mówią „jak dokładnie" — i junior musi umieć czytać oba poziomy.

**Czym DORA NIE jest (rozróżnienie zawodowca):**
- DORA **nie jest** dyrektywą NIS2 dla finansów. NIS2 (dyrektywa o cyberbezpieczeństwie sieci i informacji) to ogólny reżim dla wielu sektorów; dla sektora finansowego DORA jest **prawem szczególnym** (łac. *lex specialis* — przepis szczególny ma pierwszeństwo przed ogólnym). Bank stosuje DORA, nie NIS2. Mylenie tych dwóch to błąd, który dyskwalifikuje na rozmowie.
- DORA **nie jest** o ochronie danych osobowych — to RODO. DORA jest o *ciągłości działania i odporności* (czy usługa finansowa działa mimo ataku), choć oba reżimy się stykają (incydent może być jednocześnie naruszeniem RODO i poważnym incydentem ICT pod DORA — wtedy dwa zegary, dwa zgłoszenia, dwa organy).
- DORA **nie jest** jednorazowym audytem. To ciągły program: rejestr dostawców trzeba aktualizować, incydenty klasyfikować na bieżąco, testy powtarzać.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja DORA jest rdzeniem pracy **młodszego specjalisty ds. ryzyka ICT / odporności operacyjnej** (junior ICT risk / operational resilience analyst) oraz **specjalisty zgodności** w banku, ubezpieczycielu, firmie inwestycyjnej lub fintechu. Typowy dzień:
- **Analityk ryzyka ICT:** prowadzi i aktualizuje **rejestr informacji** o dostawcach ICT (kto, jaka usługa, gdzie dane, jak krytyczna), ocenia ryzyko nowego dostawcy chmury, opiniuje umowy pod kątem wymogów DORA (prawo audytu, plan wyjścia).
- **Specjalista ds. incydentów:** klasyfikuje zgłoszone zdarzenia ICT (czy to „poważny incydent"?), prowadzi zgłoszenia do KNF w reżimie terminów, koordynuje z zespołem technicznym i z zespołem RODO, gdy incydent dotyczy też danych osobowych.

**Po co rynkowi ta kompetencja — i dlaczego to gorący temat w PL od 2025.** DORA weszła w życie 17 stycznia 2025 r., a polski sektor finansowy jest duży i mocno schmurzony (chmura publiczna w bankowości). Instytucje musiały w 2025 r. m.in. złożyć do nadzoru **rejestr informacji o dostawcach ICT** i dostosować umowy — to wywołało falę zapotrzebowania na ludzi, którzy rozumieją regulację operacyjnie. KNF prowadzi aktywny nadzór i komunikuje oczekiwania. Stąd: wąski, ale gorący i dobrze płatny rynek — junior, który *naprawdę* rozumie pięć filarów i rejestr dostawców, wchodzi do finansów bez głębokiego kodu.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Projekty są **dokumentowo-analityczne** (inwentaryzacja, rejestr, klasyfikacja, plan, raport), nie kodowe — to odpowiada realnej pracy juniora ryzyka ICT.

### L1 — Fundamenty: zakres DORA i pięć filarów (3–6 h)

**Zakres wiedzy/umiejętności:**
- **Kto podlega DORA** (zakres podmiotowy) — rozpoznanie na liście fikcyjnych firm, które są instytucją finansową w rozumieniu DORA, a które nie; pojęcie proporcjonalności (mała firma ma lżejszy reżim niż duży bank).
- **Pięć filarów** — umieć przypisać konkretny obowiązek firmy do właściwego filaru (np. „aktualizujemy listę dostawców chmury" → filar ryzyka stron trzecich).
- **Kluczowe pojęcia ICT** — czym jest zasób ICT, usługa ICT, dostawca ICT, incydent związany z ICT; różnica DORA vs NIS2 vs RODO (lex specialis).
- **Rola organu zarządzającego** — że odpowiedzialność za odporność jest na poziomie zarządu, nie „u informatyków".

**Co student musi UMIEĆ ZROBIĆ:** wziąć opis fikcyjnej instytucji finansowej i sporządzić analizę: czy i w jakim zakresie podlega DORA, które z pięciu filarów jej dotyczą, jak DORA ma się do NIS2/RODO w jej przypadku, gdzie leży odpowiedzialność zarządu.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **DORA to *lex specialis* — i to nie ciekawostka.** Junior, który radzi bankowi „stosujcie NIS2", się ośmiesza. Dla finansów obowiązuje DORA; NIS2 schodzi na dalszy plan. To pierwszy test rozumienia na rozmowie.
- **Odporność to nie to samo co bezpieczeństwo.** Bezpieczeństwo pyta „czy nas zaatakują"; odporność operacyjna pyta „czy *przetrwamy* atak/awarię i dalej obsłużymy klienta". DORA jest o tym drugim — o ciągłości, nie tylko o murach.

### L2 — Zastosowanie: inwentaryzacja ICT, rejestr dostawców, klasyfikacja incydentu (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Inwentaryzacja zasobów i usług ICT:** sporządzenie spisu systemów, aplikacji i usług ICT fikcyjnej instytucji z oceną ich krytyczności dla funkcji biznesowych (które funkcje są „krytyczne lub istotne").
- **Rejestr informacji o dostawcach ICT (filar 4):** zbudowanie wpisu rejestru dla dostawcy (np. dostawcy chmury) — jaka usługa, gdzie przechowywane dane, czy wspiera funkcję krytyczną, czy jest zastępowalny. To flagowy, obowiązkowy dokument DORA, który instytucje składają do nadzoru.
- **Klasyfikacja incydentu ICT (filar 2):** ocena zadanego zdarzenia wg kryteriów wagi (liczba dotkniętych klientów, czas trwania, zasięg geograficzny, utrata danych, wpływ ekonomiczny) — decyzja „poważny incydent czy nie" i jakie terminy zgłoszenia się włączają.
- **Wymogi umowne wobec dostawcy:** rozpoznanie, jakie klauzule DORA wymaga w umowie z dostawcą ICT (prawo audytu, lokalizacja danych, plan wyjścia / strategia rozłączenia).

**Co student musi UMIEĆ ZROBIĆ:** zinwentaryzować zasoby ICT zadanej firmy z oceną krytyczności; sporządzić poprawny wpis do rejestru informacji dla dostawcy chmury; sklasyfikować zadany incydent wg kryteriów wagi z uzasadnieniem i terminami; wskazać brakujące klauzule DORA w fikcyjnej umowie z dostawcą.

**Profesjonalne niuanse:**
- **Rejestr informacji to nie jednorazowa tabelka — to żywy obraz uzależnień firmy.** Amator wypełnia rubryki. Zawodowiec widzi w rejestrze, *od kogo* firma jest krytycznie zależna (np. jeden dostawca chmury pod trzema funkcjami krytycznymi) — i że to jest ryzyko, nie tylko dokument.
- **Klasyfikacja incydentu decyduje o zegarze — i o tym, czy regulator się dowie.** Zaniżenie wagi („to drobiazg") to nie tylko błąd merytoryczny, lecz potencjalne naruszenie obowiązku zgłoszenia. Progi są określone w standardach RTS — junior musi je czytać, nie szacować „na oko".
- **„Plan wyjścia" od dostawcy brzmi teoretycznie, dopóki dostawca nie padnie.** DORA wymaga, by instytucja umiała *odejść* od dostawcy ICT. Amator traktuje to jako formalność w umowie; zawodowiec wie, że to realne ryzyko ciągłości (filar 4 styka się z koncentracją — §4).

### L3 — Portfolio: ramy zarządzania ryzykiem ICT, plan testów, dossier incydentu (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Ramy zarządzania ryzykiem ICT (filar 1):** opracowanie dokumentu ram dla fikcyjnej instytucji — identyfikacja funkcji krytycznych, mapowanie zasobów ICT na te funkcje, ocena ryzyka, przypisanie odpowiedzialności (w tym roli zarządu), powiązanie z planem ciągłości działania.
- **Mapowanie wymogu DORA na kontrolę:** przełożenie ogólnego obowiązku (np. „odpowiednie środki ochrony i wykrywania") na konkretne kontrole techniczne/organizacyjne (kopie zapasowe, segmentacja, monitoring/SIEM, plany odtworzenia) z uzasadnieniem proporcjonalności.
- **Plan testowania odporności (filar 3):** zaprojektowanie programu testów — co testujemy, jak często, jakimi metodami; wyjaśnienie, kiedy wchodzi TLPT (zaawansowane testy oparte na zagrożeniach) i kogo dotyczy.
- **Pełne dossier zgłoszenia incydentu (filar 2):** komplet zgłoszenia do KNF — wstępne, pośrednie, końcowe — z opisem, klasyfikacją, skutkami i działaniami naprawczymi; oraz koordynacja z zegarem RODO, gdy incydent dotyka danych osobowych.
- **Ocena ryzyka koncentracji dostawców (filar 4):** analiza, czy firma nie jest nadmiernie zależna od jednego dostawcy ICT (zwłaszcza chmury) i co to znaczy dla odporności całego sektora.

**Co student musi UMIEĆ ZROBIĆ:** opracować ramy zarządzania ryzykiem ICT dla zadanej instytucji z mapą funkcji krytycznych; zmapować wybrane wymogi DORA na konkretne kontrole; zaprojektować plan testów odporności ze wskazaniem progu TLPT; złożyć kompletne, wieloetapowe dossier incydentu do KNF; ocenić ryzyko koncentracji dostawcy. To poziom „portfolio na rozmowę o pracę w ryzyku ICT banku/ubezpieczyciela".

**Profesjonalne niuanse:**
- **Ramy zarządzania ryzykiem ICT to nie segregator polityk — to mapa, jak firma przeżyje awarię.** Amator pisze polityki, których nikt nie czyta. Zawodowiec zaczyna od pytania „które funkcje są krytyczne i co je wywróci", a dokumenty są tego konsekwencją. DORA wprost wiąże ryzyko ICT z funkcjami biznesowymi.
- **Mapowanie wymogu na kontrolę to most między regulacją a inżynierią — tak jak w RODO.** „Odpowiednie środki" znów wymagają tłumacza między prawnikiem/regulatorem a zespołem technicznym. Junior ryzyka ICT jest tym tłumaczem; proporcjonalność do wielkości i ryzyka instytucji jest częścią regulacji.
- **Test odporności to dowód, nie deklaracja — analogia do testowania detekcji w SIEM.** Plan ciągłości, którego nikt nie przetestował, jest fikcją. DORA wymaga *testowania*, bo regulator wie, że niesprawdzony plan zawodzi w kryzysie. To ta sama logika, co „reguła SIEM, której nikt nie odtworzył, nie istnieje".

### L4 — Realny przypadek profesjonalny: ramy ryzyka ICT i rejestr dostawców w warunkach instytucji finansowej (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realistycznie zagmatwanego* obrazu instytucji finansowej (wielu dostawców, część usług na chmurze, niejasne granice funkcji krytycznych) i doprowadzenie go do kompletnego rejestru informacji + ram ryzyka ICT obronnych przed KNF.
- Współpraca z zespołem technicznym przy mapowaniu wymogów na realne kontrole oraz przy ocenie, czy plan wyjścia od dostawcy chmury jest wykonalny, czy tylko zapisany — junior musi umieć rozmawiać z inżynierami i odróżnić „technicznie się nie da" od „nikt tego nie próbował".
- **Benchmark:** dokumenty studenta (rejestr, ramy ryzyka, ocena koncentracji) zestawione z tym, co na tym samym przypadku przygotował praktykujący specjalista ds. ryzyka ICT.

### L5 — Biegłość: strategia odporności i ryzyko koncentracji w skali sektora (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia odporności operacyjnej dla całej organizacji:** spójny program — ramy ryzyka, testy (w tym TLPT), zarządzanie dostawcami, plany ciągłości — który *udowadnia* odporność przed nadzorem, nie pojedynczy dokument.
- **Zgodność formalna vs realna odporność (sedno, §4):** wskazanie, gdzie instytucja „ma rejestr i polityki", ale realnie nie przetrwa padnięcia kluczowego dostawcy — i odwrotnie. Senior optymalizuje jedno i drugie.
- **Ryzyko koncentracji i strategie wyjścia w skali:** decyzja o dywersyfikacji dostawców chmury, realne (nie papierowe) plany rozłączenia, świadomość ryzyka systemowego (kilku dostawców obsługuje cały sektor — nadzór europejski nad CTPP).
- **Benchmark** wobec rozwiązania praktykującego architekta odporności / CISO instytucji finansowej: nie tylko „czy zgodne na papierze", lecz „czy instytucja realnie przetrwa kryzys ICT i obroni to przed KNF".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zgodność formalna ≠ realna odporność.** Bliźniacze złudzenie do RODO. Instytucja może mieć komplet ram, rejestrów i polityk, a w dniu padnięcia dostawcy chmury stanąć. DORA nie pyta „czy masz dokument" — pyta „czy *przetrwasz*". Zawodowiec rozdziela papier od zdolności i pracuje nad obydwoma. To rdzeń całej regulacji.

2. **Odporność operacyjna to ciągłość, nie tylko obrona.** Bezpieczeństwo buduje mury; odporność zakłada, że mur kiedyś pęknie, i pyta „co wtedy". Plany ciągłości, kopie zapasowe, plany wyjścia od dostawcy, testy odtworzenia — to język DORA. Amator myśli „jak nie wpuścić atakującego"; zawodowiec myśli „jak działać, gdy już wszedł / gdy system padł".

3. **DORA to *lex specialis* wobec NIS2 dla finansów.** Sektor finansowy stosuje DORA, nie ogólną dyrektywę NIS2. To pierwszy rozdzielnik amator↔zawodowiec na rozmowie. Junior musi też wiedzieć, gdzie DORA styka się z RODO (incydent może podlegać obu reżimom równolegle — dwa zegary, dwa organy: KNF i UODO).

4. **Ryzyko koncentracji dostawców to ciche ryzyko systemowe.** Większość sektora finansowego w EU stoi na kilku dostawcach chmury. Jeśli jeden padnie, wywróci wiele instytucji naraz — dlatego DORA wprowadziła nadzór europejski nad krytycznymi dostawcami (CTPP). Zawodowiec widzi w rejestrze dostawców nie listę, lecz *mapę uzależnień*; amator widzi tabelkę do wypełnienia.

5. **Klasyfikacja incydentu decyduje o obowiązku zgłoszenia.** Progi „poważnego incydentu" są w standardach technicznych (RTS) — liczba klientów, czas, zasięg, straty. Zaniżenie wagi to nie tylko błąd, lecz ryzyko naruszenia obowiązku raportowania do nadzoru. Junior czyta progi, nie szacuje intuicyjnie.

6. **Zgłaszanie incydentu to wieloetapowy proces z zegarem, nie jeden e-mail.** DORA przewiduje zgłoszenie wstępne, pośrednie i końcowe — instytucja raportuje *na bieżąco*, w miarę jak rozumie incydent. To proces operacyjny, który trzeba mieć *przed* incydentem. Most do SIEM/Incident Response (najpierw trzeba incydent wykryć) i do RODO (jeśli dotyczy danych osobowych — równoległy zegar 72 h).

7. **Mapowanie wymogu DORA na kontrolę techniczną to rdzeń roli.** „Odpowiednie środki ochrony, wykrywania i odtwarzania" — regulacja jest celowo ogólna, ktoś musi ją przełożyć na konkretne kontrole (monitoring, kopie zapasowe, segmentacja, plany odtworzenia). To robi specjalista ryzyka ICT *razem* z inżynierem. Najczęściej testowana umiejętność praktyczna.

8. **Współpraca regulacja ↔ inżynier ↔ zarząd to istota zawodu.** Junior ryzyka ICT nie jest prawnikiem ani inżynierem — jest tłumaczem między regulatorem, zespołem technicznym i zarządem (który *odpowiada* osobiście za odporność). Wartość roli tkwi w rozumieniu wszystkich trzech języków. Czysto formalne podejście zawodzi w kontakcie z technologią.

9. **Test odporności to dowód, nie deklaracja.** Plan ciągłości i odtworzenia, którego nikt nie przetestował, zawodzi w kryzysie. DORA wymaga regularnych testów, a dla największych — TLPT (testy oparte na realnych scenariuszach zagrożeń). To ta sama filozofia, co testowanie detekcji w SIEM: „niesprawdzone = nieistniejące".

10. **Proporcjonalność jest częścią prawa, nie ulgą.** Mały podmiot ma lżejszy reżim niż duży bank — DORA jest skalowalna. Amator albo robi „wszystko maksymalnie" (przepala budżet), albo „nic, bo jesteśmy mali" (łamie prawo). Zawodowiec dobiera zakres do wielkości i profilu ryzyka instytucji.

11. **Plan wyjścia od dostawcy to realne ryzyko, nie klauzula.** DORA wymaga, by instytucja umiała odejść od dostawcy ICT (zwłaszcza chmury). Amator wkleja klauzulę do umowy; zawodowiec pyta „czy *technicznie i operacyjnie* da się przenieść te dane i usługę w rozsądnym czasie" — bo gdy dostawca zawiedzie, liczy się wykonalność, nie zapis.

12. **DORA to żywy reżim — standardy RTS/ITS dopełniają regulację.** Sama DORA mówi „co"; szczegóły („jak dokładnie", progi, formaty rejestru) są w standardach technicznych wydawanych przez europejskie urzędy nadzoru i bywają aktualizowane. Junior musi wiedzieć, że samej DORA nie wystarczy — trzeba czytać też RTS/ITS i komunikaty KNF.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty DORA muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania juniora ryzyka ICT / odporności operacyjnej. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Wszystkie projekty są **dokumentowo-analityczne** (inwentaryzacja, rejestr, klasyfikacja, plan, dossier) — bez kodu, bez prod.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Zakres DORA i pięć filarów** — dla zadanych fikcyjnych firm: czy podlegają DORA, które filary, DORA vs NIS2 vs RODO | Zakres podmiotowy, 5 filarów, lex specialis | #2, #3 |
| P2 | L1 | **Odpowiedzialność i pojęcia ICT** — rola zarządu, zasób/usługa/dostawca/incydent ICT, proporcjonalność | Pojęcia ICT, rola organu zarządzającego, proporcjonalność | #2, #10 |
| P3 | L2 | **Inwentaryzacja zasobów ICT + funkcje krytyczne** — spis systemów z oceną krytyczności dla funkcji biznesowych | Inwentaryzacja, krytyczność funkcji | #1 |
| P4 | L2 | **Rejestr informacji o dostawcach ICT** — wpis rejestru (filar 4) dla dostawcy chmury, zależność krytyczna | Rejestr dostawców, wymogi umowne | #4, #11 |
| P5 | L2 | **Klasyfikacja incydentu ICT** — ocena wagi wg kryteriów, decyzja „poważny czy nie" + terminy | Klasyfikacja incydentu (filar 2) | #5, #6 |
| P6 | L3 | **Ramy zarządzania ryzykiem ICT** — dokument ram (filar 1) z mapą funkcji krytycznych i odpowiedzialnością | Ramy ryzyka ICT, mapowanie na funkcje | #1, #8 |
| P7 | L3 | **Mapowanie DORA na kontrole + plan testów** — wymóg→kontrola, program testów ze wskazaniem progu TLPT | Mapowanie, testowanie (filar 3) | #7, #9 |
| P8 | L3 | **Dossier incydentu do KNF (wieloetapowe)** — zgłoszenie wstępne/pośrednie/końcowe + koordynacja z RODO | Zgłaszanie incydentu w pełni (filar 2) | #3, #6 |
| P9 | L3 | **Ocena ryzyka koncentracji dostawcy** — analiza zależności od jednego dostawcy ICT/chmury + plan wyjścia | Koncentracja, plan wyjścia (filar 4) | #4, #11 |
| (P10–P11) | L4–L5 | **ZAPOWIEDŹ** — realny zagmatwany przypadek instytucji finansowej (rejestr + ramy z inżynierem), strategia odporności i koncentracja w skali; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #1, #7, #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną (tu w wariancie „pracujesz na fikcyjnej instytucji i danych syntetycznych — żadnych realnych danych instytucji ani osób"), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (zakres/filary) → P2 (pojęcia/odpowiedzialność) → P3 (inwentaryzacja) → P4 (rejestr dostawców) → P5 (klasyfikacja incydentu) → P6 (ramy ryzyka) → P7 (mapowanie/testy) → P8 (dossier KNF) → P9 (koncentracja). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

DORA **nie ma sensu** bez fundamentów zarządzania ryzykiem i kontekstu zgodności. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Pojęcie ryzyka** (liść `Risk Management`) — cała DORA jest oparta na zarządzaniu ryzykiem ICT. Bez rozumienia ryzyka (prawdopodobieństwo × skutek, ryzyko nieodłączne vs szczątkowe) student nie zbuduje ram z filaru 1. **Wymagane przed L3, pomocne od L1.**
2. **Kontekst zgodności i regulacji** — pojęcia administrator/odpowiedzialność, rejestr, zgłaszanie — wspólne z `RODO / GDPR`. RODO autorujemy wcześniej w grupie i daje wspólny język rozliczalności. **Pomocne od L1, wzmacnia L2–L3.**
3. **Podstawy bezpieczeństwa informacji** — poufność/integralność/dostępność, podstawowe kontrole, plany ciągłości; częściowo z `ISO 27001`/`NIST`. **Wymagane przed L3 (mapowanie wymogu na kontrolę).**
4. **Pojęcie chmury i dostawcy ICT** — `AWS`/`Azure`/`GCP` jako kontekst (większość ryzyka stron trzecich w finansach to chmura). Nie trzeba umieć konfigurować — trzeba rozumieć model dostawcy. **Pomocne na L2 (rejestr dostawców).**
5. **Pojęcie incydentu i jego wykrywania** — most do `SIEM`/`SOC`/`Incident Response` (incydent trzeba wykryć, by go sklasyfikować i zgłosić). **Pomocne na L2–L3.**
6. **Klauzula etyczno-prawna i zasada „dane fikcyjne"** — praca wyłącznie na fikcyjnej instytucji i danych syntetycznych. **Wymagane od L1.**

**Czego DORA dostarcza jako kontekst dla innych liści grupy:** DORA pokazuje regulacyjny „cel" wielu kontroli technicznych — analityk SIEM/SOC w banku często buduje detekcję *pod* wymóg zgłaszania incydentów DORA; specjalista `Risk Management` używa DORA jako konkretnego zastosowania ram ryzyka; `ISO 27001` i `NIST` dostarczają kontroli, które mapują się na wymogi DORA. DORA i RODO to bliźniacze liście regulacyjne — wspólnie domykają regulacyjną część grupy GRC.

---

## 7. Źródła (rzetelne, legalne, oficjalne — do akceptacji Ryana)

Wszystkie publiczne i oficjalne; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność, aktualność i poprawność cytowania regulacji.

**Tekst prawa (oficjalne, EUR-Lex):**
- DORA — pełny tekst, Rozporządzenie (UE) 2022/2554 (EUR-Lex, wersja polska): https://eur-lex.europa.eu/eli/reg/2022/2554/oj
- Dyrektywa NIS2, Dyrektywa (UE) 2022/2555 (dla rozróżnienia DORA vs NIS2 — lex specialis): https://eur-lex.europa.eu/eli/dir/2022/2555/oj

**Standardy techniczne i wytyczne nadzoru (oficjalne, autorytatywne):**
- KNF — Komisja Nadzoru Finansowego (polski organ nadzoru; komunikaty i materiały o DORA): https://www.knf.gov.pl/
- EBA — Europejski Urząd Nadzoru Bankowego, materiały i standardy RTS/ITS do DORA: https://www.eba.europa.eu/
- Europejskie urzędy nadzoru (ESAs — EBA/EIOPA/ESMA) — strona Wspólnego Komitetu i standardów DORA (RTS/ITS, m.in. wzór rejestru informacji): https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en
- ENISA — Agencja UE ds. Cyberbezpieczeństwa (wsparcie dla testów i zarządzania ryzykiem ICT): https://www.enisa.europa.eu/

**Kontekst dla projektów (dane fikcyjne):**
- Generator danych fikcyjnych Faker (do tworzenia syntetycznych firm/dostawców — nigdy danych realnych instytucji): https://faker.readthedocs.io/

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne (EUR-Lex, KNF, EBA, ESAs/EIOPA, ENISA) — zero źródeł nieautoryzowanych. Cztery punkty do Twojej weryfikacji prawnej: **(1)** czy data wejścia (17 stycznia 2025 r.) i ujęcie pięciu filarów są przedstawione bez uproszczeń wprowadzających w błąd — przejrzyj §2; **(2)** czy stwierdzenie „DORA jako *lex specialis* wobec NIS2 dla finansów" jest poprawne i nie pomija wyjątków (niektóre obowiązki NIS2 mogą się utrzymać poza zakresem DORA) — §2, §4 #3; **(3)** czy opis terminów zgłaszania incydentów (wstępne/pośrednie/końcowe) i progów „poważnego incydentu" jest na tyle ogólny, by nie zafałszować szczegółów z RTS, które się zmieniają — §3 L2, §4 #5–#6; **(4)** czy odesłanie do RTS/ITS i komunikatów KNF jako warstwy doprecyzowującej (§4 #12) jest wystarczająco mocne, żeby autoring nie cytował samej DORA jako kompletnej. Linki do sprawdzenia aktualności przed wejściem do `learning_resources` (strony ESAs i KNF przebudowują adresy; wzór rejestru informacji bywa aktualizowany).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej + perspektywa prawnika

Wcieliłam się w dwóch najsurowszych krytyków: dyrektora bezpieczeństwa instytucji finansowej (CISO — Chief Information Security Officer), który ocenia, czy junior po tych projektach realnie podniesie odporność banku, oraz **praktykującego prawnika / specjalistę zgodności w finansach**, który ocenia, czy treść nie wprowadza w błąd co do regulacji. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość (prawnik): research mylił DORA z NIS2 i z RODO.** Prawnik: „dla finansów obowiązuje DORA jako *lex specialis* — junior, który radzi bankowi NIS2, odpada na pierwszym pytaniu; a DORA to odporność, nie ochrona danych — to RODO". **Poprawka:** wprowadziłam rozróżnienie wprost w §2 (czym DORA NIE jest) i jako niuans #3, z notą o stykach (incydent może podlegać DORA i RODO równolegle — dwa zegary, KNF i UODO). To bezpośrednia odpowiedź na poprzeczkę zawodową.

2. **Słabość (CISO): „odporność" zlewała się z „bezpieczeństwem".** CISO: „nie szukam kogoś, kto postawi mur — szukam kogoś, kto wie, co robimy, gdy mur padnie". **Poprawka:** rozdzieliłam odporność operacyjną (ciągłość) od bezpieczeństwa (obrona) w §2 i niuansie #2; oparłam zakres L3 na planach ciągłości, testach i planach wyjścia, nie tylko na kontrolach prewencyjnych.

3. **Słabość (oba): rejestr dostawców i koncentracja jako formalność, nie ryzyko.** CISO: „rejestr informacji to nie tabelka — to obraz, od kogo padniemy; połowa sektora stoi na tych samych trzech dostawcach chmury". **Poprawka:** dodałam niuans #4 (ryzyko koncentracji, nadzór nad CTPP) i #11 (realny plan wyjścia), wydzieliłam projekt P9 (ocena koncentracji) i wzmocniłam P4 (rejestr jako mapa uzależnień). To rozdzielnik amator↔zawodowiec w filarze 4.

4. **Słabość (CISO): zgłaszanie i testy jako wiedza książkowa, nie proces/dowód.** CISO: „niesprawdzony plan ciągłości jest fikcją; jednorazowy e-mail do KNF to nie zgłoszenie incydentu". **Poprawka:** opisałam zgłaszanie jako wieloetapowy proces z zegarem (niuans #6, projekt P8) i testowanie jako *dowód* odporności (niuans #9, projekt P7) — z jawną analogią do testowania detekcji w SIEM. Powiązałam zgłaszanie z wykrywaniem (most do SIEM/IR).

5. **Słabość (prawnik): research traktował samą DORA jako komplet.** Prawnik: „DORA mówi «co», ale progi, formaty rejestru i terminy są w RTS/ITS i komunikatach KNF — i się zmieniają; junior cytujący samą DORA pominie połowę obowiązków". **Poprawka:** dodałam niuans #12 (żywy reżim, warstwa RTS/ITS), wpisałam to do prerekwizytów źródłowych i do uwag dla Ryana (punkt 3–4 w §7) — autoring ma sięgać po standardy techniczne, nie tylko po tekst rozporządzenia.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin rozwinięty po polsku przy pierwszym użyciu (DORA, ICT, KNF, NIS2, lex specialis, RTS/ITS, EBA/EIOPA/ESMA/ESAs, TLPT, CTPP, rejestr informacji, funkcje krytyczne, plan wyjścia, ryzyko koncentracji, odporność operacyjna, organ zarządzający, RODO/UODO przy styku). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli juniora ryzyka ICT / odporności operacyjnej w finansach, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#10. Niuanse #1 (formalna vs realna w skali), #7, #11, #12 (mapowanie, plany wyjścia, żywy reżim w skali sektora) domkną się w pełni dopiero na L4/L5 (zależność od Ethana/Leo) — research je zapowiada uczciwie, nie zamiata. Świadome zawężenie: to research dla **roli zgodności/ryzyka w finansach**, nie dla inżyniera odporności ani prawnika — junior ma *rozumieć regulację, prowadzić rejestry i klasyfikować incydenty oraz tłumaczyć wymóg na kontrolę*, nie projektować architektury ani wydawać opinii prawnych. To zgodne z realnym ICP rynku (7 ofert, niszowy ale gorący segment finansowy od 2025).

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
