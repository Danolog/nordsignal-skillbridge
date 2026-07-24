// ============================================================================
// 1E.3 (ADR-014 D3) — kontrakt packera banku egzaminacyjnego F1 (mastery gate).
// Test JEDNOSTKOWY (bez DB): parsuje realny plik Sophii i sprawdza strukturę.
//
// Pokrycie DoD: packer pytań F1 (15×2, de-dup).
// ŹRÓDŁO PRAWDY (de-dup, reguła twarda 1): WYŁĄCZNIE sophia-1e3-egzamin-f1-v0.1.md;
// kondensat w sophia-1e2-f1-atomy.md NIE jest tu otwierany.
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gradeAnswer } from "../../../src/lib/assessment/grade";
import { packExamBankFromMarkdown, validateExamBank } from "../../../tools/content-curriculum-exam";

const F1_CONCEPTS = [
	"typ-wartosci",
	"wyrazenie-obliczenie",
	"f-string-budowanie-tekstu",
	"porownanie-bool",
	"decyzja-if-else",
] as const;

const SOURCE = join(process.cwd(), "docs/curation/sophia-1e3-egzamin-f1-v0.1.md");
const markdown = readFileSync(SOURCE, "utf8");
const bank = packExamBankFromMarkdown(markdown, "f1-python-1");

describe("packer banku egzaminacyjnego F1 — 15 slotów × 2 warianty", () => {
	it("parsuje dokładnie 15 slotów (E1..E15)", () => {
		expect(bank.slots).toHaveLength(15);
		expect(bank.slots.map((s) => s.slotRef)).toEqual(
			Array.from({ length: 15 }, (_, i) => `e${i + 1}`),
		);
	});

	it("każdy slot ma 2 warianty izomorficzne A/B, każdy z 4 opcjami i 1 poprawną", () => {
		for (const slot of bank.slots) {
			expect(slot.variants.map((v) => v.variant).sort()).toEqual(["A", "B"]);
			for (const v of slot.variants) {
				expect(v.options).toHaveLength(4);
				expect(v.correct).toBeGreaterThanOrEqual(0);
				expect(v.correct).toBeLessThan(4);
			}
		}
	});

	it("kontrakt validateExamBank czysty (15×2, koncepty ⊆ modułu, samozgodność, de-dup)", () => {
		expect(validateExamBank(bank, { slotCount: 15, concepts: F1_CONCEPTS })).toEqual([]);
	});

	it("pokrycie konceptów: 5 konceptów × 3 sloty (równomierne, ADR D1)", () => {
		const perConcept = new Map<string, number>();
		for (const slot of bank.slots) {
			perConcept.set(slot.conceptSlug, (perConcept.get(slot.conceptSlug) ?? 0) + 1);
		}
		for (const c of F1_CONCEPTS) expect(perConcept.get(c)).toBe(3);
	});
});

describe("de-dup — jedno źródło prawdy (reguła twarda 1)", () => {
	it("slotRef globalnie unikalne (E1..E15 raz każdy)", () => {
		const refs = bank.slots.map((s) => s.slotRef);
		expect(new Set(refs).size).toBe(refs.length);
	});

	it("ref wariantu globalnie unikalny (30 wariantów, zero kolizji)", () => {
		const refs = bank.slots.flatMap((s) => s.variants.map((v) => v.ref));
		expect(refs).toHaveLength(30);
		expect(new Set(refs).size).toBe(30);
	});

	it("walidator ŁAPIE zduplikowany slot (regresja de-dup, gdyby kondensat wciekł)", () => {
		const doubled = { ...bank, slots: [...bank.slots, bank.slots[0]] };
		const problems = validateExamBank(doubled, { slotCount: 15, concepts: F1_CONCEPTS });
		expect(problems.some((p) => /zduplikowany/.test(p))).toBe(true);
	});
});

describe("bezpieczeństwo klucza — packer trzyma correct, test pilnuje samozgodności", () => {
	it("każdy wariant ma poprawny indeks przechodzący przez gradeAnswer", () => {
		// validateExamBank egzekwuje samozgodność; tu jawnie potwierdzamy brak problemu.
		const problems = validateExamBank(bank, { slotCount: 15 });
		expect(problems.filter((p) => /niesamozgodny/.test(p))).toEqual([]);
	});
});

// ============================================================================
// P4 ADWERSARYJNIE — determinizm packera + samozgodność klucza w OBIE strony.
// ============================================================================
describe("P4 determinizm packera (jak notebooki — 1:1 odtwarzalność)", () => {
	it("pack tego samego źródła dwukrotnie → wynik identyczny (deep equal)", () => {
		// Determinizm packera to warunek de-dup i audytowalności (Built-to-Sell):
		// re-ingest tego samego markdownu nie może dać innego banku (inne refy →
		// rozjazd plan_json ↔ config_json.examSlots). Łapie niedeterminizm
		// wprowadzony np. przez Set/Map z niestabilną kolejnością albo Date/random.
		const again = packExamBankFromMarkdown(markdown, "f1-python-1");
		expect(again).toEqual(bank);
	});

	it("inny moduleSlug zmienia WYŁĄCZNIE prefiks refów, nie strukturę/klucze", () => {
		const other = packExamBankFromMarkdown(markdown, "inny-slug");
		expect(other.slots.map((s) => s.slotRef)).toEqual(bank.slots.map((s) => s.slotRef));
		for (let i = 0; i < bank.slots.length; i++) {
			for (let j = 0; j < bank.slots[i].variants.length; j++) {
				const a = bank.slots[i].variants[j];
				const b = other.slots[i].variants[j];
				expect(b.ref.startsWith("inny-slug-")).toBe(true);
				// Klucz i treść niezależne od slug — tylko ref się różni.
				expect(b.correct).toBe(a.correct);
				expect(b.stem).toBe(a.stem);
				expect(b.options).toEqual(a.options);
			}
		}
	});
});

describe("P4 samozgodność klucza — poprawny ZALICZA, każdy dystraktor NIE", () => {
	it("gradeAnswer: wskazany correct → true; KAŻDY inny indeks → false", () => {
		for (const slot of bank.slots) {
			for (const v of slot.variants) {
				const where = `${slot.slotRef}${v.variant}`;
				// Klucz samozgodny w stronę „poprawną".
				expect(
					gradeAnswer("single_choice", { correct: v.correct }, { selected: v.correct }),
					`${where}: poprawny indeks powinien zaliczać`,
				).toBe(true);
				// I w stronę „błędną": żaden dystraktor nie może przejść (inaczej dwie
				// „poprawne” = student zdaje na złej odpowiedzi).
				for (let idx = 0; idx < v.options.length; idx++) {
					if (idx === v.correct) continue;
					expect(
						gradeAnswer("single_choice", { correct: v.correct }, { selected: idx }),
						`${where}: dystraktor ${idx} NIE może zaliczać`,
					).toBe(false);
				}
			}
		}
	});
});

// ============================================================================
// P4 ADWERSARYJNIE — granica źródła §6. Packer czyta WYŁĄCZNIE sekcję §6; blok
// pytania umieszczony w §7 (albo kondensat E1–E15 z pliku atomów, gdyby wciekł)
// NIE może trafić do banku. Łapie regresję de-dup „jedno źródło prawdy”.
// ============================================================================
describe("P4 granica §6 — pytania spoza sekcji §6 NIE wchodzą do banku", () => {
	const SYNTH = [
		"# Test",
		"## 6. Bank pytań",
		"### Koncept `c-typy`",
		"**E1.** Pytanie e1.",
		"- **A. Stem e1 A?** — o0 / **o1** / o2 / o3",
		"- **B. Stem e1 B?** — **o0** / o1 / o2 / o3",
		"- → `c-typy` → F.1",
		'- **Feedback studenta (D3):** „fb e1."',
		"",
		"**E2.** Pytanie e2.",
		"- **A. Stem e2 A?** — o0 / o1 / **o2** / o3",
		"- **B. Stem e2 B?** — o0 / **o1** / o2 / o3",
		"- → `c-typy` → F.2",
		'- **Feedback studenta (D3):** „fb e2."',
		"",
		"## 7. Brama przed oddaniem",
		"**E99.** Blok POZA §6 — nie powinien wejść.",
		"- **A. Stem e99 A?** — o0 / **o1** / o2 / o3",
		"- **B. Stem e99 B?** — **o0** / o1 / o2 / o3",
		"- → `c-typy` → F.99",
		'- **Feedback studenta (D3):** „fb e99."',
		"",
	].join("\n");

	it("blok E99 z sekcji §7 jest ignorowany (bank = tylko E1, E2 z §6)", () => {
		const synthBank = packExamBankFromMarkdown(SYNTH, "syn");
		expect(synthBank.slots.map((s) => s.slotRef)).toEqual(["e1", "e2"]);
		expect(synthBank.slots.flatMap((s) => s.variants.map((v) => v.ref))).not.toContain("syn-e99-a");
	});
});
