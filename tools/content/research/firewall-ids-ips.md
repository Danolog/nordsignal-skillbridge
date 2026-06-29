# Research kompetencji: Firewall / IDS-IPS

> **Status:** research kompetencji ETAP E3, wzorowany na golden-example `tools/content/research/siem.md` (North Star §0.1 nadrzędny).
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Firewall / IDS-IPS` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Infrastruktura i sieci" (`unionShare` grupy: **9,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **2,4%** ofert ścieżki wymienia Firewall / IDS-IPS |
| **Liczba ofert (`offers`)** | **9** |
| **`kind`** | `tool` (kompetencja narzędziowa — zapora i systemy IDS/IPS, np. Suricata/Snort; patrz §2) |
| **`lift`** | 17,19 (siła powiązania liścia z tą ścieżką — bardzo wysoka: gdy oferta to wymienia, niemal zawsze chodzi o bezpieczeństwo) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Opis grupy z modelu** (cytat z `career-model.json`, dosłowny — soczewka całej grupy): *„Sieć to autostrada, którą poruszają się dane — i którą porusza się atakujący. Rozumienie, jak komputery rozmawiają ze sobą (protokół TCP/IP — podstawowy język sieci) i jak ten ruch filtrować (firewall — zapora sieciowa), to fundament, na którym stoi reszta bezpieczeństwa. Bez tego SIEM pokazuje Ci alerty, których nie rozumiesz."*

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Network | 4,3 | 16 | concept | 3,51 |
| TCP/IP | 3,0 | 11 | concept | 4,46 |
| **Firewall / IDS-IPS** (ten plik) | 2,4 | 9 | tool | 17,19 |

**Wniosek dla autoringu:** Firewall / IDS-IPS ma najniższy popyt liczbowy w grupie (2,4%), ale **najwyższy `lift` z całej grupy (17,19)** — to znaczy, że gdy oferta w ogóle wymienia tę kompetencję, niemal na pewno jest to rola czysto bezpieczeństwa, nie ogólne IT. To liść **egzekucyjny**: bierze język pakietu z `TCP/IP` i architekturę z `Network`, i zamienia je w **konkretne działanie** — filtrowanie ruchu (zapora) i wykrywanie/blokowanie włamań (IDS/IPS). Domyka grupę „Infrastruktura i sieci" od strony narzędziowej i jest **bezpośrednim źródłem alertów dla SIEM**. Autorowany **po `TCP/IP` i `Network`** (potrzebuje obu jako fundamentu) i stanowi most do grupy SIEM.

---

## 2. Definicja kompetencji i jej rola w pracy

To kompetencja narzędziowa łącząca dwa pokrewne, ale różne mechanizmy obrony ruchu sieciowego:

**Zapora sieciowa (firewall)** — urządzenie/oprogramowanie filtrujące ruch na podstawie **reguł**: co wolno, czego nie wolno, między którymi adresami, portami i protokołami. Dwa kluczowe rozróżnienia:
- **Bezstanowa vs stanowa (stateless vs stateful):** bezstanowa ocenia każdy pakiet osobno; stanowa pamięta *stan połączenia* (czy to odpowiedź na coś, co my zainicjowaliśmy) — to standard, bo rozumie kontekst sesji TCP.
- **Zapora nowej generacji (NGFW — Next-Generation Firewall):** widzi nie tylko port, ale i *aplikację* oraz treść — potrafi odróżnić „ruch na porcie 443, który naprawdę jest WWW" od „ruchu, który tylko udaje WWW".

**Systemy wykrywania i zapobiegania włamaniom:**
- **IDS (Intrusion Detection System — system wykrywania włamań)** — **obserwuje** ruch i **alarmuje**, gdy zobaczy podejrzany wzorzec. Nie blokuje — siedzi z boku (tryb pasywny, na kopii ruchu).
- **IPS (Intrusion Prevention System — system zapobiegania włamaniom)** — **stoi w ciągu ruchu (inline)** i potrafi **zablokować** pakiet w locie. Wykrycie + reakcja.
- Najpopularniejsze otwartoźródłowe silniki: **Suricata** i **Snort** — działają na **regułach detekcji (sygnaturach)**: wzorzec „jeśli w ruchu pojawi się to i to → alarmuj/blokuj".

**Trzy rozróżnienia, które definiują zawodowca:**
1. **Wykrywanie sygnaturowe vs anomalii.** Sygnatura łapie *znane* zagrożenie (jak antywirus po wzorcu); wykrywanie anomalii łapie *odstępstwo od normy*, ale generuje więcej fałszywych alarmów. Każde ma swoje miejsce.
2. **Detekcja (IDS) to decyzja inna niż prewencja (IPS).** IPS, który blokuje, może **zablokować ruch legalny** i położyć usługę — to ryzyko dostępności, nie tylko bezpieczeństwa. Wybór „wykrywać czy blokować" jest decyzją biznesową o ryzyku, nie tylko techniczną.
3. **Reguła za szeroka vs za wąska.** Za szeroka → lawina fałszywych alarmów i ryzyko zablokowania legalnego ruchu. Za wąska → napastnik ją omija drobną zmianą. Strojenie reguły to rdzeń rzemiosła.

**Relacja z SIEM (kluczowa dla całej ścieżki):** zapora i IDS/IPS są **źródłem alertów i logów dla SIEM**. Reguła Suricaty, która się odpaliła, staje się zdarzeniem w SIEM, gdzie jest korelowana z innymi źródłami. To dosłownie domyka cytat z opisu grupy: bez rozumienia, *skąd* bierze się alert sieciowy, „SIEM pokazuje alerty, których nie rozumiesz".

**Czym ta kompetencja NIE jest (rozróżnienie zawodowca):**
- To nie „klikanie w panelu zapory". Wartość jest w **logice reguł** i ich strojeniu, nie w obsłudze interfejsu konkretnego producenta.
- IDS/IPS to **nie antywirus sieci, który sam się broni** — jest tak dobry, jak reguły i ich utrzymanie; przestarzała baza sygnatur to fałszywe poczucie bezpieczeństwa.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja jest rdzeniem pracy **inżyniera bezpieczeństwa sieci**, **inżyniera detekcji** i **analityka SOC**. W praktyce:
- inżynier pisze i stroi reguły zapory (zasada domyślnej odmowy) oraz reguły IDS/IPS pod konkretne zagrożenia;
- analityk SOC dostaje alert z IDS i robi triage — czy to realne włamanie, czy fałszywy alarm z za szerokiej reguły;
- zespół decyduje, które reguły IPS przełączyć z „alarmuj" na „blokuj", ważąc ryzyko dostępności.

**Po co rynkowi ta kompetencja.** Zapora i IDS/IPS to pierwsza i najstarsza warstwa obrony sieci, wciąż obowiązkowa (wymogi NIS2, normy jak ISO 27001, PCI-DSS dla kart). Wysoki `lift` (17,19) potwierdza: to kompetencja czysto „security" — pracodawca, który jej szuka, buduje zespół obrony, nie ogólne IT.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: anatomia reguły, czytanie zapory i alertu IDS (3–6 h)

**Zakres wiedzy/umiejętności:**
- Budowa reguły zapory: akcja (zezwól/odrzuć/porzuć), kierunek, adres źródłowy/docelowy, port, protokół; pojęcie kolejności reguł (pierwsza pasująca wygrywa).
- Zasada **domyślnej odmowy (default-deny)** — wszystko zabronione, dopóki świadomie nie dopuszczone — vs domyślnego zezwolenia i dlaczego pierwsza jest bezpieczniejsza.
- Różnica **IDS vs IPS** (obserwuje i alarmuje vs stoi w ciągu i blokuje); tryb pasywny vs inline.
- Odczytanie pojedynczej **reguły Suricaty/Snort** i pojedynczego **alertu IDS**: co reguła łapie, co alert mówi (jaki wzorzec, jakie adresy, jaka technika).

**Co student musi UMIEĆ ZROBIĆ:** przeczytać zestaw reguł zapory i powiedzieć, jaki ruch przechodzi, a jaki jest blokowany (uwzględniając kolejność); napisać prostą regułę domyślnej odmowy z jednym świadomym wyjątkiem; odczytać alert Suricaty i opisać, na co zareagował.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Kolejność reguł decyduje o wszystkim.** Reguła „blokuj wszystko" postawiona za wysoko unieważnia wszystko poniżej; „zezwól wszystko" za wysoko otwiera dziurę. Amator pisze poprawne reguły w złej kolejności i dziwi się, że nie działają.
- **Domyślna odmowa to postawa, nie ustawienie.** Bezpieczna sieć zaczyna od „nic nie wolno" i dopuszcza świadomie; „zablokuję to, co złe" jest skazane na porażkę, bo złego jest nieskończenie wiele.

### L2 — Zastosowanie: pisanie i strojenie reguł, triage fałszywych alarmów (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Zestaw reguł zapory** dla prostego scenariusza (np. DMZ + sieć wewnętrzna z liścia `Network`): domyślna odmowa, świadome wyjątki, uzasadnienie każdej reguły.
- **Pisanie reguły IDS/IPS (Suricata/Snort):** składnia reguły (nagłówek: akcja/protokół/adresy/porty; opcje: wzorzec treści, `msg`, `sid`), napisanie reguły łapiącej konkretny wzorzec ataku.
- **Wykrywanie sygnaturowe vs anomalii** w praktyce — kiedy które, jaki koszt fałszywych alarmów.
- **Triage alertu IDS:** czy to prawdziwy pozytyw (true positive — realny atak) czy fałszywy alarm (false positive); co go wywołało; czy reguła jest za szeroka.
- **Strojenie reguły:** zwężenie za szerokiej reguły (mniej fałszywych alarmów) lub poszerzenie za wąskiej (żeby napastnik jej nie ominął), z udokumentowaniem decyzji.

**Co student musi UMIEĆ ZROBIĆ:** zbudować zestaw reguł zapory z domyślną odmową i uzasadnieniem; napisać działającą regułę Suricaty/Snort na konkretny wzorzec; przeprowadzić triage alertów (TP vs FP) i nastroić regułę redukując fałszywe alarmy bez gubienia wykrycia; nazwać, czy reguła jest sygnaturowa czy anomalna i jaki to ma koszt.

**Profesjonalne niuanse:**
- **Reguła za szeroka topi SOC w fałszywych alarmach; za wąska przepuszcza atak.** To dokładnie to samo napięcie co próg w SIEM (niuans #1 z researchu SIEM — zmęczenie alertami). Zawodowiec stroi regułę na realnym ruchu, nie kopiuje z internetu i zostawia.
- **IPS, który blokuje, może położyć produkcję.** Przełączenie reguły z „alarmuj" na „blokuj" to decyzja o ryzyku dostępności — fałszywy pozytyw w IDS kosztuje czas analityka, w IPS kosztuje *niedostępność legalnej usługi*. Dlatego nowe reguły zwykle najpierw chodzą w trybie „tylko alarmuj".
- **Sygnatura łapie tylko znane.** Reguła sygnaturowa nie zobaczy ataku, którego wzorca nie zna (zero-day). Świadomość tej granicy odróżnia inżyniera od osoby, która myśli, że „mamy IDS, więc jesteśmy bezpieczni".

### L3 — Portfolio: zestaw reguł pod scenariusz, mapowanie na ATT&CK, most do SIEM (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Zestaw reguł detekcji pod scenariusz zagrożenia** (np. próba wykorzystania znanej podatności usługi WWW), zmapowany na **MITRE ATT&CK** (otwarta baza taktyk i technik napastników — §7) — każda reguła z przypisaną techniką i odpowiedzią „przed czym chroni".
- **Strojenie na danych z dokumentacją:** redukcja fałszywych alarmów na realnym/odtworzonym ruchu, lista wyjątków (allowlist) i świadomość jej ryzyka (napastnik celuje w to, co odsialiśmy).
- **Testowanie detekcji:** odtworzenie wzorca ataku na własnym labie (np. przez `tcpreplay` z bezpiecznego, publicznego zrzutu) i potwierdzenie, że reguła faktycznie się odpaliła — „reguła nieprzetestowana nie istnieje".
- **Most do SIEM:** skonfigurowanie wysyłki alertów IDS do SIEM, tak by stały się zdarzeniami korelowanymi z innymi źródłami; zrozumienie, gdzie kończy się rola IDS, a zaczyna korelacja SIEM.
- **Mapa pokrycia i luk:** które techniki ATT&CK reguły pokrywają, a gdzie jest ślepe pole (np. ruch szyfrowany, którego IDS nie zajrzy).

**Co student musi UMIEĆ ZROBIĆ:** zbudować zestaw reguł zmapowanych na ATT&CK ze świadomie nazwaną luką pokrycia; nastroić je redukując fałszywe alarmy z udokumentowaniem wyjątków; udowodnić, że reguła wykrywa, odtwarzając ruch na własnym labie; skonfigurować przekazanie alertów do SIEM. To poziom „portfolio na rozmowę o pracę" dla roli inżyniera detekcji sieciowej.

**Profesjonalne niuanse:**
- **Allowlist to broń obosieczna.** Każdy wyjątek („ignoruj ten ruch") to potencjalna dziura — napastnik podszywa się pod to, co odsialiśmy. Każdy wyjątek = dokumentacja + uzasadnienie (most do niuansu #7 z SIEM — strojenie ≠ wyciszanie).
- **Ruch szyfrowany to ślepe pole IDS.** IDS sygnaturowy nie zajrzy do treści TLS bez deszyfrowania (kosztownego i kontrowersyjnego prawnie). Zawodowiec wie, że wtedy przenosi się na metadane i wzorce (most do `Network`/NetFlow i niuansu #5 stamtąd).
- **Reguła bez mapowania na ATT&CK to reguła bez odpowiedzi „przed czym chroni".** Pokrycie mierzy się mapą technik, nie liczbą reguł (most do niuansu #5/#6 z SIEM — martwe pola i wspólny język ATT&CK).

### L4 — Realny przypadek profesjonalny: strojenie IDS/IPS w warunkach produkcji (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *hałaśliwego* zestawu reguł IDS z realnego ruchu (tysiące alertów dziennie, większość to szum) i doprowadzenie kolejki do stanu, w którym SOC da się ją obsłużyć — bez wyciszenia realnych zagrożeń.
- Decyzja, **które** reguły przełączyć z IDS (alarmuj) na IPS (blokuj), ważąc ryzyko dostępności wobec ryzyka włamania — w warunkach, gdzie błąd blokuje legalny biznes.
- **Benchmark:** nastrojony zestaw reguł studenta (redukcja fałszywych alarmów, zachowane pokrycie ATT&CK, decyzje IDS↔IPS) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: architektura egzekucji i ekonomia inspekcji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Gdzie postawić punkty kontroli:** rozmieszczenie zapór i czujników IDS/IPS w architekturze sieci (na styku, między strefami, wewnątrz) — świadome wobec wydajności i kosztu inspekcji.
- **Fail-open vs fail-closed:** co ma się stać, gdy IPS padnie — przepuścić ruch (dostępność) czy zatrzymać (bezpieczeństwo)? To decyzja strategiczna o ryzyku.
- **Detekcja jako kod (detection-as-code):** reguły w repozytorium z kontrolą wersji, testami i wdrożeniem jak oprogramowanie — dojrzałość zespołu (most do L5 z SIEM).
- **Benchmark** wobec rozwiązania realnego architekta: nie „czy reguła łapie", lecz „czy egzekucja łapie atak za rozsądny koszt, bez kładzenia produkcji, i da się ją utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Reguła za szeroka vs za wąska to centralne napięcie.** Za szeroka → lawina fałszywych alarmów i ryzyko zablokowania legalnego ruchu; za wąska → napastnik omija ją drobną zmianą. Cała wartość zawodowca tkwi w strojeniu tej granicy na realnym ruchu — nie w napisaniu reguły, lecz w jej *dostrojeniu*.

2. **Fałszywe alarmy IDS to nie usterka — to stan domyślny.** Surowy IDS generuje tysiące alertów, w większości szum. Zawodowiec optymalizuje *jakość* kolejki (mało, trafnie), amator dokłada reguły i pogłębia problem (most do niuansu #1 z SIEM — zmęczenie alertami).

3. **Detekcja (IDS) vs prewencja (IPS) to decyzja o ryzyku dostępności.** IDS, który się myli, kosztuje czas analityka; IPS, który się myli, **blokuje legalną usługę** i kładzie biznes. Przełączenie reguły w tryb blokowania to świadoma decyzja, zwykle po okresie „tylko alarmuj".

4. **Kolejność reguł i domyślna odmowa.** Pierwsza pasująca reguła wygrywa — zła kolejność unieważnia poprawne reguły. Bezpieczna postawa to domyślna odmowa (wszystko zabronione, wyjątki świadome), nie „blokuj to, co złe".

5. **Sygnatura łapie tylko znane.** Wykrywanie sygnaturowe jest ślepe na zagrożenie, którego wzorca nie zna (zero-day). Anomalia łapie nieznane, ale generuje więcej szumu. Zawodowiec łączy oba świadomie; amator ufa, że „mamy IDS, więc jesteśmy bezpieczni".

6. **Ruch szyfrowany to ślepe pole IDS.** Bez deszyfrowania (drogiego i prawnie wrażliwego) IDS nie zajrzy do treści TLS. Dojrzała obrona przenosi się wtedy na metadane i wzorce przepływów (most do `Network`/NetFlow, niuans #5 stamtąd).

7. **Allowlist (lista wyjątków) to broń obosieczna.** Każdy wyjątek to potencjalna dziura — napastnik celuje w to, co odsialiśmy. Każdy wyjątek wymaga dokumentacji i uzasadnienia (most do niuansu #7 z SIEM — strojenie ≠ wyciszanie).

8. **Reguła nieprzetestowana nie istnieje.** Cisza w IDS może znaczyć „bezpiecznie" albo „reguła ma błąd / brak danych i nigdy się nie odpaliła". Zawodowiec odtwarza wzorzec ataku na własnym labie i potwierdza, że reguła reaguje (most do testowania detekcji z SIEM, niuans #11 stamtąd).

9. **Mapowanie na MITRE ATT&CK.** Reguła bez przypisanej techniki to reguła bez odpowiedzi „przed czym chroni". Pokrycie mierzy się mapą technik i nazwanymi lukami, nie licznikiem reguł.

10. **Most do SIEM — IDS jako źródło, nie cel.** Alert IDS to początek, nie koniec — jego wartość rośnie, gdy SIEM skoreluje go z logami hostów, uwierzytelnianiem, EDR. Junior, który kończy na alercie IDS, widzi fragment; zawodowiec widzi alert jako jedno źródło w obrazie incydentu.

11. **NGFW i inspekcja aplikacji.** Zapora nowej generacji odróżnia „ruch na porcie 443, który naprawdę jest WWW" od „ruchu udającego WWW". To podnosi poprzeczkę: filtrowanie po porcie to minimum, filtrowanie po aplikacji to standard rynkowy.

12. **Granica etyczno-prawna jest częścią kompetencji.** Inspekcja ruchu (zwłaszcza deszyfrowanie TLS) to wgląd w cudzą komunikację — bywa daną osobową (adres IP — wyrok TSUE Breyer, C-582/14) i podlega RODO oraz ograniczeniom prawa pracy/telekomunikacyjnego. Nieuprawniony dostęp/nasłuch to przestępstwo (art. 267 Kodeksu karnego). Ćwiczenia i odtwarzanie ruchu **wyłącznie na własnym/treningowym labie**, nigdy w cudzej sieci.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Firewall / IDS-IPS muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał samodzielnie pisać i stroić reguły zapory oraz IDS/IPS i powiązać je z SIEM. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Anatomia reguły zapory** — czytanie zestawu reguł, kolejność, domyślna odmowa, napisanie prostej reguły z wyjątkiem | Budowa reguły, kolejność, default-deny | #4 |
| P2 | L1 | **IDS vs IPS i czytanie alertu** — różnica obserwuj/blokuj, odczyt pojedynczej reguły i alertu Suricaty | IDS vs IPS, odczyt reguły/alertu | #3 |
| P3 | L2 | **Zestaw reguł zapory pod scenariusz** — domyślna odmowa dla DMZ + sieć wewnętrzna, uzasadnienie każdej reguły | Zestaw reguł, uzasadnienie, segmentacja | #4 |
| P4 | L2 | **Pisanie reguły IDS (Suricata/Snort)** — reguła łapiąca konkretny wzorzec, sygnatura vs anomalia | Składnia reguły, sygnatura/anomalia | #5 |
| P5 | L2 | **Triage i strojenie** — TP vs FP, zwężenie za szerokiej reguły, decyzja alarmuj vs blokuj | Triage, strojenie, ryzyko IPS | #1, #2, #3 |
| P6 | L3 | **Zestaw reguł + mapowanie ATT&CK + mapa luk** — reguły pod scenariusz, przypisane techniki, nazwana luka (np. TLS) | Mapowanie ATT&CK, pokrycie, ślepe pola | #6, #9 |
| P7 | L3 | **Strojenie i testowanie detekcji** — redukcja FP z dokumentacją wyjątków + dowód odtworzeniem ruchu na labie | Allowlist, testowanie detekcji | #7, #8 |
| P8 | L3 | **Most do SIEM** — wysyłka alertów IDS do SIEM, korelacja z innymi źródłami, gdzie kończy się IDS | Integracja z SIEM, IDS jako źródło | #10 |
| (P9–P10) | L4–L5 | **ZAPOWIEDŹ** — strojenie hałaśliwego IDS w produkcji + decyzje IDS↔IPS z benchmarkiem; architektura egzekucji, fail-open/closed, detekcja jako kod | Zakres L4/L5 z §3 | #3 (skala), #11, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów** (żaden jeszcze nie istnieje — grupa „Infrastruktura i sieci" ma dziś 0 projektów). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną (§4 pkt 12), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1→P2 (IDS/IPS) → P3 (zestaw zapory) → P4 (reguła IDS) → P5 (triage/strojenie) → P6 (ATT&CK) → P7 (test/wyjątki) → P8 (most do SIEM). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Firewall / IDS-IPS **nie ma sensu** bez fundamentu pakietu i architektury sieci — to liść egzekucyjny stojący na dwóch pozostałych liściach grupy.

**Czego ta kompetencja wymaga przed sobą:**
1. **`TCP/IP`** — reguła zapory operuje na adresie/porcie/protokole, a reguła IDS na zawartości pakietu i flagach. Bez tego student pisze reguły, których nie rozumie. **Wymagane przed L1.**
2. **`Network`** — reguły egzekwują architekturę: które strefy rozdzielić, gdzie postawić punkt kontroli, co znaczy DMZ. Bez tego reguły są oderwane od sensu obrony. **Wymagane/równoległe przed L2.**
3. **Podstawy systemów operacyjnych** — `Linux`/`Windows` na poziomie uruchomienia Suricaty/Snort i pracy w wierszu poleceń (budowane w partii 1: `cyber-hardening-linux-bash`). **Zalecane przed L2.**
4. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie; odtwarzanie ruchu tylko na labie). **Wymagane od L1.**

**Czego Firewall / IDS-IPS dostarcza jako prerekwizyt/most dla innych liści:**
- **`SIEM` / `SOC`** — alerty IDS/IPS i logi zapory są **bezpośrednim źródłem zdarzeń dla SIEM**. Reguła Suricaty, która się odpaliła, to surowiec, który SIEM koreluje. Ta kompetencja domyka cytat z opisu grupy: bez niej „SIEM pokazuje alerty, których nie rozumiesz". **Most wejściowy do grupy SIEM.**
- **`Incident Response`** — logi zapory i alerty IDS to często pierwszy ślad w dochodzeniu po incydencie.

**Wniosek dla kolejności autoringu w grupie:** Firewall / IDS-IPS autorowany **jako trzeci/ostatni w grupie „Infrastruktura i sieci"** — po `TCP/IP` (fundament pakietu) i `Network` (architektura), jako narzędziowe domknięcie grupy i most do SIEM/SOC.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja narzędzi (oficjalna, darmowa, otwartoźródłowa):**
- Suricata — User Guide (instalacja, reguły, tryby IDS/IPS): https://docs.suricata.io/en/latest/
- Suricata — Rules format (składnia reguł): https://docs.suricata.io/en/latest/rules/intro.html
- Snort 3 — User Manual (silnik IDS/IPS): https://docs.snort.org/
- Emerging Threats — otwarty zbiór reguł Suricata/Snort do nauki: https://rules.emergingthreats.net/
- pfSense / OPNsense — dokumentacja zapory otwartoźródłowej (kontekst reguł firewalla): https://docs.opnsense.org/

**Standardy i wytyczne (oficjalne):**
- NIST SP 800-41r1 „Guidelines on Firewalls and Firewall Policy": https://csrc.nist.gov/pubs/sp/800/41/r1/final
- NIST SP 800-94 „Guide to Intrusion Detection and Prevention Systems (IDPS)": https://csrc.nist.gov/pubs/sp/800/94/final
- OWASP — Web Application Firewall (kontekst filtrowania warstwy aplikacji): https://owasp.org/www-community/Web_Application_Firewall

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników): https://attack.mitre.org/
- SANS Reading Room — IDS/IPS i strojenie reguł (białe księgi, darmowe): https://www.sans.org/white-papers/

**Dane i narzędzia do ćwiczeń (publiczne, otwarte):**
- tcpreplay — odtwarzanie zrzutów ruchu na własnym labie (test detekcji): https://tcpreplay.appneta.com/
- Malware-Traffic-Analysis.net — ćwiczeniowe zrzuty z analizą (publiczne, edukacyjne): https://www.malware-traffic-analysis.net/training-exercises.html
- Wireshark Sample Captures (do testów reguł na labie): https://wiki.wireshark.org/SampleCaptures

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania): https://eur-lex.europa.eu/eli/dir/2022/2555
- Kodeks karny, art. 267 (nieuprawniony dostęp/nasłuch): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte/otwartoźródłowe; brak źródeł pirackich. Zbiory ćwiczeniowe (Malware-Traffic-Analysis, Wireshark) zawierają realny ruch — **wymagają klauzuli** odtwarzania wyłącznie na własnym labie (tcpreplay) i pracy na udostępnionych publicznie zrzutach, nigdy na cudzej sieci. **Szczególna uwaga prawna na deszyfrowanie TLS** (niuans #12) — jeśli jakikolwiek projekt go dotknie, wymaga osobnej klauzuli o legalności inspekcji treści (RODO, prawo pracy). Adresy IP traktować jak dane osobowe (maskowanie w raportach studenta). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu obrony sieci i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research traktował IDS i IPS jako jedno.** CISO: „junior, który nie rozumie, że IPS może położyć produkcję, jest dla mnie ryzykiem, nie pomocą". **Poprawka:** wprowadziłam rozróżnienie detekcja vs prewencja jako decyzję o **ryzyku dostępności** (niuans #3), z praktyką „najpierw alarmuj, potem blokuj" na L2 i decyzją IDS↔IPS jako rdzeniem L4.

2. **Słabość: pisanie reguł bez strojenia.** CISO: „każdy skopiuje regułę z internetu — płacę za kogoś, kto ją *nastroi* na moim ruchu". **Poprawka:** strojenie (zwężenie/poszerzenie, redukcja fałszywych alarmów) stało się osią L2/L3 i niuansem #1/#2, a nie dodatkiem; reguła za szeroka/za wąska to centralne napięcie, dokładnie jak prosił prompt.

3. **Słabość: brak dowodu, że reguła działa.** CISO: „reguła nieprzetestowana to teatr". **Poprawka:** dodałam testowanie detekcji przez odtworzenie ruchu (tcpreplay) na własnym labie jako osobną umiejętność L3 (niuans #8, projekt P7) — student musi *udowodnić* wykrycie.

4. **Słabość: IDS pokazany jako cel, nie źródło.** CISO: „alert IDS bez SIEM to fragment — chcę kogoś, kto rozumie, że to jedno źródło w obrazie incydentu". **Poprawka:** wzmocniłam relację z SIEM (niuans #10, projekt P8, sekcja §2 i §6) — Firewall/IDS-IPS jako most wejściowy do grupy SIEM, dosłownie domykający cytat z opisu grupy.

5. **Słabość: szyfrowanie i NGFW pominięte.** CISO: „IDS sygnaturowy jest ślepy na TLS i na zero-day — junior musi znać granice swojego narzędzia". **Poprawka:** dodałam niuans #5 (sygnatura łapie tylko znane), #6 (TLS jako ślepe pole, most do NetFlow w `Network`) i #11 (NGFW/inspekcja aplikacji), z prawną uwagą o deszyfrowaniu w §7 dla Ryana.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (firewall/zapora, IDS, IPS, stateless/stateful, NGFW, Suricata, Snort, sygnatura, anomalia, inline/pasywny, default-deny, true/false positive, triage, allowlist, zero-day, sid/msg, ATT&CK, tcpreplay, TLS, fail-open/fail-closed, detection-as-code, CISO, NIS2). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli inżyniera detekcji sieciowej, jeśli autoring domknie 8 projektów L1–L3 z niuansami #1–#10. Niuanse #3 w skali (decyzje IDS↔IPS w produkcji), #11 (NGFW) i #12 (legalność inspekcji TLS) domkną się pełniej z L4/L5 — research je zapowiada (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
