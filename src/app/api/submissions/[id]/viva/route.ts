import { NextResponse } from "next/server";
import { z } from "zod";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { resolveStudentAuth, serializeVivaState } from "@/lib/viva/http";
import { isVivaSessionExpired } from "@/lib/viva/service";
import {
	loadLatestSession,
	loadOwnSubmission,
	resolveExpiredSession,
} from "@/lib/viva/session-store";

/**
 * B7/1.16a (ADR-013) — GET stanu obrony (rehydracja UI 1.16b).
 *
 * Własność egzekwowana w zapytaniu (WHERE studentId z sesji Better Auth);
 * cudze/nieistniejące → 404 (nie potwierdzamy istnienia — wzorzec B8).
 * Expiry sprawdzane LENIWIE (ADR-013 D2.4) — porzucona sesja nie wisi.
 */

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("vivaDefense")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const auth_ = await resolveStudentAuth();
	if (!auth_.ok) {
		return NextResponse.json(
			{ error: auth_.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth_.status },
		);
	}
	const params = ParamsSchema.safeParse(await ctx.params);
	if (!params.success) {
		return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
	}

	try {
		const submission = await loadOwnSubmission(params.data.id, auth_.studentId);
		if (!submission) {
			return NextResponse.json({ error: "Submission not found" }, { status: 404 });
		}
		let session = await loadLatestSession(submission.id);
		// Leniwe wygaśnięcie: in_progress po TTL → expired (0 odp.) / inconclusive.
		if (session && session.status === "in_progress" && isVivaSessionExpired(session.startedAt)) {
			await resolveExpiredSession(session);
			session = await loadLatestSession(submission.id);
		}
		return NextResponse.json(await serializeVivaState(session));
	} catch (err) {
		logError("viva.get", err, { submissionId: params.data.id });
		return NextResponse.json({ error: "Nie udało się wczytać stanu obrony." }, { status: 500 });
	}
}
