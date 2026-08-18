/**
 * Test funkcji czystej strażnika sieci — granica „sieć zewnętrzna kontra lokalna".
 *
 * Biegnie w projekcie `unit`: klasyfikator nie rusza sieci ani bazy, więc nie ma
 * powodu wymagać do niego Postgresa. Uzbrojenia strażnika w realnym przebiegu
 * pilnuje osobna kontrola dodatnia (`network-guard.integration.test.ts`) — tu
 * sprawdzamy samą regułę, tam jej działanie.
 */

import { describe, expect, it } from "vitest";
import { HOSTY_LOKALNE, zbudujKomunikat, zdiagnozujWyjscieSieciowe } from "../network-guard";

describe("strażnik sieci · klasyfikator wyjścia", () => {
	it("blokuje hosta zewnętrznego i nazywa go", () => {
		const d = zdiagnozujWyjscieSieciowe("https://api.github.com/repos/student/analiza");
		expect(d.blokowane).toBe(true);
		expect(d).toMatchObject({ host: "api.github.com" });
	});

	it("blokuje każdego zewnętrznego dostawcę, nie tylko GitHuba", () => {
		for (const adres of [
			"https://api.anthropic.com/v1/messages",
			"http://example.com/",
			"https://8.8.8.8/",
		]) {
			expect(zdiagnozujWyjscieSieciowe(adres).blokowane, adres).toBe(true);
		}
	});

	// Kontrola dwustronna: strażnik ma NIE czerwienić się na ruchu, który sam
	// postawiliśmy. Inaczej wywróciłby zestaw i zostałby wyciszony w tydzień.
	it("przepuszcza pętlę zwrotną we wszystkich zapisach z allowlisty", () => {
		// PRZYPIĘCIE ZAWARTOŚCI — MUSI STAĆ PRZED PĘTLĄ.
		//
		// Bez tej linii test iterował po tej samej tablicy, którą sprawdza: pusta
		// tablica dawała pustą pętlę i zieleń. „Pusty zbiór przechodzi każdy test"
		// — wewnątrz strażnika zbudowanego po to, żeby tę klasę tępić (znalezisko
		// Leo przy przeglądzie #332, 2026-08-17; kontrola liczności obowiązuje też
		// kontrolę liczności).
		//
		// Stawka nie jest teoretyczna: ta lista trzyma wyjątek dla NASZEGO mostu
		// w CI. Zepsuta i nieprzypięta przechodziłaby testy jednostkowe, a zestaw
		// integracyjny zacząłby padać komunikatem o żywym wyjściu sieciowym —
		// czyli myląco, dokładnie jak przed naprawą z #332.
		//
		// Przypięcie łapie zepsucie w OBIE strony: opróżnienie listy i dopisanie
		// do niej obcego adresu (rozszczelnienie granicy) czerwienią tak samo.
		expect(HOSTY_LOKALNE).toEqual(["localhost", "127.0.0.1", "::1"]);

		for (const host of HOSTY_LOKALNE) {
			const adres = host === "::1" ? "http://[::1]:5432/db" : `http://${host}:5432/db`;
			expect(zdiagnozujWyjscieSieciowe(adres), adres).toEqual({
				blokowane: false,
				powod: "lokalny",
			});
		}
	});

	it("przepuszcza adresy, które w ogóle nie wychodzą do sieci", () => {
		expect(zdiagnozujWyjscieSieciowe("data:text/plain,abc").blokowane).toBe(false);
		expect(zdiagnozujWyjscieSieciowe("file:///tmp/a.txt").blokowane).toBe(false);
	});

	it("przepuszcza adres nieparsowalny — tam nie ma sieci do zablokowania", () => {
		expect(zdiagnozujWyjscieSieciowe("/api/lokalna-sciezka")).toEqual({
			blokowane: false,
			powod: "nieparsowalny",
		});
	});

	// Sedno wartości strażnika: pad ma mówić GDZIE, nie „coś padło".
	it("komunikat porażki niesie adres, który wyszedł na zewnątrz", () => {
		const k = zbudujKomunikat(["https://api.github.com/repos/student/analiza"]);
		expect(k).toContain("https://api.github.com/repos/student/analiza");
		expect(k).toContain("SIECI ZEWNĘTRZNEJ");
	});
});
