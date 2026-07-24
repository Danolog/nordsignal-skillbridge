// Test wspólnego helpera pgErrorCode / isUniqueViolation (hoist wg noty Leo):
// surowy 23505 → true, owinięty przez Drizzle (kod na .cause) → true, inny kod
// (40001 serialization_failure) → false, łańcuch cykliczny → bez zawieszenia.

import { describe, expect, it } from "vitest";
import { isUniqueViolation, pgErrorCode } from "../pg-error";

describe("pgErrorCode / isUniqueViolation", () => {
	it("surowy błąd pg: kod odczytany z .code", () => {
		expect(pgErrorCode({ code: "23505" })).toBe("23505");
		expect(isUniqueViolation({ code: "23505" })).toBe(true);
	});

	it("owinięty przez Drizzle: kod na .cause (o poziom niżej) też złapany", () => {
		const wrapped = Object.assign(new Error("Failed query: insert …"), {
			cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
		});
		expect(pgErrorCode(wrapped)).toBe("23505");
		expect(isUniqueViolation(wrapped)).toBe(true);
	});

	it("owinięcie wielopoziomowe: schodzi głębiej niż jeden cause", () => {
		const deep = { cause: { cause: { cause: { code: "23505" } } } };
		expect(isUniqueViolation(deep)).toBe(true);
	});

	it("inny kod SQLSTATE (40001) → nie jest naruszeniem unikalności", () => {
		expect(pgErrorCode({ code: "40001" })).toBe("40001");
		expect(isUniqueViolation({ code: "40001" })).toBe(false);
	});

	it("brak kodu w łańcuchu → undefined / false", () => {
		expect(pgErrorCode(new Error("bez kodu"))).toBeUndefined();
		expect(isUniqueViolation(null)).toBe(false);
		expect(isUniqueViolation("string")).toBe(false);
	});

	it("łańcuch cause cykliczny → nie zawiesza (guard odwiedzonych)", () => {
		const a: { code?: string; cause?: unknown } = {};
		const b: { code?: string; cause?: unknown } = { cause: a };
		a.cause = b; // cykl a → b → a
		expect(pgErrorCode(a)).toBeUndefined();
		expect(isUniqueViolation(a)).toBe(false);
	});
});
