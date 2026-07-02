# DS — PARTIA 1: spec projektów dla ścieżki Data Scientist (od zera)

**Autor:** Oliver (agent) · **Data:** 2026-07-01 · **Wersja:** v0.1 (spec do akceptacji, zero treści, zero kodu)
**Proces:** `docs/runbooks/projekty-sciezki-runbook.md` (fazy A–F + bramki QG-1…QG-7)
**Podstawa merytoryczna:** `docs/curation/weryfikacja-ds-plan-projektow.md` (4 werdykty + dowody)
**Kuracja źródłowa:** `career-model.ts` ścieżka „Data Scientist" — 4 grupy, 21 liści (partia 1 kuracji, Sophia)
**Decyzja Darka:** istniejących 7 projektów DS/ML w `seed-projects.ts` (l. 518–787: Titanic, Iris, MNIST…) **nie używamy** — wszystkie projekty powstają od nowa; stare oznaczamy do wycofania z seedu (usunięcie = osobny PR, poza tym speciem). Uczą one datasetów-klisz zakazanych przez QG-4 i rozjeżdżają się z kuracją.

---

## 0. TL;DR

- **10 projektów** (4×L1, 4×L2, 2×L3) pokrywających **5/5 grup** i **23/24 liści** jako `required` (Snowflake świadomie niepokryty — §4).
- **Fundamenty DS są teraz PIERWSZOKLASOWE w modelu** (decyzja Darka 2026-07-01): nowa grupa `career-model.ts` „Fundamenty: statystyka, uczenie maszynowe i EDA" z liśćmi **Statystyka (Statistics)**, **Uczenie maszynowe**, **EDA**, **A/B testing** (3 ostatnie jako `absent` — kuracja ekspercka poza zrzutem tagów). Projekty domykają je jako `required`, matcher je dopasowuje, analiza luk je pokazuje. To NIE jest już tylko „warsztat wbudowany" — to jawne kompetencje.
- Każdy projekt merytoryczny ma w rubryce **5 inwariantów metodycznych** (QG-2): baseline · walidacja · analiza błędów · ograniczenia · reprodukowalność.
- **Zakaz klisz** (Titanic/Iris/MNIST/Boston Housing); dane polskie (GUS BDL, dane.gov.pl) + NYC TLC; **2 projekty z deploymentem** (P6, P10).
- Nazwy `project_competencies` **DOSŁOWNIE** jak liście — uwaga na liść `Statystyka (Statistics)` (z dopiskiem w nawiasie!).

---

## 1. QG-1 — Benchmark pracodawców (wykonany w weryfikacji)

Zebrane oferty junior/mid DS (opisy, nie tagi): Sii, UNIQA, Alior Bank, speedapp, Inuits, IIIT, SIX (PL) + LSEG (global) — URL-e w `weryfikacja-ds-plan-projektow.md` §1.

**Fundamenty (wymagane w ≥3/7 opisów, dopisane do modelu 2026-07-01 jako liście grupy „Fundamenty"):**

| Fundament | Wymagany w ofertach | Liść modelu | Domykany przez |
|---|---|---|---|
| Trenowanie/ewaluacja klasycznych modeli (scikit-learn, XGBoost) | 7/7 | `Uczenie maszynowe` | P3, P6, P8, P9 |
| Statystyka stosowana i wnioskowanie (testy, przedziały, regresja) | 6/7 | `Statystyka (Statistics)` | P3, P7 |
| EDA + czyszczenie brudnych danych | 6/7 | `EDA` | P1, P5 |
| Eksperymentacja A/B | 4/7 | `A/B testing` | P7 |
| Wizualizacja + komunikacja wyników (matplotlib/seaborn, raport) | 5/7 | warsztat wbudowany (kroki briefu/rubryki) | P1, P7, P10 |
| Feature engineering | 4/7 | warsztat wbudowany | P3, P5, P10 |

**Status:** rozpakowanie meta-tagu „Machine Learning" (24.3%) na konkretne fundamenty **WYKONANE** (decyzja Darka 2026-07-01) — grupa „Fundamenty" w `career-model.ts` (liście `Uczenie maszynowe`, `EDA`, `A/B testing` jako `absent`/kuracja ekspercka + `Statystyka (Statistics)` przeniesiona z grupy AI). Matcher dopasowuje po tych liściach, analiza luk je pokazuje. Wizualizacja i feature engineering pozostają warsztatem wbudowanym (za drobne na osobny liść w tym zrzucie).

## 2. QG-2 — Parytet akademicki

- **Kursy referencyjne:** MIT 6.390 ([introml.mit.edu/notes](https://introml.mit.edu/notes/)) i Harvard CS109a ([sylabus](https://harvard-iacs.github.io/2021-CS109A/pages/syllabus.html)); statystyka: OpenIntro + MITx SDS (mapa tematów w raporcie weryfikacji §2).
- **Kalibracja:** L1 ≈ projekt tygodniowy CS50-x · L2 ≈ homework CS109a · L3 ≈ skompresowany trening metodologii projektu badawczego (nie „capstone").
- **Inwarianty (w rubryce każdego z P1, P3, P5, P7, P8, P9, P10):** baseline · walidacja+leakage · analiza błędów · sekcja „Ograniczenia" · reprodukowalność. (P2 i P4 i P6: inwarianty 4–5 zawsze; 1–3 tam, gdzie jest model.)
- **Język:** „standardy metodyczne MIT/Harvard", nigdy „poziom MIT/Harvard".

## 3. QG-3 — Job-readiness

**Checklist profilu wejścia junior DS (z ofert + procesów rekrutacyjnych) → pokrycie:**

| Umiejętność do obrony na rozmowie | Projekty |
|---|---|
| SQL na realnych danych (joins, window functions) | P2, P5 |
| EDA + czyszczenie + decyzje o brakach/outlierach | P1, P5, P8 |
| Model klasyczny z baseline'em, walidacją i metrykami | P3, P8 |
| Eksperyment/A-B: hipoteza, MDE, test, decyzja | P7 |
| Praca na platformie chmurowej (Databricks/Azure/GCP/AWS) | P5, P6 |
| LLM/GenAI: wpięcie modelu + ewaluacja wyjść | P4, P8 |
| Wdrożenie modelu poza notebook | P6, P9 |
| Big Data: Spark/Kafka na danych za dużych na pandas | P5, P10 |
| Komunikacja: decision memo / raport dla nie-technicznych | P7, P10 |

**Czego ścieżka NIE uczy (jawnie w komunikacji):** live coding pod presją rozmowy, werbalne rundy statystyczne (Meta/Google), praca zespołowa i code review, matematyka formalna (algebra liniowa/rachunek), doświadczenie produkcyjne. Drabina: junior PL/EU teraz → top firmy po 2–3 latach doświadczenia.

## 4. Mapa pokrycia — 10 projektów → grupy/liście

Legenda: **R** = `required` (domyka lukę), *a* = `acquired` (prereq). Nazwy liści DOSŁOWNE.

Legenda liści: nazwy **DOSŁOWNE** jak w `career-model.ts`. Fundamenty (nowa grupa): `Statystyka (Statistics)`, `Uczenie maszynowe`, `EDA`, `A/B testing`.

| # | slug | L | h | Grupa wiodąca | Liście **R** | Liście *a* | Dane/środowisko (trial-safe) |
|---|---|---|---|---|---|---|---|
| P1 | `ds-eda-polska-w-liczbach-bdl` | L1 | 5 | Fundament | **Python, Pandas, NumPy, EDA** | SQL, Git | GUS BDL API (CC BY 4.0) — EDA regionu PL, czyszczenie, wizualizacja, repo z historią |
| P2 | `ds-sql-analiza-przejazdow` | L1 | 4 | Fundament | **SQL, Git** | Python | NYC TLC (próbka, DuckDB/SQLite lokalnie) — joins, window functions, agregaty |
| P3 | `ds-pierwszy-model-predykcyjny` | L1 | 6 | Fundamenty | **Uczenie maszynowe, Statystyka (Statistics)** | Python, Pandas | UCI Online Retail lub BDL — baseline → regresja/klasyfikacja (scikit-learn) → walidacja → metryki |
| P4 | `ds-llm-strukturalna-ekstrakcja` | L1 | 5 | AI | **LLM, GenAI** | Python | API LLM (darmowy tier) — prompt engineering, strukturalne wyjście JSON, mini-ewaluacja jakości na 30 przykładach |
| P5 | `ds-databricks-pyspark-taxi` | L2 | 12 | Chmura | **Databricks, PySpark, Spark** | Python, SQL, EDA | Databricks **Free Edition** (NIE Community Edition — wycofana 1.01.2026) + NYC TLC Parquet — ingest, transformacje, EDA na skali, mini-model |
| P6 | `ds-chmura-wdrozenie-modelu` | L2 | 12 | Chmura | **Azure, GCP, AWS** | Python, Git, CI/CD, Uczenie maszynowe | Student wybiera JEDNĄ chmurę (Microsoft Learn Sandbox / GCP free / AWS free tier); brief prowadzi przez wybraną — model z P3 jako endpoint/aplikacja (deployment #1) |
| P7 | `ds-eksperyment-ab-memo` | L2 | 10 | Fundamenty | **A/B testing, Statystyka (Statistics)** | Python, Pandas | Publiczny zbiór eksperymentu A/B (Kaggle, licencja CC) — hipoteza → metryka sukcesu + guardrail → power/MDE → test → **decision memo 1 strona** |
| P8 | `ds-nlp-klasyfikacja-polskich-tekstow` | L2 | 12 | AI | **NLP, Uczenie maszynowe** | Python, Pandas, LLM, GenAI | Polski korpus (HF Datasets PL / dane.gov.pl, licencja sprawdzona) — TF-IDF baseline → embeddingi (HF) → porównanie, analiza błędów |
| P9 | `ds-mlops-pipeline-treningowy` | L3 | 24 | Big Data/wdrażanie | **MLOps, CI/CD, Kubernetes, Terraform** | Python, Git, Uczenie maszynowe | Lokalne: MLflow (śledzenie eksperymentów) + Docker + kind/k3d (Kubernetes lokalnie) + minimalny Terraform; CI GitHub Actions (repo publiczne = darmowe minuty) |
| P10 | `ds-capstone-strumien-i-raport` | L3 | 28 | Big Data (capstone) | **Kafka, Spark, PySpark** | Databricks, MLOps, Statystyka (Statistics), EDA | Kafka w Dockerze (KRaft) → strumień zdarzeń → PySpark agregacje → detekcja anomalii z baseline → raport biznesowy + dashboard (Streamlit, deployment #2) + **szablon portfolio L3** |

**Pokrycie: 5/5 grup, 23/24 liści jako `required`.** Fundamenty domknięte: `EDA` (P1), `Uczenie maszynowe` (P3), `Statystyka (Statistics)` (P3/P7), `A/B testing` (P7). Świadomie niepokryty (wzór E1 §2.5):

| Liść | % | Dlaczego nie | Czym zastąpiony |
|---|---|---|---|
| Snowflake | 1.6 | Trial 30 dni/$400 — łamie zasadę „trial-safe" (QG-5.5); brak darmowego środowiska bez wygasania | Grupa „Chmura i platformy danych" pokryta przez Databricks (P5) + Azure/GCP/AWS (P6); Snowflake jako *a* nigdzie — student z tą luką dostaje P5 (ta sama grupa, przenośna wiedza SQL-on-platform) |

**Priorytet autoringu (popyt):** P1 (Python 54.8% + Pandas + Git), P2 (SQL 28%), P5 (Databricks 18.5%), P6 (Azure 29.1%), potem P3/P4/P7/P8, na końcu P9/P10.

## 5. QG-4/QG-5 — wymagania twarde dla autoringu (Sophia)

1. **Rubryki:** 3–5 kryteriów = 100; inwarianty QG-2 jako kryteria (łącznie 25–40 wag); każde kryterium sprawdzalne z artefaktu; w L2+ jedno kryterium = „metryka biznesowa w README" (formuła „[technika] + [metryka] + [wynik]").
2. **README dla rekrutera** (L2/L3): problem → dane → podejście → wynik z liczbą → demo/zrzut → jak odtworzyć; struktura `data/ notebooks/ src/ requirements.txt`.
3. **theory_md:** progi QG-5 (L1: 600–800; **L2/L3: 800–1500 słów** + sekcja „Metodyka i pułapki", w L3 dodatkowo „architektura rozwiązania" — zasada Darka 2026-07-01). Pisane „dlaczego i kiedy działa", z powiązaniem do kryteriów rubryki.
4. **learning_resources:** L1: 3; **L2/L3: 3–5** per poziom; funkcje kanon+docs+pogłębienie; katalog rekomendowany (z licencjami) w raporcie weryfikacji §4 — m.in. ISLP (linkować, nie kopiować), scikit-learn User Guide, OpenIntro, Kaggle Learn, notatki MIT 6.390, HF LLM Course, docs Spark/Kafka, Microsoft Learn, Databricks Academy.
4a. **Rdzeń akademicki (QG-2.5):** projekty P1/P3/P5/P7/P8/P9/P10 pokrywają w teorii+artefakcie: statystykę i wnioskowanie (P3/P7), trenowanie i ewaluację modeli (P3/P8/P10), generalizację/walidację/leakage (P3/P5/P8), EDA jako metodę (P1/P5), metodologię eksperymentu (P7), etykę i ograniczenia (każdy L2/L3 — sekcja „Ograniczenia").
4b. **Eksperymentacja, product sense, decision memo (QG-4.9):** P7 to pełny projekt eksperymentu A/B z decision memo; briefy P5/P6/P7/P8/P10 (L2+) otwierają się od „zdefiniuj metrykę sukcesu i guardrail" (product sense w rubryce); decision memo jako artefakt w P7 i P10.
5. **Licencja każdego datasetu** w `source_links` (nazwa + URL) — warunek merge'a; ≥2 linki źródła (odporność, migracja 0018).
6. **Zróżnicowanie per student:** brief AI parametryzuje co najmniej zakres danych (np. inny region BDL, inny miesiąc TLC, inna kategoria tekstów) — antyklisza platformowa.
7. **Klauzula kosztowa** w briefach chmurowych: jawna informacja o limitach Free Edition/sandbox/free tier i zakaz przekraczania darmowych kwot.
8. **Znacznik daty** autoringu + snapshot rynku (JustJoinIT 2026) + **data weryfikacji linków** — nagłówek treści.

## 6. QG-6 — Review

Sophia (treść) → Ryan (RODO/licencje datasetów — uwaga na dane osobowe w korpusach tekstów P8) → Ethan (tech/wykonalność, w tym realny przebieg P5/P6/P9/P10 na darmowych środowiskach) → **ekspert domenowy DS** (senior DS/lead spoza zespołu): sign-off P9 i P10 + losowy L2; checklist z runbooka QG-6.

### Wynik QG-6 (2026-07-01) — sign-off warunkowy, poprawki zastosowane

Trzy niezależne recenzje (Ryan, Ethan, ekspert domenowy) z weryfikacją faktów w sieci. **Zero twardych blokad** (żaden projekt niewykonalny, żaden wymagający płatnej licencji, brak kopiowania treści chronionej). Sign-off **warunkowy** — poniższe poprawki **zastosowane i re-zwalidowane** (0 błędów kontraktu, pokrycie 23/24):

| # | Zastrzeżenie (recenzent) | Poprawka |
|---|---|---|
| P10 | „Databricks Community Edition" — wycofana 1.01.2026, sprzeczność z P5 (ekspert, Ethan) | → „Free Edition" + nota o wycofaniu |
| P6 | Azure/GCP/AWS ×`required` przy dotknięciu jednej chmury = inflacja kompetencji; free tiery wymagają karty; MS Learn Sandbox efemeryczny (ekspert, Ethan) | Domyślna droga **card-free** (Streamlit/HF Spaces) jako działający endpoint; trzy chmury `required` uzasadnione **pisemną mapą wdrożenia** (nowe kryterium rubryki); jawne ostrzeżenie o karcie |
| P4 | Anthropic nie ma darmowego tieru API (Ethan) | → wskazany **Gemini/Groq** (card-free) jako droga; Anthropic tylko jako referencja |
| P2, P3, P5, P8, P10 | licencje datasetów niezapisane w `source_links` (Ryan) | dodane: NYC Open Data Terms (P2/P5/P10), CC BY 4.0 + atrybucja UCI (P3), **CC BY-NC-SA 4.0** + nota NC/SA (P8) |
| P7 | licencja Cookie Cats niepotwierdzona (Ryan) | label złagodzony: „zweryfikuj badge przed użyciem; wymaga konta Kaggle" |
| P4, P8 | RODO — dane osobowe w ogłoszeniach/korpusie (Ryan) | dopisane klauzule o pseudonimizacji/niepublikowaniu surowych rekordów |
| P9 | 5 narzędzi w 24h za dużo; Terraform-na-kind poglądowy (ekspert, Ethan) | godziny 24→28; nota o dydaktycznym charakterze IaC + DVC + dataset z licencją |
| P10 | brak pinowania konektora Kafka↔Spark (Ethan) | dopisany wymóg pinowania wersji w rubryce reprodukowalności + teorii |
| P7 | post-hoc power vs planowanie próby ex ante (ekspert) | nota metodyczna w teorii |

**Do weryfikacji ręcznej przed ingestem prod (nie blokuje autoringu):** badge licencji Cookie Cats na Kaggle (P7), rozbieżność tagu HF `cc-by-sa` vs kanoniczne CC BY-NC-SA 4.0 dla PolEmo (P8 — przyjęto wersję ostrożniejszą). Ocena eksperta: **absolwent tych projektów byłby wiarygodnym kandydatem junior DS, wyraźnie powyżej średniej** (inwarianty realnie wymuszone w rubrykach; decision memo i README portfolio na poziomie oczekiwanym na rekrutacji).

## 7. Wykonanie (fazy E–F)

1. ✅ **Plik treści:** `tools/content/ds-projects-partia-1.json` — **NAPISANY 2026-07-01** (10 projektów, kontrakt 1:1 z README-cyber-projects, sluggi `ds-`). Zwalidowany kontraktowo: rubryki=100, nazwy kompetencji dosłownie z liści `career-model.ts`, pokrycie 23/24 (Snowflake poza), theory_md w progach QG-5, sekcje metodyczne obecne, URL-e kanoniczne/darmowe. **Pozostaje:** review QG-6 (Ryan RODO/licencje → Ethan tech → ekspert domenowy) przed ingestem.
2. **Narzędzie ingestu (Leo):** `tools/content-cyber-projects.ts` waliduje nazwy względem liści **cyber** — wymaga uogólnienia: parametr ścieżki (np. `--path "Data Scientist"`) albo rename na `tools/content-projects.ts` z zachowaniem zachowania. Zbiór liści DS importowany z `career-model.ts` (uwaga: `Statystyka (Statistics)` dosłownie).
3. **Parytet test-seed:** nowe projekty DS do `DEMO_PROJECTS`; **stare 7 projektów DS (l. 518–787) do wycofania** w tym samym PR (decyzja Darka — zastępujemy, nie dokładamy obok klisz).
4. **Test integracyjny:** syntetyczny student DS z lukami Python/SQL/Databricks/LLM dostaje projekty partii z matchera.
5. **Ingest prod:** Ethan, bramki v1.12, wzór ADR-009 (backup Neon → narzędzie → weryfikacja 8a–8f → smoke test `/projects`).
6. **QG-7:** pilot 10–15 studentów po publikacji; korekta `estimatedHours` i kalibracji.

## 8. Decyzje

1. ✅ **Rozszerzenie kuracji o fundamenty** — **WYKONANE 2026-07-01** (decyzja Darka): grupa „Fundamenty" w `career-model.ts` + regeneracja artefaktów + aktualizacja testów. Model ma 5 grup DS, 24 liście.
2. ⏳ **Moduł „interview readiness"** (mock interview AI: SQL na żywo, case eksperymentacyjny) — poza zakresem treści projektów, produktowa odpowiedź na lukę QG-3. Rekomendacja: backlog produktu.
3. ⏳ **Uogólnienie narzędzia ingestu** (pkt 7.2) — mały PR Leo przed ingestem prod (autoring treści go nie wymaga; walidacja nazw liści przy ingeście).
