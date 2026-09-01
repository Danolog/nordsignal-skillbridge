import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Owner connection — DATABASE_URL (neondb_owner, bypassuje non-FORCE RLS).
 * Używana przez:
 *  - migracje (drizzle-kit migrate, drizzle-kit push)
 *  - seed (src/lib/db/seed.ts)
 *  - Better Auth adapter (server-side, własna ścieżka, ENABLE RLS na user/session)
 *  - panel faculty/admin do agregacji (dziś, do czasu przepięcia na dbRuntime)
 *
 * NIE używać bezpośrednio w API request paths danych studenta — RLS się nie
 * egzekwuje. Zamiast tego: `withTenantContext(...)` (który używa dbRuntime).
 */
export const db = drizzle(process.env.DATABASE_URL ?? "", { schema });

/**
 * Runtime connection — DATABASE_URL_RUNTIME (rola `app_runtime`, NOBYPASSRLS).
 *
 * §8 #1 Phase 1 (rls-matrix.md, migracja 0011): connection string dla
 * request-runtime, który NIE jest właścicielem bazy. Każde zapytanie pod tym
 * połączeniem podlega RLS — nawet gdy ktoś zapomni `SET LOCAL ROLE`, polityki
 * `app_student`/`app_faculty` wymagają `app.current_user_id`/`current_tenant_id`
 * → bez tych ustawień zwracają 0 wierszy (deny-default).
 *
 * Wykorzystanie:
 *  - `withTenantContext(...)` (`src/lib/db/tenant-context.ts`) — używa
 *    `dbRuntime` przy każdym `db.transaction(...)`. Ustawia `SET LOCAL ROLE`
 *    i `set_config` per żądanie.
 *
 * Fallback do `DATABASE_URL` (ten sam owner):
 *  - Dziś, dopóki ops nie aktywuje LOGIN dla `app_runtime` + nie ustawi
 *    `DATABASE_URL_RUNTIME` w Vercel, używamy ownera. `withTenantContext` i tak
 *    egzekwuje RLS przez `SET LOCAL ROLE app_student/app_faculty` (membership
 *    z migracji 0011), więc semantyka się nie zmienia — fallback to "samo
 *    okablowanie", bez zmiany security posture do czasu Phase 2 (ops step).
 *  - Warning na konsoli żeby było widać w logach dev/preview, że runtime
 *    siedzi na owner connection (przyciąga uwagę do dokończenia §8 #1).
 *
 * NIE używać tego klienta bezpośrednio w handlerach — zawsze przez
 * `withTenantContext`, żeby kontekst RLS był ustawiony przed pierwszym
 * zapytaniem.
 */
const runtimeUrl = process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL ?? "";

/**
 * D3 (fala 1) — BRAK `DATABASE_URL_RUNTIME` ZATRZYMUJE START NA PRODUKCJI.
 *
 * Do 2026-09-02 ten sam warunek wypisywał wyłącznie `console.warn` i szedł
 * dalej. Skutek był taki, że brak zmiennej na produkcji nie zatrzymywał
 * niczego: `dbRuntime` cicho spadał na `DATABASE_URL`, czyli na rolę
 * WŁAŚCICIELA bazy — tę, która omija izolację wierszy (RLS) wszędzie tam,
 * gdzie nie stoi FORCE. Ostrzeżenie w dzienniku nie jest bezpiecznikiem:
 * czyta je człowiek, który już i tak wie, że czegoś szuka. To ta sama
 * rodzina awarii co strażnik-atrapa — mechanizm dawał sygnał, nie robiąc
 * tego, co miał robić.
 *
 * REGUŁA: na produkcji brak zmiennej jest błędem startu, nie ostrzeżeniem.
 *
 * WYJĄTEK: FAZA BUDOWANIA (`next build`) — i skąd się wziął.
 * `next build` ustawia `NODE_ENV=production` i ewaluuje ten moduł (156 plików
 * w `src/` importuje `@/lib/db`). Job `build` w `.github/workflows/pr.yml`
 * podaje wyłącznie placeholder `DATABASE_URL` — `DATABASE_URL_RUNTIME` tam
 * nie istnieje. Bez tego wyjątku każde zgłoszenie miałoby czerwoną bramkę
 * `build`. Pomiar (2026-09-01, `pnpm build` z env jobu `build`, sonda w tym
 * pliku, 14 wywołań):
 *   {"NODE_ENV":"production","NEXT_PHASE":"phase-production-build",
 *    "NEXT_RUNTIME":"nodejs","hasRuntimeUrl":false}
 * Wyjątek jest wąski (dokładnie ta jedna wartość `NEXT_PHASE`) i na
 * produkcji BEZCZYNNY: w środowisku Production zmienna istnieje (pomiar
 * `vercel env ls production`, 2026-09-01: `DATABASE_URL_RUNTIME`,
 * Production + Preview), więc warunek `!DATABASE_URL_RUNTIME` tam nie zachodzi
 * ani przy budowaniu, ani przy obsłudze żądań. W czasie budowania żadne
 * żądanie użytkownika nie jest obsługiwane.
 */
export const KOMUNIKAT_BRAK_DSN_RUNTIME =
	"[db] DATABASE_URL_RUNTIME nieustawione na produkcji — start przerwany. " +
	"Bez tej zmiennej `withTenantContext` połączyłby się rolą WŁAŚCICIELA bazy " +
	"(omija RLS poza tabelami z FORCE). Napraw: §8 #1 Phase 2 — aktywuj rolę " +
	"`app_runtime` (LOGIN + hasło) i ustaw `DATABASE_URL_RUNTIME` w środowisku " +
	"(runbook: docs/runbooks/k3-prod-migration-phase2.md).";

if (!process.env.DATABASE_URL_RUNTIME) {
	const produkcja = process.env.NODE_ENV === "production";
	const fazaBudowania = process.env.NEXT_PHASE === "phase-production-build";
	if (produkcja && !fazaBudowania) {
		throw new Error(KOMUNIKAT_BRAK_DSN_RUNTIME);
	}
	if (process.env.NODE_ENV !== "test") {
		// Poza produkcją (dev/preview lokalny) oraz w fazie budowania zostaje
		// ostrzeżenie — tam fallback na ownera jest świadomym stanem Fazy 1.
		// W teście env jest placeholderem; ostrzeżenie spamowałoby output.
		console.warn(
			"[db] DATABASE_URL_RUNTIME nieustawione — withTenantContext fallbackuje na DATABASE_URL (owner). " +
				"§8 #1 Phase 2 (ops): ALTER ROLE app_runtime LOGIN PASSWORD '<gen>' + ustaw DATABASE_URL_RUNTIME.",
		);
	}
}
export const dbRuntime = drizzle(runtimeUrl, { schema });
