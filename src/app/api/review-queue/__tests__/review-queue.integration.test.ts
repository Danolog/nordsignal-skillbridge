// @vitest-environment node
//
// B8/1.3 — DoD NA REALNEJ BAZIE (ADR-011):
//  • operator jakości widzi kolejkę WSZYSTKICH tenantów (cross-tenant),
//  • wykładowca widzi WYŁĄCZNIE swój kampus (WHERE + RLS faculty_sees_tenant),
//  • kolejka = needs_human_review AND status='submitted' AND bez decyzji
//    (zgłoszenie z wierszem w submission_reviews znika z kolejki),
//  • twardy rozdział ról: sesja operatora w cookie faculty NIE daje kontekstu
//    wykładowcy i odwrotnie (fail-closed),
//  • logowanie operatora tworzy realną sesję role='quality_operator'.
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (kolumna role z 0027).

import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

// Cookie sterowany per test — trasa czyta next/headers.
let cookieJar: Record<string, string> = {};
vi.mock("next/headers", () => ({
	cookies: async () => ({
		get: (name: string) => (cookieJar[name] ? { value: cookieJar[name] } : undefined),
	}),
	headers: async () => new Headers(),
}));

// Fixture testowe, nie sekret (fałszywy alarm generic-api-key). gitleaks:allow
const OPERATOR_PASSWORD = "operator-integ-b8-sekret"; // gitleaks:allow
const MARKER = "b8-13-integ";

dBack(
	"B8/1.3 · kolejka recenzji — operator cross-tenant, faculty swój kampus (realna baza)",
	() => {
		// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
		let db: any;
		// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
		let schema: any;
		// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
		let queueGET: any;
		// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
		let loginPOST: any;
		// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
		let decisionPOST: any;
		// biome-ignore lint/suspicious/noExplicitAny: funkcje ładowane dynamicznie.
		let hashToken: any;

		let tenantA = "";
		let tenantB = "";
		const submissionByTenant: Record<string, string> = {};
		let reviewedSubmissionId = "";

		async function cleanup() {
			await db.execute(
				sql`DELETE FROM submission_reviews WHERE submission_id IN
			    (SELECT id FROM project_submissions WHERE repo_url LIKE ${`%${MARKER}%`})`,
			);
			await db.execute(sql`DELETE FROM project_submissions WHERE repo_url LIKE ${`%${MARKER}%`}`);
			await db.execute(sql`DELETE FROM faculty_sessions WHERE user_agent = ${MARKER}`);
		}

		/** Wstawia sesję recenzencką wprost do DB i zwraca surowy token (do cookie). */
		async function seedSession(role: "faculty" | "quality_operator", tenantId: string | null) {
			const token = randomBytes(32).toString("base64url");
			await db.insert(schema.facultySessions).values({
				tokenHash: hashToken(token),
				tenantId,
				role,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000),
				userAgent: MARKER,
			});
			return token;
		}

		beforeAll(async () => {
			vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
			vi.stubEnv("OPERATOR_PASSWORD", OPERATOR_PASSWORD);
			({ db } = await import("@/lib/db"));
			schema = await import("@/lib/db/schema");
			({ hashToken } = await import("@/lib/faculty-auth"));
			({ GET: queueGET } = await import("../route"));
			({ POST: loginPOST } = await import("../../operator/login/route"));
			({ POST: decisionPOST } = await import("../[id]/decision/route"));
			await cleanup();

			const tenantRows = await db.select({ id: schema.tenants.id }).from(schema.tenants).limit(2);
			expect(tenantRows.length).toBe(2); // seed ma 2 kampusy — bez nich test nic nie dowodzi
			[tenantA, tenantB] = [tenantRows[0].id, tenantRows[1].id];

			// Po jednym studencie z każdego kampusu + dowolny projekt z seeda.
			const [project] = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
			for (const tenantId of [tenantA, tenantB]) {
				const student = await db.query.students.findFirst({
					where: (s: { tenantId: unknown }, { eq: eqOp }: { eq: CallableFunction }) =>
						eqOp(s.tenantId, tenantId),
					columns: { id: true },
				});
				expect(student).toBeTruthy();
				const [sub] = await db
					.insert(schema.projectSubmissions)
					.values({
						studentId: student.id,
						tenantId,
						projectId: project.id,
						repoUrl: `https://example.test/${MARKER}/${tenantId}`,
						status: "submitted",
						needsHumanReview: true,
						submittedAt: new Date(),
					})
					.returning({ id: schema.projectSubmissions.id });
				submissionByTenant[tenantId] = sub.id;
			}
		}, 60_000);

		afterAll(async () => {
			if (db) await cleanup();
			vi.unstubAllEnvs();
			cookieJar = {};
		});

		it("bez sesji → 401; flaga off → 404", async () => {
			cookieJar = {};
			expect((await queueGET()).status).toBe(401);

			vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "");
			expect((await queueGET()).status).toBe(404);
			vi.stubEnv("FLAG_HUMAN_REVIEW_QUEUE", "1");
		});

		it("logowanie operatora tworzy sesję role='quality_operator' (realny wiersz w DB)", async () => {
			const res = await loginPOST(
				new Request("http://test.local/api/operator/login", {
					method: "POST",
					body: JSON.stringify({ password: OPERATOR_PASSWORD }),
					headers: { "Content-Type": "application/json", "user-agent": MARKER },
				}),
			);
			expect(res.status).toBe(200);
			const rows = await db.execute(
				sql`SELECT role, tenant_id FROM faculty_sessions WHERE role='quality_operator' AND user_agent LIKE '%vitest%' OR user_agent = ${MARKER}`,
			);
			expect(
				rows.rows.some(
					(r: { role: string; tenant_id: string | null }) =>
						r.role === "quality_operator" && r.tenant_id === null,
				),
			).toBe(true);
		});

		it("operator widzi zgłoszenia OBU tenantów; wpisy anonimowe (bez danych studenta)", async () => {
			cookieJar = { operator_session: await seedSession("quality_operator", null) };
			const res = await queueGET();
			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				reviewer: string;
				queue: Array<Record<string, unknown>>;
			};
			expect(body.reviewer).toBe("quality_operator");
			const ids = body.queue.map((q) => q.submissionId);
			expect(ids).toContain(submissionByTenant[tenantA]);
			expect(ids).toContain(submissionByTenant[tenantB]);
			// Anonimowość: żadnych pól studenta w odpowiedzi.
			for (const item of body.queue) {
				expect(Object.keys(item).sort()).toEqual(
					[
						"machineStatus",
						"projectId",
						"projectLevel",
						"projectTitle",
						"score",
						"submissionId",
						"submittedAt",
						"tenantSlug",
					].sort(),
				);
			}
		});

		it("[korekta 1.4] verified+needsHumanReview TEŻ w kolejce (filtr bez zawężenia po statusie)", async () => {
			// Twarde sprawdzenia padły przy wysokim wyniku semantycznym → maszyna
			// dała 'verified', ale flaga needs_human_review czeka na człowieka.
			const student = await db.query.students.findFirst({
				where: (s: { tenantId: unknown }, { eq: eqOp }: { eq: CallableFunction }) =>
					eqOp(s.tenantId, tenantA),
				columns: { id: true },
			});
			const [project] = await db
				.select({ id: schema.projects.id })
				.from(schema.projects)
				.offset(1)
				.limit(1);
			const [sub] = await db
				.insert(schema.projectSubmissions)
				.values({
					studentId: student.id,
					tenantId: tenantA,
					projectId: project.id,
					repoUrl: `https://example.test/${MARKER}/verified-risky`,
					status: "verified",
					needsHumanReview: true,
					submittedAt: new Date(),
				})
				.returning({ id: schema.projectSubmissions.id });

			cookieJar = { operator_session: await seedSession("quality_operator", null) };
			const body = (await (await queueGET()).json()) as {
				queue: Array<{ submissionId: string; machineStatus: string }>;
			};
			const entry = body.queue.find((q) => q.submissionId === sub.id);
			expect(entry).toBeTruthy();
			expect(entry?.machineStatus).toBe("verified");
		});

		it("faculty widzi WYŁĄCZNIE swój kampus (WHERE + RLS)", async () => {
			cookieJar = { faculty_session: await seedSession("faculty", tenantA) };
			const res = await queueGET();
			expect(res.status).toBe(200);
			const body = (await res.json()) as { queue: Array<{ submissionId: string }> };
			const ids = body.queue.map((q) => q.submissionId);
			expect(ids).toContain(submissionByTenant[tenantA]);
			expect(ids).not.toContain(submissionByTenant[tenantB]);
		});

		it("twardy rozdział ról: token operatora w cookie faculty → 401 (i odwrotnie)", async () => {
			const operatorToken = await seedSession("quality_operator", null);
			cookieJar = { faculty_session: operatorToken };
			expect((await queueGET()).status).toBe(401);

			const facultyToken = await seedSession("faculty", tenantA);
			cookieJar = { operator_session: facultyToken };
			// Token faculty w cookie operatora nie pasuje do sesji operatora, ale
			// checkReviewerAuth spada do checkFacultyAuth — a tam cookie faculty
			// nie istnieje → 401.
			expect((await queueGET()).status).toBe(401);
		});

		it("zgłoszenie z decyzją znika z kolejki (LEFT JOIN submission_reviews IS NULL)", async () => {
			reviewedSubmissionId = submissionByTenant[tenantB];
			await db.insert(schema.submissionReviews).values({
				submissionId: reviewedSubmissionId,
				tenantId: tenantB,
				decision: "approved",
				reviewerType: "quality_operator",
				reviewerId: "operator-beta",
			});

			cookieJar = { operator_session: await seedSession("quality_operator", null) };
			const body = (await (await queueGET()).json()) as { queue: Array<{ submissionId: string }> };
			const ids = body.queue.map((q) => q.submissionId);
			expect(ids).toContain(submissionByTenant[tenantA]);
			expect(ids).not.toContain(reviewedSubmissionId);
		});

		// ── B8/1.4 — decyzja człowieka (transakcja, idempotencja, izolacja) ──

		function decisionReq(
			submissionId: string,
			decision: string,
		): [Request, { params: Promise<{ id: string }> }] {
			return [
				new Request(`http://test.local/api/review-queue/${submissionId}/decision`, {
					method: "POST",
					body: JSON.stringify({ decision }),
					headers: { "Content-Type": "application/json" },
				}),
				{ params: Promise.resolve({ id: submissionId }) },
			];
		}

		it("1.4: faculty NIE zdecyduje o zgłoszeniu cudzego tenanta → 404, zero wiersza recenzji", async () => {
			cookieJar = { faculty_session: await seedSession("faculty", tenantB) };
			const res = await decisionPOST(...decisionReq(submissionByTenant[tenantA], "approved"));
			expect(res.status).toBe(404);

			const rows = await db.execute(
				sql`SELECT 1 FROM submission_reviews WHERE submission_id = ${submissionByTenant[tenantA]}`,
			);
			expect(rows.rows).toHaveLength(0);
		});

		it("1.4: approve (operator) → status 'verified' + wiersz recenzji z typem i sesją recenzenta", async () => {
			cookieJar = { operator_session: await seedSession("quality_operator", null) };
			const res = await decisionPOST(...decisionReq(submissionByTenant[tenantA], "approved"));
			expect(res.status).toBe(200);
			const body = (await res.json()) as Record<string, unknown>;
			expect(body).toMatchObject({ previousStatus: "submitted", newStatus: "verified" });

			const sub = await db.execute(
				sql`SELECT status FROM project_submissions WHERE id = ${submissionByTenant[tenantA]}`,
			);
			expect((sub.rows[0] as { status: string }).status).toBe("verified");
			const review = await db.execute(
				sql`SELECT decision, reviewer_type, reviewer_id FROM submission_reviews
				    WHERE submission_id = ${submissionByTenant[tenantA]}`,
			);
			const r = review.rows[0] as { decision: string; reviewer_type: string; reviewer_id: string };
			expect(r.decision).toBe("approved");
			expect(r.reviewer_type).toBe("quality_operator");
			expect(r.reviewer_id).toBeTruthy(); // id sesji — ślad audytowy (ADR-011)
		});

		it("1.4: druga decyzja o tym samym zgłoszeniu → 409, status NIETKNIĘTY (idempotencja)", async () => {
			cookieJar = { operator_session: await seedSession("quality_operator", null) };
			const res = await decisionPOST(...decisionReq(submissionByTenant[tenantA], "rejected"));
			expect(res.status).toBe(409);

			const sub = await db.execute(
				sql`SELECT status FROM project_submissions WHERE id = ${submissionByTenant[tenantA]}`,
			);
			expect((sub.rows[0] as { status: string }).status).toBe("verified"); // pierwsza decyzja stoi
		});

		it("1.4: reject (faculty, własny tenant) uchyla werdykt maszyny 'verified' → 'rejected' (ADR-008)", async () => {
			// Zgłoszenie verified+needsHumanReview z testu [korekta 1.4].
			const risky = await db.execute(
				sql`SELECT id FROM project_submissions WHERE repo_url LIKE ${`%${MARKER}/verified-risky%`}`,
			);
			const riskyId = (risky.rows[0] as { id: string }).id;

			cookieJar = { faculty_session: await seedSession("faculty", tenantA) };
			const res = await decisionPOST(...decisionReq(riskyId, "rejected"));
			expect(res.status).toBe(200);
			expect((await res.json()) as Record<string, unknown>).toMatchObject({
				previousStatus: "verified",
				newStatus: "rejected",
			});

			const sub = await db.execute(
				sql`SELECT status FROM project_submissions WHERE id = ${riskyId}`,
			);
			expect((sub.rows[0] as { status: string }).status).toBe("rejected");
			const review = await db.execute(
				sql`SELECT reviewer_type FROM submission_reviews WHERE submission_id = ${riskyId}`,
			);
			expect((review.rows[0] as { reviewer_type: string }).reviewer_type).toBe("faculty");
		});
	},
);
