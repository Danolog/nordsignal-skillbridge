/**
 * Follow-up przeglądu Ethana (1E.1, KRYTYCZNE): mapowanie careerGoal→path_key.
 * Strażnik dwustronny: (1) każdy klucz mapy to REALNY careerGoal z modelu
 * kariery (literówka/rename modelu wywala test), (2) pilotowa ścieżka DS
 * jest zmapowana, (3) cel spoza mapy → null (drabina pusta zgodnie z prawdą).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAREER_GOAL_TO_PATH_KEY, pathKeyForCareerGoal } from "../path-key";

const careerModel = JSON.parse(
	readFileSync(join(process.cwd(), "src", "lib", "db", "data", "career-model.json"), "utf8"),
) as { paths: { careerGoal: string }[] };
const realGoals = new Set(careerModel.paths.map((p) => p.careerGoal));

describe("1E.1 · mapowanie careerGoal → path_key", () => {
	it("każdy klucz mapy istnieje w modelu kariery (strażnik przeciw rozjazdowi nazw)", () => {
		for (const goal of Object.keys(CAREER_GOAL_TO_PATH_KEY)) {
			expect(realGoals.has(goal), `'${goal}' nie istnieje w career-model.json`).toBe(true);
		}
	});

	it("pilot DS: 'Data Scientist' → 'data-science' (zgodnie z ingestem drabiny)", () => {
		expect(pathKeyForCareerGoal("Data Scientist")).toBe("data-science");
	});

	it("cel spoza mapy → null (curriculum jeszcze nie obejmuje ścieżki)", () => {
		expect(pathKeyForCareerGoal("Data Analyst")).toBeNull();
		expect(pathKeyForCareerGoal("")).toBeNull();
	});
});
