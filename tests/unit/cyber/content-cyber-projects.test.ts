/**
 * Test jednostkowy walidatora narzędzia ingestu projektów cyber (E2, Leo).
 *
 * Pokrywa KLUCZOWĄ BRAMKĘ JAKOŚCI (ryzyko #1 z E1): walidator nazw kompetencji
 * względem zbioru liści ścieżki cyber z career-model.ts — literówka = cicha utrata
 * pokrycia matchera. Plus walidacja struktury kontraktu projektu (slug/level/wagi/role).
 *
 * Biega w projekcie UNIT (pnpm test:run) — czysta logika, bez bazy.
 * Importuje funkcje z PRODUKCJI (tools/content-cyber-projects.ts), nie repliki.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type CyberProjectInput,
	findUnknownCompetencies,
	getCyberLeafNames,
	isKnownCyberCompetency,
	validateProjectStructure,
} from "../../../tools/content-cyber-projects";

/** Minimalny poprawny projekt (kopia kształtu szkieletu). */
function validProject(): CyberProjectInput {
	return {
		slug: "cyber-siem-pierwsze-alerty-splunk",
		title: "SIEM od zera",
		description: "Opis projektu testowego.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://example.com/lab",
		rubricJson: [
			{ criterion: "A", weight: 40, description: "..." },
			{ criterion: "B", weight: 35, description: "..." },
			{ criterion: "C", weight: 25, description: "..." },
		],
		competencies: [
			{ name: "SIEM", role: "required" },
			{ name: "SOC", role: "required" },
			{ name: "Splunk", role: "required" },
			{ name: "Linux", role: "acquired" },
		],
	};
}

describe("getCyberLeafNames — zbiór liści cyber (jedno źródło prawdy)", () => {
	const leaves = getCyberLeafNames();

	it("zawiera kluczowe liście wszystkich 10 grup", () => {
		for (const name of [
			"SIEM",
			"SOC",
			"Splunk",
			"EDR / XDR",
			"Linux",
			"Python",
			"Risk Management",
			"ISO 27001",
			"AWS",
			"IAM",
			"Active Directory",
			"DevSecOps",
			"TCP/IP",
			"Firewall / IDS-IPS",
			"OWASP",
			"SQL",
		]) {
			expect(leaves.has(name)).toBe(true);
		}
	});

	it("ma 37 liści cyber (mapa E1 §2)", () => {
		expect(leaves.size).toBe(37);
	});

	it("NIE zawiera śmieci ani wariantów countAs", () => {
		expect(leaves.has("SIEM ")).toBe(false); // spacja końcowa
		expect(leaves.has("ISO27001")).toBe(false); // brak spacji
		expect(leaves.has("Splunk Enterprise Security")).toBe(false); // to countAs, nie name
	});
});

describe("isKnownCyberCompetency", () => {
	it("rozpoznaje dokładny liść i odrzuca literówkę", () => {
		expect(isKnownCyberCompetency("Risk Management")).toBe(true);
		expect(isKnownCyberCompetency("RiskManagement")).toBe(false);
	});
});

describe("validateProjectStructure — kontrakt projektu", () => {
	it("poprawny projekt → null (brak błędu)", () => {
		expect(validateProjectStructure(validProject(), 0)).toBeNull();
	});

	it("odrzuca slug nie-kebab-case", () => {
		const p = { ...validProject(), slug: "Cyber_SIEM" };
		expect(validateProjectStructure(p, 0)).toMatch(/kebab-case/);
	});

	it("odrzuca level spoza L1/L2/L3", () => {
		const p = { ...validProject(), level: "L5" as CyberProjectInput["level"] };
		expect(validateProjectStructure(p, 0)).toMatch(/level/);
	});

	it("odrzuca sourceType spoza open_data/oss", () => {
		const p = { ...validProject(), sourceType: "partner" as CyberProjectInput["sourceType"] };
		expect(validateProjectStructure(p, 0)).toMatch(/sourceType/);
	});

	it("odrzuca sumę wag rubryki ≠ 100", () => {
		const p = validProject();
		p.rubricJson = [{ criterion: "X", weight: 90, description: "..." }];
		expect(validateProjectStructure(p, 0)).toMatch(/suma wag/);
	});

	it("odrzuca brak kompetencji required (same acquired)", () => {
		const p = validProject();
		p.competencies = [{ name: "SIEM", role: "acquired" }];
		expect(validateProjectStructure(p, 0)).toMatch(/required/);
	});

	it("odrzuca niepoprawny sourceUrl", () => {
		const p = { ...validProject(), sourceUrl: "ftp://example.com" };
		expect(validateProjectStructure(p, 0)).toMatch(/sourceUrl/);
	});
});

describe("findUnknownCompetencies — KLUCZOWA bramka (nazwy liści)", () => {
	it("poprawne nazwy → brak ostrzeżeń", () => {
		expect(findUnknownCompetencies(validProject())).toEqual([]);
	});

	it("literówka w nazwie kompetencji → wykryta (cicha utrata pokrycia)", () => {
		const p = validProject();
		p.competencies = [
			{ name: "SIEM", role: "required" },
			{ name: "Splnuk", role: "required" }, // literówka
		];
		const msgs = findUnknownCompetencies(p);
		expect(msgs.length).toBe(1);
		expect(msgs[0]).toMatch(/Splnuk/);
	});

	it("dobra nazwa o złej pisowni (ISO27001 zamiast ISO 27001) → wykryta", () => {
		const p = validProject();
		p.competencies = [{ name: "ISO27001", role: "required" }];
		expect(findUnknownCompetencies(p).length).toBe(1);
	});
});

describe("fixtura-szkielet cyber-projects.sample.json", () => {
	it("przechodzi walidację struktury i nazw kompetencji", () => {
		const path = resolve(__dirname, "../../../tools/content/cyber-projects.sample.json");
		const parsed = JSON.parse(readFileSync(path, "utf8")) as CyberProjectInput[];
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed.length).toBeGreaterThan(0);
		for (let i = 0; i < parsed.length; i++) {
			expect(validateProjectStructure(parsed[i], i)).toBeNull();
			expect(findUnknownCompetencies(parsed[i])).toEqual([]);
		}
	});
});
