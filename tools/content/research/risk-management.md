# Research kompetencji: Risk Management

> **Status:** research kompetencji w ETAP E3, wg wzorca (golden-example) `tools/content/research/siem.md`. Trzyma jego strukturę, głębię i poprzeczkę.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Risk Management` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Audyt, ryzyko i zgodność (GRC)" (`unionShare` grupy: **13,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **4,9%** ofert ścieżki wymienia zarządzanie ryzykiem |
| **Liczba ofert (`offers`)** | **18** |
| **`kind`** | `concept` (kompetencja koncepcyjna, nie pojedyncze narzędzie — patrz §2) |
| **`lift`** | 7,76 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie GRC** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| **Risk Management** (ten plik) | 4,9 | 18 | concept |
| ISO 27001 | 3,2 | 12 | concept |
| NIST | 2,7 | 10 | concept |
| RODO / GDPR | 1,9 | 7 | concept |
| DORA | 1,9 | 7 | concept |
| **GRC** (osobny research, nadbudowa) | 1,3 | 5 | concept |

**Wniosek dla autoringu:** Risk Management to liść o **najwyższym popycie w całej grupie GRC** (4,9% — więcej niż ISO 27001, NIST czy DORA). Cała grupa to kompetencje koncepcyjne (`kind: concept`) — rynek pyta o *sposób myślenia* („umiem zidentyfikować, ocenić i opisać ryzyko, i zaproponować, co z nim zrobić"), nie o obsługę narzędzia. Zarządzanie ryzykiem jest **rdzeniem pojęciowym grupy**: norma (ISO 27001), ramy (NIST), regulacje (RODO, DORA) i sama dyscyplina GRC *operują na języku ryzyka*. Dlatego Risk Management autorujemy w grupie pierwszy — pozostałe liście się o niego opierają, a research GRC ma go jawnie nadbudować, nie powtarzać.

---

## 2. Definicja kompetencji i jej rola w pracy

**Zarządzanie ryzykiem (Risk Management — uporządkowany proces rozpoznawania, mierzenia i świadomego decydowania, co zrobić z zagrożeniami dla organizacji)** to dyscyplina, która zamienia rozmyte „a co, jeśli coś się stanie" w policzalne, udokumentowane decyzje. W bezpieczeństwie informacji ryzyko rozumie się jako **kombinację prawdopodobieństwa, że dane zagrożenie wykorzysta słabość systemu, oraz skutku, jaki to wywoła** dla organizacji. Praca specjalisty ryzyka to czteroetapowy cykl, którego pojedyncza „lista zagrożeń" nie zastąpi:

1. **Identyfikacja (identyfikacja ryzyka)** — wypisanie, co może pójść źle: jakie są zasoby (aktywa — to, co ma wartość: dane, systemy, ludzie, reputacja), jakie zagrożenia (threats — źródła szkody: atak, awaria, błąd człowieka, katastrofa) i jakie podatności (vulnerabilities — słabości, które zagrożenie może wykorzystać).
2. **Analiza (analiza ryzyka)** — oszacowanie dla każdego ryzyka dwóch wymiarów: jak **prawdopodobne** jest zdarzenie i jak **dotkliwy** byłby jego skutek. Może być jakościowa (niskie/średnie/wysokie) albo ilościowa (w pieniądzu — patrz niuanse w §4).
3. **Ocena (ewaluacja ryzyka)** — porównanie oszacowanego ryzyka z **apetytem na ryzyko** organizacji (ile ryzyka firma świadomie akceptuje) i ustawienie kolejności: czym zająć się najpierw.
4. **Postępowanie z ryzykiem (risk treatment — reakcja na ryzyko)** — wybór jednej z czterech dróg dla każdego istotnego ryzyka: **ograniczyć** (wdrożyć zabezpieczenie zmniejszające prawdopodobieństwo lub skutek), **przenieść** (np. ubezpieczenie, przerzucenie na dostawcę umową), **unikać** (zrezygnacja z ryzykownej działalności) albo **zaakceptować** (świadoma zgoda na to ryzyko, gdy koszt obrony przewyższa skutek).

Po postępowaniu zostaje **ryzyko szczątkowe (residual risk — to, co zostaje po wdrożeniu zabezpieczeń)** — nigdy nie schodzi do zera, a kto je akceptuje, musi być jawnie wskazany (właściciel ryzyka).

**Czym zarządzanie ryzykiem NIE jest (rozróżnienie zawodowca):**
- **Ryzyko ≠ zagrożenie.** Zagrożenie (ransomware, pożar, nieuczciwy pracownik) istnieje samo w sobie. Ryzyko to dopiero *zagrożenie zestawione z podatnością i skutkiem dla konkretnej organizacji*. To samo zagrożenie daje inne ryzyko bankowi i piekarni.
- **Zarządzanie ryzykiem ≠ zgodność (compliance).** Można być zgodnym z normą i wciąż mieć wysokie realne ryzyko — i odwrotnie. To jedna z najgroźniejszych pułapek juniora (§4, pkt 3).
- **Zarządzanie ryzykiem ≠ techniczne łatanie dziur.** Specjalista ryzyka nie naprawia podatności ręcznie — on je *wycenia, priorytetyzuje i pilnuje decyzji*, kto, kiedy i czy w ogóle ma je naprawić. To rola decyzyjno-analityczna, nie operacyjna.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja jest rdzeniem pracy **młodszego specjalisty ds. ryzyka (junior risk analyst / GRC analyst)** oraz wsparciem dla **audytora bezpieczeństwa** i **inspektora ochrony danych**. Typowy dzień:
- **Młodszy analityk ryzyka:** prowadzi i aktualizuje **rejestr ryzyk** (risk register — żywa lista wszystkich zidentyfikowanych ryzyk z ich oceną, właścicielem i statusem), zbiera dane od właścicieli systemów, wypełnia **macierz prawdopodobieństwo × skutek** (siatka, która zamienia dwie oceny w jeden poziom ryzyka), przygotowuje materiał na przegląd ryzyka.
- **W styku z dostawcami:** ocenia **ryzyko stron trzecich (third-party / supply-chain risk — ryzyko wnoszone przez dostawców i podwykonawców)** — wysyła kwestionariusze, czyta certyfikaty (np. ISO 27001 dostawcy), pilnuje, by ryzyko wniesione przez podwykonawcę było policzone, nie pominięte.

**Po co rynkowi ta kompetencja.** Regulacje europejskie (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — rozporządzenie o odporności cyfrowej sektora finansowego; RODO — ochrona danych) wprost wymagają **podejścia opartego na ryzyku (risk-based approach)**: firma musi udowodnić, że *zna* swoje ryzyka i *świadomie* nimi zarządza, a nie tylko „kupiła antywirus". Bez rejestru ryzyk i udokumentowanych decyzji firma nie przejdzie audytu ani nie wykaże należytej staranności. Stąd stały popyt — to kompetencja, która łączy technikę z językiem zarządu.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Cała ścieżka ma charakter **dokumentowo-analityczny** (artefakty: rejestry, macierze, raporty), nie laboratoryjno-techniczny.

### L1 — Fundamenty: język ryzyka i pierwszy rejestr (3–6 h)

**Zakres wiedzy/umiejętności:**
- Trzy pojęcia bazowe i ich różnica: **aktywo** (co chronimy), **zagrożenie** (co może zaszkodzić), **podatność** (słabość, którą zagrożenie wykorzysta) — i jak z nich powstaje **ryzyko**.
- Dwa wymiary ryzyka: **prawdopodobieństwo** i **skutek (impact)**; intuicja, że ryzyko to ich połączenie, a nie sama „groźnie brzmiąca nazwa".
- **Rejestr ryzyk (risk register)** — czym jest, jakie ma kolumny (identyfikator, opis ryzyka, aktywo, zagrożenie, podatność, prawdopodobieństwo, skutek, poziom ryzyka, właściciel, reakcja, status).
- Skala jakościowa: opisanie prawdopodobieństwa i skutku w prostej skali (np. 1–5) z **jawną definicją każdego stopnia** (co znaczy „skutek = 4").

**Co student musi UMIEĆ ZROBIĆ:** wziąć opisany scenariusz organizacji (np. mała firma z danymi klientów) i zbudować rejestr ryzyk z co najmniej 8–10 pozycjami — każda z poprawnie rozdzielonym aktywem, zagrożeniem i podatnością oraz uzasadnioną oceną prawdopodobieństwa i skutku.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **„Ransomware" to nie ryzyko — to zagrożenie.** Ryzyko brzmi: „zaszyfrowanie bazy klientów przez ransomware przez niezałataną stację → przestój 3 dni i utrata zaufania". Amator wpisuje do rejestru jednowyrazowe straszaki; zawodowiec opisuje ryzyko jako *zdanie skutkowe* (zdarzenie → ścieżka → skutek).
- **Skala bez definicji stopni to ściema.** Jeśli „prawdopodobieństwo = 3" nie ma opisanego znaczenia, dwie osoby ocenią to samo ryzyko inaczej i rejestr jest bezwartościowy. Definicja stopni to fundament, nie formalność.

### L2 — Zastosowanie: ocena, macierz i decyzja o postępowaniu (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Macierz prawdopodobieństwo × skutek (risk matrix):** zamiana dwóch ocen na jeden poziom ryzyka (zielony/żółty/czerwony albo wartość liczbowa) i świadomość, że granice stref to **decyzja**, nie matematyczny pewnik.
- **Apetyt na ryzyko i tolerancja (risk appetite / tolerance — ile ryzyka organizacja świadomie przyjmuje):** odniesienie ocenionego ryzyka do progu akceptacji.
- **Cztery strategie postępowania:** ograniczenie / przeniesienie / unikanie / akceptacja — wybór z **uzasadnieniem ekonomicznym** (czy koszt zabezpieczenia jest proporcjonalny do redukcji ryzyka).
- **Ryzyko nieodłączne vs szczątkowe (inherent vs residual risk):** ryzyko przed zabezpieczeniami i po nich; pokazanie, *o ile* zabezpieczenie obniża ryzyko.
- **Zabezpieczenie / mechanizm kontrolny (control — środek redukujący ryzyko):** powiązanie ryzyka z konkretnym zabezpieczeniem i wskazanie, czy działa na prawdopodobieństwo, czy na skutek.

**Co student musi UMIEĆ ZROBIĆ:** wziąć rejestr z L1, nanieść ryzyka na macierz, dla 3–5 najwyższych ryzyk wybrać strategię postępowania z uzasadnieniem, dobrać zabezpieczenie i pokazać redukcję z ryzyka nieodłącznego do szczątkowego — oraz wskazać, kto akceptuje ryzyko szczątkowe.

**Profesjonalne niuanse:**
- **Granice stref macierzy to polityka, nie wzór.** To, czy „prawdopodobieństwo 3 × skutek 3" jest żółte czy czerwone, zależy od apetytu firmy. Amator traktuje macierz jak kalkulator; zawodowiec wie, że ją *skalibrowano* pod konkretną organizację.
- **Akceptacja ryzyka to decyzja z nazwiskiem.** „Akceptujemy" bez wskazanego właściciela, który to podpisuje, jest ucieczką od odpowiedzialności. Zawodowiec zawsze pyta: *kto* akceptuje i czy ma do tego mandat.
- **Najtańsze zabezpieczenie nie zawsze najlepsze.** Postępowanie z ryzykiem to rachunek koszt–korzyść: wdrożenie kontroli droższej niż skutek ryzyka to zła decyzja tak samo jak jej brak.

### L3 — Portfolio: pełna ocena ryzyka wg uznanej metody + ryzyko dostawcy (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Przeprowadzenie oceny ryzyka wg uznanej metodyki:** mapowanie własnego procesu na **NIST SP 800-30** (przewodnik prowadzenia oceny ryzyka) lub **ISO/IEC 27005** (zarządzanie ryzykiem w bezpieczeństwie informacji) — żeby wynik był rozpoznawalny dla audytora, nie autorski.
- **Powiązanie ryzyk z normą:** dobranie zabezpieczeń z **załącznika A ISO/IEC 27001** lub funkcji **NIST CSF 2.0** (Identify/Protect/Detect/Respond/Recover/Govern) — pokazanie, że reakcja na ryzyko ma kotwicę w uznanym katalogu.
- **Plan postępowania z ryzykiem (risk treatment plan):** dokument z terminami, właścicielami i statusem dla każdego istotnego ryzyka.
- **Ocena ryzyka strony trzeciej (dostawcy):** kwestionariusz dla dostawcy, czytanie jego certyfikatów/raportów, włączenie ryzyka dostawcy do własnego rejestru.
- **Komunikacja ryzyka do zarządu:** streszczenie ryzyk językiem decydenta (skutek biznesowy i pieniądz, nie żargon techniczny) — patrz niuans #8.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełną, udokumentowaną ocenę ryzyka dla opisanej organizacji wg jawnie wskazanej metody (NIST 800-30 lub ISO 27005), powiązać ryzyka z konkretnymi zabezpieczeniami z normy, zbudować plan postępowania z terminami i właścicielami, dołączyć ocenę co najmniej jednego dostawcy i jednostronicowe streszczenie dla zarządu. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Metoda musi być nazwana i konsekwentna.** Audytor nie ufa „autorskiej" ocenie ryzyka. Zawodowiec deklaruje: „prowadzę wg NIST 800-30" — i trzyma się tego od identyfikacji po monitorowanie.
- **Rejestr ryzyk to dokument żywy, nie zdjęcie.** Ryzyko ma cykl życia: pojawia się, jest oceniane, obsługiwane, przeglądane, zamykane. Rejestr bez kolumny „status" i daty przeglądu jest martwy — opisuje świat, którego już nie ma.
- **Ryzyko dostawcy to twoje ryzyko.** Przekonanie „to problem dostawcy" jest błędem — jeśli wyciek nastąpi u podwykonawcy przetwarzającego twoje dane, odpowiadasz ty (i twój regulator). Łańcuch dostaw to dziś jedno z najczęściej niedoszacowanych ryzyk.

### L4 — Realny przypadek profesjonalny: ocena ryzyka w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *niepełnych, sprzecznych* danych wejściowych z realnej organizacji (właściciele systemów, którzy nie wiedzą, co mają; aktywa nieujęte w żadnym spisie; dostawcy bez dokumentacji) i doprowadzenie do **obronionej oceny ryzyka mimo braków** — to realna codzienność, nie czysty scenariusz z podręcznika.
- Rozstrzygnięcie konfliktu: właściciel biznesowy chce zaakceptować ryzyko, które analityk uważa za zbyt wysokie — przygotowanie argumentacji i ścieżki eskalacji.
- **Benchmark:** ocena ryzyka studenta (kompletność rejestru, jakość uzasadnień, trafność priorytetów, realność planu postępowania) zestawiona z tym, co na tym samym przypadku przygotował profesjonalny analityk ryzyka.

### L5 — Biegłość: zarządzanie ryzykiem na poziomie organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Ilościowa ocena ryzyka (quantitative risk):** wyjście poza skalę niskie/średnie/wysokie ku liczbie w pieniądzu — np. metoda **FAIR** (Factor Analysis of Information Risk — ramy szacowania ryzyka w wartości finansowej), oszacowanie oczekiwanej straty rocznej (ALE — Annualized Loss Expectancy). Dowód, że student potrafi rozmawiać z dyrektorem finansowym jego językiem.
- **Program zarządzania ryzykiem, nie pojedyncza ocena:** cykl przeglądów, kluczowe wskaźniki ryzyka (KRI — Key Risk Indicators), powiązanie z ciągłością działania (business continuity) i raportowaniem do zarządu jako proces ciągły.
- **Apetyt na ryzyko jako narzędzie sterowania:** ustawienie progów akceptacji dla całej organizacji i obrona ich wobec zarządu.
- **Benchmark** wobec rozwiązania realnego menedżera ryzyka / oficera ryzyka: nie „czy zrobił rejestr", ale „czy jego priorytety i wycena wytrzymałyby przegląd zarządu i audyt regulatora".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Ryzyko to nie zagrożenie i nie podatność.** Najczęstszy błąd juniora: wpisuje do rejestru „phishing" albo „brak łatek" i myśli, że ocenił ryzyko. Ryzyko to dopiero *zdarzenie zestawione ze skutkiem dla konkretnej organizacji*. Bez tego rozróżnienia cała ocena jest piaskiem.

2. **Ryzyko teoretyczne vs realne (kontekstualizacja).** „Trzęsienie ziemi niszczy serwerownię" to ryzyko realne w Japonii, teoretyczne w Polsce. Zawodowiec waży ryzyka *w kontekście tej organizacji i tej lokalizacji*, a nie przepisuje generyczną listę z internetu. Rejestr pełen ryzyk, które nigdy nie wystąpią, topi te, które wystąpią.

3. **Pułapka „zgodność = bezpieczeństwo" (compliance ≠ security).** Firma może mieć certyfikat ISO 27001 i wciąż zostać zhakowana — bo certyfikat potwierdza, że *istnieje proces*, nie że ryzyko jest niskie. I odwrotnie: firma bez certyfikatu może być realnie bezpieczna. Zawodowiec nigdy nie myli „przeszliśmy audyt" z „jesteśmy bezpieczni". To pojęcie domyka research GRC (osobny plik) — tu kładziemy fundament.

4. **Skala jakościowa jest subiektywna — i to trzeba wiedzieć.** Ocena „prawdopodobieństwo = 4" zależy od oceniającego. Dlatego zawodowiec (a) definiuje stopnie skali twardo, (b) ocenia zespołowo, nie w pojedynkę, (c) wie, kiedy skala jakościowa nie wystarcza i trzeba przejść na liczby (ryzyko ilościowe, L5). Amator traktuje swoją ocenę jak fakt.

5. **Ryzyko szczątkowe nigdy nie jest zerem — i ktoś musi je podpisać.** Po wszystkich zabezpieczeniach zawsze coś zostaje. Dojrzała organizacja *nazywa* ryzyko szczątkowe i wskazuje właściciela, który je świadomie akceptuje. Udawanie, że „zabezpieczyliśmy się w 100%", to sygnał niedojrzałości.

6. **Ryzyko stron trzecich (łańcuch dostaw).** Twoje ryzyko nie kończy się na twoich systemach. Dostawca chmury, podwykonawca przetwarzający dane, biblioteka open-source w produkcie — każdy wnosi ryzyko, za które wobec klienta i regulatora odpowiadasz ty. To jeden z najszybciej rosnących obszarów (ataki na łańcuch dostaw).

7. **Cztery strategie to wybór, nie odruch.** Domyślny odruch amatora to „ograniczyć" (kupić narzędzie). Czasem racjonalne jest przenieść (ubezpieczyć), unikać (nie wchodzić w ryzykowny rynek) albo zaakceptować (gdy obrona kosztuje więcej niż skutek). Zawodowiec rozważa wszystkie cztery i uzasadnia wybór ekonomicznie.

8. **Język zarządu, nie język technika.** Zarząd nie podejmie decyzji na podstawie „CVE 9.8 na serwerze WWW". Podejmie na podstawie „ryzyko przestoju sklepu na 2 dni = ok. 400 tys. zł straty + kara regulatora". Umiejętność przetłumaczenia ryzyka technicznego na skutek biznesowy i pieniądz to rozdzielnik między analitykiem a starszym analitykiem.

9. **Rejestr ryzyk to proces, nie jednorazowy plik.** Ryzyko ma cykl życia i datę ważności. Rejestr bez przeglądów i statusów po pół roku opisuje nieistniejący świat. Zawodowiec buduje *rytm* przeglądu, nie jednorazowy dokument na audyt.

10. **Apetyt na ryzyko jest decyzją biznesu, nie analityka.** Analityk *mierzy* ryzyko; *ile* go zaakceptować, ustala biznes (zarząd). Junior, który sam decyduje „to za ryzykowne, blokuję", przekracza rolę. Zawodowiec dostarcza dane do decyzji i pilnuje, by zapadła świadomie u właściwej osoby.

11. **Mapowanie na uznane ramy (NIST / ISO) to wymóg wiarygodności.** Autorska metoda oceny ryzyka jest dla audytora bezwartościowa. Zaczepienie procesu w NIST SP 800-30 / ISO 27005 i powiązanie zabezpieczeń z katalogiem normy (ISO 27001 zał. A / NIST CSF) sprawia, że wynik jest porównywalny i obroniony.

12. **Granica etyczno-prawna i dane osobowe w ocenie ryzyka.** Ocena ryzyka dotyka informacji wrażliwych o organizacji (luki, słabości — materiał wprost użyteczny dla atakującego) oraz bywa danymi osobowymi (np. ryzyka opisujące konkretnych pracowników). Zawodowiec traktuje rejestr ryzyk jak dokument poufny, minimalizuje dane osobowe i nie tworzy z niego mapy ataku. Praca wyłącznie na własnej/fikcyjnej organizacji; nieautoryzowane pozyskiwanie informacji o cudzej infrastrukturze jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Risk Management muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania młodszego analityka ryzyka. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README). Wszystkie projekty są **dokumentowo-analityczne** (artefakty: rejestry, macierze, raporty, plany), `sourceType` zwykle `open_data` (publiczne normy, szablony, scenariusze) — zero kodu, zero żywego środowiska.

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Pierwszy rejestr ryzyk** — dla opisanej małej organizacji: rozdzielenie aktywo/zagrożenie/podatność, 8–10 ryzyk jako zdania skutkowe | Pojęcia bazowe, rejestr, zdanie skutkowe | #1, #2 |
| P2 | L1 | **Skala oceny z definicją stopni** — zbudowanie skali prawdopodobieństwa i skutku z twardo opisanym znaczeniem każdego stopnia, ocena ryzyk z P1 | Dwa wymiary ryzyka, definicja skali | #4 |
| P3 | L2 | **Macierz ryzyka i priorytetyzacja** — naniesienie rejestru na macierz, kalibracja stref pod apetyt organizacji, uzasadnienie kolejności | Macierz, apetyt na ryzyko, priorytety | #4, #10 |
| P4 | L2 | **Decyzja o postępowaniu (4 strategie)** — dla top ryzyk wybór ograniczyć/przenieść/unikać/akceptować z uzasadnieniem ekonomicznym, wskazanie właściciela akceptacji | Cztery strategie, control, koszt–korzyść | #5, #7 |
| P5 | L2 | **Ryzyko nieodłączne → szczątkowe** — dobranie zabezpieczeń, pokazanie redukcji ryzyka i jawne nazwanie ryzyka szczątkowego + jego właściciela | Inherent vs residual, control, akceptacja | #5 |
| P6 | L3 | **Pełna ocena ryzyka wg NIST 800-30 / ISO 27005** — mapowanie własnego procesu na uznaną metodę, konsekwencja od identyfikacji po monitorowanie | Metodyka, spójność procesu | #11, #9 |
| P7 | L3 | **Powiązanie ryzyk z normą + plan postępowania** — dobranie zabezpieczeń z ISO 27001 zał. A / NIST CSF, plan z terminami i właścicielami | Zabezpieczenia z katalogu, plan postępowania | #11 |
| P8 | L3 | **Ocena ryzyka dostawcy** — kwestionariusz, czytanie certyfikatu dostawcy, włączenie ryzyka strony trzeciej do rejestru | Ryzyko stron trzecich, łańcuch dostaw | #6 |
| P9 | L3 | **Streszczenie ryzyk dla zarządu** — przełożenie rejestru na jednostronicowy materiał językiem decydenta (skutek biznesowy, pieniądz) | Komunikacja ryzyka, język zarządu | #8 |
| (P10–P12) | L4–L5 | **ZAPOWIEDŹ** — realny niepełny przypadek + konflikt z biznesem (L4); ryzyko ilościowe FAIR/ALE + program zarządzania ryzykiem (L5); z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #2, #3, #10, #12 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną i notą poufności rejestru, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (rejestr) → P2 (skala) → P3 (macierz) → P4 (postępowanie) → P5 (szczątkowe) → P6 (metodyka NIST/ISO) → P7 (norma + plan) → P8 (dostawca) → P9 (zarząd). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Zarządzanie ryzykiem **nie ma sensu** bez wcześniejszego rozumienia, *co* w organizacji może być zagrożone i jak działa atak. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawowa świadomość zagrożeń i podatności** — żeby identyfikować ryzyko, student musi rozumieć, *przed czym* chronimy: czym jest atak, podatność, wektor. Buduje to wcześniejsza praca z grupy SIEM/Monitorowanie (`SIEM`, `SOC`) i automatyzacja (`Python` — projekt brute-force z partii 1 pokazuje, jak wygląda realne zagrożenie). **Zalecane przed L1.**
2. **Pojęcie aktywa i systemu** — co organizacja ma do ochrony: systemy operacyjne (`Linux`, `Windows`), tożsamość i dostęp (`IAM`, `Active Directory` — projekty partii 1). Bez tego student nie wypełni kolumny „aktywo" w rejestrze. **Zalecane przed L1.**
3. **Podstawy mechanizmów kontrolnych** — żeby dobrać zabezpieczenie do ryzyka (L2), warto rozumieć, co zabezpieczenie robi: utwardzanie systemu (`cyber-hardening-linux-bash`), model najmniejszych uprawnień (`cyber-iam-active-directory-lab`). **Zalecane przed L2.**
4. **Powiązane liście GRC jako równoległe, nie prerekwizytowe** — `NIST`, `ISO 27001` to *katalogi*, z których Risk Management czerpie na L3; ich własny research może powstać równolegle, ale **Risk Management jest pojęciowo pierwszy** (dostarcza język ryzyka, którego norma używa). `GRC` jest **nadbudową** nad tym researchem (osobny plik), nie prerekwizytem.
5. **Klauzula etyczno-prawna i poufność** — jak w każdym projekcie cyber (art. 267 KK), wzmocniona o poufność rejestru ryzyk (dokument = mapa słabości organizacji). Praca wyłącznie na własnej/fikcyjnej organizacji. **Wymagane od L1.**

**Czego Risk Management dostarcza jako prerekwizyt dla innych liści grupy GRC:** zarządzanie ryzykiem jest fundamentem pojęciowym dla `ISO 27001` (norma operuje oceną ryzyka jako sercem systemu zarządzania), `NIST` (ramy oparte na ryzyku), `DORA` i `RODO / GDPR` (oba wymagają podejścia opartego na ryzyku) oraz `GRC` (literą „R" w GRC jest właśnie ryzyko). Dlatego Risk Management autorowany jest w grupie pierwszy, a GRC nadbudowuje nad nim integrację z ładem i zgodnością.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub oficjalne; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Ramy i metodyki oceny ryzyka (oficjalne, darmowe):**
- NIST SP 800-30 Rev.1 „Guide for Conducting Risk Assessments" (prowadzenie oceny ryzyka): https://csrc.nist.gov/pubs/sp/800/30/r1/final
- NIST SP 800-37 Rev.2 „Risk Management Framework" (ramy zarządzania ryzykiem, cykl RMF): https://csrc.nist.gov/pubs/sp/800/37/r2/final
- NIST SP 800-39 „Managing Information Security Risk" (zarządzanie ryzykiem na poziomie organizacji): https://csrc.nist.gov/pubs/sp/800/39/final
- NIST Cybersecurity Framework 2.0 (funkcje Identify/Govern — kotwica dla zabezpieczeń): https://www.nist.gov/cyberframework
- ISO/IEC 31000 „Risk management — Guidelines" (ogólne zasady zarządzania ryzykiem; strona standardu): https://www.iso.org/standard/65694.html
- ISO/IEC 27005 „Information security risk management" (ryzyko w bezpieczeństwie informacji; strona standardu): https://www.iso.org/standard/80585.html

> **Uwaga dla Ryana:** normy ISO (31000, 27005, 27001) są **płatne** — w projektach linkujemy do **oficjalnej strony standardu ISO** (opis, zakres) jako źródła autorytatywnego, a naukę praktyczną opieramy na **darmowych** NIST 800-30/37/39 i NIST CSF (treść w pełni otwarta). Nie udostępniamy pirackich kopii norm ISO. To świadomy wybór: NIST jako darmowy nośnik metody, ISO jako wskazany standard rynkowy.

**Regulacje i kontekst prawny EU/PL (oficjalne, darmowe):**
- ENISA — materiały o zarządzaniu ryzykiem cyber (agencja UE ds. cyberbezpieczeństwa): https://www.enisa.europa.eu/topics/risk-management
- Dyrektywa NIS2 (podejście oparte na ryzyku, obowiązki zarządcze): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (zarządzanie ryzykiem ICT w sektorze finansowym): https://eur-lex.europa.eu/eli/reg/2022/2554
- RODO/GDPR — tekst rozporządzenia (art. 32 i 35: podejście oparte na ryzyku, ocena skutków DPIA): https://eur-lex.europa.eu/eli/reg/2016/679/oj

**Wiedza praktyczna i szablony (otwarte/autorytatywne):**
- OWASP Risk Rating Methodology (otwarta metoda szacowania ryzyka aplikacyjnego): https://owasp.org/www-community/OWASP_Risk_Rating_Methodology
- FAIR Institute — wprowadzenie do ilościowej oceny ryzyka (materiały edukacyjne, kontekst L5): https://www.fairinstitute.org/
- CIS Risk Assessment Method (RAM) — darmowa metoda oceny ryzyka powiązana z zabezpieczeniami CIS: https://www.cisecurity.org/insights/white-papers/cis-ram-risk-assessment-method

**Kontekst prawny PL (do klauzul):**
- Kodeks karny art. 267 (nieuprawniony dostęp do informacji — granica etyczno-prawna projektów): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte lub oficjalne strony standardów. Brak źródeł pirackich (normy ISO linkowane do strony ISO, nie do kopii). Brak danych osobowych — scenariusze do ćwiczeń są fikcyjne (organizacja i ryzyka wymyślone). Każdy projekt dostaje klauzulę poufności rejestru (dokument = mapa słabości; nie tworzyć z niego materiału ofensywnego ani nie odnosić do realnej cudzej organizacji). Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów ds. ryzyka/GRC na rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research mylił ryzyko z zagrożeniem.** Pierwsza wersja pozwalała wpisywać do rejestru „ransomware" jako ryzyko. CISO: „junior, który nie umie zamienić zagrożenia w zdanie skutkowe, produkuje rejestr-śmietnik, który muszę przepisać". **Poprawka:** wyniosłam to do niuansu #1 i osadziłam w L1 (rejestr jako zdania skutkowe) oraz w projekcie P1; rozdzielenie aktywo/zagrożenie/podatność jest teraz fundamentem L1, nie detalem.

2. **Słabość: brak rozdziału „zgodność ≠ bezpieczeństwo".** CISO: „najgorszy junior to ten, który myśli, że certyfikat ISO znaczy «bezpieczni» — uśpi mi zarząd". **Poprawka:** dodałam niuans #3 jako jeden z głównych rozdzielników amator↔zawodowiec i jawnie wskazałam, że pełne domknięcie tej pułapki należy do researchu GRC (osobny plik) — tu kładę fundament, nie powtarzam.

3. **Słabość: ryzyko stron trzecich pominięte.** CISO: „dziś połowa moich incydentów wchodzi przez dostawcę — junior, który ocenia tylko własne systemy, jest ślepy na największy wektor". **Poprawka:** dodałam niuans #6, osobny projekt L3 (P8 — ocena ryzyka dostawcy) i wpisałam ryzyko łańcucha dostaw do prerekwizytów rozumienia aktywów.

4. **Słabość: ocena ryzyka bez kotwicy w uznanej metodzie.** Pierwsza wersja uczyła „autorskiej" oceny. CISO: „autorska metoda jest dla audytora bezwartościowa — chcę juniora, który powie «prowadzę wg NIST 800-30»". **Poprawka:** dodałam niuans #11, przeniosłam mapowanie na NIST 800-30 / ISO 27005 i powiązanie z ISO 27001 zał. A / NIST CSF do twardego zakresu L3 (P6, P7), z darmowym NIST jako nośnikiem nauki (§7).

5. **Słabość: ryzyko opisane technicznie, nie biznesowo.** CISO: „analityk, który przynosi mi CVE zamiast złotówek i dni przestoju, nie dostanie ode mnie decyzji ani awansu". **Poprawka:** dodałam niuans #8 (język zarządu) i osobny projekt L3 (P9 — streszczenie dla zarządu); zaznaczyłam też, że apetyt na ryzyko ustala biznes, nie analityk (niuans #10) — to dyscyplina roli, którą junior najczęściej przekracza.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Risk Management, aktywo/threat/vulnerability, impact, rejestr ryzyk/risk register, macierz prawdopodobieństwo × skutek, apetyt na ryzyko/risk appetite/tolerance, ryzyko nieodłączne/szczątkowe, inherent/residual risk, control, risk treatment, third-party/supply-chain risk, NIST SP 800-30/37/39, NIST CSF, ISO 27005/27001/31000, FAIR, ALE, KRI, DPIA, NIS2, DORA, RODO, CISO). Polskie nazwy tam, gdzie nie tracą precyzji (postępowanie z ryzykiem, ocena, identyfikacja).

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony dla roli młodszego analityka ryzyka, jeśli autoring domknie wszystkie 9 projektów L1–L3 z niuansami #1–#11. Niuanse pełnej zawodowości (#2 kontekstualizacja w skali, ryzyko ilościowe, program ryzyka, konflikt z biznesem) wymagają L4/L5 — research je zapowiada, ale „seniorska" biegłość domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). Niuans #3 (zgodność ≠ bezpieczeństwo) i integracja z ładem należą do researchu GRC. To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
