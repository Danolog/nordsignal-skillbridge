import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectCrisis } from "@/lib/ai/career-helper";
import { fetchContent } from "@/lib/ai/pipeline/step1-fetch-content";
import {
	MAX_TUTOR_TURNS,
	runTutorTurn,
	TUTOR_MESSAGE_MAX_LEN,
	TUTOR_REPO_MAX_CHARS,
	type TutorProjectContext,
	type TutorRubricCriterion,
	type TutorTurnMessage,
} from "@/lib/ai/project-tutor";
import { parseRepoUrl } from "@/lib/ai/sanitize";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projectSubmissions, projects, students, tutorTurns } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

// Tura = pobranie repo (best-effort) + Sonnet + sędzia Haiku (+ ew. regeneracja).
export const maxDuration = 60;

/**
 * C11/1.13 — Tutor sokratyczny w kontekście projektu. Za flagą `socraticTutor`
 * (off = trasa nie istnieje, 404 jak nieznana ścieżka). Rozmowa utrwalana w
 * `tutor_turns` (prywatna, RLS student_sees_own; wykładowca bez wstępu).
 *
 * Wzorzec Pomocnika: praca na bazie ZAMKNIĘTA w withTenantContext PRZED
 * wywołaniem LLM; LLM poza transakcją; zapis tury w OSOBNYM withTenantContext.
 */

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({ message: z.string().max(TUTOR_MESSAGE_MAX_LEN) });

type StudentMeta = { id: string; tenantId: string };

async function resolveStudent(): Promise<
	{ ok: true; userId: string; student: StudentMeta } | { ok: false; status: 401 | 404 }
> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return { ok: false, status: 401 };
	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, tenantId: true },
	});
	if (!student) return { ok: false, status: 404 };
	return { ok: true, userId: session.user.id, student };
}

/**
 * GET — rehydracja panelu (1.14): historia rozmowy + zużycie limitu.
 * Odczyt przez RLS (student widzi wyłącznie własne tury).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("socraticTutor")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const auth_ = await resolveStudent();
	if (!auth_.ok) {
		return NextResponse.json(
			{ error: auth_.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth_.status },
		);
	}
	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

	const { userId, student } = auth_;
	try {
		const turns = await withTenantContext(
			{ userId, tenantId: student.tenantId, role: "student" },
			(tx) =>
				tx
					.select({
						role: tutorTurns.role,
						content: tutorTurns.content,
						turnIndex: tutorTurns.turnIndex,
						createdAt: tutorTurns.createdAt,
					})
					.from(tutorTurns)
					.where(
						and(eq(tutorTurns.studentId, student.id), eq(tutorTurns.projectId, params.data.id)),
					)
					.orderBy(asc(tutorTurns.turnIndex), asc(tutorTurns.createdAt)),
		);
		const turnsUsed = turns.filter((t) => t.role === "ai").length;
		return NextResponse.json({ turns, turnsUsed, maxTurns: MAX_TUTOR_TURNS });
	} catch (err) {
		logError("project-tutor.get", err, { projectId: params.data.id, studentId: student.id });
		return NextResponse.json({ error: "Nie udało się wczytać rozmowy." }, { status: 500 });
	}
}

/** POST — tura rozmowy z tutorem (blokująco; sędzia PRZED zwrotem odpowiedzi). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("socraticTutor")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const auth_ = await resolveStudent();
	if (!auth_.ok) {
		return NextResponse.json(
			{ error: auth_.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth_.status },
		);
	}
	const { userId, student } = auth_;

	// Dwa wymiary limitu: burst (aiHeavy 5/min) + wolumen dzienny (tutorDaily).
	const rlBurst = await applyRateLimit(rateLimiters.aiHeavy, `user:${userId}`);
	if (!rlBurst.success) return rateLimitResponse(rlBurst.reset);
	const rlDaily = await applyRateLimit(rateLimiters.tutorDaily, `user:${userId}`);
	if (!rlDaily.success) return rateLimitResponse(rlDaily.reset);

	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
	const projectId = params.data.id;

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = BodySchema.safeParse(raw);
	if (!parsed.success || parsed.data.message.trim().length === 0) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}
	const userMessage = parsed.data.message.trim();

	// Filtr kryzysowy regułowy PRZED modelem (reużycie z Pomocnika) — trafienie =
	// model NIE wołany, nic nie utrwalamy; front pokazuje statyczny komunikat.
	if (detectCrisis(userMessage)) {
		return NextResponse.json({ crisis: true }, { status: 200 });
	}

	// Katalog projektów jest globalny (bez tenantId) — odczyt owner-side jak w brief.
	const project = await db.query.projects.findFirst({
		where: eq(projects.id, projectId),
		columns: { id: true, title: true, description: true, level: true, rubricJson: true },
	});
	if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

	// (1) Praca na bazie ZAMKNIĘTA w withTenantContext — PRZED LLM: historia
	// rozmowy (limit tur w KODZIE) + zgłoszenie studenta (brief/recenzja/repo).
	type Prep = {
		history: TutorTurnMessage[];
		nextTurnIndex: number;
		turnsUsed: number;
		submission: {
			repoUrl: string | null;
			status: string;
			score: number | null;
			needsHumanReview: boolean;
			aiReviewJson: unknown;
		} | null;
	};
	let prep: Prep | { limit: true };
	try {
		prep = await withTenantContext(
			{ userId, tenantId: student.tenantId, role: "student" },
			async (tx) => {
				const history = await tx
					.select({
						role: tutorTurns.role,
						content: tutorTurns.content,
						turnIndex: tutorTurns.turnIndex,
					})
					.from(tutorTurns)
					.where(and(eq(tutorTurns.studentId, student.id), eq(tutorTurns.projectId, projectId)))
					.orderBy(asc(tutorTurns.turnIndex), asc(tutorTurns.createdAt));

				const turnsUsed = history.filter((h) => h.role === "ai").length;
				if (turnsUsed >= MAX_TUTOR_TURNS) return { limit: true as const };

				const submission = await tx.query.projectSubmissions.findFirst({
					where: and(
						eq(projectSubmissions.studentId, student.id),
						eq(projectSubmissions.projectId, projectId),
					),
					columns: {
						repoUrl: true,
						status: true,
						score: true,
						needsHumanReview: true,
						aiReviewJson: true,
					},
				});

				return {
					history: history.map((h) => ({ role: h.role, content: h.content })),
					nextTurnIndex: history.reduce((max, h) => Math.max(max, h.turnIndex), 0) + 1,
					turnsUsed,
					submission: submission ?? null,
				};
			},
		);
	} catch (err) {
		logError("project-tutor.prep", err, { projectId, studentId: student.id });
		return NextResponse.json({ error: "Nie udało się rozpocząć tury." }, { status: 500 });
	}
	if ("limit" in prep) {
		return NextResponse.json(
			{ error: "Turn limit reached", maxTurns: MAX_TUTOR_TURNS },
			{ status: 409 },
		);
	}

	// (2) Kontekst: brief z cache + zwięzły stan recenzji + wycinek repo
	// (krok 1 potoku, best-effort — awaria pobierania NIE blokuje tury).
	const reviewJson = (prep.submission?.aiReviewJson ?? null) as Record<string, unknown> | null;
	const brief = (reviewJson?.brief ?? null) as TutorProjectContext["brief"];
	const reviewSummary = prep.submission
		? `status ${prep.submission.status}${
				prep.submission.score !== null ? `, wynik ${prep.submission.score}/100` : ""
			}${prep.submission.needsHumanReview ? ", czeka na recenzję człowieka" : ""}`
		: null;

	let repoExcerpt: string | null = null;
	const parsedRepo = parseRepoUrl(prep.submission?.repoUrl);
	if (parsedRepo) {
		try {
			const content = await fetchContent(parsedRepo.url);
			repoExcerpt = content.data.artifact.slice(0, TUTOR_REPO_MAX_CHARS) || null;
		} catch (err) {
			logError("project-tutor.repo-fetch", err, { projectId, studentId: student.id });
		}
	}

	const context: TutorProjectContext = {
		title: project.title,
		description: project.description,
		level: project.level,
		rubric: (project.rubricJson ?? []) as TutorRubricCriterion[],
		brief,
		reviewSummary,
		repoExcerpt,
		// 1E (przyszłość): tu wejdzie teoria modułu curriculum, gdy będzie aktywne.
	};

	// (3) LLM POZA transakcją — generacja + guardrail + sędzia (blokująco).
	let result: Awaited<ReturnType<typeof runTutorTurn>>;
	try {
		result = await runTutorTurn({
			context,
			history: prep.history,
			userMessage,
			attribution: { studentId: student.id, tenantId: student.tenantId },
		});
	} catch (err) {
		logError("project-tutor.turn", err, { projectId, studentId: student.id });
		return NextResponse.json(
			{ error: "Tutor chwilowo niedostępny. Spróbuj ponownie za chwilę." },
			{ status: 502 },
		);
	}

	// (4) Zapis pary user+ai w OSOBNYM withTenantContext (fallback też — rozmowa
	// zostaje spójna przy rehydracji GET-em).
	try {
		await withTenantContext({ userId, tenantId: student.tenantId, role: "student" }, (tx) =>
			tx.insert(tutorTurns).values([
				{
					studentId: student.id,
					tenantId: student.tenantId,
					projectId,
					role: "user" as const,
					content: userMessage,
					turnIndex: prep.nextTurnIndex,
				},
				{
					studentId: student.id,
					tenantId: student.tenantId,
					projectId,
					role: "ai" as const,
					content: result.reply,
					turnIndex: prep.nextTurnIndex,
				},
			]),
		);
	} catch (err) {
		// Odpowiedź już wygenerowana — oddajemy ją mimo nieudanego zapisu (log bez PII).
		logError("project-tutor.persist", err, { projectId, studentId: student.id });
	}

	return NextResponse.json({
		reply: result.reply,
		guarded: result.guarded,
		turnsUsed: prep.turnsUsed + 1,
		maxTurns: MAX_TUTOR_TURNS,
	});
}
