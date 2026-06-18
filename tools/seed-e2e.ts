/**
 * Seed E2E — izolowane konta + dane testowe pod pakiet smoke @dbwrite.
 *
 * Tworzy w IZOLOWANYM tenancie testowym:
 *  - tenant "e2e-test"
 *  - student "main"  (onboardingCompleted=TRUE):  ≥5 kompetencji, paszport,
 *                     projekt + zgłoszenie (marketplace + detal). Pod B1, dashboard,
 *                     marketplace.
 *  - student "b4"    (onboardingCompleted=FALSE):  profil + ≥5 kompetencji
 *                     (nieocenione). Pod B4 (wizard 1→4, ocena ≥5).
 *  - ≥1 projekt globalny (jeśli brak) → detal projektu ma się z czego otworzyć.
 *
 * Konta logowalne tworzone przez better-auth signUpEmail (REALNY hash hasła) —
 * nie ręcznym INSERT do account.password.
 *
 * BEZPIECZEŃSTWO:
 *  - Wymaga E2E_DATABASE_URL (osobna BAZA TESTOWA). NIE czyta .env.local (prod).
 *  - Odmawia startu, jeśli URL wygląda na produkcyjny host (neon prod / vercel).
 *  - Idempotentny: bezpieczny do ponownego uruchomienia (upsert + sprzątanie
 *    własnych rekordów po stałych ID).
 *
 * Użycie (PowerShell):
 *   $env:E2E_DATABASE_URL="postgresql://user:pass@localhost:5432/skillbridge_e2e"
 *   $env:E2E_TEST_EMAIL="e2e-main@example.com";      $env:E2E_TEST_PASSWORD="Test1234!e2e"
 *   $env:E2E_TEST_EMAIL_B4="e2e-b4@example.com";      $env:E2E_TEST_PASSWORD_B4="Test1234!e2e"
 *   $env:BETTER_AUTH_SECRET="<dowolny-32-bajtowy>";   $env:BETTER_AUTH_URL="http://localhost:3000"
 *   pnpm exec tsx tools/seed-e2e.ts
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { assertTestDb } from "./assert-test-db";

// ── Guard bezpieczeństwa: allowlista hostów testowych (localhost / 127.0.0.1 / ::1)
// assertTestDb przerywa z czytelnym błędem, gdy E2E_DATABASE_URL wskazuje
// na nie-lokalny host — nawet jeśli agent pomyli env lub użyje bash-prefixu.
// Ten seed celowo NIE czyta .env.local (prod). ──────────────────────────────────
const DB_URL = process.env.E2E_DATABASE_URL;
try {
	assertTestDb(DB_URL, "E2E_DATABASE_URL");
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

// Idempotencja: tenant i projekt po stałym slug; konta po e-mailu (better-auth
// generuje własne user.id, więc nie narzucamy go ręcznie).
const TENANT_SLUG = "e2e-test";
const PROJECT_SLUG = "e2e-detal-projektu";
// B5 — drugi projekt z zaakceptowanym (verified) zgłoszeniem. Callout refleksji
// wyzwala się tylko przy status='verified' (REFLECTION_TRIGGER_STATUSES), więc B5
// potrzebuje OSOBNEGO projektu — pierwszy zostaje 'submitted' (pod T2 + 20-spec).
const PROJECT_SLUG_VERIFIED = "e2e-projekt-zaakceptowany";

const MAIN_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-main@example.com";
const MAIN_PASS = process.env.E2E_TEST_PASSWORD ?? "Test1234!e2e";
const B4_EMAIL = process.env.E2E_TEST_EMAIL_B4 ?? "e2e-b4@example.com";
const B4_PASS = process.env.E2E_TEST_PASSWORD_B4 ?? "Test1234!e2e";
// Konto „resume" (fala B — wznawianie onboardingu): careerGoal≠"", onboardingCompleted=false,
// onboardingStep>=1 → wejście /onboarding wznawia kreator od zapisanego kroku z danymi.
const RESUME_EMAIL = process.env.E2E_TEST_EMAIL_RESUME ?? "e2e-resume@example.com";
const RESUME_PASS = process.env.E2E_TEST_PASSWORD_RESUME ?? "Test1234!e2e";

const COMPETENCIES_MAIN = ["Python", "SQL", "Pandas", "Statystyka", "Git", "Komunikacja wyników"];
const COMPETENCIES_B4 = ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git", "REST API"];
const COMPETENCIES_RESUME = ["Python", "SQL", "Excel", "Statystyka", "Wizualizacja danych"];

async function main() {
	// drizzle na owner connection (jak src/lib/db/seed.ts) — owner zapisuje
	// wszystkie tabele studenta (RLS egzekwowane w runtime, nie w seedzie).
	const db = drizzle(DB_URL as string, { schema });

	const {
		user,
		tenants,
		students,
		competencies,
		passports,
		projects,
		projectCompetencies,
		projectSubmissions,
	} = schema;

	// better-auth signUpEmail — REALNY hash hasła. Import dynamiczny: moduł
	// czyta env (BETTER_AUTH_*), które ustawiamy przed odpaleniem seeda.
	// Auth adapter używa src/lib/db (DATABASE_URL); dla seeda kierujemy go na
	// tę samą bazę testową przez DATABASE_URL = E2E_DATABASE_URL (patrz niżej).
	process.env.DATABASE_URL = DB_URL;
	const { auth } = await import("../src/lib/auth/server");

	const now = new Date();

	// ── Tenant testowy ─────────────────────────────────────────────────────────
	await db
		.insert(tenants)
		.values({ slug: TENANT_SLUG, name: "E2E Test (izolowany tenant)" })
		.onConflictDoNothing();
	const tenantRow = await db.query.tenants.findFirst({
		where: eq(tenants.slug, TENANT_SLUG),
	});
	if (!tenantRow) throw new Error("seed-e2e: nie udało się utworzyć tenanta testowego");
	const tenantId = tenantRow.id;

	// ── Konta logowalne (better-auth) ──────────────────────────────────────────
	async function ensureAccount(email: string, password: string, name: string): Promise<string> {
		// Idempotencja: jeśli user istnieje → zwróć jego id (nie dubluj signUp).
		const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (existing) return existing.id;
		const res = await auth.api.signUpEmail({
			body: { email, password, name },
		});
		const id = (res as { user?: { id?: string } })?.user?.id;
		if (!id) throw new Error(`seed-e2e: signUpEmail nie zwrócił user.id dla ${email}`);
		return id;
	}

	const mainUserId = await ensureAccount(MAIN_EMAIL, MAIN_PASS, "E2E Main");
	const b4UserId = await ensureAccount(B4_EMAIL, B4_PASS, "E2E B4");
	const resumeUserId = await ensureAccount(RESUME_EMAIL, RESUME_PASS, "E2E Resume");

	// ── Student MAIN (onboardingCompleted=TRUE) ────────────────────────────────
	async function ensureStudent(
		userId: string,
		opts: { onboardingCompleted: boolean; comps: string[]; onboardingStep?: number },
	): Promise<string> {
		// Sprzątanie idempotentne: skasuj poprzedniego studenta tego usera (cascade
		// usuwa competencies/passport/submissions), utwórz świeżego.
		const prev = await db.query.students.findFirst({ where: eq(students.userId, userId) });
		if (prev) await db.delete(students).where(eq(students.userId, userId));

		const [s] = await db
			.insert(students)
			.values({
				userId,
				tenantId,
				university: "E2E Test University",
				fieldOfStudy: "Informatyka",
				semester: 4,
				careerGoal: "Data Analyst",
				onboardingCompleted: opts.onboardingCompleted,
				onboardingStep: opts.onboardingStep ?? 0,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: students.id });
		const studentId = s.id;

		await db.insert(competencies).values(
			opts.comps.map((name) => ({
				studentId,
				tenantId,
				name,
				status: "acquired" as const,
				// B4 student: NIE oceniamy (selfAssessment=null) — test ma ocenić sam.
				selfAssessment: null,
			})),
		);
		return studentId;
	}

	const mainStudentId = await ensureStudent(mainUserId, {
		onboardingCompleted: true,
		comps: COMPETENCIES_MAIN,
	});
	await ensureStudent(b4UserId, {
		onboardingCompleted: false,
		comps: COMPETENCIES_B4,
	});

	// Student RESUME (fala B): onboardingCompleted=false, onboardingStep=3 (kompetencje
	// już są — POST /api/onboarding wstawia je na kroku 3). Wejście /onboarding wznawia
	// kreator od kroku 3 z profilem + kompetencjami. careerGoal≠"" (z ensureStudent).
	await ensureStudent(resumeUserId, {
		onboardingCompleted: false,
		comps: COMPETENCIES_RESUME,
		onboardingStep: 3,
	});

	// Paszport dla studenta MAIN (B1).
	await db
		.insert(passports)
		.values({
			studentId: mainStudentId,
			tenantId,
			marketCoveragePercent: 67,
			publicEnabled: false,
			shareToken: `e2e-${randomUUID()}`,
		})
		.onConflictDoNothing();

	// ── Projekt + zgłoszenie (marketplace + detal) ─────────────────────────────
	await db
		.insert(projects)
		.values({
			slug: PROJECT_SLUG,
			title: "E2E — Analiza danych GUS (projekt testowy)",
			description: "Projekt testowy do smoke E2E: lista + detal projektu.",
			level: "L1",
			estimatedHours: 3,
			sourceType: "open_data",
			sourceUrl: "https://example.org/e2e",
			rubricJson: [{ criterion: "Wczytanie danych", weight: 100, description: "Dane wczytane" }],
			status: "active",
		})
		.onConflictDoNothing();
	const projectRow = await db.query.projects.findFirst({
		where: eq(projects.slug, PROJECT_SLUG),
	});
	if (!projectRow) throw new Error("seed-e2e: nie udało się utworzyć projektu testowego");

	// Kompetencje projektu (idempotentnie: skasuj i wstaw).
	await db.delete(projectCompetencies).where(eq(projectCompetencies.projectId, projectRow.id));
	await db.insert(projectCompetencies).values([
		{ projectId: projectRow.id, competencyName: "Python", role: "required" },
		{ projectId: projectRow.id, competencyName: "Pandas", role: "required" },
	]);

	// ── Drugi projekt: zgłoszenie ZAAKCEPTOWANE (verified) — pod B5 refleksję ─────
	// Callout refleksji wyzwala się tylko przy status='verified'. Osobny projekt,
	// żeby pierwszy mógł zostać 'submitted' (T2 „callout NIE pojawia się") nietknięty.
	await db
		.insert(projects)
		.values({
			slug: PROJECT_SLUG_VERIFIED,
			title: "E2E — Refleksja: projekt zaakceptowany",
			description: "Projekt testowy B5: zgłoszenie zaakceptowane (verified) → callout refleksji.",
			level: "L1",
			estimatedHours: 2,
			sourceType: "open_data",
			sourceUrl: "https://example.org/e2e-verified",
			rubricJson: [{ criterion: "Wczytanie danych", weight: 100, description: "Dane wczytane" }],
			status: "active",
		})
		.onConflictDoNothing();
	const verifiedProjectRow = await db.query.projects.findFirst({
		where: eq(projects.slug, PROJECT_SLUG_VERIFIED),
	});
	if (!verifiedProjectRow)
		throw new Error("seed-e2e: nie udało się utworzyć projektu zaakceptowanego (B5)");

	await db
		.delete(projectCompetencies)
		.where(eq(projectCompetencies.projectId, verifiedProjectRow.id));
	await db.insert(projectCompetencies).values([
		{ projectId: verifiedProjectRow.id, competencyName: "Python", role: "required" },
		{ projectId: verifiedProjectRow.id, competencyName: "SQL", role: "required" },
	]);

	// Zgłoszenia studenta MAIN: jeden delete (FK ON DELETE CASCADE na project_reflections
	// → kasuje też ewentualne refleksje z poprzedniego przebiegu = czysty start B5),
	// potem dwa zgłoszenia: 'submitted' (projekt detalu) + 'verified' (projekt B5).
	await db.delete(projectSubmissions).where(eq(projectSubmissions.studentId, mainStudentId));
	await db.insert(projectSubmissions).values([
		{
			studentId: mainStudentId,
			tenantId,
			projectId: projectRow.id,
			repoUrl: "https://example.org/e2e/repo",
			submittedAt: now,
			status: "submitted",
		},
		{
			studentId: mainStudentId,
			tenantId,
			projectId: verifiedProjectRow.id,
			repoUrl: "https://example.org/e2e/repo-verified",
			submittedAt: now,
			status: "verified",
		},
	]);

	console.log("seed-e2e OK:");
	console.log(`  tenant: ${TENANT_SLUG} (${tenantId})`);
	console.log(
		`  main:   ${MAIN_EMAIL} (onboardingCompleted=true, ${COMPETENCIES_MAIN.length} komp., paszport, 1 zgłoszenie)`,
	);
	console.log(
		`  b4:     ${B4_EMAIL} (onboardingCompleted=false, ${COMPETENCIES_B4.length} komp. nieocenione)`,
	);
	console.log(
		`  resume: ${RESUME_EMAIL} (onboardingCompleted=false, onboardingStep=3, ${COMPETENCIES_RESUME.length} komp.)`,
	);
	console.log(`  projekt: ${PROJECT_SLUG} (zgłoszenie 'submitted' — detal/T2)`);
	console.log(`  projekt: ${PROJECT_SLUG_VERIFIED} (zgłoszenie 'verified' — B5 refleksja)`);
	console.log("  (connection string NIE drukowany — bezpieczeństwo)");
	process.exit(0);
}

main().catch((err) => {
	// Nie drukujemy connection stringa — tylko komunikat błędu.
	console.error("seed-e2e FAILED:", err instanceof Error ? err.message : String(err));
	process.exit(1);
});
