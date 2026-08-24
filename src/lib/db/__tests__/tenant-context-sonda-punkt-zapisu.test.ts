// @vitest-environment node
//
// SONDA D2 W TRANSAKCJI — punkt zapisu (ang. savepoint).
//
// CZEGO PILNUJE TEN PLIK I DLACZEGO POWSTAŁ
// -----------------------------------------
// Sonda D2 wykonuje dodatkowe zapytanie WEWNĄTRZ transakcji `withTenantContext`.
// W PostgreSQL zapytanie, które rzuci wewnątrz transakcji, unieważnia CAŁĄ
// transakcję: każde kolejne zapytanie pada na „current transaction is aborted".
//
// Sam `try/catch` w sondzie tego NIE naprawia — połyka wyjątek, a transakcja
// zostaje zatruta. Nagłówek sondy deklarował „awaria sondy nie przerywa
// żądania"; bez punktu zapisu byłaby to DEKLARACJA BEZ POKRYCIA, czyli ta sama
// klasa wady, którą opisuje `#335`: gwarancja w komentarzu, której nikt nie
// pilnuje.
//
// Stąd asercja na SKUTKU: przy padzie sondy transakcja musi dostać
// `ROLLBACK TO SAVEPOINT`, a właściwa praca żądania musi się wykonać mimo to.
//
// Test nie potrzebuje bazy — pyta o KOLEJNOŚĆ POLECEŃ wysłanych do transakcji,
// a to jest dokładnie ta własność, która decyduje o zatruciu.

import { beforeEach, describe, expect, it, vi } from "vitest";

const wykonane: string[] = [];
let padnijNaTozsamosci = false;

/**
 * Wyłuskuje treść polecenia z obiektu Drizzle.
 *
 * Kształt sprawdzony wykonaniem, nie z pamięci: `sql.raw("SAVEPOINT sonda_d2")`
 * daje `queryChunks: [{ value: ["SAVEPOINT sonda_d2"] }]`. Pierwsza wersja tego
 * pliku czytała nieistniejące pole `.sql` i dostawała `[object Object]` — trzy
 * asercje padały na atrapie, nie na kodzie produkcyjnym.
 */
function tekstZapytania(zapytanie: unknown): string {
	if (typeof zapytanie === "string") return zapytanie;
	const chunks = (zapytanie as { queryChunks?: Array<{ value?: unknown }> })?.queryChunks;
	if (!Array.isArray(chunks)) return String(zapytanie);
	return chunks
		.map((c) => (Array.isArray(c?.value) ? c.value.join("") : ""))
		.join("")
		.trim();
}

/** Atrapa transakcji Drizzle: zapisuje treść poleceń, udaje wynik `pg`. */
const tx = {
	execute: vi.fn(async (zapytanie: unknown) => {
		const tekst = tekstZapytania(zapytanie);
		wykonane.push(tekst);
		if (tekst.includes("session_user")) {
			if (padnijNaTozsamosci) throw new Error("permission denied for table pg_authid");
			return {
				rows: [
					{
						session_user_name: "app_runtime",
						current_user_name: "app_student",
						database_name: "neondb",
					},
				],
			};
		}
		return { rows: [] };
	}),
};

vi.mock("@/lib/db", () => ({
	dbRuntime: {
		transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
	},
	db: {},
}));

beforeEach(async () => {
	wykonane.length = 0;
	padnijNaTozsamosci = false;
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const { zresetujSonde } = await import("@/lib/db/sonda-tozsamosci");
	zresetujSonde();
});

const KONTEKST = { userId: "u1", tenantId: "t1", role: "student" as const };

describe("sonda D2 w transakcji — kolejność względem SET LOCAL ROLE", () => {
	it("mierzy PO przełączeniu roli, nie przed", async () => {
		// Gdyby sonda szła przed SET LOCAL ROLE, jej kontrola dodatnia nie miałaby
		// czego potwierdzić — mierzyłaby rolę łączącą, nie kontekst najemcy.
		const { withTenantContext } = await import("@/lib/db/tenant-context");
		await withTenantContext(KONTEKST, async () => "ok");

		const iRola = wykonane.findIndex((q) => q.includes("SET LOCAL ROLE"));
		const iSonda = wykonane.findIndex((q) => q.includes("session_user"));
		expect(iRola).toBeGreaterThanOrEqual(0);
		expect(iSonda).toBeGreaterThan(iRola);
	});
});

describe("sonda D2 w transakcji — punkt zapisu chroni żądanie", () => {
	it("gdy sonda PADNIE: ROLLBACK TO SAVEPOINT, a praca żądania i tak się wykonuje", async () => {
		padnijNaTozsamosci = true;
		const { withTenantContext } = await import("@/lib/db/tenant-context");

		const wynik = await withTenantContext(KONTEKST, async () => "praca-wykonana");

		// (1) Żądanie NIE zostało przerwane przez narzędzie pomiarowe.
		expect(wynik).toBe("praca-wykonana");
		// (2) Transakcja została cofnięta do punktu zapisu, czyli NIE jest zatruta.
		expect(wykonane).toContain("ROLLBACK TO SAVEPOINT sonda_d2");
		expect(wykonane).not.toContain("RELEASE SAVEPOINT sonda_d2");
	});

	it("gdy sonda przejdzie: RELEASE SAVEPOINT — punkt zapisu nie zostaje otwarty", async () => {
		// Kontrola dodatnia. Bez niej „jest ROLLBACK" byłoby prawdą także wtedy,
		// gdyby kod cofał punkt zapisu ZAWSZE — czyli gdyby sonda nigdy nie
		// działała, a my byśmy tego nie zauważyli.
		const { withTenantContext } = await import("@/lib/db/tenant-context");
		await withTenantContext(KONTEKST, async () => "ok");

		expect(wykonane).toContain("SAVEPOINT sonda_d2");
		expect(wykonane).toContain("RELEASE SAVEPOINT sonda_d2");
		expect(wykonane).not.toContain("ROLLBACK TO SAVEPOINT sonda_d2");
	});
});
