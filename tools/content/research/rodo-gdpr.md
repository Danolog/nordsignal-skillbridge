# Research kompetencji: RODO / GDPR

> **Status:** research kompetencji w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). Liść regulacyjny grupy „Audyt, ryzyko i zgodność (GRC)".
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność / RODO / legalność źródeł i cytowań regulacji, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 (test akceptacji: „czy pracodawca EU uzna kandydata za przygotowanego") jest nadrzędny nad całym tym plikiem.
> **Uwaga własnej domeny:** RODO to także *nasza własna* domena zgodności (nordsignal przetwarza dane). Research ma być wzorowo rzetelny — Ryan czyta go nie tylko jako recenzent treści, lecz jako właściciel zgodności firmy.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `RODO / GDPR` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Audyt, ryzyko i zgodność (GRC)" (`unionShare` grupy: **13,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **1,9%** ofert ścieżki wymienia RODO / GDPR |
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
| **RODO / GDPR** (ten plik) | 1,9 | 7 | concept |
| **DORA** | 1,9 | 7 | concept |
| GRC | 1,3 | 5 | concept |

**Wniosek dla autoringu:** RODO ma popyt umiarkowany (1,9%), ale to liść *fundamentalny* dla całej grupy GRC — bo to jedyna regulacja, która dotyczy **każdej** polskiej firmy zatrudniającej i obsługującej ludzi, niezależnie od branży. Inne pozycje grupy (DORA — tylko finanse; ISO 27001 — certyfikacja dobrowolna) są węższe. RODO to wspólny język całej zgodności: pojęcia „administrator", „podstawa prawna", „ocena skutków", „naruszenie", „kara" wracają w każdym innym liściu. Dlatego w grupie GRC research RODO autorujemy jako jeden z pierwszych — pozostałe liście się o niego opierają. Niski popyt liczbowy nie znaczy niska waga: junior GRC, który nie rozumie RODO, nie przejdzie pierwszej rozmowy w dziale zgodności banku, ubezpieczyciela ani agencji.

---

## 2. Definicja kompetencji i jej rola w pracy

**RODO** (Rozporządzenie o Ochronie Danych Osobowych; ang. **GDPR** — General Data Protection Regulation) to **Rozporządzenie (UE) 2016/679** — unijne prawo, które działa bezpośrednio w każdym państwie członkowskim (rozporządzenie, nie dyrektywa — nie wymaga osobnej ustawy wdrażającej, choć Polska dołożyła ustawę uzupełniającą z 10 maja 2018 r.). Reguluje **przetwarzanie danych osobowych** — czyli każdą operację na informacji o możliwej do zidentyfikowania osobie fizycznej (imię, e-mail, numer PESEL, ale też adres IP czy identyfikator w pliku cookie — wyrok TSUE Breyer, C-582/14, uznał dynamiczny adres IP za daną osobową).

RODO opiera się na kilku filarach, które junior zgodności musi umieć rozłożyć na czynniki pierwsze:

1. **Zasady przetwarzania (art. 5 RODO)** — sześć zasad, do których wszystko inne się sprowadza: zgodność z prawem/rzetelność/przejrzystość, ograniczenie celu (dane zbierasz w konkretnym celu, nie „na zapas"), **minimalizacja** (tylko tyle danych, ile trzeba), prawidłowość, ograniczenie przechowywania (retencja — nie trzymasz wiecznie), integralność i poufność (bezpieczeństwo). Siódma, nadrzędna: **rozliczalność** (accountability) — musisz *udowodnić*, że przestrzegasz, nie tylko twierdzić.
2. **Podstawa prawna (art. 6 RODO)** — *nie wolno* przetwarzać danych bez jednej z sześciu podstaw: zgoda, wykonanie umowy, obowiązek prawny, żywotny interes, zadanie publiczne, **prawnie uzasadniony interes** (najczęściej nadużywana — wymaga testu równowagi). Dane szczególne (zdrowie, biometria, poglądy — art. 9) mają osobny, surowszy reżim.
3. **Prawa osób (art. 12–22 RODO)** — dostęp do danych, sprostowanie, usunięcie („prawo do bycia zapomnianym"), ograniczenie, przenoszenie, sprzeciw, oraz prawo do niepodlegania decyzji wyłącznie automatycznej. Firma ma na odpowiedź zwykle **miesiąc**.
4. **Role i odpowiedzialność** — **administrator** (controller — decyduje, po co i jak przetwarza), **podmiot przetwarzający** (processor — przetwarza w imieniu administratora, np. dostawca chmury; wiąże ich **umowa powierzenia**, art. 28), współadministratorzy. To rozróżnienie decyduje, kto za co odpowiada.
5. **Inspektor Ochrony Danych — IOD** (ang. DPO — Data Protection Officer; art. 37–39) — wewnętrzny strażnik zgodności; obowiązkowy m.in. w podmiotach publicznych i tam, gdzie przetwarzanie na dużą skalę jest rdzeniem działalności.
6. **Ocena skutków dla ochrony danych — DPIA** (ang. Data Protection Impact Assessment; art. 35) — analiza ryzyka *przed* uruchomieniem przetwarzania, które może powodować wysokie ryzyko dla osób (np. profilowanie, monitoring na dużą skalę).
7. **Zgłaszanie naruszeń (art. 33–34)** — naruszenie ochrony danych zgłaszasz organowi nadzorczemu (w Polsce: **UODO** — Urząd Ochrony Danych Osobowych) **bez zbędnej zwłoki, w miarę możliwości w ciągu 72 godzin** od stwierdzenia; jeśli ryzyko dla osób jest wysokie — zawiadamiasz też same osoby.
8. **Kary (art. 83)** — do **20 mln EUR albo 4% rocznego światowego obrotu** firmy (liczy się kwota wyższa). To czyni RODO regulacją, której zarząd słucha.

**Czym RODO NIE jest (rozróżnienie zawodowca):**
- RODO **nie jest** zbiorem gotowych instrukcji technicznych. Art. 32 (bezpieczeństwo) mówi „odpowiednie środki techniczne i organizacyjne" — *jakie konkretnie*, regulacja zostawia firmie. Tu zaczyna się rzemiosło: tłumaczenie wymogu prawnego na konkretną kontrolę (szyfrowanie, kontrola dostępu, kopie zapasowe).
- RODO **nie jest** jednorazowym projektem „wdrożyliśmy i mamy spokój". To ciągły proces — rozliczalność trzeba udowadniać codziennie.
- RODO **nie jest** tym samym co bezpieczeństwo IT, ale się z nim **zazębia**: bezpieczeństwo (art. 32) to *jeden* z wymogów RODO, a prywatność to coś więcej niż bezpieczeństwo — dane mogą być świetnie zabezpieczone i jednocześnie przetwarzane bezprawnie (bez podstawy, bez celu, za długo). To kluczowy niuans związku „bezpieczeństwo ↔ prywatność" (§4).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja RODO jest rdzeniem pracy **młodszego specjalisty ds. zgodności / ochrony danych** (junior compliance / privacy analyst, asystent IOD) oraz **analityka ryzyka** w banku, ubezpieczycielu, agencji marketingowej czy firmie SaaS. Typowy dzień:
- **Asystent IOD / privacy analyst:** prowadzi i aktualizuje **rejestr czynności przetwarzania** (ang. RoPA — Records of Processing Activities; art. 30), obsługuje wnioski osób (żądanie dostępu, usunięcia), opiniuje nowe pomysły biznesu pod kątem RODO, współpracuje z prawnikiem i z inżynierem przy mapowaniu wymogów na kontrole.
- **Specjalista ds. naruszeń:** ocenia zdarzenie bezpieczeństwa pod kątem „czy to naruszenie podlegające zgłoszeniu", liczy ryzyko dla osób, przygotowuje zgłoszenie do UODO w reżimie 72 godzin.

**Po co rynkowi ta kompetencja.** Każda firma w EU przetwarza dane osobowe i ryzykuje karę do 4% obrotu. UODO i inne organy nakładają realne, wysokie kary (m.in. głośne decyzje wobec dużych platform). Dział zgodności to obowiązkowy koszt prowadzenia biznesu w Europie — stąd stały popyt na ludzi, którzy *rozumieją* RODO operacyjnie, a nie tylko cytują artykuły.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Projekty na tych poziomach są **dokumentowo-analityczne** (analiza, rejestr, ocena, raport), nie kodowe — to odpowiada realnej pracy juniora zgodności.

### L1 — Fundamenty: rozpoznanie danych i podstawy prawnej (3–6 h)

**Zakres wiedzy/umiejętności:**
- Co jest, a co nie jest **daną osobową** (i daną szczególną — art. 9): rozpoznanie w realnym zbiorze pól, które identyfikują osobę bezpośrednio lub pośrednio (w tym adres IP — Breyer C-582/14, identyfikatory cookie).
- **Sześć zasad przetwarzania (art. 5)** — umieć przypisać konkretne działanie firmy do zasady, którą realizuje albo łamie.
- **Sześć podstaw prawnych (art. 6)** — dobrać właściwą podstawę do konkretnego celu przetwarzania (np. lista płac → obowiązek prawny; newsletter → zgoda) i uzasadnić, dlaczego ta, a nie inna.
- Rozróżnienie ról: **administrator vs podmiot przetwarzający** na prostym przykładzie (firma + jej dostawca poczty w chmurze).

**Co student musi UMIEĆ ZROBIĆ:** wziąć opis fikcyjnego procesu biznesowego (np. sklep internetowy zbierający zamówienia) i sporządzić analizę: jakie dane osobowe występują, jaka podstawa prawna dla każdego celu, kto jest administratorem a kto przetwarzającym, którą zasadę z art. 5 proces realizuje, a gdzie jest ryzyko jej złamania.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **„Zgoda" to najsłabsza, nie najmocniejsza podstawa.** Amator na wszystko bierze zgodę. Zawodowiec wie, że zgodę można wycofać (i wtedy trzeba przestać przetwarzać), więc do umowy czy obowiązku prawnego zgoda jest błędem — wybiera się podstawę adekwatną do celu.
- **Dane „anonimowe" rzadko są anonimowe.** Usunięcie imienia to nie anonimizacja, jeśli da się osobę odtworzyć z innych pól. Pseudonimizacja (np. zamiana na identyfikator) to wciąż dane osobowe — różnica, na której amator się wykłada.

### L2 — Zastosowanie: rejestr czynności, prawa osób, ocena naruszenia (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Rejestr czynności przetwarzania (RoPA, art. 30):** zbudowanie wpisu rejestru dla procesu — cel, kategorie danych, kategorie osób, odbiorcy, terminy usunięcia (retencja), opis środków bezpieczeństwa. To podstawowy dokument rozliczalności.
- **Obsługa wniosku osoby (art. 15–22):** przyjęcie żądania dostępu / usunięcia / sprzeciwu, ustalenie, czy i w jakim zakresie je zrealizować (są wyjątki — np. obowiązek prawny przechowywania faktur blokuje „usunięcie"), dotrzymanie terminu.
- **Ocena, czy zdarzenie to naruszenie podlegające zgłoszeniu (art. 33):** rozróżnienie incydentu bezpieczeństwa od naruszenia ochrony danych, wstępna ocena ryzyka dla osób, decyzja „zgłaszać do UODO czy nie" i dlaczego — z zegarem 72 godzin.
- **Umowa powierzenia (art. 28):** rozpoznanie, kiedy jest wymagana, i jakie minimalne elementy musi zawierać, gdy firma korzysta z dostawcy (np. chmury).

**Co student musi UMIEĆ ZROBIĆ:** sporządzić poprawny wpis do rejestru czynności dla zadanego procesu; rozpatrzyć fikcyjny wniosek osoby z uzasadnieniem decyzji i terminem; ocenić zadane zdarzenie jako „naruszenie do zgłoszenia / nie" z analizą ryzyka i zegarem 72 h.

**Profesjonalne niuanse:**
- **72 godziny liczą się od *stwierdzenia* naruszenia, nie od jego wystąpienia — ale „nie wiedzieliśmy" nie chroni.** Firma musi mieć proces wykrywania; brak wykrycia to osobny problem. Zegar to nie wymówka do zwłoki — to twardy termin, po którym zgłoszenie musi zawierać wyjaśnienie opóźnienia.
- **Nie każdy incydent to naruszenie, i nie każde naruszenie się zgłasza.** Zaszyfrowany, skradziony laptop, do którego nikt nie ma klucza, może nie rodzić ryzyka. Ocena ryzyka dla *osób* (nie dla firmy) decyduje — to rzemiosło, nie automat.
- **Prawo do usunięcia ma wyjątki.** „Usuńcie wszystko o mnie" nie znaczy „usuńcie fakturę", którą prawo każe trzymać 5 lat. Junior, który usuwa wszystko na żądanie, naraża firmę na złamanie *innego* przepisu.

### L3 — Portfolio: ocena skutków (DPIA) i mapowanie wymogu na kontrolę (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Przeprowadzenie oceny skutków dla ochrony danych (DPIA, art. 35):** opis przetwarzania, ocena konieczności i proporcjonalności, identyfikacja i ocena ryzyka dla osób, dobór środków je ograniczających. To flagowy dokument seniora zgodności — junior, który umie zrobić DPIA, jest gotów do pracy.
- **Mapowanie wymogu prawnego (art. 32) na konkretną kontrolę techniczną/organizacyjną:** przełożenie „odpowiednie środki bezpieczeństwa" na listę realnych kontroli (szyfrowanie, kontrola dostępu wg najmniejszych uprawnień, kopie zapasowe, dziennik zdarzeń) z uzasadnieniem proporcjonalności do ryzyka.
- **Ocena dostawcy / podmiotu przetwarzającego:** analiza umowy powierzenia i ryzyka, w tym **transfery danych poza EOG** (Europejski Obszar Gospodarczy) — po wyroku **Schrems II** (TSUE C-311/18, który unieważnił Tarczę Prywatności UE–USA) trzeba ocenić, czy dane wywożone np. do USA są chronione (standardowe klauzule umowne + ocena skutków transferu).
- **Dossier naruszenia 72 h:** kompletne zgłoszenie do UODO — opis naruszenia, kategorie i przybliżona liczba osób, możliwe skutki, podjęte środki — plus decyzja o zawiadomieniu osób (art. 34).
- **Privacy by design / by default (art. 25):** wykazanie, jak ochrona danych jest wbudowana w projekt od początku, a nie doklejona na końcu.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełną DPIA dla zadanego, ryzykownego przetwarzania (np. monitoring pracowników albo profilowanie klientów); zmapować wymogi art. 32 na konkretne kontrole z uzasadnieniem; ocenić fikcyjnego dostawcę z transferem do USA; złożyć kompletne dossier naruszenia w reżimie 72 h. To poziom „portfolio na rozmowę o pracę w dziale zgodności".

**Profesjonalne niuanse:**
- **DPIA to nie formularz do odhaczenia — to analiza ryzyka *dla osób*, nie dla firmy.** Amator opisuje, co firma robi. Zawodowiec pyta: „co najgorszego stanie się *człowiekowi*, jeśli to pójdzie źle" — i pod to dobiera środki. DPIA, która nie obniża realnie ryzyka, jest bezwartościowa, choćby była ładnie sformatowana.
- **Mapowanie wymogu na kontrolę to most między prawnikiem a inżynierem.** „Odpowiednie środki" nie znaczy „wszystkie możliwe" ani „najtańsze". Proporcjonalność do ryzyka i kosztu jest częścią prawa (art. 32 mówi wprost o „stanie wiedzy technicznej i kosztach"). Junior, który tego nie rozumie, albo przepala budżet, albo zostawia dziurę.
- **Transfer poza EOG to pułapka, o której biznes zapomina.** Użycie amerykańskiej chmury czy narzędzia analitycznego to transfer danych — wymaga podstawy transferu i często oceny skutków. Schrems II zmienił reguły gry; junior musi wiedzieć, że „bierzemy popularne narzędzie z USA" nie jest neutralne.

### L4 — Realny przypadek profesjonalny: DPIA i mapowanie kontroli w warunkach firmy finansowej (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *niejednoznacznego, realnego* opisu przetwarzania od biznesu (sprzeczne cele, niejasna podstawa, dostawcy w kilku krajach) i doprowadzenie go do kompletnej, obronnej przed organem DPIA — to codzienność, nie czysty przypadek z podręcznika.
- Współpraca z inżynierem przy doborze kontroli: junior nie projektuje szyfrowania, ale musi umieć *rozmawiać* z zespołem technicznym tak, by wymóg prawny zamienił się w realne ustawienie systemu — i odróżnić „inżynier mówi, że się nie da" od „się nie chce".
- **Benchmark:** dokument studenta (DPIA, mapa kontroli, ocena dostawcy) zestawiony z tym, co na tym samym przypadku przygotował praktykujący IOD / specjalista zgodności.

### L5 — Biegłość: program ochrony danych i rozliczalność w skali organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Program rozliczalności (accountability) dla całej organizacji:** spójny zestaw rejestrów, polityk, procedur naruszeń i przeglądów, który *udowadnia* zgodność przed organem — nie pojedynczy dokument, lecz system.
- **Zgodność formalna vs skuteczna ochrona (sedno, §4):** umiejętność wskazania, gdzie firma „ma papier", ale realnie nie chroni danych — i odwrotnie, gdzie chroni dobrze, ale brakuje dowodu. Senior optymalizuje *jedno i drugie*.
- **Ekonomia i proporcjonalność zgodności:** decyzja, gdzie włożyć wysiłek (procesy wysokiego ryzyka), a gdzie wystarczy minimum — bo zgodność „wszystkiego po równo" przepala budżet i topi sygnał.
- **Benchmark** wobec rozwiązania praktykującego IOD: nie tylko „czy zgodne na papierze", lecz „czy obroni się przed kontrolą UODO i czy realnie chroni ludzi".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zgodność formalna ≠ skuteczna ochrona.** Najgroźniejsze złudzenie w zawodzie. Firma może mieć komplet polityk, zgód i klauzul, a jednocześnie trzymać dane bez zabezpieczeń i przetwarzać je bezprawnie. Odwrotnie: dobre zabezpieczenia bez podstawy prawnej to wciąż naruszenie. Zawodowiec rozdziela „mamy dokument" od „realnie chronimy" i pracuje nad obydwoma. Amator zbiera papiery i czuje się bezpieczny.

2. **Bezpieczeństwo to *podzbiór* prywatności, nie to samo.** Art. 32 (bezpieczeństwo) to jeden z wielu wymogów RODO. Dane mogą być doskonale zaszyfrowane i nadal przetwarzane niezgodnie z prawem — bez podstawy (art. 6), w nadmiarze (art. 5 minimalizacja), za długo (retencja) albo bez poinformowania osób (art. 13–14). To odpowiedź na pytanie „związek bezpieczeństwa z prywatnością": bezpieczeństwo jest konieczne, ale nie wystarczające.

3. **Wybór podstawy prawnej to decyzja, nie formalność.** Zgoda jest odwoływalna i wymaga dobrowolności; prawnie uzasadniony interes wymaga testu równowagi (czy interes firmy nie przeważa nad prawami osoby); obowiązek prawny wymaga wskazania konkretnego przepisu. Zła podstawa wywraca całe przetwarzanie. Amator bierze zgodę na wszystko; zawodowiec dobiera podstawę do celu.

4. **Minimalizacja danych to broń, nie ograniczenie.** Im mniej danych firma zbiera i trzyma, tym mniejsze ryzyko, mniejsza kara przy wycieku i mniej pracy przy wnioskach osób. Zawodowiec pyta „czego *nie* zbierać"; amator zbiera „na wszelki wypadek" i powiększa ryzyko.

5. **Retencja to decyzja prawno-kosztowa, nie techniczna.** Jak długo trzymać dane? Za krótko → łamiesz inny obowiązek (faktury, akta pracownicze mają ustawowe terminy). Za długo → łamiesz zasadę ograniczenia przechowywania i powiększasz pole rażenia przy wycieku. To ten sam typ napięcia, co retencja logów w SIEM — i często dotyczy tych samych danych.

6. **72 godziny to proces, nie heroiczny zryw.** Zgłoszenie naruszenia w 72 h da się dotrzymać tylko, jeśli firma *wcześniej* ma procedurę: kto ocenia, kto decyduje, kto pisze do UODO. Junior, który dopiero w trakcie incydentu szuka, „gdzie się to zgłasza", już przegrał. Tu zgodność spotyka się z reagowaniem na incydenty (Incident Response) i z SIEM (wykrycie naruszenia).

7. **Mapowanie wymogu prawnego na kontrolę techniczną to rdzeń zawodu.** „Odpowiednie środki techniczne i organizacyjne" (art. 32) to świadomy unijny zabieg — prawo nie chce się starzeć razem z technologią. Cena tej elastyczności: ktoś musi przełożyć ogólny wymóg na konkretne ustawienie. To robi specjalista zgodności *razem* z inżynierem — i to jest najczęściej testowana umiejętność na rozmowie.

8. **Współpraca prawnik ↔ inżynier ↔ biznes to istota roli.** Junior zgodności nie jest ani prawnikiem (nie wydaje opinii prawnych), ani inżynierem (nie konfiguruje systemów). Jest tłumaczem między nimi i biznesem. Wartość roli tkwi w tym, że rozumie wszystkie trzy języki na tyle, by je zestawić. Czysto prawnicze albo czysto techniczne podejście zawodzi.

9. **Adres IP i identyfikatory bywają danymi osobowymi (Breyer C-582/14).** To zaskakuje techników: „to tylko IP, nie ma nazwiska". TSUE orzekł inaczej. Konsekwencja: logi, pliki cookie, identyfikatory urządzeń wpadają pod RODO. To bezpośredni most do pracy analityka SIEM (logi = często dane osobowe → maskowanie, minimalizacja).

10. **Transfer poza EOG to ukryte ryzyko każdego narzędzia z USA (Schrems II, C-311/18).** Popularna chmura, narzędzie analityczne czy do e-mail marketingu często wysyła dane do USA. To transfer wymagający podstawy i oceny. Amator instaluje „bo wszyscy używają"; zawodowiec sprawdza, gdzie fizycznie lądują dane.

11. **Pseudonimizacja ≠ anonimizacja.** Pseudonimizacja (zamiana identyfikatora, dający się cofnąć) to wciąż dane osobowe pod RODO — tyle że bezpieczniejsze. Anonimizacja (nieodwracalna) wyprowadza dane spod RODO. Mylenie tych dwóch to klasyczny błąd, który wywraca DPIA i ocenę ryzyka.

12. **Rozliczalność znaczy „udowodnij", nie „twierdź".** Art. 5 ust. 2: administrator musi *wykazać* zgodność. W praktyce: brak dokumentu = brak zgodności, choćby firma działała poprawnie. Junior musi rozumieć, że niespisany proces, z punktu widzenia organu, nie istnieje — to ta sama logika, co „reguła SIEM, której nikt nie udokumentował, nie istnieje".

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty RODO muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania juniora zgodności / ochrony danych. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Wszystkie projekty są **dokumentowo-analityczne** (analiza, rejestr, ocena, dossier) — bez kodu, bez prod.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Mapa danych osobowych w procesie** — rozpoznanie danych (w tym IP/cookie), przypisanie zasad art. 5, ról administrator/przetwarzający dla zadanego procesu | Dane osobowe, zasady art. 5, role | #2, #9 |
| P2 | L1 | **Dobór podstawy prawnej** — dla kilku celów przetwarzania dobrać i uzasadnić podstawę z art. 6, wskazać błąd „zgody na wszystko" | Podstawy art. 6, dane szczególne art. 9 | #3 |
| P3 | L2 | **Rejestr czynności przetwarzania (RoPA)** — kompletny wpis art. 30 z retencją i kategoriami | Rejestr art. 30, minimalizacja, retencja | #4, #5, #12 |
| P4 | L2 | **Obsługa wniosku osoby** — rozpatrzenie żądania dostępu/usunięcia/sprzeciwu z wyjątkami i terminem | Prawa osób art. 12–22 | #1, #5 |
| P5 | L2 | **Ocena: naruszenie czy nie + zegar 72 h** — klasyfikacja zdarzenia, analiza ryzyka dla osób, decyzja o zgłoszeniu | Ocena naruszenia art. 33, ryzyko | #6 |
| P6 | L3 | **Pełna ocena skutków (DPIA)** — dla ryzykownego przetwarzania (monitoring/profilowanie), z realnym ograniczaniem ryzyka | DPIA art. 35, privacy by design art. 25 | #1, #4, #7 |
| P7 | L3 | **Mapowanie art. 32 na kontrole** — przełożenie „odpowiednich środków" na listę kontroli z proporcjonalnością | Mapowanie wymóg→kontrola | #2, #7, #8 |
| P8 | L3 | **Ocena dostawcy + transfer poza EOG** — analiza umowy powierzenia art. 28 i transferu do USA po Schrems II | Ocena processora, transfery | #10, #11 |
| P9 | L3 | **Dossier naruszenia 72 h** — kompletne zgłoszenie do UODO + decyzja o zawiadomieniu osób (art. 34) | Zgłoszenie art. 33–34 w pełni | #6, #12 |
| (P10–P11) | L4–L5 | **ZAPOWIEDŹ** — realny niejednoznaczny przypadek finansowy (DPIA + mapa kontroli z inżynierem), program rozliczalności i ekonomia zgodności; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #1, #7, #8 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną (tu w wariancie „pracujesz na danych fikcyjnych/syntetycznych — nigdy na danych realnych osób"), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (mapa danych) → P2 (podstawa) → P3 (rejestr) → P4 (prawa osób) → P5 (ocena naruszenia) → P6 (DPIA) → P7 (mapowanie kontroli) → P8 (dostawca/transfer) → P9 (dossier 72 h). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

> **Uwaga RODO-w-projektach (krytyczna dla Ryana):** każdy projekt RODO operuje wyłącznie na **danych fikcyjnych lub syntetycznych** (wymyślone persony, generator typu faker). Student NIGDY nie przetwarza danych realnych osób trzecich w ramach ćwiczenia — bo robienie „ćwiczeniowej DPIA" na cudzych prawdziwych danych samo w sobie byłoby przetwarzaniem bez podstawy. To paradoks domeny: projekt o RODO musi sam być zgodny z RODO. Klauzula w `theory_md` to egzekwuje.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

RODO **nie ma sensu** bez wcześniej opanowanych fundamentów zarządzania ryzykiem i podstaw bezpieczeństwa. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Pojęcie ryzyka** (liść `Risk Management`) — RODO jest oparte na podejściu opartym na ryzyku (DPIA, środki „odpowiednie do ryzyka"). Bez rozumienia, czym jest ryzyko (prawdopodobieństwo × skutek), student nie zrobi DPIA. **Wymagane przed L3 (DPIA), pomocne od L1.**
2. **Podstawy bezpieczeństwa informacji** — pojęcie poufności, integralności, dostępności oraz podstawowych kontroli (szyfrowanie, kontrola dostępu). Częściowo z grupy GRC (`ISO 27001`, `NIST`), częściowo z grup technicznych. **Wymagane przed L3 (mapowanie art. 32 na kontrole).**
3. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (kontrola dostępu wg najmniejszych uprawnień to jeden z głównych środków art. 32). **Pomocne na L3.**
4. **Pojęcie logu i danych w systemach** — most do tego, że logi/IP bywają danymi osobowymi (niuans #9); styk z SIEM. **Pomocne, nie blokujące.**
5. **Klauzula etyczno-prawna i zasada „dane fikcyjne"** — jak w każdym projekcie cyber, tu w wariancie ochrony danych: praca wyłącznie na danych fikcyjnych/syntetycznych, zero re-identyfikacji. **Wymagane od L1.**

**Czego RODO dostarcza jako prerekwizyt/kontekst dla innych liści grupy:** RODO jest wspólnym językiem zgodności dla całej grupy GRC. `DORA` (zgłaszanie incydentów, rejestry, role) korzysta z tych samych pojęć rozliczalności; `ISO 27001` (środki bezpieczeństwa) zazębia się z art. 32; `Risk Management` dostarcza metody, a RODO — kontekst regulacyjny. RODO daje też analitykowi SIEM/SOC ramę prawną pracy na logach (maskowanie IP, minimalizacja, retencja). Dlatego w grupie GRC autorujemy RODO wcześnie.

---

## 7. Źródła (rzetelne, legalne, oficjalne — do akceptacji Ryana)

Wszystkie publiczne i oficjalne; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność, aktualność i poprawność cytowania regulacji.

**Tekst prawa (oficjalne, EUR-Lex i krajowe):**
- RODO — pełny tekst skonsolidowany, Rozporządzenie (UE) 2016/679 (EUR-Lex, wersja polska): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Ustawa z 10 maja 2018 r. o ochronie danych osobowych (polska ustawa uzupełniająca, ISAP): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20180001000

**Wytyczne organów nadzorczych (oficjalne, autorytatywne):**
- UODO — Urząd Ochrony Danych Osobowych (polski organ nadzorczy; poradniki, decyzje, formularz zgłoszenia naruszenia): https://uodo.gov.pl/
- EROD — Europejska Rada Ochrony Danych (ang. EDPB; wytyczne, m.in. do DPIA, naruszeń, podstawy „uzasadniony interes"): https://www.edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_pl
- EROD — wytyczne dot. zgłaszania naruszeń (Guidelines on personal data breach notification): https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012021-examples-regarding-personal-data-breach_en

**Bezpieczeństwo przetwarzania (most prawo↔technika):**
- ENISA — Agencja UE ds. Cyberbezpieczeństwa, wytyczne do środków bezpieczeństwa danych osobowych (art. 32): https://www.enisa.europa.eu/topics/data-protection
- ENISA — „Handbook on Security of Personal Data Processing": https://www.enisa.europa.eu/publications/handbook-on-security-of-personal-data-processing

**Orzecznictwo TSUE (kluczowe wyroki, do klauzul i projektów):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- TSUE, sprawa Schrems II C-311/18 (unieważnienie Tarczy Prywatności UE–USA, transfery danych): https://curia.europa.eu/juris/liste.jsf?num=C-311/18

**Kontekst dla projektów (dane fikcyjne):**
- Generator danych fikcyjnych Faker (do tworzenia syntetycznych person — nigdy danych realnych): https://faker.readthedocs.io/

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne (EUR-Lex, ISAP, UODO, EROD, ENISA, TSUE) — zero źródeł nieautoryzowanych. Trzy punkty do Twojej weryfikacji prawnej: **(1)** czy cytowane numery artykułów i progi (72 h, 20 mln EUR / 4% obrotu) są przedstawione bez uproszczeń wprowadzających w błąd — przejrzyj §2 i §4; **(2)** czy ujęcie wyroków Breyer i Schrems II jest precyzyjne (Breyer — IP daną osobową „w określonych warunkach", nie bezwarunkowo; Schrems II — unieważnił Privacy Shield, ale standardowe klauzule umowne zostały utrzymane z zastrzeżeniem oceny); **(3)** czy zasada „projekt o RODO sam musi być zgodny z RODO — wyłącznie dane fikcyjne" (§5) jest wystarczająco mocno postawiona dla autoringu. Linki do sprawdzenia aktualności przed wejściem do `learning_resources` (UODO i EROD okresowo przebudowują adresy).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej + perspektywa prawnika

Wcieliłam się w dwóch najsurowszych krytyków: dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który ocenia, czy junior po tych projektach realnie chroni dane, oraz **praktykującego prawnika / IOD**, który ocenia, czy treść nie wprowadza w błąd co do prawa. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość (prawnik): research mylił bezpieczeństwo z prywatnością.** Pierwsza wersja sugerowała „RODO = zabezpiecz dane". Prawnik: „to najczęstszy błąd technika — dane idealnie zaszyfrowane, ale zbierane bez podstawy, to nadal naruszenie; zgodność to nie to samo co bezpieczeństwo". **Poprawka:** wyniosłam to do niuansu #2 i wprost rozdzieliłam „bezpieczeństwo jest podzbiorem prywatności" w §2; dodałam, że dane mogą być bezpieczne i bezprawne jednocześnie. To bezpośrednia odpowiedź na soczewkę „związek bezpieczeństwa z prywatnością".

2. **Słabość (CISO): brak mostu prawo → kontrola techniczna.** CISO: „nie potrzebuję juniora, który cytuje art. 32 — potrzebuję kogoś, kto powie inżynierowi, *co* ustawić i dlaczego tyle, nie więcej". **Poprawka:** dodałam projekt P7 (mapowanie art. 32 na kontrole) jako osobny, niuans #7 i #8 (współpraca prawnik↔inżynier), z naciskiem na proporcjonalność do ryzyka i kosztu. To realny rozdzielnik amator↔zawodowiec w tej roli.

3. **Słabość (prawnik): „zgoda na wszystko" i zatarte podstawy prawne.** Prawnik: „90% błędów juniorów to złe dobranie podstawy z art. 6 — zgoda tam, gdzie powinna być umowa albo obowiązek prawny". **Poprawka:** wydzieliłam dobór podstawy do osobnego projektu L1 (P2) i niuansu #3; dodałam, że zgoda jest *najsłabszą*, odwoływalną podstawą — wbrew intuicji amatora.

4. **Słabość (oba): research nie zauważał paradoksu domeny.** Prawnik: „ćwiczenie z DPIA na prawdziwych cudzych danych samo łamie RODO". **Poprawka:** dodałam twardą notę w §5 i prerekwizyt w §6 — wszystkie projekty na danych fikcyjnych/syntetycznych, zero re-identyfikacji; klauzula `theory_md` to egzekwuje. To wyróżnik tej domeny względem SIEM (gdzie dopuszczamy publiczne, zamaskowane zbiory).

5. **Słabość (CISO): naruszenie i 72 h jako wiedza książkowa, nie proces.** CISO: „junior, który w czasie incydentu dopiero szuka, gdzie się zgłasza, jest bezużyteczny — 72 h to proces wykrywania i decyzji, nie termin do zapamiętania". **Poprawka:** dodałam projekt P5 (ocena: naruszenie czy nie) i P9 (pełne dossier), niuans #6, i powiązałam zegar z wykrywaniem (most do SIEM/Incident Response) — naruszenie trzeba najpierw *wykryć*, żeby zdążyć je zgłosić.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin rozwinięty po polsku przy pierwszym użyciu (RODO/GDPR, administrator/controller, podmiot przetwarzający/processor, podstawa prawna, DPIA/ocena skutków, IOD/DPO, RoPA/rejestr czynności, umowa powierzenia, UODO, EROD/EDPB, ENISA, EOG, Schrems II, Breyer, privacy by design, pseudonimizacja vs anonimizacja, minimalizacja, retencja, rozliczalność/accountability). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli juniora zgodności / asystenta IOD, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#9, #11–#12. Niuanse #1 (formalna vs skuteczna w skali), #7, #8, #10 (transfery, ekonomia, program) domkną się w pełni dopiero na L4/L5 (zależność od Ethana/Leo) — research je zapowiada uczciwie, nie zamiata. Świadome zawężenie: to research dla **roli zgodności/ryzyka**, nie dla prawnika ani inżyniera bezpieczeństwa — junior ma *rozumieć i tłumaczyć*, nie wydawać opinii prawnych ani konfigurować systemów. To zgodne z realnym ICP rynku (7 ofert, GRC).

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
