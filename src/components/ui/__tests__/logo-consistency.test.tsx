// @vitest-environment node
//
// BRAMA spójności logo (błąd #1) — wydzielona z Z4 (ui-consistency.test.tsx, blok C),
// SAMOWYSTARCZALNA: zero zależności od docs/ROUTES.md, EXPECTED_ROUTES, wizarda onboardingu
// czy skanu systemu plików dashboardu (te asercje należą do strumienia #5 i zostają w Z4).
//
// PO CO: pilnuje, że znak marki SkillBridge ma JEDNO źródło — wspólny komponent <Logo/>
// importowany i używany na landingu, w sidebarze i w auth — zamiast rozjazdu (dawniej:
// landing/auth = ikona BrainCircuit (lucide), sidebar = własny inline <svg> mortarboard).
// To brama DOCELOWA: fix już jest (fix/b1-shared-logo), więc wszystkie testy są zwykłe
// `it(` i zielone (żadnego it.fails / it.skip).
//
// CZEGO TA BRAMA NIE ŁAPIE: driftu PIKSELOWEGO wariantów (gdy wspólny <Logo/> renderuje
// się różnie per wariant — rozmiar/kolor/glow). To pokrywa KOMPLEMENTARNY job CI
// visual-regression (Playwright toHaveScreenshot, landing+dashboard+auth) — znana luka CI,
// owner stacku: Ethan (G3, Z6). Tu testujemy strukturalnie źródła, deterministycznie.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const LANDING_SRC = readFileSync(join(ROOT, "src", "app", "page.tsx"), "utf8");
const SIDEBAR_SRC = readFileSync(
	join(ROOT, "src", "components", "dashboard", "sidebar.tsx"),
	"utf8",
);
const AUTH_SRC = readFileSync(join(ROOT, "src", "app", "(auth)", "layout.tsx"), "utf8");

/**
 * Wspólny <Logo/>: import modułu „logo" albo użycie znacznika <Logo …>.
 * (Skopiowane 1:1 z logiki Z4, blok C — usesSharedLogoComponent.)
 */
function usesSharedLogoComponent(src: string): boolean {
	return /from\s+["'][^"']*logo["']/i.test(src) || /<Logo[\s/>]/.test(src);
}

describe("Spójność logo (błąd #1) — wspólny <Logo/>", () => {
	it("kontrakt: wspólny <Logo/> używany na landingu i w sidebarze", () => {
		expect(usesSharedLogoComponent(LANDING_SRC)).toBe(true);
		expect(usesSharedLogoComponent(SIDEBAR_SRC)).toBe(true);
	});

	it("strażnik regresji sidebara: brak inline <svg> w bloku logo i brak osieroconego BrainCircuit", () => {
		// Sidebar deleguje znak marki do <Logo/> — żadnego własnego inline <svg> w logo
		// (był: db-sidebar-logo-icon → <svg> mortarboard) ani bezpośredniego importu ikony.
		expect(SIDEBAR_SRC).not.toMatch(/db-sidebar-logo-icon[\s\S]*?<svg/);
		expect(SIDEBAR_SRC).not.toContain("BrainCircuit");
	});

	it("auth również używa wspólnego <Logo/> (parytet trzech kontekstów)", () => {
		expect(usesSharedLogoComponent(AUTH_SRC)).toBe(true);
	});
});
