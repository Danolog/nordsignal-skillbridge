# Runbook: Ingest prod — projekty Data Scientist, partia 1 (v1.12)

> **Status:** PRZYGOTOWANY (CTO sign-off Ethan, 2026-07-02). Ingest do bazy **testowej** zielony (walidacja kontraktu + test integracyjny). **Wykonanie na prod = czerwona linia — wymaga jawnej, świadomej decyzji Darka.** Ten dokument tylko PRZYGOTOWUJE — realny zapis odpala człowiek.
> **Autor commita treści/artefaktu przy scaleniu = Darek** (`mubueu@gmail.com`).
> **Cel prod:** Neon, projekt `long-pond-11214233` („SkillBridge"), branch `main` (`br-proud-sun-al3aezrj`), baza `neondb`, rola `neondb_owner`, host direct `ep-crimson-leaf-alz0lqiz.c-3.eu-central-1.aws.neon.tech`.

---

## 1. Kontekst

Ścieżka **Data Scientist** ma dziś w marketplace prod **7 projektów-klisz** (Titanic, Iris, MNIST, churn, DVC, sentiment-PyTorch, raport-ML — zeseedowane z `seed-projects.ts`). Uczą one datasetów-klisz zakazanych przez QG-4 i rozjeżdżają się z kuracją. **Decyzja Darka: te 7 WYCOFAĆ i ZASTĄPIĆ** partią 1 (nie dokładać obok).

Ten runbook: (a) WSTAWIA **10 nowych projektów DS** (partia 1) i (b) WYCOFUJE **7 starych projektów-klisz DS**.

- **Artefakt:** `tools/content/ds-projects-partia-1.json` — 10 projektów (**L1: 4 · L2: 4 · L3: 2**), po autoringu i bramce QG-6, zwalidowane kontraktowo (rubryki=100, nazwy kompetencji dosłownie z liści ścieżki „Data Scientist", pokrycie 23/24 — Snowflake świadomie poza, trial-safe).
- **Narzędzie:** `tools/content-cyber-projects.ts` — **uogólnione o parametr `--path`** (E1). Idempotentny upsert keyed-by-slug, transakcja per projekt, walidacja fail-fast przed bazą. Dla DS: `--path "Data Scientist"` (walidacja nazw wobec liści ścieżki DS z `career-model.ts`).
- **Guard:** `tools/assert-test-db.ts` — allowlista hostów lokalnych; host zdalny bez `CONFIRM_PROD_DB=1` → ABORT; fragment `skill-bridge-ai` → ABORT bezwarunkowo.
- **Kontrakt:** `tools/content/README-cyber-projects.md` (sekcja „Narzędzie jest OGÓLNE względem ścieżki").

**Zakres zmian danych (bez zmian schemy — E1 §6, zero `ALTER`/`DROP`/`ALTER TYPE`):**

| Tabela | Operacja | Bramka v1.12 |
|---|---|---|
| `projects` | upsert keyed-by-slug (`INSERT … ON CONFLICT(slug) DO UPDATE`) dla 10 slugów `ds-*` | transakcyjny, nie-niszczący |
| `project_competencies` | replace-per-projekt (`DELETE … WHERE project_id = …` + `INSERT`) | zawsze z `WHERE` |
| `project_learning_resources` | replace-per-projekt (gdy klucz obecny) | zawsze z `WHERE` |
| `project_source_links` | replace-per-projekt (gdy klucz obecny) | zawsze z `WHERE` |
| `projects` (wycofanie) | **jawny transakcyjny `DELETE` 7 starych slugów DS-klisz** (§7b) — osobna bramka | transakcyjny, `WHERE slug IN (...)` |

Narzędzie **nigdy** nie robi `DELETE FROM projects` bez `WHERE`, **nigdy** nie odpala niszczącego `db:seed`. Ingest (§7a) dotyka wyłącznie 10 slugów `ds-*` z pliku. Wycofanie (§7b) to **osobny, ręczny** krok SQL pod własną bramką decyzyjną — patrz §11 (Decyzje Darka).

## 2. Stan zweryfikowany przed prod (baza testowa, 2026-07-02)

- **Walidacja deterministyczna PRZESZŁA** (`tests/unit/ds/content-ds-projects.contract.test.ts`, w `pnpm test:run`):
  - wszystkie nazwy kompetencji ∈ liście ścieżki „Data Scientist" w `career-model.ts` (24 liście, w tym `Statystyka (Statistics)` z dopiskiem w nawiasie);
  - każda `rubricJson` sumuje wagi do **dokładnie 100** (0 wadliwych rubryk);
  - slugi unikalne, wszystkie z prefiksem `ds-`;
  - rozkład poziomów **4×L1 · 4×L2 · 2×L3**; pokrycie **23/24 liści** jako `required` (jedyny niepokryty = Snowflake, świadomie).
- **Parytet test-seed:** `src/lib/db/seed-projects.ts` — stary blok 7 projektów DS-klisz **usunięty**, dodane 10 DS; `DEMO_PROJECTS` = 30 (było 27). Test `seed-data.test.ts` zaktualizowany (30; L1:12/L2:12/L3:6; open_data:21/oss:9).
- **Test integracyjny** (`tools/__tests__/content-ds-projects.integration.test.ts`, projekt `integration`): ingest 10 DS na bazie testowej + idempotencja + deterministyczny rdzeń matchera wynosi projekty DS dla syntetycznego studenta DS z lukami (EDA / Databricks / A-B testing / Uczenie maszynowe). Uruchomienie: `docker compose -f docker-compose.test.yml up -d && pnpm db:migrate:test && pnpm test:integration`.
- Repo zielone: `pnpm build` (exit 0), `pnpm lint` (exit 0), `pnpm test:run` (817 testów, 0 fail).

## 3. Bramki v1.12 (źródła w repo)

Formalna definicja bramek jest **rozproszona** (spójna, wzór ADR-009 §3). Bramki obowiązujące dla tej operacji (checklist w §10):

1. **Kopia zapasowa NEON** przed zmianą danych (zero-copy branch + opcjonalny `pg_dump`).
2. **Transakcyjny SQL** — narzędzie robi `db.transaction(...)` per projekt (§7a); wycofanie (§7b) w jawnym `BEGIN…COMMIT`.
3. **Bez niszczącego `db:seed`, bez `ALTER`/`DROP`** — tylko idempotentne narzędzie keyed-by-slug + celowany `DELETE … WHERE slug IN (...)`.
4. **Leo review** artefaktu + uogólnionego narzędzia przed scaleniem (bramka kodu).
5. **Autor commita = Darek** (`mubueu@gmail.com`).
6. **Audit log** — zapis faktu ingestu (kto, kiedy, ile wierszy, na jakim branchu backupu).

## 4. Warunki wstępne (pre-conditions)

- [ ] `neonctl` zainstalowany i zalogowany do org `org-snowy-credit-81923605` (`neonctl auth`).
- [ ] `pg_dump` w wersji **16+** (Neon = PG 16).
- [ ] Dostęp do **DIRECT** connection stringa `main` (migracje/ingest przez direct, NIE pooled/pgbouncer).
- [ ] Repo na zielonym stanie: `pnpm build`, `pnpm lint`, `pnpm test:run` przechodzą; artefakt + narzędzie po review Leo, scalone do `main` (commit autorstwa Darka).
- [ ] **Decyzja Darka o wycofaniu 7 starych DS podjęta** (§11) — w szczególności sposób obsługi ewentualnych `project_submissions` na starych DS (cascade!).
- [ ] Brak równoległych deployów / migracji / innych ingestów w tym oknie.
- [ ] Świadoma zgoda Darka na wykonanie (czerwona linia).

## 5. Kopia zapasowa NEON (bramka #1 — WYKONAĆ PRZED ZAPISEM)

```bash
# 5a. Zero-copy snapshot branch main (natychmiastowy, tani — punkt przywracania dla §9)
neonctl branches create \
  --project-id long-pond-11214233 \
  --org-id org-snowy-credit-81923605 \
  --parent main \
  --name prod-backup-pre-ds-p1-2026-07-02
#   → Zanotuj zwrócony branch-id.

# 5b. (opcjonalny, zalecany) logiczny dump tuż przed startem — DIRECT connstring main:
#     neonctl connection-string main --project-id long-pond-11214233 \
#       --org-id org-snowy-credit-81923605 --role-name neondb_owner --database-name neondb
pg_dump "<main-DIRECT-connstring>" -Fc \
  -t projects -t project_competencies -t project_learning_resources -t project_source_links \
  -t project_submissions \
  -f prod-pre-ds-p1-2026-07-02.dump
```

> Backup MUSI istnieć i być potwierdzony zanim przejdziesz do §7. Bez tego — STOP. (Dump obejmuje `project_submissions`, bo §7b usuwa projekty z kaskadą na zgłoszenia.)

## 6. Stan wyjściowy — zapytania kontrolne PRZED (read-only)

Uruchom na `main` (direct), zanotuj wyniki jako baseline do §8:

```sql
-- 6a. całkowita liczba projektów (kontrola globalna)
SELECT count(*) AS total_projects FROM projects;

-- 6b. ile projektów ds-* jest teraz (oczekiwane: 0 — partia 1 wchodzi pierwszy raz)
SELECT count(*) FROM projects WHERE slug LIKE 'ds-%';

-- 6c. stare projekty DS-klisze do wycofania (oczekiwane: 7)
SELECT slug FROM projects WHERE slug IN (
  'eda-titanic-pandas-numpy','klasyfikator-iris-scikit-learn','predykcja-churn-feature-engineering',
  'klasyfikator-mnist-tensorflow','pipeline-ml-git-dvc','sentiment-pytorch-cloud-deploy',
  'raport-ml-prezentacja-stakeholder'
) ORDER BY slug;

-- 6d. ⚠ KRYTYCZNE: czy istnieją zgłoszenia studentów na stare DS (cascade przy DELETE!)
SELECT p.slug, count(ps.id) AS submissions
FROM projects p
LEFT JOIN project_submissions ps ON ps.project_id = p.id
WHERE p.slug IN (
  'eda-titanic-pandas-numpy','klasyfikator-iris-scikit-learn','predykcja-churn-feature-engineering',
  'klasyfikator-mnist-tensorflow','pipeline-ml-git-dvc','sentiment-pytorch-cloud-deploy',
  'raport-ml-prezentacja-stakeholder'
)
GROUP BY p.slug ORDER BY submissions DESC;
--   Jeśli którykolwiek > 0 → STOP i decyzja Darka (§11): usunięcie skasuje te zgłoszenia
--   (Verified Receipts) kaskadą. Alternatywa: zamiast DELETE ustaw status projektu na nieaktywny.
```

## 7. Wykonanie — WYMAGA JAWNEJ ZGODY (czerwona linia)

> **Świadoma decyzja operatora.** `CONFIRM_PROD_DB=1` to jawny krok, którym Darek bierze odpowiedzialność za zapis na zdalną bazę. **Ethan (CTO) NIE wykonuje tego kroku** — przygotował runbook i wydał sign-off.
>
> **Uwaga o `.env.test`:** narzędzie auto-ładuje `.env.test`, jeśli istnieje, ale `dotenv` **nie nadpisuje** już ustawionych zmiennych — `DATABASE_URL` wyeksportowany w powłoce wygrywa. Dla 100% pewności tymczasowo zmień nazwę `.env.test` na czas ingestu.

### 7a. Ingest 10 nowych projektów DS (narzędzie, transakcja per projekt)

```bash
# DIRECT connstring main → do zmiennej powłoki (NIE pooled)
export DATABASE_URL="<main-DIRECT-connstring>"

# ŚWIADOMA BRAMKA: potwierdzenie zapisu na zdalną bazę prod
export CONFIRM_PROD_DB=1

# Ingest z walidacją nazw wobec liści ścieżki Data Scientist
pnpm exec tsx tools/content-cyber-projects.ts tools/content/ds-projects-partia-1.json --path "Data Scientist"
#   Oczekiwane: "Wstawiono: 10, zaktualizowano: 0, błędów: 0". Exit code 0.
#   Connection string NIE jest drukowany przez narzędzie.

unset CONFIRM_PROD_DB   # natychmiast wyczyść flagę z sesji
```

> ⚠️ **Nie używać `--warn-unknown-competencies` na prod.** Wszystkie nazwy przeszły walidację ERROR-mode na teście — na prod działamy fail-fast (nieznana nazwa = STOP).
> ⚠️ **Pamiętaj o `--path "Data Scientist"`** — bez tego narzędzie zwaliduje nazwy wobec liści cyber i **zatrzyma ingest** (bramka jakości zadziała poprawnie, ale to nie ten zestaw liści).

### 7b. Wycofanie 7 starych projektów DS-klisz (jawny SQL, po decyzji §11)

> **Decyzja Darka (2026-07-02): plain DELETE — świadoma zgoda na kaskadę na `project_submissions`.** Wariant dezaktywacji (`status='archived'`) odrzucony. Krok §6d nadal wykonaj, ale **wyłącznie by ZANOTOWAĆ w audit logu**, ile zgłoszeń (Verified Receipts) zostało skasowanych kaskadą — nie zatrzymuje to DELETE.

```sql
BEGIN;
DELETE FROM projects WHERE slug IN (
  'eda-titanic-pandas-numpy','klasyfikator-iris-scikit-learn','predykcja-churn-feature-engineering',
  'klasyfikator-mnist-tensorflow','pipeline-ml-git-dvc','sentiment-pytorch-cloud-deploy',
  'raport-ml-prezentacja-stakeholder'
);
-- Zweryfikuj PRZED COMMIT: powinno usunąć DOKŁADNIE 7 wierszy.
-- (project_competencies / learning_resources / source_links / submissions znikają kaskadą.)
SELECT count(*) FROM projects WHERE slug IN (
  'eda-titanic-pandas-numpy','klasyfikator-iris-scikit-learn','predykcja-churn-feature-engineering',
  'klasyfikator-mnist-tensorflow','pipeline-ml-git-dvc','sentiment-pytorch-cloud-deploy',
  'raport-ml-prezentacja-stakeholder'
);  -- oczekiwane: 0
COMMIT;   -- albo ROLLBACK, jeśli liczba usuniętych ≠ 7
```

## 8. Weryfikacja po ingeście (bramka jakości)

```sql
-- 8a. Liczba projektów DS (oczekiwane: 10)
SELECT count(*) FROM projects WHERE slug LIKE 'ds-%';

-- 8b. Rozkład poziomów DS (oczekiwane: L1=4, L2=4, L3=2)
SELECT level, count(*) FROM projects WHERE slug LIKE 'ds-%' GROUP BY level ORDER BY level;

-- 8c. Każda rubryka DS sumuje wagi do dokładnie 100 (oczekiwane: 0 wierszy)
SELECT slug,
       (SELECT sum((r->>'weight')::int) FROM jsonb_array_elements(rubric_json) r) AS suma
FROM projects
WHERE slug LIKE 'ds-%'
  AND (SELECT sum((r->>'weight')::int) FROM jsonb_array_elements(rubric_json) r) <> 100;

-- 8d. Pokrycie luk: każdy DS-projekt ma ≥1 kompetencję required (oczekiwane: 0 wierszy)
SELECT p.slug FROM projects p
WHERE p.slug LIKE 'ds-%'
  AND NOT EXISTS (SELECT 1 FROM project_competencies pc WHERE pc.project_id = p.id AND pc.role = 'required');

-- 8e. Integralność: nazwy kompetencji DS są liśćmi ścieżki (spójność z matcherem)
--     Porównaj DISTINCT poniżej z liśćmi „Data Scientist" w career-model.ts — 0 obcych nazw.
--     Oczekiwane pokrycie required: 23/24 liści (Snowflake świadomie NIEpokryty).
SELECT DISTINCT pc.competency_name
FROM project_competencies pc JOIN projects p ON p.id = pc.project_id
WHERE p.slug LIKE 'ds-%' ORDER BY 1;

-- 8f. Stare DS-klisze wycofane (oczekiwane: 0) i total zgodny z bilansem
SELECT count(*) AS stare_ds FROM projects WHERE slug IN (
  'eda-titanic-pandas-numpy','klasyfikator-iris-scikit-learn','predykcja-churn-feature-engineering',
  'klasyfikator-mnist-tensorflow','pipeline-ml-git-dvc','sentiment-pytorch-cloud-deploy',
  'raport-ml-prezentacja-stakeholder'
);
SELECT count(*) AS total_projects FROM projects;  -- oczekiwane: baseline(6a) + 10 − 7 = baseline + 3
```

**Kryteria akceptacji:** 8a = 10 · 8b = 4/4/2 · 8c = 0 wierszy · 8d = 0 wierszy · 8e = wszystkie nazwy ∈ liście DS (23/24 pokryte jako required) · 8f = stare_ds 0 oraz total = baseline + 3.

**Smoke aplikacji (po sukcesie):** wejdź na `/projects`, przefiltruj ścieżkę „Data Scientist" → widoczne projekty L1–L3 (nowe `ds-*`, brak Titanic/Iris/MNIST); otwórz jeden projekt → brief/rubryka renderują się poprawnie.

## 9. Rollback (plan wycofania)

Upsert i DELETE nadpisują/usuwają stan — wycofanie opiera się o kopię zapasową z §5.

- **Opcja A (preferowana) — Neon restore z branch-backupu §5a:**
  ```bash
  neonctl branches restore main prod-backup-pre-ds-p1-2026-07-02 \
    --project-id long-pond-11214233 --org-id org-snowy-credit-81923605
  ```
  ⚠️ Nadpisuje bieżący `main` stanem z backupu — tracisz zapisy między backupem a rollbackiem. Wykonaj **przed** wpuszczeniem ruchu użytkowników, jeśli to możliwe.

- **Opcja B (chirurgiczna) — usuń tylko 10 nowych DS:**
  ```sql
  BEGIN;
  DELETE FROM projects WHERE slug LIKE 'ds-%';  -- kaskada sprząta zależne tabele
  SELECT count(*) FROM projects WHERE slug LIKE 'ds-%';  -- oczekiwane 0
  COMMIT;
  ```
  ⚠️ Opcja B **nie** przywraca wycofanych 7 starych DS-klisz — do tego potrzebny restore (A) lub `pg_restore` z §5b (C).

- **Opcja C (ostateczna) — odtworzenie z dumpa §5b:** `pg_restore` wybranych tabel z `prod-pre-ds-p1-2026-07-02.dump`.

## 10. Audit log (bramka #6 — po wykonaniu)

Zanotuj (audit log / commit-notatka, autor Darek): data/godzina UTC, branch backupu (+ branch-id) i ścieżka dumpa, wynik narzędzia (wstawione/zaktualizowane, exit code), liczba usuniętych starych DS (§7b), wyniki 8a–8f, kto zatwierdził (Ethan) / kto wykonał (Darek).

## 11. Pre-flight checklist + Decyzje Darka (do odhaczenia)

**Decyzje przed wykonaniem:**
- [x] **D1 — Wycofanie starych 7 DS: ROZSTRZYGNIĘTE (Darek, 2026-07-02) → plain DELETE (§7b), świadoma zgoda na kaskadę na `project_submissions`.** Dezaktywacja odrzucona. §6d wykonać tylko dla audit logu (ile Receipts skasowano). Wciąż wymaga zielonego backupu §5 przed DELETE.
- [ ] **D2 — Weryfikacja ręczna licencji przed prod (spec §6, nie blokuje autoringu):** badge licencji Cookie Cats na Kaggle (P7 `ds-eksperyment-ab-memo`) oraz rozbieżność tagu HF `cc-by-sa` vs kanoniczne CC BY-NC-SA 4.0 dla PolEmo (P8 `ds-nlp-klasyfikacja-polskich-tekstow` — przyjęto wersję ostrożniejszą). Potwierdzić przed publikacją.
- [ ] **D3 — Historyczne artefakty B3:** `tools/content/b3-theory-partia-{1,2}.json` odwołują się do slugów `eda-titanic-pandas-numpy` (p1) i `klasyfikator-iris-scikit-learn` (p2). Po wycofaniu tych projektów narzędzie `content-b3-theory.ts` po prostu **SKIP-uje** je (nie failuje). Zostawione świadomie jako niezmienialne artefakty audytu wcześniejszych ingestów; nie wymagają zmiany kodu. Decyzja: potwierdzić „zostawiamy" (rekomendacja Ethana) — modyfikacja fałszowałaby ślad audytu.

**Pre-flight:**
- [ ] CTO sign-off dla partii 1 DS wydany (Ethan) — patrz nagłówek.
- [ ] Artefakt + uogólnione narzędzie po Leo review, scalone do `main`, **commit autorstwa Darka**.
- [ ] `neonctl` zalogowany; DIRECT connstring `main` pod ręką (NIE pooled).
- [ ] **Backup §5a wykonany i potwierdzony** (branch istnieje); opcjonalny dump §5b (z `project_submissions`) zrobiony.
- [ ] Baseline §6 zanotowany (total, ds-*, stare DS, zgłoszenia §6d).
- [ ] Brak równoległych deployów/migracji/ingestów w oknie.
- [ ] `DATABASE_URL` = prod direct (wygrywa z `.env.test`); świadomie `CONFIRM_PROD_DB=1`; użyte `--path "Data Scientist"`.
- [ ] Ingest §7a → "10, 0 błędów", exit 0. Wycofanie §7b → 7 usuniętych (po D1).
- [ ] Weryfikacja §8 — wszystkie kryteria zielone; smoke `/projects` (filtr DS) OK.
- [ ] `CONFIRM_PROD_DB` wyczyszczony z sesji (`unset`).
- [ ] Audit log §10 uzupełniony.
- [ ] Backup branch zostawiony min. kilka dni (potem `neonctl branches delete …`).

## 12. Rekord wykonania (audit log §10) — DO UZUPEŁNIENIA PO PROD

> Status: **NIE WYKONANE** (przygotowane; czeka na decyzję Darka). Po wykonaniu uzupełnić analogicznie do ADR-009 §12 (cel, backup branch-id, baseline, wynik narzędzia, weryfikacja 8a–8f, rollback/uwagi).
