import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectCatalog } from "@/components/projects/project-catalog";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { CAREER_PATHS } from "@/lib/db/data/career-paths";
import { projects, students } from "@/lib/db/schema";
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
	// Domyślnie zawężamy do kierunku studenta — po onboardingu widzi od razu swoje projekty.
	const defaultCareer = career ?? student.careerGoal ?? "";
	const careerOptions = CAREER_PATHS.map((c) => ({ careerGoal: c.careerGoal, family: c.family }));

	return (
		<div className="proj-page">
			<div className="proj-page-header">
				<h1 className="proj-page-title">Projekty</h1>
				<p className="proj-page-desc">Realne projekty dopasowane do Twoich luk kompetencyjnych</p>
			</div>
			<ProjectCatalog
				projects={projectsWithCareers}
				gapId={gapId}
				initialLevel={level}
				initialSourceType={sourceType}
				initialCareer={defaultCareer}
				careerOptions={careerOptions}
			/>
		</div>
	);
}
