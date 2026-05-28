import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { competencies, gaps, passports, students, user } from "@/lib/db/schema";

/**
 * §8 #1 Phase 2 / issue #19g: CELOWY WYJĄTEK od refactoringu na
 * withTenantContext. Trasa jest **publiczna** (anonimowa) — nie ma
 * `session.user.id`, więc kontekst RLS `app.current_user_id` byłby pusty,
 * a polityki `student_sees_own` / `faculty_sees_tenant` zwróciłyby 0 wierszy.
 * Analogicznie do `faculty_sessions` lookup w `faculty-auth.ts` — server-only
 * dostęp gated zewnętrznym credentialem (tu: share_token + public_enabled),
 * z minimalizacją kolumn w odpowiedzi (whitelist poniżej).
 *
 * Po Phase 2 (ops-step #25 + #19h FORCE RLS): runtime łączy się jako
 * `app_runtime` (NOBYPASSRLS). Ta ścieżka będzie wymagała: (a) trasa zostaje
 * na owner `db` z minimalizacją, ALBO (b) polityka `passport_public_read ON
 * passports FOR SELECT TO app_runtime USING (public_enabled = true AND
 * share_token IS NOT NULL)`. Decyzja w sub-issue #19h razem z FORCE.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// B1: dostęp publiczny tylko po niezgadywalnym share_token i tylko gdy student
	// włączył udostępnianie (public_enabled). Surowy PK nie jest już kluczem.
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});

	if (!passport) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});
	if (!student) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const studentUser = await db.query.user.findFirst({
		where: eq(user.id, student.userId),
	});

	const [studentCompetencies, studentGaps] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
	]);

	return NextResponse.json({
		id: passport.id,
		student: {
			name: studentUser?.name ?? "Student",
			university: student.university,
			fieldOfStudy: student.fieldOfStudy,
			semester: student.semester,
			careerGoal: student.careerGoal,
		},
		marketCoveragePercent: passport.marketCoveragePercent,
		competencies: studentCompetencies.map((c) => ({
			name: c.name,
			status: c.status,
			marketPercentage: c.marketPercentage,
		})),
		gapCount: studentGaps.length,
		generatedAt: passport.updatedAt.toISOString(),
	});
}
