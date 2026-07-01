# Runbook: Ingest prod — projekty cyber, partia 3 (v1.12)

> **Status:** PRZYGOTOWANY (CTO sign-off Ethan, 2026-07-01). Ingest do bazy **testowej** zielony (29 wstawionych, 0 błędów). **Wykonanie na prod = czerwona linia — wymaga jawnej, świadomej decyzji Darka.** Ten dokument tylko PRZYGOTOWUJE — realny zapis odpala człowiek.
> **Autor commita treści/artefaktu przy scaleniu = Darek** (`mubueu@gmail.com`).
> **Cel prod:** Neon, projekt `long-pond-11214233`, branch `main` (`br-proud-sun-al3aezrj`), baza `neondb`, rola `neondb_owner`.

---

## 1. Kontekst

Ścieżka **Cybersecurity Specialist** ma dziś **0 projektów** w marketplace prod. Ten runbook wprowadza **29 projektów cyber (partia 3)** z artefaktu:

- **Artefakt:** `tools/content/cyber-projects-partia-3.json` — 29 projektów (**L1: 5 · L2: 12 · L3: 12**), zsyntetyzowanych z 9 dossierów `tools/content/research/_projekty-partia-3-*.md`.
- **Narzędzie:** `tools/content-cyber-projects.ts` — idempotentny upsert keyed-by-slug, transakcja per projekt, walidacja fail-fast przed bazą.
- **Guard:** `tools/assert-test-db.ts` — allowlista hostów lokalnych; host zdalny bez `CONFIRM_PROD_DB=1` → ABORT; fragment `skill-bridge-ai` → ABORT bezwarunkowo.
- **Kontrakt:** `tools/content/README-cyber-projects.md`.

**Zakres zmian danych (bez zmian schemy — E1 §6, zero `ALTER`/`DROP`/`ALTER TYPE`):**

| Tabela | Operacja | Bramka v1.12 |
|---|---|---|
| `projects` | upsert keyed-by-slug (`INSERT … ON CONFLICT(slug) DO UPDATE`) | transakcyjny, nie-niszczący |
| `project_competencies` | replace-per-projekt (`DELETE … WHERE project_id = …` + `INSERT`) | zawsze z `WHERE` |
| `project_learning_resources` | replace-per-projekt (gdy klucz obecny) | zawsze z `WHERE` |
| `project_source_links` | replace-per-projekt (gdy klucz obecny) | zawsze z `WHERE` |

Narzędzie **nigdy** nie robi `DELETE FROM projects` bez `WHERE`, **nigdy** nie odpala niszczącego `db:seed`. Dotyka wyłącznie 29 slugów `cyber-*` z pliku — istniejące projekty innych ścieżek pozostają nietknięte.

## 2. Stan zweryfikowany przed prod (baza testowa, 2026-07-01)

- Walidacja deterministyczna **PRZESZŁA:** wszystkie nazwy kompetencji ∈ liście ścieżki cyber w `src/lib/db/data/career-model.ts`; każda `rubricJson` sumuje wagi do **dokładnie 100** (0 wadliwych rubryk); slugi unikalne, wzorzec `^cyber-[a-z0-9-]+$`; każdy `theory_md` zawiera klauzulę art. 267 KK; 0 encji HTML.
- Ingest do bazy testowej (`localhost:5433`, `docker-compose.test.yml`, `.env.test`): **29 wstawionych, 0 błędów** → 113 kompetencji, 111 materiałów, 69 linków. Zweryfikowane w bazie (rubryki = 100, poziomy się zgadzają).

## 3. Bramki v1.12 (źródła w repo)

Formalna definicja bramek jest **rozproszona** (nie ma jednego pliku „konstytucja v1.12"), ale spójna. Źródła dosłowne:

- `docs/curation/ethan-e1-struktura-projektow.md` §4 (l. 254, 259, 317): *„ingest prod wykonuje Ethan pod bramkami v1.12 (kopia zapasowa Neon przed zmianą danych, transakcyjny SQL, autor commita = Darek, audit log)"*; *„transakcyjny `DELETE WHERE`+`INSERT`, nigdy niszczący `db:seed` na prod"*.
- `docs/design/skillbridge-projekty-l4-l5-struktura-v0.1.md` l. 220: bramki delegacji Ethana — **Leo review przed scaleniem · kopia zapasowa Neon przed zmianą · transakcyjny SQL · NIGDY niszczący `db:seed` · autor commitu = Darek · każda akcja w audit logu**.
- `tools/content/README-cyber-projects.md` l. 143–146 i `tools/content-cyber-projects.ts` l. 28–32: guard + delegacja CTO.

**Bramki obowiązujące dla tej operacji (checklist w §8):**

1. **Kopia zapasowa NEON** przed zmianą danych (zero-copy branch + opcjonalny `pg_dump`).
2. **Transakcyjny SQL** — narzędzie robi `db.transaction(...)` per projekt (potwierdzone, `content-cyber-projects.ts`).
3. **Bez niszczącego `db:seed`, bez `ALTER`/`DROP`** — tylko idempotentne narzędzie keyed-by-slug.
4. **Leo review** artefaktu + narzędzia przed scaleniem (bramka kodu).
5. **Autor commita = Darek** (`mubueu@gmail.com`).
6. **Audit log** — zapis faktu ingestu (kto, kiedy, ile wierszy, na jakim branchu backupu).

## 4. Warunki wstępne (pre-conditions)

- [ ] `neonctl` zainstalowany i zalogowany do org `org-snowy-credit-81923605` (`neonctl auth`).
- [ ] `pg_dump` w wersji **16+** (dla opcjonalnego dumpa; Neon = PG 16).
- [ ] Dostęp do **DIRECT** connection stringa `main` (migracje/ingest przez direct, NIE pooled/pgbouncer).
- [ ] Repo na zielonym stanie: `pnpm build`, `pnpm lint`, `pnpm test:run` przechodzą; artefakt + narzędzie po review Leo, scalone do `main` (commit autorstwa Darka).
- [ ] Brak równoległych deployów / migracji / innych ingestów w tym oknie.
- [ ] Świadoma zgoda Darka na wykonanie (czerwona linia).

## 5. Kopia zapasowa NEON (bramka #1 — WYKONAĆ PRZED ZAPISEM)

```bash
# 5a. Zero-copy snapshot branch main (natychmiastowy, tani — wzorzec z runbooka K3)
neonctl branches create \
  --project-id long-pond-11214233 \
  --org-id org-snowy-credit-81923605 \
  --parent main \
  --name prod-backup-pre-cyber-p3-2026-07-01
#   → to jest punkt przywracania dla §9 Rollback. Zanotuj zwrócony branch-id.

# 5b. (opcjonalny, zalecany) logiczny dump tuż przed startem
#     DIRECT connstring main:
#     neonctl connection-string main --project-id long-pond-11214233 \
#       --org-id org-snowy-credit-81923605 --role-name neondb_owner --database-name neondb
pg_dump "<main-DIRECT-connstring>" -Fc \
  -t projects -t project_competencies -t project_learning_resources -t project_source_links \
  -f prod-pre-cyber-p3-2026-07-01.dump
```

> Backup MUSI istnieć i być potwierdzony zanim przejdziesz do §7. Bez tego — STOP.

## 6. Stan wyjściowy — zapytania kontrolne PRZED (read-only)

Uruchom na `main` (direct), zanotuj wyniki jako baseline do porównania w §8:

```sql
-- 6a. ile projektów cyber-* jest teraz (oczekiwane: 0 lub stan sprzed poprzedniej partii)
SELECT count(*) FROM projects WHERE slug LIKE 'cyber-%';

-- 6b. całkowita liczba projektów (kontrola, że nic poza cyber nie zniknie)
SELECT count(*) AS total_projects FROM projects;
```

## 7. Wykonanie — WYMAGA JAWNEJ ZGODY (czerwona linia)

> **Świadoma decyzja operatora.** `CONFIRM_PROD_DB=1` to jawny krok, którym Darek bierze odpowiedzialność za zapis na zdalną bazę. **Ethan (CTO) NIE wykonuje tego kroku** — przygotował runbook i wydał sign-off.
>
> **Uwaga o `.env.test`:** narzędzie auto-ładuje `.env.test`, jeśli istnieje, ale `dotenv` **nie nadpisuje** już ustawionych zmiennych. Dlatego **`DATABASE_URL` wyeksportowany w powłoce wygrywa** z `.env.test`. Ustaw go jawnie przed uruchomieniem (poniżej). Jeśli chcesz mieć 100% pewności — tymczasowo zmień nazwę `.env.test` na czas ingestu.

```bash
# 7a. DIRECT connstring main → do zmiennej powłoki (NIE pooled)
export DATABASE_URL="<main-DIRECT-connstring>"

# 7b. ŚWIADOMA BRAMKA: potwierdzenie zapisu na zdalną bazę prod
#     (guard assert-test-db: host zdalny → wymaga tej flagi; bez niej ABORT)
export CONFIRM_PROD_DB=1

# 7c. Uruchom ingest (transakcja per projekt, upsert keyed-by-slug)
pnpm exec tsx tools/content-cyber-projects.ts tools/content/cyber-projects-partia-3.json
#   Oczekiwane: "29 wstawionych/zaktualizowanych, 0 błędów". Exit code 0.
#   Connection string NIE jest drukowany przez narzędzie (potwierdzone).

# 7d. Natychmiast wyczyść flagę z sesji, żeby nie „wisiała" na kolejne komendy
unset CONFIRM_PROD_DB
```

> ⚠️ **Nie używać `--warn-unknown-competencies` na prod.** Wszystkie nazwy przeszły walidację ERROR-mode na teście — na prod działamy w trybie fail-fast (nieznana nazwa = STOP).

## 8. Weryfikacja po ingeście (bramka jakości)

```sql
-- 8a. Liczba projektów cyber (oczekiwane: 29)
SELECT count(*) FROM projects WHERE slug LIKE 'cyber-%';

-- 8b. Rozkład poziomów (oczekiwane: L1=5, L2=12, L3=12)
SELECT level, count(*) FROM projects WHERE slug LIKE 'cyber-%' GROUP BY level ORDER BY level;

-- 8c. Każda rubryka sumuje wagi do dokładnie 100 (oczekiwane: 0 wierszy = brak odchyleń)
SELECT slug,
       (SELECT sum((r->>'weight')::int) FROM jsonb_array_elements(rubric_json) r) AS suma
FROM projects
WHERE slug LIKE 'cyber-%'
  AND (SELECT sum((r->>'weight')::int) FROM jsonb_array_elements(rubric_json) r) <> 100;

-- 8d. Pokrycie luk: każdy cyber-projekt ma ≥1 kompetencję required (oczekiwane: 0 wierszy)
SELECT p.slug
FROM projects p
WHERE p.slug LIKE 'cyber-%'
  AND NOT EXISTS (
    SELECT 1 FROM project_competencies pc
    WHERE pc.project_id = p.id AND pc.role = 'required'
  );

-- 8e. Kontrola integralności: nazwy kompetencji cyber są liśćmi ścieżki (spójność z matcherem)
--     (porównaj DISTINCT poniżej z listą liści w src/lib/db/data/career-model.ts — 0 obcych nazw)
SELECT DISTINCT pc.competency_name
FROM project_competencies pc
JOIN projects p ON p.id = pc.project_id
WHERE p.slug LIKE 'cyber-%'
ORDER BY 1;

-- 8f. Całkowita liczba projektów nie spadła względem baseline z §6b (nic nie skasowane globalnie)
SELECT count(*) AS total_projects FROM projects;
```

**Kryteria akceptacji:** 8a = 29 · 8b = 5/12/12 · 8c = 0 wierszy · 8d = 0 wierszy · 8e = wszystkie nazwy ∈ liście cyber · 8f ≥ baseline + (29 − stan_z_6a).

**Smoke aplikacji (po sukcesie):** wejdź na `/projects`, przefiltruj ścieżkę cyber → widoczne projekty L1–L3; otwórz jeden projekt → brief/rubryka renderują się poprawnie.

## 9. Rollback (plan wycofania)

Upsert **nadpisuje** stan — wycofanie opiera się o kopię zapasową z §5.

- **Opcja A (preferowana) — Neon restore z branch-backupu §5a:**
  ```bash
  neonctl branches restore main prod-backup-pre-cyber-p3-2026-07-01 \
    --project-id long-pond-11214233 --org-id org-snowy-credit-81923605
  ```
  Neon Console → Branches → `main` → Restore → źródło: `prod-backup-pre-cyber-p3-2026-07-01`.
  ⚠️ Nadpisuje bieżący `main` stanem z backupu — tracisz zapisy między backupem a rollbackiem. Okno ingestu krótkie → ryzyko niskie. Wykonaj rollback **przed** wpuszczeniem ruchu użytkowników, jeśli to możliwe.

- **Opcja B (chirurgiczna, gdy restore niepożądany) — usuń tylko 29 slugów:**
  ```sql
  BEGIN;
  DELETE FROM project_competencies      WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'cyber-%');
  DELETE FROM project_learning_resources WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'cyber-%');
  DELETE FROM project_source_links      WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'cyber-%');
  DELETE FROM projects                  WHERE slug LIKE 'cyber-%';
  -- Zweryfikuj: SELECT count(*) FROM projects WHERE slug LIKE 'cyber-%';  -- oczekiwane 0
  COMMIT;   -- albo ROLLBACK, jeśli count się nie zgadza
  ```
  ⚠️ Opcja B usuwa **wszystkie** `cyber-%` — jeśli przed partią 3 istniały inne cyber-projekty, zawęź `WHERE` do konkretnej listy slugów z artefaktu (`slug IN (...)`). Preferuj Opcję A, gdy stan sprzed był niepusty.

- **Opcja C (ostateczna) — odtworzenie z dumpa §5b:** `pg_restore` wybranych tabel z `prod-pre-cyber-p3-2026-07-01.dump`.

## 10. Audit log (bramka #6 — po wykonaniu)

Zanotuj (audit log / commit-notatka, autor Darek):
- data/godzina UTC ingestu,
- branch backupu (`prod-backup-pre-cyber-p3-2026-07-01` + branch-id) i ścieżka dumpa,
- wynik narzędzia (liczba wstawionych/zaktualizowanych, exit code),
- wyniki zapytań 8a–8f,
- kto zatwierdził (Ethan sign-off) / kto wykonał (Darek).

## 11. Pre-flight checklist (do odhaczenia przez Darka)

- [ ] CTO sign-off dla partii 3 wydany (Ethan) — patrz nagłówek.
- [ ] Artefakt + narzędzie po Leo review, scalone do `main`, **commit autorstwa Darka**.
- [ ] `neonctl` zalogowany; DIRECT connstring `main` pod ręką (NIE pooled).
- [ ] **Backup §5a wykonany i potwierdzony** (branch istnieje); opcjonalny dump §5b zrobiony.
- [ ] Baseline §6 zanotowany (liczba `cyber-%` i `total_projects`).
- [ ] Brak równoległych deployów/migracji/ingestów w oknie.
- [ ] `DATABASE_URL` = prod direct wyeksportowany (wygrywa z `.env.test`); świadomie ustawiony `CONFIRM_PROD_DB=1`.
- [ ] Ingest §7 → "29, 0 błędów", exit 0.
- [ ] Weryfikacja §8 — wszystkie kryteria zielone; smoke `/projects` OK.
- [ ] `CONFIRM_PROD_DB` wyczyszczony z sesji (`unset`).
- [ ] Audit log §10 uzupełniony.
- [ ] Backup branch zostawiony min. kilka dni (potem `neonctl branches delete …`).
```
