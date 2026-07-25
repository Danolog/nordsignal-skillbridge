/**
 * 1E.4 · R6 — strona sesji powtórek (`/powtorki`).
 *
 * ── ŚCIEŻKA: /powtorki, NIE /review (kolizja tras) ──────────────────────────
 * Spec Mili R6 mówił „/review", ale ta ścieżka jest JUŻ zajęta przez kolejkę
 * recenzji człowieka (B8/1.5, `src/app/review/page.tsx`, flaga humanReviewQueue).
 * Next.js nie pozwala dwóm stronom rozwiązywać się do tej samej ścieżki (błąd
 * builda niezależny od flag). Trasy API NIE kolidują (powtórki = /api/review/*,
 * recenzja = /api/review-queue), tylko strona. Dlatego student-facing sesja
 * powtórek siedzi pod POLSKIM /powtorki (spójne z resztą UI). To odwracalny
 * interim — ostateczną ścieżkę potwierdza Mila (zgłoszone w raporcie R6).
 *
 * Guard flagi: spacedRepetition OFF → notFound() (ekran NIE ISTNIEJE — deploy ≠
 * release, jak /curriculum/[moduleId]/exam przed masteryGate). Trasy /api/review/*
 * też są 404 przy OFF, więc nawet zgadnięty URL nie ma czego wczytać.
 *
 * Server component: sesja/student jak dashboard. BEZ ekranu potwierdzenia —
 * kolejka to czysty odczyt, więc tu ZERO efektu ubocznego (nie dotykamy /queue
 * serwerowo), tylko bramki auth. Kolejkę woła DOPIERO klient (ReviewRunner).
 */

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ReviewRunner } from "@/components/review/review-runner";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

export const metadata = {
	title: "Powtórki na dziś — SkillBridge",
};

export default async function ReviewPage() {
	if (!isFeatureEnabled("spacedRepetition")) notFound();

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true },
	});
	if (!student) redirect("/onboarding");

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
			<ReviewRunner />
		</div>
	);
}
