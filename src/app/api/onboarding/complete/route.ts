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
 *
 * Partia 4 (D5): próg „min 5 kompetencji" ZNIESIONY — student może domknąć onboarding
 * z 0 zaznaczonych kompetencji (0% pokrycia = prawidłowy, uczciwy stan startowy juniora;
 * cały rynek jako luki). Jedyna brama domknięcia = realny profil (uczelnia wypełniona).
 *
 * Plan: fala A krok 4. Spójne z fix POST /api/onboarding (krok 3 nie zapala completed).
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { resolveStudent } from "@/lib/career-helper/session";
import { students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

export async function POST() {
	const auth = await resolveStudent();
	if (!auth.ok) {
		return NextResponse.json(
			{ error: auth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth.status },
		);
	}
	const { userId, tenantId } = auth;

	try {
		const result = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// Profil realny? Prowizoryczny rekord z Kroku 0 ma university="".
			const student = await tx.query.students.findFirst({
				where: eq(students.userId, userId),
				columns: { university: true },
			});
			const profileReal = Boolean(student && student.university.trim() !== "");

			// D5: brak progu kompetencji — 0 zaznaczonych domyka onboarding. Jedyna brama
			// = realny profil. Student z 0% pokrycia przechodzi (cały rynek jako luki).
			if (!profileReal) {
				return { completed: false as const };
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
				{ error: "Onboarding niekompletny — uzupełnij profil (uczelnia, kierunek, semestr)." },
				{ status: 409 },
			);
		}
	} catch (err) {
		logError("onboarding.complete", err, { userId });
		return NextResponse.json({ error: "Complete failed" }, { status: 500 });
	}

	return NextResponse.json({ success: true, redirect: "/dashboard" });
}
