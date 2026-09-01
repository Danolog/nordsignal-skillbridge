// Strażnik NOŚNIKA reguły „co z odmowy serwera trafia na ekran".
// Strażnik ekranowy (czy to faktycznie dociera do człowieka) stoi osobno:
// src/components/auth/__tests__/login-form-odmowa.test.tsx

import { describe, expect, it } from "vitest";
import {
	KODY_ZASTEPOWANE,
	komunikatBramkiHaslowej,
	komunikatOdmowy,
} from "@/lib/auth/komunikat-odmowy";
import { KOMUNIKAT_ODMOWY } from "@/lib/auth/lista-dostepu";

const ZAPASOWY = "Nieprawidłowy email lub hasło";

describe("komunikatOdmowy — przepust selektywny", () => {
	it("PRZEPUSZCZA naszą odmowę z listy dostępu (403, bez pola code)", () => {
		const wynik = komunikatOdmowy(
			{ message: KOMUNIKAT_ODMOWY, status: 403, statusText: "FORBIDDEN" },
			ZAPASOWY,
		);
		expect(wynik).toBe(KOMUNIKAT_ODMOWY);
	});

	it("ZASTĘPUJE słownik poświadczeń biblioteki", () => {
		const wynik = komunikatOdmowy(
			{
				message: "Invalid email or password",
				code: "INVALID_EMAIL_OR_PASSWORD",
				status: 401,
			},
			ZAPASOWY,
		);
		expect(wynik).toBe(ZAPASOWY);
	});

	it("ZASTĘPUJE komunikat wyliczający konta, mimo że ma status 403 jak nasz", () => {
		// Ten przypadek jest powodem, dla którego wybieramy po `code`, a nie po
		// statusie: gdyby regułą był status, ta treść trafiłaby na ekran.
		const wynik = komunikatOdmowy(
			{ message: "Email not verified", code: "EMAIL_NOT_VERIFIED", status: 403 },
			ZAPASOWY,
		);
		expect(wynik).toBe(ZAPASOWY);
	});

	it("PRZEPUSZCZA błąd serwera spoza słownika poświadczeń — cisza jest gorsza", () => {
		// Błąd konfiguracji ma być GŁOŚNY. Zastąpienie go tekstem o haśle to
		// dokładnie mechanizm, który wyprodukował sześć dni ciszy.
		const wynik = komunikatOdmowy(
			{ message: "Za dużo żądań, spróbuj później", status: 429 },
			ZAPASOWY,
		);
		expect(wynik).toBe("Za dużo żądań, spróbuj później");
	});

	it("NIE przepuszcza zwykłego wyjątku (brak pola status)", () => {
		expect(komunikatOdmowy(new TypeError("fetch failed"), ZAPASOWY)).toBe(ZAPASOWY);
	});

	it("NIE przepuszcza treści awarii serwera (5xx) — warunek W8", () => {
		// Kształt zmierzony na prawdziwej bibliotece: `APIError` 5xx Z TREŚCIĄ
		// i BEZ pola `code`, czyli dokładnie to, co rzuca `dispatch.mjs:73`.
		// Bez warunku `status >= 500` ta treść szła na ekran dosłownie.
		const wynik = komunikatOdmowy(
			{
				message:
					"An error occurred during hook matcher execution. Check the logs for more details.",
				status: 500,
				statusText: "INTERNAL_SERVER_ERROR",
			},
			ZAPASOWY,
		);
		expect(wynik).toBe(ZAPASOWY);
		expect(wynik).not.toContain("Check the logs");
	});

	it("NIE przepuszcza 5xx także wtedy, gdy błąd NIESIE kod", () => {
		// Granica warunku od drugiej strony: o 5xx decyduje status, nie `code`.
		expect(komunikatOdmowy({ message: "Boom", code: "COKOLWIEK", status: 503 }, ZAPASOWY)).toBe(
			ZAPASOWY,
		);
	});

	it("GRANICA — 4xx tuż pod progiem NADAL przechodzi", () => {
		// Kontrola dwustronna warunku W8: gdyby ktoś napisał `>= 400`, zamknąłby
		// przy okazji naszą odmowę 403 i przywrócił incydent.
		expect(komunikatOdmowy({ message: "Za dużo żądań", status: 429 }, ZAPASOWY)).toBe(
			"Za dużo żądań",
		);
		expect(komunikatOdmowy({ message: KOMUNIKAT_ODMOWY, status: 403 }, ZAPASOWY)).toBe(
			KOMUNIKAT_ODMOWY,
		);
	});

	it("oddaje tekst zapasowy przy braku błędu, pustej treści i wartościach nie-obiektowych", () => {
		expect(komunikatOdmowy(null, ZAPASOWY)).toBe(ZAPASOWY);
		expect(komunikatOdmowy(undefined, ZAPASOWY)).toBe(ZAPASOWY);
		expect(komunikatOdmowy("napis", ZAPASOWY)).toBe(ZAPASOWY);
		expect(komunikatOdmowy({ message: "   ", status: 403 }, ZAPASOWY)).toBe(ZAPASOWY);
		expect(komunikatOdmowy({ status: 403 }, ZAPASOWY)).toBe(ZAPASOWY);
	});

	it("ŚWIADOMIE przepuszcza komunikat o zajętym adresie (decyzja Ryana/Sophii, nie widoku)", () => {
		// KOD MUSI BYĆ TEN, KTÓRY FAKTYCZNIE PADA NA NASZEJ TRASIE (warunek W9).
		// `sign-up.mjs:208` rzuca `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, a nie
		// `USER_ALREADY_EXISTS` — biblioteka ma OBA kody. Atrapa cytująca zły
		// z nich wyglądałaby na strażnika, a pilnowałaby ścieżki, której nie ma.
		expect(KODY_ZASTEPOWANE.has("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe(false);
		const wynik = komunikatOdmowy(
			{
				message: "User already exists. Use another email.",
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
				status: 422,
			},
			"Nie udało się utworzyć konta",
		);
		expect(wynik).toBe("User already exists. Use another email.");
	});

	it("kontrola liczności — zbiór zastępowanych kodów NIE jest pusty", () => {
		// Pusty zbiór zamieniłby przepust selektywny w hurtowy, a wszystkie
		// asercje wyżej poza jedną nadal by przechodziły.
		expect(KODY_ZASTEPOWANE.size).toBe(2);
		expect([...KODY_ZASTEPOWANE].sort()).toEqual([
			"EMAIL_NOT_VERIFIED",
			"INVALID_EMAIL_OR_PASSWORD",
		]);
	});
});

describe("komunikatBramkiHaslowej — panel uczelni i kolejka recenzji", () => {
	it("401 to jedyny przypadek, w którym winimy hasło", () => {
		expect(komunikatBramkiHaslowej(401)).toBe("Nieprawidłowe hasło");
	});

	it("404 (zgaszona flaga) NIE mówi człowiekowi, że pomylił hasło", () => {
		const wynik = komunikatBramkiHaslowej(404);
		expect(wynik).not.toBe("Nieprawidłowe hasło");
		expect(wynik).toContain("404");
		expect(wynik).toContain("nie jest problem z Twoim hasłem");
	});

	it("500 (błąd konfiguracji) NIE mówi człowiekowi, że pomylił hasło", () => {
		const wynik = komunikatBramkiHaslowej(500);
		expect(wynik).not.toBe("Nieprawidłowe hasło");
		expect(wynik).toContain("500");
	});

	it("429 dostaje własne wyjaśnienie zamiast tekstu o haśle", () => {
		expect(komunikatBramkiHaslowej(429)).toContain("Za dużo prób");
	});

	it("NIE zdradza wewnętrznych napisów serwera", () => {
		for (const status of [403, 404, 500]) {
			const wynik = komunikatBramkiHaslowej(status);
			expect(wynik).not.toContain("Server misconfigured");
			expect(wynik).not.toContain("Not found");
			expect(wynik).not.toContain("Forbidden");
		}
	});
});
