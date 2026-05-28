import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, dbRuntime } from "@/lib/db";

/**
 * TEMP debug endpoint — REMOVE PO DIAGNOZIE.
 *
 * Cel: zobaczyć dokładnie który host w DATABASE_URL_RUNTIME nie resolve'uje
 * z Vercel Lambda. Po naprawieniu env (PR usuwający ten endpoint).
 *
 * Bezpieczeństwo: hasło nigdy nie ląduje w response. Tylko host + nazwa db
 * + status zaszłej query. Auth nie jest wymagana (chcemy łatwo zdebugować).
 * Endpoint usuwany IMMEDIATELY po naprawieniu — nie pozostaje w prod.
 */
function maskHost(connStr: string | undefined): string {
	if (!connStr) return "<unset>";
	try {
		const u = new URL(connStr);
		return `${u.username}@${u.hostname}/${u.pathname.slice(1)}`;
	} catch {
		return "<invalid URL>";
	}
}

export async function GET() {
	const dbUrl = process.env.DATABASE_URL;
	const runtimeUrl = process.env.DATABASE_URL_RUNTIME;

	const result: Record<string, unknown> = {
		ownerHost: maskHost(dbUrl),
		runtimeHost: maskHost(runtimeUrl),
		runtimeEnvSet: !!runtimeUrl,
		fallbackToOwner: !runtimeUrl,
	};

	// Test 1: owner db (powinno działać)
	try {
		const r = await db.execute(sql`SELECT current_user AS u, 1 AS test`);
		result.ownerDbOk = true;
		result.ownerCurrentUser = (r.rows as Array<{ u: string }>)[0]?.u;
	} catch (err) {
		result.ownerDbOk = false;
		result.ownerDbErr = err instanceof Error ? err.message : String(err);
	}

	// Test 2: dbRuntime (to powinno failować jeśli DATABASE_URL_RUNTIME bad)
	try {
		const r = await dbRuntime.execute(sql`SELECT current_user AS u, 1 AS test`);
		result.dbRuntimeOk = true;
		result.runtimeCurrentUser = (r.rows as Array<{ u: string }>)[0]?.u;
	} catch (err) {
		result.dbRuntimeOk = false;
		result.dbRuntimeErr = err instanceof Error ? err.message : String(err);
	}

	return NextResponse.json(result);
}
