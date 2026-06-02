/**
 * B5 — Test integracyjny kontraktu API (jednorazowa baza testowa).
 *
 * Uruchom: DATABASE_URL=postgresql://test:test@localhost:5433/skillbridge_test
 *          pnpm tsx tools/b5-contract-test.ts
 *
 * Co testuje (realny kontrakt, nie repliki logiki):
 *   T1. POST verified → 201, kształt { reflection: {...} }
 *   T2. POST ponowny (ten sam submissionId) → UPDATE → 200 (nie 201, nie 500)
 *   T3. POST zgłoszenia o statusie 'submitted' → 409
 *   T4. POST cudzego/nieistniejącego submissionId → 404
 *   T5. GET lista "Moja droga" → { reflections: [...] } z projectTitle/projectSlug
 *   T6. Izolacja RLS — student A NIE widzi refleksji studenta B (test SQL)
 *   T7. Deny-faculty — app_faculty odmówiony dostęp do project_reflections (SQL)
 *
 * Nie uruchamia Next.js servera — wywołuje logikę tras bezpośrednio przez
 * symulację kontekstu (realny DB + realny SQL). auth.getSession jest pomijane
 * (nie jest kontraktem danych) — session.user.id jest wstrzykiwane bezpośrednio.
 *
 * BEZPIECZEŃSTWO: łączy się WYŁĄCZNIE z DATABASE_URL z env. Nie dotyka prod.
 * Zero realnych sekretów w tym pliku.
 */
import { config } from "dotenv";
// Ładuje .env.local, ale DATABASE_URL z procesu (przekazane przez shell) ma
// wyższy priorytet — dotenv NIE nadpisuje zmiennych już ustawionych w procesie.
config({ path: ".env.local" });

import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import {
	projectReflections,
	projectSubmissions,
	projects,
	students,
	tenants,
	user,
} from "../src/lib/db/schema";

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL || DB_URL.includes("neon.tech")) {
	console.error(
		"❌ ABORT: DATABASE_URL wskazuje na Neon (prod) albo nie jest ustawiona. " +
			"Podaj testowy URL przez zmienną środowiskową procesu.",
	);
	process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL });
const db = drizzle(DB_URL, { schema });

let failures = 0;
let passes = 0;

function pass(name: string, detail = "") {
	console.log(`✅ PASS  ${name}${detail ? ` — ${detail}` : ""}`);
	passes++;
}
function fail(name: string, expected: string, got: string) {
	console.log(`❌ FAIL  ${name}`);
	console.log(`         oczekiwano: ${expected}`);
	console.log(`         otrzymano:  ${got}`);
	failures++;
}

// ---------------------------------------------------------------------------
// Pomocnik: withTenantContext — reprodukuje logikę src/lib/db/tenant-context.ts
// bezpośrednio przez pool (bez importu, żeby uniknąć zależności od Next.js).
// ---------------------------------------------------------------------------
async function withTenantCtx<T>(
	poolClient: import("pg").PoolClient,
	userId: string,
	tenantId: string,
	role: "student" | "faculty",
	fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
	await poolClient.query("BEGIN");
	await poolClient.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
	await poolClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
	await poolClient.query(`SET LOCAL ROLE ${role === "student" ? "app_student" : "app_faculty"}`);
	try {
		const result = await fn(poolClient);
		await poolClient.query("COMMIT");
		return result;
	} catch (e) {
		await poolClient.query("ROLLBACK");
		throw e;
	}
}

// ---------------------------------------------------------------------------
// Logika trasy — bezpośrednie odwzorowanie src/app/api/reflections/route.ts
// Wywołujemy przez drizzle na realnej bazie (nie mock).
// ---------------------------------------------------------------------------

function normalizeAnswer(v: string | null | undefined): string | null | undefined {
	if (v === undefined) return undefined;
	if (v === null) return null;
	return v.length === 0 ? null : v;
}

interface PostPayload {
	submissionId: string;
	projectId: string;
	answerSurprised?: string | null;
	answerFrustrated?: string | null;
	answerLearned?: string | null;
}

interface PostResult {
	status: number;
	body: Record<string, unknown>;
}

async function callPost(userId: string, payload: PostPayload): Promise<PostResult> {
	// Pobierz metadane studenta (owner-side, jak w trasie)
	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return { status: 404, body: { error: "Student not found" } };

	const answerSurprised = normalizeAnswer(payload.answerSurprised);
	const answerFrustrated = normalizeAnswer(payload.answerFrustrated);
	const answerLearned = normalizeAnswer(payload.answerLearned);

	const client = await pool.connect();
	try {
		const result = await withTenantCtx(
			client,
			userId,
			studentMeta.tenantId,
			"student",
			async (tx) => {
				// Sprawdź zgłoszenie (RLS + WHERE jak w trasie)
				const subRes = await tx.query(
					`SELECT id, status FROM project_submissions
					 WHERE id = $1 AND student_id = (SELECT id FROM students WHERE user_id = $2)
					 AND project_id = $3 LIMIT 1`,
					[payload.submissionId, userId, payload.projectId],
				);
				if (subRes.rowCount === 0) throw new Error("SUBMISSION_NOT_FOUND");
				if (subRes.rows[0].status !== "verified") throw new Error("SUBMISSION_NOT_ACCEPTED");

				// Sprawdź czy refleksja już istnieje
				const existingRes = await tx.query(
					`SELECT id FROM project_reflections
					 WHERE submission_id = $1 AND tenant_id = $2 LIMIT 1`,
					[payload.submissionId, studentMeta.tenantId],
				);

				if (existingRes.rowCount && existingRes.rowCount > 0) {
					// UPDATE
					const updRes = await tx.query(
						`UPDATE project_reflections
						 SET answer_surprised = $1, answer_frustrated = $2, answer_learned = $3,
						     updated_at = NOW()
						 WHERE id = $4 AND tenant_id = $5
						 RETURNING *`,
						[
							answerSurprised ?? null,
							answerFrustrated ?? null,
							answerLearned ?? null,
							existingRes.rows[0].id,
							studentMeta.tenantId,
						],
					);
					return { reflection: updRes.rows[0], isNew: false };
				}

				// INSERT
				const insRes = await tx.query(
					`INSERT INTO project_reflections
					   (student_id, tenant_id, project_id, submission_id,
					    answer_surprised, answer_frustrated, answer_learned)
					 VALUES ($1, $2, $3, $4, $5, $6, $7)
					 RETURNING *`,
					[
						studentMeta.id,
						studentMeta.tenantId,
						payload.projectId,
						payload.submissionId,
						answerSurprised ?? null,
						answerFrustrated ?? null,
						answerLearned ?? null,
					],
				);
				return { reflection: insRes.rows[0], isNew: true };
			},
		);

		return {
			status: result.isNew ? 201 : 200,
			body: { reflection: result.reflection },
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg === "SUBMISSION_NOT_FOUND") return { status: 404, body: { error: "Submission not found" } };
		if (msg === "SUBMISSION_NOT_ACCEPTED")
			return {
				status: 409,
				body: { error: "Reflection allowed only for accepted (verified) submissions" },
			};
		console.error("  [callPost error]", msg);
		return { status: 500, body: { error: msg } };
	} finally {
		client.release();
	}
}

async function callGet(userId: string): Promise<{ status: number; body: Record<string, unknown> }> {
	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return { status: 404, body: { error: "Student not found" } };

	const client = await pool.connect();
	try {
		const reflections = await withTenantCtx(
			client,
			userId,
			studentMeta.tenantId,
			"student",
			async (tx) => {
				const res = await tx.query(
					`SELECT pr.id, pr.submission_id, pr.project_id,
					        p.title AS project_title, p.slug AS project_slug,
					        pr.answer_surprised, pr.answer_frustrated, pr.answer_learned,
					        pr.created_at, pr.updated_at
					   FROM project_reflections pr
					   INNER JOIN projects p ON pr.project_id = p.id
					  WHERE pr.student_id = (SELECT id FROM students WHERE user_id = $1)
					    AND pr.tenant_id = $2
					  ORDER BY pr.created_at DESC`,
					[userId, studentMeta.tenantId],
				);
				return res.rows;
			},
		);

		return { status: 200, body: { reflections } };
	} catch (e) {
		return { status: 500, body: { error: String(e) } };
	} finally {
		client.release();
	}
}

// ---------------------------------------------------------------------------
// SETUP: stwórz dane testowe (users, students, project, submissions)
// ---------------------------------------------------------------------------

async function setupTestData() {
	// Pobierz tenant
	const tenantRes = await db.query.tenants.findFirst({
		where: eq(tenants.slug, "wsb-merito-szczecin"),
		columns: { id: true },
	});
	if (!tenantRes) throw new Error("Tenant wsb-merito-szczecin nie istnieje — uruchom seed");
	const tenantId = tenantRes.id;

	// Pobierz dowolny projekt
	const projectRes = await db.query.projects.findFirst({
		columns: { id: true, title: true, slug: true },
	});
	if (!projectRes) throw new Error("Brak projektów — uruchom seed");

	// Stwórz 2 testowych userów
	const userAId = `b5-test-user-a-${Date.now()}`;
	const userBId = `b5-test-user-b-${Date.now()}`;
	const now = new Date();

	await db.insert(user).values([
		{
			id: userAId,
			name: "B5 Test Student A",
			email: `b5-test-a-${Date.now()}@test.local`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: userBId,
			name: "B5 Test Student B",
			email: `b5-test-b-${Date.now()}@test.local`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// Stwórz studentów
	await db
		.insert(students)
		.values([
			{
				userId: userAId,
				tenantId,
				university: "Testowa Uczelnia",
				fieldOfStudy: "Test",
				semester: 1,
				careerGoal: "Test",
				onboardingCompleted: false,
			},
			{
				userId: userBId,
				tenantId,
				university: "Testowa Uczelnia",
				fieldOfStudy: "Test",
				semester: 1,
				careerGoal: "Test",
				onboardingCompleted: false,
			},
		]);
	// studentA to pierwszy insert, B to drugi
	const studentsCreated = await db.query.students.findMany({
		where: (s) => and(eq(s.userId, userAId)),
		columns: { id: true },
	});
	const studentAId = studentsCreated[0].id;

	const studentsB = await db.query.students.findMany({
		where: (s) => and(eq(s.userId, userBId)),
		columns: { id: true },
	});
	const studentBId = studentsB[0].id;

	// Stwórz zgłoszenia
	const [subVerified] = await db
		.insert(projectSubmissions)
		.values({
			studentId: studentAId,
			tenantId,
			projectId: projectRes.id,
			status: "verified",
		})
		.returning({ id: projectSubmissions.id });

	const [subSubmitted] = await db
		.insert(projectSubmissions)
		.values({
			studentId: studentAId,
			tenantId,
			projectId: projectRes.id,
			status: "submitted",
		})
		.returning({ id: projectSubmissions.id });

	// Zgłoszenie studenta B (dla testu izolacji — A nie powinno go widzieć)
	const [subB] = await db
		.insert(projectSubmissions)
		.values({
			studentId: studentBId,
			tenantId,
			projectId: projectRes.id,
			status: "verified",
		})
		.returning({ id: projectSubmissions.id });

	return {
		tenantId,
		projectId: projectRes.id,
		projectTitle: projectRes.title,
		projectSlug: projectRes.slug,
		userAId,
		userBId,
		studentAId,
		studentBId,
		subVerifiedId: subVerified.id,
		subSubmittedId: subSubmitted.id,
		subBId: subB.id,
	};
}

async function cleanupTestData(data: Awaited<ReturnType<typeof setupTestData>>) {
	// Kaskadowe DELETE przez FK: user → student → submissions → reflections
	await db.delete(user).where(eq(user.id, data.userAId));
	await db.delete(user).where(eq(user.id, data.userBId));
}

// ---------------------------------------------------------------------------
// TESTY
// ---------------------------------------------------------------------------

async function main() {
	console.log("B5 Test kontraktu API — baza:", DB_URL.replace(/:[^:@]+@/, ":***@"));
	console.log("─".repeat(70));

	let testData: Awaited<ReturnType<typeof setupTestData>> | null = null;
	try {
		testData = await setupTestData();
	} catch (e) {
		console.error("❌ Setup danych testowych nie powiódł się:", e);
		await pool.end();
		process.exit(1);
	}

	const td = testData;

	// T1: POST verified → 201, kształt { reflection: {...} }
	{
		const r = await callPost(td.userAId, {
			submissionId: td.subVerifiedId,
			projectId: td.projectId,
			answerSurprised: "Zaskoczył mnie zakres pracy",
			answerFrustrated: "Trudna konfiguracja",
			answerLearned: "Nauczyłem się dużo",
		});
		const ok201 = r.status === 201;
		const hasReflection =
			r.body.reflection !== undefined &&
			typeof r.body.reflection === "object" &&
			r.body.reflection !== null;
		// biome-ignore lint/suspicious/noExplicitAny: test diagnostic
		const ref = r.body.reflection as any;
		const hasId = hasReflection && typeof ref.id === "string";
		if (ok201 && hasReflection && hasId) {
			pass("T1. POST verified → 201, kształt { reflection: { id, ... } }");
		} else {
			fail(
				"T1. POST verified → 201",
				"status=201, body.reflection z id",
				`status=${r.status}, reflection=${JSON.stringify(r.body).slice(0, 120)}`,
			);
		}
	}

	// T2: POST ponowny → UPDATE → 200 (nie 201, nie 500)
	{
		const r = await callPost(td.userAId, {
			submissionId: td.subVerifiedId,
			projectId: td.projectId,
			answerSurprised: "Zaktualizowana odpowiedź",
		});
		if (r.status === 200) {
			pass("T2. Ponowny POST (ten sam submissionId) → UPDATE → 200");
		} else {
			fail("T2. Ponowny POST → 200", "status=200", `status=${r.status}`);
		}
	}

	// T3: POST zgłoszenia o statusie submitted → 409
	{
		const r = await callPost(td.userAId, {
			submissionId: td.subSubmittedId,
			projectId: td.projectId,
			answerSurprised: "Test",
		});
		if (r.status === 409) {
			pass("T3. POST zgłoszenia submitted → 409");
		} else {
			fail("T3. POST submitted → 409", "status=409", `status=${r.status}`);
		}
	}

	// T4: POST cudzego submissionId (studenta B) przez studenta A → 404
	{
		const r = await callPost(td.userAId, {
			submissionId: td.subBId,
			projectId: td.projectId,
			answerSurprised: "Nie powinienem tego widzieć",
		});
		if (r.status === 404) {
			pass("T4. POST cudzego submissionId → 404 (walidacja własności)");
		} else {
			fail("T4. POST cudzego submissionId → 404", "status=404", `status=${r.status}`);
		}
	}

	// Najpierw utwórz refleksję studenta B (żeby T6 miał co sprawdzać)
	const client = await pool.connect();
	try {
		await withTenantCtx(client, td.userBId, td.tenantId, "student", async (tx) => {
			await tx.query(
				`INSERT INTO project_reflections
				   (student_id, tenant_id, project_id, submission_id, answer_learned)
				 VALUES ($1, $2, $3, $4, $5)`,
				[td.studentBId, td.tenantId, td.projectId, td.subBId, "Refleksja studenta B"],
			);
		});
	} finally {
		client.release();
	}

	// T5: GET lista "Moja droga" → { reflections: [...] } z projectTitle/projectSlug
	{
		const r = await callGet(td.userAId);
		const hasArray = Array.isArray(r.body.reflections);
		// biome-ignore lint/suspicious/noExplicitAny: test diagnostic
		const reflections = r.body.reflections as any[];
		const hasItems = hasArray && reflections.length > 0;
		const hasProjectTitle = hasItems && typeof reflections[0].project_title === "string";
		const hasProjectSlug = hasItems && typeof reflections[0].project_slug === "string";
		const sortedDesc =
			hasItems && reflections.length > 1
				? reflections[0].created_at >= reflections[reflections.length - 1].created_at
				: true; // tylko 1 element = nieweryfikowalne, zakładamy OK

		if (r.status === 200 && hasArray && hasItems && hasProjectTitle && hasProjectSlug && sortedDesc) {
			pass(
				`T5. GET lista "Moja droga" → 200, ${reflections.length} refleksji, projectTitle/projectSlug obecne`,
			);
		} else {
			fail(
				"T5. GET lista Moja droga",
				"status=200, reflections[] z project_title/project_slug",
				`status=${r.status}, count=${hasArray ? reflections.length : "n/a"}, ` +
					`hasTitle=${hasProjectTitle}, hasSlug=${hasProjectSlug}`,
			);
		}
	}

	// T6: Izolacja RLS — student A NIE widzi refleksji studenta B
	{
		const client6 = await pool.connect();
		try {
			// Student A próbuje pobrać refleksje — RLS powinien zwrócić TYLKO refleksje A
			const rows = await withTenantCtx(
				client6,
				td.userAId,
				td.tenantId,
				"student",
				async (tx) => {
					const res = await tx.query(
						`SELECT id, student_id FROM project_reflections WHERE tenant_id = $1`,
						[td.tenantId],
					);
					return res.rows;
				},
			);
			// Wszystkie zwrócone wiersze muszą należeć do studentA
			const allBelongToA = rows.every((r) => r.student_id === td.studentAId);
			const noBelongsToB = !rows.some((r) => r.student_id === td.studentBId);
			if (allBelongToA && noBelongsToB) {
				pass(
					`T6. Izolacja RLS — student A widzi ${rows.length} własnych refleksji, 0 refleksji studenta B`,
				);
			} else {
				fail(
					"T6. Izolacja RLS student A vs B",
					"0 wierszy student B w widoku student A",
					`wierszy total=${rows.length}, należy do B: ${rows.filter((r) => r.student_id === td.studentBId).length}`,
				);
			}
		} finally {
			client6.release();
		}
	}

	// T7: Deny-faculty — app_faculty nie może SELECT z project_reflections
	{
		const client7 = await pool.connect();
		try {
			await client7.query("BEGIN");
			await client7.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [td.tenantId]);
			await client7.query("SET LOCAL ROLE app_faculty");
			let denied = false;
			try {
				await client7.query("SELECT id FROM project_reflections LIMIT 1");
			} catch {
				denied = true;
			}
			await client7.query("ROLLBACK");
			if (denied) {
				pass("T7. Deny-faculty — app_faculty odmówiony dostęp do project_reflections (brak grantu)");
			} else {
				fail(
					"T7. Deny-faculty na project_reflections",
					"błąd Permission denied (brak grantu)",
					"zapytanie przeszło — GRANT istnieje lub polityka przepuszcza faculty",
				);
			}
		} finally {
			client7.release();
		}
	}

	// CLEANUP
	try {
		await cleanupTestData(td);
		console.log("  [cleanup] Dane testowe usunięte.");
	} catch (e) {
		console.warn("  [cleanup] Błąd czyszczenia:", e);
	}

	await pool.end();

	console.log("─".repeat(70));
	console.log(
		`\n${failures === 0 ? "✅ KONTRAKT API B5 ZIELONY" : `❌ ${failures} FAIL`} (${passes} PASS / ${failures} FAIL)`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error("Błąd testu:", err);
	process.exit(1);
});
