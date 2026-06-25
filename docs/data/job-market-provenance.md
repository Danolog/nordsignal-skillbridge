# Prowenicja danych rynku pracy — `job_market_data` + `career-model` (JustJoinIT)

**Wersja:** v5.0 · 2026-06-25
**Owner:** Max (backend executor, dział Engineering) · lens jakości: Ethan (CTO)
**Status:** Partia 3, zadanie #11 — narzędzie importu realnego rynku pracy.

**Changelog v4.0 → v5.0 (2026-06-25):** zastosowana **warstwa produktu Sophii v5** (`docs/data/career-model-decisions-sophia-v5.md`) nad ZAMROŻONĄ hierarchią v4. Silnik nearest-profile + hierarchia obszar→liść bez zmian. Dochodzi:
- **5 rodzin e-CF** (PLAN/BUILD/RUN/ENABLE/MANAGE wg EN 16234) jako grupowanie nadrzędne — zastępuje dotychczasowe rodziny. Pole `category` w płaskim artefakcie = rodzina e-CF.
- **Ramy per ścieżka** (`frameworks`): e-CF, SFIA, ISCO + ESCO (Sophia §3).
- **Warstwa juniora** (`juniorFriendliness`, `targetRole`, `tShapePairs`, Sophia §4): role docelowe (Solution Architect, Engineering Manager) **WIDOCZNE + oznaczone „rola docelowa"** (NIE ukrywane). Junior-friendliness Wysoka/Średnia/Niska/rola docelowa per ścieżka.
- **6 autorskich zestawów projektów** (Java, Data Engineer, Frontend, PM, BA, Salesforce — po 3 poziomy `latwy/sredni/zaawansowany` z `marketRationale`); reszta = szablon `todo`. **`anchorLeaves` każdego zweryfikowane względem policzonych liści** — gdzie liścia brakło w hierarchii, dodano go (CI/CD→Jenkins w Java; Playwright/Cypress w Frontend), bo realnie obecny w danych dla tej ścieżki.

**DWIE FINALNE ZMIANY DARKA:** **(1) Business Analyst → Rodzina V** (Zarządzanie i Systemy Biznesowe), nie I — konkret BA to UML/BPMN/analiza systemowa (ISCO 2511). **(2) WYNAGRODZENIA PRECZ** — widełki usunięte WSZĘDZIE: nie liczone, nie zapisywane. `salaryRange` zniknął z obu artefaktów; kolumna `salary_range` w `jobMarketData` zostaje **NIEZAPEŁNIONA (NULL), bez migracji schemy**. **% popytu zostaje** (twardy sygnał). Usunięte z silnika: `parseSalary`, `median`, `formatSalaryRange`, filtr widełek 4 000–100 000 (był potrzebny tylko do median). Wynik: **23 ścieżki, 87,9% pokrycia, 268 liści, 67 projektów, ZERO widełek.**

**Changelog v3.0 → v4.0 (2026-06-25):** zastosowany **model scalony Sophii v4.0** (`docs/data/career-model-decisions-sophia-v5.md §5 (hierarchia v4 utrzymana)`, 4 dyrektywy Darka). Silnik nearest-profile ZOSTAJE; dochodzi **hierarchia**, **realne % liści** i **bank projektów**. Dwa artefakty zamiast jednego:
- **`job-market-justjoinit.json`** (PŁASKI, jak dotąd) — liście-konkrety z realnym %; zasila tabelę `jobMarketData` (schema NIETKNIĘTA). **Próg 5%/10 ZNIESIONY dla liści** (dyrektywa 1 — % przy każdym narzędziu). % zaokrąglane do integer (kolumna `demand_percentage` jest integer); liście 0% po zaokrągleniu i nieobecne w zrzucie → tylko w hierarchii, nie tu.
- **`career-model.json`** (NOWY, hierarchiczny) — per ścieżka: **obszary wiedzy** (% popytu ścieżki z danych) → **liście-konkrety** (% w obrębie ścieżki, **1 miejsce po przecinku** — by rzadkie narzędzia jak Burp Suite 0,3% nie znikały) + **bank projektów 3-poziomowy**. Typy węzłów: `knowledge-area` (z %), `presentation-group` (etykieta bez %), `leaf`. Konsumowany przez kod aplikacji, NIE wchodzi do bazy (schema red line).

Pozostałe zmiany v4: **(1) koniec ramki junior/senior** — wszystkie 23 ścieżki widoczne (`studentSelectable: true`); zniesiona degradacja z v3. **(2) „Software Engineer" → „Embedded / C++ Developer"** (realny profil C++ 74%). **(3) Anty-magnes** zachowany jako `TIE_BREAK_DEPRIORITIZED` (Software Eng / Solution Architect / Engineering Manager deprytetyzowane TYLKO w tie-breaku przypisania — to nie jest ukrycie, te ścieżki są widoczne). **(4) Normalizacja nazw liści** (tabela wariantów Sophii §3): `dbt`→`DBT`, `LangChain`→`Langchain`, `FastAPI`→`fastapi`, `Scikit-learn`→`scikit-learn` itd.; sumowanie `Airflow`+`Apache Airflow`, `Kafka`+`Apache Kafka`. **(5) Liście nieobecne** (Miro, GitLab CI, Jupyter Notebook, OWASP Top 10) → `demandPercentage: null`, `source: "kuracja ekspercka"`. Wynik: **23 ścieżki, 87,9% pokrycia, 268 liści (7 nieobecnych), 67 projektów**. `career-goal-map.ts`/`job-market-justjoinit.json` flat + nowy `career-model.ts`/`career-model.json`.

**Changelog v2.0 → v3.0 (2026-06-25):** zastosowana **kuracja Sophii v2** (`docs/data/career-model-decisions-sophia-v5.md §2 + anchor-config.ts (kuracja v2)`): nazwy, scalenia, grupy, degradacja ról seniorskich, 2 kotwice ręczne. Silnik nadal nearest-profile; dwie korekty algorytmu. Zmiany: **(1) scalenia kotwic** (`ANCHOR_MERGES`) — 30 surowych tytułów → ścieżki produktowe (full-stack dev+eng → jedna, backend dev+eng → jedna, qa+test/qa-automation → jedna, business+it+system analyst → jedna, product owner+manager → jedna, data architect → data engineer, cloud → devops). **(2) 2 kotwice RĘCZNE spoza top-30** — UX/UI Designer i Cybersecurity Specialist źródłowane po `Kategoria` (`Ux`/`Security`), bo ich tytuły są rozproszone (Sophia §6). **(3) Degradacja z wyboru studenta** — Software Engineer / Solution Architect / Engineering Manager dostają `studentSelectable: false` (0% junior / zbyt ogólne): oferty się do nich przypisują (pokrycie), ale onboarding ich nie pokazuje (Sophia §4). **(4) Nowy tie-break (anty-„magnes")** — przy równym pokryciu wygrywa kotwica wybieralna przed zdegradowaną, dalej mniejsza, dalej alfabetycznie (sekcja 5). **(5) Grupowanie w 8 rodzin** (`ANCHOR_CATEGORY`, Sophia §3). Wynik: **23 ścieżki** (20 widocznych dla studenta + 3 ukryte) + 2 kotwice ręczne, **pokrycie 87,9%**.

**Changelog v1.0 → v2.0 (2026-06-25):** porzucona mapa kategorii Sophii v1 (surowa `Kategoria` → ścieżka) na rzecz nearest-profile (decyzja Darka, #11). Plik `career-goal-map.ts` usunięty; zastąpiony `anchor-config.ts`. Silnik (parser/czyszczenie/liczenie/format/seed) bez zmian.

**Po co ten dokument (Built-to-Sell, CLAUDE.md sekcja 2):** kupujący firmę — albo audytor — musi w 5 lat móc odtworzyć, **skąd wzięła się każda liczba** w tabeli `job_market_data`. Tu jest pełen łańcuch: plik źródłowy → czyszczenie → grupowanie → agregacja → artefakt. Bez zgadywania.

**Żargon (CLAUDE.md sekcja 3):** *ETL* = ekstrakcja-transformacja-ładowanie (pobranie danych, przeliczenie, zapisanie). *artefakt* = policzony plik wynikowy (`job-market-justjoinit.json`), który wchodzi do repo i zasila bazę. *Slug* = krótki, stały identyfikator oferty (klucz złączenia obu plików). *kotwica* (*anchor*) = wzorcowy tytuł stanowiska, wokół którego budujemy ścieżkę. *profil* = zbiór najczęstszych kompetencji kotwicy. *pokrycie* (*coverage*) = odsetek oczyszczonych ofert, które dało się przypisać do jakiejś ścieżki. *mediana* = wartość środkowa po posortowaniu. *MNAR* (*Missing Not At Random*) = braki danych zależne od samej zmiennej. *demand percentage* = odsetek ofert ścieżki, w których dana technologia wystąpiła.

---

## 1. Źródło

| | |
|---|---|
| **Dostawca** | JustJoinIT (portal ofert pracy IT, rynek PL) |
| **Pliki** | `JustJoinIT_Oferty.csv` (9 922 ofert) + `JustJoinIT_Technologie.csv` (54 085 wierszy technologia↔oferta) |
| **Format** | separator `;`, kodowanie utf-8 z BOM (utf-8-sig), końce linii CRLF |
| **Złączenie** | po kolumnie `Slug` (9 922 unikalnych slugów w obu plikach — pokrycie 1:1) |
| **Data zrzutu (snapshot)** | **2026-02** (`Data_publikacji` ofert = 2026-03-19; przyjęty znacznik zrzutu „2026-02") |
| **Pochodzenie** | analiza Darka (laboratorium WSB, notebook `175735_lab1.ipynb` — czyszczenie odtworzone 1:1) |
| **Lokalizacja surowych plików** | dysk Darka, **POZA repozytorium** (`/mnt/c/Users/D/Documents/WSB MERITO/.../AI/`) |

**Surowe CSV NIE są w repo.** Do repo trafia wyłącznie policzony artefakt (`src/lib/db/data/job-market-justjoinit.json`), konfiguracja kotwic (`src/lib/db/data/anchor-config.ts`) i ten dokument. Ścieżkę do CSV parametryzuje zmienna środowiskowa `JJIT_CSV_DIR`.

---

## 2. Łańcuch przetwarzania (narzędzie `tools/etl-justjoinit.ts`)

### Krok 1 — czyszczenie ofert (1:1 z notebookiem Darka)

| Krok | Reguła | Ofert po kroku |
|---|---|---|
| start | wszystkie wiersze `Oferty.csv` | 9 922 |
| 1 | `Wymiar == "Pełny etat"` (odrzuca internship/freelance/pół etatu) | 9 476 |
| 2 | `Typ_umowy ∈ {B2B, PERMANENT, ANY}` | 9 413 |
| 3 | filtr geo: `Miasto ∈ lista PL` (po normalizacji pisowni) **LUB** `Tryb_pracy == "Zdalnie"` | 8 828 |
| 4 | **dedup po `Slug`** (unikalne oferty) | **8 828** |

**v5: widełki NIE są już czytane ani filtrowane (decyzja Darka „salary precz").** W v1–v4 zerowaliśmy widełki poza zakresem 4 000–100 000 PLN/mc do liczenia median; w v5 widełki nie wchodzą na wyjście, więc filtr stracił rację bytu (nie wpływał na % popytu) i został usunięty. Pozostałe filtry czyszczenia (Wymiar/umowa/geo/dedup) bez zmian. Normalizacja nazw miast i lista polskich miejscowości — odtworzone literalnie z notebooka (`tools/etl-justjoinit.ts`).

### Krok 2 — grupowanie ofert w ścieżki: model „nearest profile" (#11) + kuracja Sophii v2

**Grupujemy oferty wg PROFILU KOMPETENCJI** (nie surowej kategorii JustJoinIT). Algorytm (każdy krok deterministyczny):

1. **Normalizacja tytułu `Stanowisko`** (`normalizeTitle`): lowercase → usuń nawiasy `(…)` → ujednolić `fullstack`/`full stack` → `full-stack` → usuń tokeny poziomu/seniority (`senior|sr|junior|jr|mid|middle|regular|principal|staff|chief|expert|intern|trainee|graduate|associate|lead|ii|iii|iv`) → zostaw litery PL, cyfry oraz `+ . - /` → collapse spacji. Przykład: „Senior Java Developer (m/f)" → „java developer".
2. **Kotwice (anchors):**
   - **Automatyczne**: **top-30 surowych znormalizowanych tytułów** wg liczby ofert (kolejność selekcji liczona PRZED scaleniem — to definicja „top-30 tytułów"; scalenia stosujemy dopiero do tej trzydziestki, inaczej top-30 sięgałoby w ogon i wpuszczało tytuły spoza kuracji).
   - **Ręczne (2, spoza top-30)** — `UX/UI Designer` i `Cybersecurity Specialist`. Ich tytuły są w danych rozproszone (UX Designer / Product Designer; Security Engineer / Cyber Security Specialist) i nie wchodzą do top-30, ale to realne, ważne segmenty (Sophia §6). Ich oferty **źródłujemy po `Kategoria` JustJoinIT** (`Ux` / `Security`), nie po tytule. To świadome rozszerzenie modelu: „top-30 tytułów + 2 kotwice ręczne".
3. **Scalenia kotwic** (`ANCHOR_MERGES`, Sophia §2) — kilka tytułów technicznych → jedna ścieżka produktowa (ten sam zawód + nakładający się profil):
   - full-stack developer + full-stack engineer → **Full-Stack Developer**
   - backend developer + backend engineer → **Backend Developer**
   - qa engineer + qa automation engineer + test automation engineer → **QA Engineer**
   - business analyst + it analyst + system analyst → **Business Analyst**
   - product owner + product manager → **Product Owner / Manager**
   - data architect → **Data Engineer**; cloud engineer → **DevOps Engineer**
   - **machine learning engineer → AI Engineer** *(dodane przez Maxa — nie było w snapshocie Sophii; uzasadnienie §7)*
4. **Profil kotwicy** = jej **top-12 kompetencji** (po scaleniu/po kategorii).
5. **Przypisanie**: każdą oczyszczoną ofertę → kotwica o **największym pokryciu profilu** = `|kompetencje_oferty ∩ profil12|`. **Tie-break v2 (anty-„magnes"):** przy równym pokryciu — kotwica **wybieralna** przed **zdegradowaną**, dalej **mniejsza** przed większą, dalej alfabetycznie (sekcja 5). **Pokrycie 0** → oferta NIEPRZYPISANA (pomijana).
6. **Degradacja z wyboru studenta** (`NON_SELECTABLE_PATHS`, Sophia §4): `Software Engineer`, `Solution Architect`, `Engineering Manager` dostają `studentSelectable: false` — oferty się do nich przypisują (pokrycie), ale onboarding ich NIE pokazuje (0% junior / profil zbyt ogólny → mylące jako cel wejścia). Software Engineer pełni rolę „jeszcze nie wiem / rola szeroka".

### Krok 3 — agregacja per ścieżka (z PRZYPISANYCH ofert)

- **Mianownik** = liczba ofert przypisanych do ścieżki (po scaleniach; dla kotwic ręcznych — oferty kategorii segmentu).
- **`demand_percentage`** = `round(100 × (oferty ścieżki z technologią) / mianownik)`. Obszar wiedzy = % całkowity; liść = 1 miejsce po przecinku (hierarchia) / integer (płaski artefakt).
- **Progi:** ZNIESIONE dla liści (dyrektywa — % przy każdym narzędziu obecnym w zrzucie). Obszary mają % popytu ścieżki. (Próg 5%/cap 25 zostaje co najwyżej jako filtr PREZENTACJI, nie istnienia liścia.)
- **Sortowanie:** malejąco po popycie → malejąco po liczniku → alfabetycznie.
- **BEZ `salary_range`** (v5, decyzja Darka) — nie liczymy median, nie zapisujemy widełek nigdzie.
- **`category`** = rodzina e-CF (5 rodzin, v5). **`frameworks`** = e-CF/SFIA/ISCO/ESCO. **`juniorFriendliness`/`targetRole`/`tShapePairs`** = warstwa juniora.

---

## 3. Wynik (oba artefakty)

`9 922` surowych → `8 828` oczyszczonych → **`7 764` przypisanych** → **POKRYCIE 87,9%** (1 064 oferty nieprzypisane). **23 ścieżki — WSZYSTKIE widoczne** (3 oznaczone „rola docelowa"). 23 kotwice (21 auto + 2 ręczne). 268 liści (7 nieobecnych w zrzucie). 67 projektów (6 zestawów napisanych × 3 poziomy + 17 szablonów todo). **ZERO widełek.**

| Ścieżka | Rodzina e-CF | junior | ISCO | Komp. | Top 3 kompetencje (% popytu) |
|---|---|---|---|---|---|
| Java Developer | II | Średnia | 2512 | 25 | Java 81%, Spring Boot 48%, Spring 45% |
| .NET Developer | II | Średnia | 2512 | 24 | .Net 61%, C# 59%, SQL 29% |
| Python Developer | II | Wysoka | 2512/2514 | 17 | Python 46%, Linux 40%, Kubernetes 36% |
| Backend Developer | II | Wysoka | 2512/2514 | 19 | Java 53%, Python 39%, SQL 37% |
| PHP Developer | II | Średnia | 2514 | 12 | SQL 44%, PHP 22%, Git 21% |
| Embedded / C++ Developer | II | Średnia | 2512 | 6 | C++ 74%, Python 42%, C 35% |
| Frontend Developer | II | Wysoka | 2513 | 18 | JavaScript 61%, TypeScript 57%, React 43% |
| Full-Stack Developer | II | Średnia | 2513/2512 | 16 | React 58%, TypeScript 44%, Java 41% |
| Android Developer | II | Średnia | 2514 | 15 | Java 55%, Kotlin 37%, Android 28% |
| Data Engineer | I | Średnia | 251/252 | 19 | Python 70%, SQL 50%, Databricks 35% |
| Data Analyst | I | Wysoka | 252 | 10 | Python 55%, SQL 49%, Power BI 24% |
| Data Scientist | I | Niska | 25 | 11 | Python 55%, SQL 26%, Databricks 13% |
| AI Engineer | I | Niska | 25 | 15 | Python 75%, PyTorch 31%, AWS 29% |
| DevOps Engineer | III | Niska | 2522 | 14 | Terraform 56%, Kubernetes 41%, Python 31% |
| Cybersecurity Specialist *(ręczna)* | III | Niska | 2529 | 9 | Python 15%, AWS 10%, Azure 9% |
| QA Engineer | IV | Wysoka | 251 | 12 | Java 44%, JavaScript 29%, SQL 27% |
| Solution Architect | IV | **rola docelowa** | 2511/133 | 10 | Java 37%, Kafka 34%, Python 33% |
| Engineering Manager | IV | **rola docelowa** | 133/1330 | 6 | Java 32%, Agile 24%, React 23% |
| Business Analyst *(Rodzina V — Darek)* | V | Średnia | 2511 | 7 | UML 60%, BPMN 51%, SQL 38% |
| Project Manager | V | Średnia | 1330 | 6 | Jira 39%, Scrum 24%, Confluence 23% |
| Product Owner / Manager | V | Średnia | 1330 | 6 | Jira 13%, SaaS 13%, Scrum 13% |
| Salesforce Developer | V | Średnia | 2511 | 9 | Salesforce 32%, Apex 15%, HTML 10% |
| UX/UI Designer *(ręczna)* | V | Średnia | 2166 | 5 | Figma 64%, Adobe XD 14%, Jira 10% |

*Liczby z PŁASKIEGO artefaktu (top liście integer). Pełna hierarchia (obszary z dużym %, liście z 1 miejscem po przecinku) jest w `career-model.json` — np. AI Engineer: obszar AI 53% → liście PyTorch 30,7%, LangChain 17,5%, Pandas 5,8%.*

---

## 4. Ograniczenia (uczciwie — wartość „Customer trust", CLAUDE.md sekcja 2)

1. **IT-only.** JustJoinIT pokrywa wyłącznie rynek IT — nie udajemy pokrycia marketingu/HR/finansów.
2. **Ogon nieprzypisany ~12,1% (1 064 oferty).** Oferta bez ani jednej kompetencji wspólnej z profilem którejkolwiek z 23 kotwic zostaje pominięta. To głównie role wąskie/spoza kuracji (iOS, React Native, Platform Engineer, oferty bez wpisanych technologii) — świadomie ich nie zgadujemy. Druga fala: rozszerzenie listy kotwic/scaleń (konfiguracja, bez ruszania silnika).
3. **WIDEŁKI USUNIĘTE (v5, decyzja Darka).** Nie pokazujemy wynagrodzeń nigdzie — zmieniają się dynamicznie i rzadko mają pokrycie w rzeczywistości. Kolumna `salary_range` zostaje NULL. Konsekwencja: dawne ograniczenia „senior-skew zawyża medianę" i „braki widełek MNAR" **przestają być istotne** — nie liczymy median. Rozkład poziomów (Senior 54%/Junior 3,6%) zostaje jako sygnał do **warstwy juniora** (`juniorFriendliness`), nie do płac.
4. **Ogon nieprzypisany ~12,1%** — patrz pkt 2.
5. **Dylucja profilu w cienkich ścieżkach.** Przy małych kotwicach z szerokim profilem tie-break „mniejsza wygrywa" przyciąga oferty graniczne — np. `PHP Developer` SQL 44% > PHP 22%, `Salesforce Developer` API 39% > Salesforce 31% (płaski artefakt). Top-skill nadal widoczny, ale % rozmyty. Do poprawy: dalsze scalenia/ostrzejszy profil — konfiguracja, nie silnik.
6. **Nazewnictwo „Technologia" ≠ kanon kompetencji.** Surowe etykiety JustJoinIT (`.Net`, `.NET C#`, `Amazon AWS` vs `AWS`) współistnieją. Scalanie nazw to osobna decyzja produktowa — narzędzie ich NIE scala (poza jawną tabelą wariantów do zliczania %).
7. **Cienkie kotwice ręczne.** Cybersecurity Specialist i UX/UI liczone na ofertach kategorii (segment), nie podzbiorze profilu — inaczej rzadkie narzędzia (Splunk, Burp) znikają. To świadoma decyzja (sekcja 2 krok 3).

---

## 5. Determinizm, tie-break i idempotencja (lens Ethana)

- **Zero `new Date()` w danych.** Snapshot wpisany na stałe (`"2026-02"`).
- **Zero losowości**, sortowanie stabilne wszędzie (top-12 profilu, kolejność kotwic, tie-break przypisania, sortowanie kompetencji).
- **Idempotencja zweryfikowana:** dwa uruchomienia na tych samych CSV → bajt-w-bajt identyczny artefakt (`diff` czysty). Artefakt zapisywany z wcięciem TAB (formatter biome), więc `pnpm lint` go nie przeformatuje.

**Tie-break v2 — dlaczego taki, a nie „mniejsza wygrywa" wprost.** Sophia ostrzegła, że generyczny `Software Engineer` (szeroki profil) przejmuje oferty węższych ścieżek („magnes"), i poleciła odwrócić tie-break na „przy równym pokryciu wygrywa mniejsza kotwica". **Sprawdziłem to na danych — sam literał „mniejsza wygrywa" robi NOWY magnes:** wtedy małe-generyczne kotwice zdegradowane (`Engineering Manager`, `Solution Architect`) zaczynają przejmować oferty (Engineering Manager łapał **816** ofert zamiast ~124, a `Java Developer` spadał z ~457 do ~405). Cel Sophii był inny: zmniejszyć magnes, nie przenieść go gdzie indziej. Dlatego porządek remisu to:

1. **wybieralna przed zdegradowaną** — ścieżka studencka zawsze bije generyczną (`Software Engineer`/`Solution Architect`/`Engineering Manager`); to wprost realizuje intencję „generyk nie kradnie",
2. **mniejsza przed większą** — wśród wybieralnych wygrywa bardziej specyficzna (intencja Sophii),
3. **alfabetycznie po nazwie** — pełen determinizm.

Pomiar (oferty wchłonięte przez 3 zdegradowane kotwice): literał „mniejsza wygrywa" = **1 368**; wariant z deprytetyzacją zdegradowanych = **341** (Software Eng 170 / Eng Mgr 124 / Solution Arch 90 — realne dopasowania, bez magnesu). Pokrycie identyczne (87,9%). Wybrałem wariant z deprytetyzacją — to ten, który realizuje cel Sophii. (Koordynator dopuścił: „wystarczy sam tie-break, opisz co wybrałeś".)

- **Testy** (`src/lib/db/__tests__/etl-justjoinit.test.ts`): parser CSV (cudzysłowy, CRLF, BOM); czyszczenie (Wymiar/umowa/geo/dedup/kategoria/techs); normalizacja tytułu; scalenia (full-stack, ML→AI); **kotwice ręczne po kategorii** (mianownik = segment); tie-break (nie-deprytetyzowana bije deprytetyzowaną, mniejsza bije większą, alfabet); demand% liścia po wariancie nazwy; liście absent→null; hierarchia obszar→liść; **v5: ramy + warstwa juniora, BA w Rodzinie V, anchorLeaves ⊆ liście ścieżki, ZERO widełek**; determinizm; walidacja 5 rodzin e-CF.

---

## 6. Zależność: migracja demo-studentów

Seed przemapowuje `careerGoal` demo-studentów przy wgraniu (`DEMO_CAREER_GOAL_REMAP` w `anchor-config.ts`). Dzięki kuracji v2 wszystkie cele mają teraz realne ścieżki:

- `Backend Developer` → **Backend Developer** (realna kotwica)
- `Full-stack Developer` → **Full-Stack Developer** (realna kotwica)
- `Cybersecurity Analyst` → **Cybersecurity Specialist** (kotwica ręczna)
- `UX/UI Designer` → **UX/UI Designer** (kotwica ręczna)
- `Data Analyst`, `Frontend Developer`, `Project Manager`, `Data Scientist`, `DevOps Engineer` → bez zmian

Test `seed-data.test.ts` pilnuje twardo: **każdy cel remapowania musi istnieć jako ścieżka w artefakcie** — inaczej dashboard studenta nie znajdzie danych rynku.

---

## 7. Decyzje Maxa wykraczające poza kurację Sophii (zgłoszone, nie zgadywane)

1. **Scalenie `machine learning engineer → ai engineer`.** Snapshot Sophii (§1) NIE zawierał „machine learning engineer" w top-30; precyzyjniejsza normalizacja silnika wpuściła ten tytuł (28 ofert jako dokładny tytuł). Bez reguły scalenia stawał się magnesem (szeroki profil Python+ML+AI). Profil ML Engineer (Python 86%, ML 39%, AI 32%, PyTorch/TensorFlow) pokrywa się z AI Engineer (ścieżka AI/ML Sophii) — scaliłem do `ai engineer`, spójnie z rodziną „Dane i AI". **Do potwierdzenia przez Sophię** (alternatywa: osobna ścieżka „Machine Learning Engineer" lub scalenie do Data Scientist).
2. **Dodanie ścieżki DevOps Engineer do hierarchii.** Sekcja 1 modelu v4.0 Sophii **nie zawierała bloku hierarchii dla DevOps** (przeoczenie — DevOps jest w jej §3 rodzinach, w banku projektów i jest jedną z największych kotwic, ~528 ofert). Złożyłem hierarchię DevOps z liści jej banku projektów (Docker, GitHub Actions, Terraform, AWS, Kubernetes) + profilu z danych (CI/CD, IaC, Cloud, Monitoring). **Do potwierdzenia przez Sophię.**
3. **Tie-break z deprytetyzacją** (sekcja 5) — odstępstwo od literalnego „mniejsza wygrywa" (literał tworzyłby nowy magnes z generycznych kotwic). v4: deprytetyzacja to TYLKO tie-break, nie ukrycie ścieżki. Do akceptacji.
4. **Xray / Zephyr / TestRail — obecne, nie nieobecne.** Sophia §3 oznaczyła je jako „brak w zrzucie (0 jako tagi)". W danych SĄ jako `Technologia` (Xray 14, Zephyr 5, TestRail 12). Per dyrektywa 1 (% gdzie obecne) — w hierarchii QA są liśćmi z realnym %, NIE flagą `absent`. Zgłaszam rozbieżność; jeśli Sophia woli traktować je jako nieobecne (inne źródło sprawdzenia), to flaga w `career-model.ts`.
5. **% liści 1-dziesiętne; flat jobMarketData integer.** Hierarchia pokazuje 0,3% (Burp Suite) — by „% przy każdym narzędziu" (dyrektywa 1) miało sens dla rzadkich narzędzi. Płaska tabela `jobMarketData` ma `demand_percentage integer` (schema), więc tam zaokrąglam i pomijam 0%. Pełny sygnał jest w hierarchii.
6. **Dylucja profilu PHP/Salesforce** (sekcja 4 pkt 5) — do rozważenia ostrzejszy profil/scalenia (konfiguracja).

## 8. REKOMENDACJA SCHEMATU dla Ethana (NIE migruję — czerwona linia Darka)

Model v5 (hierarchia obszar→liść + ramy e-CF/SFIA/ESCO + warstwa juniora + bank projektów 3-poziomowy) **nie mieści się** w płaskich kolumnach `jobMarketData`. Rozwiązanie zastosowane teraz, **bez zmiany schemy**: `jobMarketData` zostaje płaski (liście-konkrety z realnym %, `category` = rodzina e-CF, `salary_range` NULL), a cała warstwa produktowa żyje w **`career-model.json`** (config konsumowany przez kod aplikacji, nie przez bazę).

**To wystarcza na teraz** (Beta, model read-only z artefaktu). Gdyby hierarchia/ramy/projekty miały trafić do bazy (zapytania per liść, edycja projektów przez panel), proponuję Ethanowi do rozważenia (**osobny sign-off Darka — migracja schemy to czerwona linia**, sekcja 4 CLAUDE.md):
- **`career_paths`** (label, family, ecf_area, sfia, isco_code, isco_label, esco, junior_friendliness, target_role, path_demand_offers) — **bez salary** (decyzja Darka),
- **`knowledge_areas`** (path_id FK, name, type ∈ {knowledge-area, presentation-group}, demand_percentage NULL),
- **`career_leaves`** (area_id FK, name, demand_percentage NUMERIC(4,1) NULL, source, note) — `NUMERIC` nie `integer`, by zmieścić 0,3%,
- **`career_projects`** (path_id FK, level enum, title, description, portfolio_outcome, market_rationale, todo) + **`project_anchor_leaves`** (project_id FK, leaf_name).

To czysto rekomendacja architektoniczna — **migracji NIE tworzyłem**. Decyzja i sign-off: Darek przez Ethana.

## 9. Otwarte (poza zakresem partii)

1. **Bank projektów** — 6 zestawów napisanych (Java/Data Engineer/Frontend/PM/BA/Salesforce); 17 ścieżek z szablonem `todo` (top-liście policzone, metoda autorowania gotowa) — kolejna iteracja produktowa Sophii.
2. **Liczba kotwic auto (30), rozmiar profilu (12)** — stałe `ANCHOR_COUNT`/`PROFILE_SIZE`. Do kalibracji z Sophią.
3. **Iteracja 2** (Sophia §1/§5): Admin/Wsparcie IT + ERP Consultant jako ręczne kotwice (`MANUAL_ANCHORS`); kolejne kotwice ręczne (iOS, React Native).
4. **Treść edukacyjna juniora** (Sophia §4d): 5 zasad strategii + rekomendacje „najlepsze wejścia" (QA, Wsparcie IT, Frontend, BI) + pary T-shape — pole `tShapePairs` już w modelu; copy onboardingu po stronie Mili/Chloe.
5. **Cztery decyzje Maxa spoza kuracji** (do potwierdzenia Sophii): ML Engineer→AI Engineer; DevOps hierarchia (Sophia §1 jej nie miała); CI/CD→Jenkins w Java + Playwright/Cypress w Frontend (dodane liście, by projekty miały na czym kotwiczyć); Xray/Zephyr/TestRail jako realne liście QA (Sophia myślała, że nieobecne).
