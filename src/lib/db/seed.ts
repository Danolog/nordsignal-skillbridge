import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { DEMO_CAREER_GOAL_REMAP } from "./data/anchor-config";
import jobMarketArtifact from "./data/job-market-justjoinit.json";
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

// Dane rynku pracy: artefakt policzony przez tools/etl-justjoinit.ts z dwóch CSV
// JustJoinIT (zrzut 2026-02, analiza Darka), model nearest-profile + hierarchia v4
// + warstwa produktu v5. Zastępuje 9 wierszy demo. Prowenicja: docs/data/job-market-provenance.md.
// v5 (decyzja Darka): BEZ widełek — kolumna `salary_range` w jobMarketData zostaje
// NIEZAPEŁNIONA (NULL), bez zmiany schemy. % popytu zostaje (twardy sygnał).
const DATA: Array<{
	careerGoal: string;
	competencies: Array<{
		name: string;
		demandPercentage: number;
		category: string;
	}>;
}> = jobMarketArtifact.data;

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
			// v5: salaryRange NIE jest ustawiane → kolumna salary_range zostaje NULL.
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
		// Migracja demo: stare cele kariery (np. „Full-stack Developer", „UX/UI
		// Designer", „Cybersecurity Analyst") mapujemy na nazwy ścieżek w modelu
		// nearest-profile (tabela DEMO_CAREER_GOAL_REMAP w anchor-config.ts), inaczej
		// dashboard studenta nie znajdzie kompetencji rynkowych dla jego celu.
		const careerGoal = DEMO_CAREER_GOAL_REMAP[demo.careerGoal] ?? demo.careerGoal;
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
				careerGoal,
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
			`  ✓ ${demo.name} (${careerGoal}) — ${demo.acquired.length} kompetencji, ${demo.gaps.length} luk, ${coverage}% pokrycia`,
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
