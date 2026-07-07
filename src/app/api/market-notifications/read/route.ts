// ============================================================================
// AG.6 — OZNACZ POWIADOMIENIA JAKO PRZECZYTANE.
//
// POST bez body: wypełnia notified_at WSZYSTKICH nieprzeczytanych zdarzeń
// zalogowanego studenta (UI pokazuje pełną listę i ma jeden przycisk — nie ma
// stanu „częściowo przeczytane", więc per-id byłoby sztuczną złożonością).
// Idempotentny: drugi POST → marked: 0.
//
// Zapis owner-side (`db`) scoped po studentId z sesji — dokładnie zapowiedź
// z migracji 0025 („AG.6 oznaczy notified_at też jako owner"; app_student ma
// celowo TYLKO SELECT). Flaga off → 404.
// ============================================================================

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { marketNewGapEvents, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function POST() {
	if (!isFeatureEnabled("marketGapNotifications")) {
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

		const marked = await db
			.update(marketNewGapEvents)
			.set({ notifiedAt: new Date() })
			.where(
				and(eq(marketNewGapEvents.studentId, student.id), isNull(marketNewGapEvents.notifiedAt)),
			)
			.returning({ id: marketNewGapEvents.id });

		return NextResponse.json({ success: true, marked: marked.length });
	} catch (err) {
		logError("market-notifications.read", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się oznaczyć powiadomień." }, { status: 500 });
	}
}
