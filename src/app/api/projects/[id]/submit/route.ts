import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { reviewSubmission } from "@/lib/ai/review-submission";
import { parseNotebookUrl, parseRepoUrl } from "@/lib/ai/sanitize";
import { auditContextFromRequest, recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, projects, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * §8 #1 Phase 2 / issue #19f (refactor sub-issue): odczyt/zapis
 * projectSubmissions przez withTenantContext({role: "student"}).
 * reviewSubmission (AI + cheat-detect) POZA tx. Audit log = owner db
 * (audit_log nie ma RLS user-aware policy, server-only INSERT).
 *
 * Pre-fetch studentMeta + project (project = katalog publiczny, K-PUB) owner-side.
 * Cache check + upsert submission wewnątrz withTenantContext.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const { id: projectId } = await params;
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const { repoUrl, notebookUrl, additionalUrls } = (body ?? {}) as {
		repoUrl?: unknown;
		notebookUrl?: unknown;
		additionalUrls?: unknown;
	};
	const repoUrlStr = typeof repoUrl === "string" ? repoUrl : null;
	const notebookUrlStr = typeof notebookUrl === "string" ? notebookUrl : null;

	if (!repoUrlStr && !notebookUrlStr) {
		return NextResponse.json({ error: "repoUrl or notebookUrl required" }, { status: 400 });
	}

	if (repoUrlStr && !parseRepoUrl(repoUrlStr)) {
		return NextResponse.json(
			{ error: "repoUrl musi być pełnym https URL z github.com" },
			{ status: 400 },
		);
	}
	if (notebookUrlStr && !parseNotebookUrl(notebookUrlStr)) {
		return NextResponse.json(
			{
				error:
					"notebookUrl musi być pełnym https URL z dozwolonego hosta (Colab, Kaggle, GitHub, nbviewer)",
			},
			{ status: 400 },
		);
	}

	const safeAdditionalUrls = Array.isArray(additionalUrls)
		? additionalUrls
				.filter((u): u is string => typeof u === "string")
				.slice(0, 10)
				.filter((u) => parseNotebookUrl(u) !== null || parseRepoUrl(u) !== null)
		: [];

	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	// projects = K-PUB (katalog, bez tenant-RLS) — owner-side query OK.
	const project = await db.query.projects.findFirst({
		where: eq(projects.id, projectId),
	});
	if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

	// AI POZA tx — nie trzymamy połączenia przez LLM + cheat detection.
	let review: Awaited<ReturnType<typeof reviewSubmission>>;
	try {
		review = await reviewSubmission(
			repoUrlStr,
			notebookUrlStr,
			project.rubricJson,
			project.title,
			project.description,
		);
	} catch {
		return NextResponse.json(
			{ error: "Nie udało się ocenić zgłoszenia. Spróbuj ponownie." },
			{ status: 502 },
		);
	}

	// Fail-closed: verified wymaga wysokiego score, niskiego cheat risk i ≥3 kryteriów.
	let status: "verified" | "submitted" | "rejected" = "submitted";
	if (review.score >= 70 && review.cheatRiskScore < 0.5 && review.criteriaScores.length >= 3) {
		status = "verified";
	} else if (review.score < 30) {
		status = "rejected";
	}

	const submissionData = {
		repoUrl: repoUrlStr,
		notebookUrl: notebookUrlStr,
		additionalUrls: safeAdditionalUrls,
		submittedAt: new Date(),
		score: review.score,
		status,
	};

	// Cache check + upsert przez RLS — student_sees_own ON project_submissions.
	const submission = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		async (tx) => {
			const existing = await tx.query.projectSubmissions.findFirst({
				where: and(
					eq(projectSubmissions.studentId, studentMeta.id),
					eq(projectSubmissions.projectId, projectId),
				),
			});

			if (existing) {
				const [updated] = await tx
					.update(projectSubmissions)
					.set({
						...submissionData,
						aiReviewJson: { ...((existing.aiReviewJson as object) ?? {}), review },
						updatedAt: new Date(),
					})
					.where(eq(projectSubmissions.id, existing.id))
					.returning();
				return updated;
			}
			const [inserted] = await tx
				.insert(projectSubmissions)
				.values({
					studentId: studentMeta.id,
					tenantId: studentMeta.tenantId,
					projectId,
					...submissionData,
					aiReviewJson: { review },
				})
				.returning();
			return inserted;
		},
	);

	// Audit log idzie przez owner db — audit_log ma deny-all RLS dla
	// klienta, INSERT tylko server (jak dziś). Append-only chroni trigger.
	if (status === "verified") {
		await recordAudit({
			actorType: "system",
			actorId: studentMeta.id,
			action: "submission.verified",
			targetType: "submission",
			targetId: submission.id,
			...auditContextFromRequest(req),
			metadata: {
				score: review.score,
				cheatRiskScore: review.cheatRiskScore,
				projectId,
			},
		});
	}

	return NextResponse.json({ submission, review });
}
