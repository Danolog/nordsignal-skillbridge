// @vitest-environment jsdom
/**
 * B8/1.5 — widok kolejki recenzji: ładowanie → lista/pusta; Zatwierdź/Odrzuć
 * POST-ują decyzję (z notatką, gdy wpisana) i zdejmują wpis z listy; 409
 * (wyścig recenzentów) → toast + refetch. Dane z mockowanego fetch.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewQueueView } from "../review-queue-view";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const ITEM = {
	submissionId: "s-1",
	projectId: "p-1",
	projectTitle: "Dashboard sprzedaży w Streamlit",
	projectLevel: "L2",
	tenantSlug: "wsb-merito-szczecin",
	score: 52,
	machineStatus: "submitted",
	submittedAt: "2026-07-08T10:00:00.000Z",
};

function queueResponse(items: unknown[]) {
	return {
		ok: true,
		status: 200,
		json: async () => ({ reviewer: "quality_operator", queue: items }),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("ReviewQueueView", () => {
	it("pusta kolejka → komunikat, bez kart", async () => {
		mockFetch.mockResolvedValue(queueResponse([]));
		render(<ReviewQueueView reviewerKind="quality_operator" />);
		expect(await screen.findByText(/Kolejka pusta/)).toBeInTheDocument();
	});

	it("lista: tytuł projektu, wynik maszyny, rekomendacja pogranicza; opis roli operatora", async () => {
		mockFetch.mockResolvedValue(queueResponse([ITEM]));
		render(<ReviewQueueView reviewerKind="quality_operator" />);
		expect(await screen.findByText("Dashboard sprzedaży w Streamlit")).toBeInTheDocument();
		expect(screen.getByText(/wynik maszyny: 52\/100/)).toBeInTheDocument();
		expect(screen.getByText(/Pogranicze — decyzja człowieka/)).toBeInTheDocument();
		expect(screen.getByText(/wszystkich kampusów/)).toBeInTheDocument();
	});

	it("Zatwierdź: POST decision z notatką, wpis znika z listy", async () => {
		mockFetch.mockResolvedValueOnce(queueResponse([ITEM]));
		mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		render(<ReviewQueueView reviewerKind="quality_operator" />);

		fireEvent.change(await screen.findByPlaceholderText(/Notatka do decyzji/), {
			target: { value: "Solidna praca" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Zatwierdź/ }));

		await waitFor(() =>
			expect(screen.queryByText("Dashboard sprzedaży w Streamlit")).not.toBeInTheDocument(),
		);
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/review-queue/s-1/decision",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ decision: "approved", note: "Solidna praca" }),
			}),
		);
	});

	it("Odrzuć bez notatki: body bez pola note", async () => {
		mockFetch.mockResolvedValueOnce(queueResponse([ITEM]));
		mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		render(<ReviewQueueView reviewerKind="faculty" />);

		fireEvent.click(await screen.findByRole("button", { name: /Odrzuć/ }));
		await waitFor(() =>
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/review-queue/s-1/decision",
				expect.objectContaining({ body: JSON.stringify({ decision: "rejected" }) }),
			),
		);
		expect(screen.getByText(/swojego kampusu/)).toBeInTheDocument();
	});

	it("B7/1.16b: projekcja viva → chip stanu obrony; klik pobiera audytowany podgląd Q/A", async () => {
		const itemWithViva = {
			...ITEM,
			machineStatus: "verified",
			viva: { state: "failed", score: 3, questionCount: 3 },
		};
		mockFetch.mockResolvedValueOnce(queueResponse([itemWithViva]));
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				session: { id: "vs-1", status: "failed", result: null },
				exchange: [
					{
						position: 0,
						question: "Dlaczego pandas?",
						filePath: "analiza.py",
						excerpt: null,
						answer: "Bo tak.",
						verdict: { points: 1, justification: "Odpowiedź powierzchowna." },
					},
					{
						position: 1,
						question: "Jak walidowałeś dane?",
						filePath: null,
						excerpt: null,
						answer: null,
						verdict: null,
					},
				],
			}),
		});
		render(<ReviewQueueView reviewerKind="quality_operator" />);

		expect(await screen.findByText(/Obrona: niezaliczona \(3\/6 pkt\)/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Pokaż odpowiedzi obrony/ }));
		expect(await screen.findByText(/Dlaczego pandas\?/)).toBeInTheDocument();
		expect(screen.getByText("Bo tak.")).toBeInTheDocument();
		expect(screen.getByText(/1\/2 pkt — Odpowiedź powierzchowna\./)).toBeInTheDocument();
		expect(screen.getByText(/— brak odpowiedzi —/)).toBeInTheDocument();
		expect(mockFetch).toHaveBeenCalledWith("/api/review-queue/s-1/viva");

		// Zwiń/rozwiń NIE pobiera drugi raz (odczyt audytowany — cache po stronie UI).
		fireEvent.click(screen.getByRole("button", { name: /Ukryj obronę/ }));
		fireEvent.click(screen.getByRole("button", { name: /Pokaż odpowiedzi obrony/ }));
		expect(await screen.findByText("Bo tak.")).toBeInTheDocument();
		expect(mockFetch).toHaveBeenCalledTimes(2); // lista + jeden GET viva
	});

	it("B7/1.16b: wpis bez projekcji viva → sekcja obrony nie istnieje", async () => {
		mockFetch.mockResolvedValue(queueResponse([{ ...ITEM, viva: null }]));
		render(<ReviewQueueView reviewerKind="quality_operator" />);
		expect(await screen.findByText("Dashboard sprzedaży w Streamlit")).toBeInTheDocument();
		expect(screen.queryByText(/Obrona:/)).not.toBeInTheDocument();
	});

	it("409 (decyzja już zapadła) → toast błędu + refetch kolejki", async () => {
		const { toast } = await import("sonner");
		mockFetch.mockResolvedValueOnce(queueResponse([ITEM]));
		mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) });
		mockFetch.mockResolvedValueOnce(queueResponse([]));
		render(<ReviewQueueView reviewerKind="quality_operator" />);

		fireEvent.click(await screen.findByRole("button", { name: /Zatwierdź/ }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("już zapadła")),
		);
		expect(await screen.findByText(/Kolejka pusta/)).toBeInTheDocument();
		expect(mockFetch).toHaveBeenCalledTimes(3); // lista + decyzja + refetch
	});
});
