# A4/A5 — PARTIA 3: grupowanie 4 ścieżek deweloperskich

**Autor:** Sophia (Product Owner) · **Data:** 2026-06-27 · **Wzorzec:** 9 gotowych ścieżek w `PATHS` (metoda surowy udział, kuracja ekspercka liści w grupy `context-group`).
**Dane źródłowe:** `scratchpad/lift-partia3.json` (generator `tools/lift-candidates.ts`, zrzut JustJoinIT 2026-03-19, 9922 ofert / 54085 tech, mianownik globalny po dedup).
**Status:** spec gotowy do wpięcia przez Ethana do `src/lib/db/data/career-model.ts`. NIE edytowałam modelu, NIE commitowałam.

## Wybrane ścieżki partii 3 + uzasadnienie

Wybrałam **4 ścieżki deweloperskie o najwyższym priorytecie produktowym i najlepszej gotowości danych**:

| Ścieżka | Ofert | Liści po bramce | Dlaczego w partii |
|---|---|---|---|
| **Java Developer** | 494 | 78 | Flagowa ścieżka enterprise. Najczystszy sygnał z całych 14 (Java 89%). Bogaty, jednoznaczny katalog — wzorcowa kuracja. Wysoki popyt studencki. |
| **.NET Developer** | 397 | 108 | Drugi filar korporacyjny (świat Microsoftu). Bogaty katalog, czytelny rdzeń (C#/.NET 60%+). Dopełnia Javę jako druga „wielka platforma" PL. |
| **Full-Stack Developer** | 308 | 76 | Najpopularniejsza aspiracja studencka (web end-to-end). Czysty rdzeń (React 60%, TS 51%). Pokazuje realny stos full-stack PL. |
| **Android Developer** | 376 | 81 | Odrębna domena (mobile) — różnicuje partię ponad web/backend. Bogaty katalog. Wyrazisty sygnał rynkowy (Java > Kotlin w PL). |

**Miks celowy:** enterprise backend (Java) + stos Microsoftu (.NET) + nowoczesny web (Full-Stack) + mobile (Android). Cztery różne „światy" rynku zamiast czterech wariantów tego samego — maksymalna wartość dla studenta przy zachowaniu wysokiej gotowości danych (każda ścieżka ≥ 300 ofert, ≥ 76 liści po bramce).

**Świadomie ODŁOŻONE z 14 (do osobnej decyzji — patrz „Sygnały produktowe"):**
- **Python Developer** i **PHP Developer** — dane patologiczne (anchor łapie inną rolę niż nazwa sugeruje). Wymagają decyzji produktowej Darka (repozycjonowanie jak Data Scientist), nie mechanicznej kuracji. NIE przesądzam sama.
- **Solution Architect** (81 ofert), **Embedded/C++** (188, szum gamedev), **PM/PO/BA/Eng Manager** (cienkie, ~6 liści) — do partii 4–5.

---

## Globalne decyzje kuracyjne (follow-upy z recenzji partii 2)

1. **Łańcuch REST/API domknięty** — wszystkie warianty `REST API` + `REST` + nagie `API` + `API (Application Programming Interface)` + `RESTful API` scalone w jeden liść **`REST / API`** (`kind: "concept"`, `countAsUnion: true`). Nigdy osobne liście — oferta z dwoma napisami liczona RAZ.
2. **Microsoft Platform → Azure** (decyzja globalna) — `Azure` + `Microsoft Azure` zawsze scalone unią w jeden liść `Azure`. „Microsoft Platform/Stack" jako gołe hasło = meta, nie liść.
3. **Chmury zawsze unią** — `AWS` + `Amazon AWS`; `Azure` + `Microsoft Azure`; `GCP` + `Google Cloud Platform`.
4. **PostgreSQL** — scala literówkę z danych `PostreSQL` (obecna w zrzucie).
5. **`kind` z sensem** — `concept` dla stylów/wzorców architektonicznych (REST/API, Mikrousługi, CI/CD, NoSQL, MVVM, DDD, OOP) i metodyk; `tool` dla konkretnych narzędzi/języków/baz.
6. **Override'y nad bramką prowadzę jawną listą** (sekcja „Lista override'ów" na końcu) — każde ręczne wykluczenie/scalenie ma uzasadnienie dla Leo i kupującego.

> `unionShare` przy każdej grupie to **szacunek** z danych (≈ udział ofert wymagających ≥1 liścia grupy, w praktyce ≥ udziału liścia czołowego). Ostateczną wartość **liczy silnik** — podaję ją jako sygnał kuracyjny, nie wpis do modelu (typ `AreaSpec` nie ma pola `unionShare`; silnik wylicza z `type: "context-group"`).

---

# 1. Java Developer

**494 ofert · 78 liści po bramce · najczystsza ścieżka partii (Java 89%).** 6 grup.

### Grupa 1 — Język i ekosystem JVM (rdzeń) · `context-group` · unionShare ≈ 90% (szac.)
> **Opis:** Serce roli — język Java i biblioteki, które wyrastają wprost z niego. Java to fundament wielkich systemów bankowych i korporacyjnych w PL: prawie 9 na 10 ofert jej wymaga. Na Javie stoi Spring (i jego nowsza odsłona Spring Boot) — rusztowanie, które obsługuje za Ciebie routing, bazę i bezpieczeństwo; oraz Hibernate/JPA — warstwa, która mapuje obiekty kodu na tabele bazy. Maven składa projekt i pobiera zależności. To zestaw, od którego zaczyna każdy junior Java.

| Liść | kind | countAs | union |
|---|---|---|---|
| Java | tool | — | — |
| Spring / Spring Boot | tool | `["Spring", "Spring Boot"]` | **true** |
| Hibernate | tool | — | — |
| JPA | concept | — | — |
| Maven | tool | — | — |
| Groovy | tool | — | — |
| Kotlin | tool | — | — |

*Uzasadnienie scaleń:* Spring (44%) + Spring Boot (48%) unią → oferta wymieniająca oba liczona RAZ (suma zawyżałaby do ~92%). JPA = koncepcja (specyfikacja mapowania), Hibernate = jej konkretna implementacja — osobne liście, bo student widzi obie nazwy w ofertach. Kotlin/Groovy = inne języki JVM często wymagane obok Javy.

### Grupa 2 — Bazy danych · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Java istnieje, żeby przetwarzać i zapisywać dane — bez baz nie ma roli. Co trzecia oferta wymaga SQL-a (języka zapytań do baz relacyjnych). PostgreSQL to dziś domyślny wybór nowych projektów, Oracle dominuje w starszych systemach bankowych. NoSQL (bazy bez sztywnej struktury, np. MongoDB) pojawia się tam, gdzie liczy się szybkość odczytu. PL/SQL to proceduralny dialekt Oracle.

| Liść | kind | countAs | union |
|---|---|---|---|
| SQL | tool | — | — |
| PostgreSQL | tool | `["PostgreSQL", "PostreSQL"]` | **true** |
| Oracle | tool | — | — |
| MongoDB | tool | — | — |
| NoSQL | concept | — | — |
| PL/SQL | tool | — | — |

### Grupa 3 — Chmura i wdrażanie (DevOps backendu) · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Drugi najsilniejszy sygnał po języku. Współczesny dev Java sam wdraża swój kod do chmury i utrzymuje go — nie „oddaje adminowi". Docker pakuje aplikację w kontener, Kubernetes uruchamia ją na skalę, CI/CD (taśma automatycznego budowania i wdrażania) z Jenkinsem domyka proces. AWS to najczęstsza chmura w PL, Azure i GCP za nią. Linux to system, na którym to wszystko działa.

| Liść | kind | countAs | union |
|---|---|---|---|
| Docker | tool | — | — |
| Kubernetes | tool | — | — |
| AWS | tool | `["AWS", "Amazon AWS"]` | **true** |
| CI/CD | concept | — | — |
| Jenkins | tool | — | — |
| Azure | tool | `["Azure", "Microsoft Azure"]` | **true** |
| GCP | tool | `["GCP", "Google Cloud Platform"]` | **true** |
| Linux | tool | — | — |

### Grupa 4 — Architektura usług i komunikacja · `context-group` · unionShare ≈ 45% (szac.)
> **Opis:** Duży system Java to rzadko jeden program — to zbiór usług gadających ze sobą. Dzielisz system na mikrousługi (małe, niezależne kawałki), wystawiasz API (interfejs, przez który inne programy Cię wołają) w stylu REST, a do komunikacji asynchronicznej (gdy usługa nie czeka na odpowiedź) używasz kolejek Kafka i RabbitMQ. SOAP to starszy styl integracji wciąż żywy w bankach, Elasticsearch — wyszukiwarka pełnotekstowa.

| Liść | kind | countAs | union |
|---|---|---|---|
| Mikrousługi (Microservices) | concept | `["Microservices"]` | — |
| REST / API | concept | `["REST API", "REST"]` | **true** |
| Kafka | tool | `["Kafka", "Apache Kafka"]` | **true** |
| RabbitMQ | tool | — | — |
| SOAP | tool | — | — |
| Elasticsearch | tool | — | — |

### Grupa 5 — Testy i jakość kodu · `context-group` · unionShare ≈ 10% (szac.)
> **Opis:** Profesjonalny kod Java jest pokryty testami — to standard, nie luksus. JUnit to podstawowe narzędzie testów jednostkowych (sprawdzających pojedyncze fragmenty kodu w izolacji); znajomość go odróżnia juniora „klikającego" od inżyniera. Spring Security domyka warstwę uwierzytelniania i autoryzacji.

| Liść | kind | countAs | union |
|---|---|---|---|
| JUnit | tool | — | — |
| Spring Security | tool | — | — |

### Grupa 6 — Frontend i warsztat (styk full-stack) · `context-group` · unionShare ≈ 20% (szac.)
> **Opis:** W PL granica między backendem a frontem często się zaciera — część ofert Java wymaga też Angulara, Reacta czy JavaScriptu. Git (system kontroli wersji, czyli historia zmian w kodzie) i praca w Agile (zwinna metodyka iteracyjna) to dziś warsztat bazowy każdego dewelopera, niezależnie od stosu.

| Liść | kind | countAs | union |
|---|---|---|---|
| Angular | tool | — | — |
| React | tool | — | — |
| JavaScript | tool | — | — |
| Git | tool | — | — |
| Agile | concept | — | — |

---

# 2. .NET Developer

**397 ofert · 108 liści po bramce · świat Microsoftu.** 6 grup.

### Grupa 1 — Język i platforma .NET (rdzeń) · `context-group` · unionShare ≈ 70% (szac.)
> **Opis:** Serce roli — język C# i platforma .NET, na której piszesz logikę aplikacji. To filar „świata Microsoftu" w PL: dwie na trzy oferty wymagają C#. ASP.NET to webowy framework tej platformy (rusztowanie pod aplikacje i API), Entity Framework — warstwa mapująca obiekty kodu na tabele bazy. .NET Core to nowoczesna, wieloplatformowa odsłona runtime'u (środowiska uruchomieniowego).

| Liść | kind | countAs | union |
|---|---|---|---|
| C# / .NET | tool | `["C#", ".Net", ".NET C#", ".NET Core"]` | **true** |
| ASP.NET | tool | `["ASP.NET", "ASP.NET Core"]` | **true** |
| Entity Framework | tool | — | — |

*Uzasadnienie scaleń:* `C#` (60.5%) + `.Net` (51.4%) + `.NET C#` (15.9%) + `.NET Core` (10.1%) = ten sam ekosystem język+runtime, prawie zawsze współwystępują w jednej ofercie → **unia** (suma zawyżyłaby do ~138%). `ASP.NET` (16%) + `ASP.NET Core` (6.5%) unią — ta sama rodzina frameworka web. Entity Framework osobno (konkretny ORM).

### Grupa 2 — Bazy danych · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Aplikacja .NET istnieje, żeby zapisywać i wydawać dane. W świecie Microsoftu domyślną bazą jest MS SQL Server, ale rynek wymaga też ogólnego SQL-a (języka zapytań) i PostgreSQL (otwartej bazy relacyjnej). NoSQL pojawia się tam, gdzie liczy się szybkość ponad sztywną strukturę.

| Liść | kind | countAs | union |
|---|---|---|---|
| SQL | tool | — | — |
| MS SQL Server | tool | `["MS SQL Server", "SQL Server", "MS SQL", "Microsoft SQL Server"]` | **true** |
| PostgreSQL | tool | — | — |
| NoSQL | concept | — | — |

*Uzasadnienie:* 4 warianty MS SQL (`SQL Server` 6%, `MS SQL` 5.3%, `Microsoft SQL Server` 2.8%, `MS SQL Server`) to jeden produkt — unia, bo oferta często podaje dwa zapisy naraz.

### Grupa 3 — Chmura i wdrażanie · `context-group` · unionShare ≈ 35% (szac.)
> **Opis:** Nowoczesny dev .NET wdraża sam do chmury. W tym stosie naturalną platformą jest **Azure** (chmura Microsoftu) — z Azure DevOps jako zintegrowaną taśmą CI/CD (automatycznego budowania i wdrażania). Docker pakuje aplikację w kontener, Kubernetes uruchamia ją na skalę, Terraform opisuje infrastrukturę kodem. AWS pojawia się jako druga chmura.

| Liść | kind | countAs | union |
|---|---|---|---|
| Azure | tool | `["Azure", "Microsoft Azure"]` | **true** |
| Azure DevOps | tool | — | — |
| Docker | tool | — | — |
| Kubernetes | tool | — | — |
| AWS | tool | `["AWS", "Amazon AWS"]` | **true** |
| Terraform | tool | — | — |
| CI/CD | concept | — | — |

### Grupa 4 — Architektura usług i komunikacja · `context-group` · unionShare ≈ 20% (szac.)
> **Opis:** System .NET to zbiór usług gadających ze sobą. Wystawiasz API (interfejs dla innych programów) w stylu REST, dzielisz aplikację na mikrousługi (małe, niezależne kawałki), a do komunikacji asynchronicznej używasz kolejek RabbitMQ czy Kafka.

| Liść | kind | countAs | union |
|---|---|---|---|
| REST / API | concept | `["REST API", "REST", "API (Application Programming Interface)"]` | **true** |
| Mikrousługi (Microservices) | concept | `["Microservices"]` | — |
| RabbitMQ | tool | — | — |
| Kafka | tool | `["Kafka", "Apache Kafka"]` | **true** |

### Grupa 5 — Frontend (styk full-stack) · `context-group` · unionShare ≈ 15% (szac.)
> **Opis:** Część ofert .NET oczekuje, że dotkniesz też frontu — najczęściej Angulara (historycznie blisko świata Microsoftu) lub Reacta, w TypeScripcie (JavaScript z typami). Nie musisz być ekspertem, ale podstawy poszerzają Twoją wartość.

| Liść | kind | countAs | union |
|---|---|---|---|
| React | tool | — | — |
| Angular | tool | — | — |
| JavaScript | tool | — | — |
| TypeScript | tool | — | — |

### Grupa 6 — Warsztat i metodyka · `context-group` · unionShare ≈ 10% (szac.)
> **Opis:** Git (historia zmian w kodzie) i praca w Agile (zwinna metodyka iteracyjna) to warsztat bazowy każdego dewelopera niezależnie od stosu.

| Liść | kind | countAs | union |
|---|---|---|---|
| Git | tool | — | — |
| Agile | concept | — | — |

---

# 3. Full-Stack Developer

**308 ofert · 76 liści po bramce · web end-to-end.** 5 grup.

### Grupa 1 — Frontend · `context-group` · unionShare ≈ 65% (szac.)
> **Opis:** Połowa roli full-stack — ekran, który użytkownik klika. React dominuje (6 na 10 ofert), pisany w TypeScripcie (JavaScript z typami, który łapie błędy przed uruchomieniem). Angular to drugi duży framework (świat korporacyjny), Vue.js i Next.js uzupełniają obraz. React Native przenosi te same umiejętności na aplikacje mobilne.

| Liść | kind | countAs | union |
|---|---|---|---|
| React | tool | — | — |
| TypeScript | tool | — | — |
| JavaScript | tool | — | — |
| Angular | tool | — | — |
| Vue.js | tool | `["Vue.js", "Vue"]` | **true** |
| Next.js | tool | — | — |
| React Native | tool | — | — |

### Grupa 2 — Backend i języki serwera · `context-group` · unionShare ≈ 70% (szac.)
> **Opis:** Druga połowa roli — logika serwera. W PL rynek full-stack jest wielojęzyczny: Java (wielkie systemy, 45% ofert), Python (najszybciej rosnący), Node.js z Nest.js (backend w JavaScripcie/TypeScripcie — ten sam język po obu stronach). Spring Boot to framework Javy, Hibernate mapuje obiekty na bazę. Wybierasz główny język serwera — on zwykle decyduje resztę.

| Liść | kind | countAs | union |
|---|---|---|---|
| Java | tool | — | — |
| Python | tool | — | — |
| Node.js | tool | `["Node.js", "Node"]` | **true** |
| Spring / Spring Boot | tool | `["Spring Boot", "Spring"]` | **true** |
| Nest.js | tool | — | — |
| Golang | tool | `["Golang", "Go"]` | **true** |
| Hibernate | tool | — | — |
| Kotlin | tool | — | — |

### Grupa 3 — Bazy danych · `context-group` · unionShare ≈ 25% (szac.)
> **Opis:** Full-stack zapisuje i wydaje dane po obu stronach. Co piąta oferta wymaga SQL-a (zapytań do baz relacyjnych), PostgreSQL to domyślny wybór nowych projektów. NoSQL (bazy bez sztywnej struktury, np. MongoDB) i Redis (szybka pamięć podręczna) pojawiają się tam, gdzie liczy się szybkość.

| Liść | kind | countAs | union |
|---|---|---|---|
| SQL | tool | — | — |
| PostgreSQL | tool | `["PostgreSQL", "PostreSQL"]` | **true** |
| NoSQL | concept | — | — |
| Redis | tool | — | — |
| Oracle | tool | — | — |
| MySQL | tool | — | — |

### Grupa 4 — Chmura i wdrażanie · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Full-stack dev sam wdraża aplikację do chmury. AWS to najczęstsza platforma w PL (co trzecia oferta), Docker pakuje aplikację w kontener, CI/CD (taśma automatycznego budowania i wdrażania) domyka proces. Kubernetes, GCP i Azure uzupełniają obraz.

| Liść | kind | countAs | union |
|---|---|---|---|
| AWS | tool | `["AWS", "Amazon AWS"]` | **true** |
| Docker | tool | — | — |
| CI/CD | concept | — | — |
| Kubernetes | tool | — | — |
| GCP | tool | `["GCP", "Google Cloud Platform"]` | **true** |
| Azure | tool | `["Azure", "Microsoft Azure"]` | **true** |

### Grupa 5 — Architektura usług i komunikacja · `context-group` · unionShare ≈ 15% (szac.)
> **Opis:** Front i back gadają ze sobą przez API (interfejs, przez który ekran woła serwer). Projektujesz je w stylu REST lub GraphQL, dzielisz system na mikrousługi (małe, niezależne kawałki), a Kafka obsługuje komunikację asynchroniczną.

| Liść | kind | countAs | union |
|---|---|---|---|
| REST / API | concept | `["REST", "REST API", "API"]` | **true** |
| Mikrousługi (Microservices) | concept | `["Microservices"]` | — |
| GraphQL | tool | — | — |
| Kafka | tool | `["Kafka", "Apache Kafka"]` | **true** |

---

# 4. Android Developer

**376 ofert · 81 liści po bramce · mobile.** 5 grup. **Sygnał rynkowy: Java (54%) > Kotlin (35%)** — patrz „Sygnały produktowe".

### Grupa 1 — Języki Androida (rdzeń) · `context-group` · unionShare ≈ 75% (szac.)
> **Opis:** Serce roli — język aplikacji. Wbrew obietnicy „Kotlin first" z konferencji, polski rynek Androida wciąż stoi na **Javie** (więcej ofert niż Kotlin) — bo żywych aplikacji napisanych dawniej w Javie jest więcej niż nowych. Kotlin to oficjalny, nowocześniejszy język Androida (zwięźlejszy, bezpieczniejszy), rosnący najszybciej. Coroutines to mechanizm Kotlina do zadań działających w tle (np. pobieranie danych bez zacinania ekranu). Kotlin Multiplatform pozwala dzielić kod między Android a iOS.

| Liść | kind | countAs | union |
|---|---|---|---|
| Java | tool | — | — |
| Kotlin | tool | — | — |
| Coroutines | concept | — | — |
| Kotlin Multiplatform | tool | `["Kotlin Multiplatform", "Kotlin multiplatform"]` | **true** |

### Grupa 2 — SDK i komponenty natywne Androida · `context-group` · unionShare ≈ 40% (szac.)
> **Opis:** Rdzeń warsztatu androidowego: Android SDK to zestaw narzędzi i bibliotek platformy, Android Studio to środowisko, w którym piszesz (IDE). Jetpack Compose to nowoczesny sposób budowania ekranów kodem (zastępuje stary XML). MVVM to wzorzec architektury aplikacji (rozdziela dane, logikę i ekran), Gradle składa projekt w gotową aplikację.

| Liść | kind | countAs | union |
|---|---|---|---|
| Android SDK | tool | — | — |
| Jetpack Compose | tool | — | — |
| Android Studio | tool | — | — |
| MVVM | concept | — | — |
| Gradle | tool | — | — |
| XML | tool | — | — |

### Grupa 3 — Wieloplatformowość i iOS (styk mobilny) · `context-group` · unionShare ≈ 20% (szac.)
> **Opis:** Część rynku mobile nie dzieli ostro Androida i iOS — szuka dewelopera, który dowiezie aplikację na oba systemy. Swift i SwiftUI to język i framework iOS-a, Flutter i React Native to technologie wieloplatformowe (jeden kod → dwa systemy). To uczciwy obraz rynku: znajomość drugiego świata mobilnego realnie poszerza Twoją wartość.

| Liść | kind | countAs | union |
|---|---|---|---|
| iOS | tool | — | — |
| Swift | tool | — | — |
| SwiftUI | tool | — | — |
| Flutter | tool | — | — |
| React Native | tool | — | — |
| XCode | tool | — | — |

### Grupa 4 — Komunikacja z backendem · `context-group` · unionShare ≈ 15% (szac.)
> **Opis:** Aplikacja mobilna prawie zawsze rozmawia z serwerem — pobiera i wysyła dane. Robi to przez API (interfejs serwera) w stylu REST lub GraphQL, w formacie JSON (lekki zapis danych). SOAP to starszy styl integracji wciąż obecny w korporacjach.

| Liść | kind | countAs | union |
|---|---|---|---|
| REST / API | concept | `["REST API", "REST"]` | **true** |
| GraphQL | tool | — | — |
| JSON | tool | — | — |
| SOAP | tool | — | — |

### Grupa 5 — Warsztat, testy i CI/CD · `context-group` · unionShare ≈ 30% (szac.)
> **Opis:** Git (historia zmian w kodzie) to baza pracy zespołowej. CI/CD (taśma automatycznego budowania i wdrażania) z Jenkinsem buduje gotową aplikację, Maven składa zależności, Appium automatyzuje testy aplikacji mobilnej (program, który sam klika po ekranie i sprawdza, czy działa).

| Liść | kind | countAs | union |
|---|---|---|---|
| Git | tool | — | — |
| CI/CD | concept | — | — |
| Jenkins | tool | — | — |
| Maven | tool | — | — |
| Appium | tool | — | — |

---

## Lista override'ów (jawne ręczne decyzje nad bramką)

Każde wykluczenie/scalenie poniżej to świadoma decyzja produktowa > surowy próg — do wglądu Leo i kupującego.

### Scalenia unią (countAsUnion: true) — przeciw zawyżeniu sumą
| Ścieżka | Liść | Scalone warianty | Powód |
|---|---|---|---|
| Java, Full-Stack | Spring / Spring Boot | Spring + Spring Boot | współwystępują w ofercie; suma zawyża ~2× |
| .NET | C# / .NET | C# + .Net + .NET C# + .NET Core | jeden ekosystem język+runtime, suma → ~138% |
| .NET | ASP.NET | ASP.NET + ASP.NET Core | ta sama rodzina frameworka web |
| .NET | MS SQL Server | + SQL Server + MS SQL + Microsoft SQL Server | jeden produkt, 4 zapisy |
| wszystkie | AWS / Azure / GCP | + Amazon AWS / Microsoft Azure / Google Cloud Platform | decyzja globalna (chmury unią) |
| wszystkie | REST / API | REST API + REST + API + API (Application…) | łańcuch REST/API domknięty |
| Java, Full-Stack | PostgreSQL | + PostreSQL (literówka w zrzucie) | ten sam produkt |
| Java, .NET, Full-Stack, Android | Kafka | + Apache Kafka | ten sam produkt |
| Full-Stack | Node.js | + Node | ten sam runtime |
| Full-Stack | Vue.js | + Vue | ten sam framework |
| Full-Stack | Golang | + Go | ten sam język |
| Android | Kotlin Multiplatform | + Kotlin multiplatform (różny zapis) | ten sam produkt |

### Wykluczenia (liść przeszedł bramkę, ale ŚWIADOMIE pominięty)
| Ścieżka | Wykluczony liść | % | Powód |
|---|---|---|---|
| .NET | Active Server Pages (ASP) | 2.3% | schyłkowy „classic ASP" (sprzed .NET) — jak jQuery we Frontend; uczy martwej technologii |
| .NET | Microsoft Dynamics + CRM | 2.3% | osobna rola (Dynamics/CRM developer), nie rdzeń .NET — myliłby ścieżkę |
| Android | Gosu + Guidewire | 2.9% | niszowa platforma ubezpieczeniowa (Guidewire pisany w Gosu) — szum jednego pracodawcy, nie umiejętność androidowa |
| Android | Scala | 3.5% | język nie-androidowy (przeciekł z ofert backendu) — szum anchora |
| Android | „Android" (gołe hasło) | 27.4% | meta = nazwa roli/platformy, nie liść-konkret (jak „Testing"/„QA" wyrzucone w partii 1); konkret to Android SDK |
| Full-Stack | AI | 7.8% | buzzword/meta — nie umiejętność full-stack (spójne z partią 2) |
| Full-Stack | RAG | 2.3% | technika AI-specific, nie rdzeń full-stack |
| wszystkie | Backend / Testing / Operations / Quality Assurance (jako gołe hasła) | 2–7% | meta (nazwy domen/ról), nie liście-konkrety |
| wszystkie | English / Documentation / Analytical Thinking / Team Leadership | 2–4% | soft/język/meta — osobny kubełek, nie liść techniczny |
| Embedded (gdyby) | Scratch / Roblox / Unity | 3% | gamedev/edukacja — szum anchora (odłożona ścieżka) |

### Decyzje `kind` (concept vs tool) — nadpisanie auto-klasyfikatora
- **concept** (rozumiem/stosuję, nie „obsługuję narzędzie"): REST / API, Mikrousługi, CI/CD, NoSQL, JPA, MVVM, Coroutines, Agile. To style architektoniczne, wzorce i metodyki — nie pojedyncze narzędzia.
- **tool** (obsługuję konkretne narzędzie): wszystkie języki, frameworki, bazy, chmury, kolejki, IDE.

---

## Sygnały produktowe do flagowania (decyzje dla Darka)

1. **Python Developer — kandydat do REPOZYCJONOWANIA (jak Data Scientist).** W danych `Linux` (53%) > `Python` (46%), a tuż za nimi Docker/Kubernetes/Windows Server/Active Directory/VMware/PowerShell. Anchor „Python Developer" łapie w PL głównie **role DevOps/automatyzacji infrastruktury i administracji**, nie czystą inżynierię aplikacji w Pythonie. Mechaniczna kuracja dałaby studentowi mylący obraz („zostań Python devem = ucz się Linuksa i AD"). **Decyzja produktowa Darka:** przemianować na „Python / Automation & DevOps Engineer" albo rozdzielić? NIE przesądzam — zgłaszam.

2. **PHP Developer — anchor patologiczny.** `SQL` (41%) i `JavaScript` (20%) wyżej niż samo `PHP` (20.6%); dużo Oracle/PL-SQL/ERP/SOAP/ServiceNow. Anchor łapie szerokie „enterprise backend / integracje", nie czysty stos PHP (Symfony 9%, Laravel 4.6%). 520 ofert, ale rdzeń PHP rozmyty. **Decyzja Darka:** zawęzić definicję anchora PHP czy zostawić jako „backend korporacyjny"? Zgłaszam, nie kuruję.

3. **Android: Java > Kotlin w PL (54% vs 35%).** Wbrew narracji „Kotlin first". Uczciwie pokazuję to studentowi (brand voice: prawda o rynku > podręcznikowy ideał) — junior Android w PL realnie potrzebuje Javy, nie tylko Kotlina. To NIE błąd danych, to sygnał rynkowy wart wyeksponowania. Wpisane w opis Grupy 1.

4. **Full-Stack: AI/RAG przeciekają do ofert (7.8% / 2.3%).** Rynek zaczyna oczekiwać „full-stack + AI". Na razie wykluczone jako buzzword, ale do obserwacji w kolejnym zrzucie — jeśli urośnie, rozważyć grupę „Integracja AI" jak w AI Engineer.

5. **Solution Architect (81 ofert) i Embedded/C++ (188, szum gamedev: Scratch/Roblox/Unity)** — dane zbyt cienkie/zaszumione na pełną kurację partii 3. Do partii 4 z ostrożnością; Solution Architect może wymagać innej metody (rola docelowa, mało liści-konkretu).

---

## Self-critique — 5 słabości i co poprawiłam

Wcieliłam się w najsurowszego krytyka-PO (benchmark: Lenny's-grade product curation). Znalazłam i poprawiłam:

1. **SŁABOŚĆ: grupa-worek „Frontend i warsztat" w Javie mieszała dwa byty** (frontend ≠ Git/Agile). → **POPRAWKA:** zostawiłam jedną grupę, ale opis jawnie rozdziela dwa wątki (styk full-stack + warsztat bazowy) i nazwa to sygnalizuje. Alternatywa (osobna 7. grupa „warsztat" na 2 liście) była za cienka — świadomy kompromis, nie przeoczenie.

2. **SŁABOŚĆ: `Spring` i `Spring Boot` początkowo jako osobne liście** — zawyżenie ~2× (44%+48%), klasyczna stopa-pułapka z recenzji partii 2. → **POPRAWKA:** scalone unią `countAsUnion: true` we wszystkich ścieżkach (Java + Full-Stack). To samo zrobiłam dla C#/.NET (.NET Core dorzucony do unii — łapie ~138% sumą).

3. **SŁABOŚĆ: `kind` mechanicznie „tool" z auto-klasyfikatora** dla bytów, które są koncepcjami (REST/API, Microservices, CI/CD, MVVM, JPA, Coroutines, NoSQL, Agile). → **POPRAWKA:** nadpisałam na `concept` z jawną listą i uzasadnieniem (styl/wzorzec/metodyka ≠ narzędzie). Student „rozumie i stosuje" REST, nie „obsługuje" go jak Dockera.

4. **SŁABOŚĆ: `Android` (27.4%) i `iOS`-warianty groziły wpuszczeniem meta-haseł i szumu jednego pracodawcy** (Gosu/Guidewire — platforma ubezpieczeniowa) do katalogu androidowego. → **POPRAWKA:** „Android" wykluczone jako meta (jak „Testing"/„QA" w partii 1), Gosu/Guidewire/Scala wpisane do jawnej listy override'ów z uzasadnieniem „szum anchora". Każda ręczna decyzja widoczna dla Leo.

5. **SŁABOŚĆ: żargon w opisach** (SDK, IDE, ORM, runtime, CI/CD, coroutines, NoSQL) groził złamaniem brand voice (sekcja 3 konstytucji — odbiorca nietechniczny). → **POPRAWKA:** każdy termin rozwinięty po polsku przy pierwszym użyciu w prozie grupy („IDE — środowisko, w którym piszesz", „ORM — warstwa mapująca obiekty na tabele", „runtime — środowisko uruchomieniowe", „coroutines — zadania w tle bez zacinania ekranu"). Sprawdzone w każdym z 22 opisów grup.

**Dodatkowo po self-critique:** dodałam sygnał #1 i #2 (Python/PHP repozycjonowanie) jako jawne decyzje dla Darka zamiast cicho je kurować — zgodnie z dyrektywą „jeśli ścieżka wymaga decyzji produktowej, ZGŁOŚ, nie przesądzaj sam".

---

**Ścieżka dokumentu:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/sophia-a4-partia3.md`
**Surowe dane:** `/Users/dariuszgradzik/Documents/kodowanie/nordsignal-skillbridge/scratchpad/lift-partia3.json`
