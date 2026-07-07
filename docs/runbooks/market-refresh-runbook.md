# Runbook: miesięczne odświeżenie rynku (AG.3 — upload → STAGING)

**Rytm:** raz w miesiącu (decyzja Darka 2026-07-07). Przypomnienie o samym
uploadzie = kalendarz Darka (AG.6 powiadamia STUDENTÓW o nowych lukach, nie
Darka o terminie uploadu).

**Czerwona linia:** ta procedura NIE dotyka `job_market_data` (prod). Ingest pisze
wyłącznie do `job_market_data_staging` + `market_refresh_runs`. Swap na prod =
AG.4 (akceptacja jednym tapnięciem), do tego czasu prod czyta stary snapshot.

## Wymagania wstępne (jednorazowo)

1. **Migracja 0023 na prodzie** (`job_market_data_staging`, `market_refresh_runs`)
   — procedura jak przy 0022: backup gałęzią Neona → porównanie dziennika
   (`drizzle/meta/_journal.json` vs tabela `__drizzle_migrations`) → `db:migrate`.
   Odpala Darek.
2. **Env na Vercelu:** `FLAG_PROACTIVE_MARKET_REFRESH=1` + `MARKET_REFRESH_TOKEN`
   (długi losowy sekret, np. `openssl rand -hex 32`) → redeploy. Bez flagi trasa
   zwraca 404, bez tokenu 401 — kolejność dowolna, bezpiecznie ustawiać osobno.
3. **(AG.6, opcjonalnie osobno)** `FLAG_MARKET_GAP_NOTIFICATIONS=1` — zapala
   STUDENCKĄ warstwę powiadomień „nowa luka" na dashboardzie (karta zgody RODO
   opt-in + lista nieprzeczytanych zdarzeń z `market_new_gap_events`). Celowo
   osobna flaga: potok rynku może działać, zanim wypuścimy UI studenta.
   Wymaga migracji **0026** na prodzie (kolumny zgody na `students`).

## Procedura miesięczna

1. **Eksport CSV z JustJoinIT** (jak dotąd — analiza Darka):
   `JustJoinIT_Oferty.csv` + `JustJoinIT_Technologie.csv` (separator `;`,
   utf-8 z BOM). Zanotuj datę zrzutu.
2. **Spakuj oba pliki** (limit body trasy = 8 MB; goły CSV może nie wejść):
   ```bash
   gzip -k JustJoinIT_Oferty.csv JustJoinIT_Technologie.csv
   ```
3. **Upload:**
   ```bash
   curl -sS -X POST https://skill-bridge-ai-seven.vercel.app/api/market-refresh/ingest \
     -H "x-market-refresh-token: $MARKET_REFRESH_TOKEN" \
     -F "oferty=@JustJoinIT_Oferty.csv.gz" \
     -F "technologie=@JustJoinIT_Technologie.csv.gz"
   ```
4. **Sprawdź odpowiedź** (JSON):
   - `meta.rawOffers / uniqueOffers / assignedOffers / coveragePercent / paths` —
     porównaj z poprzednim snapshotem (rząd wielkości ~10k ofert, ~23 ścieżki,
     pokrycie ~86%). Drastyczny spadek = prawdopodobnie zły/ucięty eksport.
   - `meta.ofertyMd5 / technologieMd5` — zapisz w prowenicji
     (`docs/data/job-market-provenance.md` §0.2 — nowy wiersz przy akceptacji).
   - `diffSummary` — liczby nowych/znikniętych/zmienionych ścieżek i kompetencji.
5. **Pełny raport diffu** siedzi w `market_refresh_runs.diff` (jsonb) — do czasu
   widoku AG.4 podgląd przez Neon SQL Editor:
   ```sql
   SELECT id, created_at, status, staged_rows, diff->'summary' AS summary
   FROM market_refresh_runs ORDER BY created_at DESC LIMIT 5;
   ```
6. **Decyzja (AG.4 — jedno tapnięcie, mobile-friendly):** wejdź na
   `https://skill-bridge-ai-seven.vercel.app/market-refresh`, wklej
   `MARKET_REFRESH_TOKEN`, „Pobierz ostatni przebieg" → przejrzyj diff →
   **Akceptuję** (transakcyjny swap staging→prod z auto-backupem
   `job_market_data_bak` + kontrolą liczb przed COMMIT) albo **Odrzuć**
   (prod bez zmian). Strażnice: podwójna decyzja i akceptacja starszego runu
   niż ostatni upload = 409, prod nietknięty. Ponowny upload nadpisuje staging
   (wipe+insert) i dokłada nowy wiersz runu — nic nie trzeba sprzątać.
7. **Model kariery (świadomie OSOBNO):** akceptacja podmienia TYLKO
   `job_market_data`. Bajty świeżego `career-model.json` siedzą w
   `market_refresh_runs.content_model` — jego ingest do
   `career_model_versions` to istniejąca procedura 1.0
   (`pnpm db:ingest-career-model`, czerwona linia, odpalasz Ty). Bez tego kroku
   aplikacja dalej czyta poprzedni model (spójna, tylko starsza wersja opisów
   grup/kind).

## Po akceptacji: automatyczny recompute luk (AG.5)

Akceptacja odpala od razu deterministyczny recompute wszystkich studentów
(operacje na zbiorach, ~0 LLM): luki przeliczone vs nowy rynek, cache opisów
przeniesiony dla luk, które przetrwały; **LLM tylko dla NOWYCH luk** (memo:
jedna unikalna nowa luka = jedno wywołanie, niezależnie od liczby studentów;
koszt w `ai_usage_ledger`, scope `generate-why`). Nowe luki lądują też w
`market_new_gap_events` (wsad dla powiadomień AG.6). Podsumowanie wraca w
odpowiedzi decyzji (`recompute`) i zapisuje się w `market_refresh_runs.recompute`.

Jeśli odpowiedź ma `recomputeFailed: true` (swap PRZESZEDŁ, przeliczenie padło):
```bash
curl -sS -X POST https://skill-bridge-ai-seven.vercel.app/api/market-refresh/recompute \
  -H "x-market-refresh-token: $MARKET_REFRESH_TOKEN"
```
Idempotentne — powtórka na tym samym rynku nie tworzy duplikatów i nie woła LLM.
Po ręcznym rollbacku z `_bak` też warto odpalić (luki wrócą do starego rynku).

## Po recompute: powiadomienia studentów (AG.6)

Nic do zrobienia ręcznie. Przy `FLAG_MARKET_GAP_NOTIFICATIONS=1` student z nową
luką zobaczy na dashboardzie kartę „Rynek zaczął wymagać: X" — pod warunkiem, że
wyraził zgodę RODO na monitoring rynku (opt-in na dashboardzie; bez zgody
zdarzenia czekają nieprzeczytane i pokażą się po ewentualnym włączeniu zgody).
„Oznacz jako przeczytane" wypełnia `notified_at`; wycofanie zgody chowa
powiadomienia. Diagnostyka: `SELECT count(*) FROM market_new_gap_events WHERE
notified_at IS NULL;` — ile powiadomień czeka na odczyt.

## Rollback po akceptacji (dopóki istnieje `job_market_data_bak`)

Backup żyje do NASTĘPNEGO swapu. Przywrócenie poprzedniego rynku:

```sql
BEGIN;
DELETE FROM job_market_data;
INSERT INTO job_market_data SELECT * FROM job_market_data_bak;
COMMIT;
```

(Procedura zweryfikowana automatycznie — test integracyjny AG.4 używa jej jako
sprzątania po każdym swapie.) Po rollbacku zaakceptowany run zostaje ze statusem
`accepted` — to zapis historii decyzji, nie stanu proda; kolejny upload i tak
otworzy nowy run.

## Diagnostyka

| Objaw | Przyczyna |
|---|---|
| 404 | `FLAG_PROACTIVE_MARKET_REFRESH` zgaszona na tym środowisku |
| 401 | Zły/nieustawiony `MARKET_REFRESH_TOKEN` (env lub nagłówek) |
| 413 | Pliki bez gzip przekroczyły 8 MB — spakuj (`gzip -k`) |
| 422 + `details` | Zamienione/złe pliki — brak wymaganych kolumn (Slug/Stanowisko/Kategoria · Slug/Technologia) |
| 500 | Patrz logi Vercela, scope `market-refresh.ingest` |

**Czas przetwarzania:** pełna skala zrzutu (9 922 ofert / ~50k wierszy tech) liczy
się ~0,4 s (pomiar: `tests/unit/etl-scale.test.ts`); `maxDuration=300` to głównie
zapas na powolny upload.

**Rollback uploadu:** nie dotyczy — staging i runy to brudnopis; prod nietknięty
do momentu Twojej akceptacji (rollback PO akceptacji — sekcja wyżej).
