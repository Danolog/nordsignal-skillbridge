// ============================================================================
// DETERMINISTYCZNE LUKI Z KATALOGU RYNKU (Partia 4)
//
// Zastępuje LLM-owy `generate-gaps.ts` w ścieżce onboardingu. W nowym modelu
// kompetencje pochodzą WPROST z katalogu rynku (`job_market_data` per career_goal),
// a student deklaruje poziom posiadania — więc luka = pozycja katalogu, której
// student NIE zaznaczył (Brak). Liczymy ją deterministycznie:
//   • zero modelu (popyt jest w danych) → tanio, szybko, audytowalnie (Built-to-Sell),
//   • zero nadpisywania statusu samooceny (stary generate-gaps przez `competencyUpdates`
//     nadpisywał status z `levelToStatus` — w scalonym kroku to KASOWAŁO deklarację
//     studenta; tu status pochodzi tylko od studenta, HITL).
//
// Niezmiennik (ratyfikacja 9a / v5 §6): luka ≡ „wymagana przez rynek ∧ poziom Brak".
// Mianownik pokrycia = cały katalog (posiadane + luki) — spójny z calculateCoverage.
// ============================================================================

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { competencies, gaps, jobMarketData, passports } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { enrichWithKind } from "@/lib/onboarding/competency-groups";
import {
	demandToPriority,
	estimatedHoursForGap,
	type GapPriority,
	type MarketCatalogItem,
	priorityRank,
} from "@/lib/onboarding/market-catalog";
import { calculateCoverage } from "@/lib/passport-utils";

/** Wiersz luki gotowy do zapisu (bez kluczy studenta/tenanta — dokłada je zapis). */
export interface DerivedGap {
	competencyName: string;
	priority: GapPriority;
	marketPercentage: number;
	estimatedHours: number;
}

/**
 * Czysta funkcja: luki = pozycje katalogu rynku, których student NIE zaznaczył.
 * Porównanie po znormalizowanej nazwie (trim + lower) — odporne na drobne różnice
 * wielkości liter między katalogiem a zapisaną kompetencją.
 */
export function deriveGaps(catalog: MarketCatalogItem[], selectedNames: string[]): DerivedGap[] {
	const have = new Set(selectedNames.map((n) => n.trim().toLowerCase()));
	// Priorytet WZGLĘDNY — potrzebuje najwyższego popytu W ŚCIEŻCE (cały katalog, nie tylko luki).
	const maxDemand = catalog.reduce((m, i) => Math.max(m, i.demandPercentage), 0);
	return catalog
		.filter((item) => !have.has(item.competencyName.trim().toLowerCase()))
		.map((item) => {
			const priority = demandToPriority(item.demandPercentage, maxDemand);
			return {
				competencyName: item.competencyName,
				priority,
				marketPercentage: item.demandPercentage,
				estimatedHours: estimatedHoursForGap(priority),
			};
		});
}

/**
 * Katalog rynku dla ścieżki. Kolejność (Sophia/Darek 2026-06-27): priorytet MALEJĄCO,
 * w obrębie po popycie malejąco — rdzeń roli (krytyczne) na górze, nie najpopularniejszy
 * generyk. Priorytet z udziału WZGLĘDNEGO (r = popyt/max ścieżki), bez krotności.
 */
export async function loadMarketCatalog(careerGoal: string): Promise<MarketCatalogItem[]> {
	const rows = await db.query.jobMarketData.findMany({
		where: eq(jobMarketData.careerGoal, careerGoal),
	});
	const items: MarketCatalogItem[] = rows.map((r) => ({
		competencyName: r.competencyName,
		demandPercentage: r.demandPercentage,
		category: r.category,
	}));
	// Priorytet względny potrzebuje najwyższego popytu ścieżki.
	const maxDemand = items.reduce((m, i) => Math.max(m, i.demandPercentage), 0);
	const ranked = items.map((item) => ({
		item,
		rank: priorityRank(demandToPriority(item.demandPercentage, maxDemand)),
	}));
	ranked.sort((a, b) =>
		a.rank !== b.rank ? b.rank - a.rank : b.item.demandPercentage - a.item.demandPercentage,
	);
	const sorted = ranked.map((r) => r.item);
	// B1: dołącz `kind` (tool/concept/…) z career-model.json (złączenie po nazwie liścia).
	// Nie zmienia kolejności ani liczby pozycji — deriveGaps/pokrycie liczą jak dotąd.
	return enrichWithKind(careerGoal, sorted);
}

/**
 * Zapis luk + odświeżenie pokrycia paszportu — deterministycznie, bez modelu.
 * Wołane PRZED `generateSkillMap` (graf czyta świeże luki + statusy). Idempotentne:
 * najpierw kasuje stare luki studenta (re-onboarding nie duplikuje).
 *
 * `selectedNames` = nazwy zaznaczonych kompetencji (status już ustawiony przy insercie
 * z poziomu samooceny). Status zapisanych kompetencji NIE jest tu ruszany (HITL).
 */
export async function persistMarketGaps(
	studentId: string,
	tenantId: string,
	careerGoal: string,
	selectedNames: string[],
): Promise<void> {
	try {
		const catalog = await loadMarketCatalog(careerGoal);
		const derived = deriveGaps(catalog, selectedNames);

		// Idempotencja: wymaż istniejące luki studenta przed wstawieniem świeżych.
		// Transakcyjnie (G) — przy zmianie kierunku DELETE kasuje realne stare luki;
		// przerwanie między DELETE a INSERT zostawiłoby pulpit z 0 luk. Atomowo: albo
		// nowy komplet, albo stary stan bez zmian.
		await db.transaction(async (tx) => {
			await tx.delete(gaps).where(eq(gaps.studentId, studentId));
			if (derived.length > 0) {
				await tx.insert(gaps).values(
					derived.map((g) => ({
						studentId,
						tenantId,
						competencyName: g.competencyName,
						priority: g.priority,
						marketPercentage: g.marketPercentage,
						estimatedHours: g.estimatedHours,
					})),
				);
			}
		});

		// Pokrycie z tego samego źródła co reszta (calculateCoverage): statusy zapisanych
		// kompetencji (acquired/in_progress) + liczba luk jako mianownik.
		const freshComps = await db.query.competencies.findMany({
			where: eq(competencies.studentId, studentId),
			columns: { status: true },
		});
		const coverage = calculateCoverage(freshComps, derived.length);

		const existingPassport = await db.query.passports.findFirst({
			where: eq(passports.studentId, studentId),
			columns: { id: true },
		});
		if (existingPassport) {
			await db
				.update(passports)
				.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
				.where(eq(passports.studentId, studentId));
		} else {
			await db.insert(passports).values({ studentId, tenantId, marketCoveragePercent: coverage });
		}
	} catch (err) {
		logError("persist-market-gaps", err, { studentId });
		throw err;
	}
}
