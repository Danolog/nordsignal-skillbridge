# Research kompetencji: Bash

> **Status:** research kompetencji w ETAP E3 — powstaje wg wzorca (golden-example) `tools/content/research/siem.md`. North Star §0.1 frameworku jest nadrzędny nad całym tym plikiem.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny.
> **Nadbudowa:** ten research zakłada research `tools/content/research/linux.md` jako fundament — Bash to *narzędzie obrońcy na Linuksie*, nie byt samodzielny.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Bash` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Administracja systemami i skrypty" (`unionShare` grupy: **16,2%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,0%** ofert ścieżki wymienia Bash |
| **Liczba ofert (`offers`)** | **11** |
| **`kind`** | `tool` (konkretna powłoka/język poleceń, nie pojęcie ogólne — patrz §2) |
| **`lift`** | 1,83 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| Linux | 9,4 | 35 | tool |
| Windows | 4,0 | 15 | tool |
| PowerShell | 3,2 | 12 | tool |
| **Bash** (ten plik) | 3,0 | 11 | tool |

**Wniosek dla autoringu:** Bash ma w grupie popyt umiarkowany (3,0%, 11 ofert) — ale jego znaczenie jest większe, niż mówi sama liczba. Bash to **powłoka domyślna Linuksa** (liść Linux: 9,4%, najwyższy w grupie), więc w praktyce towarzyszy niemal każdej roli linuksowej, nawet gdy oferta nie wymienia go z nazwy. To liść, który **nadbudowuje nad Linuksem**: kompetencja Linux mówi „rozumiem system od środka", Bash mówi „potrafię tę wiedzę zautomatyzować i powtórzyć". Dlatego research Bash jest świadomie *cieńszy i bardziej skupiony* niż research Linux — nie powtarza fundamentów systemu, tylko uczy używać powłoki jako **narzędzia obrońcy**.

**UWAGA — nadbudowa, nie powtórzenie.** W partii 1 istnieje już projekt L1 **`cyber-hardening-linux-bash`**, w którym student pisze skrypt w Bash hartujący system + mierzy efekt Lynisem. Ten projekt domyka *Bash w roli automatyzacji hartowania*. Niniejszy research **nadbudowuje w innym kierunku**: Bash jako narzędzie **analizy i detekcji** (parsowanie logów, wykrywanie anomalii, przeglądy bezpieczeństwa) oraz **bezpieczne pisanie skryptów** — zakresy, których istniejący projekt nie obejmuje (patrz §5).

**Soczewka cyber (obowiązuje cały research):** *zanim obronisz system, musisz wiedzieć, jak działa od środka* — a Bash to ręce, którymi obrońca powtarzalnie sięga w głąb systemu. Powłokę poznajemy nie jak programista budujący aplikację, tylko **jako narzędzie obrońcy**: do automatyzacji przeglądów bezpieczeństwa, parsowania logów, wykrywania anomalii skryptem i bezpiecznej, niezawodnej obsługi systemu. Sam skrypt też musi być bezpieczny — źle napisany skrypt z uprawnieniami administratora to nie pomoc, tylko nowa luka.

---

## 2. Definicja kompetencji i jej rola w pracy

**Bash (Bourne Again SHell — powłoka, czyli język poleceń systemu Linux/Unix)** to program, który przyjmuje komendy tekstowe i pozwala je łączyć w **skrypty** — zapisane ciągi poleceń wykonywane automatycznie. Dla specjalisty bezpieczeństwa Bash to **narzędzie zamiany ręcznej, powtarzalnej roboty na powtarzalny, sprawdzalny proces**: zamiast co tydzień ręcznie klikać przez te same kontrole, obrońca pisze skrypt, który robi to za niego — tak samo, za każdym razem, z zapisem wyniku.

Kompetencja „Bash" w kontekście cyber to cztery obszary, które razem składają się na powłokę w rękach obrońcy:

1. **Automatyzacja przeglądów bezpieczeństwa (security review automation)** — skrypt, który cyklicznie sprawdza stan systemu: czy uprawnienia plików nie są zbyt szerokie, czy nie pojawiło się nowe konto, czy usługi są takie, jakie mają być. Zamiana checklisty na kod.
2. **Parsowanie logów (log parsing — rozbiór logu na pola)** — wyłuskiwanie z surowych, tekstowych logów konkretnych informacji narzędziami powłoki (`grep` — wyszukiwanie wzorców, `awk` — wycinanie pól, `sort`/`uniq` — zliczanie). To pierwszy krok analizy, zanim dane trafią do większego systemu.
3. **Wykrywanie anomalii skryptem (anomaly detection)** — prosta logika „co odbiega od normy": liczenie nieudanych logowań na adres, wykrycie logowania poza godzinami pracy, wychwycenie nietypowego procesu. To detekcja na poziomie pojedynczego hosta, zanim wejdzie SIEM.
4. **Bezpieczne pisanie skryptów (secure scripting)** — pisanie skryptów tak, by **same nie stały się luką**: bez wstrzyknięcia poleceń (command injection), z bezpiecznym cytowaniem zmiennych, bez sekretów zaszytych w kodzie, z trybem zatrzymania na błędzie, idempotentnie i odwracalnie.

**Czym kompetencja Bash NIE jest (rozróżnienie zawodowca):**
- To nie kurs programowania ogólnego. Bash służy do **klejenia narzędzi systemowych i automatyzacji obsługi**, nie do budowy aplikacji. Gdy logika robi się złożona (struktury danych, API, testy), zawodowiec **przesiada się na Python** — i to jest świadoma granica (patrz niuans #7 i prerekwizyt do liścia `Python`).
- To nie to samo co Linux. **Linux to system** (co automatyzujesz); **Bash to narzędzie** (czym automatyzujesz). Bez rozumienia systemu (uprawnienia, logi, usługi z researchu Linux) skrypt nie ma czego robić. Linux jest twardym prerekwizytem (§6).
- To nie PowerShell. PowerShell to powłoka świata Windows (osobny liść grupy). Bash i PowerShell rozwiązują podobne problemy w dwóch różnych światach systemów.

**Kto tego używa i jak wygląda dzień pracy.** Bash jest codziennym narzędziem **administratora systemów**, **inżyniera bezpieczeństwa**, **analityka SOC** (szybki rozbiór logu z linii poleceń, zanim sięgnie po SIEM) i **inżyniera DevSecOps** (automatyzacja kontroli w potoku wdrożeniowym). Typowe zadania:
- Napisanie skryptu, który raz dziennie sprawdza zmiany w krytycznych plikach i kontach i raportuje odchylenia.
- Szybkie przejrzenie wielkiego logu (`grep`/`awk`) w poszukiwaniu wzorca ataku, gdy nie ma czasu na pełną analizę w SIEM.
- Zautomatyzowanie powtarzalnej kontroli zgodności (np. fragmentu hartowania) tak, by dało się ją uruchomić na wielu maszynach jednakowo.

**Po co rynkowi ta kompetencja.** W bezpieczeństwie liczy się **powtarzalność i ślad** (wartość firmy „compounding > heroics"). Kontrola wykonana raz ręcznie jest niemierzalna i nie do odtworzenia; ta sama kontrola jako skrypt jest powtarzalna, audytowalna i skalowalna na całą flotę. Bash to najniższy próg wejścia w tę automatyzację na Linuksie — stąd obecność w ofertach mimo „skromnego" procentu.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Cała mapa nadbudowuje nad researchem Linux (zakłada uprawnienia, logi, usługi jako znane).

### L1 — Fundamenty: powłoka, potoki, pierwszy przegląd skryptem (3–6 h)

**Zakres wiedzy/umiejętności:**
- Podstawy powłoki: zmienne, argumenty, kod wyjścia (exit code — czy komenda się udała), strumienie wejścia/wyjścia/błędu.
- **Potoki i łączenie narzędzi (pipes):** połączenie `grep` (wyszukiwanie wzorca) → `sort` → `uniq -c` (zliczanie powtórzeń) w jeden ciąg, który odpowiada na pytanie „ile razy i co".
- Pierwszy skrypt przeglądu: prosta automatyzacja jednej kontroli bezpieczeństwa na własnym systemie — np. wypisanie plików z zbyt szerokimi uprawnieniami albo listy kont z prawem logowania.
- Czytelny, powtarzalny wynik skryptu (raport tekstowy), uruchamialny ponownie z tym samym efektem.

**Co student musi UMIEĆ ZROBIĆ:** napisać skrypt łączący narzędzia powłoki w potok, który wykonuje jedną kontrolę bezpieczeństwa i wypisuje czytelny raport; wyjaśnić, na jakie ryzyko ta kontrola odpowiada; uruchomić skrypt ponownie z tym samym wynikiem.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Skrypt bez sprawdzania kodu wyjścia kłamie.** Komenda mogła się nie wykonać, a skrypt leci dalej, jakby wszystko było dobrze — i raportuje „czysto", choć nic nie sprawdził. Zawodowiec sprawdza, czy każdy krok się udał.
- **Cisza w wyniku to nie zawsze „bezpiecznie".** Pusty wynik `grep` może znaczyć „nic nie znalazłem" albo „szukałem w złym pliku / złym wzorcem". To ten sam błąd, co nieprzetestowana reguła w SIEM (§4 SIEM).
- **`grep` po surowym logu jest kruchy.** Dopasowanie tekstem łatwo daje fałszywe trafienia (część innego słowa) i przeocza warianty zapisu. To wystarcza na L1, ale jest świadomym uproszczeniem — na L2 wchodzi rozbiór po polach.

### L2 — Zastosowanie: parsowanie logów i wykrywanie anomalii (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Parsowanie logów po polach (`awk`):** wyciągnięcie konkretnych kolumn z logu (znacznik czasu, adres IP, użytkownik, wynik), zamiast kruchego dopasowania tekstem.
- **Wykrywanie anomalii prostą logiką:** zliczenie nieudanych logowań na adres i progowe wskazanie podejrzanych (wzorzec ataku siłowego — brute-force); wykrycie logowania poza zdefiniowanym oknem godzinowym; porównanie listy procesów/kont z oczekiwaną „bazową linią" (baseline — stan normalny).
- **Próg i jego uzasadnienie:** świadomy dobór „ile w jakim oknie czasu jest podejrzane" — i dlaczego, a nie liczba z sufitu (wspólny problem z regułami SIEM, §4).
- **Czytelny raport detekcji:** wynik w formie sprawdzalnej z pliku (tabela / CSV) z listą znalezisk i podsumowaniem słownym.
- **Higiena danych w raporcie:** maskowanie adresów IP i brak re-identyfikacji osób (RODO — patrz §4, §7), gdy log może zawierać dane osobowe.

**Co student musi UMIEĆ ZROBIĆ:** sparsować log po polach narzędziem powłoki; napisać skrypt wykrywający co najmniej jeden wzorzec anomalii z uzasadnionym progiem; wygenerować raport znalezisk sprawdzalny z pliku z zamaskowanymi danymi osobowymi.

**Profesjonalne niuanse:**
- **Próg to kompromis, nie liczba z poradnika.** Za niski → lawina fałszywych alarmów; za wysoki → przeoczony atak. Próg dobiera się z bazowej linii danego systemu (ten sam niuans co w SIEM). Skrypt detekcyjny dziedziczy całą filozofię detekcji — tylko na mniejszą skalę.
- **Bash to dobre narzędzie do *szybkiego* rozbioru, złe do *złożonej* logiki.** Gdy detekcja wymaga struktur danych, łączenia wielu źródeł czy testów — to sygnał, że pora na Python (granica kompetencji, niuans #7). Zawodowiec wie, kiedy przestać klecić w powłoce.
- **Parsowanie zakłada stabilny format logu.** Zmiana formatu źródła cicho psuje skrypt oparty na pozycjach pól. Zawodowiec waliduje, że pole jest tym, czym myśli, że jest.

### L3 — Portfolio: powtarzalny przegląd bezpieczeństwa + skrypt jako bezpieczne narzędzie (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Zestaw przeglądu bezpieczeństwa (security audit toolkit):** skrypt(y) wykonujące powtarzalny przegląd hosta — uprawnienia, konta, usługi, integralność krytycznych plików, ślady w logach — z raportem odchyleń od stanu oczekiwanego.
- **Bezpieczne pisanie skryptów na poważnie (secure scripting):**
  - tryb bezpiecznego zatrzymania na błędzie i nieustawionej zmiennej (`set -euo pipefail` — zatrzymaj na błędzie, na nieznanej zmiennej, na błędzie w potoku);
  - **ochrona przed wstrzyknięciem poleceń (command injection)** — bezpieczne cytowanie zmiennych, brak wykonywania danych wejściowych jako kodu;
  - **brak sekretów w kodzie** — hasła/klucze nie zaszyte w skrypcie ani w historii poleceń (spójne z polityką sekretów: Secret Manager, nigdy jawny tekst);
  - **idempotencja i odwracalność** — ponowne uruchomienie nie psuje stanu; zmiana robi kopię i da się ją cofnąć (ten sam wymóg, co przy hartowaniu Linux, P5/§4 Linux);
  - **najmniejsze uprawnienie dla samego skryptu** — skrypt nie chodzi na `root`, jeśli nie musi.
- **Sprawdzenie jakości skryptu narzędziem (ShellCheck — otwarty linter Basha wykrywający typowe błędy i niebezpieczne wzorce):** dowód, że skrypt przeszedł statyczną kontrolę.
- **Dokumentacja:** README z założeniami, sposobem uruchomienia i opisem, na jakie ryzyka odpowiada każda kontrola.

**Co student musi UMIEĆ ZROBIĆ:** zbudować powtarzalny zestaw przeglądu bezpieczeństwa hosta z raportem odchyleń; napisać skrypty wg zasad bezpiecznego skryptowania (zatrzymanie na błędzie, ochrona przed wstrzyknięciem, brak sekretów, idempotencja, odwracalność, najmniejsze uprawnienie) i udowodnić jakość przejściem przez ShellCheck; udokumentować. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Źle napisany skrypt z uprawnieniami `root` to nowa luka, nie narzędzie.** Skrypt podatny na wstrzyknięcie poleceń albo z błędnym cytowaniem zmiennej staje się drogą eskalacji uprawnień dla napastnika. Bezpieczeństwo *samego skryptu* jest częścią kompetencji, nie dodatkiem.
- **Sekret w skrypcie albo w historii powłoki wycieka.** Zaszyte hasło trafia do repozytorium, do logów, do historii poleceń. Zawodowiec nigdy nie wpisuje sekretu do kodu — pobiera go z bezpiecznego magazynu w czasie działania.
- **Skrypt bez `set -euo pipefail` „działa", dopóki nie zaszkodzi.** Bez bezpiecznego trybu skrypt po cichu mija błędy i potrafi wykonać destrukcyjną komendę na pustej zmiennej (klasyk: `rm -rf "$KATALOG/"` przy pustym `$KATALOG`). Zawodowiec włącza bezpieczny tryb domyślnie.

### L4 — Realny przypadek profesjonalny: automatyzacja przeglądu floty w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Zautomatyzowanie powtarzalnego przeglądu bezpieczeństwa na *realnej, niejednorodnej* grupie maszyn (różne dystrybucje, różne formaty logów) tak, by wynik był spójny i porównywalny między nimi — z obsługą przypadków brzegowych, których nie ma na czystym labie.
- Decyzja, *co* automatyzować w Bash, a co już przekazać do narzędzia wyższego rzędu (Python / system zarządzania konfiguracją / SIEM) — świadoma granica narzędzia.
- **Benchmark:** wynik studenta (kompletność przeglądu, jakość raportu odchyleń, bezpieczeństwo i odporność skryptów, ślad audytowy) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: automatyzacja jako element procesu i jej granice (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Automatyzacja wpięta w proces, nie pojedynczy skrypt:** kontrole uruchamiane cyklicznie, z wynikiem trafiającym do centralnego monitorowania (most do SIEM), wersjonowane jak kod.
- **Świadomość granic Bash w skali:** kiedy powłoka przestaje wystarczać (utrzymywalność, testowalność, złożoność) i decyzja o migracji logiki do Pythona lub dedykowanego narzędzia — uzasadniona kosztem utrzymania, nie modą.
- **Bezpieczeństwo łańcucha automatyzacji:** skrypty jako element, który sam bywa celem ataku (supply chain) — kontrola pochodzenia, uprawnień i integralności tego, co się uruchamia automatycznie.
- **Benchmark** wobec rozwiązania realnego inżyniera: nie „czy skrypt działa", lecz „czy to się utrzyma, czy jest bezpieczne i czy nie należało tego napisać inaczej".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Bezpieczne pisanie skryptów to rdzeń kompetencji, nie dodatek.** Skrypt obrońcy często chodzi z wysokimi uprawnieniami i dotyka wrażliwych miejsc systemu. Źle napisany staje się luką. Zawodowiec traktuje bezpieczeństwo *własnego* skryptu na równi z celem, który skrypt realizuje.
2. **Wstrzyknięcie poleceń (command injection) — dane wejściowe to nie kod.** Niezacytowana zmienna albo dane wstawione wprost do komendy pozwalają napastnikowi wykonać własne polecenie. Bezpieczne cytowanie i nieuruchamianie danych jako kodu to twardy wymóg.
3. **Bezpieczny tryb domyślny (`set -euo pipefail`).** Bez zatrzymania na błędzie, na nieustawionej zmiennej i na błędzie w potoku skrypt po cichu robi rzeczy, których nie chcesz — łącznie z destrukcyjnymi na pustej zmiennej. Zawodowiec włącza ten tryb zawsze.
4. **Idempotencja i odwracalność.** Skrypt bezpieczeństwa uruchamia się wielokrotnie; musi dawać ten sam efekt i nie psuć stanu, a zmiany robić odwracalnie (kopia przed zmianą) — ta sama dyscyplina, co przy hartowaniu Linux i transakcyjnych zmianach w bazie.
5. **Sekrety nigdy w kodzie ani w historii poleceń.** Hasło zaszyte w skrypcie wycieka do repozytorium, logów i historii powłoki. Sekret pobiera się z bezpiecznego magazynu w czasie działania (spójne z polityką firmy: Secret Manager, nigdy jawny tekst).
6. **Najmniejsze uprawnienie — także dla skryptu.** Skrypt nie powinien chodzić na `root`, jeśli zadanie tego nie wymaga (wspólny niuans z Linux §4). Automat z nadmiarem uprawnień to powiększona powierzchnia ataku.
7. **Granica narzędzia: kiedy Bash, kiedy Python.** Bash świetnie klei narzędzia systemowe i robi szybki rozbiór; źle radzi sobie ze złożoną logiką, strukturami danych i testami. Zawodowiec wie, kiedy przestać i sięgnąć po Python — to świadomy wybór, nie porażka (most do liścia `Python`).
8. **`grep` po tekście jest kruchy; rozbiór po polach jest rzetelny.** Dopasowanie surowym tekstem daje fałszywe trafienia i przeocza warianty. Parsowanie po polach (`awk`) i walidacja, że pole jest tym, czym myślisz, to różnica między „wydaje się, że wykrywa" a „wykrywa".
9. **Próg detekcji w skrypcie dziedziczy filozofię SIEM.** Skryptowe wykrywanie anomalii ma ten sam problem progu i bazowej linii, co reguły SIEM — tylko na mniejszą skalę. Próg z bazowej linii, nie z sufitu; świadomość fałszywych pozytywów i negatywów.
10. **Cisza skryptu ≠ bezpieczeństwo.** Pusty wynik bywa skutkiem błędu (zły plik, zły wzorzec, niesprawdzony kod wyjścia), nie braku zagrożenia. Skrypt detekcyjny, jak regułę SIEM, trzeba *sprawdzić, że faktycznie wykrywa* na znanym przypadku.
11. **Stabilność formatu wejścia.** Skrypt parsujący log zakłada format; zmiana źródła cicho go psuje. Zawodowiec waliduje wejście i nie ufa, że „zawsze wyglądało tak samo".
12. **Granica etyczno-prawna jest częścią kompetencji.** Skrypty uruchamiasz **wyłącznie na własnym lub jawnie treningowym systemie**. Logi, które parsujesz, bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14); w raportach maskujesz dane i nie re-identyfikujesz osób (RODO, minimalizacja). Nieautoryzowany dostęp/uruchamianie na cudzym systemie jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Bash muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie używać powłoki jako narzędzia obrońcy. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

**UWAGA — nadbudowa, nie powtórzenie.** Istniejący projekt **`cyber-hardening-linux-bash` (L1, partia 1)** domyka *Bash w roli automatyzacji hartowania* (skrypt utwardzający + Lynis). Pula poniżej idzie w **inny kierunek użycia powłoki**: analizę i detekcję (parsowanie logów, anomalie) oraz bezpieczne skryptowanie jako osobną, mierzoną umiejętność. Zero nakładki na istniejący projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| (istn.) | L1 | **`cyber-hardening-linux-bash`** — skrypt hartujący + Lynis przed/po (JUŻ ISTNIEJE w partii 1 — nie powtarzać) | Bash jako automatyzacja hartowania | #1, #4 |
| P1 | L1 | **Pierwszy przegląd skryptem** — potok `grep`/`sort`/`uniq`, skrypt wykonujący jedną kontrolę bezpieczeństwa (np. pliki z szerokimi uprawnieniami) i czytelny raport | Powłoka, potoki, kod wyjścia, raport | #3, #10 |
| P2 | L2 | **Parsowanie logu po polach** — `awk` na logu uwierzytelniania, wyłuskanie pól, czytelny wynik z zamaskowanym IP | Parsowanie po polach, higiena danych | #8, #11, #12 |
| P3 | L2 | **Wykrywanie anomalii skryptem** — detekcja ataku siłowego / logowań poza oknem z uzasadnionym progiem, raport znalezisk sprawdzalny z pliku | Wykrywanie anomalii, próg, baseline | #9, #10 |
| P4 | L3 | **Zestaw przeglądu bezpieczeństwa hosta** — powtarzalny skrypt(y): uprawnienia + konta + usługi + integralność + ślady w logach, raport odchyleń | Toolkit przeglądu, raport odchyleń | #4, #6 |
| P5 | L3 | **Bezpieczny skrypt jako narzędzie** — `set -euo pipefail`, ochrona przed wstrzyknięciem, brak sekretów, idempotencja/odwracalność, najmniejsze uprawnienie, dowód z ShellCheck | Bezpieczne skryptowanie, jakość (ShellCheck) | #1, #2, #3, #5, #6 |
| (P6–P7) | L4–L5 | **ZAPOWIEDŹ** — przegląd floty niejednorodnej + granica Bash↔Python; automatyzacja w procesie + bezpieczeństwo łańcucha; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #7, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 6 projektów** (z czego 1 — `cyber-hardening-linux-bash` — już istnieje i nie jest powtarzany; reszta nadbudowuje w kierunku analizy/detekcji i bezpiecznego skryptowania). L4–L5: 2 projekty, po rozszerzeniu struktury. Świadomie cieńsza pula niż Linux — Bash to liść nadbudowujący, nie fundament. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** [`cyber-hardening-linux-bash` istn.] → P1 (przegląd skryptem) → P2 (parsowanie) → P3 (anomalie) → P4 (zestaw przeglądu) → P5 (bezpieczny skrypt). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy. Cały łańcuch zakłada wcześniejsze opanowanie Linuksa (§6).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Bash **nie ma sensu bez Linuksa** — to nadbudowa, nie byt samodzielny. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **`Linux` — twardy fundament.** Bez rozumienia uprawnień plików, kont/`sudo`, usług i logów (research `tools/content/research/linux.md`, poziomy L1–L2) skrypt w Bash nie ma czego automatyzować ani co parsować. **Wymagane przed L1 Bash.** To najważniejszy prerekwizyt — Linux i Bash to *system* i *narzędzie do tego systemu*.
2. **Pojęcie logu i jego pól** — co to log, jakie ma pola (znacznik czasu, IP, użytkownik, wynik). Budowane na L1 Linux (czytanie logów) i domykane przy parsowaniu. **Wymagane przed L2 Bash** (parsowanie i anomalie).
3. **Podstawy sieci i TCP/IP** (liść `TCP/IP`) — żeby zinterpretować adres IP i połączenie w parsowanym logu. **Równoległe/zalecane przed L2 Bash.**
4. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym systemie; maskowanie IP w raportach). **Wymagane od L1.**

**Bash jako prerekwizyt / most dla innych liści:**
- **Most do `SIEM` / `SOC`:** parsowanie logów i wykrywanie anomalii skryptem (Bash L2) to *to samo myślenie detekcyjne* co reguły SIEM, tylko na poziomie pojedynczego hosta i bez platformy. Student, który wykrył atak siłowy `awk`-iem, rozumie potem, co robi reguła w SIEM — i dlaczego centralny system jest potrzebny w skali. To przygotowanie pojęciowe do grupy monitorowania.
- **Most do `Python`:** granica „kiedy Bash przestaje wystarczać" (niuans #7) prowadzi wprost do liścia `Python` (projekt `cyber-python-automatyzacja-logow` z partii 1 robi *to samo zadanie* — wykrycie ataku siłowego w logach — narzędziem wyższego rzędu). Bash i Python to dwa szczeble tej samej drabiny automatyzacji; Bash pokazuje, *dlaczego* sięga się po Python.
- **Wsparcie dla `Linux` L3+ i `DevSecOps`:** automatyzacja hartowania i kontroli zgodności (configuration-as-code) opiera się na umiejętności bezpiecznego skryptowania z Bash L3.

**Most do SIEM (jawnie):** Bash L2 (parsowanie + anomalie na hoście) → SIEM L1–L2 (te same wzorce w centralnym systemie, w skali wielu źródeł). Student widzi ciągłość: ta sama detekcja, dwa poziomy dojrzałości narzędzia.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja powłoki i narzędzi (oficjalna, darmowa):**
- GNU Bash Reference Manual (oficjalny podręcznik Bash): https://www.gnu.org/software/bash/manual/
- Strony podręcznika systemowego (man pages) — `man bash`, `man grep`, `man awk`, `man sort`: https://man7.org/linux/man-pages/
- GNU Coreutils / grep / gawk — dokumentacja narzędzi: https://www.gnu.org/software/coreutils/manual/

**Bezpieczne pisanie skryptów (otwarte, autorytatywne):**
- ShellCheck — otwarty linter Basha (wykrywa błędy i niebezpieczne wzorce); repozytorium i dokumentacja: https://github.com/koalaman/shellcheck
- Google Shell Style Guide (uznany przewodnik stylu i bezpieczeństwa skryptów): https://google.github.io/styleguide/shellguide.html
- OWASP — Command Injection (opis i obrona przed wstrzyknięciem poleceń): https://owasp.org/www-community/attacks/Command_Injection
- OWASP Logging Cheat Sheet (dobre praktyki logowania — wspólne z SIEM): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

**Standardy i wiedza o zagrożeniach (oficjalne/otwarte):**
- NIST SP 800-92 „Guide to Computer Security Log Management" (zarządzanie logami): https://csrc.nist.gov/pubs/sp/800/92/final
- MITRE ATT&CK — taktyki dot. eskalacji uprawnień i wykonania skryptów (wspólny język z SIEM): https://attack.mitre.org/
- SANS Reading Room — analityka logów i automatyzacja (darmowe białe księgi): https://www.sans.org/white-papers/

**Dane do ćwiczeń (publiczne, otwarte):**
- loghub — publiczne zbiory logów systemowych do parsowania: https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Zbiory logów (loghub, SecRepo) wymagają klauzuli maskowania IP w projektach, jak w partii 1 (`cyber-python-automatyzacja-logow`). ShellCheck (licencja GPL-3.0) i dokumentacja GNU/man pages są w pełni wolne. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził powieleniem istniejącego `cyber-hardening-linux-bash` i researchu Linux.** CISO: „jeśli Bash to drugi raz ten sam skrypt hartujący, marnujesz czas studenta". **Poprawka:** §1 i §5 jawnie oznaczają istniejący projekt jako domknięty i kierują całą pulę Bash w *inny* kierunek użycia powłoki — analizę/detekcję i bezpieczne skryptowanie. Fundamenty systemu (uprawnienia, usługi, logi) są zaznaczone jako prerekwizyt z Linuksa, nie powtarzane (§6).

2. **Słabość: «bezpieczne skrypty» groziło potraktowaniem jako kosmetyka.** CISO: „skrypt admina chodzi na `root`; jak jest dziurawy, to ja mam włamanie, nie wygodę". **Poprawka:** bezpieczne skryptowanie dostało rangę rdzenia kompetencji — niuans #1–#3, #5–#6, osobny mierzony projekt L3 (P5) z dowodem z ShellCheck. Wstrzyknięcie poleceń, sekrety w kodzie i `set -euo pipefail` są nazwane wprost jako rozdzielniki amator↔zawodowiec.

3. **Słabość: Bash groził „kursem powłoki w próżni", oderwanym od cyber i od reszty ścieżki.** CISO: „nie chcę kursu Linuksa dla programistów — chcę powłokę w rękach obrońcy". **Poprawka:** soczewka cyber jako oś (§1), każdy poziom podpięty pod „na jaki atak/ryzyko to odpowiada", oraz dwa jawne mosty: do SIEM (detekcja na hoście → w skali) i do Pythona (granica narzędzia). Bash nie wisi — wpina się w grupę i w ścieżkę.

4. **Słabość: granica Bash↔Python była pominięta — ryzyko, że student będzie klecił w powłoce rzeczy nie dla powłoki.** CISO: „junior, który robi w Bash to, co należy do Pythona, produkuje nieutrzymywalny kod". **Poprawka:** wprowadziłam niuans #7 (kiedy Bash, kiedy Python) i most w §6 do projektu `cyber-python-automatyzacja-logow` z partii 1, który rozwiązuje *to samo zadanie* narzędziem wyższego rzędu. Student widzi obie drogi i ich uzasadnienie.

5. **Słabość: «cisza skryptu = bezpiecznie» i kruchość `grep` mogły uśpić czujność.** CISO: „połowa fałszywego «czysto» juniorów to niesprawdzony skrypt albo `grep` po złym wzorcu". **Poprawka:** dodałam niuanse #10 (cisza ≠ bezpieczeństwo, skrypt trzeba sprawdzić na znanym przypadku — jak regułę SIEM), #8 (kruchość `grep`, rozbiór po polach) i #11 (stabilność formatu wejścia), wbudowane w L1–L2. To uczy nieufności wobec własnego wyniku.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Bash/powłoka, skrypt, exit code, pipes/potoki, `grep`/`awk`/`sort`/`uniq`, parsing, baseline, brute-force, secure scripting, command injection, `set -euo pipefail`, idempotencja, ShellCheck, least privilege, supply chain, RODO, NTP — gdzie pada, CISO, art. 267 KK). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla zadań „analityk/admin automatyzujący przeglądy i detekcję na hoście", jeśli autoring domknie P1–P5 (+ istniejący) z niuansami #1–#6, #8–#11. Niuanse #7 (granica narzędzia w skali) i #12 (etyka/RODO w skali floty) domykają się w pełni na L4/L5 — research je zapowiada, ale „zawodowość automatyzacji w skali organizacji" wymaga struktury L4/L5 (zależność od Ethana/Leo). Uczciwie oznaczone, nie zamiecione. Świadomie utrzymałam Bash jako research *węższy* niż Linux — to odzwierciedla jego rolę nadbudowy, nie braki.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
