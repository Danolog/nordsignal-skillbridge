# Prowenicja danych rynku pracy — `job_market_data` + `career-model` (JustJoinIT)

**Wersja:** v7.0 · 2026-06-28
**Owner:** Ethan (CTO, ETAP A) · wcześniej Max (backend) · lens jakości / recenzja przed scaleniem: Leo (Tech Lead)
**Status:** Partia 5, warunek przed ETAP H domknięty — przypięcie i hash kanonicznego CSV (anty-dryf), supersesja nieświeżej bazy dla Cyber/DS/QA.

**Changelog v6.0 → v7.0 (2026-06-28, warunek przed ETAP H — Ethan, recenzja Leo):** **przypięcie i zahaszowanie kanonicznego CSV + jawne nazwanie źródła prawdy + udokumentowanie supersesji nieświeżej bazy.** To czysta dokumentacja — **zero zmian w kodzie, danych i artefaktach** (silnik na `08823b3` nietknięty, schema bazy nietknięta, zaciąg na prod NEON = nadal osobny ETAP H). Powód: przy partii 3 wykrył się **cichy dryf bazowy** (*baseline drift* — rozjazd wartości względem starej bazy artefaktu). Root cause ustalony przez Leo = **DANE**, nie kod: stara baza powstała na innym komputerze z nieco innego eksportu CSV; determinizm silnika pozostał intaktny. Bramka Leo przed ETAP H: przypiąć i zahaszować CSV w prowenicji, żeby przyszła przesiadka maszyny nie wywołała znów dryfu.
- **DANE KANONICZNE NAZWANE JAWNIE (nowa sekcja 0).** Źródłem prawdy jest **bieżący CSV w korzeniu repo** (`JustJoinIT_Oferty.csv` + `JustJoinIT_Technologie.csv`, zrzut 2026-03-19) + silnik na `08823b3`. Każdy artefakt (`career-model.json`, `job-market-justjoinit.json`) musi być przeliczony z TEGO CSV; nieświeże bazy z poprzednich komputerów NIE są źródłem.
- **HASH CSV PRZYPIĘTY (anty-dryf, sekcja 0).** md5 obu plików zweryfikowany własną komendą Ethana (`md5` na macOS) i zgodny z oczekiwaniem Leo: `Oferty` = `a72f1aad258ba1e9305edbbc94c8eeb2`, `Technologie` = `20307922daf82a125caf9db20d4d561c`. Każda przyszła przesiadka maszyny sprawdza te dwa hashe PRZED regenem — niezgodność = STOP (CSV inne, ryzyko dryfu).
- **SUPERSESJA Cyber/DS/QA udokumentowana (sekcja 0).** Świeży regen (`9f`+) zaktualizował liczniki kilku WTÓRNYCH technologii na ścieżkach Cybersecurity / Data Scientist / QA (np. Azure 32→29) względem nieświeżej bazy `fbdcaff` — korekta na poprawne, ODTWARZALNE wartości. Magnituda produktowo nieistotna (1–3 p.p. na wtórnych techach), **żadna oferta nie przeskoczyła między ścieżkami** (przypisanie 8694=8694 odtwarza się w 100%). Ślad dla audytu 5-letniego.

**Changelog v5.0 → v6.0 (2026-06-27, ETAP A — Ethan):** **silnik przełączony na SUROWY rynek dla WSZYSTKICH 23 ścieżek (Decyzja A Darka).** To regeneracja artefaktów w repo — **schema bazy NIETKNIĘTA**, zaciąg na prod NEON = osobny ETAP H.
- **KROK CZYSZCZENIA USUNIĘTY.** Filtry wzorem notebooka `175735_lab1.ipynb` (Pełny etat / geo PL+zdalne / typ umowy / widełki) wycięte z silnika. **Jedyna higiena = dedup po `Slug`** (pierwsze wystąpienie wygrywa). Powód: student ma widzieć, czego REALNIE wymaga rynek (pełny obraz), a mianownik ma być zgodny z liczbami referencyjnymi (371 ofert kategorii Security, nie 329 oczyszczonych). Usunięte z kodu: `WANTED_CONTRACTS`, `MIASTO_MAPPING`, `POLSKIE_MIASTA` (lista miast), `normalizeCity`, `passesGeoFilter`; `cleanOffers` → `dedupOffers`; `rawOffersByCategory` zlany w JEDNĄ ścieżkę surową (`groupByCategory` na zdeduplikowanym zbiorze).
- **UJEDNOLICENIE.** Wcześniej kotwice ręczne (UX/Security) liczyły na surowym segmencie, a ~21 kotwic auto na OCZYSZCZONYCH ofertach — teraz **wszystkie 23 liczą na tym samym surowym, zdeduplikowanym zbiorze** (auto = oferty przypisane nearest-profile; ręczne = cały segment kategorii).
- **DYSKRYMINATOR JAWNY (poprawka Leo, recenzja ETAP 0/B).** Silnik liczył `demandPercentage` obszaru po OBECNOŚCI `description` (`!area.description`) — krucha pułapka przy 23 ścieżkach (obszar z realnym popytem + opis po cichu gubił %). Zastąpione **jawnym typem węzła**: nowy `type: "context-group"` (grupa z kontekstem; metryką jest `unionShare`; % = null) obok `knowledge-area` (% popytu z danych) i `presentation-group` (etykieta legacy). O wartości %-vs-null decyduje WYŁĄCZNIE `type`, nie opis. 10 grup ścieżki cyber (kuracja Sophii, pilot `f1a9c5a`) przeniesione `knowledge-area`→`context-group` — **kuracja ZACHOWANA** (opisy + `unionShare` + % liści identyczne bajt-w-bajt; cyber był już surowy).
- **NOWE LICZBY:** `9 922` surowych → `9 922` unikalnych (dedup — **0 duplikatów `Slug`** w zrzucie) → **`8 586` przypisanych** → **POKRYCIE 86,5%**. 23 ścieżki, 23 kotwice (21 auto + 2 ręczne), 295 liści (6 nieobecnych w zrzucie), 35 projektów (18 napisanych + 17 szablonów todo). Determinizm potwierdzony (dwa przebiegi = identyczny md5).

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

## 0. Dane kanoniczne i przypięcie CSV (anty-dryf — warunek przed ETAP H, recenzja Leo)

> **Po co ta sekcja.** Przy partii 3 stara baza artefaktu okazała się policzona na INNYM komputerze z nieco innego eksportu CSV — wartości się rozjechały (cichy *baseline drift*, dryf bazowy). Leo ustalił, że winne są **dane, nie kod** (silnik liczy deterministycznie, ten sam CSV → ten sam wynik bajt-w-bajt). Żeby przyszła przesiadka maszyny NIE wywołała znów dryfu, przypinamy źródło prawdy nazwą, hashem i liczbą wierszy. To jest bramka, którą Leo postawił **przed ETAP H** (zaciąg na prod NEON).

### 0.1 Źródło prawdy — jawnie

**Kanoniczne źródło danych = bieżący CSV w korzeniu repozytorium** (`/JustJoinIT_Oferty.csv` + `/JustJoinIT_Technologie.csv`, zrzut z 2026-03-19) przeliczony silnikiem na commicie **`08823b3`** (gałąź `feat/etl-lift`). Każdy artefakt w repo — `src/lib/db/data/job-market-justjoinit.json` (płaski) i `src/lib/db/data/career-model.json` (hierarchiczny) — **musi pochodzić z TEGO CSV i TEGO silnika**.

**Nieświeże bazy z poprzednich komputerów NIE są źródłem prawdy.** Stara baza artefaktu (`fbdcaff`) powstała z innego eksportu CSV na innej maszynie — jej liczby są zastąpione (supersesja, sekcja 0.3). Przy każdym sporze „która liczba jest właściwa" wygrywa regen z kanonicznego CSV o hashu z sekcji 0.2, nie żadna wcześniejsza baza.

> **Uwaga o statusie plików w gicie.** CSV leżą w korzeniu repo jako pliki **nieśledzone** (*untracked* — w drzewie roboczym, ale nie commitowane; surowych danych rynku świadomie nie wrzucamy do historii gita). To NIE osłabia ich roli kanonicznej — przypięcie hashem (0.2) daje audytowi pełną odtwarzalność bez trzymania danych w repo. Ścieżkę do nich parametryzuje zmienna środowiskowa `JJIT_CSV_DIR` (procedura w sekcji 0.4).

### 0.2 Przypięcie + hash (zweryfikowane komendą Ethana `md5`, macOS)

| Plik (korzeń repo) | md5 (zweryfikowany) | Wiersze danych | + nagłówek = linie | Separator / kodowanie |
|---|---|---|---|---|
| `JustJoinIT_Oferty.csv` | `a72f1aad258ba1e9305edbbc94c8eeb2` | **9 922** ofert | 9 923 linie | `;` · utf-8 z BOM (utf-8-sig) |
| `JustJoinIT_Technologie.csv` | `20307922daf82a125caf9db20d4d561c` | **54 085** par technologia↔oferta | 54 086 linii | `;` · utf-8 z BOM (utf-8-sig) |

**Weryfikacja:** oba md5 policzone Ethanem realnie (`md5 JustJoinIT_Oferty.csv JustJoinIT_Technologie.csv`) **2026-06-28 zgadzają się z oczekiwaniem Leo z partii 3** — CSV jest tym samym, na którym powstał świeży regen (`9f`+). Liczba wierszy potwierdzona `wc -l` (9 923 / 54 086 linii = dane + 1 wiersz nagłówka). **Zasada anty-dryf: jeśli na przyszłej maszynie którykolwiek md5 NIE zgodzi się z powyższym — STOP, nie regeneruj, nie zaciągaj na prod; to znaczy, że CSV jest inny i grozi powtórką dryfu.**

### 0.3 Supersesja nieświeżej bazy — Cybersecurity / Data Scientist / QA

Świeży regen z kanonicznego CSV (`9f`+) zaktualizował liczniki kilku **wtórnych** (drugorzędnych, niekluczowych dla profilu ścieżki) technologii względem nieświeżej bazy `fbdcaff`. Przykład: **Azure 32 → 29** na ścieżkach Cyber/DS/QA. Charakter zmiany:

- **Korekta na poprawne, odtwarzalne wartości** — nie regresja. Stara baza miała liczby z innego eksportu CSV; świeże są policzalne 1:1 z hashu z sekcji 0.2.
- **Magnituda produktowo nieistotna:** rząd **1–3 punktów procentowych** na technologiach wtórnych. Top-skille i kształt ścieżek bez zmian.
- **Zero migracji ofert między ścieżkami:** całkowite przypisanie ofert do ścieżek odtwarza się w 100% — **8 694 = 8 694**, żadna oferta nie przeskoczyła do innej ścieżki. Zmieniły się wyłącznie liczniki wtórnych tagów technologii wewnątrz ścieżki, nie struktura.
- **Ślad dla audytu 5-letniego (Built-to-Sell, CLAUDE.md sekcja 2):** odbiorca firmy/audytor widzi jawnie, że różnica „stara baza vs świeży regen" to dane (inny eksport), nie zmiana logiki, i że wartość kanoniczna to świeży regen.

### 0.4 Procedura odtwarzalności (1:1 — kupujący, audytor, nowy komputer)

Każdy może odtworzyć artefakt bajt-w-bajt z kanonicznego CSV w trzech krokach:

1. **Sprawdź hash CSV PRZED regenem** (bramka anty-dryf): `md5 JustJoinIT_Oferty.csv JustJoinIT_Technologie.csv` → musi dać wartości z sekcji 0.2. Niezgodność = STOP (inny CSV).
2. **Przelicz artefakt silnikiem na `08823b3`:** `JJIT_CSV_DIR=<korzeń repo> pnpm exec tsx tools/etl-justjoinit.ts` (`JJIT_CSV_DIR` = katalog z oboma CSV; `pnpm exec tsx` = uruchom skrypt TypeScript bez kompilacji).
3. **Porównaj md5 wyniku z wersją w repo:** `md5 src/lib/db/data/job-market-justjoinit.json` (i analogicznie `career-model.json`) → musi się zgadzać z plikiem zacommitowanym. Zgodność = artefakt odtworzony 1:1; rozjazd przy zgodnych hashach CSV = sygnał regresji silnika (eskalacja do Ethana/Leo).

Determinizm silnika (zero `new Date()`, zero losowości, sortowanie stabilne) opisuje sekcja 5 — to on gwarantuje, że ten sam CSV zawsze daje ten sam artefakt.

---

## 1. Źródło

| | |
|---|---|
| **Dostawca** | JustJoinIT (portal ofert pracy IT, rynek PL) |
| **Pliki** | `JustJoinIT_Oferty.csv` (9 922 ofert) + `JustJoinIT_Technologie.csv` (54 085 wierszy technologia↔oferta) |
| **Format** | separator `;`, kodowanie utf-8 z BOM (utf-8-sig), końce linii CRLF |
| **Złączenie** | po kolumnie `Slug` (9 922 unikalnych slugów w obu plikach — pokrycie 1:1) |
| **Data zrzutu (snapshot)** | **2026-02** (`Data_publikacji` ofert = 2026-03-19; przyjęty znacznik zrzutu „2026-02") |
| **Pochodzenie** | analiza Darka (laboratorium WSB, notebook `175735_lab1.ipynb` — był bazą czyszczenia w v1–v5; **od v6/ETAP A czyszczenie USUNIĘTE**, silnik liczy na surowym rynku) |
| **Lokalizacja kanoniczna (od v7.0)** | **korzeń repo** (pliki nieśledzone) — przypięte hashem, sekcja 0.2; pierwotny eksport: dysk Darka (`/mnt/c/Users/D/Documents/WSB MERITO/.../AI/`) |

**Surowe CSV nie są commitowane do gita** (świadomie — surowych danych nie wrzucamy do historii). Od v7.0 leżą jednak jako **kanoniczne pliki nieśledzone w korzeniu repo**, przypięte hashem (sekcja 0) — to one są źródłem prawdy regenu, nie żadna wcześniejsza baza z innej maszyny. Do gita trafia wyłącznie policzony artefakt (`src/lib/db/data/job-market-justjoinit.json`), konfiguracja kotwic (`src/lib/db/data/anchor-config.ts`) i ten dokument. Ścieżkę do CSV parametryzuje zmienna środowiskowa `JJIT_CSV_DIR` (procedura: sekcja 0.4).

---

## 2. Łańcuch przetwarzania (narzędzie `tools/etl-justjoinit.ts`)

### Krok 1 — dedup ofert (ETAP A: jedyna higiena, BEZ czyszczenia)

| Krok | Reguła | Ofert po kroku |
|---|---|---|
| start | wszystkie wiersze `Oferty.csv` | 9 922 |
| 1 | **dedup po `Slug`** (pierwsze wystąpienie wygrywa); wiersz bez `Slug` pomijany (integralność klucza) | **9 922** |

**ETAP A (Decyzja A Darka, v6): krok czyszczenia USUNIĘTY.** W v1–v5 oferty przechodziły filtry wzorem notebooka `175735_lab1.ipynb` (Pełny etat → typ umowy → geo PL/zdalne) zanim weszły do liczenia. Od v6 **silnik liczy na SUROWYM rynku** — bez tych filtrów. Jedyna stała higiena to **dedup po `Slug`**: w tym zrzucie wszystkie 9 922 slugi są unikalne (0 duplikatów), więc dedup nic nie usuwa; gdyby duplikat się pojawił, wygrywa pierwsze wystąpienie (stabilnie). Wiersz bez `Slug` jest pomijany — nie da się go zdeduplikować (integralność klucza złączenia, NIE czyszczenie merytoryczne). Widełki nadal nieczytane (decyzja „salary precz", v5). Skutek: pełny obraz rynku i mianownik zgodny z liczbami referencyjnymi (np. **371 ofert kategorii Security**, nie 329 oczyszczonych). Usunięte z silnika: `WANTED_CONTRACTS`, `MIASTO_MAPPING`, `POLSKIE_MIASTA`, `normalizeCity`, `passesGeoFilter`.

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
5. **Przypisanie**: każdą (surową, zdeduplikowaną) ofertę → kotwica o **największym pokryciu profilu** = `|kompetencje_oferty ∩ profil12|`. **Tie-break v2 (anty-„magnes"):** przy równym pokryciu — kotwica **wybieralna** przed **zdegradowaną**, dalej **mniejsza** przed większą, dalej alfabetycznie (sekcja 5). **Pokrycie 0** → oferta NIEPRZYPISANA (pomijana).
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

`9 922` surowych → `9 922` unikalnych (dedup, **0 duplikatów `Slug`**) → **`8 586` przypisanych** → **POKRYCIE 86,5%** (1 336 ofert nieprzypisanych). **23 ścieżki — WSZYSTKIE widoczne** (3 oznaczone „rola docelowa"). 23 kotwice (21 auto + 2 ręczne). 295 liści (6 nieobecnych w zrzucie). 35 projektów (18 napisanych: 6 zestawów × 3 poziomy + 17 szablonów todo). **ZERO widełek.** *(ETAP A: liczby z SUROWEGO rynku — bez czyszczenia.)*

| Ścieżka | Rodzina e-CF | junior | ISCO | Komp. | Top 3 kompetencje (% popytu) |
|---|---|---|---|---|---|
| Java Developer | II | Średnia | 2512 | 15 | Java 89%, Spring Boot 48%, Spring 44% |
| .NET Developer | II | Średnia | 2512 | 13 | C# 61%, .Net 51%, SQL 28% |
| Python Developer | II | Wysoka | 2512/2514 | 13 | Linux 53%, Python 46%, Docker 31% |
| Backend Developer | II | Wysoka | 2512/2514 | 13 | Python 38%, AWS 30%, Java 27% |
| PHP Developer | II | Średnia | 2514 | 9 | SQL 41%, PHP 21%, Git 18% |
| Embedded / C++ Developer | II | Średnia | 2512 | 6 | C++ 77%, Python 42%, C 34% |
| Frontend Developer | II | Wysoka | 2513 | 15 | JavaScript 58%, TypeScript 58%, React 55% |
| Full-Stack Developer | II | Średnia | 2513/2512 | 13 | React 60%, TypeScript 51%, Java 45% |
| Android Developer | II | Średnia | 2514 | 10 | Java 55%, Kotlin 35%, Git 17% |
| Data Engineer | I | Średnia | 251/252 | 15 | Python 70%, SQL 53%, Databricks 37% |
| Data Analyst | I | Wysoka | 252 | 8 | Python 53%, SQL 48%, Power BI 23% |
| Data Scientist | I | Niska | 25 | 6 | Python 55%, SQL 28%, Databricks 19% |
| AI Engineer | I | Niska | 25 | 13 | Python 72%, AWS 21%, PyTorch 20% |
| DevOps Engineer | III | Niska | 2522 | 14 | Terraform 54%, Kubernetes 43%, Python 32% |
| Cybersecurity Specialist *(ręczna)* | III | Niska | 2529 | 37 | Python 15%, SIEM 11%, AWS 9% |
| QA Engineer | IV | Wysoka | 251 | 11 | Java 47%, JavaScript 28%, SQL 27% |
| Solution Architect | IV | **rola docelowa** | 2511/133 | 6 | Java 44%, Python 36%, Kubernetes 31% |
| Engineering Manager | IV | **rola docelowa** | 133/1330 | 6 | Java 42%, Agile 31%, React 29% |
| Business Analyst *(Rodzina V — Darek)* | V | Średnia | 2511 | 7 | UML 59%, BPMN 50%, SQL 37% |
| Project Manager | V | Średnia | 1330 | 6 | Jira 30%, Scrum 20%, Confluence 18% |
| Product Owner / Manager | V | Średnia | 1330 | 6 | Jira 12%, Scrum 12%, SaaS 11% |
| Salesforce Developer | V | Średnia | 2511 | 9 | Salesforce 34%, Apex 16%, HTML 11% |
| UX/UI Designer *(ręczna)* | V | Średnia | 2166 | 5 | Figma 61%, Adobe XD 13%, WCAG 9% |

*Liczby z PŁASKIEGO artefaktu (top liście integer, SUROWY udział). Pełna hierarchia (obszary z dużym %, liście z 1 miejscem po przecinku) jest w `career-model.json` — np. AI Engineer: obszar AI 66% → liście PyTorch 19,8%, LangChain 11,4%, Pandas 4,2%. Grupy z kontekstem (cyber) = `type: "context-group"`, % obszaru = null, miara = `unionShare`.*

---

## 4. Ograniczenia (uczciwie — wartość „Customer trust", CLAUDE.md sekcja 2)

1. **IT-only.** JustJoinIT pokrywa wyłącznie rynek IT — nie udajemy pokrycia marketingu/HR/finansów.
2. **Ogon nieprzypisany ~13,5% (1 336 ofert; ETAP A — surowy rynek).** Oferta bez ani jednej kompetencji wspólnej z profilem którejkolwiek z 23 kotwic zostaje pominięta. To głównie role wąskie/spoza kuracji (iOS, React Native, Platform Engineer, oferty bez wpisanych technologii) — świadomie ich nie zgadujemy. Druga fala: rozszerzenie listy kotwic/scaleń (konfiguracja, bez ruszania silnika).
3. **WIDEŁKI USUNIĘTE (v5, decyzja Darka).** Nie pokazujemy wynagrodzeń nigdzie — zmieniają się dynamicznie i rzadko mają pokrycie w rzeczywistości. Kolumna `salary_range` zostaje NULL. Konsekwencja: dawne ograniczenia „senior-skew zawyża medianę" i „braki widełek MNAR" **przestają być istotne** — nie liczymy median. Rozkład poziomów (Senior 54%/Junior 3,6%) zostaje jako sygnał do **warstwy juniora** (`juniorFriendliness`), nie do płac.
4. **Ogon nieprzypisany ~13,5%** — patrz pkt 2.
5. **Dylucja profilu w cienkich ścieżkach.** Przy małych kotwicach z szerokim profilem tie-break „mniejsza wygrywa" przyciąga oferty graniczne, a surowy rynek (ETAP A) podbija generyki — np. `PHP Developer` SQL 41% > PHP 21%, `Backend Developer` Python 38% / AWS 30% > Java 27% (płaski artefakt). Top-skill specyficzny nadal widoczny, ale % rozmyty wśród generyków. To **świadomy efekt metody „surowy udział"** (Darek: „Python zostaje"), nie błąd. Do poprawy w prezentacji: kuracja liści Sophii (ETAP A4) + dalsze scalenia — konfiguracja, nie silnik.
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

Pomiar (oferty wchłonięte przez 3 zdegradowane kotwice): literał „mniejsza wygrywa" = **1 368**; wariant z deprytetyzacją zdegradowanych = **341** (Software Eng 170 / Eng Mgr 124 / Solution Arch 90 — realne dopasowania, bez magnesu). Pokrycie identyczne (87,9%). **Uwaga (v6 / ETAP A):** te konkretne liczby (1 368 / 341, pokrycie 87,9%) pochodzą z przebiegu v5 (oczyszczonego). Silnik na SUROWYM rynku zachowuje tę samą zasadę i `TIE_BREAK_DEPRIORITIZED` bez zmian (pokrycie v6 = 86,5%); dokładny re-pomiar magnesu na raw = osobny follow-up. Wybrałem wariant z deprytetyzacją — to ten, który realizuje cel Sophii. (Koordynator dopuścił: „wystarczy sam tie-break, opisz co wybrałeś".)

- **Testy** (`src/lib/db/__tests__/etl-justjoinit.test.ts`): parser CSV (cudzysłowy, CRLF, BOM); **dedup po Slug — surowe zostają, BEZ filtrów geo/etat/umowy (ETAP A); pusty Slug pomijany**; normalizacja tytułu; scalenia (full-stack, ML→AI); **kotwice ręczne po kategorii** (mianownik = segment); tie-break (nie-deprytetyzowana bije deprytetyzowaną, mniejsza bije większą, alfabet); demand% liścia po wariancie nazwy; liście absent→null; hierarchia obszar→liść; **jawny dyskryminator (poprawka Leo): knowledge-area→% liczbowy, context-group/presentation-group→null**; **kuracja cyber zachowana (10 grup `context-group` z opisem + unionShare)**; **v5: ramy + warstwa juniora, BA w Rodzinie V, anchorLeaves ⊆ liście ścieżki, ZERO widełek**; determinizm; walidacja 5 rodzin e-CF.

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
- **`knowledge_areas`** (path_id FK, name, type ∈ {knowledge-area, context-group, presentation-group}, demand_percentage NULL),
- **`career_leaves`** (area_id FK, name, demand_percentage NUMERIC(4,1) NULL, source, note) — `NUMERIC` nie `integer`, by zmieścić 0,3%,
- **`career_projects`** (path_id FK, level enum, title, description, portfolio_outcome, market_rationale, todo) + **`project_anchor_leaves`** (project_id FK, leaf_name).

To czysto rekomendacja architektoniczna — **migracji NIE tworzyłem**. Decyzja i sign-off: Darek przez Ethana.

## 9. Otwarte (poza zakresem partii)

1. **Bank projektów** — 6 zestawów napisanych (Java/Data Engineer/Frontend/PM/BA/Salesforce); 17 ścieżek z szablonem `todo` (top-liście policzone, metoda autorowania gotowa) — kolejna iteracja produktowa Sophii.
2. **Liczba kotwic auto (30), rozmiar profilu (12)** — stałe `ANCHOR_COUNT`/`PROFILE_SIZE`. Do kalibracji z Sophią.
3. **Iteracja 2** (Sophia §1/§5): Admin/Wsparcie IT + ERP Consultant jako ręczne kotwice (`MANUAL_ANCHORS`); kolejne kotwice ręczne (iOS, React Native).
4. **Treść edukacyjna juniora** (Sophia §4d): 5 zasad strategii + rekomendacje „najlepsze wejścia" (QA, Wsparcie IT, Frontend, BI) + pary T-shape — pole `tShapePairs` już w modelu; copy onboardingu po stronie Mili/Chloe.
5. **Cztery decyzje Maxa spoza kuracji** (do potwierdzenia Sophii): ML Engineer→AI Engineer; DevOps hierarchia (Sophia §1 jej nie miała); CI/CD→Jenkins w Java + Playwright/Cypress w Frontend (dodane liście, by projekty miały na czym kotwiczyć); Xray/Zephyr/TestRail jako realne liście QA (Sophia myślała, że nieobecne).

---

## 10. Wgranie na produkcję — 2026-06-25 (ZREALIZOWANE)

Realny rynek wszedł na żywą bazę. Pełny zapis (Built-to-Sell — audytor odtworzy, **co i kiedy** poszło na prod):

- **Kiedy / kto:** 2026-06-25, sign-off i wykonanie ręczne Darka (czerwona linia: `DELETE` bez `WHERE` na danych prod).
- **Kanał:** Neon Console → SQL Editor (projekt `SkillBridge_AI` = id `long-pond-11214233`, org `org-snowy-credit-81923605`, gałąź `main`/`neondb`). **Nie** przez `pnpm db:seed` — ten skrypt jest niszczący (kasuje `projects`/`students`/`submissions`) i ma strażnika. Świadomie wąska operacja.
- **Zakres:** **wyłącznie** tabela `job_market_data` — `DELETE` całości + `INSERT` 240 wierszy z artefaktu. Zero zmian w innych tabelach (brak FK przychodzących; `user`/`students`/`projects`/`project_submissions` nietknięte). Aplikacja czyta tę tabelę tylko do odczytu.
- **Czym:** `tools/load-job-market-prod.sql` (sha256 `1c321cfe8543…`), wygenerowany deterministycznie przez `tools/gen-job-market-sql.mjs` z `src/lib/db/data/job-market-justjoinit.json` (sha256 `35bd9ab013b4…`). Transakcja atomowa `BEGIN … COMMIT` z backupem `job_market_data_bak` w tej samej transakcji.
- **Wynik (zweryfikowany na prod osobnym zapytaniem):** `count(*) = 240`, `count(DISTINCT career_goal) = 23`, `salary_range` NULL we wszystkich 240. Poprzedni stan (90 wierszy) zabezpieczony w `job_market_data_bak` (do usunięcia po kilku dniach: `DROP TABLE job_market_data_bak;`).
- **Atomowość zadziałała w praktyce.** Pierwsze podejście miało literówkę w zapytaniu kontrolnym (`SELECT count(DISTINCT career_goal) …` **bez** `FROM job_market_data`) → transakcja abortowała na sanity-checku, **prod został bez zmian** (mimo że `DELETE 90` i `INSERT 240` już „przeszły" w obrębie nieukończonej transakcji). Poprawka: dodane `FROM job_market_data` + `DROP TABLE IF EXISTS job_market_data_bak` (idempotencja ponownego uruchomienia). To dowód, że projekt „transakcja + kontrola liczb przed `COMMIT`" chroni produkcję przed niedoróbką w samym skrypcie.
- **Rollback (gdyby zaszła potrzeba, póki `_bak` istnieje):** `BEGIN; DELETE FROM job_market_data; INSERT INTO job_market_data SELECT * FROM job_market_data_bak; COMMIT;`.
