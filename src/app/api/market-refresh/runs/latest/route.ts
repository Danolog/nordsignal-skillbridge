// ============================================================================
// AG.4 — PODGLĄD OSTATNIEGO PRZEBIEGU ODŚWIEŻENIA RYNKU (dla widoku decyzji).
//
// Zwraca najnowszy wiersz `market_refresh_runs` BEZ bajtów artefaktów
// (content_flat 72K + content_model 212K nie są potrzebne w widoku — mobile!)
// + pełny raport diffu. Ochrona jak cała rodzina: flaga + token (guard).
// ============================================================================

import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketRefreshRuns } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { guardMarketRefresh } from "@/lib/market-refresh/auth";

export async function GET(req: Request) {
	const denied = guardMarketRefresh(req);
	if (denied) return denied;

	try {
		const run = await db.query.marketRefreshRuns.findFirst({
			orderBy: desc(marketRefreshRuns.createdAt),
			columns: {
				// Bez content_flat/content_model — celowo (rozmiar; widok ich nie używa).
				id: true,
				ofertyMd5: true,
				technologieMd5: true,
				rawOffers: true,
				uniqueOffers: true,
				assignedOffers: true,
				stagedRows: true,
				diff: true,
				status: true,
				createdAt: true,
				acceptedAt: true,
			},
		});
		if (!run) {
			return NextResponse.json({ run: null });
		}
		return NextResponse.json({ run });
	} catch (err) {
		logError("market-refresh.runs.latest", err);
		return NextResponse.json({ error: "Odczyt nie powiódł się" }, { status: 500 });
	}
}
