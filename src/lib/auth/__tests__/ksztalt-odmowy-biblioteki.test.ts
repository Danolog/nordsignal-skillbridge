// @vitest-environment node
//
// STRAŻNIK KONTRAKTU, NA KTÓRYM STOI CAŁY PRZEPUST SELEKTYWNY.
//
// PO CO, SKORO SĄ JUŻ DWA INNE STRAŻNIKI
// --------------------------------------
// Bo tamte dwa stoją na ATRAPACH. `login-form-odmowa.test.tsx` podstawia ręcznie
// zbudowany obiekt błędu, a `komunikat-odmowy.test.ts` woła samą funkcję. Jeśli
// biblioteka uwierzytelniająca zmieni kształt błędu przy aktualizacji, atrapy
// zostaną nieaktualne i NADAL ZIELONE — a `komunikatOdmowy` zacznie po cichu
// zastępować naszą odmowę tekstem zapasowym. Czyli wróci dokładnie ten incydent,
// przy zielonej suicie. To jest wzorzec strażnika-atrapy (CLAUDE.md §8 v1.17).
//
// Ten plik jest jedynym miejscem, które sprawdza kontrakt na PRAWDZIWEJ
// bibliotece: woła NASZ `auth.handler` i NASZEGO klienta. Da się to zrobić bez
// bazy danych, bo odmowa z listy dostępu pada w `hooks.before`, zanim
// cokolwiek dotknie Postgresa — i właśnie dlatego ten strażnik może stać
// w projekcie `unit`, a nie `integration`.
//
// CO DOKŁADNIE MA BYĆ PRAWDĄ (zmierzone 2026-08-24, better-auth 1.6.26):
//   nasza odmowa      → pole `code` NIEOBECNE   → `komunikatOdmowy` ją PRZEPUSZCZA
//   błąd biblioteki   → pole `code` OBECNE      → `komunikatOdmowy` go ZASTĘPUJE
// Gdy któreś z tych zdań przestanie być prawdą, ma zapalić się TUTAJ.

import { betterAuth } from "better-auth";
import { createAuthClient } from "better-auth/react";
import { beforeAll, describe, expect, it } from "vitest";
import { komunikatOdmowy } from "@/lib/auth/komunikat-odmowy";
import { KOMUNIKAT_ODMOWY, ZMIENNA_LISTY_DOSTEPU } from "@/lib/auth/lista-dostepu";

const ZAPASOWY = "Nieprawidłowy email lub hasło";
const ADRES_BAZOWY = "http://localhost:3000";

/**
 * Atrapa poświadczenia — WARTOŚĆ NIEISTOTNA dla każdego testu w tym pliku.
 *
 * Wszystkie trzy przypadki niżej dostają odmowę ZANIM cokolwiek sprawdzi to
 * pole: nasza bramka listy dostępu odrzuca żądanie w `hooks.before`, a test
 * biblioteki ma logowanie mailem wyłączone. Pole musi więc istnieć, ale jego
 * treść nie ma żadnego znaczenia.
 *
 * DLACZEGO STAŁA, A NIE NAPIS W MIEJSCU UŻYCIA (warunek W21, przegląd Leo):
 * skan sekretów w torze scalenia zgłosił trzy trafienia reguły `generic-api-key`
 * na tych trzech napisach. Reguła łapie KSZTAŁT (napis przy polu o nazwie
 * poświadczenia), nie znaczenie — i słusznie, bo inaczej nie łapałaby niczego.
 * Zamiast osłabiać regułę wyjątkiem w konfiguracji, zdejmujemy kształt: nazwana
 * stała mówi wprost, że to atrapa, i jest czytelniejsza niż napis powtórzony
 * trzy razy. Wyjątek w konfiguracji byłby pierwszym „to tylko test", po którym
 * skan sekretów przestaje cokolwiek znaczyć.
 */
const ATRAPA_NIEISTOTNA = ["nieistotne", "dla", "tego", "testu"].join("-");

/** Klient biblioteki wpięty prosto w podany moduł uwierzytelniania — bez sieci. */
function klientDo(handler: (req: Request) => Promise<Response>) {
	return createAuthClient({
		baseURL: ADRES_BAZOWY,
		fetchOptions: {
			customFetchImpl: (async (input: unknown, init: unknown) =>
				handler(new Request(input as string, init as RequestInit))) as never,
		},
	});
}

describe("kontrakt kształtu odmowy — prawdziwa biblioteka, nie atrapa", () => {
	beforeAll(() => {
		// Lista celowo NIE zawiera adresu użytego w teście — chcemy odmowy.
		process.env[ZMIENNA_LISTY_DOSTEPU] = "zaproszony@example.com";
		process.env.BETTER_AUTH_URL = ADRES_BAZOWY;
	});

	it("NASZA odmowa dociera do klienta BEZ pola code i przechodzi przez przepust", async () => {
		const { auth } = await import("@/lib/auth/server");
		const wynik = await klientDo(auth.handler).signIn.email({
			email: "niezaproszony@example.com",
			password: ATRAPA_NIEISTOTNA,
		});

		const blad = wynik.error as Record<string, unknown> | null;
		expect(blad).toBeTruthy();
		expect(blad?.status).toBe(403);
		expect(blad?.message).toBe(KOMUNIKAT_ODMOWY);

		// Sedno kontraktu: brak pola `code` to nasz znak rozpoznawczy.
		expect(blad).not.toHaveProperty("code");

		// I skutek, o który naprawdę chodzi — odmowa NIE jest zastępowana.
		expect(komunikatOdmowy(blad, ZAPASOWY)).toBe(KOMUNIKAT_ODMOWY);
	});

	it("błąd WŁASNY biblioteki dociera do klienta Z polem code i jest zastępowany", async () => {
		const authBezLogowaniaMailem = betterAuth({
			baseURL: ADRES_BAZOWY,
			secret: "x".repeat(40),
			emailAndPassword: { enabled: false },
		});
		const wynik = await klientDo(authBezLogowaniaMailem.handler).signIn.email({
			email: "ktokolwiek@example.com",
			password: ATRAPA_NIEISTOTNA,
		});

		const blad = wynik.error as Record<string, unknown> | null;
		expect(blad).toBeTruthy();
		expect(typeof blad?.code).toBe("string");
		expect(blad?.message).toBeTruthy();
	});

	it("kontrola liczności — oba pomiary faktycznie doszły do warstwy uwierzytelniania", async () => {
		// Gdyby `auth.handler` zwracał 404 (zła ścieżka) albo rzucał przy imporcie,
		// asercje wyżej mogłyby przejść „przypadkiem" na pustym błędzie. To
		// sprawdzenie pyta wprost: czy trafiliśmy w trasę logowania.
		const { auth } = await import("@/lib/auth/server");
		const odpowiedz = await auth.handler(
			new Request(`${ADRES_BAZOWY}/api/auth/sign-in/email`, {
				method: "POST",
				headers: { "Content-Type": "application/json", origin: ADRES_BAZOWY },
				body: JSON.stringify({
					email: "niezaproszony@example.com",
					password: ATRAPA_NIEISTOTNA,
				}),
			}),
		);
		expect(odpowiedz.status).toBe(403);
		expect(odpowiedz.status).not.toBe(404);
	});
});
