# Runbook: miesięczne odświeżenie rynku (AG.3 — upload → STAGING)

**Rytm:** raz w miesiącu (decyzja Darka 2026-07-07). Do czasu warstwy powiadomień
(AG.6) przypomnienie = kalendarz Darka.

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
6. **Decyzja** (do AG.4 ręcznie): akceptacja/odrzucenie = AG.4; na razie staging
   po prostu czeka. Ponowny upload nadpisuje staging (wipe+insert) i dokłada
   nowy wiersz runu — nic nie trzeba sprzątać.

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

**Rollback:** nie dotyczy — staging i runy to brudnopis; prod nietknięty z definicji.
