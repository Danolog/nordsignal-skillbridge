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
	// pdf-parse (v2) ładuje pdfjs-dist/legacy/build/pdf.mjs, które na imporcie warunkowo
	// require("@napi-rs/canvas"). Oba muszą zostać ZEWNĘTRZNE (nie bundlowane) i dociągnięte
	// przez tracing node_modules na Vercelu — inaczej transformacja Next/Turbopack rozplątuje
	// warunkowy require i import.meta.url, a dynamiczny `import("pdf-parse")` nie trafia do
	// śladu funkcji. NIE potrzebujemy już canvasa do działania (extract-pdf-text shimuje
	// DOMMatrix bez niego, Rekomendacja A) — pdfjs-dist external trzyma legacy build w
	// node_modules nietknięty, a brakujący canvas na Linuxie jest teraz nieszkodliwy.
	serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
	// DRUGI prod-only bug uploadu PDF (preview złapał, lokalnie niewidoczny):
	// pdfjs (5.4.x) w Node ZAWSZE odpala „fake worker" — to tam realnie parsuje PDF.
	// Fake worker robi `await import("./pdf.worker.mjs")` względem pdf.mjs, czyli ładuje
	// `pdfjs-dist/legacy/build/pdf.worker.mjs` (2 MB). Plik istnieje w node_modules, ALE
	// tracing funkcji serverless Vercela NIE wciąga go do /var/task (dynamiczny import po
	// stringu omija statyczną analizę śladu) → „Cannot find module ... pdf.worker.mjs" → 500.
	// W tej wersji pdfjs NIE ma trybu „bez workera" w Node (disableWorker nie pomaga — fake
	// worker jest obowiązkowy), więc właściwy fix to WCIĄGNĄĆ plik workera do śladu funkcji.
	// outputFileTracingIncludes robi to deklaratywnie, bez nowej zależności i bez kruchego
	// `globalThis.pdfjsWorker` (pdfjs-dist nie jest naszą bezpośrednią zależnością — pnpm nie
	// rozwiązuje go z kodu appki). Globy pokrywają układ pnpm (.pnpm/...) i hoisted.
	outputFileTracingIncludes: {
		"/api/syllabus/parse": [
			"./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
			"./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
		],
	},
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
