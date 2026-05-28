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
if (!process.env.DATABASE_URL_RUNTIME && process.env.NODE_ENV !== "test") {
	// Tylko w runtime (nie w testach unit, które nie łączą się z bazą).
	// W teście env jest placeholderem; ostrzeżenie spamowałoby output bez wartości.
	console.warn(
		"[db] DATABASE_URL_RUNTIME nieustawione — withTenantContext fallbackuje na DATABASE_URL (owner). " +
			"§8 #1 Phase 2 (ops): ALTER ROLE app_runtime LOGIN PASSWORD '<gen>' + ustaw DATABASE_URL_RUNTIME.",
	);
}
export const dbRuntime = drizzle(runtimeUrl, { schema });
