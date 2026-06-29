import { describe, expect, it } from "vitest";
import { repoCoordsFromUrl } from "../github";

describe("github — repoCoordsFromUrl", () => {
	it("wyłuskuje owner/repo z adresu github.com", () => {
		expect(repoCoordsFromUrl(new URL("https://github.com/alice/projekt"))).toEqual({
			owner: "alice",
			repo: "projekt",
		});
	});

	it("odcina sufiks .git i dodatkowe segmenty", () => {
		expect(repoCoordsFromUrl(new URL("https://github.com/alice/projekt.git"))).toEqual({
			owner: "alice",
			repo: "projekt",
		});
		expect(repoCoordsFromUrl(new URL("https://github.com/alice/projekt/tree/main"))).toEqual({
			owner: "alice",
			repo: "projekt",
		});
	});

	it("zwraca null dla adresu bez owner/repo", () => {
		expect(repoCoordsFromUrl(new URL("https://github.com/alice"))).toBeNull();
		expect(repoCoordsFromUrl(new URL("https://github.com/"))).toBeNull();
	});
});
