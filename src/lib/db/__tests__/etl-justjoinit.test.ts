import { describe, expect, it } from "vitest";
import {
	type Anchor,
	assignAll,
	assignToAnchor,
	buildAnchors,
	buildArtifact,
	buildCandidates,
	buildCareerModel,
	buildTechIndex,
	type CareerModel,
	type CleanOffer,
	dedupOffers,
	displayName,
	flattenLeaves,
	globalTechFrequency,
	liftOf,
	type ModelLeaf,
	normalizeTitle,
	type PathStat,
	parseCsv,
	pathStats,
	unionOffersCount,
} from "../../../../tools/etl-justjoinit";
import {
	classifyLeafKind,
	MANUAL_ANCHORS,
	PROFILE_SIZE,
	TIE_BREAK_DEPRIORITIZED,
} from "../data/anchor-config";
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

// ── Dedup (ETAP A — surowy rynek) ──────────────────────────────────────────

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

describe("dedupOffers — surowy rynek (jedyna higiena = dedup po Slug)", () => {
	const noTech = new Map<string, Set<string>>();
	it("dedup po Slug; BEZ filtrów geo/etat/umowy (surowe zostają); v5: bez widełek", () => {
		const { offers } = dedupOffers(
			[
				offerRow({ Slug: "a", Kategoria: "Security" }),
				offerRow({ Slug: "b", Wymiar: "freelance" }), // niepełny etat — ZOSTAJE (zero czyszczenia)
				offerRow({ Slug: "c", Typ_umowy: "INTERNSHIP" }), // inna umowa — ZOSTAJE
				offerRow({ Slug: "e", Miasto: "Berlin", Tryb_pracy: "Biuro" }), // zagraniczna — ZOSTAJE
				offerRow({ Slug: "", Kategoria: "Brak" }), // brak Slug — pomijany (integralność klucza)
				offerRow({ Slug: "a", Stanowisko: "dup" }), // duplikat Slug — pomijany (pierwszy wygrywa)
			],
			noTech,
		);
		// surowe a,b,c,e zostają (Decyzja A: bez geo/etat/umowy); dup „a" i pusty Slug poza wynikiem
		expect([...offers.keys()].sort()).toEqual(["a", "b", "c", "e"]);
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

function statsForModel(): {
	stats: ReturnType<typeof pathStats>;
	freq: Map<string, number>;
	total: number;
	offers: ReturnType<typeof makeOffers>;
} {
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
	const stats = pathStats(assignAll(offers, buildAnchors(offers)), offers);
	const { freq, total } = globalTechFrequency(offers);
	return { stats, freq, total, offers };
}

/** Pełny model z fikstury (skleja stats + global freq pod nową sygnaturę buildCareerModel). */
function builtModelForTest(): CareerModel {
	const { stats, freq, total, offers } = statsForModel();
	return buildCareerModel(stats, freq, total, offers);
}

// ── unionOffersCount: dedup ofert dla countAsUnion (Sophia/Leo, partia 2) ─────
describe("unionOffersCount — scalenie synonimów = UNIA ofert (nie suma liczników)", () => {
	const mk = (techs: string[]): CleanOffer => ({
		slug: techs.join("-"),
		stanowisko: "X",
		normTitle: "x",
		kategoria: "Java",
		techs: new Set(techs),
	});
	it("oferta z dwoma wariantami liczona RAZ (unia < suma)", () => {
		// 3 oferty; pierwsza ma OBA warianty C#/.Net. Suma liczników = 2+2 = 4; unia = 3.
		const offers = [mk(["C#", ".Net"]), mk(["C#"]), mk([".Net"])];
		expect(unionOffersCount(offers, ["C#", ".Net"])).toBe(3);
	});
	it("brak nakładania → unia == suma", () => {
		const offers = [mk(["AWS"]), mk(["Amazon AWS"]), mk(["Java"])];
		expect(unionOffersCount(offers, ["AWS", "Amazon AWS"])).toBe(2);
	});
	it("countAsUnion w buildCareerModel: liść Backend C#/.NET = unia (offers < suma wariantów)", () => {
		// Fixtura Backend: 5 ofert C#, 5 ofert .Net, 3 oferty z OBOMA. Suma = (5+3)+(5+3)=16; unia=13.
		const specs: Array<{ title: string; kat: string; techs: string[] }> = [];
		for (let i = 0; i < 5; i++)
			specs.push({ title: "Backend Developer", kat: "Backend", techs: ["C#"] });
		for (let i = 0; i < 5; i++)
			specs.push({ title: "Backend Developer", kat: "Backend", techs: [".Net"] });
		for (let i = 0; i < 3; i++)
			specs.push({ title: "Backend Developer", kat: "Backend", techs: ["C#", ".Net"] });
		const offers = makeOffers(specs);
		const stats = pathStats(assignAll(offers, buildAnchors(offers)), offers);
		const { freq, total } = globalTechFrequency(offers);
		const model = buildCareerModel(stats, freq, total, offers);
		const be = model.paths.find((p) => p.careerGoal === "Backend Developer");
		const csharp = be?.areas
			.find((a) => a.leaves.some((l) => l.name === "C# / .NET"))
			?.leaves.find((l) => l.name === "C# / .NET");
		expect(csharp?.offers, "C#/.NET liczone UNIĄ (13), nie sumą (16)").toBe(13);
	});
});

describe("buildCareerModel — hierarchia v4", () => {
	it("liść liczony po wariancie (Langchain → LangChain 44%)", () => {
		const ai = builtModelForTest().paths.find((p) => p.careerGoal === "AI Engineer");
		const lc = ai?.areas.flatMap((a) => a.leaves).find((l) => l.name === "LangChain");
		expect(lc?.demandPercentage).toBe(44);
	});

	it("context-group: demandPercentage null + unionShare number (ETAP A5)", () => {
		// AI przeszedł na kurację context-group (A5). Grupa z LangChain to context-group:
		// % obszaru = null (dyskryminator jawny), miara grupy = unionShare (unia ofert).
		const ai = builtModelForTest().paths.find((p) => p.careerGoal === "AI Engineer");
		const grp = ai?.areas.find((a) => a.leaves.some((l) => l.name === "LangChain"));
		expect(grp?.type).toBe("context-group");
		expect(grp?.demandPercentage).toBeNull();
		expect(typeof grp?.unionShare).toBe("number");
	});

	it("grupnik prezentacyjny ma demandPercentage null (Java — A5 przeniósł AI/DS/QA na context-group)", () => {
		// AI/DS/QA są teraz context-group; presentation-group testujemy na ścieżce, która go
		// zachowała (Java Developer „Język i framework"), bo fixtura buduje też Javę.
		const java = builtModelForTest().paths.find((p) => p.careerGoal === "Java Developer");
		const pg = java?.areas.find((a) => a.type === "presentation-group");
		expect(pg).toBeDefined();
		expect(pg?.demandPercentage).toBeNull();
	});

	it("każdy liść z danych ma lift, offers i kind (Tor 1)", () => {
		const ai = builtModelForTest().paths.find((p) => p.careerGoal === "AI Engineer");
		const py = ai?.areas.flatMap((a) => a.leaves).find((l) => l.name === "Python");
		expect(py?.kind).toBe("tool");
		expect(typeof py?.offers).toBe("number");
		expect(py?.lift === null || typeof py?.lift === "number").toBe(true);
	});

	it("dołącza bank projektów; napisane projekty kotwiczą na liściach", () => {
		// Java ma 3 napisane projekty (anchorLeaves niepuste). AI ma na razie szablon todo.
		const model = builtModelForTest();
		const java = model.paths.find((p) => p.careerGoal === "Java Developer");
		expect(java?.projects.length).toBe(3);
		for (const p of java?.projects ?? []) expect(p.anchorLeaves.length).toBeGreaterThan(0);
	});
});

// ── liftOf: krotność (Tor 1) ──────────────────────────────────────────────────

function makeStat(techCount: Record<string, number>, offerCount: number): PathStat {
	return { display: "X", offerCount, techCount: new Map(Object.entries(techCount)), offers: [] };
}

describe("liftOf — krotność", () => {
	it("lift = udział w ścieżce / udział globalny", () => {
		// SIEM: 40/100=40% w ścieżce; 50/1000=5% globalnie → lift 8.
		expect(
			liftOf(makeStat({ SIEM: 40 }, 100), ["SIEM"], new Map([["SIEM", 50]]), 1000),
		).toBeCloseTo(8);
	});
	it("generyk rzadszy w roli niż na rynku → lift < 1 (cyber-efekt Pythona)", () => {
		// Python: 15% w roli, 20% globalnie → 0,75.
		expect(
			liftOf(makeStat({ Python: 15 }, 100), ["Python"], new Map([["Python", 200]]), 1000),
		).toBeCloseTo(0.75);
	});
	it("sumuje warianty w liczniku i mianowniku", () => {
		// AD + AD(AD): 12/100=12% w roli; 18/1000=1,8% globalnie → lift ~6,67.
		const s = makeStat({ "Active Directory": 8, "Active Directory (AD)": 4 }, 100);
		const g = new Map([
			["Active Directory", 12],
			["Active Directory (AD)", 6],
		]);
		expect(liftOf(s, ["Active Directory", "Active Directory (AD)"], g, 1000)).toBeCloseTo(6.667, 2);
	});
	it("brak w globalnej częstości → null (bez dzielenia przez zero)", () => {
		expect(liftOf(makeStat({ X: 0 }, 100), ["X"], new Map(), 1000)).toBeNull();
	});
});

// ── classifyLeafKind: meta/cert/soft/tool (Tor 1) ─────────────────────────────

describe("classifyLeafKind", () => {
	it("meta-tagi → meta (twarda blokada)", () => {
		expect(classifyLeafKind("Cybersecurity")).toBe("meta");
		expect(classifyLeafKind("IT Security")).toBe("meta");
		expect(classifyLeafKind("DevOps")).toBe("meta");
	});
	it("certyfikaty (też warianty po prefiksie) → cert", () => {
		expect(classifyLeafKind("CISSP")).toBe("cert");
		expect(classifyLeafKind("ISTQB Foundation")).toBe("cert");
		expect(classifyLeafKind("ISO 27001 - Information Security Management")).toBe("cert");
	});
	it("miękkie → soft; narzędzia → tool", () => {
		expect(classifyLeafKind("Risk Management")).toBe("soft");
		expect(classifyLeafKind("SIEM")).toBe("tool");
		expect(classifyLeafKind("Splunk")).toBe("tool");
	});
});

// ── flattenLeaves: bramka min-wolumenu (Tor 1 — zastępuje „udział < 1%") ──────

function testLeaf(over: Partial<ModelLeaf> & Pick<ModelLeaf, "name">): ModelLeaf {
	return {
		type: "leaf",
		demandPercentage: 10,
		lift: 5,
		offers: 50,
		kind: "tool",
		source: "dane",
		...over,
	};
}

function modelWithLeaves(pathOffers: number, leaves: ModelLeaf[]): CareerModel {
	return {
		_meta: {
			source: "test",
			snapshot: "2026-02",
			model: "test",
			note: "test",
			families: [],
			paths: 1,
			leafThreshold: "test",
		},
		paths: [
			{
				careerGoal: "Test Path",
				category: "I — Test",
				pathDemandOffers: pathOffers,
				frameworks: {
					family: "I — Test",
					eCfArea: "",
					sfiaCategory: "",
					iscoCode: "",
					iscoLabel: "",
					escoOccupation: "",
				},
				juniorFriendliness: "Średnia",
				targetRole: false,
				tShapePairs: [],
				areas: [
					{
						name: "Obszar",
						type: "knowledge-area",
						demandPercentage: 10,
						unionShare: null,
						leaves,
					},
				],
				projects: [],
			},
		],
	};
}

describe("flattenLeaves — bramka (surowy udział: meta + min-wolumen, BEZ krotności)", () => {
	it("ranking po SUROWYM UDZIALE; BEZ bramki krotności (generyk wysokopopytowy zostaje); mały wolumen wycięty", () => {
		// pathOffers=300 → countMin = max(4, ceil(1,0%·300=3)) = 4.
		const flat = flattenLeaves(
			modelWithLeaves(300, [
				testLeaf({ name: "Generyk", demandPercentage: 20, lift: 0.7, offers: 60 }), // niski lift, ale ZOSTAJE (raw share)
				testLeaf({ name: "Rdzen", demandPercentage: 11, lift: 12, offers: 33 }), // zostaje
				testLeaf({ name: "Niszowy", demandPercentage: 0.7, lift: 20, offers: 2 }), // n=2<4 → out (wolumen)
			]),
		);
		// kolejność = surowy udział malejąco; niszowy wycięty wolumenem
		expect(flat[0].competencies.map((c) => c.name)).toEqual(["Generyk", "Rdzen"]);
	});

	it("META twardo blokowane mimo wysokiego lift+wolumenu", () => {
		const flat = flattenLeaves(
			modelWithLeaves(300, [
				testLeaf({
					name: "Cybersecurity",
					demandPercentage: 26,
					lift: 20,
					offers: 80,
					kind: "meta",
				}),
				testLeaf({ name: "SIEM", demandPercentage: 11, lift: 23, offers: 33 }),
			]),
		);
		expect(flat[0].competencies.map((c) => c.name)).toEqual(["SIEM"]);
	});

	it("countMin skaluje z wielkością ścieżki (1,0%)", () => {
		// pathOffers=1000 → countMin = max(4, ceil(10)) = 10.
		const flat = flattenLeaves(
			modelWithLeaves(1000, [
				testLeaf({ name: "Maly", demandPercentage: 1, lift: 5, offers: 8 }), // 8<10 → out
				testLeaf({ name: "Duzy", demandPercentage: 2, lift: 5, offers: 20 }), // in
			]),
		);
		expect(flat[0].competencies.map((c) => c.name)).toEqual(["Duzy"]);
	});

	it("absent (% null) pomijany; % zaokrąglany do integer; studentSelectable=true", () => {
		const flat = flattenLeaves(
			modelWithLeaves(300, [
				testLeaf({
					name: "Absent",
					demandPercentage: null,
					lift: null,
					offers: null,
					source: "kuracja ekspercka",
				}),
				testLeaf({ name: "Obecny", demandPercentage: 5.6, lift: 5, offers: 30 }),
			]),
		);
		expect(flat[0].studentSelectable).toBe(true);
		expect(flat[0].competencies.map((c) => c.name)).toEqual(["Obecny"]);
		expect(flat[0].competencies[0].demandPercentage).toBe(6);
	});
});

// ── buildCandidates: ściąga do kuracji (Tor 1) ────────────────────────────────

describe("buildCandidates — ściąga do kuracji Sophii", () => {
	it("zwraca kandydatów per ścieżka z kind/lift/offers i flagą passesGate", () => {
		const { stats, freq, total } = statsForModel();
		const cands = buildCandidates(stats, freq, total);
		const ai = cands.find((c) => c.careerGoal === "AI Engineer");
		expect(ai).toBeDefined();
		const py = ai?.candidates.find((c) => c.name === "Python");
		expect(py?.kind).toBe("tool");
		expect(typeof py?.lift).toBe("number");
		expect(py?.passesGate).toBe(true);
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
		expect(artifact._meta.uniqueOffers).toBe(13);
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

	it("DYSKRYMINATOR JAWNY (poprawka Leo): knowledge-area → % (number); context-group/presentation-group → null", () => {
		// % zależy WYŁĄCZNIE od `area.type`, NIE od obecności `description` (krucha pułapka
		// usunięta) — obszar z realnym popytem mógłby mieć opis i nie traci wtedy %.
		for (const path of model.paths) {
			for (const area of path.areas) {
				const where = `${path.careerGoal}/${area.name}`;
				if (area.type === "knowledge-area") {
					expect(typeof area.demandPercentage, where).toBe("number");
				} else {
					// context-group | presentation-group — metryką jest unionShare, % = null
					expect(area.demandPercentage, where).toBeNull();
				}
			}
		}
	});

	it("KURACJA CYBER zachowana: 10 grup context-group z opisem + unionShare (ETAP A nie nadpisał)", () => {
		const cyber = model.paths.find((p) => p.careerGoal === "Cybersecurity Specialist");
		expect(cyber, "ścieżka cyber obecna w artefakcie").toBeDefined();
		const groups = (cyber?.areas ?? []).filter((a) => a.type === "context-group");
		expect(groups.length, "10 skuratorowanych grup Sophii").toBe(10);
		for (const g of groups) {
			const desc = (g as { description?: string }).description;
			expect(typeof desc, `${g.name}: opis grupy`).toBe("string");
			expect((desc ?? "").length, `${g.name}: opis niepusty`).toBeGreaterThan(40);
			expect(g.demandPercentage, `${g.name}: dyskryminator jawny → null`).toBeNull();
			expect(
				g.unionShare === null || typeof g.unionShare === "number",
				`${g.name}: unionShare obecny`,
			).toBe(true);
		}
	});

	it("KURACJA A5 (partia 1+2) zachowana: context-group z opisem + unionShare; kind Sophii (tool/concept)", () => {
		const expected: Record<string, number> = {
			// Partia 1
			"QA Engineer": 8,
			"Data Scientist": 4,
			"AI Engineer": 6,
			// Partia 2
			"Backend Developer": 6,
			"Data Analyst": 7,
			"Frontend Developer": 7,
			"DevOps Engineer": 8,
		};
		for (const [goal, n] of Object.entries(expected)) {
			const path = model.paths.find((p) => p.careerGoal === goal);
			expect(path, `${goal} obecny w artefakcie`).toBeDefined();
			// Pełna wymiana starej struktury: wszystkie obszary to context-group (jak cyber).
			expect(
				path?.areas.every((a) => a.type === "context-group"),
				`${goal}: brak starej knowledge/presentation`,
			).toBe(true);
			const groups = (path?.areas ?? []).filter((a) => a.type === "context-group");
			expect(groups.length, `${goal}: ${n} grup context-group`).toBe(n);
			for (const g of groups) {
				const desc = (g as { description?: string }).description;
				expect(typeof desc, `${goal}/${g.name}: opis`).toBe("string");
				expect((desc ?? "").length, `${goal}/${g.name}: opis niepusty`).toBeGreaterThan(40);
				expect(g.demandPercentage, `${goal}/${g.name}: dyskryminator → null`).toBeNull();
				expect(typeof g.unionShare, `${goal}/${g.name}: unionShare number`).toBe("number");
			}
			// kind kuratorowany przez Sophię: tylko tool/concept, ≥1 concept, wszystko z danych.
			let conceptSeen = 0;
			for (const a of path?.areas ?? []) {
				for (const l of a.leaves) {
					expect(["tool", "concept"], `${goal}/${l.name}: kind ∈ {tool,concept}`).toContain(l.kind);
					expect(l.source, `${goal}/${l.name}: z danych`).toBe("dane");
					if (l.kind === "concept") conceptSeen++;
				}
			}
			expect(conceptSeen, `${goal}: ≥1 concept`).toBeGreaterThan(0);
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

	it("AI Engineer: kuracja A5 — wszystkie grupy context-group, Pandas z danych, brak nagiej dyscypliny", () => {
		const ai = model.paths.find((p) => p.careerGoal === "AI Engineer");
		expect(ai, "ścieżka AI obecna").toBeDefined();
		// ETAP A5: cała ścieżka na wzorcu cyber — context-group, bez knowledge/presentation.
		expect(
			ai?.areas.every((a) => a.type === "context-group"),
			"wszystkie grupy context-group",
		).toBe(true);
		// Naga nazwa dyscypliny wyrzucona jako obszar (jak „Security" w cyber).
		expect(
			ai?.areas.some((a) => a.name === "AI" || a.name === "Machine Learning"),
			"brak obszaru o nagiej nazwie dyscypliny",
		).toBe(false);
		// Pandas dalej jest liściem z realnym % z danych.
		const pandas = ai?.areas
			.find((a) => a.leaves.some((l) => l.name === "Pandas"))
			?.leaves.find((l) => l.name === "Pandas");
		expect(typeof pandas?.demandPercentage, "Pandas % z danych").toBe("number");
		expect(pandas?.source).toBe("dane");
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
