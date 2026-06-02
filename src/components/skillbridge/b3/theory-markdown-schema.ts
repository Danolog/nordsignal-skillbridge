/**
 * THEORY_MARKDOWN_SCHEMA — pozytywna allowlista sanityzacji dla `TheoryMarkdown` (B3).
 *
 * Jedno źródło prawdy renderowanej allowlisty markdown teorii. Spójne z tabelą
 * spec §2.7.1 (Mila) i ratyfikowane przez ADR-006 (Ethan, decyzja biblioteki).
 *
 * Granica XSS: `theory_md` jest częściowo generowany modelem językowym (Sophia, T4
 * katalogu — PRD §5), więc treść to powierzchnia ataku. Sanityzacja przy renderze =
 * ostatnia bramka przed przeglądarką (defense-in-depth, ADR-006 §Why this variant).
 *
 * Warstwy egzekucji (ADR-006):
 *   1. brak rehype-raw w pipeline    → surowy HTML nigdy nie wchodzi do drzewa hast
 *   2. ten schemat (pozytywna lista) → tagi spoza §2.7.1 + niebezpieczne atrybuty (on*, style)
 *   3. protocols.href                → javascript:/data: URL w linkach prozy odcięte
 *
 * Allowlista WG SPEC §2.7.1 (dozwolone / odrzucone):
 *   blokowe dozwolone : p, ul/ol/li, h3, pre>code
 *   inline dozwolone  : code, a, strong, em (+ br dla twardych łamań linii)
 *   ODRZUCONE (drop)  : h1/h2/h4-h6, blockquote, table*, img, hr — spoza tagNames
 *   surowy HTML       : nie wchodzi w ogóle (brak rehype-raw, warstwa 1)
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §2.5 / §2.7.1 / §2.7.3
 * ADR: docs/decisions/006-theory-markdown-sanitization.md
 */

import { defaultSchema } from "rehype-sanitize";

export const THEORY_MARKDOWN_SCHEMA = {
	...defaultSchema,
	// Pozytywna allowlista tagów = dokładnie tabela §2.7.1 (+ br dla łamań linii).
	// h1/h2/h4-h6, blockquote, img, table*, hr, del, input — NIEobecne → drop.
	tagNames: ["p", "ul", "ol", "li", "h3", "pre", "code", "a", "strong", "em", "br"],
	attributes: {
		// target/rel dokładamy w components mapie (TheoryMarkdown), NIE z treści —
		// żeby zatruta treść nie mogła nadpisać rel/target.
		a: ["href"],
		// language-* dla bloków kodu (highlight w przyszłości); reszta odcięta.
		code: ["className"],
	},
	// Protokoły linków — tylko bezpieczne. [x](javascript:alert(1)) → href odcięty.
	protocols: { href: ["http", "https", "mailto"] },
	// Brak kolizji id/name wstrzykniętych przez treść z resztą DOM.
	clobberPrefix: "theory-",
};
