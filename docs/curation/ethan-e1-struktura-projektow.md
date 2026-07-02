# E1 — Struktura projektów per ścieżka (analiza + design)

**Autor:** Ethan (CTO, Engineering) · **Data:** 2026-06-28 · **Wersja:** v0.1 (design, nie implementacja)
**Repo:** `nordsignal-skillbridge`, gałąź `feat/etl-lift` @ `8e0e9fc`
**Wejście dla:** E2 (Leo — narzędzie ingestu) i E3 (Sophia — autoring treści)
**Status:** dokument projektowy. Zero kodu produkcyjnego, zero migracji, zero commitów.

> **⚠ Aktualizacja 2026-07-01:** proces opisany tutaj (fazy, kontrakt, 7 reguł autora) pozostaje w mocy, ale został podporządkowany **kanonicznemu runbookowi z bramkami jakości merytorycznej QG-1…QG-7**: `docs/runbooks/projekty-sciezki-runbook.md`. Każda nowa partia projektów (dowolnej ścieżki) MUSI przejść bramki QG przed autoringiem i przed ingestem prod. Geneza bramek: `docs/curation/weryfikacja-ds-plan-projektow.md`.

---

## 0. TL;DR (jedna minuta)

- **System projektów już istnieje i działa** — tabele `projects` + `project_competencies`, matcher (dopasowywarka) `match-projects.ts`, strona studenta `/projects?gapId=…`, ścieżka brief→submit→review. **Brakuje wyłącznie treści cyber** (zero projektów cyberbezpieczeństwa w katalogu).
- **Matcher jest niezależny od ścieżki** (path-agnostic): bierze WSZYSTKIE aktywne projekty i ocenia je po nazwie kompetencji-luki. Nie trzeba go zmieniać — wystarczy dodać projekty cyber z poprawnymi nazwami kompetencji.
- **Migracja NIE jest potrzebna.** Enumy `project_level` (L1–L5), `project_source_type` (`open_data`/`oss`/…), `project_competency_role` pokrywają cyber w całości. Reużywamy schemę 1:1. (To znaczy: **zostajemy poza bramką nieodwracalną v1.12 dla schemy** — żaden `ALTER TYPE`.)
- **Design: 10 projektów cyber** (4×L1, 4×L2, 2×L3) pokrywających **10/10 grup kompetencji** i **33/37 liści** (4 niszowe liście 2% świadomie niepokryte).
- **E2 (Leo):** jedno idempotentne narzędzie `tools/content-cyber-projects.ts` — keyed-by-slug, upsert katalogu + replace-per-projekt kompetencji/teorii, transakcyjne, guard prod — wzorem `content-b3-theory.ts`.
- **E3 (Sophia):** napisać 10 projektów wg kontraktu z §3, na liście luk z §2, 7 regułami autora z §5.

---

## 1. Co już jest w systemie (zweryfikowane na kodzie)

### 1.1 Schema — tabele projektów (`src/lib/db/schema.ts`)

Marketplace projektów stoi na istniejących tabelach (zweryfikowane linie):

- **`projects`** (l. 276–300) — katalog projektów (globalny, klasa K-PUB = bez RLS tenant-owej; te same prawa co dla treści publicznej). Pola:
  - `id` (uuid), `slug` (unikalny, klucz idempotencji), `title`, `description`,
  - `level` — enum `project_level` = `["L1","L2","L3","L4","L5"]` (l. 95). **Używamy L1–L3.**
  - `estimatedHours` (int), `sourceType` — enum `project_source_type` = `["open_data","oss","partner","ngo","faculty"]` (l. 97), `sourceUrl` (text, nullable),
  - `briefTemplate` (text), `theoryMd` (text, NULL = brak teorii → stan frontu `empty_theory`; z migracji 0016 B3),
  - `rubricJson` (jsonb, lista kryteriów oceny), `status` (default `active`), `createdAt`/`updatedAt`.
- **`project_competencies`** (l. 383–394) — wiązanie projekt↔kompetencja:
  - `projectId` (FK → projects, ON DELETE CASCADE), `competencyName` (**text — wolny string, nie FK**), `role` — enum `["required","acquired"]` (`required` = czego projekt uczy / co domyka; `acquired` = prereq, co student powinien już mieć).
  - **To jest mechanizm pokrycia luki:** projekt „pokrywa" lukę przez wiersz `project_competencies` z `competencyName` równym (lub zawierającym) nazwę luki.
- **`project_learning_resources`** (l. 317–339, migracja 0016 B3) — materiały do nauki w projekcie: `title`, `url`, `type` ∈ `{video,docs,course}` (CHECK), `position`. Replace-per-projekt.
- **`project_source_links`** (l. 363–381, migracja 0018) — odporność linków źródła (2–3 linki zamiast 1, znacznik `isDead`). `source_url` zostaje (degradacja wsteczna).
- **`project_submissions`** (l. 396+) — zgłoszenia studenta (repoUrl, notebookUrl, aiReviewJson, score, status). Tenant-owa (RLS).

**Wniosek:** model danych projektu jest kompletny. Nic nie trzeba dodawać do schemy dla cyber.

### 1.2 Matcher — `src/lib/ai/match-projects.ts` (jak projekt trafia do studenta)

Przepływ (zweryfikowany):

1. Wejście: `studentId`, `gapId` (konkretna luka), `limit`.
2. Pobiera lukę (`gaps.competencyName`) + kompetencje studenta (status `acquired`/`in_progress`).
3. **Pobiera WSZYSTKIE aktywne projekty** (`projects.status = 'active'`) z ich `project_competencies` — **bez filtra po ścieżce/`careerGoal`** (l. 35–38).
4. Skoring heurystyczny (l. 44–64):
   - **`gapMatch` = 40 pkt** jeśli którakolwiek kompetencja projektu zawiera nazwę luki (lub odwrotnie — substring fuzzy: `name.includes(gapName) || gapName.includes(name)`).
   - **`overlapScore` = 0–30 pkt** wg pokrycia prereqów (`required`) przez kompetencje już zdobyte przez studenta.
5. Top-20 wg heurystyki → **AI re-ranking** (model `fast`) ocenia trafność względem `careerGoal` studenta i zwraca top-`limit` z uzasadnieniem PL (l. 77–116). Fallback do heurystyki, gdy JSON się nie sparsuje.

**Dwa kluczowe wnioski dla designu:**

- **(A) Matcher jest niezależny od ścieżki.** Nie ma pojęcia „projekt cyber". Dopasowuje po **nazwie kompetencji-luki**. Żeby student z luką „SIEM" dostał projekt domykający SIEM, projekt musi mieć wiersz `project_competencies` z `competencyName` = `"SIEM"` (lub zawierającym „SIEM"). **Matchera NIE ruszamy** — to czysto kwestia treści.
- **(B) Nazwa kompetencji w projekcie musi pasować do nazwy luki.** Luki (`gaps.competencyName`) powstają z danych rynkowych `job_market_data` (patrz §2) — czyli z **liści** ścieżki cyber (np. `"SIEM"`, `"Splunk"`, `"Risk Management"`, `"EDR / XDR"`). **Twarda reguła autorska:** nazwy w `project_competencies` muszą być przepisane **dokładnie** jak liście w `career-model.ts` / `job-market-justjoinit.json` (łącznie z formatowaniem `"EDR / XDR"`, `"Firewall / IDS-IPS"`, `"RODO / GDPR"`, `"Active Directory"`, `"ISO 27001"`, `"Risk Management"`, `"Incident Response"`) — inaczej dopasowanie słabnie.

### 1.3 Jak student widzi projekty

- Karta luki `src/components/gap-analysis/gap-card.tsx` (l. 195): link `/projects?gapId=${id}`.
- Strona projektów → `GET /api/projects/recommend` (l. 42) → `matchProjects(studentId, gapId, 5)`.
- `GET /api/projects` filtruje katalog po `level`/`sourceType`/`maxHours`. `GET /api/projects/[id]` zwraca projekt z materiałami i linkami źródła. `POST /api/projects/[id]/brief` generuje brief AI. `POST /api/projects/[id]/submit` przyjmuje zgłoszenie. `/api/reflections` — „Moja droga" (refleksje studenta po projekcie).

**Wniosek:** cała ścieżka UX student→luka→projekt→brief→submit→review **już działa** dla istniejących ścieżek (Data Analyst, Frontend, Backend, Data Scientist). Cyber po prostu nie ma czego pokazać.

### 1.4 Jak projekt dziś trafia do bazy (i dlaczego to ważne dla E2)

Są **dwa rozłączne „banki projektów"** — łatwo pomylić:

| | `DEMO_PROJECTS` (`seed-projects.ts`) | `PROJECT_BANK` (`career-model.ts`) |
|---|---|---|
| Zasila | **tabelę `projects`** (przez `seed.ts`, l. 204–236) — **żywy marketplace** (matcher, brief, submit, review) | artefakt `career-model.json` (przez `etl-justjoinit.ts` l. 814) — **wyłącznie wyświetlanie** projektów per ścieżka w modelu kariery |
| Kształt | `DemoProject` (slug/title/desc/level L1–L3/hours/sourceType/sourceUrl/rubric/competencies) | `ProjectSpec` (level `latwy`/`sredni`/`zaawansowany`/title/anchorLeaves/desc/portfolioOutcome/marketRationale/todo) |
| Cyber dziś | **0 projektów** (są tylko: Data Analyst, Frontend, Backend, Data Scientist) | **stub** `todoProject(...)` z l. 2798–2800 — „(do dopisania)", `todo:true` |

> **`PROJECT_BANK["Cybersecurity Specialist"]` = `[todoProject("…","SIEM, Splunk, IAM, PAM, NIST, Linux")]`** — czyli pojedyncza zaślepka, nie projekty.

**Krytyczne ograniczenie wykonawcze (v1.12):** seedowanie katalogu idzie dziś przez `seed.ts`, który robi `DELETE FROM project_competencies; DELETE FROM projects;` (l. 204–205) i wstawia od nowa — **niszczący `db:seed`**. **Na produkcji to zakazane** (bramka v1.12: „**nigdy** niszczący `db:seed` na prod", tylko transakcyjny `DELETE WHERE`+`INSERT`). Dlatego E2 **nie może** używać `db:seed` do wprowadzenia cyber na prod — musi być narzędzie idempotentne keyed-by-slug (jak `content-b3-theory.ts`). Patrz §4.

### 1.5 Wzorzec narzędzia idempotentnego — `tools/content-b3-theory.ts`

Wzorzec do skopiowania dla E2 (zweryfikowany):

- Czyta **plik JSON** (ścieżka jako argument CLI) — kanoniczny kontrakt.
- **Guard prod** (`assert-test-db.ts`): host zdalny bez `CONFIRM_PROD_DB=1` → ABORT; fragment `skill-bridge-ai` (baza prod) → ABORT bezwarunkowo. Connection string nigdy nie drukowany.
- **Walidacja całego pliku PRZED dotknięciem bazy** (fail-fast): slug w katalogu, url http/https, type w dozwolonym zbiorze.
- **Transakcja per projekt** (keyed-by-slug): UPDATE `theory_md` + **replace-per-projekt** materiałów (DELETE wszystkich tego projektu + INSERT nowych). Albo całość, albo nic (rollback) — błąd jednego projektu nie psuje pozostałych.
- Slug spoza katalogu → `SKIP` + warn (nie błąd).

Jedyna różnica dla E2: B3 tylko **aktualizował** istniejące projekty (katalog był już zaseedowany). Cyber wymaga też **wstawienia** wierszy katalogu — czyli `upsert` po slugu zamiast `update`. Reszta wzorca 1:1.

---

## 2. Model pokrycia luk — mapa cyber (10 grup, 37 liści)

### 2.1 Skąd biorą się luki cyber

Luki (`gaps`) generuje `generate-gaps.ts`: porównuje kompetencje studenta z `job_market_data` dla `careerGoal = "Cybersecurity Specialist"`. Dane rynkowe cyber to **37 liści** (z `job-market-justjoinit.json`), pogrupowane w **10 grup** (`career-model.ts`, l. 483–612). Demand % = surowy udział ofert (371 ofert kategorii Security, JustJoinIT 2026-02).

### 2.2 Liście cyber wg popytu i grupy

| % | Liść | Grupa |
|---|---|---|
| 15 | Python | Programowanie i automatyzacja |
| 11 | SIEM | SIEM i Monitorowanie Zdarzeń |
| 9 | AWS | Cloud Security |
| 9 | Linux | Administracja systemami i skrypty |
| 8 | Azure | Cloud Security |
| 8 | IAM | Tożsamość i zarządzanie dostępem (IAM) |
| 6 | CI/CD | DevSecOps i konteneryzacja |
| 6 | Kubernetes | DevSecOps i konteneryzacja |
| 5 | GCP | Cloud Security |
| 5 | Risk Management | Audyt, ryzyko i zgodność (GRC) |
| 5 | SOC | SIEM i Monitorowanie Zdarzeń |
| 4 | Active Directory | IAM |
| 4 | Network | Infrastruktura i sieci |
| 4 | Splunk | SIEM |
| 4 | SQL | Bazy danych (SQL) |
| 4 | Windows | Administracja |
| 3 | Bash | Administracja |
| 3 | DevSecOps | DevSecOps |
| 3 | EDR / XDR | SIEM |
| 3 | ISO 27001 | GRC |
| 3 | NIST | GRC |
| 3 | OWASP | AppSec |
| 3 | PAM | IAM |
| 3 | PowerShell | Administracja |
| 3 | TCP/IP | Infrastruktura i sieci |
| 2 | CrowdStrike | SIEM |
| 2 | CyberArk | IAM |
| 2 | DORA | GRC |
| 2 | Firewall / IDS-IPS | Infrastruktura i sieci |
| 2 | Microsoft Defender | SIEM |
| 2 | RODO / GDPR | GRC |
| 2 | SAST | AppSec |
| 2 | SOAR | SIEM |
| 1 | DAST | AppSec |
| 1 | GRC | GRC |
| 1 | Incident Response | SIEM |
| 1 | SCA | AppSec |

### 2.3 Poziomy L1–L3 — definicja produktowa

Zgodnie z istniejącą drabiną (`ProjectSpec` l. 94–98: junior→senior) i poziomami DEMO_PROJECTS:

- **L1 — podstawy / junior bez doświadczenia** (3–6 h). Jedno narzędzie/koncept grupy, prowadzony warsztat, „pierwsze uruchomienie". Brama wejścia.
- **L2 — zastosowanie / mid** (8–14 h). Integracja 2–4 kompetencji grupy w realistyczny scenariusz, własne decyzje konfiguracyjne.
- **L3 — projekt złożony / mid-senior** (18–30 h). End-to-end, łączy kompetencje z kilku grup, artefakt portfolio pokazywalny pracodawcy.

### 2.4 Mapa pokrycia — 10 projektów → grupy/liście

Legenda: **R** = `required` (projekt domyka tę lukę), **a** = `acquired` (prereq, kontekst).

| # | slug | L | Grupa wiodąca | Liście **R** (domyka) | Liście *a* (prereq) |
|---|---|---|---|---|---|
| P1 | `cyber-siem-pierwsze-alerty-splunk` | L1 | SIEM | **SIEM, SOC, Splunk** | Incident Response, Linux |
| P2 | `cyber-hardening-linux-bash` | L1 | Administracja | **Linux, Bash** | Windows, PowerShell |
| P3 | `cyber-python-automatyzacja-logow` | L1 | Programowanie | **Python** | Linux, SQL |
| P4 | `cyber-iam-active-directory-lab` | L1 | IAM | **IAM, Active Directory** | PAM, Windows |
| P5 | `cyber-grc-ryzyko-iso27001` | L2 | GRC | **Risk Management, ISO 27001, NIST** | RODO / GDPR, GRC |
| P6 | `cyber-cloud-security-aws-azure` | L2 | Cloud Security | **AWS, Azure, GCP** | IAM, Network |
| P7 | `cyber-appsec-owasp-sast` | L2 | AppSec | **OWASP, SAST, DAST, SCA** | SQL |
| P8 | `cyber-siec-tcpip-firewall` | L2 | Infrastruktura i sieci | **Network, TCP/IP, Firewall / IDS-IPS** | Linux |
| P9 | `cyber-devsecops-pipeline-k8s` | L3 | DevSecOps | **DevSecOps, CI/CD, Kubernetes** | SAST, Python |
| P10 | `cyber-soc-detekcja-end-to-end` | L3 | SIEM (capstone) | **SIEM, SOC, Incident Response, EDR / XDR, SOAR** | Python, Splunk |

### 2.5 Jawne pokrycie — co domknięte, co zostaje luką

**Pokryte: 10/10 grup ma co najmniej jeden projekt. 33/37 liści** pojawia się jako `required` w co najmniej jednym projekcie (a większość high-demand wielokrotnie):

- SIEM ✓ SOC ✓ Splunk ✓ EDR/XDR ✓ SOAR ✓ Incident Response ✓ · Linux ✓ Windows(a) Bash ✓ PowerShell(a) · Python ✓ · Risk Mgmt ✓ ISO 27001 ✓ NIST ✓ RODO ✓(a) GRC ✓(a) · AWS ✓ Azure ✓ GCP ✓ · IAM ✓ Active Directory ✓ PAM ✓(a) · CI/CD ✓ Kubernetes ✓ DevSecOps ✓ · Network ✓ TCP/IP ✓ Firewall/IDS-IPS ✓ · OWASP ✓ SAST ✓ DAST ✓ SCA ✓ · SQL ✓

**Świadomie niepokryte (4 liście, każdy 2% lub mniej, niszowe vendor/regulacja):**

| Liść | % | Dlaczego nie | Czym zastąpione |
|---|---|---|---|
| Microsoft Defender | 2 | Konkretny produkt SIEM jednego vendora | Grupa SIEM pokryta przez Splunk/EDR-XDR (P1, P10) |
| CrowdStrike | 2 | jw. (vendor) | jw. |
| CyberArk | 2 | Konkretny produkt PAM jednego vendora | Grupa IAM pokryta (P4: IAM, AD, PAM) |
| DORA | 2 | Wąska regulacja sektora finansowego | Grupa GRC pokryta (P5: Risk, ISO, NIST, RODO) |

Uzasadnienie: projekt nie powinien wymuszać licencji konkretnego komercyjnego produktu (CyberArk, CrowdStrike, Defender) — łamie regułę „publiczne/darmowe/wiarygodne źródła" (§5). Student z luką w tych 4 liściach (rzadkie — 2%) i tak dostaje sąsiedni projekt tej samej grupy (matcher dopasuje po grupie/koncepcie), który daje przenośną wiedzę. **To jawna, udokumentowana decyzja — nie przeoczenie.**

---

## 3. Kontrakt danych projektu cyber (gotowy do wypełnienia przez Sophię)

Kształt **jednego** projektu = istniejący typ `DemoProject` (`seed-projects.ts` l. 1–11) **+** opcjonalna warstwa B3 (teoria/materiały). Sophia wypełnia ten JSON (jeden obiekt = jeden projekt); E2 go waliduje i wprowadza.

```jsonc
{
  // ── katalog (tabela projects) ──
  "slug": "cyber-siem-pierwsze-alerty-splunk",   // unikalny, kebab-case, prefiks "cyber-"; KLUCZ idempotencji
  "title": "SIEM od zera: pierwsze alerty w Splunk",
  "description": "1–3 zdania: co student zbuduje i z jakich publicznych danych.",
  "level": "L1",                                  // "L1" | "L2" | "L3" (enum project_level — NIE latwy/sredni)
  "estimatedHours": 5,                            // L1: 3–6 · L2: 8–14 · L3: 18–30
  "sourceType": "open_data",                      // "open_data" (publiczne dane/laby/docs) | "oss" (narzędzia open-source)
  "sourceUrl": "https://…",                       // główne, publiczne, darmowe źródło danych/laba

  // ── pokrycie luk (tabela project_competencies) ──
  // UWAGA: name MUSI być przepisane DOKŁADNIE jak liść w career-model.ts / job-market (§1.2 B)
  "competencies": [
    { "name": "SIEM",   "role": "required" },     // czego projekt uczy / co domyka
    { "name": "SOC",    "role": "required" },
    { "name": "Splunk", "role": "required" },
    { "name": "Linux",  "role": "acquired" }      // prereq — co student powinien już mieć
  ],

  // ── rubryka oceny (projects.rubric_json) ──
  "rubricJson": [
    { "criterion": "…", "weight": 30, "description": "…" }
    // 3–5 kryteriów, suma weight = 100
  ],

  // ── B3 — teoria + materiały (opcjonalne; projects.theory_md + project_learning_resources) ──
  "theory_md": "Markdown teorii wprowadzającej (lub null = stan empty_theory).",
  "learning_resources": [
    { "title": "…", "url": "https://…", "type": "docs", "position": 0 }
    // type ∈ {video, docs, course}
  ],

  // ── odporność linków (opcjonalne; project_source_links) ──
  "source_links": [
    { "url": "https://…", "label": "Źródło główne", "position": 0 },
    { "url": "https://…", "label": "Kopia zapasowa", "position": 1 }
  ]
}
```

Kontrakt wejścia narzędzia E2 = **tablica** takich obiektów (jak `b3-theory.sample.json`).

---

## 4. Specyfikacja E2 — narzędzie ingestu (dla Leo)

**Plik:** `tools/content-cyber-projects.ts` (nowy; wzorzec 1:1 z `content-b3-theory.ts`).
**Kontrakt wejścia:** `tools/content/cyber-projects.json` (tablica obiektów z §3), opisany w `tools/content/README-cyber-projects.md` + `cyber-projects.sample.json`.

**Co robi (różnica vs B3: upsert katalogu + kompetencje, nie tylko theory):**

1. **CLI + guard prod** — ścieżka JSON jako argument; ładuje `.env.test` (nie nadpisuje ustawionych env, nie czyta `.env.local`); `assertTestDb(DATABASE_URL)` — host zdalny bez `CONFIRM_PROD_DB=1` → ABORT, `skill-bridge-ai` → ABORT. Connection string nigdy nie drukowany.
2. **Walidacja całego pliku PRZED bazą** (fail-fast):
   - `slug` niepusty, kebab-case; `level` ∈ `{L1,L2,L3}`; `sourceType` ∈ `{open_data,oss}`; `estimatedHours` int > 0;
   - `competencies[]`: `name` niepusty, `role` ∈ `{required,acquired}`; **co najmniej jeden `required`**;
   - **(zalecane) nazwy kompetencji walidowane względem zbioru liści ścieżki cyber** z `career-model.ts` — nazwa spoza zbioru → WARN (literówka = cicha utrata pokrycia, §1.2 B);
   - `rubricJson[]`: suma `weight` = 100; `url`/`source_links`/`learning_resources` jak w B3 (http/https, `type` ∈ {video,docs,course}).
3. **Transakcja per projekt (keyed-by-slug, idempotentnie):**
   - **UPSERT katalogu:** `INSERT INTO projects (...) ON CONFLICT (slug) DO UPDATE SET title, description, level, estimated_hours, source_type, source_url, theory_md, rubric_json, updated_at` — wstawia nowy albo aktualizuje istniejący po slugu. (`slug` ma `unique` — l. 280.)
   - **Replace-per-projekt kompetencji:** `DELETE FROM project_competencies WHERE project_id = … ; INSERT …` nowych.
   - **Replace-per-projekt materiałów/linków** (jeśli podane) — jak B3.
   - Całość w jednej transakcji per projekt → atomowo i idempotentnie; błąd jednego projektu = rollback tylko jego.
4. **Brak destrukcji globalnej** — narzędzie **nigdy** nie robi `DELETE FROM projects` bez `WHERE` (≠ `db:seed`). Dotyka wyłącznie slugów z pliku → spełnia bramkę v1.12 (transakcyjny `DELETE WHERE`+`INSERT`).
5. **Raport końcowy:** wstawione / zaktualizowane / pominięte / kompetencji wprowadzonych. Exit code ≠ 0 przy błędzie walidacji lub rollbacku.

**Parytet test-seed (zalecenie):** te same projekty cyber dopisać do `DEMO_PROJECTS` (`seed-projects.ts`), żeby `pnpm db:seed` na bazie **testowej** dawał cyber lokalnie i w testach integracyjnych. JSON pozostaje kanonicznym źródłem dla ingestu prod. (Edycja `seed-projects.ts` to zwykły kod w PR — bramka Leo, nie czerwona linia.)

**Bramki procesu (jak B3, v1.12):** Sophia treść → Ryan RODO/źródła → Ethan tech → test integracyjny na bazie testowej → **ingest prod wykonuje Ethan** pod bramkami v1.12 (kopia zapasowa Neon przed zmianą danych, transakcyjny SQL, autor commita = Darek, audit log).

---

## 5. Backlog E3 — autoring dla Sophii

**Zakres:** **10 projektów cyber** (4×L1, 4×L2, 2×L3) wg mapy §2.4. Dla każdego: `title`, `description`, `rubricJson` (3–5 kryteriów = 100), `competencies` (nazwy DOKŁADNIE jak liście), publiczny `sourceUrl`, opcjonalnie `theory_md` + `learning_resources` + `source_links`.

**Priorytet (popyt):** najpierw P1 (SIEM 11%), P3 (Python 15%), P2 (Linux 9%) — brama wejścia i najwyższy popyt. Potem P4–P8 (L1/L2), na końcu P9–P10 (L3 capstone).

**Cel pokrycia:** każdy `required` z §2.4 musi wystąpić → student z luką w dowolnym z 33 liści dostaje projekt. 4 liście z §2.5 świadomie pomijamy.

**7 reguł autora (jak przy B3):**
1. **Parafraza, nie kopia** — własny opis i rubryka, nie przeklejka z dokumentacji vendora.
2. **Publiczne / darmowe / wiarygodne źródła** — TryHackMe (darmowe pokoje), OWASP Juice Shop, Wazuh/Suricata (open-source), Splunk Free, MITRE ATT&CK, publiczne datasety logów, dokumentacja AWS/Azure/GCP free tier. **Zero produktów wymagających płatnej licencji** (CyberArk, CrowdStrike, komercyjny Splunk ES) jako twardego wymogu.
3. **Atrybucja** — `sourceUrl` + `learning_resources` z linkiem do oryginału.
4. **Przegląd** — Ryan (RODO + legalność źródeł), potem Ethan (tech/wykonalność na bazie testowej).
5. **Znacznik daty** — data autoringu i snapshot rynku (JustJoinIT 2026-02) w nagłówku treści.
6. **Zero Granoli** — nie wpisujemy notatek wewnętrznych/transkryptów; tylko publiczna wiedza.
7. **Pod realny stack** — narzędzia faktycznie spotykane w polskich ofertach cyber (SIEM/SOC/GRC/IAM/Cloud), nie egzotyka pentestowa (Burp/Metasploit świadomie wyłączone z modelu — l. 481).

---

## 6. Reużycie vs nowe — i czy potrzebna migracja

| Element | Decyzja |
|---|---|
| Tabela `projects` | **Reużycie 1:1.** Enum `project_level` ma L1–L3. |
| Tabela `project_competencies` | **Reużycie 1:1.** Mechanizm pokrycia luki gotowy. |
| `project_learning_resources`, `project_source_links` | **Reużycie** (opcjonalne, z B3/0018). |
| Enum `project_source_type` | **Reużycie** — `open_data`/`oss` pokrywa cyber. |
| Matcher `match-projects.ts` | **Bez zmian.** Path-agnostic, dopasowuje po nazwie kompetencji. |
| `seed-projects.ts` (`DEMO_PROJECTS`) | **Dodać 10 cyber** (parytet test-seed). Zwykły PR (bramka Leo). |
| `PROJECT_BANK` (`career-model.ts`) | **Opcjonalnie** zaktualizować stub cyber (l. 2798) na realne `ProjectSpec` — **tylko wyświetlanie w modelu kariery, NIE marketplace**. Niski priorytet; osobne od ścieżki krytycznej. |
| Narzędzie ingestu | **NOWE** `tools/content-cyber-projects.ts` (§4). |

### Czy potrzebna migracja schemy? → **NIE.**

Żadnej zmiany schemy ani `ALTER TYPE`. Wszystkie pola, enumy i tabele istnieją. **Nie dotykamy bramki nieodwracalnej v1.12 dla migracji schemy prod.** Jedyny dotyk produkcyjnej bazy NEON = **wprowadzenie danych** (wierszy projektów cyber) idempotentnym narzędziem — to mieści się w v1.12 (zaciąg danych przez Ethana, kopia zapasowa + transakcyjny SQL + audit log), bez `ALTER`/`DROP`/niszczącego seeda.

---

## 7. Ryzyka i otwarte pytania

1. **Dryf nazw kompetencji (najwyższe ryzyko jakości).** Pokrycie luki zależy od dosłownej zgodności `competencyName` ↔ liść (§1.2 B). Literówka („SIEM " ze spacją, „ISO27001" bez spacji) = cicha utrata pokrycia. **Mitygacja:** walidator nazw w E2 (WARN dla nazwy spoza zbioru liści cyber), zbiór liści importowany z `career-model.ts`.
2. **Matcher zwraca projekty spoza ścieżki.** Bo jest path-agnostic — student cyber z luką „Python"/„SQL"/„Linux" może dostać projekt Data/Backend (też wymagają Pythona). AI re-ranking po `careerGoal` to łagodzi, ale nie eliminuje. **Pytanie do Sophii/Olivera:** czy chcemy filtr ścieżki w matcherze (zmiana odwracalna, osobny ticket), czy ufamy re-rankingowi? **Rekomendacja:** na E zostawić jak jest (re-ranking wystarcza dla MVP), rozważyć później.
3. **4 niepokryte liście (§2.5).** Świadoma decyzja — wymaga akceptacji Sophii (treść) i potwierdzenia, że 2%-luki nie blokują żadnej persony. Jeśli pojawi się klient z wymogiem CyberArk/DORA — dopisać projekt partnerski (`sourceType: partner`).
4. **`PROJECT_BANK` vs marketplace — rozbieżność.** Po E model kariery (career-model.json) nadal pokaże cyber jako „(do dopisania)", choć marketplace będzie miał 10 projektów. Niespójność kosmetyczna. **Decyzja:** zaktualizować stub `PROJECT_BANK` w tej samej partii czy osobno? Rekomendacja: osobny, niski priorytet.
5. **Wykonalność projektów na środowisku studenta.** Część cyber wymaga laba (maszyny wirtualne, chmura). Ryan/Sophia: czy trzymamy się darmowych labów w przeglądarce (TryHackMe, Juice Shop, Splunk Free), żeby student bez mocnego sprzętu dał radę. **Reguła autora #2 i #7 to adresują**, ale wymaga kontroli per projekt.
6. **Rubryka a auto-review.** `rubric_json` zasila AI-review zgłoszeń (`review-submission.ts`). Kryteria muszą być sprawdzalne z artefaktu (repo/notebook/raport), nie z żywego laba, którego reviewer nie zobaczy. Sophia: projektować „portfolioOutcome" jako plik/repo/raport, nie „uruchom alert w labie".

---

## 8. Następne kroki (po akceptacji E1)

1. **E2 (Leo):** zbudować `tools/content-cyber-projects.ts` + `README-cyber-projects.md` + `cyber-projects.sample.json` wg §4. Bramka Leo review.
2. **E3 (Sophia):** napisać 10 projektów wg §2.4/§3/§5 do `tools/content/cyber-projects.json`. Bramka: Sophia treść → Ryan RODO → Ethan tech.
3. **Test integracyjny:** seed bazy testowej + ingest + sprawdzić, że matcher zwraca projekty dla syntetycznego studenta cyber z lukami SIEM/Python/Linux.
4. **Ingest prod (Ethan, v1.12):** kopia zapasowa NEON → uruchomienie narzędzia transakcyjnie → audit log.
```
