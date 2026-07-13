/**
 * Blok E planu napraw (E2) — odwiedziny URL-i endpointów z README.
 *
 * Kryterium „publiczny, klikalny endpoint" (25% wagi jedynego L2) było
 * niemożliwe do zaliczenia: reviewer widział tylko string URL-a, a prompt każe
 * zerować kryterium bez dowodu. Ten moduł robi HEAD (fallback GET przy 405)
 * z timeoutem i wynik podaje krokowi 3 w HARD_TEST_RESULTS.
 *
 * Bezpieczeństwo (URL pochodzi od studenta — klasyczne wejście SSRF):
 *  - wyłącznie https,
 *  - host nie może być literałem IP, localhost ani nazwą bez kropki
 *    (odcina intranet/metadata endpoints; publiczne demo zawsze ma FQDN),
 *  - body nie jest czytane (liczy się status), redirecty ograniczone przez fetch.
 * Cache per proces (TTL) — resubmity tego samego demo nie odpytują go w kółko.
 */

const ENDPOINT_TIMEOUT_MS = 5_000;
const MAX_URLS_PER_RUN = 3;
const CACHE_TTL_MS = 10 * 60_000;

export type EndpointCheck = { url: string; ok: boolean; status: number | null };

const cache = new Map<string, { at: number; result: EndpointCheck }>();

/** Host odrzucany, zanim wyjdzie jakikolwiek ruch (guard SSRF). */
export function isDisallowedHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
	if (h.endsWith(".internal") || h.endsWith(".lan")) return true;
	if (!h.includes(".")) return true; // nazwy intranetowe bez kropki
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true; // IPv4-literal (w tym prywatne)
	if (h.includes(":") || h.startsWith("[")) return true; // IPv6-literal
	return false;
}

/**
 * Kandydaci z README: URL-e https, bez github.com (repo to nie endpoint) i bez
 * hostów odrzuconych guardem. Deduplikacja, limit MAX_URLS_PER_RUN.
 */
export function extractEndpointCandidates(readme: string): string[] {
	const found = readme.match(/https:\/\/[^\s)\]>"'`]+/g) ?? [];
	const out: string[] = [];
	for (const raw of found) {
		const cleaned = raw.replace(/[.,;:!?]+$/, "");
		let parsed: URL;
		try {
			parsed = new URL(cleaned);
		} catch {
			continue;
		}
		const host = parsed.hostname.replace(/^www\./, "");
		if (host === "github.com" || host.endsWith(".github.com")) continue;
		if (isDisallowedHost(parsed.hostname)) continue;
		if (!out.includes(cleaned)) out.push(cleaned);
		if (out.length >= MAX_URLS_PER_RUN) break;
	}
	return out;
}

async function probe(url: string): Promise<EndpointCheck> {
	const attempt = async (method: "HEAD" | "GET") => {
		const res = await fetch(url, {
			method,
			redirect: "follow",
			signal: AbortSignal.timeout(ENDPOINT_TIMEOUT_MS),
		});
		// Body nie jest potrzebne — zwalniamy połączenie bez czytania.
		res.body?.cancel().catch(() => {});
		return res;
	};
	try {
		let res = await attempt("HEAD");
		// Część hostingów (Streamlit/Gradio) nie lubi HEAD — 405/501 → GET.
		if (res.status === 405 || res.status === 501) res = await attempt("GET");
		return { url, ok: res.ok, status: res.status };
	} catch {
		return { url, ok: false, status: null };
	}
}

/**
 * Sprawdza kandydatów z README. Zwraca null, gdy nie ma czego sprawdzać —
 * krok 3 rozróżnia „brak URL-i" (null) od „URL martwy" (ok=false).
 */
export async function checkEndpoints(readme: string): Promise<EndpointCheck[] | null> {
	const candidates = extractEndpointCandidates(readme);
	if (candidates.length === 0) return null;

	const now = Date.now();
	return Promise.all(
		candidates.map(async (url) => {
			const hit = cache.get(url);
			if (hit && now - hit.at < CACHE_TTL_MS) return hit.result;
			const result = await probe(url);
			cache.set(url, { at: now, result });
			return result;
		}),
	);
}
