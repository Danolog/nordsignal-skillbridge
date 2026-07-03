import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

// 0.13 — guard regresji nagłówka CSP. Runtime CSP nie jest ćwiczone przez build/testy
// (blokowanie dzieje się w przeglądarce), więc weryfikacja właściwa jest na Preview.
// Ten test pilnuje tylko, by konfiguracja NIE cofnęła się do report-only ani nie
// przywróciła 'unsafe-eval' — dwie regresje bezpieczeństwa łatwe do przypadkowego wprowadzenia.
describe("CSP header (next.config)", () => {
	it("serwuje enforce Content-Security-Policy (nie report-only) bez 'unsafe-eval'", async () => {
		const headerBlocks = await nextConfig.headers?.();
		expect(headerBlocks).toBeTruthy();
		const headers = headerBlocks?.[0]?.headers ?? [];

		const enforce = headers.find((h) => h.key === "Content-Security-Policy");
		const reportOnly = headers.find((h) => h.key === "Content-Security-Policy-Report-Only");

		expect(enforce).toBeDefined(); // enforce, nie tylko obserwacja
		expect(reportOnly).toBeUndefined();
		expect(enforce?.value).not.toContain("unsafe-eval");
		// Kluczowe directives nadal obecne.
		expect(enforce?.value).toContain("frame-ancestors 'none'");
		expect(enforce?.value).toContain("connect-src 'self' https://api.anthropic.com");
	});
});
