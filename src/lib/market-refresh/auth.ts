// ============================================================================
// AG.3/AG.4 — wspólny strażnik tras operacyjnych odświeżania rynku.
//
// Trasy rodziny market-refresh (ingest, podgląd runów, decyzja accept/reject)
// są poza Better Auth: to operacje Darka, nie feature studenta. Dostęp =
// flaga `proactiveMarketRefresh` (off → trasa nie istnieje, 404) + sekret
// `MARKET_REFRESH_TOKEN` w nagłówku (porównanie stałoczasowe; brak env =
// zamknięte, nigdy fail-open).
// ============================================================================

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/flags";

export const MARKET_REFRESH_TOKEN_HEADER = "x-market-refresh-token";

/** Porównanie stałoczasowe przez hash (wyrównuje długości — timingSafeEqual
 *  wymaga równych buforów; hash zdejmuje też sygnał długości sekretu). */
export function marketRefreshTokenMatches(req: Request): boolean {
	const expected = process.env.MARKET_REFRESH_TOKEN?.trim();
	if (!expected) return false;
	const provided = req.headers.get(MARKET_REFRESH_TOKEN_HEADER) ?? "";
	const a = createHash("sha256").update(provided).digest();
	const b = createHash("sha256").update(expected).digest();
	return timingSafeEqual(a, b);
}

/**
 * Wspólna bramka tras market-refresh. Zwraca odpowiedź błędu (404/401) albo
 * null, gdy wolno przejść dalej. Kolejność celowa: najpierw flaga (deploy ≠
 * release — wyłączona funkcja nie zdradza istnienia trasy), potem token.
 */
export function guardMarketRefresh(req: Request): NextResponse | null {
	if (!isFeatureEnabled("proactiveMarketRefresh")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	if (!marketRefreshTokenMatches(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	return null;
}
