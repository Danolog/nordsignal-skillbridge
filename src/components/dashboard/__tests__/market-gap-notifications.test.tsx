// @vitest-environment jsdom
/**
 * AG.6 — stany komponentu powiadomień „nowa luka”:
 *   flaga off → nic; brak decyzji → karta zgody RODO; zgoda + zdarzenia →
 *   lista; odmowa / zgoda bez zdarzeń → nic. Akcje robią POST + router.refresh
 *   (komponent celowo bez lustrzanego stanu — źródłem prawdy jest serwer).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarketNotificationsState } from "@/lib/market-notifications";
import { MarketGapNotifications } from "../market-gap-notifications";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const NOTIF = {
	id: "e-1",
	competencyName: "Kubernetes",
	priority: "critical",
	marketPercentage: 55,
	createdAt: "2026-07-08T10:00:00.000Z",
};

function state(over: Partial<MarketNotificationsState>): MarketNotificationsState {
	return { enabled: true, decided: false, consent: false, notifications: [], ...over };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockFetch.mockResolvedValue({ ok: true });
});

describe("MarketGapNotifications", () => {
	it("flaga off → renderuje nic (nawet przy zaległych zdarzeniach)", () => {
		const { container } = render(
			<MarketGapNotifications
				state={state({ enabled: false, decided: true, consent: true, notifications: [NOTIF] })}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("brak decyzji → karta zgody; „Włącz” POST-uje consent=true i odświeża", async () => {
		render(<MarketGapNotifications state={state({})} />);
		expect(screen.getByText("Powiadomienia o zmianach na rynku pracy")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Włącz powiadomienia" }));
		await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/market-notifications/consent",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ consent: true }) }),
		);
	});

	it("„Nie chcę powiadomień” POST-uje consent=false", async () => {
		render(<MarketGapNotifications state={state({})} />);
		fireEvent.click(screen.getByRole("button", { name: "Nie chcę powiadomień" }));
		await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/market-notifications/consent",
			expect.objectContaining({ body: JSON.stringify({ consent: false }) }),
		);
	});

	it("odmowa albo zgoda bez zdarzeń → nic (zero nagabywania)", () => {
		const declined = render(
			<MarketGapNotifications state={state({ decided: true, consent: false })} />,
		);
		expect(declined.container).toBeEmptyDOMElement();
		const empty = render(
			<MarketGapNotifications state={state({ decided: true, consent: true })} />,
		);
		expect(empty.container).toBeEmptyDOMElement();
	});

	it("zgoda + zdarzenia → lista z nazwą, priorytetem i % ofert; mark-read POST + refresh", async () => {
		render(
			<MarketGapNotifications
				state={state({ decided: true, consent: true, notifications: [NOTIF] })}
			/>,
		);
		expect(screen.getByText("Nowa luka z rynku")).toBeInTheDocument();
		expect(screen.getByText("Kubernetes")).toBeInTheDocument();
		expect(screen.getByText(/Luka krytyczna/)).toBeInTheDocument();
		expect(screen.getByText(/55% ofert/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Oznacz jako przeczytane" }));
		await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
		expect(mockFetch).toHaveBeenCalledWith(
			"/api/market-notifications/read",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("błąd POST → toast błędu, bez refresh (stan serwera niezmieniony)", async () => {
		const { toast } = await import("sonner");
		mockFetch.mockResolvedValue({ ok: false });
		render(<MarketGapNotifications state={state({})} />);
		fireEvent.click(screen.getByRole("button", { name: "Włącz powiadomienia" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		expect(mockRefresh).not.toHaveBeenCalled();
	});
});
