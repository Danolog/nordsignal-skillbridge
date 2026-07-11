# Audyt dowodowy partii 1 DS — mapa luk dla persony „literalne zero" (1E.0 Faza B)

**Status:** artefakt spike'a 1E.0 (wejście do sekcji D4/D7 ADR-014). **Data audytu
i weryfikacji linków: 2026-07-11.** Metoda: 2 niezależnych agentów (po 5 projektów),
sztywna rubryka: (1) test literalnego zera na `theory_md` + zasobach, (2) test
mechaniczny KAŻDEGO URL (żywotność HTTP + dopasowanie link↔temat + język),
(3) zgodność z QG-5 (`docs/runbooks/projekty-sciezki-runbook.md`), (4) wycena
remediacji w godzinach kuratorskich. Twarda reguła: MAPA, nie poprawki — żaden
plik treści nie został zmieniony.

**Definicja testu literalnego zera:** czy osoba, która nie zna pojęcia zmiennej,
terminalu ani żadnego języka programowania, wykona PIERWSZY krok projektu wyłącznie
z `theory_md` + `learning_resources`, nie opuszczając platformy w dezorientacji.

---

## WYNIK ZBIORCZY

| Miara | Wynik |
|---|---|
| Test literalnego zera | **0/10 projektów przechodzi** |
| Linki żywe (HTTP) | 54/54 unikalnych URL żywych — **zero martwych** |
| Linki NIEDOPASOWANE | 3 (Azure Sandbox → płatny produkt; Kaggle Learn „Intro to Statistics" — kurs nie istnieje; sklearn User Guide jako punkt wejścia dla zera) |
| Linki CZĘŚCIOWE | ~15 (kanały-zamiast-filmów, katalogi-zamiast-treści, nieoznaczone rejestracje, 3 redirecty do aktualizacji) |
| Język zasobów | **~97% wyłącznie EN** (jedyny zasób z PL: Google ML Crash Course; jedyny polski akcent danych: korpus PolEmo) |
| Fail twardy QG-5 | `ds-pierwszy-model-predykcyjny`: ~590 słów < próg 600 (L1); oba L3 bez rozdziału podręcznika open-access; 1 licencja datasetu nieustalona (Cookie Cats) |
| **Łączna wycena remediacji** | **~86,5 h kuratorskich** (43,5 h projekty 1–5 + 43 h projekty 6–10), w rozbiciu: teoria od zera ~34 h / naprawa linków ~18,5 h / rampy wejściowe ~34 h |
| Potencjalna oszczędność | wspólny „moduł zerowy" (środowisko, terminal, Git, notebook — ~8 h zbudowany RAZ) zdejmuje ~8–10 h z sumy ramp; wyceny per projekt zakładają wariant bez współdzielenia |

**Werdykt dla D4 (reuse vs supersede):** rdzenie merytoryczne projektów są DOBRE
(eseje koncepcyjne poprawne, miejscami wzorcowe — baseline/leakage w P3, event-time
w capstone, licencje w NLP), ale **bez ramp wejściowych** — dokładnie scenariusz
„dobre rdzenie bez ramp" → **reuse-as-capstone + owinięcie pozycjami teorii**,
nie rewrite. Warunek konieczny: moduły L0/L1 (drabina do prerekwizytów), bez których
remediacja tekstów „poprawia piętra budynku bez schodów".

**Luki wspólne całej partii (wzorce systemowe):**
1. **Teorie to eseje „dlaczego", nie przewodniki „jak"** — 10/10 zakłada studenta,
   który umie uruchomić kod; żaden nie obsługuje fizycznego pierwszego kroku
   (instalacja, konto, terminal, notebook).
2. **Kaskada fikcyjnych `acquired`** — projekty deklarują nabycie kompetencji
   (Git, Python, SQL, EDA, Docker), których poprzedniki realnie nie uczą; każdy
   kolejny projekt dziedziczy dziurę poprzedniego. Gating jest deklaratywny,
   nie egzekwowalny — drabina modułów nie istnieje.
3. **Biegłość operacyjna spoza `acquired` wymagana wszędzie**: GitHub-workflow,
   terminal, YAML, requirements.txt, zmienne środowiskowe — nigdzie nie uczone.
4. **Bariera językowa**: praktycznie wszystkie zasoby EN bez adnotacji językowej.
5. **Braki QG-5 reguł 6–7 w 10/10**: zero fallbacków (poza niezlinkowanym Groq),
   zero dat weryfikacji linków.
6. **Linki „do platformy" zamiast „do treści"**: cały kanał YouTube (StatQuest ×3),
   katalogi kursów, spisy treści — zero nie umie nawigować od hubu do materiału.
7. **Licencje — relatywnie mocna strona**: wzorcowe w NLP i capstone; drobne fałsze
   etykiet (ISLP „darmowy podręcznik" przy All Rights Reserved; DOI podpisane jako
   licencja); 1 nieustalona (Cookie Cats — formalnie łamie warunek merge'a QG-5 §3);
   MLOps w ogóle bez datasetu w source_links.
8. **Ryzyko operacyjne link-checku** (`project_source_links.isDead`): nyc.gov
   zwraca 403 botom (fałszywy „martwy"), customer-academy to SPA „Loading"
   (fałszywy „żywy") — automat musi mieć UA przeglądarki i detekcję SPA.

**5 najcięższych blokerów (priorytet remediacji):**
1. **Brak jakiejkolwiek ścieżki uruchomienia środowiska** — persona nie wykona
   pierwszego kroku ŻADNEGO projektu; bez modułu zerowego ścieżka martwa od minuty 1.
2. **ds-chmura: link „Microsoft Learn Sandbox" prowadzi do płatnego produktu**
   (Terraform-owy „Azure Sandbox" wymagający subskrypcji — odwrotność obietnicy
   „bez karty") + wewnętrzna sprzeczność teorii („wybierz 1 z 3 chmur" vs „bez
   zakładania kont").
3. **ds-mlops: projekt bez danych** (wymaga treningu na zbiorze, którego nie ma
   w source_links) + błąd rzeczowy (Biome jako linter Pythona) + 5 narzędzi bez
   jednej rampy instalacyjnej + sprzeczne estymaty godzin (28 vs 30–35).
4. **ds-pierwszy-model-predykcyjny: ~590 słów < próg 600** — twardy fail ilościowy
   w metodycznym sercu ścieżki, przy zerowej treści operacyjnej.
5. **Kaskada fikcyjnych `acquired`** — remediacja musi iść w kolejności ścieżki,
   nie per projekt.

---

## Raport szczegółowy — projekty 1–5 (agent B1)

**Metoda:** treść z `tools/content/ds-projects-partia-1.json`; rubryka z
`docs/runbooks/projekty-sciezki-runbook.md` §QG-5; liczba słów mierzona `jq` (±2%).
Linki: WebFetch + kontrola statusu HTTP z UA przeglądarki (2026-07-11).

### 1. `ds-eda-polska-w-liczbach-bdl` (L1, 5 h, ~704 słowa)

**(a) Werdykt testu literalnego zera: NIE PRZEJDZIE** — theory_md to bardzo dobry
esej koncepcyjny o EDA, ale nie zawiera ani jednego zdania o tym, jak zacząć:
persona nie dowie się, czym jest notebook, jak zainstalować Pythona ani jak wywołać API.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Zakłada znajomość pojęć „notebook", „komórka", „markdown w notebooku" — bez definicji, bez instrukcji uruchomienia (Jupyter/Colab nie pada ani razu) | BLOKUJE-POCZĄTKUJĄCEGO | § Warunki, w których EDA działa dobrze |
| Składnia pandas jako oczywistość: `df.describe()`, `df.info()`, `dropna()` — persona nie wie, czym jest Python, funkcja ani obiekt `df` | BLOKUJE-POCZĄTKUJĄCEGO | pierwszy akapit i § Typowe pułapki |
| Zero instrukcji pobrania danych: projekt wymaga REST API GUS BDL, a theory_md nie wyjaśnia, czym jest API, request, JSON ani jak zrobić pierwsze zapytanie | BLOKUJE-POCZĄTKUJĄCEGO | sekcja o BDL mówi *dlaczego*, nigdy *jak* |
| Rubryka wymaga: repo, README, `requirements.txt`, seed, „sensowna historia commitów" — Git jest `acquired`, ale nigdzie nieuczony (brak zasobu Git w projekcie) | BLOKUJE-POCZĄTKUJĄCEGO | rubricJson „Reprodukowalność" vs brak w theory_md |
| Żargon bez rampy: „reprodukowalne repozytorium", „imputacja", „ziarno danych", „wartość oczekiwana" | DEGRADUJE | § Typowe pułapki, § Kolejność |
| Kwartet Anscombe'a przywołany bez linku/ilustracji | KOSMETYKA | § Warunki |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| https://pandas.pydata.org/docs/getting_started/index.html | OK | żywy, ma instalację i 10 tutoriali; EN |
| https://numpy.org/learn/ | OK | żywy, sekcja dla początkujących; EN |
| https://jakevdp.github.io/PythonDataScienceHandbook/ | OK | żywy, darmowy; licencja CC BY-NC-ND; EN; otagowany „course", realnie podręcznik-kanon |
| https://api.stat.gov.pl/Home/BdlApi | OK | żywy, PL, potwierdza CC BY 4.0; rejestracja opcjonalna |
| https://bdl.stat.gov.pl | OK | żywy, PL, bez rejestracji |
| https://creativecommons.org/licenses/by/4.0/ | OK | żywy; istnieje wariant `deed.pl` — nieużyty |

**(d) QG-5:** ~704 słowa — w progu L1 (600–800) ✓. Trzy funkcje: praktyka-docs ✓,
kanon ✓ (PDSH), **wideo/kurs — BRAK**. Licencja datasetu: wzorcowo (CC BY 4.0) ✓.
Licencje zasobów nauki: ustalalne, w danych nieodnotowane. Fallbacki: brak.
Data weryfikacji linków: brak. Język: 2/3 EN bez adnotacji.

**(e) Wycena: 10 h** — teoria od zera 4 h (rampa pojęciowa: co to Python/notebook/
biblioteka, mostek koncept→kod), naprawa linków 1 h (wideo/kurs, wariant PL,
fallbacki, data weryfikacji), rampy wejściowe 5 h (uruchomienie środowiska bez
instalacji [Colab] LUB instalacja lokalna, pierwszy request do BDL API z gotowym
snippetem, szkielet notebooka).

### 2. `ds-sql-analiza-przejazdow` (L1, 4 h, ~707 słów)

**(a) Werdykt: NIE PRZEJDZIE** — teoria zaczyna się od ziarna wiersza i funkcji
okna, czyli od poziomu „SQL znasz, teraz go pogłębiamy"; persona nie dowie się,
czym jest baza danych, tabela, zapytanie ani jak zainstalować i uruchomić DuckDB.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Zakłada składnię SQL: `SUM`, `JOIN`, `GROUP BY`, `WHERE`, CTE bez wprowadzenia; brak sekcji „czym jest tabela/wiersz/zapytanie" | BLOKUJE-POCZĄTKUJĄCEGO | od § Ziarno wiersza do końca |
| Brak instrukcji instalacji/uruchomienia DuckDB lub SQLite — persona nie wie, czym jest terminal, plik `.sql`, jak „uruchomić zapytanie lokalnie" | BLOKUJE-POCZĄTKUJĄCEGO | opis projektu vs theory_md milczy |
| „Skrypt ładujący próbkę" wymagany rubryką — w czym napisany, skąd wziąć próbkę TLC (pełne Parquet mają setki MB) — zero wskazówek | BLOKUJE-POCZĄTKUJĄCEGO | rubricJson „Reprodukowalność" |
| Git/README wymagane rubryką; jedyny zasob Git (Pro Git) po angielsku, bez polskiej wersji | DEGRADUJE | rubricJson „Reprodukowalność" |
| `EXPLAIN`/plan wykonania wprowadzony jednym zdaniem | DEGRADUJE | § Optymalizacja |
| Logika trójwartościowa NULL — świetna treść, przydałby się 1 przykład wykonywalny | KOSMETYKA | § NULL i pułapki filtrowania |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| https://duckdb.org/docs/ | CZĘŚCIOWY | redirect na `/docs/current/`; docelowa strona to indeks referencyjny EN — lepszy cel: strona instalacji |
| https://www.kaggle.com/learn | CZĘŚCIOWY | żywy (SPA); ćwiczenia wymagają konta Kaggle — rejestracja nieoznaczona (QG-5 §4); EN |
| https://git-scm.com/book/en/v2 | OK | żywy, CC BY-NC-SA 3.0; brak pełnego polskiego tłumaczenia — bariera dla persony |
| https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page | OK | HTTP 200 z UA przeglądarki (403 dla botów — **ryzyko fałszywego pozytywu w automatycznym link-checku `isDead`**) |
| https://duckdb.org/docs/ (source_links, duplikat) | CZĘŚCIOWY | jw. |
| https://www.nyc.gov/home/terms-of-use.page | CZĘŚCIOWY | żywy, redirect na `/main/terms-of-use` — zaktualizować; EN |

**(d) QG-5:** ~707 słów ✓ L1. Trzy funkcje: praktyka-docs ✓ (DuckDB), kurs ✓
(Kaggle, z nieoznaczoną rejestracją), **kanon SQL — BRAK** (Pro Git to kanon Gita).
Licencja datasetu: odnotowana uczciwie („nie CC") ✓. Fallbacki: brak. Data: brak.

**(e) Wycena: 8,5 h** — teoria od zera 3 h (rampa: baza/tabela/zapytanie/SELECT),
naprawa linków 1,5 h (2 redirecty, adnotacja rejestracji, kanon SQL, fallbacki),
rampy wejściowe 4 h (instalacja DuckDB dla 3 OS-ów lub wariant przeglądarkowy
[shell.duckdb.org], pobranie próbki TLC z gotowym poleceniem, pierwszy plik `.sql`).

### 3. `ds-pierwszy-model-predykcyjny` (L1, 6 h, ~590 słów)

**(a) Werdykt: NIE PRZEJDZIE** — najlepsza metodycznie teoria w partii (baseline,
leakage, metryki jako oszacowanie), ale w 100% koncepcyjna: między „przeczytałem
o baseline" a „policzyłem baseline w scikit-learn" nie ma żadnego mostu, a to
najkrótsza teoria partii — poniżej progu QG-5.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Zero treści operacyjnej o scikit-learn: nie pada `fit`/`predict`, brak instalacji, wczytania danych UCI (plik .xlsx!), splitu — persona nie wykona kroku 1 | BLOKUJE-POCZĄTKUJĄCEGO | cała treść |
| Python/Pandas jako `acquired` z projektu 1, który też ich nie uczy — kaskada braków rampy | BLOKUJE-POCZĄTKUJĄCEGO | competencies + rubricJson |
| Rubryka wymaga train/test lub k-fold „z opisem uniknięcia leakage" — teoria wyjaśnia *co to*, nie *jak to zrobić* | DEGRADUJE | § Walidacja i ryzyko wycieku danych |
| Seed, `requirements.txt`, historia Git — wymagane, nieuczone | BLOKUJE-POCZĄTKUJĄCEGO | rubricJson „Reprodukowalność" |
| „Macierz pomyłek", „ROC-AUC", „imputacja" rzucone bez definicji/linku punktowego | DEGRADUJE | § Metryka…, § Analiza błędów |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| https://scikit-learn.org/stable/user_guide.html | NIEDOPASOWANY (dla persony) | żywy, ale to referencja dla średniozaawansowanych; dla zera właściwy cel: `getting_started.html`; EN |
| https://developers.google.com/machine-learning/crash-course | OK | żywy, darmowy, bez rejestracji, **dostępny po polsku** — najlepiej dopasowany zasób w całej partii |
| https://www.youtube.com/@statquest | OK | HTTP 200; EN; link do kanału, nie do konkretnej playlisty |
| https://archive.ics.uci.edu/dataset/352/online+retail | OK | żywy, CC BY 4.0 potwierdzona, pobieranie bez rejestracji |
| https://www.statlearning.com/ | CZĘŚCIOWY | żywy, PDF darmowy, ale etykieta „darmowy podręcznik" przemilcza „All Rights Reserved" (QG-5 reguła 3: „darmowy PDF ≠ wolna licencja"); EN, poziom ponad L1 |
| https://doi.org/10.24432/C5BW33 | CZĘŚCIOWY | DOI działa (302 → UCI), ale etykieta mówi „Licencja: CC BY 4.0", a URL prowadzi do datasetu, nie tekstu licencji |

**(d) QG-5:** **~590 słów — PONIŻEJ progu L1 (600–800): jedyny twardy fail liczby
słów w partii.** Trzy funkcje: praktyka ✓ (zły punkt wejścia), kurs ✓ (MLCC),
wideo ✓ (StatQuest). Licencja datasetu ✓. Fallbacki: brak. Data: brak.

**(e) Wycena: 9 h** — teoria od zera 4 h (~200+ słów sekcji operacyjnej: instalacja,
wczytanie .xlsx, `DummyClassifier` jako baseline, wzorzec fit-na-treningu), naprawa
linków 1 h (sklearn→getting_started, StatQuest→playlista, uczciwa etykieta ISLP,
deed CC obok DOI), rampy wejściowe 4 h (szkielet notebooka z pierwszym modelem
end-to-end, checklist antyleakage).

### 4. `ds-llm-strukturalna-ekstrakcja` (L1, 5 h, ~657 słów)

**(a) Werdykt: NIE PRZEJDZIE** — koncepcyjnie wzorowy (halucynacje, ground truth,
klauzula kosztowa, RODO), ale operacyjnie pusty: persona nie wie, czym jest klucz
API, zmienna środowiskowa ani jak wysłać pierwszy request do Gemini.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| „Klucz API trzymaj w zmiennej środowiskowej" — persona nie zna pojęcia zmiennej środowiskowej, terminala ani `.env`; brak instrukcji uzyskania klucza | BLOKUJE-POCZĄTKUJĄCEGO | § Klauzula kosztowa + uwaga końcowa |
| Brak przykładu wywołania modelu (SDK/HTTP) — teoria mówi „prosimy model o JSON", nie pokazując, jak „poprosić" | BLOKUJE-POCZĄTKUJĄCEGO | § Dlaczego strukturalne wyjście |
| „Parsuje odpowiedź do walidowalnego JSON (np. przez schemat)" — walidacja schematem (pydantic/jsonschema) to wiedza L2 bez żadnego zasobu | DEGRADUJE | rubricJson „Poprawność struktury wyjścia" |
| Skąd wziąć ~30 tekstów wejściowych — bez wskazania legalnego źródła; RODO obsłużone, pozyskanie nie | DEGRADUJE | description + § Po co ewaluować |
| Token/temperatura wprowadzone skrótowo | KOSMETYKA | § Czym są LLM i GenAI |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| https://ai.google.dev/gemini-api/docs | OK | żywy; EN; brak na stronie potwierdzenia „free tier bez karty", na którym opiera się opis projektu |
| https://huggingface.co/learn/llm-course/chapter1/1 | NIEDOPASOWANY | żywy — ale etykieta „(prompt engineering, referencja)" fałszywa: kurs **nie uczy prompt engineeringu** (transformers/tokenizery/fine-tuning) |
| https://developers.google.com/machine-learning/crash-course | CZĘŚCIOWY | żywy, PL — ale kurs klasycznego ML; dla luki „LLM/GenAI" dopasowanie luźne |
| https://ai.google.dev/gemini-api/docs/rate-limits | CZĘŚCIOWY | żywy; potwierdza free tier, ale **nie „bez karty"** — twierdzenie wymaga dowodu z datą weryfikacji (QG-5 reguła 5) |

**(d) QG-5:** ~657 słów ✓ L1. Trzy funkcje: praktyka ✓, kurs ✓, **kanon i wideo —
BRAK**. Tylko 2 source_links; brak linku do warunków cenowych free tier (krytyczny
dla klauzuli kosztowej). Dataset: brak (dane własne) — RODO w treści ✓. Fallback:
Groq wymieniony, ale **bez linku**. Data: brak.

**(e) Wycena: 9 h** — teoria od zera 3 h (sekcja operacyjna: konto AI Studio → klucz
→ zmienna środowiskowa od zera → pierwszy request z kodem), naprawa linków 2 h
(uczciwa etykieta HF, zasób prompt-engineering, dowód „free tier bez karty" z datą,
link do Groq), rampy wejściowe 4 h (przewodnik pozyskania 30 legalnych tekstów
+ szablon ground-truth, snippet walidacji JSON).

### 5. `ds-databricks-pyspark-taxi` (L2, 12 h, ~929 słów)

**(a) Werdykt: NIE PRZEJDZIE (w ścieżce zera)** — jako L2 wolno mu zakładać
Python/SQL/EDA, ale skoro L1 partii tych kompetencji realnie nie budują, założenie
wisi w próżni; dodatkowo brak instrukcji pierwszego fizycznego kroku: konto Free
Edition i wprowadzenie Parquet do workspace'u.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Brak kroków ingest: jak wgrać/podpiąć Parquet NYC TLC w Free Edition — rubryka ocenia „poprawny ingest" (waga 20), teoria nie mówi *jak* | BLOKUJE-POCZĄTKUJĄCEGO | rubricJson „Ingest i partycjonowanie" vs theory_md |
| Brak instrukcji założenia konta i mapy workspace (notebook, klaster/warehouse) | BLOKUJE-POCZĄTKUJĄCEGO | § Po co Spark i Databricks |
| Kompetencje `acquired` (Python/SQL/EDA) niedostarczane przez wcześniejsze projekty — dług kaskadowy | DEGRADUJE (systemowe) | competencies |
| „Prosty model" w opisie — bez wskazania czym modelować w Sparku (MLlib nie pada) | DEGRADUJE | description + § Metodyka i pułapki |
| Broadcast join, DAG, predicate pushdown — poprawnie, ale gęsto | KOSMETYKA | § Metodyka, § Format Parquet |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| https://spark.apache.org/docs/latest/api/python/getting_started/index.html | OK | żywy; Live Notebooks (bez instalacji) — najlepszy punkt wejścia; EN |
| https://spark.apache.org/docs/latest/quick-start.html | CZĘŚCIOWY | żywy; Quick Start oparty o spark-shell (Scala/Java/Python) — dla ścieżki PySpark/Databricks częściowo mylący |
| https://www.databricks.com/learn/free-edition | CZĘŚCIOWY | żywy; **strona zapisu/marketingowa otagowana jako „course"** — nie uczy; brak na niej limitów, które theory_md cytuje (2X-Small, 5 jobów) — twierdzenia bez linku źródłowego |
| https://customer-academy.databricks.com/learn | CZĘŚCIOWY | HTTP 200, ale SPA „Loading" — treść za logowaniem; **rejestracja nieoznaczona** (QG-5 §4); ryzyko fałszywego wyniku w link-checku |
| https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page | OK | 200 z UA przeglądarki (403 dla botów) |
| https://www.nyc.gov/home/terms-of-use.page | CZĘŚCIOWY | redirect na `/main/terms-of-use` — zaktualizować |

**(d) QG-5:** ~929 słów ✓ L2 (800–1500); sekcja „Metodyka i pułapki" ✓ — jedyny
w piątce A w pełni zgodny strukturalnie. Zasoby 4 ✓. Trzy funkcje: praktyka ✓,
kurs — wątpliwy, **kanon — BRAK**. Trial-safe: **wzorcowe** (jawna dezaktualizacja
Community Edition 1.01.2026, twardy limit próbki, guardrail kosztowy). Licencja ✓
(„nie CC", uczciwie). Fallbacki: brak. Data: brak. Limity Free Edition bez URL.

**(e) Wycena: 7 h** — teoria od zera 2 h (sekcja ingest + mapa workspace'u), naprawa
linków 2 h (adnotacja rejestracji Academy, degradacja „Free Edition" z funkcji kursu,
link źródłowy limitów, kanon np. „Learning Spark" 2nd ed., fallbacki, redirect ToS),
rampy wejściowe 3 h (walkthrough: konto → notebook → upload próbki → pierwszy `display()`).

### Podsumowanie projektów 1–5 (B1)

**Łączna wycena: ~43,5 h** (teoria od zera 16 h / naprawa linków 7,5 h / rampy
wejściowe 20 h). ~60% kosztu ramp to ta sama materia (środowisko, terminal, Git,
notebook) — wspólny „moduł zerowy" (~8 h raz) obniżyłby sumę o ~8–10 h.

---

## Raport szczegółowy — projekty 6–10 (agent B2)

**Metoda:** jw.; żywotność linków: pełny przebieg curl -L (30 unikalnych URL,
wszystkie HTTP 200, **2026-07-11**) + WebFetch treści dla linków niejednoznacznych.
Liczba słów: `wc -w` na `theory_md`.

**Ustalenie nadrzędne (dotyczy wszystkich 5):** żaden z tych projektów nie jest
i nie powinien być pierwszym kontaktem zera z platformą — wszystkie deklarują
`acquired`: Python, Git, ML itd. Problem: (1) treść zakłada wiedzę **ponad**
zadeklarowane prerekwizyty (Docker, terminal, GitHub-workflow, YAML — nieobecne
w `competencies`), (2) drabina modułów do tych prerekwizytów nie istnieje w partii
— gating jest deklaratywny, nie egzekwowalny.

### 6. `ds-chmura-wdrozenie-modelu` (L2, 12 h, ~956 słów)

**(a) Werdykt: NIE WYKONA pierwszego kroku** — teoria każe „wystawić model na
Streamlit Community Cloud", nie mówiąc, że wymaga to konta GitHub, repozytorium
i pliku aplikacji; środek teorii wewnętrznie sprzeczny z początkiem i końcem co do
tego, czy student w ogóle zakłada konto w chmurze.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Sprzeczność wewnętrzna: „Wybierasz **jedną** chmurę spośród trzech (Azure/GCP/AWS)" vs description i końcowy box „bez zakładania kont, endpoint na Streamlit/HF" | BLOKUJE-POCZĄTKUJĄCEGO | akapit 2 vs blockquote „Bez karty kredytowej?" |
| „przyjmują repozytorium i same budują środowisko" — czym jest repozytorium GitHub, jak je założyć i wypchnąć kod (dosłownie pierwszy krok deployu) | BLOKUJE-POCZĄTKUJĄCEGO | § Co to jest endpoint i kontener |
| „podłącz go do pipeline CI/CD" — CI/CD operacyjnie bez definicji i kroku „jak" | BLOKUJE-POCZĄTKUJĄCEGO | § Metodyka → Baseline i walidacja wdrożenia |
| „w requirements masz scikit-learn bez wersji" — zakłada requirements.txt (niewprowadzony) | DEGRADUJE | § Typowy błąd: brak pinowania |
| „Sekrety zawsze przez zmienne środowiskowe" — pojęcie niewyjaśnione | DEGRADUJE | § Klauzula kosztowa + Typowy błąd: sekrety |
| „Dodaj .gitignore i sprawdź diff przed commitem" — zakłada operacyjny Git | DEGRADUJE | § Typowy błąd: sekrety w repozytorium |
| „cały pipeline transformacji zapisz jako jeden artefakt" — nie nazywa narzędzia (sklearn `Pipeline` + `joblib`) | DEGRADUJE | § Serializacja modelu i kontrakt wejścia |
| „model żyjący wyłącznie w notebooku" — notebook niezdefiniowany | KOSMETYKA | akapit 1 |

**(c) Linki (wszystkie żywe, 2026-07-11)**

| URL | Werdykt | Uwaga |
|---|---|---|
| docs.streamlit.io/deploy/streamlit-community-cloud (LR+SL) | OK | EN; wymaga konta GitHub — rejestracja nieoznaczona (QG-5 §4) |
| huggingface.co/docs/hub/spaces (LR+SL) | OK | EN; wymaga konta HF — jw. |
| learn.microsoft.com/en-us/training/azure/ | OK | EN; katalog szkoleń, pasuje do funkcji „mapa wdrożenia" |
| www.skills.google/ | CZĘŚCIOWY | EN; wymaga rejestracji — nieoznaczone; link do platformy, nie ścieżki cloud |
| skillbuilder.aws/ | CZĘŚCIOWY | EN; wymaga rejestracji — nieoznaczone; strona główna platformy |
| learn.microsoft.com/…/azure-sandbox/azure-sandbox (SL) | **NIEDOPASOWANY** | Etykieta „Microsoft Learn Sandbox — efemeryczny", a strona opisuje **inny produkt**: „Azure Sandbox" — projekt Terraform **wymagający własnej subskrypcji Azure i generujący koszty**. Odwrotność obietnicy „bez karty" (zweryfikowano WebFetch). Właściwy cel: moduły Microsoft Learn z „Sandbox activation" |

**(d) QG-5:** 956 słów ✓; „Metodyka i pułapki" ✓; 5 zasobów ✓ liczbowo, ale
**brak kanonu** ✗; licencja: brak datasetu — n/d ✓; trial-safe: ✓ co do zasady,
podważone błędnym linkiem sandboxa i sprzecznością; fallback ✓ (Streamlit ↔ HF);
rejestracje nieoznaczone przy 4/5 ✗.

**(e) Wycena: ~9 h** — teoria 4 h (usunięcie sprzeczności, rampy GitHub-repo/
requirements/zmienne środowiskowe, joblib/Pipeline); linki 2 h (wymiana Azure
Sandbox, kanon, oznaczenie rejestracji); rampy 3 h (prereq-gate + walkthrough
pierwszego deployu).

### 7. `ds-eksperyment-ab-memo` (L2, 10 h, ~899 słów)

**(a) Werdykt:** koncepcyjnie NAJLEPSZY z piątki B (pojęcia budowane od podstaw:
randomizacja → p-value → moc → memo), ale zero utknie na pierwszym kroku operacyjnym
— teoria ani zasoby nie mówią, jak pobrać CSV z Kaggle, otworzyć go i czym policzyć test.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Brak mostu pojęcie→narzędzie: „test proporcji (z-test lub chi-kwadrat)", „test t" — bez wzmianki o scipy.stats/statsmodels ani jak | BLOKUJE-POCZĄTKUJĄCEGO | § Po co w ogóle test statystyczny |
| „liczysz osiągalny MDE dla danej próby" — obliczenie mocy/MDE niepokryte teorią ani zasobami | DEGRADUJE | blockquote „Analiza mocy na gotowym zbiorze" |
| Pierwszy krok z danymi (konto Kaggle → pobierz → wczytaj w pandas) istnieje tylko w etykiecie source_link | DEGRADUJE | luka strukturalna |
| „sample ratio mismatch", „Bonferroni, Benjamini-Hochberg" — nazwy bez definicji operacyjnej i źródła | DEGRADUJE | § Nierównowaga; § Peeking i wielokrotne testy |
| „heteroskedastyczność" jako żart | KOSMETYKA | § Od liczby do decyzji |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| www.openintro.org/book/os/ | OK | EN; podręcznik open-access, kanon ✓; pobranie PDF prosi o rejestrację — oznaczyć |
| seeing-theory.brown.edu/ | OK | EN; dopasowany; typ „docs" mylny — to pogłębienie |
| www.youtube.com/@statquest | CZĘŚCIOWY | EN; **cały kanał** zamiast playlist o p-value/mocy |
| www.kaggle.com/learn | **NIEDOPASOWANY** | EN; etykieta obiecuje „Intro to Statistics" — **kurs o takiej nazwie nie istnieje** w katalogu Kaggle Learn; wymaga konta |
| kaggle.com/datasets/yufengsui/mobile-games-ab-testing (SL ×2) | CZĘŚCIOWY | żywy (200), strona JS; pobranie wymaga konta (oznaczone ✓); **licencja NIEUSTALONA** — QG-5 §3 przerzucone na studenta |

**(d) QG-5:** 899 słów ✓; „Metodyka i pułapki" ✓; 4 źródła ✓; funkcje: kanon ✓
(OpenIntro), pogłębienie ✓, **praktyka-docs BRAK** (scipy/statsmodels) ✗;
**licencja datasetu nieustalona** — formalnie łamie „warunek merge'a" QG-5 §3 ✗;
fallback datasetu: brak ✗; trial-safe ✓.

**(e) Wycena: ~6 h** — teoria 2 h (most pojęcie→narzędzie + „pierwsze 30 minut
z danymi"); linki 2 h (licencja Cookie Cats — ustalenie/zamiana zbioru, naprawa
wpisu Kaggle Learn, konkretne playlisty StatQuest, docs-praktyka); rampy 2 h.

### 8. `ds-nlp-klasyfikacja-polskich-tekstow` (L2, 12 h, ~945 słów)

**(a) Werdykt: NIE WYKONA pierwszego kroku** (pobranie PolEmo z HF wymaga biblioteki
`datasets` albo nawigacji po plikach — nieopisane), a projekt o **polskim** NLP nie
zawiera ani jednego polskiego zasobu ani nazwy polskiego modelu/narzędzia.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Brak instrukcji pozyskania danych: jak pobrać PolEmo (biblioteka `datasets`, splity, format) | BLOKUJE-POCZĄTKUJĄCEGO | luka strukturalna |
| „lematyzacja… pomaga" bez wskazania JAKIEGOKOLWIEK narzędzia dla polszczyzny (spaCy pl / Morfeusz / stempel) — sedno projektu bez wykonalnej ścieżki | BLOKUJE-POCZĄTKUJĄCEGO | § Specyfika polszczyzny |
| „użyjemy modelu przygotowanego pod polszczyznę" — żadnej nazwy (HerBERT, polish-roberta…) | DEGRADUJE | § Specyfika polszczyzny, ostatnie zdanie |
| „TF-IDF plus regresja logistyczna" — regresja logistyczna nigdzie nie wyjaśniona | DEGRADUJE | § Po co baseline |
| „dopasowanie wektoryzatora na całym zbiorze przed podziałem" — zakłada konwencję fit/transform | DEGRADUJE | § Metodyka → leakage |
| „darmowy Google Colab (GPU)" — czym jest Colab i po co GPU | DEGRADUJE | blockquote „Licencja i dane osobowe" |
| „n-gramy znakowe" bez definicji | KOSMETYKA | § Specyfika polszczyzny |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| huggingface.co/learn/llm-course/chapter1/1 | CZĘŚCIOWY | EN; kurs o LLM — dla „TF-IDF vs embeddingi" pokrywa połowę tematu, zero o polszczyźnie |
| huggingface.co/docs/transformers/index | OK | EN; oficjalne docs ✓ |
| scikit-learn.org/stable/user_guide.html | OK | EN; dopasowany (TF-IDF, metryki), link głęboki, ale funkcjonalny |
| www.youtube.com/@statquest | CZĘŚCIOWY | EN; cały kanał zamiast filmów o metrykach/regresji |
| huggingface.co/datasets/clarin-pl/polemo2-official (SL) | OK | rozbieżność licencji dokładnie jak w etykiecie (tag cc-by-sa-4.0 vs karta CC BY-NC-SA 4.0) — etykieta rzetelna |
| huggingface.co/datasets (SL) | CZĘŚCIOWY | katalog ogólny — quasi-fallback bez wskazania alternatywy |
| creativecommons.org/licenses/by-nc-sa/4.0/ (SL) | OK | tekst licencji ✓ (jest wersja PL) |
| clarin-pl.eu/dspace/handle/11321/710 (SL) | OK | rekord PolEmo 2.0, **CC BY 4.0**, autorzy — zgodne z etykietą; wzorcowa dokumentacja licencyjna |

**(d) QG-5:** 945 słów ✓; „Metodyka i pułapki" ✓; 4 źródła ✓; funkcje: praktyka ✓,
pogłębienie ✓, **kanon BRAK** (kandydat: Jurafsky & Martin SLP3, open-access) ✗;
**licencja: WZORCOWA** — jedyny projekt piątki B w pełni zgodny z QG-5 §3 ✓;
fallback: słaby ~; trial-safe ✓ (Colab).

**(e) Wycena: ~8 h** — teoria 3 h (akapit „pozyskanie danych", nazwane polskie
narzędzia i modele, mini-rampa regresji logistycznej); linki 3 h (kanon SLP3,
≥1 zasób o polskim NLP — docs spaCy pl / karta HerBERT, konkretne filmy StatQuest,
fallback korpusu); rampy 2 h (prereq-gate + checklist Colab).

### 9. `ds-mlops-pipeline-treningowy` (L3, 28 h, ~953 słowa)

**(a) Werdykt: NIE WYKONA nawet kroku zerowego** — projekt spina 5 narzędzi (MLflow,
Docker, kind, Terraform, GH Actions) bez jednej rampy instalacyjnej, teoria każe
trenować „na publicznym, nietrywialnym zbiorze", **którego nie ma w source_links**,
i zawiera błąd rzeczowy (Biome jako linter do projektu w Pythonie).

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| Brak datasetu: trening na „publicznym zbiorze", żaden niepodlinkowany (UCI Online Retail tylko wzmiankowany, bez URL) | BLOKUJE-POCZĄTKUJĄCEGO | § Architektura pkt 1 vs source_links |
| Zero ramp instalacyjnych Docker/kind/Terraform/kubectl (Windows: Docker Desktop + WSL2 — najeżone pułapkami) | BLOKUJE-POCZĄTKUJĄCEGO | cały dokument |
| Słowo **YAML nie pada ani razu**, choć manifesty K8s/workflow GH Actions to YAML; „kubectl apply" bez wyjaśnienia czym jest kubectl | BLOKUJE-POCZĄTKUJĄCEGO | § Architektura pkt 3–5; § Infrastruktura jako kod |
| Błąd rzeczowy: „lint (Biome/ruff)" — Biome linstuje JS/TS, nie Python (przeciek konwencji z tego repo do treści kursu) | DEGRADUJE | § Architektura pkt 5 |
| Niespójność godzin: `estimatedHours: 28` vs nota „licz realnie ~30–35 h" | DEGRADUJE | blockquote „Realizm i zakres (QG-6)" |
| „Terraform z providerem kubernetes" — provider/state/apply-destroy bez wprowadzenia | DEGRADUJE | § Dlaczego IaC; § Architektura pkt 4 |
| „DVC lub hash + snapshot" — narzędzie wskazane bez zasobu, który go uczy | DEGRADUJE | blockquote QG-6 |
| „sygnatura modelu", „Model Registry" — pojęcia MLflow przed kontaktem z narzędziem | KOSMETYKA | § Metodyka, pułapka 2 |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| mlflow.org/docs/latest/ml/getting-started/ (LR+SL) | OK | EN; żywy hub Getting Started ✓ |
| madewithml.com/courses/mlops/ | OK | EN; open-access, bez rejestracji; treść ostatnio nieaktualizowana intensywnie, ale żywa i dopasowana |
| kind.sigs.k8s.io/ | OK | EN; oficjalne docs ✓ |
| developer.hashicorp.com/terraform/tutorials (LR+SL) | OK | EN; części interaktywne wymagają darmowego konta HashiCorp — nieoznaczone |
| docs.github.com/en/actions | OK | EN; oficjalne docs ✓ |
| kubernetes.io/docs/tutorials/ (SL) | CZĘŚCIOWY | EN; tutoriale zakładają klaster i kubectl — ściana dla persony; brak wskazania, od którego zacząć |

**(d) QG-5:** 953 słowa ✓; „Metodyka i pułapki" ✓ + „Architektura rozwiązania" ✓;
5 źródeł ✓ liczbowo; L3 wymaga **≥1 rozdziału podręcznika open-access — BRAK** ✗;
oficjalna dokumentacja ✓ (×4); kanon ✗; **licencja: BRAK datasetu w source_links
w ogóle** — QG-5 §3 niespełnialny do czasu dodania zbioru ✗; trial-safe ✓ (lokalnie,
darmowo — dobra klauzula kosztowa); fallback: brak ✗.

**(e) Wycena: ~11 h (najdroższy)** — teoria 5 h (rampa instalacyjna per OS, akapit
YAML/kubectl, poprawka Biome→ruff, ujednolicenie godzin, akapit o danych); linki 2 h
(dataset z licencją do source_links, rozdział podręcznika open-access — do researchu
kuratorskiego, oznaczenie rejestracji HashiCorp, konkretny tutorial K8s); rampy 4 h
(prereq-gate Docker+terminal, checklist „krok zero", jawna zależność od projektu
chmurowego).

### 10. `ds-capstone-strumien-i-raport` (L3, 28 h, ~922 słowa)

**(a) Werdykt:** jako capstone z założenia niedostępny dla zera (i to uczciwe), ale
nawet student po drabinie utknie na kroku 1 — teoria każe „przetworzyć dane NYC TLC
na strumień z ustalonym rytmem", nie mówiąc, że TLC to duże miesięczne pliki Parquet
ani jak z pliku zrobić producenta zdarzeń; przemilcza wymóg JVM dla lokalnego Sparka.

**(b) Luki teorii**

| Luka | Waga | Gdzie w theory_md |
|---|---|---|
| „przetworzone na strumień z ustalonym rytmem" — zero instrukcji: format Parquet, rozmiar (miesiąc ≈ miliony wierszy), jak czytać, jak symulować strumień (replay z ograniczeniem tempa) | BLOKUJE-POCZĄTKUJĄCEGO | § Architektura pkt 1 |
| PySpark lokalnie wymaga JVM (Java) — niewspomniane; klasyczna ściana pierwszego uruchomienia | BLOKUJE-POCZĄTKUJĄCEGO | cały dokument |
| „Przypnij wersje Sparka i konektora" — bez wskazania JAK znaleźć zgodną parę (maven coordinates spark-sql-kafka) | DEGRADUJE | blockquote „Pinowanie wersji Kafka↔Spark" |
| „syntetycznie wstrzykniętymi anomaliami" — technika nieopisana ani nieźródłowana | DEGRADUJE | § Metodyka, pułapka 2; § Architektura pkt 3 |
| „docker-compose podnosi całość" — zakłada płynność w Dockerze (poprzedni projekt też jej nie uczy) | DEGRADUJE | § Architektura, ostatnie zdanie |
| „EWMA, reguła trzech sigm" — nazwy bez definicji operacyjnej i źródła | DEGRADUJE | § Detekcja anomalii |
| Event-time/watermark — wyjaśnione wzorcowo (jedno z najlepszych miejsc partii) | — (pozytyw) | § Kiedy strumień bije batch |

**(c) Linki**

| URL | Werdykt | Uwaga |
|---|---|---|
| spark.apache.org/docs/latest/structured-streaming-programming-guide.html (LR+SL) | OK | EN; kanoniczny guide ✓ |
| kafka.apache.org/quickstart/ (LR+SL) | OK | EN; quickstart KRaft, zgodnie z etykietą ✓ |
| spark.apache.org/docs/latest/api/python/getting_started/index.html | OK | EN; oficjalne ✓ |
| docs.streamlit.io/deploy/streamlit-community-cloud | OK | EN; wymaga konta GitHub, nieoznaczone |
| scikit-learn.org/stable/user_guide.html | CZĘŚCIOWY | EN; typ „course" błędny (to docs); etykieta obiecuje „Isolation Forest", link do spisu treści — student musi sam znaleźć sekcję 2.7 |
| docs.docker.com/guides/kafka/ (SL) | OK | EN; Kafka w Dockerze, KRaft, gotowy compose ✓ — najpraktyczniejsze źródło projektu |
| www.nyc.gov/site/tlc/about/tlc-trip-record-data.page (SL) | OK | EN; oficjalne dane ✓ |
| www.nyc.gov/home/terms-of-use.page (SL) | CZĘŚCIOWY | redirect na `/main/terms-of-use` — URL nieaktualny (QG-5 §7) |

**(d) QG-5:** 922 słowa ✓; „Metodyka i pułapki" ✓ + „Architektura" ✓; 5 źródeł ✓;
L3: oficjalna dokumentacja ✓ (nadmiarowo), **rozdział podręcznika open-access —
BRAK** ✗; licencja ✓ (NYC TLC + ToS, jawnie „nie CC"); trial-safe ✓ (poprawna
aktualizacja Databricks Free Edition — zgodna z lekcją z runbooka); fallback:
częściowy (compose ✓, danych brak ✗).

**(e) Wycena: ~9 h** — teoria 4 h (akapit „z Parquet do strumienia" z techniką
replay, wymóg JVM, dobór wersji konektora, wstrzykiwanie anomalii); linki 2 h
(podręcznik open-access do detekcji anomalii/statystyki, głęboki link sklearn 2.7,
aktualizacja ToS, poprawka typu zasobu); rampy 3 h (twardy gate „po ds-mlops
i ds-chmura", checklist Docker+Java).

### Podsumowanie projektów 6–10 (B2)

**Łączna wycena: ~43 h** (teoria od zera ~18 h / naprawa linków ~11 h / rampy
wejściowe ~14 h). Do tego nakład wspólny poza wyceną per projekt: decyzja
architektoniczna o drabinie L0/L1 dla literalnego zera — bez niej rampy wejściowe
nie mają się do czego odwoływać.
