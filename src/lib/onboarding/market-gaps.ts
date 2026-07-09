// ============================================================================
// DETERMINISTYCZNE LUKI Z KATALOGU RYNKU (Partia 4)
//
// Zastąpił LLM-owy `generate-gaps.ts` w ścieżce onboardingu (tamten moduł
// skasowany w AG.2, 2026-07-07 — ostatnia gałąź legacy zniknęła). W tym modelu
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
import { ensureCareerModelLoaded } from "@/lib/career-model/loader";
import { db } from "@/lib/db";
import { competencies, gaps, jobMarketData, passports } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { enrichWithKind } from "@/lib/onboarding/competency-groups";
import {
	type DerivedGap,
	demandToPriority,
	deriveGaps,
	type MarketCatalogItem,
	priorityRank,
} from "@/lib/onboarding/market-catalog";
import { calculateCoverage } from "@/lib/passport-utils";

// deriveGaps + DerivedGap przeniesione do czystego modułu market-catalog (reużycie
// klient+serwer, jedno źródło prawdy). Re-eksport zachowuje istniejące importy
// (m.in. market-gaps.test.ts) i czytelność „luki liczy market-gaps".
export { deriveGaps, type DerivedGap };

/**
 * Katalog rynku dla ścieżki. Kolejność (Sophia/Darek 2026-06-27): priorytet MALEJĄCO,
 * w obrębie po popycie malejąco — rdzeń roli (krytyczne) na górze, nie najpopularniejszy
 * generyk. Priorytet z udziału WZGLĘDNEGO (r = popyt/max ścieżki), bez krotności.
 */
export async function loadMarketCatalog(careerGoal: string): Promise<MarketCatalogItem[]> {
	// 1.0: preload modelu kariery (flaga off = no-op) — enrichWithKind niżej czyta sync.
	await ensureCareerModelLoaded();
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
 * `possessedNames` = nazwy kompetencji POSIADANYCH (status ≠ missing). [1.12/§4a]
 * Do 1.11 było to tożsame z „zaznaczone" (kontrakt nie znał poziomu 1); diagnoza
 * wprowadza zmierzony poziom 1 (status missing) — taka pozycja MUSI zostać luką,
 * więc wołający filtruje po statusie. Niezmiennik ratyfikowany bez zmian:
 * luka ≡ „wymagana przez rynek ∧ missing". Status wierszy NIE jest tu ruszany (HITL).
 */
export async function persistMarketGaps(
	studentId: string,
	tenantId: string,
	careerGoal: string,
	possessedNames: string[],
): Promise<void> {
	try {
		const catalog = await loadMarketCatalog(careerGoal);
		const derived = deriveGaps(catalog, possessedNames);

		// Idempotencja: wymaż istniejące luki studenta przed wstawieniem świeżych.
		// Transakcyjnie (G / domknięcie 0.3) — przy zmianie kierunku DELETE kasuje realne
		// stare luki; przerwanie między DELETE a INSERT zostawiłoby pulpit z 0 luk. Cały
		// zapis (luki + upsert pokrycia paszportu) w JEDNEJ transakcji: przerwanie po
		// INSERT luk, a przed zapisem pokrycia, zostawiłoby paszport z pokryciem
		// niespójnym względem właśnie zapisanych luk. Atomowo: albo nowy komplet
		// (luki + pokrycie), albo stary stan bez zmian (wzorzec 0.3).
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

			// Pokrycie z tego samego źródła co reszta (calculateCoverage): statusy zapisanych
			// kompetencji (acquired/in_progress) + liczba luk jako mianownik. Odczyt przez tx —
			// widzi luki właśnie zapisane w tej transakcji, spójnie z upsertem paszportu niżej.
			const freshComps = await tx.query.competencies.findMany({
				where: eq(competencies.studentId, studentId),
				columns: { status: true },
			});
			const coverage = calculateCoverage(freshComps, derived.length);

			const existingPassport = await tx.query.passports.findFirst({
				where: eq(passports.studentId, studentId),
				columns: { id: true },
			});
			if (existingPassport) {
				await tx
					.update(passports)
					.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
					.where(eq(passports.studentId, studentId));
			} else {
				await tx.insert(passports).values({ studentId, tenantId, marketCoveragePercent: coverage });
			}
		});
	} catch (err) {
		logError("persist-market-gaps", err, { studentId });
		throw err;
	}
}
