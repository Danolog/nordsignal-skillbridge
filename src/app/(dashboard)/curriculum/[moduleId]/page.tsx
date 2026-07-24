/**
 * 1E.6a — widok modułu (`/curriculum/[moduleId]`): pozycje ze statusem.
 *
 * Bramka jest po stronie SERWERA: wejście z linku wprost na zablokowany moduł
 * NIE pokazuje pozycji (jak 403 na trasie API) — student widzi tylko uczciwy
 * komunikat, czego brakuje.
 */

import { eq } from "drizzle-orm";
import { ArrowLeft, Lock } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ModuleExamGate } from "@/components/curriculum/exam/module-exam-gate";
import { ModuleItems } from "@/components/curriculum/module-items";
import { auth } from "@/lib/auth/server";
import { type ExamGateView, getModuleExamGate } from "@/lib/curriculum/exam-gate";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { curriculumModules, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

interface PageProps {
	params: Promise<{ moduleId: string }>;
}

export const metadata = {
	title: "Moduł — SkillBridge",
};

export default async function CurriculumModulePage({ params }: PageProps) {
	if (!isFeatureEnabled("curriculumPath")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true },
	});
	if (!student) redirect("/onboarding");

	const { moduleId } = await params;
	// 0.15/B3: bez guardu zły uuid leciał do eq(uuid, …) i wywalał 22P02 POZA
	// jakimkolwiek catch → strona błędu 500 zamiast notFound().
	if (!isUuid(moduleId)) notFound();
	const module_ = await db.query.curriculumModules.findFirst({
		where: eq(curriculumModules.id, moduleId),
		columns: { id: true, title: true, description: true },
	});
	if (!module_) notFound();

	const unlocked = await isModuleUnlocked(student.id, module_.id);
	const items = unlocked ? await getModuleItems(student.id, module_.id) : [];

	// 1E.3 · P5: karta bramki egzaminu tylko przy fladze masteryGate ON i module
	// odblokowanym — OFF = zero nowego zapytania, strona modułu jak dziś.
	let examGate: ExamGateView = { kind: "none" };
	if (unlocked && isFeatureEnabled("masteryGate")) {
		const completedItems = items.filter(
			(i) => i.status === "completed" || i.status === "skipped_by_placement",
		).length;
		examGate = await getModuleExamGate({
			studentId: student.id,
			moduleId: module_.id,
			completedItems,
			itemCount: items.length,
		});
	}

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
			<Link
				href="/curriculum"
				className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft aria-hidden className="size-4" />
				Ścieżka nauki
			</Link>

			<header>
				<h1 className="text-2xl font-semibold text-foreground">{module_.title}</h1>
				{module_.description && (
					<p className="mt-1 text-sm text-muted-foreground">{module_.description}</p>
				)}
			</header>

			{unlocked && examGate.kind !== "none" && (
				<ModuleExamGate view={examGate} moduleId={module_.id} />
			)}

			{unlocked ? (
				<ModuleItems items={items} moduleId={module_.id} />
			) : (
				<div className="rounded-xl border border-border bg-muted p-5">
					<h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<Lock aria-hidden className="size-4" />
						Moduł zablokowany
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Zalicz wcześniejsze moduły drabiny, żeby otworzyć ten. Treści nie pokazujemy wcześniej —
						kolejność ma znaczenie.
					</p>
				</div>
			)}
		</div>
	);
}
