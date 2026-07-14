/**
 * 1E.6a — widok pozycji (`/curriculum/[moduleId]/[itemId]`).
 *
 * Treść pobiera `getItemView` (ten sam kod, co trasa GET
 * /api/curriculum/items/[id]) — z jawnymi kolumnami: klucz odpowiedzi,
 * feedback per opcja i wyjaśnienie NIE trafiają do przeglądarki przed oceną.
 *
 * Blokada (moduł albo pozycja w sekwencji) → uczciwy komunikat zamiast treści,
 * tak samo jak 403 na trasie. UI nie jest bramką — bramką jest serwer.
 */

import { eq } from "drizzle-orm";
import { ArrowLeft, Lock } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ItemDetail } from "@/components/curriculum/item-detail";
import { auth } from "@/lib/auth/server";
import { getItemView } from "@/lib/curriculum/item-view";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

interface PageProps {
	params: Promise<{ moduleId: string; itemId: string }>;
}

export const metadata = {
	title: "Pozycja — SkillBridge",
};

export default async function CurriculumItemPage({ params }: PageProps) {
	if (!isFeatureEnabled("curriculumPath")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true },
	});
	if (!student) redirect("/onboarding");

	const { moduleId, itemId } = await params;
	// 0.15/B3: bez guardu zły uuid leciał do eq(uuid, …) i wywalał 22P02 POZA
	// jakimkolwiek catch → strona błędu 500 zamiast notFound().
	if (!isUuid(moduleId) || !isUuid(itemId)) notFound();
	const result = await getItemView(student.id, itemId);
	if (!result.ok) {
		if (result.reason === "not_found") notFound();
		return (
			<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
				<Link
					href={`/curriculum/${moduleId}`}
					className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="size-4" />
					Wróć do modułu
				</Link>
				<div className="rounded-xl border border-border bg-muted p-5">
					<h1 className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<Lock aria-hidden className="size-4" />
						{result.reason === "module_locked" ? "Moduł zablokowany" : "Pozycja zablokowana"}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{result.reason === "module_locked"
							? "Zalicz wcześniejsze moduły drabiny, żeby otworzyć ten materiał."
							: "Zalicz poprzednią pozycję modułu, żeby otworzyć tę."}
					</p>
				</div>
			</div>
		);
	}

	return <ItemDetail view={result.view} />;
}
