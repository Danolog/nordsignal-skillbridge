// ============================================================================
// 1E.3 · P5 — routing atomów correctives (Mila 7.4 BLOKER + 7.3 fallback nazwy).
//
// Problem kontraktu: `CorrectivesAtom` niesie WYŁĄCZNIE slugi ({slug, moduleSlug}),
// a trasy modułu/pozycji `/curriculum/[moduleId]/[itemId]` wymagają UUID (guard
// `isUuid`). Naiwny link `/curriculum/${moduleSlug}/${slug}` zawsze → 404.
//
// Rozwiązanie (rekomendacja Mili, potwierdzone jako warstwa techniczna przez
// Sophię §6): linkujemy do CIENKIEJ trasy-resolvera `/curriculum/atom/
// [moduleSlug]/[itemSlug]`, która po stronie serwera rozwiązuje slug→UUID i
// robi redirect na istniejącą trasę UUID — ZERO zmian w zamrożonym kontrakcie
// P1–P4 i w guardach `isUuid`. Nie zmieniam kontraktu backendu (paczka slugów).
//
// Trzeci stan (Mila 7.2, głębiej niż brief): atom „osierocony" (moduleSlug=null)
// NIE da się zalinkować — resolveAtomHref zwraca null → render bez linku.
// Czysta funkcja (testowalna bez DOM) — kontrakt propsu CorrectivesPanel.
// ============================================================================

import type { CorrectivesAtom } from "@/lib/assessment/correctives";

/** Prefiks trasy-resolvera (slug→UUID→redirect). Jedno miejsce nazwy. */
export const ATOM_RESOLVER_BASE = "/curriculum/atom";

/**
 * Adres atomu correctives przez trasę-resolver — lub `null`, gdy atom jest
 * osierocony (`moduleSlug === null`) i nie da się zbudować kontekstu nawigacji.
 * `null` → wiersz atomu renderuje się bez linku (uczciwy tekst, zero martwego
 * linku). Enkodujemy segmenty: slug jest ustalany po stronie treści, ale
 * enkodowanie broni przed znakami specjalnymi w adresie.
 */
export function resolveAtomHref(atom: CorrectivesAtom): string | null {
	if (atom.moduleSlug === null) return null;
	return `${ATOM_RESOLVER_BASE}/${encodeURIComponent(atom.moduleSlug)}/${encodeURIComponent(atom.slug)}`;
}

/**
 * Humanizacja slug-a konceptu na potrzeby nagłówka karty, gdy `conceptName`
 * jest `null` (Mila 7.3 + CLAUDE.md §3 „żargon zawsze tłumaczony" — dotyczy też
 * stringów UI): `fstring-formatting` → „Fstring formatting". Nigdy nie pokazuj
 * gołego slug-a z myślnikami/podkreśleniami studentowi.
 */
export function humanizeConceptSlug(slug: string): string {
	const words = slug.replace(/[-_]+/g, " ").trim();
	if (words.length === 0) return slug;
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Etykieta rodzaju atomu w wierszu correctives (spójna z labels.itemKindLabel). */
export function atomKindLabel(kind: string): string {
	switch (kind) {
		case "theory":
			return "Teoria";
		case "exercise":
			return "Ćwiczenie";
		case "lab":
			return "Lab";
		default:
			return kind;
	}
}
