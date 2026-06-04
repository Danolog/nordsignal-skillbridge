# Z6 — rekomendacja jobów bramki CI (QA → Ethan)

**Autor:** Quinn (Agent QA) · **Data:** 2026-06-04 · **Adresat decyzji:** Ethan (CTO) · **Status:** rekomendacja, czeka na decyzję
**Granica (G1/G3):** Quinn *proponuje* zakres i uzasadnienie; **standard bramki CI i topologię runnera ustala Ethan**. To nie jest zmiana w `.github/workflows/pr.yml` — to wejście do jego decyzji. Żaden job nie wchodzi bez sign-offu Ethana (i czerwonej linii merge na main).
**Geneza:** `skills/qa/SKILL.md` §4 (3 ścieżki krytyczne „na każdy PR; fail = blok merge") + §5 (czego brakuje w bramce) + kalibracja Quinna Z1–Z5 (testy istnieją, ale nie wszystkie są egzekwowane przez CI).

---

## 1. Stan obecny bramki (7 jobów, `pr.yml`)

`lint` (biome) · `typecheck` (tsc) · `test` (vitest **unit**, bez bazy) · `integration` (Postgres 16 + `db:migrate` + `db:seed` + `k3-validate` + vitest **integration**) · `build` (next) · `secret-scan` (gitleaks) · `deps-scan` (pnpm audit).

## 2. Co już egzekwują istniejące joby (po wlądowaniu testów Z2–Z4 na main)

**Nie wymaga nowych jobów — tylko domknięcia, że testy wjadą z fixami:**

| Test Quinna | Job, który go uruchomi | Warunek |
|---|---|---|
| Z2 integracyjny (sylabus, błąd #2) `*.integration.test.ts` | `integration` (projekt vitest `integration`) | wjazd z naprawą strumienia C; `it.fails` flipnie na czerwono = dowód naprawy |
| Z3 integracyjny (brief, błąd #4) | `integration` | jw. strumień D; **wymaga roli `app_student` w CI-Postgresie** — patrz ryzyko R1 |
| Z4 strukturalny (nawigacja #5 + logo #1) `ui-consistency.test.tsx` | `test` (unit — czyta fs, renderuje sidebar, bez bazy) | wjazd z naprawami (sidebar/`<Logo/>`); `it.fails` flipną |

**Wniosek:** warstwa jednostkowa i integracyjna **już ma** miejsce w bramce. Reguła §4 pęka wyłącznie na **e2e** (Playwright **nie istnieje w CI w ogóle**).

## 3. Luka główna: e2e ścieżek krytycznych (§4 niespełniony)

`skills/qa/SKILL.md` §4: rejestracja→onboarding, submit projektu, paszport publiczny — „na każdy PR; fail = blok merge". Dziś **żaden** z nich nie biega w CI. Pakiet `tests/e2e-pw/` istnieje (01-public-auth `@safe`, 10-b0, 20-b1-b4, 30-b5, 40-onboarding-pdf, 50-rejestracja) i jest odpalany **wyłącznie ręcznie**. Propozycja: trzy joby e2e wg tagów (tagowanie już jest w `helpers/guards.ts`).

### Job A — `e2e-safe` (rekomendacja: dołożyć TERAZ, niski koszt)
- **Pokrywa:** publiczne strony read-only + bramka auth (`@safe`): landing, /login, /signup, panel wykładowcy, redirecty middleware. Łapie regresje publicznego frontu (w tym landing — błąd #6) i bramki bezpieczeństwa.
- **Koszt/zależności:** bez bazy, bez LLM. `next build` + start serwera z placeholderami + `playwright test --grep @safe`. ~2–3 min runnera.
- **Komenda (szkic):** `$env:DATABASE_URL=""; pnpm build && pnpm start &` → `pnpm exec playwright test --grep @safe`.
- **Decyzja Ethana:** czy `build`-then-`start` w jobie, czy reużyć artefaktu z joba `build`.

### Job B — `e2e-dbwrite` (rekomendacja: dołożyć, średni koszt)
- **Pokrywa:** ścieżki zapisujące BEZ LLM (`@dbwrite` minus `@llm`): **rejestracja→wejście w onboarding (Z5 test A)**, B1 paszport, dashboard, marketplace projektów, izolacja zapisu. To pierwszy segment ścieżki krytycznej #1.
- **Zależności:** Postgres 16 service (jak job `integration`) + `db:migrate:test` + `seed:e2e` + serwer dev na bazie testowej + `playwright test --grep @dbwrite` z `E2E_ALLOW_DB_WRITES=1`, `PLAYWRIGHT_BASE_URL` na lokalny serwer. Guard `dbWriteTest` blokuje prod-URL — bezpiecznik zostaje.
- **Uwaga (pamięć `env-test-loader-cudzyslowy`):** w CI ładuj env przez dotenv/`--env-file`, nie ręczny Get-Content — cytowane wartości łamią serwer.
- **Decyzja Ethana:** czy serwer dev (turbopack) czy `next build && next start` (stabilniejszy, bez zimnej kompilacji — patrz ryzyko R2).

### Job C — `e2e-llm` (DECYZJA Ethana — L1 z review Z5)
- **Pokrywa:** segment AI ścieżek krytycznych (`@llm`): **pełna ścieżka rejestracja→onboarding→dashboard (Z5 test B)**, B0 pomocnik, B4 samoocena pełna. Bez tego joba ścieżka #1 jest w CI pokryta tylko 1→2 (segment 3→5 woła model).
- **Zależności:** wszystko z joba B **+ `ANTHROPIC_API_KEY` jako GitHub secret** po stronie serwera. **Realny koszt API per PR** (~2 wywołania modelu/przebieg dla Z5; więcej dla B0).
- **Decyzja Ethana (3 opcje):**
  1. dedykowany job z kluczem serwerowym na każdy PR (pełne pokrycie, koszt API per PR);
  2. job nocny/`workflow_dispatch` (pokrycie bez kosztu per-PR, ale „fail=blok merge" §4 nie obejmuje segmentu AI);
  3. świadoma akceptacja luki do czasu (zapisana w `skills/qa/SKILL.md §5`).
- **Rekomendacja Quinna:** opcja 1 **przed go-live Bety**, opcja 2 do tego czasu. Próg z review Leo (L1): pełne e2e ścieżek krytycznych musi być w bramce przed Betą.

## 4. Luka druga: walidacja kontraktu API (częściowo pokryta)

§5 wymienia „walidacja kontraktu API (każdy handler: wejście + wyjście + izolacja)". Job `integration` **już to uruchamia** (projekt vitest `integration`) — Z2/Z3 to dokładnie ten wzorzec (realny route + multipart/JSON + auth + RLS). **Brak = pokrycie, nie job:** nie każdy handler ma jeszcze test kontraktu. Rekomendacja: to **backlog testów Quinna** (dopisywać test integracyjny per handler), nie nowy job. Egzekucja: istniejący `integration`.

## 5. Luka trzecia: regresja wizualna pixel (rekomendacja: ODŁOŻYĆ)

Błąd #1 (logo) — **korzeń już gatowany strukturalnie** (Z4 `ui-consistency.test.tsx` w jobie `test`: landing vs sidebar, wspólny `<Logo/>`). Pixel-level (`toHaveScreenshot`) pokryłby drift renderu (rozmiar/kolor wspólnego `<Logo/>`), ale:
- baseline jest platform-zależny (CI Linux ≠ lokalny Windows) → osobny job z baseline generowanym w CI;
- sensowny **dopiero po** powstaniu wspólnego `<Logo/>` (strumień B) — wcześniej nie ma czego pinować.
- **Rekomendacja:** dołożyć job `visual-regression` po strumieniu B, baseline w CI, scope: logo (landing+dashboard) + sidebar. Do tego czasu strukturalny gate Z4 wystarcza dla klasy błędu.

## 6. Ryzyka / zależności (do potwierdzenia przez Ethana)

- **R1 — role RLS w CI-Postgresie — ZWERYFIKOWANE, NIE jest blokerem.** Z3 (i każdy test dotykający `withTenantContext`) robi `SET LOCAL ROLE app_student`. Potwierdzone w kodzie: migracja `0008_faculty_tenant_and_rls.sql` tworzy `app_student`/`app_faculty` (idempotentnie, `IF NOT EXISTS`) + `GRANT app_student TO CURRENT_USER`; `0011_app_runtime_role.sql` tworzy `app_runtime`. Job `integration` uruchamia `db:migrate` (wszystkie migracje) → role powstają, a `test` (user CI) jest ich członkiem → `SET ROLE` działa. **Z3 wjedzie do `integration` bez dodatkowego kroku setupu.** Precheck w Z3 (review Leo N2) i tak wyłapie ewentualny brak głośno.
- **R2 — zimny start serwera w e2e (dev/turbopack).** W weryfikacji Z5 pierwszy uwierzytelniony hit `/dashboard` cold-kompilował ~10 s i łamał `waitForURL(20s)` (flak). Dla jobów B/C rekomendacja: `next build && next start` zamiast `next dev` — brak zimnej kompilacji, deterministyczniej.
- **R3 — bramy `it.fails` muszą wjechać RAZEM z naprawami.** Z2/Z3/Z4 są zielone DZIŚ (charakteryzacja + `it.fails`). Po naprawie strumieni `it.fails` flipnie na czerwono → plik testu i fix wchodzą jednym PR-em, inaczej CI czerwone. To dyscyplina merge, nie konfiguracja CI.

## 7. Rekomendowana kolejność (priorytet QA, decyzja Ethana)

1. **`e2e-safe`** — najtaniej, natychmiast domyka publiczny front + bramkę auth.
2. **`e2e-dbwrite`** — domyka segment ścieżki #1 bez AI + B1/dashboard/marketplace; ustal `next start` (R2).
3. **Decyzja `e2e-llm`** (opcja 1/2/3) — domknięcie ścieżki #1 end-to-end; przed Betą opcja 1.
4. **R1** — potwierdzić role w CI-Postgresie (warunek wjazdu Z3).
5. **`visual-regression`** — po strumieniu B (wspólny `<Logo/>`).

## 8. Decyzje do podjęcia (Ethan)

- [ ] Czy `e2e-safe` + `e2e-dbwrite` wchodzą do bramki (blok merge) teraz?
- [ ] Topologia serwera w e2e: `next dev` vs `next build && next start` (R2)?
- [ ] `e2e-llm`: opcja 1 (per-PR z kluczem) / 2 (nocny) / 3 (akceptacja luki)? Klucz jako GitHub secret?
- [x] R1: role RLS w CI — **zweryfikowane, `db:migrate` je tworzy (0008/0011), bez dodatkowego kroku.**
- [ ] `visual-regression`: po strumieniu B — akceptacja kierunku?

---

*Po decyzji Ethana: implementację jobów (`pr.yml`) prowadzi Engineering (Leo/Ethan), Quinn dostarcza komendy/scenariusze i weryfikuje, że joby realnie blokują (nie tylko deklarują). Zmiana `pr.yml` na main = czerwona linia (auto-deploy nie, ale brama jakości — sign-off w PR).*
