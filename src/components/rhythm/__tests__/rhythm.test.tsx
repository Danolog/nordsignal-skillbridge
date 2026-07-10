// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 1.18 — testy UI rytmu z zamockowanym fetch: karta dashboardu (zachęta /
 * streak / alert zastoju z dismissem) i sekcja „Mojej drogi" (deklaracja,
 * check-in).
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

import type { RhythmState } from "@/lib/rhythm/state";
import { RhythmCard } from "../rhythm-card";
import { RhythmSection } from "../rhythm-section";

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

const BASE_STATE: RhythmState = {
	declaration: {
		hoursPerWeek: 6,
		days: ["mon", "wed"],
		activeProjectId: null,
		stagnationOptOut: false,
	},
	streakWeeks: 3,
	lastActivityAt: new Date().toISOString(),
	stagnant: false,
	showStagnationAlert: false,
	currentWeekCheckin: null,
	recentCheckins: [],
};

describe("RhythmCard (dashboard)", () => {
	it("bez deklaracji → zachęta z linkiem do Mojej drogi", () => {
		stubFetch();
		render(
			<RhythmCard
				state={{
					declared: false,
					hoursPerWeek: null,
					streakWeeks: 0,
					lastActivityAt: null,
					showStagnationAlert: false,
				}}
			/>,
		);
		expect(screen.getByText(/Ustaw w Mojej drodze/)).toBeInTheDocument();
	});

	it("streak renderuje płomień z liczbą tygodni", () => {
		stubFetch();
		render(
			<RhythmCard
				state={{
					declared: true,
					hoursPerWeek: 6,
					streakWeeks: 4,
					lastActivityAt: new Date().toISOString(),
					showStagnationAlert: false,
				}}
			/>,
		);
		expect(screen.getByText(/4 tyg\./)).toBeInTheDocument();
		expect(screen.queryByText(/bez aktywności/)).not.toBeInTheDocument();
	});

	it("alert zastoju: dni + zadeklarowane godziny; „Wiem, wracam” POST-uje dismiss i odświeża", async () => {
		const stub = stubFetch();
		const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
		render(
			<RhythmCard
				state={{
					declared: true,
					hoursPerWeek: 8,
					streakWeeks: 0,
					lastActivityAt: tenDaysAgo,
					showStagnationAlert: true,
				}}
			/>,
		);
		expect(screen.getByText(/10 dni bez aktywności/)).toBeInTheDocument();
		expect(screen.getByText(/8 h\/tydz/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Wiem, wracam/ }));
		await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
		expect(stub).toHaveBeenCalledWith("/api/rhythm/stagnation-dismiss", { method: "POST" });
	});
});

describe("RhythmSection (Moja droga)", () => {
	it("bez deklaracji → formularz od razu; zapis POST-uje /api/rhythm i odświeża", async () => {
		const stub = stubFetch();
		render(
			<RhythmSection state={{ ...BASE_STATE, declaration: null, streakWeeks: 0 }} projects={[]} />,
		);

		fireEvent.change(screen.getByLabelText("Godziny nauki tygodniowo"), { target: { value: "8" } });
		fireEvent.click(screen.getByRole("button", { name: "pn" }));
		fireEvent.click(screen.getByRole("button", { name: "sb" }));
		fireEvent.click(screen.getByRole("button", { name: /Zapisz rytm/ }));

		await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
		const [url, init] = stub.mock.calls[0];
		expect(url).toBe("/api/rhythm");
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			hoursPerWeek: 8,
			days: ["mon", "sat"],
		});
	});

	it("z deklaracją → podsumowanie planu + streak; check-in wysyła godziny i notatkę", async () => {
		const stub = stubFetch();
		render(<RhythmSection state={BASE_STATE} projects={[]} />);

		expect(screen.getByText(/6 h\/tydz\./)).toBeInTheDocument();
		expect(screen.getByText(/3 tyg\./)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Realne godziny w tym tygodniu"), {
			target: { value: "5" },
		});
		fireEvent.change(screen.getByLabelText("Notatka check-inu"), {
			target: { value: "Dobry tydzień" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Zapisz check-in/ }));

		await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
		const call = stub.mock.calls.find((c) => c[0] === "/api/rhythm/checkin");
		expect(call).toBeDefined();
		expect(JSON.parse((call?.[1] as RequestInit).body as string)).toEqual({
			hoursActual: 5,
			note: "Dobry tydzień",
		});
	});

	it("historia check-inów renderuje godziny i notatki", () => {
		stubFetch();
		render(
			<RhythmSection
				state={{
					...BASE_STATE,
					recentCheckins: [
						{ weekStart: "2026-07-06T00:00:00.000Z", hoursActual: 5, note: "ok" },
						{ weekStart: "2026-06-29T00:00:00.000Z", hoursActual: null, note: "ciężko" },
					],
				}}
				projects={[]}
			/>,
		);
		expect(screen.getByText(/5 h/)).toBeInTheDocument();
		expect(screen.getByText(/„ciężko"/)).toBeInTheDocument();
	});
});
