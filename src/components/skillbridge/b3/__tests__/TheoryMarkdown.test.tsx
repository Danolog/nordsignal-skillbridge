// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TheoryMarkdown } from "../TheoryMarkdown";

/**
 * Testy bezpieczeństwa TheoryMarkdown — walidacja sanityzacji (ADR-006, granica XSS).
 *
 * `projects.theory_md` jest częściowo generowany modelem językowym → powierzchnia
 * ataku XSS. Każdy wektor to osobny test: asercja, że sanityzacja
 * (rehype-sanitize + THEORY_MARKDOWN_SCHEMA, bez rehype-raw/remark-gfm) złapała atak.
 *
 * PASS = sanityzacja zadziałała (niebezpieczny element/atrybut nie trafił do DOM).
 * Jeśli którykolwiek wektor PRZECHODZI w drugą stronę (atak w DOM) = realny blocker.
 */
describe("TheoryMarkdown — sanityzacja XSS (ADR-006)", () => {
	// --- WEKTORY ATAKU ---

	it("wycina <script> z treści (surowy HTML nie wchodzi do drzewa)", () => {
		const { container } = render(<TheoryMarkdown source={"Przed<script>alert(1)</script>Po"} />);
		expect(container.querySelector("script")).toBeNull();
		// I treść nie zawiera wykonywalnego skryptu jako element.
		expect(container.innerHTML).not.toContain("<script");
	});

	it("nie przepuszcza <img onerror=...> (img poza allowlistą, atrybut on* odcięty)", () => {
		const { container } = render(<TheoryMarkdown source={'<img src=x onerror="alert(1)">'} />);
		expect(container.querySelector("img")).toBeNull();
		// Żaden element nie nosi handlera onerror.
		expect(container.querySelector("[onerror]")).toBeNull();
		expect(container.innerHTML.toLowerCase()).not.toContain("onerror");
	});

	it("odcina href ze schematem javascript: w linku markdown", () => {
		const { container } = render(<TheoryMarkdown source={"[klik](javascript:alert(1))"} />);
		const anchor = container.querySelector("a");
		// Link może się wyrenderować jako <a>, ale href javascript: musi być odcięty.
		if (anchor) {
			expect(anchor.getAttribute("href") ?? "").not.toMatch(/javascript:/i);
		}
		expect(container.innerHTML.toLowerCase()).not.toContain("javascript:");
	});

	it("odrzuca blockquote (poza allowlistą §2.7.1)", () => {
		const { container } = render(<TheoryMarkdown source={"> cytat blokowy"} />);
		expect(container.querySelector("blockquote")).toBeNull();
	});

	it("odrzuca tabelę markdown (remark-gfm wyłączony → tabela nie powstaje)", () => {
		const md = "| a | b |\n| - | - |\n| 1 | 2 |";
		const { container } = render(<TheoryMarkdown source={md} />);
		expect(container.querySelector("table")).toBeNull();
		expect(container.querySelector("thead")).toBeNull();
		expect(container.querySelector("td")).toBeNull();
	});

	it("odrzuca H1 i H2 (tylko H3 dozwolony — nie łamie hierarchii strony)", () => {
		const { container } = render(<TheoryMarkdown source={"# Duży\n\n## Średni"} />);
		expect(container.querySelector("h1")).toBeNull();
		expect(container.querySelector("h2")).toBeNull();
	});

	// --- ELEMENTY DOZWOLONE (pozytywna kontrola — sanityzacja nie jest zbyt agresywna) ---

	it("renderuje akapit, listy, H3, strong/em, inline code i pre/code", () => {
		const md = [
			"Akapit zwykły z **pogrubieniem** i *kursywą* oraz `inline`.",
			"",
			"### Śródtytuł",
			"",
			"- punkt jeden",
			"- punkt dwa",
			"",
			"1. krok jeden",
			"2. krok dwa",
			"",
			"```",
			"const x = 1;",
			"```",
		].join("\n");
		const { container } = render(<TheoryMarkdown source={md} />);
		expect(container.querySelector("p")).not.toBeNull();
		expect(container.querySelector("h3")).not.toBeNull();
		expect(container.querySelector("ul")).not.toBeNull();
		expect(container.querySelector("ol")).not.toBeNull();
		expect(container.querySelectorAll("li").length).toBeGreaterThanOrEqual(4);
		expect(container.querySelector("strong")).not.toBeNull();
		expect(container.querySelector("em")).not.toBeNull();
		expect(container.querySelector("code")).not.toBeNull();
		expect(container.querySelector("pre")).not.toBeNull();
	});

	it("renderuje prawidłowy link https z wymuszonym rel=noopener noreferrer + target=_blank", () => {
		const { container } = render(
			<TheoryMarkdown source={"[Postgres](https://postgresql.org/docs)"} />,
		);
		const anchor = container.querySelector("a");
		expect(anchor).not.toBeNull();
		expect(anchor?.getAttribute("href")).toBe("https://postgresql.org/docs");
		// Bezpieczeństwo wymuszane w komponencie (nie z treści) — spec §2.7.3.
		expect(anchor?.getAttribute("target")).toBe("_blank");
		expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
	});
});
