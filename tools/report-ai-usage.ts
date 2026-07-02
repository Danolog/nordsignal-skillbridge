import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

// Zadanie 0.0 — raport kosztu AI z ai_usage_ledger (MVP "dashboardu" ops).
// Read-only; łączy się z DATABASE_URL z .env.local (lokalna) albo z env
// (gałąź Neona / preview). Uruchomienie: pnpm tsx tools/report-ai-usage.ts [dni]
//
// Sekcje: suma kosztów, koszt per scope (moduł/endpoint), koszt per dzień,
// top studentów po koszcie, error-rate per scope (agregacja błędów bez Sentry).

const days = Number.parseInt(process.argv[2] ?? "7", 10);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
	const c = await pool.connect();
	try {
		const since = `now() - interval '${Number.isFinite(days) && days > 0 ? days : 7} days'`;

		const total = await c.query(
			`SELECT count(*) AS calls,
			        coalesce(sum(input_tokens), 0)  AS input_tokens,
			        coalesce(sum(output_tokens), 0) AS output_tokens,
			        round(coalesce(sum(cost_usd), 0), 4) AS cost_usd,
			        count(*) FILTER (WHERE NOT success) AS errors,
			        count(*) FILTER (WHERE cost_usd IS NULL) AS no_price
			   FROM ai_usage_ledger
			  WHERE created_at >= ${since}`,
		);
		console.log(`=== Koszt AI — ostatnie ${days} dni ===`);
		console.table(total.rows);

		const byScope = await c.query(
			`SELECT scope, tier, model_id,
			        count(*) AS calls,
			        round(coalesce(sum(cost_usd), 0), 4) AS cost_usd,
			        count(*) FILTER (WHERE NOT success) AS errors
			   FROM ai_usage_ledger
			  WHERE created_at >= ${since}
			  GROUP BY scope, tier, model_id
			  ORDER BY sum(cost_usd) DESC NULLS LAST`,
		);
		console.log("\n=== Per scope (moduł/endpoint) ===");
		console.table(byScope.rows);

		const byDay = await c.query(
			`SELECT date_trunc('day', created_at)::date AS day,
			        count(*) AS calls,
			        round(coalesce(sum(cost_usd), 0), 4) AS cost_usd
			   FROM ai_usage_ledger
			  WHERE created_at >= ${since}
			  GROUP BY 1 ORDER BY 1`,
		);
		console.log("\n=== Per dzień ===");
		console.table(byDay.rows);

		const byStudent = await c.query(
			`SELECT student_id,
			        count(*) AS calls,
			        round(coalesce(sum(cost_usd), 0), 4) AS cost_usd
			   FROM ai_usage_ledger
			  WHERE created_at >= ${since} AND student_id IS NOT NULL
			  GROUP BY student_id
			  ORDER BY sum(cost_usd) DESC NULLS LAST
			  LIMIT 10`,
		);
		console.log("\n=== Top 10 studentów po koszcie (uuid, bez PII) ===");
		console.table(byStudent.rows);

		const errors = await c.query(
			`SELECT scope, error_name, count(*) AS occurrences,
			        max(created_at) AS last_seen
			   FROM ai_usage_ledger
			  WHERE created_at >= ${since} AND NOT success
			  GROUP BY scope, error_name
			  ORDER BY count(*) DESC`,
		);
		console.log("\n=== Błędy per scope (agregacja) ===");
		console.table(errors.rows);
	} finally {
		c.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("[report-ai-usage]", err instanceof Error ? err.message : err);
	process.exit(1);
});
