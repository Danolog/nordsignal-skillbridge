// ============================================================================
// RAPORTY EWALUACJI (AG.0) — zapis wyników + delta względem baseline'u.
//
// Reguła z roadmapy (Blok AG, dziedziczy Bramkę DoD pkt 4): każda zmiana
// promptu/modelu gap detection MUSI raportować deltę metryki. Mechanika:
//  - każdy run pisze `tests/evals/reports/<nazwa>-latest.json` (gitignore),
//  - zaakceptowany run kopiuje się ręcznie do `tests/evals/gap-detection/
//    baseline.json` (commitowany) — to punkt odniesienia delty,
//  - kolejne runy wypisują deltę vs baseline na konsolę (widoczna w output
//    `pnpm test:evals`).
// ============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(process.cwd(), "tests", "evals", "reports");
const BASELINE_PATH = join(process.cwd(), "tests", "evals", "gap-detection", "baseline.json");

/** Zapisuje raport runu do reports/<name>.json (katalog poza gitem). Zwraca ścieżkę. */
export function writeReport(name: string, data: unknown): string {
	mkdirSync(REPORTS_DIR, { recursive: true });
	const file = join(REPORTS_DIR, `${name}.json`);
	writeFileSync(file, `${JSON.stringify(data, null, "\t")}\n`);
	return file;
}

/** Baseline (zaakceptowany run) — null, gdy jeszcze nie istnieje (pierwsze uruchomienie). */
export function loadBaseline<T>(): T | null {
	if (!existsSync(BASELINE_PATH)) {
		return null;
	}
	return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as T;
}

/**
 * Linia delty metryki do konsoli. Brak baseline'u = jawny komunikat (a nie cisza),
 * żeby pierwszy zaakceptowany run został świadomie utrwalony jako baseline.
 */
export function formatDelta(metric: string, current: number, baseline?: number | null): string {
	const cur = current.toFixed(3);
	if (baseline === undefined || baseline === null) {
		return `[eval] ${metric}: ${cur} (brak baseline — po akceptacji skopiuj raport do baseline.json)`;
	}
	const delta = current - baseline;
	const sign = delta >= 0 ? "+" : "";
	return `[eval] ${metric}: ${cur} (baseline ${baseline.toFixed(3)}, delta ${sign}${delta.toFixed(3)})`;
}
