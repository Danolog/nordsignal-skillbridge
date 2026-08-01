/**
 * 1E.6a — drabina curriculum (`/curriculum`).
 *
 * Flaga off → strona NIE ISTNIEJE (404), spójnie z trasami API.
 * Prerekwizyty egzekwuje serwer — UI tylko pokazuje stan (moduł zablokowany
 * jest widoczny, ale nieklikalny; ADR-014 D3).
 */

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CURRICULUM_INTRO, CURRICULUM_INTRO_WITH_PLACEMENT } from "@/components/curriculum/labels";
import { type LadderModuleWithProgress, LadderView } from "@/components/curriculum/ladder-view";
import { auth } from "@/lib/auth/server";
import { modulesWithExam } from "@/lib/curriculum/exam-gate";
import { getCompletedItemCounts, getLadder } from "@/lib/curriculum/ladder";
import { pathKeyForCareerGoal } from "@/lib/curriculum/path-key";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

export const metadata = {
	title: "Ścieżka nauki — SkillBridge",
};

export default async function CurriculumPage() {
	if (!isFeatureEnabled("curriculumPath")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, careerGoal: true },
	});
	if (!student) redirect("/onboarding");

	const pathKey = pathKeyForCareerGoal(student.careerGoal);
	const modules = pathKey ? await getLadder(student.id, pathKey) : [];
	const completed = await getCompletedItemCounts(
		student.id,
		modules.map((m) => m.id),
	);
	// 1E.3 · P5: linia bramki egzaminu (E3) tylko przy fladze masteryGate ON —
	// OFF = zero nowego zapytania, `hasExam` niezdefiniowane, drabina jak dziś.
	const examModules = isFeatureEnabled("masteryGate")
		? await modulesWithExam(modules.map((m) => m.id))
		: null;
	const withProgress: LadderModuleWithProgress[] = modules.map((m) => ({
		...m,
		completedItems: completed.get(m.id) ?? 0,
		...(examModules ? { hasExam: examModules.has(m.id) } : {}),
	}));

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
			<header>
				<h1 className="text-2xl font-semibold text-foreground">Ścieżka nauki</h1>
				{/* 1E.7 L6 — dług D7: przy zapalonej fladze stare zdanie („bez skrótów")
				    stoi w sprzeczności z odznaką „Otwarty na podstawie diagnozy" dwa
				    wiersze niżej. Teksty w `labels.ts` (mikrocopy Sophii, cytat 1:1). */}
				<p className="mt-1 text-sm text-muted-foreground">
					{isFeatureEnabled("placementDiagnostic")
						? CURRICULUM_INTRO_WITH_PLACEMENT
						: CURRICULUM_INTRO}
				</p>
			</header>

			{pathKey === null && (
				<div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
					Ścieżka nauki nie obejmuje jeszcze Twojego celu kariery
					{student.careerGoal ? ` („${student.careerGoal}")` : ""}. Pilotaż obejmuje na razie Data
					Science.
				</div>
			)}

			<LadderView modules={withProgress} />
		</div>
	);
}
