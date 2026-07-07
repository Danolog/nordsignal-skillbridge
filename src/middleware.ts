import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 1_048_576; // 1 MB

// AG.3: ingest rynku przyjmuje DWA spakowane CSV (oferty + technologie, ~10k/54k
// wierszy) — 1 MB nie starcza. 8 MB z zapasem mieści .gz obu plików, a trasa i
// tak jest za flagą + sekretem (MARKET_REFRESH_TOKEN), więc nie otwiera DoS
// anonimowi. Limit per-trasa, globalny cap dla reszty API bez zmian.
const MAX_INGEST_BODY_BYTES = 8_388_608; // 8 MB
const INGEST_PATH = "/api/market-refresh/ingest";

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// API routes: enforce body size cap (defence-in-depth vs. unbounded JSON / DoS).
	// Auth check for API is handled inside each route via auth.api.getSession.
	if (pathname.startsWith("/api/")) {
		const maxBytes = pathname === INGEST_PATH ? MAX_INGEST_BODY_BYTES : MAX_API_BODY_BYTES;
		const contentLength = request.headers.get("content-length");
		if (contentLength) {
			const len = Number(contentLength);
			if (Number.isFinite(len) && len > maxBytes) {
				return new NextResponse(JSON.stringify({ error: "Payload too large" }), {
					status: 413,
					headers: { "content-type": "application/json" },
				});
			}
		}
		return NextResponse.next();
	}

	// Protected pages: redirect to /login if no Better Auth session cookie.
	const allCookies = request.cookies.getAll();
	const sessionCookie = allCookies.find((c) => c.name.includes("better-auth.session_token"));
	if (!sessionCookie?.value) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/api/:path*",
		"/dashboard/:path*",
		"/onboarding/:path*",
		"/skill-map/:path*",
		"/gap-analysis/:path*",
		"/projects/:path*",
		"/passport",
		"/profil/:path*",
	],
};
