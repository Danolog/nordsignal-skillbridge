/**
 * A5/1.11 — testy planu sesji (spec §2.4/§4): determinizm wyboru wariantów
 * (sól sesji, stabilny porządek, wykluczenia z resetem), jawne `uncovered`,
 * egzekwowanie kolejności staircase (expectedNext) i koperta wyniku.
 */
import { describe, expect, it } from "vitest";
import {
	buildPlan,
	computeInputHash,
	computeResult,
	expectedNext,
	fnv1a,
	type SessionAnswer,
} from "../plan";
import type { BankItem } from "../types";

/** Bank syntetyczny: 2 kompetencje × 1 koncept × 3 trudności × 2 warianty. */
function makeBank(): BankItem[] {
	const bank: BankItem[] = [];
	for (const [competencyName, conceptSlug] of [
		["Python", "python-podstawy"],
		["SQL", "sql-podstawy"],
	] as const) {
		for (const difficulty of [1, 2, 3] as const) {
			for (const variant of ["a", "b"] as const) {
				bank.push({
					id: `${conceptSlug}-d${difficulty}-${variant}`,
					conceptId: `${conceptSlug}-id`,
					conceptSlug,
					competencyName,
					difficulty,
				});
			}
		}
	}
	return bank;
}

describe("fnv1a — stabilny hash wyboru wariantu", () => {
	it("deterministyczny i różnicujący", () => {
		expect(fnv1a("abc")).toBe(fnv1a("abc"));
		expect(fnv1a("sesja1:python:2")).not.toBe(fnv1a("sesja2:python:2"));
	});
});

describe("computeInputHash — odcisk wejścia sesji (§2.5)", () => {
	it("niezależny od kolejności zaznaczeń", () => {
		expect(computeInputHash("Data Scientist", ["SQL", "Python"])).toBe(
			computeInputHash("Data Scientist", ["Python", "SQL"]),
		);
	});
	it("zmiana celu lub listy zmienia odcisk", () => {
		const base = computeInputHash("Data Scientist", ["Python"]);
		expect(computeInputHash("Frontend Developer", ["Python"])).not.toBe(base);
		expect(computeInputHash("Data Scientist", ["Python", "SQL"])).not.toBe(base);
	});
});

describe("buildPlan — determinizm i pokrycie", () => {
	const bank = makeBank();

	it("ten sam seed → identyczny plan; inny seed może wybrać inne warianty", () => {
		const p1 = buildPlan(["Python", "SQL"], bank, "seed-A");
		const p2 = buildPlan(["SQL", "Python"], bank, "seed-A");
		expect(p1).toEqual(p2); // kolejność zaznaczeń bez znaczenia (sort)
		// Inny seed: plan legalny (te same koncepty), warianty per hash.
		const p3 = buildPlan(["Python", "SQL"], bank, "seed-B");
		expect(p3.competencies.map((c) => c.conceptSlug)).toEqual(
			p1.competencies.map((c) => c.conceptSlug),
		);
	});

	it("plan niesie wyłącznie item-idy i pełny staircase (d1/d2/d3)", () => {
		const plan = buildPlan(["Python"], bank, "seed");
		expect(plan.competencies).toHaveLength(1);
		const items = plan.competencies[0].items;
		expect(items.d1).toMatch(/python-podstawy-d1-[ab]/);
		expect(items.d2).toMatch(/python-podstawy-d2-[ab]/);
		expect(items.d3).toMatch(/python-podstawy-d3-[ab]/);
	});

	it("wykluczenia: itemy poprzednich sesji pomijane; komplet zużyty → reset", () => {
		const excluded = new Set(["python-podstawy-d2-a"]);
		const plan = buildPlan(["Python"], bank, "seed", excluded);
		expect(plan.competencies[0].items.d2).toBe("python-podstawy-d2-b");
		// Oba warianty d2 zużyte → reset wykluczeń (pytanie MUSI paść).
		const allUsed = new Set(["python-podstawy-d2-a", "python-podstawy-d2-b"]);
		const plan2 = buildPlan(["Python"], bank, "seed", allUsed);
		expect(plan2.competencies[0].items.d2).toMatch(/python-podstawy-d2-[ab]/);
	});

	it("kompetencja bez konceptu → uncovered (jawna degradacja)", () => {
		const plan = buildPlan(["Kowalstwo artystyczne", "Python"], bank, "seed");
		expect(plan.uncovered).toEqual(["Kowalstwo artystyczne"]);
		expect(plan.competencies.map((c) => c.competencyName)).toEqual(["Python"]);
	});

	it("dziura w trudnościach (brak d3) → uncovered, nie połowiczny staircase", () => {
		const holey = bank.filter((i) => !(i.competencyName === "SQL" && i.difficulty === 3));
		const plan = buildPlan(["SQL"], holey, "seed");
		expect(plan.uncovered).toEqual(["SQL"]);
		expect(plan.competencies).toHaveLength(0);
	});
});

describe("expectedNext + computeResult — przebieg sesji", () => {
	const bank = makeBank();
	const plan = buildPlan(["Python", "SQL"], bank, "seed");
	const [first, second] = plan.competencies; // Python przed SQL (sort pl)

	it("sekwencja: d2 → gałąź → następna kompetencja → null po komplecie", () => {
		const answers: SessionAnswer[] = [];
		const q1 = expectedNext(plan, answers);
		expect(q1).toMatchObject({
			competencyName: first.competencyName,
			itemId: first.items.d2,
			difficulty: 2,
			position: 0,
		});

		answers.push({ questionItemId: first.items.d2, isCorrect: true, position: 0 });
		const q2 = expectedNext(plan, answers);
		expect(q2).toMatchObject({ itemId: first.items.d3, difficulty: 3, position: 1 });

		answers.push({ questionItemId: first.items.d3, isCorrect: false, position: 1 });
		const q3 = expectedNext(plan, answers);
		expect(q3).toMatchObject({
			competencyName: second.competencyName,
			itemId: second.items.d2,
			difficulty: 2,
			position: 2,
		});

		answers.push({ questionItemId: second.items.d2, isCorrect: false, position: 2 });
		const q4 = expectedNext(plan, answers);
		expect(q4).toMatchObject({ itemId: second.items.d1, difficulty: 1, position: 3 });

		answers.push({ questionItemId: second.items.d1, isCorrect: true, position: 3 });
		expect(expectedNext(plan, answers)).toBeNull();

		// Koperta wyniku: koncepty (źródło prawdy) + kompetencje (rollup).
		const result = computeResult(plan, answers);
		expect(result).not.toBeNull();
		expect(result?.competencies).toEqual({
			[first.competencyName]: 3, // d2✓ d3✗
			[second.competencyName]: 2, // d2✗ d1✓
		});
		expect(result?.concepts[first.conceptSlug]).toEqual({ asked: 2, correct: 1, level: 3 });
		expect(result?.concepts[second.conceptSlug]).toEqual({ asked: 2, correct: 1, level: 2 });
		expect(result?.schemaVersion).toBe(1);
	});

	it("computeResult przed domknięciem wszystkich trajektorii → null", () => {
		const answers: SessionAnswer[] = [
			{ questionItemId: first.items.d2, isCorrect: true, position: 0 },
		];
		expect(computeResult(plan, answers)).toBeNull();
	});

	it("uncovered wędruje do wyniku", () => {
		const planWithGap = buildPlan(["Python", "Terraform"], bank, "seed");
		const answers: SessionAnswer[] = [
			{ questionItemId: planWithGap.competencies[0].items.d2, isCorrect: true, position: 0 },
			{ questionItemId: planWithGap.competencies[0].items.d3, isCorrect: true, position: 1 },
		];
		const result = computeResult(planWithGap, answers);
		expect(result?.uncovered).toEqual(["Terraform"]);
		expect(result?.competencies.Python).toBe(4);
	});
});
