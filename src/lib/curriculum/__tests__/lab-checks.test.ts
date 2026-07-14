// 1E.6b (ADR-015) — silnik checków labów: ewaluacja serwerowa + token pieczątki.

import { beforeAll, describe, expect, it } from "vitest";
import {
	DEFAULT_TOLERANCE,
	evaluateChecks,
	type LabCheck,
	parseChecks,
	type StampPayload,
} from "../lab-checks";
import { atomCode, canonicalPayload, parseToken, signToken } from "../lab-token";

beforeAll(() => {
	// Fixture, nie sekret — składany z fragmentów, żeby nie wyglądał jak klucz
	// dla skanera (gitleaks: reguła generic-api-key strzela w literał przy
	// `*_SECRET =`). Wartość musi mieć >= 16 znaków (wymóg `isLabTokenConfigured`).
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "1e6b", "nie", "sekret"].join("-");
});

const STUDENT = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";

describe("1E.6b · ewaluacja checków (serwer NIE ufa fladze 'zaliczone')", () => {
	it("value: porównanie liczb przez TOLERANCJĘ, nie przez zaokrąglenie", () => {
		const checks: LabCheck[] = [{ id: "C1", kind: "value", note: "", var: "acc", expect: 0.8333 }];
		// 0.83335 różni się o 0.00005 → w tolerancji 0.01 przechodzi
		expect(evaluateChecks(checks, { acc: 0.83335 }).passed).toBe(true);
		// 0.85 różni się o 0.0167 → poza tolerancją
		expect(evaluateChecks(checks, { acc: 0.85 }).passed).toBe(false);
	});

	it("value: artefakt sumowania floatów NIE oblewa (dokładnie ten błąd, przed którym ostrzega Sophia)", () => {
		// 0.1 + 0.2 === 0.30000000000000004 — porównanie ścisłe by oblało
		const suma = 0.1 + 0.2;
		expect(suma).not.toBe(0.3); // dowód, że problem jest realny
		const checks: LabCheck[] = [{ id: "C1", kind: "value", note: "", var: "suma", expect: 0.3 }];
		expect(evaluateChecks(checks, { suma }).passed).toBe(true);
	});

	it("value: brak zmiennej w pieczątce → nie zalicza, z czytelnym powodem", () => {
		const checks: LabCheck[] = [{ id: "C1", kind: "value", note: "", var: "acc", expect: 1 }];
		const { passed, results } = evaluateChecks(checks, {});
		expect(passed).toBe(false);
		expect(results[0].reason).toContain("brak zmiennej");
	});

	it("relation: serwer PRZELICZA relację z wartości studenta (nie zna ich z góry)", () => {
		// F1.4: razem == cena * sztuki ORAZ srednio_dziennie == razem / 30
		const checks: LabCheck[] = [
			{
				id: "C1",
				kind: "relation",
				note: "",
				rule: { op: "eq", left: "razem", right: { mul: ["cena", "sztuki"] } },
			},
			{
				id: "C2",
				kind: "relation",
				note: "",
				rule: { op: "eq", left: "srednio_dziennie", right: { div: ["razem", 30] } },
			},
		];
		const dobre: StampPayload = { cena: 5.4, sztuki: 3, razem: 16.2, srednio_dziennie: 0.54 };
		expect(evaluateChecks(checks, dobre).passed).toBe(true);

		// student policzył razem źle
		const zle: StampPayload = { cena: 5.4, sztuki: 3, razem: 15, srednio_dziennie: 0.5 };
		expect(evaluateChecks(checks, zle).passed).toBe(false);
	});

	it("predicate: neq_const / len_gte / all_numbers", () => {
		// L0.2: imie różne od domyślnego
		expect(
			evaluateChecks(
				[
					{
						id: "C1",
						kind: "predicate",
						note: "",
						rule: { op: "neq_const", var: "imie", const: "Alex" },
					},
				],
				{ imie: "Darek" },
			).passed,
		).toBe(true);
		expect(
			evaluateChecks(
				[
					{
						id: "C1",
						kind: "predicate",
						note: "",
						rule: { op: "neq_const", var: "imie", const: "Alex" },
					},
				],
				{ imie: "Alex" },
			).passed,
		).toBe(false);

		// F2.4: ceny to lista >=5 liczb
		const listaChecks: LabCheck[] = [
			{ id: "C1", kind: "predicate", note: "", rule: { op: "len_gte", var: "ceny", n: 5 } },
			{ id: "C2", kind: "predicate", note: "", rule: { op: "all_numbers", var: "ceny" } },
		];
		expect(evaluateChecks(listaChecks, { ceny: [1, 2, 3, 4, 5] }).passed).toBe(true);
		expect(evaluateChecks(listaChecks, { ceny: [1, 2, 3, 4] }).passed).toBe(false);
		expect(evaluateChecks(listaChecks, { ceny: [1, 2, 3, 4, "x"] }).passed).toBe(false);
	});

	it("KRUCHY check (introspekcja tekstu) NIE oblewa, gdy solidne przeszły — fallback Sophii (F1.7)", () => {
		const checks: LabCheck[] = [
			{
				id: "C1",
				kind: "relation",
				note: "wartość",
				rule: { op: "eq", left: "koszt", right: { mul: ["cena", "razy"] } },
			},
			{
				id: "C2",
				kind: "predicate",
				note: "introspekcja — KRUCHA",
				fragile: true,
				rule: { op: "contains_all", var: "_zrodlo", needles: ["if", "else"] },
			},
		];
		// solidny przechodzi, kruchy NIE (student napisał bez if/else)
		const { passed, results } = evaluateChecks(checks, {
			cena: 4,
			razy: 5,
			koszt: 20,
			_zrodlo: "koszt = cena * razy",
		});
		expect(passed).toBe(true); // kruchy nie oblewa
		expect(results.find((r) => r.id === "C2")?.passed).toBe(false); // ale jest raportowany
	});

	it("BEZPIECZNIK: sam kruchy check nie może zaliczać pozycji", () => {
		const checks: LabCheck[] = [
			{
				id: "C1",
				kind: "predicate",
				note: "",
				fragile: true,
				rule: { op: "contains_all", var: "_zrodlo", needles: ["if"] },
			},
		];
		expect(evaluateChecks(checks, { _zrodlo: "if x: pass" }).passed).toBe(false);
	});

	it("parseChecks ignoruje ATRAPĘ z 1E.2 ({type:'token'} bez kind)", () => {
		expect(parseChecks({ checks: [{ type: "token", note: "placeholder" }] })).toEqual([]);
		expect(parseChecks({})).toEqual([]);
		expect(
			parseChecks({ checks: [{ id: "C1", kind: "value", note: "", var: "x", expect: 1 }] }),
		).toHaveLength(1);
	});

	it("domyślna tolerancja jest jawna i wynosi 0.01", () => {
		expect(DEFAULT_TOLERANCE).toBe(0.01);
	});
});

describe("1E.6b · token pieczątki (suma kontrolna, NIE kontrola bezpieczeństwa)", () => {
	it("token wypisany dla własnego kodu atomu przechodzi weryfikację", () => {
		const code = atomCode(STUDENT, ITEM);
		const payload: StampPayload = { razem: 16.2, cena: 5.4, sztuki: 3 };
		const token = signToken(code, payload);
		const parsed = parseToken(STUDENT, ITEM, token);
		expect(parsed.ok).toBe(true);
		if (parsed.ok) expect(parsed.payload.razem).toBe(16.2);
	});

	it("token KOLEGI jest odrzucany (kod atomu jest per student+pozycja)", () => {
		const kolega = "33333333-3333-4333-8333-333333333333";
		const token = signToken(atomCode(kolega, ITEM), { razem: 16.2 });
		const parsed = parseToken(STUDENT, ITEM, token);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.reason).toBe("bad_signature");
	});

	it("token z INNEJ POZYCJI jest odrzucany", () => {
		const innaPozycja = "44444444-4444-4444-8444-444444444444";
		const token = signToken(atomCode(STUDENT, innaPozycja), { razem: 16.2 });
		expect(parseToken(STUDENT, ITEM, token).ok).toBe(false);
	});

	it("majstrowanie przy ładunku unieważnia podpis", () => {
		const token = signToken(atomCode(STUDENT, ITEM), { acc: 0.5 });
		const [, sig] = token.split(".");
		const podrobiony = `${Buffer.from('{"acc":0.99}').toString("base64url")}.${sig}`;
		expect(parseToken(STUDENT, ITEM, podrobiony).ok).toBe(false);
	});

	it("śmieci i pusty token → malformed, bez wyjątku", () => {
		for (const bad of ["", "abc", "....", "a.b", "nie-token"]) {
			const r = parseToken(STUDENT, ITEM, bad);
			expect(r.ok, bad).toBe(false);
		}
	});

	it("kanoniczna serializacja: kolejność kluczy nie ma znaczenia (Python vs TS)", () => {
		expect(canonicalPayload({ b: 2, a: 1 })).toBe(canonicalPayload({ a: 1, b: 2 }));
	});

	it("kanoniczna serializacja: długi ułamek Pythona nie psuje podpisu", () => {
		// Python: 0.1+0.2 -> 0.30000000000000004; zaokrąglenie do 6 miejsc zrównuje zapisy
		expect(canonicalPayload({ x: 0.1 + 0.2 })).toBe(canonicalPayload({ x: 0.3 }));
	});
});
