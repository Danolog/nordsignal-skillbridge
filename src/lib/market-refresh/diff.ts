// ============================================================================
// AG.3 — DIFF RYNKU: staging (świeży przebieg ETL) vs prod (`job_market_data`).
//
// Czysta logika zbiorów, zero DB/LLM — liczby popytu są w danych. Raport jest
// wsadem do decyzji Darka w AG.4 (akceptacja jednym tapnięciem → swap), więc
// musi odpowiadać wprost na trzy pytania roadmapy: co NOWE, co ZNIKNĘŁO, co się
// ZMIENIŁO — na poziomie ścieżek i kompetencji.
//
// Dopasowanie po znormalizowanej parze (ścieżka, kompetencja) — trim+lower, ta
// sama normalizacja co deriveGaps. Nazwy wyświetlane bierzemy ze świeżej strony
// (staged) tam, gdzie istnieje, bo to ona stanie się prawdą po swapie.
// Sortowanie stabilne (alfabetyczne / po |delcie|) → raport deterministyczny.
// ============================================================================

/** Wiersz rynku w formie potrzebnej diffowi (podzbiór job_market_data[_staging]). */
export interface MarketRow {
	careerGoal: string;
	competencyName: string;
	demandPercentage: number;
	category: string;
}

export interface DiffCompetencyAdded {
	competencyName: string;
	demandPercentage: number;
}

export interface DiffCompetencyChanged {
	competencyName: string;
	from: number;
	to: number;
	/** to − from (punkty procentowe). */
	delta: number;
	/** Obecne tylko, gdy zmieniła się rodzina e-CF (rzadkie — rekategoryzacja). */
	categoryFrom?: string;
	categoryTo?: string;
}

export interface DiffPathChanges {
	careerGoal: string;
	added: DiffCompetencyAdded[];
	removed: DiffCompetencyAdded[];
	changed: DiffCompetencyChanged[];
}

export interface MarketDiff {
	/** Ścieżki obecne tylko w stagingu (z liczbą kompetencji). */
	newPaths: { careerGoal: string; competencies: number }[];
	/** Ścieżki obecne tylko na prodzie. */
	removedPaths: { careerGoal: string; competencies: number }[];
	/** Ścieżki wspólne, w których cokolwiek się zmieniło. */
	changedPaths: DiffPathChanges[];
	summary: {
		pathsBefore: number;
		pathsAfter: number;
		rowsBefore: number;
		rowsAfter: number;
		newPaths: number;
		removedPaths: number;
		changedPaths: number;
		addedCompetencies: number;
		removedCompetencies: number;
		changedCompetencies: number;
	};
}

const norm = (s: string) => s.trim().toLowerCase();

function groupByPath(rows: MarketRow[]): Map<string, Map<string, MarketRow>> {
	const paths = new Map<string, Map<string, MarketRow>>();
	for (const row of rows) {
		const pathKey = norm(row.careerGoal);
		let comps = paths.get(pathKey);
		if (!comps) {
			comps = new Map();
			paths.set(pathKey, comps);
		}
		// Duplikat pary (ścieżka, kompetencja) — ostatni wygrywa (nie powinno
		// wystąpić: silnik emituje unikalne liście per ścieżka).
		comps.set(norm(row.competencyName), row);
	}
	return paths;
}

const byName = <T extends { competencyName: string }>(a: T, b: T) =>
	a.competencyName.localeCompare(b.competencyName, "pl");

/** Diff rynku: `current` = prod (przed), `staged` = świeży przebieg (po). */
export function diffMarket(current: MarketRow[], staged: MarketRow[]): MarketDiff {
	const before = groupByPath(current);
	const after = groupByPath(staged);

	const newPaths: MarketDiff["newPaths"] = [];
	const removedPaths: MarketDiff["removedPaths"] = [];
	const changedPaths: DiffPathChanges[] = [];

	for (const [pathKey, comps] of after) {
		if (!before.has(pathKey)) {
			const any = comps.values().next().value as MarketRow;
			newPaths.push({ careerGoal: any.careerGoal, competencies: comps.size });
		}
	}
	for (const [pathKey, comps] of before) {
		if (!after.has(pathKey)) {
			const any = comps.values().next().value as MarketRow;
			removedPaths.push({ careerGoal: any.careerGoal, competencies: comps.size });
		}
	}

	for (const [pathKey, afterComps] of after) {
		const beforeComps = before.get(pathKey);
		if (!beforeComps) continue;

		const added: DiffCompetencyAdded[] = [];
		const removed: DiffCompetencyAdded[] = [];
		const changed: DiffCompetencyChanged[] = [];

		for (const [compKey, row] of afterComps) {
			const prev = beforeComps.get(compKey);
			if (!prev) {
				added.push({ competencyName: row.competencyName, demandPercentage: row.demandPercentage });
				continue;
			}
			const categoryDiffers = prev.category !== row.category;
			if (prev.demandPercentage !== row.demandPercentage || categoryDiffers) {
				changed.push({
					competencyName: row.competencyName,
					from: prev.demandPercentage,
					to: row.demandPercentage,
					delta: row.demandPercentage - prev.demandPercentage,
					...(categoryDiffers ? { categoryFrom: prev.category, categoryTo: row.category } : {}),
				});
			}
		}
		for (const [compKey, row] of beforeComps) {
			if (!afterComps.has(compKey)) {
				removed.push({
					competencyName: row.competencyName,
					demandPercentage: row.demandPercentage,
				});
			}
		}

		if (added.length + removed.length + changed.length > 0) {
			added.sort(byName);
			removed.sort(byName);
			// Największe przesunięcia popytu na górze (to na nie patrzy Darek),
			// remis |delty| — alfabetycznie (determinizm).
			changed.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || byName(a, b));
			const any = afterComps.values().next().value as MarketRow;
			changedPaths.push({ careerGoal: any.careerGoal, added, removed, changed });
		}
	}

	newPaths.sort((a, b) => a.careerGoal.localeCompare(b.careerGoal, "pl"));
	removedPaths.sort((a, b) => a.careerGoal.localeCompare(b.careerGoal, "pl"));
	changedPaths.sort((a, b) => a.careerGoal.localeCompare(b.careerGoal, "pl"));

	return {
		newPaths,
		removedPaths,
		changedPaths,
		summary: {
			pathsBefore: before.size,
			pathsAfter: after.size,
			rowsBefore: current.length,
			rowsAfter: staged.length,
			newPaths: newPaths.length,
			removedPaths: removedPaths.length,
			changedPaths: changedPaths.length,
			addedCompetencies: changedPaths.reduce((s, p) => s + p.added.length, 0),
			removedCompetencies: changedPaths.reduce((s, p) => s + p.removed.length, 0),
			changedCompetencies: changedPaths.reduce((s, p) => s + p.changed.length, 0),
		},
	};
}
