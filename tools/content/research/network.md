# Research kompetencji: Network

> **Status:** research kompetencji ETAP E3, wzorowany na golden-example `tools/content/research/siem.md` (North Star §0.1 nadrzędny).
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Network` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Infrastruktura i sieci" (`unionShare` grupy: **9,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **4,3%** ofert ścieżki wymienia Network |
| **Liczba ofert (`offers`)** | **16** |
| **`kind`** | `concept` (kompetencja koncepcyjna — architektura i obrona sieci, nie pojedyncze narzędzie; patrz §2) |
| **`lift`** | 3,51 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Opis grupy z modelu** (cytat z `career-model.json`, dosłowny — soczewka całej grupy): *„Sieć to autostrada, którą poruszają się dane — i którą porusza się atakujący. Rozumienie, jak komputery rozmawiają ze sobą (protokół TCP/IP — podstawowy język sieci) i jak ten ruch filtrować (firewall — zapora sieciowa), to fundament, na którym stoi reszta bezpieczeństwa. Bez tego SIEM pokazuje Ci alerty, których nie rozumiesz."*

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| **Network** (ten plik) | 4,3 | 16 | concept | 3,51 |
| TCP/IP | 3,0 | 11 | concept | 4,46 |
| Firewall / IDS-IPS | 2,4 | 9 | tool | 17,19 |

**Wniosek dla autoringu:** Network ma najwyższy popyt w grupie (4,3%, 16 ofert) i jest **najszerszą koncepcją** spinającą całą grupę: bierze język pakietu z `TCP/IP` i podnosi go do poziomu **architektury obrony** — jak ułożyć sieć, by atak miał trudniej, i jak rozpoznać atak, gdy już jest w środku. To liść „myślenia obrońcy o sieci jako całości": segmentacja, strefy, kontrola ruchu wschód–zachód, telemetria przepływów. Autorowany **po `TCP/IP`** (wymaga rozumienia adresu/portu/protokołu) i **przed/równolegle do `Firewall / IDS-IPS`** (zapora i IDS to narzędzia egzekwujące architekturę opisaną tu).

---

## 2. Definicja kompetencji i jej rola w pracy

**Network (w kontekście bezpieczeństwa — projektowanie i obrona architektury sieci)** to kompetencja patrzenia na sieć **oczami obrońcy**: nie „jak połączyć dwa komputery", lecz „jak ułożyć ruch, żeby napastnik, który wejdzie w jeden punkt, nie dostał całej firmy — i jak go zobaczyć, gdy już jest w środku". To warstwa wyżej niż `TCP/IP` (pojedynczy pakiet/sesja) i warstwa szerzej niż `Firewall / IDS-IPS` (pojedyncze urządzenie filtrujące).

**Cztery filary kompetencji (co student musi rozumieć i umieć zaprojektować):**

1. **Segmentacja (podział sieci na odseparowane części) i strefy.** Płaska sieć (wszystko widzi wszystko) to raj dla napastnika — jedno przejęte urządzenie daje dostęp do całości. Segmentacja dzieli sieć na strefy o różnym zaufaniu, m.in.:
   - **DMZ (Demilitarized Zone — strefa zdemilitaryzowana)** — wydzielony obszar dla usług wystawionych na świat (serwer WWW, poczta), odcięty od sieci wewnętrznej, tak by jego przejęcie nie dawało dostępu do środka.
   - **VLAN (Virtual LAN — wirtualna sieć lokalna)** i podsieci — logiczny podział ruchu.
   - **Mikrosegmentacja / zero trust („nie ufaj, weryfikuj")** — założenie, że żaden ruch nie jest z góry zaufany, nawet wewnątrz sieci.
2. **VPN (Virtual Private Network — wirtualna sieć prywatna; szyfrowany tunel)** — bezpieczny zdalny dostęp do sieci firmy; jednocześnie **częsty cel i wektor ataku** (przejęte konto VPN = napastnik „w środku").
3. **Rozpoznanie ruchu wrogiego.** Umiejętność odróżnienia normalnego ruchu od:
   - **ruchu wschód–zachód (east-west)** — między maszynami *wewnątrz* sieci; tu widać **ruch boczny (lateral movement)** napastnika rozprzestrzeniającego się po przejęciu pierwszego hosta;
   - **ruchu północ–południe (north-south)** — między siecią a światem zewnętrznym; tu widać rozpoznanie z zewnątrz i kanały dowodzenia (C2).
4. **Telemetria sieci, zwłaszcza NetFlow.** **NetFlow** (i pokrewne IPFIX/sFlow) to **metadane przepływów** — zapis „kto z kim, na jakim porcie, ile danych, jak długo", **bez treści pakietu**. Tani i skalowalny sposób widzenia całej sieci, kluczowy tam, gdzie pełne przechwytywanie (PCAP) jest za drogie lub ruch jest zaszyfrowany.

**Czym Network (w tej kompetencji) NIE jest (rozróżnienie zawodowca):**
- To nie administracja sieci / CCNA dla inżyniera utrzymania. Cel jest obronny: **architektura ograniczająca skutki ataku i widoczność umożliwiająca wykrycie**, nie maksymalna przepustowość.
- To nie „postawienie zapory i spokój". Zapora to jedno urządzenie (liść `Firewall / IDS-IPS`); Network to **całościowy projekt ruchu** — gdzie postawić granice i gdzie patrzeć.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja Network jest rdzeniem pracy **architekta bezpieczeństwa sieci**, **analityka SOC** (interpretacja telemetrii przepływów) i **inżyniera detekcji sieciowej (NDR — Network Detection and Response)**. W praktyce:
- architekt projektuje segmentację pod konkretną firmę: co oddzielić, gdzie postawić DMZ, jak ograniczyć ruch wschód–zachód;
- analityk SOC w danych NetFlow szuka ruchu bocznego (host „skanuje" sąsiadów) i kanałów C2 (regularne połączenia na zewnątrz);
- po incydencie zespół odtwarza z przepływów drogę napastnika przez sieć (gdzie wszedł, dokąd się przemieścił).

**Po co rynkowi ta kompetencja.** Większość poważnych włamań nie kończy się na pierwszym przejętym komputerze — napastnik **przemieszcza się bokiem** do cenniejszych systemów. Dobra segmentacja ten ruch ogranicza, a telemetria przepływów pozwala go zobaczyć. Regulacje (NIS2 — dyrektywa o cyberbezpieczeństwie sieci i informacji) wprost oczekują zdolności wykrywania i ograniczania skutków incydentu. Stąd stały popyt (4,3% — najwyższy w grupie).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: topologia, strefy, czytanie przepływu (3–6 h)

**Zakres wiedzy/umiejętności:**
- Podstawowe pojęcia architektury: podsieć i maska (zapis CIDR `/24`), brama (gateway), trasowanie w skrócie, VLAN jako logiczny podział.
- Strefy zaufania: co to DMZ, czym różni się sieć wewnętrzna od strefy publicznej, dlaczego „płaska sieć" jest ryzykowna — na prostym diagramie.
- **Rekord NetFlow:** odczytanie pojedynczego przepływu (adres źródłowy/docelowy, port, protokół, liczba bajtów/pakietów, czas) i powiedzenie, co ten przepływ oznacza.
- Rozróżnienie ruchu wschód–zachód vs północ–południe na diagramie i w prostych danych.

**Co student musi UMIEĆ ZROBIĆ:** wskazać na diagramie strefy i granice zaufania (gdzie jest DMZ, gdzie sieć wewnętrzna); odczytać zestaw rekordów NetFlow i opisać słownie, kto z kim się komunikował; zaklasyfikować ruch jako wschód–zachód lub północ–południe.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Diagram to nie sieć.** Schemat „jak miało być" rzadko odpowiada temu, co faktycznie płynie. Zawodowiec weryfikuje architekturę danymi (NetFlow pokazuje realne połączenia), amator ufa rysunkowi.
- **NetFlow nie ma treści — i to bywa zaletą.** Junior narzeka, że „w przepływie nie widać, co przesłano". Zawodowiec wie, że metadane (ile, jak często, dokąd) wystarczają, by wykryć ruch boczny i C2, a skalują się tam, gdzie PCAP by się udławił (most do niuansu #4 z `TCP/IP` — szyfrowanie jako martwe pole treści).

### L2 — Zastosowanie: projekt segmentacji, rozpoznanie nadużyć w przepływach (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Projekt prostej segmentacji:** podział na strefy (publiczna/DMZ/wewnętrzna), zasada najmniejszego dostępu między strefami (co wolno z czym rozmawiać), uzasadnienie każdej granicy.
- **VPN w praktyce obrońcy:** po co, jakie ryzyka (przejęte konto, brak uwierzytelniania wieloskładnikowego), co logować z dostępu VPN.
- **Rozpoznanie nadużyć w danych przepływów:** skan sieci (jeden host odpytuje wiele adresów/portów), ruch boczny (host nagle łączy się z wieloma sąsiadami), nietypowo duże transfery wychodzące (możliwa eksfiltracja).
- **Linia bazowa ruchu (baseline — normalny obraz):** czym jest „normalny" ruch w danej sieci i dlaczego anomalię definiuje się względem niego, a nie względem poradnika.

**Co student musi UMIEĆ ZROBIĆ:** zaprojektować segmentację dla prostego scenariusza i uzasadnić każdą granicę zaufania; w zbiorze przepływów rozpoznać skan i ruch boczny; opisać, jak bezpiecznie udostępnić usługę przez VPN i co przy tym monitorować.

**Profesjonalne niuanse:**
- **Segmentacja to kompromis, nie maksimum.** Zbyt drobny podział paraliżuje firmę (nic z niczym nie rozmawia) i generuje setki wyjątków, które i tak się otwiera. Zbyt płaski — daje napastnikowi cały dom. Zawodowiec tnie tam, gdzie różnica wartości/zaufania jest realna.
- **VPN przesuwa granicę, nie znosi jej.** Po zalogowaniu do VPN napastnik jest „w środku" — dlatego dojrzała sieć nie ufa VPN bezgranicznie (zero trust) i monitoruje, co konto VPN robi *po* połączeniu.
- **Ruch boczny wygląda jak normalna praca.** Najtrudniejsze do wykrycia, bo używa legalnych protokołów (udostępnianie plików, zdalny pulpit). Sygnałem jest *zmiana wzorca* (host, który nigdy nie gadał z serwerem księgowości, nagle to robi), nie sam protokół.

### L3 — Portfolio: defensywna architektura + wykrywanie ruchu bocznego/C2 (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Defensywna architektura pod scenariusz:** zaprojektowanie segmentacji i punktów kontroli dla konkretnej firmy/branży, ze świadomym ograniczeniem ruchu wschód–zachód i wskazaniem, gdzie zbierać telemetrię.
- **Wykrywanie ruchu bocznego i C2 w przepływach:** reguły/zapytania nad NetFlow rozpoznające rozpełzanie się po sieci i regularny beaconing do zewnętrznego adresu.
- **Mapowanie na MITRE ATT&CK** (otwarta baza taktyk i technik napastników — §7): przypisanie obserwacji do technik z taktyk Discovery (T1046 — skanowanie usług), Lateral Movement i Command and Control (T1071); świadome nazwanie **luk widoczności (blind spots)** — których odcinków sieci nie widzimy.
- **Most do SIEM/NDR:** przełożenie telemetrii sieciowej na zdarzenia, które trafiają do SIEM, i powiązanie z detekcją hostową (EDR) w jeden obraz incydentu.
- **Mapa widoczności:** świadome wskazanie, gdzie w architekturze są czujniki, a gdzie sieć jest „ślepa".

**Co student musi UMIEĆ ZROBIĆ:** zaprojektować defensywną architekturę dla scenariusza z uzasadnieniem segmentacji i rozmieszczenia czujników; wykryć w danych przepływów ruch boczny i kanał C2, mapując je na ATT&CK; nazwać luki widoczności; pokazać, jak telemetria sieci zasila SIEM. To poziom „portfolio na rozmowę o pracę" dla roli architekta/analityka sieci.

**Profesjonalne niuanse:**
- **Pokrycie widoczności bije liczbę reguł.** Sto reguł na ruchu, którego i tak nie widzimy w połowie sieci, jest gorsze niż mniej reguł nad pełną telemetrią. Zawodowiec najpierw pyta „gdzie jestem ślepy", potem pisze detekcję (most do niuansu #5 z researchu SIEM — martwe pola).
- **Szyfrowanie przenosi grę na metadane.** Skoro treści nie widać (TLS), wykrycie opiera się na wzorcach przepływów: rytm, rozmiary, kierunki. To czyni NetFlow ważniejszym, nie mniej ważnym, im więcej ruchu jest zaszyfrowane.
- **Architektura bez właściciela zmian gnije.** Segmentacja „rozszczelnia się" z czasem przez doraźne wyjątki („otwórz na chwilę port"). Zawodowiec dokumentuje każdy wyjątek i jego uzasadnienie (most do niuansu #7 z SIEM — strojenie ≠ wyciszanie).

### L4 — Realny przypadek profesjonalny: segmentacja i polowanie w realnej, zaszłej sieci (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *zaszłej, niesegmentowanej* sieci z realnymi ograniczeniami biznesowymi (nie da się odciąć wszystkiego naraz) i zaprojektowanie *etapowej* segmentacji, która ogranicza ryzyko, nie zatrzymując firmy.
- Polowanie na ruch boczny w dużym, zaszumionym zbiorze przepływów, gdzie atak ukrywa się w legalnych protokołach.
- **Benchmark:** projekt segmentacji i wynik polowania studenta zestawione z tym, co zaproponował i znalazł profesjonalista na tym samym przypadku (co przeoczył, gdzie przeciął sieć za ostro lub za miękko).

### L5 — Biegłość: architektura widoczności i ekonomia telemetrii w skali (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia widoczności całej organizacji:** gdzie zbierać pełny PCAP, gdzie wystarczy NetFlow, gdzie polegać na telemetrii hostów — decyzja świadoma wobec kosztu i wartości wykrywania (most do ekonomii zaciągu z researchu SIEM, niuans #9).
- **Zero trust w skali:** projekt architektury „nie ufaj domyślnie" dla rozproszonej, chmurowo-lokalnej firmy, z realnym kosztem operacyjnym.
- **Benchmark** wobec rozwiązania realnego architekta: nie „czy segmentujesz", lecz „czy projektujesz obronę sieci, która łapie ruch boczny za rozsądny koszt i da się ją utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Płaska sieć to raj dla napastnika.** Bez segmentacji jeden przejęty laptop daje dostęp do wszystkiego. Wartość kompetencji Network zaczyna się od zrozumienia, że obrona to **ograniczanie zasięgu rażenia (blast radius)**, nie tylko mur na granicy.

2. **Segmentacja to kompromis koszt–bezpieczeństwo, nie maksimum.** Za drobny podział paraliżuje firmę i rodzi setki wyjątków; za płaski — daje napastnikowi cały dom. Zawodowiec tnie tam, gdzie różnica wartości/zaufania jest realna, i uzasadnia każdą granicę.

3. **Ruch wschód–zachód jest cenniejszy dla obrońcy niż północ–południe.** Obrona długo skupiała się na granicy (perymetr), ale realny atak rozgrywa się *wewnątrz* — ruch boczny. Dojrzała sieć patrzy do środka, nie tylko na wjazd.

4. **NetFlow vs pełny PCAP to decyzja koszt–widoczność.** Metadane przepływów są tanie i skalowalne, ale bez treści; pełne przechwytywanie widzi wszystko, ale jest drogie i nie nadąża w skali. Zawodowiec dobiera poziom szczegółu do punktu sieci i wartości danych; amator chce „nagrywać wszystko".

5. **Szyfrowanie przesuwa wykrywanie na metadane.** Im więcej ruchu w TLS, tym mniej widać w treści i tym ważniejsze stają się wzorce przepływów (rytm, rozmiar, kierunek). To podnosi rangę NetFlow, nie obniża.

6. **Ruch boczny ukrywa się w legalnych protokołach.** Napastnik używa udostępniania plików, zdalnego pulpitu, narzędzi administracyjnych — sygnałem jest *zmiana wzorca*, nie egzotyczny protokół. Wykrycie wymaga linii bazowej „co tu jest normalne".

7. **VPN przesuwa granicę zaufania, nie znosi jej.** Po zalogowaniu napastnik jest „w środku". Zero trust i monitorowanie zachowania konta *po* połączeniu to dojrzała odpowiedź; „ufam, bo przeszedł VPN" to błąd juniora.

8. **Luki widoczności (blind spots) są groźniejsze niż brak reguły.** To, czego sieć nie widzi (nieobjęty telemetrią segment, ruch wewnątrz hosta), jest największym ryzykiem. Zawodowiec rysuje *mapę widoczności* i nazywa ślepe odcinki (most do niuansu #5 z SIEM).

9. **Rozszczelnianie segmentacji w czasie.** Każdy doraźny wyjątek („otwórz port na chwilę") zostaje na lata. Bez dyscypliny i dokumentacji wyjątków segmentacja po roku jest fikcją. Każdy wyjątek = uzasadnienie + przegląd (most do niuansu #7 z SIEM).

10. **Czas i synchronizacja (NTP — protokół synchronizacji czasu).** Korelacja przepływów z różnych czujników i z logami hostów działa tylko przy zgodnych zegarach. Rozjechany czas = błędna droga napastnika w rekonstrukcji incydentu (most do niuansu #10 z SIEM i §4 `TCP/IP`).

11. **Diagram ≠ rzeczywistość.** Architektura „na papierze" niemal nigdy nie odpowiada realnemu ruchowi. Zawodowiec weryfikuje projekt danymi (przepływy pokazują, kto faktycznie z kim rozmawia), zanim uzna sieć za bezpieczną.

12. **Granica etyczno-prawna jest częścią kompetencji.** Telemetria sieci i przepływy to wgląd w komunikację — bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14) i podlegają RODO (minimalizacja, retencja). Nieuprawniony nasłuch/dostęp do cudzej sieci to przestępstwo (art. 267 Kodeksu karnego). Ćwiczenia wyłącznie na własnym/treningowym labie i publicznych zbiorach przepływów.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Network muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał zaprojektować defensywną architekturę sieci i rozpoznać atak w telemetrii. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Strefy i granice zaufania** — odczyt architektury z diagramu, wskazanie DMZ/sieci wewnętrznej, klasyfikacja wschód–zachód vs północ–południe | Strefy, DMZ, topologia, typy ruchu | #1, #3 |
| P2 | L1 | **Czytanie przepływów (NetFlow)** — odczyt rekordów, opis „kto z kim", weryfikacja diagramu danymi | Rekord NetFlow, metadane vs treść | #4, #11 |
| P3 | L2 | **Projekt segmentacji** — podział na strefy z zasadą najmniejszego dostępu i uzasadnieniem każdej granicy | Segmentacja, najmniejszy dostęp, baseline | #2 |
| P4 | L2 | **Bezpieczny zdalny dostęp (VPN)** — udostępnienie usługi przez VPN, ryzyka, co monitorować po połączeniu | VPN, zero trust w praktyce | #7 |
| P5 | L2 | **Skan i ruch boczny w przepływach** — rozpoznanie skanu sieci i rozpełzania się względem linii bazowej | Rozpoznanie nadużyć, baseline | #6 |
| P6 | L3 | **Wykrywanie C2 i ruchu bocznego + ATT&CK** — reguły nad NetFlow, mapowanie na techniki, nazwane luki widoczności | Wykrywanie C2/lateral, mapowanie ATT&CK, blind spots | #6, #8 |
| P7 | L3 | **Defensywna architektura pod scenariusz** — segmentacja + rozmieszczenie czujników dla konkretnej branży, mapa widoczności | Architektura defensywna, mapa widoczności | #2, #8, #9 |
| P8 | L3 | **Most do SIEM/NDR** — przełożenie telemetrii sieci na zdarzenia SIEM i powiązanie z detekcją hostową w jeden obraz | Most do SIEM, korelacja sieć+host | #5, #10 |
| (P9–P10) | L4–L5 | **ZAPOWIEDŹ** — etapowa segmentacja zaszłej sieci + polowanie z benchmarkiem; architektura widoczności i ekonomia telemetrii w skali | Zakres L4/L5 z §3 | #4 (skala), #9, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów** (żaden jeszcze nie istnieje — grupa „Infrastruktura i sieci" ma dziś 0 projektów). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną (§4 pkt 12), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1→P2 (przepływy) → P3 (segmentacja) → P4 (VPN) → P5 (skan/ruch boczny) → P6 (C2+ATT&CK) → P7 (architektura) → P8 (most do SIEM). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Network **nie ma sensu** bez fundamentu pakietu i podstaw systemów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **`TCP/IP`** — adres IP, port, protokół, sesja, różnica TCP/UDP. Bez tego student nie odczyta rekordu NetFlow ani nie zrozumie, czym jest „połączenie", które segmentuje lub wykrywa. **Wymagane przed L1.** To główny prerekwizyt — w grupie „Infrastruktura i sieci" `TCP/IP` autorowany jest pierwszy.
2. **Podstawy systemów operacyjnych** — `Linux`/`Windows` na poziomie uruchamiania narzędzi i rozumienia, czym jest host/usługa (budowane w partii 1: `cyber-hardening-linux-bash`). **Zalecane przed L2.**
3. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie i publicznych zbiorach). **Wymagane od L1.**

**Czego Network dostarcza jako prerekwizyt dla innych liści:**
- **`Firewall / IDS-IPS`** — reguły zapory i rozmieszczenie IDS egzekwują architekturę (strefy, granice) opisaną w Network. Trudno świadomie pisać reguły zapory, nie rozumiejąc, *które* strefy mają być rozdzielone. **Network wymagane/równoległe przed `Firewall / IDS-IPS`.**
- **`SIEM` / `SOC`** — telemetria sieciowa (NetFlow, alerty IDS) to jedno z głównych źródeł SIEM; wykrywanie ruchu bocznego i C2 w SIEM zakłada rozumienie architektury sieci z tego liścia. **Network wzmacnia sieciową część SIEM.**
- **`Cloud Security` (AWS/Azure/GCP)** — segmentacja, strefy i kontrola ruchu przenoszą się 1:1 na sieci chmurowe (grupy bezpieczeństwa, VPC). **Network to fundament myślenia o sieci również w chmurze.**

**Wniosek dla kolejności autoringu w grupie:** Network autorowany **po `TCP/IP`**, **przed lub równolegle do `Firewall / IDS-IPS`**, jako koncepcyjny most między pojedynczym pakietem a całościową obroną i telemetrią zasilającą SIEM.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy i wytyczne (oficjalne, darmowe):**
- NIST SP 800-215 „Guide to a Secure Enterprise Network Landscape": https://csrc.nist.gov/pubs/sp/800/215/final
- NIST SP 800-207 „Zero Trust Architecture": https://csrc.nist.gov/pubs/sp/800/207/final
- NIST SP 800-41r1 „Guidelines on Firewalls and Firewall Policy" (kontekst stref/segmentacji): https://csrc.nist.gov/pubs/sp/800/41/r1/final
- CISA — Layering Network Security Through Segmentation (infografika/wytyczna): https://www.cisa.gov/sites/default/files/publications/layering-network-security-segmentation_infographic_508_0.pdf

**Specyfikacje telemetrii (RFC — oficjalne):**
- RFC 3954 „Cisco Systems NetFlow Services Export Version 9": https://www.rfc-editor.org/rfc/rfc3954
- RFC 7011 „IPFIX Protocol Specification" (standard eksportu przepływów): https://www.rfc-editor.org/rfc/rfc7011

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK — taktyka Lateral Movement (ruch boczny): https://attack.mitre.org/tactics/TA0008/
- MITRE ATT&CK — taktyka Command and Control: https://attack.mitre.org/tactics/TA0011/
- MITRE ATT&CK — T1046 Network Service Discovery (skanowanie): https://attack.mitre.org/techniques/T1046/
- SANS Reading Room — segmentacja i monitorowanie sieci (białe księgi, darmowe): https://www.sans.org/white-papers/

**Narzędzia i dane do ćwiczeń (otwarte):**
- Zeek (otwartoźródłowy monitor ruchu generujący metadane połączeń) — dokumentacja: https://docs.zeek.org/en/master/
- nfdump / NfSen (otwartoźródłowe narzędzia do NetFlow): https://github.com/phaag/nfdump
- Malware-Traffic-Analysis.net — ćwiczeniowe zrzuty z analizą (publiczne, edukacyjne): https://www.malware-traffic-analysis.net/training-exercises.html

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/ograniczania skutków): https://eur-lex.europa.eu/eli/dir/2022/2555
- Kodeks karny, art. 267 (nieuprawniony dostęp/nasłuch): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Zbiory ćwiczeniowe (Malware-Traffic-Analysis) zawierają realny ruch — **wymagają klauzuli** pracy wyłącznie na udostępnionych zrzutach i własnym labie. Dane przepływów traktować jak dane osobowe (maskowanie adresów w raportach studenta, jak w partii 1). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu obrony sieci i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research mylił Network z administracją sieci.** CISO: „nie potrzebuję kolejnego CCNA — potrzebuję kogoś, kto zaprojektuje sieć tak, by włamanie nie rozlało się na całą firmę". **Poprawka:** przeformułowałam definicję i wszystkie poziomy wokół **obrony** (segmentacja, ograniczanie zasięgu rażenia, wykrywanie ruchu bocznego), a nie przepustowości/konfiguracji urządzeń.

2. **Słabość: brak ruchu wschód–zachód i ruchu bocznego.** CISO: „junior, który pilnuje tylko granicy, przegapi realny atak, który dzieje się w środku". **Poprawka:** wprowadziłam rozróżnienie wschód–zachód vs północ–południe od L1, ruch boczny jako oś L2/L3 i niuans #3/#6 — bo to jest dziś sedno obrony sieci.

3. **Słabość: NetFlow potraktowany po macoszemu wobec PCAP.** CISO: „w skali nikt nie nagrywa pełnego pakietu wszędzie — junior musi umieć pracować na metadanych, zwłaszcza przy szyfrowaniu". **Poprawka:** podniosłam NetFlow do filaru kompetencji (§2), dodałam niuans #4 (koszt–widoczność) i #5 (szyfrowanie przenosi grę na metadane), z mostem do ekonomii zaciągu z SIEM.

4. **Słabość: segmentacja pokazana jako „im więcej, tym lepiej".** CISO: „przesegmentowana sieć to setki wyjątków, które i tak otwieracie — to gorsze niż brak podziału". **Poprawka:** dodałam niuans #2 (kompromis) i #9 (rozszczelnianie w czasie, dyscyplina wyjątków), żeby student rozumiał segmentację jako decyzję, nie maksimum.

5. **Słabość: prerekwizyty i miejsce w łańcuchu były domyślne.** CISO: „skąd mam wiedzieć, że ten student umie czytać pakiet, zanim projektuje sieć? i co z tego wynika dla SIEM?". **Poprawka:** §6 przepisałam jako jawny łańcuch — `TCP/IP` wymagane przed Network, a Network jest prerekwizytem `Firewall / IDS-IPS`, sieciowej części `SIEM` i `Cloud Security`; dopisałam mosty do SIEM (#8, #10) w treści poziomów.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Network, segmentacja, DMZ, VLAN, zero trust, VPN, NetFlow/IPFIX/sFlow, PCAP, wschód–zachód/północ–południe, ruch boczny/lateral movement, C2, baseline, blast radius, blind spot, NDR, EDR, MITRE ATT&CK, NTP, CIDR, CISO, NIS2). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli architekta/analityka sieci, jeśli autoring domknie 8 projektów L1–L3 z niuansami #1–#8, #10–#11. Niuanse #4 w skali, #9 (rozszczelnianie w dużej organizacji) i #12 (RODO/prawo przy realnej telemetrii) domkną się pełniej z L4/L5 — research je zapowiada (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
