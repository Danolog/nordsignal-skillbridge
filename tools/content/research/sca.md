# Research kompetencji: SCA

> **Status:** research liścia-narzędzia grupy „Bezpieczeństwo aplikacji (AppSec)" w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **Teorię podatności webowych dziedziczy z `owasp.md`** (rdzeń koncepcyjny grupy), w szczególności kategorię Top 10 „Vulnerable and Outdated Components" (podatne i przestarzałe komponenty). Ten plik **nie powtarza** tej teorii — skupia się na **analizie zależności/bibliotek** (znane podatności CVE, licencje), **bezpieczeństwie łańcucha dostaw** i **SBOM**. Pojęcia CVE/CWE dziedziczy z `owasp.md` §4 #6.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — analiza zależności kodu własnego/otwartego; ryzyko licencyjne; SBOM a wymogi regulacyjne) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `SCA` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Bezpieczeństwo aplikacji (AppSec)" (`unionShare` grupy: **4,9%**) |
| **Popyt liścia (`demandPercentage`)** | **1,1%** ofert ścieżki wymienia SCA |
| **Liczba ofert (`offers`)** | **4** |
| **`kind`** | `tool` (klasa narzędzi analizy składu oprogramowania — patrz §2) |
| **`lift`** | 26,74 (najwyższy w grupie — silne, niszowe powiązanie ze ścieżką) |
| **Liść-rdzeń (dziedziczona teoria)** | `OWASP` → `tools/content/research/owasp.md` |
| **Narzędzie wiodące do laba** | OWASP Dependency-Check (otwarte) + Trivy / Grype |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Wniosek dla autoringu:** SCA (Software Composition Analysis — analiza składu oprogramowania) to *narzędziowa* nadbudowa nad OWASP, ale o innym przedmiocie niż SAST/DAST: nie analizuje *Twojego* kodu ani *Twojej* działającej aplikacji, lecz **cudze biblioteki, których używasz**. Popyt 1,1% (4 oferty), ale `lift` 26,74 — najwyższy w grupie — znaczy, że gdzie SCA się pojawia, jest silnie związany ze ścieżką. Research **cienki w teorii podatności** (jest w `owasp.md`), **gruby w specyfice łańcucha dostaw:** zależności przechodnie (cudzy kod w cudzym kodzie), odróżnianie podatności *osiągalnej* od *zaimportowanej-ale-nieużywanej* (znów „realna dziura vs fałszywy alarm"), zgodność licencji i SBOM (spis składników) jako wymóg regulacyjny. Narzędziem wiodącym jest **OWASP Dependency-Check** — część projektu OWASP, więc spójne z rdzeniem grupy.

---

## 2. Definicja kompetencji i jej rola w pracy

**SCA (analiza składu oprogramowania)** to badanie **zależności** aplikacji — bibliotek i komponentów open source, których programista *użył*, ale których *nie napisał*. Współczesna aplikacja to w 80–90% cudzy kod (biblioteki); SCA odpowiada na pytanie „co tak naprawdę jest w środku i czy któryś z tych obcych klocków ma znaną dziurę albo kłopotliwą licencję".

Co SCA robi (dwa filary):
1. **Znane podatności (CVE)** — narzędzie spisuje wszystkie zależności (też te ukryte) i sprawdza je względem publicznych baz znanych podatności (NIST NVD, bazy producentów). Wynik: „używasz biblioteki X w wersji Y, która ma znaną dziurę CVE-…; zaktualizuj do Z".
2. **Zgodność licencji** — sprawdza, na jakiej licencji jest każda zależność. To nie bezpieczeństwo, lecz **ryzyko prawne**: licencja typu copyleft (np. GPL — wymaga udostępnienia kodu pochodnego) w produkcie zamkniętym to problem dla działu prawnego, nie dla napastnika. SCA wykrywa oba.

Dwa pojęcia, bez których SCA się nie rozumie:
- **Zależność przechodnia (transitive dependency — zależność pośrednia):** biblioteka, której używasz, sama używa innych bibliotek. Dziura bywa nie w tym, co dołączyłeś świadomie, lecz w *zależności Twojej zależności*, trzy poziomy w głąb. Większość ryzyka SCA siedzi właśnie tu — bo o tym kodzie nikt nie pamięta.
- **SBOM (Software Bill of Materials — spis składników oprogramowania):** maszynowo czytelna lista *wszystkich* komponentów aplikacji z wersjami (jak skład na opakowaniu produktu). Coraz częściej **wymóg regulacyjny** (USA — rozporządzenie wykonawcze 14028; UE — Cyber Resilience Act). SCA generuje SBOM.

**Czym SCA różni się od SAST i DAST (komplementarność — sedno tego pliku):**
- **SAST** patrzy na **Twój kod** (od środka). **DAST** patrzy na **Twoją działającą aplikację** (z zewnątrz). **SCA** patrzy na **cudzy kod, który zaimportowałeś** — obszar, którego dwa pozostałe z definicji nie pokrywają. To dlatego pełna ocena aplikacji potrzebuje wszystkich trzech.
- Dziurę z SCA „dziedziczysz", nie „popełniasz": nie ma błędu w Twoim kodzie — jest w klocku, który wziąłeś. Naprawa to zwykle *aktualizacja wersji*, nie poprawka logiki.

**Łącznik z OWASP:** SCA realizuje kategorię Top 10 **„Vulnerable and Outdated Components"** (podatne i przestarzałe komponenty) z `owasp.md`. To jest „narzędziowe ramię" tej kategorii.

**Kto tego używa i jak wygląda dzień pracy.** Inżynier AppSec, inżynier DevSecOps (bezpieczeństwo wpięte w wytwarzanie), programista. Cykl: SCA odpala się w potoku CI/CD przy każdej zmianie i przy budowie; produkuje listę podatnych zależności i ostrzeżeń licencyjnych; człowiek przeprowadza **triage** — czy podatność jest *osiągalna* (czy faktycznie używamy podatnej funkcji), jak pilna jest aktualizacja, czy nie zepsuje ona aplikacji — i planuje aktualizację.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował (niezmiennik §4 frameworku). **Poziomy zakładają opanowaną teorię z `owasp.md`** (zwłaszcza pojęcia CVE/CWE z §4 #6 i kategorię „podatne komponenty").

> **Klauzula całej ścieżki:** analiza zależności wyłącznie projektu **własnego lub otwartego**. SBOM ujawnia skład aplikacji — w projektach studenckich dotyczy to kodu własnego/otwartego, nie cudzych zamkniętych produktów. Wchodzi do `theory_md` każdego projektu.

### L1 — Fundamenty: spis zależności i pierwsza znana podatność (3–6 h)

**Zakres wiedzy/umiejętności (specyfika SCA):**
- Uruchomienie darmowego narzędzia SCA (OWASP Dependency-Check albo Trivy) na **własnym lub otwartym** projekcie z zależnościami.
- Odczyt raportu: które biblioteki są podatne, jakie numery CVE, jaka dotkliwość, jaka bezpieczna wersja docelowa.
- Pojęcie **zależności bezpośredniej vs przechodniej** — zobaczenie na własne oczy, że dziura siedzi w bibliotece, której świadomie nie dodawałeś.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić skaner zależności na własnym/otwartym projekcie; odczytać 3–5 podatnych zależności z numerami CVE i wersjami docelowymi; wskazać, które są bezpośrednie, a które przechodnie.

**Profesjonalne niuanse na tym poziomie:**
- **Większość Twojej aplikacji to nie Twój kod.** To zaskoczenie dla początkującego: dziur w zależnościach bywa więcej niż we własnym kodzie, a o tym kodzie nikt nie myśli.
- **„Podatna biblioteka" nie znaczy automatycznie „podatna aplikacja".** Dziura w funkcji, której nie wywołujesz, jest realnie mniej groźna — pierwszy sygnał, że i tu trzeba triage (rozwinięte na L2).

### L2 — Zastosowanie: triage osiągalności, aktualizacja, licencje (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Triage podatności zależności:** czy podatna funkcja jest realnie *osiągalna* (reachability — czy nasz kod ją wywołuje)? jaka dotkliwość w *naszym* kontekście? Odróżnienie „krytyczne, pilne" od „w bibliotece, ale nie używamy tej ścieżki".
- **Aktualizacja jako naprawa** — podniesienie wersji podatnej zależności i sprawdzenie, że (a) dziura znika z raportu, (b) aplikacja dalej działa (aktualizacja bywa zmianą łamiącą — *breaking change*).
- **Zgodność licencji** — odczytanie licencji zależności, rozpoznanie ryzyka (copyleft w produkcie zamkniętym), zgłoszenie do decyzji prawnej. To osobny wymiar SCA, nieobecny w SAST/DAST.

**Co student musi UMIEĆ ZROBIĆ:** przejść listę podatnych zależności i ocenić osiągalność/pilność każdej; zaktualizować co najmniej jedną i udowodnić re-skanem, że dziura znika, a aplikacja działa; zidentyfikować jedno ryzyko licencyjne i opisać, dlaczego to ryzyko.

**Profesjonalne niuanse:**
- **Osiągalność oddziela panikę od pracy.** Lista 200 CVE bez analizy osiągalności to szum, który prowadzi albo do paniki, albo do ignorowania. Zawodowiec pyta „czy my w ogóle wywołujemy tę funkcję" — i dopiero to ustawia priorytet (analogia do triage z `owasp.md` #2/#3).
- **Aktualizacja to ryzyko, nie darmowa naprawa.** Podniesienie wersji może zepsuć aplikację (zmiana łamiąca). „Po prostu zaktualizuj wszystko" bywa gorsze niż świadoma, sprawdzona aktualizacja jednej zależności.
- **Licencja to ryzyko, którego napastnik nie wykorzysta, ale prawnik tak.** Junior, który widzi w SCA tylko CVE, przeoczy GPL w produkcie komercyjnym — a to potrafi zablokować sprzedaż firmy (kontekst Built-to-Sell).

### L3 — Portfolio: SCA + SBOM w potoku CI/CD i bezpieczeństwo łańcucha dostaw (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Wpięcie SCA w potok CI/CD** własnego projektu: skan przy każdej zmianie, próg blokujący (np. „nie buduj z nową krytyczną podatną zależnością").
- **Generowanie SBOM** (w standardzie CycloneDX albo SPDX — formaty spisu składników) i zrozumienie, *po co* regulacje go wymagają (gdy wybuchnie nowa podatność, SBOM pozwala w minutę odpowiedzieć „czy nas dotyczy").
- **Bezpieczeństwo łańcucha dostaw (supply chain security):** świadomość ataków przez zależności — przejęte/podszyte pakiety (typosquatting — pakiet o nazwie łudząco podobnej do popularnego), złośliwy kod wstrzyknięty do aktualizacji. Podstawy obrony: przypinanie wersji (pinning), weryfikacja źródła.
- **Raport** profesjonalnej jakości: podatne zależności z osiągalnością i priorytetami, ryzyka licencyjne, SBOM, plan aktualizacji.

**Co student musi UMIEĆ ZROBIĆ:** wpiąć SCA w potok CI/CD z progiem; wygenerować SBOM i opisać jego rolę; nazwać co najmniej jeden wektor ataku na łańcuch dostaw i podstawową obronę; oddać raport gotowy na rozmowę o pracę. To poziom „portfolio".

**Profesjonalne niuanse:**
- **SBOM bez procesu to martwy dokument.** Sam spis nie chroni; wartość pojawia się, gdy przy nowej podatności *w minutę* sprawdzasz „czy nas dotyczy". Zawodowiec buduje proces, nie tylko plik.
- **Łańcuch dostaw to rosnący front.** Najgłośniejsze incydenty ostatnich lat (przejęte popularne pakiety) pokazały, że atak nie musi celować w Ciebie — wystarczy, że trafi bibliotekę, której używasz. To zmienia myślenie z „mój kod" na „wszystko, co wciągam".

### L4 / L5 — ZAPOWIEDŹ ZAKRESEM

> **Uwaga (§3 frameworku):** struktura L4/L5 (referencyjny wynik profesjonalisty + benchmark) — **osobno Ethan/Leo**. Research tylko zapowiada zakres.

- **L4:** triage realnego projektu z setką podatnych zależności — analiza osiągalności, plan aktualizacji z oceną ryzyka zmian łamiących, korelacja z wynikami SAST/DAST w jeden raport. Benchmark wobec inżyniera AppSec/DevSecOps.
- **L5:** strategia zarządzania zależnościami i łańcuchem dostaw dla organizacji — polityka SBOM, zautomatyzowane aktualizacje z bramkami, obrona przed atakami na łańcuch dostaw, zgodność z CRA/regulacjami. Benchmark wobec architekta.

---

## 4. Profesjonalne niuanse — sedno North Star

Materiał na głębię. **Teoria *samych podatności* i pojęcia CVE/CWE są w `owasp.md`** — tu niuanse *specyficzne dla analizy zależności i łańcucha dostaw*.

1. **Dziurę dziedziczysz, nie popełniasz.** SCA znajduje błędy w cudzym kodzie, który wciągnąłeś. Naprawa to zwykle aktualizacja wersji, nie poprawka logiki — inny tryb pracy niż przy SAST/DAST.
2. **Zależności przechodnie to ukryte ryzyko.** Najwięcej podatności siedzi w zależnościach zależności — kodzie, którego nikt świadomie nie dodał i o którym nikt nie pamięta. Bez SCA ten obszar jest niewidzialny.
3. **Osiągalność oddziela realną dziurę od fałszywego alarmu** (dziedziczy z `owasp.md` #2/#3): podatna funkcja, której nigdy nie wywołujesz, jest realnie mniej groźna. Lista CVE bez analizy osiągalności to szum prowadzący do paniki albo ignorowania.
4. **Aktualizacja to ryzyko, nie darmowa naprawa.** Podniesienie wersji bywa zmianą łamiącą, która wywróci aplikację. „Zaktualizuj wszystko na ślepo" potrafi wyrządzić więcej szkody niż jedna stara biblioteka. Zawodowiec aktualizuje świadomie i sprawdza efekt.
5. **Licencja to ryzyko prawne, nie tylko bezpieczeństwo.** SCA wykrywa też kłopotliwe licencje (copyleft w produkcie zamkniętym). Napastnik tego nie użyje, ale dział prawny zablokuje wdrożenie/sprzedaż. Junior widzący tylko CVE przeoczy połowę wartości narzędzia.
6. **SBOM to wymóg, nie ozdoba.** Spis składników jest coraz częściej wymagany regulacyjnie (USA EO 14028, UE Cyber Resilience Act) — i ma realną wartość: przy nowej podatności daje natychmiastową odpowiedź „czy nas dotyczy". Ale sam plik bez procesu jest martwy.
7. **Łańcuch dostaw to osobny wektor ataku.** Przejęte lub podszyte pakiety (typosquatting, złośliwa aktualizacja) atakują nie Ciebie, lecz bibliotekę, której ufasz. Obrona: przypinanie wersji, weryfikacja źródła, czujność na podejrzane pakiety.
8. **Granica etyczno-prawna:** analiza zależności projektu **własnego lub otwartego**; SBOM ujawnia skład — nie publikuje się składu cudzych zamkniętych produktów bez prawa do tego.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty SCA muszą pokryć umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury). Mapa pokrycia — nie pełne projekty (E3-A).

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3 | Niuanse z §4 |
|---|---|---|---|---|
| C1 | L1 | **Pierwszy skan zależności** — Dependency-Check/Trivy na własnym/otwartym projekcie, odczyt podatnych bibliotek + CVE, rozróżnienie bezpośrednia/przechodnia | Skan, odczyt CVE, przechodniość | #1, #2 |
| C2 | L2 | **Triage osiągalności + aktualizacja** — ocena, czy podatna funkcja jest używana; aktualizacja jednej zależności z dowodem re-skanem i działającą aplikacją | Triage osiągalności, aktualizacja, ryzyko zmian | #3, #4 |
| C3 | L2 | **Zgodność licencji** — wykrycie i opis ryzyka licencyjnego (copyleft w produkcie zamkniętym), zgłoszenie do decyzji | Licencje, ryzyko prawne | #5 |
| C4 | L3 | **SCA + SBOM w potoku CI/CD + łańcuch dostaw** — skan z progiem, wygenerowany SBOM z opisem roli, nazwany wektor ataku na łańcuch dostaw i obrona | CI/CD, SBOM, supply chain, raport | #6, #7 |
| (C5) | L4–L5 | **ZAPOWIEDŹ** — triage realnego projektu + plan aktualizacji + korelacja z SAST/DAST; strategia łańcucha dostaw dla organizacji; benchmark | Zakres L4/L5 | #6, #7 |

**Szacowana pula L1–L3: ok. 4 projekty.** L4–L5: 1–2 po rozszerzeniu struktury.

**Łańcuch zależności:** C1 → C2 → C3 → C4. **Cały blok zakłada opanowane O1–O4 z `owasp.md`** (zwłaszcza pojęcia CVE/CWE i kategorię „podatne komponenty"). C3 (licencje) może iść równolegle do C2.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

1. **OWASP (rdzeń teorii)** — `owasp.md`: pojęcia CVE/CWE (§4 #6) i kategoria Top 10 „Vulnerable and Outdated Components". **Bezwzględnie wymagane przed L1 SCA** — bez pojęcia CVE student nie zinterpretuje raportu.
2. **Podstawy programowania i menedżera pakietów** — czym jest zależność, plik manifestu (np. `requirements.txt`/`package.json`), jak biblioteka trafia do projektu. Liść `Python` (partia 1) buduje pierwszy kontakt. **Wymagane przed L1.**
3. **Pojęcie potoku CI/CD i budowy** — do wpięcia SCA i SBOM na L3. Liść `CI/CD`. **Wymagane przed L3.**
4. **Kontekst prawno-regulacyjny** — podstawy licencji open source i istnienia regulacji (CRA, RODO w kontekście SBOM). Wspiera liść `RODO / GDPR` / `GRC`. **Wymagane/równoległe na L2–L3.**
5. **Klauzula etyczno-prawna** — analiza projektu własnego/otwartego. **Wymagane od L1.**

**Relacja do reszty grupy:** SCA jest trzecim filarem oceny aplikacji obok `SAST` (Twój kod) i `DAST` (Twoja działająca aplikacja) — pokrywa to, czego tamte z definicji nie ruszają (cudze biblioteki). Nie jest ich prerekwizytem; wszystkie trzy łączy rdzeń **OWASP**. Na L4 trzy źródła się korelują.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

**Narzędzia SCA (darmowe/otwarte, do laba):**
- OWASP Dependency-Check (wiodące otwarte narzędzie): https://owasp.org/www-project-dependency-check/
- Trivy (otwarty skaner zależności i obrazów kontenerów): https://trivy.dev/latest/docs/
- Grype + Syft (skaner podatności + generator SBOM, otwarte): https://github.com/anchore/grype
- GitHub Dependabot (darmowe alerty zależności dla repozytoriów): https://docs.github.com/en/code-security/dependabot

**Bazy podatności i standardy SBOM (otwarte, autorytatywne):**
- NIST NVD (National Vulnerability Database — baza znanych podatności): https://nvd.nist.gov/
- MITRE CVE (katalog konkretnych podatności): https://www.cve.org/
- OWASP CycloneDX (standard formatu SBOM): https://cyclonedx.org/
- SPDX (alternatywny standard SBOM): https://spdx.dev/
- OWASP Dependency-Track (platforma zarządzania SBOM, kontekst L5): https://owasp.org/www-project-dependency-track/

**Łańcuch dostaw (otwarte, autorytatywne):**
- OWASP Top 10 — A06 „Vulnerable and Outdated Components": https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/
- NIST SP 800-218 SSDF (bezpieczny cykl wytwarzania, łańcuch dostaw): https://csrc.nist.gov/pubs/sp/800/218/final

**Kontekst regulacyjny EU/USA (do projektów i klauzul):**
- Cyber Resilience Act (CRA — wymóg bezpieczeństwa produktów cyfrowych, SBOM): https://eur-lex.europa.eu/eli/reg/2024/2847
- US Executive Order 14028 (wymóg SBOM w dostawach do administracji): https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity

> **Do uwagi Ryana:** wszystkie narzędzia w wersjach darmowych/otwartych; ćwiczenie **na projekcie własnym lub otwartym**. Dwa punkty wymagające oka Ryana: (a) **licencje** — projekty uczą rozpoznawania ryzyka licencyjnego (copyleft w produkcie zamkniętym), co dotyka realnej zgodności prawnej firmy (kontekst Built-to-Sell); (b) **SBOM** — ujawnia skład aplikacji, więc w projektach dotyczy kodu własnego/otwartego, nie cudzych zamkniętych produktów. Bazy CVE/NVD publiczne. Klauzula etyczna i mapowanie do `owasp.md` (kategoria A06).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Najsurowszy krytyk — CISO zatrudniający juniorów AppSec/DevSecOps. Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: research powtarzał teorię podatności z OWASP.** CISO: „pojęcie CVE już znam z OWASP — powiedz mi, czym praca z zależnościami różni się od pracy z własnym kodem". **Poprawka:** zadeklarowałam dziedziczenie z `owasp.md`, a ciężar przesunęłam na specyfikę: dziura dziedziczona (#1), zależności przechodnie (#2), aktualizacja jako naprawa. Jawnie powiązałam SCA z kategorią A06 Top 10.

2. **Słabość: SCA jako „lista CVE do odhaczenia".** CISO: „junior, który zgłasza 200 CVE bez analizy osiągalności, wywoła panikę albo zostanie zignorowany — jedno i drugie jest bezużyteczne". **Poprawka:** niuans #3 (osiągalność oddziela realną dziurę od szumu) i projekt L2 (C2) o triage osiągalności. To rozdzielnik amator↔zawodowiec, ten sam co w całej grupie.

3. **Słabość: pominięte ryzyko aktualizacji.** CISO: „«zaktualizuj wszystko» to rada, która wywróciła niejedną produkcję — junior musi wiedzieć, że aktualizacja bywa zmianą łamiącą". **Poprawka:** niuans #4 (aktualizacja to ryzyko) i wymóg na L2, by po aktualizacji udowodnić, że aplikacja *dalej działa* (re-skan + sprawność), nie tylko że CVE zniknął.

4. **Słabość: licencje potraktowane jako poboczne.** CISO: „połowa wartości SCA to zgodność licencji — junior, który widzi tylko bezpieczeństwo, przeoczy GPL, które zablokuje nam sprzedaż". **Poprawka:** niuans #5 i osobny projekt L2 (C3) o licencjach; powiązanie z Built-to-Sell (zgodność prawna firmy). To wymiar nieobecny w SAST/DAST — wyróżnik SCA.

5. **Słabość: brak łańcucha dostaw i SBOM jako żywego procesu.** CISO: „SBOM jako plik do szuflady jest bezwartościowy; chcę juniora, który rozumie, że to narzędzie odpowiedzi «czy nas dotyczy» przy nowej podatności — i zna ataki na łańcuch dostaw". **Poprawka:** niuanse #6 (SBOM bez procesu martwy) i #7 (łańcuch dostaw jako wektor), projekt L3 (C4) o SBOM w potoku i obronie łańcucha dostaw, z kontekstem regulacyjnym (CRA, EO 14028).

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty po polsku przy pierwszym użyciu (SCA, zależność bezpośrednia/przechodnia, CVE/CWE, NVD, copyleft/GPL, breaking change/zmiana łamiąca, reachability/osiągalność, SBOM, CycloneDX/SPDX, supply chain/łańcuch dostaw, typosquatting, pinning/przypinanie wersji, DevSecOps, CI/CD, CRA, EO 14028). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** spełniona, jeśli autoring domknie 4 projekty L1–L3 z niuansami #1–#7. Skala organizacyjna (polityka SBOM, automatyczne aktualizacje, obrona łańcucha dostaw w skali) wymaga L4/L5 — zapowiedziane, zależne od Ethana/Leo. Pełna „zawodowość" SCA domyka się w korelacji z SAST i DAST (ocena aplikacji to trzy źródła) — uczciwie oznaczone.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
