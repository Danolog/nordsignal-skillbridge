// ============================================================================
// AG.3 — POMIAR CZASU ETL NA SKALI KANONICZNEGO ZRZUTU (DoD: timeout wcześnie).
//
// Roadmapa ostrzegała: „limit czasu funkcji Vercela może nie unieść długiego
// ETL — sprawdzić wcześnie, bo determinuje architekturę odświeżania" (chunking
// wzorem 0.10). Ten test generuje SYNTETYCZNE dane o skali kanonicznego zrzutu
// (9 922 ofert / ~54k wierszy technologii, prowenicja §0.2) i mierzy pełny
// przebieg parseCsv + buildArtifact. Budżet asercji 30 s to ułamek maxDuration
// 300 s trasy ingest z ogromnym zapasem na wolne CI — realny czas (logowany)
// jest rzędu pojedynczych sekund, więc chunking NIE jest potrzebny.
//
// Generacja deterministyczna (indeks, nie Math.random) — stabilny pomiar.
// ============================================================================

import { describe, expect, it } from "vitest";
import { buildArtifact, parseCsv } from "@/lib/market-refresh/etl-core";

const OFFER_COUNT = 9_922;
const TECHS_PER_OFFER = 5; // ~49,6k wierszy technologii (skala 54k z zapasem 10%)

const TITLES = [
	"Java Developer",
	"Senior Java Developer",
	"Frontend Developer",
	"Backend Developer",
	"Full-Stack Developer",
	"Full-Stack Engineer",
	".NET Developer",
	"Python Developer",
	"DevOps Engineer",
	"Data Engineer",
	"Data Analyst",
	"Data Scientist",
	"AI Engineer",
	"QA Engineer",
	"QA Automation Engineer",
	"Business Analyst",
	"System Analyst",
	"Android Developer",
	"Project Manager",
	"Product Owner",
	"Salesforce Developer",
	"Security Engineer",
	"UX Designer",
	"Software Engineer",
	"Solution Architect",
	"PHP Developer",
	"Machine Learning Engineer",
	"Embedded C++ Developer",
	"Cloud Engineer",
	"Site Reliability Engineer",
];

const KATEGORIE = ["Java", "Frontend", "Backend", "Data", "DevOps", "Security", "Ux", "PM"];

const TECH_POOL = [
	"Java",
	"Spring Boot",
	"SQL",
	"Docker",
	"Kubernetes",
	"React",
	"TypeScript",
	"JavaScript",
	"Python",
	"AWS",
	"Azure",
	"GCP",
	"Terraform",
	"CI/CD",
	"Git",
	"PostgreSQL",
	"Kafka",
	"Linux",
	"C#",
	"Angular",
	"Node.js",
	"Pandas",
	"Spark",
	"Selenium",
	"Jira",
	"UML",
	"Figma",
	"Kotlin",
	"Swift",
	"PHP",
	"SIEM",
	"Splunk",
	"Playwright",
	"GraphQL",
	"Redis",
	"MongoDB",
	"Ansible",
	"Jenkins",
	"Power BI",
	"Databricks",
];

function syntheticCsvs(): { oferty: string; technologie: string } {
	const oferty: string[] = ["Slug;Stanowisko;Kategoria"];
	const technologie: string[] = ["Slug;Technologia"];
	for (let i = 0; i < OFFER_COUNT; i++) {
		const title = TITLES[i % TITLES.length];
		const kategoria = KATEGORIE[i % KATEGORIE.length];
		oferty.push(`s-${i};${title};${kategoria}`);
		// Techs skorelowane z tytułem (offset po indeksie tytułu) — kotwice dostają
		// spójne profile top-12, przypisanie nearest-profile ma na czym pracować.
		const base = (i % TITLES.length) * 3;
		for (let t = 0; t < TECHS_PER_OFFER; t++) {
			technologie.push(`s-${i};${TECH_POOL[(base + t * 2 + (i % 3)) % TECH_POOL.length]}`);
		}
	}
	return { oferty: oferty.join("\r\n"), technologie: technologie.join("\r\n") };
}

describe("AG.3 · ETL na skali kanonicznego zrzutu (bez chunkingu)", () => {
	it(`parseCsv + buildArtifact dla ${OFFER_COUNT} ofert / ~${OFFER_COUNT * TECHS_PER_OFFER} wierszy tech mieści się z zapasem w budżecie trasy`, () => {
		const { oferty, technologie } = syntheticCsvs();

		const t0 = performance.now();
		const offerRows = parseCsv(oferty);
		const techRows = parseCsv(technologie);
		const { artifact } = buildArtifact(offerRows, techRows);
		const elapsedMs = performance.now() - t0;

		console.log(
			`[etl-scale] ${offerRows.length} ofert + ${techRows.length} wierszy tech → ` +
				`${artifact._meta.paths} ścieżek w ${Math.round(elapsedMs)} ms ` +
				`(przypisane: ${artifact._meta.assignedOffers}, pokrycie ${artifact._meta.coveragePercent}%)`,
		);

		expect(offerRows).toHaveLength(OFFER_COUNT);
		expect(artifact._meta.uniqueOffers).toBe(OFFER_COUNT);
		// Sanity skali: silnik realnie przypisuje i buduje wiele ścieżek (nie no-op).
		expect(artifact._meta.assignedOffers).toBeGreaterThan(OFFER_COUNT / 2);
		expect(artifact._meta.paths).toBeGreaterThan(5);
		// Budżet: 30 s = 10% maxDuration trasy ingest, z ogromnym zapasem na CI.
		expect(elapsedMs).toBeLessThan(30_000);
	});
});
