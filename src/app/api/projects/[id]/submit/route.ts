import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runReviewPipeline } from "@/lib/ai/pipeline";
import type { DeliverableType } from "@/lib/ai/pipeline/types";
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
 * runReviewPipeline (AI + cheat-detect) POZA tx. Audit log = owner db
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

	// 0.15/B3: uuid param — zły format dawał 22P02 (lookup projektu poza try/catch) → 500.
	const parsedParams = z.object({ id: z.string().uuid() }).safeParse(await params);
	if (!parsedParams.success) {
		return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
	}
	const projectId = parsedParams.data.id;
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

	// AI POZA tx — nie trzymamy połączenia przez potok oceny (sieć GitHub + LLM).
	// Potok (Faza 1): pobranie treści → twarde sprawdzenia → ocena semantyczna z
	// cytatami + feedback studenta → cheat-risk z faktów → routing. Suma i status
	// liczone DETERMINISTYCZNIE w kodzie (krok 5), nie przez model.
	let pipeline: Awaited<ReturnType<typeof runReviewPipeline>>;
	try {
		pipeline = await runReviewPipeline({
			repoUrl: repoUrlStr,
			notebookUrl: notebookUrlStr,
			rubricJson: project.rubricJson,
			deliverableType: project.deliverableType as DeliverableType,
		});
	} catch {
		return NextResponse.json(
			{ error: "Nie udało się ocenić zgłoszenia. Spróbuj ponownie." },
			{ status: 502 },
		);
	}

	const { status, needsHumanReview, aiReviewJson } = pipeline;
	const review = aiReviewJson.review;

	const submissionData = {
		repoUrl: repoUrlStr,
		notebookUrl: notebookUrlStr,
		additionalUrls: safeAdditionalUrls,
		submittedAt: new Date(),
		score: pipeline.score,
		status,
		needsHumanReview,
	};

	// Upsert atomowy przez UNIQUE(student_id, project_id) (0.2b, drizzle/0021) —
	// zamyka wyścig TOCTOU poprzedniego find-then-write (dwa równoległe submity
	// mogły oba przejść "nie istnieje" i wstawić osobny wiersz). RLS: student_sees_own.
	const submission = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		async (tx) => {
			const [result] = await tx
				.insert(projectSubmissions)
				.values({
					studentId: studentMeta.id,
					tenantId: studentMeta.tenantId,
					projectId,
					...submissionData,
					aiReviewJson,
				})
				.onConflictDoUpdate({
					target: [projectSubmissions.studentId, projectSubmissions.projectId],
					set: {
						...submissionData,
						// aiReviewJson z potoku: review (wstecznie zgodny) + rodzeństwo
						// (studentFeedback/recommendation/cheatSignals/hardChecks/contentMeta).
						// Merge jsonb (||) — odpowiednik {...existing, ...new} w JS, atomowo w bazie
						// (bez osobnego SELECT-a, którego wymagał poprzedni find-then-write).
						// coalesce(...,'{}') — audyt Fable 5: kolumna jest nullable (np. seed-e2e
						// wstawia zgłoszenia bez aiReviewJson); NULL || cokolwiek daje NULL w
						// Postgresie, więc bez coalesce świeża recenzja cicho by zniknęła.
						aiReviewJson: sql`coalesce(${projectSubmissions.aiReviewJson}, '{}'::jsonb) || ${JSON.stringify(aiReviewJson)}::jsonb`,
						updatedAt: new Date(),
					},
				})
				.returning();
			return result;
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
				needsHumanReview,
				projectId,
			},
		});
	}

	return NextResponse.json({ submission, review });
}
