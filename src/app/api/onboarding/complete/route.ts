/**
 * POST /api/onboarding/complete — JEDYNE miejsce zapalające onboardingCompleted=true.
 *
 * Wołane z ekranu kroku 5 (Wnioski) zamiast samego router.push("/dashboard").
 * Rozdziela "gdzie wznowić" (onboardingStep, high-water-mark) od "czy zakończony"
 * (onboardingCompleted). Dopóki ten endpoint nie potwierdzi domknięcia, powrót do
 * onboardingu wznawia kreator (bramka wejścia czyta onboardingCompleted=false).
 *
 * Guard (inaczej 409 Conflict — onboarding nie domyka się na niepełnym profilu):
 *   - profil realny: students.university != "" (prowizoryczny rekord z Kroku 0 ma "")
 *   - >= 5 kompetencji (próg spójny z OnboardingSchema.competencies.min(5))
 *
 * Plan: fala A krok 4. Spójne z fix POST /api/onboarding (krok 3 nie zapala completed).
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { resolveStudent } from "@/lib/career-helper/session";
import { competencies, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

const MIN_COMPETENCIES = 5;

export async function POST() {
	const auth = await resolveStudent();
	if (!auth.ok) {
		return NextResponse.json(
			{ error: auth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth.status },
		);
	}
	const { userId, studentId, tenantId } = auth;

	try {
		const result = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// Profil realny? Prowizoryczny rekord z Kroku 0 ma university="".
			const student = await tx.query.students.findFirst({
				where: eq(students.userId, userId),
				columns: { university: true },
			});
			const profileReal = Boolean(student && student.university.trim() !== "");

			// >= 5 kompetencji (próg z OnboardingSchema). RLS filtruje do własnych.
			const rows = await tx
				.select({ id: competencies.id })
				.from(competencies)
				.where(eq(competencies.studentId, studentId));
			const enoughCompetencies = rows.length >= MIN_COMPETENCIES;

			if (!profileReal || !enoughCompetencies) {
				return { completed: false as const, profileReal, count: rows.length };
			}

			// Domknięcie: jedyne zapalenie onboardingCompleted w całym systemie.
			await tx
				.update(students)
				.set({ onboardingCompleted: true, updatedAt: new Date() })
				.where(eq(students.userId, userId));
			return { completed: true as const };
		});

		if (!result.completed) {
			return NextResponse.json(
				{
					error: "Onboarding niekompletny — uzupełnij profil i minimum 5 kompetencji.",
					profileReal: result.profileReal,
					competencyCount: result.count,
				},
				{ status: 409 },
			);
		}
	} catch (err) {
		logError("onboarding.complete", err, { userId });
		return NextResponse.json({ error: "Complete failed" }, { status: 500 });
	}

	return NextResponse.json({ success: true, redirect: "/dashboard" });
}
