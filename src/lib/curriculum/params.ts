// ============================================================================
// 1E.6a — guard parametrów ścieżki tras/stron curriculum.
//
// Powód (wzorzec 0.15/B3, `src/app/api/projects/[id]/route.ts`): id modułu
// i pozycji to `uuid`. Zły format leciał prosto do `eq(<kolumna uuid>, id)`,
// Postgres zwracał 22P02, a trasa mapowała to na **500 „Internal error"**
// (+ wpis w logError) zamiast 400. Na stronach było gorzej — wyjątek leciał
// poza jakikolwiek catch, dając stronę błędu 500 zamiast notFound().
//
// Skutkiem nie był wyciek danych, tylko tania, skryptowalna ścieżka
// „500 na żądanie" i zaszumianie logów błędów. Guard odcina to PRZED
// dotknięciem bazy.
// ============================================================================

import { z } from "zod";

const UuidSchema = z.uuid();

/** Czy parametr ścieżki jest poprawnym uuid (bezpieczny do zapytania po kolumnie uuid). */
export function isUuid(value: string): boolean {
	return UuidSchema.safeParse(value).success;
}
