// ============================================================================
// 1E.7 / D11 — STRAŻNIK REGUŁY WYŁĄCZENIA. Ten plik ma się CZERWIENIĆ przy
// mutacji reguły, a nie tylko ją opisywać.
//
// DLACZEGO TAK OSTRO: 2026-08-01 Leo pokazał MUTACJĄ, nie czytaniem, że trzej
// strażnicy tej samej funkcji nic nie strzegli — mutacja jednego pola przeżyła
// 2013 testów przy zielonej suicie. Każdy przypadek niżej jest dobrany tak, żeby
// KONKRETNA mutacja `klasyfikujZdarzenie` go zapaliła; przy każdym stoi, która.
//
// CELOWO BEZ BAZY: reguła jest czystą funkcją nad faktami atrybucji, więc
// strażnik biegnie w projekcie `unit` i nie da się go „pominąć po cichu" brakiem
// DATABASE_URL. To świadoma obrona przed wzorcem „8 skipped wygląda jak sukces",
// który 2026-08-01 przepuścił trzy atrapy. Że SQL faktycznie dostarcza te fakty
// — dowodzi `placement-metric.integration.test.ts` (projekt `integration`).
// ============================================================================

import { describe, expect, it } from "vitest";
import {
	klasyfikujZdarzenie,
	OGRANICZENIA_WNIOSKOWANIA,
	raportTekstowy,
	SQL_KANDYDACI,
	type WierszKandydat,
	zbierzMiernik,
} from "../placement-metric";

/** Fakt atrybucji o wskazanym kształcie; reszta pól bez znaczenia dla reguły. */
function kandydat(nadpisz: Partial<WierszKandydat>): WierszKandydat {
	return {
		zdarzenieId: "zd-1",
		akcja: "curriculum.placement.computed",
		utworzono: new Date("2026-08-06T10:00:00Z"),
		sesjaId: "sesja-1",
		studentId: "student-1",
		kohorta: "pilotaz-1e7-2026-08",
		kontoWygladaTechnicznie: false,
		metadata: { threshold: 3, unlockedCount: 1 },
		...nadpisz,
	};
}

// ── Cztery kształty, które realnie istnieją w dzienniku produkcji ────────────
// Nazwy mówią, KTO stoi za wierszem — bo o to w tej regule chodzi.

/** Uczestnik pilotażu: sesja istnieje, jest w rejestrze. JEDYNA obserwacja. */
const UCZESTNIK = kandydat({ zdarzenieId: "zd-uczestnik" });

/** Konto techniczne QA (zapłon 2026-08-01): sesja istnieje, poza rejestrem. */
const KONTO_QA = kandydat({
	zdarzenieId: "zd-qa",
	studentId: "student-qa",
	kohorta: null,
	kontoWygladaTechnicznie: true,
});

/**
 * Konto ZESPOŁOWE — Darek przechodzący całą ścieżkę jako pierwszy (2026-08-06).
 *
 * ⚠ NAJWAŻNIEJSZY WIERSZ W TYM PLIKU. Wygląda dokładnie jak wiersz uczestnika:
 * sesja istnieje, adres najzwyklejszy pod słońcem, ZERO technicznych znaczników.
 * Jest tu po to, żeby zapalić się na czerwono przy każdej próbie przepisania
 * reguły na WYKLUCZAJĄCĄ (np. „odrzuć konta w domenie .invalid"): taka reguła
 * przepuściłaby ten wiersz do licznika i pilotaż wystartowałby ze 100%
 * skutecznością placementu, której nikt z zewnątrz nie odegrał.
 */
const KONTO_ZESPOLOWE = kandydat({
	zdarzenieId: "zd-zespol",
	studentId: "student-darek",
	kohorta: null,
	kontoWygladaTechnicznie: false,
});

/** Sierota: konto skasowane (art. 17), sesja znikła kaskadą, zdarzenie zostało. */
const SIEROTA = kandydat({
	zdarzenieId: "zd-sierota",
	sesjaId: null,
	studentId: null,
	kohorta: null,
});

describe("1E.7 D11 · reguła wyłączenia — jeden nośnik, mutacja czerwieni", () => {
	it("uczestnik z rejestru JEST obserwacją (kontrola dodatnia — strażnik nie pilnuje pustego zbioru)", () => {
		// Bez tego przypadku wszystkie asercje niżej spełniałaby reguła
		// „nigdy nic nie jest obserwacją", czyli miernik, który nie mierzy.
		expect(klasyfikujZdarzenie(UCZESTNIK)).toBe("obserwacja");
	});

	it("konto techniczne QA NIE jest obserwacją (mutacja: pominięcie warunku rejestru)", () => {
		expect(klasyfikujZdarzenie(KONTO_QA)).toBe("spoza_rejestru");
	});

	it("konto ZESPOŁOWE bez żadnego technicznego znacznika NIE jest obserwacją (mutacja: reguła wykluczająca po domenie)", () => {
		// Reguła oparta na `.invalid` odda tu „obserwacja" i test padnie —
		// o to dokładnie chodzi.
		expect(klasyfikujZdarzenie(KONTO_ZESPOLOWE)).toBe("spoza_rejestru");
	});

	it("sierota po skasowanym koncie NIE jest obserwacją (mutacja: potraktowanie braku sesji jak braku danych)", () => {
		expect(klasyfikujZdarzenie(SIEROTA)).toBe("sierota");
	});

	it("rozróżnik pomocniczy `.invalid` NIE ORZEKA — sam w sobie nie zmienia klasy", () => {
		// Dwa wiersze różniące się WYŁĄCZNIE rozróżnikiem pomocniczym mają tę samą
		// klasę. Gdyby ktoś wpuścił `kontoWygladaTechnicznie` do reguły, reguła
		// miałaby drugi nośnik — i pękłaby na koncie zespołowym wyżej.
		const wRejestrzeZwykle = kandydat({ kontoWygladaTechnicznie: false });
		const wRejestrzeTechniczne = kandydat({ kontoWygladaTechnicznie: true });
		expect(klasyfikujZdarzenie(wRejestrzeTechniczne)).toBe(klasyfikujZdarzenie(wRejestrzeZwykle));
		const pozaRejestremZwykle = kandydat({ kohorta: null, kontoWygladaTechnicznie: false });
		const pozaRejestremTechniczne = kandydat({ kohorta: null, kontoWygladaTechnicznie: true });
		expect(klasyfikujZdarzenie(pozaRejestremTechniczne)).toBe(
			klasyfikujZdarzenie(pozaRejestremZwykle),
		);
	});

	it("nieprzewidziany kształt wypada z licznika, nie wpada do niego (fail-closed)", () => {
		// Sesja bez właściciela nie powinna powstać — ale gdyby powstała, ma być
		// odrzucona, a nie policzona „bo prawie się zgadza".
		expect(klasyfikujZdarzenie(kandydat({ studentId: null }))).toBe("sierota");
	});
});

describe("1E.7 D11 · rozliczenie zdarzeń — liczba obserwacji nigdy sama", () => {
	const WSZYSTKIE = [UCZESTNIK, KONTO_QA, KONTO_ZESPOLOWE, SIEROTA];

	/** Wykonawca-atrapa: podmienia bazę, NIE podmienia reguły. */
	function wykonawca(kandydaci: WierszKandydat[], rejestr: Record<string, unknown>[]) {
		return async (sql: string) => {
			if (sql === SQL_KANDYDACI) {
				return kandydaci.map((k) => ({
					zdarzenie_id: k.zdarzenieId,
					akcja: k.akcja,
					utworzono: k.utworzono,
					sesja_id: k.sesjaId,
					student_id: k.studentId,
					kohorta: k.kohorta,
					konto_wyglada_technicznie: k.kontoWygladaTechnicznie,
					metadata: k.metadata,
				}));
			}
			return rejestr;
		};
	}

	it("z czterech zdarzeń liczy JEDNO — trzy w rozliczeniu odrzuconych", async () => {
		const m = await zbierzMiernik(
			wykonawca(WSZYSTKIE, [
				{
					student_id: "student-1",
					cohort: "pilotaz-1e7-2026-08",
					konto_wyglada_technicznie: false,
				},
			]),
		);
		expect(m.policzenia).toHaveLength(1);
		expect(m.policzenia[0]?.zdarzenieId).toBe("zd-uczestnik");
		expect(m.odrzucone).toEqual({
			sierota: 1,
			spozaRejestru: 2,
			spozaRejestruTechniczne: 1,
		});
		// Rozliczenie wyczerpujące: nic nie zniknęło po drodze.
		const suma =
			m.policzenia.length +
			m.pominieciaLiczenia.length +
			m.odrzucone.sierota +
			m.odrzucone.spozaRejestru;
		expect(suma).toBe(WSZYSTKIE.length);
	});

	it("pusty rejestr daje ZERO obserwacji przy czterech zdarzeniach w dzienniku", async () => {
		const m = await zbierzMiernik(
			wykonawca(
				WSZYSTKIE.map((k) => ({ ...k, kohorta: null })),
				[],
			),
		);
		expect(m.uczestnicyWRejestrze).toBe(0);
		expect(m.policzenia).toHaveLength(0);
		expect(m.odrzucone.sierota + m.odrzucone.spozaRejestru).toBe(WSZYSTKIE.length);
	});

	it("mianownik idzie z REJESTRU, nie z dziennika — uczestnik bez zdarzenia jest widoczny", async () => {
		// §6a: student, który nie zaznaczy żadnej kompetencji, nie odbywa testu,
		// więc nie zostawia zdarzenia. Gdyby mianownik szedł z dziennika, ta osoba
		// zniknęłaby z pomiaru bez śladu — jedyna jawna dziura stałaby się niewidoczna.
		const m = await zbierzMiernik(
			wykonawca(
				[UCZESTNIK],
				[
					{ student_id: "student-1", cohort: "k", konto_wyglada_technicznie: false },
					{ student_id: "student-2", cohort: "k", konto_wyglada_technicznie: false },
					{ student_id: "student-3", cohort: "k", konto_wyglada_technicznie: false },
				],
			),
		);
		expect(m.uczestnicyWRejestrze).toBe(3);
		expect(m.uczestnicyBezZdarzenia).toBe(2);
	});

	it("konto techniczne WPISANE do rejestru liczy się, ale zapala alarm o rejestrze", async () => {
		// Świadomy wybór: rejestr jest jedynym nośnikiem reguły, więc błędny wpis
		// naprawia się w REJESTRZE, a nie cichym filtrem w zapytaniu. Raport ma
		// o tym krzyczeć, żeby błąd nie przeżył pierwszego odczytu.
		const m = await zbierzMiernik(
			wykonawca(
				[kandydat({ kontoWygladaTechnicznie: true })],
				[{ student_id: "student-1", cohort: "k", konto_wyglada_technicznie: true }],
			),
		);
		expect(m.policzenia).toHaveLength(1);
		expect(m.rejestrPodejrzany).toBe(1);
		expect(raportTekstowy(m)).toContain("WPISY PODEJRZANE W REJESTRZE");
	});

	it("D0 — defekt liczenia stoi ODDZIELNIE od poprawnego celu spoza pilotażu", async () => {
		const m = await zbierzMiernik(
			wykonawca(
				[
					kandydat({
						zdarzenieId: "zd-defekt",
						akcja: "curriculum.placement.skipped",
						metadata: { reason: "missing_career_goal", goalSource: "none" },
					}),
					kandydat({
						zdarzenieId: "zd-poprawne",
						akcja: "curriculum.placement.skipped",
						metadata: { reason: "unmapped_career_goal", goalSource: "session" },
					}),
				],
				[{ student_id: "student-1", cohort: "k", konto_wyglada_technicznie: false }],
			),
		);
		expect(m.pominieciaLiczenia.map((p) => p.reason)).toEqual([
			"missing_career_goal",
			"unmapped_career_goal",
		]);
		const raport = raportTekstowy(m);
		expect(raport).toContain("DEFEKT liczenia (cel pusty)");
		expect(raport).toContain("poprawne (cel spoza pilotażu DS)");
	});
});

describe("1E.7 D5b · ograniczenia wnioskowania stoją PRZY liczbie", () => {
	it("raport nie potrafi wypisać liczb bez ograniczeń wnioskowania", async () => {
		const m = await zbierzMiernik(async () => [], {});
		const raport = raportTekstowy(m);
		expect(raport).toContain(OGRANICZENIA_WNIOSKOWANIA);
		// Ograniczenia PRZED liczbami — czytelnik ma je minąć, zanim zobaczy wynik.
		expect(raport.indexOf(OGRANICZENIA_WNIOSKOWANIA)).toBeLessThan(
			raport.indexOf("ROZLICZENIE ZDARZEŃ"),
		);
	});

	it("ograniczenia niosą cztery zakazy, na których stoi DECYZJA 2 i D0", () => {
		// Skrócenie tej listy do „ogólnej ostrożności" kasuje jej funkcję: to są
		// konkretne błędy odczytu, które ktoś realnie popełni przy pierwszym
		// spojrzeniu na dane (§6a + D5).
		expect(OGRANICZENIA_WNIOSKOWANIA).toContain("N JEST RZĘDU JEDNOSTEK");
		expect(OGRANICZENIA_WNIOSKOWANIA).toContain("unlockedCount=0");
		expect(OGRANICZENIA_WNIOSKOWANIA).toContain("blockingHoleReason");
		expect(OGRANICZENIA_WNIOSKOWANIA).toContain("zmieniać progu");
		expect(OGRANICZENIA_WNIOSKOWANIA).toContain("zdarzeniach ODRZUCONYCH");
	});
});

describe("1E.7 D11 · SQL kandydatów nie filtruje (drugi nośnik reguły byłby tutaj)", () => {
	it("zapytanie sięga rejestru WYŁĄCZNIE złączeniem zewnętrznym", () => {
		// Reguła ma jeden nośnik — klasyfikator. Gdyby ktoś dołożył filtr po
		// rejestrze do SQL-a, rozliczenie odrzuconych przestałoby działać (zdarzenia
		// odpadałyby przed klasyfikacją), a reguła miałaby dwie kopie do rozjechania.
		expect(SQL_KANDYDACI).toContain("LEFT JOIN pilot_participants pp");
		expect(SQL_KANDYDACI).not.toMatch(/\bINNER\s+JOIN\s+pilot_participants\b/i);
		expect(SQL_KANDYDACI).not.toMatch(/WHERE[\s\S]*pp\.cohort\s+IS\s+NOT\s+NULL/i);
	});
});
