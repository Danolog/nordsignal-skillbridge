import { and, eq } from "drizzle-orm";
import type { db } from "@/lib/db";
import { projectCompetencies, projectSubmissions, verifiedCompetencies } from "@/lib/db/schema";

type OwnerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Blok C planu napraw (C2) — mostek projekt→paszport, funkcja stanowo-uzgadniająca.
 *
 * Wołana po KAŻDEJ tranzycji statusu submisji (submit/resubmit, zamknięcie vivy,
 * decyzja człowieka): status 'verified' → upsert snapshotu kompetencji
 * `required` projektu do `verified_competencies`; każdy inny status → DELETE po
 * `submission_id` (cofnięcie kredencjału: reject, resubmit zbijający 'verified').
 * Dowolne przejście przepuszczone przez tę funkcję uzgadnia tabelę z prawdą —
 * odporność na pominiętą ścieżkę i na „kredencjał-zombie".
 *
 * Snapshot: wiersze powstają w chwili tranzycji na 'verified' i nie są
 * nadpisywane przy ponownym uzgodnieniu (`onConflictDoNothing` zachowuje
 * pierwotne `verified_at`); późniejsza edycja katalogu project_competencies nie
 * zmienia wystawionych kredencjałów (ADR-008 „etykieta nie kłamie").
 *
 * Zapis WYŁĄCZNIE owner-side — `app_student` ma na tej tabeli tylko SELECT
 * (RLS 0037), więc tx musi pochodzić z `db` (owner), nigdy z withTenantContext.
 *
 * PUŁAPKA nazw ról: bierzemy `role='required'` (czego projekt UCZY i co domyka);
 * 'acquired' to PREREKWIZYT wejściowy i nigdy nie idzie do paszportu.
 */
export async function reconcileVerifiedCompetencies(
	tx: OwnerTx | typeof db,
	submissionId: string,
): Promise<void> {
	const [submission] = await tx
		.select({
			studentId: projectSubmissions.studentId,
			tenantId: projectSubmissions.tenantId,
			projectId: projectSubmissions.projectId,
			status: projectSubmissions.status,
		})
		.from(projectSubmissions)
		.where(eq(projectSubmissions.id, submissionId));

	// Submisja nie istnieje → CASCADE po submission_id już posprzątał kredencjały.
	if (!submission) return;

	if (submission.status !== "verified") {
		await tx
			.delete(verifiedCompetencies)
			.where(eq(verifiedCompetencies.submissionId, submissionId));
		return;
	}

	const required = await tx
		.select({ competencyName: projectCompetencies.competencyName })
		.from(projectCompetencies)
		.where(
			and(
				eq(projectCompetencies.projectId, submission.projectId),
				eq(projectCompetencies.role, "required"),
			),
		);
	if (required.length === 0) return;

	const verifiedAt = new Date();
	await tx
		.insert(verifiedCompetencies)
		.values(
			required.map((r) => ({
				studentId: submission.studentId,
				tenantId: submission.tenantId,
				submissionId,
				competencyName: r.competencyName,
				verifiedAt,
			})),
		)
		.onConflictDoNothing({
			target: [verifiedCompetencies.submissionId, verifiedCompetencies.competencyName],
		});
}
