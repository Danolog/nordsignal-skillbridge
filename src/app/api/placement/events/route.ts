// ============================================================================
// 1.17 — deklarowane zdarzenia placement (baseline + staż/praca/zmiana).
//
// POST wymaga AKTYWNEJ zgody (403 bez niej — feature żyje, ale zbieranie jest
// bramkowane zgodą per student). Baseline dokładnie raz (partial unique w DB;
// wyścig/regeneracja → 409). Zapis owner-side; odczyt własnej historii robi
// server component profilu (db owner-side), więc GET tu nie istnieje.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { placementEvents, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const NOTE_MAX_LEN = 500;

const BaseEvent = {
	occurredAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
	note: z.string().max(NOTE_MAX_LEN).optional(),
};

/** Baseline niesie status zawodowy; zdarzenia pracy — zgodność ze ścieżką. */
const EventSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("baseline"),
		employmentStatus: z.enum(["studying", "working_in_field", "working_outside", "seeking"]),
		...BaseEvent,
	}),
	z.object({
		kind: z.enum(["internship", "job", "job_change"]),
		careerAligned: z.boolean(),
		...BaseEvent,
	}),
	z.object({ kind: z.literal("job_lost"), ...BaseEvent }),
]);

export async function POST(req: Request) {
	if (!isFeatureEnabled("placementTracking")) {
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
	const parsed = EventSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}
	const occurredAt = new Date(parsed.data.occurredAt);
	if (occurredAt.getTime() > Date.now()) {
		return NextResponse.json(
			{ error: "Data zdarzenia nie może być z przyszłości." },
			{ status: 400 },
		);
	}

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true, placementConsent: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
		if (!student.placementConsent) {
			return NextResponse.json(
				{ error: "Śledzenie placement wymaga aktywnej zgody." },
				{ status: 403 },
			);
		}

		const [row] = await db
			.insert(placementEvents)
			.values({
				studentId: student.id,
				tenantId: student.tenantId,
				kind: parsed.data.kind,
				employmentStatus: parsed.data.kind === "baseline" ? parsed.data.employmentStatus : null,
				careerAligned: "careerAligned" in parsed.data ? parsed.data.careerAligned : null,
				occurredAt,
				note: parsed.data.note?.trim() || null,
			})
			.returning({ id: placementEvents.id });
		return NextResponse.json({ success: true, id: row.id });
	} catch (err) {
		// Partial unique baseline: drugi punkt startu = 409 (status aktualizuje
		// się zdarzeniami, nie nowym baseline). Drizzle opakowuje błąd pg —
		// nazwa constraintu siedzi w łańcuchu cause, nie w message wrappera.
		const chain = [err, (err as { cause?: unknown }).cause]
			.filter((e): e is Error & { constraint?: string } => e instanceof Error)
			.map((e) => `${e.message} ${e.constraint ?? ""}`)
			.join(" ");
		if (/uq_placement_events_baseline/.test(chain)) {
			return NextResponse.json(
				{ error: "Baseline już zapisany — zmiany zgłaszaj jako zdarzenia." },
				{ status: 409 },
			);
		}
		logError("placement.events", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać zdarzenia." }, { status: 500 });
	}
}
