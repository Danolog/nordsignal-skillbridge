import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	type OnboardingInitialData,
	OnboardingWizard,
} from "@/components/onboarding/onboarding-wizard";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, students } from "@/lib/db/schema";

export default async function OnboardingPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	// Bramka wejścia: ukończony onboarding → dashboard (bez zmian względem stanu sprzed fali B).
	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (student?.onboardingCompleted) redirect("/dashboard");

	// Hydratacja: brak rekordu studenta (zupełnie nowy user) → kreator od Kroku 0,
	// pusty stan. Inaczej budujemy initialStep z high-water-marka + initialData z
	// realnych kolumn (wzorzec profil/page.tsx). Kompetencje pobieramy tylko gdy
	// onboardingStep>=3 (wcześniej ich nie ma — POST /api/onboarding wstawia je na kroku 3).
	let initialStep = 0;
	let initialData: OnboardingInitialData | undefined;

	if (student) {
		// Krok 0 (sesja czatu Pomocnika) NIE jest odtwarzany — do wznowienia od kroku 1
		// wystarczy ustalony careerGoal (≠""). Bez celu zostajemy na Kroku 0.
		const hasCareerGoal = student.careerGoal.trim() !== "";
		initialStep = hasCareerGoal ? student.onboardingStep : 0;

		// Placeholder profilu z Kroku 0 ma university="" → puste pola w formularzu.
		const profileReal = student.university.trim() !== "";

		const competencyNames =
			student.onboardingStep >= 3
				? (
						await db.query.competencies.findMany({
							where: eq(competencies.studentId, student.id),
							orderBy: (c, { asc }) => [asc(c.createdAt)],
						})
					).map((c) => c.name)
				: [];

		initialData = {
			profile: {
				university: profileReal ? student.university : "",
				fieldOfStudy: profileReal ? student.fieldOfStudy : "",
				semester: profileReal ? String(student.semester) : "",
				careerGoal: student.careerGoal,
			},
			syllabusText: student.syllabusText ?? "",
			competencies: competencyNames,
		};
	}

	return (
		<OnboardingWizard user={session.user} initialStep={initialStep} initialData={initialData} />
	);
}
