/**
 * Polityka adresu bazowego dla testów E2E, które ZAPISUJĄ dane.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * REGUŁA (spisana zanim powstało dopasowanie)
 * ══════════════════════════════════════════════════════════════════════════
 * „Test, który zapisuje dane studenta albo woła model, wolno puścić wyłącznie
 *  na środowisko lokalne — albo na zdalne, które operator NAZWAŁ w tym samym
 *  uruchomieniu."
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DLACZEGO ALLOWLISTA, A NIE LISTA ADRESÓW PRODUKCJI
 * ══════════════════════════════════════════════════════════════════════════
 * Poprzednia wersja (`helpers/guards.ts`) trzymała listę zakazanych fragmentów:
 *   ["skill-bridge-ai.vercel.app", "skillbridge.nordsignal", "nordsignal.cc"]
 * Pomiar (Ryan/CRCO, 2026-08-12, `vercel inspect` — źródło autorytatywne):
 * produkcja odpowiada dziś pod aliasami
 *   skill-bridge-ai-seven.vercel.app
 *   skill-bridge-ai-<slug-zespołu>.vercel.app
 *   skill-bridge-ai-git-main-<slug-zespołu>.vercel.app
 * Żaden z nich NIE zawiera fragmentu `skill-bridge-ai.vercel.app` (kropka po
 * `ai` nie występuje w prawdziwym adresie) — a `skillbridge.nordsignal`
 * i `nordsignal.cc` nie są adresami tej aplikacji w ogóle. Bramka nazywała
 * produkcję i nie trafiała w nią ani razu: przy `E2E_ALLOW_DB_WRITES=1`
 * i adresie produkcyjnym przepuszczała testy zapisujące.
 *
 * Ta sama rodzina wady, co „hard-deny" w `tools/assert-test-db.ts` — nazwa
 * wpisana z pamięci zamiast własności zmierzonej. Naprawa jest ta sama:
 * odwrócenie polaryzacji. Allowlista nie zna nazw produkcji i nie starzeje się,
 * gdy Vercel nada nowy alias albo dojdzie własna domena.
 */

/** Hosty lokalne — jedyne, na których zapis nie wymaga niczego więcej. */
const LOKALNE_HOSTY = ["localhost", "127.0.0.1", "::1"];

/** Zmienna, którą operator NAZYWA zdalny host dopuszczony do zapisu. */
export const ZMIENNA_ZDALNEGO_HOSTA = "E2E_ALLOW_REMOTE_BASE_URL_HOST";

/** Host z adresu bazowego; `null`, gdy adres jest nieparseowalny. */
export function hostAdresuBazowego(baseUrl: string): string | null {
	try {
		return new URL(baseUrl).hostname.replace(/^\[|\]$/g, "") || null;
	} catch {
		return null;
	}
}

export function czyHostLokalny(baseUrl: string): boolean {
	const host = hostAdresuBazowego(baseUrl);
	return host !== null && LOKALNE_HOSTY.includes(host);
}

/**
 * Rzuca, gdy na tym adresie nie wolno wykonywać testów zapisujących.
 *
 * @param baseUrl            PLAYWRIGHT_BASE_URL
 * @param nazwanyZdalnyHost  wartość E2E_ALLOW_REMOTE_BASE_URL_HOST (jeśli ustawiona)
 */
export function sprawdzAdresDlaZapisow(baseUrl: string, nazwanyZdalnyHost?: string): void {
	if (czyHostLokalny(baseUrl)) return;

	const host = hostAdresuBazowego(baseUrl);
	const nazwany = (nazwanyZdalnyHost ?? "").trim();

	if (host !== null && nazwany !== "" && host === nazwany) return;

	throw new Error(
		`ODMOWA: E2E_ALLOW_DB_WRITES=1 przy adresie spoza środowiska lokalnego (${baseUrl}). ` +
			`Testy zapisujące wolno puszczać na ${LOKALNE_HOSTY.join(", ")} albo na host, ` +
			`który nazwiesz w ${ZMIENNA_ZDALNEGO_HOSTA} (musi być DOKŁADNIE równy hostowi adresu). ` +
			`Bramka nie zna listy adresów produkcji — celowo: adresy się zmieniają, ` +
			`a lista zakazanych nazw starzeje się po cichu.`,
	);
}
