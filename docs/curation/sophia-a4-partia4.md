# A4/A5 — PARTIA 4: grupowanie 4 ścieżek (dane · analiza · platforma · zarządzanie)

**Autor:** Sophia (Product Owner) · **Data:** 2026-06-27 · **Wzorzec:** 13 gotowych ścieżek w `PATHS` (metoda surowy udział, kuracja ekspercka liści w grupy `context-group`; partia 3 = wzorzec referencyjny: `countAsUnion` na każdym scaleniu, jawne override'y).
**Dane źródłowe:** `scratchpad/lift-partia4.json` (generator `tools/lift-candidates.ts`, zrzut JustJoinIT 2026, **9922 ofert / 54085 tech**, mianownik globalny po dedup — dane KANONICZNE, potwierdzone przez Leo w partii 3).
**Status:** spec gotowy do wpięcia przez Ethana do `src/lib/db/data/career-model.ts`. NIE edytowałam modelu, NIE commitowałam, NIE dotykałam 13 gotowych ścieżek.

## Wybrane ścieżki partii 4 + uzasadnienie

Wybrałam **4 ścieżki w celowym miksie czterech różnych „światów" rynku** — żeby partia różnicowała katalog ponad kolejne warianty deweloperki (partia 3 wyczerpała czysty dev):

| Ścieżka | Ofert | Liści po bramce | „Świat" | Dlaczego w partii 4 |
|---|---|---|---|---|
| **Data Engineer** | 226 | 53 | techniczny / dane | Domyka **trio danych** (Data Scientist + Data Analyst już skuratorowane). Najczystszy sygnał partii: Python 70%, SQL 53%, bogaty rdzeń nowoczesnego stosu (Databricks 37%, Snowflake 30%, Spark 28%, Airflow, dbt). Gorący popyt, wyrazista ścieżka studencka. |
| **Business Analyst** | 481 | 65 | analityczny / biznes | Most między biznesem a IT — rola nietechniczna-techniczna, inny target studenta niż dev. Bardzo czysty rdzeń: UML 59%, BPMN 50%, SQL 37%. Bogaty katalog, jednoznaczny. |
| **Salesforce Developer** | 238 | 53 | platforma | Różnicuje partię — kariera „na platformie" (nie język ogólnego przeznaczenia). Czysty rdzeń platformowy: Apex, LWC, Visualforce, Sales Cloud. **Mocny sygnał eksportowy** (English 31% — patrz Sygnały produktowe). |
| **Project Manager** | 700 | 87 | zarządczy | **Największy wolumen partii (700 ofert).** Najczystsza i najbogatsza rola zarządcza w danych: Project Management 38%, Agile 36%, Jira 30%, Scrum 20%, PRINCE2, SAFe, Kanban. Rola dominowana koncepcjami/metodykami (zgodnie z naturą zarządzania). |

**Miks celowy:** inżynieria danych (techniczny) + analiza biznesowa (pomost biznes-IT) + platforma Salesforce (kariera platformowa) + zarządzanie projektami (zarządczy). Cztery rozłączne profile studenta zamiast czterech wariantów tego samego.

**Świadomie POMINIĘTE (zgłaszam, NIE kuruję — patrz „Sygnały produktowe"):**
- **Engineering Manager** (105 ofert) — **anchor patologiczny.** Top sygnały to Java 42%, React 29%, Kotlin 23%, AWS 25% — anchor łapie **seniorów-deweloperów, nie menedżerów** (Leadership dopiero #3, 29%). Mechaniczna kuracja dałaby studentowi „zostań Eng Managerem = ucz się Reacta". Wymaga decyzji produktowej Darka (repozycjonowanie / inna metoda), nie kuracji.
- **Product Owner / Manager** (269 ofert) — kuratorowalny, ale **zaszumiony**: #1 to `Analytical Thinking` (soft), silny przeciek tech (Python, Azure, Backend, Distributed systems) i buzzword `AI` 19%. Wybrałam Project Managera jako czystszą i 2,6× liczniejszą rolę zarządczą tej partii; PO/Manager do partii 5 z ostrożną definicją anchora.
- **Solution Architect** (81 ofert, 18 liści) — **za cienki** i anchor łapie „senior Java/Python + chmura" (Java 44%, Python 36%) zamiast czystej architektury rozwiązań. `Architecture` 46% to w połowie gołe meta-hasło. Poniżej progu rzetelnej kuracji — do partii 5 lub osobnej metody (rola docelowa, mało liści-konkretu).
- **Embedded / C++ Developer** (188 ofert) — realny rdzeń embedded JEST (C++ 77%, C 34%, Linux 32%, freeRTOS/RTOS/FPGA/VHDL), ale **zaszumiony gamed/edu** (Scratch/Roblox/Unity ~3% każde — szum anchora) + przeciek mobile (Kotlin 13%, Java 22%). Kuratorowalny, ale ostrożnie; ustąpił miejsca czystszej czwórce. Do partii 5.
- **Python / PHP Developer** — WYKLUCZONE z partii 4 (decyzja z partii 3: anchor patologiczny, czekają na decyzję produktową Darka o repozycjonowaniu).

---

## Globalne decyzje kuracyjne (kontynuacja reguł z partii 2–3)

1. **Łańcuch REST/API** — wszystkie warianty `REST API` + `REST` + nagie `API` + `RESTful API` scalone w jeden liść **`REST / API`** (`kind: "concept"`, `countAsUnion: true`). Oferta z dwoma napisami liczona RAZ.
2. **Microsoft Platform → Azure / wyklucz gołe meta** — `Microsoft Platform` jako gołe hasło = meta (nie liść). `Azure` + `Microsoft Azure` zawsze unią.
3. **Chmury zawsze unią** — `AWS` + `Amazon AWS`; `Azure` + `Microsoft Azure`; `GCP` + `Google Cloud Platform`.
4. **Apache-prefiks unią** — `Spark`+`Apache Spark`; `Airflow`+`Apache Airflow`; `Hadoop`+`Apache Hadoop`; `Kafka`+`Apache Kafka` (ten sam produkt, dwa zapisy).
5. **Polskie duplikaty unią** — `Business Analysis`+`Analiza Biznesowa`; `System Analysis`+`analiza systemowa` (ten sam byt, dwa języki w jednym zrzucie).
6. **`kind` z sensem** — `concept` dla metodyk/wzorców/notacji-jako-wiedzy (Agile, Scrum, PRINCE2, ETL, NoSQL, Microservices, REST/API, BPMN-jako-notacja); `tool` dla konkretnego oprogramowania (Jira, Databricks, Apex, Confluence); `cert` dla certyfikatów w osobnym ujęciu; soft-kompetencje zarządcze oznaczam `concept` (rozumiem/stosuję), bo dla PM to rdzeń roli, nie dekoracja.
7. **Zarobki/widełki, języki obce, gołe meta-hasła** — do osobnych kubełków / wykluczeń (jawna lista na końcu).
8. **Override'y prowadzę jawną listą** — każde ręczne wykluczenie/scalenie ma uzasadnienie dla Leo i kupującego.

> `unionShare` przy każdej grupie to **szacunek** (≈ udział ofert wymagających ≥1 liścia grupy, w praktyce ≥ udziału liścia czołowego). Ostateczną wartość **liczy silnik** z `type: "context-group"` — podaję ją jako sygnał kuracyjny, nie wpis do modelu (typ `AreaSpec` nie ma pola `unionShare`).

---

# 1. Data Engineer

**226 ofert · 53 liście po bramce · najczystsza ścieżka partii (Python 70%, SQL 53%).** 5 grup. Domyka trio danych (Data Scientist + Data Analyst już w modelu).

### Grupa 1 — Języki przetwarzania danych (rdzeń) · `context-group` · unionShare ≈ 78% (szac.)
> **Opis:** Serce roli — języki, w których przepychasz i przekształcasz dane. Python rządzi (7 na 10 ofert) jako klej całego potoku danych (pipeline — taśma, którą dane płyną od źródła do hurtowni). SQL (język zapytań do baz relacyjnych) to drugi filar — co druga oferta. Scala pojawia się tam, gdzie liczy się wydajność przetwarzania rozproszonego (Apache Spark), Java w starszych systemach Big Data.

| Liść | kind | countAs | union |
|---|---|---|---|
| Python | tool | — | — |
| SQL | tool | — | — |
| Scala | tool | — | — |
| Java | tool | — | — |

### Grupa 2 — Big Data i przetwarzanie rozproszone · `context-group` · unionShare ≈ 42% (szac.)
> **Opis:** Inżynier danych przetwarza wolumeny, których nie udźwignie jeden komputer — dzieli pracę na wiele maszyn (przetwarzanie rozproszone). Apache Spark to dziś standard tego świata, a PySpark to jego interfejs w Pythonie (piszesz po pythonowemu, liczy się rozproszenie). Hadoop i Hive to starsza, wciąż żywa generacja, Kafka dowozi dane strumieniem w czasie rzeczywistym (gdy nie czekasz na nocną paczkę).

| Liść | kind | countAs | union |
|---|---|---|---|
| Apache Spark | tool | `["Apache Spark", "Spark"]` | **true** |
| PySpark | tool | — | — |
| Big Data | concept | — | — |
| Hadoop | tool | `["Hadoop", "Apache Hadoop"]` | **true** |
| Hive | tool | — | — |
| Kafka | tool | `["Apache Kafka", "Kafka"]` | **true** |

*Uzasadnienie:* PySpark (23%) zostaje osobnym liściem mimo bliskości do Spark (28%) — student widzi obie nazwy jako odrębne wymagania w ofertach (Spark = silnik, PySpark = konkretny sposób, w jaki go wołasz z Pythona); to NIE warianty jednej nazwy, więc bez unii. Spark+Apache Spark oraz Hadoop+Apache Hadoop scalone unią (literalnie ten sam produkt).

### Grupa 3 — Orkiestracja i ETL · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Dane nie płyną same — ktoś układa kolejność kroków i pilnuje, że nocny przepływ się wykonał. To orkiestracja: Airflow (i jego zarządzana odmiana Cloud Composer w chmurze Google) planuje i nadzoruje zadania, Dagster to nowszy konkurent. ETL (Extract-Transform-Load: wyciągnij dane ze źródła, przekształć, załaduj do hurtowni) to fundamentalny wzorzec roli, a dbt przekształca dane już w hurtowni samym SQL-em.

| Liść | kind | countAs | union |
|---|---|---|---|
| ETL | concept | `["ETL", "ETL/ELT", "ETL tools"]` | **true** |
| Airflow | tool | `["Airflow", "Apache Airflow"]` | **true** |
| dbt | tool | `["DBT", "dbt"]` | **true** |
| Dagster | tool | — | — |
| Cloud Composer | tool | — | — |

*Uzasadnienie:* ETL + ETL/ELT + ETL tools = ten sam wzorzec, trzy zapisy → unia (`concept`, bo to wzorzec przepływu, nie narzędzie). Cloud Composer zostaje osobno mimo bycia „Airflow w chmurze GCP" — w ofertach to odrębne, nazwane wymaganie produktu Google.

### Grupa 4 — Hurtownie i platformy danych · `context-group` · unionShare ≈ 55% (szac.)
> **Opis:** Gdzie dane lądują i skąd analityk je bierze. Databricks (37%) i Snowflake (30%) to dwie dominujące platformy nowej generacji — łączą magazyn danych z mocą obliczeniową. Delta Lake to format zapisu Databricks zapewniający spójność danych, BigQuery to hurtownia Google, Oracle — klasyczna baza w starszych systemach.

| Liść | kind | countAs | union |
|---|---|---|---|
| Databricks | tool | — | — |
| Snowflake | tool | — | — |
| Delta Lake | tool | — | — |
| BigQuery | tool | — | — |
| Oracle | tool | — | — |

### Grupa 5 — Chmura i wdrażanie · `context-group` · unionShare ≈ 60% (szac.)
> **Opis:** Współczesny inżynier danych pracuje w chmurze i sam wdraża swoje potoki. Azure (33%) i AWS (28%) to dwie najczęstsze platformy w PL, GCP za nimi. Azure Data Factory orkiestruje przepływy w świecie Microsoftu, Terraform opisuje infrastrukturę kodem (zamiast klikać w panelu — piszesz konfigurację), CI/CD (taśma automatycznego budowania i wdrażania) i Kubernetes (uruchamianie aplikacji na skalę) domykają warsztat.

| Liść | kind | countAs | union |
|---|---|---|---|
| Azure | tool | `["Azure", "Microsoft Azure"]` | **true** |
| AWS | tool | `["AWS", "Amazon AWS"]` | **true** |
| GCP | tool | `["GCP", "Google Cloud Platform"]` | **true** |
| Azure Data Factory | tool | — | — |
| Azure DevOps | tool | — | — |
| Terraform | tool | — | — |
| CI/CD | concept | — | — |
| Kubernetes | tool | — | — |

---

# 2. Business Analyst

**481 ofert · 65 liści po bramce · most biznes-IT (UML 59%, BPMN 50%).** 5 grup. Rola nietechniczna-techniczna — inny target studenta niż deweloperka.

### Grupa 1 — Notacje i modelowanie (rdzeń) · `context-group` · unionShare ≈ 75% (szac.)
> **Opis:** Serce roli analityka — rysowanie tego, jak system i proces mają działać, w umownym języku graficznym (notacji), który rozumie i biznes, i programista. UML (60% ofert) opisuje strukturę i zachowanie systemu, BPMN (50%) rysuje przebieg procesu biznesowego krok po kroku. Enterprise Architect to najpopularniejsze narzędzie, w którym się to rysuje (26% ofert), ArchiMate — notacja do architektury całej organizacji.

| Liść | kind | countAs | union |
|---|---|---|---|
| UML | concept | — | — |
| BPMN | concept | — | — |
| Enterprise Architect | tool | — | — |
| ArchiMate | concept | — | — |

*Uzasadnienie kind:* UML/BPMN/ArchiMate to **notacje** (język, który rozumiesz i stosujesz) → `concept`; Enterprise Architect to konkretny program, w którym je rysujesz → `tool`.

### Grupa 2 — Analiza wymagań i dokumentacja · `context-group` · unionShare ≈ 32% (szac.)
> **Opis:** Druga połowa roli — zamiana mglistych życzeń biznesu w precyzyjne wymagania, które programista wykona bez zgadywania. Analiza biznesowa i systemowa to rdzeń tej pracy; User Stories (historyjki użytkownika: „jako X chcę Y, żeby Z") to format zapisu wymagań w zwinnych zespołach, a SDLC (cykl życia oprogramowania — od pomysłu po utrzymanie) to rama, w której analityk się porusza.

| Liść | kind | countAs | union |
|---|---|---|---|
| Business Analysis | concept | `["Business Analysis", "Analiza Biznesowa"]` | **true** |
| Analiza systemowa | concept | `["analiza systemowa", "System Analysis"]` | **true** |
| User Stories | concept | — | — |
| SDLC | concept | — | — |
| CASE | concept | — | — |

*Uzasadnienie:* polskie i angielskie zapisy tego samego bytu (`Business Analysis`/`Analiza Biznesowa`, `System Analysis`/`analiza systemowa`) scalone unią — to jeden zrzut dwujęzyczny, nie dwa różne wymagania.

### Grupa 3 — API, integracje i architektura usług · `context-group` · unionShare ≈ 28% (szac.)
> **Opis:** Coraz częściej analityk projektuje, jak systemy gadają ze sobą — nie tylko z człowiekiem. API (interfejs, przez który jeden program woła drugi) w stylu REST to standard; analityk opisuje je i testuje (Postman, Swagger, SoapUI — narzędzia do „zawołania" API i sprawdzenia odpowiedzi). SOAP i ESB (szyna integracyjna spinająca wiele systemów) żyją w korporacjach, SOA i mikrousługi to style dzielenia systemu na współpracujące części, TOGAF — rama architektury korporacyjnej.

| Liść | kind | countAs | union |
|---|---|---|---|
| REST / API | concept | `["REST API", "REST", "API"]` | **true** |
| Postman | tool | — | — |
| Swagger | tool | — | — |
| SoapUI | tool | — | — |
| SOAP | tool | — | — |
| SOA | concept | — | — |
| ESB | concept | — | — |
| XML | tool | — | — |
| Microservices (Mikrousługi) | concept | `["Microservices"]` | — |
| TOGAF | concept | — | — |

### Grupa 4 — Bazy danych i zapytania · `context-group` · unionShare ≈ 37% (szac.)
> **Opis:** Dobry analityk sam sięga do danych, zamiast czekać na programistę. SQL (język zapytań do baz relacyjnych) to jego najważniejsza umiejętność techniczna — co trzecia oferta go wymaga. Pozwala odpowiedzieć na pytanie biznesowe wprost z bazy: ilu klientów, jaki przychód, gdzie spadek.

| Liść | kind | countAs | union |
|---|---|---|---|
| SQL | tool | — | — |

*Uzasadnienie wydzielenia:* SQL (37%, trzeci najsilniejszy sygnał) stoi jako osobna grupa mimo jednego liścia — to konceptualnie odrębna kompetencja (bezpośredni dostęp do danych), której nie mieszam z modelowaniem ani integracjami. Świadomy wybór czytelności nad „upchnięciem".

### Grupa 5 — Metodyka i narzędzia zespołowe · `context-group` · unionShare ≈ 45% (szac.)
> **Opis:** Warsztat codziennej pracy w zespole IT. Jira (30% ofert) to system, w którym żyją zadania i wymagania, Confluence — wiki, gdzie analityk pisze dokumentację. Agile i Scrum to zwinne metodyki iteracyjne (praca w krótkich cyklach zamiast jednego wielkiego planu), MS Office — wciąż codzienne narzędzie analityka (Excel, prezentacje).

| Liść | kind | countAs | union |
|---|---|---|---|
| Jira | tool | — | — |
| Confluence | tool | — | — |
| Agile | concept | — | — |
| Scrum | concept | — | — |
| MS Office | tool | — | — |

---

# 3. Salesforce Developer

**238 ofert · 53 liście po bramce · kariera „na platformie".** 5 grup. Różnicuje partię (nie język ogólnego przeznaczenia, lecz ekosystem jednego producenta). **Sygnał: English 31% — rynek eksportowy/nearshore** (patrz Sygnały produktowe).

### Grupa 1 — Platforma Salesforce (rdzeń) · `context-group` · unionShare ≈ 42% (szac.)
> **Opis:** Serce roli — programujesz wewnątrz Salesforce (najpopularniejszej na świecie platformy CRM, czyli systemu do zarządzania relacjami z klientami). Apex to język programowania tej platformy (przypomina Javę, ale działa tylko w Salesforce), LWC (Lightning Web Components) to nowoczesny sposób budowania ekranów, Visualforce — starszy. Sales Cloud i Service Cloud to dwa główne moduły (sprzedaż i obsługa klienta), które konfigurujesz i rozszerzasz.

| Liść | kind | countAs | union |
|---|---|---|---|
| Salesforce | tool | — | — |
| Apex | tool | — | — |
| LWC (Lightning Web Components) | tool | `["LWC"]` | — |
| Visualforce | tool | — | — |
| Sales Cloud | tool | — | — |
| Service Cloud | tool | — | — |

### Grupa 2 — Integracje i API · `context-group` · unionShare ≈ 35% (szac.)
> **Opis:** Salesforce rzadko stoi sam — łączy się z resztą firmowych systemów. To drugi najsilniejszy sygnał roli (API 29%): wystawiasz i konsumujesz API (interfejs, przez który systemy wymieniają dane) w stylu REST lub starszym SOAP, dane płyną w formacie JSON (lekki zapis), a Postman służy do testowania tych połączeń.

| Liść | kind | countAs | union |
|---|---|---|---|
| REST / API | concept | `["API", "REST API", "REST"]` | **true** |
| SOAP | tool | — | — |
| JSON | tool | — | — |
| Postman | tool | — | — |

### Grupa 3 — Web i interfejs · `context-group` · unionShare ≈ 15% (szac.)
> **Opis:** Część pracy Salesforce dewelopera to klasyczny front — ekrany, które widzi użytkownik. HTML (struktura strony) i CSS (jej wygląd) to podstawa, JavaScript dodaje interaktywność. Te umiejętności wykorzystasz, budując własne komponenty Lightning ponad standardem platformy.

| Liść | kind | countAs | union |
|---|---|---|---|
| HTML | tool | — | — |
| CSS | tool | — | — |
| JavaScript | tool | — | — |

### Grupa 4 — Systemy korporacyjne i CRM · `context-group` · unionShare ≈ 14% (szac.)
> **Opis:** Salesforce żyje w krajobrazie innych dużych systemów firmowych. CRM to kategoria, do której sam należy (zarządzanie relacjami z klientem), SAP i SAP HANA to dominujący system do zarządzania całą firmą (finanse, magazyn, kadry), ERP — ta sama kategoria, ServiceNow — platforma obsługi zgłoszeń. Integracja z nimi to częste zadanie roli.

| Liść | kind | countAs | union |
|---|---|---|---|
| CRM | concept | `["CRM", "Customer Relationship Management (CRM) Suite"]` | **true** |
| SAP | tool | `["SAP", "SAP HANA"]` | **true** |
| ERP | concept | — | — |
| ServiceNow | tool | — | — |

### Grupa 5 — Warsztat i metodyka · `context-group` · unionShare ≈ 10% (szac.)
> **Opis:** Warsztat bazowy każdego dewelopera, też na platformie. Jira trzyma zadania, Agile (zwinna metodyka iteracyjna) organizuje pracę, CI/CD (taśma automatycznego budowania i wdrażania) automatyzuje publikację zmian na platformę.

| Liść | kind | countAs | union |
|---|---|---|---|
| Jira | tool | — | — |
| Agile | concept | — | — |
| CI/CD | concept | — | — |

---

# 4. Project Manager

**700 ofert · 87 liści po bramce · największy wolumen partii.** 4 grupy. Rola zarządcza — dominują **metodyki i koncepcje**, mało „tool" (zgodnie z naturą zarządzania: PM nie „obsługuje narzędzie", lecz prowadzi ludzi i proces).

### Grupa 1 — Metodyki i ramy zarządzania (rdzeń) · `context-group` · unionShare ≈ 65% (szac.)
> **Opis:** Serce roli — sposób, w jaki prowadzisz projekt do końca. Project Management (38%) i Agile (36%, zwinne prowadzenie w krótkich cyklach) to dwa najsilniejsze sygnały. Scrum i Kanban to konkretne odmiany zwinności, Waterfall (kaskadowy: zaplanuj wszystko z góry, potem wykonaj) to klasyczne podejście wciąż żywe w korporacji. SAFe skaluje zwinność na wielkie organizacje, a PRINCE2 to sformalizowana metodyka prowadzenia projektu, znana głównie z certyfikatu o tej samej nazwie.

| Liść | kind | countAs | union |
|---|---|---|---|
| Project Management | concept | — | — |
| Agile | concept | — | — |
| Scrum | concept | — | — |
| Kanban | concept | — | — |
| Waterfall | concept | — | — |
| SAFe | concept | — | — |
| PRINCE2 | cert | — | — |
| Scrum Master | concept | — | — |

*Uzasadnienie kind:* metodyki = `concept` (rozumiesz i stosujesz, nie „obsługujesz"). PRINCE2 wyjątkowo `cert` — w PL to przede wszystkim certyfikat (jak ISTQB w QA, ISO 27001 w cyber); silnik renderuje go w kubełku certyfikatów, nie miesza z metodyką-wiedzą.

### Grupa 2 — Narzędzia pracy PM · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Oprogramowanie, w którym PM faktycznie prowadzi projekt. Jira (30%) trzyma zadania i postęp, Confluence (18%) to wiki z dokumentacją i decyzjami. MS Project to klasyczne narzędzie do harmonogramów (wykres Gantta — pasy zadań na osi czasu), a MS Office i Excel obsługują budżet, raporty i komunikację.

| Liść | kind | countAs | union |
|---|---|---|---|
| Jira | tool | `["Jira", "Atlassian JIRA"]` | **true** |
| Confluence | tool | — | — |
| MS Project | tool | — | — |
| MS Office | tool | — | — |
| Microsoft Excel | tool | — | — |

### Grupa 3 — Zarządzanie interesariuszami i zespołem · `context-group` · unionShare ≈ 22% (szac.)
> **Opis:** Najtrudniejsza, najbardziej ludzka część roli — i często ta, która decyduje o sukcesie projektu. Zarządzanie interesariuszami (stakeholders — wszyscy, których projekt dotyczy: klient, zarząd, zespół) i komunikacja to rdzeń. Change Management (zarządzanie zmianą — przeprowadzenie ludzi przez nowy sposób pracy), koordynacja, zarządzanie ryzykiem i governance (ład: zasady i nadzór nad tym, jak projekt jest prowadzony) domykają obraz.

| Liść | kind | countAs | union |
|---|---|---|---|
| Stakeholder Management | concept | — | — |
| Communication | concept | — | — |
| Change Management | concept | — | — |
| Coordination | concept | — | — |
| Risk Management | concept | — | — |
| Governance | concept | — | — |

*Uzasadnienie kind:* kompetencje miękkie zarządcze oznaczam `concept` (rozumiem/stosuję), nie `soft`-do-wykluczenia — dla PM to **rdzeń roli, nie dekoracja**. Świadome odejście od reguły „soft → kubełek" tam, gdzie soft JEST treścią zawodu.

### Grupa 4 — Styk z analizą i dostarczaniem · `context-group` · unionShare ≈ 12% (szac.)
> **Opis:** PM nie pracuje w próżni — styka się z analizą biznesową (zrozumienie, co właściwie ma powstać) i z dostarczaniem (delivery — doprowadzenie do faktycznego wdrożenia). PMO to biuro zarządzania projektami (komórka pilnująca standardów i portfela projektów w firmie), Project Execution to faza realizacji planu.

| Liść | kind | countAs | union |
|---|---|---|---|
| Business Analysis | concept | — | — |
| PMO | concept | — | — |
| Project Execution | concept | — | — |

---

## Lista override'ów (jawne ręczne decyzje nad bramką)

### Scalenia unią (`countAsUnion: true`) — przeciw zawyżeniu sumą
| Ścieżka | Liść | Scalone warianty | Powód |
|---|---|---|---|
| Data Engineer | Apache Spark | Apache Spark + Spark | ten sam silnik, dwa zapisy |
| Data Engineer | Hadoop | Hadoop + Apache Hadoop | ten sam produkt |
| Data Engineer | Kafka | Apache Kafka + Kafka | ten sam produkt |
| Data Engineer | Airflow | Airflow + Apache Airflow | ten sam produkt |
| Data Engineer | ETL | ETL + ETL/ELT + ETL tools | ten sam wzorzec, trzy zapisy |
| Data Engineer | dbt | DBT + dbt | różnica wielkości liter |
| Data Eng / Salesforce | Azure / AWS / GCP | + Microsoft Azure / Amazon AWS / Google Cloud Platform | chmury unią (reguła globalna) |
| BA | Business Analysis | Business Analysis + Analiza Biznesowa | zrzut dwujęzyczny, jeden byt |
| BA | Analiza systemowa | analiza systemowa + System Analysis | zrzut dwujęzyczny, jeden byt |
| BA, Salesforce | REST / API | REST API + REST + API | łańcuch REST/API domknięty |
| Salesforce | CRM | CRM + Customer Relationship Management (CRM) Suite | ten sam byt, rozwlekły zapis |
| Salesforce | SAP | SAP + SAP HANA | rodzina SAP, współwystępują w ofercie |
| Project Manager | Jira | Jira + Atlassian JIRA | ten sam produkt, dwa zapisy |

### Wykluczenia (liść przeszedł bramkę, ale ŚWIADOMIE pominięty)
| Ścieżka | Wykluczony liść | % | Powód |
|---|---|---|---|
| Data Engineer | Power BI | 4% | narzędzie BI/analityka (przeciek z Data Analyst) — nie rdzeń inżynierii danych |
| Data Engineer | GPS | 1,8% | szum jednego pracodawcy (geolokalizacja), lift=29 — nie umiejętność danych |
| Data Engineer | „Data" (gołe hasło) | 2,2% | meta — nazwa domeny, nie liść-konkret |
| BA | Kafka / Java / OOP | 1,5–5% | przeciek techniczny z ról deweloperskich — nie rdzeń analityka |
| BA | Kibana | 1,9% | narzędzie obserwowalności (przeciek) — nie warsztat BA |
| BA, PM | Analytical Thinking / Analityczne Myślenie | 3% | soft generyczny + polski duplikat — osobny kubełek, nie liść |
| Salesforce | English / German / Polish | 31% / 3% / 2% | języki obce — osobny kubełek (ale patrz Sygnał #2: nośnik informacji o rynku eksportowym) |
| Salesforce | Programming / IT Support / Backend | 2–3% | gołe meta / przeciek — nie konkret platformy |
| Salesforce | SQL / Java / PHP | 2–5% | przeciek; Salesforce używa SOQL, nie czystego SQL — myliłoby studenta |
| Project Manager | AI | 12% | buzzword/meta — nie umiejętność PM (spójne z partią 2–3) |
| Project Manager | Documentation / training / Communication-as-soft | 3–8% | część do grupy 3 jako `concept`; gołe „Documentation"/„training" wykluczone jako soft generyczny |
| Project Manager | Testing / QA / Postman / SAP / ERP / ServiceNow / Network | 2–6% | przeciek techniczny/domenowy — anchor PM łapie ogłoszenia z branż IT, to nie rdzeń zarządzania |
| Project Manager | English / MS Office? | 3% | English → kubełek językowy (MS Office zostaje — realne narzędzie PM) |
| Eng Manager (gdyby) | Java / React / Kotlin / AWS | 23–42% | anchor łapie seniora-dewelopera, nie menedżera — ścieżka odłożona (Sygnał #1) |
| Solution Arch (gdyby) | Architecture (gołe) / Cloud (meta) | 27–46% | w połowie meta-hasło; ścieżka za cienka, odłożona |
| Embedded (gdyby) | Scratch / Roblox / Unity | ~3% każde | gamedev/edukacja — szum anchora (odłożona ścieżka) |

### Decyzje `kind` (nadpisanie auto-klasyfikatora)
- **concept** (rozumiem/stosuję): UML, BPMN, ArchiMate (notacje); ETL, Big Data, NoSQL, SOA, ESB, Microservices, REST/API, TOGAF, SDLC, User Stories, CASE (wzorce/ramy); Agile, Scrum, Kanban, Waterfall, SAFe, Scrum Master, Project Management (metodyki); Stakeholder Management, Communication, Change Management, Coordination, Risk Management, Governance, PMO, Project Execution, Business Analysis (kompetencje zarządcze — `concept`, nie `soft`, bo to rdzeń roli PM); CRM, ERP (kategorie systemów).
- **cert** (certyfikat, osobny kubełek): PRINCE2.
- **tool** (obsługuję konkretne oprogramowanie): wszystkie języki, bazy, chmury, platformy (Databricks, Snowflake, Apex, LWC, Jira, Confluence, MS Project, Enterprise Architect, Postman, itd.).

---

## Sygnały produktowe do flagowania (decyzje dla Darka)

1. **Engineering Manager — anchor patologiczny (jak Python/PHP).** Top sygnały: Java 42%, React 29%, Kotlin 23%, AWS 25%, Leadership dopiero #3 (29%). Anchor „Engineering Manager" łapie w PL **seniorów-deweloperów prowadzących zespół technicznie**, nie menedżerów-organizacyjnych. Mechaniczna kuracja dałaby mylący obraz („zostań Eng Managerem = ucz się Reacta"). **Decyzja Darka:** repozycjonować na „Tech Lead / Senior Engineer" czy zostawić jako rola docelowa z inną metodą? NIE przesądzam — zgłaszam. Odłożone z partii 4.

2. **Salesforce — najsilniejszy sygnał eksportowy w całym katalogu.** English 31% to **drugi najsilniejszy sygnał roli** (zaraz po samym Salesforce 34%), plus German 3%, Polish 2%. Salesforce w PL to w dużej mierze rynek nearshore/eksportowy (polski deweloper dla zagranicznego klienta). To NIE szum do wyrzucenia bez śladu — to **wartościowy sygnał rynkowy dla studenta** (Salesforce = ścieżka z silnym wymogiem angielskiego, otwiera rynek zagraniczny). Wykluczyłam języki z liści (osobny kubełek), ale **rekomenduję wyeksponować ten fakt w opisie ścieżki lub osobnym sygnale UI** — decyzja Darka/Sophii o miejscu prezentacji.

3. **Product Owner / Manager — kuratorowalny, ale odłożony na rzecz PM.** #1 to soft (`Analytical Thinking` 39%), silny przeciek tech i `AI` 19%. Project Manager jest 2,6× liczniejszy (700 vs 269) i czystszy — wybrałam go jako rolę zarządczą partii 4. PO/Manager do partii 5 (wymaga decyzji, jak traktować `AI` 19% — buzzword czy realny rosnący wymóg „PO produktu AI").

4. **Data Engineer — `dbt`, `Dagster`, `Delta Lake`, `Cloud Composer` w danych = stos się modernizuje.** Klasyczny Hadoop (4%) ustępuje nowej generacji (Databricks 37%, Snowflake 30%, dbt 10%). Uczciwie pokazuję studentowi rynek 2026, nie podręcznik sprzed pięciu lat — rdzeń to dziś Python + SQL + Spark + chmura + Databricks/Snowflake, nie Hadoop.

5. **PRINCE2 jako `cert`, nie metodyka-liść.** Świadomie wydzielony do kubełka certyfikatów (jak ISO 27001 w cyber, ISTQB w QA) — student widzi, że to ścieżka certyfikacji, nie „umiejętność do wpisania w CV bez papieru". Pytanie do Darka: czy chcemy osobną sekcję „certyfikaty warte zdobycia" per ścieżka? Wracające pytanie z partii 1.

6. **Solution Architect (81) i Embedded/C++ (188, szum gamedev) — wciąż za cienkie/zaszumione.** Embedded ma realny rdzeń (C++ 77%, freeRTOS/RTOS/FPGA/VHDL), ale przeciek mobile (Kotlin 13%) + gamedev (Scratch/Roblox/Unity). Solution Architect za cienki i anchor łapie seniora-Javę. Obie do partii 5 z ostrożną metodą.

---

## Self-critique — 5 słabości i co poprawiłam

Wcieliłam się w najsurowszego krytyka-PO (benchmark: top-10% kuracja produktowa). Znalazłam i poprawiłam:

1. **SŁABOŚĆ: `PySpark` groził scaleniem ze `Spark` unią** — pozornie „ten sam produkt", a to zawyżyłoby błędnie: Spark to silnik, PySpark to jego pythonowy interfejs; w ofertach bywają wymagane jako **dwa odrębne punkty** (junior znający PySpark niekoniecznie zna Scala-Spark). → **POPRAWKA:** zostawiłam osobnymi liśćmi z jawnym uzasadnieniem; unią scaliłam tylko literalnie tożsame zapisy (Spark+Apache Spark, Hadoop+Apache Hadoop).

2. **SŁABOŚĆ: kompetencje miękkie PM (Stakeholder Management, Communication) mechanicznie wpadłyby do kubełka `soft`-do-wykluczenia** (reguła z cyber/partii 1) — a dla PM to **rdzeń zawodu, nie dekoracja**. Wyrzucenie ich okłamałoby studenta o naturze roli. → **POPRAWKA:** świadomy wyjątek od reguły „soft → kubełek" — oznaczyłam je `concept` i dałam całą Grupę 3, z jawnym uzasadnieniem w override'ach. Reguła „soft → kubełek" zostaje dla ról, gdzie soft jest dodatkiem (dev), nie treścią (PM).

3. **SŁABOŚĆ: Salesforce English 31% — mechaniczne „język obcy → wyrzuć" zgubiłoby najważniejszy sygnał rynkowy ścieżki.** → **POPRAWKA:** wykluczyłam z liści (spójność), ale podniosłam do Sygnału produktowego #2 z rekomendacją wyeksponowania (rynek eksportowy/nearshore). Brand voice: „prawda o rynku > podręcznikowy ideał" — student MUSI wiedzieć, że Salesforce w PL = wymóg angielskiego.

4. **SŁABOŚĆ: grupa „Bazy danych" w BA z jednym liściem (SQL) wyglądała na niedokończoną** — pokusa, by upchnąć SQL do innej grupy. → **POPRAWKA:** świadomie zostawiłam SQL jako osobną grupę (37% to trzeci sygnał roli, konceptualnie odrębna kompetencja: bezpośredni dostęp do danych) z jawnym uzasadnieniem „czytelność > upchnięcie". To wybór, nie przeoczenie — analogicznie do 2-liściowych grup w partii 3 (Java grupa 5).

5. **SŁABOŚĆ: żargon w opisach** (pipeline, orkiestracja, ETL, CRM, Apex, governance, nearshore, Gantt, stakeholders, notacja) groził złamaniem brand voice (sekcja 3 konstytucji — odbiorca nietechniczny, student). → **POPRAWKA:** każdy termin rozwinięty po polsku przy pierwszym użyciu w prozie grupy („pipeline — taśma, którą dane płyną", „orkiestracja — układanie kolejności kroków", „governance — ład: zasady i nadzór", „stakeholders — wszyscy, których projekt dotyczy", „notacja — umowny język graficzny"). Sprawdzone w każdym z 19 opisów grup.

**Dodatkowo po self-critique:** zgłosiłam Engineering Manager jako anchor patologiczny (Sygnał #1) zamiast cicho go pominąć lub kuratorować — zgodnie z dyrektywą „jeśli ścieżka wymaga decyzji produktowej, ZGŁOŚ, nie przesądzaj sam". Wybór Project Managera zamiast PO/Manager udokumentowałam danymi (700 vs 269 ofert, czystość sygnału), nie intuicją.

---

**Ścieżka dokumentu:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/sophia-a4-partia4.md`
**Surowe dane:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/lift-partia4.json`
