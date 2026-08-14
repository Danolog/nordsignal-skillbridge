import type { NextConfig } from "next";

// 0.13: CSP w trybie ENFORCE (blokuje, nie tylko raportuje). Report-only obserwowaliśmy
// wcześniej bez naruszeń, więc directives (connect-src/base-uri/form-action) są teraz
// egzekwowane — realnie ograniczają exfiltrację i wstrzyknięcie <base>/<form action>.
// `unsafe-eval` USUNIĘTE: Next.js prod nie używa eval, a nasze biblioteki runtime
// (Recharts, React Flow, jsPDF, html2canvas) też nie — eval-XSS zablokowane.
// `unsafe-inline` POZOSTAJE (skrypty hydration Next + inline style shadcn/Tailwind): jego
// usunięcie wymaga migracji na nonce (per-request nonce w middleware + Next auto-wstrzykuje
// go w swoje <script>) — osobny follow-up. WERYFIKACJA: enforce jest runtime'owe (build/testy
// go nie ćwiczą) → sprawdzić na Preview (Vercel): konsola bez naruszeń CSP na skill-map
// (React Flow), panelu faculty (Recharts), paszporcie (PDF export), hydration wszystkich stron.
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
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
	{ key: "Content-Security-Policy", value: csp },
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
		// E4: /prywatnosc renderuje CZĘŚĆ I dokumentu klauzuli PROSTO Z NOŚNIKA
		// (docs/legal/…), zamiast trzymać przepisaną kopię w komponencie — patrz
		// src/lib/legal/klauzula-art13.ts. Odczyt idzie przez `readFileSync` ze
		// ścieżki złożonej w czasie działania, więc statyczna analiza śladu funkcji
		// serverless go NIE widzi: bez tego wpisu strona działa lokalnie i wywala
		// się na Vercelu („ENOENT"). Ten sam mechanizm i ten sam powód co przy
		// workerze pdfjs wyżej.
		"/prywatnosc": ["./docs/legal/klauzula-informacyjna-art13.md"],
		// Fala 2 — ten sam mechanizm i ten sam powód co przy `/prywatnosc` wyżej:
		// odczyt nośnika idzie przez `readFileSync` ze ścieżki składanej w czasie
		// działania, więc statyczna analiza śladu funkcji go NIE widzi. BEZ tych
		// dwóch wpisów obie strony działają lokalnie i wywalają się na produkcji
		// błędem „ENOENT" — a jedna z nich to ekran, który widzi PRACODAWCA
		// sprawdzający kandydata, czyli awaria dokładnie w chwili największej stawki.
		// Klucz to segment TRASY (nie plik): `not-found.tsx` renderuje się w ramach
		// funkcji trasy `/passport/[id]`, więc ślad dokłada się do niej.
		"/passport/[id]": ["./docs/product/zasada-odpowiedzi-dla-pracodawcy.md"],
		"/regulamin": ["./docs/product/regulamin-pilotazu.md"],
		// Dwie trasy, które czytają regulamin NIE PO TO, żeby go pokazać:
		//   • `/signup` — strona rejestracji odczytuje WERSJĘ dokumentu (jeden nośnik
		//     wersji) i wysyła ją z formularzem jako dowód „na co ta osoba się zgodziła";
		//   • `/api/auth/[...path]` — tędy biegnie `/sign-up/email`, a zaczep `before`
		//     porównuje wersję z żądania z wersją z dokumentu.
		// Przy ZAPALONEJ fladze regulaminu odczyt wykonuje się przy KAŻDEJ rejestracji,
		// więc brak tych wpisów to awaria na rejestracji uczestnika — czyli w miejscu
		// droższym niż strona z treścią, i odkrywana dopiero przy zapłonie flagi.
		// Pilnowane maszynowo: tests/unit/pilotaz/slad-nosnikow.contract.test.ts.
		"/signup": ["./docs/product/regulamin-pilotazu.md"],
		"/api/auth/[...path]": ["./docs/product/regulamin-pilotazu.md"],
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
