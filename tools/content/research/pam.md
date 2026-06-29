# Research kompetencji: PAM

> **Status:** research kompetencji w ETAP E3 — powstał wg wzorca (golden-example) `tools/content/research/siem.md` (struktura, głębia, poprzeczka North Star §0.1). **Nadbudowuje nad researchem IAM** (`tools/content/research/iam.md`) — PAM jest zaostrzonym IAM dla kont administratorów.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł + nagrywanie sesji jako monitoring pracownika, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `PAM` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Tożsamość i zarządzanie dostępem (IAM)" (`unionShare` grupy: **12,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **3,0%** ofert ścieżki wymienia PAM |
| **Liczba ofert (`offers`)** | **11** |
| **`kind`** | `concept` (kompetencja koncepcyjna, nie pojedyncze narzędzie — patrz §2) |
| **`lift`** | 26,74 (siła powiązania liścia z tą ścieżką — najwyższy w grupie) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| IAM | 7,5 | 28 | concept |
| Active Directory | 4,3 | 16 | tool |
| **PAM** (ten plik) | 3,0 | 11 | concept |
| CyberArk | 2,4 | 9 | tool |

**Wniosek dla autoringu:** PAM ma niższy *surowy* popyt niż IAM (3,0% vs 7,5%), ale **najwyższy `lift` w całej grupie (26,74)** — to znaczy, że gdy oferta wymienia PAM, jest bardzo *specyficznie* związana z tą ścieżką (sygnał wyspecjalizowanego, dobrze płatnego stanowiska, nie ogólnego wymagania). CyberArk (2,4%) to najczęstsze *narzędzie* klasy PAM na rynku — pochodna tej koncepcji. Wniosek: PAM autorujemy **po IAM** i **wąsko, ale głęboko** — to nadbudowa dla kandydata, który opanował już ogólne zarządzanie tożsamością. PAM odpowiada na zdanie z opisu grupy: *„PAM chroni konta administratorów"* — czyli tę garstkę kont, których przejęcie oznacza przejęcie całej firmy.

---

## 2. Definicja kompetencji i jej rola w pracy

**PAM (Privileged Access Management — zarządzanie dostępem uprzywilejowanym)** to dyscyplina ochrony *kont uprzywilejowanych* — tych, które mają władzę nad systemem: administrator domeny, `root` na serwerze Linux, konto usługowe z dostępem do bazy produkcyjnej, konto z prawem zmiany uprawnień innym. PAM to **podzbiór IAM** (zarządzania tożsamością i dostępem — `iam.md`), ale rządzi się ostrzejszymi regułami, bo stawka jest inna: przejęcie zwykłego konta to incydent; przejęcie konta administratora to często koniec gry. PAM robi cztery rzeczy, których zwykły IAM nie wymusza:

1. **Skarbiec haseł i sekretów (vault — sejf na poświadczenia).** Hasła i klucze kont uprzywilejowanych nie leżą u ludzi „w głowie" ani w pliku — są zamknięte w skarbcu, który wydaje je kontrolowanie i odnotowuje każde pobranie.
2. **Dostęp na czas (just-in-time — JIT, uprawnienie przyznawane na chwilę i automatycznie wygaszane).** Administrator nie ma władzy *na stałe*; dostaje ją na konkretne zadanie, na określony czas, i traci automatycznie. Przeciwieństwo to *stały dostęp uprzywilejowany* (standing privilege) — największe ryzyko PAM.
3. **Nagrywanie i nadzór sesji (session recording / monitoring — zapis tego, co administrator faktycznie zrobił).** Sesja uprzywilejowana jest rejestrowana, żeby dało się odtworzyć, co się stało — dla dochodzenia i dla odstraszenia.
4. **Rotacja sekretów (secrets rotation — regularna, automatyczna zmiana haseł/kluczy).** Hasła kont uprzywilejowanych zmieniają się często i automatycznie, tak by skradzione poświadczenie szybko traciło ważność.

**Czym PAM NIE jest (rozróżnienie zawodowca):**
- PAM to nie „menedżer haseł dla adminów". Menedżer haseł przechowuje; PAM *kontroluje, wydaje na czas, nagrywa i rotuje* — i robi to dla kont o najwyższej władzy, nie dla wygody jednej osoby.
- PAM ≠ IAM. IAM rządzi dostępem *wszystkich* tożsamości; PAM dokłada twardsze rygory dla *nielicznych* kont uprzywilejowanych. Bez działającego IAM (kont, grup, ról) PAM nie ma na czym stanąć — dlatego autorujemy go po IAM (patrz §6).
- PAM ≠ CyberArk. CyberArk to *jedno z narzędzi* klasy PAM (osobny liść grupy, `kind: tool`). PAM jest koncepcją ponad narzędziem — te same zasady realizują HashiCorp Vault / OpenBao, Teleport, Delinea i inne. Junior uwięziony w jednym produkcie jest mniej wart (patrz self-critique §8).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja PAM jest rdzeniem pracy **inżyniera PAM / inżyniera tożsamości uprzywilejowanej** oraz coraz częściej **inżyniera platformy / DevSecOps** (bo sekrety maszyn i potoków CI/CD to dziś większość dostępu uprzywilejowanego). Typowy dzień:
- **Operacyjnie:** obsługa wniosków o dostęp uprzywilejowany na czas (JIT), nadzór nad skarbcem, reakcja na alert „ktoś pobrał hasło administratora poza oknem zmianowym".
- **Projektowo:** wykrywanie kont uprzywilejowanych, których nikt nie zinwentaryzował (privileged account discovery), eliminacja stałego dostępu (standing privilege), wdrażanie rotacji sekretów, usuwanie sekretów zaszytych w kodzie i skryptach (hardcoded secrets), projektowanie konta awaryjnego (break-glass).

**Po co rynkowi ta kompetencja.** Konta uprzywilejowane to cel numer jeden napastnika — zdobycie jednego daje władzę nad wszystkim. Regulacje EU (DORA dla finansów — twarde wymogi wobec dostępu uprzywilejowanego; NIS2) i normy (ISO 27001, NIST 800-53) wymagają udowodnienia, że dostęp administracyjny jest kontrolowany, ograniczony w czasie i rozliczalny. Wysoki `lift` (26,74) potwierdza: rynek pyta o PAM tam, gdzie stawka i wynagrodzenie są najwyższe.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". **PAM nadbudowuje nad IAM:** wszystkie poziomy zakładają opanowany cykl życia tożsamości i model najmniejszego uprawnienia z `iam.md`.

### L1 — Fundamenty: czym jest konto uprzywilejowane i dlaczego osobna dyscyplina (3–6 h)

**Zakres wiedzy/umiejętności:**
- Rozpoznanie kont uprzywilejowanych w treningowym systemie: administrator domeny, `root`/`sudo` na Linux, konto usługowe, konto z prawem nadawania uprawnień.
- Dlaczego współdzielone hasło administratora (jedno hasło `admin`, które zna pół zespołu) to klasyczny grzech pierwotny — brak rozliczalności (nie wiadomo, kto co zrobił).
- Inwentaryzacja: spisanie, *ile* kont uprzywilejowanych w ogóle istnieje (zwykle więcej, niż ktokolwiek sądzi).
- Pojęcie skarbca (vault) na poziomie idei: po co oddzielać przechowywanie poświadczeń od ludzi.

**Co student musi UMIEĆ ZROBIĆ:** zinwentaryzować konta uprzywilejowane na własnym treningowym systemie (Linux + katalog AD z partii 1); wskazać, gdzie jest współdzielone hasło i dlaczego to ryzyko; opisać słownie, czym konto uprzywilejowane różni się od zwykłego pod względem skutków przejęcia.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Nie wiesz, ilu masz administratorów.** Konta uprzywilejowane mnożą się w ukryciu: lokalni administratorzy na stacjach, zagnieżdżone grupy, konta usługowe. Pierwszy krok PAM to *odkrycie*, nie konfiguracja.
- **Współdzielone hasło administratora niszczy rozliczalność.** Gdy pięć osób zna jedno hasło `admin`, żaden log nie powie, *kto* wykonał groźną komendę. To pierwszy problem, który PAM rozwiązuje.

### L2 — Zastosowanie: skarbiec, rotacja sekretów, sekrety poza kodem (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Skarbiec haseł i sekretów (vault):** umieszczenie poświadczenia uprzywilejowanego w otwartoźródłowym skarbcu (HashiCorp Vault / OpenBao), pobranie kontrolowane (check-out/check-in — wypożyczenie i zwrot), odnotowanie każdego pobrania.
- **Rotacja sekretów (secrets rotation):** skonfigurowanie automatycznej zmiany hasła/klucza i zrozumienie, dlaczego skraca to okno ważności skradzionego poświadczenia.
- **Sekrety poza kodem (eliminacja hardcoded secrets — haseł zaszytych w kodzie/skryptach/repozytorium):** wyjęcie hasła z pliku konfiguracyjnego/skryptu i pobieranie go ze skarbca w czasie działania.
- **Konta usługowe (service accounts):** objęcie skarbcem i rotacją kont, za którymi nie stoi człowiek — najczęściej zaniedbanej kategorii kont uprzywilejowanych.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić otwartoźródłowy skarbiec na własnym labie, umieścić w nim poświadczenie i pobrać je kontrolowanie z zapisem; skonfigurować rotację sekretu; przerobić przykładowy skrypt tak, by *nie* zawierał hasła, lecz pobierał je ze skarbca; opisać ryzyko zapomnianego konta usługowego.

**Profesjonalne niuanse:**
- **Rotacja sekretu może położyć produkcję.** Jeśli skarbiec zmieni hasło, a aplikacja wciąż trzyma stare „na sztywno" — aplikacja przestaje działać. Rotacja bez integracji aplikacji to strzał w stopę. Zawodowiec rotuje *i* uczy aplikacje pobierać świeży sekret; amator rotuje i wywołuje awarię.
- **Sekret w repozytorium git nie znika po usunięciu.** Hasło wrzucone raz do repozytorium zostaje w historii — usunięcie z bieżącego pliku nie wystarcza, trzeba je *unieważnić* (zrotować). Amator „usuwa hasło z kodu" i myśli, że jest bezpiecznie.
- **Skarbiec to nowy cel i nowy pojedynczy punkt awarii.** Zebranie wszystkich sekretów w jednym miejscu jest słuszne, ale czyni ze skarbca najcenniejszy łup w firmie. Jego ochrona (MFA, dostęp warunkowy, kopie, plan awaryjny) jest częścią kompetencji.

### L3 — Portfolio: dostęp na czas, nagrywanie sesji, integracja (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Dostęp na czas (just-in-time — JIT):** zaprojektowanie procesu, w którym administrator dostaje uprawnienie *na zadanie i na czas*, po czym traci je automatycznie; eliminacja stałego dostępu (standing privilege).
- **Najmniejsze uprawnienie dla administratorów:** podział „jednego wielkiego admina" na wąskie role uprzywilejowane (kto może restartować usługę ≠ kto może czytać bazę).
- **Nagrywanie i nadzór sesji (session recording):** włączenie zapisu sesji uprzywilejowanej (np. przez otwartoźródłowy Teleport), zrozumienie, co i po co się nagrywa — oraz granicy RODO/prawa pracy (nagrywanie sesji to monitoring pracownika).
- **Konto awaryjne (break-glass — „rozbij szybę", konto na wypadek, gdy wszystko inne zawiedzie):** zaprojektowanie konta ratunkowego i jego paradoksu (musi działać zawsze, więc jest celem nr 1).
- **Integracja PAM z monitorowaniem (SIEM) i IAM:** wysłanie zdarzeń uprzywilejowanych (pobranie sekretu, użycie JIT, użycie break-glass) do SIEM i zbudowanie alertu o nadużyciu dostępu uprzywilejowanego.

**Co student musi UMIEĆ ZROBIĆ:** zaprojektować i odegrać przepływ JIT dla persony-administratora (wniosek → przyznanie na czas → automatyczne wygaszenie); rozbić szerokie uprawnienie admina na wąskie role; włączyć nagrywanie sesji na labie i omówić jego granicę prawną; zaprojektować konto break-glass z jego zabezpieczeniem i alertem na użycie; opisać, jakie zdarzenia PAM trafiają do SIEM i jaki alert z nich powstaje. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Stały dostęp uprzywilejowany (standing privilege) to grzech główny PAM.** Każde konto administratora aktywne *na stałe* to otwarte drzwi czekające na napastnika. Dojrzałość PAM mierzy się tym, *jak mało* stałego dostępu zostało — celem jest „zero standing privilege". Amator zabezpiecza hasło admina; zawodowiec sprawia, że admin nie ma władzy, dopóki jej nie potrzebuje.
- **Konto break-glass to paradoks bezpieczeństwa.** Musi działać, gdy padnie wszystko inne (więc bywa wyłączone z MFA/JIT), a przez to jest najcenniejszym celem. Zawodowiec twardo je chroni, monitoruje *każde* użycie i regularnie testuje — amator zakłada konto „na wszelki wypadek" i o nim zapomina.
- **Nagrywanie sesji zderza się z prawem pracy i RODO.** Zapis tego, co robi administrator, to monitoring pracownika — w Polsce regulowany (Kodeks pracy, obowiązek poinformowania) i objęty RODO (cel, minimalizacja, retencja). To nie „włącz nagrywanie", lecz decyzja prawno-organizacyjna. Pominięcie tego to realne ryzyko prawne, nie detal.

### L4 — Realny przypadek profesjonalny: wdrożenie skarbca i JIT, eliminacja stałego dostępu (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`; design: `docs/design/skillbridge-projekty-l4-l5-struktura-v0.1.md`). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie firmy z *realnym bałaganem dostępu uprzywilejowanego* — współdzielone hasła adminów, konta usługowe z hasłem ustawionym lata temu, sekrety w skryptach, nikt nie wie, ilu jest administratorów — i doprowadzenie do skarbca + JIT, bez zatrzymania działania firmy.
- Eliminacja stałego dostępu (przejście w stronę „zero standing privilege") dla konkretnego scenariusza branżowego (np. dostęp do bazy produkcyjnej w firmie finansowej pod DORA), tak by zespół dało się obsłużyć realnie.
- **Benchmark:** wynik studenta (ile stałego dostępu zlikwidowano, ile sekretów objęto skarbcem i rotacją, jakość projektu break-glass, ślad audytowy sesji) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: sekrety maszynowe, chmura i ekonomia PAM (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Zarządzanie sekretami maszyn i potoków (machine identity / CI/CD secrets):** dostęp uprzywilejowany aplikacji, kontenerów i potoków wdrożeniowych — dziś *większość* dostępu uprzywilejowanego, trudniejsza niż ludzka, bo działa bez przerwy i bez człowieka.
- **Uprawnienia uprzywilejowane w chmurze (CIEM — Cloud Infrastructure Entitlement Management):** opanowanie eksplozji uprawnień administracyjnych w AWS/Azure/GCP, dostęp uprzywilejowany na żądanie w chmurze.
- **Ekonomia i wykonalność operacyjna PAM:** PAM, który za bardzo przeszkadza, zostaje obejściem (ludzie wracają do współdzielonych haseł „bo szybciej"). Dojrzały architekt waży bezpieczeństwo przeciw tarciu — najlepszy PAM jest niewidoczny dla uczciwego administratora.
- **Benchmark** wobec rozwiązania realnego architekta tożsamości uprzywilejowanej: nie tylko „czy chroni", ale „czy da się z tym pracować i utrzymać to za rozsądny koszt".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Stały dostęp uprzywilejowany (standing privilege) to grzech główny.** Konto administratora aktywne na stałe to drzwi czekające na napastnika. Dojrzałość PAM = *jak mało* stałego dostępu zostało (cel: „zero standing privilege" — władza tylko na czas zadania). Amator chroni hasło admina; zawodowiec odbiera adminowi władzę, dopóki jej nie potrzebuje.

2. **Nie wiesz, ilu masz administratorów (privileged account discovery).** Konta uprzywilejowane mnożą się w ukryciu — lokalni administratorzy, zagnieżdżone grupy, konta usługowe. Bez inwentaryzacji PAM chroni tylko te konta, o których wiesz, a napastnik wchodzi przez te zapomniane.

3. **Konta usługowe (service accounts) i tożsamości maszynowe to większość ryzyka — i najczęściej zaniedbane.** Za kontem aplikacji nikt nie stoi: hasło ustawione raz, nigdy nierotowane, nikt go nie odbierze „przy odejściu". To dziś główny front PAM (pomost z niuansu #9 researchu IAM).

4. **Sekrety zaszyte w kodzie (hardcoded secrets) nie znikają po usunięciu.** Hasło wrzucone raz do repozytorium git zostaje w historii — trzeba je *unieważnić* (zrotować), nie tylko skasować z pliku. Amator usuwa linijkę i czuje się bezpieczny.

5. **Rotacja sekretów może położyć produkcję.** Zmiana hasła w skarbcu bez nauczenia aplikacji pobierać świeży sekret = awaria. Rotacja jest słuszna, ale wymaga integracji — inaczej zespół ją wyłącza po pierwszym wypadku i wraca do haseł na stałe.

6. **Skarbiec to pojedynczy punkt awarii i najcenniejszy łup.** Zebranie wszystkich sekretów w jednym miejscu jest słuszne, ale czyni ze skarbca cel nr 1. Jego ochrona (MFA odporne na wyłudzenie, dostęp warunkowy, kopie, plan awaryjny) jest częścią kompetencji, nie dodatkiem.

7. **Konto awaryjne (break-glass) to paradoks.** Musi działać, gdy padnie wszystko inne (więc bywa poza MFA/JIT), przez co jest najcenniejszym celem. Zawodowiec twardo je chroni, monitoruje każde użycie i testuje; amator zakłada je „na wszelki wypadek" i zapomina.

8. **Nagrywanie sesji uprzywilejowanej zderza się z prawem pracy i RODO.** Zapis działań administratora to monitoring pracownika — regulowany (Kodeks pracy, obowiązek poinformowania) i objęty RODO (cel, minimalizacja, retencja, adres IP jako dana osobowa — TSUE Breyer C-582/14). To decyzja prawno-organizacyjna, nie samo „włącz nagrywanie".

9. **PAM, który za bardzo przeszkadza, zostaje obejściem.** Jeśli pobranie hasła trwa kwadrans, ludzie wracają do współdzielonego hasła „bo szybciej" — i cały PAM jest martwy. Najlepszy PAM jest niewidoczny dla uczciwego administratora. Ważenie bezpieczeństwa przeciw tarciu to rdzeń dojrzałości.

10. **PAM bez działającego IAM stoi na piasku.** Nie da się chronić kont uprzywilejowanych, jeśli nie wiadomo, kto jest kim i kto czego potrzebuje (cykl życia, role, least privilege z `iam.md`). PAM jest *zaostrzeniem* IAM, nie zamiennikiem — dlatego autorowany po nim.

11. **Granica etyczno-prawna jest częścią kompetencji.** Student pracuje wyłącznie na własnym/treningowym systemie z *fikcyjnymi* tożsamościami i poświadczeniami — nigdy realnymi hasłami/kontami osób ani cudzą infrastrukturą. Nieautoryzowany dostęp do cudzych systemów/kont jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty PAM muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania inżyniera PAM. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt. PAM jest węższy niż IAM (3,0% popytu) — pula proporcjonalnie mniejsza, za to głębsza.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Inwentaryzacja kont uprzywilejowanych** — spisanie wszystkich kont admin/root/usługowych na treningowym Linux + AD z partii 1, wskazanie współdzielonego hasła | Rozpoznanie kont uprzywilejowanych, discovery, rozliczalność | #2 |
| P2 | L2 | **Skarbiec sekretów od zera** — umieszczenie poświadczenia w otwartoźródłowym skarbcu (Vault/OpenBao), kontrolowane pobranie z zapisem | Skarbiec, check-out/check-in | #6 |
| P3 | L2 | **Sekrety poza kodem + rotacja** — wyjęcie hasła ze skryptu do skarbca, konfiguracja rotacji, omówienie pułapki „rotacja kładzie produkcję" | Rotacja, hardcoded secrets, konta usługowe | #3, #4, #5 |
| P4 | L3 | **Dostęp na czas (JIT)** — przepływ wniosek→przyznanie na czas→automatyczne wygaszenie dla persony-admina; eliminacja standing privilege | JIT, najmniejsze uprawnienie admina | #1 |
| P5 | L3 | **Nagrywanie sesji + granica prawna** — włączenie zapisu sesji (Teleport), omówienie monitoringu pracownika i RODO | Nagrywanie sesji, nadzór, granica RODO/prawo pracy | #8 |
| P6 | L3 | **Konto break-glass** — zaprojektowanie konta ratunkowego, jego zabezpieczenie, alert na każde użycie | Break-glass, plan awaryjny skarbca | #6, #7 |
| P7 | L3 | **PAM spotyka SIEM** — wysłanie zdarzeń uprzywilejowanych (pobranie sekretu, JIT, break-glass) do SIEM i alert o nadużyciu (most do grupy SIEM) | Integracja PAM↔SIEM↔IAM | #1, #7 |
| (P8–P9) | L4–L5 | **ZAPOWIEDŹ** — wdrożenie skarbca+JIT i eliminacja standing privilege w scenariuszu DORA; sekrety maszynowe/CI/CD + CIEM w chmurze + ekonomia PAM; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #3, #9 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 7 projektów** (węższa niż IAM, bo węższy popyt — proporcja do rynku, nie odgórny target, §2 frameworku). L4–L5: 2 projekty, po rozszerzeniu struktury. Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (inwentaryzacja) → P2 (skarbiec) → P3 (sekrety poza kodem + rotacja) → P4 (JIT) → P5 (nagrywanie sesji) → P6 (break-glass) → P7 (most do SIEM). Skarbiec (P2) musi poprzedzać rotację (P3) i JIT (P4), bo bez skarbca nie ma czym rotować ani wydawać na czas. Cała pula zakłada ukończone projekty IAM (cykl życia, role) — patrz §6.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

PAM **nie ma sensu** bez wcześniej opanowanego IAM i fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **IAM — pełen cykl życia tożsamości, role i least privilege** (`tools/content/research/iam.md`, projekty L1–L3). To **najtwardszy prerekwizyt**: PAM jest *zaostrzeniem* IAM dla kont uprzywilejowanych. Bez rozumienia konta, grupy, roli, nadawania i odbierania dostępu student nie pojmie, czym konto uprzywilejowane różni się od zwykłego. **Wymagane przed L1 PAM.**
2. **Active Directory / katalog tożsamości** — projekt partii 1 `cyber-iam-active-directory-lab` daje konkretny katalog, w którym żyją konta administratora domeny (pierwszy realny obiekt PAM). **Wymagane/równoległe na L1.**
3. **Podstawy systemów operacyjnych** — `Linux` (konta `root`/`sudo`, konta usługowe) i `Windows`; projekt partii 1 `cyber-hardening-linux-bash` tworzy tę bazę. Bez niej student nie rozpozna konta uprzywilejowanego w systemie. **Wymagane przed L1.**
4. **Podstawy automatyzacji (Python/skrypty)** — żeby na L2 wyjąć sekret ze skryptu i pobierać go ze skarbca, student musi rozumieć, czym jest skrypt i plik konfiguracyjny. Fundament daje partia 1 (`cyber-python-automatyzacja-logow`). **Wymagane przed L2 (sekrety poza kodem).**
5. **Pojęcie logu i monitorowania (SIEM)** — żeby na L3 połączyć zdarzenia uprzywilejowane z detekcją. Fundament: research SIEM (`tools/content/research/siem.md`) i partia 1. **Wymagane przed L3 (most P7).**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK; praca wyłącznie na własnym/treningowym systemie z fikcyjnymi poświadczeniami). **Wymagane od L1.**

**Czego PAM dostarcza jako prerekwizyt dla innych liści:** PAM jest fundamentem dla **`CyberArk`** (konkretne narzędzie klasy PAM — `kind: tool`, ten sam zestaw zasad realizowany w jednym produkcie) i domyka grupę „Tożsamość i zarządzanie dostępem". Zasilа też detekcję w grupie **SIEM/SOC** (alerty o nadużyciu dostępu uprzywilejowanego to jedne z najważniejszych w SOC). Kolejność autoringu w grupie: IAM → PAM → CyberArk.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy i normy (oficjalne, darmowe):**
- NIST SP 800-53 r5, rodzina **AC (Access Control)** — zwłaszcza AC-6 (najmniejsze uprawnienie), AC-2 (zarządzanie kontami), oraz IA (uwierzytelnianie): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-207 „Zero Trust Architecture" (dostęp uprzywilejowany na żądanie, nie na stałe): https://csrc.nist.gov/pubs/sp/800/207/final
- NIST SP 800-63B „Digital Identity Guidelines — Authentication" (MFA dla kont wrażliwych): https://pages.nist.gov/800-63-3/sp800-63b.html
- CIS Controls v8 — Control 5 (zarządzanie kontami) i Control 6 (zarządzanie kontrolą dostępu, w tym uprzywilejowanego): https://www.cisecurity.org/controls

**Dobre praktyki i wiedza branżowa (otwarte, autorytatywne):**
- OWASP Secrets Management Cheat Sheet (zarządzanie sekretami, skarbiec, rotacja): https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Access Control Cheat Sheet (least privilege, autoryzacja): https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html

**Dokumentacja narzędzi (oficjalna, darmowa / otwartoźródłowa — do labów):**
- HashiCorp Vault — otwartoźródłowy skarbiec sekretów (rdzeń labów L2): https://developer.hashicorp.com/vault/docs
- OpenBao — otwartoźródłowy fork Vault (w pełni wolna licencja, alternatywa do labu): https://openbao.org/docs/
- Teleport — otwartoźródłowy dostęp do infrastruktury z nagrywaniem sesji i dostępem na czas (lab L3): https://goteleport.com/docs/
- CyberArk — dokumentacja narzędzia klasy PAM (liść `CyberArk` w grupie; atrybucja + link): https://docs.cyberark.com/

**Kontekst prawny EU/PL (do projektów i klauzul — szczególnie nagrywanie sesji):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- RODO, art. 32 (bezpieczeństwo przetwarzania — kontrola dostępu uprzywilejowanego): https://eur-lex.europa.eu/eli/reg/2016/679
- Kodeks pracy, art. 22(2)–22(3) (monitoring pracownika — podstawa dla nagrywania sesji): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego — twarde wymogi wobec dostępu uprzywilejowanego): https://eur-lex.europa.eu/eli/reg/2022/2554
- Dyrektywa NIS2 (cyberbezpieczeństwo, kontrola dostępu uprzywilejowanego): https://eur-lex.europa.eu/eli/dir/2022/2555

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Dwa szczególne punkty ryzyka prawnego w tej kompetencji:** (1) **nagrywanie sesji uprzywilejowanej** (projekt P5) to monitoring pracownika — wymaga klauzuli o podstawie prawnej (Kodeks pracy, obowiązek poinformowania) i celu/retencji wg RODO, nawet na labie z fikcyjnymi personami (student musi rozumieć granicę); (2) **sekrety i poświadczenia** — twarda klauzula „wyłącznie fikcyjne hasła/klucze na własnym treningowym systemie, nigdy realne poświadczenia ani cudza infrastruktura". Linki do weryfikacji aktualności przed wejściem do `learning_resources` (CyberArk/Teleport — częste zmiany URL dokumentacji).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research był „CyberArk-centryczny".** Pierwsza wersja zrównywała PAM z jednym narzędziem. CISO: „rynek to też HashiCorp Vault, Delinea, Teleport, BeyondTrust — junior uwięziony w jednym produkcie jest mniej wart, a licencji CyberArk i tak nie da do nauki". **Poprawka:** oparłam laby na *otwartoźródłowych* narzędziach (Vault/OpenBao, Teleport), zostawiłam CyberArk jako osobny liść-narzędzie, a PAM opisałam jako koncepcję ponad narzędziem (§2). `kind: concept` to potwierdza.

2. **Słabość: skupienie na hasłach, nie na stałym dostępie.** CISO: „junior, który zabezpiecza hasło admina, ale zostawia adminowi władzę na stałe, niczego nie naprawił — pierwsze, co tępię, to standing privilege". **Poprawka:** uczyniłam eliminację stałego dostępu i „zero standing privilege" osią L3 (niuans #1, projekt P4 — JIT), a nie pobocznym tematem.

3. **Słabość: pominięte tożsamości maszynowe i sekrety w kodzie.** CISO: „dziś większość kont uprzywilejowanych to nie ludzie, tylko aplikacje i potoki CI/CD — junior, który widzi tylko admina-człowieka, jest z poprzedniej epoki". **Poprawka:** dodałam konta usługowe (L2), niuanse #3 i #4 (machine identity, hardcoded secrets) oraz zakres L5 (sekrety CI/CD, CIEM). Projekt P3 wprost wyjmuje sekret ze skryptu.

4. **Słabość: nagrywanie sesji bez kąta prawnego.** CISO: „w EU nagrywanie pracownika bez podstawy to skarga do urzędu ochrony danych — junior, który tego nie wie, naraża firmę". **Poprawka:** dodałam niuans #8 (monitoring pracownika, Kodeks pracy + RODO), osobny projekt P5 z granicą prawną i wyróżniłam ten punkt jako pierwsze ryzyko w uwadze dla Ryana (§7).

5. **Słabość: PAM oderwany od IAM i od reszty ścieżki.** CISO: „PAM bez IAM to zamek na piasku, a PAM bez detekcji to teatr — chcę juniora, który wie, że nadużycie konta admina widać w SIEM". **Poprawka:** uczyniłam IAM najtwardszym prerekwizytem (§6 pkt 1, niuans #10), dodałam projekt-most P7 (zdarzenia uprzywilejowane → SIEM) i opisałam kolejność autoringu w grupie (IAM → PAM → CyberArk).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (PAM, vault, just-in-time/JIT, standing privilege, session recording, secrets rotation, check-out/check-in, hardcoded secrets, service account, machine identity, break-glass, privileged account discovery, CIEM, Zero Trust, MFA, least privilege, CISO, DORA, NIS2). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie projekty L1–L3 z niuansami #1–#2, #4–#8, #10. Niuanse #3 (tożsamości maszynowe w skali), #9 (ekonomia/tarcie PAM) domykają się w pełni dopiero na L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione. PAM domyka się zawodowo dopiero po opanowanym IAM — research wprost tego wymaga (§6).

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
