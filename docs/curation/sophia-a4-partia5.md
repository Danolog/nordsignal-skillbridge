# A4/A5 — PARTIA 5: ostatnie 3 ścieżki nie-patologiczne (Embedded/C++ · Solution Architect · Product Owner/Manager)

**Autor:** Sophia (Product Owner) · **Data:** 2026-06-27 · **Wzorzec:** partia 3 + 4 (`PATHS`, metoda surowy udział, kuracja ekspercka liści w grupy `context-group`; `countAsUnion: true` na każdym scaleniu, jawne override'y).
**Dane źródłowe:** `scratchpad/lift-partia5.json` (generator `tools/lift-candidates.ts`, zrzut JustJoinIT 2026, **9922 ofert / 54085 tech**, mianownik globalny po dedup — dane KANONICZNE, potwierdzone przez Leo w partii 3, zregenerowane 2026-06-27).
**Status:** spec gotowy do wpięcia przez Ethana do `src/lib/db/data/career-model.ts`. NIE edytowałam modelu, NIE commitowałam, pracuję READ-ONLY (równolegle Ethan wpina partię 4 na tej samej gałęzi `feat/etl-lift`).

## Decyzja Darka: domknąć wszystkie 3 nie-patologiczne naraz

Te trzy ścieżki oznaczyłam w partii 3–4 jako **cienkie/zaszumione, ale NIE patologiczne** — anchor (kotwica anchora = reguła dopasowania ofert do roli) łapie **właściwą** rolę, tylko danych mniej albo z większym szumem. Pomijamy 3 patologiczne (Python/PHP/Engineering Manager — czekają na osobną decyzję o repozycjonowaniu, anchor łapie tam INNĄ rolę niż nazwa obiecuje).

| Ścieżka | Ofert | Liści po bramce | Charakter | Rekomendacja |
|---|---|---|---|---|
| **Embedded / C++ Developer** | 188 | 40 | rdzeń mocny (C++ 77%, C 34%), szum gamedev (Scratch/Roblox/Unity/LUA) + przeciek mobile (Java/Kotlin) | **KURATOROWAĆ** — rdzeń wyrazisty, szum izolowany |
| **Solution Architect** | 81 | 18 | THIN + substrat senior-dev dominuje; architekt-konkrety (TOGAF/ArchiMate/DDD) poniżej bramki | **OZNACZYĆ „dane wstępne"** — kuratoruję uczciwie, ale flaguję cienkość |
| **Product Owner / Manager** | 269 | 51 | rdzeń OK (Product Management 35%, lift=32), szum: Analytical Thinking #1, AI 19%, przeciek tech | **KURATOROWAĆ** — z ostrożną definicją (AI flagowane) |

**Kluczowa weryfikacja (zlecona w prompt):** czy Solution Architect to czwarty patologiczny anchor jak Engineering Manager? **NIE — patrz Sygnał #1.** Różnica: u EngMgr `Architecture`/`Leadership` były spychane przez czysty dev (anchor łapił seniora-dewelopera). Tu **`Architecture` JEST #1 (45.7%)** i pojawiają się konkrety architekta (Enterprise Architect, TOGAF, ArchiMate, Event Streaming, ESB, DDD). Anchor łapie WŁAŚCIWĄ rolę — tylko cienko, a rdzeń-konkret architekta jest z natury niepoliczalny (architektura to doświadczenie + wzorce, nie zestaw narzędzi do odhaczenia). To kategoria „cienki", nie „patologiczny".

---

## Globalne decyzje kuracyjne (kontynuacja reguł partii 2–4)

1. **Łańcuch REST/API** — `REST API` + `REST` + nagie `API` + `RESTful API` scalone w jeden liść **`REST / API`** (`kind: "concept"`, `countAsUnion: true`). Oferta z dwoma napisami liczona RAZ.
2. **Chmury zawsze unią** — `AWS` + `Amazon AWS`; `Azure` + `Microsoft Azure` + `MS Azure`; `GCP` + `Google Cloud Platform`. Gołe `Cloud` = meta (wyklucz).
3. **`kind` z sensem** — `concept` dla wzorców/metodyk/notacji-jako-wiedzy (REST/API, Microservices, DDD, ETL, Event Streaming, Embedded Systems jako domena, Agile, Scrum, Kanban, Product Management, metodyki TOGAF/ArchiMate jako ramy); `tool` dla konkretnego oprogramowania/języka/sprzętu (C++, freeRTOS, Jira, Enterprise Architect, Kafka, WebLogic); `cert` osobno; soft-kompetencje rdzeniowe roli zarządczej oznaczam `concept` (rdzeń roli, nie dekoracja — precedens PM z partii 4).
4. **Gołe meta-hasła i nazwy ról** — `Architecture` (gołe), `product owner` (nazwa roli), `Embedded` (gołe vs `Embedded Systems`), `Cloud`, `AI`, `Backend`, `DevOps` jako gołe hasła → meta, do wykluczenia lub scalenia z konkretem.
5. **Override'y prowadzę jawną listą** — każde ręczne wykluczenie/scalenie/dołączenie-poniżej-bramki ma uzasadnienie dla Leo i kupującego.

> `unionShare` przy każdej grupie to **szacunek** (≈ udział ofert wymagających ≥1 liścia grupy, w praktyce ≥ udziału liścia czołowego). Ostateczną wartość **liczy silnik** z `type: "context-group"` — podaję jako sygnał kuracyjny, nie wpis do modelu (typ `AreaSpec` nie ma pola `unionShare`).

---

# 1. Embedded / C++ Developer

**188 ofert · 40 liści po bramce · rdzeń wyrazisty (C++ 76.6%, C 33.5%, Linux 31.9%).** 5 grup. **Szum izolowany do listy override'ów: gamedev (Scratch/Roblox/Unity/LUA) + przeciek mobile (Kotlin 12.8%, częściowo Java).**

### Grupa 1 — Języki systemowe (rdzeń) · `context-group` · unionShare ≈ 85% (szac.)
> **Opis:** Serce roli — języki, w których pisze się oprogramowanie blisko sprzętu, gdzie liczy się każdy bajt pamięci i mikrosekunda. C++ rządzi bezwzględnie (prawie 8 na 10 ofert), a czysty C (co trzecia oferta) to język sterowników i najmniejszych układów. Rust to nowocześniejszy język systemowy, który wchodzi tam, gdzie zależy nam na bezpieczeństwie pamięci bez utraty wydajności. To fundament, od którego zaczyna każdy junior embedded.

| Liść | kind | countAs | union |
|---|---|---|---|
| C++ | tool | — | — |
| C | tool | — | — |
| Rust | tool | — | — |

### Grupa 2 — Systemy wbudowane i sprzęt · `context-group` · unionShare ≈ 25% (szac.)
> **Opis:** To, co odróżnia embedded od „zwykłego" programowania w C++ — kod działa na fizycznym urządzeniu, nie na serwerze. Systemy wbudowane (embedded) to oprogramowanie zaszyte w sprzęcie: pralce, sterowniku samochodu, czujniku. freeRTOS i RTOS to systemy operacyjne czasu rzeczywistego (gwarantują reakcję w ściśle określonym czasie — krytyczne, gdy poduszka powietrzna ma się otworzyć w 20 milisekund). FPGA i VHDL to świat układów programowalnych (projektujesz sam obwód logiczny, nie tylko program), CMake składa projekt w gotowy plik wykonywalny.

| Liść | kind | countAs | union |
|---|---|---|---|
| Embedded Systems | concept | `["Embedded Systems", "Embedded"]` | **true** |
| freeRTOS | tool | — | — |
| RTOS | concept | — | — |
| FPGA | tool | — | — |
| VHDL | tool | — | — |
| CMake | tool | — | — |

*Uzasadnienie:* `Embedded` (gołe, 5.3%) + `Embedded Systems` (4.8%) scalone unią → jeden liść jako nazwa domeny (`concept` — wiedza dziedzinowa, nie narzędzie). RTOS = kategoria (`concept`, system czasu rzeczywistego jako pojęcie), freeRTOS = konkretna implementacja (`tool`) — osobne liście, bo student widzi obie nazwy w ofertach (wzorzec JPA/Hibernate z partii 3).

### Grupa 3 — Linux niskopoziomowy i warsztat systemowy · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Embedded i C++ niemal zawsze żyją na Linuksie — to system, na którym kompilujesz, debugujesz i często który sam wgrywasz na urządzenie. Linux (co trzecia oferta) i jego jądro (Linux Kernel — najgłębsza warstwa, którą embedded dev czasem modyfikuje pod konkretny sprzęt) to rdzeń warsztatu. Bash automatyzuje powtarzalne komendy, administracja systemami i sieci pojawiają się tam, gdzie urządzenie musi działać w infrastrukturze. Git trzyma historię zmian w kodzie.

| Liść | kind | countAs | union |
|---|---|---|---|
| Linux | tool | — | — |
| Linux Kernel | tool | — | — |
| Bash | tool | — | — |
| administracja systemami | tool | — | — |
| sieci | tool | — | — |
| Git | tool | — | — |

### Grupa 4 — Skrypty, automatyzacja i testy · `context-group` · unionShare ≈ 42% (szac.)
> **Opis:** Wbrew stereotypowi „embedded to tylko C", **Python jest drugim najsilniejszym sygnałem roli (41.5% ofert)** — nie do produkcyjnego kodu na urządzeniu, lecz do narzędzi: skryptów budujących, automatyzacji testów (program, który sam sprawdza, czy układ reaguje poprawnie) i analizy danych z czujników. To uczciwy obraz rynku 2026: junior embedded w PL realnie potrzebuje Pythona obok C++.

| Liść | kind | countAs | union |
|---|---|---|---|
| Python | tool | — | — |

*Uzasadnienie wydzielenia:* Python (41.5%, drugi sygnał roli) stoi jako osobna grupa mimo jednego liścia — to konceptualnie odrębna kompetencja (warsztat skryptowy/testowy, nie język produktu embedded). Świadomy wybór czytelności nad upchnięciem (precedens: SQL jako osobna grupa w BA, partia 4).

### Grupa 5 — Chmura, kontenery i CI/CD (styk IoT/edge) · `context-group` · unionShare ≈ 25% (szac.)
> **Opis:** Coraz więcej urządzeń łączy się z chmurą (IoT — internet rzeczy: sprzęt, który wysyła dane do serwera) i część ofert embedded oczekuje, że ogarniesz też tę stronę. CI/CD (taśma automatycznego budowania i wdrażania) buduje i testuje firmware, Docker pakuje narzędzia w kontener, Kubernetes uruchamia je na skalę, AWS i GCP to chmury, do których urządzenie raportuje. DevSecOps domyka warsztat bezpieczeństwem wbudowanym w proces.

| Liść | kind | countAs | union |
|---|---|---|---|
| CI/CD | concept | — | — |
| Docker | tool | — | — |
| Kubernetes | tool | — | — |
| AWS | tool | `["AWS", "Amazon AWS"]` | **true** |
| GCP | tool | `["GCP", "Google Cloud Platform"]` | **true** |
| DevSecOps | concept | — | — |

---

# 2. Solution Architect

**81 ofert · 18 liści po bramce · ŚCIEŻKA CIENKA — rekomendacja „dane wstępne".** 4 grupy. **NIE patologiczna** (Architecture #1, konkrety architekta obecne), ale rdzeń-konkret architekta z natury niepoliczalny — patrz Sygnał #1.

> **OSTRZEŻENIE O CIENKOŚCI (do wyświetlenia studentowi i do decyzji Darka):** ta ścieżka stoi na 81 ofertach — najmniej w całym katalogu. Po bramce minimalnego wolumenu (countMin = 4 oferty) przechodzi 18 liści, a najbardziej charakterystyczne dla architekta narzędzia (TOGAF, ArchiMate, DDD) wypadają **pod** bramką (po 2–3 oferty). Włączam je **świadomym override'em** (uzasadnienie niżej), bo bez nich katalog pokazałby tylko „senior Java + chmura" — co byłoby MYLĄCE (zatarłoby, czym architekt różni się od seniora-dewelopera). Rekomenduję oznaczyć ścieżkę jako **„dane wstępne / preliminary"** w UI do następnego, większego zrzutu.

### Grupa 1 — Architektura i wzorce projektowe (rdzeń roli) · `context-group` · unionShare ≈ 50% (szac.)
> **Opis:** Serce roli — projektowanie, jak system ma być zbudowany, zanim padnie pierwsza linia kodu. Architektura (45.7% ofert) to świadome decyzje o podziale systemu na części i ich współpracy. DDD (Domain-Driven Design — projektowanie wokół pojęć biznesowych, nie technicznych) i Event Streaming (architektura oparta na strumieniu zdarzeń — system reaguje na zdarzenia w czasie rzeczywistym) to konkretne style. TOGAF i ArchiMate to ramy i notacja architektury korporacyjnej (jak opisać architekturę całej organizacji), a Enterprise Architect to program, w którym się to rysuje.

| Liść | kind | countAs | union |
|---|---|---|---|
| Architektura systemów | concept | `["Architecture"]` | — |
| DDD (Domain-Driven Design) | concept | `["DDD"]` | — |
| Event Streaming | concept | — | — |
| TOGAF | concept | — | — |
| ArchiMate | concept | — | — |
| Enterprise Architect | tool | — | — |

*Uzasadnienie override (poniżej bramki):* `Architecture` 45.7% przemianowuję na `Architektura systemów` (gołe „Architecture" było w połowie meta — doprecyzowuję, że chodzi o projektowanie systemu, nie hasło). **DDD (2.5%, n=2), TOGAF (3.7%, n=3), ArchiMate (2.5%, n=2) DOŁĄCZONE mimo niespełnienia bramki** — to leksykon, który DEFINIUJE architekta; ich pominięcie zostawiłoby katalog nieodróżnialny od seniora-Javy. Świadoma decyzja produktowa > surowy próg, jawnie flagowana.

### Grupa 2 — Integracja i komunikacja systemów · `context-group` · unionShare ≈ 35% (szac.)
> **Opis:** Praca architekta to w dużej mierze spinanie wielu systemów, żeby gadały ze sobą poprawnie i skalowalnie. Kafka to standard komunikacji strumieniowej (jeden system wysyła zdarzenia, inne je odbierają), API w stylu REST (interfejs, przez który programy się wołają) to podstawa integracji, ESB (szyna integracyjna — centralny punkt spinający systemy korporacyjne) i WebLogic to świat dużych systemów korporacyjnych, Oracle to klasyczna baza w ich centrum.

| Liść | kind | countAs | union |
|---|---|---|---|
| Kafka | tool | `["Kafka", "Apache Kafka"]` | **true** |
| REST / API | concept | `["RESTful API", "API", "REST API", "REST"]` | **true** |
| ESB | concept | — | — |
| WebLogic | tool | — | — |
| Oracle | tool | — | — |

*Uzasadnienie override:* `ESB` (2.5%, n=2) dołączony poniżej bramki — to charakterystyczny element architektury integracyjnej korporacyjnej, spójny z WebLogic/Oracle w tych samych ofertach.

### Grupa 3 — Chmura i skalowanie · `context-group` · unionShare ≈ 45% (szac.)
> **Opis:** Nowoczesny architekt projektuje systemy działające w chmurze i odporne na obciążenie. Azure (22% ofert) i GCP to platformy chmurowe, Kubernetes uruchamia aplikacje na skalę (sam dokłada i odejmuje moc pod obciążeniem), Docker pakuje je w kontenery. To warstwa, w której architekt decyduje, jak system rośnie wraz z liczbą użytkowników.

| Liść | kind | countAs | union |
|---|---|---|---|
| Azure | tool | `["Azure", "Microsoft Azure", "MS Azure"]` | **true** |
| GCP | tool | `["GCP", "Google Cloud Platform"]` | **true** |
| Kubernetes | tool | — | — |
| Docker | tool | — | — |

*Uzasadnienie:* gołe `Cloud` (27.2%) WYKLUCZONE jako meta — konkret to nazwane platformy (Azure/GCP), nie hasło „chmura".

### Grupa 4 — Substrat techniczny (skąd przychodzi architekt) · `context-group` · unionShare ≈ 60% (szac.)
> **Opis:** Architekt rozwiązań to zwykle senior, który wyrósł z konkretnego stosu technicznego — i oferty to odzwierciedlają. Java (44% ofert) i Python (36%) to dwa najczęstsze języki, z których architekci w PL przychodzą; ETL (Extract-Transform-Load — wzorzec przenoszenia danych ze źródła do hurtowni) pojawia się przy architekturze danych. To NIE są umiejętności, które czynią Cię architektem — to fundament, na którym architektura się buduje. Pokazuję je uczciwie, ale nazwa grupy mówi wprost: to substrat, nie istota roli.

| Liść | kind | countAs | union |
|---|---|---|---|
| Java | tool | — | — |
| Python | tool | — | — |
| ETL | concept | — | — |

*Uzasadnienie nazwy grupy:* świadomie nazwałam grupę „substrat techniczny (skąd przychodzi architekt)" zamiast „Języki" — żeby student nie odczytał Javy/Pythona jako „naucz się tego, a będziesz architektem". Brand voice: prawda o rynku. `AI` 35.8% WYKLUCZONE jako buzzword/meta (patrz override) — choć wysokie, to gołe hasło bez konkretu.

---

# 3. Product Owner / Manager

**269 ofert · 51 liści po bramce · rdzeń OK (Product Management 34.9%, lift=32).** 5 grup. Rola zarządcza — dominują **koncepcje i metodyki**, mało „tool" (jak PM w partii 4). **Szum flagowany: Analytical Thinking #1, AI 18.6%, przeciek tech (Azure/Python/Backend).**

### Grupa 1 — Produkt i przywództwo (rdzeń) · `context-group` · unionShare ≈ 50% (szac.)
> **Opis:** Serce roli — odpowiedzialność za to, CO powstaje i DLACZEGO. Product Management (35% ofert, drugi najsilniejszy sygnał) to zarządzanie produktem: ustalanie, które funkcje budujemy i w jakiej kolejności, na podstawie wartości dla użytkownika. Myślenie analityczne (Analytical Thinking — najsilniejszy sygnał roli, 39%) to fundament: PO podejmuje decyzje na danych, nie na przeczuciu. Przywództwo (Leadership) domyka rdzeń — PO prowadzi zespół bez formalnej władzy nad nim.

| Liść | kind | countAs | union |
|---|---|---|---|
| Product Management | concept | — | — |
| Myślenie analityczne (Analytical Thinking) | concept | `["Analytical Thinking"]` | — |
| Leadership | concept | — | — |

*Uzasadnienie kind:* metodyka/kompetencja zarządcza = `concept` (rozumiesz i stosujesz, nie „obsługujesz narzędzie"). **`Analytical Thinking` WŁĄCZONE jako `concept`** mimo wykluczania go jako soft-generyczny dla PM/BA w partii 4 — różnica: u PO to **najsilniejszy sygnał roli (39%, lift=19)** i rdzeń zawodu (PO = decyzje na danych), a nie redundantny dodatek przy bogatszych soft-konkretach (jak miał PM: Stakeholder/Change Management). Świadome, jawnie odnotowane rozstrzygnięcie niespójności (precedens „soft = rdzeń roli zarządczej", partia 4).

### Grupa 2 — Metodyki zwinne i prowadzenie projektu · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Sposób, w jaki PO prowadzi pracę zespołu. Agile (23% ofert) to zwinne podejście: budujesz w krótkich cyklach i często weryfikujesz z użytkownikiem, zamiast planować wszystko z góry. Scrum i Kanban to konkretne odmiany zwinności (Scrum — praca w stałych „sprintach"; Kanban — ciągły przepływ zadań). Project Management (18%) to rama prowadzenia całości do terminu i budżetu.

| Liść | kind | countAs | union |
|---|---|---|---|
| Agile | concept | — | — |
| Scrum | concept | — | — |
| Kanban | concept | — | — |
| Project Management | concept | — | — |

### Grupa 3 — Narzędzia pracy PO · `context-group` · unionShare ≈ 15% (szac.)
> **Opis:** Oprogramowanie, w którym PO faktycznie prowadzi produkt. Jira (12% ofert) trzyma listę zadań i postęp zespołu, Confluence to wiki, gdzie PO opisuje wymagania, decyzje i mapę rozwoju produktu (roadmapę).

| Liść | kind | countAs | union |
|---|---|---|---|
| Jira | tool | — | — |
| Confluence | tool | — | — |

### Grupa 4 — Analiza i wymagania · `context-group` · unionShare ≈ 12% (szac.)
> **Opis:** PO tłumaczy potrzeby biznesu na konkretne wymagania, które zespół zbuduje. Analiza biznesowa to rdzeń tej pracy (zrozumienie, jaki problem właściwie rozwiązujemy), a SDLC (cykl życia oprogramowania — od pomysłu, przez budowę, po utrzymanie) to rama, w której PO się porusza.

| Liść | kind | countAs | union |
|---|---|---|---|
| Business Analysis | concept | `["Business Analysis", "Analiza Biznesowa"]` | **true** |
| SDLC | concept | — | — |

*Uzasadnienie:* polski i angielski zapis tego samego bytu (`Business Analysis` + `Analiza Biznesowa`) scalone unią — zrzut dwujęzyczny, jeden byt (reguła globalna z partii 4).

### Grupa 5 — Domena i systemy korporacyjne · `context-group` · unionShare ≈ 22% (szac.)
> **Opis:** Kontekst, w którym pracuje PO — często produkt cyfrowy lub system korporacyjny. SaaS (11% ofert — oprogramowanie sprzedawane jako usługa abonamentowa, np. Netflix dla firm) to dziś dominujący model produktu, w którym PO buduje. CRM (system zarządzania relacjami z klientem), ERP i SAP (systemy do zarządzania całą firmą — finanse, magazyn, kadry) oraz ITIL (zbiór dobrych praktyk zarządzania usługami IT) to światy, w których PO produktu wewnętrznego się porusza.

| Liść | kind | countAs | union |
|---|---|---|---|
| SaaS | concept | — | — |
| CRM | concept | — | — |
| SAP | tool | — | — |
| ERP | concept | — | — |
| ITIL | cert | — | — |

*Uzasadnienie kind:* `SaaS`/`CRM`/`ERP` = kategorie/modele (`concept`); `SAP` = konkretny produkt (`tool`); `ITIL` = w PL przede wszystkim certyfikat (`cert`, osobny kubełek — jak PRINCE2 w PM, partia 4).

---

## Lista override'ów (jawne ręczne decyzje nad bramką)

### Scalenia unią (`countAsUnion: true`) — przeciw zawyżeniu sumą
| Ścieżka | Liść | Scalone warianty | Powód |
|---|---|---|---|
| Embedded | Embedded Systems | Embedded Systems + Embedded | nazwa domeny, dwa zapisy |
| Embedded | AWS / GCP | + Amazon AWS / Google Cloud Platform | chmury unią (reguła globalna) |
| Solution Architect | REST / API | RESTful API + API + REST API + REST | łańcuch REST/API domknięty |
| Solution Architect | Kafka | Kafka + Apache Kafka | ten sam produkt |
| Solution Architect | Azure | Azure + Microsoft Azure + MS Azure | jedna chmura, trzy zapisy |
| Solution Architect | GCP | GCP + Google Cloud Platform | jedna chmura, dwa zapisy |
| PO/Manager | Business Analysis | Business Analysis + Analiza Biznesowa | zrzut dwujęzyczny, jeden byt |

### Dołączenia PONIŻEJ bramki (świadomy override IN — tylko Solution Architect, cienka ścieżka)
| Ścieżka | Dołączony liść | n / % | Powód |
|---|---|---|---|
| Solution Architect | TOGAF | 3 / 3.7% | rama architektury korporacyjnej — DEFINIUJE architekta; bez niej katalog = „senior Java" |
| Solution Architect | ArchiMate | 2 / 2.5% | notacja architektury korporacyjnej — jw. |
| Solution Architect | DDD | 2 / 2.5% | wzorzec projektowy rdzeniowy dla architekta — jw. |
| Solution Architect | ESB | 2 / 2.5% | element architektury integracyjnej korporacyjnej (spójny z WebLogic/Oracle) |

> **To jedyne dołączenia poniżej bramki w całej partii.** Uzasadnione WYŁĄCZNIE cienkością Solution Architect (81 ofert) i ryzykiem mylącego katalogu „senior-dev". Dla Embedded i PO/Manager bramka NIE jest podnoszona — mają dość liści.

### Wykluczenia (liść przeszedł bramkę / wysoki %, ale ŚWIADOMIE pominięty)
| Ścieżka | Wykluczony liść | % | Powód |
|---|---|---|---|
| Embedded | Scratch / Roblox / Unity | ~3% każde | gamedev/edukacja — szum anchora (Scratch/Roblox to platformy dla dzieci/gier, nie embedded) |
| Embedded | LUA | 3.7% | język skryptowy gier (Roblox/silniki gier) — szum gamedev, NIE embedded |
| Embedded | Kotlin | 12.8% | przeciek mobile (Android) — anchor łapie część ofert mobilnych przy C++ |
| Embedded | Java | 21.8% | przeciek backend/mobile — rzadki w czystym embedded; nie rdzeń (flag: patrz Sygnał #2) |
| Embedded | C# / JavaScript / Machine Learning | 2–4% | przeciek z innych domen (desktop/web/ML) — nie rdzeń embedded |
| Embedded | Agile / Scrum / Team Leadership | 2–4% | soft/metodyka generyczna — osobny kubełek, nie liść techniczny embedded |
| Solution Architect | Cloud (gołe) | 27.2% | meta-hasło — konkret to Azure/GCP, nie „chmura" |
| Solution Architect | AI | 35.8% | buzzword/meta bez konkretu — wykluczony jak w partii 2–4 (ale flag: patrz Sygnał #3) |
| Solution Architect | English | 7.4% | język obcy — osobny kubełek |
| Solution Architect | Python 3.x | 4.9% | wariant Pythona — pokryte liściem `Python`; osobny zapis zawyżałby |
| PO/Manager | AI | 18.6% | buzzword/meta — wykluczony (ale flag: patrz Sygnał #3, decyzja Darka) |
| PO/Manager | product owner (gołe) | 5.2% | nazwa roli, nie liść-konkret (jak „Android" w partii 3) |
| PO/Manager | Azure / Python / Bash / SQL / Machine Learning | 2–11% | przeciek techniczny — anchor łapie część PO produktów technicznych; nie rdzeń roli PO |
| PO/Manager | Backend / Software Development / Architecture / Distributed systems / Algorithms | 2–3% | przeciek z ról deweloperskich — nie rdzeń PO |
| PO/Manager | Testing / API / Networking / Troubleshooting / IT Support / maintenance / RPA / ITSM | 1.5–3% | przeciek IT-ops/QA — anchor łapie ogłoszenia z branż IT, nie zarządzanie produktem |
| PO/Manager | Documentation | 1.9% | soft generyczny — osobny kubełek |

### Decyzje `kind` (nadpisanie auto-klasyfikatora)
- **concept** (rozumiem/stosuję): Embedded Systems, RTOS, CI/CD, DevSecOps (Embedded); Architektura systemów, DDD, Event Streaming, TOGAF, ArchiMate, ESB, REST/API, ETL (Solution Architect); Product Management, Analytical Thinking, Leadership, Agile, Scrum, Kanban, Project Management, Business Analysis, SDLC, SaaS, CRM, ERP (PO/Manager — metodyki + kompetencje zarządcze rdzeniowe + kategorie systemów).
- **cert** (certyfikat, osobny kubełek): ITIL (PO/Manager).
- **tool** (obsługuję konkretne oprogramowanie/język/sprzęt): wszystkie języki (C++, C, Rust, Python, Java), freeRTOS, FPGA, VHDL, CMake, Linux/Linux Kernel, Bash, Git, Docker, Kubernetes, chmury, Kafka, WebLogic, Oracle, Enterprise Architect, Jira, Confluence, SAP.

---

## Sygnały produktowe do flagowania (decyzje dla Darka)

1. **Solution Architect — NIE patologiczny, ale CIENKI (81 ofert). Rekomendacja: oznaczyć „dane wstępne".** Sprawdziłam wprost (zlecenie z prompt): czy to czwarty anchor patologiczny jak Engineering Manager? **NIE.** U EngMgr `Leadership` był spychany na #3 przez czysty dev — anchor łapił seniora-dewelopera ZAMIAST menedżera. Tu `Architektura` JEST #1 (45.7%), a konkrety architekta (Enterprise Architect, TOGAF, ArchiMate, Event Streaming, ESB, DDD, WebLogic) DA SIĘ znaleźć — anchor łapie WŁAŚCIWĄ rolę. Problem jest inny: rola architekta z natury opiera się na doświadczeniu i wzorcach, nie na policzalnym zestawie narzędzi, więc po bramce min-wolumenu konkret architekta wypada, a zostaje substrat „senior Java + chmura". Skuratorowałam uczciwie (dołączyłam TOGAF/ArchiMate/DDD/ESB override'em IN, nazwałam grupę 4 wprost „substrat, nie istota"), ale **rekomenduję oznaczyć ścieżkę „dane wstępne / preliminary" w UI** do następnego, większego zrzutu. Decyzja Darka: zostawić jako pełną ścieżkę czy z etykietą „dane wstępne"?

2. **Embedded: Java 21.8% + Kotlin 12.8% — przeciek mobile, nie rdzeń.** Anchor „Embedded / C++ Developer" łapie część ofert mobilnych/backendowych (Java/Kotlin) obok prawdziwego embedded. Wykluczyłam oba z liści (Kotlin jednoznacznie Android; Java rzadka w czystym embedded). **To NIE psuje ścieżki** — rdzeń C++ 76.6% jest przytłaczający i jednoznaczny. Ale warto wiedzieć: ~1 na 5 ofert „C++" w PL to nie embedded, lecz inny C++ (systemy transakcyjne, desktop, silniki gier). Nazwa „Embedded / C++" jest podwójna i to uczciwie obejmuje — rdzeń embedded (freeRTOS/FPGA/VHDL) zachowany w grupie 2.

3. **AI jako buzzword vs realny wymóg — wraca w Solution Architect (36%!) i PO/Manager (19%).** Konsekwentnie wykluczam `AI` jako gołe meta (partia 2–4), ALE w Solution Architect to aż **35.8%** (trzeci sygnał roli) — to już nie szum, to sygnał, że rynek oczekuje „architekta systemów AI". Podobnie PO/Manager 18.6% („PO produktu AI"). **Decyzja Darka:** czy w kolejnym zrzucie wprowadzić osobną grupę „Integracja/Architektura AI" (jak w AI Engineer) dla ról seniorskich, zamiast wykluczać `AI` jako buzzword? Na teraz wykluczam dla spójności, ale FLAGUJĘ rosnący trend — przy 36% to przestaje być dekoracja.

4. **Embedded: Python 41.5% = drugi sygnał roli — rynek embedded się „pythonizuje".** Wbrew stereotypowi „embedded = tylko C/C++", Python jest masowo wymagany (narzędzia, automatyzacja testów, analiza danych z czujników). Uczciwie pokazuję studentowi rynek 2026: junior embedded w PL potrzebuje Pythona obok C++ (wpisane w opis grupy 4). To NIE błąd danych — to realny sygnał rynkowy.

5. **PO/Manager: Analytical Thinking #1 (39%) — niespójność z partią 4 rozstrzygnięta jawnie.** W partii 4 wykluczałam `Analytical Thinking` jako soft-generyczny dla PM/BA. Tu WŁĄCZAM go jako `concept` rdzeniowy — bo u PO to najsilniejszy sygnał roli (39%, lift=19) i istota zawodu (PO = decyzje na danych), a nie redundantny dodatek przy bogatszych soft-konkretach. Świadome, jawnie odnotowane rozstrzygnięcie (precedens „soft = rdzeń roli zarządczej", PM partia 4). Gdyby Leo chciał pełnej spójności „nigdy soft-generyczny w liściach" — wykluczę i przeniosę do opisu grupy. Zgłaszam wybór, nie przesądzam ponad recenzję.

---

## Self-critique — 5 słabości i co poprawiłam

Wcieliłam się w najsurowszego krytyka-PO (benchmark: top-10% kuracja produktowa, Lenny's-grade). Znalazłam i poprawiłam:

1. **SŁABOŚĆ: pokusa „uratowania" Solution Architect udawaną bogatością** — dosypania substratu (Java/Python/K8s/Kafka) jako pełnoprawnego rdzenia, żeby ścieżka nie wyglądała na cienką. To okłamałoby studenta, że „architekt = senior Java". → **POPRAWKA:** nazwałam grupę 4 wprost „substrat techniczny (skąd przychodzi architekt)", dodałam jawne OSTRZEŻENIE O CIENKOŚCI na górze ścieżki, dołączyłam architekt-konkrety (TOGAF/ArchiMate/DDD) override'em IN i rekomenduję etykietę „dane wstępne". Lepszy uczciwy cienki katalog niż udawanie bogactwa (dyrektywa prompt).

2. **SŁABOŚĆ: dołączanie liści poniżej bramki łamie filozofię min-wolumenu** (countMin = 4 oferty chroni przed szumem) — ryzyko, że Leo słusznie zablokuje. → **POPRAWKA:** ograniczyłam override IN WYŁĄCZNIE do Solution Architect (jedyna ścieżka, gdzie bramka zabija rdzeń roli), wypisałam każdy w osobnej tabeli z n/% i uzasadnieniem, i jawnie napisałam, że dla Embedded/PO bramki NIE ruszam. Override jest chirurgiczny i widoczny, nie hurtowy.

3. **SŁABOŚĆ: niespójność z partią 4 przy `Analytical Thinking`** (tam wykluczony, tu włączony) — krytyk słusznie wytknie „raz tak, raz tak". → **POPRAWKA:** nie ukryłam tego — rozpisałam rozstrzygnięcie w override + Sygnale #5, z kryterium różnicującym (czy soft to RDZEŃ roli czy redundantny dodatek) i jawną ofertą wycofania, jeśli Leo chce pełnej spójności. Decyzja z uzasadnieniem > cicha niespójność.

4. **SŁABOŚĆ: szum gamedev w Embedded (Scratch/Roblox/Unity/LUA) mógł przeciec do katalogu** jako „języki" — LUA 3.7% przeszła bramkę i auto-klasyfikator dał jej `tool`. → **POPRAWKA:** wszystkie cztery (Scratch/Roblox/Unity/LUA) do jawnej listy wykluczeń z uzasadnieniem „gamedev/edukacja — szum anchora"; LUA jednoznacznie zidentyfikowana jako język skryptowy gier (Roblox), nie embedded. Rdzeń systemowy (C++/C/Rust + freeRTOS/FPGA/VHDL) oczyszczony.

5. **SŁABOŚĆ: żargon w opisach** (firmware, IoT, RTOS, FPGA, ESB, DDD, Event Streaming, roadmapa, SaaS, sprint, ITIL) groził złamaniem brand voice (sekcja 3 konstytucji — odbiorca nietechniczny, student). → **POPRAWKA:** każdy termin rozwinięty po polsku przy pierwszym użyciu („systemy czasu rzeczywistego — gwarantują reakcję w ściśle określonym czasie", „IoT — internet rzeczy: sprzęt wysyłający dane do serwera", „ESB — szyna integracyjna spinająca systemy", „DDD — projektowanie wokół pojęć biznesowych", „SaaS — oprogramowanie jako usługa abonamentowa", „roadmapa — mapa rozwoju produktu"). Sprawdzone w każdym z 14 opisów grup.

**Dodatkowo po self-critique:** zweryfikowałam wprost pytanie z prompt o patologiczność Solution Architect (Sygnał #1) zamiast cicho go skuratorować — zgodnie z dyrektywą „jeśli to patologiczny anchor jak EngMgr, zgłoś jako czwarty patologiczny, nie kuratoruj po cichu". Rozstrzygnięcie: NIE patologiczny (anchor łapie właściwą rolę), ale cienki → rekomendacja „dane wstępne", nie odłożenie.

---

## Rekomendacja końcowa per ścieżka

| Ścieżka | Rekomendacja | Uzasadnienie |
|---|---|---|
| **Embedded / C++ Developer** | **KURATOROWAĆ (pełna ścieżka)** | rdzeń wyrazisty (C++ 77%, C 34% + freeRTOS/FPGA/VHDL), szum izolowany do override'ów, 5 sensownych grup. Gotowa. |
| **Solution Architect** | **KURATOROWAĆ + oznaczyć „dane wstępne / preliminary" w UI** | NIE patologiczna, ale cienka (81 ofert); rdzeń architekta poniżej bramki (dołączony override'em). Uczciwy cienki katalog + etykieta do następnego zrzutu. Decyzja Darka o etykiecie. |
| **Product Owner / Manager** | **KURATOROWAĆ (pełna ścieżka)** | rdzeń OK (Product Management 35%, lift=32), 5 grup; szum (AI 19%, przeciek tech) wykluczony, jawnie flagowany. Jedna decyzja otwarta dla Darka: AI jako buzzword vs rosnący wymóg (Sygnał #3). |

**Ścieżka dokumentu:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/sophia-a4-partia5.md`
**Surowe dane:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/lift-partia5.json`
