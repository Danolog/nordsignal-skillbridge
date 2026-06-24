import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../extract-json";

// Brama #4 cz. 2 (strumień D, Leo): karmimy parser realnymi "brudnymi" kształtami
// outputu modelu i asertujemy poprawny wynik; przy nieparsowalnym/uciętym —
// kontrolowany rzut, nie cichy częściowy obiekt. To dowód, że hardening domyka
// UDOWODNIONE tryby awarii (trailing comma, wiele bloków/proza z nawiasami), a nie
// "żeby przeszło".

type Brief = {
	objective: string;
	inputData: string;
	suggestedSteps: string[];
	successDefinition: string;
};

const valid: Brief = {
	objective: "Cel projektu",
	inputData: "Dane wejściowe",
	suggestedSteps: ["Krok 1", "Krok 2"],
	successDefinition: "Definicja sukcesu",
};

const validJson = JSON.stringify(valid);

describe("extractJsonObject — kształty, które model REALNIE zwraca", () => {
	it("czysty JSON (model posłuchał 'TYLKO JSON')", () => {
		expect(extractJsonObject<Brief>(validJson)).toEqual(valid);
	});

	it("blok ```json ... ```", () => {
		expect(extractJsonObject<Brief>(`\`\`\`json\n${validJson}\n\`\`\``)).toEqual(valid);
	});

	it("blok ``` bez języka", () => {
		expect(extractJsonObject<Brief>(`\`\`\`\n${validJson}\n\`\`\``)).toEqual(valid);
	});

	it("proza PRZED i PO obiekcie", () => {
		expect(
			extractJsonObject<Brief>(`Jasne! Oto Twój brief:\n${validJson}\nMam nadzieję, że pomoże.`),
		).toEqual(valid);
	});

	it("blok json + ogon prozy po zamknięciu fence", () => {
		expect(extractJsonObject<Brief>(`\`\`\`json\n${validJson}\n\`\`\`\nPowodzenia!`)).toEqual(
			valid,
		);
	});

	// ── Udowodniony tryb awarii #1: trailing comma ──────────────────────────────
	it("trailing comma na końcu obiektu", () => {
		expect(extractJsonObject<{ objective: string }>('{"objective":"Cel projektu",}')).toEqual({
			objective: "Cel projektu",
		});
	});

	it("trailing comma w zagnieżdżonej tablicy", () => {
		const dirty = '{"objective":"x","suggestedSteps":["a","b",],"inputData":"y",}';
		expect(extractJsonObject<{ suggestedSteps: string[] }>(dirty).suggestedSteps).toEqual([
			"a",
			"b",
		]);
	});

	// ── Udowodniony tryb awarii #2: wiele bloków / proza z nawiasami ─────────────
	it("dwa bloki JSON — bierze PIERWSZY zbalansowany obiekt (nie skleja greedy)", () => {
		const dirty =
			'{"objective":"pierwszy","inputData":"a","suggestedSteps":[],"successDefinition":"s"}\nplus\n{"objective":"drugi"}';
		expect(extractJsonObject<Brief>(dirty).objective).toBe("pierwszy");
	});

	it("nawiasy w prozie przed obiektem nie psują ekstrakcji", () => {
		const dirty = `Uwaga (ważne) — oto brief: ${validJson}`;
		expect(extractJsonObject<Brief>(dirty)).toEqual(valid);
	});

	it("string zawierający } nie zamyka obiektu przedwcześnie", () => {
		const obj = { objective: "Zrób to } i tamto", inputData: "x" };
		expect(extractJsonObject<typeof obj>(JSON.stringify(obj))).toEqual(obj);
	});

	// ── Kontrolowany błąd: brak cichego salwowania ──────────────────────────────
	it("output ucięty (brak domykającego }) → rzuca, NIE zwraca częściowego obiektu", () => {
		const truncated = '{"objective":"Cel","inputData":"Dane wejść';
		expect(() => extractJsonObject(truncated)).toThrow("AI zwróciło nieprawidłowy JSON");
	});

	it("brak jakiegokolwiek JSON → rzuca", () => {
		expect(() => extractJsonObject("Przepraszam, nie mogę pomóc.")).toThrow(
			"AI zwróciło nieprawidłowy JSON",
		);
	});

	it("własny komunikat błędu jest przekazywany", () => {
		expect(() => extractJsonObject("brak", "custom err")).toThrow("custom err");
	});
});
