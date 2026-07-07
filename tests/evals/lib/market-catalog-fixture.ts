// ============================================================================
// KATALOG RYNKU DLA EWALUACJI (AG.0) — snapshot z artefaktu ETL, bez bazy.
//
// Ewaluacje muszą działać bez Postgresa (lokalnie i w CI), więc katalog ścieżki
// bierzemy wprost z artefaktu ETL (job-market-justjoinit.json) — tego samego,
// którym `db:seed` zasila `job_market_data`. Semantyka = `loadMarketCatalog`
// (market-gaps.ts) bez wzbogacenia o `kind` i bez sortowania — dla liczenia luk
// (operacje na zbiorach) kolejność i rodzaj są bez znaczenia.
// ============================================================================

import marketArtifact from "@/lib/db/data/job-market-justjoinit.json";
import type { MarketCatalogItem } from "@/lib/onboarding/market-catalog";

interface ArtifactPath {
	careerGoal: string;
	competencies: { name: string; demandPercentage: number; category: string }[];
}

/** Katalog rynku ścieżki (nazwa, popyt, kategoria) — 1:1 z artefaktem ETL. */
export function catalogFor(careerGoal: string): MarketCatalogItem[] {
	const path = (marketArtifact.data as ArtifactPath[]).find((p) => p.careerGoal === careerGoal);
	if (!path) {
		throw new Error(`Brak ścieżki "${careerGoal}" w artefakcie job-market-justjoinit.json`);
	}
	return path.competencies.map((c) => ({
		competencyName: c.name,
		demandPercentage: c.demandPercentage,
		category: c.category,
	}));
}
