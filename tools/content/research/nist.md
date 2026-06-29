# Research kompetencji: NIST

> **Status:** research kompetencji w ETAP E3 — powstał wg wzorca (golden-example) `tools/content/research/siem.md`, ta sama struktura, głębia i poprzeczka (North Star §0.1).
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `NIST` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Audyt, ryzyko i zgodność (GRC)" (`unionShare` grupy: **13,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **2,7%** ofert ścieżki wymienia NIST |
| **Liczba ofert (`offers`)** | **10** |
| **`kind`** | `concept` (kompetencja koncepcyjna — ramy i normy, nie narzędzie; patrz §2) |
| **`lift`** | 24,31 (siła powiązania liścia z tą ścieżką — najwyższa w grupie GRC) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| Risk Management | 4,9 | 18 | concept |
| **ISO 27001** | 3,2 | 12 | concept |
| **NIST** (ten plik) | 2,7 | 10 | concept |
| RODO / GDPR | 1,9 | 7 | concept |
| DORA | 1,9 | 7 | concept |
| GRC | 1,3 | 5 | concept |

**Wniosek dla autoringu:** cała grupa GRC (Governance, Risk, Compliance — ład, ryzyko, zgodność) ma `unionShare` 13,7% ścieżki i jest, wg noty kuracji w `career-model.json`, „bramą wejścia do cyber bez głębokiego kodu — bliżej procesów, dokumentów i analizy ryzyka". To kluczowa soczewka tego researchu: projekty NIST są **dokumentami i analizami**, nie kodem ani konsolą. NIST ma najwyższy `lift` w grupie (24,31) — gdy oferta w ogóle wymienia ten obszar, NIST jest jego najsilniejszym wyróżnikiem. Rdzeniem grupy jest jednak **Risk Management** (zarządzanie ryzykiem) — NIST i ISO 27001 to dwa konkurujące *języki*, w których to ryzyko się opisuje i którymi udowadnia się zgodność. Dlatego Risk Management jest prerekwizytem NIST (§6), a NIST i ISO 27001 autoruje się jako parę (różnica między nimi to osobny niuans, §4 pkt 4).

---

## 2. Definicja kompetencji i jej rola w pracy

**NIST (National Institute of Standards and Technology — amerykański instytut normalizacyjny przy Departamencie Handlu USA)** to instytucja, ale w ofertach pracy „NIST" znaczy coś węższego: **rodzinę ram i norm bezpieczeństwa informacji**, których ten instytut jest autorem i które de facto stały się językiem światowym (mimo amerykańskiego rodowodu). W praktyce zawodowej „znam NIST" znaczy: umiem posługiwać się dwoma rzeczami.

1. **NIST Cybersecurity Framework (CSF — ramy cyberbezpieczeństwa)** — wysokopoziomowy, dobrowolny szkielet, który porządkuje cały temat bezpieczeństwa w **funkcje** (po polsku: główne obszary działania). W wersji 1.1 były to cztery–pięć funkcji: **Identify** (Zidentyfikuj — co mam i co mi grozi), **Protect** (Zabezpiecz), **Detect** (Wykryj), **Respond** (Zareaguj), **Recover** (Odtwórz). **Wersja CSF 2.0 z 2024 r. dołożyła szóstą, nadrzędną funkcję: Govern (Rządź — ład, role, odpowiedzialność, nadzór zarządu).** Każda funkcja dzieli się na kategorie i podkategorie (konkretne, mierzalne *wyniki*, np. „zarządzane są tożsamości i poświadczenia"). CSF to nie lista zadań — to wspólny słownik, w którym opisuje się, *co* organizacja chce osiągnąć.
2. **Rodzina norm NIST 800** — szczegółowe, techniczne publikacje. Dla juniora GRC liczą się zwłaszcza:
   - **NIST SP 800-53** — katalog **kontroli** (control — pojedynczy, konkretny mechanizm zabezpieczający, np. „wymuszaj uwierzytelnianie wieloskładnikowe"). To setki kontroli pogrupowanych w rodziny (np. kontrola dostępu, reagowanie na incydenty, ciągłość działania).
   - **NIST SP 800-61** — przewodnik obsługi incydentów (jak prowadzić reakcję na incydent jako proces, nie improwizację).
   - **NIST SP 800-37** (Risk Management Framework — ramy zarządzania ryzykiem) i **800-30** (ocena ryzyka) — jak w ogóle podejść do ryzyka metodycznie.

**Po co to rynkowi i jak wygląda dzień pracy.** Banki, ubezpieczyciele i korporacje w Polsce muszą się tłumaczyć przed audytorami i regulatorami. NIST jest językiem, w którym opisują, *jak* się zabezpieczają, i w którym mierzą postęp. Typowy dzień **młodszego specjalisty GRC / młodszego audytora** to:
- **zebranie dowodów (evidence — artefakt potwierdzający, że kontrola działa: zrzut konfiguracji, polityka, log, zapis z systemu)** od działów IT i biznesu;
- **ocena bieżącego stanu** względem wybranych podkategorii CSF lub kontroli 800-53 — co jest, czego nie ma, co działa tylko „na papierze";
- **mapowanie kontroli na ryzyko** — pokazanie, że dana kontrola odpowiada na konkretne, nazwane zagrożenie (a nie istnieje „bo norma kazała");
- **przygotowanie planu poprawy (POA&M — Plan of Action and Milestones, plan działań i kamieni milowych)** z priorytetami wg ryzyka;
- **rozmowa z audytorem** językiem precyzyjnym, bez „chyba" i „raczej".

**Czym NIST NIE jest (rozróżnienie zawodowca):**
- **CSF to nie lista kontrolna do odhaczenia.** To opis *pożądanych wyników*, nie nakaz konkretnych działań. Dwie firmy mogą osiągnąć tę samą podkategorię zupełnie różnymi środkami. Amator traktuje CSF jak ankietę „tak/nie"; zawodowiec — jak mapę ryzyka.
- **NIST ≠ certyfikat.** Nie istnieje „certyfikacja zgodności z NIST CSF" dla firmy (w odróżnieniu od ISO 27001 — patrz osobny liść i niuans #4). NIST to ramy *dobrowolne*; nie ma jednostki, która wydaje firmie świadectwo „jest NIST-owa".
- **NIST ≠ ISO 27001.** To dwa konkurencyjne języki opisu tego samego — patrz §4 pkt 4. Zawodowiec umie je **mapować** na siebie (crosswalk — tabela odpowiedniości), żeby nie robić tej samej pracy dwa razy.
- **NIST to nie tylko USA.** Rodowód amerykański, ale w EU służy jako wzorzec i punkt odniesienia — bywa mapowany na unijne regulacje (DORA, NIS2). „Amerykańskie normy" w nagłówku tego liścia to opis pochodzenia, nie ograniczenie zastosowania.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". W tym liściu czasowniki są procesowo-dokumentowe („zmapuj kontrolę na ryzyko", „przygotuj dowód do audytu"), bo to kompetencja zgodności, nie konsoli.

### L1 — Fundamenty: słownik ram i czytanie kontroli (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest CSF i jego funkcje (Govern / Identify / Protect / Detect / Respond / Recover) — co która obejmuje i dlaczego Govern jest nadrzędna (CSF 2.0).
- Struktura CSF: funkcja → kategoria → podkategoria (wynik) — i czym podkategoria różni się od „zadania".
- Czym jest kontrola (control) w 800-53, jak czytać jej zapis (identyfikator rodziny, treść, wskazówki wdrożeniowe), czym kontrola różni się od podkategorii CSF.
- Pojęcie zasobu (asset — to, co chronimy: dane, system, usługa) i przypisanie zasobu do funkcji CSF („ten serwer płac dotyczy głównie Protect i Recover").

**Co student musi UMIEĆ ZROBIĆ:** opisać własnymi słowami sześć funkcji CSF; wskazać dla 3–5 przykładowych zabezpieczeń, do której funkcji i kategorii należą; przeczytać wybraną kontrolę 800-53 i streścić, *czego* wymaga, bez żargonu.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Podkategoria CSF to wynik, nie czynność.** „Tożsamości są zarządzane" nie mówi *jak* — to świadome. Amator czyta to jak instrukcję i pyta „ale co konkretnie zrobić?"; zawodowiec rozumie, że to organizacja dobiera środek do swojego kontekstu.
- **Numer kontroli to nie magia.** Identyfikatory rodzin 800-53 (kontrola dostępu, reagowanie na incydenty itd.) to tylko adres w katalogu — liczy się treść i to, na jakie ryzyko kontrola odpowiada, nie jej numer.

### L2 — Zastosowanie: ocena stanu i mapowanie kontroli na ryzyko (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Profil bieżący vs docelowy (current profile / target profile):** opisanie, gdzie organizacja jest *dziś* względem wybranego podzbioru podkategorii CSF, i gdzie *chce być*.
- **Analiza luki (gap analysis):** różnica między profilem bieżącym a docelowym — lista tego, czego brakuje.
- **Mapowanie kontroli na ryzyko:** dla zidentyfikowanego ryzyka (np. „przejęcie konta administratora") wskazanie kontroli z 800-53, która je adresuje, i uzasadnienie *dlaczego ta*.
- **Dobór kontroli wg poziomu (baseline):** pojęcie linii bazowych 800-53 (niski / umiarkowany / wysoki wpływ) — że nie wdraża się „wszystkich" kontroli, tylko zestaw dobrany do wagi systemu.
- **Dowód (evidence):** czym jest dobry dowód, że kontrola *działa* (a nie tylko „jest opisana w polityce").

**Co student musi UMIEĆ ZROBIĆ:** zbudować profil bieżący fikcyjnej małej organizacji dla podzbioru podkategorii CSF; wykonać analizę luki; zmapować 3–5 ryzyk na kontrole 800-53 z uzasadnieniem; dla każdej kontroli wskazać, jaki dowód potwierdziłby jej działanie.

**Profesjonalne niuanse:**
- **„Wdrożone" to najczęściej kłamstwo z dobrymi intencjami.** Kontrola opisana w polityce, ale nieegzekwowana w praktyce, jest *niewdrożona* — i tu zaczyna się zgodność na papierze (§4 pkt 1). Zawodowiec pyta o dowód, nie o deklarację.
- **Dobór kontroli to decyzja o ryzyku, nie kopiowanie katalogu.** Wdrożenie „wszystkiego z 800-53" jest niemożliwe i bez sensu — zawodowiec dobiera linię bazową do wagi systemu i ryzyka, i umie *uzasadnić*, czego świadomie nie wdraża.
- **Mapowanie bez ryzyka jest puste.** Kontrola, dla której nikt nie umie nazwać zagrożenia, przed którym chroni, to koszt bez wartości. Amator wdraża kontrole „bo lista"; zawodowiec — bo nazwane ryzyko.

### L3 — Portfolio: samoocena + plan poprawy z dowodami (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Pełna samoocena (self-assessment) wg CSF:** ocena wybranego, sensownego zakresu podkategorii dla fikcyjnej organizacji, z poziomem realizacji każdej i z dowodem (lub jawnym brakiem dowodu).
- **Plan poprawy (POA&M):** lista luk przekuta w konkretne działania z właścicielem, terminem i priorytetem **wg ryzyka** (nie alfabetycznie, nie „od najłatwiejszych").
- **Priorytetyzacja wg ryzyka:** uszeregowanie luk po tym, ile ryzyka domyka ich naprawa, a nie po koszcie czy wygodzie.
- **Mapowanie krzyżowe (crosswalk):** powiązanie podkategorii CSF z konkretnymi kontrolami 800-53 i z procesem obsługi incydentu wg 800-61 — pokazanie, że to spójny system, nie trzy osobne dokumenty.
- **Język audytora w dokumencie:** oddzielenie faktu od opinii, jednoznaczne sformułowania, brak „chyba/raczej", powołanie na dowód przy każdym twierdzeniu.

**Co student musi UMIEĆ ZROBIĆ:** dostarczyć pełną samoocenę CSF dla fikcyjnej organizacji z dowodami; zbudować POA&M priorytetyzowany wg ryzyka; pokazać mapowanie krzyżowe CSF↔800-53↔800-61; napisać to językiem, który obroni się przed audytorem. To poziom „portfolio na rozmowę o pracę" dla młodszego specjalisty GRC.

**Profesjonalne niuanse:**
- **POA&M bez priorytetu wg ryzyka to lista życzeń.** Plan, który nie mówi „to najpierw, bo domyka największe ryzyko", jest bezużyteczny — zarząd nie wie, co finansować. Zawodowiec szereguje po ryzyku i umie to obronić.
- **Crosswalk oszczędza miesiące pracy.** Ta sama kontrola często domyka wymóg CSF, 800-53 *i* unijnej regulacji naraz. Zawodowiec mapuje raz i używa wielokrotnie; amator audytuje każdą normę od zera.
- **Samoocena bez śladu dowodu jest niewiarygodna.** „Oceniam tę podkategorię na 80%" bez wskazania, *na podstawie czego*, audytor odrzuci. Każda ocena musi mieć kotwicę w dowodzie albo jawnie nazwany jego brak.

### L4 — Realny przypadek profesjonalny: ocena zgodności w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *niespójnego, realnego* materiału dowodowego od wielu działów (polityki, które się wykluczają, dowody przeterminowane, kontrole opisane, ale niedziałające) i doprowadzenie go do rzetelnej oceny stanu — to codzienność audytora, nie czysty przypadek z podręcznika.
- **Mapowanie NIST na unijną regulację branżową** (np. CSF → wymogi DORA dla sektora finansowego) — pokazanie, że jedna ocena może obsłużyć kilka reżimów naraz.
- Zmierzenie się ze zgodnością na papierze: wykrycie kontroli, które „są", ale nie działają, i opisanie tego językiem, który wytrzyma spór z właścicielem kontroli.
- **Benchmark:** ocena studenta (kompletność, trafność mapowania na ryzyko, jakość POA&M, język) zestawiona z tym, co na tym samym materiale dostarczył profesjonalista.

### L5 — Biegłość: program zgodności i ład (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Funkcja Govern w praktyce:** zaprojektowanie ładu — kto odpowiada za które ryzyko, jak zarząd nadzoruje bezpieczeństwo, jak ryzyko trafia „w górę" do decyzji biznesowej. To rdzeń CSF 2.0 i najtrudniejsza, najbardziej „seniorska" część.
- **Ciągłe monitorowanie (continuous monitoring) vs ocena jednorazowa:** zaprojektowanie programu, w którym zgodność jest mierzona stale, a nie raz do roku przed audytem (800-137).
- **Dojrzałość i poziomy wdrożenia (Implementation Tiers):** świadome osadzenie organizacji na skali dojrzałości i plan jej podniesienia — z ekonomią w tle (każdy poziom kosztuje).
- **Benchmark** wobec rozwiązania realnego oficera ds. zgodności / architekta GRC: nie „czy jest dokument", lecz „czy program da się utrzymać i czy realnie obniża ryzyko".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zgodność na papierze vs zgodność realna (compliance theatre — teatr zgodności).** Najczęstszy grzech GRC: kontrola opisana w polityce i odhaczona jako „wdrożona", która w rzeczywistości nie działa (nikt jej nie egzekwuje, nikt nie sprawdza). Zawodowiec żąda **dowodu działania w czasie**, nie deklaracji; amator odhacza ankietę. To rozdzielnik amator↔zawodowiec numer jeden w całym GRC.

2. **Dobór kontroli do ryzyka, nie do katalogu.** 800-53 ma setki kontroli. Wdrożenie „wszystkich" jest niemożliwe, drogie i bezsensowne. Zawodowiec dobiera linię bazową (niski/umiarkowany/wysoki wpływ) do wagi systemu i potrafi *uzasadnić*, czego świadomie nie wdraża i dlaczego ryzyko jest akceptowalne. Amator próbuje zrobić wszystko albo kopiuje cudzą listę.

3. **CSF to język wyników, nie lista zadań.** Podkategorie opisują *co* ma być osiągnięte, nie *jak*. To celowa elastyczność ram dobrowolnych. Amator szuka w CSF instrukcji krok po kroku i jest sfrustrowany; zawodowiec używa CSF jako wspólnego języka między technikami, ryzykiem i zarządem.

4. **NIST vs ISO 27001 — dwa języki, jeden temat (kluczowe rozróżnienie).** NIST CSF/800-53 to ramy i katalogi *dobrowolne*, rodowodu amerykańskiego, bez certyfikatu dla firmy. ISO 27001 to *certyfikowalna* norma międzynarodowa — jednostka zewnętrzna audytuje i wydaje świadectwo (patrz osobny liść `ISO 27001`). W praktyce wiele firm robi jedno *przez* drugie i **mapuje** je krzyżowo. Zawodowiec wie, kiedy klient potrzebuje certyfikatu (→ ISO), a kiedy ram do uporządkowania programu (→ NIST), i umie je przełożyć na siebie.

5. **Mapowanie krzyżowe (crosswalk) to dźwignia, nie ciekawostka.** Jedna kontrola często domyka naraz CSF, 800-53, ISO 27001 i wymóg DORA/NIS2. Kto mapuje raz i używa wielokrotnie, pracuje wielokrotnie szybciej. Amator audytuje każdą normę od zera i tonie w powtórzeniach.

6. **Dowód (evidence) > deklaracja.** Audytor nie pyta „czy robicie X" — pyta „pokażcie, że robicie X". Dobry dowód jest aktualny, powtarzalny i niezależny od pamięci jednej osoby (zrzut konfiguracji, log, zapis z systemu, podpisany rejestr). Zawodowiec myśli „co będzie dowodem", zanim cokolwiek wdroży; amator szuka dowodów w panice na dzień przed audytem.

7. **Język audytora — fakt oddzielony od opinii.** „Polityka haseł wymaga 12 znaków (fakt, dowód: zrzut zasady) — oceniam ją jako niewystarczającą wobec ryzyka X (opinia)." Mieszanie faktu z opinią, „chyba", „raczej", „wydaje się" — dyskwalifikuje dokument. To rzemiosło językowe, którego uczy się od pierwszego dnia.

8. **CSF 2.0 dołożyła funkcję Govern — bądź aktualny.** Kto opisuje CSF jako „pięć funkcji", pracuje na wersji 1.1 (sprzed 2024). Wersja 2.0 ma sześć funkcji z nadrzędną **Govern** (ład: role, odpowiedzialność, nadzór zarządu, łańcuch dostaw). Pominięcie Govern to sygnał nieaktualnej wiedzy.

9. **Mapowanie kontroli na ryzyko jest dwukierunkowe.** Nie tylko „ryzyko → kontrola", ale i „kontrola → przed jakim ryzykiem chroni". Kontrola, dla której nikt nie umie nazwać zagrożenia, to koszt bez uzasadnienia — kandydat do usunięcia, nie do utrzymania.

10. **Priorytetyzacja wg ryzyka, nie wg kosztu czy wygody.** Plan poprawy (POA&M) musi szeregować luki po tym, ile ryzyka domyka ich naprawa. „Zróbmy najpierw to, co tanie i łatwe" to pułapka — najtańsze rzadko jest najważniejsze. Zawodowiec broni kolejności językiem ryzyka przed zarządem.

11. **Ocena jednorazowa vs ciągłe monitorowanie.** Zgodność „raz do roku przed audytem" to iluzja — stan rozjeżdża się następnego dnia. Dojrzały program mierzy zgodność stale (continuous monitoring, 800-137). Junior tego nie zbuduje, ale musi rozumieć różnicę, żeby nie sprzedawać migawki jako stanu trwałego.

12. **Granica etyczno-prawna i poufność.** Specjalista GRC pracuje na wrażliwych danych: inwentarzu systemów, liście podatności, dowodach słabości organizacji. To mapa, jak firmę zaatakować. Zasada wiedzy koniecznej (need-to-know), poufność i praca wyłącznie na własnym/fikcyjnym materiale to element zawodu, nie dodatek. W projektach: żadnych realnych danych organizacji, wyłącznie fikcyjne persony i scenariusze. Nieautoryzowany dostęp do cudzych systemów/danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty NIST muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania młodszego specjalisty GRC / audytora. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). **Wszystkie projekty są dokumentami/analizami, nie kodem** (soczewka „wejście do cyber bez głębokiego kodu").

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **CSF od podstaw: mapa funkcji** — opisanie sześciu funkcji CSF 2.0 i przypisanie zestawu typowych zabezpieczeń do funkcji/kategorii dla fikcyjnej małej firmy | Słownik funkcji, struktura funkcja→kategoria→podkategoria, Govern | #3, #8 |
| P2 | L1 | **Czytanie kontroli 800-53** — wybór 5–8 kontroli, streszczenie każdej zwykłym językiem i wskazanie, czym kontrola różni się od podkategorii CSF | Czytanie kontroli, pojęcie zasobu, kontrola vs podkategoria | #3, #9 |
| P3 | L2 | **Profil bieżący vs docelowy + analiza luki** — opis stanu „dziś vs cel" dla podzbioru podkategorii fikcyjnej organizacji, lista luk | Profil bieżący/docelowy, gap analysis | #1, #11 |
| P4 | L2 | **Mapowanie kontroli na ryzyko** — dla 3–5 nazwanych ryzyk dobór kontroli 800-53 z uzasadnieniem dwukierunkowym (ryzyko↔kontrola) | Mapowanie na ryzyko, dobór wg linii bazowej | #2, #9 |
| P5 | L2 | **Co jest dowodem? — katalog dowodów** — dla zestawu kontroli wskazanie, jaki dowód potwierdza działanie (i jak odróżnić „opisane" od „działające") | Pojęcie dowodu, papier vs realność | #1, #6 |
| P6 | L3 | **Samoocena CSF z dowodami** — pełna samoocena sensownego zakresu podkategorii dla fikcyjnej organizacji, z dowodem lub jawnym jego brakiem przy każdej | Samoocena, ślad dowodu, język audytora | #1, #6, #7 |
| P7 | L3 | **Plan poprawy (POA&M) wg ryzyka** — przekucie luk z P6 w działania z właścicielem, terminem i priorytetem ułożonym wg ryzyka, z obroną kolejności | POA&M, priorytetyzacja wg ryzyka | #10 |
| P8 | L3 | **Mapowanie krzyżowe CSF↔800-53↔800-61** — pokazanie spójności: podkategoria → kontrola → proces obsługi incydentu jako jeden system | Crosswalk, spójność ram | #5 |
| (P9–P11) | L4–L5 | **ZAPOWIEDŹ** — realny niespójny materiał dowodowy + mapowanie CSF→DORA, funkcja Govern i ład, ciągłe monitorowanie i dojrzałość; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #4, #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną i poufności, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (słownik CSF) → P2 (kontrole) → P3 (profil/luka) → P4 (ryzyko↔kontrola) → P5 (dowód) → P6 (samoocena) → P7 (POA&M) → P8 (crosswalk). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy: nie da się zrobić samooceny (P6) bez pojęcia dowodu (P5) i mapowania na ryzyko (P4), a tych — bez słownika funkcji i kontroli (P1–P2).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

NIST **nie ma sensu** bez wcześniej opanowanego fundamentu ryzyka. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Zarządzanie ryzykiem** (liść `Risk Management`, ten sam liść w grupie GRC, demand 4,9% — najwyższy w grupie) — bez pojęcia ryzyka (zagrożenie × podatność × wpływ), apetytu na ryzyko i postępowania z ryzykiem student nie zmapuje kontroli na ryzyko ani nie zbuduje POA&M wg ryzyka. **Wymagane przed L2.** To rdzeń, na którym stoją oba języki zgodności (NIST i ISO 27001).
2. **Pojęcie kontroli i zasobu** — co chronimy (zasób) i czym (kontrola). Budowane częściowo w L1 NIST, ale fundament „co to system, konto, dane" daje grupa administracji i IAM ścieżki (`Linux`/`Windows`, `IAM`/`Active Directory` z partii 1). **Wymagane/równoległe na L1.**
3. **Podstawowa orientacja w zagrożeniach** — żeby kontrola „przed czym chroni" miała sens, student musi rozumieć typowe zagrożenia (przejęcie konta, wyciek danych, brak ciągłości). Daje to wcześniejszy kontakt z grupą SIEM/SOC i administracji. **Wymagane przed L2.**
4. **Świadomość regulacji unijnych** — `RODO / GDPR`, `DORA`, NIS2 jako kontekst, *po co* w ogóle robi się zgodność w EU. Pełna głębia to osobne liście grupy; tu wystarczy orientacja. **Wymagane przed L3 (mapowanie na regulacje) i pogłębiane na L4.**
5. **Klauzula etyczno-prawna i poufności** — jak w każdym projekcie cyber (art. 267 KK), wzmocniona o poufność materiału GRC (praca wyłącznie na fikcyjnych organizacjach i danych). **Wymagane od L1.**

**Czego NIST dostarcza jako prerekwizyt/sąsiad dla innych liści grupy:** NIST i `ISO 27001` to para — kto opanuje jeden, drugi przyswaja przez mapowanie krzyżowe (znacznie szybciej). NIST 800-37/800-30 domyka też `Risk Management` od strony metodycznej, a 800-61 łączy GRC z obsługą incydentów (grupa SIEM/SOC: `Incident Response`). Dlatego w grupie GRC autoruje się najpierw `Risk Management`, potem parę `NIST`/`ISO 27001`, a regulacje (`DORA`, `RODO / GDPR`) jako warstwę stosującą te ramy do konkretnego prawa.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne i darmowe (publikacje NIST są w domenie publicznej rządu USA); nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Publikacje NIST (oficjalne, darmowe, domena publiczna):**
- NIST Cybersecurity Framework 2.0 (oficjalna strona ram): https://www.nist.gov/cyberframework
- NIST CSF 2.0 — dokument (NIST CSWP 29): https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
- NIST SP 800-53 Rev. 5 — katalog kontroli bezpieczeństwa i prywatności: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-53B — linie bazowe kontroli (niski/umiarkowany/wysoki): https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final
- NIST SP 800-37 Rev. 2 — Risk Management Framework (ramy zarządzania ryzykiem): https://csrc.nist.gov/pubs/sp/800/37/r2/final
- NIST SP 800-30 Rev. 1 — przewodnik oceny ryzyka: https://csrc.nist.gov/pubs/sp/800/30/r1/final
- NIST SP 800-61 Rev. 2 — przewodnik obsługi incydentów: https://csrc.nist.gov/pubs/sp/800/61/r2/final
- NIST SP 800-137 — ciągłe monitorowanie bezpieczeństwa (ISCM): https://csrc.nist.gov/pubs/sp/800/137/final

**Narzędzia i mapowania (oficjalne/otwarte):**
- NIST CSF — Informative References / mapowania na inne normy (crosswalk): https://www.nist.gov/cyberframework/informative-references
- NIST CPRT (Cybersecurity and Privacy Reference Tool — przeszukiwarka kontroli i mapowań): https://csrc.nist.gov/projects/cprt
- OSCAL (Open Security Controls Assessment Language — otwarty format zapisu kontroli i ocen): https://pages.nist.gov/OSCAL/

**Kontekst regulacyjny EU/PL (do projektów L3/L4 i klauzul):**
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego): https://eur-lex.europa.eu/eli/reg/2022/2554
- Dyrektywa NIS2 (cyberbezpieczeństwo sieci i informacji): https://eur-lex.europa.eu/eli/dir/2022/2555
- ENISA — materiały o ramach i zarządzaniu ryzykiem (agencja UE ds. cyberbezpieczeństwa): https://www.enisa.europa.eu/topics/risk-management

> **Do uwagi Ryana:** wszystkie publikacje NIST są w domenie publicznej (dokumenty rządu USA — brak ograniczeń kopiowania, wymagana atrybucja jako dobra praktyka). Brak źródeł pirackich. NIST 800 bywa obszerny — w projektach pracujemy na *podzbiorze* kontroli, nie na całym katalogu (świadomy dobór, niuans #2). Linki do weryfikacji aktualności (numery rewizji: 800-53 Rev.5, 800-37 Rev.2, 800-61 Rev.2; CSF 2.0) przed wejściem do `learning_resources` — NIST okresowo wydaje nowe rewizje.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów GRC do banku/ubezpieczyciela w EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził „NIST = lista kontrolna".** Pierwsza wersja pisała o odhaczaniu podkategorii. CISO: „junior, który traktuje CSF jak ankietę tak/nie, jest dla mnie bezużyteczny — on ma rozumieć ryzyko, nie odklikiwać". **Poprawka:** wbudowałam niuans #3 (CSF to język wyników, nie zadań) i przeprojektowałam L2/L3 wokół *mapowania na ryzyko* i *dowodu*, nie wokół wypełniania listy. Czasowniki operacyjne są procesowe („zmapuj na ryzyko", „przygotuj dowód"), nie „zaznacz".

2. **Słabość: zgodność na papierze potraktowana jako jeden z wielu punktów.** CISO: „to jest *the* problem GRC — dziewięć na dziesięć audytów wykłada się na kontrolach, które «są», ale nie działają". **Poprawka:** wyniosłam to na niuans #1 (rozdzielnik amator↔zawodowiec), dodałam osobny projekt P5 („co jest dowodem?") i wpisałam wymóg dowodu do rubryki samooceny P6. Student musi *udowodnić* działanie, nie zadeklarować.

3. **Słabość: nieaktualność — opis CSF jako „pięć funkcji".** CISO: „jak widzę kandydata, który nie zna funkcji Govern, wiem, że uczył się z materiałów sprzed 2024 — to czerwona flaga". **Poprawka:** dodałam Govern jako szóstą, nadrzędną funkcję (CSF 2.0) w §2 i osobny niuans #8 o aktualności; P1 jawnie obejmuje sześć funkcji.

4. **Słabość: brak ostrego rozróżnienia NIST vs ISO 27001.** CISO: „junior musi wiedzieć, że NIST nie daje certyfikatu, a ISO tak — inaczej obieca klientowi rzecz nieistniejącą". **Poprawka:** dodałam niuans #4 (dwa języki, jeden temat) z jasną różnicą dobrowolne/niecertyfikowalne vs certyfikowalne, oraz niuans #5 o mapowaniu krzyżowym jako dźwigni; spięłam to z prerekwizytami (§6: para NIST/ISO) i z osobnym researchem `iso-27001.md`.

5. **Słabość: priorytetyzacja planu poprawy pominięta.** CISO: „POA&M bez kolejności wg ryzyka to lista życzeń — nie wiem, co finansować w pierwszej kolejności". **Poprawka:** dodałam niuans #10 (priorytet wg ryzyka, nie kosztu), osobny projekt P7 (POA&M z obroną kolejności) i wpisałam obronę priorytetu do tego, co student musi UMIEĆ ZROBIĆ na L3.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (NIST, CSF, funkcje Govern/Identify/Protect/Detect/Respond/Recover, kontrola/control, 800-53/800-61/800-37/800-30/800-137, evidence/dowód, POA&M, profil bieżący/docelowy, gap analysis, baseline/linia bazowa, crosswalk/mapowanie krzyżowe, compliance theatre, continuous monitoring, Implementation Tiers, GRC, CISO, OSCAL, ENISA, need-to-know). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli *młodszego* specjalisty GRC, jeśli autoring domknie wszystkie 8 projektów L1–L3 z niuansami #1–#10. Niuanse #4 (pełne mapowanie na regulacje), #11 (ciągłe monitorowanie), #12 (ład i poufność w skali programu) dojrzewają dopiero na L4/L5 — research je zapowiada, ale pełna „zawodowość" NIST domknie się po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
