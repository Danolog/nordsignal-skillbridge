import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { resolveUnmappedTenantId } from "@/lib/db/tenant-mapping";

/**
 * Wspólny resolver kontekstu studenta dla tras Pomocnika (B0).
 *
 * getSession → studentMeta {id, tenantId} owner-side (jak api/gaps). Bez
 * tenantId nie da się wejść w withTenantContext z poprawnym kontekstem RLS.
 * Zwraca dyskryminowany wynik zamiast rzucać — handler mapuje na 401/404.
 */
export type StudentAuth =
	| { ok: true; userId: string; studentId: string; tenantId: string }
	| { ok: false; status: 401 | 404 };

export async function resolveStudent(): Promise<StudentAuth> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return { ok: false, status: 401 };

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return { ok: false, status: 404 };

	return {
		ok: true,
		userId: session.user.id,
		studentId: studentMeta.id,
		tenantId: studentMeta.tenantId,
	};
}

/**
 * Resolver dla wejścia w Pomocnika z KROKU 0 onboardingu (strumień E / #5).
 *
 * Problem (blocker onboardingu): Pomocnik jest osadzony jako Krok 0 wizarda dla
 * NOWEGO studenta — który NIE MA jeszcze rekordu `students` (powstaje dopiero w
 * finalnym POST /api/onboarding). Sesja Pomocnika (`career_helper_sessions`) jest
 * jednak NOT NULL kluczowana po `student_id`, a resolveStudent() zwraca 404 bez
 * rekordu → nowy użytkownik nie zapisze ankiety i utyka na Kroku 0.
 *
 * Rozwiązanie BEZ migracji prod: jeśli rekordu nie ma, tworzymy PROWIZORYCZNY
 * wiersz studenta (placeholdery w NOT NULL, tenant `__unmapped` dopóki nie znamy
 * uczelni, onboardingCompleted=false). Finalny POST /api/onboarding robi UPSERT
 * (gałąź `existing` → UPDATE) i nadpisuje placeholdery realnymi danymi + re-resolve
 * tenantu (z passport/submissions). Prowizoryczny wiersz jest więc niewidoczny dla
 * użytkownika i spójny po dokończeniu onboardingu.
 *
 * Insert idzie przez withTenantContext({role:"student"}) — RLS student_sees_own
 * (WITH CHECK user_id = app.current_user_id) przepuszcza wstawienie własnego
 * wiersza, identycznie jak ścieżka tworzenia studenta w POST /api/onboarding.
 */
export async function resolveOrProvisionStudent(): Promise<StudentAuth> {
	const existing = await resolveStudent();
	if (existing.ok || existing.status === 401) return existing;

	// existing.status === 404 → brak rekordu studenta (nowy user w Kroku 0).
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return { ok: false, status: 401 };
	const userId = session.user.id;

	// Tenant prowizoryczny: __unmapped (uczelnia nieznana do Kroku 1 Profilu).
	// Finalny onboarding re-resolve'uje tenant z realnej uczelni przy UPDATE.
	const tenantId = await resolveUnmappedTenantId();

	const studentId = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
		// Idempotencja na wyścig (równoległe wejście w Krok 0): jeśli w międzyczasie
		// powstał wiersz — użyj go, nie duplikuj (user_id ma UNIQUE).
		const already = await tx.query.students.findFirst({
			where: eq(students.userId, userId),
			columns: { id: true },
		});
		if (already) return already.id;

		const [created] = await tx
			.insert(students)
			.values({
				userId,
				tenantId,
				// Placeholdery NOT NULL — nadpisywane przez UPSERT w POST /api/onboarding.
				university: "",
				fieldOfStudy: "",
				semester: 1,
				careerGoal: "",
				onboardingCompleted: false,
			})
			.returning({ id: students.id });
		return created.id;
	});

	return { ok: true, userId, studentId, tenantId };
}
