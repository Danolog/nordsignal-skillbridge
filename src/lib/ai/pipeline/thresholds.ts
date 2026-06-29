/**
 * Progi routingu potoku oceny (§6.7) — w jednym miejscu, z nadpisaniem przez
 * zmienną środowiskową (strojenie bez zmiany kodu, wzorem getModel). Liczby NIE
 * rozsiane po kodzie.
 */

function envNumber(name: string, fallback: number): number {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;
	const n = Number(raw);
	return Number.isFinite(n) ? n : fallback;
}

export function getThresholds() {
	return {
		/** Dolna granica pogranicza (priorytet kolejki człowieka). */
		borderlineLow: envNumber("SKILLBRIDGE_REVIEW_BORDERLINE_LOW", 45),
		/** Górna granica pogranicza. */
		borderlineHigh: envNumber("SKILLBRIDGE_REVIEW_BORDERLINE_HIGH", 55),
		/** Próg zagregowanego ryzyka ściągania. */
		riskThreshold: envNumber("SKILLBRIDGE_REVIEW_RISK_THRESHOLD", 0.6),
		/** Min. wynik dla statusu `verified`. */
		verifyMinScore: envNumber("SKILLBRIDGE_REVIEW_VERIFY_MIN_SCORE", 70),
		/** Maks. ryzyko dla statusu `verified`. */
		verifyMaxRisk: envNumber("SKILLBRIDGE_REVIEW_VERIFY_MAX_RISK", 0.5),
		/** Próg wyniku dla statusu `rejected`. */
		rejectMaxScore: envNumber("SKILLBRIDGE_REVIEW_REJECT_MAX_SCORE", 30),
	};
}

export type Thresholds = ReturnType<typeof getThresholds>;
