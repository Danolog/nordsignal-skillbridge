import { describe, expect, it } from "vitest";
import {
	fetchPriority,
	isCandidateFile,
	isInIgnoredDir,
	isReadme,
	LIMITS,
	orderCandidates,
	truncateFileContent,
} from "../content-filter";
import type { TreeEntry } from "../github";

function blob(path: string, size = 100): TreeEntry {
	return { path, type: "blob", size, sha: `sha-${path}` };
}

describe("content-filter — filtrowanie (krok 1)", () => {
	it("ignoruje katalogi-śmieci na dowolnym poziomie ścieżki", () => {
		expect(isInIgnoredDir("node_modules/foo.js")).toBe(true);
		expect(isInIgnoredDir("src/.venv/lib/x.py")).toBe(true);
		expect(isInIgnoredDir("dist/bundle.js")).toBe(true);
		expect(isInIgnoredDir("src/logic.py")).toBe(false);
	});

	it("bierze pliki kodu/tekstu z białej listy, odrzuca binaria i śmieci", () => {
		expect(isCandidateFile(blob("src/logic.py"))).toBe(true);
		expect(isCandidateFile(blob("README.md"))).toBe(true);
		expect(isCandidateFile(blob("detekcja.sql"))).toBe(true);
		expect(isCandidateFile(blob("Dockerfile"))).toBe(true);
		expect(isCandidateFile(blob("logo.png"))).toBe(false);
		expect(isCandidateFile(blob("archive.zip"))).toBe(false);
		expect(isCandidateFile(blob("node_modules/dep/index.js"))).toBe(false);
		expect(isCandidateFile(blob("data.unknownext"))).toBe(false);
	});

	it("odrzuca pliki ponad limitem rozmiaru", () => {
		expect(isCandidateFile(blob("big.py", LIMITS.maxFileBytes + 1))).toBe(false);
		expect(isCandidateFile(blob("ok.py", LIMITS.maxFileBytes))).toBe(true);
	});

	it("odrzuca wpisy typu tree (katalogi)", () => {
		expect(isCandidateFile({ path: "src", type: "tree", sha: "x" })).toBe(false);
	});

	it("rozpoznaje README", () => {
		expect(isReadme("README.md")).toBe(true);
		expect(isReadme("docs/README.md")).toBe(true);
		expect(isReadme("readme.txt")).toBe(false);
	});

	it("priorytetyzuje README, potem pliki wejściowe, potem resztę", () => {
		expect(fetchPriority(blob("README.md"))).toBe(0);
		expect(fetchPriority(blob("main.py"))).toBe(1);
		expect(fetchPriority(blob("index.js"))).toBe(1);
		expect(fetchPriority(blob("helpers.py"))).toBe(2);
	});

	it("sortuje kandydatów wg priorytetu, potem rosnącego rozmiaru", () => {
		const ordered = orderCandidates([
			blob("z-helper.py", 500),
			blob("README.md", 999),
			blob("main.py", 200),
			blob("a-util.py", 100),
		]);
		expect(ordered.map((e) => e.path)).toEqual([
			"README.md", // priorytet 0
			"main.py", // priorytet 1
			"a-util.py", // priorytet 2, mniejszy
			"z-helper.py", // priorytet 2, większy
		]);
	});

	it("obcina treść pojedynczego pliku ponad limitem", () => {
		const big = "x".repeat(LIMITS.maxFileBytes + 50);
		const out = truncateFileContent(big);
		expect(out.truncated).toBe(true);
		expect(out.content).toContain("[obcięto");
		expect(truncateFileContent("krótki").truncated).toBe(false);
	});
});
