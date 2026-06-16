import type { NextConfig } from "next";

// CSP w trybie report-only: pozwala obserwować potencjalne naruszenia bez blokowania
// (Recharts/React Flow/inline styles z shadcn). Po obserwacji można promote'ować do enforce.
const cspReportOnly = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https: blob:",
	"font-src 'self' data:",
	"connect-src 'self' https://api.anthropic.com https://*.upstash.io",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join("; ");

const securityHeaders = [
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), payment=()",
	},
	{ key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
	// pdf-parse (v2) i jego natywna zależność @napi-rs/canvas (binding N-API) NIE mogą być
	// bundlowane do funkcji serverless — muszą zostać zewnętrzne i dociągnięte przez tracing
	// node_modules na Vercelu. Bez tego dynamiczny `import("pdf-parse")` w
	// /api/syllabus/parse nie trafia do śladu funkcji (nft.json) → MODULE_NOT_FOUND na prod
	// → handler łapie i zwraca 422 „Nie udało się odczytać tekstu z pliku PDF". Lokalnie
	// (dev/vitest) działa, bo całe node_modules jest obecne — klasyczny prod-only crash.
	// ADR-007 ryzyko „@napi-rs/canvas nie zbuduje się/brak prebuilt": tu domknięte.
	serverExternalPackages: ["pdf-parse"],
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
