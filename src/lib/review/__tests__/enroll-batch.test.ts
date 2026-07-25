// ============================================================================
// 1E.4 (R5) — unit: WSADOWY zasiew enrollConcepts (kształt insertu, dedup,
// pusta lista) + no-op hooka przy pustym zbiorze konceptów. Mock na granicy db;
// mechanikę ON CONFLICT / idempotencję / owner-side RLS na ŻYWEJ bazie dowodzi
// Quinn (integracja). Tu: kontrakt „jeden lookup + jeden wielowierszowy insert,
// bez N+1" i że pusta lista NIE dotyka bazy.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
	dbMock: { select: vi.fn(), insert: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { enrollConcepts, ReviewStudentNotFoundError } from "../review-service";

const STUDENT_ID = "student-1";
const TENANT_ID = "tenant-1";
const NOW = new Date("2026-07-25T10:00:00.000Z");

/** db.select({...}).from().where() → [{ tenantId }] (lub [] gdy brak studenta). */
function mockStudentLookup(rows: Array<{ tenantId: string }>) {
	const where = vi.fn(async () => rows);
	const from = vi.fn(() => ({ where }));
	dbMock.select.mockReturnValue({ from } as never);
	return { from, where };
}

/** db.insert().values().onConflictDoNothing().returning() → zadane wiersze; zwraca spy na values. */
function mockInsertReturning(returnedRows: unknown[]) {
	const returning = vi.fn(async () => returnedRows);
	const onConflictDoNothing = vi.fn(() => ({ returning }));
	const values = vi.fn((_rows: unknown[]) => ({ onConflictDoNothing }));
	dbMock.insert.mockReturnValue({ values } as never);
	return { values, onConflictDoNothing, returning };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("enrollConcepts — wsadowy zasiew konceptów (R5)", () => {
	it("pusta lista → {enrolled:0} BEZ żadnego zapytania (ani lookup, ani insert)", async () => {
		const res = await enrollConcepts(STUDENT_ID, [], NOW);
		expect(res).toEqual({ enrolled: 0 });
		expect(dbMock.select).not.toHaveBeenCalled();
		expect(dbMock.insert).not.toHaveBeenCalled();
	});

	it("jeden lookup tenanta + JEDEN wielowierszowy insert (bez N+1); enrolled = liczba nowych", async () => {
		mockStudentLookup([{ tenantId: TENANT_ID }]);
		const ins = mockInsertReturning([{ id: "r1" }, { id: "r2" }]);
		const res = await enrollConcepts(STUDENT_ID, ["c1", "c2"], NOW);

		expect(dbMock.select).toHaveBeenCalledTimes(1);
		expect(dbMock.insert).toHaveBeenCalledTimes(1);
		expect(ins.values).toHaveBeenCalledTimes(1);
		const rows = ins.values.mock.calls[0][0] as Array<Record<string, unknown>>;
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({ studentId: STUDENT_ID, tenantId: TENANT_ID, conceptId: "c1" });
		expect(rows[1]).toMatchObject({ conceptId: "c2" });
		// Kształt seed FSRS obecny (initCard): stan 'new', liczniki 0, due/stability/difficulty.
		expect(rows[0]).toHaveProperty("state", "new");
		expect(rows[0]).toHaveProperty("reps", 0);
		expect(rows[0]).toHaveProperty("lapses", 0);
		expect(rows[0].due).toBeInstanceOf(Date);
		expect(res).toEqual({ enrolled: 2 });
	});

	it("deduplikuje wejście — powtórzony conceptId trafia do insertu RAZ", async () => {
		mockStudentLookup([{ tenantId: TENANT_ID }]);
		const ins = mockInsertReturning([{ id: "r1" }, { id: "r2" }]);
		await enrollConcepts(STUDENT_ID, ["c1", "c1", "c2", "c2", "c1"], NOW);
		const rows = ins.values.mock.calls[0][0] as Array<Record<string, unknown>>;
		expect(rows.map((r) => r.conceptId).sort()).toEqual(["c1", "c2"]);
	});

	it("konflikt całej paczki → returning puste → {enrolled:0} (idempotentny re-fire)", async () => {
		mockStudentLookup([{ tenantId: TENANT_ID }]);
		mockInsertReturning([]);
		const res = await enrollConcepts(STUDENT_ID, ["c1", "c2"], NOW);
		expect(res).toEqual({ enrolled: 0 });
	});

	it("brak studenta → ReviewStudentNotFoundError (nie zgadujemy tenanta), insert nie ruszony", async () => {
		mockStudentLookup([]);
		await expect(enrollConcepts(STUDENT_ID, ["c1"], NOW)).rejects.toBeInstanceOf(
			ReviewStudentNotFoundError,
		);
		expect(dbMock.insert).not.toHaveBeenCalled();
	});
});
