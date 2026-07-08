// ============================================================================
// B8/1.3 (ADR-011) — wspólny kontekst autoryzacji RECENZENTA.
//
// Dwie role recenzenckie, jedna tabela sesji (faculty_sessions + kolumna role
// z migracji 0027):
//   • quality_operator — operator jakości (Beta: Darek). Cross-tenant
//     z definicji (ADR-011), sesja z tenant_id NULL, własny cookie i sekret
//     OPERATOR_PASSWORD (logowanie: POST /api/operator/login).
//   • faculty — wykładowca kampusu; reużywa istniejącej sesji faculty_session
//     (hasło per kampus, K3) — widzi wyłącznie swój tenant.
//
// Fail-closed: brak ważnej sesji którejkolwiek roli → null.
// ============================================================================

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { facultySessions } from "@/lib/db/schema";
import { checkFacultyAuth, hashToken } from "@/lib/faculty-auth";

export const OPERATOR_COOKIE_NAME = "operator_session";

// sessionId = id wiersza faculty_sessions (ślad audytowy — reviewer_id
// w submission_reviews, ADR-011).
export type ReviewerAuth =
	| { kind: "quality_operator"; sessionId: string }
	| { kind: "faculty"; tenantId: string; sessionId: string };

/**
 * Zwraca kontekst zalogowanego recenzenta albo null. Operator sprawdzany
 * pierwszy (własny cookie); wykładowca przez istniejący checkFacultyAuth
 * (który od 0027 honoruje wyłącznie sesje role='faculty').
 */
export async function checkReviewerAuth(): Promise<ReviewerAuth | null> {
	const cookieStore = await cookies();
	const operatorToken = cookieStore.get(OPERATOR_COOKIE_NAME)?.value;
	if (operatorToken) {
		try {
			const row = await db.query.facultySessions.findFirst({
				where: and(
					eq(facultySessions.tokenHash, hashToken(operatorToken)),
					eq(facultySessions.role, "quality_operator"),
					gt(facultySessions.expiresAt, new Date()),
				),
				columns: { id: true },
			});
			if (row) return { kind: "quality_operator", sessionId: row.id };
		} catch {
			// awaria odczytu sesji operatora nie może otworzyć ścieżki — spadamy
			// do próby faculty, a ta ma własny fail-closed.
		}
	}

	const faculty = await checkFacultyAuth();
	if (faculty) {
		return { kind: "faculty", tenantId: faculty.tenantId, sessionId: faculty.sessionId };
	}
	return null;
}
