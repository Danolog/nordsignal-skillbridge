/**
 * TheoryMarkdown — scentralizowany renderer `projects.theory_md` (markdown teorii B3).
 *
 * Czysto prezentacyjny (brak własnego stanu; loading/error obsługuje warstwa wyżej,
 * spec §2.4). Jedno audytowalne miejsce allowlisty + sanityzacji (spec §2.7.3) — reuse
 * w Fazie 2 (paszport publiczny / panel wykładowcy) bez rozlewania allowlisty.
 *
 * Bezpieczeństwo (ADR-006, granica XSS — treść częściowo generowana LLM):
 *   - BEZ rehype-raw  → surowy HTML nie wchodzi do drzewa jako elementy
 *   - BEZ remark-gfm  → brak tabel i autolinków (tabele OUT v0.2; linki muszą być jawne)
 *   - rehype-sanitize + THEORY_MARKDOWN_SCHEMA → pozytywna allowlista §2.7.1
 *   - linki: target=_blank + rel=noopener noreferrer (wymuszane TU, nie z treści)
 *   - protokoły href ograniczone do http/https/mailto (javascript:/data: odcięte w schemacie)
 *
 * Typografia per element — tokeny spec §2.7.2 (font-mono = fallback stack do fundamentu
 * v0.1.2, nota Mili; dług fundamentu, nie tego komponentu).
 *
 * A11y (spec §2.7.3): struktura semantyczna (h3/p/ul/code); blok kodu focusowalny
 * (tabIndex 0) — skroll poziomy sterowalny klawiaturą przy nadmiarze.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §2.7
 * ADR: docs/decisions/006-theory-markdown-sanitization.md
 */

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { THEORY_MARKDOWN_SCHEMA } from "./theory-markdown-schema";

// Fallback monospace stack — fundament v0.1.1 nie definiuje rodziny mono
// (spec §2.7.2 nota / ADR-006 gotcha 2). To fallback, nie wybór designera —
// do zamknięcia w fundament v0.1.2 (dług Mili).
const MONO_FONT_FALLBACK =
	'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

interface TheoryMarkdownProps {
	/** Surowy markdown z `theoryMd` (response detalu projektu). */
	source: string;
}

export function TheoryMarkdown({ source }: TheoryMarkdownProps) {
	return (
		<div className="text-sm leading-relaxed text-foreground">
			<ReactMarkdown
				// Pojedyncza warstwa sanityzacji na drzewie hast. Brak rehypeRaw i remarkGfm
				// jest CELOWY (ADR-006) — nie dodawać bez nowej decyzji stacku.
				rehypePlugins={[[rehypeSanitize, THEORY_MARKDOWN_SCHEMA]]}
				components={{
					// Akapit — §2.7.2: text-base / leading-relaxed, margin-block.
					p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
					// H3 — §2.7.2: text-lg / semibold; jedyny dozwolony nagłówek (H1/H2 kolidują
					// z PageHeader/sekcjami ekranu, §2.7.1). Nie łamie hierarchii strony.
					h3: ({ children }) => (
						<h3 className="mt-5 mb-2 text-base font-semibold text-foreground first:mt-0">
							{children}
						</h3>
					),
					// Listy — §2.7.2: gap, padding-left.
					ul: ({ children }) => (
						<ul className="my-3 list-disc space-y-2 pl-5 marker:text-muted-foreground">
							{children}
						</ul>
					),
					ol: ({ children }) => (
						<ol className="my-3 list-decimal space-y-2 pl-5 marker:text-muted-foreground">
							{children}
						</ol>
					),
					li: ({ children }) => <li className="pl-1">{children}</li>,
					// Emfaza — §2.7.2.
					strong: ({ children }) => (
						<strong className="font-semibold text-foreground">{children}</strong>
					),
					em: ({ children }) => <em className="italic">{children}</em>,
					// Link w prozie — bezpieczeństwo wymuszane TU (nie z treści):
					// target=_blank + rel=noopener noreferrer (spec §2.7.3, jak SourceLinkRow).
					// Protokół href już odcięty w schemacie (http/https/mailto).
					a: ({ href, children }) => (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-emerald-700 underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 rounded-sm"
						>
							{children}
						</a>
					),
					// Inline code vs blok kodu — react-markdown przekazuje inline przez
					// brak/obecność rodzica <pre>. Bloki obsługuje `pre` (niżej); tu stylujemy
					// inline `<code>`. §2.7.2: font-mono / text-sm, tło surface-raised.
					code: ({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) => (
						<code
							className={[
								"rounded-sm bg-muted px-1.5 py-0.5 text-[0.85em] text-foreground",
								className ?? "",
							]
								.filter(Boolean)
								.join(" ")}
							style={{ fontFamily: MONO_FONT_FALLBACK }}
							{...rest}
						>
							{children}
						</code>
					),
					// Blok kodu — §2.7.3: overflow-x auto (skroll poziomy, NIE zawijanie);
					// focusowalny (tabIndex 0) by skroll był sterowalny klawiaturą (a11y).
					// §2.7.2: padding-4, radius-md, margin-block, tło surface-raised.
					pre: ({ children }) => (
						<pre
							// biome-ignore lint/a11y/noNoninteractiveTabindex: spec §2.7.3 wymaga focusowalnego <pre> (tabIndex 0), by skroll poziomy bloku kodu (overflow-x:auto) był sterowalny klawiaturą — celowa akomodacja WCAG, nie błąd.
							tabIndex={0}
							className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm leading-snug text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 [&>code]:bg-transparent [&>code]:p-0"
							style={{ fontFamily: MONO_FONT_FALLBACK }}
						>
							{children}
						</pre>
					),
				}}
			>
				{source}
			</ReactMarkdown>
		</div>
	);
}
