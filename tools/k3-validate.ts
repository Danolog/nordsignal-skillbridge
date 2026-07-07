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
 *   8. audit_log TRUNCATE protection (§8 #4, migracja 0010): TRUNCATE odrzucone
 *   9. app_runtime role (§8 #1 Phase 1, migracja 0011): istnieje, NOBYPASSRLS,
 *      członek app_student + app_faculty
 *  10. FORCE RLS (§8 #1 Phase 2 / sub-issue #19h, migracja 0012, ADR-005):
 *      6 tabel studenta ma relforcerowsecurity=true; owner_passthrough policy
 *      istnieje na każdej; cross-role: app_runtime bez SET LOCAL ROLE = deny-default.
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
	// B5 — prywatne refleksje studenta (migracja 0015, K-PII+, deny-faculty)
	"project_reflections",
	// Redesign weryfikacji — decyzja człowieka o zgłoszeniu (migracja 0019).
	// Tenant-owa, FORCE RLS + owner_passthrough; grant tylko app_faculty
	// (SELECT+INSERT), polityki faculty_sees_tenant/faculty_moderates_tenant.
	"submission_reviews",
];

// Tabele K-PUB (katalog publiczny/referencyjny) — JAWNY WYJĄTEK RLS.
// Wymóg DoD: każda tabela bez RLS tenant-owej musi być tu z uzasadnieniem
// (rls-matrix §4). Tabele poniżej są globalnym katalogiem (nie danymi studenta)
// — brak właściciela tenant-owego → brak RLS tenant-owej jest poprawnym stanem.
// Kontrola: zapis tylko seed/system, brak endpointu zapisu klienta.
// Testy RLS (test #3, #10) celowo NIE weryfikują tych tabel — to prawidłowe.
//
// Ta lista NIE jest już martwa: test #13 (kompletność wyjątków) czyta ją i
// egzekwuje, że KAŻDA tabela `public` bez RLS jest albo tu, albo w TENANT_TABLES.
const K_PUB_TABLES = [
	"job_market_data", // dane rynku pracy, brak właściciela
	"projects", // katalog globalny; izolacja exclusivity w warstwie zapytań
	"project_competencies", // dziecko projects, te same prawa
	"project_sources", // konfiguracja źródeł, server-only
	// B3 — materiały edukacyjne projektu (migracja 0016, dziecko projects, K-PUB)
	"project_learning_resources",
	// #7 — linki źródła danych projektu (migracja 0018, dziecko projects, K-PUB).
	// 2–3 linki/projekt (odporność linków); te same prawa co project_learning_resources:
	// globalny katalog, brak właściciela tenant-owego, zapis tylko seed/system,
	// GRANT SELECT app_student/app_faculty. Uzasadnienie: rls-matrix §4.
	"project_source_links",
	// 1.0 — wersjonowany artefakt modelu kariery (migracja 0022, K-PUB).
	// Publiczna konfiguracja jak job_market_data (ten sam ETL ją produkuje):
	// brak właściciela tenant-owego, zapis tylko ingest/system
	// (tools/ingest-career-model.ts, owner), GRANT SELECT app_student/app_faculty.
	// Uzasadnienie: rls-matrix §4.
	"career_model_versions",
	// tenants — rejestr uczelni (slug/name). To rejestr najemców, nie dane
	// studenta; sam nie ma właściciela tenant-owego, więc brak RLS tenant-owej
	// jest poprawnym stanem (analogicznie do katalogu projects). Zapis tylko
	// seed/system (brak endpointu zapisu klienta), odczyt server-side (faculty
	// login lookup). Migracja 0005.
	"tenants",
	// AG.3 — kuchnia operacyjna miesięcznego odświeżania rynku (migracja 0023).
	// Obie tabele bez danych studenta/tenanta: staging to brudnopis przyszłego
	// job_market_data, runy to prowenicja przebiegów (md5, diff, artefakty).
	// ODWROTNIE niż pozostałe K-PUB: ZERO grantów dla app_student/app_faculty
	// (dostęp wyłącznie owner przez POST /api/market-refresh/ingest za flagą
	// + sekretem; strażnik grantów: test 13a niżej). Uzasadnienie: rls-matrix §4.
	"job_market_data_staging",
	"market_refresh_runs",
] as const;

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
			"3. RLS włączony (8 tenant + audit_log + faculty_sessions)",
			rls.rowCount === 10,
			`włączony na ${rls.rowCount}/10`,
		);

		// 13. KOMPLETNOŚĆ WYJĄTKÓW RLS (DoD domeny 8, rls-matrix §4; rekomendacja
		// Ethana wariant (a) — realny test zamiast martwej stałej K_PUB_TABLES).
		//
		// Inwariant: KAŻDA tabela bazowa w schemacie `public` bez `relrowsecurity=true`
		// musi być JAWNIE sklasyfikowana — albo w TENANT_TABLES (te i tak mają RLS),
		// albo w K_PUB_TABLES (jawny wyjątek z uzasadnieniem). Tabela `public` bez RLS
		// i spoza obu list → FAIL. Domyka lukę: nowa tabela bez RLS przechodziła dotąd
		// niezauważona, bo nic nie czytało K_PUB_TABLES.
		//
		// Zakres: `relkind='r'` (zwykłe tabele) w `public`. Tabela drizzle
		// `__drizzle_migrations` żyje w schemacie `drizzle` (nie `public`) — naturalnie
		// poza zakresem, bez specjalnego wykluczenia.
		{
			const allPublic = await client.query(
				`SELECT c.relname, c.relrowsecurity AS rls
				   FROM pg_class c
				   JOIN pg_namespace n ON c.relnamespace = n.oid
				  WHERE n.nspname = 'public' AND c.relkind = 'r'`,
			);
			const classified = new Set<string>([...TENANT_TABLES, ...K_PUB_TABLES]);
			const unaccounted = allPublic.rows
				.filter((r) => r.rls !== true && !classified.has(r.relname))
				.map((r) => r.relname)
				.sort();
			check(
				"13. kompletność wyjątków K-PUB — każda tabela public bez RLS jest sklasyfikowana",
				unaccounted.length === 0,
				unaccounted.length === 0
					? `wszystkie ${allPublic.rowCount} tabel public pokryte (RLS lub lista wyjątków)`
					: `tabela(e) bez RLS i NIE na liście wyjątków K-PUB: ${unaccounted.join(", ")} — ` +
							"dodaj do K_PUB_TABLES z uzasadnieniem (rls-matrix §4) albo włącz RLS",
			);
		}

		// 13a. AG.3 — tabele operacyjne odświeżania rynku SĄ K-PUB, ale ODWROTNIE
		// niż pozostałe wyjątki: role aplikacyjne nie mają na nich ŻADNYCH grantów
		// (deny-by-default jak 12a). Staging/runy to kuchnia operacyjna (diff, md5,
		// artefakty) — student/faculty nie mają czego tu czytać; dostęp tylko owner.
		{
			const r13a = await client.query(
				`SELECT count(*)::int AS c
				   FROM information_schema.role_table_grants
				  WHERE grantee IN ('app_student', 'app_faculty')
				    AND table_name IN ('job_market_data_staging', 'market_refresh_runs')`,
			);
			check(
				"13a. AG.3 — zero grantów app_student/app_faculty na staging/runy rynku",
				r13a.rows[0].c === 0,
				`znaleziono ${r13a.rows[0].c} grantów ról aplikacyjnych (oczekiwano 0)`,
			);
		}

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

		// 8. audit_log TRUNCATE protection (§8 #4, migracja 0010)
		// Trigger BEFORE TRUNCATE … FOR EACH STATEMENT odpala się też na pustej
		// tabeli (w przeciwieństwie do FOR EACH ROW dla UPDATE/DELETE) — więc bez
		// INSERT-próbki. Test wykonywany jako owner (najsilniejszy wektor, dziś
		// runtime łączy się jako owner do czasu §8 #1) — app-role i tak nie ma
		// TRUNCATE (REVOKE w 0010 jest defense-in-depth na wypadek przyszłego
		// "GRANT ALL").
		{
			await client.query("BEGIN");
			let blocked = false;
			try {
				await client.query(`TRUNCATE TABLE audit_log`);
			} catch {
				blocked = true;
			}
			await client.query("ROLLBACK");
			check("8. audit_log TRUNCATE odrzucone (statement trigger)", blocked);
		}

		// 9. app_runtime role (§8 #1 Phase 1, migracja 0011)
		// - istnieje
		// - NOBYPASSRLS (rolbypassrls = false)
		// - członek app_student i app_faculty (przez pg_auth_members)
		{
			const role = await client.query(
				`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime'`,
			);
			const exists = role.rowCount === 1;
			check("9a. rola app_runtime istnieje", exists);
			if (exists) {
				check("9b. app_runtime NOBYPASSRLS", role.rows[0].rolbypassrls === false);
			}
			const memberships = await client.query(
				`SELECT r.rolname AS group_role
				   FROM pg_auth_members m
				   JOIN pg_roles r ON m.roleid = r.oid
				   JOIN pg_roles m_role ON m.member = m_role.oid
				  WHERE m_role.rolname = 'app_runtime'
				    AND r.rolname IN ('app_student', 'app_faculty')`,
			);
			check(
				"9c. app_runtime członek app_student + app_faculty",
				memberships.rowCount === 2,
				`członek ${memberships.rowCount}/2 grup`,
			);
		}

		// 10. FORCE RLS (§8 #1 Phase 2 / sub-issue #19h, migracja 0012, ADR-005)
		// - relforcerowsecurity = true na 6 tabelach studenta (pg_class)
		// - owner_passthrough policy istnieje na każdej z 6 (pg_policies)
		// - cross-role test: pod SET LOCAL ROLE app_student BEZ app.current_user_id
		//   musi zwrócić 0 wierszy (deny-default). To dowód, że FORCE działa
		//   od strony app_runtime.
		{
			const forceTables = await client.query(
				`SELECT relname FROM pg_class
				 WHERE relname = ANY($1::text[]) AND relforcerowsecurity = true`,
				[TENANT_TABLES],
			);
			check(
				"10a. FORCE RLS na 8 tabelach tenant-owych",
				forceTables.rowCount === 8,
				`FORCE na ${forceTables.rowCount}/8`,
			);

			// Polityka idzie `TO <current_user>` (prod = neondb_owner, CI = test) —
			// agnostyczny test sprawdza nazwę policy + tablename + by `roles` miało
			// >= 1 rolę. Sprawdzenie WYKONANE W SQL (cardinality), bo node-postgres
			// nie zawsze parsuje `name[]` na JS Array (zwraca string "{role}") —
			// Array.isArray(r.roles) dawało false negative na prod (Neon) mimo
			// poprawnego stanu policy. Server-side cardinality jest immune na parser
			// quirks i zwraca prosty integer.
			const passthroughPolicies = await client.query(
				`SELECT tablename, cardinality(roles) AS role_count
				   FROM pg_policies
				  WHERE tablename = ANY($1::text[]) AND policyname = 'owner_passthrough'`,
				[TENANT_TABLES],
			);
			const okPolicyCount = passthroughPolicies.rows.filter(
				(r) => Number(r.role_count) >= 1,
			).length;
			check(
				"10b. owner_passthrough policy na 8 tabelach (>=1 rola każda)",
				passthroughPolicies.rowCount === 8 && okPolicyCount === 8,
				`policy na ${passthroughPolicies.rowCount}/8 (>=1 rola: ${okPolicyCount}/8)`,
			);

			// Cross-role deny-default: SET LOCAL ROLE app_student BEZ
			// app.current_user_id (NULL → predykat user_id = NULL = false).
			// Pod FORCE owner też podlega RLS, ale owner_passthrough byłby
			// wybrany dla app_student? NIE — owner_passthrough jest TO neondb_owner.
			// Pod app_student → student_sees_own match, ale current_user_id NULL
			// → false → 0 wierszy. Bingo.
			await client.query("BEGIN");
			await client.query("SET LOCAL ROLE app_student");
			// celowo NIE ustawiamy app.current_user_id
			const denyDefault = await client.query(`SELECT id FROM students LIMIT 1`);
			await client.query("ROLLBACK");
			check(
				"10c. app_student bez app.current_user_id = deny-default (0 wierszy)",
				denyDefault.rowCount === 0,
				`zwrócono ${denyDefault.rowCount} wierszy`,
			);
		}

		// 12a. B5 R1 — deny-faculty na project_reflections (Ryan, sekcja 3 wiersz 17).
		// Tabela bez grantu tabelowego i bez polityki faculty_sees_tenant →
		// deny-by-default egzekwowany na poziomie PostgreSQL.
		// information_schema.role_table_grants: 0 wierszy = grant nie istnieje.
		{
			const r12a = await client.query(
				`SELECT count(*)::int AS c
				   FROM information_schema.role_table_grants
				  WHERE grantee = 'app_faculty'
				    AND table_name = 'project_reflections'`,
			);
			check(
				"12a. B5 R1 — app_faculty NIE ma grantu na project_reflections (deny-by-default)",
				r12a.rows[0].c === 0,
				`znaleziono ${r12a.rows[0].c} grantów faculty (oczekiwano 0)`,
			);
		}

		// 11. B4 R1 — izolacja kolumnowa self_assessment + verified_by_method przed app_faculty
		// (ADR-002 „Validation plan pkt 2", migracja 0015 część 2).
		// information_schema.column_privileges: musi zwrócić 0 wierszy dla faculty + tych kolumn.
		// 0 wierszy = deny-by-default egzekwowany w bazie (REVOKE/GRANT z 0015).
		//
		// Gdy migracja 0015 jeszcze nie wylądowała na tym środowisku (kolumna nie istnieje),
		// zapytanie też zwróci 0 — test PASS, bo kolumna nieistniejąca ≡ nieuprawniona.
		// Pełna egzekucja R1 sprawdzalna dopiero po `pnpm db:migrate` z 0015.
		{
			const r1 = await client.query(
				`SELECT column_name, privilege_type
				   FROM information_schema.column_privileges
				  WHERE grantee = 'app_faculty'
				    AND table_name = 'competencies'
				    AND column_name IN ('self_assessment', 'verified_by_method')`,
			);
			check(
				"11. B4 R1 — app_faculty NIE ma SELECT na self_assessment/verified_by_method",
				r1.rowCount === 0,
				`znaleziono ${r1.rowCount} wierszy uprawnień (oczekiwano 0)`,
			);
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
