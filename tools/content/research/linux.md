# Research kompetencji: Linux

> **Status:** research kompetencji w ETAP E3 — powstaje wg wzorca (golden-example) `tools/content/research/siem.md`. North Star §0.1 frameworku jest nadrzędny nad całym tym plikiem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Linux` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Administracja systemami i skrypty" (`unionShare` grupy: **16,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **9,4%** ofert ścieżki wymienia Linux |
| **Liczba ofert (`offers`)** | **35** |
| **`kind`** | `tool` (konkretny system operacyjny, nie pojęcie ogólne — patrz §2) |
| **`lift`** | 1,75 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| **Linux** (ten plik) | 9,4 | 35 | tool |
| Windows | 4,0 | 15 | tool |
| PowerShell | 3,2 | 12 | tool |
| Bash | 3,0 | 11 | tool |

**Wniosek dla autoringu:** Linux to liść o **najwyższym popycie w całej grupie** „Administracja systemami i skrypty" (9,4% — niemal cztery razy więcej niż Bash i ponad dwa razy więcej niż Windows). Opis grupy w modelu mówi wprost: *„fundament i najczęstsza brama wejścia do cyber — przez administrację przechodzi się do bezpieczeństwa (kariera w kształcie litery T: najpierw szeroka podstawa admina, potem głębia specjalisty)"*. To znaczy, że Linux nie jest tematem niszowym — jest **podłożem, na którym stoi reszta ścieżki**: serwery, na których działają usługi, to w większości Linux, a logi tych systemów to główne paliwo dla SIEM. Research Linux jest więc fundamentem grupy i mostem do grupy „SIEM i Monitorowanie Zdarzeń". W partii 1 istnieje już jeden projekt L1 (`cyber-hardening-linux-bash`) — ten research **nadbudowuje** nad nim, nie powtarza go (patrz §5).

**Soczewka cyber (obowiązuje cały research):** *zanim obronisz system, musisz wiedzieć, jak działa od środka.* Linux poznajemy nie jak programista czy „użytkownik desktopa", tylko **oczami obrońcy**: gdzie system trzyma ślady (logi), kto i czym może podnieść uprawnienia, którędy wchodzi napastnik i co zostawia po sobie. Każdy poziom (§3) patrzy na ten sam system przez to pytanie.

---

## 2. Definicja kompetencji i jej rola w pracy

**Linux** to rodzina otwartoźródłowych systemów operacyjnych (jądro Linuksa + dystrybucja, czyli złożenie jądra z narzędziami — np. Ubuntu, Debian, Rocky Linux), która napędza większość serwerów na świecie: strony WWW, bazy danych, kontenery, infrastrukturę chmurową. Dla specjalisty bezpieczeństwa Linux to **najczęstsze środowisko, którego trzeba bronić** — i jednocześnie środowisko, w którym pracują jego własne narzędzia.

Kompetencja „Linux" w kontekście cyber to nie „umiem włączyć terminal". To umiejętność **rozumienia i kontrolowania systemu od środka** w pięciu obszarach, które razem składają się na pracę admina-obrońcy:

1. **Uprawnienia i właściciele plików (permissions & ownership)** — model „kto może co zrobić z którym plikiem" (użytkownik / grupa / pozostali; prawa odczytu, zapisu, wykonania). To pierwszy mechanizm, który napastnik chce obejść, i pierwszy, który obrońca musi uszczelnić.
2. **Użytkownicy i podniesienie uprawnień (users & sudo)** — konta w systemie, konto administratora (`root`), i kontrolowane podnoszenie uprawnień przez `sudo` (mechanizm „wykonaj jako administrator" z zapisem, kto i co zrobił). Większość realnych włamań to nie magia — to przejęcie konta i podniesienie uprawnień (privilege escalation).
3. **Usługi i procesy (services & processes)** — co system uruchamia w tle (usługi zarządzane przez `systemd` — nadzorca usług w nowoczesnym Linuksie) i co aktualnie działa (procesy). Obrońca musi wiedzieć, *co powinno* działać, żeby wychwycić to, czego *nie powinno*.
4. **Logi systemowe (journald / syslog)** — gdzie Linux zapisuje ślady zdarzeń: `journald` (dziennik systemowy `systemd`) i klasyczny `syslog` (standard zapisu logów systemowych). To **te logi spływają potem do SIEM** — most do grupy monitorowania zdarzeń.
5. **Hartowanie (hardening — utwardzanie)** — celowe zamykanie zbędnych „drzwi" w systemie wg uznanego standardu (CIS Benchmark — zestaw sprawdzonych zaleceń konfiguracji od Center for Internet Security), zanim ktoś przez nie wejdzie.

**Czym kompetencja Linux NIE jest (rozróżnienie zawodowca):**
- To nie kurs programowania ani administracji „w ogóle". Patrzymy na Linuksa **przez soczewkę bezpieczeństwa** — nie „jak postawić serwer WWW", tylko „jak ten serwer uszczelnić i jak poznać, że ktoś się do niego dobiera".
- To nie to samo co Bash. **Linux to system** (co jest do obrony); **Bash to narzędzie** (czym automatyzujesz obronę). Bash to osobny liść grupy, który nadbudowuje nad Linuksem (patrz `tools/content/research/bash.md`).
- Hartowanie ≠ jednorazowy skrypt. To stan, który się utrzymuje i mierzy względem standardu (CIS), a nie „odpaliłem i zapomniałem".

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja Linux jest fundamentem ról: **administrator systemów Linux**, **inżynier bezpieczeństwa (security engineer)**, **analityk SOC** (czyta logi z linuksowych serwerów), **inżynier DevSecOps** (utwardza obrazy kontenerów i maszyn). Typowe zadania, w których kompetencja jest sprawdzana:
- Sprawdzenie, kto ma dostęp do czego i odebranie nadmiarowych uprawnień (zasada najmniejszego uprawnienia, §4).
- Przejrzenie, jakie usługi nasłuchują na sieci i wyłączenie zbędnych (zmniejszenie powierzchni ataku).
- Odczytanie z logów systemowych, kto i kiedy się zalogował, co uruchomił przez `sudo`, czy nie ma śladów manipulacji.
- Utwardzenie maszyny wg CIS Benchmark i udowodnienie efektu pomiarem przed/po.

**Po co rynkowi ta kompetencja.** Serwery linuksowe to domyślne środowisko chmury i aplikacji w EU. Regulacje (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — odporność cyfrowa sektora finansowego) i normy (ISO 27001, CIS) wymagają udokumentowanego, utwardzonego i monitorowanego stanu systemów. Firma, która nie potrafi pokazać, *jak* skonfigurowała i pilnuje swoich linuksowych serwerów, nie przejdzie audytu. Stąd stały, wysoki popyt (9,4% ofert — najwyższy w grupie).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: orientacja w systemie, pliki, użytkownicy, logi (3–6 h)

**Zakres wiedzy/umiejętności:**
- Poruszanie się po systemie z wiersza poleceń: struktura katalogów (np. `/etc` — konfiguracja, `/var/log` — logi, `/home` — katalogi użytkowników), nawigacja, podgląd plików.
- **Uprawnienia i właściciele plików:** odczytanie i ustawienie praw (odczyt/zapis/wykonanie dla właściciela/grupy/pozostałych), zmiana właściciela; zrozumienie, dlaczego plik z hasłami nie może być czytelny „dla wszystkich".
- **Użytkownicy i `sudo`:** czym jest konto `root`, czym zwykłe konto, jak `sudo` kontrolowanie podnosi uprawnienia i dlaczego logowanie się bezpośrednio na `root` to zła praktyka.
- **Logi systemowe — odczyt:** gdzie Linux zapisuje zdarzenia (`/var/log`, `journald`); odczytanie logu uwierzytelniania (`auth.log`/`journalctl`): kto się zalogował, kiedy, skąd, co uruchomił przez `sudo`.

**Co student musi UMIEĆ ZROBIĆ:** poruszać się po systemie z wiersza poleceń; odczytać i ustawić prawa do pliku oraz wyjaśnić ryzyko zbyt szerokich uprawnień; odczytać z logu uwierzytelniania konkretne zdarzenie (logowanie, użycie `sudo`) i opisać słownie, co oznacza dla bezpieczeństwa.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Uprawnienia `777` to nie „naprawione", to „otwarte na oścież".** Amator, gdy „coś nie działa", nadaje plikowi wszystkie prawa dla wszystkich (`chmod 777`) — i właśnie stworzył lukę. Zawodowiec nadaje **najmniej praw, ile wystarcza**.
- **`root` to nie jest konto do pracy.** Bezpośrednie logowanie na `root` zaciera ślad „kto to zrobił" — wszystko wygląda jak `root`. Praca przez własne konto + `sudo` zostawia w logu nazwisko sprawcy. To fundament rozliczalności (accountability).
- **Log uwierzytelniania to pierwsze miejsce, gdzie widać atak.** Seria nieudanych logowań w `auth.log` to nie szum — to często rozpoznanie albo trwający atak siłowy (brute-force).

### L2 — Zastosowanie: usługi, powierzchnia ataku, podstawy hartowania (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Usługi i procesy:** wylistowanie usług zarządzanych przez `systemd`, sprawdzenie, co nasłuchuje na sieci (otwarte porty), świadome wyłączenie usług zbędnych — czyli **redukcja powierzchni ataku (attack surface)**: im mniej drzwi, tym mniej da się sforsować.
- **Bezpieczna konfiguracja zdalnego dostępu (SSH — Secure Shell, szyfrowany zdalny dostęp do serwera):** logowanie kluczem zamiast hasłem, wyłączenie logowania `root` przez SSH, zmiana domyślnych ustawień podatnych na atak.
- **Polityka kont i haseł:** wygasanie haseł, blokada konta po nieudanych próbach, usuwanie kont nieużywanych — bo martwe konto to otwarte drzwi bez dozoru.
- **Zapora systemowa (firewall):** podstawowa konfiguracja, która domyślnie blokuje, a wpuszcza tylko to, co potrzebne (allowlist zamiast denylist).
- **Wprowadzenie do hartowania wg standardu:** pojęcie CIS Benchmark jako listy sprawdzonych zaleceń — i tego, że hartowanie mierzy się względem uznanego standardu, nie „własnego wyczucia".

**Co student musi UMIEĆ ZROBIĆ:** wylistować i ocenić działające usługi oraz wyłączyć zbędne z uzasadnieniem; skonfigurować bezpieczny dostęp SSH (klucz, brak logowania `root`); ustawić politykę haseł i zaporę; wskazać dla każdej zmiany, na jaki typ ataku odpowiada.

**Profesjonalne niuanse:**
- **Każda działająca usługa to potencjalne drzwi.** Zawodowiec pyta nie „czy to działa", tylko „czy to *musi* działać" — i wyłącza resztę. Amator zostawia domyślny zestaw usług, bo „a nuż się przyda".
- **Domyślna konfiguracja jest wygodna, nie bezpieczna.** Producenci optymalizują pod „działa od razu", nie pod „odporne na atak". Hartowanie to świadome odchodzenie od domyślnych, ryzykownych ustawień.
- **Zmiana bez kopii zapasowej i bez planu wycofania to hazard.** Zawodowiec przed zmianą konfiguracji robi kopię i wie, jak ją cofnąć — bo zbyt agresywne utwardzenie potrafi odciąć dostęp do samego serwera (np. zablokowanie własnego SSH).

### L3 — Portfolio: pełne hartowanie wg CIS, pomiar, ślad dla SIEM (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Hartowanie wg CIS Benchmark — kompletne i mierzone:** doprowadzenie maszyny do zgodności z istotnym podzbiorem CIS Benchmark dla danej dystrybucji, z **pomiarem przed/po** narzędziem audytu (np. otwartoźródłowy Lynis albo skaner CIS-CAT Lite) — indeks utwardzenia jako twardy dowód.
- **Model uprawnień w skali:** uporządkowanie użytkowników, grup i `sudo` wg zasady najmniejszego uprawnienia; rejestrowanie (audyt) użycia `sudo` i zmian wrażliwych plików.
- **Logi jako źródło dla SIEM (most do grupy monitorowania):** konfiguracja `journald`/`syslog` tak, by logi były kompletne, miały zsynchronizowany czas (NTP — protokół synchronizacji czasu) i dało się je przekazać do centralnego systemu (SIEM). Zrozumienie, *które* zdarzenia systemowe są istotne dla detekcji.
- **Integralność i wykrywanie zmian:** świadomość, że krytyczne pliki konfiguracyjne należy monitorować pod kątem nieuprawnionej zmiany (file integrity — integralność plików).
- **Dokumentacja decyzji:** dla każdej zmiany hartującej — czym jest, na jaki atak odpowiada, jaki ma koszt operacyjny.

**Co student musi UMIEĆ ZROBIĆ:** utwardzić maszynę wg istotnego podzbioru CIS z udokumentowanym pomiarem przed/po; uporządkować model uprawnień i audyt `sudo`; skonfigurować logowanie zdatne do przekazania do SIEM ze zsynchronizowanym czasem; udokumentować każdą decyzję z odniesieniem do typu zagrożenia. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Hartowanie to kompromis bezpieczeństwo ↔ użyteczność, nie maksimum „na full".** Ślepe zastosowanie wszystkich zaleceń CIS potrafi zepsuć działanie aplikacji. Zawodowiec wie, *które* zalecenia są krytyczne, a które wymagają wyjątku z uzasadnieniem — i ten wyjątek dokumentuje (jak allowlist w SIEM, §4).
- **Utwardzony system bez dobrych logów jest ślepy.** Można domknąć wszystkie drzwi i nie wiedzieć, że ktoś próbuje je wyważyć. Hartowanie i logowanie idą w parze — to dlatego ten poziom jest mostem do SIEM.
- **Zgodność z CIS to migawka, nie stan trwały.** Aktualizacje i zmiany konfiguracji „rozjeżdżają" system z benchmarkiem (configuration drift — dryf konfiguracji). Zawodowiec mierzy zgodność cyklicznie, nie raz.

### L4 — Realny przypadek profesjonalny: hartowanie floty w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, niejednorodnego* parku maszyn (różne dystrybucje, część z aplikacjami produkcyjnymi, których nie wolno zepsuć) i doprowadzenie ich do zgodności z CIS **bez przerwania działania usług** — to jest realna codzienność, nie czysta maszyna laboratoryjna.
- Zaprojektowanie wyjątków od benchmarku tam, gdzie zalecenie kłóci się z działaniem aplikacji, z udokumentowanym uzasadnieniem ryzyka — oraz powtarzalnego sposobu utwardzania (żeby nowa maszyna od razu wchodziła utwardzona, nie ręcznie).
- **Benchmark:** wynik studenta (indeks utwardzenia, liczba i jakość wyjątków, brak przestojów, kompletność logów dla SIEM) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: hartowanie jako kod i strategia dla organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Utwardzanie jako kod (configuration-as-code):** stan systemu opisany deklaratywnie (np. narzędziem zarządzania konfiguracją) tak, że każda nowa maszyna powstaje już utwardzona, a zgodność z CIS jest egzekwowana i mierzona automatycznie — koniec z ręcznym klikaniem.
- **Strategia utrzymania zgodności w czasie:** wykrywanie dryfu konfiguracji, łatanie podatności (patch management) wobec ryzyka i dostępności, świadome decyzje koszt–bezpieczeństwo dla całej floty.
- **Integracja z monitorowaniem:** kompletny strumień logów linuksowych do SIEM jako fundament detekcji dla całej organizacji (domknięcie mostu do grupy monitorowania).
- **Benchmark** wobec rozwiązania realnego inżyniera bezpieczeństwa: nie tylko „czy utwardzone", ale „czy da się to utrzymać w skali i czy przetrwa audyt".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Zasada najmniejszego uprawnienia (least privilege) jest domyślną odpowiedzią na prawie każde pytanie „ile dać dostępu".** Każde nadmiarowe uprawnienie to powierzchnia ataku. Zawodowiec zaczyna od „nic" i dokłada tylko to, co konieczne; amator zaczyna od „wszystko działa" i nigdy nie odbiera.
2. **Pułapki `sudo`.** `sudo` to nie „magiczne pozwolenie na wszystko" — to mechanizm, który trzeba skonfigurować wąsko (kto, co dokładnie może uruchomić jako administrator). Zbyt szeroka reguła `sudo` (np. pozwolenie na dowolną komendę) jest równoważna oddaniu konta `root`. Każde użycie `sudo` zostawia ślad w logu — to jest cel, nie efekt uboczny.
3. **Powierzchnia ataku: mniej znaczy bezpieczniej.** Każda zainstalowana paczka, każda działająca usługa, każdy otwarty port to potencjalne drzwi. Zawodowiec minimalizuje; amator instaluje „na zapas".
4. **Domyślne ustawienia są pod wygodę, nie pod bezpieczeństwo.** Hartowanie to świadome odejście od domyślnych, podatnych konfiguracji wg uznanego standardu (CIS), a nie wedle intuicji.
5. **CIS Benchmark to wspólny język, nie „opinia".** Zalecenia CIS (Center for Internet Security) to uzgodniony, publiczny standard — daje obiektywną miarę „jak bardzo system jest utwardzony" i wspólny język z audytorem. Hartowanie bez odniesienia do standardu jest nieweryfikowalne.
6. **Hartowanie to kompromis, nie maksimum.** Najtwardsza konfiguracja, która uniemożliwia pracę aplikacji, jest bezużyteczna. Sztuka polega na wyważeniu i **udokumentowaniu każdego świadomego wyjątku** od standardu.
7. **Configuration drift — utwardzenie się rozjeżdża.** System utwardzony raz przestaje być zgodny po aktualizacjach i zmianach. Zawodowiec mierzy zgodność cyklicznie i wykrywa dryf; amator zakłada, że „raz zrobione = zrobione".
8. **Logi to most do detekcji — i są bezwartościowe bez zsynchronizowanego czasu.** Linux jest głównym źródłem logów dla SIEM. Jeśli zegar serwera (NTP) jest rozjechany, korelacja zdarzeń między systemami się rozpada (ten sam niuans co w SIEM §4) — atak staje się niewidzialny.
9. **Rozliczalność (accountability): kto, co, kiedy.** Praca na współdzielonym `root` zaciera sprawcę. Indywidualne konta + `sudo` + kompletne logowanie to fundament tego, by po incydencie dało się ustalić przebieg zdarzeń (i wymóg norm jak ISO 27001).
10. **Integralność krytycznych plików.** Nieuprawniona zmiana pliku konfiguracyjnego (np. dodanie własnego klucza SSH przez napastnika) to klasyczny sposób utrzymania dostępu (persistence). Zawodowiec monitoruje integralność wrażliwych plików; amator ufa, że „skoro nie ruszałem, to się nie zmieniło".
11. **Kopia zapasowa i plan wycofania przed każdą zmianą hartującą.** Zbyt agresywne utwardzenie (np. błędna reguła zapory albo SSH) potrafi odciąć dostęp do serwera. Zawodowiec zawsze ma drogę powrotu — to ta sama dyscyplina, co transakcyjne zmiany w bazie.
12. **Granica etyczno-prawna jest częścią kompetencji.** Hartowanie i analizę prowadzisz **wyłącznie na własnym lub jawnie treningowym systemie**. Logi systemowe bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14; nazwy kont) i podlegają minimalizacji oraz maskowaniu. Nieautoryzowany dostęp do cudzego systemu jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Linux muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania admina-obrońcy linuksowego. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

**UWAGA — nadbudowa, nie powtórzenie.** W partii 1 istnieje już projekt **`cyber-hardening-linux-bash` (L1)**: skrypt w Bash hartujący SSH/hasła/zaporę/usługi + audyt Lynis przed/po. Ten istniejący projekt domyka *podstawowe* hartowanie L1 oraz część kompetencji Bash. Pula poniżej **nadbudowuje**: rozdziela fundamenty systemowe Linuksa (uprawnienia, użytkownicy, logi) wcześniej niż hartowanie, a na L3 idzie w pełną zgodność z CIS i most do SIEM — czego istniejący projekt nie obejmuje.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwsza orientacja i uprawnienia** — nawigacja po systemie, odczyt i poprawa praw plików, naprawa pliku z błędnie nadanym `777` | Struktura systemu, uprawnienia, właściciele plików | #1 |
| P2 | L1 | **Użytkownicy, `sudo` i rozliczalność** — założenie kont, konfiguracja wąskiego `sudo`, wyłączenie pracy na `root`, odczyt śladu w logu | Użytkownicy, `sudo`, konto `root` | #2, #9 |
| P3 | L1 | **Czytanie logów systemowych** — odczyt `auth.log`/`journalctl`, znalezienie serii nieudanych logowań i użyć `sudo`; opis, co oznaczają | Logi systemowe, odczyt zdarzeń | #8, #9 |
| (istn.) | L1 | **`cyber-hardening-linux-bash`** — skrypt hartujący + audyt Lynis przed/po (JUŻ ISTNIEJE w partii 1 — nie powtarzać) | Podstawowe hartowanie (SSH, hasła, zapora, usługi), pomiar | #4, #6, #11 |
| P4 | L2 | **Usługi i powierzchnia ataku** — inwentaryzacja usług/portów, wyłączenie zbędnych z uzasadnieniem na typ ataku | Usługi, procesy, redukcja powierzchni ataku | #3 |
| P5 | L2 | **Bezpieczny zdalny dostęp (SSH) i polityka kont** — logowanie kluczem, brak `root` przez SSH, polityka haseł i blokady, z kopią/planem wycofania | Konfiguracja SSH, polityka kont/haseł, zapora | #4, #11 |
| P6 | L3 | **Pełne hartowanie wg CIS z pomiarem** — zgodność z istotnym podzbiorem CIS Benchmark, audyt przed/po, dokumentacja wyjątków | Hartowanie wg CIS, pomiar, wyjątki | #5, #6, #7 |
| P7 | L3 | **Logi linuksowe jako źródło dla SIEM** — konfiguracja `journald`/`syslog`, synchronizacja czasu (NTP), wybór istotnych zdarzeń do przekazania | Logi dla SIEM, NTP, most do monitorowania | #8 |
| P8 | L3 | **Integralność i audyt zmian** — monitorowanie integralności krytycznych plików, audyt `sudo` i zmian wrażliwych, wykrycie dryfu konfiguracji | Integralność plików, audyt, configuration drift | #7, #10 |
| (P9–P10) | L4–L5 | **ZAPOWIEDŹ** — hartowanie floty bez przestojów + wyjątki branżowe; hartowanie jako kod + strategia łatania + integracja z SIEM; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #6, #7, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 8 projektów** (z czego 1 — `cyber-hardening-linux-bash` — już istnieje i nie jest powtarzany; reszta nadbudowuje). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (uprawnienia) → P2 (`sudo`/użytkownicy) → P3 (logi) → [`cyber-hardening-linux-bash` istn.] → P4 (usługi) → P5 (SSH/konta) → P6 (CIS) → P7 (logi dla SIEM) → P8 (integralność/audyt). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Linux jest **fundamentem grupy**, więc ma płytki łańcuch prerekwizytów — ale nie zerowy. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — bez pojęcia portu, protokołu, adresu IP student nie zrozumie, czemu „usługa nasłuchuje na porcie" i co to znaczy dla powierzchni ataku ani jak czytać log połączeń. **Wymagane/równoległe przed L2** (usługi, SSH, zapora). Na L1 (pliki, uprawnienia, logi lokalne) jeszcze nieobowiązkowe.
2. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie). **Wymagane od L1.**

**Linux jako prerekwizyt dla innych liści (czego dostarcza dalej):**
- **`Bash`** (ten sam grupa) — powłoka jako narzędzie obrońcy nadbudowuje bezpośrednio nad Linuksem; bez rozumienia systemu, uprawnień i logów skrypt w Bash nie ma czego automatyzować. **Linux jest twardym prerekwizytem Bash** (patrz `tools/content/research/bash.md` §6).
- **`SIEM` / `SOC`** (grupa „SIEM i Monitorowanie Zdarzeń") — logi systemowe Linuksa (`journald`/`syslog`) to **główne źródło danych dla SIEM**. Most powstaje na L3 Linux (P7) i wpina się w L1 SIEM (zaciąg i czytanie logów). Bez fundamentu „skąd log pochodzi i co znaczy" analiza w SIEM jest powierzchowna.
- **`Active Directory` / `IAM`** — odpowiednik świata Windows; model uprawnień i kont z Linuksa daje pojęciowy fundament „kto ma do czego dostęp" wspólny dla obu światów.
- **`Kubernetes` / `CI/CD` / `DevSecOps`** — kontenery i potoki wdrożeniowe stoją na Linuksie; hartowanie obrazów to bezpośrednie zastosowanie kompetencji.

**Most do SIEM (jawnie):** Linux L3 (P7 — logi jako źródło) → SIEM L1 (zaciąg i czytanie logów). To celowe połączenie dwóch grup — student widzi, że to, co skonfigurował na serwerze, jest tym, co potem analizuje w monitorowaniu.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy hartowania (oficjalne, darmowe do użytku edukacyjnego):**
- CIS Benchmarks (Center for Internet Security — zalecenia konfiguracji, m.in. Ubuntu/RHEL/Debian; pobranie darmowe po rejestracji, użycie niekomercyjne): https://www.cisecurity.org/cis-benchmarks
- CIS-CAT Lite (darmowy skaner zgodności z CIS dla celów oceny): https://www.cisecurity.org/cybersecurity-tools/cis-cat-lite
- NIST SP 800-123 „Guide to General Server Security": https://csrc.nist.gov/pubs/sp/800/123/final
- NIST SP 800-92 „Guide to Computer Security Log Management" (logi — wspólne z SIEM): https://csrc.nist.gov/pubs/sp/800/92/final
- DISA STIG (Security Technical Implementation Guides — rządowe wytyczne utwardzania, publiczne): https://public.cyber.mil/stigs/

**Narzędzia audytu (otwartoźródłowe, darmowe):**
- Lynis — otwartoźródłowy audyt utwardzenia systemu (GPL-3.0; używany już w `cyber-hardening-linux-bash`): https://github.com/CISOfy/lynis
- OpenSCAP — otwarty zestaw do oceny zgodności z profilami bezpieczeństwa: https://www.open-scap.org/

**Dokumentacja systemu (oficjalna, darmowa):**
- Ubuntu Server — przewodnik utwardzania (Ubuntu Security Guide): https://ubuntu.com/security/certifications/docs/usg
- Strony podręcznika systemowego (man pages) — np. `man sudoers`, `man sshd_config`, `man journalctl`: https://man7.org/linux/man-pages/
- `systemd` / `journald` — dokumentacja dziennika systemowego: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- The Linux Documentation Project (otwarte podręczniki): https://tldp.org/

**Wiedza o zagrożeniach (otwarte, autorytatywne):**
- MITRE ATT&CK — taktyki dot. eskalacji uprawnień i utrzymania dostępu na systemach (wspólny język z SIEM): https://attack.mitre.org/
- SANS Reading Room — białe księgi o hartowaniu i bezpieczeństwie systemów (darmowe): https://www.sans.org/white-papers/
- OWASP — m.in. praktyki bezpiecznej konfiguracji: https://owasp.org/

**Dane do ćwiczeń (publiczne, otwarte):**
- loghub — publiczne zbiory logów systemowych (w tym linuksowych) do analizy: https://github.com/logpai/loghub

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo): https://eur-lex.europa.eu/eli/dir/2022/2555

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte. **Jeden punkt do weryfikacji:** licencja CIS Benchmarks — pobranie jest darmowe, ale warunki użycia ograniczają redystrybucję i użycie komercyjne; w projektach **odwołujemy się linkiem i atrybucją, nie redystrybuujemy treści benchmarku**. CIS-CAT Lite i Lynis (GPL-3.0) to ścieżka w pełni otwarta dla studenta bez ograniczeń. Zbiory logów (loghub) wymagają klauzuli maskowania IP jak w partii 1. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził powtórzeniem istniejącego projektu `cyber-hardening-linux-bash`.** CISO: „jeśli sprzedajesz mi ten sam skrypt hartujący drugi raz, to nie ścieżka, tylko zapętlenie". **Poprawka:** §5 jawnie oznacza istniejący projekt jako *domknięty* i buduje pulę tak, że fundamenty systemowe (uprawnienia, użytkownicy, logi) idą *przed* hartowaniem, a L3 wchodzi w pełną zgodność z CIS i most do SIEM — zakresy, których istniejący projekt nie obejmuje. Zero nakładki.

2. **Słabość: „Linux dla cyber" groził zsunięciem się w ogólny kurs administracji.** CISO: „nie potrzebuję kolejnego «Linux od podstaw» — potrzebuję kogoś, kto patrzy na system jak obrońca". **Poprawka:** wprowadziłam soczewkę cyber jako oś całego pliku (§1), a każdy poziom L1–L3 i każdy projekt §5 podpina pod pytanie „na jaki atak to odpowiada / co to znaczy dla bezpieczeństwa". Czasowniki operacyjne są obronne, nie administracyjne.

3. **Słabość: brak mostu do SIEM — Linux wisiał w próżni.** CISO: „junior, który utwardza serwer, ale nie wie, że jego logi to paliwo dla SOC, jest połowiczny". **Poprawka:** logi jako źródło dla SIEM wyniosłam do osobnego zakresu L3 (P7), do niuansu #8 i do §6 jako jawny most Linux L3 → SIEM L1. Synchronizacja czasu (NTP) spina to z korelacją w SIEM.

4. **Słabość: pułapki `sudo` i rozliczalność były potraktowane skrótowo.** CISO: „90% eskalacji uprawnień, które widzę, to źle skonfigurowane `sudo` i praca na współdzielonym `root»". **Poprawka:** `sudo` dostał własny niuans #2, osobny zakres L1 (P2) i powiązanie z rozliczalnością (#9) — bo to jest realny rozdzielnik amator↔zawodowiec w tej kompetencji, nie dodatek.

5. **Słabość: ryzyko odcięcia sobie dostępu przy hartowaniu było pominięte.** CISO: „pierwsza rzecz, którą junior psuje, to zablokowanie własnego SSH zbyt agresywną zaporą — i serwer jest nie do odzyskania". **Poprawka:** dodałam niuans #11 (kopia zapasowa + plan wycofania przed każdą zmianą) i wbudowałam go w L2 (P5) oraz zakres L4. To uczy dyscypliny odwracalności, nie tylko „twardości".

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Linux/dystrybucja, `root`, `sudo`, permissions/ownership, `systemd`, `journald`, `syslog`, SSH, hardening, CIS Benchmark, attack surface, least privilege, allowlist/denylist, NTP, configuration drift, file integrity, persistence, configuration-as-code, patch management, accountability, NIS2, DORA, CISO). Polskie nazwy tam, gdzie nie tracą precyzji (np. „powierzchnia ataku", „najmniejsze uprawnienie", „utwardzanie").

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie projekty L1–L3 (P1–P8 + istniejący) z niuansami #1–#11. Niuanse #6 (kompromis w skali), #7 (dryf), #12 (granica prawna w skali floty) domykają się w pełni dopiero na L4/L5 — research je zapowiada, ale „zawodowość Linuksa w skali organizacji" wymaga struktury L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
