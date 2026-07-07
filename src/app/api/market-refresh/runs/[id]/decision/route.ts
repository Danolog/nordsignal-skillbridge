// ============================================================================
// AG.4 — DECYZJA DARKA: akceptacja (SWAP staging→prod) albo odrzucenie.
//
// [CZERWONA LINIA — dane prod]: to JEDYNE miejsce rodziny market-refresh, które
// pisze do `job_market_data` — i robi to wyłącznie na jawne tapnięcie Darka
// (świadomy kompromis z roadmapy: pobranie i przeliczenie automatyczne, sam
// swap wymaga człowieka). Wzorzec transakcji = ADR-009/010 + prowenicja §10:
// auto-backup `job_market_data_bak` + DELETE/INSERT + kontrola liczb PRZED
// COMMIT (sanity-check w tx udowodnił wartość w praktyce — §10: literówka
// w kontroli abortowała transakcję i prod został nietknięty).
//
// ODRZUCENIE: wyłącznie UPDATE statusu runu — prod bez zmian z definicji.
//
// Strażnice akceptacji (wszystkie w tx, każda wali 409 i rollback):
//  1. run istnieje i ma status 'staged' (nie zaakceptowany/odrzucony drugi raz),
//  2. run jest NAJNOWSZYM przebiegiem (staging trzyma zawsze OSTATNI upload —
//     akceptacja starszego runu wgrałaby cudzy snapshot),
//  3. staging ma dokładnie run.stagedRows wierszy (spójność run↔staging),
//  4. po INSERT: count(job_market_data) == run.stagedRows.
//
// ROLLBACK po fakcie (dopóki `_bak` istnieje — patrz runbook):
//   BEGIN; DELETE FROM job_market_data;
//   INSERT INTO job_market_data SELECT * FROM job_market_data_bak; COMMIT;
// ============================================================================

import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jobMarketDataStaging, marketRefreshRuns } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { guardMarketRefresh } from "@/lib/market-refresh/auth";

const DecisionSchema = z.object({
	decision: z.enum(["accept", "reject"]),
});

/** Błąd strażnicy w tx — mapowany na 409 (konflikt stanu, nie 500). */
class SwapConflictError extends Error {}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	const denied = guardMarketRefresh(req);
	if (denied) return denied;

	const { id } = await ctx.params;
	if (!z.string().uuid().safeParse(id).success) {
		return NextResponse.json({ error: "Nieprawidłowe id przebiegu" }, { status: 400 });
	}

	let decision: "accept" | "reject";
	try {
		const parsed = DecisionSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Wymagane body: {"decision": "accept" | "reject"}' },
				{ status: 400 },
			);
		}
		decision = parsed.data.decision;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	try {
		if (decision === "reject") {
			// Prod bez zmian z definicji — tylko status runu. Guard na 'staged'
			// w WHERE = idempotentna odmowa podwójnej decyzji.
			const rejected = await db
				.update(marketRefreshRuns)
				.set({ status: "rejected" })
				.where(sql`${marketRefreshRuns.id} = ${id} AND ${marketRefreshRuns.status} = 'staged'`)
				.returning({ id: marketRefreshRuns.id });
			if (rejected.length === 0) {
				return NextResponse.json(
					{ error: "Przebieg nie istnieje albo decyzja już zapadła" },
					{ status: 409 },
				);
			}
			return NextResponse.json({ success: true, decision: "rejected", prodChanged: false });
		}

		// ── ACCEPT: transakcyjny swap z auto-backupem ─────────────────────────
		const swapped = await db.transaction(async (tx) => {
			// Strażnica 1+2: run 'staged' i NAJNOWSZY. FOR UPDATE — dwie równoległe
			// akceptacje nie przeplotą się (druga zobaczy status po commicie pierwszej).
			const [run] = await tx
				.select({
					id: marketRefreshRuns.id,
					status: marketRefreshRuns.status,
					stagedRows: marketRefreshRuns.stagedRows,
				})
				.from(marketRefreshRuns)
				.where(eq(marketRefreshRuns.id, id))
				.for("update");
			if (!run) throw new SwapConflictError("Przebieg nie istnieje");
			if (run.status !== "staged") {
				throw new SwapConflictError(`Decyzja już zapadła (status: ${run.status})`);
			}
			const [latest] = await tx
				.select({ id: marketRefreshRuns.id })
				.from(marketRefreshRuns)
				.orderBy(desc(marketRefreshRuns.createdAt))
				.limit(1);
			if (latest.id !== run.id) {
				throw new SwapConflictError(
					"Istnieje nowszy przebieg — staging trzyma ostatni upload; zaakceptuj najnowszy albo odrzuć",
				);
			}

			// Strażnica 3: staging spójny z runem (i niepusty).
			const [{ stagingCount }] = await tx
				.select({ stagingCount: sql<number>`count(*)::int` })
				.from(jobMarketDataStaging);
			if (stagingCount === 0 || stagingCount !== run.stagedRows) {
				throw new SwapConflictError(
					`Staging (${stagingCount} wierszy) niespójny z przebiegiem (${run.stagedRows})`,
				);
			}

			// Auto-backup w TEJ SAMEJ transakcji (wzorzec §10 prowenicji).
			// DROP IF EXISTS = idempotencja kolejnych akceptacji; poprzedni backup
			// żyje do następnego swapu (okno rollbacku — runbook).
			await tx.execute(sql`DROP TABLE IF EXISTS job_market_data_bak`);
			await tx.execute(sql`CREATE TABLE job_market_data_bak AS SELECT * FROM job_market_data`);

			// Swap: lustro kolumn (migracja 0023) → INSERT…SELECT bez mapowania.
			await tx.execute(sql`DELETE FROM job_market_data`);
			await tx.execute(sql`
				INSERT INTO job_market_data (id, career_goal, competency_name, demand_percentage, category, salary_range)
				SELECT id, career_goal, competency_name, demand_percentage, category, salary_range
				FROM job_market_data_staging
			`);

			// Strażnica 4: kontrola liczb PRZED COMMIT (lekcja §10).
			const prodCount = await tx.execute(sql`SELECT count(*)::int AS c FROM job_market_data`);
			const c = Number((prodCount.rows[0] as { c: number }).c);
			if (c !== run.stagedRows) {
				throw new SwapConflictError(`Po swapie ${c} wierszy, oczekiwano ${run.stagedRows}`);
			}

			await tx
				.update(marketRefreshRuns)
				.set({ status: "accepted", acceptedAt: new Date() })
				.where(eq(marketRefreshRuns.id, run.id));

			return { rows: c };
		});

		return NextResponse.json({
			success: true,
			decision: "accepted",
			prodChanged: true,
			prodRows: swapped.rows,
			backupTable: "job_market_data_bak",
		});
	} catch (err) {
		if (err instanceof SwapConflictError) {
			// Transakcja już wycofana — prod nietknięty (albo nietknięty z definicji).
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		logError("market-refresh.decision", err, { runId: id, decision });
		return NextResponse.json({ error: "Operacja nie powiodła się" }, { status: 500 });
	}
}
