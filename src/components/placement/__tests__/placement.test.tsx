// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 1.17 — testy UI placementu z zamockowanym fetch: karta zgody w Wnioskach
 * (opt-in + baseline jednym zapisem) i sekcja profilu (stany zgody,
 * delete-on-revoke z potwierdzeniem, zgłoszenie zdarzenia).
 */

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		error: (...a: unknown[]) => toastError(...a),
		success: (...a: unknown[]) => toastSuccess(...a),
	},
}));
const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));

import { PlacementConsentCard } from "../consent-card";
import { PlacementSection } from "../placement-section";

// jsdom nie ma scrollIntoView/hasPointerCapture — Radix Select woła oba przy
// otwarciu listy. Stub per plik (wzorzec tutor-panel.test — vitest izoluje
// jsdom per plik, nic nie wycieka).
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
	value: () => {},
	writable: true,
	configurable: true,
});
Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
	value: () => false,
	writable: true,
	configurable: true,
});

type FetchStub = ReturnType<typeof vi.fn>;
function stubFetch(): FetchStub {
	const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
	vi.stubGlobal("fetch", stub);
	return stub;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("PlacementConsentCard (krok Wnioski)", () => {
	it("bez zaznaczenia zgody nie ma selecta ani zapisu (czysty opt-in)", () => {
		stubFetch();
		render(<PlacementConsentCard />);
		expect(screen.getByText(/Pomóż nam mierzyć/)).toBeInTheDocument();
		expect(screen.queryByText("Zapisz")).not.toBeInTheDocument();
	});

	it("zgoda + status → POST consent i POST baseline, potem podziękowanie", async () => {
		const stub = stubFetch();
		render(<PlacementConsentCard />);

		fireEvent.click(screen.getByRole("checkbox"));
		// shadcn Select w jsdom: otwarcie i wybór przez klawiaturę bywa kruche —
		// klikamy trigger i opcję po roli.
		fireEvent.click(screen.getByLabelText("Twój status zawodowy na start"));
		fireEvent.click(await screen.findByText("Szukam pracy / stażu"));
		fireEvent.click(screen.getByText("Zapisz"));

		await waitFor(() => expect(screen.getByText(/Dziękujemy/)).toBeInTheDocument());
		const calls = stub.mock.calls.map((c) => [
			c[0],
			JSON.parse((c[1] as RequestInit).body as string),
		]);
		expect(calls[0][0]).toBe("/api/placement/consent");
		expect(calls[0][1]).toEqual({ consent: true });
		expect(calls[1][0]).toBe("/api/placement/events");
		expect(calls[1][1]).toMatchObject({ kind: "baseline", employmentStatus: "seeking" });
	});
});

describe("PlacementSection (profil)", () => {
	it("bez zgody → kopia RODO + przycisk zgody; klik POST-uje consent i odświeża", async () => {
		const stub = stubFetch();
		render(<PlacementSection consent={false} decided={false} hasBaseline={false} events={[]} />);

		fireEvent.click(screen.getByRole("button", { name: /Wyrażam zgodę/ }));
		await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
		expect(stub).toHaveBeenCalledWith(
			"/api/placement/consent",
			expect.objectContaining({ body: JSON.stringify({ consent: true }) }),
		);
	});

	it("wycofanie zgody wymaga potwierdzenia; anulowanie NIE wysyła POST", async () => {
		const stub = stubFetch();
		vi.stubGlobal(
			"confirm",
			vi.fn(() => false),
		);
		render(<PlacementSection consent={true} decided={true} hasBaseline={true} events={[]} />);

		fireEvent.click(screen.getByRole("button", { name: /Wycofaj zgodę/ }));
		expect(stub).not.toHaveBeenCalled();

		vi.stubGlobal(
			"confirm",
			vi.fn(() => true),
		);
		fireEvent.click(screen.getByRole("button", { name: /Wycofaj zgodę/ }));
		await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
		expect(stub).toHaveBeenCalledWith(
			"/api/placement/consent",
			expect.objectContaining({ body: JSON.stringify({ consent: false }) }),
		);
	});

	it("historia renderuje etykiety PL i zgodność ze ścieżką", () => {
		stubFetch();
		render(
			<PlacementSection
				consent={true}
				decided={true}
				hasBaseline={true}
				events={[
					{
						id: "e1",
						kind: "baseline",
						employmentStatus: "studying",
						careerAligned: null,
						occurredAt: "2026-07-01T00:00:00.000Z",
						note: null,
					},
					{
						id: "e2",
						kind: "internship",
						employmentStatus: null,
						careerAligned: true,
						occurredAt: "2026-07-05T00:00:00.000Z",
						note: "Staż DS",
					},
				]}
			/>,
		);
		expect(screen.getByText("Status na start")).toBeInTheDocument();
		expect(screen.getByText(/Studiuję, nie pracuję w branży/)).toBeInTheDocument();
		expect(screen.getByText("Staż / praktyki")).toBeInTheDocument();
		expect(screen.getByText(/zgodna ze ścieżką/)).toBeInTheDocument();
		expect(screen.getByText(/„Staż DS"/)).toBeInTheDocument();
	});
});
