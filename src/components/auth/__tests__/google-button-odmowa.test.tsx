// @vitest-environment jsdom
//
// STRAŻNIK ŚCIEŻKI GOOGLE (warunek W19, przegląd Leo).
//
// Ta ścieżka nie miała ŻADNEGO pokrycia i niosła dwie wady naraz, obie gorsze
// od incydentu, który naprawia to zgłoszenie:
//   1. treść błędu serwera szła na ekran bez filtru (plik omijał nośnik),
//   2. przy błędzie serwera nie pokazywał się ŻADEN komunikat, a przycisk
//      zostawał w stanie ładowania na zawsze.
//
// Przyczyna (2) jest zmierzona, nie domniemana: `signIn.social` NIE RZUCA,
// tylko ODDAJE błąd, a `setLoading(false)` stało wyłącznie w `catch`.
//   RZUCIL: false
//   WYNIK:  {"data":null,"error":{"message":"Unable to create verification",
//            "status":500,"statusText":""}}
//
// Asercje stoją na tym, co widzi człowiek: treść podana do powiadomienia
// i STAN PRZYCISKU. Nie na tym, że funkcja została zawołana.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleButton } from "../google-button";

const mockSignInSocial = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
	toast: { error: (...a: unknown[]) => mockToastError(...a) },
}));

vi.mock("@/lib/auth/client", () => ({
	authClient: {
		signIn: {
			social: (...a: unknown[]) => mockSignInSocial(...a),
		},
	},
}));

/** Kształt zmierzony na dziewiątym miejscu bez kodu — `oauth2/state.mjs:26`. */
const AWARIA_TWORZENIA_WERYFIKACJI = {
	message: "Unable to create verification",
	status: 500,
	statusText: "",
};

const zobaczonePrzypadki: string[] = [];

async function kliknij(nazwaPrzypadku: string) {
	zobaczonePrzypadki.push(nazwaPrzypadku);
	await userEvent.setup().click(screen.getByRole("button", { name: /Kontynuuj z Google/ }));
}

describe("GoogleButton — odmowa serwera dociera i przycisk się odblokowuje", () => {
	beforeEach(() => {
		mockSignInSocial.mockReset();
		mockToastError.mockReset();
	});

	it("przy awarii serwera (500) POKAZUJE komunikat i NIE zdradza treści serwera", async () => {
		mockSignInSocial.mockResolvedValue({ data: null, error: AWARIA_TWORZENIA_WERYFIKACJI });
		render(<GoogleButton />);
		await kliknij("awaria-500");

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledTimes(1);
		});
		// Wewnętrzna treść biblioteki nie trafia do człowieka...
		expect(mockToastError).not.toHaveBeenCalledWith("Unable to create verification");
		// ...a coś sensownego trafia.
		expect(mockToastError).toHaveBeenCalledWith("Nie udało się zalogować przez Google");
	});

	it("przy awarii serwera PRZYCISK PRZESTAJE SIĘ KRĘCIĆ", async () => {
		mockSignInSocial.mockResolvedValue({ data: null, error: AWARIA_TWORZENIA_WERYFIKACJI });
		render(<GoogleButton />);
		await kliknij("awaria-500-stan-przycisku");

		// To jest ta druga, osobna wada: wcześniej przycisk zostawał w
		// „Przekierowanie…" na zawsze, bo `setLoading(false)` stało w martwym `catch`.
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /Kontynuuj z Google/ })).toBeEnabled();
		});
		expect(screen.queryByText("Przekierowanie...")).not.toBeInTheDocument();
	});

	it("KONTROLA DODATNIA — przy powodzeniu ani odmowy, ani przedwczesnego gaszenia", async () => {
		mockSignInSocial.mockResolvedValue({
			data: { url: "https://accounts.google.com" },
			error: null,
		});
		render(<GoogleButton />);
		await kliknij("powodzenie");

		await waitFor(() => {
			expect(mockSignInSocial).toHaveBeenCalledTimes(1);
		});
		// (1) żadnego błędu na ekranie…
		expect(mockToastError).not.toHaveBeenCalled();
		// (2) …i stan ładowania ZOSTAJE. Przekierowanie do dostawcy ma prawo trwać;
		// zgaszenie go tutaj dałoby mrugnięcie przycisku tuż przed opuszczeniem
		// strony i zapraszało do drugiego kliknięcia w trakcie nawigacji.
		expect(screen.getByRole("button", { name: /Przekierowanie/ })).toBeDisabled();
	});

	it("przy zerwanym połączeniu NIE wypuszcza wewnętrznej treści wyjątku", async () => {
		mockSignInSocial.mockRejectedValue(new TypeError("fetch failed"));
		render(<GoogleButton />);
		await kliknij("zerwane-polaczenie");

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith("Nie udało się zalogować przez Google");
		});
		expect(mockToastError).not.toHaveBeenCalledWith("fetch failed");
	});

	it("kontrola liczności — strażnik zobaczył wszystkie cztery przypadki", () => {
		expect(zobaczonePrzypadki).toEqual([
			"awaria-500",
			"awaria-500-stan-przycisku",
			"powodzenie",
			"zerwane-polaczenie",
		]);
	});
});
