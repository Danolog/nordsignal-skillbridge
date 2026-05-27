/**
 * K3 + RLS — skrypt walidacyjny (warstwa 4 ADR-003 / DoD rls-matrix.md).
 *
 * Uruchom NA GAŁĘZI DEV NEON (nie prod!) po `pnpm db:migrate` + `pnpm db:seed`:
 *   pnpm tsx tools/k3-validate.ts
 *
 * Łączy się jako właściciel (DATABASE_URL z .env.local) i sprawdza:
 *   1. tenants zaseedowane (2 partnerzy + __unmapped)
 *   2. role app_student / app_faculty istnieją
 *   3. RLS włączony na tabelach z danymi studenta + audit_log
 *   4. backfill: 0 wierszy tenant_id IS NULL
 *   5. izolacja STUDENTA: jako app_student widzi tylko swoje
 *   6. izolacja FACULTY: jako app_faculty widzi tylko swój tenant
 *   7. audit_log append-only: UPDATE/DELETE odrzucone
 *
 * Connection string NIE jest logowany. Wypisuje PASS/FAIL, kończy exit 1 przy błędzie.
 */
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
	console.log(`${ok ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
	if (!ok) failures++;
}

const TENANT_TABLES = [
	"students",
	"competencies",
	"gaps",
	"skill_maps",
	"passports",
	"project_submissions",
];

async function main() {
	const client = await pool.connect();
	try {
		// 1. tenants
		const t = await client.query(`SELECT slug FROM tenants WHERE slug = ANY($1)`, [
			["wsb-merito-szczecin", "wsb-merito-warszawa", "__unmapped"],
		]);
		check("1. tenants zaseedowane (3)", t.rowCount === 3, `znaleziono ${t.rowCount}/3`);

		// 2. role
		const r = await client.query(
			`SELECT rolname FROM pg_roles WHERE rolname IN ('app_student','app_faculty')`,
		);
		check("2. role app_student/app_faculty", r.rowCount === 2, `znaleziono ${r.rowCount}/2`);

		// 3. RLS włączony
		const rls = await client.query(
			`SELECT relname FROM pg_class
			 WHERE relname = ANY($1) AND relrowsecurity = true`,
			[[...TENANT_TABLES, "audit_log", "faculty_sessions"]],
		);
		check(
			"3. RLS włączony (6 tenant + audit_log + faculty_sessions)",
			rls.rowCount === 8,
			`włączony na ${rls.rowCount}/8`,
		);

		// 4. backfill — 0 NULL
		for (const tbl of TENANT_TABLES) {
			const n = await client.query(`SELECT count(*)::int AS c FROM ${tbl} WHERE tenant_id IS NULL`);
			check(`4. ${tbl}: 0 NULL tenant_id`, n.rows[0].c === 0, `${n.rows[0].c} NULL`);
		}

		// Próbki danych do testów izolacji
		const sample = await client.query(
			`SELECT s.user_id, s.tenant_id FROM students s ORDER BY s.created_at LIMIT 1`,
		);
		const tenantsTwo = await client.query(
			`SELECT id, slug FROM tenants WHERE slug IN ('wsb-merito-szczecin','wsb-merito-warszawa') ORDER BY slug`,
		);

		// 5. izolacja STUDENTA
		if (sample.rowCount === 0) {
			check("5. izolacja studenta", false, "brak studentów — uruchom pnpm db:seed");
		} else {
			const { user_id } = sample.rows[0];
			await client.query("BEGIN");
			await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [user_id]);
			await client.query("SET LOCAL ROLE app_student");
			const own = await client.query(`SELECT user_id FROM students`);
			await client.query("ROLLBACK");
			const onlyOwn = own.rowCount === 1 && own.rows[0].user_id === user_id;
			check(
				"5. student widzi tylko swój wiersz students",
				onlyOwn,
				`zwrócono ${own.rowCount} wierszy`,
			);
		}

		// 6. izolacja FACULTY
		if ((tenantsTwo.rowCount ?? 0) < 2) {
			check("6. izolacja faculty", false, "brak 2 tenantów-partnerów");
		} else {
			const [a, b] = tenantsTwo.rows;
			await client.query("BEGIN");
			await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [a.id]);
			await client.query("SET LOCAL ROLE app_faculty");
			const seen = await client.query(`SELECT DISTINCT tenant_id FROM students`);
			await client.query("ROLLBACK");
			const onlyTenantA =
				(seen.rowCount ?? 0) >= 1 && seen.rows.every((row) => row.tenant_id === a.id);
			check(
				`6. faculty (${a.slug}) widzi tylko swój tenant`,
				onlyTenantA,
				`tenanty w wyniku: ${seen.rows.map((x) => x.tenant_id).join(", ") || "brak"}`,
			);
			check(
				"6b. faculty NIE widzi drugiego tenanta",
				!seen.rows.some((row) => row.tenant_id === b.id),
			);
		}

		// 7. audit_log append-only
		for (const op of ["UPDATE", "DELETE"] as const) {
			await client.query("BEGIN");
			// Wiersz-próbka, żeby trigger FOR EACH ROW miał na czym zadziałać — na pustym
			// audit_log UPDATE/DELETE WHERE true nie odpala triggera → fałszywy FAIL.
			// Rolowane razem z resztą (ROLLBACK), więc nie zostaje w bazie.
			await client.query(
				`INSERT INTO audit_log (actor_type, action) VALUES ('system', 'k3-validate-probe')`,
			);
			let blocked = false;
			try {
				if (op === "UPDATE") {
					await client.query(`UPDATE audit_log SET action = 'tamper' WHERE true`);
				} else {
					await client.query(`DELETE FROM audit_log WHERE true`);
				}
			} catch {
				blocked = true;
			}
			await client.query("ROLLBACK");
			check(`7. audit_log ${op} odrzucone (append-only)`, blocked);
		}
	} finally {
		client.release();
		await pool.end();
	}

	console.log(`\n${failures === 0 ? "✅ K3 WALIDACJA ZIELONA" : `❌ ${failures} FAIL`}`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error("Błąd walidacji:", err.message);
	process.exit(1);
});
