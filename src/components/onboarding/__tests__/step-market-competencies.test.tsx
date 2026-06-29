// @vitest-environment jsdom
/**
 * StepMarketCompetencies — render GRUPOWY (Partia 5, C2) + samoocena per rodzaj (C3).
 *
 * Atrapa danych (groups[] + płaski catalog) — bez żywej bazy. Sprawdzamy:
 *   - render grupowy: nagłówek grupy (nazwa + udział % grupy) + wiersze pod spodem;
 *   - NIEZMIENNIK pokrycia: suma items grup == płaska lista; pokrycie liczone z płaskiej;
 *   - fallback: brak grup → płaska lista (zgodność wstecz, G2);
 *   - etykieta poziomu zależna od rodzaju (C3): narzędzie „obsługuję", koncepcja „rozumiem";
 *   - KindChip „narzędzie"/„koncepcja"; SharePill „% ofert grupy" tylko gdy udział != null;
 *   - „Pozostałe" (G5) bez pigułki udziału; żargon backendu (unionShare/kind) NIE przecieka.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
	GroupCatalog,
	MarketCatalogItem,
	PossessionLevel,
} from "@/lib/onboarding/market-catalog";
import { StepMarketCompetencies } from "../step-market-competencies";

// Płaska lista = ŹRÓDŁO POKRYCIA (4 pozycje). Splunk z adnotacją „w programie studiów".
const FLAT: MarketCatalogItem[] = [
	{ competencyName: "SIEM", demandPercentage: 12, category: "Bezpieczeństwo", kind: "concept" },
	{
		competencyName: "Splunk",
		demandPercentage: 7,
		category: "Bezpieczeństwo",
		kind: "tool",
		inSyllabus: true,
	},
	{ competencyName: "IAM", demandPercentage: 9, category: "Tożsamość", kind: "concept" },
	{ competencyName: "Coś niezgrupowanego", demandPercentage: 3, category: "Inne" },
];

// Widok grupowy: 3 grupy, łącznie 2+1+1 = 4 items == FLAT.length (niezmiennik).
const GROUPS: GroupCatalog[] = [
	{
		name: "Wykrywanie i reagowanie",
		unionShare: 38,
		description: "Po co: rozpoznajesz atak i reagujesz, zanim narobi szkód w sieci firmy.",
		items: [
			{ competencyName: "SIEM", demandPercentage: 12, kind: "concept" },
			{ competencyName: "Splunk", demandPercentage: 7, kind: "tool" },
		],
	},
	{
		// G3: udział null → bez SharePill, ale opis zostaje.
		name: "Tożsamość i dostęp",
		unionShare: null,
		description: "Kto i do czego ma dostęp.",
		items: [{ competencyName: "IAM", demandPercentage: 9, kind: "concept" }],
	},
	{
		// G5: „Pozostałe" → neutralny kubełek, bez udziału i opisu.
		name: "Pozostałe",
		unionShare: null,
		description: null,
		items: [{ competencyName: "Coś niezgrupowanego", demandPercentage: 3, kind: null }],
	},
];

function renderStep(overrides?: {
	groups?: GroupCatalog[];
	selections?: Record<string, PossessionLevel>;
}) {
	const onChange = vi.fn();
	render(
		<StepMarketCompetencies
			careerGoal="Specjalista ds. cyberbezpieczeństwa"
			catalog={FLAT}
			groups={overrides?.groups ?? GROUPS}
			selections={overrides?.selections ?? {}}
			onChange={onChange}
			loading={false}
			error={false}
			onRetry={vi.fn()}
			isRealCareerGoal={true}
		/>,
	);
	return { onChange };
}

describe("StepMarketCompetencies — render grupowy (C2)", () => {
	it("renderuje nagłówki grup z atrapy groups[]", () => {
		renderStep();
		expect(screen.getByRole("heading", { name: "Wykrywanie i reagowanie" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Tożsamość i dostęp" })).toBeInTheDocument();
		// „Pozostałe" to neutralna etykieta (nie nagłówek h3).
		expect(screen.getByText("Pozostałe")).toBeInTheDocument();
	});

	it("NIEZMIENNIK: suma items grup == płaska lista (wszystkie 4 pozycje wyrenderowane)", () => {
		renderStep();
		const sumGroupItems = GROUPS.reduce((n, g) => n + g.items.length, 0);
		expect(sumGroupItems).toBe(FLAT.length);
		// Każda pozycja ma swój selektor poziomu (fieldset „Poziom: <nazwa>").
		expect(screen.getAllByRole("group", { name: /^Poziom: / })).toHaveLength(FLAT.length);
	});

	it("SharePill udziału grupy tylko gdy udział != null (G3: brak pigułki dla null)", () => {
		renderStep();
		// Tylko „Wykrywanie i reagowanie" ma unionShare=38 → jedna pigułka „ofert grupy".
		const pills = screen.getAllByText(/ofert grupy/i);
		expect(pills).toHaveLength(1);
		expect(pills[0]).toHaveTextContent("38% ofert grupy");
	});

	it("KindChip tłumaczy rodzaj na polski (narzędzie/koncepcja) — żargon `kind` nie przecieka", () => {
		renderStep();
		expect(screen.getAllByText("koncepcja").length).toBeGreaterThan(0); // SIEM, IAM
		expect(screen.getByText("narzędzie")).toBeInTheDocument(); // Splunk
		// Surowy żargon backendu nigdzie na ekranie.
		expect(screen.queryByText(/unionShare/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/\bconcept\b|\btool\b/)).not.toBeInTheDocument();
	});

	it("adnotacja w programie studiów złączona z płaskim katalogiem po nazwie (Splunk)", () => {
		renderStep();
		const splunkRow = screen.getByRole("group", { name: "Poziom: Splunk" }).closest("li");
		const siemRow = screen.getByRole("group", { name: "Poziom: SIEM" }).closest("li");
		expect(within(splunkRow as HTMLElement).getByText(/w programie studiów/i)).toBeInTheDocument();
		expect(
			within(siemRow as HTMLElement).queryByText(/w programie studiów/i),
		).not.toBeInTheDocument();
	});

	it("pokrycie liczone z PŁASKIEJ listy (4), nie z grup — 1×poziom4 → 25%", () => {
		renderStep({ selections: { SIEM: 4 } });
		expect(
			screen.getByRole("region", {
				name: /Pokrycie kompetencji wymaganych przez rynek: 25 procent/i,
			}),
		).toBeInTheDocument();
	});

	it("przycisk Po co to rozwija opis grupy (clamp → pełny)", async () => {
		const user = userEvent.setup();
		renderStep();
		// Dwie grupy mają opis → dwa toggle; bierzemy pierwszy (grupa „Wykrywanie i reagowanie").
		const toggles = screen.getAllByRole("button", { name: "Po co to?" });
		expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
		await user.click(toggles[0]);
		expect(screen.getByRole("button", { name: "Zwiń" })).toHaveAttribute("aria-expanded", "true");
	});
});

describe("StepMarketCompetencies — samoocena per rodzaj (C3)", () => {
	it("narzędzie → czasownik obsługuję (poziom 3); koncepcja → rozumiem", () => {
		renderStep();
		const splunk = screen.getByRole("group", { name: "Poziom: Splunk" }); // tool
		expect(within(splunk).getByRole("button", { name: "obsługuję" })).toBeInTheDocument();
		expect(within(splunk).getByRole("button", { name: "swobodnie" })).toBeInTheDocument();

		const siem = screen.getByRole("group", { name: "Poziom: SIEM" }); // concept
		expect(within(siem).getByRole("button", { name: "rozumiem" })).toBeInTheDocument();
		expect(within(siem).getByRole("button", { name: "stosuję" })).toBeInTheDocument();
	});

	it("rodzaj bez własnego zestawu (null) → default (znam); Brak zawsze obecne", () => {
		renderStep();
		const leftover = screen.getByRole("group", { name: "Poziom: Coś niezgrupowanego" });
		expect(within(leftover).getByRole("button", { name: "znam" })).toBeInTheDocument();
		expect(within(leftover).getByRole("button", { name: "Brak" })).toBeInTheDocument();
	});

	it("klik poziomu woła onChange z nazwą i poziomem", async () => {
		const user = userEvent.setup();
		const { onChange } = renderStep();
		const splunk = screen.getByRole("group", { name: "Poziom: Splunk" });
		await user.click(within(splunk).getByRole("button", { name: "obsługuję" }));
		expect(onChange).toHaveBeenCalledWith("Splunk", 3);
	});
});

describe("StepMarketCompetencies — fallback do płaskiej listy (G2)", () => {
	it("brak grup → render płaski (wszystkie pozycje katalogu)", () => {
		renderStep({ groups: [] });
		expect(screen.getAllByRole("group", { name: /^Poziom: / })).toHaveLength(FLAT.length);
		// Bez grup nie ma nagłówków grup ani pigułek udziału.
		expect(screen.queryByText(/ofert grupy/i)).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Wykrywanie i reagowanie" }),
		).not.toBeInTheDocument();
	});

	it("fallback wciąż honoruje rodzaj (C3): narzędzie obsługuję w płaskim wierszu", () => {
		renderStep({ groups: [] });
		const splunk = screen.getByRole("group", { name: "Poziom: Splunk" });
		expect(within(splunk).getByRole("button", { name: "obsługuję" })).toBeInTheDocument();
	});
});
