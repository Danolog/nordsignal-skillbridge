# Weryfikacja krytyczna: plan projektów dla ścieżki Data Scientist

**Autor:** Oliver (agent) · **Data:** 2026-07-01 · **Zleceniodawca:** Darek
**Metoda:** 4 niezależnych agentów weryfikacyjnych z researchem webowym (oferty pracy PL/global, sylabusy MIT/Harvard/Stanford, procesy rekrutacyjne top firm, katalog darmowych źródeł). Każde twierdzenie kluczowe ma URL źródłowy.
**Przedmiot weryfikacji:** kuracja DS (4 grupy, `scratchpad/sophia-a4-partia1-qa-ds-ai.md` → `career-model.ts`) + runbook cyber jako proces, którym projekty DS mają powstać **od zera** (7 starych projektów seed z `seed-projects.ts` pomijamy — decyzja Darka).
**Konsekwencje:** naprawiony runbook → `docs/runbooks/projekty-sciezki-runbook.md` (bramki QG-1…QG-7); nowy spec projektów → `docs/curation/ds-projekty-partia-1-spec.md`.

---

## 0. TL;DR — pięć pytań Darka, pięć werdyktów

| # | Pytanie | Werdykt | Jedno zdanie |
|---|---|---|---|
| 1 | Czy projekty pokryją kompetencje wymagane przez pracodawców? | **NIE** (bez korekt) | Kuracja z tagów gubi rdzeń roli — pracodawcy tagują wyróżniki (Azure, LLM), a fundamenty (trenowanie/ewaluacja modeli, statystyka, EDA) wymagają w **opisach** ofert: potwierdzone w 7/7 przebadanych ofert PL. |
| 2 | Czy źródła wiedzy są wystarczające? | **CZĘŚCIOWO** | Wzorzec cyber (~600 słów + 2–3 linki) wystarcza dla L1, dla L2/L3 potrzeba standardu 800–1500 słów z sekcją metodyczną i 3–5 źródeł (kanon + docs + pogłębienie). |
| 3 | Czy wiedza będzie na poziomie MIT/Harvard? | **CZĘŚCIOWO** | Nakładem nie (60–80 h ścieżki vs 150–900 h kursów), ale **rygorem metodycznym pojedynczego artefaktu — tak** (L2 ≈ homework Harvard CS109a), pod warunkiem 5 inwariantów metodycznych w każdej rubryce. |
| 4 | Czy student swobodnie wejdzie w rolę DS w realnej firmie? | **CZĘŚCIOWO** | Będzie zatrudnialnym kandydatem junior w PL/EU (dostanie się na rozmowy i ma czego bronić), ale „swobodne wejście" wymaga domknięcia eksperymentacji, product sense i komunikacji stakeholderskiej w projektach. |
| 5 | Czy projekty dorównają najlepszym firmom świata? | **NIE** (samo portfolio) | W Google/Meta/Amazon/Netflix portfolio otwiera co najwyżej screen — selekcjonuje interview loop (live coding, statystyka werbalna, eksperymentacja); uczciwa obietnica: „portfolio-grade artefakty + osobne przygotowanie do rozmów", nie „wejście do Google". |

**Nadrzędny wniosek:** proces (runbook cyber) jest solidny operacyjnie (kontrakt JSON, idempotentny ingest, bramki RODO/tech), ale **nie ma żadnej bramki jakości merytorycznej** — pokrycie liczy się względem tagów ofert, nie względem realnych wymagań; nie ma benchmarku akademickiego, kryterium job-readiness ani standardu portfolio. To luka systemowa procesu, nie tylko ścieżki DS — naprawiona w runbooku (QG-1…QG-7).

---

## 1. Pokrycie wymagań pracodawców — werdykt NIE (bez korekt)

### Dowód główny: paradoks tagów

Kuracja DS oparta jest na tagach JustJoinIT (378 ofert). Tag `scikit-learn` ma **0 ofert**, `Statistics` 1.6%, a `Machine Learning` (24.3%) wykluczono jako „meta-nazwę roli". Tymczasem **opisy tych samych ofert** wymagają dokładnie tego, czego tagi nie pokazują — zweryfikowano treść 7 ofert PL:

- **Sii** — „standard data stack (pandas, NumPy, scikit-learn)", „solid statistical foundations: hypothesis testing, regression, experimental design", „A/B tests, causal analysis", wizualizacje i dashboardy ([justjoin.it](https://justjoin.it/job-offer/sii-data-scientist---python-cloud-data-platforms-f-m-x--katowice-data))
- **UNIQA** (oferta tagowana „LLM"!) — wymaga scikit-learn, tensorflow/pytorch, xgboost, „algorytmów uczenia maszynowego (regresja, klasyfikacja, segmentacja, NLP)" ([justjoin.it](https://justjoin.it/job-offer/uniqa-specjalistka-specjalista-ds-data-science-llm--warszawa-ai))
- **Alior Bank** — profil ścisły (matematyka/statystyka/ekonometria), modele predykcyjne, segmentacja, wizualizacja ([justjoin.it](https://justjoin.it/job-offer/alior-bank-sa-data-scientist-k-m--warszawa-data))
- **speedapp** — EDA i feature engineering wprost, wnioskowanie statystyczne, matplotlib/seaborn ([rocketjobs.pl](https://rocketjobs.pl/oferta-pracy/speedapp-data-scientist-warszawa-bi-data))
- **Inuits** — „Python (NumPy, Pandas, Scikit-learn)", „A/B testing frameworks, causal inference", XGBoost/LightGBM ([justjoin.it](https://justjoin.it/job-offer/inuits-senior-data-scientist-warszawa-python))
- **IIIT** (junior/mid) — „praktyczna znajomość statystyki i algorytmów machine learning" ([praca.pl](https://www.praca.pl/junior-mid-data-scientist_1406730.html))
- **SIX** (junior) — Azure+GCP+Terraform (potwierdza dryf MLOps) ([rocketjobs.pl](https://rocketjobs.pl/oferta-pracy/six-junior-data-scientist-warszawa-bi-data))

Wg Kaggle Survey ponad 80% zatrudnionych data scientistów używa scikit-learn ([kaggle.com](https://www.kaggle.com/kaggle-survey-2020)). **Wyjaśnienie:** pracodawcy tagują *wyróżniki* oferty (chmura, LLM), a nie *fundamenty domyślnie zawarte w tytule stanowiska*. Tag „Machine Learning" 24.3% to nie szum — to skompresowany rdzeń pracy.

### Co kuracja trafia dobrze

Grupa 1 (Python/SQL/Pandas/Git ~60%) zgodna z raportem No Fluff Jobs 2025/2026 (Python 23.1% i SQL 22.3% — nr 1 i 2 całego rynku IT PL, [raport](https://wp-insights.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/01/15073644/Rynek-pracy-IT-w-Polsce-20252026-No-Fluff-Jobs.pdf)). Chmura/Databricks i LLM/GenAI to realny, rosnący sygnał (DS = zawód nr 1 w ofertach GenAI, [Lightcast](https://lightcast.io/resources/blog/the-generative-ai-job-market-2025-data-insights)). Dryf w stronę inżynierii danych/MLOps jest prawdziwy — ale jest **rozszerzeniem** wymagań, nie **zamianą**.

### Kompetencje BRAKUJĄCE w kuracji, a wymagane w praktyce

1. **Trenowanie i ewaluacja klasycznych modeli ML** (scikit-learn/XGBoost; klasyfikacja/regresja; metryki, walidacja, dane niezbalansowane) — 7/7 ofert
2. **Statystyka i wnioskowanie** (testy hipotez, regresja, A/B testy, causal inference)
3. **EDA i czyszczenie danych** (60–80% realnego czasu pracy DS, [O'Reilly/OptimusAI](https://optimusai.ai/data-scientists-spend-80-time-cleaning-data/))
4. **Wizualizacja i komunikacja wyników** (matplotlib/seaborn, raport dla interesariuszy)
5. **Feature engineering**

### Ryzyko główne

Student z projektami „Databricks + LLM API", który nie umie powiedzieć czym jest overfitting, **odpadnie w 5 minut na każdej z przebadanych rekrutacji** — a rynek juniorski nie wybacza (juniorzy to ~4.8% ogłoszeń data w PL, [justjoin.it](https://justjoin.it/raport-wynagrodzen/ogloszenia-o-prace-w-liczbach)). Paszport „DS bez ML" to ryzyko wiarygodności całego produktu Verified Project Receipts.

### Rozstrzygnięcie napięcia „polski rynek vs kanon" (rekomendacja przyjęta w specu)

Zasada kuracji „nie dopisujemy kompetencji spoza danych" **pozostaje w mocy** — bo kompetencje kanoniczne SĄ w danych: **w opisach ofert, nie w tagach**. Rozwiązanie dwuwarstwowe:
- **Model kariery (liście)** — ✅ **ZREALIZOWANE 2026-07-01 (decyzja Darka):** dodano grupę „Fundamenty: statystyka, uczenie maszynowe i EDA" do ścieżki DS w `career-model.ts`. Liście: `Statystyka (Statistics)` (przeniesiona z grupy AI, z danych), `Uczenie maszynowe`, `EDA`, `A/B testing` (jako `absent` → source „kuracja ekspercka", jawnie poza zrzutem tagów). Meta-tag „Machine Learning" NADAL wyrzucony jako naga nazwa dyscypliny — zastąpiony konkretną kompetencją „Uczenie maszynowe". Artefakty zregenerowane, testy ETL zaktualizowane (DS: 5 grup, 3 liście kuracji eksperckiej).
- **Projekty (treść)**: kanon (EDA → baseline → model → walidacja → ewaluacja → raport) domykają projekty jako `required` na nowych liściach fundamentów (P1 `EDA`, P3 `Uczenie maszynowe`+`Statystyka`, P7 `A/B testing`), a wizualizacja/feature engineering pozostają warsztatem wbudowanym (kroki briefu + rubryka).

---

## 2. Parytet akademicki MIT/Harvard — werdykt CZĘŚCIOWO

### Uczciwa kalibracja nakładu

| Poziom | Realny odpowiednik akademicki |
|---|---|
| L1 (3–6 h) | Projekt tygodniowy Harvard **CS50 AI** (na szablonie); mniej niż jeden tydzień MIT 6.390 (12 h/tydz.) |
| L2 (8–14 h) | **Jeden pełny homework Harvard CS109a** (7 HW = 51% oceny kursu; realnie 8–15 h na prawdziwych danych) — uczciwy i ambitny benchmark |
| L3 (18–30 h) | ~2–3 psety Stanford CS229 albo wczesne milestone'y projektu CS109a — **NIE** pełny projekt finalny (ten to 100–250 osobogodzin zespołu z mentorem TF) |

Cała ścieżka DS (~60–80 h) ≈ **połowa nakładu JEDNEGO kursu MIT** (6.390 ≈ 150–160 h; MicroMasters SDS ≈ 600–900 h). Źródła: [introml.mit.edu](https://introml.mit.edu/notes/), [CS109a syllabus](https://harvard-iacs.github.io/2021-CS109A/pages/syllabus.html), [CS229](https://cs229.stanford.edu/), [MicroMasters SDS](https://micromasters.mit.edu/ds/).

### Czego nakładem nie przeskoczymy — dorównujemy metodą

Rdzeń akademicki nieobecny w kuracji: wnioskowanie statystyczne (u MIT to 2 z 4 kursów MicroMasters), regresja/klasyfikacja „od podstaw", bias–variance/walidacja/leakage, metodologia eksperymentu i ewaluacji (sens MIT 6.C01), EDA jako metoda, etyka/wyjaśnialność (MIT SERC; MIM UW ma obowiązkową XAI — [mimuw.edu.pl](https://www.mimuw.edu.pl/machine-learning-nowy-kierunek-na-studiach-ii-stopnia)). Topowe polskie programy mają ten sam rdzeń — to nie amerykańska specyfika.

**5 inwariantów metodycznych** — do rubryki KAŻDEGO projektu ML/DS (operacjonalizacja poziomu MIT/Harvard w formule 5–30 h):
1. **Baseline** — model trywialny PRZED właściwym; wynik bez baseline'u = kryterium niezaliczone
2. **Poprawna walidacja** — train/val/test lub k-fold + jawny opis ryzyka leakage
3. **Analiza błędów** — min. 5 najgorszych predykcji z hipotezą przyczyny; macierz pomyłek przy klasyfikacji
4. **Sekcja „Ograniczenia"** — czego model nie umie, na czym zawiedzie, co dałby 10× większy budżet
5. **Reprodukowalność** — seed, `requirements.txt`, README z instrukcją, historia Gita (≥ kilka sensownych commitów)

### Nieosiągalne w formule (uczciwie komunikować)

Dojrzałość matematyczna (algebra liniowa/rachunek na WEJŚCIU tych kursów), głębia teoretyczna (VC theory, bayesowskie próbkowanie), praca zespołowa z mentorem-człowiekiem przez tygodnie, skumulowana retencja 600–900 h, sygnał certyfikacyjny proktorowanego egzaminu.

**Język komunikacji (wiążący dla treści i marketingu):** „projekty budowane według **standardów metodycznych** kursów MIT 6.390 i Harvard CS109a, z teorią opartą o darmowe materiały tych uczelni" — TAK. „Wiedza **na poziomie** MIT/Harvard" — NIE.

---

## 3. Job-readiness i najlepsze firmy świata — werdykty CZĘŚCIOWO / NIE

### Co sprawdzają procesy rekrutacyjne (research)

Wspólny mianownik top firm: **rozmowy na żywo**, nie portfolio. Google — SQL/kod na żywo + statystyka i eksperymentacja + product case, 6–12 tygodni samego przygotowania ([Interview Query](https://www.interviewquery.com/interview-guides/google-data-scientist)); Meta — Analytical Execution/Reasoning (werbalna statystyka i metryki produktu, [Prepfully](https://prepfully.com/interview-guides/meta-ds-analytical-execution)); Netflix — causal inference i power analysis ([Interview Query](https://www.interviewquery.com/interview-guides/netflix-data-scientist)); Amazon — ML breadth/depth + Bar Raiser; Stripe/Booking — take-home z prezentacją wniosków ([Stripe](https://www.interviewquery.com/interview-guides/stripe-data-scientist), [Booking](https://www.interviewquery.com/interview-guides/bookingcom-data-scientist)). W PL (Allegro — Devskiller + warsztat; ING/mBank — rozmowa z managerem i omówienie projektu, [jobs.allegro.eu](https://jobs.allegro.eu/recruitment-process/tech-data/)) — tu dobre portfolio realnie przesuwa igłę.

### Głos hiring managerów o portfolio

- **Czerwone flagi:** Titanic/Iris/MNIST/Boston Housing = „przeszedł tutorial", najszybsza droga do kosza ([Careery](https://careery.pro/blog/data-science-careers/data-science-portfolio-projects), [dramsch.net](https://dramsch.net/articles/never-include-these-data-science-projects-on-a-resume/)); pominięcie czyszczenia danych = sygnał braku doświadczenia.
- **Co robi wrażenie:** 3–5 głębokich projektów; brudne prawdziwe dane (open data/API/scraping); **min. 1 wdrożony model** (Streamlit/HF Spaces); README zrozumiałe dla nie-technicznych; efekt wg formuły „[technika] + [metryka modelu] + [wynik biznesowy]" ([Dataquest](https://www.dataquest.io/blog/career-guide-data-science-projects-portfolio/), [365DataScience](https://365datascience.com/career-advice/how-to-build-a-data-science-portfolio/)).
- **Ryzyko klisz platformowych:** jeśli wszyscy studenci oddają identyczny artefakt z identycznych danych, portfolio SkillBridge stanie się rozpoznawalnym szablonem — nowym „Titanikiem". Wymagane zróżnicowanie per student (różne dane/parametry briefu — naturalna rola AI-brief writera).

### Braki formuły do domknięcia w projektach

1. **A/B testing / eksperymentacja** — największa pojedyncza luka względem WSZYSTKICH badanych procesów (od Google po Booking) → dedykowany projekt L2 (hipoteza → power analysis/MDE → test → memo decyzyjne)
2. **Product sense / definiowanie metryk** — briefy L2+ zaczynają się od „zdefiniuj metrykę sukcesu i guardrail"; rubryka ocenia framing, nie tylko kod
3. **Komunikacja stakeholderska** — obowiązkowy artefakt „decision memo / executive summary" (1 strona) w L2/L3
4. **Deployment** — min. 1 projekt ścieżki wdrożony (Streamlit/Gradio/API)
5. **Praca zespołowa i live coding** — poza formułą; uczciwy disclaimer w komunikacji Paszportu + (opcja produktowa, poza zakresem treści) moduł „interview readiness"

**Uczciwa drabina do komunikowania:** SkillBridge → junior DS w PL/EU (Allegro/ING/OLX/banki) → 2–3 lata doświadczenia → Booking/FAANG. Verified Receipt musi linkować do publicznego repo i pokazywać rubrykę (transparentność zamiast „zaufaj odznace").

---

## 4. Wystarczalność źródeł wiedzy — werdykt CZĘŚCIOWO

Wzorzec cyber wystarcza dla L1, dla L2/L3 nie — DS wymaga warstwy metodycznej („dlaczego metoda działa i jak nie oszukać samego siebie"), której nie pomieści 600 słów i 2–3 linki.

**Nowy standard (przyjęty w runbooku, QG-5):**

| Poziom | theory_md | learning_resources |
|---|---|---|
| L1 | 600–800 słów | 3 (1 kanon, 1 docs, 1 wideo/kurs) |
| L2 | 800–1200 słów + sekcja **„Metodyka i pułapki"** | 3–4 |
| L3 | 1000–1500 słów + sekcja metodyczna + „architektura rozwiązania" | 4–5, w tym ≥1 rozdział podręcznika open-access i ≥1 oficjalna dokumentacja |

**Kanon darmowych źródeł DS (pełny katalog w raporcie agenta; najważniejsze):** ISLP (legalny darmowy PDF — [statlearning.com](https://www.statlearning.com/); „All Rights Reserved" → linkować, nie kopiować), Python Data Science Handbook ([jakevdp.github.io](https://jakevdp.github.io/PythonDataScienceHandbook/), CC BY-NC-ND — bez tłumaczenia fragmentów), OpenIntro Statistics (CC BY-NC-SA), scikit-learn User Guide, Kaggle Learn, MIT OCW 6.0002, Harvard CS109 public, notatki MIT 6.390, StatQuest, Google ML Crash Course, HF LLM Course, docs Anthropic/OpenAI prompt engineering, Spark/Kafka quickstart, Microsoft Learn + Sandbox, Databricks Academy (darmowe od 2025).

**Fakty krytyczne wykryte w researchu (aktualizują wiedzę zespołu):**
- **Databricks Community Edition NIE ISTNIEJE od 1.01.2026** ([ogłoszenie](https://community.databricks.com/t5/announcements/psa-community-edition-retires-at-the-end-of-2025-move-to-free/td-p/141888)) — linkować wyłącznie **Free Edition** (serverless, limity: 1 SQL warehouse 2X-Small, 5 równoczesnych jobs, brak R/Scala, PySpark OK). Każdy tutorial sprzed 2025 linkujący `community.cloud.databricks.com` jest martwy.
- Google Cloud Skills Boost → rebrand **skills.google**; skill badges z labami de facto za kredytami.
- Snowflake trial = 30 dni/$400 → projekt musi być „trial-safe" albo Snowflake świadomie niepokryty.
- DeepLearning.AI: darmowe tylko short courses; specjalizacje Coursera = paywall.

**Datasety (zakaz klisz; preferencja polska):** GUS BDL API (CC BY 4.0, [api.stat.gov.pl](https://api.stat.gov.pl/Home/BdlApi)), dane.gov.pl, otwarte dane Warszawy (zweryfikować regulamin licencji!), NYC TLC Trip Records (kanon Big Data/Parquet), Our World in Data (CC BY), UCI (nowe zbiory CC BY 4.0), OpenML, Kaggle Datasets (filtrować po licencji; licencja zapisywana w `source_links` jako warunek merge'a).

---

## 5. Luki procesu (runbooka) i ich naprawa

| Luka w procesie cyber→DS | Naprawa | Gdzie |
|---|---|---|
| Pokrycie liczone względem tagów, nie realnych wymagań (opisów ofert) | **QG-1 Benchmark pracodawców** — rubryki mapowane na wymagania z ≥3 realnych ofert; nota o niedoszacowaniu fundamentów przez tagi | runbook §QG-1 |
| Brak odniesienia akademickiego; poziomy L1–L3 nieskalibrowane | **QG-2 Parytet akademicki** — kalibracja L1/L2/L3 + ≥1 kurs referencyjny per ścieżka + 5 inwariantów metodycznych | runbook §QG-2 |
| Brak kryterium „czy zestaw domyka wejście do roli junior" | **QG-3 Job-readiness** — checklist profilu wejścia + jawna lista czego NIE uczymy | runbook §QG-3 |
| Brak standardu artefaktu portfolio | **QG-4 Portfolio-grade** — szablon (Cel · Dane · Metoda · Wynik · Wnioski · README dla rekrutera), deployment min. 1×, zakaz datasetów-klisz, zróżnicowanie per student | runbook §QG-4 |
| Teoria/źródła bez wymagań minimalnych | **QG-5 Standard źródeł** — progi per poziom, funkcje źródeł, licencje, trwałość linków | runbook §QG-5 |
| Review tylko RODO (Ryan) + tech (Ethan); nikt nie ocenia merytoryki domenowej | **QG-6 Sign-off eksperta domenowego** dla L3 | runbook §QG-6 |
| Brak kalibracji czasów i pętli zwrotnej po publikacji | **QG-7 Kalibracja i pilot** (post-launch) | runbook §QG-7 |

## 6. Wyrywkowa kontrola twierdzeń (spot-check)

Zweryfikowano krzyżowo: (1) wycofanie Databricks CE — ogłoszenie na community.databricks.com i docs Free Edition są spójne; (2) struktura oceny CS109a (7 HW = 51%, projekt 26%) — sylabus 2021 harvard-iacs; (3) oferta Sii z wymogiem scikit-learn/statystyki mimo tagów chmurowych — treść ogłoszenia justjoin.it; (4) 0 tagów scikit-learn w zrzucie JustJoinIT — zgodne z notą kuracji Sophii (`career-model.ts` l. 725). Sprzeczności nie wykryto.

---

**Następny krok:** spec partii 1 projektów DS od zera → `docs/curation/ds-projekty-partia-1-spec.md` (zaprojektowany zgodnie z QG-1…QG-6).
