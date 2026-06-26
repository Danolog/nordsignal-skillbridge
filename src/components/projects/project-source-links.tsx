/**
 * ProjectSourceLinks — lista 2–3 linków do materiału źródłowego projektu (#7).
 *
 * Po co: dotąd projekt miał JEDEN link („Źródło danych"). Gdy padł, student nie miał
 * alternatywy. Teraz pokazujemy listę linków posortowaną po `position` (backend) —
 * padnie jeden, student kończy z kolejnego.
 *
 * Fallback wizualny: link oznaczony `isDead` renderuje się przekreślony i wyszarzony,
 * z dopiskiem „(martwy)" i podpowiedzią, żeby skorzystać z innego. Pozostaje klikalny
 * (świadoma decyzja: czasem martwy link działa przez archive.org), ale wizualnie
 * zdegradowany, żeby kierować uwagę na działające źródła.
 *
 * Bezpieczeństwo: target=_blank + rel=noopener noreferrer (spójne z proj-source-link
 * i SourceLinkRow). URL z DB renderowany jak podany — bez health-checku.
 *
 * A11y: każdy link ma dostępny tekst (etykieta albo host); ikona dekoracyjna aria-hidden;
 * martwy link niesie aria-label z informacją „martwy link" (nie tylko przekreślenie).
 */

import { ExternalLink } from "lucide-react";

export interface ProjectSourceLink {
	url: string;
	/** Etykieta dla człowieka; null = pokaż host z URL. */
	label: string | null;
	/** Link oznaczony jako martwy — fallback wizualny. */
	isDead: boolean;
}

/** Host z URL do pokazania, gdy brak etykiety (np. „kaggle.com"). Bez crasha na złym URL. */
function hostFromUrl(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

interface ProjectSourceLinksProps {
	links: ProjectSourceLink[];
}

export function ProjectSourceLinks({ links }: ProjectSourceLinksProps) {
	if (links.length === 0) return null;

	// Czy jest choć jedno żywe źródło — decyduje, czy pokazać podpowiedź przy martwym.
	const hasAlive = links.some((l) => !l.isDead);

	return (
		<ul className="proj-source-links" aria-label="Źródła danych">
			{links.map((link) => {
				const text = link.label ?? hostFromUrl(link.url);
				return (
					<li key={link.url}>
						{link.isDead ? (
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="proj-source-link proj-source-link-dead"
								aria-label={`${text} — martwy link${hasAlive ? ", skorzystaj z innego źródła" : ""}`}
							>
								<ExternalLink size={14} aria-hidden="true" />
								<span className="proj-source-link-text">{text}</span>
								<span className="proj-source-link-dead-tag">(martwy)</span>
							</a>
						) : (
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="proj-source-link"
							>
								<ExternalLink size={14} aria-hidden="true" />
								<span className="proj-source-link-text">{text}</span>
							</a>
						)}
					</li>
				);
			})}
		</ul>
	);
}
