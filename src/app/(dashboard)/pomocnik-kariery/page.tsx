import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CareerHelperFlow } from "@/components/career-helper/career-helper-flow";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";

/**
 * B0 — Pomocnik Wyboru Kariery. Trasa za loginem (IA Sophii: osobna trasa,
 * analog passport/, NIE zagnieżdżona w onboardingu; brak kafelka w menu w Becie).
 *
 * Wzorzec auth 1:1 z passport/page.tsx: brak sesji → /login; brak studenta →
 * /onboarding. Server component sprawdza tylko dostęp — całość interakcji (czat,
 * strumień) żyje w kliencie (CareerHelperFlow). Nie tworzy żadnego endpointu (G9).
 *
 * crisisSupportMessage: per tenant w Phase 1 (kolumna tenants.crisis_support_message
 * — pre-feasibility §8.1, własność Ethana/ADR-003, NIE w schemacie na 2026-05-31).
 * W Becie używamy neutralnego defaultu w kodzie komponentu.
 */
export default async function PomocnikKarieryPage({
	searchParams,
}: {
	searchParams: Promise<{ sessionId?: string }>;
}) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, onboardingCompleted: true },
	});
	if (!student) redirect("/onboarding");

	const { sessionId } = await searchParams;

	return (
		<CareerHelperFlow
			initialSessionId={sessionId}
			onboardingCompleted={student.onboardingCompleted}
		/>
	);
}
