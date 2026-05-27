# Runbook: Migracja produkcji — K3 (multitenancy + RLS)

> **Status:** PRZYGOTOWANY (backup + rehearsal zielone; gate danych §4a **rozwiązany** — reseed gotowy w kodzie, do uruchomienia na prod w ramach §7). **Wykonanie na prod = czerwona linia — wymaga jawnej zgody Darka.**
> **Data przygotowania:** 2026-05-27 · **Gałąź kodu:** `feat/k3-rls-multitenancy` (PR #18)

---

## 1. Kontekst
Kod na `feat/k3-rls-multitenancy` oczekuje kolumn `tenant_id`, tabeli `tenants` i RLS. Baza prod (`main`) ich nie ma → po wdrożeniu kodu trasy z danymi studenta zwracają **500** (`Failed query: select … from students` — potwierdzone w smoke 2026-05-27). Migracja prod musi poprzedzić (lub towarzyszyć) wdrożeniu kodu na produkcję.

## 2. Stan wyjściowy (zweryfikowany 2026-05-27, read-only)
- `main` = `br-proud-sun-al3aezrj`. Zaaplikowane migracje: **0000–0004**. `students.tenant_id` i `tenants` — **BRAK**.
- **Pending (5):** `0005_chilly_gamma_corps`, `0006_far_shaman`, `0007_tenant_id_not_null`, `0008_faculty_tenant_and_rls`, `0009_passport_share_token`.
- Wolumen danych prod: user 17, students 16, competencies 102, gaps 76, passports 16, project_submissions 1 → migracja szybka.

## 3. Backup — WYKONANY ✅
- Gałąź Neon **`prod-backup-pre-k3-2026-05-27`** (`br-shiny-truth-alid39qi`) — zero-kopiowy snapshot `main` z 2026-05-27 ~11:53Z. Punkt przywracania (patrz §8 Rollback).
- Opcjonalnie dodatkowy `pg_dump` tuż przed startem (§7a).

## 4. Rehearsal — WYKONANY, ZIELONY ✅
Migracja została **przećwiczona na identycznej kopii danych prod**:
- `preview-k3` (`br-bitter-sunset-al032p1c`) = `main` (stan 0004) + zaaplikowane `0005`–`0009`.
- `tools/k3-validate.ts` → **15/15**; dodatkowe testy izolacji RLS → **7/7**; aplikacja `/api/passport` → **404** (nie 500).
- Backfill `tenant_id` dał **0 NULL** na realnych 16 studentach → `0007` (SET NOT NULL) nie wywróci się na prod.
- Wniosek: ryzyko niskie — ta sama operacja na tych samych danych już przeszła.

## 4a. ✅ Gate danych — reseed do 2 kampusów-partnerów (ROZWIĄZANY)
**Problem (historyczny):** backfill `0006` mapuje `students.university` → tenant tylko dla 2 partnerów (`wsb-merito-szczecin`, `wsb-merito-warszawa`); reszta → `__unmapped` (RLS deny = niewidoczne). Stary seed (11 kampusów) dawał na `preview-k3` **12/16 studentów w `__unmapped`** + oba tenanty <3 (próg faculty dashboard).

**Rozwiązanie — commit `45c5b5d` (Leo), zatwierdzony review 2026-05-27 (Ethan):**
- `seed.ts` ustawia `university = partner.name` + `tenant_id` round-robin po 2 partnerach (`seed-students.ts: partnerTenantForIndex`). Dane spójne (university == tenant).
- Test `__tests__/seed-tenants.test.ts` pilnuje DoD §4 (dokładnie 2 partnerów, zero sierot w demo, ≥6/tenant, ≥3 careerGoal) — 5/5 zielone, na tej samej funkcji, której używa seed.
- **Zweryfikowane end-to-end na `preview-k3`** (`pnpm db:seed`): `__unmapped` = **0**, szczecin 9/6, warszawa 7/5, 0 niespójnych.

**Sposób na prod = wariant (a):** reseed prod (`pnpm db:seed`) **po** migracji `0005`–`0009` (seed wymaga `tenant_id`). Kroki w §7 (7d), weryfikacja w §8 (8c).

⚠️ **Uwaga z review (rezydua):** czyszczenie w `seed.ts` kasuje tylko **znane demo `user_id`** (+5 starych `demo-user-*`). Wiersze `students` o innym `user_id` (realne/testowe konta) **nie są sprzątane** i zachowują tenant z backfillu — mogą zostać w `__unmapped`. Dlatego §8 (8c) wymusza sprawdzenie `count(__unmapped) = 0` po reseedzie; jeśli >0 → ręczny remap lub usunięcie rezyduów.

Drobny dług (nie blokuje): pola `university` w `DEMO_STUDENTS` (11 kampusów) są martwe — `seed.ts:674` je nadpisuje `partner.name`. Do cleanupu (Leo).

## 5. Co robią migracje pending (orientacyjnie — zweryfikuj pliki w `drizzle/`)
| Migracja | Zakres |
|---|---|
| `0005_chilly_gamma_corps` | seed `tenants` (3: 2 partnerzy + `__unmapped`) + struktura |
| `0006_far_shaman` | dodaje `tenant_id` na tabelach danych studenta + backfill wg tenant-mapping |
| `0007_tenant_id_not_null` | `ALTER … tenant_id SET NOT NULL` |
| `0008_faculty_tenant_and_rls` | role `app_student`/`app_faculty`, GRANTy, `ENABLE RLS` (NIE FORCE), polityki, trigger append-only `audit_log` |
| `0009_passport_share_token` | `passports.public_enabled` default false + `share_token` unique (fix B1) |

> `0008` ENABLE (nie FORCE) RLS także na `user/session/account` (deny-client). Better Auth działa jako owner (bypass) — zweryfikowane: sign-up/login 200 na środowisku z tym schematem.

## 6. Pre-flight (go / no-go)
- [x] Backup branch istnieje
- [x] Rehearsal zielony
- [x] Sekrety zrotowane (2026-05-27)
- [x] Gate danych: reseed gotowy w kodzie (commit `45c5b5d`, §4a) — do uruchomienia na prod w §7 (7d)
- [ ] **Commit `45c5b5d` wypchnięty na origin** (był lokalny; SSH do GH wymaga naprawy — patrz §11)
- [ ] Ustalona **kolejność migracja vs merge** (patrz niżej)
- [ ] Okno ~5–10 min (DDL + role + RLS; krótka możliwa niedostępność zapisów)
- [ ] Brak równoległych deployów/migracji
- [ ] Potwierdzenie Darka na wykonanie

**Kolejność migracja vs merge do `main` (ważne):**
- Jeśli **najpierw merge** kodu do `main` → auto-deploy prod zacznie 500-ować do czasu migracji.
- **Zalecane: migracja prod NAJPIERW**, potem merge. Stary kod `main` jest kompatybilny wstecz z dodanymi kolumnami/RLS (nie używa `tenant_id`, owner bypassuje RLS), więc migracja przed mergem nie psuje obecnego prod. Minimalizuje okno.
- Alternatywa: jedno okno serwisowe na migrację + merge razem.

## 7. Wykonanie — WYMAGA JAWNEJ ZGODY (czerwona linia)
```
# 7a. (opcjonalny dodatkowy backup)
pg_dump "<main-DIRECT-connstring>" -Fc -f prod-pre-k3-2026-05-27.dump   # pg_dump 16+

# 7b. DIRECT connstring main (migracje przez direct, NIE pooled/pgbouncer)
#     neonctl connection-string main --project-id long-pond-11214233 \
#       --org-id org-snowy-credit-81923605 --role-name neondb_owner --database-name neondb

# 7c. uruchom migracje (z ustawionym DATABASE_URL = main direct)
pnpm db:migrate
#     oczekiwane: applies 0005–0009 → "migrations applied successfully!"

# 7d. reseed danych demo do 2 kampusów-partnerów (gate §4a; PO migracji — seed wymaga tenant_id)
#     UWAGA: pnpm db:seed kasuje i odtwarza dane demo (jobMarketData, tenants, students, projects).
pnpm db:seed
#     oczekiwane: "Seeded 15 demo students" + tenants (szczecin/warszawa/__unmapped)
```

## 8. Weryfikacja po migracji
```
# 8a. izolacja + struktura (DATABASE_URL = main direct)
pnpm tsx tools/k3-validate.ts          # oczekiwane: 15/15 ZIELONE, 0 NULL tenant_id

# 8b. smoke aplikacji prod (po deployu main): sign-up/login + GET /api/passport
#     oczekiwane: 200/404, NIE 500
```

## 9. Rollback
- **Opcja A (preferowana) — Neon restore:** przywróć `main` z `prod-backup-pre-k3-2026-05-27`.
  - Neon Console → Branches → `main` → Restore → źródło: `prod-backup-pre-k3-2026-05-27`
  - lub `neonctl branches restore main prod-backup-pre-k3-2026-05-27 --project-id long-pond-11214233 --org-id org-snowy-credit-81923605`
  - ⚠️ Nadpisuje bieżący `main` stanem z backupu — tracisz zapisy między backupem a rollbackiem (okno krótkie → ryzyko niskie).
- **Opcja B (chirurgiczna):** sekcja ROLLBACK z `0008` (DROP polityk/ról/trigger, DISABLE RLS, DROP `tenant_id`) + odwrotność `0009/0007/0006/0005`. Trudniejsze i podatne na błędy — preferuj A.

## 10. Po stabilizacji
- Backup branch zostaw min. kilka dni; potem usuń (oszczędność compute): `neonctl branches delete prod-backup-pre-k3-2026-05-27 …`.
- `preview-k3` zostaje jako środowisko preview gałęzi (branch-scoped `DATABASE_URL` w Vercelu).
- Rozważ utwardzenie po Becie: izolowana rola login nie-owner + `FORCE RLS` (dług z `0008`).
