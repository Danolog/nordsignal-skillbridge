# Research kompetencji: CI/CD

> **Status:** research liścia w ETAP E3 — powstaje wg wzorca `tools/content/research/siem.md` (golden-example). North Star §0.1 (poprzeczka: „czy pracodawca w EU uzna kandydata za przygotowanego") jest nadrzędny nad całym tym plikiem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Soczewka:** **bezpieczeństwo taśmy dostarczania kodu, nie jej budowanie.** Student nie uczy się „napisać taśmę CI/CD" — uczy się ją *zabezpieczać*: sekrety w taśmie, podpisywanie artefaktów, bezpieczeństwo łańcucha dostaw (SLSA), bramki bezpieczeństwa. Nadbudowuje narzędziowo nad rdzeniem koncepcyjnym grupy — `DevSecOps` (`tools/content/research/devsecops.md`).

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `CI/CD` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „DevSecOps i konteneryzacja" (`unionShare` grupy: **10,8%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **5,7%** ofert ścieżki wymienia CI/CD |
| **Liczba ofert (`offers`)** | **21** |
| **`kind`** | `concept` (kompetencja koncepcyjna — proces, nie pojedyncze narzędzie) |
| **`lift`** | **0,60** (siła powiązania liścia z tą ścieżką — patrz wniosek niżej) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Kubernetes | 5,7 | 21 | tool | 0,69 |
| **CI/CD** (ten plik) | 5,7 | 21 | concept | **0,60** |
| DevSecOps | 3,0 | 11 | concept | 14,01 |

**Wniosek dla autoringu — najniższy `lift` w grupie wyznacza najostrzejszą soczewkę.** CI/CD ma `lift` **0,60** — najniższy z trójki, mocno poniżej 1. To znaczy, że „CI/CD" jest kompetencją *uniwersalną*: pojawia się w ofertach backendu, data engineera, MLOps równie często albo częściej (w modelu ten sam liść wisi w grupach „Wdrażanie modeli i MLOps" i „Inżynieria danych w chmurze"). Sama umiejętność *zbudowania* taśmy to nie jest kompetencja cyberspecjalisty — to umiejętność każdego inżyniera. **Cyberspecjalistę pytają o coś węższego i trudniejszego: czy potrafi tę taśmę *zabezpieczyć*** — bo taśma CI/CD to dziś jeden z najgorętszych celów ataku (ma dostęp do kodu, sekretów i produkcji jednocześnie). Stąd twarda soczewka: zero budowania taśmy dla samego budowania, wszystko pod kątem „gdzie tu wyciekają sekrety, co podpisujemy, czy łańcuch dostaw jest pewny, co blokuje wydanie". Rdzenia pojęciowego (próg blokujący, shift-left, łańcuch dostaw) dostarcza research `DevSecOps`; CI/CD *konkretyzuje go narzędziowo* na samej taśmie.

---

## 2. Definicja kompetencji i jej rola w pracy

**CI/CD (*Continuous Integration / Continuous Delivery* — ciągła integracja i ciągłe dostarczanie)** to zautomatyzowana „taśma produkcyjna" dla oprogramowania: po każdej zmianie kodu maszyna automatycznie buduje aplikację, uruchamia testy i wypycha gotowy produkt — czasem nawet kilkadziesiąt razy dziennie. Taśma składa się z kroków (*steps*): pobranie kodu → budowanie → testy → wytworzenie artefaktu (*artifact* — gotowa paczka, np. obraz kontenera) → wdrożenie.

Z punktu widzenia bezpieczeństwa taśma CI/CD to **wyjątkowo łakomy cel**, bo w jednym miejscu ma trzy rzeczy naraz: dostęp do całego kodu, dostęp do sekretów (kluczy do chmury, baz, zewnętrznych usług) i prawo do wypchnięcia czegokolwiek na produkcję. Kto przejmie taśmę, przejmuje wszystko — nie musi włamywać się do produkcji, bo taśma sama tam wdraża.

Zabezpieczanie taśmy to cztery obszary, które amator pomija, bo „taśma zielona, czyli dobrze":

1. **Sekrety w taśmie (*secrets*)** — klucze i hasła, których taśma używa, by łączyć się z chmurą i usługami. Najczęstsze wycieki: sekret zaszyty na sztywno w pliku taśmy, sekret wypisany do dziennika (*log*) budowania, sekret wykradziony przez złośliwą zmianę przysłaną z zewnątrz (z rozwidlenia repozytorium — *fork*).
2. **Bezpieczeństwo łańcucha dostaw (*supply chain*)** — taśma pobiera i wykonuje cudzy kod: biblioteki i gotowe „akcje"/wtyczki. Przejęta wtyczka albo podszyta biblioteka wpuszcza napastnika prosto do taśmy.
3. **Podpisywanie artefaktów i pochodzenie (*signing + provenance*)** — skąd wiadomo, że paczka wdrażana na produkcję to *ta* zbudowana z *tego* kodu, a nie podmieniona po drodze. Podpis kryptograficzny + zapis pochodzenia (SLSA).
4. **Bramki bezpieczeństwa (*security gates*)** — kroki taśmy, które *zatrzymują* wydanie, jeśli skan znajdzie poważną podatność, sekret albo niepodpisany artefakt. To *próg blokujący* z DevSecOps, osadzony w taśmie.

**Czym „bezpieczeństwo CI/CD" NIE jest (rozróżnienie zawodowca):**
- To nie budowanie taśmy. Napisanie działającej taśmy to kompetencja DevOps/inżyniera. Cyberspecjalista pyta: *gdzie tu wyciekają sekrety, kto może edytować taśmę, czy wykonujemy zaufany kod, co blokuje wydanie.*
- „Zielona taśma" ≠ bezpieczna taśma. Taśma może przechodzić wszystkie testy i jednocześnie wypisywać sekrety do dziennika, pobierać przejętą wtyczkę i wdrażać niepodpisany artefakt.
- Bezpieczeństwo taśmy ≠ bezpieczeństwo aplikacji. Aplikacja może być czysta, a taśma — przejęta. To osobna warstwa ataku (tzw. *poisoned pipeline execution* — wykonanie zatrutej taśmy).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja jest rdzeniem pracy **inżyniera DevSecOps** i **inżyniera bezpieczeństwa łańcucha dostaw (*supply chain security*)**. Typowy dzień: przegląd uprawnień taśmy (czy nie ma długowiecznego klucza do chmury), przypinanie wersji zewnętrznych wtyczek, ustawianie bramek (skan sekretów / SCA / podpis), reakcja na alert o podatnej zależności, audyt, kto może edytować plik taśmy.

**Po co rynkowi ta kompetencja.** Im szybciej firmy wdrażają (kilkadziesiąt razy dziennie), tym groźniejsza staje się przejęta taśma — jedno złośliwe wdrożenie roznosi się błyskawicznie. Głośne incydenty łańcucha dostaw (SolarWinds 2020, przejęcie popularnej wtyczki `tj-actions/changed-files` w 2025, tylna furtka w bibliotece `xz` w 2024) przeniosły temat na poziom zarządu. Regulacje to utrwalają: nadchodzący Cyber Resilience Act i wytyczne NIS2 wymagają udokumentowanego, pewnego procesu wytwarzania — w tym pochodzenia komponentów (SBOM).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: anatomia taśmy i pierwszy skan sekretów (3–6 h)

**Zakres wiedzy/umiejętności:**
- Anatomia taśmy: trigger (co ją uruchamia) → kroki (budowanie, test) → artefakt → wdrożenie. Odczytanie pliku taśmy (np. *workflow* w GitHub Actions na własnym repozytorium).
- Gdzie w taśmie *żyją* sekrety i czemu są łakomym celem (jeden klucz = dostęp do chmury).
- Uruchomienie prostej, własnej taśmy (GitHub Actions na własnym, darmowym repozytorium) — budowanie + test.
- Uruchomienie **skanu sekretów** (np. **Gitleaks**) na własnym repozytorium i odczyt, czy gdzieś nie wyciekł klucz.

**Co student musi UMIEĆ ZROBIĆ:** odczytać plik taśmy i wskazać, gdzie są sekrety i co taśma ma prawo zrobić; uruchomić własną prostą taśmę; uruchomić skan sekretów i zinterpretować wynik.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Taśma ma więcej władzy, niż się wydaje.** Domyślnie potrafi czytać i zapisywać repozytorium, sięgać po sekrety, wdrażać. Amator widzi „skrypt, który buduje"; zawodowiec widzi „proces z dostępem do kodu, sekretów i produkcji".
- **Sekret wypisany do dziennika budowania to sekret jawny.** Dziennik często widzi więcej osób niż sam sekret — to klasyczny, niewidoczny wyciek.

### L2 — Zastosowanie: sekrety, uprawnienia, przypinanie wtyczek, pierwsze bramki (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Zarządzanie sekretami w taśmie:** żadnych sekretów na sztywno w pliku; magazyn sekretów taśmy; zamiast długowiecznego klucza do chmury — **token krótkotrwały przez OIDC** (*OpenID Connect* — taśma dostaje jednorazowy, krótki token zamiast stałego hasła do chmury).
- **Najmniejsze uprawnienie taśmy:** ograniczenie, co taśma *może* (np. tylko odczyt repozytorium, jeśli nie musi zapisywać) — odpowiednik least privilege z IAM/RBAC.
- **Przypinanie zewnętrznych wtyczek do wersji niezmiennej:** używanie wtyczki przez pełny skrót commita (*SHA* — niezmienny identyfikator), nie przez ruchomą etykietę (*tag*), którą napastnik może podmienić.
- **Pierwsze bramki bezpieczeństwa:** wpięcie skanu sekretów + analizy zależności (SCA — z DevSecOps) jako kroku, który zatrzymuje taśmę przy poważnym znalezisku.

**Co student musi UMIEĆ ZROBIĆ:** przenieść sekrety do magazynu i pokazać dostęp do chmury przez krótkotrwały token (OIDC) zamiast stałego klucza; ograniczyć uprawnienia taśmy do minimum; przypiąć wtyczki do SHA; ustawić bramkę skanu sekretów/SCA z uzasadnionym progiem.

**Profesjonalne niuanse:**
- **Stały klucz do chmury w taśmie to bomba zegarowa.** Długowieczny sekret, który wyciekł raz, działa, póki ktoś go nie unieważni. Krótkotrwały token (OIDC) sam wygasa — dlatego to dziś standard. Amator wkleja stały klucz „bo działa".
- **Etykieta wtyczki (*tag*) jest ruchoma — skrót (*SHA*) nie.** Przypięcie do etykiety `v3` znaczy „cokolwiek autor (albo napastnik, który przejął jego konto) tam podmieni". Incydent `tj-actions/changed-files` (2025) to dokładnie ten scenariusz. Przypięcie do SHA zamyka tę furtkę.
- **Zmiana przysłana z rozwidlenia (*fork*) może próbować wykraść sekrety.** Taśma uruchomiona na cudzej zmianie to ryzyko — zawodowiec wie, że sekrety nie powinny być dostępne dla zmian z zewnątrz bez kontroli.

### L3 — Portfolio: bezpieczna taśma z podpisem, SBOM i SLSA (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Pełen zestaw bramek:** skan sekretów + SCA + SAST (z DevSecOps) jako kroki zatrzymujące taśmę, z polityką „co blokuje, co tylko ostrzega".
- **SBOM (*Software Bill of Materials* — spis składników oprogramowania):** automatyczne wygenerowanie listy wszystkich bibliotek w artefakcie (np. narzędziem **Syft**) — żeby po wykryciu nowej podatności wiedzieć w minutę, czy nas dotyczy.
- **Podpisywanie artefaktu (*signing*):** podpisanie zbudowanej paczki/obrazu (Sigstore/**cosign**), tak by odbiorca mógł zweryfikować, że to *ta* paczka z *tej* taśmy.
- **Pochodzenie i SLSA (*Supply-chain Levels for Software Artifacts* — poziomy zabezpieczenia łańcucha dostaw):** wygenerowanie zapisu pochodzenia (*provenance* — „kto, z czego, jak zbudował ten artefakt") i zrozumienie, co znaczą kolejne poziomy SLSA.
- **Ochrona samej taśmy:** chronione gałęzie repozytorium, wymóg recenzji zmiany, ograniczenie, kto może edytować plik taśmy (bo edycja taśmy = władza nad wszystkim).
- **Mapowanie zagrożeń:** odniesienie do znanych klas ataków na taśmę (np. macierz zagrożeń łańcucha dostaw OWASP / SLSA) — świadome nazwanie, co taśma pokrywa, a czego nie.

**Co student musi UMIEĆ ZROBIĆ:** zbudować taśmę z pełnym zestawem bramek i polityką progu, generującą SBOM, podpisującą artefakt i wytwarzającą zapis pochodzenia (provenance); ochronić samą taśmę (chronione gałęzie, recenzja, kontrola edycji); zmapować pokrycie na znane klasy ataków łańcucha dostaw z jawną luką. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Niepodpisany artefakt to artefakt, którego nikt nie umie zweryfikować.** Bez podpisu odbiorca (np. klaster Kubernetes wpuszczający obraz — patrz `kubernetes.md`) wierzy na słowo. Podpis + weryfikacja przy wdrożeniu domyka łańcuch.
- **SBOM jest bezużyteczny, jeśli powstaje raz i ląduje w szufladzie.** Wartość SBOM ujawnia się dopiero, gdy wybucha nowa podatność (jak Log4Shell) i w minutę sprawdzasz, czy Cię dotyczy. Zawodowiec generuje go przy każdym wydaniu i przechowuje.
- **Kto może edytować plik taśmy, ten może obejść wszystkie bramki.** Najmocniejsza bramka nic nie da, jeśli napastnik (albo niefrasobliwy współpracownik) po prostu zmieni taśmę. Ochrona samej taśmy jest warunkiem sensu pozostałych zabezpieczeń.

### L4 — Realny przypadek profesjonalny: hartowanie zastanej taśmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *zastanej* taśmy z długiem (stałe klucze, wtyczki przypięte do ruchomych etykiet, sekrety w dzienniku, brak podpisów) i zahartowanie jej **bez zatrzymywania wydań** — kolejność napraw wg ryzyka, negocjacja z zespołem.
- Wpięcie bramek tak, by nie zablokować całego zaległego długu (baseline z DevSecOps) — blokuj nowe, spłacaj stare planem.
- **Benchmark:** wynik studenta (redukcja powierzchni ataku taśmy, OIDC zamiast stałych kluczy, podpisy, brak przestoju wydań) zestawiony z tym, co osiągnął profesjonalista.

### L5 — Biegłość: strategia bezpieczeństwa łańcucha dostaw dla organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia łańcucha dostaw dla wielu zespołów:** docelowy poziom SLSA, zaufana platforma budowania, wymóg podpisów i weryfikacji przy wdrożeniu, polityka SBOM w całej organizacji.
- **Ekonomia i tempo:** bramki, które nie dławią taśmy (skan wydłużający budowanie o pół godziny zostanie wyłączony) — świadomy dobór, co przy każdej zmianie, a co rzadziej.
- **Wymuszanie polityki:** centralne, sprawdzalne reguły dla wszystkich taśm zamiast „każdy zespół po swojemu".
- **Benchmark** wobec architekta bezpieczeństwa łańcucha dostaw: nie „czy są bramki", lecz „czy łańcuch jest pewny od kodu po wdrożenie i da się go utrzymać przy realnym tempie".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Sekrety w taśmie — trzy drogi wycieku.** (a) zaszyte na sztywno w pliku taśmy; (b) wypisane do dziennika budowania (widzi je więcej osób niż sam sekret); (c) wykradzione przez złośliwą zmianę z rozwidlenia repozytorium. Zawodowiec trzyma sekrety w magazynie, maskuje w dzienniku i odcina dostęp dla zmian z zewnątrz.

2. **Stały klucz vs token krótkotrwały (OIDC).** Długowieczny klucz do chmury w taśmie to bomba zegarowa — póki ktoś go nie unieważni, działa po wycieku. Token krótkotrwały przez OIDC sam wygasa i jest dziś standardem dojrzałego zespołu. To rozdzielnik amator↔zawodowiec.

3. **Przypinanie wtyczek: etykieta jest ruchoma, skrót nie.** Użycie cudzej wtyczki przez etykietę `v3` znaczy „ufam, że autor (i każdy, kto przejmie jego konto) nigdy nie podmieni tego, co pod nią jest". Przejęcie `tj-actions/changed-files` (2025) to dokładnie ten atak. Przypięcie do pełnego skrótu commita (SHA) zamyka furtkę.

4. **Łańcuch dostaw — taśma wykonuje cudzy kod.** Biblioteki i wtyczki to cudzy kod uruchamiany z pełnymi prawami taśmy. Podszywanie się pod popularne nazwy (*typosquatting*, *dependency confusion*), przejęte paczki, tylne furtki (`xz`, 2024) — to realne wektory. Odpowiedź: SBOM, podpisy, weryfikacja pochodzenia, poziomy SLSA.

5. **Próg blokujący vs tempo wydań.** Bramka, która zatrzymuje każde wydanie przy byle ostrzeżeniu, zostanie obejściem albo wyłączona — zespół traci zaufanie do bezpieczeństwa. To to samo napięcie *próg blokujący vs przepływ pracy* z DevSecOps (§4), tu na samej taśmie. Zawodowiec kalibruje, co blokuje, a co ostrzega.

6. **Niepodpisany artefakt = brak weryfikowalności.** Bez podpisu kryptograficznego odbiorca (klaster, sklep, klient) nie wie, czy paczka to *ta* zbudowana z *tego* kodu, czy podmieniona po drodze. Podpis (Sigstore/cosign) + weryfikacja przy wdrożeniu domyka łańcuch — i łączy się z kontrolą wpuszczania w Kubernetes.

7. **SBOM ma sens tylko żywy.** Spis składników wygenerowany raz i schowany jest bezużyteczny. Wartość ujawnia się, gdy wybucha nowa podatność i w minutę sprawdzasz, czy Cię dotyczy. Zawodowiec generuje SBOM przy każdym wydaniu.

8. **Kto edytuje taśmę, obchodzi wszystkie bramki.** Najmocniejszy zestaw skanów nie znaczy nic, jeśli napastnik zmieni sam plik taśmy. Ochrona taśmy (chronione gałęzie, wymóg recenzji, kontrola edycji) jest warunkiem sensu reszty — to często pomijany fundament.

9. **„Zielona taśma" ≠ bezpieczna.** Taśma przechodząca testy może jednocześnie wyciekać sekrety, pobierać przejętą wtyczkę i wdrażać niepodpisany artefakt. Zielony znaczek mówi o poprawności, nie o bezpieczeństwie — amator myli jedno z drugim.

10. **Granica etyczno-prawna jest częścią kompetencji.** Pracujesz **wyłącznie na własnym repozytorium i własnej taśmie**. Próba „przetestowania" cudzej taśmy, wstrzyknięcia zmiany do cudzego projektu czy podejrzenia cudzych sekretów to w Polsce przestępstwo (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty CI/CD muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie zabezpieczać taśmę jako junior DevSecOps / bezpieczeństwa łańcucha dostaw. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Anatomia i władza taśmy** — odczyt pliku taśmy, wskazanie sekretów i uprawnień, własna prosta taśma na GitHub Actions | Anatomia taśmy, gdzie żyją sekrety, władza taśmy | #1, #9 |
| P2 | L1 | **Pierwszy skan sekretów** — Gitleaks na własnym repo, interpretacja, świadomość dziennika budowania | Skan sekretów, wyciek przez dziennik | #1 |
| P3 | L2 | **Sekrety i OIDC zamiast stałego klucza** — magazyn sekretów, krótkotrwały token do chmury | Zarządzanie sekretami, OIDC | #1, #2 |
| P4 | L2 | **Najmniejsze uprawnienie taśmy** — ograniczenie praw taśmy do minimum, ryzyko zmian z rozwidlenia | Least privilege taśmy, fork | #1 |
| P5 | L2 | **Przypinanie wtyczek do SHA + pierwsza bramka** — wtyczki przez skrót, bramka skanu sekretów/SCA z progiem | Przypinanie wersji, bramka, próg | #3, #5 |
| P6 | L3 | **SBOM — żywy spis składników** — generowanie SBOM (Syft) przy wydaniu, użycie przy nowej podatności | SBOM żywy | #7 |
| P7 | L3 | **Podpisywanie artefaktu** — podpis paczki/obrazu (cosign/Sigstore) i weryfikacja | Podpis, weryfikacja, pochodzenie | #6 |
| P8 | L3 | **Pochodzenie i SLSA** — zapis provenance, zrozumienie poziomów SLSA, mapa zagrożeń łańcucha dostaw | SLSA, provenance, łańcuch dostaw | #4 |
| P9 | L3 | **Ochrona samej taśmy** — chronione gałęzie, wymóg recenzji, kontrola edycji taśmy | Ochrona taśmy | #8 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — hartowanie zastanej taśmy bez przestoju wydań; strategia łańcucha dostaw dla organizacji (SLSA docelowy, ekonomia, wymuszanie polityki); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #5, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (anatomia) → P2 (skan sekretów) → P3 (sekrety/OIDC) → P4 (uprawnienia) → P5 (przypinanie+bramka) → P6 (SBOM) → P7 (podpis) → P8 (SLSA/pochodzenie) → P9 (ochrona taśmy). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Bezpieczeństwo CI/CD **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Praca z kodem i wersjonowaniem** — podstawy git (commit, gałąź, pull request, skrót/SHA), wiersz poleceń (`Linux`, `Bash`; projekt partii 1 `cyber-hardening-linux-bash`). Bez tego pojęcia „przypnij wtyczkę do SHA" czy „chroniona gałąź" są puste. **Wymagane przed L1.**
2. **Pojęcie tożsamości i dostępu** (`IAM`; projekt partii 1 `cyber-iam-active-directory-lab`) — uprawnienia taśmy i token OIDC to ten sam pomysł (kto, do czego, najmniejsze uprawnienie). **Wymagane przed L2.**
3. **Rdzeń DevSecOps** (`DevSecOps`, research `devsecops.md`) — próg blokujący, shift-left, SCA/SAST, zmęczenie alertami skanerów, łańcuch dostaw. Bramki bezpieczeństwa w taśmie to wprost te pojęcia. **Wymagane/równoległe na L2–L3.**
4. **Podstawy bezpieczeństwa aplikacji** (`OWASP`, `SCA`) — żeby zrozumieć, *co* bramka SCA/SAST w taśmie wykrywa. **Wymagane przed L2 (bramki).**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym repozytorium i własnej taśmie). **Wymagane od L1.**

**Czego bezpieczeństwo CI/CD dostarcza dalej:** domyka łańcuch grupy — taśma to miejsce, w którym wszystkie kontrole DevSecOps (skan kodu, zależności, sekretów) stają się *automatyczne i wymuszone*, a podpisany artefakt z taśmy trafia na zahartowany klaster Kubernetes (kontrola wpuszczania weryfikuje podpis — `kubernetes.md`). CI/CD jest więc spoiwem między „shift-left w kodzie" (DevSecOps) a „bezpiecznym środowiskiem uruchomienia" (Kubernetes).

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Wiedza o bezpieczeństwie taśmy i łańcucha dostaw (autorytatywne, otwarte):**
- OWASP Top 10 CI/CD Security Risks (najczęstsze ryzyka taśmy): https://owasp.org/www-project-top-10-ci-cd-security-risks/
- SLSA (poziomy zabezpieczenia łańcucha dostaw): https://slsa.dev/
- CNCF Software Supply Chain Best Practices (dobre praktyki łańcucha dostaw): https://github.com/cncf/tag-security
- NIST SP 800-218 „Secure Software Development Framework (SSDF)": https://csrc.nist.gov/pubs/sp/800/218/final
- NIST SP 800-204D (bezpieczeństwo łańcucha dostaw w CI/CD): https://csrc.nist.gov/pubs/sp/800/204/d/final

**Narzędzia (otwartoźródłowe, darmowe — do laba):**
- GitHub Actions — dokumentacja taśmy: https://docs.github.com/en/actions
- GitHub — bezpieczne korzystanie z Actions (sekrety, uprawnienia, OIDC): https://docs.github.com/en/actions/security-guides
- Gitleaks (skan sekretów): https://github.com/gitleaks/gitleaks
- Syft (generowanie SBOM — spisu składników): https://github.com/anchore/syft
- Sigstore / cosign (podpisywanie artefaktów): https://www.sigstore.dev/
- Trivy (SCA / skan artefaktu): https://trivy.dev/

**Standardy formatu i klasyfikacje (oficjalne):**
- CycloneDX / SPDX (otwarte formaty SBOM): https://cyclonedx.org/ · https://spdx.dev/
- MITRE CWE (klasyfikacja słabości oprogramowania): https://cwe.mitre.org/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- Dyrektywa NIS2 (cyberbezpieczeństwo, bezpieczny proces): https://eur-lex.europa.eu/eli/dir/2022/2555
- Cyber Resilience Act (cyberodporność produktów cyfrowych, wymóg SBOM/pochodzenia): https://eur-lex.europa.eu/eli/reg/2024/2847
- Art. 267 Kodeksu karnego (nieautoryzowany dostęp): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Punkt wrażliwy:** cały lab działa na *własnym* repozytorium i *własnej* taśmie — żadnego testowania cudzych taśm ani wstrzykiwania zmian do cudzych projektów (art. 267 KK), twarda klauzula w każdym projekcie. Drugi punkt: darmowe minuty GitHub Actions na koncie studenta — projekty muszą działać w granicach darmowego planu (jak Splunk Free w partii 1), żeby nie wymuszać wydatku. Linki do weryfikacji aktualności przed wejściem do `learning_resources` (zwłaszcza Cyber Resilience Act — świeży akt, i podstrony NIST 800-204D).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO), który zatrudnia juniorów DevSecOps / bezpieczeństwa łańcucha dostaw z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research uczył *budowania* taśmy, nie jej zabezpieczania.** Pierwsza wersja była mini-kursem DevOps. CISO: „taśmę zbuduje mi każdy junior; chcę kogoś, kto wie, że to najgorętszy cel ataku w firmie". **Poprawka:** twarda soczewka „bezpieczeństwo taśmy, nie budowanie" już w nagłówku, uzasadniona najniższym `lift`em 0,60 w §1; każdy poziom zaczyna od pytania bezpieczeństwa (sekrety, uprawnienia, podpis), nie od „jak zbudować".

2. **Słabość: stałe klucze do chmury jako norma.** CISO: „pierwszy błąd, który widzę — długowieczny klucz do AWS wklejony do taśmy; jak wycieknie, działa miesiącami". **Poprawka:** niuans #2 + projekt P3 (OIDC, token krótkotrwały zamiast stałego klucza) jako osobna, twarda umiejętność L2.

3. **Słabość: pominięty atak na łańcuch dostaw przez wtyczki.** CISO: „junior przypina wtyczkę do `v3` i nie wie, że to znaczy «ufam, że nikt nigdy tego nie przejmie» — a `tj-actions` w 2025 pokazał, że przejmą". **Poprawka:** niuans #3 (etykieta ruchoma vs SHA) z konkretnym incydentem, projekt P5 (przypinanie do SHA). Dodałam też #4 i całe L3 wokół SLSA/SBOM/podpisów.

4. **Słabość: «zielona taśma» mylona z bezpieczną.** CISO: „junior pokazuje zielony znaczek jako dowód bezpieczeństwa — a taśma wycieka sekrety do dziennika". **Poprawka:** niuans #9 (zielona ≠ bezpieczna) + #1c (wyciek przez dziennik), wbudowane w P1/P2.

5. **Słabość: pominięta ochrona samej taśmy.** CISO: „najmocniejsze bramki nic nie dają, jeśli ktoś po prostu edytuje plik taśmy i je usuwa — kto może go zmienić?". **Poprawka:** niuans #8 + osobny projekt P9 (chronione gałęzie, wymóg recenzji, kontrola edycji taśmy) — fundament, który amator pomija.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (CI/CD, ciągła integracja/dostarczanie, taśma, krok/step, trigger, artefakt, workflow, sekret, dziennik/log, fork/rozwidlenie, OIDC, token krótkotrwały, least privilege, tag/etykieta, SHA/skrót commita, bramka/gate, SCA, SAST, SBOM, Syft, podpis/signing, cosign/Sigstore, pochodzenie/provenance, SLSA, typosquatting, dependency confusion, poisoned pipeline execution, chroniona gałąź). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie 9 projektów L1–L3 z niuansami #1–#4, #6–#10. Niuans #5 (próg vs tempo w skali organizacji) domknie się w pełni na L4/L5 (zależność od Ethana/Leo). Soczewka bezpieczeństwa utrzymana w całości — to nie kurs CI/CD, to kurs *zabezpieczania* taśmy. CI/CD jest spoiwem grupy: bez niego DevSecOps i Kubernetes byłyby osobnymi wyspami. Uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
