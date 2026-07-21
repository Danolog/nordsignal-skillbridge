/**
 * 1E.2 — kontrakt treści atomów curriculum DS (always-on, bez DB).
 *
 * Pilnuje spakowanych JSON-ów (tools/content/curriculum-atoms/*.json) PRZED
 * ingestem: pełna walidacja strukturalna (ta sama, którą ingest odpala przed
 * zapisem — plik niekontraktowy ma wywalić CI, nie bazę) + inwarianty treści
 * ZATWIERDZONEJ przez Darka.
 *
 * ZAKRES (rozszerzony 2026-07-14): WSZYSTKIE 9 modułów drabiny.
 *  - fundamenty (2026-07-11, commit cb70a19): L0 + F1–F3 = 28 pozycji, 57 pytań;
 *  - trzon (PR #170): M-PD/M-EDA/M-SQL/M-ML/M-LLM = 38 pozycji, 72 pytania.
 * Razem: 66 pozycji atomowych, 129 pytań curriculum. (Do 70 pozycji na prodzie
 * dochodzą 4 capstone'y `kind='project'` — te żyją w curriculum-ds-drabina.json
 * i pilnuje ich curriculum-drabina.contract.test.ts.)
 *
 * DŁUG SPŁACONY TYM TESTEM: 5 modułów M-* poszło na produkcję (PR #170) bez
 * kontrakt-testu — wyłom w Uniwersalnej Bramce (roadmapa §1 pkt 3). Inwarianty
 * cross-cutting (walidacja, hinty, feedback, zasoby, determinizm) obejmują teraz
 * cały zestaw, nie tylko fundamenty.
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

/** Fundamenty — drabina wejściowa (L0 = laby-checklisty, F1–F3 = Python). */
const FOUNDATIONS = ["l0-start", "f1-python-1", "f2-python-2", "f3-dane-python"];
/** Trzon DS — moduły warsztatowe, każdy zakończony przeglądem z reuse. */
const TRUNK = ["m-pandas", "m-eda", "m-sql", "m-ml", "m-llm"];
const MODULES = [...FOUNDATIONS, ...TRUNK];

const contents: AtomModuleContent[] = MODULES.map((m) =>
	JSON.parse(readFileSync(join(ATOMS_DIR, `${m}.json`), "utf8")),
);
const byModule = new Map(contents.map((c) => [c.moduleSlug, c]));
const allItems = contents.flatMap((c) => c.items);

const itemsOf = (slug: string) => byModule.get(slug)?.items ?? [];
/** Atom z własnymi pytaniami (pozycja przeglądu ma questionRefs, nie questions). */
const atomsWithQuestions = (slug: string) =>
	itemsOf(slug).filter((i) => (i.questions?.length ?? 0) > 0);
const checksOf = (item: { config?: unknown }) =>
	(item.config as { checks?: { id?: string }[] } | undefined)?.checks ?? [];

describe("1E.2 · kontrakt treści atomów — cały zestaw (9 modułów)", () => {
	it("pełna walidacja strukturalna zestawu (ta sama co w ingeście) — 0 problemów", () => {
		expect(validateContentSet(contents)).toEqual([]);
	});

	it("komplet drabiny: 9 modułów / 66 pozycji atomowych / 129 pytań curriculum", () => {
		expect(contents.map((c) => c.moduleSlug)).toEqual(MODULES);
		expect(allItems).toHaveLength(66);
		expect(allItems.reduce((n, i) => n + (i.questions?.length ?? 0), 0)).toBe(129);
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

	// ── 1E.6b (ADR-015): kontrakt checków labów ────────────────────────────────
	// Dług „6 labów bez checków" (PD.4/PD.8/EDA.4/SQL.4/SQL.7/LLM.7) spłacony
	// 2026-07-21: treść poprawiona przez QG (kotwice wyników, kształt danych
	// przybity, sprzeczność PD.4 i semantyka `zgodnosc` rozstrzygnięte).
	// Ten test pilnuje, żeby dług NIE WRÓCIŁ: każdy lab ma realny kontrakt.
	it("WSZYSTKIE 19 labów ma realny kontrakt checków (dług 6 labów spłacony)", () => {
		const labs = allItems.filter((i) => i.kind === "lab");
		expect(labs).toHaveLength(19);

		const bez = labs.filter((l) => checksOf(l).length === 0).map((l) => l.slug);
		expect(bez).toEqual([]);
	});

	it("ZERO atrap z 1E.2: żaden check nie ma {type} zamiast {kind}", () => {
		for (const item of allItems) {
			for (const c of checksOf(item) as Record<string, unknown>[]) {
				expect(c.kind, `${item.slug}: atrapa {type:"${c.type}"} zamiast kontraktu`).toBeDefined();
				expect(["value", "relation", "predicate"]).toContain(c.kind);
				expect(c.id, item.slug).toBeTruthy();
				expect(c.note, `${item.slug}/${c.id}: limity checku muszą być zapisane`).toBeTruthy();
			}
		}
	});

	it("BEZPIECZNIK: żaden lab nie zalicza się na samych checkach `fragile`", () => {
		for (const lab of allItems.filter((i) => i.kind === "lab")) {
			const checks = checksOf(lab) as { fragile?: boolean }[];
			if (checks.length === 0) continue;
			const solidne = checks.filter((c) => c.fragile !== true);
			expect(
				solidne.length,
				`${lab.slug}: same checki fragile = zerowa wartość dowodowa`,
			).toBeGreaterThan(0);
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
	}, 120_000);
});

describe("1E.2 · fundamenty (L0 + F1–F3)", () => {
	it("komplet zatwierdzonej treści: 4 moduły / 28 pozycji / 57 pytań", () => {
		const items = FOUNDATIONS.flatMap(itemsOf);
		expect(items).toHaveLength(28);
		expect(items.reduce((n, i) => n + (i.questions?.length ?? 0), 0)).toBe(57);
	});

	it("L0 lean (D4/pkt 10): 4 atomy-checklisty kind=lab, każdy z 3 pytaniami retrieval i checkiem", () => {
		const l0 = byModule.get("l0-start");
		expect(l0?.items.map((i) => i.kind)).toEqual(["lab", "lab", "lab", "lab"]);
		for (const item of l0?.items ?? []) {
			expect(item.questions, item.slug).toHaveLength(3);
			expect(checksOf(item).length, item.slug).toBeGreaterThan(0);
			expect(
				(item.config as { uiVerifiedAt?: string })?.uiVerifiedAt,
				`${item.slug}: atom operacyjny bez linii świeżości UI (konwencja D4)`,
			).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it("F1–F3: 5 atomów exercise + laby + przegląd przed egzaminem (reuse) per moduł", () => {
		for (const slug of ["f1-python-1", "f2-python-2", "f3-dane-python"]) {
			const items = itemsOf(slug);
			expect(items.filter((i) => i.kind === "exercise" && i.questions).length, slug).toBe(5);
			const przeglad = items.find((i) => i.slug.endsWith("-przeglad"));
			expect(przeglad?.questionRefs?.length, slug).toBeGreaterThanOrEqual(10);
		}
	});

	it("mini-projekt F3.7 (pkt 12b, decyzja Darka): kind=lab z 3 kamieniami K1–K3", () => {
		const mini = itemsOf("f3-dane-python").find((i) => i.slug === "f3-7");
		expect(mini?.kind).toBe("lab");
		expect(checksOf(mini ?? {}).map((c) => c.id)).toEqual(["K1", "K2", "K3"]);
	});

	it("koncepty kluczowe (spacing D6.3): 3 w L0 i 4 per F1–F3", () => {
		expect(FOUNDATIONS.map((m) => [m, keyConceptCount(m)])).toEqual([
			["l0-start", 3],
			["f1-python-1", 4],
			["f2-python-2", 4],
			["f3-dane-python", 4],
		]);
	});
});

describe("1E.2 · trzon DS (M-PD / M-EDA / M-SQL / M-ML / M-LLM) — PR #170", () => {
	it("komplet trzonu: 5 modułów / 38 pozycji / 72 pytania", () => {
		const items = TRUNK.flatMap(itemsOf);
		expect(items).toHaveLength(38);
		expect(items.reduce((n, i) => n + (i.questions?.length ?? 0), 0)).toBe(72);
	});

	it("kształt per moduł zgodny z audytem pojemności D10 (atomy z pytaniami / laby / pozycje)", () => {
		const shape = TRUNK.map((m) => [
			m,
			atomsWithQuestions(m).length,
			itemsOf(m).filter((i) => i.kind === "lab").length,
			itemsOf(m).length,
		]);
		expect(shape).toEqual([
			// M-EDA ma 5 pozycji i BRAK egzaminu — świadoma decyzja z audytu pojemności
			// (bramka modułu = wszystkie pozycje completed + capstone submitted, wariant C).
			["m-pandas", 6, 2, 9],
			["m-eda", 3, 1, 5],
			["m-sql", 5, 2, 8],
			["m-ml", 5, 2, 8],
			["m-llm", 5, 2, 8],
		]);
	});

	it("każdy moduł trzonu kończy się przeglądem z reuse ≥10 pytań (spacing D6.3)", () => {
		for (const slug of TRUNK) {
			const items = itemsOf(slug);
			const przeglad = items.find((i) => i.slug.endsWith("-przeglad"));
			expect(przeglad, `${slug}: brak pozycji przeglądu`).toBeDefined();
			expect(przeglad?.questionRefs?.length, slug).toBeGreaterThanOrEqual(10);
			// przegląd to czysty reuse — nie wnosi nowych pytań do banku
			expect(przeglad?.questions ?? [], slug).toHaveLength(0);
		}
	});

	it("koncepty kluczowe: 3 w M-EDA (moduł skrócony), 4 w pozostałych", () => {
		expect(TRUNK.map((m) => [m, keyConceptCount(m)])).toEqual([
			["m-pandas", 4],
			["m-eda", 3],
			["m-sql", 4],
			["m-ml", 4],
			["m-llm", 4],
		]);
	});
});

function keyConceptCount(moduleSlug: string): number {
	return new Set(
		itemsOf(moduleSlug).flatMap((i) => (i.concepts ?? []).filter((x) => x.key).map((x) => x.slug)),
	).size;
}
