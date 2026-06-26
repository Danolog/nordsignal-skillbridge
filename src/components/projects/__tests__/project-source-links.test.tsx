// @vitest-environment jsdom
//
// Test jednostkowy #7 — ProjectSourceLinks (odporność linków źródła danych).
// Nie dotyka bazy: render komponentu na danych w pamięci. Dowodzi, że projekt z 2–3
// linkami pokazuje LISTĘ (nie pojedynczy link) i że link martwy degraduje wizualnie
// (fallback), pozostając klikalnym z bezpiecznymi atrybutami.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ProjectSourceLink, ProjectSourceLinks } from "../project-source-links";

const THREE_LINKS: ProjectSourceLink[] = [
	{ url: "https://kaggle.com/datasets/a", label: "Źródło główne", isDead: false },
	{ url: "https://example.com/mirror", label: null, isDead: false },
	{ url: "https://dead.example.org/gone", label: "Stara kopia", isDead: true },
];

describe("ProjectSourceLinks (#7)", () => {
	it("renderuje LISTĘ wszystkich linków (2–3), nie jeden", () => {
		const { container } = render(<ProjectSourceLinks links={THREE_LINKS} />);
		const links = Array.from(container.querySelectorAll("a"));
		expect(links).toHaveLength(3);
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"https://kaggle.com/datasets/a",
			"https://example.com/mirror",
			"https://dead.example.org/gone",
		]);
	});

	it("etykieta gdy podana; host z URL gdy brak etykiety", () => {
		const { container } = render(<ProjectSourceLinks links={THREE_LINKS} />);
		const links = Array.from(container.querySelectorAll("a"));
		expect(links[0].textContent).toContain("Źródło główne");
		// label === null → pokazujemy host (bez www.).
		expect(links[1].textContent).toContain("example.com");
	});

	it("link martwy: fallback wizualny (klasa dead + tag martwy), wciąż klikalny", () => {
		const { container } = render(<ProjectSourceLinks links={THREE_LINKS} />);
		const dead = container.querySelector("a.proj-source-link-dead");
		expect(dead).not.toBeNull();
		// Klikalny (ma href) — świadoma decyzja (np. archive.org).
		expect(dead?.getAttribute("href")).toBe("https://dead.example.org/gone");
		// Tekst niesie informację o martwym linku (nie tylko przekreślenie CSS).
		expect(dead?.textContent).toContain("(martwy)");
		// A11y: aria-label opisuje stan i podpowiada inne źródło (jest żywe).
		expect(dead?.getAttribute("aria-label")).toMatch(/martwy link/);
		expect(dead?.getAttribute("aria-label")).toMatch(/inne(go)? źródł/);
	});

	it("linki żywe NIE mają klasy dead", () => {
		const { container } = render(<ProjectSourceLinks links={THREE_LINKS} />);
		const alive = container.querySelectorAll("a:not(.proj-source-link-dead)");
		expect(alive).toHaveLength(2);
	});

	it("każdy link ma bezpieczne atrybuty (target=_blank + rel=noopener noreferrer)", () => {
		const { container } = render(<ProjectSourceLinks links={THREE_LINKS} />);
		for (const a of container.querySelectorAll("a")) {
			expect(a.getAttribute("target")).toBe("_blank");
			expect(a.getAttribute("rel")).toBe("noopener noreferrer");
		}
	});

	it("gdy wszystkie martwe: aria-label martwego NIE sugeruje innego źródła", () => {
		const allDead: ProjectSourceLink[] = [
			{ url: "https://a.example/x", label: "A", isDead: true },
			{ url: "https://b.example/y", label: "B", isDead: true },
		];
		const { container } = render(<ProjectSourceLinks links={allDead} />);
		const first = container.querySelector("a");
		expect(first?.getAttribute("aria-label")).toMatch(/martwy link/);
		expect(first?.getAttribute("aria-label")).not.toMatch(/inne(go)? źródł/);
	});

	it("pusta lista → render null (degradacja do source_url robi project-detail)", () => {
		const { container } = render(<ProjectSourceLinks links={[]} />);
		expect(container.innerHTML).toBe("");
	});
});
