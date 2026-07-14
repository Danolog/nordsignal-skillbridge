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
| `/pomocnik-kariery` | `flow` | **Krok 0 onboardingu** (decyzja Darka 2026-06-03, plan §1 pkt 2; strumień E / #5). Pomocnik wpięty jako Krok 0 wizarda (`onboarding-wizard.tsx` renderuje `CareerHelperFlow` w trybie embedded). Trasa `/pomocnik-kariery` zostaje jako osobne wejście standalone dla już-onboardowanego studenta. Brak kafelka w sidebarze (decyzja IA: nie w Becie — spec §6). |
| `/projects/[id]` | `child` | detal z `/projects` |
| `/curriculum` | `flow` | **1E.6a** — kafelek „Ścieżka nauki" na pulpicie (`dashboard-hub.tsx`), widoczny WYŁĄCZNIE przy fladze `FLAG_CURRICULUM_PATH` (deploy ≠ release). Flaga off → trasa zwraca 404. Brak pozycji w sidebarze, dopóki pilotaż DS jest za flagą. |
| `/curriculum/[moduleId]` | `child` | widok modułu z drabiny `/curriculum` |
| `/curriculum/[moduleId]/[itemId]` | `child` | widok pozycji z widoku modułu |

## Reguła osiągalności (egzekwowana testem)

Każda trasa `(dashboard)` MUSI być osiągalna:
- `nav` → obecna w sidebarze;
- `flow` → zalinkowana/wbudowana w swoje wejście (np. wizard onboardingu odwołuje się do trasy/komponentu);
- `child` → ma rodzica `nav`/`flow`.

Trasa, która istnieje w plikach, ale nie spełnia żadnego z powyższych = **sierota** (błąd #5).
`/pomocnik-kariery` **NIE jest już sierotą** — strumień E (#5) wpiął go jako Krok 0 wizarda
onboardingu (`career-helper` w `onboarding-wizard.tsx`); brama `it.fails` w teście zdjęta (flip).
