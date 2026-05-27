import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DEMO_PROJECTS } from "./seed-projects";
import { DEMO_STUDENTS, PARTNER_TENANTS, partnerTenantForIndex } from "./seed-students";

config({ path: ".env.local" });

const {
	jobMarketData,
	user,
	account,
	students,
	competencies,
	gaps,
	passports,
	projects,
	projectCompetencies,
	tenants,
} = schema;

// K3: demo reseedowane do 2 tenantów-partnerów (decyzja Sophii: ≥6 studentów/tenant,
// ≥3 różne careerGoal). 15 demo studentów dzielonych round-robin → 8/7, oba ≥6.
// Dane studentów + logika przypisania w ./seed-students (czysty moduł, testowalny
// bez połączenia z bazą); DoD §4 pilnuje __tests__/seed-tenants.test.ts.
const db = drizzle(process.env.DATABASE_URL ?? "", { schema });

const DATA: Array<{
	careerGoal: string;
	competencies: Array<{
		name: string;
		demandPercentage: number;
		category: string;
		salaryRange: string;
	}>;
}> = [
	{
		careerGoal: "Data Analyst",
		competencies: [
			{
				name: "Python",
				demandPercentage: 78,
				category: "Technical",
				salaryRange: "8000-15000 PLN",
			},
			{ name: "SQL", demandPercentage: 89, category: "Technical", salaryRange: "8000-15000 PLN" },
			{
				name: "Excel/Arkusze kalkulacyjne",
				demandPercentage: 72,
				category: "Technical",
				salaryRange: "7000-12000 PLN",
			},
			{
				name: "Tableau/Power BI",
				demandPercentage: 61,
				category: "Technical",
				salaryRange: "9000-16000 PLN",
			},
			{
				name: "Statystyka",
				demandPercentage: 67,
				category: "Technical",
				salaryRange: "8000-14000 PLN",
			},
			{
				name: "Pandas",
				demandPercentage: 55,
				category: "Technical",
				salaryRange: "9000-15000 PLN",
			},
			{
				name: "Machine Learning (podstawy)",
				demandPercentage: 43,
				category: "Technical",
				salaryRange: "10000-18000 PLN",
			},
			{
				name: "Komunikacja wyników",
				demandPercentage: 71,
				category: "Soft Skills",
				salaryRange: "8000-15000 PLN",
			},
			{
				name: "Myślenie analityczne",
				demandPercentage: 83,
				category: "Soft Skills",
				salaryRange: "8000-15000 PLN",
			},
			{
				name: "Git/GitHub",
				demandPercentage: 48,
				category: "Technical",
				salaryRange: "8000-15000 PLN",
			},
		],
	},
	{
		careerGoal: "Frontend Developer",
		competencies: [
			{
				name: "JavaScript",
				demandPercentage: 95,
				category: "Technical",
				salaryRange: "8000-18000 PLN",
			},
			{
				name: "TypeScript",
				demandPercentage: 74,
				category: "Technical",
				salaryRange: "10000-20000 PLN",
			},
			{
				name: "React",
				demandPercentage: 82,
				category: "Technical",
				salaryRange: "10000-20000 PLN",
			},
			{
				name: "HTML/CSS",
				demandPercentage: 91,
				category: "Technical",
				salaryRange: "7000-15000 PLN",
			},
			{ name: "Git", demandPercentage: 88, category: "Technical", salaryRange: "8000-18000 PLN" },
			{
				name: "REST API",
				demandPercentage: 71,
				category: "Technical",
				salaryRange: "9000-18000 PLN",
			},
			{
				name: "Responsive Design",
				demandPercentage: 79,
				category: "Technical",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "Testowanie (Jest/Vitest)",
				demandPercentage: 52,
				category: "Technical",
				salaryRange: "10000-19000 PLN",
			},
			{
				name: "Figma (podstawy)",
				demandPercentage: 58,
				category: "Design",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "Optymalizacja wydajności",
				demandPercentage: 45,
				category: "Technical",
				salaryRange: "12000-22000 PLN",
			},
		],
	},
	{
		careerGoal: "Backend Developer",
		competencies: [
			{
				name: "Node.js",
				demandPercentage: 72,
				category: "Technical",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Python/Java",
				demandPercentage: 68,
				category: "Technical",
				salaryRange: "10000-22000 PLN",
			},
			{ name: "SQL", demandPercentage: 85, category: "Technical", salaryRange: "9000-20000 PLN" },
			{
				name: "NoSQL (MongoDB/Redis)",
				demandPercentage: 59,
				category: "Technical",
				salaryRange: "10000-21000 PLN",
			},
			{
				name: "REST API",
				demandPercentage: 88,
				category: "Technical",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Docker",
				demandPercentage: 69,
				category: "Technical",
				salaryRange: "12000-24000 PLN",
			},
			{ name: "Git", demandPercentage: 90, category: "Technical", salaryRange: "10000-22000 PLN" },
			{
				name: "Bezpieczeństwo aplikacji",
				demandPercentage: 56,
				category: "Technical",
				salaryRange: "12000-24000 PLN",
			},
			{
				name: "Mikrousługi",
				demandPercentage: 48,
				category: "Technical",
				salaryRange: "14000-26000 PLN",
			},
			{
				name: "Cloud (AWS/GCP/Azure)",
				demandPercentage: 61,
				category: "Technical",
				salaryRange: "13000-25000 PLN",
			},
		],
	},
	{
		careerGoal: "Full-stack Developer",
		competencies: [
			{
				name: "JavaScript/TypeScript",
				demandPercentage: 92,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{
				name: "React",
				demandPercentage: 79,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{
				name: "Node.js",
				demandPercentage: 74,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{ name: "SQL", demandPercentage: 82, category: "Technical", salaryRange: "11000-24000 PLN" },
			{ name: "Git", demandPercentage: 91, category: "Technical", salaryRange: "12000-25000 PLN" },
			{
				name: "Docker",
				demandPercentage: 63,
				category: "Technical",
				salaryRange: "14000-27000 PLN",
			},
			{
				name: "REST API",
				demandPercentage: 85,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{
				name: "CI/CD",
				demandPercentage: 55,
				category: "Technical",
				salaryRange: "15000-28000 PLN",
			},
			{
				name: "Testowanie",
				demandPercentage: 58,
				category: "Technical",
				salaryRange: "13000-26000 PLN",
			},
			{
				name: "Cloud (podstawy)",
				demandPercentage: 54,
				category: "Technical",
				salaryRange: "14000-27000 PLN",
			},
		],
	},
	{
		careerGoal: "UX/UI Designer",
		competencies: [
			{ name: "Figma", demandPercentage: 91, category: "Technical", salaryRange: "7000-16000 PLN" },
			{
				name: "User Research",
				demandPercentage: 73,
				category: "Research",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "Wireframing",
				demandPercentage: 82,
				category: "Design",
				salaryRange: "7000-15000 PLN",
			},
			{
				name: "Prototypowanie",
				demandPercentage: 79,
				category: "Design",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "Design Systems",
				demandPercentage: 65,
				category: "Design",
				salaryRange: "9000-18000 PLN",
			},
			{
				name: "Testy użyteczności",
				demandPercentage: 61,
				category: "Research",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "Architektura informacji",
				demandPercentage: 57,
				category: "Design",
				salaryRange: "8000-16000 PLN",
			},
			{
				name: "HTML/CSS (podstawy)",
				demandPercentage: 48,
				category: "Technical",
				salaryRange: "8000-15000 PLN",
			},
			{
				name: "Dostępność (WCAG)",
				demandPercentage: 44,
				category: "Design",
				salaryRange: "9000-17000 PLN",
			},
			{
				name: "Komunikacja z zespołem",
				demandPercentage: 84,
				category: "Soft Skills",
				salaryRange: "8000-16000 PLN",
			},
		],
	},
	{
		careerGoal: "Project Manager",
		competencies: [
			{
				name: "Agile/Scrum",
				demandPercentage: 81,
				category: "Methodology",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Zarządzanie ryzykiem",
				demandPercentage: 73,
				category: "Management",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Komunikacja",
				demandPercentage: 91,
				category: "Soft Skills",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Jira/MS Project",
				demandPercentage: 76,
				category: "Technical",
				salaryRange: "9000-20000 PLN",
			},
			{
				name: "Budżetowanie",
				demandPercentage: 65,
				category: "Management",
				salaryRange: "11000-23000 PLN",
			},
			{
				name: "Zarządzanie interesariuszami",
				demandPercentage: 78,
				category: "Management",
				salaryRange: "11000-23000 PLN",
			},
			{
				name: "Priorytetyzacja",
				demandPercentage: 82,
				category: "Management",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Excel/Google Sheets",
				demandPercentage: 69,
				category: "Technical",
				salaryRange: "9000-20000 PLN",
			},
			{
				name: "Prezentacje",
				demandPercentage: 74,
				category: "Soft Skills",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Negocjacje",
				demandPercentage: 58,
				category: "Soft Skills",
				salaryRange: "12000-25000 PLN",
			},
		],
	},
	{
		careerGoal: "Data Scientist",
		competencies: [
			{
				name: "Python",
				demandPercentage: 94,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{
				name: "Machine Learning",
				demandPercentage: 88,
				category: "Technical",
				salaryRange: "14000-28000 PLN",
			},
			{
				name: "Deep Learning",
				demandPercentage: 67,
				category: "Technical",
				salaryRange: "15000-30000 PLN",
			},
			{ name: "SQL", demandPercentage: 79, category: "Technical", salaryRange: "12000-25000 PLN" },
			{
				name: "Statystyka zaawansowana",
				demandPercentage: 83,
				category: "Technical",
				salaryRange: "13000-27000 PLN",
			},
			{
				name: "TensorFlow/PyTorch",
				demandPercentage: 61,
				category: "Technical",
				salaryRange: "15000-30000 PLN",
			},
			{
				name: "Pandas/NumPy",
				demandPercentage: 87,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{ name: "Git", demandPercentage: 75, category: "Technical", salaryRange: "12000-25000 PLN" },
			{
				name: "Komunikacja wyników",
				demandPercentage: 72,
				category: "Soft Skills",
				salaryRange: "13000-26000 PLN",
			},
			{
				name: "Big Data (Spark/Hadoop)",
				demandPercentage: 45,
				category: "Technical",
				salaryRange: "16000-32000 PLN",
			},
		],
	},
	{
		careerGoal: "DevOps Engineer",
		competencies: [
			{
				name: "Docker",
				demandPercentage: 89,
				category: "Technical",
				salaryRange: "14000-28000 PLN",
			},
			{
				name: "Kubernetes",
				demandPercentage: 74,
				category: "Technical",
				salaryRange: "16000-32000 PLN",
			},
			{
				name: "CI/CD (Jenkins/GitHub Actions)",
				demandPercentage: 85,
				category: "Technical",
				salaryRange: "14000-28000 PLN",
			},
			{
				name: "Linux",
				demandPercentage: 91,
				category: "Technical",
				salaryRange: "13000-26000 PLN",
			},
			{
				name: "Terraform/Ansible",
				demandPercentage: 63,
				category: "Technical",
				salaryRange: "16000-30000 PLN",
			},
			{
				name: "AWS/GCP/Azure",
				demandPercentage: 78,
				category: "Technical",
				salaryRange: "16000-32000 PLN",
			},
			{ name: "Git", demandPercentage: 92, category: "Technical", salaryRange: "13000-26000 PLN" },
			{
				name: "Monitoring (Prometheus/Grafana)",
				demandPercentage: 67,
				category: "Technical",
				salaryRange: "15000-28000 PLN",
			},
			{
				name: "Sieci komputerowe",
				demandPercentage: 71,
				category: "Technical",
				salaryRange: "14000-26000 PLN",
			},
			{
				name: "Bezpieczeństwo infrastruktury",
				demandPercentage: 59,
				category: "Technical",
				salaryRange: "16000-30000 PLN",
			},
		],
	},
	{
		careerGoal: "Cybersecurity Analyst",
		competencies: [
			{
				name: "Sieci komputerowe",
				demandPercentage: 88,
				category: "Technical",
				salaryRange: "10000-22000 PLN",
			},
			{
				name: "Protokoły bezpieczeństwa",
				demandPercentage: 82,
				category: "Technical",
				salaryRange: "12000-24000 PLN",
			},
			{
				name: "Testy penetracyjne",
				demandPercentage: 71,
				category: "Technical",
				salaryRange: "13000-26000 PLN",
			},
			{
				name: "SIEM (Splunk/QRadar)",
				demandPercentage: 64,
				category: "Technical",
				salaryRange: "12000-24000 PLN",
			},
			{
				name: "Linux",
				demandPercentage: 85,
				category: "Technical",
				salaryRange: "11000-22000 PLN",
			},
			{
				name: "Python/Bash",
				demandPercentage: 67,
				category: "Technical",
				salaryRange: "12000-24000 PLN",
			},
			{
				name: "Ocena ryzyka",
				demandPercentage: 76,
				category: "Management",
				salaryRange: "12000-24000 PLN",
			},
			{
				name: "Compliance (RODO/GDPR/ISO 27001)",
				demandPercentage: 69,
				category: "Legal",
				salaryRange: "11000-22000 PLN",
			},
			{
				name: "Reagowanie na incydenty",
				demandPercentage: 73,
				category: "Technical",
				salaryRange: "12000-25000 PLN",
			},
			{
				name: "Etyczny hacking",
				demandPercentage: 58,
				category: "Technical",
				salaryRange: "14000-28000 PLN",
			},
		],
	},
];

async function seed() {
	console.log("Seeding job market data...");

	// Delete existing data (idempotent)
	await db.delete(jobMarketData);

	const rows = DATA.flatMap((entry) =>
		entry.competencies.map((comp) => ({
			careerGoal: entry.careerGoal,
			competencyName: comp.name,
			demandPercentage: comp.demandPercentage,
			category: comp.category,
			salaryRange: comp.salaryRange,
		})),
	);

	await db.insert(jobMarketData).values(rows);
	console.log(`Seeded ${rows.length} job market records for ${DATA.length} career goals.`);

	// ── Seed tenants (K3) — 2 partnerzy Bety + parking sierot ──
	console.log("Seeding tenants...");
	await db
		.insert(tenants)
		.values([
			...PARTNER_TENANTS.map((t) => ({ slug: t.slug, name: t.name })),
			{ slug: "__unmapped", name: "Niezmapowane (parking sierot — RLS deny)" },
		])
		.onConflictDoNothing();
	const tenantRows = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants);
	const tenantIdBySlug = new Map(tenantRows.map((t) => [t.slug, t.id]));

	// ── Seed demo students ──
	console.log("Seeding demo students...");

	// Clean up ALL demo users (old and new IDs) — cascade deletes students, competencies, gaps, etc.
	const allDemoIds = [
		...DEMO_STUDENTS.map((d) => d.userId),
		// Old IDs from previous seed version
		"demo-user-anna",
		"demo-user-michal",
		"demo-user-kasia",
		"demo-user-piotr",
		"demo-user-zofia",
	];
	for (const id of allDemoIds) {
		await db.delete(account).where(eq(account.userId, id));
		await db.delete(students).where(eq(students.userId, id));
		await db.delete(user).where(eq(user.id, id));
	}
	console.log("  Cleaned up old demo data.");

	const now = new Date();

	for (let i = 0; i < DEMO_STUDENTS.length; i++) {
		const demo = DEMO_STUDENTS[i];
		// Round-robin przypisanie do 2 tenantów-partnerów; university spójne z tenantem.
		const partner = partnerTenantForIndex(i);
		const tenantId = tenantIdBySlug.get(partner.slug);
		if (!tenantId) throw new Error(`seed: brak tenanta ${partner.slug}`);
		// Upsert user
		await db
			.insert(user)
			.values({
				id: demo.userId,
				name: demo.name,
				email: demo.email,
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();

		// Upsert account (credential provider, no real password — demo only)
		await db
			.insert(account)
			.values({
				id: `acc-${demo.userId}`,
				accountId: demo.userId,
				providerId: "credential",
				userId: demo.userId,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();

		// Delete existing student data for this user (idempotent re-seed)
		const existingStudent = await db.query.students.findFirst({
			where: (s, { eq }) => eq(s.userId, demo.userId),
		});
		if (existingStudent) {
			await db.delete(students).where(eq(students.userId, demo.userId));
		}

		// Insert student
		const [newStudent] = await db
			.insert(students)
			.values({
				userId: demo.userId,
				tenantId,
				university: partner.name,
				fieldOfStudy: demo.fieldOfStudy,
				semester: demo.semester,
				careerGoal: demo.careerGoal,
				onboardingCompleted: true,
			})
			.returning({ id: students.id });

		const studentId = newStudent.id;

		// Insert acquired competencies
		if (demo.acquired.length > 0) {
			await db.insert(competencies).values(
				demo.acquired.map((name) => ({
					studentId,
					tenantId,
					name,
					status: "acquired" as const,
				})),
			);
		}

		// Insert gaps
		if (demo.gaps.length > 0) {
			await db.insert(gaps).values(
				demo.gaps.map((g) => ({
					studentId,
					tenantId,
					competencyName: g.name,
					priority: g.priority,
					marketPercentage: g.marketPct,
					estimatedHours: g.hours,
				})),
			);
		}

		// Insert passport
		const totalComps = demo.acquired.length + demo.gaps.length;
		const coverage = Math.round((demo.acquired.length / totalComps) * 100);
		await db.insert(passports).values({
			studentId,
			tenantId,
			marketCoveragePercent: coverage,
		});

		console.log(
			`  ✓ ${demo.name} (${demo.careerGoal}) — ${demo.acquired.length} kompetencji, ${demo.gaps.length} luk, ${coverage}% pokrycia`,
		);
	}

	console.log(`\nSeeded ${DEMO_STUDENTS.length} demo students.`);

	// ── Seed demo projects ──
	console.log("\nSeeding demo projects...");

	// Delete existing projects (cascade deletes competencies and submissions)
	await db.delete(projectCompetencies);
	await db.delete(projects);

	for (const proj of DEMO_PROJECTS) {
		const [newProject] = await db
			.insert(projects)
			.values({
				slug: proj.slug,
				title: proj.title,
				description: proj.description,
				level: proj.level,
				estimatedHours: proj.estimatedHours,
				sourceType: proj.sourceType,
				sourceUrl: proj.sourceUrl,
				rubricJson: proj.rubricJson,
			})
			.returning({ id: projects.id });

		if (proj.competencies.length > 0) {
			await db.insert(projectCompetencies).values(
				proj.competencies.map((c) => ({
					projectId: newProject.id,
					competencyName: c.name,
					role: c.role,
				})),
			);
		}

		console.log(`  ✓ ${proj.title} (${proj.level}, ${proj.sourceType})`);
	}

	console.log(`\nSeeded ${DEMO_PROJECTS.length} demo projects.`);
	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
