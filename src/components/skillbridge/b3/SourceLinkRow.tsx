/**
 * SourceLinkRow — jeden wiersz „Źródła wiedzy" (learningResource) w B3.
 *
 * Render: typ-pill (video/docs/course) + tytuł jako link + host + ikona external.
 * Link otwiera w nowej karcie (spec §2.4: zawsze klikalny, nowa karta; nie weryfikujemy
 * czy URL żyje — degradacja świadomie OUT Bety).
 *
 * Bezpieczeństwo linku: target=_blank + rel=noopener noreferrer (spójne z TheoryMarkdown
 * i istniejącym proj-source-link). URL przychodzi z DB (CHECK type, backend), renderowany
 * jak podany — bez health-check (spec §2.4).
 *
 * A11y: link ma dostępny tekst (tytuł), nie samą ikonę; host i ikona aria-hidden
 * (dekoracyjne, nie dublują treści); pill jako tekst z aria-label opisującym typ.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §2.1 / §2.7.3 (sekcja 13 hi-fi)
 */

import { BookOpen, ExternalLink, GraduationCap, PlayCircle } from "lucide-react";
import type { ComponentType } from "react";

export type LearningResourceType = "video" | "docs" | "course";

export interface LearningResource {
	title: string;
	url: string;
	// Kolumna DB to text + CHECK ('video'|'docs'|'course') — backend gwarantuje wartość,
	// ale typ Drizzle to `string`. Akceptujemy string (bez castu na granicy); typ spoza
	// listy degraduje do „Materiał" w TYPE_META (backend CHECK to wyłapuje wcześniej).
	type: string;
}

// Mapowanie typu → ikona + polska etykieta. Typ spoza listy (gdyby backend rozszerzył
// CHECK przed frontem) degraduje do „materiał" + ikona docs — nie crashuje.
type TypeMeta = { label: string; Icon: ComponentType<{ className?: string }> };

const TYPE_META: Record<LearningResourceType, TypeMeta> = {
	video: { label: "Wideo", Icon: PlayCircle },
	docs: { label: "Dokumentacja", Icon: BookOpen },
	course: { label: "Kurs", Icon: GraduationCap },
};

const FALLBACK_META: TypeMeta = { label: "Materiał", Icon: BookOpen };

/** Host z URL do pokazania pod tytułem (np. „postgresql.org"). Bez crasha na złym URL. */
function hostFromUrl(url: string): string | null {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return null;
	}
}

interface SourceLinkRowProps {
	resource: LearningResource;
}

export function SourceLinkRow({ resource }: SourceLinkRowProps) {
	const meta = (TYPE_META as Record<string, TypeMeta>)[resource.type] ?? FALLBACK_META;
	const { Icon } = meta;
	const host = hostFromUrl(resource.url);

	return (
		<a
			href={resource.url}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
		>
			{/* Typ-pill: ikona (dekoracyjna) + widoczna etykieta (czytana przez screenreader
			    naturalnie jako tekst — nie potrzeba aria-label, byłby redundantny). */}
			<span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
				<Icon className="h-3.5 w-3.5" />
				{meta.label}
			</span>

			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-medium text-foreground">{resource.title}</span>
				{host && <span className="block truncate text-xs text-muted-foreground">{host}</span>}
			</span>

			<ExternalLink
				className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
				aria-hidden="true"
			/>
		</a>
	);
}
