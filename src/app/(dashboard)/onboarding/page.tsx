import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	type OnboardingInitialData,
	OnboardingWizard,
} from "@/components/onboarding/onboarding-wizard";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { matchCareerGoal } from "@/lib/db/data/career-paths";
import { competencies, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams: Promise<{ mode?: string; goal?: string }>;
}) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	// G — tryb „zmień kierunek": ukończony student wchodzi PONOWNIE w kreator, by
	// wybrać nowy cel i dostać przeliczony pulpit. Brama (poniżej) otwiera się TYLKO
	// dla ?mode=change. Bez tego parametru zachowanie bez zmian (ukończony → dashboard).
	// `goal` (opcjonalny) = cel wybrany w standalone Pomocniku — wstępnie ustawiony,
	// żeby nie wybierać dwa razy. matchCareerGoal kanonizuje (casing/diakrytyki) i
	// odrzuca cele spoza 23 (URL niezaufany) → null gdy nie pasuje.
	const { mode, goal } = await searchParams;
	const isChangeMode = mode === "change";
	const presetGoal = isChangeMode && goal ? (matchCareerGoal(goal) ?? undefined) : undefined;

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (student?.onboardingCompleted && !isChangeMode) redirect("/dashboard");

	// Tryb zmiany kierunku obowiązuje TYLKO dla ukończonego studenta (obrona w głąb:
	// student w trakcie z ręcznie dorobionym ?mode=change nie traci pozycji wznowienia).
	const inChangeFlow = isChangeMode && Boolean(student?.onboardingCompleted);
	const effectivePreset = inChangeFlow ? presetGoal : undefined;

	// Hydratacja: brak rekordu studenta (zupełnie nowy user) → kreator od Kroku 0,
	// pusty stan. Inaczej budujemy initialStep z high-water-marka + initialData z
	// realnych kolumn (wzorzec profil/page.tsx). Kompetencje pobieramy tylko gdy
	// onboardingStep>=3 (wcześniej ich nie ma — POST /api/onboarding wstawia je na kroku 3).
	let initialStep = 0;
	let initialData: OnboardingInitialData | undefined;
	// G — samoocena z POPRZEDNIEGO celu do przeniesienia (carryover po nazwie).
	let carryoverSelfAssessments: Record<string, 2 | 3 | 4> | undefined;

	if (student) {
		// Krok 0 (sesja czatu Pomocnika) NIE jest odtwarzany — do wznowienia od kroku 1
		// wystarczy ustalony careerGoal (≠""). Bez celu zostajemy na Kroku 0. W trybie
		// zmiany kierunku: jeśli cel już wybrany w Pomocniku (effectivePreset) → od Kroku 1
		// (bez ponownego wyboru); inaczej od Kroku 0 (wybór nowego celu w kreatorze).
		const hasCareerGoal = student.careerGoal.trim() !== "";
		initialStep = inChangeFlow
			? effectivePreset
				? 1
				: 0
			: hasCareerGoal
				? student.onboardingStep
				: 0;

		// Placeholder profilu z Kroku 0 ma university="" → puste pola w formularzu.
		const profileReal = student.university.trim() !== "";

		// Partia 4: odtwarzamy WYBÓR z poziomem (nazwa → samoocena 2/3/4). Zapisane
		// kompetencje zawsze mają poziom posiadania (Brak nie jest zapisywany). Katalog
		// rynku dociąga się świeżo na wejściu w krok 3 (wizard) — tu tylko zaznaczenia.
		// W trybie zmiany kierunku te same wiersze trafiają do CARRYOVER (nie selections —
		// wybór nowego celu i tak by je wyczyścił), a wizard zasieje je po nowym katalogu.
		const selections: Record<string, 2 | 3 | 4> = {};
		if (student.onboardingStep >= 3) {
			const rows = await db.query.competencies.findMany({
				where: eq(competencies.studentId, student.id),
				columns: { name: true, selfAssessment: true },
				orderBy: (c, { asc }) => [asc(c.createdAt)],
			});
			if (inChangeFlow) carryoverSelfAssessments = {};
			const target = carryoverSelfAssessments ?? selections;
			for (const r of rows) {
				if (r.selfAssessment === 2 || r.selfAssessment === 3 || r.selfAssessment === 4) {
					target[r.name] = r.selfAssessment;
				}
			}
		}

		initialData = {
			profile: {
				university: profileReal ? student.university : "",
				fieldOfStudy: profileReal ? student.fieldOfStudy : "",
				semester: profileReal ? String(student.semester) : "",
				// Zmiana kierunku z wybranym celem → nowy cel; inaczej dotychczasowy.
				careerGoal: effectivePreset ?? student.careerGoal,
			},
			syllabusText: student.syllabusText ?? "",
			selections,
		};
	}

	return (
		<OnboardingWizard
			user={session.user}
			initialStep={initialStep}
			initialData={initialData}
			carryoverSelfAssessments={carryoverSelfAssessments}
			// A5/1.12: flaga czytana server-side (env bez NEXT_PUBLIC_ — nie
			// eksponujemy rejestru flag na klient); off = kreator jak dotąd.
			diagnosticEnabled={isFeatureEnabled("diagnosticAssessment")}
		/>
	);
}
