import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectCatalog } from "@/components/projects/project-catalog";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { CAREER_PATHS, selectableCareerPaths } from "@/lib/db/data/career-paths";
import { gaps, projects, students } from "@/lib/db/schema";
import { computeCareerGoalsForProjects } from "@/lib/projects/career-match";

interface PageProps {
	searchParams: Promise<{ gapId?: string; level?: string; sourceType?: string; career?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	const allProjects = await db.query.projects.findMany({
		where: eq(projects.status, "active"),
		with: { competencies: true },
	});

	// Most kierunek→kompetencje z całego rynku (jedno zapytanie, grupowanie w pamięci).
	const marketRows = await db.query.jobMarketData.findMany({
		columns: { careerGoal: true, competencyName: true },
	});
	const careerToCompetencies = new Map<string, string[]>();
	for (const row of marketRows) {
		const list = careerToCompetencies.get(row.careerGoal) ?? [];
		list.push(row.competencyName);
		careerToCompetencies.set(row.careerGoal, list);
	}
	const goalsByProject = computeCareerGoalsForProjects(allProjects, careerToCompetencies);
	const projectsWithCareers = allProjects.map((p) => ({
		...p,
		careerGoals: goalsByProject.get(p.id) ?? [],
	}));

	const { gapId, level, sourceType, career } = await searchParams;

	const gap = gapId
		? await db.query.gaps.findFirst({
				where: and(eq(gaps.id, gapId), eq(gaps.studentId, student.id)),
				columns: { competencyName: true },
			})
		: null;

	// Domyślnie zawężamy do kierunku studenta — po onboardingu widzi od razu swoje projekty.
	// Wyjątek: aktywna luka nie może zostać zamaskowana filtrem kierunku (anchor-logika
	// careerGoals mogłaby wyciąć szeroką kompetencję i pokazać pustą siatkę).
	const defaultCareer = career ?? (gapId ? "" : (student.careerGoal ?? ""));
	// PILOTAŻ: filtr kierunku pokazuje WYBIERALNE ścieżki (20 z 23). To trzecia
	// powierzchnia wyboru — poza pickerem onboardingu i listą w profilu — i bez niej
	// ukrycie byłoby dziurawe: rozwijana lista filtra jest pełnoprawną listą ścieżek
	// pokazaną uczestnikowi, z tym samym skutkiem „platforma uwiarygodnia kotwicę".
	//
	// WYJĄTEK dla WŁASNEGO celu: jeśli konto ma już zapisany cel spoza listy
	// wybieralnych (stare konto albo pole „Inne (wpisz)" w profilu), dokładamy tę
	// jedną pozycję. Bez tego `initialCareer` = cel studenta ustawiałby filtr na
	// wartość, której nie ma wśród opcji — lista pokazywałaby pusto, a wyniki byłyby
	// zawężone. To nie jest druga kopia reguły ukrycia (nie pyta o `availableInPilot`),
	// tylko domknięcie własnego stanu konta.
	const wybieralne = selectableCareerPaths();
	const wlasnyCel = student.careerGoal
		? CAREER_PATHS.find(
				(c) =>
					c.careerGoal === student.careerGoal &&
					!wybieralne.some((w) => w.careerGoal === c.careerGoal),
			)
		: undefined;
	const careerOptions = [...wybieralne, ...(wlasnyCel ? [wlasnyCel] : [])].map((c) => ({
		careerGoal: c.careerGoal,
		family: c.family,
	}));

	return (
		<div className="proj-page">
			<div className="proj-page-header">
				<h1 className="proj-page-title">Projekty</h1>
				<p className="proj-page-desc">Realne projekty dopasowane do Twoich luk kompetencyjnych</p>
			</div>
			<ProjectCatalog
				projects={projectsWithCareers}
				gapId={gapId}
				gapCompetencyName={gap?.competencyName ?? undefined}
				studentCareerGoal={student.careerGoal ?? undefined}
				initialLevel={level}
				initialSourceType={sourceType}
				initialCareer={defaultCareer}
				careerOptions={careerOptions}
			/>
		</div>
	);
}
