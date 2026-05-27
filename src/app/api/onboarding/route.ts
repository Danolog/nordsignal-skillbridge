import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateGaps } from "@/lib/ai/generate-gaps";
import { generateSkillMap } from "@/lib/ai/generate-skill-map";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, passports, students } from "@/lib/db/schema";
import { resolveTenantId } from "@/lib/db/tenant-mapping";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

const OnboardingSchema = z.object({
	university: z.string().min(1).max(200),
	fieldOfStudy: z.string().min(1).max(200),
	semester: z.number().int().min(1).max(15),
	careerGoal: z.string().min(1).max(200),
	syllabusText: z.string().max(50_000).optional().default(""),
	competencies: z.array(z.string().min(1).max(200)).min(1).max(100),
});

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = OnboardingSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { university, fieldOfStudy, semester, careerGoal, syllabusText } = parsed.data;
	const competencyNames = parsed.data.competencies;

	const userId = session.user.id;

	// K3: resolve tenant from (free-form) university — mirror of 0006 backfill.
	const tenantId = await resolveTenantId(university);

	// Upsert student record
	const existing = await db.query.students.findFirst({
		where: eq(students.userId, userId),
	});

	let studentId: string;

	if (existing) {
		await db
			.update(students)
			.set({
				tenantId,
				university,
				fieldOfStudy,
				semester,
				careerGoal,
				syllabusText,
				onboardingCompleted: true,
				updatedAt: new Date(),
			})
			.where(eq(students.userId, userId));
		studentId = existing.id;

		// Delete old competencies for idempotency
		await db.delete(competencies).where(eq(competencies.studentId, studentId));
	} else {
		const [newStudent] = await db
			.insert(students)
			.values({
				userId,
				tenantId,
				university,
				fieldOfStudy,
				semester,
				careerGoal,
				syllabusText,
				onboardingCompleted: true,
			})
			.returning({ id: students.id });
		studentId = newStudent.id;
	}

	// Insert competencies
	await db.insert(competencies).values(
		competencyNames.map((name) => ({
			studentId,
			tenantId,
			name,
			status: "acquired" as const,
		})),
	);

	// Create passport if not exists; jeśli istnieje — odśwież tenantId
	// (re-onboarding ze zmienioną uczelnią mógł zmienić tenant — bez tego
	// wiersz potomny zostaje ze starym tenant_id = niespójność z students).
	const existingPassport = await db.query.passports.findFirst({
		where: eq(passports.studentId, studentId),
	});
	if (!existingPassport) {
		await db.insert(passports).values({ studentId, tenantId });
	} else if (existingPassport.tenantId !== tenantId) {
		await db.update(passports).set({ tenantId }).where(eq(passports.studentId, studentId));
	}

	// Synchronous AI generation — Vercel serverless terminates the function after the response,
	// so fire-and-forget would lose the work. Awaiting also lets us tell the client whether the
	// skill map is ready or whether they need to retry from /skill-map.
	try {
		await Promise.all([
			generateGaps(studentId, tenantId, competencyNames, careerGoal),
			generateSkillMap(studentId, tenantId, competencyNames, careerGoal),
		]);
	} catch (err) {
		logError("onboarding", err, { studentId });
		return NextResponse.json({ success: true, studentId, aiGenerationFailed: true });
	}

	return NextResponse.json({ success: true, studentId });
}
