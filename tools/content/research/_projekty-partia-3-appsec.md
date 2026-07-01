# Dossier źródeł — partia 3: projekty AppSec (domknięcie cyber)

> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł
> **Zadanie:** E3 „domknięcie cyber" — slate 2 projektów dla klastra „Bezpieczeństwo aplikacji (AppSec)" ścieżki Cybersecurity Specialist.
> **Liście do pokrycia:** OWASP, SAST, DAST, SCA (`career-model.ts`, grupa „Bezpieczeństwo aplikacji (AppSec)").
> **Kontekst klastra:** OWASP Top 10 (dziesięć najczęstszych dziur aplikacji webowych) + skanery. Praca **wyłącznie na celowo podatnej, treningowej aplikacji** (OWASP Juice Shop / DVWA), nigdy na cudzej. Klauzula etyczno-prawna obowiązkowa.
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — testowanie tylko aplikacji własnych/celowo podatnych, art. 267 KK) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`).
> **Źródła teorii:** `owasp.md` (rdzeń), `sast.md`, `dast.md`, `sca.md`. Golden-example jakości: `cyber-projects-partia-2.json` (8 projektów SIEM).

---

## 0. Decyzja o pokryciu i poziomach

Klaster ma **4 liście** (OWASP — `concept`; SAST, DAST, SCA — `tool`) i **0 istniejących projektów**. Slate ma je domknąć **dwoma** projektami. Reguła pokrycia: każdy ważny liść trafia do co najmniej jednego projektu przez `required` lub `acquired`.

| Liść | Projekt 1 (L2) | Projekt 2 (L3) |
|---|---|---|
| **OWASP** | `required` | `acquired` |
| **SAST** | — | `required` |
| **DAST** | — | `required` |
| **SCA** | — | `required` |

Wszystkie 4 liście pokryte. Rozkład poziomów: **L2 (fundament) → L3 (portfolio)**. Uzasadnienie mixu: klaster zakłada opanowane prerekwizyty z partii 1 (HTTP, `Python`, `SQL`, `IAM`/`Active Directory`), więc fundament startuje od L2 (mechanizm + naprawa dziury), a nie od czystej obserwacji L1. Projekt L3 nadbudowuje narzędziowo (trzy skanery na jednej aplikacji) — poziom „portfolio na rozmowę o pracę". Architektura teorii z `owasp.md`: OWASP to rdzeń, narzędzia (SAST/DAST/SCA) są pochodną — stąd OWASP pierwszy (P1), skanery drugie (P2, z OWASP jako `acquired`).

Świadome zawężenie: pełne pokrycie L1–L3 z researchy sugerowało ~7 projektów OWASP + po ~4 na narzędzie. Zadanie „domknięcie cyber" celowo dostarcza **minimalny, spójny slate 2 projektów**, który dotyka wszystkich 4 liści i daje studentowi kompletny łuk „rozumiem dziurę ręcznie → czytam trzy skanery i koreluję". Głębia L4/L5 (korelacja w skali produkcyjnej, secure SDLC) zostaje na przyszłość — zależna od struktury L4/L5 (Ethan/Leo).

---

## 1. Projekt 1 — `cyber-owasp-juice-shop-dziura-naprawa` (L2)

**Tytuł:** OWASP na Juice Shop: od dziury do naprawy i pierwszy triage

**Koncept.** Na celowo podatnej aplikacji OWASP Juice Shop (otwarta, przeznaczona do nauki) student odtwarza 4–5 kategorii OWASP Top 10 (wstrzyknięcie SQL, XSS, zepsuta kontrola dostępu, błędna konfiguracja), dla każdej opisuje mechanizm, **naprawia klasę dziury w kodzie** (zapytania parametryzowane, kodowanie wyjścia, kontrola dostępu na serwerze) i przypisuje kategorię + numer CWE. Sednem nie jest eksploatacja, lecz naprawa i pierwszy świadomy triage — odróżnienie realnej dziury od fałszywego alarmu przez ocenę osiągalności. Oddaje repozytorium z dowodami przed/po i krótki raport, nie żywą sesję laba.

**Źródło.** OWASP Juice Shop — `sourceType: oss`.
- Główny URL: https://github.com/juice-shop/juice-shop (zweryfikowany 2026-07-01: repo istnieje, licencja **MIT**).
- Strona projektu: https://owasp.org/www-project-juice-shop/ (zweryfikowana: „najbardziej nowoczesna niezabezpieczona aplikacja webowa" do treningu, CTF i testów narzędzi).
- Alternatywa (kopia zapasowa): DVWA — https://github.com/digininja/DVWA.

**Uzasadnienie legalności.** Juice Shop jest **celowo podatną** aplikacją open source (MIT), zaprojektowaną i utrzymywaną przez OWASP wprost do legalnego ćwiczenia bezpieczeństwa. Student uruchamia ją **lokalnie na własnej maszynie** — nie dotyka żadnej cudzej infrastruktury. Klauzula etyczno-prawna **obowiązkowa** (art. 267 KK — nieautoryzowany dostęp do cudzego systemu to przestępstwo; tu nie zachodzi, bo aplikacja jest własna/treningowa). Dane testowe bez prawdziwych danych osobowych (RODO, minimalizacja); adresy IP w przykładach maskowane. Atrybucja licencji MIT + projektu OWASP w README.

**Prerekwizyty (łańcuch z partii 1 i researchy).**
- Podstawy HTTP (żądanie/odpowiedź, parametry, ciastka, sesje) — częściowo z `Network`/`TCP/IP`. Wymagane przed L2.
- `Python` (czytanie kodu i naprawy) — projekt `cyber-python-automatyzacja-logow` (partia 1). `acquired`.
- `SQL` (zrozumienie wstrzyknięcia SQL) — liść `SQL`. `acquired`.
- `IAM`/`Active Directory` (pojęcie roli i uprawnienia — kategoria „zepsuta kontrola dostępu") — projekt `cyber-iam-active-directory-lab` (partia 1). Kontekst.
- Klauzula etyczno-prawna — od pierwszego kroku.

**Szkic rubryki (suma = 100):**
| Kryterium | Waga | Dowód |
|---|---|---|
| Odtworzenie dziury na własnym labie + przypisanie do Top 10 i CWE | 25 | zrzut/log dla 4–5 kategorii + tabela kategoria→CWE |
| Mechanizm dziury opisany własnymi słowami (jakie założenie programista złamał) | 15 | akapit per kategoria, rozumienie nie definicja |
| Naprawa klasy, nie objawu (parametryzacja / kodowanie wyjścia / kontrola dostępu na serwerze) + dowód | 30 | diff kodu + dowód, że dziura znika po naprawie |
| Triage: realna dziura vs fałszywy alarm z uzasadnieniem osiągalności | 20 | dla wybranych znalezisk ocena TP/FP z kontekstem |
| Odtwarzalność, RODO i etyka | 10 | README: kroki, atrybucja MIT/OWASP, maskowanie IP, klauzula |

**Niuanse z `owasp.md` do wpisania w `theory_md`:** #1 (Top 10 to świadomość, nie checklista), #2 (realna dziura vs fałszywy alarm — sedno zawodu), #4 (naprawiaj klasę, nie objaw), #6 (łańcuch Top 10→CWE→CVE), #8 (kontrola po stronie klienta to nie zabezpieczenie).

**Materiały (`learning_resources`) — wszystkie zweryfikowane:**
- OWASP Top 10 (kategorie dziur): https://owasp.org/www-project-top-ten/ · docs
- OWASP Cheat Sheet Series (recepty naprawcze): https://cheatsheetseries.owasp.org/ · docs
- OWASP Juice Shop (aplikacja treningowa): https://owasp.org/www-project-juice-shop/ · docs
- MITRE CWE (katalog typów słabości): https://cwe.mitre.org/ · docs

---

## 2. Projekt 2 — `cyber-appsec-trzy-skanery-sast-dast-sca` (L3)

**Tytuł:** Ocena bezpieczeństwa aplikacji: SAST, DAST i SCA na jednej aplikacji

**Koncept.** Na tej samej celowo podatnej aplikacji (OWASP Juice Shop, uruchomionej lokalnie) student uruchamia **trzy komplementarne skanery**: statyczny (SAST — Semgrep/Bandit, analiza kodu), dynamiczny (DAST — OWASP ZAP, skan pasywny + aktywny + **uwierzytelniony** działającej aplikacji) i skład oprogramowania (SCA — OWASP Dependency-Check/Trivy, podatne zależności + CVE). Sednem jest **korelacja** — złożenie znalezisk z trzech źródeł w jeden raport z usunięciem duplikatów, rozstrzygnięciem sprzeczności, triage realna dziura vs fałszywy alarm i **jawnym nazwaniem, czego każde narzędzie z definicji nie widzi** (SAST — czas działania i zależności; DAST — linia kodu; SCA — własny kod). Oddaje repozytorium z trzema skanami, raportem korelacji i priorytetami.

**Źródło.** OWASP Juice Shop jako cel skanu — `sourceType: oss`.
- Główny URL: https://github.com/juice-shop/juice-shop (zweryfikowany, MIT).
- Narzędzia (darmowe/otwarte, zweryfikowane 2026-07-01): Semgrep — https://docs.semgrep.dev/ · OWASP ZAP — https://www.zaproxy.org/docs/ · OWASP Dependency-Check — https://owasp.org/www-project-dependency-check/ · Trivy — https://trivy.dev/latest/docs/.

**Uzasadnienie legalności — punkt newralgiczny grupy.** DAST ma **najostrzejszą granicę prawną**: skan **aktywny** to realne wysyłanie ataków (ładunków) do aplikacji. Dozwolony **wyłącznie na aplikacji własnej/celowo podatnej uruchomionej lokalnie** — Juice Shop spełnia to wprost (open source MIT, celowo podatna, na własnej maszynie). Klauzula etyczno-prawna **obowiązkowa i wzmocniona**: (a) jawne rozdzielenie skanu pasywnego (bezpieczny) od aktywnego (atakujący); (b) zakaz kierowania skanu na jakikolwiek adres publiczny/cudzy (art. 267 KK); (c) skan aktywny bywa destrukcyjny — nigdy na produkcji ani cudzym systemie. SAST/SCA analizują **kod własny/otwarty** (Juice Shop) — bez cudzego prywatnego kodu. Wyniki SAST mogą ujawniać sekrety zaszyte w kodzie — traktowane jak dane wrażliwe (nie publikujemy surowych raportów z sekretami). Adresy IP maskowane, brak prawdziwych danych osobowych (RODO). Atrybucja MIT/OWASP + narzędzi w README.

**Prerekwizyty.**
- **OWASP** (rdzeń teorii — Projekt 1) — bezwzględnie wymagany: bez rozumienia dziury student „naprawia, co podświetlił skaner". `acquired`.
- `CI/CD` (pojęcie potoku — kontekst wpięcia skanów; na L3 opcjonalnie jako brama) — liść `CI/CD`. `acquired`.
- Podstawy HTTP/sesji (skan uwierzytelniony ZAP) — z `Network`/`TCP/IP` + `IAM` (partia 1). Kontekst.
- Klauzula etyczno-prawna wzmocniona (skan aktywny) — od pierwszego kroku.

**Szkic rubryki (suma = 100):**
| Kryterium | Waga | Dowód |
|---|---|---|
| Trzy skany uruchomione: SAST (kod) + DAST (pasywny + aktywny + uwierzytelniony) + SCA (zależności) | 25 | artefakty/logi trzech skanów na tej samej aplikacji |
| Korelacja znalezisk z trzech źródeł w jeden raport (dedup, sprzeczności) | 25 | tabela korelacji: to samo znalezisko z ≥2 źródeł / rozstrzygnięte sprzeczności |
| Triage TP/FP + osiągalność + jawne luki pokrycia każdego narzędzia | 25 | podział TP/FP z uzasadnieniem + akapit „czego każde narzędzie nie widzi" |
| Raport z priorytetami i dotkliwością z kontekstem biznesowym | 15 | kolejność napraw + dotkliwość skorygowana kontekstem (nie samo CVSS) |
| Etyka labu (skan aktywny tylko własny/celowo podatny), odtwarzalność, atrybucja | 10 | README: klauzula wzmocniona, kroki, atrybucja MIT/OWASP + narzędzi |

**Niuanse do wpisania w `theory_md`:** z `sast.md` #1/#2/#3 (SAST widzi kod nie rzeczywistość; fałszywe alarmy to cecha; fałszywy negatyw niewidzialny), z `dast.md` #1/#2/#3/#5 (DAST potwierdza wykorzystywalność; skan aktywny to atak — granica prawna; skan nieuwierzytelniony bezwartościowy; DAST też kłamie), z `sca.md` #1/#3/#5 (dziurę dziedziczysz; osiągalność oddziela realną dziurę od szumu; licencja to ryzyko prawne), z `owasp.md` #7 (CVSS ślepy na kontekst). `theory_md` zaczyna się od klauzuli etyczno-prawnej + klauzuli wzmocnionej dla skanu aktywnego (art. 267 KK; opcjonalnie art. 269a KK).

**Materiały (`learning_resources`) — wszystkie zweryfikowane:**
- Semgrep (SAST — analiza statyczna): https://docs.semgrep.dev/ · docs
- OWASP ZAP (DAST — skan działającej aplikacji): https://www.zaproxy.org/docs/ · docs
- OWASP Dependency-Check (SCA — analiza zależności): https://owasp.org/www-project-dependency-check/ · docs
- OWASP CycloneDX (standard SBOM — spis składników): https://cyclonedx.org/ · docs

---

## 3. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w dyrektora bezpieczeństwa zatrudniającego juniorów AppSec na rynku EU. Pięć słabości pierwszej wersji slate'u i poprawki:

1. **Słabość: 2 projekty groziły powierzchownością wobec 4 liści.** CISO: „nie chcę juniora, który klika trzy skanery i nie rozumie, co widzi". **Poprawka:** OWASP dostał osobny projekt L2 (rozumienie + naprawa dziury ręcznie), a projekt narzędziowy L3 ma OWASP jako twardy prerekwizyt (`acquired`) — łuk „najpierw ręcznie, potem skaner" zachowany, nie skrócony.

2. **Słabość: eksploatacja dla eksploatacji.** CISO: „potrzebuję kogoś, kto naprawia, nie kogoś, kto psuje Juice Shop". **Poprawka:** rubryka P1 waży naprawę klasy (30) wyżej niż odtworzenie dziury (25); niuans #4 z `owasp.md` w teorii.

3. **Słabość: granica prawna skanu aktywnego potraktowana jak w SIEM.** CISO: „skan aktywny to atak — junior, który puści go na cudzy serwis, idzie do prokuratury". **Poprawka:** P2 ma klauzulę **wzmocnioną** (rozdział pasywny/aktywny, zakaz adresu publicznego, art. 267 KK), a cel to wyłącznie lokalny Juice Shop. Rubryka nagradza jawne oddzielenie trybów.

4. **Słabość: skan nieuwierzytelniony jako pułapka juniora.** CISO: „90% juniorów puszcza DAST bez logowania i melduje «czysto»". **Poprawka:** rubryka P2 wymaga skanu **uwierzytelnionego** (nie tylko pasywnego) — inaczej kryterium „trzy skany" nie jest spełnione.

5. **Słabość: korelacja trzech źródeł to poziom L4 z researchy.** CISO: „nie przeceniaj L3". **Poprawka:** P2 na L3 ogranicza korelację do **jednego przebiegu każdego skanera na jednej aplikacji** (nie setki znalezisk w skali produkcyjnej — to L4). 26 h w widełkach L3 (18–30). Głębia produkcyjna jawnie odłożona na L4/L5 (§0).

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy skrót/termin rozwinięty po polsku przy pierwszym użyciu (OWASP Top 10, SAST/DAST/SCA, CWE, CVE, CVSS, XSS, wstrzyknięcie SQL, skan pasywny/aktywny/uwierzytelniony, ładunek, osiągalność, TP/FP, SBOM, CI/CD, art. 267/269a KK). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie legalności (Ryan):** oba projekty pracują wyłącznie na OWASP Juice Shop (open source MIT, celowo podatna, lokalnie) — zero cudzej infrastruktury/danych. Wszystkie URL zweryfikowane 2026-07-01 jako publiczne i darmowe. Klauzula etyczno-prawna obowiązkowa w obu; wzmocniona w P2 (skan aktywny).

---

## 4. Wynik do orkiestratora

Slate 2 projektów zwrócony jako struktura (schema E3) w wiadomości do orkiestratora. Ten plik = dossier źródeł (`sourcesDossierPath`).
