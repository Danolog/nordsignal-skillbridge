// @vitest-environment jsdom
//
// STRAŻNIK DOSTARCZANIA ODMOWY — incydent 2026-08-18…24.
//
// CZEGO TEN PLIK PILNUJE, A CZEGO NIE.
// Nie pilnuje treści stałej `KOMUNIKAT_ODMOWY` — tego pilnują już trzy asercje
// gdzie indziej i ŻADNA z nich nie mówi, że ta stała dociera do człowieka.
// Dokładnie ta luka kosztowała sześć dni: serwer odmawiał głośno, formularz
// połykał komunikat i podstawiał „Nieprawidłowy email lub hasło", więc 33 konta
// (z założycielem włącznie) dostawały samoobwiniające wyjaśnienie i nikt nie
// zgłosił incydentu.
//
// Dlatego każda asercja niżej stoi na TEKŚCIE WYRENDEROWANYM W DRZEWIE
// DOKUMENTU, a nie na wartości stałej. Stałą tylko importujemy — z tego samego
// nośnika, z którego bierze ją serwer — żeby strażnik nie trzymał jej kopii.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KOMUNIKAT_ODMOWY } from "@/lib/auth/lista-dostepu";
import { LoginForm } from "../login-form";

const mockPush = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/auth/client", () => ({
	authClient: {
		signIn: {
			email: (...args: unknown[]) => mockSignIn(...args),
		},
	},
}));

/** Wypełnia formularz i wysyła go. Zwraca, gdy React przemieli zdarzenie. */
async function zaloguj() {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Email"), "ktos@example.com");
	await user.type(screen.getByLabelText("Hasło"), "tajne-haslo-123");
	await user.click(screen.getByRole("button", { name: "Zaloguj się" }));
}

/**
 * KSZTAŁT BŁĘDU NIE JEST ZMYŚLONY. Zmierzony 2026-08-24 przez wywołanie
 * naszego prawdziwego `auth.handler` (better-auth 1.6.26 z blokady zależności)
 * prawdziwym klientem biblioteki:
 *   nasza odmowa      → klucze: message, status, statusText          (BEZ `code`)
 *   błąd biblioteki   → klucze: message, code, status, statusText    (Z `code`)
 * Gdyby ten kształt się rozjechał, strażnik zrobiłby się atrapą — dlatego
 * pomiar jest zapisany tutaj, a nie tylko w raporcie.
 */
const ODMOWA_Z_LISTY_DOSTEPU = {
	message: KOMUNIKAT_ODMOWY,
	status: 403,
	statusText: "FORBIDDEN",
};

const BLAD_POSWIADCZEN_BIBLIOTEKI = {
	message: "Invalid email or password",
	code: "INVALID_EMAIL_OR_PASSWORD",
	status: 401,
	statusText: "UNAUTHORIZED",
};

const BLAD_NIEZWERYFIKOWANY_MAIL = {
	message: "Email not verified",
	code: "EMAIL_NOT_VERIFIED",
	status: 403,
	statusText: "FORBIDDEN",
};

/**
 * KONTROLA LICZNOŚCI. Sprawdzenie, do którego nic nie dociera, melduje sukces —
 * u nas trafiło się to cztery razy w ciągu doby (pusty zbiór, nieosiągalny człon
 * koniunkcji, sonda w złej warstwie). Ten licznik odpowiada na pytanie „ile
 * przypadków ten plik w ogóle zobaczył" i sam się przewraca, gdy któryś
 * przypadek przestanie się wykonywać.
 */
const zobaczonePrzypadki: string[] = [];
function odnotuj(nazwa: string) {
	zobaczonePrzypadki.push(nazwa);
}

describe("LoginForm — dostarczanie odmowy serwera", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockSignIn.mockReset();
	});

	it("POKAZUJE komunikat serwera przy odmowie z listy dostępu", async () => {
		mockSignIn.mockResolvedValue({ error: ODMOWA_Z_LISTY_DOSTEPU });
		render(<LoginForm />);
		await zaloguj();

		// Asercja na tym, CO WIDZI CZŁOWIEK — nie na wartości stałej.
		await waitFor(() => {
			expect(screen.getByText(KOMUNIKAT_ODMOWY)).toBeInTheDocument();
		});
		// I jednocześnie: napis obwiniający użytkownika ZNIKA z ekranu.
		expect(screen.queryByText("Nieprawidłowy email lub hasło")).not.toBeInTheDocument();
		odnotuj("odmowa-z-listy-dostepu");
	});

	it("KONTROLA DWUSTRONNA — przy poprawnym logowaniu odmowy NIE MA na ekranie", async () => {
		mockSignIn.mockResolvedValue({ error: null });
		render(<LoginForm />);
		await zaloguj();

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/dashboard");
		});
		expect(screen.queryByText(KOMUNIKAT_ODMOWY)).not.toBeInTheDocument();
		expect(screen.queryByText("Nieprawidłowy email lub hasło")).not.toBeInTheDocument();
		odnotuj("poprawne-logowanie");
	});

	it("ZASTĘPUJE słownik biblioteki przy błędnych poświadczeniach", async () => {
		mockSignIn.mockResolvedValue({ error: BLAD_POSWIADCZEN_BIBLIOTEKI });
		render(<LoginForm />);
		await zaloguj();

		await waitFor(() => {
			expect(screen.getByText("Nieprawidłowy email lub hasło")).toBeInTheDocument();
		});
		// Angielski komunikat biblioteki nie trafia na polski ekran.
		expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument();
		odnotuj("bledne-poswiadczenia");
	});

	it("NIE WYPUSZCZA komunikatu wyliczającego konta (niezweryfikowany adres)", async () => {
		mockSignIn.mockResolvedValue({ error: BLAD_NIEZWERYFIKOWANY_MAIL });
		render(<LoginForm />);
		await zaloguj();

		await waitFor(() => {
			expect(screen.getByText("Nieprawidłowy email lub hasło")).toBeInTheDocument();
		});
		// „Email not verified" pada tylko dla adresu, który MA konto — to jest
		// wyliczanie kont i na ekran trafić nie może.
		expect(screen.queryByText("Email not verified")).not.toBeInTheDocument();
		odnotuj("wyliczanie-kont");
	});

	it("NIE WYPUSZCZA wewnętrznej treści wyjątku przy zerwanym połączeniu", async () => {
		mockSignIn.mockRejectedValue(new TypeError("fetch failed"));
		render(<LoginForm />);
		await zaloguj();

		await waitFor(() => {
			expect(screen.getByText("Coś poszło nie tak. Spróbuj ponownie.")).toBeInTheDocument();
		});
		expect(screen.queryByText("fetch failed")).not.toBeInTheDocument();
		odnotuj("zerwane-polaczenie");
	});

	it("kontrola liczności — plik zobaczył wszystkie pięć przypadków", () => {
		expect(zobaczonePrzypadki).toEqual([
			"odmowa-z-listy-dostepu",
			"poprawne-logowanie",
			"bledne-poswiadczenia",
			"wyliczanie-kont",
			"zerwane-polaczenie",
		]);
	});
});
