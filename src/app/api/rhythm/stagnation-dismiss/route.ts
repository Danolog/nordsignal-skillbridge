// ============================================================================
// 1.18 — zamknięcie bieżącego epizodu zastoju („wiem, wracam").
//
// POST bez body: stagnation_notified_at = now. Alert wróci dopiero, gdy po
// nowej aktywności znów zapadnie zastój (lastActivityAt > notifiedAt —
// logika w engine.shouldShowStagnationAlert). Idempotentne.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students, studyRhythms } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function POST() {
	if (!isFeatureEnabled("studyRhythm")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const updated = await db
			.update(studyRhythms)
			.set({ stagnationNotifiedAt: new Date(), updatedAt: new Date() })
			.where(eq(studyRhythms.studentId, student.id))
			.returning({ id: studyRhythms.id });
		if (updated.length === 0) {
			return NextResponse.json({ error: "Brak zadeklarowanego rytmu." }, { status: 404 });
		}
		return NextResponse.json({ success: true });
	} catch (err) {
		logError("rhythm.stagnation-dismiss", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać." }, { status: 500 });
	}
}
