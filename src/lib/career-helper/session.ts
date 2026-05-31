import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";

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
