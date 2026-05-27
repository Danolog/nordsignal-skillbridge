import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { facultySessions } from "@/lib/db/schema";

export const FACULTY_COOKIE_NAME = "faculty_session";

// K3: wykładowca loguje się hasłem PER KAMPUS (decyzja Darka 2026-05-26).
// Każdy partner ma osobny sekret FACULTY_PASSWORD_<SLUG> → wiąże sesję z tenantem.
export const FACULTY_TENANT_SLUGS = ["wsb-merito-szczecin", "wsb-merito-warszawa"] as const;

/** slug → nazwa zmiennej środowiskowej z hasłem kampusu. */
export function facultyPasswordEnvVar(slug: string): string {
	return `FACULTY_PASSWORD_${slug.toUpperCase().replace(/-/g, "_")}`;
}

export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export type FacultyAuth = { tenantId: string };

/**
 * Zwraca tenant zalogowanego wykładowcy albo null. Sesja bez tenant_id
 * (sprzed K3) = nieważna → wymusza ponowne logowanie (fail-closed).
 */
export async function checkFacultyAuth(): Promise<FacultyAuth | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(FACULTY_COOKIE_NAME)?.value;
	if (!token) return null;

	const tokenHash = hashToken(token);
	try {
		const row = await db.query.facultySessions.findFirst({
			where: and(
				eq(facultySessions.tokenHash, tokenHash),
				gt(facultySessions.expiresAt, new Date()),
			),
		});
		if (!row || !row.tenantId) return null;
		return { tenantId: row.tenantId };
	} catch {
		return null;
	}
}
