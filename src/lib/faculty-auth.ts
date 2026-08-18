import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
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

// B8/1.4: sessionId = id wiersza faculty_sessions — ślad audytowy decyzji
// recenzenckich (reviewer_id w submission_reviews wskazuje sesję, ADR-011).
export type FacultyAuth = { tenantId: string; sessionId: string };

/**
 * Zwraca tenant zalogowanego wykładowcy albo null. Sesja bez tenant_id
 * (sprzed K3) = nieważna → wymusza ponowne logowanie (fail-closed).
 */
export async function checkFacultyAuth(): Promise<FacultyAuth | null> {
	// PANEL ZA FLAGA (2026-08-17). Odczyt PER ZADANIE, nie przy starcie: zmienna
	// srodowiskowa przestawia sie bez wdrozenia, wiec gaszenie dziala natychmiast.
	//
	// To jest punkt egzekucji dla OBU tras panelu (/faculty i /api/faculty/dashboard) —
	// obie wolaja te funkcje. Sprawdzenie stoi TUTAJ, a nie w kazdej trasie osobno,
	// zeby nie powstaly dwa zachowania, ktore ktos kiedys rozjedzie.
	//
	// Zgaszona flaga uniewaznia takze SESJE JUZ WYDANE: funkcja zwraca null zanim
	// dotknie ciasteczka i tabeli, wiec otwarta sesja przestaje dawac dostep od razu.
	// „Usuniete != uniewaznione" — czyszczenie hasel zamyka tylko NOWE logowania.
	if (!isFeatureEnabled("facultyPanel")) return null;

	const cookieStore = await cookies();
	const token = cookieStore.get(FACULTY_COOKIE_NAME)?.value;
	if (!token) return null;

	const tokenHash = hashToken(token);
	try {
		const row = await db.query.facultySessions.findFirst({
			where: and(
				eq(facultySessions.tokenHash, tokenHash),
				// B8/1.3: sesja operatora (role='quality_operator') NIGDY nie daje
				// kontekstu wykładowcy — role rozdzielone twardo (ADR-011).
				eq(facultySessions.role, "faculty"),
				gt(facultySessions.expiresAt, new Date()),
			),
		});
		if (!row || !row.tenantId) return null;
		return { tenantId: row.tenantId, sessionId: row.id };
	} catch {
		return null;
	}
}
