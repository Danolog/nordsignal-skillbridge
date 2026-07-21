import { generateObject } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractValidationIssues } from "../log";

/**
 * Dowód, że extractValidationIssues wyciąga metadane walidacji z REALNEGO
 * AI_NoObjectGeneratedError (nie repliki) ORAZ że jest PII-bezpieczny.
 *
 * Budujemy prawdziwy błąd: mock zwraca tekst, którego REALNY generateObject nie
 * dopasuje do schematu → rzuca NoObjectGeneratedError z zagnieżdżonym ZodError.
 */

// Schemat z TWARDYMI regułami — żeby sprowokować realny ZodError przez generateObject.
const StrictSchema = z.object({
	summaryText: z.string().min(1),
	careerPaths: z.array(z.object({ label: z.string().min(1), why: z.string().min(1) })).min(1),
});

function modelReturning(text: string) {
	return new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: "text" as const, text }],
			finishReason: { unified: "stop" as const, raw: "stop" },
			usage: {
				inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 1, text: 1, reasoning: 0 },
			},
			warnings: [],
		}),
	});
}

async function realNoObjectError(rawText: string): Promise<unknown> {
	try {
		await generateObject({ model: modelReturning(rawText), schema: StrictSchema, prompt: "x" });
		throw new Error("expected validation to fail but it passed");
	} catch (err) {
		return err;
	}
}

describe("extractValidationIssues — wyciąg metadanych walidacji z realnego błędu AI SDK", () => {
	it("wyciąga path+code+message z zagnieżdżonego ZodError (brak pola why)", async () => {
		const err = await realNoObjectError(
			JSON.stringify({ summaryText: "ok", careerPaths: [{ label: "Analityka" }] }),
		);
		const issues = extractValidationIssues(err);
		expect(issues.length).toBeGreaterThan(0);
		const why = issues.find((i) => i.path.endsWith("why"));
		expect(why).toBeDefined();
		expect(why?.path).toBe("careerPaths.0.why");
		expect(why?.code).toBe("invalid_type");
		expect(typeof why?.message).toBe("string");
	});

	it("wyciąga code too_small dla pustej tablicy careerPaths", async () => {
		const err = await realNoObjectError(JSON.stringify({ summaryText: "ok", careerPaths: [] }));
		const issues = extractValidationIssues(err);
		const arr = issues.find((i) => i.path === "careerPaths");
		expect(arr?.code).toBe("too_small");
	});

	it("PII-safe: nie zwraca surowej WARTOŚCI treści studenta — tylko metadane reguły", async () => {
		// Sekretna treść studenta, która łamie regułę (zła struktura). Wartość NIE
		// może pojawić się w żadnym polu zwróconych issues (path/code/message).
		const secret = "TAJNY-CEL-KARIERY-STUDENTA-XYZ-123"; // gitleaks:allow — rekwizyt testu, nie sekret
		const err = await realNoObjectError(
			JSON.stringify({ summaryText: secret, careerPaths: secret }), // careerPaths zły typ
		);
		const issues = extractValidationIssues(err);
		expect(issues.length).toBeGreaterThan(0);
		const serialized = JSON.stringify(issues);
		expect(serialized).not.toContain(secret);
		expect(serialized).not.toContain("TAJNY");
	});

	it("brak issues (zwykły Error bez ZodError) → pusta lista, nie wyjątek", () => {
		expect(extractValidationIssues(new Error("boom"))).toEqual([]);
		expect(extractValidationIssues(undefined)).toEqual([]);
		expect(extractValidationIssues({ cause: { cause: { cause: null } } })).toEqual([]);
	});
});
