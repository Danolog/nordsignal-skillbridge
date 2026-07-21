/**
 * Strażnik składni pieczątek — WSZYSTKIE moduły notebooków.
 *
 * Klasa błędu, która wróciła trzykrotnie (QG F1 → build F2 → build F3):
 * polski cudzysłów zamykany ASCII `"` wewnątrz stringu delimitowanego `"…"`
 * rozwala składnię komórki-pieczątki — a pieczątka MUSI być zawsze
 * kompilowalna (w odróżnieniu od komórek z lukami, których błędy uczące są
 * celowe). Ten test kompiluje realnym python3 każdą komórkę-pieczątkę
 * każdego zbudowanego notebooka.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const OUT_DIR = join(process.cwd(), "notebooks");

function allNotebooks(): { module: string; file: string }[] {
	const out: { module: string; file: string }[] = [];
	for (const entry of readdirSync(OUT_DIR)) {
		const dir = join(OUT_DIR, entry);
		if (!statSync(dir).isDirectory()) continue;
		for (const file of readdirSync(dir)) {
			if (file.endsWith(".ipynb")) out.push({ module: entry, file });
		}
	}
	return out;
}

describe("składnia pieczątek — każdy moduł notebooków", () => {
	const notebooks = allNotebooks();

	it("istnieją zbudowane notebooki", () => {
		expect(notebooks.length).toBeGreaterThan(0);
	});

	for (const nb of notebooks) {
		it(`${nb.module}/${nb.file}: komórka-pieczątka (jeśli jest) kompiluje się czysto`, () => {
			const parsed = JSON.parse(readFileSync(join(OUT_DIR, nb.module, nb.file), "utf8")) as {
				cells: { cell_type: string; source: string[] }[];
			};
			const stamps = parsed.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			for (const cell of stamps) {
				const src = cell.source.join("");
				// compile() bez wykonania — łapie wyłącznie błędy składni.
				const out = execFileSync(
					"python3",
					["-c", 'import sys; compile(sys.stdin.read(), "<pieczatka>", "exec"); print("OK")'],
					{ input: src, encoding: "utf8" },
				);
				expect(out.trim(), `${nb.module}/${nb.file}`).toBe("OK");
			}
		});
	}
});
