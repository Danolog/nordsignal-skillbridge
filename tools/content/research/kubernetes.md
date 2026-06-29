# Research kompetencji: Kubernetes

> **Status:** research liścia w ETAP E3 — powstaje wg wzorca `tools/content/research/siem.md` (golden-example). North Star §0.1 (poprzeczka: „czy pracodawca w EU uzna kandydata za przygotowanego") jest nadrzędny nad całym tym plikiem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Soczewka:** **ZABEZPIECZANIE klastra, nie administracja.** Student nie uczy się „uruchamiać aplikacje w Kubernetes" — uczy się je *hartować*: kontrola dostępu (RBAC), polityki sieciowe, sekrety, hartowanie kontenerów, skanowanie obrazów, CIS Benchmark dla Kubernetes. Nadbudowuje środowiskowo nad rdzeniem koncepcyjnym grupy — `DevSecOps` (`tools/content/research/devsecops.md`).

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Kubernetes` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „DevSecOps i konteneryzacja" (`unionShare` grupy: **10,8%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **5,7%** ofert ścieżki wymienia Kubernetes |
| **Liczba ofert (`offers`)** | **21** |
| **`kind`** | `tool` (konkretne narzędzie/platforma — ale uczone przez soczewkę bezpieczeństwa, nie administracji) |
| **`lift`** | **0,69** (siła powiązania liścia z tą ścieżką — patrz wniosek niżej) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| **Kubernetes** (ten plik) | 5,7 | 21 | tool | **0,69** |
| CI/CD | 5,7 | 21 | concept | 0,60 |
| DevSecOps | 3,0 | 11 | concept | 14,01 |

**Wniosek dla autoringu — `lift` poniżej 1 wyznacza soczewkę.** Kubernetes to najczęstszy liść grupy pod względem popytu (5,7%), ale jego `lift` to tylko **0,69** — poniżej 1 znaczy, że pojawia się równie chętnie (a nawet częściej) w ofertach *spoza* bezpieczeństwa: data engineer, MLOps, backend, DevOps (w modelu ten sam liść wisi w grupach „Konteneryzacja" roli MLOps z `unionShare` 48,2% i w „Inżynierii danych w chmurze"). To znaczy jedno: **rynek nie pyta cyberspecjalisty o *umiejętność administrowania* Kubernetesem — tego uczy każda inna ścieżka. Pyta o *umiejętność jego zabezpieczania*.** Stąd twarda soczewka tego researchu: zero administracji dla samej administracji, wszystko pod kątem „jak to zahartować i czego pilnować". Kontekstu pojęciowego (próg blokujący, skan jako krok taśmy, łańcuch dostaw) dostarcza research `DevSecOps` — Kubernetes go *konkretyzuje środowiskowo*.

---

## 2. Definicja kompetencji i jej rola w pracy

**Kubernetes (w skrócie *K8s* — system zarządzania kontenerami, czyli orkiestrator)** to oprogramowanie, które uruchamia, restartuje i skaluje setki **kontenerów** (lekkich, odizolowanych paczek z aplikacją i wszystkim, czego potrzebuje do działania) na wielu maszynach naraz. To dziś standard uruchamiania aplikacji w chmurze. Z punktu widzenia bezpieczeństwa Kubernetes jest jednocześnie ogromną powierzchnią ataku: jeden źle ustawiony dostęp albo jeden podatny obraz potrafi otworzyć drogę do całego klastra.

Bezpieczeństwo Kubernetesa porządkuje model **„4C"** (cztery warstwy, które trzeba zabezpieczyć od środka na zewnątrz): **C**ode (kod aplikacji) → **C**ontainer (kontener i jego obraz) → **C**luster (sam klaster Kubernetes) → **C**loud (chmura, na której stoi). Ten research dotyczy głównie dwóch środkowych: kontenera i klastra.

Zabezpieczanie klastra to sześć obszarów, które amator pomija, bo „działa i tyle":

1. **RBAC (*Role-Based Access Control* — kontrola dostępu oparta na rolach)** — kto i co może zrobić w klastrze. Domyślnie łatwo nadać za dużo; sztuka to *najmniejsze uprawnienie* (każdy dostaje dokładnie tyle, ile potrzebuje).
2. **Polityki sieciowe (*network policies*)** — które kontenery (pody) mogą się ze sobą komunikować. Domyślnie w Kubernetes **wszystko gada ze wszystkim** — zabezpieczenie to ustawienie „domyślnie blokuj, przepuść wyjątki".
3. **Sekrety (*secrets*)** — hasła i klucze w klastrze. Pułapka: sekret w Kubernetes domyślnie to tylko zakodowany `base64`, **nie szyfrowanie** (każdy z dostępem odczyta).
4. **Hartowanie kontenerów (*hardening*)** — kontener nie powinien działać jako administrator (root), nie powinien mieć dostępu do systemu gospodarza; standard *Pod Security* (poziom „restricted" — najbardziej restrykcyjny).
5. **Skanowanie obrazów (*image scanning*)** — obraz kontenera niesie cudze biblioteki ze znanymi podatnościami; trzeba go przeskanować *zanim* trafi na klaster (to wprost shift-left z DevSecOps).
6. **CIS Benchmark dla Kubernetes** (zestaw sprawdzonych ustawień bezpieczeństwa wydawany przez Center for Internet Security) — lista kontrolna „czy klaster jest ustawiony zgodnie z dobrą praktyką", mierzona narzędziem `kube-bench`.

**Czym „bezpieczeństwo Kubernetes" NIE jest (rozróżnienie zawodowca):**
- To nie administracja. Umiejętność wdrożenia aplikacji na klaster to kompetencja DevOps. Cyberspecjalista pyta: *kto ma dostęp, co może uciec z kontenera, jaki obraz wpuszczamy, co widzi sąsiedni pod.*
- Zgodność z CIS Benchmark ≠ bezpieczeństwo. Klaster może przejść listę kontrolną i wciąż być dziurawy (np. przez podatny obraz albo nadmiarowe RBAC, których benchmark nie złapie). Lista kontrolna to podłoga, nie sufit.
- Kontrola konfiguracji ≠ kontrola w czasie działania. `kube-bench` sprawdza *ustawienia*; co dzieje się *na żywo* w działającym kontenerze (np. nagłe uruchomienie powłoki) widzi dopiero detekcja czasu działania (*runtime*, np. **Falco**). To dwie różne warstwy.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja jest rdzeniem pracy **inżyniera bezpieczeństwa chmury / platformy (*cloud / platform security engineer*)** oraz inżyniera DevSecOps odpowiedzialnego za środowisko uruchomieniowe. Typowy dzień: przegląd uprawnień RBAC pod kątem nadmiaru, pisanie i testowanie polityk sieciowych, ustawianie reguł wpuszczania obrazów (*admission control* — patrz L3), reakcja na wynik skanu obrazu, audyt klastra wobec CIS Benchmark.

**Po co rynkowi ta kompetencja.** Skoro prawie każda firma uruchamia aplikacje na Kubernetes, to prawie każda ma tam też swoje najczęstsze realne wpadki: wystawiony do internetu panel zarządzania, sekrety w jawnym `base64`, kontenery z prawami administratora, brak segmentacji sieci. Regulacje (NIS2, DORA dla finansów) wymagają udokumentowanej kontroli dostępu i segmentacji — a to w świecie kontenerów znaczy właśnie RBAC i polityki sieciowe.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: czytanie klastra i pierwszy skan konfiguracji (3–6 h)

**Zakres wiedzy/umiejętności:**
- Z czego składa się klaster: warstwa sterująca (*control plane*), węzły (*nodes*), pody (*pods* — najmniejsza jednostka uruchomienia, jeden lub kilka kontenerów), przestrzenie nazw (*namespaces* — logiczne przegródki klastra).
- Uruchomienie **własnego, lokalnego** klastra treningowego (np. **minikube** lub **kind** — Kubernetes w kontenerze), odczytanie manifestu poda (pliku opisującego, co i jak ma się uruchomić).
- Model „4C" — gdzie kończy się odpowiedzialność chmury, a zaczyna Twoja (*shared responsibility* — współdzielona odpowiedzialność w usługach zarządzanych EKS/AKS/GKE).
- Uruchomienie **jednego** skanera konfiguracji bezpieczeństwa na własnym klastrze: `kube-bench` (audyt wobec CIS Benchmark) lub **Trivy**/**kubescape** (skan konfiguracji), i odczytanie raportu.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić lokalny klaster, odczytać manifest poda, uruchomić skaner konfiguracji i opisać słownie 3 znaleziska — co oznaczają dla bezpieczeństwa.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **„Działa" to nie „bezpieczne".** Domyślny klaster jest skonfigurowany pod wygodę, nie pod bezpieczeństwo — wszystko gada ze wszystkim, sekrety jawne, pody jako root. Amator widzi działającą aplikację i uznaje, że jest dobrze.
- **Zgodność z CIS to punkt startu, nie meta.** Raport „przeszło 80%" nie znaczy „bezpieczne" — znaczy „skonfigurowane standardowo".

### L2 — Zastosowanie: RBAC, polityki sieciowe, sekrety, skan obrazu (8–14 h)

**Zakres wiedzy/umiejętności:**
- **RBAC w praktyce:** utworzenie roli i przypisania (*role / rolebinding*) wg najmniejszego uprawnienia — konto dla danego zadania widzi tylko to, czego potrzebuje, i nic poza swoją przestrzenią nazw.
- **Polityki sieciowe:** ustawienie „domyślnie blokuj" (*default-deny*) i jawne przepuszczenie tylko potrzebnego ruchu między podami.
- **Sekrety:** zrozumienie, że `base64` to nie szyfrowanie; szyfrowanie sekretów „w spoczynku" (*encryption at rest*) i pojęcie zewnętrznego magazynu sekretów (*external secrets* — trzymanie haseł poza klastrem).
- **Hartowanie poda:** uruchomienie kontenera bez praw administratora, bez dostępu do gospodarza; standard Pod Security poziom „restricted".
- **Skanowanie obrazu:** uruchomienie **Trivy** na obrazie kontenera, odczyt listy podatności (CVE), wybór bezpieczniejszego obrazu bazowego (np. *distroless* — obraz okrojony do minimum, mniejsza powierzchnia ataku).

**Co student musi UMIEĆ ZROBIĆ:** napisać politykę RBAC najmniejszego uprawnienia, ustawić politykę sieciową „domyślnie blokuj", pokazać sekret poza jawnym `base64`, uruchomić pod bez praw roota i przeskanować obraz z interpretacją wyniku.

**Profesjonalne niuanse:**
- **RBAC łatwo nadać za szeroko.** „Damy `cluster-admin`, żeby działało" to najczęstszy realny błąd — przejęcie jednego takiego konta to przejęcie całego klastra. Zawodowiec nadaje minimum i to udowadnia.
- **Sekret w `base64` to sekret jawny.** Kto myśli, że `base64` coś chroni, ten zostawia hasła na widoku. To klasyczna pułapka amatora.
- **Skan obrazu też męczy alertami.** Obraz bazowy potrafi mieć setki CVE — zalew znalezisk to to samo zmęczenie alertami skanerów co w DevSecOps (§4). Liczy się osiągalność i wybór chudego obrazu, nie panika.

### L3 — Portfolio: pełne hartowanie klastra z kontrolą wpuszczania (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Audyt wobec CIS Benchmark z naprawą:** `kube-bench`, interpretacja, usunięcie istotnych odchyleń z uzasadnieniem (i świadomość, czego benchmark *nie* łapie).
- **Model RBAC najmniejszego uprawnienia dla całego klastra:** role per zespół/zadanie, separacja przestrzeni nazw, brak kont „na wszystko".
- **Segmentacja sieci:** polityki sieciowe „domyślnie blokuj" segmentujące przestrzenie nazw, jawnie udokumentowane przepływy.
- **Kontrola wpuszczania (*admission control*):** reguła, która **nie wpuści** na klaster poda łamiącego politykę — np. brak praw administratora, zakaz tagu `latest`, wymóg przeskanowanego obrazu. Narzędzia: **Kyverno** lub **OPA Gatekeeper** (otwarte silniki polityk). To jest *próg blokujący* z DevSecOps przeniesiony do klastra.
- **Skan obrazów jako bramka w taśmie:** obraz musi przejść skan, zanim trafi na klaster (połączenie z `CI/CD`).
- **Mapowanie na MITRE ATT&CK for Containers** (taktyki napastnika specyficzne dla kontenerów — np. ucieczka z kontenera) — świadome pokrycie i nazwanie luk.
- **Świadomość detekcji czasu działania:** czym jest **Falco** i co widzi w działającym kontenerze, czego nie widzi kontrola konfiguracji.

**Co student musi UMIEĆ ZROBIĆ:** zahartować klaster end-to-end — audyt CIS z naprawą, model RBAC najmniejszego uprawnienia, segmentacja sieci „domyślnie blokuj", kontrola wpuszczania blokująca pody łamiące politykę, skan obrazów jako bramka; zmapować pokrycie na ATT&CK for Containers z jawną luką. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Kontrola wpuszczania w trybie blokującym vs doradczym.** Reguła, która od razu blokuje wszystko, zatrzyma pracę zespołu i zostanie wyłączona — zawodowiec wdraża najpierw w trybie „tylko ostrzegaj" (*audit*), zbiera dane, potem przełącza na blokujący. To dokładnie napięcie *próg blokujący vs przepływ pracy* z DevSecOps.
- **Pokrycie ATT&CK to nie licznik reguł.** Sto reguł na jedną taktykę i zero na ucieczkę z kontenera to gorsze pokrycie niż równomierne. Liczy się mapa luk, nie liczba polityk.
- **Zgodność ≠ bezpieczeństwo (powtórka, ale to sedno L3).** Klaster zgodny z CIS, z nadmiarowym RBAC i podatnym obrazem, jest dziurawy. Zawodowiec patrzy na warstwy 4C łącznie.

### L4 — Realny przypadek profesjonalny: hartowanie zastanego, źle ustawionego klastra (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *zastanego, źle skonfigurowanego* klastra z działającymi obciążeniami i zahartowanie go **bez psucia działających aplikacji** — priorytetyzacja po zasięgu rażenia (*blast radius* — co napastnik osiągnie, jeśli wejdzie tędy), nie po kolejności z listy.
- Negocjacja kontroli wpuszczania z zespołem, którego pody łamią politykę — kultura, nie tylko konfiguracja.
- **Benchmark:** wynik studenta (redukcja powierzchni ataku, model RBAC, segmentacja, brak przerwania usług) zestawiony z tym, co osiągnął profesjonalista na tym samym klastrze.

### L5 — Biegłość: architektura bezpieczeństwa klastra wielodzierżawnego (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Bezpieczeństwo klastra wielodzierżawnego (*multi-tenant*)** — wiele zespołów/klientów na jednym klastrze z twardą izolacją; decyzja, co izolować przestrzenią nazw, a co osobnym klastrem.
- **Łańcuch dostaw obrazów:** podpisywanie obrazów (cosign/Sigstore) i kontrola wpuszczania **weryfikująca podpis** — na klaster wchodzi tylko obraz o potwierdzonym pochodzeniu (połączenie z SLSA z DevSecOps/CI-CD).
- **Ekonomia i utrzymywalność:** polityki, które da się utrzymać; detekcja czasu działania (Falco) za rozsądny koszt; współdzielona odpowiedzialność w chmurze zarządzanej.
- **Benchmark** wobec architekta bezpieczeństwa chmury: nie „czy zahartowane", lecz „czy izolacja jest szczelna, da się utrzymać i nie dławi zespołów".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Sekret w `base64` to nie szyfrowanie.** Najczęstsza pułapka. Sekret w Kubernetes domyślnie jest tylko zakodowany (każdy z dostępem do klastra go odczyta). Zawodowiec włącza szyfrowanie „w spoczynku" albo trzyma sekrety w zewnętrznym magazynie; amator myśli, że `base64` chroni.

2. **Nadmiarowe RBAC — „damy admina, żeby działało".** Najczęstszy realny błąd kontroli dostępu. Konto z `cluster-admin` „na wszelki wypadek" to pojedynczy punkt, którego przejęcie oznacza przejęcie całego klastra. Najmniejsze uprawnienie jest trudne, bo wymaga wiedzy, *czego naprawdę potrzeba* — i właśnie dlatego odróżnia zawodowca.

3. **Domyślnie wszystko gada ze wszystkim.** Bez polityk sieciowych każdy pod może połączyć się z każdym — przejęcie jednego kontenera daje napastnikowi ruch boczny (*lateral movement* — przesuwanie się po sieci) do reszty. Zawodowiec zaczyna od „domyślnie blokuj".

4. **Skanowanie obrazów też męczy alertami.** Obraz bazowy potrafi nieść setki CVE — to ten sam zalew, co w DevSecOps. Liczy się osiągalność podatności i wybór chudego obrazu (distroless), nie aktualizowanie wszystkiego w panice ani ignorowanie całości.

5. **Ucieczka z kontenera (*container escape*) i pody uprzywilejowane.** Kontener z prawami administratora, z dostępem do dysku gospodarza (*hostPath*) albo „uprzywilejowany" (*privileged*) to potencjalne wyjście z izolacji na maszynę gospodarza — i stamtąd na cały klaster. Hartowanie poda (bez roota, bez hostPath, Pod Security „restricted") to obrona przed tym.

6. **Kontrola wpuszczania: tryb blokujący vs doradczy.** Reguła wpuszczania, która od pierwszego dnia blokuje wszystko, zostanie wyłączona przez sfrustrowany zespół. Zawodowiec wdraża najpierw w trybie „tylko ostrzegaj", zbiera dane, dopiero potem blokuje — to *próg blokujący vs przepływ pracy* (wprost z DevSecOps) w realiach klastra.

7. **CIS Benchmark to podłoga, nie sufit.** Zgodność z listą kontrolną CIS (mierzona `kube-bench`) jest konieczna, ale niewystarczająca — nie złapie nadmiarowego RBAC ani podatnego obrazu. Zawodowiec traktuje ją jako punkt startu i patrzy na całe 4C.

8. **Kontrola konfiguracji ≠ detekcja czasu działania.** `kube-bench`/Trivy sprawdzają *ustawienia* (stan statyczny); co dzieje się *na żywo* (np. nieoczekiwane uruchomienie powłoki w kontenerze) widzi dopiero Falco. Cisza w skanie konfiguracji nie znaczy „nic złego się nie dzieje" — to dokładnie analogia „cisza w SIEM ≠ bezpiecznie".

9. **Łańcuch dostaw obrazów.** Obraz pobrany z publicznego rejestru może być przejęty, podszyty albo zawierać tylną furtkę. Dojrzała obrona to podpisywanie obrazów i wpuszczanie tylko zweryfikowanych (Sigstore/cosign, poziomy SLSA). Po incydentach łańcucha dostaw (`xz`, 2024) to nie ciekawostka.

10. **Współdzielona odpowiedzialność w chmurze zarządzanej.** W usługach EKS/AKS/GKE część warstwy sterującej zabezpiecza dostawca chmury, a część zostaje po Twojej stronie. Amator zakłada, że „chmura to ogarnia"; zawodowiec wie dokładnie, gdzie przebiega granica.

11. **Granica etyczno-prawna jest częścią kompetencji.** Pracujesz **wyłącznie na własnym, lokalnym klastrze treningowym** (minikube/kind). Skanowanie czy „testowanie" cudzego klastra bez pisemnej zgody to w Polsce przestępstwo (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Kubernetes muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie hartować klaster jako junior bezpieczeństwa chmury. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwszy klaster i audyt CIS** — lokalny klaster (kind/minikube), `kube-bench`, odczyt 3 znalezisk, model 4C | Klaster, manifest, skan konfiguracji, 4C | #1, #7 |
| P2 | L2 | **RBAC najmniejszego uprawnienia** — rola i przypisanie dla zadania, brak konta „na wszystko", dowód ograniczenia | RBAC, least privilege | #2 |
| P3 | L2 | **Segmentacja sieci „domyślnie blokuj"** — polityki sieciowe, jawne przepływy, próba połączenia zablokowana | Polityki sieciowe, default-deny, ruch boczny | #3 |
| P4 | L2 | **Sekrety i hartowanie poda** — sekret poza jawnym base64, pod bez roota/hostPath, Pod Security „restricted" | Sekrety, encryption at rest, hartowanie | #1, #5 |
| P5 | L2 | **Skan obrazu i chudy obraz bazowy** — Trivy na obrazie, interpretacja CVE, wybór distroless | Skanowanie obrazów, osiągalność, distroless | #4 |
| P6 | L3 | **Kontrola wpuszczania (admission)** — Kyverno/Gatekeeper blokujący pody łamiące politykę, tryb doradczy → blokujący | Admission control, próg blokujący w klastrze | #6 |
| P7 | L3 | **Skan obrazu jako bramka w taśmie** — wpięcie skanu w CI tak, że niezeskanowany obraz nie wchodzi na klaster | Bramka shift-left, połączenie z CI/CD | #4, #6 |
| P8 | L3 | **Mapowanie na ATT&CK for Containers + mapa luk** — pokrycie taktyk (np. ucieczka z kontenera), jawna luka | Mapowanie ATT&CK, pokrycie | #5, #8 |
| P9 | L3 | **Hartowanie end-to-end + świadomość runtime** — złożenie RBAC+sieć+admission+CIS, czym jest Falco i co widzi | Synteza hartowania, runtime vs config | #7, #8 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — hartowanie zastanego klastra bez psucia usług; architektura wielodzierżawna + podpisywanie obrazów (SLSA/cosign) + ekonomia; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #9, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (klaster+CIS) → P2 (RBAC) → P3 (sieć) → P4 (sekrety+hartowanie) → P5 (skan obrazu) → P6 (admission) → P7 (bramka w taśmie) → P8 (ATT&CK) → P9 (synteza+runtime). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Bezpieczeństwo Kubernetes **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Linux i wiersz poleceń** (`Linux`, `Bash`; projekt partii 1 `cyber-hardening-linux-bash`) — kontenery to w środku Linux; bez rozumienia procesów, użytkowników, uprawnień plików student nie zrozumie, czemu pod „jako root" jest groźny. **Wymagane przed L1.**
2. **Podstawy sieci i TCP/IP** (`Network`, `TCP/IP`) — bez pojęcia adresu, portu, ruchu między usługami student nie napisze polityki sieciowej ani nie zrozumie ruchu bocznego. **Wymagane przed L2 (polityki sieciowe).**
3. **Pojęcie tożsamości i dostępu** (`IAM`; projekt partii 1 `cyber-iam-active-directory-lab`) — RBAC to ten sam pomysł (kto, do czego, najmniejsze uprawnienie) w realiach klastra. **Wymagane przed L2 (RBAC).**
4. **Rdzeń DevSecOps** (`DevSecOps`, research `devsecops.md`) — próg blokujący, skan jako krok taśmy, zmęczenie alertami skanerów, łańcuch dostaw. Skan obrazów i kontrola wpuszczania to wprost te pojęcia w klastrze. **Wymagane/równoległe na L2–L3.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym klastrze). **Wymagane od L1.**

**Czego bezpieczeństwo Kubernetes dostarcza dalej:** to środowiskowe domknięcie grupy — pokazuje, gdzie *fizycznie* działa wszystko, co zabezpiecza DevSecOps i CI/CD (obraz zbudowany i przeskanowany w taśmie ląduje właśnie na klastrze). Łączy też z grupą chmurową ścieżki (`AWS`/`Azure`/`GCP`) przez współdzieloną odpowiedzialność.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja i wzorce bezpieczeństwa (oficjalne, darmowe):**
- Kubernetes — oficjalny przewodnik bezpieczeństwa (Security): https://kubernetes.io/docs/concepts/security/
- Kubernetes — Pod Security Standards (poziomy hartowania poda): https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes — RBAC (kontrola dostępu): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes — Network Policies (polityki sieciowe): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes — Secrets (i szyfrowanie w spoczynku): https://kubernetes.io/docs/concepts/configuration/secret/

**Narzędzia (otwartoźródłowe, darmowe — do laba):**
- minikube / kind — lokalny klaster treningowy: https://minikube.sigs.k8s.io/docs/ · https://kind.sigs.k8s.io/
- kube-bench (audyt wobec CIS Benchmark): https://github.com/aquasecurity/kube-bench
- Trivy (skan obrazów i konfiguracji): https://trivy.dev/
- Kyverno (silnik polityk / kontrola wpuszczania): https://kyverno.io/docs/
- OPA Gatekeeper (silnik polityk): https://open-policy-agent.github.io/gatekeeper/
- Falco (detekcja zagrożeń w czasie działania): https://falco.org/docs/
- Sigstore / cosign (podpisywanie obrazów): https://www.sigstore.dev/

**Standardy, normy i taktyki napastnika (oficjalne):**
- CIS Kubernetes Benchmark (sprawdzona konfiguracja bezpieczeństwa): https://www.cisecurity.org/benchmark/kubernetes
- NSA/CISA Kubernetes Hardening Guide (przewodnik hartowania): https://www.cisa.gov/news-events/alerts/2022/03/15/updated-kubernetes-hardening-guide
- MITRE ATT&CK for Containers (taktyki napastnika w kontenerach): https://attack.mitre.org/matrices/enterprise/containers/
- SLSA (poziomy zabezpieczenia łańcucha dostaw): https://slsa.dev/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- Dyrektywa NIS2 (cyberbezpieczeństwo, kontrola dostępu i segmentacja): https://eur-lex.europa.eu/eli/dir/2022/2555
- Art. 267 Kodeksu karnego (nieautoryzowany dostęp): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Punkt wrażliwy:** cały lab działa na *własnym lokalnym* klastrze (kind/minikube) — żadnego skanowania cudzych klastrów (art. 267 KK), twarda klauzula w każdym projekcie. Skanery (Trivy, kube-bench) pobierają bazy podatności z internetu — brak danych osobowych. Linki do weryfikacji aktualności przed wejściem do `learning_resources` (dokumentacja K8s i ATT&CK często zmienia adresy podstron).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO), który zatrudnia juniorów do bezpieczeństwa chmury z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research zsuwał się w administrację Kubernetesem.** Pierwsza wersja uczyła „jak wdrożyć aplikację na klaster". CISO: „mam DevOpsów do wdrażania; szukam kogoś, kto wie, *kto ma dostęp i co ucieknie z kontenera*". **Poprawka:** twarda soczewka „zabezpieczanie, nie administracja" już w nagłówku; każdy poziom zaczyna od pytania bezpieczeństwa (RBAC, sieć, sekrety, obraz), nie od wdrożenia. Uzasadnione `lift`em 0,69 w §1.

2. **Słabość: sekrety i `base64` potraktowane pobieżnie.** CISO: „pierwszy błąd, który widzę u juniorów — sekret w base64 i przekonanie, że to szyfrowanie". **Poprawka:** wyniosłam do niuansu #1 i osobnego projektu P4 (sekret poza jawnym base64, szyfrowanie w spoczynku).

3. **Słabość: kontrola wpuszczania bez kultury wdrożenia.** Pierwsza wersja uczyła „zablokuj złe pody". CISO: „bramka, która blokuje wszystko od pierwszego dnia, zostanie wyłączona — pokaż, że junior rozumie tryb doradczy najpierw". **Poprawka:** niuans #6 (tryb doradczy → blokujący) i wpisanie tego w projekt P6 — to przeniesienie napięcia *próg vs przepływ pracy* z DevSecOps do klastra.

4. **Słabość: brak rozróżnienia konfiguracja vs czas działania.** CISO: „klaster zgodny z CIS i tak da się przejąć w czasie działania — junior musi wiedzieć, że skan konfiguracji to nie wszystko". **Poprawka:** niuans #8 + świadomość Falco w L3 (projekt P9). Świadomie *nie* robię z Falco pełnej umiejętności L3 (to bliżej SOC/detekcji) — tylko świadomość warstwy, uczciwie oznaczona.

5. **Słabość: „zgodność = bezpieczeństwo".** CISO: „junior, który myśli, że przejście CIS Benchmark znaczy bezpieczny klaster, jest groźny, bo uspokaja zarząd fałszywie". **Poprawka:** niuans #7 (CIS to podłoga, nie sufit) powtórzony jako sedno L3; model 4C pokazuje, że zgodność łapie tylko część warstw.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Kubernetes/K8s, kontener, orkiestrator, control plane, node, pod, namespace, 4C, RBAC, role/rolebinding, network policy, default-deny, secret, base64, encryption at rest, external secrets, hardening, Pod Security, image scanning, distroless, CIS Benchmark, kube-bench, admission control, Kyverno, Gatekeeper, ATT&CK for Containers, container escape, hostPath, privileged, lateral movement, runtime, Falco, blast radius, multi-tenant, shared responsibility, SLSA, cosign). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie 9 projektów L1–L3 z niuansami #1–#8, #11. Niuanse #9 (łańcuch dostaw obrazów w skali), #10 (współdzielona odpowiedzialność w chmurze zarządzanej) domkną się na L4/L5 (zależność od Ethana/Leo). Soczewka bezpieczeństwa utrzymana w całości — to nie kurs Kubernetesa, to kurs *hartowania* Kubernetesa. Uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
