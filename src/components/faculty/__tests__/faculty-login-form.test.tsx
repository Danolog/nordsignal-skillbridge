// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyLoginForm } from "../faculty-login-form";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("FacultyLoginForm", () => {
	it("renders password input and submit button", () => {
		render(<FacultyLoginForm />);
		expect(screen.getByLabelText("Hasło dostępu")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Zaloguj się" })).toBeInTheDocument();
	});

	it("renders title", () => {
		render(<FacultyLoginForm />);
		expect(screen.getByText("Panel Uczelni")).toBeInTheDocument();
	});

	it("navigates to /faculty on successful login", async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ success: true }) });
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "test123" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/faculty");
		});

		vi.unstubAllGlobals();
	});

	it("shows error on wrong password", async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "wrong" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		await waitFor(() => {
			expect(screen.getByText("Nieprawidłowe hasło")).toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it("shows loading state while submitting", async () => {
		let resolvePromise: ((value: unknown) => void) | undefined;
		const fetchPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});
		const mockFetch = vi.fn().mockReturnValue(fetchPromise);
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "test" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		expect(screen.getByText("Logowanie...")).toBeInTheDocument();

		resolvePromise?.({ ok: true, json: () => ({ success: true }) });

		await waitFor(() => {
			expect(screen.queryByText("Logowanie...")).not.toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it("shows connection error on network failure", async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "test" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		await waitFor(() => {
			expect(screen.getByText("Błąd połączenia. Spróbuj ponownie.")).toBeInTheDocument();
		});

		vi.unstubAllGlobals();
	});

	it("disables button while loading", async () => {
		const mockFetch = vi.fn().mockReturnValue(new Promise(() => {}));
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "test" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		expect(screen.getByRole("button")).toBeDisabled();

		vi.unstubAllGlobals();
	});

	it("sends POST request with password", async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({ success: true }) });
		vi.stubGlobal("fetch", mockFetch);

		render(<FacultyLoginForm />);
		fireEvent.change(screen.getByLabelText("Hasło dostępu"), { target: { value: "secret" } });
		fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/faculty/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "secret" }),
			});
		});

		vi.unstubAllGlobals();
	});
});
