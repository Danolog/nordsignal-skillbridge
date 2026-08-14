// ============================================================================
// B8/1.4 (ADR-011, ADR-008) — DECYZJA CZŁOWIEKA O ZGŁOSZENIU.
//
// POST {"decision": "approved"|"rejected", "note"?}: człowiek ma ostatnie
// słowo nad kredencjałem — approve podnosi status zgłoszenia do 'verified',
// reject obniża do 'rejected' (nadpisuje werdykt maszyny w OBIE strony;
// werdykt maszyny pozostaje w ai_review_json + score, nic nie ginie).
//
// Transakcyjnie i idempotentnie: INSERT do submission_reviews chroniony
// UNIQUE(submission_id) — druga decyzja o tym samym zgłoszeniu → 409, status
// nietknięty (pierwsza decyzja jest ostateczna; zmiana zdania = przyszły
// proces odwoławczy, poza zakresem 1.4). Wpis audytowy po commicie.
//
// Zasięg: operator — każde zgłoszenie; faculty — wyłącznie swój kampus
// (cudzy tenant → 404, nie 403: nie potwierdzamy istnienia zgłoszenia).
// reviewer_type wynika z KONTEKSTU logowania (nigdy z inputu klienta);
// reviewer_id = id sesji recenzenta (ślad audytowy, ADR-011).
//
// Flaga humanReviewQueue off → 404 (rodzina B8 nie istnieje).
// ============================================================================

import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { projectSubmissions, submissionReviews, vivaSessions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { recomputeConfirmedCoverage } from "@/lib/passport-verified";
import { reconcileVerifiedCompetencies } from "@/lib/projects/reconcile-verified";
import { checkReviewerAuth } from "@/lib/reviewer-auth";
import { vivaProjection } from "@/lib/viva/service";

const DecisionSchema = z.object({
	decision: z.enum(["approved", "rejected"]),
	note: z.string().max(2000).optional(),
});

/** Konflikt stanu (druga decyzja / zgłoszenie nie kwalifikuje się) → 409. */
class DecisionConflictError extends Error {}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("humanReviewQueue")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const reviewer = await checkReviewerAuth();
	if (!reviewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	if (!z.string().uuid().safeParse(id).success) {
		return NextResponse.json({ error: "Nieprawidłowe id zgłoszenia" }, { status: 400 });
	}

	let decision: "approved" | "rejected";
	let note: string | undefined;
	try {
		const parsed = DecisionSchema.safeParse(await req.json());
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Wymagane body: {"decision": "approved" | "rejected", "note"?: string}' },
				{ status: 400 },
			);
		}
		({ decision, note } = parsed.data);
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	try {
		const result = await db.transaction(async (tx) => {
			// FOR UPDATE — dwie równoległe decyzje o tym samym zgłoszeniu nie
			// przeplotą się (druga czeka i widzi wynik pierwszej).
			const [submission] = await tx
				.select({
					id: projectSubmissions.id,
					studentId: projectSubmissions.studentId,
					tenantId: projectSubmissions.tenantId,
					status: projectSubmissions.status,
					needsHumanReview: projectSubmissions.needsHumanReview,
					submittedAt: projectSubmissions.submittedAt,
				})
				.from(projectSubmissions)
				.where(eq(projectSubmissions.id, id))
				.for("update");

			// Nieistniejące ALBO cudzy tenant (faculty) → to samo 404 — nie
			// potwierdzamy istnienia zgłoszeń spoza kampusu.
			if (
				!submission ||
				(reviewer.kind === "faculty" && submission.tenantId !== reviewer.tenantId)
			) {
				return { outcome: "not_found" as const };
			}
			if (!submission.submittedAt) {
				throw new DecisionConflictError("Zgłoszenie nie zostało jeszcze złożone");
			}

			const [existing] = await tx
				.select({ id: submissionReviews.id, decision: submissionReviews.decision })
				.from(submissionReviews)
				.where(eq(submissionReviews.submissionId, id));
			if (existing) {
				throw new DecisionConflictError(`Decyzja już zapadła (${existing.decision})`);
			}

			await tx.insert(submissionReviews).values({
				submissionId: id,
				tenantId: submission.tenantId,
				decision,
				reviewerType: reviewer.kind,
				reviewerId: reviewer.sessionId,
				note: note ?? null,
			});

			// Człowiek ma ostatnie słowo (ADR-008): status podąża za decyzją.
			const newStatus = decision === "approved" ? ("verified" as const) : ("rejected" as const);
			await tx
				.update(projectSubmissions)
				.set({ status: newStatus, updatedAt: new Date() })
				.where(eq(projectSubmissions.id, id));

			// Blok C (C2): approve → kredencjały w tej samej tx; reject →
			// delete (cofnięcie kredencjału — to JEST ścieżka odbierania).
			await reconcileVerifiedCompetencies(tx, id);

			// B7/1.16a (ADR-013 D1): decyzja człowieka jest ostateczna — żywa sesja
			// obrony staje się bezprzedmiotowa (superseded); po decyzji viva nie
			// startuje (start sprawdza brak wiersza submission_reviews). Projekcję
			// aktualizujemy w TEJ SAMEJ tx (jedno źródło prawdy = sesja).
			const superseded = await tx
				.update(vivaSessions)
				.set({ status: "superseded", completedAt: new Date() })
				.where(
					sql`${vivaSessions.submissionId} = ${id} AND ${vivaSessions.status} IN ('pending','in_progress')`,
				)
				.returning({ id: vivaSessions.id });
			if (superseded.length > 0) {
				await tx
					.update(projectSubmissions)
					.set({
						aiReviewJson: sql`jsonb_set(coalesce(${projectSubmissions.aiReviewJson}, '{}'::jsonb), '{viva}', ${JSON.stringify(vivaProjection("superseded"))}::jsonb)`,
					})
					.where(eq(projectSubmissions.id, id));
			}

			// D-U7 (E1b §4, warunek W2 Sophii) — ŚLAD DECYZJI CZŁOWIEKA ZAPISYWANY
			// W TEJ SAMEJ TRANSAKCJI CO KREDENCJAŁ.
			//
			// Do 2026-08-12 ten zapis stał POZA transakcją i był best-effort
			// (połknięty błąd). Skutek był cichy i nieodwracalny naraz: zgłoszenie
			// dostawało status `verified`, plakietka „Oceniał człowiek” się rysowała,
			// a jedyny ocalały dowód, że decyzję podjął CZŁOWIEK, mógł nie powstać —
			// i nikt by tego nie zobaczył.
			//
			// Dlaczego akurat TEN jeden zapis, a nie wszystkie: rekord operacyjny
			// recenzji (`submission_reviews`) GINIE kaskadą razem z kontem studenta,
			// więc po usunięciu konta ślad audytowy zostaje JEDYNYM nośnikiem
			// obietnicy z CLAUDE.md §7. Nośnik pewny ginie, nośnik zawodny zostaje —
			// dlatego zawodny przestaje być zawodny. Pozostałe 19 miejsc wywołania
			// zostaje best-effort i to jest słuszne: ślad nie może blokować pracy
			// studenta.
			//
			// ŚWIADOMY KOSZT: awaria zapisu do `audit_log` zatrzymuje kolejkę
			// recenzencką. Decyzja bez dowodu jest gorsza niż decyzja niepodjęta —
			// drugą można powtórzyć, pierwsza jest cicha. PRÓG POWROTU: pierwszy
			// incydent, w którym zapis audytu zablokuje pracę recenzenta.
			//
			// SKUTEK UBOCZNY, zostawiony świadomie: przy wycofaniu transakcji cofnie
			// się także wiersz audytu, więc nie zostaje ślad po NIEUDANEJ próbie
			// decyzji. To inne zdarzenie (`submission.review.failed`) i inny próg:
			// pierwszy spór o to, czy decyzja została podjęta.
			await recordAudit(
				{
					actorType: reviewer.kind === "quality_operator" ? "operator" : "faculty",
					actorId: reviewer.sessionId,
					action: `submission.review.${decision}`,
					targetType: "submission",
					targetId: id,
					metadata: {
						previousStatus: submission.status,
						newStatus,
						reviewerType: reviewer.kind,
					},
				},
				{ tx },
			);

			return {
				outcome: "decided" as const,
				previousStatus: submission.status,
				newStatus,
				tenantId: submission.tenantId,
				studentId: submission.studentId,
			};
		});

		if (result.outcome === "not_found") {
			return NextResponse.json({ error: "Zgłoszenie nie istnieje" }, { status: 404 });
		}

		// Blok C (C3): cache pokrycia potwierdzonego PO commicie decyzji (osobne
		// połączenie nie widziałoby wierszy z tx). Best-effort wewnątrz funkcji.
		if (isFeatureEnabled("passportVerifiedOnly")) {
			await recomputeConfirmedCoverage(result.studentId);
		}

		// (Ślad audytowy zapisany WEWNĄTRZ transakcji wyżej — D-U7. Nie przywracać
		// tu drugiego zapisu: dwa wiersze na jedną decyzję są gorsze niż jeden,
		// a strażnik S-U-4 asertuje DOKŁADNIE JEDEN, nie „co najmniej jeden”.)

		return NextResponse.json({
			success: true,
			decision,
			previousStatus: result.previousStatus,
			newStatus: result.newStatus,
		});
	} catch (err) {
		if (err instanceof DecisionConflictError) {
			return NextResponse.json({ error: err.message }, { status: 409 });
		}
		logError("review-queue.decision", err, { submissionId: id, reviewer: reviewer.kind });
		return NextResponse.json({ error: "Operacja nie powiodła się" }, { status: 500 });
	}
}
