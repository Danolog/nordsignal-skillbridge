import { describe, expect, it } from "vitest";
import {
	czyObserwacjaWsteczna,
	klasyfikujZdarzenie,
	raportTekstowy,
	SQL_KANDYDACI,
	type WierszKandydat,
	zbierzMiernik,
} from "../placement-metric";

/**
 * STRAŻNIK W2 (Sophia, 2026-08-13) — rozjazd „wpis po diagnozie" ma być WIDOCZNY.
 *
 * ── Skąd ten strażnik ─────────────────────────────────────────────────────
 * Przesłanka, którą Sophia sama sprostowała: złączenie w mierniku idzie
 * WYŁĄCZNIE po tożsamości, nigdzie nie ma porównania czasu. Wpis do rejestru
 * działa więc WSTECZ — dopisanie kogoś dziś sprawia, że jego zeszłotygodniowa
 * diagnoza staje się obserwacją, po cichu i bez śladu.
 *
 * To znaczy, że reguły „wpis przed diagnozą" nie trzyma żaden mechanizm, tylko
 * dyscyplina operatora. Można puścić dziesięć osób przez diagnozę, obejrzeć
 * wyniki i wpisać tę siódemkę, której wyszło — miernik pokaże siedem obserwacji
 * prawdziwych co do wiersza, a mianownik będzie dobrany do licznika.
 *
 * Świadomie tego NIE BLOKUJEMY (blokada kusi do obejścia, a ciężka ceremonia
 * psuje pomiar, który ma chronić — argument W1 Sophii). Pokazujemy.
 */

const BAZOWY: WierszKandydat = {
	zdarzenieId: "zd-1",
	akcja: "curriculum.placement.computed",
	utworzono: new Date("2026-08-10T10:00:00Z"),
	sesjaId: "sesja-1",
	studentId: "student-1",
	kohorta: "ds-2026",
	wpisano: new Date("2026-08-01T10:00:00Z"),
	kontoWygladaTechnicznie: false,
	metadata: null,
};

const k = (n: Partial<WierszKandydat>): WierszKandydat => ({ ...BAZOWY, ...n });

describe("czyObserwacjaWsteczna — wykrywa wpis po fakcie", () => {
	it("kontrola dodatnia: wpis PRZED zdarzeniem to nie jest rozjazd", () => {
		expect(czyObserwacjaWsteczna(BAZOWY)).toBe(false);
	});

	it("zdarzenie WCZEŚNIEJSZE niż wpis → rozjazd", () => {
		expect(
			czyObserwacjaWsteczna(
				k({
					utworzono: new Date("2026-08-01T09:00:00Z"),
					wpisano: new Date("2026-08-10T10:00:00Z"),
				}),
			),
		).toBe(true);
	});

	it("nie oskarża, gdy nie wie: brak daty wpisu → false", () => {
		expect(czyObserwacjaWsteczna(k({ wpisano: null, kohorta: null }))).toBe(false);
	});

	it("dotyczy WYŁĄCZNIE obserwacji — sierota i spoza rejestru nie liczą się", () => {
		const wsteczne = {
			utworzono: new Date("2026-08-01T09:00:00Z"),
			wpisano: new Date("2026-08-10T10:00:00Z"),
		};
		expect(czyObserwacjaWsteczna(k({ ...wsteczne, sesjaId: null }))).toBe(false);
		expect(czyObserwacjaWsteczna(k({ ...wsteczne, kohorta: null }))).toBe(false);
	});

	it("NIE zmienia klasyfikacji — obserwacja wsteczna pozostaje obserwacją", () => {
		// Sedno: klasyfikator zostaje jedynym miejscem orzekającym „obserwacja".
		// Gdyby W2 zaczęło odejmować takie zdarzenia, rozliczenie
		// „obserwacje + odrzucone = zdarzenia" przestałoby się domykać.
		const wsteczna = k({
			utworzono: new Date("2026-08-01T09:00:00Z"),
			wpisano: new Date("2026-08-10T10:00:00Z"),
		});
		expect(klasyfikujZdarzenie(wsteczna)).toBe("obserwacja");
	});
});

describe("miernik i raport pokazują rozjazd", () => {
	const wykonawca =
		(kandydaci: Record<string, unknown>[], rejestr: Record<string, unknown>[]) =>
		async (sql: string) => {
			if (sql.includes("current_database")) return [{ baza: "neondb", rola: "neondb_owner" }];
			if (sql.includes("pilot_participants pp\n\tJOIN")) return rejestr;
			if (sql === SQL_KANDYDACI) return kandydaci;
			return rejestr;
		};

	const wierszSql = (utworzono: string, wpisano: string) => ({
		zdarzenie_id: `zd-${utworzono}`,
		akcja: "curriculum.placement.computed",
		utworzono: new Date(utworzono),
		sesja_id: "sesja-1",
		student_id: "student-1",
		kohorta: "ds-2026",
		wpisano: new Date(wpisano),
		konto_wyglada_technicznie: false,
		metadata: {},
	});

	const rejestrJeden = [
		{
			student_id: "student-1",
			cohort: "ds-2026",
			enrolled_at: new Date(),
			konto_wyglada_technicznie: false,
		},
	];

	it("liczy obserwacje wsteczne i wypisuje je w raporcie", async () => {
		const m = await zbierzMiernik(
			wykonawca(
				[
					wierszSql("2026-08-01T09:00:00Z", "2026-08-10T10:00:00Z"), // wsteczna
					wierszSql("2026-08-12T09:00:00Z", "2026-08-10T10:00:00Z"), // porządna
				],
				rejestrJeden,
			),
		);

		expect(m.obserwacjeWsteczne).toBe(1);
		// Rozliczenie musi się nadal domykać — W2 nie odejmuje obserwacji.
		expect(m.policzenia.length).toBe(2);

		const tekst = raportTekstowy(m);
		expect(tekst).toMatch(/obserwacje wpisane WSTECZ:\s+1/);
		expect(tekst).toMatch(/CZĘŚĆ OBSERWACJI WESZŁA PO FAKCIE/);
		expect(tekst).toMatch(/NIE BYŁ prerejestrowany/);
	});

	it("kontrola dodatnia: gdy dyscyplina utrzymana, raport nie straszy", async () => {
		const m = await zbierzMiernik(
			wykonawca([wierszSql("2026-08-12T09:00:00Z", "2026-08-10T10:00:00Z")], rejestrJeden),
		);

		expect(m.obserwacjeWsteczne).toBe(0);
		const tekst = raportTekstowy(m);
		expect(tekst).toMatch(/obserwacje wpisane WSTECZ:\s+0/);
		expect(tekst).not.toMatch(/CZĘŚĆ OBSERWACJI WESZŁA PO FAKCIE/);
	});

	it("zapytanie po kandydatów w ogóle pobiera datę wpisu (bez niej licznik jest ślepy)", () => {
		// Dotąd `enrolled_at` NIE był pobierany po stronie kandydatów — stąd cisza.
		expect(SQL_KANDYDACI).toMatch(/pp\.enrolled_at\s+AS wpisano/);
	});
});
