// ============================================================================
// Wspólny helper wykrywania kodu SQLSTATE Postgresa — jedna definicja dla
// wszystkich tras (hoist wg noty Leo). pg zwraca kod na `.code`, ALE Drizzle
// (query builder `db.insert().values()`) OWIJA błąd bazy w Error("Failed query:
// …") z oryginałem na `.cause` — wtedy `.code` jest o poziom (lub kilka) niżej.
// Chodzimy po łańcuchu `cause`, żeby wykryć kod zarówno przy surowym błędzie pg,
// jak i owiniętym. Bez tego wyścig unikalności (23505 z db.insert owinięty przez
// Drizzle) leci jako 500 zamiast 409.
// ============================================================================

/**
 * Kod SQLSTATE z błędu (lub undefined). Odporne na owinięcie Drizzle: schodzi po
 * łańcuchu `.cause` (limit głębokości + zbiór odwiedzonych chroni przed cyklem
 * cause→self, który zawiesiłby pętlę).
 */
export function pgErrorCode(err: unknown): string | undefined {
	let cursor: unknown = err;
	const seen = new Set<unknown>();
	for (let depth = 0; depth < 8 && cursor && typeof cursor === "object"; depth++) {
		if (seen.has(cursor)) break; // ochrona przed cyklem cause → self
		seen.add(cursor);
		const code = (cursor as { code?: unknown }).code;
		if (typeof code === "string") return code;
		cursor = (cursor as { cause?: unknown }).cause;
	}
	return undefined;
}

/** Naruszenie unikalności (23505) — surowe pg albo owinięte przez Drizzle. */
export function isUniqueViolation(err: unknown): boolean {
	return pgErrorCode(err) === "23505";
}

/**
 * Naruszenie klucza obcego (23503) — surowe pg albo owinięte przez Drizzle.
 * Konsument (trasa /api/review/answer, K3): mapujemy na 404/409, NIGDY surowe 500 —
 * nie wyciekamy szczegółu bazy, a klient dostaje czytelny błąd „zasób nie istnieje".
 */
export function isForeignKeyViolation(err: unknown): boolean {
	return pgErrorCode(err) === "23503";
}
