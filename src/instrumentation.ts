/**
 * Next.js boot-check. `register()` biegnie raz przy starcie procesu (każdy cold
 * start na Vercelu, nodejs runtime) — zanim popłynie ruch. Rzut tu zatrzymuje
 * deployment, więc brak configu Upstash w produkcji nigdy nie trafia do
 * cichego rate-limitingu wyłączonego (zob. src/lib/rate-limit.ts).
 */
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { assertRateLimitConfigured } = await import("@/lib/rate-limit");
		assertRateLimitConfigured();
	}
}
