# Sign-off domeny 8 — SkillBridge Beta v0.1

**Wystawił:** Ryan (CRCO nordsignal) · **Data:** 2026-05-27
**Werdykt:** **GO** dla PR #18 `feat/k3-rls-multitenancy` (K3 + RLS + paszport publiczny).
**Pełny audyt:** `nordsignal-operating-system` → `docs/audyty/2026-05-27-beta-v01-signoff-domena8-ryan.md`.

Sign-off zamyka bramkę G6 / domenę 8 dla bety multi-tenant. Wystawiony po weryfikacji kodu gałęzi (nie streszczenia): migracje `0008` (RLS) / `0009` (share token), endpointy paszportu, `tools/k3-validate.ts`.

## Zakres oceny i werdykty

- **Izolacja tenantów (RLS).** Wzorzec `ENABLE` RLS (nie `FORCE`) + role `app_student`/`app_faculty` + `SET LOCAL ROLE` w runtime; polityki z `WITH CHECK`, bezpieczny default (brak kontekstu → 0 wierszy), `audit_log` append-only triggerem. Zwalidowane na dev Neon (`k3-validate.ts`: role, RLS enabled, izolacja student/faculty, append-only). **OK.**
- **RLS na Better Auth (`user`/`session`/`account`/`verification`).** `ENABLE` bez polityki app-rolowej → właściciel (Better Auth) omija RLS, logowanie nietknięte; role aplikacji bez grantu/polityki = deny-client. Potwierdzone empirycznie smoke'iem logowania na preview Vercel. **OK.**
- **B1 — paszport publiczny (RODO).** Domyślnie niepubliczny; dostęp tylko po niezgadywalnym `share_token` + opt-in studenta; odwoływalny; audytowany; pola zminimalizowane. Zgoda **poinformowana i wersjonowana** (`PASSPORT_SHARE_CONSENT_VERSION`); strona `noindex` + metadane bez PII. **OK.**

## Warunki wyjściowe — domknięte
- A1 zgoda poinformowana — commit `bd39efc`.
- A2 noindex + metadane bez PII — commit `6f5dd2e`.
- B1 smoke logowania na preview po RLS — potwierdzenie Darka 2026-05-27.

## Ogon niezablokujący
- `docs/security/rls-matrix.md` → bump v0.3 (Ethan): pogodzić zapis (`FORCE`, `0007`) z wdrożeniem (`ENABLE`, `0008`).
- Faculty UPDATE: izolacja kolumnowa stoi na warstwie aplikacji, nie na bazie (dług nazwany, ADR-003 OK).

Sekwencja migracji na prod pozostaje czerwoną linią (Plan Mode + sign-off Darka) — niezależną od tego sign-offu.