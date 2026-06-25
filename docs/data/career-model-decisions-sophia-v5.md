# MODEL PRODUKTU v5.0 — ramy e-CF/SFIA/ESCO + warstwa juniora, na naszej architekturze

**Wersja:** v5.0 · 2026-06-25 · autor: Sophia (PO SkillBridge)
**Historia:** v1 (kategoriowa) → v2 (anchors) → v3 (buildable/knowledge) → v4 (hierarchia obszar→liść z % wszędzie) → **v5 (struktura dokumentu „Mapa Ścieżek Kariery" na naszym pipeline).** Iteracje v1–v4 były roboczymi notatkami (scratchpad, poza repo); ich wnioski są w tym dokumencie, w `job-market-provenance.md` (changelog) i zmaterializowane w `anchor-config.ts` + `career-model.json`.
**Decyzja Darka (v5):** przyjmujemy STRUKTURĘ dokumentu `mapa-sciezek-kariery-14-ramy.txt` (5 rodzin e-CF, mapowanie ram, junior-layer) jako docelowy model produktu — ale na NASZEJ architekturze, pipeline i podziale ścieżek.
**Korekta Darka (bank projektów):** projekty dokumentu są PRZYKŁADOWE — wzór formatu/poziomów, NIE gotowiec. Opracowujemy WŁASNE projekty zakotwiczone na NASZYCH buildable-leaves z realnym % popytu (sekcja 7). To spina łańcuch projekt ↔ kompetencja ↔ popyt rynkowy.
**Status:** ZATWIERDZONE PRODUKTOWO przez Darka 2026-06-25 (sign-off na diagramie v5). Promowane ze scratchpada do `docs/` jako trwały zapis decyzji (Built-to-Sell). Materializacja: `src/lib/db/data/career-model.{ts,json}` + `anchor-config.ts`; przegląd Ethana; PR #11.

> **KOREKTA po finalnej decyzji Darka (widełki precz, 2026-06-25):** ten dokument powstał wcześniej i w sekcji 4 oraz **sekcji 6 pkt 2** mówi o widełkach („jeden zakres per ścieżka"). **To nieaktualne.** Finalna decyzja: **wynagrodzenia usunięte wszędzie** — nie liczone, nie zapisywane, kolumna `salary_range` zostaje NULL. Obowiązuje `docs/data/job-market-provenance.md` v5. % popytu zostaje jedynym sygnałem rynkowym.

**Wejścia:** dokumenty źródłowe dostarczone przez Darka — „Mapa Ścieżek Kariery w IT" (PDF: ramy e-CF/SFIA/ISCO + warstwa juniora) i „Przewodnik Kariery" (DOCX: 12 ścieżek) — oraz wynik iteracji v4 (hierarchia obszar→liść, dziś w `career-model.json`) i artefakt pipeline `job-market-justjoinit.json` (87,9% pokrycia).

**Co ZOSTAJE nasze (twardo):** (1) podział ścieżek — Java/.NET/Python OSOBNO (dokument scala je); (2) pipeline — realny % per kompetencja, przypisanie oferta→ścieżka, hierarchia obszar→liść z v4; (3) format = nasz model danych, nie PDF.
**Zasada nadrzędna (CLAUDE.md §7):** AI to narzędzie, nie sędzia. Człowiek-wykładowca ma ostatnie słowo przy ocenie kompetencji.

---

## 1. PIĘĆ RODZIN e-CF (grupowanie nadrzędne — zastępuje nasze ad-hoc rodziny z v2)

Procesy e-CF (EN 16234): PLAN → BUILD → RUN → ENABLE → MANAGE. Rodziny dokumentu = makro-procesy e-CF. Pole modelu: `family` (1 z 5) + `eCfArea` (procesy).

| Rodzina | Obszar e-CF | Nasze ścieżki (po naszym podziale) |
|---|---|---|
| **I — Dane i Sztuczna Inteligencja** | PLAN / BUILD / ENABLE | Data Engineer, Data Analyst, **Business Analyst** (uwaga niżej), Data Scientist, AI Engineer |
| **II — Inżynieria Oprogramowania** | BUILD | Java Developer, .NET Developer, Python Developer, Backend Developer, PHP Developer, Embedded/C++ Developer, Frontend Developer, Full-Stack Developer, Android Developer |
| **III — Infrastruktura, Chmura i Bezpieczeństwo** | RUN / ENABLE | DevOps Engineer, Cybersecurity Specialist, *(Administracja i Wsparcie IT — iteracja 2)* |
| **IV — Jakość, Testy i Architektura** | PLAN / ENABLE | QA Engineer, Solution Architect, *(Engineering Manager — uwaga niżej)* |
| **V — Zarządzanie, Produkt i Systemy Biznesowe** | MANAGE / PLAN | Project Manager, Product Owner / Manager, Salesforce Developer, UX/UI Designer, *(ERP Consultant — iteracja 2)* |

**Uwagi o przypisaniu rodzin (nasze rozstrzygnięcia):**
- **Business Analyst** — dokument scala analitykę biznesową do Rodziny I (BI) ORAZ do ścieżki 13 (ERP/CRM → „business analyst"). Nasz pipeline pokazał, że nasz Business Analyst to UML/BPMN/Enterprise Architect (analiza systemowa), nie BI. **Rozstrzygnięcie:** Business Analyst zostaje w **Rodzinie I** (najbliżej danych/analizy), ale dziedziczy ramy ISCO 2511 systems analysts (jak ścieżka 13/11 dokumentu), nie tylko BI. To świadome — nasz BA jest hybrydą, kotwiczę go tam, gdzie ma najmocniejszy sygnał.
- **Engineering Manager** — dokument nie ma osobnej ścieżki EM (mieści ją w MANAGE/ICT managers przy ścieżce 11/12). Zostaje u nas widoczny jako **rola docelowa** w Rodzinie IV (przy Architekturze — obie strategiczne/docelowe) z ramą ISCO 133 ICT managers. Oznaczony „rola docelowa".
- **Solution Architect** w dokumencie jest w Rodzinie IV (Jakość/Architektura), nie w Inżynierii — trzymam tak samo (Rodzina IV).

---

## 2. MAPOWANIE 14 ŚCIEŻEK DOKUMENTU ↔ NASZE ~20 ŚCIEŻEK

Gdzie dokument SCALA, a my DZIELIMY — rozdzielam content (ramy, stanowiska, wzór projektów) na nasze węższe ścieżki. „Dziedziczy" = bierze ramy/rodzinę/stanowiska ścieżki dokumentu; projekty piszemy własne (sekcja 7).

| Ścieżka dokumentu (#) | Nasze ścieżki | Jak rozdzielamy |
|---|---|---|
| 1. Inżynieria Danych i Analityka (BI) | **Data Engineer**, **Data Analyst**, **Business Analyst** | DE = inżynieria pipeline (Spark/Airflow/dbt); DA = BI (Power BI/SQL/Excel); BA = analiza systemowa (UML/BPMN) — BA bierze też ramy ISCO 2511 |
| 2. Data Science, ML i AI | **Data Scientist**, **AI Engineer** | DS = klasyczny ML (Pandas/Scikit-learn/XGBoost); AI = LLM/RAG/deep (PyTorch/LangChain) |
| 3. Backend Enterprise: Java i .NET | **Java Developer**, **.NET Developer** | rozdział po stacku: Java/Spring vs .Net/C#; obie dziedziczą rodzinę II, ramę ISCO 2512, stanowiska Software Engineer |
| 4. Backend i Języki Skryptowe/Systemowe | **Python Developer**, **Backend Developer**, **PHP Developer**, **Embedded/C++ Developer** | Python = Django/FastAPI; Backend = polyglot/Node; PHP = Symfony/Laravel; Embedded = C/C++ |
| 5. Frontend i Fullstack Web | **Frontend Developer**, **Full-Stack Developer** | Frontend = czysty front (React/TS); Full-Stack = front+Node backend |
| 6. Aplikacje Mobilne i GameDev | **Android Developer** | Mobile → Android (GameDev zdropowany — niskie widełki, nisza; potwierdza dokument „najmniejszy segment") |
| 7. DevOps, Chmura i Platform Engineering | **DevOps Engineer** | 1:1 (Cloud Engineer wchłonięty w v2) |
| 8. Cyberbezpieczeństwo | **Cybersecurity Specialist** | 1:1 |
| 9. Administracja, Sieci i Wsparcie IT | *(Administracja i Wsparcie IT — ITERACJA 2)* | 1 ścieżka, ręczna kotwica; Support 23% wejścia — najłatwiejszy start |
| 10. Testowanie i QA | **QA Engineer** | 1:1 (Test/QA Automation wchłonięte w v2) |
| 11. Architektura Systemów IT | **Solution Architect** (+ **Engineering Manager** jako pokrewna docelowa) | SA = architektura; EM = zarządzanie inżynierią (obie docelowe) |
| 12. Zarządzanie Projektami i Produktem | **Project Manager**, **Product Owner / Manager** | PM = dostawa (Jira/Agile/PRINCE2); PO/PM = produkt (Product Management/roadmapy) |
| 13. Systemy Biznesowe i Wdrożenia ERP/CRM | **Salesforce Developer** (+ *ERP Consultant — iteracja 2*) | Salesforce = realna kotwica dziś; ERP/SAP/Workday = iteracja 2 |
| 14. Projektowanie UX/UI | **UX/UI Designer** | 1:1 |

**Wynik:** 14 ścieżek dokumentu → **~20 naszych widocznych** (+ 2 iteracja 2: Admin/Wsparcie, ERP). Wszystkie widoczne (zero ukrytych — dyrektywa junior-layer, sekcja 4).

---

## 3. RAMY PER ŚCIEŻKA (e-CF / SFIA / ESCO-ISCO) — nowe pola modelu

Pola: `eCfArea` (procesy), `sfiaCategory`, `iscoCode` + `iscoLabel`, `escoOccupation`. Dziedziczone ze ścieżki dokumentu wg mapowania sekcji 2.

| Nasza ścieżka | e-CF | SFIA | ESCO/ISCO |
|---|---|---|---|
| Data Engineer | BUILD + ENABLE | Development & Implementation (Data engineering) · Strategy & Architecture | ISCO 251 / 252; „data engineer" |
| Data Analyst | BUILD + ENABLE | Development & Implementation (Data engineering) | ISCO 252; „data analyst" |
| Business Analyst | PLAN + ENABLE | Change & Transformation (Business analysis) | ISCO 2511 systems analysts; „business analyst" |
| Data Scientist | PLAN + BUILD | Development & Implementation (Data science, ML) | ISCO 25; „data scientist" |
| AI Engineer | PLAN + BUILD | Development & Implementation (Machine learning) | ISCO 25; „Machine Learning Engineer" |
| Java Developer | BUILD | Development & Implementation (Programming / software development) | ISCO 2512 Software developers |
| .NET Developer | BUILD | Development & Implementation (Programming / software development) | ISCO 2512 Software developers |
| Python Developer | BUILD | Development & Implementation | ISCO 2512 / 2514 |
| Backend Developer | BUILD | Development & Implementation | ISCO 2512 / 2514 |
| PHP Developer | BUILD | Development & Implementation | ISCO 2514 |
| Embedded/C++ Developer | BUILD | Development & Implementation | ISCO 2512 |
| Frontend Developer | BUILD | Development & Implementation | ISCO 2513 Web and multimedia developers |
| Full-Stack Developer | BUILD | Development & Implementation | ISCO 2513 / 2512 |
| Android Developer | BUILD | Development & Implementation | ISCO 2514 Applications programmers / 2513 |
| DevOps Engineer | RUN + BUILD | Delivery & Operations (Systems/infrastructure) | ISCO 2522 Systems administrators; „DevOps engineer" |
| Cybersecurity Specialist | RUN + ENABLE | Security (Delivery & Operations / Strategy) | ISCO 2529 ICT security specialists |
| QA Engineer | BUILD + ENABLE | Development & Implementation (Testing) / Skills & Quality | ISCO 251; „software tester" |
| Solution Architect | PLAN | Strategy & Architecture (Solution / Enterprise architecture) | ISCO 2511 ICT system architect / 133 ICT managers |
| Engineering Manager | MANAGE | Change & Transformation + Relationships & Engagement | ISCO 133 ICT managers / 1330 |
| Project Manager | MANAGE | Change & Transformation + Relationships & Engagement | ISCO 1330 ICT service managers; „project manager" |
| Product Owner / Manager | MANAGE / PLAN | Change & Transformation | ISCO 1330; „product owner" |
| Salesforce Developer | BUILD + ENABLE + MANAGE | Change & Transformation (Business analysis) / Delivery & Operations | ISCO 2511; „ERP/CRM consultant" |
| UX/UI Designer | PLAN + ENABLE | Development & Implementation (User experience) | ISCO 2166 graphic & multimedia designers; „UX designer" |
| *(Admin/Wsparcie IT — it.2)* | RUN | Delivery & Operations | ISCO 35 ICT technicians (3511/3512) + 2522 |
| *(ERP Consultant — it.2)* | BUILD + ENABLE + MANAGE | Change & Transformation | ISCO 2511; „ERP consultant" |

---

## 4. WARSTWA JUNIORA (kluczowa — dyrektywa Darka)

**Nie dzielimy ścieżek na junior/senior. Trzymamy pełen popyt — też kompetencje seniorów (nie wycinamy). DODAJEMY warstwę juniora**, bo dla studenta najważniejsza.

### 4a. Pole `juniorFriendliness` per ścieżka
Wartości: `Wysoka` / `Średnia` / `Niska` / `rola docelowa`. Źródło: dokument (sekcja 5 macierz) + udział ofert juniorskich w kategorii (nasz pipeline może doliczyć).

| Ścieżka | juniorFriendliness | Źródło |
|---|---|---|
| QA Engineer | **Wysoka** (Wejściowa→Wysoka) | dok. „najlepszy techniczny punkt wejścia" |
| Frontend Developer | **Wysoka** | dok. „szybkie widoczne efekty" |
| Full-Stack Developer | Średnia/Wysoka | dok. ścieżka 5 |
| Data Analyst (BI) | **Wysoka** (z BI) | dok. „SQL+Power BI fundament" |
| Administracja i Wsparcie IT (it.2) | **Wysoka** | dok. „najczęstszy realny start" |
| Data Engineer | Średnia | dok. ścieżka 1 |
| Business Analyst | Średnia | analiza systemowa wymaga kontekstu |
| Java / .NET Developer | Średnia | dok. ścieżka 3 |
| Python / Backend / PHP Developer | Średnia/Wysoka | dok. ścieżka 4 |
| Embedded/C++ Developer | Średnia | nisza, wymaga podstaw |
| Android Developer | Średnia | dok. ścieżka 6 |
| Project Manager | Średnia | dok. ścieżka 12 |
| Product Owner / Manager | Średnia | jw. |
| UX/UI Designer | Średnia/Wysoka | dok. ścieżka 14 |
| Salesforce Developer | Średnia | dok. „wejście przez juniora-konsultanta" |
| DevOps Engineer | **Niska** | dok. „cel na później, po backendzie/admin" |
| Cybersecurity Specialist | **Niska** | dok. „po podstawach sieci/systemów" |
| Data Scientist | **Niska** | dok. „solidne podstawy matematyczne" |
| AI Engineer | **Niska** | jw. (0% junior w naszych danych) |
| Solution Architect | **rola docelowa** | dok. „brak — rola docelowa" |
| Engineering Manager | **rola docelowa** | rola po latach |

### 4b. Role docelowe — POKAZANE, oznaczone, NIE ukrywane
Solution Architect, Engineering Manager (i częściowo DevOps/Cyber/DS jako „cele na później") widoczne z etykietą `targetRole: true` + komunikat „rola docelowa, nie punkt startu" (jak dokument). Student je widzi (motywacja, ścieżka awansu T-shape), ale wie, że nie zaczyna od nich.

### 4c. Projekty 3-poziomowe = drabina junior→senior
Poziom łatwy = junior potrafi zrobić bez doświadczenia; zaawansowany = poziom mid/senior. To naturalna drabina (sekcja 7).

### 4d. Rekomendacje „najlepsze wejścia dla juniora" (panel/onboarding)
Wprost z dokumentu sekcja 11 — wyróżnione w UI jako wskazówka startowa:
- **Najlepsze punkty wejścia:** QA, Wsparcie/Administracja IT, Frontend, Analityka danych (BI).
- **Ścieżki docelowe (nie startowe):** Architektura, Cyberbezpieczeństwo, Data Science/AI, DevOps.
- **5 zasad strategii** (przebij ścianę juniora projektami; celuj w Mid; ucz się klastrami ~5 technologii; profil T-shape; przygotuj na B2B/zdalne) — jako treść edukacyjna onboardingu.
- **Ścieżki łączone T-shape:** Inżynieria danych→Data Science · Backend→DevOps · Frontend→UX/UI · Administracja→Cyberbezpieczeństwo · QA→Automatyzacja/SDET. Pole `tShapePairs` per ścieżka.

---

## 5. HIERARCHIA OBSZAR→LIŚĆ (z v4 — bez zmian, stoi)

Model kompetencji pozostaje z v4: każda ścieżka ma obszary wiedzy (knowledge, duży % popytu ścieżki z JSON) → liście-konkrety (buildable, własny realny % liczony przez Maxa w obrębie ścieżki, BEZ progu 5%, po wariancie nazwy). Pełna hierarchia per ścieżka + tabela wariantów nazw (Scikit-learn→`scikit-learn`, dbt→`DBT`, LangChain→`Langchain`, FastAPI→`fastapi` itd.) + liście nieobecne w zrzucie (Miro/GitLab CI/Jupyter/Xray/Zephyr/TestRail = `null` + flaga „kuracja ekspercka") — **zmaterializowane w `src/lib/db/data/career-model.json` (pełna hierarchia per ścieżka); tabela wariantów nazw opisana w `docs/data/job-market-provenance.md` §changelog v3→v4.** Nie powielam tu; v5 nadbudowuje rodziny+ramy+junior NAD tą hierarchią.

**Spięcie z bankiem projektów (sedno korekty Darka):** projekt kotwiczy na **top buildable-leaves** ścieżki — tych z najwyższym realnym % popytu. To zamyka łańcuch: rynek wymaga (% liścia) → kompetencja w hierarchii → projekt ćwiczy dokładnie ją.

---

## 6. RATYFIKACJE (utrzymane z v4)

1. **IT-only** — start tylko IT; uczciwy komunikat dla nie-IT.
2. **Widełki — jeden zakres per ścieżka** = zakres rynkowy stanowiska, wszystkie poziomy (neutralnie, bez ramki senioralnej). Dokument potwierdza skok Junior→Mid ~2× — to treść edukacyjna, nie zmiana schemy. Per-poziom = iteracja 2.
3. **Czerwone węzły = luki rynkowe** — czerwony liść = wymagany przez rynek ∧ brak u studenta; projekt pod czerwony liść; człowiek decyduje (§7).
4. **Progi Ethana** — zniesione dla liści (inaczej ucinają Pandas/Burp/Selenium); zostają jako filtr prezentacji.

---

## 7. BANK PROJEKTÓW — własne projekty zakotwiczone na NASZYCH liściach (korekta Darka)

**Metoda autorowania (dla mnie i dla kolejnych iteracji — reguła, nie gotowiec):**

1. **Weź top buildable-leaves ścieżki** z hierarchii v4 (te z najwyższym realnym % popytu — to one są wymagane przez rynek).
2. **Łatwy** — 1-2 liście o NAJWYŻSZYM %, jeden obszar, gotowy do zrobienia bez doświadczenia. Cel: pierwszy działający artefakt + nauka kluczowego narzędzia.
3. **Średni** — 3-4 liście z 2 obszarów, integracja, własne decyzje. Cel: projekt portfolio łączący klaster technologii (dokument: rynek oczekuje ~5 technologii).
4. **Zaawansowany** — 5+ liści z wielu obszarów, jakość produkcyjna (testy + deploy + dokumentacja). Cel: projekt wyróżniający na rozmowie, pokrywający większość top-liści ścieżki.
5. **Warunek spięcia:** każdy `anchorLeaves[]` projektu MUSI być podzbiorem buildable-leaves tej ścieżki z naszego pipeline. Zero narzędzi spoza hierarchii ścieżki (inaczej projekt ćwiczy coś, czego rynek dla tej ścieżki nie wymaga).
6. **Różnica vs dokument:** dokument proponuje projekt „z głowy"; my wyprowadzamy go z danych o popycie tej konkretnej ścieżki. Łańcuch projekt↔kompetencja↔% rynku jest jawny i audytowalny (Built-to-Sell).

**Schemat danych (dla Maxa):** `project { pathId, level: "latwy|sredni|zaawansowany", title, anchorLeaves[], description, portfolioOutcome, marketRationale }`. `marketRationale` = jednozdaniowe „dlaczego te liście" (np. „Spring Boot 48% + PostgreSQL 20% + Docker 20% = rdzeń ofert Java").

### Napisane pełne zestawy (podzbiór reprezentatywny: dawne luki PM/BA/Salesforce + flagowe Java/Data Engineer/Frontend)

#### Java Developer — liście-kotwice: Java 81%, Spring Boot 48%, Spring 45%, SQL 31%, Hibernate 25%, PostgreSQL 20%, Docker 20%, Kubernetes 19%, Kafka 12%, JUnit, Swagger
- **Łatwy — „REST API katalogu książek (Spring Boot + PostgreSQL)"**
  Aplikacja CRUD: encje, repozytoria, kontrolery REST, walidacja, dokumentacja Swagger, kilka testów JUnit. *anchorLeaves:* Java, Spring Boot, PostgreSQL, Swagger, JUnit. *Outcome:* działające API w repo z dokumentacją. *marketRationale:* Spring Boot 48% + PostgreSQL 20% = rdzeń ofert Java.
- **Średni — „System rezerwacji z autoryzacją (Spring Security + Hibernate + Docker)"**
  Rezerwacje (sale/wizyty), warstwa Hibernate/JPA, autoryzacja ról JWT, konteneryzacja Docker, testy integracyjne. *anchorLeaves:* Java, Spring Boot, Hibernate, SQL, Docker, JUnit. *Outcome:* aplikacja z auth i bazą w kontenerze. *marketRationale:* Hibernate 25% + Docker 20% + Spring = typowy stack mid.
- **Zaawansowany — „Mikrousługi zamówień z Kafka i CI/CD"**
  2-3 usługi Spring Boot komunikujące się przez Kafka, każda w Dockerze, deploy na Kubernetes (lokalnie/minikube), pipeline CI/CD, testy. *anchorLeaves:* Java, Spring Boot, Kafka, Docker, Kubernetes, CI/CD. *Outcome:* system mikrousługowy z pełną dokumentacją. *marketRationale:* Kafka 12% + Kubernetes 19% = sygnał ofert senior Java.

#### Data Engineer — liście-kotwice: Python 70%, SQL 50%, Databricks 35%, Apache Spark 28%, Snowflake, BigQuery, Airflow, dbt[DBT 45], ETL(obszar), Azure/AWS
- **Łatwy — „Pipeline czyszczący dane z publicznego API (Python + SQL)"**
  Skrypt Python pobiera dane z 1 API, czyści (Pandas), ładuje do bazy SQL, podstawowe zapytania analityczne. *anchorLeaves:* Python, SQL. *Outcome:* powtarzalny skrypt ETL w repo. *marketRationale:* Python 70% + SQL 50% = dwie najczęstsze kompetencje ścieżki.
- **Średni — „ELT z orkiestracją (Airflow + dbt + Snowflake/BigQuery)"**
  Airflow uruchamia cyklicznie pobranie z API → ładowanie do hurtowni chmurowej → transformacje w dbt → modele warstwowe. *anchorLeaves:* Python, SQL, Airflow, dbt, BigQuery/Snowflake. *Outcome:* udokumentowany pipeline ELT. *marketRationale:* Airflow + dbt[DBT 45] + Snowflake 28% = nowoczesny stos danych.
- **Zaawansowany — „Mini-hurtownia end-to-end na Spark/Databricks"**
  Warstwy surowa→oczyszczona→martowa, przetwarzanie Spark/PySpark na Databricks, testy jakości danych, dashboard na wierzchu. *anchorLeaves:* Python, Apache Spark, PySpark, Databricks, SQL, dbt. *Outcome:* repozytorium z architekturą warstwową. *marketRationale:* Databricks 35% + Spark 28% = rdzeń ofert senior DE.

#### Frontend Developer — liście-kotwice: JavaScript 61%, TypeScript 57%, React 43%, Next.js, Angular, Node.js 28%, CSS/HTML, Tailwind, Redux
- **Łatwy — „Responsywny katalog filmów (React + TypeScript + Tailwind)"**
  SPA pobierająca dane z publicznego API (TMDB), RWD, komponenty, routing. *anchorLeaves:* JavaScript, TypeScript, React, CSS/Tailwind. *Outcome:* wdrożona strona (Vercel) w repo. *marketRationale:* TypeScript 57% + React 43% = najsilniejszy klaster frontu.
- **Średni — „Aplikacja z zarządzaniem stanem i autoryzacją (Next.js + Redux)"**
  Next.js (SSR), logowanie, zarządzanie stanem (Redux), formularze, integracja REST API. *anchorLeaves:* TypeScript, React, Next.js, Redux, Node.js. *Outcome:* aplikacja z auth i SSR. *marketRationale:* Next.js + Redux = typowe wymagania mid frontu.
- **Zaawansowany — „Produkt SaaS frontend z testami E2E"**
  Pełna aplikacja (dashboard + płatności testowe), komponenty wielokrotnego użytku, testy E2E (Playwright), CI, deploy. *anchorLeaves:* TypeScript, React, Next.js, Node.js, Playwright. *Outcome:* produkt z testami i pipeline. *marketRationale:* pokrycie większości top-liści + jakość produkcyjna.

#### Project Manager — liście-kotwice: Jira 39%, Confluence 23%, MS Project, Trello, Asana (+ obszary Agile/Scrum/PM jako teoria)
- **Łatwy — „Kompletny backlog produktu w Jira"**
  Darmowa instancja Jira: Epiki → User Stories → precyzyjne kryteria akceptacji dla wymyślonej aplikacji; konfiguracja tablicy. *anchorLeaves:* Jira. *Outcome:* publiczny eksport/zrzut backlogu. *marketRationale:* Jira 39% = najczęstsze narzędzie ścieżki.
- **Średni — „Case study cyklu sprintu (Jira + Confluence)"**
  Symulacja 1 sprintu: plan, rejestr ryzyk w Confluence, diagramy velocity/burndown, raport retrospektywy. *anchorLeaves:* Jira, Confluence. *Outcome:* dokumentacja sprintu pokazująca proces. *marketRationale:* Jira + Confluence 23% = rdzeń narzędziowy PM.
- **Zaawansowany — „Symulacja prowadzenia mini-produktu (3 sprinty)"**
  3 sprinty w Jira, roadmapa (MS Project/Confluence), metryki, rejestr decyzji, raport końcowy z wnioskami. *anchorLeaves:* Jira, Confluence, MS Project. *Outcome:* pełna dokumentacja prowadzenia produktu. *marketRationale:* dodanie MS Project 19 + roadmapa = poziom mid/senior PM.

#### Business Analyst — liście-kotwice: UML 60%, BPMN 51%, Enterprise Architect 26%, SQL 38%, Jira 31%, Confluence 21%, Postman
- **Łatwy — „Model procesu biznesowego w BPMN"**
  Modelowanie realnego procesu (np. obsługa reklamacji) w BPMN: as-is, uczestnicy, punkty decyzyjne. *anchorLeaves:* BPMN. *Outcome:* czytelny diagram procesu w repo. *marketRationale:* BPMN 51% = druga najczęstsza kompetencja BA.
- **Średni — „Specyfikacja systemu (UML + SQL + Enterprise Architect)"**
  Diagram przypadków użycia (UML), model danych (ERD/SQL), wymagania funkcjonalne/niefunkcjonalne, mapowanie as-is→to-be (BPMN), spięte w Enterprise Architect. *anchorLeaves:* UML, BPMN, SQL, Enterprise Architect. *Outcome:* pakiet dokumentacji gotowy dla developera. *marketRationale:* UML 60% + BPMN 51% + Enterprise Architect 26% = trójca BA.
- **Zaawansowany — „Analiza usprawnienia end-to-end z integracjami (UML/BPMN + Postman + Jira)"**
  Analiza luk as-is/to-be, projekt rozwiązania (UML/BPMN), specyfikacja integracji REST (testy w Postman), business case, backlog w Jira. *anchorLeaves:* UML, BPMN, SQL, Postman, Jira, Enterprise Architect. *Outcome:* kompletna analiza klasy korporacyjnej. *marketRationale:* pełne pokrycie top-liści BA + integracje.

#### Salesforce Developer — liście-kotwice: Salesforce 31%, Apex 15%, LWC 8%, Visualforce, HTML/CSS, SQL (+ API obszar)
- **Łatwy — „Konfiguracja CRM bez kodu (Salesforce Flow)"**
  Salesforce Developer Org: własny obiekt (np. Zgłoszenie), pola, layout, automatyzacja Flow. *anchorLeaves:* Salesforce. *Outcome:* działająca konfiguracja w org. *marketRationale:* Salesforce 31% = rdzeń platformy.
- **Średni — „Aplikacja CRM z logiką w Apex + LWC"**
  Niestandardowe obiekty, trigger Apex (automatyczne przypisanie), interfejs w Lightning Web Components. *anchorLeaves:* Salesforce, Apex, LWC. *Outcome:* aplikacja z własnym kodem. *marketRationale:* Apex 15% + LWC 8% = sygnał ról deweloperskich Salesforce.
- **Zaawansowany — „Integracja Salesforce z zewnętrznym API (Apex REST + testy)"**
  Wywołanie REST z Apex do zewnętrznego API, obsługa błędów/limitów, komponent LWC prezentujący dane, testy Apex (wymóg 75% pokrycia). *anchorLeaves:* Salesforce, Apex, LWC, API/REST. *Outcome:* integracja produkcyjnej klasy. *marketRationale:* dodanie integracji API 39% (obszar) = poziom mid konsultanta.

### Reszta ścieżek — KOLEJNA ITERACJA z gotowym szablonem
Nie zgaduję 60 projektów w jednym przebiegu (jakość > ilość). Pozostałe ścieżki dostają projekty wg metody z góry (sekcja 7), w kolejnej iteracji produktowej ode mnie. Dla każdej **top buildable-leaves są już policzone w v4** — szablon gotowy do wypełnienia:

| Ścieżka | Top liście do zakotwiczenia (z v4) | Status |
|---|---|---|
| .NET Developer | .Net 61%, C# 59%, SQL 29%, Azure 22%, ASP.NET, EF | szablon gotowy |
| Python Developer | Python 46%, Linux 40%, Kubernetes 36%, Docker 31%, Django/FastAPI | szablon gotowy |
| Backend Developer | Python/Java, Node.js, SQL, Docker/K8s, MongoDB/Redis | szablon gotowy |
| PHP Developer | PHP, Symfony, MySQL, SQL, Docker | szablon gotowy |
| Embedded/C++ Developer | C++ 74%, C, Python, Linux | szablon gotowy |
| Full-Stack Developer | React, TypeScript, Node.js, Java/.Net, MongoDB | szablon gotowy |
| Android Developer | Kotlin, Java, Android SDK, Jetpack Compose, Firebase | szablon gotowy |
| Data Analyst | SQL, Python, Power BI, Tableau, Excel | szablon gotowy |
| Data Scientist | Pandas, Scikit-learn, XGBoost, PyTorch, Python, SQL | szablon gotowy |
| AI Engineer | Python, PyTorch, LangChain, Hugging Face, FastAPI | szablon gotowy |
| DevOps Engineer | Terraform, Kubernetes, Docker, GitHub Actions, AWS, Ansible | szablon gotowy |
| Cybersecurity Specialist | Burp Suite, Nmap, Wireshark, Metasploit, Splunk, Python | szablon gotowy |
| QA Engineer | Selenium, Playwright, Cypress, Postman, Jira | szablon gotowy |
| Solution Architect | C4, UML, Kafka, Kubernetes (rola docelowa — projekty dokumentacyjne) | szablon gotowy |
| UX/UI Designer | Figma, Adobe XD | szablon gotowy |
| Product Owner/Manager | Jira, Confluence, SQL, Power BI (analiza produktu) | szablon gotowy |
| Engineering Manager | (rola docelowa, knowledge-heavy — projekty z bazowej ścieżki) | niski priorytet |
| Admin/Wsparcie IT (it.2) | PowerShell, Active Directory, Linux, Bash | iteracja 2 |

---

## 8. PODSUMOWANIE DLA MAXA

1. **Pola modelu:** `family` (1 z 5 e-CF), `eCfArea`, `sfiaCategory`, `iscoCode`+`iscoLabel`, `escoOccupation`, `juniorFriendliness`, `targetRole` (bool), `tShapePairs[]`.
2. **Mapowanie 14↔20** (sekcja 2) — gdzie dokument scala, content rozdzielony na nasze węższe ścieżki.
3. **Hierarchia obszar→liść + warianty nazw + liście nieobecne** — bez zmian z v4; zmaterializowane w `career-model.json`, metoda opisana w `job-market-provenance.md` §changelog v3→v4.
4. **Bank projektów** — schemat danych (sekcja 7) + metoda autorowania (projekt z top-liści ścieżki) + 6 pełnych zestawów (Java, Data Engineer, Frontend, PM, BA, Salesforce); reszta = szablon gotowy, kolejna iteracja.
5. **Junior-layer** (sekcja 4) — `juniorFriendliness`, role docelowe widoczne+oznaczone, rekomendacje wejść + 5 zasad + T-shape jako treść onboardingu.
6. **Ratyfikacje** (sekcja 6) — IT-only, widełki neutralne jeden zakres, czerwień=luka na liściach, progi zniesione dla liści.
7. **Iteracja 2:** Admin/Wsparcie IT + ERP Consultant jako ręczne kotwice.
