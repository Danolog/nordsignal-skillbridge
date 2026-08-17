/**
 * KONTROLA DODATNIA strażnika żywej sieci — żeby jego zbiór nie był pusty.
 *
 * W zdrowym zestawie rejestr naruszeń jest z definicji PUSTY, więc jego widok
 * niczego nie dowodzi — to ta sama pułapka, co asercja na pustej tabeli
 * („0 wierszy — asercja nic nie zmierzyła"). Ten plik w KAŻDYM przebiegu
 * integracyjnym celowo próbuje wyjść na zewnątrz i sprawdza, że dostał po
 * łapach. Jeśli ktoś rozbroi strażnika — wyłączy plik startowy, cofnie
 * podmianę `fetch`, poluzuje granicę — to zapala się TUTAJ, natychmiast,
 * zamiast czekać na następne wyjście do internetu wpuszczone po cichu.
 *
 * Reguła i uzasadnienie mają jeden nośnik: `src/test/network-guard.ts`.
 *
 * Bramka `isLocalTestDb` niżej jest tu BEZCZYNNA — ten plik nie dotyka bazy.
 * Trzymamy ją, bo spis `bramki-powielone-spis.test.ts` wymaga jej od każdego
 * pliku integracyjnego, a lista wyjątków jest zamknięta celowo. Ten plik nie
 * może przenieść się do projektu `unit` (tam strażnik nie jest uzbrojony),
 * więc konformizm jest tańszy niż rozpychanie listy wyjątków.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { czyStraznikUzbrojony, pobierzNaruszenia, wyczyscNaruszenia } from "../network-guard";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const ADRES_ZEWNETRZNY = "https://api.github.com/repos/student/analiza";

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("strażnik żywej sieci · kontrola dodatnia (projekt integration)", () => {
	// Naruszenia wywołane CELOWO sprzątamy sami, żeby hak `afterEach` z pliku
	// startowego nie przewrócił tego testu za to, co było jego przedmiotem.
	beforeEach(() => wyczyscNaruszenia());
	afterEach(() => wyczyscNaruszenia());

	it("strażnik jest uzbrojony w tym przebiegu", () => {
		expect(czyStraznikUzbrojony()).toBe(true);
	});

	it("żywe wyjście na zewnątrz jest odrzucane, a komunikat niesie adres", async () => {
		await expect(fetch(ADRES_ZEWNETRZNY)).rejects.toThrow(ADRES_ZEWNETRZNY);
	});

	/**
	 * Własność najważniejsza i nieoczywista. Kod produkcyjny łyka błędy sieci
	 * ŚWIADOMIE (`githubGet` zwraca `null` przy dowolnym wyjątku, trasa tutora
	 * opakowuje pobranie w `try/catch`). Gdyby strażnik tylko rzucał, taki
	 * `catch` zjadłby go i test byłby zielony mimo naruszenia — powstałby
	 * strażnik-atrapa. Rejestr jest odporny na połknięcie i to tu sprawdzamy,
	 * odtwarzając zachowanie produkcyjnego `catch`.
	 */
	it("naruszenie przeżywa produkcyjny catch, który połyka błąd sieci", async () => {
		const wynikJakWProdukcji = await (async () => {
			try {
				await fetch(ADRES_ZEWNETRZNY);
				return "poszlo-do-sieci";
			} catch {
				return null; // dokładnie to robi githubGet
			}
		})();

		expect(wynikJakWProdukcji).toBeNull();
		expect(pobierzNaruszenia()).toContain(ADRES_ZEWNETRZNY);
	});

	// Kontrola dwustronna w realnym przebiegu: strażnik nie rejestruje niczego,
	// gdy nikt nie wychodzi na zewnątrz.
	it("nie rejestruje naruszenia, gdy test nie rusza sieci", () => {
		expect(pobierzNaruszenia()).toEqual([]);
	});
});
