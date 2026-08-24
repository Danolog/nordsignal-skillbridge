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

describe("sonda D2 w transakcji — koszt po pomiarze (W11)", () => {
	it("DRUGIE żądanie w procesie wysyła TRZY polecenia, nie pięć", async () => {
		// Sedno W11: para SAVEPOINT/RELEASE była BEZWARUNKOWA, więc kosztowała dwa
		// obiegi do bazy w każdej transakcji najemcy NA ZAWSZE — długo po tym, jak
		// sonda skończyła mierzyć. Zmierzone przez Leo (#345, 16:23:31 CEST):
		//   PIERWSZE: 5 poleceń, DRUGIE: 5 poleceń.
		//
		// Poprzedni strażnik („mierzy RAZ na proces") tego NIE łapał, bo liczył
		// wyłącznie zapytanie tożsamości — obiecywał w nazwie własność, której
		// mierzył połowę. Ten przypadek liczy WSZYSTKIE polecenia transakcji.
		//
		// ROZBIEŻNOŚĆ Z PRZEGLĄDEM, ZAPISANA JAWNIE: Leo podał „PIERWSZE żądanie:
		// 5 poleceń", ale jego własne wyliczenie ma SZEŚĆ pozycji (set_config ×2,
		// SET LOCAL ROLE, SAVEPOINT, IDENTITY_SQL, RELEASE). Odtworzone tutaj
		// wykonaniem: pierwsze żądanie = 6, drugie przed naprawą = 5, drugie po
		// naprawie = 3. Etykieta „5" przy pierwszym była omyłką w liczeniu, nie
		// różnicą w kodzie — wniosek Leo (para punktu zapisu jest bezwarunkowa)
		// stoi bez zmian i to on był nośny.
		const { withTenantContext } = await import("@/lib/db/tenant-context");

		await withTenantContext(KONTEKST, async () => "pierwsze");
		const poPierwszym = [...wykonane];
		wykonane.length = 0;
		await withTenantContext(KONTEKST, async () => "drugie");

		expect(poPierwszym).toHaveLength(6); // set_config ×2, SET LOCAL ROLE, SAVEPOINT, IDENTITY_SQL, RELEASE
		expect(wykonane).toHaveLength(3); // set_config ×2, SET LOCAL ROLE — i nic więcej
		expect(wykonane).not.toContain("SAVEPOINT sonda_d2");
		expect(wykonane).not.toContain("RELEASE SAVEPOINT sonda_d2");
	});
});

describe("sonda D2 w transakcji — punkt zapisu: KOLEJNOŚĆ POLECEŃ, nie zachowanie bazy", () => {
	it("KOLEJNOŚĆ POLECEŃ przy padzie: ROLLBACK TO SAVEPOINT, praca żądania wykonana (NIE mierzy bazy)", async () => {
		padnijNaTozsamosci = true;
		const { withTenantContext } = await import("@/lib/db/tenant-context");

		const wynik = await withTenantContext(KONTEKST, async () => "praca-wykonana");

		// (1) Żądanie NIE zostało przerwane przez narzędzie pomiarowe.
		expect(wynik).toBe("praca-wykonana");
		// (2) Transakcja została cofnięta do punktu zapisu, czyli NIE jest zatruta.
		expect(
			wykonane,
			"ZASIĘG TEGO STRAŻNIKA: mierzy KOLEJNOŚĆ POLECEŃ wysłanych do atrapy, " +
				"a NIE zachowanie PostgreSQL. Nie wolno cytować jego zieleni jako dowodu, " +
				"że wycofanie ratuje unieważnioną transakcję ani że rola przeżywa wycofanie. " +
				"Te dwie własności zmierzył przegląd Leo #345 na PostgreSQL 16.14 " +
				"(2026-08-24 16:21:04 CEST): po ROLLBACK TO SAVEPOINT — session_user=app_runtime, " +
				"current_user=app_student, transakcja żyje, wierszy=0.",
		).toContain("ROLLBACK TO SAVEPOINT sonda_d2");
		expect(wykonane).not.toContain("RELEASE SAVEPOINT sonda_d2");
	});

	it("KOLEJNOŚĆ POLECEŃ przy powodzeniu: RELEASE, punkt zapisu nie zostaje otwarty", async () => {
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
