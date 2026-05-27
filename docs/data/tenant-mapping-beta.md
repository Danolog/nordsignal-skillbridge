# Mapowanie tenantów — backfill `students.university` → `tenant_id` (Beta v0.1)

**Wersja:** v0.2 · 2026-05-26
**Owner:** Ethan (CTO)
**Status:** Projekt — wejście do migracji `0006_tenant_id` (ADR-001 sekcja 4.2). **Gate ZAMKNIĘTY:** 2 design partnerzy potwierdzeni (Sophia 2026-05-25) — WSB Merito Szczecin + Warszawa.

**Changelog v0.1 → v0.2 (2026-05-26):** (1) **Renumeracja** (drop micro-courses zajął `0004`): `tenants` = `0005` (było 0004), `tenant_id`+backfill = `0006` (było 0005), `SET NOT NULL` = `0006b` (było 0005b). (2) Partnerzy **potwierdzeni** — Szczecin + Warszawa, TBD usunięte (sekcja 3). Self-critique poniżej = zapis rozumowania v0.1, świadomie nietknięty.
**Wejście:** `src/lib/db/seed.ts` (15 demo studentów, 11 kampusów) · `rls-matrix.md` (tabele z `tenant_id`) · odpowiedź #2 Ethana na pytanie Leo (Z1): dwustopniowy backfill + sieroty → `__unmapped` z RLS deny · ADR-001 ryzyko rezydualne (free-form `university`).

**Żargon:** *backfill* = wypełnienie nowej kolumny danymi w istniejących wierszach. *slug* = krótki, stały identyfikator tekstowy (np. `wsb-merito-warszawa`). *sierota* = wiersz, którego nie da się dopasować do żadnego tenanta. *normalizacja* = sprowadzenie tekstu do postaci porównywalnej (małe litery, bez ogonków, bez zbędnych spacji).

---

## 1. Problem

`students.university` to **free-form text** (`schema.ts`) — student wpisuje dowolnie. Migracja `0006` dodaje `tenant_id` i musi przypisać każdy istniejący wiersz do uczelni. Bez mapy backfill albo zostawi `NULL` (blokuje `NOT NULL`), albo przypisze błędnie (wyciek między uczelniami). Multi-tenancy bez czystego backfillu = K3 „naprawiony" pozornie.

**Stan danych dziś (demo seed):** 15 studentów, 11 kampusów WSB Merito. Wartości dokładne (case-sensitive, z ogonkami):

`WSB Merito Warszawa` ×2 · `WSB Merito Gdańsk` · `WSB Merito Łódź` · `WSB Merito Kraków` ×2 · `WSB Merito Wrocław` ×2 · `WSB Merito Poznań` ×2 · `WSB Merito Toruń` · `WSB Merito Szczecin` · `WSB Merito Opole` · `WSB Merito Bydgoszcz` · `WSB Merito Lublin`

---

## 2. Decyzja: kampus = tenant (nie „WSB Merito" jako jeden)

WSB Merito to sieć — można potraktować jako **jeden** tenant (z kampusami jako pod-jednostki) albo **każdy kampus = osobny tenant**. Wybieramy **kampus = tenant**, bo:

- Izolacja faculty musi działać per kampus: opiekun z Warszawy **nie** powinien widzieć studentów z Gdańska (inna jednostka, inni opiekunowie). Jeden tenant „WSB Merito" złamałby to.
- Design partnerzy Bety to 2 konkretne kampusy, nie cała sieć.
- Finezja (campus → tenant) jest bezpieczniejsza; zgrubienie (sieć → tenant) trudno odkręcić po wpuszczeniu danych.

**Alternatywa odrzucona:** „WSB Merito = 1 tenant + `campus` jako kolumna" — prostsze, ale miesza dwie uczelnie-jednostki w jeden worek RLS; gdy dojdzie partner spoza Merito, model i tak wymusi campus=tenant. Robimy to od razu.

---

## 3. Kanoniczne tenanty Bety (seed `tenants`, migracja `0005`)

Beta v0.1 = **2 design partnerzy potwierdzeni** (Sophia 2026-05-25, `docs/product/design-partners-beta-v0.1.md`):

| slug (kanon) | name | status |
|---|---|---|
| `wsb-merito-szczecin` | WSB Merito Szczecin | ✅ potwierdzony |
| `wsb-merito-warszawa` | WSB Merito Warszawa | ✅ potwierdzony |
| `__unmapped` | (parking sierot) | seed systemowy, RLS deny |

Pozostałe kampusy WSB Merito (sekcja 4) → `__unmapped`, dopóki nie staną się partnerami.

---

## 4. Tabela mapowania (free-form → slug)

Dopasowanie po **normalizacji** (sekcja 5). Tylko 2 kampusy-partnerzy są aktywne w Becie; pozostałe demo-stringi → `__unmapped` (parking, RLS deny — sekcja 6).

| Free-form `university` (znormalizowany klucz) | Tenant slug | Aktywny w Becie? |
|---|---|---|
| `wsb merito szczecin` | `wsb-merito-szczecin` | ✅ partner |
| `wsb merito warszawa` | `wsb-merito-warszawa` | ✅ partner |
| `wsb merito wroclaw` | `wsb-merito-wroclaw` | → `__unmapped` |
| `wsb merito gdansk` | `wsb-merito-gdansk` | → `__unmapped` |
| `wsb merito lodz` | `wsb-merito-lodz` | → `__unmapped` |
| `wsb merito krakow` | `wsb-merito-krakow` | → `__unmapped` |
| `wsb merito poznan` | `wsb-merito-poznan` | → `__unmapped` |
| `wsb merito torun` | `wsb-merito-torun` | → `__unmapped` |
| `wsb merito opole` | `wsb-merito-opole` | → `__unmapped` |
| `wsb merito bydgoszcz` | `wsb-merito-bydgoszcz` | → `__unmapped` |
| `wsb merito lublin` | `wsb-merito-lublin` | → `__unmapped` |
| *(cokolwiek innego)* | `__unmapped` | nie |

**Decyzja dot. demo (Sophia, potwierdzona):** **reseed demo do 2 kampusów-partnerów** (Szczecin + Warszawa) przed Betą zamiast parkować 9 kampusów w `__unmapped` — kryteria: ≥6 studentów/tenant, ≥3 różne `careerGoal` (faculty dashboard ukrywa się przy <3 studentach). Dziś demo: Szczecin=1, Warszawa=2 → reseed konieczny (zadanie Leo, warstwa 4). Mapa działa w obu wariantach.

---

## 5. Reguła normalizacji (deterministyczna)

Klucz dopasowania = `university` po: `trim` → małe litery → usunięcie ogonków (ł→l, ą→a, ę→e, ó→o, ż/ź→z, ś→s, ć→c, ń→n) → zwinięcie wielokrotnych spacji do jednej. Match dokładny na znormalizowanym kluczu (nie „zawiera", żeby nie scalać „Kraków" z „Akademia Krakowska"). Tabela kluczy w migracji jako stała.

---

## 6. Sieroty → `__unmapped` (RLS deny)

Każdy wiersz bez dopasowania (literówka, kampus spoza partnerów, nowa uczelnia) trafia do tenanta `__unmapped` (seed w `0005`). Polityka RLS `__unmapped`: **deny dla studenta i faculty** — wiersz istnieje, ale nikt go nie widzi przez aplikację, dopóki człowiek nie zmapuje ręcznie. To fail-closed: błąd mapowania = brak dostępu, nie cross-tenant leak. Wpis do `audit_log` przy trafieniu do `__unmapped` (sygnał do ręcznej korekty).

---

## 7. Dwustopniowy backfill (bezpieczny `NOT NULL`)

Per odpowiedź #2 Ethana dla Leo — nie da się dodać `NOT NULL` w jednym kroku bez ryzyka wywrócenia migracji na sierotach:

1. **`0006_tenant_id`** — `ADD COLUMN tenant_id uuid REFERENCES tenants(id)` (**nullable**) na 6 tabelach (`rls-matrix.md` sekcja 3). Backfill: `UPDATE` po znormalizowanym kluczu z tabeli mapowania; brak dopasowania → `__unmapped`. Tabele dziecięce (`competencies`/`gaps`/`skill_maps`/`passports`/`project_submissions`) dziedziczą `tenant_id` po `students` (join na `student_id`).
2. **Walidacja** — `SELECT count(*) WHERE tenant_id IS NULL` musi = 0 (wszystko trafiło gdzieś, choćby `__unmapped`).
3. **`0006b_tenant_id_not_null`** — `SET NOT NULL` dopiero po zielonej walidacji.

Sekcja `-- ROLLBACK:` w obu migracjach (wymóg domeny 3): `0006b` → `DROP NOT NULL`; `0006` → `DROP COLUMN tenant_id`.

---

## 8. Proces dla nowych uczelni (po Becie — ryzyko rezydualne ADR-001)

Beta = ręczna lista 2 partnerów. Każda nowa uczelnia po Becie **nie może** polegać na ręcznym dopisaniu do tej tabeli — to nie skaluje. Po Becie: onboarding uczelni wybiera tenant z **listy rozwijanej** (nie free-form), `students.university` staje się FK do `tenants` zamiast tekstu. To zamyka źródło problemu (free-form), nie tylko skutek. Migracja `university text` → `tenant_id`-only — Faza 2.

---

## Definition of Done

- ☐ `tenants` seedowane (`0005`) z 2 partnerami (Szczecin + Warszawa) + `__unmapped`.
- ☐ Backfill `0006`: 0 wierszy z `tenant_id IS NULL` po migracji (walidacja w teście migracji).
- ☐ Test: każdy znormalizowany klucz z tabeli 4 mapuje się deterministycznie do oczekiwanego slug-a.
- ☐ Test: string spoza tabeli → `__unmapped` + wpis `audit_log`.
- ☐ `0006b SET NOT NULL` przechodzi tylko po zielonej walidacji kroku 2.
- ☐ Sekcje `-- ROLLBACK:` w `0006` i `0006b`.

---

## Self-critique

Rola: principal engineer po nocnym incydencie cross-tenant. Pięć słabości i poprawki przed oddaniem:

1. **Pokusa zgadnięcia 2 partnerów, żeby „domknąć".** → Zostawione jako TBD z jawnym gate (Sophia T4); mechanizm działa niezależnie od tożsamości partnerów. Zgadywanie partnerów = decyzja produktowa nie moja (CLAUDE.md sekcja 6).
2. **`NOT NULL` w jednym kroku wywróciłby migrację na sierotach.** → Rozbite na `0005` (nullable + backfill) → walidacja → `0005b` (`NOT NULL`). Dokładnie odpowiedź #2 dla Leo.
3. **Dopasowanie „zawiera" scalałoby różne uczelnie.** → Match dokładny na znormalizowanym kluczu, nie substring; uzasadnienie przy regule (sekcja 5).
4. **Sieroty mogły dostać domyślny tenant = cichy cross-tenant leak.** → `__unmapped` z RLS **deny** (fail-closed) + audit log, nie „przypisz do pierwszego z brzegu".
5. **Mapa leczyłaby skutek (free-form), nie źródło.** → Sekcja 8: po Becie `university` → FK do `tenants` z listy, koniec free-form. Dług nazwany z progiem spłaty (Faza 2).

Porównanie z golden-adr: decyzja (kampus=tenant) wyprowadzona z wymogu izolacji faculty, alternatywa odrzucona z argumentem, backfill domknięty walidacją i testem, fail-closed na sierotach, źródło problemu adresowane osobno od skutku. Gotowe jako wejście do `0004`/`0005`/`0005b` — po potwierdzeniu 2 partnerów.
