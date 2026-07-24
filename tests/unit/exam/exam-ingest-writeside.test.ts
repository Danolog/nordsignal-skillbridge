// ============================================================================
// 1E.3 (ADR-014 D3) — BRAMKA W1 (Leo, warunek flag-enable) + W3.
// Test WRITE-SIDE (bez DB): pakowanie egzaminu emituje do config_json.examSlots
// WYŁĄCZNIE refy — NIGDY correct/stem/options/answer_json. Wspólny guard granicy
// = parseExamSlotRefs (exam.ts), ta sama funkcja co read-side loadExamBank.
//
// Round-trip: pack → buildExamSlots → parseExamSlotRefs → komplet refów, zero
// klucza. Test MUTUJE: gdyby packer doklejał klucz do examSlots → skan czerwony.
//
// W3: koncepty egzaminu NIE mogą być diagnostic=true+trunk=market+active (inaczej
// loadDiagnosticBank je zaciągnie) — assertExamConceptsNotDiagnostic to blokuje.
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseExamSlotRefs } from "../../../src/lib/assessment/exam";
import {
	assertExamConceptsNotDiagnostic,
	buildExamItemRows,
	buildExamSlots,
	type ConceptSafetyMeta,
	packExamBankFromMarkdown,
} from "../../../tools/content-curriculum-exam";

const FIXTURE = join(process.cwd(), "tests/unit/exam/fixtures/exam-bank-sample.md");
const markdown = readFileSync(FIXTURE, "utf8");
const MODULE_SLUG = "fx-module-1";
const bank = packExamBankFromMarkdown(markdown, MODULE_SLUG);
const FIXTURE_CONCEPTS = ["dodawanie", "mnozenie"] as const;

/** Deterministyczny resolver ref→UUID (bez DB) — jak idByRef po insercie. */
const fakeItemId = (ref: string) =>
	`00000000-0000-4000-8000-${ref
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 12)
		.padStart(12, "0")}`;

/** Klucze/treść, które NIGDY nie mogą wyciec do config_json.examSlots. */
const FORBIDDEN_KEYS = [
	'"correct"',
	'"stem"',
	'"options"',
	'"answer"',
	'"answer_json"',
	'"answerJson"',
	'"feedbackMd"',
] as const;

function leakedKeys(configJson: unknown): string[] {
	const serialized = JSON.stringify(configJson);
	return FORBIDDEN_KEYS.filter((k) => serialized.includes(k));
}

describe("W1 write-side — examSlots niesie WYŁĄCZNIE refy (zero klucza/treści)", () => {
	const examSlots = buildExamSlots(bank, fakeItemId);
	const configJson = { examSlots };

	it("buildExamItemRows: klucz i treść żyją TYLKO w question_items (DENY)", () => {
		const rows = buildExamItemRows(bank);
		expect(rows).toHaveLength(bank.slots.length * 2); // 6×2 = 12 (F1: 15×2 = 30)
		for (const r of rows) {
			expect(r.type).toBe("single_choice");
			expect(r.options).toHaveLength(4);
			expect(r.answer.correct).toBeGreaterThanOrEqual(0);
			expect(r.answer.correct).toBeLessThan(4);
			expect(r.difficulty).toBeGreaterThanOrEqual(1);
			expect(r.difficulty).toBeLessThanOrEqual(3);
		}
	});

	it("examSlots ma kształt {slotRef, conceptSlug, variants:[{ref,variant,itemId}]} — nic więcej", () => {
		for (const s of examSlots) {
			expect(Object.keys(s).sort()).toEqual(["conceptSlug", "slotRef", "variants"]);
			for (const v of s.variants) {
				expect(Object.keys(v).sort()).toEqual(["itemId", "ref", "variant"]);
			}
		}
	});

	it("SKAN JSON: config_json.examSlots NIE zawiera correct/stem/options/answer_json", () => {
		expect(leakedKeys(configJson)).toEqual([]);
	});

	it("round-trip pack→examSlots→parseExamSlotRefs: komplet refów odtworzony", () => {
		const parsed = parseExamSlotRefs(configJson);
		expect(parsed).not.toBeNull();
		expect(parsed).toHaveLength(bank.slots.length);
		// Każdy slot/wariant round-trippuje ref i itemId 1:1 z bankiem.
		for (let i = 0; i < bank.slots.length; i++) {
			expect(parsed?.[i].slotRef).toBe(bank.slots[i].slotRef);
			expect(parsed?.[i].conceptSlug).toBe(bank.slots[i].conceptSlug);
			expect(parsed?.[i].variants.map((v) => v.ref)).toEqual(
				bank.slots[i].variants.map((v) => v.ref),
			);
			for (const v of parsed?.[i].variants ?? []) {
				expect(v.itemId).toBe(fakeItemId(v.ref));
			}
		}
	});

	it("MUTACJA — gdyby packer doklejał 'correct' do wariantu examSlots, skan JEST czerwony", () => {
		// Symulacja regresji: leaky packer wkleja klucz obok refu. Guard-skan MUSI
		// to złapać (parseExamSlotRefs sam by to zignorował — dlatego skan to zęby).
		const leaked = {
			examSlots: examSlots.map((s, i) =>
				i === 0
					? {
							...s,
							variants: s.variants.map((v, j) =>
								j === 0 ? { ...v, correct: 2, stem: "PODMIANA", options: ["a", "b"] } : v,
							),
						}
					: s,
			),
		};
		expect(leakedKeys(leaked)).toEqual(
			expect.arrayContaining(['"correct"', '"stem"', '"options"']),
		);
		// parseExamSlotRefs nadal zwraca poprawne refy (ignoruje nadmiar) — dowód,
		// że sam parser NIE wystarcza; bramką jest skan zakazanych kluczy.
		expect(parseExamSlotRefs(leaked)).toHaveLength(bank.slots.length);
	});
});

describe("W3 — koncepty egzaminu muszą być foundations/diagnostic=false", () => {
	const cleanMeta = new Map<string, ConceptSafetyMeta>(
		FIXTURE_CONCEPTS.map((c) => [c, { trunk: "foundations", diagnostic: false, status: "active" }]),
	);

	it("foundations/diagnostic=false → guard przechodzi (nie rzuca)", () => {
		expect(() => assertExamConceptsNotDiagnostic(bank, cleanMeta)).not.toThrow();
	});

	it("diagnostic=true + trunk=market + active → guard RZUCA (loadDiagnosticBank by zaciągnął)", () => {
		const poisoned = new Map(cleanMeta);
		poisoned.set(bank.slots[0].conceptSlug, {
			trunk: "market",
			diagnostic: true,
			status: "active",
		});
		expect(() => assertExamConceptsNotDiagnostic(bank, poisoned)).toThrow(/W3/);
	});

	it("trunk=market ale diagnostic=false → NIE rzuca (dopiero pełna trójka jest groźna)", () => {
		const marketNonDiag = new Map(cleanMeta);
		marketNonDiag.set(bank.slots[0].conceptSlug, {
			trunk: "market",
			diagnostic: false,
			status: "active",
		});
		expect(() => assertExamConceptsNotDiagnostic(bank, marketNonDiag)).not.toThrow();
	});

	it("diagnostic=true+market ale retired → NIE rzuca (loadDiagnosticBank filtruje active)", () => {
		const retired = new Map(cleanMeta);
		retired.set(bank.slots[0].conceptSlug, {
			trunk: "market",
			diagnostic: true,
			status: "retired",
		});
		expect(() => assertExamConceptsNotDiagnostic(bank, retired)).not.toThrow();
	});
});
