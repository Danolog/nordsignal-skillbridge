import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { getModel } from "@/lib/ai/model";
import { aiTimeoutSignal } from "@/lib/ai/timeout";
import { withAiUsage } from "@/lib/ai/usage";
import { db } from "@/lib/db";
import { competencies, gaps, projects, students } from "@/lib/db/schema";

export interface MatchResult {
	projectId: string;
	matchScore: number;
	reasoning: string;
}

export async function matchProjects(
	studentId: string,
	gapId: string,
	limit = 5,
): Promise<MatchResult[]> {
	const student = await db.query.students.findFirst({
		where: eq(students.id, studentId),
	});
	if (!student) throw new Error("Student not found");

	const gap = await db.query.gaps.findFirst({
		where: eq(gaps.id, gapId),
	});
	// 0.4 (IDOR, MEDIUM): luka musi należeć do TEGO studenta i tenanta. Bez tej kontroli
	// zalogowany student mógł podać cudze gapId — funkcja pobierała lukę po samym id,
	// wyciągała jej competencyName/priority/marketPercentage do promptu i zwracała matching
	// na obcej luce (poziomy przeciek + eskalacja). Funkcja działa na owner-connection
	// (RLS niewymuszane), więc kontrola własności musi być JAWNA tutaj. Generyczny komunikat
	// „Gap not found" (jak dla nieistniejącej) — bez oracle istnienia cudzych luk.
	if (!gap || gap.studentId !== studentId || gap.tenantId !== student.tenantId) {
		throw new Error("Gap not found");
	}

	const studentComps = await db.query.competencies.findMany({
		where: eq(competencies.studentId, studentId),
	});
	const acquiredNames = studentComps
		.filter((c) => c.status === "acquired" || c.status === "in_progress")
		.map((c) => c.name.toLowerCase());

	const allProjects = await db.query.projects.findMany({
		where: eq(projects.status, "active"),
		with: { competencies: true },
	});

	if (allProjects.length === 0) return [];

	const gapName = gap.competencyName.toLowerCase();

	const scored = allProjects.map((project) => {
		// Luka jest zamknięta tylko przez kompetencje required — required-only, zgodnie z
		// definicją „zamyka lukę" używaną też w filtrze siatki (project-catalog.tsx).
		const requiredComps = project.competencies
			.filter((c) => c.role === "required")
			.map((c) => c.competencyName.toLowerCase());

		const gapMatch = requiredComps.some((name) => name.includes(gapName) || gapName.includes(name))
			? 40
			: 0;

		const overlapCount = requiredComps.filter((name) =>
			acquiredNames.some((a) => a.includes(name) || name.includes(a)),
		).length;
		const overlapScore =
			requiredComps.length > 0 ? Math.round((overlapCount / requiredComps.length) * 30) : 0;

		return {
			project,
			keywordScore: gapMatch + overlapScore,
		};
	});

	const top20 = scored.sort((a, b) => b.keywordScore - a.keywordScore).slice(0, 20);

	if (top20.length === 0) return [];

	const projectList = top20
		.map(
			(s, i) =>
				`${i + 1}. [ID: ${s.project.id}] "${s.project.title}" (${s.project.level}, ${s.project.estimatedHours}h) — wymaga: ${s.project.competencies.map((c) => c.competencyName).join(", ")}`,
		)
		.join("\n");

	const { text } = await withAiUsage(
		{
			scope: "match-projects",
			tier: "fast",
			attribution: { studentId, tenantId: student.tenantId },
		},
		() =>
			generateText({
				model: getModel("fast"),
				abortSignal: aiTimeoutSignal(),
				maxOutputTokens: 2000,
				prompt: `Jesteś matchmakerem projektów edukacyjnych. Student chce zostać "${student.careerGoal}" (semestr ${student.semester}).

Jego kompetencje: ${acquiredNames.join(", ") || "brak danych"}
Luka do zamknięcia: "${gap.competencyName}" (priorytet: ${gap.priority}, popyt rynkowy: ${gap.marketPercentage}%)

Projekty do oceny:
${projectList}

Oceń każdy projekt pod kątem:
1. Czy pomoże zamknąć lukę "${gap.competencyName}"?
2. Czy student ma wystarczające prereqs?
3. Czy poziom trudności jest odpowiedni?

Zwróć JSON (bez markdown code block) — tablicę max ${limit} najlepszych projektów:
[{"projectId": "uuid", "matchScore": 0-100, "reasoning": "po polsku, 1-2 zdania"}]

Sortuj od najlepszego dopasowania. Reasoning po polsku.`,
			}),
	);

	const cleaned = text
		.trim()
		.replace(/^```(?:json)?\n?/, "")
		.replace(/\n?```$/, "");
	try {
		const results = JSON.parse(cleaned) as MatchResult[];
		return results.slice(0, limit);
	} catch {
		const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			return (JSON.parse(jsonMatch[0]) as MatchResult[]).slice(0, limit);
		}
		return top20.slice(0, limit).map((s) => ({
			projectId: s.project.id,
			matchScore: s.keywordScore,
			reasoning: "Dopasowanie na podstawie kompetencji",
		}));
	}
}
