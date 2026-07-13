// ============================================================================
// Blok C planu napraw (C3/C4) — paszport „mówi prawdę" (decyzje D1/D2/D3).
//
// Za flagą `passportVerifiedOnly` źródłem listy kompetencji paszportu są
// KREDENCJAŁY (verified_competencies — zapisywane przez reconcile w C2),
// a zbiorcze pokrycie liczy computeDemandCoverage (średnia ważona popytem, D3)
// na wejściu „verified @ waga 1.0". Samoocena i diagnoza ZOSTAJĄ w aplikacji
// (analiza luk, Kanban na pulpicie), ale znikają z dokumentu-kredencjału.
//
// Flaga bramkuje WYŁĄCZNIE odczyt (deploy ≠ release): OFF = zachowanie
// bajt-w-bajt jak dotąd; ten moduł nie jest wtedy wołany z żadnej trasy.
// ============================================================================

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passports, students, verifiedCompetencies } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import {
	computeDemandCoverage,
	type MarketCatalogItem,
	normCompetencyName,
} from "@/lib/onboarding/market-catalog";
import { loadMarketCatalog } from "@/lib/onboarding/market-gaps";

/** Klient DB albo transakcja — kształt wspólny dla db / withTenantContext / db.transaction. */
type DbLike = Pick<typeof db, "selectDistinct">;

/**
 * Nazwy kompetencji zweryfikowanych projektami — DEDUPLIKACJA po nazwie przy
 * odczycie (dwie submisje mogą potwierdzić tę samą nazwę; UNIQUE w tabeli jest
 * per submisja). Działa i owner-side (db), i w tx studenta (grant SELECT).
 */
export async function loadVerifiedCompetencyNames(
	dbOrTx: DbLike,
	studentId: string,
): Promise<string[]> {
	const rows = await dbOrTx
		.selectDistinct({ name: verifiedCompetencies.competencyName })
		.from(verifiedCompetencies)
		.where(eq(verifiedCompetencies.studentId, studentId));
	return rows.map((r) => r.name);
}

/** Kształt pozycji kompetencji w PassportData (podzbiór dotychczasowego). */
export interface VerifiedPassportCompetency {
	name: string;
	status: "acquired";
	marketPercentage: number | null;
}

/**
 * Lista kompetencji dokumentu przy fladze ON: kredencjały ze statusem zawsze
 * 'acquired' („w trakcie" to pojęcie Kanbana, nie kredencjału — sekcja
 * „W trakcie nauki" znika z dokumentu, bo lista in_progress jest pusta).
 * Popyt per kompetencja („wymagany w NN% ogłoszeń") dokładany z katalogu roli.
 */
export function buildVerifiedPassportCompetencies(
	verifiedNames: string[],
	catalog: Pick<MarketCatalogItem, "competencyName" | "demandPercentage">[],
): VerifiedPassportCompetency[] {
	const demandByName = new Map(
		catalog.map((c) => [normCompetencyName(c.competencyName), c.demandPercentage]),
	);
	return verifiedNames.map((name) => ({
		name,
		status: "acquired" as const,
		marketPercentage: demandByName.get(normCompetencyName(name)) ?? null,
	}));
}

/** Pokrycie potwierdzone (D3): katalog roli + kredencjały @ waga 1.0. */
export async function computeConfirmedCoverage(
	careerGoal: string,
	verifiedNames: string[],
): Promise<number> {
	const catalog = await loadMarketCatalog(careerGoal);
	return computeDemandCoverage(
		catalog,
		verifiedNames.map((name) => ({ name })),
	);
}

/**
 * Przelicza pokrycie potwierdzone studenta i zapisuje cache
 * `passports.marketCoveragePercent` (semantyka cache przy fladze ON =
 * „potwierdzone"). Wołane PO COMMICIE każdej tranzycji statusu submisji
 * (submit/viva/decyzja — osobne połączenie nie widziałoby wierszy sprzed
 * commitu reconcile) — WYŁĄCZNIE przy fladze ON (przy OFF cache piszą jak
 * dotąd market-gaps/recompute/strony paszportu z deklaracji).
 *
 * Best-effort: awaria przeliczenia nie może wywrócić tranzycji statusu —
 * czytelnicy przy fladze ON i tak liczą na żywo, cache służy tylko tanim
 * odczytom ubocznym (meta description, trasa tokenowa).
 */
export async function recomputeConfirmedCoverage(studentId: string): Promise<void> {
	try {
		const student = await db.query.students.findFirst({
			where: eq(students.id, studentId),
			columns: { id: true, tenantId: true, careerGoal: true },
		});
		if (!student) return;

		const verifiedNames = await loadVerifiedCompetencyNames(db, studentId);
		const coverage = await computeConfirmedCoverage(student.careerGoal, verifiedNames);

		const existing = await db.query.passports.findFirst({
			where: eq(passports.studentId, studentId),
			columns: { id: true, marketCoveragePercent: true },
		});
		if (!existing) {
			await db.insert(passports).values({
				studentId,
				tenantId: student.tenantId,
				marketCoveragePercent: coverage,
			});
		} else if (existing.marketCoveragePercent !== coverage) {
			await db
				.update(passports)
				.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
				.where(eq(passports.id, existing.id));
		}
	} catch (err) {
		logError("passport.recomputeConfirmedCoverage", err, { studentId });
	}
}
