import { describe, expect, it } from "vitest";
import {
	type Anchor,
	assignAll,
	assignToAnchor,
	buildAnchors,
	buildArtifact,
	buildCareerModel,
	buildTechIndex,
	type CleanOffer,
	cleanOffers,
	displayName,
	flattenLeaves,
	normalizeCity,
	normalizeTitle,
	parseCsv,
	passesGeoFilter,
	pathStats,
} from "../../../../tools/etl-justjoinit";
import { MANUAL_ANCHORS, PROFILE_SIZE, TIE_BREAK_DEPRIORITIZED } from "../data/anchor-config";
import careerModelJson from "../data/career-model.json";
import artifactJson from "../data/job-market-justjoinit.json";

// ── Parser CSV ────────────────────────────────────────────────────────────

describe("parseCsv", () => {
	it("parsuje pola po średniku, obsługuje CRLF, cudzysłowy i escapowanie", () => {
		expect(parseCsv("a;b\n1;2")).toEqual([{ a: "1", b: "2" }]);
		expect(parseCsv("a;b\r\n1;2\r\n")).toEqual([{ a: "1", b: "2" }]);
		expect(parseCsv('name;note\n"Smith; Jr.";"on ""leave"""')).toEqual([
			{ name: "Smith; Jr.", note: 'on "leave"' },
		]);
	});
});

// ── Czyszczenie ──────────────────────────────────────────────────────────

describe("normalizeCity / passesGeoFilter", () => {
	it("normalizeCity + geo", () => {
		expect(normalizeCity("Warsaw")).toBe("Warszawa");
		expect(passesGeoFilter("Berlin", "Zdalnie")).toBe(true);
		expect(passesGeoFilter("Berlin", "Biuro")).toBe(false);
	});
});

function offerRow(over: Partial<Record<string, string>>): Record<string, string> {
	return {
		Slug: "slug-1",
		Stanowisko: "Java Developer",
		Kategoria: "Java",
		Poziom: "Mid",
		Miasto: "Warszawa",
		Tryb_pracy: "Zdalnie",
		Wymiar: "Pełny etat",
		Typ_umowy: "B2B",
		Wynagrodzenie_od_PLN: "15000.0",
		Wynagrodzenie_do_PLN: "20000.0",
		...over,
	};
}

describe("cleanOffers", () => {
	const noTech = new Map<string, Set<string>>();
	it("filtruje Pełny etat + umowa + geo, dedup, zapisuje kategorię; v5: bez widełek", () => {
		const { offers } = cleanOffers(
			[
				offerRow({ Slug: "a", Kategoria: "Security" }),
				offerRow({ Slug: "b", Wymiar: "freelance" }),
				offerRow({ Slug: "c", Typ_umowy: "INTERNSHIP" }),
				offerRow({ Slug: "e", Miasto: "Berlin", Tryb_pracy: "Biuro" }), // zagraniczna stacjonarna
				offerRow({ Slug: "a", Stanowisko: "dup" }),
			],
			noTech,
		);
		expect([...offers.keys()].sort()).toEqual(["a"]);
		expect(offers.get("a")?.kategoria).toBe("Security");
		// v5: CleanOffer NIE ma już pól salary
		expect(offers.get("a")).not.toHaveProperty("salaryFrom");
	});
});

// ── Normalizacja tytułu ──────────────────────────────────────────────────

describe("normalizeTitle / displayName", () => {
	it("usuwa seniority/nawiasy, ujednolica fullstack", () => {
		expect(normalizeTitle("Senior Java Developer (m/f)")).toBe("java developer");
		expect(normalizeTitle("Fullstack Engineer")).toBe("full-stack engineer");
	});
	it("displayName: mapa Sophii; software engineer → Embedded / C++ Developer", () => {
		expect(displayName(".net developer")).toBe(".NET Developer");
		expect(displayName("software engineer")).toBe("Embedded / C++ Developer");
		expect(displayName("product owner")).toBe("Product Owner / Manager");
	});
});

// ── Kotwice + tie-break v4 (deprioritized, NIE „selectable") ──────────────────

function makeOffers(
	specs: Array<{ title: string; kat?: string; techs: string[] }>,
): Map<string, CleanOffer> {
	const offers = new Map<string, CleanOffer>();
	specs.forEach((s, idx) => {
		const slug = `o-${idx}`;
		offers.set(slug, {
			slug,
			stanowisko: s.title,
			normTitle: normalizeTitle(s.title),
			kategoria: s.kat ?? "Java",
			techs: new Set(s.techs),
		});
	});
	return offers;
}

describe("buildAnchors", () => {
	it("scala (full-stack engineer → developer) i oznacza deprioritized", () => {
		const specs: Array<{ title: string; techs: string[] }> = [];
		for (let i = 0; i < 12; i++) specs.push({ title: "Full-Stack Developer", techs: ["React"] });
		for (let i = 0; i < 8; i++) specs.push({ title: "Full-Stack Engineer", techs: ["React"] });
		for (let i = 0; i < 12; i++) specs.push({ title: "Software Engineer", techs: ["C++"] });
		const anchors = buildAnchors(makeOffers(specs));
		expect(anchors.find((a) => a.norm === "full-stack developer")?.size).toBe(20);
		expect(anchors.find((a) => a.norm === "full-stack engineer")).toBeUndefined();
		expect(anchors.find((a) => a.norm === "software engineer")?.deprioritized).toBe(true);
		expect(anchors.find((a) => a.norm === "full-stack developer")?.deprioritized).toBe(false);
		for (const a of anchors) expect(a.profile.size).toBeLessThanOrEqual(PROFILE_SIZE);
	});

	it("dodaje kotwice ręczne po Kategoria", () => {
		const specs: Array<{ title: string; kat: string; techs: string[] }> = [];
		for (let i = 0; i < 15; i++)
			specs.push({ title: "Cokolwiek", kat: "Security", techs: ["Cybersecurity"] });
		for (let i = 0; i < 20; i++)
			specs.push({ title: "Java Developer", kat: "Java", techs: ["Java"] });
		const anchors = buildAnchors(makeOffers(specs));
		expect(anchors.find((a) => a.norm === "cybersecurity specialist")?.manual).toBe(true);
		expect(new Set(MANUAL_ANCHORS.map((m) => m.key))).toEqual(
			new Set(["ux/ui designer", "cybersecurity specialist"]),
		);
	});
});

describe("assignToAnchor — tie-break v4 (anty-magnes)", () => {
	function anchor(over: Partial<Anchor> & Pick<Anchor, "norm" | "size" | "profile">): Anchor {
		return { display: over.norm ?? "", deprioritized: false, manual: false, ...over } as Anchor;
	}
	function offer(techs: string[]): CleanOffer {
		return { slug: "x", stanowisko: "x", normTitle: "x", kategoria: "", techs: new Set(techs) };
	}

	it("remis: NIE-deprioritized bije deprioritized (mimo że deprioritized jest większa)", () => {
		const a = [
			anchor({
				norm: "software engineer",
				size: 200,
				profile: new Set(["X", "Y"]),
				deprioritized: true,
			}),
			anchor({
				norm: "java developer",
				size: 20,
				profile: new Set(["X", "Y"]),
				deprioritized: false,
			}),
		];
		expect(assignToAnchor(offer(["X", "Y"]), a)?.norm).toBe("java developer");
	});

	it("remis wśród nie-deprioritized: mniejsza wygrywa, dalej alfabet", () => {
		const a = [
			anchor({ norm: "big", size: 200, profile: new Set(["X"]) }),
			anchor({ norm: "small", size: 20, profile: new Set(["X"]) }),
		];
		expect(assignToAnchor(offer(["X"]), a)?.norm).toBe("small");
	});

	it("pokrycie 0 → null", () => {
		const a = [anchor({ norm: "a", size: 10, profile: new Set(["X"]) })];
		expect(assignToAnchor(offer(["Nieznana"]), a)).toBeNull();
	});
});

// ── pathStats: ręczna kotwica liczona na ofertach KATEGORII ──────────────────

describe("pathStats — manual anchor liczy na segmencie (Kategoria)", () => {
	it("ręczna kotwica używa ofert kategorii jako mianownika, nie podzbioru profilu", () => {
		const specs: Array<{ title: string; kat: string; techs: string[] }> = [];
		for (let i = 0; i < 30; i++) {
			const techs = ["Cybersecurity"];
			if (i < 10) techs.push("Burp Suite");
			specs.push({ title: `Sec ${i}`, kat: "Security", techs });
		}
		for (let i = 0; i < 40; i++)
			specs.push({ title: "Java Developer", kat: "Java", techs: ["Java"] });
		const offers = makeOffers(specs);
		const stats = pathStats(assignAll(offers, buildAnchors(offers)), offers);
		const cyber = stats.get("Cybersecurity Specialist");
		expect(cyber?.offerCount).toBe(30); // oferty kategorii Security, nie podzbiór profilu
		expect(cyber?.techCount.get("Burp Suite")).toBe(10);
	});
});

// ── v5: brak widełek nigdzie ──────────────────────────────────────────────────

describe("v5 — salary PRECZ (decyzja Darka)", () => {
	it("flat artifact: żaden wiersz NIE ma pola salaryRange", () => {
		for (const entry of artifactJson.data) {
			for (const c of entry.competencies) {
				expect(c).not.toHaveProperty("salaryRange");
			}
		}
	});
	it("career-model: żadna ścieżka NIE ma pola salaryRange", () => {
		for (const path of careerModelJson.paths) {
			expect(path).not.toHaveProperty("salaryRange");
		}
	});
	it("DANE obu artefaktów nie zawierają widełek (PLN/salaryRange) — meta może je opisać słownie", () => {
		// Sprawdzamy DANE (data/paths), nie _meta (które słownie wyjaśnia „salary_range NULL").
		const flatData = JSON.stringify(artifactJson.data);
		const modelPaths = JSON.stringify(careerModelJson.paths);
		expect(flatData).not.toMatch(/PLN|salaryRange/i);
		expect(modelPaths).not.toMatch(/PLN|salaryRange/i);
	});
});

// ── buildCareerModel: hierarchia, % obszaru vs liścia, warianty, absent ──────

function statsForModel(): ReturnType<typeof pathStats> {
	const specs: Array<{ title: string; kat: string; techs: string[] }> = [];
	// AI: wariant Langchain liczony jako LangChain (22/50 = 44%)
	for (let i = 0; i < 50; i++) {
		const techs = ["AI", "Python"];
		if (i < 22) techs.push("Langchain");
		specs.push({ title: "AI Engineer", kat: "Ai", techs });
	}
	for (let i = 0; i < 40; i++)
		specs.push({ title: "Java Developer", kat: "Java", techs: ["Java"] });
	const offers = makeOffers(specs);
	return pathStats(assignAll(offers, buildAnchors(offers)), offers);
}

describe("buildCareerModel — hierarchia v4", () => {
	it("liść liczony po wariancie (Langchain → LangChain 44%)", () => {
		const ai = buildCareerModel(statsForModel()).paths.find((p) => p.careerGoal === "AI Engineer");
		const lc = ai?.areas.flatMap((a) => a.leaves).find((l) => l.name === "LangChain");
		expect(lc?.demandPercentage).toBe(44);
	});

	it("liść absent → null + source kuracja ekspercka", () => {
		const ai = buildCareerModel(statsForModel()).paths.find((p) => p.careerGoal === "AI Engineer");
		const jup = ai?.areas.flatMap((a) => a.leaves).find((l) => l.name === "Jupyter Notebook");
		expect(jup?.demandPercentage).toBeNull();
		expect(jup?.source).toBe("kuracja ekspercka");
	});

	it("grupnik prezentacyjny ma demandPercentage null", () => {
		const ai = buildCareerModel(statsForModel()).paths.find((p) => p.careerGoal === "AI Engineer");
		expect(ai?.areas.find((a) => a.type === "presentation-group")?.demandPercentage).toBeNull();
	});

	it("dołącza bank projektów; napisane projekty kotwiczą na liściach", () => {
		// Java ma 3 napisane projekty (anchorLeaves niepuste). AI ma na razie szablon todo.
		const model = buildCareerModel(statsForModel());
		const java = model.paths.find((p) => p.careerGoal === "Java Developer");
		expect(java?.projects.length).toBe(3);
		for (const p of java?.projects ?? []) expect(p.anchorLeaves.length).toBeGreaterThan(0);
	});
});

// ── flattenLeaves: płaski artefakt ────────────────────────────────────────────

describe("flattenLeaves — płaski jobMarketData", () => {
	it("zaokrągla do integer, pomija 0% i absent, studentSelectable=true", () => {
		const specs: Array<{ title: string; kat: string; techs: string[] }> = [];
		for (let i = 0; i < 100; i++) {
			const techs = ["Cybersecurity"];
			if (i < 1) techs.push("Burp Suite"); // 1% → ~0 graniczne, ale Cybersecurity 100%
			specs.push({ title: `Sec ${i}`, kat: "Security", techs });
		}
		for (let i = 0; i < 40; i++)
			specs.push({ title: "Java Developer", kat: "Java", techs: ["Java"] });
		const offers = makeOffers(specs);
		const flat = flattenLeaves(
			buildCareerModel(pathStats(assignAll(offers, buildAnchors(offers)), offers)),
		);
		for (const entry of flat) {
			expect(entry.studentSelectable).toBe(true);
			for (const c of entry.competencies) {
				expect(Number.isInteger(c.demandPercentage)).toBe(true);
				expect(c.demandPercentage).toBeGreaterThanOrEqual(1);
			}
		}
	});
});

// ── buildArtifact: determinizm + zwraca {artifact, model} ─────────────────────

describe("buildArtifact — determinizm i kontrakt", () => {
	const offerRows: Record<string, string>[] = [];
	const techRows: Record<string, string>[] = [];
	for (let i = 0; i < 12; i++) {
		offerRows.push(offerRow({ Slug: `j${i}`, Stanowisko: "Java Developer", Kategoria: "Java" }));
		techRows.push({ Slug: `j${i}`, Technologia: "Java" });
	}
	offerRows.push(offerRow({ Slug: "orphan", Stanowisko: "Tester czegoś", Kategoria: "Other" }));

	it("identyczny wynik przy ponownym uruchomieniu (zero new Date)", () => {
		expect(JSON.stringify(buildArtifact(offerRows, techRows))).toBe(
			JSON.stringify(buildArtifact(offerRows, techRows)),
		);
	});

	it("zwraca {artifact, model}; _meta v5; model ma paths z areas, ramami i rodzinami", () => {
		const { artifact, model } = buildArtifact(offerRows, techRows);
		expect(artifact._meta.model).toContain("v5");
		expect(artifact._meta.snapshot).toBe("2026-02");
		expect(artifact._meta.cleanedOffers).toBe(13);
		expect(artifact._meta.assignedOffers).toBe(12); // orphan bez techs → nieprzypisana
		expect(model._meta.families.length).toBe(5);
		const java = model.paths.find((p) => p.careerGoal === "Java Developer");
		expect(java?.areas.length).toBeGreaterThan(0);
		expect(java?.frameworks.family).toContain("II"); // Inżynieria Oprogramowania
		expect(java?.juniorFriendliness).toBeTruthy();
	});

	it("buildTechIndex grupuje po Slug, pomija pusty", () => {
		const idx = buildTechIndex([
			{ Slug: "a", Technologia: "Java" },
			{ Slug: "a", Technologia: "Spring" },
			{ Slug: "", Technologia: "X" },
		]);
		expect([...(idx.get("a") ?? [])].sort()).toEqual(["Java", "Spring"]);
		expect(idx.has("")).toBe(false);
	});
});

// ── Walidacja artefaktów produkcyjnych ────────────────────────────────────────

describe("artefakt PŁASKI (job-market-justjoinit.json)", () => {
	const artifact = artifactJson;
	it("model v5, wszystkie ścieżki studentSelectable, % integer ≥ 1, category = rodzina e-CF", () => {
		expect(artifact._meta.model).toContain("v5");
		expect(artifact.data.every((e) => e.studentSelectable)).toBe(true);
		for (const entry of artifact.data) {
			// category = rodzina e-CF (zaczyna się od „I — "/„II — " itd.)
			expect(entry.category).toMatch(/^(I|II|III|IV|V) — /);
			for (const c of entry.competencies) {
				expect(Number.isInteger(c.demandPercentage)).toBe(true);
				expect(c.demandPercentage).toBeGreaterThanOrEqual(1);
			}
		}
	});
	it("nazwy ścieżek unikalne; Embedded / C++ Developer obecny (nie Software Engineer)", () => {
		const goals = artifact.data.map((e) => e.careerGoal);
		expect(new Set(goals).size).toBe(goals.length);
		expect(goals).toContain("Embedded / C++ Developer");
		expect(goals).not.toContain("Software Engineer");
	});
});

describe("artefakt HIERARCHICZNY (career-model.json)", () => {
	const model = careerModelJson;
	it("paths z obszarami i bankiem projektów", () => {
		expect(model.paths.length).toBe(model._meta.paths);
		expect(model.paths.length).toBeGreaterThanOrEqual(20);
		for (const path of model.paths) {
			expect(path.areas.length).toBeGreaterThan(0);
			expect(path.projects.length).toBeGreaterThan(0);
		}
	});

	it("knowledge-area mają % (number), grupniki null", () => {
		for (const path of model.paths) {
			for (const area of path.areas) {
				if (area.type === "knowledge-area") expect(typeof area.demandPercentage).toBe("number");
				else expect(area.demandPercentage).toBeNull();
			}
		}
	});

	it("liście absent: null + kuracja ekspercka; obecne: number + dane", () => {
		let absentSeen = 0;
		let presentSeen = 0;
		for (const path of model.paths) {
			for (const area of path.areas) {
				for (const leaf of area.leaves) {
					if (leaf.demandPercentage === null) {
						expect(leaf.source).toBe("kuracja ekspercka");
						absentSeen++;
					} else {
						expect(leaf.source).toBe("dane");
						presentSeen++;
					}
				}
			}
		}
		expect(absentSeen).toBeGreaterThan(0); // Jupyter / Miro / GitLab CI / OWASP
		expect(presentSeen).toBeGreaterThan(0);
	});

	it("AI Engineer: hierarchia Darka (AI obszar → ML → Pandas z liczbą)", () => {
		const ai = model.paths.find((p) => p.careerGoal === "AI Engineer");
		expect(ai?.areas.find((a) => a.name === "AI")?.demandPercentage).toBeGreaterThan(0);
		const pandas = ai?.areas
			.find((a) => a.name === "Machine Learning")
			?.leaves.find((l) => l.name === "Pandas");
		expect(typeof pandas?.demandPercentage).toBe("number");
	});

	it("6 zestawów v5 (Java/Data Engineer/Frontend/PM/BA/Salesforce) mają 3 poziomy bez todo", () => {
		for (const goal of [
			"Java Developer",
			"Data Engineer",
			"Frontend Developer",
			"Project Manager",
			"Business Analyst",
			"Salesforce Developer",
		]) {
			const path = model.paths.find((p) => p.careerGoal === goal);
			expect(new Set(path?.projects.map((p) => p.level)), goal).toEqual(
				new Set(["latwy", "sredni", "zaawansowany"]),
			);
			expect(
				path?.projects.every((p) => !(p as { todo?: boolean }).todo),
				goal,
			).toBe(true);
		}
	});

	it("napisane projekty (nie-todo) kotwiczą na ≥1 liściu; todo mają pusty anchorLeaves", () => {
		for (const path of model.paths) {
			for (const proj of path.projects) {
				if ((proj as { todo?: boolean }).todo) {
					expect(proj.anchorLeaves.length, `${path.careerGoal}/todo`).toBe(0);
				} else {
					expect(proj.anchorLeaves.length, `${path.careerGoal}/${proj.title}`).toBeGreaterThan(0);
				}
			}
		}
	});

	it("KRYTYCZNE: anchorLeaves każdego napisanego projektu ⊆ liście ścieżki (spięcie projekt↔popyt)", () => {
		for (const path of model.paths) {
			const leafNames = new Set(path.areas.flatMap((a) => a.leaves.map((l) => l.name)));
			for (const proj of path.projects) {
				if ((proj as { todo?: boolean }).todo) continue;
				for (const leaf of proj.anchorLeaves) {
					expect(
						leafNames.has(leaf),
						`${path.careerGoal}/${proj.title}: liść „${leaf}" spoza hierarchii`,
					).toBe(true);
				}
			}
		}
	});

	it("v5: ramy + warstwa juniora obecne; BA w Rodzinie V (override Darka)", () => {
		for (const path of model.paths) {
			expect(path.frameworks.family).toMatch(/^(I|II|III|IV|V) — /);
			expect(path.frameworks.iscoCode).toBeTruthy();
			expect(["Wysoka", "Średnia", "Niska", "rola docelowa"]).toContain(path.juniorFriendliness);
		}
		const ba = model.paths.find((p) => p.careerGoal === "Business Analyst");
		expect(ba?.frameworks.family).toContain("V"); // Darek: BA → Rodzina V
		// role docelowe oznaczone, ale widoczne
		const arch = model.paths.find((p) => p.careerGoal === "Solution Architect");
		expect(arch?.targetRole).toBe(true);
	});

	it("deprioritized kotwice nadal widoczne jako ścieżki (dyrektywa 3)", () => {
		const goals = model.paths.map((p) => p.careerGoal);
		expect(goals).toContain("Solution Architect");
		expect(goals).toContain("Engineering Manager");
		expect(goals).toContain("Embedded / C++ Developer");
		expect(TIE_BREAK_DEPRIORITIZED.size).toBe(3);
	});
});
