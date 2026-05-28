# Sign-off danych — careerGoal / tenant (Beta v0.1, DoD §4)

**Wystawił:** Claude (analiza danych seed + mapowania) · **Data:** 2026-05-27
**Werdykt:** **GO** — reseed demo do 2 kampusów-partnerów spełnia DoD §4 z `docs/data/tenant-mapping-beta.md`.
**Kontekst:** migracje `0005`–`0009` zaaplikowane na prod `main` 2026-05-27; Beta wydana (PR #18 → `main`). Ten sign-off zamyka gate danych/produktu (§4a runbooka), niezależny od sign-offu bezpieczeństwa Ryana (domena 8).

## Kryteria (DoD §4, tenant-mapping-beta.md)
Reseed demo do 2 kampusów-partnerów (Szczecin + Warszawa) zamiast parkowania w `__unmapped`. Progi produktowe:
- **≥6 studentów / tenant** — poniżej faculty dashboard ukrywa heatmapę (martwy panel u partnera).
- **≥3 różne `careerGoal` / tenant** — sensowny rozkład rynku w heatmapie.

## Co zweryfikowano
Źródło prawdy: `src/lib/db/seed-students.ts` (`DEMO_STUDENTS` = 15 studentów, 5 ścieżek) + deterministyczne przypisanie `partnerTenantForIndex(i) = PARTNER_TENANTS[i % 2]` (round-robin), współdzielone przez `seed.ts` i guard test (nie kopia). To dokładnie ta logika, która zapisała wiersze do prod podczas reseedu.

**Rozkład po reseedzie (round-robin, parzyste → Szczecin, nieparzyste → Warszawa):**

| Tenant | Studentów | Rozkład careerGoal | Różnych careerGoal |
|---|---|---|---|
| `wsb-merito-szczecin` | **8** | Data Analyst ×2, Frontend ×1, Backend ×2, UX/UI ×1, Full-stack ×2 | **5** |
| `wsb-merito-warszawa` | **7** | Data Analyst ×1, Frontend ×2, Backend ×1, UX/UI ×2, Full-stack ×1 | **5** |

Oba progi spełnione z zapasem: 8 i 7 ≥ 6; 5 i 5 ≥ 3. Zero sierot w demo (15 = 8 + 7; nic do `__unmapped`).

**Guard CI:** `src/lib/db/__tests__/seed-tenants.test.ts` — 5/5 zielone (2026-05-27). Pilnuje dokładnie 2 tenantów, każdy student do partnera, ≥6/tenant, ≥3 careerGoal, determinizm round-robin. Edycja danych łamiąca próg = czerwony CI.

## Weryfikacja live prod — POTWIERDZONA ✅
Darek zalogował się 2026-05-27 na konta obu kampusów-partnerów (Szczecin + Warszawa) na prod — dane i izolacja wyglądają poprawnie, faculty dashboard żyje u obu partnerów. To domyka empiryczny ogon: kontrakt seed/guard zgadza się z zachowaniem produkcji.

## Ogon niezablokujący
- **Pole `university` ≠ tenant.** `DEMO_STUDENTS[].university` nadal nosi oryginalny kampus (np. „WSB Merito Gdańsk"), ale `tenant_id` jest nadawany round-robinem do 2 partnerów, nie przez mapę §4. Świadome — to demo, nie dane realnych studentów. Po Becie: `university` → FK do `tenants` z listy (tenant-mapping §8, Faza 2).
