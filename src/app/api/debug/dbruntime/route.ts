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

function inspect(connStr: string | undefined): Record<string, unknown> {
	if (!connStr) return { set: false };
	// Hasło w base64url-charset: [A-Za-z0-9_-]. Pokaż prefix (protokół + user + @)
	// i suffix (host + db + params) — bez ujawniania hasła.
	const len = connStr.length;
	const charCodes: number[] = [];
	for (let i = 0; i < Math.min(5, len); i++) charCodes.push(connStr.charCodeAt(i));
	for (let i = Math.max(0, len - 5); i < len; i++) charCodes.push(connStr.charCodeAt(i));
	const colonIdx = connStr.indexOf(":");
	const atIdx = connStr.indexOf("@");
	return {
		set: true,
		length: len,
		startsWithPostgresql: connStr.startsWith("postgresql://"),
		hasProtocolSeparator: connStr.includes("://"),
		hasAt: atIdx >= 0,
		// Prefix: do ":" PO username (np. "postgresql://app_runtime:")
		prefix: colonIdx > 0 ? connStr.slice(0, colonIdx + 1) : "<no colon>",
		// Suffix: od "@" (host + db + params, bez password)
		suffix: atIdx > 0 ? connStr.slice(atIdx) : "<no @>",
		// Pierwsze i ostatnie 5 znaków jako char codes (do wykrycia whitespace/BOM)
		firstAndLastCharCodes: charCodes,
		// Czy są podejrzane znaki kontrolne na końcach
		hasTrailingWhitespace: /\s$/.test(connStr),
		hasLeadingWhitespace: /^\s/.test(connStr),
	};
}

export async function GET() {
	const dbUrl = process.env.DATABASE_URL;
	const runtimeUrl = process.env.DATABASE_URL_RUNTIME;

	const result: Record<string, unknown> = {
		ownerHost: maskHost(dbUrl),
		runtimeHost: maskHost(runtimeUrl),
		runtimeEnvSet: !!runtimeUrl,
		fallbackToOwner: !runtimeUrl,
		runtimeInspect: inspect(runtimeUrl),
		ownerInspect: inspect(dbUrl),
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
