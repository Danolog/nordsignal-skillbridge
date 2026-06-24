# Dependabot — odłożone bumpy (ticket roboczy)

**Data:** 2026-06-24 · **Owner:** Ethan (CTO) / Engineering · **Status:** OTWARTE (do osobnych PR-ów)
**Kontekst:** sesja sprzątania długu technicznego 2026-06-23/24. Domknięte: #69 (deps-scan: vitest 4.1.9 + override vite/hono/undici), #5/#65 (akcje CI), #70 (wyłączenie preview-deployów Vercel dla `dependabot/*`), #71 (Next 16.2.9, zastąpił #11). Poniższe bumpy **wstrzymane** — każdy łamie build i wymaga ręcznej poprawki kodu/configu, nie samego scalenia. Diagnozy z logów CI (Ethan).

> Linear nie był wpięty w sesji — to zastępczy ślad audytowy. Po wpięciu Linear: przenieść jako osobne zgłoszenia (team App_build), zlinkować PR-y.

---

## #10 — lucide-react 0.575 → 1.17 (major) — OTWARTY
- **Objaw:** build + test + typecheck **czerwone**.
- **Korzeń:** lucide 1.x usunął ikonę `Github` z eksportów → `has no exported member 'Github'`. Kod importuje ją w kilku miejscach.
- **Fix:** podmienić nazwę ikony w kodzie (nowa nazwa wg changelog lucide 1.x), potem rebase gałęzi #10 na main i zielone CI.

## #63 — production-minor-patch (grupa, 16 update'ów) — samozamknięty przez Dependabota 2026-06-24
- **Objaw:** build **czerwony** (test/typecheck zielone).
- **Korzeń:** niespójność rodziny `better-auth` — grupa podbija do 1.6.20, ale `@better-auth/core` przypięty na 1.6.9 → brak eksportów `isSafeUrlScheme`/`toKebabCase` → webpack fail. Winny **jeden pakiet z 16**.
- **Fix (gdy Dependabot zaproponuje świeży):** doszczelnić `@better-auth/core` do 1.6.20 (lub wyłączyć better-auth z grupy). Pozostałe 15 update'ów prawdopodobnie niewinne.

## #66 — development (grupa, 13 update'ów) — samozamknięty przez Dependabota 2026-06-24
- **Objaw:** wszystko **czerwone** (kaskada, joby dzielą środowisko).
- **Korzeń:** bump `@biomejs/biome` 2.2 → 2.5 zaostrzył reguły lintera → **455 błędów a11y** na plikach-makietach w `.agents/designs/` (nie w kodzie produkcyjnym). Współwinni: TypeScript ^6 + @types/node ^26 (majory).
- **Fix (gdy Dependabot zaproponuje świeży):** dostosować config biome lub wykluczyć `.agents/designs/` z lintu (to makiety, nie kod aplikacji); majory TS/@types rozdzielić od grupy.

---

**Uwaga:** #63 i #66 Dependabot samozamknął 2026-06-24, gdy main ruszył do przodu (zaproponuje świeże grupy w następnym cyklu). Diagnozy powyżej zostają ważne dla nowych PR-ów.

**Rekomendacja kolejności (gdy wrócą):** #63 (jeden pin) → #66 (config biome) → #10 (zmiana w kodzie). Każdy osobnym PR-em, merge = sign-off Darka.
