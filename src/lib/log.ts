/**
 * Strukturalny logger błędów — loguje tylko message + name, nigdy raw error object.
 *
 * Powód: Anthropic SDK error objects zawierają oryginalny prompt (z PII użytkownika
 * — sylabus, cel kariery, nazwiska). Trafiają na Vercel runtime logs, dostępne
 * dla każdego z project tokenem. Surowy log = wyciek PII / GDPR issue.
 *
 * Użycie:
 *   try { ... } catch (err) {
 *     logError("onboarding", err, { studentId });
 *     return NextResponse.json(...);
 *   }
 */
export function logError(
	scope: string,
	err: unknown,
	ctx: Record<string, string | number | undefined> = {},
): void {
	const message = err instanceof Error ? err.message : String(err);
	const name = err instanceof Error ? err.name : undefined;
	console.error(`[${scope}]`, { ...ctx, name, message });
}

/**
 * PII-bezpieczny wyciąg metadanych walidacji z błędu walidacji schematu.
 *
 * Kontekst: `generateObject` (AI SDK) przy niezgodności rzuca AI_NoObjectGeneratedError.
 * Wewnątrz, pod `err.cause` (AI_TypeValidationError) → `err.cause.cause` (ZodError),
 * siedzi lista `issues` — KTÓRE pole i jaką regułę model złamał. Bez tego log mówi
 * tylko „response did not match schema" i nie wiadomo, co naprawić.
 *
 * RODO/PII (twardo): zwracamy WYŁĄCZNIE metadane reguły — `path` (ścieżka pola,
 * np. ["careerPaths",0,"why"]), `code` (kod reguły Zod, np. "too_small") i
 * `message` (komunikat reguły, np. "Too small: expected string to have >=1
 * characters"). Zweryfikowano empirycznie (Zod 4.3): te trzy pola NIGDY nie
 * niosą wartości treści studenta — komunikat opisuje regułę, nie dane. Surowego
 * outputu modelu (`err.text`, zawiera dane osobowe z rozmowy o karierze) NIE
 * dotykamy tu w ogóle. Maksymalnie kilka issues, żeby nie zalać logu.
 */
type ZodIssueMeta = { path: string; code: string; message: string };

export function extractValidationIssues(err: unknown, maxIssues = 8): ZodIssueMeta[] {
	// Szukamy listy `issues` schodząc po łańcuchu `cause` (AI SDK zagnieżdża 1–2
	// poziomy: NoObjectGenerated → TypeValidation → ZodError). Defensywnie przeglądamy
	// kilka poziomów, bo dokładna głębokość zależy od wersji SDK.
	let node: unknown = err;
	for (let depth = 0; depth < 5 && node; depth++) {
		const issues = (node as { issues?: unknown }).issues;
		if (Array.isArray(issues)) {
			return issues.slice(0, maxIssues).map((i) => {
				const issue = i as { path?: unknown; code?: unknown; message?: unknown };
				const path = Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path ?? "");
				return {
					path,
					code: typeof issue.code === "string" ? issue.code : String(issue.code ?? "unknown"),
					message: typeof issue.message === "string" ? issue.message : "",
				};
			});
		}
		node = (node as { cause?: unknown }).cause;
	}
	return [];
}
