/**
 * 1E.1c — kontrakt struktury drabiny curriculum (ADR-014 D10, always-on).
 *
 * Pilnuje wersjonowanego JSON-a struktury PRZED ingestem: drabina zatwierdzona
 * decyzjami Darka (8 modułów, 4 capstone'y, łańcuch liniowy) — dryf struktury
 * ma wywalić CI, nie prod. Capstone'y muszą istnieć w partii 1 DS (reuse-as-
 * capstone — D4); łańcuch = kolejność modules[] (ingest derywuje prereqi).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ladder = JSON.parse(
	readFileSync(join(process.cwd(), "tools", "content", "curriculum-ds-drabina.json"), "utf8"),
) as {
	path: string;
	modules: {
		slug: string;
		title: string;
		description?: string;
		items: { slug: string; position: number; kind: string; title: string; projectSlug?: string }[];
	}[];
};

const dsProjects = JSON.parse(
	readFileSync(join(process.cwd(), "tools", "content", "ds-projects-partia-1.json"), "utf8"),
) as { slug: string }[];
const projectSlugs = new Set(dsProjects.map((p) => p.slug));

const ITEM_KINDS = ["theory", "exercise", "lab", "project", "exam", "review"];

describe("1E.1c · kontrakt drabiny curriculum DS", () => {
	// m-pandas wydzielony z m-eda: audyt pojemności D10 (delegacja „moduł dzielony
	// — decyzja treściowa Sophii"), docs/curation/sophia-1e2-audyt-pojemnosci-m-eda.md;
	// liczba capstone'ów bez zmian (4 — decyzja Darka pkt 7).
	it("ścieżka i skład drabiny zgodne z ADR-014 D10 (decyzja Darka: 4 capstone'y)", () => {
		expect(ladder.path).toBe("data-science");
		expect(ladder.modules.map((m) => m.slug)).toEqual([
			"l0-start",
			"f1-python-1",
			"f2-python-2",
			"f3-dane-python",
			"m-pandas",
			"m-eda",
			"m-sql",
			"m-ml",
			"m-llm",
		]);
	});

	it("slugi modułów unikalne, tytuły niepuste", () => {
		const slugs = ladder.modules.map((m) => m.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const m of ladder.modules) {
			expect(m.title.trim().length).toBeGreaterThan(0);
		}
	});

	it("każda pozycja ma poprawny kind; pozycje project wskazują ISTNIEJĄCY capstone partii 1", () => {
		for (const m of ladder.modules) {
			for (const item of m.items) {
				expect(ITEM_KINDS, `${m.slug}#${item.position}: kind '${item.kind}'`).toContain(item.kind);
				if (item.kind === "project") {
					expect(item.projectSlug, `${m.slug}#${item.position}: brak projectSlug`).toBeTruthy();
					expect(
						projectSlugs.has(item.projectSlug as string),
						`${m.slug}: capstone '${item.projectSlug}' nie istnieje w ds-projects-partia-1`,
					).toBe(true);
				}
			}
		}
	});

	it("pozycje w module bez duplikatów position", () => {
		for (const m of ladder.modules) {
			const positions = m.items.map((i) => i.position);
			expect(new Set(positions).size, m.slug).toBe(positions.length);
		}
	});

	// Ustalenie wiążące 1E.2 (przegląd Ethana): tożsamość pozycji = slug,
	// position tylko sortuje — bez sluga ingest nie ma klucza upsertu.
	it("każda pozycja ma stabilny slug (kebab-case), unikalny w module", () => {
		for (const m of ladder.modules) {
			const slugs = m.items.map((i) => i.slug);
			expect(new Set(slugs).size, m.slug).toBe(slugs.length);
			for (const item of m.items) {
				expect(item.slug, `${m.slug}#${item.position}`).toMatch(/^[a-z0-9-]+$/);
			}
		}
	});

	it("dokładnie 4 capstone'y (M-EDA, M-SQL, M-ML, M-LLM) w kolejności drabiny partii", () => {
		const capstones = ladder.modules.flatMap((m) =>
			m.items.filter((i) => i.kind === "project").map((i) => i.projectSlug),
		);
		expect(capstones).toEqual([
			"ds-eda-polska-w-liczbach-bdl",
			"ds-sql-analiza-przejazdow",
			"ds-pierwszy-model-predykcyjny",
			"ds-llm-strukturalna-ekstrakcja",
		]);
	});

	it("moduły fundamentów (L0–F3) bez capstone'ów w strukturze 1E.1 (atomy i mini-projekt wchodzą z 1E.2)", () => {
		for (const slug of ["l0-start", "f1-python-1", "f2-python-2", "f3-dane-python"]) {
			const m = ladder.modules.find((x) => x.slug === slug);
			expect(m?.items.filter((i) => i.kind === "project")).toEqual([]);
		}
	});
});
