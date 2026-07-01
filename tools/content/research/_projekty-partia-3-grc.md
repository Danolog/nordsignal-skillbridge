# Dossier źródeł — partia 3: klaster „Audyt, ryzyko i zgodność (GRC)"

> **Status:** dossier źródeł do slate 3 projektów (zadanie E3 „domknięcie cyber"), wg kanonu `tools/content/README-cyber-projects.md` i wzorca jakości `tools/content/cyber-projects-partia-2.json` (8 projektów SIEM).
> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner) w parze z researcherem źródeł
> **Ścieżka:** Cybersecurity Specialist · **grupa:** „Audyt, ryzyko i zgodność (GRC)" (`unionShare` 13,7%)
> **Recenzja przed autoringiem `theory_md`:** Ryan (rzetelność / RODO / legalność źródeł) → Ethan/Leo (dosłowne liście `career-model.ts`, kontrakt narzędzia).
> **Zasada nadrzędna:** projekty GRC są **dokumentowo-analityczne** (rejestry, macierze, ramy, mapowania) — „wejście do cyber bez głębokiego kodu". Zero cudzej infrastruktury, zero cudzych danych; wyłącznie publiczne normy/regulacje + fikcyjne organizacje i dane syntetyczne.

---

## 0. Reguła pokrycia — jak 3 projekty domykają 6 liści klastra

Klaster ma 6 liści koncepcyjnych (`kind: concept`): **Risk Management · NIST · GRC · ISO 27001 · RODO / GDPR · DORA**. Slate to **3 projekty** (nie pełne pokrycie per liść — to „domknięcie", lekka warstwa spinająca cały klaster), z mixem poziomów L1 → L3 (fundament niżej, portfolio wyżej). Każdy ważny liść trafia do co najmniej jednego projektu przez `required` **lub** `acquired`:

| Liść klastra | Projekt (rola) | Poziom |
|---|---|---|
| Risk Management | P1 `required`; P2/P3 `acquired` | L1 |
| GRC | P2 `required`; P3 `acquired` | L2 |
| ISO 27001 | P2 `required`; P3 `acquired` | L2 |
| RODO / GDPR | P2 `required` | L2 |
| NIST | P3 `required` | L3 |
| DORA | P3 `required` | L3 |

Łańcuch dojrzałości: **P1 (język ryzyka, rejestr)** → **P2 (integracja: jeden control ↔ wiele wymogów)** → **P3 (regulacja finansowa DORA zakotwiczona w ramach NIST)**. Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy — Risk Management jest prerekwizytem integracji (P2), a integracja i ramy są prerekwizytem stosowania regulacji sektorowej (P3).

---

## P1 — `cyber-grc-rejestr-ryzyk-skala` (L1, 5 h)

**Tytuł roboczy:** „GRC od zera: pierwszy rejestr ryzyk i skala oceny z definicją stopni"

**Koncept.** Student bierze opis fikcyjnej małej organizacji (np. sklep internetowy z danymi klientów) i buduje **rejestr ryzyk** (risk register — żywa lista zidentyfikowanych ryzyk z oceną, właścicielem i statusem): 8–10 ryzyk zapisanych jako *zdania skutkowe* (zdarzenie → ścieżka → skutek), z poprawnym rozdzieleniem aktywa / zagrożenia / podatności, oraz **skalę prawdopodobieństwa i skutku z twardo zdefiniowanym znaczeniem każdego stopnia**. Oddaje repozytorium z rejestrem (arkusz/CSV/Markdown) i krótkim opisem metody — nie żywy system. Fundament pojęciowy całego klastra: norma (ISO 27001), ramy (NIST) i regulacje (RODO, DORA) operują językiem ryzyka, więc ten projekt idzie pierwszy.

**Źródło główne (`sourceType: open_data`).**
- **NIST SP 800-30 Rev. 1 „Guide for Conducting Risk Assessments"** — https://csrc.nist.gov/pubs/sp/800/30/r1/final
  Zweryfikowane 2026-07-01 (WebFetch): tytuł się zgadza, PDF darmowy pod https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf, dokument rządu USA w **domenie publicznej**.

**Uzasadnienie legalności.** Publikacje NIST są w domenie publicznej (dokument rządu federalnego USA — brak ograniczeń kopiowania; atrybucja jako dobra praktyka). Scenariusz organizacji i wszystkie ryzyka są **fikcyjne/wymyślone** — student nie opisuje realnej cudzej firmy (rejestr ryzyk = mapa słabości organizacji, dokument poufny). **Potrzebna klauzula:** etyczno-prawna (art. 267 KK — nieuprawniony dostęp do informacji) **wzmocniona o poufność rejestru** (nie tworzyć z niego materiału ofensywnego, nie odnosić do realnej organizacji). Brak danych osobowych realnych osób.

**Prerekwizyty (`acquired`).** `Linux` i `Active Directory` — pojęcie systemu i tożsamości jako *aktywa*, które organizacja chroni (z partii 1: `cyber-hardening-linux-bash`, `cyber-iam-active-directory-lab`). Bez pojęcia „co organizacja ma do ochrony" student nie wypełni kolumny „aktywo".

**Szkic rubryki (suma wag = 100):**
1. Rozdzielenie aktywo / zagrożenie / podatność (25) — każde ryzyko ma poprawnie rozdzielone trzy składniki, nie jednowyrazowy straszak.
2. Ryzyka jako zdania skutkowe (25) — 8–10 ryzyk zapisanych jako zdarzenie → ścieżka → skutek dla *tej* organizacji (kontekstualizacja, nie generyczna lista z internetu).
3. Skala z definicją stopni (25) — prawdopodobieństwo i skutek w skali (np. 1–5) z jawnym opisem znaczenia każdego stopnia; ocena ryzyk wg tej skali.
4. Właściciel i status (15) — każde ryzyko ma wskazanego właściciela i status; rejestr jako dokument żywy, nie zdjęcie.
5. Odtwarzalność, poufność i etyka (10) — README z metodą i atrybucją NIST 800-30; klauzula etyczno-prawna + nota poufności rejestru.

---

## P2 — `cyber-grc-macierz-zabezpieczen-iso-rodo` (L2, 12 h)

**Tytuł roboczy:** „Macierz zabezpieczeń GRC: jeden control, wiele wymogów (ISO 27001 + RODO)"

**Koncept.** Sedno zintegrowanego GRC: student buduje **macierz zabezpieczeń** (control matrix), w której pojedynczy mechanizm kontrolny (control — środek redukujący ryzyko) jest raz opisany, a podpięty jednocześnie pod **ryzyko** (z rejestru z P1), **wymóg normy** (ISO/IEC 27001, Załącznik A — konceptualnie, bez reprodukcji tekstu) *oraz* **wymóg regulacji** (konkretny artykuł RODO, np. art. 32 — bezpieczeństwo przetwarzania). Pokazuje co najmniej jeden control pokrywający wiele wymogów naraz (one-to-many, np. uwierzytelnianie wieloskładnikowe spełnia i RODO, i ISO 27001), odróżnia „mamy politykę" od „control działa" (dowód zgodności) i przeprowadza analizę luki. Oddaje repozytorium z macierzą + notą decyzji mapowania. Domyka rdzeń GRC: integracja i jedno źródło prawdy zamiast trzech silosów.

**Źródło główne (`sourceType: open_data`).**
- **NIST SP 800-53 Rev. 5 „Security and Privacy Controls"** — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
  Zweryfikowane 2026-07-01 (WebFetch): tytuł się zgadza, PDF darmowy (nvlpubs.nist.gov / DOI 10.6028/NIST.SP.800-53r5), domena publiczna. To **darmowy katalog kontroli**, z którego student czerpie konkretne zabezpieczenia do macierzy.

**Źródła wspierające (`source_links` / `learning_resources`):**
- RODO — pełny tekst, Rozporządzenie (UE) 2016/679 (EUR-Lex, wersja PL): https://eur-lex.europa.eu/eli/reg/2016/679/oj (oficjalny, darmowy — źródło wymogów regulacyjnych, m.in. art. 32).
- ISO — oficjalna strona normy ISO/IEC 27001 (opis, zakres; **pełny tekst płatny**): https://www.iso.org/standard/27001
- ISO/IEC 27000 „Overview and vocabulary" — jedyna norma rodziny 27k **darmowa** oficjalnie (słownik pojęć): https://www.iso.org/standard/73906.html
- Secure Controls Framework (SCF) — otwarty katalog kontroli z gotowymi mapowaniami między ramami: https://securecontrolsframework.com/
- NIST CSF — Informative References / crosswalk (mapowania między ramami): https://www.nist.gov/cyberframework/informative-references

**Uzasadnienie legalności.** Główny katalog kontroli (NIST 800-53) i tekst RODO (EUR-Lex) są **oficjalne i darmowe**. **Kluczowe ograniczenie:** pełny tekst normy ISO/IEC 27001 (i 27002) jest **płatny i objęty prawem autorskim ISO — projekt NIE reprodukuje ani nie cytuje obszernie jego treści**; uczymy *o* strukturze normy (klauzule 4–10 vs Załącznik A, cztery tematy) na podstawie oficjalnego opisu ISO i słownika ISO/IEC 27000, a konkretne zabezpieczenia bierzemy z darmowego 800-53 / SCF. Organizacja i dane fikcyjne. **Potrzebna klauzula:** etyczno-prawna (art. 267 KK) + poufność dokumentacji GRC (macierz/luki = mapa słabości) + **nota licencyjna ISO** (zakaz reprodukcji tekstu normy). Dane osobowe w przykładach wyłącznie fikcyjne/syntetyczne.

**Prerekwizyty (`acquired`).** `Risk Management` — macierz zabezpieczeń stoi na rejestrze ryzyk z P1 (litera „R" w GRC); bez pojęcia ryzyka student nie podepnie controlu pod ryzyko.

**Szkic rubryki (suma wag = 100):**
1. Macierz control ↔ ryzyko ↔ wymóg (30) — każdy control powiązany z ryzykiem (z rejestru) i z co najmniej jednym wymogiem normy/regulacji; tabela spójna, nie luźna lista.
2. Mapowanie jednego controlu na wiele wymogów (20) — co najmniej jeden control jawnie podpięty pod wymóg RODO *i* ISO 27001 naraz (one-to-many) z uzasadnieniem — dowód dojrzałości integracji.
3. Dowód zgodności vs deklaracja (20) — dla wybranych kontroli wskazany *dowód* działania (zrzut konfiguracji, log, zapis przeglądu), a nie tylko „istnieje polityka"; jawne odróżnienie papieru od skuteczności.
4. Analiza luki z priorytetem (15) — wskazanie wymogów jeszcze niespełnionych, uszeregowanych wg ryzyka (nie wg kosztu/wygody); luka nazwana, nie zamieciona.
5. Legalność, poufność i odtwarzalność (15) — README z atrybucją NIST/RODO, **notą o zakazie reprodukcji tekstu ISO**, klauzulą etyczno-prawną i notą poufności; dane fikcyjne.

---

## P3 — `cyber-grc-dora-ramy-ryzyka-ict-nist-csf` (L3, 22 h)

**Tytuł roboczy:** „DORA w praktyce: ramy zarządzania ryzykiem ICT dla instytucji finansowej zakotwiczone w NIST CSF"

**Koncept.** Portfolio na rozmowę o pracę w ryzyku ICT banku/ubezpieczyciela. Student bierze **fikcyjną instytucję finansową** i opracowuje trzy powiązane artefakty DORA (Rozporządzenie UE 2022/2554, obowiązuje od 17.01.2025): **(a)** ramy zarządzania ryzykiem ICT (filar 1) z mapą funkcji krytycznych i przypisaniem odpowiedzialności (w tym rolą zarządu), **zakotwiczone w funkcjach NIST CSF 2.0** (Govern/Identify/Protect/Detect/Respond/Recover) jako wspólnym języku kontroli — jeden zestaw zabezpieczeń mapowany na wymóg DORA *i* na ramy NIST; **(b)** wpis do **rejestru informacji o dostawcach ICT** (filar 4) dla dostawcy chmury, czytany jako mapa uzależnień (ryzyko koncentracji, plan wyjścia); **(c)** klasyfikację zadanego incydentu ICT (filar 2) wg kryteriów wagi z terminami zgłoszenia do KNF. Pokazuje, że DORA to *lex specialis* wobec NIS2 dla finansów i gdzie styka się z RODO (dwa zegary przy incydencie z danymi osobowymi). Wszystko na fikcyjnej instytucji i danych syntetycznych.

**Źródło główne (`sourceType: open_data`).**
- **DORA — Rozporządzenie (UE) 2022/2554** (EUR-Lex, wersja PL): https://eur-lex.europa.eu/eli/reg/2022/2554/oj
  Zweryfikowane 2026-07-01 (WebFetch): to Regulation (EU) 2022/2554 (DORA), opublikowane w Dz.U. UE L 333/1, dostępne publicznie w 24 językach (HTML/PDF/tekst), status „In force".

**Źródła wspierające (`source_links` / `learning_resources`):**
- NIST Cybersecurity Framework 2.0 (funkcje, w tym Govern; darmowy, domena publiczna): https://www.nist.gov/cyberframework
- NIST CSF 2.0 — dokument CSWP 29: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
- KNF — komunikaty i materiały o DORA (polski organ nadzoru): https://www.knf.gov.pl/
- ESAs (EBA/EIOPA/ESMA) — standardy RTS/ITS DORA, m.in. wzór rejestru informacji: https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en
- Dyrektywa NIS2 (UE) 2022/2555 (dla rozróżnienia lex specialis): https://eur-lex.europa.eu/eli/dir/2022/2555/oj
- Generator danych fikcyjnych Faker (syntetyczne instytucje/dostawcy — nigdy realne dane): https://faker.readthedocs.io/

**Uzasadnienie legalności.** Tekst DORA i NIS2 (EUR-Lex), NIST CSF 2.0 (domena publiczna) i materiały KNF/ESAs są **oficjalne i darmowe**. Instytucja, dostawcy i incydent są **fikcyjne/syntetyczne** — student nie używa realnych danych żadnej instytucji finansowej ani osób (rejestr dostawców i ramy ryzyka = mapa uzależnień i słabości, dokument poufny). **Potrzebna klauzula:** etyczno-prawna (art. 267 KK) w wariancie „pracujesz na fikcyjnej instytucji i danych syntetycznych — żadnych realnych danych instytucji ani osób" + nota, że sama DORA mówi „co", a progi/format rejestru precyzują RTS/ITS i komunikaty KNF (nie cytować DORA jako kompletu). Brak reprodukcji treści płatnych norm.

**Prerekwizyty (`acquired`).** `Risk Management` (ramy ryzyka ICT stoją na pojęciu ryzyka), `GRC` (integracja i mapowanie wymóg→control z P2), `ISO 27001` (pojęcie kontroli/zabezpieczenia i systemu zarządzania jako materiał, na który mapuje się DORA). To domknięcie łańcucha klastra: regulacja sektorowa stosuje wszystko wcześniejsze.

**Szkic rubryki (suma wag = 100):**
1. Ramy ryzyka ICT z mapą funkcji krytycznych (25) — dokument ram (filar 1) z identyfikacją funkcji krytycznych, mapowaniem zasobów ICT i odpowiedzialnością zarządu; zaczyna od „co jest krytyczne i co je wywróci", nie od polityk.
2. Zakotwiczenie w NIST CSF (20) — zabezpieczenia zmapowane na funkcje NIST CSF 2.0; pokazanie jednego zestawu kontroli obsługującego wymóg DORA i ramy NIST (crosswalk), z funkcją Govern uwzględnioną.
3. Rejestr informacji o dostawcach ICT jako mapa uzależnień (20) — wpis rejestru (filar 4) dla dostawcy chmury; jawne wskazanie zależności krytycznej, ryzyka koncentracji i realności planu wyjścia (nie klauzula, lecz wykonalność).
4. Klasyfikacja incydentu + terminy i styki (20) — ocena incydentu wg kryteriów wagi (poważny czy nie), terminy zgłoszenia do KNF, rozróżnienie DORA vs NIS2 (lex specialis) i styk z RODO (dwa zegary, gdy dane osobowe).
5. Legalność, poufność i odtwarzalność (15) — README z atrybucją DORA/NIST/KNF, notą o warstwie RTS/ITS, klauzulą etyczno-prawną i poufności; fikcyjna instytucja i dane syntetyczne.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w dyrektora bezpieczeństwa (CISO), który zatrudnia juniorów GRC / ryzyka ICT w EU i ocenia, czy 3-projektowe „domknięcie" klastra realnie przygotowuje kandydata. Pięć słabości pierwszego szkicu i poprawki:

1. **Słabość: 3 projekty groziły płytkim „liźnięciem" 6 liści.** CISO: „lepiej trzy głębokie niż sześć powierzchownych". **Poprawka:** świadomie łączę liście w projekty integrujące (P2 spina GRC+ISO+RODO przez macierz, P3 spina DORA+NIST przez ramy), zamiast robić po pół projektu na liść — to odzwierciedla realną pracę (jeden control ↔ wiele wymogów), nie sztuczny podział.
2. **Słabość: ryzyko reprodukcji płatnej normy ISO.** CISO/legalność: „nie wolno wkleić Załącznika A". **Poprawka:** twarda nota licencyjna w P2 — uczymy struktury ISO na darmowym opisie + słowniku ISO/IEC 27000, kontrole bierzemy z darmowego NIST 800-53; zakaz reprodukcji w rubryce (kryterium 5) i klauzuli.
3. **Słabość: „zgodność = bezpieczeństwo" i papier zamiast dowodu.** CISO: „junior z certyfikatem w głowie uśpi zarząd". **Poprawka:** P2 kryterium 3 wymaga *dowodu* działania controlu, nie deklaracji; P3 traktuje plan wyjścia jako wykonalność, nie klauzulę — rozdzielnik amator↔zawodowiec wpisany w rubryki.
4. **Słabość: DORA jako wiedza książkowa, nie proces.** CISO: „rejestr dostawców to nie tabelka, to mapa, od kogo padniemy". **Poprawka:** P3 czyta rejestr jako ryzyko koncentracji + plan wyjścia, klasyfikację incydentu wiąże z terminami KNF i stykiem RODO (dwa zegary) — proces, nie definicja.
5. **Słabość: brak jawnego łańcucha dojrzałości.** CISO: „skąd wiem, że L1 przygotowuje do L3?". **Poprawka:** §0 pokazuje łańcuch P1→P2→P3 (język ryzyka → integracja → regulacja sektorowa) i tabelę pokrycia; Risk Management jest `acquired` w P2/P3, GRC/ISO w P3 — zależności jawne.

**Tłumaczenie żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty po polsku przy pierwszym użyciu (rejestr ryzyk/risk register, aktywo/zagrożenie/podatność, control/mechanizm kontrolny, macierz zabezpieczeń/control matrix, one-to-many, dowód zgodności/evidence, analiza luki/gap analysis, ICT, DORA, NIST CSF, lex specialis, RTS/ITS, KNF, ryzyko koncentracji, plan wyjścia, funkcje krytyczne). Skróty rozwinięte, polskie nazwy tam, gdzie nie tracą precyzji.

**Poprzeczka zawodowa (North Star §0.1):** te 3 projekty to **domknięcie** (lekka warstwa spinająca klaster), nie pełne pokrycie L1–L3 per liść — pełne pule (8–9 projektów na liść) są w researchach `risk-management.md`, `nist.md`, `grc.md`, `iso-27001.md`, `rodo-gdpr.md`, `dora.md`. Slate daje kandydatowi spójny przekrój: język ryzyka (P1), integracja zgodności (P2), regulacja finansowa (P3) — wystarczający jako reprezentacja klastra w marketplace, uczciwie oznaczony jako przekrój, nie komplet.
