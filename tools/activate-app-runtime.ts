import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL not set");
	process.exit(1);
}
const ownerUrl: string = process.env.DATABASE_URL;

// Generuje hasło na żądanie LUB używa ustawionego (gdy ten skrypt
// uruchamiany jest powtórnie z pre-istniejącym hasłem do regeneracji
// DATABASE_URL_RUNTIME bez nowego ALTER ROLE).
const password = process.env.APP_RUNTIME_PASSWORD ?? randomBytes(32).toString("base64url");
const useExisting = !!process.env.APP_RUNTIME_PASSWORD;

async function main() {
	// 1. Połącz się jako owner i zrób ALTER ROLE (lub CREATE jeśli z jakiegoś
	// powodu brakuje). Idempotentne.
	const ownerPool = new Pool({ connectionString: ownerUrl });
	const ownerClient = await ownerPool.connect();
	try {
		const existing = await ownerClient.query(
			`SELECT rolname FROM pg_roles WHERE rolname = 'app_runtime'`,
		);
		if (existing.rowCount === 0) {
			console.log("⚠️  app_runtime nie istnieje — CREATE (migracja 0011 nieaplikowana?)");
			await ownerClient.query(`CREATE ROLE app_runtime LOGIN NOBYPASSRLS PASSWORD $1`, [password]);
			await ownerClient.query("GRANT app_student TO app_runtime");
			await ownerClient.query("GRANT app_faculty TO app_runtime");
			await ownerClient.query("GRANT USAGE ON SCHEMA public TO app_runtime");
		} else if (useExisting) {
			console.log("ℹ️  Re-using APP_RUNTIME_PASSWORD env (nie zmieniam roli)");
		} else {
			console.log("✅ app_runtime istnieje — ALTER ROLE LOGIN + PASSWORD");
			// pg.escapeIdentifier byłby idealny, ale password musi iść jako literal w SQL;
			// używamy parametryzowanej formy + pg-format-style nie ma. Próbujemy w sposób
			// natywny: ALTER ROLE nie wspiera $1 dla PASSWORD (PG parser). Generujemy
			// pojedynczy string przez `quote_literal`.
			const safePwd = await ownerClient.query(`SELECT quote_literal($1::text) AS q`, [password]);
			const literal = safePwd.rows[0].q;
			await ownerClient.query(`ALTER ROLE app_runtime LOGIN PASSWORD ${literal}`);
		}

		// 2. Verify
		const verify = await ownerClient.query(
			`SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime'`,
		);
		const row = verify.rows[0];
		const ok = row.rolcanlogin === true && row.rolbypassrls === false;
		console.log(
			`Verify: rolcanlogin=${row.rolcanlogin}, rolbypassrls=${row.rolbypassrls} → ${ok ? "✅ OK" : "❌ WRONG"}`,
		);
		if (!ok) {
			console.error("Spodziewane: rolcanlogin=true, rolbypassrls=false");
			process.exit(1);
		}
	} finally {
		ownerClient.release();
		await ownerPool.end();
	}

	// 3. Zbuduj DATABASE_URL_RUNTIME przez podmianę user+password
	const u = new URL(ownerUrl);
	u.username = "app_runtime";
	u.password = password;
	const runtimeUrl = u.toString();

	// 4. Smoke test nowego URL — login + simple query
	console.log("\n4. Smoke test app_runtime connection...");
	const runtimePool = new Pool({ connectionString: runtimeUrl });
	try {
		const rc = await runtimePool.connect();
		try {
			const me = await rc.query(`SELECT current_user, current_database()`);
			console.log("  Connected as:", me.rows[0]);

			// app_runtime nie ma SELECT bez SET LOCAL ROLE (bezpośrednio = deny)
			// ale `current_user` zawsze jest dozwolony.
			// Test: SET LOCAL ROLE app_student + SELECT students → expect: deny-default
			// (bez current_user_id ustawionego).
			await rc.query("BEGIN");
			await rc.query("SET LOCAL ROLE app_student");
			const denyRes = await rc.query(`SELECT COUNT(*)::int AS c FROM students`);
			await rc.query("ROLLBACK");
			console.log(
				`  Cross-role test: app_runtime → SET LOCAL ROLE app_student → SELECT students (bez current_user_id) = ${denyRes.rows[0].c} wierszy`,
			);
			if (denyRes.rows[0].c !== 0) {
				console.error("  ❌ Spodziewane 0 wierszy (FORCE RLS + deny-default)");
				process.exit(1);
			}
			console.log("  ✅ FORCE + deny-default działa pod app_runtime");
		} finally {
			rc.release();
		}
	} finally {
		await runtimePool.end();
	}

	// 5. Print final connection string (do skopiowania do Vercel)
	console.log("\n=== DATABASE_URL_RUNTIME (do Vercel env Production + Preview) ===");
	console.log(runtimeUrl);
	console.log("\n=== Hasło app_runtime (do 1Password — kategoria 'SkillBridge prod') ===");
	console.log(password);
	console.log("\nNastępne kroki:");
	console.log("1. Skopiuj DATABASE_URL_RUNTIME do Vercel Dashboard → skill-bridge-ai →");
	console.log("   Settings → Environment Variables → Add New → Production + Preview");
	console.log("2. Vercel Dashboard → Deployments → najnowszy production → ⋯ → Redeploy");
	console.log("3. Powiedz mi 'gotowe' — zrobię smoke przez Vercel MCP");
}

main().catch((err) => {
	console.error("ERROR:", err.message);
	if (err.code) console.error("CODE:", err.code);
	process.exit(1);
});
