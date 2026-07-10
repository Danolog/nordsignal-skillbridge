// ============================================================================
// 1.18 — check-in tygodniowy (OPCJONALNY; decyzja Darka: streak liczy się
// z realnych śladów, check-in to refleksja/kalibracja, nie obowiązek).
//
// POST {hoursActual?, note?} — weekStart (poniedziałek ISO, UTC) liczony
// SERVER-SIDE; jeden wiersz per tydzień (upsert po uq_study_checkins_week).
// Check-in sam w sobie jest śladem aktywności (podtrzymuje streak).
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students, studyCheckins } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { startOfIsoWeekUtc } from "@/lib/rhythm/engine";

const CheckinSchema = z
	.object({
		hoursActual: z.number().int().min(0).max(120).optional(),
		note: z.string().max(500).optional(),
	})
	.refine((v) => v.hoursActual !== undefined || (v.note ?? "").trim().length > 0, {
		message: "Check-in musi nieść godziny albo notatkę.",
	});

export async function POST(req: Request) {
	if (!isFeatureEnabled("studyRhythm")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = CheckinSchema.safeParse(raw);
	if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const weekStart = startOfIsoWeekUtc(new Date());
		await db
			.insert(studyCheckins)
			.values({
				studentId: student.id,
				tenantId: student.tenantId,
				weekStart,
				hoursActual: parsed.data.hoursActual ?? null,
				note: parsed.data.note?.trim() || null,
			})
			.onConflictDoUpdate({
				target: [studyCheckins.studentId, studyCheckins.weekStart],
				set: {
					hoursActual: parsed.data.hoursActual ?? null,
					note: parsed.data.note?.trim() || null,
				},
			});
		return NextResponse.json({ success: true, weekStart: weekStart.toISOString() });
	} catch (err) {
		logError("rhythm.checkin", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać check-inu." }, { status: 500 });
	}
}
