// @vitest-environment jsdom
//
// Strażnik EKRANOWY bramki hasłowej panelu uczelni.
//
// Osobny plik od `faculty-login-form.test.tsx` świadomie: tamten pilnuje
// renderowania i ścieżki szczęśliwej i jest dziś w cudzych rękach; ten pilnuje
// JEDNEJ reguły — że odpowiedź serwera inna niż 401 nie czyta się dla człowieka
// jako „pomyliłeś hasło". Tamten plik zostaje nietknięty.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyLoginForm } from "../faculty-login-form";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

const zobaczoneKody: number[] = [];

async function wyslijZOdpowiedzia(status: number) {
	zobaczoneKody.push(status);
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status }));
	render(<FacultyLoginForm />);
	fireEvent.change(screen.getByLabelText("Hasło dostępu"), {
		target: { value: "dowolne" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
}

describe("FacultyLoginForm — odmowa nie obwinia hasła bez powodu", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("401 — hasło faktycznie złe, wina użytkownika, komunikat bez zmian", async () => {
		await wyslijZOdpowiedzia(401);
		await waitFor(() => {
			expect(screen.getByText("Nieprawidłowe hasło")).toBeInTheDocument();
		});
	});

	it("404 (panel za zgaszoną flagą) — NIE pokazuje 'Nieprawidłowe hasło'", async () => {
		await wyslijZOdpowiedzia(404);
		await waitFor(() => {
			expect(screen.getByText(/nie jest problem z Twoim hasłem/)).toBeInTheDocument();
		});
		expect(screen.queryByText("Nieprawidłowe hasło")).not.toBeInTheDocument();
	});

	it("500 (błąd konfiguracji) — NIE pokazuje 'Nieprawidłowe hasło'", async () => {
		await wyslijZOdpowiedzia(500);
		await waitFor(() => {
			expect(screen.getByText(/nie jest problem z Twoim hasłem/)).toBeInTheDocument();
		});
		expect(screen.queryByText("Nieprawidłowe hasło")).not.toBeInTheDocument();
	});

	it("kontrola liczności — strażnik zobaczył trzy różne kody odpowiedzi", () => {
		expect(zobaczoneKody).toEqual([401, 404, 500]);
	});
});
