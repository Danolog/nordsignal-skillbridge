/**
 * Reset stanu onboardingu konta testowego — bezpośrednio na bazie TESTOWEJ.
 *
 * PO CO (znalezisko biegu nr 3 nocnego e2e-llm, 2026-07-21): specy 10/20/40
 * współdzielą konto „b4" i KAŻDY zakłada wizard na Kroku 0 („Zacznijmy od
 * celu"). Pierwszy z nich przechodzi Krok 0 naprawdę — stan (onboardingStep,
 * sesja Pomocnika) zostaje w bazie i kolejne specy zastają wizard dalej,
 * a osadzony Pomocnik pokazuje modal wznowienia. Lokalna praca na pojedynczym
 * specu tego nie ujawniała; pełny nocny przebieg — tak.
 *
 * Reset przywraca dokładnie stan seed-e2e.ts dla konta i USUWA sesje
 * Pomocnika (kaskada FK zabiera tury) → każdy spec jest samowystarczalny
 * i niezależny od kolejności.
 *
 * Guard: assertTestDb (allowlista hostów testowych) — identycznie jak
 * seed-e2e.ts; prod-DSN nigdy nie przejdzie.
 */

import { Client } from "pg";
import { assertTestDb } from "../../../tools/assert-test-db";

type ResetAccount = "b4" | "resume";

/** onboardingStep zgodny z seed-e2e.ts (b4: 0 — wizard od Kroku 0; resume: 3). */
const SEED_STEP: Record<ResetAccount, number> = { b4: 0, resume: 3 };

export async function resetOnboardingState(account: ResetAccount): Promise<void> {
	const dsn = process.env.E2E_DATABASE_URL;
	assertTestDb(dsn, "E2E_DATABASE_URL");

	const suffix = `_${account.toUpperCase()}`;
	const email = process.env[`E2E_TEST_EMAIL${suffix}`];
	if (!email) throw new Error(`Brak E2E_TEST_EMAIL${suffix} — nie wiem, które konto resetować.`);

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		const student = await client.query(
			`SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = $1`,
			[email],
		);
		if (student.rowCount !== 1) {
			throw new Error(
				`Konto ${email}: oczekiwano 1 studenta, jest ${student.rowCount} — odpal pnpm seed:e2e.`,
			);
		}
		const studentId = student.rows[0].id as string;

		await client.query(
			`UPDATE students SET onboarding_completed = false, onboarding_step = $2 WHERE id = $1`,
			[studentId, SEED_STEP[account]],
		);
		// Sesje Pomocnika precz (turns idą kaskadą FK) — inaczej osadzony Krok 0
		// pokazuje modal „Pomocnik czeka na Ciebie" zamiast ankiety.
		await client.query(`DELETE FROM career_helper_sessions WHERE student_id = $1`, [studentId]);
	} finally {
		await client.end();
	}
}
