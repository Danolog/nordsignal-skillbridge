/**
 * 1E.2 — kontrakt treści atomów fundamentów (always-on, bez DB).
 *
 * Pilnuje spakowanych JSON-ów (tools/content/curriculum-atoms/*.json) PRZED
 * ingestem: pełna walidacja strukturalna (ta sama, którą ingest odpala przed
 * zapisem — plik niekontraktowy ma wywalić CI, nie bazę) + inwarianty treści
 * ZATWIERDZONEJ przez Darka (2026-07-11, commit cb70a19): 4 moduły fundamentów,
 * 28 pozycji, 57 pytań atomowych, drabinki 3-stopniowe, przeglądy z reuse.
 *
 * DETERMINIZM PACKERA: JSON-y są generowane (pnpm content:pack-curriculum)
 * z docs/curation/sophia-1e2-*.md — test odpala packer w pamięci i porównuje
 * z commitowanymi plikami. Edycja treści bez przepakowania = czerwone CI.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AtomModuleContent } from "../../../tools/content-curriculum-atoms";
import { validateContentSet } from "../../../tools/content-curriculum-atoms";

const ATOMS_DIR = join(process.cwd(), "tools", "content", "curriculum-atoms");
const MODULES = ["l0-start", "f1-python-1", "f2-python-2", "f3-dane-python"];

const contents: AtomModuleContent[] = MODULES.map((m) =>
	JSON.parse(readFileSync(join(ATOMS_DIR, `${m}.json`), "utf8")),
);
const byModule = new Map(contents.map((c) => [c.moduleSlug, c]));
const allItems = contents.flatMap((c) => c.items);

describe("1E.2 · kontrakt treści atomów fundamentów (L0+F1+F2+F3)", () => {
	it("pełna walidacja strukturalna zestawu (ta sama co w ingeście) — 0 problemów", () => {
		expect(validateContentSet(contents)).toEqual([]);
	});

	it("komplet zatwierdzonej treści: 4 moduły / 28 pozycji / 57 pytań", () => {
		expect(contents.map((c) => c.moduleSlug)).toEqual(MODULES);
		expect(allItems).toHaveLength(28);
		expect(allItems.reduce((n, i) => n + (i.questions?.length ?? 0), 0)).toBe(57);
	});

	it("L0 lean (D4/pkt 10): 4 atomy-checklisty kind=lab, każdy z 3 pytaniami retrieval i checkiem", () => {
		const l0 = byModule.get("l0-start");
		expect(l0?.items.map((i) => i.kind)).toEqual(["lab", "lab", "lab", "lab"]);
		for (const item of l0?.items ?? []) {
			expect(item.questions, item.slug).toHaveLength(3);
			expect((item.config as { checks?: unknown[] })?.checks?.length, item.slug).toBeGreaterThan(0);
			expect(
				(item.config as { uiVerifiedAt?: string })?.uiVerifiedAt,
				`${item.slug}: atom operacyjny bez linii świeżości UI (konwencja D4)`,
			).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it("F1–F3: 5 atomów exercise + laby + przegląd przed egzaminem (reuse) per moduł", () => {
		for (const slug of ["f1-python-1", "f2-python-2", "f3-dane-python"]) {
			const items = byModule.get(slug)?.items ?? [];
			expect(items.filter((i) => i.kind === "exercise" && i.questions).length, slug).toBe(5);
			const przeglad = items.find((i) => i.slug.endsWith("-przeglad"));
			expect(przeglad?.questionRefs?.length, slug).toBeGreaterThanOrEqual(10);
		}
	});

	it("mini-projekt F3.7 (pkt 12b, decyzja Darka): kind=lab z 3 kamieniami K1–K3", () => {
		const mini = byModule.get("f3-dane-python")?.items.find((i) => i.slug === "f3-7");
		expect(mini?.kind).toBe("lab");
		const checks = (mini?.config as { checks?: { id?: string }[] })?.checks ?? [];
		expect(checks.map((c) => c.id)).toEqual(["K1", "K2", "K3"]);
	});

	it("drabinka hintów 3-stopniowa przy każdym atomie z pytaniami/labem (pkt 13)", () => {
		for (const item of allItems) {
			if ((item.questions?.length ?? 0) > 0 || item.kind === "lab") {
				expect(item.hints, item.slug).toHaveLength(3);
			}
		}
	});

	it("feedback per opcja kompletny i diagnozy na dystraktorach (R13 + dystraktory diagnostyczne)", () => {
		for (const item of allItems) {
			for (const q of item.questions ?? []) {
				expect(q.optionFeedback, q.ref).toHaveLength(q.options?.length ?? 0);
				const correctIdx = q.answer.correct as number;
				const distractorsWithDiagnosis = (q.optionFeedback ?? []).filter(
					(fb, i) => i !== correctIdx && fb.diagnosis,
				);
				expect(distractorsWithDiagnosis.length, q.ref).toBeGreaterThan(0);
			}
		}
	});

	it("koncepty kluczowe (spacing D6.3): 3 w L0 i 4 per F1–F3", () => {
		const keyCounts = new Map<string, number>();
		for (const c of contents) {
			const keys = new Set(
				c.items.flatMap((i) => (i.concepts ?? []).filter((x) => x.key).map((x) => x.slug)),
			);
			keyCounts.set(c.moduleSlug, keys.size);
		}
		expect([...keyCounts.entries()]).toEqual([
			["l0-start", 3],
			["f1-python-1", 4],
			["f2-python-2", 4],
			["f3-dane-python", 4],
		]);
	});

	it("zasoby modułowe z metadanymi QG-5 od dnia 1 (licencja, język, rejestracja, verifiedAt)", () => {
		for (const c of contents) {
			const resources = c.items.flatMap((i) => i.resources ?? []);
			expect(resources.length, c.moduleSlug).toBeGreaterThan(0);
			for (const r of resources) {
				expect(r.license, r.url).toBeTruthy();
				expect(r.language, r.url).toBeTruthy();
				expect(r.verifiedAt, r.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});

	it("DETERMINIZM: packer z docs/curation odtwarza commitowane JSON-y 1:1", () => {
		execFileSync("pnpm", ["exec", "tsx", "tools/pack-curriculum-atoms.ts"], {
			cwd: process.cwd(),
			stdio: "pipe",
		});
		for (const m of MODULES) {
			const regenerated = readFileSync(join(ATOMS_DIR, `${m}.json`), "utf8");
			expect(JSON.parse(regenerated), m).toEqual(byModule.get(m));
		}
	}, 60_000);
});
