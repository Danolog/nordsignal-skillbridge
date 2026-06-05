# ROUTES.md — mapa tras panelu studenta (status nawigacyjny)

**Artefakt standardu QA** (skills/qa/SKILL.md §2, błąd #5). Kanoniczna mapa tras grupy
`src/app/(dashboard)` z **intencjonalnym statusem nawigacyjnym**. Egzekwowana wykonywalnie
przez `src/components/dashboard/__tests__/ui-consistency.test.tsx` — ten plik to dokumentacja
dla ludzi; test jest bramą. Jeśli dodajesz/usuwasz trasę albo zmieniasz sidebar, zaktualizuj
OBA: ten plik i mapę `EXPECTED_ROUTES` w teście (test pilnuje, że się nie rozjadą z rzeczywistością).

**Status:**
- `nav` — pozycja sidebara (`src/components/dashboard/sidebar.tsx`). Musi być w nawigacji.
- `flow` — trasa osiągana z przepływu (nie pozycja sidebara), z udokumentowanym wejściem.
- `child` — trasa-dziecko (dynamiczny segment), osiągana z rodzica; nie pozycja sidebara.

| Trasa | Status | Wejście / uwaga |
|---|---|---|
| `/dashboard` | `nav` | sidebar |
| `/skill-map` | `nav` | sidebar |
| `/gap-analysis` | `nav` | sidebar |
| `/projects` | `nav` | sidebar |
| `/moja-droga` | `nav` | sidebar |
| `/passport` | `nav` | sidebar |
| `/profil` | `nav` | sidebar |
| `/onboarding` | `flow` | CTA landingu „Stwórz swój Paszport" (`src/app/page.tsx`) |
| `/pomocnik-kariery` | `flow` | **DOCELOWO: Krok 0 onboardingu** (decyzja Darka 2026-06-03, plan §1 pkt 2). **DZIŚ NIEOSIĄGALNY** — błąd #5: trasa działa, ale nie ma jej ani w sidebarze, ani w przepływie onboardingu (commit ukrycia `bbe4571`). Naprawa = wpięcie w wizard onboardingu. |
| `/projects/[id]` | `child` | detal z `/projects` |

## Reguła osiągalności (egzekwowana testem)

Każda trasa `(dashboard)` MUSI być osiągalna:
- `nav` → obecna w sidebarze;
- `flow` → zalinkowana/wbudowana w swoje wejście (np. wizard onboardingu odwołuje się do trasy/komponentu);
- `child` → ma rodzica `nav`/`flow`.

Trasa, która istnieje w plikach, ale nie spełnia żadnego z powyższych = **sierota** (błąd #5).
`/pomocnik-kariery` jest dziś sierotą — bramę `it.fails` w teście zdejmuje strumień, który wepnie
go w Krok 0 onboardingu.
