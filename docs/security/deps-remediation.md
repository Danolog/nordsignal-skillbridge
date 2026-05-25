# Ticket — remediacja zależności (deps-scan → wymagany przed prod)

**Status:** Otwarty · **Utworzony:** 2026-05-25 (Leo, w ramach domknięcia Z2/K4 CI)
**Owner techniczny:** Leo + Ethan · **Sign-off bezpieczeństwa:** Ryan (domena 8)
**Powiązane:** ADR-001 §4.1 (K4 CI), `.github/workflows/pr.yml` job `deps-scan`, `docs/security/beta-v01-signoff.md` (bramka go-live Tydz. 4)

---

## 1. Kontekst

Job CI `deps-scan` (`pnpm audit --audit-level high`) jest **świadomie poza wymaganymi statusami branch protection** (report-only) do czasu remediacji. Pierwszy przebieg (2026-05-25): **94 podatności — 5 low, 57 moderate, 32 high**. Dopóki świeci czerwono, nie może blokować PR-ów (inaczej cały refaktor Bety, w tym Z3/Z4, stoi). Ten ticket prowadzi do zazielenienia i **dorzucenia `deps-scan` do wymaganych przed produkcją** (warunek go-live, ADR-001 §7 #5).

## 2. Root-cause headline — `samlify` (SAML) przez nieużywany SSO

Zweryfikowane (`pnpm why samlify`, grep importów):

```
@better-auth/infra 0.1.8  ← UŻYWANY (import { dash } w src/lib/auth/server.ts)
└─ @better-auth/sso 1.6.9  ← NIEużywany (zero importu SSO/SAML w src/)
   └─ samlify 2.10.2        ← podatny (<2.13.0, GHSA-34r5-q4jw-r36m, priv-esc w SAML)
```

- Auth Beta = Better Auth + Google OAuth + e-mail; pluginy `[nextCookies(), dash()]`. **SAML/SSO nie jest używany** (`grep -rniE "sso|saml" src/` = pusto poza nazwami sesji).
- `@better-auth/infra` **musi zostać** (dostarcza `dash`) → nie usuwamy pakietu; `samlify` przychodzi tylko przez jego nieaktywną gałąź.

## 3. Proponowana remediacja

### Krok 1 — quick win: override `samlify` (zdejmuje klaster SAML high)
W `package.json`:
```json
"pnpm": {
  "overrides": {
    "samlify": ">=2.13.0"
  }
}
```
- `@better-auth/sso` deklaruje `samlify@2.10.2`, ale **nie jest importowany w runtime** → wymuszenie 2.13.0 nie ma jak zepsuć działającego kodu (gałąź martwa). Ryzyko niskie.
- Po `pnpm install` zweryfikować: `pnpm typecheck` + `pnpm test:run` zielone (auth/`dash` nietknięte), `pnpm build` przechodzi.

### Krok 2 — triaż pozostałych 31 high
- `pnpm audit --audit-level high --json` → pełna lista. Dla każdego: produkcyjny vs dev-only, używana vs martwa ścieżka.
- Dev-only / martwe ścieżki → override lub akceptacja z uzasadnieniem. Produkcyjne używane → upgrade.
- **NIE** maskować `pnpm audit --no-...` ani nie zdejmować `--audit-level high`.

### Krok 3 — domknięcie bramki (zapadka)
- Gdy `pnpm audit --audit-level high` → 0 high: dorzucić `deps-scan (pnpm audit)` do wymaganych statusów branch protection (analogicznie do lint/typecheck 2026-05-25).
- Opcjonalnie: `continue-on-error: true` zdjąć (job staje się twardo blokujący).

## 4. Sign-off Ryana (domena 8)

- **Interim (Beta, pre-launch):** akceptacja `deps-scan` jako report-only — czy posturа OK do czasu remediacji? (pre-prod, 2 design partnerów, brak realnego PII).
- **Residual:** po Krokach 1–2 — przegląd pozostałości (zaakceptowane high z uzasadnieniem) → wpis do `docs/security/beta-v01-signoff.md`.
- **Trigger twardy:** `deps-scan` blokujący **przed deployem prod** (go-live, ADR-001 §7 #5).

## 5. Definition of Done

- [ ] Override `samlify ≥ 2.13.0` + `pnpm install` + zielone typecheck/test/build (PR).
- [ ] Triaż 31 pozostałych high — każde sklasyfikowane (upgrade / override / zaakceptowane z uzasadnieniem).
- [ ] `pnpm audit --audit-level high` → 0 high (lub jawna lista wyjątków podpisana przez Ryana).
- [ ] `deps-scan` dorzucony do wymaganych statusów branch protection.
- [ ] Sign-off Ryana w `docs/security/beta-v01-signoff.md`.
