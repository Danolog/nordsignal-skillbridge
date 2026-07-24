// ============================================================================
// 1E.3 (ADR-014 D3) — kontrakt parametrów egzaminu modułowego (mastery gate).
//
// JEDYNE źródło prawdy parsowania kolumny `curriculum_modules.exam_config_json`
// (jsonb, NULL do 1E.3). Typ + walidacja — BEZ konsumenta API (to plasterek P3).
// Ten plik nie dotyka DB ani tras; wystawia tylko schemat i parser kolumny.
//
// Kształt (ADR-014 D3, wiersz `exam` tabeli „Definicja zaliczenia per typ"):
//   - `questionCount` — liczba pytań egzaminu, 15–20 (wariant „12 pytań/90%"
//     odrzucony w ADR: progu 90% nie da się przy 12 osiągnąć dokładnie);
//   - `maxErrors` — próg jako LICZNIK dopuszczalnych błędów (M10: licznik, nie
//     procent), NIGDY wartość procentowa.
//
// Niezmiennik spójności progu z liczbą pytań (ADR: „≈90%: ≤1 błąd przy 15 /
// ≤2 przy 20"):
//   1 ≤ maxErrors ≤ floor(questionCount / 10)
//   - GÓRNA granica `maxErrors ≤ floor(qc/10)` ⟺ `maxErrors/qc ≤ 10%` ⟺ próg
//     zaliczenia ≥ 90% (15→≤1, 16–19→≤1, 20→≤2). Chroni przed „progiem 90%
//     zapisanym jako procent" (np. maxErrors=90 albo 10) — odpada jako spoza
//     zakresu, a wartość ułamkowa (0.1 = „10%") odpada już na `int()`.
//   - DOLNA granica `maxErrors ≥ 1` jest wprost z ADR: powód wyboru 15–20 zamiast
//     12 to „żeby 1 lapsus NIE oblewał". maxErrors=0 (wymagane 100%) łamałby ten
//     zamysł — egzamin mastery to ~90%, nie bezbłędność.
//
// `.strict()` — konfiguracja z dodatkowym/innym kluczem (np. `thresholdPercent`
// zamiast `maxErrors`) jest ODRZUCANA, nie po cichu okrajana (wzorzec hints.ts).
// ============================================================================

import { z } from "zod";

/** Dolna granica liczby pytań egzaminu (ADR-014 D3). */
export const EXAM_MIN_QUESTIONS = 15;
/** Górna granica liczby pytań egzaminu (ADR-014 D3). */
export const EXAM_MAX_QUESTIONS = 20;

/**
 * Najwyższy dopuszczalny licznik błędów dla danej liczby pytań, tak by próg
 * zaliczenia pozostał ≥ 90% (`maxErrors/questionCount ≤ 10%`). Liczba całkowita
 * — `floor`, bo licznik błędów jest całkowity (15→1, 20→2).
 */
export function maxErrorsCeilingFor(questionCount: number): number {
	return Math.floor(questionCount / 10);
}

/**
 * Schemat parametrów egzaminu per moduł. Zamknięty (`.strict()`); niezmiennik
 * spójności progu w `superRefine`, żeby komunikat wskazywał konkretną granicę.
 */
export const examConfigSchema = z
	.object({
		questionCount: z.number().int().min(EXAM_MIN_QUESTIONS).max(EXAM_MAX_QUESTIONS),
		// LICZNIK dopuszczalnych błędów (nie procent). `int()` odcina wartości
		// ułamkowe typu 0.1 („10%"); zakres domyka superRefine niżej.
		maxErrors: z.number().int().min(1),
	})
	.strict()
	.superRefine((cfg, ctx) => {
		const ceiling = maxErrorsCeilingFor(cfg.questionCount);
		if (cfg.maxErrors > ceiling) {
			ctx.addIssue({
				code: "custom",
				path: ["maxErrors"],
				message:
					`maxErrors=${cfg.maxErrors} niespójny z questionCount=${cfg.questionCount}: ` +
					`próg mastery ≥90% dopuszcza najwyżej ${ceiling} błąd(y) ` +
					`(licznik, nie procent — ADR-014 D3).`,
			});
		}
	});

/** Parametry egzaminu modułowego (parsowane z `exam_config_json`). */
export type ExamConfig = z.infer<typeof examConfigSchema>;

/**
 * Parser kolumny `exam_config_json` — jedyne wejście do surowej wartości jsonb.
 * `null`/`undefined` (moduł bez skonfigurowanego egzaminu) → `null`, nie błąd:
 * brak egzaminu to legalny stan modułu (drabina zalicza po pozycjach, 1E.1).
 * Niepoprawny kształt rzuca — zła konfiguracja nie może „po cichu" wejść jako
 * egzamin bez progu.
 */
export function parseExamConfig(raw: unknown): ExamConfig | null {
	if (raw === null || raw === undefined) return null;
	return examConfigSchema.parse(raw);
}

/** Wariant bezrzutowy dla walidacji/testów (safeParse — zwraca komplet błędów). */
export function safeParseExamConfig(raw: unknown) {
	return examConfigSchema.safeParse(raw);
}
