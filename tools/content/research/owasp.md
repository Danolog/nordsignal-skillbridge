# Research kompetencji: OWASP

> **Status:** research liścia-rdzenia grupy „Bezpieczeństwo aplikacji (AppSec)" w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **To jest rdzeń koncepcyjny grupy AppSec:** teorię podatności webowych (czym są, jak powstają, jak się je naprawia) definiuje ten plik **raz**. Researche narzędzi (`sast.md`, `dast.md`, `sca.md`) **dziedziczą** tę teorię i nie powtarzają jej — wskazują tylko, co dane narzędzie wykrywa, a czego nie.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — testowanie tylko aplikacji własnych/celowo podatnych) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `OWASP` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Bezpieczeństwo aplikacji (AppSec)" (`unionShare` grupy: **4,9%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,2%** ofert ścieżki wymienia OWASP |
| **Liczba ofert (`offers`)** | **12** |
| **`kind`** | `concept` (kompetencja koncepcyjna — zbiór wiedzy i standardów, nie pojedyncze narzędzie; patrz §2) |
| **`lift`** | 13,37 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście-narzędzia to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| **OWASP** (ten plik) | 3,2 | 12 | concept |
| SAST | 1,6 | 6 | tool |
| DAST | 1,1 | 4 | tool |
| SCA | 1,1 | 4 | tool |

**Wniosek dla autoringu:** OWASP to liść o najwyższym popycie w grupie AppSec (3,2% — więcej niż wszystkie trzy narzędzia osobno) i jedyny `concept`. To znaczy, że rynek pyta o *kompetencję koncepcyjną* „rozumiem podatności aplikacji webowych i umiem je naprawić", a konkretne narzędzia skanujące (SAST, DAST, SCA) są pochodną — automatyzują wyszukiwanie tego, co OWASP nazywa. Stąd architektura grupy: **OWASP autorowany pierwszy jako rdzeń teorii**, a researche narzędzi nadbudowują nad nim („to narzędzie wykrywa kategorie OWASP X, Y; nie wykrywa Z"). Bez OWASP narzędzia są ślepym klikaniem „napraw to, co podświetlił skaner" — a sednem zawodu jest odróżnić realną dziurę od fałszywego alarmu (wprost z opisu grupy w modelu).

---

## 2. Definicja kompetencji i jej rola w pracy

**OWASP (Open Worldwide Application Security Project — otwarty, niedochodowy projekt na rzecz bezpieczeństwa aplikacji)** to fundacja utrzymująca darmowe, otwarte standardy, listy i narzędzia bezpieczeństwa aplikacji. To nie firma i nie produkt — to *wspólny język* całej branży AppSec. Najważniejsze, czym OWASP jest dla tej roli:

1. **OWASP Top 10 (dziesięć najczęstszych dziur w aplikacjach webowych)** — lista świadomościowa porządkująca rodzaje podatności w dziesięć kategorii (m.in. zepsuta kontrola dostępu, wstrzyknięcia, błędy kryptografii, błędna konfiguracja). To *lingua franca*: każda oferta pracy, każdy raport skanera i każdy audyt odwołuje się do tych kategorii.
2. **OWASP ASVS (Application Security Verification Standard — standard weryfikacji bezpieczeństwa aplikacji)** — w przeciwieństwie do Top 10 to *wyczerpująca* lista wymagań do weryfikacji, w trzech poziomach rygoru. To narzędzie zawodowca, gdy trzeba systematycznie sprawdzić aplikację, a nie tylko „mieć świadomość".
3. **OWASP Cheat Sheet Series (zwięzłe przewodniki naprawcze)** — konkretne, sprawdzone recepty „jak poprawnie zaimplementować X" (np. obsługę haseł, sesji, walidację danych). To most między „wiem, że jest dziura" a „wiem, jak ją zamknąć".
4. **OWASP WSTG (Web Security Testing Guide — przewodnik testowania bezpieczeństwa webu)** oraz narzędzia projektu: **OWASP ZAP** (skaner dynamiczny, rdzeń researchu `dast.md`), **OWASP Dependency-Check** (analiza zależności, rdzeń `sca.md`), **OWASP Juice Shop** (celowo podatna aplikacja treningowa).

**Czym OWASP NIE jest (rozróżnienie zawodowca):**
- **Top 10 to nie checklista zgodności.** OWASP sam to podkreśla: Top 10 to dokument *świadomościowy* (awareness), nie standard certyfikacji. „Sprawdziłem Top 10" nie znaczy „aplikacja bezpieczna" — to znaczy „sprawdziłem dziesięć najczęstszych klas". Do pełnej weryfikacji służy ASVS.
- **OWASP to nie narzędzie skanujące.** OWASP dostarcza *wiedzę i standardy*; SAST/DAST/SCA to narzędzia, które tę wiedzę automatyzują. Mylenie „uruchomiłem skaner OWASP" z „rozumiem OWASP" to typowy błąd juniora.
- **Top 10 ≠ kompletna lista podatności.** To dziesięć *kategorii* (a wewnątrz każdej dziesiątki kryją się dziesiątki konkretnych słabości z bazy MITRE CWE — patrz §4). Realna dziura często łączy kilka kategorii.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja OWASP jest rdzeniem pracy **inżyniera bezpieczeństwa aplikacji (AppSec engineer)**, **bezpiecznego programisty (secure developer / security champion)** i **testera penetracyjnego aplikacji webowych (web pentester)**. Typowy dzień:
- **Inżynier AppSec:** przegląda wyniki skanerów (SAST/DAST/SCA), przeprowadza *triage* (segregację — co jest realną dziurą, co fałszywym alarmem), mapuje znaleziska na kategorie Top 10 i CWE, doradza programistom *jak* naprawić (sięgając do Cheat Sheets), prowadzi modelowanie zagrożeń (threat modeling) nowych funkcji.
- **Bezpieczny programista / security champion:** pisze kod odporny na kategorie Top 10 (zapytania parametryzowane przeciw wstrzyknięciom, kodowanie wyjścia przeciw XSS, kontrola dostępu na serwerze), recenzuje cudzy kod pod tym kątem.

**Po co rynkowi ta kompetencja.** Aplikacje internetowe to najczęstszy cel ataku (stąd osobny obszar AppSec w modelu). Regulacje europejskie (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — odporność cyfrowa sektora finansowego; nadchodzący CRA — Cyber Resilience Act, rozporządzenie o cyberodporności produktów) coraz częściej wymagają udokumentowanego bezpieczeństwa aplikacji. OWASP jest *de facto* standardem, do którego te wymogi się odwołują. Bez wspólnego języka OWASP zespół nie dogada się ani z audytorem, ani ze skanerem.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

> **Bezwzględna klauzula całej ścieżki:** każde ćwiczenie L1–L5 wykonuje się **wyłącznie na aplikacji własnej lub celowo podatnej** (OWASP Juice Shop, DVWA — Damn Vulnerable Web Application, WebGoat), **nigdy na cudzej**. Nieautoryzowane testowanie cudzej aplikacji to przestępstwo (art. 267 Kodeksu karnego). Klauzula wchodzi do `theory_md` każdego projektu (jak w partii 1).

### L1 — Fundamenty: zrozumieć i zobaczyć dziurę na własnym labie (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest podatność aplikacji webowej i dlaczego powstaje (zaufanie do danych od użytkownika, brak walidacji, błędna kontrola dostępu).
- **Mapa OWASP Top 10:** dziesięć kategorii — co każda oznacza w jednym zdaniu, z naciskiem na dwie–trzy najczęstsze (zepsuta kontrola dostępu — Broken Access Control; wstrzyknięcia — Injection, w tym SQL injection i XSS; błędna konfiguracja — Security Misconfiguration).
- Uruchomienie celowo podatnej aplikacji treningowej na własnej maszynie (OWASP Juice Shop albo DVWA w kontenerze) i *zaobserwowanie* działania prostej podatności: odbity XSS (reflected cross-site scripting — wstrzyknięcie skryptu odbijanego w odpowiedzi), proste wstrzyknięcie SQL.
- Podstawy żądania i odpowiedzi HTTP w kontekście dziury: gdzie wpływają dane użytkownika (parametr URL, formularz, nagłówek, ciastko).

**Co student musi UMIEĆ ZROBIĆ:** uruchomić celowo podatną aplikację na własnym labie; wskazać, do której kategorii Top 10 należy dana podatność; słownie wyjaśnić, *dlaczego* dziura istnieje (jakie założenie programista złamał) i co napastnik mógłby przez nią zrobić.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **„Działa" nie znaczy „bezpieczne".** Aplikacja może działać bez zarzutu i mieć krytyczną dziurę — bo dziura ujawnia się tylko, gdy dane przyjdą *złośliwe*, nie typowe. Amator testuje, że formularz przyjmuje poprawne imię; zawodowiec testuje, co się stanie, gdy w pole imienia wpisać kod.
- **Podatność to nie zawsze „błąd w kodzie".** Najczęstsza kategoria (zepsuta kontrola dostępu) to często *brak* sprawdzenia, którego nie widać — kod działa, po prostu nie pyta „czy ten użytkownik ma prawo do tego zasobu".

### L2 — Zastosowanie: mechanizm + naprawa kategorii Top 10 (8–14 h)

**Zakres wiedzy/umiejętności:**
- Dla każdej z głównych kategorii Top 10 — **mechanizm dziury ORAZ jej naprawa** (to jest sedno L2, nie sama eksploatacja):
  - **Wstrzyknięcie SQL** → naprawa: zapytania parametryzowane / przygotowane (prepared statements), nigdy sklejanie zapytania ze stringów.
  - **XSS (cross-site scripting)** → naprawa: kodowanie wyjścia (output encoding) zależne od kontekstu, polityka treści (Content-Security-Policy).
  - **Zepsuta kontrola dostępu** → naprawa: sprawdzanie uprawnień *na serwerze* przy każdym żądaniu, domyślny brak dostępu (deny by default).
  - **Błędna konfiguracja** → naprawa: bezpieczne domyślne ustawienia, usunięcie zbędnych funkcji.
- **Mapowanie znaleziska na CWE** (Common Weakness Enumeration — katalog słabości oprogramowania MITRE): każda dziura Top 10 ma odpowiadające numery CWE — to wspólny język z bazami podatności i skanerami.
- **Odróżnianie realnej dziury od fałszywego alarmu (false positive)** — pierwszy raz świadomie: czy znaleziona „podatność" jest osiągalna, czy dane są wrażliwe, czy istnieje już zabezpieczenie warstwą wyżej. To kluczowa umiejętność wprost z opisu grupy w modelu.
- Użycie **OWASP Cheat Sheets** jako źródła recepty naprawczej.

**Co student musi UMIEĆ ZROBIĆ:** dla 4–5 kategorii Top 10 odtworzyć dziurę na celowo podatnym labie, opisać mechanizm, **naprawić ją w kodzie** (lub wskazać dokładną poprawkę) i przypisać kategorię + numer CWE; uzasadnić, czy dane znalezisko to prawdziwy pozytyw czy fałszywy alarm.

**Profesjonalne niuanse:**
- **Naprawiaj klasę, nie pojedynczy przypadek.** Zapytanie parametryzowane likwiduje *wszystkie* wstrzyknięcia SQL w danym miejscu, nie tylko to jedno, które znalazł skaner. Amator łata znaleziony przykład; zawodowiec eliminuje całą klasę dziury.
- **Walidacja danych po stronie klienta to teatr.** Kontrola w przeglądarce (JavaScript) poprawia wygodę, ale napastnik ją omija — jedyne wiążące sprawdzenie jest *na serwerze*. To pułapka, na której wykłada się większość początkujących.
- **Fałszywy alarm kosztuje zaufanie do raportu.** Zawodowiec, który zgłasza dziesięć „dziur", z czego osiem to fałszywe alarmy, traci wiarygodność u programistów — a wtedy ignorują też te dwie prawdziwe.

### L3 — Portfolio: ocena bezpieczeństwa aplikacji wg ASVS + modelowanie zagrożeń (18–30 h)

**Zakres wiedzy/umiejętności:**
- **ASVS jako standard weryfikacji:** systematyczne sprawdzenie aplikacji wg wymagań ASVS (wybór poziomu rygoru L1/L2 ASVS adekwatnego do ryzyka — nie mylić z poziomami SkillBridge), nie tylko „przeleciałem Top 10".
- **Modelowanie zagrożeń (threat modeling):** dla danej aplikacji — co chronimy, kto i jak może zaatakować (np. metodą STRIDE), jakie zabezpieczenia odpowiadają. Świadome *projektowanie* bezpieczeństwa, nie tylko reagowanie na skaner.
- **Recenzja bezpieczeństwa kodu (secure code review)** przez wiele kategorii naraz, z dokumentacją decyzji i odniesieniem do Cheat Sheets.
- **Raport oceny bezpieczeństwa** profesjonalnej jakości: znaleziska zmapowane na Top 10 + CWE, ocena dotkliwości z *kontekstem biznesowym* (nie samym CVSS — patrz §4), rekomendacje naprawcze, świadomie nazwane fałszywe alarmy.
- **Obrona w głąb (defense in depth):** świadomość, że jedna poprawka nie wystarcza — warstwy (walidacja + parametryzacja + najmniejsze uprawnienia + monitoring).

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić ocenę bezpieczeństwa celowo podatnej aplikacji wg ASVS; sporządzić model zagrożeń; napisać raport z znaleziskami zmapowanymi na Top 10/CWE, z dotkliwością uwzględniającą kontekst, z naprawami z Cheat Sheets i z jawnie oddzielonymi fałszywymi alarmami. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Dotkliwość bez kontekstu kłamie.** Ta sama dziura jest krytyczna w bankowości i błaha w wewnętrznym narzędziu bez wrażliwych danych. Ocena „wysoka/średnia/niska" oderwana od *co aplikacja przechowuje i komu służy* to ocena amatora (patrz niuans #7).
- **Modelowanie zagrożeń bije skanowanie.** Skaner znajduje znane wzorce; model zagrożeń wyłapuje *błędy logiki biznesowej* (np. „mogę zamówić za ujemną kwotę"), których żaden skaner nie widzi — bo to nie jest wzorzec techniczny.
- **Raport bez priorytetów to lista życzeń.** Programista nie naprawi 200 znalezisk naraz. Zawodowiec ustala kolejność: co jest realnie wykorzystywalne *i* groźne, idzie pierwsze.

### L4 — Realny przypadek profesjonalny: ocena bezpieczeństwa aplikacji w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Pełna ocena bezpieczeństwa *realistycznej, niejednorodnej* aplikacji (uwierzytelnianie, role, integracje, dane wrażliwe) — celowo podatnej w skali bliskiej produkcyjnej, z mieszanką prawdziwych dziur i kuszących fałszywych alarmów.
- Zestawienie znalezisk z trzech źródeł (SAST + DAST + SCA — patrz researche narzędzi) i ich *korelacja* w spójny raport, z usunięciem duplikatów i rozstrzygnięciem sprzeczności między skanerami.
- **Benchmark:** raport studenta (kompletność pokrycia ASVS, trafność triage, jakość rekomendacji) zestawiony z tym, co dostarczył profesjonalny inżynier AppSec na tej samej aplikacji.

### L5 — Biegłość: program AppSec i bezpieczeństwo w cyklu wytwarzania (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Bezpieczeństwo wbudowane w cykl wytwarzania (secure SDLC):** wpięcie SAST/DAST/SCA w potok CI/CD (taśmę budowania i wdrażania) z progami blokującymi, z balansem szybkość ↔ rygor.
- **Program AppSec dla organizacji:** modelowanie zagrożeń na poziomie architektury, standard kodowania, sieć security championów w zespołach, miary dojrzałości (np. wg OWASP SAMM — Software Assurance Maturity Model).
- **Decyzja, czego *nie* skanować i jak nie utopić zespołu w szumie** — ekonomia i kultura, nie tylko technika (analogia do ekonomii zaciągu w SIEM).
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie „czy znalazł dziury", ale „czy zbudował proces, który trzyma jakość przy rozsądnym koszcie i nie zatrzymuje wytwarzania".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Top 10 to świadomość, nie checklista.** OWASP sam to mówi: Top 10 jest dokumentem uświadamiającym, nie standardem zgodności. „Przeszedłem Top 10" nie znaczy „bezpieczny". Pełna, systematyczna weryfikacja to ASVS. Amator traktuje Top 10 jak listę do odhaczenia; zawodowiec wie, że to mapa najczęstszych klas, nie kompletność.

2. **Realna dziura vs fałszywy alarm — sedno zawodu.** (Wprost z opisu grupy w modelu.) Skaner zgłasza „podatność"; zawodowiec pyta: czy ten kod jest *osiągalny*? czy dane są wrażliwe? czy istnieje już zabezpieczenie warstwą wyżej? Bez tej oceny każdy raport to lista hałasu. Triage to rzemiosło, nie odhaczanie.

3. **Podatność ≠ wykorzystywalność (exploitability).** Dziura, której nie da się dosięgnąć (martwy kod, ścieżka za uwierzytelnieniem, którego napastnik nie przejdzie), jest realnie niżej na liście niż łatwa do wykorzystania bez logowania. Kontekst osiągalności decyduje o priorytecie naprawy.

4. **Naprawiaj klasę, nie objaw.** Jedna poprawka właściwego rodzaju (parametryzacja, kodowanie wyjścia, kontrola dostępu domyślnie zamknięta) likwiduje całą klasę dziur. Łatanie pojedynczych znalezisk skanera to syzyfowa praca, która zostawia siostrzane dziury.

5. **Obrona w głąb (defense in depth).** Żadna pojedyncza warstwa nie jest niezawodna. Walidacja + parametryzacja + najmniejsze uprawnienia + monitoring — gdy jedna zawiedzie, druga łapie. Amator stawia jeden mur; zawodowiec stawia warstwy.

6. **Wspólny język: CWE i CVE.** CWE (Common Weakness Enumeration — katalog *typów* słabości) opisuje *rodzaj* błędu; CVE (Common Vulnerabilities and Exposures — katalog *konkretnych* podatności w konkretnym oprogramowaniu) opisuje *pojedynczą* znaną dziurę w danym produkcie. Top 10 → CWE → CVE to łańcuch, którym mówi cała branża (i wszystkie skanery). Bez niego nie dogadasz się z raportem narzędzia ani z audytorem.

7. **Ocena dotkliwości (CVSS) jest ślepa na kontekst.** CVSS (Common Vulnerability Scoring System — system punktowej oceny podatności) daje liczbę oderwaną od tego, *co* aplikacja przechowuje i komu służy. Ta sama „7.5" jest krytyczna w systemie płatności i błaha w wewnętrznym narzędziu bez danych osobowych. Zawodowiec koryguje ocenę kontekstem biznesowym; amator przepisuje liczbę ze skanera.

8. **Kontrola po stronie klienta to nie zabezpieczenie.** Walidacja w przeglądarce (JavaScript) to wygoda użytkownika; napastnik wysyła żądanie z pominięciem przeglądarki. Wiążące sprawdzenie jest *zawsze* na serwerze. To pierwsza pułapka, którą tępi każdy mentor AppSec.

9. **Bezpieczne domyślne ustawienia i minimalna funkcjonalność.** Najwięcej błędnych konfiguracji bierze się z włączonych „na wszelki wypadek" funkcji, domyślnych haseł, gadatliwych komunikatów błędów. Zawodowiec wyłącza, czego nie używa; amator zostawia domyślne.

10. **Większość włamań to znane, niezałatane dziury.** Nie egzotyczny atak „zero-day", tylko podatność opisana lata temu, której nikt nie naprawił. Dyscyplina aktualizacji (patrz `sca.md` — komponenty) bije polowanie na nowinki. To prowadzi wprost do kategorii Top 10 „Vulnerable and Outdated Components".

11. **Logika biznesowa wymyka się skanerom.** „Mogę kupić za ujemną cenę", „mogę zobaczyć cudze zamówienie, zmieniając numer w adresie" — to dziury, których żaden automat nie wykryje, bo technicznie kod działa. Tu pracuje modelowanie zagrożeń i ludzka recenzja, nie narzędzie.

12. **Granica etyczno-prawna jest częścią kompetencji.** Testowanie podatności wykonuje się **wyłącznie na aplikacji własnej lub celowo podatnej** (Juice Shop, DVWA, WebGoat). Skanowanie cudzej aplikacji bez pisemnej zgody to nieautoryzowany dostęp — przestępstwo (art. 267 KK). Dodatkowo: dane testowe nie mogą zawierać prawdziwych danych osobowych (RODO, minimalizacja). To nie „dodatek", lecz element zawodowego rzemiosła.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty OWASP muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał samodzielnie ocenić i naprawić bezpieczeństwo aplikacji webowej. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Cyber AppSec ma dziś **0 projektów**.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| O1 | L1 | **Pierwsze dziury na Juice Shop / DVWA** — uruchomienie celowo podatnej aplikacji, obserwacja XSS i wstrzyknięcia SQL, przypisanie do kategorii Top 10 | Mapa Top 10, dane użytkownika w HTTP, „działa ≠ bezpieczne" | #1, #8 |
| O2 | L2 | **Wstrzyknięcia: mechanizm i naprawa** — SQL injection + XSS na labie, naprawa (zapytania parametryzowane, kodowanie wyjścia), mapowanie na CWE | Mechanizm + naprawa wstrzyknięć, CWE, naprawa klasy | #4, #6, #8 |
| O3 | L2 | **Zepsuta kontrola dostępu** — odtworzenie i naprawa (sprawdzenie uprawnień na serwerze, deny by default); kategoria #1 Top 10 | Mechanizm + naprawa kontroli dostępu, logika serwera | #4, #11 |
| O4 | L2 | **Triage: realna dziura czy fałszywy alarm** — zestaw zgłoszeń (część prawdziwa, część fałszywa), ocena osiągalności i kontekstu, uzasadnienie TP/FP | Odróżnianie TP/FP, osiągalność | #2, #3 |
| O5 | L3 | **Ocena aplikacji wg ASVS** — systematyczna weryfikacja celowo podatnej aplikacji wg wymagań ASVS, raport zmapowany na Top 10/CWE | ASVS, raport, mapowanie | #1, #6 |
| O6 | L3 | **Modelowanie zagrożeń + logika biznesowa** — model zagrożeń aplikacji (STRIDE), znalezienie dziury logiki biznesowej, której nie widzi skaner | Modelowanie zagrożeń, dziury logiki | #5, #11 |
| O7 | L3 | **Raport oceny bezpieczeństwa z priorytetami** — pełny raport z dotkliwością uwzględniającą kontekst biznesowy, kolejnością napraw, oddzielonymi fałszywymi alarmami | Raport z kontekstem, priorytety, dotkliwość | #2, #7 |
| (O8–O9) | L4–L5 | **ZAPOWIEDŹ** — pełna ocena aplikacji bliskiej produkcyjnej z korelacją SAST+DAST+SCA; program AppSec / secure SDLC z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #9, #10, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 7 projektów.** L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** O1 (zobacz dziurę) → O2 (wstrzyknięcia + naprawa) → O3 (kontrola dostępu) → O4 (triage TP/FP) → O5 (ASVS) → O6 (modelowanie zagrożeń) → O7 (raport). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy. **Projekty narzędzi (SAST/DAST/SCA) zakładają opanowane O1–O4** — student najpierw rozumie dziurę i triage *ręcznie*, dopiero potem czyta wyniki skanera.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

OWASP **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawy webu i protokołu HTTP** — żądanie/odpowiedź, metody (GET/POST), nagłówki, ciastka, sesje. Bez tego student nie zrozumie, *gdzie* wpływają dane napastnika. Częściowo z liścia `Network`/`TCP/IP`. **Wymagane przed L1.**
2. **Podstawy programowania** — umiejętność czytania kodu, żeby zobaczyć dziurę i naprawę. Liść `Python` (najczęstszy w ofertach) buduje tę bazę; projekt `cyber-python-automatyzacja-logow` (partia 1) jest pierwszym kontaktem z kodem. **Wymagane przed L2 (naprawa w kodzie).**
3. **Podstawy SQL** — żeby zrozumieć wstrzyknięcie SQL (jedną z najważniejszych kategorii Top 10). Liść `SQL`. **Wymagane przed L2 (kategoria wstrzyknięć).**
4. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (kto się loguje, czym jest rola i uprawnienie) — żeby zrozumieć kategorię „zepsuta kontrola dostępu". Projekt `cyber-iam-active-directory-lab` (partia 1) tworzy tę bazę. **Wymagane przed L2 (kontrola dostępu).**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK; praca wyłącznie na aplikacji własnej/celowo podatnej). **Wymagane od L1.**

**Czego OWASP dostarcza jako prerekwizyt dla innych liści grupy:** OWASP jest **rdzeniem teorii dla `SAST`, `DAST` i `SCA`** — wszystkie trzy narzędzia wykrywają kategorie OWASP, a ich researche jawnie dziedziczą teorię podatności z tego pliku (nie powtarzają jej). Dlatego OWASP autorowany jest w grupie pierwszy. Łańcuch: **OWASP → (SAST, DAST, SCA)**. Student, który nie rozumie dziury, nie odróżni prawdziwego znaleziska skanera od fałszywego alarmu — czyli nie umie tego, po co skaner istnieje.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**OWASP (oficjalne, darmowe, otwarte):**
- OWASP Top 10 (dziesięć najczęstszych dziur): https://owasp.org/www-project-top-ten/
- OWASP ASVS (standard weryfikacji bezpieczeństwa aplikacji): https://owasp.org/www-project-application-security-verification-standard/
- OWASP Cheat Sheet Series (przewodniki naprawcze): https://cheatsheetseries.owasp.org/
- OWASP WSTG (Web Security Testing Guide): https://owasp.org/www-project-web-security-testing-guide/
- OWASP Juice Shop (celowo podatna aplikacja treningowa): https://owasp.org/www-project-juice-shop/
- OWASP SAMM (model dojrzałości AppSec, kontekst L5): https://owasp.org/www-project-samm/

**Aplikacje treningowe (celowo podatne, do legalnego ćwiczenia):**
- DVWA — Damn Vulnerable Web Application: https://github.com/digininja/DVWA
- OWASP WebGoat (lekcje podatności): https://owasp.org/www-project-webgoat/

**Wiedza o słabościach i podatnościach (otwarte, autorytatywne):**
- MITRE CWE (katalog typów słabości oprogramowania): https://cwe.mitre.org/
- MITRE CVE (katalog konkretnych znanych podatności): https://www.cve.org/
- NIST NVD (National Vulnerability Database — baza podatności): https://nvd.nist.gov/
- FIRST CVSS (system punktowej oceny dotkliwości): https://www.first.org/cvss/

**Standardy i normy (oficjalne):**
- NIST SP 800-218 „Secure Software Development Framework (SSDF)" (bezpieczny cykl wytwarzania): https://csrc.nist.gov/pubs/sp/800/218/final
- NIST Cybersecurity Framework 2.0: https://www.nist.gov/cyberframework

**Kontekst prawny EU/PL (do projektów i klauzul):**
- Dyrektywa NIS2 (cyberbezpieczeństwo): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (sektor finansowy): https://eur-lex.europa.eu/eli/reg/2022/2554
- Cyber Resilience Act (CRA — cyberodporność produktów cyfrowych): https://eur-lex.europa.eu/eli/reg/2024/2847
- Art. 267 Kodeksu karnego (nieautoryzowany dostęp — granica testowania): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Aplikacje treningowe (Juice Shop, DVWA, WebGoat) są **celowo podatne i przeznaczone do legalnego ćwiczenia** — kluczowe, bo cała klauzula etyczna grupy stoi na zakazie testowania cudzych aplikacji. Dane testowe nie mogą zawierać prawdziwych danych osobowych (RODO). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów AppSec na rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził „eksploatacją dla samej eksploatacji".** Pierwsza wersja kładła nacisk na „odtwórz atak". CISO: „nie potrzebuję juniora, który umie zepsuć Juice Shop — potrzebuję kogoś, kto umie *naprawić* dziurę i powiedzieć programiście jak". **Poprawka:** L2 przepisałam na „mechanizm ORAZ naprawa" dla każdej kategorii; dodałam niuans #4 (naprawiaj klasę, nie objaw) i oparłam naprawy o Cheat Sheets. Eksploatacja na labie służy *zrozumieniu*, nie jest celem.

2. **Słabość: brak triage realnej dziury vs fałszywego alarmu.** CISO: „skaner wypluwa setki znalezisk; pierwszy błąd juniora to zgłaszać wszystko jak prawdę — wtedy programiści przestają mu wierzyć". **Poprawka:** wyniosłam to do niuansu #2 (sedno zawodu, wprost z opisu grupy w modelu) i #3 (wykorzystywalność), dodałam osobny projekt L2 (O4) tylko o triage. To jest dokładnie rozdzielnik amator↔zawodowiec z opisu grupy AppSec.

3. **Słabość: Top 10 mylony z kompletnością.** CISO: „junior, który myśli, że przejście Top 10 znaczy «bezpieczne», jest niebezpieczny — bo uśpi czujność zespołu". **Poprawka:** niuans #1 (Top 10 to świadomość, nie checklista) i wprowadzenie ASVS jako standardu weryfikacji na L3 (projekt O5). Jasno rozdzieliłam rolę Top 10 (mapa najczęstszych klas) od ASVS (systematyczna weryfikacja).

4. **Słabość: pominięta logika biznesowa i kontekst dotkliwości.** CISO: „skanery łapią wzorce; pieniądze tracimy na dziurach logiki, których żaden automat nie widzi — i na panice wokół «krytycznych» CVSS, które w naszym kontekście są błahe". **Poprawka:** dodałam niuans #7 (CVSS ślepy na kontekst) i #11 (logika biznesowa wymyka się skanerom), oraz projekt L3 (O6) o modelowaniu zagrożeń i dziurach logiki. To uzasadnia, dlaczego człowiek-ekspert ma ostatnie słowo (filozofia produktowa SkillBridge, sekcja 7 CLAUDE.md).

5. **Słabość: prerekwizyty i relacja do narzędzi były listą, nie łańcuchem.** CISO: „nie chcę juniora, który klika skaner, zanim rozumie dziurę ręcznie". **Poprawka:** §6 przepisałam jako jawny łańcuch (HTTP → kod → SQL → IAM → OWASP) z przypisaniem „wymagane przed L_n" i powiązaniem do projektów partii 1; jawnie zaznaczyłam, że OWASP jest **rdzeniem teorii dla SAST/DAST/SCA**, a projekty narzędzi zakładają opanowane O1–O4. Dziedziczenie teorii (zamiast czterokrotnego powtarzania) jest świadomą decyzją architektury grupy.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (OWASP, AppSec, Top 10, ASVS, Cheat Sheets, WSTG, ZAP, Juice Shop, DVWA, WebGoat, SAMM, XSS, SQL injection, prepared statements, output encoding, CSP, deny by default, threat modeling, STRIDE, secure code review, defense in depth, CWE, CVE, NVD, CVSS, exploitability, true/false positive, secure SDLC, CI/CD, CISO, NIS2, DORA, CRA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie 7 projektów L1–L3 z niuansami #1–#8, #11. Niuanse #9, #10, #12 w skali (secure SDLC, dyscyplina aktualizacji w potoku, program AppSec) wymagają L4/L5 — research je zapowiada, ale pełna „zawodowość" OWASP domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
