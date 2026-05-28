# Runbook: K3 Phase 2 prod migration (sub-issue #19a + #5 + #7)

**Cel:** Wdrożyć na prod migracje `0010` + `0011` + `0012`, aktywować rolę `app_runtime` (LOGIN + password) i podpiąć `DATABASE_URL_RUNTIME` w Vercel. Po zakończeniu issue #19 ZAMKNIĘTY.

**Wersja:** v0.1 · 2026-05-28
**Owner ops:** Darek (admin Neon + Vercel)
**Powiązane:** `docs/security/rls-matrix.md` v0.9 §8 #1 Phase 2 · ADR-005 · `docs/runbooks/k3-prod-migration.md` (Phase 1 — Beta v0.1)

> ⚠️ **Czerwona linia:** prod DB = preview DB (memory `preview-shares-prod-db`). Tej procedury **nie wykonuj na preview** spodziewając się że to dev — to jest produkcja.

---

## 0. Pre-flight (Neon snapshot — czerwona linia)

W Neon console (`console.neon.tech`), projekt SkillBridge_AI, gałąź `main` (`br-proud-sun-al3aezrj`):

1. **Branches → main → Create branch** → nazwa: `prod-backup-pre-phase2-2026-05-28`
2. Notuj branch ID (do rollbacku w razie problemu)

Snapshot ma zająć ~10s. Bez niego nie ruszaj dalej.

---

## 1. Pull DATABASE_URL z Vercel

W terminalu w katalogu repo:

```bash
# Jednorazowo, jeśli Vercel CLI nie zainstalowane:
npm i -g vercel

# Pull env do .env.local (już zlinkowane przez .vercel/project.json):
vercel env pull .env.local --environment=production
```

Weryfikacja (komenda nie loguje URL):

```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('DATABASE_URL set:', !!process.env.DATABASE_URL)"
```

Oczekiwane: `DATABASE_URL set: true`.

---

## 2. pnpm db:migrate na prod

```bash
pnpm db:migrate
```

Aplikuje:
- `0010_audit_log_truncate_protection.sql` (TRUNCATE trigger + REVOKE)
- `0011_app_runtime_role.sql` (rola `app_runtime` NOLOGIN/NOBYPASSRLS)
- `0012_force_rls.sql` (FORCE RLS na 6 tabelach + `owner_passthrough` policy)

Oczekiwane: bez błędów, 3 migracje zaaplikowane. Jeśli błąd na 0012 i tabele zostały w stanie pośrednim — patrz **sekcja 6 rollback**.

---

## 3. k3-validate na prod (gate 10/10)

```bash
pnpm tsx tools/k3-validate.ts
```

Oczekiwane wyjście (kolejność dokładnie):

```
✅ PASS  1. tenants zaseedowane (3)
✅ PASS  2. role app_student/app_faculty
✅ PASS  3. RLS włączony (6 tenant + audit_log + faculty_sessions)
✅ PASS  4. students: 0 NULL tenant_id   (×6)
✅ PASS  5. student widzi tylko swój wiersz students
✅ PASS  6. faculty (wsb-merito-szczecin) widzi tylko swój tenant
✅ PASS  6b. faculty NIE widzi drugiego tenanta
✅ PASS  7. audit_log UPDATE odrzucone (append-only)
✅ PASS  7. audit_log DELETE odrzucone (append-only)
✅ PASS  8. audit_log TRUNCATE odrzucone (statement trigger)
✅ PASS  9a. rola app_runtime istnieje
✅ PASS  9b. app_runtime NOBYPASSRLS
✅ PASS  9c. app_runtime członek app_student + app_faculty
✅ PASS  10a. FORCE RLS na 6 tabelach studenta
✅ PASS  10b. owner_passthrough policy na 6 tabelach
✅ PASS  10c. app_student bez app.current_user_id = deny-default (0 wierszy)

✅ K3 WALIDACJA ZIELONA
```

**Czerwona linia:** jeśli choć jeden FAIL — **nie idziesz dalej**, rollback wg sekcji 6.

---

## 4. Neon: ALTER ROLE app_runtime LOGIN

W Neon SQL Editor (projekt SkillBridge_AI, gałąź `main`):

```sql
ALTER ROLE app_runtime LOGIN PASSWORD '<PASSWORD-Z-CHATU-LUB-WYGENERUJ-NOWE>';

-- Weryfikacja:
SELECT rolname, rolcanlogin, rolbypassrls
  FROM pg_roles
 WHERE rolname = 'app_runtime';
-- Oczekiwane: app_runtime | t | f
```

**Zapisz hasło w 1Password/Bitwarden** (kategoria „SkillBridge prod — app_runtime DB"). Hasło to **NIE** ląduje w git ani w żadnym pliku w repo.

> **Hasło wygenerować lokalnie** (NIE commitować do gita): `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` — 256-bit base64url. Po wygenerowaniu wklej w SQL powyżej (zastąp `<PASSWORD-Z-CHATU-LUB-WYGENERUJ-NOWE>`) i jednocześnie zapisz w 1Password przed wciśnięciem Run.

---

## 5. Vercel: DATABASE_URL_RUNTIME

### 5a. Skonstruuj URL

Weź wartość `DATABASE_URL` z `.env.local` (krok 1). Wygląda mniej więcej tak:

```
postgresql://neondb_owner:<old-password>@ep-<id>.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Zbuduj `DATABASE_URL_RUNTIME` przez podmianę `<user>:<password>` (host + db + sslmode bez zmian):

```
postgresql://app_runtime:<PASSWORD-Z-CHATU-LUB-WYGENERUJ-NOWE>@ep-<id>.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 5b. Dodaj do Vercel — DWA środowiska

**Vercel Dashboard → skill-bridge-ai → Settings → Environment Variables:**

1. **Add New** → Key: `DATABASE_URL_RUNTIME`, Value: <URL z 5a>, Environments: **Production** ✓ + **Preview** ✓
2. Encrypt: domyślnie tak (`Sensitive`).

**ALBO przez CLI:**

```bash
# Production
echo "<URL z 5a>" | vercel env add DATABASE_URL_RUNTIME production
# Preview
echo "<URL z 5a>" | vercel env add DATABASE_URL_RUNTIME preview
```

### 5c. Weryfikacja

```bash
vercel env ls | grep DATABASE_URL_RUNTIME
```

Oczekiwane: 2 wpisy (Production + Preview), Encrypted = Yes.

---

## 6. Redeploy production

Env zostały odświeżone, ale istniejący deployment trzyma starą wersję (bez `DATABASE_URL_RUNTIME` przy boot). Redeploy:

```bash
# CLI:
vercel deploy --prod --yes

# albo Dashboard: skill-bridge-ai → Deployments → najnowszy main → ⋯ → Redeploy
```

Po deploy (~2 min) sprawdź logi cold-startu:

```bash
vercel logs --since=5m | grep "DATABASE_URL_RUNTIME"
```

**Oczekiwane:** brak warningu `[db] DATABASE_URL_RUNTIME nieustawione`. Jeśli widać — env nie dotarł, sprawdź krok 5c i redeploy.

---

## 7. Smoke prod (full end-to-end)

### 7a. Public + login

- https://skill-bridge-ai-seven.vercel.app — odpowiada 200, landing się ładuje
- /login → wpisz konto demo (lub własne) → dashboard ładuje się 200
- /dashboard → 4 kafelki widoczne (Skill Map, Gap Analysis, Projekty, Paszport)

### 7b. Trasy studenta (RLS warstwy 2 teraz aktywna)

Każda powinna zwrócić 200 z poprawnymi danymi (nie 0 wierszy, nie 500):

- /skill-map — graf się renderuje
- /gap-analysis — lista luk
- /projects — katalog
- /passport — paszport własny

Jeśli któraś zwraca 0 wierszy / 500 — znaczy że refactor #19b…#19g nie objął tej ścieżki (lub jest bug w `withTenantContext`). Sprawdź logi runtime per request.

### 7c. Rotacja share_token (§8 #5)

- /passport → **Udostępnij publicznie** → kopiuj link → zapisz token `A`
- /passport → **Wyłącz udostępnianie** → toast „link unieważniony na stałe"
- Otwórz token `A` w incognito → 404 (link rzeczywiście unieważniony)
- /passport → **Udostępnij publicznie** → kopiuj link → token `B`
- Porównaj: `A ≠ B`. Bingo, rotacja działa.

### 7d. Vercel runtime logs — czysto

```bash
vercel logs --since=10m | grep -iE "error|warn"
```

Oczekiwane: brak errorów RLS (`permission denied for table`, `0 wierszy` na ścieżce studenta, `deny-default`).

---

## 8. Po sukcesie

1. **Zamknij issue #19** + sub-issue #25 (#19a, ops):
   ```bash
   gh issue close 25 --reason completed --comment "Ops aktywacja zakończona — runbook k3-prod-migration-phase2.md kroki 1-7 zielone."
   gh issue close 19 --reason completed --comment "Wszystkie sub-issues (Phase 1 + Phase 2 #19a..#19i) zamknięte. RLS Phase 2 aktywny na prod."
   ```

2. **Update memory** `k3-migrations-not-on-prod-db.md`: dopisz „2026-05-28: Phase 2 (0010-0012) ZAAPLIKOWANE na prod main; app_runtime LOGIN aktywne; DATABASE_URL_RUNTIME ustawione; smoke 7a-d zielony; issue #19 ZAMKNIĘTY."

3. **Zaktualizuj `rls-matrix.md` v0.9 → v0.10** statusem „§8 #1 ZAMKNIĘTE w całości" (PR doc-only).

---

## 6. Rollback (jeśli coś poszło źle)

### Migracja 0012 (FORCE) wybuchła

```sql
-- W Neon SQL Editor:
ALTER TABLE students             NO FORCE ROW LEVEL SECURITY;
ALTER TABLE competencies         NO FORCE ROW LEVEL SECURITY;
ALTER TABLE gaps                 NO FORCE ROW LEVEL SECURITY;
ALTER TABLE skill_maps           NO FORCE ROW LEVEL SECURITY;
ALTER TABLE passports            NO FORCE ROW LEVEL SECURITY;
ALTER TABLE project_submissions  NO FORCE ROW LEVEL SECURITY;

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['students','competencies','gaps','skill_maps','passports','project_submissions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON %I', tbl);
  END LOOP;
END $$;
```

Stan: jak po 0011 (rola istnieje, ale bez FORCE i bez owner_passthrough). `k3-validate` test 10 będzie FAIL ale 1..9 OK.

### Migracja 0011 (rola) wybuchła

```sql
REVOKE app_student, app_faculty FROM app_runtime;
REVOKE USAGE ON SCHEMA public FROM app_runtime;
DROP ROLE app_runtime;
```

Stan: jak po 0010. `k3-validate` test 9 będzie FAIL.

### Migracja 0010 (TRUNCATE) wybuchła

```sql
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
```

(REVOKE TRUNCATE to no-op rollback — role nigdy tego nie miały.)

### Pełny rollback do stanu pre-Phase-2

W Neon console: **Branches → restore main from `prod-backup-pre-phase2-2026-05-28`**. Dane wracają do stanu przed krokiem 2. Kod na main jest stabilny (fallback dbRuntime → owner), więc app działa.

### DATABASE_URL_RUNTIME wybuchł (np. nieprawidłowy URL → trasy studenta 500)

W Vercel Dashboard: usuń `DATABASE_URL_RUNTIME` env z Production + Preview, redeploy. `dbRuntime` wraca do fallbacku owner, semantyka identyczna z pre-Phase-2-runtime.

---

## Self-critique

1. **„Vercel CLI musi być zainstalowane"** — to wymaganie zewnętrzne, ale memory `preview-shares-prod-db` i runbook Phase 1 też go zakładają. Nie ma sensu duplikować ścieżki bez CLI.
2. **Hasło `app_runtime` w runbooku** — wygenerowane przez `randomBytes(32)`, użyte raz, do wklejenia w Neon i Vercel. Po użyciu zostaje wyłącznie w menedżerze haseł Darka i w Neon/Vercel. **Nie commituj tego runbooka z hasłem** — usuń hasło przed merge PR-a.
3. **Kolejność 4→5→6 niezamienna** — gdyby Vercel env był ustawiony przed ALTER ROLE w Neon, runtime próbowałby login jako `app_runtime` z `NOLOGIN` → cold start crash → wszystkie trasy 500. Sekwencja DB → Vercel env → redeploy jest jedyna bezpieczna.
4. **Smoke 7b każdej trasy** — bo refaktorów było 6, każda mogła wprowadzić regres. Jeśli smoke wykryje regres, refactor per route ułatwia bisect (PR #35..#40 każdy 1 trasa).
5. **Rollback FORCE nie wymaga backupu DB** — operacje są reversible (ALTER NO FORCE + DROP POLICY). Backup ma sens dla schemy/danych, nie dla FORCE-flag. To zysk wybranej opcji (b) z ADR-005.
