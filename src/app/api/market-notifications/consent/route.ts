// ============================================================================
// AG.6 — ZGODA RODO na powiadomienia o monitoringu rynku (opt-in, odwoływalna).
//
// POST {"consent": true|false} — zapisuje decyzję studenta (obie strony:
// włączenie i wycofanie tym samym endpointem; RODO wymaga, by wycofanie było
// równie łatwe jak udzielenie). Znacznik decided_at = kiedy decyzja zapadła
// (karta opt-in na dashboardzie znika po pierwszej decyzji).
//
// Flaga off → 404 (feature nie istnieje). Zapis owner-side (`db`) — wzorzec
// zapisów na students jak w onboardingu; RLS chroni odczyty ról app_*.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const ConsentSchema = z.object({ consent: z.boolean() });

export async function POST(req: Request) {
	if (!isFeatureEnabled("marketGapNotifications")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let consent: boolean;
	try {
		const parsed = ConsentSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Wymagane body: {"consent": true | false}' },
				{ status: 400 },
			);
		}
		consent = parsed.data.consent;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	try {
		const updated = await db
			.update(students)
			.set({
				marketMonitoringConsent: consent,
				marketMonitoringDecidedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(students.userId, session.user.id))
			.returning({ id: students.id });
		if (updated.length === 0) {
			return NextResponse.json({ error: "Student not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true, consent });
	} catch (err) {
		logError("market-notifications.consent", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać zgody." }, { status: 500 });
	}
}
