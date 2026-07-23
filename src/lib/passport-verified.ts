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

import { countDistinct, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { passports, students, verifiedCompetencies } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import {
	buildDemandByName,
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

// ============================================================================
// MIS.3 (plan 13) — świeżość i konteksty kredencjałów. WYŁĄCZNIE widok
// PRYWATNY studenta (decyzja Darka 2026-07-21: publiczny paszport bez zmian
// do osobnej decyzji po pilotażu). Czysta ekspozycja danych, zero migracji.
// ============================================================================

/** Statystyki kredencjału per nazwa: ostatnie potwierdzenie + liczba kontekstów. */
export interface VerifiedCompetencyStat {
	name: string;
	lastVerifiedAt: Date;
	/** Liczba RÓŻNYCH submisji potwierdzających nazwę — „kontekstów" (#8: ≥2 = ugruntowana). */
	contextCount: number;
}

/**
 * Agregacja po nazwie kompetencji: MAX(verifiedAt) i COUNT(DISTINCT submissionId).
 * To samo zapytanie zasili metrykę transferu (MIS.8) — jedna funkcja, dwaj konsumenci.
 */
export async function loadVerifiedCompetencyStats(
	dbOrTx: Pick<typeof db, "select">,
	studentId: string,
): Promise<VerifiedCompetencyStat[]> {
	const rows = await dbOrTx
		.select({
			name: verifiedCompetencies.competencyName,
			lastVerifiedAt: max(verifiedCompetencies.verifiedAt),
			contextCount: countDistinct(verifiedCompetencies.submissionId),
		})
		.from(verifiedCompetencies)
		.where(eq(verifiedCompetencies.studentId, studentId))
		.groupBy(verifiedCompetencies.competencyName);
	return rows.map((r) => ({
		name: r.name,
		// max() jest typowany nullable, ale po GROUP BY grupa zawsze ma wiersz;
		// koercja pokrywa też driver zwracający string zamiast Date.
		lastVerifiedAt:
			r.lastVerifiedAt instanceof Date ? r.lastVerifiedAt : new Date(String(r.lastVerifiedAt)),
		contextCount: Number(r.contextCount),
	}));
}

/** Progi świeżości w dniach (MIS.3, startowe — do rewizji po pilotażu). */
export const FRESHNESS_FRESH_DAYS = 90;
export const FRESHNESS_AGING_DAYS = 180;

export type FreshnessBucket = "fresh" | "aging" | "stale";

/** Kubełek świeżości: <90 dni świeża, 90–180 starzejąca się, >180 do odświeżenia. */
export function freshnessBucket(lastVerifiedAt: Date, now: Date): FreshnessBucket {
	const days = (now.getTime() - lastVerifiedAt.getTime()) / (24 * 60 * 60 * 1000);
	if (days < FRESHNESS_FRESH_DAYS) return "fresh";
	if (days <= FRESHNESS_AGING_DAYS) return "aging";
	return "stale";
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
	const demandByName = buildDemandByName(catalog);
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
