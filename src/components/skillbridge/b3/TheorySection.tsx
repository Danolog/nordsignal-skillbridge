/**
 * TheorySection — blok B3 „Wiedza teoretyczna" + „Źródła wiedzy" na detalu projektu.
 *
 * Składa TheoryMarkdown (teoria) + listę SourceLinkRow (źródła) z logiką pominięć
 * stanów spec §2.4:
 *   S4 empty_theory  : theoryMd === null → blok teorii pominięty W CAŁOŚCI (nie pusty
 *                      stan z ikoną — brak teorii to nie błąd, ale i nie treść).
 *                      UWAGA: "" ≠ null (pusty string to treść pusta, nie S4 — renderuje
 *                      się jako pusty TheoryMarkdown; kontrakt Ethana).
 *   S5 empty_sources : learningResources == [] → blok źródeł pominięty.
 *   S6 empty_both    : oba puste → cała sekcja pominięta (zwraca null).
 *
 * Kolejność pionowa (spec §2: sekcja 86): (1) „Wiedza teoretyczna" → (2) „Źródła wiedzy".
 *
 * Nagłówki sekcji to H2 (spójne z innymi sekcjami detalu — „Wymagane kompetencje").
 * H3 wewnątrz teorii (TheoryMarkdown) NIE łamie hierarchii (H1 tytuł → H2 sekcja → H3 śród).
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §2.4 / §2.7
 */

import type { LearningResource } from "./SourceLinkRow";
import { SourceLinkRow } from "./SourceLinkRow";
import { TheoryMarkdown } from "./TheoryMarkdown";

interface TheorySectionProps {
	/** Markdown teorii. null = S4 empty_theory (blok pominięty). "" = treść pusta (≠ null). */
	theoryMd: string | null;
	/** Materiały — już posortowane po position (backend). [] = S5 empty_sources. */
	learningResources: LearningResource[];
}

export function TheorySection({ theoryMd, learningResources }: TheorySectionProps) {
	const hasTheory = theoryMd !== null; // "" jest treścią pustą, nie S4
	const hasSources = learningResources.length > 0;

	// S6 empty_both — cała sekcja pominięta.
	if (!hasTheory && !hasSources) return null;

	return (
		<>
			{hasTheory && (
				<section className="proj-detail-section" aria-labelledby="b3-theory-heading">
					<h2 id="b3-theory-heading" className="proj-detail-section-title">
						Wiedza teoretyczna
					</h2>
					{/* theoryMd !== null tu zagwarantowane przez hasTheory */}
					<TheoryMarkdown source={theoryMd as string} />
				</section>
			)}

			{hasSources && (
				<section className="proj-detail-section" aria-labelledby="b3-sources-heading">
					<h2 id="b3-sources-heading" className="proj-detail-section-title">
						Źródła wiedzy
					</h2>
					<ul className="flex list-none flex-col gap-2 p-0">
						{learningResources.map((r) => (
							// Backend już posortował po position; key z url+title (stabilne, brak id w kontrakcie).
							<li key={`${r.url}::${r.title}`}>
								<SourceLinkRow resource={r} />
							</li>
						))}
					</ul>
				</section>
			)}
		</>
	);
}
