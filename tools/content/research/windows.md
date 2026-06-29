# Research kompetencji: Windows

> **Status:** research liścia ścieżki Cybersecurity Specialist (grupa „Administracja systemami i skrypty"), powstały wg wzorca `tools/content/research/siem.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.
> **Soczewka (perspektywa):** ten research patrzy na Windows **oczami obrońcy** — nie jako kurs administracji, lecz jako „skąd biorą się ślady, które trafiają do SIEM, i jak utwardzić system, zanim ktoś go zaatakuje". Most w dwie strony: **w górę do Active Directory** (logowanie domenowe, GPO) i **w bok do SIEM** (dziennik zdarzeń jako źródło logów).

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Windows` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Administracja systemami i skrypty" (`unionShare` grupy: **16,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **4,0%** ofert ścieżki wymienia Windows |
| **Liczba ofert (`offers`)** | **15** |
| **`kind`** | `tool` (konkretny system operacyjny, nie kompetencja koncepcyjna — patrz §2) |
| **`lift`** | 3,13 (siła powiązania liścia z tą ścieżką — umiarkowany; Windows bywa też w ofertach administracyjnych spoza cyber) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Linux | 9,4 | 35 | tool | 1,75 |
| **Windows** (ten plik) | 4,0 | 15 | tool | 3,13 |
| PowerShell | 3,2 | 12 | tool | 2,03 |
| Bash | 3,0 | 11 | tool | 1,83 |

**Wniosek dla autoringu:** Windows jest drugim co do popytu fundamentem w grupie (4,0% — po Linuksie). Wyższy `lift` niż Linuksa (3,13 vs 1,75) znaczy, że gdy oferta cyber w ogóle wymienia Windows, jest to *silniejszy* sygnał przynależności do tej ścieżki niż Linux — bo bezpieczeństwo Windows (dziennik zdarzeń, konta domenowe, GPO) to konkretna kompetencja obrońcy, a nie ogólna obsługa pulpitu. Research Windows jest **fundamentem dwóch dalszych liści tej samej grupy** (`PowerShell` — bo PowerShell żyje w Windows) **i grupy IAM** (`Active Directory` — bo logowanie domenowe to zdarzenia Windows), a zarazem **dostawcą źródła danych dla SIEM**. Dlatego w łańcuchu autoringu wchodzi przed PowerShell-detekcją i przed regułami uwierzytelniania domenowego.

---

## 2. Definicja kompetencji i jej rola w pracy

**Windows** (system operacyjny Microsoftu) to dla specjalisty bezpieczeństwa nie „okienka i pulpit", lecz **najczęstsze środowisko, którego się broni i które się atakuje** w polskich i europejskich firmach. Stacje robocze pracowników, serwery plików, kontrolery domeny — to w przeważającej części Windows. Kompetencja „Windows" w cyber oznacza umiejętność zrobienia czterech rzeczy, których zwykły użytkownik systemu nie widzi:

1. **Czytanie dziennika zdarzeń (Event Log — wbudowany rejestr zdarzeń systemu)** — kto się zalogował, co uruchomił, co się nie udało. To główne *źródło śladów* dla całego monitorowania bezpieczeństwa.
2. **Zarządzanie kontami i uprawnieniami** — konta lokalne i domenowe, grupy, przywileje (privileges), prawa logowania; rozumienie, dlaczego „konto administratora wszędzie" to katastrofa.
3. **Hartowanie (hardening — utwardzanie)** — zamykanie zbędnych drzwi: wyłączanie nieużywanych usług, polityki haseł, kontrola aplikacji, zasady zapory.
4. **Rozpoznawanie typowych ataków na Windows i ich śladów** — kradzież poświadczeń, nadużycie uprawnień, trwałość (persistence — zakotwiczenie napastnika), ruch boczny (lateral movement — przeskakiwanie między maszynami) i to, co po nich zostaje w dzienniku.

**Czym kompetencja „Windows" w cyber NIE jest (rozróżnienie zawodowca):**
- To nie kurs obsługi systemu dla użytkownika ani nie pełna administracja IT (instalacja drukarek, zarządzanie aktualizacjami w skali). To **soczewka bezpieczeństwa** nałożona na system: „gdzie powstają ślady i jak zmniejsza powierzchnię ataku".
- To nie to samo co Active Directory. AD (Active Directory — katalog tożsamości domenowych) to *usługa* działająca na Windows Server; logowanie domenowe generuje zdarzenia na kontrolerze domeny. Windows jako liść to fundament — pojedyncza maszyna, jej konta i dziennik — na którym AD nadbudowuje warstwę domenową. AD to osobny research (grupa IAM).
- To nie PowerShell. PowerShell (powłoka i język automatyzacji Windows) to *narzędzie do sterowania* Windows; tu opisujemy *system*, który PowerShell obsługuje. PowerShell to osobny liść tej grupy, nadbudowujący nad Windows.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja Windows-od-strony-bezpieczeństwa jest codziennością:
- **Analityka SOC / inżyniera detekcji** — bo większość alertów dotyczy zdarzeń Windows (nieudane logowania, uruchomienie podejrzanego procesu, utworzenie konta). Bez rozumienia, *co dane zdarzenie znaczy*, analityk nie odróżni normalnej pracy administratora od ataku.
- **Administratora systemów / inżyniera bezpieczeństwa** — który utwardza stacje i serwery, ustawia polityki przez GPO (Group Policy — zasady grupy, centralny mechanizm konfiguracji wielu maszyn naraz) i pilnuje, by konta miały najmniejsze potrzebne uprawnienia.
- **Specjalisty reagowania na incydenty (Incident Response)** — który po włamaniu czyta dziennik zdarzeń jak detektyw: kiedy napastnik wszedł, czego dotknął, gdzie się zakotwiczył.

**Po co rynkowi ta kompetencja.** Skoro większość firmowych stacji i serwerów to Windows, większość realnych incydentów *zaczyna się i zostawia ślad* w Windows. Junior, który umie czytać dziennik zdarzeń i utwardzić system, jest natychmiast użyteczny w SOC — bo to dane, na których SOC pracuje codziennie. Regulacje (NIS2, DORA) wymagają zdolności wykrywania i zgłaszania incydentów; bez umiejętności odczytania śladów w Windows ta zdolność jest pusta.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

### L1 — Fundamenty: konta, uprawnienia i dziennik zdarzeń (3–6 h)

**Zakres wiedzy/umiejętności:**
- Model kont Windows: konto lokalne vs domenowe, grupy wbudowane (Administratorzy, Użytkownicy), pojęcie przywileju (privilege) i prawa logowania.
- Otwarcie i odczytanie **dziennika zdarzeń** (Podgląd zdarzeń / Event Viewer): dzienniki Security, System, Application; pojęcie identyfikatora zdarzenia (Event ID) jako etykiety typu zdarzenia.
- Rozpoznanie kilku kluczowych zdarzeń bezpieczeństwa po ich Event ID: udane logowanie (4624), nieudane logowanie (4625), utworzenie konta (4720), dodanie do grupy uprzywilejowanej. Pojęcie typu logowania (logon type — np. interaktywne, sieciowe, zdalny pulpit).
- Eksport fragmentu dziennika do pliku (np. `.evtx` lub CSV) jako dowód do dalszej analizy — most do SIEM: to są właśnie dane, które zaciąga SIEM.

**Co student musi UMIEĆ ZROBIĆ:** na własnej treningowej maszynie wirtualnej znaleźć w dzienniku zdarzeń udane i nieudane logowanie, odczytać z nich konto, czas i typ logowania; wyeksportować fragment dziennika; opisać słownie, co każde zdarzenie znaczy dla bezpieczeństwa.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Nie każde nieudane logowanie to atak, i nie każde udane jest niewinne.** 4625 (nieudane) o 9:00 to zwykle literówka w haśle; seria 4625 z jednego źródła w nocy, a potem 4624 (udane) — to może być włamanie. Sam Event ID nic nie znaczy bez *kontekstu i wzorca*.
- **Typ logowania (logon type) zmienia wszystko.** Logowanie typu 2 (przy klawiaturze) i typu 3 (sieciowe) albo 10 (zdalny pulpit, RDP) to zupełnie różne historie — administrator przy biurku vs ktoś łączący się z zewnątrz. Amator czyta „zalogowano" i nie patrzy na typ.
- **Domyślnie Windows loguje mało.** Część kluczowych zdarzeń (np. uruchomienie procesu, 4688) jest wyłączona, dopóki nie włączy się audytu. „Cisza w dzienniku" zwykle znaczy „nikt nie włączył logowania", nie „nic się nie działo".

### L2 — Zastosowanie: hartowanie i audyt zdarzeń (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Hartowanie systemu (hardening):** polityka haseł i blokady konta, wyłączenie zbędnych usług i protokołów, zasady zapory Windows, kontrola, kto może logować się zdalnie. Pojęcie powierzchni ataku (attack surface — suma wszystkich „drzwi" do systemu) i jej zmniejszania.
- **Zasady grupy (GPO — Group Policy):** czym jest centralna zasada konfiguracji wielu maszyn naraz i czemu w firmie utwardza się przez GPO, nie ręcznie na każdej maszynie. (Na pojedynczej maszynie: lokalna zasada bezpieczeństwa.)
- **Polityka audytu (audit policy):** świadome *włączenie* logowania właściwych zdarzeń (logowania, zarządzania kontami, uruchamiania procesów) — żeby ślad w ogóle powstawał. To warunek tego, by SIEM miał co zaciągać.
- **Model najmniejszych uprawnień na Windows:** rozdzielenie konta codziennej pracy od konta administracyjnego, kontrola konta użytkownika (UAC — User Account Control, mechanizm potwierdzania działań administracyjnych), ryzyko „lokalnego administratora na wszystkim".
- **Punkt odniesienia bezpieczeństwa (security baseline):** pojęcie gotowego, sprawdzonego zestawu ustawień (np. Microsoft Security Baseline / CIS Benchmark — publiczny standard konfiguracji) i pomiar „przed/po".

**Co student musi UMIEĆ ZROBIĆ:** utwardzić własną treningową maszynę Windows wg jawnej listy zmian (hasła, usługi, zapora, audyt); włączyć politykę audytu tak, by powstawały zdarzenia logowania i zarządzania kontami; udokumentować dla każdej zmiany, *na jaki atak* odpowiada; zmierzyć efekt punktem odniesienia przed/po.

**Profesjonalne niuanse:**
- **Hartowanie bez włączonego audytu to połowa roboty.** Można zamknąć drzwi, ale jeśli nie logujesz prób ich otwarcia, nie wiesz, że ktoś próbuje. Zawodowiec utwardza *i* włącza ślad — jedno bez drugiego jest niepełne.
- **Najmniejsze uprawnienie boli, dopóki nie zaboli włamanie.** Odebranie ludziom lokalnego administratora to konflikt z wygodą; ale konto z nadmiarem uprawnień to dla napastnika skrót do przejęcia maszyny. Zawodowiec umie *uzasadnić* każde uprawnienie, nie tylko je nadać.
- **Baseline to start, nie koniec.** Gotowy standard (CIS) bywa za ostry albo za luźny dla konkretnej firmy — zawodowiec rozumie *dlaczego* dane ustawienie tam jest i świadomie odstępuje (z dokumentacją), zamiast wklejać na ślepo.

### L3 — Portfolio: ataki na Windows, ślady i pokrycie detekcji (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Typowe techniki ataku na Windows i ślad, jaki zostawiają** (poznawane wyłącznie po to, by je wykrywać — klauzula §7): kradzież poświadczeń z pamięci, nadużycie uprawnień, trwałość przez zadanie zaplanowane lub klucz rejestru, ruch boczny między maszynami. Co każda z nich zostawia w dzienniku zdarzeń.
- **Mapowanie śladów na MITRE ATT&CK** (otwarta baza taktyk i technik napastników — patrz §4 i §7): przypisanie „to zdarzenie 4688 z taką linią poleceń = technika T____", świadome zbudowanie pokrycia detekcji dla Windows i nazwanie luk (blind spots — martwych pól).
- **Telemetria ponad domyślną:** **Sysmon** (darmowe narzędzie Microsoft Sysinternals, które loguje znacznie więcej niż domyślny Windows — tworzenie procesów z pełną linią poleceń, połączenia sieciowe, zmiany w rejestrze) i to, jak diametralnie zmienia widoczność.
- **Korelacja z resztą firmy:** doprowadzenie zdarzeń Windows do SIEM (most do liścia SIEM) i połączenie ich z innymi źródłami w jeden alert wyższej pewności.
- **Reagowanie wstępne (triage hosta):** po alercie — które zdarzenia zebrać, jak ustalić oś czasu (timeline) tego, co napastnik robił na maszynie.

**Co student musi UMIEĆ ZROBIĆ:** odtworzyć na **własnym, izolowanym labie** bezpieczną symulację techniki ATT&CK (np. zestawem Atomic Red Team), pokazać, jaki ślad zostawiła w dzienniku/Sysmon, napisać dla niej regułę wykrywającą zmapowaną na ATT&CK i udowodnić, że reguła się odpaliła; zbudować oś czasu zdarzeń hosta po incydencie; świadomie nazwać lukę pokrycia.

**Profesjonalne niuanse:**
- **Domyślny Windows jest prawie ślepy na ataki w pamięci.** Bez Sysmon (albo równoważnej telemetrii) wiele technik nie zostawia użytecznego śladu. Zawodowiec wie, że „nic nie ma w dzienniku" często znaczy „nie zbieramy właściwych danych", nie „było czysto".
- **Linia poleceń procesu to złoto detekcji.** Sam fakt uruchomienia `powershell.exe` jest nudny; *to, z jakimi argumentami* (zakodowane polecenie, pobranie z sieci) odróżnia administratora od ataku. To dlatego audyt linii poleceń (4688 z command line / Sysmon ID 1) jest tak ceniony.
- **Living-off-the-land — napastnik używa Twoich własnych narzędzi.** Wiele ataków na Windows nie wnosi żadnego „wirusa" — używa wbudowanych programów systemu (PowerShell, `wmic`, `certutil`). Dlatego detekcja oparta tylko na „znanym złym pliku" zawodzi; trzeba patrzeć na *zachowanie*. (Rozwinięcie tego wątku — research `PowerShell`.)

### L4 — Realny przypadek profesjonalny: dochodzenie i utwardzenie po incydencie (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, zaszumionego* zrzutu dziennika zdarzeń z zainfekowanej (treningowo) maszyny i odtworzenie pełnej osi czasu ataku: wejście → zakotwiczenie → ruch boczny → cel — wyłącznie z dowodów w logach.
- Zaprojektowanie planu utwardzenia *konkretnej* roli maszyny (np. serwer plików w firmie objętej NIS2) z uzasadnieniem każdej decyzji wobec ryzyka i kosztu operacyjnego.
- **Benchmark:** oś czasu i plan utwardzenia studenta zestawione z tym, co ustalił i zaproponował profesjonalista na tym samym zrzucie.

### L5 — Biegłość: strategia widoczności i utwardzenia floty Windows (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia telemetrii dla całej floty:** które zdarzenia logować na wszystkich maszynach, a które tylko na krytycznych — świadoma wobec kosztu zaciągu do SIEM (rozjazd z ekonomią SIEM, research SIEM §4) i hałasu.
- **Hartowanie w skali przez GPO:** projekt zestawu zasad dla całej domeny, z warstwami (stacje vs serwery vs kontrolery domeny) i procesem wyjątków.
- **Utwardzenie jako kod / mierzalna zgodność:** ciągły pomiar dryfu konfiguracji (configuration drift — rozjeżdżanie się ustawień w czasie) wobec baseline, raport zgodności dla audytora.
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie „czy utwardzone", lecz „czy utwardzone w sposób utrzymywalny i mierzalny dla całej organizacji".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Domyślny Windows loguje za mało.** Najgroźniejszy fałszywy spokój: brak audytu uruchamiania procesów, brak Sysmon → atak przechodzi bez śladu. Zawodowiec najpierw *włącza widoczność*, dopiero potem ufa „ciszy w dzienniku".

2. **Event ID bez kontekstu kłamie.** Ten sam identyfikator zdarzenia (np. 4624 — udane logowanie) to rutyna albo włamanie zależnie od konta, typu logowania, źródła i pory. Detekcja na samym ID daje lawinę fałszywych alarmów; detekcja na *wzorcu* daje sygnał.

3. **Typ logowania (logon type) to klucz interpretacji.** Interaktywne (2), sieciowe (3), zdalny pulpit (10) — różne historie ryzyka. Pominięcie typu to klasyczny błąd juniora przy triage zdarzeń Windows.

4. **Linia poleceń to serce detekcji na Windows.** *Co* uruchomiono i z jakimi argumentami waży więcej niż *że* uruchomiono. Włączenie audytu linii poleceń (4688) lub Sysmon (ID 1) to jeden z najtańszych dużych skoków widoczności.

5. **Living-off-the-land — atak Twoimi narzędziami.** Napastnicy nadużywają wbudowanych programów Windows (PowerShell, `certutil`, `wmic`, zadania zaplanowane), żeby nie wnosić wykrywalnego pliku. Detekcja „po nazwie złego pliku" jest ślepa na to; liczy się zachowanie.

6. **Najmniejsze uprawnienie to nie hasło, to architektura.** Rozdzielenie konta pracy od konta administracyjnego, brak lokalnego administratora „dla wygody", ograniczenie praw logowania — to ogranicza, jak daleko zajdzie napastnik po przejęciu jednego konta. Amator daje uprawnienia „żeby działało".

7. **Mapowanie na MITRE ATT&CK** (otwarta, darmowa baza taktyk i technik realnych napastników) — wspólny język między śladem w dzienniku a techniką ataku. Ślad bez przypisanej techniki nie odpowiada na pytanie „przed czym chroni reguła".

8. **Trwałość (persistence) chowa się w nudnych miejscach.** Zadanie zaplanowane, klucz rejestru autostartu, usługa — to typowe kotwice napastnika, każda z własnym śladem. Zawodowiec wie, *gdzie* patrzeć po incydencie; amator szuka „wirusa".

9. **Czas i strefy.** Dziennik Windows zapisuje czas, ale korelacja z innymi systemami działa tylko przy zsynchronizowanych zegarach (NTP — protokół synchronizacji czasu). Rozjechany czas = niewidzialny atak przy korelacji w SIEM. (Wspólny niuans z researchem SIEM — most.)

10. **Baseline to punkt wyjścia, nie wyrocznia.** Gotowy standard (CIS / Microsoft Security Baseline) bywa nieadekwatny do konkretnej roli maszyny. Zawodowiec rozumie *każde* ustawienie i świadomie odstępuje z dokumentacją; amator wkleja na ślepo i albo psuje działanie, albo zostawia dziury.

11. **Granica etyczno-prawna jest częścią kompetencji.** Techniki ofensywne poznaje się **wyłącznie na własnym/treningowym, izolowanym systemie**, po to, by je wykrywać i im zapobiegać. Dzienniki zdarzeń bywają danymi osobowymi (login, adres IP — wyrok TSUE Breyer, C-582/14). Nieautoryzowany dostęp do cudzego systemu lub danych jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Windows muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student potrafił samodzielnie czytać ślady Windows, utwardzić system i rozpoznać atak. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| W1 | L1 | **Czytanie dziennika zdarzeń** — na własnej maszynie znaleźć i zinterpretować 4624/4625/4720, odczytać konto/czas/typ logowania, wyeksportować fragment | Konta, Event ID, logon type, eksport dziennika | #2, #3 |
| W2 | L2 | **Hartowanie stacji Windows + pomiar przed/po** — lista zmian (hasła, usługi, zapora), baseline CIS/Microsoft, uzasadnienie per zmiana | Hartowanie, baseline, powierzchnia ataku, najmniejsze uprawnienie | #6, #10 |
| W3 | L2 | **Włączenie audytu i widoczności** — polityka audytu + instalacja Sysmon, dowód, że właściwe zdarzenia teraz powstają | Polityka audytu, telemetria, audyt linii poleceń | #1, #4 |
| W4 | L3 | **Ślad ataku w dzienniku** — bezpieczna symulacja techniki (Atomic Red Team) na własnym labie, pokazanie śladu, oś czasu zdarzeń | Techniki ataku i ślady, oś czasu, triage hosta | #5, #8 |
| W5 | L3 | **Reguła detekcji Windows + mapa ATT&CK** — reguła na ślad z W4 zmapowana na technikę, dowód odpalenia, nazwana luka pokrycia; doprowadzenie zdarzeń do SIEM | Mapowanie ATT&CK, pokrycie, korelacja, most do SIEM | #4, #7 |
| (W6–W7) | L4–L5 | **ZAPOWIEDŹ** — dochodzenie po incydencie z brudnego zrzutu + plan utwardzenia roli (NIS2); strategia telemetrii i hartowania floty przez GPO; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #9, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 5 projektów.** L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** W1 (czytanie dziennika) → W2 (hartowanie) → W3 (audyt/widoczność) → W4 (ślad ataku) → W5 (reguła + ATT&CK + most do SIEM). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy: nie da się detekować (W5) bez śladu (W4), a śladu nie ma bez włączonego audytu (W3).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Windows-od-strony-bezpieczeństwa **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawy systemu operacyjnego i pojęcie logu** — co to konto, proces, usługa, zdarzenie; co to log i gdzie powstaje. Część budowana w L1 tutaj, ale fundament logów uwierzytelniania domyka projekt partii 1 `cyber-python-automatyzacja-logow` (liść `Python`). **Wymagane/równoległe na L1.**
2. **Podstawy sieci i TCP/IP** (liście `TCP/IP`, `Network`) — bez pojęcia adresu IP, portu i sesji student nie zinterpretuje logowania sieciowego (logon type 3) ani zdalnego pulpitu (10). **Wymagane przed L1 (interpretacja typów logowania).**
3. **Pojęcie hartowania** — bazowa idea „zamykania zbędnych drzwi" budowana równolegle przez projekt partii 1 `cyber-hardening-linux-bash` (liść `Linux`/`Bash`); Windows nadbudowuje ją specyfiką swojego systemu. **Wymagane/równoległe na L2.**
4. **Mapowanie zagrożeń** — pojęcie MITRE ATT&CK i języka technik napastnika. Częściowo wprowadzane w grupie SIEM; tutaj stosowane do śladów Windows. **Wymagane przed L3.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie). **Wymagane od L1.**

**Czego Windows dostarcza jako prerekwizyt dla innych liści (most w górę i w bok):**
- **`PowerShell`** (ten sam dział) — PowerShell żyje wewnątrz Windows; nie da się sensownie uczyć PowerShella jako narzędzia obrońcy/wektora ataku bez rozumienia kont, uprawnień i dziennika zdarzeń Windows. **Windows jest wymagany przed PowerShell-detekcją.**
- **`Active Directory`** (grupa IAM) — logowanie domenowe to zdarzenia Windows na kontrolerze domeny; GPO to mechanizm Windows. Fundament pojedynczej maszyny (tutaj) poprzedza warstwę domenową. **Windows poprzedza ataki na AD i ich detekcję.**
- **`SIEM`** (grupa SIEM) — dziennik zdarzeń Windows to jedno z głównych *źródeł danych* dla SIEM. Reguły uwierzytelniania w SIEM zakładają, że student rozumie, co znaczą zdarzenia Windows, które tam wpływają. **Windows zasila SIEM danymi i interpretacją.**

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja oficjalna (Microsoft, darmowa):**
- Windows Security — dokumentacja bezpieczeństwa systemu: https://learn.microsoft.com/en-us/windows/security/
- Lista zdarzeń bezpieczeństwa Windows (Event ID — np. 4624/4625/4720): https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/security-auditing-overview
- Zalecenia polityki audytu (audit policy recommendations): https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/audit-policy-recommendations
- Sysmon (Sysinternals — rozszerzona telemetria): https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon
- Microsoft Security Baselines (gotowe punkty odniesienia konfiguracji): https://learn.microsoft.com/en-us/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines
- Windows Server — darmowa wersja ewaluacyjna (180 dni, do laba): https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK (baza taktyk i technik napastników): https://attack.mitre.org/
- Atomic Red Team (bezpieczne odwzorowania technik ATT&CK do testu detekcji na własnym labie): https://github.com/redcanaryco/atomic-red-team
- Sigma (otwarty, neutralny format reguł detekcji): https://github.com/SigmaHQ/sigma

**Standardy i normy (oficjalne):**
- CIS Benchmarks for Microsoft Windows (publiczny standard utwardzenia): https://www.cisecurity.org/benchmark/microsoft_windows_desktop
- NIST SP 800-92 „Guide to Computer Security Log Management" (zarządzanie logami): https://csrc.nist.gov/pubs/sp/800/92/final
- NIST Cybersecurity Framework 2.0 (funkcja Detect/Respond): https://www.nist.gov/cyberframework

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/zgłaszania): https://eur-lex.europa.eu/eli/dir/2022/2555

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Windows Server używany wyłącznie w darmowej wersji ewaluacyjnej (180 dni, cel nauki) — bez naruszenia licencji. Dzienniki zdarzeń mogą zawierać dane osobowe (login, adres IP) — projekty wymagają klauzuli maskowania i pracy wyłącznie na własnym/treningowym systemie. Symulacje technik ofensywnych (Atomic Red Team) wyłącznie na izolowanym labie studenta. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do SOC i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził byciem „kursem administracji Windows", nie bezpieczeństwa.** CISO: „nie potrzebuję kogoś, kto instaluje role serwera — potrzebuję kogoś, kto czyta ślad ataku". **Poprawka:** przeformułowałam soczewkę w §1/§2 jednoznacznie na obrońcę (dziennik zdarzeń jako źródło śladów, ataki i ich ślady), a administrację zostawiłam tylko tam, gdzie służy bezpieczeństwu (hartowanie, audyt). Mapa L1–L3 prowadzi od czytania śladu do detekcji, nie od instalacji systemu.

2. **Słabość: pominięta ślepota domyślnego Windows.** CISO: „junior, który ufa, że «w dzienniku nic nie ma», jest groźny — bo domyślnie Windows prawie nie loguje". **Poprawka:** wyniosłam to do niuansu #1 i dodałam osobny projekt L2 (W3) o włączeniu audytu i Sysmon — widoczność jako warunek, nie dodatek.

3. **Słabość: detekcja deklaratywna, bez śladu i dowodu.** CISO: „«napisz regułę na 4625» bez pokazania realnego śladu to teoria". **Poprawka:** rozdzieliłam „ślad ataku" (W4 — symulacja na labie, oś czasu) od „reguła detekcji" (W5 — z dowodem odpalenia i mapą ATT&CK). Student najpierw *widzi* ślad, potem na nim buduje wykrycie.

4. **Słabość: living-off-the-land i linia poleceń pominięte.** CISO: „połowa realnych ataków na Windows to nadużycie wbudowanych narzędzi — bez tego junior łapie tylko «znane złe pliki»". **Poprawka:** dodałam niuanse #4 (linia poleceń jako serce detekcji) i #5 (living-off-the-land) oraz wskazałam most do researchu PowerShell, gdzie ten wątek się rozwija.

5. **Słabość: prerekwizyty i mosty były listą, nie łańcuchem.** CISO: „obchodzi mnie, czego student nie zinterpretuje, bo przeskoczył sieci albo nie rozumie typu logowania". **Poprawka:** §6 przepisałam jako jawny łańcuch (sieci/TCP-IP przed interpretacją logon type, hartowanie z partii 1 równolegle) i dodałam sekcję „czego Windows dostarcza dalej" (PowerShell, AD, SIEM) — bo to uzasadnia kolejność autoringu i pokazuje, że Windows jest węzłem, nie wyspą.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Event Log/dziennik zdarzeń, Event ID, logon type, GPO, UAC, hardening, attack surface, baseline, CIS, Sysmon, living-off-the-land, persistence, lateral movement, MITRE ATT&CK, Sigma, Atomic Red Team, NTP, RDP, SIEM, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla pracy juniora SOC/admina bezpieczeństwa, jeśli autoring domknie 5 projektów L1–L3 z niuansami #1–#8. Niuanse #9 (czas/korelacja w skali) i #10 (utwardzenie floty) domkną się dopiero na L4/L5 (zależność od Ethana/Leo) — research je zapowiada, oznaczone uczciwie, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (ścieżki, streszczenie, punkty dla Ryana, zależności L4/L5) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
