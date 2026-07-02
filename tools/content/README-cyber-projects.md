# Kontrakt JSON: projekty cyber (`tools/content-cyber-projects.ts`)

Ten dokument jest **kanonicznym kształtem pliku wejściowego** dla narzędzia
`tools/content-cyber-projects.ts` (zadanie E2, Leo — Tech Lead). Sophia (PO)
wypełnia ten plik treścią 10 projektów cyber w zadaniu **E3**; Leo odpowiada za
narzędzie i kontrakt.

Status: v0.1 (2026-06-28, Leo). Wzorzec wypełniony (1 szkielet): `tools/content/cyber-projects.sample.json`.

> **⚠ Aktualizacja 2026-07-01:** kontrakt JSON i zachowanie narzędzia bez zmian, ale treść
> każdej nowej partii projektów (dowolnej ścieżki) podlega **nadrzędnemu runbookowi z
> bramkami jakości QG-1…QG-7**: `docs/runbooks/projekty-sciezki-runbook.md`
> (m.in. nowe progi `theory_md`/`learning_resources` per poziom — QG-5, standard
> portfolio-grade — QG-4, sign-off eksperta domenowego dla L3 — QG-6).

---

## Po co to jest

Narzędzie wprowadza do bazy **projekty cyberbezpieczeństwa** do żywego marketplace
(matcher → brief → submit → review). W odróżnieniu od narzędzia teorii B3
(`content-b3-theory.ts`, które tylko AKTUALIZOWAŁO istniejące projekty), to
narzędzie **WSTAWIA** brakujące projekty cyber (`INSERT … ON CONFLICT(slug) DO
UPDATE` = upsert). Cyber ma dziś **0 projektów** — to narzędzie je tworzy.

Tabele dotykane (zero zmian schemy — wszystkie pola istnieją, E1 §6):

- `projects` — katalog projektu (upsert keyed-by-slug),
- `project_competencies` — pokrycie luk (replace-per-projekt: DELETE WHERE + INSERT),
- `project_learning_resources` — materiały (opcjonalne, replace-per-projekt),
- `project_source_links` — odporność linków źródła (opcjonalne, replace-per-projekt).

Projekty są identyfikowane po **`slug`** — nigdy po `id` (id jest losowe).
Narzędzie jest **idempotentne** (ponowne uruchomienie = ten sam stan, nie duplikuje)
i działa **per projekt transakcyjnie** (jeden projekt albo wchodzi w całości, albo wcale).

---

## Kształt pliku — tablica obiektów (jeden obiekt = jeden projekt)

```jsonc
[
  {
    // ── katalog (tabela projects) ──
    "slug": "cyber-siem-pierwsze-alerty-splunk", // WYMAGANE — unikalny, kebab-case, prefiks "cyber-"; KLUCZ idempotencji
    "title": "SIEM od zera: pierwsze alerty w Splunk",
    "description": "1–3 zdania: co student zbuduje i z jakich publicznych danych.",
    "level": "L1",                               // WYMAGANE — "L1" | "L2" | "L3" (NIE latwy/sredni/zaawansowany)
    "estimatedHours": 5,                         // WYMAGANE — int > 0. L1: 3–6 · L2: 8–14 · L3: 18–30
    "sourceType": "open_data",                   // WYMAGANE — "open_data" | "oss"
    "sourceUrl": "https://…",                    // WYMAGANE — główne, publiczne, darmowe źródło (http/https)

    // ── pokrycie luk (tabela project_competencies) ──
    // ⚠ KLUCZOWA BRAMKA: "name" MUSI być przepisane DOKŁADNIE jak liść ścieżki cyber
    //   w career-model.ts (patrz lista niżej). Nazwa spoza listy → narzędzie ZATRZYMA
    //   ingest (literówka = cicha utrata pokrycia matchera, ryzyko #1 z E1).
    "competencies": [
      { "name": "SIEM",   "role": "required" },  // WYMAGANE — co najmniej JEDEN required
      { "name": "SOC",    "role": "required" },
      { "name": "Splunk", "role": "required" },
      { "name": "Linux",  "role": "acquired" }   // acquired = prereq, co student powinien już mieć
    ],

    // ── rubryka oceny (projects.rubric_json) ──
    "rubricJson": [
      { "criterion": "…", "weight": 40, "description": "…" }
      // WYMAGANE — 3–5 kryteriów, suma weight = DOKŁADNIE 100
    ],

    // ── B3 — teoria + materiały (OPCJONALNE) ──
    "theory_md": null,                           // string (Markdown) lub null = stan "brak teorii"
    "learning_resources": [
      { "title": "…", "url": "https://…", "type": "docs", "position": 0 }
      // type ∈ {video, docs, course}
    ],

    // ── odporność linków źródła (OPCJONALNE; project_source_links) ──
    "source_links": [
      { "url": "https://…", "label": "Źródło główne", "position": 0 }
    ]
  }
]
```

### Mapowanie pól na kolumny bazy

| Pole JSON                       | Tabela.kolumna                          | Uwagi                                          |
|---------------------------------|-----------------------------------------|------------------------------------------------|
| `slug`                          | `projects.slug`                         | klucz upsertu (ON CONFLICT)                    |
| `title` / `description`         | `projects.title` / `.description`       | tekst niepusty                                 |
| `level`                         | `projects.level`                        | enum L1/L2/L3                                  |
| `estimatedHours`                | `projects.estimated_hours`              | int > 0                                        |
| `sourceType` / `sourceUrl`      | `projects.source_type` / `.source_url`  | open_data/oss; url http/https                  |
| `rubricJson`                    | `projects.rubric_json`                  | suma wag = 100                                 |
| `theory_md`                     | `projects.theory_md`                    | string lub null (opcjonalne)                   |
| `competencies[].name` / `.role` | `project_competencies.competency_name` / `.role` | name = liść cyber; role required/acquired |
| `learning_resources[]`          | `project_learning_resources`            | replace-per-projekt (opcjonalne)              |
| `source_links[]`                | `project_source_links`                  | replace-per-projekt (opcjonalne)              |

---

## Narzędzie jest OGÓLNE względem ścieżki (parametr `--path`)

Od fazy E–F (DS partia 1) `content-cyber-projects.ts` waliduje nazwy kompetencji
wobec liści **dowolnej** ścieżki kariery z `career-model.ts` — nie tylko cyber:

- **Domyślnie** (bez flagi) walidacja wobec ścieżki „Cybersecurity Specialist" —
  **kompatybilność wsteczna**: wszystkie dotychczasowe wywołania i testy działają bez zmian.
- **`--path "Data Scientist"`** (lub `--path=...`) przełącza walidację na liście podanej
  ścieżki. Zbiór liści czytany jest z `PATHS` w `career-model.ts` (jedno źródło prawdy);
  nieznana etykieta ścieżki → STOP z listą dozwolonych etykiet.

Nazwa pliku narzędzia pozostała `content-cyber-projects.ts` (świadoma decyzja: rename
złamałby import w teście integracyjnym, referencje w ADR-009 i CI — parametr jest
bezpieczniejszy i w pełni zgodny wstecz). Eksportowane funkcje ogólne: `getPathLeafNames(label)`;
`getCyberLeafNames()` to teraz cienki alias na ścieżkę domyślną.

```powershell
# Cyber (domyślnie, bez zmian):
pnpm exec tsx tools/content-cyber-projects.ts tools/content/cyber-projects-partia-3.json
# Data Scientist (partia 1):
pnpm exec tsx tools/content-cyber-projects.ts tools/content/ds-projects-partia-1.json --path "Data Scientist"
```

> **DS partia 1 — kontrakt i pokrycie:** `tools/content/ds-projects-partia-1.json` = 10 projektów
> (4×L1, 4×L2, 2×L3), nazwy liści dosłownie z grupy „Fundamenty" (uwaga: `Statystyka (Statistics)`
> z dopiskiem w nawiasie), pokrycie 23/24 liści jako `required` (Snowflake świadomie poza — trial-safe).
> Runbook ingestu prod: `docs/decisions/010-prod-ingest-ds-partia-1.md`.

## ⚠ Dozwolone nazwy kompetencji (liście ścieżki cyber)

Narzędzie czyta ten zbiór bezpośrednio z `src/lib/db/data/career-model.ts`
(ścieżka „Cybersecurity Specialist" — domyślna; `--path` zmienia ścieżkę) — jedno źródło prawdy. Stan 2026-06-28:

```
SIEM · SOC · Splunk · SOAR · EDR / XDR · Microsoft Defender · CrowdStrike · Incident Response
Linux · Windows · PowerShell · Bash
Python
Risk Management · NIST · GRC · ISO 27001 · RODO / GDPR · DORA
AWS · Azure · GCP
IAM · PAM · Active Directory · CyberArk
Kubernetes · CI/CD · DevSecOps
Network · TCP/IP · Firewall / IDS-IPS
OWASP · SAST · DAST · SCA
SQL
```

Pisownia musi być **dosłowna** (ze spacjami: `EDR / XDR`, `Firewall / IDS-IPS`,
`RODO / GDPR`, `ISO 27001`, `Active Directory`, `Risk Management`, `Incident Response`).
Nazwa spoza zbioru → narzędzie **zatrzymuje ingest** (ERROR). Świadome dopuszczenie
nowej nazwy: uruchom z flagą `--warn-unknown-competencies` (degraduje do WARN).

---

## Reguły zachowania narzędzia

1. **Upsert keyed-by-slug.** Slug nowy → INSERT; slug istniejący → UPDATE pól katalogu.
2. **Kompetencje replace-per-projekt.** DELETE FROM project_competencies WHERE project_id = …
   (zawsze z WHERE) + INSERT nowych. Idempotentne, nie duplikuje.
3. **Materiały / linki replace-per-projekt** — tylko gdy klucz `learning_resources` /
   `source_links` jest obecny. Pominięcie klucza = nie ruszamy istniejących.
4. **Transakcja per projekt.** Błąd jednego projektu = rollback tylko jego.
5. **Walidacja PRZED bazą (fail-fast).** Cały plik sprawdzany zanim cokolwiek zapiszemy.

---

## Jak uruchomić (tylko BAZA TESTOWA)

```powershell
# 1. Skonfiguruj .env.test (host MUSI być localhost/127.0.0.1 — guard assert-test-db)
# 2. Zmigruj schemat na bazę testową
pnpm db:migrate:test
# 3. Wprowadź projekty (ścieżka do pliku JSON jako argument)
pnpm exec tsx tools/content-cyber-projects.ts tools/content/cyber-projects.sample.json
```

Guard bezpieczeństwa: host zdalny bez `CONFIRM_PROD_DB=1` → ABORT; fragment
`skill-bridge-ai` (baza prod) → ABORT bezwarunkowo. Ingest prod wykonuje **Ethan (CTO)**
pod bramkami v1.12 (kopia zapasowa NEON, transakcyjny SQL, autor commita = Darek,
audit log) — nie to narzędzie samodzielnie.
