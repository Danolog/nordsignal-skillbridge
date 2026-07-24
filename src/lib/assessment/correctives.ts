// ============================================================================
// 1E.3 (ADR-014 D3) — P4 correctives: budowa paczki remediacji po OBLANYM
// egzaminie z wyczerpanym cap 2 (M13/M14). CZYSTE funkcje, 0 LLM, 0 DB — jak
// silnik egzaminu (exam.ts). Odczyt banku koncept→atom robi warstwa serwisowa
// (exam-service.ts, owner-side); tu wyłącznie składanie i mikrocopy.
//
// KONTRAKT (SPEC ADR-014 D3):
//  - wejście: `failedConcepts` z gradeExam (koncepty BŁĘDNYCH pytań, distinct) +
//    surowe wiersze koncept↔atom z curriculum_item_concepts,
//  - dla każdego konceptu: ≤3 atomy uczące (theory/exercise), zdeduplikowane,
//  - mikrocopy o KONCEPTACH do odświeżenia (nie lista braków): „zabrakło Ci N
//    pytań — M konceptów do odświeżenia, ~15 min".
//
// R2 (plan 1E.3): koncept bez atomu-źródła NIE wywala paczki — degradacja do
// wpisu z pustą listą atomów (P5 pokaże sam komunikat). Paczka zawsze wymienia
// WSZYSTKIE failedConcepts w kolejności wejścia (stabilność dla UI i testów).
// ============================================================================

/** Twardy limit atomów remediacji per koncept (SPEC: „≤3 atomy per błędne pytanie"). */
export const CORRECTIVES_MAX_ATOMS_PER_CONCEPT = 3;

/** Szacowany czas paczki w mikrocopy (ADR-014 D3 — wartość stała, nie skalowana). */
export const CORRECTIVES_ESTIMATE = "~15 min";

/** Rodzaje pozycji curriculum liczone jako atom powtórkowy (wskazywany w correctives). */
export const CORRECTIVES_ATOM_KINDS = ["theory", "exercise"] as const;

/** Jeden atom powtórkowy wskazany studentowi (payload dla P5 — bez treści atomu). */
export interface CorrectivesAtom {
	/** Stabilny slug pozycji curriculum (adres atomu w module). */
	slug: string;
	title: string;
	/** theory | exercise (CORRECTIVES_ATOM_KINDS). */
	kind: string;
	/** Slug modułu, w którym żyje atom — kontekst nawigacji (null = osierocony). */
	moduleSlug: string | null;
}

/** Jeden koncept do odświeżenia + jego atomy (≤3). */
export interface CorrectivesConcept {
	/** Slug konceptu błędnego pytania (question_concepts.slug). */
	concept: string;
	/** Nazwa czytelna dla studenta (question_concepts.name); null gdy nieznana. */
	conceptName: string | null;
	/** Atomy uczące konceptu — po dedup i przycięciu do ≤3. Może być puste (R2). */
	atoms: CorrectivesAtom[];
}

/** Paczka correctives w kształcie do result_json / odpowiedzi API (konsument = P5). */
export interface CorrectivesPackage {
	/** Mikrocopy o konceptach do odświeżenia (nie lista braków). */
	message: string;
	/** Koncepty do odświeżenia — WSZYSTKIE failedConcepts, w kolejności wejścia. */
	concepts: CorrectivesConcept[];
}

/**
 * Surowy wiersz koncept↔atom z warstwy serwisowej (LEFT JOIN: koncept bez atomu
 * przychodzi z `atom* = null`, żeby R2 — koncept bez źródła — nie znikał). Pola
 * atomu są nullable łącznie: albo komplet, albo brak.
 */
export interface CorrectivesAtomRow {
	conceptSlug: string;
	conceptName: string;
	atomSlug: string | null;
	atomTitle: string | null;
	atomKind: string | null;
	moduleSlug: string | null;
}

/**
 * Odmiana „pytań" po czasowniku „zabrakło" (rząd dopełniaczowy):
 *  - 1 → „1 pytania" (dopełniacz l. poj.: „zabrakło Ci 1 pytania"),
 *  - reszta (0, ≥2) → „N pytań" (dopełniacz l. mn.: „zabrakło Ci 2 pytań").
 * Uwaga: to NIE mianownik („2 pytania") — „zabrakło" wymusza dopełniacz.
 */
function pytaniaPoZabraklo(n: number): string {
	return n === 1 ? `${n} pytania` : `${n} pytań`;
}

/**
 * Odmiana „koncept" w policzalnej frazie mianownikowej („M konceptów do
 * odświeżenia"): 1 → „koncept", 2–4 (poza 12–14) → „koncepty", reszta →
 * „konceptów". Standardowa polska liczebność, inny wzorzec niż „pytań" wyżej.
 */
function konceptyForm(n: number): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (n === 1) return `${n} koncept`;
	if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${n} koncepty`;
	return `${n} konceptów`;
}

/**
 * Mikrocopy correctives — komunikat o KONCEPTACH do odświeżenia (SPEC: nie lista
 * braków). Czysta funkcja: `errorCount` = N (ile pytań zabrakło), `conceptCount`
 * = M (ile konceptów odświeżyć = liczba distinct konceptów błędnych pytań).
 * Wielka litera na starcie — to pełne zdanie w UI (brand voice §3), treść i
 * format (N/M/~15 min) zgodne z ADR-014 D3.
 */
export function buildCorrectivesMessage(errorCount: number, conceptCount: number): string {
	return `Zabrakło Ci ${pytaniaPoZabraklo(errorCount)} — ${konceptyForm(conceptCount)} do odświeżenia, ${CORRECTIVES_ESTIMATE}`;
}

/**
 * assembleCorrectives — złożenie paczki z failedConcepts + wierszy koncept↔atom.
 *
 * Reguły (SPEC):
 *  - kolejność konceptów = kolejność `failedConcepts` (stabilna dla UI/testów),
 *  - per koncept: dedup atomów po slugu, przycięcie do ≤3
 *    (CORRECTIVES_MAX_ATOMS_PER_CONCEPT),
 *  - koncept bez atomów zostaje w paczce z pustą listą (R2 — degradacja, nie
 *    wywrotka),
 *  - wiersze konceptu spoza `failedConcepts` są ignorowane (defensywnie).
 *
 * Zakłada wejściowe wiersze POSORTOWANE po (koncept, moduł, pozycja atomu) —
 * przycięcie „pierwsze 3" jest wtedy deterministyczne. Sortowanie robi serwis.
 */
export function assembleCorrectives(
	failedConcepts: readonly string[],
	errorCount: number,
	rows: readonly CorrectivesAtomRow[],
): CorrectivesPackage {
	const byConcept = new Map<string, CorrectivesConcept>();
	for (const slug of failedConcepts) {
		if (!byConcept.has(slug)) {
			byConcept.set(slug, { concept: slug, conceptName: null, atoms: [] });
		}
	}
	const seenAtoms = new Map<string, Set<string>>();
	for (const row of rows) {
		const entry = byConcept.get(row.conceptSlug);
		if (!entry) continue; // koncept spoza failedConcepts — ignoruj
		if (entry.conceptName === null && row.conceptName) {
			entry.conceptName = row.conceptName;
		}
		// Wiersz „koncept bez atomu" (LEFT JOIN) — niesie tylko nazwę konceptu.
		if (!row.atomSlug || !row.atomTitle || !row.atomKind) continue;
		let seen = seenAtoms.get(row.conceptSlug);
		if (!seen) {
			seen = new Set<string>();
			seenAtoms.set(row.conceptSlug, seen);
		}
		if (seen.has(row.atomSlug)) continue; // dedup atomu po slugu
		if (entry.atoms.length >= CORRECTIVES_MAX_ATOMS_PER_CONCEPT) continue; // przycięcie ≤3
		seen.add(row.atomSlug);
		entry.atoms.push({
			slug: row.atomSlug,
			title: row.atomTitle,
			kind: row.atomKind,
			moduleSlug: row.moduleSlug,
		});
	}
	return {
		message: buildCorrectivesMessage(errorCount, failedConcepts.length),
		// Kolejność wejścia; wpis istnieje dla każdego failedConcept (także pusty).
		concepts: failedConcepts.map((slug) => byConcept.get(slug) as CorrectivesConcept),
	};
}
