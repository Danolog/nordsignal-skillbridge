/**
 * B7/1.16a (ADR-013 D1) — WŁAZ OPERACYJNY na gaszenie flagi vivaDefense.
 *
 * Problem: przy zapalonej fladze zgłoszenia z werdyktem maszyny 'verified'
 * czekają jako 'submitted' + sesja `pending`. Gaszenie flagi bez tego skryptu
 * zawiesiłoby je na zawsze (UI obrony znika, status nie wraca).
 *
 * Predykat (ŚWIADOMIE wąski — ADR-013): podnosimy do 'verified' WYŁĄCZNIE
 * zgłoszenia, gdzie:
 *  - najświeższa sesja vivy = 'pending' (obrona NIGDY nie ruszyła; sesje
 *    z odpowiedziami/oblane zostają na ścieżce człowieka),
 *  - zero odpowiedzi w tej sesji (pas bezpieczeństwa),
 *  - brak wiersza submission_reviews (decyzja człowieka nie zapadła),
 *  - recommendation.verdict = 'approve' (werdykt maszyny sprzed obrony).
 * Sesja pending → 'superseded'; wpis audytu per podniesione zgłoszenie.
 *
 * Użycie: DATABASE_URL=... pnpm exec tsx tools/viva-flag-off-recompute.ts [--execute]
 * Bez --execute = DRY-RUN (tylko wypisuje, zero zapisów).
 * Prod = czerwona linia: odpala Darek po backupie gałęzią Neona.
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const EXECUTE = process.argv.includes("--execute");
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
	console.error("Brak DATABASE_URL");
	process.exit(1);
}

async function main() {
	const pool = new Pool({ connectionString: DB_URL });
	try {
		const { rows } = await pool.query(`
			SELECT ps.id AS submission_id, vs.id AS session_id, ps.student_id
			  FROM project_submissions ps
			  JOIN LATERAL (
			        SELECT id, status FROM viva_sessions
			         WHERE submission_id = ps.id
			         ORDER BY created_at DESC LIMIT 1
			      ) vs ON vs.status = 'pending'
			 WHERE ps.status = 'submitted'
			   AND ps.ai_review_json -> 'recommendation' ->> 'verdict' = 'approve'
			   AND NOT EXISTS (SELECT 1 FROM submission_reviews sr WHERE sr.submission_id = ps.id)
			   AND NOT EXISTS (SELECT 1 FROM viva_answers va WHERE va.session_id = vs.id)
		`);

		console.log(`Kandydaci do podniesienia (pending, 0 odpowiedzi, bez decyzji): ${rows.length}`);
		for (const r of rows) console.log(`  submission=${r.submission_id} session=${r.session_id}`);

		if (!EXECUTE) {
			console.log("\nDRY-RUN — zero zapisów. Wykonanie: dopisz --execute.");
			return;
		}

		for (const r of rows) {
			await pool.query("BEGIN");
			try {
				await pool.query(
					`UPDATE viva_sessions SET status = 'superseded', completed_at = now() WHERE id = $1 AND status = 'pending'`,
					[r.session_id],
				);
				await pool.query(
					`UPDATE project_submissions
					    SET status = 'verified',
					        ai_review_json = jsonb_set(coalesce(ai_review_json,'{}'::jsonb), '{viva}', '{"state":"superseded","questionCount":3}'::jsonb),
					        updated_at = now()
					  WHERE id = $1 AND status = 'submitted'`,
					[r.submission_id],
				);
				// A1 (ADR A-1 (a+)): BEZ `actor_id`. To jedyna w drzewie ścieżka
				// surowego SQL-a, która łamała regułę — omijała kontrakt TypeScriptu
				// (`AuditEntry`), więc typ jej nie widział. Inwentaryzacja w ADR §3.3
				// wymieniała dwie ścieżki surowego SQL-a; w drzewie są cztery i to
				// właśnie ta czwarta pisała identyfikator studenta.
				// Wiązanie idzie przez `target_id` = `project_submissions.id`
				// (kaskada z konta). Pilnuje tego strażnik S-A1-4.
				await pool.query(
					`INSERT INTO audit_log (actor_type, action, target_type, target_id, metadata)
					 VALUES ('system', 'submission.verified', 'submission', $1,
					         '{"via":"viva-flag-off-recompute"}'::jsonb)`,
					[r.submission_id],
				);
				await pool.query("COMMIT");
				console.log(`✅ podniesione: ${r.submission_id}`);
			} catch (err) {
				await pool.query("ROLLBACK");
				console.error(`❌ ${r.submission_id}:`, err);
			}
		}
	} finally {
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
