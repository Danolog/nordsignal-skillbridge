// ============================================================================
// METRYKI EWALUACJI (AG.0) — czysta logika zbiorów, bez LLM.
//
// Precision/recall/F1 liczone na ZBIORACH nazw kompetencji, z tą samą
// normalizacją (trim + lower), której używa deriveGaps — porównanie odporne
// na wielkość liter i białe znaki, tak jak produkcyjne liczenie luk.
//
// Konwencje brzegowe (dokumentowane, bo od nich zależą progi):
//  - puste expected i puste actual → ideał (precision = recall = 1),
//  - puste expected, niepuste actual → precision 0 (same fałszywe trafienia),
//    recall 1 (nie było czego znaleźć),
//  - F1 = 0, gdy precision + recall = 0 (ochrona przed dzieleniem przez zero).
// ============================================================================

export interface SetMetrics {
	tp: number;
	fp: number;
	fn: number;
	precision: number;
	recall: number;
	f1: number;
	/** Nazwy nadmiarowe (wykryte, a nieoczekiwane) — do raportu per przypadek. */
	falsePositives: string[];
	/** Nazwy przeoczone (oczekiwane, a niewykryte) — do raportu per przypadek. */
	falseNegatives: string[];
}

/** Ta sama normalizacja co w deriveGaps/annotateWithSyllabus (trim + lower). */
export function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

/** Precision/recall/F1 zbioru `actual` względem wzorca `expected` (po normalizacji). */
export function setMetrics(expected: string[], actual: string[]): SetMetrics {
	const exp = new Set(expected.map(normalizeName));
	const act = new Set(actual.map(normalizeName));
	const falsePositives = [...act].filter((a) => !exp.has(a)).sort();
	const falseNegatives = [...exp].filter((e) => !act.has(e)).sort();
	const tp = [...act].filter((a) => exp.has(a)).length;
	const fp = falsePositives.length;
	const fn = falseNegatives.length;
	const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
	const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
	const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
	return { tp, fp, fn, precision, recall, f1, falsePositives, falseNegatives };
}

export interface MacroMetrics {
	precision: number;
	recall: number;
	f1: number;
}

/** Makro-średnia (każdy przypadek waży tyle samo, niezależnie od rozmiaru zbioru). */
export function macroAverage(all: SetMetrics[]): MacroMetrics {
	if (all.length === 0) {
		return { precision: 0, recall: 0, f1: 0 };
	}
	const avg = (sel: (m: SetMetrics) => number) =>
		all.reduce((sum, m) => sum + sel(m), 0) / all.length;
	return { precision: avg((m) => m.precision), recall: avg((m) => m.recall), f1: avg((m) => m.f1) };
}
