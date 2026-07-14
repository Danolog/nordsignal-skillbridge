/**
 * Krok 4 (1E.2/1E.6b) — builder notebooków Colab: źródła w formacie percent
 * (tools/content/notebooks/<moduł>/<slug>-*.py) → notebooks/<moduł>/*.ipynb.
 *
 * PO CO BUILDER (ADR-015 §7 „Rozdzielenie warstw"): warstwa pieczątki
 * (serializacja + podpis) to JEDEN blok, identyczny we wszystkich notebookach
 * ścieżki — żyje wyłącznie w tools/content/notebooks/pieczatka.py i jest
 * DOKLEJANA przy budowie do komórki `# %% [pieczatka]`. Zmiana decyzji
 * o funkcji tokenu = edycja jednego pliku + rebuild, nie rewrite 66 notebooków.
 *
 * Format percent (podzbiór, bez zależności od jupytext):
 *   # %% [markdown]   — komórka tekstowa; linie treści z prefiksem „# "
 *   # %%              — komórka kodu (verbatim)
 *   # %% [pieczatka]  — komórka kodu: warstwa TREŚCI checku per atom
 *                       (def _zbierz_wyniki), do której builder dokleja
 *                       wspólny blok pieczątki
 *
 * Output jest DETERMINISTYCZNY (stałe id komórek, stały porządek kluczy) —
 * kontrakt-test przebudowuje źródła i porównuje bajt w bajt z notebooks/.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "tools", "content", "notebooks");
const OUT_DIR = join(process.cwd(), "notebooks");
const STAMP_MARKER = "# %% [pieczatka]";

type Cell =
	| { cell_type: "markdown"; id: string; metadata: Record<string, never>; source: string[] }
	| {
			cell_type: "code";
			execution_count: null;
			id: string;
			metadata: Record<string, never>;
			outputs: never[];
			source: string[];
	  };

/** Wspólny blok pieczątki — jedyne źródło prawdy warstwy tokenu. */
export function sharedStampBlock(): string {
	return readFileSync(join(SRC_DIR, "pieczatka.py"), "utf8").trimEnd();
}

/** Linie źródła komórki w formacie nbformat: każda z „\n" poza ostatnią. */
function toNbSource(text: string): string[] {
	const lines = text.split("\n");
	return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line));
}

function stripMarkdownPrefix(line: string): string {
	if (line.startsWith("# ")) return line.slice(2);
	if (line === "#") return "";
	return line; // linia bez prefiksu (np. pusta) — zostaje
}

function trimBlankEdges(lines: string[]): string[] {
	let start = 0;
	let end = lines.length;
	while (start < end && lines[start].trim() === "") start++;
	while (end > start && lines[end - 1].trim() === "") end--;
	return lines.slice(start, end);
}

export function buildNotebook(sourcePath: string, slug: string): string {
	const raw = readFileSync(sourcePath, "utf8");
	const lines = raw.split("\n");

	type RawCell = { kind: "markdown" | "code" | "pieczatka"; lines: string[] };
	const rawCells: RawCell[] = [];
	let current: RawCell | null = null;

	for (const line of lines) {
		const marker = line.trimEnd();
		if (marker === "# %% [markdown]" || marker === "# %%" || marker === STAMP_MARKER) {
			current = {
				kind:
					marker === "# %% [markdown]"
						? "markdown"
						: marker === STAMP_MARKER
							? "pieczatka"
							: "code",
				lines: [],
			};
			rawCells.push(current);
			continue;
		}
		if (!current) {
			if (line.trim() !== "") {
				throw new Error(`${sourcePath}: treść przed pierwszym znacznikiem komórki („# %%")`);
			}
			continue;
		}
		current.lines.push(line);
	}

	const stampCells = rawCells.filter((c) => c.kind === "pieczatka");
	if (stampCells.length !== 1) {
		throw new Error(
			`${sourcePath}: oczekiwano dokładnie 1 komórki „${STAMP_MARKER}", jest ${stampCells.length}`,
		);
	}
	if (!stampCells[0].lines.some((l) => l.startsWith("def _zbierz_wyniki"))) {
		throw new Error(`${sourcePath}: komórka pieczątki nie definiuje _zbierz_wyniki()`);
	}

	const cells: Cell[] = rawCells.map((cell, index) => {
		const id = `${slug}-c${index + 1}`;
		if (cell.kind === "markdown") {
			const text = trimBlankEdges(cell.lines.map(stripMarkdownPrefix)).join("\n");
			return { cell_type: "markdown", id, metadata: {}, source: toNbSource(text) };
		}
		const body = trimBlankEdges(cell.lines).join("\n");
		const text = cell.kind === "pieczatka" ? `${body}\n\n\n${sharedStampBlock()}` : body;
		return {
			cell_type: "code",
			execution_count: null,
			id,
			metadata: {},
			outputs: [],
			source: toNbSource(text),
		};
	});

	const notebook = {
		cells,
		metadata: {
			colab: { provenance: [] },
			kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
			language_info: { name: "python" },
		},
		nbformat: 4,
		nbformat_minor: 5,
	};
	return `${JSON.stringify(notebook, null, 1)}\n`;
}

/** Wszystkie źródła notebooków: katalog modułu → pliki .py (bez pieczatka.py). */
export function listNotebookSources(): { module: string; file: string; slug: string }[] {
	const out: { module: string; file: string; slug: string }[] = [];
	for (const entry of readdirSync(SRC_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		for (const file of readdirSync(join(SRC_DIR, entry.name))) {
			if (!file.endsWith(".py")) continue;
			out.push({ module: entry.name, file, slug: file.replace(/\.py$/, "") });
		}
	}
	return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function main() {
	const sources = listNotebookSources();
	if (sources.length === 0) throw new Error(`Brak źródeł notebooków w ${SRC_DIR}`);
	for (const src of sources) {
		const ipynb = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
		const outDir = join(OUT_DIR, src.module);
		mkdirSync(outDir, { recursive: true });
		const outPath = join(outDir, `${src.slug}.ipynb`);
		writeFileSync(outPath, ipynb);
		console.log(`✓ ${src.module}/${src.slug}.ipynb`);
	}
	console.log(`Zbudowano ${sources.length} notebooków.`);
}

if (process.argv[1]?.endsWith("build-notebooks.ts")) main();
