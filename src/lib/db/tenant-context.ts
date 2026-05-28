import { sql } from "drizzle-orm";
import { dbRuntime } from "@/lib/db";

/**
 * K3 multi-tenancy — warstwa 1 egzekucji izolacji (ADR-003 sekcja 4.2).
 *
 * Każde zapytanie request-runtime na danych studenta MUSI iść przez
 * withTenantContext. Helper:
 *   1. otwiera transakcję na `dbRuntime` (§8 #1 Phase 1, migracja 0011) —
 *      gdy ops aktywuje DATABASE_URL_RUNTIME, baza połączenia = app_runtime
 *      (NOBYPASSRLS). Dopóki nie — fallback na DATABASE_URL (owner). W obu
 *      przypadkach SET LOCAL ROLE przełącza efektywną rolę → RLS egzekwuje.
 *   2. ustawia kontekst RLS (app.current_user_id / app.current_tenant_id) przez
 *      set_config(..., true) = transaction-local,
 *   3. przełącza na rolę nie-właścicielską (app_student / app_faculty) przez
 *      SET LOCAL ROLE — dzięki temu polityki RLS (warstwa 2) faktycznie działają
 *      (owner neondb_owner bypassuje RLS jako nie-FORCE; runtime po SET ROLE
 *      pracuje jako app_*, podlega RLS).
 *
 * Warstwa 1 (WHERE w aplikacji) zostaje obowiązkiem wywołującego: zapytania na
 * tabelach z tenant_id dokładają `where(eq(table.tenantId, ctx.tenantId))`.
 * RLS (warstwa 2) to siatka, gdy WHERE zawiedzie; lint (warstwa 3, Leo Z7) i
 * test cross-tenant (warstwa 4) pilnują obu. Patrz docs/security/rls-matrix.md.
 */

export type TenantRole = "student" | "faculty";

export type TenantContext = {
	/** Better Auth user id (text) — podmiot polityk student_sees_own. Pusty dla faculty. */
	userId: string;
	/** uuid tenanta (kampusu) — podmiot polityk faculty_sees_tenant. */
	tenantId: string;
	role: TenantRole;
};

// Whitelist ról PG — NIE z inputu użytkownika (SET LOCAL ROLE nie parametryzuje się).
const PG_ROLE: Record<TenantRole, string> = {
	student: "app_student",
	faculty: "app_faculty",
};

type Tx = Parameters<Parameters<typeof dbRuntime.transaction>[0]>[0];

export async function withTenantContext<T>(
	ctx: TenantContext,
	fn: (tx: Tx) => Promise<T>,
): Promise<T> {
	const pgRole = PG_ROLE[ctx.role];
	return dbRuntime.transaction(async (tx) => {
		// Wartości przez set_config (parametryzowane — bezpieczne na injection).
		await tx.execute(sql`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`);
		await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId}, true)`);
		// Rola z zamkniętej whitelisty — literał, nie input.
		await tx.execute(sql.raw(`SET LOCAL ROLE ${pgRole}`));
		return fn(tx);
	});
}
