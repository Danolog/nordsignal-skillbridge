# DS — PARTIA 2: spec projektów chmurowych (Blok B2 planu napraw)

**Autor:** Oliver (agent) · **Data:** 2026-07-13 · **Wersja:** v1.0
**Proces:** `docs/runbooks/projekty-sciezki-runbook.md` v1.1 (fazy A–F + bramki QG-1…QG-7; QG-5 §5 z wyjątkiem karty — decyzja Darka 2026-07-13)
**Kontekst:** plan napraw (Blok B) — `ds-chmura-wdrozenie-modelu` przyznawał Azure/GCP/AWS jako `required`, choć ścieżka była bezkartowa (student nie dotykał żadnej chmury). Po Bloku C (paszport wyłącznie ze zweryfikowanych projektów) taka inflacja stałaby się kredencjałem-kłamstwem. Decyzja właściciela: chmury muszą być pokryte hands-on, nawet za cenę karty (Azure 35%, AWS 30%, GCP 19% ofert DS).
**Plik treści:** `tools/content/ds-projects-partia-2.json`

---

## 0. TL;DR

- **3 projekty L2 × 10 h**: `ds-endpoint-azure`, `ds-endpoint-gcp`, `ds-endpoint-aws` — ten sam
  model (własny artefakt studenta z `ds-pierwszy-model-predykcyjny`), ten sam pipeline
  (budżet → wdrożenie jako kod → smoke test → pomiar latencji → teardown → dowód zerowego
  kosztu), inna platforma (Azure ML managed online endpoint / Vertex AI endpoint /
  SageMaker, domyślnie Serverless Inference). Treść ~80% wspólna.
- **Trzy sluggi, nie jeden z wyborem** (plan napraw B2): mechanizm wariantów projektu nie
  istnieje (`briefTemplate` martwa), a jeden slug z trzema chmurami w `required` wpisałby
  studentowi do paszportu trzy chmury za dotknięcie jednej. Matchmaker i katalog filtrują
  po `required` (exact match) — student z luką „Azure" widzi `ds-endpoint-azure`.
- `required` = **jedna chmura + MLOps**; `acquired` = Python, Git, Uczenie maszynowe.
- **Klauzula karty w PIERWSZYM zdaniu `description`** każdego projektu (QG-5 §5): karta
  wyłącznie do weryfikacji tożsamości, praca w ramach kredytów powitalnych, bezwzględny
  zakaz przekraczania darmowych kwot; **link do panelu budżetu/alertów w `source_links`**.
- Po tej partii + B3 (`ds-chmura` → CI/CD+MLOps `required`) pokrycie ścieżki wraca do
  **23/24 liści** (jedyny niepokryty: Snowflake — bez zmian, spec partii 1 §4).
- Guard maszynowy: `tests/unit/ds/content-ds-projects.contract.test.ts` — katalog
  efektywny (last-wins po slugu), klauzula karty w 1. zdaniu, link budżetu, role B3.

---

## 1. QG-1 — Benchmark pracodawców (wykonany 2026-07-13)

Zebrane oferty junior/mid DS/MLE z wymaganiami z **opisów** (nie tagów); każdy URL
zweryfikowany fetchem 2026-07-13 (daty publikacji nieeksponowane przez portale — podano
datę dostępu; aktualność = brak banera wygaśnięcia):

| # | Firma | Stanowisko (poziom) | Portal | URL | Wymagania z opisu (chmura/wdrożenia) |
|---|---|---|---|---|---|
| O1 | Addepto | Data Scientist / ML Engineer (mid) | justjoin.it | https://justjoin.it/job-offer/addepto-data-scientist-ml-engineer-katowice-ai | „deploying solutions in cloud environments (AWS or Azure)"; „from scratch to production deployment"; MLOps, Kubernetes, Docker; CI/CD (GitHub Actions) |
| O2 | VirtusLab | Python/ML Engineer (regular) | justjoin.it | https://justjoin.it/job-offer/virtuslab-python-ml-engineer-regular-senior--krakow-ai | „seamless deployment and serving of ML models"; „resilient MLOps Ecosystem"; Azure + IaC; CI/CD; monitoring (Grafana/Prometheus) |
| O3 | TechnipFMC | Machine Learning Engineer (mid) | justjoin.it | https://justjoin.it/job-offer/technipfmc-machine-learning-engineer-krakow-ai | „MLOps practices for production-grade ML pipelines on cloud platforms (e.g., **AWS SageMaker, Azure ML, or GCP Vertex AI**)"; deployment przez API; CI/CD; monitoring modeli |
| O4 | Accenture | Data Scientist (junior/mid) | justjoin.it | https://justjoin.it/job-offer/accenture-data-scientist---junior-mid-senior---ich-europe-warszawa-data | „delivering analytical projects with top Cloud platforms such as GCP, Azure, AWS"; MLOps (MLflow/Kubeflow/Airflow) — ważna do 19.07.2026 |
| O5 | Limango | ML Engineer — personalization (mid) | rocketjobs.pl | https://rocketjobs.pl/oferta-pracy/limango-machine-learning-engineer-personalization-m-f-d-krakow-bi-data | „building and deploying ML solutions"; monitoring/utrzymanie pipeline'ów; „automatic deployments"; MLflow nice-to-have |
| O6 | Xceedance | Junior Generative AI Developer (junior) | justjoin.it | https://justjoin.it/job-offer/xceedance-consulting-polska-sp-z-o-o--junior-generative-ai-developer-krakow-python | „cloud platforms (**AWS SageMaker, GCP Vertex AI, Azure ML**)"; deployment tools (FastAPI, Docker, MLflow); optymalizacja kosztów inferencji |
| O7 | RADAR (global) | Machine Learning Engineer | Greenhouse | https://job-boards.greenhouse.io/radar/jobs/7354751 | „Hands-on experience with cloud ML platforms (**AWS SageMaker, Vertex AI, or Azure ML**)"; production pipelines dla serving; CI/CD z walidacją modeli; monitoring i observability |

**Zliczenia:** chmura w opisie 6/7; deployment/serving 6/7; MLOps lub CI/CD 7/7;
Docker wprost 3/7. **Triada „SageMaker / Vertex AI / Azure ML" pada dosłownie w 3/7 ofert**
(O3, O6, O7) — dokładnie temat tej partii.

**Warsztat wbudowany** (wymagany w ≥3/7 opisów, nieobecny w liściach): monitoring modeli
i observability (O2, O3, O7) — w tej partii świadomie tylko jako pomiar latencji/smoke test
i sekcja Ograniczeń („brak monitoringu"); pełny monitoring to materiał na projekt MLOps L3
(już istnieje: `ds-mlops-pipeline-treningowy`). Optymalizacja kosztów inferencji (O6) —
wchodzi wprost jako kryterium rubryki (guardrail kosztowy, wybór najtańszej instancji,
Serverless vs real-time).

**Mapowanie kryteriów rubryki → oferty** (każde kryterium wskazywalne w ≥1 ofercie):

| Kryterium rubryki (wspólne dla trzech projektów) | Oferta |
|---|---|
| Guardrail kosztowy przed pierwszym zasobem | O6 („optimize inference costs"), O7 (observability/koszty produkcyjne) |
| Wdrożenie managed endpointu jako kod | O3, O6, O7 (dosłownie SageMaker/Vertex/Azure ML); O1, O2 (deployment w chmurze, IaC) |
| Smoke test poprawności i pomiar latencji | O2, O3, O7 (serving + monitoring/walidacja modeli); O5 („automatic deployments" z testami) |
| Sprzątanie i dowód zerowego kosztu | inwariant procesu QG-5 §5 (zakaz przekraczania darmowych kwot) + O6 (koszty inferencji); jawne uzasadnienie: kryterium bez odpowiednika 1:1 w ofertach, wymuszone regułą bezpieczeństwa kosztowego runbooka |
| README dla rekrutera z metryką biznesową i Ograniczeniami | QG-4 §4/§5 (standard portfolio-grade); O5/O7 (komunikacja utrzymaniowa, dokumentacja pipeline'ów) |

## 2. QG-2 — Parytet akademicki

- **Kurs referencyjny:** Stanford **CS329S — Machine Learning Systems Design**
  (https://stanford-cs329s.github.io/syllabus.html — publiczne materiały; deployment,
  serving, monitoring, MLOps tools) + uzupełniająco **Full Stack Deep Learning 2022**
  (https://fullstackdeeplearning.com/course/2022/ — „free forever"; wykład 5 Deployment).
  Kalibracja L2 bez zmian: ≈ jeden duży homework kursu typu CS109a (pełny mini-cykl,
  8–14 h — tu 10 h).
- **Tematy-rdzeń CS329S pokryte w tej partii:** deployment i serving (projekt), kontrakt
  wejścia/predykcji (teoria + rubryka), koszty infrastruktury (teoria + guardrail).
  **Jawnie poza formułą:** monitoring produkcyjny i continual learning (→ L3 MLOps),
  batch prediction, skalowanie pod ruchem (komunikacja „czego nie uczymy" — §3).
- **Inwarianty QG-2 w projekcie wdrożeniowym** (jak P6 partii 1 — inwarianty 4–5 zawsze,
  1–3 w adaptacji wdrożeniowej): baseline = smoke test na znanych predykcjach policzonych
  lokalnie; walidacja = seria żądań z medianą/p95 i osobnym zimnym startem; analiza
  błędów = rozjazd wersji/preprocessingu opisany w teorii i sprawdzany smoke testem;
  sekcja „Ograniczenia" w README (kryterium 5); reprodukowalność = wdrożenie wyłącznie
  jako kod + przypięte wersje (kryterium 2).
- **Język:** „standardy metodyczne kursów Stanford/MIT", nigdy „poziom Stanford".

## 3. QG-3 — Job-readiness

Checklist profilu wejścia (delta względem partii 1 — pokrywa lukę „praca na chmurze
produkcyjnej", dotąd zaspokajaną tylko deklaratywnie przez mapę wdrożenia w P6):

| Umiejętność do obrony na rozmowie | Projekt |
|---|---|
| Wdrożenie modelu na zarządzanej platformie ML (dokładnie: Azure ML / Vertex AI / SageMaker) | ds-endpoint-* (odpowiednio) |
| Dyscyplina kosztowa w chmurze: budżet+alert, dobór instancji, teardown | wszystkie trzy |
| Rejestr modeli, wersjonowanie artefaktu, zgodność wersji frameworka | wszystkie trzy |
| Pomiar charakterystyki usługi (mediana/p95, zimny start) | wszystkie trzy |

**Czego ta partia NIE uczy (jawnie):** monitoringu produkcyjnego i alertowania na jakość
modelu, autoskalowania pod realnym ruchem, sieci/VPC i uprawnień enterprise (IAM poza
minimum), utrzymania endpointu w czasie (endpoint jest celowo usuwany po weryfikacji —
trwały endpoint portfolio pochodzi z bezkartowego `ds-chmura-wdrozenie-modelu`).

## 4. Mapa pokrycia — delta katalogu efektywnego

Nazwy liści DOSŁOWNE z `career-model.ts`.

| slug | L | h | Liście **R** | Liście *a* | Środowisko (QG-5 §5: wyjątek karty) |
|---|---|---|---|---|---|
| `ds-endpoint-azure` | L2 | 10 | **Azure, MLOps** | Python, Git, Uczenie maszynowe | Konto darmowe Azure: 200 USD/30 dni, karta = weryfikacja tożsamości, brak auto-przejścia na płatne; F2s_v2 (fallback DS3_v2); teardown = usunięcie grupy zasobów |
| `ds-endpoint-gcp` | L2 | 10 | **GCP, MLOps** | Python, Git, Uczenie maszynowe | Free trial GCP: 300 USD/90 dni, ręczny upgrade po trialu; prebuilt kontener scikit-learn; endpoint płatny także bezczynny → undeploy+delete |
| `ds-endpoint-aws` | L2 | 10 | **AWS, MLOps** | Python, Git, Uczenie maszynowe | AWS Free Tier (plan free 6 mies., 100 USD + do 100 USD); konto nie może wygenerować rachunku (zamyka się); domyślnie Serverless Inference |
| `ds-chmura-wdrozenie-modelu` (B3, partia 1r) | L2 | 12 | **CI/CD, MLOps** (było: Azure, GCP, AWS) | Python, Git, Uczenie maszynowe | bez zmian treściowo — bezkartowy Streamlit/HF + mapa wdrożenia; szczebel przed managed endpointem |

**Pokrycie katalogu efektywnego po partii 2 + B3: 23/24 liści jako `required`** —
Azure/GCP/AWS przechodzą z inflacyjnego przyznania w P6 do pokrycia hands-on; CI/CD
(dotąd tylko w L3 `ds-mlops-pipeline-treningowy`) zyskuje pokrycie na L2. Jedyny liść
niepokryty: **Snowflake** (świadomie — trial 30 dni/400 USD łamie trial-safe i nie ma
odpowiednika hands-on; uzasadnienie bez zmian, spec partii 1 §4).

**Dlaczego wyjątek karty jest tu zasadny (QG-5 §5):** Azure 35%, AWS 30%, GCP 19% ofert
DS (benchmark QG-1 kuracji) — dwa najsilniejsze liście po Pythonie; bezkartowy
odpowiednik hands-on dla zarządzanych platform ML nie istnieje (Microsoft Learn wycofał
sandboxy; SageMaker Studio Lab nie wspiera endpointów i zamyka się dla nowych kont
30.07.2026).

## 5. QG-4/QG-5 — checklista wymagań twardych

1. **Rubryki:** 5 kryteriów = 100; inwarianty w adaptacji wdrożeniowej (§2); kryterium
   „README z metryką biznesową" w formule „[technika]+[metryka]+[wynik]"; wszystkie
   kryteria sprawdzalne z artefaktu (repo: skrypty, zapisy żądań/odpowiedzi, zrzuty
   budżetu i kosztów) — **celowo BEZ kryterium żywego URL**: utrzymywanie endpointu
   online paliłoby kredyt i łamało zakaz kwotowy; dowód działania = artefakty. To jawne
   odstępstwo od wzorca P6 (tam endpoint card-free jest trwały i klikalny).
2. **Dane:** brak nowego datasetu — wejściem jest własny model studenta z
   `ds-pierwszy-model-predykcyjny` (dane UCI Online Retail z licencją CC BY 4.0
   odnotowaną w partii 1/1r). `sourceType: oss`, `sourceUrl` = kanoniczny tutorial
   platformy.
3. **theory_md:** 1034 / 1076 / 1185 słów (próg L2: 800–1500) z sekcją „Metodyka
   i pułapki"; pisane „dlaczego i kiedy", z powiązaniem do kryteriów rubryki.
4. **learning_resources:** 4 per projekt (docs platformy ×2 = praktyka; CS329S = kanon;
   FSDL = pogłębienie), komplet metadanych `license`/`language`/`registrationRequired`/
   `verifiedAt: 2026-07-13`. Licencje: Microsoft Learn CC BY 4.0 (treść)/MIT (kod);
   Google Cloud docs CC BY 4.0/Apache 2.0; AWS docs własnościowa (linkować, nie
   kopiować); CS329S materiały publiczne © autorów; FSDL © The Full Stack („free
   forever").
5. **source_links:** w każdym projekcie strona kredytu/planu darmowego (z notą
   o karcie), **link do panelu budżetu/alertów** (wymóg QG-5 §5) i cennik; etykiety
   z datą weryfikacji.
6. **Zróżnicowanie per student (QG-4 §7, w `description` — nie w teorii):** własny model
   z projektu źródłowego (zadanie predykcyjne + punkt odcięcia), wybór regionu
   z porównaniem cen, własny zestaw przypadków testowych.
7. **Klauzula kosztowa:** pierwsze zdanie `description` (guard maszynowy w teście
   kontraktowym) + sekcja kosztowa w teorii; jawnie: alert budżetowy **informuje, nie
   zatrzymuje** — twardą ochroną jest teardown.
8. **Data weryfikacji linków:** 2026-07-13 (agent researchu, oficjalne domeny; szczegóły
   w §7).

## 6. QG-6 — Review

Zgodnie z runbookiem v1.1: **agent-recenzent z soczewką praktyka jest dopuszczalny dla
treści przed pilotażem**; sign-off żywego człowieka wymagany przed pierwszym Verified
Receipt opartym na partii. Partia nie zawiera L3, ale wprowadza wymóg karty — plan napraw
(Blok D3) wskazuje, że **losowy L2 do przeglądu żywego eksperta ma objąć co najmniej
jeden projekt chmurowy z tej partii** (akcja Darka do pilotażu).

### Wynik recenzji agentowych (2026-07-13) — GO Z NOTAMI ×2, poprawki zastosowane

- **Ryan (RODO/licencje/karta): GO Z NOTAMI** (0 KRYT / 2 WAŻN / 3 INFO). WAŻN
  zastosowane w treści: (1) nakaz zamazania identyfikatorów konta/subskrypcji i e-maila
  na zrzutach paneli commitowanych do publicznego repo (kryterium 1 + description +
  „Metodyka i pułapki"); (2) higiena sekretów przy zapisach żądań/odpowiedzi —
  maskowanie nagłówków uwierzytelniających, klucze wyłącznie w zmiennych środowiskowych
  (kryterium 3 + teoria). INFO zastosowane: złagodzona etykieta polityki danych Groq
  (bez „domyślnie bez retencji"); pół zdania o utracie zasobów po zamknięciu planu AWS
  w description.
- **Ethan (tech/wykonalność): GO Z NOTAMI** (0 KRYT / 3 WAŻN / 5 INFO). Potwierdzone
  w kodzie: matchmaker/katalog kierują lukę „Azure" na `ds-endpoint-azure`, lukę
  „CI/CD" na `ds-chmura`; endpoint-check Bloku E nie koliduje (partia 2 świadomie bez
  kryterium żywego URL); kontrakt README przechodzi klasy synonimów. WAŻN zastosowane:
  (2) kryterium „Sprzątanie i dowód zerowego kosztu" dopuszcza równoważnie tekstowy
  eksport/wyjście CLI obok zrzutu (AI-reviewer nie czyta obrazów; forma tekstowa
  preferowana); (3) klauzula „kredyty przysługują NOWYM kontom" w description każdego
  projektu. WAŻN-1 odnotowane jako dług — patrz niżej.

**DŁUG do iteracji 1E.R2 (Ethan WAŻN-1, świadomie nieblokujący):**
`ds-chmura-wdrozenie-modelu` po B3 przyznaje `CI/CD` jako `required`, ale żadne
kryterium rubryki nie wymusza pipeline'u CI (CI/CD żyje w teorii: „podłącz smoke test
do CI/CD"). Rubryk celowo nie dotykamy w tym bloku (reopen QG-2 i audytów pojemności
D10). Propozycja na 1E.R2 (gdzie rubryki i tak się zmieniają): rozszerzyć kryterium
„Konteneryzacja i higiena konfiguracji" o „workflow CI uruchamiający smoke test po
push". Do tego czasu kredencjał CI/CD z tego projektu opiera się na briefie i teorii,
nie na twardym kryterium.

**Nota (Ethan INFO-6):** wpisy `ds-endpoint-*` w `seed-projects.ts` mają skrócone
`description` (rubryki i kompetencje 1:1 z JSON) — akceptowalne dla danych demo,
źródłem prawdy katalogu jest plik partii.

## 7. Fakty zweryfikowane 2026-07-13 (research przed autoringiem)

- **Azure:** konto darmowe 200 USD/30 dni; karta kredytowa/debetowa (nie prepaid) +
  telefon, hold ~1 USD zwracany; brak auto-przejścia na płatne. Endpoint = VM/h
  (F2s_v2 ~0,085 USD/h; DS3_v2 ~0,29 USD/h — SKU z tutoriala); brak always-free na
  compute AML; workspace zostawia ACR/Storage/Key Vault/App Insights → sprzątanie całą
  grupą zasobów; rezerwacja 20% kwoty vCPU przy deploymencie.
- **GCP:** trial 300 USD/90 dni; karta = weryfikacja/antyfraud; po trialu 30 dni grace
  i RĘCZNY upgrade; trial bez GPU i podnoszenia kwot. Endpoint płatny per node-hour
  (inkrementy 30 s) **także bezczynny**; cennik Vertex przebudowany (rebranding) — ceny
  z kalkulatora, linki dokumentacji na docs.cloud.google.com.
- **AWS:** Free Tier po 15.07.2025 = 100 USD + do 100 USD, plan free 6 mies., karta
  wymagana (hold 1 USD); **konto free nie może wygenerować rachunku — zamyka się**;
  lista usług planu free dynamiczna → **dostępność SageMaker w planie free do
  weryfikacji ręcznej przed ingestem prod** (treść zawiera instrukcję awaryjną: nie
  przechodzić na plan płatny, wykonać wariant Azure/GCP). Serverless Inference skaluje
  do zera; legacy free tier SageMaker: 125 h/mies. m4/m5.xlarge i 150 000 s Serverless
  przez 2 miesiące. SageMaker Studio Lab: bez endpointów, zamyka się dla nowych kont
  30.07.2026 — nieużywany w treści.
- **Budżety nie zatrzymują wydatków** (Azure/GCP — tylko alerty; AWS — budget actions
  mogą blokować provisioning) — treść nigdzie nie obiecuje „budżet ochroni przed
  kosztami".

**Do weryfikacji ręcznej przed ingestem prod (nie blokuje autoringu):** dostępność
SageMaker w AWS free planie (test na świeżym koncie lub potwierdzenie listy usług);
aktualna cena najmniejszej maszyny endpointu Vertex w wybranym regionie (kalkulator).

## 8. Wykonanie (fazy E–F)

1. ✅ **Plik treści** `tools/content/ds-projects-partia-2.json` — 3 projekty, kontrakt
   1:1 z README-cyber-projects; walidacja kontraktowa zielona (rubryki=100, liście
   dosłowne, pokrycie efektywne 23/24).
2. ✅ **B3 razem z partią** (kolejność planu: B3 dopiero PO B2, inaczej pokrycie pęka):
   `ds-projects-partia-1r.json` → `ds-chmura` `required` = CI/CD+MLOps; parytet
   w `seed-projects.ts`.
3. ✅ **Guard maszynowy:** `content-ds-projects.contract.test.ts` na glob
   `ds-projects-partia-*.json` z semantyką katalogu efektywnego (last-wins po slugu);
   seed-parytet 33 projekty (12/15/6).
4. ✅ **Review:** Ryan GO Z NOTAMI + Ethan GO Z NOTAMI (2026-07-13); wszystkie KRYT/WAŻN
   zastosowane albo odnotowane jako jawny dług — werdykty i lista w §6.
5. ✅ **Walidacja E:** ingest ×2 na bazie testowej :5433 (`--path "Data Scientist"`,
   idempotencja: 2. bieg 0 wstawionych / 3 zaktualizowane) + pełne
   `pnpm build/lint/test:run` zielone (1216 testów).
6. ✅ **Ingest prod (F) — WYKONANY 2026-07-14, polecenie Darka** ([CZERWONA LINIA]
   ADR-010, rekord wykonania §10):
   - Backup: gałąź Neona **`prod-backup-pre-ingest-partia2-20260714`**
     (`br-polished-sky-al0fstob`); dla zwolnienia limitu gałęzi usunięto przeterminowany
     backup `prod-backup-pre-0022-20260707-154154` (7 dni, nadpisany 4 nowszymi);
     backupy z 2026-07-13 zachowane zgodnie z retencją.
   - Ingest ×2 (idempotencja): 1r — „zaktualizowano 5, błędów 0" ×2; partia 2 —
     „wstawiono 3" / „zaktualizowano 3", błędów 0.
   - Weryfikacja PO: 13 projektów ds-*; role `ds-chmura` = CI/CD+MLOps,
     `ds-endpoint-azure/gcp/aws` = chmura+MLOps; 23 liście required (23/24, Snowflake
     poza); klauzula karty w 1. zdaniu description w bazie; link budżetowy w source_links
     każdego z trzech projektów; link polityki danych Groq w ds-llm.
   - Smoke `skill-bridge-ai-seven.vercel.app`: `/` 200, `/login` 200, `/projects` 307
     (redirect do logowania — trasa chroniona, poprawnie).
7. **QG-7:** pilot — rzeczywisty czas vs 10 h, odsetek studentów blokowanych przez brak
   karty (sygnał do kalibracji komunikacji), incydenty kosztowe (oczekiwane: 0).
