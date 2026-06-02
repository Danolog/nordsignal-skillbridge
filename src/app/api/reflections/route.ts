/**
 * B5 — Refleksja po projekcie.
 *
 * POST /api/reflections — tworzy lub aktualizuje refleksję studenta dla jednego
 *   zaakceptowanego (verified) zgłoszenia. Trzy pola opcjonalne (NULL = pominięte).
 *   submission_id/project_id z body; student_id/tenant_id z sesji (NIE z body).
 *   UNIQUE(submission_id) → ponowny zapis = UPDATE istniejącej (nie 500).
 *
 * GET /api/reflections — lista „Moja droga": refleksje studenta + tytuł projektu,
 *   posortowane chronologicznie (najnowsza pierwsza).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §4.x
 * Kontrakt schematu: docs/briefings/2026-05-31-ethan-schema-b3b4b5.md §B5.1
 * Prywatność (R1): tabela project_reflections bez grantu app_faculty —
 *   wykładowca fizycznie nie ma wstępu (PRD US-B5.1 KA5, spec §4.6).
 */
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectReflections, projectSubmissions, projects, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

// Walidacja wejścia (Zod). Trzy pola treści opcjonalne (R2, brzmienie stałe);
// NULL/brak = pominięte przez studenta. Identyfikatory wymagane.
// .nullable() dopuszcza jawny null (wyczyszczenie pola przy edycji refleksji).
const PostSchema = z.object({
	submissionId: z.string().uuid(),
	projectId: z.string().uuid(),
	answerSurprised: z.string().trim().max(5000).nullish(),
	answerFrustrated: z.string().trim().max(5000).nullish(),
	answerLearned: z.string().trim().max(5000).nullish(),
});

// Pusty string → null (pominięte). undefined → undefined (nie ruszaj przy UPDATE).
function normalizeAnswer(v: string | null | undefined): string | null | undefined {
	if (v === undefined) return undefined;
	if (v === null) return null;
	return v.length === 0 ? null : v;
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const userId = session.user.id;

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = PostSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { submissionId, projectId } = parsed.data;

	// Pre-fetch metadanych studenta (poza tenant-ctx, owner-side)
	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	const answerSurprised = normalizeAnswer(parsed.data.answerSurprised);
	const answerFrustrated = normalizeAnswer(parsed.data.answerFrustrated);
	const answerLearned = normalizeAnswer(parsed.data.answerLearned);

	try {
		const reflection = await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			async (tx) => {
				// 1. Zgłoszenie musi należeć do studenta, dotyczyć podanego projektu i
				//    być zaakceptowane. RLS (student_sees_own) + jawny WHERE = warstwa 1+2.
				//    Status „zaakceptowane" = 'verified' (submission_status nie ma 'accepted').
				const submission = await tx.query.projectSubmissions.findFirst({
					where: and(
						eq(projectSubmissions.id, submissionId),
						eq(projectSubmissions.studentId, studentMeta.id),
						eq(projectSubmissions.projectId, projectId),
					),
					columns: { id: true, status: true },
				});
				if (!submission) throw new Error("SUBMISSION_NOT_FOUND");
				if (submission.status !== "verified") throw new Error("SUBMISSION_NOT_ACCEPTED");

				// 2. Upsert po UNIQUE(submission_id) — jedna refleksja na zgłoszenie.
				// Poprawka B (Ethan, ADR-003): jawny tenant_id w WHERE jako warstwa 1
				// (WHERE primary); RLS student_sees_own = warstwa 2 (defense-in-depth).
				const existing = await tx.query.projectReflections.findFirst({
					where: and(
						eq(projectReflections.submissionId, submissionId),
						eq(projectReflections.tenantId, studentMeta.tenantId),
					),
					columns: { id: true },
				});

				if (existing) {
					const [updated] = await tx
						.update(projectReflections)
						.set({
							answerSurprised,
							answerFrustrated,
							answerLearned,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(projectReflections.id, existing.id),
								eq(projectReflections.tenantId, studentMeta.tenantId),
							),
						)
						.returning();
					// UPDATE istniejącej refleksji → 200 (zasób już istniał)
					return { reflection: updated, isNew: false };
				}
				const [inserted] = await tx
					.insert(projectReflections)
					.values({
						studentId: studentMeta.id,
						tenantId: studentMeta.tenantId,
						projectId,
						submissionId,
						answerSurprised: answerSurprised ?? null,
						answerFrustrated: answerFrustrated ?? null,
						answerLearned: answerLearned ?? null,
					})
					.returning();
				// INSERT nowej refleksji → 201 (zasób powstał)
				return { reflection: inserted, isNew: true };
			},
		);

		// Poprawka A (Ethan): INSERT → 201, UPDATE istniejącej → 200
		return NextResponse.json(
			{ reflection: reflection.reflection },
			{ status: reflection.isNew ? 201 : 200 },
		);
	} catch (err) {
		if (err instanceof Error && err.message === "SUBMISSION_NOT_FOUND") {
			return NextResponse.json({ error: "Submission not found" }, { status: 404 });
		}
		if (err instanceof Error && err.message === "SUBMISSION_NOT_ACCEPTED") {
			return NextResponse.json(
				{ error: "Reflection allowed only for accepted (verified) submissions" },
				{ status: 409 },
			);
		}
		logError("reflections.post", err, { userId });
		return NextResponse.json({ error: "Failed to save reflection" }, { status: 500 });
	}
}

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	try {
		// „Moja droga": refleksje studenta + tytuł/slug projektu. projects = katalog
		// K-PUB (bez tenant-RLS) — JOIN dozwolony pod app_student. Sortowanie
		// chronologiczne (najnowsza refleksja pierwsza) = oś czasu drogi studenta.
		const reflections = await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			(tx) =>
				tx
					.select({
						id: projectReflections.id,
						submissionId: projectReflections.submissionId,
						projectId: projectReflections.projectId,
						projectTitle: projects.title,
						projectSlug: projects.slug,
						answerSurprised: projectReflections.answerSurprised,
						answerFrustrated: projectReflections.answerFrustrated,
						answerLearned: projectReflections.answerLearned,
						createdAt: projectReflections.createdAt,
						updatedAt: projectReflections.updatedAt,
					})
					.from(projectReflections)
					.innerJoin(projects, eq(projectReflections.projectId, projects.id))
					// Poprawka B (Ethan, ADR-003): jawny tenant_id + student_id w WHERE
					.where(
						and(
							eq(projectReflections.studentId, studentMeta.id),
							eq(projectReflections.tenantId, studentMeta.tenantId),
						),
					)
					.orderBy(desc(projectReflections.createdAt)),
		);

		return NextResponse.json({ reflections });
	} catch (err) {
		logError("reflections.get", err, { userId });
		return NextResponse.json({ error: "Failed to load reflections" }, { status: 500 });
	}
}
