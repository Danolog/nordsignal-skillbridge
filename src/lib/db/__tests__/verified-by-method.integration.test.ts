// @vitest-environment node
//
// A5/1.10 — CHECK verified_by_method po migracji 0029 (realna baza):
// 'diagnostic' przyjęte (nowa ścieżka testu adaptacyjnego), wartości spoza
// listy odrzucone przez bazę (constraint 23514), 'self' bez zmian.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const MARKER = "a5-110-integ";

dBack("A5/1.10 · CHECK verified_by_method ('self','diagnostic') — realna baza", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	let studentId = "";
	let tenantId = "";

	async function cleanup() {
		await db.execute(sql`DELETE FROM competencies WHERE name LIKE ${`${MARKER}%`}`);
	}

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		await cleanup();
		const row = await db.execute(sql`SELECT id, tenant_id FROM students LIMIT 1`);
		studentId = (row.rows[0] as { id: string }).id;
		tenantId = (row.rows[0] as { tenant_id: string }).tenant_id;
	});

	afterAll(async () => {
		if (db) await cleanup();
	});

	it("'diagnostic' przyjęte; 'self' bez zmian; śmieć odrzucony constraintem", async () => {
		for (const ok of ["self", "diagnostic"]) {
			await db.execute(
				sql`INSERT INTO competencies (student_id, tenant_id, name, status, verified_by_method)
				    VALUES (${studentId}, ${tenantId}, ${`${MARKER}-${ok}`}, 'acquired', ${ok})`,
			);
		}
		const count = await db.execute(
			sql`SELECT count(*)::int AS c FROM competencies WHERE name LIKE ${`${MARKER}%`}`,
		);
		expect((count.rows[0] as { c: number }).c).toBe(2);

		// Drizzle opakowuje błąd PG (23514 w cause) — asercja na odrzuceniu
		// zapytania + stanie bazy (wiersz NIE istnieje), nie na treści komunikatu.
		await expect(
			db.execute(
				sql`INSERT INTO competencies (student_id, tenant_id, name, status, verified_by_method)
				    VALUES (${studentId}, ${tenantId}, ${`${MARKER}-zly`}, 'acquired', 'wrozka')`,
			),
		).rejects.toThrow();
		const after = await db.execute(
			sql`SELECT count(*)::int AS c FROM competencies WHERE name = ${`${MARKER}-zly`}`,
		);
		expect((after.rows[0] as { c: number }).c).toBe(0);
	});
});
