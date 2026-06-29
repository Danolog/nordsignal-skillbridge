import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../github", () => ({
	fetchRepoMeta: vi.fn(),
	fetchRepoTree: vi.fn(),
	fetchBlobText: vi.fn(),
	repoCoordsFromUrl: vi.fn(() => ({ owner: "u", repo: "r" })),
}));

import { fetchBlobText, fetchRepoMeta, fetchRepoTree } from "../github";
import { fetchContent } from "../step1-fetch-content";

const mockMeta = vi.mocked(fetchRepoMeta);
const mockTree = vi.mocked(fetchRepoTree);
const mockBlob = vi.mocked(fetchBlobText);

const url = new URL("https://github.com/u/r");

beforeEach(() => vi.clearAllMocks());

describe("step1 — pobranie treści (mock GitHub API)", () => {
	it("składa ustrukturyzowany pakiet z nagłówkami ścieżek i README osobno", async () => {
		mockMeta.mockResolvedValue({ default_branch: "main" });
		mockTree.mockResolvedValue({
			tree: [
				{ path: "README.md", type: "blob", size: 50, sha: "s1" },
				{ path: "main.py", type: "blob", size: 30, sha: "s2" },
				{ path: "logo.png", type: "blob", size: 999, sha: "s3" },
			],
		});
		mockBlob.mockImplementation(async (_c, sha) => (sha === "s1" ? "# Cel\nopis" : "print('hi')"));

		const r = await fetchContent(url);
		expect(r.ok).toBe(true);
		expect(r.data.readme).toContain("Cel");
		expect(r.data.artifact).toContain("=== README.md");
		expect(r.data.artifact).toContain("=== main.py");
		// binarka odfiltrowana, nie pobierana
		expect(mockBlob).not.toHaveBeenCalledWith(expect.anything(), "s3");
		expect(r.data.files.map((f) => f.path)).toEqual(["README.md", "main.py"]);
	});

	it("repo niedostępne (meta null) → flaga empty_or_unreadable, bez wyjątku", async () => {
		mockMeta.mockResolvedValue(null);
		const r = await fetchContent(url);
		expect(r.ok).toBe(false);
		expect(r.flags.some((f) => f.code === "empty_or_unreadable")).toBe(true);
		expect(r.data.artifact).toBe("");
	});

	it("repo bez plików nadających się do oceny → empty_or_unreadable", async () => {
		mockMeta.mockResolvedValue({ default_branch: "main" });
		mockTree.mockResolvedValue({
			tree: [{ path: "img.png", type: "blob", size: 10, sha: "x" }],
		});
		const r = await fetchContent(url);
		expect(r.ok).toBe(false);
		expect(r.flags.some((f) => f.code === "empty_or_unreadable")).toBe(true);
	});

	it("drzewo obcięte przez GitHub → flaga content_truncated + INPUT_META.truncated", async () => {
		mockMeta.mockResolvedValue({ default_branch: "main" });
		mockTree.mockResolvedValue({
			tree: [{ path: "main.py", type: "blob", size: 10, sha: "s" }],
			truncated: true,
		});
		mockBlob.mockResolvedValue("print(1)");
		const r = await fetchContent(url);
		expect(r.data.inputMeta.truncated).toBe(true);
		expect(r.flags.some((f) => f.code === "content_truncated")).toBe(true);
	});

	it("blob niepobrany (null) → plik trafia do omittedFiles, potok idzie dalej", async () => {
		mockMeta.mockResolvedValue({ default_branch: "main" });
		mockTree.mockResolvedValue({
			tree: [
				{ path: "main.py", type: "blob", size: 10, sha: "ok" },
				{ path: "broken.py", type: "blob", size: 10, sha: "bad" },
			],
		});
		mockBlob.mockImplementation(async (_c, sha) => (sha === "ok" ? "print(1)" : null));
		const r = await fetchContent(url);
		expect(r.data.files.map((f) => f.path)).toEqual(["main.py"]);
		expect(r.data.omittedFiles).toContain("broken.py");
	});
});
