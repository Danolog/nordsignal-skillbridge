// Demo students + przypisanie do tenantów (K3 multi-tenancy).
//
// Wydzielone z seed.ts, bo seed.ts uruchamia seed() przy imporcie (efekt uboczny:
// połączenie z bazą). Ten moduł jest czysty — można go zaimportować w teście, który
// pilnuje DoD §4 z docs/data/tenant-mapping-beta.md (≥6 studentów/tenant, ≥3 różne
// careerGoal). Bez tego rozdzielenia test musiałby duplikować dane na sztywno i nie
// chroniłby przed regresją w realnym seedzie.

// Tenanty-partnerzy Bety. Demo reseedowane round-robin do tych 2 (decyzja Sophii,
// tenant-mapping-beta.md §4). __unmapped (parking sierot) seedowany osobno w seed.ts.
export const PARTNER_TENANTS = [
	{ slug: "wsb-merito-szczecin", name: "WSB Merito Szczecin" },
	{ slug: "wsb-merito-warszawa", name: "WSB Merito Warszawa" },
] as const;

// Round-robin: student i → tenant-partner. Współdzielone przez seed.ts i test, żeby
// test sprawdzał dokładnie tę logikę, którą wykonuje seed (nie jej kopię).
export function partnerTenantForIndex(i: number): (typeof PARTNER_TENANTS)[number] {
	return PARTNER_TENANTS[i % PARTNER_TENANTS.length];
}

export type DemoGap = {
	name: string;
	priority: "critical" | "important" | "nice_to_have";
	marketPct: number;
	hours: number;
};

export type DemoStudent = {
	userId: string;
	name: string;
	email: string;
	fieldOfStudy: string;
	semester: number;
	careerGoal: string;
	acquired: string[];
	gaps: DemoGap[];
};

export const DEMO_STUDENTS: DemoStudent[] = [
	// ── Data Analyst (3 students) ──
	{
		userId: "demo-anna",
		name: "Anna Kowalska",
		email: "anna.kowalska@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Data Analyst",
		acquired: [
			"SQL",
			"Excel/Arkusze kalkulacyjne",
			"Statystyka",
			"Myślenie analityczne",
			"Komunikacja wyników",
			"Python",
		],
		gaps: [
			{ name: "Tableau/Power BI", priority: "critical", marketPct: 61, hours: 8 },
			{ name: "Pandas", priority: "important", marketPct: 55, hours: 6 },
			{ name: "Machine Learning (podstawy)", priority: "nice_to_have", marketPct: 43, hours: 15 },
			{ name: "Git/GitHub", priority: "important", marketPct: 48, hours: 4 },
		],
	},
	{
		userId: "demo-zofia",
		name: "Zofia Lewandowska",
		email: "zofia.lewandowska@demo.skillbridge.pl",
		fieldOfStudy: "Zarządzanie",
		semester: 3,
		careerGoal: "Data Analyst",
		acquired: ["Excel/Arkusze kalkulacyjne", "Statystyka", "Komunikacja wyników"],
		gaps: [
			{ name: "Python", priority: "critical", marketPct: 78, hours: 20 },
			{ name: "SQL", priority: "critical", marketPct: 89, hours: 12 },
			{ name: "Tableau/Power BI", priority: "critical", marketPct: 61, hours: 8 },
			{ name: "Pandas", priority: "important", marketPct: 55, hours: 10 },
			{ name: "Machine Learning (podstawy)", priority: "nice_to_have", marketPct: 43, hours: 15 },
			{ name: "Myślenie analityczne", priority: "important", marketPct: 83, hours: 6 },
			{ name: "Git/GitHub", priority: "important", marketPct: 48, hours: 4 },
		],
	},
	{
		userId: "demo-tomek",
		name: "Tomasz Dąbrowski",
		email: "tomasz.dabrowski@demo.skillbridge.pl",
		fieldOfStudy: "Ekonomia",
		semester: 5,
		careerGoal: "Data Analyst",
		acquired: [
			"SQL",
			"Python",
			"Excel/Arkusze kalkulacyjne",
			"Statystyka",
			"Pandas",
			"Komunikacja wyników",
			"Myślenie analityczne",
			"Git/GitHub",
		],
		gaps: [
			{ name: "Tableau/Power BI", priority: "important", marketPct: 61, hours: 8 },
			{ name: "Machine Learning (podstawy)", priority: "nice_to_have", marketPct: 43, hours: 15 },
		],
	},
	// ── Frontend Developer (3 students) ──
	{
		userId: "demo-michal",
		name: "Michał Nowak",
		email: "michal.nowak@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 5,
		careerGoal: "Frontend Developer",
		acquired: ["HTML/CSS", "JavaScript", "Git", "Responsive Design", "Figma (podstawy)"],
		gaps: [
			{ name: "TypeScript", priority: "critical", marketPct: 74, hours: 10 },
			{ name: "React", priority: "critical", marketPct: 82, hours: 12 },
			{ name: "REST API", priority: "important", marketPct: 71, hours: 6 },
			{ name: "Testowanie (Jest/Vitest)", priority: "important", marketPct: 52, hours: 8 },
			{ name: "Optymalizacja wydajności", priority: "nice_to_have", marketPct: 45, hours: 10 },
		],
	},
	{
		userId: "demo-ola",
		name: "Aleksandra Mazur",
		email: "aleksandra.mazur@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 6,
		careerGoal: "Frontend Developer",
		acquired: [
			"HTML/CSS",
			"JavaScript",
			"TypeScript",
			"React",
			"Git",
			"Responsive Design",
			"REST API",
		],
		gaps: [
			{ name: "Testowanie (Jest/Vitest)", priority: "important", marketPct: 52, hours: 8 },
			{ name: "Figma (podstawy)", priority: "nice_to_have", marketPct: 58, hours: 4 },
			{ name: "Optymalizacja wydajności", priority: "nice_to_have", marketPct: 45, hours: 10 },
		],
	},
	{
		userId: "demo-jakub",
		name: "Jakub Wójcik",
		email: "jakub.wojcik@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 3,
		careerGoal: "Frontend Developer",
		acquired: ["HTML/CSS", "JavaScript", "Git"],
		gaps: [
			{ name: "TypeScript", priority: "critical", marketPct: 74, hours: 10 },
			{ name: "React", priority: "critical", marketPct: 82, hours: 12 },
			{ name: "REST API", priority: "important", marketPct: 71, hours: 6 },
			{ name: "Responsive Design", priority: "important", marketPct: 79, hours: 5 },
			{ name: "Testowanie (Jest/Vitest)", priority: "important", marketPct: 52, hours: 8 },
			{ name: "Figma (podstawy)", priority: "nice_to_have", marketPct: 58, hours: 4 },
			{ name: "Optymalizacja wydajności", priority: "nice_to_have", marketPct: 45, hours: 10 },
		],
	},
	// ── Backend Developer (3 students) ──
	{
		userId: "demo-piotr",
		name: "Piotr Zieliński",
		email: "piotr.zielinski@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 6,
		careerGoal: "Backend Developer",
		acquired: [
			"Node.js",
			"SQL",
			"REST API",
			"Git",
			"Python/Java",
			"Docker",
			"Bezpieczeństwo aplikacji",
		],
		gaps: [
			{ name: "NoSQL (MongoDB/Redis)", priority: "important", marketPct: 59, hours: 8 },
			{ name: "Mikrousługi", priority: "nice_to_have", marketPct: 48, hours: 12 },
			{ name: "Cloud (AWS/GCP/Azure)", priority: "critical", marketPct: 61, hours: 15 },
		],
	},
	{
		userId: "demo-kamil",
		name: "Kamil Szymański",
		email: "kamil.szymanski@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Backend Developer",
		acquired: ["Python/Java", "SQL", "Git", "REST API"],
		gaps: [
			{ name: "Node.js", priority: "important", marketPct: 72, hours: 10 },
			{ name: "Docker", priority: "critical", marketPct: 69, hours: 8 },
			{ name: "NoSQL (MongoDB/Redis)", priority: "important", marketPct: 59, hours: 8 },
			{ name: "Bezpieczeństwo aplikacji", priority: "nice_to_have", marketPct: 56, hours: 10 },
			{ name: "Mikrousługi", priority: "nice_to_have", marketPct: 48, hours: 12 },
			{ name: "Cloud (AWS/GCP/Azure)", priority: "critical", marketPct: 61, hours: 15 },
		],
	},
	{
		userId: "demo-marta",
		name: "Marta Jankowska",
		email: "marta.jankowska@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 5,
		careerGoal: "Backend Developer",
		acquired: [
			"Node.js",
			"SQL",
			"REST API",
			"Git",
			"Python/Java",
			"NoSQL (MongoDB/Redis)",
			"Docker",
			"Cloud (AWS/GCP/Azure)",
		],
		gaps: [
			{ name: "Bezpieczeństwo aplikacji", priority: "important", marketPct: 56, hours: 10 },
			{ name: "Mikrousługi", priority: "nice_to_have", marketPct: 48, hours: 12 },
		],
	},
	// ── UX/UI Designer (3 students) ──
	{
		userId: "demo-kasia",
		name: "Katarzyna Wiśniewska",
		email: "katarzyna.wisniewska@demo.skillbridge.pl",
		fieldOfStudy: "Grafika komputerowa",
		semester: 3,
		careerGoal: "UX/UI Designer",
		acquired: [
			"Figma",
			"Wireframing",
			"Prototypowanie",
			"Komunikacja z zespołem",
			"User Research",
			"Architektura informacji",
		],
		gaps: [
			{ name: "Design Systems", priority: "important", marketPct: 65, hours: 8 },
			{ name: "Testy użyteczności", priority: "important", marketPct: 61, hours: 6 },
			{ name: "HTML/CSS (podstawy)", priority: "nice_to_have", marketPct: 48, hours: 10 },
			{ name: "Dostępność (WCAG)", priority: "nice_to_have", marketPct: 44, hours: 5 },
		],
	},
	{
		userId: "demo-natalia",
		name: "Natalia Pawlak",
		email: "natalia.pawlak@demo.skillbridge.pl",
		fieldOfStudy: "Grafika komputerowa",
		semester: 5,
		careerGoal: "UX/UI Designer",
		acquired: [
			"Figma",
			"Wireframing",
			"Prototypowanie",
			"User Research",
			"Design Systems",
			"Testy użyteczności",
			"Komunikacja z zespołem",
			"HTML/CSS (podstawy)",
		],
		gaps: [
			{ name: "Architektura informacji", priority: "important", marketPct: 57, hours: 6 },
			{ name: "Dostępność (WCAG)", priority: "nice_to_have", marketPct: 44, hours: 5 },
		],
	},
	{
		userId: "demo-igor",
		name: "Igor Kowalczyk",
		email: "igor.kowalczyk@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka i grafika",
		semester: 4,
		careerGoal: "UX/UI Designer",
		acquired: ["Figma", "Wireframing", "Komunikacja z zespołem", "HTML/CSS (podstawy)"],
		gaps: [
			{ name: "User Research", priority: "critical", marketPct: 73, hours: 8 },
			{ name: "Prototypowanie", priority: "critical", marketPct: 79, hours: 6 },
			{ name: "Design Systems", priority: "important", marketPct: 65, hours: 8 },
			{ name: "Testy użyteczności", priority: "important", marketPct: 61, hours: 6 },
			{ name: "Architektura informacji", priority: "important", marketPct: 57, hours: 6 },
			{ name: "Dostępność (WCAG)", priority: "nice_to_have", marketPct: 44, hours: 5 },
		],
	},
	// ── Full-stack Developer (3 students) ──
	{
		userId: "demo-adam",
		name: "Adam Krawczyk",
		email: "adam.krawczyk@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 5,
		careerGoal: "Full-stack Developer",
		acquired: ["JavaScript/TypeScript", "React", "Node.js", "SQL", "Git", "REST API"],
		gaps: [
			{ name: "Docker", priority: "important", marketPct: 63, hours: 8 },
			{ name: "CI/CD", priority: "important", marketPct: 55, hours: 6 },
			{ name: "Testowanie", priority: "important", marketPct: 58, hours: 8 },
			{ name: "Cloud (podstawy)", priority: "nice_to_have", marketPct: 54, hours: 10 },
		],
	},
	{
		userId: "demo-ewa",
		name: "Ewa Nowicka",
		email: "ewa.nowicka@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Full-stack Developer",
		acquired: ["JavaScript/TypeScript", "React", "Git", "SQL"],
		gaps: [
			{ name: "Node.js", priority: "critical", marketPct: 74, hours: 10 },
			{ name: "REST API", priority: "critical", marketPct: 85, hours: 6 },
			{ name: "Docker", priority: "important", marketPct: 63, hours: 8 },
			{ name: "CI/CD", priority: "important", marketPct: 55, hours: 6 },
			{ name: "Testowanie", priority: "important", marketPct: 58, hours: 8 },
			{ name: "Cloud (podstawy)", priority: "nice_to_have", marketPct: 54, hours: 10 },
		],
	},
	{
		userId: "demo-bartek",
		name: "Bartosz Olszewski",
		email: "bartosz.olszewski@demo.skillbridge.pl",
		fieldOfStudy: "Informatyka",
		semester: 6,
		careerGoal: "Full-stack Developer",
		acquired: [
			"JavaScript/TypeScript",
			"React",
			"Node.js",
			"SQL",
			"Git",
			"REST API",
			"Docker",
			"Testowanie",
			"CI/CD",
		],
		gaps: [{ name: "Cloud (podstawy)", priority: "nice_to_have", marketPct: 54, hours: 10 }],
	},
];
