# Research kompetencji: PowerShell

> **Status:** research liścia ścieżki Cybersecurity Specialist (grupa „Administracja systemami i skrypty"), powstały wg wzorca `tools/content/research/siem.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.
> **Zależność treściowa:** ten research **nadbudowuje nad `Windows`** (`tools/content/research/windows.md`) — zakłada, że student rozumie już konta, uprawnienia i dziennik zdarzeń Windows. Nie powtarza tej teorii.
> **Soczewka (perspektywa):** PowerShell ma w cyberbezpieczeństwie **dwojaką naturę** — jest najlepszym narzędziem obrońcy (automatyzacja, zbieranie dowodów, przeszukiwanie logów) **i** jednym z ulubionych narzędzi atakującego (wykonanie kodu, pobieranie ładunku, life-off-the-land). Cała soczewka tego researchu to napięcie między tymi dwiema rolami — i to, jak logowanie samego PowerShella zamienia go z zagrożenia w źródło detekcji.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `PowerShell` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Administracja systemami i skrypty" (`unionShare` grupy: **16,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,2%** ofert ścieżki wymienia PowerShell |
| **Liczba ofert (`offers`)** | **12** |
| **`kind`** | `tool` (konkretna powłoka i język automatyzacji, nie kompetencja koncepcyjna — patrz §2) |
| **`lift`** | 2,03 (siła powiązania liścia z tą ścieżką — umiarkowana; PowerShell bywa też w ofertach czysto administracyjnych) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| Linux | 9,4 | 35 | tool | 1,75 |
| Windows | 4,0 | 15 | tool | 3,13 |
| **PowerShell** (ten plik) | 3,2 | 12 | tool | 2,03 |
| Bash | 3,0 | 11 | tool | 1,83 |

**Wniosek dla autoringu:** PowerShell (3,2%) to trzeci fundament grupy, tuż za Windowsem. To **odpowiednik Basha dla świata Windows** — Bash automatyzuje Linuksa (projekt partii 1 `cyber-hardening-linux-bash`), PowerShell automatyzuje Windows. Ale PowerShell ma cechę, której nie ma żaden inny liść tej grupy: jest jednocześnie *najczęstszym narzędziem obrońcy* i *najczęstszym wektorem ataku* na Windows. Dlatego research jest zbudowany wokół tej dwoistości, a nie wokół „składni języka". W łańcuchu autoringu wchodzi **po Windows** (bo wymaga rozumienia kont, uprawnień i dziennika) i zasila grupę SIEM realnym, trudnym przypadkiem detekcji (wykrywanie nadużycia PowerShella).

---

## 2. Definicja kompetencji i jej rola w pracy

**PowerShell** (powłoka i język automatyzacji Microsoftu) to dwie rzeczy naraz: **interaktywna powłoka** (wiersz poleceń, w którym piszesz komendy do systemu) i **język skryptowy** (w którym zapisujesz te komendy w pliku, by powtarzać pracę bez klikania). W cyberbezpieczeństwie kompetencja „PowerShell" oznacza umiejętność użycia go w obie strony konfliktu — i, co najważniejsze, rozumienia, że to *to samo narzędzie* po obu stronach:

**Rola obrońcy (blue team — drużyna obrony):**
1. **Automatyzacja zadań bezpieczeństwa** — masowe sprawdzenie konfiguracji, zebranie stanu kont, eksport ustawień zapory z wielu maszyn.
2. **Zbieranie dowodów (collection / triage)** — po incydencie szybkie wyciągnięcie z maszyny tego, co potrzebne: procesy, połączenia, zadania zaplanowane, wpisy autostartu.
3. **Przeszukiwanie i analiza logów** — odczyt dziennika zdarzeń poleceniem (np. pobranie wszystkich nieudanych logowań z ostatniej doby) i przefiltrowanie ich szybciej, niż klikając w Podglądzie zdarzeń.

**Rola atakującego (red team / realny napastnik — poznawana wyłącznie po to, by ją wykrywać, klauzula §7):**
4. **Wektor ataku** — PowerShell jest na każdym Windows, ma dostęp do całego systemu i potrafi wykonać kod *bez zapisywania pliku na dysk* (in-memory — w pamięci). To czyni go ulubionym narzędziem ataków typu living-off-the-land (atak z użyciem wbudowanych narzędzi, bez wnoszenia wykrywalnego „wirusa").

**Czym kompetencja „PowerShell" w cyber NIE jest (rozróżnienie zawodowca):**
- To nie kurs programowania ogólnego. Skupiamy się na zadaniach bezpieczeństwa (logi, konta, dowody, detekcja), nie na pisaniu dowolnych aplikacji.
- To nie „nauka komend na pamięć". Zawodowca odróżnia rozumienie, *dlaczego* dany sposób uruchomienia PowerShella jest podejrzany i *jaki ślad* zostawia — nie znajomość listy poleceń.
- To nie konkurencja dla Pythona (osobny liść). Python automatyzuje *ponad systemami* i integruje narzędzia przez ich API; PowerShell jest *natywny dla Windows* — głębiej wrośnięty w system, dlatego zarazem groźniejszy jako wektor i mocniejszy jako narzędzie obrońcy na Windows.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja PowerShell-w-cyber to codzienność:
- **Analityka SOC / inżyniera detekcji** — pisze reguły wykrywające *nadużycie* PowerShella i czyta logi bloków skryptów (script block logging — patrz niżej), żeby zobaczyć, co napastnik faktycznie uruchomił.
- **Inżyniera bezpieczeństwa / administratora** — automatyzuje hartowanie i audyt floty Windows, zbiera stan konfiguracji.
- **Specjalisty reagowania na incydenty (Incident Response)** — używa PowerShella do szybkiego zebrania dowodów z zaatakowanej maszyny.

**Po co rynkowi ta kompetencja.** PowerShell jest na każdej maszynie Windows, więc napastnicy go kochają, a obrońcy muszą umieć i go *używać*, i *wykrywać jego nadużycie*. Junior, który rozumie tę dwoistość — i wie, że klucz to **włączenie logowania PowerShella, żeby zamienić go z czarnej skrzynki w źródło detekcji** — jest natychmiast użyteczny. To również ćwiczenie dojrzałości: to samo narzędzie, którym automatyzujesz obronę, jest tym, którego nadużycia szukasz.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". (Zakłada opanowany research `Windows` — patrz nagłówek i §6.)

### L1 — Fundamenty: PowerShell jako narzędzie obrońcy (3–6 h)

**Zakres wiedzy/umiejętności:**
- Model PowerShella: polecenie (cmdlet — komenda w formie `Czasownik-Rzeczownik`, np. `Get-Process`), potok (pipeline — przekazanie wyniku jednego polecenia do drugiego), obiekt (PowerShell zwraca dane jako obiekty z polami, nie surowy tekst — to klucz do filtrowania).
- **Odczyt dziennika zdarzeń poleceniem:** pobranie zdarzeń (np. nieudanych logowań 4625) z ostatniej doby, filtrowanie po polach, zliczanie, eksport do CSV. Most do Windows i SIEM: to samo zdarzenie, które w researchu Windows czytało się w Podglądzie zdarzeń, tutaj pobieramy *programowo i powtarzalnie*.
- **Zebranie stanu maszyny:** lista procesów, połączeń sieciowych, lokalnych kont i grup, zadań zaplanowanych — jako prosty „zrzut stanu" do dalszej analizy.
- Pojęcie polityki wykonywania skryptów (execution policy) i — ważne — świadomość, że to **nie** mechanizm bezpieczeństwa, lecz zabezpieczenie przed przypadkowym uruchomieniem (patrz niuans §4).

**Co student musi UMIEĆ ZROBIĆ:** na własnej treningowej maszynie napisać 3–5 poleceń/krótki skrypt, który pobiera z dziennika zdarzeń wybrane zdarzenia bezpieczeństwa, filtruje je i eksportuje do pliku; zebrać zrzut stanu maszyny (procesy/konta/zadania); opisać, do czego obrońcy służy każdy wynik.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **PowerShell zwraca obiekty, nie tekst — to zmienia wszystko.** Amator próbuje „wyciąć" dane jak z tekstu; zawodowiec filtruje po *polach obiektu* (np. po właściwości `Id` zdarzenia), co jest pewne i czytelne. Niezrozumienie tego to pierwszy próg.
- **Execution policy nie chroni przed napastnikiem.** To częste złudzenie juniora: „mam ustawione Restricted, więc jestem bezpieczny". Napastnik obchodzi to jedną flagą — to bariera przed przypadkiem, nie przed atakiem.
- **Czas i strefy w zdarzeniach.** Pobierając zdarzenia po czasie, łatwo pomylić strefę i „nie znaleźć" tego, co jest w danych (wspólny niuans z Windows i SIEM — most).

### L2 — Zastosowanie: automatyzacja hartowania i audytu (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Skrypt audytu konfiguracji:** sprawdzenie stanu zabezpieczeń maszyny (polityka haseł, usługi, ustawienia zapory, członkostwo w grupie administratorów) i raport „zgodne/niezgodne" wobec listy oczekiwań.
- **Higiena skryptu:** funkcje, parametry zamiast wartości zaszytych na sztywno, obsługa błędów, idempotencja (ponowne uruchomienie nie psuje stanu) — bo skrypt bezpieczeństwa, który psuje maszynę, jest gorszy niż jego brak.
- **Automatyzacja zbierania dowodów (triage):** jeden skrypt, który po podejrzeniu incydentu zbiera komplet: procesy z linią poleceń, połączenia, zadania zaplanowane, wpisy autostartu, ostatnie zdarzenia logowania — i zapisuje do uporządkowanego pakietu.
- **Świadomość śladu własnego skryptu:** uruchomienie PowerShella samo generuje zdarzenia — obrońca musi wiedzieć, że jego działania też zostawiają ślad (i dlaczego to dobrze).

**Co student musi UMIEĆ ZROBIĆ:** napisać czytelny, parametryzowany skrypt audytu konfiguracji z raportem zgodności; napisać skrypt zbierający pakiet dowodów triage; udokumentować, na jaki cel bezpieczeństwa odpowiada każdy element. Wszystko na własnej/treningowej maszynie.

**Profesjonalne niuanse:**
- **Skrypt bezpieczeństwa to też kod, który może zaszkodzić.** Brak obsługi błędów albo zaszyta ścieżka → skrypt audytu psuje konfigurację albo daje fałszywy obraz. Zawodowiec pisze skrypt odwracalny i idempotentny; amator „byle działało raz".
- **Zbieranie dowodów zmienia dowody.** Każde uruchomienie czegoś na zaatakowanej maszynie tworzy nowe procesy i wpisy w logach — zawodowiec rozumie tę „obserwator zmienia obserwowane" i dokumentuje, co sam zrobił, by nie pomylić tego ze śladem napastnika.
- **Automatyzacja w skali wymaga uprawnień — a to ryzyko.** Skrypt chodzący po wielu maszynach potrzebuje konta z dużym dostępem; takie konto to łakomy cel. Zawodowiec ogranicza jego uprawnienia i zasięg (most do najmniejszego uprawnienia z researchu Windows).

### L3 — Portfolio: PowerShell jako wektor ataku i jego detekcja (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Logowanie PowerShella jako fundament detekcji** — trzy mechanizmy, które trzeba *włączyć*, by zobaczyć, co PowerShell zrobił:
  - **Script Block Logging (logowanie bloków skryptów)** — zapisuje *faktyczną treść* wykonanego kodu, nawet po jego odkodowaniu/odszyfrowaniu. To pojedynczo najważniejsze źródło wykrywania nadużycia PowerShella (Event ID 4104).
  - **Module Logging (logowanie modułów)** — co które polecenia robiły.
  - **Transcription (transkrypcja sesji)** — pełny zapis interaktywnej sesji.
- **Typowe wzorce nadużycia i ich ślad** (poznawane wyłącznie po to, by je wykrywać — klauzula §7): wykonanie zakodowanego polecenia (`-EncodedCommand`), pobranie i uruchomienie kodu z sieci w pamięci, obejście polityki wykonywania, ukrycie okna. Jaki ślad każde zostawia w logu bloków skryptów.
- **Reguła detekcji oparta na zachowaniu, nie na nazwie pliku:** wykrycie *podejrzanego sposobu uruchomienia* PowerShella (zakodowane polecenie, pobieranie z sieci) z logu 4104, zmapowane na MITRE ATT&CK (technika T1059.001 — interpreter poleceń: PowerShell).
- **Test detekcji:** bezpieczne odtworzenie techniki na własnym labie (np. Atomic Red Team) i dowód, że reguła się odpaliła; doprowadzenie zdarzeń 4104 do SIEM (most do liścia SIEM).

**Co student musi UMIEĆ ZROBIĆ:** włączyć logowanie bloków skryptów na własnej maszynie; na izolowanym labie odtworzyć bezpieczną symulację nadużycia PowerShella i pokazać jej ślad w logu 4104; napisać regułę detekcji opartą na zachowaniu, zmapowaną na ATT&CK, i udowodnić jej odpalenie; nazwać lukę pokrycia (czego reguła nie złapie i dlaczego).

**Profesjonalne niuanse:**
- **Logowanie bloków skryptów bije wszystko inne.** Napastnik często zaciemnia kod (obfuscation) albo go koduje; Script Block Logging zapisuje treść *po* rozkodowaniu przez sam PowerShell. To dlatego włączenie 4104 jest pierwszą rzeczą, którą robi dojrzały obrońca na Windows — bez tego PowerShell jest czarną skrzynką.
- **Detekcja po nazwie procesu jest bezsilna.** `powershell.exe` uruchamia się legalnie tysiące razy dziennie. Sygnał jest w *argumentach i zachowaniu* (zakodowane polecenie, pobranie z sieci, brak okna), nie w samym fakcie uruchomienia. Amator alarmuje na `powershell.exe` i tonie w fałszywych alarmach.
- **PowerShell to przykład living-off-the-land w czystej postaci.** Nie ma „wirusa" do wykrycia — jest wbudowane, zaufane narzędzie użyte wrogo. To zmienia całą filozofię detekcji z „szukaj złego pliku" na „szukaj złego zachowania zaufanego narzędzia".
- **Wersja PowerShella ma znaczenie dla obrony.** Stare wersje (np. 2.0) mają słabsze logowanie i bywają celowo przywoływane przez napastnika, by uciec od Script Block Logging (downgrade attack — atak przez zejście do starszej wersji). Zawodowiec wie, że trzeba je wyłączyć.

### L4 — Realny przypadek profesjonalny: dochodzenie w nadużyciu PowerShella (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *realnego, zaciemnionego* zestawu logów bloków skryptów z treningowej maszyny po symulowanym ataku i odtworzenie, co napastnik faktycznie zrobił PowerShellem — mimo zaciemnienia kodu.
- Zaprojektowanie zestawu reguł detekcji nadużycia PowerShella nastrojonych tak, by łapały realne zachowania, ale nie alarmowały na codzienną pracę administratorów (napięcie fałszywy pozytyw vs fałszywy negatyw — most do researchu SIEM).
- **Benchmark:** odtworzenie ataku i zestaw reguł studenta zestawione z tym, co ustalił i napisał profesjonalista na tym samym przypadku.

### L5 — Biegłość: strategia logowania i ograniczania PowerShella w organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia widoczności PowerShella dla floty:** włączenie Script Block Logging przez GPO na całej domenie, wyłączenie starych wersji, świadomość kosztu zaciągu tych logów do SIEM (rozjazd z ekonomią SIEM — research SIEM §4).
- **Ograniczanie powierzchni:** tryby ograniczonego języka (Constrained Language Mode), reguły kontroli aplikacji — zmniejszenie tego, co PowerShell *może* zrobić, bez zabijania jego użyteczności dla administratorów.
- **Detekcja jako kod:** reguły nadużycia PowerShella w repozytorium z testami (most do Sigma/detection-as-code z researchu SIEM).
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa: nie „czy wykrywa pojedynczy atak", lecz „czy organizacja widzi i ogranicza PowerShella w sposób utrzymywalny i za rozsądny koszt".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Dwoistość to sedno, nie ciekawostka.** To samo narzędzie, którym automatyzujesz obronę, jest najczęstszym wektorem ataku na Windows. Zawodowiec myśli o PowerShellu jednocześnie z obu stron; amator zna tylko jedną i jest ślepy na drugą.

2. **Logowanie bloków skryptów (Script Block Logging, 4104) zamienia PowerShell z zagrożenia w źródło detekcji.** To pojedynczo najważniejszy mechanizm — zapisuje treść kodu *po* odkodowaniu/odszyfrowaniu. Bez niego PowerShell jest czarną skrzynką. Włączenie go to pierwszy ruch dojrzałego obrońcy.

3. **Detekcja po zachowaniu, nie po nazwie.** `powershell.exe` to legalny, wszechobecny proces. Sygnał jest w argumentach (zakodowane polecenie, pobranie z sieci, ukryte okno) i wzorcu, nie w samym uruchomieniu. Alarm na nazwę procesu = lawina fałszywych alarmów.

4. **Execution policy to nie zabezpieczenie.** Polityka wykonywania chroni przed przypadkowym kliknięciem, nie przed napastnikiem (obejście to jedna flaga). Junior, który myśli inaczej, ma fałszywe poczucie bezpieczeństwa.

5. **Living-off-the-land — wróg używa zaufanego narzędzia.** Brak pliku do wykrycia; jest wbudowany, podpisany przez Microsoft program użyty wrogo. To wymusza filozofię „szukaj złego zachowania", nie „szukaj złego pliku".

6. **Zaciemnianie kodu (obfuscation) i kodowanie.** Napastnik ukrywa intencję (Base64, łączenie ciągów, kodowanie). Script Block Logging często łapie treść po rozkodowaniu — ale zawodowiec wie, że i to da się utrudnić, i nie ufa, że „nic podejrzanego w logu = czysto".

7. **Atak przez zejście do starszej wersji (downgrade do PowerShell 2.0).** Stare wersje mają słabe logowanie; napastnik celowo je przywołuje, by uciec od detekcji. Obrońca wie, że trzeba je wyłączyć — to typowa luka pokrycia.

8. **Mapowanie na MITRE ATT&CK** (otwarta baza technik napastników) — nadużycie PowerShella to technika T1059.001 (Command and Scripting Interpreter: PowerShell). Reguła bez przypisanej techniki nie odpowiada na pytanie „przed czym chroni".

9. **Skrypt obrońcy też zostawia ślad i może szkodzić.** Automatyzacja działa na uprawnieniach (ryzyko przejęcia konta) i generuje własne zdarzenia. Zawodowiec ogranicza uprawnienia skryptu, pisze go idempotentnie i odwracalnie, i dokumentuje własne działania przy zbieraniu dowodów (by nie pomylić ich ze śladem napastnika).

10. **Czas, strefy i korelacja.** Pobieranie zdarzeń po czasie i korelacja z innymi źródłami działa tylko przy zsynchronizowanych zegarach (NTP). Wspólny fundament z Windows i SIEM — most.

11. **Granica etyczno-prawna jest częścią kompetencji.** Techniki nadużycia PowerShella poznaje się **wyłącznie na własnym/treningowym, izolowanym labie**, po to, by je wykrywać. Logi bloków skryptów i zdarzenia bywają danymi osobowymi (login, adres IP — wyrok TSUE Breyer, C-582/14). Nieautoryzowane uruchomienie kodu na cudzym systemie jest w Polsce przestępstwem (art. 267 i 269a Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty PowerShell muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student potrafił używać PowerShella jako obrońca **i** wykrywać jego nadużycie. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| PS1 | L1 | **PowerShell czyta dziennik** — skrypt pobierający i filtrujący zdarzenia bezpieczeństwa (np. 4625) z eksportem; zrzut stanu maszyny | cmdlet/potok/obiekt, odczyt dziennika poleceniem, stan maszyny | #3, #10 |
| PS2 | L2 | **Skrypt audytu konfiguracji + raport zgodności** — parametryzowany, idempotentny, obsługa błędów | Audyt konfiguracji, higiena skryptu, raport zgodności | #4, #9 |
| PS3 | L2 | **Automatyczne zbieranie dowodów (triage)** — jeden skrypt zbiera pakiet dowodów po podejrzeniu incydentu | Zbieranie dowodów, świadomość własnego śladu | #9 |
| PS4 | L3 | **Włączenie logowania PowerShella + ślad nadużycia** — Script Block Logging (4104), bezpieczna symulacja nadużycia na labie, pokazanie śladu | Logowanie bloków skryptów, wzorce nadużycia i ślad | #2, #5, #6 |
| PS5 | L3 | **Reguła detekcji nadużycia + mapa ATT&CK** — wykrycie zachowania (zakodowane polecenie/pobranie z sieci) z 4104, mapowanie T1059.001, dowód odpalenia, most do SIEM, nazwana luka (downgrade) | Detekcja po zachowaniu, ATT&CK, test detekcji, korelacja | #3, #7, #8 |
| (PS6–PS7) | L4–L5 | **ZAPOWIEDŹ** — dochodzenie w zaciemnionym logu + strojenie reguł; strategia logowania/ograniczania PowerShella we flocie (GPO, Constrained Language, detection-as-code); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #6, #7 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 5 projektów.** L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** PS1 (czytanie dziennika poleceniem) → PS2 (audyt) → PS3 (zbieranie dowodów) → PS4 (logowanie + ślad nadużycia) → PS5 (reguła detekcji + ATT&CK + most do SIEM). Strona obrońcy (PS1–PS3) poprzedza stronę detekcji nadużycia (PS4–PS5), bo nie da się wykrywać nadużycia narzędzia, którego się nie rozumie od strony obrońcy. Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

PowerShell-w-cyber **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **`Windows`** (ten sam dział, research `tools/content/research/windows.md`) — **prerekwizyt twardy, bezpośredni.** PowerShell żyje wewnątrz Windows; bez rozumienia kont, uprawnień, typów logowania i dziennika zdarzeń (Event ID 4624/4625/4688) student nie zinterpretuje ani tego, co skrypt pobiera, ani tego, co log nadużycia pokazuje. **Wymagane przed L1.**
2. **Pojęcie logu i podstaw skryptowania** — co to log, pole, znacznik czasu; bazowa idea automatyzacji w powłoce. Budowane równolegle przez projekty partii 1: `cyber-hardening-linux-bash` (powłoka i automatyzacja na Linuksie — analogia dla PowerShella) oraz `cyber-python-automatyzacja-logow` (parsowanie logów). **Wymagane/równoległe na L1.**
3. **Podstawy sieci i TCP/IP** (liście `TCP/IP`, `Network`) — bo wzorce nadużycia obejmują pobranie kodu z sieci; bez pojęcia połączenia i adresu student nie zrozumie tego śladu. **Wymagane przed L3.**
4. **Mapowanie zagrożeń** — pojęcie MITRE ATT&CK; częściowo wprowadzane w grupie SIEM i w researchu Windows, tutaj stosowane do techniki T1059.001. **Wymagane przed L3.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267/269a KK, praca wyłącznie na własnym/treningowym, izolowanym systemie). **Wymagane od L1** — szczególnie ostro tu, bo L3 dotyka realnych technik wykonania kodu.

**Czego PowerShell dostarcza jako prerekwizyt/wkład dla innych liści (most w bok):**
- **`SIEM`** (grupa SIEM) — zdarzenia logowania PowerShella (4104) to jedno z najtrudniejszych i najcenniejszych źródeł detekcji; reguły wykrywania living-off-the-land w SIEM zakładają zrozumienie tego śladu. **PowerShell zasila SIEM realnym przypadkiem detekcji.**
- **`Incident Response`** (grupa SIEM) — PowerShell to standardowe narzędzie zbierania dowodów po incydencie; umiejętność z PS3 wprost wchodzi do reagowania.
- **`SOAR`** (grupa SIEM) — automatyzacja reakcji na Windows często sięga po PowerShell jako wykonawcę działań naprawczych.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja oficjalna (Microsoft, darmowa):**
- PowerShell — dokumentacja główna: https://learn.microsoft.com/en-us/powershell/
- About Logging (logowanie PowerShella — Script Block, Module, Transcription): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logging_windows
- Get-WinEvent (odczyt dziennika zdarzeń poleceniem): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent
- About Execution Policies (polityka wykonywania — i czemu to nie zabezpieczenie): https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies
- PowerShell Constrained Language Mode (tryb ograniczonego języka): https://learn.microsoft.com/en-us/powershell/scripting/learn/security/restricting-powershell

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne):**
- MITRE ATT&CK — technika T1059.001 (Command and Scripting Interpreter: PowerShell): https://attack.mitre.org/techniques/T1059/001/
- Atomic Red Team (bezpieczne odwzorowania technik ATT&CK do testu detekcji na własnym labie): https://github.com/redcanaryco/atomic-red-team
- Sigma (otwarty, neutralny format reguł detekcji): https://github.com/SigmaHQ/sigma

**Standardy i normy (oficjalne):**
- NIST SP 800-92 „Guide to Computer Security Log Management" (zarządzanie logami): https://csrc.nist.gov/pubs/sp/800/92/final
- CIS Microsoft Windows Benchmark (utwardzenie, w tym ustawienia PowerShella): https://www.cisecurity.org/benchmark/microsoft_windows_desktop

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo, wymóg wykrywania/zgłaszania): https://eur-lex.europa.eu/eli/dir/2022/2555

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Podwyższone ryzyko vs inne liście:** L3 dotyka *realnych technik wykonania kodu* — dlatego klauzula etyczno-prawna jest tu twardsza (izolowany lab, brak sieci wyjściowej przy symulacji, art. 267 i 269a KK — nieuprawniony dostęp oraz zakłócenie pracy systemu/sieci). Symulacje wyłącznie przez Atomic Red Team na maszynie studenta, nigdy „dziko". Logi bloków skryptów bywają danymi osobowymi — projekty wymagają klauzuli maskowania. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do SOC i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził byciem „kursem skryptowania", nie bezpieczeństwa.** CISO: „nie potrzebuję kogoś, kto pisze ładne pętle — potrzebuję kogoś, kto wie, że PowerShell to wektor ataku, i umie to wykryć". **Poprawka:** zbudowałam cały plik wokół dwoistości (obrońca/atakujący) jako soczewki w §2, a stronę detekcji nadużycia (Script Block Logging, living-off-the-land) uczyniłam rdzeniem L3 — nie dodatkiem.

2. **Słabość: brak logowania PowerShella jako fundamentu.** CISO: „junior, który nie włączył Script Block Logging, ma czarną skrzynkę i myśli, że jest bezpiecznie". **Poprawka:** wyniosłam logowanie bloków skryptów (4104) do niuansu #2 i uczyniłam je osobnym projektem L3 (PS4) jako *warunek* detekcji — student najpierw włącza widoczność, potem wykrywa.

3. **Słabość: ryzyko nauczenia ataku bez ramy etyczno-prawnej adekwatnej do stawki.** CISO: „uczenie «-EncodedCommand» bez twardej klauzuli to proszenie się o kłopoty". **Poprawka:** zaostrzyłam §7 i §6 pkt 5 — izolowany lab bez sieci wyjściowej, art. 267 *i* 269a KK (zakłócenie pracy systemu), symulacje wyłącznie przez Atomic Red Team. Techniki ofensywne jawnie „tylko po to, by wykrywać".

4. **Słabość: detekcja po nazwie procesu (`powershell.exe`) jako pułapka pominięta.** CISO: „junior, który alarmuje na samo uruchomienie PowerShella, zaleje SOC fałszywymi alarmami pierwszego dnia". **Poprawka:** dodałam niuans #3 (detekcja po zachowaniu, nie po nazwie) i wbudowałam go w wymóg PS5 — reguła ma łapać *argument/zachowanie*, nie fakt uruchomienia.

5. **Słabość: zależność od Windows była dorozumiana, nie jawna.** CISO: „nie da się uczyć PowerShella w cyber komuś, kto nie rozumie kont i dziennika Windows". **Poprawka:** dodałam jawną „Zależność treściową" w nagłówku i twardy prerekwizyt #1 w §6 (Windows przed L1), plus mosty w bok (SIEM/IR/SOAR) — research nie powtarza teorii Windows, tylko nadbudowuje.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (PowerShell, cmdlet, pipeline/potok, obiekt, execution policy, Script Block Logging/logowanie bloków skryptów, Module Logging, Transcription, in-memory, living-off-the-land, obfuscation/zaciemnianie, EncodedCommand, downgrade attack, Constrained Language Mode, MITRE ATT&CK/T1059.001, Sigma, Atomic Red Team, NTP, blue/red team, triage, idempotencja, CISO, NIS2). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla pracy juniora SOC/admina bezpieczeństwa Windows, jeśli autoring domknie 5 projektów L1–L3 z niuansami #1–#8. Niuanse #6 (zaawansowane zaciemnianie) i #7 (downgrade/ograniczanie w skali) domkną się dopiero na L4/L5 (zależność od Ethana/Leo) — research je zapowiada, oznaczone uczciwie, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (ścieżki, streszczenie, punkty dla Ryana, zależności L4/L5) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
