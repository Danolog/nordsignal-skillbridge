import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWhyImportant } from "@/lib/ai/generate-why";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gaps, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

// 0.15/B3: gaps.id to uuid — zły format dawał 22P02 z Postgresa → gołe 500 zamiast 400.
const ParamsSchema = z.object({ id: z.string().uuid() });

/**
 * §8 #1 Phase 2 / issue #19d (refactor sub-issue): odczyt + zapis gap przez
 * withTenantContext({role: "student"}). generateWhyImportant (AI call)
 * POZA tx — nie trzymamy połączenia przez LLM.
 *
 * Pre-fetch studentMeta owner-side; fetch gap + update gap wewnątrz
 * withTenantContext. RLS student_sees_own ON gaps egzekwuje izolację —
 * próba pobrania cudzego gapa zwraca 0 wierszy, próba update wpada w
 * WITH CHECK = false.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const parsedParams = ParamsSchema.safeParse(await params);
	if (!parsedParams.success) {
		return NextResponse.json({ error: "Invalid gap id" }, { status: 400 });
	}
	const gapId = parsedParams.data.id;
	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true, careerGoal: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	// Fetch gap przez RLS (student_sees_own). Cudzy gap = 0 wierszy → 404.
	const gap = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		(tx) => tx.query.gaps.findFirst({ where: eq(gaps.id, gapId) }),
	);
	if (!gap || gap.studentId !== studentMeta.id) {
		return NextResponse.json({ error: "Gap not found" }, { status: 404 });
	}

	// Return cached value if already generated
	if (gap.whyImportant) {
		return NextResponse.json({ whyImportant: gap.whyImportant });
	}

	// 0.15/B4: AI + persist w try/catch — była to jedyna trasa AI bez otoczki błędu
	// (timeout 45 s / 429 Anthropic → gołe 500 bez logError). Wzorzec z brief/route
	// (lekcja #4: nigdy puste 500 bez śladu).
	try {
		// AI call POZA tx
		const whyImportant = await generateWhyImportant(
			gap.competencyName,
			studentMeta.careerGoal,
			gap.marketPercentage,
		);

		// Persistence przez RLS (student_sees_own WITH CHECK na UPDATE).
		// Defense-in-depth: dodatkowy WHERE studentId (warstwa 1 ADR-003).
		await withTenantContext(
			{ userId, tenantId: studentMeta.tenantId, role: "student" },
			async (tx) => {
				await tx
					.update(gaps)
					.set({ whyImportant })
					.where(and(eq(gaps.id, gapId), eq(gaps.studentId, studentMeta.id)));
			},
		);

		return NextResponse.json({ whyImportant });
	} catch (err) {
		logError("gaps.why", err, { gapId, studentId: studentMeta.id });
		return NextResponse.json(
			{ error: "Nie udało się wygenerować wyjaśnienia. Spróbuj ponownie." },
			{ status: 502 },
		);
	}
}
