// ============================================================================
// AG.5 — RĘCZNY RECOMPUTE LUK (właz naprawczy / powtórka po awarii).
//
// Normalna ścieżka: recompute odpala się automatycznie po akceptacji swapu
// (decision route). Ten endpoint istnieje na wypadek, gdy tamten przebieg padł
// (recomputeFailed w odpowiedzi decyzji) albo trzeba przeliczyć po ręcznej
// zmianie rynku (np. rollback z _bak). IDEMPOTENTNY: drugi przebieg na tym
// samym rynku nie wykrywa nowych luk i nie woła LLM (DoD AG.5).
//
// runId wiązany automatycznie z ostatnim ZAAKCEPTOWANYM przebiegiem (jeśli
// jest) — zdarzenia nowych luk zachowują prowenicję.
// ============================================================================

import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketRefreshRuns } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { guardMarketRefresh } from "@/lib/market-refresh/auth";
import { runMarketRecompute } from "@/lib/market-refresh/recompute";

export const maxDuration = 300;

export async function POST(req: Request) {
	const denied = guardMarketRefresh(req);
	if (denied) return denied;

	try {
		const lastAccepted = await db.query.marketRefreshRuns.findFirst({
			where: eq(marketRefreshRuns.status, "accepted"),
			orderBy: desc(marketRefreshRuns.acceptedAt),
			columns: { id: true },
		});
		const summary = await runMarketRecompute({ runId: lastAccepted?.id ?? null });
		return NextResponse.json({ success: true, runId: lastAccepted?.id ?? null, summary });
	} catch (err) {
		logError("market-refresh.recompute", err);
		return NextResponse.json({ error: "Recompute nie powiódł się" }, { status: 500 });
	}
}
