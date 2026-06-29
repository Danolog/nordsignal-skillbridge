/**
 * Deterministyczne filtrowanie i sklejanie treści repo (krok 1, bez AI).
 *
 * Czyste funkcje — łatwe do testów jednostkowych (mock GitHub API w step1).
 * Reguły wprost z designu §2 (filtrowanie, białą listą, limity).
 */

import type { TreeEntry } from "@/lib/ai/pipeline/github";

/** Katalogi-śmieci ignorowane w całości (po dowolnym segmencie ścieżki). */
const IGNORED_DIRS = new Set([
	"node_modules",
	".venv",
	"venv",
	".git",
	"dist",
	"build",
	"__pycache__",
	".next",
	"vendor",
	"target",
	".idea",
	".vscode",
	"coverage",
]);

/** Rozszerzenia binariów/mediów — ignorowane (PDF traktowany osobno w kroku 2). */
const BINARY_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"svg",
	"webp",
	"ico",
	"bmp",
	"zip",
	"tar",
	"gz",
	"rar",
	"7z",
	"exe",
	"dll",
	"so",
	"dylib",
	"bin",
	"woff",
	"woff2",
	"ttf",
	"otf",
	"eot",
	"pdf",
	"mp4",
	"mp3",
	"mov",
	"avi",
	"jar",
	"class",
	"pyc",
	"lock",
]);

/** Białą listą — rozszerzenia kodu i tekstu istotne dla oceny. */
const ALLOWED_EXTENSIONS = new Set([
	"py",
	"js",
	"jsx",
	"ts",
	"tsx",
	"sql",
	"sh",
	"ps1",
	"md",
	"txt",
	"json",
	"yaml",
	"yml",
	"conf",
	"ini",
	"toml",
	"csv",
	"ipynb",
	"java",
	"go",
	"rb",
	"php",
	"c",
	"cpp",
	"h",
	"rs",
	"spl",
]);

/** Pliki bez rozszerzenia, które i tak bierzemy (nazwa pełna, lowercase). */
const ALLOWED_NAMES = new Set([
	"dockerfile",
	"makefile",
	"requirements.txt",
	"package.json",
	"readme",
]);

/** Limity (§2). */
export const LIMITS = {
	/** Maks. rozmiar pojedynczego pliku pobieranego treściowo (bajty). */
	maxFileBytes: 256 * 1024,
	/** Maks. liczba plików pobieranych treściowo (osłona kosztu/czasu). */
	maxFiles: 40,
	/** Twardy budżet znaków całego sklejonego pakietu. */
	maxPackageChars: 120_000,
} as const;

function extensionOf(path: string): string {
	const base = path.split("/").pop() ?? "";
	const dot = base.lastIndexOf(".");
	if (dot <= 0) return "";
	return base.slice(dot + 1).toLowerCase();
}

function baseName(path: string): string {
	return (path.split("/").pop() ?? "").toLowerCase();
}

/** Czy ścieżka leży w katalogu-śmieciu. */
export function isInIgnoredDir(path: string): boolean {
	return path.split("/").some((seg) => IGNORED_DIRS.has(seg));
}

export function isReadme(path: string): boolean {
	return baseName(path) === "readme.md";
}

/**
 * Czy plik (wpis drzewa) jest kandydatem do pobrania treściowego:
 * blob, nie w katalogu-śmieciu, rozszerzenie z białej listy (albo nazwa
 * specjalna), nie binarka, w limicie rozmiaru.
 */
export function isCandidateFile(entry: TreeEntry): boolean {
	if (entry.type !== "blob") return false;
	if (isInIgnoredDir(entry.path)) return false;
	if (typeof entry.size === "number" && entry.size > LIMITS.maxFileBytes) return false;

	const ext = extensionOf(entry.path);
	if (ext && BINARY_EXTENSIONS.has(ext)) return false;

	const name = baseName(entry.path);
	if (ALLOWED_NAMES.has(name)) return true;
	if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;
	return false;
}

/**
 * Priorytet pobierania przy przekroczeniu budżetu (§2):
 *   0 — README (zawsze pierwszy),
 *   1 — pliki wejściowe (main.*, index.*, app.*),
 *   2 — reszta wg rosnącego rozmiaru.
 */
export function fetchPriority(entry: TreeEntry): number {
	if (isReadme(entry.path)) return 0;
	const name = baseName(entry.path);
	if (/^(main|index|app)\.[a-z0-9]+$/.test(name)) return 1;
	return 2;
}

/** Sortuje kandydatów wg priorytetu, potem rosnącego rozmiaru. */
export function orderCandidates(entries: TreeEntry[]): TreeEntry[] {
	return [...entries].sort((a, b) => {
		const pa = fetchPriority(a);
		const pb = fetchPriority(b);
		if (pa !== pb) return pa - pb;
		return (a.size ?? 0) - (b.size ?? 0);
	});
}

/** Obcina treść pojedynczego pliku do limitu bajtów (z dopiskiem). */
export function truncateFileContent(content: string): { content: string; truncated: boolean } {
	if (content.length <= LIMITS.maxFileBytes) return { content, truncated: false };
	return {
		content: `${content.slice(0, LIMITS.maxFileBytes)}\n[obcięto — plik przekroczył limit rozmiaru]`,
		truncated: true,
	};
}

/** Nagłówek pliku w pakiecie: `=== ścieżka (L1–Ln) ===`. */
export function fileHeader(path: string, lineCount: number): string {
	return `=== ${path} (L1–L${lineCount}) ===`;
}
