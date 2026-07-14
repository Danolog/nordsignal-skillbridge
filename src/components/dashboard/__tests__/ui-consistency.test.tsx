// @vitest-environment jsdom
//
// Z4 (Quinn, Agent QA): inwentaryzacja nawigacji (błąd #5) + spójność logo (błąd #1).
//
// GENEZA (docs/product/skillbridge-poprawki-rynek-plan-v0.1.md §2):
//   #5 Pomocnik kariery — trasa /pomocnik-kariery istnieje i działa, ale jest ukryta
//      (commit bbe4571): nie ma jej w sidebarze ANI w przepływie onboardingu = sierota.
//      Decyzja Darka: wpiąć jako Krok 0 onboardingu (plan §1 pkt 2).
//   #1 Logo niespójne — landing (src/app/page.tsx) używa ikony BrainCircuit (lucide);
//      sidebar dashboardu (sidebar.tsx) używa własnego inline <svg>. Dwa różne źródła,
//      brak wspólnego komponentu <Logo/>.
//
// CO TESTUJEMY (strukturalnie, deterministycznie — bez przeglądarki/pikseli):
//   Inwentaryzacja: realne trasy (fs) ↔ mapa ROUTES.md/EXPECTED_ROUTES ↔ wyrenderowany
//   sidebar. Spójność logo: realne źródła landing/sidebar. Pixel-level regresja wizualna
//   (Playwright toHaveScreenshot, landing+dashboard) to KOMPLEMENTARNY job CI dla driftu
//   w przyszłości — brak go (skills/qa/SKILL.md §5), decyzja stacku = Ethan (G3, Z6).
//   Ten test bramkuje OBECNĄ niespójność (sedno błędów #1/#5).
//   RESIDUAL (review Leo N4): gdy wspólny <Logo/> już istnieje, ale jest renderowany
//   różnie na landingu vs dashboard (inny rozmiar/kolor/wariant przez props), TEN test
//   tego NIE złapie — pokrywa to job CI visual-regression (owner stacku: Ethan, G3).
//   Zasada: wspólny <Logo/> wariantuje przez prop, nie przez rozjazd dwóch wywołań.
//
// STRUKTURA (jak w Z2/Z3): charakteryzacja stanu obecnego (ZIELONE) + kontrakt docelowy
//   (it.fails — BRAMA, auto-flip po naprawie). Konwencja statusu tras i ścieżka wspólnego
//   <Logo/> — propozycja do potwierdzenia z Leo/Mila/Ethanem (G1). NIE merge na main bez
//   naprawy odpowiednich strumieni (B: logo; wpięcie pomocnika: onboarding).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut: vi.fn() } }));

const ROOT = process.cwd();
const DASHBOARD_DIR = join(ROOT, "src", "app", "(dashboard)");
const SIDEBAR_SRC = readFileSync(
	join(ROOT, "src", "components", "dashboard", "sidebar.tsx"),
	"utf8",
);
const LANDING_SRC = readFileSync(join(ROOT, "src", "app", "page.tsx"), "utf8");
const WIZARD_SRC = readFileSync(
	join(ROOT, "src", "components", "onboarding", "onboarding-wizard.tsx"),
	"utf8",
);
const ROUTES_MD = readFileSync(join(ROOT, "docs", "ROUTES.md"), "utf8");

// Kanoniczna mapa intencji (mirror docs/ROUTES.md). Test pilnuje, że nie rozjedzie się
// z rzeczywistością (fs + sidebar). status: nav = w sidebarze; flow = z przepływu; child = dziecko.
const EXPECTED_ROUTES: Record<string, "nav" | "flow" | "child"> = {
	"/dashboard": "nav",
	"/skill-map": "nav",
	"/gap-analysis": "nav",
	"/projects": "nav",
	"/moja-droga": "nav",
	"/passport": "nav",
	"/profil": "nav",
	"/onboarding": "flow",
	"/pomocnik-kariery": "flow",
	"/projects/[id]": "child",
	// 1E.6a: drabina curriculum za flagą FLAG_CURRICULUM_PATH — wejście z kafelka
	// na pulpicie (nie sidebar, dopóki pilotaż DS jest za flagą).
	"/curriculum": "flow",
	"/curriculum/[moduleId]": "child",
	"/curriculum/[moduleId]/[itemId]": "child",
};

/**
 * Realne trasy (dashboard) z plików — REKURENCYJNIE (review Leo N1): każdy katalog
 * z page.tsx na dowolnej głębokości, łącznie z child-trasami pod KAŻDYM rodzicem
 * (nie tylko hardkodowanym `projects`). Segment dynamiczny `[x]` zostaje jak jest.
 */
function fsDashboardRoutes(): string[] {
	const out: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const sub = join(dir, entry.name);
			const route = `${prefix}/${entry.name}`;
			if (existsSync(join(sub, "page.tsx"))) out.push(route);
			walk(sub, route);
		}
	};
	walk(DASHBOARD_DIR, "");
	return out.sort();
}

/** Pary (trasa→status) sparsowane z tabeli docs/ROUTES.md (review Leo N2). */
function routesMdStatuses(): Record<string, string> {
	const map: Record<string, string> = {};
	const re = /^\|\s*`([^`]+)`\s*\|\s*`(nav|flow|child)`\s*\|/gm;
	let m: RegExpExecArray | null = re.exec(ROUTES_MD);
	while (m !== null) {
		map[m[1]] = m[2];
		m = re.exec(ROUTES_MD);
	}
	return map;
}

/** Hrefy pozycji nawigacji z WYRENDEROWANEGO sidebara (nie z eksportu — bez zmiany prod). */
function sidebarNavHrefs(): string[] {
	render(<Sidebar user={{ id: "1", name: "Test User", email: "t@e.pl", image: null }} />);
	return screen
		.getAllByRole("link")
		.map((l) => l.getAttribute("href"))
		.filter((h): h is string => !!h && h.startsWith("/"))
		.sort();
}

const navRoutes = Object.entries(EXPECTED_ROUTES)
	.filter(([, s]) => s === "nav")
	.map(([r]) => r)
	.sort();

afterEach(() => {
	vi.clearAllMocks();
});

// ── A. Inwentaryzacja tras — fs ↔ mapa ↔ sidebar ↔ ROUTES.md ─────────────────────
describe("Inwentaryzacja nawigacji (błąd #5)", () => {
	it("realne trasy (dashboard) == klucze mapy EXPECTED_ROUTES (brak nieudokumentowanych/martwych)", () => {
		expect(fsDashboardRoutes()).toEqual(Object.keys(EXPECTED_ROUTES).sort());
	});

	it("docs/ROUTES.md (trasa→status) == EXPECTED_ROUTES jeden-do-jednego (bez driftu mapy)", () => {
		expect(routesMdStatuses()).toEqual(EXPECTED_ROUTES);
	});

	it("trasy status=nav == pozycje sidebara (brak rozjazdu w obie strony)", () => {
		expect(sidebarNavHrefs()).toEqual(navRoutes);
	});

	it("stan obecny: /pomocnik-kariery istnieje, ale NIE w sidebarze (sierota — błąd #5)", () => {
		expect(fsDashboardRoutes()).toContain("/pomocnik-kariery");
		expect(sidebarNavHrefs()).not.toContain("/pomocnik-kariery");
		// Docelowy status: flow (Krok 0 onboardingu).
		expect(EXPECTED_ROUTES["/pomocnik-kariery"]).toBe("flow");
	});
});

// ── B. Osiągalność — brama błędu #5 (wpięcie pomocnika w onboarding) ─────────────
// FLIP (strumień E / #5): Pomocnik wpięty jako Krok 0 wizarda onboardingu. Brama `it.fails`
// zdjęta — test musi być ZIELONY (wizard realnie importuje CareerHelperFlow). Charakteryzacja
// „stan obecny" zaktualizowana na stan PO naprawie, w tym samym PR co fix (dyscyplina R3).
describe("Osiągalność tras (brama błędu #5)", () => {
	it("anty-mask: oba źródła czytania (sidebar render + WIZARD_SRC) żyją", () => {
		// De-mask: dowodzi, że odczyt sidebara i WIZARD_SRC działają — gdyby któreś czytanie
		// było martwe, brama niżej dałaby fałszywą zieleń. Sidebar nadal NIE zawiera Pomocnika
		// (decyzja IA: brak kafelka w Becie — spec §6), osiągalność idzie wyłącznie z wizarda.
		expect(sidebarNavHrefs()).not.toContain("/pomocnik-kariery");
		expect(WIZARD_SRC.length).toBeGreaterThan(0);
	});

	it("/pomocnik-kariery osiągalny: wpięty w przepływ onboardingu jako Krok 0 (career-helper w wizardzie)", () => {
		const inSidebar = sidebarNavHrefs().includes("/pomocnik-kariery");
		// Wpięcie w wizard onboardingu — przez trasę albo komponent career-helper.
		const inOnboardingFlow = /pomocnik-kariery|career-helper/.test(WIZARD_SRC);
		// Po naprawie: osiągalny przez wizard (Krok 0). Anty-mask: NIE samo „true" —
		// dowodzimy konkretnie, że osiągalność płynie z wpięcia w wizard, nie z sidebara.
		expect(inOnboardingFlow).toBe(true);
		expect(inSidebar || inOnboardingFlow).toBe(true);
	});
});

// ── C. Spójność logo (błąd #1) ──────────────────────────────────────────────────
function usesSharedLogoComponent(src: string): boolean {
	// Wspólny <Logo/>: import modułu „logo" albo użycie znacznika <Logo …>.
	return /from\s+["'][^"']*logo["']/i.test(src) || /<Logo[\s/>]/.test(src);
}

// UWAGA (Leo, strumień E): sekcja C (#1 logo) NIE jest zakresem #5. Gdy ten plik Z4
// powstawał na gałęzi `test/z4-ui-inventory`, logo było jeszcze rozjechane. Naprawa #1
// (wspólny `@/components/ui/logo`) wlądowała na main NIEZALEŻNIE — landing i sidebar
// używają już `<Logo/>`. Stara charakteryzacja „stan obecny" (BrainCircuit + inline svg)
// i brama `it.fails` są więc nieaktualne. Aktualizuję je do stanu PO #1, żeby cały plik
// inwentaryzacji był zielony i prawdziwy na bieżącym main; flip #1 jest tylko zsynchronizowaniem
// testu z już-zmergowaną naprawą, nie nową pracą strumienia E.
describe("Spójność logo landing↔dashboard (błąd #1)", () => {
	it("stan po naprawie #1: landing i dashboard NIE mają już rozjechanych źródeł (BrainCircuit/inline svg)", () => {
		// Po #1: landing nie używa już ikony BrainCircuit, sidebar nie ma własnego inline <svg> logo.
		expect(LANDING_SRC).not.toContain("BrainCircuit");
		expect(SIDEBAR_SRC).not.toContain("BrainCircuit");
		expect(SIDEBAR_SRC).not.toMatch(/db-sidebar-logo-icon[\s\S]*?<svg/);
	});

	it("kontrakt docelowy #1 (spełniony): wspólny komponent <Logo/> używany na landingu I w dashboardzie", () => {
		// CEL (standard skills/qa/SKILL.md §2 #1): jeden <Logo/> importowany wszędzie — już osiągnięty.
		expect(usesSharedLogoComponent(LANDING_SRC)).toBe(true);
		expect(usesSharedLogoComponent(SIDEBAR_SRC)).toBe(true);
	});
});
