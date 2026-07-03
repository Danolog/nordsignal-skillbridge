/**
 * Prepare untrusted user input for inclusion in an LLM prompt.
 *
 * Strips control characters (which can confuse delimiter parsing or smuggle
 * instructions across lines), removes Unicode obfuscation/bidi tricks, neutralizes
 * attempts to forge the `<user_input>` delimiter, collapses to a length cap, and
 * trims whitespace. Always wrap the result in an explicit `<user_input untrusted="true">`
 * block in the prompt and instruct the model to ignore instructions inside.
 *
 * 0.6 (injection, MEDIUM) — utwardzenie ponad sam strip C0/DEL:
 *  - C1 controls (0x80–0x9f) → spacja (niedrukowalne, interpretowane przez część parserów);
 *  - separatory linii/akapitu U+2028/U+2029 → spacja ("nowe linie" spoza C0, omijały strip);
 *  - zero-width / word-joiner / BOM (U+200B–200D, U+2060, U+FEFF) → usuwane (smuggling,
 *    obfuskacja tokenów) — usuwane PRZED neutralizacją delimitera, więc np. `user_<ZWSP>input`
 *    nie omija podmiany;
 *  - bidi embedding/override/isolate (Trojan Source) → usuwane;
 *  - breakout delimitera: `<user_input>`/`</user_input>` jest jednolitym opakowaniem w całym
 *    kodzie (jeden choke-point), więc token `user_input` w niezaufanych danych jest rozspajany
 *    ("user input") — dane nie mogą zamknąć bloku i przemycić instrukcji na zewnątrz.
 */
export function sanitizeForPrompt(input: string | null | undefined, maxLen = 2000): string {
	if (!input) return "";
	let out = "";
	for (const ch of input) {
		const code = ch.codePointAt(0) ?? 0;
		// C0 controls + DEL, oraz C1 controls → spacja (zachowuje granice słów).
		if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
			out += " ";
			continue;
		}
		// Separatory linii/akapitu Unicode → spacja.
		if (code === 0x2028 || code === 0x2029) {
			out += " ";
			continue;
		}
		// Zero-width, word-joiner, BOM → usuwane bez śladu.
		if (
			code === 0x200b ||
			code === 0x200c ||
			code === 0x200d ||
			code === 0x2060 ||
			code === 0xfeff
		) {
			continue;
		}
		// Bidi embedding/override (U+202A–202E) + isolate (U+2066–2069) → usuwane.
		if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) {
			continue;
		}
		out += ch;
	}
	// Neutralizacja breakoutu delimitera (po usunięciu zero-width, więc obfuskacja nie omija).
	out = out.replace(/user_input/gi, "user input");
	return out.slice(0, maxLen).trim();
}

const ALLOWED_REPO_HOSTS = new Set(["github.com"]);
const ALLOWED_NOTEBOOK_HOSTS = new Set([
	"colab.research.google.com",
	"www.kaggle.com",
	"kaggle.com",
	"github.com",
	"nbviewer.org",
	"nbviewer.jupyter.org",
]);

export type ParsedUrl = { url: URL; raw: string };

export function parseAllowedUrl(
	raw: string | null | undefined,
	allowed: Set<string>,
): ParsedUrl | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "https:") return null;
	if (!allowed.has(url.hostname)) return null;
	return { url, raw };
}

export function parseRepoUrl(raw: string | null | undefined): ParsedUrl | null {
	return parseAllowedUrl(raw, ALLOWED_REPO_HOSTS);
}

export function parseNotebookUrl(raw: string | null | undefined): ParsedUrl | null {
	return parseAllowedUrl(raw, ALLOWED_NOTEBOOK_HOSTS);
}
