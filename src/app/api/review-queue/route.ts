// ============================================================================
// B8/1.3 (ADR-011) — KOLEJKA RECENZJI CZŁOWIEKA.
//
// GET: zgłoszenia czekające na decyzję człowieka = needs_human_review=true,
// ZŁOŻONE (submitted_at wypełnione), BEZ wiersza w submission_reviews (decyzja
// jeszcze nie zapadła; unique na submission_id gwarantuje jedną decyzję).
//
// [KOREKTA 1.4] Filtr celowo NIE zawęża po statusie: needs_human_review bywa
// prawdziwe także przy statusie 'verified' (twarde sprawdzenia padły przy
// wysokim wyniku semantycznym) i 'rejected' — te przypadki też czekają na
// człowieka (potwierdzenie/uchylenie werdyktu maszyny, ADR-008). Pierwotny
// warunek status='submitted' gubił je z kolejki.
//
// Zasięg wg roli (checkReviewerAuth):
//   • quality_operator — WSZYSTKIE tenanty (cross-tenant z definicji, ADR-011);
//     odczyt owner-side (operator nie ma roli PG — RLS nie ma tu czego chronić,
//     bo operator z założenia widzi całość).
//   • faculty — wyłącznie własny kampus: odczyt w withTenantContext(faculty),
//     WHERE tenant_id (warstwa 1) + polityki RLS faculty_sees_tenant (warstwa 2).
//
// ANONIMOWO: odpowiedź nie zawiera nazwisk ani e-maili studentów (zasada panelu
// wykładowcy) — recenzent ocenia PRACĘ (projekt, raport maszyny), nie osobę.
// Tytuły projektów dociągane osobno owner-side (katalog publiczny, bez danych
// studenta) — celowo bez JOIN w kontekście faculty, żeby nie zależeć od grantów
// app_faculty na tabeli projects.
//
// Flaga humanReviewQueue off → 404 (rodzina B8 nie istnieje).
// ============================================================================

import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectSubmissions, projects, submissionReviews, tenants } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { checkReviewerAuth } from "@/lib/reviewer-auth";

type QueueRow = {
	submissionId: string;
	projectId: string;
	tenantId: string;
	score: number | null;
	machineStatus: string;
	submittedAt: Date | null;
};

/** Wspólny kształt zapytania kolejki — tx = db (operator) albo tx tenantowe (faculty). */
// biome-ignore lint/suspicious/noExplicitAny: db i tx tenantowe współdzielą API buildera.
function queueQuery(tx: any, tenantId?: string): Promise<QueueRow[]> {
	return tx
		.select({
			submissionId: projectSubmissions.id,
			projectId: projectSubmissions.projectId,
			tenantId: projectSubmissions.tenantId,
			score: projectSubmissions.score,
			machineStatus: projectSubmissions.status,
			submittedAt: projectSubmissions.submittedAt,
		})
		.from(projectSubmissions)
		.leftJoin(submissionReviews, eq(submissionReviews.submissionId, projectSubmissions.id))
		.where(
			and(
				eq(projectSubmissions.needsHumanReview, true),
				isNotNull(projectSubmissions.submittedAt),
				isNull(submissionReviews.id),
				...(tenantId ? [eq(projectSubmissions.tenantId, tenantId)] : []),
			),
		)
		.orderBy(asc(projectSubmissions.submittedAt));
}

export async function GET() {
	if (!isFeatureEnabled("humanReviewQueue")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const reviewer = await checkReviewerAuth();
	if (!reviewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	try {
		const rows: QueueRow[] =
			reviewer.kind === "quality_operator"
				? await queueQuery(db)
				: await withTenantContext(
						{ userId: "", tenantId: reviewer.tenantId, role: "faculty" },
						(tx) => queueQuery(tx, reviewer.tenantId),
					);

		// Katalogi bez danych studenta — dociągane owner-side po id.
		const projectIds = [...new Set(rows.map((r) => r.projectId))];
		const tenantIds = [...new Set(rows.map((r) => r.tenantId))];
		const [projectRows, tenantRows] = await Promise.all([
			projectIds.length
				? db
						.select({ id: projects.id, title: projects.title, level: projects.level })
						.from(projects)
						.where(inArray(projects.id, projectIds))
				: Promise.resolve([]),
			tenantIds.length
				? db
						.select({ id: tenants.id, slug: tenants.slug })
						.from(tenants)
						.where(inArray(tenants.id, tenantIds))
				: Promise.resolve([]),
		]);
		const projectById = new Map(projectRows.map((p) => [p.id, p]));
		const tenantSlugById = new Map(tenantRows.map((t) => [t.id, t.slug]));

		return NextResponse.json({
			reviewer: reviewer.kind,
			queue: rows.map((r) => ({
				submissionId: r.submissionId,
				projectId: r.projectId,
				projectTitle: projectById.get(r.projectId)?.title ?? null,
				projectLevel: projectById.get(r.projectId)?.level ?? null,
				tenantSlug: tenantSlugById.get(r.tenantId) ?? null,
				score: r.score,
				// Werdykt maszyny — rekomendacja dla recenzenta (approve/borderline/reject).
				machineStatus: r.machineStatus,
				submittedAt: r.submittedAt,
			})),
		});
	} catch (err) {
		logError("review-queue.get", err, { reviewer: reviewer.kind });
		return NextResponse.json({ error: "Nie udało się pobrać kolejki." }, { status: 500 });
	}
}
