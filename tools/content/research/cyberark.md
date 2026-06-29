# Research kompetencji: CyberArk

> **Status:** research liścia ścieżki Cybersecurity Specialist (grupa „Tożsamość i zarządzanie dostępem (IAM)"), powstały wg wzorca `tools/content/research/siem.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.
> **Zależność treściowa:** ten research **nadbudowuje nad konceptem PAM** (zarządzanie dostępem uprzywilejowanym) — nie powtarza jego teorii. CyberArk to *jeden konkretny produkt* realizujący PAM. Koncept dostępu uprzywilejowanego zaczyna się przy projekcie partii 1 `cyber-iam-active-directory-lab` (PAM jako kompetencja nabywana); tutaj schodzimy na poziom narzędzia i jego architektury.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `CyberArk` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Tożsamość i zarządzanie dostępem (IAM)" (`unionShare` grupy: **12,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **2,4%** ofert ścieżki wymienia CyberArk |
| **Liczba ofert (`offers`)** | **9** |
| **`kind`** | `tool` (konkretne narzędzie/produkt komercyjny — wiodąca platforma PAM, nie kompetencja koncepcyjna) |
| **`lift`** | 20,06 (siła powiązania liścia z tą ścieżką — **bardzo wysoki**: gdy CyberArk pada w ofercie, to niemal zawsze oferta twardo bezpieczeństwowa) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| IAM | 7,5 | 28 | concept | 12,69 |
| Active Directory | 4,3 | 16 | tool | 3,37 |
| PAM | 3,0 | 11 | concept | 26,74 |
| CyberArk (ten plik) | 2,4 | 9 | tool | 20,06 |

**Wniosek dla autoringu:** CyberArk to najbardziej *niszowy* liść grupy popytowo (2,4%, 9 ofert), ale o **bardzo wysokim `lift` (20,06)** — to znaczy, że jego obecność w ofercie jest mocnym sygnałem: pracodawca szuka kogoś do konkretnego, regulowanego środowiska (najczęściej bank, ubezpieczyciel, duża korporacja). Koncept grupy to PAM (`lift` jeszcze wyższy, 26,74); CyberArk jest jego wiodącym rynkowym wcieleniem. Wniosek twardy dla projektów: **nie da się dać studentowi licencji CyberArk** (produkt komercyjny, enterprise, bez darmowej wersji). Autoring musi więc uczyć **dyscypliny PAM na otwartoźródłowych odpowiednikach**, a wiedzy *specyficznej dla CyberArk* — z oficjalnej dokumentacji i darmowych szkoleń producenta. To kluczowa decyzja projektowa, opisana w §3 i §4 (niuans #10).

---

## 2. Definicja kompetencji i jej rola w pracy

**CyberArk (komercyjna platforma do zarządzania dostępem uprzywilejowanym — PAM)** to system, który przejmuje kontrolę nad **kontami uprzywilejowanymi** — czyli takimi, które mają władzę nad systemami: administrator domeny w Active Directory, konto `root` na serwerze, konto usługowe bazy danych, konto w chmurze z prawem do wszystkiego. To są klejnoty koronne firmy; jedno przejęte konto uprzywilejowane często oznacza przejęcie całej infrastruktury.

Idea PAM, którą CyberArk wciela, jest nieoczywista dla amatora: **administrator przestaje znać hasło do konta, którym się posługuje.** Hasło zna skarbiec, nie człowiek. CyberArk robi cztery rzeczy:

1. **Przechowuje poświadczenia w skarbcu (vault — zaszyfrowany sejf na hasła i klucze).** Konta uprzywilejowane lądują w skarbcu, ułożone w **sejfy** (Safe — logiczny kontener z własnymi uprawnieniami dostępu). Hasła nie krążą po karteczkach, plikach i skryptach.
2. **Rotuje sekrety automatycznie** — komponent zmieniający hasła (w CyberArk: CPM, Central Policy Manager — centralny menedżer polityk) okresowo i po każdym użyciu zmienia hasło konta uprzywilejowanego wg polityki. Hasło, którego nikt nie zna i które ciągle się zmienia, jest bezużyteczne dla napastnika.
3. **Pośredniczy i nagrywa sesje uprzywilejowane** — komponent pośredniczący sesję (w CyberArk: PSM, Privileged Session Manager — menedżer sesji uprzywilejowanych) łączy administratora z serwerem tak, że człowiek nigdy nie widzi hasła, a cała sesja jest **nagrywana** (rozliczalność: kto, kiedy, co zrobił na produkcji).
4. **Wymusza dostęp na żądanie i zatwierdzenia** — dostęp do najbardziej wrażliwych kont przyznawany jest na czas zadania (just-in-time — „na teraz, nie na stałe"), często z zatwierdzeniem drugiej osoby (dual control — zasada czworga oczu).

**Czym CyberArk NIE jest (rozróżnienie zawodowca):**
- CyberArk to nie menedżer haseł (jak ten w przeglądarce). Menedżer haseł *pamięta* hasło dla Ciebie; PAM sprawia, że **Ty go nie znasz**, a dostęp jest pośredniczony, nagrywany i czasowy. To inna filozofia.
- CyberArk ≠ IAM. IAM zarządza tożsamością *zwykłego* użytkownika (kto to jest, do czego ma dostęp). PAM/CyberArk zajmuje się wąską, najgroźniejszą warstwą — kontami z władzą administracyjną. PAM to „IAM dla kont, które mogą zniszczyć firmę".
- CyberArk to nie jedyne PAM. Rynek to też m.in. Delinea (dawniej Thycotic), BeyondTrust, HashiCorp Vault (otwartoźródłowy, raczej do sekretów aplikacyjnych). Zawodowiec rozumie *dyscyplinę PAM*, nie jeden ekran — dlatego junior może uczyć się jej na otwartoźródłowych odpowiednikach (§3).

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja CyberArk żyje w **dużych, regulowanych organizacjach** — w Polsce przede wszystkim **banki, ubezpieczyciele i instytucje finansowe**. Role:
- **Inżynier PAM / administrator CyberArk:** wprowadza konta uprzywilejowane do skarbca (onboarding), konfiguruje polityki rotacji i platformy (Platform — szablon mówiący, jak zarządzać danym typem konta), buduje reguły nagrywania sesji, ustawia dostęp na żądanie i ścieżki zatwierdzeń, integruje CyberArk z AD i z SIEM.
- **Specjalista bezpieczeństwa / audytor:** korzysta z nagrań i logów CyberArk do dochodzeń i audytów zgodności (kto miał dostęp do systemu produkcyjnego i co tam zrobił).

**Po co rynkowi ta kompetencja.** Napędza ją **regulacja sektora finansowego**: rozporządzenie **DORA** (odporność cyfrowa sektora finansowego — wymaga kontroli i rozliczalności dostępu uprzywilejowanego), wytyczne **KNF** (Komisja Nadzoru Finansowego — polski regulator), normy jak **PCI-DSS** (standard ochrony danych kart płatniczych — wprost wymaga zarządzania dostępem uprzywilejowanym i nagrywania sesji). Bank bez kontroli kont uprzywilejowanych nie przejdzie audytu. Stąd wysoki `lift`: oferta z CyberArk to niemal zawsze poważne, regulowane środowisko — i dobrze płatna nisza.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać".

> **Decyzja projektowa (powtórzona z §1, bo determinuje cały rozdział):** CyberArk nie ma darmowej wersji do laba. Dlatego **umiejętności praktyczne student ćwiczy na otwartoźródłowych odpowiednikach PAM** (HashiCorp Vault — skarbiec sekretów i ich rotacja; Teleport lub Apache Guacamole — pośredniczenie i nagrywanie sesji), a wiedzę *specyficzną dla CyberArk* (nazwy komponentów, architektura, przepływy) zdobywa z **oficjalnej dokumentacji i darmowych szkoleń producenta**. Każdy projekt jawnie mapuje „to ćwiczysz na narzędziu open-source, a u CyberArk nazywa się to tak". To uczciwe wobec studenta i wobec pracodawcy — uczy *dyscypliny*, nie kłamie, że dał dostęp do enterprise.

### L1 — Fundamenty: skarbiec poświadczeń i model PAM (3–6 h)

**Zakres wiedzy/umiejętności:**
- **Czym jest konto uprzywilejowane** i dlaczego jest klejnotem koronnym (administrator domeny, `root`, konto usługowe, konto w chmurze) — w nawiązaniu do kont z Active Directory (§6).
- **Czym jest skarbiec (vault)** i czym różni się od zwykłego menedżera haseł (administrator nie zna hasła — patrz §2).
- **Słownik CyberArk vs koncept ogólny:** Sejf (Safe), konto (account), platforma (Platform) — i ich odpowiedniki w świecie open-source.
- **Hands-on na odpowiedniku:** umieszczenie sekretu w otwartoźródłowym skarbcu (np. HashiCorp Vault uruchomiony lokalnie/w kontenerze), nadanie polityki dostępu, odczyt sekretu przez uprawnioną tożsamość.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić otwartoźródłowy skarbiec na własnym labie, umieścić w nim sekret, ograniczyć dostęp polityką i pobrać go jako uprawniona tożsamość; nazwać, jak te elementy nazywają się w CyberArk (Sejf/konto/platforma) i czym skarbiec różni się od menedżera haseł.

**Profesjonalne niuanse na tym poziomie:**
- **„Hasła nie zna człowiek" to cała rewolucja PAM.** Amator myśli „PAM = lepszy menedżer haseł". Zawodowiec wie, że sens to *odebranie* hasła człowiekowi i pośredniczenie dostępu.
- **Skarbiec to najcenniejszy cel w firmie.** Skoro trzyma wszystkie klucze, to jego własne utwardzenie i odzyskiwanie jest sprawą życia i śmierci (rozwinięte w L4/L5, niuans #8).

### L2 — Zastosowanie: rotacja sekretów i polityki (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Rotacja sekretu** — automatyczna zmiana hasła konta uprzywilejowanego wg polityki: okresowo i po każdym użyciu (check-in/check-out — „pobranie i zwrot" konta, po zwrocie hasło się zmienia). W CyberArk robi to CPM; na labie student odwzorowuje to mechanizmem rotacji w HashiCorp Vault (np. sekrety dynamiczne — tworzone na żądanie i wygasające).
- **Polityka platformy (Platform)** — reguły mówiące, *jak* zarządzać danym typem konta (jak często rotować, jak się logować, jakie ograniczenia).
- **Konta usługowe** — dlaczego są najtrudniejsze do rotacji (aplikacja ma zaszyte hasło i przestaje działać po zmianie) i jak to się rozwiązuje. Bezpośredni pomost do Active Directory (konta usługowe, gMSA) i do Kerberoastingu.
- **Mierzalny efekt:** pokazanie „przed/po" — sekret statyczny i wieczny vs sekret rotowany i krótkotrwały.

**Co student musi UMIEĆ ZROBIĆ:** skonfigurować na labie automatyczną rotację sekretu (lub sekrety dynamiczne), wymusić zmianę hasła po użyciu, udokumentować różnicę wobec hasła statycznego; wyjaśnić, dlaczego rotacja konta usługowego jest ryzykowna i jak się ją bezpiecznie przeprowadza; nazwać odpowiedniki w CyberArk (CPM, Platform).

**Profesjonalne niuanse:**
- **Hasło, które nigdy się nie zmienia, to dług, nie wygoda.** Najgroźniejsze są konta usługowe ze stałym hasłem sprzed lat — i to one giną w Kerberoastingu (pomost do AD). PAM istnieje głównie po to, by ten dług spłacać automatycznie.
- **Rotacja konta usługowego potrafi położyć produkcję.** Zmiana hasła, którego aplikacja używa „na sztywno", wywala usługę. Zawodowiec rotuje z mapą zależności; amator rotuje na ślepo i wywołuje awarię.

### L3 — Portfolio: izolacja i nagrywanie sesji uprzywilejowanej (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Pośredniczenie sesji (session brokering)** — administrator łączy się z serwerem *przez* bramę, która sama podaje poświadczenie; człowiek nigdy nie widzi hasła. W CyberArk to PSM; na labie student odwzorowuje to otwartoźródłową bramą (np. Teleport albo Apache Guacamole — brama zdalnego dostępu).
- **Nagrywanie sesji** — zapis tego, co dzieje się w sesji uprzywilejowanej, jako dowód audytowy (kto, kiedy, jakie polecenia na produkcji).
- **Dostęp na żądanie (just-in-time) i zerowy stały przywilej (zero standing privilege)** — konto nie ma uprawnień „na stałe"; dostaje je na czas zadania i traci po nim.
- **Zatwierdzenia i czworo oczu (dual control)** — dostęp do najwrażliwszych kont wymaga akceptacji drugiej osoby.
- **Integracja z monitoringiem** — przekazanie zdarzeń dostępu uprzywilejowanego do SIEM (pomost do grupy SIEM): alarm, gdy ktoś pobiera konto poza godzinami albo omija bramę.

**Co student musi UMIEĆ ZROBIĆ:** zestawić na własnym labie pośredniczony, nagrywany dostęp do serwera przez otwartoźródłową bramę (administrator nie zna hasła docelowego), włączyć nagrywanie sesji, skonfigurować dostęp przyznawany na czas zadania, i pokazać ślad audytowy; opisać, jak te mechanizmy realizuje CyberArk (PSM, just-in-time, dual control) i jaki wymóg regulacyjny (DORA/PCI-DSS) zaspokajają. To poziom „portfolio na rozmowę o pracę" do roli inżyniera PAM.

**Profesjonalne niuanse:**
- **Nagranie sesji to rozliczalność, nie inwigilacja.** W regulowanej firmie to wymóg prawny (kto co zrobił na produkcji), ale dotyka prywatności pracownika — granica RODO i informowania jest częścią kompetencji (niuans #11).
- **Just-in-time bije stały dostęp, bo skraca okno ataku.** Konto, które ma władzę tylko przez 30 minut zadania, jest bezużyteczne dla napastnika przez resztę doby. Amator daje dostęp „na stałe, żeby nie przeszkadzać".
- **Break-glass to konieczność i największe ryzyko zarazem.** Musi istnieć awaryjny dostęp, gdy skarbiec padnie — ale to właśnie ten awaryjny dostęp jest najcenniejszym celem napastnika. Zawodowiec projektuje break-glass z najwyższą kontrolą; amator zostawia „zapasowe hasło admina w sejfie w recepcji".

### L4 — Realny przypadek profesjonalny: wdrożenie PAM w firmie regulowanej (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *zastanej* firmy (np. bank) z kontami uprzywilejowanymi rozsianymi po AD, serwerach i aplikacjach — i zaprojektowanie planu ich wprowadzenia do PAM (onboarding) bez wstrzymania działania.
- **Projekt pod konkretny wymóg regulacyjny** (DORA / wytyczne KNF / PCI-DSS): które konta objąć, jak długo trzymać nagrania, jak udokumentować rozliczalność dla audytora.
- Integracja PAM z Active Directory (konta domenowe) i z SIEM (alarmy o nadużyciu), zaprojektowanie ścieżek zatwierdzeń i break-glass.
- **Benchmark:** plan wdrożenia studenta (zakres kont, polityki rotacji, model sesji, zgodność z regulacją) zestawiony z tym, co na tym samym przypadku zaprojektował profesjonalista PAM.

### L5 — Biegłość: architektura PAM dla organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia dostępu uprzywilejowanego dla całej firmy:** dojście do zerowego stałego przywileju (zero standing privilege), powiązanie z modelem warstw z Active Directory (Tier 0), decyzja, które konta w ogóle powinny istnieć.
- **Odporność i odzyskiwanie skarbca:** co się dzieje, gdy padnie samo PAM (pojedynczy punkt awarii o najwyższej wartości) — architektura wysokiej dostępności, kopie, plan break-glass odporny na atak.
- **Ekonomia i operacja:** PAM jest kosztowny (licencje per konto/sesja) i tarciogenny dla administratorów; senior waży zakres wobec kosztu i wobec tego, czy ludzie faktycznie będą tego używać, czy zaczną obchodzić.
- **Benchmark** wobec rozwiązania realnego architekta IAM/PAM: nie „czy wdrożone", ale „czy odporne, zgodne z regulacją i utrzymywalne operacyjnie".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **PAM to nie menedżer haseł — sens to odebranie hasła człowiekowi.** Skarbiec zna hasło, człowiek nie; dostęp jest pośredniczony i nagrywany. Kto tego nie rozumie, traktuje CyberArk jak drogi KeePass i marnuje całą wartość.

2. **Konto uprzywilejowane to klejnot koronny — jedno wystarczy, by stracić firmę.** PAM chroni wąską, najgroźniejszą warstwę kont. To bezpośrednia kontynuacja Active Directory: administrator domeny i konta usługowe AD to dokładnie to, co CyberArk bierze pod klucz (pomost #2 do AD i Tier 0).

3. **Rotacja sekretów spłaca dług, ale potrafi położyć produkcję.** Hasło konta usługowego, którego aplikacja używa „na sztywno", po rotacji wywala usługę. Zawodowiec rotuje z mapą zależności i oknem serwisowym; amator rotuje na ślepo.

4. **Nagrywanie sesji to rozliczalność wymagana prawem — i pole minowe RODO.** W banku to wymóg (DORA, PCI-DSS, KNF): wiadomo, kto co zrobił na produkcji. Ale nagranie pracy człowieka to dane osobowe — trzeba informować, minimalizować, ograniczać dostęp do nagrań. Zawodowiec trzyma obie strony naraz.

5. **Just-in-time / zero standing privilege skraca okno ataku.** Dostęp na czas zadania zamiast „na stałe" sprawia, że przejęte konto jest bezużyteczne przez większość czasu. To dojrzała praktyka; amator daje uprawnienia bezterminowo „dla wygody".

6. **Break-glass to konieczność i największe ryzyko.** Awaryjny dostęp na wypadek awarii skarbca jest niezbędny — i jest najcenniejszym celem napastnika. Sposób, w jaki firma projektuje break-glass, zdradza jej dojrzałość.

7. **Dual control (czworo oczu) na najwrażliwszych kontach.** Najgroźniejsze operacje wymagają akceptacji drugiej osoby — bezpiecznik przeciw pojedynczemu skompromitowanemu administratorowi. Realny wymóg w sektorze finansowym.

8. **Skarbiec to pojedynczy punkt awarii o najwyższej wartości.** Centralizacja sekretów daje kontrolę, ale tworzy jeden cel, którego przejęcie lub awaria są katastrofą. Odporność i odzyskiwanie skarbca to temat seniorski (L5), o którym amator nie myśli, dopóki nie padnie.

9. **Sekrety przeciekają do kodu i CI/CD.** Hasła zaszyte w skryptach, plikach konfiguracyjnych i potokach wdrożeniowych (hardcoded secrets) to klasyczna dziura — PAM rozszerza się na świat DevOps (pomost do liścia DevSecOps). Nowoczesny inżynier PAM pilnuje też sekretów aplikacyjnych, nie tylko logowań administratorów.

10. **CyberArk jest komercyjny — zawodowiec rozumie dyscyplinę, nie klika jeden produkt.** Nie ma darmowego laba CyberArk; kto „umie tylko klikać w CyberArk", jest kruchy. Wartość rynkowa to zrozumienie PAM jako dyscypliny (skarbiec, rotacja, sesje, JIT) — przenoszalne na Delinea, BeyondTrust, Vault. Dlatego projekty uczą na open-source, a CyberArk mapują słownikiem.

11. **Granica etyczno-prawna i RODO są częścią kompetencji.** Praca wyłącznie na własnym labie i otwartoźródłowych narzędziach; nigdy na cudzych poświadczeniach (art. 267 Kodeksu karnego). Nagrania sesji i logi dostępu to dane osobowe — minimalizacja, informowanie, ograniczony dostęp (RODO). Sekrety w labie są fikcyjne, nie firmowe.

12. **PAM bez Active Directory nie ma czego chronić.** Większość kont uprzywilejowanych żyje w AD; CyberArk wpina się w AD, by nimi zarządzać. To zamyka grupę IAM w całość: IAM (dyscyplina) → AD (gdzie są konta) → PAM/CyberArk (jak chronimy te najgroźniejsze).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty CyberArk muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania inżyniera PAM. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). **Sprawdzona bramka kanonu README:** nazwa kompetencji w `competencies[]` musi brzmieć dosłownie `CyberArk` (i `PAM` jako pojęcie nadrzędne) — pisownia ze zbioru dozwolonego.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego PAM w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Skarbiec poświadczeń od zera** — umieszczenie sekretu w otwartoźródłowym skarbcu (HashiCorp Vault), polityka dostępu, odczyt jako uprawniona tożsamość; mapowanie słownika na CyberArk (Sejf/konto/platforma) | Skarbiec vs menedżer haseł, model PAM, Sejf/konto/platforma | #1, #2 |
| P2 | L2 | **Rotacja sekretów** — automatyczna zmiana hasła / sekrety dynamiczne, check-in/check-out, „przed/po"; ryzyko rotacji konta usługowego | Rotacja, polityka platformy, konta usługowe, CPM | #3 |
| P3 | L3 | **Pośredniczona, nagrywana sesja uprzywilejowana** — brama (Teleport/Guacamole), administrator nie zna hasła, nagranie sesji, ślad audytowy; odpowiednik PSM | Session brokering, nagrywanie sesji, audyt | #4 |
| P4 | L3 | **Dostęp na żądanie i czworo oczu** — przyznanie uprawnień na czas zadania (just-in-time), ścieżka zatwierdzenia (dual control), alarm do SIEM o nadużyciu | Just-in-time, zero standing privilege, dual control, integracja z SIEM | #5, #7 |
| (P5–P6) | L4–L5 | **ZAPOWIEDŹ** — plan wdrożenia PAM w banku pod DORA/KNF (onboarding kont, integracja AD+SIEM, break-glass) + architektura/odporność skarbca i ekonomia; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #6, #8, #9 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 4 projekty** (żaden jeszcze nie istnieje — cyber ma dziś 0 projektów CyberArk; PAM dotykany tylko jako kompetencja nabywana w lab AD partii 1). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną i jawną notą „ćwiczysz na open-source, u CyberArk nazywa się to tak", rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (skarbiec — bez niego nie ma o czym mówić) → P2 (rotacja) → P3 (sesje) → P4 (just-in-time + zatwierdzenia). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy. Cała pula zakłada wcześniej opanowane Active Directory (skąd biorą się konta uprzywilejowane — §6).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

CyberArk **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Koncept IAM** (liść `IAM`) — czym jest tożsamość, konto, uprawnienie. Buduje go projekt partii 1 `cyber-iam-active-directory-lab`. **Wymagane przed L1.**
2. **Koncept PAM** (liść `PAM`) — czym jest konto uprzywilejowane i czym różni się od zwykłego. Dotykany jako kompetencja nabywana w lab AD partii 1; CyberArk jest jego narzędziowym pogłębieniem. **Wymagane przed L1 / równolegle z L1.**
3. **Active Directory** (liść `Active Directory`, osobny research) — bo większość kont uprzywilejowanych, które CyberArk chroni, to konta domenowe i usługowe AD; bez tego student nie wie, *czego* pilnuje PAM. **Wymagane przed L2 (rotacja kont usługowych) i krytyczne na L4.**
4. **Podstawy systemów i sieci** (`Linux`, `Windows`, `TCP/IP`) — skarbiec, brama sesji i konta usługowe żyją na serwerach; lab open-source (Vault, Teleport) stawia się na Linuksie. **Wymagane przed L1.**
5. **Kompetencja SIEM** (liść `SIEM`) — integracja PAM z monitoringiem (alarm o nadużyciu dostępu uprzywilejowanego) na L3/L4. **Wymagane/równoległe na L3.**
6. **Klauzula etyczno-prawna i RODO** — praca wyłącznie na własnym labie i fikcyjnych sekretach; nagrania/logi jako dane osobowe (art. 267 KK, RODO). **Wymagane od L1, krytyczne od L3** (nagrywanie sesji).

**Czego CyberArk dostarcza jako prerekwizyt/dopełnienie dla innych liści:**
- **`Incident Response` / `SOC`** — nagrania i logi dostępu uprzywilejowanego to kluczowy materiał dochodzeniowy po incydencie.
- **`DevSecOps`** — zarządzanie sekretami rozszerza się na potoki CI/CD (hardcoded secrets); to naturalny pomost do grupy DevSecOps.
- **`DORA` / `RODO / GDPR` / `Risk Management`** — CyberArk jest wprost narzędziem realizacji wymogów regulacyjnych dostępu uprzywilejowanego; domyka grupę zgodności.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja i szkolenia producenta (CyberArk, darmowe do czytania):**
- CyberArk Docs — dokumentacja produktowa (Privileged Access Manager, komponenty Vault/CPM/PSM/PVWA): https://docs.cyberark.com/
- CyberArk University — darmowe szkolenia i ścieżki (rejestracja bezpłatna): https://training.cyberark.com/

**Otwartoźródłowe odpowiedniki do laba (praktyka PAM bez licencji CyberArk):**
- HashiCorp Vault — otwartoźródłowy skarbiec sekretów i ich rotacja (odpowiednik skarbca + CPM): https://developer.hashicorp.com/vault/docs
- Teleport — otwartoźródłowa brama dostępu z nagrywaniem sesji (odpowiednik PSM): https://goteleport.com/docs/
- Apache Guacamole — otwartoźródłowa brama zdalnego dostępu przez przeglądarkę (alternatywny odpowiednik PSM): https://guacamole.apache.org/doc/gug/

**Wiedza o zagrożeniach (otwarte, autorytatywne):**
- MITRE ATT&CK — taktyka Credential Access (dostęp do poświadczeń): https://attack.mitre.org/tactics/TA0006/
- MITRE ATT&CK — Unsecured Credentials (T1552, sekrety w kodzie/plikach): https://attack.mitre.org/techniques/T1552/

**Standardy i kontekst prawny EU/PL:**
- NIST SP 800-53 — kontrole dostępu i konta uprzywilejowane (rodzina AC, m.in. AC-6 least privilege): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- PCI-DSS — standard ochrony danych kart (wymogi dostępu uprzywilejowanego i nagrywania): https://www.pcisecuritystandards.org/document_library/
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego — kontrola dostępu uprzywilejowanego): https://eur-lex.europa.eu/eli/reg/2022/2554
- KNF — Komisja Nadzoru Finansowego (polski regulator, wytyczne dla sektora): https://www.knf.gov.pl/
- TSUE, sprawa Breyer C-582/14 (dane w logach jako dane osobowe — kontekst RODO dla nagrań sesji): https://curia.europa.eu/juris/liste.jsf?num=C-582/14

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich, brak łamania licencji (CyberArk uczony z *czytania* dokumentacji i darmowych szkoleń, nie z nielegalnej kopii produktu). **Punkt do weryfikacji:** projekty L3 obejmują nagrywanie sesji — konieczna klauzula RODO (nagranie pracy = dane osobowe; w labie wyłącznie fikcyjne konta i własne maszyny). Otwartoźródłowe odpowiedniki (Vault GPL/MPL, Teleport, Guacamole Apache 2.0) wymagają noty licencyjnej i atrybucji w README, jak w partii 1. Sprawdzić aktualność wymogów DORA/KNF przed wejściem do `theory_md` (regulacja żywa).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer) w polskim banku, który zatrudnia inżynierów PAM i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research udawał, że da się ćwiczyć na samym CyberArk.** CISO: „Nie dacie studentowi licencji enterprise — jeśli projekt zakłada żywy CyberArk, jest fikcją". **Poprawka:** podjęłam jawną decyzję projektową (§1, §3, niuans #10): praktyka na otwartoźródłowych odpowiednikach (Vault, Teleport, Guacamole), a CyberArk uczony słownikiem i z dokumentacji. Każdy projekt mapuje „to robisz na open-source, u CyberArk nazywa się tak". Uczciwe i wykonalne.

2. **Słabość: PAM mylony z menedżerem haseł.** Pierwsza wersja opisywała skarbiec jako „bezpieczne miejsce na hasła". CISO: „Jeśli kandydat myśli, że PAM to KeePass dla firmy, nie rozumie niczego — sens to *odebrać* człowiekowi hasło". **Poprawka:** uczyniłam to niuansem #1 i wbudowałam w definicję (§2) oraz w kryterium L1 — student musi nazwać różnicę.

3. **Słabość: brak rotacji konta usługowego jako realnej pułapki.** CISO: „Pierwsza rzecz, którą junior psuje: rotuje hasło konta usługowego i kładzie produkcję". **Poprawka:** dodałam to do L2 i niuansu #3, z bezpośrednim pomostem do kont usługowych Active Directory i Kerberoastingu — to spina grupę IAM w spójną całość.

4. **Słabość: nagrywanie sesji bez wymiaru regulacyjnego i RODO.** CISO: „W banku nagranie sesji to wymóg DORA/PCI, ale to też dane osobowe pracownika — kandydat musi trzymać obie strony". **Poprawka:** rozbudowałam L3 i niuans #4 o rozliczalność regulacyjną *oraz* granicę RODO; dodałam wymóg klauzuli RODO do §7 dla Ryana.

5. **Słabość: CyberArk wisiał w próżni, oderwany od reszty.** CISO: „PAM bez AD nie ma czego chronić, a bez SIEM nikt nie zobaczy nadużycia — kandydat musi widzieć te połączenia". **Poprawka:** §6 przepisałam jako łańcuch (IAM → PAM → AD → CyberArk), dodałam niuanse #2 (Tier 0 z AD), #9 (DevSecOps/sekrety w CI-CD) i #12 (PAM bez AD nie ma sensu), oraz integrację z SIEM w L3/P4.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (PAM, CyberArk, konto uprzywilejowane, vault/skarbiec, Safe/Sejf, Platform/platforma, CPM, PSM, PVWA, rotacja, check-in/check-out, sekrety dynamiczne, session brokering/pośredniczenie sesji, just-in-time, zero standing privilege, dual control/czworo oczu, break-glass, hardcoded secrets, Tier 0, gMSA, Vault/Teleport/Guacamole, DORA, KNF, PCI-DSS, RODO, CISO). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU/PL uzna kandydata za przygotowanego" — dla niszy PAM spełniony częściowo na L1–L3 (kandydat rozumie dyscyplinę i umie ją pokazać na open-source), ale **pełna gotowość do roli inżyniera CyberArk w banku wymaga L4/L5** (wdrożenie pod DORA, integracja AD+SIEM, odporność skarbca) — a te zależą od struktury Ethana/Leo i realnie też od kontaktu z produktem u pracodawcy. To uczciwie oznaczone: research robi kandydata *gotowym do nauki na stanowisku i do rozmowy*, nie udaje certyfikowanego administratora CyberArk. Wysoki `lift` liścia (20,06) potwierdza, że to świadoma nisza, nie masowa kompetencja.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
