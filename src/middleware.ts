import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 1_048_576; // 1 MB

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// API routes: enforce body size cap (defence-in-depth vs. unbounded JSON / DoS).
	// Auth check for API is handled inside each route via auth.api.getSession.
	if (pathname.startsWith("/api/")) {
		const contentLength = request.headers.get("content-length");
		if (contentLength) {
			const len = Number(contentLength);
			if (Number.isFinite(len) && len > MAX_API_BODY_BYTES) {
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
