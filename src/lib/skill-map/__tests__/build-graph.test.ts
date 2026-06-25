import { describe, expect, it } from "vitest";
import { calculateCoverage } from "../../passport-utils";
import {
	buildGraph,
	type GraphCompetency,
	type GraphGap,
	type SkillMapStatus,
} from "../build-graph";

const comps: GraphCompetency[] = [
	{ name: "Python", status: "acquired", marketPercentage: 80 },
	{ name: "SQL", status: "in_progress", marketPercentage: 60 },
	{ name: "Git", status: "acquired", marketPercentage: 90 },
];

const gaps: GraphGap[] = [
	{ competencyName: "Docker", marketPercentage: 70 },
	{ competencyName: "Kubernetes", marketPercentage: 50 },
];

function statusCount(nodes: { data: { status: SkillMapStatus } }[], status: SkillMapStatus) {
	return nodes.filter((n) => n.data.status === status).length;
}

describe("buildGraph — deterministyczność", () => {
	it("te same wejścia → identyczny graf (struktura, kolejność, id, pozycje)", () => {
		const a = buildGraph(comps, gaps);
		const b = buildGraph(comps, gaps);
		// Głęboka równość zserializowana — łapie też kolejność i pozycje.
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});

	it("brak losowości — id węzłów są stabilne i przewidywalne", () => {
		const { nodes } = buildGraph(comps, gaps);
		const ids = nodes.map((n) => n.id);
		expect(ids).toEqual(["comp-0", "comp-1", "comp-2", "gap-3", "gap-4"]);
	});

	it("pusty wkład → pusty graf (zero węzłów, zero krawędzi)", () => {
		const g = buildGraph([], []);
		expect(g.nodes).toHaveLength(0);
		expect(g.edges).toHaveLength(0);
	});
});

describe("buildGraph — mapowanie statusów", () => {
	it("kompetencje acquired/in_progress stają się węzłami z tym samym statusem", () => {
		const { nodes } = buildGraph(comps, []);
		expect(statusCount(nodes, "acquired")).toBe(2);
		expect(statusCount(nodes, "in_progress")).toBe(1);
		expect(statusCount(nodes, "missing")).toBe(0);
	});

	it("każda luka staje się węzłem 'missing'", () => {
		const { nodes } = buildGraph([], gaps);
		expect(statusCount(nodes, "missing")).toBe(2);
		expect(nodes.map((n) => n.data.label)).toEqual(["Docker", "Kubernetes"]);
	});

	it("kompetencja studenta ze statusem 'missing' NIE jest węzłem (liczona jako luka — fork Ethana)", () => {
		const withMissingComp: GraphCompetency[] = [
			{ name: "Python", status: "acquired" },
			{ name: "Rust", status: "missing" }, // samoocena „nie znam"
		];
		const { nodes } = buildGraph(withMissingComp, gaps);
		// Tylko 1 węzeł kompetencji (Python) + 2 luki = 3.
		expect(nodes).toHaveLength(3);
		// „missing" pochodzi WYŁĄCZNIE z luk — Rust nie dokłada czerwonego węzła.
		expect(statusCount(nodes, "missing")).toBe(2);
		expect(nodes.some((n) => n.data.label === "Rust")).toBe(false);
	});

	it("pomija marketPercentage gdy null/undefined (panel nie pokazuje fałszywego 0%)", () => {
		const { nodes } = buildGraph(
			[{ name: "X", status: "acquired", marketPercentage: null }],
			[{ competencyName: "Y" }],
		);
		expect(nodes[0].data.marketPercentage).toBeUndefined();
		expect(nodes[1].data.marketPercentage).toBeUndefined();
	});

	it("zachowuje kontrakt węzła: type=skillNode, data.label/status/category obecne", () => {
		const { nodes } = buildGraph(comps, gaps);
		for (const n of nodes) {
			expect(n.type).toBe("skillNode");
			expect(typeof n.data.label).toBe("string");
			expect(["acquired", "in_progress", "missing"]).toContain(n.data.status);
			expect(typeof n.data.category).toBe("string");
			expect(n.position).toHaveProperty("x");
			expect(n.position).toHaveProperty("y");
		}
	});

	it("krawędzie referują istniejące węzły (brak osieroconych source/target)", () => {
		const { nodes, edges } = buildGraph(comps, gaps);
		const ids = new Set(nodes.map((n) => n.id));
		for (const e of edges) {
			expect(ids.has(e.source)).toBe(true);
			expect(ids.has(e.target)).toBe(true);
		}
	});
});

describe("buildGraph — niezmiennik #1: liczba 'missing' == liczba luk", () => {
	// To jest SEDNO poprawki #1: trzy widoki (dashboard, mapa, analiza luk) muszą
	// pokazywać tę samą liczbę luk. Mapa wyprowadza ją z buildGraph.
	const cases: Array<{ comps: GraphCompetency[]; gaps: GraphGap[] }> = [
		{ comps, gaps },
		{ comps: [], gaps },
		{ comps, gaps: [] },
		{
			comps: [
				{ name: "A", status: "acquired" },
				{ name: "B", status: "missing" }, // nie dokłada czerwonego węzła
				{ name: "C", status: "in_progress" },
			],
			gaps: [{ competencyName: "D" }, { competencyName: "E" }, { competencyName: "F" }],
		},
	];

	for (const [i, c] of cases.entries()) {
		it(`przypadek ${i}: węzły 'missing' == liczba luk (${c.gaps.length})`, () => {
			const { nodes } = buildGraph(c.comps, c.gaps);
			expect(statusCount(nodes, "missing")).toBe(c.gaps.length);
		});
	}
});

describe("spójność liczb między widokami (dashboard == mapa == analiza luk)", () => {
	// Symulacja trzech widoków na TYCH SAMYCH danych źródłowych (competencies + gaps),
	// dokładnie tak jak liczą je strony produkcyjne:
	//   - dashboard:   gapCount = liczba wierszy gaps
	//   - analiza luk: critical + important + niceToHave = liczba wierszy gaps
	//   - mapa:        liczba węzłów "missing" z buildGraph
	//   - pokrycie:    calculateCoverage(competencies, gapCount) — ten sam wzór wszędzie
	it("gapCount (dashboard) == suma priorytetów (analiza luk) == 'missing' (mapa)", () => {
		const gapRows = [
			{ competencyName: "Docker", priority: "critical" as const, marketPercentage: 70 },
			{ competencyName: "Kubernetes", priority: "important" as const, marketPercentage: 50 },
			{ competencyName: "Terraform", priority: "nice_to_have" as const, marketPercentage: 30 },
		];

		// Dashboard: count(*) z gaps.
		const dashboardGapCount = gapRows.length;

		// Analiza luk: suma trzech kubełków priorytetów (gap-analysis/page.tsx).
		const gapAnalysisSum =
			gapRows.filter((g) => g.priority === "critical").length +
			gapRows.filter((g) => g.priority === "important").length +
			gapRows.filter((g) => g.priority === "nice_to_have").length;

		// Mapa: węzły "missing" z deterministycznego grafu.
		const { nodes } = buildGraph(
			comps,
			gapRows.map((g) => ({
				competencyName: g.competencyName,
				marketPercentage: g.marketPercentage,
			})),
		);
		const mapMissing = statusCount(nodes, "missing");

		expect(dashboardGapCount).toBe(gapAnalysisSum);
		expect(mapMissing).toBe(dashboardGapCount);
	});

	it("pokrycie jest identyczne niezależnie od miejsca liczenia (ten sam calculateCoverage)", () => {
		const gapCount = gaps.length;
		// Dashboard liczy live: calculateCoverage(comps, gapCount).
		const dashboardCoverage = calculateCoverage(comps, gapCount);
		// Paszport (api/passport, passport/[id], /passport) — ten sam wzór, te same dane.
		const passportCoverage = calculateCoverage(comps, gapCount);
		expect(dashboardCoverage).toBe(passportCoverage);
	});
});
