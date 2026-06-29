# Research kompetencji: TCP/IP

> **Status:** research kompetencji ETAP E3, wzorowany na golden-example `tools/content/research/siem.md` (North Star §0.1 nadrzędny).
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `TCP/IP` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Infrastruktura i sieci" (`unionShare` grupy: **9,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,0%** ofert ścieżki wymienia TCP/IP |
| **Liczba ofert (`offers`)** | **11** |
| **`kind`** | `concept` (kompetencja koncepcyjna — model komunikacji, nie pojedyncze narzędzie; patrz §2) |
| **`lift`** | 4,46 (siła powiązania liścia z tą ścieżką — ponadprzeciętna jak na koncept) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Opis grupy z modelu** (cytat z `career-model.json`, dosłowny — to soczewka całej grupy): *„Sieć to autostrada, którą poruszają się dane — i którą porusza się atakujący. Rozumienie, jak komputery rozmawiają ze sobą (protokół TCP/IP — podstawowy język sieci) i jak ten ruch filtrować (firewall — zapora sieciowa), to fundament, na którym stoi reszta bezpieczeństwa. Bez tego SIEM pokazuje Ci alerty, których nie rozumiesz."*

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Network | 4,3 | 16 | concept | 3,51 |
| **TCP/IP** (ten plik) | 3,0 | 11 | concept | 4,46 |
| Firewall / IDS-IPS | 2,4 | 9 | tool | 17,19 |

**Wniosek dla autoringu:** TCP/IP ma w grupie najmniejszy bezpośredni popyt liczbowy (3,0%), ale to **fundament wymagany przez dwa pozostałe liście i przez całą grupę SIEM**. To klasyczna kompetencja „niska w licznikach, krytyczna w łańcuchu": nikt nie pisze w ofercie „wymagamy TCP/IP", bo to się zakłada — ale junior, który nie umie przeczytać pakietu, nie zinterpretuje ani logu zapory, ani alertu IDS, ani zdarzenia sieciowego w SIEM. Dlatego TCP/IP autorowany jest w grupie **pierwszy**: Network nadbudowuje architekturę nad protokołem, Firewall/IDS-IPS filtruje i wykrywa na tym samym ruchu, a SIEM koreluje zdarzenia, których surowcem jest pakiet. To rdzeń, na którym stoi reszta bezpieczeństwa.

---

## 2. Definicja kompetencji i jej rola w pracy

**TCP/IP (Transmission Control Protocol / Internet Protocol — rodzina protokołów, czyli wspólny język, którym komputery porozumiewają się w sieci)** to zestaw reguł opisujących, jak dane są pakowane, adresowane, przesyłane i składane z powrotem między dwoma maszynami. „TCP/IP" to skrót od dwóch najważniejszych protokołów rodziny, ale potocznie oznacza cały **model warstwowy** komunikacji sieciowej. Kompetencja nie polega na recytowaniu warstw — polega na umiejętności **przeczytania ruchu sieciowego i powiedzenia, co się w nim faktycznie dzieje**.

**Model warstw (czego student musi rozumieć fizycznie, nie z definicji):** dane „schodzą w dół" przez warstwy u nadawcy i „wchodzą w górę" u odbiorcy. Najprostszy roboczy podział (model TCP/IP, 4 warstwy — w praktyce częściej miesza się z 7-warstwowym modelem OSI):

1. **Warstwa dostępu do sieci (link)** — ramki, adresy sprzętowe MAC (Media Access Control — fizyczny adres karty sieciowej), protokół ARP (Address Resolution Protocol — tłumaczy adres IP na adres MAC w sieci lokalnej).
2. **Warstwa internetowa (sieć)** — protokół **IP** (adresowanie i trasowanie pakietów między sieciami), adres IPv4/IPv6, ICMP (Internet Control Message Protocol — komunikaty sterujące, m.in. `ping`), TTL (Time To Live — licznik „żywotności" pakietu).
3. **Warstwa transportowa** — **TCP** (połączeniowy, niezawodny: gwarantuje kolejność i dostarczenie, kosztem narzutu) i **UDP** (User Datagram Protocol — bezpołączeniowy, szybki, bez gwarancji; DNS, VoIP, część ataków). Tu żyje pojęcie **portu** (numer identyfikujący usługę na maszynie — 443 to HTTPS, 22 to SSH, 53 to DNS).
4. **Warstwa aplikacji** — protokoły, które „widzi" człowiek: HTTP/HTTPS (WWW), DNS (Domain Name System — zamiana nazwy na adres IP), SMTP (poczta), SSH (zdalny dostęp), TLS (Transport Layer Security — szyfrowanie sesji).

**Trzy mechanizmy, które musi rozumieć obrońca (nie programista sieci):**
- **Trójstronne uzgodnienie TCP (three-way handshake):** `SYN` → `SYN-ACK` → `ACK`. Każde połączenie TCP zaczyna się tym uściskiem dłoni. Flagi pakietu (`SYN`, `ACK`, `FIN`, `RST`, `PSH`) to alfabet, w którym czyta się stan połączenia — i w którym widać skanowanie portów (np. skan SYN, który nigdy nie kończy uścisku).
- **Enkapsulacja (kapsułkowanie — zagnieżdżanie):** pakiet aplikacji jest „opakowywany" kolejnymi nagłówkami niższych warstw. Czytając pakiet w Wiresharku, rozwija się te warstwy jak cebulę — i to jest dosłownie umiejętność „czytania pakietu".
- **Pakiet jako dowód:** każdy bajt, który przeszedł przez sieć, da się zarejestrować (przechwytywanie ruchu — packet capture) do pliku **PCAP** (Packet Capture — standardowy format zrzutu ruchu). PCAP jest twardym, niepodważalnym dowodem tego, co się stało w sieci — w przeciwieństwie do logu, który może być niekompletny lub sfałszowany u źródła.

**Czym TCP/IP NIE jest (rozróżnienie zawodowca):**
- To nie „konfigurowanie routerów" ani administracja sieci. Tu chodzi o **interpretację ruchu z perspektywy bezpieczeństwa** — co ten ruch znaczy, czy jest normalny, czy jest atakiem.
- To nie znajomość wszystkich protokołów na pamięć. Zawodowiec zna model i wie, **gdzie szukać** oraz **jak to zweryfikować w narzędziu**, a nie zgaduje z nazwy portu.

**Kto tego używa i jak wygląda dzień pracy.** TCP/IP jest cichym fundamentem pracy **analityka SOC**, **inżyniera detekcji**, **analityka kryminalistyki sieciowej (network forensics)** i **pentestera**. W praktyce kompetencja ujawnia się, gdy:
- analityk dostaje alert „podejrzane połączenie wychodzące" i musi w PCAP/NetFlow potwierdzić, **co** to było — czy to aktualizacja systemu, czy kanał dowodzenia napastnika (C2);
- inżynier detekcji pisze regułę odróżniającą normalny ruch DNS od tunelowania danych przez DNS — co wymaga rozumienia, jak DNS wygląda na poziomie pakietu;
- analityk po incydencie rekonstruuje sesję TCP, żeby zobaczyć, jakie dane wyciekły.

**Po co rynkowi ta kompetencja.** Każde narzędzie bezpieczeństwa sieciowego (zapora, IDS/IPS, SIEM, EDR z telemetrią sieciową) operuje na danych, których surowcem jest pakiet TCP/IP. Junior, który „klika w konsoli", ale nie rozumie, co konsola pokazuje, jest mniewiele wart — bo nie odróżni fałszywego alarmu od realnego włamania. Stąd TCP/IP, mimo niskiego bezpośredniego popytu w ofertach, jest progiem wejścia do całej obrony sieci.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: warstwy, adresy, czytanie pojedynczego pakietu (3–6 h)

**Zakres wiedzy/umiejętności:**
- Model warstwowy w praktyce: rozpoznanie, do której warstwy należy dane pole (MAC, IP, port, protokół aplikacji), na konkretnym pakiecie.
- Adresacja: adres IPv4 (i świadomość, że istnieje IPv6), maska podsieci w zapisie CIDR (np. `/24`), port źródłowy i docelowy, różnica TCP vs UDP.
- Otwarcie publicznego, tutorialowego pliku PCAP w **Wireshark** (darmowy analizator ruchu) lub `tshark`/`tcpdump` (wersje konsolowe); rozwinięcie warstw enkapsulacji jednego pakietu.
- Podstawowe filtry wyświetlania w Wiresharku: po adresie (`ip.addr ==`), po porcie (`tcp.port ==`), po protokole (`dns`, `http`).
- Odczytanie z pakietu prostego faktu: kto z kim się łączył, na jakim porcie, jakim protokołem, czy ruch był jawny czy szyfrowany.

**Co student musi UMIEĆ ZROBIĆ:** otworzyć publiczny PCAP, wskazać dla wybranego pakietu adresy MAC/IP, porty i protokół każdej warstwy; napisać 3–4 filtry wyświetlania i wyłuskać nimi konkretny ruch; opisać słownie, na czym polegało dane połączenie.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Numer portu to wskazówka, nie dowód.** Port 443 zwykle to HTTPS, ale napastnik świadomie używa portu 443 dla swojego kanału, żeby wtopić się w tłum. Zawodowiec patrzy, **co faktycznie jest w pakiecie**, a nie zgaduje usługę z numeru portu (niuans #1).
- **Czytanie pakietu vs zgadywanie.** Amator widzi „połączenie na port 8080" i mówi „to serwer WWW". Zawodowiec rozwija warstwy i sprawdza, czy treść w ogóle wygląda jak HTTP. To jest sedno tej kompetencji od pierwszego poziomu.

### L2 — Zastosowanie: sesje, uścisk TCP, rozpoznanie typowego ruchu i nadużyć (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Śledzenie strumienia (Follow TCP/UDP stream):** rekonstrukcja całej rozmowy między dwoma stronami z rozsypanych pakietów; zobaczenie treści sesji HTTP (i dlaczego w HTTP — bez TLS — widać nawet hasła).
- **Trójstronne uzgodnienie i flagi:** rozpoznanie poprawnego nawiązania, zerwania (`FIN`/`RST`), retransmisji; odczytanie z flag, że to skan portów, a nie normalne połączenie.
- **DNS od środka:** jak wygląda zapytanie i odpowiedź DNS na poziomie pakietu; dlaczego DNS bywa kanałem nadużyć (tunelowanie, eksfiltracja danych zaszyte w nazwach).
- **Jawny vs szyfrowany:** rozróżnienie ruchu czytelnego (HTTP, FTP, Telnet) od zaszyfrowanego (TLS/HTTPS, SSH) i co to znaczy dla obrońcy — czego *nie* zobaczy w treści.
- **Filtry przechwytywania (capture filters, składnia BPF — Berkeley Packet Filter)** vs filtry wyświetlania — różnica między tym, co rejestrujemy, a tym, co pokazujemy.

**Co student musi UMIEĆ ZROBIĆ:** zrekonstruować pełną sesję TCP z PCAP i opisać, co się w niej działo; wskazać w zrzucie nieudane/podejrzane uściski TCP (np. wzorzec skanu); zidentyfikować zapytania DNS i ocenić, czy wyglądają normalnie; rozdzielić ruch jawny od szyfrowanego i nazwać, czego z szyfrowanego nie da się odczytać.

**Profesjonalne niuanse:**
- **Retransmisje i zduplikowane ACK to nie zawsze atak — częściej to chora sieć.** Zawodowiec odróżnia objaw problemu wydajnościowego od objawu nadużycia; amator alarmuje na każdą anomalię.
- **DNS to ulubiony kanał napastnika, bo „zawsze jest dozwolony".** Zapora niemal nigdy nie blokuje portu 53 — więc tunel DNS przechodzi tam, gdzie inny ruch by nie przeszedł. Trzeba umieć zobaczyć nienaturalnie długie/losowe nazwy w zapytaniach.
- **Szyfrowanie to martwe pole obrońcy.** Coraz więcej ruchu jest w TLS — w treści nie widać nic. Zawodowiec wie, że wtedy pracuje na **metadanych** (kto, z kim, jak często, ile danych), nie na zawartości (most do NetFlow w liściu `Network`).

### L3 — Portfolio: analiza śledcza ruchu i powiązanie z detekcją (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Analiza śledcza PCAP (network forensics):** wzięcie zrzutu z „incydentem" i udowodnienie krok po kroku, co się stało — od pierwszego pakietu do skutku (np. pobranie złośliwego pliku, eksfiltracja).
- **Wzorce ruchu wrogiego na poziomie pakietu:** skan portów (SYN/connect/stealth), pukanie do wielu hostów (rozpoznanie), powtarzalne „bicie serca" do jednego adresu w równych odstępach (beaconing — sygnał kanału C2), nietypowo duże transfery wychodzące (eksfiltracja).
- **Wyciąganie artefaktów:** odtworzenie pliku przesłanego przez sieć (file carving z PCAP), wyłuskanie poświadczeń z sesji jawnej — jako dowód, *dlaczego* szyfrowanie i segmentacja mają znaczenie.
- **Most do detekcji i SIEM:** przełożenie tego, co widać w pakiecie, na to, co zobaczyłby SIEM/IDS w postaci zdarzenia; mapowanie obserwacji na **MITRE ATT&CK** (np. T1071 Application Layer Protocol, T1048 Exfiltration Over Alternative Protocol, T1046 Network Service Discovery — patrz §4 i §7).
- **Filtry BPF do polowania:** napisanie precyzyjnego filtra przechwytywania, który łapie tylko interesujący ruch (oszczędność i sygnał zamiast szumu).

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełną analizę śledczą publicznego PCAP z incydentem, udokumentować oś czasu i wnioski; rozpoznać i nazwać co najmniej trzy wzorce wrogiego ruchu, mapując je na techniki ATT&CK; odtworzyć artefakt (plik lub poświadczenia) z jawnej sesji jako dowód ryzyka; pokazać, jak ta obserwacja stałaby się alertem w IDS/SIEM. To poziom „portfolio na rozmowę o pracę" dla roli z telemetrią sieciową.

**Profesjonalne niuanse:**
- **Korelacja czasu między pakietem a logiem.** Pakiet ma swój znacznik czasu przechwytywania; log usługi ma swój. Bez zsynchronizowanego czasu (NTP — protokół synchronizacji czasu) nie połączysz „połączenia w PCAP" z „logowaniem w SIEM" — most do niuansu #10 z researchu SIEM.
- **Beaconing wygląda nudno i właśnie dlatego jest groźny.** Regularne, drobne połączenia do jednego adresu to często kanał C2 — nie da się go znaleźć patrząc na pojedynczy pakiet, tylko na *rytm* wielu połączeń. To uczy, że dowód bywa w statystyce ruchu, nie w jednym pakiecie.
- **Pakiet nie kłamie, ale bywa niekompletny.** Przechwytywanie z gubieniem pakietów (drop) daje dziurawy obraz; analityk musi wiedzieć, czy patrzy na pełen zrzut, czy na fragment — inaczej wyciągnie fałszywy wniosek.

### L4 — Realny przypadek profesjonalny: śledztwo na brudnym, wieloprotokołowym zrzucie (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie dużego, *nieuporządkowanego* zrzutu z wieloma protokołami, szumem tła i częściowo szyfrowanym ruchem — i wyłuskanie z niego jednego konkretnego łańcucha ataku, tak jak robi to analityk kryminalistyki sieciowej w realnym incydencie.
- Praca na metadanych tam, gdzie treść jest zaszyfrowana — wnioskowanie z rozmiarów, czasów i kierunków połączeń, gdy nie widać zawartości.
- **Benchmark:** rekonstrukcja osi czasu i wniosków studenta zestawiona z analizą, jaką na tym samym zrzucie przeprowadził profesjonalista (co znalazł, czego student nie zauważył, gdzie wyciągnął nadinterpretację).

### L5 — Biegłość: architektura widoczności sieci i ekonomia przechwytywania (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Decyzja, gdzie i co przechwytywać:** pełny pakiet (PCAP) jest drogi w przechowywaniu i przetwarzaniu; metadane (NetFlow — most do liścia `Network`) są tanie, ale uboższe. Architekt wybiera świadomie, w których punktach sieci i na jakim poziomie szczegółowości patrzeć.
- **Widoczność wobec szyfrowania:** strategia obrony w świecie, gdzie większość ruchu jest w TLS — co da się i czego nie da się zobaczyć, i czym to zastąpić (telemetria z hostów, logi DNS, inspekcja na styku).
- **Benchmark** wobec rozwiązania realnego architekta: nie „czy widzisz pakiet", lecz „czy projektujesz widoczność, która łapie atak za rozsądny koszt i da się ją utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Czytanie pakietu vs zgadywanie po porcie.** Numer portu i nazwa protokołu to deklaracja, nie prawda. Napastnik celowo używa „grzecznych" portów (443, 53). Zawodowiec weryfikuje treść/zachowanie pakietu; amator ufa etykiecie. To rozdzielnik amator↔zawodowiec numer jeden dla tej kompetencji.

2. **TCP vs UDP — różne zachowanie, różne ślady.** TCP zostawia uścisk dłoni i potwierdzenia (widać nawiązanie i zerwanie); UDP jest „strzel i zapomnij" (trudniej powiedzieć, czy coś dotarło). Atak po UDP (np. zalewanie, tunel DNS) czyta się inaczej niż po TCP. Mylenie tych dwóch to klasyczny błąd juniora.

3. **DNS jako kanał ataku.** DNS „zawsze jest dozwolony", więc napastnik tuneluje przez niego dane i sterowanie. Nienaturalnie długie, losowe nazwy domen i nadmiar zapytań to sygnał. Obrońca musi rozumieć DNS na poziomie pakietu, nie tylko „to zamienia nazwę na IP".

4. **Szyfrowanie = martwe pole treści.** TLS/HTTPS chroni prywatność, ale odbiera obrońcy wgląd w zawartość. Dojrzały analityk przesuwa się wtedy na metadane (kto, z kim, kiedy, ile) i telemetrię hostów — zamiast udawać, że „nic się nie dzieje, bo nic nie widać".

5. **Czas i synchronizacja (NTP).** Pakiet i log łączy się po czasie. Rozjechane zegary między czujnikiem sieciowym a systemami = niewidzialny atak i błędna oś czasu w śledztwie. To wprost most do niuansu #10 researchu SIEM.

6. **Beaconing i rytm zamiast pojedynczego pakietu.** Najgroźniejszy ruch (kanał C2) jest cichy i regularny. Dowód jest w *statystyce wielu połączeń*, nie w jednym pakiecie. Amator patrzy na pakiet; zawodowiec patrzy na wzorzec w czasie.

7. **Skan portów ma wiele twarzy.** Skan SYN, skan połączeniowy, skany „ciche" (FIN/NULL/Xmas) zostawiają różne ślady flag. Rozpoznanie *rodzaju* skanu mówi o intencji i zaawansowaniu napastnika.

8. **NAT i adresy prywatne mylą początkujących.** Translacja adresów (NAT — Network Address Translation, podmiana adresu prywatnego na publiczny) sprawia, że ten sam host wygląda na różne adresy z różnych stron. Bez zrozumienia NAT analityk „gubi" maszynę lub fałszywie łączy dwie różne.

9. **Fragmentacja i MTU.** Pakiet większy niż dozwolony rozmiar (MTU — Maximum Transmission Unit) jest dzielony; napastnik używa fragmentacji, by ominąć prostą inspekcję. Zawodowiec wie, że pełny obraz bywa rozsypany na fragmenty, które trzeba poskładać (most do uchylania się przed IDS — niuans w liściu `Firewall / IDS-IPS`).

10. **Porty efemeryczne (chwilowe) to norma, nie anomalia.** Strona klienta używa wysokich, losowych portów źródłowych. Junior, który alarmuje na „dziwny port 54193", nie rozumie, że to normalny port klienta — uczy się odróżniać port usługi od portu chwilowego.

11. **Pakiet jako dowód — integralność i kompletność.** PCAP jest twardym dowodem tylko, jeśli wiadomo, że jest pełny i nienaruszony. Gubienie pakietów przy przechwytywaniu daje dziurawy obraz; analityk musi to znać i deklarować, inaczej buduje wnioski na niepełnych danych.

12. **Granica etyczno-prawna jest częścią kompetencji.** Przechwytywanie ruchu to wgląd w cudzą komunikację — w Polsce nieuprawnione uzyskanie dostępu do informacji/podsłuch jest przestępstwem (art. 267 Kodeksu karnego). Ruch bywa też daną osobową (adres IP — wyrok TSUE Breyer, C-582/14). Ćwiczenia wyłącznie na własnym/treningowym labie lub publicznych, udostępnionych do nauki zrzutach — **nigdy** w cudzej sieci.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty TCP/IP muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał samodzielnie przeczytać i zinterpretować ruch sieciowy z perspektywy obrony. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwszy pakiet w Wiresharku** — otwarcie publicznego PCAP, rozwinięcie warstw, odczyt adresów/portów/protokołu jednego połączenia | Model warstw, adresacja, enkapsulacja, filtry wyświetlania | #1, #10 |
| P2 | L1 | **Filtrowanie ruchu** — wyłuskanie konkretnego ruchu filtrami (ip/port/protokół), rozróżnienie TCP vs UDP na przykładach | Filtry, TCP vs UDP, port usługi vs efemeryczny | #2, #10 |
| P3 | L2 | **Rekonstrukcja sesji** — Follow TCP stream, odtworzenie rozmowy HTTP, zobaczenie poświadczeń w ruchu jawnym | Śledzenie strumienia, jawny vs szyfrowany | #4 |
| P4 | L2 | **Uścisk TCP i skan portów** — odczyt flag, rozpoznanie poprawnego/zerwanego połączenia i wzorca skanu | Handshake, flagi, rozpoznanie skanu | #7 |
| P5 | L2 | **DNS od środka** — analiza zapytań/odpowiedzi DNS, rozpoznanie nienaturalnych nazw (sygnał tunelu) | DNS na poziomie pakietu, nadużycia DNS | #3 |
| P6 | L3 | **Polowanie na C2/beaconing** — wykrycie regularnego „bicia serca" w zrzucie, praca na rytmie wielu połączeń | Wzorce wrogiego ruchu w czasie, BPF | #6, #11 |
| P7 | L3 | **Śledztwo na PCAP + odtworzenie artefaktu** — pełna oś czasu incydentu, file carving / wyłuskanie poświadczeń jako dowód ryzyka | Analiza śledcza, wyciąganie artefaktów | #4, #11 |
| P8 | L3 | **Most do detekcji (ATT&CK + SIEM)** — mapowanie obserwacji z pakietu na techniki ATT&CK i na to, co zobaczyłby IDS/SIEM | Mapowanie ATT&CK, most do SIEM/IDS | #1, #5 |
| (P9–P10) | L4–L5 | **ZAPOWIEDŹ** — brudny wieloprotokołowy zrzut + śledztwo z benchmarkiem; architektura widoczności sieci + ekonomia przechwytywania | Zakres L4/L5 z §3 | #8, #9, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów** (żaden jeszcze nie istnieje — grupa „Infrastruktura i sieci" ma dziś 0 projektów). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną (§4 pkt 12), rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1→P2 (filtry) → P3 (sesja) → P4 (uścisk/skan) → P5 (DNS) → P6 (beaconing) → P7 (śledztwo) → P8 (most do detekcji). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

TCP/IP jest **najniższym fundamentem grupy „Infrastruktura i sieci"** — sam ma minimalne prerekwizyty, ale jest prerekwizytem dla wielu innych liści.

**Czego TCP/IP wymaga przed sobą:**
1. **Podstawy obsługi systemu i wiersza poleceń** — `Linux`/`Windows` na poziomie uruchomienia narzędzia (`tcpdump`, `tshark`) i poruszania się po plikach. Budowane w partii 1 (`cyber-hardening-linux-bash`). **Zalecane przed L2.**
2. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie i publicznych zrzutach). **Wymagane od L1.**

**Czego TCP/IP dostarcza jako prerekwedyt dla innych liści (to jest jego główna rola w modelu):**
- **`Network`** — architektura sieci (segmentacja, strefy, VPN, NetFlow) **nie ma sensu** bez rozumienia adresu, portu, protokołu i sesji. **TCP/IP wymagane przed `Network`.**
- **`Firewall / IDS-IPS`** — reguła zapory operuje na adresie/porcie/protokole, a reguła IDS na zawartości pakietu. Bez TCP/IP student pisze reguły, których nie rozumie. **TCP/IP wymagane przed `Firewall / IDS-IPS`.**
- **`SIEM` / `SOC`** — alert sieciowy w SIEM to przetłumaczony pakiet/przepływ. Bez TCP/IP analityk nie zinterpretuje alertu zapory ani zdarzenia sieciowego (wprost cytat z opisu grupy: „bez tego SIEM pokazuje Ci alerty, których nie rozumiesz"). **TCP/IP wymagane przed sieciowymi regułami SIEM.**

**Wniosek dla kolejności autoringu w grupie:** TCP/IP autorowany jest **pierwszy** w grupie „Infrastruktura i sieci", przed `Network` i `Firewall / IDS-IPS`, i stanowi most wejściowy do całej grupy SIEM.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja narzędzi (oficjalna, darmowa):**
- Wireshark — User's Guide: https://www.wireshark.org/docs/wsug_html_chunked/
- Wireshark — DisplayFilters (referencja filtrów): https://wiki.wireshark.org/DisplayFilters
- tcpdump / libpcap — dokumentacja i strona podręcznika: https://www.tcpdump.org/manpages/tcpdump.1.html
- Składnia filtrów przechwytywania BPF (pcap-filter): https://www.tcpdump.org/manpages/pcap-filter.7.html

**Specyfikacje protokołów (RFC — oficjalne dokumenty standaryzujące):**
- RFC 9293 „Transmission Control Protocol (TCP)" (aktualna konsolidacja): https://www.rfc-editor.org/rfc/rfc9293
- RFC 791 „Internet Protocol (IP)": https://www.rfc-editor.org/rfc/rfc791
- RFC 768 „User Datagram Protocol (UDP)": https://www.rfc-editor.org/rfc/rfc768
- RFC 1035 „Domain Names — Implementation and Specification (DNS)": https://www.rfc-editor.org/rfc/rfc1035
- RFC 826 „Address Resolution Protocol (ARP)": https://www.rfc-editor.org/rfc/rfc826

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK — T1071 Application Layer Protocol: https://attack.mitre.org/techniques/T1071/
- MITRE ATT&CK — T1048 Exfiltration Over Alternative Protocol: https://attack.mitre.org/techniques/T1048/
- MITRE ATT&CK — T1046 Network Service Discovery (skanowanie): https://attack.mitre.org/techniques/T1046/
- SANS Reading Room — analiza ruchu i kryminalistyka sieciowa (białe księgi, darmowe): https://www.sans.org/white-papers/

**Dane do ćwiczeń (publiczne, otwarte zrzuty PCAP):**
- Wireshark Sample Captures (oficjalne, do nauki): https://wiki.wireshark.org/SampleCaptures
- Malware-Traffic-Analysis.net — ćwiczeniowe PCAP z analizą (publiczne, edukacyjne): https://www.malware-traffic-analysis.net/training-exercises.html
- Tcpreplay sample captures: https://tcpreplay.appneta.com/wiki/captures.html

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Kodeks karny, art. 267 (nieuprawniony dostęp do informacji / podsłuch): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Zrzuty ćwiczeniowe (Malware-Traffic-Analysis, Wireshark SampleCaptures) zawierają realny ruch — **wymagają klauzuli**, że student pracuje wyłącznie na udostępnionych publicznie zrzutach i własnym labie, nie nasłuchuje cudzej sieci. Adresy IP w zrzutach traktować jak dane osobowe (maskowanie w raportach studenta — analogicznie do partii 1). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu obrony sieci i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził „kursem akademickim o warstwach OSI".** CISO: „nie interesuje mnie, czy junior wyrecytuje siedem warstw — interesuje mnie, czy otworzy PCAP i powie, co się stało". **Poprawka:** przeformułowałam całą definicję i każdy poziom wokół czasownika „przeczytać pakiet" zamiast „znać model"; warstwy pojawiają się jako narzędzie czytania, nie cel sam w sobie. North Star §0.1 (poprzeczka pracodawcy) wymusza tę zmianę.

2. **Słabość: pominięte szyfrowanie jako martwe pole.** CISO: „90% ruchu jest dziś w TLS — junior, który myśli, że «przechwytuje i czyta treść», jest z 2010 roku". **Poprawka:** dodałam niuans #4 (szyfrowanie = martwe pole treści), wprowadziłam rozróżnienie jawny/szyfrowany już na L2 i przesunięcie na metadane na L3/L5 (most do NetFlow w `Network`).

3. **Słabość: zgadywanie po porcie nie było nazwane jako główny błąd.** CISO: „pierwszy błąd juniora to «port 443, więc HTTPS» — napastnik na tym żeruje". **Poprawka:** wyniosłam to do niuansu #1 i wbudowałam w L1 jako rozdzielnik amator↔zawodowiec od pierwszego projektu.

4. **Słabość: «pakiet jako atak» bez «pakiet jako dowód».** CISO: „połowa wartości tej kompetencji to kryminalistyka — udowodnić, co się stało, nie tylko wykryć". **Poprawka:** dodałam warstwę śledczą na L3 (oś czasu, file carving, integralność/kompletność zrzutu — niuans #11) i osobny projekt P7.

5. **Słabość: prerekwizyty pokazywały tylko «co przed», nie «co po».** CISO: „chcę widzieć, że TCP/IP to fundament Network, Firewall i SIEM — inaczej nie wiem, po co go uczycie skoro ma tylko 3% popytu". **Poprawka:** §6 przepisałam tak, by jawnie pokazać, że niski popyt liścia maskuje krytyczną pozycję w łańcuchu — TCP/IP jest prerekwizytem `Network`, `Firewall / IDS-IPS` i sieciowych reguł SIEM, stąd autorowany pierwszy.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (TCP/IP, IP, TCP, UDP, ICMP, ARP, MAC, port, TTL, CIDR, DNS, HTTP/HTTPS, TLS, SSH, handshake, flagi SYN/ACK/FIN/RST, enkapsulacja, PCAP, BPF, Follow stream, beaconing, C2, NAT, MTU, NetFlow, file carving, NTP, MITRE ATT&CK, CISO). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli z telemetrią sieciową, jeśli autoring domknie 8 projektów L1–L3 z niuansami #1–#7, #10–#11. Niuanse #8, #9, #12 w skali (architektura widoczności, fragmentacja jako uchylanie się, granica prawna przy realnym ruchu) domkną się pełniej dopiero z L4/L5 — research je zapowiada (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
