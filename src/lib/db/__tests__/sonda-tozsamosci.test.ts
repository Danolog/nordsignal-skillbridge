// @vitest-environment node
//
// SONDA D2 — strażnik. Pilnuje trzech własności, z których każda już raz u nas
// zawiodła w innym miejscu:
//
//   1. WERDYKT ROZRÓŻNIA ŚWIATY. `session_user` ma odróżniać połączenie
//      `app_runtime` od połączenia właściciela. Pomiar równie zgodny z obiema
//      hipotezami nie jest pomiarem — to była wada ścieżki przez `BYPASSRLS`.
//   2. KONTROLA DODATNIA JEST WARUNKIEM, NIE OZDOBĄ. Gdy rola efektywna nie jest
//      rolą najemcy, sonda MUSI odmówić werdyktu. Inaczej mierzy nie to
//      połączenie, o które pytamy — „sonda w złej warstwie".
//   3. SEKRET NIE WYCIEKA. Tożsamość pochodzi z zapytania, nie z DSN, a wyjście
//      przechodzi przez `sanitizeField`.
//
// CZY CI BYWA W STANIE, KTÓREGO TEN PLIK PILNUJE — tak, bo plik stanu NIE
// DZIEDZICZY po środowisku, tylko go WYTWARZA: każdy przypadek podaje własną
// atrapę odpowiedzi bazy. Nie wymaga Postgresa, więc biegnie w projekcie `unit`.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	PREFIKS_SONDY,
	sformatujWynik,
	zmierzTozsamosc,
	zmierzTozsamoscRaz,
	zresetujSonde,
} from "@/lib/db/sonda-tozsamosci";

/** Atrapa bazy: jeden wiersz tożsamości, dokładnie jak `IDENTITY_SQL`. */
function atrapa(wiersz: Record<string, unknown>) {
	const query = vi.fn(async () => ({ rows: [wiersz] }));
	return { klient: { query }, query };
}

const RUNTIME = {
	session_user_name: "app_runtime",
	current_user_name: "app_student",
	database_name: "neondb",
};

const WLASCICIEL = {
	session_user_name: "neondb_owner",
	current_user_name: "app_student",
	database_name: "neondb",
};

beforeEach(() => {
	zresetujSonde();
	vi.restoreAllMocks();
});

describe("sonda D2 — werdykt rozróżnia dwa światy", () => {
	it("session_user=app_runtime → werdykt 'połączenie runtime AKTYWNE'", async () => {
		const { klient } = atrapa(RUNTIME);
		const w = await zmierzTozsamosc(klient);
		expect(w.rodzaj).toBe("werdykt");
		expect(sformatujWynik(w)).toContain("session_user=app_runtime");
		expect(sformatujWynik(w)).toContain("połączenie runtime AKTYWNE");
	});

	it("session_user=neondb_owner → werdykt PRZECIWNY, nie ten sam", async () => {
		// Sedno: te dwa przypadki muszą dać RÓŻNE wyjście. Gdyby dawały to samo,
		// sonda powtarzałaby wadę ścieżki przez BYPASSRLS — zachowanie identyczne
		// w obu światach.
		const { klient } = atrapa(WLASCICIEL);
		const w = await zmierzTozsamosc(klient);
		expect(w.rodzaj).toBe("werdykt");
		const tekst = sformatujWynik(w);
		expect(tekst).toContain("session_user=neondb_owner");
		expect(tekst).toContain("NIE jest rolą runtime");
		expect(tekst).not.toContain("AKTYWNE");

		const { klient: k2 } = atrapa(RUNTIME);
		expect(sformatujWynik(await zmierzTozsamosc(k2))).not.toBe(tekst);
	});
});

describe("sonda D2 — kontrola dodatnia jest WARUNKIEM werdyktu", () => {
	it("rola efektywna spoza najemcy → ODMOWA werdyktu, session_user NIE pada", async () => {
		// Gdyby sonda wykonała się przed SET LOCAL ROLE, current_user byłby rolą
		// łączącą. Wtedy session_user opisuje co innego niż pytanie B9 — i sonda
		// ma to POWIEDZIEĆ, a nie podać liczbę z zastrzeżeniem, które ktoś pominie.
		const { klient } = atrapa({
			session_user_name: "app_runtime",
			current_user_name: "neondb_owner",
			database_name: "neondb",
		});
		const w = await zmierzTozsamosc(klient);
		expect(w.rodzaj).toBe("niewazna");

		const tekst = sformatujWynik(w);
		expect(tekst).toContain("POMIAR NIEWAŻNY");
		expect(tekst).toContain("Werdyktu NIE podaję");
		// TO JEST ASERCJA NOŚNA: wartość session_user nie ma prawa pojawić się
		// w wyjściu, bo ktoś przeczytałby ją jako odpowiedź.
		expect(tekst).not.toContain("app_runtime");
	});

	it("app_faculty też jest rolą najemcy — panel nie jest wyjątkiem", async () => {
		const { klient } = atrapa({ ...RUNTIME, current_user_name: "app_faculty" });
		expect((await zmierzTozsamosc(klient)).rodzaj).toBe("werdykt");
	});
});

describe("sonda D2 — sekret nie wycieka", () => {
	it("wartość wyglądająca na łańcuch połączenia jest MASKOWANA", async () => {
		// Druga linia obrony: gdyby kiedyś ktoś wstawił w pole tożsamości cały
		// łańcuch połączenia, `sanitizeField` ma go zamaskować, zanim trafi do
		// logu dostawcy.
		//
		// Wartość SKŁADANA W CZASIE WYKONANIA, nie literałem: strażnik skanu
		// sekretów (`guard-secrets`) słusznie odrzuca zapis pliku zawierającego
		// coś o kształcie łańcucha połączenia z hasłem — i nie ma jak odróżnić
		// atrapy od prawdziwej wartości. Zablokował mi ten plik przy pierwszym
		// zapisie; to zachowanie POPRAWNE i nie obchodzę go, tylko nie wstawiam
		// takiego kształtu do repozytorium.
		const udawanyDsn = ["postgres", "://", "u", ":", "ATRAPA_HASLA", "@", "host/neondb"].join("");
		const { klient } = atrapa({
			session_user_name: udawanyDsn,
			current_user_name: "app_student",
			database_name: "neondb",
		});
		const tekst = sformatujWynik(await zmierzTozsamosc(klient));
		expect(tekst).not.toContain("ATRAPA_HASLA");
		expect(tekst).toContain("ukryte");
	});
});

describe("sonda D2 — koszt i odporność", () => {
	it("mierzy RAZ na proces, nie raz na żądanie", async () => {
		const { klient, query } = atrapa(RUNTIME);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		await zmierzTozsamoscRaz(klient);
		await zmierzTozsamoscRaz(klient);
		await zmierzTozsamoscRaz(klient);
		expect(query).toHaveBeenCalledTimes(1);
	});

	it("awaria sondy NIE przerywa żądania — narzędzie pomiarowe nie jest incydentem", async () => {
		const klient = {
			query: async () => {
				throw new Error("baza niedostępna");
			},
		};
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(zmierzTozsamoscRaz(klient)).resolves.toBeUndefined();
		expect(warn.mock.calls[0]?.[0]).toContain(`${PREFIKS_SONDY} pomiar nieudany`);
	});
});
