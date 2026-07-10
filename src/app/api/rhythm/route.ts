// ============================================================================
// 1.18 — deklaracja rytmu nauki (upsert; jedna per student).
//
// POST {hoursPerWeek, days[], activeProjectId?, stagnationOptOut?} — zapis
// owner-side; walidacja dni z zamkniętej listy; projekt musi istnieć (FK).
// Flaga off → 404.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students, studyRhythms } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const RhythmSchema = z.object({
	hoursPerWeek: z.number().int().min(1).max(80),
	days: z.array(z.enum(DAYS)).max(7),
	activeProjectId: z.uuid().nullable().optional(),
	stagnationOptOut: z.boolean().optional(),
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
	const parsed = RhythmSchema.safeParse(raw);
	if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	const days = [...new Set(parsed.data.days)];

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		await db
			.insert(studyRhythms)
			.values({
				studentId: student.id,
				tenantId: student.tenantId,
				hoursPerWeek: parsed.data.hoursPerWeek,
				days,
				activeProjectId: parsed.data.activeProjectId ?? null,
				stagnationOptOut: parsed.data.stagnationOptOut ?? false,
			})
			.onConflictDoUpdate({
				target: studyRhythms.studentId,
				set: {
					hoursPerWeek: parsed.data.hoursPerWeek,
					days,
					activeProjectId: parsed.data.activeProjectId ?? null,
					...(parsed.data.stagnationOptOut !== undefined
						? { stagnationOptOut: parsed.data.stagnationOptOut }
						: {}),
					updatedAt: new Date(),
				},
			});
		return NextResponse.json({ success: true });
	} catch (err) {
		logError("rhythm.upsert", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać rytmu." }, { status: 500 });
	}
}
