/**
 * 1E.3 · P5 — trasa-resolver atomów correctives (Mila 7.4, rozwiązanie BLOKERA
 * routingu slug↔UUID). Paczka correctives niesie WYŁĄCZNIE slugi, a trasy
 * pozycji wymagają UUID (guard isUuid). Ta cienka trasa rozwiązuje
 * (moduleSlug, itemSlug) → UUID i robi redirect na istniejącą trasę UUID —
 * ZERO zmian w zamrożonym kontrakcie P1–P4 i w guardach isUuid.
 *
 * Server component, jeden odczyt: moduł po slugu + pozycja po (moduleId, slug).
 * Brak dopasowania (slug nieznany / atom osierocony wywołany ręcznie) → notFound.
 * Guard flag: OFF → notFound (trasa nie istnieje, jak reszta curriculum).
 */

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { curriculumModuleItems, curriculumModules, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

interface PageProps {
	params: Promise<{ moduleSlug: string; itemSlug: string }>;
}

export default async function CurriculumAtomResolverPage({ params }: PageProps) {
	if (!isFeatureEnabled("curriculumPath") || !isFeatureEnabled("masteryGate")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true },
	});
	if (!student) redirect("/onboarding");

	const { moduleSlug, itemSlug } = await params;

	const module_ = await db.query.curriculumModules.findFirst({
		where: eq(curriculumModules.slug, moduleSlug),
		columns: { id: true },
	});
	if (!module_) notFound();

	const item = await db.query.curriculumModuleItems.findFirst({
		where: and(
			eq(curriculumModuleItems.moduleId, module_.id),
			eq(curriculumModuleItems.slug, itemSlug),
		),
		columns: { id: true },
	});
	if (!item) notFound();

	// Redirect na istniejącą, UUID-routowaną trasę pozycji (kontrakt P1–P4 nietknięty).
	redirect(`/curriculum/${module_.id}/${item.id}`);
}
