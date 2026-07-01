/**
 * Formatery paszportu — czysty moduł (bez "use client"), używalny i po stronie serwera
 * (prerender /passport/demo, /passport/[id]) i klienta.
 */

/** Skraca URL repozytorium GitHub do „github.com/owner/repo". */
export function shortenRepoUrl(url: string): string {
	const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/i);
	if (!match) return url;
	return `github.com/${match[1].replace(/\.git$/, "")}`;
}
