// ============================================================================
// 1.17 — ZGODA RODO na śledzenie placement (opt-in, odwoływalna).
//
// POST {"consent": true|false} — obie strony tym samym endpointem (RODO:
// wycofanie równie łatwe jak udzielenie; wzorzec AG.6). RÓŻNICA vs AG.6:
// odwołanie zgody KASUJE zebrane zdarzenia placement — to PII deklarowane
// wyłącznie na podstawie zgody (prywatność ponad ciągłość metryki; student
// znika z agregatów E2.H, bo te liczone są na żywo).
//
// Flaga off → 404 (feature nie istnieje). Zapis owner-side (`db`).
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { placementEvents, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const ConsentSchema = z.object({ consent: z.boolean() });

export async function POST(req: Request) {
	if (!isFeatureEnabled("placementTracking")) {
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
		// Zgoda + ewentualna kasacja zdarzeń w JEDNEJ tx — odwołanie nie może
		// zostawić danych „na chwilę" przy awarii między zapisami.
		const result = await db.transaction(async (tx) => {
			const updated = await tx
				.update(students)
				.set({
					placementConsent: consent,
					placementDecidedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(students.userId, session.user.id))
				.returning({ id: students.id });
			if (updated.length === 0) return null;
			if (!consent) {
				await tx.delete(placementEvents).where(eq(placementEvents.studentId, updated[0].id));
			}
			return updated[0].id;
		});
		if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		// Ślad decyzji zgody (bez treści zdarzeń) — rozliczalność RODO.
		//
		// A1+A2 (ADR A-1 (a+), decyzja D-1 Ryana): BEZ `actorId` i BEZ kontekstu
		// żądania. `actorId` był tu DOSŁOWNYM duplikatem `targetId` (ta sama
		// zmienna `result` = `students.id`), więc jego usunięcie nie kosztuje ani
		// grama rozliczalności — art. 5 ust. 1 lit. c bez przeciwwagi.
		// `targetId` ZOSTAJE: to jedyny nośnik „czyja zgoda", potrzebny dopóki
		// konto żyje (art. 7 ust. 1 — wykazanie zgody). Ginie z kontem kaskadą,
		// więc art. 17 zaspokaja struktura, nie procedura.
		await recordAudit({
			actorType: "student",
			action: consent ? "placement.consent.granted" : "placement.consent.revoked",
			targetType: "student",
			targetId: result,
		});
		return NextResponse.json({ success: true, consent });
	} catch (err) {
		logError("placement.consent", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się zapisać zgody." }, { status: 500 });
	}
}
