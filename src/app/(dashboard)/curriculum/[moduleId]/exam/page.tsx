/**
 * 1E.3 · P5 — Ekran 2–4: strona egzaminu (`/curriculum/[moduleId]/exam`).
 *
 * Guard flagi: masteryGate OFF → notFound() (ekran egzaminu NIE ISTNIEJE,
 * dokładnie jak curriculum przed zapaleniem curriculumPath — deploy ≠ release).
 * Server component: sesja/student/moduł jak istniejące strony curriculum;
 * przekazuje moduleId + tytuł propsem do ExamRunner (maszyna stanów kliencka).
 * `/start` woła DOPIERO klient po kliknięciu (Mila rozdz. 4) — tu ZERO efektu
 * ubocznego, tylko odczyt tytułu.
 */

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "@/components/curriculum/exam/exam-runner";
import { auth } from "@/lib/auth/server";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { curriculumModules, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

interface PageProps {
	params: Promise<{ moduleId: string }>;
}

export const metadata = {
	title: "Egzamin modułu — SkillBridge",
};

export default async function CurriculumExamPage({ params }: PageProps) {
	// Bramka egzaminu żyje w curriculum — obie flagi muszą być zapalone.
	if (!isFeatureEnabled("curriculumPath") || !isFeatureEnabled("masteryGate")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true },
	});
	if (!student) redirect("/onboarding");

	const { moduleId } = await params;
	if (!isUuid(moduleId)) notFound();
	const module_ = await db.query.curriculumModules.findFirst({
		where: eq(curriculumModules.id, moduleId),
		columns: { id: true, title: true },
	});
	if (!module_) notFound();

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
			<ExamRunner moduleId={module_.id} moduleTitle={module_.title} />
		</div>
	);
}
