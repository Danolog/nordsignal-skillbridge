// @vitest-environment node
//
// CF-3 (1E.4 R6) — BRAMKA QA (Quinn) WIRINGU pulpitu dla kafelka powtórek „na
// dziś". Leo sflagował: `dashboard/page.tsx` był NIETESTOWANY na styku
// flaga → getDueQueue → reviewDue. Kafelek-komponent (DashboardHub) renderuje
// „200+"/liczbę/„brak" i to JEST pokryte (dashboard-hub.test.tsx). Tu testujemy
// to, czego tamten nie widzi: czy STRONA woła getDueQueue poprawnie i wyprowadza
// reviewDue.
//
// Dwa inwarianty najbardziej podatne na cichą regresję (nazwane przez Leo):
//   (a) flaga OFF → getDueQueue NIE wywołane (0 wywołań, spy) + reviewDue=null.
//       Regresja tu = milczący koszt zapytania przy zgaszonej fladze (deploy ≠
//       release) — kafelek by się nie pokazał, ale baza dostałaby SELECT. Zielony
//       test z realnym spy łapie „ktoś przeniósł wywołanie przed bramkę flagi".
//   (b) flaga ON → getDueQueue wołane z limit=200 (REVIEW_DASHBOARD_CAP). Regresja
//       tu (np. przekazanie capu trasy /api/review/queue = 20, albo literału) =
//       kafelek kłamie o wolumenie „na dziś". Spy asertuje dokładny 3. argument.
//   (c) 200 kart due → capped=true → DashboardHub dostaje {count:200,capped:true}
//       (renderuje „200+"). (d) <200 → capped=false + dokładna liczba.
//
// getDueQueue jest SZPIEGIEM (nie realną bazą): jedyny sposób udowodnić „0 wywołań"
// przy OFF (kontrakt (a)) to policzyć wywołania — realny getDueQueue nie odróżnia
// „nie wołany" od „zwrócił pusto". Reszta zależności strony (auth, db, pozostałe
// zapytania hubu) zamockowana do minimum — testujemy WIRING powtórek, nie cały hub.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
	getDueQueue: vi.fn(),
	isFeatureEnabled: vi.fn(),
}));

// ── getDueQueue jako spy (jedyny symbol strony z review-service). ──────────────
vi.mock("@/lib/review/review-service", () => ({
	getDueQueue: (...a: unknown[]) => h.getDueQueue(...a),
}));

// ── Flagi sterowalne per test. ────────────────────────────────────────────────
vi.mock("@/lib/flags", () => ({
	isFeatureEnabled: (name: string) => h.isFeatureEnabled(name),
}));

// ── Sesja + student obecne (redirecty nie są przedmiotem tego testu). ─────────
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: async () => ({ user: { id: "u-cf3" } }) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
	redirect: (to: string) => {
		throw new Error(`REDIRECT:${to}`);
	},
}));

// ── db: student istnieje; wszystkie pozostałe zapytania hubu → puste/zero. ─────
const selectChain = { from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) };
vi.mock("@/lib/db", () => ({
	db: {
		query: {
			students: { findFirst: async () => ({ id: "student-cf3", careerGoal: "X" }) },
			competencies: { findMany: async () => [] },
			gaps: { findMany: async () => [] },
		},
		select: () => selectChain,
	},
}));

// ── Pozostałe zależności hubu — neutralne. ────────────────────────────────────
vi.mock("@/lib/market-notifications", () => ({ getMarketNotificationsState: async () => ({}) }));
vi.mock("@/lib/rhythm/state", () => ({ getRhythmState: async () => ({}) }));
vi.mock("@/lib/passport-utils", () => ({ calculateCoverage: () => 0 }));
vi.mock("@/lib/onboarding/market-gaps", () => ({ loadMarketCatalog: async () => [] }));
vi.mock("@/lib/onboarding/market-catalog", () => ({ computeDemandCoverage: () => 0 }));

// ── DashboardHub: atrapa (strona zwraca <DashboardHub .../> jako element Reacta;
//    propsy czytamy z el.props zwróconego elementu — komponent NIE jest wołany bez
//    renderu, więc capture „przez wywołanie funkcji" by nie zadziałał). ─────────
vi.mock("@/components/dashboard/dashboard-hub", () => ({
	DashboardHub: () => null,
}));

import type { ReactElement } from "react";
import DashboardPage from "../page";

/** Ustaw wynik flag: tylko `spacedRepetition` sterowalna, reszta OFF. */
function setFlags(spacedRepetition: boolean) {
	h.isFeatureEnabled.mockImplementation((name: string) =>
		name === "spacedRepetition" ? spacedRepetition : false,
	);
}

/** Uruchom stronę i zwróć prop `reviewDue` przekazany do DashboardHub. */
async function renderAndGetReviewDue(): Promise<unknown> {
	const el = (await DashboardPage()) as unknown as ReactElement<{ reviewDue: unknown }>;
	if (!el?.props) throw new Error("Strona nie zwróciła elementu DashboardHub");
	return el.props.reviewDue;
}

describe("CF-3 · wiring pulpitu: flaga → getDueQueue → reviewDue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("(a) flaga OFF → getDueQueue NIE wywołane (0), reviewDue=null", async () => {
		setFlags(false);
		const reviewDue = await renderAndGetReviewDue();
		expect(h.getDueQueue).toHaveBeenCalledTimes(0);
		expect(reviewDue).toBeNull();
	});

	it("(b) flaga ON → getDueQueue wołane RAZ z limit=200 (REVIEW_DASHBOARD_CAP)", async () => {
		setFlags(true);
		h.getDueQueue.mockResolvedValue([]);
		await renderAndGetReviewDue();
		expect(h.getDueQueue).toHaveBeenCalledTimes(1);
		const [studentId, now, limit] = h.getDueQueue.mock.calls[0];
		expect(studentId).toBe("student-cf3");
		expect(now).toBeInstanceOf(Date);
		expect(limit).toBe(200);
	});

	it("(c) 200 kart due → capped=true (kafelek „200+”)", async () => {
		setFlags(true);
		h.getDueQueue.mockResolvedValue(
			Array.from({ length: 200 }, (_, i) => ({ conceptId: `c${i}` })),
		);
		const reviewDue = await renderAndGetReviewDue();
		expect(reviewDue).toEqual({ count: 200, capped: true });
	});

	it("(d) <200 kart due → capped=false + dokładna liczba", async () => {
		setFlags(true);
		h.getDueQueue.mockResolvedValue(Array.from({ length: 7 }, (_, i) => ({ conceptId: `c${i}` })));
		const reviewDue = await renderAndGetReviewDue();
		expect(reviewDue).toEqual({ count: 7, capped: false });
	});

	it("(d′) dokładnie 0 kart due (ON, pusto) → capped=false, count=0 (kafelek „brak”, nie null)", async () => {
		setFlags(true);
		h.getDueQueue.mockResolvedValue([]);
		const reviewDue = await renderAndGetReviewDue();
		expect(reviewDue).toEqual({ count: 0, capped: false });
	});
});
