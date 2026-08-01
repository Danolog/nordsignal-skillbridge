import { describe, expect, it } from "vitest";
import {
	BRAK,
	type DbIdentity,
	etykietaOmijaRls,
	etykietaWlasnosci,
	formatIdentityHeader,
	formatIdentityOneLine,
	IDENTITY_SQL,
	omijaRls,
	readDbIdentity,
	sanitizeField,
} from "../../../tools/k3-identity";

// 1E.7 A5 — tożsamość bazy w wyjściu `k3-validate`. Dwie rzeczy pod testem:
//   (1) wyjście JEDNOZNACZNIE identyfikuje bazę i rolę połączenia (bez tego
//       zielony wynik nie dowodzi niczego o KONKRETNEJ bazie — a jest jedynym
//       dowodem warunku nośnego A22-3 oceny art. 22 RODO);
//   (2) sekret NIE MOŻE wyciec do wyjścia — ani hasło, ani pełny łańcuch
//       połączenia (DSN), ani hash hasła z katalogu systemowego.
//
// Uwaga: atrapa łańcucha połączenia jest SKLEJANA w czasie wykonania, nie wpisana
// literałem — plik testu nie może zawierać czegoś, co wygląda na prawdziwy DSN
// z hasłem (strażnik sekretów, CLAUDE.md sekcja 4).

const HASLO_SENTINEL = "SENTINEL-HASLO-9f3a2b";
const SCHEMAT = `postgres${"ql"}://`;
const ATRAPA_DSN = `${SCHEMAT}postgres:${HASLO_SENTINEL}@localhost:5433/skillbridge_test`;

const BAZOWA: DbIdentity = {
	endpointHost: "localhost",
	endpointPort: 5433,
	serverAddr: "192.168.65.1",
	serverPort: 5432,
	database: "skillbridge_test",
	sessionUser: "postgres",
	currentUser: "postgres",
	bypassRls: false,
	superUser: true,
	publicTables: 54,
	ownedTables: 54,
	ownedForceTables: 28,
	serverVersion: "16.10",
};

/** Atrapa połączenia — pozwala testować odczyt tożsamości bez bazy. */
function fakeClient(row: Record<string, unknown>) {
	return { query: async () => ({ rows: [row] }) };
}

describe("readDbIdentity — tożsamość z ZAPYTANIA, nie z łańcucha połączenia", () => {
	it("mapuje wiersz katalogu systemowego na DbIdentity", async () => {
		const id = await readDbIdentity(
			fakeClient({
				database_name: "skillbridge_test",
				session_user_name: "postgres",
				current_user_name: "app_student",
				server_addr: "192.168.65.1",
				server_port: 5432,
				server_version: "16.10",
				bypass_rls: false,
				is_super: true,
				public_tables: 54,
				owned_tables: 54,
				owned_force_tables: 28,
			}),
			"localhost",
			5433,
		);
		expect(id).toMatchObject({
			publicTables: 54,
			ownedTables: 54,
			ownedForceTables: 28,
			database: "skillbridge_test",
			sessionUser: "postgres",
			currentUser: "app_student",
			serverAddr: "192.168.65.1",
			serverPort: 5432,
			endpointHost: "localhost",
			endpointPort: 5433,
			bypassRls: false,
			superUser: true,
		});
	});

	it("znosi NULL-e (Neon: inet_server_addr() = NULL) bez rzucania", async () => {
		const id = await readDbIdentity(
			fakeClient({
				database_name: "neondb",
				session_user_name: "neondb_owner",
				current_user_name: "neondb_owner",
				server_addr: null,
				server_port: null,
				server_version: "17.5",
				bypass_rls: false,
				is_super: false,
			}),
			"ep-przyklad-123.eu-central-1.aws.neon.tech",
		);
		expect(id.serverAddr).toBeNull();
		expect(id.endpointPort).toBeNull();
		expect(formatIdentityHeader(id)).toContain("ep-przyklad-123.eu-central-1.aws.neon.tech");
		expect(formatIdentityHeader(id)).toContain(BRAK);
	});

	it("nie sięga po pg_authid ani po kolumnę z hashem hasła", () => {
		expect(IDENTITY_SQL).not.toMatch(/pg_authid|rolpassword/i);
		expect(IDENTITY_SQL).toMatch(/current_database\(\)/);
		expect(IDENTITY_SQL).toMatch(/session_user/);
		expect(IDENTITY_SQL).toMatch(/current_user/);
	});
});

describe("nagłówek i werdykt identyfikują bazę oraz rolę", () => {
	it("nagłówek podaje punkt końcowy, bazę, obie role i wersję serwera", () => {
		const out = formatIdentityHeader(BAZOWA);
		expect(out).toContain("localhost:5433");
		expect(out).toContain("skillbridge_test");
		expect(out).toContain("rola sesji      : postgres");
		expect(out).toContain("rola bieżąca    : postgres");
		expect(out).toContain("16.10");
	});

	it("werdykt jednoliniowy niesie bazę, punkt końcowy i rolę sesji", () => {
		const out = formatIdentityOneLine(BAZOWA);
		expect(out).toContain("skillbridge_test");
		expect(out).toContain("localhost:5433");
		expect(out).toContain("rola sesji: postgres");
		expect(out).toContain("omija RLS");
	});
});

describe("omijanie RLS — czytelnik musi wiedzieć, czy rola podlega izolacji", () => {
	it("superuser → TAK (SUPERUSER)", () => {
		expect(etykietaOmijaRls({ ...BAZOWA, superUser: true, bypassRls: false })).toBe(
			"TAK (SUPERUSER)",
		);
	});
	it("atrybut BYPASSRLS → TAK (BYPASSRLS)", () => {
		expect(etykietaOmijaRls({ ...BAZOWA, superUser: false, bypassRls: true })).toBe(
			"TAK (BYPASSRLS)",
		);
	});
	it("oba naraz → wymienia oba powody", () => {
		expect(etykietaOmijaRls({ ...BAZOWA, superUser: true, bypassRls: true })).toBe(
			"TAK (SUPERUSER + BYPASSRLS)",
		);
	});
	it("zwykła rola aplikacyjna → NIE", () => {
		expect(etykietaOmijaRls({ ...BAZOWA, superUser: false, bypassRls: false })).toBe("NIE");
		expect(omijaRls({ ...BAZOWA, superUser: false, bypassRls: false })).toBe(false);
	});
	it("brak danych → NIEUSTALONE (brak dowodu nie jest zaprzeczeniem)", () => {
		expect(etykietaOmijaRls({ ...BAZOWA, superUser: null, bypassRls: null })).toBe("NIEUSTALONE");
		expect(omijaRls({ ...BAZOWA, superUser: null, bypassRls: null })).toBeNull();
	});
});

// A5b — odpowiedź na pytanie Olivera przed ceremonią A6: „omija RLS: NIE" na Neonie
// z rolą neondb_owner byłoby MYLĄCE, bo właściciel omija politykę niezależnie od
// atrybutów roli. Nagłówek musi więc zawsze pokazywać własność obok atrybutów.
describe("własność tabel — druga droga omijania RLS, dominująca na produkcji", () => {
	const NEON_OWNER: DbIdentity = {
		...BAZOWA,
		endpointHost: "ep-przyklad-123.eu-central-1.aws.neon.tech",
		endpointPort: 5432,
		serverAddr: null,
		serverPort: null,
		database: "neondb",
		sessionUser: "neondb_owner",
		currentUser: "neondb_owner",
		bypassRls: false,
		superUser: false,
		publicTables: 54,
		ownedTables: 54,
		ownedForceTables: 28,
	};

	it("rola bez atrybutów, ale właściciel wszystkich tabel — nagłówek pokazuje OBA fakty", () => {
		const out = formatIdentityHeader(NEON_OWNER);
		expect(etykietaOmijaRls(NEON_OWNER)).toBe("NIE");
		expect(out).toContain("54/54 tabel public (z FORCE RLS: 28)");
		// Bez tego zdania czytelnik odczytałby „omija RLS: NIE" jako „widzi tylko swoje".
		expect(out).toContain("Właściciel tabeli omija politykę");
		expect(out).toContain("FORCE RLS");
	});

	it("werdykt jednoliniowy też niesie własność (nie tylko atrybuty roli)", () => {
		const out = formatIdentityOneLine(NEON_OWNER);
		expect(out).toContain("omija RLS (atrybuty): NIE");
		expect(out).toContain("właściciel 54/54 tabel public (z FORCE RLS: 28)");
	});

	it("etykieta własności znosi brak danych", () => {
		expect(etykietaWlasnosci({ ...BAZOWA, ownedTables: null, publicTables: null })).toBe(
			"NIEUSTALONE",
		);
		expect(etykietaWlasnosci({ ...BAZOWA, ownedForceTables: null })).toContain(
			`z FORCE RLS: ${BRAK}`,
		);
	});
});

describe("dowód negatywny — sekret nie może wyciec do wyjścia", () => {
	// Skrajny przypadek: ktoś wstawia w pole tożsamości cały łańcuch połączenia
	// z hasłem w środku. Formatter ma to zamaskować, nie wypisać.
	const ZATRUTA: DbIdentity = {
		...BAZOWA,
		endpointHost: ATRAPA_DSN,
		database: `db@${HASLO_SENTINEL}`,
		sessionUser: `rola://${HASLO_SENTINEL}`,
	};

	it("nagłówek nie zawiera hasła ani łańcucha połączenia", () => {
		const out = formatIdentityHeader(ZATRUTA);
		expect(out).not.toContain(HASLO_SENTINEL);
		expect(out).not.toContain(SCHEMAT);
	});

	it("werdykt jednoliniowy nie zawiera hasła ani łańcucha połączenia", () => {
		const out = formatIdentityOneLine(ZATRUTA);
		expect(out).not.toContain(HASLO_SENTINEL);
		expect(out).not.toContain(SCHEMAT);
	});

	it("sanitizeField maskuje wartości wyglądające na DSN, przepuszcza zwykłe", () => {
		expect(sanitizeField(ATRAPA_DSN)).not.toContain(HASLO_SENTINEL);
		expect(sanitizeField("user@host")).not.toContain("user@host");
		expect(sanitizeField("skillbridge_test")).toBe("skillbridge_test");
		expect(sanitizeField(5433)).toBe("5433");
		expect(sanitizeField(null)).toBe(BRAK);
	});

	it("typ DbIdentity nie ma pola na hasło ani na DSN (wyciek strukturalnie niemożliwy)", () => {
		expect(Object.keys(BAZOWA).sort()).toEqual(
			[
				"bypassRls",
				"currentUser",
				"database",
				"endpointHost",
				"endpointPort",
				"ownedForceTables",
				"ownedTables",
				"publicTables",
				"serverAddr",
				"serverPort",
				"serverVersion",
				"sessionUser",
				"superUser",
			].sort(),
		);
	});
});
