import { asc, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gaps, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";

/**
 * §8 #1 Phase 2 / issue #19d (refactor sub-issue): odczyt gaps przez
 * withTenantContext({role: "student"}). Pre-fetch student meta (id, tenantId)
 * owner-side przez `db` — bez tego nie da się wejść w tx z poprawnym
 * kontekstem RLS (tenantId wymagany).
 */
export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) return NextResponse.json({ error: "Student not found" }, { status: 404 });

	// 0.15/B6: awaria DB/RLS dawała gołe 500 bez logError (wbrew lekcji #4 — nigdy
	// puste 500 bez śladu).
	try {
		const studentGaps = await withTenantContext(
			{ userId: session.user.id, tenantId: studentMeta.tenantId, role: "student" },
			(tx) =>
				tx
					.select()
					.from(gaps)
					.where(eq(gaps.studentId, studentMeta.id))
					.orderBy(
						asc(
							sql`CASE ${gaps.priority}
								WHEN 'critical' THEN 1
								WHEN 'important' THEN 2
								WHEN 'nice_to_have' THEN 3
							END`,
						),
						desc(gaps.marketPercentage),
					),
		);

		return NextResponse.json({ gaps: studentGaps });
	} catch (err) {
		logError("gaps.get", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się pobrać luk." }, { status: 500 });
	}
}
