# Research kompetencji: DevSecOps

> **Status:** research liścia w ETAP E3 — powstaje wg wzorca `tools/content/research/siem.md` (golden-example). North Star §0.1 (poprzeczka: „czy pracodawca w EU uzna kandydata za przygotowanego") jest nadrzędny nad całym tym plikiem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Soczewka grupy „DevSecOps i konteneryzacja":** wpięcie bezpieczeństwa w taśmę dostarczania kodu. **DevSecOps to rdzeń koncepcyjny grupy** — `CI/CD` (taśma, którą zabezpieczamy) i `Kubernetes` (środowisko uruchomienia, które hartujemy) nadbudowują nad nim narzędziowo i środowiskowo.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `DevSecOps` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „DevSecOps i konteneryzacja" (`unionShare` grupy: **10,8%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,0%** ofert ścieżki wymienia DevSecOps |
| **Liczba ofert (`offers`)** | **11** |
| **`kind`** | `concept` (kompetencja koncepcyjna — kultura i praktyka, nie pojedyncze narzędzie) |
| **`lift`** | **14,01** (siła powiązania liścia z tą ścieżką — patrz wniosek niżej) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Kubernetes | 5,7 | 21 | tool | 0,69 |
| CI/CD | 5,7 | 21 | concept | 0,60 |
| **DevSecOps** (ten plik) | 3,0 | 11 | concept | **14,01** |

**Wniosek dla autoringu — sygnał z `lift`u jest tu kluczowy.** `lift` mówi, jak bardzo dany liść jest *charakterystyczny* dla tej ścieżki (a nie tylko częsty wszędzie). DevSecOps ma `lift` **14,01** — gdy oferta w ogóle wymienia „DevSecOps", to prawie na pewno jest to rola bezpieczeństwa. Tymczasem Kubernetes (0,69) i CI/CD (0,60) mają `lift` poniżej 1 — pojawiają się równie chętnie w ofertach data engineera, MLOps i backendu (potwierdza to model: te same liście wiszą w grupach „Konteneryzacja", „MLOps", „Inżynieria danych w chmurze"). Innymi słowy: **Kubernetes i CI/CD to ogólne kompetencje infrastrukturalne — to dopiero soczewka bezpieczeństwa czyni je częścią tej ścieżki.** DevSecOps jest tą soczewką nazwaną wprost. Dlatego autorowany jest w grupie pierwszy jako rdzeń koncepcyjny: research K8s i CI/CD opiera się o pojęcia stąd (próg blokujący, shift-left, łańcuch dostaw, zmęczenie alertami skanerów).

---

## 2. Definicja kompetencji i jej rola w pracy

**DevSecOps (Development + Security + Operations — wpięcie bezpieczeństwa w cały cykl wytwarzania oprogramowania)** to kultura i praktyka, w której bezpieczeństwo przestaje być osobnym etapem „na końcu, przed wydaniem", a staje się elementem każdego kroku taśmy dostarczania kodu (`CI/CD` — *continuous integration / continuous delivery*, ciągła integracja i dostarczanie). Sednem jest zasada **„shift-left"** (przesunięcie w lewo) — przesunięcie kontroli bezpieczeństwa jak najwcześniej, tam gdzie błąd jest najtańszy do naprawienia: do edytora programisty i do taśmy budowania, a nie do audytu tydzień przed premierą.

DevSecOps robi trzy rzeczy, których „bezpieczeństwo na końcu" nie potrafi:

1. **Wpina automatyczne kontrole w taśmę** — skanery uruchamiają się przy każdej zmianie kodu, nie raz na kwartał. Trzy podstawowe klasy (osobne liście grupy AppSec w modelu, tu jako narzędzia praktyki):
   - **SAST** (*Static Application Security Testing* — analiza statyczna): czyta *kod źródłowy* i szuka w nim podatności bez uruchamiania programu.
   - **DAST** (*Dynamic Application Security Testing* — analiza dynamiczna): atakuje *działającą* aplikację z zewnątrz, jak napastnik, i patrzy, co się wysypie.
   - **SCA** (*Software Composition Analysis* — analiza składu oprogramowania): sprawdza *cudze biblioteki*, których używasz, pod kątem znanych dziur (większość kodu w nowoczesnej aplikacji to nie Twój kod, tylko zależności).
2. **Ustawia próg blokujący (*blocking gate* — bramka)** — definiuje, jaki wynik skanera *zatrzymuje* wydanie, a jaki tylko ostrzega. To jest serce DevSecOps i jego największe napięcie (patrz §4).
3. **Buduje współpracę dev↔sec** — bezpieczeństwo przestaje być „działem, który mówi nie", a staje się wsparciem dla programistów (program *security champions* — wyznaczonych programistów-ambasadorów bezpieczeństwa w zespołach).

**Czym DevSecOps NIE jest (rozróżnienie zawodowca):**
- DevSecOps to nie „kupienie skanera i włączenie go". Skaner bez nastrojonego progu i bez kogoś, kto rozumie wyniki, generuje tysiące zgłoszeń, które zespół szybko zaczyna ignorować — to *zmęczenie alertami skanerów* (§4), bezpośredni odpowiednik zmęczenia alertami w SOC.
- DevSecOps ≠ tylko narzędzia. To w pierwszej kolejności **zmiana kultury**: kto odpowiada za bezpieczeństwo (wszyscy, nie „oni"), kiedy (od pierwszego commita, nie przed premierą) i jak (jako wsparcie, nie hamulec).
- DevSecOps ≠ DevOps z dorzuconym skanerem. To świadoma decyzja, *co* blokuje taśmę, *co* tylko ostrzega i *jak* nie zabić tempa pracy zespołu przy jednoczesnym podniesieniu bezpieczeństwa.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja DevSecOps jest rdzeniem pracy **inżyniera DevSecOps / inżyniera bezpieczeństwa aplikacji (*application security engineer*, AppSec)** oraz coraz częściej zwykłego programisty w dojrzałym zespole. Typowy dzień:
- **Inżynier DevSecOps:** projektuje i utrzymuje bramki bezpieczeństwa w taśmie, stroi skanery (redukcja fałszywych alarmów), ustala politykę progu blokującego, przegląda nowe podatności w zależnościach, wspiera zespoły programistów w naprawie, pilnuje bezpieczeństwa łańcucha dostaw (podpisywanie artefaktów, SBOM — patrz niżej).
- **Programista w zespole z DevSecOps:** dostaje wynik skanera *w swoim pull requeście* (zgłoszeniu zmiany do scalenia), odróżnia realną podatność od fałszywego alarmu, naprawia albo uzasadnia wyciszenie.

**Po co rynkowi ta kompetencja.** Firmy wypuszczają nowe wersje aplikacji nawet codziennie. Ręczny audyt bezpieczeństwa raz na kwartał nie nadąża za taśmą, która wdraża co godzinę. Do tego regulacje europejskie podnoszą poprzeczkę: NIS2 (dyrektywa o cyberbezpieczeństwie) i nadchodzący Cyber Resilience Act (rozporządzenie o cyberodporności produktów cyfrowych) wymagają udokumentowanego, bezpiecznego procesu wytwarzania. Bez DevSecOps firma nie udowodni, że *wie*, co wkłada do swojego produktu — zwłaszcza w cudzych bibliotekach (po incydentach takich jak Log4Shell w 2021 czy tylna furtka w bibliotece `xz` w 2024 łańcuch dostaw stał się tematem zarządu, nie tylko inżyniera).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: czytanie podatności i jeden skaner lokalnie (3–6 h)

**Zakres wiedzy/umiejętności:**
- Anatomia taśmy CI/CD i co to znaczy „shift-left": gdzie w cyklu (kod → budowanie → test → wdrożenie) wpina się kontrolę bezpieczeństwa i dlaczego im wcześniej, tym taniej.
- Trzy klasy kontroli (SAST / DAST / SCA) — co każda *widzi*, a czego nie widzi (żadna sama nie wystarcza — patrz §4).
- Uruchomienie **jednego** otwartoźródłowego skanera lokalnie na własnym repozytorium: analiza składu zależności (SCA, np. **Trivy** lub **OWASP Dependency-Check**) albo analiza statyczna kodu (SAST, np. **Semgrep** w wersji darmowej).
- Odczytanie raportu podatności: czym jest **CVE** (*Common Vulnerabilities and Exposures* — publiczny identyfikator znanej podatności, np. `CVE-2021-44228`), czym jest **CVSS** (*Common Vulnerability Scoring System* — punktowa ocena wagi podatności 0–10) i dlaczego sam wynik CVSS to jeszcze nie priorytet (§4).

**Co student musi UMIEĆ ZROBIĆ:** uruchomić jeden skaner na własnym (lub jawnie treningowym, celowo podatnym) repozytorium; odczytać raport; opisać słownie 2–3 znalezione podatności — co oznaczają i czy w tym kontekście są groźne.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Wynik CVSS to nie priorytet.** Podatność o CVSS 9.8 w bibliotece, której funkcję nigdy nie wywołujesz, jest mniej pilna niż CVSS 6.5 w kodzie wystawionym do internetu. Amator naprawia po liczbie; zawodowiec po *kontekście* (czy osiągalne, czy wystawione, czy wykorzystywane „w naturze").
- **Skaner to opinia, nie wyrok.** Każde zgłoszenie trzeba zweryfikować — skaner nie wie, jak Twój kod jest używany.

### L2 — Zastosowanie: wpięcie skanera w taśmę i pierwszy próg (8–14 h)

**Zakres wiedzy/umiejętności:**
- Wpięcie kontroli bezpieczeństwa jako **kroku taśmy** (np. *workflow* w GitHub Actions na własnym repozytorium): SAST + SCA + skan sekretów (*secret scanning* — wykrywanie haseł/kluczy przypadkiem wrzuconych do kodu, np. **Gitleaks**) uruchamiane przy każdej zmianie.
- Odczyt znormalizowanego wyniku skanerów w formacie **SARIF** (*Static Analysis Results Interchange Format* — wspólny format wyników analizy, działa niezależnie od narzędzia) — odpowiednik wspólnego modelu pól z SIEM, tu dla wyników bezpieczeństwa.
- **Pierwszy próg blokujący:** konfiguracja, że taśma *zatrzymuje* zmianę przy podatności o wadze „wysoka/krytyczna", a niższe tylko raportuje — i świadomość, dlaczego ten próg, a nie inny.
- **Triage fałszywych alarmów:** odróżnienie realnej podatności od szumu; wyciszenie (*suppression*) z **jawnym uzasadnieniem** zapisanym przy kodzie — nigdy ciche.

**Co student musi UMIEĆ ZROBIĆ:** zbudować taśmę, która przy każdej zmianie uruchamia SAST+SCA+skan sekretów; ustawić uzasadniony próg blokujący; przejść triage przynajmniej jednego fałszywego alarmu i udokumentować wyciszenie.

**Profesjonalne niuanse:**
- **Próg blokujący to kompromis, nie liczba z sufitu.** Za ostry → taśma blokuje każdą zmianę, zespół zaczyna obchodzić bezpieczeństwo (i traci do niego zaufanie). Za luźny → dziura jedzie na produkcję. To napięcie *próg blokujący vs przepływ pracy* definiuje całą rolę (§4).
- **Sekret raz wrzucony do historii git zostaje w historii.** Usunięcie hasła z najnowszej wersji *nie* usuwa go z poprzednich commitów — trzeba go **unieważnić i wymienić** (rotacja), nie tylko skasować. Amator kasuje plik i myśli, że problem zniknął.
- **Fałszywy pozytyw kosztuje zaufanie, fałszywy negatyw kosztuje incydent.** Te błędy nie są symetryczne — i to napięcie rządzi strojeniem skanerów (dokładnie jak w SIEM).

### L3 — Portfolio: pełna taśma shift-left z progiem i współpracą dev↔sec (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Pełna taśma shift-left:** SAST + DAST + SCA + skan sekretów + skan konfiguracji infrastruktury (*IaC scanning* — sprawdzanie plików opisujących infrastrukturę, np. Terraform/manifesty Kubernetes), każdy jako krok taśmy z wynikiem w SARIF.
- **DAST na własnej, celowo podatnej aplikacji:** uruchomienie skanera dynamicznego (np. **OWASP ZAP**) przeciw **OWASP Juice Shop** (otwarta, celowo dziurawa aplikacja treningowa) — *wyłącznie* własnej instancji (granica prawna, §4 i §7).
- **Mapowanie znalezisk na OWASP Top 10** (lista dziesięciu najczęstszych klas podatności aplikacji webowych — wspólny język AppSec, odpowiednik MITRE ATT&CK z SIEM) — świadome pokazanie, jakie klasy ryzyka taśma pokrywa, a jakie nie.
- **Strojenie i baza odniesienia (*baseline*):** redukcja fałszywych alarmów; ustalenie linii bazowej istniejących znalezisk, tak by próg blokował tylko **nowe** podatności w danej zmianie (skanowanie różnicowe — *diff-aware*), a nie cały dług zastany (§4, niuans baseline).
- **Polityka progu blokującego:** świadomy podział na „blokuje wydanie" vs „tylko ostrzega" — z uzasadnieniem per klasa ryzyka.
- **Współpraca dev↔sec jako artefakt:** komentarz bezpieczeństwa w pull requeście, opis naprawy zrozumiały dla programisty, ślad decyzji o wyciszeniu z uzasadnieniem.
- **Metryki:** czas naprawy podatności (*MTTR* — *mean time to remediate*), gęstość znalezisk, odsetek fałszywych alarmów na skaner.

**Co student musi UMIEĆ ZROBIĆ:** zbudować pełną taśmę shift-left z progiem blokującym tylko nowe podatności (baseline), nastroić ją redukując fałszywe alarmy z udokumentowaniem decyzji, zmapować pokrycie na OWASP Top 10 z jawnie nazwaną luką, uruchomić DAST na własnej podatnej aplikacji i pokazać współpracę dev↔sec (komentarz w PR + uzasadnione wyciszenie). To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Pełne pokrycie to nie wyścig „więcej skanerów".** Cztery skanery, których nikt nie czyta, są gorsze niż dwa nastrojone. Zawodowiec patrzy na *jakość kolejki znalezisk* (mało, trafnie), nie na liczbę narzędzi — to wprost zmęczenie alertami skanerów (§4).
- **Wyciszenie (*suppression*) to broń obosieczna.** Każdy wyjątek („ignoruj tę podatność") to potencjalna dziura. Każde wyciszenie = uzasadnienie + właściciel + data przeglądu. Inaczej po roku taśma wycisza wszystko i nie chroni przed niczym.
- **Próg, który blokuje cały dług zastany, zostanie wyłączony przez zespół pierwszego dnia.** Dlatego baseline (blokuj tylko *nowe* znaleziska) to nie wygoda, lecz warunek, by DevSecOps w ogóle przetrwał kontakt z prawdziwym zespołem.

### L4 — Realny przypadek profesjonalny: DevSecOps na zastanym, „brudnym" projekcie (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *zastanego* (*brownfield*) projektu z tysiącami istniejących znalezisk i wpięcie DevSecOps tak, by **nie zablokować całej pracy zespołu** — ustalenie baseline, negocjacja progu z tempem dostarczania, priorytetyzacja po *osiągalności i wykorzystaniu w naturze*, nie po surowym CVSS.
- Realna współpraca dev↔sec: jak przekonać zespół, który traktuje bezpieczeństwo jak hamulec, że bramka mu pomaga — kultura, nie tylko konfiguracja.
- **Benchmark:** wynik studenta (redukcja szumu, pokrycie, próg, czas naprawy) zestawiony z tym, co osiągnął profesjonalista na tym samym zastanym projekcie.

### L5 — Biegłość: program bezpieczeństwa wytwarzania dla całej organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Bezpieczny cykl wytwarzania (*secure SDLC*) dla całej organizacji:** które bramki blokują, które tylko doradzają, jak mierzyć skuteczność, jak prowadzić program *security champions*.
- **Bezpieczeństwo łańcucha dostaw na poziomie strategii:** SLSA (*Supply-chain Levels for Software Artifacts* — poziomy zabezpieczenia łańcucha dostaw), SBOM (*Software Bill of Materials* — spis składników oprogramowania), podpisywanie artefaktów (Sigstore/cosign) i wymuszanie weryfikacji podpisu przy wdrożeniu.
- **Ekonomia kontroli:** czas skanowania vs tempo taśmy — skanery, które wydłużają budowanie o 30 minut, zostaną wyłączone; świadomy dobór, co skanować przy każdej zmianie, a co tylko nocą.
- **Benchmark** wobec rozwiązania architekta AppSec: nie „czy są skanery", lecz „czy proces realnie obniża ryzyko za rozsądny koszt i da się go utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zmęczenie alertami skanerów (*scanner fatigue*).** Skanery aplikacji generują setki, czasem tysiące znalezisk — i jak w SOC większość to szum lub niski priorytet. Zespół, który dostaje regularnie zalew zgłoszeń, przestaje je czytać. Zawodowiec optymalizuje *jakość* kolejki (mało, trafnie, z kontekstem), amator dokłada skanery i pogarsza problem. To ten sam mechanizm co zmęczenie alertami w SIEM — i ten sam rozdzielnik amator↔zawodowiec.

2. **Próg blokujący vs przepływ pracy.** Najtrudniejsza decyzja roli: co *zatrzymuje* taśmę, a co tylko ostrzega. Bramka, która blokuje każde wydanie, kończy się tym, że zespół ją obchodzi i traci zaufanie do bezpieczeństwa. Bramka, która nigdy nie blokuje, jest dekoracją. Zawodowiec kalibruje próg pod realne tempo zespołu i klasę ryzyka — to rdzeń kultury DevSecOps.

3. **Fałszywe pozytywy w SCA (analizie zależności).** SCA zgłasza znaną podatność (CVE) w bibliotece, którą masz w projekcie — ale podatna *funkcja* może nigdy nie być wywoływana w Twoim kodzie. To fałszywy alarm w sensie ryzyka. Dojrzałe narzędzia robią *analizę osiągalności* (*reachability* — czy podatny kod jest w ogóle wykonywany). Amator aktualizuje wszystko w panice; zawodowiec sprawdza, czy podatność jest osiągalna, zanim wstrzyma wydanie.

4. **CVSS ≠ priorytet.** Surowy wynik wagi (CVSS) ignoruje kontekst: czy podatność jest wystawiona do internetu, czy osiągalna w Twoim użyciu, czy aktywnie wykorzystywana „w naturze" (do tego służy katalog KEV — *Known Exploited Vulnerabilities* agencji CISA i metryka EPSS — prawdopodobieństwo wykorzystania). Priorytet = waga **×** kontekst, nie sama waga.

5. **Shift-left to nie „zrzucenie całego bezpieczeństwa na programistów".** Przesunięcie w lewo bez wsparcia zamienia się w obarczanie dewelopera odpowiedzialnością bez narzędzi i wiedzy. Dojrzały DevSecOps to *kultura wsparcia* — security champions, czytelne opisy napraw, bezpieczeństwo jako „pomocnik", nie „strażnik mówiący nie".

6. **Sekrety w kodzie i historii repozytorium.** Hasła, klucze API i tokeny wrzucone do repozytorium to jedna z najczęstszych realnych wpadek. Pułapka: usunięcie sekretu z najnowszej wersji *nie* usuwa go z historii git — sekret trzeba **unieważnić i wymienić** (rotacja), nie tylko skasować plik. Skan sekretów (np. Gitleaks) wpina się w taśmę, ale wykryty sekret = natychmiastowa rotacja.

7. **SAST, DAST, SCA i skan IaC widzą różne rzeczy — żaden sam nie wystarcza.** SAST czyta kod (wykryje np. wstrzyknięcie SQL w Twoim kodzie, ale nie podatną zależność). SCA czyta zależności (wykryje dziurawą bibliotekę, ale nie błąd w Twoim kodzie). DAST atakuje działającą aplikację (wykryje błąd konfiguracji widoczny dopiero w działaniu). To obrona warstwowa (*defense in depth*) — zawodowiec wie, którą klasę dziur która warstwa złapie, a której żadna nie złapie.

8. **Bezpieczeństwo łańcucha dostaw (*supply chain*).** Większość kodu w aplikacji to cudze biblioteki. Napastnik celuje w nie: przejęte paczki, podszywanie się pod popularne nazwy (*typosquatting*, *dependency confusion*), przejęte „akcje" w taśmie CI/CD. Odpowiedź: SBOM (spis składników), podpisywanie artefaktów, weryfikacja pochodzenia (*provenance*), poziomy SLSA. Po Log4Shell (2021) i tylnej furtce w `xz` (2024) to temat zarządu, nie ciekawostka. (Pogłębione w researchu `ci-cd.md`.)

9. **Baseline na zastanym projekcie.** Nie da się wpiąć bramki blokującej na 5000 istniejących znalezisk — zablokuje całą pracę pierwszego dnia. Zawodowiec ustala linię bazową (baseline) i blokuje tylko **nowe** podatności wprowadzane daną zmianą (skanowanie różnicowe). Dług zastany spłaca się planem, nie blokadą taśmy.

10. **Granica etyczno-prawna jest częścią kompetencji.** DAST (skaner dynamiczny) *atakuje* aplikację — wolno go uruchamiać **wyłącznie** przeciw własnej lub jawnie treningowej instancji (OWASP Juice Shop na własnym sprzęcie). Przeskanowanie cudzej aplikacji bez pisemnej zgody to w Polsce przestępstwo (art. 267 Kodeksu karnego). To nie „dodatek RODO", lecz fundament zawodowego rzemiosła.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty DevSecOps muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie pełnić rolę juniora DevSecOps / AppSec. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwszy skan zależności (SCA)** — uruchomienie Trivy/Dependency-Check na własnym repo, odczyt CVE/CVSS, opis 2–3 podatności w kontekście | SCA lokalnie, czytanie CVE/CVSS, kontekst > liczba | #1, #4 |
| P2 | L1 | **Pierwszy skan kodu (SAST)** — Semgrep na własnym/treningowym repo, odróżnienie realnej podatności od fałszywego alarmu | SAST lokalnie, triage, SAST vs SCA | #4, #7 |
| P3 | L2 | **Skaner w taśmie + format SARIF** — wpięcie SAST+SCA jako kroku CI na własnym repo, odczyt SARIF | Krok taśmy, SARIF, shift-left w praktyce | #5, #7 |
| P4 | L2 | **Skan sekretów i rotacja** — Gitleaks w taśmie, wykrycie sekretu w historii, procedura unieważnienia i wymiany | Skan sekretów, pułapka historii git, rotacja | #6 |
| P5 | L2 | **Pierwszy próg blokujący + triage** — bramka blokująca przy wadze wysokiej, uzasadnione wyciszenie fałszywego alarmu | Próg, blokuje vs ostrzega, wyciszenie z uzasadnieniem | #1, #2 |
| P6 | L3 | **DAST na własnej podatnej aplikacji** — OWASP ZAP przeciw OWASP Juice Shop (własna instancja), mapowanie na OWASP Top 10 | DAST, OWASP Top 10, granica prawna | #7, #10 |
| P7 | L3 | **Baseline na zastanym projekcie** — linia bazowa + skanowanie różnicowe (blokuj tylko nowe), spłata długu planem | Baseline, diff-aware, dług zastany | #9 |
| P8 | L3 | **Strojenie i osiągalność w SCA** — redukcja fałszywych alarmów, analiza osiągalności, priorytet po kontekście/KEV | Reachability, CVSS×kontekst, redukcja szumu | #1, #3, #4 |
| P9 | L3 | **Współpraca dev↔sec + metryki** — komentarz bezpieczeństwa w PR, opis naprawy dla programisty, MTTR/gęstość znalezisk | Kultura dev↔sec, metryki AppSec | #2, #5 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — DevSecOps na realnym brudnym projekcie z negocjacją progu; program secure SDLC + łańcuch dostaw (SLSA/SBOM/podpisy) + ekonomia skanowania; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #2, #8 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1→P2 (dwa rodzaje skanu lokalnie) → P3 (do taśmy) → P4 (sekrety) → P5 (próg) → P6 (DAST) → P7 (baseline) → P8 (strojenie/osiągalność) → P9 (kultura/metryki). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

DevSecOps **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Praca z kodem i wersjonowaniem** — podstawy systemu kontroli wersji git (commit, gałąź, pull request) i wiersza poleceń (`Linux`, `Bash`; projekt partii 1 `cyber-hardening-linux-bash`). **Wymagane przed L1** — bez tego student nie zrozumie, czym jest „krok taśmy" ani „sekret w historii".
2. **Podstawy taśmy CI/CD** — czym jest ciągła integracja i dostarczanie, gdzie wpina się krok. Częściowo budowane w L2 DevSecOps, ale rdzeń pojęciowy domyka osobny research `ci-cd.md` (ten sam grupa). **Wymagane/równoległe na L2.**
3. **Podstawy bezpieczeństwa aplikacji webowych** — `OWASP` i OWASP Top 10 (czym jest wstrzyknięcie, błędne uwierzytelnianie, błędna konfiguracja). Bez tego znaleziska skanera są dla studenta nazwami bez znaczenia. **Wymagane przed L3 (DAST, mapowanie na Top 10).**
4. **Pojęcie podatności i łańcucha dostaw** — `SCA`/`SAST`/`DAST` jako liście grupy AppSec; rozumienie, że większość kodu to cudze zależności. **Wymagane przed L2.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie; DAST tylko na własnej aplikacji). **Wymagane od L1.**

**Czego DevSecOps dostarcza jako prerekwizyt dla innych liści grupy:** DevSecOps jest soczewką pojęciową dla `CI/CD` (zabezpieczenie tej samej taśmy — próg blokujący, skan sekretów, łańcuch dostaw) i `Kubernetes` (skan obrazów i konfiguracji jako krok taśmy to wprost shift-left). Dlatego DevSecOps autorowany jest w grupie pierwszy — research K8s i CI/CD opiera się o pojęcia stąd (próg blokujący, zmęczenie alertami skanerów, baseline, łańcuch dostaw).

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Wiedza o bezpieczeństwie aplikacji (OWASP — autorytatywne, otwarte):**
- OWASP Top 10 (najczęstsze klasy podatności aplikacji webowych): https://owasp.org/www-project-top-ten/
- OWASP DevSecOps Guideline (przewodnik wpinania bezpieczeństwa w taśmę): https://owasp.org/www-project-devsecops-guideline/
- OWASP ASVS (standard weryfikacji bezpieczeństwa aplikacji): https://owasp.org/www-project-application-security-verification-standard/
- OWASP Juice Shop (celowo podatna aplikacja treningowa — wyłącznie własna instancja): https://owasp.org/www-project-juice-shop/
- OWASP ZAP (otwarty skaner dynamiczny DAST): https://www.zaproxy.org/

**Narzędzia skanujące (otwartoźródłowe, darmowe — do ćwiczeń):**
- Semgrep (analiza statyczna SAST, wersja otwarta): https://semgrep.dev/docs/
- Trivy (skaner zależności i konfiguracji — SCA/IaC): https://trivy.dev/
- OWASP Dependency-Check (analiza składu SCA): https://owasp.org/www-project-dependency-check/
- Gitleaks (skan sekretów w repozytorium): https://github.com/gitleaks/gitleaks
- SARIF (wspólny format wyników analizy — specyfikacja OASIS): https://sarifweb.azurewebsites.net/

**Standardy, normy i klasyfikacje (oficjalne):**
- NIST SP 800-218 „Secure Software Development Framework (SSDF)" (bezpieczne wytwarzanie): https://csrc.nist.gov/pubs/sp/800/218/final
- MITRE CWE (klasyfikacja słabości oprogramowania — wspólny słownik klas błędów): https://cwe.mitre.org/
- FIRST CVSS (system oceny wagi podatności): https://www.first.org/cvss/
- CISA KEV (katalog podatności wykorzystywanych „w naturze"): https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- SLSA (poziomy zabezpieczenia łańcucha dostaw): https://slsa.dev/
- Sigstore / cosign (podpisywanie artefaktów oprogramowania): https://www.sigstore.dev/

**Materiały o taśmie i jej bezpieczeństwie (oficjalne):**
- GitHub Actions — dokumentacja taśmy: https://docs.github.com/en/actions
- GitHub — bezpieczne korzystanie z Actions (sekrety, uprawnienia): https://docs.github.com/en/actions/security-guides

**Kontekst prawny EU/PL (do projektów i klauzul):**
- Dyrektywa NIS2 (cyberbezpieczeństwo, bezpieczny proces): https://eur-lex.europa.eu/eli/dir/2022/2555
- Cyber Resilience Act (cyberodporność produktów cyfrowych): https://eur-lex.europa.eu/eli/reg/2024/2847
- Art. 267 Kodeksu karnego (nieautoryzowany dostęp — granica DAST): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Punkt wrażliwy:** OWASP Juice Shop i OWASP ZAP to narzędzia/cele *ofensywne* — projekty MUSZĄ zawierać twardą klauzulę „wyłącznie własna/treningowa instancja", bo uruchomienie DAST przeciw cudzej aplikacji to art. 267 KK. Drugi punkt: skanery SCA pobierają bazy podatności z internetu — żadnych danych osobowych, ale warto odnotować w nocie. Linki do weryfikacji aktualności przed wejściem do `learning_resources` (zwłaszcza tekst Cyber Resilience Act — świeży akt).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów DevSecOps z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research mylił DevSecOps z „włączeniem skanera".** Pierwsza wersja sprowadzała kompetencję do narzędzi. CISO: „junior, który wpina pięć skanerów i zalewa zespół tysiącem zgłoszeń, jest gorszy niż brak skanera — zabija zaufanie do bezpieczeństwa". **Poprawka:** wyniosłam *próg blokujący vs przepływ pracy* (#2) i *zmęczenie alertami skanerów* (#1) na sedno, a kulturę dev↔sec (#5) do osobnego projektu P9. To rozdzielnik amator↔zawodowiec.

2. **Słabość: priorytetyzacja po surowym CVSS.** CISO: „pokaż mi juniora, który naprawia po liczbie CVSS, a pokażę ci zespół, który łata nieistotne, a wystawione dziury jadą na produkcję". **Poprawka:** dodałam niuans #4 (CVSS × kontekst, KEV/EPSS) i #3 (osiągalność w SCA), wbudowałam w projekt P8. Priorytet = waga razy kontekst.

3. **Słabość: brak baseline — bramka nie do utrzymania.** Pierwsza wersja zakładała czysty projekt. CISO: „w prawdziwej firmie masz 5000 starych znalezisk; bramka, która blokuje wszystko, zostanie wyłączona pierwszego dnia". **Poprawka:** dodałam niuans #9 (baseline, skanowanie różnicowe) jako osobną umiejętność L3 (projekt P7) — to warunek, by DevSecOps przetrwał kontakt z prawdziwym zespołem.

4. **Słabość: sekrety potraktowane jak „kolejny skaner".** CISO: „junior kasuje hasło z ostatniego commita i myśli, że załatwione — a ono siedzi w historii git i trzeba je rotować". **Poprawka:** wyniosłam sekrety do niuansu #6 i osobnego projektu P4 z naciskiem na *rotację, nie kasowanie*.

5. **Słabość: granica prawna DAST rozmyta.** CISO: „skaner dynamiczny to narzędzie ataku — junior, który przeskanuje cudzą aplikację «żeby przećwiczyć», to ryzyko prawne dla mojej firmy". **Poprawka:** niuans #10 + twarda klauzula w §7 i w projekcie P6 (DAST wyłącznie na własnej instancji OWASP Juice Shop; art. 267 KK).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (DevSecOps, CI/CD, shift-left, SAST, DAST, SCA, IaC scanning, CVE, CVSS, SARIF, secret scanning, pull request, suppression, baseline, diff-aware, reachability, KEV, EPSS, OWASP Top 10, SBOM, SLSA, provenance, MTTR, security champions, defense in depth). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#7, #9–#10. Niuanse #2 (próg vs tempo w skali), #8 (łańcuch dostaw — SLSA/SBOM/podpisy) domkną się w pełni dopiero na L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione. DevSecOps jest rdzeniem grupy — bez niego K8s i CI/CD byłyby uczone jako administracja, nie bezpieczeństwo.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
