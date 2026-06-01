import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	const c = await pool.connect();
	try {
		// 1. Identyfikacja połączenia (NIE loguj DATABASE_URL — może mieć hasło)
		const id = await c.query(
			`SELECT current_user, current_database(), inet_server_addr() AS host, version() AS pg_ver`,
		);
		console.log("=== Connection identity ===");
		console.log(JSON.stringify(id.rows[0], null, 2));

		// 2. Wszystkie role z prefiksem app_ + neondb_owner + bieżący user
		const roles = await c.query(
			`SELECT rolname, rolcanlogin, rolbypassrls,
			        (SELECT count(*) FROM pg_auth_members m WHERE m.member = r.oid) AS group_count
			   FROM pg_roles r
			  WHERE rolname LIKE 'app_%' OR rolname = 'neondb_owner' OR rolname = current_user
			  ORDER BY rolname`,
		);
		console.log("\n=== Roles ===");
		console.table(roles.rows);

		// 3. Co konkretnie z wyświetlonych ról brakuje vs oczekiwane
		const expected = ["app_student", "app_faculty", "app_runtime"];
		const present = new Set(roles.rows.map((r: { rolname: string }) => r.rolname));
		const missing = expected.filter((r) => !present.has(r));
		console.log(`\nMissing roles: ${missing.length ? missing.join(", ") : "(none)"}`);

		// 4. Status migracji wg drizzle __drizzle_migrations
		try {
			const m = await c.query(
				`SELECT id, hash, created_at
				   FROM drizzle.__drizzle_migrations
				  ORDER BY id DESC
				  LIMIT 5`,
			);
			console.log("\n=== Last 5 migrations applied ===");
			console.table(m.rows);
		} catch (_err) {
			console.log("\n[no drizzle migrations table — fresh DB or different schema]");
		}

		// 5. Specifically check the role oracles in case the user has only ENABLE without app_runtime
		const has11Migration = await c.query(
			`SELECT 1 FROM pg_class WHERE relname = 'audit_log_no_truncate' AND relkind = 't'`,
		);
		const has12Force = await c.query(
			`SELECT COUNT(*)::int AS c
			   FROM pg_class
			  WHERE relname IN ('students','competencies','gaps','skill_maps','passports','project_submissions')
			    AND relforcerowsecurity = true`,
		);
		console.log("\n=== Migration markers ===");
		console.log(
			`0010 marker (audit_log_no_truncate trigger): ${has11Migration.rowCount ? "PRESENT" : "ABSENT"}`,
		);
		console.log(`0012 marker (FORCE on 6/6 tables): ${has12Force.rows[0].c}/6`);
	} finally {
		c.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("ERROR:", err.message);
	process.exit(1);
});
